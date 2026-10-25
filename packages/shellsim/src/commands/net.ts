/**
 * Red simulada entre las máquinas del mundo: `ping`, `curl`, `wget`, `dig`,
 * `ss`, `ip`, `ssh`, `scp` y `rsync`. Nada sale del simulador: un nombre se
 * resuelve con la tabla del mundo (`dns`) y una petición HTTP la contesta el
 * servicio que escucha en ese puerto, si está activo. Así un `curl` falla de
 * verdad cuando nginx está caído, y vuelve a ir al arrancarlo.
 */

import {
  baseOf,
  can,
  childrenOf,
  copyTree,
  descendantsOf,
  ENOENT,
  EACCES,
  Fail,
  joinPath,
  lookup,
  normalize,
  parentOf,
  readText,
  writeText,
} from '../fs.js'
import { drop, own } from '../limits.js'
import type { Machine, Service } from '../model.js'
import { progName } from '../model.js'
import type { CommandFn, Ctx } from './types.js'
import { getopts, joinLines } from './types.js'

/** La máquina de un nombre o una IP, o `null` si no existe. */
function resolveHost(ctx: Ctx, name: string): Machine | null {
  const world = ctx.sh.world

  if (name === 'localhost' || name === '127.0.0.1' || name === '::1') return ctx.sh.machine()

  const direct = own(world.machines, name.split('.')[0] ?? '')

  if (direct !== undefined && (name === direct.name || own(world.dns, name) === direct.ip))
    return direct

  const ip = own(world.dns, name) ?? hostsFile(ctx, name) ?? name

  return Object.values(world.machines).find((machine) => machine.ip === ip) ?? null
}

/** Lo que dice /etc/hosts de la máquina en la que estás (va antes que el DNS, como en Linux). */
function hostsFile(ctx: Ctx, name: string): string | undefined {
  const node = own(ctx.sh.machine().fs, '/etc/hosts')

  if (node?.kind !== 'file') return undefined
  for (const line of node.text.split('\n')) {
    const [address, ...names] = line.replace(/#.*/, '').trim().split(/\s+/)

    if (address !== undefined && names.includes(name)) return address
  }

  return undefined
}

function known(ctx: Ctx, name: string): boolean {
  return (
    resolveHost(ctx, name) !== null ||
    own(ctx.sh.world.dns, name) !== undefined ||
    hostsFile(ctx, name) !== undefined ||
    /^\d+\.\d+\.\d+\.\d+$/.test(name)
  )
}

/* ---------- ping, dig ---------- */

const ping: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 'cWiw')
  const host = rest[0]

  if (host === undefined) throw new Fail('ping: usage error: Destination address required', 1)
  if (!known(ctx, host)) throw new Fail(`ping: ${host}: Name or service not known`, 2)

  const count = Math.min(10, Number(values.get('c') ?? 4))
  const machine = resolveHost(ctx, host)
  const ip = machine?.ip ?? own(ctx.sh.world.dns, host) ?? host
  const out = [`PING ${host} (${ip}) 56(84) bytes of data.`]
  const alive = machine !== null && machine.down !== true

  if (!values.has('c')) ctx.io.err('(ping sin -c no acabaría nunca: en el simulador se hacen 4)\n')
  for (let i = 1; i <= count && alive; i++)
    out.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=0.${300 + i * 17} ms`)
  out.push(
    '',
    `--- ${host} ping statistics ---`,
    `${count} packets transmitted, ${alive ? count : 0} received, ${alive ? 0 : 100}% packet loss, time ${count * 1000 - 1000}ms`,
  )
  if (alive) out.push('rtt min/avg/max/mdev = 0.317/0.351/0.385/0.024 ms')
  ctx.io.out(joinLines(out))
  ctx.sh.world.clock += count

  return alive ? 0 : 1
}

const dig: CommandFn = (ctx) => {
  const short = ctx.args.includes('+short')
  const rest = ctx.args.filter(
    (arg) =>
      !arg.startsWith('+') && !arg.startsWith('@') && !/^(A|AAAA|MX|NS|TXT|CNAME)$/i.test(arg),
  )
  const name = rest[0] ?? '.'
  const ip = own(ctx.sh.world.dns, name.replace(/\.$/, ''))

  if (ctx.name === 'host') {
    if (ip === undefined) throw new Fail(`Host ${name} not found: 3(NXDOMAIN)`)
    ctx.io.out(`${name} has address ${ip}\n`)

    return 0
  }
  if (ctx.name === 'nslookup') {
    if (ip === undefined)
      throw new Fail(
        `Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\n** server can't find ${name}: NXDOMAIN`,
      )
    ctx.io.out(
      `Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\nNon-authoritative answer:\nName:\t${name}\nAddress: ${ip}\n`,
    )

    return 0
  }
  if (short) {
    if (ip !== undefined) ctx.io.out(`${ip}\n`)

    return 0
  }
  ctx.io.out(
    joinLines([
      `; <<>> DiG 9.18.28 <<>> ${name}`,
      `;; ->>HEADER<<- opcode: QUERY, status: ${ip === undefined ? 'NXDOMAIN' : 'NOERROR'}, id: 4242`,
      '',
      ';; QUESTION SECTION:',
      `;${name}.\t\t\tIN\tA`,
      ...(ip === undefined ? [] : ['', ';; ANSWER SECTION:', `${name}.\t\t300\tIN\tA\t${ip}`]),
      '',
      ';; Query time: 3 msec',
      ';; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)',
    ]),
  )

  return 0
}

