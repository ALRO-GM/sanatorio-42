/**
 * La red de correcciones de un campus: el grafo, sus cuentas y el buscador.
 *
 * Las cuentas se hacen sobre todo lo que cumple los filtros (fechas, proyecto)
 * y se guardan un rato en memoria: mover el tope de personas o elegir a alguien
 * no vuelve a leer la base.
 *
 * Mundos separados (`docs/piscineros.md`): un estudiante ve las correcciones
 * del 42cursus y nunca a un piscinero; un piscinero, solo las de la piscina de
 * su campus y solo a piscineros.
 */

import type {
  NetworkGraph,
  NetworkMine,
  NetworkNode,
  NetworkPairDetail,
  NetworkPerson,
  NetworkStrictest,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { audienceKey, NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'
import { analyse, isAnonymised, mergePairs, select, toLink } from './network.analysis.js'
import type { Analysis } from './network.analysis.js'
import type { NetworkRepository } from './network.repository.js'
import { CORE_CURSUS, PISCINE_CURSUS } from './network.sync.js'
import type { CorrectionSync } from './network.sync.js'

type NetworkServiceOptions = {
  corrections: NetworkRepository
  replica: ReplicaRepository
  sync: CorrectionSync
  /** La copia de la piscina: su estado es el que ve un piscinero. Sin ella, el de `sync`. */
  poolSync?: CorrectionSync
  /** Quién ve a quién. Sin ella, nadie es piscinero. */
  audience?: Audience
  /** Los piscineros en curso de un campus, con su avatar: la «gente de dentro» de su red. */
  poolMembersOf?: (campusId: number) => Promise<Map<string, string | null>>
  now?: () => number
}

/** Las correcciones que ve cada cual: las de la piscina o las del 42cursus. */
const cursusOf = (actor: Actor): number => (actor.pool === true ? PISCINE_CURSUS : CORE_CURSUS)

/** Se queda con lo de un mapa que se puede ver. */
const visible = <T>(map: Map<string, T>, sees: (login: string) => boolean): Map<string, T> =>
  new Map([...map].filter(([login]) => sees(login)))

/** Cuánto vale un análisis guardado. La copia avanza por detrás: no hace falta más fresco. */
const CACHE_TTL_MS = 60_000

/** Cuánto vale el catálogo (años de llegada, proyectos): cambia con cuentagotas. */
const CATALOGUE_TTL_MS = 5 * 60_000

/** Análisis que cada persona puede pedir calcular de nuevo en un minuto. */
const FRESH_PER_MINUTE = 20

/** Análisis distintos que se recuerdan a la vez. */
const CACHE_SIZE = 12

/** Parejas que se mandan en "quién se corrige más": la lista se puede recorrer entera. */
const TOP_PAIRS = 100

const DEFAULT_LIMIT = 300
/** Con esto cabe el campus entero: es la opción "todas" de la web. */
const MAX_LIMIT = 20_000

/** Una fecha (`2026-10-11`) o un instante ISO-8601. */
const moment = z
  .string()
  .trim()
  .refine((value) => /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value)), {
    message: 'fecha no válida',
  })

const login = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,30}$/, 'login no válido')

/**
 * Los campus que se miran juntos: sus ids separados por comas, o `all` para
 * todos los que tienen correcciones copiadas. Sin él, el de quien pregunta.
 */
const campusesField = z
  .string()
  .regex(/^(all|\d{1,6}(,\d{1,6}){0,49})$/)
  .optional()

const pairSchema = z.object({
  campuses: campusesField,
  a: login,
  b: login,
  from: moment.optional(),
  to: moment.optional(),
  projectId: z.coerce.number().int().positive().optional(),
  verdict: z.enum(['pass', 'fail']).optional(),
})

const strictSchema = z.object({
  campuses: campusesField,
  min: z.coerce.number().int().min(1).max(500).default(20),
  // `desc`: los que más suspenden primero; `asc`: los que menos.
  order: z.enum(['asc', 'desc']).default('desc'),
  from: moment.optional(),
  to: moment.optional(),
  projectId: z.coerce.number().int().positive().optional(),
})

/** Personas que da el buscador. */
const PEOPLE_SHOWN = 8

