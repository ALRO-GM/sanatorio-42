/**
 * `kubectl`: la puerta de entrada (opciones globales, poner el clúster al día
 * antes y después de cada orden, topes) y las órdenes de mirar y de crear:
 * `get`, `describe`, `apply`, `create`, `run`, `expose`, `delete` y `diff`.
 * Las de cambiar lo que ya existe y las de operar están en `ops.ts`.
 */

import { Fail, ShellError } from '@sanatorio/shellsim'
import type { CommandFn, Ctx } from '@sanatorio/shellsim'

import type { Args } from './cli.js'
import { parseArgs } from './cli.js'
import {
  envFor,
  manifests,
  mustGet,
  notFound,
  plural,
  readSource,
  refsOf,
  scopeOf,
  selected,
  shown,
  store,
} from './common.js'
import { sync, wait } from './controllers.js'
import { describe } from './describe.js'
import { jsonpath } from './jsonpath.js'
import type { KindInfo } from './kinds.js'
import { findKind, mustKind, resourceName } from './kinds.js'
import { kustomizeBuild } from './kustomize.js'
import { LIMITS, own, withinLimits } from './limits.js'
import type { Json, JsonObject, K8sObject } from './model.js'
import { k8sOf } from './model.js'
import { comparable } from './objects.js'
import { OPS } from './ops.js'
import { logsOf, runtimeOf } from './runtime.js'
import { unknownFields } from './fields.js'
import { derived, eventsIn, eventsTable, publicJson, rowOf } from './show.js'
import { arr, labelQuery, obj, str } from './spec.js'
import type { Env } from './store.js'
import { getObject, labelsOf, list, nsOf, remove } from './store.js'
import { encode64, table } from './util.js'
import { sortedKeys, toJsonText, toYaml } from './yaml.js'

type Sub = (ctx: Ctx, args: readonly string[]) => number

/** Escribe un objeto (o varios) en el formato de `-o`. */
function printObjects(ctx: Ctx, objects: K8sObject[], format: string, single: boolean): void {
  const json = objects.map(publicJson)
  const value: Json =
    single && json.length === 1
      ? (json[0] ?? null)
      : { apiVersion: 'v1', items: json, kind: 'List', metadata: { resourceVersion: '' } }

  if (format === 'yaml') ctx.io.out(toYaml(sortedKeys(value)))
  else if (format === 'json') ctx.io.out(toJsonText(value))
  else if (format === 'name')
    for (const object of objects)
      ctx.io.out(`${resourceName(mustKind(object.kind))}/${object.metadata.name}\n`)
  else if (format.startsWith('jsonpath=') || format.startsWith('jsonpath-as-json='))
    ctx.io.out(jsonpath(format.slice(format.indexOf('=') + 1), value))
  else if (format.startsWith('custom-columns=')) {
    const columns = format
      .slice('custom-columns='.length)
      .split(',')
      .map((each) => each.split(':'))

    ctx.io.out(
      table(
        columns.map(([head = '']) => head),
        json.map((item) => columns.map(([, path = '']) => jsonpath(`{${path}}`, item) || '<none>')),
      ),
    )
  } else
    throw new Fail(
      `error: unable to match a printer suitable for the output format "${format}", allowed formats are: custom-columns,json,jsonpath,name,wide,yaml`,
      1,
    )
}

function objectsOf(
  env: Env,
  info: KindInfo,
  ns: string | null,
  selector: string | undefined,
): K8sObject[] {
  if (info.derived === true && info.kind !== 'Event') {
    const all = derived(env, info.kind, info.namespaced ? ns : '')

    return selector === undefined ? all : all.filter((each) => labelQuery(selector)(labelsOf(each)))
  }

  return selected(env, info, ns, selector)
}

const GET = {
  values: [
    'output',
    'selector',
    'label-columns',
    'sort-by',
    'field-selector',
    'chunk-size',
    'filename',
  ],
  flags: ['show-labels', 'watch', 'no-headers', 'ignore-not-found', 'wide', 'recursive'],
  shorts: {
    o: 'output',
    l: 'selector',
    L: 'label-columns',
    w: 'watch',
    f: 'filename',
    R: 'recursive',
  },
}

function get(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, GET, 'kubectl get')
  const env = envFor(ctx, args)
  const scope = scopeOf(env, args)
  const format = args.one('output') ?? ''
  const wide = format === 'wide'
  const selector = args.one('selector')
  const fromFiles = args.all('filename').length > 0
  const refs = fromFiles
    ? manifests(ctx, args).map(({ doc }) => ({
        info: mustKind(str(doc.kind)),
        names: [str(obj(doc.metadata).name)],
      }))
    : refsOf(args.rest)

  if (refs.length === 0)
    throw new Fail(
      'You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.\nUse "kubectl explain <resource>" for a detailed description of that resource (e.g. kubectl explain pods).\nSee \'kubectl get -h\' for help and examples',
      1,
    )

  const groups: { info: KindInfo; objects: K8sObject[] }[] = []
  let code = 0

  for (const ref of refs) {
    if (ref.info.kind === 'Event' && ref.names.length === 0) {
      if (format === '' || wide) {
        const events = eventsIn(env, scope)

        if (events.length === 0) ctx.io.err(`No resources found in ${env.ns} namespace.\n`)
        else ctx.io.out(eventsTable(env, events, scope === null))

        return 0
      }
    }
    if (ref.names.length === 0) {
      groups.push({ info: ref.info, objects: objectsOf(env, ref.info, scope, selector) })
      continue
    }

    const found: K8sObject[] = []

    for (const name of ref.names) {
      const object =
        ref.info.derived === true
          ? derived(env, ref.info.kind, env.ns).find((each) => each.metadata.name === name)
          : getObject(env.cluster, ref.info.kind, ref.info.namespaced ? env.ns : '', name)

      if (object === undefined) {
        if (!args.has('ignore-not-found')) {
          ctx.io.err(`${notFound(ref.info, name).message}\n`)
          code = 1
        }
      } else found.push(object)
    }
    groups.push({ info: ref.info, objects: found })
  }

  const all = groups.flatMap((group) => group.objects)
  const named = refs.every((ref) => ref.names.length > 0)

  if (format !== '' && !wide) {
    if (all.length > 0 || !named)
      printObjects(
        ctx,
        all,
        format,
        named && all.length === 1 && refs.length === 1 && (refs[0]?.names.length ?? 0) === 1,
      )

    return code
  }

  const many = groups.length > 1
  const labelCols = args.all('label-columns').flatMap((each) => each.split(','))
  let printed = false

  for (const group of groups) {
    if (group.objects.length === 0) continue

    const rows = group.objects.map((object) => {
      const { head, row } = rowOf(env, group.info, object, wide)
      const name = many ? `${resourceName(group.info)}/${row[0] ?? ''}` : (row[0] ?? '')
      const labels = labelsOf(object)
      const extra = [
        ...labelCols.map((key) => labels[key] ?? ''),
        ...(args.has('show-labels')
          ? [
              Object.entries(labels)
                .map(([k, v]) => `${k}=${v}`)
                .join(',') || '<none>',
            ]
          : []),
      ]
      const cells = [name, ...row.slice(1), ...extra]

      return {
        head,
        cells: scope === null && group.info.namespaced ? [nsOf(object), ...cells] : cells,
      }
    })
    const head = [
      ...(scope === null && group.info.namespaced ? ['NAMESPACE'] : []),
      ...(rows[0]?.head ?? []),
      ...labelCols.map((key) => key.toUpperCase()),
      ...(args.has('show-labels') ? ['LABELS'] : []),
    ]
    const text = table(
      head,
      rows.map((each) => each.cells),
    )

    if (printed) ctx.io.out('\n')
    ctx.io.out(args.has('no-headers') ? text.split('\n').slice(1).join('\n') : text)
    printed = true
  }
  if (!printed && code === 0)
    ctx.io.err(
      scope === null ? 'No resources found\n' : `No resources found in ${env.ns} namespace.\n`,
    )
  if (args.has('watch')) watch(ctx, groups, args, wide)

  return code
}

