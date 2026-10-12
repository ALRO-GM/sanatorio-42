/**
 * Code Clicker: el secreto de la cruz y la partida de quien eligió la roja.
 *
 * La API no juega: cuenta pulsaciones de la cruz, guarda qué pastilla se eligió
 * (una sola vez, sin vuelta atrás) y custodia la partida y las cifras de la
 * clasificación. Las cifras las manda la web y no se comprueban: es un juego.
 */

import type {
  ClickerAlert,
  ClickerBoard,
  ClickerCapital,
  ClickerCheat,
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
import { clean, coarse, FINE_FOR_S, HOURLY_FOR_S, jump, thin } from './capital.rules.js'
import { hackerTitle, readSave, SALE_FROM, verdict } from './cheat.rules.js'

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
  // Una pestaña que se quedó abierta con la web de antes no lo manda.
  spent: figure.default(0),
  // El capital segundo a segundo desde el último guardado.
  capital: z
    .array(z.tuple([z.number().int().min(0), figure]))
    .max(1200)
    .default([]),
})
/** Copias de partidas rechazadas que se guardan de cada persona. */
const CHEATS_KEPT = 10
/** Puntos del historial de capital que se mandan de una vez. */
const CAPITAL_POINTS = 300
const capitalSchema = z.object({
  from: z.coerce.number().int().min(0).optional(),
  to: z.coerce.number().int().min(0).optional(),
})
const idSchema = z.coerce.number().int().min(1)
const loginSchema = z.object({ login: z.string().regex(/^[a-z0-9-]{1,30}$/) })
/**
 * Tras pillar a alguien, lo que tarda en poder contarle otra. La web vuelve a
 * la partida buena en cuanto se le rechaza un guardado; esto es para que una
 * pestaña que no lo haga no sume una trampa por minuto.
 */
