/**
 * Las conversaciones de cada persona: todos los chats en los que está, juntos,
 * con lo que ha apuntado de cada uno (hasta dónde ha leído, si lo tiene
 * pendiente, cuándo quiere que se le recuerde y de qué proyecto va).
 *
 * Los mensajes no se tocan: siguen en `event_messages` y se leen y escriben por
 * las rutas de siempre. Esto es la bandeja que los ordena.
 */

import type {
  Conversation,
  ConversationKind,
  Conversations,
  MeetMessageKind,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import type { Notify } from '../../core/events.js'
import { id as idSchema, parse } from '../../core/validation.js'
import type { BoardsService } from '../boards/index.js'
import type { HelpService } from '../help/index.js'
import type { ReplicaRepository } from '../replica/index.js'

/**
 * El número de un trozo de id de evento (`board:12`, `help:booking:7`), o `-1`
 * si no lo es: así un id a medias (`help:booking`) no llega a la base como
 * `NaN`, que libsql rechaza con un error interno.
 */
const numberOf = (part: string | undefined): number =>
  /^\d{1,12}$/.test(part ?? '') ? Number(part) : -1
import type { TherapyService } from '../therapy/index.js'
import { isoAt } from '../../core/time.js'

/** Conversaciones que se devuelven: las de actividad más reciente. */
const MAX_CONVERSATIONS = 100
/** Lo que se enseña del último mensaje en la lista. */
const SNIPPET = 80
/** Lo más lejos que se puede poner un recordatorio. */
export const REMIND_MAX_DAYS = 30
/** Recordatorios que reparte cada vuelta del trabajo. */
const REMIND_BATCH = 200
const DAY = 24 * 60 * 60_000

const chatId = z.string().regex(/^[a-z_]+(:[A-Za-z0-9-]+){1,3}$/, 'conversación no válida')

const markSchema = z.object({
  id: chatId,
  read: z.boolean().optional(),
  pending: z.boolean().optional(),
  remindAt: z.iso.datetime({ error: 'la hora no es válida' }).nullable().optional(),
  projectId: idSchema.nullable().optional(),
})

type ConversationsOptions = {
  db: Db
  replica: ReplicaRepository
  boards: BoardsService
  therapy: TherapyService
  help: HelpService
  online?: () => Promise<Set<string>>
  notify: Notify
  now: () => number
  /** Corta con `forbidden` si esa persona no participa en ese chat. */
  assertParticipant: (actor: Actor, userId: number | null, id: string) => Promise<void>
  /** A quién puede ver `actor` (mundos separados, `docs/piscineros.md`). */
  seerOf: (actor: Actor) => Promise<(login: string) => boolean>
}

/** De qué es un chat, por cómo empieza su id. */
export function kindOf(id: string): ConversationKind {
  const prefix = id.split(':')[0]

  if (prefix === 'dm') return 'direct'
  if (prefix === 'group' || prefix === 'therapy') return 'group'
  if (prefix === 'board') return 'board'

  return prefix === 'help' ? 'help' : 'event'
}

/** Con quién es una conversación directa, vista por `me`. `null` si no es directa. */
export function peerOf(id: string, me: string): string | null {
  const [prefix, first, second] = id.split(':')

  if (prefix !== 'dm' || first === undefined || second === undefined) return null

  return first === me ? second : first
}

export function createConversations(options: ConversationsOptions) {
  const { db, replica, boards, therapy, help, notify, now } = options
  const iso = (at = now()): string => isoAt(at)
  const marks = (count: number): string => Array.from({ length: count }, () => '?').join(', ')

  /** Los títulos de las conversaciones que no son directas, hasta donde se sabe. */
  async function titles(actor: Actor, ids: readonly string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>()
    const some = (kind: ConversationKind): boolean => ids.some((id) => kindOf(id) === kind)
    // Solo se pregunta a quien hace falta: quien no tiene chats de pizarras no
    // paga la lista de pizarras.
    const [boardList, groupList] = await Promise.all([
      some('board') ? boards.list(actor).catch(() => []) : [],
      some('group') ? therapy.list(actor).catch(() => []) : [],
    ])

    for (const id of ids) {
      const [, second, third] = id.split(':')
      const kind = kindOf(id)

      if (kind === 'board') {
        const board = boardList.find((entry) => entry.id === numberOf(second))

        if (board !== undefined) found.set(id, board.title)
      } else if (kind === 'group') {
        const group = groupList.find((entry) => entry.id === numberOf(second))

        if (group?.projectName !== null && group !== undefined) found.set(id, group.projectName)
      } else if (kind === 'help' && second === 'booking') {
        // Una reserva que ya no existe o no es suya: se queda sin título.
        const session = await help.session(actor, numberOf(third)).catch(() => null)

        if (session !== null) found.set(id, session.event.title)
      }
    }

    return found
  }

  /** El último mensaje de un chat y el último que no es de `login`. */
  async function edges(id: string, login: string): Promise<{ last: number; lastOther: number }> {
    const result = await db.execute({
      sql: `SELECT COALESCE(MAX(id), 0) AS last,
                   COALESCE(MAX(CASE WHEN login <> ? THEN id END), 0) AS other
            FROM event_messages WHERE event_id = ?`,
      args: [login, id],
    })

    return {
      last: toNumber(result.rows[0]?.last ?? 0),
      lastOther: toNumber(result.rows[0]?.other ?? 0),
    }
  }

  /** Cambia columnas de la fila de esa persona y ese chat, creándola si no existe. */
  async function upsert(
    login: string,
    id: string,
    changes: Partial<{
      read_upto: number
      pending: number
      remind_at: string | null
      project_id: number | null
    }>,
  ): Promise<void> {
    const columns = Object.keys(changes) as (keyof typeof changes)[]

    if (columns.length === 0) return

    const values = columns.map((column) => changes[column] ?? null)

    // Los nombres de columna salen de las claves de arriba, no de fuera.
    await db.execute({
      sql: `INSERT INTO conversation_marks (login, chat_id, ${columns.join(', ')}, updated_at)
            VALUES (?, ?, ${marks(columns.length)}, ?)
            ON CONFLICT (login, chat_id) DO UPDATE SET
              ${columns.map((column) => `${column} = excluded.${column}`).join(', ')},
              updated_at = excluded.updated_at`,
      args: [login, id, ...values, iso()],
    })
  }

  return {
    /**
     * Todas las conversaciones de alguien, la de actividad más reciente primero.
     *
     * Son suyas las directas en las que está, los chats donde ha escrito, los
     * que le han dejado un aviso y los que ha marcado.
     */
    async list(actor: Actor): Promise<Conversations> {
      const me = actor.login
      const mine = await db.execute({
        sql: `SELECT chat, MAX(at) AS at FROM (
                SELECT event_id AS chat, MAX(created_at) AS at FROM event_messages
                  WHERE login = ? OR event_id LIKE ? OR event_id LIKE ? GROUP BY event_id
                UNION ALL
                SELECT ref, MAX(updated_at) FROM notices
                  WHERE login = ? AND kind = 'chat' GROUP BY ref
                UNION ALL
                SELECT chat_id, updated_at FROM conversation_marks WHERE login = ?
              ) GROUP BY chat ORDER BY at DESC LIMIT ?`,
        args: [me, `dm:${me}:%`, `dm:%:${me}`, me, me, MAX_CONVERSATIONS],
      })
      const sees = await options.seerOf(actor)
      // Un chat directo con alguien del otro mundo no sale en la lista.
      const ids = mine.rows
        .map((row) => toText(row.chat))
        .filter((id) => {
          const peer = peerOf(id, me)

          return peer === null || sees(peer)
        })

      if (ids.length === 0) return { items: [] }

      const list = marks(ids.length)
      const [lasts, noted, pendingNotices, unreadByMark] = await Promise.all([
        db.execute({
          sql: `SELECT m.event_id, m.login, m.kind, m.body, m.created_at FROM event_messages m
                JOIN (SELECT MAX(id) AS id FROM event_messages
                      WHERE event_id IN (${list}) GROUP BY event_id) last ON last.id = m.id`,
          args: ids,
        }),
        db.execute({
          sql: `SELECT chat_id, pending, remind_at, project_id FROM conversation_marks
                WHERE login = ? AND chat_id IN (${list})`,
          args: [me, ...ids],
        }),
        // Quien nunca ha abierto un chat no tiene hasta dónde ha leído: lo que
        // tiene sin ver es lo que dice su aviso.
        db.execute({
          sql: `SELECT ref, SUM(count) AS total FROM notices
                WHERE login = ? AND kind = 'chat' AND read_at IS NULL AND ref IN (${list})
                GROUP BY ref`,
          args: [me, ...ids],
        }),
        db.execute({
          sql: `SELECT m.event_id, COUNT(*) AS total FROM event_messages m
                JOIN conversation_marks k ON k.chat_id = m.event_id AND k.login = ?
                WHERE m.event_id IN (${list}) AND m.login <> ? AND m.id > k.read_upto
                GROUP BY m.event_id`,
          args: [me, ...ids, me],
        }),
      ])
      const lastOf = new Map(lasts.rows.map((row) => [toText(row.event_id), row]))
      const markOf = new Map(noted.rows.map((row) => [toText(row.chat_id), row]))
      const fromNotice = new Map(
        pendingNotices.rows.map((row) => [toText(row.ref), toNumber(row.total)]),
      )
      const fromMark = new Map(
        unreadByMark.rows.map((row) => [toText(row.event_id), toNumber(row.total)]),
      )
      const peers = ids.flatMap((id) => peerOf(id, me) ?? [])
      const projectIds = [
        ...new Set(
          noted.rows.flatMap((row) => (row.project_id === null ? [] : toNumber(row.project_id))),
        ),
      ]
      const [images, online, named, projects] = await Promise.all([
        replica.imagesOf(peers),
        options.online?.() ?? new Set<string>(),
        titles(actor, ids),
        replica.projectInfo(projectIds),
      ])

      return {
        items: ids.map((id): Conversation => {
          const peer = peerOf(id, me)
          const last = lastOf.get(id)
          const mark = markOf.get(id)
          const projectId =
            mark?.project_id === null || mark === undefined ? null : toNumber(mark.project_id)
          const project = projectId === null ? undefined : projects.get(projectId)
          const body = typeof last?.body === 'string' ? last.body : null

          return {
            id,
            kind: kindOf(id),
            title: peer ?? named.get(id) ?? null,
            peer,
            image: peer === null ? null : (images.get(peer) ?? null),
            online: peer !== null && online.has(peer),
            // Si lo último lo escribió alguien del otro mundo, no se dice quién ni qué.
            last:
              last === undefined || !sees(toText(last.login))
                ? null
                : {
                    from: toText(last.login),
                    body: body === null ? null : body.slice(0, SNIPPET),
                    kind: toText(last.kind) as MeetMessageKind,
                    at: toText(last.created_at),
                  },
            unread: mark === undefined ? (fromNotice.get(id) ?? 0) : (fromMark.get(id) ?? 0),
            pending: mark !== undefined && toNumber(mark.pending) === 1,
            remindAt: typeof mark?.remind_at === 'string' ? mark.remind_at : null,
            project:
              projectId === null || project === undefined
                ? null
                : { id: projectId, name: project.name },
          }
        }),
      }
    },

    /**
     * Esa persona ha visto el chat hasta el final. Lo llama la lectura del
     * hilo: abrir una conversación es leerla.
     */
    async seen(login: string, id: string): Promise<void> {
      await upsert(login, id, { read_upto: (await edges(id, login)).last })
    },

    /**
     * Cambia lo que alguien tiene apuntado de una conversación suya.
     *
     * @throws {DomainError} `forbidden` si no participa en ella; `invalid_input`
     *   si el recordatorio no es para el futuro o pasa de `REMIND_MAX_DAYS`, o
     *   si el proyecto no existe.
     */
    async mark(actor: Actor, userId: number | null, input: unknown): Promise<Conversations> {
      const change = parse(markSchema, input)

      await options.assertParticipant(actor, userId, change.id)

      const changes: Parameters<typeof upsert>[2] = {}

      if (change.read !== undefined) {
        const { last, lastOther } = await edges(change.id, actor.login)

        // "No leída" deja sin ver el último mensaje que no es suyo. Si nadie
        // más ha escrito, no hay nada que dejar sin leer.
        changes.read_upto = change.read ? last : lastOther === 0 ? last : lastOther - 1
      }
      if (change.pending !== undefined) {
        changes.pending = change.pending ? 1 : 0
      }
      if (change.remindAt !== undefined) {
        const at = change.remindAt === null ? null : Date.parse(change.remindAt)

        if (at !== null && (at <= now() || at > now() + REMIND_MAX_DAYS * DAY)) {
          throw domainError(
            'invalid_input',
            `El recordatorio tiene que ser para más adelante, y a no más de ${REMIND_MAX_DAYS} días`,
          )
        }

        changes.remind_at = at === null ? null : iso(at)
        // Pedir que te la recuerden es decir que la tienes pendiente.
        if (at !== null && change.pending === undefined) changes.pending = 1
      }
      if (change.projectId !== undefined) {
        if (change.projectId !== null && (await replica.projectName(change.projectId)) === null) {
          throw domainError('invalid_input', 'Ese proyecto no existe')
        }

        changes.project_id = change.projectId
      }

      await upsert(actor.login, change.id, changes)

      return this.list(actor)
    },

    /**
     * Reparte los recordatorios a los que les ha llegado la hora: deja un aviso
     * en el buzón de quien lo pidió y vacía la hora, para no repetirlo.
     *
     * @returns Cuántos ha repartido.
     */
    async remind(): Promise<number> {
      const due = await db.execute({
        sql: `SELECT login, chat_id FROM conversation_marks
              WHERE remind_at IS NOT NULL AND remind_at <= ? ORDER BY remind_at LIMIT ?`,
        args: [iso(), REMIND_BATCH],
      })

      for (const row of due.rows) {
        const login = toText(row.login)
        const id = toText(row.chat_id)
        const peer = peerOf(id, login)

        // Primero se vacía la hora: si el aviso fallara, es mejor perder un
        // recordatorio que repetirlo cada minuto.
        await db.execute({
          sql: `UPDATE conversation_marks SET remind_at = NULL, pending = 1, updated_at = ?
                WHERE login = ? AND chat_id = ?`,
          args: [iso(), login, id],
        })
        await notify({
          to: [login],
          kind: 'chat_reminder',
          ref: id,
          ...(peer === null ? {} : { from: peer }),
        })
      }

      return due.rows.length
    },
  }
}
