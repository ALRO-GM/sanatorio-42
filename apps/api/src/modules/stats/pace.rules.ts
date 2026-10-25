/**
 * Los plazos del sistema de pace de 42 (#79 del buzón): a cuántos días del
 * inicio hay que tener completo cada círculo con cada pace. Son las líneas de
 * los paces del Avance.
 *
 * La tabla es la misma que usa la web para el estado de salud
 * (`apps/web/src/shared/pace.ts`): si cambia allí, cambia aquí.
 */

export const PACES = [8, 12, 15, 18, 22, 24] as const

/** `DAYS[pace][n]`: días desde el inicio para completar el círculo `n`. */
export const DAYS: Record<(typeof PACES)[number], readonly number[]> = {
  8: [8, 32, 54, 90, 141, 212, 244],
  12: [13, 48, 81, 134, 211, 318, 365],
  15: [18, 60, 101, 168, 264, 398, 457],
  18: [24, 72, 121, 201, 316, 478, 548],
  22: [30, 88, 148, 246, 387, 584, 670],
  24: [45, 118, 178, 306, 447, 644, 730],
}
export const COURSE_DAYS = 730
