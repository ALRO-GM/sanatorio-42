/**
 * La red de asientos (`docs/asientos.md`): quién se sienta cerca de quién en
 * los clústeres del campus, sacado del historial de puestos (`seat_sessions`).
 *
 * Mundos separados (`docs/piscineros.md`): un piscinero solo ve a los
 * piscineros de su campus; un estudiante, solo a estudiantes.
 */

import type { SeatGraph, SeatHeat, SeatPerson } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { audienceKey, NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import { communitiesOf, GRAPH_BUDGET } from './network.analysis.js'
import { seatHeatOf } from './seating.heat.js'
import { seatingOf, trimSeating } from './seating.rules.js'
import { seatSessionsIn } from './seating.sessions.js'

type SeatingOptions = {
  db: Db
  audience?: Audience
  /** Los puestos que se han visto ocupados alguna vez en un campus (`replica.knownSeats`). */
  knownSeats?: (campusId: number) => Promise<string[]>
  now?: () => number
}

export type SeatingService = {
  graph: (actor: Actor, query: unknown) => Promise<SeatGraph>
  /** El mapa de calor de los puestos: horas y gente por ordenador, sin nombres. */
  heat: (actor: Actor, query: unknown) => Promise<SeatHeat>
}

const DAY_MS = 86_400_000

/** La foto de los puestos se repite cada pocos minutos: no hace falta más fresco. */
const CACHE_TTL_MS = 5 * 60_000

/** Por debajo de esto (una hora al lado, más o menos) dos personas no se unen. */
const MIN_CLOSENESS = 2

/** Un día `YYYY-MM-DD`. */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha YYYY-MM-DD')

/**
 * El periodo: los últimos `days` días (hasta diez años, que es «todo») o, con
 * `from`, de ese día a `to` (incluido; sin él, hasta ahora).
 */
const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  from: day.optional(),
  to: day.optional(),
})

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
  const cache = createTtlCache<SeatGraph>({ ttlMs: CACHE_TTL_MS, maxEntries: 12, now })
  const heatCache = createTtlCache<SeatHeat>({ ttlMs: CACHE_TTL_MS, maxEntries: 12, now })

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
  async function loadHeat(actor: Actor, { since, until, days }: Span): Promise<SeatHeat> {
    const [{ sessions }, known] = await Promise.all([
      seatSessionsIn(db, actor.campusId, since, until, await seesFor(audience, actor)),
      knownSeats(actor.campusId),
    ])

    return { days, ...seatHeatOf(sessions, known) }
  }

  async function load(actor: Actor, { since, until, days }: Span): Promise<SeatGraph> {
    const { sessions, images } = await seatSessionsIn(
      db,
      actor.campusId,
      since,
      until,
      await seesFor(audience, actor),
    )

    const seating = seatingOf(sessions)
    const pairs = seating.pairs.filter((pair) => pair.closeness >= MIN_CLOSENESS)
    const community = communitiesOf(
      pairs.map((pair) => ({ a: pair.a, b: pair.b, ab: pair.closeness, ba: 0 })),
      [...seating.people.keys()],
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
    }
  }

  return {
    async graph(actor, query) {
      const parsed = parse(querySchema, query)

      return cache.get(await keyOf(actor, parsed), () => load(actor, spanOf(parsed, now())))
    },

    async heat(actor, query) {
      const parsed = parse(querySchema, query)

      return heatCache.get(await keyOf(actor, parsed), () => loadHeat(actor, spanOf(parsed, now())))
    },
  }
}
