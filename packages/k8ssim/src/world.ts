/**
 * El mundo del curso de Kubernetes: `dev1`, la máquina de trabajo del equipo
 * de Peer4U (la misma del curso de Docker), con `kubectl`, `helm` y
 * `kustomize` y el `kubeconfig` ya puesto, y dos clústeres k3s de tres nodos:
 * `staging` (donde se practica) y `produccion`. Cada clúster trae lo que trae
 * k3s: CoreDNS, Traefik como Ingress, metrics-server y el aprovisionador de
 * volúmenes `local-path`.
 */

import { freshSession, makeDir, writeText } from '@sanatorio/shellsim'
import type { FsNode, Machine, User, World } from '@sanatorio/shellsim'

import { GHCR_TOKEN } from './images.js'
import type { Cluster, K8sObject, K8sState } from './model.js'
import { emptyCluster, keyOf, MI } from './model.js'
import { uidOf } from './util.js'

const H = '/home/peer'
const T0 = Date.UTC(2026, 10, 9, 9, 0, 0) / 1000
/** Hace cuánto que existe el clúster (para la columna AGE): 41 días. */
const BORN = -41 * 86_400

type Spec = string | { text: string; mode?: number }

const FILES: Record<string, Spec> = {
  [`${H}/.bashrc`]: "# ~/.bashrc\nexport EDITOR=nano\nalias ll='ls -alF'\nalias k=kubectl\n",
  [`${H}/notas.txt`]:
    'dev1: la máquina de trabajo del equipo.\nkubectl apunta al clúster de staging (k3s, tres nodos); producción es el contexto produccion.\nEl token del registro (ghcr.io) está en ~/.ghcr-token, como en el curso de Docker.\nLos manifiestos de la tienda viven en ~/tienda.\n',
  [`${H}/.ghcr-token`]: { text: `${GHCR_TOKEN}\n`, mode: 0o600 },
}

const DIRS = [
  '/',
  '/bin',
  '/usr',
  '/usr/bin',
  '/etc',
  '/home',
  '/root',
  '/tmp',
  '/var',
  '/var/log',
  '/srv',
  '/dev',
]

function user(name: string, uid: number, groups: string[], home: string): User {
  return { name, uid, home, shell: '/bin/bash', groups }
}

/** Pone un fichero (y sus carpetas) en una máquina. */
export function place(machine: Machine, path: string, spec: Spec): void {
  const info = typeof spec === 'string' ? { text: spec } : spec
  const owner = path.startsWith(H) ? 'peer' : 'root'
  const parts = path.split('/').filter(Boolean)

  for (let i = 1; i < parts.length; i++) {
    const dir = `/${parts.slice(0, i).join('/')}`

    if (!Object.hasOwn(machine.fs, dir))
      machine.fs[dir] = { kind: 'dir', mode: 0o755, owner, group: owner, mtime: T0 }
  }

  const node: FsNode = {
    kind: 'file',
    text: info.text,
    mode: info.mode ?? 0o644,
    owner,
    group: owner,
    mtime: T0,
  }

  machine.fs[path] = node
}

/** El `~/.kube/config` que corresponde a los contextos de ahora. */
function kubeconfigText(state: K8sState): string {
  const clusters = Object.values(state.clusters)

  return [
    'apiVersion: v1',
    'kind: Config',
    'clusters:',
    ...clusters.flatMap((c) => [
      '- cluster:',
      '    certificate-authority-data: DATA+OMITTED',
      `    server: ${c.server}`,
      `  name: ${c.name}`,
    ]),
    'contexts:',
    ...Object.entries(state.contexts).flatMap(([name, ctx]) => [
      '- context:',
      `    cluster: ${ctx.cluster}`,
      `    namespace: ${ctx.namespace}`,
      `    user: ${ctx.user}`,
      `  name: ${name}`,
    ]),
    `current-context: ${state.current}`,
    'preferences: {}',
    'users:',
    ...[...new Set(Object.values(state.contexts).map((ctx) => ctx.user))].flatMap((name) => [
      `- name: ${name}`,
      '  user:',
      '    client-certificate-data: DATA+OMITTED',
      '    client-key-data: DATA+OMITTED',
    ]),
    '',
  ].join('\n')
}

/** Escribe el kubeconfig en la máquina (después de `kubectl config use-context`…). */
export function saveKubeconfig(world: World, state: K8sState): void {
  const machine = world.machines.dev1
  const root = machine?.users.root

  if (machine === undefined || root === undefined) return

  const now = T0 + world.clock

  if (!Object.hasOwn(machine.fs, `${H}/.kube`))
    makeDir(machine, root, `${H}/.kube`, { parents: true, cmd: 'kubectl', now, umask: 0o022 })
  writeText(machine, root, `${H}/.kube/config`, kubeconfigText(state), {
    cmd: 'kubectl',
    now,
    umask: 0o077,
  })
  const node = machine.fs[`${H}/.kube/config`]

  if (node !== undefined) {
    node.owner = 'peer'
    node.group = 'peer'
  }
}

