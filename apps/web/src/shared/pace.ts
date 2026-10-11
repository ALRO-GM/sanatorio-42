/**
 * Tiempo límite de cada círculo según el *pace*.
 *
 * El *pace* es el ritmo al que alguien se compromete a ir: los meses en los que
 * prevé acabar el common core. Cada ritmo fija cuántos días hay para completar
 * cada círculo (cada *milestone*), contados desde el día cero de esa persona.
 *
 * El pace no es fijo: es el más rápido cuyo plazo todavía cumples. Si se te pasa
 * el plazo de tu pace para el círculo en el que estás, caes al siguiente más
 * lento; si se te pasa el del más lento, te alcanza el black hole. Y al revés:
 * quien termina un círculo antes del plazo de un pace más rápido, sube a él.
 *
 * El día cero no es el día en que se empezó el 42cursus: 42 lo va retrasando
 * con los días de bonus, y no publica en su API ni esos días ni el pace. Por
 * eso cada persona anota el pace y el *Milestone Deadline* que ve en su perfil
 * de la intra, y de ese plazo real se deduce el día cero (`originOf`).
 */

export const PACES = [8, 12, 15, 18, 22, 24] as const

export type Pace = (typeof PACES)[number]

/** `DAYS[pace][n]`: días desde el inicio del cursus para completar el círculo `n`. */
const DAYS: Record<Pace, readonly number[]> = {
  8: [8, 32, 54, 90, 141, 212, 244],
  12: [13, 48, 81, 134, 211, 318, 365],
  15: [18, 60, 101, 168, 264, 398, 457],
  18: [24, 72, 121, 201, 316, 478, 548],
  22: [30, 88, 148, 246, 387, 584, 670],
  24: [45, 118, 178, 306, 447, 644, 730],
}

const DAY_MS = 24 * 60 * 60_000
const STORAGE_KEY = 'sanatorio_pace'

export function loadPace(): Pace | null {
  const stored = Number(localStorage.getItem(STORAGE_KEY))

  return PACES.find((pace) => pace === stored) ?? null
}

export function savePace(pace: Pace | null): void {
  if (pace === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, String(pace))
  }
}

/**
 * El día cero de alguien, en milisegundos: el plazo que anotó menos los días
 * que la tabla da a ese pace para ese círculo. `null` si el pace no existe.
 *
 * Cae a mediodía, hora local: así un cambio de hora no mueve ninguna fecha de
 * día.
 */
export function originOf(ref: { pace: number; circle: number; deadline: string }): number | null {
  const pace = PACES.find((option) => option === ref.pace)
  const days = pace === undefined ? undefined : DAYS[pace][ref.circle]
  const deadline = Date.parse(`${ref.deadline}T12:00:00`)

  return days === undefined || Number.isNaN(deadline) ? null : deadline - days * DAY_MS
}

/** Un plazo vale hasta que acaba su día: las fechas están a mediodía. */
const HALF_DAY_MS = DAY_MS / 2

function daysLeft(date: number, now: number): number {
  return Math.floor((date + HALF_DAY_MS - now) / DAY_MS)
}

export type Deadline = {
  circle: number
  /** El último día para completar ese círculo. */
  date: Date
  /** Días que faltan (negativo si ya ha pasado). */
  daysLeft: number
}

/** La fecha límite de cada círculo, del 0 al 6, a ese pace y desde ese día cero. */
export function deadlinesFor(origin: number, pace: Pace, now = Date.now()): Deadline[] {
  return DAYS[pace].map((days, circle) => {
    const date = origin + days * DAY_MS

    return { circle, date: new Date(date), daysLeft: daysLeft(date, now) }
  })
}

/** El pace más lento: pasarse de su plazo es el black hole. */
export const SLOWEST: Pace = 24

/**
 * El pace en el que queda quien completa `circle` en la fecha `at`: el más
 * rápido cuyo plazo aún no ha pasado. `null` si se ha pasado hasta el del más
 * lento, es decir, black hole.
 */
export function paceOn(origin: number, circle: number, at: number): Pace | null {
  return (
    PACES.find((pace) => at <= origin + (DAYS[pace][circle] ?? 0) * DAY_MS + HALF_DAY_MS) ?? null
  )
}

export type PaceStep = {
  pace: Pace
  /** El último día para completar el círculo y quedarse en ese pace. */
  date: Date
  /** Días que faltan (negativo si ya ha pasado). */
  daysLeft: number
}

/**
 * El plazo de cada pace para un mismo círculo, del más rápido al más lento.
 * Leído en orden es el calendario de caídas: pasada cada fecha se cae al pace
 * siguiente, y pasada la última, al black hole.
 */
export function stepsFor(origin: number, circle: number, now = Date.now()): PaceStep[] {
  return PACES.map((pace) => {
    const date = origin + (DAYS[pace][circle] ?? 0) * DAY_MS

    return { pace, date: new Date(date), daysLeft: daysLeft(date, now) }
  })
}

/** Días enteros entre dos momentos. */
export function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / DAY_MS)
}
