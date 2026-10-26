/**
 * La copia del 42cursus de cada campus (`docs/blackhole.md`): todas las
 * páginas, una vez al día, solo con cuota y sin romperse si 42 falla.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import type { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import type { ApiCursusMember } from '../../src/integrations/forty-two/types.js'
import { createCoreCursus } from '../../src/modules/replica/core-cursus.js'
import type { QuotaGate } from '../../src/modules/replica/quota.js'

const NOW = Date.parse('2026-10-25T12:00:00Z')

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

const member = (
  id: number,
  login: string,
  extra: Partial<ApiCursusMember> = {},
): ApiCursusMember => ({
  id,
  begin_at: '2025-09-29T07:42:00.000Z',
  grade: 'Cadet',
  user: { id, login, 'active?': true },
  ...extra,
})

function fake(pages: ApiCursusMember[][], fail = false) {
  const asked: string[] = []
  const client = {
    getCoreCursusPage(query: { campusId: number; page: number }) {
      asked.push(`${String(query.campusId)}:${String(query.page)}`)
      if (fail) return Promise.reject(new Error('42 no contesta'))

      return Promise.resolve({ items: pages[query.page - 1] ?? [], perPage: 2, total: null })
    },
  } as unknown as FortyTwoClient

  return { client, asked }
}

const quota = (allows: () => boolean): QuotaGate =>
  ({ allows, allowsBulk: allows, defer: () => Promise.resolve() }) as unknown as QuotaGate

describe('copia del 42cursus', () => {
  it('copia todas las páginas con grado, fin y cuenta, y no repite antes de un día', async () => {
    let now = NOW
    const { client, asked } = fake([
      [
        member(1, 'Ana', { grade: 'Transcender' }),
        member(2, 'leo', {
          end_at: '2026-03-01T00:00:00.000Z',
          blackholed_at: '2026-02-28T00:00:00.000Z',
          user: { id: 2, login: 'leo', 'active?': false },
        }),
      ],
      [member(3, 'sol', { user: { id: 3, login: 'sol', 'alumni?': true } }), { id: 4, user: null }],
      [],
    ])
    const sync = createCoreCursus({
      db,
      client,
      campusIds: [22],
      quota: quota(() => true),
      hourlyReserve: 0,
      now: () => now,
    })

    await sync.step()
    // La segunda página viene llena (con una fila sin persona): se pide la tercera, vacía.
    expect(asked).toEqual(['22:1', '22:2', '22:3'])

    const rows = await db.execute(
      'SELECT login, grade, end_at, active, alumni FROM core_cursus ORDER BY user_id',
    )

    expect(
      rows.rows.map((row) => [row.login, row.grade, row.end_at, row.active, row.alumni]),
    ).toEqual([
      ['ana', 'Transcender', null, 1, 0],
      ['leo', 'Cadet', '2026-03-01T00:00:00.000Z', 0, 0],
      // Sin `active?` no se afirma nada.
      ['sol', 'Cadet', null, null, 1],
    ])

    await sync.step()
    expect(asked).toHaveLength(3)
    now += 24 * 60 * 60_000
    await sync.step()
    expect(asked).toHaveLength(6)
  })

  it('sin cuota no pide nada; si se acaba a medias, para; si 42 falla, lo apunta', async () => {
    const quiet = fake([[member(1, 'ana')]])

    await createCoreCursus({
      db,
      client: quiet.client,
      campusIds: [22],
      quota: quota(() => false),
      hourlyReserve: 0,
      now: () => NOW,
    }).step()
    expect(quiet.asked).toEqual([])

    let left = 1
    const half = fake([[member(1, 'ana'), member(2, 'leo')], [member(3, 'sol')]])

    await createCoreCursus({
      db,
      client: half.client,
      campusIds: [22],
      quota: quota(() => left-- > 0),
      hourlyReserve: 0,
      now: () => NOW,
    }).step()
    expect(half.asked).toEqual(['22:1'])

    const broken = fake([], true)
    const logs: string[] = []

    await createCoreCursus({
      db,
      client: broken.client,
      campusIds: [22],
      quota: quota(() => true),
      hourlyReserve: 0,
      now: () => NOW,
      log: (line) => logs.push(line),
    }).step()
    expect(logs).toEqual(['42cursus: 42 no contesta'])
  })

  it('una vuelta cortada sigue en su página, también tras un reinicio, y no repite el día', async () => {
    let now = NOW
    let left = 2
    const pages = [
      [member(1, 'ana'), member(2, 'leo')],
      [member(3, 'sol'), member(4, 'eva')],
      [member(5, 'max')],
    ]
    const first = fake(pages)

    await createCoreCursus({
      db,
      client: first.client,
      campusIds: [22],
      quota: quota(() => left-- > 0),
      hourlyReserve: 0,
      now: () => now,
    }).step()
    // La cuota se acaba tras la segunda página.
    expect(first.asked).toEqual(['22:1', '22:2'])

    const stored = await db.execute("SELECT value FROM sync_state WHERE key = 'cursus:22'")

    expect(JSON.parse(stored.rows[0]?.value as string)).toMatchObject({ page: 3, rows: 4 })

    // Otro proceso (un despliegue): sigue en la tercera, no en la primera.
    const second = fake(pages)
    const sync = createCoreCursus({
      db,
      client: second.client,
      campusIds: [22, 37],
      quota: quota(() => true),
      hourlyReserve: 0,
      now: () => now,
    })

    await sync.step()
    expect(second.asked).toEqual(['22:3'])

    // Después toca el otro campus entero; Madrid ya no, hasta mañana.
    await sync.step()
    await sync.step()
    expect(second.asked).toEqual(['22:3', '37:1', '37:2', '37:3'])

    now += 24 * 60 * 60_000
    await sync.step()
    expect(second.asked.slice(4)).toEqual(['22:1', '22:2', '22:3'])

    // Un estado ilegible no rompe nada: se empieza de cero.
    await db.execute("UPDATE sync_state SET value = 'no es json' WHERE key = 'cursus:37'")
    now += 24 * 60 * 60_000
    await sync.step()
    await sync.step()
    expect(second.asked.filter((call) => call === '37:1')).toHaveLength(2)
  })
})
