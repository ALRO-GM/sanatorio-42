/**
 * Las órdenes de `kubectl` que cambian lo que ya existe (`scale`, `set`,
 * `rollout`, `label`, `annotate`, `patch`, `autoscale`) y las de operar y
 * depurar (`logs`, `exec`, `port-forward`, `cp`, `top`, `wait`, `auth can-i`,
 * `config`, `cluster-info`, `version`, `api-resources`, `explain`,
 * `kustomize`).
 */

import { Fail } from '@sanatorio/shellsim'
import type { Ctx } from '@sanatorio/shellsim'

import type { Args } from './cli.js'
import { parseArgs, seconds } from './cli.js'
import {
  envFor,
  mustGet,
  readHost,
  refsOf,
  scopeOf,
  selected,
  shown,
  store,
  writeHost,
} from './common.js'
import { loadOn, revisionOf, sync, wait } from './controllers.js'
import { imageInfo } from './images.js'
import type { KindInfo } from './kinds.js'
import { KINDS, mustKind, resourceName } from './kinds.js'
import { kustomizeBuild } from './kustomize.js'
import { LIMITS, own } from './limits.js'
import type { Json, JsonObject, K8sObject } from './model.js'
import { endpointsOf } from './net.js'
import { execIn, fsOf } from './podsh.js'
import { logsOf, runtimeOf, usageOf } from './runtime.js'
import { arr, num, obj, podSpecOf, str, strMap } from './spec.js'
import type { Env } from './store.js'
import { getObject, list, nsOf, ownedBy } from './store.js'
import { isoAt, mi, table } from './util.js'
import { saveKubeconfig } from './world.js'
import { toYaml } from './yaml.js'

type Sub = (ctx: Ctx, args: readonly string[]) => number

/** El objeto de `deploy/web` o de `deploy web`. */
function one(env: Env, args: Args, verb: string): { info: KindInfo; object: K8sObject } {
  const [ref] = refsOf(args.rest)
  const name = ref?.names[0]

  if (ref === undefined || name === undefined || name === '')
    throw new Fail(
      `error: you must specify a resource to ${verb}\nSee 'kubectl ${verb} -h' for help and examples`,
      1,
    )

  return { info: ref.info, object: mustGet(env, ref.info, name) }
}

/** Vuelve a pasar un objeto cambiado por la validación y lo guarda. */
function save(ctx: Ctx, env: Env, object: K8sObject): void {
  const doc = JSON.parse(JSON.stringify(object)) as JsonObject

  Reflect.deleteProperty(doc, 'status')
  store(env, doc, 'STDIN', true, 'replace')
  sync(ctx.sh.world)
}

const templateOf = (object: K8sObject): JsonObject =>
  object.kind === 'Pod' ? object : obj(object.spec?.template)

function containersOf(object: K8sObject): JsonObject[] {
  return arr(obj(templateOf(object).spec).containers).map((each) => obj(each))
}

function scale(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['replicas', 'current-replicas', 'timeout', 'selector'],
      flags: ['all'],
      shorts: { l: 'selector' },
    },
    'kubectl scale',
  )
  const env = envFor(ctx, args)
  const replicas = args.one('replicas')

  if (replicas === undefined) throw new Fail('error: required flag(s) "replicas" not set', 1)
  if (!/^\d+$/.test(replicas))
    throw new Fail(
      `error: invalid argument "${replicas}" for "--replicas" flag: strconv.ParseInt: parsing "${replicas}": invalid syntax`,
      1,
    )
  if (Number(replicas) > LIMITS.replicas)
    throw new Fail(
      `peer4u-sandbox: como mucho ${LIMITS.replicas} réplicas en este clúster de prácticas`,
      1,
    )

  const { info, object } = one(env, args, 'scale')

  if (!['Deployment', 'ReplicaSet', 'StatefulSet'].includes(info.kind))
    throw new Fail(`error: no scaler has been implemented for {"" "${info.kind}"}`, 1)
  object.spec = { ...object.spec, replicas: Number(replicas) }
  sync(ctx.sh.world)
  ctx.io.out(`${shown(info, object.metadata.name)} scaled\n`)

  return 0
}

function setCmd(ctx: Ctx, raw: readonly string[]): number {
  const [what = '', ...rest] = raw
  const args = parseArgs(
    rest,
    {
      values: ['requests', 'limits', 'containers', 'from', 'prefix', 'selector', 'filename'],
      flags: ['all', 'list', 'overwrite', 'local', 'record'],
      shorts: { c: 'containers', l: 'selector', f: 'filename' },
    },
    `kubectl set ${what}`,
  )
  const env = envFor(ctx, args)
  const words = args.rest.filter((word) => !word.includes('='))
  const pairs = args.rest.filter((word) => word.includes('=') || /^[A-Za-z_][\w]*-$/.test(word))
  const { info, object } = one(
    env,
    { ...args, rest: words.filter((word) => !word.endsWith('-')) },
    `set ${what}`,
  )
  const containers = containersOf(object)

  if (what === 'image') {
    for (const pair of pairs) {
      const [name = '', image = ''] = pair.split('=')
      const targets = name === '*' ? containers : containers.filter((c) => str(c.name) === name)

      if (targets.length === 0) throw new Fail(`error: unable to find container named "${name}"`, 1)
      for (const c of targets) c.image = image
    }
    obj(templateOf(object).spec).containers = containers
    save(ctx, env, object)
    ctx.io.out(`${shown(info, object.metadata.name)} image updated\n`)

    return 0
  }
  if (what === 'env') {
    const wanted = args.one('containers')

    for (const c of containers) {
      if (wanted !== undefined && str(c.name) !== wanted) continue

      let env2 = arr(c.env).map((each) => obj(each))

      for (const pair of args.rest.filter((word) => word.includes('=') || word.endsWith('-'))) {
        if (pair.endsWith('-') && !pair.includes('=')) {
          env2 = env2.filter((e) => str(e.name) !== pair.slice(0, -1))
          continue
        }

        const at = pair.indexOf('=')
        const key = pair.slice(0, at)

        env2 = [
          ...env2.filter((e) => str(e.name) !== key),
          { name: key, value: pair.slice(at + 1) },
        ]
      }

      const from = args.one('from')

      if (from !== undefined) {
        const [kind = '', name = ''] = from.split('/')
        const source = mustGet(env, mustKind(kind), name)
        const secret = source.kind === 'Secret'

        for (const key of Object.keys(source.data ?? {}))
          env2 = [
            ...env2.filter((e) => str(e.name) !== key),
            {
              name: `${args.one('prefix') ?? ''}${key}`,
              valueFrom: { [secret ? 'secretKeyRef' : 'configMapKeyRef']: { name, key } },
            },
          ]
      }
      c.env = env2
    }
    obj(templateOf(object).spec).containers = containers
    save(ctx, env, object)
    ctx.io.out(`${shown(info, object.metadata.name)} env updated\n`)

    return 0
  }
  if (what === 'resources') {
    const parse = (text: string | undefined): JsonObject | undefined => {
      if (text === undefined) return undefined

      return Object.fromEntries(
        text.split(',').map((pair) => [pair.split('=')[0] ?? '', pair.split('=')[1] ?? '']),
      )
    }
    const requests = parse(args.one('requests'))
    const limits = parse(args.one('limits'))

    for (const c of containers) {
      if (args.one('containers') !== undefined && str(c.name) !== args.one('containers')) continue

      const res = obj(c.resources)

      c.resources = {
        ...res,
        ...(requests === undefined ? {} : { requests: { ...obj(res.requests), ...requests } }),
        ...(limits === undefined ? {} : { limits: { ...obj(res.limits), ...limits } }),
      }
    }
    obj(templateOf(object).spec).containers = containers
    save(ctx, env, object)
    ctx.io.out(`${shown(info, object.metadata.name)} resource requirements updated\n`)

    return 0
  }

  throw new Fail(
    `error: unknown command "${what}" for "kubectl set"\nAvailable Commands: env, image, resources, selector, serviceaccount`,
    1,
  )
}

