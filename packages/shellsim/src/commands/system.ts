/**
 * La máquina: procesos (`ps`, `top`, `kill`, `pgrep`), servicios
 * (`systemctl`, `journalctl`), usuarios (`id`, `useradd`, `usermod`),
 * tareas programadas (`crontab`), paquetes (`apt`) y lo que se mira en los
 * primeros minutos de una guardia (`uptime`, `free`, `df`, `dmesg`).
 */

import { Fail, lookup, makeDir, readText } from '../fs.js'
import { drop, own } from '../limits.js'
import type { Machine, Proc, Service } from '../model.js'
import { progName } from '../model.js'
import { configError, serviceDied, startService, stopService } from '../services.js'
import { regex } from '../regex.js'
import type { CommandFn, Ctx } from './types.js'
import { getopts, joinLines, linesOf } from './types.js'
import { formatDate, human, logDate } from './util.js'

const MEMORY = 4 * 1024 * 1024 // kB

const needRoot = (ctx: Ctx, what: string): void => {
  if (ctx.sh.user().uid !== 0) throw new Fail(what, ctx.name === 'systemctl' ? 4 : 1)
}

/** Los procesos vivos (los `sleep … &` que ya acabaron se van). */
function procsOf(ctx: Ctx): Proc[] {
  const machine = ctx.sh.machine()

  machine.procs = machine.procs.filter(
    (proc) => proc.until === undefined || proc.until > ctx.sh.world.clock,
  )

  return machine.procs
}

