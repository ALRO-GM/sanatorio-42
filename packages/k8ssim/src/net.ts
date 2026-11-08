/**
 * La red del clúster: el DNS de los Services (`api`, `api.tienda`,
 * `api.tienda.svc.cluster.local`, `db-0.db` de un StatefulSet), sus
 * endpoints (los Pods listos que casan con el selector), las NetworkPolicies
 * como tabla de permitidos, el Ingress (Traefik, por host y ruta) y lo que
 * contesta cada app por HTTP. Desde tu máquina se llega con `port-forward`,
 * por un NodePort o por el Ingress; desde dentro, con el nombre del Service.
 */

import type { HttpReply, World } from '@sanatorio/shellsim'

import { FRONT_INDEX, imageInfo } from './images.js'
import type { K8sObject } from './model.js'
import { databaseUp, resolveEnv, runtimeOf } from './runtime.js'
import type { Container } from './spec.js'
import { arr, matches, num, obj, podSpecOf, str, strMap } from './spec.js'
import type { Env } from './store.js'
import { envOfWorld, getObject, labelsOf, list, nsOf } from './store.js'

/** El Pod del controlador de Ingress (Traefik), de donde sale el tráfico que entra por él. */
const TRAEFIK: K8sObject = {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: {
    name: 'traefik-6d5f8c7b9-k8s42',
    namespace: 'kube-system',
    labels: { 'app.kubernetes.io/name': 'traefik' },
  },
}

/** Las IP de los nodos: el Ingress (Traefik con el balanceador de k3s) contesta en todas. */
export const NODE_IPS = ['10.0.0.11', '10.0.0.12', '10.0.0.13']

const reply = (status: number, body: string, type = 'application/json'): HttpReply => ({
  status,
  body,
  type,
})

/** Los Pods detrás de un Service: listos y no listos (los que casan con el selector y tienen IP). */
export function endpointsOf(
  env: Env,
  svc: K8sObject,
): { ready: K8sObject[]; notReady: K8sObject[] } {
  const selector = strMap(svc.spec?.selector)

  if (Object.keys(selector).length === 0) return { ready: [], notReady: [] }

  const pods = list(env.cluster, 'Pod', nsOf(svc)).filter(
    (pod) => matches(selector, labelsOf(pod)) && str(pod.status?.podIP) !== '',
  )
  const ready: K8sObject[] = []
  const notReady: K8sObject[] = []

  for (const pod of pods) {
    const rt = runtimeOf(env, pod)

    if (rt.phase === 'Succeeded' || rt.phase === 'Failed') continue
    ;(rt.ready ? ready : notReady).push(pod)
  }

  return { ready, notReady }
}

/** El puerto del contenedor al que va un `targetPort` (número o nombre). */
export function targetOf(pod: K8sObject, target: number | string): number {
  if (typeof target === 'number') return target

  for (const container of podSpecOf(pod.spec).containers) {
    const found = container.ports.find((port) => port.name === target)

    if (found !== undefined) return found.containerPort
  }

  return -1
}

/** El Service o Pod al que apunta un nombre desde un namespace (o `null` si no existe). */
function resolve(
  env: Env,
  ns: string,
  host: string,
): { svc: K8sObject | null; pod: K8sObject | null } | null {
  const ip = /^\d+\.\d+\.\d+\.\d+$/.test(host)

  if (ip) {
    const svc = list(env.cluster, 'Service', null).find(
      (each) => str(each.spec?.clusterIP) === host,
    )

    if (svc !== undefined) return { svc, pod: null }

    const pod = list(env.cluster, 'Pod', null).find((each) => str(each.status?.podIP) === host)

    return pod === undefined ? null : { svc: null, pod }
  }

  const parts = host
    .replace(/\.$/, '')
    .replace(/\.svc\.cluster\.local$|\.svc$/, '')
    .split('.')

  // `db-0.db` (o `db-0.db.tienda`): un Pod de un StatefulSet por su Service headless.
  if (parts.length >= 2) {
    const [podName = '', svcName = '', inNs = ns] = parts
    const svc = getObject(env.cluster, 'Service', inNs, svcName)

    if (svc !== undefined && str(svc.spec?.clusterIP) === 'None') {
      const pod = getObject(env.cluster, 'Pod', inNs, podName)

      if (pod !== undefined) return { svc: null, pod }
    }
  }
  if (parts.length > 2) return null

  const [name = '', inNs = ns] = parts
  const svc = getObject(env.cluster, 'Service', inNs, name)

  return svc === undefined ? null : { svc, pod: null }
}