function rollout(ctx: Ctx, raw: readonly string[]): number {
  const [what = '', ...rest] = raw
  const args = parseArgs(
    rest,
    {
      values: ['timeout', 'to-revision', 'revision', 'output', 'selector'],
      flags: ['watch'],
      shorts: { o: 'output', w: 'watch', l: 'selector' },
    },
    `kubectl rollout ${what}`,
  )
  const env = envFor(ctx, args)
  const { info, object } = one(env, args, `rollout ${what}`)

  if (!['Deployment', 'StatefulSet'].includes(info.kind))
    throw new Fail(
      `error: no ${what === 'history' ? 'history viewer' : 'status viewer'} has been implemented for {"apps" "${info.kind}"}`,
      1,
    )

  const name = object.metadata.name
  const label = info.kind === 'Deployment' ? 'deployment' : 'statefulset'
  const sets = () =>
    list(env.cluster, 'ReplicaSet', nsOf(object)).filter((rs) => ownedBy(rs, object))

  switch (what) {
    case 'status': {
      const timeout = seconds(args.one('timeout'), 600)
      const said = new Set<string>()
      const say = (text: string) => {
        if (!said.has(text)) ctx.io.out(`${text}\n`)
        said.add(text)
      }

      for (let waited = 0; ; waited += 5) {
        const now = envFor(ctx, args)
        const live = getObject(now.cluster, info.kind, nsOf(object), name)

        if (live === undefined)
          throw new Fail(`Error from server (NotFound): ${info.plural}.apps "${name}" not found`, 1)

        const spec = obj(live.spec)
        const status = obj(live.status)
        const wanted = num(spec.replicas, 1)
        const updated = num(status.updatedReplicas)
        const ready =
          info.kind === 'Deployment' ? num(status.availableReplicas) : num(status.readyReplicas)
        const total = num(status.replicas)
        const progressing = arr(status.conditions)
          .map((each) => obj(each))
          .find((c) => str(c.type) === 'Progressing')

        if (info.kind === 'StatefulSet') {
          if (ready >= wanted && updated >= wanted) {
            say(`partitioned roll out complete: ${wanted} new pods have been updated...`)

            return 0
          }
          say(`Waiting for ${wanted - ready} pods to be ready...`)
        } else if (str(progressing?.reason) === 'ProgressDeadlineExceeded')
          throw new Fail(`error: deployment "${name}" exceeded its progress deadline`, 1)
        else if (updated < wanted)
          say(
            `Waiting for deployment "${name}" rollout to finish: ${updated} out of ${wanted} new replicas have been updated...`,
          )
        else if (total > updated)
          say(
            `Waiting for deployment "${name}" rollout to finish: ${total - updated} old replicas are pending termination...`,
          )
        else if (ready < updated)
          say(
            `Waiting for deployment "${name}" rollout to finish: ${ready} of ${updated} updated replicas are available...`,
          )
        else {
          say(`deployment "${name}" successfully rolled out`)

          return 0
        }
        if (waited >= timeout) throw new Fail('error: timed out waiting for the condition', 1)
        wait(ctx.sh.world, 5)
      }
    }
    case 'history': {
      const revisions = sets().sort((a, b) => revisionOf(a) - revisionOf(b))
      const wanted = args.one('revision')

      if (wanted !== undefined) {
        const rs = revisions.find((each) => String(revisionOf(each)) === wanted)

        if (rs === undefined) throw new Fail(`error: unable to find the specified revision`, 1)
        ctx.io.out(
          `${shown(info, name)} with revision #${wanted}\nPod Template:\n${toYaml(obj(rs.spec?.template)).replace(/^/gm, '  ')}`,
        )

        return 0
      }
      ctx.io.out(
        `${shown(info, name)} \n${table(
          ['REVISION', 'CHANGE-CAUSE'],
          revisions.map((rs) => [
            String(revisionOf(rs)),
            rs.metadata.annotations?.['kubernetes.io/change-cause'] ?? '<none>',
          ]),
        )}\n`,
      )

      return 0
    }
    case 'undo': {
      const revisions = sets().sort((a, b) => revisionOf(b) - revisionOf(a))
      const wanted = args.one('to-revision')
      const target =
        wanted === undefined || wanted === '0'
          ? revisions[1]
          : revisions.find((rs) => String(revisionOf(rs)) === wanted)

      if (target === undefined)
        throw new Fail(
          wanted === undefined
            ? `error: no rollout history found for ${label} "${name}"`
            : `error: unable to find specified revision ${wanted} in history`,
          1,
        )

      const template = JSON.parse(JSON.stringify(obj(target.spec?.template))) as JsonObject
      const labels = { ...strMap(obj(template.metadata).labels) }

      Reflect.deleteProperty(labels, 'pod-template-hash')
      template.metadata = { ...obj(template.metadata), labels }
      object.spec = { ...object.spec, template }

      const cause = target.metadata.annotations?.['kubernetes.io/change-cause']
      const annotations = { ...object.metadata.annotations }

      if (cause === undefined) Reflect.deleteProperty(annotations, 'kubernetes.io/change-cause')
      else annotations['kubernetes.io/change-cause'] = cause
      object.metadata.annotations = annotations
      object.metadata.generation = (object.metadata.generation ?? 1) + 1
      sync(ctx.sh.world)
      ctx.io.out(`${shown(info, name)} rolled back\n`)

      return 0
    }
    case 'restart': {
      const template = obj(object.spec?.template)
      const meta = obj(template.metadata)

      template.metadata = {
        ...meta,
        annotations: {
          ...strMap(meta.annotations),
          'kubectl.kubernetes.io/restartedAt': isoAt(env.now),
        },
      }
      object.spec = { ...object.spec, template }
      sync(ctx.sh.world)
      ctx.io.out(`${shown(info, name)} restarted\n`)

      return 0
    }
    case 'pause':
    case 'resume':
      object.spec = { ...object.spec, paused: what === 'pause' }
      sync(ctx.sh.world)
      ctx.io.out(`${shown(info, name)} ${what === 'pause' ? 'paused' : 'resumed'}\n`)

      return 0
    default:
      throw new Fail(
        `error: unknown command "${what}" for "kubectl rollout"\nAvailable Commands: history, pause, restart, resume, status, undo`,
        1,
      )
  }
}