const cpuTime = (proc: Proc, clock: number): string => {
  const seconds = Math.round(((clock - proc.start + 3600) * proc.cpu) / 100)

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/* ---------- ps, top ---------- */

const PS_FIELDS: Record<string, [string, (p: Proc, clock: number) => string]> = {
  pid: ['PID', (p) => String(p.pid)],
  ppid: ['PPID', (p) => String(p.ppid)],
  user: ['USER', (p) => p.user],
  '%cpu': ['%CPU', (p) => p.cpu.toFixed(1)],
  pcpu: ['%CPU', (p) => p.cpu.toFixed(1)],
  '%mem': ['%MEM', (p) => p.mem.toFixed(1)],
  pmem: ['%MEM', (p) => p.mem.toFixed(1)],
  rss: ['RSS', (p) => String(p.rss)],
  stat: ['STAT', (p) => p.state],
  tty: ['TT', (p) => p.tty],
  cmd: ['CMD', (p) => p.cmd],
  args: ['COMMAND', (p) => p.cmd],
  command: ['COMMAND', (p) => p.cmd],
  comm: ['COMMAND', (p) => progName(p.cmd)],
  etime: [
    'ELAPSED',
    (p, clock) => `${String(Math.floor((clock - p.start + 3600) / 60)).padStart(2, '0')}:00`,
  ],
  time: ['TIME', (p, clock) => cpuTime(p, clock)],
}

function sortProcs(procs: Proc[], spec: string | undefined): Proc[] {
  if (spec === undefined) return procs

  const desc = spec.startsWith('-')
  const key = spec.replace(/^[-+]/, '')
  const value = (p: Proc): number | string =>
    key === '%cpu' || key === 'pcpu'
      ? p.cpu
      : key === '%mem' || key === 'pmem' || key === 'rss'
        ? p.mem
        : key === 'pid'
          ? p.pid
          : p.cmd

  return [...procs].sort((a, b) => {
    const x = value(a)
    const y = value(b)
    const order = x < y ? -1 : x > y ? 1 : a.pid - b.pid

    return desc ? -order : order
  })
}

const ps: CommandFn = (ctx) => {
  // `ps aux` (sin guion, estilo BSD): ahí la u es una opción, no «de este usuario».
  const bsd = ctx.args.filter((arg) => /^[auxef]+$/.test(arg))
  const { flags, values } = getopts(
    ctx.args.filter((arg) => !bsd.includes(arg)),
    'upoC',
    { sort: 'S', user: 'u', format: 'o' },
  )

  for (const letter of bsd.join('')) flags.add(letter)
  const clock = ctx.sh.world.clock
  let procs = procsOf(ctx)
  const all = flags.has('a') || flags.has('e') || flags.has('A') || flags.has('x')
  const user = values.get('u')

  if (user !== undefined && !flags.has('a')) procs = procs.filter((p) => p.user === user)
  else if (!all) procs = procs.filter((p) => p.tty === 'pts/0' && p.user === ctx.sh.session().user)
  if (values.has('p'))
    procs = procs.filter((p) => (values.get('p') ?? '').split(',').includes(String(p.pid)))
  if (values.has('C'))
    procs = procs.filter((p) => (p.cmd.split(' ')[0] ?? '').endsWith(values.get('C') ?? ''))
  procs = sortProcs(procs, values.get('S'))

  const rows: string[] = []
  const format = values.get('o')

  if (format !== undefined) {
    const cols = format.split(',').map((name) => {
      const [field, header] = name.split('=')
      const spec = PS_FIELDS[(field ?? '').toLowerCase()]

      if (spec === undefined)
        throw new Fail(`error: unknown user-defined format specifier "${field ?? ''}"`)

      return { header: header ?? spec[0], get: spec[1] }
    })
    const table = [cols.map((c) => c.header), ...procs.map((p) => cols.map((c) => c.get(p, clock)))]
    const widths = cols.map((_c, i) => Math.max(...table.map((row) => (row[i] ?? '').length)))

    for (const row of table)
      rows.push(
        row
          .map((cell, i) => (i === row.length - 1 ? cell : cell.padStart(widths[i] ?? 0)))
          .join(' ')
          .trimEnd(),
      )
  } else if (flags.has('u')) {
    rows.push('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND')
    for (const p of procs)
      rows.push(
        `${p.user.padEnd(8).slice(0, 8)} ${String(p.pid).padStart(7)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(p.rss * 3).padStart(6)} ${String(p.rss).padStart(5)} ${p.tty.padEnd(8)} ${p.state.padEnd(4)} 09:00 ${cpuTime(p, clock).padStart(6)} ${p.cmd}`,
      )
  } else if (flags.has('f')) {
    rows.push('UID          PID    PPID  C STIME TTY          TIME CMD')
    for (const p of procs)
      rows.push(
        `${p.user.padEnd(8).slice(0, 8)} ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  ${Math.round(p.cpu)} 09:00 ${p.tty.padEnd(8)} 00:${cpuTime(p, clock).padStart(5, '0')} ${p.cmd}`,
      )
  } else {
    rows.push('    PID TTY          TIME CMD')
    for (const p of procs)
      rows.push(
        `${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} 00:${cpuTime(p, clock).padStart(5, '0')} ${progName(p.cmd)}`,
      )
    if (!all) rows.push(`${String(ctx.sh.machine().nextPid).padStart(7)} pts/0    00:00:00 ps`)
  }
  ctx.io.out(joinLines(rows))

  return 0
}

function memLine(machine: Machine): { used: number; free: number; cache: number } {
  const used = machine.procs.reduce((sum, p) => sum + p.rss, 0) + 600_000
  const cache = 900_000

  return { used, cache, free: Math.max(0, MEMORY - used - cache) }
}

const top: CommandFn = (ctx) => {
  const { values } = getopts(ctx.args, 'nodpu')
  const machine = ctx.sh.machine()
  const procs = sortProcs(procsOf(ctx), values.get('o') === '%MEM' ? '-%mem' : '-%cpu')
  const cpu = Math.min(99.9, procs.reduce((sum, p) => sum + p.cpu, 0) / 2)
  const mem = memLine(machine)
  const mib = (kb: number) => (kb / 1024).toFixed(1).padStart(8)

  ctx.io.out(
    joinLines([
      `top - ${formatDate(ctx.sh.now(), '%T')} up 41 days,  3:12,  1 user,  load average: ${(cpu / 50).toFixed(2)}, ${(cpu / 60).toFixed(2)}, ${(cpu / 70).toFixed(2)}`,
      `Tasks: ${String(procs.length).padStart(3)} total,   ${procs.filter((p) => p.state === 'R').length} running, ${procs.filter((p) => p.state === 'S').length} sleeping,   ${procs.filter((p) => p.state === 'T').length} stopped,   ${procs.filter((p) => p.state === 'Z').length} zombie`,
      `%Cpu(s): ${cpu.toFixed(1)} us,  0.8 sy,  0.0 ni, ${(99 - cpu).toFixed(1)} id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st`,
      `MiB Mem : ${mib(MEMORY)} total, ${mib(mem.free)} free, ${mib(mem.used)} used, ${mib(mem.cache)} buff/cache`,
      '',
      '    PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND',
      ...procs
        .slice(0, 20)
        .map(
          (p) =>
            `${String(p.pid).padStart(7)} ${p.user.padEnd(9).slice(0, 9)} 20   0 ${String(p.rss * 3).padStart(7)} ${String(p.rss).padStart(6)} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${cpuTime(p, ctx.sh.world.clock).padStart(9)} ${progName(p.cmd)}`,
        ),
    ]),
  )

  return 0
}

/* ---------- Señales ---------- */

const SIGNALS: Record<string, number> = {
  HUP: 1,
  INT: 2,
  QUIT: 3,
  KILL: 9,
  USR1: 10,
  USR2: 12,
  TERM: 15,
  CONT: 18,
  STOP: 19,
}

function signalOf(spec: string): string {
  const name = spec.toUpperCase().replace(/^SIG/, '')

  if (/^\d+$/.test(name)) {
    const found = Object.entries(SIGNALS).find(([, n]) => String(n) === name)

    if (found === undefined) throw new Fail(`kill: ${spec}: invalid signal specification`)

    return found[0]
  }
  if (SIGNALS[name] === undefined) throw new Fail(`kill: ${spec}: invalid signal specification`)

  return name
}

/** Manda una señal a un proceso. Devuelve el error, si lo hay. */
function signal(ctx: Ctx, proc: Proc, sig: string): string | null {
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()

  if (user.uid !== 0 && proc.user !== user.name) return 'Operation not permitted'
  if (proc.pid === 1) return sig === 'KILL' || sig === 'TERM' ? 'Operation not permitted' : null
  switch (sig) {
    case 'STOP':
      proc.state = 'T'

      return null
    case 'CONT':
      proc.state = 'S'

      return null
    case 'HUP':
    case 'USR1':
    case 'USR2':
      if (proc.service !== undefined)
        ctx.sh.log(proc.service, 6, 'Received SIGHUP: reloading configuration', machine)
      else if (sig === 'HUP') {
        machine.procs = machine.procs.filter((each) => each.pid !== proc.pid)
      }

      return null
    case 'TERM':
    case 'INT':
    case 'QUIT':
      if (proc.stubborn === true) return null
      break
    default:
      break
  }
  machine.procs = machine.procs.filter((each) => each.pid !== proc.pid)
  if (proc.service !== undefined)
    serviceDied(machine, proc.service, sig, ctx.sh.world.clock, ctx.sh.log)

  return null
}

const kill: CommandFn = (ctx) => {
  let sig = 'TERM'
  const targets: string[] = []

  for (let i = 0; i < ctx.args.length; i++) {
    const arg = ctx.args[i] ?? ''

    if (arg === '-l' || arg === '-L') {
      ctx.io.out(
        ' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 9) SIGKILL\t10) SIGUSR1\n12) SIGUSR2\t15) SIGTERM\t18) SIGCONT\t19) SIGSTOP\n',
      )

      return 0
    }
    if (arg === '-s' || arg === '-n') sig = signalOf(ctx.args[++i] ?? '')
    else if (arg.startsWith('-') && arg.length > 1) sig = signalOf(arg.slice(1))
    else targets.push(arg)
  }
  if (targets.length === 0)
    throw new Fail(
      'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]',
      2,
    )

  let code = 0

  for (const target of targets) {
    const proc = procsOf(ctx).find((each) => String(each.pid) === target)

    if (!/^\d+$/.test(target)) {
      ctx.io.err(`bash: kill: ${target}: arguments must be process or job IDs\n`)
      code = 1
      continue
    }
    if (proc === undefined) {
      ctx.io.err(`bash: kill: (${target}) - No such process\n`)
      code = 1
      continue
    }

    const error = signal(ctx, proc, sig)

    if (error !== null) {
      ctx.io.err(`bash: kill: (${target}) - ${error}\n`)
      code = 1
    }
  }

  return code
}

function matching(ctx: Ctx, pattern: string, full: boolean, exact: boolean): Proc[] {
  const re = regex(pattern, { ere: true })

  return procsOf(ctx).filter((proc) => {
    const name = progName(proc.cmd)

    if (exact) return name === pattern

    return re.test(full ? proc.cmd : name, ctx.sh.budget)
  })
}

const pgrep: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'u')
  const pattern = rest[0]

  if (pattern === undefined && !values.has('u'))
    throw new Fail(
      "pgrep: no matching criteria specified\nTry `pgrep --help' for more information.",
      2,
    )

  let found =
    pattern === undefined ? procsOf(ctx) : matching(ctx, pattern, flags.has('f'), flags.has('x'))

  if (values.has('u')) found = found.filter((p) => p.user === values.get('u'))
  if (flags.has('c')) ctx.io.out(`${found.length}\n`)
  else
    ctx.io.out(
      joinLines(
        found.map((p) =>
          flags.has('a') || flags.has('l')
            ? `${p.pid} ${flags.has('a') ? p.cmd : progName(p.cmd)}`
            : String(p.pid),
        ),
      ),
    )

  return found.length > 0 ? 0 : 1
}

