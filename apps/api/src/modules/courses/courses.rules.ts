/**
 * Las reglas del juego de los cursos (`docs/cursos-logros.md`): qué es un
 * jefe, qué da certificado, qué termina cada curso, los logros y cómo se
 * ordenan las clasificaciones. Sin base de datos: todo sale de los puntos que
 * ha superado cada cual, tal como los guarda cada curso.
 */

import type {
  CourseAchievementId,
  CourseBoard,
  CourseBoardId,
  CourseId,
  CourseTier,
  StatsEntry,
} from '@sanatorio/contracts'
import {
  FINALS as DOCKER_FINALS,
  TIERS as DOCKER_TIERS,
  UNITS as DOCKER_UNITS,
} from '@sanatorio/dockersim'
import { GATES, LEVELS } from '@sanatorio/gitsim'
import { FINALS as K8S_FINALS, TIERS as K8S_TIERS, UNITS as K8S_UNITS } from '@sanatorio/k8ssim'
import { FINALS as RAG_FINALS, TIERS as RAG_TIERS, UNITS as RAG_UNITS } from '@sanatorio/ragsim'
import {
  FINALS as SHELL_FINALS,
  TIERS as SHELL_TIERS,
  UNITS as SHELL_UNITS,
} from '@sanatorio/shellsim'

/** Lo que hace falta saber de un curso para puntuarlo. */
type CourseSpec = {
  id: CourseId
  /** Sus jefes: los contrarrelojes de bloque y los finales; en git, los repasos de mundo y el jefe final. */
  bosses: readonly string[]
  /** Lo que certifica: los jefes finales de cada nivel; en git, su jefe final. */
  certificates: readonly string[]
  /** El punto que lo termina (el camino va en orden: sin los anteriores no se llega). */
  last: string
  /** Cada nivel con su certificado (git no tiene niveles). */
  tiers: readonly { tier: CourseTier; units: readonly string[]; final: string }[]
  /**
   * Si va aparte del camino sugerido (shell → git → Docker → Kubernetes): tiene
   * su clasificación y sus logros, pero no cuenta para «los cuatro cursos».
   */
  extra?: true
}

type TerminalUnit = { id: string; tier: CourseTier; kind: 'unit' | 'boss' | 'final' }

function terminalCourse(
  id: CourseId,
  units: readonly TerminalUnit[],
  finals: Record<CourseTier, string>,
  tiers: readonly CourseTier[],
): CourseSpec {
  return {
    id,
    bosses: units.filter((unit) => unit.kind !== 'unit').map((unit) => unit.id),
    certificates: tiers.map((tier) => finals[tier]),
    last: finals.advanced,
    tiers: tiers.map((tier) => ({
      tier,
      units: units.filter((unit) => unit.tier === tier).map((unit) => unit.id),
      final: finals[tier],
    })),
  }
}

/** El jefe final de git: una prueba de grupo que va después del último mundo. */
const GIT_BOSS = 'boss'

/**
 * Los cursos: los cuatro del camino, en el orden sugerido (shell → git →
 * Docker → Kubernetes), y detrás los que van aparte (RAG).
 */
export const COURSES: readonly CourseSpec[] = [
  terminalCourse('shell', SHELL_UNITS, SHELL_FINALS, SHELL_TIERS),
  {
    id: 'git',
    bosses: [
      ...LEVELS.filter((level) => level.kind === 'world').map((level) => level.id),
      GIT_BOSS,
    ],
    certificates: [GIT_BOSS],
    last: GIT_BOSS,
    tiers: [],
  },
  terminalCourse('docker', DOCKER_UNITS, DOCKER_FINALS, DOCKER_TIERS),
  terminalCourse('k8s', K8S_UNITS, K8S_FINALS, K8S_TIERS),
  { ...terminalCourse('rag', RAG_UNITS, RAG_FINALS, RAG_TIERS), extra: true },
]

/** Los cuatro del camino sugerido: de ellos salen los logros de «todos los cursos». */
const PATH = COURSES.filter((spec) => spec.extra !== true)

/** Las pruebas de grupo de git (sin el jefe final). */
const GIT_GROUPS = GATES.filter((gate) => gate.kind === 'group').map((gate) => gate.id)

/** Un punto superado: su mejor nota y cuándo se superó la primera vez (ISO). */
export type Done = { stars: number; at: string }

/** Lo que alguien lleva de cada curso, por punto. */
export type CoursesProgress = Record<CourseId, ReadonlyMap<string, Done>>

export type CourseAchievement = {
  id: CourseAchievementId
  progress: number
  goal: number
  unlocked: boolean
}

/** Un logro con lo que lleva y lo que pide. Conseguido, enseña la meta entera. */
const achievement = (
  id: CourseAchievementId,
  progress: number,
  goal: number,
  unlocked = progress >= goal,
): CourseAchievement => ({
  id,
  goal,
  progress: unlocked ? goal : Math.min(progress, goal),
  unlocked,
})

const count = (done: ReadonlyMap<string, Done>, ids: readonly string[], minStars = 1): number =>
  ids.filter((id) => (done.get(id)?.stars ?? 0) >= minStars).length

/** Cuándo terminó alguien un curso, o `null` si aún no. */
const finishedAt = (spec: CourseSpec, progress: CoursesProgress): string | null =>
  progress[spec.id].get(spec.last)?.at ?? null

