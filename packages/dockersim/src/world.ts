/**
 * El mundo del curso de Docker: `dev1`, la máquina de trabajo del equipo de
 * Peer4U, con Docker instalado y tres proyectos en la carpeta de `peer`: una
 * web estática (`~/web`), la API de Node (`~/api`) y el frontend (`~/front`).
 * Los ficheros son pocos y cortos, pero dicen lo que dirían los de verdad:
 * `node_modules` de 180 MB, un `.env` con secretos, el `.git` con su commit.
 */

import { freshSession } from '@sanatorio/shellsim'
import type { FsNode, Machine, User, World } from '@sanatorio/shellsim'

import { emptyState, MB } from './model.js'

const H = '/home/peer'
const T0 = Date.UTC(2026, 10, 8, 9, 0, 0) / 1000

export const API_PACKAGE = `{
  "name": "peer4u-api",
  "version": "1.4.0",
  "main": "server.js",
  "scripts": { "start": "node server.js", "test": "node --test" },
  "dependencies": { "express": "^4.21.1", "pg": "^8.13.0" },
  "devDependencies": { "eslint": "^9.14.0" }
}
`

/** La API: arranca sin base de datos, y con `DATABASE_URL` comprueba que llega a ella en `/health`. */
const API_SERVER = `const express = require('express')
const { Pool } = require('pg')

const app = express()
const port = process.env.PORT || 3000
const db = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null

app.get('/', (req, res) => res.json({ service: 'peer4u-api', version: '1.4.0' }))
app.get('/health', async (req, res) => {
  if (!db) return res.json({ status: 'ok' })
  try { await db.query('SELECT 1'); res.json({ status: 'ok', db: 'up' }) }
  catch { res.status(503).json({ status: 'error', db: 'down' }) }
})

app.listen(port, () => console.log(\`api listening on :\${port}\`))
`

/** La misma API, pero en producción: sin `DATABASE_URL` no arranca. */
export const API_SERVER_STRICT = API_SERVER.replace(
  'const db = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null',
  "if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1) }\nconst db = new Pool({ connectionString: process.env.DATABASE_URL })",
)

const FRONT_PACKAGE = `{
  "name": "peer4u-front",
  "version": "2.1.0",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "vue": "^3.5.12" },
  "devDependencies": { "vite": "^5.4.10" }
}
`

type Spec = string | { text: string; size?: number; mode?: number }

const FILES: Record<string, Spec> = {
  [`${H}/.bashrc`]: "# ~/.bashrc\nexport EDITOR=nano\nalias ll='ls -alF'\n",
  [`${H}/notas.txt`]:
    'dev1: la máquina de desarrollo del equipo.\nProyectos: ~/web (estática), ~/api (Node) y ~/front (Vite).\nEl token del registro (ghcr.io) está en ~/.ghcr-token.\n',
  [`${H}/.ghcr-token`]: { text: 'ghp_peer4uDemoToken0000000000000000000\n', mode: 0o600 },
  [`${H}/web/index.html`]: '<h1>Peer4U status: todo en verde</h1>\n',
  [`${H}/api/package.json`]: API_PACKAGE,
  [`${H}/api/package-lock.json`]:
    '{ "name": "peer4u-api", "lockfileVersion": 3, "packages": {} }\n',
  [`${H}/api/server.js`]: API_SERVER,
  [`${H}/api/README.md`]:
    '# peer4u-api\n\nnpm ci && npm start. Necesita DATABASE_URL en producción.\n',
  [`${H}/api/.env`]: {
    text: 'DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u\nAPI_SECRET=s3cr3t-no-lo-subas\n',
    mode: 0o600,
  },
  [`${H}/api/.gitignore`]: 'node_modules\n.env\n*.log\n',
  [`${H}/api/node_modules/.package-lock.json`]: {
    text: '{"dev": true}\n',
    size: Math.round(180 * MB),
  },
  [`${H}/api/logs/debug.log`]: { text: 'DEBUG arranque lento\n', size: Math.round(2.4 * MB) },
  [`${H}/api/.git/HEAD`]: 'ref: refs/heads/main\n',
  [`${H}/api/.git/refs/heads/main`]: '4f2a9c1e8b7d6a5f4e3d2c1b0a9f8e7d6c5b4a39\n',
  [`${H}/front/package.json`]: FRONT_PACKAGE,
  [`${H}/front/package-lock.json`]:
    '{ "name": "peer4u-front", "lockfileVersion": 3, "packages": {} }\n',
  [`${H}/front/index.html`]:
    '<!doctype html>\n<title>Peer4U</title>\n<div id="app">Peer4U</div>\n<script type="module" src="/src/main.js"></script>\n',
  [`${H}/front/src/main.js`]: "import { createApp } from 'vue'\ncreateApp({}).mount('#app')\n",
  [`${H}/front/node_modules/.package-lock.json`]: {
    text: '{"dev": true}\n',
    size: Math.round(96 * MB),
  },
  [`${H}/front/.git/HEAD`]: 'ref: refs/heads/main\n',
  [`${H}/front/.git/refs/heads/main`]: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678\n',
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
  '/var/lib',
  '/var/lib/docker',
  '/srv',
  '/dev',
]

function user(name: string, uid: number, groups: string[], home: string): User {
  return { name, uid, home, shell: '/bin/bash', groups }
}

/** Pone un fichero (y sus carpetas) en una máquina. */
export function place(
  machine: Machine,
  path: string,
  spec: Spec,
  owner = path.startsWith(H) ? 'peer' : 'root',
): void {
  const info = typeof spec === 'string' ? { text: spec } : spec
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

  if (info.size !== undefined) node.size = info.size
  machine.fs[path] = node
}

function dev1(): Machine {
  const users = [
    user('root', 0, ['root'], '/root'),
    user('peer', 1000, ['peer', 'sudo', 'docker'], H),
  ]
  const machine: Machine = {
    name: 'dev1',
    ip: '10.42.0.30',
    fs: {},
    users: Object.fromEntries(users.map((each) => [each.name, each])),
    groups: { root: 0, sudo: 27, docker: 998, peer: 1000 },
    procs: [],
    nextPid: 1200,
    services: {},
    journal: [],
    crontabs: {},
    packages: {},
    disk: 64 * 1024 * MB,
    baseUsed: 14 * 1024 * MB,
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
    '/etc/os-release',
    'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nID=ubuntu\n',
  )
  place(
    machine,
    '/etc/passwd',
    'root:x:0:0:root:/root:/bin/bash\npeer:x:1000:1000:peer:/home/peer:/bin/bash\n',
  )
  place(machine, '/etc/group', 'root:x:0:\nsudo:x:27:peer\ndocker:x:998:peer\npeer:x:1000:\n')
  place(machine, '/etc/hosts', '127.0.0.1 localhost\n10.42.0.30 dev1\n')
  place(machine, '/dev/null', '')
  for (const [path, spec] of Object.entries(FILES)) place(machine, path, spec)

  return machine
}

/** El mundo con el que empieza cada unidad (antes de su preparación). */
export function baseWorld(): World {
  const machine = dev1()
  const peer = machine.users.peer ?? user('peer', 1000, ['peer'], H)

  return {
    machines: { dev1: machine },
    session: freshSession('dev1', peer),
    stack: [],
    dns: {},
    clock: 0,
    seed: 4242,
    ext: { docker: emptyState() },
  }
}