function object(
  kind: string,
  apiVersion: string,
  name: string,
  ns: string | null,
  rest: Partial<K8sObject> = {},
): K8sObject {
  return {
    apiVersion,
    kind,
    metadata: {
      name,
      ...(ns === null ? {} : { namespace: ns }),
      uid: uidOf(`${kind}/${ns ?? ''}/${name}`),
      creationTimestamp: BORN,
      ...rest.metadata,
    },
    ...(rest.spec === undefined ? {} : { spec: rest.spec }),
    ...(rest.status === undefined ? {} : { status: rest.status }),
    ...(rest.data === undefined ? {} : { data: rest.data }),
  }
}

/** Un Pod del sistema que ya corre (no lo toca ningún controlador del simulador). */
function systemPod(
  name: string,
  image: string,
  node: string,
  ip: string,
  labels: Record<string, string>,
  cpu: number,
  memory: number,
): K8sObject {
  const outcome = { kind: 'serve', listenAfter: 0, logs: [] }

  return object('Pod', 'v1', name, 'kube-system', {
    metadata: { name, labels },
    spec: {
      nodeName: node,
      containers: [
        {
          name: name.split('-')[0] ?? name,
          image,
          resources: { requests: { cpu: `${cpu}m`, memory: `${memory}Mi` } },
        },
      ],
      restartPolicy: 'Always',
    },
    status: {
      phase: 'Running',
      podIP: ip,
      hostIP: '10.0.0.11',
      startedAt: BORN,
      outcomes: { [name.split('-')[0] ?? name]: outcome },
      starts: {},
      bases: {},
    },
  })
}

function cluster(name: string, server: string): Cluster {
  const c = emptyCluster(name, server)
  const add = (o: K8sObject) => {
    c.objects[keyOf(o.kind, o.metadata.namespace ?? '', o.metadata.name)] = o
  }

  for (const ns of ['default', 'kube-system', 'kube-public', 'kube-node-lease'])
    add(
      object('Namespace', 'v1', ns, null, {
        metadata: { name: ns, labels: { 'kubernetes.io/metadata.name': ns } },
        status: { phase: 'Active' },
      }),
    )
  for (let i = 1; i <= 3; i++)
    add(
      object('Node', 'v1', `nodo-${i}`, null, {
        metadata: {
          name: `nodo-${i}`,
          labels: {
            'kubernetes.io/hostname': `nodo-${i}`,
            'kubernetes.io/os': 'linux',
            'kubernetes.io/arch': 'amd64',
            ...(i === 1 ? { 'node-role.kubernetes.io/control-plane': 'true' } : {}),
          },
        },
        spec: {},
        status: {
          capacity: { cpu: '2', memory: '4Gi', pods: '110' },
          allocatable: { cpu: '2', memory: `${4096 - 256}Mi`, pods: '110' },
          addresses: [{ type: 'InternalIP', address: `10.0.0.${10 + i}` }],
          nodeInfo: {
            kubeletVersion: 'v1.31.2+k3s1',
            osImage: 'Ubuntu 24.04.1 LTS',
            containerRuntimeVersion: 'containerd://1.7.22-k3s1',
          },
          conditions: [{ type: 'Ready', status: 'True', reason: 'KubeletReady' }],
        },
      }),
    )
  add(
    object('StorageClass', 'storage.k8s.io/v1', 'local-path', null, {
      metadata: {
        name: 'local-path',
        annotations: { 'storageclass.kubernetes.io/is-default-class': 'true' },
      },
      spec: {
        provisioner: 'rancher.io/local-path',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
      },
    }),
  )
  add(
    object('IngressClass', 'networking.k8s.io/v1', 'traefik', null, {
      metadata: {
        name: 'traefik',
        annotations: { 'ingressclass.kubernetes.io/is-default-class': 'true' },
      },
      spec: { controller: 'traefik.io/ingress-controller' },
    }),
  )
  add(
    systemPod(
      'coredns-7b98449c4-kq2xv',
      'rancher/mirrored-coredns-coredns:1.11.3',
      'nodo-1',
      '10.42.0.2',
      { 'k8s-app': 'kube-dns' },
      100,
      70,
    ),
  )
  add(
    systemPod(
      'traefik-6d5f8c7b9-k8s42',
      'rancher/mirrored-library-traefik:3.1.6',
      'nodo-1',
      '10.42.0.3',
      { 'app.kubernetes.io/name': 'traefik' },
      100,
      50,
    ),
  )
  add(
    systemPod(
      'metrics-server-5985cbc9d7-7xhmw',
      'rancher/mirrored-metrics-server:v0.7.2',
      'nodo-2',
      '10.42.1.2',
      { 'k8s-app': 'metrics-server' },
      100,
      70,
    ),
  )
  add(
    systemPod(
      'local-path-provisioner-595dcfc56f-2vq5n',
      'rancher/local-path-provisioner:v0.0.30',
      'nodo-3',
      '10.42.2.2',
      { app: 'local-path-provisioner' },
      0,
      0,
    ),
  )
  add(
    object('Service', 'v1', 'kubernetes', 'default', {
      metadata: { name: 'kubernetes', labels: { component: 'apiserver', provider: 'kubernetes' } },
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.43.0.1',
        ports: [{ name: 'https', port: 443, protocol: 'TCP', targetPort: 6443 }],
      },
    }),
  )
  add(
    object('Service', 'v1', 'kube-dns', 'kube-system', {
      metadata: { name: 'kube-dns', labels: { 'k8s-app': 'kube-dns' } },
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.43.0.10',
        selector: { 'k8s-app': 'kube-dns' },
        ports: [{ name: 'dns', port: 53, protocol: 'UDP', targetPort: 53 }],
      },
    }),
  )
  add(
    object('Service', 'v1', 'traefik', 'kube-system', {
      metadata: { name: 'traefik', labels: { 'app.kubernetes.io/name': 'traefik' } },
      spec: {
        type: 'LoadBalancer',
        clusterIP: '10.43.12.80',
        selector: { 'app.kubernetes.io/name': 'traefik' },
        ports: [
          { name: 'web', port: 80, protocol: 'TCP', targetPort: 'web', nodePort: 31080 },
          {
            name: 'websecure',
            port: 443,
            protocol: 'TCP',
            targetPort: 'websecure',
            nodePort: 31443,
          },
        ],
      },
      status: {
        loadBalancer: { ingress: [{ ip: '10.0.0.11' }, { ip: '10.0.0.12' }, { ip: '10.0.0.13' }] },
      },
    }),
  )
  c.seq = 100
  c.now = 0

  return c
}

