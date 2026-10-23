/**
 * Lectura de columnas de libSQL, que llegan sin tipo.
 *
 * Las columnas son `string | number | bigint | ArrayBuffer | null`, y hablando
 * con Turso los enteros pueden venir como `bigint` o como texto. Aquí está el
 * único criterio para leerlas: los repositorios no lo repiten a mano.
 */

import type { ZodType } from 'zod'

/**
 * Lee un texto de una columna.
 *
 * Un `String(...)` a ciegas convertiría un `null` en `"null"`.
 */
export function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  return typeof value === 'number' || typeof value === 'bigint' ? value.toString() : ''
}

/** Un texto, o `null` si la columna está vacía o no es texto. */
export function toTextOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Lee un entero de una columna (`0` si está vacía). */
export function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

/** Un número, o `null` si la columna está vacía. */
export function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : toNumber(value)
}

/** Un booleano guardado como `0`/`1` (SQLite no tiene booleanos). */
export function toBool(value: unknown): boolean {
  return toNumber(value) === 1
}

/** Un booleano `0`/`1`, o `null` si aún no se sabe (la columna está vacía). */
export function toBoolOrNull(value: unknown): boolean | null {
  return value === null || value === undefined ? null : toBool(value)
}

/** Lo contrario: cómo se guarda un `boolean | null` en una columna `0`/`1`. */
export function fromBoolOrNull(value: boolean | null | undefined): number | null {
  return value === null || value === undefined ? null : value ? 1 : 0
}

/**
 * Una columna con JSON, leída y comprobada con su esquema. `null` si no hay
 * nada, si no es JSON o si no tiene la forma esperada: lo guardado hace tiempo
 * con otra forma no puede tumbar lo de ahora.
 */
export function toJson<T>(value: unknown, schema: ZodType<T>): T | null {
  if (typeof value !== 'string' || value === '') return null

  try {
    const result = schema.safeParse(JSON.parse(value))

    return result.success ? result.data : null
  } catch {
    return null
  }
}
