/**
 * `kubectl describe`: lo primero que se mira cuando algo no va. Del Pod, su
 * estado y el de cada contenedor (con el «Last State» de un OOMKilled o un
 * CrashLoopBackOff), sondas, recursos, variables, volúmenes y eventos; del
 * Deployment, réplicas, estrategia y ReplicaSets; del Service, selector y
 * endpoints; del nodo, lo pedido y lo que cabe.
 */

import { freeOn, requestsOf } from './controllers.js'
import type { KindInfo } from './kinds.js'
import type { K8sEvent, K8sObject } from './model.js'
import { MI } from './model.js'
import { endpointsOf, targetOf } from './net.js'
import { runtimeOf } from './runtime.js'
import type { Container, Probe } from './spec.js'
import { arr, num, obj, podSpecOf, str, strMap } from './spec.js'
import type { Env } from './store.js'
import { list, nsOf, ownedBy } from './store.js'
import { podEvents } from './show.js'
import { age, isoAt, mi } from './util.js'
import { toYaml } from './yaml.js'

const pad = (label: string, width = 22): string => `${label}:`.padEnd(width)

function labelsBlock(title: string, labels: Record<string, string>, width = 22): string[] {
  const entries = Object.entries(labels)

  if (entries.length === 0) return [`${pad(title, width)}<none>`]

  return entries.map(([k, v], i) => `${i === 0 ? pad(title, width) : ' '.repeat(width)}${k}=${v}`)
}

function eventsBlock(env: Env, events: readonly K8sEvent[]): string[] {
  if (events.length === 0) return ['Events:                <none>']

  const rows = events.slice(-12).map((e) => [
    e.type,
    e.reason,
    e.count > 1
      ? `${age(env.now - e.t)} (x${e.count} over ${age(env.now - (e.first ?? e.t))})`
      : age(env.now - e.t),
    // Dónde poner un Pod lo decide el planificador, no el kubelet (como en un clúster de verdad).
    e.object.startsWith('Pod/') && (e.reason === 'Scheduled' || e.reason === 'FailedScheduling')
      ? 'default-scheduler'
      : e.object.startsWith('Pod/')
        ? 'kubelet'
        : e.object.startsWith('Deployment/')
          ? 'deployment-controller'
          : 'controller',
    e.message,
  ])
  const widths = [6, 18, 22, 22]

  return [
    'Events:',
    `  ${'Type'.padEnd(widths[0] ?? 0)}  ${'Reason'.padEnd(widths[1] ?? 0)}  ${'Age'.padEnd(widths[2] ?? 0)}  ${'From'.padEnd(widths[3] ?? 0)}  Message`,
    `  ${'----'.padEnd(widths[0] ?? 0)}  ${'------'.padEnd(widths[1] ?? 0)}  ${'----'.padEnd(widths[2] ?? 0)}  ${'----'.padEnd(widths[3] ?? 0)}  -------`,
    ...rows.map(
      (row) =>
        `  ${row
          .slice(0, 4)
          .map((cell, i) => cell.padEnd(widths[i] ?? 0))
          .join('  ')}  ${row[4] ?? ''}`,
    ),
  ]
}

const storedEvents = (env: Env, object: K8sObject): K8sEvent[] =>
  env.cluster.events.filter(
    (e) => e.ns === nsOf(object) && e.object === `${object.kind}/${object.metadata.name}`,
  )

function probeText(probe: Probe | null): string | null {
  if (probe === null) return null

  const how =
    probe.kind === 'http'
      ? `http-get http://:${probe.port}${probe.path}`
      : probe.kind === 'tcp'
        ? `tcp-socket :${probe.port}`
        : `exec [${probe.command.join(' ')}]`

  return `${how} delay=${probe.initialDelay}s timeout=1s period=${probe.period}s #success=1 #failure=${probe.failure}`
}

function envLines(c: Container): string[] {
  const lines: string[] = []

  for (const from of c.envFrom)
    lines.push(
      `      ${from.name}  ${from.kind === 'secret' ? 'Secret' : 'ConfigMap'}  Optional: ${from.optional}`,
    )

  const vars = c.env.map((e) =>
    e.value !== undefined
      ? `      ${e.name}:  ${e.value}`
      : e.from !== undefined
        ? `      ${e.name}:  <set to the key '${e.from.key}' ${e.from.kind === 'secret' ? 'in secret' : 'of config map'} '${e.from.name}'>  Optional: ${e.from.optional}`
        : `      ${e.name}:   (${e.field ?? ''})`,
  )

  return [
    ...(c.envFrom.length === 0 ? [] : ['    Environment Variables from:', ...lines]),
    vars.length === 0 ? '    Environment:  <none>' : '    Environment:',
    ...vars,
  ]
}

