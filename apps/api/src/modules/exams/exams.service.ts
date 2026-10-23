/**
 * Estadísticas de exámenes, de la duración de los círculos y del black hole de
 * un campus, por plan (C o Python) y por kickoff (#81 del buzón). Se calculan
 * con lo que ya está copiado; no se pide nada a 42 al preguntar.
 *
 * Mirar a todo el campus cuesta (todos sus proyectos del common core), así que
 * lo leído se guarda un rato por campus y cada filtro se calcula encima.
 */

import type { ExamQuery, ExamStats } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { parse } from '../../core/validation.js'
import type { Curriculum } from '../replica/index.js'
import type { ExamsRepository } from './exams.repository.js'
import type { AttemptRow, ExamPerson, OccurrenceRow } from './exams.rules.js'
import {
  blackHoleStats,
  circleDurations,
  examPeople,
  examStat,
  kickoffRows,
  kickoffsOf,
  selectPeople,
} from './exams.rules.js'
import type { ExamsSync } from './exams.sync.js'
import { createTtlCache } from '../../core/ttl-cache.js'

type ExamsServiceOptions = {
  exams: ExamsRepository
  sync: Pick<ExamsSync, 'progress'>
  curriculum: Pick<Curriculum, 'circles'>
  now?: () => number
}

/** Lo mismo que el `max-age` de la respuesta: más fresco no se vería. */
const CACHE_MS = 5 * 60_000

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const querySchema = z.object({
  track: z.enum(['all', 'classic', 'next']).default('all'),
  kickoffs: z
    .string()
    .max(400, 'kickoffs: demasiadas')
    .optional()
    .transform((value) => (value === undefined || value === '' ? [] : value.split(',')))
    .refine((list) => list.every((month) => MONTH.test(month)), 'kickoffs: meses AAAA-MM'),
})

/** Lo leído de un campus: su gente, sus exámenes y sus intentos. */
type Snapshot = {
  at: number
  projects: { id: number; name: string; slug: string }[]
  attempts: AttemptRow[]
  occurrences: OccurrenceRow[]
  people: ExamPerson[]
}

export function createExamsService({
  exams,
  sync,
  curriculum,
  now = Date.now,
}: ExamsServiceOptions) {
  // Un agregado por campus que cambia despacio: dos visitas a la vez comparten
  // la misma carga en vez de lanzar dos.
  const snapshots = createTtlCache<Snapshot>({ ttlMs: CACHE_MS, maxEntries: 50, now })

  const snapshot = (campusId: number): Promise<Snapshot> =>
    snapshots.get(String(campusId), () => build(campusId))

  async function build(campusId: number): Promise<Snapshot> {
    const [classic, next] = await Promise.all([
      curriculum.circles('classic'),
      curriculum.circles('next'),
    ])
    const [projects, attempts, occurrences, members, rows] = await Promise.all([
      exams.exams(),
      exams.attempts(campusId),
      exams.occurrences(campusId),
      exams.members(campusId),
      exams.planRows(campusId, [...new Set([...classic.keys(), ...next.keys()])]),
    ])
    const examUsers = new Set([...attempts, ...occurrences].map((row) => row.userId))
    return {
      at: now(),
      projects,
      attempts,
      occurrences,
      people: examPeople({ members, rows, circles: { classic, next }, examUsers }),
    }
  }

  return {
    /**
     * Las del campus que mira quien pregunta, de la gente de ese plan y esas
     * kickoffs (sin elegir, todas). Solo exámenes que alguien ha hecho.
     */
    async stats(actor: Actor, input: unknown = {}): Promise<ExamStats> {
      const query: ExamQuery = parse(querySchema, input)
      const [data, backfill] = await Promise.all([snapshot(actor.campusId), sync.progress()])
      const t = now()
      const chosen = selectPeople(data.people, query)
      const ids = new Set(chosen.map((person) => person.userId))
      const attempts = data.attempts.filter((row) => ids.has(row.userId))
      const occurrences = data.occurrences.filter((row) => ids.has(row.userId))
      const stats = data.projects
        .map((project) => examStat(project, attempts, occurrences))
        .filter((stat) => stat.people > 0)
      // Para comparar kickoffs vale el plan elegido, pero no el filtro de kickoffs.
      const byTrack = selectPeople(data.people, { track: query.track, kickoffs: [] })

      return {
        exams: stats,
        circles: circleDurations(
          chosen.flatMap((person) =>
            person.ranks === null
              ? []
              : [
                  {
                    begin: person.start === null ? null : new Date(person.start).toISOString(),
                    ranks: person.ranks,
                  },
                ],
          ),
        ),
        backfill,
        query,
        people: chosen.length,
        kickoffs: kickoffsOf(data.people),
        byKickoff: kickoffRows({
          people: byTrack,
          chosen: query.kickoffs,
          exams: stats.map((stat) => ({ id: stat.projectId })),
          attempts: data.attempts,
          occurrences: data.occurrences,
          now: t,
        }),
        blackHole: blackHoleStats(chosen, t),
      }
    },
  }
}

export type ExamsService = ReturnType<typeof createExamsService>
