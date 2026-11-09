/**
 * Lo que comparten las órdenes de `kubectl`, `helm` y `kustomize`: el
 * clúster y el namespace de la orden (`-n`, `--context`), leer manifiestos
 * del disco de `dev1` (un fichero, una carpeta o `-` para la entrada), decir
 * a qué objeto se refiere `deploy/web` o `pod web`, y guardar un manifiesto
 * como lo haría `apply`.
 */

import { Fail, lookup, makeDir, writeText } from '@sanatorio/shellsim'
import type { Ctx } from '@sanatorio/shellsim'

import type { Args } from './cli.js'
import type { KindInfo } from './kinds.js'
import { KINDS, mustKind, resourceName } from './kinds.js'
import { own } from './limits.js'
import type { JsonObject, K8sObject } from './model.js'
import { clockOf, k8sOf } from './model.js'
import { admit, comparable } from './objects.js'
import { labelQuery, num, obj } from './spec.js'
import type { Env } from './store.js'
import { getObject, labelsOf, list, put } from './store.js'
import { parseDocs } from './yaml.js'

/** El entorno de una orden: el contexto (o `--context`) y el namespace (o `-n`). */
export function envFor(ctx: Ctx, args: Args): Env {
  const world = ctx.sh.world
  const state = k8sOf(world)
  const name = args.one('context') ?? state.current
  const context = own(state.contexts, name)

  if (context === undefined) throw new Fail(`error: context "${name}" does not exist`, 1)

  const cluster = own(state.clusters, context.cluster)

  if (cluster === undefined) throw new Fail(`error: cluster "${context.cluster}" does not exist`, 1)

  return {
    world,
    state,
    cluster,
    ns: args.one('namespace') ?? context.namespace,
    now: clockOf(world, state),
  }
}

/** `null` si es `-A` (todos los namespaces). */
export const scopeOf = (env: Env, args: Args): string | null =>
  args.has('all-namespaces') ? null : env.ns

/**
 * La ruta absoluta de un fichero de `dev1`. Sin cambiar `~`: quien lo expande
 * es la shell, y solo al principio de una palabra. En `--from-env-file=~/x`
 * kubectl recibe `~/x` tal cual y no lo encuentra, como en la herramienta real.
 */
const home = (ctx: Ctx, path: string): string =>
  // `./` delante: para kubectl, `~/x` es una carpeta que se llama `~` (la shell no la cambió).
  ctx.sh.abs(path.startsWith('~') ? `./${path}` : path)

/**
 * El texto de un fichero que lee kubectl por su cuenta (`--from-file`,
 * `--from-env-file`, `--cert`): si no está, el error de `os.Stat` de Go.
 */
export function readSource(ctx: Ctx, path: string, open = false): string {
  const found = lookup(ctx.sh.machine(), ctx.sh.user(), home(ctx, path))

  if (found === null)
    throw new Fail(
      open
        ? `error: open ${path}: no such file or directory`
        : `error: error reading ${path}: no such file or directory`,
      1,
    )
  if (found.node.kind !== 'file')
    throw new Fail(
      open ? `error: read ${path}: is a directory` : 'error: file sources cannot be a directory',
      1,
    )

  return found.node.text
}

/** El texto de un fichero de `dev1`, o el error de kubectl si no está. */
export function readHost(ctx: Ctx, path: string, cmd = 'error'): string {
  const full = home(ctx, path)
  const found = lookup(ctx.sh.machine(), ctx.sh.user(), full)

  if (found === null) throw new Fail(`${cmd}: the path "${path}" does not exist`, 1)
  if (found.node.kind !== 'file') throw new Fail(`${cmd}: read ${path}: is a directory`, 1)

  return found.node.text
}

export function exists(ctx: Ctx, path: string): boolean {
  return lookup(ctx.sh.machine(), ctx.sh.user(), home(ctx, path)) !== null
}

