/**
 * Una shell mínima dentro de un contenedor: lo que ejecuta `kubectl exec`,
 * `kubectl run … -- orden`, un Job o un contenedor init. Entiende `sh -c` con
 * `;`, `&&`, `||` y `>`, y unos pocos programas: `env`, `id`, `cat`, `ls`,
 * `echo`, `wget`, `curl`, `nc -z`, `nslookup`, `psql`, `pg_dump`,
 * `pg_isready`, `redis-cli`, `sleep`… Lo que ve como sistema de ficheros es
 * la imagen, los volúmenes montados (ConfigMap, Secret, PVC, emptyDir) y su
 * capa propia, que se pierde con el Pod.
 */

import { imageInfo } from './images.js'
import { own } from './limits.js'
import type { K8sObject } from './model.js'
import { connect, httpFrom } from './net.js'
import type { Outcome } from './runtime.js'
import { resolveEnv, uidIn, varsOf } from './runtime.js'
import type { Container } from './spec.js'
import { podSpecOf, str } from './spec.js'
import type { Env } from './store.js'
import { getObject, nsOf } from './store.js'
import { decode64 } from './util.js'

type PodResult = { out: string; err: string; code: number }

const PG_DATA = '/var/lib/postgresql/data'

/** Un sistema de ficheros: dónde se lee y dónde se escribe cada ruta. */
type Fs = {
  read: (path: string) => string | null
  write: (path: string, text: string) => string | null
  list: (dir: string) => string[]
}

const under = (path: string, dir: string): boolean =>
  dir === '/' || path === dir || path.startsWith(`${dir}/`)

function clean(path: string, cwd = '/'): string {
  const parts: string[] = []

  for (const part of (path.startsWith('/') ? path : `${cwd}/${path}`).split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }

  return `/${parts.join('/')}`
}

/** Lo que ve un contenedor como disco. */
export function fsOf(env: Env, pod: K8sObject, container: Container): Fs {
  const spec = podSpecOf(pod.spec)
  const ns = nsOf(pod)
  const image = imageInfo(container.image)
  const uid = pod.metadata.uid ?? ''
  const layer = `layer:${uid}:${container.name}`
  const mounts = container.mounts
    .map((mount) => ({ mount, volume: spec.volumes.find((each) => each.name === mount.name) }))
    .sort((a, b) => b.mount.path.length - a.mount.path.length)
  const mountAt = (path: string) => mounts.find((each) => under(path, each.mount.path))
  const configFiles = (kind: 'configMap' | 'secret', name: string): Record<string, string> => {
    const object = getObject(env.cluster, kind === 'secret' ? 'Secret' : 'ConfigMap', ns, name)
    const out: Record<string, string> = {}

    for (const [key, value] of Object.entries(object?.data ?? {}))
      out[`/${key}`] = kind === 'secret' ? safeDecode(value) : value

    return out
  }
  const storeOf = (id: string): Record<string, string> => {
    env.cluster.store[id] ??= {}

    return env.cluster.store[id]
  }
  const where = (
    path: string,
  ): { files: Record<string, string>; rel: string; readOnly: boolean } => {
    const found = mountAt(path)

    if (found?.volume === undefined) return { files: storeOf(layer), rel: path, readOnly: false }

    const rel = path === found.mount.path ? '/' : path.slice(found.mount.path.length)
    const { volume, mount } = found

    if (volume.kind === 'configMap' || volume.kind === 'secret')
      return { files: configFiles(volume.kind, volume.ref), rel, readOnly: true }
    if (volume.kind === 'pvc')
      return { files: storeOf(`pvc:${ns}/${volume.ref}`), rel, readOnly: mount.readOnly }

    return { files: storeOf(`empty:${uid}:${volume.name}`), rel, readOnly: mount.readOnly }
  }

  return {
    read: (path) => {
      const at = where(path)
      const value = own(at.files, at.rel)

      if (value !== undefined) return value
      if (mountAt(path) === undefined) return own(image?.files ?? {}, path) ?? null

      return null
    },
    write: (path, text) => {
      const at = where(path)
      const readOnlyRoot =
        container.security.readOnlyRootFilesystem === true && mountAt(path) === undefined

      if (at.readOnly || readOnlyRoot) return `can't create '${path}': Read-only file system`
      at.files[at.rel] = text

      return null
    },
    list: (dir) => {
      const names = new Set<string>()
      const add = (path: string) => {
        if (under(path, dir) && path !== dir)
          names.add(path.slice(dir === '/' ? 1 : dir.length + 1).split('/')[0] ?? '')
      }

      for (const path of Object.keys(image?.files ?? {})) if (mountAt(path) === undefined) add(path)
      for (const path of Object.keys(storeOf(layer))) add(path)
      for (const { mount } of mounts) {
        if (under(mount.path, dir) && mount.path !== dir) add(mount.path)
        if (under(dir, mount.path)) {
          const at = where(dir)

          for (const rel of Object.keys(at.files)) add(clean(`${mount.path}${rel}`))
        }
      }

      return [...names].filter((name) => name !== '').sort()
    },
  }
}

