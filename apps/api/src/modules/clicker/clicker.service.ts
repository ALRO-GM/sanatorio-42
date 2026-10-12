/**
 * Code Clicker: el secreto de la cruz y la partida de quien eligió la roja.
 *
 * La API no juega: cuenta pulsaciones de la cruz, guarda qué pastilla se eligió
 * (una sola vez, sin vuelta atrás) y custodia la partida y las cifras de la
 * clasificación. Las cifras las manda la web y no se comprueban: es un juego.
 */

import type { ClickerBoard, ClickerRank, ClickerState, Pill } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'

/** Pulsaciones de la cruz que abren la pregunta de las pastillas. */
export const PLUS_GOAL = 100
/** Pulsaciones que caben en un envío: la web las junta para no pedir una a una. */
const MAX_PLUS_PER_SEND = 25
/** Lo que puede pesar una partida guardada. */
const MAX_SAVE_BYTES = 80_000
const BOARD_SIZE = 25
/** Nombres que se mandan para las noticias del juego. */
const NAMES = 12

const plusSchema = z.object({ count: z.number().int().min(1).max(MAX_PLUS_PER_SEND) })
const pillSchema = z.object({ pill: z.enum(['red', 'blue']) })
const figure = z.number().min(0).max(1e300)
const saveSchema = z.object({
  save: z.string().min(2).max(MAX_SAVE_BYTES),
  total: figure,
  perSecond: figure,
  achievements: z.number().int().min(0).max(10_000),
  prestige: z.number().int().min(0).max(1e12),
})

/**
 * El nivel dentro del juego: tres por cada cero que se le añade al total. Mil
 * líneas son el nivel 9; un millón, el 18.
 */
export function clickerLevel(total: number): number {
  return Math.floor(3 * Math.log10(1 + Math.max(0, total)))
}

export type ClickerServiceOptions = {
  db: Db
  replica: ReplicaRepository
  /** Quién corrige más en un campus, para las noticias del juego. */
  topCorrectors?: (campusId: number, limit: number) => Promise<string[]>
  now?: () => number
}

export function createClickerService(options: ClickerServiceOptions) {
  const { db, replica } = options
  const now = options.now ?? Date.now
  const iso = (): string => new Date(now()).toISOString()

  const row = async (login: string): Promise<Record<string, unknown> | undefined> =>
    (await db.execute({ sql: 'SELECT * FROM clicker WHERE login = ?', args: [login] })).rows[0]

  const pillOf = (found: Record<string, unknown> | undefined): Pill | null =>
    found?.pill === 'red' || found?.pill === 'blue' ? found.pill : null

  return {
    /** Por dónde va alguien en el secreto, con su partida si la tiene. */
    async state(actor: Actor): Promise<ClickerState> {
      const found = await row(actor.login)
      const pill = pillOf(found)

      return {
        plus: toNumber(found?.plus ?? 0),
        pill,
        save: typeof found?.save === 'string' ? found.save : null,
        // Los nombres solo hacen falta dentro del juego.
        names:
          pill === 'red'
            ? ((await options.topCorrectors?.(actor.campusId, NAMES).catch(() => [])) ?? [])
            : [],
      }
    },

    /**
     * Suma pulsaciones de la cruz. Quien eligió la azul ya no cuenta: para esa
     * persona el secreto no existe.
     */
    async plus(actor: Actor, input: unknown): Promise<{ plus: number; pill: Pill | null }> {
      const { count } = parse(plusSchema, input)
      const before = await row(actor.login)

      if (pillOf(before) !== null) {
        return { plus: toNumber(before?.plus ?? 0), pill: pillOf(before) }
      }

      await db.execute({
        sql: `INSERT INTO clicker (login, plus, updated_at) VALUES (?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET plus = plus + excluded.plus,
                                                updated_at = excluded.updated_at`,
        args: [actor.login, count, iso()],
      })

      return { plus: toNumber(before?.plus ?? 0) + count, pill: null }
    },

    /**
     * Elige pastilla. Solo se puede una vez, y solo al llegar a las cien.
     *
     * @throws {DomainError} `conflict` si aún no ha llegado o ya eligió.
     */
    async choose(actor: Actor, input: unknown): Promise<ClickerState> {
      const { pill } = parse(pillSchema, input)
      const before = await row(actor.login)

      if (toNumber(before?.plus ?? 0) < PLUS_GOAL) {
        throw domainError('conflict', 'Todavía no has llegado hasta aquí')
      }
      if (pillOf(before) !== null) {
        throw domainError('conflict', 'Ya elegiste, y no hay vuelta atrás')
      }

      await db.execute({
        sql: 'UPDATE clicker SET pill = ?, updated_at = ? WHERE login = ?',
        args: [pill, iso(), actor.login],
      })

      return this.state(actor)
    },

    /**
     * Guarda la partida y las cifras de la clasificación.
     *
     * @throws {DomainError} `forbidden` si no eligió la roja.
     */
    async save(actor: Actor, input: unknown): Promise<void> {
      const sent = parse(saveSchema, input)

      if (pillOf(await row(actor.login)) !== 'red') {
        throw domainError('forbidden', 'Esto no existe')
      }

      await db.execute({
        sql: `UPDATE clicker SET save = ?, total = MAX(total, ?), per_second = ?,
                achievements = ?, prestige = ?, updated_at = ? WHERE login = ?`,
        args: [
          sent.save,
          sent.total,
          sent.perSecond,
          sent.achievements,
          sent.prestige,
          iso(),
          actor.login,
        ],
      })
    },

    /**
     * La clasificación: quién ha escrito más código, de cualquier campus.
     *
     * @throws {DomainError} `forbidden` si no eligió la roja.
     */
    async board(actor: Actor): Promise<ClickerBoard> {
      if (pillOf(await row(actor.login)) !== 'red') {
        throw domainError('forbidden', 'Esto no existe')
      }

      const result = await db.execute(
        `SELECT login, total, per_second, achievements, prestige FROM clicker
         WHERE pill = 'red' AND save IS NOT NULL ORDER BY total DESC, login`,
      )
      const images = await replica.imagesOf(
        result.rows.slice(0, BOARD_SIZE).map((entry) => toText(entry.login)),
      )
      const ranks = result.rows.map((entry, index): ClickerRank => {
        const login = toText(entry.login)
        const total = Number(entry.total)

        return {
          rank: index + 1,
          login,
          image: images.get(login) ?? null,
          level: clickerLevel(total),
          total,
          perSecond: Number(entry.per_second),
          achievements: toNumber(entry.achievements),
          prestige: toNumber(entry.prestige),
        }
      })

      return {
        entries: ranks.slice(0, BOARD_SIZE),
        me: ranks.find((rank) => rank.login === actor.login) ?? null,
      }
    },
  }
}

export type ClickerService = ReturnType<typeof createClickerService>
