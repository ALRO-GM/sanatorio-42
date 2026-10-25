/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): cuánto
 * llevaba cada cual a los N días de empezar, para comparar con la media y con
 * lo que pide cada pace. No se mide por experiencia, sino por proyectos, de
 * dos maneras:
 *
 * - **Círculos** (`circles`): cada uno de los `CIRCLES` (7) círculos pesa
 *   exactamente 1/7, y sus casillas se lo reparten a partes iguales. Completar
 *   los círculos 0, 1 y 2 y la mitad del 3 es (3 + 0,5) / 7 = 50 %. Terminar
 *   el círculo `k` es, por tanto, (k + 1) / 7: las marcas fijas del eje
 *   (`circleMarks`). Vale para cualquier juego de casillas (el plan, o lo que
 *   hizo quien terminó): el 7 no cambia, solo cuántas casillas tiene cada
 *   círculo. Un círculo sin casillas en ese juego se da por hecho con el
 *   siguiente que tenga (al final, con el anterior): su peso pasa a ese.
 * - **Horas** (`hours`): las horas estimadas por 42 de los proyectos aprobados,
 *   frente a las de todo el plan **de esa persona**: de cada hueco cuentan las
 *   horas de la versión que hizo (la vieja o la de `42next-`, o el proyecto que
 *   eligió del grupo); de lo que no ha hecho, las del más corto.
 *
 * Un proyecto entre los que se elige uno (`CHOICES`: so_long, FdF o fract-ol) o
 * con dos versiones (`VERSIONS`) es una sola casilla: con aprobar cualquiera,
 * está hecha. Cuenta en el círculo de la versión que hizo (`moved`): quien
 * empezó en C y pasó a Python hizo Born2beroot en el círculo 1 y la push_swap
 * vieja en el 2, al revés que el plan de Python (`docs/blackhole.md`).
 *
 * Libft (el círculo 0) se aprueba antes de apuntarse a nada más, pero 42
 * reescribió en lote la fecha de muchas filas (el 2023-08-08, la de Libft de
 * un tercio de C): lo del círculo 0 cuenta, como tarde, cuando se apuntó al
 * primer proyecto de otro círculo (`settled`).
 *
 * **Quien terminó** el common core se mide contra lo que hizo hasta terminar,
 * no contra el plan de hoy (`ownUnits`): el plan cambia (proyectos que entran,
 * versiones nuevas, el plan de Python que se aprende de los votos), y quien
 * terminó con otro juego de proyectos se quedaba en el 96 %. Así su línea
 * llega al 100 % justo el día que terminó, de las dos maneras.
 */

import type { ProgressMeasure } from '@sanatorio/contracts'

import { DAYS, PACES } from './pace.rules.js'

/**
 * Un proyecto del plan, con su círculo y sus horas (si 42 las da). `adopted`:
 * una versión que el plan toma de otro plan, con el círculo que tenía allí.
 */
export type PlanProject = {
  id: number
  slug: string
  circle: number
  hours: number | null
  adopted?: boolean
}

/**
 * Una casilla del plan: un proyecto, o un grupo entre los que vale uno. `hours`
 * son las del más corto; `hoursById`, las de cada uno. `circle` es el suyo en el
 * plan; `moved`, las versiones adoptadas que cuentan en otro círculo.
 */
export type Unit = {
  circle: number
  hours: number | null
  ids: readonly number[]
  hoursById: ReadonlyMap<number, number | null>
  moved: ReadonlyMap<number, number>
}

/** Cuándo aprobó cada proyecto (id → ms) una persona. */
type Done = ReadonlyMap<number, number>

/** Dónde está alguien ahora: el círculo en el que está (7: terminado) y el % de cada manera. */
type Standing = { circle: number; circles: number; hours: number }

const DAY_MS = 86_400_000
/** El círculo de quien completó todos: uno más que el último (el 6). */
export const FINISHED_CIRCLE = 7
/** Cuántos círculos tiene el common core (del 0 al 6): por círculos, cada uno pesa 1/7. */
const CIRCLES = FINISHED_CIRCLE

const shorter = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? (a ?? b) : Math.min(a, b)

/**
 * Las casillas del plan: cada proyecto, salvo los de un mismo grupo, que van
 * juntos. El círculo de un grupo es el más bajo de los suyos sin contar las
 * versiones adoptadas; una adoptada de otro círculo va en `moved`.
 */
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

  const members = new Map<string, PlanProject[]>()

  for (const project of projects) {
    const key = groupOf.get(project.slug) ?? `#${String(project.id)}`
    const list = members.get(key) ?? []

    if (list.some((each) => each.id === project.id)) continue
    list.push(project)
    members.set(key, list)
  }

  return [...members.values()].map((list) => {
    const own = list.filter((project) => project.adopted !== true)
    // Del grupo se hace uno: cuenta el círculo más bajo y, sin saber cuál, las horas del más corto.
    const circle = Math.min(...(own.length > 0 ? own : list).map((project) => project.circle))

    return {
      circle,
      hours: list.map((project) => project.hours).reduce(shorter),
      ids: list.map((project) => project.id),
      hoursById: new Map(list.map((project) => [project.id, project.hours])),
      moved: new Map(
        list
          .filter((project) => project.adopted === true && project.circle !== circle)
          .map((project) => [project.id, project.circle]),
      ),
    }
  })
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
 * El círculo en que cuenta cada casilla para alguien: el de la versión que hizo.
 * De lo que no ha hecho, el del plan; salvo que ya haya hecho alguna versión
 * adoptada que cambia de círculo (empezó en C y pasó a Python): entonces sigue
 * esas, y lo que le falta va donde iba en su plan de antes.
 */
