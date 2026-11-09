/**
 * Los controladores: lo que hace que el clúster vaya solo hacia lo que pide
 * cada objeto. Deployment → ReplicaSet (uno por plantilla, con su revisión) →
 * Pods, con el rolling update de `maxSurge`/`maxUnavailable`; StatefulSet con
 * sus Pods en orden y sus PVC; Job; HPA; enlazar PVC; planificar cada Pod en
 * un nodo con sitio y arrancarlo cuando tiene imagen, configuración y sus
 * init listos. Se ejecutan a pasos de unos segundos de reloj (`sync`), para
 * que un rolling update espere a que los Pods nuevos estén listos.
 */

import type { World } from '@sanatorio/shellsim'

import { LIMITS } from './limits.js'
import type { Cluster, JsonObject, K8sObject, K8sState } from './model.js'
import { clockOf, k8sOf } from './model.js'
import { endpointsOf } from './net.js'
import { waitsFor } from './podsh.js'
import type { Outcome } from './runtime.js'
import {
  commandOf,
  endedLogs,
  outcomeOf,
  pullError,
  resolveEnv,
  runtimeOf,
  START_DELAY,
  uidIn,
  usageOf,
} from './runtime.js'
import { imageInfo } from './images.js'
import { arr, matches, num, obj, podSpecOf, str, strMap } from './spec.js'
import type { Env } from './store.js'
import {
  emit,
  getObject,
  labelsOf,
  list,
  next,
  nsOf,
  ownedBy,
  ownerRef,
  put,
  remove,
} from './store.js'
import { bytesOf, milliCpu, suffix } from './util.js'

/** Cuántas vueltas da cada paso como mucho (crear el ReplicaSet, sus Pods, planificarlos…). */
const ROUNDS = 6

let changes = 0

/** Cambia el `status` de un objeto solo si es distinto (y cuenta el cambio). */
function setStatus(object: K8sObject, status: JsonObject): void {
  if (JSON.stringify(object.status ?? {}) !== JSON.stringify(status)) {
    object.status = status
    changes++
  }
}

function create(env: Env, object: K8sObject): K8sObject {
  changes++

  return put(env.cluster, object, env.now)
}

function destroy(env: Env, object: K8sObject): void {
  changes++
  remove(env.cluster, object)
  if (object.kind === 'Pod') {
    const uid = object.metadata.uid ?? ''

    for (const key of Object.keys(env.cluster.store))
      if (key.startsWith(`layer:${uid}:`) || key.startsWith(`empty:${uid}:`))
        Reflect.deleteProperty(env.cluster.store, key)
  }
}

/** Un `maxSurge`/`maxUnavailable` (número o porcentaje) sobre unas réplicas. */
function amount(value: unknown, replicas: number, up: boolean): number {
  if (typeof value === 'number') return value

  const text = typeof value === 'string' ? value : '25%'
  const percent = /^(\d+)%$/.exec(text)

  if (percent === null) return Number(text) || 0

  const exact = (replicas * Number(percent[1])) / 100

  return up ? Math.ceil(exact) : Math.floor(exact)
}

const replicasOf = (object: K8sObject, fallback = 1): number =>
  Math.min(LIMITS.replicas, Math.max(0, num(object.spec?.replicas, fallback)))

export const revisionOf = (rs: K8sObject): number =>
  Number(rs.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? 0)

/** Un Pod nuevo a partir de una plantilla. */
function podFrom(
  env: Env,
  owner: K8sObject,
  template: JsonObject,
  name: string,
  extra: Record<string, string> = {},
): K8sObject {
  const meta = obj(template.metadata)

  return create(env, {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name,
      namespace: nsOf(owner),
      labels: { ...strMap(meta.labels), ...extra },
      ...(Object.keys(strMap(meta.annotations)).length > 0
        ? { annotations: strMap(meta.annotations) }
        : {}),
      ownerReferences: [ownerRef(owner)],
    },
    spec: JSON.parse(JSON.stringify(obj(template.spec))) as JsonObject,
    status: { phase: 'Pending' },
  })
}

const isDone = (env: Env, pod: K8sObject): boolean => {
  const phase = runtimeOf(env, pod).phase

  return phase === 'Succeeded' || phase === 'Failed'
}