const pkill: CommandFn = (ctx) => {
  let sig = 'TERM'
  const args = ctx.args.filter((arg) => {
    if (/^-(\d+|[A-Z]+)$/.test(arg) && arg !== '-f' && arg !== '-x') {
      sig = signalOf(arg.slice(1))

      return false
    }

    return true
  })
  const { flags, values, rest } = getopts(args, 'u')
  const pattern = rest[0]

  if (pattern === undefined) throw new Fail(`${ctx.name}: no process name specified`, 2)

  let found = matching(ctx, pattern, flags.has('f'), ctx.name === 'killall' || flags.has('x'))

  if (values.has('u')) found = found.filter((p) => p.user === values.get('u'))
  if (found.length === 0) {
    if (ctx.name === 'killall') ctx.io.err(`${pattern}: no process found\n`)

    return 1
  }

  let code = 0

  for (const proc of found) {
    const error = signal(ctx, proc, sig)

    if (error !== null) {
      ctx.io.err(`${ctx.name}: killing pid ${proc.pid} failed: ${error}\n`)
      code = 1
    }
  }

  return code
}

/* ---------- systemctl y journalctl ---------- */

const unitName = (name: string): string => name.replace(/\.service$/, '')

function serviceOf(ctx: Ctx, name: string): Service {
  const service = own(ctx.sh.machine().services, unitName(name))

  if (service === undefined)
    throw new Fail(
      `Unit ${unitName(name)}.service could not be found.`,
      ctx.name === 'systemctl' ? 4 : 1,
    )

  return service
}

function journalLines(machine: Machine, unit: string | null, n: number): string[] {
  return machine.journal
    .filter(
      (entry) =>
        unit === null ||
        entry.unit === unit ||
        (entry.unit === 'systemd' && entry.msg.includes(`${unit}.service`)),
    )
    .slice(-n)
    .map((entry) => formatEntry(machine, entry))
}

function pidOf(machine: Machine, unit: string): number {
  if (unit === 'systemd') return 1
  if (unit === 'kernel') return 0

  const proc = machine.procs.find((each) => each.service === unit)

  return proc?.pid ?? Array.from(unit).reduce((sum, c) => sum + c.charCodeAt(0), 300)
}

function formatEntry(machine: Machine, entry: Machine['journal'][number]): string {
  const { EPOCH } = { EPOCH: Date.UTC(2026, 9, 25, 9, 0, 0) / 1000 }
  const who = entry.unit === 'kernel' ? 'kernel' : `${entry.unit}[${pidOf(machine, entry.unit)}]`

  return `${logDate(EPOCH + entry.t)} ${machine.name} ${who}: ${entry.msg}`
}

function status(ctx: Ctx, service: Service): string {
  const machine = ctx.sh.machine()
  const proc = machine.procs.find((each) => each.service === service.name)
  const state = service.active
    ? 'active (running)'
    : service.failed
      ? 'failed (Result: exit-code)'
      : 'inactive (dead)'

  return joinLines([
    `${service.active ? '●' : service.failed ? '×' : '○'} ${service.name}.service - ${service.description}`,
    `     Loaded: loaded (/lib/systemd/system/${service.name}.service; ${service.enabled ? 'enabled' : 'disabled'}; preset: enabled)`,
    `     Active: ${state}`,
    ...(proc === undefined
      ? []
      : [
          `   Main PID: ${proc.pid} (${progName(proc.cmd)})`,
          `     Memory: ${human(proc.rss * 1024)}`,
        ]),
    '',
    ...journalLines(machine, service.name, 6),
  ])
}

