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
import { parse } from '../../core/validation.js'
import { communitiesOf } from './network.analysis.js'
import { seatHeatOf } from './seating.heat.js'
import { seatingOf } from './seating.rules.js'
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

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})

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
  async function keyOf(actor: Actor, days: number): Promise<string> {
    const seen = await audienceKey(audience, actor)

    return `${String(actor.campusId)}|${actor.pool === true ? 'pool' : 'student'}|${seen}|${String(days)}`
  }

  /**
   * El mapa de calor. Cuenta solo las horas de la gente que quien mira puede
   * ver, como el grafo: así los dos suman lo mismo y nadie oculto (ni del
   * otro mundo) deja huella en un puesto.
   */
  async function loadHeat(actor: Actor, days: number): Promise<SeatHeat> {
    const until = now()
    const [{ sessions }, known] = await Promise.all([
      seatSessionsIn(
        db,
        actor.campusId,
        until - days * DAY_MS,
        until,
        await seesFor(audience, actor),
      ),
      knownSeats(actor.campusId),
    ])

    return { days, ...seatHeatOf(sessions, known) }
  }

  async function load(actor: Actor, days: number): Promise<SeatGraph> {
    const until = now()
    const since = until - days * DAY_MS
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

    return {
      days,
      people: people.sort((x, y) => y.closeness - x.closeness || x.login.localeCompare(y.login)),
      links: pairs.map((pair) => ({
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
      const { days } = parse(querySchema, query)

      return cache.get(await keyOf(actor, days), () => load(actor, days))
    },

    async heat(actor, query) {
      const { days } = parse(querySchema, query)

      return heatCache.get(await keyOf(actor, days), () => loadHeat(actor, days))
    },
  }
}