function syncReplicaSet(env: Env, rs: K8sObject): void {
  const ns = nsOf(rs)
  const selector = obj(rs.spec?.selector)
  const wanted = replicasOf(rs)
  const pods = list(env.cluster, 'Pod', ns)
  const mine: K8sObject[] = []

  for (const pod of pods) {
    const fits = matches(selector, labelsOf(pod))
    const owned = ownedBy(pod, rs)

    if (owned && !fits) {
      // Le quitaron la etiqueta: el ReplicaSet lo suelta y crea otro.
      pod.metadata.ownerReferences = []
      changes++
    } else if (fits && (owned || (pod.metadata.ownerReferences ?? []).length === 0)) {
      if (!owned) {
        pod.metadata.ownerReferences = [ownerRef(rs)]
        changes++
      }
      mine.push(pod)
    }
  }

  const active = mine.filter((pod) => !isDone(env, pod))

  for (let i = active.length; i < wanted; i++)
    podFrom(
      env,
      rs,
      obj(rs.spec?.template),
      `${rs.metadata.name}-${suffix(`${rs.metadata.uid ?? ''}#${next(env.cluster)}`, 5)}`,
    )
  if (active.length > wanted) {
    const order = [...active].sort((a, b) => {
      const ra = runtimeOf(env, a)
      const rb = runtimeOf(env, b)

      if (ra.ready !== rb.ready) return ra.ready ? 1 : -1

      return (b.metadata.creationTimestamp ?? 0) - (a.metadata.creationTimestamp ?? 0)
    })

    for (const pod of order.slice(0, active.length - wanted)) {
      destroy(env, pod)
      emit(
        env.cluster,
        env.now,
        ns,
        `ReplicaSet/${rs.metadata.name}`,
        'Normal',
        'SuccessfulDelete',
        `Deleted pod: ${pod.metadata.name}`,
      )
    }
  }

  const current = mine.filter(
    (pod) =>
      getObject(env.cluster, 'Pod', ns, pod.metadata.name) !== undefined && !isDone(env, pod),
  )
  const ready = current.filter((pod) => runtimeOf(env, pod).ready).length

  setStatus(rs, {
    replicas: current.length,
    fullyLabeledReplicas: current.length,
    readyReplicas: ready,
    availableReplicas: ready,
    observedGeneration: rs.metadata.generation ?? 1,
  })
}

/** Los Pods de un ReplicaSet (vivos). */
function podsOf(env: Env, owner: K8sObject): K8sObject[] {
  return list(env.cluster, 'Pod', nsOf(owner)).filter((pod) => ownedBy(pod, owner))
}

