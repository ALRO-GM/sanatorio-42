/**
 * Privacidad y condiciones: qué versión está en vigor, quién la ha aceptado y
 * la descarga de los datos de cada cual.
 */

import { randomBytes } from 'node:crypto'

import type { LegalStatus, PersonalExport } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { anonymizePersonalData, personalData } from '../../core/db/personal-data.js'
import type { PersonalTable } from '../../core/db/personal-data.js'
import { toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'

/**
 * La versión del texto que hay que aceptar. Se cambia (con la fecha) cuando
 * cambia algo de lo que dice `features/legal` en la web: entonces se vuelve a
 * pedir a todo el mundo.
 */
export const LEGAL_VERSION = '2026-10-16'

export type LegalServiceOptions = {
  db: Db
  /** Las tablas con datos de personas de todos los módulos (se montan antes). */
  personal: () => readonly PersonalTable[]
  now?: () => number
}

const acceptSchema = z.object({ version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
/** Para anonimizar hay que escribir el propio login: no se hace por un clic suelto. */
const confirmSchema = z.object({ confirm: z.string().trim().toLowerCase() })
const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,40}$/, 'login no válido')

/** Un identificador opaco y nuevo: no se puede volver de él al login. */
const newAlias = (): string => `anon-${randomBytes(6).toString('hex')}`

export function createLegalService(options: LegalServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now

  return {
    async status(actor: Actor): Promise<LegalStatus> {
      const result = await db.execute({
        sql: 'SELECT accepted_at FROM legal_acceptances WHERE login = ? AND version = ?',
        args: [actor.login, LEGAL_VERSION],
      })
      const row = result.rows[0]

      return {
        version: LEGAL_VERSION,
        acceptedAt: row === undefined ? null : toText(row.accepted_at),
      }
    },

    /**
     * Acepta la versión vigente. Hay que decir cuál se acepta: si el texto
     * cambió mientras se leía, no se da por aceptado lo que no se ha visto.
     *
     * @throws {DomainError} `conflict` si no es la vigente.
     */
    async accept(actor: Actor, input: unknown): Promise<LegalStatus> {
      const { version } = parse(acceptSchema, input)

      if (version !== LEGAL_VERSION) {
        throw domainError('conflict', 'El texto ha cambiado: léelo otra vez')
      }

      await db.execute({
        sql: `INSERT OR IGNORE INTO legal_acceptances (login, version, accepted_at)
              VALUES (?, ?, ?)`,
        args: [actor.login, version, new Date(now()).toISOString()],
      })

      return this.status(actor)
    },

    /**
     * Anonimiza la cuenta de quien pregunta (`anonymizePersonalData`): su login
     * se cambia por un identificador opaco en todo lo de la app. No se puede
     * deshacer; si vuelve a entrar, empieza de cero.
     *
     * @throws {DomainError} `invalid_input` si `confirm` no es su login.
     */
    async anonymize(actor: Actor, input: unknown): Promise<{ changed: number }> {
      const { confirm } = parse(confirmSchema, input)

      if (confirm !== actor.login) {
        throw domainError('invalid_input', 'Escribe tu login para confirmarlo')
      }

      return {
        changed: await anonymizePersonalData(db, options.personal(), actor.login, newAlias()),
      }
    },

    /** Lo mismo, de otra persona que lo ha pedido por otra vía. Solo admins. */
    async anonymizeOther(actor: Actor, login: unknown): Promise<{ changed: number }> {
      assertAdmin(actor)

      return {
        changed: await anonymizePersonalData(
          db,
          options.personal(),
          parse(loginSchema, login),
          newAlias(),
        ),
      }
    },

    /**
     * Todo lo que Sanatorio 42 guarda de quien pregunta, tabla a tabla, con el
     * origen de cada una (42 o la app) y si alguna se quedó corta.
     */
    async export(actor: Actor, userId: number | null): Promise<PersonalExport> {
      return {
        login: actor.login,
        exportedAt: new Date(now()).toISOString(),
        legalVersion: LEGAL_VERSION,
        tables: await personalData(db, options.personal(), { login: actor.login, userId }),
      }
    },
  }
}

export type LegalService = ReturnType<typeof createLegalService>
