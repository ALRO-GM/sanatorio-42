/**
 * La orden `docker`: contenedores, imágenes, volúmenes, redes, registro,
 * construcción y limpieza, con las opciones que se usan en el trabajo y los
 * mensajes de error de Docker. `docker compose` vive en `compose.ts`.
 */

import { Fail, lookup, makeDir, writeText } from '@sanatorio/shellsim'
import type { CommandFn, Ctx } from '@sanatorio/shellsim'

import { build } from './build.js'
import { fromCatalog, normalizeRef, registryOf, repoDigest, validRef } from './catalog.js'
import { compose } from './compose.js'
import { durationOf } from './dockerfile.js'
import {
  cleanHost,
  commandText,
  createContainer,
  ensureImage,
  envOf,
  findContainer,
  findImage,
  freeIp,
  mountOf,
  mustContainer,
  parseOpts,
  portOf,
  pull,
  removeContainer,
  startContainer,
  stopContainer,
  volumeOf,
} from './engine.js'
import type { OptSpec } from './engine.js'
import { ago, bytesOf, human, table } from './format.js'
import type { Env } from './fsview.js'
import { clean, filesUnder, imageOf, readFile, writeFile } from './fsview.js'
import { hex64, short } from './hash.js'
import {
  containerJson,
  imageJson,
  isoAt,
  networkJson,
  template,
  TemplateError,
  volumeJson,
} from './inspect.js'
import { drop, own, safeKey, withinLimits } from './limits.js'
import type { Container, HealthSpec, Image, RestartPolicy } from './model.js'
import { imageSize, MB } from './model.js'
import { healthOf, programOf } from './runtime.js'
import { execIn } from './shell.js'
import { parseDotenv } from './yaml.js'

type Out = { out: (text: string) => void; err: (text: string) => void }

const ioOf = (ctx: Ctx): Out => ({ out: ctx.io.out, err: ctx.io.err })

/** Lo que se ve en STATUS de `docker ps`. */
function statusText(env: Env, c: Container): string {
  const since = ago(env.world.clock - (c.status === 'running' ? c.started : c.finished))

  if (c.status === 'running') {
    const health = healthOf(env, c)

    return `Up ${since}${health === null ? '' : ` (${health})`}`
  }
  if (c.status === 'exited') return `Exited (${c.exitCode}) ${since} ago`
  if (c.status === 'restarting') return `Restarting (${c.exitCode}) ${since} ago`
  if (c.status === 'paused') return `Up ${since} (Paused)`

  return 'Created'
}

function portsText(env: Env, c: Container): string {
  const published =
    c.status === 'running' ? c.ports.map((p) => `${p.ip}:${p.host}->${p.container}/tcp`) : []
  const exposed = (imageOf(env, c)?.config.exposed ?? []).filter(
    (port) => !c.ports.some((p) => `${p.container}/tcp` === port),
  )

  return [...published, ...(c.status === 'running' ? exposed : [])].join(', ')
}

/* ---------- run, create y el ciclo de vida ---------- */

const RUN_SPEC: OptSpec = {
  detach: { short: 'd' },
  interactive: { short: 'i' },
  tty: { short: 't' },
  rm: {},
  name: { value: true },
  publish: { short: 'p', value: true },
  'publish-all': { short: 'P' },
  env: { short: 'e', value: true },
  'env-file': { value: true },
  volume: { short: 'v', value: true },
  mount: { value: true },
  network: { value: true },
  net: { value: true },
  'network-alias': { value: true },
  restart: { value: true },
  memory: { short: 'm', value: true },
  cpus: { value: true },
  entrypoint: { value: true },
  workdir: { short: 'w', value: true },
  user: { short: 'u', value: true },
  'health-cmd': { value: true },
  'health-interval': { value: true },
  'health-retries': { value: true },
  'health-timeout': { value: true },
  'no-healthcheck': {},
  'read-only': {},
  tmpfs: { value: true },
  label: { short: 'l', value: true },
  hostname: { short: 'h', value: true },
  platform: { value: true },
  pull: { value: true },
  init: {},
  'cap-drop': { value: true },
  'cap-add': { value: true },
  'security-opt': { value: true },
}

function restartOf(text: string | undefined): RestartPolicy {
  const name = (text ?? 'no').split(':')[0] ?? 'no'

  if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(name))
    throw new Fail(
      `docker: Error response from daemon: invalid restart policy: unknown policy '${name}'; use one of 'no', 'always', 'on-failure', or 'unless-stopped'`,
      125,
    )

  return name as RestartPolicy
}

/** Parte una orden escrita en una sola palabra (`--entrypoint "sh -c"`) como lo haría la shell. */
const wordsOf = (text: string): string[] => text.split(/\s+/).filter(Boolean)

function createFrom(
  ctx: Ctx,
  env: Env,
  args: string[],
  usage: string,
): { container: Container; opts: ReturnType<typeof parseOpts> } {
  const opts = parseOpts(args, RUN_SPEC, usage, true)
  const [ref, ...cmd] = opts.rest

  if (ref === undefined)
    throw new Fail(
      `"${usage}" requires at least 1 argument.\nSee '${usage} --help'.\n\nUsage:  ${usage} [OPTIONS] IMAGE [COMMAND] [ARG...]`,
      1,
    )

  const cwd = ctx.sh.session().cwd
  const fromFiles = opts.all('env-file').flatMap((file) => {
    const node = own(env.host.fs, cleanHost(file, cwd))

    if (node?.kind !== 'file')
      throw new Fail(`docker: open ${file}: no such file or directory.`, 125)

    return Object.entries(parseDotenv(node.text)).map(([key, value]) => `${key}=${value}`)
  })
  const vars = [
    ...fromFiles,
    ...opts
      .all('env')
      .map((item) => (item.includes('=') ? item : `${item}=${ctx.sh.session().env[item] ?? ''}`)),
  ]
  const health = opts.one('health-cmd')
  const healthcheck: HealthSpec | null | undefined = opts.has('no-healthcheck')
    ? { test: ['NONE'], interval: 0, timeout: 0, retries: 0 }
    : health === undefined
      ? undefined
      : {
          test: ['CMD-SHELL', health],
          interval: durationOf(opts.one('health-interval') ?? '30s'),
          timeout: durationOf(opts.one('health-timeout') ?? '30s'),
          retries: Number(opts.one('health-retries') ?? 3),
        }
  const cpus = Number(opts.one('cpus') ?? 0)
  const memory = opts.has('memory') ? bytesOf(opts.one('memory') ?? '') : 0

  if (opts.has('memory') && memory < 6 * MB)
    throw new Fail('docker: Error response from daemon: Minimum memory limit allowed is 6MB.', 125)
  if (!Number.isFinite(cpus) || cpus < 0)
    throw new Fail(`docker: invalid argument "${opts.one('cpus') ?? ''}" for "--cpus" flag`, 125)

  const network = opts.one('network') ?? opts.one('net')
  const io = ioOf(ctx)
  // Como el cliente de Docker: lo de descargar la imagen sale por stderr (stdout es del contenedor).
  const image = ensureImage(env, ref, io.err, io.err)
  const mounts = opts.all('mount').map((spec) => mountOf(spec, cwd))

  // Como en Docker: -v crea la carpeta que falta, pero --mount no; falla.
  for (const mount of mounts)
    if (mount.type === 'bind' && own(env.host.fs, mount.source) === undefined)
      throw new Fail(
        `docker: Error response from daemon: invalid mount config for type "bind": bind source path does not exist: ${mount.source}.`,
        125,
      )

  const entrypoint = opts.one('entrypoint')
  const container = createContainer(env, image, {
    ...(opts.has('name') ? { name: opts.one('name') ?? '' } : {}),
    ref,
    cmd,
    ...(entrypoint === undefined
      ? {}
      : { entrypoint: entrypoint === '' ? [] : wordsOf(entrypoint) }),
    env: vars,
    ports: [
      ...opts.all('publish').map((spec) => portOf(spec, env)),
      ...(opts.has('publish-all')
        ? image.config.exposed.map((port) => portOf(port.replace('/tcp', ''), env))
        : []),
    ],
    mounts: [
      ...opts.all('volume').map((spec) => volumeOf(spec, cwd)),
      ...mounts,
      ...opts.all('tmpfs').map((spec) => ({
        type: 'tmpfs' as const,
        source: '',
        target: spec.split(':')[0] ?? '/tmp',
        readOnly: false,
      })),
    ],
    networks: network === undefined ? [] : [{ name: network, aliases: opts.all('network-alias') }],
    restart: restartOf(opts.one('restart')),
    memory,
    cpus,
    ...(opts.has('user') ? { user: opts.one('user') ?? '' } : {}),
    ...(opts.has('workdir') ? { workdir: opts.one('workdir') ?? '/' } : {}),
    ...(healthcheck === undefined ? {} : { healthcheck }),
    autoRemove: opts.has('rm'),
    readOnly: opts.has('read-only'),
    labels: Object.fromEntries(
      opts
        .all('label')
        .map((item) => [item.split('=')[0] ?? '', item.split('=').slice(1).join('=')]),
    ),
  })

  for (const mount of container.mounts)
    if (mount.type === 'bind' && own(env.host.fs, mount.source) === undefined) {
      const root = env.host.users.root

      if (root !== undefined)
        makeDir(env.host, root, mount.source, {
          parents: true,
          cmd: 'docker',
          now: ctx.sh.now(),
          umask: 0o022,
        })
    }

  return { container, opts }
}

