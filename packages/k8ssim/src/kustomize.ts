/**
 * Kustomize: un `kustomization.yaml` que junta manifiestos (`resources`) y
 * los ajusta por entorno sin plantillas: `namespace`, `namePrefix`,
 * `labels`/`commonLabels`, `images` (lo que cambia la CI), `replicas`,
 * `patches` (estratégicos o JSON 6902) y generadores de ConfigMap y Secret
 * con su sufijo de hash. Lo usan `kubectl kustomize`, `kubectl apply -k`,
 * `kubectl diff -k`, `kustomize build` y `kustomize edit set image`.
 */

import { Fail } from '@sanatorio/shellsim'
import type { CommandFn, Ctx } from '@sanatorio/shellsim'

import { filesIn, isDir, readHost, writeHost } from './common.js'
import { findKind } from './kinds.js'
import type { Json, JsonObject } from './model.js'
import { arr, obj, str, strMap } from './spec.js'
import { encode64, suffix } from './util.js'
import { parseDocs, toYaml } from './yaml.js'

const FILES = ['kustomization.yaml', 'kustomization.yml', 'Kustomization']

/** Un parche estratégico sin `target`: se aplica al objeto que dice su propio `metadata`. */
const NO_TARGET: JsonObject = {}

const join = (dir: string, path: string): string => {
  const parts: string[] = []

  for (const part of `${dir.replace(/\/$/, '')}/${path}`.split('/')) {
    if (part === '.' || (part === '' && parts.length > 0)) continue
    if (part === '..' && parts.length > 0 && parts.at(-1) !== '..' && parts.at(-1) !== '')
      parts.pop()
    else parts.push(part)
  }

  return parts.join('/') || '/'
}

function fileOf(ctx: Ctx, dir: string): string {
  for (const name of FILES) {
    const path = join(dir, name)

    if (filesIn(ctx, dir, false, /./).some((each) => each.endsWith(`/${name}`))) return path
  }

  throw new Fail(
    `error: unable to find one of 'kustomization.yaml', 'kustomization.yml' or 'Kustomization' in directory '${ctx.sh.abs(dir)}'`,
    1,
  )
}

/** Mezcla estratégica sencilla: mapas por clave y listas de cosas con `name` por nombre. */
export function merge(base: Json, patch: Json): Json {
  if (
    Array.isArray(patch) &&
    Array.isArray(base) &&
    patch.every((item) => typeof obj(item).name === 'string')
  ) {
    const out = [...base]

    for (const item of patch) {
      const at = out.findIndex((each) => str(obj(each).name) === str(obj(item).name))

      if (at < 0) out.push(item)
      else out[at] = merge(out[at] ?? null, item)
    }

    return out
  }
  if (
    patch === null ||
    typeof patch !== 'object' ||
    Array.isArray(patch) ||
    base === null ||
    typeof base !== 'object' ||
    Array.isArray(base)
  )
    return patch

  const out: JsonObject = { ...base }

  for (const [key, value] of Object.entries(patch))
    if (value === null) Reflect.deleteProperty(out, key)
    else out[key] = merge(out[key] ?? null, value)

  return out
}

/** Un JSON 6902 (`- op: replace\n  path: /spec/replicas\n  value: 4`). */
function json6902(doc: JsonObject, ops: Json[]): void {
  for (const raw of ops) {
    const op = obj(raw)
    const parts = str(op.path).split('/').slice(1)
    const last = parts.pop() ?? ''
    let parent: Json = doc

    for (const part of parts)
      parent = Array.isArray(parent) ? (parent[Number(part)] ?? null) : (obj(parent)[part] ?? null)
    if (Array.isArray(parent)) {
      const index = last === '-' ? parent.length : Number(last)

      if (str(op.op) === 'remove') parent.splice(index, 1)
      else if (str(op.op) === 'add') parent.splice(index, 0, op.value ?? null)
      else parent[index] = op.value ?? null
    } else if (parent !== null && typeof parent === 'object') {
      if (str(op.op) === 'remove') Reflect.deleteProperty(parent, last)
      else parent[last] = op.value ?? null
    }
  }
}

const isWorkload = (kind: string): boolean =>
  ['Deployment', 'StatefulSet', 'ReplicaSet', 'Job', 'DaemonSet'].includes(kind)

function podSpecs(doc: JsonObject): JsonObject[] {
  const kind = str(doc.kind)

  if (kind === 'Pod') return [obj(doc.spec)]
  if (kind === 'CronJob') return [obj(obj(obj(obj(obj(doc.spec).jobTemplate).spec).template).spec)]
  if (isWorkload(kind)) return [obj(obj(obj(doc.spec).template).spec)]

  return []
}

