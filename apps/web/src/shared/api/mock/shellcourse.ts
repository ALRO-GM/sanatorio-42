/**
 * API de mentira: el curso de shell. Corrige con el mismo motor que la API y
 * cronometra los jefes con el reloj del navegador (la de verdad usa el suyo).
 * Empieza con el nivel principiante superado (y su certificado) y dos
 * unidades del intermedio, para que la demostración enseñe el camino a medias.
 */

import type { CourseStars, ShellCourse } from '@sanatorio/contracts'
import { checkAttempt, FINALS, TIERS, UNITS } from '@sanatorio/shellsim'

import { delay, fail } from './state'
import type { Api } from '../types'

const DONE_AT = '2026-10-20T17:42:00.000Z'
const course: ShellCourse = { stars: {}, best: {}, runs: {}, certificates: [] }
const doneAt: Record<string, string> = {}

for (const [index, unit] of UNITS.slice(
  0,
  UNITS.findIndex((each) => each.id === 'cut-tr'),
).entries()) {
  const stars = (index % 4 === 3 ? 2 : 3) as CourseStars

  course.stars[unit.id] = stars
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
    certificates: TIERS.flatMap((tier) => {
      const stars = course.stars[FINALS[tier]]

      return stars === undefined
        ? []
        : [
            {
              tier,
              stars,
              seconds: course.best[FINALS[tier]]?.seconds ?? 0,
              at: doneAt[FINALS[tier]] ?? DONE_AT,
            },
          ]
    }),
  }
}

function unitAt(id: string) {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw fail(404, 'Ese punto del curso no existe')

  const previous = UNITS[index - 1]

  if (previous !== undefined && course.stars[previous.id] === undefined)
    throw fail(409, 'Antes tienes que superar el punto anterior')

  return unit
}

export const shellCourseMock: Pick<
  Api,
  'getShellCourse' | 'submitShellAttempt' | 'startShellBoss'
> = {
  async getShellCourse() {
    await delay(80)

    return snapshot()
  },
  async startShellBoss(id) {
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
  async submitShellAttempt(id, { entries }) {
    await delay(150)

    const unit = unitAt(id)
    let seconds: number | null = null

    if (unit.limit !== undefined) {
      const run = course.runs[id]

      if (run === undefined) throw fail(409, 'Primero empieza el contrarreloj')
      seconds = Math.round((Date.now() - Date.parse(run.startedAt)) / 1000)
    }

    const result = checkAttempt(unit, entries, seconds ?? undefined)

    if (result.done && result.stars > 0) {
      course.stars[id] = Math.max(course.stars[id] ?? 0, result.stars) as CourseStars

      const best = course.best[id]

      course.best[id] = {
        commands: Math.min(best?.commands ?? Infinity, result.commands),
        seconds: seconds === null ? null : Math.min(best?.seconds ?? Infinity, seconds),
      }
      doneAt[id] = new Date().toISOString()
      course.runs = Object.fromEntries(Object.entries(course.runs).filter(([unit]) => unit !== id))
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
