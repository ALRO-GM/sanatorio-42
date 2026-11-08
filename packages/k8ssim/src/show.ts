/**
 * Cómo se ve cada objeto: las tablas de `kubectl get` (con `-o wide`,
 * `-A`, `--show-labels` y `-L`), el JSON público de `-o yaml`/`-o json`
 * (sin lo que el simulador apunta para sí) y los eventos, los guardados y
 * los que salen de cómo está cada Pod (BackOff, sondas que fallan).
 */

import { imageInfo } from './images.js'
import type { KindInfo } from './kinds.js'
import type { Json, JsonObject, K8sEvent, K8sObject } from './model.js'
import { endpointsOf, NODE_IPS, targetOf } from './net.js'
import { runtimeOf } from './runtime.js'
import { arr, num, obj, podSpecOf, str, strMap } from './spec.js'
import type { Env } from './store.js'
import { getObject, list, nsOf } from './store.js'
import { age, isoAt, suffix, table } from './util.js'

/** Lo que el simulador guarda en `status` para sí (no sale en `-o yaml`). */
const PRIVATE = new Set([
  'rolloutStart',
  'startedAt',
  'outcomes',
  'starts',
  'bases',
  'blocked',
  'initDone',
  'initLogs',
  'initFailures',
  'unschedulable',
])

const TIMES = new Set(['lastScaleTime', 'startTime', 'completionTime', 'startedAt'])

function fixTimes(value: Json): Json {
  if (Array.isArray(value)) return value.map(fixTimes)
  if (value === null || typeof value !== 'object') return value

  const out: JsonObject = {}

  for (const [key, item] of Object.entries(value))
    out[key] = TIMES.has(key) && typeof item === 'number' ? isoAt(item) : fixTimes(item)

  return out
}

/** El objeto tal como lo devuelve la API (`-o yaml`, `-o json`, `jsonpath`). */
export function publicJson(object: K8sObject): JsonObject {
  const copy = JSON.parse(JSON.stringify(object)) as K8sObject
  const meta = copy.metadata as unknown as JsonObject

  if (typeof copy.metadata.creationTimestamp === 'number')
    meta.creationTimestamp = isoAt(copy.metadata.creationTimestamp)
  if (copy.status !== undefined) {
    for (const key of PRIVATE) Reflect.deleteProperty(copy.status, key)
    copy.status = fixTimes(copy.status) as JsonObject
  }
  if (copy.kind === 'Pod' && Array.isArray(copy.status?.containerStatuses))
    copy.status.containerStatuses = fixTimes(copy.status.containerStatuses)

  const out = copy as unknown as JsonObject
  const ordered: JsonObject = { apiVersion: out.apiVersion ?? null, kind: out.kind ?? null }

  for (const key of [
    'metadata',
    'type',
    'data',
    'spec',
    'status',
    'imagePullSecrets',
    'automountServiceAccountToken',
  ])
    if (out[key] !== undefined) ordered[key] = out[key] ?? null
  if (copy.kind === 'Pod') {
    const statuses = arr(obj(ordered.status).containerStatuses).map((raw) => {
      const c = obj(raw)
      const running = obj(obj(c.state).running)

      return running.startedAt === undefined
        ? c
        : {
            ...c,
            state: {
              running: {
                startedAt:
                  typeof running.startedAt === 'number'
                    ? isoAt(running.startedAt)
                    : running.startedAt,
              },
            },
          }
    })

    if (statuses.length > 0)
      ordered.status = { ...obj(ordered.status), containerStatuses: statuses }
  }

  return ordered
}

const ageOf = (env: Env, object: K8sObject): string =>
  age(env.now - (object.metadata.creationTimestamp ?? 0))

const MODES: Record<string, string> = {
  ReadWriteOnce: 'RWO',
  ReadOnlyMany: 'ROX',
  ReadWriteMany: 'RWX',
  ReadWriteOncePod: 'RWOP',
}

const modes = (value: Json | undefined): string =>
  arr(value)
    .map((each) => MODES[str(each)] ?? str(each))
    .join(',')