function placedCircles(units: readonly Unit[], done: Done): number[] {
  const at = finishedAt(units, done)
  const follows = at.some(({ id }, index) => id !== null && units[index]?.moved.has(id) === true)

  return units.map((unit, index) => {
    const id = at[index]?.id ?? null

    if (id !== null) return unit.moved.get(id) ?? unit.circle
    if (follows) return [...unit.moved.values()][0] ?? unit.circle

    return unit.circle
  })
}

/**
 * Lo que pesa cada círculo con casillas: 1/7 cada uno. El de un círculo sin
 * casillas pasa al siguiente que tenga (o, si no hay, al anterior): se da por
 * hecho con él, y la línea sigue cayendo en las marcas.
 */
function circleShares(present: ReadonlySet<number>): Map<number, number> {
  const sorted = [...present].sort((a, b) => a - b)
  const shares = new Map<number, number>()

  for (let circle = 0; circle < CIRCLES; circle++) {
    const target = sorted.find((each) => each >= circle) ?? sorted.at(-1)

    if (target !== undefined) shares.set(target, (shares.get(target) ?? 0) + 1 / CIRCLES)
  }

  return shares
}

/**
 * Lo que mide cada casilla en cada manera de medir, en tanto por uno del total:
 * en círculos, lo que pesa su círculo entre las casillas que tiene ese círculo
 * en el juego de esa persona; en horas, sus horas entre las de todo su plan.
 */
function weightsOf(units: readonly Unit[], done: Done): Record<ProgressMeasure, number[]> {
  const placed = placedCircles(units, done)
  const perCircle = new Map<number, number>()

  for (const circle of placed) perCircle.set(circle, (perCircle.get(circle) ?? 0) + 1)

  const shares = circleShares(new Set(perCircle.keys()))
  const hours = ownHours(units, done)
  const total = hours.reduce((sum, each) => sum + each, 0)
  const circles = placed.map((circle) => (shares.get(circle) ?? 0) / (perCircle.get(circle) ?? 1))

  // Sin ninguna hora conocida (solo exámenes), por horas cuenta como por círculos.
  return { circles, hours: total === 0 ? circles : hours.map((each) => each / total) }
}

const percent = (share: number): number => Math.round(share * 1000) / 10

/** El día (desde `start`) en que cae `at`: el primer punto de las líneas que ya lo cuenta. */
const dayOf = (at: number, start: number): number => Math.max(0, Math.ceil((at - start) / DAY_MS))

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
  const placed = placedCircles(units, done)
  const at = finishedAt(units, done)
  let circle = FINISHED_CIRCLE
  const sums = { circles: 0, hours: 0 }

  at.forEach(({ at: when }, index) => {
    if (when === Infinity) {
      circle = Math.min(circle, placed[index] ?? FINISHED_CIRCLE)
      return
    }
    sums.circles += weights.circles[index] ?? 0
    sums.hours += weights.hours[index] ?? 0
  })

  return { circle, circles: percent(sums.circles), hours: percent(sums.hours) }
}

/**
 * Dónde se acaba cada círculo (0…6) en la medida por círculos: las marcas del
 * eje, (k + 1) / 7. Son fijas: toda línea pesa cada círculo igual, sea cual sea
 * su juego de casillas, y cae justo en la marca `k` al completar los círculos 0…k.
 */
export function circleMarks(): number[] {
  return Array.from({ length: CIRCLES }, (_, circle) => percent((circle + 1) / CIRCLES))
}

/** El avance por horas de tener completos los círculos 0…`circle`, con lo más corto de cada grupo. */
function hoursUpTo(units: readonly Unit[], circle: number): number {
  const weights = weightsOf(units, new Map()).hours

  return percent(
    units.reduce(
      (sum, unit, index) => sum + (unit.circle <= circle ? (weights[index] ?? 0) : 0),
      0,
    ),
  )
}

/**
 * Lo que pide cada pace: a los días de su plazo para cada círculo, el avance
 * de tener ese círculo y los anteriores completos. Empieza en (0, 0).
 */
export function paceLines(
  units: readonly Unit[],
): Record<ProgressMeasure, { pace: number; points: [number, number][] }[]> {
  const marks = circleMarks()
  const line = (upTo: (circle: number) => number) =>
    PACES.map((pace) => ({
      pace,
      points: [
        [0, 0] as [number, number],
        ...DAYS[pace].map((day, circle): [number, number] => [day, upTo(circle)]),
      ],
    }))

  return {
    circles: line((circle) => marks[circle] ?? 100),
    hours: line((circle) => hoursUpTo(units, circle)),
  }
}

