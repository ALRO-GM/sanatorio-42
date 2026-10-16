/**
 * Buzón: el título que se pone solo a un mensaje que llega sin él.
 */

import { describe, expect, it } from 'vitest'

import { subjectFrom } from '../../src/modules/admin/tickets.rules.js'

describe('título sacado del mensaje', () => {
  it('es la primera línea, sin espacios de sobra', () => {
    expect(subjectFrom('  El mapa no carga  \nDesde ayer por la tarde')).toBe('El mapa no carga')
    expect(subjectFrom('dos   espacios\tseguidos')).toBe('dos espacios seguidos')
    expect(subjectFrom('Hola\r\nadiós')).toBe('Hola')
  })

  it('justo en el límite se queda entera; un carácter más, se corta por una palabra', () => {
    const exact = 'a'.repeat(80)

    expect(subjectFrom(exact)).toBe(exact)
    expect(subjectFrom(`${'palabra '.repeat(12)}fin`)).toBe(`${'palabra '.repeat(10).trim()}…`)
  })

  it('una sola palabra enorme se corta por donde toque', () => {
    expect(subjectFrom('x'.repeat(200))).toBe(`${'x'.repeat(80)}…`)
  })

  it('vacío da vacío (el esquema ya exige un mensaje)', () => {
    expect(subjectFrom('')).toBe('')
    expect(subjectFrom('   \n  ')).toBe('')
  })
})