function resourcesLines(c: Container): string[] {
  const out: string[] = []
  const block = (title: string, r: Container['limits']) => {
    if (r.cpu === null && r.memory === null) return
    out.push(`    ${title}:`)
    if (r.cpu !== null)
      out.push(`      cpu:     ${r.cpu % 1000 === 0 ? r.cpu / 1000 : `${r.cpu}m`}`)
    if (r.memory !== null) out.push(`      memory:  ${mi(r.memory)}`)
  }

  block('Limits', c.limits)
  block('Requests', c.requests)

  return out
}

function describePod(env: Env, pod: K8sObject): string[] {
  const rt = runtimeOf(env, pod)
  const spec = podSpecOf(pod.spec)
  const owner = pod.metadata.ownerReferences?.[0]
  const lines = [
    `${pad('Name')}${pod.metadata.name}`,
    `${pad('Namespace')}${nsOf(pod)}`,
    `${pad('Priority')}0`,
    `${pad('Service Account')}${spec.serviceAccount}`,
    `${pad('Node')}${str(pod.spec?.nodeName) === '' ? '<none>' : `${str(pod.spec?.nodeName)}/${str(pod.status?.hostIP)}`}`,
    `${pad('Start Time')}${isoAt(pod.metadata.creationTimestamp ?? 0)}`,
    ...labelsBlock('Labels', strMap(pod.metadata.labels)),
    `${pad('Status')}${rt.phase}`,
    `${pad('IP')}${str(pod.status?.podIP)}`,
    ...(owner === undefined ? [] : [`${pad('Controlled By')}${owner.kind}/${owner.name}`]),
  ]
  const section = (title: string, containers: Container[], states: typeof rt.containers | null) => {
    if (containers.length === 0) return

    lines.push(`${title}:`)
    containers.forEach((c, i) => {
      const s = states?.[i]
      const state =
        s === undefined
          ? [
              '    State:          Terminated',
              '      Reason:       Completed',
              '      Exit Code:    0',
            ]
          : s.state === 'running'
            ? ['    State:          Running', `      Started:      ${isoAt(s.since)}`]
            : s.state === 'waiting'
              ? ['    State:          Waiting', `      Reason:       ${s.reason}`]
              : [
                  '    State:          Terminated',
                  `      Reason:       ${s.reason}`,
                  `      Exit Code:    ${s.exitCode}`,
                ]

      lines.push(
        `  ${c.name}:`,
        `    Image:          ${c.image}`,
        `    Port:           ${c.ports.length === 0 ? '<none>' : c.ports.map((p) => `${p.containerPort}/TCP${p.name === '' ? '' : ` (${p.name})`}`).join(', ')}`,
        ...(c.command.length > 0
          ? ['    Command:', ...c.command.map((part) => `      ${part}`)]
          : []),
        ...(c.args.length > 0 ? ['    Args:', ...c.args.map((part) => `      ${part}`)] : []),
        ...state,
        ...(s?.last === null || s === undefined
          ? []
          : [
              '    Last State:     Terminated',
              `      Reason:       ${s.last.reason}`,
              `      Exit Code:    ${s.last.exitCode}`,
              `      Finished:     ${isoAt(s.last.at)}`,
            ]),
        `    Ready:          ${s?.ready === true ? 'True' : 'False'}`,
        `    Restart Count:  ${s?.restarts ?? 0}`,
        ...resourcesLines(c),
        ...(['Liveness', 'Readiness', 'Startup'] as const).flatMap((kind) => {
          const text = probeText(
            kind === 'Liveness' ? c.liveness : kind === 'Readiness' ? c.readiness : c.startup,
          )

          return text === null ? [] : [`    ${`${kind}:`.padEnd(16)}${text}`]
        }),
        ...envLines(c),
        '    Mounts:',
        ...(c.mounts.length === 0
          ? ['      <none>']
          : c.mounts.map((m) => `      ${m.path} from ${m.name} (${m.readOnly ? 'ro' : 'rw'})`)),
      )
    })
  }

  section('Init Containers', spec.init, null)
  section('Containers', spec.containers, rt.containers)
  lines.push(
    'Conditions:',
    '  Type              Status',
    `  PodScheduled      ${str(pod.spec?.nodeName) === '' ? 'False' : 'True'}`,
    `  Ready             ${rt.ready ? 'True' : 'False'}`,
    'Volumes:',
    ...(spec.volumes.length === 0
      ? ['  <none>']
      : spec.volumes.flatMap((v) => [
          `  ${v.name}:`,
          `    Type:       ${v.kind === 'pvc' ? 'PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)' : v.kind === 'configMap' ? 'ConfigMap (a volume populated by a ConfigMap)' : v.kind === 'secret' ? 'Secret (a volume populated by a Secret)' : "EmptyDir (a temporary directory that shares a pod's lifetime)"}`,
          ...(v.ref === ''
            ? []
            : [
                `    ${v.kind === 'pvc' ? 'ClaimName' : v.kind === 'secret' ? 'SecretName' : 'Name'}:  ${v.ref}`,
              ]),
        ])),
    `${pad('QoS Class')}${spec.containers.every((c) => c.limits.memory !== null && c.limits.memory === c.requests.memory) ? 'Guaranteed' : spec.containers.some((c) => c.requests.memory !== null || c.limits.memory !== null) ? 'Burstable' : 'BestEffort'}`,
    ...eventsBlock(
      env,
      [...storedEvents(env, pod), ...podEvents(env, pod)].sort((a, b) => a.t - b.t),
    ),
  )

  return lines
}

