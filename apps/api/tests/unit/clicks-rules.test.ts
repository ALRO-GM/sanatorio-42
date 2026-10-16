/**
 * Code Clicker: pulsar más de lo que aguanta una persona en cada tramo.
 */

import { describe, expect, it } from 'vitest'

import { CLICK_LIMITS, overClicked } from '../../src/modules/clicker/clicks.rules.js'
import type { ClickSample } from '../../src/modules/clicker/clicks.rules.js'

/** Un punto por segundo durante `seconds`, pulsando `rate` por segundo, desde `from`. */
const steady = (seconds: number, rate: number, from = 0, clicks = 0): ClickSample[] =>
  Array.from({ length: seconds + 1 }, (_, index) => [from + index, clicks + index * rate] as const)

describe('pulsar de más', () => {
  it('un minuto a 50 por segundo justos se puede; a 51, no', () => {
    expect(overClicked(steady(60, 50))).toBeNull()
    expect(overClicked(steady(60, 51))).toEqual({ seconds: 60, perSecond: 50 })
  })

  it('cuenta el total del minuto, no cada segundo: un pico de un segundo no basta', () => {
    // Treinta segundos a 90 y treinta a 5: media de 47,5.
    const burst = [...steady(30, 90), ...steady(30, 5, 31, 30 * 90 + 5).slice(0)]

    expect(overClicked(burst)).toBeNull()
  })

  it('una ráfaga de un minuto en medio de una partida tranquila se ve', () => {
    const calm = steady(120, 3)
    const last = calm.at(-1) ?? [0, 0]
    const series = [...calm, ...steady(60, 60, last[0] + 1, last[1] + 60).slice(0)]

    expect(overClicked(series)?.seconds).toBe(60)
  })

  it('media hora a más de 9 por segundo, sí; a 9 justos, no', () => {
    // Un punto por minuto, como los guardados.
    const every = (minutes: number, rate: number): ClickSample[] =>
      Array.from({ length: minutes + 1 }, (_, index) => [index * 60, index * 60 * rate] as const)

    expect(overClicked(every(30, 9))).toBeNull()
    expect(overClicked(every(30, 9.2))).toEqual({ seconds: 1800, perSecond: 9 })
    // Más largo y más lento: dos horas a 6,5 (pasa el de dos horas, no el de media).
    expect(overClicked(every(120, 6.5))).toEqual({ seconds: 7200, perSecond: 6 })
    expect(overClicked(every(24 * 60, 2.1))).toEqual({ seconds: 86_400, perSecond: 2 })
    expect(overClicked(every(24 * 60, 1.9))).toBeNull()
  })

  it('al recompilar el contador vuelve a cero: no se compara lo de antes con lo de después', () => {
    const before = steady(40, 40)
    const after = steady(40, 40, 41, 0)

    expect(overClicked([...before, ...after])).toBeNull()
  })

  it('con puntos demasiado separados no se exige nada; sin puntos, nada', () => {
    // Dos puntos a cinco minutos: no dice nada del minuto, y no llega a media hora.
    expect(
      overClicked([
        [0, 0],
        [300, 300 * 60],
      ]),
    ).toBeNull()
    expect(overClicked([])).toBeNull()
    expect(overClicked([[0, 0]])).toBeNull()
  })

  it('los topes van del tramo más corto al más largo y cada vez más estrictos', () => {
    for (let index = 1; index < CLICK_LIMITS.length; index += 1) {
      expect(CLICK_LIMITS[index]?.seconds).toBeGreaterThan(CLICK_LIMITS[index - 1]?.seconds ?? 0)
      expect(CLICK_LIMITS[index]?.perSecond).toBeLessThan(CLICK_LIMITS[index - 1]?.perSecond ?? 0)
    }
  })
})
