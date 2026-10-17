/**
 * Estadísticas de exámenes y de la duración de los círculos de un campus. Se
 * calculan con lo que ya está copiado; no se pide nada a 42 al preguntar.
 */

import type { ExamStats } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import type { ExamsRepository } from './exams.repository.js'
import { circleDurations, examStat } from './exams.rules.js'
import type { ExamsSync } from './exams.sync.js'

export type ExamsServiceOptions = {
  exams: ExamsRepository
  sync: Pick<ExamsSync, 'progress'>
}

export function createExamsService({ exams, sync }: ExamsServiceOptions) {
  return {
    /** Las del campus que mira quien pregunta. Solo exámenes que alguien ha hecho. */
    async stats(actor: Actor): Promise<ExamStats> {
      const [projects, attempts, occurrences, milestones, backfill] = await Promise.all([
        exams.exams(),
        exams.attempts(actor.campusId),
        exams.occurrences(actor.campusId),
        exams.milestones(actor.campusId),
        sync.progress(),
      ])

      return {
        exams: projects
          .map((project) => examStat(project, attempts, occurrences))
          .filter((stat) => stat.people > 0),
        circles: circleDurations(milestones),
        backfill,
      }
    },
  }
}

export type ExamsService = ReturnType<typeof createExamsService>
