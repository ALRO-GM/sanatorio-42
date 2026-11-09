/**
 * `docker compose`: lee `compose.yaml` (y `compose.override.yaml`, o los
 * `-f` que se digan), sustituye las variables con `.env` y el entorno de la
 * shell, y lleva los contenedores al estado que describe: crea la red y los
 * volúmenes del proyecto, construye o descarga las imágenes, arranca en el
 * orden de `depends_on` (esperando a `service_healthy`) y solo recrea lo que
 * cambió. También `down`, `ps`, `logs`, `config`, `exec`, `restart`…
 */

import { Fail } from '@sanatorio/shellsim'
import type { Ctx } from '@sanatorio/shellsim'

import { build } from './build.js'
import { normalizeRef } from './catalog.js'
import { durationOf } from './dockerfile.js'
import {
  cleanHost,
  commandText,
  createContainer,
  findImage,
  parseOpts,
  portOf,
  pull,
  removeContainer,
  startContainer,
  stopContainer,
  volumeOf,
} from './engine.js'
import type { CreateSpec } from './engine.js'
import { ago, bytesOf, table } from './format.js'
import type { Env } from './fsview.js'
import { imageOf } from './fsview.js'
import { hex64 } from './hash.js'
import { drop, LIMITS, own, safeKey } from './limits.js'
import type { Container, HealthSpec, Mount, RestartPolicy } from './model.js'
import { healthOf } from './runtime.js'
import { execIn } from './shell.js'
import { bare, parseDotenv, parseYaml, stringifyYaml, YamlError } from './yaml.js'
import type { Yaml } from './yaml.js'

type Service = {
  name: string
  image?: string
  build?: { context: string; dockerfile: string; target?: string; args: Record<string, string> }
  ports: string[]
  environment: Record<string, string>
  volumes: string[]
  networks: string[]
  aliases: Record<string, string[]>
  dependsOn: Record<string, string>
  healthcheck?: HealthSpec | null
  restart: RestartPolicy
  command?: string[]
  entrypoint?: string[]
  user?: string
  workdir?: string
  memory: number
  containerName?: string
  replicas: number
  secrets: string[]
}

type Project = {
  name: string
  dir: string
  services: Service[]
  volumes: string[]
  networks: string[]
  secrets: Record<string, string>
  /** El YAML ya combinado y con las variables puestas (lo que enseña `config`). */
  merged: Record<string, Yaml>
}

const DEFAULT_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']
const OVERRIDES = [
  'compose.override.yaml',
  'compose.override.yml',
  'docker-compose.override.yaml',
  'docker-compose.override.yml',
]

const isMap = (value: Yaml | undefined): value is Record<string, Yaml> =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)

function readHost(env: Env, path: string): string | null {
  const node = own(env.host.fs, path)

  return node?.kind === 'file' ? node.text : null
}

/** `${X}`, `${X:-def}`, `${X-def}`, `${X:?error}`, `$X` y `$$`. */
function interpolate(
  text: string,
  vars: Record<string, string>,
  warn: (name: string) => void,
): string {
  return text.replace(
    /\$\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?:(:?[-?])([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (whole, braced?: string, op?: string, word?: string, bare?: string) => {
      if (whole === '$$') return '$'

      const name = braced ?? bare ?? ''
      const value = own(vars, name)
      const empty = value === undefined || (op?.startsWith(':') === true && value === '')

      if (op?.endsWith('-') === true) return empty ? (word ?? '') : value
      if (op?.endsWith('?') === true && empty)
        throw new Fail(`required variable ${name} is missing a value: ${word ?? ''}`)
      if (value === undefined) warn(name)

      return value ?? ''
    },
  )
}

function walk(value: Yaml, fn: (text: string) => string): Yaml {
  if (value === null) return null
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((item) => walk(item, fn))

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item, fn)]))
}

/** Combina dos ficheros: los mapas por clave; puertos y demás listas se suman; volúmenes por destino. */
function merge(base: Yaml, extra: Yaml, key = ''): Yaml {
  if (isMap(base) && isMap(extra)) {
    const out: Record<string, Yaml> = { ...base }

    for (const [k, v] of Object.entries(extra))
      out[k] = Object.hasOwn(out, k) ? merge(out[k] ?? null, v, k) : v

    return out
  }
  if (Array.isArray(base) && Array.isArray(extra)) {
    if (key === 'command' || key === 'entrypoint') return extra
    if (key === 'volumes') {
      const target = (item: Yaml) => (typeof item === 'string' ? (item.split(':')[1] ?? item) : '')
      const kept = base.filter((item) => !extra.some((other) => target(other) === target(item)))

      return [...kept, ...extra]
    }

    return [...base, ...extra.filter((item) => !base.includes(item))]
  }

  return extra
}

/**
 * Los volúmenes de un servicio en forma corta (`origen:destino[:ro]`), también
 * si se escribieron en la larga (`type`, `source`, `target`, `read_only`).
 */
function volumesOf(value: Yaml | undefined): string[] {
  if (!Array.isArray(value)) return listOf(value)

  return value
    .map((item) => {
      if (!isMap(item)) return typeof item === 'string' ? item : ''

      const source = typeof item.source === 'string' ? item.source : ''
      const target = typeof item.target === 'string' ? item.target : ''
      const ro = item.read_only === 'true' ? ':ro' : ''

      if (target === '') return ''

      return source === '' ? target : `${source}:${target}${ro}`
    })
    .filter(Boolean)
}

