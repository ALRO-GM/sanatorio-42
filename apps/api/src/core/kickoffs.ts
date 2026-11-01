/**
 * Las kickoffs reales de un campus (pedido por Alberto el 2026-11-01).
 *
 * Antes la kickoff de cada cual era el mes en que empezó el cursus. Pero hay
 * gente que entra sola o en grupos pequeños en otras fechas (sobre todo quien
 * viene de otro campus) y esos meses sueltos ensuciaban las elecciones por
 * kickoff. Ahora:
 *
 * 1. Las kickoffs de un campus son los días en que entra mucha gente: se juntan
 *    las entradas que caen a menos de `WINDOW_DAYS` unas de otras y vale el
 *    grupo con al menos `MIN_PEOPLE` y el `MIN_SHARE` del más grande. Su fecha
 *    es el día con más entradas del grupo.
 * 2. Quien entró en una de esas fechas (con la misma holgura) es de esa.
 * 3. Quien no, se mira cuándo entró en 42 en general (lo primero que se sabe:
 *    el inicio del cursus o su primer proyecto, que para quien viene de otro
 *    campus es de allí) y se le da la kickoff del campus más cercana anterior a
 *    esa fecha; si no hay ninguna anterior, la más cercana.
 *
 * Sin base de datos: se prueba sola (`tests/unit/kickoffs.test.ts`).
 */

import { monthOf } from './time.js'

const DAY_MS = 86_400_000
/** Entradas a menos de esto unas de otras son la misma kickoff. */
const WINDOW_DAYS = 7
/** Gente mínima para que un grupo de entradas sea una kickoff. */
const MIN_PEOPLE = 8
/** Y al menos esta parte de la kickoff más grande del campus. */
const MIN_SHARE = 0.1

const dayOf = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS

/** Las fechas (ms, inicio del día en UTC) de las kickoffs reales, de la más antigua a la más reciente. */
export function realKickoffs(starts: readonly number[]): number[] {
  const perDay = new Map<number, number>()

  for (const start of starts) {
    if (!Number.isFinite(start)) continue
    const day = dayOf(start)

    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }

  const days = [...perDay].sort(([a], [b]) => a - b)
  const groups: { size: number; peak: number; peakCount: number; last: number }[] = []

  for (const [day, count] of days) {
    const group = groups.at(-1)

    if (group !== undefined && day - group.last <= WINDOW_DAYS * DAY_MS) {
      group.size += count
      group.last = day
      if (count > group.peakCount) {
        group.peak = day
        group.peakCount = count
      }
    } else {
      groups.push({ size: count, peak: day, peakCount: count, last: day })
    }
  }

  const largest = Math.max(0, ...groups.map((group) => group.size))
  const needed = Math.max(MIN_PEOPLE, largest * MIN_SHARE)

  return groups.filter((group) => group.size >= needed).map((group) => group.peak)
}

/**
 * La kickoff (fecha en ms) de quien empezó en `start` y entró en 42 en
 * `general` (lo primero que se sabe de él; como mucho, `start`). `null` si el
 * campus no tiene ninguna kickoff real.
 */
export function kickoffFor(
  kickoffs: readonly number[],
  start: number,
  general: number,
): number | null {
  if (kickoffs.length === 0) return null

  const window = WINDOW_DAYS * DAY_MS
  const near = (at: number): number | undefined =>
    [...kickoffs].sort((a, b) => Math.abs(a - at) - Math.abs(b - at))[0]
  const closest = near(start)

  // Entró con un grupo grande: esa es su kickoff.
  if (closest !== undefined && Math.abs(closest - start) <= window) return closest

  const entered = Math.min(start, general)
  const before = kickoffs.filter((kickoff) => kickoff <= entered + window)

  return before.at(-1) ?? near(entered) ?? null
}

/**
 * La kickoff (`AAAA-MM`) de cada persona, por campus. `people` lleva el campus
 * en que está, cuándo empezó allí y lo primero que se sabe de ella en 42. Quien
 * no tiene campus, o es de un campus sin kickoffs reales, se queda con el mes
 * en que empezó.
 */
export function kickoffMonths<K>(
  people: readonly { key: K; campus: number | null; start: number; general: number }[],
): Map<K, string> {
  const starts = new Map<number | null, number[]>()

  for (const person of people) {
    const list = starts.get(person.campus) ?? []

    list.push(person.start)
    starts.set(person.campus, list)
  }

  const kickoffs = new Map(
    [...starts].map(([campus, list]) => [campus, campus === null ? [] : realKickoffs(list)]),
  )
  const months = new Map<K, string>()

  for (const person of people) {
    const kickoff = kickoffFor(kickoffs.get(person.campus) ?? [], person.start, person.general)

    months.set(person.key, monthOf(kickoff ?? person.start))
  }

  return months
}
