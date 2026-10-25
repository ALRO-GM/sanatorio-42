/**
 * Los textos de lo que se elige en la agenda (`docs/agenda.md`): checkpoints,
 * atascos, salidas y cómo fue. Las claves vienen de la API (listas cerradas);
 * aquí solo se les pone el texto. Lo usan la agenda y el tablero del sprint,
 * así que vive en `shared/`.
 */

import type {
  AgendaCheckpoint,
  AgendaOutcome,
  AgendaProblem,
  AgendaSolution,
} from '@sanatorio/contracts'

import type { Translate, TranslateCount } from '../i18n'

export const checkpointText = (t: Translate, checkpoint: AgendaCheckpoint): string =>
  checkpoint.key === null ? (checkpoint.text ?? '') : t(`scrum.check.${checkpoint.key}`)

/** El atasco, con su texto si es «Otro». */
export const problemText = (t: Translate, problem: AgendaProblem, other: string | null): string =>
  problem === 'other' && other !== null ? other : t(`scrum.problem.${problem}`)

/** La salida, con su texto si es «Otro». */
export const solutionText = (
  t: Translate,
  solution: AgendaSolution,
  other: string | null,
): string => (solution === 'other' && other !== null ? other : t(`scrum.solution.${solution}`))

export const outcomeText = (t: Translate, outcome: AgendaOutcome | null): string =>
  t(`scrum.outcome.${outcome ?? 'open'}`)

/** Días de `from` a `to` (`YYYY-MM-DD`); negativo si `to` ya pasó. */
function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

/** «Quedan 4 días», «Es hoy» o «Se pasó hace 2 días». */
export function dueText(t: Translate, tn: TranslateCount, today: string, target: string): string {
  const left = daysUntil(today, target)

  if (left === 0) return t('scrum.due.today')

  return left > 0 ? tn('scrum.due.left', left) : tn('scrum.due.late', -left)
}
