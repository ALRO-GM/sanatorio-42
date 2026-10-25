/**
 * El mundo de partida del curso: dos servidores de una empresa pequeña que
 * despliega Peer4U. `web1` (nginx delante de la API de Node, cron, ssh) y
 * `db1` (PostgreSQL y las copias). Entras como `peer`, con sudo, en
 * `/home/peer` de `web1`. Los registros salen de una semilla fija: son los
 * mismos en la web y en la API, así que las respuestas no cambian.
 */

import { freshSession } from './interp.js'
import type { FsNode, Machine, Service, User, World } from './model.js'

const DAY = 86_400

type Spec = { owner?: string; group?: string; mode?: number; mtime?: number; size?: number }

/** Un generador de números fijo (el mismo mundo siempre). */
function lcg(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1103515245 + 12345) % 2147483648

    return state / 2147483648
  }
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T
}

/** Pesos: cada elemento tantas veces como su número. */
function weighted<T>(entries: [T, number][]): T[] {
  return entries.flatMap(([item, n]) => Array.from({ length: n }, () => item))
}

const IPS = weighted([
  ['10.42.0.7', 9],
  ['203.0.113.9', 14],
  ['198.51.100.23', 6],
  ['192.0.2.44', 4],
  ['10.42.0.12', 3],
  ['203.0.113.77', 2],
])

const PATHS = weighted([
  ['/', 6],
  ['/api/peers', 9],
  ['/api/health', 4],
  ['/api/sprints', 5],
  ['/login', 3],
  ['/wp-login.php', 3],
  ['/static/app.js', 4],
])

const STATUS = weighted([
  [200, 22],
  [304, 3],
  [404, 4],
  [500, 3],
  [502, 2],
])

const pad = (n: number) => String(n).padStart(2, '0')

/** Un registro de acceso de nginx (formato combinado) con 60 peticiones. */
function accessLog(): string {
  const random = lcg(42)
  const lines: string[] = []

  for (let i = 0; i < 60; i++) {
    const ip = pick(random, IPS)
    const path = ip === '203.0.113.9' && random() < 0.5 ? '/wp-login.php' : pick(random, PATHS)
    const status = path === '/wp-login.php' ? 404 : pick(random, STATUS)
    const bytes =
      status === 200
        ? 200 + Math.floor(random() * 4800)
        : status === 304
          ? 0
          : 150 + Math.floor(random() * 50)
    const minute = Math.floor((i * 50) / 60)
    const second = (i * 50) % 60
    const method = path === '/login' ? 'POST' : 'GET'

    lines.push(
      `${ip} - - [25/Oct/2026:08:${pad(minute)}:${pad(second)} +0000] "${method} ${path} HTTP/1.1" ${status} ${bytes} "-" "${ip.startsWith('10.') ? 'curl/8.5.0' : 'Mozilla/5.0'}"`,
    )
  }

  return `${lines.join('\n')}\n`
}

/** El registro de la API: INFO, WARN y ERROR, con un fallo de base de datos que se repite. */
function appLog(): string {
  const random = lcg(7)
  const lines: string[] = []
  const messages = weighted<[string, string]>([
    [['INFO', 'GET /api/peers 200 12ms'], 12],
    [['INFO', 'GET /api/sprints 200 18ms'], 8],
    [['WARN', 'slow query: 812ms SELECT * FROM peers'], 4],
    [['ERROR', 'db connection refused (db1:5432)'], 5],
    [['ERROR', 'timeout calling 42 API'], 2],
    [['INFO', 'cache warmed: 120 entries'], 3],
  ])

  for (let i = 0; i < 40; i++) {
    const [level, message] = pick(random, messages)

    lines.push(
      `2026-10-25T08:${pad(Math.floor(i * 1.4))}:${pad((i * 17) % 60)}Z ${level.padEnd(5)} ${message}`,
    )
  }

  return `${lines.join('\n')}\n`
}

function authLog(): string {
  const random = lcg(99)
  const lines: string[] = []
  const users = ['admin', 'root', 'test', 'oracle', 'ubuntu']
  const attackers = weighted([
    ['203.0.113.9', 6],
    ['198.51.100.23', 3],
    ['192.0.2.200', 2],
  ])

  for (let i = 0; i < 24; i++) {
    const time = `Oct 25 07:${pad(10 + i)}:${pad((i * 23) % 60)}`

    if (i % 6 === 3)
      lines.push(
        `${time} web1 sshd[${1200 + i}]: Accepted publickey for peer from 10.42.0.7 port ${50000 + i} ssh2`,
      )
    else
      lines.push(
        `${time} web1 sshd[${1200 + i}]: Failed password for invalid user ${pick(random, users)} from ${pick(random, attackers)} port ${40000 + i * 7} ssh2`,
      )
  }

  return `${lines.join('\n')}\n`
}

