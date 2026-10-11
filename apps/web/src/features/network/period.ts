/**
 * Periodos del filtro de fechas de la red de correcciones.
 */

export const PERIODS = ['all', 'month', 'quarter', 'year', 'custom'] as const

export type Period = (typeof PERIODS)[number]

const DAY_MS = 24 * 60 * 60_000

/** `YYYY-MM-DD` de un instante, en UTC: es como filtra la API. */
export function dayOf(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

/** Desde cuándo cuenta un periodo. `null` es sin límite. */
export function startOf(period: Exclude<Period, 'custom'>, now = Date.now()): string | null {
  switch (period) {
    case 'all':
      return null
    case 'month':
      return dayOf(now - 30 * DAY_MS)
    case 'quarter':
      return dayOf(now - 91 * DAY_MS)
    case 'year':
      return dayOf(now - 365 * DAY_MS)
  }
}