/** Los puertos en forma corta (`[ip:]publicado:destino`), también desde la larga. */
function portsOf(value: Yaml | undefined): string[] {
  if (!Array.isArray(value)) return listOf(value)

  return value
    .map((item) => {
      if (!isMap(item)) return typeof item === 'string' ? item : ''

      const target = typeof item.target === 'string' ? item.target : ''
      const published = typeof item.published === 'string' ? item.published : ''
      const ip = typeof item.host_ip === 'string' ? `${item.host_ip}:` : ''

      if (target === '') return ''

      return published === '' ? target : `${ip}${published}:${target}`
    })
    .filter(Boolean)
}

const listOf = (value: Yaml | undefined): string[] =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean)
      : typeof value === 'string'
        ? [value]
        : Object.keys(value)

/** `npm start`, `["node", "server.js"]` → la lista (compose parte las palabras, sin shell). */
function commandOf(value: Yaml | undefined): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string')
    return (
      value.match(/"[^"]*"|'[^']*'|\S+/g)?.map((word) => word.replace(/^["']|["']$/g, '')) ?? []
    )

  return listOf(value)
}

function healthcheckOf(value: Yaml | undefined): HealthSpec | null | undefined {
  if (!isMap(value)) return undefined
  if (value.disable === 'true') return { test: ['NONE'], interval: 0, timeout: 0, retries: 0 }

  const test = value.test
  const list = typeof test === 'string' ? ['CMD-SHELL', test] : listOf(test)

  return {
    test: list,
    interval: durationOf(typeof value.interval === 'string' ? value.interval : '30s'),
    timeout: durationOf(typeof value.timeout === 'string' ? value.timeout : '30s'),
    retries: Number(typeof value.retries === 'string' ? value.retries : 3),
  }
}

const TOP_KEYS = new Set([
  'services',
  'volumes',
  'networks',
  'name',
  'version',
  'secrets',
  'configs',
  'x-common',
])
const SERVICE_KEYS = new Set([
  'image',
  'build',
  'ports',
  'environment',
  'env_file',
  'volumes',
  'networks',
  'depends_on',
  'healthcheck',
  'restart',
  'command',
  'entrypoint',
  'user',
  'working_dir',
  'mem_limit',
  'container_name',
  'deploy',
  'secrets',
  'expose',
  'profiles',
  'develop',
  'labels',
  'read_only',
  'stop_grace_period',
  'tty',
  'stdin_open',
  'init',
  'cpus',
  'hostname',
  'platform',
  'pull_policy',
  // Válidas en Compose aunque el simulador no las modele: se aceptan sin efecto.
  'cap_add',
  'cap_drop',
  'security_opt',
  'extra_hosts',
  'logging',
  'ulimits',
  'tmpfs',
  'stop_signal',
  'shm_size',
  'mem_reservation',
  'privileged',
  'dns',
  'sysctls',
  'configs',
  'group_add',
  'links',
  'network_mode',
  'pid',
  'ipc',
  'expose',
  'annotations',
  'domainname',
  'devices',
  'extends',
  'post_start',
  'attach',
  'scale',
])

type Loaded = { project: Project; warnings: string[]; notes: string[] }

