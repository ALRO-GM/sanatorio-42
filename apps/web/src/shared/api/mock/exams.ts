/**
 * API de mentira: exámenes. Un examen en marcha desde hace media hora, con
 * gente de los dos planes apuntada al examen de su círculo (quien aprueba,
 * quien suspende, quien sigue dentro y quien aún no ha entrado), y
 * estadísticas de los exámenes de C y de Nexus, de los círculos y del black
 * hole, que cambian con el plan y las kickoffs elegidas (se reparten a escala;
 * los logins son inventados).
 *
 * El reloj de refrescos es el de la API de verdad: solo cada cinco minutos, y
 * a mano uno por minuto como mucho.
 */

import type {
  ExamKickoff,
  ExamQuery,
  ExamStat,
  ExamStats,
  LiveExam,
  LiveExaminee,
} from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay } from './state'
import { portrait } from './portrait'

const MINUTE = 60_000
/** Lo que dura el examen de mentira; cuando acaba, empieza otro. */
const EXAM_MS = 3 * 60 * MINUTE
const AUTO_MS = 5 * MINUTE
const MANUAL_MS = MINUTE

/** Cuándo empezó el examen y cuándo se refrescó por última vez. Se fijan al primer vistazo. */
let begin: number | null = null
let refreshedAt = 0

const iso = (at: number): string => new Date(at).toISOString()

const person = (
  login: string,
  track: LiveExaminee['track'],
  circle: number,
  mark: number | null,
  status: LiveExaminee['status'],
  bestMark: number | null = mark,
): LiveExaminee => ({ login, image: portrait(login), track, circle, mark, bestMark, status })

/** Las kickoffs del campus inventado: las grandes y alguna suelta. */
const KICKOFFS: ExamKickoff[] = [
  { month: '2026-09', classic: 0, next: 74 },
  { month: '2026-03', classic: 8, next: 61 },
  { month: '2025-10', classic: 58, next: 22 },
  { month: '2025-03', classic: 64, next: 0 },
  { month: '2024-10', classic: 71, next: 0 },
  { month: '2024-06', classic: 3, next: 0 },
  { month: '2024-03', classic: 55, next: 0 },
]

/** Cada examen con la gente que lo intentaría si se eligiera a todo el campus. */
const EXAMS: Pick<ExamStat, 'projectId' | 'name' | 'family' | 'rank' | 'people'>[] = [
  { projectId: 1320, name: 'Exam Rank 02', family: 'classic', rank: 2, people: 236 },
  { projectId: 1321, name: 'Exam Rank 03', family: 'classic', rank: 3, people: 171 },
  { projectId: 1322, name: 'Exam Rank 04', family: 'classic', rank: 4, people: 118 },
  { projectId: 1323, name: 'Exam Rank 05', family: 'classic', rank: 5, people: 76 },
  { projectId: 1324, name: 'Exam Rank 06', family: 'classic', rank: 6, people: 41 },
  { projectId: 2320, name: 'Exam Rank 02 · 42next', family: 'next', rank: 2, people: 121 },
  { projectId: 2321, name: 'Exam Rank 03 · 42next', family: 'next', rank: 3, people: 64 },
  { projectId: 2322, name: 'Exam Rank 04 · 42next', family: 'next', rank: 4, people: 19 },
]

/** Qué parte aprueba a cada intento: los de rango alto cuestan más. */
const passShare = (rank: number, attempt: number): number =>
  Math.max(0.12, 0.55 - rank * 0.05 + attempt * 0.04)

