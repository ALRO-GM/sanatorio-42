/**
 * Las reglas del Avance de un piscinero (`docs/piscineros.md`): cuántos de los
 * proyectos que cuentan (Shell 00 … C 13, `replica/piscine.ts`) lleva
 * aprobados al acabar cada día de piscina, y las medias de su piscina y de las
 * anteriores de su campus. Los rushes, BSQ y exámenes no entran aquí: quien
 * llama solo pasa los que cuentan.
 */

import type {
  PiscineMilestone,
  PiscinePoolLine,
  PiscineTrace,
  ProgressLine,
} from '@sanatorio/contracts'

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

/** Si quien empezó en `start` es de tu piscina (la que empezó en `anchor`): a menos de una semana. */
export function samePool(start: number, anchor: number): boolean {
  return Math.abs(start - anchor) < SAME_POOL_MS
}

/**
 * La piscina en curso de un campus, para quien la mira sin ser de ella (quien
 * administra en la vista de piscinero): el día en que empezó más gente de los
 * que ya han empezado, y de los empates el más reciente. Con la última fecha a
 * secas, alguien que se apuntó días tarde dejaba fuera a casi toda la piscina.
 * `null` sin nadie.
 */
export function poolAnchorOf(starts: readonly number[], now: number): number | null {
  const byDay = new Map<number, number>()

  for (const start of starts) {
    if (start > now) continue
    const day = Math.floor(start / DAY_MS)

    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  let best: [day: number, people: number] | null = null

  for (const [day, people] of byDay) {
    if (best === null || people > best[1] || (people === best[1] && day > best[0])) {
      best = [day, people]
    }
  }
  if (best === null) return null

  const day = best[0]

  // El inicio de verdad de quien empezó ese día (no la medianoche).
  return Math.min(...starts.filter((start) => Math.floor(start / DAY_MS) === day))
}

/**
 * El piscinero que va más avanzado: más proyectos aprobados y, a igualdad,
 * quien aprobó antes el último (como la lista de los más avanzados de la web);
 * luego, por login, para que no cambie de una visita a otra. `null` sin nadie.
 */
export function leaderOf<T extends Swimmer>(swimmers: readonly T[], now: number): T | null {
  const scored = swimmers.map((swimmer) => {
    const passed = [...swimmer.done.values()].filter((at) => at <= now)

    return { swimmer, done: passed.length, last: Math.max(-Infinity, ...passed) }
  })

  scored.sort(
    (a, b) => b.done - a.done || a.last - b.last || a.swimmer.login.localeCompare(b.swimmer.login),
  )

  return scored[0]?.swimmer ?? null
}

/** Un día con esta gente empezando o más es una piscina, no alguien que repite. */
const MIN_POOL = 20
/** Las piscinas que se comparan: las últimas. */
const MAX_POOLS = 10

/**
 * Las últimas piscinas de un campus para compararlas en el Avance (pedido por
 * Alberto el 2026-11-07): los días en que empezaron `MIN_POOL` personas o más,
 * de la más nueva a la más vieja, cada una con la media de lo aprobado cada
 * día de piscina (`minPeople` como en `meanLine`). Sin nada aprobado aún
 * (el historial no la ha copiado), `copied: false`.
 */
export function poolLinesOf(
  swimmers: readonly Swimmer[],
  now: number,
  names: ReadonlyMap<number, string>,
  minPeople: number,
): PiscinePoolLine[] {
  const firstOf = new Map<number, number>()
  const count = new Map<number, number>()

  for (const swimmer of swimmers) {
    if (swimmer.start > now) continue
    const day = Math.floor(swimmer.start / DAY_MS)

    count.set(day, (count.get(day) ?? 0) + 1)
    firstOf.set(day, Math.min(firstOf.get(day) ?? Infinity, swimmer.start))
  }

  return [...count]
    .filter(([, people]) => people >= MIN_POOL)
    .sort((a, b) => b[0] - a[0])
    .slice(0, MAX_POOLS)
    .map(([day]) => {
      const first = firstOf.get(day) ?? day * DAY_MS
      const members = swimmers.filter((swimmer) => samePool(swimmer.start, first))

      return {
        start: new Date(first).toISOString().slice(0, 10),
        people: members.length,
        line: meanLine(
          members.map((swimmer) => swimOf(swimmer, now, names).line),
          POOL_AXIS.length,
          minPeople,
        ),
        copied: members.some((swimmer) => swimmer.done.size > 0),
      }
    })
}
