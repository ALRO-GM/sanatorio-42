/**
 * El catálogo de Docker Hub del simulador: unas pocas imágenes oficiales,
 * fijas, con tamaños, capas y configuración parecidos a los de verdad (en
 * noviembre de 2026). Es lo que se puede descargar con `docker pull` o usar en
 * un `FROM` sin publicarlo antes. Lo publicado por quien juega (en `ghcr.io`)
 * va aparte, en el registro del estado (`model.ts`).
 */

import { digestOf, hex64 } from './hash.js'
import type { Image, ImageConfig, Kind } from './model.js'
import { MB } from './model.js'

type Entry = {
  /** Etiquetas que apuntan a la misma imagen; la primera es la «de verdad». */
  tags: string[]
  kind: Kind
  /** Tamaño total en MB y cómo se reparte en capas (lo que enseña `docker history`). */
  layers: [string, number][]
  config: Partial<ImageConfig>
  files?: Record<string, string>
  users?: string[]
  cves?: Image['cves']
}

const NGINX_INDEX = `<!DOCTYPE html>
<html>
<head><title>Welcome to nginx!</title></head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and working.</p>
</body>
</html>
`

const NGINX_DEFAULT = `server {
    listen       80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
}
`

const nginxFiles = (os: string): Record<string, string> => ({
  '/usr/share/nginx/html/index.html': NGINX_INDEX,
  '/usr/share/nginx/html/50x.html': '<h1>An error occurred.</h1>\n',
  '/etc/nginx/conf.d/default.conf': NGINX_DEFAULT,
  '/etc/nginx/nginx.conf':
    'user  nginx;\nworker_processes  auto;\nevents { worker_connections 1024; }\nhttp { include /etc/nginx/conf.d/*.conf; }\n',
  '/etc/os-release': os,
})

const ALPINE_OS =
  'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME="Alpine Linux v3.20"\n'
const DEBIAN_OS =
  'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nID=debian\n'

const NODE_ENV = [
  'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  'NODE_VERSION=22.11.0',
]
const PATH = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']

