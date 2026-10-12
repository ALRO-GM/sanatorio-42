/**
 * Comunicados: lo que quien administra quiere que alguien lea al entrar.
 *
 * Un comunicado va a todo el mundo, a un campus o a unas personas concretas, y
 * puede llevar opciones entre las que elegir. A quién le toca se decide al
 * preguntar, no al mandarlo: así le llega también a quien entra días después.
 * Deja de salir pasado un mes, y se borra pasado medio año.
 */

import type { Broadcast, BroadcastAudience, BroadcastReport } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { id, parse } from '../../core/validation.js'

const DAY_MS = 24 * 60 * 60_000
/** Un comunicado sin contestar deja de salir pasado esto: ya no es noticia. */
const SHOWN_DAYS = 30
/** Comunicados que se enseñan en el panel, del más reciente al más antiguo. */
const REPORT_LIMIT = 50

const login = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,30}$/, 'login no válido')

const audienceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all') }),
  z.object({ kind: z.literal('campus'), campusId: id }),
  z.object({ kind: z.literal('logins'), logins: z.array(login).min(1).max(200) }),
])

const inputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(60)).max(6).default([]),
  required: z.boolean().default(false),
  audience: audienceSchema,
})

const answerSchema = z.object({ option: z.number().int().min(0).nullable() })

/** `true` si ese comunicado es para esa persona. */
function reaches(audience: BroadcastAudience, actor: Actor): boolean {
  switch (audience.kind) {
    case 'all':
      return true
    case 'campus':
      return audience.campusId === actor.campusId
    case 'logins':
      return audience.logins.includes(actor.login)
  }
}

export type BroadcastsServiceOptions = {
  db: Db
  now?: () => number
}

export function createBroadcastsService(options: BroadcastsServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const iso = (at: number): string => new Date(at).toISOString()

  type Stored = Broadcast & { audience: BroadcastAudience }

  const stored = (row: Record<string, unknown>): Stored => ({
    id: toNumber(row.id),
    from: toText(row.from_login),
    title: toText(row.title),
    body: toText(row.body),
    options: JSON.parse(toText(row.options)) as string[],
    required: toNumber(row.required) === 1,
    audience: JSON.parse(toText(row.audience)) as BroadcastAudience,
    at: toText(row.created_at),
  })

  /** Los comunicados recientes que esa persona aún no ha visto, el más antiguo primero. */
  const pendingFor = async (actor: Actor): Promise<Stored[]> => {
    const result = await db.execute({
      sql: `SELECT b.* FROM broadcasts b
            WHERE b.created_at >= ?
              AND NOT EXISTS (
                SELECT 1 FROM broadcast_answers a WHERE a.broadcast_id = b.id AND a.login = ?
              )
            ORDER BY b.id`,
      args: [iso(now() - SHOWN_DAYS * DAY_MS), actor.login],
    })

    return result.rows.map(stored).filter((broadcast) => reaches(broadcast.audience, actor))
  }

  return {
    /**
     * Manda un comunicado. Solo para quien administra la web.
     *
     * @throws {DomainError} `forbidden` si no es admin; `invalid_input` si es
     *   obligatorio contestar y no hay entre qué elegir.
     */
    async send(actor: Actor, input: unknown): Promise<BroadcastReport> {
      assertAdmin(actor)

      const message = parse(inputSchema, input)

      await db.execute({
        sql: `INSERT INTO broadcasts (from_login, title, body, options, required, audience, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          actor.login,
          message.title,
          message.body,
          JSON.stringify(message.options),
          Number(message.required),
          JSON.stringify(message.audience),
          iso(now()),
        ],
      })

      const [latest] = await this.reports(actor)

      if (latest === undefined) {
        throw domainError('not_found', 'El comunicado no se ha guardado')
      }

      return latest
    },

    /** Lo que esa persona tiene por leer. Sin la audiencia: no le hace falta saberla. */
    async pending(actor: Actor): Promise<Broadcast[]> {
      return (await pendingFor(actor)).map(({ audience: _audience, ...broadcast }) => broadcast)
    },

    /** Cuántos tiene por leer: va en el pulso, para no pedir la lista cada vez. */
    async count(actor: Actor): Promise<number> {
      return (await pendingFor(actor)).length
    },

    /**
     * Contesta a un comunicado, o lo cierra sin elegir (`option: null`).
     *
     * @throws {DomainError} `not_found` si no es para esa persona;
     *   `invalid_input` si la opción no existe o si hay que elegir y no se elige.
     */
    async answer(actor: Actor, broadcastId: number, input: unknown): Promise<Broadcast[]> {
      const { option } = parse(answerSchema, input)
      const broadcast = (await pendingFor(actor)).find((entry) => entry.id === broadcastId)

      if (broadcast === undefined) {
        throw domainError('not_found', 'Ese comunicado no existe o ya lo has contestado')
      }
      if (option !== null && option >= broadcast.options.length) {
        throw domainError('invalid_input', 'Esa opción no existe')
      }
      if (option === null && broadcast.required && broadcast.options.length > 0) {
        throw domainError('invalid_input', 'Hay que elegir una opción para cerrarlo')
      }

      await db.execute({
        sql: `INSERT INTO broadcast_answers (broadcast_id, login, option, answered_at)
              VALUES (?, ?, ?, ?) ON CONFLICT (broadcast_id, login) DO NOTHING`,
        args: [broadcastId, actor.login, option, iso(now())],
      })

      return this.pending(actor)
    },

    /** Los últimos comunicados con lo que se ha contestado. Solo admins. */
    async reports(actor: Actor): Promise<BroadcastReport[]> {
      assertAdmin(actor)

      const [sent, answered] = await Promise.all([
        db.execute({
          sql: 'SELECT * FROM broadcasts ORDER BY id DESC LIMIT ?',
          args: [REPORT_LIMIT],
        }),
        db.execute(
          'SELECT broadcast_id, login, option, answered_at FROM broadcast_answers ORDER BY answered_at',
        ),
      ])

      return sent.rows.map((row): BroadcastReport => {
        const broadcast = stored(row)
        const answers = answered.rows
          .filter((answer) => toNumber(answer.broadcast_id) === broadcast.id)
          .map((answer) => ({
            login: toText(answer.login),
            option: answer.option === null ? null : toNumber(answer.option),
            at: toText(answer.answered_at),
          }))

        return {
          ...broadcast,
          counts: broadcast.options.map(
            (_, index) => answers.filter((answer) => answer.option === index).length,
          ),
          seen: answers.filter((answer) => answer.option === null).length,
          answers,
        }
      })
    },

    /** Retira un comunicado: deja de salirle a quien aún no lo ha visto. Solo admins. */
    async remove(actor: Actor, broadcastId: number): Promise<void> {
      assertAdmin(actor)
      await db.batch(
        [
          { sql: 'DELETE FROM broadcast_answers WHERE broadcast_id = ?', args: [broadcastId] },
          { sql: 'DELETE FROM broadcasts WHERE id = ?', args: [broadcastId] },
        ],
        'write',
      )
    },
  }
}

export type BroadcastsService = ReturnType<typeof createBroadcastsService>