/**
 * Cuántos cursos seguidos ha terminado en el orden sugerido: cada uno
 * terminado no antes que el anterior. Se corta en el primero que falta o que
 * terminó antes de tiempo.
 */
export function inOrder(progress: CoursesProgress): number {
  let previous = ''
  let streak = 0

  for (const spec of PATH) {
    const at = finishedAt(spec, progress)

    if (at === null || at < previous) break
    previous = at
    streak += 1
  }

  return streak
}

/** Los logros de los cursos de alguien, en el orden en que se enseñan. */
export function courseAchievements(progress: CoursesProgress): CourseAchievement[] {
  const perCourse = COURSES.flatMap((spec): CourseAchievement[] => {
    const done = progress[spec.id]
    const first = achievement(`${spec.id}_first` as CourseAchievementId, done.size, 1)
    const bosses = achievement(
      `${spec.id}_bosses` as CourseAchievementId,
      count(done, spec.bosses, 3),
      spec.bosses.length,
    )

    if (spec.id === 'git') {
      return [
        first,
        achievement('git_group', count(done, GIT_GROUPS), GIT_GROUPS.length),
        achievement('git_boss', count(done, [GIT_BOSS]), 1),
        bosses,
      ]
    }

    return [
      first,
      ...spec.tiers.map((tier) =>
        achievement(
          `${spec.id}_${tier.tier}` as CourseAchievementId,
          count(done, tier.units),
          tier.units.length,
          done.has(tier.final),
        ),
      ),
      bosses,
    ]
  })
  const started = PATH.filter((spec) => progress[spec.id].size > 0).length
  const finished = PATH.filter((spec) => finishedAt(spec, progress) !== null).length

  return [
    ...perCourse,
    achievement('courses_explorer', started, PATH.length),
    achievement('courses_all', finished, PATH.length),
    achievement('courses_order', inOrder(progress), PATH.length),
  ]
}

/** Lo que alguien ha hecho en un curso dentro del periodo, ya sumado. */
export type CourseTally = {
  login: string
  image: string | null
  course: CourseId
  /** Estrellas de los puntos superados: los puntos de la clasificación. */
  points: number
  units: number
  bosses: number
  certificates: number
  /** 1 si lo terminó en el periodo. */
  finished: number
}

/** Puestos que se enseñan de cada clasificación. */
const TOP = 10

/** Qué cifra ordena cada clasificación y cuál desempata. */
type Sums = Omit<CourseTally, 'login' | 'image' | 'course'>

const ORDER: Record<'course' | 'bosses' | 'certificates', [keyof Sums, keyof Sums]> = {
  course: ['points', 'units'],
  bosses: ['bosses', 'points'],
  certificates: ['certificates', 'bosses'],
}

/** Las cifras del campus de cada clasificación, en el orden de sus textos. */
const TOTALS: Record<'course' | 'bosses' | 'certificates', (keyof Sums | 'people')[]> = {
  course: ['people', 'units', 'finished'],
  bosses: ['people', 'bosses'],
  certificates: ['people', 'certificates'],
}

const ZERO: Sums = { points: 0, units: 0, bosses: 0, certificates: 0, finished: 0 }

function board(
  id: CourseBoardId,
  people: ReadonlyMap<string, { image: string | null; sums: Sums }>,
  me: string,
): CourseBoard {
  const kind = id === 'bosses' || id === 'certificates' ? id : 'course'
  const [value, extra] = ORDER[kind]
  const rows = [...people]
    .map(([login, { image, sums }]) => ({ login, image, value: sums[value], extra: sums[extra] }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || b.extra - a.extra || a.login.localeCompare(b.login))
  const ranking: StatsEntry[] = []

  for (const row of rows) {
    const before = ranking.at(-1)
    const tied = before?.value === row.value && before.extra === row.extra

    ranking.push({ ...row, rank: tied ? before.rank : ranking.length + 1 })
  }

  const sum = (key: keyof Sums): number =>
    [...people.values()].reduce((total, person) => total + person.sums[key], 0)

  return {
    id,
    totals: TOTALS[kind].map((key) => ({
      key,
      value: key === 'people' ? rows.length : sum(key),
    })),
    ranking: ranking.slice(0, TOP),
    me: ranking.find((entry) => entry.login === me) ?? null,
  }
}

/**
 * Las clasificaciones de los cursos a partir de lo sumado por persona y curso:
 * el total de los cuatro, una por curso, jefes y certificados. Solo entra
 * quien `sees` deja ver, antes de poner los puestos (sin huecos que delaten a
 * nadie).
 */
export function courseBoards(
  tallies: readonly CourseTally[],
  me: string,
  sees: (login: string) => boolean = () => true,
): CourseBoard[] {
  const seen = tallies.filter((tally) => sees(tally.login))
  const gather = (rows: readonly CourseTally[]) => {
    const people = new Map<string, { image: string | null; sums: Sums }>()

    for (const row of rows) {
      const person = people.get(row.login) ?? { image: row.image, sums: { ...ZERO } }

      for (const key of Object.keys(ZERO) as (keyof Sums)[]) person.sums[key] += row[key]
      people.set(row.login, person)
    }

    return people
  }
  const everything = gather(seen)

  return [
    board('total', everything, me),
    ...COURSES.map((spec) =>
      board(spec.id, gather(seen.filter((row) => row.course === spec.id)), me),
    ),
    board('bosses', everything, me),
    board('certificates', everything, me),
  ]
}
