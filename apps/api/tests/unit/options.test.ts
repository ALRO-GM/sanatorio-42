/**
 * Las dependencias opcionales y las fechas: una sola forma para todos los
 * servicios, probada sola.
 */
import { describe, expect, it } from 'vitest'

import { clockOf, given, loggerOf } from '../../src/core/options.js'
import { dayOf, isoAt, startOfDayIso } from '../../src/core/time.js'

describe('dependencias opcionales', () => {
  it('given quita lo que no viene y deja lo demás tal cual', () => {
    const now = (): number => 1
    const log = (): void => undefined

    expect(given({ now, log: undefined, random: undefined })).toEqual({ now })
    expect(given({ now, log })).toEqual({ now, log })
    expect(given({})).toEqual({})
    // `null` y `0` sí son valores.
    expect(given({ a: null, b: 0, c: '' })).toEqual({ a: null, b: 0, c: '' })
  })

  it('el reloj y el registro tienen su valor por defecto', () => {
    const fixed = (): number => 42

    expect(clockOf({ now: fixed })).toBe(fixed)
    expect(clockOf({})).toBe(Date.now)
    expect(() => {
      loggerOf({})('nada')
    }).not.toThrow()

    const lines: string[] = []

    loggerOf({ log: (message) => lines.push(message) })('hola')
    expect(lines).toEqual(['hola'])
  })
})

describe('fechas', () => {
  it('ISO, día y principio del día, en UTC', () => {
    const at = Date.UTC(2026, 9, 23, 7, 30, 15, 250)

    expect(isoAt(at)).toBe('2026-10-23T07:30:15.250Z')
    expect(dayOf(at)).toBe('2026-10-23')
    expect(startOfDayIso(at)).toBe('2026-10-23T00:00:00.000Z')
    expect(isoAt(0)).toBe('1970-01-01T00:00:00.000Z')
  })
})
