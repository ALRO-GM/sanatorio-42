/**
 * Las piezas que comparten `docker` y `docker compose`: leer opciones como la
 * CLI de Docker, descargar una imagen si falta, crear, arrancar, parar y
 * borrar contenedores, y las comprobaciones de siempre (nombre repetido,
 * puerto ocupado, usuario que no existe en la imagen).
 */

import { Fail } from '@sanatorio/shellsim'
import type { Ctx } from '@sanatorio/shellsim'

import { fromCatalog, normalizeRef, registryOf, repoDigest, validRef } from './catalog.js'
import type { Env } from './fsview.js'
import { imageOf } from './fsview.js'
import { hex64, short } from './hash.js'
import { own, safeKey } from './limits.js'
import type { Container, HealthSpec, Image, Mount, PortBinding, RestartPolicy } from './model.js'
import { dockerOf } from './model.js'
import { boot, programOf } from './runtime.js'

export function envOf(ctx: Ctx): Env {
  return { world: ctx.sh.world, state: dockerOf(ctx.sh.world), host: ctx.sh.machine() }
}

export type OptSpec = Record<string, { short?: string; value?: boolean }>

type Parsed = {
  opts: Map<string, string[]>
  rest: string[]
  has: (name: string) => boolean
  one: (name: string) => string | undefined
  all: (name: string) => string[]
}

/**
 * Opciones al estilo de la CLI de Docker: `-d`, `-it`, `-p 8080:80`,
 * `-p8080:80`, `--name web`, `--name=web`. Con `stop`, la primera palabra que
 * no es opción y lo que sigue van a `rest` tal cual (la orden de `docker run`).
 */
export function parseOpts(
  args: readonly string[],
  spec: OptSpec,
  usage: string,
  stop = false,
): Parsed {
  const opts = new Map<string, string[]>()
  const rest: string[] = []
  const shorts = new Map(
    Object.entries(spec).flatMap(([name, each]) =>
      each.short === undefined ? [] : [[each.short, name] as const],
    ),
  )
  const add = (name: string, value: string) => {
    opts.set(name, [...(opts.get(name) ?? []), value])
  }
  const unknown = (flag: string): never => {
    throw new Fail(
      `unknown ${flag.startsWith('--') ? 'flag' : 'shorthand flag'}: '${flag.replace(/^-+/, '')}' in ${flag}\nSee '${usage} --help'.`,
      125,
    )
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (arg === '--') {
      rest.push(...args.slice(i + 1))
      break
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const [name = '', value] = arg.slice(2).split(/=(.*)/s)
      const known = own(spec, name)

      if (known === undefined) unknown(`--${name}`)
      if (known?.value === true) {
        if (value === undefined && i + 1 >= args.length)
          throw new Fail(`flag needs an argument: --${name}\nSee '${usage} --help'.`, 125)
        add(name, value ?? args[++i] ?? '')
      } else add(name, value ?? 'true')
      continue
    }
    if (arg.startsWith('-') && arg.length > 1) {
      for (let j = 1; j < arg.length; j++) {
        const name = shorts.get(arg[j] ?? '')

        if (name === undefined) unknown(`-${arg[j] ?? ''}`)

        const known = own(spec, name ?? '')

        if (known?.value === true) {
          const value = arg.slice(j + 1)

          if (value === '' && i + 1 >= args.length)
            throw new Fail(
              `flag needs an argument: '${arg[j] ?? ''}' in -${arg[j] ?? ''}\nSee '${usage} --help'.`,
              125,
            )
          add(name ?? '', value !== '' ? value.replace(/^=/, '') : (args[++i] ?? ''))
          break
        }
        add(name ?? '', 'true')
      }
      continue
    }
    rest.push(arg)
    if (stop) {
      rest.push(...args.slice(i + 1))
      break
    }
  }

  return {
    opts,
    rest,
    has: (name) => opts.has(name),
    one: (name) => opts.get(name)?.at(-1),
    all: (name) => opts.get(name) ?? [],
  }
}

