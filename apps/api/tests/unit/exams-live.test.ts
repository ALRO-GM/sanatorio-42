/**
 * El examen en vivo: el día contado en la hora del campus, quién sale (y con
 * qué examen), cuándo suspende y el reloj de refrescos, que es uno para todo
 * el campus.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import type { ApiExamUser, ApiProjectUser } from '../../src/integrations/forty-two/types.js'
import { createExamsLive } from '../../src/modules/exams/exams.live.js'
import { createExamsRepository } from '../../src/modules/exams/exams.repository.js'
import {
  LIVE_AUTO_MS,
  LIVE_MANUAL_MS,
  currentMark,
  examDay,
  examineeStatus,
  expectedExamSlug,
  liveRefreshPlan,
} from '../../src/modules/exams/exams.rules.js'
import { COMMON_CORE } from '../../src/modules/replica/common-core.js'
import { createReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import { actor, MADRID, MINUTE } from '../helpers/community.js'
import { projectUser } from '../helpers/fixtures.js'

const MADRID_ZONE = 'Europe/Madrid'

describe('el día del examen, en la hora del campus', () => {
  it('a las 23:30 de Madrid, un examen a las 00:30 es mañana aunque en UTC sea el mismo día', () => {
    // 22 de octubre, 21:30 UTC = 23:30 en Madrid (verano, UTC+2).
    const night = Date.parse('2026-10-22T21:30:00Z')

    expect(examDay('2026-10-22T22:30:00Z', night, MADRID_ZONE)).toBe('tomorrow')
    // En UTC los dos son el 22: el fallo de antes.
    expect(examDay('2026-10-22T22:30:00Z', night, 'UTC')).toBe('today')
  })

  it('pasada la medianoche de Madrid, el examen de las 9:00 ya es hoy', () => {
    // 22 de octubre, 22:30 UTC = 00:30 del 23 en Madrid.
    const afterMidnight = Date.parse('2026-10-22T22:30:00Z')

    expect(examDay('2026-10-23T07:00:00Z', afterMidnight, MADRID_ZONE)).toBe('today')
    expect(examDay('2026-10-23T07:00:00Z', afterMidnight, 'UTC')).toBe('tomorrow')
  })

  it('justo en la medianoche, y con el cambio de hora de por medio', () => {
    // 00:00 del 23 en Madrid: lo de las 23:59 del 22 ya fue ayer (y sigue en marcha: hoy).
    const midnight = Date.parse('2026-10-22T22:00:00Z')

    expect(examDay('2026-10-22T21:59:00Z', midnight, MADRID_ZONE)).toBe('today')
    expect(examDay('2026-10-22T22:00:00Z', midnight, MADRID_ZONE)).toBe('today')
    // La noche del 24 al 25 se atrasa la hora: el 25 a las 9:00 (UTC+1) es pasado mañana.
    expect(examDay('2026-10-25T08:00:00Z', midnight, MADRID_ZONE)).toBe('later')
    expect(examDay('2026-10-24T07:00:00Z', midnight, MADRID_ZONE)).toBe('tomorrow')
  })

  it('una zona desconocida o que no existe cuenta en UTC, sin romperse', () => {
    const at = Date.parse('2026-10-22T10:00:00Z')

    expect(examDay('2026-10-23T10:00:00Z', at, undefined)).toBe('tomorrow')
    expect(examDay('2026-10-23T10:00:00Z', at, 'Marte/Olympus')).toBe('tomorrow')
  })
})

describe('el reloj de refrescos', () => {
  const start = Date.parse('2026-10-22T08:00:00Z')

  it('sin refresco previo, todo vale ya', () => {
    expect(liveRefreshPlan(null, start)).toEqual({
      auto: true,
      manual: true,
      nextAt: start,
      manualAt: start,
    })
  })

  it('solo vuelve cada cinco minutos; a mano, pasado un minuto', () => {
    expect(liveRefreshPlan(start, start + LIVE_MANUAL_MS - 1)).toMatchObject({
      auto: false,
      manual: false,
    })
    expect(liveRefreshPlan(start, start + LIVE_MANUAL_MS)).toMatchObject({
      auto: false,
      manual: true,
    })
    expect(liveRefreshPlan(start, start + LIVE_AUTO_MS - 1).auto).toBe(false)
    expect(liveRefreshPlan(start, start + LIVE_AUTO_MS)).toMatchObject({
      auto: true,
      nextAt: start + 5 * MINUTE,
      manualAt: start + MINUTE,
    })
  })
})

describe('el examen que toca por el círculo', () => {
  it('el del círculo N es el Exam Rank 0N, con la marca del plan nuevo si es de Python', () => {
    expect(expectedExamSlug('classic', 2)).toBe('exam-rank-02')
    expect(expectedExamSlug('next', 3)).toBe('42next-exam-rank-03')
    expect(expectedExamSlug('classic', 6)).toBe('exam-rank-06')
  })

  it('coincide con el common core: cada examen está en su círculo', () => {
    for (const [circle, projects] of COMMON_CORE.entries()) {
      const exam = projects.find((project) => project.key.startsWith('exam-rank-'))

      if (exam === undefined) {
        expect(circle).toBeLessThan(2)
        continue
      }

      expect(exam.slugs).toEqual([
        expectedExamSlug('classic', circle),
        expectedExamSlug('next', circle),
      ])
    }
  })

  it('antes del círculo 2, sin círculo o pasado el último, lo que se puede', () => {
    expect(expectedExamSlug('classic', null)).toBeNull()
    expect(expectedExamSlug('classic', 0)).toBeNull()
    expect(expectedExamSlug('next', 1)).toBeNull()
    expect(expectedExamSlug('classic', 99)).toBe('exam-rank-06')
  })
})

describe('cómo va cada cual', () => {
  const since = '2026-10-22T07:00:00Z'
  const row = (status: string, finalMark: number | null, validated: boolean | null) => ({
    status,
    finalMark,
    validated,
    updatedAt: '2026-10-22T08:30:00Z',
  })

  it('cerrado sin llegar a 100 es un suspenso, aunque la sesión no haya acabado', () => {
    expect(examineeStatus(row('finished', 75, false), undefined, since)).toBe('failed')
    expect(examineeStatus(row('finished', 0, null), undefined, since)).toBe('failed')
    expect(examineeStatus(row('finished', null, null), undefined, since)).toBe('failed')
    // Con 100 pero sin validar, tampoco.
    expect(examineeStatus(row('finished', 100, false), undefined, since)).toBe('failed')
  })

  it('cerrado con 100 o más aprueba; abierto sigue en marcha, aunque lleve nota', () => {
    expect(examineeStatus(row('finished', 100, true), undefined, since)).toBe('passed')
    expect(examineeStatus(row('finished', 125, null), undefined, since)).toBe('passed')
    expect(examineeStatus(row('in_progress', 75, null), undefined, since)).toBe('inProgress')
    expect(examineeStatus(undefined, { mark: null, passed: false }, since)).toBe('inProgress')
  })

  it('una fila cerrada de otro día no cuenta: aún no ha empezado', () => {
    const old = { ...row('finished', 40, false), updatedAt: '2026-10-15T10:00:00Z' }

    expect(examineeStatus(old, undefined, since)).toBe('pending')
    expect(examineeStatus({ ...old, updatedAt: null }, undefined, since)).toBe('pending')
    expect(examineeStatus(undefined, undefined, since)).toBe('pending')
  })
})

describe('el examen en vivo', () => {
  /** Jueves 22 de octubre: el examen va de las 9:00 a las 12:00 de Madrid. */
  const BEGIN = '2026-10-22T07:00:00.000Z'
  const END = '2026-10-22T10:00:00.000Z'
  const NOW = Date.parse('2026-10-22T08:00:00.000Z')
  const EXAM = { id: 710, name: 'Exam Session', location: 'c3', beginAt: BEGIN, endAt: END }
  const RANK_02 = { projectId: 1320, projectName: 'Exam Rank 02', slug: 'exam-rank-02' }
  const RANK_03 = { projectId: 1321, projectName: 'Exam Rank 03', slug: 'exam-rank-03' }
  const NEXT_03 = { projectId: 1400, projectName: 'Exam Rank 03', slug: '42next-exam-rank-03' }

  let db: Db
  let clock: number
  let examUsers: ApiExamUser[] | Error
  let calls: { users: number; pages: number[]; teams: number[][] }
  let quotaOk: boolean
  /** El círculo y el plan de cada cual, como los diría el plan de estudios. */
  const places = new Map<string, { circle: number | null; track: 'classic' | 'next' }>([
    ['ana', { circle: 2, track: 'classic' }],
    ['leo', { circle: 3, track: 'classic' }],
    ['eva', { circle: 3, track: 'next' }],
    ['mia', { circle: 2, track: 'classic' }],
  ])

  const examUser = (login: string, id: number): ApiExamUser => ({
    id,
    user: { id, login, image: { link: `https://cdn.intra/${login}.jpg` } },
  })

  function build(events = [{ source: 'exam' as const, ...EXAM }]) {
    const replica = createReplicaRepository(db)

    return createExamsLive({
      db,
      client: {
        getExamUsers: () => {
          calls.users += 1

          return examUsers instanceof Error ? Promise.reject(examUsers) : Promise.resolve(examUsers)
        },
        getCampusProjectUsersPage: (query) => {
          calls.pages.push(query.projectId ?? 0)

          return Promise.resolve({ items: [] as ApiProjectUser[], perPage: 100, total: 0 })
        },
        // El equipo de `mia`, que sigue dentro: dos ejercicios corregidos.
        getTeams: (ids) => {
          calls.teams.push([...ids])

          return Promise.resolve(
            ids.map((id) => ({
              id,
              final_mark: null,
              teams_uploads: [
                { final_mark: 25, created_at: '2026-10-22T07:20:00.000Z' },
                { final_mark: 50, created_at: '2026-10-22T07:45:00.000Z' },
              ],
            })),
          )
        },
      },
      replica,
      agenda: {
        campusEvents: () =>
          Promise.resolve(
            events.map((event) => ({
              ...event,
              description: null,
              kind: null,
              maxPeople: null,
              subscribers: null,
            })),
          ),
      },
      curriculum: {
        placesOf: (logins) =>
          Promise.resolve(
            new Map(
              logins.flatMap((login) => {
                const place = places.get(login)

                return place === undefined ? [] : [[login, place] as const]
              }),
            ),
          ),
      },
      exams: createExamsRepository(db),
      quota: {
        allows: () => quotaOk,
        defer: () => Promise.resolve(quotaOk),
      },
      now: () => clock,
    })
  }

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    clock = NOW
    examUsers = [examUser('ana', 2), examUser('leo', 3)]
    calls = { users: 0, pages: [], teams: [] }
    quotaOk = true

    const replica = createReplicaRepository(db)

    await replica.upsertCampuses([{ id: MADRID, name: 'Madrid', time_zone: MADRID_ZONE }])
    await replica.ingestProjectUsers(
      [
        // `ana` entregó a las 9:30 con 75: cerrado sin 100, suspenso. La nota
        // del proyecto es 90, la de un intento de la semana pasada: no es la de hoy.
        {
          ...projectUser('ana', {
            ...RANK_02,
            status: 'finished',
            finalMark: 90,
            validated: false,
            updatedAt: '2026-10-22T07:30:00.000Z',
          }),
          teams: [
            {
              id: 9001,
              final_mark: 90,
              'validated?': false,
              created_at: '2026-10-15T07:00:00.000Z',
              closed_at: '2026-10-15T10:00:00.000Z',
            },
            {
              id: 9002,
              final_mark: 75,
              'validated?': false,
              created_at: '2026-10-22T07:00:00.000Z',
              closed_at: '2026-10-22T07:30:00.000Z',
            },
          ],
        },
        // `leo` suspendió el 03 la semana pasada: hoy aún no ha empezado.
        projectUser('leo', {
          ...RANK_03,
          status: 'finished',
          finalMark: 40,
          validated: false,
          updatedAt: '2026-10-15T10:00:00.000Z',
        }),
        // `mia` no sale en la lista de 42, pero ya está dentro del examen.
        // `mia` sigue dentro. Su equipo se creó ayer, al apuntarse, y no tiene nota
        // hasta cerrarse; la del proyecto (90) es de otra vez.
        {
          ...projectUser('mia', {
            ...RANK_02,
            status: 'in_progress',
            finalMark: 90,
            updatedAt: '2026-10-22T07:40:00.000Z',
          }),
          teams: [
            {
              id: 9100,
              final_mark: null,
              'validated?': null,
              created_at: '2026-10-21T18:00:00.000Z',
            },
          ],
        },
        // Alguien que hizo el 03 del plan nuevo: así se conoce el proyecto.
        projectUser('zoe', {
          ...NEXT_03,
          status: 'finished',
          updatedAt: '2026-09-01T10:00:00.000Z',
        }),
      ],
      MADRID,
    )
    // `eva` lo tiene en su agenda de 42 (abrió el calendario).
    await db.execute({
      sql: `INSERT INTO agenda_users (login, events, exams, evaluations, fetched_at)
            VALUES ('eva', '[]', '[710]', '[]', ?)`,
      args: [new Date(NOW).toISOString()],
    })
    // `zed` también, pero es de otro campus (Barcelona): no sale.
    await db.execute({
      sql: `INSERT INTO agenda_users (login, events, exams, evaluations, fetched_at)
            VALUES ('zed', '[]', '[710]', '[]', ?)`,
      args: [new Date(NOW).toISOString()],
    })
    await db.execute({
      sql: `INSERT INTO users (id, login, synced_at) VALUES (990, 'zed', ?)`,
      args: [new Date(NOW).toISOString()],
    })
    await db.execute('INSERT INTO campus_members (campus_id, user_id) VALUES (46, 990)')
  })

  afterEach(() => {
    closeDatabase(db)
  })

  const summary = (live: Awaited<ReturnType<ReturnType<typeof build>['live']>>) =>
    live.groups.map((group) => [
      group.name,
      group.people.map((person) => `${person.login}:${person.status}`),
    ])

  it('sale toda la gente apuntada, con el examen que le toca por su círculo', async () => {
    const live = await build().live(actor('eva'))

    expect(live).toMatchObject({
      running: true,
      exam: { id: 710, when: 'today' },
      updatedAt: new Date(NOW).toISOString(),
      nextRefreshAt: new Date(NOW + 5 * MINUTE).toISOString(),
      refreshableAt: new Date(NOW + MINUTE).toISOString(),
    })
    expect(summary(live)).toEqual([
      ['Exam Rank 02', ['ana:failed', 'mia:inProgress']],
      ['Exam Rank 03', ['leo:pending']],
      ['Exam Rank 03 · 42next', ['eva:pending']],
    ])
    // La nota es la del intento de hoy (75), no la mejor del proyecto (90).
    expect(live.groups[0]?.people[0]).toMatchObject({ mark: 75, track: 'classic', circle: 2 })
    // Quien sigue dentro, con la nota de su último ejercicio corregido (50).
    expect(live.groups[0]?.people[1]).toMatchObject({ login: 'mia', mark: 50 })
    // Los equipos abiertos, todos en una petición.
    expect(calls.teams).toEqual([[9100]])
    // Solo se piden las notas de los exámenes que tocan a alguien, uno por petición.
    expect(calls.pages.sort()).toEqual([1320, 1321, 1400])
  })

  it('si 42 no da la lista de apuntados, sale quien se sabe por la agenda y por sus filas', async () => {
    examUsers = new Error('42 dice 500')

    const live = await build().live(actor('eva'))

    expect(summary(live)).toEqual([
      ['Exam Rank 02', ['ana:failed', 'mia:inProgress']],
      ['Exam Rank 03 · 42next', ['eva:pending']],
    ])
    // Y el fallo también cuenta para el reloj: no se insiste en cada visita.
    await build().live(actor('ana'))
    expect(calls.users).toBe(1)
  })

  it('un refresco por minuto para todo el campus, por mucha gente que pulse', async () => {
    const live = build()

    await live.live(actor('ana'))
    expect(calls.users).toBe(1)

    // A los 30 segundos pulsan dos personas a la vez: no se pide nada.
    clock += 30_000
    const [first, second] = await Promise.all([
      live.refreshNow(actor('leo')),
      live.refreshNow(actor('eva')),
    ])

    expect(calls.users).toBe(1)
    expect(first.refreshableAt).toBe(new Date(NOW + MINUTE).toISOString())
    expect(second.updatedAt).toBe(new Date(NOW).toISOString())

    // Pasado el minuto, pulsan tres a la vez: un solo refresco.
    clock = NOW + MINUTE
    await Promise.all(['ana', 'leo', 'eva'].map((login) => live.refreshNow(actor(login))))
    expect(calls.users).toBe(2)

    // El reloj se guarda en la base: tras un reinicio sigue valiendo.
    clock += 10_000
    await build().refreshNow(actor('ana'))
    expect(calls.users).toBe(2)
  })

  it('solo cada cinco minutos: las visitas no refrescan antes, y el reloj de fondo tampoco', async () => {
    const live = build()

    await live.live(actor('ana'))
    clock = NOW + 4 * MINUTE
    await live.live(actor('leo'))
    await live.tick([MADRID])
    expect(calls.users).toBe(1)

    // A los cinco minutos, el reloj de fondo refresca aunque nadie mire.
    clock = NOW + 5 * MINUTE
    await live.tick([MADRID])
    expect(calls.users).toBe(2)

    const after = await live.live(actor('ana'))

    expect(calls.users).toBe(2)
    expect(after.nextRefreshAt).toBe(new Date(NOW + 10 * MINUTE).toISOString())
  })

  it('sin cuota no se pide nada, y se enseña lo que hay', async () => {
    quotaOk = false

    const live = await build().live(actor('ana'))

    expect(calls).toEqual({ users: 0, pages: [], teams: [] })
    expect(live.updatedAt).toBeNull()
    // Quien ya está dentro sale igual.
    expect(summary(live)[0]).toEqual(['Exam Rank 02', ['ana:failed', 'mia:inProgress']])
  })

  it('el siguiente examen dice si es hoy o mañana en Madrid, y no se refresca', async () => {
    // Miércoles 21, 23:30 en Madrid: el examen del jueves a las 9:00 es mañana.
    clock = Date.parse('2026-10-21T21:30:00.000Z')

    const live = await build().live(actor('ana'))

    expect(live).toMatchObject({
      running: false,
      exam: { id: 710, when: 'tomorrow' },
      nextRefreshAt: null,
      refreshableAt: null,
    })
    expect(calls.users).toBe(0)
    await build().refreshNow(actor('ana'))
    expect(calls.users).toBe(0)
  })

  it('sin examen no hay nada que enseñar', async () => {
    expect(await build([]).live(actor('ana'))).toEqual({
      exam: null,
      running: false,
      groups: [],
      updatedAt: null,
      nextRefreshAt: null,
      refreshableAt: null,
    })
  })
})

describe('nota de un examen sin cerrar', () => {
  it('es la del último ejercicio corregido; sin ninguno con nota, no hay', () => {
    expect(
      currentMark([
        { final_mark: 50, created_at: '2026-10-22T07:45:00Z' },
        { final_mark: 25, created_at: '2026-10-22T07:20:00Z' },
        { final_mark: null, created_at: '2026-10-22T07:50:00Z' },
      ]),
    ).toBe(50)
    expect(currentMark([{ final_mark: 0, created_at: '2026-10-22T07:20:00Z' }])).toBe(0)
    expect(currentMark([{ final_mark: 75, created_at: null }])).toBeNull()
    expect(currentMark([])).toBeNull()
  })
})