const run: Sub = (ctx, env, args) => {
  const { container, opts } = createFrom(ctx, env, args, 'docker run')
  const result = startContainer(env, container)

  if (result.error !== null) {
    ctx.io.err(`docker: ${result.error}.\n`)

    return result.code
  }
  if (opts.has('detach')) {
    ctx.io.out(`${container.id}\n`)

    return 0
  }

  const program = programOf(env, container)
  const shell =
    program.kind === 'oneshot' &&
    ['sh', '/bin/sh', 'bash', '/bin/bash', 'ash'].includes(program.argv[0] ?? '') &&
    program.argv[1] !== '-c'

  if (program.kind === 'server' && container.status === 'running') {
    ctx.io.out(container.logs.map((line) => `${line}\n`).join(''))
    ctx.io.err(
      'peer4u-sandbox: sin -d, la terminal se quedaría enganchada al contenedor; aquí vuelve y el contenedor sigue corriendo (usa -d)\n',
    )

    return 0
  }
  if (shell && opts.has('tty'))
    ctx.io.err(
      "peer4u-sandbox: aquí no hay sesión interactiva: el contenedor arranca y sale. Escribe la orden detrás (docker run --rm alpine:3.20 cat /etc/os-release) o con sh -c '…'\n",
    )
  ctx.io.out(result.output)

  return result.code
}

const create: Sub = (ctx, env, args) => {
  const { container } = createFrom(ctx, env, args, 'docker create')

  ctx.io.out(`${container.id}\n`)

  return 0
}

function eachContainer(
  ctx: Ctx,
  env: Env,
  names: string[],
  usage: string,
  fn: (c: Container) => void,
): number {
  if (names.length === 0)
    throw new Fail(`"${usage}" requires at least 1 argument.\nSee '${usage} --help'.`)

  let code = 0

  for (const name of names) {
    const found = findContainer(env, name)

    if (found === undefined) {
      ctx.io.err(`Error response from daemon: No such container: ${name}\n`)
      code = 1
      continue
    }
    try {
      fn(found)
      ctx.io.out(`${name}\n`)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`${error.message}\n`)
      code = 1
    }
  }

  return code
}

const start: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { attach: { short: 'a' }, interactive: { short: 'i' } },
    'docker start',
  )

  return eachContainer(ctx, env, opts.rest, 'docker start', (c) => {
    if (c.status === 'running') return

    const result = startContainer(env, c)

    if (result.error !== null)
      throw new Fail(`${result.error}\nError: failed to start containers: ${c.name}`)
  })
}

const stop: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { time: { short: 't', value: true }, signal: { short: 's', value: true } },
    'docker stop',
  )

  return eachContainer(ctx, env, opts.rest, 'docker stop', (c) => {
    stopContainer(env, c)
  })
}

const kill: Sub = (ctx, env, args) => {
  const opts = parseOpts(args, { signal: { short: 's', value: true } }, 'docker kill')

  return eachContainer(ctx, env, opts.rest, 'docker kill', (c) => {
    if (c.status !== 'running')
      throw new Fail(
        `Error response from daemon: cannot kill container: ${c.name}: container ${c.id} is not running`,
      )
    stopContainer(env, c, 'KILL')
  })
}

const restart: Sub = (ctx, env, args) => {
  const opts = parseOpts(args, { time: { short: 't', value: true } }, 'docker restart')

  return eachContainer(ctx, env, opts.rest, 'docker restart', (c) => {
    stopContainer(env, c)

    const result = startContainer(env, c)

    if (result.error !== null) throw new Fail(result.error)
  })
}

const rm: Sub = (ctx, env, args) => {
  const opts = parseOpts(args, { force: { short: 'f' }, volumes: { short: 'v' } }, 'docker rm')

  return eachContainer(ctx, env, opts.rest, 'docker rm', (c) => {
    if ((c.status === 'running' || c.status === 'restarting') && !opts.has('force'))
      throw new Fail(
        `Error response from daemon: cannot remove container "/${c.name}": container is running: stop the container before removing or force remove`,
      )
    removeContainer(env, c)
    if (opts.has('volumes'))
      for (const mount of c.mounts)
        if (mount.source.startsWith('anon-')) drop(env.state.volumes, mount.source)
  })
}

const rename: Sub = (_ctx, env, args) => {
  const [from = '', to = ''] = args
  const c = mustContainer(env, from)

  if (findContainer(env, to) !== undefined)
    throw new Fail(
      `Error response from daemon: Conflict. The container name "/${to}" is already in use`,
    )
  c.name = safeKey(to, 'nombre de contenedor')

  return 0
}

/** `docker update`: cambia reinicio y límites de un contenedor sin recrearlo. */
const update: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      restart: { value: true },
      memory: { short: 'm', value: true },
      'memory-swap': { value: true },
      'memory-reservation': { value: true },
      cpus: { value: true },
    },
    'docker update',
  )

  if (opts.rest.length === 0)
    throw new Fail(
      `"docker update" requires at least 1 argument.\nSee 'docker update --help'.\n\nUsage:  docker update [OPTIONS] CONTAINER [CONTAINER...]`,
    )

  const restart = opts.one('restart')
  const memory = opts.has('memory') ? bytesOf(opts.one('memory') ?? '') : undefined
  const cpus = opts.has('cpus') ? Number(opts.one('cpus') ?? '') : undefined

  if (restart !== undefined && !['no', 'always', 'unless-stopped', 'on-failure'].includes(restart))
    throw new Fail(`invalid restart policy format: ${restart}`)
  if (memory !== undefined && memory < 6 * MB)
    throw new Fail('Error response from daemon: Minimum memory limit allowed is 6MB.')
  if (cpus !== undefined && (!Number.isFinite(cpus) || cpus < 0))
    throw new Fail(`invalid argument "${opts.one('cpus') ?? ''}" for "--cpus" flag`)

  for (const name of opts.rest) {
    const c = mustContainer(env, name)

    if (restart !== undefined) c.restart = restart as RestartPolicy
    if (memory !== undefined) c.memory = memory
    if (cpus !== undefined) c.cpus = cpus
    ctx.io.out(`${name}\n`)
  }

  return 0
}

/* ---------- Mirar: ps, logs, inspect, port, stats, diff, top ---------- */