/** ¿Deja pasar la red este tráfico (NetworkPolicy de entrada en el destino y de salida en el origen)? */
function allowed(env: Env, from: K8sObject | null, to: K8sObject, port: number): boolean {
  if (from === null) return true

  const nsLabels = (ns: string): Record<string, string> => ({
    'kubernetes.io/metadata.name': ns,
    ...strMap(getObject(env.cluster, 'Namespace', '', ns)?.metadata.labels),
  })
  const peerMatches = (peers: unknown[], policyNs: string, other: K8sObject): boolean =>
    peers.some((raw) => {
      const peer = obj(raw as never)

      if (peer.ipBlock !== undefined) return str(obj(peer.ipBlock).cidr) === '0.0.0.0/0'

      const nsSel = peer.namespaceSelector
      const podSel = peer.podSelector
      const nsOk =
        nsSel === undefined ? nsOf(other) === policyNs : matches(obj(nsSel), nsLabels(nsOf(other)))
      const podOk = podSel === undefined || matches(obj(podSel), labelsOf(other))

      return nsOk && podOk
    })
  const portOk = (ports: unknown[], target: K8sObject): boolean =>
    ports.length === 0 ||
    ports.some((raw) => {
      const p = obj(raw as never)

      return (
        p.port === undefined ||
        targetOf(target, typeof p.port === 'number' ? p.port : str(p.port)) === port
      )
    })
  const policies = (ns: string, pod: K8sObject, type: 'Ingress' | 'Egress') =>
    list(env.cluster, 'NetworkPolicy', ns).filter((policy) => {
      const spec = obj(policy.spec)
      const types = arr(spec.policyTypes).map((each) => str(each))
      const applies =
        types.length > 0 ? types.includes(type) : type === 'Ingress' || spec.egress !== undefined

      return applies && matches(obj(spec.podSelector), labelsOf(pod))
    })

  const ingress = policies(nsOf(to), to, 'Ingress')

  if (
    ingress.length > 0 &&
    !ingress.some((policy) =>
      arr(obj(policy.spec).ingress).some((rule) => {
        const r = obj(rule)

        return (
          (r.from === undefined || peerMatches(arr(r.from), nsOf(policy), from)) &&
          portOk(arr(r.ports), to)
        )
      }),
    )
  )
    return false

  const egress = policies(nsOf(from), from, 'Egress')

  return (
    egress.length === 0 ||
    egress.some((policy) =>
      arr(obj(policy.spec).egress).some((rule) => {
        const r = obj(rule)

        return (
          (r.to === undefined || peerMatches(arr(r.to), nsOf(policy), to)) &&
          portOk(arr(r.ports), to)
        )
      }),
    )
  )
}

type Reach = {
  pod: K8sObject | null
  port: number
  /** `dns`: el nombre no existe; `refused`: nadie escucha; `timeout`: lo corta una NetworkPolicy. */
  error: 'dns' | 'refused' | 'timeout' | null
}

/** ¿Escucha el contenedor principal de este Pod en ese puerto? */
function listensOn(env: Env, pod: K8sObject, port: number): boolean {
  const rt = runtimeOf(env, pod)
  const image = imageInfo(podSpecOf(pod.spec).containers[0]?.image ?? '')

  return rt.listening && image?.port === port
}

/** Conectar desde un Pod (o desde fuera, con `null`) a `host:port`, como lo haría una app. */
export function connect(env: Env, from: K8sObject | null, host: string, port: number): Reach {
  const ns = from === null ? env.ns : nsOf(from)

  if (host === 'localhost' || host === '127.0.0.1') {
    if (from === null) return { pod: null, port, error: 'refused' }

    return { pod: from, port, error: listensOn(env, from, port) ? null : 'refused' }
  }

  const found = resolve(env, ns, host)

  if (found === null) return { pod: null, port, error: 'dns' }

  let pod = found.pod
  let target = port

  if (found.svc !== null) {
    const svc = found.svc
    const ports = arr(svc.spec?.ports).map((each) => obj(each))
    const entry = ports.find((each) => num(each.port) === port)

    if (str(svc.spec?.clusterIP) === 'None') {
      pod = endpointsOf(env, svc).ready[0] ?? null
    } else {
      if (entry === undefined) return { pod: null, port, error: 'timeout' }
      pod = endpointsOf(env, svc).ready[0] ?? null
      if (pod !== null) {
        const raw = entry.targetPort ?? entry.port ?? port

        target = targetOf(pod, typeof raw === 'number' ? raw : str(raw))
      }
    }
    if (pod === null) return { pod: null, port, error: 'refused' }
  }
  if (pod === null) return { pod: null, port, error: 'dns' }
  if (!allowed(env, from, pod, target)) return { pod, port: target, error: 'timeout' }
  if (!listensOn(env, pod, target)) return { pod, port: target, error: 'refused' }

  return { pod, port: target, error: null }
}

