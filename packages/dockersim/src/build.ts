/**
 * `docker build`: del Dockerfile y la carpeta (el contexto) a una imagen.
 * Lee el `.dockerignore`, manda el contexto, ejecuta cada instrucción sobre
 * la etapa y guarda una capa por paso. Cada paso tiene una clave (la de antes,
 * la instrucción y lo que copia); si ya se construyó, sale `CACHED` y no se
 * repite, así que el orden del Dockerfile se nota como en Docker: copiar
 * `package.json` e instalar antes que el código.
 *
 * Los `RUN` no se ejecutan: se reconoce lo que hacen las órdenes de siempre
 * (`npm ci`, `npm run build`, `apk add`, `apt-get install`, `adduser`,
 * `rm -rf`…) y su efecto en ficheros y tamaño. Lo demás pasa sin cambiar nada.
 */

import { fromCatalog, knownRepo, normalizeRef, registryOf } from './catalog.js'
import {
  commandOf,
  durationOf,
  DockerfileError,
  execForm,
  pairsOf,
  parseDockerfile,
  substitute,
} from './dockerfile.js'
import type { Instruction } from './dockerfile.js'
import { human } from './format.js'
import type { Env } from './fsview.js'
import { clean } from './fsview.js'
import { digestOf, hex64, short } from './hash.js'
import { LIMITS, own } from './limits.js'
import type { HealthSpec, Image, Layer } from './model.js'
import { MB, setEnv } from './model.js'
import { addAccount, canWrite, chown, setOwner, userName } from './users.js'

type BuildOptions = {
  /** Carpeta del contexto en el anfitrión (ruta absoluta). */
  context: string
  /** Ruta absoluta del Dockerfile. */
  dockerfile: string
  tags: string[]
  args: Record<string, string>
  target?: string
  noCache: boolean
  /** `--secret id=npmrc,src=.npmrc`: id → ruta absoluta en el anfitrión. */
  secrets: Record<string, string>
  platforms: string[]
}

type Io = { out: (text: string) => void }

type Stage = {
  name: string
  image: Image
  /** Los `ARG` declarados en la etapa, con su valor. */
  args: Record<string, string>
  key: string
}

class BuildError extends Error {
  constructor(
    readonly lines: string[],
    message: string,
  ) {
    super(message)
  }
}

/** Un fichero del contexto: ruta relativa (sin `/` delante), texto y tamaño. */
type CtxFile = { rel: string; text: string; size: number }

function globRegex(pattern: string): RegExp {
  let out = ''

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? ''

    if (c === '*' && pattern[i + 1] === '*') {
      out += '.*'
      i++
      if (pattern[i + 1] === '/') i++
    } else if (c === '*') out += '[^/]*'
    else if (c === '?') out += '[^/]'
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }

  return new RegExp(`^${out}$`)
}

/** Las reglas del `.dockerignore`: cada una, su patrón y si es una excepción (`!`). */
function ignoreRules(text: string): { re: RegExp; keep: boolean }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .slice(0, 200)
    .map((line) => {
      const keep = line.startsWith('!')
      const pattern = (keep ? line.slice(1) : line)
        .replace(/^\/+/, '')
        .replace(/^\.\//, '')
        .replace(/\/+$/, '')

      return { re: globRegex(pattern), keep }
    })
}

function ignored(rel: string, rules: readonly { re: RegExp; keep: boolean }[]): boolean {
  const parts = rel.split('/')
  let out = false

  for (const rule of rules)
    for (let i = 1; i <= parts.length; i++)
      if (rule.re.test(parts.slice(0, i).join('/'))) {
        out = !rule.keep
        break
      }

  return out
}

/** Los ficheros del contexto que llegan al constructor (sin lo ignorado). */
function contextOf(env: Env, dir: string): { files: CtxFile[]; size: number; ignoreText: string } {
  const node = own(env.host.fs, `${dir}/.dockerignore`)
  const ignoreText = node?.kind === 'file' ? node.text : ''
  const rules = ignoreRules(ignoreText)
  const files: CtxFile[] = []

  for (const [path, each] of Object.entries(env.host.fs)) {
    if (each.kind !== 'file' || !path.startsWith(`${dir}/`)) continue

    const rel = path.slice(dir.length + 1)

    if (ignored(rel, rules)) continue
    files.push({ rel, text: each.text, size: each.size ?? each.text.length })
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : 1))

  return { files, size: files.reduce((sum, file) => sum + file.size, 0), ignoreText }
}

