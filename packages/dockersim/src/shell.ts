/**
 * Las órdenes que se ejecutan dentro de un contenedor (`docker exec`, el
 * proceso de un `docker run` que acaba, los healthchecks y el `sh -c` de un
 * guion): una shell mínima, como la `sh` de busybox de una imagen alpine. Hay
 * lo que se usa para mirar y depurar (`ls`, `cat`, `env`, `id`, `ping`,
 * `wget`, `curl`, `psql`, `redis-cli`, `tar`…); lo demás da «not found».
 * Una imagen distroless no tiene ni shell.
 */

import { clean, filesUnder, imageOf, isDir, readFile, writeFile } from './fsview.js'
import type { Env } from './fsview.js'
import type { Container, Image } from './model.js'
import { envValue } from './model.js'
import { httpOf, ipOf, pgData, resolveIn } from './runtime.js'
import { canWrite, idLine, ownerOf, userName } from './users.js'

type ExecResult = {
  code: number
  out: string
  err: string
  /**
   * El proceso principal ni arranca (el programa no existe o no se puede
   * ejecutar): Docker lo dice al crear la tarea y el contenedor queda Created.
   */
  start?: string
}

type ExecOptions = {
  /** Es el proceso principal (su salida va al registro del contenedor). */
  main?: boolean
  /** Un healthcheck: no deja nada en el registro. */
  quiet?: boolean
  user?: string
  env?: string[]
  workdir?: string
  /** Lo que llega por la entrada (`docker exec -i`). */
  stdin?: string
}

type Run = {
  env: Env
  container: Container
  vars: string[]
  user: string
  cwd: string
  out: string[]
  err: string[]
  stdin: string
  /** La entrada de la orden entera (la de `docker exec -i`). */
  input: string
  /** `$0`, `$1`… de un `sh -c 'orden' nombre args` (lo de detrás de la orden). */
  params: string[]
  /** `$?`: el código de la última orden. */
  last: number
}

const SHELLS = new Set(['sh', '/bin/sh', 'bash', '/bin/bash', 'ash', '/bin/ash'])

/** `$?`, `$#`, `$@`, `$*` y `$0`…`$9` de la shell de dentro. */
function special(run: Run, c: string): string {
  if (c === '?') return String(run.last)
  if (c === '#') return String(Math.max(run.params.length - 1, 0))
  if (c === '@' || c === '*') return run.params.slice(1).join(' ')

  return run.params[Number(c)] ?? ''
}

