/**
 * El ritmo de cada cual en el common core, según el sistema de pace de 42
 * (#79 del buzón): no cuenta proyectos, sino qué parte del plazo del curso
 * llevas y a qué velocidad lo has hecho.
 *
 * - **Progreso**: la parte del curso que suma el último círculo completado,
 *   medida con los plazos del pace más lento (24 meses, 730 días). Completar el
 *   círculo 3 son 306 de 730 días: un 42 %.
 * - **Pace**: el más rápido cuyo plazo para ese círculo habrías cumplido con lo
 *   que tardaste desde que empezaste. Más de 24 meses, `null`.
 *
 * La tabla es la misma que usa la web para el estado de salud
 * (`apps/web/src/shared/pace.ts`): si cambia allí, cambia aquí.
 */

const PACES = [8, 12, 15, 18, 22, 24] as const

/** `DAYS[pace][n]`: días desde el inicio para completar el círculo `n`. */
const DAYS: Record<(typeof PACES)[number], readonly number[]> = {
  8: [8, 32, 54, 90, 141, 212, 244],
  12: [13, 48, 81, 134, 211, 318, 365],
  15: [18, 60, 101, 168, 264, 398, 457],
  18: [24, 72, 121, 201, 316, 478, 548],
  22: [30, 88, 148, 246, 387, 584, 670],
  24: [45, 118, 178, 306, 447, 644, 730],
}
const COURSE_DAYS = 730
const DAY_MS = 86_400_000

type Pace = { progress: number; pace: number | null }

/**
 * El ritmo de alguien que empezó en `startedAt` y completó los círculos en las
 * fechas de `milestones` (`milestones[n]`, el círculo `n`). `null` si no ha
 * completado ninguno o las fechas no valen.
 */
export function paceOf(startedAt: string, milestones: readonly string[]): Pace | null {
  const last = Math.min(milestones.length, DAYS[24].length) - 1
  const done = Date.parse(milestones[last] ?? '')
  const start = Date.parse(startedAt)

  if (last < 0 || Number.isNaN(done) || Number.isNaN(start) || done < start) return null

  const took = (done - start) / DAY_MS

  return {
    progress: Math.round(((DAYS[24][last] ?? 0) / COURSE_DAYS) * 100),
    pace: PACES.find((pace) => (DAYS[pace][last] ?? 0) >= took) ?? null,
  }
}