const systemctl: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 't', {
    type: 't',
    failed: 'F',
    'no-pager': 'P',
    now: 'N',
    all: 'a',
    state: 's',
    quiet: 'q',
  })
  const [verb = 'list-units', ...names] = rest
  const machine = ctx.sh.machine()
  const changing = [
    'start',
    'stop',
    'restart',
    'reload',
    'enable',
    'disable',
    'daemon-reload',
    'kill',
    'reset-failed',
    'reload-or-restart',
    'try-restart',
    'mask',
  ].includes(verb)

  if (changing)
    needRoot(
      ctx,
      `Failed to ${verb} ${names[0] ?? ''}${names[0] === undefined ? '' : '.service'}: Interactive authentication required.\nSee system logs and 'systemctl status ${names[0] ?? ''}${names[0] === undefined ? '' : '.service'}' for details.`,
    )

  const log = ctx.sh.log
  const clock = ctx.sh.world.clock

  switch (verb) {
    case 'status': {
      if (names.length === 0) {
        ctx.io.out(
          `● ${machine.name}\n    State: ${Object.values(machine.services).some((s) => s.failed) ? 'degraded' : 'running'}\n     Jobs: 0 queued\n   Failed: ${Object.values(machine.services).filter((s) => s.failed).length} units\n`,
        )

        return 0
      }

      let code = 0

      for (const name of names) {
        const service = serviceOf(ctx, name)

        ctx.io.out(status(ctx, service))
        if (!service.active) code = 3
      }

      return code
    }
    case 'start':
    case 'restart':
    case 'reload-or-restart':
    case 'try-restart':
    case 'reload':
    case 'stop': {
      if (names.length === 0) throw new Fail(`Too few arguments.`)

      let code = 0

      for (const name of names) {
        const service = serviceOf(ctx, name)

        if (verb === 'stop') {
          stopService(machine, service, log)
          continue
        }
        if (verb === 'reload') {
          if (!service.active)
            throw new Fail(`Job for ${service.name}.service failed: unit is not active.`)

          const error = configError(machine, service)

          if (error !== null) {
            log(service.name, 3, error, machine)
            ctx.io.err(
              `Job for ${service.name}.service failed.\nSee "systemctl status ${service.name}.service" and "journalctl -xeu ${service.name}.service" for details.\n`,
            )
            code = 1
            continue
          }
          log(service.name, 6, 'Reloading configuration', machine)
          continue
        }
        if (verb !== 'start') stopService(machine, service, log)
        if (!startService(machine, service, clock, log)) {
          ctx.io.err(
            `Job for ${service.name}.service failed because the control process exited with error code.\nSee "systemctl status ${service.name}.service" and "journalctl -xeu ${service.name}.service" for details.\n`,
          )
          code = 1
        }
      }

      return code
    }
    case 'enable':
    case 'disable': {
      for (const name of names) {
        const service = serviceOf(ctx, name)

        service.enabled = verb === 'enable'
        if (verb === 'enable')
          ctx.io.err(
            `Created symlink /etc/systemd/system/multi-user.target.wants/${service.name}.service → /lib/systemd/system/${service.name}.service.\n`,
          )
        else
          ctx.io.err(
            `Removed "/etc/systemd/system/multi-user.target.wants/${service.name}.service".\n`,
          )
        if (flags.has('N')) {
          if (verb === 'enable') startService(machine, service, clock, log)
          else stopService(machine, service, log)
        }
      }

      return 0
    }
    case 'is-active':
    case 'is-enabled':
    case 'is-failed': {
      let ok = true

      for (const name of names) {
        const service = own(machine.services, unitName(name))
        const answer =
          verb === 'is-active'
            ? service?.active === true
              ? 'active'
              : service?.failed === true
                ? 'failed'
                : 'inactive'
            : verb === 'is-enabled'
              ? service === undefined
                ? 'not-found'
                : service.enabled
                  ? 'enabled'
                  : 'disabled'
              : service?.failed === true
                ? 'failed'
                : service?.active === true
                  ? 'active'
                  : 'inactive'

        if (!flags.has('q')) ctx.io.out(`${answer}\n`)
        ok &&=
          verb === 'is-failed' ? answer === 'failed' : answer === 'active' || answer === 'enabled'
      }

      return ok ? 0 : verb === 'is-active' || verb === 'is-failed' ? 3 : 1
    }
    case 'daemon-reload':
    case 'reset-failed':
      if (verb === 'reset-failed')
        for (const service of Object.values(machine.services)) service.failed = false

      return 0
    case 'list-units':
    case 'list-unit-files': {
      let services = Object.values(machine.services).sort((a, b) => a.name.localeCompare(b.name))
      const state = values.get('s')

      if (flags.has('F') || state === 'failed') services = services.filter((s) => s.failed)
      else if (state === 'running' || state === 'active')
        services = services.filter((s) => s.active)
      else if (verb === 'list-units' && !flags.has('a'))
        services = services.filter((s) => s.active || s.failed)
      if (verb === 'list-unit-files') {
        ctx.io.out(
          joinLines([
            'UNIT FILE                 STATE    PRESET',
            ...services.map(
              (s) =>
                `${`${s.name}.service`.padEnd(25)} ${(s.enabled ? 'enabled' : 'disabled').padEnd(8)} enabled`,
            ),
            '',
            `${services.length} unit files listed.`,
          ]),
        )

        return 0
      }
      ctx.io.out(
        joinLines([
          '  UNIT                      LOAD   ACTIVE   SUB     DESCRIPTION',
          ...services.map(
            (s) =>
              `${s.failed ? '●' : ' '} ${`${s.name}.service`.padEnd(25)} loaded ${(s.active ? 'active' : s.failed ? 'failed' : 'inactive').padEnd(8)} ${(s.active ? 'running' : s.failed ? 'failed' : 'dead').padEnd(7)} ${s.description}`,
          ),
          '',
          `${services.length} loaded units listed.`,
        ]),
      )

      return 0
    }
    case 'cat': {
      const service = serviceOf(ctx, names[0] ?? '')

      ctx.io.out(
        `# /lib/systemd/system/${service.name}.service\n[Unit]\nDescription=${service.description}\nAfter=network.target\n\n[Service]\nUser=${service.user}\nExecStart=${service.exec}\nRestart=${service.restart === true ? 'always' : 'no'}\n\n[Install]\nWantedBy=multi-user.target\n`,
      )

      return 0
    }
    default:
      throw new Fail(`Unknown command verb '${verb}'.`)
  }
}

/** `--since "10 min ago"`, `"2026-10-25 09:30"`, `today`, `-1h`: segundos del mundo. */
function since(spec: string, clock: number): number {
  const epoch = Date.UTC(2026, 9, 25, 9, 0, 0) / 1000
  const ago =
    /^-?(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days)( ago)?$/.exec(
      spec.trim(),
    )

  if (ago !== null) {
    const unit = ago[2] ?? 's'
    const n = Number(ago[1])
    const scale = unit.startsWith('h')
      ? 3600
      : unit.startsWith('d')
        ? 86_400
        : unit.startsWith('m')
          ? 60
          : 1

    return clock - n * scale
  }
  if (spec === 'today') return -9 * 3600
  if (spec === 'yesterday') return -33 * 3600
  if (spec === 'now') return clock

  const date = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(spec.trim())

  if (date === null) throw new Fail(`Failed to parse timestamp: ${spec}`)

  return (
    Date.UTC(
      Number(date[1]),
      Number(date[2]) - 1,
      Number(date[3]),
      Number(date[4] ?? 0),
      Number(date[5] ?? 0),
      Number(date[6] ?? 0),
    ) /
      1000 -
    epoch
  )
}

const PRIORITIES = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug']