/** Un contenedor por nombre o por el principio de su id. */
export function findContainer(env: Env, key: string): Container | undefined {
  return (
    env.state.containers.find((c) => c.name === key.replace(/^\//, '')) ??
    (key.length >= 3 ? env.state.containers.find((c) => c.id.startsWith(key)) : undefined)
  )
}

export function mustContainer(env: Env, key: string): Container {
  const found = findContainer(env, key)

  if (found === undefined) throw new Fail(`Error response from daemon: No such container: ${key}`)

  return found
}

/** Una imagen local por referencia o id (corto o entero). */
export function findImage(env: Env, key: string): Image | undefined {
  const tagged = own(env.state.tags, normalizeRef(key))

  if (tagged !== undefined) return own(env.state.images, tagged)

  const id = key.replace(/^sha256:/, '')

  if (id.length >= 4 && /^[0-9a-f]+$/.test(id))
    return Object.values(env.state.images).find((image) =>
      image.id.replace('sha256:', '').startsWith(id),
    )

  return undefined
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** ¿Se puede descargar de este registro (hace falta `docker login` en los privados)? */
function remoteImage(env: Env, ref: string): { image: Image | null; denied: boolean } {
  const catalog = fromCatalog(ref)

  if (catalog !== undefined) return { image: catalog, denied: false }

  const id = own(env.state.registry.tags, ref)
  const image = id === undefined ? undefined : own(env.state.registry.images, id)

  if (image === undefined) return { image: null, denied: false }

  return { image, denied: !env.state.logins.includes(registryOf(ref)) }
}

/** Descarga una imagen (como `docker pull`): la deja con su etiqueta en la máquina. */
export function pull(env: Env, ref: string, out: (text: string) => void): Image {
  const name = normalizeRef(ref)

  if (!validRef(name))
    throw new Fail(`invalid reference format: repository name (${ref}) must be lowercase`)

  const { image, denied } = remoteImage(env, name)
  const repo = name.replace(/:[^:/]+$/, '').replace(/@.*$/, '')

  if (denied)
    throw new Fail(
      `Error response from daemon: Head "https://${registryOf(name)}/v2/${repo.split('/').slice(1).join('/')}/manifests/${name.split(':').at(-1) ?? ''}": unauthorized`,
    )
  if (image === null) {
    if (
      fromCatalog(`${repo}:latest`) !== undefined ||
      own(env.state.registry.tags, `${repo}:latest`) !== undefined
    )
      throw new Fail(
        `Error response from daemon: manifest for ${name} not found: manifest unknown: manifest unknown`,
      )
    throw new Fail(
      `Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied`,
    )
  }

  const tag = name.includes('@') ? name : name.slice(name.lastIndexOf(':') + 1)
  const fresh = own(env.state.images, image.id) === undefined

  out(
    `${tag}: Pulling from ${registryOf(name) === 'docker.io' && !repo.includes('/') ? `library/${repo}` : repo}\n`,
  )
  for (const layer of image.layers.filter((each) => each.size > 0))
    out(`${short(layer.id)}: ${fresh ? 'Pull complete' : 'Already exists'}\n`)
  out(`Digest: ${repoDigest(image)}\n`)
  out(`Status: ${fresh ? 'Downloaded newer image' : 'Image is up to date'} for ${name}\n`)
  if (fresh) env.state.images[image.id] = { ...clone(image), created: -1 }
  if (!name.includes('@')) env.state.tags[safeKey(name, 'imagen')] = image.id

  return own(env.state.images, image.id) ?? image
}

/** La imagen de un `docker run`: la local o, si no está, la descarga. */
export function ensureImage(
  env: Env,
  ref: string,
  out: (text: string) => void,
  err: (text: string) => void,
): Image {
  const local = findImage(env, ref)

  if (local !== undefined) return local
  err(`Unable to find image '${normalizeRef(ref)}' locally\n`)
  try {
    return pull(env, ref, out)
  } catch (error) {
    if (error instanceof Fail) throw new Fail(`docker: ${error.message}`, 125)
    throw error
  }
}

const ADJECTIVES = [
  'eager',
  'brave',
  'calm',
  'clever',
  'focused',
  'happy',
  'jolly',
  'keen',
  'nifty',
  'quirky',
  'sharp',
  'zen',
]
const NOUNS = [
  'turing',
  'hopper',
  'lovelace',
  'ritchie',
  'torvalds',
  'hamilton',
  'knuth',
  'liskov',
  'thompson',
  'wozniak',
]

export type CreateSpec = {
  name?: string
  ref: string
  cmd?: string[]
  entrypoint?: string[]
  env: string[]
  ports: PortBinding[]
  mounts: Mount[]
  networks: { name: string; aliases: string[] }[]
  restart: RestartPolicy
  memory: number
  cpus: number
  user?: string
  workdir?: string
  healthcheck?: HealthSpec | null
  autoRemove: boolean
  readOnly: boolean
  labels: Record<string, string>
}

/** Crea un contenedor (parado); lanza el error de Docker si el nombre ya está o falta la red. */
export function createContainer(env: Env, image: Image, spec: CreateSpec): Container {
  const seq = env.state.seq++
  let name = spec.name

  if (name !== undefined) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name))
      throw new Fail(
        `docker: Error response from daemon: Invalid container name (${name}), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed.`,
        125,
      )

    const taken = env.state.containers.find((c) => c.name === name)

    if (taken !== undefined)
      throw new Fail(
        `docker: Error response from daemon: Conflict. The container name "/${name}" is already in use by container "${taken.id}". You have to remove (or rename) that container to be able to reuse that name.`,
        125,
      )
  } else
    for (let i = 0; name === undefined || env.state.containers.some((c) => c.name === name); i++)
      name = `${ADJECTIVES[(seq + i) % ADJECTIVES.length] ?? 'eager'}_${NOUNS[(seq * 7 + i) % NOUNS.length] ?? 'turing'}`

  const networks: Container['networks'] = {}

  for (const net of spec.networks.length === 0
    ? [{ name: 'bridge', aliases: [] }]
    : spec.networks) {
    const network = own(env.state.networks, net.name)

    if (network === undefined)
      throw new Fail(`docker: Error response from daemon: network ${net.name} not found.`, 125)

    networks[net.name] = { ip: freeIp(env, net.name), aliases: net.aliases }
  }

  const container: Container = {
    id: hex64(`container:${seq}:${name}`),
    name: safeKey(name, 'nombre de contenedor'),
    image: image.id,
    ref: normalizeRef(spec.ref),
    created: env.world.clock,
    started: -1,
    finished: -1,
    status: 'created',
    exitCode: 0,
    oomKilled: false,
    entrypoint: spec.entrypoint ?? image.config.entrypoint ?? [],
    cmd:
      spec.cmd !== undefined && spec.cmd.length > 0
        ? spec.cmd
        : spec.entrypoint !== undefined
          ? []
          : (image.config.cmd ?? []),
    env: mergeEnv(image.config.env, spec.env),
    user: spec.user ?? image.config.user,
    workdir: spec.workdir ?? image.config.workdir,
    ports: spec.ports,
    mounts: spec.mounts,
    networks,
    restart: spec.restart,
    restartCount: 0,
    memory: spec.memory,
    cpus: spec.cpus,
    healthcheck: spec.healthcheck === undefined ? null : spec.healthcheck,
    files: {},
    deleted: [],
    logs: [],
    autoRemove: spec.autoRemove,
    readOnly: spec.readOnly,
    labels: spec.labels,
  }

  for (const mount of spec.mounts)
    if (mount.type === 'volume' && own(env.state.volumes, mount.source) === undefined)
      env.state.volumes[safeKey(mount.source, 'volumen')] = {
        name: mount.source,
        files: {},
        created: env.world.clock,
        labels: {},
      }
  env.state.containers.push(container)

  return container
}

