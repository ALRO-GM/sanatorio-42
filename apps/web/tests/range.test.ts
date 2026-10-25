/**
 * Las cuentas del deslizador (`shared/ui/range.ts`): la rejilla, los valores
 * redondos, el imán, el ajuste fino y lo que se escribe a mano.
 */
import { describe, expect, it } from 'vitest'

import {
  FINE_FROM,
  MAX_ZOOM,
  fineFactor,
  fromPosition,
  magnetRadius,
  onGrid,
  parseTyped,
  roundStops,
  settle,
  toPosition,
} from '../src/shared/ui/range'
import type { Grid } from '../src/shared/ui/range'

const PERCENT: Grid = { min: 0, max: 100, step: 1, curve: 'linear' }
const LOG: Grid = { min: 1, max: 1000, step: 1, curve: 'log' }

describe('la rejilla', () => {
  it('cualquier entero de 0 a 100, sin decimales sueltos', () => {
    expect(onGrid(13.6, PERCENT)).toBe(14)
    expect(onGrid(-4, PERCENT)).toBe(0)
    expect(onGrid(140, PERCENT)).toBe(100)
    expect(onGrid(Number.NaN, PERCENT)).toBe(0)
    expect(onGrid(0.30000000000000004, { ...PERCENT, step: 0.1 })).toBe(0.3)
  })

  it('posición y valor van y vuelven, en recta y en logarítmica', () => {
    expect(toPosition(25, PERCENT)).toBe(0.25)
    expect(fromPosition(0.25, PERCENT)).toBe(25)
    expect(fromPosition(toPosition(37, LOG), LOG)).toBeCloseTo(37)
    // En la logarítmica, lo pequeño ocupa más barra.
    expect(toPosition(31, LOG)).toBeGreaterThan(0.45)
    // Un deslizador sin recorrido no divide entre cero.
    expect(toPosition(5, { ...PERCENT, min: 5, max: 5 })).toBe(0)
  })

  it('los valores redondos: 0, 5, 10… 25, 50, 75, 100 en porcentajes; 1, 2, 5, 10… en la logarítmica', () => {
    const stops = roundStops(PERCENT)

    expect(stops).toHaveLength(21)
    expect(stops).toEqual(expect.arrayContaining([0, 5, 10, 25, 50, 75, 100]))
    expect(stops).not.toContain(14)
    expect(roundStops(LOG)).toEqual([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000])
    expect(roundStops({ min: 1, max: 12, step: 1, curve: 'linear' })).toHaveLength(12)
    expect(roundStops({ ...PERCENT, max: 0 })).toEqual([0])
  })
})

describe('el imán', () => {
  const stops = roundStops(PERCENT)
  // Una barra de 200 px: dos píxeles por valor.
  const radius = magnetRadius(200, 1, stops, PERCENT)

  it('cerca de un valor redondo se pega a él, sin comerse a sus vecinos', () => {
    expect(settle(0.2445, null, PERCENT, stops, radius)).toBe(25)
    expect(settle(0.5055, null, PERCENT, stops, radius)).toBe(50)
    expect(settle(0.14, null, PERCENT, stops, radius)).toBe(14)
    // Con el ajuste fino (ocho veces), el imán abarca menos.
    const fine = magnetRadius(200, 1 / 8, stops, PERCENT)

    expect(settle(0.2455, null, PERCENT, stops, fine)).toBe(25)
    expect(settle(0.244, null, PERCENT, stops, fine)).toBe(24)
  })

  it('lejos de ellos, el entero más cercano: ningún valor queda fuera', () => {
    expect(settle(0.14, null, PERCENT, stops, radius)).toBe(14)
    expect(settle(0.172, null, PERCENT, stops, radius)).toBe(17)
  })

  it('no tiembla: un pulso en la frontera entre dos enteros se queda en el de antes', () => {
    // 13,5 está justo en medio de 13 y 14.
    expect(settle(0.135, 13, PERCENT, stops, radius)).toBe(13)
    expect(settle(0.135, 14, PERCENT, stops, radius)).toBe(14)
    expect(settle(0.142, 13, PERCENT, stops, radius)).toBe(14)
    // Pegado a 25, sigue pegado un poco más allá de donde se pegaría al llegar.
    expect(settle(0.258, null, PERCENT, stops, radius)).toBe(26)
    expect(settle(0.258, 25, PERCENT, stops, radius)).toBe(25)
  })

  it('nunca tapa más de un tercio del hueco entre paradas, y con el ajuste fino abarca menos', () => {
    expect(radius).toBeLessThanOrEqual(0.05 * 0.35)
    expect(magnetRadius(200, 0.25, stops, PERCENT)).toBeLessThan(radius)
    expect(magnetRadius(0, 1, stops, PERCENT)).toBe(0)
  })
})

describe('el ajuste fino', () => {
  it('entero cerca de la barra y, más lejos, en proporción inversa a la distancia', () => {
    expect(fineFactor(0)).toBe(1)
    expect(fineFactor(-FINE_FROM)).toBe(1)
    expect(fineFactor(FINE_FROM * 2)).toBe(0.5)
    expect(fineFactor(-FINE_FROM * 4)).toBe(0.25)
    expect(fineFactor(10_000)).toBe(1 / MAX_ZOOM)
  })
})

describe('lo que se escribe a mano', () => {
  it('admite coma, espacios y el signo de %', () => {
    expect(parseTyped('14', PERCENT)).toBe(14)
    expect(parseTyped(' 14,4 % ', PERCENT)).toBe(14)
    expect(parseTyped('250', PERCENT)).toBe(100)
    expect(parseTyped('', PERCENT)).toBeNull()
    expect(parseTyped('catorce', PERCENT)).toBeNull()
  })
})
