/**
 * Los datos de una persona, para dárselos cuando los pide (derecho de acceso).
 *
 * Cada módulo dice qué tablas suyas tienen algo de alguien y en qué columna va
 * quién es (`personal` en `AppModule`). Así una tabla nueva solo se apunta en su
 * módulo, y la descarga no se queda atrás sin que nadie se dé cuenta.
 *
 * La descarga es de quien la pide, no de con quién trató: en las tablas «entre
 * dos» (una reserva, una corrección, un aviso) la fila se recorta a lo que es
 * suyo según por qué columna se encontró (`give`), las listas de logins se
 * reducen a su login y los secretos (`omit`) no salen nunca.
 */

import type { Db } from './database.js'
import { toText } from './rows.js'

/** De dónde salen las filas: copiadas de la API de 42 o hechas aquí. */
export type PersonalSource = '42' | 'sanatorio'

/**
 * Una columna con varios logins dentro: separados por comas (`csv`) o un JSON
 * del que `path` saca la lista (`json`, p. ej. `$.logins`).
 */
export type PersonalList = {
  readonly column: string
  readonly format: 'csv' | 'json'
  readonly path?: string
}

/** Una tabla con datos de personas. */
export type PersonalTable = {
  readonly table: string
  /** Si no se dice, es de la app (`sanatorio`). */
  readonly source?: PersonalSource
  /** Columnas con el login de la persona (cualquiera de ellas la incluye). */
  readonly logins?: readonly string[]
  /** Columnas con su id de 42. */
  readonly userIds?: readonly string[]
  /**
   * Columnas con una lista de logins: la fila es también de quien está en la
   * lista. En su copia, la lista se queda solo con su login; una lista en la
   * que no está no se da nunca (es gente ajena).
   */
  readonly lists?: readonly PersonalList[]
  /** Columnas que no se dan nunca (secretos), aunque sean suyas. */
  readonly omit?: readonly string[]
  /**
   * Qué columnas se dan según por cuál se encontró la fila. Para las tablas
   * «entre dos»: quien ayudó no se lleva la nota de quien pidió, ni al revés.
   * Una columna de persona sin entrada aquí da la fila entera; si la fila se
   * encontró por varias, se dan las columnas de todas ellas juntas.
   */
  readonly give?: Readonly<Record<string, readonly string[]>>
}

/** Quién pide sus datos. */
type DataSubject = { login: string; userId: number | null }

/** Lo que se da de una tabla, con su origen y si se quedó corta. */
type PersonalRows = {
  source: PersonalSource
  /** `true` si había más filas que el tope: la persona tiene que saberlo. */
  truncated: boolean
  rows: Record<string, unknown>[]
}

/** Lo más que se da de una tabla: una descarga no debe tumbar nada. */
const MAX_ROWS = 5000

type Row = Record<string, unknown>

/** La condición SQL de «esta fila es de la persona», con sus argumentos. */
function whereOf(
  spec: PersonalTable,
  subject: DataSubject,
): { sql: string; args: (string | number)[] } | null {
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
  for (const list of spec.lists ?? []) {
    if (list.format === 'csv') {
      // Con comas a los dos lados, `an` no encaja dentro de `ana`.
      parts.push(`instr(',' || ${list.column} || ',', ?) > 0`)
      args.push(`,${subject.login},`)
    } else {
      parts.push(
        `EXISTS (SELECT 1 FROM json_each(${list.column}${list.path === undefined ? '' : ', ?'}) WHERE value = ?)`,
      )
      if (list.path !== undefined) args.push(list.path)
      args.push(subject.login)
    }
  }

  return parts.length === 0 ? null : { sql: parts.join(' OR '), args }
}

/** Si la lista de esa columna lleva a la persona (misma regla que el SQL). */
function listHas(value: unknown, list: PersonalList, login: string): boolean {
  if (typeof value !== 'string') return false
  if (list.format === 'csv') return value.split(',').includes(login)

  try {
    const parsed: unknown = JSON.parse(value)
    const inner =
      list.path === undefined
        ? parsed
        : list.path
            .replace(/^\$\.?/, '')
            .split('.')
            .filter((step) => step !== '')
            .reduce<unknown>(
              (node, step) =>
                node !== null && typeof node === 'object' ? (node as Row)[step] : undefined,
              parsed,
            )

    return Array.isArray(inner) && inner.includes(login)
  } catch {
    return false
  }
}

/** Por qué columnas es suya la fila. Vacío si por ninguna (no debería pasar). */
function matchesOf(spec: PersonalTable, row: Row, subject: DataSubject): string[] {
  const matched: string[] = []

  for (const column of spec.logins ?? []) {
    if (row[column] === subject.login) matched.push(column)
  }
  if (subject.userId !== null) {
    for (const column of spec.userIds ?? []) {
      if (Number(row[column]) === subject.userId) matched.push(column)
    }
  }
  for (const list of spec.lists ?? []) {
    if (listHas(row[list.column], list, subject.login)) matched.push(list.column)
  }

  return matched
}

