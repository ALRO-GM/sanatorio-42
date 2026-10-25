/**
 * Las líneas de la gráfica del Avance a partir de lo que trae la API y de los
 * botones encendidos: una por cada combinación de plan × población × alcance
 * (o, si esa media tiene muy poca gente, una por persona), más la tuya y la de
 * cada persona con quien te comparas.
 *
 * Cómo se distinguen, sin fiarlo todo al color (`docs/blackhole.md`):
 *
 * - **Color = plan**: C azul, Python violeta (los de siempre).
 * - **Trazo = población**: en curso + terminado, continuo; terminado, a rayas;
 *   black hole, a puntos.
 * - **Grosor = alcance**: tu campus, grueso y opaco; todos los campus, fino y
 *   medio transparente.
 * - Una persona suelta (de una media con poca gente) va con su plan y su trazo,
 *   más fina y con un punto al final. Tú, en el acento; con quien te comparas,
 *   cada cual con su color y su login al final de la línea.
 */

import type {
  CoreTrack,
  ProgressLine,
  ProgressMeasure,
  ProgressPopulation,
  ProgressScope,
  StatsProgress,
} from '@sanatorio/contracts'

export const TRACKS: readonly CoreTrack[] = ['classic', 'next']
export const POPULATIONS: readonly ProgressPopulation[] = ['current', 'finished', 'blackholed']
export const SCOPES: readonly ProgressScope[] = ['campus', 'all']
/** Más líneas de medias a la vez no se leen: se avisa en vez de pintarlas. */
export const MAX_LINES = 10
/** Con cuánta gente te comparas como mucho (lo mismo que acepta la API). */
export const MAX_OTHERS = 5

/** Cómo se pinta una línea: los atributos de SVG de su trazo. */
export type LineStyle = {
  stroke: string
  width: number
  /** `undefined`: continuo. */
  dash: string | undefined
  opacity: number
  /** Un punto al final: una persona, no una media. */
  marker: boolean
}

export type Series = {
  key: string
  label: string
  line: ProgressLine
  /** Las horas de su plan, para pasar el % a horas en la ficha; `null` si no se sabe. */
  hours: number | null
  style: LineStyle
  /** El login que se escribe al final de la línea (con quien te comparas). */
  tag?: string
}

const PLAN_COLOR: Record<CoreTrack, string> = {
  classic: 'var(--plan-c)',
  next: 'var(--plan-python)',
}
const DASH: Record<ProgressPopulation, string | undefined> = {
  current: undefined,
  finished: '7 4',
  blackholed: '1 5',
}
const WEIGHT: Record<ProgressScope, { width: number; opacity: number }> = {
  campus: { width: 2.5, opacity: 1 },
  all: { width: 1.5, opacity: 0.6 },
}
/** El color de cada persona con quien te comparas, por orden de llegada. */
export const PERSON_COLORS: readonly string[] = [
  'var(--gold)',
  'var(--person-2)',
  'var(--person-3)',
  'var(--person-4)',
  'var(--person-5)',
]

export const ME_STYLE: LineStyle = {
  stroke: 'var(--accent)',
  width: 3,
  dash: undefined,
  opacity: 1,
  marker: false,
}

export const personStyle = (index: number): LineStyle => ({
  stroke: PERSON_COLORS[index % PERSON_COLORS.length] ?? 'var(--gold)',
  width: 2.25,
  dash: undefined,
  opacity: 1,
  marker: false,
})

/** El estilo de las medias de ese plan, población y alcance. */
const groupStyle = (
  track: CoreTrack,
  population: ProgressPopulation,
  scope: ProgressScope,
): LineStyle => ({
  stroke: PLAN_COLOR[track],
  dash: DASH[population],
  ...WEIGHT[scope],
  marker: false,
})

/** Lo que dicen los rótulos: cada uno, ya traducido. */
type Labels = {
  plan: (track: CoreTrack) => string
  population: (population: ProgressPopulation) => string
  scope: (scope: ProgressScope) => string
  average: (parts: { plan: string; population: string; scope: string; n: number }) => string
  one: (parts: { plan: string; population: string; login: string }) => string
  anonymous: (parts: { plan: string; population: string; scope: string; n: number }) => string
}

export type Picked = {
  tracks: ReadonlySet<CoreTrack>
  populations: ReadonlySet<ProgressPopulation>
  scopes: ReadonlySet<ProgressScope>
}

/** Una entrada de la leyenda de las medias, aunque no tenga línea (nadie en ella). */
export type GroupKey = { key: string; label: string; style: LineStyle; empty: boolean }

/**
 * Las líneas de las medias encendidas, en orden (plan, población, alcance), y
 * su leyenda. Una media con menos de `minPeople` personas son sus personas, una
 * línea cada una; quien sale en las dos (su campus y todos), una sola vez.
 */
export function groupSeries(
  data: StatsProgress,
  measure: ProgressMeasure,
  picked: Picked,
  labels: Labels,
): { series: Series[]; keys: GroupKey[]; individuals: boolean } {
  const series: Series[] = []
  const keys: GroupKey[] = []
  let individuals = false

  for (const track of TRACKS) {
    if (!picked.tracks.has(track)) continue
    for (const population of POPULATIONS) {
      if (!picked.populations.has(population)) continue
      const drawn = new Set<string>()

      for (const scope of SCOPES) {
        if (!picked.scopes.has(scope)) continue
        const group = `${scope}-${track}` as const
        const n = data.people[population][group]
        const style = groupStyle(track, population, scope)
        const parts = {
          plan: labels.plan(track),
          population: labels.population(population),
          scope: labels.scope(scope),
        }
        const key = `${track}-${population}-${scope}`

        if (n >= data.minPeople) {
          const label = labels.average({ ...parts, n })

          series.push({
            key,
            label,
            line: data.averages[measure][population][group],
            hours: data.axis.planHours[track],
            style,
          })
          keys.push({ key, label, style, empty: false })
          continue
        }

        const people = data.individuals[population][group]

        if (people.length === 0) {
          keys.push({ key, label: labels.average({ ...parts, n }), style, empty: true })
          continue
        }
        individuals = true
        people.forEach((person, index) => {
          if (person.login !== null && drawn.has(person.login)) return
          if (person.login !== null) drawn.add(person.login)

          const label =
            person.login === null
              ? labels.anonymous({ ...parts, n: index + 1 })
              : labels.one({ ...parts, login: person.login })
          const one = { ...style, width: Math.max(1.25, style.width - 0.75), marker: true }
          const each = `${key}-${person.login ?? String(index)}`

          series.push({
            key: each,
            label,
            line: person.line[measure],
            hours: data.axis.planHours[track],
            style: one,
          })
          keys.push({ key: each, label, style: one, empty: false })
        })
      }
    }
  }

  return { series, keys, individuals }
}
