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

/** Principio del día UTC de un instante, en ISO. Para los topes diarios. */
export function startOfDayIso(at: number): string {
  return `${new Date(at).toISOString().slice(0, 10)}T00:00:00.000Z`
}
