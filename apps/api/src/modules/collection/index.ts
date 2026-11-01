/**
 * Módulo `collection`: el álbum de correcciones del tablón
 * (`docs/correcciones-coleccion.md`). Cada proyecto que puedes corregir es un
 * cromo; aquí se cuenta lo raro que es cada uno y quién lleva el álbum más
 * completo entre tus amistades, tu kickoff, tu círculo y todo tu mundo.
 *
 * Todo sale de la réplica y de la copia de correcciones: no pide nada a 42.
 * Lo del campus se calcula una vez cada rato y se comparte; lo de quien
 * pregunta (lo que ve, lo que ha corregido) se aplica en cada petición.
 */

import type {
  CollectionGroup,
  CollectionStanding,
  CorrectionCollection,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { kickoffMonths } from '../../core/kickoffs.js'
import { isoAt, monthOf } from '../../core/time.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import { PISCINE } from '../replica/index.js'
import { CORE_CURSUS, POOL_CURSUS, createCollectionRepository } from './collection.repository.js'
import type { FinishedRow } from './collection.repository.js'
import { closestOf, isExamSlug, rankTallies, rarityOf, tallyOf } from './collection.rules.js'
import type { Collector, Tally } from './collection.rules.js'

const GROUPS = ['friends', 'kickoff', 'circle', 'world'] as const satisfies CollectionGroup[]

const querySchema = z.object({ group: z.enum(GROUPS).optional() })

/** Las amistades con las que te comparas: las 10 con las que más te has corregido. */
const FRIENDS = 10
/** Filas de la clasificación, como mucho (la tuya llega aparte). */
const ROWS = 50
/** Lo del campus se rehace cada este rato: cambia despacio (una corrección al día). */
const TTL_MS = 10 * 60_000
/** Como en el grafo del tablón: sin correcciones en un año, el proyecto se da por retirado. */
const RETIRED_AFTER_DAYS = 365
/** Un piscinero lo es 60 días desde que empieza (`docs/piscineros.md`). */
const POOL_DAYS = 60

/** Los proyectos de la piscina que son cromos: todos menos los exámenes. */
const POOL_SLUGS = PISCINE.map((project) => project.slug).filter((slug) => !isExamSlug(slug))

type CollectionDeps = {
  db: Db
  /** Quién ve a quién (`docs/piscineros.md`). */
  audience?: Audience
  /** El círculo de cada proyecto de un plan: el álbum del common core es la suma de los dos. */
  circles: (track: 'classic' | 'next') => Promise<Map<number, number>>
  /** El círculo en que va cada persona, sin preguntar a 42. */
  circlesOf: (logins: readonly string[]) => Promise<Map<string, number>>
  now?: () => number
}

const DAY = 24 * 60 * 60_000

/** Lo de un campus (y un mundo) que vale para todo el que mira. */
type World = {
  universe: number[]
  people: Map<string, FinishedRow>
  corrected: Map<string, Set<number>>
  alive: Set<number> | null
  circleOf: Map<string, number>
  kickoffOf: Map<string, string>
}

/**
 * La kickoff (`AAAA-MM`) de cada cual, la misma que el Avance y Exámenes: entre
 * las kickoffs reales del campus (`core/kickoffs.ts`), con cuándo empezó el
 * cursus (o su primer proyecto) y lo primero que se sabe de él en 42. Un
 * piscinero va con su piscina: el mes en que empezó.
 */
function kickoffsOf(
  people: Iterable<FinishedRow>,
  campusId: number,
  pool: boolean,
): Map<string, string> {
  const known = [...people].flatMap((row) => {
    const begin = row.beginAt === null ? NaN : Date.parse(row.beginAt)
    const first = row.firstAt === null ? NaN : Date.parse(row.firstAt)
    const start = Number.isFinite(begin) ? begin : first

    return Number.isFinite(start)
      ? [
          {
            key: row.login,
            campus: campusId,
            start,
            general: Number.isFinite(first) ? Math.min(start, first) : start,
          },
        ]
      : []
  })

  if (pool) return new Map(known.map((one) => [one.key, monthOf(one.start)]))

  return kickoffMonths(known)
}

export function createCollectionModule(deps: CollectionDeps) {
  const repository = createCollectionRepository(deps.db)
  const now = deps.now ?? Date.now
  const audience = deps.audience ?? NO_POOL
  const worlds = createTtlCache<World>({ ttlMs: TTL_MS, maxEntries: 20, now })

  /** Los cromos del common core: los proyectos de los dos planes, sin exámenes. */
  async function coreUniverse(): Promise<number[]> {
    const [classic, next] = await Promise.all([deps.circles('classic'), deps.circles('next')])
    const ids = [...new Set([...classic.keys(), ...next.keys()])]
    const slugs = await repository.slugsOf(ids)

    return ids.filter((id) => !isExamSlug(slugs.get(id) ?? null))
  }

  async function loadWorld(campusId: number, pool: boolean): Promise<World> {
    const universe = pool ? await repository.projectIdsOf(POOL_SLUGS) : await coreUniverse()
    const cursus = pool ? POOL_CURSUS : CORE_CURSUS
    const [people, corrected, alive] = await Promise.all([
      repository.finishedIn(
        campusId,
        pool ? { since: isoAt(now() - POOL_DAYS * DAY) } : null,
        universe,
      ),
      repository.correctedIn(campusId, cursus),
      // En la piscina nada se retira: dura dos meses.
      pool
        ? Promise.resolve(null)
        : repository.aliveSince(campusId, cursus, isoAt(now() - RETIRED_AFTER_DAYS * DAY)),
    ])
    const circleOf = pool ? new Map<string, number>() : await deps.circlesOf([...people.keys()])

    return {
      universe,
      people,
      corrected,
      alive,
      circleOf,
      kickoffOf: kickoffsOf(people.values(), campusId, pool),
    }
  }

  async function collection(actor: Actor, input: unknown): Promise<CorrectionCollection> {
    const { group = 'friends' } = parse(querySchema, input)
    const pool = actor.pool === true
    const self = actor.login.toLowerCase()
    const cursus = pool ? POOL_CURSUS : CORE_CURSUS
    const [world, sees, mine, partners] = await Promise.all([
      worlds.get(`${String(actor.campusId)}|${pool ? 'pool' : 'core'}`, () =>
        loadWorld(actor.campusId, pool),
      ),
      seesFor(audience, actor),
      repository.correctedBy(actor.login, cursus),
      repository.partnersOf(actor.campusId, cursus, actor.login),
    ])

    // Quien no se ve no sale ni cuenta: ni en los puestos ni en la rareza.
    const people: Collector[] = [...world.people.values()]
      .filter((row) => sees(row.login))
      .map((row) => ({
        login: row.login,
        image: row.image,
        kickoff: world.kickoffOf.get(row.login) ?? null,
        finished: row.finished,
        // Lo tuyo, de cualquier campus, como en el grafo del tablón.
        corrected: row.login === self ? mine : (world.corrected.get(row.login) ?? new Set()),
      }))
    const tallies = new Map<string, Tally>()

    for (const person of people) {
      const tally = tallyOf(person, world.alive)

      if (tally !== null) tallies.set(person.login, tally)
    }

    const me = people.find((person) => person.login === self)
    const myKickoff = me?.kickoff ?? null
    const myCircle = world.circleOf.get(self) ?? null
    const friends = new Set([
      self,
      ...closestOf(partners, self, (login) => sees(login) && tallies.has(login), FRIENDS),
    ])
    const members: Partial<Record<CollectionGroup, (login: string) => boolean>> = {
      friends: (login) => friends.has(login),
      world: () => true,
    }

    if (!pool && myCircle !== null) {
      members.circle = (login) => world.circleOf.get(login) === myCircle
    }

    const kickoffs = new Map(people.map((person) => [person.login, person.kickoff]))

    if (myKickoff !== null) {
      members.kickoff = (login) => kickoffs.get(login) === myKickoff
    }

    const ranked = (chosen: CollectionGroup) => {
      const keep = members[chosen]

      return keep === undefined
        ? null
        : rankTallies([...tallies.values()].filter((tally) => keep(tally.login)))
    }
    const standings: CollectionStanding[] = []
    let rows: CorrectionCollection['rows'] = []
    let myEntry: CorrectionCollection['me'] = null

    for (const each of GROUPS) {
      const entries = ranked(each)

      if (entries === null) continue

      const mineHere = entries.find((entry) => entry.login === self) ?? null

      standings.push({
        group: each,
        label:
          each === 'kickoff'
            ? myKickoff
            : each === 'circle' && myCircle !== null
              ? String(myCircle)
              : null,
        size: entries.length,
        rank: mineHere?.rank ?? null,
      })

      if (each === group) {
        rows = entries.slice(0, ROWS)
        myEntry = mineHere
      }
    }

    return {
      rarity: rarityOf(people, world.universe),
      standings,
      group,
      rows,
      me: myEntry,
    }
  }

  const service = { collection }

  return {
    name: 'collection',
    service,
    routes: (app, { session }) => {
      /**
       * `GET /corrections/collection?group=friends|kickoff|circle|world` →
       * `CorrectionCollection`: rareza de cada cromo, tus puestos y la
       * clasificación del grupo elegido.
       */
      app.get('/corrections/collection', async (request, reply) => {
        return reply.send(await service.collection(await session.actor(request), request.query))
      })
    },
  } satisfies AppModule & { service: typeof service }
}