/** `get -w`: deja pasar un minuto y enseña cada fila que cambia (sin la columna AGE). */
function watch(
  ctx: Ctx,
  groups: { info: KindInfo; objects: K8sObject[] }[],
  args: Args,
  wide: boolean,
): void {
  const key = (cells: string[]) => cells.filter((_, i) => i !== 4).join(' ')
  const seen = new Map<string, string>()
  const snapshot = (env: Env) =>
    groups.flatMap((group) =>
      objectsOf(env, group.info, scopeOf(env, args), args.one('selector')).map((object) => ({
        id: `${group.info.kind}/${object.metadata.name}`,
        cells: rowOf(env, group.info, object, wide).row,
      })),
    )

  for (const row of snapshot(envFor(ctx, args))) seen.set(row.id, key(row.cells))
  for (let i = 0; i < 12; i++) {
    wait(ctx.sh.world, 5)

    const lines = snapshot(envFor(ctx, args)).filter((row) => seen.get(row.id) !== key(row.cells))

    for (const row of lines) seen.set(row.id, key(row.cells))
    if (lines.length > 0)
      ctx.io.out(
        table(
          lines[0]?.cells.map(() => '') ?? [],
          lines.map((row) => row.cells),
        ).replace(/^\n/, ''),
      )
  }
  ctx.io.err('(peer4u-sandbox: -w enseña un minuto de cambios y vuelve)\n')
}

function describeCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['selector', 'filename'],
      flags: ['show-events'],
      shorts: { l: 'selector', f: 'filename' },
    },
    'kubectl describe',
  )
  const env = envFor(ctx, args)
  const refs =
    args.all('filename').length > 0
      ? manifests(ctx, args).map(({ doc }) => ({
          info: mustKind(str(doc.kind)),
          names: [str(obj(doc.metadata).name)],
        }))
      : refsOf(args.rest)

  if (refs.length === 0)
    throw new Fail(
      'error: You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.',
      1,
    )

  const texts: string[] = []

  for (const ref of refs) {
    const objects =
      ref.names.length === 0
        ? selected(env, ref.info, scopeOf(env, args), args.one('selector'))
        : ref.names
            .map((name) => {
              // Como kubectl: `describe pod api` vale por el principio del nombre (`api-7c9d…`).
              const exact = getObject(
                env.cluster,
                ref.info.kind,
                ref.info.namespaced ? env.ns : '',
                name,
              )
              const prefix = list(
                env.cluster,
                ref.info.kind,
                ref.info.namespaced ? env.ns : '',
              ).filter((each) => each.metadata.name.startsWith(name))

              if (exact !== undefined) return [exact]
              if (prefix.length > 0) return prefix

              throw notFound(ref.info, name)
            })
            .flat()

    if (objects.length === 0 && ref.names.length === 0) {
      ctx.io.err(`No resources found in ${env.ns} namespace.\n`)
      continue
    }
    for (const object of objects) texts.push(describe(env, ref.info, object))
  }
  ctx.io.out(texts.join('\n'))

  return 0
}

const APPLY = {
  values: ['filename', 'kustomize', 'dry-run', 'output', 'field-manager', 'selector', 'validate'],
  flags: [
    'recursive',
    'server-side',
    'force-conflicts',
    'prune',
    'record',
    'save-config',
    'wait',
    'all',
  ],
  shorts: { f: 'filename', k: 'kustomize', R: 'recursive', o: 'output', l: 'selector' },
}

/** Los documentos de una orden: de `-f` o de `-k` (Kustomize). */
function documentsOf(ctx: Ctx, args: Args, verb: string): { doc: JsonObject; file: string }[] {
  const dir = args.one('kustomize')

  if (dir !== undefined) return kustomizeBuild(ctx, dir).map((doc) => ({ doc, file: dir }))
  if (args.all('filename').length === 0)
    throw new Fail(
      `error: must specify one of -f and -k\n\nSee 'kubectl ${verb} -h' for help and examples`,
      1,
    )

  return manifests(ctx, args)
}

/**
 * La validación de campos del servidor (`--validate=strict`, lo de fábrica):
 * un campo que no existe para el tipo es un error; con `--validate=warn`, un
 * aviso, y con `false` o `ignore` se descarta sin decir nada. En los dos
 * últimos casos el campo se quita, como hace el servidor.
 */
