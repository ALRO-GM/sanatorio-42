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
  ClickerEvidence,
  ClickerGameView,
  ClickerPlayer,
  ClickerRank,
  ClickerReview,
  ClickerSaved,
  ClickerSeizure,
  ClickerState,
  ClickerUsage,
  ClickerCheater,
  ClickerCheatEntry,
  ClickerCheatHow,
  ClickerCheats,
  Pill,
} from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Notify } from '../../core/events.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'
import {
  clean,
  coarse,
  creditedSince,
  FINE_FOR_S,
  HOURLY_FOR_S,
  jump,
  readGifts,
  rememberGifts,
  thin,
} from './capital.rules.js'
import { CLICK_HISTORY_S, overClicked } from './clicks.rules.js'
import type { ClickSample } from './clicks.rules.js'
import { hackerTitle, readSave, giftShare, seizedValue, wealthOf, verdict } from './cheat.rules.js'
import { dayOf, isoAt } from '../../core/time.js'

/** Pulsaciones de la cruz que abren la pregunta de las pastillas. */
const PLUS_GOAL = 42
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
  // Y las pulsaciones contadas, igual: para ver un minuto a toda máquina.
  clicks: z
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
/**
 * Quien no sale en la clasificación (lo pidió): juega igual, pero no ocupa
 * puesto ni cuenta para los de los demás.
 */
const HIDDEN_FROM_BOARD: ReadonlySet<string> = new Set(['albrodri'])

/** Cada cuánto se vuelve a preguntar a 42 lo donado a la bolsa. */
const DONATED_TTL_MS = 24 * 3_600_000
const sanctionSchema = z.object({
  login: z.string().regex(/^[a-z0-9-]{1,30}$/),
  code: z.number().min(0),
  wipe: z.boolean(),
  note: z.string().trim().min(1).max(500),
})
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
  /** Con quién se ha corregido más alguien, en los dos sentidos. */
  partnersOf?: (campusId: number, login: string, limit: number) => Promise<string[]>
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
  /** Para avisar a quien administra de que alguien se ha defendido. */
  notify?: Notify
  /** Quién administra la web: lo sabe `admin`. */
  admins?: () => Promise<readonly string[]>
  now?: () => number
  /**
   * Puntos de evaluación que esa persona ha donado a la bolsa de 42, o `null`
   * si ahora no se puede saber (sin cuota, 42 caído). Se pregunta como mucho
   * una vez al día por persona (`DONATED_TTL_MS`).
   */
  donated?: (login: string) => Promise<number | null>
}

/** Lo que tiene que escribir quien se defiende, como poco. */
const DEFENSE_MIN = 20
const DEFENSE_MAX = 2000

const reviewSchema = z.object({ verdict: z.enum(['cheat', 'likely', 'clean']) })
const defenseSchema = z.object({ answer: z.string().trim().min(DEFENSE_MIN).max(DEFENSE_MAX) })

