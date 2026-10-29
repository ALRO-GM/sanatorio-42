/**
 * La primera capa del Avance (reorganización del 2026-10-29, «datos rápidos y a
 * fondo»): la respuesta en una frase, antes de la gráfica. ¿Cómo voy frente a la
 * media de mi campus? Se compara tu último punto con el día en que la media de
 * tu campus (tu plan, la gente que sigue más la que terminó) llega a lo mismo.
 */

import type { CoreTrack, StatsProgress } from '@sanatorio/contracts'

const WEEK = 7
const MONTH = 30.44

export type ProgressAnswer =
  /** Terminaste: en cuántos meses y en cuántos termina la media (si llega). */
  | { kind: 'finished'; months: number; average: number | null }
  /** Por delante o por detrás de la media, en semanas. */
  | { kind: 'ahead' | 'behind'; weeks: number }
  /** A la par (menos de una semana de diferencia). */
  | { kind: 'even' }
  /** La media no llega a donde estás en lo que se ve: por delante de todo. */
  | { kind: 'beyond' }

/** El último punto con valor de una línea: su posición y su valor. */
function lastPoint(line: readonly (number | null)[]): { index: number; value: number } | null {
  for (let index = line.length - 1; index >= 0; index--) {
    const value = line[index]

    if (value !== null && value !== undefined) return { index, value }
  }

  return null
}

/**
 * La respuesta para quien mira, o `null` si no hay con qué compararse (sin
 * línea propia, sin media de su campus o sin haber aprobado nada aún).
 */
export function progressAnswer(
  data: StatsProgress,
  track: CoreTrack | null,
): ProgressAnswer | null {
  const plan = track ?? data.track ?? 'classic'
  const area = data.campuses.find((campus) => campus.id === data.home) ?? data.campuses[0]
  const average = area?.averages.circles.current[plan]
  const mine = data.me?.line.circles

  if (data.me === null || mine === undefined || average === undefined) return null

  const reaches = (value: number): number | null => {
    const index = average.findIndex((point) => point !== null && point >= value)

    return index === -1 ? null : (data.days[index] ?? null)
  }

  if (data.me.finished !== null) {
    const day = reaches(100)

    return {
      kind: 'finished',
      months: Math.round(data.me.finished / MONTH),
      average: day === null ? null : Math.round(day / MONTH),
    }
  }

  const last = lastPoint(mine)

  if (last === null || last.value <= 0) return null

  const day = data.days[last.index] ?? 0
  const theirs = reaches(last.value)

  if (theirs === null) return { kind: 'beyond' }

  const weeks = Math.round(Math.abs(theirs - day) / WEEK)

  if (weeks === 0) return { kind: 'even' }

  return { kind: theirs > day ? 'ahead' : 'behind', weeks }
}
