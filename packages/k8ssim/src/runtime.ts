/**
 * Qué hace cada Pod en cada momento. El controlador apunta cuándo arrancaron
 * sus contenedores (`status.startedAt`); a partir de ahí todo se calcula con
 * el reloj: cuándo escucha la app (la 1.2.0 tarda 20 s), si las sondas la
 * dan por lista o la matan, cuándo sale con un 1 o la mata la memoria (137),
 * cuántas veces se ha reiniciado y cuánto espera entre reinicio y reinicio
 * (10 s, 20 s, 40 s… hasta 5 min: el `CrashLoopBackOff`). Así no hace falta
 * simular cada segundo y dos caminos que llegan al mismo sitio dan lo mismo.
 */

import type { ImageInfo } from './images.js'
import { imageInfo, wellFormed } from './images.js'
import { own } from './limits.js'
import type { JsonObject, K8sObject } from './model.js'
import { MI } from './model.js'
import { appHttp, connect } from './net.js'
import { runInPod } from './podsh.js'
import type { Container, PodSpec, Probe } from './spec.js'
import { arr, num, obj, podSpecOf, str } from './spec.js'
import type { Env } from './store.js'
import { getObject, nsOf } from './store.js'
import { decode64 } from './util.js'

/** Lo que pasa al arrancar un contenedor. */
export type Outcome =
  | { kind: 'serve'; listenAfter: number; logs: string[] }
  | {
      kind: 'exit'
      code: number
      /** Segundos que vive antes de salir. */
      life: number
      logs: string[]
      reason: 'Error' | 'OOMKilled' | 'Completed'
    }

type ContainerState = {
  name: string
  image: string
  state: 'running' | 'waiting' | 'terminated'
  reason: string
  message: string
  exitCode: number
  ready: boolean
  restarts: number
  /** Cuándo empezó la instancia de ahora (o la última). */
  since: number
  last: { reason: string; exitCode: number; at: number } | null
  /** Qué mató la última instancia, si fue una sonda. */
  killedBy: 'liveness' | 'startup' | null
  outcome: Outcome | null
}

type PodRuntime = {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed'
  /** La columna STATUS de `kubectl get pods`. */
  status: string
  ready: boolean
  restarts: number
  containers: ContainerState[]
  /** Por qué no arranca aún (eventos y `describe`). */
  waiting: { reason: string; message: string } | null
  /** Que el contenedor principal escucha (aunque no esté listo). */
  listening: boolean
}

/** Lo que tarda en arrancar un contenedor desde que el Pod se puede arrancar. */
export const START_DELAY = 2

/** Variables de un contenedor, o el error que da Kubernetes si falta algo. */
export function resolveEnv(
  env: Env,
  ns: string,
  container: Container,
): { vars: Record<string, string>; error: string | null } {
  const vars: Record<string, string> = {}

  const source = (kind: 'configMap' | 'secret', name: string): Record<string, string> | null => {
    const object = getObject(env.cluster, kind === 'secret' ? 'Secret' : 'ConfigMap', ns, name)

    if (object === undefined) return null
    if (kind === 'configMap') return { ...object.data }

    const out: Record<string, string> = {}

    for (const [key, value] of Object.entries(object.data ?? {}))
      try {
        out[key] = decode64(value)
      } catch {
        out[key] = value
      }
    for (const [key, value] of Object.entries(object.stringData ?? {})) out[key] = value

    return out
  }

  for (const from of container.envFrom) {
    const data = source(from.kind, from.name)

    if (data === null) {
      if (from.optional) continue

      return {
        vars,
        error: `${from.kind === 'secret' ? 'secret' : 'configmap'} "${from.name}" not found`,
      }
    }
    for (const [key, value] of Object.entries(data)) vars[`${from.prefix}${key}`] = value
  }
  for (const item of container.env) {
    if (item.value !== undefined) {
      // `$(OTRA)` se sustituye por otra variable ya definida, como hace Kubernetes.
      vars[item.name] = item.value.replace(
        /\$\(([A-Za-z_][A-Za-z0-9_]*)\)/g,
        (all, name: string) => own(vars, name) ?? all,
      )
      continue
    }
    if (item.field !== undefined) {
      vars[item.name] = item.field === 'metadata.namespace' ? ns : item.field
      continue
    }
    if (item.from === undefined) {
      vars[item.name] = ''
      continue
    }

    const data = source(item.from.kind, item.from.name)
    const label = item.from.kind === 'secret' ? 'Secret' : 'ConfigMap'

    if (data === null) {
      if (item.from.optional) continue

      return {
        vars,
        error: `${item.from.kind === 'secret' ? 'secret' : 'configmap'} "${item.from.name}" not found`,
      }
    }

    const value = own(data, item.from.key)

    if (value === undefined) {
      if (item.from.optional) continue

      return {
        vars,
        error: `couldn't find key ${item.from.key} in ${label} ${ns}/${item.from.name}`,
      }
    }
    vars[item.name] = value
  }

  return { vars, error: null }
}

