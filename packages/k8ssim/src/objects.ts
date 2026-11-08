/**
 * Lo que hace el servidor de la API con un manifiesto antes de guardarlo:
 * comprobar que tiene sentido (con los mensajes de error de verdad: «spec.selector:
 * Required value», «selector does not match template labels»…), poner los
 * valores por defecto (réplicas, estrategia, `targetPort`, tipo de Service…)
 * y lo que asigna él (la ClusterIP, el NodePort). `apply`, `create` y `diff`
 * pasan todos por aquí, así que un YAML con otro orden o sin los valores por
 * defecto acaba guardado igual.
 */

import { Fail } from '@sanatorio/shellsim'

import { kindOfManifest } from './kinds.js'
import type { KindInfo } from './kinds.js'
import type { Json, JsonObject, K8sObject } from './model.js'
import { arr, matches, num, obj, str, strMap } from './spec.js'
import type { Env } from './store.js'
import { getObject, list, next } from './store.js'
import { decode64, encode64 } from './util.js'

const NAME = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/

const invalid = (kind: string, name: string, detail: string): never => {
  throw new Fail(`The ${kind} "${name}" is invalid: ${detail}`, 1)
}

function containers(kind: string, name: string, path: string, podSpec: JsonObject): void {
  const list = arr(podSpec.containers)

  if (list.length === 0) invalid(kind, name, `${path}.containers: Required value`)
  ;[...arr(podSpec.initContainers), ...list].forEach((raw, i) => {
    const c = obj(raw)
    const at = `${path}.containers[${i}]`

    if (str(c.name) === '') invalid(kind, name, `${at}.name: Required value`)
    if (!NAME.test(str(c.name)) || str(c.name).includes('.'))
      invalid(
        kind,
        name,
        `${at}.name: Invalid value: "${str(c.name)}": a lowercase RFC 1123 label must consist of lower case alphanumeric characters or '-'`,
      )
    if (str(c.image) === '') invalid(kind, name, `${at}.image: Required value`)
  })
}

const defaultPolicy = (image: string): string =>
  image.endsWith(':latest') || !/:[^/]+$/.test(image) ? 'Always' : 'IfNotPresent'

/** Pone los valores por defecto de un Pod (o de la plantilla de uno). */
function podDefaults(spec: JsonObject, restart = 'Always'): JsonObject {
  const fix = (raw: Json): Json => {
    const c = { ...obj(raw) }

    c.imagePullPolicy ??= defaultPolicy(str(c.image))
    if (Array.isArray(c.ports))
      c.ports = c.ports.map((port) => ({ ...obj(port), protocol: str(obj(port).protocol, 'TCP') }))

    return c
  }

  return {
    ...spec,
    containers: arr(spec.containers).map(fix),
    ...(spec.initContainers === undefined
      ? {}
      : { initContainers: arr(spec.initContainers).map(fix) }),
    restartPolicy: str(spec.restartPolicy, restart),
  }
}

function workload(kind: string, name: string, spec: JsonObject, info: KindInfo): JsonObject {
  const selector = obj(spec.selector)
  const template = obj(spec.template)
  const meta = obj(template.metadata)

  if (Object.keys(selector).length === 0) invalid(kind, name, 'spec.selector: Required value')
  if (!matches(selector, strMap(meta.labels)))
    invalid(
      kind,
      name,
      `spec.template.metadata.labels: Invalid value: map[string]string{${Object.entries(
        strMap(meta.labels),
      )
        .map(([k, v]) => `"${k}":"${v}"`)
        .join(', ')}}: \`selector\` does not match template \`labels\``,
    )
  containers(kind, name, 'spec.template.spec', obj(template.spec))

  const out: JsonObject = {
    ...spec,
    replicas: num(spec.replicas, 1),
    template: { ...template, spec: podDefaults(obj(template.spec)) },
  }

  if (info.kind === 'Deployment') {
    const strategy = obj(spec.strategy)
    const type = str(strategy.type, 'RollingUpdate')

    out.strategy =
      type === 'Recreate'
        ? { type }
        : {
            type,
            rollingUpdate: {
              maxSurge: obj(strategy.rollingUpdate).maxSurge ?? '25%',
              maxUnavailable: obj(strategy.rollingUpdate).maxUnavailable ?? '25%',
            },
          }
    out.revisionHistoryLimit = num(spec.revisionHistoryLimit, 10)
    out.progressDeadlineSeconds = num(spec.progressDeadlineSeconds, 600)
  }
  if (info.kind === 'StatefulSet')
    out.podManagementPolicy = str(spec.podManagementPolicy, 'OrderedReady')

  return out
}