const ps: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      all: { short: 'a' },
      quiet: { short: 'q' },
      filter: { short: 'f', value: true },
      format: { value: true },
      'no-trunc': {},
      latest: { short: 'l' },
      size: { short: 's' },
    },
    'docker ps',
  )
  const filters = opts.all('filter').map((filter) => {
    const [key = '', ...value] = filter.split('=')

    return { key, value: value.join('=') }
  })
  const all =
    opts.has('all') || filters.some((filter) => filter.key === 'status' || filter.key === 'exited')
  const match = (c: Container, key: string, value: string): boolean => {
    switch (key) {
      case 'status':
        return c.status === value
      case 'name':
        return c.name.includes(value)
      case 'ancestor':
        return c.ref === normalizeRef(value) || c.image === findImage(env, value)?.id
      case 'label':
        return own(c.labels, value.split('=')[0] ?? '') !== undefined
      case 'health':
        return healthOf(env, c) === value
      case 'exited':
        return c.status === 'exited' && String(c.exitCode) === value
      default:
        return true
    }
  }
  let list = env.state.containers.filter(
    (c) =>
      (all || c.status === 'running' || c.status === 'restarting') &&
      filters.every((filter) => match(c, filter.key, filter.value)),
  )

  list = [...list].reverse()
  if (opts.has('quiet')) {
    ctx.io.out(list.map((c) => `${c.id.slice(0, 12)}\n`).join(''))

    return 0
  }

  const format = opts.one('format')

  if (format !== undefined && format !== 'table') {
    for (const c of list)
      ctx.io.out(
        `${format
          .replace(/^table\s+/, '')
          .replace(/\{\{\s*\.ID\s*\}\}/g, c.id.slice(0, 12))
          .replace(/\{\{\s*\.Names\s*\}\}/g, c.name)
          .replace(/\{\{\s*\.Image\s*\}\}/g, c.ref)
          .replace(/\{\{\s*\.Status\s*\}\}/g, statusText(env, c))
          .replace(/\{\{\s*\.State\s*\}\}/g, c.status)
          .replace(/\{\{\s*\.Ports\s*\}\}/g, portsText(env, c))
          .replace(/\{\{\s*\.Command\s*\}\}/g, commandText(c))
          .replace(/\\t/g, '\t')}\n`,
      )

    return 0
  }
  ctx.io.out(
    table(
      ['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES'],
      list.map((c) => [
        c.id.slice(0, 12),
        c.ref,
        commandText(c),
        `${ago(env.world.clock - c.created)} ago`,
        statusText(env, c),
        portsText(env, c),
        c.name,
      ]),
    ),
  )

  return 0
}

const logs: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      follow: { short: 'f' },
      tail: { short: 'n', value: true },
      timestamps: { short: 't' },
      since: { value: true },
      until: { value: true },
      details: {},
    },
    'docker logs',
  )
  const name = opts.rest[0]

  if (name === undefined)
    throw new Fail(`"docker logs" requires exactly 1 argument.\nSee 'docker logs --help'.`)

  const c = mustContainer(env, name)
  const tail = opts.one('tail')
  const lines =
    tail === undefined || tail === 'all' ? c.logs : c.logs.slice(-Math.max(0, Number(tail) || 0))

  ctx.io.out(
    lines
      .map(
        (line) =>
          `${opts.has('timestamps') ? `${isoAt(c.started).replace('Z', '.000000000Z')} ` : ''}${line}\n`,
      )
      .join(''),
  )

  return 0
}

/** Lo que se puede inspeccionar por nombre: contenedor, imagen, volumen o red. */
function inspectable(env: Env, name: string, type?: string): unknown {
  if (type === undefined || type === 'container') {
    const c = findContainer(env, name)

    if (c !== undefined) return containerJson(env, c)
  }
  if (type === undefined || type === 'image') {
    const image = findImage(env, name)

    if (image !== undefined) return imageJson(env, image)
  }
  if (type === undefined || type === 'volume') {
    const volume = own(env.state.volumes, name)

    if (volume !== undefined) return volumeJson(volume)
  }
  if (type === undefined || type === 'network') {
    const network = own(env.state.networks, name)

    if (network !== undefined) return networkJson(env, network)
  }

  return undefined
}

function inspectWith(
  env: Env,
  names: string[],
  format: string | undefined,
  type: string | undefined,
  out: Out,
): number {
  const found: unknown[] = []
  let code = 0

  for (const name of names) {
    const item = inspectable(env, name, type)

    if (item === undefined) {
      out.err(`Error: No such ${type ?? 'object'}: ${name}\n`)
      code = 1
      continue
    }
    found.push(item)
  }
  if (format === undefined) out.out(`${JSON.stringify(found, null, 4)}\n`)
  else
    for (const item of found)
      try {
        out.out(`${template(format, item as Parameters<typeof template>[1])}\n`)
      } catch (error) {
        if (error instanceof TemplateError) throw new Fail(error.message)
        throw error
      }

  return code
}

const inspect =
  (type?: string): Sub =>
  (ctx, env, args) => {
    const opts = parseOpts(
      args,
      { format: { short: 'f', value: true }, type: { value: true }, size: { short: 's' } },
      'docker inspect',
    )

    if (opts.rest.length === 0)
      throw new Fail(`"docker inspect" requires at least 1 argument.\nSee 'docker inspect --help'.`)

    return inspectWith(env, opts.rest, opts.one('format'), type ?? opts.one('type'), ioOf(ctx))
  }

const port: Sub = (ctx, env, args) => {
  const c = mustContainer(env, args[0] ?? '')

  ctx.io.out(c.ports.map((p) => `${p.container}/tcp -> ${p.ip}:${p.host}\n`).join(''))

  return 0
}

const stats: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { 'no-stream': {}, all: { short: 'a' }, format: { value: true } },
    'docker stats',
  )
  const list = env.state.containers.filter((c) =>
    opts.rest.length === 0 ? c.status === 'running' || opts.has('all') : opts.rest.includes(c.name),
  )
  const total = 7.6 * 1024 * MB

  if (!opts.has('no-stream'))
    ctx.io.err(
      'peer4u-sandbox: stats sin --no-stream se quedaría refrescando; aquí enseña una foto\n',
    )
  ctx.io.out(
    table(
      [
        'CONTAINER ID',
        'NAME',
        'CPU %',
        'MEM USAGE / LIMIT',
        'MEM %',
        'NET I/O',
        'BLOCK I/O',
        'PIDS',
      ],
      list.map((c) => {
        const program = programOf(env, c)
        const used =
          c.status !== 'running'
            ? 0
            : program.kind === 'oneshot'
              ? 0.5 * MB
              : { nginx: 6.2, postgres: 38.4, redis: 8.1, app: 52.7, sleep: 0.4 }[program.role] * MB
        const limit = c.memory > 0 ? c.memory : total

        return [
          c.id.slice(0, 12),
          c.name,
          `${c.status === 'running' ? (program.kind === 'server' && program.role === 'app' ? '0.42' : '0.01') : '0.00'}%`,
          `${(used / MB).toFixed(2)}MiB / ${limit >= 1024 * MB ? `${(limit / 1024 / MB).toFixed(2)}GiB` : `${Math.round(limit / MB)}MiB`}`,
          `${((used / limit) * 100).toFixed(2)}%`,
          '1.2kB / 0B',
          '0B / 0B',
          c.status === 'running' ? '3' : '0',
        ]
      }),
    ),
  )

  return 0
}

const diff: Sub = (ctx, env, args) => {
  const c = mustContainer(env, args[0] ?? '')
  const image = imageOf(env, c)
  const lines = [
    ...Object.keys(c.files).map(
      (path) => `${own(image?.files ?? {}, path) === undefined ? 'A' : 'C'} ${path}`,
    ),
    ...c.deleted.map((path) => `D ${path}`),
  ].sort((a, b) => (a.slice(2) < b.slice(2) ? -1 : 1))

  ctx.io.out(lines.map((line) => `${line}\n`).join(''))

  return 0
}

const top: Sub = (ctx, env, args) => {
  const c = mustContainer(env, args[0] ?? '')

  if (c.status !== 'running')
    throw new Fail(`Error response from daemon: container ${c.id} is not running`)
  ctx.io.out(
    table(
      ['UID', 'PID', 'PPID', 'CMD'],
      [[c.user || 'root', String(4200 + c.created), '4180', [...c.entrypoint, ...c.cmd].join(' ')]],
    ),
  )

  return 0
}

/* ---------- exec y cp ---------- */

