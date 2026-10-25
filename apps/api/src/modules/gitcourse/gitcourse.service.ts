/**
 * Curso de git (#42 del buzón): el camino de puntos. La web juega cada reto
 * con el git simulado y manda los comandos que escribiste; aquí se vuelven a
 * ejecutar con el mismo motor antes de dar el punto, así que no vale mandar
 * «hecho» sin hacerlo. Solo se juega sentado en un puesto del clúster.
 */

import type { GitAttemptResult, GitCourse, GitGateQuiz, GitGateResult } from '@sanatorio/contracts'
import { checkAttempt, estimateOfLevel, LEVELS, LIMITS } from '@sanatorio/gitsim'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { parse } from '../../core/validation.js'
import { activeSecondsSchema } from '../shellcourse/index.js'
import type { CourseTimes } from '../shellcourse/index.js'
import type { GateService } from './gates.js'

// Los mismos topes que la terminal: la API vuelve a ejecutar cada línea.
const attemptSchema = z.object({
  lines: z.array(z.string().max(LIMITS.line)).max(LIMITS.attemptLines),
  activeSeconds: activeSecondsSchema,
})

/**
 * Intentos por persona: la web manda uno al llegar al objetivo, así que 30 en
 * diez minutos es repetir un punto muchas veces. Más es un guion, y cada
 * intento vuelve a ejecutar hasta 300 líneas.
 */
const ATTEMPTS_PER_WINDOW = 30
const ATTEMPT_WINDOW_MS = 10 * 60_000

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
  gates: GateService
  /** El puesto en el que está sentada esa persona ahora, o `null`. */
  seatOf: (login: string) => Promise<string | null>
  /** Dónde se apunta el tiempo activo de cada punto superado. */
  times?: CourseTimes
  now?: () => number
}) {
  const now = deps.now ?? Date.now
  const attempts = createRateLimit({ max: ATTEMPTS_PER_WINDOW, windowMs: ATTEMPT_WINDOW_MS, now })

  async function course(login: string): Promise<GitCourse> {
    const [seat, stars, gates] = await Promise.all([
      deps.seatOf(login),
      deps.progress.stars(login),
      deps.gates.states(login),
    ])

    return { seat, stars, gates }
  }

  async function seated(login: string): Promise<GitCourse> {
    const current = await course(login)

    if (current.seat === null) {
      throw domainError('forbidden', 'El curso de git se juega desde un ordenador del clúster')
    }

    return current
  }

  return {
    course: (actor: Actor) => course(actor.login),
    ...gateActions({ gates: deps.gates, seated, course }),

    async attempt(actor: Actor, id: string, input: unknown): Promise<GitAttemptResult> {
      const index = LEVELS.findIndex((level) => level.id === id)
      const level = LEVELS[index]

      if (level === undefined) throw domainError('not_found', 'Ese punto del camino no existe')

      const { lines, activeSeconds } = parse(attemptSchema, input)

      if (!attempts.hit(actor.login))
        throw domainError('rate_limited', 'Demasiados intentos seguidos: espera unos minutos')

      const before = await seated(actor.login)

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
        if (activeSeconds !== undefined) {
          await deps.times?.record({
            login: actor.login,
            course: 'git',
            unit: level.id,
            activeSeconds,
            estimateSeconds: estimateOfLevel(level),
            stars: result.stars,
            first: before.stars[level.id] === undefined,
            at: new Date(now()).toISOString(),
          })
        }
      }

      return {
        done: result.done,
        stars: result.stars,
        commands: result.commands,
        misses: result.misses.map((miss) => miss.name),
        course: await course(actor.login),
      }
    },
  }
}

/** El test previo a una prueba de grupo: empezar y contestar (desde un puesto, como todo). */
function gateActions(service: {
  gates: GateService
  seated: (login: string) => Promise<GitCourse>
  course: (login: string) => Promise<GitCourse>
}) {
  return {
    async startGate(actor: Actor, id: string): Promise<GitGateQuiz> {
      const current = await service.seated(actor.login)

      return service.gates.start(actor.login, id, current.stars, actor.lang)
    },

    async answerGate(actor: Actor, id: string, input: unknown): Promise<GitGateResult> {
      await service.seated(actor.login)

      const result = await service.gates.answer(actor.login, id, input, actor.lang)

      return { ...result, course: await service.course(actor.login) }
    },
  }
}

export type GitCourseService = ReturnType<typeof createGitCourseService>