const CAUGHT_COOLDOWN_MS = 5 * 60_000

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
  /**
   * Pone un título en el banner de alguien y devuelve el que tenía elegido
   * (`null` si ninguno): lo sabe hacer `profile`.
   */
  brand?: (login: string, title: string) => Promise<string | null>
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
        caught: toNumber(found?.caught ?? 0),
        saleDue: toNumber(found?.sale_due ?? 0) === 1,
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
     * Una partida que no cuadra (`cheat.rules.ts`) no se guarda: se apunta la
     * trampa y se contesta `refused`, para que la web vuelva a la buena. A la
     * tercera queda pendiente vender todo lo que se tiene, y hasta que no llegue
     * una partida sin edificios no entra ninguna.
     *
     * @throws {DomainError} `forbidden` si no eligió la roja; `conflict` si la
     *   partida se ha seguido en otro sitio.
     */
    async save(actor: Actor, input: unknown): Promise<ClickerSaved> {
      const sent = parse(saveSchema, input)
      const found = await row(actor.login)

      if (pillOf(found) !== 'red') {
        throw domainError('forbidden', 'Esto no existe')
      }

      const ledger = readSave(sent.save)

      if (ledger === null) {
        throw domainError('invalid_input', 'Eso no es una partida')
      }

      const rev = toNumber(found?.rev ?? 0)
      const stale = (): never => {
        throw domainError('conflict', 'Esta partida se ha seguido en otro dispositivo')
      }

      // Antes que nada: una partida vieja de otro dispositivo no es una trampa.
      if (rev !== sent.rev && found?.holder !== sent.session) stale()

      let caught = toNumber(found?.caught ?? 0)
      const why = verdict(
        {
          total: Number(found?.last_total ?? 0),
          perSecond: Number(found?.per_second ?? 0),
          at: Date.parse(toText(found?.updated_at ?? iso())),
          ledger: typeof found?.save === 'string' ? readSave(found.save) : null,
        },
        sent,
        ledger,
        now(),
      )

      if (why !== null) {
        const last = typeof found?.caught_at === 'string' ? Date.parse(found.caught_at) : 0

        if (now() - last >= CAUGHT_COOLDOWN_MS) {
          caught += 1
          await db.execute({
            sql: `UPDATE clicker SET caught = ?, caught_at = ?, caught_why = ?,
                    sale_due = MAX(sale_due, ?) WHERE login = ?`,
            args: [caught, iso(), why, Number(caught >= SALE_FROM), actor.login],
          })

          const title = hackerTitle(caught)
          // El título es un adorno: si no se puede poner, la trampa cuenta igual.
          const before =
            title === null
              ? null
              : ((await options.brand?.(actor.login, title).catch(() => null)) ?? null)

          // Se guarda la partida tal como llegó, por si hay que indultarla.
          await db.execute({
            sql: `INSERT INTO clicker_cheats
                    (login, at, why, save, total, per_second, achievements, prestige, title_before)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              actor.login,
              iso(),
              why,
              sent.save,
              sent.total,
              sent.perSecond,
              sent.achievements,
              sent.prestige,
              before,
            ],
          })
          await db.execute({
            sql: `DELETE FROM clicker_cheats WHERE login = ? AND id NOT IN
                    (SELECT id FROM clicker_cheats WHERE login = ? ORDER BY id DESC LIMIT ?)`,
            args: [actor.login, actor.login, CHEATS_KEPT],
          })
        } else {
          // La misma trampa, que sigue llegando: la copia se queda con lo último.
          await db.execute({
            sql: `UPDATE clicker_cheats SET save = ?, total = ?, per_second = ?, achievements = ?,
                    prestige = ?
                  WHERE id = (SELECT MAX(id) FROM clicker_cheats WHERE login = ?)`,
            args: [
              sent.save,
              sent.total,
              sent.perSecond,
              sent.achievements,
              sent.prestige,
              actor.login,
            ],
          })
        }

        return { rev, caught, refused: true }
      }

      // Con la venta pendiente no vale seguir con los edificios puestos.
      if (toNumber(found?.sale_due ?? 0) === 1 && ledger.holdings > 0) {
        return { rev, caught, refused: true }
      }

      const result = await db.execute({
        sql: `UPDATE clicker SET save = ?, total = MAX(total, ?), last_total = ?, per_second = ?,
                achievements = ?, prestige = ?, updated_at = ?, holder = ?, rev = rev + 1,
                sale_due = 0
              WHERE login = ? AND (rev = ? OR holder = ?)
              RETURNING rev`,
        args: [
          sent.save,
          sent.total,
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

      if (saved === undefined) stale()

      // El historial de capital, y el aviso si hay un salto que no se explica.
      const samples = clean(sent.capital, now())

      if (samples.length > 0) {
        const leap = jump(samples)
        const before = typeof found?.save === 'string' ? readSave(found.save) : null

        await db.batch(
          [
            ...coarse(samples).map(([at, capital]) => ({
              sql: `INSERT INTO clicker_capital (login, at, capital) VALUES (?, ?, ?)
                    ON CONFLICT (login, at) DO UPDATE SET capital = excluded.capital`,
              args: [actor.login, at, capital],
            })),
            ...(leap === null
              ? []
              : [
                  {
                    sql: `INSERT INTO clicker_alerts
                            (login, at, seconds, from_capital, to_capital, golden, trace)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    args: [
                      actor.login,
                      new Date(leap.at * 1000).toISOString(),
                      leap.seconds,
                      leap.from,
                      leap.to,
                      // Una dorada abierta desde el último guardado lo explica casi siempre.
                      Number(ledger.golden !== (before?.golden ?? 0)),
                      JSON.stringify(leap.trace),
                    ],
                  },
                ]),
          ],
          'write',
        )
      }

      return { rev: toNumber(saved?.rev ?? rev), caught, refused: false }
    },

    /**
     * El historial de capital de alguien entre dos momentos (segundos desde
     * 1970; sin ellos, entero), del más antiguo al más nuevo. Va en
     * `CAPITAL_POINTS` puntos como mucho: al acercarse a un tramo se ve con
     * más detalle, hasta el que se guarde de esas fechas.
     */
    async capitalOf(login: string, input: unknown = {}): Promise<ClickerCapital> {
      const { from, to } = parse(capitalSchema, input)
      const [result, span] = await Promise.all([
        db.execute({
          sql: `SELECT at, capital FROM clicker_capital
                WHERE login = ? AND at >= ? AND at <= ? ORDER BY at`,
          args: [login, from ?? 0, to ?? Number.MAX_SAFE_INTEGER],
        }),
        db.execute({
          sql: 'SELECT MIN(at) AS first, MAX(at) AS last FROM clicker_capital WHERE login = ?',
          args: [login],
        }),
      ])
      const edge = (value: unknown): number | null => (value === null ? null : toNumber(value))

      return {
        first: edge(span.rows[0]?.first ?? null),
        last: edge(span.rows[0]?.last ?? null),
        points: thin(
          result.rows.map((entry): [number, number] => [toNumber(entry.at), Number(entry.capital)]),
          CAPITAL_POINTS,
        ),
      }
    },

    /** `GET /clicker/capital?from=&to=`: tu historial. */
    async capital(actor: Actor, input: unknown = {}): Promise<ClickerCapital> {
      return this.capitalOf(actor.login, input)
    },

    /**
     * El historial de otra persona. Solo para quien administra la web.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async capitalFor(actor: Actor, input: unknown): Promise<ClickerCapital> {
      if (!actor.admin) throw domainError('forbidden', 'Solo para quien administra la web')

      return this.capitalOf(parse(loginSchema.loose(), input).login, input)
    },

    /**
     * Indulta una trampa: la partida que se rechazó pasa a ser la que está en
     * curso, se descuenta de las veces que le han pillado, el banner vuelve a
     * como estaba y la copia se borra. Solo para quien administra la web.
     *
     * La partida queda sin dueño (`holder`), así que una pestaña que la tuviera
     * abierta ya no guarda encima: tiene que cargarla.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin;
     *   `not_found` si esa copia no existe.
     */
    async pardon(actor: Actor, input: unknown): Promise<void> {
      if (!actor.admin) throw domainError('forbidden', 'Solo para quien administra la web')

      const id = parse(idSchema, input)
      const copy = (
        await db.execute({ sql: 'SELECT * FROM clicker_cheats WHERE id = ?', args: [id] })
      ).rows[0]

      if (copy === undefined) throw domainError('not_found', 'Esa trampa ya no está')

      const login = toText(copy.login)
      const left = Math.max(0, toNumber((await row(login))?.caught ?? 0) - 1)

      await db.batch(
        [
          {
            sql: `UPDATE clicker SET save = ?, total = MAX(total, ?), last_total = ?,
                    per_second = ?, achievements = ?, prestige = ?, updated_at = ?,
                    holder = NULL, rev = rev + 1, sale_due = 0, caught = ?,
                    caught_at = NULL, caught_why = NULL
                  WHERE login = ?`,
            args: [
              toText(copy.save),
              Number(copy.total),
              Number(copy.total),
              Number(copy.per_second),
              toNumber(copy.achievements),
              toNumber(copy.prestige),
              iso(),
              left,
              login,
            ],
          },
          { sql: 'DELETE FROM clicker_cheats WHERE id = ?', args: [id] },
        ],
        'write',
      )

      // El título que tenía antes; si no había elegido ninguno, al quedarse sin
      // el de hacker el expediente le pone solo el que le toca por nivel.
      const title = typeof copy.title_before === 'string' ? copy.title_before : hackerTitle(left)

      if (title !== null) await options.brand?.(login, title).catch(() => null)
    },

    /**
     * Descarta un aviso de salto ya mirado. Solo para quien administra la web.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async dismiss(actor: Actor, input: unknown): Promise<void> {
      if (!actor.admin) throw domainError('forbidden', 'Solo para quien administra la web')

      await db.execute({
        sql: 'DELETE FROM clicker_alerts WHERE id = ?',
        args: [parse(idSchema, input)],
      })
    },

    /**
     * Aligera el historial de capital sin perderlo: de lo que tiene más de un
     * día se queda un punto por hora (el último), y de lo que tiene más de una
     * semana, uno por día. Así cabe guardarlo para siempre. Lo lanza un trabajo
     * periódico, y repetirlo no cambia nada.
     */
    async compact(): Promise<void> {
      const second = Math.floor(now() / 1000)
      const tiers = [
        { from: second - HOURLY_FOR_S, to: second - FINE_FOR_S, every: 3600 },
        { from: 0, to: second - HOURLY_FOR_S, every: 86_400 },
      ]

      await db.batch(
        tiers.map(({ from, to, every }) => ({
          sql: `DELETE FROM clicker_capital
                WHERE at >= ? AND at < ? AND (login, at) NOT IN
                  (SELECT login, MAX(at) FROM clicker_capital
                   WHERE at >= ? AND at < ? GROUP BY login, at / CAST(? AS INTEGER))`,
          args: [from, to, from, to, every],
        })),
        'write',
      )
    },

    /** Veces que han pillado a alguien haciendo trampas. Para el título del banner. */
    async caughtOf(login: string): Promise<number> {
      return toNumber((await row(login))?.caught ?? 0)
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
      const [result, time, alerts, cheats] = await Promise.all([
        // De la partida solo se mira cuánto se ha pulsado la tecla, y solo si
        // se entiende: la escribe la web y aquí no se comprueba.
        db.execute(
          `SELECT login, plus, pill, total, per_second, achievements, prestige, rev, updated_at,
                  save IS NOT NULL AS played, caught, caught_why, caught_at,
                  CASE WHEN json_valid(save) THEN json_extract(save, '$.clicks') END AS clicks
           FROM clicker ORDER BY total DESC, plus DESC, login`,
        ),
        options.timeOn?.(SECTION, from, dayOf(now())) ?? new Map<string, never>(),
        db.execute('SELECT * FROM clicker_alerts ORDER BY id DESC LIMIT 50'),
        db.execute(
          `SELECT id, login, at, why, total, per_second FROM clicker_cheats ORDER BY id DESC`,
        ),
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
        caught: 0,
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
          caught: toNumber(entry.caught),
          caughtWhy: typeof entry.caught_why === 'string' ? entry.caught_why : null,
          caughtAt: typeof entry.caught_at === 'string' ? entry.caught_at : null,
          ...spent,
        }

        totals.reached += Number(player.plus >= PLUS_GOAL)
        totals.red += Number(pill === 'red')
        totals.blue += Number(pill === 'blue')
        totals.players += Number(toNumber(entry.played) === 1)
        totals.active += Number(player.updatedAt.slice(0, 10) >= from)
        totals.total += total
        totals.saves += player.saves
        totals.caught += Number(player.caught > 0)
        totals.seen += spent.seen
        totals.back += spent.back
        totals.hidden += spent.hidden

        return player
      })

      return {
        days,
        totals,
        players,
        alerts: alerts.rows.map((entry): ClickerAlert => ({
          id: toNumber(entry.id),
          login: toText(entry.login),
          at: toText(entry.at),
          seconds: toNumber(entry.seconds),
          from: Number(entry.from_capital),
          to: Number(entry.to_capital),
          golden: toNumber(entry.golden) === 1,
          trace: JSON.parse(toText(entry.trace)) as [number, number][],
        })),
        cheats: cheats.rows.map((entry): ClickerCheat => ({
          id: toNumber(entry.id),
          login: toText(entry.login),
          at: toText(entry.at),
          why: toText(entry.why),
          total: Number(entry.total),
          perSecond: Number(entry.per_second),
        })),
      }
    },
  }
}

export type ClickerService = ReturnType<typeof createClickerService>
