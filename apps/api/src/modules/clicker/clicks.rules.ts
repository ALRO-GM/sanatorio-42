/**
 * Code Clicker: pulsar más de lo que puede una persona.
 *
 * No se mira segundo a segundo (un segundo con 40 pulsaciones lo hace cualquiera
 * con dos dedos): se mira el total de cada tramo de tiempo seguido, y se compara
 * con lo que una persona aguanta en ese tramo. Cuanto más largo, menos aguanta:
 * un minuto a toda velocidad se puede; media hora sin parar, no.
 */

/** Un tramo y lo más que se puede pulsar de media en él. */
export type ClickLimit = { seconds: number; perSecond: number }

/**
 * Los topes, del más corto al más largo:
 *
 * - un minuto a más de 50 por segundo (3 000 pulsaciones) ya no es una mano;
 * - media hora a más de 9 por segundo (16 200) no lo aguanta nadie;
 * - dos horas a más de 6, seis horas a más de 4 y un día a más de 2 por segundo
 *   (172 800 pulsaciones en 24 h): son medias, con las pausas dentro, y una
 *   persona que juega mucho se queda lejos.
 */
export const CLICK_LIMITS: readonly ClickLimit[] = [
  { seconds: 60, perSecond: 50 },
  { seconds: 30 * 60, perSecond: 9 },
  { seconds: 2 * 3600, perSecond: 6 },
  { seconds: 6 * 3600, perSecond: 4 },
  { seconds: 24 * 3600, perSecond: 2 },
]

/** Lo más largo que se mira: lo que hay que guardar de historia. */
export const CLICK_HISTORY_S = 25 * 3600

/**
 * Hasta cuánto más largo que el tramo puede ser el hueco entre dos puntos para
 * medirlo: con puntos muy separados la media se diluye y no sería justo exigirla
 * (ni útil), así que solo se mira lo que tiene resolución suficiente.
 */
const SPAN_SLACK = 1.5

/** Un punto: segundo (desde 1970) y pulsaciones contadas hasta entonces. */
export type ClickSample = readonly [at: number, clicks: number]

/**
 * El primer tope que se pasa en una serie de puntos, o `null`. La serie viene
 * por orden de tiempo; si el contador baja (se recompiló y empieza de cero), lo
 * de antes no se compara con lo de después.
 */
export function overClicked(
  samples: readonly ClickSample[],
  limits: readonly ClickLimit[] = CLICK_LIMITS,
): ClickLimit | null {
  // Tramos sin bajadas del contador.
  const runs: ClickSample[][] = []

  for (const sample of samples) {
    const run = runs.at(-1)
    const last = run?.at(-1)

    if (run === undefined || last === undefined || sample[1] < last[1] || sample[0] < last[0]) {
      runs.push([sample])
    } else {
      run.push(sample)
    }
  }

  for (const limit of limits) {
    for (const run of runs) {
      let start = 0

      for (let end = 1; end < run.length; end += 1) {
        const [endAt, endClicks] = run[end] ?? [0, 0]

        // El punto de salida: el último que deja al menos el tramo entero detrás.
        while (start + 1 < end && endAt - (run[start + 1]?.[0] ?? 0) >= limit.seconds) start += 1

        const [startAt, startClicks] = run[start] ?? [0, 0]
        const span = endAt - startAt

        if (span < limit.seconds || span > limit.seconds * SPAN_SLACK) continue
        if (endClicks - startClicks > limit.perSecond * span) return limit
      }
    }
  }

  return null
}