/* ---------- HTTP ---------- */

type Response = { status: number; reason: string; type: string; body: string }

const REASONS: Record<number, string> = {
  200: 'OK',
  301: 'Moved Permanently',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
}

function respond(status: number, body: string, type = 'text/html'): Response {
  return { status, reason: REASONS[status] ?? '', type, body }
}

const page = (status: number) =>
  respond(
    status,
    `<html>\n<head><title>${status} ${REASONS[status] ?? ''}</title></head>\n<body>\n<center><h1>${status} ${REASONS[status] ?? ''}</h1></center>\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\n</body>\n</html>\n`,
  )

/** Lo que contesta un servicio a una petición, o `null` si no hay nadie escuchando. */
function serve(
  machine: Machine,
  port: number,
  path: string,
  clock: number,
  depth = 0,
): Response | null {
  const service = Object.values(machine.services).find((each) => each.active && each.port === port)

  if (service === undefined || machine.down === true) return null

  return handle(machine, service, path, clock, depth)
}

function handle(
  machine: Machine,
  service: Service,
  path: string,
  clock: number,
  depth: number,
): Response {
  const web = service.web ?? {}
  const clean = path.split('?')[0] ?? '/'
  const www = own(machine.users, service.user) ?? {
    name: service.user,
    uid: 33,
    home: '/',
    shell: '',
    groups: [service.user],
  }

  if (web.proxy !== undefined && clean.startsWith(web.proxy.prefix)) {
    const upstream =
      depth < 3
        ? serve(
            machine,
            web.proxy.port,
            clean.slice(web.proxy.prefix.length - 1) || '/',
            clock,
            depth + 1,
          )
        : null

    if (upstream === null) {
      machine.journal.push({
        t: clock,
        unit: service.name,
        prio: 3,
        msg: `connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://127.0.0.1:${web.proxy.port}${clean}"`,
      })

      return page(502)
    }

    return upstream
  }

  const route = web.routes === undefined ? undefined : own(web.routes, clean)

  if (route !== undefined) {
    const found = lookup(machine, www, route)

    if (found?.node.kind !== 'file')
      return respond(500, '{"status":"error","detail":"config missing"}\n', 'application/json')

    return respond(
      200,
      found.node.text,
      route.endsWith('.json') ? 'application/json' : 'text/plain',
    )
  }
  if (web.root !== undefined) {
    let file = normalize(`.${clean}`, web.root, '/')

    if (!file.startsWith(web.root)) return page(403)

    let found

    try {
      found = lookup(machine, www, file)
      if (found?.node.kind === 'dir') {
        file = joinPath(found.path, 'index.html')
        found = lookup(machine, www, file)
      }
    } catch {
      return page(403)
    }
    if (found === null) return page(404)
    if (!can(www, found.node, 'r')) return page(403)

    return respond(200, found.node.kind === 'file' ? found.node.text : '')
  }

  return respond(404, '{"error":"not found"}\n', 'application/json')
}

