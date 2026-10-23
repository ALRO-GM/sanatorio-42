/**
 * Lo que se monta después (`core/late.ts`) y la presencia, que salieron de la
 * composición.
 */
import { describe, expect, it } from 'vitest'

import { createLate } from '../../src/core/late.js'
import { createPresence, PRESENCE_WINDOW_MS } from '../../src/modules/presence/index.js'

describe('lo que se monta después', () => {
  it('antes de conectarlo, usarlo es un error con nombre; después, lo conectado', () => {
    const late = createLate<{ clicker: { n: number } }>()

    expect(late.ready()).toBe(false)
    expect(() => late.get('clicker')).toThrow(/clicker/)

    late.wire({ clicker: { n: 1 } })

    expect(late.ready()).toBe(true)
    expect(late.get('clicker')).toEqual({ n: 1 })
    expect(() => {
      late.wire({ clicker: { n: 2 } })
    }).toThrow()
  })
})

describe('presencia', () => {
  it('anota como mucho una vez por minuto y mira solo la ventana reciente', async () => {
    let at = Date.UTC(2026, 9, 23, 12)
    const touched: string[] = []
    const asked: string[] = []
    const presence = createPresence({
      profiles: {
        touch: (login, when) => {
          touched.push(`${login}@${when ?? ''}`)

          return Promise.resolve()
        },
        seenSince: (since) => {
          asked.push(since)

          return Promise.resolve(new Set(['ana']))
        },
        online: () => Promise.resolve([]),
      },
      replica: {
        presenceIn: () =>
          Promise.resolve([{ login: 'ana', host: 'c1r2s3' }] as Awaited<
            ReturnType<Parameters<typeof createPresence>[0]['replica']['presenceIn']>
          >),
      },
      now: () => at,
    })

    presence.beat('ana')
    presence.beat('ana')
    at += 60_000
    presence.beat('ana')

    expect(touched).toHaveLength(2)
    expect(await presence.online()).toEqual(new Set(['ana']))
    expect(asked).toEqual([new Date(at - PRESENCE_WINDOW_MS).toISOString()])
    expect(await presence.seatOf(1, 'ana')).toBe('c1r2s3')
    expect(await presence.seatOf(1, 'leo')).toBeNull()
  })
})