/** Lee el proyecto: ficheros, `.env`, variables y validación. */
function load(
  ctx: Ctx,
  env: Env,
  files: string[],
  name: string | undefined,
  envFile: string | undefined,
  projectDir?: string,
): Loaded {
  const cwd =
    projectDir === undefined ? ctx.sh.session().cwd : cleanHost(projectDir, ctx.sh.session().cwd)
  // Sin -f, COMPOSE_FILE (separados por «:») hace lo mismo.
  const fromEnv = (ctx.sh.session().env.COMPOSE_FILE ?? '').split(':').filter(Boolean)
  let paths = (files.length > 0 ? files : fromEnv).map((file) => cleanHost(file, cwd))

  const fromEnvName = ctx.sh.session().env.COMPOSE_PROJECT_NAME

  if (fromEnvName !== undefined && fromEnvName !== '') name ??= fromEnvName
  if (paths.length === 0) {
    const main = DEFAULT_FILES.map((file) => `${cwd}/${file}`).find(
      (path) => readHost(env, path) !== null,
    )

    if (main === undefined) throw new Fail('no configuration file provided: not found')
    paths = [
      main,
      ...OVERRIDES.map((file) => `${cwd}/${file}`)
        .filter((path) => readHost(env, path) !== null)
        .slice(0, 1),
    ]
  }

  const dir = (paths[0] ?? cwd).slice(0, (paths[0] ?? cwd).lastIndexOf('/')) || '/'
  const dotenv = readHost(env, envFile === undefined ? `${dir}/.env` : cleanHost(envFile, cwd))

  if (envFile !== undefined && dotenv === null)
    throw new Fail(`couldn't find env file: ${cleanHost(envFile, cwd)}`)

  const vars = { ...(dotenv === null ? {} : parseDotenv(dotenv)), ...ctx.sh.session().env }
  const warnings: string[] = []
  const notes: string[] = []
  let merged: Yaml = {}

  for (const path of paths) {
    const text = readHost(env, path)

    if (text === null) throw new Fail(`open ${path}: no such file or directory`)

    let parsed: Yaml

    try {
      parsed = parseYaml(text)
    } catch (error) {
      if (error instanceof YamlError) throw new Fail(`yaml: ${error.message}`)
      throw error
    }
    if (!isMap(parsed)) throw new Fail(`validating ${path}: (root) must be a mapping`)
    for (const key of Object.keys(parsed))
      if (!TOP_KEYS.has(key) && !key.startsWith('x-'))
        throw new Fail(`validating ${path}: additional properties '${key}' not allowed`)
    // Compose v2 ya no usa `version:`: lo ignora y avisa.
    if (Object.hasOwn(parsed, 'version'))
      notes.push(
        `${path}: the attribute \`version\` is obsolete, it will be ignored, please remove it to avoid potential confusion`,
      )
    merged = merge(merged, parsed)
  }
  merged = walk(merged, (text) =>
    interpolate(text, vars, (missing) => {
      if (!warnings.includes(missing)) warnings.push(missing)
    }),
  )

  const root = merged as Record<string, Yaml>
  const services = root.services

  if (!isMap(services) || Object.keys(services).length === 0) throw new Fail('no service selected')
  if (Object.keys(services).length > LIMITS.services)
    throw new Fail(`peer4u-sandbox: como mucho ${LIMITS.services} servicios`)

  const projectName = (
    name ??
    (typeof root.name === 'string' ? root.name : undefined) ??
    dir.slice(dir.lastIndexOf('/') + 1)
  )
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  const volumes = listOf(root.volumes)
  const networks = listOf(root.networks)
  const secrets: Record<string, string> = {}

  if (isMap(root.secrets))
    for (const [key, value] of Object.entries(root.secrets))
      secrets[key] =
        isMap(value) && typeof value.file === 'string' ? cleanHost(value.file, dir) : ''

  const list: Service[] = Object.entries(services).map(([svc, raw]) => {
    if (!isMap(raw)) throw new Fail(`services.${svc} must be a mapping`)
    for (const key of Object.keys(raw))
      if (!SERVICE_KEYS.has(key) && !key.startsWith('x-'))
        throw new Fail(
          `validating compose.yaml: services.${svc} additional properties '${key}' not allowed`,
        )
    if (raw.image === undefined && raw.build === undefined)
      throw new Fail(
        `service "${svc}" has neither an image nor a build context specified: invalid compose project`,
      )

    const environment: Record<string, string> = {}

    for (const file of listOf(raw.env_file)) {
      const text = readHost(env, cleanHost(file, dir))

      if (text === null)
        throw new Fail(
          `env file ${cleanHost(file, dir)} not found: stat ${cleanHost(file, dir)}: no such file or directory`,
        )
      Object.assign(environment, parseDotenv(text))
    }
    if (Array.isArray(raw.environment))
      for (const item of listOf(raw.environment)) {
        const at = item.indexOf('=')

        environment[item.slice(0, at < 0 ? item.length : at)] =
          at < 0 ? (own(vars, item) ?? '') : item.slice(at + 1)
      }
    else if (isMap(raw.environment))
      for (const [key, value] of Object.entries(raw.environment))
        environment[key] = typeof value === 'string' ? value : ''

    const dependsOn: Record<string, string> = {}

    if (Array.isArray(raw.depends_on))
      for (const dep of listOf(raw.depends_on)) dependsOn[dep] = 'service_started'
    else if (isMap(raw.depends_on))
      for (const [dep, value] of Object.entries(raw.depends_on))
        dependsOn[dep] =
          isMap(value) && typeof value.condition === 'string' ? value.condition : 'service_started'
    for (const dep of Object.keys(dependsOn))
      if (!Object.hasOwn(services, dep))
        throw new Fail(
          `service "${svc}" depends on undefined service "${dep}": invalid compose project`,
        )

    const vols = volumesOf(raw.volumes)

    for (const spec of vols) {
      const source = spec.split(':')[0] ?? ''

      if (spec.includes(':') && !/^[./~]/.test(source) && !volumes.includes(source))
        throw new Fail(
          `service "${svc}" refers to undefined volume ${source}: invalid compose project`,
        )
    }

    const build_ = raw.build
    const deploy = isMap(raw.deploy) ? raw.deploy : {}
    const limits =
      isMap(deploy.resources) && isMap(deploy.resources.limits) ? deploy.resources.limits : {}
    const memory =
      typeof raw.mem_limit === 'string'
        ? raw.mem_limit
        : typeof limits.memory === 'string'
          ? limits.memory
          : ''
    const restart = typeof raw.restart === 'string' ? raw.restart : 'no'

    if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(restart))
      throw new Fail(`services.${svc}.restart: invalid restart policy "${restart}"`)

    const aliases: Record<string, string[]> = {}

    if (isMap(raw.networks))
      for (const [net, value] of Object.entries(raw.networks))
        aliases[net] = isMap(value) ? listOf(value.aliases) : []
    for (const net of listOf(raw.networks))
      if (!networks.includes(net) && net !== 'default')
        throw new Fail(
          `service "${svc}" refers to undefined network ${net}: invalid compose project`,
        )

    const service: Service = {
      name: svc,
      ports: portsOf(raw.ports),
      environment,
      volumes: vols,
      networks: listOf(raw.networks),
      aliases,
      dependsOn,
      restart: restart as RestartPolicy,
      memory: memory === '' ? 0 : bytesOf(memory),
      replicas: Number(typeof deploy.replicas === 'string' ? deploy.replicas : 1),
      secrets: listOf(raw.secrets),
    }

    if (typeof raw.image === 'string') service.image = raw.image
    if (typeof build_ === 'string')
      service.build = { context: cleanHost(build_, dir), dockerfile: 'Dockerfile', args: {} }
    else if (isMap(build_))
      service.build = {
        context: cleanHost(typeof build_.context === 'string' ? build_.context : '.', dir),
        dockerfile: typeof build_.dockerfile === 'string' ? build_.dockerfile : 'Dockerfile',
        ...(typeof build_.target === 'string' ? { target: build_.target } : {}),
        args: isMap(build_.args)
          ? Object.fromEntries(
              Object.entries(build_.args).map(([k, v]) => [k, typeof v === 'string' ? v : '']),
            )
          : {},
      }

    const health = healthcheckOf(raw.healthcheck)
    const command = commandOf(raw.command)
    const entrypoint = commandOf(raw.entrypoint)

    if (health !== undefined) service.healthcheck = health
    if (command !== undefined) service.command = command
    if (entrypoint !== undefined) service.entrypoint = entrypoint
    if (typeof raw.user === 'string') service.user = raw.user
    if (typeof raw.working_dir === 'string') service.workdir = raw.working_dir
    if (typeof raw.container_name === 'string') service.containerName = raw.container_name

    return service
  })

  return {
    project: { name: projectName, dir, services: list, volumes, networks, secrets, merged: root },
    warnings,
    notes,
  }
}

