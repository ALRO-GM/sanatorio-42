/**
 * Lo que pasa dentro de un contenedor: qué hace su proceso principal al
 * arrancar (servir, fallar, acabar), a quién encuentra por nombre en sus
 * redes, qué contesta por HTTP y si su healthcheck pasa. Nada se ejecuta de
 * verdad: cada imagen del catálogo sabe comportarse (nginx sirve ficheros,
 * postgres pide contraseña, la API de Node lee su `server.js`) y lo decide el
 * estado, así que siempre da lo mismo.
 */

import type { HttpReply } from '@sanatorio/shellsim'

import { clean, imageOf, readFile, seedVolumes } from './fsview.js'
import type { Env } from './fsview.js'
import { own } from './limits.js'
import type { Container } from './model.js'
import { envValue, MB } from './model.js'
import { execIn } from './shell.js'

/** El proceso principal: un servidor que se queda corriendo o una orden que acaba. */
type Program =
  | { kind: 'server'; role: 'nginx' | 'postgres' | 'redis' | 'app' | 'sleep'; script?: string }
  | { kind: 'oneshot'; argv: string[] }

const ENTRYPOINTS = new Set([
  'docker-entrypoint.sh',
  '/docker-entrypoint.sh',
  '/usr/local/bin/docker-entrypoint.sh',
])

const base = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

/** De `entrypoint + cmd` a lo que hace el proceso. */
export function programOf(env: Env, container: Container): Program {
  let argv = [...container.entrypoint, ...container.cmd]
  const kind = imageOf(env, container)?.kind

  if (ENTRYPOINTS.has(argv[0] ?? '')) argv = argv.slice(1)
  // La forma shell (`CMD node server.js`) es `/bin/sh -c "node server.js"`: lo que arranca es lo de
  // dentro. Lo que venga detrás (el CMD tras un ENTRYPOINT en forma shell, o lo que escribes tras
  // la imagen) son `$0`, `$1`… de esa sh: no llega al programa.
  if (
    ['/bin/sh', 'sh'].includes(argv[0] ?? '') &&
    argv[1] === '-c' &&
    /^(exec\s+)?[\w./ -]+$/.test(argv[2] ?? '')
  )
    argv = (argv[2] ?? '')
      .replace(/^exec\s+/, '')
      .split(/\s+/)
      .filter(Boolean)
  if (argv.length === 0) return { kind: 'oneshot', argv: [] }

  const name = base(argv[0] ?? '')

  if (name === 'nginx' && kind === 'nginx') return { kind: 'server', role: 'nginx' }
  if (name === 'postgres' && kind === 'postgres') return { kind: 'server', role: 'postgres' }
  if (name === 'redis-server' && kind === 'redis') return { kind: 'server', role: 'redis' }
  if (name === 'sleep' && (argv[1] === 'infinity' || Number(argv[1] ?? 0) >= 60))
    return { kind: 'server', role: 'sleep' }
  if (
    (name === 'node' || name === 'python3' || name === 'python') &&
    argv[1] !== undefined &&
    !argv[1].startsWith('-')
  )
    return { kind: 'server', role: 'app', script: argv[1] }
  if (name === 'npm' && argv[1] === 'start') {
    const pkg = readFile(env, container, clean('package.json', container.workdir)) ?? ''
    const start = /"start"\s*:\s*"node ([^"\s]+)/.exec(pkg)?.[1]

    if (start !== undefined) return { kind: 'server', role: 'app', script: start }
  }

  return { kind: 'oneshot', argv }
}

/** Memoria que necesita cada proceso, en MB (con más, el contenedor sale con 137). */
function needOf(env: Env, container: Container, program: Program): number {
  if (program.kind === 'oneshot') return 4
  if (program.role === 'app') {
    const script = readFile(env, container, clean(program.script ?? '', container.workdir)) ?? ''
    const batch = Number(/BATCH_MB\s*=\s*(\d+)/.exec(script)?.[1] ?? 0)

    return 60 + batch
  }

  return { nginx: 8, postgres: 40, redis: 10, sleep: 1 }[program.role]
}

