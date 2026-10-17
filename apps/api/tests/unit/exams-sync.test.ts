/**
 * Exámenes: los intentos se guardan al copiar las filas de los exámenes, la
 * copia de fondo completa lo antiguo y las estadísticas salen de ahí.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { actor, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'
import { projectUser } from '../helpers/fixtures.js'

const EXAM = { projectId: 1320, projectName: 'Exam Rank 02', slug: 'exam-rank-02' }

describe('exámenes', () => {
  const community = useCommunity()
  let services: Community['services']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, api } = community)
  })

  /** Una fila de examen con sus intentos: `[nota, aprobado, fecha]`. */
  const examRow = (login: string, attempts: [number, boolean, string][]) => ({
    ...projectUser(login, {
      ...EXAM,
      status: attempts.some(([, ok]) => ok) ? 'finished' : 'in_progress',
    }),
    occurrence: attempts.length - 1,
    teams: attempts.map(([mark, ok, at], index) => ({
      id: Number(`9${login.length}${index}${mark}`),
      final_mark: mark,
      'validated?': ok,
      closed_at: at,
    })),
  })

  it('guarda los intentos al copiar y saca de ahí las estadísticas', async () => {
    const { replica } = services.repositories

    await replica.ingestProjectUsers(
      [
        examRow('ana', [
          [0, false, '2026-01-01T10:00:00Z'],
          [100, true, '2026-02-01T10:00:00Z'],
        ]),
        examRow('leo', [[100, true, '2026-01-01T10:00:00Z']]),
      ],
      MADRID,
    )

    const stats = await services.exams.stats(actor('eva'))
    const exam = stats.exams.find((one) => one.name === 'Exam Rank 02')

    expect(exam).toMatchObject({ people: 2, passed: 2, avgAttempts: 1.5 })
    expect(exam?.attemptsToPass).toEqual([1, 1, 0, 0, 0])
    expect(exam?.byAttempt[0]).toMatchObject({ attempt: 1, people: 2, avgMark: 50 })
  })

  it('la copia de fondo baja los intentos antiguos página a página, y para al acabar', async () => {
    const { replica } = services.repositories

    // El examen ya se conoce (alguien lo tiene), pero sin sus intentos.
    await replica.ingestProjectUsers([projectUser('sol', { ...EXAM })], MADRID)
    api.rows.set(MADRID, [
      examRow('ana', [[100, true, '2026-01-01T10:00:00Z']]),
      examRow('leo', [[0, false, '2026-01-01T10:00:00Z']]),
      examRow('eva', [[100, true, '2026-01-02T10:00:00Z']]),
    ])

    // De dos en dos: dos páginas y ya.
    expect(await services.examsSync.step()).toBe(true)
    expect(await services.examsSync.progress()).toEqual({ done: 0, total: 1 })
    expect(await services.examsSync.step()).toBe(true)
    expect(await services.examsSync.progress()).toEqual({ done: 1, total: 1 })
    expect(await services.examsSync.step()).toBe(false)

    const exam = (await services.exams.stats(actor('eva'))).exams[0]

    expect(exam).toMatchObject({ name: 'Exam Rank 02', passed: 2 })
    expect(api.calls.filter((call) => call.includes('filter[project_id]=1320'))).toHaveLength(2)
    api.calls.length = 0
  })
})