/** Los servicios en orden de arranque (las dependencias antes). */
function ordered(project: Project): Service[] {
  const out: Service[] = []
  const visit = (service: Service, stack: string[]) => {
    if (out.includes(service)) return
    if (stack.includes(service.name))
      throw new Fail(`dependency cycle detected: ${[...stack, service.name].join(' -> ')}`)
    for (const dep of Object.keys(service.dependsOn)) {
      const found = project.services.find((each) => each.name === dep)

      if (found !== undefined) visit(found, [...stack, service.name])
    }
    out.push(service)
  }

  for (const service of project.services) visit(service, [])

  return out
}

const containersOf = (env: Env, project: Project, service?: string): Container[] =>
  env.state.containers.filter(
    (c) =>
      c.labels['com.docker.compose.project'] === project.name &&
      (service === undefined || c.labels['com.docker.compose.service'] === service),
  )

const networkName = (project: Project, net: string): string => `${project.name}_${net}`

function imageRef(project: Project, service: Service): string {
  return service.image ?? `${project.name}-${service.name}`
}

/** Lo que se le pide a Docker para un servicio (y su huella: si cambia, se recrea). */
function specOf(project: Project, service: Service, index: number): CreateSpec {
  const mounts: Mount[] = service.volumes.map((spec) => {
    const mount = volumeOf(spec, project.dir)

    return mount.type === 'volume' && project.volumes.includes(mount.source)
      ? { ...mount, source: networkName(project, mount.source) }
      : mount
  })

  for (const secret of service.secrets)
    mounts.push({
      type: 'bind',
      source: own(project.secrets, secret) ?? '',
      target: `/run/secrets/${secret}`,
      readOnly: true,
    })

  const nets = service.networks.length === 0 ? ['default'] : service.networks

  return {
    name: service.containerName ?? `${project.name}-${service.name}-${index}`,
    ref: imageRef(project, service),
    ...(service.command === undefined ? {} : { cmd: service.command }),
    ...(service.entrypoint === undefined ? {} : { entrypoint: service.entrypoint }),
    env: Object.entries(service.environment).map(([key, value]) => `${key}=${value}`),
    ports: [],
    mounts,
    networks: nets.map((net) => ({
      name: networkName(project, net),
      aliases: [service.name, ...(own(service.aliases, net) ?? [])],
    })),
    restart: service.restart,
    memory: service.memory,
    cpus: 0,
    ...(service.user === undefined ? {} : { user: service.user }),
    ...(service.workdir === undefined ? {} : { workdir: service.workdir }),
    ...(service.healthcheck === undefined ? {} : { healthcheck: service.healthcheck }),
    autoRemove: false,
    readOnly: false,
    labels: {
      'com.docker.compose.project': project.name,
      'com.docker.compose.service': service.name,
      'com.docker.compose.container-number': String(index),
    },
  }
}

type Line = (what: string, name: string, state: string) => void

/** La imagen de un servicio: la construye (si tiene `build:` y falta o se pide `--build`) o la descarga. */
function imageFor(
  ctx: Ctx,
  env: Env,
  project: Project,
  service: Service,
  rebuild: boolean,
  line: Line,
): string | null {
  const ref = normalizeRef(imageRef(project, service))
  const existing = findImage(env, ref)

  if (service.build !== undefined && (existing === undefined || rebuild)) {
    const result = build(
      env,
      {
        context: service.build.context,
        dockerfile: cleanHost(service.build.dockerfile, service.build.context),
        tags: [ref],
        args: service.build.args,
        ...(service.build.target === undefined ? {} : { target: service.build.target }),
        noCache: false,
        secrets: {},
        platforms: ['linux/amd64'],
      },
      ctx.io,
    )

    if (result.image === null) return null
    env.state.images[result.image.id] = result.image
    env.state.tags[safeKey(ref, 'etiqueta')] = result.image.id
    line('Service', service.name, 'Built')

    return result.image.id
  }
  if (existing !== undefined) return existing.id
  try {
    const image = pull(env, ref, () => undefined)

    line('Image', ref, 'Pulled')

    return image.id
  } catch (error) {
    if (error instanceof Fail) {
      ctx.io.err(`${error.message}\n`)

      return null
    }
    throw error
  }
}

