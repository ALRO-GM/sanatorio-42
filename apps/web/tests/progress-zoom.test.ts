import { describe, expect, it } from 'vitest'

import { zoomLast, zoomTop } from '../src/features/stats/progressZoom'

/** La lupa del Avance: hasta dónde llegan los ejes ajustados a lo que se ve. */

const DAYS = [0, 15, 30, 45, 60, 75, 90]
const person = (
  line: (number | null)[],
  finished: number | null = null,
  milestones: number[] = [],
) => ({
  line,
  trace: { finished, milestones: milestones.map((day) => ({ day })) },
})

describe('zoomLast: el tiempo, hasta quien más lejos llega', () => {
  it('el último dato de cada cual; manda el que más lejos llega', () => {
    expect(
      zoomLast(
        DAYS,
        [person([0, 5, 10, null, null, null, null]), person([0, 5, 9, 12, null, null, null])],
        0,
        90,
      ),
    ).toBe(45)
  })

  it('quien terminó acaba el día que terminó, aunque su línea siga en el 100 %', () => {
    expect(zoomLast(DAYS, [person([0, 50, 100, 100, 100, 100, 100], 22)], 0, 90)).toBe(22)
  })

  it('un hito después de su último punto alarga su tiempo', () => {
    expect(zoomLast(DAYS, [person([0, 5, null, null, null, null, null], null, [20])], 0, 90)).toBe(
      20,
    )
  })

  it('sin pasarse del periodo; sin nadie dentro, el periodo entero', () => {
    expect(zoomLast(DAYS, [person([0, 5, 10, 15, 20, 25, 30])], 0, 60)).toBe(60)
    expect(zoomLast(DAYS, [], 0, 90)).toBe(90)
    expect(zoomLast(DAYS, [person([0, 5, null, null, null, null, null])], 30, 90)).toBe(90)
  })
})

describe('zoomTop: la altura, hasta lo más alto que se ve', () => {
  it('lo más alto de las líneas y los hitos, con un poco de aire', () => {
    expect(
      zoomTop(
        [
          [0, 10, 20],
          [null, 30],
        ],
        [{ day: 40, value: 35 }],
        [],
        0,
        60,
      ),
    ).toBe(37)
  })

  it('un hito fuera del tiempo no cuenta', () => {
    expect(zoomTop([[0, 10]], [{ day: 400, value: 90 }], [], 0, 60)).toBe(11)
  })

  it('los paces, con su valor justo en el borde del tiempo', () => {
    // De 0 a 100 en 100 días: el día 60 va por el 60 %.
    expect(
      zoomTop(
        [[0, 10]],
        [],
        [
          [
            [0, 0],
            [100, 100],
          ],
        ],
        0,
        60,
      ),
    ).toBe(63)
  })

  it('nunca pasa del 100 % ni baja del 5 %', () => {
    expect(zoomTop([[100]], [], [], 0, 60)).toBe(100)
    expect(zoomTop([[0, 1]], [], [], 0, 60)).toBe(5)
  })
})
