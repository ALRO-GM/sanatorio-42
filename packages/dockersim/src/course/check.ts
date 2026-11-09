/**
 * De una unidad a lo jugable: el mundo de partida, el objetivo (lo que deja
 * la solución), el recuento de un intento y su corrección. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también.
 */

import { commandGoals, starsFor, starsForTime, timeGoals } from '@sanatorio/course'
import type { StarGoals, Stars, TimeGoals } from '@sanatorio/course'
import { cloneWorld, commandsIn } from '@sanatorio/shellsim'
import type { World } from '@sanatorio/shellsim'

import { fromCatalog } from '../catalog.js'
import { findContainer, findImage } from '../engine.js'
import { envOfWorld } from '../fsview.js'
import type { Env } from '../fsview.js'
import { containerJson, imageJson, networkJson, volumeJson, template } from '../inspect.js'
import { own } from '../limits.js'
import { imageSize, MB } from '../model.js'
import { healthOf, hostHttp } from '../runtime.js'
import { execIn } from '../shell.js'
import { run } from '../terminal.js'
import { baseWorld, place } from '../world.js'
import type { Check, Unit } from './types.js'

class UnitError extends Error {}

const H = '/home/peer'
const home = (path: string): string => (path.startsWith('~/') ? `${H}${path.slice(1)}` : path)

function envOf(world: World): Env {
  const env = envOfWorld(world)

  if (env === null) throw new UnitError('el mundo no tiene dev1')

  return env
}

const starts = new Map<string, string>()

/** El mundo con el que empieza la unidad. */
export function startOf(unit: Unit): World {
  const cached = starts.get(unit.id)

  if (cached !== undefined) return JSON.parse(cached) as World

  let world = baseWorld()
  const host = envOf(world).host

  for (const [path, file] of Object.entries(unit.setup?.files ?? {})) place(host, home(path), file)
  for (const line of unit.setup?.run ?? []) {
    const result = run(world, line)

    if (!result.ok)
      throw new UnitError(`${unit.id} (preparación): ${line}: ${result.output.join(' / ')}`)
    world = result.world
  }
  world.session = { ...world.session, cwd: home(unit.setup?.cwd ?? '~/'), history: [] }
  world.session.cwd = world.session.cwd.replace(/\/$/, '') || '/'
  world.clock = 0
  starts.set(unit.id, JSON.stringify(world))

  return world
}

/** Para comparar respuestas: los espacios y saltos de línea, de uno en uno. */
const loose = (text: string): string => text.trim().split(/\s+/).join(' ')