function syncDeployment(env: Env, d: K8sObject): void {
  const ns = nsOf(d)
  const spec = obj(d.spec)
  const wanted = replicasOf(d)
  const template = obj(spec.template)
  const hash = suffix(JSON.stringify(template), 10)
  const sets = list(env.cluster, 'ReplicaSet', ns).filter((rs) => ownedBy(rs, d))
  const top = Math.max(0, ...sets.map(revisionOf))
  let fresh = sets.find((rs) => rs.metadata.labels?.['pod-template-hash'] === hash)
  const cause = d.metadata.annotations?.['kubernetes.io/change-cause']

  if (fresh === undefined) {
    const meta = obj(template.metadata)
    const labels = { ...strMap(meta.labels), 'pod-template-hash': hash }

    fresh = create(env, {
      apiVersion: 'apps/v1',
      kind: 'ReplicaSet',
      metadata: {
        name: `${d.metadata.name}-${hash}`,
        namespace: ns,
        labels,
        annotations: {
          'deployment.kubernetes.io/revision': String(top + 1),
          ...(cause === undefined ? {} : { 'kubernetes.io/change-cause': cause }),
        },
        ownerReferences: [ownerRef(d)],
      },
      spec: {
        replicas: 0,
        selector: {
          matchLabels: { ...strMap(obj(spec.selector).matchLabels), 'pod-template-hash': hash },
        },
        template: { ...template, metadata: { ...meta, labels } },
      },
    })
    emit(
      env.cluster,
      env.now,
      ns,
      `Deployment/${d.metadata.name}`,
      'Normal',
      'ScalingReplicaSet',
      `Scaled up replica set ${fresh.metadata.name} from 0 to 1`,
    )
    d.status = { ...obj(d.status), rolloutStart: env.now }
  } else if (revisionOf(fresh) < top) {
    // Volver a una plantilla vieja (`rollout undo`): esa revisión pasa a ser la última.
    fresh.metadata.annotations = {
      ...fresh.metadata.annotations,
      'deployment.kubernetes.io/revision': String(top + 1),
      ...(cause === undefined ? {} : { 'kubernetes.io/change-cause': cause }),
    }
    d.status = { ...obj(d.status), rolloutStart: env.now }
    changes++
  } else if (
    cause !== undefined &&
    fresh.metadata.annotations?.['kubernetes.io/change-cause'] !== cause
  ) {
    fresh.metadata.annotations = {
      ...fresh.metadata.annotations,
      'kubernetes.io/change-cause': cause,
    }
    changes++
  }

  const olds = sets.filter((rs) => rs !== fresh)
  const total = (): number => [fresh, ...olds].reduce((sum, rs) => sum + replicasOf(rs, 0), 0)
  const scale = (rs: K8sObject, n: number) => {
    if (replicasOf(rs, 0) !== n) {
      const before = replicasOf(rs, 0)

      rs.spec = { ...obj(rs.spec), replicas: n }
      changes++
      emit(
        env.cluster,
        env.now,
        ns,
        `Deployment/${d.metadata.name}`,
        'Normal',
        'ScalingReplicaSet',
        `Scaled ${n > before ? 'up' : 'down'} replica set ${rs.metadata.name} from ${before} to ${n}`,
      )
    }
  }

  if (spec.paused !== true) {
    const strategy = obj(spec.strategy)

    if (str(strategy.type) === 'Recreate') {
      for (const rs of olds) scale(rs, 0)
      if (olds.every((rs) => podsOf(env, rs).length === 0)) scale(fresh, wanted)
    } else {
      const rolling = obj(strategy.rollingUpdate)
      let surge = amount(rolling.maxSurge, wanted, true)
      const unavailable = amount(rolling.maxUnavailable, wanted, false)

      if (surge === 0 && unavailable === 0) surge = 1
      if (replicasOf(fresh, 0) > wanted) scale(fresh, wanted)
      if (replicasOf(fresh, 0) < wanted) {
        const room = wanted + surge - total()

        if (room > 0) scale(fresh, Math.min(wanted, replicasOf(fresh, 0) + room))
      }

      const freshPods = podsOf(env, fresh)
      const freshReady = freshPods.filter((pod) => runtimeOf(env, pod).ready).length
      const freshUnavailable = Math.max(0, replicasOf(fresh, 0) - freshReady)
      let budget = total() - (wanted - unavailable) - freshUnavailable

      // Los Pods viejos que no están listos se pueden quitar sin gastar del margen.
      for (const rs of olds) {
        const notReady = podsOf(env, rs).filter((pod) => !runtimeOf(env, pod).ready).length
        const n = Math.min(notReady, replicasOf(rs, 0))

        if (n > 0) scale(rs, replicasOf(rs, 0) - n)
      }
      for (const rs of [...olds].sort((a, b) => revisionOf(a) - revisionOf(b))) {
        if (budget <= 0) break

        const n = Math.min(budget, replicasOf(rs, 0))

        if (n > 0) {
          scale(rs, replicasOf(rs, 0) - n)
          budget -= n
        }
      }
    }
  }

  // Se guardan como mucho `revisionHistoryLimit` ReplicaSets viejos (vacíos).
  const limit = num(spec.revisionHistoryLimit, 10)
  const empty = olds.filter((rs) => replicasOf(rs, 0) === 0 && podsOf(env, rs).length === 0)

  for (const rs of empty
    .sort((a, b) => revisionOf(a) - revisionOf(b))
    .slice(0, Math.max(0, empty.length - limit)))
    destroy(env, rs)

  const all = [fresh, ...olds].flatMap((rs) => podsOf(env, rs)).filter((pod) => !isDone(env, pod))
  const updated = podsOf(env, fresh).filter((pod) => !isDone(env, pod))
  const ready = all.filter((pod) => runtimeOf(env, pod).ready).length
  const updatedReady = updated.filter((pod) => runtimeOf(env, pod).ready).length
  const complete = updated.length === wanted && updatedReady === wanted && all.length === wanted
  const status = obj(d.status)
  const started = num(status.rolloutStart, d.metadata.creationTimestamp ?? 0)
  const deadline = num(spec.progressDeadlineSeconds, 600)

  setStatus(d, {
    ...(status.rolloutStart === undefined ? {} : { rolloutStart: status.rolloutStart }),
    observedGeneration: d.metadata.generation ?? 1,
    replicas: all.length,
    updatedReplicas: updated.length,
    readyReplicas: ready,
    availableReplicas: ready,
    ...(all.length - ready > 0 ? { unavailableReplicas: all.length - ready } : {}),
    conditions: [
      {
        type: 'Available',
        status:
          ready >=
          wanted - amount(obj(obj(spec.strategy).rollingUpdate).maxUnavailable, wanted, false)
            ? 'True'
            : 'False',
        reason: ready >= wanted ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable',
      },
      complete
        ? {
            type: 'Progressing',
            status: 'True',
            reason: 'NewReplicaSetAvailable',
            message: `ReplicaSet "${fresh.metadata.name}" has successfully progressed.`,
          }
        : env.now - started > deadline
          ? {
              type: 'Progressing',
              status: 'False',
              reason: 'ProgressDeadlineExceeded',
              message: `ReplicaSet "${fresh.metadata.name}" has timed out progressing.`,
            }
          : {
              type: 'Progressing',
              status: 'True',
              reason: 'ReplicaSetUpdated',
              message: `ReplicaSet "${fresh.metadata.name}" is progressing.`,
            },
    ],
  })
}