class Builder {
  readonly fs: Record<string, FsNode> = {}

  dir(path: string, spec: Spec = {}): this {
    this.fs[path] = {
      kind: 'dir',
      mode: spec.mode ?? 0o755,
      owner: spec.owner ?? 'root',
      group: spec.group ?? spec.owner ?? 'root',
      mtime: spec.mtime ?? -30 * DAY,
    }

    return this
  }

  file(path: string, text: string, spec: Spec = {}): this {
    this.fs[path] = {
      kind: 'file',
      text,
      mode: spec.mode ?? 0o644,
      owner: spec.owner ?? 'root',
      group: spec.group ?? spec.owner ?? 'root',
      mtime: spec.mtime ?? -2 * DAY,
      ...(spec.size === undefined ? {} : { size: spec.size }),
    }

    return this
  }
}

const EPOCH_OFFSET = Date.UTC(2026, 9, 25, 9, 0, 0) / 1000

/** Las fechas de los nodos son segundos absolutos: se pasan de «relativo al principio» a absolutos. */
function absolute(fs: Record<string, FsNode>): Record<string, FsNode> {
  for (const node of Object.values(fs)) node.mtime += EPOCH_OFFSET

  return fs
}

function user(
  name: string,
  uid: number,
  groups: string[],
  home = `/home/${name}`,
  shell = '/bin/bash',
): User {
  return { name, uid, home, shell, groups }
}

function service(
  name: string,
  rest: Omit<Service, 'name' | 'active' | 'enabled' | 'failed'> & Partial<Service>,
): Service {
  return { name, active: true, enabled: true, failed: false, ...rest }
}

/** Lo común de las dos máquinas: el esqueleto de Ubuntu. */
function skeleton(name: string, users: User[]): Builder {
  const b = new Builder()

  b.dir('/')
    .dir('/bin')
    .dir('/usr')
    .dir('/usr/bin')
    .dir('/usr/sbin')
    .dir('/usr/local')
    .dir('/usr/local/bin')
    .dir('/etc')
    .dir('/home')
    .dir('/root', { mode: 0o700 })
    .file('/root/.bashrc', '# ~/.bashrc de root\n', { mode: 0o600 })
    .dir('/tmp', { mode: 0o1777 })
    .dir('/var')
    .dir('/var/log', { mode: 0o775, group: 'syslog' })
    .dir('/var/lib')
    .dir('/opt')
    .dir('/srv')
    .dir('/dev')
    .file('/dev/null', '', { mode: 0o666 })
    .file('/etc/hostname', `${name}\n`)
    .file(
      '/etc/os-release',
      'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nID=ubuntu\n',
    )
    .file(
      '/etc/hosts',
      '127.0.0.1 localhost\n10.42.0.10 web1 web1.peer4u.internal\n10.42.0.20 db1 db1.peer4u.internal\n',
    )
    .file('/etc/passwd', '')
    .file('/etc/group', '')
    .file('/etc/shadow', 'root:*:20000:0:99999:7:::\n', { mode: 0o640, group: 'shadow' })
    .dir('/etc/ssh')
    .file(
      '/etc/ssh/sshd_config',
      'Port 22\nPermitRootLogin no\nPasswordAuthentication no\nPubkeyAuthentication yes\n',
    )
    .file(
      '/etc/crontab',
      'SHELL=/bin/sh\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n',
    )
  for (const each of users) {
    if (each.uid < 1000) continue
    b.dir(each.home, { owner: each.name, group: each.groups[0] ?? each.name, mode: 0o750 })
    b.file(`${each.home}/.bashrc`, "# ~/.bashrc\nexport EDITOR=nano\nalias ll='ls -alF'\n", {
      owner: each.name,
      group: each.groups[0] ?? each.name,
    })
  }

  return b
}

