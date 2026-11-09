/**
 * La red de asientos (`docs/asientos.md`): quién se sienta cerca de quién en
 * los clústeres del campus, sacado del historial de puestos (`seat_sessions`).
 *
 * Mundos separados (`docs/piscineros.md`): un piscinero solo ve a los
 * piscineros de su campus; un estudiante, solo a estudiantes.
 */

import type {
  SeatGraph,
  SeatGroupQuality,
  SeatHeat,
  SeatPerson,
  SeatWeightsPreview,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { assertAdmin } from '../../core/actor.js'
import { audienceKey, NO_POOL, seesFor, worldOf } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { day, parse } from '../../core/validation.js'
import { communitiesOf, GRAPH_BUDGET } from './network.analysis.js'
import { seatHeatFrom, seatHeatOf } from './seating.heat.js'
import { seatWeightsSchema, weightsKey } from './seat-weights.js'
import type { SeatWeightsStore } from './seat-weights.js'
import { groupQuality } from './seating.quality.js'
import { DEFAULT_SEAT_WEIGHTS, seatingOf, trimSeating } from './seating.rules.js'
import type { SeatSession, SeatWeights } from './seating.rules.js'
import { seatSessionsIn } from './seating.sessions.js'
import { dayOf } from './seating.usage.js'
import type { SeatUsage } from './seating.usage.js'

type SeatingOptions = {
  db: Db
  audience?: Audience
  /** Los puestos que se han visto ocupados alguna vez en un campus (`replica.knownSeats`). */
  knownSeats?: (campusId: number) => Promise<string[]>
  /**
   * El uso de los puestos ya sumado (`seat_usage`). Con él, y acabada su
   * primera suma, el mapa de calor sale de ahí; sin él, de las sesiones.
   */
  usage?: SeatUsage
  /** Los pesos de los puestos, que se cambian en el panel. Sin ella, los de siempre. */
  weights?: Pick<SeatWeightsStore, 'grid'>
  now?: () => number
}

export type SeatingService = {
  graph: (actor: Actor, query: unknown) => Promise<SeatGraph>
  /** El mapa de calor de los puestos: horas y gente por ordenador, sin nombres. */
  heat: (actor: Actor, query: unknown) => Promise<SeatHeat>
  /**
   * Solo admins: cómo saldría la red de su campus con otros pesos, y lo bien
   * que separan en grupos comparado con los que están en uso.
   */
  preview: (actor: Actor, input: unknown) => Promise<SeatWeightsPreview>
  /**
   * Las amistades más cercanas de alguien: con quien más cercanía tiene en la
   * red de asientos de todo el historial (horas sentados a la vez por el peso
   * de los puestos), de más a menos, como mucho `limit`. Solo gente que puede ver.
   */
  friendsOf: (actor: Actor, limit: number) => Promise<string[]>
  /**
   * Deja calculada de fondo la vista de entrada («todo», la que ve casi todo el
   * mundo) de cada campus, para que la primera persona que la abre no espere.
   */
  warm: (campusIds: readonly number[]) => Promise<void>
  /**
   * Lo mismo con el mapa de calor de «todo», el único que tarda (unos segundos
   * en un campus grande aun ya sumado): se rehace tras cada puesta al día.
   */
  warmHeat: (campusIds: readonly number[]) => Promise<void>
}

const DAY_MS = 86_400_000

/** La foto de los puestos se repite cada pocos minutos: no hace falta más fresco. */
const CACHE_TTL_MS = 5 * 60_000

/**
 * Pasado eso, se sigue dando lo calculado mientras se rehace de fondo: con todo
 * el historial el cálculo lleva segundos, y unas horas de retraso en «todo» no
 * se notan.
 */
const STALE_MS = 6 * 60 * 60_000

/** Un cálculo que pasa de esto se apunta en el registro, para saber qué pesa. */
const SLOW_MS = 1_000

/** «Todo» el historial, como el periodo de entrada de la red de asientos. */
const ALL_DAYS = 3650

/** Por debajo de esto (una hora al lado, más o menos) dos personas no se unen. */
const MIN_CLOSENESS = 2

/**
 * Cálculos nuevos (lo que no está ya en la caché) por persona y minuto, entre
 * el grafo y el mapa de calor. Las fechas las elige quien pregunta y la caché
 * guarda pocas: sin tope, variándolas se haría recalcular todo sin parar,
 * como en la red de correcciones.
 */
const FRESH_PER_MINUTE = 20

/** Un día `YYYY-MM-DD`. */
/**
 * El periodo: los últimos `days` días (hasta diez años, que es «todo») o, con
 * `from`, de ese día a `to` (incluido; sin él, hasta ahora).
 */
const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  from: day.optional(),
  to: day.optional(),
})