function syncStatefulSet(env: Env, sts: K8sObject): void {
  const ns = nsOf(sts)
  const spec = obj(sts.spec)
  const wanted = replicasOf(sts)
  const template = obj(spec.template)
  const revision = `${sts.metadata.name}-${suffix(JSON.stringify(template), 10)}`
  const claims = arr(spec.volumeClaimTemplates).map((each) => obj(each))
  const name = (i: number) => `${sts.metadata.name}-${i}`
  const pods = podsOf(env, sts)
  const ready = (i: number) => {
    const pod = getObject(env.cluster, 'Pod', ns, name(i))

    return pod !== undefined && runtimeOf(env, pod).ready
  }

  for (let i = 0; i < wanted; i++) {
    if (getObject(env.cluster, 'Pod', ns, name(i)) !== undefined) continue
    if (i > 0 && !ready(i - 1)) break

    const volumes = arr(obj(template.spec).volumes)

    for (const claim of claims) {
      const meta = obj(claim.metadata)
      const pvc = `${str(meta.name)}-${name(i)}`

      if (getObject(env.cluster, 'PersistentVolumeClaim', ns, pvc) === undefined)
        create(env, {
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: pvc,
            namespace: ns,
            labels: strMap(obj(obj(template.metadata).labels)),
          },
          spec: JSON.parse(JSON.stringify(obj(claim.spec))) as JsonObject,
          status: { phase: 'Pending' },
        })
      volumes.push({ name: str(meta.name), persistentVolumeClaim: { claimName: pvc } })
    }

    const pod = podFrom(
      env,
      sts,
      {
        ...template,
        spec: {
          ...obj(template.spec),
          volumes,
          hostname: name(i),
          subdomain: str(spec.serviceName),
        },
      },
      name(i),
      {
        'statefulset.kubernetes.io/pod-name': name(i),
        'controller-revision-hash': revision,
        'apps.kubernetes.io/pod-index': String(i),
      },
    )

    emit(
      env.cluster,
      env.now,
      ns,
      `StatefulSet/${sts.metadata.name}`,
      'Normal',
      'SuccessfulCreate',
      `create Pod ${pod.metadata.name} in StatefulSet ${sts.metadata.name} successful`,
    )
    break
  }

  // Sobran: se borra el de número más alto (de uno en uno).
  const extra = pods
    .map((pod) => Number(pod.metadata.name.slice(sts.metadata.name.length + 1)))
    .filter((i) => i >= wanted)
    .sort((a, b) => b - a)[0]

  if (extra !== undefined) {
    const pod = getObject(env.cluster, 'Pod', ns, name(extra))

    if (pod !== undefined) destroy(env, pod)
  } else {
    // Plantilla nueva: se cambia de uno en uno, del más alto al más bajo, si los demás están listos.
    const stale = pods
      .filter((pod) => pod.metadata.labels?.['controller-revision-hash'] !== revision)
      .sort((a, b) => b.metadata.name.localeCompare(a.metadata.name))[0]

    if (stale !== undefined && pods.every((pod) => pod === stale || runtimeOf(env, pod).ready))
      destroy(env, stale)
  }

  const live = podsOf(env, sts)

  setStatus(sts, {
    replicas: live.length,
    readyReplicas: live.filter((pod) => runtimeOf(env, pod).ready).length,
    currentReplicas: live.length,
    updatedReplicas: live.filter(
      (pod) => pod.metadata.labels?.['controller-revision-hash'] === revision,
    ).length,
    currentRevision: revision,
    updateRevision: revision,
  })
}

function syncJob(env: Env, job: K8sObject): void {
  const spec = obj(job.spec)
  const completions = Math.max(1, num(spec.completions, 1))
  const backoffLimit = num(spec.backoffLimit, 6)
  const pods = podsOf(env, job)
  const status = obj(job.status)
  const phases = pods.map((pod) => ({ pod, rt: runtimeOf(env, pod) }))
  const succeeded = phases.filter((each) => each.rt.phase === 'Succeeded').length
  const failed =
    phases.filter((each) => each.rt.phase === 'Failed').length +
    phases.reduce((sum, each) => sum + each.rt.restarts, 0)
  const active = phases.filter(
    (each) => each.rt.phase === 'Pending' || each.rt.phase === 'Running',
  ).length
  const start = num(status.startTime, env.now)
  const finished = arr(status.conditions).length > 0

  if (!finished && succeeded < completions && failed <= backoffLimit && active === 0) {
    const template = obj(spec.template)
    const meta = obj(template.metadata)
    const labels = {
      ...strMap(meta.labels),
      'batch.kubernetes.io/job-name': job.metadata.name,
      'job-name': job.metadata.name,
    }

    podFrom(
      env,
      job,
      { ...template, metadata: { ...meta, labels } },
      `${job.metadata.name}-${suffix(`${job.metadata.uid ?? ''}#${next(env.cluster)}`, 5)}`,
    )
    emit(
      env.cluster,
      env.now,
      nsOf(job),
      `Job/${job.metadata.name}`,
      'Normal',
      'SuccessfulCreate',
      `Created pod: ${job.metadata.name}`,
    )
  }

  const out: JsonObject = {
    startTime: start,
    active,
    succeeded,
    failed: Math.min(failed, backoffLimit + 1),
    ready: 0,
  }

  if (finished) out.conditions = arr(status.conditions)
  if (finished && status.completionTime !== undefined) out.completionTime = status.completionTime
  if (!finished && succeeded >= completions) {
    out.completionTime = env.now
    out.conditions = [{ type: 'Complete', status: 'True' }]
    emit(
      env.cluster,
      env.now,
      nsOf(job),
      `Job/${job.metadata.name}`,
      'Normal',
      'Completed',
      'Job completed',
    )
  } else if (!finished && failed > backoffLimit) {
    out.conditions = [
      {
        type: 'Failed',
        status: 'True',
        reason: 'BackoffLimitExceeded',
        message: 'Job has reached the specified backoff limit',
      },
    ]
    emit(
      env.cluster,
      env.now,
      nsOf(job),
      `Job/${job.metadata.name}`,
      'Warning',
      'BackoffLimitExceeded',
      'Job has reached the specified backoff limit',
    )
  }
  setStatus(job, out)
}

