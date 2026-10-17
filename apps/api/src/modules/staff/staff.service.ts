/**
 * Documentos con código de verificación y cuentas de staff.
 *
 * Para qué: quien se descarga sus horas validadas puede entregárselas al staff
 * de 42 (por ejemplo, para pedir días de compensación). Un CSV lo edita
 * cualquiera, así que el staff necesita poder comprobar que lo que recibe es lo
 * que emitió la web. Cada descarga se guarda entera con un código de cuatro
 * caracteres, que va en el nombre del fichero y en su última línea.
 *
 * El código no es un secreto ni protege nada: solo identifica el documento. Lo
 * que protege es que la copia buena está aquí, y que solo la ve una cuenta de
 * staff, que no puede hacer nada más.
 */

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import type {
  StaffAccount,
  StaffAccountCreated,
  StaffAccounts,
  StaffComparison,
  StaffDocument,
} from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { parse, startOfDayIso } from '../../core/validation.js'
import {
  CODE_LABEL,
  fileName,
  formatKey,
  makeCode,
  normaliseCode,
  parseCsv,
  parseKey,
  sameDocument,
  STAFF_NAME,
  withCode,
} from './staff.rules.js'

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  length: number,
) => Promise<Buffer>

/** Documentos nuevos que puede emitir una persona al día. Repetir uno no cuenta. */
export const EXPORTS_PER_DAY = 40
/** Comprobaciones que caben por cuenta de staff cada diez minutos. */
export const CHECKS_PER_WINDOW = 60
const CHECK_WINDOW_MS = 10 * 60_000
/** Intentos de dar con un código libre antes de rendirse. */
const CODE_TRIES = 40
/** Tamaño máximo del fichero que el staff sube para comparar. */
export const COMPARE_MAX_CHARS = 1_000_000
const KEY_BYTES = 32
const HASH_BYTES = 32

export type StaffServiceOptions = {
  db: Db
  now?: () => number
  /** Índice al azar por debajo de `max`. Inyectable, para los tests. */
  pick?: (max: number) => number
}

/** Lo que hace falta para emitir un documento. */
type ExportInput = {
  /** De quién son las horas; `null` si es el informe de todo el mundo. */
  login: string | null
  requestedBy: string
  from: string
  to: string
  totalMinutes: number
  rows: number
  /** El CSV, todavía sin la línea del código. */
  csv: string
}

export type IssuedExport = { code: string; fileName: string; csv: string }

/** Una sesión de staff: el id y el nombre de la cuenta. */
type StaffIdentity = { id: number; name: string }

const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(STAFF_NAME, 'de 3 a 40 letras, números, espacios, puntos o guiones'),
})
const compareSchema = z.object({
  content: z.string().max(COMPARE_MAX_CHARS, 'el fichero es demasiado grande'),
})

function toAccount(row: Record<string, unknown>): StaffAccount {
  return {
    id: toNumber(row.id),
    name: toText(row.name),
    createdBy: toText(row.created_by),
    createdAt: toText(row.created_at),
    lastUsedAt: typeof row.last_used_at === 'string' ? row.last_used_at : null,
    revokedAt: typeof row.revoked_at === 'string' ? row.revoked_at : null,
  }
}