function strict(
  ctx: Ctx,
  args: Args,
  doc: JsonObject,
  info: KindInfo,
  file: string,
  patching: boolean,
): void {
  const mode = args.one('validate') ?? 'strict'
  const lenient = ['false', 'ignore', 'warn'].includes(mode)
  const unknown = unknownFields(info.kind, doc, lenient)

  if (unknown.length === 0) return
  if (mode === 'warn') {
    ctx.io.err(unknown.map((field) => `Warning: unknown field "${field}"\n`).join(''))

    return
  }
  if (lenient) return
  throw new Fail(
    `Error from server (BadRequest): error when ${patching ? 'patching' : 'creating'} "${file}": ${info.kind} in version "${info.apiVersion.split('/').at(-1) ?? ''}" cannot be handled as a ${info.kind}: strict decoding error: ${unknown.map((field) => `unknown field "${field}"`).join(', ')}`,
    1,
  )
}

function apply(ctx: Ctx, raw: readonly string[], mode: 'apply' | 'create' | 'replace'): number {
  const args = parseArgs(raw, APPLY, `kubectl ${mode}`)
  const env = envFor(ctx, args)
  const docs = documentsOf(ctx, args, mode)
  const dry = args.one('dry-run')
  let code = 0

  if (dry !== undefined && !['none', 'client', 'server'].includes(dry))
    throw new Fail(
      `error: Invalid dry-run value (${dry}). Must be "none", "server", or "client".`,
      1,
    )
  if (docs.length === 0) throw new Fail(`error: no objects passed to ${mode}`, 1)
  for (const { doc, file } of docs) {
    try {
      const info = findKind(str(doc.kind))

      // Un tipo que no existe lo explica `store` («no matches for kind…»).
      if (info === undefined) {
        store(env, doc, file, args.has('namespace'), mode)
        continue
      }

      const name = str(obj(doc.metadata).name)
      const exists =
        getObject(
          env.cluster,
          info.kind,
          info.namespaced ? str(obj(doc.metadata).namespace, env.ns) : '',
          name,
        ) !== undefined

      if (dry === 'client') {
        const format = args.one('output')

        ctx.io.out(
          format === 'yaml' || format === 'json'
            ? format === 'json'
              ? toJsonText(doc)
              : toYaml(sortedKeys(doc))
            : `${shown(info, name)} ${exists && mode !== 'create' ? 'configured' : 'created'} (dry run)\n`,
        )
        continue
      }
      strict(ctx, args, doc, info, file, exists && mode !== 'create')
      if (dry === 'server') {
        ctx.io.out(`${shown(info, name)} ${exists ? 'configured' : 'created'} (server dry run)\n`)
        continue
      }

      const result = store(env, doc, file, args.has('namespace'), mode)

      ctx.io.out(`${shown(result.info, result.object.metadata.name)} ${result.verb}\n`)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`${error.message}\n`)
      code = 1
    }
  }
  sync(ctx.sh.world)

  return code
}

/** Las líneas que cambian entre dos YAML (un `diff -u` sencillo, por LCS). */
function unified(a: string[], b: string[]): string[] {
  const n = a.length
  const m = b.length

  if (n * m > 200_000) return [...a.map((line) => `-${line}`), ...b.map((line) => `+${line}`)]

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i] ?? []

    for (let j = m - 1; j >= 0; j--)
      row[j] =
        a[i] === b[j]
          ? (dp[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]?.[j] ?? 0, row[j + 1] ?? 0)
  }

  const out: string[] = []
  let i = 0
  let j = 0

  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push(` ${a[i] ?? ''}`)
      i++
      j++
    } else if (i < n && (j >= m || (dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)))
      out.push(`-${a[i++] ?? ''}`)
    else out.push(`+${b[j++] ?? ''}`)
  }

  // Solo los cambios con tres líneas de contexto, como `diff -u`.
  const keep = new Set<number>()

  out.forEach((line, index) => {
    if (!line.startsWith(' ')) for (let k = index - 3; k <= index + 3; k++) keep.add(k)
  })

  return out.filter((_, index) => keep.has(index))
}

function diff(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, APPLY, 'kubectl diff')
  const env = envFor(ctx, args)
  let changed = false

  for (const { doc, file } of documentsOf(ctx, args, 'diff')) {
    const info = mustKind(str(doc.kind))
    const name = str(obj(doc.metadata).name)
    const ns = info.namespaced ? str(obj(doc.metadata).namespace, env.ns) : ''
    const live = getObject(env.cluster, info.kind, ns, name)
    // Se calcula sobre una copia del clúster: diff no cambia nada.
    const copy = { ...env, cluster: JSON.parse(JSON.stringify(env.cluster)) as Env['cluster'] }
    const { object } = store(copy, doc, file, args.has('namespace'))
    const before =
      live === undefined
        ? []
        : toYaml(sortedKeys(comparable(live)))
            .replace(/\n$/, '')
            .split('\n')
    const after = toYaml(sortedKeys(comparable(object)))
      .replace(/\n$/, '')
      .split('\n')
    const lines = unified(before, after)

    if (lines.length === 0) continue
    changed = true

    const id = `${info.apiVersion.replace('/', '.')}.${info.kind}.${ns === '' ? '' : `${ns}.`}${name}`

    ctx.io.out(
      `diff -u -N /tmp/LIVE-2384117/${id} /tmp/MERGED-1630272/${id}\n--- /tmp/LIVE-2384117/${id}\t2026-11-09 09:00:00\n+++ /tmp/MERGED-1630272/${id}\t2026-11-09 09:00:00\n@@ @@\n${lines.join('\n')}\n`,
    )
  }

  return changed ? 1 : 0
}

/** Lo que se ve de una plantilla de Pod sin crear: `creationTimestamp: null`, como kubectl. */
const nullStamp = (meta: Json): JsonObject => ({ ...obj(meta), creationTimestamp: null })

/**
 * El objeto tal como lo escribe `--dry-run=client -o yaml`: sin namespace
 * salvo que lo pidas con `-n`, con `creationTimestamp: null` y con el
 * `status` vacío de los tipos que lo tienen (lo que se ve al generar un YAML).
 */
