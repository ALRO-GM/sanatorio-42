/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): la línea
 * de quien mira, la media de su campus y la de todos, por plan (C, Python o
 * los dos), por población (quien terminó, quien sigue más quien terminó, o
 * quien se tragó el black hole: `docs/blackhole.md`) y las líneas de cada pace.
 * También quién va más rápido (`ranking.rules.ts`). Las reglas del avance
 * están en `progress.rules.ts`.
 *
 * El inicio de cada cual es su fecha de entrada al 42cursus (la copia del
 * cursus o, si no, la de quien ha entrado en la web) o, si no se sabe, cuándo
 * se apuntó a su primer proyecto del plan: Libft se empieza el primer día.
 *
 * Mirar a todo el mundo es caro (cientos de miles de proyectos), así que el
 * cálculo se guarda un rato por campus.
 */

import type {
  CoreStatus,
  CoreTrack,
  ProgressGroup,
  ProgressLine,
  ProgressMeasure,
  ProgressPlan,
  ProgressPopulation,
  ProgressScope,
  StatsProgress,
  StatsRanking,
} from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { CHOICES, VERSIONS } from '../replica/index.js'
import { coreStatusOf } from './blackhole.rules.js'
import { COURSE_DAYS } from './pace.rules.js'
import {
  FINISHED_CIRCLE,
  circleMarks,
  curveOf,
  paceLines,
  standingOf,
  totalHours,
  unitsOf,
} from './progress.rules.js'
import type { PlanProject, Unit } from './progress.rules.js'
import { kickoffsOf, rankRunners } from './ranking.rules.js'
import type { RankingFilters, Runner } from './ranking.rules.js'
import type { ProgressRepository } from './stats.repository.js'
import { createTtlCache } from '../../core/ttl-cache.js'

/** Cada cuántos días va un punto de las líneas. */
const STEP_DAYS = 15
const DAYS = Array.from({ length: Math.ceil(COURSE_DAYS / STEP_DAYS) + 1 }, (_, index) =>
  Math.min(COURSE_DAYS, index * STEP_DAYS),
)
const CACHE_MS = 30 * 60_000
/** Con menos gente que esto en un punto, la media no dice nada: no se enseña. */
const MIN_PEOPLE = 10
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
const POPULATIONS: readonly ProgressPopulation[] = ['finished', 'current', 'blackholed']
const SCOPES: readonly ProgressScope[] = ['campus', 'all']
const TRACKS: readonly CoreTrack[] = ['classic', 'next']
const STATUSES: readonly CoreStatus[] = ['finished', 'active', 'blackholed', 'unknown']
const GROUPS: readonly ProgressGroup[] = [
  'campus-all',
  'campus-classic',
  'campus-next',
  'all-all',
  'all-classic',
  'all-next',
]
/** En qué medias entra cada estado. `unknown`, en ninguna. */
const POPULATIONS_OF: Record<CoreStatus, readonly ProgressPopulation[]> = {
  finished: ['finished', 'current'],
  active: ['current'],
  blackholed: ['blackholed'],
  unknown: [],
}

/** Lo que se sabe de cada persona para su avance. */
type Person = {
  login: string
  image: string | null
  track: CoreTrack
  start: number
  done: Map<number, number>
  here: boolean
  status: CoreStatus
  /** Cuándo salió del cursus, si salió. */
  endAt: number | null
}

type Cells = { sum: number; n: number }[]

type Snapshot = {
  units: Record<CoreTrack, Unit[]>
  people: Map<string, Person>
  averages: StatsProgress['averages']
  counts: StatsProgress['people']
  census: StatsProgress['census']
  planHours: Record<CoreTrack, number>
  runners: Runner[]
}

const filled = <K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>

const monthOf = (ms: number): string => new Date(ms).toISOString().slice(0, 7)

