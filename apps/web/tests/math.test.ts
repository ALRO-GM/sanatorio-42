/**
 * `shared/math.ts`: los rellenos de barra y la cuenta atrás de una pregunta.
 */

import { describe, expect, it } from 'vitest'

import { clamp, timeLeft } from '../src/shared/math'

describe('clamp', () => {
  it('de fábrica, de 0 a 1, con los bordes dentro', () => {
    expect(clamp(0.4)).toBe(0.4)
    expect(clamp(0)).toBe(0)
    expect(clamp(1)).toBe(1)
    expect(clamp(-3)).toBe(0)
    expect(clamp(7)).toBe(1)
  })

  it('con sus propios límites', () => {
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(-1, 0, 100)).toBe(0)
    expect(clamp(42, 0, 100)).toBe(42)
  })

  it('lo imprevisible: NaN al mínimo, infinitos a los bordes', () => {
    expect(clamp(Number.NaN)).toBe(0)
    expect(clamp(Number.NaN, 5, 9)).toBe(5)
    expect(clamp(Number.POSITIVE_INFINITY)).toBe(1)
    expect(clamp(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe('timeLeft', () => {
  const START = 1_000_000
  const END = START + 20_000

  it('al empezar queda todo; a la mitad, la mitad', () => {
    expect(timeLeft(START, END, START)).toEqual({ seconds: 20, share: 1 })
    expect(timeLeft(START, END, START + 10_000)).toEqual({ seconds: 10, share: 0.5 })
  })

  it('los segundos se redondean hacia arriba: con 0,1 s aún queda 1', () => {
    expect(timeLeft(START, END, END - 100).seconds).toBe(1)
    expect(timeLeft(START, END, END).seconds).toBe(0)
  })

  it('pasada la hora, cero; antes de empezar, la barra llena', () => {
    expect(timeLeft(START, END, END + 5_000)).toEqual({ seconds: 0, share: 0 })
    expect(timeLeft(START, END, START - 5_000).share).toBe(1)
  })

  it('un tramo vacío o al revés no divide entre cero', () => {
    expect(timeLeft(START, START, START)).toEqual({ seconds: 0, share: 0 })
    expect(timeLeft(END, START, START - 1_000)).toEqual({ seconds: 1, share: 1 })
  })
})