/** `label` y `annotate`: `clave=valor`, `clave-` para quitar, `--overwrite` para cambiar. */
function marks(ctx: Ctx, raw: readonly string[], kind: 'labels' | 'annotations'): number {
  const args = parseArgs(
    raw,
    { values: ['selector'], flags: ['overwrite', 'all', 'list'], shorts: { l: 'selector' } },
    `kubectl ${kind === 'labels' ? 'label' : 'annotate'}`,
  )
  const env = envFor(ctx, args)
  const changes = args.rest.filter(
    (word) =>
      word.includes('=') ||
      (word.endsWith('-') && !word.includes('/') && args.rest.indexOf(word) > 0),
  )
  const words = args.rest.filter((word) => !changes.includes(word))
  const refs = refsOf(words)
  const objects = refs.flatMap((ref) =>
    ref.names.length === 0
      ? selected(env, ref.info, scopeOf(env, args), args.one('selector')).map((object) => ({
          info: ref.info,
          object,
        }))
      : ref.names.map((name) => ({ info: ref.info, object: mustGet(env, ref.info, name) })),
  )

  if (changes.length === 0)
    throw new Fail(
      `error: at least one ${kind === 'labels' ? 'label' : 'annotation'} update is required`,
      1,
    )
  for (const { info, object } of objects) {
    const current = {
      ...(kind === 'labels' ? object.metadata.labels : object.metadata.annotations),
    }
    let removed = false

    for (const change of changes) {
      if (change.endsWith('-') && !change.includes('=')) {
        Reflect.deleteProperty(current, change.slice(0, -1))
        removed = true
        continue
      }

      const at = change.indexOf('=')
      const key = change.slice(0, at)
      const value = change.slice(at + 1)

      if (Object.hasOwn(current, key) && current[key] !== value && !args.has('overwrite'))
        throw new Fail(
          `error: '${key}' already has a value (${current[key] ?? ''}), and --overwrite is false`,
          1,
        )
      current[key] = value
    }
    if (kind === 'labels') object.metadata.labels = current
    else object.metadata.annotations = current
    ctx.io.out(
      `${shown(info, object.metadata.name)} ${kind === 'labels' ? (removed ? 'unlabeled' : 'labeled') : 'annotated'}\n`,
    )
  }
  sync(ctx.sh.world)

  return 0
}

/** Mezcla estratégica (la de `kubectl patch` por defecto): las listas con `name` se mezclan por nombre. */
function strategic(base: Json, patch: Json, json = false): Json {
  if (patch === null) return null
  if (Array.isArray(patch)) {
    if (json || !Array.isArray(base) || !patch.every((item) => typeof obj(item).name === 'string'))
      return patch

    const out = [...base]

    for (const item of patch) {
      const at = out.findIndex((each) => str(obj(each).name) === str(obj(item).name))

      if (at < 0) out.push(item)
      else out[at] = strategic(out[at] ?? null, item)
    }

    return out
  }
  if (typeof patch !== 'object') return patch

  const out: JsonObject = { ...obj(base) }

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) Reflect.deleteProperty(out, key)
    else out[key] = strategic(out[key] ?? null, value, json)
  }

  return out
}

/** Un JSON Patch (`--type=json`): add, replace y remove. */
function jsonPatch(target: JsonObject, ops: Json): JsonObject {
  const doc = JSON.parse(JSON.stringify(target)) as JsonObject

  for (const raw of arr(ops)) {
    const op = obj(raw)
    const parts = str(op.path)
      .split('/')
      .slice(1)
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    const last = parts.pop() ?? ''
    let parent: Json = doc

    for (const part of parts) {
      parent = Array.isArray(parent) ? (parent[Number(part)] ?? null) : (obj(parent)[part] ?? null)
      if (parent === null)
        throw new Fail(
          `The request is invalid: the server rejected our request due to an error in our request`,
          1,
        )
    }

    const kind = str(op.op)

    if (Array.isArray(parent)) {
      const index = last === '-' ? parent.length : Number(last)

      if (kind === 'add') parent.splice(index, 0, op.value ?? null)
      else if (kind === 'replace') parent[index] = op.value ?? null
      else if (kind === 'remove') parent.splice(index, 1)
    } else if (typeof parent === 'object') {
      if (kind === 'remove') Reflect.deleteProperty(parent, last)
      else parent[last] = op.value ?? null
    }
  }

  return doc
}

function patch(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['patch', 'type', 'patch-file', 'output'],
      flags: ['local'],
      shorts: { p: 'patch', o: 'output' },
    },
    'kubectl patch',
  )
  const env = envFor(ctx, args)
  const { info, object } = one(env, args, 'patch')
  const text =
    args.one('patch') ??
    (args.one('patch-file') === undefined ? undefined : readHost(ctx, args.one('patch-file') ?? ''))

  if (text === undefined)
    throw new Fail(
      'error: must specify --patch or --patch-file containing the contents of the patch',
      1,
    )

  let body: Json

  try {
    body = JSON.parse(text) as Json
  } catch {
    throw new Fail(`error: unable to parse "${text}": yaml: did not find expected node content`, 1)
  }

  const type = args.one('type') ?? 'strategic'
  const before = JSON.stringify(object)
  const current = JSON.parse(before) as JsonObject
  const next =
    type === 'json'
      ? jsonPatch(current, body)
      : (strategic(current, body, type === 'merge') as JsonObject)

  if (JSON.stringify(next) === before) {
    ctx.io.out(`${shown(info, object.metadata.name)} patched (no change)\n`)

    return 0
  }
  save(ctx, env, next as unknown as K8sObject)
  ctx.io.out(`${shown(info, object.metadata.name)} patched\n`)

  return 0
}

