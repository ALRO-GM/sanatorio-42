/**
 * Vistas tipadas de lo que se guarda como JSON: leer un campo sin pelearse
 * con los tipos (`str`, `num`, `obj`, `arr`) y lo que la lógica necesita de
 * un Pod (contenedores, variables, sondas, recursos, volúmenes). Lo que no
 * está o no tiene la forma esperada sale con su valor por defecto: la
 * validación de `apply` ya ha avisado de lo que importa.
 */

import type { Json, JsonObject } from './model.js'
import { bytesOf, milliCpu } from './util.js'

export const obj = (value: Json | undefined): JsonObject =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}

export const arr = (value: Json | undefined): Json[] => (Array.isArray(value) ? value : [])

export const str = (value: Json | undefined, fallback = ''): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback

export const num = (value: Json | undefined, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)
      ? Number(value)
      : fallback

const bool = (value: Json | undefined): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

/** Un mapa de textos (`labels`, `matchLabels`, `data`). */
export function strMap(value: Json | undefined): Record<string, string> {
  const out: Record<string, string> = {}

  for (const [key, item] of Object.entries(obj(value))) out[key] = str(item)

  return out
}

export type Probe = {
  kind: 'http' | 'tcp' | 'exec'
  path: string
  port: number | string
  command: string[]
  initialDelay: number
  period: number
  failure: number
}

export type EnvVar = {
  name: string
  value?: string
  from?: { kind: 'configMap' | 'secret'; name: string; key: string; optional: boolean }
  field?: string
}

export type Container = {
  name: string
  image: string
  command: string[]
  args: string[]
  env: EnvVar[]
  envFrom: { kind: 'configMap' | 'secret'; name: string; prefix: string; optional: boolean }[]
  ports: { containerPort: number; name: string }[]
  requests: { cpu: number | null; memory: number | null }
  limits: { cpu: number | null; memory: number | null }
  readiness: Probe | null
  liveness: Probe | null
  startup: Probe | null
  mounts: { name: string; path: string; readOnly: boolean; subPath: string }[]
  security: {
    runAsNonRoot?: boolean
    runAsUser?: number
    readOnlyRootFilesystem?: boolean
    allowPrivilegeEscalation?: boolean
  }
}

export type Volume = {
  name: string
  kind: 'emptyDir' | 'pvc' | 'configMap' | 'secret' | 'other'
  ref: string
}

export type PodSpec = {
  containers: Container[]
  init: Container[]
  restartPolicy: 'Always' | 'OnFailure' | 'Never'
  pullSecrets: string[]
  volumes: Volume[]
  serviceAccount: string
  automountToken: boolean
  security: { runAsNonRoot?: boolean; runAsUser?: number }
}

function probeOf(value: Json | undefined): Probe | null {
  const probe = obj(value)

  if (Object.keys(probe).length === 0) return null

  const http = obj(probe.httpGet)
  const tcp = obj(probe.tcpSocket)
  const exec = obj(probe.exec)
  const base = {
    initialDelay: num(probe.initialDelaySeconds),
    period: Math.max(1, num(probe.periodSeconds, 10)),
    failure: Math.max(1, num(probe.failureThreshold, 3)),
    path: '/',
    port: 0 as number | string,
    command: [] as string[],
  }

  if (Object.keys(http).length > 0)
    return {
      ...base,
      kind: 'http',
      path: str(http.path, '/'),
      port: typeof http.port === 'number' ? http.port : str(http.port),
    }
  if (Object.keys(tcp).length > 0)
    return { ...base, kind: 'tcp', port: typeof tcp.port === 'number' ? tcp.port : str(tcp.port) }

  return { ...base, kind: 'exec', command: arr(exec.command).map((part) => str(part)) }
}

function quantity(value: Json | undefined, memory: boolean): number | null {
  const text = str(value)

  if (text === '') return null

  return memory ? bytesOf(text) : milliCpu(text)
}

