/**
 * Qué código HTTP y qué cuerpo ve la web ante cada error. Lo que importa: nunca
 * se filtra el texto de un error interno, y un 429 de 42 no se le echa a quien
 * usa la web.
 */
import { describe, expect, it } from 'vitest'

import { mapError } from '../../src/core/http/errors.js'
import { DomainError } from '../../src/core/errors.js'
import { ApiError } from '../../src/integrations/forty-two/errors.js'

describe('de error a respuesta', () => {
  it('cada error de dominio va con su código', () => {
    const cases = [
      ['unauthenticated', 401],
      ['not_found', 404],
      ['invalid_input', 400],
      ['forbidden', 403],
      ['conflict', 409],
      ['rate_limited', 429],
    ] as const

    for (const [code, status] of cases) {
      const mapped = mapError(new DomainError(code, 'Motivo'))

      expect(mapped).toEqual({ status, body: { error: code, message: 'Motivo' } })
    }
  })

  it('un 429 de 42 es un 503 para la web; el resto de errores de 42, con su código', () => {
    expect(mapError(new ApiError('cuota', 429)).status).toBe(503)
    expect(mapError(new ApiError('no está', 404)).status).toBe(404)
    expect(mapError(new ApiError('caída', 502)).status).toBe(502)
  })

  it('lo desconocido es un 500 genérico, sin rutas ni SQL', () => {
    const mapped = mapError(new Error('SQLITE_ERROR near "FROM": /opt/sanatorio/data.db'))

    expect(mapped.status).toBe(500)
    expect(JSON.stringify(mapped.body)).not.toMatch(/SQLITE|\/opt\//)
    expect(mapError('una cadena').status).toBe(500)
    expect(mapError(null).status).toBe(500)
    expect(mapError(undefined).status).toBe(500)
  })
})