/** Personas que salen en el ranking de estrictos. */
const STRICTEST_SHOWN = 100

const round3 = (value: number): number => Math.round(value * 1000) / 1000

/** Correcciones que se listan de una pareja. */
const PAIR_LIMIT = 60

/** Con menos veredictos que esto, el porcentaje de aprobados no dice nada. */
const MIN_VERDICTS = 3

/** Límite superior de un filtro: una fecha sin hora incluye ese día entero. */
function endOf(to: string | undefined): string | null {
  if (to === undefined) {
    return null
  }

  return to.length === 10 ? `${to}T23:59:59.999Z` : to
}

/** El veredicto del filtro, como lo guarda la base. */
function passedOf(verdict: 'pass' | 'fail' | undefined): boolean | null {
  return verdict === undefined ? null : verdict === 'pass'
}

function passRateOf(verdict: { judged: number; passed: number } | undefined): number | null {
  return verdict === undefined || verdict.judged < MIN_VERDICTS
    ? null
    : Math.round((1000 * verdict.passed) / verdict.judged) / 1000
}

const querySchema = z.object({
  campuses: campusesField,
  from: moment.optional(),
  to: moment.optional(),
  login: login.optional(),
  projectId: z.coerce.number().int().positive().optional(),
  verdict: z.enum(['pass', 'fail']).optional(),
  // Llega como texto en la URL: `1` o `true` lo activan.
  mutual: z
    .enum(['1', 'true', '0', 'false'])
    .optional()
    .transform((value) => value === '1' || value === 'true'),
  min: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(10).max(MAX_LIMIT).default(DEFAULT_LIMIT),
})

type Cached = {
  analysis: Analysis
  /** Veredictos que ha dado cada quien como corrector, y los que han recibido sus proyectos. */
  given: Map<string, { judged: number; passed: number }>
  received: Map<string, { judged: number; passed: number }>
  timeline: { month: string; corrections: number }[]
  /** Avatar de cada persona de los campus que se miran. Quien no está aquí es de fuera. */
  members: Map<string, string | null>
  /** De qué campus es cada una. */
  homes: Map<string, number>
}

type Catalogue = {
  /** Año de la primera corrección de cada persona. */
  years: Map<string, number>
  projects: { id: number; name: string; corrections: number; passRate: number | null }[]
}