function dryView(doc: JsonObject, explicitNs: boolean): JsonObject {
  const copy = JSON.parse(JSON.stringify(doc)) as JsonObject
  const meta = nullStamp(copy.metadata ?? null)
  const spec = obj(copy.spec)

  if (!explicitNs) Reflect.deleteProperty(meta, 'namespace')
  copy.metadata = meta
  if (obj(spec.template).spec !== undefined)
    spec.template = {
      ...obj(spec.template),
      metadata: nullStamp(obj(spec.template).metadata ?? null),
    }

  const job = obj(spec.jobTemplate)

  if (job.spec !== undefined) {
    const inner = obj(job.spec)

    spec.jobTemplate = {
      ...job,
      metadata: nullStamp(job.metadata ?? null),
      spec: {
        ...inner,
        template: {
          ...obj(inner.template),
          metadata: nullStamp(obj(inner.template).metadata ?? null),
        },
      },
    }
  }

  const kind = str(copy.kind)

  if (['Service', 'Ingress'].includes(kind)) copy.status = { loadBalancer: {} }
  else if (['Pod', 'Deployment', 'Job', 'CronJob', 'Namespace'].includes(kind)) copy.status = {}
  if (kind === 'Namespace') copy.spec = {}

  return copy
}

/** Un objeto hecho por una orden (`create deployment`…): se imprime con `--dry-run -o yaml` o se guarda. */
function emit(ctx: Ctx, env: Env, args: Args, doc: JsonObject): number {
  const dry = args.one('dry-run')

  if (dry !== undefined && dry !== 'none') {
    const format = args.one('output')
    const info = mustKind(str(doc.kind))

    if (format === undefined)
      ctx.io.out(`${shown(info, str(obj(doc.metadata).name))} created (dry run)\n`)
    else {
      const view = dryView(doc, args.has('namespace'))

      ctx.io.out(format === 'json' ? toJsonText(view) : toYaml(sortedKeys(view)))
    }

    return 0
  }

  const info = mustKind(str(doc.kind))
  const name = str(obj(doc.metadata).name)
  const ns = info.namespaced ? str(obj(doc.metadata).namespace, env.ns) : ''

  // Si ya existe, cada orden `create <tipo>` lo dice a su manera (así lo escribe kubectl).
  if (getObject(env.cluster, info.kind, ns, name) !== undefined) {
    const taken = `${plural(info)} "${name}" already exists`
    const service = info.kind === 'Service' && ['service', 'svc'].includes(args.rest[0] ?? '')
    const how: Record<string, string> = {
      Deployment: 'failed to create deployment: ',
      Job: 'failed to create job: ',
      CronJob: 'failed to create cronjob: ',
      ConfigMap: 'failed to create configmap: ',
      // Sin dos puntos: así sale en kubectl.
      Secret: 'failed to create secret ',
      Ingress: 'failed to create ingress: ',
    }
    const prefix = service
      ? `failed to create ${str(obj(doc.spec).type, 'ClusterIP')} service: `
      : own(how, info.kind)

    throw new Fail(
      prefix === undefined
        ? `Error from server (AlreadyExists): ${taken}`
        : `error: ${prefix}${taken}`,
      1,
    )
  }

  const result = store(env, doc, 'STDIN', args.has('namespace'), 'create')

  ctx.io.out(`${shown(result.info, result.object.metadata.name)} created\n`)
  sync(ctx.sh.world)

  return 0
}

const meta = (name: string, ns: string | null, labels?: Record<string, string>): JsonObject => ({
  name,
  ...(ns === null ? {} : { namespace: ns }),
  ...(labels === undefined ? {} : { labels }),
})