/** Cambia los nombres de los ConfigMap y Secret generados donde se usan. */
function rename(
  doc: JsonObject,
  names: Record<string, string>,
  kind: 'ConfigMap' | 'Secret',
): void {
  const fix = (holder: JsonObject, key: string) => {
    const name = str(holder[key])

    if (Object.hasOwn(names, name)) holder[key] = names[name] ?? name
  }

  for (const spec of podSpecs(doc)) {
    for (const container of [...arr(spec.containers), ...arr(spec.initContainers)].map((each) =>
      obj(each),
    )) {
      for (const from of arr(container.envFrom).map((each) => obj(each)))
        fix(obj(from[kind === 'ConfigMap' ? 'configMapRef' : 'secretRef']), 'name')
      for (const env of arr(container.env).map((each) => obj(each)))
        fix(
          obj(obj(env.valueFrom)[kind === 'ConfigMap' ? 'configMapKeyRef' : 'secretKeyRef']),
          'name',
        )
    }
    for (const volume of arr(spec.volumes).map((each) => obj(each)))
      if (kind === 'ConfigMap') fix(obj(volume.configMap), 'name')
      else fix(obj(volume.secret), 'secretName')
    if (kind === 'Secret')
      for (const pull of arr(spec.imagePullSecrets).map((each) => obj(each))) fix(pull, 'name')
  }
}

function generate(
  ctx: Ctx,
  dir: string,
  spec: JsonObject,
  kind: 'ConfigMap' | 'Secret',
  hash: boolean,
): { doc: JsonObject; from: string; to: string } {
  const data: Record<string, string> = {}

  for (const literal of arr(spec.literals).map((each) => str(each))) {
    const at = literal.indexOf('=')

    data[literal.slice(0, at)] = literal.slice(at + 1)
  }
  for (const file of arr(spec.files).map((each) => str(each))) {
    const at = file.indexOf('=')
    const path = at > 0 ? file.slice(at + 1) : file

    data[at > 0 ? file.slice(0, at) : (path.split('/').at(-1) ?? path)] = readHost(
      ctx,
      join(dir, path),
    )
  }
  for (const file of arr(spec.envs).map((each) => str(each)))
    for (const line of readHost(ctx, join(dir, file)).split('\n')) {
      const at = line.indexOf('=')

      if (line.trim() !== '' && !line.trim().startsWith('#') && at > 0)
        data[line.slice(0, at).trim()] = line.slice(at + 1).trim()
    }

  const from = str(spec.name)
  const to = hash ? `${from}-${suffix(JSON.stringify(data), 10)}` : from
  const doc: JsonObject =
    kind === 'ConfigMap'
      ? { apiVersion: 'v1', kind, metadata: { name: to }, data }
      : {
          apiVersion: 'v1',
          kind,
          metadata: { name: to },
          type: str(spec.type, 'Opaque'),
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode64(v)])),
        }

  return { doc, from, to }
}

