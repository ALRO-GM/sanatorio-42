/**
 * API de mentira: exámenes. Un examen en marcha desde hace media hora, con
 * gente de los dos planes, y estadísticas de dos exámenes y de los círculos.
 */

import type { Api } from '../types'
import { delay } from './state'
import { portrait } from './portrait'

const at = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString()

const person = (
  login: string,
  track: 'classic' | 'next',
  circle: number | null,
  mark: number | null,
) => ({ login, image: portrait(login), track, circle, mark, passed: mark !== null && mark >= 100 })

export const examsMock: Pick<Api, 'getExamStats' | 'getLiveExam'> = {
  async getLiveExam() {
    await delay(120)

    return {
      exam: { id: 710, name: 'Exam Session', location: 'c3', beginAt: at(-30), endAt: at(150) },
      running: true,
      groups: [
        {
          projectId: 1320,
          name: 'Exam Rank 02',
          people: [
            person('jdoe', 'classic', 1, 100),
            person('anavarro', 'next', 1, 75),
            person('llorente', 'classic', 1, 0),
          ],
        },
        {
          projectId: 1321,
          name: 'Exam Rank 03',
          people: [person('mgarcia', 'next', 2, 100), person('rsoto', 'classic', 2, 40)],
        },
        { projectId: null, name: null, people: [person('cfernandez', 'classic', 3, null)] },
      ],
      updatedAt: at(-3),
    }
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