const exec: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      interactive: { short: 'i' },
      tty: { short: 't' },
      detach: { short: 'd' },
      env: { short: 'e', value: true },
      user: { short: 'u', value: true },
      workdir: { short: 'w', value: true },
      privileged: {},
    },
    'docker exec',
    true,
  )
  const [name, ...argv] = opts.rest

  if (name === undefined || argv.length === 0)
    throw new Fail(
      `"docker exec" requires at least 2 arguments.\nSee 'docker exec --help'.\n\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]`,
    )

  const c = mustContainer(env, name)

  if (c.status !== 'running')
    throw new Fail(`Error response from daemon: container ${c.id} is not running`)
  if (
    ['sh', '/bin/sh', 'bash', '/bin/bash', 'ash'].includes(argv[0] ?? '') &&
    argv[1] !== '-c' &&
    imageOf(env, c)?.kind !== 'distroless'
  ) {
    ctx.io.err(
      `peer4u-sandbox: aquí no hay sesión interactiva. Escribe la orden detrás (docker exec ${name} ls /) o varias con sh -c (docker exec ${name} sh -c 'cd /tmp && ls')\n`,
    )

    return 0
  }

  const result = execIn(env, c, argv, {
    env: opts.all('env'),
    ...(opts.has('user') ? { user: opts.one('user') ?? 'root' } : {}),
    ...(opts.has('workdir') ? { workdir: opts.one('workdir') ?? '/' } : {}),
    ...(opts.has('interactive') ? { stdin: ctx.io.stdin.readAll() } : {}),
  })

  ctx.io.out(result.out)
  ctx.io.err(result.err)

  return result.code
}

const cp: Sub = (ctx, env, args) => {
  const [from = '', to = ''] = args.filter((arg) => !arg.startsWith('-'))
  const remote = (spec: string) => /^([A-Za-z0-9][\w.-]*):(.*)$/.exec(spec)
  const src = remote(from)
  const dst = remote(to)
  const user = ctx.sh.user()
  const now = ctx.sh.now()

  if (src !== null && dst === null) {
    const c = mustContainer(env, src[1] ?? '')
    const path = clean(src[2] ?? '/', c.workdir)
    const single = readFile(env, c, path)
    const files =
      single !== null
        ? [[path, single] as const]
        : filesUnder(env, c, path).map((each) => [each, readFile(env, c, each) ?? ''] as const)

    if (files.length === 0)
      throw new Fail(
        `Error response from daemon: Could not find the file ${path} in container ${src[1] ?? ''}`,
      )

    let target = ctx.sh.abs(to)
    const existing = lookup(ctx.sh.machine(), user, target)
    const name = path.slice(path.lastIndexOf('/') + 1)

    if (existing?.node.kind === 'dir') target = `${target}/${name}`
    for (const [file, text] of files) {
      const dest = single !== null ? target : `${target}${file.slice(path.length)}`
      const parent = dest.slice(0, dest.lastIndexOf('/')) || '/'

      if (lookup(ctx.sh.machine(), user, parent) === null)
        makeDir(ctx.sh.machine(), user, parent, {
          parents: true,
          cmd: 'docker cp',
          now,
          umask: ctx.sh.session().umask,
        })
      writeText(ctx.sh.machine(), user, dest, text, {
        cmd: 'docker cp',
        now,
        umask: ctx.sh.session().umask,
      })
    }
    ctx.io.out(
      `Successfully copied ${human(files.reduce((sum, [, text]) => sum + text.length, 0))} to ${to}\n`,
    )

    return 0
  }
  if (src === null && dst !== null) {
    const c = mustContainer(env, dst[1] ?? '')
    const local = ctx.sh.abs(from)
    const node = lookup(ctx.sh.machine(), user, local)

    if (node === null) throw new Fail(`lstat ${local}: no such file or directory`)

    const target = clean(dst[2] ?? '/', c.workdir)
    const files =
      node.node.kind === 'file'
        ? [[local, node.node.text] as const]
        : Object.entries(ctx.sh.machine().fs).flatMap(([path, each]) =>
            each.kind === 'file' && path.startsWith(`${local}/`)
              ? [[path, each.text] as const]
              : [],
          )

    for (const [path, text] of files)
      writeFile(
        env,
        c,
        node.node.kind === 'file'
          ? target.endsWith('/') ||
            (readFile(env, c, target) === null && filesUnder(env, c, target).length > 0)
            ? `${target}/${path.slice(path.lastIndexOf('/') + 1)}`
            : target
          : `${target}${path.slice(local.length)}`,
        text,
      )
    ctx.io.out(
      `Successfully copied ${human(files.reduce((sum, [, text]) => sum + text.length, 0))} to ${to}\n`,
    )

    return 0
  }
  throw new Fail('"docker cp" requires exactly 2 arguments: one of them has to be CONTAINER:PATH')
}

/* ---------- Imágenes ---------- */

function imageRows(
  env: Env,
  filter?: string,
  dangling = false,
): { repo: string; tag: string; image: Image }[] {
  const rows: { repo: string; tag: string; image: Image }[] = []

  for (const image of Object.values(env.state.images)) {
    const tags = Object.entries(env.state.tags).filter(([, id]) => id === image.id)

    if (tags.length === 0) rows.push({ repo: '<none>', tag: '<none>', image })
    for (const [tag] of tags) {
      const at = tag.lastIndexOf(':')

      rows.push({ repo: tag.slice(0, at), tag: tag.slice(at + 1), image })
    }
  }

  return rows
    .filter((row) => (dangling ? row.repo === '<none>' : true))
    .filter(
      (row) =>
        filter === undefined ||
        row.repo === normalizeRef(filter).replace(/:[^:/]+$/, '') ||
        `${row.repo}:${row.tag}` === normalizeRef(filter),
    )
    .sort((a, b) => b.image.created - a.image.created || (a.repo < b.repo ? -1 : 1))
}

const images: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      all: { short: 'a' },
      quiet: { short: 'q' },
      filter: { short: 'f', value: true },
      format: { value: true },
      digests: {},
      'no-trunc': {},
    },
    'docker images',
  )
  const dangling = opts.all('filter').includes('dangling=true')
  const rows = imageRows(env, opts.rest[0], dangling)

  if (opts.has('quiet')) {
    ctx.io.out([...new Set(rows.map((row) => short(row.image.id)))].map((id) => `${id}\n`).join(''))

    return 0
  }
  ctx.io.out(
    table(
      [
        'REPOSITORY',
        'TAG',
        ...(opts.has('digests') ? ['DIGEST'] : []),
        'IMAGE ID',
        'CREATED',
        'SIZE',
      ],
      rows.map((row) => [
        row.repo,
        row.tag,
        ...(opts.has('digests') ? [row.image.created < 0 ? repoDigest(row.image) : '<none>'] : []),
        short(row.image.id),
        row.image.created < 0 ? '3 weeks ago' : `${ago(env.world.clock - row.image.created)} ago`,
        human(imageSize(row.image)),
      ]),
    ),
  )

  return 0
}

const history: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { 'no-trunc': {}, quiet: { short: 'q' }, human: { short: 'H' }, format: { value: true } },
    'docker history',
  )
  const image = findImage(env, opts.rest[0] ?? '')

  if (image === undefined)
    throw new Fail(`Error response from daemon: No such image: ${opts.rest[0] ?? ''}`)

  const rows = [...image.layers]
    .reverse()
    .map((layer, index) => [
      index === 0 ? short(image.id) : '<missing>',
      image.created < 0 ? '3 weeks ago' : `${ago(env.world.clock - image.created)} ago`,
      opts.has('no-trunc') || layer.createdBy.length <= 45
        ? layer.createdBy
        : `${layer.createdBy.slice(0, 44)}…`,
      human(layer.size),
      layer.createdBy.includes('buildkit') ? 'buildkit.dockerfile.v0' : '',
    ])

  ctx.io.out(table(['IMAGE', 'CREATED', 'CREATED BY', 'SIZE', 'COMMENT'], rows))

  return 0
}

/** Quita una etiqueta; si la imagen se queda sin ninguna y nadie la usa, la borra. */
function untag(env: Env, ref: string, force: boolean, out: (text: string) => void): void {
  const name = normalizeRef(ref)
  const id = own(env.state.tags, name)
  const image = id === undefined ? findImage(env, ref) : own(env.state.images, id)

  if (image === undefined) throw new Fail(`Error response from daemon: No such image: ${ref}`)

  const tags = Object.entries(env.state.tags).filter(([, each]) => each === image.id)
  const user = env.state.containers.find((c) => c.image === image.id)

  if (id === undefined && tags.length > 1 && !force)
    throw new Fail(
      `Error response from daemon: conflict: unable to delete ${short(image.id)} (must be forced) - image is referenced in multiple repositories`,
    )
  if (user !== undefined && tags.length <= 1 && !force)
    throw new Fail(
      `Error response from daemon: conflict: unable to remove repository reference "${ref}" (must force) - container ${short(user.id)} is using its referenced image ${short(image.id)}`,
    )

  const gone = id === undefined ? tags.map(([tag]) => tag) : [name]

  for (const tag of gone) {
    drop(env.state.tags, tag)
    out(`Untagged: ${tag}\n`)
  }
  if (!Object.values(env.state.tags).includes(image.id) && user === undefined) {
    drop(env.state.images, image.id)
    out(`Deleted: ${image.id}\n`)
  }
}