function dev1(): Machine {
  const users = [user('root', 0, ['root'], '/root'), user('peer', 1000, ['peer', 'sudo'], H)]
  const machine: Machine = {
    name: 'dev1',
    ip: '10.0.0.30',
    fs: {},
    users: Object.fromEntries(users.map((each) => [each.name, each])),
    groups: { root: 0, sudo: 27, peer: 1000 },
    procs: [],
    nextPid: 1200,
    services: {},
    journal: [],
    crontabs: {},
    packages: { kubectl: '1.31.2', helm: '3.16.2', kustomize: '5.5.0' },
    disk: 64 * 1024 * MI,
    baseUsed: 14 * 1024 * MI,
  }

  for (const dir of DIRS)
    machine.fs[dir] = {
      kind: 'dir',
      mode: dir === '/tmp' ? 0o1777 : dir === '/root' ? 0o700 : 0o755,
      owner: 'root',
      group: 'root',
      mtime: T0,
    }
  machine.fs[H] = { kind: 'dir', mode: 0o750, owner: 'peer', group: 'peer', mtime: T0 }
  place(machine, '/etc/hostname', 'dev1\n')
  place(
    machine,
    '/etc/passwd',
    'root:x:0:0:root:/root:/bin/bash\npeer:x:1000:1000:peer:/home/peer:/bin/bash\n',
  )
  place(machine, '/etc/group', 'root:x:0:\nsudo:x:27:peer\npeer:x:1000:\n')
  // El Ingress de staging contesta en las IP de los nodos: `tienda.local` apunta al primero.
  place(
    machine,
    '/etc/hosts',
    '127.0.0.1 localhost\n10.0.0.30 dev1\n10.0.0.11 tienda.local staging.tienda.local\n',
  )
  place(machine, '/dev/null', '')
  for (const [path, spec] of Object.entries(FILES)) place(machine, path, spec)

  return machine
}

/** El estado de Kubernetes de partida: dos contextos, cada uno con su clúster. */
function initialState(): K8sState {
  return {
    contexts: {
      staging: { cluster: 'staging', namespace: 'default', user: 'peer' },
      produccion: { cluster: 'produccion', namespace: 'default', user: 'peer' },
    },
    current: 'staging',
    clusters: {
      staging: cluster('staging', 'https://10.0.0.11:6443'),
      produccion: cluster('produccion', 'https://10.0.1.11:6443'),
    },
    forwards: [],
    waited: 0,
    repos: {},
  }
}

/** El mundo con el que empieza cada unidad (antes de su preparación). */
export function baseWorld(): World {
  const machine = dev1()
  const peer = machine.users.peer ?? user('peer', 1000, ['peer'], H)
  const state = initialState()
  const world: World = {
    machines: { dev1: machine },
    session: freshSession('dev1', peer),
    stack: [],
    dns: {},
    clock: 0,
    seed: 4242,
    ext: { k8s: state },
  }

  saveKubeconfig(world, state)

  return world
}
