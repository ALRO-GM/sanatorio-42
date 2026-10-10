/**
 * Parámetros de ruta.
 */

import { DomainError } from '../errors.js'

/** Tipo de las rutas con `:id`. */
export type IdParams = { Params: { id: string } }

/**
 * Id numérico de la ruta, o `400`.
 *
 * Viene como texto y tiene que ser un entero: sin esta comprobación, `Number`
 * devolvería `NaN` y acabaría en una consulta.
 */
export function idParam(raw: string, what: string): number {
  if (!/^\d{1,12}$/.test(raw)) {
    throw new DomainError('invalid_input', `${what} "${raw}" no existe`)
  }

  return Number(raw)
}