function request(
  ctx: Ctx,
  url: string,
): { response: Response | null; error: string | null; code: number } {
  const parsed = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url)

  if (parsed === null)
    return {
      response: null,
      error: `curl: (3) URL rejected: Malformed input to a URL function`,
      code: 3,
    }

  const [, scheme = 'http', host = '', port, path = '/'] = parsed
  const machine = resolveHost(ctx, host)

  if (machine === null)
    return { response: null, error: `curl: (6) Could not resolve host: ${host}`, code: 6 }

  const number = Number(port ?? (scheme === 'https' ? 443 : 80))

  if (machine.down === true)
    return {
      response: null,
      error: `curl: (28) Failed to connect to ${host} port ${number} after 10001 ms: Timeout was reached`,
      code: 28,
    }

  const response = serve(machine, number === 443 ? 80 : number, path, ctx.sh.world.clock)

  if (response === null)
    return {
      response: null,
      error: `curl: (7) Failed to connect to ${host} port ${number} after 0 ms: Couldn't connect to server`,
      code: 7,
    }

  return { response, error: null, code: 0 }
}

const curl: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'oXdwHAum', {
    silent: 's',
    head: 'I',
    include: 'i',
    output: 'o',
    request: 'X',
    data: 'd',
    'write-out': 'w',
    fail: 'f',
    location: 'L',
    verbose: 'v',
    header: 'H',
    'show-error': 'S',
    insecure: 'k',
    'max-time': 'm',
  })
  const url = rest[0]

  if (url === undefined)
    throw new Fail("curl: try 'curl --help' or 'curl --manual' for more information", 2)

  const { response, error, code } = request(ctx, url)

  if (response === null) {
    if (!flags.has('s') || flags.has('S')) ctx.io.err(`${error ?? ''}\n`)
    if (values.has('w'))
      ctx.io.out((values.get('w') ?? '').replace('%{http_code}', '000').replace(/\\n/g, '\n'))

    return code
  }

  const head =
    `HTTP/1.1 ${response.status} ${response.reason}\r\nServer: nginx/1.24.0 (Ubuntu)\r\nContent-Type: ${response.type}\r\nContent-Length: ${response.body.length}\r\nConnection: keep-alive\r\n\r\n`.replace(
      /\r/g,
      '',
    )

  if (flags.has('v'))
    ctx.io.err(
      `*   Trying ${url}...\n> ${values.get('X') ?? (flags.has('I') ? 'HEAD' : 'GET')} / HTTP/1.1\n> User-Agent: curl/8.5.0\n>\n< HTTP/1.1 ${response.status} ${response.reason}\n`,
    )
  if (flags.has('f') && response.status >= 400) {
    if (!flags.has('s') || flags.has('S'))
      ctx.io.err(`curl: (22) The requested URL returned error: ${response.status}\n`)

    return 22
  }

  const body = flags.has('I') ? head : `${flags.has('i') ? head : ''}${response.body}`
  const output = values.get('o')

  if (output !== undefined && output !== '/dev/null')
    writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(output), body, {
      cmd: 'curl',
      shown: output,
      now: ctx.sh.now(),
      umask: ctx.sh.session().umask,
    })
  else if (output === undefined) ctx.io.out(body)
  if (values.has('w'))
    ctx.io.out(
      (values.get('w') ?? '')
        .replace('%{http_code}', String(response.status))
        .replace(/\\n/g, '\n'),
    )

  return 0
}

const wget: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'O', { quiet: 'q', 'output-document': 'O' })
  const url = rest[0]

  if (url === undefined) throw new Fail('wget: missing URL')

  const { response, error } = request(ctx, url)

  if (response === null) {
    ctx.io.err(`${(error ?? '').replace(/^curl: \(\d+\) /, 'wget: ')}\n`)

    return 4
  }
  if (response.status >= 400) {
    if (!flags.has('q')) ctx.io.err(`ERROR ${response.status}: ${response.reason}.\n`)

    return 8
  }

  const name =
    values.get('O') ?? (baseOf(url.replace(/^https?:\/\/[^/]+/, '') || '/') || 'index.html')

  if (name === '-') ctx.io.out(response.body)
  else {
    writeText(
      ctx.sh.machine(),
      ctx.sh.user(),
      ctx.sh.abs(name === '/' ? 'index.html' : name),
      response.body,
      { cmd: 'wget', now: ctx.sh.now(), umask: ctx.sh.session().umask },
    )
    if (!flags.has('q'))
      ctx.io.err(
        `HTTP request sent, awaiting response... ${response.status} ${response.reason}\nSaving to: '${name}'\n\n'${name}' saved [${response.body.length}/${response.body.length}]\n`,
      )
  }

  return 0
}