/** El puerto en el que escucha una app (el `PORT || 3000` de su código, o la variable). */
function appPort(env: Env, container: Container, script: string): number {
  const fromEnv = Number(envValue(container.env, 'PORT') ?? Number.NaN)

  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv

  const text = readFile(env, container, clean(script, container.workdir)) ?? ''

  return Number(/PORT\s*\|\|\s*(\d+)/.exec(text)?.[1] ?? 3000)
}

/** Lo que sigue al proceso según su política de reinicio (Docker lo vuelve a arrancar y vuelve a caer). */
function settle(container: Container, code: number): void {
  container.exitCode = code
  if (
    container.restart === 'always' ||
    container.restart === 'unless-stopped' ||
    (container.restart === 'on-failure' && code !== 0)
  ) {
    container.status = 'restarting'
    container.restartCount += 3
  } else container.status = 'exited'
}

const PG_MISSING = [
  'Error: Database is uninitialized and superuser password is not specified.',
  '       You must specify POSTGRES_PASSWORD to a non-empty value for the',
  '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".',
]

export const pgData = (container: Container): string =>
  envValue(container.env, 'PGDATA') ?? '/var/lib/postgresql/data'

/** Las líneas de configuración de nginx con `proxy_pass` (para resolver sus destinos). */
function upstreams(
  env: Env,
  container: Container,
): { prefix: string; host: string; port: number; strip: boolean }[] {
  const out: { prefix: string; host: string; port: number; strip: boolean }[] = []
  const pattern =
    /location\s+(\S+)\s*\{[^}]*?proxy_pass\s+http:\/\/([A-Za-z0-9_.-]+)(?::(\d+))?(\/?)[^;]*;/g

  for (const path of ['/etc/nginx/conf.d/default.conf', '/etc/nginx/nginx.conf']) {
    const text = readFile(env, container, path) ?? ''

    for (let match = pattern.exec(text); match !== null; match = pattern.exec(text))
      out.push({
        prefix: match[1] ?? '/',
        host: match[2] ?? '',
        port: Number(match[3] ?? 80),
        strip: match[4] === '/',
      })
  }

  return out
}

