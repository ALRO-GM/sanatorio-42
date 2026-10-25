/**
 * De una unidad a lo jugable: el mundo de partida, el objetivo (lo que deja
 * la solución), el recuento de un intento y su corrección. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también, y
 * las estrellas las calcula la API con estas funciones.
 */

import { commandGoals, starsFor, starsForTime, timeGoals } from '@sanatorio/course'
import type { StarGoals, Stars, TimeGoals } from '@sanatorio/course'

import { diskUsed } from '../commands/files.js'
import { freshSession } from '../interp.js'
import { lookup } from '../fs.js'
import { own } from '../limits.js'
import type { FsNode, Machine, World } from '../model.js'
import { cloneWorld } from '../model.js'
import { commandsIn } from '../parse.js'
import { run } from '../run.js'
import { baseWorld } from '../world.js'
import type { Check, FileSpec, Unit } from './types.js'

class UnitError extends Error {}

const DAY = 86_400

/** `db1:/ruta` → la máquina y la ruta (`web1` si no se dice). */
function split(spec: string): { host: string; path: string } {
  const at = /^([a-z0-9]+):(\/.*)$/.exec(spec)

  return at === null ? { host: 'web1', path: spec } : { host: at[1] ?? 'web1', path: at[2] ?? '/' }
}

function machine(world: World, host: string): Machine {
  const found = own(world.machines, host)

  if (found === undefined) throw new UnitError(`máquina ${host}`)

  return found
}

/** `nginx` → `web1:/nginx`; `db1:postgresql` → `db1:/postgresql` (para servicios, procesos y usuarios). */
const named = (spec: string): string =>
  spec.includes(':') ? spec.replace(':', ':/') : `web1:/${spec}`

/** Crea un fichero de la preparación (y sus carpetas, del dueño del fichero). */
function place(world: World, spec: string, file: FileSpec): void {
  const { host, path } = split(spec)
  const target = machine(world, host)
  const info = typeof file === 'string' ? { text: file } : file
  const home = /^\/home\/([^/]+)/.exec(path)?.[1]
  const owner = info.owner ?? home ?? 'root'
  const group = info.group ?? owner
  const now = world.clock - (info.age ?? 0) * DAY + Date.UTC(2026, 9, 25, 9, 0, 0) / 1000
  const parts = path.split('/').filter(Boolean)

  for (let i = 1; i < parts.length; i++) {
    const dir = `/${parts.slice(0, i).join('/')}`

    if (own(target.fs, dir) === undefined)
      target.fs[dir] = { kind: 'dir', mode: 0o755, owner, group, mtime: now }
  }

  const node: FsNode = {
    kind: 'file',
    text: info.text,
    mode: info.mode ?? 0o644,
    owner,
    group,
    mtime: now,
  }

  if (info.size !== undefined) node.size = info.size
  target.fs[path] = node
}

const starts = new Map<string, string>()

/** El mundo con el que empieza la unidad. */
export function startOf(unit: Unit): World {
  const cached = starts.get(unit.id)

  if (cached !== undefined) return JSON.parse(cached) as World

  let world = baseWorld()

  for (const [path, file] of Object.entries(unit.setup?.files ?? {})) place(world, path, file)

  for (const spec of unit.setup?.procs ?? []) {
    const target = machine(world, spec.host ?? 'web1')

    for (let i = 0; i < (spec.count ?? 1); i++)
      target.procs.push({
        pid: target.nextPid++,
        ppid: 1,
        user: spec.user,
        cmd: spec.cmd,
        cpu: spec.cpu,
        mem: spec.mem,
        rss: Math.round(spec.mem * 40_000),
        state: spec.cpu > 50 ? 'R' : 'S',
        tty: '?',
        start: -1800,
        ...(spec.stubborn === true ? { stubborn: true } : {}),
      })
  }

  const peer = world.session
  const root = machine(world, 'web1').users.root

  if (root === undefined) throw new UnitError('root')
  world.session = freshSession('web1', root)
  for (const line of unit.setup?.run ?? []) {
    const result = run(world, line)

    if (!result.ok)
      throw new UnitError(`${unit.id} (preparación): ${line}: ${result.output.join(' / ')}`)
    world = result.world
  }
  world.session = { ...peer, cwd: unit.setup?.cwd ?? peer.cwd, history: [] }
  world.clock = 0
  starts.set(unit.id, JSON.stringify(world))

  return world
}

/** Lo que se ve de una salida, sin espacios al final de cada línea ni líneas vacías al final. */
function normalized(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '')
}