const firstContainer = (pod: K8sObject): Container | undefined => podSpecOf(pod.spec).containers[0]

/** Lo que contesta por HTTP la app de un Pod (ya escuchando). `null`: no habla HTTP. */
export function appHttp(env: Env, pod: K8sObject, port: number, path: string): HttpReply | null {
  const container = firstContainer(pod)
  const image = imageInfo(container?.image ?? '')

  if (container === undefined || image?.port !== port) return null

  const clean = path.split('?')[0] ?? '/'

  switch (image.behaviour) {
    case 'nginx':
      return clean === '/' || clean === '/index.html'
        ? reply(200, image.files['/usr/share/nginx/html/index.html'] ?? '', 'text/html')
        : reply(404, '<html><head><title>404 Not Found</title></head></html>\n', 'text/html')
    case 'front': {
      if (clean.startsWith('/api/') || clean === '/api') {
        const reach = connect(env, pod, 'api', 3000)

        if (reach.error !== null || reach.pod === null)
          return reply(
            502,
            '<html><head><title>502 Bad Gateway</title></head></html>\n',
            'text/html',
          )

        return appHttp(env, reach.pod, reach.port, clean.slice(4) || '/') ?? reply(502, '')
      }

      return reply(200, FRONT_INDEX, 'text/html')
    }
    case 'api': {
      const route = clean.replace(/^\/api(?=\/|$)/, '') || '/'

      if (route === '/')
        return reply(200, `{"service":"peer4u-api","version":"${image.version}"}\n`)
      if (route === '/health') {
        if (image.unhealthy) return reply(503, '{"status":"error","reason":"pending migrations"}\n')

        const vars = resolveEnv(env, nsOf(pod), container).vars

        return databaseUp(env, pod, vars) === null
          ? reply(200, '{"status":"ok","db":"up"}\n')
          : reply(503, '{"status":"error","db":"down"}\n')
      }

      return reply(404, '{"error":"not found"}\n')
    }
    default:
      return null
  }
}

/** Una petición HTTP desde un Pod (o desde fuera): la respuesta o el error de curl (`(6)`, `(7)`, `(28)`). */
export function httpFrom(
  env: Env,
  from: K8sObject | null,
  url: string,
): { reply: HttpReply } | { error: string; code: number } {
  const parsed = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url)

  if (parsed === null) return { error: 'URL rejected: Malformed input to a URL function', code: 3 }

  const [, scheme = 'http', host = '', portText, path = '/'] = parsed
  const port = Number(portText ?? (scheme === 'https' ? 443 : 80))
  const reach = connect(env, from, host, port)

  if (reach.error === 'dns') return { error: `Could not resolve host: ${host}`, code: 6 }
  if (reach.error === 'timeout')
    return {
      error: `Failed to connect to ${host} port ${port} after 5001 ms: Timeout was reached`,
      code: 28,
    }
  if (reach.error === 'refused' || reach.pod === null)
    return {
      error: `Failed to connect to ${host} port ${port} after 2 ms: Couldn't connect to server`,
      code: 7,
    }

  const answer = appHttp(env, reach.pod, reach.port, path)

  return answer === null ? { error: 'Empty reply from server', code: 52 } : { reply: answer }
}

/** El Ingress que atiende un host y una ruta, con su Service y puerto. */
function routeIngress(
  env: Env,
  host: string,
  path: string,
): { ns: string; service: string; port: number | string } | null {
  let best: { ns: string; service: string; port: number | string; length: number } | null = null

  for (const ing of list(env.cluster, 'Ingress', null)) {
    const spec = obj(ing.spec)
    const cls = str(spec.ingressClassName, 'traefik')

    if (cls !== 'traefik') continue
    for (const rawRule of arr(spec.rules)) {
      const rule = obj(rawRule)
      const ruleHost = str(rule.host)

      if (ruleHost !== '' && ruleHost !== host) continue
      for (const rawPath of arr(obj(rule.http).paths)) {
        const p = obj(rawPath)
        const prefix = str(p.path, '/')
        const type = str(p.pathType, 'Prefix')
        const fits =
          type === 'Exact'
            ? path === prefix
            : prefix === '/' ||
              path === prefix.replace(/\/$/, '') ||
              path.startsWith(`${prefix.replace(/\/$/, '')}/`)
        const service = obj(obj(p.backend).service)
        const port = obj(service.port)

        if (fits && (best === null || prefix.length > best.length))
          best = {
            ns: nsOf(ing),
            service: str(service.name),
            port: port.number !== undefined ? num(port.number) : str(port.name),
            length: prefix.length,
          }
      }
    }
  }

  return best
}

