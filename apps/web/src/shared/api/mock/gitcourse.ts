/**
 * API de mentira: el curso de git. Corrige con el mismo motor que la API, y
 * hace como si quien mira estuviera sentado en un puesto del clúster.
 */

import type { GitCourse } from '@sanatorio/contracts'
import { checkAttempt, LEVELS } from '@sanatorio/gitsim'

import { delay, fail } from './state'
import type { Api } from '../types'

const course: GitCourse = { seat: 'c1r4s2', stars: {} }

export const gitCourseMock: Pick<Api, 'getGitCourse' | 'submitGitAttempt'> = {
  async getGitCourse() {
    await delay(80)

    return { seat: course.seat, stars: { ...course.stars } }
  },
  async submitGitAttempt(id, { lines }) {
    await delay(150)

    const index = LEVELS.findIndex((level) => level.id === id)
    const level = LEVELS[index]
    const previous = LEVELS[index - 1]

    if (level === undefined) throw fail(404, 'Ese punto del camino no existe')
    if (previous !== undefined && course.stars[previous.id] === undefined)
      throw fail(409, 'Antes tienes que superar el punto anterior')

    const result = checkAttempt(level, lines)

    if (result.done && result.stars > 0) {
      course.stars[id] = Math.max(course.stars[id] ?? 0, result.stars) as 1 | 2 | 3
    }

    return {
      done: result.done,
      stars: result.stars,
      misses: result.misses.map((miss) => miss.name),
      course: { seat: course.seat, stars: { ...course.stars } },
    }
  },
}
