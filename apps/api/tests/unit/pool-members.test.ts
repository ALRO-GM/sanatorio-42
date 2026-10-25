import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import type { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import type { ApiCursusMember } from '../../src/integrations/forty-two/types.js'
import { createPoolMembers } from '../../src/modules/replica/pool-members.js'
import type { QuotaGate } from '../../src/modules/replica/quota.js'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const DAY = 86_400_000
const at = (days: number): string => new Date(NOW + days * DAY).toISOString()
const member = (id: number, login: string, days: number): ApiCursusMember => ({
  id,
  begin_at: at(days),
  user: { id, login },
})

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

/** Un 42 de mentira que devuelve esas páginas y apunta lo que se le pide. */
function fake(pages: ApiCursusMember[][], fail = false) {
  const asked: string[] = []
  const client = {
    getPiscinePage(query: { campusId: number; page: number; beginFrom: string }) {
      asked.push(`${query.campusId}:${query.page}`)
      if (fail) return Promise.reject(new Error('42 no contesta'))

      return Promise.resolve({ items: pages[query.page - 1] ?? [], perPage: 2, total: null })
    },
  } as unknown as FortyTwoClient

  return { client, asked }
}

const quota = (allows: boolean): QuotaGate =>
  ({ allows: () => allows, defer: () => Promise.resolve() }) as unknown as QuotaGate

describe('copia de piscineros', () => {
  it('copia todas las páginas de cada campus, borra a los de piscinas pasadas y no repite antes de seis horas', async () => {
    let now = NOW
    const { client, asked } = fake([
      [member(1, 'Ana', -5), member(2, 'leo', -1)],
      [member(3, 'sol', 10)],
    ])
    const logs: string[] = []
    const pool = createPoolMembers({
      db,
      client,
      campusIds: [22],
      quota: quota(true),
      hourlyReserve: 0,
      now: () => now,
      log: (line) => logs.push(line),
    })

    // Uno de una piscina de hace tres meses, que la copia debe quitar.
    await db.execute({
      sql: `INSERT INTO pool_members VALUES (22, 9, 'viejo', NULL, ?, ?)`,
      args: [at(-90), at(-90)],
    })
    await pool.step()

    expect(asked).toEqual(['22:1', '22:2'])
    expect([...(await pool.loginsIn(22))].sort()).toEqual(['ana', 'leo', 'sol'])
    expect((await pool.peopleIn(22)).map((person) => person.login)).toEqual(['ana', 'leo', 'sol'])

    await pool.step()
    expect(asked).toHaveLength(2)

    now += 6 * 60 * 60_000
    await pool.step()
    expect(asked).toHaveLength(4)
    expect(logs).toEqual([])
  })

  it('sin cuota no pide nada; si 42 falla, lo apunta y no se rompe', async () => {
    const quiet = fake([[member(1, 'ana', -5)]])

    await createPoolMembers({
      db,
      client: quiet.client,
      campusIds: [22],
      quota: quota(false),
      hourlyReserve: 0,
      now: () => NOW,
    }).step()
    expect(quiet.asked).toEqual([])

    const broken = fake([], true)
    const logs: string[] = []

    await createPoolMembers({
      db,
      client: broken.client,
      campusIds: [22],
      quota: quota(true),
      hourlyReserve: 0,
      now: () => NOW,
      log: (line) => logs.push(line),
    }).step()
    expect(logs).toEqual(['piscineros: 42 no contesta'])
  })

  it('al entrar un piscinero se apunta con su fecha de piscina, o con la de hoy si no la trae', async () => {
    const pool = createPoolMembers({
      db,
      client: fake([]).client,
      campusIds: [22],
      quota: quota(true),
      hourlyReserve: 0,
      now: () => NOW,
    })

    await pool.enter(22, {
      id: 7,
      login: 'Pisci',
      cursus_users: [{ cursus_id: 9, begin_at: at(-3) }],
    })
    await pool.enter(22, { id: 8, login: 'nueva' })

    expect([...(await pool.loginsIn(22))].sort()).toEqual(['nueva', 'pisci'])
    expect(await pool.loginsIn(58)).toEqual([])
  })
})