function jobSpec(kind: string, name: string, spec: JsonObject, path = 'spec'): JsonObject {
  const template = obj(spec.template)
  const podSpec = obj(template.spec)
  const restart = str(podSpec.restartPolicy)

  containers(kind, name, `${path}.template.spec`, podSpec)
  if (restart !== 'Never' && restart !== 'OnFailure')
    invalid(
      kind,
      name,
      `${path}.template.spec.restartPolicy: ${restart === '' ? 'Required value' : `Unsupported value: "${restart}"`}: supported values: "OnFailure", "Never"`,
    )

  return {
    ...spec,
    backoffLimit: num(spec.backoffLimit, 6),
    completions: num(spec.completions, 1),
    parallelism: num(spec.parallelism, 1),
    template: { ...template, spec: podDefaults(podSpec, restart) },
  }
}

/** Una IP libre de Services (`10.43.x.y`). */
function clusterIp(env: Env): string {
  const used = new Set(list(env.cluster, 'Service', null).map((svc) => str(svc.spec?.clusterIP)))

  for (let n = next(env.cluster); ; n++) {
    const ip = `10.43.${Math.floor(n / 250) % 250}.${(n % 250) + 2}`

    if (!used.has(ip)) return ip
  }
}

function serviceSpec(
  env: Env,
  name: string,
  spec: JsonObject,
  live: K8sObject | undefined,
): JsonObject {
  const type = str(spec.type, 'ClusterIP')
  const ports = arr(spec.ports)

  if (!['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'].includes(type))
    invalid(
      'Service',
      name,
      `spec.type: Unsupported value: "${type}": supported values: "ClusterIP", "ExternalName", "LoadBalancer", "NodePort"`,
    )
  if (ports.length === 0 && type !== 'ExternalName')
    invalid('Service', name, 'spec.ports: Required value')

  const livePorts = arr(live?.spec?.ports).map((each) => obj(each))
  const usedNodePorts = new Set(
    list(env.cluster, 'Service', null).flatMap((svc) =>
      arr(svc.spec?.ports).map((p) => num(obj(p).nodePort)),
    ),
  )

  return {
    ...spec,
    type,
    clusterIP: str(spec.clusterIP, str(live?.spec?.clusterIP)) || clusterIp(env),
    ports: ports.map((raw, i) => {
      const p = obj(raw)

      if (p.port === undefined) invalid('Service', name, `spec.ports[${i}].port: Required value`)

      const out: JsonObject = {
        ...p,
        protocol: str(p.protocol, 'TCP'),
        targetPort: p.targetPort ?? p.port ?? 0,
      }

      if (type === 'NodePort' || type === 'LoadBalancer') {
        const known = livePorts.find((each) => num(each.port) === num(p.port))?.nodePort
        let port = num(p.nodePort, num(known))

        for (let n = 30080; port === 0; n++) if (!usedNodePorts.has(n)) port = n
        usedNodePorts.add(port)
        out.nodePort = port
      }

      return out
    }),
    sessionAffinity: str(spec.sessionAffinity, 'None'),
  }
}