function podRow(env: Env, pod: K8sObject, wide: boolean): string[] {
  const rt = runtimeOf(env, pod)
  const containers = podSpecOf(pod.spec).containers
  const ready = rt.containers.filter((c) => c.ready).length
  const last = rt.containers
    .map((c) => c.last?.at ?? -Infinity)
    .reduce((a, b) => Math.max(a, b), -Infinity)
  const restarts =
    rt.restarts > 0 && last > -Infinity
      ? `${rt.restarts} (${age(env.now - last)} ago)`
      : String(rt.restarts)
  const row = [
    pod.metadata.name,
    `${ready}/${containers.length}`,
    rt.status,
    restarts,
    ageOf(env, pod),
  ]

  return wide
    ? [
        ...row,
        str(pod.status?.podIP, '<none>'),
        str(pod.spec?.nodeName, '<none>'),
        '<none>',
        '<none>',
      ]
    : row
}

const images = (template: Json | undefined): [string, string] => {
  const containers = podSpecOf(obj(template).spec).containers

  return [containers.map((c) => c.name).join(','), containers.map((c) => c.image).join(',')]
}

const selectorText = (value: Json | undefined): string => {
  const sel = obj(value)
  const labels = Object.hasOwn(sel, 'matchLabels') ? strMap(sel.matchLabels) : strMap(sel)

  return (
    Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',') || '<none>'
  )
}

function servicePorts(svc: K8sObject): string {
  const ports = arr(svc.spec?.ports).map((each) => obj(each))

  return (
    ports
      .map(
        (p) =>
          `${num(p.port)}${p.nodePort === undefined ? '' : `:${num(p.nodePort)}`}/${str(p.protocol, 'TCP')}`,
      )
      .join(',') || '<none>'
  )
}

function jobStatus(job: K8sObject): string {
  const conditions = arr(obj(job.status).conditions).map((each) => str(obj(each).type))

  if (conditions.includes('Complete')) return 'Complete'
  if (conditions.includes('Failed')) return 'Failed'

  return 'Running'
}