function autoscale(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['min', 'max', 'cpu-percent', 'cpu', 'name', 'dry-run', 'output'],
      flags: [],
      shorts: { o: 'output' },
    },
    'kubectl autoscale',
  )
  const env = envFor(ctx, args)
  const { info, object } = one(env, args, 'autoscale')
  const max = args.one('max')

  if (max === undefined)
    throw new Fail('error: --max=MAXPODS is required and must be at least 1, max: -1', 1)

  const name = args.one('name') ?? object.metadata.name
  const percent = Number((args.one('cpu-percent') ?? args.one('cpu') ?? '80').replace('%', ''))
  const result = store(
    env,
    {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: { name, namespace: nsOf(object) },
      spec: {
        scaleTargetRef: {
          apiVersion: info.apiVersion,
          kind: info.kind,
          name: object.metadata.name,
        },
        minReplicas: Number(args.one('min') ?? 1),
        maxReplicas: Number(max),
        metrics: [
          {
            type: 'Resource',
            resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: percent } },
          },
        ],
      },
    },
    'STDIN',
    false,
    'create',
  )

  sync(ctx.sh.world)
  ctx.io.out(`${shown(result.info, name)} autoscaled\n`)

  return 0
}

/** El Pod de `pod/x`, `x`, `deploy/x`, `job/x` o `sts/x` (el primero, como kubectl). */
function podFor(ctx: Ctx, env: Env, word: string): K8sObject {
  const [type, name] = word.includes('/') ? word.split('/') : ['pod', word]
  const info = mustKind(type ?? 'pod')

  if (info.kind === 'Pod') return mustGet(env, info, name ?? '')

  const owner = mustGet(env, info, name ?? '')
  const owned = (pod: K8sObject): boolean => {
    if (ownedBy(pod, owner)) return true

    return list(env.cluster, 'ReplicaSet', nsOf(owner)).some(
      (rs) => ownedBy(rs, owner) && ownedBy(pod, rs),
    )
  }
  const pods = list(env.cluster, 'Pod', nsOf(owner))
    .filter(owned)
    .sort(
      (a, b) =>
        Number(runtimeOf(env, b).ready) - Number(runtimeOf(env, a).ready) ||
        (b.metadata.creationTimestamp ?? 0) - (a.metadata.creationTimestamp ?? 0),
    )
  const pod = pods[0]

  if (pod === undefined) throw new Fail(`error: timed out waiting for the condition`, 1)
  if (pods.length > 1) ctx.io.err(`Found ${pods.length} pods, using pod/${pod.metadata.name}\n`)

  return pod
}

function containerFor(ctx: Ctx, pod: K8sObject, wanted: string | undefined, init = false): string {
  const spec = podSpecOf(pod.spec)
  const names = [...spec.containers, ...(init ? spec.init : [])].map((c) => c.name)

  if (wanted !== undefined) {
    if (!names.includes(wanted))
      throw new Fail(`error: container ${wanted} is not valid for pod ${pod.metadata.name}`, 1)

    return wanted
  }
  if (spec.containers.length > 1)
    ctx.io.err(`Defaulted container "${names[0] ?? ''}" out of: ${names.join(', ')}\n`)

  return names[0] ?? ''
}

function logs(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['container', 'tail', 'since', 'selector', 'max-log-requests'],
      flags: ['previous', 'follow', 'timestamps', 'all-containers', 'prefix'],
      shorts: { c: 'container', p: 'previous', f: 'follow', l: 'selector' },
    },
    'kubectl logs',
  )
  const env = envFor(ctx, args)
  const selector = args.one('selector')
  const pods =
    selector !== undefined
      ? selected(env, mustKind('pod'), env.ns, selector)
      : [podFor(ctx, env, args.rest[0] ?? '')]

  if (args.rest.length === 0 && selector === undefined)
    throw new Fail("error: expected 'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]'.", 1)

  const tail = Number(args.one('tail') ?? -1)

  for (const pod of pods) {
    const container = containerFor(ctx, pod, args.one('container'), true)
    const lines = logsOf(env, pod, container, args.has('previous'))

    if (typeof lines === 'string') throw new Fail(lines, 1)

    const shownLines = tail >= 0 ? lines.slice(Math.max(0, lines.length - tail)) : lines

    if (shownLines.length > 0)
      ctx.io.out(
        `${shownLines.map((line) => (args.has('prefix') || (selector !== undefined && pods.length > 1) ? `[pod/${pod.metadata.name}/${container}] ${line}` : line)).join('\n')}\n`,
      )
  }
  if (args.has('follow')) ctx.io.err('(peer4u-sandbox: -f enseña lo que hay y vuelve)\n')

  return 0
}

function exec(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['container'],
      flags: ['stdin', 'tty', 'quiet'],
      shorts: { c: 'container', i: 'stdin', t: 'tty', q: 'quiet' },
    },
    'kubectl exec',
  )
  const env = envFor(ctx, args)
  const target = args.rest[0]

  if (target === undefined)
    throw new Fail('error: pod, type/name or --filename must be specified', 1)
  if (args.command.length === 0)
    throw new Fail('error: you must specify at least one command for the container', 1)

  const pod = podFor(ctx, env, target)
  const rt = runtimeOf(env, pod)
  const name = containerFor(ctx, pod, args.one('container'))
  const index = podSpecOf(pod.spec).containers.findIndex((c) => c.name === name)
  const state = rt.containers[index]
  const container = podSpecOf(pod.spec).containers[index]

  if (rt.phase === 'Succeeded' || rt.phase === 'Failed')
    throw new Fail(
      `error: cannot exec into a container in a completed pod; current phase is ${rt.phase}`,
      1,
    )
  if (state?.state !== 'running' || container === undefined)
    throw new Fail(`error: unable to upgrade connection: container not found ("${name}")`, 1)

  const [program = ''] = args.command

  if (args.command.length === 1 && ['sh', 'bash', 'ash', '/bin/sh', '/bin/bash'].includes(program))
    throw new Fail(
      `peer4u-sandbox: este simulador no abre sesiones interactivas: escribe la orden detrás, como kubectl exec -it ${target} -- sh -c 'env; ls /app'`,
      1,
    )

  const result = execIn(env, pod, container, args.command)

  sync(ctx.sh.world)
  ctx.io.out(result.out)
  if (result.err !== '') ctx.io.err(result.err.endsWith('\n') ? result.err : `${result.err}\n`)
  if (result.code !== 0) ctx.io.err(`command terminated with exit code ${result.code}\n`)

  return result.code
}