function describeDeployment(env: Env, d: K8sObject): string[] {
  const spec = obj(d.spec)
  const status = obj(d.status)
  const strategy = obj(spec.strategy)
  const rolling = obj(strategy.rollingUpdate)
  const template = obj(spec.template)
  const containers = podSpecOf(template.spec).containers
  const sets = list(env.cluster, 'ReplicaSet', nsOf(d)).filter((rs) => ownedBy(rs, d))
  const top = Math.max(
    0,
    ...sets.map((rs) =>
      Number(rs.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? 0),
    ),
  )
  const current = sets.find(
    (rs) => Number(rs.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? 0) === top,
  )

  return [
    `${pad('Name')}${d.metadata.name}`,
    `${pad('Namespace')}${nsOf(d)}`,
    `${pad('CreationTimestamp')}${isoAt(d.metadata.creationTimestamp ?? 0)}`,
    ...labelsBlock('Labels', strMap(d.metadata.labels)),
    ...labelsBlock('Annotations', {
      'deployment.kubernetes.io/revision': String(top),
      ...strMap(d.metadata.annotations),
    }),
    `${pad('Selector')}${Object.entries(strMap(obj(spec.selector).matchLabels))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')}`,
    `${pad('Replicas')}${num(spec.replicas, 1)} desired | ${num(status.updatedReplicas)} updated | ${num(status.replicas)} total | ${num(status.availableReplicas)} available | ${num(status.unavailableReplicas)} unavailable`,
    `${pad('StrategyType')}${str(strategy.type, 'RollingUpdate')}`,
    `${pad('MinReadySeconds')}0`,
    ...(str(strategy.type, 'RollingUpdate') === 'RollingUpdate'
      ? [
          `RollingUpdateStrategy:  ${str(rolling.maxUnavailable, '25%')} max unavailable, ${str(rolling.maxSurge, '25%')} max surge`,
        ]
      : []),
    'Pod Template:',
    ...labelsBlock('  Labels', strMap(obj(template.metadata).labels)),
    '  Containers:',
    ...containers.flatMap((c) => [
      `   ${c.name}:`,
      `    Image:      ${c.image}`,
      `    Port:       ${c.ports.map((p) => `${p.containerPort}/TCP`).join(', ') || '<none>'}`,
      ...resourcesLines(c),
      ...envLines(c),
    ]),
    'Conditions:',
    '  Type           Status  Reason',
    '  ----           ------  ------',
    ...arr(status.conditions).map((raw) => {
      const c = obj(raw)

      return `  ${str(c.type).padEnd(13)}  ${str(c.status).padEnd(6)}  ${str(c.reason)}`
    }),
    `${pad('OldReplicaSets')}${
      sets
        .filter((rs) => rs !== current && num(rs.spec?.replicas) > 0)
        .map(
          (rs) =>
            `${rs.metadata.name} (${num(obj(rs.status).replicas)}/${num(rs.spec?.replicas)} replicas created)`,
        )
        .join(', ') || '<none>'
    }`,
    `${pad('NewReplicaSet')}${current === undefined ? '<none>' : `${current.metadata.name} (${num(obj(current.status).replicas)}/${num(current.spec?.replicas)} replicas created)`}`,
    ...eventsBlock(env, storedEvents(env, d)),
  ]
}