function up(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      detach: { short: 'd' },
      build: {},
      'force-recreate': {},
      'no-deps': {},
      scale: { value: true },
      wait: {},
      'remove-orphans': {},
      'no-build': {},
      pull: { value: true },
      'quiet-pull': {},
    },
    'docker compose up',
  )
  const wanted = opts.rest
  const lines: string[] = []
  const line: Line = (what, name, state) => {
    lines.push(` ✔ ${what} ${name.padEnd(Math.max(18, name.length + 1))} ${state}`)
  }
  const scales = Object.fromEntries(
    opts.all('scale').map((item) => [item.split('=')[0] ?? '', Number(item.split('=')[1] ?? 1)]),
  )
  let services = ordered(project)

  if (wanted.length > 0) {
    const keep = new Set<string>()
    const add = (name: string) => {
      if (keep.has(name)) return
      keep.add(name)
      if (!opts.has('no-deps'))
        for (const dep of Object.keys(
          project.services.find((each) => each.name === name)?.dependsOn ?? {},
        ))
          add(dep)
    }

    for (const name of wanted) {
      if (!project.services.some((each) => each.name === name))
        throw new Fail(`no such service: ${name}`)
      add(name)
    }
    services = services.filter((each) => keep.has(each.name))
  }

  const finish = (code: number): number => {
    ctx.io.out(
      `[+] Running ${lines.length}/${lines.length}\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`,
    )

    return code
  }

  for (const net of new Set(
    services.flatMap((each) => (each.networks.length === 0 ? ['default'] : each.networks)),
  )) {
    const full = networkName(project, net)

    if (own(env.state.networks, full) === undefined) {
      const subnet =
        Math.max(17, ...Object.values(env.state.networks).map((each) => each.subnet)) + 1

      env.state.networks[safeKey(full, 'red')] = {
        name: full,
        id: hex64(`net:${full}`).slice(0, 12),
        driver: 'bridge',
        subnet,
        labels: { 'com.docker.compose.project': project.name },
      }
      line('Network', full, 'Created')
    }
  }
  for (const volume of project.volumes) {
    const full = networkName(project, volume)

    if (own(env.state.volumes, full) === undefined) {
      env.state.volumes[safeKey(full, 'volumen')] = {
        name: full,
        files: {},
        created: env.world.clock,
        labels: { 'com.docker.compose.project': project.name },
      }
      line('Volume', `"${full}"`, 'Created')
    }
  }

  for (const service of services) {
    for (const [dep, condition] of Object.entries(service.dependsOn)) {
      const deps = containersOf(env, project, dep)

      if (condition === 'service_healthy' && !deps.every((c) => healthOf(env, c) === 'healthy')) {
        ctx.io.err(`dependency failed to start: container ${deps[0]?.name ?? dep} is unhealthy\n`)

        return finish(1)
      }
      if (
        condition === 'service_completed_successfully' &&
        !deps.every((c) => c.status === 'exited' && c.exitCode === 0)
      ) {
        ctx.io.err(
          `service "${dep}" didn't complete successfully: exit ${deps[0]?.exitCode ?? 1}\n`,
        )

        return finish(1)
      }
    }

    const imageId = imageFor(ctx, env, project, service, opts.has('build'), line)

    if (imageId === null) return finish(1)

    const replicas = Math.min(LIMITS.replicas, own(scales, service.name) ?? service.replicas)
    const existing = containersOf(env, project, service.name)

    if (replicas > 1 && service.ports.some((port) => port.includes(':')))
      ctx.io.err(
        `WARNING: service ${service.name} publishes a fixed host port: only one replica can use it\n`,
      )
    for (const extra of existing.filter(
      (c) => Number(c.labels['com.docker.compose.container-number']) > replicas,
    )) {
      stopContainer(env, extra)
      removeContainer(env, extra)
      line('Container', extra.name, 'Removed')
    }
    for (let index = 1; index <= replicas; index++) {
      const spec = specOf(project, service, index)

      spec.ports =
        index === 1 || !service.ports.some((port) => port.includes(':'))
          ? service.ports.map((port) => portOf(port, env))
          : []

      const hash = hex64(JSON.stringify([spec, imageId]))
      const current = existing.find(
        (c) => c.labels['com.docker.compose.container-number'] === String(index),
      )

      if (
        current?.labels['com.docker.compose.config-hash'] === hash &&
        !opts.has('force-recreate')
      ) {
        if (current.status === 'running') {
          line('Container', current.name, 'Running')
          continue
        }

        const result = startContainer(env, current)

        if (result.error !== null) {
          ctx.io.err(
            `Error response from daemon: ${result.error.replace(/^Error response from daemon: /, '')}\n`,
          )

          return finish(1)
        }
        line('Container', current.name, 'Started')
        continue
      }

      let recreated = false

      if (current !== undefined) {
        stopContainer(env, current)
        removeContainer(env, current)
        recreated = true
      }

      const image = own(env.state.images, imageId)

      if (image === undefined) return finish(1)
      spec.labels['com.docker.compose.config-hash'] = hash

      const container = createContainer(env, image, spec)
      const result = startContainer(env, container)

      if (result.error !== null) {
        ctx.io.err(
          `Error response from daemon: ${result.error.replace(/^Error response from daemon: /, '')}\n`,
        )

        return finish(1)
      }
      line(
        'Container',
        container.name,
        recreated ? 'Recreated' : healthOf(env, container) === 'healthy' ? 'Healthy' : 'Started',
      )
    }
  }

  const code = finish(0)

  if (opts.has('wait')) {
    const sick = services
      .flatMap((service) => containersOf(env, project, service.name))
      .find((c) => c.status !== 'running' || healthOf(env, c) === 'unhealthy')

    if (sick !== undefined) {
      ctx.io.err(
        `container ${sick.name} is ${sick.status !== 'running' ? 'exited' : 'unhealthy'}\n`,
      )

      return 1
    }
  }
  if (!opts.has('detach')) {
    for (const c of services.flatMap((service) => containersOf(env, project, service.name)))
      ctx.io.out(c.logs.map((log) => `${c.name.padEnd(14)} | ${log}\n`).join(''))
    ctx.io.err(
      'peer4u-sandbox: sin -d, compose se quedaría enganchado a los registros; aquí vuelve y los servicios siguen corriendo (usa up -d)\n',
    )
  }

  return code
}