/** Las palabras de una orden de `sh -c`, con comillas y `$VARIABLES`. */
function words(src: string, run: Run): string[] {
  const vars = run.vars
  const out: string[] = []
  let current = ''
  let has = false
  let quote: string | null = null

  for (let i = 0; i < src.length; i++) {
    const c = src[i] ?? ''

    if (quote === "'") {
      if (c === "'") quote = null
      else current += c
      continue
    }
    if (c === '$' && /[?#@*0-9]/.test(src[i + 1] ?? '')) {
      current += special(run, src[i + 1] ?? '')
      has = true
      i++
      continue
    }
    if (c === '$' && /[A-Za-z_{]/.test(src[i + 1] ?? '')) {
      const match = /^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/.exec(
        src.slice(i),
      )
      const name = match?.[1] ?? match?.[2] ?? ''

      current += envValue(vars, name) ?? ''
      has = true
      i += (match?.[0].length ?? 1) - 1
      continue
    }
    if (quote === '"') {
      if (c === '"') quote = null
      else if (c === '\\' && /["\\$]/.test(src[i + 1] ?? '')) current += src[++i] ?? ''
      else current += c
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (/\s/.test(c)) {
      if (has || current !== '') out.push(current)
      current = ''
      has = false
    } else {
      current += c
      has = true
    }
  }
  if (has || current !== '') out.push(current)

  return out
}

/** Parte por `&&`, `||`, `;` y `|` fuera de comillas. */
function split(src: string): { text: string; op: string }[] {
  const parts: { text: string; op: string }[] = []
  let quote: string | null = null
  let start = 0

  for (let i = 0; i < src.length; i++) {
    const c = src[i]

    if (quote !== null) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      continue
    }

    const two = src.slice(i, i + 2)
    const op = two === '&&' || two === '||' ? two : c === ';' || c === '|' ? c : null

    if (op !== null) {
      parts.push({ text: src.slice(start, i), op })
      i += op.length - 1
      start = i + 1
    }
  }
  parts.push({ text: src.slice(start), op: '' })

  return parts.filter((part) => part.text.trim() !== '' || part.op !== '')
}

/** Ejecuta una orden dentro del contenedor. */
export function execIn(
  env: Env,
  container: Container,
  argv: string[],
  opts: ExecOptions = {},
): ExecResult {
  const image = imageOf(env, container)
  const run: Run = {
    env,
    container,
    vars: [...container.env, ...(opts.env ?? [])],
    user: opts.user ?? (container.user || 'root'),
    cwd: opts.workdir ?? container.workdir,
    out: [],
    err: [],
    stdin: opts.stdin ?? '',
    input: opts.stdin ?? '',
    params: ['sh'],
    last: 0,
  }
  const name = argv[0] ?? ''

  const missing = (reason: string, code: number): ExecResult =>
    opts.main === true
      ? { code, out: '', err: '', start: `exec: "${name}": ${reason}` }
      : {
          code,
          out: '',
          err: `OCI runtime exec failed: exec failed: unable to start container process: exec: "${name}": ${reason}: unknown\n`,
        }

  if (image?.kind === 'distroless' && name !== '/nodejs/bin/node' && name !== 'node')
    return missing('executable file not found in $PATH', 127)
  if (image?.kind === 'hello' && name !== '/hello')
    return missing('executable file not found in $PATH', 127)

  let code: number

  // `sh -c 'orden' a b`: solo la orden es el guion; lo demás son `$0`, `$1`… (por eso la forma
  // shell de ENTRYPOINT no ve el CMD ni lo que escribes tras la imagen).
  if (SHELLS.has(name) && argv[1] === '-c') code = script(run, argv[2] ?? '', argv.slice(3))
  else if (SHELLS.has(name)) code = 0
  else code = program(run, argv, true)

  const err = run.err.join('')

  if ((code === 127 || code === 126) && err.startsWith('OCI runtime exec failed'))
    return missing(code === 126 ? 'permission denied' : 'executable file not found in $PATH', code)

  return { code, out: run.out.join(''), err }
}

/** Una línea de `sh -c`: órdenes unidas por `&&`, `||`, `;` y tuberías sencillas. */
function script(run: Run, src: string, params?: string[]): number {
  let code = 0

  if (params !== undefined && params.length > 0) run.params = params
  let skip = false
  let pipeIn: string | null = null

  for (const part of split(src)) {
    if (skip) {
      skip = part.op === '&&' ? skip : false
      if (part.op === '||' && code !== 0) skip = false
      continue
    }

    const argv = words(part.text, run)
    let target: { path: string; append: boolean } | null = null
    const clean_: string[] = []

    for (let i = 0; i < argv.length; i++) {
      const word = argv[i] ?? ''

      if (word === '>' || word === '>>') {
        target = { path: argv[i + 1] ?? '', append: word === '>>' }
        i++
      } else if (word.startsWith('2>') || word === '2>&1') {
        if (word === '2>') i++
      } else if (/^>>?\S/.test(word))
        target = { path: word.replace(/^>>?/, ''), append: word.startsWith('>>') }
      else clean_.push(word)
    }

    const before = run.out.length

    run.stdin = pipeIn ?? run.input
    code = clean_.length === 0 ? 0 : program(run, clean_, false)

    const produced = run.out.splice(before).join('')

    if (part.op === '|') pipeIn = produced
    else {
      pipeIn = null
      if (target !== null && target.path !== '/dev/null') {
        const path = clean(target.path, run.cwd)

        try {
          if (!writable(run, path)) throw new Error('Permission denied')
          writeFile(
            run.env,
            run.container,
            path,
            (target.append ? (readFile(run.env, run.container, path) ?? '') : '') + produced,
          )
        } catch (error) {
          run.err.push(
            `sh: can't create ${target.path}: ${error instanceof Error ? error.message : 'error'}\n`,
          )
          code = 1
        }
      } else if (target === null) run.out.push(produced)
    }
    run.last = code
    if (part.op === '&&' && code !== 0) skip = true
    if (part.op === '||' && code === 0) skip = true
  }

  return code
}

/**
 * ¿Puede el usuario de la orden escribir ahí? root, sí; los demás, en lo montado, en lo que ya
 * escribieron al correr, en `/tmp` y en lo que es suyo en la imagen.
 */
function writable(run: Run, path: string): boolean {
  const { env, container } = run
  const inside = (dir: string) => dir === '/' || path === dir || path.startsWith(`${dir}/`)
  const parent = path.slice(0, path.lastIndexOf('/')) || '/'

  if (container.mounts.some((mount) => inside(mount.target))) return true
  if (container.files[path] !== undefined || container.files[`${parent}/.keep`] !== undefined)
    return true

  return canWrite(imageOf(env, container), run.user, path)
}

/**
 * ¿Trae la imagen `curl` o `wget`? Las de alpine traen el `wget` de busybox y no
 * `curl`; las `-slim` de debian, ninguno; `node:22` (la completa), los dos; las
 * de nginx traen `curl`. Lo instalado al construir (`apk add curl`) también vale.
 */
function hasTool(image: Image | undefined, tool: string): boolean {
  if (image === undefined) return false
  if ((image.packages ?? []).includes(tool)) return true

  const base = image.base
  const alpine = base.includes('alpine') || image.kind === 'alpine'
  const slim = base.includes('slim')

  if (image.kind === 'distroless' || image.kind === 'hello') return false
  if (tool === 'wget') return alpine || (image.kind === 'node' && !slim)
  if (image.kind === 'nginx') return true

  return image.kind === 'node' && !alpine && !slim
}

const FOUND_NOT = (run: Run, name: string, direct: boolean): number => {
  // Una ruta a un fichero que existe pero no es un programa (`/etc/hosts`): permiso denegado.
  const file = name.includes('/') && readFile(run.env, run.container, clean(name, run.cwd)) !== null

  run.err.push(
    direct
      ? `OCI runtime exec failed: exec failed: unable to start container process: exec: "${name}": ${file ? 'permission denied' : 'executable file not found in $PATH'}: unknown\n`
      : `sh: ${name}: ${file ? 'Permission denied' : 'not found'}\n`,
  )

  return file ? 126 : 127
}

/** Un programa de dentro del contenedor. */
function program(run: Run, argv: string[], direct: boolean): number {
  const [raw = '', ...args] = argv
  const name = raw.slice(raw.lastIndexOf('/') + 1)
  const { env, container } = run
  const out = (text: string) => {
    run.out.push(text)
  }
  const err = (text: string) => {
    run.err.push(text)
  }
  const kind = imageOf(env, container)?.kind
  const path = (p: string) => clean(p, run.cwd)

  switch (name) {
    case 'true':
    case ':':
      return 0
    case 'false':
      return 1
    case 'exit':
      return Number(args[0] ?? 0) || 0
    case 'sh':
    case 'bash':
    case 'ash':
      return args[0] === '-c' ? script(run, args[1] ?? '', args.slice(2)) : 0
    case 'cd': {
      const target = path(args[0] ?? '/root')

      if (!isDir(env, container, target)) {
        err(`sh: cd: can't cd to ${args[0] ?? ''}: No such file or directory\n`)

        return 2
      }
      run.cwd = target

      return 0
    }
    case 'printf': {
      // Lo de busybox: el formato con %s, %d y \\n, que se repite si sobran argumentos.
      const [format = '', ...values] = args
      const unescape = (text: string) =>
        text.replace(/\\(n|t|\\)/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'))
      const rest = [...values]
      let text = ''

      for (;;) {
        const before = rest.length

        text += unescape(format).replace(/%[sd%]/g, (spec) =>
          spec === '%%' ? '%' : (rest.shift() ?? (spec === '%d' ? '0' : '')),
        )
        if (rest.length === 0 || rest.length === before) break
      }
      out(text)

      return 0
    }
    case 'tee': {
      const append = args.some((arg) => /^-\w*a/.test(arg))

      for (const arg of args.filter((each) => !each.startsWith('-'))) {
        const target = path(arg)

        if (!writable(run, target)) {
          err(`tee: ${arg}: Permission denied\n`)

          return 1
        }
        try {
          writeFile(
            env,
            container,
            target,
            (append ? (readFile(env, container, target) ?? '') : '') + run.stdin,
          )
        } catch (error) {
          err(`tee: ${arg}: ${error instanceof Error ? error.message : 'error'}\n`)

          return 1
        }
      }
      out(run.stdin)

      return 0
    }
    case 'echo':
      out(`${args.filter((arg) => arg !== '-n').join(' ')}${args[0] === '-n' ? '' : '\n'}`)

      return 0
    case 'hello':
      out(
        '\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n\nTo generate this message, Docker took the following steps:\n 1. The Docker client contacted the Docker daemon.\n 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.\n 3. The Docker daemon created a new container from that image which runs the\n    executable that produces the output you are currently reading.\n 4. The Docker daemon streamed that output to the Docker client, which sent it\n    to your terminal.\n',
      )

      return 0
    case 'pwd':
      out(`${run.cwd}\n`)

      return 0
    case 'hostname':
      out(`${container.id.slice(0, 12)}\n`)

      return 0
    case 'whoami': {
      const who = userName(imageOf(env, container), run.user)

      if (/^\d+$/.test(who)) {
        err(`whoami: unknown uid ${who}\n`)

        return 1
      }
      out(`${who}\n`)

      return 0
    }
    case 'id':
      out(`${idLine(imageOf(env, container), run.user)}\n`)

      return 0
    case 'env':
    case 'printenv': {
      const all = [
        ...run.vars,
        `HOSTNAME=${container.id.slice(0, 12)}`,
        `HOME=${run.user === 'root' ? '/root' : '/home'}`,
      ]

      if (args[0] !== undefined) {
        const value = envValue(all, args[0])

        if (value === undefined) return 1
        out(`${value}\n`)

        return 0
      }
      out(`${all.join('\n')}\n`)

      return 0
    }
    case 'date':
      out('Sun Nov  8 09:00:00 UTC 2026\n')

      return 0
    case 'uname':
      out(args.includes('-a') ? 'Linux 6.8.0-peer4u #1 SMP x86_64 GNU/Linux\n' : 'Linux\n')

      return 0
    case 'sleep':
      return 0
    case 'cat': {
      if (args.length === 0) {
        out(run.stdin)

        return 0
      }

      let code = 0

      for (const arg of args) {
        const text = readFile(env, container, path(arg))

        if (text === null) {
          err(
            `cat: can't open '${arg}': ${isDir(env, container, path(arg)) ? 'Is a directory' : 'No such file or directory'}\n`,
          )
          code = 1
        } else out(text)
      }

      return code
    }
    case 'ls': {
      const all = args.some((arg) => /^-\w*[aA]/.test(arg))
      const long = args.some((arg) => /^-\w*l/.test(arg))
      const self = args.some((arg) => /^-\w*d/.test(arg))
      const image = imageOf(env, container)
      const row = (full: string, shown: string): string => {
        const dir = readFile(env, container, full) === null
        const who = ownerOf(image, full).padEnd(8)

        return `${dir ? 'drwxr-xr-x' : '-rw-r--r--'}    1 ${who} ${who} ${dir ? '4096' : '   0'} Nov  8 09:00 ${shown}\n`
      }
      const targets = args.filter((arg) => !arg.startsWith('-'))
      let code = 0

      for (const target of targets.length === 0 ? ['.'] : targets) {
        const dir = path(target)

        if (readFile(env, container, dir) !== null) {
          out(long ? row(dir, target) : `${target}\n`)
          continue
        }
        if (!isDir(env, container, dir)) {
          err(`ls: ${target}: No such file or directory\n`)
          code = 1
          continue
        }

        if (self) {
          out(long ? row(dir, target) : `${target}\n`)
          continue
        }

        const names = [
          ...new Set(
            filesUnder(env, container, dir).map(
              (file) => file.slice(dir === '/' ? 1 : dir.length + 1).split('/')[0] ?? '',
            ),
          ),
        ]
          .filter((each) => each !== '' && (all || !each.startsWith('.')))
          .sort()

        // `ls -a` también enseña `.` y `..` (con -A, no).
        if (args.some((arg) => /^-\w*a/.test(arg))) names.unshift('.', '..')

        if (targets.length > 1) out(`${target}:\n`)
        out(
          long
            ? names.map((each) => row(clean(each, dir), each)).join('')
            : names.length > 0
              ? `${names.join('\n')}\n`
              : '',
        )
      }

      return code
    }
    case 'touch':
    case 'mkdir':
    case 'rm': {
      let code = 0

      for (const arg of args.filter((each) => !each.startsWith('-'))) {
        const target = path(arg)

        try {
          if (!writable(run, target)) throw new Error('Permission denied')
          if (name === 'touch')
            writeFile(env, container, target, readFile(env, container, target) ?? '')
          else if (name === 'mkdir') writeFile(env, container, `${target}/.keep`, '')
          else {
            const files = [target, ...filesUnder(env, container, target)].filter(
              (file) => readFile(env, container, file) !== null,
            )

            if (files.length === 0 && !args.some((each) => each.includes('f'))) {
              err(`rm: can't remove '${arg}': No such file or directory\n`)
              code = 1
            }
            for (const file of files) writeFile(env, container, file, null)
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'error'

          // Como busybox: «touch: x: …», «mkdir: can't create directory 'x': …», «rm: can't remove 'x': …».
          err(
            name === 'touch'
              ? `touch: ${arg}: ${reason}\n`
              : name === 'mkdir'
                ? `mkdir: can't create directory '${arg}': ${reason}\n`
                : `rm: can't remove '${arg}': ${reason}\n`,
          )
          code = 1
        }
      }

      return code
    }
    case 'grep': {
      const pattern = args.find((arg) => !arg.startsWith('-')) ?? ''
      const lines = run.stdin
        .split('\n')
        .filter((line) => line !== '' && line.toLowerCase().includes(pattern.toLowerCase()))

      out(args.includes('-c') ? `${lines.length}\n` : lines.map((line) => `${line}\n`).join(''))

      return lines.length > 0 ? 0 : 1
    }
    case 'head':
    case 'tail': {
      const n = Number(args.find((arg) => /^-?\d+$/.test(arg))?.replace('-', '') ?? 10)
      const lines = run.stdin
        .split('\n')
        .filter((line, index, list) => line !== '' || index < list.length - 1)

      out(
        (name === 'head' ? lines.slice(0, n) : lines.slice(-n)).map((line) => `${line}\n`).join(''),
      )

      return 0
    }
    case 'wc':
      out(`${run.stdin.split('\n').length - 1}\n`)

      return 0
    case 'ps':
      out(
        `PID   USER     TIME  COMMAND\n    1 ${(container.user || 'root').padEnd(8)}  0:00 ${[...container.entrypoint, ...container.cmd].join(' ')}\n`,
      )

      return 0
    case 'ping':
      return ping(run, args)
    case 'nslookup':
    case 'getent': {
      const host = args.at(-1) ?? ''
      const target = resolveIn(env, container, host)

      if (target === null) {
        err(name === 'getent' ? '' : `** server can't find ${host}: NXDOMAIN\n`)

        return name === 'getent' ? 2 : 1
      }
      out(
        name === 'getent'
          ? `${ipOf(target, container)}  ${host}\n`
          : `Server:\t\t127.0.0.11\nAddress:\t127.0.0.11:53\n\nName:\t${host}\nAddress: ${ipOf(target, container)}\n`,
      )

      return 0
    }
    case 'wget':
    case 'curl':
      if (!hasTool(imageOf(env, container), name)) return FOUND_NOT(run, name, direct)

      return httpGet(run, name, args)
    case 'psql':
      // psql viene con las imágenes de postgres; en otra, solo si se instaló (postgresql-client).
      return kind === 'postgres' ||
        (imageOf(env, container)?.packages ?? []).some((each) => each.startsWith('postgresql'))
        ? psql(run, args)
        : FOUND_NOT(run, name, direct)
    case 'pg_isready':
      if (kind !== 'postgres') return FOUND_NOT(run, name, direct)
      if (container.status !== 'running') {
        out('/var/run/postgresql:5432 - no response\n')

        return 2
      }
      out('/var/run/postgresql:5432 - accepting connections\n')

      return 0
    case 'redis-cli':
      return kind === 'redis' ? redis(run, args) : FOUND_NOT(run, name, direct)
    case 'node':
      if (kind !== 'node' && kind !== 'distroless') return FOUND_NOT(run, name, direct)
      if (args[0] === '-v' || args[0] === '--version')
        out(`v${envValue(run.vars, 'NODE_VERSION') ?? '22.11.0'}\n`)

      return 0
    case 'npm':
      if (kind !== 'node') return FOUND_NOT(run, name, direct)
      out(args[0] === '-v' || args[0] === '--version' ? '10.9.0\n' : '')

      return 0
    case 'nginx':
      if (kind !== 'nginx') return FOUND_NOT(run, name, direct)
      if (args.includes('-t'))
        err(
          'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n',
        )

      return 0
    case 'tar':
      return tar(run, args)
    case 'du':
      out(
        `${filesUnder(env, container, path(args.at(-1) ?? '.')).length * 4}\t${args.at(-1) ?? '.'}\n`,
      )

      return 0
    default:
      return FOUND_NOT(run, raw, direct)
  }
}

function ping(run: Run, args: string[]): number {
  const host = args.filter((arg) => !arg.startsWith('-') && !/^\d+$/.test(arg)).at(-1) ?? ''
  const glued = args.find((arg) => /^-c\d+$/.test(arg))
  const count =
    Number(glued?.slice(2) ?? (args.includes('-c') ? args[args.indexOf('-c') + 1] : 4)) || 4
  const internet = /\.(com|org|net|dev|io)$/.test(host)
  const target = internet ? null : resolveIn(run.env, run.container, host)

  if (target === null && !internet) {
    run.err.push(`ping: bad address '${host}'\n`)

    return 1
  }

  const ip =
    target === null
      ? '93.184.215.14'
      : /^\d+\.\d+\.\d+\.\d+$/.test(host)
        ? host
        : ipOf(target, run.container) || '127.0.0.1'
  const lines = Array.from(
    { length: Math.min(count, 10) },
    (_, i) => `64 bytes from ${ip}: seq=${i} ttl=64 time=0.0${80 + i} ms`,
  )

  run.out.push(
    `PING ${host} (${ip}): 56 data bytes\n${lines.join('\n')}\n\n--- ${host} ping statistics ---\n${lines.length} packets transmitted, ${lines.length} packets received, 0% packet loss\n`,
  )

  return 0
}

function httpGet(run: Run, name: string, args: string[]): number {
  const url = args.find((arg) => /^(https?:\/\/|[a-z0-9.-]+:\d|localhost)/.test(arg)) ?? ''
  const parsed = /^(?:https?:\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url)
  const host = parsed?.[1] ?? ''
  const silent = args.some((arg) => /^-\w*s/.test(arg) || /^-\w*q/.test(arg))
  const target = resolveIn(run.env, run.container, host)

  if (target === null) {
    run.err.push(
      name === 'curl'
        ? `curl: (6) Could not resolve host: ${host}\n`
        : `wget: bad address '${host}'\n`,
    )

    return name === 'curl' ? 6 : 1
  }

  const reply = httpOf(run.env, target, Number(parsed?.[2] ?? 80), parsed?.[3] ?? '/')

  if (reply === null) {
    run.err.push(
      name === 'curl'
        ? `curl: (7) Failed to connect to ${host} port ${parsed?.[2] ?? 80}: Connection refused\n`
        : `wget: can't connect to remote host (${ipOf(target, run.container)}): Connection refused\n`,
    )

    return name === 'curl' ? 7 : 1
  }
  if (reply.status >= 400 && (name === 'wget' || args.some((arg) => /^-\w*f/.test(arg)))) {
    run.err.push(
      name === 'wget'
        ? `wget: server returned error: HTTP/1.1 ${reply.status}\n`
        : `curl: (22) The requested URL returned error: ${reply.status}\n`,
    )

    return name === 'curl' ? 22 : 8
  }
  if (
    name === 'wget' &&
    !args.includes('-O-') &&
    !args.includes('-qO-') &&
    !args.includes('-') &&
    !args.includes('--spider')
  ) {
    if (!silent)
      run.err.push(
        `Connecting to ${host} (${ipOf(target, run.container)})\nsaving to 'index.html'\n`,
      )

    return 0
  }
  if (!args.includes('--spider')) run.out.push(reply.body)

  return 0
}

/** Las tablas de la base de datos: una por línea, `nombre filas`. */
function psql(run: Run, args: string[]): number {
  const host = args[args.indexOf('-h') + 1]
  const db =
    args.includes('-h') && host !== undefined
      ? resolveIn(run.env, run.container, host)
      : run.container

  if (db?.status !== 'running') {
    run.err.push(
      args.includes('-h')
        ? `psql: error: could not translate host name "${host ?? ''}" to address: Name does not resolve\n`
        : 'psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory\n',
    )

    return 2
  }

  const file = `${pgData(db)}/peer4u-tables`
  const tables = new Map(
    (readFile(run.env, db, file) ?? '')
      .split('\n')
      .filter(Boolean)
      .map((line) => [line.split(' ')[0] ?? '', Number(line.split(' ')[1] ?? 0)]),
  )
  const sql = (args[args.indexOf('-c') + 1] ?? '').trim().replace(/;$/, '')
  const save = () => {
    writeFile(run.env, db, file, [...tables].map(([name, rows]) => `${name} ${rows}\n`).join(''))
  }
  const create = /^create table (?:if not exists )?(\w+)/i.exec(sql)
  const drop = /^drop table (?:if exists )?(\w+)/i.exec(sql)
  const insert = /^insert into (\w+)/i.exec(sql)
  const count = /^select count\(\*\) from (\w+)/i.exec(sql)

  if (!args.includes('-c')) {
    run.out.push('psql (16.4)\nType "help" for help.\n')

    return 0
  }
  if (create !== null) {
    const name = (create[1] ?? '').toLowerCase()

    if (tables.has(name)) {
      if (/if not exists/i.test(sql)) {
        run.out.push('CREATE TABLE\n')

        return 0
      }
      run.err.push(`ERROR:  relation "${name}" already exists\n`)

      return 1
    }
    tables.set(name, 0)
    save()
    run.out.push('CREATE TABLE\n')

    return 0
  }

  const missing = (name: string) => {
    run.err.push(`ERROR:  relation "${name}" does not exist\n`)

    return 1
  }

  if (drop !== null) {
    const name = (drop[1] ?? '').toLowerCase()

    if (!tables.has(name) && !/if exists/i.test(sql)) return missing(name)
    tables.delete(name)
    save()
    run.out.push('DROP TABLE\n')

    return 0
  }
  if (insert !== null) {
    const name = (insert[1] ?? '').toLowerCase()

    if (!tables.has(name)) return missing(name)

    const rows = Math.max(
      1,
      (sql.match(/\(/g) ?? []).length - (/\w+\s*\(/.test(sql.split(/values/i)[0] ?? '') ? 1 : 0),
    )

    tables.set(name, (tables.get(name) ?? 0) + rows)
    save()
    run.out.push(`INSERT 0 ${rows}\n`)

    return 0
  }
  if (count !== null) {
    const name = (count[1] ?? '').toLowerCase()

    if (!tables.has(name)) return missing(name)
    run.out.push(` count \n-------\n ${String(tables.get(name) ?? 0).padStart(5)}\n(1 row)\n\n`)

    return 0
  }
  if (sql === '\\dt') {
    if (tables.size === 0) {
      run.out.push('Did not find any relations.\n')

      return 0
    }
    run.out.push(
      `          List of relations\n Schema |  Name   | Type  |  Owner\n--------+---------+-------+----------\n${[
        ...tables.keys(),
      ]
        .sort()
        .map((name) => ` public | ${name.padEnd(7)} | table | postgres\n`)
        .join('')}(${tables.size} row${tables.size === 1 ? '' : 's'})\n\n`,
    )

    return 0
  }
  if (/^select 1$/i.test(sql)) {
    run.out.push(' ?column? \n----------\n        1\n(1 row)\n\n')

    return 0
  }
  run.err.push(`ERROR:  syntax error at or near "${sql.split(/\s+/)[0] ?? ''}"\n`)

  return 1
}

function redis(run: Run, args: string[]): number {
  const rest = args.includes('-h')
    ? args.filter((_, i) => i !== args.indexOf('-h') && i !== args.indexOf('-h') + 1)
    : args
  const [verb = '', key = '', value = ''] = rest
  const file = `/data/peer4u-keys`
  const keys = new Map(
    (readFile(run.env, run.container, file) ?? '')
      .split('\n')
      .filter(Boolean)
      .map((line) => [line.split(' ')[0] ?? '', line.split(' ').slice(1).join(' ')]),
  )

  switch (verb.toLowerCase()) {
    case 'ping':
      run.out.push('PONG\n')

      return 0
    case 'set':
      keys.set(key, value)
      writeFile(run.env, run.container, file, [...keys].map(([k, v]) => `${k} ${v}\n`).join(''))
      run.out.push('OK\n')

      return 0
    case 'get':
      run.out.push(keys.has(key) ? `"${keys.get(key) ?? ''}"\n` : '(nil)\n')

      return 0
    default:
      run.err.push(`(error) ERR unknown command '${verb}'\n`)

      return 1
  }
}

const GZ = '#peer4u-gzip v1\n'
const TAR = '#peer4u-tar v1\n'

/** `tar czf /copia/x.tgz -C /datos .` y `tar xzf … -C /datos`, con el formato del `tar` de la shell. */
function tar(run: Run, args: string[]): number {
  const flags = (args[0] ?? '').replace(/^-/, '')
  // `tar czf FICHERO …` o `tar -czf FICHERO …`: el fichero va justo detrás.
  const file = args[1] ?? ''
  const at = args.indexOf('-C')
  const base = at >= 0 ? clean(args[at + 1] ?? '/', run.cwd) : run.cwd
  const archive = clean(file, run.cwd)

  try {
    if (flags.includes('c')) {
      const targets = args.slice(2).filter((arg, i, list) => arg !== '-C' && list[i - 1] !== '-C')
      const files: { path: string; node: object }[] = []

      for (const target of targets) {
        const dir = clean(target, base)
        const prefix = target === '.' ? '.' : target.replace(/^\/+|\/+$/g, '')

        for (const each of filesUnder(run.env, run.container, dir))
          files.push({
            path: `${prefix}${each.slice(dir === '/' ? 0 : dir.length)}`,
            node: {
              kind: 'file',
              text: readFile(run.env, run.container, each) ?? '',
              mode: 0o644,
              owner: 'root',
              group: 'root',
              mtime: 1_793_000_000,
            },
          })
      }
      writeFile(
        run.env,
        run.container,
        archive,
        `${flags.includes('z') ? GZ : ''}${TAR}${JSON.stringify({ files })}`,
      )

      return 0
    }
    if (flags.includes('x')) {
      const text = readFile(run.env, run.container, archive)

      if (text === null) {
        run.err.push(`tar: can't open '${file}': No such file or directory\n`)

        return 1
      }

      const parsed = JSON.parse(text.replace(GZ, '').replace(TAR, '')) as {
        files: { path: string; node: { kind: string; text?: string } }[]
      }

      for (const each of parsed.files)
        if (each.node.kind === 'file')
          writeFile(run.env, run.container, clean(each.path, base), each.node.text ?? '')

      return 0
    }
  } catch (error) {
    run.err.push(`tar: ${error instanceof Error ? error.message : 'error'}\n`)

    return 1
  }
  run.err.push('tar: need at least one of -c, -x\n')

  return 1
}
