/**
 * Curso de shell: el camino de unidades, jefes y jefes finales. La web juega
 * cada prueba con la shell simulada y manda las órdenes que escribiste; aquí
 * se vuelven a ejecutar con el mismo motor antes de dar el punto, y las
 * estrellas las calcula la API. En los contrarrelojes el tiempo también es de
 * la API: apunta la hora al empezar y mide al corregir.
 *
 * A diferencia del de git, no exige estar en un puesto del clúster: no hay
 * pruebas de grupo y la trampa obvia (decir «hecho» o «tardé poco») ya no
 * sirve, porque la API rehace el intento y cronometra ella.
 */

import type {
  CourseBest,
  CourseCertificate,
  CourseRun,
  CourseStars,
  CourseTier,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from '@sanatorio/contracts'
import { checkAttempt, estimateOf, FINALS, LIMITS, TIERS, UNITS } from '@sanatorio/shellsim'
import type { Stars } from '@sanatorio/course'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { isoAt as iso } from '../../core/time.js'
import { parse } from '../../core/validation.js'
import { activeSecondsSchema } from './course-times.js'
import type { CourseTimes } from './course-times.js'

/**
 * Un curso que se juega en una terminal simulada y se corrige volviendo a
 * ejecutar las órdenes: el de shell, el de Docker (`modules/dockercourse`) y
 * el de Kubernetes (`modules/k8scourse`) comparten este servicio; cada uno
 * trae su motor y sus tablas. También el de RAG (`modules/ragcourse`), que no
 * es de terminal: sus «órdenes» son las comprobaciones de un banco de pruebas.
 */
export type TerminalCourse<U extends { id: string; limit?: number }> = {
  /** Cómo se llama en `course_times`. */
  name: 'shell' | 'docker' | 'k8s' | 'rag'
  units: readonly U[]
  finals: Record<CourseTier, string>
  tiers: readonly CourseTier[]
  limits: { entry: number; attemptEntries: number }
  checkAttempt: (
    unit: U,
    entries: readonly string[],
    seconds?: number,
  ) => { done: boolean; stars: Stars | 0; commands: number; misses: string[] }
  estimateOf: (unit: U) => number
}

const SHELL: TerminalCourse<(typeof UNITS)[number]> = {
  name: 'shell',
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  limits: LIMITS,
  checkAttempt,
  estimateOf,
}

// Los mismos topes que la terminal: la API vuelve a ejecutar cada orden.
const attemptSchemaOf = (limits: { entry: number; attemptEntries: number }) =>
  z.object({
    entries: z.array(z.string().max(limits.entry)).max(limits.attemptEntries),
    activeSeconds: activeSecondsSchema,
  })

/**
 * Intentos por persona: la web manda uno al llegar al objetivo, así que 30
 * en diez minutos es repetir mucho. Más es un guion, y cada intento vuelve a
 * ejecutar hasta 300 órdenes.
 */
const ATTEMPTS_PER_WINDOW = 30
const ATTEMPT_WINDOW_MS = 10 * 60_000
/** Empezar un contrarreloj: 20 en diez minutos (cada vez se pone el reloj a cero). */
const STARTS_PER_WINDOW = 20
/** Margen del contrarreloj por lo que tarda la red en llevar el intento. */
const GRACE_S = 5

/** Las tablas de cada curso (las de shell, de la migración 74; las de Docker, de la 87; las de Kubernetes, de la 88; las de RAG, de la 92). */
type Tables = {
  progress: 'shell_progress' | 'docker_progress' | 'k8s_progress' | 'rag_progress'
  runs: 'shell_runs' | 'docker_runs' | 'k8s_runs' | 'rag_runs'
}

export function createShellCourseRepository(
  db: Db,
  tables: Tables = { progress: 'shell_progress', runs: 'shell_runs' },
) {
  return {
    async progress(login: string): Promise<{
      stars: Record<string, CourseStars>
      best: Record<string, CourseBest>
      at: Record<string, string>
    }> {
      const result = await db.execute({
        sql: `SELECT unit, stars, commands, seconds, done_at FROM ${tables.progress} WHERE login = ?`,
        args: [login],
      })
      const stars: Record<string, CourseStars> = {}
      const best: Record<string, CourseBest> = {}
      const at: Record<string, string> = {}

      for (const row of result.rows) {
        const unit = toText(row.unit)

        stars[unit] = toNumber(row.stars) as CourseStars
        best[unit] = {
          commands: toNumber(row.commands),
          seconds: row.seconds === null ? null : toNumber(row.seconds),
        }
        at[unit] = toText(row.done_at)
      }

      return { stars, best, at }
    },

    /** Guarda el punto; si ya estaba, se queda lo mejor de cada cosa. */
    async save(
      login: string,
      unit: string,
      stars: CourseStars,
      commands: number,
      seconds: number | null,
      at: string,
    ): Promise<void> {
      await db.execute({
        sql: `INSERT INTO ${tables.progress} (login, unit, stars, commands, seconds, done_at) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (login, unit) DO UPDATE SET
                stars = MAX(stars, excluded.stars),
                commands = MIN(commands, excluded.commands),
                seconds = CASE WHEN seconds IS NULL THEN excluded.seconds
                               WHEN excluded.seconds IS NULL THEN seconds
                               ELSE MIN(seconds, excluded.seconds) END`,
        args: [login, unit, stars, commands, seconds, at],
      })
    },

    async runs(login: string): Promise<Record<string, string>> {
      const result = await db.execute({
        sql: `SELECT unit, started_at FROM ${tables.runs} WHERE login = ?`,
        args: [login],
      })

      return Object.fromEntries(
        result.rows.map((row) => [toText(row.unit), toText(row.started_at)]),
      )
    },

    async startRun(login: string, unit: string, at: string): Promise<void> {
      await db.execute({
        sql: `INSERT INTO ${tables.runs} (login, unit, started_at) VALUES (?, ?, ?)
              ON CONFLICT (login, unit) DO UPDATE SET started_at = excluded.started_at`,
        args: [login, unit, at],
      })
    },

    async endRun(login: string, unit: string): Promise<void> {
      await db.execute({
        sql: `DELETE FROM ${tables.runs} WHERE login = ? AND unit = ?`,
        args: [login, unit],
      })
    },
  }
}

type ShellCourseRepository = ReturnType<typeof createShellCourseRepository>

export function createShellCourseService<
  U extends { id: string; limit?: number } = (typeof UNITS)[number],
>(deps: {
  progress: ShellCourseRepository
  /** Dónde se apunta el tiempo activo de cada punto superado. */
  times?: CourseTimes
  now?: () => number
  /** El curso (de fábrica, el de shell). */
  course?: TerminalCourse<U>
}) {
  const engine = (deps.course ?? SHELL) as unknown as TerminalCourse<U>
  const UNITS = engine.units
  const TIERS = engine.tiers
  const FINALS = engine.finals
  const attemptSchema = attemptSchemaOf(engine.limits)
  const now = deps.now ?? Date.now
  const attempts = createRateLimit({ max: ATTEMPTS_PER_WINDOW, windowMs: ATTEMPT_WINDOW_MS, now })
  const starts = createRateLimit({ max: STARTS_PER_WINDOW, windowMs: ATTEMPT_WINDOW_MS, now })

  function unitAt(id: string) {
    const index = UNITS.findIndex((unit) => unit.id === id)
    const unit = UNITS[index]

    if (unit === undefined) throw domainError('not_found', 'Ese punto del curso no existe')

    return { unit, previous: UNITS[index - 1] }
  }

  async function course(login: string): Promise<ShellCourse> {
    const [{ stars, best, at }, started] = await Promise.all([
      deps.progress.progress(login),
      deps.progress.runs(login),
    ])
    const runs: Record<string, CourseRun> = {}

    for (const [id, startedAt] of Object.entries(started)) {
      const unit = UNITS.find((each) => each.id === id)

      if (unit?.limit === undefined) continue

      const deadline = Date.parse(startedAt) + unit.limit * 1000

      // Los que ya se pasaron de tiempo no se enseñan: hay que volver a empezar.
      if (deadline > now()) runs[id] = { startedAt, deadline: iso(deadline) }
    }

    const certificates: CourseCertificate[] = TIERS.flatMap((tier) => {
      const id = FINALS[tier]
      const got = stars[id]

      return got === undefined
        ? []
        : [{ tier, stars: got, seconds: best[id]?.seconds ?? 0, at: at[id] ?? '' }]
    })

    return { stars, best, runs, certificates }
  }

  async function unlocked(login: string, previous: { id: string } | undefined): Promise<void> {
    if (previous === undefined) return

    const { stars } = await deps.progress.progress(login)

    if (stars[previous.id] === undefined)
      throw domainError('conflict', 'Antes tienes que superar el punto anterior')
  }

  return {
    course: (actor: Actor) => course(actor.login),

    async startBoss(actor: Actor, id: string): Promise<ShellBossStart> {
      const { unit, previous } = unitAt(id)

      if (unit.limit === undefined)
        throw domainError('invalid_input', 'Ese punto no es un contrarreloj')
      await unlocked(actor.login, previous)
      if (!starts.hit(actor.login))
        throw domainError('rate_limited', 'Demasiados intentos seguidos: espera unos minutos')

      const at = now()

      await deps.progress.startRun(actor.login, unit.id, iso(at))

      return {
        unit: unit.id,
        run: { startedAt: iso(at), deadline: iso(at + unit.limit * 1000) },
        course: await course(actor.login),
      }
    },

    async attempt(actor: Actor, id: string, input: unknown): Promise<ShellAttemptResult> {
      const { unit, previous } = unitAt(id)
      const { entries, activeSeconds } = parse(attemptSchema, input)

      if (!attempts.hit(actor.login))
        throw domainError('rate_limited', 'Demasiados intentos seguidos: espera unos minutos')
      await unlocked(actor.login, previous)

      let seconds: number | null = null

      if (unit.limit !== undefined) {
        const started = (await deps.progress.runs(actor.login))[unit.id]

        if (started === undefined) throw domainError('conflict', 'Primero empieza el contrarreloj')
        seconds = Math.max(0, Math.round((now() - Date.parse(started)) / 1000))
        // Lo que tarda la red en traer el intento no cuenta en contra.
        if (seconds > unit.limit && seconds <= unit.limit + GRACE_S) seconds = unit.limit
      }

      const result = engine.checkAttempt(unit, entries, seconds ?? undefined)

      if (result.done && result.stars > 0) {
        const first = (await deps.progress.progress(actor.login)).stars[unit.id] === undefined

        await deps.progress.save(
          actor.login,
          unit.id,
          result.stars as CourseStars,
          result.commands,
          seconds,
          iso(now()),
        )
        if (unit.limit !== undefined) await deps.progress.endRun(actor.login, unit.id)
        if (activeSeconds !== undefined) {
          await deps.times?.record({
            login: actor.login,
            course: engine.name,
            unit: unit.id,
            activeSeconds,
            estimateSeconds: engine.estimateOf(unit),
            stars: result.stars,
            first,
            at: iso(now()),
          })
        }
      }

      return {
        done: result.done,
        stars: result.stars,
        commands: result.commands,
        seconds,
        misses: result.misses,
        course: await course(actor.login),
      }
    },
  }
}

export type ShellCourseService = ReturnType<typeof createShellCourseService>
