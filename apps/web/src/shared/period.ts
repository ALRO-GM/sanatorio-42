/**
 * El periodo de toda la web: último mes, 3, 6, 12 o 24 meses, todo, o unas
 * fechas a mano. Lo elige `PeriodPicker` (`shared/ui/PeriodPicker.tsx`).
 */

/** En el orden del selector: de menos a más y, al final, a mano. */
export const PERIODS = ['1', '3', '6', '12', '24', 'all', 'custom'] as const

export type Period = (typeof PERIODS)[number]

/** Un periodo que no es «a mano»: se sabe desde cuándo cuenta sin preguntar. */
type PresetPeriod = Exclude<Period, 'custom'>

/** Meses que abarca; `null` es «todo». */
function monthsOf(period: PresetPeriod): number | null {
  return period === 'all' ? null : Number(period)
}

/** `YYYY-MM-DD` de un instante, en UTC: es como filtra la API. */
export function dayOf(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

/** El instante de hoy menos esos meses de calendario; `null` es sin límite. */
function shifted(period: PresetPeriod, now: number): number | null {
  const months = monthsOf(period)

  if (months === null) return null
  const start = new Date(now)

  start.setUTCMonth(start.getUTCMonth() - months)

  return start.getTime()
}

/** Desde qué día cuenta. `null` es sin límite. */
export function startOf(period: PresetPeriod, now = Date.now()): string | null {
  const start = shifted(period, now)

  return start === null ? null : dayOf(start)
}

/** Días que abarca, para las API que cuentan en días; `null` es «todo». */
export function daysOf(period: PresetPeriod, now = Date.now()): number | null {
  const start = shifted(period, now)

  return start === null ? null : Math.round((now - start) / 86_400_000)
}

/** Un periodo guardado o de un enlace, también con los nombres viejos (`month`, `year`…). */
export function periodOf(value: unknown): Period | null {
  const legacy: Record<string, Period> = { month: '1', quarter: '3', year: '12' }
  const text = String(value)

  return PERIODS.find((period) => period === text) ?? legacy[text] ?? null
}