/** La carga que generan los Pods de prueba (`while true; do wget api…`) contra un Deployment. */
export function loadOn(env: Env, target: K8sObject): number {
  const ns = nsOf(target)
  const selector = obj(obj(obj(target.spec).template).metadata).labels
  let load = 0

  for (const pod of list(env.cluster, 'Pod', null)) {
    const text = (podSpecOf(pod.spec).containers[0]?.command ?? [])
      .concat(podSpecOf(pod.spec).containers[0]?.args ?? [])
      .join(' ')
    const host = /while\s+true.*?(?:wget|curl)\s+(?:-\S+\s+)*(?:https?:\/\/)?([a-z0-9.-]+)/.exec(
      text,
    )?.[1]

    if (host === undefined || runtimeOf(env, pod).phase !== 'Running') continue

    const name = host.split('.')[0] ?? ''
    const inNs = host.split('.')[1] ?? nsOf(pod)
    const svc = getObject(env.cluster, 'Service', inNs, name)

    if (svc !== undefined && inNs === ns && matches(strMap(svc.spec?.selector), strMap(selector)))
      load += 600
  }

  return load
}

function syncHpa(env: Env, hpa: K8sObject): void {
  const spec = obj(hpa.spec)
  const ref = obj(spec.scaleTargetRef)
  const target = getObject(env.cluster, str(ref.kind, 'Deployment'), nsOf(hpa), str(ref.name))
  const min = Math.max(1, num(spec.minReplicas, 1))
  const max = Math.min(LIMITS.replicas, num(spec.maxReplicas, min))
  const metric = obj(obj(obj(arr(spec.metrics)[0]).resource).target)
  const goal = num(metric.averageUtilization, num(spec.targetCPUUtilizationPercentage, 80))
  const status = obj(hpa.status)

  if (target === undefined) {
    setStatus(hpa, {
      currentReplicas: 0,
      desiredReplicas: 0,
      conditions: [{ type: 'AbleToScale', status: 'False', reason: 'FailedGetScale' }],
    })

    return
  }

  const request = podSpecOf(obj(obj(target.spec).template).spec).containers[0]?.requests.cpu ?? null
  const current = replicasOf(target)
  const selector = strMap(obj(obj(target.spec).selector).matchLabels)
  const pods = list(env.cluster, 'Pod', nsOf(target)).filter(
    (pod) => matches(selector, labelsOf(pod)) && runtimeOf(env, pod).ready,
  )

  if (request === null || request === 0 || pods.length === 0) {
    setStatus(hpa, {
      currentReplicas: current,
      desiredReplicas: current,
      conditions: [
        {
          type: 'ScalingActive',
          status: 'False',
          reason: 'FailedGetResourceMetric',
          message:
            request === null
              ? 'the HPA was unable to compute the replica count: failed to get cpu utilization: missing request for cpu in container'
              : 'no pods ready',
        },
      ],
    })

    return
  }

  const load = loadOn(env, target)
  const used = pods.reduce((sum, pod) => sum + usageOf(env, pod, 0).cpu, 0) + load
  const utilization = Math.round((used / pods.length / request) * 100)
  let desired = Math.min(max, Math.max(min, Math.ceil(used / ((request * goal) / 100))))
  const last = num(status.lastScaleTime, -1e9)

  // Bajar espera 5 minutos sin carga (la ventana de estabilización de verdad).
  if (desired < current && env.now - last < 300) desired = current
  if (desired !== current) {
    target.spec = { ...obj(target.spec), replicas: desired }
    changes++
    emit(
      env.cluster,
      env.now,
      nsOf(hpa),
      `HorizontalPodAutoscaler/${hpa.metadata.name}`,
      'Normal',
      'SuccessfulRescale',
      `New size: ${desired}; reason: cpu resource utilization (percentage of request) ${desired > current ? 'above' : 'below'} target`,
    )
  }
  setStatus(hpa, {
    currentReplicas: current,
    desiredReplicas: desired,
    lastScaleTime: desired !== current ? env.now : last,
    currentMetrics: [
      { type: 'Resource', resource: { name: 'cpu', current: { averageUtilization: utilization } } },
    ],
    conditions: [{ type: 'ScalingActive', status: 'True', reason: 'ValidMetricFound' }],
  })
}

/** Enlaza un PVC a un volumen nuevo (el aprovisionador `local-path` de k3s). */
function bind(env: Env, pvc: K8sObject): void {
  const ns = nsOf(pvc)
  const cls = str(pvc.spec?.storageClassName, 'local-path')
  const storage = str(obj(obj(pvc.spec?.resources).requests).storage, '1Gi')
  const pv = `pvc-${(pvc.metadata.uid ?? '').slice(0, 8)}-${suffix(pvc.metadata.uid ?? '', 4)}`

  create(env, {
    apiVersion: 'v1',
    kind: 'PersistentVolume',
    metadata: { name: pv },
    spec: {
      capacity: { storage },
      accessModes: arr(pvc.spec?.accessModes),
      persistentVolumeReclaimPolicy: 'Delete',
      storageClassName: cls,
      claimRef: { namespace: ns, name: pvc.metadata.name },
    },
    status: { phase: 'Bound' },
  })
  pvc.spec = { ...obj(pvc.spec), volumeName: pv, storageClassName: cls }
  setStatus(pvc, { phase: 'Bound', capacity: { storage }, accessModes: arr(pvc.spec.accessModes) })
  emit(
    env.cluster,
    env.now,
    ns,
    `PersistentVolumeClaim/${pvc.metadata.name}`,
    'Normal',
    'ProvisioningSucceeded',
    `Successfully provisioned volume ${pv}`,
  )
}