/** `--from-literal=A=1`, `--from-file=[clave=]ruta` y `--from-env-file=ruta` → datos. */
function dataFrom(ctx: Ctx, args: Args): Record<string, string> {
  const data: Record<string, string> = {}

  for (const literal of args.all('from-literal')) {
    const at = literal.indexOf('=')

    if (at <= 0) throw new Fail(`error: invalid literal source ${literal}, expected key=value`, 1)
    data[literal.slice(0, at)] = literal.slice(at + 1)
  }
  for (const spec of args.all('from-file')) {
    const at = spec.indexOf('=')
    const path = at > 0 ? spec.slice(at + 1) : spec
    const key = at > 0 ? spec.slice(0, at) : (path.split('/').at(-1) ?? path)

    data[key] = readSource(ctx, path)
  }
  for (const path of args.all('from-env-file'))
    for (const line of readSource(ctx, path).split('\n')) {
      const clean = line.trim()
      const at = clean.indexOf('=')

      if (clean === '' || clean.startsWith('#') || at <= 0) continue
      data[clean.slice(0, at)] = clean.slice(at + 1).replace(/^["']|["']$/g, '')
    }
  for (const value of Object.values(data))
    if (value.length > LIMITS.valueChars)
      throw new ShellError(`peer4u-sandbox: un valor de más de ${LIMITS.valueChars} caracteres`)

  return data
}

const CREATE = {
  values: [
    'image',
    'replicas',
    'port',
    'dry-run',
    'output',
    'from-literal',
    'from-file',
    'from-env-file',
    'docker-server',
    'docker-username',
    'docker-password',
    'docker-email',
    'cert',
    'key',
    'tcp',
    'from',
    'schedule',
    'class',
    'rule',
    'default-backend',
    'filename',
    'type',
    'kustomize',
    'validate',
  ],
  flags: ['save-config', 'recursive'],
  shorts: { o: 'output', f: 'filename', k: 'kustomize', R: 'recursive' },
}

/** `create job/cronjob`: la plantilla del Pod con la imagen y la orden. */
function jobTemplate(name: string, image: string, command: string[]): JsonObject {
  return {
    spec: {
      template: {
        metadata: {},
        spec: {
          containers: [{ name, image, ...(command.length > 0 ? { command } : {}), resources: {} }],
          restartPolicy: 'Never',
        },
      },
    },
  }
}

function createCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, CREATE, 'kubectl create')

  if (args.all('filename').length > 0 || args.one('kustomize') !== undefined)
    return apply(ctx, raw, 'create')

  const env = envFor(ctx, args)
  const [what = '', a = '', b = ''] = args.rest
  const ns = env.ns
  const need = (name: string, label = 'NAME'): string => {
    if (name === '')
      throw new Fail(
        `error: exactly one ${label} is required, got 0\nSee 'kubectl create ${what} -h' for help and examples`,
        1,
      )

    return name
  }

  switch (what) {
    case 'namespace':
    case 'ns':
      return emit(ctx, env, args, {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: meta(need(a), null),
      })
    case 'deployment':
    case 'deploy': {
      const name = need(a)
      const images = args.all('image')

      if (images.length === 0) throw new Fail('error: required flag(s) "image" not set', 1)

      const port = args.one('port')
      const containers = images.map((image, i) => ({
        name:
          images.length === 1
            ? (image.split('/').at(-1)?.split(':')[0] ?? name).replace(/[^a-z0-9-]/g, '-')
            : `${(image.split('/').at(-1)?.split(':')[0] ?? 'c').replace(/[^a-z0-9-]/g, '-')}${i === 0 ? '' : `-${i}`}`,
        image,
        ...(port === undefined ? {} : { ports: [{ containerPort: Number(port) }] }),
        ...(args.command.length > 0 ? { command: args.command } : {}),
        resources: {},
      }))

      return emit(ctx, env, args, {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: meta(name, ns, { app: name }),
        spec: {
          replicas: Number(args.one('replicas') ?? 1),
          selector: { matchLabels: { app: name } },
          strategy: {},
          template: { metadata: { labels: { app: name } }, spec: { containers } },
        },
      })
    }
    case 'configmap':
    case 'cm':
      return emit(ctx, env, args, {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: meta(need(a), ns),
        data: dataFrom(ctx, args),
      })
    case 'secret': {
      if (a === 'generic') {
        const data = dataFrom(ctx, args)

        return emit(ctx, env, args, {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: meta(need(b), ns),
          // Sin --type, kubectl no lo escribe: el servidor pone Opaque.
          ...(args.one('type') === undefined ? {} : { type: args.one('type') ?? '' }),
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode64(v)])),
        })
      }
      if (a === 'docker-registry') {
        const server = args.one('docker-server') ?? 'https://index.docker.io/v1/'
        const user = args.one('docker-username') ?? ''
        const password = args.one('docker-password') ?? ''

        if (user === '' || password === '')
          throw new Fail(
            'error: either --from-file or the combination of --docker-username, --docker-password and --docker-server is required',
            1,
          )

        const config = {
          auths: {
            [server]: {
              username: user,
              password,
              ...(args.one('docker-email') === undefined
                ? {}
                : { email: args.one('docker-email') ?? '' }),
              auth: encode64(`${user}:${password}`),
            },
          },
        }

        return emit(ctx, env, args, {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: meta(need(b), ns),
          type: 'kubernetes.io/dockerconfigjson',
          data: { '.dockerconfigjson': encode64(JSON.stringify(config)) },
        })
      }
      if (a === 'tls') {
        const cert = readSource(ctx, args.one('cert') ?? '', true)
        const key = readSource(ctx, args.one('key') ?? '', true)

        return emit(ctx, env, args, {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: meta(need(b), ns),
          type: 'kubernetes.io/tls',
          data: { 'tls.crt': encode64(cert), 'tls.key': encode64(key) },
        })
      }

      throw new Fail(
        `error: unknown command "${a}" for "kubectl create secret"\nAvailable Commands: docker-registry, generic, tls`,
        1,
      )
    }
    case 'service':
    case 'svc': {
      const type =
        a === 'nodeport'
          ? 'NodePort'
          : a === 'clusterip'
            ? 'ClusterIP'
            : a === 'loadbalancer'
              ? 'LoadBalancer'
              : ''

      if (type === '')
        throw new Fail(
          `error: unknown command "${a}" for "kubectl create service"\nAvailable Commands: clusterip, externalname, loadbalancer, nodeport`,
          1,
        )

      const name = need(b)

      return emit(ctx, env, args, {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: meta(name, ns, { app: name }),
        spec: {
          type,
          selector: { app: name },
          ports: args.all('tcp').map((spec) => {
            const [port = '0', target = port] = spec.split(':')

            return {
              name: `${port}-${target}`,
              port: Number(port),
              targetPort: Number(target),
              protocol: 'TCP',
            }
          }),
        },
      })
    }
    case 'job': {
      const name = need(a)
      const from = args.one('from')

      if (from !== undefined) {
        const cron = mustGet(
          env,
          mustKind('cronjob'),
          from.replace(/^cronjobs?(\.batch)?\//, '').replace(/^cj\//, ''),
        )
        const template = obj(obj(cron.spec).jobTemplate)

        return emit(ctx, env, args, {
          apiVersion: 'batch/v1',
          kind: 'Job',
          metadata: {
            ...meta(name, ns),
            annotations: { 'cronjob.kubernetes.io/instantiate': 'manual' },
          },
          spec: obj(template.spec),
        })
      }

      const image = args.one('image')

      if (image === undefined)
        throw new Fail('error: either --image or --from must be specified', 1)

      return emit(ctx, env, args, {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: meta(name, ns),
        ...jobTemplate(name, image, args.command),
      })
    }
    case 'cronjob':
    case 'cj': {
      const name = need(a)
      const image = args.one('image')
      const schedule = args.one('schedule')

      if (image === undefined) throw new Fail('error: required flag(s) "image" not set', 1)
      if (schedule === undefined) throw new Fail('error: required flag(s) "schedule" not set', 1)

      return emit(ctx, env, args, {
        apiVersion: 'batch/v1',
        kind: 'CronJob',
        metadata: meta(name, ns),
        spec: {
          schedule,
          jobTemplate: { metadata: { name }, ...jobTemplate(name, image, args.command) },
        },
      })
    }
    case 'ingress':
    case 'ing': {
      const name = need(a)
      const rules: JsonObject[] = []
      const tls: JsonObject[] = []

      for (const rule of args.all('rule')) {
        const match = /^([^/]*)(\/[^=]*)=([^:,]+):([^,]+)(?:,tls(?:=(.+))?)?$/.exec(rule)

        if (match === null)
          throw new Fail(
            `error: rule ${rule} is invalid and should be in format host/path=svcname:svcport[,tls[=secret]]`,
            1,
          )

        const [, host = '', path = '/', service = '', port = ''] = match
        const prefix = path.endsWith('*')
        const entry = {
          path: prefix ? path.slice(0, -1).replace(/(.)\/$/, '$1') || '/' : path,
          pathType: prefix ? 'Prefix' : 'Exact',
          backend: {
            service: {
              name: service,
              port: /^\d+$/.test(port) ? { number: Number(port) } : { name: port },
            },
          },
        }
        const known = rules.find((each) => str(each.host) === host)

        if (known === undefined)
          rules.push({ ...(host === '' ? {} : { host }), http: { paths: [entry] } })
        else arr(obj(known.http).paths).push(entry)
        if (match[5] !== undefined || rule.includes(',tls'))
          tls.push({ hosts: [host], ...(match[5] === undefined ? {} : { secretName: match[5] }) })
      }

      return emit(ctx, env, args, {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: meta(name, ns),
        spec: {
          ...(args.one('class') === undefined ? {} : { ingressClassName: args.one('class') ?? '' }),
          rules,
          ...(tls.length === 0 ? {} : { tls }),
        },
      })
    }
    case 'serviceaccount':
    case 'sa':
      return emit(ctx, env, args, {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: meta(need(a), ns),
      })
    default:
      throw new Fail(
        `error: unknown command "${what}" for "kubectl create"\nDid you mean this?\n\tdeployment\n\tnamespace\n\tconfigmap\n\tsecret`,
        1,
      )
  }
}

