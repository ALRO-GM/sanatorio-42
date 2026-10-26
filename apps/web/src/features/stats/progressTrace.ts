/**
 * Las líneas de una persona en el Avance (la tuya, con quien te comparas y las
 * sueltas de una media con poca gente): sus puntos con los hitos dentro, el
 * tramo de después de terminar y los sitios por los que pasa el teclado.
 *
 * La API da cada línea cada 15 días y, aparte, cada día en que se aprobó algo
 * (`ProgressMilestone`). Con los hitos dentro, la línea sube el día exacto y el
 * trofeo de quien terminó cae encima de ella, no entre dos puntos.
 */

import type { ProgressLine, ProgressMeasure, ProgressTrace } from '@sanatorio/contracts'

/** Un punto `[día, %]`. */
type Point = [number, number]

/**
 * Los puntos de la línea con los hitos dentro, por orden de día, hasta `last`
 * (el borde derecho del periodo). Un hito y un punto del mismo día valen lo
 * mismo: se queda uno.
 */
export function tracePoints(
  days: readonly number[],
  line: ProgressLine,
  trace: ProgressTrace,
  measure: ProgressMeasure,
  last: number,
): Point[] {
  const byDay = new Map<number, number>()

  line.forEach((value, index) => {
    const day = days[index]

    if (value !== null && day !== undefined && day <= last) byDay.set(day, value)
  })
  // Un hito no alarga la línea más allá de su último punto (hoy, o el día que salió).
  const end = Math.max(-1, ...byDay.keys())

  for (const milestone of trace.milestones) {
    if (milestone.day <= Math.min(last, end + 15)) {
      byDay.set(milestone.day, milestone.value[measure])
    }
  }

  return [...byDay].sort((a, b) => a[0] - b[0])
}

/**
 * Los puntos de una línea en escalones: entre dos puntos se queda en el valor
 * del primero y sube de golpe el día del segundo, que es cuando aprobó (los
 * hitos van dentro). Así el escalón de completar un círculo cae justo en su raya
 * del eje ese día, en vez de una rampa desde el punto de 15 días anterior.
 */
export function stepped(points: readonly Point[]): Point[] {
  const steps: Point[] = []

  points.forEach(([day, value], index) => {
    const before = points[index - 1]

    if (before !== undefined && before[1] !== value) steps.push([day, before[1]])
    steps.push([day, value])
  })

  return steps
}

/**
 * El tramo de después de terminar, a lo largo del 100 %: del día en que
 * terminó al último punto. `null` si no terminó o cae fuera del periodo.
 */
export function finishedStretch(points: readonly Point[], finished: number | null): Point[] | null {
  if (finished === null) return null
  const end = points.at(-1)

  if (end === undefined || end[0] < finished) return null

  return [
    [finished, 100],
    [end[0], 100],
  ]
}

/** Un sitio en el que se para la ficha: un día de las líneas o un hito de una persona. */
export type Stop = { kind: 'day'; index: number; day: number } | MilestoneStop
export type MilestoneStop = { kind: 'milestone'; key: string; at: number; day: number }

/**
 * Por dónde pasa el teclado, de izquierda a derecha: cada día de las líneas y,
 * entre ellos, cada hito, solo los del periodo (del día `first` al `last`). Con
 * dos en el mismo día, primero el día. `index` es el sitio del día en `days`.
 */
export function stopsOf(
  days: readonly number[],
  milestones: readonly { key: string; trace: ProgressTrace }[],
  first: number,
  last: number,
): Stop[] {
  const inside = (day: number): boolean => day >= first && day <= last
  const stops: Stop[] = days.flatMap((day, index): Stop[] =>
    inside(day) ? [{ kind: 'day', index, day }] : [],
  )

  for (const { key, trace } of milestones) {
    trace.milestones.forEach((milestone, at) => {
      if (inside(milestone.day)) stops.push({ kind: 'milestone', key, at, day: milestone.day })
    })
  }

  return stops.sort((a, b) => a.day - b.day || (a.kind === 'day' ? -1 : 1))
}

/** El sitio al que se va con una tecla desde `current` (o `null` si la tecla no mueve). */
export function nextStop(stops: readonly Stop[], current: Stop | null, key: string): Stop | null {
  const index =
    current === null
      ? -1
      : stops.findIndex((stop) =>
          stop.kind === 'day'
            ? current.kind === 'day' && current.index === stop.index
            : current.kind === 'milestone' && current.key === stop.key && current.at === stop.at,
        )
  const last = stops.length - 1
  const to =
    key === 'ArrowRight' || key === 'ArrowDown'
      ? Math.min(last, index + 1)
      : key === 'ArrowLeft' || key === 'ArrowUp'
        ? Math.max(0, index === -1 ? last : index - 1)
        : key === 'Home'
          ? 0
          : key === 'End'
            ? last
            : null

  return to === null ? null : (stops[to] ?? null)
}
