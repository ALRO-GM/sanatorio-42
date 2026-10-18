/**
 * Curso de git (#42 del buzón): el camino de puntos. La web juega cada reto
 * con el git simulado y manda los comandos que escribiste; aquí se vuelven a
 * ejecutar con el mismo motor antes de dar el punto, así que no vale mandar
 * «hecho» sin hacerlo. Solo se juega sentado en un puesto del clúster.
 */

import type { GitAttemptResult, GitCourse } from '@sanatorio/contracts'
import { checkAttempt, LEVELS } from '@sanatorio/gitsim'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'

const attemptSchema = z.object({
  lines: z.array(z.string().max(200)).max(300),
})

type Stars = 1 | 2 | 3

export function createGitCourseRepository(db: Db) {
  return {
    async stars(login: string): Promise<Record<string, Stars>> {
      const result = await db.execute({
        sql: 'SELECT level, stars FROM git_progress WHERE login = ?',
        args: [login],
      })

      return Object.fromEntries(
        result.rows.map((row) => [toText(row.level), toNumber(row.stars) as Stars]),
      )
    },

    /** Guarda el punto; si ya estaba, se queda la mejor vez. */
    async save(
      login: string,
      level: string,
      stars: Stars,
      commands: number,
      at: string,
    ): Promise<void> {
      await db.execute({
        sql: `INSERT INTO git_progress (login, level, stars, commands, done_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (login, level) DO UPDATE SET
                stars = MAX(stars, excluded.stars), commands = MIN(commands, excluded.commands)`,
        args: [login, level, stars, commands, at],
      })
    },
  }
}

type GitCourseRepository = ReturnType<typeof createGitCourseRepository>

export function createGitCourseService(deps: {
  progress: GitCourseRepository
  /** El puesto en el que está sentada esa persona ahora, o `null`. */
  seatOf: (login: string) => Promise<string | null>
  now?: () => number
}) {
  const now = deps.now ?? Date.now

  async function course(login: string): Promise<GitCourse> {
    const [seat, stars] = await Promise.all([deps.seatOf(login), deps.progress.stars(login)])

    return { seat, stars }
  }

  return {
    course: (actor: Actor) => course(actor.login),

    async attempt(actor: Actor, id: string, input: unknown): Promise<GitAttemptResult> {
      const index = LEVELS.findIndex((level) => level.id === id)
      const level = LEVELS[index]

      if (level === undefined) throw domainError('not_found', 'Ese punto del camino no existe')

      const { lines } = parse(attemptSchema, input)
      const before = await course(actor.login)

      if (before.seat === null) {
        throw domainError('forbidden', 'El curso de git se juega desde un ordenador del clúster')
      }

      const previous = LEVELS[index - 1]

      if (previous !== undefined && before.stars[previous.id] === undefined) {
        throw domainError('conflict', 'Antes tienes que superar el punto anterior')
      }

      const result = checkAttempt(level, lines)

      if (result.done && result.stars > 0) {
        await deps.progress.save(
          actor.login,
          level.id,
          result.stars as Stars,
          result.commands,
          new Date(now()).toISOString(),
        )
      }

      return {
        done: result.done,
        stars: result.stars,
        misses: result.misses.map((miss) => miss.name),
        course: await course(actor.login),
      }
    },
  }
}

export type GitCourseService = ReturnType<typeof createGitCourseService>