export type Tally = {
  world: World
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

function solvedOf(unit: Unit): Tally {
  const result = tally(unit, unit.solution)
  const bad = result.lines.findIndex((line) => !line.ok)

  if (bad >= 0) throw new UnitError(`${unit.id} (solución): ${unit.solution[bad] ?? ''}`)

  return result
}

type Goal = Record<string, string>

const split = (spec: string): [string, string] => {
  const at = spec.indexOf(' ')

  return at < 0 ? [spec, ''] : [spec.slice(0, at), spec.slice(at + 1)]
}

/**
 * La imagen pedida, con las versiones más concretas de la misma etiqueta
 * juntas: `redis:7.4-alpine` cuenta como `redis:7-alpine` (fijar más la versión
 * también vale), pero `nginx:latest` no cuenta como `nginx:1.27`.
 */
function pinnedRef(ref: string): string {
  const image = fromCatalog(ref)

  if (image === undefined || image.base === ref) return ref

  const split = (name: string) => /^(.*):(\d+(?:\.\d+)*)(.*)$/.exec(name)
  const asked = split(ref)
  const base = split(image.base)

  return asked !== null &&
    base !== null &&
    asked[1] === base[1] &&
    (asked[2] === base[2] || asked[2]?.startsWith(`${base[2] ?? ''}.`) === true) &&
    (asked[3] ?? '').startsWith(base[3] ?? '')
    ? image.base
    : ref
}

/** Cómo está el mundo en lo que mira la unidad (una clave por cosa). Mira una copia: no cambia nada. */
function snapshot(original: World, check: Check): Goal {
  const world = cloneWorld(original)
  const env = envOf(world)
  const out: Goal = {}

  for (const name of check.containers ?? []) {
    const c = findContainer(env, name)

    out[`container:${name}`] =
      c === undefined
        ? '∅'
        : [
            c.status === 'exited' ? `exited(${c.exitCode})` : c.status,
            pinnedRef(c.ref),
            c.status === 'running'
              ? c.ports
                  .map((p) => `${p.ip === '0.0.0.0' ? '' : `${p.ip}:`}${p.host}->${p.container}`)
                  .sort()
                  .join(',')
              : '',
            healthOf(env, c) ?? '',
          ].join(' ')
  }
  for (const name of check.gone ?? [])
    out[`gone:${name}`] = findContainer(env, name) === undefined ? 'gone' : 'there'
  for (const ref of check.images ?? [])
    out[`image:${ref}`] = findImage(env, ref) === undefined ? '∅' : 'ok'
  for (const spec of check.inspect ?? []) {
    const [name, format] = split(spec)
    const c = findContainer(env, name)
    const image = c === undefined ? findImage(env, name) : undefined
    const volume = own(env.state.volumes, name)
    const network = own(env.state.networks, name)
    const json =
      c !== undefined
        ? containerJson(env, c)
        : image !== undefined
          ? imageJson(env, image)
          : volume !== undefined
            ? volumeJson(volume)
            : network !== undefined
              ? networkJson(env, network)
              : null

    try {
      out[`inspect:${spec}`] = json === null ? '∅' : template(format, json)
    } catch {
      out[`inspect:${spec}`] = 'error'
    }
  }
  for (const url of check.http ?? []) {
    const parsed = /^([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url)
    const reply = hostHttp(
      env,
      parsed?.[1] ?? 'localhost',
      Number(parsed?.[2] ?? 80),
      parsed?.[3] ?? '/',
    )

    out[`http:${url}`] = reply === null ? '∅' : `${reply.status} ${loose(reply.body)}`
  }
  for (const spec of check.exec ?? []) {
    const [name, command] = split(spec)
    const c = findContainer(env, name)

    out[`exec:${spec}`] =
      c?.status !== 'running'
        ? '∅'
        : (() => {
            const result = execIn(env, c, ['sh', '-c', command], { quiet: true })

            return `${result.code} ${loose(result.out)}`
          })()
  }
  for (const name of check.volumes ?? [])
    out[`volume:${name}`] = own(env.state.volumes, name) === undefined ? '∅' : 'ok'
  for (const name of check.networks ?? [])
    out[`network:${name}`] = own(env.state.networks, name) === undefined ? '∅' : 'ok'
  for (const ref of check.registry ?? [])
    out[`registry:${ref}`] = own(env.state.registry.tags, ref) === undefined ? '∅' : 'ok'
  for (const path of check.files ?? []) {
    const node = own(env.host.fs, home(path))

    out[`file:${path}`] = node === undefined ? '∅' : node.kind === 'file' ? node.text : node.kind
  }
  for (const path of check.exists ?? [])
    out[`exists:${path}`] = own(env.host.fs, home(path)) === undefined ? '∅' : 'ok'
  for (const spec of check.size ?? []) {
    const [ref, limit] = split(spec)
    const image = findImage(env, ref)

    out[`size:${spec}`] =
      image === undefined
        ? '∅'
        : imageSize(image) < Number(limit) * MB
          ? `<${limit}MB`
          : `≥${limit}MB`
  }
  for (const [name, entries] of Object.entries(check.probes ?? {})) {
    let current = cloneWorld(original)
    const outputs: string[] = []

    for (const entry of entries) {
      const result = run(current, entry)

      current = result.world
      outputs.push(`${loose(result.output.join('\n'))} [${result.code}]`)
    }
    out[`probe:${name}`] = outputs.join('\n')
  }

  return out
}

const goals = new Map<string, { goal: Goal; output: string | null; par: number }>()

/** Lo que hay que conseguir (y la salida esperada, si la unidad pide una). */
export function goalOf(unit: Unit): { goal: Goal; output: string | null; par: number } {
  const known = goals.get(unit.id)

  if (known !== undefined) return known

  const solved = solvedOf(unit)
  const result = {
    goal: snapshot(solved.world, unit.check),
    output: unit.check.output === true ? loose(solved.lines.at(-1)?.stdout ?? '') : null,
    par: solved.commands,
  }

  goals.set(unit.id, result)

  return result
}

/** Las órdenes y subórdenes de docker usadas en una entrada (para `requires`). */
function usedIn(entry: string): string[] {
  const subs = [
    ...entry.matchAll(
      /\bdocker\s+(?:compose\s+(?:-f\s+\S+\s+)*)?(?:container\s+|image\s+|volume\s+|network\s+|system\s+|buildx\s+)?([a-z-]+)/g,
    ),
  ].map((match) => match[1] ?? '')

  return [...commandsIn(entry), ...subs]
}

/** Qué falta: las claves que no coinciden, `output` y `requires`. */
export function missing(unit: Unit, tallied: Tally, entries: readonly string[]): string[] {
  const { goal, output } = goalOf(unit)
  const now = snapshot(tallied.world, unit.check)
  const misses = Object.keys(goal).filter((key) => now[key] !== goal[key])

  if (output !== null && !tallied.lines.some((line) => line.ok && loose(line.stdout) === output))
    misses.push('output')

  const used = new Set(
    entries.flatMap((entry, index) => (tallied.lines[index]?.ok === true ? usedIn(entry) : [])),
  )

  for (const group of unit.requires ?? [])
    if (!group.some((name) => used.has(name))) misses.push(`requires:${group.join('|')}`)

  return misses
}

export function starGoals(unit: Unit): StarGoals {
  return commandGoals(goalOf(unit).par)
}

export function timeGoalsOf(unit: Unit): TimeGoals | null {
  return unit.limit === undefined ? null : timeGoals(unit.limit)
}

export type Attempt = { done: boolean; misses: string[]; stars: Stars | 0; commands: number }

/** Corrige un intento: vuelve a ejecutar las órdenes y mira si el mundo llegó al objetivo. */
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
