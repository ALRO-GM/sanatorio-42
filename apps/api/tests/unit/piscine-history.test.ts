/**
 * El historial de las piscinas de Madrid (`replica/piscine-history.ts`): quién
 * hizo cada una de las últimas, sus sesiones en los puestos, sus correcciones,
 * sus exámenes y lo aprobado, por tramos y siguiendo donde lo dejó.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { toText } from '../../src/core/db/rows.js'
import type {
  ApiCursusMember,
  ApiLocation,
  ApiProjectUser,
  ApiScaleTeam,
} from '../../src/integrations/forty-two/types.js'
import type { QuotaGate } from '../../src/modules/replica/index.js'
import { createPiscineHistory, poolStartsOf } from '../../src/modules/replica/piscine-history.js'

const MADRID = 22
const DAY = 24 * 60 * 60_000
const NOW = Date.parse('2026-11-06T12:00:00.000Z')
/** Dos piscinas: la de octubre (en curso) y la de septiembre. */
const OCTOBER = Date.parse('2026-10-05T07:00:00.000Z')
const SEPTEMBER = Date.parse('2026-09-07T07:00:00.000Z')

const iso = (ms: number) => new Date(ms).toISOString()
const page = <T>(items: readonly T[], number: number, size = 25) => ({
  items: items.slice((number - 1) * size, number * size),
  perPage: size,
  total: items.length,
})

describe('las piscinas de una lista de inicios', () => {
  it('los días con 20 o más empezando, las 10 últimas, sin las que no han empezado', () => {
    const day = (n: number) => Array.from({ length: 20 }, () => SEPTEMBER + n * 30 * DAY)
    const begins = [
      ...Array.from({ length: 12 }, (_, n) => day(-n)).flat(),
      // Quien repite un día suelto no es una piscina.
      ...Array.from({ length: 3 }, () => SEPTEMBER + 3 * DAY),
      // La que empieza el mes que viene, tampoco todavía.
      ...Array.from({ length: 25 }, () => NOW + 10 * DAY),
    ]
    const starts = poolStartsOf(begins, NOW)

    expect(starts).toHaveLength(10)
    expect(starts[0]).toBe(SEPTEMBER)
    expect(starts).toEqual([...starts].sort((a, b) => b - a))
  })
})