function describeService(env: Env, svc: K8sObject): string[] {
  const spec = obj(svc.spec)
  const pods = endpointsOf(env, svc).ready
  const ports = arr(spec.ports).map((each) => obj(each))

  return [
    `${pad('Name')}${svc.metadata.name}`,
    `${pad('Namespace')}${nsOf(svc)}`,
    ...labelsBlock('Labels', strMap(svc.metadata.labels)),
    `${pad('Selector')}${
      Object.entries(strMap(spec.selector))
        .map(([k, v]) => `${k}=${v}`)
        .join(',') || '<none>'
    }`,
    `${pad('Type')}${str(spec.type, 'ClusterIP')}`,
    `${pad('IP')}${str(spec.clusterIP)}`,
    ...ports.flatMap((p) => {
      const raw = p.targetPort ?? p.port ?? 0
      const eps = pods.map(
        (pod) =>
          `${str(pod.status?.podIP)}:${targetOf(pod, typeof raw === 'number' ? raw : str(raw))}`,
      )

      return [
        `${pad('Port')}${str(p.name, '<unset>')}  ${num(p.port)}/TCP`,
        `${pad('TargetPort')}${str(raw)}/TCP`,
        ...(p.nodePort === undefined
          ? []
          : [`${pad('NodePort')}${str(p.name, '<unset>')}  ${num(p.nodePort)}/TCP`]),
        `${pad('Endpoints')}${eps.join(',')}`,
      ]
    }),
    `${pad('Session Affinity')}None`,
    'Events:                   <none>',
  ]
}

function describeNode(env: Env, node: K8sObject): string[] {
  const free = freeOn(env).find((each) => each.node === node)
  const pods = list(env.cluster, 'Pod', null).filter(
    (pod) => str(pod.spec?.nodeName) === node.metadata.name,
  )
  const used = pods.reduce(
    (sum, pod) => {
      const r = requestsOf(pod)

      return { cpu: sum.cpu + r.cpu, memory: sum.memory + r.memory }
    },
    { cpu: 0, memory: 0 },
  )
  const alloc = obj(obj(node.status).allocatable)
  const cpuTotal = 2000
  const memTotal = (free?.memory ?? 0) + used.memory

  return [
    `${pad('Name')}${node.metadata.name}`,
    `${pad('Roles')}${node.metadata.labels?.['node-role.kubernetes.io/control-plane'] === 'true' ? 'control-plane,master' : '<none>'}`,
    ...labelsBlock('Labels', strMap(node.metadata.labels)),
    `${pad('Unschedulable')}${node.spec?.unschedulable === true ? 'true' : 'false'}`,
    'Allocatable:',
    `  cpu:                ${str(alloc.cpu)}`,
    `  memory:             ${str(alloc.memory)}`,
    `  pods:               ${str(alloc.pods)}`,
    `Non-terminated Pods:          (${pods.length} in total)`,
    '  Namespace                   Name                                       CPU Requests  Memory Requests',
    '  ---------                   ----                                       ------------  ---------------',
    ...pods.map((pod) => {
      const r = requestsOf(pod)

      return `  ${nsOf(pod).padEnd(26)}  ${pod.metadata.name.padEnd(41)}  ${`${r.cpu}m`.padEnd(12)}  ${mi(r.memory)}`
    }),
    'Allocated resources:',
    '  (Total limits may be over 100 percent, i.e., overcommitted.)',
    '  Resource           Requests',
    '  --------           --------',
    `  cpu                ${used.cpu}m (${Math.round((used.cpu / cpuTotal) * 100)}%)`,
    `  memory             ${Math.round(used.memory / MI)}Mi (${memTotal === 0 ? 0 : Math.round((used.memory / memTotal) * 100)}%)`,
    'Events:              <none>',
  ]
}