const RUN = {
  values: [
    'image',
    'port',
    'env',
    'labels',
    'restart',
    'dry-run',
    'output',
    'overrides',
    'image-pull-policy',
    'expose',
    'timeout',
  ],
  flags: ['rm', 'stdin', 'tty', 'command', 'attach', 'quiet'],
  shorts: { i: 'stdin', t: 'tty', o: 'output', l: 'labels', q: 'quiet' },
}

function runCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, RUN, 'kubectl run')
  const env = envFor(ctx, args)
  const name = args.rest[0] ?? ''
  const image = args.one('image')

  if (name === '') throw new Fail('error: NAME is required for run', 1)
  if (image === undefined) throw new Fail('error: required flag(s) "image" not set', 1)

  const labels: Record<string, string> = {}

  for (const pair of (args.one('labels') ?? `run=${name}`).split(',')) {
    const [k = '', v = ''] = pair.split('=')

    labels[k] = v
  }

  const restart = args.one('restart') ?? 'Always'
  const port = args.one('port')
  const attach = args.has('stdin') || args.has('attach')
  const container: JsonObject = {
    name,
    image,
    ...(args.command.length > 0
      ? args.has('command')
        ? { command: args.command }
        : { args: args.command }
      : {}),
    ...(port === undefined ? {} : { ports: [{ containerPort: Number(port) }] }),
    ...(args.all('env').length === 0
      ? {}
      : {
          env: args.all('env').map((pair) => ({
            name: pair.split('=')[0] ?? '',
            value: pair.split('=').slice(1).join('='),
          })),
        }),
    resources: {},
  }

  if (attach && args.command.length === 0 && /busybox|curl|alpine/.test(image))
    throw new Fail(
      'peer4u-sandbox: este simulador no abre sesiones interactivas: pon la orden detrás de --, como kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- web',
      1,
    )
  if (attach && args.command.length === 1 && ['sh', 'bash', 'ash'].includes(args.command[0] ?? ''))
    throw new Fail(
      'peer4u-sandbox: este simulador no abre sesiones interactivas: escribe la orden entera, como -- sh -c "wget -qO- web"',
      1,
    )

  const doc: JsonObject = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: meta(name, env.ns, labels),
    spec: { containers: [container], restartPolicy: restart, dnsPolicy: 'ClusterFirst' },
  }
  const dry = args.one('dry-run')

  if (dry !== undefined && dry !== 'none') return emit(ctx, env, args, doc)
  if (!attach) return emit(ctx, env, args, doc)

  // Con `-i` (y casi siempre `--rm`): se espera a que acabe y se enseña lo que escribió.
  const { object } = store(env, doc, 'STDIN', args.has('namespace'), 'create')

  sync(ctx.sh.world)
  for (let i = 0; i < 12; i++) {
    const pod = getObject(env.cluster, 'Pod', env.ns, name)

    if (pod === undefined) break

    const rt = runtimeOf(envFor(ctx, args), pod)

    if (rt.phase === 'Succeeded' || rt.phase === 'Failed' || rt.restarts > 0) break
    wait(ctx.sh.world, 5)
  }

  const after = envFor(ctx, args)
  const pod = getObject(after.cluster, 'Pod', env.ns, name) ?? object
  const rt = runtimeOf(after, pod)
  const logs = logsOf(after, pod, name, false)
  let code = 0

  if (rt.waiting !== null || rt.containers[0]?.outcome === null) {
    ctx.io.err(`error: timed out waiting for the condition\n`)
    code = 1
  } else {
    const lines = typeof logs === 'string' ? [logs] : logs

    if (lines.length > 0) ctx.io.out(`${lines.join('\n')}\n`)

    const outcome = rt.containers[0]?.outcome

    code = outcome?.kind === 'exit' ? outcome.code : 0
    if (code !== 0) ctx.io.err(`pod ${env.ns}/${name} terminated (Error)\n`)
  }
  if (args.has('rm')) {
    remove(after.cluster, pod)
    ctx.io.out(`pod "${name}" deleted from ${env.ns} namespace\n`)
    sync(ctx.sh.world)
  }

  return code
}

const EXPOSE = {
  values: [
    'port',
    'target-port',
    'name',
    'type',
    'protocol',
    'selector',
    'dry-run',
    'output',
    'filename',
  ],
  flags: [],
  shorts: { o: 'output', l: 'selector', f: 'filename' },
}