/** Para comparar respuestas: los espacios y saltos de línea, de uno en uno (ls en columnas o en líneas da igual). */
const loose = (text: string): string => text.trim().split(/\s+/).join(' ')

export type Tally = {
  world: World
  /** Cada orden: si salió bien, cuántos comandos contó, y lo que escribió. */
  lines: { ok: boolean; counted: number; stdout: string; incomplete: boolean }[]
  commands: number
}

/** Vuelve a ejecutar las órdenes desde el principio de la unidad, como la terminal. */
export function tally(unit: Unit, entries: readonly string[], from = startOf(unit)): Tally {
  let world = from
  const lines: Tally['lines'] = []
  let commands = 0

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    commands += result.counted
    lines.push({
      ok: result.ok,
      counted: result.counted,
      stdout: result.stdout,
      incomplete: result.incomplete === true,
    })
  }

  return { world, lines, commands }
}

/** El mundo al que llega la solución (y su salida, para `output`). */
function solvedOf(unit: Unit): Tally {
  const result = tally(unit, unit.solution)
  const bad = result.lines.findIndex((line) => !line.ok)

  if (bad >= 0) throw new UnitError(`${unit.id} (solución): ${unit.solution[bad] ?? ''}`)

  return result
}

function nodeAt(world: World, spec: string): FsNode | null {
  const { host, path } = split(spec)
  const target = machine(world, host)
  const root = target.users.root

  if (root === undefined) return null
  try {
    return lookup(target, root, path)?.node ?? null
  } catch {
    return null
  }
}

/** La tabla de cron, sin comentarios ni espacios de más, y con `~` como la carpeta personal. */
function cronOf(world: World, spec: string): string {
  const { host, path: user } = split(named(spec))
  const name = user.replace(/^\//, '')
  const target = machine(world, host)
  const home = own(target.users, name)?.home ?? `/home/${name}`
  const text = own(target.crontabs, name) ?? ''

  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/#.*/, '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/(^|\s)(~|\$HOME)\//g, `$1${home}/`),
    )
    .filter(Boolean)
    .join('\n')
}