const previewSchema = querySchema.extend({ grid: seatWeightsSchema })

/**
 * El tramo que se mira, en ms, y cuántos días son. `rolling`, si son los
 * últimos `days` días hasta ahora (y no unas fechas a mano).
 */
type Span = { since: number; until: number; days: number; rolling?: boolean }

function spanOf(query: z.infer<typeof querySchema>, now: number): Span {
  if (query.from === undefined) {
    return { since: now - query.days * DAY_MS, until: now, days: query.days, rolling: true }
  }

  const since = Date.parse(`${query.from}T00:00:00.000Z`)
  const until = Math.min(
    now,
    query.to === undefined ? now : Date.parse(`${query.to}T00:00:00.000Z`) + DAY_MS,
  )

  if (!(since < until)) throw domainError('invalid_input', 'El periodo acaba antes de empezar')

  return { since, until, days: Math.max(1, Math.round((until - since) / DAY_MS)) }
}

const round1 = (value: number): number => Math.round(value * 10) / 10

/**
 * Las amistades que se guardan de cada persona, de más cercanía a menos: con
 * todo el historial de un campus grande, guardarlas todas eran millones.
 */
const FRIENDS_KEPT = 50

/** Lo que sale de calcular un periodo: el grafo y, de cada persona, sus amistades. */
type Built = { graph: SeatGraph; friends: Map<string, string[]> }

/** De cada persona, con quién tiene una unión, de más cercanía a menos. */
function friendsIn(pairs: readonly { a: string; b: string; closeness: number }[]) {
  const near = new Map<string, { login: string; closeness: number }[]>()
  const add = (login: string, other: string, closeness: number): void => {
    const list = near.get(login)

    if (list === undefined) near.set(login, [{ login: other, closeness }])
    else list.push({ login: other, closeness })
  }

  for (const pair of pairs) {
    add(pair.a, pair.b, pair.closeness)
    add(pair.b, pair.a, pair.closeness)
  }

  return new Map(
    [...near].map(([login, list]): [string, string[]] => [
      login,
      list
        .sort((x, y) => y.closeness - x.closeness || x.login.localeCompare(y.login))
        .slice(0, FRIENDS_KEPT)
        .map((entry) => entry.login),
    ]),
  )
}