function safeDecode(value: string): string {
  try {
    return decode64(value)
  } catch {
    return value
  }
}

type Tables = Record<string, number>

function tablesOf(fs: Fs): Tables {
  try {
    return JSON.parse(fs.read(`${PG_DATA}/.tables`) ?? '{}') as Tables
  } catch {
    return {}
  }
}

/** Ejecuta SQL contra unas tablas (solo cuenta filas: lo justo para ver que los datos siguen). */
function sql(tables: Tables, text: string): { out: string; err: string; changed: boolean } {
  const out: string[] = []
  let changed = false

  for (const raw of text.split(';')) {
    const statement = raw.replace(/--.*$/gm, '').trim()

    if (statement === '') continue

    const create = /^create table (?:if not exists )?(\w+)/i.exec(statement)
    const insert = /^insert into (\w+)/i.exec(statement)
    const drop = /^drop table (?:if exists )?(\w+)/i.exec(statement)
    const count = /^select count\(\*\) from (\w+)/i.exec(statement)

    if (/^\\dt$/.test(statement)) {
      const names = Object.keys(tables).sort()

      if (names.length === 0) out.push('Did not find any relations.')
      else {
        const width = Math.max(4, ...names.map((name) => name.length))

        out.push(
          '          List of relations',
          ` Schema | ${'Name'.padEnd(width)} | Type  |  Owner`,
          `--------+-${'-'.repeat(width)}-+-------+----------`,
          ...names.map((name) => ` public | ${name.padEnd(width)} | table | postgres`),
          `(${names.length} ${names.length === 1 ? 'row' : 'rows'})`,
        )
      }
    } else if (create !== null) {
      const name = (create[1] ?? '').toLowerCase()

      if (Object.hasOwn(tables, name) && !/if not exists/i.test(statement))
        return { out: out.join('\n'), err: `ERROR:  relation "${name}" already exists`, changed }
      tables[name] ??= 0
      changed = true
      out.push('CREATE TABLE')
    } else if (insert !== null) {
      const name = (insert[1] ?? '').toLowerCase()

      if (!Object.hasOwn(tables, name))
        return { out: out.join('\n'), err: `ERROR:  relation "${name}" does not exist`, changed }

      const rows = Math.max(1, (statement.match(/\)\s*(,|$)/g) ?? []).length)

      tables[name] = (tables[name] ?? 0) + rows
      changed = true
      out.push(`INSERT 0 ${rows}`)
    } else if (drop !== null) {
      Reflect.deleteProperty(tables, (drop[1] ?? '').toLowerCase())
      changed = true
      out.push('DROP TABLE')
    } else if (count !== null) {
      const name = (count[1] ?? '').toLowerCase()

      if (!Object.hasOwn(tables, name))
        return { out: out.join('\n'), err: `ERROR:  relation "${name}" does not exist`, changed }
      out.push(' count', '-------', String(tables[name] ?? 0).padStart(6), '(1 row)')
    } else if (/^select 1$/i.test(statement))
      out.push(' ?column?', '----------', '        1', '(1 row)')
    else
      return {
        out: out.join('\n'),
        err: `ERROR:  syntax error at or near "${statement.split(/\s+/)[0] ?? ''}"`,
        changed,
      }
  }

  return { out: out.join('\n'), err: '', changed }
}

/** Divide una línea de shell en palabras (comillas simples y dobles). */
function words(line: string): string[] {
  const out: string[] = []
  let current = ''
  let quote: string | null = null
  let started = false

  for (const char of line) {
    if (quote !== null) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      started = true
    } else if (/\s/.test(char)) {
      if (started || current !== '') out.push(current)
      current = ''
      started = false
    } else current += char
  }
  if (started || current !== '') out.push(current)

  return out
}

