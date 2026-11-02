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
import { audienceKey, NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { day, parse } from '../../core/validation.js'
import { communitiesOf, GRAPH_BUDGET } from './network.analysis.js'
import { seatHeatOf } from './seating.heat.js'
import { seatWeightsSchema, weightsKey } from './seat-weights.js'
import type { SeatWeightsStore } from './seat-weights.js'
import { groupQuality } from './seating.quality.js'
import { DEFAULT_SEAT_WEIGHTS, seatingOf, trimSeating } from './seating.rules.js'
import type { SeatSession, SeatWeights } from './seating.rules.js'
import { seatSessionsIn } from './seating.sessions.js'

type SeatingOptions = {
  db: Db
  audience?: Audience
  /** Los puestos que se han visto ocupados alguna vez en un campus (`replica.knownSeats`). */
  knownSeats?: (campusId: number) => Promise<string[]>
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
}

const DAY_MS = 86_400_000

/** La foto de los puestos se repite cada pocos minutos: no hace falta más fresco. */
const CACHE_TTL_MS = 5 * 60_000

/** Las amistades de cada cual cambian despacio: se rehacen cada hora. */
const FRIENDS_TTL_MS = 60 * 60_000

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

/** El tramo que se mira, en ms, y cuántos días son. */
type Span = { since: number; until: number; days: number }

function spanOf(query: z.infer<typeof querySchema>, now: number): Span {
  if (query.from === undefined) {
    return { since: now - query.days * DAY_MS, until: now, days: query.days }
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

export function createSeatingService(options: SeatingOptions): SeatingService {
  const { db, audience = NO_POOL, now = Date.now } = options
  const knownSeats = options.knownSeats ?? (() => Promise.resolve([]))
  const gridOf = (): Promise<SeatWeights> =>
    options.weights?.grid() ?? Promise.resolve(DEFAULT_SEAT_WEIGHTS)
  const cache = createTtlCache<SeatGraph>({ ttlMs: CACHE_TTL_MS, maxEntries: 12, now })
  const heatCache = createTtlCache<SeatHeat>({ ttlMs: CACHE_TTL_MS, maxEntries: 12, now })
  // Por campus, mundo y quién se ve: de cada persona, sus más cercanas.
  const friendsCache = createTtlCache<Map<string, string[]>>({
    ttlMs: FRIENDS_TTL_MS,
    maxEntries: 12,
    now,
  })
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
    const [{ sessions }, known] = await Promise.all([
      sessionsOf(actor, span),
      knownSeats(actor.campusId),
    ])

    return { days, ...seatHeatOf(sessions, known) }
  }

  /** La red de unas sesiones con unos pesos, y lo bien que separa en grupos. */
  function build(
    sessions: readonly SeatSession[],
    images: ReadonlyMap<string, string | null>,
    days: number,
    grid: SeatWeights,
  ): { graph: SeatGraph; quality: SeatGroupQuality } {
    const seating = seatingOf(sessions, grid)
    const pairs = seating.pairs.filter((pair) => pair.closeness >= MIN_CLOSENESS)
    const logins = [...seating.people.keys()]
    const community = communitiesOf(
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
      usual: [...entry.hosts]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([host]) => host),
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
    }
  }

  async function sessionsOf(actor: Actor, { since, until }: Span) {
    return seatSessionsIn(db, actor.campusId, since, until, await seesFor(audience, actor))
  }

  /** De cada persona, quienes tienen con ella al menos la cercanía mínima, de más a menos. */
  async function loadFriends(actor: Actor, grid: SeatWeights): Promise<Map<string, string[]>> {
    const until = now()
    const { sessions } = await sessionsOf(actor, {
      since: until - ALL_DAYS * DAY_MS,
      until,
      days: ALL_DAYS,
    })
    const near = new Map<string, { login: string; closeness: number }[]>()
    const add = (login: string, other: string, closeness: number): void => {
      near.set(login, [...(near.get(login) ?? []), { login: other, closeness }])
    }

    for (const pair of seatingOf(sessions, grid).pairs) {
      if (pair.closeness < MIN_CLOSENESS) continue
      add(pair.a, pair.b, pair.closeness)
      add(pair.b, pair.a, pair.closeness)
    }

    return new Map(
      [...near].map(([login, list]) => [
        login,
        list
          .sort((x, y) => y.closeness - x.closeness || x.login.localeCompare(y.login))
          .map((entry) => entry.login),
      ]),
    )
  }

  async function load(actor: Actor, span: Span, grid: SeatWeights): Promise<SeatGraph> {
    const { sessions, images } = await sessionsOf(actor, span)

    return build(sessions, images, span.days, grid).graph
  }

  return {
    async graph(actor, query) {
      const parsed = parse(querySchema, query)
      const grid = await gridOf()

      // Los pesos van en la clave: al cambiarlos en el panel se recalcula.
      return cache.get(`${await keyOf(actor, parsed)}|${weightsKey(grid)}`, () => {
        limited(actor)

        return load(actor, spanOf(parsed, now()), grid)
      })
    },

    async preview(actor, input) {
      assertAdmin(actor)

      const parsed = parse(previewSchema, input)
      const span = spanOf(parsed, now())

      limited(actor)

      const [{ sessions, images }, grid] = await Promise.all([sessionsOf(actor, span), gridOf()])
      const proposed = build(sessions, images, span.days, parsed.grid)

      return {
        graph: proposed.graph,
        proposed: proposed.quality,
        current: build(sessions, images, span.days, grid).quality,
      }
    },

    async friendsOf(actor, limit) {
      const grid = await gridOf()
      const key = `${await keyOf(actor, { days: ALL_DAYS })}|${weightsKey(grid)}`
      const friends = await friendsCache.get(key, () => loadFriends(actor, grid))

      return (friends.get(actor.login.toLowerCase()) ?? []).slice(0, limit)
    },

    async heat(actor, query) {
      const parsed = parse(querySchema, query)

      return heatCache.get(await keyOf(actor, parsed), () => {
        limited(actor)

        return loadHeat(actor, spanOf(parsed, now()))
      })
    },
  }
}