/**
 * `kubectl debug POD --image=busybox:1.36 --target=api -- orden`: un contenedor
 * efímero con herramientas junto al de la app (para imágenes sin shell). Ve las
 * variables y los ficheros del contenedor al que apunta.
 */
function debug(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['image', 'target', 'container', 'profile'],
      flags: ['stdin', 'tty', 'quiet'],
      shorts: { i: 'stdin', t: 'tty', c: 'container', q: 'quiet' },
    },
    'kubectl debug',
  )
  const env = envFor(ctx, args)
  const image = args.one('image')

  if (image === undefined || imageInfo(image) === undefined)
    throw new Fail(
      'error: --image is required (and must exist), for example --image=busybox:1.36',
      1,
    )

  const pod = podFor(ctx, env, args.rest[0] ?? '')
  const target = podSpecOf(pod.spec).containers.find(
    (c) => c.name === (args.one('target') ?? podSpecOf(pod.spec).containers[0]?.name),
  )

  if (target === undefined)
    throw new Fail(
      `error: container ${args.one('target') ?? ''} not found in pod ${pod.metadata.name}`,
      1,
    )
  if (
    args.command.length === 0 ||
    (args.command.length === 1 && ['sh', 'bash'].includes(args.command[0] ?? ''))
  )
    throw new Fail(
      `peer4u-sandbox: este simulador no abre sesiones interactivas: pon la orden detrás, como kubectl debug ${pod.metadata.name} --image=busybox:1.36 --target=${target.name} -- sh -c 'env; ls /app'`,
      1,
    )
  ctx.io
    .err(`Targeting container "${target.name}". If you don't see processes from this container it may be because the container runtime doesn't support this feature.
Defaulting debug container name to debugger-${pod.metadata.name.slice(-5)}.
`)

  const result = execIn(env, pod, target, args.command)

  ctx.io.out(result.out)
  if (result.err !== '') ctx.io.err(result.err.endsWith('\n') ? result.err : `${result.err}\n`)

  return result.code
}

function portForward(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['address', 'pod-running-timeout'], flags: [], shorts: {} },
    'kubectl port-forward',
  )
  const env = envFor(ctx, args)
  const [target = '', ...ports] = args.rest

  if (target === '' || ports.length === 0)
    throw new Fail('error: TYPE/NAME and list of ports are required for port-forward', 1)

  const word = target.includes('/') ? target : `pod/${target}`
  const [type = '', name = ''] = word.split('/')
  const info = mustKind(type)
  const object = mustGet(env, info, name)
  const short =
    info.kind === 'Service'
      ? 'svc'
      : info.kind === 'Pod'
        ? 'pod'
        : info.kind === 'Deployment'
          ? 'deploy'
          : ''

  if (short === '')
    throw new Fail(
      `error: cannot attach to *v1.${info.kind}: selector for *v1.${info.kind} not implemented`,
      1,
    )

  const pod =
    info.kind === 'Pod'
      ? object
      : info.kind === 'Service'
        ? endpointsOf(env, object).ready[0]
        : podFor(ctx, env, word)

  if (pod === undefined)
    throw new Fail(
      `error: unable to forward port because pod is not running. Current status=Pending`,
      1,
    )
  if (runtimeOf(env, pod).phase !== 'Running')
    throw new Fail(
      `error: unable to forward port because pod is not running. Current status=${runtimeOf(env, pod).phase}`,
      1,
    )

  for (const spec of ports) {
    const [local = '', remote = local] = spec.split(':')

    if (!/^\d+$/.test(local) || !/^\d+$/.test(remote))
      throw new Fail(
        `error: Error parsing local port '${local}': strconv.ParseUint: parsing "${local}": invalid syntax`,
        1,
      )

    const busy = env.state.forwards.find((f) => f.local === Number(local))

    if (busy !== undefined && !(busy.target === `${short}/${name}` && busy.ns === nsOf(object)))
      throw new Fail(
        `Unable to listen on port ${local}: Listeners failed to create with the following errors: [unable to create listener: Error listen tcp4 127.0.0.1:${local}: bind: address already in use]\nerror: unable to listen on any of the requested ports: [{${local} ${remote}}]`,
        1,
      )
    env.state.forwards = [
      ...env.state.forwards.filter((f) => f.local !== Number(local)),
      {
        cluster: env.cluster.name,
        ns: nsOf(object),
        target: `${short}/${name}`,
        local: Number(local),
        remote: Number(remote),
      },
    ].slice(-LIMITS.forwards)

    const entry =
      info.kind === 'Service'
        ? arr(object.spec?.ports)
            .map((p) => obj(p))
            .find((p) => num(p.port) === Number(remote))
        : undefined
    const container = entry === undefined ? remote : str(entry.targetPort ?? entry.port)

    ctx.io.out(
      `Forwarding from 127.0.0.1:${local} -> ${container}\nForwarding from [::1]:${local} -> ${container}\n`,
    )
  }
  ctx.io.err(
    '(peer4u-sandbox: el port-forward se queda abierto en segundo plano; prueba con curl localhost:PUERTO)\n',
  )

  return 0
}

function cp(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['container'], flags: ['no-preserve', 'retries'], shorts: { c: 'container' } },
    'kubectl cp',
  )
  const env = envFor(ctx, args)
  const [from = '', to = ''] = args.rest
  const remote = (spec: string) => {
    const match = /^(?:([^/:]+)\/)?([^/:]+):(.+)$/.exec(spec)

    return match === null
      ? null
      : { ns: match[1] ?? env.ns, pod: match[2] ?? '', path: match[3] ?? '' }
  }
  const src = remote(from)
  const dst = remote(to)

  if (to === '' || (src === null) === (dst === null))
    throw new Fail(
      "error: source and destination are required\nSee 'kubectl cp -h' for help and examples",
      1,
    )

  const side = (src ?? dst) as { ns: string; pod: string; path: string }
  const pod = mustGet({ ...env, ns: side.ns }, mustKind('pod'), side.pod, side.ns)
  const name = containerFor(ctx, pod, args.one('container'))
  const container = podSpecOf(pod.spec).containers.find((c) => c.name === name)

  if (container === undefined) throw new Fail(`error: container ${name} not found`, 1)

  const fs = fsOf(env, pod, container)

  if (src !== null) {
    const text = fs.read(src.path)

    if (text === null)
      throw new Fail(
        `tar: removing leading '/' from member names\ntar: ${src.path.replace(/^\//, '')}: Cannot stat: No such file or directory\ncommand terminated with exit code 2`,
        1,
      )
    writeHost(ctx, to, text)
  } else {
    const text = readHost(ctx, from)
    const error = fs.write(side.path, text)

    if (error !== null) throw new Fail(`tar: ${error}\ncommand terminated with exit code 2`, 1)
  }
  sync(ctx.sh.world)

  return 0
}