export function createSeatingService(options: SeatingOptions): SeatingService {
  const { db, audience = NO_POOL, now = Date.now } = options
  const knownSeats = options.knownSeats ?? (() => Promise.resolve([]))
  const gridOf = (): Promise<SeatWeights> =>
    options.weights?.grid() ?? Promise.resolve(DEFAULT_SEAT_WEIGHTS)
  const cache = createTtlCache<Built>({
    ttlMs: CACHE_TTL_MS,
    staleMs: STALE_MS,
    maxEntries: 12,
    now,
  })
  // Cada periodo de cada campus y mundo es una entrada; ocupan poco.
  const heatCache = createTtlCache<SeatHeat>({
    ttlMs: CACHE_TTL_MS,
    staleMs: STALE_MS,
    maxEntries: 48,
    now,
  })
  // Un cálculo a la vez: con todo el historial de un campus grande cada uno
  // ocupa cientos de MB, y varios juntos (la web, el precálculo, el Code
  // Clicker) dejaban al servidor sin memoria.
  let turn: Promise<unknown> = Promise.resolve()
  const inTurn = <T>(work: () => Promise<T>): Promise<T> => {
    const next = turn.then(work, work)

    turn = next.catch(() => undefined)

    return next
  }
  const fresh = createRateLimit({ max: FRESH_PER_MINUTE, windowMs: 60_000, now })
  const limited = (actor: Actor): void => {
    if (!fresh.hit(actor.login)) {
      throw domainError('rate_limited', 'Demasiados periodos distintos seguidos: espera un minuto')
    }
  }

  /**
   * La clave de la caché: campus, mundo, quién se ve y días. Lo que se guarda
   * va ya filtrado por quién se ve, así que lleva también los ocultos.
   */
  async function keyOf(actor: Actor, query: z.infer<typeof querySchema>): Promise<string> {
    const seen = await audienceKey(audience, actor)
    const period =
      query.from === undefined ? String(query.days) : `${query.from}..${query.to ?? ''}`

    return `${String(actor.campusId)}|${actor.pool === true ? 'pool' : 'student'}|${seen}|${period}`
  }

  /**
   * El mapa de calor. Cuenta solo las horas de la gente que quien mira puede
   * ver, como el grafo: así los dos suman lo mismo y nadie oculto (ni del
   * otro mundo) deja huella en un puesto.
   */
  async function loadHeat(actor: Actor, span: Span): Promise<SeatHeat> {
    const { days } = span
    const through = options.usage === undefined ? null : await options.usage.through()

    // Ya sumado, va por días enteros (UTC): los últimos `days` son ese número
    // de días contando hoy; a mano, de la primera fecha a la última, incluidas.
    if (options.usage !== undefined && through !== null) {
      const first = span.rolling === true ? span.until - (days - 1) * DAY_MS : span.since
      const [{ hosts, clusters }, known] = await Promise.all([
        options.usage.totals(
          actor.campusId,
          dayOf(first),
          dayOf(span.until - 1),
          await worldOf(audience, actor),
        ),
        knownSeats(actor.campusId),
      ])

      return { days, through, ...seatHeatFrom(hosts, clusters, known) }
    }

    const [{ sessions }, known] = await Promise.all([
      sessionsOf(actor, span),
      knownSeats(actor.campusId),
    ])

    return { days, through: null, ...seatHeatOf(sessions, known) }
  }

  /**
   * La red de unas sesiones con unos pesos, lo bien que separa en grupos y, de
   * cada persona, sus amistades: quienes tienen con ella al menos la cercanía
   * mínima, de más a menos.
   */
  async function build(
    sessions: readonly SeatSession[],
    images: ReadonlyMap<string, string | null>,
    days: number,
    grid: SeatWeights,
  ): Promise<Built & { quality: SeatGroupQuality }> {
    const seating = await seatingOf(sessions, grid)
    const pairs = seating.pairs.filter((pair) => pair.closeness >= MIN_CLOSENESS)
    const logins = [...seating.people.keys()]
    const community = await communitiesOf(
      pairs.map((pair) => ({ a: pair.a, b: pair.b, ab: pair.closeness, ba: 0 })),
      logins,
    )
    const people: SeatPerson[] = [...seating.people].map(([login, entry]) => ({
      login,
      image: images.get(login) ?? null,
      hours: round1(entry.hours),
      closeness: Math.round(entry.closeness),
      partners: entry.partners,
      alone: entry.hours === 0 ? 0 : Math.round((100 * entry.aloneHours) / entry.hours) / 100,
      community: community.get(login) ?? 0,
      usual: entry.usual,
    }))

    // El tope del grafo, como en la red de correcciones. Los totales siguen
    // contando a todo el mundo: la web dice cuántas personas quedan fuera.
    const shown = trimSeating(people, pairs, GRAPH_BUDGET)

    return {
      graph: {
        days,
        people: shown.people.sort(
          (x, y) => y.closeness - x.closeness || x.login.localeCompare(y.login),
        ),
        links: shown.pairs.map((pair) => ({
          source: pair.a,
          target: pair.b,
          closeness: Math.round(pair.closeness),
          hours: round1(pair.hours),
        })),
        totals: {
          people: people.length,
          pairs: pairs.length,
          communities: new Set(community.values()).size,
          hours: Math.round(people.reduce((sum, person) => sum + person.hours, 0)),
        },
      },
      quality: groupQuality(logins, pairs, community),
      friends: friendsIn(pairs),
    }
  }

  async function sessionsOf(actor: Actor, { since, until }: Span) {
    return seatSessionsIn(db, actor.campusId, since, until, await seesFor(audience, actor))
  }

  /** Lo que se guarda de un periodo: el grafo y las amistades, que salen del mismo cálculo. */
  async function load(actor: Actor, span: Span, grid: SeatWeights): Promise<Built> {
    const started = now()
    const { sessions, images } = await sessionsOf(actor, span)
    const { graph, friends } = await build(sessions, images, span.days, grid)
    const took = now() - started

    if (took >= SLOW_MS) {
      process.stderr.write(
        `[lento] red de asientos de ${String(actor.campusId)} (${String(span.days)} días, ${String(sessions.length)} sesiones): ${String(took)} ms\n`,
      )
    }

    return { graph, friends }
  }

  /** El grafo y las amistades de un periodo, de la caché si se puede. */
  async function builtFor(
    actor: Actor,
    query: z.infer<typeof querySchema>,
    check: boolean,
  ): Promise<Built> {
    const grid = await gridOf()

    // Los pesos van en la clave: al cambiarlos en el panel se recalcula.
    return cache.get(`${await keyOf(actor, query)}|${weightsKey(grid)}`, () => {
      if (check) limited(actor)

      const span = spanOf(query, now())

      return inTurn(() => load(actor, span, grid))
    })
  }

  return {
    async graph(actor, query) {
      return (await builtFor(actor, parse(querySchema, query), true)).graph
    },

    async preview(actor, input) {
      assertAdmin(actor)

      const parsed = parse(previewSchema, input)
      const span = spanOf(parsed, now())

      limited(actor)

      return inTurn(async () => {
        const [{ sessions, images }, grid] = await Promise.all([sessionsOf(actor, span), gridOf()])
        const proposed = await build(sessions, images, span.days, parsed.grid)

        return {
          graph: proposed.graph,
          proposed: proposed.quality,
          current: (await build(sessions, images, span.days, grid)).quality,
        }
      })
    },

    async friendsOf(actor, limit) {
      // El mismo cálculo que la vista «todo» de la red: si alguien la ha abierto, ya está.
      const { friends } = await builtFor(actor, { days: ALL_DAYS }, false)

      return (friends.get(actor.login.toLowerCase()) ?? []).slice(0, limit)
    },

    async warm(campusIds) {
      // Cada campus por turno, como lo vería un estudiante cualquiera: es la
      // clave que comparte casi todo el mundo (`audienceKey`).
      for (const campusId of campusIds) {
        await builtFor({ login: '', campusId, admin: false }, { days: ALL_DAYS }, false)
      }
    },

    async warmHeat(campusIds) {
      for (const campusId of campusIds) {
        await this.heat({ login: '', campusId, admin: false }, { days: ALL_DAYS })
      }
    },

    async heat(actor, query) {
      const parsed = parse(querySchema, query)

      return heatCache.get(await keyOf(actor, parsed), () => {
        limited(actor)

        const span = spanOf(parsed, now())

        return inTurn(() => loadHeat(actor, span))
      })
    },
  }
}