/**
 * Cuándo terminó alguien el common core: lo último que aprobó del último
 * círculo de su plan (ft_transcendence o el examen 6). El grado no lleva fecha
 * y lo último aprobado del plan no vale: hay quien vuelve años después a hacer
 * un proyecto suelto. `null` si no tiene nada de ese círculo.
 */
export function finishedOn(units: readonly Unit[], done: Done): number | null {
  const last = Math.max(...units.map((unit) => unit.circle))
  let at: number | null = null

  finishedAt(units, done).forEach(({ at: when }, index) => {
    if (units[index]?.circle === last && when !== Infinity) at = Math.max(at ?? when, when)
  })

  return at
}

/**
 * Las casillas contra las que se mide quien terminó: las que tenía hechas el
 * día que terminó (`finishedOn`; sin nada del último círculo, lo último que
 * aprobó del plan). Lo que hizo después, o lo que el plan añadió y no hizo, no
 * cuenta. Sin nada hecho, el plan entero (no hay con qué medir).
 */
export function ownUnits(units: readonly Unit[], done: Done): readonly Unit[] {
  const at = finishedAt(units, done)
  const passed = at.map(({ at: when }) => when).filter((when) => when !== Infinity)

  if (passed.length === 0) return units
  const end = finishedOn(units, done) ?? Math.max(...passed)

  return units.filter((_, index) => (at[index]?.at ?? Infinity) <= end)
}

/**
 * Lo aprobado, con lo del círculo 0 (Libft) como tarde cuando se apuntó al
 * primer proyecto de otro círculo, o un día antes de aprobarlo si no se sabe
 * cuándo se apuntó: nadie se apunta a ft_printf sin tener Libft, y nadie se
 * apunta y lo aprueba el mismo día. 42 reescribió en lote la fecha de muchas
 * filas de Libft (el 2023-08-08: 638 en Madrid, un tercio de C) y su línea
 * empezaba por ft_printf, lejos del círculo 0. Esas filas no dicen cuándo se
 * apuntó; una que sí lo dice y es posterior (lo repitió, o el plan lo añadió
 * después) se queda como está. `opened`: cuándo se apuntó a cada proyecto (id →
 * ms), si se sabe.
 */
export function settled(
  units: readonly Unit[],
  done: Done,
  opened: ReadonlyMap<number, number>,
): Map<number, number> {
  let first = Infinity

  for (const unit of units) {
    if (unit.circle === 0) continue
    for (const id of unit.ids) {
      first = Math.min(first, opened.get(id) ?? Infinity, (done.get(id) ?? Infinity) - DAY_MS)
    }
  }

  const fixed = new Map(done)

  for (const unit of units) {
    if (unit.circle !== 0) continue
    for (const id of unit.ids) {
      const at = done.get(id)

      if (at !== undefined && at > first && (opened.get(id) ?? -Infinity) <= first) {
        fixed.set(id, first)
      }
    }
  }

  return fixed
}

/** Lo aprobado de un mismo día: los proyectos (por id) y dónde deja la línea. */
type Milestone = { day: number; ids: number[]; value: Record<ProgressMeasure, number> }

/**
 * Los hitos de una línea: cada día (desde `start`) en que aprobó algo que la
 * mueve, con qué proyecto de cada casilla y el % en que queda ese día. Hasta
 * `now` o hasta `until` (el día que salió quien ya no está). Lo que se aprobó
 * antes del inicio (quien vino trasladado) va en el día 0.
 */
export function milestonesOf(
  units: readonly Unit[],
  done: Done,
  start: number,
  now: number,
  until = Infinity,
): Milestone[] {
  const weights = weightsOf(units, done)
  const last = Math.min(now, until)
  const order = finishedAt(units, done)
    .map(({ at, id }, index) => ({ at, id, index }))
    .filter((each) => each.at <= last && each.id !== null)
    .sort((a, b) => a.at - b.at)
  const sums = { circles: 0, hours: 0 }
  const milestones: Milestone[] = []

  for (const { at, id, index } of order) {
    const day = dayOf(at, start)
    let current = milestones.at(-1)

    if (current?.day !== day) {
      current = { day, ids: [], value: { circles: 0, hours: 0 } }
      milestones.push(current)
    }
    sums.circles += weights.circles[index] ?? 0
    sums.hours += weights.hours[index] ?? 0
    current.ids.push(id ?? 0)
    current.value = { circles: percent(sums.circles), hours: percent(sums.hours) }
  }

  return milestones
}

/** El día (desde `start`) en que quien terminó aprobó lo último de sus casillas. */
export function finishedDay(units: readonly Unit[], done: Done, start: number): number | null {
  const passed = finishedAt(units, done)
    .map(({ at }) => at)
    .filter((at) => at !== Infinity)

  return passed.length === 0 ? null : dayOf(Math.max(...passed), start)
}