export function createStaffService(options: StaffServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const pick = options.pick ?? randomInt
  const iso = (): string => new Date(now()).toISOString()
  const checks = createRateLimit({
    max: CHECKS_PER_WINDOW,
    windowMs: CHECK_WINDOW_MS,
    ...(options.now === undefined ? {} : { now: options.now }),
  })

  const hashKey = async (secret: string, salt: Buffer): Promise<Buffer> =>
    derive(secret, salt, HASH_BYTES)

  /** La cuenta, si existe y no se le ha retirado el acceso. */
  async function activeAccount(id: number): Promise<Record<string, unknown> | undefined> {
    const result = await db.execute({
      sql: 'SELECT * FROM staff_accounts WHERE id = ? AND revoked_at IS NULL',
      args: [id],
    })

    return result.rows[0]
  }

  /** Apunta una comprobación del staff y aplica su tope. */
  async function logCheck(
    staff: StaffIdentity,
    code: string,
    outcome: 'found' | 'unknown' | 'same' | 'different',
  ): Promise<void> {
    await db.execute({
      sql: 'INSERT INTO staff_checks (staff, code, outcome, created_at) VALUES (?, ?, ?, ?)',
      args: [staff.name, code, outcome, iso()],
    })
  }

  /**
   * Comprueba que la sesión de staff sigue valiendo y que no se ha pasado de
   * intentos. El tope es lo que impide probar códigos al azar: con 60 cada diez
   * minutos, recorrer los 923 521 llevaría más de cien días seguidos.
   */
  async function admit(staff: StaffIdentity): Promise<void> {
    if ((await activeAccount(staff.id)) === undefined) {
      throw domainError('unauthenticated', 'Esa cuenta de staff ya no tiene acceso')
    }
    if (!checks.hit(String(staff.id))) {
      throw domainError(
        'rate_limited',
        'Demasiadas comprobaciones seguidas. Espera unos minutos y vuelve a probar.',
      )
    }
  }

  async function stored(code: string): Promise<Record<string, unknown> | undefined> {
    const result = await db.execute({
      sql: 'SELECT * FROM report_exports WHERE code = ?',
      args: [code],
    })

    return result.rows[0]
  }

  return {
    /**
     * Emite un documento: lo guarda con un código y devuelve el fichero con el
     * código puesto.
     *
     * Pedir dos veces el mismo documento (mismas horas, mismo periodo) da el
     * mismo código: no se gasta otro ni se guarda otra copia.
     *
     * @throws {DomainError} `rate_limited` si esa persona ya ha emitido
     *   `EXPORTS_PER_DAY` documentos distintos hoy; `conflict` si no queda
     *   ningún código libre.
     */
    async issue(input: ExportInput): Promise<IssuedExport> {
      const hash = createHash('sha256').update(input.csv).digest('hex')
      const subject = input.login ?? 'all'
      const known = await db.execute({
        sql: `SELECT code, content FROM report_exports
              WHERE requested_by = ? AND hash = ? AND login = ?
                AND period_from = ? AND period_to = ? LIMIT 1`,
        args: [input.requestedBy, hash, subject, input.from, input.to],
      })
      const again = known.rows[0]

      if (again !== undefined) {
        const code = toText(again.code)

        return {
          code,
          fileName: fileName(input.login, input.from, input.to, code),
          csv: toText(again.content),
        }
      }

      const today = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM report_exports WHERE requested_by = ? AND created_at >= ?',
        args: [input.requestedBy, startOfDayIso(now())],
      })

      if (toNumber(today.rows[0]?.total ?? 0) >= EXPORTS_PER_DAY) {
        throw domainError(
          'rate_limited',
          'Has descargado muchos informes distintos hoy. Mañana podrás descargar más.',
        )
      }

      for (let attempt = 0; attempt < CODE_TRIES; attempt += 1) {
        const code = makeCode(pick)
        const csv = withCode(input.csv, code)
        // `OR IGNORE`: si el código ya existe no se pisa nada y se prueba otro.
        const result = await db.execute({
          sql: `INSERT OR IGNORE INTO report_exports
                  (code, login, requested_by, period_from, period_to, total_minutes,
                   row_count, hash, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            code,
            subject,
            input.requestedBy,
            input.from,
            input.to,
            Math.max(0, Math.round(input.totalMinutes)),
            Math.max(0, Math.round(input.rows)),
            hash,
            csv,
            iso(),
          ],
        })

        if (result.rowsAffected > 0) {
          return { code, fileName: fileName(input.login, input.from, input.to, code), csv }
        }
      }

      throw domainError(
        'conflict',
        'No queda ningún código libre para el documento. Avisa a quien administra la web.',
      )
    },

    /** Las cuentas de staff, las vigentes primero. Solo para quien administra. */
    async accounts(actor: Actor): Promise<StaffAccounts> {
      assertAdmin(actor)

      const result = await db.execute(
        'SELECT * FROM staff_accounts ORDER BY revoked_at IS NOT NULL, created_at DESC, id DESC',
      )

      return { accounts: result.rows.map(toAccount) }
    },

    /**
     * Crea una cuenta de staff y devuelve su clave, que no se guarda: de ella
     * solo queda un resumen con sal. Quien administra la copia en ese momento.
     *
     * @throws {DomainError} `conflict` si ya hay una cuenta con ese nombre.
     */
    async createAccount(actor: Actor, input: unknown): Promise<StaffAccountCreated> {
      assertAdmin(actor)

      const { name } = parse(accountSchema, input)
      const secret = randomBytes(KEY_BYTES).toString('base64url')
      const salt = randomBytes(16)
      const hash = await hashKey(secret, salt)
      const taken = await db.execute({
        sql: 'SELECT 1 FROM staff_accounts WHERE name = ? COLLATE NOCASE',
        args: [name],
      })

      if (taken.rows.length > 0) {
        throw domainError('conflict', 'Ya hay una cuenta de staff con ese nombre')
      }

      const created = await db.execute({
        sql: `INSERT INTO staff_accounts (name, key_hash, salt, created_by, created_at)
              VALUES (?, ?, ?, ?, ?) RETURNING *`,
        args: [name, hash.toString('base64url'), salt.toString('base64url'), actor.login, iso()],
      })
      const row = created.rows[0]

      if (row === undefined) {
        throw domainError('conflict', 'No se ha podido crear la cuenta')
      }

      const account = toAccount(row)

      return { account, key: formatKey(account.id, secret) }
    },

    /** Retira el acceso a una cuenta. Sus sesiones abiertas dejan de valer al momento. */
    async revoke(actor: Actor, id: number): Promise<void> {
      assertAdmin(actor)

      const result = await db.execute({
        sql: 'UPDATE staff_accounts SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
        args: [iso(), id],
      })

      if (result.rowsAffected === 0) {
        throw domainError('not_found', 'Esa cuenta no existe o ya no tenía acceso')
      }
    },

    /**
     * La cuenta a la que corresponde una clave, o `null`.
     *
     * Tarda lo mismo exista o no la cuenta: se calcula siempre un resumen, para
     * que el tiempo de respuesta no diga qué ids existen.
     */
    async authenticate(key: unknown): Promise<StaffIdentity | null> {
      const parsed = parseKey(key)
      const row = parsed === null ? undefined : await activeAccount(parsed.id)
      const salt = row === undefined ? Buffer.alloc(16) : Buffer.from(toText(row.salt), 'base64url')
      const expected =
        row === undefined
          ? Buffer.alloc(HASH_BYTES)
          : Buffer.from(toText(row.key_hash), 'base64url')
      const given = await hashKey(parsed?.secret ?? '', salt)
      const matches = expected.length === given.length && timingSafeEqual(expected, given)

      if (row === undefined || !matches) return null

      await db.execute({
        sql: 'UPDATE staff_accounts SET last_used_at = ? WHERE id = ?',
        args: [iso(), toNumber(row.id)],
      })

      return { id: toNumber(row.id), name: toText(row.name) }
    },

    /** `true` si la cuenta existe y conserva el acceso. */
    async active(id: number): Promise<boolean> {
      return (await activeAccount(id)) !== undefined
    },

    /**
     * El documento que corresponde a un código, tal como se emitió.
     *
     * @throws {DomainError} `not_found` si el código no es de ningún documento
     *   (o no puede serlo); `rate_limited` si la cuenta lleva demasiados intentos.
     */
    async document(staff: StaffIdentity, raw: unknown): Promise<StaffDocument> {
      await admit(staff)

      const code = normaliseCode(raw)
      const row = code === null ? undefined : await stored(code)

      if (code === null || row === undefined) {
        await logCheck(staff, typeof raw === 'string' ? raw.slice(0, 16) : '', 'unknown')

        throw domainError('not_found', 'Ese código no corresponde a ningún documento emitido')
      }

      await logCheck(staff, code, 'found')

      const login = toText(row.login)
      const subject = login === 'all' ? null : login
      // La última línea es la del código: no es una fila del informe.
      const [header = [], ...rest] = parseCsv(toText(row.content))
      const lines = rest.filter((line) => line[0] !== CODE_LABEL)

      return {
        code,
        login: subject,
        requestedBy: toText(row.requested_by),
        from: toText(row.period_from),
        to: toText(row.period_to),
        totalMinutes: toNumber(row.total_minutes),
        rows: toNumber(row.row_count),
        issuedAt: toText(row.created_at),
        fileName: fileName(subject, toText(row.period_from), toText(row.period_to), code),
        header,
        lines,
      }
    },

    /**
     * Compara el fichero que ha recibido el staff con el que se emitió.
     *
     * @param input `{ content }`: el texto del fichero.
     * @throws {DomainError} `not_found` si el código no existe.
     */
    async compare(staff: StaffIdentity, raw: unknown, input: unknown): Promise<StaffComparison> {
      await admit(staff)

      const code = normaliseCode(raw)
      const row = code === null ? undefined : await stored(code)

      if (code === null || row === undefined) {
        throw domainError('not_found', 'Ese código no corresponde a ningún documento emitido')
      }

      const { content } = parse(compareSchema, input)
      const identical = sameDocument(content, toText(row.content))

      await logCheck(staff, code, identical ? 'same' : 'different')

      return { identical }
    },
  }
}

export type StaffService = ReturnType<typeof createStaffService>