/* ---------- ss, ip ---------- */

const ss: CommandFn = (ctx) => {
  const { flags } = getopts(ctx.args)
  const machine = ctx.sh.machine()
  const listening = Object.values(machine.services).filter((s) => s.active && s.port !== undefined)
  const root = ctx.sh.user().uid === 0
  const rows = listening
    .sort((a, b) => (a.port ?? 0) - (b.port ?? 0))
    .map((s) => {
      const proc = machine.procs.find((p) => p.service === s.name)
      const local = s.port === 5432 || s.port === 3000 ? `127.0.0.1:${s.port}` : `0.0.0.0:${s.port}`
      const users =
        flags.has('p') && root && proc !== undefined
          ? ` users:(("${progName(proc.cmd)}",pid=${proc.pid},fd=6))`
          : ''

      return ctx.name === 'netstat'
        ? `tcp        0      0 ${local.padEnd(23)} 0.0.0.0:*               LISTEN      ${flags.has('p') && root && proc !== undefined ? `${proc.pid}/${progName(proc.cmd)}` : '-'}`
        : `LISTEN 0      511    ${local.padEnd(20)} 0.0.0.0:*${users}`
    })

  if (flags.has('p') && !root)
    ctx.io.err('(Para ver de qué proceso es cada puerto hace falta ser root: sudo)\n')
  ctx.io.out(
    joinLines(
      ctx.name === 'netstat'
        ? [
            'Active Internet connections (only servers)',
            'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name',
            ...rows,
          ]
        : ['State  Recv-Q Send-Q Local Address:Port   Peer Address:Port Process', ...rows],
    ),
  )

  return 0
}

const ip: CommandFn = (ctx) => {
  const machine = ctx.sh.machine()
  const what = ctx.args.find((arg) => !arg.startsWith('-')) ?? 'addr'

  if (what.startsWith('r')) {
    ctx.io.out(
      `default via 10.42.0.1 dev eth0 proto dhcp src ${machine.ip} metric 100\n10.42.0.0/24 dev eth0 proto kernel scope link src ${machine.ip}\n`,
    )

    return 0
  }
  if (ctx.args.includes('-br')) {
    ctx.io.out(
      `lo               UNKNOWN        127.0.0.1/8 ::1/128\neth0             UP             ${machine.ip}/24\n`,
    )

    return 0
  }
  ctx.io.out(
    `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000 qdisc mq state UP\n    link/ether 02:00:17:04:2a:01 brd ff:ff:ff:ff:ff:ff\n    inet ${machine.ip}/24 brd 10.42.0.255 scope global eth0\n`,
  )

  return 0
}

/* ---------- ssh, scp, rsync ---------- */

/** `usuario@máquina:ruta` → sus partes (sin `:`, es local). */
function remote(
  ctx: Ctx,
  spec: string,
): { machine: Machine; user: string; path: string; label: string } {
  const at = /^(?:([a-z_][a-z0-9_-]*)@)?([A-Za-z0-9.-]+):(.*)$/.exec(spec)

  if (at === null)
    return {
      machine: ctx.sh.machine(),
      user: ctx.sh.user().name,
      path: ctx.sh.abs(spec),
      label: spec,
    }

  const [, user = ctx.sh.session().user, host = '', path = ''] = at
  const machine = resolveHost(ctx, host)

  if (machine === null)
    throw new Fail(`ssh: Could not resolve hostname ${host}: Name or service not known`, 255)
  if (machine.down === true || own(machine.services, 'ssh')?.active !== true)
    throw new Fail(`ssh: connect to host ${host} port 22: Connection refused`, 255)

  const account = own(machine.users, user)

  if (account === undefined) throw new Fail(`${user}@${host}: Permission denied (publickey).`, 255)

  return {
    machine,
    user,
    path: normalize(path === '' ? '.' : path, account.home, account.home),
    label: spec,
  }
}