function expose(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, EXPOSE, 'kubectl expose')
  const env = envFor(ctx, args)
  const [ref] = refsOf(args.rest)
  const name = ref?.names[0] ?? ''

  if (ref === undefined || name === '')
    throw new Fail('error: You must provide one or more resources by argument or filename.', 1)

  const target = mustGet(env, ref.info, name)
  const spec = obj(target.spec)
  const selector: Record<string, string> =
    args.one('selector') !== undefined
      ? Object.fromEntries(
          (args.one('selector') ?? '')
            .split(',')
            .map((pair) => [pair.split('=')[0] ?? '', pair.split('=')[1] ?? '']),
        )
      : target.kind === 'Pod'
        ? (target.metadata.labels ?? {})
        : target.kind === 'Service'
          ? Object.fromEntries(Object.entries(obj(spec.selector)).map(([k, v]) => [k, str(v)]))
          : Object.fromEntries(
              Object.entries(obj(obj(spec.selector).matchLabels)).map(([k, v]) => [k, str(v)]),
            )
  const podSpec = target.kind === 'Pod' ? spec : obj(obj(spec.template).spec)
  const containerPort = obj(arr(obj(arr(podSpec.containers)[0]).ports)[0]).containerPort
  const port =
    args.one('port') ?? (typeof containerPort === 'number' ? String(containerPort) : undefined)

  if (port === undefined)
    throw new Fail(
      "error: couldn't find port via --port flag or introspection\nSee 'kubectl expose -h' for help and examples",
      1,
    )

  const targetPort = args.one('target-port')

  return emit(ctx, env, args, {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: meta(args.one('name') ?? name, env.ns, target.metadata.labels),
    spec: {
      ...(args.one('type') === undefined ? {} : { type: args.one('type') ?? 'ClusterIP' }),
      selector,
      ports: [
        {
          port: Number(port),
          protocol: 'TCP',
          targetPort:
            targetPort === undefined
              ? Number(port)
              : /^\d+$/.test(targetPort)
                ? Number(targetPort)
                : targetPort,
        },
      ],
    },
  }).valueOf()
}

const DELETE = {
  values: [
    'filename',
    'kustomize',
    'selector',
    'grace-period',
    'timeout',
    'cascade',
    'output',
    'wait',
  ],
  flags: ['all', 'now', 'force', 'ignore-not-found', 'recursive'],
  shorts: { f: 'filename', k: 'kustomize', l: 'selector', R: 'recursive', o: 'output' },
}

/** Borra un objeto (un namespace, con todo lo que tiene; un PVC, con su volumen). */
export function deleteObject(env: Env, object: K8sObject): void {
  if (object.kind === 'Namespace') {
    for (const each of Object.values(env.cluster.objects))
      if (nsOf(each) === object.metadata.name) remove(env.cluster, each)
    env.state.forwards = env.state.forwards.filter((forward) => forward.ns !== object.metadata.name)
  }
  if (object.kind === 'PersistentVolumeClaim') {
    const pv = getObject(env.cluster, 'PersistentVolume', '', str(object.spec?.volumeName))

    if (pv !== undefined) remove(env.cluster, pv)
    Reflect.deleteProperty(env.cluster.store, `pvc:${nsOf(object)}/${object.metadata.name}`)
  }
  if (object.kind === 'Pod') {
    const uid = object.metadata.uid ?? ''

    for (const key of Object.keys(env.cluster.store))
      if (key.startsWith(`layer:${uid}:`) || key.startsWith(`empty:${uid}:`))
        Reflect.deleteProperty(env.cluster.store, key)
  }
  remove(env.cluster, object)
}

function deleteCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(raw, DELETE, 'kubectl delete')
  const env = envFor(ctx, args)
  const targets: { info: KindInfo; object: K8sObject }[] = []
  let code = 0

  if (args.all('filename').length > 0 || args.one('kustomize') !== undefined)
    for (const { doc, file } of documentsOf(ctx, args, 'delete')) {
      const info = mustKind(str(doc.kind))
      const name = str(obj(doc.metadata).name)
      const object = getObject(
        env.cluster,
        info.kind,
        info.namespaced ? str(obj(doc.metadata).namespace, env.ns) : '',
        name,
      )

      if (object === undefined) {
        if (!args.has('ignore-not-found')) {
          ctx.io.err(
            `Error from server (NotFound): error when deleting "${file}": ${plural(info)} "${name}" not found\n`,
          )
          code = 1
        }
      } else targets.push({ info, object })
    }
  else {
    const refs = refsOf(args.rest)

    if (refs.length === 0)
      throw new Fail(
        "error: You must provide one or more resources by argument or filename.\nExample resource specifications include:\n   '-f rsrc.yaml'\n   '--filename=rsrc.json'\n   '<resource> <name>'\n   '<resource>'",
        1,
      )
    for (const ref of refs) {
      if (ref.info.derived === true)
        throw new Fail(`error: ${ref.info.plural} se calculan solos: no se borran`, 1)
      if (ref.names.length === 0) {
        if (!args.has('all') && args.one('selector') === undefined)
          throw new Fail('error: resource(s) were provided, but no name was specified', 1)
        for (const object of selected(env, ref.info, scopeOf(env, args), args.one('selector')))
          targets.push({ info: ref.info, object })
        continue
      }
      for (const name of ref.names) {
        const object = getObject(
          env.cluster,
          ref.info.kind,
          ref.info.namespaced ? env.ns : '',
          name,
        )

        if (object === undefined) {
          if (!args.has('ignore-not-found')) {
            ctx.io.err(`${notFound(ref.info, name).message}\n`)
            code = 1
          }
        } else targets.push({ info: ref.info, object })
      }
    }
  }
  if (
    targets.some(
      ({ object }) =>
        object.kind === 'Namespace' && ['default', 'kube-system'].includes(object.metadata.name),
    )
  )
    throw new Fail(
      'Error from server (Forbidden): namespaces "default" is forbidden: this namespace may not be deleted',
      1,
    )
  for (const { info, object } of targets) {
    deleteObject(env, object)
    ctx.io.out(
      `${resourceName(info)} "${object.metadata.name}" deleted${info.namespaced ? ` from ${nsOf(object)} namespace` : ''}\n`,
    )
  }
  if (targets.length === 0 && code === 0) ctx.io.err(`No resources found\n`)
  sync(ctx.sh.world)

  return code
}