function passwdOf(machine: Machine): void {
  const users = Object.values(machine.users).sort((a, b) => a.uid - b.uid)
  const passwd = machine.fs['/etc/passwd']
  const group = machine.fs['/etc/group']

  if (passwd?.kind === 'file')
    passwd.text =
      users
        .map(
          (u) =>
            `${u.name}:x:${u.uid}:${machine.groups[u.groups[0] ?? ''] ?? u.uid}:${u.name}:${u.home}:${u.shell}`,
        )
        .join('\n') + '\n'
  if (group?.kind === 'file')
    group.text =
      Object.entries(machine.groups)
        .sort((a, b) => a[1] - b[1])
        .map(
          ([name, gid]) =>
            `${name}:x:${gid}:${users
              .filter((u) => u.groups.slice(1).includes(name))
              .map((u) => u.name)
              .join(',')}`,
        )
        .join('\n') + '\n'
}

function web1(): Machine {
  const users = [
    user('root', 0, ['root'], '/root'),
    user('www-data', 33, ['www-data'], '/var/www', '/usr/sbin/nologin'),
    user('syslog', 104, ['syslog', 'adm'], '/home/syslog', '/usr/sbin/nologin'),
    user('peer', 1000, ['peer', 'adm', 'sudo'], '/home/peer'),
    user('deploy', 1001, ['deploy', 'www-data'], '/home/deploy'),
    user('mgarcia', 1002, ['mgarcia', 'developers'], '/home/mgarcia'),
  ]
  const b = skeleton('web1', users)

  b.file(
    '/home/peer/notas.txt',
    'Bienvenida a web1.\nLa API vive en /srv/peer4u y nginx en /etc/nginx.\nLos registros, en /var/log.\n',
    { owner: 'peer' },
  )
    .file('/home/peer/.secreto', 'La contraseña del wifi es: commit-early-push-often\n', {
      owner: 'peer',
      mode: 0o600,
    })
    .dir('/home/peer/proyectos', { owner: 'peer' })
    .file('/home/peer/proyectos/README.md', '# Proyectos\nAquí van tus pruebas.\n', {
      owner: 'peer',
    })
    .dir('/etc/nginx')
    .file(
      '/etc/nginx/nginx.conf',
      'user www-data;\nworker_processes auto;\n\nhttp {\n  server {\n    listen 80;\n    root /var/www/html;\n    location /api/ {\n      proxy_pass http://127.0.0.1:3000/;\n    }\n  }\n}\n',
    )
    .dir('/etc/peer4u')
    .file('/etc/peer4u/app.env', 'PORT=3000\nDB_HOST=db1\nDB_PORT=5432\nLOG_LEVEL=info\n', {
      owner: 'deploy',
      group: 'deploy',
      mode: 0o640,
    })
    .dir('/var/www', { owner: 'www-data' })
    .dir('/var/www/html', { owner: 'www-data' })
    .file(
      '/var/www/html/index.html',
      '<!doctype html>\n<title>Peer4U</title>\n<h1>Peer4U funciona</h1>\n',
      { owner: 'www-data' },
    )
    .dir('/srv/peer4u', { owner: 'deploy', group: 'deploy' })
    .file('/srv/peer4u/health.json', '{"status":"ok","version":"2.4.1","db":"up"}\n', {
      owner: 'deploy',
      group: 'deploy',
    })
    .file(
      '/srv/peer4u/server.js',
      '// La API de Peer4U (de mentira)\nconst port = Number(env.PORT)\n',
      { owner: 'deploy', group: 'deploy' },
    )
    .dir('/srv/backups', { owner: 'deploy', group: 'deploy' })
    .dir('/var/log/nginx', { owner: 'www-data', group: 'adm' })
    .file('/var/log/nginx/access.log', accessLog(), {
      owner: 'www-data',
      group: 'adm',
      mode: 0o640,
      mtime: 0,
    })
    .file(
      '/var/log/nginx/error.log',
      '2026/10/25 08:41:12 [error] 812#812: *31 connect() failed (111: Connection refused) while connecting to upstream\n',
      { owner: 'www-data', group: 'adm', mode: 0o640, mtime: 0 },
    )
    .dir('/var/log/peer4u', { owner: 'deploy', group: 'adm' })
    .file('/var/log/peer4u/app.log', appLog(), {
      owner: 'deploy',
      group: 'adm',
      mode: 0o640,
      mtime: 0,
    })
    .file('/var/log/auth.log', authLog(), { owner: 'syslog', group: 'adm', mode: 0o640, mtime: 0 })
    .file(
      '/var/log/syslog',
      'Oct 25 06:25:01 web1 CRON[1001]: (root) CMD (test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily)\nOct 25 08:00:00 web1 systemd[1]: Started peer4u-api.service - Peer4U API.\n',
      { owner: 'syslog', group: 'adm', mode: 0o640, mtime: 0 },
    )

  const machine: Machine = {
    name: 'web1',
    ip: '10.42.0.10',
    fs: absolute(b.fs),
    users: Object.fromEntries(users.map((u) => [u.name, u])),
    groups: {
      root: 0,
      adm: 4,
      sudo: 27,
      'www-data': 33,
      syslog: 104,
      shadow: 42,
      peer: 1000,
      deploy: 1001,
      mgarcia: 1002,
      developers: 1100,
    },
    procs: [
      {
        pid: 1,
        ppid: 0,
        user: 'root',
        cmd: '/sbin/init',
        cpu: 0,
        mem: 0.3,
        rss: 12_800,
        state: 'S',
        tty: '?',
        start: -40 * DAY,
      },
      {
        pid: 4242,
        ppid: 1,
        user: 'peer',
        cmd: '-bash',
        cpu: 0,
        mem: 0.1,
        rss: 5200,
        state: 'S',
        tty: 'pts/0',
        start: -120,
      },
    ],
    nextPid: 5000,
    services: {
      ssh: service('ssh', {
        description: 'OpenBSD Secure Shell server',
        exec: 'sshd: /usr/sbin/sshd -D [listener]',
        user: 'root',
        port: 22,
        mem: 0.2,
      }),
      cron: service('cron', {
        description: 'Regular background program processing daemon',
        exec: '/usr/sbin/cron -f -P',
        user: 'root',
        mem: 0.1,
      }),
      nginx: service('nginx', {
        description: 'A high performance web server and a reverse proxy server',
        exec: 'nginx: master process /usr/sbin/nginx -g daemon on;',
        user: 'www-data',
        port: 80,
        mem: 0.4,
        needs: [
          {
            path: '/etc/nginx/nginx.conf',
            contains: 'listen 80;',
            error:
              '[emerg] no "listen" directive in /etc/nginx/nginx.conf: the server block is broken',
          },
        ],
        web: { root: '/var/www/html', proxy: { prefix: '/api/', port: 3000 } },
      }),
      'peer4u-api': service('peer4u-api', {
        description: 'Peer4U API',
        exec: 'node /srv/peer4u/server.js',
        user: 'deploy',
        port: 3000,
        cpu: 2.1,
        mem: 6.3,
        restart: true,
        needs: [
          {
            path: '/etc/peer4u/app.env',
            contains: 'PORT=3000',
            error: 'Error: PORT is not set in /etc/peer4u/app.env',
          },
        ],
        web: { routes: { '/health': '/srv/peer4u/health.json', '/': '/srv/peer4u/health.json' } },
      }),
    },
    journal: [
      {
        t: -3600,
        unit: 'kernel',
        prio: 6,
        msg: 'Linux version 6.8.0-1015-oracle (buildd@bos03) aarch64',
      },
      {
        t: -3590,
        unit: 'systemd',
        prio: 6,
        msg: 'Started ssh.service - OpenBSD Secure Shell server.',
      },
      {
        t: -3580,
        unit: 'systemd',
        prio: 6,
        msg: 'Started nginx.service - A high performance web server and a reverse proxy server.',
      },
      { t: -3570, unit: 'systemd', prio: 6, msg: 'Started peer4u-api.service - Peer4U API.' },
      { t: -3000, unit: 'peer4u-api', prio: 6, msg: 'listening on :3000' },
      { t: -1500, unit: 'peer4u-api', prio: 4, msg: 'slow query: 812ms SELECT * FROM peers' },
      { t: -1200, unit: 'peer4u-api', prio: 3, msg: 'db connection refused (db1:5432)' },
      {
        t: -600,
        unit: 'cron',
        prio: 6,
        msg: '(root) CMD (test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily)',
      },
      {
        t: -60,
        unit: 'sshd',
        prio: 6,
        msg: 'Accepted publickey for peer from 10.42.0.7 port 52114 ssh2',
      },
    ],
    crontabs: {},
    packages: {
      bash: '5.2.21-2ubuntu4',
      coreutils: '9.4-3ubuntu6',
      curl: '8.5.0-2ubuntu10',
      nginx: '1.24.0-2ubuntu7',
      openssh: '1:9.6p1-3ubuntu13',
      rsync: '3.2.7-1ubuntu1',
    },
    disk: 40 * 1024 ** 3,
    baseUsed: 11 * 1024 ** 3,
  }

  return machine
}

