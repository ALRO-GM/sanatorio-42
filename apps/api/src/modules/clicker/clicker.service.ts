/**
 * Code Clicker: el secreto de la cruz y la partida de quien eligió la roja.
 *
 * La API no juega: cuenta pulsaciones de la cruz, guarda qué pastilla se eligió
 * (una sola vez, sin vuelta atrás) y custodia la partida y las cifras de la
 * clasificación. Las cifras las manda la web y no se comprueban: es un juego.
 */

import type {
  ClickerBoard,
  ClickerPlayer,
  ClickerRank,
  ClickerSaved,
  ClickerState,
  ClickerUsage,
  Pill,
} from '@sanatorio/contracts'
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
  rev: z.number().int().min(0),
  session: z.string().min(8).max(64),
  total: figure,
  perSecond: figure,
  achievements: z.number().int().min(0).max(10_000),
  prestige: z.number().int().min(0).max(1e12),
})

const usageSchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) })
const DAY_MS = 24 * 60 * 60_000
/** La clave con la que la web apunta el tiempo pasado en el juego. */
const SECTION = 'nav.clicker'

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
  /** El tiempo que cada quien ha tenido abierta una sección: lo sabe `usage`. */
  timeOn?: (
    key: string,
    from: string,
    to: string,
  ) => Promise<Map<string, { seen: number; back: number; hidden: number }>>
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
        rev: toNumber(found?.rev ?? 0),
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
     * Solo entra si viene de la pestaña que hizo el último guardado o si partió
     * de la `rev` que hay: así un dispositivo que se quedó abierto con una
     * partida vieja no pisa la que se siguió en otro. Lo de la pestaña es para
     * que no se rechace a sí misma si se le pierde una respuesta.
     *
     * @throws {DomainError} `forbidden` si no eligió la roja; `conflict` si la
     *   partida se ha seguido en otro sitio.
     */
    async save(actor: Actor, input: unknown): Promise<ClickerSaved> {
      const sent = parse(saveSchema, input)

      if (pillOf(await row(actor.login)) !== 'red') {
        throw domainError('forbidden', 'Esto no existe')
      }

      const result = await db.execute({
        sql: `UPDATE clicker SET save = ?, total = MAX(total, ?), per_second = ?,
                achievements = ?, prestige = ?, updated_at = ?, holder = ?, rev = rev + 1
              WHERE login = ? AND (rev = ? OR holder = ?)
              RETURNING rev`,
        args: [
          sent.save,
          sent.total,
          sent.perSecond,
          sent.achievements,
          sent.prestige,
          iso(),
          sent.session,
          actor.login,
          sent.rev,
          sent.session,
        ],
      })
      const saved = result.rows[0]

      if (saved === undefined) {
        throw domainError('conflict', 'Esta partida se ha seguido en otro dispositivo')
      }

      return { rev: toNumber(saved.rev) }
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

    /**
     * El uso del juego, de todo el mundo y persona a persona. Solo para quien
     * administra la web.
     *
     * @param input `days`: los días hacia atrás que cubre el tiempo de juego
     *   (por defecto 7). Lo demás es de siempre.
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async usage(actor: Actor, input: unknown): Promise<ClickerUsage> {
      if (!actor.admin) {
        throw domainError('forbidden', 'Solo para quien administra la web')
      }

      const { days } = parse(usageSchema, input)
      const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)
      const from = dayOf(now() - (days - 1) * DAY_MS)
      const [result, time] = await Promise.all([
        // De la partida solo se mira cuánto se ha pulsado la tecla, y solo si
        // se entiende: la escribe la web y aquí no se comprueba.
        db.execute(
          `SELECT login, plus, pill, total, per_second, achievements, prestige, rev, updated_at,
                  save IS NOT NULL AS played,
                  CASE WHEN json_valid(save) THEN json_extract(save, '$.clicks') END AS clicks
           FROM clicker ORDER BY total DESC, plus DESC, login`,
        ),
        options.timeOn?.(SECTION, from, dayOf(now())) ?? new Map<string, never>(),
      ])
      const totals: ClickerUsage['totals'] = {
        pressed: result.rows.length,
        reached: 0,
        red: 0,
        blue: 0,
        players: 0,
        active: 0,
        total: 0,
        saves: 0,
        seen: 0,
        back: 0,
        hidden: 0,
      }
      const players = result.rows.map((entry): ClickerPlayer => {
        const login = toText(entry.login)
        const pill = pillOf(entry)
        const total = Number(entry.total)
        const spent = time.get(login) ?? { seen: 0, back: 0, hidden: 0 }
        const player: ClickerPlayer = {
          login,
          plus: toNumber(entry.plus),
          pill,
          level: clickerLevel(total),
          total,
          perSecond: Number(entry.per_second),
          achievements: toNumber(entry.achievements),
          prestige: toNumber(entry.prestige),
          clicks: typeof entry.clicks === 'number' ? Math.max(0, Math.floor(entry.clicks)) : 0,
          saves: toNumber(entry.rev),
          updatedAt: toText(entry.updated_at),
          ...spent,
        }

        totals.reached += Number(player.plus >= PLUS_GOAL)
        totals.red += Number(pill === 'red')
        totals.blue += Number(pill === 'blue')
        totals.players += Number(toNumber(entry.played) === 1)
        totals.active += Number(player.updatedAt.slice(0, 10) >= from)
        totals.total += total
        totals.saves += player.saves
        totals.seen += spent.seen
        totals.back += spent.back
        totals.hidden += spent.hidden

        return player
      })

      return { days, totals, players }
    },
  }
}

export type ClickerService = ReturnType<typeof createClickerService>
