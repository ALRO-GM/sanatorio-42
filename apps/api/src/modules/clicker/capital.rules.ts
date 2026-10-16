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
/** Un reparto cobrado: el segundo (de la API) en que llegó y las líneas que traía. */
export type Gift = [at: number, amount: number]

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
/**
 * Margen alrededor de un salto para contar un reparto: la web lo suma al
 * recibir la respuesta del guardado, y su reloj no es el de la API.
 */
const GIFT_SLACK_S = AHEAD_S
/** Lo que se recuerdan los repartos cobrados: lo mismo que el historial que llega. */
export const GIFT_MEMORY_S = PAST_S

/** Los repartos de la última hora, con el de ahora si lo hay. */
export function rememberGifts(gifts: readonly Gift[], second: number, amount: number): Gift[] {
  const kept = gifts.filter(([at]) => at >= second - GIFT_MEMORY_S)

  return amount > 0 ? [...kept, [second, amount]] : kept
}

/** Lee la lista guardada; lo que no sea una lista de pares de números, fuera. */
export function readGifts(stored: unknown): Gift[] {
  try {
    const read: unknown = typeof stored === 'string' ? JSON.parse(stored) : []

    return Array.isArray(read)
      ? read.filter(
          (gift): gift is Gift =>
            Array.isArray(gift) &&
            gift.length === 2 &&
            gift.every((value) => typeof value === 'number' && Number.isFinite(value)),
        )
      : []
  } catch {
    return []
  }
}

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

/**
 * El mayor salto que hay en esos puntos, o `null` si ninguno llama la atención.
 *
 * Un reparto cobrado cerca de un tramo (`gifts`) se le descuenta: lo que se
 * mira es si, quitando el premio, el resto sube más de lo normal.
 */
export function jump(
  samples: readonly Sample[],
  gifts: readonly Gift[] = [],
): { at: number; seconds: number; from: number; to: number; trace: Sample[] } | null {
  let best = { start: -1, end: -1, ratio: 0 }

  for (const [end, [at, capital]] of samples.entries()) {
    if (capital < JUMP_FLOOR) continue

    for (let start = end - 1; start >= 0; start -= 1) {
      const [before, was] = samples[start] ?? [0, 0]

      if (at - before > JUMP_WINDOW_S) break

      const prize = gifts.reduce(
        (sum, [given, amount]) =>
          given >= before - GIFT_SLACK_S && given <= at + GIFT_SLACK_S ? sum + amount : sum,
        0,
      )
      const ratio = (capital - prize) / Math.max(1, was)

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