const journalctl: CommandFn = (ctx) => {
  const units: string[] = []
  const args = ctx.args.filter((arg, i, all) => {
    if (arg === '-u' || arg === '--unit') {
      units.push(unitName(all[i + 1] ?? ''))
      all[i + 1] = '\u0000'

      return false
    }
    if (arg.startsWith('--unit=')) {
      units.push(unitName(arg.slice(7)))

      return false
    }
    if (/^-u./.test(arg)) {
      units.push(unitName(arg.slice(2)))

      return false
    }

    return arg !== '\u0000'
  })
  const { flags, values } = getopts(args, 'npSUo', {
    lines: 'n',
    priority: 'p',
    since: 'S',
    until: 'U',
    output: 'o',
    follow: 'f',
    reverse: 'r',
    dmesg: 'k',
    boot: 'b',
    'no-pager': 'P',
    pager: 'e',
  })
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()

  if (user.uid !== 0 && !user.groups.includes('adm') && !user.groups.includes('systemd-journal'))
    ctx.io.err(
      "Hint: You are currently not seeing messages from other users and the system.\n      Users in groups 'adm', 'systemd-journal' can see all messages.\n",
    )

  let entries = machine.journal.filter(
    (entry) =>
      user.uid === 0 ||
      user.groups.includes('adm') ||
      user.groups.includes('systemd-journal') ||
      entry.unit === user.name,
  )

  if (units.length > 0)
    entries = entries.filter(
      (entry) =>
        units.includes(entry.unit) ||
        (entry.unit === 'systemd' && units.some((unit) => entry.msg.includes(`${unit}.service`))),
    )
  if (flags.has('k')) entries = entries.filter((entry) => entry.unit === 'kernel')

  const prio = values.get('p')

  if (prio !== undefined) {
    const [low, high] = prio.split('..')
    const level = (spec: string) => (/^\d$/.test(spec) ? Number(spec) : PRIORITIES.indexOf(spec))
    const max = level(high ?? low ?? 'debug')
    const min = high === undefined ? 0 : level(low ?? 'emerg')

    if (max < 0 || min < 0) throw new Fail(`Failed to parse priority value: ${prio}`)
    entries = entries.filter(
      (entry) => entry.prio <= Math.max(max, min) && entry.prio >= Math.min(max, min),
    )
  }
  if (values.has('S')) {
    const from = since(values.get('S') ?? '', ctx.sh.world.clock)

    entries = entries.filter((entry) => entry.t >= from)
  }
  if (values.has('U')) {
    const to = since(values.get('U') ?? '', ctx.sh.world.clock)

    entries = entries.filter((entry) => entry.t <= to)
  }
  if (values.has('n')) entries = entries.slice(-Number(values.get('n')))
  else if (flags.has('e')) entries = entries.slice(-1000)
  if (flags.has('r')) entries = [...entries].reverse()
  if (entries.length === 0) {
    ctx.io.out('-- No entries --\n')

    return 0
  }

  const cat = values.get('o') === 'cat'

  ctx.io.out(joinLines(entries.map((entry) => (cat ? entry.msg : formatEntry(machine, entry)))))
  if (flags.has('f')) ctx.io.err('(journalctl -f: en el simulador no se queda esperando)\n')

  return 0
}

const logger: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 'tp')

  ctx.sh.log(
    values.get('t') ?? ctx.sh.user().name,
    5,
    rest.join(' ') || ctx.io.stdin.readAll().trim(),
  )

  return 0
}

const dmesg: CommandFn = (ctx) => {
  const machine = ctx.sh.machine()
  const lines = machine.journal.filter((entry) => entry.unit === 'kernel')

  ctx.io.out(
    joinLines(
      lines.map((entry) => `[${(3_542_400 + entry.t).toFixed(6).padStart(14)}] ${entry.msg}`),
    ),
  )

  return 0
}

/* ---------- Usuarios ---------- */

const id: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)
  const machine = ctx.sh.machine()
  const user = rest[0] === undefined ? ctx.sh.user() : own(machine.users, rest[0])

  if (user === undefined) throw new Fail(`id: '${rest[0] ?? ''}': no such user`)

  const gid = (group: string) => own(machine.groups, group) ?? 0

  if (flags.has('u')) ctx.io.out(`${flags.has('n') ? user.name : user.uid}\n`)
  else if (flags.has('G') || flags.has('g'))
    ctx.io.out(
      `${(flags.has('g') ? user.groups.slice(0, 1) : user.groups).map((g) => (flags.has('n') ? g : String(gid(g)))).join(' ')}\n`,
    )
  else
    ctx.io.out(
      `uid=${user.uid}(${user.name}) gid=${gid(user.groups[0] ?? '')}(${user.groups[0] ?? ''}) groups=${user.groups.map((g) => `${gid(g)}(${g})`).join(',')}\n`,
    )

  return 0
}

const groups: CommandFn = (ctx) => {
  const machine = ctx.sh.machine()
  const user = ctx.args[0] === undefined ? ctx.sh.user() : own(machine.users, ctx.args[0])

  if (user === undefined) throw new Fail(`groups: '${ctx.args[0] ?? ''}': no such user`)
  ctx.io.out(`${ctx.args[0] === undefined ? '' : `${user.name} : `}${user.groups.join(' ')}\n`)

  return 0
}

const whoami: CommandFn = (ctx) => {
  ctx.io.out(`${ctx.sh.user().name}\n`)

  return 0
}

/** Las líneas de /etc/passwd y /etc/group, al día con los usuarios. */
function syncUserFiles(ctx: Ctx): void {
  const machine = ctx.sh.machine()
  const users = Object.values(machine.users).sort((a, b) => a.uid - b.uid)
  const now = ctx.sh.now()
  const passwd = users.map(
    (u) =>
      `${u.name}:x:${u.uid}:${own(machine.groups, u.groups[0] ?? '') ?? u.uid}:${u.name}:${u.home}:${u.shell}`,
  )
  const group = Object.entries(machine.groups)
    .sort((a, b) => a[1] - b[1])
    .map(
      ([name, gid]) =>
        `${name}:x:${gid}:${users
          .filter((u) => u.groups.slice(1).includes(name))
          .map((u) => u.name)
          .join(',')}`,
    )
  const set = (path: string, text: string) => {
    const node = own(machine.fs, path)

    if (node?.kind === 'file') {
      node.text = text
      node.mtime = now
    }
  }

  set('/etc/passwd', joinLines(passwd))
  set('/etc/group', joinLines(group))
}

