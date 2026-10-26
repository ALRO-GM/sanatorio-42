/**
 * Las líneas de la gráfica del Avance a partir de lo que trae la API y de los
 * botones encendidos: una por cada combinación de plan × población × campus
 * (cada campus elegido en su línea, y todos juntos en otra) o, si esa media
 * tiene muy poca gente, una por persona; más la tuya y la de cada persona con
 * quien te comparas.
 *
 * Cómo se distinguen, sin fiarlo todo al color (`docs/blackhole.md`):
 *
 * - Con un solo campus:
 *   - **Color = plan**: C azul, Python violeta (los de siempre).
 *   - **Grosor = alcance**: el campus, grueso y opaco; todos los campus, fino y
 *     medio transparente.
 * - Con varios campus, para compararlos:
 *   - **Color = campus**: cada uno el suyo, siempre el mismo (por su sitio en
 *     la lista de los que se pueden pedir); todos juntos, en gris.
 *   - **Grosor = plan** (si van los dos): C grueso, Python fino.
 * - **Trazo = población**: en curso + terminado, continuo; terminado, a rayas;
 *   black hole, a puntos.
 * - El nombre del campus va siempre en el rótulo, en la leyenda y en la ficha.
 * - Una persona suelta (de una media con poca gente) va con su plan y su trazo,
 *   más fina y con un punto al final. Tú, en el acento; con quien te comparas,
 *   cada cual con su color y su login al final de la línea.
 * - Una persona (no una media) lleva sus hitos (`trace`): un punto por cada día
 *   en que aprobó algo y, si terminó, el tramo del 100 % resaltado y un trofeo.
 */

import type {
  CoreTrack,
  ProgressLine,
  ProgressMeasure,
  ProgressArea,
  ProgressPopulation,
  ProgressScope,
  ProgressTrace,
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
  /** Lo de una persona: sus hitos y si terminó. Las medias no lo llevan. */
  trace?: ProgressTrace
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
/**
 * El color de cada campus cuando se comparan varios, por su sitio en la lista
 * de los que se pueden pedir: los mismos tonos de la gráfica (con su versión
 * para daltonismo, `comfort.css`). Todos juntos, en gris.
 */
const CAMPUS_COLORS: readonly string[] = [
  'var(--plan-c)',
  'var(--person-2)',
  'var(--person-3)',
  'var(--plan-python)',
  'var(--person-4)',
  'var(--person-5)',
]
const TOGETHER_COLOR = 'var(--text-3)'
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

/** Cómo se pintan las medias encendidas: con un campus o comparando varios. */
type Encoding = { campuses: boolean; tracks: number }

/**
 * El estilo de las medias de ese plan, población y sitio (`color`: el sitio del
 * campus en la lista; `null`, todos juntos).
 */
const groupStyle = (
  track: CoreTrack,
  population: ProgressPopulation,
  color: number | null,
  encoding: Encoding,
): LineStyle => {
  if (!encoding.campuses) {
    return {
      stroke: PLAN_COLOR[track],
      dash: DASH[population],
      ...WEIGHT[color === null ? 'all' : 'campus'],
      marker: false,
    }
  }

  return {
    stroke:
      color === null
        ? TOGETHER_COLOR
        : (CAMPUS_COLORS[color % CAMPUS_COLORS.length] ?? TOGETHER_COLOR),
    dash: DASH[population],
    width: encoding.tracks > 1 && track === 'next' ? 1.5 : 2.5,
    opacity: color === null ? 0.8 : 1,
    marker: false,
  }
}

/** Lo que dicen los rótulos: cada uno, ya traducido. */
type Labels = {
  plan: (track: CoreTrack) => string
  population: (population: ProgressPopulation) => string
  /** El nombre de un sitio: su campus, o todos juntos. */
  scope: (area: ProgressArea) => string
  average: (parts: { plan: string; population: string; scope: string; n: number }) => string
  one: (parts: { plan: string; population: string; login: string }) => string
  anonymous: (parts: { plan: string; population: string; scope: string; n: number }) => string
}

export type Picked = {
  tracks: ReadonlySet<CoreTrack>
  populations: ReadonlySet<ProgressPopulation>
  /** Los campus elegidos, cada uno en su línea. */
  campuses: readonly number[]
  /** Si va la media de todos los campus juntos. */
  together: boolean
}

/** Los sitios que se pintan: los campus elegidos que trae la API y, si se pide, todos juntos. */
export function areasOf(data: StatsProgress, picked: Picked): ProgressArea[] {
  return [
    ...data.campuses.filter((area) => area.id !== null && picked.campuses.includes(area.id)),
    ...(picked.together ? [data.all] : []),
  ]
}

/** Una entrada de la leyenda de las medias, aunque no tenga línea (nadie en ella). */
export type GroupKey = { key: string; label: string; style: LineStyle; empty: boolean }

/**
 * Las líneas de las medias encendidas, en orden (plan, población, sitio), y su
 * leyenda. Una media con menos de `minPeople` personas son sus personas, una
 * línea cada una; quien sale en varias (su campus y todos), una sola vez.
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
  const areas = areasOf(data, picked)
  const encoding: Encoding = {
    campuses: areas.filter((area) => area.id !== null).length > 1,
    tracks: TRACKS.filter((track) => picked.tracks.has(track)).length,
  }

  for (const track of TRACKS) {
    if (!picked.tracks.has(track)) continue
    for (const population of POPULATIONS) {
      if (!picked.populations.has(population)) continue
      const drawn = new Set<string>()

      for (const area of areas) {
        const n = area.people[population][track]
        const color =
          area.id === null ? null : data.available.findIndex((campus) => campus.id === area.id)
        const style = groupStyle(track, population, color, encoding)
        const parts = {
          plan: labels.plan(track),
          population: labels.population(population),
          scope: labels.scope(area),
        }
        const key = `${track}-${population}-${area.id === null ? 'all' : String(area.id)}`

        if (n >= data.minPeople) {
          const label = labels.average({ ...parts, n })

          series.push({
            key,
            label,
            line: area.averages[measure][population][track],
            hours: data.axis.planHours[track],
            style,
          })
          keys.push({ key, label, style, empty: false })
          continue
        }

        const people = area.individuals[population][track]

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
            hours: person.hours,
            style: one,
            trace: person,
          })
          keys.push({ key: each, label, style: one, empty: false })
        })
      }
    }
  }

  return { series, keys, individuals }
}
