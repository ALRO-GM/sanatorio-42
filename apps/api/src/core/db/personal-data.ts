/**
 * Los datos de una persona, para dárselos cuando los pide (derecho de acceso).
 *
 * Cada módulo dice qué tablas suyas tienen algo de alguien y en qué columna va
 * quién es (`personal` en `AppModule`). Así una tabla nueva solo se apunta en su
 * módulo, y la descarga no se queda atrás sin que nadie se dé cuenta.
 */

import type { Db } from './database.js'

/** Una tabla con datos de personas. */
export type PersonalTable = {
  readonly table: string
  /** Columnas con el login de la persona (cualquiera de ellas la incluye). */
  readonly logins?: readonly string[]
  /** Columnas con su id de 42. */
  readonly userIds?: readonly string[]
  /** Columnas que no se dan nunca (secretos), aunque sean suyas. */
  readonly omit?: readonly string[]
}

/** Quién pide sus datos. */
export type DataSubject = { login: string; userId: number | null }

/** Lo más que se da de una tabla: una descarga no debe tumbar nada. */
const MAX_ROWS = 5000

/** Las filas de esa persona en cada tabla, sin las columnas que no se dan. */
export async function personalData(
  db: Db,
  tables: readonly PersonalTable[],
  subject: DataSubject,
): Promise<Record<string, Record<string, unknown>[]>> {
  const out: Record<string, Record<string, unknown>[]> = {}

  for (const spec of tables) {
    const parts: string[] = []
    const args: (string | number)[] = []

    for (const column of spec.logins ?? []) {
      parts.push(`${column} = ?`)
      args.push(subject.login)
    }
    if (subject.userId !== null) {
      for (const column of spec.userIds ?? []) {
        parts.push(`${column} = ?`)
        args.push(subject.userId)
      }
    }
    if (parts.length === 0) continue

    const result = await db.execute({
      sql: `SELECT * FROM ${spec.table} WHERE ${parts.join(' OR ')} LIMIT ${MAX_ROWS}`,
      args,
    })
    const omit = new Set(spec.omit ?? [])

    out[spec.table] = result.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([column, value]) =>
            !omit.has(column) &&
            !/^\d+$/.test(column) &&
            !(value instanceof ArrayBuffer || ArrayBuffer.isView(value)),
        ),
      ),
    )
  }

  return out
}