/** Los manifiestos que salen de una carpeta con `kustomization.yaml`. */
export function kustomizeBuild(ctx: Ctx, dir: string, depth = 0): JsonObject[] {
  if (depth > 6) throw new Fail('error: accumulating resources: too many nested kustomizations', 1)
  if (!isDir(ctx, dir))
    throw new Fail(
      `error: must build at directory: not a valid directory: evalsymlink failure on '${dir}' : lstat ${ctx.sh.abs(dir)}: no such file or directory`,
      1,
    )

  const file = fileOf(ctx, dir)
  const k = obj(parseDocs(readHost(ctx, file), file)[0] ?? {})
  const docs: JsonObject[] = []

  for (const resource of [...arr(k.resources), ...arr(k.bases)].map((each) => str(each))) {
    const path = join(dir, resource)

    if (isDir(ctx, path)) docs.push(...kustomizeBuild(ctx, path, depth + 1))
    else
      docs.push(
        ...parseDocs(readHost(ctx, path), path).map(
          (doc) => JSON.parse(JSON.stringify(doc)) as JsonObject,
        ),
      )
  }

  const hash = obj(k.generatorOptions).disableNameSuffixHash !== true
  const generated: { doc: JsonObject; from: string; to: string; kind: 'ConfigMap' | 'Secret' }[] = [
    ...arr(k.configMapGenerator).map((spec) => ({
      ...generate(ctx, dir, obj(spec), 'ConfigMap', hash),
      kind: 'ConfigMap' as const,
    })),
    ...arr(k.secretGenerator).map((spec) => ({
      ...generate(ctx, dir, obj(spec), 'Secret', hash),
      kind: 'Secret' as const,
    })),
  ]

  docs.push(...generated.map((each) => each.doc))
  for (const kind of ['ConfigMap', 'Secret'] as const) {
    const names = Object.fromEntries(
      generated.filter((each) => each.kind === kind).map((each) => [each.from, each.to]),
    )

    for (const doc of docs) rename(doc, names, kind)
  }

  // Parches: estratégicos (un trozo de manifiesto) o JSON 6902 (una lista de operaciones).
  const patches = [
    ...arr(k.patchesStrategicMerge).map((each) => ({
      path: str(each),
      patch: '',
      target: NO_TARGET,
    })),
    ...arr(k.patches).map((each) => ({
      path: str(obj(each).path),
      patch: str(obj(each).patch),
      target: obj(obj(each).target),
    })),
  ]

  for (const p of patches) {
    const text = p.patch !== '' ? p.patch : readHost(ctx, join(dir, p.path))
    const ops = /^\s*-\s+op:/m.test(text)
    const parsed = ops ? null : parseDocs(text, p.path || 'patch')[0]
    const kind = str(p.target.kind, str(parsed?.kind))
    const name = str(p.target.name, str(obj(parsed?.metadata).name))
    const targets = docs.filter(
      (doc) =>
        (kind === '' || str(doc.kind) === kind) &&
        (name === '' || str(obj(doc.metadata).name) === name),
    )

    if (targets.length === 0)
      throw new Fail(
        `error: no matches for Id ${kind}.${name}; failed to find unique target for patch ${kind}.${name}`,
        1,
      )
    for (const doc of targets) {
      if (ops) {
        const list = parseDocsList(text)

        json6902(doc, list)
      } else {
        const merged = obj(merge(doc, parsed ?? {}))

        for (const key of Object.keys(doc)) Reflect.deleteProperty(doc, key)
        Object.assign(doc, merged)
      }
    }
  }

  const prefix = str(k.namePrefix)
  const suffixText = str(k.nameSuffix)
  const ns = str(k.namespace)
  const common = {
    ...strMap(k.commonLabels),
    ...(Object.assign(
      {},
      ...arr(k.labels).map((each) =>
        obj(each).includeSelectors === true ? strMap(obj(each).pairs) : {},
      ),
    ) as Record<string, string>),
  }
  const plain = Object.assign(
    {},
    ...arr(k.labels).map((each) =>
      obj(each).includeSelectors === true ? {} : strMap(obj(each).pairs),
    ),
  ) as Record<string, string>
  const annotations = strMap(k.commonAnnotations)

  for (const doc of docs) {
    const meta = obj(doc.metadata)
    const info = findKind(str(doc.kind))

    doc.metadata = meta
    if (prefix !== '' || suffixText !== '') meta.name = `${prefix}${str(meta.name)}${suffixText}`
    if (ns !== '' && info?.namespaced !== false && str(doc.kind) !== 'Namespace')
      meta.namespace = ns
    if (Object.keys({ ...common, ...plain }).length > 0)
      meta.labels = { ...strMap(meta.labels), ...common, ...plain }
    if (Object.keys(annotations).length > 0)
      meta.annotations = { ...strMap(meta.annotations), ...annotations }
    if (Object.keys(common).length > 0) {
      const spec = obj(doc.spec)

      if (isWorkload(str(doc.kind))) {
        const selector = obj(spec.selector)
        const template = obj(spec.template)
        const tmeta = obj(template.metadata)

        selector.matchLabels = { ...strMap(selector.matchLabels), ...common }
        tmeta.labels = { ...strMap(tmeta.labels), ...common }
        template.metadata = tmeta
        spec.selector = selector
        spec.template = template
      }
      if (str(doc.kind) === 'Service') spec.selector = { ...strMap(spec.selector), ...common }
      if (doc.spec !== undefined) doc.spec = spec
    }
    for (const raw of arr(k.images)) {
      const image = obj(raw)
      const name = str(image.name)

      for (const spec of podSpecs(doc))
        for (const container of [...arr(spec.containers), ...arr(spec.initContainers)].map((each) =>
          obj(each),
        )) {
          const ref = str(container.image)
          const base = ref.replace(/@.*$/, '').replace(/:[^/:]+$/, '')

          if (base !== name) continue

          const tag = /:([^/:]+)$/.exec(ref.replace(/@.*$/, ''))?.[1]
          const newName = str(image.newName, base)
          const digest = str(image.digest)

          container.image =
            digest !== ''
              ? `${newName}@${digest}`
              : `${newName}${str(image.newTag) !== '' ? `:${str(image.newTag)}` : tag === undefined ? '' : `:${tag}`}`
        }
    }
    for (const raw of arr(k.replicas)) {
      const r = obj(raw)

      if (
        str(r.name) ===
          str(meta.name).slice(
            prefix.length,
            str(meta.name).length - suffixText.length || undefined,
          ) ||
        str(r.name) === str(meta.name)
      ) {
        const spec = obj(doc.spec)

        spec.replicas = typeof r.count === 'number' ? r.count : Number(str(r.count))
        doc.spec = spec
      }
    }
  }

  return docs
}