/** Arranca (o vuelve a arrancar) el proceso principal; devuelve lo que escribe si acaba. */
export function boot(
  env: Env,
  container: Container,
): { code: number; output: string; error?: string } {
  const image = imageOf(env, container)
  const program = programOf(env, container)
  const log = (...lines: string[]) => {
    container.logs.push(...lines)
  }

  container.status = 'running'
  container.started = env.world.clock
  container.oomKilled = false
  seedVolumes(env, container)
  if (container.memory > 0 && needOf(env, container, program) * MB > container.memory) {
    if (program.kind === 'server' && program.role === 'app') log('Loading batch into memory...')
    container.oomKilled = true
    container.finished = env.world.clock
    settle(container, 137)

    return { code: 137, output: '' }
  }
  if (program.kind === 'oneshot') {
    const result = execIn(env, container, program.argv, { main: true })

    // El programa no existe: el contenedor ni arranca (queda Created, con el código en ExitCode).
    if (result.start !== undefined) {
      container.status = 'created'
      container.started = -1
      container.exitCode = result.code

      return {
        code: result.code,
        output: '',
        error: `Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: ${result.start}: unknown`,
      }
    }
    const output = result.out + result.err

    log(...output.split('\n').filter((line, index, all) => line !== '' || index < all.length - 1))
    container.finished = env.world.clock
    settle(container, result.code)

    return { code: result.code, output }
  }

  const fail = (code: number, ...lines: string[]) => {
    log(...lines)
    container.finished = env.world.clock
    settle(container, code)

    return { code, output: lines.map((line) => `${line}\n`).join('') }
  }

  switch (program.role) {
    case 'nginx': {
      for (const up of upstreams(env, container))
        if (resolveIn(env, container, up.host) === null && !/^\d/.test(up.host))
          return fail(
            1,
            '/docker-entrypoint.sh: Configuration complete; ready for start up',
            `nginx: [emerg] host not found in upstream "${up.host}" in /etc/nginx/conf.d/default.conf`,
          )
      log(
        '/docker-entrypoint.sh: Configuration complete; ready for start up',
        'nginx: [notice] start worker processes',
      )
      break
    }
    case 'postgres': {
      const data = pgData(container)
      const ready = readFile(env, container, `${data}/PG_VERSION`) !== null

      if (!ready) {
        if (
          (envValue(container.env, 'POSTGRES_PASSWORD') ?? '') === '' &&
          envValue(container.env, 'POSTGRES_HOST_AUTH_METHOD') !== 'trust'
        )
          return fail(1, ...PG_MISSING)
        writeFileQuiet(env, container, `${data}/PG_VERSION`, '16\n')
        writeFileQuiet(env, container, `${data}/peer4u-tables`, '')
        log(
          'The files belonging to this database system will be owned by user "postgres".',
          'PostgreSQL init process complete; ready for start up.',
        )
      } else
        log('PostgreSQL Database directory appears to contain a database; Skipping initialization')
      log('LOG:  database system is ready to accept connections')
      break
    }
    case 'redis':
      log('1:M * Ready to accept connections tcp')
      break
    case 'sleep':
      break
    case 'app': {
      const script = clean(program.script ?? '', container.workdir)
      const text = readFile(env, container, script)

      if (text === null)
        return fail(
          1,
          `node:internal/modules/cjs/loader:1228`,
          `Error: Cannot find module '${script}'`,
        )

      const dir = script.slice(0, script.lastIndexOf('/')) || '/'
      const pkg = readFile(env, container, `${dir}/package.json`) ?? ''
      const deps = /"dependencies"\s*:\s*\{\s*"([^"]+)"/.exec(pkg)?.[1]

      if (
        deps !== undefined &&
        readFile(env, container, `${dir}/node_modules/.package-lock.json`) === null
      )
        return fail(1, `Error: Cannot find module '${deps}'`, `Require stack:`, `- ${script}`)

      for (const match of text.matchAll(/'([A-Z][A-Z0-9_]*) is not set'/g)) {
        const name = match[1] ?? ''

        if ((envValue(container.env, name) ?? '') === '')
          return fail(1, `Error: ${name} is not set`)
      }
      log(
        `${image?.kind === 'python' ? 'Serving' : 'api listening'} on :${appPort(env, container, script)}`,
      )
      break
    }
  }

  return { code: 0, output: '' }
}

/** Escribe sin comprobar permisos de montaje (lo hace el propio proceso al arrancar). */
function writeFileQuiet(env: Env, container: Container, path: string, text: string): void {
  const mount = container.mounts.find(
    (each) => path === each.target || path.startsWith(`${each.target}/`),
  )

  if (mount?.type === 'volume') {
    const volume = own(env.state.volumes, mount.source)

    if (volume !== undefined) volume.files[path.slice(mount.target.length)] = text

    return
  }
  if (mount === undefined || mount.type === 'tmpfs') container.files[path] = text
}

/**
 * A quién encuentra un contenedor por nombre: en una red propia, a los demás
 * que corren en ella por su nombre o su alias (el servicio de compose). En la
 * red `bridge` de siempre no hay DNS por nombre (como en Docker).
 */
export function resolveIn(env: Env, from: Container, name: string): Container | null {
  if (name === 'localhost' || name === '127.0.0.1') return from

  // Por IP se llega en cualquier red compartida, también en la `bridge` de siempre.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name))
    return (
      env.state.containers.find(
        (each) =>
          each.status === 'running' &&
          Object.entries(each.networks).some(
            ([network, info]) => info.ip === name && own(from.networks, network) !== undefined,
          ),
      ) ?? null
    )

  for (const network of Object.keys(from.networks)) {
    if (network === 'bridge' || network === 'host' || network === 'none') continue

    const found = env.state.containers.find(
      (each) =>
        each.status === 'running' &&
        own(each.networks, network) !== undefined &&
        (each.name === name ||
          own(each.networks, network)?.aliases.includes(name) === true ||
          each.id.startsWith(name)),
    )

    if (found !== undefined) return found
  }

  return null
}