const useradd: CommandFn = (ctx) => {
  needRoot(
    ctx,
    `${ctx.name}: Permission denied.\n${ctx.name}: cannot lock /etc/passwd; try again later.`,
  )

  const { flags, values, rest } = getopts(ctx.args, 'sGgdc', {
    shell: 's',
    groups: 'G',
    gid: 'g',
    home: 'd',
    'create-home': 'm',
    comment: 'c',
  })
  const name = rest[0]
  const machine = ctx.sh.machine()

  if (name === undefined) throw new Fail(`Usage: ${ctx.name} [options] LOGIN`, 2)
  if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(name))
    throw new Fail(`${ctx.name}: invalid user name '${name}'`, 3)
  if (own(machine.users, name) !== undefined)
    throw new Fail(`${ctx.name}: user '${name}' already exists`, 9)

  const extra = (values.get('G') ?? '').split(',').filter(Boolean)

  for (const group of extra)
    if (own(machine.groups, group) === undefined)
      throw new Fail(`${ctx.name}: group '${group}' does not exist`, 6)

  const uid =
    Math.max(999, ...Object.values(machine.users).map((u) => (u.uid < 60000 ? u.uid : 0))) + 1
  const primary = values.get('g') ?? name

  if (own(machine.groups, primary) === undefined) machine.groups[primary] = uid

  const home = values.get('d') ?? `/home/${name}`

  machine.users[name] = {
    name,
    uid,
    home,
    shell: values.get('s') ?? (ctx.name === 'adduser' ? '/bin/bash' : '/bin/sh'),
    groups: [primary, ...extra],
  }
  if (flags.has('m') || ctx.name === 'adduser') {
    makeDir(machine, ctx.sh.user(), home, {
      cmd: ctx.name,
      parents: true,
      now: ctx.sh.now(),
      umask: 0o022,
    })

    const node = own(machine.fs, home)

    if (node !== undefined) Object.assign(node, { owner: name, group: primary, mode: 0o750 })
  }
  if (ctx.name === 'adduser')
    ctx.io.out(
      `info: Adding user \`${name}' ...\ninfo: Adding new group \`${primary}' (${uid}) ...\ninfo: Creating home directory \`${home}' ...\n`,
    )
  syncUserFiles(ctx)

  return 0
}

const usermod: CommandFn = (ctx) => {
  needRoot(ctx, 'usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.')

  const { flags, values, rest } = getopts(ctx.args, 'Gsgdl', {
    groups: 'G',
    shell: 's',
    append: 'a',
    lock: 'L',
  })
  const machine = ctx.sh.machine()
  const user = own(machine.users, rest[0] ?? '')

  if (user === undefined) throw new Fail(`usermod: user '${rest[0] ?? ''}' does not exist`, 6)

  const list = values.get('G')

  if (list !== undefined) {
    const extra = list.split(',').filter(Boolean)

    for (const group of extra)
      if (own(machine.groups, group) === undefined)
        throw new Fail(`usermod: group '${group}' does not exist`, 6)
    // Sin -a, -G sustituye los grupos secundarios: el error clásico que deja a alguien sin sudo.
    user.groups = flags.has('a')
      ? [...new Set([...user.groups, ...extra])]
      : [user.groups[0] ?? user.name, ...extra]
  }
  if (values.has('s')) user.shell = values.get('s') ?? user.shell
  if (values.has('g')) user.groups[0] = values.get('g') ?? user.groups[0] ?? user.name
  if (flags.has('L')) user.shell = '/usr/sbin/nologin'
  syncUserFiles(ctx)

  return 0
}

const userdel: CommandFn = (ctx) => {
  needRoot(ctx, 'userdel: Permission denied.')

  const { flags, rest } = getopts(ctx.args)
  const machine = ctx.sh.machine()
  const user = own(machine.users, rest[0] ?? '')

  if (user === undefined) throw new Fail(`userdel: user '${rest[0] ?? ''}' does not exist`, 6)
  if (user.uid === 0) throw new Fail('userdel: peer4u-sandbox: root se queda', 8)
  if (machine.procs.some((p) => p.user === user.name))
    throw new Fail(
      `userdel: user ${user.name} is currently used by process ${machine.procs.find((p) => p.user === user.name)?.pid ?? 0}`,
      8,
    )
  drop(machine.users, user.name)
  if (flags.has('r'))
    for (const path of Object.keys(machine.fs))
      if (path === user.home || path.startsWith(`${user.home}/`)) drop(machine.fs, path)
  syncUserFiles(ctx)

  return 0
}

const groupadd: CommandFn = (ctx) => {
  needRoot(ctx, 'groupadd: Permission denied.')

  const name = ctx.args.find((arg) => !arg.startsWith('-'))
  const machine = ctx.sh.machine()

  if (name === undefined) throw new Fail('Usage: groupadd [options] GROUP', 2)
  if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(name))
    throw new Fail(`groupadd: '${name}' is not a valid group name`, 3)
  if (own(machine.groups, name) !== undefined)
    throw new Fail(`groupadd: group '${name}' already exists`, 9)
  machine.groups[name] =
    Math.max(1000, ...Object.values(machine.groups).filter((g) => g < 60000)) + 1
  syncUserFiles(ctx)

  return 0
}

const passwd: CommandFn = (ctx) => {
  const target = ctx.args.find((arg) => !arg.startsWith('-'))

  if (target !== undefined && target !== ctx.sh.user().name)
    needRoot(ctx, `passwd: You may not view or modify password information for ${target}.`)
  if (target !== undefined && own(ctx.sh.machine().users, target) === undefined)
    throw new Fail(`passwd: user '${target}' does not exist`)
  ctx.io.out(
    'passwd: password updated successfully (en el simulador no se escribe ninguna contraseña)\n',
  )

  return 0
}

/* ---------- crontab ---------- */

const CRON_LINE = /^(@(reboot|yearly|annually|monthly|weekly|daily|hourly)|(\S+\s+){4}\S+)\s+\S/