function down(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      volumes: { short: 'v' },
      rmi: { value: true },
      'remove-orphans': {},
      timeout: { short: 't', value: true },
    },
    'docker compose down',
  )
  const lines: string[] = []

  for (const c of containersOf(env, project)) {
    stopContainer(env, c)
    removeContainer(env, c)
    lines.push(` ✔ Container ${c.name}  Removed`)
  }
  for (const name of Object.keys(env.state.networks))
    if (own(env.state.networks, name)?.labels['com.docker.compose.project'] === project.name) {
      drop(env.state.networks, name)
      lines.push(` ✔ Network ${name}  Removed`)
    }
  if (opts.has('volumes'))
    for (const volume of project.volumes) {
      const full = networkName(project, volume)

      if (own(env.state.volumes, full) !== undefined) {
        drop(env.state.volumes, full)
        lines.push(` ✔ Volume ${full}  Removed`)
      }
    }
  if (opts.one('rmi') !== undefined)
    for (const service of project.services) {
      const ref = normalizeRef(imageRef(project, service))

      if (opts.one('rmi') === 'all' || service.image === undefined) drop(env.state.tags, ref)
    }
  ctx.io.out(
    `[+] Running ${lines.length}/${lines.length}\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`,
  )

  return 0
}

function psCompose(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    { all: { short: 'a' }, quiet: { short: 'q' }, services: {}, format: { value: true } },
    'docker compose ps',
  )
  const list = containersOf(env, project).filter(
    (c) =>
      (opts.has('all') || c.status === 'running' || c.status === 'restarting') &&
      (opts.rest.length === 0 || opts.rest.includes(c.labels['com.docker.compose.service'] ?? '')),
  )

  if (opts.has('quiet')) {
    ctx.io.out(list.map((c) => `${c.id.slice(0, 12)}\n`).join(''))

    return 0
  }
  if (opts.has('services')) {
    ctx.io.out(
      [...new Set(list.map((c) => c.labels['com.docker.compose.service'] ?? ''))]
        .map((name) => `${name}\n`)
        .join(''),
    )

    return 0
  }
  ctx.io.out(
    table(
      ['NAME', 'IMAGE', 'COMMAND', 'SERVICE', 'CREATED', 'STATUS', 'PORTS'],
      list.map((c) => {
        const health = healthOf(env, c)
        const since = ago(env.world.clock - (c.status === 'running' ? c.started : c.finished))
        const status =
          c.status === 'running'
            ? `Up ${since}${health === null ? '' : ` (${health})`}`
            : c.status === 'restarting'
              ? `Restarting (${c.exitCode}) ${since} ago`
              : `Exited (${c.exitCode}) ${since} ago`

        return [
          c.name,
          c.ref,
          commandText(c),
          c.labels['com.docker.compose.service'] ?? '',
          `${ago(env.world.clock - c.created)} ago`,
          status,
          c.status === 'running'
            ? c.ports.map((p) => `${p.ip}:${p.host}->${p.container}/tcp`).join(', ')
            : '',
        ]
      }),
    ),
  )

  return 0
}

function logsCompose(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      follow: { short: 'f' },
      tail: { short: 'n', value: true },
      timestamps: { short: 't' },
      'no-color': {},
      'no-log-prefix': {},
    },
    'docker compose logs',
  )
  const tail = opts.one('tail')

  for (const c of containersOf(env, project).filter(
    (each) =>
      opts.rest.length === 0 || opts.rest.includes(each.labels['com.docker.compose.service'] ?? ''),
  )) {
    const lines =
      tail === undefined || tail === 'all' ? c.logs : c.logs.slice(-Math.max(0, Number(tail) || 0))

    ctx.io.out(
      lines
        .map((log) => `${opts.has('no-log-prefix') ? '' : `${c.name.padEnd(14)} | `}${log}\n`)
        .join(''),
    )
  }

  return 0
}