/** La fila recortada a lo suyo, o `null` si no queda nada que dar. */
function project(spec: PersonalTable, row: Row, subject: DataSubject): Row | null {
  const matched = matchesOf(spec, row, subject)

  if (matched.length === 0) return null

  const give = spec.give ?? {}
  // Basta con que una de las columnas por las que es suya no esté acotada
  // para dar la fila entera.
  const allowed = matched.some((column) => give[column] === undefined)
    ? null
    : new Set(matched.flatMap((column) => give[column] ?? []))
  const omit = new Set(spec.omit ?? [])
  const lists = new Map((spec.lists ?? []).map((list) => [list.column, list]))
  const out: Row = {}

  for (const [column, value] of Object.entries(row)) {
    if (omit.has(column) || /^\d+$/.test(column)) continue
    if (allowed !== null && !allowed.has(column)) continue
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) continue

    const list = lists.get(column)

    if (list !== undefined) {
      // De una lista de gente solo se da el propio login: el resto es ajeno.
      if (matched.includes(column)) out[column] = subject.login
      continue
    }
    out[column] = value
  }

  return out
}

/**
 * Las filas de esa persona en cada tabla, recortadas a lo suyo y sin las
 * columnas que no se dan. `maxRows` solo lo cambian los tests.
 */
export async function personalData(
  db: Db,
  tables: readonly PersonalTable[],
  subject: DataSubject,
  maxRows = MAX_ROWS,
): Promise<Record<string, PersonalRows>> {
  const out: Record<string, PersonalRows> = {}

  for (const spec of tables) {
    const where = whereOf(spec, subject)

    if (where === null) continue

    // Una fila más que el tope, solo para saber si se quedó corta.
    const result = await db.execute({
      sql: `SELECT * FROM ${spec.table} WHERE ${where.sql} LIMIT ${maxRows + 1}`,
      args: where.args,
    })
    const rows: Row[] = []

    for (const row of result.rows.slice(0, maxRows)) {
      const projected = project(spec, row, subject)

      if (projected !== null) rows.push(projected)
    }

    out[spec.table] = {
      source: spec.source ?? 'sanatorio',
      truncated: result.rows.length > maxRows,
      rows,
    }
  }

  return out
}

/** La lista de esa columna con `login` cambiado por `alias` (misma regla que `listHas`). */
function relisted(value: unknown, list: PersonalList, login: string, alias: string): unknown {
  if (typeof value !== 'string') return value
  if (list.format === 'csv') {
    return value
      .split(',')
      .map((entry) => (entry === login ? alias : entry))
      .join(',')
  }

  const parsed: unknown = JSON.parse(value)
  const steps = (list.path ?? '$')
    .replace(/^\$\.?/, '')
    .split('.')
    .filter((step) => step !== '')
  const swap = (node: unknown, rest: readonly string[]): unknown => {
    if (rest.length === 0) {
      return Array.isArray(node)
        ? (node as unknown[]).map((entry) => (entry === login ? alias : entry))
        : node
    }
    if (node === null || typeof node !== 'object') return node

    const [step = '', ...tail] = rest

    return { ...(node as Row), [step]: swap((node as Row)[step], tail) }
  }

  return JSON.stringify(swap(parsed, steps))
}

/**
 * Anonimiza a una persona: en cada tabla de la app, su login pasa a ser
 * `alias` (un identificador opaco y nuevo). Lo que hizo sigue contando para
 * las demás personas (las horas de una pizarra, una reserva, un grupo), pero ya
 * no se sabe que fue ella.
 *
 * Lo copiado de 42 (`source: '42'`) no se toca: es lo que 42 publica al campus
 * y volvería en la siguiente copia.
 *
 * @returns Las filas cambiadas.
 */
export async function anonymizePersonalData(
  db: Db,
  tables: readonly PersonalTable[],
  login: string,
  alias: string,
): Promise<number> {
  let changed = 0

  for (const spec of tables) {
    if ((spec.source ?? 'sanatorio') !== 'sanatorio') continue

    for (const column of spec.logins ?? []) {
      const result = await db.execute({
        sql: `UPDATE ${spec.table} SET ${column} = ? WHERE ${column} = ?`,
        args: [alias, login],
      })

      changed += result.rowsAffected
    }

    for (const list of spec.lists ?? []) {
      const where = whereOf({ table: spec.table, lists: [list] }, { login, userId: null })

      if (where === null) continue

      // Por el valor de antes y no por `rowid`: hay tablas `WITHOUT ROWID`.
      // Filas con la misma lista acaban con la misma lista nueva, que es lo justo.
      const found = await db.execute({
        sql: `SELECT DISTINCT ${list.column} AS value FROM ${spec.table} WHERE ${where.sql}`,
        args: where.args,
      })

      for (const row of found.rows) {
        const result = await db.execute({
          sql: `UPDATE ${spec.table} SET ${list.column} = ? WHERE ${list.column} = ?`,
          args: [relisted(row.value, list, login, alias) as string, toText(row.value)],
        })

        changed += result.rowsAffected
      }
    }
  }

  return changed
}
