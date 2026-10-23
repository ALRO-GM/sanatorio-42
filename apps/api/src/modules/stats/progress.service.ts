/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): la línea
 * de quien mira, la media de su campus y la de todos, por plan (C, Python o
 * los dos) y las líneas de cada pace. Las reglas están en `progress.rules.ts`.
 *
 * El inicio de cada cual es su fecha de entrada al cursus (solo se sabe de
 * quien ha entrado en la web) o, si no, cuándo se apuntó a su primer proyecto
 * del plan: Libft se empieza el primer día.
 *
 * Mirar a todo el mundo es caro (cientos de miles de proyectos), así que el
 * cálculo se guarda un rato por campus.
 */

import type {
  ProgressGroup,
  ProgressLine,
  ProgressMeasure,
  ProgressPlan,
  StatsProgress,
} from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { CHOICES } from '../replica/index.js'
import { COURSE_DAYS } from './pace.rules.js'
import { curveOf, paceLines, unitsOf } from './progress.rules.js'
import type { PlanProject, Unit } from './progress.rules.js'
import type { ProgressRepository } from './stats.repository.js'
import { createTtlCache } from '../../core/ttl-cache.js'

type Track = 'classic' | 'next'

/** Cada cuántos días va un punto de las líneas. */
const STEP_DAYS = 15
const DAYS = Array.from({ length: Math.ceil(COURSE_DAYS / STEP_DAYS) + 1 }, (_, index) =>
  Math.min(COURSE_DAYS, index * STEP_DAYS),
)
const CACHE_MS = 30 * 60_000
/** Con menos gente que esto en un punto, la media no dice nada: no se enseña. */
const MIN_PEOPLE = 10
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
const GROUPS: readonly ProgressGroup[] = [
  'campus-all',
  'campus-classic',
  'campus-next',
  'all-all',
  'all-classic',
  'all-next',
]

/** Lo que se sabe de cada persona para su avance. */
type Person = {
  login: string
  track: Track
  start: number
  done: Map<number, number>
  here: boolean
  /** Si se sabe su plan (o se ha deducido de sus proyectos). */
  known: boolean
}

type Snapshot = {
  at: number
  units: Record<Track, Unit[]>
  people: Map<string, Person>
  averages: StatsProgress['averages']
  counts: StatsProgress['people']
}

export function createProgressService(options: {
  progress: ProgressRepository
  /** El círculo de cada proyecto (por id) de cada plan: lo da el plan de estudios. */
  circles: (track: Track) => Promise<Map<number, number>>
  now?: () => number
}) {
  const now = options.now ?? Date.now
  // Un agregado por campus que cambia despacio: dos visitas a la vez comparten
  // la misma carga en vez de lanzar dos.
  const snapshots = createTtlCache<Snapshot>({ ttlMs: CACHE_MS, maxEntries: 50, now })
  const snapshot = (campus: number): Promise<Snapshot> =>
    snapshots.get(String(campus), () => build(campus))

  async function plans(): Promise<Record<Track, PlanProject[]>> {
    const [classic, next] = await Promise.all([options.circles('classic'), options.circles('next')])
    const info = await options.progress.projects([...new Set([...classic.keys(), ...next.keys()])])
    const listOf = (circles: Map<number, number>): PlanProject[] =>
      [...circles].map(([id, circle]) => ({
        id,
        circle,
        slug: info.get(id)?.slug ?? '',
        hours: info.get(id)?.hours ?? null,
      }))

    return { classic: listOf(classic), next: listOf(next) }
  }

  /** De quien no se sabe el plan: el nuevo si tiene algo de Python o de `42next`. */
  const nextSlug = (slug: string): boolean =>
    slug.startsWith('python-module') || slug.startsWith('42next-')

  async function build(campus: number): Promise<Snapshot> {
    const t = now()

    const plan = await plans()
    const units = { classic: unitsOf(plan.classic, CHOICES), next: unitsOf(plan.next, CHOICES) }
    const slugOf = new Map([...plan.classic, ...plan.next].map((p) => [p.id, p.slug]))
    const rows = await options.progress.rows(campus, [...slugOf.keys()])
    const people = new Map<
      string,
      Person & { first: number; begin: number | null; python: boolean }
    >()

    for (const row of rows) {
      let person = people.get(row.login)

      if (person === undefined) {
        person = {
          login: row.login,
          track: row.track ?? 'classic',
          known: row.track !== null,
          start: 0,
          first: Infinity,
          begin: row.beginAt,
          done: new Map(),
          here: row.here,
          python: false,
        }
        people.set(row.login, person)
      }
      if (row.createdAt !== null) person.first = Math.min(person.first, row.createdAt)
      if (row.doneAt !== null) person.done.set(row.projectId, row.doneAt)
      if (nextSlug(slugOf.get(row.projectId) ?? '')) person.python = true
    }

    const sums = Object.fromEntries(
      MEASURES.map((measure) => [
        measure,
        Object.fromEntries(GROUPS.map((group) => [group, DAYS.map(() => ({ sum: 0, n: 0 }))])),
      ]),
    ) as Record<ProgressMeasure, Record<ProgressGroup, { sum: number; n: number }[]>>
    const counts = Object.fromEntries(GROUPS.map((group) => [group, 0])) as Record<
      ProgressGroup,
      number
    >
    const kept = new Map<string, Person>()

    for (const person of people.values()) {
      if (!person.known) {
        person.track = person.python ? 'next' : 'classic'
        person.known = true
      }
      person.start = person.begin ?? person.first
      if (!Number.isFinite(person.start) || person.start > t) continue
      kept.set(person.login, person)

      const curve = curveOf(units[person.track], person.done, person.start, DAYS, t)
      const groups = GROUPS.filter((group) => {
        const [scope, plan] = group.split('-') as ['campus' | 'all', ProgressPlan]

        return (scope === 'all' || person.here) && (plan === 'all' || plan === person.track)
      })

      for (const group of groups) {
        counts[group] += 1
        for (const measure of MEASURES) {
          curve[measure].forEach((value, index) => {
            const cell = sums[measure][group][index]

            if (value !== null && cell !== undefined) {
              cell.sum += value
              cell.n += 1
            }
          })
        }
      }
    }

    const mean = (cells: { sum: number; n: number }[]): ProgressLine =>
      cells.map((cell) => (cell.n < MIN_PEOPLE ? null : Math.round((cell.sum / cell.n) * 10) / 10))
    const averages = Object.fromEntries(
      MEASURES.map((measure) => [
        measure,
        Object.fromEntries(GROUPS.map((group) => [group, mean(sums[measure][group])])),
      ]),
    ) as StatsProgress['averages']
    return { at: t, units, people: kept, averages, counts }
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

      return {
        days: DAYS,
        track,
        me: mine?.line ?? null,
        other: theirs === null ? null : { login: theirs.person.login, line: theirs.line },
        averages: data.averages,
        people: data.counts,
        paces: paceLines(data.units[track ?? 'classic']),
      }
    },
  }
}