/** Lee un JSON guardado por nosotros; `null` si falta o no se entiende. */
function stored(value: unknown): unknown {
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function createClickerService(options: ClickerServiceOptions) {
  const { db, replica } = options
  const now = options.now ?? Date.now
  const iso = (): string => isoAt(now())
  const notify: Notify = options.notify ?? (() => Promise.resolve())

  /**
   * `clicks` si pulsa más de lo que aguanta una persona, o `null`. Se mira lo
   * que manda la web segundo a segundo (para el minuto) y lo guardado con la
   * hora de aquí (para los tramos largos, que no se pueden falsear desde fuera).
   */
  async function tooManyClicks(
    login: string,
    second: number,
    clicks: number,
    fine: readonly ClickSample[],
  ): Promise<'clicks' | null> {
    const history = await db.execute({
      sql: 'SELECT at, clicks FROM clicker_clicks WHERE login = ? AND at >= ? ORDER BY at',
      args: [login, second - CLICK_HISTORY_S],
    })
    const stored: ClickSample[] = history.rows.map((entry) => [
      toNumber(entry.at),
      Number(entry.clicks),
    ])

    return overClicked(fine) !== null || overClicked([...stored, [second, clicks]]) !== null
      ? 'clicks'
      : null
  }

  /**
   * La política de trampas (`SALE_REFUND`): la web vuelve a la última partida
   * buena y vende al cargar todos sus edificios (`saleDue`); se le da la mitad de
   * lo que costaron y esa misma cantidad se reparte, a partes iguales, entre
   * quienes juegan y nunca han sido pillados. Lo verá en el juego (`seizure`).
   */
  async function confiscate(
    login: string,
    found: Record<string, unknown> | undefined,
    by: ClickerSeizure['by'],
    evidence: ClickerEvidence | null,
    n: number,
  ): Promise<number> {
    const amount = seizedValue(typeof found?.save === 'string' ? readSave(found.save) : null)
    const clean = `pill = 'red' AND caught = 0 AND save IS NOT NULL AND login != ?`
    const people = toNumber(
      (await db.execute({ sql: `SELECT COUNT(*) AS n FROM clicker WHERE ${clean}`, args: [login] }))
        .rows[0]?.n ?? 0,
    )
    const seizure: ClickerSeizure = { by, amount, n, shared: people, evidence }

    await db.batch(
      [
        {
          sql: 'UPDATE clicker SET sale_due = 1, seizure = ? WHERE login = ?',
          args: [JSON.stringify(seizure), login],
        },
        {
          sql: `UPDATE clicker SET pending_gift = pending_gift + ? WHERE ${clean}`,
          args: [giftShare(amount, people), login],
        },
      ],
      'write',
    )

    return amount
  }

  /** Apunta una trampa en el registro (`clicker_cheat_log`), para el apartado del panel. */
  async function logCheat(entry: {
    login: string
    how: ClickerCheatHow
    why: string
    total?: number
    perSecond?: number
    seized?: number
    detail?: unknown
    copyId?: number | null
  }): Promise<void> {
    await db.execute({
      sql: `INSERT INTO clicker_cheat_log
              (login, at, how, why, total, per_second, seized, detail, copy_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.login,
        iso(),
        entry.how,
        entry.why,
        entry.total ?? null,
        entry.perSecond ?? null,
        entry.seized ?? 0,
        entry.detail === undefined ? null : JSON.stringify(entry.detail),
        entry.copyId ?? null,
      ],
    })
  }

  /**
   * Los nombres de las noticias del juego: las personas con las que más se ha
   * corregido quien juega (le corrigieron o las corrigió), para que las
   * noticias hablen de gente que conoce. Si son pocas, se completa con quienes
   * más corrigen en su campus.
   */
  async function namesFor(actor: Actor): Promise<string[]> {
    const partners =
      (await options.partnersOf?.(actor.campusId, actor.login, NAMES).catch(() => [])) ?? []

    if (partners.length >= NAMES) return partners

    const campus = (await options.topCorrectors?.(actor.campusId, NAMES * 2).catch(() => [])) ?? []
    const others = campus.filter((login) => login !== actor.login && !partners.includes(login))

    return [...partners, ...others].slice(0, NAMES)
  }

  /** Cuántos edificios y mejoras hay en una partida guardada (sin comprobarla). */
  const holdingsOf = (save: string | null): { buildings: number; upgrades: number } => {
    try {
      const game = (save === null ? {} : JSON.parse(save)) as {
        owned?: Record<string, unknown>
        bought?: unknown
      }
      const buildings = Object.values(game.owned ?? {}).reduce<number>(
        (sum, count) => sum + (typeof count === 'number' && Number.isFinite(count) ? count : 0),
        0,
      )

      return { buildings, upgrades: Array.isArray(game.bought) ? game.bought.length : 0 }
    } catch {
      return { buildings: 0, upgrades: 0 }
    }
  }

  /**
   * Lo donado a la bolsa de 42: lo guardado si se miró hace menos de un día;
   * si no, se pregunta (y si no se puede, lo guardado).
   */
  const donatedOf = async (
    login: string,
    found: Record<string, unknown> | undefined,
  ): Promise<number> => {
    const known = toNumber(found?.donated ?? 0)
    const at = typeof found?.donated_at === 'string' ? Date.parse(found.donated_at) : 0

    if (options.donated === undefined || now() - at < DONATED_TTL_MS) return known

    // Sin cuota se vuelve a intentar en la siguiente visita; si 42 falla, mañana:
    // no se le pregunta en cada visita algo que no va a contestar.
    const fresh = await options.donated(login).catch(() => 'failed' as const)

    if (fresh === null) return known

    await db.execute({
      sql: 'UPDATE clicker SET donated = ?, donated_at = ? WHERE login = ?',
      args: [fresh === 'failed' ? known : fresh, iso(), login],
    })

    return fresh === 'failed' ? known : fresh
  }

  const row = async (login: string): Promise<Record<string, unknown> | undefined> =>
    (await db.execute({ sql: 'SELECT * FROM clicker WHERE login = ?', args: [login] })).rows[0]

  const pillOf = (found: Record<string, unknown> | undefined): Pill | null =>
    found?.pill === 'red' || found?.pill === 'blue' ? found.pill : null

  return {
    /** Por dónde va alguien en el secreto, con su partida si la tiene. */
    async state(actor: Actor): Promise<ClickerState> {
      const found = await row(actor.login)
      const pill = pillOf(found)
      const donated = pill === 'red' ? await donatedOf(actor.login, found) : 0

      return {
        plus: toNumber(found?.plus ?? 0),
        pill,
        save: typeof found?.save === 'string' ? found.save : null,
        donated,
        rev: toNumber(found?.rev ?? 0),
        caught: toNumber(found?.caught ?? 0),
        saleDue: toNumber(found?.sale_due ?? 0) === 1,
        seizure: stored(found?.seizure) as ClickerSeizure | null,
        // Los nombres solo hacen falta dentro del juego.
        names: pill === 'red' ? await namesFor(actor) : [],
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
      const second = Math.floor(now() / 1000)
      const why =
        verdict(
          {
            total: Number(found?.last_total ?? 0),
            at: Date.parse(toText(found?.updated_at ?? iso())),
            ledger: typeof found?.save === 'string' ? readSave(found.save) : null,
            credited: creditedSince(
              readGifts(found?.gifts),
              Date.parse(toText(found?.updated_at ?? iso())) / 1000,
            ),
          },
          sent,
          ledger,
          now(),
        ) ?? (await tooManyClicks(actor.login, second, ledger.clicks, clean(sent.clicks, now())))

      if (why !== null) {
        const last = typeof found?.caught_at === 'string' ? Date.parse(found.caught_at) : 0

        if (now() - last >= CAUGHT_COOLDOWN_MS) {
          caught += 1
          await db.execute({
            sql: `UPDATE clicker SET caught = ?, caught_at = ?, caught_why = ? WHERE login = ?`,
            args: [caught, iso(), why, actor.login],
          })

          const title = hackerTitle(caught)
          // El título es un adorno: si no se puede poner, la trampa cuenta igual.
          const before =
            title === null
              ? null
              : ((await options.brand?.(actor.login, title).catch(() => null)) ?? null)

          // La política de trampas, en cada una (si no tiene ya la venta pendiente).
          const seized =
            toNumber(found?.sale_due ?? 0) === 0
              ? await confiscate(actor.login, found, 'auto', null, caught)
              : 0

          // Se guarda la partida tal como llegó, por si hay que indultarla.
          const copy = await db.execute({
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

          await logCheat({
            login: actor.login,
            how: 'auto',
            why,
            total: sent.total,
            perSecond: sent.perSecond,
            seized,
            copyId: copy.lastInsertRowid === undefined ? null : Number(copy.lastInsertRowid),
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

        return { rev, caught, refused: true, gift: 0 }
      }

      // Con la venta pendiente no vale seguir con los edificios puestos.
      if (toNumber(found?.sale_due ?? 0) === 1 && ledger.holdings > 0) {
        return { rev, caught, refused: true, gift: 0 }
      }

      const result = await db.execute({
        sql: `UPDATE clicker SET save = ?, total = MAX(total, ?), last_total = ?, per_second = ?,
                achievements = ?, prestige = ?, updated_at = ?, holder = ?, rev = rev + 1,
                sale_due = 0, pool_bonus = pending_gift, pending_gift = 0
              WHERE login = ? AND (rev = ? OR holder = ?)
              RETURNING rev, pool_bonus AS gift`,
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

      // Lo que acaba de cobrar del reparto, apuntado para no tomarlo por un salto.
      const gifts = rememberGifts(readGifts(found?.gifts), second, Number(saved?.gift ?? 0))

      if (JSON.stringify(gifts) !== toText(found?.gifts ?? '[]')) {
        await db.execute({
          sql: 'UPDATE clicker SET gifts = ? WHERE login = ?',
          args: [JSON.stringify(gifts), actor.login],
        })
      }

      // El contador de este guardado, con la hora de aquí, para los tramos largos.
      await db.batch(
        [
          {
            sql: `INSERT INTO clicker_clicks (login, at, clicks) VALUES (?, ?, ?)
                  ON CONFLICT (login, at) DO UPDATE SET clicks = excluded.clicks`,
            args: [actor.login, second, ledger.clicks],
          },
          {
            sql: 'DELETE FROM clicker_clicks WHERE login = ? AND at < ?',
            args: [actor.login, second - CLICK_HISTORY_S],
          },
        ],
        'write',
      )

      // El historial de capital, y el aviso si hay un salto que no se explica.
      const samples = clean(sent.capital, now())

      if (samples.length > 0) {
        // Los repartos de antes de este guardado: el de ahora aún no está en la web.
        const leap = jump(samples, readGifts(found?.gifts))
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

      // Lo que le llega del reparto se suma en la web, y vale como escrito en los
      // guardados siguientes (`gifts`, `creditedSince`).
      return {
        rev: toNumber(saved?.rev ?? rev),
        caught,
        refused: false,
        gift: Number(saved?.gift ?? 0),
      }
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
      assertAdmin(actor)

      return this.capitalOf(parse(loginSchema.loose(), input).login, input)
    },

    /**
     * Indulta una trampa: la partida que se rechazó pasa a ser la que está en
     * curso, se descuenta de las veces que le han pillado, el banner vuelve a
     * como estaba y la copia se borra. Solo para quien administra la web.
     *
     * La partida queda sin dueño (`holder`), así que una pestaña que la tuviera
     * abierta ya no guarda encima: tiene que cargarla. Si la de ahora va por
     * delante (ha seguido jugando), se queda la de ahora y solo se quita la
     * trampa.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin;
     *   `not_found` si esa copia no existe.
     */
    async pardon(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const id = parse(idSchema, input)
      const copy = (
        await db.execute({ sql: 'SELECT * FROM clicker_cheats WHERE id = ?', args: [id] })
      ).rows[0]

      if (copy === undefined) throw domainError('not_found', 'Esa trampa ya no está')

      const login = toText(copy.login)
      const current = await row(login)
      const left = Math.max(0, toNumber(current?.caught ?? 0) - 1)
      // Si desde entonces ha seguido jugando y va por delante, se queda con la
      // partida de ahora: devolverle la copia le quitaría lo que ha avanzado.
      const ahead = Number(current?.total ?? 0) > Number(copy.total)

      await db.batch(
        [
          ahead
            ? {
                sql: `UPDATE clicker SET sale_due = 0, caught = ?, caught_at = NULL,
                        caught_why = NULL
                      WHERE login = ?`,
                args: [left, login],
              }
            : {
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
          {
            sql: 'UPDATE clicker_cheat_log SET pardoned_at = ? WHERE copy_id = ?',
            args: [iso(), id],
          },
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
      assertAdmin(actor)

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

    /**
     * Lo que decide quien administra sobre un salto de capital sospechoso:
     *
     * - `clean`: no es trampa. Se cierra y no pasa nada.
     * - `likely`: probable. A esa persona le sale, sin poder saltárselo, qué
     *   datos no cuadran, y tiene que defenderse o explicar cómo lo hizo. Su
     *   respuesta llega aquí; después se decide otra vez.
     * - `cheat`: trampa. Se aplica la política (`seize`) y se le enseñan los
     *   datos que no cuadraron, no cómo se ha visto.
     *
     * @throws {DomainError} `forbidden` si no administra; `not_found` si ese aviso no está.
     */
    async review(actor: Actor, id: unknown, input: unknown): Promise<void> {
      assertAdmin(actor)

      const alertId = parse(idSchema, id)
      const { verdict: decision } = parse(reviewSchema, input)
      const alert = (
        await db.execute({ sql: 'SELECT * FROM clicker_alerts WHERE id = ?', args: [alertId] })
      ).rows[0]

      if (alert === undefined) throw domainError('not_found', 'Ese aviso ya no está')

      const login = toText(alert.login)

      if (decision === 'clean') {
        await db.execute({ sql: 'DELETE FROM clicker_alerts WHERE id = ?', args: [alertId] })

        return
      }

      const player = await row(login)
      const evidence: ClickerEvidence = {
        from: Number(alert.from_capital),
        to: Number(alert.to_capital),
        seconds: toNumber(alert.seconds),
        perSecond: Number(player?.per_second ?? 0),
        golden: toNumber(alert.golden) === 1,
      }

      if (decision === 'likely') {
        await db.execute({
          sql: `UPDATE clicker_alerts SET status = 'asked', evidence = ?, answer = NULL,
                  answered_at = NULL WHERE id = ?`,
          args: [JSON.stringify(evidence), alertId],
        })

        return
      }

      const caught = toNumber(player?.caught ?? 0) + 1

      await db.execute({
        sql: `UPDATE clicker SET caught = ?, caught_at = ?, caught_why = 'review' WHERE login = ?`,
        args: [caught, iso(), login],
      })
      const seized = await confiscate(login, player, 'review', evidence, caught)

      await logCheat({ login, how: 'review', why: 'review', seized, detail: evidence })
      await db.execute({ sql: 'DELETE FROM clicker_alerts WHERE id = ?', args: [alertId] })

      const title = hackerTitle(caught)

      if (title !== null) await options.brand?.(login, title).catch(() => null)
    },

    /** Las revisiones que quien pregunta tiene que contestar, la más antigua primero. */
    async reviews(actor: Actor): Promise<ClickerReview[]> {
      const result = await db.execute({
        sql: `SELECT id, at, evidence FROM clicker_alerts
              WHERE login = ? AND status = 'asked' ORDER BY id`,
        args: [actor.login],
      })

      return result.rows.flatMap((entry) => {
        const evidence = stored(entry.evidence) as ClickerEvidence | null

        return evidence === null ? [] : [{ id: toNumber(entry.id), at: toText(entry.at), evidence }]
      })
    },

    /**
     * Contesta una revisión: se defiende o explica cómo lo hizo. Llega a quien
     * administra, que decide después.
     *
     * @throws {DomainError} `not_found` si no es suya o ya no espera respuesta.
     */
    async defend(actor: Actor, id: unknown, input: unknown): Promise<void> {
      const alertId = parse(idSchema, id)
      const { answer } = parse(defenseSchema, input)
      const result = await db.execute({
        sql: `UPDATE clicker_alerts SET status = 'answered', answer = ?, answered_at = ?
              WHERE id = ? AND login = ? AND status = 'asked'`,
        args: [answer, iso(), alertId, actor.login],
      })

      if (result.rowsAffected === 0)
        throw domainError('not_found', 'Esa revisión ya no espera respuesta')

      await notify({
        to: (await options.admins?.()) ?? [],
        kind: 'clicker_defense',
        ref: `clicker:${alertId}`,
        from: actor.login,
        text: answer,
      })
    },

    /**
     * Una sanción a mano: le deja `code` líneas y, con `wipe`, sin edificios ni
     * mejoras (ni lo que llevaba en marcha). Conserva logros, prestigio y la
     * cuenta de la clasificación. Lo verá en el juego con el mensaje (`note`).
     *
     * La partida queda sin dueño (`holder`), así que la pestaña que la tuviera
     * abierta tiene que cargarla en vez de guardar encima.
     *
     * @throws {DomainError} `forbidden` si no administra; `not_found` si no
     *   tiene partida.
     */
    async sanction(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const { login, code, wipe, note } = parse(sanctionSchema, input)
      const found = await row(login)
      let game: Record<string, unknown> | null = null

      try {
        const read: unknown = typeof found?.save === 'string' ? JSON.parse(found.save) : null

        if (typeof read === 'object' && read !== null && !Array.isArray(read)) {
          game = read as Record<string, unknown>
        }
      } catch {
        game = null
      }

      if (game === null) throw domainError('not_found', 'Esa persona no tiene partida')

      const total = Math.max(Number(game.total) || 0, code)
      const next = wipe
        ? { ...game, code, total, owned: {}, made: {}, bought: [], buffs: [], bugs: [] }
        : { ...game, code, total }
      const seizure: ClickerSeizure = {
        by: 'admin',
        amount: 0,
        n: toNumber(found?.caught ?? 0),
        shared: 0,
        evidence: null,
        note,
      }

      await db.execute({
        sql: `UPDATE clicker SET save = ?, per_second = ?, updated_at = ?, holder = NULL,
                rev = rev + 1, sale_due = 0, seizure = ?
              WHERE login = ?`,
        args: [
          JSON.stringify(next),
          wipe ? 0 : Number(found?.per_second ?? 0),
          iso(),
          JSON.stringify(seizure),
          login,
        ],
      })
      await logCheat({ login, how: 'sanction', why: 'manual', detail: { note, code, wipe } })
    },

    /** Ya ha visto el aviso de la policía del código. */
    async ackSeizure(actor: Actor): Promise<void> {
      await db.execute({
        sql: 'UPDATE clicker SET seizure = NULL WHERE login = ?',
        args: [actor.login],
      })
    },

    /**
     * La partida de alguien, para que quien administra la vea en su pantalla
     * de juego (sin guardar nada).
     *
     * @throws {DomainError} `forbidden` si no administra; `not_found` si no juega.
     */
    async gameOf(actor: Actor, input: unknown): Promise<ClickerGameView> {
      assertAdmin(actor)

      const { login } = parse(loginSchema.loose(), input)
      const found = await row(login)

      if (found === undefined) throw domainError('not_found', 'Esa persona no juega')

      return {
        login,
        save: typeof found.save === 'string' ? found.save : null,
        caught: toNumber(found.caught ?? 0),
        perSecond: Number(found.per_second ?? 0),
      }
    },

    /** Veces que han pillado a alguien haciendo trampas. Para el título del banner. */
    async caughtOf(login: string): Promise<number> {
      return toNumber((await row(login))?.caught ?? 0)
    },

    /**
     * La clasificación: quién tiene más patrimonio ahora (`wealthOf`), de
     * cualquier campus. Se calcula al pedirla, de la partida guardada.
     *
     * @throws {DomainError} `forbidden` si no eligió la roja.
     */
    async board(actor: Actor): Promise<ClickerBoard> {
      if (pillOf(await row(actor.login)) !== 'red') {
        throw domainError('forbidden', 'Esto no existe')
      }

      const result = await db.execute(
        `SELECT login, save, total, per_second, achievements, prestige FROM clicker
         WHERE pill = 'red' AND save IS NOT NULL`,
      )
      const rows = result.rows
        .filter((entry) => !HIDDEN_FROM_BOARD.has(toText(entry.login)))
        .map((entry) => ({ entry, wealth: wealthOf(readSave(toText(entry.save))) }))
        .sort(
          (a, b) =>
            b.wealth - a.wealth || toText(a.entry.login).localeCompare(toText(b.entry.login)),
        )
      const images = await replica.imagesOf(
        rows.slice(0, BOARD_SIZE).map(({ entry }) => toText(entry.login)),
      )
      const ranks = rows.map(({ entry, wealth }, index): ClickerRank => {
        const login = toText(entry.login)
        const total = Number(entry.total)

        return {
          wealth,
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
    /**
     * El registro de trampas: cada vez que se pilló a alguien, la más reciente
     * primero, y un resumen por persona con su patrimonio de ahora y si tiene
     * una revisión abierta.
     *
     * @throws {DomainError} `forbidden` si no administra.
     */
    async cheats(actor: Actor): Promise<ClickerCheats> {
      assertAdmin(actor)

      const [log, copies, games, open] = await Promise.all([
        db.execute('SELECT * FROM clicker_cheat_log ORDER BY at DESC, id DESC LIMIT 2000'),
        db.execute('SELECT id FROM clicker_cheats'),
        db.execute(
          `SELECT login, save FROM clicker
           WHERE login IN (SELECT DISTINCT login FROM clicker_cheat_log)`,
        ),
        db.execute(
          `SELECT login, status FROM clicker_alerts WHERE status IN ('asked', 'answered')
           ORDER BY id`,
        ),
      ])
      const kept = new Set(copies.rows.map((entry) => toNumber(entry.id)))
      const entries = log.rows.map((entry): ClickerCheatEntry => {
        let note: string | null = null

        try {
          const detail = JSON.parse(toText(entry.detail ?? 'null')) as { note?: unknown } | null

          note = typeof detail?.note === 'string' ? detail.note : null
        } catch {
          note = null
        }

        const copyId = entry.copy_id === null ? null : toNumber(entry.copy_id)

        return {
          id: toNumber(entry.id),
          login: toText(entry.login),
          at: toText(entry.at),
          how: toText(entry.how) as ClickerCheatHow,
          why: toText(entry.why),
          total: entry.total === null ? null : Number(entry.total),
          perSecond: entry.per_second === null ? null : Number(entry.per_second),
          seized: Number(entry.seized ?? 0),
          note,
          pardonedAt: typeof entry.pardoned_at === 'string' ? entry.pardoned_at : null,
          copyId: copyId !== null && kept.has(copyId) ? copyId : null,
        }
      })
      const wealth = new Map(
        games.rows.map((entry) => [
          toText(entry.login),
          typeof entry.save === 'string' ? wealthOf(readSave(entry.save)) : 0,
        ]),
      )
      const review = new Map(
        open.rows.map((entry) => [
          toText(entry.login),
          toText(entry.status) as 'asked' | 'answered',
        ]),
      )
      const people = new Map<string, ClickerCheater>()

      for (const entry of entries) {
        const known = people.get(entry.login)
        const counts = entry.pardonedAt === null ? 1 : 0

        if (known === undefined) {
          people.set(entry.login, {
            login: entry.login,
            times: counts,
            first: entry.at,
            last: entry.at,
            whys: [entry.why],
            seized: entry.seized,
            wealth: wealth.get(entry.login) ?? 0,
            review: review.get(entry.login) ?? null,
          })
        } else {
          known.times += counts
          known.first = entry.at
          known.seized += entry.seized
          if (!known.whys.includes(entry.why)) known.whys.push(entry.why)
        }
      }

      return { entries, people: [...people.values()] }
    },

    async usage(actor: Actor, input: unknown): Promise<ClickerUsage> {
      assertAdmin(actor)

      const { days } = parse(usageSchema, input)
      const from = dayOf(now() - (days - 1) * DAY_MS)
      const [result, time, alerts, cheats] = await Promise.all([
        // De la partida solo se mira cuánto se ha pulsado la tecla, y solo si
        // se entiende: la escribe la web y aquí no se comprueba.
        db.execute(
          `SELECT login, plus, pill, total, per_second, achievements, prestige, rev, updated_at, save,
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
        const save = typeof entry.save === 'string' ? entry.save : null
        const ledger = save === null ? null : readSave(save)
        const { buildings, upgrades } = holdingsOf(save)
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
          code: ledger?.code ?? 0,
          wealth: wealthOf(ledger),
          buildings,
          upgrades,
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
          status: toText(entry.status) as ClickerAlert['status'],
          answer: typeof entry.answer === 'string' ? entry.answer : null,
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