function top(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['selector', 'sort-by'],
      flags: ['containers', 'no-headers', 'sum'],
      shorts: { l: 'selector' },
    },
    'kubectl top',
  )
  const env = envFor(ctx, args)
  const [what = ''] = args.rest

  if (what === 'node' || what === 'nodes' || what === 'no') {
    const rows = list(env.cluster, 'Node', '').map((node) => {
      const pods = list(env.cluster, 'Pod', null).filter(
        (pod) => str(pod.spec?.nodeName) === node.metadata.name,
      )
      const used = pods.reduce(
        (sum, pod) => {
          const u = usageOf(env, pod, 0)

          return { cpu: sum.cpu + u.cpu, memory: sum.memory + u.memory }
        },
        { cpu: 120, memory: 700 * 1024 * 1024 },
      )

      return [
        node.metadata.name,
        `${used.cpu}m`,
        `${Math.round(used.cpu / 20)}%`,
        mi(used.memory),
        `${Math.round((used.memory / (4 * 1024 ** 3)) * 100)}%`,
      ]
    })

    ctx.io.out(table(['NAME', 'CPU(cores)', 'CPU(%)', 'MEMORY(bytes)', 'MEMORY(%)'], rows))

    return 0
  }
  if (what !== 'pod' && what !== 'pods' && what !== 'po')
    throw new Fail(
      `error: unknown command "${what}" for "kubectl top"\nAvailable Commands: node, pod`,
      1,
    )

  const scope = scopeOf(env, args)
  const pods = selected(env, mustKind('pod'), scope, args.one('selector')).filter(
    (pod) => runtimeOf(env, pod).phase === 'Running',
  )
  const loads = new Map<string, number>()

  for (const d of list(env.cluster, 'Deployment', scope)) {
    const ready = list(env.cluster, 'Pod', nsOf(d)).filter(
      (pod) =>
        str(pod.metadata.name).startsWith(`${d.metadata.name}-`) && runtimeOf(env, pod).ready,
    )

    for (const pod of ready)
      loads.set(pod.metadata.uid ?? '', Math.round(loadOn(env, d) / Math.max(1, ready.length)))
  }

  const rows = pods.map((pod) => {
    const u = usageOf(env, pod, loads.get(pod.metadata.uid ?? '') ?? 0)

    return [...(scope === null ? [nsOf(pod)] : []), pod.metadata.name, `${u.cpu}m`, mi(u.memory)]
  })

  if (rows.length === 0) {
    ctx.io.err(`No resources found in ${env.ns} namespace.\n`)

    return 0
  }
  ctx.io.out(
    table([...(scope === null ? ['NAMESPACE'] : []), 'NAME', 'CPU(cores)', 'MEMORY(bytes)'], rows),
  )

  return 0
}

function waitCmd(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['for', 'timeout', 'selector'], flags: ['all'], shorts: { l: 'selector' } },
    'kubectl wait',
  )
  const condition = args.one('for')

  if (condition === undefined) throw new Fail('error: --for must be specified', 1)

  const timeout = seconds(args.one('timeout'), 30)
  const check = (): { done: boolean; names: string[] } => {
    const env = envFor(ctx, args)
    const refs = refsOf(args.rest)
    const objects = refs.flatMap((ref) =>
      ref.names.length === 0
        ? selected(env, ref.info, env.ns, args.one('selector'))
        : ref.names
            .map((name) =>
              getObject(env.cluster, ref.info.kind, ref.info.namespaced ? env.ns : '', name),
            )
            .filter((each) => each !== undefined),
    )
    const wanted = condition.replace(/^condition=/, '').toLowerCase()
    const names = objects.map(
      (object) => `${resourceName(mustKind(object.kind))}/${object.metadata.name}`,
    )

    if (condition === 'delete') return { done: objects.length === 0, names }

    const done =
      objects.length > 0 &&
      objects.every((object) => {
        if (object.kind === 'Pod')
          return wanted === 'ready'
            ? runtimeOf(env, object).ready
            : runtimeOf(env, object).phase.toLowerCase() === wanted

        return arr(obj(object.status).conditions).some(
          (c) => str(obj(c).type).toLowerCase() === wanted && str(obj(c).status) === 'True',
        )
      })

    return { done, names }
  }

  for (let waited = 0; ; waited += 5) {
    const result = check()

    if (result.done) {
      for (const name of result.names)
        ctx.io.out(`${name} ${condition === 'delete' ? 'deleted' : 'condition met'}\n`)

      return 0
    }
    if (waited >= timeout)
      throw new Fail(
        `error: timed out waiting for the condition on ${result.names.map((name) => name.replace(/^(\w+)[^/]*\//, '$1s/')).join(', ') || args.rest.join(' ')}`,
        1,
      )
    wait(ctx.sh.world, 5)
  }
}

function auth(ctx: Ctx, raw: readonly string[]): number {
  const [what = '', ...rest] = raw
  const args = parseArgs(
    rest,
    { values: ['as', 'as-group', 'subresource'], flags: ['list', 'quiet'], shorts: { q: 'quiet' } },
    'kubectl auth can-i',
  )

  if (what === 'whoami') {
    ctx.io.out(
      table(
        ['ATTRIBUTE', 'VALUE'],
        [
          ['Username', 'peer'],
          ['Groups', '[peer4u:devs system:authenticated]'],
        ],
      ),
    )

    return 0
  }
  if (what !== 'can-i')
    throw new Fail(
      `error: unknown command "${what}" for "kubectl auth"\nAvailable Commands: can-i, reconcile, whoami`,
      1,
    )

  const env = envFor(ctx, args)
  const as = args.one('as')
  // `peer` es del equipo: puede todo en staging. Una ServiceAccount nueva no puede nada (no hay RoleBinding).
  const account = /^system:serviceaccount:([^:]+):(.+)$/.exec(as ?? '')
  let yes = as === undefined || as === 'peer'

  if (account !== null) {
    const exists =
      getObject(env.cluster, 'ServiceAccount', account[1] ?? '', account[2] ?? '') !== undefined

    yes = exists && account[2] === 'default' && (args.rest[0] ?? '') === 'get' && false
  }
  if (!args.has('quiet')) ctx.io.out(`${yes ? 'yes' : 'no'}\n`)

  return yes ? 0 : 1
}

