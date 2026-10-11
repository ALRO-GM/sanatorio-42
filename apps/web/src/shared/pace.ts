/**
 * Tiempo límite de cada círculo según el *pace*.
 *
 * El *pace* es el ritmo al que alguien se compromete a ir: los meses en los que
 * prevé acabar el common core. Cada ritmo fija cuántos días, contados desde que
 * se empieza el 42cursus, hay para completar cada círculo (cada *milestone*).
 *
 * El pace no es fijo: es el más rápido cuyo plazo todavía cumples. Si se te pasa
 * el plazo de tu pace para el círculo en el que estás, caes al siguiente más
 * lento; si se te pasa el del más lento, te alcanza el black hole. Y al revés:
 * quien termina un círculo antes del plazo de un pace más rápido, sube a él.
 *
 * 42 no publica en su API qué pace lleva cada persona: se deduce de cuándo
 * completó cada círculo (`paceOn`), o se elige a mano en el grafo.
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

export type Deadline = {
  circle: number
  /** El último día para completar ese círculo. */
  date: Date
  /** Días que faltan (negativo si ya ha pasado). */
  daysLeft: number
}

/** La fecha límite de cada círculo, del 0 al 6, para quien empezó en `startedAt` con ese pace. */
export function deadlinesFor(startedAt: string, pace: Pace, now = Date.now()): Deadline[] {
  const start = Date.parse(startedAt)

  return DAYS[pace].map((days, circle) => {
    const date = new Date(start + days * DAY_MS)

    return { circle, date, daysLeft: Math.ceil((date.getTime() - now) / DAY_MS) }
  })
}

/** El pace más lento: pasarse de su plazo es el black hole. */
export const SLOWEST: Pace = 24

/**
 * El pace en el que queda quien completa `circle` en la fecha `at`: el más
 * rápido cuyo plazo aún no ha pasado. `null` si se ha pasado hasta el del más
 * lento, es decir, black hole.
 */
export function paceOn(startedAt: string, circle: number, at: number, extraDays = 0): Pace | null {
  const start = Date.parse(startedAt) + extraDays * DAY_MS

  return PACES.find((pace) => at <= start + (DAYS[pace][circle] ?? 0) * DAY_MS) ?? null
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
 *
 * `extraDays` son los días que 42 ha añadido a esa persona (bonus,
 * compensación o *freeze*, que para el reloj): retrasan todos los plazos.
 */
export function stepsFor(
  startedAt: string,
  circle: number,
  now = Date.now(),
  extraDays = 0,
): PaceStep[] {
  const start = Date.parse(startedAt) + extraDays * DAY_MS

  return PACES.map((pace) => {
    const date = new Date(start + (DAYS[pace][circle] ?? 0) * DAY_MS)

    return { pace, date, daysLeft: Math.ceil((date.getTime() - now) / DAY_MS) }
  })
}

/** Días enteros entre dos momentos. */
export function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / DAY_MS)
}