export function createProgressService(options: {
  progress: ProgressRepository
  /** El círculo de cada proyecto (por id) de cada plan: lo da el plan de estudios. */
  circles: (track: CoreTrack) => Promise<Map<number, number>>
  now?: () => number
}) {
  const now = options.now ?? Date.now
  // Un agregado por campus que cambia despacio: dos visitas a la vez comparten
  // la misma carga en vez de lanzar dos.
  const snapshots = createTtlCache<Snapshot>({ ttlMs: CACHE_MS, maxEntries: 50, now })
  const snapshot = (campus: number): Promise<Snapshot> =>
    snapshots.get(String(campus), () => build(campus))

  /**
   * Los proyectos de cada plan, con las otras versiones de cada uno (la vieja y
   * la de `42next-`): quien hizo cualquiera tiene el hueco hecho.
   */
  async function plans(): Promise<Record<CoreTrack, PlanProject[]>> {
    const [classic, next] = await Promise.all([options.circles('classic'), options.circles('next')])
    const planIds = [...new Set([...classic.keys(), ...next.keys()])]
    const extra = await options.progress.idsOf(Object.values(VERSIONS).flat())
    const info = await options.progress.projects([...new Set([...planIds, ...extra.values()])])
    const listOf = (circles: Map<number, number>): PlanProject[] =>
      [...circles].flatMap(([id, circle]) => {
        const slug = info.get(id)?.slug ?? ''
        const versions = Object.values(VERSIONS).find((group) => group.includes(slug)) ?? [slug]

        return versions.flatMap((version) => {
          const versionId = version === slug ? id : extra.get(version)

          return versionId === undefined
            ? []
            : [{ id: versionId, circle, slug: version, hours: info.get(versionId)?.hours ?? null }]
        })
      })

    return { classic: listOf(classic), next: listOf(next) }
  }

  /** De quien no se sabe el plan: el nuevo si tiene algo de Python o de `42next`. */
  const nextSlug = (slug: string): boolean =>
    slug.startsWith('python-module') || slug.startsWith('42next-')

  async function build(campus: number): Promise<Snapshot> {
    const t = now()

    const plan = await plans()
    const units = {
      classic: unitsOf(plan.classic, CHOICES, VERSIONS),
      next: unitsOf(plan.next, CHOICES, VERSIONS),
    }
    const slugOf = new Map([...plan.classic, ...plan.next].map((p) => [p.id, p.slug]))
    const [rows, activity] = await Promise.all([
      options.progress.rows(campus, [...slugOf.keys()]),
      options.progress.activity(),
    ])
    const people = new Map<
      string,
      Person & { first: number; begin: number | null; python: boolean; known: boolean }
    >()

    for (const row of rows) {
      let person = people.get(row.login)

      if (person === undefined) {
        const cursus = row.cursus

        person = {
          login: row.login,
          image: row.image,
          track: row.track ?? 'classic',
          known: row.track !== null,
          start: 0,
          first: Infinity,
          begin: cursus?.beginAt ?? row.beginAt,
          done: new Map(),
          here: row.here,
          python: false,
          status: coreStatusOf(
            cursus === null
              ? null
              : {
                  grade: cursus.grade,
                  endAt: cursus.endAt,
                  blackholedAt: cursus.blackholedAt,
                  active: cursus.active,
                  alumni: cursus.alumni,
                  lastActivity: activity.get(row.login) ?? null,
                },
            t,
          ),
          endAt: cursus?.endAt ?? null,
        }
        people.set(row.login, person)
      }
      if (row.createdAt !== null) person.first = Math.min(person.first, row.createdAt)
      if (row.doneAt !== null) person.done.set(row.projectId, row.doneAt)
      if (nextSlug(slugOf.get(row.projectId) ?? '')) person.python = true
    }

    const sums = filled(MEASURES, () =>
      filled(POPULATIONS, () => filled(GROUPS, (): Cells => DAYS.map(() => ({ sum: 0, n: 0 })))),
    )
    const counts = filled(POPULATIONS, () => filled(GROUPS, () => 0))
    const census = filled(SCOPES, () => filled(TRACKS, () => filled(STATUSES, () => 0)))
    const kept = new Map<string, Person>()
    const runners: Runner[] = []

    for (const person of people.values()) {
      if (!person.known) person.track = person.python ? 'next' : 'classic'
      person.start = person.begin ?? person.first
      if (!Number.isFinite(person.start) || person.start > t) continue
      kept.set(person.login, person)

      census.all[person.track][person.status] += 1
      if (person.here) census.campus[person.track][person.status] += 1

      // Quien ya no está, solo hasta el día en que salió: después no avanza.
      const until = person.status === 'blackholed' ? (person.endAt ?? Infinity) : Infinity
      const curve = curveOf(units[person.track], person.done, person.start, DAYS, t, until)
      const groups = GROUPS.filter((group) => {
        const [scope, plan] = group.split('-') as [ProgressScope, ProgressPlan]

        return (scope === 'all' || person.here) && (plan === 'all' || plan === person.track)
      })

      for (const population of POPULATIONS_OF[person.status]) {
        for (const group of groups) {
          counts[population][group] += 1
          for (const measure of MEASURES) {
            curve[measure].forEach((value, index) => {
              const cell = sums[measure][population][group][index]

              if (value !== null && cell !== undefined) {
                cell.sum += value
                cell.n += 1
              }
            })
          }
        }
      }

      // En la clasificación, solo gente del campus que sigue o terminó.
      if (person.here && (person.status === 'active' || person.status === 'finished')) {
        const standing =
          person.status === 'finished'
            ? { circle: FINISHED_CIRCLE, circles: 100, hours: 100 }
            : standingOf(units[person.track], person.done)

        runners.push({
          login: person.login,
          image: person.image,
          track: person.track,
          kickoff: monthOf(person.start),
          ...standing,
        })
      }
    }

    const mean = (cells: Cells): ProgressLine =>
      cells.map((cell) => (cell.n < MIN_PEOPLE ? null : Math.round((cell.sum / cell.n) * 10) / 10))
    const averages = filled(MEASURES, (measure) =>
      filled(POPULATIONS, (population) =>
        filled(GROUPS, (group) => mean(sums[measure][population][group])),
      ),
    )

    return {
      units,
      people: kept,
      averages,
      counts,
      census,
      planHours: filled(TRACKS, (track) => totalHours(units[track])),
      runners,
    }
  }

  return {
    /**
     * El avance de quien mira, con las medias y los paces. Con `other`, además
     * la línea de esa persona, para compararse.
     */
    async progress(actor: Actor, other: string | null): Promise<StatsProgress> {
      const data = await snapshot(actor.campusId)
      const t = now()
      const lineOf = (login: string) => {
        const person = data.people.get(login)

        return person === undefined
          ? null
          : {
              person,
              line: curveOf(data.units[person.track], person.done, person.start, DAYS, t),
            }
      }
      const mine = lineOf(actor.login)
      const theirs = other === null || other === actor.login ? null : lineOf(other)
      const track = mine?.person.track ?? theirs?.person.track ?? null
      const units = data.units[track ?? 'classic']

      return {
        days: DAYS,
        track,
        me: mine?.line ?? null,
        other: theirs === null ? null : { login: theirs.person.login, line: theirs.line },
        averages: data.averages,
        people: data.counts,
        census: data.census,
        axis: {
          circles: circleMarks(units),
          // Las horas del eje son las de quien mira, con su versión de cada proyecto.
          hours: Math.round(totalHours(units, mine?.person.done)),
          planHours: filled(TRACKS, (each) => Math.round(data.planHours[each])),
        },
        paces: paceLines(units),
      }
    },

    /**
     * Quién va más rápido en el campus de quien mira, con esos filtros: la
     * página que empieza en `offset` y, aparte, quien mira. `sees` quita a quien
     * no puede ver (mundos separados, personas ocultas).
     */
    async ranking(
      actor: Actor,
      filters: RankingFilters,
      page: { offset: number; limit: number },
      sees: (login: string) => boolean,
    ): Promise<StatsRanking> {
      const data = await snapshot(actor.campusId)
      const visible = data.runners.filter(
        (runner) => runner.login === actor.login || sees(runner.login),
      )
      const entries = rankRunners(visible, filters)

      return {
        kickoffs: kickoffsOf(
          visible.filter((runner) => filters.plan === 'all' || runner.track === filters.plan),
        ),
        total: entries.length,
        offset: page.offset,
        entries: entries.slice(page.offset, page.offset + page.limit),
        me: entries.find((entry) => entry.login === actor.login) ?? null,
      }
    },
  }
}
