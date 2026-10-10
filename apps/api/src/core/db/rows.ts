/**
 * Lectura de columnas de libSQL, que llegan sin tipo.
 */

/**
 * Lee un texto de una columna.
 *
 * Las columnas de libSQL son `string | number | bigint | ArrayBuffer | null`, y
 * un `String(...)` a ciegas convertiría un `null` en `"null"`.
 */
export function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  return typeof value === 'number' || typeof value === 'bigint' ? value.toString() : ''
}

/**
 * Lee un entero de una columna.
 *
 * `@libsql/client` devuelve los enteros como número en SQLite local y puede
 * devolverlos como `bigint` o como texto hablando con Turso.
 */
export function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}