function archiveOf(world: World, spec: string): string {
  const node = nodeAt(world, spec)

  if (node?.kind !== 'file') return '∅'

  const plain = node.text.replace(/^#peer4u-gzip v1\n/, '')

  if (!plain.startsWith('#peer4u-tar v1\n')) return 'no es un tar'
  try {
    const archive = JSON.parse(plain.slice('#peer4u-tar v1\n'.length)) as {
      files: { path: string; node: FsNode }[]
    }
    const files = archive.files
      .filter((each) => each.node.kind === 'file')
      .map((each) => each.path.split('/').slice(-2).join('/'))
      .sort()

    return `${node.text.startsWith('#peer4u-gzip') ? 'gz' : 'tar'}:${files.join(',')}`
  } catch {
    return 'dañado'
  }
}

/** Lo que miran las sondas: una copia del mundo, como peer en su carpeta de web1. */
function probe(world: World, entries: readonly string[]): string[] {
  const copy = cloneWorld(world)
  const peer = machine(copy, 'web1').users.peer

  if (peer === undefined) return []
  copy.session = freshSession('web1', peer)
  copy.stack = []

  let current = copy

  return entries.map((entry) => {
    const result = run(current, entry)

    current = result.world

    return `${normalized(result.output.join('\n'))}\n[${result.code}]`
  })
}

type Goal = Record<string, string>

/** Cómo está el mundo en lo que mira la unidad (una clave por cosa). */
function snapshot(world: World, check: Check): Goal {
  const out: Goal = {}

  for (const spec of check.files ?? []) {
    const node = nodeAt(world, spec)

    out[`file:${spec}`] = node === null ? '∅' : node.kind === 'file' ? node.text : node.kind
  }
  for (const spec of check.dirs ?? [])
    out[`dir:${spec}`] = nodeAt(world, spec)?.kind === 'dir' ? 'dir' : '∅'
  for (const spec of check.modes ?? []) {
    const node = nodeAt(world, spec)

    out[`mode:${spec}`] =
      node === null ? '∅' : `${(node.mode & 0o7777).toString(8)} ${node.owner}:${node.group}`
  }
  if (check.cwd === true) out.cwd = `${world.session.host}:${world.session.cwd}`
  for (const spec of check.services ?? []) {
    const { host, path } = split(named(spec))
    const service = own(machine(world, host).services, path.replace(/^\//, ''))

    out[`service:${spec}`] =
      service === undefined
        ? '∅'
        : `${service.active ? 'active' : 'inactive'} ${service.enabled ? 'enabled' : 'disabled'}`
  }
  for (const spec of check.procs ?? []) {
    const { host, path } = split(named(spec))
    const pattern = path.replace(/^\//, '')
    const alive = machine(world, host).procs.some(
      (proc) =>
        proc.cmd.includes(pattern) && (proc.until === undefined || proc.until > world.clock),
    )

    out[`proc:${spec}`] = alive ? 'running' : 'stopped'
  }
  for (const spec of check.users ?? []) {
    const { host, path } = split(named(spec))
    const user = own(machine(world, host).users, path.replace(/^\//, ''))

    out[`user:${spec}`] = user === undefined ? '∅' : [...user.groups].sort().join(',')
  }
  for (const spec of check.crontab ?? []) out[`crontab:${spec}`] = cronOf(world, spec)
  for (const name of check.env ?? []) {
    const sessions = [world.session, ...world.stack]

    out[`env:${name}`] =
      own(sessions.find((each) => each.host === 'web1' && each.user === 'peer')?.env ?? {}, name) ??
      '∅'
  }
  for (const spec of check.archives ?? []) out[`archive:${spec}`] = archiveOf(world, spec)
  if (check.disk !== undefined) {
    const target = machine(world, check.disk.host ?? 'web1')

    out[`disk:${check.disk.host ?? 'web1'}`] =
      (diskUsed(target) / target.disk) * 100 < check.disk.below
        ? `<${check.disk.below}%`
        : `≥${check.disk.below}%`
  }
  probe(world, check.probes ?? []).forEach((value, index) => {
    out[`probe:${index + 1}`] = value
  })

  return out
}

const goals = new Map<string, { goal: Goal; output: string | null; par: number }>()

/** Lo que hay que conseguir (y la salida esperada, si la unidad pide una). */
export function goalOf(unit: Unit): { goal: Goal; output: string | null; par: number } {
  const known = goals.get(unit.id)

  if (known !== undefined) return known

  const solved = solvedOf(unit)
  const last = solved.lines.at(-1)
  const result = {
    goal: snapshot(solved.world, unit.check),
    output: unit.check.output === true ? loose(last?.stdout ?? '') : null,
    par: solved.commands,
  }

  goals.set(unit.id, result)

  return result
}

/** Qué falta: las claves de `snapshot` que no coinciden, `output` y `requires`. */
export function missing(unit: Unit, tallied: Tally, entries: readonly string[]): string[] {
  const { goal, output } = goalOf(unit)
  const now = snapshot(tallied.world, unit.check)
  const misses = Object.keys(goal).filter((key) => now[key] !== goal[key])

  if (output !== null && !tallied.lines.some((line) => line.ok && loose(line.stdout) === output))
    misses.push('output')

  const used = new Set(
    entries.flatMap((entry, index) => (tallied.lines[index]?.ok === true ? commandsIn(entry) : [])),
  )

  for (const group of unit.requires ?? [])
    if (!group.some((name) => used.has(name))) misses.push(`requires:${group.join('|')}`)

  return misses
}

/** Cuántos comandos caben en cada estrella (unidades). */
export function starGoals(unit: Unit): StarGoals {
  return commandGoals(goalOf(unit).par)
}

/** Cuántos segundos caben en cada estrella (jefes), o `null` si la unidad no es contrarreloj. */
export function timeGoalsOf(unit: Unit): TimeGoals | null {
  return unit.limit === undefined ? null : timeGoals(unit.limit)
}

export type Attempt = { done: boolean; misses: string[]; stars: Stars | 0; commands: number }

/**
 * Corrige un intento: vuelve a ejecutar las órdenes desde el principio y
 * mira si el mundo ha llegado al objetivo. En un contrarreloj, `seconds` es
 * el tiempo que ha medido quien corrige (la API, no el navegador).
 */
export function checkAttempt(unit: Unit, entries: readonly string[], seconds?: number): Attempt {
  const tallied = tally(unit, entries)
  const misses = missing(unit, tallied, entries)
  const done = misses.length === 0
  const limits = timeGoalsOf(unit)
  let stars: Stars | 0 = 0

  if (done)
    stars =
      limits === null
        ? starsFor(tallied.commands, starGoals(unit))
        : starsForTime(seconds ?? 0, limits)

  return {
    done: done && stars > 0,
    misses: done && stars === 0 ? ['time'] : misses,
    stars,
    commands: tallied.commands,
  }
}

/** El ejemplo: cada orden con lo que contesta, sobre el mundo de partida. */
export function exampleOf(unit: Unit): { line: string; output: string[] }[] {
  let world = startOf(unit)

  return (unit.example ?? []).map((line) => {
    const result = run(world, line)

    world = result.world

    return { line, output: result.output }
  })
}
