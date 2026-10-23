/**
 * Trozos de SQL que se repetían a mano por los repositorios.
 */

/**
 * `columna IN (SELECT value FROM json_each(?))`: una lista como un solo
 * parámetro. Frente a `IN (?, ?, …)` montado a mano, no hay tope de 999
 * parámetros, no hay que trocear en lotes y una lista vacía no casa con nada
 * en vez de ser SQL inválido. El argumento se pasa con `listArg`.
 */
export const inList = (column: string): string => `${column} IN (SELECT value FROM json_each(?))`

/** El argumento de `inList`: la lista como JSON. */
export const listArg = (values: readonly (string | number)[]): string => JSON.stringify(values)

/** `columna NOT IN (SELECT value FROM json_each(?))`: lo contrario de `inList`, mismo argumento. */
export const notInList = (column: string): string =>
  `${column} NOT IN (SELECT value FROM json_each(?))`