/** Separa por `;`, `&&` y `||` fuera de comillas. */
function steps(script: string): { text: string; op: ';' | '&&' | '||' }[] {
  const out: { text: string; op: ';' | '&&' | '||' }[] = []
  let quote: string | null = null
  let start = 0
  let op: ';' | '&&' | '||' = ';'

  for (let i = 0; i < script.length; i++) {
    const char = script[i]

    if (quote !== null) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (
      char === ';' ||
      char === '\n' ||
      script.startsWith('&&', i) ||
      script.startsWith('||', i)
    ) {
      out.push({ text: script.slice(start, i), op })
      op = char === ';' || char === '\n' ? ';' : script.startsWith('&&', i) ? '&&' : '||'
      if (op !== ';') i++
      start = i + 1
    }
  }
  out.push({ text: script.slice(start), op })

  return out.filter((step) => step.text.trim() !== '')
}

type Ctx = {
  env: Env
  pod: K8sObject
  container: Container
  vars: Record<string, string>
  fs: Fs
  /** Lo que llega por la entrada (`kubectl exec -i … < fichero`). */
  stdin?: string
}

const ok = (out = ''): PodResult => ({ out, err: '', code: 0 })
const fail = (err: string, code = 1): PodResult => ({ out: '', err, code })
const line = (text: string): string => (text === '' || text.endsWith('\n') ? text : `${text}\n`)