/** El uid con el que corre un contenedor (el de la imagen o el del `securityContext`). */
export function uidIn(spec: PodSpec, container: Container, image: ImageInfo | undefined): number {
  return container.security.runAsUser ?? spec.security.runAsUser ?? image?.uid ?? 0
}

/** Por qué no se puede descargar la imagen (`null` si se puede). */
export function pullError(
  env: Env,
  pod: K8sObject,
  ref: string,
): { reason: string; message: string } | null {
  if (!wellFormed(ref))
    return {
      reason: 'InvalidImageName',
      message: `Failed to apply default image tag "${ref}": couldn't parse image name "${ref}": invalid reference format`,
    }

  const image = imageInfo(ref)

  if (image === undefined)
    return {
      reason: 'ErrImagePull',
      message: `Failed to pull image "${ref}": rpc error: code = NotFound desc = failed to pull and unpack image "${ref}": failed to resolve reference "${ref}": ${ref}: not found`,
    }
  if (image.private && !canPull(env, pod))
    return {
      reason: 'ErrImagePull',
      message: `Failed to pull image "${ref}": rpc error: code = Unknown desc = failed to pull and unpack image "${ref}": failed to resolve reference "${ref}": failed to authorize: failed to fetch anonymous token: unexpected status from GET request to https://ghcr.io/token?scope=repository%3Apeer4u%2F${(ref.split('/')[2] ?? '').split(':')[0] ?? ''}%3Apull&service=ghcr.io: 401 Unauthorized`,
    }

  return null
}