function db1(): Machine {
  const users = [
    user('root', 0, ['root'], '/root'),
    user('postgres', 113, ['postgres'], '/var/lib/postgresql'),
    user('peer', 1000, ['peer', 'adm', 'sudo'], '/home/peer'),
  ]
  const b = skeleton('db1', users)

  b.dir('/var/lib/postgresql', { owner: 'postgres', mode: 0o750 })
    .dir('/var/backups')
    .dir('/var/backups/db', { owner: 'postgres', group: 'peer', mode: 0o775 })
    .file('/var/backups/db/peer4u-2026-10-23.sql.gz', '#peer4u-gzip v1\n-- dump 23\n', {
      owner: 'postgres',
      size: 52_000_000,
      mtime: -2 * DAY,
    })
    .file('/var/backups/db/peer4u-2026-10-24.sql.gz', '#peer4u-gzip v1\n-- dump 24\n', {
      owner: 'postgres',
      size: 53_000_000,
      mtime: -1 * DAY,
    })
    .dir('/var/log/postgresql', { owner: 'postgres', group: 'adm' })
    .file(
      '/var/log/postgresql/postgresql-16-main.log',
      '2026-10-25 08:30:02 UTC [902] LOG:  database system is ready to accept connections\n',
      { owner: 'postgres', group: 'adm', mode: 0o640 },
    )

  const machine: Machine = {
    name: 'db1',
    ip: '10.42.0.20',
    fs: absolute(b.fs),
    users: Object.fromEntries(users.map((u) => [u.name, u])),
    groups: { root: 0, adm: 4, sudo: 27, shadow: 42, syslog: 104, postgres: 113, peer: 1000 },
    procs: [
      {
        pid: 1,
        ppid: 0,
        user: 'root',
        cmd: '/sbin/init',
        cpu: 0,
        mem: 0.3,
        rss: 12_800,
        state: 'S',
        tty: '?',
        start: -40 * DAY,
      },
    ],
    nextPid: 7000,
    services: {
      ssh: service('ssh', {
        description: 'OpenBSD Secure Shell server',
        exec: 'sshd: /usr/sbin/sshd -D [listener]',
        user: 'root',
        port: 22,
        mem: 0.2,
      }),
      postgresql: service('postgresql', {
        description: 'PostgreSQL RDBMS',
        exec: '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main',
        user: 'postgres',
        port: 5432,
        cpu: 1.4,
        mem: 8.2,
      }),
    },
    journal: [
      { t: -3600, unit: 'systemd', prio: 6, msg: 'Started postgresql.service - PostgreSQL RDBMS.' },
    ],
    crontabs: {
      postgres:
        '# copia diaria\n0 3 * * * pg_dump peer4u | gzip > /var/backups/db/peer4u-$(date +\\%F).sql.gz\n',
    },
    packages: {
      bash: '5.2.21-2ubuntu4',
      coreutils: '9.4-3ubuntu6',
      'postgresql-16': '16.4-0ubuntu0.24.04.2',
      rsync: '3.2.7-1ubuntu1',
    },
    disk: 80 * 1024 ** 3,
    baseUsed: 30 * 1024 ** 3,
  }

  return machine
}