const rmi: Sub = (ctx, env, args) => {
  const opts = parseOpts(args, { force: { short: 'f' }, 'no-prune': {} }, 'docker rmi')
  let code = 0

  if (opts.rest.length === 0)
    throw new Fail(`"docker rmi" requires at least 1 argument.\nSee 'docker rmi --help'.`)
  for (const ref of opts.rest)
    try {
      untag(env, ref, opts.has('force'), ctx.io.out)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`${error.message}\n`)
      code = 1
    }

  return code
}

const tag: Sub = (_ctx, env, args) => {
  const [from, to] = args

  if (from === undefined || to === undefined)
    throw new Fail(
      `"docker tag" requires exactly 2 arguments.\nSee 'docker tag --help'.\n\nUsage:  docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]`,
    )

  const image = findImage(env, from)

  if (image === undefined) throw new Fail(`Error response from daemon: No such image: ${from}`)
  if (!validRef(to))
    throw new Fail(
      `Error parsing reference: "${to}" is not a valid repository/tag: invalid reference format`,
    )
  env.state.tags[safeKey(normalizeRef(to), 'etiqueta')] = image.id

  return 0
}

const pullCmd: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { quiet: { short: 'q' }, platform: { value: true }, 'all-tags': { short: 'a' } },
    'docker pull',
  )
  const ref = opts.rest[0]

  if (ref === undefined)
    throw new Fail(`"docker pull" requires exactly 1 argument.\nSee 'docker pull --help'.`)
  pull(env, ref, opts.has('quiet') ? () => undefined : ctx.io.out)
  if (opts.has('quiet'))
    ctx.io.out(`${normalizeRef(ref).replace(/^(?![^/]+\.[^/]+\/)/, 'docker.io/library/')}\n`)

  return 0
}

/** Publica una etiqueta en su registro (hace falta `docker login`). */
function push(env: Env, ref: string, out: (text: string) => void): void {
  const name = normalizeRef(ref)
  const id = own(env.state.tags, name)
  const image = id === undefined ? undefined : own(env.state.images, id)
  const registry = registryOf(name)
  const repo = name.replace(/:[^:/]+$/, '')

  if (image === undefined) throw new Fail(`An image does not exist locally with the tag: ${repo}`)
  out(
    `The push refers to repository [${registry === 'docker.io' ? `docker.io/${repo.includes('/') ? repo : `library/${repo}`}` : repo}]\n`,
  )
  if (registry === 'docker.io' && (!repo.includes('/') || !env.state.logins.includes('docker.io')))
    throw new Fail('denied: requested access to the resource is denied')
  if (!env.state.logins.includes(registry))
    throw new Fail(
      `unauthorized: unauthenticated: User cannot be authenticated with the token provided.`,
    )

  const known = own(env.state.registry.images, image.id) !== undefined

  for (const layer of image.layers.filter((each) => each.size > 0).reverse())
    out(`${short(layer.id)}: ${known ? 'Layer already exists' : 'Pushed'}\n`)
  // Lo publicado no lleva la capa escribible ni nada de la máquina: es una copia de la imagen.
  env.state.registry.images[image.id] = JSON.parse(JSON.stringify(image)) as Image
  env.state.registry.tags[safeKey(name, 'etiqueta')] = image.id
  out(
    `${name.slice(name.lastIndexOf(':') + 1)}: digest: ${repoDigest(image)} size: ${1200 + image.layers.length * 120}\n`,
  )
}

const pushCmd: Sub = (ctx, env, args) => {
  const opts = parseOpts(args, { 'all-tags': { short: 'a' }, quiet: { short: 'q' } }, 'docker push')
  const ref = opts.rest[0]

  if (ref === undefined)
    throw new Fail(`"docker push" requires exactly 1 argument.\nSee 'docker push --help'.`)
  if (opts.has('all-tags')) {
    const repo = normalizeRef(ref).replace(/:[^:/]+$/, '')

    for (const each of Object.keys(env.state.tags).filter((tagged) =>
      tagged.startsWith(`${repo}:`),
    ))
      push(env, each, ctx.io.out)

    return 0
  }
  push(env, ref, ctx.io.out)

  return 0
}

const login: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    {
      username: { short: 'u', value: true },
      password: { short: 'p', value: true },
      'password-stdin': {},
    },
    'docker login',
  )
  const server = (opts.rest[0] ?? 'docker.io').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const stdin = opts.has('password-stdin') ? ctx.io.stdin.readAll().trim() : ''
  const password = opts.one('password') ?? stdin

  if (!opts.has('username') || password === '') {
    if (opts.has('password-stdin'))
      throw new Fail('Error: Cannot perform an interactive login from a non TTY device')
    throw new Fail(
      'Error: Cannot perform an interactive login from a non TTY device (usa -u USUARIO --password-stdin, con el token por la entrada)',
    )
  }
  if (opts.has('password'))
    ctx.io.err('WARNING! Using --password via the CLI is insecure. Use --password-stdin.\n')
  if (!env.state.logins.includes(server)) env.state.logins.push(server)
  ctx.io.out('Login Succeeded\n')

  return 0
}