/** ¿Tiene el Pod (o su ServiceAccount) un Secret de registro válido para ghcr.io? */
function canPull(env: Env, pod: K8sObject): boolean {
  const ns = nsOf(pod)
  const spec = podSpecOf(pod.spec)
  const account = getObject(env.cluster, 'ServiceAccount', ns, spec.serviceAccount)
  const names = [
    ...spec.pullSecrets,
    ...arr(account?.spec?.imagePullSecrets).map((item) => str(obj(item).name)),
    // Una ServiceAccount guarda `imagePullSecrets` arriba, no en `spec`.
    ...arr((account as unknown as JsonObject | undefined)?.imagePullSecrets).map((item) =>
      str(obj(item).name),
    ),
  ]

  return names.some((name) => {
    const secret = getObject(env.cluster, 'Secret', ns, name)

    if (secret?.type !== 'kubernetes.io/dockerconfigjson') return false

    try {
      const config = JSON.parse(decode64(secret.data?.['.dockerconfigjson'] ?? '')) as {
        auths?: Record<string, { password?: string; auth?: string }>
      }
      const auths = config.auths ?? {}

      return Object.entries(auths).some(([server, auth]) => {
        const password =
          auth.password ??
          decode64(auth.auth ?? '')
            .split(':')
            .slice(1)
            .join(':')

        return (
          server.replace(/^https?:\/\//, '').replace(/\/.*$/, '') === 'ghcr.io' &&
          password === 'ghp_peer4uDemoToken0000000000000000000'
        )
      })
    } catch {
      return false
    }
  })
}

const has = (vars: Record<string, string>, name: string): boolean =>
  Object.hasOwn(vars, name) && vars[name] !== ''

/** El comando que ejecuta un contenedor (el de la imagen si no pone `command`/`args`). */
export const commandOf = (container: Container): string[] => [
  ...container.command,
  ...container.args,
]

/** Qué hace un contenedor al arrancar, con sus variables. */
export function outcomeOf(
  env: Env,
  pod: K8sObject,
  container: Container,
  vars: Record<string, string>,
): Outcome {
  const image = imageInfo(container.image)
  const spec = podSpecOf(pod.spec)
  const argv = commandOf(container)
  const limit = container.limits.memory

  if (image === undefined) return { kind: 'exit', code: 1, life: 1, logs: [], reason: 'Error' }
  if (limit !== null && image.memory > limit)
    return {
      kind: 'exit',
      code: 137,
      life: 15,
      reason: 'OOMKilled',
      logs:
        image.behaviour === 'informes'
          ? [
              'informes 1.0.0: generando el informe mensual',
              `memoria: ${Math.round(limit / MI / 3)}Mi`,
              `memoria: ${Math.round((limit / MI) * 0.66)}Mi`,
              `memoria: ${Math.round((limit / MI) * 0.97)}Mi`,
            ]
          : [],
    }

  // Una orden propia en una imagen con shell (busybox, curl) o una tarea de la API.
  if (argv.length > 0 && (image.behaviour === 'busybox' || image.behaviour === 'curl'))
    return runInPod(env, pod, container, vars, argv)

  const uid = uidIn(spec, container, image)

  switch (image.behaviour) {
    case 'api': {
      if (argv.join(' ').includes('migrate')) {
        const db = databaseUp(env, pod, vars)

        return db === null
          ? {
              kind: 'exit',
              code: 0,
              life: 4,
              reason: 'Completed',
              logs: [
                `> peer4u-api@${image.version} migrate`,
                '> node migrate.js',
                'migración 001-usuarios: aplicada',
                'migración 002-pedidos: aplicada',
                '2 migraciones aplicadas',
              ],
            }
          : {
              kind: 'exit',
              code: 1,
              life: 3,
              reason: 'Error',
              logs: [`> peer4u-api@${image.version} migrate`, `Error: ${db}`],
            }
      }

      const missing = image.needs.find((name) => !has(vars, name))

      if (missing !== undefined)
        return {
          kind: 'exit',
          code: 1,
          life: 1,
          reason: 'Error',
          logs: [
            `> peer4u-api@${image.version} start`,
            '> node server.js',
            `Error: ${missing} is not set${missing === 'REDIS_URL' ? ' (required since 1.1.0: the API now caches sessions in Redis)' : ''}`,
            '    at Object.<anonymous> (/app/server.js:7:9)',
          ],
        }

      return {
        kind: 'serve',
        listenAfter: image.readyAfter,
        logs: [
          `> peer4u-api@${image.version} start`,
          '> node server.js',
          ...(image.readyAfter > 0 ? ['warming up caches…'] : []),
          `api listening on :${vars.PORT ?? '3000'}`,
        ],
      }
    }
    case 'postgres':
      if (!has(vars, 'POSTGRES_PASSWORD') && vars.POSTGRES_HOST_AUTH_METHOD !== 'trust')
        return {
          kind: 'exit',
          code: 1,
          life: 1,
          reason: 'Error',
          logs: [
            'Error: Database is uninitialized and superuser password is not specified.',
            '       You must specify POSTGRES_PASSWORD to a non-empty value for the',
            '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".',
          ],
        }

      return {
        kind: 'serve',
        listenAfter: 0,
        logs: [
          'PostgreSQL init process complete; ready for start up.',
          'LOG:  starting PostgreSQL 16.4 on x86_64-pc-linux-gnu',
          'LOG:  listening on IPv4 address "0.0.0.0", port 5432',
          'LOG:  database system is ready to accept connections',
        ],
      }
    case 'nginx':
      if (uid !== 0)
        return {
          kind: 'exit',
          code: 1,
          life: 1,
          reason: 'Error',
          logs: [
            '/docker-entrypoint.sh: Configuration complete; ready for start up',
            'nginx: [emerg] bind() to 0.0.0.0:80 failed (13: Permission denied)',
          ],
        }

      return {
        kind: 'serve',
        listenAfter: 0,
        logs: [
          '/docker-entrypoint.sh: Configuration complete; ready for start up',
          'nginx: start worker processes',
        ],
      }
    case 'front':
      return {
        kind: 'serve',
        listenAfter: 0,
        logs: [
          '/docker-entrypoint.sh: Configuration complete; ready for start up',
          'nginx: front 1.0.0, proxy /api/ -> http://api:3000/',
        ],
      }
    case 'redis':
      return {
        kind: 'serve',
        listenAfter: 0,
        logs: ['* Redis version=7.4.1, bits=64', '* Ready to accept connections tcp'],
      }
    case 'informes':
      return {
        kind: 'serve',
        listenAfter: 0,
        logs: [
          'informes 1.0.0: generando el informe mensual',
          'memoria: 120Mi',
          'memoria: 240Mi',
          'memoria: 300Mi',
          'informe listo: /tmp/informe-2026-10.pdf; esperando al siguiente',
        ],
      }
    case 'busybox':
    case 'curl':
      return {
        kind: 'exit',
        code: 0,
        life: 1,
        reason: 'Completed',
        logs: image.behaviour === 'curl' ? ["curl: try 'curl --help' for more information"] : [],
      }
  }
}

/** `null` si la API llega a su base de datos con `DATABASE_URL`; si no, el error de `pg`. */
export function databaseUp(env: Env, pod: K8sObject, vars: Record<string, string>): string | null {
  const url = /^postgres(?:ql)?:\/\/([^:@/]+)(?::([^@/]*))?@([^:/]+)(?::(\d+))?/.exec(
    vars.DATABASE_URL ?? '',
  )

  if (url === null) return 'DATABASE_URL is not a valid postgres:// URL'

  const host = url[3] ?? ''
  const port = Number(url[4] ?? 5432)
  const target = connect(env, pod, host, port)

  if (target.error !== null)
    return target.error === 'dns'
      ? `getaddrinfo ENOTFOUND ${host}`
      : `connect ${target.error === 'timeout' ? 'ETIMEDOUT' : 'ECONNREFUSED'} ${host}:${port}`

  const db = target.pod
  const image = db === null ? undefined : imageInfo(firstImage(db))

  if (db === null || image?.behaviour !== 'postgres') return `connect ECONNREFUSED ${host}:${port}`

  const dbVars = resolveEnv(
    env,
    nsOf(db),
    podSpecOf(db.spec).containers[0] ?? emptyContainer(),
  ).vars

  if (dbVars.POSTGRES_HOST_AUTH_METHOD === 'trust') return null
  if ((url[2] ?? '') !== (dbVars.POSTGRES_PASSWORD ?? ''))
    return `password authentication failed for user "${url[1] ?? ''}"`

  return null
}

const firstImage = (pod: K8sObject): string => podSpecOf(pod.spec).containers[0]?.image ?? ''

const emptyContainer = (): Container => ({
  name: '',
  image: '',
  command: [],
  args: [],
  env: [],
  envFrom: [],
  ports: [],
  requests: { cpu: null, memory: null },
  limits: { cpu: null, memory: null },
  readiness: null,
  liveness: null,
  startup: null,
  mounts: [],
  security: {},
})

/** El puerto de una sonda (`http` es el nombre de un `containerPort`). */
function probePort(container: Container, probe: Probe): number {
  if (typeof probe.port === 'number') return probe.port

  return container.ports.find((port) => port.name === probe.port)?.containerPort ?? -1
}

/** ¿Contesta bien la app a esta sonda ahora mismo (ya escuchando)? */
function probeOk(env: Env, pod: K8sObject, container: Container, probe: Probe): boolean {
  const image = imageInfo(container.image)

  const port = image?.port ?? null

  if (port === null) return probe.kind === 'exec'
  if (probe.kind === 'exec') return !probe.command.includes('false')
  if (probePort(container, probe) !== port) return false
  if (probe.kind === 'tcp') return true

  const reply = appHttp(env, pod, port, probe.path)

  return reply !== null && reply.status >= 200 && reply.status < 400
}

/** Hasta cuándo vive una instancia que escucha a partir de `listen` (`Infinity`: no la matan). */
function killAt(
  env: Env,
  pod: K8sObject,
  container: Container,
  listen: number,
): { at: number; by: 'liveness' | 'startup' | null } {
  const healthy = (probe: Probe) => probeOk(env, pod, container, probe)
  // Cuándo pasa una sonda por primera vez (o `Infinity`), y cuándo mata si no pasa.
  const firstPass = (probe: Probe, from: number): number => {
    if (!healthy(probe)) return Infinity

    const start = Math.max(from, probe.initialDelay)

    return start >= listen
      ? start
      : start + Math.ceil((listen - start) / probe.period) * probe.period
  }
  const deadline = (probe: Probe, from: number): number =>
    Math.max(from, probe.initialDelay) + (probe.failure - 1) * probe.period
  let from = 0

  if (container.startup !== null) {
    const passes = firstPass(container.startup, 0)

    if (passes > deadline(container.startup, 0))
      return { at: deadline(container.startup, 0), by: 'startup' }
    from = passes
  }
  if (container.liveness !== null) {
    const passes = firstPass(container.liveness, from)

    if (passes > deadline(container.liveness, from))
      return { at: deadline(container.liveness, from), by: 'liveness' }
  }

  return { at: Infinity, by: null }
}

/** ¿Está lista a los `age` segundos una instancia que escucha a partir de `listen`? */
function readyAt(
  env: Env,
  pod: K8sObject,
  container: Container,
  age: number,
  listen: number,
): boolean {
  if (
    container.startup !== null &&
    (age < listen || !probeOk(env, pod, container, container.startup))
  )
    return false

  const probe = container.readiness

  if (probe === null) return true
  if (age < Math.max(probe.initialDelay, listen)) return false

  return probeOk(env, pod, container, probe)
}

const backoff = (n: number): number => Math.min(10 * 2 ** n, 300)

/** El estado de un contenedor a la hora `now`, si arrancó en `start` con ese resultado. */
function timeline(
  env: Env,
  pod: K8sObject,
  container: Container,
  outcome: Outcome,
  start: number,
  base: number,
  restartPolicy: PodSpec['restartPolicy'],
): ContainerState {
  const state: ContainerState = {
    name: container.name,
    image: container.image,
    state: 'running',
    reason: '',
    message: '',
    exitCode: 0,
    ready: false,
    restarts: base,
    since: start,
    last: null,
    killedBy: null,
    outcome,
  }
  const kill =
    outcome.kind === 'serve'
      ? killAt(env, pod, container, outcome.listenAfter)
      : { at: outcome.life, by: null }
  const restarts =
    restartPolicy === 'Always' ||
    (restartPolicy === 'OnFailure' && outcome.kind === 'exit' && outcome.code !== 0)
  let at = start

  if (env.now < start) {
    state.state = 'waiting'
    state.reason = 'ContainerCreating'

    return state
  }
  for (let n = 0; n < 400; n++) {
    const age = env.now - at

    if (age < kill.at) {
      state.since = at
      // Lo que sale enseguida no llega a estar listo (no sirve nada mientras tanto).
      state.ready =
        outcome.kind === 'serve' && readyAt(env, pod, container, age, outcome.listenAfter)

      return state
    }

    // Esta instancia acabó: sale con su código o la mata una sonda.
    const died = at + kill.at
    const exit =
      outcome.kind === 'exit'
        ? {
            reason: outcome.reason === 'Completed' && outcome.code !== 0 ? 'Error' : outcome.reason,
            exitCode: outcome.code,
          }
        : { reason: 'Error', exitCode: 143 }

    state.last = { reason: exit.reason, exitCode: exit.exitCode, at: died }
    state.killedBy = kill.by
    if (!restarts) {
      state.state = 'terminated'
      state.reason = exit.reason
      state.exitCode = exit.exitCode
      state.since = at

      return state
    }

    const nextStart = died + backoff(n)

    if (env.now < nextStart) {
      state.state = 'waiting'
      state.reason = env.now - died < 5 && kill.by === null ? exit.reason : 'CrashLoopBackOff'
      state.message = `back-off ${backoff(n) >= 60 ? `${backoff(n) / 60}m0s` : `${backoff(n)}s`} restarting failed container=${container.name} pod=${pod.metadata.name}_${nsOf(pod)}(${pod.metadata.uid ?? ''})`
      state.since = at

      return state
    }
    state.restarts++
    at = nextStart
  }

  return state
}

/**
 * Lo calculado en este momento del reloj: una petición de la API mira la base
 * de datos, que mira sus Pods… y no hace falta repetirlo. Cada orden (y cada
 * paso del controlador) usa un `Env` nuevo, así que no se queda nada viejo.
 */
const memo = new WeakMap<Env, Map<string, PodRuntime>>()
const busy = new Set<string>()

/** Lo que hace el Pod ahora (sin cambiar nada: el controlador escribe lo que haga falta). */
export function runtimeOf(env: Env, pod: K8sObject): PodRuntime {
  const status = obj(pod.status)
  const key = JSON.stringify([
    pod.metadata.uid,
    pod.spec?.nodeName ?? null,
    status.startedAt ?? null,
    status.starts ?? null,
    status.bases ?? null,
    status.blocked ?? null,
  ])
  const known = memo.get(env)?.get(key)

  if (known !== undefined) return known
  // Una vuelta (la app que se pregunta a sí misma por la red): no está lista.
  if (busy.has(key))
    return {
      phase: 'Running',
      status: 'Running',
      ready: false,
      restarts: 0,
      containers: [],
      waiting: null,
      listening: false,
    }
  busy.add(key)
  try {
    const result = computeRuntime(env, pod)
    const cache = memo.get(env) ?? new Map<string, PodRuntime>()

    cache.set(key, result)
    memo.set(env, cache)

    return result
  } finally {
    busy.delete(key)
  }
}

function computeRuntime(env: Env, pod: K8sObject): PodRuntime {
  const spec = podSpecOf(pod.spec)
  const status = obj(pod.status)
  const node = str(pod.spec?.nodeName)
  const waiting = (reason: string, message: string, shown = reason): PodRuntime => ({
    phase: 'Pending',
    status: shown,
    ready: false,
    restarts: 0,
    containers: spec.containers.map((container) => ({
      name: container.name,
      image: container.image,
      state: 'waiting',
      reason,
      message,
      exitCode: 0,
      ready: false,
      restarts: 0,
      since: 0,
      last: null,
      killedBy: null,
      outcome: null,
    })),
    waiting: { reason, message },
    listening: false,
  })

  if (node === '') return waiting('Unschedulable', str(status.unschedulable), 'Pending')

  const started = status.startedAt

  if (typeof started !== 'number') {
    const blocked = obj(status.blocked)
    const reason = str(blocked.reason, 'ContainerCreating')
    const message = str(blocked.message)
    const created = pod.metadata.creationTimestamp ?? 0
    const shown = reason === 'ErrImagePull' && env.now - created >= 10 ? 'ImagePullBackOff' : reason

    return waiting(shown, message, reason === 'ErrImagePull' ? shown : str(blocked.shown, shown))
  }

  const outcomes = obj(status.outcomes)
  const bases = obj(status.bases)
  const starts = obj(status.starts)
  const containers = spec.containers.map((container) => {
    const outcome = outcomes[container.name] as unknown as Outcome | undefined

    return outcome === undefined
      ? timeline(
          env,
          pod,
          container,
          { kind: 'serve', listenAfter: 0, logs: [] },
          started,
          0,
          spec.restartPolicy,
        )
      : timeline(
          env,
          pod,
          container,
          outcome,
          num(starts[container.name], started),
          num(bases[container.name]),
          spec.restartPolicy,
        )
  })
  const restarts = containers.reduce((sum, c) => sum + c.restarts, 0)
  const ready = containers.length > 0 && containers.every((c) => c.ready)
  const terminated = containers.every((c) => c.state === 'terminated')
  const failed = containers.some((c) => c.state === 'terminated' && c.exitCode !== 0)
  const odd = containers.find((c) => c.state !== 'running')
  const phase: PodRuntime['phase'] = terminated ? (failed ? 'Failed' : 'Succeeded') : 'Running'
  const first = containers[0]

  return {
    phase,
    status:
      phase === 'Succeeded'
        ? 'Completed'
        : phase === 'Failed'
          ? (first?.reason ?? 'Error')
          : odd !== undefined
            ? odd.reason
            : 'Running',
    ready,
    restarts,
    containers,
    waiting: null,
    listening:
      first?.state === 'running' &&
      first.outcome?.kind === 'serve' &&
      env.now - first.since >= first.outcome.listenAfter,
  }
}

/** Uso de CPU (milicores) y memoria (bytes) de un Pod, para `top` y el HPA. */
export function usageOf(env: Env, pod: K8sObject, load: number): { cpu: number; memory: number } {
  const rt = runtimeOf(env, pod)

  return podSpecOf(pod.spec).containers.reduce(
    (sum, container, index) => {
      const image = imageInfo(container.image)

      if (image === undefined || rt.containers[index]?.state !== 'running') return sum

      return {
        cpu: sum.cpu + image.cpu + (index === 0 ? load : 0),
        memory: sum.memory + Math.min(image.memory, container.limits.memory ?? Infinity),
      }
    },
    { cpu: 0, memory: 0 },
  )
}

/** Los registros de un contenedor (`previous`: los de la instancia anterior). */
export function logsOf(
  env: Env,
  pod: K8sObject,
  name: string,
  previous: boolean,
): string[] | string {
  const rt = runtimeOf(env, pod)
  const container = rt.containers.find((each) => each.name === name)
  const init = obj(obj(pod.status).initLogs)[name]

  if (container === undefined) {
    if (init !== undefined) return arr(init).map((line) => str(line))

    return `error: container ${name} is not valid for pod ${pod.metadata.name}`
  }
  if (container.outcome === null)
    return `Error from server (BadRequest): container "${name}" in pod "${pod.metadata.name}" is waiting to start: ${container.reason === 'ContainerCreating' ? 'ContainerCreating' : 'trying and failing to pull image'}`
  if (previous && container.last === null)
    return `Error from server (BadRequest): previous terminated container "${name}" in pod "${pod.metadata.name}" not found`

  const lines = container.outcome.logs

  if (container.outcome.kind === 'serve' && previous && container.killedBy !== null)
    return [...lines.slice(0, -1), 'SIGTERM received, closing server']
  if (container.outcome.kind === 'serve' && !previous) {
    const image = imageInfo(container.image)
    const age = env.now - container.since

    if (age < container.outcome.listenAfter) return lines.slice(0, -1)
    if (image?.behaviour === 'api') {
      const vars = resolveEnv(
        env,
        nsOf(pod),
        podSpecOf(pod.spec).containers.find((c) => c.name === name) ?? emptyContainer(),
      ).vars
      const db = databaseUp(env, pod, vars)

      return db === null ? [...lines, 'db: connected'] : [...lines, `db: ${db}`]
    }
  }

  return lines
}