export function createNetworkService(options: NetworkServiceOptions) {
  const { corrections, replica, sync } = options
  const now = options.now ?? Date.now
  const audience = options.audience ?? NO_POOL
  const poolSync = options.poolSync ?? sync
  const poolMembersOf =
    options.poolMembersOf ?? (() => Promise.resolve(new Map<string, string | null>()))

  /**
   * A quién puede ver `actor` en la red de esos campus. Un piscinero solo mira
   * el suyo; un estudiante no ve a los piscineros de ninguno de los que mira.
   */
  const seesIn = async (
    actor: Actor,
    campuses: readonly number[],
  ): Promise<(login: string) => boolean> => {
    if (actor.pool === true) return seesFor(audience, actor)

    const checks = await Promise.all(
      [...new Set([actor.campusId, ...campuses])].map((campusId) =>
        seesFor(audience, { campusId, pool: false, login: actor.login }),
      ),
    )

    return (login) => checks.every((sees) => sees(login))
  }

  /** La gente de dentro de cada campus, con su avatar: piscineros o estudiantes. */
  const membersIn = (actor: Actor, campuses: readonly number[]) =>
    Promise.all(
      campuses.map((id) => (actor.pool === true ? poolMembersOf(id) : replica.membersOf(id))),
    )
  const analyses = createTtlCache<Cached>({ ttlMs: CACHE_TTL_MS, maxEntries: CACHE_SIZE, now })
  const catalogues = createTtlCache<Catalogue>({
    ttlMs: CATALOGUE_TTL_MS,
    maxEntries: CACHE_SIZE,
    now,
  })

  /** El análisis de unos filtros, del caché si es reciente. */
  // Análisis nuevos (los que no están ya calculados) por persona y minuto. Las
  // fechas y los filtros los elige quien pregunta: sin esto, variándolos se
  // podría hacer recalcular la red entera sin parar.
  const fresh = createRateLimit({ max: FRESH_PER_MINUTE, windowMs: 60_000, now })

  const analysisFor = (
    actor: Actor,
    campusId: readonly number[],
    from: string | null,
    to: string | null,
    projectId: number | null,
    passed: boolean | null,
  ): Promise<Cached> =>
    // Va ya filtrado por quién se ve: la clave lleva la versión de los ocultos
    // (y a quien mira, si está oculto, que a sí mismo sí se ve).
    audienceKey(audience, actor).then((seen) =>
      analyses.get(
        `${cursusOf(actor)}|${seen}|${campusId.join(',')}|${from ?? ''}|${to ?? ''}|${projectId ?? ''}|${passed ?? ''}`,
        async () => {
          if (!fresh.hit(actor.login)) {
            throw domainError(
              'rate_limited',
              'Demasiados análisis distintos seguidos: espera un minuto',
            )
          }

          const cursus = cursusOf(actor)
          const [all, everyCampus, givenAll, receivedAll, timeline, sees] = await Promise.all([
            corrections.pairs({ campusId, cursus, from, to, projectId, passed }),
            membersIn(actor, campusId),
            corrections.verdicts({ campusId, cursus, from, to, projectId }, 'corrector'),
            corrections.verdicts({ campusId, cursus, from, to, projectId }, 'corrected'),
            // La línea de tiempo no lleva fechas: enseña todo para poder elegirlas.
            corrections.timeline({ campusId, cursus, projectId }),
            seesIn(actor, campusId),
          ])
          // Una pareja con alguien que no se puede ver no sale, ni cuenta como de
          // dentro: así un piscinero no entra en la red de un estudiante, ni al revés.
          const rows = all.filter((row) => sees(row.corrector) && sees(row.corrected))
          const perCampus = everyCampus.map((campus) => visible(campus, sees))
          const given = visible(givenAll, sees)
          const received = visible(receivedAll, sees)
          const members = new Map(perCampus.flatMap((campus) => [...campus]))
          const homes = new Map(
            perCampus.flatMap((campus, index) =>
              [...campus.keys()].map((login): [string, number] => [login, campusId[index] ?? 0]),
            ),
          )
          // Sin réplica del campus no se sabe quién es de fuera: se trata a todo el
          // mundo como de dentro en vez de enseñar un grafo vacío.
          const everyone = rows.flatMap((row) => [row.corrector, row.corrected])
          const inside: ReadonlySet<string> =
            members.size === 0
              ? new Set(everyone)
              : new Set([...members.keys(), ...everyone.filter(isAnonymised)])

          return {
            analysis: analyse(mergePairs(rows, inside), inside),
            members,
            homes,
            given,
            received,
            timeline,
          }
        },
      ),
    )

  /** Lo que no depende de los filtros: año de llegada de cada quien y proyectos con correcciones. */
  const catalogueOf = (campusId: readonly number[], cursus: number): Promise<Catalogue> =>
    catalogues.get(`${cursus}|${campusId.join(',')}`, async () => {
      const [years, projects] = await Promise.all([
        corrections.firstYears(campusId, cursus),
        corrections.projects(campusId, cursus),
      ])
      const names = await replica.projectNames(projects.map((project) => project.id))

      return {
        years,
        projects: projects.flatMap((project) => {
          const name = names.get(project.id)

          return name === undefined ? [] : [{ ...project, name }]
        }),
      }
    })

  /** Los campus con correcciones copiadas: cambia poco, se recuerda un rato. */
  const known = createTtlCache<number[]>({ ttlMs: CATALOGUE_TTL_MS, maxEntries: 1, now })

  /**
   * Los campus que se piden, en orden. Solo valen los que tienen correcciones
   * copiadas, más el de quien pregunta; si no queda ninguno, el suyo.
   */
  const campusesOf = async (actor: Actor, asked: string | undefined): Promise<number[]> => {
    // Un piscinero solo ve la piscina de su campus.
    if (asked === undefined || actor.pool === true) return [actor.campusId]

    const available = new Set([
      ...(await known.get('all', () => corrections.campuses())),
      actor.campusId,
    ])
    const wanted = asked === 'all' ? [...available] : asked.split(',').map(Number)
    const chosen = [...new Set(wanted)].filter((id) => available.has(id)).sort((a, b) => a - b)

    return chosen.length === 0 ? [actor.campusId] : chosen
  }

  return {
    /**
     * El grafo de correcciones del campus que mira `actor`, o de los que pida
     * en `campuses` para verlos juntos.
     *
     * @param input `from`, `to`, `login`, `projectId`, `min`, `limit`: todo opcional.
     */
    async graph(actor: Actor, input: unknown): Promise<NetworkGraph> {
      const query = parse(querySchema, input)
      const from = query.from ?? null
      // Una fecha sin hora como límite superior incluye ese día entero.
      const to = endOf(query.to)
      const projectId = query.projectId ?? null
      const focus = query.login ?? null

      const campuses = await campusesOf(actor, query.campuses)
      const [
        { analysis, members, homes, given, received, timeline },
        { years, projects },
        status,
        available,
        names,
      ] = await Promise.all([
        analysisFor(actor, campuses, from, to, projectId, passedOf(query.verdict)),
        catalogueOf(campuses, cursusOf(actor)),
        (actor.pool === true ? poolSync : sync).status(actor.campusId),
        actor.pool === true ? [] : known.get('all', () => corrections.campuses()),
        replica.listCampuses([]),
      ])
      const shown = select(analysis, {
        focus,
        min: query.min,
        limit: query.limit,
        mutual: query.mutual,
      })
      // Quien viene de fuera no está en la réplica del campus: su foto se busca aparte.
      const strangers = shown.logins.filter((login) => !members.has(login))
      const images =
        strangers.length === 0
          ? new Map<string, string | null>()
          : await replica.imagesOf(strangers)

      const nodes = shown.logins.flatMap((login): NetworkNode[] => {
        const person = analysis.people.get(login)

        return person === undefined
          ? []
          : [
              {
                ...person,
                image: members.get(login) ?? images.get(login) ?? null,
                givenPassRate: passRateOf(given.get(login)),
                receivedPassRate: passRateOf(received.get(login)),
                cohort: years.get(login) ?? null,
                campusId: homes.get(login) ?? null,
              },
            ]
      })

      return {
        query: {
          from,
          to,
          login: focus,
          projectId,
          verdict: query.verdict ?? null,
          mutual: query.mutual,
          min: query.min,
          limit: query.limit,
        },
        campuses,
        // Los que se pueden elegir: los que tienen correcciones, y el propio.
        available: [...new Set([...available, actor.campusId])]
          .sort((a, b) => a - b)
          .map((id) => ({
            id,
            name: names.find((campus) => campus.id === id)?.name ?? String(id),
          })),
        nodes,
        links: shown.links,
        totals: analysis.totals,
        hidden: shown.hidden,
        topPairs: [...analysis.pairs]
          .sort(
            (x, y) => Math.min(y.ab, y.ba) - Math.min(x.ab, x.ba) || y.ab + y.ba - (x.ab + x.ba),
          )
          .slice(0, TOP_PAIRS)
          .map(toLink),
        timeline,
        projects,
        sync: status,
      }
    },

    /**
     * Las correcciones que se han hecho dos personas, con los mismos filtros de
     * fecha y proyecto que el grafo.
     */
    async pair(actor: Actor, input: unknown): Promise<NetworkPairDetail> {
      const query = parse(pairSchema, input)
      const campusId = await campusesOf(actor, query.campuses)
      const sees = await seesIn(actor, campusId)

      // Con alguien a quien no se puede ver no hay nada que enseñar.
      if (!sees(query.a) || !sees(query.b)) {
        return { a: query.a, b: query.b, forth: 0, back: 0, corrections: [] }
      }

      const filter = {
        campusId,
        cursus: cursusOf(actor),
        from: query.from ?? null,
        to: endOf(query.to),
        projectId: query.projectId ?? null,
        passed: passedOf(query.verdict),
      }
      const [rows, counts] = await Promise.all([
        corrections.between(filter, query.a, query.b, PAIR_LIMIT),
        corrections.countBetween(filter, query.a, query.b),
      ])
      const names = await replica.projectNames([
        ...new Set(rows.flatMap((row) => (row.projectId === null ? [] : [row.projectId]))),
      ])

      return {
        a: query.a,
        b: query.b,
        ...counts,
        corrections: rows.map((row) => ({
          id: row.id,
          corrector: row.corrector,
          corrected: row.corrected,
          project: row.projectId === null ? null : (names.get(row.projectId) ?? null),
          at: row.beginAt,
          mark: row.finalMark,
          positive: row.passed,
        })),
      }
    },

    /**
     * Con quién se ha corregido quien pregunta, en todo el histórico: cuántas
     * veces en cada sentido. Para que otras pantallas sepan si dos personas ya
     * se conocen de corregirse.
     */
    async mine(actor: Actor): Promise<NetworkMine> {
      const [partners, sees] = await Promise.all([
        corrections.partnersOf(actor.campusId, actor.login, cursusOf(actor)),
        seesIn(actor, [actor.campusId]),
      ])

      return { partners: partners.filter((partner) => sees(partner.login)) }
    },

    /**
     * Quién suspende más al corregir, entre quienes han evaluado al menos `min`
     * proyectos ajenos. Con los mismos filtros de fecha y proyecto que el grafo.
     *
     * El mínimo importa: con tres evaluaciones, suspender una ya es un 33 %.
     */
    async strictest(actor: Actor, input: unknown): Promise<NetworkStrictest> {
      const query = parse(strictSchema, input)
      const { analysis, members, given } = await analysisFor(
        actor,
        await campusesOf(actor, query.campuses),
        query.from ?? null,
        endOf(query.to),
        query.projectId ?? null,
        null,
      )
      // Solo gente del campus: de quien viene de fuera se ve una parte mínima.
      const insiders = [...given].filter(
        ([login]) => analysis.people.get(login)?.external === false,
      )
      const eligible = insiders.filter(([, verdict]) => verdict.judged >= query.min)
      const judged = insiders.reduce((sum, [, verdict]) => sum + verdict.judged, 0)
      const passed = insiders.reduce((sum, [, verdict]) => sum + verdict.passed, 0)

      return {
        min: query.min,
        order: query.order,
        eligible: eligible.length,
        campusFailRate: judged === 0 ? 0 : round3((judged - passed) / judged),
        people: eligible
          .map(([login, verdict]) => ({
            login,
            image: members.get(login) ?? null,
            judged: verdict.judged,
            failed: verdict.judged - verdict.passed,
            failRate: round3((verdict.judged - verdict.passed) / verdict.judged),
          }))
          // A igual porcentaje, primero quien más ha evaluado: su dato es más firme.
          .sort(
            (a, b) =>
              (query.order === 'desc' ? b.failRate - a.failRate : a.failRate - b.failRate) ||
              b.judged - a.judged ||
              (a.login < b.login ? -1 : 1),
          )
          .slice(0, STRICTEST_SHOWN),
      }
    },

    /** Logins que empiezan por lo escrito, para el buscador de personas. */
    async people(actor: Actor, q: unknown, campuses?: unknown): Promise<NetworkPerson[]> {
      const prefix = typeof q === 'string' ? q.trim().toLowerCase() : ''

      if (!/^[a-z0-9-]{1,30}$/.test(prefix)) {
        return []
      }

      const asked = campusesField.safeParse(campuses)
      const chosen = await campusesOf(actor, asked.success ? asked.data : undefined)
      const [candidates, sees] = await Promise.all([
        // Se piden de más: algunos pueden quedar fuera por no poder verse.
        corrections.search(chosen, prefix, 2 * PEOPLE_SHOWN, cursusOf(actor)),
        seesIn(actor, chosen),
      ])
      const found = candidates.filter((person) => sees(person.login)).slice(0, PEOPLE_SHOWN)
      const logins = found.map((person) => person.login)
      // Los avatares de los piscineros están con ellos, no en la réplica de estudiantes.
      const images =
        actor.pool === true ? await poolMembersOf(actor.campusId) : await replica.imagesOf(logins)

      return found.map((person) => ({ ...person, image: images.get(person.login) ?? null }))
    },
  }
}

export type NetworkService = ReturnType<typeof createNetworkService>