const crontab: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'u')
  const machine = ctx.sh.machine()
  const owner = values.get('u') ?? ctx.sh.user().name

  if (values.has('u') && owner !== ctx.sh.user().name) needRoot(ctx, 'must be privileged to use -u')
  if (flags.has('l')) {
    const text = own(machine.crontabs, owner)

    if (text === undefined) throw new Fail(`no crontab for ${owner}`)
    ctx.io.out(text)

    return 0
  }
  if (flags.has('r')) {
    drop(machine.crontabs, owner)

    return 0
  }
  if (flags.has('e'))
    throw new Fail(
      "crontab: aquí no hay editor. Escribe la tabla en un fichero y cárgala: crontab mi-cron.txt (o: (crontab -l; echo '0 3 * * * /ruta/guion.sh') | crontab -)",
    )

  const file = rest[0]

  if (file === undefined)
    throw new Fail('usage:\tcrontab [-u user] file\n\tcrontab [ -u user ] [ -i ] { -e | -l | -r }')

  const text =
    file === '-'
      ? ctx.io.stdin.readAll()
      : readText(machine, ctx.sh.user(), ctx.sh.abs(file), 'crontab', file)
  const bad = linesOf(text).findIndex(
    (line) =>
      line.trim() !== '' &&
      !line.trim().startsWith('#') &&
      !/^\w+=/.test(line.trim()) &&
      !CRON_LINE.test(line.trim()),
  )

  if (bad >= 0) {
    ctx.io.err(
      `"${file === '-' ? '-' : file}":${bad + 1}: bad minute\nerrors in crontab file, can't install.\n`,
    )

    return 1
  }
  machine.crontabs[owner] = text.endsWith('\n') || text === '' ? text : `${text}\n`
  ctx.sh.log('cron', 6, `(${owner}) REPLACE (${owner})`, machine)

  return 0
}

/* ---------- Paquetes ---------- */

const CATALOG: Record<string, string> = {
  htop: '3.3.0-4build1',
  tree: '2.1.1-2ubuntu3',
  jq: '1.7.1-3build1',
  ripgrep: '14.1.0-1',
  curl: '8.5.0-2ubuntu10',
  ncdu: '1.19-0.1',
  rsync: '3.2.7-1ubuntu1',
  unzip: '6.0-28ubuntu4',
  nginx: '1.24.0-2ubuntu7',
  'postgresql-client': '16+257build1',
  fail2ban: '1.0.2-3ubuntu0.1',
}

const apt: CommandFn = (ctx) => {
  const args = ctx.args.filter((arg) => arg !== '-y' && arg !== '--yes' && arg !== '-q')
  const [verb, ...names] = args
  const machine = ctx.sh.machine()

  if (verb === 'list' || verb === 'search' || verb === 'show' || verb === 'policy') {
    if (names.includes('--installed') || verb === 'list') {
      const installed = Object.entries(machine.packages).sort()

      ctx.io.out(
        joinLines([
          'Listing... Done',
          ...installed
            .filter(([name]) =>
              names.filter((n) => !n.startsWith('-')).every((n) => name.includes(n)),
            )
            .map(([name, version]) => `${name}/noble,now ${version} arm64 [installed]`),
        ]),
      )

      return 0
    }

    const term = names[0] ?? ''

    ctx.io.out(
      joinLines(
        Object.entries(CATALOG)
          .filter(([name]) => name.includes(term))
          .map(([name, version]) => `${name}/noble ${version} arm64`),
      ),
    )

    return 0
  }
  if (ctx.sh.user().uid !== 0) {
    ctx.io.err(
      'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n',
    )

    return 100
  }
  switch (verb) {
    case 'update':
      ctx.io.out(
        'Hit:1 http://ports.ubuntu.com/ubuntu-ports noble InRelease\nGet:2 http://ports.ubuntu.com/ubuntu-ports noble-updates InRelease [126 kB]\nFetched 126 kB in 1s (126 kB/s)\nReading package lists... Done\nBuilding dependency tree... Done\nAll packages are up to date.\n',
      )

      return 0
    case 'upgrade':
      ctx.io.out(
        'Reading package lists... Done\nCalculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n',
      )

      return 0
    case 'install':
    case 'remove':
    case 'purge': {
      const out = ['Reading package lists... Done', 'Building dependency tree... Done']

      for (const name of names) {
        const version = own(CATALOG, name)

        if (version === undefined) {
          ctx.io.out(joinLines(out))
          ctx.io.err(`E: Unable to locate package ${name}\n`)

          return 100
        }
        if (verb === 'install') {
          if (own(machine.packages, name) !== undefined)
            out.push(`${name} is already the newest version (${version}).`)
          else {
            machine.packages[name] = version
            out.push(`Setting up ${name} (${version}) ...`)
          }
        } else {
          drop(machine.packages, name)
          out.push(`Removing ${name} (${version}) ...`)
        }
      }
      ctx.io.out(joinLines(out))

      return 0
    }
    default:
      throw new Fail(`E: Invalid operation ${verb ?? ''}`, 100)
  }
}

const dpkg: CommandFn = (ctx) => {
  if (ctx.args[0] !== '-l')
    throw new Fail('dpkg: en el simulador, dpkg -l (o apt list --installed)')
  ctx.io.out(
    joinLines([
      '||/ Name           Version          Architecture Description',
      ...Object.entries(ctx.sh.machine().packages)
        .sort()
        .map(
          ([name, version]) => `ii  ${name.padEnd(14)} ${version.padEnd(16)} arm64        ${name}`,
        ),
    ]),
  )

  return 0
}

/* ---------- Lo de mirar ---------- */

const uptime: CommandFn = (ctx) => {
  const load = Math.min(9.99, procsOf(ctx).reduce((sum, p) => sum + p.cpu, 0) / 50)

  if (ctx.args.includes('-p')) ctx.io.out('up 5 weeks, 6 days, 3 hours, 12 minutes\n')
  else
    ctx.io.out(
      ` ${formatDate(ctx.sh.now(), '%T')} up 41 days,  3:12,  1 user,  load average: ${load.toFixed(2)}, ${(load * 0.8).toFixed(2)}, ${(load * 0.6).toFixed(2)}\n`,
    )

  return 0
}

const free: CommandFn = (ctx) => {
  const { flags } = getopts(ctx.args)
  const mem = memLine(ctx.sh.machine())
  const show = (kb: number) =>
    flags.has('h') ? human(kb * 1024) : flags.has('m') ? String(Math.round(kb / 1024)) : String(kb)

  ctx.io.out(
    joinLines([
      '               total        used        free      shared  buff/cache   available',
      `Mem:    ${show(MEMORY).padStart(12)} ${show(mem.used).padStart(11)} ${show(mem.free).padStart(11)} ${show(12_000).padStart(11)} ${show(mem.cache).padStart(11)} ${show(mem.free + mem.cache).padStart(11)}`,
      `Swap:   ${show(0).padStart(12)} ${show(0).padStart(11)} ${show(0).padStart(11)}`,
    ]),
  )

  return 0
}