/** `kubectl events` (estable desde la 1.28): los eventos por orden de llegada, con `--for` y `--types`. */
function eventsCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['for', 'types', 'output'], flags: ['watch'], shorts: { o: 'output', w: 'watch' } },
    'kubectl events',
  )
  const env = envFor(ctx, args)
  const scope = scopeOf(env, args)
  const target = args.one('for')
  let wanted: string | null = null

  if (target !== undefined) {
    const [ref] = refsOf([target])
    const name = ref?.names[0] ?? ''

    if (ref === undefined || name === '')
      throw new Fail(`error: --for must be in resource/name form`, 1)
    wanted = `${ref.info.kind}/${name}`
  }

  const types = (args.one('types') ?? '').split(',').filter((each) => each !== '')
  const events = eventsIn(env, scope).filter(
    (e) =>
      (wanted === null || e.object === wanted) && (types.length === 0 || types.includes(e.type)),
  )

  if (events.length === 0) ctx.io.err(`No events found in ${env.ns} namespace.\n`)
  else ctx.io.out(eventsTable(env, events, scope === null))

  return 0
}

function edit(): number {
  throw new Fail(
    'peer4u-sandbox: aquí no hay editor; cambia el objeto con kubectl apply -f, patch, set, scale o label',
    1,
  )
}

const COMMANDS: Record<string, Sub> = {
  get,
  describe: describeCmd,
  apply: (ctx, args) => apply(ctx, args, 'apply'),
  create: createCmd,
  replace: (ctx, args) => apply(ctx, args, 'replace'),
  run: runCmd,
  expose,
  delete: deleteCmd,
  diff,
  edit,
  events: eventsCmd,
  ...OPS,
}

const HELP = `kubectl controls the Kubernetes cluster manager.

 Find more information at: https://kubernetes.io/docs/reference/kubectl/

Basic Commands (Beginner):
  create          Create a resource from a file or from stdin
  expose          Take a replication controller, service, deployment or pod and expose it as a new Kubernetes service
  run             Run a particular image on the cluster
  set             Set specific features on objects

Basic Commands (Intermediate):
  explain         Get documentation for a resource
  get             Display one or many resources
  edit            Edit a resource on the server
  delete          Delete resources by file names, stdin, resources and names, or by resources and label selector

Deploy Commands:
  rollout         Manage the rollout of a resource
  scale           Set a new size for a deployment, replica set, or replication controller
  autoscale       Auto-scale a deployment, replica set, stateful set, or replication controller

Troubleshooting and Debugging Commands:
  describe        Show details of a specific resource or group of resources
  logs            Print the logs for a container in a pod
  exec            Execute a command in a container
  port-forward    Forward one or more local ports to a pod
  cp              Copy files and directories to and from containers
  auth            Inspect authorization
  top             Display resource (CPU/memory) usage

Advanced Commands:
  diff            Diff the live version against a would-be applied version
  apply           Apply a configuration to a resource by file name or stdin
  patch           Update fields of a resource
  wait            Experimental: Wait for a specific condition on one or many resources
  kustomize       Build a kustomization target from a directory or URL

Settings Commands:
  label           Update the labels on a resource
  annotate        Update the annotations on a resource

Other Commands:
  api-resources   Print the supported API resources on the server
  cluster-info    Display cluster information
  config          Modify kubeconfig files
  version         Print the client and server version information

Usage:
  kubectl [flags] [options]
`

/** Las opciones globales que van antes de la orden (`kubectl -n tienda get pods`) pasan detrás. */
function reorder(args: readonly string[]): string[] {
  const front: string[] = []
  let i = 0

  while (i < args.length) {
    const arg = args[i] ?? ''

    if (['-n', '--namespace', '--context', '--kubeconfig'].includes(arg)) {
      front.push(arg, args[i + 1] ?? '')
      i += 2
    } else if (/^(-n.+|--namespace=.+|--context=.+|-A|--all-namespaces)$/.test(arg)) {
      front.push(arg)
      i++
    } else break
  }

  return [...args.slice(i), ...front]
}

export const kubectl: CommandFn = (ctx) => {
  if (ctx.sh.world.ext?.k8s === undefined) throw new Fail('kubectl: command not found', 127)

  const [sub = '', ...rest] = reorder(ctx.args)

  if (sub === '' || sub === 'help' || sub === '--help' || sub === '-h') {
    ctx.io.out(HELP)

    return 0
  }

  const command = Object.hasOwn(COMMANDS, sub) ? COMMANDS[sub] : undefined

  if (command === undefined)
    throw new Fail(
      `error: unknown command "${sub}" for "kubectl"\n\nDid you mean this?\n\t${Object.keys(COMMANDS).find((name) => name.startsWith(sub.slice(0, 2))) ?? 'get'}\n`,
      1,
    )

  sync(ctx.sh.world)

  const code = command(ctx, rest)

  for (const cluster of Object.values(k8sOf(ctx.sh.world).clusters)) withinLimits(cluster)

  return code
}

/** `kubectl get`, `describe`, `logs`… solo miran: no cuentan para las estrellas (como `ls` en la shell). */
export function lookingKube(words: readonly string[]): boolean {
  const [program, ...rest] = words
  const plain = rest.filter(
    (word, i) =>
      !word.startsWith('-') &&
      !['-n', '--namespace', '-l', '-o', '-c', '--context'].includes(rest[i - 1] ?? ''),
  )
  const [first = '', second = ''] = plain

  if (program === 'kubectl' || program === 'k') {
    if (
      [
        'get',
        'describe',
        'logs',
        'top',
        'explain',
        'api-resources',
        'api-versions',
        'cluster-info',
        'version',
        'diff',
        'kustomize',
        'help',
        'events',
        'wait',
      ].includes(first)
    )
      return true
    if (first === 'config')
      return ['get-contexts', 'current-context', 'view', 'get-clusters'].includes(second)
    if (first === 'auth') return true
    if (first === 'rollout') return ['status', 'history'].includes(second)

    return false
  }
  if (program === 'helm')
    return (
      [
        'list',
        'ls',
        'get',
        'history',
        'status',
        'search',
        'show',
        'template',
        'version',
        'env',
      ].includes(first) ||
      (first === 'repo' && second === 'list')
    )
  if (program === 'kustomize') return first === 'build' || first === 'version'

  return program === 'base64'
}
