/**
 * Code Clicker: el historial de capital y los saltos raros.
 *
 * El capital es todo lo que vale una partida: las líneas sin gastar, lo que
 * costó lo que se tiene y lo que deben los bugs. Comprar no lo mueve y aplastar
 * un bug tampoco, así que jugando sube poco a poco. La web lo apunta cada
 * segundo y lo manda con cada guardado.
 *
 * Aquí no se castiga nada: un salto solo deja un aviso para quien administra.
 */

/** Un punto del historial: el segundo (desde 1970) y el capital que había. */
export type Sample = [at: number, capital: number]

/** Lo más atrás y lo más adelante que puede caer un punto respecto a ahora, en segundos. */
const PAST_S = 3600
const AHEAD_S = 120
/** Segundos en los que se busca un salto, y por cuánto tiene que multiplicarse el capital. */
export const JUMP_WINDOW_S = 10
export const JUMP_FACTOR = 3
/** Con menos capital que esto, doblarlo en un momento es jugar: no se avisa. */
export const JUMP_FLOOR = 1e6
/** Segundos de antes y de después del salto que se guardan con el aviso. */
const TRACE_S = 30

/** Los puntos que valen, en orden y sin repetir segundo. */
export function clean(samples: readonly Sample[], now: number): Sample[] {
  const second = Math.floor(now / 1000)
  const byAt = new Map<number, number>()

  for (const [at, capital] of samples) {
    if (at >= second - PAST_S && at <= second + AHEAD_S) byAt.set(at, capital)
  }

  return [...byAt].sort(([a], [b]) => a - b)
}

/** Cada cuántos segundos se guarda un punto del día en curso. */
export const FINE_S = 10
/** Lo que dura el detalle fino, y lo que dura el de un punto por hora. */
export const FINE_FOR_S = 24 * 3600
export const HOURLY_FOR_S = 7 * 24 * 3600

/** Un punto por cada tramo de `FINE_S` segundos: el último de cada uno. */
export function coarse(samples: readonly Sample[]): Sample[] {
  const kept = new Map<number, number>()

  for (const [at, capital] of samples) kept.set(Math.floor(at / FINE_S) * FINE_S, capital)

  return [...kept]
}

/** El mayor salto que hay en esos puntos, o `null` si ninguno llama la atención. */
export function jump(
  samples: readonly Sample[],
): { at: number; seconds: number; from: number; to: number; trace: Sample[] } | null {
  let best = { start: -1, end: -1, ratio: 0 }

  for (const [end, [at, capital]] of samples.entries()) {
    if (capital < JUMP_FLOOR) continue

    for (let start = end - 1; start >= 0; start -= 1) {
      const [before, was] = samples[start] ?? [0, 0]

      if (at - before > JUMP_WINDOW_S) break

      const ratio = capital / Math.max(1, was)

      if (ratio >= JUMP_FACTOR && ratio > best.ratio) best = { start, end, ratio }
    }
  }

  const [from, was] = samples[best.start] ?? [0, 0]
  const [to, capital] = samples[best.end] ?? [0, 0]

  if (best.ratio === 0) return null

  return {
    at: to,
    seconds: to - from,
    from: was,
    to: capital,
    trace: samples.filter(([at]) => at >= from - TRACE_S && at <= to + TRACE_S),
  }
}

/** Deja una serie en `max` puntos como mucho, repartidos en el tiempo. */
export function thin(points: readonly Sample[], max: number): Sample[] {
  if (points.length <= max) return [...points]

  const step = points.length / max
  const kept = Array.from({ length: max }, (_, index) => points[Math.floor(index * step)])
  const last = points.at(-1)

  // El último siempre: es por donde va ahora.
  if (last !== undefined) kept[max - 1] = last

  return kept.filter((point): point is Sample => point !== undefined)
}
