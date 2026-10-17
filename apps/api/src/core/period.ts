/**
 * Periodo de un límite que se renueva cada mes (el tráfico del alojamiento, la
 * cuota de una API). Días en UTC.
 */

const DAY = 24 * 60 * 60_000

type Period = {
  /** Cuándo se renovó el límite por última vez, y cuándo vuelve a hacerlo. */
  start: number
  end: number
  /** Días que quedan hasta que se renueve, contando hoy. */
  daysLeft: number
}

/** El periodo en curso, si el límite se renueva el día `renewDay` de cada mes. */
export function periodOf(at: number, renewDay: number): Period {
  const date = new Date(at)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() - (date.getUTCDate() < renewDay ? 1 : 0)
  const start = Date.UTC(year, month, renewDay)
  const end = Date.UTC(year, month + 1, renewDay)
  const today = Date.UTC(year, date.getUTCMonth(), date.getUTCDate())

  return { start, end, daysLeft: Math.max(1, Math.round((end - today) / DAY)) }
}
