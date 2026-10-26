/**
 * El Avance de un piscinero (pedido por Alberto el 2026-10-26,
 * `docs/piscineros.md`): cuántos de los dieciséis proyectos que cuentan
 * (Shell 00 y 01, C 00 a C 13) lleva aprobados cada día desde que empezó la
 * piscina, comparado con la media de su piscina y la de las anteriores de su
 * campus. Los rushes, BSQ y exámenes no suman. Las reglas, en `piscine.rules.ts`.
 *
 * - **Tu piscina**: los piscineros en curso de tu campus (`pool_members`) que
 *   empezaron a menos de una semana de ti. Es con quien te cruzas en el clúster.
 * - **Piscinas anteriores**: quien hizo la piscina en tu campus antes que tú,
 *   en los tres últimos años, sacado de las filas de la réplica
 *   (`project_users` de la copia del campus): hoy son estudiantes o ya no
 *   están, así que su línea nunca lleva nombre. Su inicio es el de su
 *   `pool_members` si aún sale ahí y, si no, el día en que se apuntó a su
 *   primer proyecto de la piscina (Shell 00 se abre el primer día).
 *
 * Una media con menos de `MIN_PEOPLE` personas no dice nada: en su lugar va la
 * línea de cada cual. Todo es de tu campus: un piscinero solo ve el suyo.
 */

import type { PiscineAverage, PiscineProgress } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { PISCINE_PROGRESS } from '../replica/index.js'
import { POOL_AXIS, meanLine, poolOf, swimOf } from './piscine.rules.js'
import type { Swimmer } from './piscine.rules.js'
import type { PiscineRepository } from './stats.repository.js'

const DAY_MS = 86_400_000
/** Hasta dónde se mira atrás: las piscinas de hace más cambiaban de proyectos. */
const PAST_MS = 3 * 365 * DAY_MS
/** Con menos gente que esto, una media no dice nada: van las líneas de cada cual. */
const MIN_PEOPLE = 10
/** Con cuánta gente se compara uno como mucho, como en el Avance de los estudiantes. */
const MAX_OTHERS = 5
const CACHE_MS = 10 * 60_000

/** Lo que se sabe de la gente de un campus para el avance de la piscina. */
type Pool = {
  people: Map<string, Swimmer & { member: boolean }>
  names: Map<number, string>
  campus: string | null
}

export function createPiscineProgressService(options: {
  piscine: PiscineRepository
  now?: () => number
}) {
  const now = options.now ?? Date.now
  // Un campus cambia despacio: varias visitas seguidas comparten la misma carga.
  const pools = createTtlCache<Pool>({ ttlMs: CACHE_MS, maxEntries: 20, now })

  async function load(campusId: number): Promise<Pool> {
    const ids = await options.piscine.idsOf(PISCINE_PROGRESS.map((project) => project.slug))
    const names = new Map(
      PISCINE_PROGRESS.flatMap((project) => {
        const id = ids.get(project.slug)

        return id === undefined ? [] : [[id, project.short] as const]
      }),
    )
    const since = new Date(now() - PAST_MS).toISOString()
    const [rows, members, campus] = await Promise.all([
      options.piscine.rows(campusId, [...names.keys()], since),
      options.piscine.members(campusId),
      options.piscine.campusName(campusId),
    ])
    const people = new Map<
      string,
      Swimmer & { done: Map<number, number>; member: boolean; first: number }
    >()
    const personOf = (login: string) => {
      const known = people.get(login)

      if (known !== undefined) return known
      const fresh = {
        login,
        start: Infinity,
        first: Infinity,
        done: new Map<number, number>(),
        member: false,
      }

      people.set(login, fresh)
      return fresh
    }

    // Quien está en la piscina en curso, aunque aún no tenga ninguna fila: cuenta con 0.
    for (const member of members) {
      const person = personOf(member.login)

      person.member = true
      person.start = Math.min(person.start, member.begin)
    }
    for (const row of rows) {
      const person = personOf(row.login)

      if (row.createdAt !== null) person.first = Math.min(person.first, row.createdAt)
      if (row.doneAt !== null) person.done.set(row.projectId, row.doneAt)
    }
    for (const person of people.values()) {
      if (!person.member) person.start = person.first
    }

    return {
      people: new Map([...people].filter(([, person]) => Number.isFinite(person.start))),
      names,
      campus,
    }
  }

  return {
    /**
     * El avance de la piscina de quien mira, en su campus (`home`), con la
     * media de su piscina y de las anteriores y hasta cinco piscineros de su
     * campus con quien compararse (`others`). `sees` quita a quien no se ve
     * (personas ocultas) de las líneas con nombre.
     */
    async progress(
      actor: Actor,
      home: number,
      others: readonly string[],
      sees: (login: string) => boolean,
    ): Promise<PiscineProgress> {
      const pool = await pools.get(String(home), () => load(home))
      const t = now()
      const mine = pool.people.get(actor.login.toLowerCase())
      // Tu piscina empezó cuando tú; sin saberlo (quien administra viéndola),
      // la última que ha empezado en el campus.
      const anchor =
        mine?.member === true
          ? mine.start
          : Math.max(
              -Infinity,
              ...[...pool.people.values()]
                .filter((person) => person.member && person.start <= t)
                .map((person) => person.start),
            )
      const cohortStart = Number.isFinite(anchor) ? anchor : null
      const groups = { cohort: [] as Swimmer[], past: [] as Swimmer[] }

      for (const person of pool.people.values()) {
        const group = poolOf(person.start, cohortStart, t - PAST_MS)

        if (group === 'cohort' && !person.member) continue
        if (group !== null) groups[group].push(person)
      }

      const trace = (person: Swimmer) => swimOf(person, t, pool.names)
      const averageOf = (list: readonly Swimmer[], named: boolean): PiscineAverage => {
        const traces = list.map((person) => ({ login: person.login, ...trace(person) }))
        const first = Math.min(...list.map((person) => person.start))

        return {
          line: meanLine(
            traces.map((each) => each.line),
            POOL_AXIS.length,
            MIN_PEOPLE,
          ),
          people: list.length,
          // Con poca gente, la línea de cada cual: con nombre solo en tu piscina.
          individuals:
            list.length >= MIN_PEOPLE
              ? []
              : traces
                  .filter((each) => !named || each.login === actor.login || sees(each.login))
                  .map((each) => ({ ...each, login: named ? each.login : null })),
          since: Number.isFinite(first) ? new Date(first).toISOString() : null,
        }
      }
      const cohort = groups.cohort.filter((person) => person.login !== actor.login.toLowerCase())

      return {
        days: [...POOL_AXIS],
        steps: PISCINE_PROGRESS.map((project) => ({ short: project.short, group: project.group })),
        startedAt: mine?.member === true ? new Date(mine.start).toISOString() : null,
        me: mine === undefined ? null : trace(mine),
        cohort: averageOf(cohort, true),
        past: averageOf(groups.past, false),
        // Solo piscineros en curso de tu campus: las piscinas anteriores no son de tu mundo.
        others: [...new Set(others.map((login) => login.toLowerCase()))]
          .filter((login) => login !== actor.login.toLowerCase() && sees(login))
          .flatMap((login) => {
            const person = pool.people.get(login)

            return person?.member === true ? [{ login, ...trace(person) }] : []
          })
          .slice(0, MAX_OTHERS),
        minPeople: MIN_PEOPLE,
        campus: pool.campus,
      }
    },
  }
}