/** La primera IP libre de una red (`172.18.0.2`, `.3`…; la `.1` es la pasarela). */
export function freeIp(env: Env, name: string): string {
  const network = own(env.state.networks, name)

  if (network === undefined || network.subnet === 0) return ''

  const taken = new Set(env.state.containers.map((c) => own(c.networks, name)?.ip))

  for (let n = 2; ; n++)
    if (!taken.has(`172.${network.subnet}.0.${n}`)) return `172.${network.subnet}.0.${n}`
}

function mergeEnv(base: readonly string[], extra: readonly string[]): string[] {
  let out = [...base]

  for (const item of extra) {
    const key = item.split('=')[0] ?? ''

    out = [...out.filter((each) => !each.startsWith(`${key}=`)), item]
  }

  return out
}

/** Un usuario de `USER` o `--user` que no existe en la imagen (`app`) hace fallar el arranque. */
function unknownUser(env: Env, container: Container): string | null {
  const name = container.user.split(':')[0] ?? ''

  if (name === '' || /^\d+$/.test(name)) return null

  return (imageOf(env, container)?.users ?? ['root']).includes(name) ? null : name
}

/** Arranca un contenedor; si Docker no puede ni empezar, queda creado y sale el error con 125/126. */
export function startContainer(
  env: Env,
  container: Container,
): { code: number; output: string; error: string | null } {
  const user = unknownUser(env, container)

  if (user !== null)
    return {
      code: 125,
      output: '',
      error: `Error response from daemon: unable to find user ${user}: no matching entries in passwd file`,
    }
  for (const binding of container.ports) {
    const busy = env.state.containers.find(
      (other) =>
        other !== container &&
        other.status === 'running' &&
        other.ports.some((each) => each.host === binding.host),
    )

    if (busy !== undefined)
      return {
        code: 125,
        output: '',
        error: `Error response from daemon: driver failed programming external connectivity on endpoint ${container.name} (${container.id.slice(0, 64)}): Bind for ${binding.ip}:${binding.host} failed: port is already allocated`,
      }
  }

  const result = boot(env, container)

  if (
    container.autoRemove &&
    (container.status === 'exited' || (container.status === 'created' && result.error))
  )
    removeContainer(env, container)

  return { ...result, error: result.error ?? null }
}

