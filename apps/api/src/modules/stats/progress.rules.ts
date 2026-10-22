/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): cuánto
 * llevaba cada cual a los N días de empezar, para comparar con la media y con
 * lo que pide cada pace. No se mide por experiencia, sino por proyectos, de
 * dos maneras:
 *
 * - **Círculos** (`circles`): de cada círculo, la parte de sus proyectos que
 *   está aprobada; todos los círculos pesan lo mismo. Completar los círculos
 *   0, 1 y 2 y la mitad del 3 es (3 + 0,5) / 7 = 50 %.
 * - **Horas** (`hours`): las horas estimadas por 42 de los proyectos aprobados,
 *   frente a las de todo el plan.
 *
 * Un proyecto entre los que se elige uno (`CHOICES`: so_long, FdF o fract-ol)
 * es una sola casilla: con aprobar cualquiera, está hecha.
 */

import type { ProgressMeasure } from '@sanatorio/contracts'

import { DAYS, PACES } from './pace.rules.js'

/** Un proyecto del plan, con su círculo y sus horas (si 42 las da). */
export type PlanProject = { id: number; slug: string; circle: number; hours: number | null }

/** Una casilla del plan: un proyecto, o un grupo entre los que se elige uno. */
export type Unit = { circle: number; hours: number | null; ids: readonly number[] }

const DAY_MS = 86_400_000

/** Las casillas del plan: cada proyecto, salvo los de un mismo grupo de `choices`, que van juntos. */
export function unitsOf(
  projects: readonly PlanProject[],
  choices: Readonly<Record<string, readonly string[]>>,
): Unit[] {
  const groupOf = new Map<string, string>()

  for (const [group, slugs] of Object.entries(choices)) {
    for (const slug of slugs) groupOf.set(slug, group)
  }

  const units = new Map<string, { circle: number; hours: number | null; ids: number[] }>()

  for (const project of projects) {
    const key = groupOf.get(project.slug) ?? `#${String(project.id)}`
    const unit = units.get(key)

    if (unit === undefined) {
      units.set(key, { circle: project.circle, hours: project.hours, ids: [project.id] })
      continue
    }

    // Del grupo se hace uno: cuenta el círculo más bajo y las horas del más corto.
    unit.circle = Math.min(unit.circle, project.circle)
    unit.hours =
      unit.hours === null || project.hours === null
        ? (unit.hours ?? project.hours)
        : Math.min(unit.hours, project.hours)
    unit.ids.push(project.id)
  }

  return [...units.values()]
}

/**
 * Cuándo hizo cada casilla quien aprobó esos proyectos en esas fechas
 * (`done`: proyecto → ms). `Infinity` si no la ha hecho.
 */
function finishedAt(units: readonly Unit[], done: ReadonlyMap<number, number>): number[] {
  return units.map((unit) => Math.min(...unit.ids.map((id) => done.get(id) ?? Infinity), Infinity))
}

/**
 * Lo que mide cada casilla en cada manera de medir, en tanto por uno del total:
 * en círculos, 1 / (casillas de su círculo) / (círculos con casillas); en horas,
 * sus horas entre las de todo el plan.
 */
function weightsOf(units: readonly Unit[]): Record<ProgressMeasure, number[]> {
  const perCircle = new Map<number, number>()

  for (const unit of units) perCircle.set(unit.circle, (perCircle.get(unit.circle) ?? 0) + 1)

  const hours = units.reduce((sum, unit) => sum + (unit.hours ?? 0), 0)

  return {
    circles: units.map((unit) => 1 / (perCircle.get(unit.circle) ?? 1) / perCircle.size),
    hours: units.map((unit) => (hours === 0 ? 0 : (unit.hours ?? 0) / hours)),
  }
}

/**
 * El avance de una persona (en %) en cada uno de `days` (días desde `start`),
 * para las dos maneras de medir. Lo que cae después de `now` es `null`.
 */
export function curveOf(
  units: readonly Unit[],
  done: ReadonlyMap<number, number>,
  start: number,
  days: readonly number[],
  now: number,
): Record<ProgressMeasure, (number | null)[]> {
  const weights = weightsOf(units)
  const order = finishedAt(units, done)
    .map((at, index) => ({ at, index }))
    .filter((each) => each.at !== Infinity)
    .sort((a, b) => a.at - b.at)
  const sums = { circles: 0, hours: 0 }
  const curve: Record<ProgressMeasure, (number | null)[]> = { circles: [], hours: [] }
  let next = 0

  for (const day of days) {
    const at = start + day * DAY_MS

    if (at > now) {
      curve.circles.push(null)
      curve.hours.push(null)
      continue
    }

    for (; next < order.length && (order[next]?.at ?? Infinity) <= at; next++) {
      const index = order[next]?.index ?? 0

      sums.circles += weights.circles[index] ?? 0
      sums.hours += weights.hours[index] ?? 0
    }
    curve.circles.push(Math.round(sums.circles * 1000) / 10)
    curve.hours.push(Math.round(sums.hours * 1000) / 10)
  }

  return curve
}

/**
 * Lo que pide cada pace: a los días de su plazo para cada círculo, el avance
 * de tener ese círculo y los anteriores completos. Empieza en (0, 0).
 */
export function paceLines(
  units: readonly Unit[],
): Record<ProgressMeasure, { pace: number; points: [number, number][] }[]> {
  const weights = weightsOf(units)
  const upTo = (measure: ProgressMeasure, circle: number): number =>
    Math.round(
      units.reduce(
        (sum, unit, index) => sum + (unit.circle <= circle ? (weights[measure][index] ?? 0) : 0),
        0,
      ) * 1000,
    ) / 10
  const line = (measure: ProgressMeasure) =>
    PACES.map((pace) => ({
      pace,
      points: [
        [0, 0] as [number, number],
        ...DAYS[pace].map((day, circle): [number, number] => [day, upTo(measure, circle)]),
      ],
    }))

  return { circles: line('circles'), hours: line('hours') }
}