/** Un volumen de servicio como lo escribe `docker compose config` (forma larga). */
function volumeYaml(spec: string, dir: string): Yaml {
  const mount = volumeOf(spec, dir)
  const ro = mount.readOnly ? { read_only: bare('true') } : {}

  if (mount.type === 'bind')
    return {
      type: 'bind',
      source: mount.source,
      target: mount.target,
      ...ro,
      bind: { create_host_path: bare('true') },
    }
  if (mount.source.startsWith('anon-'))
    return { type: 'volume', target: mount.target, ...ro, volume: {} }

  return { type: 'volume', source: mount.source, target: mount.target, ...ro, volume: {} }
}

/** Un puerto como lo escribe `docker compose config`: `published` entre comillas, `target` no. */
function portYaml(spec: string): Yaml {
  const parts = spec.replace(/\/(tcp|udp)$/, '').split(':')
  const target = parts.at(-1) ?? ''
  const published = parts.length >= 2 ? parts.at(-2) : undefined
  const ip = parts.length >= 3 ? parts.slice(0, -2).join(':') : undefined

  return {
    mode: 'ingress',
    ...(ip === undefined ? {} : { host_ip: ip }),
    target: bare(target),
    ...(published === undefined ? {} : { published: published }),
    protocol: spec.endsWith('/udp') ? 'udp' : 'tcp',
  }
}

function config(ctx: Ctx, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    { services: {}, volumes: {}, quiet: { short: 'q' }, format: { value: true } },
    'docker compose config',
  )

  if (opts.has('quiet')) return 0
  if (opts.has('services')) {
    ctx.io.out(project.services.map((each) => `${each.name}\n`).join(''))

    return 0
  }
  if (opts.has('volumes')) {
    ctx.io.out(project.volumes.map((each) => `${each}\n`).join(''))

    return 0
  }

  const services = project.merged.services as Record<string, Yaml>
  const out: Record<string, Yaml> = { name: project.name, services: {} }

  for (const service of project.services) {
    const raw = { ...(services[service.name] as Record<string, Yaml>) }

    if (Object.keys(service.environment).length > 0)
      raw.environment = Object.fromEntries(Object.entries(service.environment).sort())
    Reflect.deleteProperty(raw, 'env_file')
    if (service.build !== undefined)
      raw.build = { context: service.build.context, dockerfile: service.build.dockerfile }
    // Como Compose: volúmenes, puertos y depends_on en la forma larga, con rutas absolutas.
    if (service.volumes.length > 0)
      raw.volumes = service.volumes.map((spec) => volumeYaml(spec, project.dir))
    if (service.ports.length > 0) raw.ports = service.ports.map(portYaml)
    if (Object.keys(service.dependsOn).length > 0)
      raw.depends_on = Object.fromEntries(
        Object.entries(service.dependsOn).map(([dep, condition]) => [
          dep,
          { condition, required: bare('true') },
        ]),
      )
    if (service.restart !== 'no') raw.restart = service.restart
    raw.networks = Object.fromEntries(
      (service.networks.length === 0 ? ['default'] : service.networks).map((net) => [net, null]),
    )
    ;(out.services as Record<string, Yaml>)[service.name] = Object.fromEntries(
      Object.entries(raw).sort(([a], [b]) => (a < b ? -1 : 1)),
    )
  }
  if (project.merged.volumes !== undefined)
    out.volumes = Object.fromEntries(
      project.volumes.map((each) => [each, { name: networkName(project, each) }]),
    )
  out.networks = Object.fromEntries(
    [
      ...new Set([
        ...project.services.flatMap((each) =>
          each.networks.length === 0 ? ['default'] : each.networks,
        ),
      ]),
    ].map((net) => [net, { name: networkName(project, net) }]),
  )
  ctx.io.out(stringifyYaml(out))

  return 0
}

function execCompose(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      'no-TTY': { short: 'T' },
      user: { short: 'u', value: true },
      env: { short: 'e', value: true },
      workdir: { short: 'w', value: true },
      index: { value: true },
      detach: { short: 'd' },
      interactive: { short: 'i' },
      tty: { short: 't' },
    },
    'docker compose exec',
    true,
  )
  const [name, ...argv] = opts.rest

  if (name === undefined || argv.length === 0)
    throw new Fail('"docker compose exec" requires at least 2 arguments: SERVICE COMMAND')

  const c = containersOf(env, project, name).find(
    (each) => each.labels['com.docker.compose.container-number'] === (opts.one('index') ?? '1'),
  )

  if (c?.status !== 'running') throw new Fail(`service "${name}" is not running`)
  if (
    ['sh', 'bash', '/bin/sh', '/bin/bash'].includes(argv[0] ?? '') &&
    argv[1] !== '-c' &&
    imageOf(env, c)?.kind !== 'distroless'
  ) {
    ctx.io.err(
      `peer4u-sandbox: aquí no hay sesión interactiva. Escribe la orden detrás (docker compose exec ${name} ls /)\n`,
    )

    return 0
  }

  const result = execIn(env, c, argv, {
    env: opts.all('env'),
    ...(opts.has('user') ? { user: opts.one('user') ?? 'root' } : {}),
    ...(opts.has('workdir') ? { workdir: opts.one('workdir') ?? '/' } : {}),
  })

  ctx.io.out(result.out)
  ctx.io.err(result.err)

  return result.code
}