describe('historial de piscinas', () => {
  let db: Db
  let allowed: boolean
  let calls: string[]

  const people = (start: number, prefix: string, from: number): ApiCursusMember[] =>
    Array.from({ length: 20 }, (_, n) => ({
      id: from + n,
      begin_at: iso(start),
      user: { id: from + n, login: `${prefix}${String(n)}`, image: null },
    }))
  const members = [...people(OCTOBER, 'oct', 100), ...people(SEPTEMBER, 'sep', 200)]
  const locations: ApiLocation[] = [
    // De septiembre: una sesión de «sep0» y otra de un alumno, que no se guarda.
    {
      id: 1,
      host: 'c1r1s1',
      begin_at: iso(SEPTEMBER + 2 * 3_600_000),
      end_at: iso(SEPTEMBER + 6 * 3_600_000),
      user: { id: 200, login: 'sep0' },
    },
    {
      id: 2,
      host: 'c1r1s2',
      begin_at: iso(SEPTEMBER + 2 * 3_600_000),
      end_at: iso(SEPTEMBER + 6 * 3_600_000),
      user: { id: 9999, login: 'alumno' },
    },
    // De octubre: una de «oct3» y otra aún abierta, que no se guarda.
    {
      id: 3,
      host: 'c1r1s3',
      begin_at: iso(OCTOBER + DAY),
      end_at: iso(OCTOBER + DAY + 3_600_000),
      user: { id: 103, login: 'oct3' },
    },
    {
      id: 4,
      host: 'c1r1s4',
      begin_at: iso(OCTOBER + 2 * DAY),
      end_at: null,
      user: { id: 104, login: 'oct4' },
    },
  ]
  const corrections: ApiScaleTeam[] = [
    {
      id: 77,
      begin_at: iso(SEPTEMBER + 3 * DAY),
      corrector: { id: 201, login: 'sep1' },
      correcteds: [{ id: 202, login: 'sep2' }],
    },
  ]
  const results: ApiProjectUser[] = [
    {
      id: 1,
      status: 'finished',
      'validated?': true,
      updated_at: iso(SEPTEMBER + 20 * DAY),
      project: { id: 500, slug: 'c-piscine-shell-00' },
      teams: [
        {
          id: 1,
          'validated?': true,
          closed_at: iso(SEPTEMBER + DAY),
          updated_at: iso(SEPTEMBER + DAY),
        },
      ],
      user: { id: 200, login: 'sep0' },
    },
    {
      id: 2,
      status: 'in_progress',
      'validated?': null,
      project: { id: 600, slug: 'c-piscine-exam-00' },
      teams: [{ id: 55, 'locked?': true, updated_at: iso(SEPTEMBER + 4 * DAY + 3_600_000) }],
      user: { id: 201, login: 'sep1' },
    },
  ]

  const build = () =>
    createPiscineHistory({
      db,
      client: {
        getPiscinePage: (query) => {
          calls.push('members')

          return Promise.resolve(page(members, query.page))
        },
        getLocationsHistoryPage: (query) => {
          calls.push(`locations ${query.from.slice(0, 10)}`)

          return Promise.resolve(
            page(
              locations.filter(
                (item) => (item.begin_at ?? '') >= query.from && (item.begin_at ?? '') <= query.to,
              ),
              query.page,
            ),
          )
        },
        getCampusScaleTeamsPage: (query) => {
          calls.push('corrections')

          return Promise.resolve(
            page(
              corrections.filter(
                (team) =>
                  team.begin_at >= (query.updatedFrom ?? '') &&
                  team.begin_at <= (query.updatedTo ?? ''),
              ),
              query.page ?? 1,
            ),
          )
        },
        getCampusProjectUsersPage: (query) => {
          calls.push(`results ${String(query.projectId)}`)

          return Promise.resolve(
            page(
              results.filter((row) => row.project?.id === query.projectId),
              query.page ?? 1,
            ),
          )
        },
      },
      campusIds: [MADRID],
      quota: { allowsBulk: () => allowed } as unknown as QuotaGate,
      hourlyReserve: 300,
      now: () => NOW,
    })

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    allowed = true
    calls = []
    await db.batch(
      [
        `INSERT INTO projects (id, name, slug) VALUES (500, 'Shell 00', 'c-piscine-shell-00')`,
        `INSERT INTO projects (id, name, slug) VALUES (600, 'Exam 00', 'c-piscine-exam-00')`,
      ].map((sql) => ({ sql })),
      'write',
    )
  })

  afterEach(() => {
    closeDatabase(db)
  })

  const rows = async (sql: string) => (await db.execute(sql)).rows

  it('copia a quién la hizo, sus sesiones, correcciones, exámenes y aprobados', async () => {
    await build().step()

    expect(await rows('SELECT COUNT(*) AS n FROM piscine_members')).toEqual([{ n: 40 }])
    // Solo las cerradas y de piscineros.
    expect(
      (await rows('SELECT login FROM piscine_sessions ORDER BY login')).map((row) =>
        toText(row.login),
      ),
    ).toEqual(['oct3', 'sep0'])
    expect(
      (await rows('SELECT login, kind, ref FROM piscine_activity ORDER BY kind, login')).map(
        (row) => `${toText(row.kind)} ${toText(row.login)} ${toText(row.ref)}`,
      ),
    ).toEqual(['exam sep1 55', 'given sep1 77', 'passed sep0 500', 'received sep2 77'])
    // Primero la más nueva.
    expect(calls.indexOf('locations 2026-10-04')).toBeLessThan(
      calls.indexOf('locations 2026-09-06'),
    )
  })

  it('sin cuota no pide nada y sigue después donde lo dejó', async () => {
    allowed = false
    await build().step()
    expect(calls).toEqual([])

    allowed = true
    await build().step()
    calls = []
    // Al día siguiente solo repasa lo reciente: nada que ya esté copiado.
    await build().step()
    expect(calls).toEqual([])
  })
})