/**
 * Un manifiesto ya leído → el objeto que se guardaría, con sus valores por
 * defecto. `ns` es el namespace de `-n` o del contexto.
 */
export function admit(
  env: Env,
  raw: JsonObject,
  file: string,
  ns: string,
  explicitNs: boolean,
): { object: K8sObject; info: KindInfo } {
  const apiVersion = str(raw.apiVersion)
  const kind = str(raw.kind)
  const missing = [
    apiVersion === '' ? 'apiVersion not set' : '',
    kind === '' ? 'kind not set' : '',
  ].filter((each) => each !== '')

  if (missing.length > 0)
    throw new Fail(
      `error: error validating "${file}": error validating data: [${missing.join(', ')}]; if you choose to ignore these errors, turn validation off with --validate=false`,
      1,
    )

  const info = kindOfManifest(kind, apiVersion)
  const meta = obj(raw.metadata)
  const name = str(meta.name)

  if (info === undefined)
    throw new Fail(
      `error: resource mapping not found for name: "${name}" namespace: "${str(meta.namespace)}" from "${file}": no matches for kind "${kind}" in version "${apiVersion}"\nensure CRDs are installed first`,
      1,
    )
  if (name === '')
    invalid(kind, '', 'metadata.name: Required value: name or generateName is required')
  if (!NAME.test(name))
    invalid(
      kind,
      name,
      `metadata.name: Invalid value: "${name}": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character`,
    )

  const own = str(meta.namespace)

  if (info.namespaced && own !== '' && explicitNs && own !== ns)
    throw new Fail(
      `error: the namespace from the provided object "${own}" does not match the namespace "${ns}". You must pass '--namespace=${own}' to perform this operation.`,
      1,
    )

  const inNs = info.namespaced ? own || ns : ''

  if (info.namespaced && getObject(env.cluster, 'Namespace', '', inNs) === undefined)
    throw new Fail(
      `Error from server (NotFound): error when creating "${file}": namespaces "${inNs}" not found`,
      1,
    )

  const labels = strMap(meta.labels)
  const annotations = strMap(meta.annotations)
  const object: K8sObject = {
    apiVersion: info.apiVersion,
    kind: info.kind,
    metadata: {
      name,
      ...(info.namespaced ? { namespace: inNs } : {}),
      ...(Object.keys(labels).length > 0 ? { labels } : {}),
      ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
    },
  }
  const spec = obj(raw.spec)
  const live = getObject(env.cluster, info.kind, inNs, name)

  switch (info.kind) {
    case 'Deployment':
    case 'ReplicaSet':
    case 'StatefulSet':
      object.spec = workload(info.kind, name, spec, info)
      if (
        live !== undefined &&
        JSON.stringify(obj(live.spec?.selector)) !== JSON.stringify(obj(spec.selector)) &&
        info.kind !== 'ReplicaSet'
      )
        invalid(
          info.kind,
          name,
          `spec.selector: Invalid value: ${JSON.stringify(obj(spec.selector))}: field is immutable`,
        )
      break
    case 'Pod':
      containers('Pod', name, 'spec', spec)
      object.spec = podDefaults(spec)
      break
    case 'Job':
      object.spec = jobSpec('Job', name, spec)
      break
    case 'CronJob': {
      const jobTemplate = obj(spec.jobTemplate)

      if (str(spec.schedule) === '') invalid('CronJob', name, 'spec.schedule: Required value')
      object.spec = {
        ...spec,
        concurrencyPolicy: str(spec.concurrencyPolicy, 'Allow'),
        suspend: spec.suspend === true,
        jobTemplate: {
          ...jobTemplate,
          spec: jobSpec('CronJob', name, obj(jobTemplate.spec), 'spec.jobTemplate.spec'),
        },
      }
      break
    }
    case 'Service':
      object.spec = serviceSpec(env, name, spec, live)
      break
    case 'ConfigMap':
      object.data = strMap(raw.data)
      break
    case 'Secret': {
      const data: Record<string, string> = {}

      for (const [key, value] of Object.entries(strMap(raw.data))) {
        try {
          decode64(value)
        } catch {
          invalid(
            'Secret',
            name,
            `data[${key}]: Invalid value: illegal base64 data at input byte 0`,
          )
        }
        data[key] = value
      }
      // `stringData` se guarda como `data` (en base64), igual que hace el servidor.
      for (const [key, value] of Object.entries(strMap(raw.stringData))) data[key] = encode64(value)
      object.type = str(raw.type, 'Opaque')
      object.data = data
      break
    }
    case 'PersistentVolumeClaim':
      if (arr(spec.accessModes).length === 0)
        invalid('PersistentVolumeClaim', name, 'spec.accessModes: Required value')
      object.spec = {
        ...spec,
        storageClassName: str(spec.storageClassName, 'local-path'),
        volumeMode: str(spec.volumeMode, 'Filesystem'),
      }
      if (live !== undefined) object.spec.volumeName = live.spec?.volumeName ?? null
      object.status = live?.status ?? { phase: 'Pending' }
      break
    case 'Ingress':
      for (const rule of arr(spec.rules))
        for (const path of arr(obj(obj(rule).http).paths))
          if (str(obj(obj(obj(path).backend).service).name) === '')
            invalid(
              'Ingress',
              name,
              'spec.rules[0].http.paths[0].backend: Required value: one backend (`service` or `resource`) must be specified',
            )
      object.spec = {
        ...spec,
        ...(spec.ingressClassName === undefined ? {} : { ingressClassName: spec.ingressClassName }),
      }
      break
    case 'HorizontalPodAutoscaler': {
      if (Object.keys(obj(spec.scaleTargetRef)).length === 0)
        invalid('HorizontalPodAutoscaler', name, 'spec.scaleTargetRef: Required value')

      // `autoscaling/v1` (`targetCPUUtilizationPercentage`) se guarda como v2.
      const percent = spec.targetCPUUtilizationPercentage
      const { targetCPUUtilizationPercentage: _old, ...rest } = spec

      object.spec =
        percent === undefined
          ? rest
          : {
              ...rest,
              metrics: [
                {
                  type: 'Resource',
                  resource: {
                    name: 'cpu',
                    target: { type: 'Utilization', averageUtilization: num(percent) },
                  },
                },
              ],
            }
      break
    }
    case 'ServiceAccount': {
      const pulls = raw.imagePullSecrets

      if (pulls !== undefined) (object as unknown as JsonObject).imagePullSecrets = pulls
      if (raw.automountServiceAccountToken !== undefined)
        (object as unknown as JsonObject).automountServiceAccountToken =
          raw.automountServiceAccountToken
      break
    }
    default:
      if (raw.spec !== undefined) object.spec = spec
  }

  return { object, info }
}

/** Lo que se compara entre un manifiesto y lo que hay (sin lo que pone el servidor). */
export function comparable(object: K8sObject): JsonObject {
  const { status: _status, ...rest } = object
  const meta = { ...object.metadata }

  for (const key of ['uid', 'creationTimestamp', 'generation', 'ownerReferences'] as const)
    Reflect.deleteProperty(meta, key)

  const annotations = { ...meta.annotations }

  for (const key of Object.keys(annotations))
    if (
      key.startsWith('deployment.kubernetes.io/') ||
      key === 'kubectl.kubernetes.io/last-applied-configuration'
    )
      Reflect.deleteProperty(annotations, key)
  if (Object.keys(annotations).length === 0) Reflect.deleteProperty(meta, 'annotations')
  else meta.annotations = annotations

  const out = { ...rest, metadata: meta } as unknown as JsonObject

  if (object.kind === 'Pod') {
    const { nodeName: _node, ...spec } = object.spec ?? {}

    out.spec = spec
  }

  return out
}