/** Una orden suelta (ya en palabras). */
function command(ctx: Ctx, argv: string[]): PodResult {
  const [name = '', ...args] = argv
  const program = name.replace(/^.*\//, '')
  const image = imageInfo(ctx.container.image)
  const spec = podSpecOf(ctx.pod.spec)

  switch (program) {
    case '':
    case 'true':
    case ':':
      return ok()
    case 'false':
      return fail('')
    case 'sh':
    case 'bash':
    case 'ash':
      if (args[0] === '-c') return script(ctx, args[1] ?? '')

      return fail('sh: este simulador no abre una sesión interactiva: usa sh -c "orden"', 1)
    case 'echo':
      return ok(
        `${args.join(' ').replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, v: string) => ctx.vars[v] ?? '')}\n`,
      )
    case 'env':
    case 'printenv': {
      const all = {
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        HOSTNAME: ctx.pod.metadata.name,
        KUBERNETES_SERVICE_HOST: '10.43.0.1',
        KUBERNETES_SERVICE_PORT: '443',
        ...ctx.vars,
        HOME: image?.user === 'root' ? '/root' : '/home/node',
      }

      if (args[0] !== undefined) {
        const value = own(all, args[0])

        return value === undefined ? fail('') : ok(line(value))
      }

      return ok(
        Object.entries(all)
          .map(([key, value]) => `${key}=${value}\n`)
          .join(''),
      )
    }
    case 'id':
    case 'whoami': {
      const uid = uidIn(spec, ctx.container, image)
      const user = uid === image?.uid ? (image.user === '' ? 'root' : image.user) : String(uid)

      if (program === 'whoami')
        return uid === 0 || uid === image?.uid ? ok(line(user)) : fail(`whoami: unknown uid ${uid}`)

      return ok(
        uid === 0
          ? 'uid=0(root) gid=0(root) groups=0(root)\n'
          : `uid=${uid}${uid === image?.uid ? `(${user})` : ''} gid=${uid}${uid === image?.uid ? `(${user})` : ''}\n`,
      )
    }
    case 'hostname':
      return ok(line(ctx.pod.metadata.name))
    case 'date':
      return ok('Mon Nov  9 09:00:00 UTC 2026\n')
    case 'sleep':
      return ok()
    case 'cat': {
      let out = ''

      for (const file of args) {
        const text = ctx.fs.read(clean(file))

        if (text === null)
          return { out, err: `cat: can't open '${file}': No such file or directory`, code: 1 }
        out += text
      }

      return ok(out)
    }
    case 'ls': {
      const dir = clean(args.find((arg) => !arg.startsWith('-')) ?? '/')
      const names = ctx.fs.list(dir)

      if (names.length === 0 && ctx.fs.read(dir) === null && !['/', '/tmp', '/app'].includes(dir))
        return fail(`ls: ${dir}: No such file or directory`)

      return ok(names.map((each) => `${each}\n`).join(''))
    }
    case 'touch': {
      for (const file of args) {
        const error = ctx.fs.write(clean(file), ctx.fs.read(clean(file)) ?? '')

        if (error !== null) return fail(`touch: ${file}: Read-only file system`)
      }

      return ok()
    }
    case 'wget':
    case 'curl': {
      const url =
        args
          .filter((arg) => !arg.startsWith('-'))
          .find((arg) => arg !== '-' && !arg.startsWith('%{') && arg !== '/dev/null') ?? ''

      if (url === '') return fail(`${program}: missing URL`, 2)

      const answer = httpFrom(ctx.env, ctx.pod, url)
      const writeOut = args.indexOf('-w')
      const code = writeOut >= 0 ? (args[writeOut + 1] ?? '') : null

      if ('error' in answer) {
        if (program === 'wget')
          return fail(
            `wget: ${answer.error.replace(/^Failed to connect to .*$/, "can't connect to remote host")}`,
            1,
          )

        return {
          out: code === null ? '' : code.replace('%{http_code}', '000'),
          err: `curl: (${answer.code}) ${answer.error}`,
          code: answer.code,
        }
      }
      if (program === 'wget' && answer.reply.status >= 400)
        return fail(`wget: server returned error: HTTP/1.1 ${answer.reply.status}`)

      const silentBody = args.includes('/dev/null')

      return ok(
        `${silentBody ? '' : answer.reply.body}${code === null ? '' : code.replace('%{http_code}', String(answer.reply.status)).replace(/\\n/g, '\n')}`,
      )
    }
    case 'nc': {
      // `nc -z [-w 2] host puerto`: solo mira si se puede conectar.
      const plain: string[] = []

      for (let i = 0; i < args.length; i++) {
        const arg = args[i] ?? ''

        if (arg === '-w' || arg === '-W') i++
        else if (!arg.startsWith('-')) plain.push(arg)
      }

      const [host = '', portText = '0'] = plain
      const reach = connect(ctx.env, ctx.pod, host, Number(portText))

      if (reach.error === 'dns') return fail(`nc: bad address '${host}'`)

      return reach.error === null ? ok() : fail('')
    }
    case 'nslookup': {
      const host = args[0] ?? ''
      const reach = connect(ctx.env, ctx.pod, host, 0)

      if (reach.error === 'dns')
        return fail(
          `Server:\t\t10.43.0.10\nAddress:\t10.43.0.10:53\n\n** server can't find ${host}.${nsOf(ctx.pod)}.svc.cluster.local: NXDOMAIN`,
        )

      const svc = getObject(ctx.env.cluster, 'Service', nsOf(ctx.pod), host.split('.')[0] ?? '')

      return ok(
        `Server:\t\t10.43.0.10\nAddress:\t10.43.0.10:53\n\nName:\t${host.includes('.') ? host : `${host}.${nsOf(ctx.pod)}.svc.cluster.local`}\nAddress: ${str(svc?.spec?.clusterIP, str(reach.pod?.status?.podIP))}\n`,
      )
    }
    case 'pg_isready':
      return image?.behaviour === 'postgres'
        ? ok('/var/run/postgresql:5432 - accepting connections\n')
        : fail('sh: pg_isready: not found', 127)
    case 'psql':
    case 'pg_dump':
      return postgres(ctx, program, args)
    case 'redis-cli':
      if (image?.behaviour !== 'redis') return fail('sh: redis-cli: not found', 127)

      return ok(args.includes('ping') || args.length === 0 ? 'PONG\n' : 'OK\n')
    case 'nginx':
    case 'node':
    case 'npm':
    case 'redis-server':
    case 'postgres':
    case 'tail':
      return ok()
    default:
      return fail(`sh: ${name}: not found`, 127)
  }
}

/** `psql` y `pg_dump`, en local (dentro del Pod de la base de datos) o con `-h` contra otro. */
function postgres(ctx: Ctx, program: string, args: string[]): PodResult {
  const value = (flag: string): string | undefined => {
    const at = args.indexOf(flag)

    return at >= 0
      ? args[at + 1]
      : args.find((arg) => arg.startsWith(flag) && arg.length > 2)?.slice(2)
  }
  const host = value('-h')
  let target: Ctx = ctx

  if (host !== undefined && host !== 'localhost') {
    const reach = connect(ctx.env, ctx.pod, host, Number(value('-p') ?? 5432))

    if (reach.error !== null || reach.pod === null)
      return fail(
        `${program}: error: connection to server at "${host}" (5432) failed: Connection refused`,
        2,
      )

    const container = podSpecOf(reach.pod.spec).containers[0]

    if (container === undefined) return fail(`${program}: error: connection failed`, 2)
    target = { ...ctx, pod: reach.pod, container, fs: fsOf(ctx.env, reach.pod, container) }
  } else if (imageInfo(ctx.container.image)?.behaviour !== 'postgres')
    return fail(`sh: ${program}: not found`, 127)

  const tables = tablesOf(target.fs)

  if (program === 'pg_dump') {
    const dump = Object.entries(tables)
      .map(
        ([name, rows]) =>
          `CREATE TABLE ${name} (id integer);\n${rows > 0 ? `INSERT INTO ${name} VALUES ${Array.from({ length: Math.min(rows, 200) }, (_, i) => `(${i + 1})`).join(', ')};\n` : ''}`,
      )
      .join('')

    return ok(`-- PostgreSQL database dump\n${dump}-- PostgreSQL database dump complete\n`)
  }

  const file = value('-f')
  const text = file !== undefined ? ctx.fs.read(clean(file)) : (value('-c') ?? ctx.stdin ?? '')

  if (text === null) return fail(`psql: error: ${file ?? ''}: No such file or directory`)

  const result = sql(tables, text)

  if (result.changed) target.fs.write(`${PG_DATA}/.tables`, JSON.stringify(tables))

  return { out: line(result.out), err: result.err, code: result.err === '' ? 0 : 1 }
}

/** Un guion de `sh -c` (`;`, `&&`, `||` y `> fichero`). */
function script(ctx: Ctx, text: string): PodResult {
  let out = ''
  let err = ''
  let code = 0

  for (const step of steps(text)) {
    if ((step.op === '&&' && code !== 0) || (step.op === '||' && code === 0)) continue

    const redirect = /^(.*?)\s*(>>?)\s*(\S+)\s*$/.exec(step.text)
    const argv = words(redirect === null ? step.text : (redirect[1] ?? ''))

    // `exit N` acaba el guion con ese código (sin número, con el de la última orden).
    if (argv[0] === 'exit') return { out, err, code: Number(argv[1] ?? code) & 255 }

    const result = command(ctx, argv)

    if (redirect !== null) {
      const path = clean(redirect[3] ?? '')
      const before = redirect[2] === '>>' ? (ctx.fs.read(path) ?? '') : ''
      const error = path === '/dev/null' ? null : ctx.fs.write(path, before + result.out)

      if (error !== null) {
        err += `sh: ${error}\n`
        code = 1
        continue
      }
    } else out += result.out
    if (result.err !== '') err += line(result.err)
    code = result.code
  }

  return { out, err, code }
}

/** Ejecuta una orden dentro de un contenedor que corre (`kubectl exec`). */
export function execIn(
  env: Env,
  pod: K8sObject,
  container: Container,
  argv: string[],
  stdin = '',
): PodResult {
  const vars = varsOf(env, pod, container)

  return command({ env, pod, container, vars, fs: fsOf(env, pod, container), stdin }, argv)
}

/** ¿Sigue esperando un bucle `until …; do sleep …; done` (un init que espera a la base de datos)? */
export function waitsFor(env: Env, pod: K8sObject, container: Container, argv: string[]): boolean {
  const text = argv.join(' ')
  const until = /until\s+(.+?);\s*do\b/.exec(text)

  if (until === null) return false

  const vars = resolveEnv(env, nsOf(pod), container).vars

  return (
    script({ env, pod, container, vars, fs: fsOf(env, pod, container) }, until[1] ?? '').code !== 0
  )
}

/** Qué hace un contenedor con una orden propia (busybox, curl, un init). */
export function runInPod(
  env: Env,
  pod: K8sObject,
  container: Container,
  vars: Record<string, string>,
  argv: string[],
): Outcome {
  const text = argv.join(' ')

  // Lo que no acaba: un bucle sin fin, `sleep` largo, `tail -f`.
  if (/while\s+true|sleep\s+(infinity|\d{3,})|tail\s+-f/.test(text) && !/until\s/.test(text))
    return { kind: 'serve', listenAfter: 0, logs: [] }

  const ctx: Ctx = { env, pod, container, vars, fs: fsOf(env, pod, container) }
  const loop = /until\s+(.+?);\s*do\b.*done/.exec(text)
  const result = loop !== null ? script(ctx, loop[1] ?? '') : command(ctx, argv)
  const logs = `${result.out}${result.err}`.split('\n').filter((each) => each !== '')

  return {
    kind: 'exit',
    code: result.code,
    life: 2,
    reason: result.code === 0 ? 'Completed' : 'Error',
    logs: loop !== null && result.code === 0 ? ['db:5432 open', ...logs] : logs,
  }
}