const ssh: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 'pilFoJ', {}, true)
  const target = rest[0]

  if (target === undefined)
    throw new Fail('usage: ssh [-p port] [-i identity_file] [user@]hostname [command]', 255)

  const [user, host] = target.includes('@')
    ? (target.split('@') as [string, string])
    : [values.get('l') ?? ctx.sh.session().user, target]
  const machine = resolveHost(ctx, host)

  if (machine === null)
    throw new Fail(`ssh: Could not resolve hostname ${host}: Name or service not known`, 255)
  if (machine.down === true)
    throw new Fail(`ssh: connect to host ${host} port 22: Connection timed out`, 255)
  if (own(machine.services, 'ssh')?.active !== true)
    throw new Fail(`ssh: connect to host ${host} port 22: Connection refused`, 255)
  if (own(machine.users, user) === undefined)
    throw new Fail(`${user}@${host}: Permission denied (publickey).`, 255)

  const command = rest.slice(1).join(' ')

  ctx.sh.log(
    'sshd',
    6,
    `Accepted publickey for ${user} from ${ctx.sh.machine().ip} port 52114 ssh2`,
    machine,
  )
  if (command !== '') return ctx.sh.runRemote(machine.name, user, command, ctx.io)
  ctx.io.out(
    `Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-1015-oracle aarch64)\n\nLast login: Sat Oct 24 18:02:11 2026 from ${ctx.sh.machine().ip}\n`,
  )
  ctx.sh.pushSession(machine.name, user)

  return 0
}

/** Copia `from` (de una máquina) a `to` (de otra o la misma), como lo harían scp o rsync. */
function transfer(
  ctx: Ctx,
  from: ReturnType<typeof remote>,
  to: ReturnType<typeof remote>,
  opts: {
    recursive: boolean
    contents: boolean
    verbose: string[] | null
    del: boolean
    dry: boolean
  },
): void {
  const fromUser = own(from.machine.users, from.user)
  const toUser = own(to.machine.users, to.user)

  if (fromUser === undefined || toUser === undefined)
    throw new Fail(`${ctx.name}: usuario desconocido`)

  const src = lookup(from.machine, fromUser, from.path)

  if (src === null) throw new Fail(`${ctx.name}: ${from.label}: ${ENOENT}`)
  if (!can(fromUser, src.node, 'r')) throw new Fail(`${ctx.name}: ${from.label}: ${EACCES}`)
  if (src.node.kind === 'dir' && !opts.recursive)
    throw new Fail(
      ctx.name === 'scp'
        ? `scp: ${from.label}: not a regular file`
        : `skipping directory ${from.label}`,
    )

  const dst = lookup(to.machine, toUser, to.path)
  const into =
    src.node.kind === 'dir' && opts.contents
      ? to.path
      : dst?.node.kind === 'dir'
        ? joinPath(dst.path, baseOf(src.path))
        : to.path
  const parent = lookup(to.machine, toUser, parentOf(into))

  if (parent === null) throw new Fail(`${ctx.name}: ${to.label}: ${ENOENT}`)
  if (!can(toUser, parent.node, 'w')) throw new Fail(`${ctx.name}: ${to.label}: ${EACCES}`)

  const relative = [src.path, ...descendantsOf(from.machine, src.path)].map((path) =>
    path.slice(src.path.length),
  )

  if (opts.verbose !== null)
    for (const each of relative)
      opts.verbose.push(
        src.node.kind === 'dir' && opts.contents
          ? each.replace(/^\//, '') || './'
          : baseOf(src.path) + each,
      )
  if (opts.dry) return
  if (opts.del && src.node.kind === 'dir' && own(to.machine.fs, into)?.kind === 'dir') {
    for (const path of descendantsOf(to.machine, into))
      if (own(from.machine.fs, src.path + path.slice(into.length)) === undefined) {
        drop(to.machine.fs, path)
        opts.verbose?.push(`deleting ${path.slice(into.length + 1)}`)
      }
  }
  if (src.node.kind === 'dir' && own(to.machine.fs, into)?.kind === 'dir') {
    for (const name of childrenOf(from.machine, src.path))
      copyTree(from.machine, to.machine, toUser, joinPath(src.path, name), joinPath(into, name), {
        now: ctx.sh.now(),
        keep: ctx.name === 'rsync',
      })
  } else
    copyTree(from.machine, to.machine, toUser, src.path, into, {
      now: ctx.sh.now(),
      keep: ctx.name === 'rsync',
    })
}

const scp: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, 'Pi')

  if (rest.length < 2) throw new Fail('usage: scp [-r] [-P port] source ... target', 1)

  const to = remote(ctx, rest.at(-1) ?? '')

  for (const src of rest.slice(0, -1))
    transfer(ctx, remote(ctx, src), to, {
      recursive: flags.has('r'),
      contents: false,
      verbose: null,
      del: false,
      dry: false,
    })

  return 0
}

