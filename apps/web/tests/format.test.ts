import { describe, expect, it } from 'vitest'

import { formatsFor } from '../src/shared/i18n/useFormat'

/** Las 16:05 del 13 de octubre de 2025, en la hora local de quien mira. */
const WHEN = new Date(2025, 9, 13, 16, 5)

describe('formatsFor: números y fechas en el idioma elegido', () => {
  it('los números siguen el idioma de la web, no el del navegador', () => {
    expect(formatsFor('es').number(1234.5)).toBe('1234,5')
    expect(formatsFor('en').number(1234.5)).toBe('1,234.5')
    expect(formatsFor('es').number(2.456, 1)).toBe('2,5')
    expect(formatsFor('en').number(2.456, 0)).toBe('2')
    expect(formatsFor('en').compact(1_250_000)).toMatch(/^1\.3[mM]$/)
  })

  it('cada estilo de fecha tiene su forma', () => {
    const en = formatsFor('en')

    expect(en.time(WHEN)).toBe('16:05')
    expect(en.date(WHEN)).toBe('13/10/2025')
    expect(en.date(WHEN, 'medium')).toBe('13 Oct 2025')
    expect(en.date(WHEN, 'dayMonth')).toBe('13 Oct')
    expect(en.date(WHEN, 'weekday')).toBe('Mon')
    expect(en.date(WHEN, 'long')).toBe('Monday 13 October')
    expect(en.date(WHEN, 'monthLong')).toBe('October 2025')
    expect(en.date('2025-10-01T00:00:00Z', 'monthYear')).toBe('Oct 2025')
    expect(en.dateTime(WHEN)).toBe('13/10/2025, 16:05')
  })

  it('acepta ISO, milisegundos o Date, y un idioma desconocido cae al español', () => {
    const es = formatsFor('es')

    expect(es.time(WHEN.toISOString())).toBe(es.time(WHEN.getTime()))
    expect(formatsFor('xx').date(WHEN)).toBe(es.date(WHEN))
  })

  it('los formateadores se crean una vez por idioma', () => {
    expect(formatsFor('ca')).toBe(formatsFor('ca'))
    expect(formatsFor('ca')).not.toBe(formatsFor('eu'))
  })
})