/** Los procesos de los servicios activos (los arranca «systemd» al crear el mundo). */
function boot(machine: Machine): void {
  passwdOf(machine)
  for (const each of Object.values(machine.services)) {
    if (!each.active) continue
    machine.procs.push({
      pid: machine.nextPid++,
      ppid: 1,
      user: each.user,
      cmd: each.exec,
      cpu: each.cpu ?? 0.1,
      mem: each.mem ?? 0.5,
      rss: Math.round((each.mem ?? 0.5) * 40_000),
      state: 'S',
      tty: '?',
      service: each.name,
      start: -3600,
    })
  }
  machine.procs.sort((a, b) => a.pid - b.pid)
}

/** El mundo con el que empieza cada unidad del curso (antes de su preparación). */
export function baseWorld(): World {
  const machines = { web1: web1(), db1: db1() }

  for (const machine of Object.values(machines)) boot(machine)

  const peer = machines.web1.users.peer ?? {
    name: 'peer',
    uid: 1000,
    home: '/home/peer',
    shell: '/bin/bash',
    groups: ['peer'],
  }

  return {
    machines,
    session: freshSession('web1', peer),
    stack: [],
    dns: {
      'web1.peer4u.internal': '10.42.0.10',
      'db1.peer4u.internal': '10.42.0.20',
      'peer4u.dev': '10.42.0.10',
      'api.peer4u.dev': '10.42.0.10',
      'status.peer4u.dev': '10.42.0.10',
    },
    clock: 0,
    seed: 4242,
  }
}