const logout: Sub = (ctx, env, args) => {
  const server = (args[0] ?? 'docker.io').replace(/^https?:\/\//, '')

  env.state.logins = env.state.logins.filter((each) => each !== server)
  ctx.io.out(`Removing login credentials for ${server}\n`)

  return 0
}

/* ---------- build ---------- */

const BUILD_SPEC: OptSpec = {
  tag: { short: 't', value: true },
  file: { short: 'f', value: true },
  'build-arg': { value: true },
  target: { value: true },
  'no-cache': {},
  secret: { value: true },
  platform: { value: true },
  quiet: { short: 'q' },
  push: {},
  load: {},
  progress: { value: true },
  pull: {},
  label: { value: true },
  'cache-from': { value: true },
  'cache-to': { value: true },
  builder: { value: true },
  output: { short: 'o', value: true },
}

const buildCmd =
  (buildx: boolean): Sub =>
  (ctx, env, args) => {
    const opts = parseOpts(args, BUILD_SPEC, buildx ? 'docker buildx build' : 'docker build')
    const dir = opts.rest[0]

    if (dir === undefined || opts.rest.length > 1)
      throw new Fail(
        `ERROR: "docker buildx build" requires exactly 1 argument.\nSee 'docker buildx build --help'.\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -`,
      )

    const cwd = ctx.sh.session().cwd
    const context = cleanHost(dir, cwd)
    const tags = opts.all('tag').map((each) => normalizeRef(each))
    // --platform se puede repetir o separar con comas.
    const asked = opts
      .all('platform')
      .flatMap((each) => each.split(','))
      .map((each) => each.trim())
      .filter(Boolean)
    const platforms = asked.length === 0 ? ['linux/amd64'] : [...new Set(asked)]
    // `--push` es lo mismo que `--output type=registry` (o `type=image,push=true`).
    const pushing =
      opts.has('push') ||
      opts
        .all('output')
        .some((spec) => /(^|,)type=registry(,|$)/.test(spec) || /(^|,)push=true(,|$)/.test(spec))

    if (lookup(ctx.sh.machine(), ctx.sh.user(), context)?.node.kind !== 'dir')
      throw new Fail(`ERROR: unable to prepare context: path "${dir}" not found`)
    for (const each of tags)
      if (!validRef(each))
        throw new Fail(`ERROR: invalid tag "${each}": repository name must be lowercase`)
    if (platforms.length > 1 && !pushing)
      throw new Fail(
        'ERROR: docker exporter does not currently support exporting manifest lists\n(con varias plataformas hay que publicar a la vez: --push)',
      )
    if (pushing)
      for (const each of tags)
        if (!env.state.logins.includes(registryOf(each)))
          throw new Fail(`ERROR: failed to push ${each}: unauthorized: unauthenticated`)

    const secrets = Object.fromEntries(
      opts.all('secret').map((spec) => {
        const fields = Object.fromEntries(
          spec.split(',').map((part) => part.split('=') as [string, string]),
        )

        return [fields.id ?? '', cleanHost(fields.src ?? fields.source ?? '', cwd)]
      }),
    )
    const result = build(
      env,
      {
        context,
        dockerfile: opts.has('file')
          ? cleanHost(opts.one('file') ?? '', cwd)
          : `${context}/Dockerfile`,
        tags,
        args: Object.fromEntries(
          opts
            .all('build-arg')
            .map((item) => [
              item.split('=')[0] ?? '',
              item.includes('=')
                ? item.slice(item.indexOf('=') + 1)
                : (ctx.sh.session().env[item] ?? ''),
            ]),
        ),
        ...(opts.has('target') ? { target: opts.one('target') ?? '' } : {}),
        noCache: opts.has('no-cache'),
        secrets,
        platforms,
      },
      opts.has('quiet') ? { out: () => undefined } : ctx.io,
    )

    if (result.image === null) return result.code

    const image = result.image

    env.state.images[image.id] = image
    for (const each of tags) env.state.tags[safeKey(each, 'etiqueta')] = image.id
    // Las imágenes que se quedan sin etiqueta y sin contenedor son las «colgantes» (<none>).
    if (pushing) for (const each of tags) push(env, each, ctx.io.out)
    if (opts.has('quiet')) ctx.io.out(`${image.id}\n`)

    return 0
  }

/* ---------- Volúmenes y redes ---------- */

const volume: Sub = (ctx, env, args) => {
  const [verb = '', ...rest] = args
  const opts = parseOpts(
    rest,
    {
      force: { short: 'f' },
      quiet: { short: 'q' },
      all: { short: 'a' },
      format: { short: 'f', value: true },
      label: { value: true },
      driver: { short: 'd', value: true },
    },
    `docker volume ${verb}`,
  )
  const inUse = (name: string) =>
    env.state.containers.some((c) => c.mounts.some((m) => m.type === 'volume' && m.source === name))

  switch (verb) {
    case 'create': {
      const name = opts.rest[0] ?? hex64(`vol:${env.state.seq++}`)

      if (own(env.state.volumes, name) === undefined)
        env.state.volumes[safeKey(name, 'volumen')] = {
          name,
          files: {},
          created: env.world.clock,
          labels: {},
        }
      ctx.io.out(`${name}\n`)

      return 0
    }
    case 'ls':
    case 'list':
      if (opts.has('quiet'))
        ctx.io.out(
          Object.keys(env.state.volumes)
            .map((name) => `${name}\n`)
            .join(''),
        )
      else
        ctx.io.out(
          table(
            ['DRIVER', 'VOLUME NAME'],
            Object.keys(env.state.volumes)
              .sort()
              .map((name) => ['local', name]),
          ),
        )

      return 0
    case 'inspect':
      return inspectWith(env, opts.rest, opts.one('format'), 'volume', ioOf(ctx))
    case 'rm':
    case 'remove': {
      let code = 0

      for (const name of opts.rest) {
        if (own(env.state.volumes, name) === undefined) {
          ctx.io.err(`Error response from daemon: get ${name}: no such volume\n`)
          code = 1
        } else if (inUse(name)) {
          ctx.io.err(
            `Error response from daemon: remove ${name}: volume is in use - [${env.state.containers.find((c) => c.mounts.some((m) => m.source === name))?.id ?? ''}]\n`,
          )
          code = 1
        } else {
          drop(env.state.volumes, name)
          ctx.io.out(`${name}\n`)
        }
      }

      return code
    }
    case 'prune': {
      if (!opts.has('force') && !ctx.io.stdin.readAll().trim().startsWith('y')) {
        ctx.io.out(
          'WARNING! This will remove anonymous local volumes not used by at least one container.\nAre you sure you want to continue? [y/N] \n',
        )

        return 1
      }

      const gone = Object.keys(env.state.volumes).filter(
        (name) => !inUse(name) && (opts.has('all') || name.startsWith('anon-')),
      )

      for (const name of gone) drop(env.state.volumes, name)
      ctx.io.out(
        `${gone.length > 0 ? `Deleted Volumes:\n${gone.map((name) => `${name}\n`).join('')}\n` : ''}Total reclaimed space: ${human(gone.length * 41 * MB)}\n`,
      )

      return 0
    }
    default:
      throw new Fail(
        `docker volume: '${verb}' is not a docker volume command.\nSee 'docker volume --help'`,
      )
  }
}

const network: Sub = (ctx, env, args) => {
  const [verb = '', ...rest] = args
  const opts = parseOpts(
    rest,
    {
      driver: { short: 'd', value: true },
      force: { short: 'f' },
      quiet: { short: 'q' },
      alias: { value: true },
      format: { value: true },
      internal: {},
      subnet: { value: true },
    },
    `docker network ${verb}`,
  )
  const builtin = ['bridge', 'host', 'none']

  switch (verb) {
    case 'create': {
      const name = opts.rest[0]

      if (name === undefined) throw new Fail(`"docker network create" requires exactly 1 argument.`)
      if (own(env.state.networks, name) !== undefined)
        throw new Fail(`Error response from daemon: network with name ${name} already exists`)

      const used = Object.values(env.state.networks).map((each) => each.subnet)
      const subnet = Math.max(17, ...used) + 1
      const id = hex64(`net:${name}:${subnet}`)

      env.state.networks[safeKey(name, 'red')] = {
        name,
        id: id.slice(0, 12),
        driver: 'bridge',
        subnet,
        labels: {},
      }
      ctx.io.out(`${id}\n`)

      return 0
    }
    case 'ls':
    case 'list':
      ctx.io.out(
        table(
          ['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE'],
          Object.values(env.state.networks).map((each) => [
            each.id,
            each.name,
            each.driver,
            'local',
          ]),
        ),
      )

      return 0
    case 'inspect':
      return inspectWith(env, opts.rest, opts.one('format'), 'network', ioOf(ctx))
    case 'rm':
    case 'remove': {
      let code = 0

      for (const name of opts.rest) {
        if (builtin.includes(name)) {
          ctx.io.err(
            `Error response from daemon: ${name} is a pre-defined network and cannot be removed\n`,
          )
          code = 1
        } else if (own(env.state.networks, name) === undefined) {
          ctx.io.err(`Error response from daemon: network ${name} not found\n`)
          code = 1
        } else if (
          env.state.containers.some(
            (c) => c.status === 'running' && own(c.networks, name) !== undefined,
          )
        ) {
          ctx.io.err(
            `Error response from daemon: error while removing network: network ${name} has active endpoints\n`,
          )
          code = 1
        } else {
          drop(env.state.networks, name)
          ctx.io.out(`${name}\n`)
        }
      }

      return code
    }
    case 'connect':
    case 'disconnect': {
      const [name = '', who = ''] = opts.rest
      const net = own(env.state.networks, name)
      const c = mustContainer(env, who)

      if (net === undefined) throw new Fail(`Error response from daemon: network ${name} not found`)
      if (verb === 'disconnect') drop(c.networks, name)
      else c.networks[name] = { ip: freeIp(env, name), aliases: opts.all('alias') }

      return 0
    }
    case 'prune': {
      const gone = Object.keys(env.state.networks).filter(
        (name) =>
          !builtin.includes(name) &&
          !env.state.containers.some((c) => own(c.networks, name) !== undefined),
      )

      for (const name of gone) drop(env.state.networks, name)
      ctx.io.out(
        gone.length > 0 ? `Deleted Networks:\n${gone.map((name) => `${name}\n`).join('')}` : '',
      )

      return 0
    }
    default:
      throw new Fail(
        `docker network: '${verb}' is not a docker network command.\nSee 'docker network --help'`,
      )
  }
}

/* ---------- Limpieza y sistema ---------- */

function prune(
  env: Env,
  what: 'containers' | 'images' | 'all-images' | 'cache',
  out: (text: string) => void,
): number {
  let reclaimed = 0

  if (what === 'containers') {
    const gone = env.state.containers.filter((c) => c.status === 'exited' || c.status === 'created')

    env.state.containers = env.state.containers.filter((c) => !gone.includes(c))
    if (gone.length > 0) out(`Deleted Containers:\n${gone.map((c) => `${c.id}\n`).join('')}\n`)
    reclaimed = gone.length * 1200

    return reclaimed
  }
  if (what === 'cache') {
    reclaimed = env.state.cache.length * 2 * MB
    env.state.cache = []

    return reclaimed
  }

  const used = new Set(env.state.containers.map((c) => c.image))
  const tagged = new Set(Object.values(env.state.tags))
  const gone = Object.values(env.state.images).filter(
    (image) => !used.has(image.id) && (what === 'all-images' || !tagged.has(image.id)),
  )

  if (gone.length > 0) out('Deleted Images:\n')
  for (const image of gone) {
    for (const [tagName, id] of Object.entries(env.state.tags))
      if (id === image.id) {
        drop(env.state.tags, tagName)
        out(`untagged: ${tagName}\n`)
      }
    drop(env.state.images, image.id)
    out(`deleted: ${image.id}\n`)
    reclaimed += imageSize(image)
  }
  if (gone.length > 0) out('\n')

  return reclaimed
}

function confirmed(ctx: Ctx, force: boolean, warning: string): boolean {
  if (force || ctx.io.stdin.readAll().trim().toLowerCase().startsWith('y')) return true
  ctx.io.out(`WARNING! ${warning}\nAre you sure you want to continue? [y/N] \n`)

  return false
}

const containerPrune: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { force: { short: 'f' }, filter: { value: true } },
    'docker container prune',
  )

  if (!confirmed(ctx, opts.has('force'), 'This will remove all stopped containers.')) return 1
  ctx.io.out(`Total reclaimed space: ${human(prune(env, 'containers', ctx.io.out))}\n`)

  return 0
}