/** Los recursos pedidos por un Pod (milicores y bytes). */
export function requestsOf(pod: K8sObject): { cpu: number; memory: number } {
  return podSpecOf(pod.spec).containers.reduce(
    (sum, c) => ({
      cpu: sum.cpu + (c.requests.cpu ?? 0),
      memory: sum.memory + (c.requests.memory ?? 0),
    }),
    { cpu: 0, memory: 0 },
  )
}

/** Lo que queda libre en cada nodo. */
export function freeOn(env: Env): { node: K8sObject; cpu: number; memory: number; pods: number }[] {
  return list(env.cluster, 'Node', '').map((node) => {
    const alloc = obj(obj(node.status).allocatable)
    const here = list(env.cluster, 'Pod', null).filter(
      (pod) => str(pod.spec?.nodeName) === node.metadata.name && !isDone(env, pod),
    )
    const used = here.reduce(
      (sum, pod) => {
        const r = requestsOf(pod)

        return { cpu: sum.cpu + r.cpu, memory: sum.memory + r.memory }
      },
      { cpu: 0, memory: 0 },
    )

    return {
      node,
      cpu: (milliCpu(str(alloc.cpu)) ?? 0) - used.cpu,
      memory: (bytesOf(str(alloc.memory)) ?? 0) - used.memory,
      pods: here.length,
    }
  })
}

/** Busca nodo para un Pod; si no cabe, lo deja en Pending con el porqué. */
function schedule(env: Env, pod: K8sObject): void {
  const ns = nsOf(pod)
  const spec = podSpecOf(pod.spec)

  for (const volume of spec.volumes) {
    if (volume.kind !== 'pvc') continue

    const pvc = getObject(env.cluster, 'PersistentVolumeClaim', ns, volume.ref)

    if (pvc === undefined) {
      const message = `persistentvolumeclaim "${volume.ref}" not found`

      setStatus(pod, { ...obj(pod.status), phase: 'Pending', unschedulable: message })
      emit(
        env.cluster,
        env.now,
        ns,
        `Pod/${pod.metadata.name}`,
        'Warning',
        'FailedScheduling',
        `0/3 nodes are available: ${message}. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.`,
      )

      return
    }
    if (str(obj(pvc.status).phase) !== 'Bound') {
      const cls = str(pvc.spec?.storageClassName, 'local-path')

      if (getObject(env.cluster, 'StorageClass', '', cls) === undefined) {
        const message = `pod has unbound immediate PersistentVolumeClaims`

        setStatus(pod, { ...obj(pod.status), phase: 'Pending', unschedulable: message })
        emit(
          env.cluster,
          env.now,
          ns,
          `Pod/${pod.metadata.name}`,
          'Warning',
          'FailedScheduling',
          `0/3 nodes are available: ${message}. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.`,
        )

        return
      }
      bind(env, pvc)
    }
  }

  const wanted = requestsOf(pod)
  const nodes = freeOn(env)
    .filter((each) => each.node.spec?.unschedulable !== true)
    // Como el planificador de verdad: reparte (el nodo con menos Pods y luego con más memoria libre).
    .sort(
      (a, b) =>
        a.pods - b.pods ||
        b.memory - a.memory ||
        a.node.metadata.name.localeCompare(b.node.metadata.name),
    )
  const fit = nodes.find((each) => each.cpu >= wanted.cpu && each.memory >= wanted.memory)

  if (fit === undefined) {
    const memory = nodes.filter((each) => each.memory < wanted.memory).length
    const cpu = nodes.filter((each) => each.cpu < wanted.cpu).length
    const reasons = [
      cpu > 0 ? `${cpu} Insufficient cpu` : '',
      memory > 0 ? `${memory} Insufficient memory` : '',
    ]
      .filter((each) => each !== '')
      .join(', ')
    const message = `0/3 nodes are available: ${reasons}. preemption: 0/3 nodes are available: 3 No preemption victims found for incoming pod.`

    setStatus(pod, { ...obj(pod.status), phase: 'Pending', unschedulable: message })
    emit(
      env.cluster,
      env.now,
      ns,
      `Pod/${pod.metadata.name}`,
      'Warning',
      'FailedScheduling',
      message,
    )

    return
  }

  const n = next(env.cluster)
  const nodeIndex = Number(fit.node.metadata.name.replace(/\D/g, '')) || 1

  pod.spec = { ...obj(pod.spec), nodeName: fit.node.metadata.name }
  setStatus(pod, {
    phase: 'Pending',
    podIP: `10.42.${nodeIndex - 1}.${(n % 250) + 4}`,
    hostIP: str(obj(arr(obj(fit.node.status).addresses)[0]).address, `10.0.0.${10 + nodeIndex}`),
  })
  emit(
    env.cluster,
    env.now,
    ns,
    `Pod/${pod.metadata.name}`,
    'Normal',
    'Scheduled',
    `Successfully assigned ${ns}/${pod.metadata.name} to ${fit.node.metadata.name}`,
  )
}

