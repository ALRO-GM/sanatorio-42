/**
 * API de mentira de un curso de terminal (el de shell y el de Docker): corrige
 * con el mismo motor que la API y cronometra los jefes con el reloj del
 * navegador (la de verdad usa el suyo). Empieza con unos puntos ya superados,
 * para que la demostración enseñe el camino a medias.
 */

import type {
  CourseStars,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from '@sanatorio/contracts'
import type { Attempt } from '@sanatorio/shellsim'

import { delay, fail } from './state'

const DONE_AT = '2026-10-20T17:42:00.000Z'

type Unit = { id: string; limit?: number; solution: string[] }

type TerminalCourseMock = {
  get: () => Promise<ShellCourse>
  start: (id: string) => Promise<ShellBossStart>
  submit: (id: string, input: { entries: string[] }) => Promise<ShellAttemptResult>
}

export function terminalCourseMock<U extends Unit>(engine: {
  units: readonly U[]
  finals: Record<string, string>
  tiers: readonly ('beginner' | 'intermediate' | 'advanced')[]
  checkAttempt: (unit: U, entries: readonly string[], seconds?: number) => Attempt
  /** Los puntos que se dan por superados al empezar (los de antes de este). */
  doneBefore: string
}): TerminalCourseMock {
  const course: ShellCourse = { stars: {}, best: {}, runs: {}, certificates: [] }
  const doneAt: Record<string, string> = {}
  const until = engine.units.findIndex((each) => each.id === engine.doneBefore)

  for (const [index, unit] of engine.units.slice(0, Math.max(0, until)).entries()) {
    course.stars[unit.id] = index % 4 === 3 ? 2 : 3
    course.best[unit.id] = {
      commands: unit.solution.length,
      seconds: unit.limit === undefined ? null : Math.round(unit.limit * 0.42),
    }
    doneAt[unit.id] = DONE_AT
  }

  function snapshot(): ShellCourse {
    const now = Date.now()

    return {
      stars: { ...course.stars },
      best: { ...course.best },
      runs: Object.fromEntries(
        Object.entries(course.runs).filter(([, run]) => Date.parse(run.deadline) > now),
      ),
      certificates: engine.tiers.flatMap((tier) => {
        const id = engine.finals[tier] ?? ''
        const stars = course.stars[id]

        return stars === undefined
          ? []
          : [{ tier, stars, seconds: course.best[id]?.seconds ?? 0, at: doneAt[id] ?? DONE_AT }]
      }),
    }
  }

  function unitAt(id: string): U {
    const index = engine.units.findIndex((unit) => unit.id === id)
    const unit = engine.units[index]

    if (unit === undefined) throw fail(404, 'Ese punto del curso no existe')

    const previous = engine.units[index - 1]

    if (previous !== undefined && course.stars[previous.id] === undefined)
      throw fail(409, 'Antes tienes que superar el punto anterior')

    return unit
  }

  return {
    async get() {
      await delay(80)

      return snapshot()
    },
    async start(id) {
      await delay(100)

      const unit = unitAt(id)

      if (unit.limit === undefined) throw fail(400, 'Ese punto no es un contrarreloj')

      const now = Date.now()
      const run = {
        startedAt: new Date(now).toISOString(),
        deadline: new Date(now + unit.limit * 1000).toISOString(),
      }

      course.runs[id] = run

      return { unit: id, run, course: snapshot() }
    },
    async submit(id, { entries }) {
      await delay(150)

      const unit = unitAt(id)
      let seconds: number | null = null

      if (unit.limit !== undefined) {
        const run = course.runs[id]

        if (run === undefined) throw fail(409, 'Primero empieza el contrarreloj')
        seconds = Math.round((Date.now() - Date.parse(run.startedAt)) / 1000)
      }

      const result = engine.checkAttempt(unit, entries, seconds ?? undefined)

      if (result.done && result.stars > 0) {
        course.stars[id] = Math.max(course.stars[id] ?? 0, result.stars) as CourseStars

        const best = course.best[id]

        course.best[id] = {
          commands: Math.min(best?.commands ?? Infinity, result.commands),
          seconds: seconds === null ? null : Math.min(best?.seconds ?? Infinity, seconds),
        }
        doneAt[id] = new Date().toISOString()
        course.runs = Object.fromEntries(
          Object.entries(course.runs).filter(([unitId]) => unitId !== id),
        )
      }

      return {
        done: result.done,
        stars: result.stars,
        commands: result.commands,
        seconds,
        misses: result.misses,
        course: snapshot(),
      }
    },
  }
}