/** Lo que hay ahora; con `manual`, como si alguien pulsara el botón. */
function liveNow(manual: boolean): LiveExam {
  const now = Date.now()

  if (begin === null || now - begin >= EXAM_MS) {
    begin = now - 30 * MINUTE
    // Se refrescó hace tres minutos: el botón ya se puede pulsar.
    refreshedAt = now - 3 * MINUTE
  }

  const since = now - refreshedAt

  if (since >= AUTO_MS || (manual && since >= MANUAL_MS)) refreshedAt = now

  return {
    exam: {
      id: 710,
      name: 'Exam Session',
      location: 'c3',
      beginAt: iso(begin),
      endAt: iso(begin + EXAM_MS),
      when: 'today',
    },
    running: true,
    groups: [
      {
        projectId: 1320,
        name: 'Exam Rank 02',
        people: [
          person('jdoe', 'classic', 2, 100, 'passed'),
          person('llorente', 'classic', 2, 50, 'failed', 75),
          person('pvidal', 'classic', 2, null, 'inProgress', 50),
        ],
      },
      {
        projectId: 1420,
        name: 'Exam Rank 02 · 42next',
        people: [person('anavarro', 'next', 2, null, 'inProgress')],
      },
      {
        projectId: 1321,
        name: 'Exam Rank 03',
        people: [
          person('mgarcia', 'classic', 3, 100, 'passed'),
          person('cfernandez', 'classic', 3, null, 'inProgress', 25),
          person('rsoto', 'classic', 3, 0, 'failed', 25),
        ],
      },
    ],
    updatedAt: iso(refreshedAt),
    nextRefreshAt: iso(refreshedAt + AUTO_MS),
    refreshableAt: iso(refreshedAt + MANUAL_MS),
  }
}

export const examsMock: Pick<Api, 'getExamStats' | 'getLiveExam' | 'refreshLiveExam'> = {
  async getLiveExam() {
    await delay(120)

    return liveNow(false)
  },

  async refreshLiveExam() {
    await delay(120)

    return liveNow(true)
  },

  async getExamStats(query: ExamQuery): Promise<ExamStats> {
    await delay(150)

    const chosen = KICKOFFS.filter(
      (kickoff) => query.kickoffs.length === 0 || query.kickoffs.includes(kickoff.month),
    )
    const count = (list: readonly ExamKickoff[], family: 'classic' | 'next'): number =>
      query.track !== 'all' && query.track !== family
        ? 0
        : list.reduce((sum, kickoff) => sum + kickoff[family], 0)
    const total = { classic: count(KICKOFFS, 'classic'), next: count(KICKOFFS, 'next') }
    const share = (list: readonly ExamKickoff[], family: 'classic' | 'next'): number =>
      total[family] === 0 ? 0 : count(list, family) / total[family]
    const people = count(chosen, 'classic') + count(chosen, 'next')

    const exams = EXAMS.flatMap((base): ExamStat[] => {
      const tried = Math.round(base.people * share(chosen, base.family))

      if (tried === 0) return []

      // Se reparte quién aprueba a cada intento, sin tope: hasta 9 intentos.
      const rank = base.rank ?? 2
      const attemptsToPass: number[] = []
      const byAttempt: ExamStat['byAttempt'] = []
      let left = tried

      for (let attempt = 1; attempt <= 9 && left > 0; attempt++) {
        const passed = Math.round(left * passShare(rank, attempt))

        byAttempt.push({
          attempt,
          people: left,
          // Las notas van a saltos de pregunta: la mediana cae en uno de ellos.
          medianMark: Math.min(100, 25 * Math.floor((attempt + 3 - rank / 2) / 2)),
          passRate: left === 0 ? 0 : passed / left,
        })
        attemptsToPass.push(passed)
        left -= passed
      }

      const passed = attemptsToPass.reduce((sum, value) => sum + value, 0)
      const weighted = attemptsToPass.reduce((sum, value, index) => sum + value * (index + 1), 0)

      return [
        {
          ...base,
          people: tried,
          passed,
          avgAttempts: passed === 0 ? null : weighted / passed,
          attemptsToPass,
          byAttempt,
        },
      ]
    })

    const scale = (value: number): number => Math.round(value * (people / 336))

    return {
      exams,
      circles:
        people === 0
          ? []
          : [
              { circle: 0, people: scale(61), median: 34, p25: 22, p75: 48 },
              { circle: 1, people: scale(52), median: 51, p25: 37, p75: 70 },
              { circle: 2, people: scale(38), median: 74, p25: 55, p75: 96 },
            ],
      backfill: { done: 4, total: 6 },
      query,
      people,
      kickoffs: KICKOFFS,
    }
  },
}
