/**
 * Las cuentas del álbum de correcciones (`docs/correcciones-coleccion.md`), sin
 * base de datos: qué cuenta como «cromo» de cada cual, la completitud, los
 * puestos y la rareza de cada proyecto. Se prueban solas.
 */

import type { CollectionEntry, CollectionRarity } from '@sanatorio/contracts'

/** Lo que se sabe de alguien para su álbum. */
export type Collector = {
  login: string
  image: string | null
  /** Mes en que entró (`AAAA-MM`), o `null` si no se sabe. */
  kickoff: string | null
  /** Proyectos del álbum que aprobó: los que puede corregir. */
  finished: ReadonlySet<number>
  /** Proyectos que ha corregido al menos una vez. */
  corrected: ReadonlySet<number>
}

/** Una persona ya con sus cuentas, antes de ponerle puesto. */
export type Tally = Omit<CollectionEntry, 'rank' | 'share'> & { ratio: number }

/**
 * Los exámenes (`exam-rank-02`, `42next-exam-rank-03`, `c-piscine-exam-00`…)
 * no se corrigen entre peers: no son cromos, o nadie podría completar el álbum.
 */
export const isExamSlug = (slug: string | null): boolean =>
  slug !== null && /(^|-)exam(-|$)/.test(slug)

/** Una fracción con tres decimales, como la dan los contratos. */
const round3 = (value: number): number => Math.round(value * 1000) / 1000

/**
 * Las cuentas de una persona: de lo que aprobó, lo que sigue vivo en el campus
 * (`alive`: corregido por alguien en el último año) o lo que ya corrigió (un
 * cromo conseguido no se pierde porque el proyecto se retire). Sin nada
 * copiado (`alive` vacío o `null`), nada se da por retirado. `null` si no tiene
 * nada que corregir: no entra en ninguna clasificación.
 */
export function tallyOf(person: Collector, alive: ReadonlySet<number> | null): Tally | null {
  const known = alive !== null && alive.size > 0
  let eligible = 0
  let collected = 0

  for (const projectId of person.finished) {
    const has = person.corrected.has(projectId)

    if (known && !alive.has(projectId) && !has) continue

    eligible += 1
    if (has) collected += 1
  }

  if (eligible === 0) return null

  return {
    login: person.login,
    image: person.image,
    collected,
    eligible,
    ratio: collected / eligible,
  }
}

/**
 * Los puestos: más completitud primero; a igual porcentaje, quien más cromos
 * tiene (le ha costado más), y luego por login para que el orden no baile.
 * Mismas cifras, mismo puesto; el siguiente salta los empatados (1, 1, 3).
 */
export function rankTallies(tallies: readonly Tally[]): CollectionEntry[] {
  const sorted = [...tallies].sort(
    (a, b) => b.ratio - a.ratio || b.collected - a.collected || a.login.localeCompare(b.login),
  )
  const entries: CollectionEntry[] = []

  sorted.forEach((tally, index) => {
    const previous = sorted[index - 1]
    const tie = previous?.ratio === tally.ratio && previous.collected === tally.collected

    entries.push({
      rank: tie ? (entries[index - 1]?.rank ?? index + 1) : index + 1,
      login: tally.login,
      image: tally.image,
      collected: tally.collected,
      eligible: tally.eligible,
      share: round3(tally.ratio),
    })
  })

  return entries
}

/**
 * La rareza de cada proyecto del álbum: de quienes lo aprobaron (lo pueden
 * corregir), qué parte lo ha corregido al menos una vez. Aquí no se mira si
 * está retirado: lo raro es lo raro, siga vivo o no.
 */
export function rarityOf(
  people: readonly Collector[],
  projectIds: Iterable<number>,
): CollectionRarity[] {
  const counts = new Map<number, { eligible: number; holders: number }>()

  for (const projectId of projectIds) counts.set(projectId, { eligible: 0, holders: 0 })

  for (const person of people) {
    for (const projectId of person.finished) {
      const count = counts.get(projectId)

      if (count === undefined) continue

      count.eligible += 1
      if (person.corrected.has(projectId)) count.holders += 1
    }
  }

  return [...counts]
    .map(([projectId, { eligible, holders }]) => ({
      projectId,
      eligible,
      holders,
      share: eligible === 0 ? 0 : round3(holders / eligible),
    }))
    .sort((a, b) => a.projectId - b.projectId)
}

/**
 * Las amistades más cercanas: las primeras `limit` personas de `partners` (ya
 * ordenadas por correcciones entre las dos, en los dos sentidos) que se pueden
 * ver y tienen álbum. Quien pregunta no cuenta entre ellas.
 */
export function closestOf(
  partners: readonly string[],
  self: string,
  keep: (login: string) => boolean,
  limit: number,
): string[] {
  const chosen: string[] = []

  for (const login of partners) {
    if (chosen.length >= limit) break
    if (login === self || chosen.includes(login) || !keep(login)) continue
    chosen.push(login)
  }

  return chosen
}