/** Las columnas y la fila de un objeto en `kubectl get`. */
export function rowOf(
  env: Env,
  info: KindInfo,
  object: K8sObject,
  wide: boolean,
): { head: string[]; row: string[] } {
  const name = object.metadata.name
  const spec = obj(object.spec)
  const status = obj(object.status)
  const a = ageOf(env, object)

  switch (info.kind) {
    case 'Pod': {
      const head = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']

      return {
        head: wide ? [...head, 'IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : head,
        row: podRow(env, object, wide),
      }
    }
    case 'Deployment': {
      const wanted = num(spec.replicas, 1)
      const row = [
        name,
        `${num(status.readyReplicas)}/${wanted}`,
        String(num(status.updatedReplicas)),
        String(num(status.availableReplicas)),
        a,
      ]

      return {
        head: wide
          ? ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE', 'CONTAINERS', 'IMAGES', 'SELECTOR']
          : ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'],
        row: wide ? [...row, ...images(spec.template), selectorText(spec.selector)] : row,
      }
    }
    case 'ReplicaSet': {
      const row = [
        name,
        String(num(spec.replicas)),
        String(num(status.replicas)),
        String(num(status.readyReplicas)),
        a,
      ]

      return {
        head: wide
          ? ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE', 'CONTAINERS', 'IMAGES', 'SELECTOR']
          : ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE'],
        row: wide ? [...row, ...images(spec.template), selectorText(spec.selector)] : row,
      }
    }
    case 'StatefulSet':
      return {
        head: ['NAME', 'READY', 'AGE'],
        row: [name, `${num(status.readyReplicas)}/${num(spec.replicas, 1)}`, a],
      }
    case 'Job': {
      const start = num(status.startTime, env.now)
      const end = status.completionTime === undefined ? env.now : num(status.completionTime)

      return {
        head: ['NAME', 'STATUS', 'COMPLETIONS', 'DURATION', 'AGE'],
        row: [
          name,
          jobStatus(object),
          `${num(status.succeeded)}/${num(spec.completions, 1)}`,
          age(end - start),
          a,
        ],
      }
    }
    case 'CronJob':
      return {
        head: ['NAME', 'SCHEDULE', 'TIMEZONE', 'SUSPEND', 'ACTIVE', 'LAST SCHEDULE', 'AGE'],
        row: [
          name,
          str(spec.schedule),
          '<none>',
          spec.suspend === true ? 'True' : 'False',
          '0',
          '<none>',
          a,
        ],
      }
    case 'Service': {
      const type = str(spec.type, 'ClusterIP')
      const external = type === 'LoadBalancer' ? NODE_IPS.join(',') : '<none>'
      const row = [name, type, str(spec.clusterIP, '<none>'), external, servicePorts(object), a]

      return {
        head: wide
          ? ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE', 'SELECTOR']
          : ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'],
        row: wide ? [...row, selectorText(spec.selector)] : row,
      }
    }
    case 'Endpoints':
    case 'EndpointSlice': {
      const svc = getObject(
        env.cluster,
        'Service',
        nsOf(object),
        str(object.metadata.labels?.['kubernetes.io/service-name'], name),
      )
      const pods = svc === undefined ? [] : endpointsOf(env, svc).ready
      const ports = arr(svc?.spec?.ports).map((each) => obj(each))
      const targets = (pod: K8sObject) =>
        ports.map((p) => {
          const raw = p.targetPort ?? p.port ?? 0

          return targetOf(pod, typeof raw === 'number' ? raw : str(raw))
        })

      if (info.kind === 'Endpoints') {
        const all = pods.flatMap((pod) =>
          targets(pod).map((port) => `${str(pod.status?.podIP)}:${port}`),
        )

        return {
          head: ['NAME', 'ENDPOINTS', 'AGE'],
          row: [
            name,
            all.length === 0
              ? '<none>'
              : all.slice(0, 3).join(',') + (all.length > 3 ? ` + ${all.length - 3} more...` : ''),
            a,
          ],
        }
      }

      const first = pods[0]
      const portText =
        first === undefined
          ? ports.map((p) => str(p.targetPort ?? p.port)).join(',')
          : targets(first).join(',')

      return {
        head: ['NAME', 'ADDRESSTYPE', 'PORTS', 'ENDPOINTS', 'AGE'],
        row: [
          name,
          'IPv4',
          portText || '<unset>',
          pods.length === 0
            ? '<unset>'
            : pods
                .map((pod) => str(pod.status?.podIP))
                .slice(0, 3)
                .join(',') + (pods.length > 3 ? ` + ${pods.length - 3} more...` : ''),
          a,
        ],
      }
    }
    case 'ConfigMap':
      return {
        head: ['NAME', 'DATA', 'AGE'],
        row: [name, String(Object.keys(object.data ?? {}).length), a],
      }
    case 'Secret':
      return {
        head: ['NAME', 'TYPE', 'DATA', 'AGE'],
        row: [name, object.type ?? 'Opaque', String(Object.keys(object.data ?? {}).length), a],
      }
    case 'ServiceAccount':
      return { head: ['NAME', 'SECRETS', 'AGE'], row: [name, '0', a] }
    case 'PersistentVolumeClaim':
      return {
        head: [
          'NAME',
          'STATUS',
          'VOLUME',
          'CAPACITY',
          'ACCESS MODES',
          'STORAGECLASS',
          'VOLUMEATTRIBUTESCLASS',
          'AGE',
        ],
        row: [
          name,
          str(status.phase, 'Pending'),
          str(spec.volumeName),
          str(obj(status.capacity).storage),
          modes(status.accessModes),
          str(spec.storageClassName),
          '<unset>',
          a,
        ],
      }
    case 'PersistentVolume': {
      const claim = obj(spec.claimRef)

      return {
        head: [
          'NAME',
          'CAPACITY',
          'ACCESS MODES',
          'RECLAIM POLICY',
          'STATUS',
          'CLAIM',
          'STORAGECLASS',
          'VOLUMEATTRIBUTESCLASS',
          'REASON',
          'AGE',
        ],
        row: [
          name,
          str(obj(spec.capacity).storage),
          modes(spec.accessModes),
          str(spec.persistentVolumeReclaimPolicy, 'Delete'),
          str(status.phase, 'Bound'),
          `${str(claim.namespace)}/${str(claim.name)}`,
          str(spec.storageClassName),
          '<unset>',
          '',
          a,
        ],
      }
    }
    case 'StorageClass': {
      const isDefault =
        object.metadata.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true'

      return {
        head: [
          'NAME',
          'PROVISIONER',
          'RECLAIMPOLICY',
          'VOLUMEBINDINGMODE',
          'ALLOWVOLUMEEXPANSION',
          'AGE',
        ],
        row: [
          `${name}${isDefault ? ' (default)' : ''}`,
          str(spec.provisioner),
          str(spec.reclaimPolicy, 'Delete'),
          str(spec.volumeBindingMode, 'Immediate'),
          'false',
          a,
        ],
      }
    }
    case 'Ingress': {
      const hosts =
        [...new Set(arr(spec.rules).map((rule) => str(obj(rule).host, '*')))].join(',') || '*'
      const served = str(spec.ingressClassName, 'traefik') === 'traefik'

      return {
        head: ['NAME', 'CLASS', 'HOSTS', 'ADDRESS', 'PORTS', 'AGE'],
        row: [
          name,
          str(spec.ingressClassName, '<none>'),
          hosts,
          served ? NODE_IPS.join(',') : '',
          arr(spec.tls).length > 0 ? '80, 443' : '80',
          a,
        ],
      }
    }
    case 'IngressClass':
      return {
        head: ['NAME', 'CONTROLLER', 'PARAMETERS', 'AGE'],
        row: [name, str(spec.controller), '<none>', a],
      }
    case 'NetworkPolicy':
      return {
        head: ['NAME', 'POD-SELECTOR', 'AGE'],
        row: [
          name,
          selectorText(spec.podSelector) === '<none>' ? '<none>' : selectorText(spec.podSelector),
          a,
        ],
      }
    case 'HorizontalPodAutoscaler': {
      const ref = obj(spec.scaleTargetRef)
      const goal = num(obj(obj(obj(arr(spec.metrics)[0]).resource).target).averageUtilization, 80)
      const current = obj(
        obj(obj(arr(status.currentMetrics)[0]).resource).current,
      ).averageUtilization

      return {
        head: ['NAME', 'REFERENCE', 'TARGETS', 'MINPODS', 'MAXPODS', 'REPLICAS', 'AGE'],
        row: [
          name,
          `${str(ref.kind, 'Deployment')}/${str(ref.name)}`,
          `cpu: ${current === undefined ? '<unknown>' : `${num(current)}%`}/${goal}%`,
          String(num(spec.minReplicas, 1)),
          String(num(spec.maxReplicas)),
          String(num(status.currentReplicas)),
          a,
        ],
      }
    }
    case 'Namespace':
      return { head: ['NAME', 'STATUS', 'AGE'], row: [name, 'Active', a] }
    case 'Node': {
      const labels = strMap(object.metadata.labels)
      const roles =
        labels['node-role.kubernetes.io/control-plane'] === 'true'
          ? 'control-plane,master'
          : '<none>'
      const row = [
        name,
        spec.unschedulable === true ? 'Ready,SchedulingDisabled' : 'Ready',
        roles,
        a,
        str(obj(status.nodeInfo).kubeletVersion),
      ]

      return {
        head: wide
          ? [
              'NAME',
              'STATUS',
              'ROLES',
              'AGE',
              'VERSION',
              'INTERNAL-IP',
              'EXTERNAL-IP',
              'OS-IMAGE',
              'KERNEL-VERSION',
              'CONTAINER-RUNTIME',
            ]
          : ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'],
        row: wide
          ? [
              ...row,
              str(obj(arr(status.addresses)[0]).address),
              '<none>',
              str(obj(status.nodeInfo).osImage),
              '6.8.0-45-generic',
              str(obj(status.nodeInfo).containerRuntimeVersion),
            ]
          : row,
      }
    }
    default:
      return { head: ['NAME', 'AGE'], row: [name, a] }
  }
}

/** Los objetos que se calculan al vuelo: un Endpoints y un EndpointSlice por Service. */
export function derived(env: Env, kind: string, ns: string | null): K8sObject[] {
  return list(env.cluster, 'Service', ns)
    .filter((svc) => Object.keys(strMap(svc.spec?.selector)).length > 0)
    .map((svc) => ({
      apiVersion: kind === 'Endpoints' ? 'v1' : 'discovery.k8s.io/v1',
      kind,
      metadata: {
        name:
          kind === 'Endpoints'
            ? svc.metadata.name
            : `${svc.metadata.name}-${suffix(svc.metadata.uid ?? '', 5)}`,
        namespace: nsOf(svc),
        labels: { 'kubernetes.io/service-name': svc.metadata.name },
        creationTimestamp: svc.metadata.creationTimestamp ?? 0,
      },
      ...(kind === 'EndpointSlice'
        ? {
            spec: {
              endpoints: endpointsOf(env, svc).ready.map((pod) => ({
                addresses: [str(pod.status?.podIP)],
                conditions: { ready: true },
                targetRef: { kind: 'Pod', name: pod.metadata.name },
              })),
            },
          }
        : {}),
    }))
}

/** Lo que dice un Pod de sí mismo como eventos (además de los guardados). */
export function podEvents(env: Env, pod: K8sObject): K8sEvent[] {
  const rt = runtimeOf(env, pod)
  const ns = nsOf(pod)
  const object = `Pod/${pod.metadata.name}`
  const out: K8sEvent[] = []
  const spec = podSpecOf(pod.spec)

  rt.containers.forEach((c, index) => {
    const container = spec.containers[index]
    const at = c.last?.at ?? env.now

    if (container === undefined) return
    if (c.reason === 'ImagePullBackOff')
      out.push({
        t: env.now,
        ns,
        object,
        type: 'Normal',
        reason: 'BackOff',
        message: `Back-off pulling image "${container.image}"`,
        count: Math.max(1, Math.floor((env.now - (pod.metadata.creationTimestamp ?? 0)) / 10)),
      })
    if (c.reason === 'CrashLoopBackOff' || (c.state === 'waiting' && c.last !== null))
      out.push({
        t: env.now,
        ns,
        object,
        type: 'Warning',
        reason: 'BackOff',
        message: `Back-off restarting failed container ${c.name} in pod ${pod.metadata.name}_${ns}(${pod.metadata.uid ?? ''})`,
        count: Math.max(1, c.restarts),
      })

    const image = imageInfo(container.image)
    const ip = str(pod.status?.podIP)
    const failure = (probe: NonNullable<typeof container.liveness>): string => {
      const port =
        typeof probe.port === 'number'
          ? probe.port
          : (container.ports.find((p) => p.name === probe.port)?.containerPort ?? 0)

      if (probe.kind === 'http')
        return image?.port === port && rt.listening
          ? `HTTP probe failed with statuscode: 503`
          : `Get "http://${ip}:${port}${probe.path}": dial tcp ${ip}:${port}: connect: connection refused`

      return probe.kind === 'tcp'
        ? `dial tcp ${ip}:${port}: connect: connection refused`
        : 'command failed'
    }

    if (c.killedBy !== null) {
      const probe = c.killedBy === 'liveness' ? container.liveness : container.startup

      if (probe !== null) {
        out.push({
          t: at,
          ns,
          object,
          type: 'Warning',
          reason: 'Unhealthy',
          message: `${c.killedBy === 'liveness' ? 'Liveness' : 'Startup'} probe failed: ${failure(probe)}`,
          count: Math.max(1, c.restarts) * probe.failure,
        })
        out.push({
          t: at,
          ns,
          object,
          type: 'Normal',
          reason: 'Killing',
          message: `Container ${c.name} failed ${c.killedBy} probe, will be restarted`,
          count: Math.max(1, c.restarts),
        })
      }
    }
    if (c.state === 'running' && !c.ready && container.readiness !== null)
      out.push({
        t: env.now,
        ns,
        object,
        type: 'Warning',
        reason: 'Unhealthy',
        message: `Readiness probe failed: ${failure(container.readiness)}`,
        count: Math.max(1, Math.floor((env.now - c.since) / container.readiness.period)),
      })
  })

  return out
}

/** Todos los eventos de un namespace (o de todos), del más viejo al más nuevo. */
export function eventsIn(env: Env, ns: string | null): K8sEvent[] {
  const stored = env.cluster.events.filter((e) => ns === null || e.ns === ns)
  const live = list(env.cluster, 'Pod', ns).flatMap((pod) => podEvents(env, pod))

  return [...stored, ...live].sort((a, b) => a.t - b.t)
}

export function eventsTable(env: Env, events: readonly K8sEvent[], all: boolean): string {
  const head = ['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']
  const rows = events.map((e) => {
    const [kind = '', name = ''] = e.object.split('/')
    const row = [age(env.now - e.t), e.type, e.reason, `${kind.toLowerCase()}/${name}`, e.message]

    return all ? [e.ns, ...row] : row
  })

  return table(all ? ['NAMESPACE', ...head] : head, rows)
}
