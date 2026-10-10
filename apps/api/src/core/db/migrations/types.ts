/** Una migración: versión, nombre y las sentencias SQL que la componen. */
export type Migration = {
  /** Versión única y creciente. Es el número que queda en `schema_version`. */
  readonly version: number
  /** Nombre legible, para saber qué se ejecutó al leer los logs. */
  readonly name: string
  /** Sentencias SQL, en orden. Se aplican todas o ninguna. */
  readonly statements: readonly string[]
}