function describeHpa(env: Env, hpa: K8sObject): string[] {
  const spec = obj(hpa.spec)
  const status = obj(hpa.status)
  const ref = obj(spec.scaleTargetRef)
  const goal = num(obj(obj(obj(arr(spec.metrics)[0]).resource).target).averageUtilization, 80)
  const current = obj(obj(obj(arr(status.currentMetrics)[0]).resource).current).averageUtilization

  return [
    `${pad('Name', 55)}${hpa.metadata.name}`,
    `${pad('Namespace', 55)}${nsOf(hpa)}`,
    `${pad('Reference', 55)}${str(ref.kind)}/${str(ref.name)}`,
    'Metrics:                                               ( current / target )',
    `  resource cpu on pods  (as a percentage of request):  ${current === undefined ? '<unknown>' : `${num(current)}%`} / ${goal}%`,
    `${pad('Min replicas', 55)}${num(spec.minReplicas, 1)}`,
    `${pad('Max replicas', 55)}${num(spec.maxReplicas)}`,
    `${pad(`${str(ref.kind)} pods`, 55)}${num(status.currentReplicas)} current / ${num(status.desiredReplicas)} desired`,
    'Conditions:',
    ...arr(status.conditions).map((raw) => {
      const c = obj(raw)

      return `  ${str(c.type).padEnd(14)}  ${str(c.status).padEnd(6)}  ${str(c.reason)}  ${str(c.message)}`
    }),
    ...eventsBlock(env, storedEvents(env, hpa)),
  ]
}

function describeIngress(env: Env, ing: K8sObject): string[] {
  const spec = obj(ing.spec)

  return [
    `${pad('Name', 18)}${ing.metadata.name}`,
    `${pad('Namespace', 18)}${nsOf(ing)}`,
    `${pad('Address', 18)}10.0.0.11,10.0.0.12,10.0.0.13`,
    `${pad('Ingress Class', 18)}${str(spec.ingressClassName, '<none>')}`,
    ...(arr(spec.tls).length === 0
      ? []
      : [
          'TLS:',
          ...arr(spec.tls).map(
            (t) =>
              `  ${str(obj(t).secretName)} terminates ${arr(obj(t).hosts)
                .map((h) => str(h))
                .join(',')}`,
          ),
        ]),
    'Rules:',
    '  Host          Path  Backends',
    '  ----          ----  --------',
    ...arr(spec.rules).flatMap((raw) => {
      const rule = obj(raw)

      return arr(obj(rule.http).paths).map((p, i) => {
        const path = obj(p)
        const svc = obj(obj(path.backend).service)
        const port = obj(svc.port)

        return `  ${(i === 0 ? str(rule.host, '*') : '').padEnd(12)}  ${str(path.path, '/')}  ${str(svc.name)}:${port.number === undefined ? str(port.name) : num(port.number)}`
      })
    }),
    ...eventsBlock(env, storedEvents(env, ing)),
  ]
}

/** Lo genérico: nombre, etiquetas y el resto como YAML (Secret sin valores, como kubectl). */
function describeGeneric(env: Env, object: K8sObject): string[] {
  const lines = [
    `${pad('Name', 14)}${object.metadata.name}`,
    ...(object.metadata.namespace === undefined
      ? []
      : [`${pad('Namespace', 14)}${object.metadata.namespace}`]),
    ...labelsBlock('Labels', strMap(object.metadata.labels), 14),
    ...labelsBlock('Annotations', strMap(object.metadata.annotations), 14),
  ]

  if (object.kind === 'Secret')
    return [
      ...lines,
      '',
      `Type:  ${object.type ?? 'Opaque'}`,
      '',
      'Data',
      '====',
      ...Object.entries(object.data ?? {}).map(
        ([k, v]) =>
          `${k}:  ${Math.floor((v.length * 3) / 4) - (v.endsWith('==') ? 2 : v.endsWith('=') ? 1 : 0)} bytes`,
      ),
    ]
  if (object.kind === 'ConfigMap')
    return [
      ...lines,
      '',
      'Data',
      '====',
      ...Object.entries(object.data ?? {}).flatMap(([k, v]) => [
        `${k}:`,
        '----',
        v.replace(/\n$/, ''),
        '',
      ]),
    ]

  const body = {
    ...(object.spec === undefined ? {} : { Spec: object.spec }),
    ...(object.status === undefined ? {} : { Status: object.status }),
  }

  return [
    ...lines,
    ...(Object.keys(body).length === 0 ? [] : toYaml(body).replace(/\n$/, '').split('\n')),
    ...eventsBlock(env, storedEvents(env, object)),
  ]
}

export function describe(env: Env, info: KindInfo, object: K8sObject): string {
  const lines =
    info.kind === 'Pod'
      ? describePod(env, object)
      : info.kind === 'Deployment'
        ? describeDeployment(env, object)
        : info.kind === 'Service'
          ? describeService(env, object)
          : info.kind === 'Node'
            ? describeNode(env, object)
            : info.kind === 'HorizontalPodAutoscaler'
              ? describeHpa(env, object)
              : info.kind === 'Ingress'
                ? describeIngress(env, object)
                : describeGeneric(env, object)

  return `${lines.join('\n')}\n`
}