/** Para un contenedor: los servidores salen con 0; una app de Node sin manejar SIGTERM, con 143. */
export function stopContainer(
  env: Env,
  container: Container,
  signal: 'TERM' | 'KILL' = 'TERM',
): void {
  if (container.status !== 'running' && container.status !== 'restarting') return

  const program = programOf(env, container)

  container.status = 'exited'
  container.finished = env.world.clock
  container.exitCode =
    signal === 'KILL'
      ? 137
      : program.kind === 'server' && program.role !== 'app' && program.role !== 'sleep'
        ? 0
        : 143
  if (program.kind === 'server' && program.role === 'postgres' && signal === 'TERM')
    container.logs.push(
      'LOG:  received fast shutdown request',
      'LOG:  database system is shut down',
    )
  if (container.autoRemove) removeContainer(env, container)
}

export function removeContainer(env: Env, container: Container): void {
  env.state.containers = env.state.containers.filter((c) => c !== container)
}

/** `8080:80`, `127.0.0.1:6379:6379`, `80` (puerto al azar), `8080:80/tcp`. */
export function portOf(spec: string, env: Env): PortBinding {
  const parts = spec.replace(/\/(tcp|udp)$/, '').split(':')
  const container = Number(parts.at(-1))
  const host = parts.length >= 2 ? Number(parts.at(-2)) : 32768 + env.state.seq++
  const ip = parts.length >= 3 ? parts.slice(0, -2).join(':') : '0.0.0.0'

  if (
    !Number.isInteger(container) ||
    !Number.isInteger(host) ||
    container <= 0 ||
    host <= 0 ||
    host > 65535 ||
    container > 65535
  )
    throw new Fail(
      `docker: invalid publish opts format (should be name=value but got '${spec}')`,
      125,
    )

  return { ip, host, container }
}

/**
 * `-v datos:/var/lib/postgresql/data`, `-v "$PWD/html":/usr/share/nginx/html:ro`,
 * `-v ./html:/x` (relativo a donde estás). Una ruta absoluta o con `.` es un
 * bind mount; un nombre, un volumen.
 */
export function volumeOf(spec: string, cwd: string): Mount {
  const parts = spec.split(':')
  const readOnly = parts.length >= 3 && parts.at(-1) === 'ro'
  const [source = '', target = ''] = parts
  const bind = source.startsWith('/') || source.startsWith('.') || source.startsWith('~')

  if (parts.length < 2)
    return {
      type: 'volume',
      source: `anon-${hex64(spec).slice(0, 12)}`,
      target: source,
      readOnly: false,
    }
  if (!target.startsWith('/'))
    throw new Fail(
      `docker: Error response from daemon: invalid volume specification: '${spec}': invalid mount config for type "${bind ? 'bind' : 'volume'}": invalid mount path: '${target}' mount path must be absolute`,
      125,
    )

  return {
    type: bind ? 'bind' : 'volume',
    source: bind ? cleanHost(source, cwd) : source,
    target,
    readOnly,
  }
}

export function cleanHost(path: string, cwd: string): string {
  const full = path.startsWith('/') ? path : `${cwd}/${path}`
  const parts: string[] = []

  for (const part of full.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }

  return `/${parts.join('/')}`
}

/** `--mount type=bind,source=…,target=…,readonly`. */
export function mountOf(spec: string, cwd: string): Mount {
  const fields = Object.fromEntries(
    spec.split(',').map((part) => {
      const [key = '', value = 'true'] = part.split('=')

      return [key, value]
    }),
  ) as Record<string, string>
  const type = (fields.type ?? 'volume') as Mount['type']
  const source = fields.source ?? fields.src ?? ''
  const target = fields.target ?? fields.destination ?? fields.dst ?? ''

  if (target === '')
    throw new Fail(
      'docker: invalid argument "' + spec + '" for "--mount" flag: target is required',
      125,
    )

  return {
    type,
    source: type === 'bind' ? cleanHost(source, cwd) : source,
    target,
    readOnly: fields.readonly !== undefined || fields.ro !== undefined,
  }
}

/** Lo que enseña `docker ps` de la orden: entre comillas y cortada a 20 caracteres. */
export function commandText(container: Container): string {
  const text = [...container.entrypoint, ...container.cmd].join(' ')

  return `"${text.length > 20 ? `${text.slice(0, 19)}…` : text}"`
}
