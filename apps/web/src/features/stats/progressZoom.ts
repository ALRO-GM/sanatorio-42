/**
 * La lupa del Avance: ajusta la gráfica a lo que se ve. El eje del tiempo
 * acaba donde acaba la persona que más lejos llega (tú y con quien te
 * comparas; ni las medias ni los paces lo alargan) y el vertical, en lo más
 * alto que se ve en ese tiempo, paces incluidos.
 */

import type { ProgressLine, ProgressTrace } from '@sanatorio/contracts'

/** Una persona en la gráfica: su línea, cuándo terminó y sus hitos. */
type Person = {
  line: ProgressLine
  trace: Pick<ProgressTrace, 'finished'> & { milestones: readonly { day: number }[] }
}

/** El último día de una persona: el que terminó o, si no, el de su último dato o hito. */
function endOf(days: readonly number[], person: Person): number | null {
  if (person.trace.finished !== null) return person.trace.finished
  let end: number | null = null

  person.line.forEach((value, index) => {
    const day = days[index]

    if (value !== null && day !== undefined) end = day
  })
  for (const milestone of person.trace.milestones) {
    if (end === null || milestone.day > end) end = milestone.day
  }

  return end
}

/**
 * Hasta qué día va el eje del tiempo con la lupa: el último de quien más lejos
 * llega, dentro del periodo (de `first` a `last`). Sin nadie en el periodo, el
 * periodo entero.
 */
export function zoomLast(
  days: readonly number[],
  people: readonly Person[],
  first: number,
  last: number,
): number {
  const ends = people.flatMap((person) => {
    const end = endOf(days, person)

    return end === null || end <= first ? [] : [end]
  })

  return ends.length === 0 ? last : Math.min(last, Math.max(first + 1, ...ends))
}

/** El valor en el día `day` de un trazo por puntos `[día, %]` (sin salirse de sus extremos). */
function valueAt(points: readonly [number, number][], day: number): number | null {
  for (let index = 1; index < points.length; index++) {
    const [fromDay, fromValue] = points[index - 1] ?? [0, 0]
    const [toDay, toValue] = points[index] ?? [0, 0]

    if (day >= fromDay && day <= toDay) {
      return toDay === fromDay
        ? Math.max(fromValue, toValue)
        : fromValue + ((day - fromDay) / (toDay - fromDay)) * (toValue - fromValue)
    }
  }

  return null
}

/**
 * Lo más alto que se ve del día `first` al `last`: los valores de las líneas
 * (ya recortadas al periodo), los hitos y los paces, con el de cada pace justo
 * en los bordes. Con un poco de aire por encima, sin pasar del 100 % ni bajar
 * del 5 %.
 */
export function zoomTop(
  lines: readonly ProgressLine[],
  milestones: readonly { day: number; value: number }[],
  paces: readonly (readonly [number, number][])[],
  first: number,
  last: number,
): number {
  const inside = (day: number): boolean => day >= first && day <= last
  const values = [
    ...lines.flatMap((line) => line.filter((value) => value !== null)),
    ...milestones.filter((milestone) => inside(milestone.day)).map(({ value }) => value),
    ...paces.flatMap((points) => [
      ...points.filter(([day]) => inside(day)).map(([, value]) => value),
      ...[first, last].flatMap((edge) => {
        const value = valueAt(points, edge)

        return value === null ? [] : [value]
      }),
    ]),
  ]

  return Math.min(100, Math.max(5, Math.ceil(Math.max(0, ...values) * 1.05)))
}
