/**
 * El Avance de un piscinero (pedido por Alberto el 2026-10-26,
 * `docs/piscineros.md`): cuántos de los dieciséis proyectos que cuentan
 * (Shell 00 y 01, C 00 a C 13) lleva aprobados cada día desde que empezó la
 * piscina, comparado con la media de **su piscina**: los piscineros en curso
 * de su campus (`pool_members`) que empezaron a menos de una semana de él. Los
 * rushes, BSQ y exámenes no suman. Las reglas, en `piscine.rules.ts`.
 *
 * Nada de otras piscinas (pedido por Alberto el 2026-10-26): quien está en la
 * piscina se compara solo con la suya, no con las de antes. La excepción es la
 * vista sin límites del dueño (2026-11-07): las últimas 10 piscinas del campus,
 * con lo que ha copiado el historial de piscinas, para compararlas (`pools`).
 *
 * Una media con menos de `MIN_PEOPLE` personas no dice nada: en su lugar va la
 * línea de cada cual. Todo es de tu campus: un piscinero solo ve el suyo.
 */

import type { PiscineAverage, PiscineProgress } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { PISCINE_PROGRESS } from '../replica/index.js'
import {
  POOL_AXIS,
  leaderOf,
  meanLine,
  poolAnchorOf,
  poolLinesOf,
  samePool,
  swimOf,
} from './piscine.rules.js'
import type { Swimmer } from './piscine.rules.js'
import type { PiscineRepository } from './stats.repository.js'
import { isoAt } from '../../core/time.js'

/** Con menos gente que esto, una media no dice nada: van las líneas de cada cual. */
const MIN_PEOPLE = 10
/** Con cuánta gente se compara uno como mucho, como en el Avance de los estudiantes. */
const MAX_OTHERS = 5
const CACHE_MS = 10 * 60_000

