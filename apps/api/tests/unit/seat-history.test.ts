/**
 * El historial de asientos de 42 hacia atrás (`replica/seat-history.ts`): mes a
 * mes, solo alumnos del 42cursus desde que empezaron (nada de la piscina), sin
 * pisar lo que apuntó la copia de puestos y siguiendo donde lo dejó.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { toText } from '../../src/core/db/rows.js'
import type { ApiLocation } from '../../src/integrations/forty-two/types.js'
import type { QuotaGate } from '../../src/modules/replica/index.js'
import { createSeatHistory } from '../../src/modules/replica/seat-history.js'

const MADRID = 22
const NOW = Date.parse('2026-10-27T12:00:00.000Z')
const DAY = 24 * 60 * 60_000

/** Una sesión cerrada de `hours` horas que empieza `daysAgo` días antes de hoy. */
let nextId = 1
const session = (login: string, daysAgo: number, hours = 2, host = 'c1r1s1'): ApiLocation => {
  const begin = NOW - daysAgo * DAY

  return {
    id: nextId++,
    host,
    begin_at: new Date(begin).toISOString(),
    end_at: new Date(begin + hours * 3_600_000).toISOString(),
    user: { id: login.length * 100 + nextId, login },
  }
}

describe('historial de asientos', () => {
  let db: Db
  let history: ApiLocation[]
  let calls: { from: string; to: string; page: number }[]
  let allowed: boolean

  const build = () =>
    createSeatHistory({
      db,
      client: {
        getLocationsHistoryPage: (query) => {
          calls.push(query)

          const items = history
            .filter(
              (item) => (item.begin_at ?? '') >= query.from && (item.begin_at ?? '') <= query.to,
            )
            .sort((a, b) => (a.begin_at ?? '').localeCompare(b.begin_at ?? ''))

          return Promise.resolve({
            items: items.slice((query.page - 1) * 2, query.page * 2),
            perPage: 2,
            total: items.length,
          })
        },
      },
      campusIds: [MADRID],
      quota: { allowsBulk: () => allowed } as unknown as QuotaGate,
      hourlyReserve: 300,
      now: () => NOW,
    })

  const student = async (login: string, beganDaysAgo: number): Promise<void> => {
    await db.execute({
      sql: `INSERT INTO core_cursus (user_id, login, campus_id, begin_at, updated_at)
            VALUES (?, ?, ?, ?, '')`,
      args: [
        login.length * 1000 + beganDaysAgo,
        login,
        MADRID,
        new Date(NOW - beganDaysAgo * DAY).toISOString(),
      ],
    })
  }

  const saved = async (): Promise<string[]> =>
    (await db.execute('SELECT login, begin_at FROM seat_sessions ORDER BY begin_at')).rows.map(
      (row) => `${toText(row.login)}@${toText(row.begin_at).slice(0, 10)}`,
    )

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    history = []
    calls = []
    allowed = true
    nextId = 1
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('copia hacia atrás mes a mes y solo guarda alumnos desde que empezaron el 42cursus', async () => {
    // ana es alumna desde hace 70 días: su piscina (hace 80) no cuenta.
    await student('ana', 70)
    await student('leo', 100)
    history = [
      session('ana', 5),
      session('ana', 40),
      session('ana', 80),
      session('leo', 3),
      session('leo', 65),
      session('pisci', 4),
      { ...session('leo', 1), end_at: null },
    ]

    await build().step()

    expect((await saved()).sort()).toEqual([
      'ana@2026-09-17',
      'ana@2026-10-22',
      'leo@2026-08-23',
      'leo@2026-10-24',
    ])
    // De hoy hacia atrás, de 30 en 30 días, hasta el primer alumno (hace 100 días).
    expect(calls[0]?.to).toBe(new Date(NOW).toISOString())
    expect(calls.at(-1)?.from).toBe(new Date(NOW - 100 * DAY).toISOString())

    const state = await build().status(MADRID)

    expect(state).toMatchObject({ done: true, kept: 4 })
  })

  it('sin cuota no pide nada y, al volver, sigue donde lo dejó', async () => {
    await student('ana', 200)
    history = Array.from({ length: 7 }, (_, index) => session('ana', 10 + index))
    allowed = false
    await build().step()
    expect(calls).toHaveLength(0)

    allowed = true
    await build().step()
    // Siete sesiones del último mes en páginas de dos (cuatro páginas) y una
    // petición por cada mes vacío hasta el primer alumno (seis más).
    expect(calls).toHaveLength(10)
    expect(await saved()).toHaveLength(7)
  })

  it('una sesión que ya apuntó la copia de puestos se queda, alargada hasta su salida', async () => {
    await student('ana', 30)

    const live = session('ana', 2, 3)

    await db.execute({
      sql: `INSERT INTO seat_sessions
              (location_id, campus_id, user_id, login, host, begin_at, seen_at, first_seen_at)
            VALUES (?, ?, ?, 'ana', 'c1r1s1', ?, ?, ?)`,
      args: [
        live.id,
        MADRID,
        live.user?.id ?? 0,
        live.begin_at ?? '',
        new Date(Date.parse(live.begin_at ?? '') + 3_600_000).toISOString(),
        new Date(Date.parse(live.begin_at ?? '') + 600_000).toISOString(),
      ],
    })
    history = [live]
    await build().step()

    const row = (
      await db.execute({
        sql: 'SELECT seen_at, first_seen_at FROM seat_sessions WHERE location_id = ?',
        args: [live.id],
      })
    ).rows[0]

    expect(row?.seen_at).toBe(live.end_at)
    // Lo que vio la copia de puestos no se cambia.
    expect(row?.first_seen_at).toBe(
      new Date(Date.parse(live.begin_at ?? '') + 600_000).toISOString(),
    )
  })
})
