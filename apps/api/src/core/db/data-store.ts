/**
 * Lo que cada módulo deja borrar a mano desde el panel de gestión.
 *
 * Nada se borra solo por viejo: quien administra elige qué datos quitar, de
 * todo el mundo o de una persona, enteros o a partir de (o hasta) una fecha.
 * Cada módulo dice cuáles son los suyos con `tableStore`, y `admin` solo sabe
 * que existen.
 */

import type { Db } from './database.js'
import { toNumber } from './rows.js'

/** Qué filas: de quién (`login`) y de cuándo. Los días van como `YYYY-MM-DD`, en UTC. */
export type DataScope = {
  login?: string | undefined
  /** Solo lo anterior a ese día. */
  before?: string | undefined
  /** Solo lo de ese día en adelante. */
  from?: string | undefined
}

export type DataStore = {
  /** Nombre corto del tipo de dato: la web lo traduce (`admin.data.kind.*`). */
  readonly id: string
  count: (scope: DataScope) => Promise<number>
  /**
   * Una muestra de esas filas, las más recientes primero, para que quien va a
   * borrar vea qué es. Los textos largos van recortados.
   */
  sample: (scope: DataScope, limit: number) => Promise<DataSample>
  /** Borra y devuelve cuántas filas ha quitado. */
  wipe: (scope: DataScope) => Promise<number>
}

/** Las columnas que se enseñan y las filas, cada una con sus valores en ese orden. */
export type DataSample = {
  columns: string[]
  rows: (string | number | null)[][]
}

/** Lo que se deja ver de un texto en la muestra. */
const TEXT_SHOWN = 120

type TableStoreOptions = {
  id: string
  table: string
  /** La columna con el login de la persona de quien es la fila. */
  login: string
  /** La columna con la fecha, y cómo está guardada. */
  date: { column: string; as: 'iso' | 'day' | 'seconds' }
  /** Las columnas que se enseñan en la muestra: las que dicen qué es cada fila. */
  show: readonly string[]
  /** Tablas que cuelgan de esta: sus filas se van con las de aquí. */
  children?: readonly { table: string; key: string; parent: string }[]
}

/** Un `DataStore` sobre una tabla con una columna de login y otra de fecha. */
export function tableStore(db: Db, options: TableStoreOptions): DataStore {
  const { table, date } = options
  const at = (day: string): string | number =>
    date.as === 'day'
      ? day
      : date.as === 'iso'
        ? `${day}T00:00:00.000Z`
        : Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000)

  const where = (scope: DataScope): { sql: string; args: (string | number)[] } => {
    const parts: string[] = []
    const args: (string | number)[] = []

    if (scope.login !== undefined) {
      parts.push(`${options.login} = ?`)
      args.push(scope.login)
    }
    if (scope.before !== undefined) {
      parts.push(`${date.column} < ?`)
      args.push(at(scope.before))
    }
    if (scope.from !== undefined) {
      parts.push(`${date.column} >= ?`)
      args.push(at(scope.from))
    }

    return { sql: parts.length === 0 ? '' : ` WHERE ${parts.join(' AND ')}`, args }
  }

  return {
    id: options.id,

    async count(scope) {
      const { sql, args } = where(scope)
      const result = await db.execute({ sql: `SELECT COUNT(*) AS total FROM ${table}${sql}`, args })

      return toNumber(result.rows[0]?.total ?? 0)
    },

    async sample(scope, limit) {
      const { sql, args } = where(scope)
      const result = await db.execute({
        sql: `SELECT ${options.show.join(', ')} FROM ${table}${sql}
              ORDER BY ${date.column} DESC LIMIT ?`,
        args: [...args, limit],
      })

      return {
        columns: [...options.show],
        rows: result.rows.map((row) =>
          options.show.map((column) => {
            const value = row[column]

            if (typeof value === 'number') return value
            // Lo que no sea texto ni número (un nulo, un binario) no se enseña.
            if (typeof value !== 'string') return null

            const text = value

            return text.length > TEXT_SHOWN ? `${text.slice(0, TEXT_SHOWN)}…` : text
          }),
        ),
      }
    },

    async wipe(scope) {
      const { sql, args } = where(scope)
      const results = await db.batch(
        [
          ...(options.children ?? []).map((child) => ({
            sql: `DELETE FROM ${child.table} WHERE ${child.key} IN
                    (SELECT ${child.parent} FROM ${table}${sql})`,
            args,
          })),
          { sql: `DELETE FROM ${table}${sql}`, args },
        ],
        'write',
      )

      return results.at(-1)?.rowsAffected ?? 0
    },
  }
}
