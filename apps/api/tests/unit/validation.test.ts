import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { assertAdmin } from '../../src/core/actor.js'
import { DomainError } from '../../src/core/errors.js'
import { mapError } from '../../src/core/http/errors.js'
import { idParam } from '../../src/core/http/params.js'
import { day, id, optionalText, parse, text } from '../../src/core/validation.js'

const ok = (schema: z.ZodType, value: unknown): boolean => schema.safeParse(value).success

describe('un día del calendario', () => {
  it('acepta días que existen, también los de los bordes', () => {
    for (const value of ['2026-10-12', '2024-02-29', '1970-01-01', '9999-12-31', '0001-01-01']) {
      expect(ok(day, value), value).toBe(true)
    }
  })

  it('rechaza lo que tiene la forma pero no es ningún día', () => {
    for (const value of [
      '2026-13-45',
      '2026-00-10',
      '2026-01-00',
      '2026-02-30',
      '2026-02-31',
      '2025-02-29',
      '2026-04-31',
      '2026-12-32',
    ]) {
      expect(ok(day, value), value).toBe(false)
    }
  })

  it('rechaza otras formas y otros tipos', () => {
    for (const value of [
      '',
      ' ',
      '2026-1-1',
      '26-10-12',
      '2026/10/12',
      '2026-10-12T00:00:00Z',
      ' 2026-10-12',
      '2026-10-12 ',
      '+2026-10-12',
      '-2026-10-12',
      '１２３４-01-01',
      'a'.repeat(100_000),
      20261012,
      null,
      undefined,
      {},
      [],
    ]) {
      expect(ok(day, value), JSON.stringify(value)).toBe(false)
    }
  })
})

describe('textos e identificadores', () => {
  it('el texto se recorta y respeta el tope justo en el borde', () => {
    expect(parse(text(5), '  hola ')).toBe('hola')
    expect(parse(text(5), 'abcde')).toBe('abcde')
    expect(() => parse(text(5), 'abcdef')).toThrow(DomainError)
    expect(() => parse(text(5), '     ')).toThrow(DomainError)
    expect(() => parse(text(5), '')).toThrow(DomainError)
  })

  it('el texto opcional vacío se queda en null', () => {
    expect(parse(optionalText(5), '')).toBeNull()
    expect(parse(optionalText(5), '   ')).toBeNull()
    expect(parse(optionalText(5), null)).toBeNull()
    expect(parse(optionalText(5), undefined)).toBeNull()
    expect(() => parse(optionalText(5), 'abcdef')).toThrow(DomainError)
  })

  it('un id es un entero positivo y nada más', () => {
    expect(parse(id, 1)).toBe(1)
    expect(parse(id, '42')).toBe(42)

    for (const value of [0, -1, 1.5, 'abc', '', Number.NaN, Infinity, -Infinity, null, {}, []]) {
      expect(() => parse(id, value), JSON.stringify(value)).toThrow(DomainError)
    }
  })

  it('el id de una ruta: solo dígitos, y no más de doce', () => {
    expect(idParam('1', 'Eso')).toBe(1)
    expect(idParam('0', 'Eso')).toBe(0)
    expect(idParam('999999999999', 'Eso')).toBe(999_999_999_999)

    for (const raw of ['', '-1', '1.5', '1e3', ' 1', '0x10', '9999999999999', 'abc', '१२३']) {
      expect(() => idParam(raw, 'Eso'), raw).toThrow(DomainError)
    }
  })
})

describe('quién administra', () => {
  it('pasa quien administra y corta a quien no', () => {
    expect(() => {
      assertAdmin({ login: 'a', campusId: 1, admin: true })
    }).not.toThrow()

    try {
      assertAdmin({ login: 'a', campusId: 1, admin: false })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError)
      expect((error as DomainError).code).toBe('forbidden')
    }
  })
})

describe('de error a respuesta', () => {
  it('un rechazo del servidor conserva su código y no cita lo recibido', () => {
    const error = Object.assign(new Error('Unexpected token < in JSON: <secreto>'), {
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
      statusCode: 400,
    })

    expect(mapError(error)).toEqual({
      status: 400,
      body: { error: 'invalid_input', message: 'La petición no se entiende' },
    })
  })

  it('demasiado grande es 413 y un tipo desconocido, 415', () => {
    const big = Object.assign(new Error('x'), {
      code: 'FST_ERR_CTP_BODY_TOO_LARGE',
      statusCode: 413,
    })
    const type = Object.assign(new Error('x'), {
      code: 'FST_ERR_CTP_INVALID_MEDIA_TYPE',
      statusCode: 415,
    })

    expect(mapError(big).status).toBe(413)
    expect(mapError(type).status).toBe(415)
  })

  it('un error cualquiera no elige su código, aunque traiga uno', () => {
    for (const error of [
      Object.assign(new Error('SQLITE_ERROR: no such table'), { statusCode: 400 }),
      Object.assign(new Error('x'), { code: 'OTRO', statusCode: 404 }),
      Object.assign(new Error('x'), { code: 'FST_ERR_RARO', statusCode: 500 }),
      Object.assign(new Error('x'), { code: 'FST_ERR_RARO', statusCode: 200 }),
      Object.assign(new Error('x'), { code: 'FST_ERR_RARO', statusCode: '400' }),
      'un texto',
      null,
      undefined,
      42,
    ]) {
      const mapped = mapError(error)

      expect(mapped.status).toBe(500)
      expect(mapped.body.message).not.toContain('SQLITE')
    }
  })
})