/** Una lista YAML de operaciones (el lector solo devuelve mapas por documento). */
function parseDocsList(text: string): Json[] {
  const wrapped = parseDocs(`ops:\n${text.replace(/^/gm, '  ')}`, 'patch')[0]

  return arr(wrapped?.ops)
}

/** `kustomize build`, `kustomize edit set image|namespace|replicas`, `kustomize edit add resource`, `kustomize create`. */
export const kustomize: CommandFn = (ctx) => {
  const [what = '', sub = '', ...rest] = ctx.args

  if (what === 'version') {
    ctx.io.out('v5.5.0\n')

    return 0
  }
  if (what === 'build') {
    ctx.io.out(
      kustomizeBuild(ctx, sub === '' ? '.' : sub)
        .map((doc) => toYaml(doc))
        .join('---\n'),
    )

    return 0
  }
  if (what === 'create') {
    const args = [sub, ...rest]
    const resources =
      args
        .find((arg) => arg.startsWith('--resources'))
        ?.split('=')[1]
        ?.split(',') ??
      (args.includes('--autodetect')
        ? filesIn(ctx, '.', false)
            .map((each) => each.split('/').at(-1) ?? each)
            .filter((each) => !FILES.includes(each))
        : [])
    const ns = args.find((arg) => arg.startsWith('--namespace='))?.split('=')[1]

    writeHost(
      ctx,
      'kustomization.yaml',
      toYaml({
        apiVersion: 'kustomize.config.k8s.io/v1beta1',
        kind: 'Kustomization',
        ...(ns === undefined ? {} : { namespace: ns }),
        resources,
      }),
    )

    return 0
  }
  if (what !== 'edit')
    throw new Fail(
      `Error: unknown command "${what}" for "kustomize"\nRun 'kustomize --help' for usage.`,
      1,
    )

  const file = fileOf(ctx, '.')
  const k = obj(
    parseDocs(readHost(ctx, file), file)[0] ?? {
      apiVersion: 'kustomize.config.k8s.io/v1beta1',
      kind: 'Kustomization',
    },
  )
  const [field = '', ...values] = rest

  if (sub === 'set' && field === 'image') {
    const images = arr(k.images).map((each) => obj(each))

    for (const value of values) {
      const match = /^([^=@]+?)(?:=([^@]+?))?(?::([^:/@]+))?(?:@(sha256:[0-9a-f]+))?$/.exec(value)

      if (match === null) throw new Fail(`Error: invalid format of "${value}"`, 1)

      const [, name = '', newName, tag, digest] = match
      const entry: JsonObject = {
        name,
        ...(newName === undefined ? {} : { newName }),
        ...(tag === undefined ? {} : { newTag: tag }),
        ...(digest === undefined ? {} : { digest }),
      }
      const at = images.findIndex((each) => str(each.name) === name)

      if (at < 0) images.push(entry)
      else images[at] = entry
    }
    k.images = images
  } else if (sub === 'set' && field === 'namespace') k.namespace = values[0] ?? ''
  else if (sub === 'set' && field === 'replicas') {
    const list = arr(k.replicas).map((each) => obj(each))

    for (const value of values) {
      const [name = '', count = '1'] = value.split('=')

      k.replicas = [
        ...list.filter((each) => str(each.name) !== name),
        { name, count: Number(count) },
      ]
    }
  } else if (sub === 'add' && field === 'resource') k.resources = [...arr(k.resources), ...values]
  else throw new Fail(`Error: unknown command "${[sub, field].join(' ')}" for "kustomize edit"`, 1)
  writeHost(ctx, file, toYaml(k))

  return 0
}
