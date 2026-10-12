import { describe, expect, it } from 'vitest'

import { createRateLimit } from '../../src/core/rate-limit.js'

describe('tope de intentos', () => {
  it('deja pasar hasta el tope y corta el siguiente', () => {
    const limit = createRateLimit({ max: 3, windowMs: 1000, now: () => 0 })

    expect([1, 2, 3, 4, 5].map(() => limit.hit('a'))).toEqual([true, true, true, false, false])
  })

  it('cada clave lleva su cuenta', () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: () => 0 })

    expect(limit.hit('a')).toBe(true)
    expect(limit.hit('b')).toBe(true)
    expect(limit.hit('a')).toBe(false)
  })

  it('la ventana se renueva justo al cumplirse, no un milisegundo antes', () => {
    let at = 0
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: () => at })

    expect(limit.hit('a')).toBe(true)
    at = 999
    expect(limit.hit('a')).toBe(false)
    expect(limit.retryAfter('a')).toBe(1)
    at = 1000
    expect(limit.retryAfter('a')).toBe(0)
    expect(limit.hit('a')).toBe(true)
  })

  it('reset devuelve los intentos', () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: () => 0 })

    limit.hit('a')
    limit.reset('a')

    expect(limit.hit('a')).toBe(true)
  })

  it('con tope cero no pasa nadie', () => {
    const limit = createRateLimit({ max: 0, windowMs: 1000, now: () => 0 })

    expect(limit.hit('a')).toBe(false)
    expect(limit.hit('a')).toBe(false)
  })

  it('no guarda más claves que el máximo: tira las más antiguas', () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000, maxKeys: 3, now: () => 0 })

    for (let index = 0; index < 5000; index += 1) limit.hit(`ip-${index}`)

    // La primera se olvidó: vuelve a tener intentos. La última sigue contada.
    expect(limit.hit('ip-0')).toBe(true)
    expect(limit.hit('ip-4999')).toBe(false)
  })

  it('al hacer sitio se va primero lo caducado', () => {
    let at = 0
    const limit = createRateLimit({ max: 1, windowMs: 1000, maxKeys: 2, now: () => at })

    limit.hit('vieja')
    at = 1500
    limit.hit('nueva')
    limit.hit('otra')

    expect(limit.hit('nueva')).toBe(false)
  })

  it('aguanta claves vacías y enormes', () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: () => 0 })
    const huge = 'x'.repeat(100_000)

    expect(limit.hit('')).toBe(true)
    expect(limit.hit('')).toBe(false)
    expect(limit.hit(huge)).toBe(true)
    expect(limit.hit(huge)).toBe(false)
  })
})

describe('consultar sin gastar', () => {
  it('allowed dice si quedan intentos y no apunta ninguno', () => {
    let at = 0
    const limit = createRateLimit({ max: 2, windowMs: 1000, now: () => at })

    expect(limit.allowed('a')).toBe(true)
    expect(limit.allowed('a')).toBe(true)
    limit.hit('a')
    expect(limit.allowed('a')).toBe(true)
    limit.hit('a')
    expect(limit.allowed('a')).toBe(false)
    at = 1000
    expect(limit.allowed('a')).toBe(true)
  })

  it('con tope cero nunca queda ninguno', () => {
    expect(createRateLimit({ max: 0, windowMs: 1000, now: () => 0 }).allowed('a')).toBe(false)
  })
})