const imagePrune: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { force: { short: 'f' }, all: { short: 'a' }, filter: { value: true } },
    'docker image prune',
  )

  if (
    !confirmed(
      ctx,
      opts.has('force'),
      opts.has('all')
        ? 'This will remove all images without at least one container associated to them.'
        : 'This will remove all dangling images.',
    )
  )
    return 1
  ctx.io.out(
    `Total reclaimed space: ${human(prune(env, opts.has('all') ? 'all-images' : 'images', ctx.io.out))}\n`,
  )

  return 0
}

const builderPrune: Sub = (ctx, env, args) => {
  const opts = parseOpts(
    args,
    { force: { short: 'f' }, all: { short: 'a' } },
    'docker builder prune',
  )

  if (!confirmed(ctx, opts.has('force'), 'This will remove all dangling build cache.')) return 1
  ctx.io.out(`Total:\t${human(prune(env, 'cache', ctx.io.out))}\n`)

  return 0
}

function systemDf(env: Env): string {
  const used = new Set(env.state.containers.map((c) => c.image))
  const imagesList = Object.values(env.state.images)
  const total = imagesList.reduce((sum, image) => sum + imageSize(image), 0)
  const unused = imagesList
    .filter((image) => !used.has(image.id))
    .reduce((sum, image) => sum + imageSize(image), 0)
  const containers = env.state.containers
  const stopped = containers.filter((c) => c.status !== 'running')
  const layer = (c: Container) =>
    Object.values(c.files).reduce((sum, text) => sum + text.length, 0) + 1200
  const volumes = Object.values(env.state.volumes)
  const volumeSize = (name: string) =>
    own(env.state.volumes, name)?.files === undefined ? 0 : 41 * MB
  const freeVolumes = volumes.filter(
    (each) => !containers.some((c) => c.mounts.some((m) => m.source === each.name)),
  )
  const pct = (part: number, all: number) =>
    all === 0 ? '0%' : `${Math.round((part / all) * 100)}%`
  const cache = env.state.cache.length * 2 * MB

  return table(
    ['TYPE', 'TOTAL', 'ACTIVE', 'SIZE', 'RECLAIMABLE'],
    [
      [
        'Images',
        String(imagesList.length),
        String(used.size),
        human(total),
        `${human(unused)} (${pct(unused, total)})`,
      ],
      [
        'Containers',
        String(containers.length),
        String(containers.length - stopped.length),
        human(containers.reduce((s, c) => s + layer(c), 0)),
        `${human(stopped.reduce((s, c) => s + layer(c), 0))} (${pct(stopped.length, containers.length)})`,
      ],
      [
        'Local Volumes',
        String(volumes.length),
        String(volumes.length - freeVolumes.length),
        human(volumes.reduce((s, v) => s + volumeSize(v.name), 0)),
        `${human(freeVolumes.length * 41 * MB)} (${pct(freeVolumes.length, volumes.length)})`,
      ],
      ['Build Cache', String(env.state.cache.length), '0', human(cache), human(cache)],
    ],
  )
}

const system: Sub = (ctx, env, args) => {
  const [verb = '', ...rest] = args

  if (verb === 'df') {
    ctx.io.out(systemDf(env))

    return 0
  }
  if (verb === 'prune') {
    const opts = parseOpts(
      rest,
      { force: { short: 'f' }, all: { short: 'a' }, volumes: {}, filter: { value: true } },
      'docker system prune',
    )

    if (
      !confirmed(
        ctx,
        opts.has('force'),
        `This will remove:\n  - all stopped containers\n  - all networks not used by at least one container\n  - all ${opts.has('all') ? 'images without at least one container associated to them' : 'dangling images'}\n  - unused build cache`,
      )
    )
      return 1

    let total = prune(env, 'containers', ctx.io.out)

    for (const name of Object.keys(env.state.networks))
      if (
        !['bridge', 'host', 'none'].includes(name) &&
        !env.state.containers.some((c) => own(c.networks, name) !== undefined)
      )
        drop(env.state.networks, name)
    if (opts.has('volumes'))
      for (const name of Object.keys(env.state.volumes))
        if (
          name.startsWith('anon-') &&
          !env.state.containers.some((c) => c.mounts.some((m) => m.source === name))
        )
          drop(env.state.volumes, name)
    total += prune(env, opts.has('all') ? 'all-images' : 'images', ctx.io.out)
    total += prune(env, 'cache', ctx.io.out)
    ctx.io.out(`Total reclaimed space: ${human(total)}\n`)

    return 0
  }
  if (verb === 'info') return info(ctx, env, rest)

  throw new Fail(
    `docker system: '${verb}' is not a docker system command.\nSee 'docker system --help'`,
  )
}

const info: Sub = (ctx, env) => {
  ctx.io.out(
    `Client: Docker Engine - Community\n Version:    27.3.1\n\nServer:\n Containers: ${env.state.containers.length}\n  Running: ${env.state.containers.filter((c) => c.status === 'running').length}\n  Stopped: ${env.state.containers.filter((c) => c.status !== 'running').length}\n Images: ${Object.keys(env.state.images).length}\n Server Version: 27.3.1\n Storage Driver: overlay2\n Logging Driver: json-file\n Cgroup Driver: systemd\n Kernel Version: 6.8.0-peer4u\n Operating System: Ubuntu 24.04.1 LTS (peer4u-sandbox)\n CPUs: 4\n Total Memory: 7.6GiB\n`,
  )

  return 0
}

const version: Sub = (ctx) => {
  ctx.io.out(
    'Client: Docker Engine - Community\n Version:           27.3.1\n API version:       1.47\n\nServer: Docker Engine - Community\n Engine:\n  Version:          27.3.1\n  API version:      1.47 (minimum version 1.24)\n',
  )

  return 0
}

/* ---------- scout (vulnerabilidades) ---------- */

