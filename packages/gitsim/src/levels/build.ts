/**
 * De un punto del camino a lo jugable: el mundo de partida, el objetivo (el
 * resultado de su solución) y la corrección de un intento. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también.
 */

import { goalOf, missing } from '../compare.js'
import { createCounter } from '../count.js'
import type { Goal, Miss } from '../compare.js'
import { emptyRepo } from '../model.js'
import type { Remote } from '../model.js'
import { run, runAll } from '../run.js'
import type { World } from '../run.js'
import type { Level } from './types.js'

class LevelError extends Error {}

function must(world: World, lines: readonly string[], what: string): World {
  const result = runAll(world, lines)

  if (!result.ok) throw new LevelError(`${what}: ${result.output.join(' / ')}`)

  return { repo: result.repo, remote: result.remote }
}

function emptyRemote(): Remote {
  return { commits: emptyRepo().commits, branches: { main: 'c0' }, tags: {}, locked: [] }
}

/** El mundo con el que empieza el reto. */
export function startOf(level: Level): World {
  if (level.remote === undefined)
    return must({ repo: emptyRepo(), remote: null }, level.start, level.id)

  // La compañera monta origin sin protecciones; se cierran después.
  let mate = must(
    { repo: emptyRepo('o'), remote: emptyRemote() },
    ['git clone', ...level.remote.setup],
    `${level.id} (origin)`,
  )
  let you: World = { repo: emptyRepo(), remote: mate.remote }

  if (level.remote.cloned !== false) you = must(you, ['git clone'], level.id)
  you = must(you, level.start, level.id)
  if (level.remote.after !== undefined) {
    mate = must({ ...mate, remote: you.remote }, level.remote.after, `${level.id} (después)`)
    you = { ...you, remote: mate.remote }
  }
  if (you.remote !== null) you.remote.locked = [...(level.remote.locked ?? [])]

  return you
}

/** El mundo al que se llega con la solución (lo que enseña la animación). */
export function solvedOf(level: Level): World {
  return must(startOf(level), level.solution, `${level.id} (solución)`)
}

/** Lo que hay que conseguir. */
export function goalOfLevel(level: Level): Goal {
  const solved = solvedOf(level)

  return goalOf(solved.repo, solved.remote, level.check)
}

/** Cada línea de un intento: si salió bien y si cuenta para las estrellas. */
export type Tally = { world: World; lines: { ok: boolean; counted: boolean }[]; commands: number }

/**
 * Vuelve a ejecutar las líneas desde el principio del reto, como la terminal:
 * las que fallan no cambian nada ni cuentan. Qué cuenta lo decide
 * `createCounter` (lo que cambia, no cómo se escribe).
 */
export function tally(level: Level, lines: readonly string[]): Tally {
  let world = startOf(level)
  const counter = createCounter()
  const marks: Tally['lines'] = []
  let commands = 0

  for (const line of lines) {
    const result = run(world, line)
    const next = { repo: result.repo, remote: result.remote }
    const counted = result.ok && counter(world, next)

    if (result.ok) world = next
    if (counted) commands++
    marks.push({ ok: result.ok, counted })
  }

  return { world, lines: marks, commands }
}

const pars = new Map<string, number>()

/** Los comandos que cuentan en la solución: con eso o menos, tres estrellas. */
function parOf(level: Level): number {
  const known = pars.get(level.id)

  if (known !== undefined) return known

  const par = tally(level, level.solution).commands

  pars.set(level.id, par)

  return par
}

/**
 * Cuántos comandos (de los que cuentan) caben en cada estrella: tres con
 * tantos como la solución; dos con la mitad más uno; una, con lo que sea. Lo
 * enseña la web antes de empezar y lo usa la API al corregir: es lo mismo.
 */
export function starGoals(level: Level): { three: number; two: number } {
  const three = parOf(level)

  return { three, two: Math.ceil(three * 1.5) + 1 }
}

export function starsOf(level: Level, used: number): 1 | 2 | 3 {
  const goals = starGoals(level)

  if (used <= goals.three) return 3
  if (used <= goals.two) return 2

  return 1
}

export type Attempt = { done: boolean; misses: Miss[]; stars: 0 | 1 | 2 | 3; commands: number }

/**
 * Corrige un intento: vuelve a ejecutar las líneas desde el principio y mira
 * si el repositorio ha llegado al objetivo (por su forma, no por los comandos).
 */
export function checkAttempt(
  level: Level,
  lines: readonly string[],
  goal = goalOfLevel(level),
): Attempt {
  const { world, commands } = tally(level, lines)
  const misses = missing(world.repo, world.remote, goal)
  const done = misses.length === 0

  return { done, misses, stars: done ? starsOf(level, commands) : 0, commands }
}