function securityOf(value: Json | undefined): Container['security'] {
  const sec = obj(value)
  const out: Container['security'] = {}
  const nonRoot = bool(sec.runAsNonRoot)
  const readOnly = bool(sec.readOnlyRootFilesystem)
  const escalation = bool(sec.allowPrivilegeEscalation)

  if (nonRoot !== undefined) out.runAsNonRoot = nonRoot
  if (typeof sec.runAsUser === 'number') out.runAsUser = sec.runAsUser
  if (readOnly !== undefined) out.readOnlyRootFilesystem = readOnly
  if (escalation !== undefined) out.allowPrivilegeEscalation = escalation

  return out
}

function containerOf(value: Json): Container {
  const c = obj(value)
  const resources = obj(c.resources)
  const requests = obj(resources.requests)
  const limits = obj(resources.limits)

  return {
    name: str(c.name),
    image: str(c.image),
    command: arr(c.command).map((part) => str(part)),
    args: arr(c.args).map((part) => str(part)),
    env: arr(c.env).map((item) => {
      const e = obj(item)
      const from = obj(e.valueFrom)
      const cm = obj(from.configMapKeyRef)
      const secret = obj(from.secretKeyRef)
      const field = obj(from.fieldRef)
      const out: EnvVar = { name: str(e.name) }

      if (e.value !== undefined) out.value = str(e.value)
      if (Object.keys(cm).length > 0)
        out.from = {
          kind: 'configMap',
          name: str(cm.name),
          key: str(cm.key),
          optional: cm.optional === true,
        }
      if (Object.keys(secret).length > 0)
        out.from = {
          kind: 'secret',
          name: str(secret.name),
          key: str(secret.key),
          optional: secret.optional === true,
        }
      if (Object.keys(field).length > 0) out.field = str(field.fieldPath)

      return out
    }),
    envFrom: arr(c.envFrom).flatMap((item): Container['envFrom'] => {
      const e = obj(item)
      const cm = obj(e.configMapRef)
      const secret = obj(e.secretRef)

      if (Object.keys(cm).length > 0)
        return [
          {
            kind: 'configMap' as const,
            name: str(cm.name),
            prefix: str(e.prefix),
            optional: cm.optional === true,
          },
        ]
      if (Object.keys(secret).length > 0)
        return [
          {
            kind: 'secret' as const,
            name: str(secret.name),
            prefix: str(e.prefix),
            optional: secret.optional === true,
          },
        ]

      return []
    }),
    ports: arr(c.ports).map((item) => {
      const p = obj(item)

      return { containerPort: num(p.containerPort), name: str(p.name) }
    }),
    requests: { cpu: quantity(requests.cpu, false), memory: quantity(requests.memory, true) },
    limits: { cpu: quantity(limits.cpu, false), memory: quantity(limits.memory, true) },
    readiness: probeOf(c.readinessProbe),
    liveness: probeOf(c.livenessProbe),
    startup: probeOf(c.startupProbe),
    mounts: arr(c.volumeMounts).map((item) => {
      const m = obj(item)

      return {
        name: str(m.name),
        path: str(m.mountPath),
        readOnly: m.readOnly === true,
        subPath: str(m.subPath),
      }
    }),
    security: securityOf(c.securityContext),
  }
}