function config(ctx: Ctx, raw: readonly string[]): number {
  const [what = '', ...rest] = raw
  const args = parseArgs(
    rest,
    {
      values: ['output', 'cluster', 'user'],
      flags: ['current', 'minify', 'raw', 'flatten', 'no-headers'],
      shorts: { o: 'output' },
    },
    `kubectl config ${what}`,
  )
  const state = envFor(ctx, {
    ...args,
    one: (name) => (name === 'namespace' ? undefined : args.one(name)),
  }).state

  switch (what) {
    case 'get-contexts': {
      const rows = Object.entries(state.contexts)
        .filter(([name]) => args.rest.length === 0 || args.rest.includes(name))
        .map(([name, c]) => [
          name === state.current ? '*' : '',
          name,
          c.cluster,
          c.user,
          c.namespace,
        ])

      ctx.io.out(table(['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'], rows))

      return 0
    }
    case 'current-context':
      ctx.io.out(`${state.current}\n`)

      return 0
    case 'get-clusters':
      ctx.io.out(`NAME\n${Object.keys(state.clusters).join('\n')}\n`)

      return 0
    case 'use-context':
    case 'use': {
      const name = args.rest[0] ?? ''

      if (own(state.contexts, name) === undefined)
        throw new Fail(`error: no context exists with the name: "${name}"`, 1)
      state.current = name
      saveKubeconfig(ctx.sh.world, state)
      ctx.io.out(`Switched to context "${name}".\n`)

      return 0
    }
    case 'set-context': {
      const name = args.has('current') ? state.current : (args.rest[0] ?? '')
      const context = own(state.contexts, name)
      const ns = args.one('namespace')

      if (context === undefined)
        throw new Fail(`error: no context exists with the name: "${name}"`, 1)
      if (ns !== undefined) context.namespace = ns
      saveKubeconfig(ctx.sh.world, state)
      ctx.io.out(`Context "${name}" modified.\n`)

      return 0
    }
    case 'view': {
      const text = readHost(ctx, '~/.kube/config')

      ctx.io.out(
        args.has('minify')
          ? text.replace(
              /(contexts:\n)(?:- context:[\s\S]*?name: \S+\n)+/,
              (all, head: string) =>
                `${head}${all
                  .split('- context:')
                  .filter((part) => part.includes(`name: ${state.current}\n`))
                  .map((part) => `- context:${part}`)
                  .join('')}`,
            )
          : text,
      )

      return 0
    }
    default:
      throw new Fail(
        `error: unknown command "${what}" for "kubectl config"\nAvailable Commands: current-context, get-contexts, set-context, use-context, view`,
        1,
      )
  }
}

function clusterInfo(ctx: Ctx, raw: readonly string[]): number {
  const env = envFor(ctx, parseArgs(raw, { values: [], flags: [] }, 'kubectl cluster-info'))
  const server = env.cluster.server

  ctx.io.out(
    `Kubernetes control plane is running at ${server}\nCoreDNS is running at ${server}/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\nMetrics-server is running at ${server}/api/v1/namespaces/kube-system/services/https:metrics-server:https/proxy\n\nTo further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.\n`,
  )

  return 0
}

function version(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['output'], flags: ['client', 'short'], shorts: { o: 'output' } },
    'kubectl version',
  )

  ctx.io.out(
    `Client Version: v1.31.2\nKustomize Version: v5.4.2\n${args.has('client') ? '' : 'Server Version: v1.31.2+k3s1\n'}`,
  )

  return 0
}

