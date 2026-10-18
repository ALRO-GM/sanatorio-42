/**
 * De un punto del camino a lo jugable: el mundo de partida, el objetivo (el
 * resultado de su solución) y la corrección de un intento. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también.
 */

import { goalOf, missing } from '../compare.js'
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

/** Mirar es gratis: status y log no cuentan para las estrellas. */
const FREE = new Set(['status', 'log'])

/** Los comandos de git que cuentan para las estrellas. */
function gitCount(lines: readonly string[]): number {
  return lines.filter(
    (line) => /^\s*git\s/.test(line) && !FREE.has(line.trim().split(/\s+/)[1] ?? ''),
  ).length
}

/** Tres estrellas con tantos comandos de git como la solución; dos con la mitad más; una, con lo que sea. */
export function starsOf(level: Level, used: number): 1 | 2 | 3 {
  const best = gitCount(level.solution)

  if (used <= best) return 3
  if (used <= Math.ceil(best * 1.5) + 1) return 2

  return 1
}

export type Attempt = { done: boolean; misses: Miss[]; stars: 0 | 1 | 2 | 3; commands: number }

/**
 * Corrige un intento: vuelve a ejecutar las líneas desde el principio. Las que
 * fallan no cambian nada (como en la terminal), pero tampoco cuentan.
 */
export function checkAttempt(
  level: Level,
  lines: readonly string[],
  goal = goalOfLevel(level),
): Attempt {
  let world = startOf(level)
  let commands = 0

  for (const line of lines) {
    const result = run(world, line)

    if (result.ok) {
      world = { repo: result.repo, remote: result.remote }
      if (result.command !== null && !FREE.has(result.command)) commands++
    }
  }

  const misses = missing(world.repo, world.remote, goal)
  const done = misses.length === 0

  return { done, misses, stars: done ? starsOf(level, commands) : 0, commands }
}
