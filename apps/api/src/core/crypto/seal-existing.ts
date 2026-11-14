/**
 * Cifra lo que haya en la base sin cifrar, o cifrado con una clave anterior.
 *
 * Corre al arrancar (`app/build-app.ts`), y no en una migración, porque las
 * migraciones son SQL y no tienen la clave a mano (ni deben: la clave no se
 * escribe nunca en la base). Es idempotente: lo ya cifrado con la clave de
 * ahora no se toca, así que tras la primera vez solo mira y sale.
 *
 * Sirve para dos cosas:
 * - La primera vez (migración 98 en adelante): cifra los textos de antes.
 * - Al rotar la clave: con la nueva en `DATA_KEY` y la vieja en
 *   `DATA_KEY_PREVIOUS`, vuelve a cifrar todo con la nueva. Después la vieja
 *   se puede quitar.
 *
 * Si encuentra algo cifrado con una clave que no tiene, para con error: mejor
 * no arrancar que servir datos que no se pueden leer o mezclar claves.
 */

import type { Db } from '../db/database.js'
import { toText } from '../db/rows.js'
import type { FieldCipher } from './fields.js'

/** Una columna cifrada y cómo encontrar su fila. */
export type SealedColumn = {
  readonly table: string
  readonly column: string
  /** La clave de la fila. `rowid` si no se dice (no vale en tablas `WITHOUT ROWID`). */
  readonly key?: string
}

/** Filas por vuelta: una tabla grande no se carga entera en memoria. */
const CHUNK = 500

/** Cuántos valores ha cifrado (o vuelto a cifrar) en cada columna con alguno. */
export async function sealExisting(
  db: Db,
  fields: FieldCipher,
  columns: readonly SealedColumn[],
): Promise<Record<string, number>> {
  const prefix = `v1:${fields.keyId}:`
  const done: Record<string, number> = {}

  for (const { table, column, key = 'rowid' } of columns) {
    let total = 0

    for (;;) {
      // `substr` y no `LIKE`: `LIKE` no distingue mayúsculas y la huella sí.
      const result = await db.execute({
        sql: `SELECT ${key} AS k, ${column} AS v FROM ${table}
              WHERE ${column} IS NOT NULL AND substr(${column}, 1, ?) <> ? LIMIT ?`,
        args: [prefix.length, prefix, CHUNK],
      })

      if (result.rows.length === 0) break

      await db.batch(
        result.rows.map((row) => {
          const stored = toText(row.v)

          return {
            // Con el valor de antes en el WHERE: si algo lo cambió mientras
            // tanto, se queda como esté (la siguiente vuelta lo vuelve a ver).
            sql: `UPDATE ${table} SET ${column} = ? WHERE ${key} = ? AND ${column} = ?`,
            args: [fields.seal(fields.open(stored)), row.k ?? null, stored],
          }
        }),
        'write',
      )
      total += result.rows.length
    }

    if (total > 0) done[`${table}.${column}`] = total
  }

  return done
}