const ENTRIES: Entry[] = [
  {
    tags: ['hello-world:latest'],
    kind: 'hello',
    layers: [['COPY hello / # buildkit', 0.013]],
    config: { cmd: ['/hello'] },
  },
  {
    tags: ['alpine:3.20', 'alpine:latest', 'alpine:3.20.3', 'alpine:3'],
    kind: 'alpine',
    layers: [['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8]],
    config: { cmd: ['/bin/sh'], env: PATH },
    files: { '/etc/os-release': ALPINE_OS },
  },
  {
    tags: ['busybox:latest', 'busybox:1.37'],
    kind: 'alpine',
    layers: [['ADD busybox.tar.xz / # buildkit', 4.3]],
    config: { cmd: ['sh'], env: PATH },
  },
  {
    tags: ['nginx:1.27', 'nginx:latest', 'nginx:1', 'nginx:1.27.2', 'nginx:1.27-bookworm'],
    kind: 'nginx',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm', 74.8],
      ['RUN /bin/sh -c set -x && apt-get update && apt-get install nginx', 112.4],
      ['COPY docker-entrypoint.sh / # buildkit', 0.01],
      ['COPY 10-listen-on-ipv6-by-default.sh /docker-entrypoint.d # buildkit', 4.8],
    ],
    config: {
      entrypoint: ['/docker-entrypoint.sh'],
      cmd: ['nginx', '-g', 'daemon off;'],
      exposed: ['80/tcp'],
      env: [...PATH, 'NGINX_VERSION=1.27.2'],
    },
    files: nginxFiles(DEBIAN_OS),
    users: ['root', 'nginx'],
    cves: { critical: 0, high: 4, medium: 17 },
  },
  {
    tags: ['nginx:1.27-alpine', 'nginx:alpine', 'nginx:1.27.2-alpine', 'nginx:1-alpine'],
    kind: 'nginx',
    layers: [
      ['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8],
      ['RUN /bin/sh -c set -x && apk add --no-cache nginx', 38.6],
      ['COPY docker-entrypoint.sh / # buildkit', 0.01],
      ['COPY 30-tune-worker-processes.sh /docker-entrypoint.d # buildkit', 1.6],
    ],
    config: {
      entrypoint: ['/docker-entrypoint.sh'],
      cmd: ['nginx', '-g', 'daemon off;'],
      exposed: ['80/tcp'],
      env: [...PATH, 'NGINX_VERSION=1.27.2'],
    },
    files: nginxFiles(ALPINE_OS),
    users: ['root', 'nginx'],
  },
  {
    tags: ['redis:7', 'redis:latest', 'redis:7.4', 'redis:7.4.1'],
    kind: 'redis',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm', 74.8],
      ['RUN /bin/sh -c set -eux; apt-get install redis', 42.1],
      ['COPY docker-entrypoint.sh /usr/local/bin/ # buildkit', 0.01],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['redis-server'],
      exposed: ['6379/tcp'],
      env: [...PATH, 'REDIS_VERSION=7.4.1'],
      workdir: '/data',
    },
    users: ['root', 'redis'],
    cves: { critical: 0, high: 2, medium: 9 },
  },
  {
    tags: ['redis:7-alpine', 'redis:alpine', 'redis:7.4-alpine', 'redis:7.4.1-alpine'],
    kind: 'redis',
    layers: [
      ['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8],
      ['RUN /bin/sh -c set -eux; apk add redis', 33.4],
      ['COPY docker-entrypoint.sh /usr/local/bin/ # buildkit', 0.01],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['redis-server'],
      exposed: ['6379/tcp'],
      env: [...PATH, 'REDIS_VERSION=7.4.1'],
      workdir: '/data',
    },
    users: ['root', 'redis'],
  },
  {
    tags: ['postgres:16', 'postgres:latest', 'postgres:16.4', 'postgres:16-bookworm'],
    kind: 'postgres',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm', 74.8],
      ['RUN /bin/sh -c set -ex; apt-get install postgresql-16', 351.2],
      ['ENV PGDATA=/var/lib/postgresql/data', 0],
      ['VOLUME [/var/lib/postgresql/data]', 0],
      ['COPY docker-entrypoint.sh /usr/local/bin/ # buildkit', 6],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['postgres'],
      exposed: ['5432/tcp'],
      env: [...PATH, 'PG_MAJOR=16', 'PGDATA=/var/lib/postgresql/data'],
    },
    users: ['root', 'postgres'],
    cves: { critical: 0, high: 3, medium: 21 },
  },
  {
    tags: ['postgres:16-alpine', 'postgres:alpine', 'postgres:16.4-alpine'],
    kind: 'postgres',
    layers: [
      ['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8],
      ['RUN /bin/sh -c set -eux; apk add postgresql16', 262.4],
      ['ENV PGDATA=/var/lib/postgresql/data', 0],
      ['VOLUME [/var/lib/postgresql/data]', 0],
      ['COPY docker-entrypoint.sh /usr/local/bin/ # buildkit', 6],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['postgres'],
      exposed: ['5432/tcp'],
      env: [...PATH, 'PG_MAJOR=16', 'PGDATA=/var/lib/postgresql/data'],
    },
    users: ['root', 'postgres'],
  },
  {
    tags: ['node:22', 'node:latest', 'node:lts', 'node:22.11.0', 'node:22.11', 'node:22-bookworm'],
    kind: 'node',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm', 116.5],
      ['RUN /bin/sh -c apt-get install curl git build-essential python3', 830.4],
      ['RUN /bin/sh -c groupadd --gid 1000 node && useradd --uid 1000 node', 0.01],
      ['ENV NODE_VERSION=22.11.0', 0],
      ['RUN /bin/sh -c curl -fsSLO nodejs.org/dist/v22.11.0/node.tar.xz', 173.1],
      ['CMD ["node"]', 0],
    ],
    config: { entrypoint: ['docker-entrypoint.sh'], cmd: ['node'], env: NODE_ENV },
    files: { '/etc/os-release': DEBIAN_OS },
    users: ['root', 'node'],
    cves: { critical: 0, high: 12, medium: 48 },
  },
  {
    tags: ['node:22-slim', 'node:lts-slim', 'node:22.11.0-slim', 'node:22-bookworm-slim'],
    kind: 'node',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm-slim', 74.8],
      ['RUN /bin/sh -c groupadd --gid 1000 node && useradd --uid 1000 node', 0.01],
      ['ENV NODE_VERSION=22.11.0', 0],
      ['RUN /bin/sh -c curl -fsSLO nodejs.org/dist/v22.11.0/node.tar.xz', 165.2],
      ['CMD ["node"]', 0],
    ],
    config: { entrypoint: ['docker-entrypoint.sh'], cmd: ['node'], env: NODE_ENV },
    files: { '/etc/os-release': DEBIAN_OS },
    users: ['root', 'node'],
    cves: { critical: 0, high: 1, medium: 14 },
  },
  {
    tags: [
      'node:22-alpine',
      'node:lts-alpine',
      'node:22.11.0-alpine',
      'node:22.11-alpine',
      'node:22-alpine3.20',
    ],
    kind: 'node',
    layers: [
      ['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8],
      ['RUN /bin/sh -c addgroup -g 1000 node && adduser -u 1000 -G node node', 0.01],
      ['ENV NODE_VERSION=22.11.0', 0],
      ['RUN /bin/sh -c apk add --no-cache libstdc++ && install node', 148.6],
      ['RUN /bin/sh -c apk add --no-cache yarn', 2.6],
      ['CMD ["node"]', 0],
    ],
    config: { entrypoint: ['docker-entrypoint.sh'], cmd: ['node'], env: NODE_ENV },
    files: { '/etc/os-release': ALPINE_OS },
    users: ['root', 'node'],
  },
  {
    tags: ['node:20-alpine'],
    kind: 'node',
    layers: [
      ['ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit', 7.8],
      ['RUN /bin/sh -c addgroup -g 1000 node && adduser -u 1000 -G node node', 0.01],
      ['ENV NODE_VERSION=20.18.0', 0],
      ['RUN /bin/sh -c apk add --no-cache libstdc++ && install node', 124.9],
      ['CMD ["node"]', 0],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['node'],
      env: [...PATH, 'NODE_VERSION=20.18.0'],
    },
    files: { '/etc/os-release': ALPINE_OS },
    users: ['root', 'node'],
    cves: { critical: 0, high: 0, medium: 2 },
  },
  {
    tags: ['node:18'],
    kind: 'node',
    layers: [
      ['ADD rootfs.tar.xz / # debian buster', 114.1],
      ['RUN /bin/sh -c apt-get install curl git build-essential python3', 812.7],
      ['ENV NODE_VERSION=18.12.0', 0],
      ['RUN /bin/sh -c curl -fsSLO nodejs.org/dist/v18.12.0/node.tar.xz', 163.3],
      ['CMD ["node"]', 0],
    ],
    config: {
      entrypoint: ['docker-entrypoint.sh'],
      cmd: ['node'],
      env: [...PATH, 'NODE_VERSION=18.12.0'],
    },
    files: { '/etc/os-release': DEBIAN_OS },
    users: ['root', 'node'],
    cves: { critical: 4, high: 37, medium: 112 },
  },
  {
    tags: ['python:3.12-slim'],
    kind: 'python',
    layers: [
      ['ADD rootfs.tar.xz / # debian bookworm-slim', 74.8],
      ['RUN /bin/sh -c set -eux; install python 3.12.7', 49.6],
      ['CMD ["python3"]', 0],
    ],
    config: { cmd: ['python3'], env: [...PATH, 'PYTHON_VERSION=3.12.7'] },
    files: { '/etc/os-release': DEBIAN_OS },
    cves: { critical: 0, high: 1, medium: 11 },
  },
  {
    tags: ['gcr.io/distroless/nodejs22-debian12:latest'],
    kind: 'distroless',
    layers: [
      ['bazel build //base:static_root_debian12', 2.1],
      ['bazel build //nodejs:nodejs22_root_debian12', 124.3],
    ],
    config: { entrypoint: ['/nodejs/bin/node'], cmd: null, env: PATH },
  },
  {
    tags: ['gcr.io/distroless/nodejs22-debian12:nonroot'],
    kind: 'distroless',
    layers: [
      ['bazel build //base:static_root_debian12', 2.1],
      ['bazel build //nodejs:nodejs22_root_debian12', 124.3],
    ],
    config: { entrypoint: ['/nodejs/bin/node'], cmd: null, env: PATH, user: '65532' },
    users: ['root', 'nonroot'],
  },
]

const EMPTY_CONFIG: ImageConfig = {
  user: '',
  env: [],
  cmd: null,
  entrypoint: null,
  workdir: '/',
  exposed: [],
  labels: {},
  healthcheck: null,
}

function imageOf(entry: Entry): Image {
  const name = entry.tags[0] ?? ''
  const layers = entry.layers.map(([createdBy, size], index) => ({
    id: digestOf(`${name}#${index}`),
    size: Math.round(size * MB),
    createdBy,
  }))

  return {
    id: digestOf(`catalog:${name}`),
    layers,
    config: { ...EMPTY_CONFIG, ...entry.config },
    files: { ...(entry.files ?? {}) },
    sizes: {},
    users: entry.users ?? ['root'],
    kind: entry.kind,
    base: name,
    created: -1,
    cves: entry.cves ?? { critical: 0, high: 0, medium: 0 },
    platforms: ['linux/amd64', 'linux/arm64'],
  }
}

/**
 * Una referencia a su forma corta: `docker.io/library/nginx:1.27` y `nginx`
 * → `nginx:1.27` y `nginx:latest`. Las de otros registros se quedan enteras.
 */
export function normalizeRef(ref: string): string {
  let name = ref
    .trim()
    .replace(/^docker\.io\//, '')
    .replace(/^library\//, '')

  if (name.includes('@')) return name

  const slash = name.lastIndexOf('/')

  if (name.lastIndexOf(':') <= slash) name = `${name}:latest`

  return name
}

/** Una referencia que se puede escribir (`registro/ruta:etiqueta`, en minúsculas). */
export function validRef(ref: string): boolean {
  return /^[a-z0-9]+([._-][a-z0-9]+)*(:\d+)?(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[A-Za-z0-9_][A-Za-z0-9._-]{0,127})?(@sha256:[0-9a-f]{64})?$/.test(
    ref.replace(/^docker\.io\//, ''),
  )
}

/** El registro de una referencia (`ghcr.io` de `ghcr.io/peer4u/api:1.0`), o `docker.io`. */
export function registryOf(ref: string): string {
  const first = ref.split('/')[0] ?? ''

  return ref.includes('/') && (first.includes('.') || first.includes(':') || first === 'localhost')
    ? first
    : 'docker.io'
}

const CATALOG = new Map<string, Image>()

for (const entry of ENTRIES) {
  const image = imageOf(entry)

  for (const tag of entry.tags) CATALOG.set(tag, image)
}

/** ¿Existe el repositorio en el Docker Hub del simulador (con alguna etiqueta)? */
export function knownRepo(repo: string): boolean {
  return [...CATALOG.keys()].some((tag) => tag.slice(0, tag.lastIndexOf(':')) === repo)
}

/** Una imagen del catálogo por su referencia (también `nginx@sha256:…`). */
export function fromCatalog(ref: string): Image | undefined {
  const name = normalizeRef(ref)
  const at = name.indexOf('@')

  if (at >= 0) {
    const found = CATALOG.get(`${name.slice(0, at)}:latest`) ?? CATALOG.get(name.slice(0, at))
    const wanted = name.slice(at + 1)

    if (found !== undefined && repoDigest(found) === wanted) return found

    return [...CATALOG.values()].find(
      (image) => image.base.startsWith(name.slice(0, at)) && repoDigest(image) === wanted,
    )
  }

  return CATALOG.get(name)
}

/** El digest con el que se publica una imagen (lo que se fija con `@sha256:…`). */
export const repoDigest = (image: Image): string => `sha256:${hex64(`repo:${image.id}`)}`
