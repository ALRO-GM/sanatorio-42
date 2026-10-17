/**
 * Panel: uso por campus y crecimiento (usuarios nuevos y totales por día).
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { createGrowthService } from '../../src/modules/admin/growth.js'
import { actor, expectCode, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const BCN = 58
const admin = actor('jefa', { admin: true })

describe('crecimiento por campus', () => {
  const community = useCommunity()
  let db: Community['db']

  const run = async (sql: string, args: (string | number | null)[]) => {
    await db.execute({ sql, args })
  }
  const profile = (login: string, campus: number | null, created: string) =>
    run('INSERT INTO profiles (login, campus_id, created_at, seen_at) VALUES (?, ?, ?, ?)', [
      login,
      campus,
      created,
      created,
    ])
  const used = (login: string, day: string) =>
    run('INSERT INTO request_stats (login, day, hour, requests, bytes) VALUES (?, ?, 10, 5, 100)', [
      login,
      day,
    ])

  beforeEach(async () => {
    ;({ db } = community)
    // ana y leo son de Madrid (ana lo eligió; leo, por su campus de 42). uma, de Barcelona.
    await profile('ana', MADRID, '2026-09-30T10:00:00.000Z')
    await profile('leo', null, '2026-10-02T10:00:00.000Z')
    await profile('uma', BCN, '2026-10-02T18:00:00.000Z')
    await used('ana', '2026-10-02')
    await used('leo', '2026-10-02')
    await used('uma', '2026-10-02')
    await used('ana', '2026-10-03')
  })

  it('por día y campus: activos y nuevos; y cuánta gente había antes', async () => {
    const growth = await createGrowthService(db).growth(admin, {
      from: '2026-10-01',
      to: '2026-10-05',
    })

    expect(growth.days).toEqual([
      { day: '2026-10-02', campusId: MADRID, active: 2, newUsers: 1 },
      { day: '2026-10-02', campusId: BCN, active: 1, newUsers: 1 },
      { day: '2026-10-03', campusId: MADRID, active: 1, newUsers: 0 },
    ])
    expect(growth.before).toEqual([{ campusId: MADRID, people: 1 }])
    expect(growth.campuses).toEqual(
      expect.arrayContaining([
        { id: MADRID, name: 'Madrid', people: 2 },
        { id: BCN, name: 'Barcelona', people: 1 },
      ]),
    )
    expect(growth.selected.sort()).toEqual([BCN, MADRID].sort())
  })

  it('se puede pedir un campus o varios', async () => {
    const growth = await createGrowthService(db).growth(admin, {
      from: '2026-10-01',
      to: '2026-10-05',
      campus: String(BCN),
    })

    expect(growth.selected).toEqual([BCN])
    expect(growth.days).toEqual([{ day: '2026-10-02', campusId: BCN, active: 1, newUsers: 1 }])
    expect(growth.before).toEqual([])
  })

  it('solo para quien administra, y con un periodo que tenga sentido', async () => {
    const growth = createGrowthService(db)

    await expectCode(
      growth.growth(actor('ana'), { from: '2026-10-01', to: '2026-10-05' }),
      'forbidden',
    )
    await expectCode(
      growth.growth(admin, { from: '2026-10-05', to: '2026-10-01' }),
      'invalid_input',
    )
    await expectCode(
      growth.growth(admin, { from: '2024-01-01', to: '2026-10-01' }),
      'invalid_input',
    )
    await expectCode(
      growth.growth(admin, { from: '2026-10-01', to: '2026-10-05', campus: '1;DROP' }),
      'invalid_input',
    )
    await expectCode(growth.growth(admin, {}), 'invalid_input')
  })
})
