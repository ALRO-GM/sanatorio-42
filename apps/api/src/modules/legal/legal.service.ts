/**
 * Privacidad y condiciones: qué versión está en vigor, quién la ha aceptado y
 * la descarga de los datos de cada cual.
 */

import type { LegalStatus } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { personalData } from '../../core/db/personal-data.js'
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

    /** Todo lo que Sanatorio 42 guarda de quien pregunta, tabla a tabla. */
    async export(actor: Actor, userId: number | null) {
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
