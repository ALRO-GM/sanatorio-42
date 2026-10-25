/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): cuánto
 * llevaba cada cual a los N días de empezar, para comparar con la media y con
 * lo que pide cada pace. No se mide por experiencia, sino por proyectos, de
 * dos maneras:
 *
 * - **Círculos** (`circles`): de cada círculo, la parte de sus proyectos que
 *   está aprobada; todos los círculos pesan lo mismo. Completar los círculos
 *   0, 1 y 2 y la mitad del 3 es (3 + 0,5) / 7 = 50 %. Terminar el círculo `n`
 *   es, por tanto, (n + 1) / 7: así se marcan los círculos en el eje.
 * - **Horas** (`hours`): las horas estimadas por 42 de los proyectos aprobados,
 *   frente a las de todo el plan **de esa persona**: de cada hueco cuentan las
 *   horas de la versión que hizo (la vieja o la de `42next-`, o el proyecto que
 *   eligió del grupo); de lo que no ha hecho, las del más corto.
 *
 * Un proyecto entre los que se elige uno (`CHOICES`: so_long, FdF o fract-ol) o
 * con dos versiones (`VERSIONS`) es una sola casilla: con aprobar cualquiera,
 * está hecha.
 */

import type { ProgressMeasure } from '@sanatorio/contracts'

import { DAYS, PACES } from './pace.rules.js'

/** Un proyecto del plan, con su círculo y sus horas (si 42 las da). */
export type PlanProject = { id: number; slug: string; circle: number; hours: number | null }

/**
 * Una casilla del plan: un proyecto, o un grupo entre los que vale uno. `hours`
 * son las del más corto; `hoursById`, las de cada uno.
 */
export type Unit = {
  circle: number
  hours: number | null
  ids: readonly number[]
  hoursById: ReadonlyMap<number, number | null>
}

/** Cuándo aprobó cada proyecto (id → ms) una persona. */
type Done = ReadonlyMap<number, number>

/** Dónde está alguien ahora: el círculo en el que está (7: terminado) y el % de cada manera. */
type Standing = { circle: number; circles: number; hours: number }

const DAY_MS = 86_400_000
/** El círculo de quien completó todos: uno más que el último (el 6). */
export const FINISHED_CIRCLE = 7

const shorter = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? (a ?? b) : Math.min(a, b)

/** Las casillas del plan: cada proyecto, salvo los de un mismo grupo, que van juntos. */
export function unitsOf(
  projects: readonly PlanProject[],
  ...groups: readonly Readonly<Record<string, readonly string[]>>[]
): Unit[] {
  const groupOf = new Map<string, string>()

  for (const choices of groups) {
    for (const [group, slugs] of Object.entries(choices)) {
      for (const slug of slugs) groupOf.set(slug, group)
    }
  }

  const units = new Map<
    string,
    { circle: number; hours: number | null; ids: number[]; hoursById: Map<number, number | null> }
  >()

  for (const project of projects) {
    const key = groupOf.get(project.slug) ?? `#${String(project.id)}`
    const unit = units.get(key)

    if (unit === undefined) {
      units.set(key, {
        circle: project.circle,
        hours: project.hours,
        ids: [project.id],
        hoursById: new Map([[project.id, project.hours]]),
      })
      continue
    }
    if (unit.hoursById.has(project.id)) continue

    // Del grupo se hace uno: cuenta el círculo más bajo y, sin saber cuál, las horas del más corto.
    unit.circle = Math.min(unit.circle, project.circle)
    unit.hours = shorter(unit.hours, project.hours)
    unit.ids.push(project.id)
    unit.hoursById.set(project.id, project.hours)
  }

  return [...units.values()]
}

/** Cuándo hizo cada casilla y con qué proyecto. `at: Infinity` si no la ha hecho. */
function finishedAt(units: readonly Unit[], done: Done): { at: number; id: number | null }[] {
  return units.map((unit) => {
    let best: { at: number; id: number | null } = { at: Infinity, id: null }

    for (const id of unit.ids) {
      const at = done.get(id)

      if (at !== undefined && at < best.at) best = { at, id }
    }

    return best
  })
}

/** Las horas de cada casilla para alguien: las de lo que hizo o, si no, las del más corto. */
function ownHours(units: readonly Unit[], done: Done): number[] {
  return finishedAt(units, done).map(({ id }, index) => {
    const unit = units[index]
    const mine = id === null ? null : (unit?.hoursById.get(id) ?? null)

    return mine ?? unit?.hours ?? 0
  })
}