/** Lo que contesta el Ingress a `Host: host` y una ruta. */
function ingressHttp(env: Env, host: string, path: string): HttpReply {
  const route = routeIngress(env, host, path.split('?')[0] ?? '/')

  if (route === null) return reply(404, '404 page not found\n', 'text/plain')

  const svc = getObject(env.cluster, 'Service', route.ns, route.service)
  const entry = arr(svc?.spec?.ports)
    .map((each) => obj(each))
    .find((each) =>
      typeof route.port === 'number'
        ? num(each.port) === route.port
        : str(each.name) === route.port,
    )

  if (svc === undefined || entry === undefined)
    return reply(503, 'no available server\n', 'text/plain')

  const pods = endpointsOf(env, svc).ready
  const pod = pods[0]

  if (pod === undefined) return reply(503, 'no available server\n', 'text/plain')

  const raw = entry.targetPort ?? entry.port ?? 80
  const target = targetOf(pod, typeof raw === 'number' ? raw : str(raw))

  if (!allowed(env, TRAEFIK, pod, target)) return reply(504, 'Gateway Timeout\n', 'text/plain')
  if (!listensOn(env, pod, target)) return reply(502, 'Bad Gateway\n', 'text/plain')

  return appHttp(env, pod, target, path) ?? reply(502, 'Bad Gateway\n', 'text/plain')
}

/** Un Pod listo detrás de lo que apunta un port-forward (`svc/web`, `deploy/web`, `pod/web-…`). */
function forwardPod(
  env: Env,
  ns: string,
  target: string,
  remote: number,
): { pod: K8sObject; port: number } | null {
  const [type = '', name = ''] = target.split('/')

  if (type === 'pod') {
    const pod = getObject(env.cluster, 'Pod', ns, name)

    return pod === undefined ? null : { pod, port: remote }
  }
  if (type === 'svc') {
    const svc = getObject(env.cluster, 'Service', ns, name)
    const pod = svc === undefined ? undefined : endpointsOf(env, svc).ready[0]
    const entry = arr(svc?.spec?.ports)
      .map((each) => obj(each))
      .find((each) => num(each.port) === remote)

    if (pod === undefined) return null

    const raw = entry?.targetPort ?? remote

    return { pod, port: targetOf(pod, typeof raw === 'number' ? raw : str(raw)) }
  }

  const owner = list(env.cluster, 'Pod', ns).find(
    (pod) =>
      (pod.metadata.ownerReferences ?? []).some(
        (ref) => ref.name.startsWith(`${name}-`) || ref.name === name,
      ) && runtimeOf(env, pod).ready,
  )

  return owner === undefined ? null : { pod: owner, port: remote }
}

/** Lo que contesta en tu máquina: los port-forward, los NodePort y el Ingress (`extend.ts` de shellsim). */
export function hostHttp(
  world: World,
  host: string,
  port: number,
  path: string,
  headers: Readonly<Record<string, string>>,
): HttpReply | null {
  if (world.ext?.k8s === undefined) return null

  const env = envOfWorld(world)

  if (host === 'localhost' || host === '127.0.0.1') {
    const forward = env.state.forwards.find((each) => each.local === port)

    if (forward === undefined) return null

    const cluster = env.state.clusters[forward.cluster]

    if (cluster === undefined) return null

    const inCluster = { ...env, cluster }
    const target = forwardPod(inCluster, forward.ns, forward.target, forward.remote)

    if (target === null || !listensOn(inCluster, target.pod, target.port)) return null

    return appHttp(inCluster, target.pod, target.port, path)
  }

  const hostHeader = (headers.host ?? host).replace(/:\d+$/, '')
  const ingressHost = list(env.cluster, 'Ingress', null).some((ing) =>
    arr(obj(ing.spec).rules).some((rule) => str(obj(rule).host) === host),
  )

  if ((NODE_IPS.includes(host) || ingressHost) && (port === 80 || port === 443))
    return ingressHttp(env, hostHeader, path)
  if (NODE_IPS.includes(host)) {
    const svc = list(env.cluster, 'Service', null).find((each) =>
      arr(each.spec?.ports).some((p) => num(obj(p).nodePort) === port),
    )

    if (svc === undefined) return null

    const entry = arr(svc.spec?.ports)
      .map((each) => obj(each))
      .find((each) => num(each.nodePort) === port)
    const pod = endpointsOf(env, svc).ready[0]

    if (pod === undefined || entry === undefined) return null

    const raw = entry.targetPort ?? entry.port ?? 80
    const target = targetOf(pod, typeof raw === 'number' ? raw : str(raw))

    return listensOn(env, pod, target) ? appHttp(env, pod, target, path) : null
  }

  return null
}
