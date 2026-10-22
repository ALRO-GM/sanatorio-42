/**
 * API de mentira: exámenes. Un examen en marcha desde hace media hora, con
 * gente de los dos planes apuntada al examen de su círculo (quien aprueba,
 * quien suspende, quien sigue dentro y quien aún no ha entrado), y
 * estadísticas de dos exámenes y de los círculos.
 *
 * El reloj de refrescos es el de la API de verdad: solo cada cinco minutos, y
 * a mano uno por minuto como mucho.
 */

import type { LiveExam, LiveExaminee } from '@sanatorio/contracts'

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
): LiveExaminee => ({ login, image: portrait(login), track, circle, mark, status })

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
          person('llorente', 'classic', 2, 50, 'failed'),
          person('pvidal', 'classic', 2, 25, 'inProgress'),
          person('tmolina', 'classic', 2, null, 'pending'),
        ],
      },
      {
        projectId: 1420,
        name: 'Exam Rank 02 · 42next',
        people: [
          person('anavarro', 'next', 2, 75, 'inProgress'),
          person('bcastro', 'next', 2, null, 'pending'),
        ],
      },
      {
        projectId: 1321,
        name: 'Exam Rank 03',
        people: [
          person('mgarcia', 'classic', 3, 100, 'passed'),
          person('rsoto', 'classic', 3, 0, 'failed'),
          person('cfernandez', 'classic', 3, null, 'pending'),
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

  async getExamStats() {
    await delay(150)

    return {
      exams: [
        {
          projectId: 1320,
          name: 'Exam Rank 02',
          people: 214,
          passed: 188,
          avgAttempts: 1.8,
          attemptsToPass: [92, 54, 25, 11, 6],
          byAttempt: [
            { attempt: 1, people: 214, avgMark: 58, passRate: 0.43 },
            { attempt: 2, people: 118, avgMark: 66, passRate: 0.46 },
            { attempt: 3, people: 61, avgMark: 71, passRate: 0.41 },
          ],
        },
        {
          projectId: 1321,
          name: 'Exam Rank 03',
          people: 140,
          passed: 97,
          avgAttempts: 2.4,
          attemptsToPass: [31, 28, 19, 12, 7],
          byAttempt: [
            { attempt: 1, people: 140, avgMark: 41, passRate: 0.22 },
            { attempt: 2, people: 104, avgMark: 52, passRate: 0.27 },
          ],
        },
      ],
      circles: [
        { circle: 0, people: 61, median: 34, p25: 22, p75: 48 },
        { circle: 1, people: 52, median: 51, p25: 37, p75: 70 },
        { circle: 2, people: 38, median: 74, p25: 55, p75: 96 },
      ],
      backfill: { done: 4, total: 6 },
    }
  },
}