/** Si el Pod puede arrancar (volúmenes, imágenes, configuración, init), lo arranca. */
function start(env: Env, pod: K8sObject): void {
  const ns = nsOf(pod)
  const spec = podSpecOf(pod.spec)
  const status = obj(pod.status)
  const name = `Pod/${pod.metadata.name}`
  const block = (reason: string, message: string, shown = reason, warn = true, event = reason) => {
    setStatus(pod, { ...status, phase: 'Pending', blocked: { reason, message, shown } })
    if (warn) emit(env.cluster, env.now, ns, name, 'Warning', event, message)
  }

  for (const volume of spec.volumes) {
    if (volume.kind !== 'configMap' && volume.kind !== 'secret') continue
    if (
      getObject(env.cluster, volume.kind === 'secret' ? 'Secret' : 'ConfigMap', ns, volume.ref) ===
      undefined
    ) {
      block(
        'ContainerCreating',
        `MountVolume.SetUp failed for volume "${volume.name}" : ${volume.kind === 'secret' ? 'secret' : 'configmap'} "${volume.ref}" not found`,
        'ContainerCreating',
        true,
        'FailedMount',
      )

      return
    }
  }
  for (const container of [...spec.init, ...spec.containers]) {
    const problem = pullError(env, pod, container.image)

    if (problem !== null) {
      block(problem.reason, problem.message, problem.reason, true, 'Failed')

      return
    }
  }
  for (const container of [...spec.init, ...spec.containers]) {
    const { error } = resolveEnv(env, ns, container)
    const image = imageInfo(container.image)
    const nonRoot = container.security.runAsNonRoot ?? spec.security.runAsNonRoot

    if (error !== null) {
      block(
        'CreateContainerConfigError',
        `Error: ${error}`,
        'CreateContainerConfigError',
        true,
        'Failed',
      )

      return
    }
    if (nonRoot === true && uidIn(spec, container, image) === 0) {
      block(
        'CreateContainerConfigError',
        'Error: container has runAsNonRoot and image will run as root',
        'CreateContainerConfigError',
        true,
        'Failed',
      )

      return
    }
  }

  // Los init, en orden: cada uno tiene que acabar bien antes del siguiente.
  const done = num(status.initDone)
  const logs = obj(status.initLogs)

  for (let i = done; i < spec.init.length; i++) {
    const container = spec.init[i]

    if (container === undefined) break
    if (waitsFor(env, pod, container, commandOf(container))) {
      block(
        'PodInitializing',
        `init container ${container.name} is waiting`,
        `Init:${i}/${spec.init.length}`,
        false,
      )

      return
    }

    const outcome = outcomeOf(env, pod, container, resolveEnv(env, ns, container).vars)

    logs[container.name] = outcome.logs

    if (outcome.kind === 'exit' && outcome.code !== 0) {
      const retries = num(status.initFailures) + 1

      setStatus(pod, {
        ...status,
        phase: 'Pending',
        initLogs: logs,
        initFailures: retries,
        blocked: {
          reason: 'Init:Error',
          message: `init container ${container.name} failed`,
          shown: retries > 1 ? 'Init:CrashLoopBackOff' : 'Init:Error',
        },
      })

      return
    }
    status.initDone = i + 1
    status.initLogs = logs
  }

  const outcomes: JsonObject = {}
  const starts: JsonObject = {}
  const bases: JsonObject = {}
  const at = env.now + START_DELAY

  const vars: JsonObject = {}

  for (const container of spec.containers) {
    const resolved = resolveEnv(env, ns, container).vars

    outcomes[container.name] = outcomeOf(env, pod, container, resolved)
    starts[container.name] = at
    bases[container.name] = 0
    vars[container.name] = resolved
  }

  const clean: JsonObject = {
    ...status,
    phase: 'Running',
    startedAt: at,
    outcomes,
    starts,
    bases,
    vars,
  }

  Reflect.deleteProperty(clean, 'blocked')
  setStatus(pod, clean)
  for (const container of spec.containers) {
    emit(
      env.cluster,
      env.now,
      ns,
      name,
      'Normal',
      'Pulled',
      `Container image "${container.image}" already present on machine`,
    )
    emit(env.cluster, env.now, ns, name, 'Normal', 'Created', `Created container ${container.name}`)
    emit(env.cluster, env.now, ns, name, 'Normal', 'Started', `Started container ${container.name}`)
  }
}

/**
 * Un contenedor que se reinicia vuelve a leer sus variables: si entre tanto
 * se arregló el Secret o el ConfigMap, el siguiente arranque ya sale bien.
 */