function lifecycle(ctx: Ctx, env: Env, project: Project, verb: string, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      force: { short: 'f' },
      stop: { short: 's' },
      timeout: { short: 't', value: true },
      volumes: { short: 'v' },
    },
    `docker compose ${verb}`,
  )
  const targets = containersOf(env, project).filter(
    (c) =>
      opts.rest.length === 0 || opts.rest.includes(c.labels['com.docker.compose.service'] ?? ''),
  )
  const lines: string[] = []

  for (const c of targets) {
    if (verb === 'stop' || verb === 'restart' || (verb === 'rm' && opts.has('stop')))
      stopContainer(env, c)
    if (verb === 'start' || verb === 'restart') {
      const result = startContainer(env, c)

      if (result.error !== null) {
        ctx.io.err(`${result.error}\n`)

        return 1
      }
    }
    if (verb === 'rm') {
      if (c.status === 'running') continue
      removeContainer(env, c)
    }
    lines.push(
      ` ✔ Container ${c.name}  ${{ stop: 'Stopped', start: 'Started', restart: 'Started', rm: 'Removed' }[verb] ?? ''}`,
    )
  }
  ctx.io.out(
    `[+] ${verb === 'restart' ? 'Restarting' : 'Running'} ${lines.length}/${lines.length}\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`,
  )

  return 0
}

function buildCompose(ctx: Ctx, env: Env, project: Project, args: string[]): number {
  const opts = parseOpts(
    args,
    { 'no-cache': {}, pull: {}, quiet: { short: 'q' } },
    'docker compose build',
  )

  for (const service of project.services.filter(
    (each) => each.build !== undefined && (opts.rest.length === 0 || opts.rest.includes(each.name)),
  ))
    if (imageFor(ctx, env, project, service, true, () => undefined) === null) return 1

  return 0
}

function pullCompose(ctx: Ctx, env: Env, project: Project): number {
  for (const service of project.services.filter(
    (each) => each.image !== undefined && each.build === undefined,
  )) {
    pull(env, service.image ?? '', () => undefined)
    ctx.io.out(` ✔ ${service.name} Pulled\n`)
  }

  return 0
}

export function compose(ctx: Ctx, env: Env, args: string[]): number {
  const opts = parseOpts(
    args,
    {
      file: { short: 'f', value: true },
      'project-name': { short: 'p', value: true },
      'env-file': { value: true },
      profile: { value: true },
      'project-directory': { value: true },
    },
    'docker compose',
    true,
  )
  const [verb = '', ...rest] = opts.rest

  if (verb === '' || verb === 'help' || verb === '--help') {
    ctx.io.out(
      'Usage:  docker compose [OPTIONS] COMMAND\n\nCommands:\n  build, config, down, exec, logs, ps, pull, restart, rm, start, stop, up, version\n',
    )

    return verb === '' ? 1 : 0
  }
  if (verb === 'version') {
    ctx.io.out('Docker Compose version v2.29.7\n')

    return 0
  }
  if (verb === 'ls') {
    const names = [
      ...new Set(
        env.state.containers
          .map((c) => c.labels['com.docker.compose.project'])
          .filter((name): name is string => name !== undefined),
      ),
    ]

    ctx.io.out(
      table(
        ['NAME', 'STATUS'],
        names.map((name) => [
          name,
          `running(${env.state.containers.filter((c) => c.labels['com.docker.compose.project'] === name && c.status === 'running').length})`,
        ]),
      ),
    )

    return 0
  }

  const { project, warnings, notes } = load(
    ctx,
    env,
    opts.all('file'),
    opts.one('project-name'),
    opts.one('env-file'),
    opts.one('project-directory'),
  )

  for (const name of warnings)
    ctx.io.err(`WARN[0000] The "${name}" variable is not set. Defaulting to a blank string.\n`)
  for (const note of notes) ctx.io.err(`WARN[0000] ${note}\n`)

  switch (verb) {
    case 'up':
      return up(ctx, env, project, rest)
    case 'down':
      return down(ctx, env, project, rest)
    case 'ps':
      return psCompose(ctx, env, project, rest)
    case 'logs':
      return logsCompose(ctx, env, project, rest)
    case 'config':
      return config(ctx, project, rest)
    case 'exec':
      return execCompose(ctx, env, project, rest)
    case 'stop':
    case 'start':
    case 'restart':
    case 'rm':
      return lifecycle(ctx, env, project, verb, rest)
    case 'build':
      return buildCompose(ctx, env, project, rest)
    case 'pull':
      return pullCompose(ctx, env, project)
    case 'images':
      ctx.io.out(
        table(
          ['CONTAINER', 'REPOSITORY', 'TAG'],
          containersOf(env, project).map((c) => [
            c.name,
            c.ref.replace(/:[^:/]+$/, ''),
            c.ref.slice(c.ref.lastIndexOf(':') + 1),
          ]),
        ),
      )

      return 0
    default:
      throw new Fail(`unknown docker command: "compose ${verb}"`)
  }
}