const scout: Sub = (ctx, env, args) => {
  const [verb = '', ...rest] = args
  const opts = parseOpts(
    rest,
    { 'exit-code': { short: 'e' }, 'only-severity': { value: true }, format: { value: true } },
    `docker scout ${verb}`,
  )
  const ref = opts.rest[0]

  if (!['cves', 'quickview'].includes(verb) || ref === undefined)
    throw new Fail('Usage:  docker scout cves IMAGE | docker scout quickview IMAGE')

  // Como `image://` (lo de siempre): la imagen local y, si no está, la del registro.
  const name = normalizeRef(ref.replace(/^(image|registry|local):\/\//, ''))
  const local = ref.startsWith('registry://') ? undefined : findImage(env, name)
  const remoteId = own(env.state.registry.tags, name)
  const remote =
    ref.startsWith('local://') || local !== undefined
      ? undefined
      : (fromCatalog(name) ??
        (remoteId !== undefined && env.state.logins.includes(registryOf(name))
          ? own(env.state.registry.images, remoteId)
          : undefined))
  const image = local ?? remote

  if (image === undefined)
    throw new Fail(
      `ERROR Image not found: ${ref.startsWith('local://') ? 'image not found locally' : `failed to get image: ${name}: not found`}`,
    )

  // --only-severity filtra todo: el recuento, el resumen y el código de --exit-code.
  const only = (opts.one('only-severity') ?? 'critical,high,medium,low').split(',')
  const counts = {
    critical: only.includes('critical') ? image.cves.critical : 0,
    high: only.includes('high') ? image.cves.high : 0,
    medium: only.includes('medium') ? image.cves.medium : 0,
  }
  const counted = counts.critical + counts.high + counts.medium
  const packages = Math.ceil(counted / 6)

  ctx.io.out(
    `    ✓ ${local === undefined ? 'Pulled' : 'SBOM of image already cached'}, ${120 + image.layers.length * 9} packages indexed\n` +
      `    ${counted > 0 ? `✗ Detected ${packages} vulnerable package${packages === 1 ? '' : 's'} with a total of ${counted} vulnerabilit${counted === 1 ? 'y' : 'ies'}` : '✓ No vulnerable package detected'}\n\n` +
      `## Overview\n\n` +
      `                    │  Analyzed Image\n` +
      `────────────────────┼──────────────────────────────\n` +
      `  Target            │  ${name}\n    digest          │  ${short(image.id)}\n    platform        │  linux/amd64\n    vulnerabilities │  ${counts.critical}C   ${counts.high}H   ${counts.medium}M   0L\n  Base image        │  ${image.base}\n` +
      (counts.critical > 0
        ? `\n## Recommended fixes\n\n  Rebuild on a newer base image: node:22-alpine has 0C 0H\n`
        : ''),
  )

  return opts.has('exit-code') && counted > 0 ? 2 : 0
}

/* ---------- La orden ---------- */

type Sub = (ctx: Ctx, env: Env, args: string[]) => number

const CONTAINER: Record<string, Sub> = {
  run,
  create,
  start,
  stop,
  restart,
  kill,
  rm,
  rename,
  update,
  logs,
  exec,
  inspect: inspect('container'),
  port,
  stats,
  diff,
  top,
  cp,
  ls: ps,
  list: ps,
  ps,
  prune: containerPrune,
}

const IMAGE: Record<string, Sub> = {
  ls: images,
  list: images,
  pull: pullCmd,
  push: pushCmd,
  tag,
  rm: rmi,
  remove: rmi,
  history,
  inspect: inspect('image'),
  build: buildCmd(false),
  prune: imagePrune,
}

const TOP: Record<string, Sub> = {
  run,
  create,
  start,
  stop,
  restart,
  kill,
  rm,
  rename,
  update,
  ps,
  logs,
  exec,
  inspect: inspect(),
  port,
  stats,
  diff,
  top,
  cp,
  images,
  rmi,
  tag,
  pull: pullCmd,
  push: pushCmd,
  history,
  build: buildCmd(false),
  login,
  logout,
  info,
  version,
  volume,
  network,
  system,
  scout,
  compose: (ctx, env, args) => compose(ctx, env, args),
  container: (ctx, env, args) => group(ctx, env, args, CONTAINER, 'container'),
  image: (ctx, env, args) => group(ctx, env, args, IMAGE, 'image'),
  builder: (ctx, env, args) =>
    args[0] === 'prune'
      ? builderPrune(ctx, env, args.slice(1))
      : group(ctx, env, args, {}, 'builder'),
  buildx: (ctx, env, args) =>
    args[0] === 'build'
      ? buildCmd(true)(ctx, env, args.slice(1))
      : args[0] === 'imagetools'
        ? imagetools(ctx, env, args.slice(1))
        : args[0] === 'ls'
          ? (ctx.io.out(
              'NAME/NODE     DRIVER/ENDPOINT   STATUS    PLATFORMS\ndefault*      docker            running   linux/amd64, linux/arm64\n',
            ),
            0)
          : group(ctx, env, args, {}, 'buildx'),
}

/** `docker buildx imagetools inspect REF`: el manifiesto publicado y sus plataformas. */
function imagetools(ctx: Ctx, env: Env, args: string[]): number {
  const ref = normalizeRef(args.find((arg, i) => i > 0 && !arg.startsWith('-')) ?? '')
  const id = own(env.state.registry.tags, ref)
  const image = id === undefined ? undefined : own(env.state.registry.images, id)

  if (args[0] !== 'inspect' || image === undefined) throw new Fail(`ERROR: ${ref}: not found`)
  ctx.io.out(
    `Name:      ${ref}\nMediaType: application/vnd.oci.image.index.v1+json\nDigest:    ${repoDigest(image)}\n\nManifests:\n${image.platforms.map((platform) => `  Platform:  ${platform}\n`).join('')}`,
  )

  return 0
}

function group(
  ctx: Ctx,
  env: Env,
  args: string[],
  subs: Record<string, Sub>,
  name: string,
): number {
  const [verb = '', ...rest] = args
  const sub = own(subs, verb)

  if (sub === undefined)
    throw new Fail(
      `docker ${name}: '${verb}' is not a docker ${name} command.\nSee 'docker ${name} --help'`,
    )

  return sub(ctx, env, rest)
}

const HELP = `Usage:  docker [OPTIONS] COMMAND

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Log in to a registry
  logout      Log out from a registry
  version     Show the Docker version information
  info        Display system-wide information

Management Commands:
  builder     Manage builds
  buildx*     Docker Buildx
  compose*    Docker Compose
  container   Manage containers
  image       Manage images
  network     Manage networks
  scout*      Docker Scout
  system      Manage Docker
  volume      Manage volumes

Commands:
  cp, diff, history, inspect, kill, logs, port, rename, restart, rm, rmi,
  start, stats, stop, tag, top
`

export const docker: CommandFn = (ctx) => {
  const env = envOf(ctx)
  const [first = '', ...rest] = ctx.args

  if (first === '' || first === '--help' || first === '-h' || first === 'help') {
    ctx.io.out(HELP)

    return first === '' ? 1 : 0
  }
  if (first === '--version' || first === '-v') {
    ctx.io.out('Docker version 27.3.1, build ce12230\n')

    return 0
  }
  if (rest.includes('--help')) {
    ctx.io.out(
      `Usage:  docker ${first} [OPTIONS] …\n\n(peer4u-sandbox: ayuda corta; mira la teoría de la unidad)\n`,
    )

    return 0
  }

  const sub = own(TOP, first)

  if (sub === undefined)
    throw new Fail(`docker: '${first}' is not a docker command.\nSee 'docker --help'`)

  const code = sub(ctx, env, rest)

  withinLimits(env.state)

  return code
}

/** `docker ps`, `docker logs`… solo miran: no cuentan para las estrellas (como `ls` en la shell). */
export function lookingDocker(words: readonly string[]): boolean {
  const [program, first = '', second = ''] = words

  if (program !== 'docker') return false
  if (
    [
      'ps',
      'images',
      'logs',
      'inspect',
      'port',
      'stats',
      'diff',
      'top',
      'history',
      'info',
      'version',
      '--version',
      'help',
      '--help',
    ].includes(first)
  )
    return true
  if (first === 'system' && second === 'df') return true
  if (['volume', 'network'].includes(first) && ['ls', 'list', 'inspect'].includes(second))
    return true
  if (first === 'image' && ['ls', 'list', 'history', 'inspect'].includes(second)) return true
  if (first === 'container' && ['ls', 'list', 'ps', 'inspect', 'logs'].includes(second)) return true
  if (first === 'scout' || (first === 'buildx' && second === 'imagetools')) return true
  if (first === 'compose')
    return (
      words.slice(2).some((word) => ['ps', 'logs', 'config', 'ls', 'images'].includes(word)) &&
      !words
        .slice(2)
        .some((word) =>
          ['up', 'down', 'exec', 'restart', 'stop', 'start', 'build', 'pull', 'rm'].includes(word),
        )
    )

  return false
}