/** La IP de un contenedor en la primera red que comparte con otro (o en la suya). */
export function ipOf(container: Container, near?: Container): string {
  // Por nombre responde el DNS de una red creada por ti: la IP de esa red, no la de `bridge`.
  const shared = Object.keys(container.networks)
    .filter((name) => near === undefined || own(near.networks, name) !== undefined)
    .sort((a, b) => Number(a === 'bridge') - Number(b === 'bridge'))[0]

  return own(container.networks, shared ?? Object.keys(container.networks)[0] ?? '')?.ip ?? ''
}

const json = (status: number, body: unknown): HttpReply => ({
  status,
  body: `${JSON.stringify(body)}\n`,
  type: 'application/json',
})

const PAGE_404 =
  '<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>nginx/1.27.2</center>\n</body>\n</html>\n'
const PAGE_502 =
  '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>\n<center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx/1.27.2</center>\n</body>\n</html>\n'

/** ¿Llega la API a su base de datos (`DATABASE_URL`, con la contraseña buena)? */
function databaseUp(env: Env, container: Container): boolean {
  const url = envValue(container.env, 'DATABASE_URL') ?? ''
  const parsed = /^postgres(?:ql)?:\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([^:/]+)/.exec(url)

  if (parsed === null) return false

  const db = resolveIn(env, container, parsed[3] ?? '')

  if (db === null || db === container) return false

  const program = programOf(env, db)

  if (program.kind !== 'server' || program.role !== 'postgres') return false

  return (
    envValue(db.env, 'POSTGRES_HOST_AUTH_METHOD') === 'trust' ||
    (envValue(db.env, 'POSTGRES_PASSWORD') ?? '') === (parsed[2] ?? '')
  )
}

/** Lo que contesta un contenedor por HTTP en uno de sus puertos (`null`: nadie escucha). */
export function httpOf(
  env: Env,
  container: Container,
  port: number,
  path: string,
  depth = 0,
): HttpReply | null {
  if (container.status !== 'running' || depth > 3) return null

  const program = programOf(env, container)

  if (program.kind !== 'server') return null

  const clean_ = path.split('?')[0] ?? '/'
  const log = (status: number) => {
    container.logs.push(
      program.role === 'nginx'
        ? `172.17.0.1 - - [08/Nov/2026:09:00:00 +0000] "GET ${clean_} HTTP/1.1" ${status} 615 "-" "curl/8.5.0"`
        : `GET ${clean_} ${status}`,
    )
  }

  if (program.role === 'nginx' && port === 80) {
    for (const up of upstreams(env, container)) {
      if (!clean_.startsWith(up.prefix)) continue

      const target = resolveIn(env, container, up.host)
      const reply =
        target === null
          ? null
          : httpOf(
              env,
              target,
              up.port,
              up.strip ? `/${clean_.slice(up.prefix.length)}` : clean_,
              depth + 1,
            )

      log(reply?.status ?? 502)

      return reply ?? { status: 502, body: PAGE_502, type: 'text/html' }
    }

    const conf = readFile(env, container, '/etc/nginx/conf.d/default.conf') ?? ''
    const root = /root\s+([^;\s]+);/.exec(conf)?.[1] ?? '/usr/share/nginx/html'
    const file = clean(`.${clean_}`, root)
    const text =
      readFile(env, container, file) ??
      readFile(env, container, `${file}/index.html`) ??
      (conf.includes('try_files') ? readFile(env, container, `${root}/index.html`) : null)

    log(text === null ? 404 : 200)

    return text === null
      ? { status: 404, body: PAGE_404, type: 'text/html' }
      : { status: 200, body: text, type: 'text/html' }
  }
  if (program.role !== 'app' || port !== appPort(env, container, program.script ?? '')) return null

  const script = readFile(env, container, clean(program.script ?? '', container.workdir)) ?? ''
  const dir = clean(program.script ?? '', container.workdir).replace(/\/[^/]*$/, '') || '/'
  const pkg = readFile(env, container, `${dir}/package.json`) ?? ''
  let reply: HttpReply

  if (clean_ === '/health' || clean_ === '/healthz') {
    // Sin `DATABASE_URL` la API arranca sin base de datos (y lo dice); con ella, comprueba que llega.
    if (!script.includes('DATABASE_URL') || envValue(container.env, 'DATABASE_URL') === undefined)
      reply = json(200, { status: 'ok' })
    else
      reply = databaseUp(env, container)
        ? json(200, { status: 'ok', db: 'up' })
        : json(503, { status: 'error', db: 'down' })
  } else if (clean_ === '/')
    reply = json(200, {
      service: /"name"\s*:\s*"([^"]+)"/.exec(pkg)?.[1] ?? 'app',
      version: /"version"\s*:\s*"([^"]+)"/.exec(pkg)?.[1] ?? '0.0.0',
    })
  else reply = json(404, { error: 'not found' })
  log(reply.status)

  return reply
}

