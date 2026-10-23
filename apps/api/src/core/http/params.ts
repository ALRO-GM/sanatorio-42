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

/**
 * Id de texto de la ruta (un nivel, una prueba: `w0-commit`, `group1`), o
 * `400`. Son ids de una lista cerrada: lo que no tenga su forma no llega a
 * buscarse.
 */
export function slugParam(raw: string, what: string): string {
  if (!/^[a-z0-9-]{1,40}$/.test(raw)) {
    throw new DomainError('invalid_input', `${what} no existe`)
  }

  return raw
}