function apiResources(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    {
      values: ['output', 'api-group', 'verbs'],
      flags: ['namespaced', 'no-headers', 'cached'],
      shorts: { o: 'output' },
    },
    'kubectl api-resources',
  )
  const rows = KINDS.filter(
    (info) =>
      args.one('namespaced') === undefined || String(info.namespaced) === args.one('namespaced'),
  ).map((info) => [
    info.plural,
    info.shorts.join(','),
    info.apiVersion,
    String(info.namespaced),
    info.kind,
  ])

  ctx.io.out(
    args.one('output') === 'name'
      ? `${KINDS.map((info) => info.plural).join('\n')}\n`
      : table(['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], rows),
  )

  return 0
}

/** Lo que cuenta `explain` de los campos que más se usan. */
const EXPLAIN: Record<string, [string, string, string[]]> = {
  pod: [
    'Pod',
    'Pod is a collection of containers that can run on a host. This resource is created by clients and scheduled onto hosts.',
    [
      'apiVersion\t<string>',
      'kind\t<string>',
      'metadata\t<ObjectMeta>',
      'spec\t<PodSpec>',
      'status\t<PodStatus>',
    ],
  ],
  'pod.spec': [
    'Pod',
    'Specification of the desired behavior of the pod.',
    [
      'containers\t<[]Container> -required-',
      'imagePullSecrets\t<[]LocalObjectReference>',
      'initContainers\t<[]Container>',
      'restartPolicy\t<string>',
      'securityContext\t<PodSecurityContext>',
      'serviceAccountName\t<string>',
      'volumes\t<[]Volume>',
    ],
  ],
  'pod.spec.containers': [
    'Pod',
    'List of containers belonging to the pod. Containers cannot currently be added or removed. There must be at least one container in a Pod. Cannot be updated.',
    [
      'args\t<[]string>',
      'command\t<[]string>',
      'env\t<[]EnvVar>',
      'envFrom\t<[]EnvFromSource>',
      'image\t<string>',
      'livenessProbe\t<Probe>',
      'name\t<string> -required-',
      'ports\t<[]ContainerPort>',
      'readinessProbe\t<Probe>',
      'resources\t<ResourceRequirements>',
      'securityContext\t<SecurityContext>',
      'startupProbe\t<Probe>',
      'volumeMounts\t<[]VolumeMount>',
    ],
  ],
  deployment: [
    'Deployment',
    'Deployment enables declarative updates for Pods and ReplicaSets.',
    [
      'apiVersion\t<string>',
      'kind\t<string>',
      'metadata\t<ObjectMeta>',
      'spec\t<DeploymentSpec>',
      'status\t<DeploymentStatus>',
    ],
  ],
  'deployment.spec': [
    'Deployment',
    'Specification of the desired behavior of the Deployment.',
    [
      'minReadySeconds\t<integer>',
      'paused\t<boolean>',
      'progressDeadlineSeconds\t<integer>',
      'replicas\t<integer>',
      'revisionHistoryLimit\t<integer>',
      'selector\t<LabelSelector> -required-',
      'strategy\t<DeploymentStrategy>',
      'template\t<PodTemplateSpec> -required-',
    ],
  ],
  'deployment.spec.strategy': [
    'Deployment',
    'The deployment strategy to use to replace existing pods with new ones.',
    [
      'rollingUpdate\t<RollingUpdateDeployment>',
      'type\t<string>\n    enum: Recreate, RollingUpdate',
    ],
  ],
  'statefulset.spec': [
    'StatefulSet',
    'Spec defines the desired identities of pods in this set.',
    [
      'minReadySeconds\t<integer>',
      'persistentVolumeClaimRetentionPolicy\t<StatefulSetPersistentVolumeClaimRetentionPolicy>',
      'podManagementPolicy\t<string>',
      'replicas\t<integer>',
      'revisionHistoryLimit\t<integer>',
      'selector\t<LabelSelector> -required-',
      'serviceName\t<string>',
      'template\t<PodTemplateSpec> -required-',
      'updateStrategy\t<StatefulSetUpdateStrategy>',
      'volumeClaimTemplates\t<[]PersistentVolumeClaim>',
    ],
  ],
  service: [
    'Service',
    'Service is a named abstraction of software service (for example, mysql) consisting of local port (for example 3306) that the proxy listens on, and the selector that determines which pods will answer requests sent through the proxy.',
    [
      'apiVersion\t<string>',
      'kind\t<string>',
      'metadata\t<ObjectMeta>',
      'spec\t<ServiceSpec>',
      'status\t<ServiceStatus>',
    ],
  ],
  'service.spec': [
    'Service',
    'Spec defines the behavior of a service.',
    [
      'clusterIP\t<string>',
      'ports\t<[]ServicePort>',
      'selector\t<map[string]string>',
      'type\t<string>\n    enum: ClusterIP, ExternalName, LoadBalancer, NodePort',
    ],
  ],
  'pod.spec.containers.livenessprobe': [
    'Pod',
    'Periodic probe of container liveness. Container will be restarted if the probe fails.',
    [
      'exec\t<ExecAction>',
      'failureThreshold\t<integer>',
      'httpGet\t<HTTPGetAction>',
      'initialDelaySeconds\t<integer>',
      'periodSeconds\t<integer>',
      'tcpSocket\t<TCPSocketAction>',
      'timeoutSeconds\t<integer>',
    ],
  ],
  'pod.spec.containers.resources': [
    'Pod',
    'Compute Resources required by this container. Cannot be updated.',
    ['limits\t<map[string]Quantity>', 'requests\t<map[string]Quantity>'],
  ],
  ingress: [
    'Ingress',
    'Ingress is a collection of rules that allow inbound connections to reach the endpoints defined by a backend.',
    [
      'apiVersion\t<string>',
      'kind\t<string>',
      'metadata\t<ObjectMeta>',
      'spec\t<IngressSpec>',
      'status\t<IngressStatus>',
    ],
  ],
}

function explain(ctx: Ctx, raw: readonly string[]): number {
  const args = parseArgs(
    raw,
    { values: ['api-version', 'output'], flags: ['recursive'], shorts: { o: 'output' } },
    'kubectl explain',
  )
  const path = (args.rest[0] ?? '').toLowerCase()
  const [head = '', ...tail] = path.split('.')
  const info = KINDS.find((each) =>
    [each.plural, each.kind.toLowerCase(), ...each.shorts].includes(head),
  )
  const key = [info?.kind.toLowerCase() ?? head, ...tail].join('.')
  const doc =
    EXPLAIN[key] ??
    EXPLAIN[key.replace('readinessprobe', 'livenessprobe').replace('startupprobe', 'livenessprobe')]

  if (info === undefined)
    throw new Fail(`error: the server doesn't have a resource type "${head}"`, 1)
  if (doc === undefined) {
    // Se sugiere solo algo que tenga ayuda: del mismo tipo si hay, y si no, la del Pod.
    const kind = info.kind.toLowerCase()
    const known = Object.keys(EXPLAIN).find((each) => each.split('.')[0] === kind && each !== key)

    ctx.io.out(
      `GROUP:      ${info.apiVersion.includes('/') ? (info.apiVersion.split('/')[0] ?? '') : ''}\nKIND:       ${info.kind}\nVERSION:    ${info.apiVersion.split('/').at(-1) ?? ''}\n\nFIELD: ${tail.at(-1) ?? info.kind}\n\nDESCRIPTION:\n    (peer4u-sandbox: aquí solo hay ayuda de los campos que más se usan; prueba kubectl explain ${known ?? 'pod.spec'})\n`,
    )

    return 0
  }

  const [kind, description, fields] = doc

  ctx.io.out(
    `KIND:       ${kind}\nVERSION:    ${info.apiVersion}\n\n${tail.length > 0 ? `FIELD: ${tail.at(-1) ?? ''}\n\n` : ''}DESCRIPTION:\n    ${description}\n\nFIELDS:\n${fields.map((field) => `  ${field}`).join('\n')}\n`,
  )

  return 0
}

function kustomizeCmd(ctx: Ctx, raw: readonly string[]): number {
  const dir = raw.find((arg) => !arg.startsWith('-')) ?? '.'

  ctx.io.out(
    kustomizeBuild(ctx, dir)
      .map((doc) => toYaml(doc))
      .join('---\n'),
  )

  return 0
}

export const OPS: Record<string, Sub> = {
  scale,
  set: setCmd,
  rollout,
  label: (ctx, args) => marks(ctx, args, 'labels'),
  annotate: (ctx, args) => marks(ctx, args, 'annotations'),
  patch,
  autoscale,
  logs,
  exec,
  debug,
  'port-forward': portForward,
  cp,
  top,
  wait: waitCmd,
  auth,
  config,
  'cluster-info': clusterInfo,
  version,
  'api-resources': apiResources,
  explain,
  kustomize: kustomizeCmd,
}
