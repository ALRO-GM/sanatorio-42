/**
 * Cómo se lee un recorrido: qué dice de cada sección el ir y venir de la gente.
 *
 * Son las cuentas de siempre de la analítica web, con sus nombres de siempre:
 *
 * - **Visitas**: veces que se ha llegado a la sección, desde otra o al entrar.
 * - **Entradas**: las que fueron lo primero que se abrió.
 * - **Salidas**: las que no continuaron a otra sección: ahí se acabó la visita
 *   a la web. Su parte de las visitas es la tasa de salida.
 * - **Tiempo por visita**: lo que se pasa mirándola cada vez que se llega.
 *
 * Con eso cada sección cae en un papel: de paso (se llega, se está poco y se
 * sigue), final de trayecto (casi siempre es lo último) o de estancia (ahí es
 * donde se pasa el rato).
 */

import type { UsageFlows } from '@sanatorio/contracts'

/** De dónde se viene cuando la sección es lo primero que se abre. */
export const START = 'start'

/** Con menos visitas que estas no se le pone papel a una sección: es ruido. */
const ROLE_MIN_VISITS = 5
/** De paso: menos de estos segundos por visita y saliendo de la web menos que esto. */
const PASS_MAX_SECONDS = 20
const PASS_MAX_EXIT = 0.3
/** Final de trayecto: de aquí se sale de la web al menos esta parte de las veces. */
const END_MIN_EXIT = 0.6
/** De estancia: al menos estos segundos por visita. */
const STAY_MIN_SECONDS = 120

type Section = UsageFlows['sections'][number]

/** El papel de una sección según cómo se pasa por ella. */
function roleOf(section: Pick<Section, 'visits' | 'avgSeen' | 'exitRate'>): Section['role'] {
  if (section.visits < ROLE_MIN_VISITS) return null
  if (section.avgSeen < PASS_MAX_SECONDS && section.exitRate < PASS_MAX_EXIT) return 'pass'
  if (section.exitRate >= END_MIN_EXIT) return 'end'
  if (section.avgSeen >= STAY_MIN_SECONDS) return 'stay'

  return null
}

/**
 * Las cuentas de cada sección a partir de los pasos de una a otra y del tiempo
 * que se ha estado mirando cada una.
 *
 * @param flows Los pasos, ya sumados: de dónde, a dónde y cuántas veces.
 * @param seen Segundos mirando cada sección.
 * @returns Las secciones, la más visitada primero.
 */
export function sectionsOf(
  flows: readonly { from: string; to: string; count: number }[],
  seen: ReadonlyMap<string, number>,
): Section[] {
  const tally = new Map<string, { visits: number; entries: number; onward: number }>()
  const of = (key: string): { visits: number; entries: number; onward: number } => {
    const found = tally.get(key) ?? { visits: 0, entries: 0, onward: 0 }

    tally.set(key, found)

    return found
  }

  for (const { from, to, count } of flows) {
    of(to).visits += count
    if (from === START) of(to).entries += count
    else of(from).onward += count
  }
  // Una sección con tiempo pero sin pasos apuntados (datos de antes) sale igual.
  for (const key of seen.keys()) of(key)

  return [...tally]
    .map(([key, { visits, entries, onward }]): Section => {
      // Lo que llega y no sigue: ahí se acabó. Nunca más de lo que llegó.
      const exits = Math.max(0, visits - onward)
      const seconds = seen.get(key) ?? 0
      const figures = {
        visits,
        avgSeen: visits === 0 ? 0 : Math.round(seconds / visits),
        exitRate: visits === 0 ? 0 : exits / visits,
      }

      return { key, entries, exits, onward, seen: seconds, ...figures, role: roleOf(figures) }
    })
    .sort((a, b) => b.visits - a.visits || b.seen - a.seen)
}
