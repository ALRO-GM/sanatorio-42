/**
 * Días y horas tal como los escribe la web, siempre en la hora del navegador.
 * Un día es `YYYY-MM-DD` (la clave de cada casilla de los calendarios) y una
 * hora, `HH:MM`.
 */

/** `7` → `07`. */
export const pad2 = (value: number): string => String(value).padStart(2, '0')

/** `2026-10-10`. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Hoy, como `YYYY-MM-DD`. Con `now` (milisegundos), el día de ese momento. */
export function todayKey(now = Date.now()): string {
  return dayKey(new Date(now))
}

/** `17:30`, la hora de un instante ISO. */
export function hhmm(iso: string): string {
  const date = new Date(iso)

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** `570` minutos → `09:30`. */
export function clockOf(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
}
