/**
 * Reglas de la agenda (`docs/agenda.md`), sin base de datos: las listas
 * cerradas de lo que se elige, el tipo de cada proyecto y sus checkpoints de
 * fábrica, y dónde está atascada una meta.
 *
 * Las listas van como `Record` para que TypeScript exija todas las claves del
 * contrato: una opción nueva en `packages/contracts/src/agenda.ts` no compila
 * hasta que está aquí (y en la web, `shared/agenda/options.ts`).
 */

import type {
  AgendaCheckpoint,
  AgendaCheckpointKey,
  AgendaEntry,
  AgendaOutcome,
  AgendaProblem,
  AgendaProjectKind,
  AgendaSolution,
  SprintBlocker,
} from '@sanatorio/contracts'

const keysOf = <K extends string>(record: Record<K, true>): [K, ...K[]] =>
  Object.keys(record) as [K, ...K[]]

export const CHECKPOINT_KEYS = keysOf<AgendaCheckpointKey>({
  works: true,
  subject: true,
  sheet: true,
  norminette: true,
  leaks: true,
  breakers: true,
  git: true,
  slots: true,
  flags: true,
  canonical: true,
  pytools: true,
  tests: true,
  rebuild: true,
  inputs: true,
  window: true,
  practice: true,
  mock: true,
  registered: true,
})

export const PROBLEMS = keysOf<AgendaProblem>({
  concept: true,
  bug: true,
  memory: true,
  norminette: true,
  subject: true,
  time: true,
  motivation: true,
  waiting: true,
  cluster_full: true,
  failed_eval: true,
  personal: true,
  other: true,
})

export const SOLUTIONS = keysOf<AgendaSolution>({
  peer2peer: true,
  book_help: true,
  pair: true,
  sprint: true,
  whiteboard: true,
  docs: true,
  debugger: true,
  split: true,
  rest: true,
  other: true,
})

export const OUTCOMES = keysOf<AgendaOutcome>({ done: true, partial: true, not_done: true })

/**
 * Los checkpoints de fábrica de cada tipo de proyecto, en el orden en que se
 * suelen hacer: primero que funcione, luego que cumpla todo, y lo último,
 * reservar las correcciones.
 */
export const DEFAULT_CHECKPOINTS: Record<AgendaProjectKind, readonly AgendaCheckpointKey[]> = {
  c: ['works', 'subject', 'sheet', 'norminette', 'leaks', 'breakers', 'git', 'slots'],
  graphics: [
    'works',
    'subject',
    'inputs',
    'window',
    'sheet',
    'norminette',
    'leaks',
    'breakers',
    'git',
    'slots',
  ],
  cpp: ['works', 'subject', 'flags', 'canonical', 'leaks', 'sheet', 'breakers', 'git', 'slots'],
  python: ['works', 'subject', 'pytools', 'tests', 'sheet', 'breakers', 'git', 'slots'],
  sysadmin: ['works', 'subject', 'rebuild', 'sheet', 'breakers', 'git', 'slots'],
  exam: ['practice', 'mock', 'registered'],
  other: ['works', 'subject', 'sheet', 'breakers', 'git', 'slots'],
}

/** Por nombre (o slug), el tipo de proyecto. Lo que no se reconoce es de C: es lo más común. */
const KIND_PATTERNS: readonly [AgendaProjectKind, RegExp][] = [
  ['exam', /\bexam/],
  ['python', /python|42next/],
  ['cpp', /\bcpp\b|c\+\+|cpp[-_ ]module/],
  ['graphics', /so_long|so-long|\bfdf\b|fract|cub3d|minirt|minilibx|mlx/],
  ['sysadmin', /born2beroot|inception|netpractice|cloud-?1|kfs/],
  ['other', /transcendence|webserv|irc|matcha|hypertube|camagru/],
]

export function kindOf(name: string): AgendaProjectKind {
  const lower = name.toLowerCase()

  return KIND_PATTERNS.find(([, pattern]) => pattern.test(lower))?.[0] ?? 'c'
}

/** El lunes de la semana de ese día (`YYYY-MM-DD`): el día de un weekly. */
export function mondayOf(day: string): string {
  const at = new Date(`${day}T00:00:00.000Z`)
  const back = (at.getUTCDay() + 6) % 7

  return new Date(at.getTime() - back * 86_400_000).toISOString().slice(0, 10)
}

/** Días entre dos fechas `YYYY-MM-DD` (positivo si `to` va después). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
  )
}

/** El primer checkpoint sin hacer, en su orden: por dónde va la meta. */
export function stuckOn(checkpoints: readonly AgendaCheckpoint[]): AgendaCheckpoint | null {
  return checkpoints.find((checkpoint) => !checkpoint.done) ?? null
}

/**
 * El atasco abierto: el último daily o weekly, si apuntó un problema. Uno
 * posterior sin problema lo da por resuelto.
 */
export function blockerOf(entries: readonly AgendaEntry[]): SprintBlocker | null {
  const latest = [...entries].sort(
    (a, b) => b.day.localeCompare(a.day) || b.updatedAt.localeCompare(a.updatedAt),
  )[0]

  return latest?.problem === undefined || latest.problem === null
    ? null
    : {
        day: latest.day,
        problem: latest.problem,
        problemOther: latest.problemOther,
        solution: latest.solution,
        solutionOther: latest.solutionOther,
      }
}