/** El estado del healthcheck de un contenedor que corre (`null`: no tiene). */
export function healthOf(env: Env, container: Container): 'healthy' | 'unhealthy' | null {
  const spec = container.healthcheck ?? imageOf(env, container)?.config.healthcheck ?? null

  if (spec === null || spec.test[0] === 'NONE' || spec.test.length === 0) return null
  if (container.status !== 'running') return 'unhealthy'

  const argv =
    spec.test[0] === 'CMD-SHELL'
      ? ['/bin/sh', '-c', spec.test.slice(1).join(' ')]
      : spec.test.slice(1)
  // El healthcheck mira sin dejar rastro: ni registros ni ficheros nuevos.
  const logs = container.logs.length
  const result = execIn(env, container, argv, { quiet: true })

  container.logs.length = logs

  return result.code === 0 ? 'healthy' : 'unhealthy'
}

/** Lo que contesta el anfitrión en un puerto publicado (para `curl localhost:8080`). */
export function hostHttp(env: Env, host: string, port: number, path: string): HttpReply | null {
  if (!['localhost', '127.0.0.1', '0.0.0.0', env.host.name, '::1'].includes(host)) return null

  for (const container of env.state.containers) {
    if (container.status !== 'running') continue

    const binding = container.ports.find((each) => each.host === port)

    if (binding === undefined) continue

    return httpOf(env, container, binding.container, path)
  }

  return null
}

/**
 * Lo que pasa al conectar a un puerto publicado que no contesta HTTP: si el
 * contenedor no escucha en el puerto de dentro (`-p 8080:8080` a un nginx que
 * escucha en el 80), Docker acepta la conexión y la corta (`reset`); si escucha
 * pero no habla HTTP (postgres, redis), la cierra sin responder (`empty`).
 * `null`: no es un puerto publicado o sí contesta. Mira sin dejar registros.
 */
export function hostSocket(env: Env, host: string, port: number): 'reset' | 'empty' | null {
  if (!['localhost', '127.0.0.1', '0.0.0.0', env.host.name, '::1'].includes(host)) return null

  const container = env.state.containers.find(
    (each) => each.status === 'running' && each.ports.some((binding) => binding.host === port),
  )
  const binding = container?.ports.find((each) => each.host === port)

  if (container === undefined || binding === undefined) return null

  const logs = env.state.containers.map((each) => each.logs.length)
  const reply = httpOf(env, container, binding.container, '/')

  env.state.containers.forEach((each, i) => {
    each.logs.length = logs[i] ?? each.logs.length
  })
  if (reply !== null) return null

  const program = programOf(env, container)
  const role = program.kind === 'server' ? program.role : ''

  return (role === 'postgres' && binding.container === 5432) ||
    (role === 'redis' && binding.container === 6379)
    ? 'empty'
    : 'reset'
}