function refresh(env: Env, pod: K8sObject): void {
  const status = obj(pod.status)
  const rt = runtimeOf(env, pod)
  const spec = podSpecOf(pod.spec)
  const outcomes = { ...obj(status.outcomes) }
  const starts = { ...obj(status.starts) }
  const bases = { ...obj(status.bases) }
  const vars = { ...obj(status.vars) }
  const previousLogs = { ...obj(status.previousLogs) }
  let changed = false

  for (const [index, container] of spec.containers.entries()) {
    const state = rt.containers[index]
    const old = outcomes[container.name] as unknown as Outcome | undefined

    if (state?.state !== 'waiting' || old === undefined || spec.restartPolicy === 'Never') continue

    const resolved = resolveEnv(env, nsOf(pod), container).vars

    // El reinicio que viene ya arranca con las variables de ahora.
    if (JSON.stringify(resolved) !== JSON.stringify(vars[container.name] ?? null)) {
      vars[container.name] = resolved
      changed = true
    }

    const fresh = outcomeOf(env, pod, container, resolved)

    if (JSON.stringify(fresh) === JSON.stringify(old)) continue
    // Lo que escribió la última instancia, para `logs --previous` tras el arreglo.
    if (state.last !== null)
      previousLogs[container.name] = endedLogs(env, pod, container, old, state.killedBy)
    outcomes[container.name] = fresh
    starts[container.name] = env.now
    bases[container.name] = state.restarts + 1
    changed = true
  }
  if (changed) setStatus(pod, { ...status, outcomes, starts, bases, vars, previousLogs })
}

/** Lo que se ve del Pod en `-o yaml` (y lo que leen los `jsonpath`). */
function publish(env: Env, pod: K8sObject): void {
  const rt = runtimeOf(env, pod)
  const status = obj(pod.status)
  const containerStatuses = rt.containers.map((c) => ({
    name: c.name,
    image: c.image,
    ready: c.ready,
    restartCount: c.restarts,
    started: c.state === 'running',
    state:
      c.state === 'running'
        ? { running: { startedAt: c.since } }
        : c.state === 'waiting'
          ? { waiting: { reason: c.reason, ...(c.message === '' ? {} : { message: c.message }) } }
          : { terminated: { reason: c.reason, exitCode: c.exitCode } },
    ...(c.last === null || (c.state === 'terminated' && c.restarts === 0)
      ? {}
      : { lastState: { terminated: { reason: c.last.reason, exitCode: c.last.exitCode } } }),
  }))

  setStatus(pod, {
    ...status,
    phase: rt.phase,
    conditions: [
      { type: 'PodScheduled', status: str(pod.spec?.nodeName) === '' ? 'False' : 'True' },
      { type: 'Ready', status: rt.ready ? 'True' : 'False' },
    ],
    containerStatuses,
  })
}

/** Quita lo que se ha quedado sin dueño (los Pods de un ReplicaSet borrado…). */
function collect(env: Env): void {
  const uids = new Set(Object.values(env.cluster.objects).map((each) => each.metadata.uid))

  for (const object of Object.values(env.cluster.objects)) {
    const refs = object.metadata.ownerReferences ?? []

    if (refs.length > 0 && refs.every((ref) => !uids.has(ref.uid))) destroy(env, object)
  }
}

function round(env: Env): void {
  const all = (kind: string) => list(env.cluster, kind, null)

  for (const ns of all('Namespace'))
    if (getObject(env.cluster, 'ServiceAccount', ns.metadata.name, 'default') === undefined)
      create(env, {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: { name: 'default', namespace: ns.metadata.name },
      })
  for (const hpa of all('HorizontalPodAutoscaler')) syncHpa(env, hpa)
  for (const d of all('Deployment')) syncDeployment(env, d)
  for (const rs of all('ReplicaSet')) syncReplicaSet(env, rs)
  for (const sts of all('StatefulSet')) syncStatefulSet(env, sts)
  for (const job of all('Job')) syncJob(env, job)
  collect(env)
  for (const pod of all('Pod')) {
    if (str(pod.spec?.nodeName) === '') schedule(env, pod)
    if (str(pod.spec?.nodeName) === '') continue
    if (typeof obj(pod.status).startedAt !== 'number') start(env, pod)
    else refresh(env, pod)
  }
}

/** Un paso del reloj: los controladores, hasta que no cambie nada. */
function step(world: World, state: K8sState, cluster: Cluster, now: number): void {
  for (let i = 0; i < ROUNDS; i++) {
    const env: Env = { world, state, cluster, ns: 'default', now }
    const before = changes

    round(env)
    if (changes === before) break
  }

  const env: Env = { world, state, cluster, ns: 'default', now }

  for (const pod of list(cluster, 'Pod', null)) publish(env, pod)
  // Lo que se calcula al vuelo se escribe para `-o yaml`; no hace falta otra vuelta.
  for (const svc of list(cluster, 'Service', null)) endpointsOf(env, svc)
}

/**
 * Pone los clústeres al día hasta ahora: a pasos de unos segundos, para que
 * un rolling update espere de verdad a que los Pods nuevos estén listos.
 * Aunque no haya pasado el tiempo, da una vuelta (lo que acaba de cambiar una
 * orden tiene que verse ya).
 */
export function sync(world: World): void {
  const state = k8sOf(world)
  const target = clockOf(world, state)

  for (const cluster of Object.values(state.clusters)) {
    const gap = target - cluster.now
    const size = Math.max(5, Math.ceil(gap / LIMITS.steps))
    let t = cluster.now

    while (t < target) {
      t = Math.min(target, t + size)
      step(world, state, cluster, t)
    }
    step(world, state, cluster, target)
    cluster.now = Math.max(cluster.now, target)
  }
}

/** Deja pasar `seconds` de reloj en el clúster (`rollout status`, `wait`). */
export function wait(world: World, seconds: number): void {
  k8sOf(world).waited += Math.max(0, Math.round(seconds))
  sync(world)
}