const rsync: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, 'e', {
    archive: 'a',
    verbose: 'v',
    recursive: 'r',
    delete: 'D',
    'dry-run': 'n',
    compress: 'z',
    progress: 'P',
    human: 'h',
  })

  if (rest.length < 2) throw new Fail('rsync: usage: rsync [OPTION]... SRC [SRC]... DEST', 1)

  const to = remote(ctx, rest.at(-1) ?? '')
  const listed: string[] = []

  for (const src of rest.slice(0, -1))
    transfer(ctx, remote(ctx, src), to, {
      recursive: flags.has('a') || flags.has('r'),
      contents: src.endsWith('/'),
      verbose: listed,
      del: flags.has('D'),
      dry: flags.has('n'),
    })
  if (flags.has('v') || flags.has('n'))
    ctx.io.out(
      joinLines([
        'sending incremental file list',
        ...listed,
        '',
        `sent ${listed.length * 120} bytes  received 35 bytes  total size ${listed.length * 1000}${flags.has('n') ? ' (DRY RUN)' : ''}`,
      ]),
    )

  return 0
}

/* ---------- jq (lo justo para leer un health check) ---------- */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

function jqPath(value: Json, filter: string): Json[] {
  let current: Json[] = [value]

  for (const step of filter.match(/\.[A-Za-z_][\w-]*|\.\["[^"]+"\]|\[\d*\]|\./g) ?? []) {
    const next: Json[] = []

    for (const item of current) {
      if (step === '.') next.push(item)
      else if (step === '[]') {
        if (Array.isArray(item)) next.push(...item)
        else if (item !== null && typeof item === 'object') next.push(...Object.values(item))
        else
          throw new Fail(
            `jq: error: Cannot iterate over ${item === null ? 'null' : typeof item}`,
            5,
          )
      } else if (/^\[\d+\]$/.test(step))
        next.push(Array.isArray(item) ? (item[Number(step.slice(1, -1))] ?? null) : null)
      else {
        const key = step.startsWith('.["') ? step.slice(3, -2) : step.slice(1)

        next.push(
          item !== null && typeof item === 'object' && !Array.isArray(item)
            ? (own(item, key) ?? null)
            : null,
        )
      }
    }
    current = next
  }

  return current
}

const jq: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { 'raw-output': 'r', compact: 'c' })
  const [filter = '.', ...files] = rest
  const text =
    files.length === 0
      ? ctx.io.stdin.readAll()
      : files
          .map((file) => readText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(file), 'jq', file))
          .join('')
  let value: Json

  try {
    value = JSON.parse(text) as Json
  } catch {
    throw new Fail('jq: error (at <stdin>:1): Cannot parse input as JSON', 2)
  }

  const pipes = filter.split('|').map((part) => part.trim())
  let values: Json[] = [value]

  for (const part of pipes) {
    if (part === 'keys')
      values = values.map((v) =>
        v !== null && typeof v === 'object' ? Object.keys(v).sort() : null,
      )
    else if (part === 'length')
      values = values.map((v) =>
        Array.isArray(v)
          ? v.length
          : typeof v === 'string'
            ? v.length
            : v !== null && typeof v === 'object'
              ? Object.keys(v).length
              : 0,
      )
    else values = values.flatMap((v) => jqPath(v, part))
  }
  ctx.io.out(
    joinLines(
      values.map((v) =>
        flags.has('r') && typeof v === 'string'
          ? v
          : JSON.stringify(v, null, flags.has('c') ? undefined : 2),
      ),
    ),
  )

  return 0
}

export const NET_COMMANDS: Record<string, CommandFn> = {
  ping,
  dig,
  host: dig,
  nslookup: dig,
  curl,
  wget,
  ss,
  netstat: ss,
  ip,
  ssh,
  scp,
  rsync,
  jq,
}
