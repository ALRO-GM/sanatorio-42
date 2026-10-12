import { describe, expect, it } from 'vitest'

import { codeFromName, hoursText } from '../src/features/staff/code'

describe('el campo del código del staff', () => {
  it('lo tecleado se queda en mayúsculas', () => {
    expect(codeFromName('k7qf')).toBe('K7QF')
    expect(codeFromName('k7 qf')).toBe('K7 QF')
    expect(codeFromName('K7-QF')).toBe('K7-QF')
  })

  it('del nombre del fichero se queda con el código', () => {
    expect(codeFromName('horas-validadas_jdoe_2026-09-12_2026-10-12_K7QF.csv')).toBe('K7QF')
    expect(codeFromName('horas-validadas_todos_2026-09-12_2026-10-12_k7qf.CSV ')).toBe('K7QF')
    expect(codeFromName('C:\\Descargas\\horas-validadas_a-b_2026-09-12_2026-10-12_AB23.csv')).toBe(
      'AB23',
    )
  })

  it('quita lo que no puede ir en un código y no deja pasar de doce', () => {
    expect(codeFromName('<k7>"qf"')).toBe('K7QF')
    expect(codeFromName('ñ€😀k7qf')).toBe('K7QF')
    expect(codeFromName('')).toBe('')
    expect(codeFromName('a'.repeat(5000))).toHaveLength(12)
    expect(codeFromName('_ABCDE.csv')).toBe('ABCDECSV')
  })
})

describe('minutos como horas', () => {
  it('menos de una hora, la hora justa y más', () => {
    expect(hoursText(0)).toBe('0 min')
    expect(hoursText(59)).toBe('59 min')
    expect(hoursText(60)).toBe('1 h 00 min')
    expect(hoursText(95)).toBe('1 h 35 min')
    expect(hoursText(6000)).toBe('100 h 00 min')
  })

  it('valores imposibles no dan textos imposibles', () => {
    expect(hoursText(-30)).toBe('0 min')
    expect(hoursText(Number.NaN)).toBe('0 min')
    expect(hoursText(Infinity)).toBe('0 min')
    expect(hoursText(59.6)).toBe('1 h 00 min')
    expect(hoursText(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+ h \d{2} min$/)
  })
})
