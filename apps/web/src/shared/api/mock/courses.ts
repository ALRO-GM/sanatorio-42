/**
 * El juego de los cursos de mentira (`docs/cursos-logros.md`): clasificaciones
 * del campus y logros, con logins inventados (también salen en la
 * demostración pública). «Siempre» es «este mes» multiplicado, como en las de
 * Ayuda, para que se note el cambio.
 */

import type {
  CourseAchievementId,
  CourseBoard,
  CourseBoardId,
  CourseId,
  CourseRanking,
  StatsEntry,
} from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay } from './state'
import type { Api } from '../types'

/** Lo de cada persona en un curso: puntos, superados, jefes, certificados y si lo terminó. */
type Tally = [points: number, units: number, bosses: number, certificates: number, done: number]

const MONTH: Record<string, Partial<Record<CourseId, Tally>>> = {
  [ME.login]: { shell: [42, 16, 4, 1, 0], git: [9, 4, 0, 0, 0], rag: [6, 2, 0, 0, 0] },
  jdoe: { shell: [61, 22, 6, 2, 0], docker: [12, 5, 1, 0, 0] },
  mgarcia: { git: [54, 20, 3, 0, 0], k8s: [7, 3, 0, 0, 0] },
  cfernandez: { shell: [30, 11, 2, 1, 0], git: [18, 7, 1, 0, 0], docker: [24, 9, 2, 1, 0] },
  anavarro: { docker: [33, 12, 3, 1, 0] },
  lruiz: { k8s: [27, 10, 3, 1, 0], shell: [96, 36, 9, 3, 1] },
  lsoto: { git: [12, 5, 1, 0, 0], rag: [21, 8, 1, 0, 0] },
  nvidal: { rag: [44, 17, 4, 1, 0] },
}

const COURSE_IDS: readonly CourseId[] = ['shell', 'git', 'docker', 'k8s', 'net', 'rag']

/** Qué ordena cada clasificación y qué desempata (índices de `Tally`), y sus cifras del campus. */
const BOARDS: Record<CourseBoardId, { order: [number, number]; totals: string[] }> = {
  total: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  shell: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  git: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  docker: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  k8s: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  net: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  rag: { order: [0, 1], totals: ['people', 'units', 'finished'] },
  bosses: { order: [2, 0], totals: ['people', 'bosses'] },
  certificates: { order: [3, 2], totals: ['people', 'certificates'] },
}

/** Dónde va cada cifra del campus en `Tally`. */
const COLUMN: Record<string, number> = { units: 1, bosses: 2, certificates: 3, finished: 4 }

function boardOf(id: CourseBoardId, times: number): CourseBoard {
  const courses = COURSE_IDS.includes(id as CourseId) ? [id as CourseId] : COURSE_IDS
  const people = Object.entries(MONTH).map(([login, byCourse]) => {
    const sums: Tally = [0, 0, 0, 0, 0]

    for (const course of courses) {
      byCourse[course]?.forEach((value, index) => {
        // Lo terminado no se multiplica: cada curso se termina una vez.
        sums[index] = (sums[index] ?? 0) + (index === 4 ? value : value * times)
      })
    }

    return { login, sums }
  })
  const [value, extra] = BOARDS[id].order
  const rows = people
    .map(({ login, sums }) => ({ login, value: sums[value] ?? 0, extra: sums[extra] ?? 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || b.extra - a.extra || a.login.localeCompare(b.login))
  const ranking: StatsEntry[] = rows.map((row, index) => ({
    ...row,
    image: portrait(row.login),
    rank: index + 1,
  }))

  return {
    id,
    totals: BOARDS[id].totals.map((key) => ({
      key,
      value:
        key === 'people'
          ? rows.length
          : people.reduce((sum, person) => sum + (person.sums[COLUMN[key] ?? 0] ?? 0), 0),
    })),
    ranking: ranking.slice(0, 10),
    me: ranking.find((entry) => entry.login === ME.login) ?? null,
  }
}

/**
 * Los logros de los cursos de quien mira en la demo: shell con dos
 * certificados de tres, git empezado con su primera prueba de grupo y Docker
 * recién estrenado.
 */
const MINE: Record<CourseAchievementId, [progress: number, goal: number]> = {
  shell_first: [1, 1],
  shell_beginner: [14, 14],
  shell_intermediate: [16, 16],
  shell_advanced: [6, 15],
  shell_bosses: [5, 9],
  git_first: [1, 1],
  git_group: [1, 3],
  git_boss: [0, 1],
  git_bosses: [2, 7],
  docker_first: [1, 1],
  docker_beginner: [3, 14],
  docker_intermediate: [0, 14],
  docker_advanced: [0, 14],
  docker_bosses: [0, 9],
  k8s_first: [0, 1],
  k8s_beginner: [0, 14],
  k8s_intermediate: [0, 14],
  k8s_advanced: [0, 14],
  k8s_bosses: [0, 9],
  net_first: [1, 1],
  net_beginner: [6, 18],
  net_intermediate: [0, 16],
  net_advanced: [0, 13],
  net_bosses: [1, 12],
  rag_first: [1, 1],
  rag_beginner: [2, 16],
  rag_intermediate: [0, 14],
  rag_advanced: [0, 15],
  rag_bosses: [0, 12],
  courses_explorer: [3, 4],
  courses_all: [0, 4],
  courses_order: [0, 4],
}

/**
 * Los logros de los cursos de alguien de la demo. Los de quien mira, fijos;
 * los de los demás salen de su login (siempre los mismos).
 */
export function mockCourseAchievements(seed: number | null = null) {
  return (Object.keys(MINE) as CourseAchievementId[]).map((id) => {
    const [mine, goal] = MINE[id]
    const progress = seed === null ? mine : (seed * (id.length + 3)) % (goal + 1)

    return {
      id,
      goal,
      progress: Math.min(progress, goal),
      unlocked: progress >= goal,
      xp: mockCourseXp(id),
    }
  })
}

/**
 * La XP de cada logro, como `COURSE_XP` de la API (`xp.rules.ts`), sacada del
 * final de su id: el primer punto da poco; un certificado, más cuanto más
 * alto; terminar los cuatro, lo que más.
 */
export function mockCourseXp(id: CourseAchievementId): number {
  const bySuffix: Record<string, number> = {
    first: 10,
    beginner: 25,
    intermediate: 40,
    advanced: 60,
    bosses: 50,
    group: 40,
    boss: 60,
    explorer: 20,
    all: 100,
    order: 50,
  }

  return bySuffix[id.slice(id.lastIndexOf('_') + 1)] ?? 0
}

/**
 * Da por conseguido un logro de quien mira, como si acabara de superar lo que
 * pide. `false` si ya lo tenía.
 */
export function unlockMockAchievement(id: CourseAchievementId): boolean {
  const [progress, goal] = MINE[id]

  if (progress >= goal) return false
  MINE[id] = [goal, goal]

  return true
}

export const coursesMock: Pick<Api, 'getCourseRanking'> = {
  async getCourseRanking(period): Promise<CourseRanking> {
    await delay(300)

    const times = period === 'all' ? 3 : 1

    return {
      period,
      boards: (Object.keys(BOARDS) as CourseBoardId[]).map((id) => boardOf(id, times)),
    }
  },
}
