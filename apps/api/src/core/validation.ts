/**
 * Validación de lo que manda el front.
 *
 * Los esquemas viven junto a cada servicio; aquí solo está el puente entre Zod
 * y los errores de dominio, para que un cuerpo mal formado sea siempre un `400`
 * con un mensaje que se pueda enseñar.
 */

import { z } from 'zod'

import { domainError } from './errors.js'

/**
 * Valida `input` contra `schema`.
 *
 * @throws {DomainError} `invalid_input` con el primer problema encontrado.
 */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path.join('.') ?? ''

    throw domainError(
      'invalid_input',
      field === ''
        ? (issue?.message ?? 'Datos no válidos')
        : `${field}: ${issue?.message ?? 'no válido'}`,
    )
  }

  return result.data
}

/** Texto obligatorio, sin espacios sobrantes y con tope de longitud. */
export function text(max: number, min = 1) {
  return z.string().trim().min(min, 'no puede estar vacío').max(max, `máximo ${max} caracteres`)
}

/** Texto opcional: vacío o ausente se queda en `null`. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `máximo ${max} caracteres`)
    .nullish()
    .transform((value) => (value === undefined || value === null || value === '' ? null : value))
}

/** Id entero positivo, venga como número o como texto de la ruta. */
export const id = z.coerce.number().int().positive()

/**
 * Un día del calendario, `AAAA-MM-DD`.
 *
 * No basta con mirar la forma: `2026-13-45` la cumple y no es ningún día, y
 * `2026-02-31` JavaScript lo acepta y lo convierte en el 3 de marzo. Se exige
 * que la fecha, pasada a instante y de vuelta a texto, sea la misma.
 */
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'la fecha va como AAAA-MM-DD')
  .refine((value) => {
    const at = Date.parse(`${value}T00:00:00.000Z`)

    return !Number.isNaN(at) && new Date(at).toISOString().slice(0, 10) === value
  }, 'esa fecha no existe')