/** Lo que se sabe de los piscineros en curso de un campus para el avance. */
type Pool = {
  people: Map<string, Swimmer & { image: string | null }>
  /** Los de ahora y los de las piscinas pasadas, para comparar piscinas. */
  everybody: Swimmer[]
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
    const [rows, members, campus, history] = await Promise.all([
      options.piscine.rows(campusId, [...names.keys()]),
      options.piscine.members(campusId),
      options.piscine.campusName(campusId),
      options.piscine.history(campusId, [...names.keys()]),
    ])
    const people = new Map<string, Swimmer & { done: Map<number, number>; image: string | null }>()

    // Quien está en la piscina, aunque aún no tenga ninguna fila: cuenta con 0.
    for (const member of members) {
      const known = people.get(member.login)

      if (known === undefined) {
        people.set(member.login, {
          login: member.login,
          start: member.begin,
          done: new Map(),
          image: member.image,
        })
      } else known.start = Math.min(known.start, member.begin)
    }
    for (const row of rows) {
      if (row.doneAt !== null) people.get(row.login)?.done.set(row.projectId, row.doneAt)
    }

    // Las piscinas pasadas: los de ahora, más quien solo está en el historial.
    // Con sus propias listas de aprobados: lo del historial no toca la línea de nadie de ahora.
    const past = new Map<string, Swimmer & { done: Map<number, number> }>(
      [...people].map(([login, person]) => [
        login,
        { login, start: person.start, done: new Map(person.done) },
      ]),
    )

    for (const member of history.members) {
      if (!past.has(member.login)) {
        past.set(member.login, { login: member.login, start: member.begin, done: new Map() })
      }
    }
    for (const row of history.passed) {
      const done = past.get(row.login)?.done

      if (done !== undefined && row.at < (done.get(row.projectId) ?? Infinity)) {
        done.set(row.projectId, row.at)
      }
    }

    return { people, everybody: [...past.values()], names, campus }
  }

  return {
    /**
     * El avance de la piscina de quien mira, en su campus (`home`), con la
     * media de su piscina y hasta cinco piscineros de su
     * campus con quien compararse (`others`). `sees` quita a quien no se ve
     * (personas ocultas) de las líneas con nombre. `everyone`: la vista sin
     * límites del dueño, que trae además la línea de cada uno de la piscina.
     * `preview`: quien administra viéndolo como piscinero, que no es de la
     * piscina: lo ve como el piscinero que va más avanzado (`standIn`).
     */
    async progress(
      actor: Actor,
      home: number,
      others: readonly string[],
      sees: (login: string) => boolean,
      view: { everyone?: boolean; preview?: boolean } = {},
    ): Promise<PiscineProgress> {
      const pool = await pools.get(String(home), () => load(home))
      const t = now()
      const people = [...pool.people.values()]
      const own = pool.people.get(actor.login.toLowerCase())
      // Tu piscina empezó cuando tú; sin saberlo (quien administra viéndola),
      // el día en que empezó más gente, para coger la piscina entera.
      const anchor =
        own?.start ??
        poolAnchorOf(
          people.map((person) => person.start),
          t,
        )
      const inPool =
        anchor === null ? [] : people.filter((person) => samePool(person.start, anchor))
      // En la vista de piscinero de quien administra (pedido por Alberto el
      // 2026-11-06): no cuenta su perfil, sino el del piscinero más avanzado
      // de entre los que ve. Un piscinero de verdad que aún no se ha copiado
      // no tiene `preview`: no se le enseña nunca la línea de otro.
      const standIn =
        own === undefined && view.preview === true
          ? leaderOf(
              inPool.filter((person) => sees(person.login)),
              t,
            )
          : null
      const mine = own ?? standIn ?? undefined
      const cohort = inPool.filter(
        (person) => person.login !== actor.login.toLowerCase() && person !== mine,
      )

      const trace = (person: Swimmer) => swimOf(person, t, pool.names)
      const averageOf = (list: readonly Swimmer[]): PiscineAverage => {
        const traces = list.map((person) => ({ login: person.login, ...trace(person) }))
        const first = Math.min(...list.map((person) => person.start))

        return {
          line: meanLine(
            traces.map((each) => each.line),
            POOL_AXIS.length,
            MIN_PEOPLE,
          ),
          people: list.length,
          // Con poca gente, la línea de cada cual.
          individuals:
            list.length >= MIN_PEOPLE
              ? []
              : traces.filter((each) => each.login === actor.login || sees(each.login)),
          since: Number.isFinite(first) ? isoAt(first) : null,
        }
      }
      return {
        days: [...POOL_AXIS],
        steps: PISCINE_PROGRESS.map((project) => ({ short: project.short, group: project.group })),
        startedAt: mine === undefined ? null : isoAt(mine.start),
        me: mine === undefined ? null : trace(mine),
        cohort: averageOf(cohort),
        // Solo piscineros de tu piscina.
        others: [...new Set(others.map((login) => login.toLowerCase()))]
          .filter(
            (login) => login !== actor.login.toLowerCase() && login !== mine?.login && sees(login),
          )
          .flatMap((login) => {
            const person = pool.people.get(login)

            return person !== undefined && anchor !== null && samePool(person.start, anchor)
              ? [{ login, ...trace(person) }]
              : []
          })
          .slice(0, MAX_OTHERS),
        minPeople: MIN_PEOPLE,
        campus: pool.campus,
        ...(standIn === null ? {} : { standIn: { login: standIn.login, image: standIn.image } }),
        ...(view.everyone === true
          ? {
              // La piscina entera: también quien hace de ti en la vista previa.
              everyone: (standIn === null ? cohort : [standIn, ...cohort])
                .filter((person) => sees(person.login))
                .map((person) => ({ login: person.login, image: person.image, ...trace(person) })),
              // Medias de cada piscina: sin nombres, así que entra todo el mundo.
              pools: poolLinesOf(pool.everybody, t, pool.names, MIN_PEOPLE),
            }
          : {}),
      }
    },
  }
}