const STEP_OPS = new Set(['FROM', 'RUN', 'COPY', 'ADD', 'WORKDIR'])

/** El sistema de la imagen: alpine (apk, busybox), debian (apt) o ninguno (distroless). */
function osOf(image: Image): 'alpine' | 'debian' | 'none' {
  if (image.kind === 'distroless' || image.kind === 'hello') return 'none'
  if (image.kind === 'alpine' || image.base.includes('alpine')) return 'alpine'

  return 'debian'
}

type RunEffect = { size: number; lines: string[]; code: number }

/** Lo que hace un `RUN` sobre la etapa. */
function runStep(
  env: Env,
  stage: Stage,
  command: string,
  mounts: string[],
  opts: BuildOptions,
): RunEffect {
  const image = stage.image
  const wd = image.config.workdir
  const os = osOf(image)
  const vars = {
    ...Object.fromEntries(
      image.config.env.map((item) => [item.split('=')[0] ?? '', item.slice(item.indexOf('=') + 1)]),
    ),
    ...stage.args,
  }
  const fail = (code: number, ...lines: string[]): RunEffect => ({ size: 0, lines, code })
  // Con `USER` delante, el RUN corre como ese usuario: no escribe donde no es suyo.
  const user = image.config.user
  const root = userName(image, user) === 'root'
  const made: string[] = []
  const denied = (path: string): boolean => !canWrite(image, user, path)
  let size = 0
  let aptLists = false

  if (os === 'none')
    return fail(
      1,
      'runc run failed: unable to start container process: exec: "/bin/sh": stat /bin/sh: no such file or directory',
    )

  const parts = command
    .split(/&&|;|\|\|/)
    .map((part) => part.trim())
    .filter(Boolean)
  const cleansApt = command.includes('rm -rf /var/lib/apt/lists')
  const secret = (id: string) =>
    mounts.some((mount) => mount.includes('type=secret') && mount.includes(`id=${id}`)) &&
    own(opts.secrets, id) !== undefined &&
    own(env.host.fs, own(opts.secrets, id) ?? '')?.kind === 'file'

  for (const part of parts) {
    const words = part.split(/\s+/)
    const [cmd = '', sub = ''] = words

    if (cmd === 'npm') {
      if (image.kind !== 'node') return fail(127, '/bin/sh: npm: not found')

      const pkg = own(image.files, clean('package.json', wd))

      if (pkg === undefined)
        return fail(
          254,
          `npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '${clean('package.json', wd)}'`,
        )
      if (sub === 'ci' || sub === 'install' || sub === 'i') {
        if (sub === 'ci' && own(image.files, clean('package-lock.json', wd)) === undefined)
          return fail(
            1,
            'npm error The `npm ci` command can only install with an existing package-lock.json or',
            'npm error npm-shrinkwrap.json with lockfileVersion >= 1.',
          )
        if (pkg.includes('"@peer4u/') && !secret('npmrc') && (vars.NPM_TOKEN ?? '') === '')
          return fail(
            1,
            'npm error code E401',
            'npm error 401 Unauthorized - GET https://npm.pkg.github.com/@peer4u%2fui - authentication token not provided',
          )

        if (denied(clean('node_modules', wd)))
          return fail(
            243,
            'npm error code EACCES',
            'npm error syscall mkdir',
            `npm error path ${clean('node_modules', wd)}`,
            'npm error errno -13',
            `npm error Error: EACCES: permission denied, mkdir '${clean('node_modules', wd)}'`,
          )

        const prod = /--omit[= ]dev|--only[= ]prod|--production/.test(part)
        const bytes = Math.round((prod ? 38.2 : 186.4) * MB)
        const path = clean('node_modules/.package-lock.json', wd)

        image.files[path] = `{"dev": ${prod ? 'false' : 'true'}}\n`
        image.sizes[path] = bytes
        made.push(clean('node_modules', wd), path)
        size += bytes
        continue
      }
      if (sub === 'run' && words[2] === 'build') {
        if (!/"build"\s*:/.test(pkg)) return fail(1, 'npm error Missing script: "build"')
        if (
          !(own(image.files, clean('node_modules/.package-lock.json', wd)) ?? '').includes('true')
        )
          return fail(127, '> build', '> vite build', '', 'sh: vite: not found')

        if (denied(clean('dist', wd)))
          return fail(
            1,
            '> build',
            '> vite build',
            '',
            `error during build:`,
            `Error: EACCES: permission denied, mkdir '${clean('dist', wd)}'`,
          )

        const html =
          own(image.files, clean('index.html', wd)) ?? '<!doctype html><div id="app"></div>\n'

        made.push(clean('dist', wd), clean('dist/index.html', wd), clean('dist/assets', wd))
        made.push(clean('dist/assets/index.js', wd))

        image.files[clean('dist/index.html', wd)] = html
        image.files[clean('dist/assets/index.js', wd)] = 'console.log("peer4u")\n'
        size += Math.round(0.4 * MB)
        continue
      }
      if (sub === 'prune') {
        const path = clean('node_modules/.package-lock.json', wd)

        if (own(image.files, path) !== undefined) {
          image.files[path] = '{"dev": false}\n'
          image.sizes[path] = Math.round(38.2 * MB)
        }
        continue
      }
      continue
    }
    if (cmd === 'apk') {
      if (os !== 'alpine') return fail(127, '/bin/sh: 1: apk: not found')

      const pkgs = words.slice(2).filter((word) => !word.startsWith('-'))

      if (sub === 'add') image.packages = [...new Set([...(image.packages ?? []), ...pkgs])]
      size += Math.round(pkgs.length * 2.5 * MB + (part.includes('--no-cache') ? 0 : 2.4 * MB))
      continue
    }
    if (cmd === 'apt-get' || cmd === 'apt') {
      if (os !== 'debian') return fail(127, `/bin/sh: ${cmd}: not found`)
      if (sub === 'update') {
        aptLists = true
        if (!cleansApt) size += Math.round(21 * MB)
        continue
      }
      if (sub === 'install') {
        const pkgs = words.slice(2).filter((word) => !word.startsWith('-'))

        if (!aptLists) return fail(100, `E: Unable to locate package ${pkgs[0] ?? ''}`)
        image.packages = [...new Set([...(image.packages ?? []), ...pkgs])]
        size += Math.round(pkgs.length * 30 * MB)
      }
      continue
    }
    if (cmd === 'pip' || cmd === 'pip3') {
      if (image.kind !== 'python') return fail(127, `/bin/sh: ${cmd}: not found`)
      size += Math.round(45 * MB)
      continue
    }
    if (['adduser', 'useradd', 'addgroup', 'groupadd'].includes(cmd)) {
      // busybox (alpine) solo trae adduser y addgroup; useradd y groupadd son de debian.
      if (os === 'alpine' && (cmd === 'useradd' || cmd === 'groupadd'))
        return fail(127, `/bin/sh: ${cmd}: not found`)
      if (!root) return fail(1, `${cmd}: permission denied (are you root?)`)
      addAccount(image, part, os === 'alpine')
      continue
    }
    if (cmd === 'chown') {
      if (!root) return fail(1, `chown: ${words.at(-1) ?? ''}: Operation not permitted`)
      chown(image, words, wd)
      continue
    }
    if (cmd === 'rm') {
      for (const target of words.slice(1).filter((word) => !word.startsWith('-'))) {
        const dir = clean(target.replace(/\/\*$/, ''), wd)

        for (const path of Object.keys(image.files))
          if (path === dir || path.startsWith(`${dir}/`)) {
            Reflect.deleteProperty(image.files, path)
            Reflect.deleteProperty(image.sizes, path)
          }
      }
      continue
    }
    if (cmd === 'echo' && part.includes('>')) {
      const [left = '', right = ''] = part.split(/>>?/)
      const text = left.replace(/^echo\s+/, '').replace(/^["']|["']$/g, '')

      const target = clean(right.trim(), wd)

      if (denied(target)) return fail(2, `/bin/sh: can't create ${right.trim()}: Permission denied`)
      image.files[target] = `${substitute(text, vars)}\n`
      made.push(target)
      continue
    }
    if (cmd === 'touch' || cmd === 'mkdir') {
      for (const target of words.slice(1).filter((word) => !word.startsWith('-'))) {
        const path = clean(target, wd)

        if (denied(path))
          return fail(
            1,
            cmd === 'touch'
              ? `touch: ${target}: Permission denied`
              : `mkdir: can't create directory '${target}': Permission denied`,
          )
        image.files[cmd === 'touch' ? path : `${path}/.keep`] = ''
        made.push(path)
        if (cmd === 'mkdir') made.push(`${path}/.keep`)
      }
      continue
    }
    if (cmd === 'exit' && sub !== '0') return fail(Number(sub) || 1)
    if (cmd === 'false') return fail(1)
  }

  setOwner(image, made, user)

  return { size, lines: [], code: 0 }
}

/** La configuración que pone cada instrucción de metadatos. */
function healthOf(rest: string, flags: Record<string, string>): HealthSpec {
  const text = rest.trim()

  if (/^NONE$/i.test(text)) return { test: ['NONE'], interval: 0, timeout: 0, retries: 0 }

  const body = text.replace(/^CMD\s+/i, '')
  const exec = execForm(body)

  return {
    test: exec === null ? ['CMD-SHELL', body] : ['CMD', ...exec],
    interval: durationOf(flags.interval ?? '30s'),
    timeout: durationOf(flags.timeout ?? '30s'),
    retries: Number(flags.retries ?? 3),
  }
}

/** Lo que se ve en `docker history` de una instrucción de metadatos (como lo escribe Docker). */
function historyOf(op: string, rest: string): string {
  if (op === 'CMD' || op === 'ENTRYPOINT')
    return `${op} [${commandOf(rest)
      .map((each) => `"${each}"`)
      .join(' ')}]`
  if (op === 'EXPOSE')
    return `EXPOSE map[${rest
      .split(/\s+/)
      .map((port) => `${port.includes('/') ? port : `${port}/tcp`}:{}`)
      .join(' ')}]`

  return `${op} ${rest}`
}

function cloneImage(image: Image): Image {
  return JSON.parse(JSON.stringify(image)) as Image
}

/** Una imagen por nombre para un `FROM` o un `COPY --from`: local, del catálogo o del registro. */
function scratchImage(): Image {
  return {
    id: digestOf('scratch'),
    layers: [],
    config: {
      user: '',
      env: [],
      cmd: null,
      entrypoint: null,
      workdir: '/',
      exposed: [],
      labels: {},
      healthcheck: null,
    },
    files: {},
    sizes: {},
    users: ['root'],
    kind: 'hello',
    base: 'scratch',
    created: 0,
    cves: { critical: 0, high: 0, medium: 0 },
    platforms: ['linux/amd64', 'linux/arm64'],
  }
}

/** El nombre completo que escribe BuildKit (`docker.io/library/nginx:1.27`). */
function fullName(ref: string): string {
  const name = normalizeRef(ref)

  if (registryOf(name) !== 'docker.io') return name

  return name.includes('/') ? `docker.io/${name}` : `docker.io/library/${name}`
}

/**
 * El error de BuildKit cuando un `FROM` o un `COPY --from` nombra una imagen
 * que no hay: un `--from` que no es ninguna etapa se busca como imagen
 * (`buidl` es `docker.io/library/buidl:latest`). Si el repositorio existe pero
 * no esa etiqueta, «not found»; si ni existe, «pull access denied».
 */
function missingImage(env: Env, ref: string): BuildError {
  const name = normalizeRef(ref)
  const full = fullName(name)
  const repo = name.replace(/@.*$/, '').replace(/:[^:/]+$/, '')
  const exists =
    knownRepo(repo) ||
    Object.keys(env.state.registry.tags).some((tag) => tag.startsWith(`${repo}:`))

  return new BuildError(
    [
      ` => ERROR [internal] load metadata for ${full}`,
      '------',
      ` > [internal] load metadata for ${full}:`,
      '------',
    ],
    `failed to solve: ${ref}: failed to resolve source metadata for ${full}: ${
      exists
        ? `${full}: not found`
        : 'pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed'
    }`,
  )
}

function baseImage(env: Env, ref: string): Image | null {
  if (ref === 'scratch') return scratchImage()

  const name = normalizeRef(ref)
  const local = own(env.state.tags, name)

  if (local !== undefined) return own(env.state.images, local) ?? null

  const remote = own(env.state.registry.tags, name)

  if (remote !== undefined) return own(env.state.registry.images, remote) ?? null

  return fromCatalog(name) ?? null
}

/** Construye; escribe el progreso como BuildKit y devuelve la imagen (o `null` si falla). */
export function build(env: Env, opts: BuildOptions, io: Io): { code: number; image: Image | null } {
  const lines: string[] = []
  const say = (line: string) => {
    lines.push(line)
  }
  const fileNode = own(env.host.fs, opts.dockerfile)

  try {
    if (fileNode?.kind !== 'file')
      throw new BuildError(
        [],
        `failed to solve: failed to read dockerfile: open ${opts.dockerfile.slice(opts.dockerfile.lastIndexOf('/') + 1)}: no such file or directory`,
      )

    const instructions = parseDockerfile(fileNode.text)
    const context = contextOf(env, opts.context)

    say(
      ` => [internal] load build definition from ${opts.dockerfile.slice(opts.dockerfile.lastIndexOf('/') + 1)}`,
    )
    say(` => => transferring dockerfile: ${human(fileNode.text.length)}`)
    say(' => [internal] load .dockerignore')
    say(` => => transferring context: ${human(context.ignoreText.length)}`)

    const image = construct(env, opts, instructions, context.files, context.size, say)

    io.out(
      `[+] Building ${(lines.length * 0.3).toFixed(1)}s (${lines.filter((line) => /^ => (CACHED )?\[/.test(line)).length}/${lines.filter((line) => /^ => (CACHED )?\[/.test(line)).length}) FINISHED\n${lines.join('\n')}\n`,
    )

    return { code: 0, image }
  } catch (error) {
    if (error instanceof BuildError || error instanceof DockerfileError) {
      const extra = error instanceof BuildError ? error.lines : []

      io.out(
        `[+] Building ${(lines.length * 0.3).toFixed(1)}s FAILED\n${[...lines, ...extra].join('\n')}${lines.length + extra.length > 0 ? '\n' : ''}ERROR: ${error.message}\n`,
      )

      return { code: 1, image: null }
    }
    throw error
  }
}

function construct(
  env: Env,
  opts: BuildOptions,
  instructions: Instruction[],
  files: CtxFile[],
  contextSize: number,
  say: (line: string) => void,
): Image {
  // Los ARG de antes del primer FROM valen para los FROM.
  const global: Record<string, string> = {}
  const groups: Instruction[][] = []

  for (const each of instructions) {
    if (each.op === 'FROM') groups.push([each])
    else if (groups.length === 0) {
      if (each.op !== 'ARG') throw new DockerfileError(`no build stage in current context`)

      const [name = '', value = ''] = each.rest.split('=')

      global[name] = own(opts.args, name) ?? value
    } else groups.at(-1)?.push(each)
  }
  if (groups.length > LIMITS.stages)
    throw new DockerfileError(`peer4u-sandbox: como mucho ${LIMITS.stages} etapas`)

  const names = groups.map(
    (group, index) =>
      /\s+AS\s+(\S+)\s*$/i.exec(group[0]?.rest ?? '')?.[1]?.toLowerCase() ?? String(index),
  )
  let last = groups.length - 1

  if (opts.target !== undefined) {
    last = names.indexOf(opts.target.toLowerCase())
    if (last < 0)
      throw new BuildError([], `failed to solve: target stage "${opts.target}" could not be found`)
  }

  // Solo se construye lo que necesita la etapa final (como BuildKit).
  const needed = new Set<number>([last])

  for (let i = last; i >= 0; i--) {
    if (!needed.has(i)) continue
    for (const each of groups[i] ?? []) {
      const from =
        each.op === 'FROM'
          ? (/^(\S+)/.exec(substitute(each.rest, global))?.[1] ?? '').toLowerCase()
          : each.flags.from?.toLowerCase()
      const at = from === undefined ? -1 : names.indexOf(from)

      if (at >= 0 && at < i) needed.add(at)
    }
  }

  const stages: Stage[] = []
  const multi = groups.length > 1
  let sentContext = false

  for (const [index, group] of groups.entries()) {
    if (!needed.has(index)) {
      stages.push({
        name: names[index] ?? '',
        image: scratchImage(),
        args: {},
        key: '',
      })
      continue
    }

    const label = multi
      ? /^\d+$/.test(names[index] ?? '')
        ? `stage-${index}`
        : (names[index] ?? '')
      : ''
    const total = group.filter((each) => STEP_OPS.has(each.op)).length
    let step = 0
    let stage: Stage | null = null

    for (const each of group) {
      const vars = (): Record<string, string> => ({
        ...Object.fromEntries(
          (stage?.image.config.env ?? []).map((item) => [
            item.split('=')[0] ?? '',
            item.slice(item.indexOf('=') + 1),
          ]),
        ),
        ...(stage?.args ?? {}),
      })
      const rest =
        each.op === 'FROM'
          ? substitute(each.rest, global)
          : ['RUN', 'CMD', 'ENTRYPOINT', 'HEALTHCHECK'].includes(each.op)
            ? each.rest
            : substitute(each.rest, vars())
      const tag = (cached: boolean) =>
        ` => ${cached ? 'CACHED ' : ''}[${label === '' ? '' : `${label} `}${step}/${total}] ${each.op} ${rest}`

      if (STEP_OPS.has(each.op)) step++
      if (each.op === 'FROM') {
        const ref = /^(\S+)/.exec(rest)?.[1] ?? ''
        const at = names.indexOf(ref.toLowerCase())
        const prior = at >= 0 && at < index ? stages[at] : undefined
        const found = prior?.image ?? baseImage(env, ref)

        if (found === null) throw missingImage(env, ref)

        const image = cloneImage(found)

        image.created = env.world.clock
        stage = { name: names[index] ?? '', image, args: {}, key: `from:${found.id}` }
        if (prior === undefined) say(` => [internal] load metadata for ${fullName(ref)}`)
        say(`${tag(false)}${prior === undefined ? `@${short(found.id)}` : ''}`)
        continue
      }
      if (stage === null) continue

      const current: Stage = stage
      const image = current.image
      let layer: { size: number; createdBy: string } | null = null
      let contentKey = ''

      switch (each.op) {
        case 'ARG': {
          const [name = '', value] = rest.split(/=(.*)/s)

          current.args[name] = own(opts.args, name) ?? own(global, name) ?? value ?? ''
          break
        }
        case 'ENV':
          for (const [key, value] of pairsOf(rest, 'ENV', each.line))
            image.config.env = setEnv(image.config.env, key, value)
          layer = {
            size: 0,
            createdBy: `ENV ${pairsOf(rest, 'ENV', each.line)
              .map(([k, v]) => `${k}=${v}`)
              .join(' ')}`,
          }
          break
        case 'LABEL':
          for (const [key, value] of pairsOf(rest, 'LABEL', each.line))
            image.config.labels[key] = value
          layer = { size: 0, createdBy: `LABEL ${rest}` }
          break
        case 'EXPOSE':
          for (const port of rest.split(/\s+/)) {
            const full = port.includes('/') ? port : `${port}/tcp`

            if (!image.config.exposed.includes(full)) image.config.exposed.push(full)
          }
          layer = { size: 0, createdBy: historyOf('EXPOSE', rest) }
          break
        case 'USER':
          image.config.user = rest
          layer = { size: 0, createdBy: `USER ${rest}` }
          break
        case 'WORKDIR': {
          const dir = clean(rest, image.config.workdir)
          const existed =
            image.owners?.[dir] !== undefined ||
            Object.keys(image.files).some((file) => file.startsWith(`${dir}/`))

          // BuildKit crea la carpeta con el USER de ese momento (si ya estaba, no la toca).
          if (!existed) (image.owners ??= {})[dir] = userName(image, image.config.user)
          image.config.workdir = dir
          layer = { size: 0, createdBy: `WORKDIR ${image.config.workdir}` }
          break
        }
        case 'CMD':
          image.config.cmd = commandOf(rest)
          layer = { size: 0, createdBy: historyOf('CMD', rest) }
          break
        case 'ENTRYPOINT':
          image.config.entrypoint = commandOf(rest)
          // Un ENTRYPOINT nuevo borra el CMD heredado (lo hace Docker).
          if (!group.some((other) => other.op === 'CMD' && other.line > each.line))
            image.config.cmd = null
          layer = { size: 0, createdBy: historyOf('ENTRYPOINT', rest) }
          break
        case 'HEALTHCHECK':
          image.config.healthcheck = healthOf(rest, each.flags)
          layer = { size: 0, createdBy: `HEALTHCHECK ${rest}` }
          break
        case 'COPY':
        case 'ADD': {
          const copied = copy(env, each, rest, current, stages, names, files)

          if (!sentContext && each.flags.from === undefined) {
            sentContext = true
            say(' => [internal] load build context')
            say(` => => transferring context: ${human(contextSize)}`)
          }
          if (copied.unknownFrom) throw missingImage(env, each.flags.from ?? '')
          if (copied.missing !== null)
            throw new BuildError(
              [` => ERROR ${tag(false).slice(4)}`],
              `failed to solve: failed to compute cache key: failed to calculate checksum of ref: "/${copied.missing}": not found`,
            )
          if (each.flags.chown !== undefined) {
            const owner = each.flags.chown.split(':')[0] ?? ''

            if (!/^\d+$/.test(owner) && !image.users.includes(owner))
              throw new BuildError(
                [` => ERROR ${tag(false).slice(4)}`],
                `failed to solve: unable to convert uid/gid chown string to host mapping: can't find uid for user ${owner}: no such user: ${owner}`,
              )
          }
          // COPY deja lo copiado de root (aunque haya USER), salvo con --chown; también las
          // carpetas que crea.
          setOwner(
            image,
            copied.files.map((file) => file.path),
            each.flags.chown ?? 'root',
            clean((execForm(rest) ?? rest.split(/\s+/)).at(-1) ?? '.', image.config.workdir),
          )
          contentKey = hex64(
            copied.files.map((file) => `${file.path}:${file.text}:${file.size}`).join('\n'),
          )
          layer = {
            size: copied.files.reduce((sum, file) => sum + file.size, 0),
            createdBy: `${each.op} ${rest} # buildkit`,
          }
          break
        }
        case 'RUN': {
          const command = execForm(rest)?.join(' ') ?? rest
          const mounts = (each.flags.mount ?? '').split(';').filter(Boolean)
          const argsUsed = Object.entries(current.args).map(([k, v]) => `${k}=${v}`)
          const key = hex64(
            `${current.key}|RUN ${command}|${argsUsed.join(' ')}|${JSON.stringify(image.config.env)}`,
          )
          const cached = !opts.noCache && env.state.cache.includes(key)
          const effect = runStep(env, current, command, mounts, opts)

          if (effect.code !== 0) {
            say(` => ERROR ${tag(false).slice(4)}`)
            throw new BuildError(
              [
                '------',
                ` > ${tag(false).slice(4)}:`,
                ...effect.lines.map((line) => `0.42 ${line}`),
                '------',
              ],
              `failed to solve: process "/bin/sh -c ${command}" did not complete successfully: exit code: ${effect.code}`,
            )
          }
          say(tag(cached))
          if (!cached) env.state.cache.push(key)
          current.key = key
          image.layers.push({
            id: digestOf(key),
            size: effect.size,
            createdBy: `RUN ${argsUsed.length > 0 ? `|${argsUsed.length} ${argsUsed.join(' ')} ` : ''}/bin/sh -c ${command} # buildkit`,
          })
          break
        }
        default:
          break
      }
      if (layer !== null) {
        const key = hex64(`${current.key}|${each.op} ${rest}|${contentKey}`)

        if (STEP_OPS.has(each.op)) {
          const cached = !opts.noCache && env.state.cache.includes(key)

          say(tag(cached))
          if (!cached) env.state.cache.push(key)
        }
        current.key = key
        image.layers.push({ id: digestOf(key), ...layer } satisfies Layer)
      }
      if (image.layers.length > LIMITS.layers)
        throw new DockerfileError(`peer4u-sandbox: como mucho ${LIMITS.layers} capas`)
    }
    if (stage === null) throw new DockerfileError('no build stage in current context')
    stages.push(stage)
  }

  const final = stages[last]

  if (final === undefined) throw new DockerfileError('no build stage in current context')

  const image = final.image

  image.platforms = opts.platforms
  image.id = digestOf(
    JSON.stringify([image.layers.map((layer) => layer.id), image.config, opts.platforms]),
  )
  say(' => exporting to image')
  say(' => => exporting layers')
  say(` => => writing image ${image.id}`)
  for (const tag of opts.tags) say(` => => naming to ${fullName(tag)}`)

  return image
}

type Copied = {
  files: { path: string; text: string; size: number }[]
  missing: string | null
  /** El `--from` no es ninguna etapa ni una imagen que exista. */
  unknownFrom?: boolean
}

/** Lo que copia un `COPY`/`ADD`: del contexto o de otra etapa (`--from`). */
function copy(
  env: Env,
  each: Instruction,
  rest: string,
  stage: Stage,
  stages: readonly Stage[],
  names: readonly string[],
  context: readonly CtxFile[],
): Copied {
  const parts = execForm(rest) ?? rest.split(/\s+/)
  const dest = parts.at(-1) ?? '.'
  const sources = parts.slice(0, -1)
  const image = stage.image
  const wd = image.config.workdir
  const out: Copied['files'] = []
  const from = each.flags.from?.toLowerCase()
  let pool: CtxFile[] = [...context]

  if (from !== undefined) {
    const at = names.indexOf(from)
    const other = at >= 0 ? stages[at]?.image : (baseImage(env, from) ?? undefined)

    if (other === undefined) return { files: [], missing: from, unknownFrom: true }
    pool = Object.entries(other.files).map(([path, text]) => ({
      rel: path.replace(/^\/+/, ''),
      text,
      size: own(other.sizes, path) ?? text.length,
    }))
  }

  const many = sources.length > 1 || sources.some((src) => /[*?]/.test(src))

  for (const src of sources) {
    // Como BuildKit: la ruta se resuelve dentro del contexto y no sale de él (`../api/x` es
    // `/api/x` del contexto; si ahí no está, «not found»).
    const rel = clean(src, '/').replace(/^\/+/, '')
    const re = globRegex(rel)
    const direct = pool.filter((file) =>
      rel === '' ? true : file.rel === rel || re.test(file.rel),
    )
    const inside = rel === '' ? [] : pool.filter((file) => file.rel.startsWith(`${rel}/`))

    if (direct.length === 0 && inside.length === 0) return { files: out, missing: rel }
    for (const file of rel === '' ? pool : direct) {
      const target =
        rel === ''
          ? clean(`${dest}/${file.rel}`, wd)
          : dest.endsWith('/') || many
            ? clean(`${dest}/${file.rel.slice(file.rel.lastIndexOf('/') + 1)}`, wd)
            : clean(dest, wd)

      out.push({ path: target, text: file.text, size: file.size })
    }
    for (const file of inside)
      out.push({
        path: clean(`${dest}/${file.rel.slice(rel.length + 1)}`, wd),
        text: file.text,
        size: file.size,
      })
  }
  if (out.length > LIMITS.files)
    throw new DockerfileError(
      `peer4u-sandbox: demasiados ficheros en un COPY (como mucho ${LIMITS.files})`,
    )
  for (const file of out) {
    image.files[file.path] = file.text
    if (file.size !== file.text.length) image.sizes[file.path] = file.size
    else Reflect.deleteProperty(image.sizes, file.path)
  }

  return { files: out, missing: null }
}
