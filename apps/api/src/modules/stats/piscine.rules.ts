/**
 * Las reglas del Avance de un piscinero (`docs/piscineros.md`): cuántos de los
 * proyectos que cuentan (Shell 00 … C 13, `replica/piscine.ts`) lleva
 * aprobados al acabar cada día de piscina, y las medias de su piscina y de las
 * anteriores de su campus. Los rushes, BSQ y exámenes no entran aquí: quien
 * llama solo pasa los que cuentan.
 */

import type { PiscineMilestone, PiscineTrace, ProgressLine } from '@sanatorio/contracts'

const DAY_MS = 86_400_000

/** Hasta qué día se dibuja: una piscina son cuatro semanas, con el examen final el último viernes. */
export const POOL_DAYS = 30

/** Los días del eje: 0, 1, … `POOL_DAYS`. */
export const POOL_AXIS: readonly number[] = Array.from({ length: POOL_DAYS + 1 }, (_, day) => day)

/** Un piscinero para su avance: cuándo empezó y cuándo aprobó cada proyecto que cuenta (id → ms). */
export type Swimmer = { login: string; start: number; done: ReadonlyMap<number, number> }

/** El día de piscina (desde 0) en que cae ese momento; lo de antes de empezar, el 0. */
const dayOf = (start: number, at: number): number => Math.max(0, Math.floor((at - start) / DAY_MS))

/**
 * La línea de un piscinero: lo aprobado al acabar cada día del eje, hasta hoy
 * (los días que aún no ha vivido, `null`); lo que lleva hoy y cada día en que
 * aprobó algo, con los nombres (`names`, id → nombre corto).
 */
export function swimOf(
  swimmer: Swimmer,
  now: number,
  names: ReadonlyMap<number, string>,
  days: readonly number[] = POOL_AXIS,
): PiscineTrace {
  const passed = [...swimmer.done]
    .filter(([, at]) => at <= now)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const byDay = new Map<number, number[]>()

  for (const [id, at] of passed) {
    const day = dayOf(swimmer.start, at)

    byDay.set(day, [...(byDay.get(day) ?? []), id])
  }

  let value = 0
  const milestones: PiscineMilestone[] = [...byDay]
    .sort((a, b) => a[0] - b[0])
    .map(([day, ids]) => {
      value += ids.length

      return { day, projects: ids.map((id) => names.get(id) ?? String(id)), value }
    })

  return {
    line: days.map((day) =>
      swimmer.start + day * DAY_MS > now
        ? null
        : passed.filter(([, at]) => dayOf(swimmer.start, at) <= day).length,
    ),
    done: passed.length,
    milestones,
  }
}

/**
 * La media de varias líneas, punto a punto, con un decimal. Donde hay menos de
 * `min` personas con dato, `null`: con tres no es una media que diga nada.
 */
export function meanLine(
  lines: readonly ProgressLine[],
  length: number,
  min: number,
): ProgressLine {
  return Array.from({ length }, (_, index) => {
    const values = lines.flatMap((line) => {
      const value = line[index]

      return value === null || value === undefined ? [] : [value]
    })

    return values.length < min
      ? null
      : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  })
}

/** Una semana: quien empezó a menos de esto de ti es de tu piscina. */
const SAME_POOL_MS = 7 * DAY_MS

/**
 * De qué piscina es cada cual, respecto a la tuya (la que empezó en
 * `anchor`): la misma, si empezó a menos de una semana; una anterior, si
 * empezó antes y desde `since`; ninguna de las dos (una que empieza después,
 * o una demasiado vieja), `null`. Sin piscina tuya, todas son anteriores.
 */
export function poolOf(
  start: number,
  anchor: number | null,
  since: number,
): 'cohort' | 'past' | null {
  if (anchor !== null && Math.abs(start - anchor) < SAME_POOL_MS) return 'cohort'
  if (start < since) return null

  return anchor === null || start < anchor ? 'past' : null
}