/** Las horas de todo el common core de alguien (sin `done`, las del plan, con lo más corto). */
export function totalHours(units: readonly Unit[], done: Done = new Map()): number {
  return ownHours(units, done).reduce((sum, hours) => sum + hours, 0)
}

/**
 * Lo que mide cada casilla en cada manera de medir, en tanto por uno del total:
 * en círculos, 1 / (casillas de su círculo) / (círculos con casillas); en horas,
 * sus horas entre las de todo el plan de esa persona.
 */
function weightsOf(units: readonly Unit[], done: Done): Record<ProgressMeasure, number[]> {
  const perCircle = new Map<number, number>()

  for (const unit of units) perCircle.set(unit.circle, (perCircle.get(unit.circle) ?? 0) + 1)

  const hours = ownHours(units, done)
  const total = hours.reduce((sum, each) => sum + each, 0)

  return {
    circles: units.map((unit) => 1 / (perCircle.get(unit.circle) ?? 1) / perCircle.size),
    hours: hours.map((each) => (total === 0 ? 0 : each / total)),
  }
}

const percent = (share: number): number => Math.round(share * 1000) / 10

/**
 * El avance de una persona (en %) en cada uno de `days` (días desde `start`),
 * para las dos maneras de medir. Lo que cae después de `now` (o de `until`, el
 * día que salió quien ya no está) es `null`.
 */
export function curveOf(
  units: readonly Unit[],
  done: Done,
  start: number,
  days: readonly number[],
  now: number,
  until = Infinity,
): Record<ProgressMeasure, (number | null)[]> {
  const weights = weightsOf(units, done)
  const order = finishedAt(units, done)
    .map(({ at }, index) => ({ at, index }))
    .filter((each) => each.at !== Infinity)
    .sort((a, b) => a.at - b.at)
  const sums = { circles: 0, hours: 0 }
  const curve: Record<ProgressMeasure, (number | null)[]> = { circles: [], hours: [] }
  const last = Math.min(now, until)
  let next = 0

  for (const day of days) {
    const at = start + day * DAY_MS

    if (at > last) {
      curve.circles.push(null)
      curve.hours.push(null)
      continue
    }

    for (; next < order.length && (order[next]?.at ?? Infinity) <= at; next++) {
      const index = order[next]?.index ?? 0

      sums.circles += weights.circles[index] ?? 0
      sums.hours += weights.hours[index] ?? 0
    }
    curve.circles.push(percent(sums.circles))
    curve.hours.push(percent(sums.hours))
  }

  return curve
}

/**
 * Dónde está alguien hoy: el primer círculo con algo sin hacer (7 si no queda
 * nada) y el % hecho de cada manera.
 */
export function standingOf(units: readonly Unit[], done: Done): Standing {
  const weights = weightsOf(units, done)
  const at = finishedAt(units, done)
  let circle = FINISHED_CIRCLE
  const sums = { circles: 0, hours: 0 }

  at.forEach(({ at: when }, index) => {
    const unit = units[index]

    if (when === Infinity) {
      circle = Math.min(circle, unit?.circle ?? FINISHED_CIRCLE)
      return
    }
    sums.circles += weights.circles[index] ?? 0
    sums.hours += weights.hours[index] ?? 0
  })

  return { circle, circles: percent(sums.circles), hours: percent(sums.hours) }
}

/** El avance (en %) de tener completos los círculos 0…`circle`, con lo más corto de cada grupo. */
function upTo(units: readonly Unit[], measure: ProgressMeasure, circle: number): number {
  const weights = weightsOf(units, new Map())

  return percent(
    units.reduce(
      (sum, unit, index) => sum + (unit.circle <= circle ? (weights[measure][index] ?? 0) : 0),
      0,
    ),
  )
}

/** Dónde se acaba cada círculo (0…6) en la medida por círculos: las marcas del eje. */
export function circleMarks(units: readonly Unit[]): number[] {
  return DAYS[24].map((_, circle) => upTo(units, 'circles', circle))
}

/**
 * Lo que pide cada pace: a los días de su plazo para cada círculo, el avance
 * de tener ese círculo y los anteriores completos. Empieza en (0, 0).
 */
export function paceLines(
  units: readonly Unit[],
): Record<ProgressMeasure, { pace: number; points: [number, number][] }[]> {
  const line = (measure: ProgressMeasure) =>
    PACES.map((pace) => ({
      pace,
      points: [
        [0, 0] as [number, number],
        ...DAYS[pace].map((day, circle): [number, number] => [day, upTo(units, measure, circle)]),
      ],
    }))

  return { circles: line('circles'), hours: line('hours') }
}
