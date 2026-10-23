/**
 * El buzón de avisos: lo que cada persona tiene que saber porque otra ha hecho
 * algo que le toca.
 *
 * Ningún módulo escribe aquí directamente: cada uno emite un evento `notice`
 * cuando pasa algo (han respondido a tu duda, te han pedido ayuda, hay mensajes
 * en un chat tuyo) y este módulo lo guarda. Así el buzón no se entera de qué es
 * una pizarra, ni las pizarras de que hay un buzón.
 *
 * El texto no se guarda escrito: se guarda qué ha pasado (`kind`), quién y
 * sobre qué, y la web lo redacta en el idioma de quien lo lee.
 */

import type { Notice, NoticeKind, Notices } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { NoticeEvent } from '../../core/events.js'
import { parse } from '../../core/validation.js'
import { inList, listArg } from '../../core/db/sql.js'

export type NoticesServiceOptions = {
  db: Db
  now?: () => number
}

/** Avisos que se devuelven: los últimos. */
const LIST_LIMIT = 60

/** Lo que cabe del título o del mensaje: es un aviso, no el mensaje. */
const TEXT_MAX = 140

const readSchema = z.object({
  /** Los que se dan por leídos. Sin ellos, todos. */
  ids: z.array(z.number().int().positive()).max(200).optional(),
})

const removeSchema = z.union([
  /** Esos avisos, guardados o no. */
  z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) }),
  /** Todos los leídos que no estén guardados. */
  z.object({ read: z.literal(true) }),
])

const saveSchema = z.object({ id: z.number().int().positive(), saved: z.boolean() })

export function createNoticesService(options: NoticesServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const iso = (at = now()): string => new Date(at).toISOString()

  async function unread(login: string): Promise<number> {
    const result = await db.execute({
      sql: 'SELECT COUNT(*) AS total FROM notices WHERE login = ? AND read_at IS NULL',
      args: [login],
    })

    return toNumber(result.rows[0]?.total)
  }

  return {
    unread,

    /**
     * Deja un aviso en el buzón de cada destinatario. Quien lo provoca no se
     * avisa a sí. Si esa persona ya tiene sin leer un aviso igual (mismo tipo y
     * mismo asunto), no se le añade otro: se le sube la cuenta y se pone al día.
     */
    async add(notice: NoticeEvent): Promise<void> {
      const at = iso()
      const text =
        notice.text === undefined || notice.text === null || notice.text.trim() === ''
          ? null
          : notice.text.trim().slice(0, TEXT_MAX)
      const from = notice.from ?? null

      for (const login of new Set(notice.to)) {
        if (login === from) continue

        const updated = await db.execute({
          sql: `UPDATE notices SET count = count + 1, from_login = ?, text = ?, updated_at = ?
                WHERE login = ? AND kind = ? AND ref = ? AND read_at IS NULL`,
          args: [from, text, at, login, notice.kind, notice.ref],
        })

        if (updated.rowsAffected === 0) {
          await db.execute({
            sql: `INSERT INTO notices (login, kind, ref, from_login, text, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [login, notice.kind, notice.ref, from, text, at, at],
          })
        }
      }
    },

    /** El buzón de quien pregunta: lo que no ha leído primero y, dentro de eso, lo más reciente. */
    async list(actor: Actor): Promise<Notices> {
      const result = await db.execute({
        sql: `SELECT id, kind, ref, from_login, text, count, updated_at, read_at, saved FROM notices
              WHERE login = ? ORDER BY (read_at IS NULL) DESC, updated_at DESC, id DESC LIMIT ?`,
        args: [actor.login, LIST_LIMIT],
      })

      return {
        unread: await unread(actor.login),
        items: result.rows.map((row): Notice => ({
          id: toNumber(row.id),
          kind: toText(row.kind) as NoticeKind,
          ref: toText(row.ref),
          from: typeof row.from_login === 'string' ? row.from_login : null,
          text: typeof row.text === 'string' ? row.text : null,
          count: toNumber(row.count),
          at: toText(row.updated_at),
          read: row.read_at !== null,
          saved: toNumber(row.saved) === 1,
        })),
      }
    },

    /**
     * Da avisos por leídos: los de `ids`, o todos si no se dice cuáles. Solo
     * toca los de quien pregunta.
     */
    async read(actor: Actor, input: unknown): Promise<Notices> {
      const { ids } = parse(readSchema, input ?? {})

      if (ids === undefined) {
        await db.execute({
          sql: 'UPDATE notices SET read_at = ? WHERE login = ? AND read_at IS NULL',
          args: [iso(), actor.login],
        })
      } else if (ids.length > 0) {
        await db.execute({
          sql: `UPDATE notices SET read_at = ? WHERE login = ? AND read_at IS NULL
                AND ${inList('id')}`,
          args: [iso(), actor.login, listArg(ids)],
        })
      }

      return this.list(actor)
    },

    /**
     * Borra avisos de quien pregunta: los que diga, o todos los leídos que no
     * haya guardado. Solo toca los suyos. Devuelve el buzón.
     */
    async remove(actor: Actor, input: unknown): Promise<Notices> {
      const which = parse(removeSchema, input ?? {})

      if ('ids' in which) {
        await db.execute({
          sql: `DELETE FROM notices WHERE login = ?
                AND ${inList('id')}`,
          args: [actor.login, listArg(which.ids)],
        })
      } else {
        await db.execute({
          sql: 'DELETE FROM notices WHERE login = ? AND read_at IS NOT NULL AND saved = 0',
          args: [actor.login],
        })
      }

      return this.list(actor)
    },

    /** Guarda o deja de guardar un aviso de quien pregunta. Devuelve el buzón. */
    async save(actor: Actor, input: unknown): Promise<Notices> {
      const { id, saved } = parse(saveSchema, input)

      await db.execute({
        sql: 'UPDATE notices SET saved = ? WHERE id = ? AND login = ?',
        args: [saved ? 1 : 0, id, actor.login],
      })

      return this.list(actor)
    },

    /**
     * Da por leídos los avisos de un asunto: quien abre el chat de una pizarra
     * ya ha visto sus mensajes, sin tener que pasar por el buzón.
     */
    /** Da por leídos los avisos de un asunto ya atendido, de todo el mundo. */
    async settle(kind: NoticeKind, ref: string): Promise<void> {
      await db.execute({
        sql: 'UPDATE notices SET read_at = ? WHERE kind = ? AND ref = ? AND read_at IS NULL',
        args: [iso(), kind, ref],
      })
    },

    async readAbout(login: string, kind: NoticeKind, ref: string): Promise<void> {
      await db.execute({
        sql: `UPDATE notices SET read_at = ? WHERE login = ? AND kind = ? AND ref = ?
              AND read_at IS NULL`,
        args: [iso(), login, kind, ref],
      })
    },
  }
}

export type NoticesService = ReturnType<typeof createNoticesService>
