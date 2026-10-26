/**
 * Las horas de clúster del estado de salud (`modules/replica/logtime.ts`): se
 * suman los días de `locations_stats`, se guardan y no se vuelve a preguntar a
 * 42 hasta el día siguiente; sin cuota, lo guardado.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createLogtime, secondsOf, totalSeconds } from '../../src/modules/replica/logtime.js'
import type { QuotaGate } from '../../src/modules/replica/quota.js'

const NOW = Date.parse('2026-10-26T12:00:00Z')
const DAY = 86_400_000

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

const quota = (allows: boolean): QuotaGate =>
  ({ defer: () => Promise.resolve(allows) }) as unknown as QuotaGate

describe('horas de clúster', () => {
  it('lee las duraciones de 42 y las suma', () => {
    expect(secondsOf('05:12:33.123456')).toBeCloseTo(5 * 3600 + 12 * 60 + 33.123456)
    expect(secondsOf('120:00:00')).toBe(120 * 3600)
    expect(secondsOf('mucho')).toBe(0)
    expect(secondsOf(null)).toBe(0)
    expect(totalSeconds({ '2026-10-25': '01:30:00', '2026-10-26': '02:30:00.5' })).toBe(
      4 * 3600 + 0.5,
    )
  })

  it('pregunta una vez al día, guarda el total y sin cuota sirve lo guardado', async () => {
    let now = NOW
    let asked = 0
    let allows = true
    const logtime = createLogtime({
      db,
      client: {
        getLocationsStats: () => {
          asked += 1

          return Promise.resolve({ '2026-10-25': '10:00:00', '2026-10-26': '02:00:00' })
        },
      },
      quota: { defer: () => Promise.resolve(allows) } as unknown as QuotaGate,
      now: () => now,
    })

    expect(await logtime.hoursOf('ana', 7)).toBe(12)
    expect(await logtime.hoursOf('ana', 7)).toBe(12)
    expect(asked).toBe(1)

    // Al día siguiente vuelve a preguntar; sin cuota, se queda con lo de ayer.
    now += DAY + 1
    allows = false
    expect(await logtime.hoursOf('ana', 7)).toBe(12)
    expect(asked).toBe(1)
    allows = true
    expect(await logtime.hoursOf('ana', 7)).toBe(12)
    expect(asked).toBe(2)
  })

  it('sin id de 42 ni nada guardado, no se sabe', async () => {
    const logtime = createLogtime({
      db,
      client: { getLocationsStats: () => Promise.reject(new Error('no debería preguntar')) },
      quota: quota(true),
      now: () => NOW,
    })

    expect(await logtime.hoursOf('nadie', null)).toBeNull()
  })
})
