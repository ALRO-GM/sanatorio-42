/**
 * La red de correcciones de un campus: el grafo, sus cuentas y el buscador.
 *
 * Las cuentas se hacen sobre todo lo que cumple los filtros (fechas, proyecto)
 * y se guardan un rato en memoria: mover el tope de personas o elegir a alguien
 * no vuelve a leer la base.
 */

import type {
  NetworkGraph,
  NetworkMine,
  NetworkNode,
  NetworkPairDetail,
  NetworkPerson,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'
import { analyse, isAnonymised, mergePairs, select, toLink } from './network.analysis.js'
import type { Analysis } from './network.analysis.js'
import type { NetworkRepository } from './network.repository.js'
import type { CorrectionSync } from './network.sync.js'

export type NetworkServiceOptions = {
  corrections: NetworkRepository
  replica: ReplicaRepository
  sync: CorrectionSync
  now?: () => number
}

/** Cuánto vale un análisis guardado. La copia avanza por detrás: no hace falta más fresco. */
const CACHE_TTL_MS = 60_000

/** Cuánto vale el catálogo (años de llegada, proyectos): cambia con cuentagotas. */
const CATALOGUE_TTL_MS = 5 * 60_000

/** Análisis distintos que se recuerdan a la vez. */
const CACHE_SIZE = 12

/** Parejas que se enseñan en "quién se corrige más". */
const TOP_PAIRS = 12

const DEFAULT_LIMIT = 300
const MAX_LIMIT = 2000

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

const pairSchema = z.object({
  a: login,
  b: login,
  from: moment.optional(),
  to: moment.optional(),
  projectId: z.coerce.number().int().positive().optional(),
})

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

function passRateOf(verdict: { judged: number; passed: number } | undefined): number | null {
  return verdict === undefined || verdict.judged < MIN_VERDICTS
    ? null
    : Math.round((1000 * verdict.passed) / verdict.judged) / 1000
}

const querySchema = z.object({
  from: moment.optional(),
  to: moment.optional(),
  login: login.optional(),
  projectId: z.coerce.number().int().positive().optional(),
  min: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(10).max(MAX_LIMIT).default(DEFAULT_LIMIT),
})

type Cached = {
  analysis: Analysis
  /** Veredictos de cada corrector, para saber cuánto aprueba. */
  verdicts: Map<string, { judged: number; passed: number }>
  timeline: { month: string; corrections: number }[]
  /** Avatar de cada persona del campus. Quien no está aquí es de fuera. */
  members: Map<string, string | null>
}

type Catalogue = {
  /** Año de la primera corrección de cada persona. */
  years: Map<string, number>
  projects: { id: number; name: string; corrections: number }[]
}

export function createNetworkService(options: NetworkServiceOptions) {
  const { corrections, replica, sync } = options
  const now = options.now ?? Date.now
  const analyses = createTtlCache<Cached>({ ttlMs: CACHE_TTL_MS, maxEntries: CACHE_SIZE, now })
  const catalogues = createTtlCache<Catalogue>({
    ttlMs: CATALOGUE_TTL_MS,
    maxEntries: CACHE_SIZE,
    now,
  })

  /** El análisis de unos filtros, del caché si es reciente. */
  const analysisFor = (
    campusId: number,
    from: string | null,
    to: string | null,
    projectId: number | null,
  ): Promise<Cached> =>
    analyses.get(`${campusId}|${from ?? ''}|${to ?? ''}|${projectId ?? ''}`, async () => {
      const [rows, members, verdicts, timeline] = await Promise.all([
        corrections.pairs({ campusId, from, to, projectId }),
        replica.membersOf(campusId),
        corrections.verdicts({ campusId, from, to, projectId }),
        // La línea de tiempo no lleva fechas: enseña todo para poder elegirlas.
        corrections.timeline({ campusId, projectId }),
      ])
      // Sin réplica del campus no se sabe quién es de fuera: se trata a todo el
      // mundo como de dentro en vez de enseñar un grafo vacío.
      const everyone = rows.flatMap((row) => [row.corrector, row.corrected])
      const inside: ReadonlySet<string> =
        members.size === 0
          ? new Set(everyone)
          : new Set([...members.keys(), ...everyone.filter(isAnonymised)])

      return { analysis: analyse(mergePairs(rows, inside), inside), members, verdicts, timeline }
    })

  /** Lo que no depende de los filtros: año de llegada de cada quien y proyectos con correcciones. */
  const catalogueOf = (campusId: number): Promise<Catalogue> =>
    catalogues.get(String(campusId), async () => {
      const [years, projects] = await Promise.all([
        corrections.firstYears(campusId),
        corrections.projects(campusId),
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

  return {
    /**
     * El grafo de correcciones del campus que mira `actor`.
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

      const [{ analysis, members, verdicts, timeline }, { years, projects }, status] =
        await Promise.all([
          analysisFor(actor.campusId, from, to, projectId),
          catalogueOf(actor.campusId),
          sync.status(actor.campusId),
        ])
      const shown = select(analysis, { focus, min: query.min, limit: query.limit })
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
                passRate: passRateOf(verdicts.get(login)),
                cohort: years.get(login) ?? null,
              },
            ]
      })

      return {
        query: { from, to, login: focus, projectId, min: query.min, limit: query.limit },
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
      const filter = {
        campusId: actor.campusId,
        from: query.from ?? null,
        to: endOf(query.to),
        projectId: query.projectId ?? null,
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
          positive: row.positive,
        })),
      }
    },

    /**
     * Con quién se ha corregido quien pregunta, en todo el histórico: cuántas
     * veces en cada sentido. Para que otras pantallas sepan si dos personas ya
     * se conocen de corregirse.
     */
    async mine(actor: Actor): Promise<NetworkMine> {
      return { partners: await corrections.partnersOf(actor.campusId, actor.login) }
    },

    /** Logins que empiezan por lo escrito, para el buscador de personas. */
    async people(actor: Actor, q: unknown): Promise<NetworkPerson[]> {
      const prefix = typeof q === 'string' ? q.trim().toLowerCase() : ''

      if (!/^[a-z0-9-]{1,30}$/.test(prefix)) {
        return []
      }

      const found = await corrections.search(actor.campusId, prefix, 8)
      const images = await replica.imagesOf(found.map((person) => person.login))

      return found.map((person) => ({ ...person, image: images.get(person.login) ?? null }))
    },
  }
}

export type NetworkService = ReturnType<typeof createNetworkService>