export function podSpecOf(value: Json | undefined): PodSpec {
  const spec = obj(value)
  const security = obj(spec.securityContext)
  const restart = str(spec.restartPolicy, 'Always')
  // Un init con `restartPolicy: Always` es un sidecar nativo (estable desde la
  // 1.33): no acaba, corre junto a la app y cuenta en READY (2/2).
  const sidecar = (item: Json): boolean => str(obj(item).restartPolicy) === 'Always'
  const out: PodSpec = {
    containers: [...arr(spec.containers), ...arr(spec.initContainers).filter(sidecar)].map(
      containerOf,
    ),
    init: arr(spec.initContainers)
      .filter((item) => !sidecar(item))
      .map(containerOf),
    restartPolicy: restart === 'Never' || restart === 'OnFailure' ? restart : 'Always',
    pullSecrets: arr(spec.imagePullSecrets).map((item) => str(obj(item).name)),
    volumes: arr(spec.volumes).map((item) => {
      const v = obj(item)
      const name = str(v.name)

      if (v.emptyDir !== undefined) return { name, kind: 'emptyDir' as const, ref: '' }
      if (v.persistentVolumeClaim !== undefined)
        return { name, kind: 'pvc' as const, ref: str(obj(v.persistentVolumeClaim).claimName) }
      if (v.configMap !== undefined)
        return { name, kind: 'configMap' as const, ref: str(obj(v.configMap).name) }
      if (v.secret !== undefined)
        return { name, kind: 'secret' as const, ref: str(obj(v.secret).secretName) }

      return { name, kind: 'other' as const, ref: '' }
    }),
    serviceAccount: str(spec.serviceAccountName, str(spec.serviceAccount, 'default')),
    automountToken: spec.automountServiceAccountToken !== false,
    security: {},
  }
  const nonRoot = bool(security.runAsNonRoot)

  if (nonRoot !== undefined) out.security.runAsNonRoot = nonRoot
  if (typeof security.runAsUser === 'number') out.security.runAsUser = security.runAsUser

  return out
}

/** ¿Casan unas etiquetas con un selector (`matchLabels` y `matchExpressions` sencillas)? */
export function matches(selector: JsonObject, labels: Record<string, string>): boolean {
  const match =
    Object.hasOwn(selector, 'matchLabels') || Object.hasOwn(selector, 'matchExpressions')
      ? strMap(selector.matchLabels)
      : strMap(selector)

  for (const [key, value] of Object.entries(match)) if (labels[key] !== value) return false
  for (const item of arr(selector.matchExpressions)) {
    const expr = obj(item)
    const key = str(expr.key)
    const values = arr(expr.values).map((each) => str(each))
    const op = str(expr.operator)
    const has = Object.hasOwn(labels, key)

    if (op === 'In' && !(has && values.includes(labels[key] ?? ''))) return false
    if (op === 'NotIn' && has && values.includes(labels[key] ?? '')) return false
    if (op === 'Exists' && !has) return false
    if (op === 'DoesNotExist' && has) return false
  }

  return true
}

/** Un selector de `-l` (`app=web,tier!=db`, `app`, `!app`, `env in (a,b)`). */
export function labelQuery(query: string): (labels: Record<string, string>) => boolean {
  const parts = query.match(/[^,(]+(?:\([^)]*\))?/g) ?? []
  const tests = parts.map((raw) => {
    const part = raw.trim()
    const set = /^(\S+)\s+(in|notin)\s+\(([^)]*)\)$/.exec(part)

    if (set !== null) {
      const values = (set[3] ?? '').split(',').map((each) => each.trim())

      return (labels: Record<string, string>) =>
        set[2] === 'in'
          ? values.includes(labels[set[1] ?? ''] ?? '\0')
          : !values.includes(labels[set[1] ?? ''] ?? '\0')
    }

    const eq = /^([^=!]+)(==|=|!=)(.*)$/.exec(part)

    if (eq !== null)
      return (labels: Record<string, string>) =>
        eq[2] === '!='
          ? labels[(eq[1] ?? '').trim()] !== (eq[3] ?? '').trim()
          : labels[(eq[1] ?? '').trim()] === (eq[3] ?? '').trim()
    if (part.startsWith('!'))
      return (labels: Record<string, string>) => !Object.hasOwn(labels, part.slice(1))

    return (labels: Record<string, string>) => Object.hasOwn(labels, part)
  })

  return (labels) => tests.every((test) => test(labels))
}