export function isDir(ctx: Ctx, path: string): boolean {
  return lookup(ctx.sh.machine(), ctx.sh.user(), home(ctx, path))?.node.kind === 'dir'
}

/** Los ficheros de una carpeta (con `-R`, también los de dentro), por nombre. */
export function filesIn(
  ctx: Ctx,
  path: string,
  recursive: boolean,
  pattern = /\.(ya?ml|json)$/,
): string[] {
  const dir = home(ctx, path).replace(/\/$/, '')

  return Object.keys(ctx.sh.machine().fs)
    .filter((each) => {
      if (!each.startsWith(`${dir}/`) || !pattern.test(each)) return false

      return recursive || !each.slice(dir.length + 1).includes('/')
    })
    .filter((each) => ctx.sh.machine().fs[each]?.kind === 'file')
    .sort()
}

export function writeHost(ctx: Ctx, path: string, text: string): void {
  const full = home(ctx, path)
  const parent = full.slice(0, full.lastIndexOf('/')) || '/'
  const opts = { cmd: 'kubectl', now: ctx.sh.now(), umask: ctx.sh.session().umask }

  if (lookup(ctx.sh.machine(), ctx.sh.user(), parent) === null)
    makeDir(ctx.sh.machine(), ctx.sh.user(), parent, { parents: true, ...opts })
  writeText(ctx.sh.machine(), ctx.sh.user(), full, text, opts)
}