const vmstat: CommandFn = (ctx) => {
  const mem = memLine(ctx.sh.machine())
  const cpu = Math.min(99, Math.round(procsOf(ctx).reduce((sum, p) => sum + p.cpu, 0) / 2))

  ctx.io.out(
    `procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n ${cpu > 50 ? 2 : 0}  0      0 ${String(mem.free).padStart(6)}  40212 ${String(mem.cache).padStart(6)}    0    0     3    12  210  380 ${String(cpu).padStart(2)}  1 ${String(98 - cpu).padStart(2)}  1  0\n`,
  )

  return 0
}

const uname: CommandFn = (ctx) => {
  const { flags } = getopts(ctx.args)
  const parts = {
    s: 'Linux',
    n: ctx.sh.machine().name,
    r: '6.8.0-1015-oracle',
    v: '#16-Ubuntu SMP Tue Oct  1 2026',
    m: 'aarch64',
    o: 'GNU/Linux',
  }

  ctx.io.out(
    `${
      flags.has('a')
        ? Object.values(parts).join(' ')
        : (['s', 'n', 'r', 'v', 'm', 'o'] as const)
            .filter((k) => flags.has(k))
            .map((k) => parts[k])
            .join(' ') || parts.s
    }\n`,
  )

  return 0
}

const hostname: CommandFn = (ctx) => {
  ctx.io.out(`${ctx.args.includes('-I') ? `${ctx.sh.machine().ip} ` : ctx.sh.machine().name}\n`)

  return 0
}

const date: CommandFn = (ctx) => {
  const format = ctx.args.find((arg) => arg.startsWith('+'))

  ctx.io.out(`${formatDate(ctx.sh.now(), format?.slice(1))}\n`)

  return 0
}

const nproc: CommandFn = (ctx) => {
  ctx.io.out('4\n')

  return 0
}

const lsblk: CommandFn = (ctx) => {
  const disk = human(ctx.sh.machine().disk)

  ctx.io.out(
    `NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nsda       8:0    0 ${disk.padStart(4)}  0 disk\n├─sda1    8:1    0 ${disk.padStart(4)}  0 part /\n└─sda15   8:15   0  105M  0 part /boot/efi\n`,
  )

  return 0
}

const who: CommandFn = (ctx) => {
  ctx.io.out(`${ctx.sh.session().user.padEnd(8)} pts/0        2026-10-25 08:58 (10.42.0.7)\n`)

  return 0
}

const env: CommandFn = (ctx) => {
  if (ctx.args.length > 0 && ctx.name === 'env') {
    const assigns = ctx.args.filter((arg) => /^\w+=/.test(arg))
    const rest = ctx.args.slice(assigns.length)
    const sessionEnv = ctx.sh.session().env
    const saved = { ...sessionEnv }

    for (const assign of assigns) {
      const [name = '', value = ''] = assign.split(/=(.*)/s)

      sessionEnv[name] = value
    }
    try {
      if (rest.length > 0) return ctx.sh.runArgv(rest, ctx.io)
    } finally {
      ctx.sh.session().env = saved
    }
  }

  const all = ctx.sh.session().env

  if (ctx.name === 'printenv' && ctx.args.length > 0) {
    const values = ctx.args.map((name) => own(all, name))

    ctx.io.out(joinLines(values.filter((v): v is string => v !== undefined)))

    return values.every((v) => v !== undefined) ? 0 : 1
  }
  ctx.io.out(
    joinLines(
      Object.entries(all)
        .sort()
        .map(([k, v]) => `${k}=${v}`),
    ),
  )

  return 0
}

const which: CommandFn = (ctx) => {
  let code = 0
  const machine = ctx.sh.machine()

  for (const name of ctx.args.filter((arg) => !arg.startsWith('-'))) {
    const path = (ctx.sh.session().env.PATH ?? '')
      .split(':')
      .map((dir) => `${dir.replace(/\/$/, '')}/${name}`)
    const script = path.find((each) => {
      try {
        return lookup(machine, ctx.sh.user(), each)?.node.kind === 'file'
      } catch {
        return false
      }
    })

    if (script !== undefined) ctx.io.out(`${script}\n`)
    else if (KNOWN.has(name)) ctx.io.out(`/usr/bin/${name}\n`)
    else code = 1
  }

  return code
}

/** Lo que `which` dice que está en /usr/bin (lo rellena el índice de comandos). */
export const KNOWN = new Set<string>()

const clear: CommandFn = () => 0

const nginx: CommandFn = (ctx) => {
  const machine = ctx.sh.machine()
  const service = own(machine.services, 'nginx')

  if (service === undefined) throw new Fail('nginx: command not found', 127)
  if (ctx.args.includes('-t')) {
    const error = configError(machine, service)

    if (error !== null) {
      ctx.io.err(`nginx: ${error}\nnginx: configuration file /etc/nginx/nginx.conf test failed\n`)

      return 1
    }
    ctx.io.err(
      'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n',
    )

    return 0
  }
  if (ctx.args.includes('-v') || ctx.args.includes('-V')) {
    ctx.io.err('nginx version: nginx/1.24.0 (Ubuntu)\n')

    return 0
  }
  throw new Fail(
    'nginx: usa systemctl para arrancar o parar nginx (nginx -t para probar la configuración)',
  )
}

export const SYSTEM_COMMANDS: Record<string, CommandFn> = {
  ps,
  top,
  htop: top,
  kill,
  pgrep,
  pkill,
  killall: pkill,
  systemctl,
  journalctl,
  logger,
  dmesg,
  id,
  groups,
  whoami,
  useradd,
  adduser: useradd,
  usermod,
  userdel,
  groupadd,
  passwd,
  crontab,
  apt,
  'apt-get': apt,
  dpkg,
  uptime,
  free,
  vmstat,
  uname,
  hostname,
  date,
  nproc,
  lsblk,
  who,
  w: who,
  env,
  printenv: env,
  which,
  clear,
  reset: clear,
  nginx,
}