/** Los documentos de `-f` (fichero, carpeta o `-`), cada uno con el nombre con el que se avisa. */
export function manifests(ctx: Ctx, args: Args): { doc: JsonObject; file: string }[] {
  const out: { doc: JsonObject; file: string }[] = []

  for (const source of args.all('filename')) {
    if (source === '-') {
      const text = ctx.io.stdin.readAll()

      for (const doc of parseDocs(text, 'STDIN')) out.push({ doc, file: 'STDIN' })
      continue
    }
    if (/^https?:\/\//.test(source))
      throw new Fail(
        `error: unable to read URL "${source}": este simulador no tiene salida a internet`,
        1,
      )

    const files = isDir(ctx, source) ? filesIn(ctx, source, args.has('recursive')) : [source]

    if (files.length === 0)
      throw new Fail(`error: no objects passed to ${args.rest[0] ?? 'apply'}`, 1)
    for (const file of files)
      for (const doc of parseDocs(readHost(ctx, file), file)) out.push({ doc, file })
  }

  return out
}

/** Una referencia de la línea de órdenes: `deploy/web`, o `pods` con nombres detrás. */
type Ref = { info: KindInfo; names: string[] }

/** `all`, como lo entiende kubectl. */
const ALL = [
  'Pod',
  'Service',
  'Deployment',
  'ReplicaSet',
  'StatefulSet',
  'Job',
  'CronJob',
  'HorizontalPodAutoscaler',
]

export function refsOf(words: readonly string[]): Ref[] {
  if (words.length === 0) return []
  if (words.every((word) => word.includes('/'))) {
    const refs: Ref[] = []

    for (const word of words) {
      const [type = '', name = ''] = word.split('/')
      const info = mustKind(type)
      const known = refs.find((ref) => ref.info === info)

      if (known === undefined) refs.push({ info, names: [name] })
      else known.names.push(name)
    }

    return refs
  }

  const [types = '', ...names] = words

  if (names.some((name) => name.includes('/')))
    throw new Fail(
      "error: there is no need to specify a resource type as a separate argument when passing arguments in resource/name form (e.g. 'kubectl get resource/<resource_name>' instead of 'kubectl get resource resource/<resource_name>')",
      1,
    )

  return types.split(',').flatMap((type) =>
    type === 'all'
      ? ALL.map((kind) => ({
          info: KINDS.find((each) => each.kind === kind) ?? mustKind(kind),
          names: [],
        }))
      : [{ info: mustKind(type), names: [...names] }],
  )
}

/** Cómo se llama un tipo en un error («deployments.apps "web" not found»). */
export function plural(info: KindInfo): string {
  const group = info.apiVersion.includes('/') ? info.apiVersion.split('/')[0] : ''

  return group === '' || group === undefined ? info.plural : `${info.plural}.${group}`
}

export function notFound(info: KindInfo, name: string): Fail {
  return new Fail(`Error from server (NotFound): ${plural(info)} "${name}" not found`, 1)
}

/** El objeto de una referencia (o el error de kubectl). */
export function mustGet(env: Env, info: KindInfo, name: string, ns = env.ns): K8sObject {
  const object = getObject(env.cluster, info.kind, info.namespaced ? ns : '', name)

  if (object === undefined) throw notFound(info, name)

  return object
}

/** Los objetos de un tipo que casan con `-l` (en un namespace o en todos). */
export function selected(
  env: Env,
  info: KindInfo,
  ns: string | null,
  selector: string | undefined,
): K8sObject[] {
  const test = selector === undefined ? () => true : labelQuery(selector)

  return list(env.cluster, info.kind, info.namespaced ? ns : '').filter((object) =>
    test(labelsOf(object)),
  )
}

/** `deployment.apps/web`. */
export const shown = (info: KindInfo, name: string): string => `${resourceName(info)}/${name}`

/**
 * Guarda un manifiesto como lo haría `kubectl apply`: si no existe lo crea;
 * si existe y cambia, lo actualiza (conservando lo que asigna el servidor y
 * las réplicas si el manifiesto no las dice); si no cambia, «unchanged».
 */
export function store(
  env: Env,
  doc: JsonObject,
  file: string,
  explicitNs: boolean,
  mode: 'apply' | 'create' | 'replace' = 'apply',
): { object: K8sObject; info: KindInfo; verb: 'created' | 'configured' | 'unchanged' } {
  const { object, info } = admit(env, doc, file, env.ns, explicitNs)
  const live = getObject(
    env.cluster,
    info.kind,
    object.metadata.namespace ?? '',
    object.metadata.name,
  )

  if (live === undefined) {
    put(env.cluster, object, env.now)
    object.metadata.generation = 1

    return { object, info, verb: 'created' }
  }
  if (mode === 'create')
    throw new Fail(
      `Error from server (AlreadyExists): error when creating "${file}": ${plural(info)} "${object.metadata.name}" already exists`,
      1,
    )
  if (
    obj(doc.spec).replicas === undefined &&
    live.spec?.replicas !== undefined &&
    object.spec !== undefined
  )
    object.spec.replicas = num(live.spec.replicas, 1)
  // Lo que el manifiesto no dice de las anotaciones se queda (`change-cause`, `restartedAt`).
  if (mode === 'apply' && live.metadata.annotations !== undefined)
    object.metadata.annotations = { ...live.metadata.annotations, ...object.metadata.annotations }
  if (JSON.stringify(comparable(object)) === JSON.stringify(comparable(live)))
    return { object: live, info, verb: 'unchanged' }
  if (info.kind === 'Pod') {
    const { nodeName: _node, ...before } = live.spec ?? {}

    if (JSON.stringify(object.spec) !== JSON.stringify(before))
      throw new Fail(
        `The Pod "${object.metadata.name}" is invalid: spec: Forbidden: pod updates may not change fields other than \`spec.containers[*].image\`, \`spec.initContainers[*].image\`, \`spec.activeDeadlineSeconds\`, \`spec.tolerations\` (only additions to existing tolerations)`,
        1,
      )
    object.spec = live.spec ?? {}
  }
  object.metadata.uid = live.metadata.uid ?? ''
  object.metadata.creationTimestamp = live.metadata.creationTimestamp ?? env.now
  object.metadata.generation = (live.metadata.generation ?? 1) + 1
  if (live.metadata.ownerReferences !== undefined)
    object.metadata.ownerReferences = live.metadata.ownerReferences
  if (live.status !== undefined) object.status = live.status
  put(env.cluster, object, env.now)

  return { object, info, verb: 'configured' }
}
