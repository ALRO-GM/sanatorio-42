/**
 * Tests de la cuenta de la cuota de 42 por función y por persona, y de sus
 * topes por hora (`replica/api-usage.ts`).
 *
 * Sobre SQLite en memoria, con el contador de mentira: cada «petición» es un
 * `check` y un `count` del medidor, como hace el cliente de 42.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { ApiError } from '../../src/integrations/forty-two/errors.js'
import {
  currentApiUse,
  inBackground,
  withApiUse,
} from '../../src/integrations/forty-two/usage-context.js'
import { featureOf } from '../../src/app/build-app.js'
import { createApiUsage } from '../../src/modules/replica/api-usage.js'
import { createFakeClock } from '../helpers/fake-api.js'

const HOUR = 60 * 60_000

/** Martes 27 de octubre de 2026, 09:30 UTC. */
const START = Date.parse('2026-10-27T09:30:00.000Z')

describe('consumo de la API de 42', () => {
  let db: Db
  let clock: ReturnType<typeof createFakeClock>
  let usage: ReturnType<typeof createApiUsage>

  /** `times` peticiones a nombre de `feature` y `login`, como las hace el cliente. */
  const spend = (feature: string, login: string | null, times = 1): void => {
    withApiUse({ feature, login }, () => {
      for (let index = 0; index < times; index += 1) {
        usage.meter.check('/v2/test')
        usage.meter.count()
      }
    })
  }

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    clock = createFakeClock(START)
    usage = createApiUsage({ db, now: clock.now, priority: (login) => login === 'admin' })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('cuenta por función y por persona, y el fondo aparte', async () => {
    spend('network', 'ana', 5)
    spend('boards', 'ana', 1)
    spend('network', 'leo', 2)
    spend('job:corrections', null, 10)

    const report = await usage.report({ hours: 24 })

    expect(report.hour).toMatchObject({ spent: 18, resetsAt: '2026-10-27T10:00:00.000Z' })
    expect(report.features[0]).toEqual({
      key: 'job:corrections',
      requests: 10,
      people: 0,
      thisHour: 10,
    })
    expect(report.features.find((row) => row.key === 'network')).toMatchObject({
      requests: 7,
      people: 2,
    })
    expect(report.people).toEqual([
      { login: 'ana', requests: 6, thisHour: 6, top: 'network', cap: null },
      { login: 'leo', requests: 2, thisHour: 2, top: 'network', cap: null },
    ])
    expect(report.background).toBe(10)

    // Filtrando por función, las series son de personas; por persona, de funciones.
    const network = await usage.report({ hours: 24, feature: 'network' })

    expect(network.series.map((row) => row.key).sort()).toEqual(['ana', 'leo'])
    expect((await usage.report({ hours: 24, login: 'ana' })).features).toHaveLength(2)
  })

  it('el tope de una persona corta en la hora y vuelve a la hora en punto', async () => {
    await usage.configure({ perPerson: 3 }, 'eva')
    await usage.configure({ person: { login: 'leo', cap: 1 } }, 'eva')

    spend('network', 'ana', 3)
    expect(() => {
      spend('network', 'ana')
    }).toThrow(ApiError)
    spend('network', 'leo')
    expect(() => {
      spend('boards', 'leo')
    }).toThrow(/tu tope/)
    // Quien administra y el fondo no tienen tope de persona.
    spend('network', 'admin', 10)
    spend('sync:delta', null, 10)

    expect(
      (await usage.report({ hours: 1 })).people.find((row) => row.login === 'leo'),
    ).toMatchObject({
      cap: 1,
    })

    clock.advance(HOUR)
    spend('network', 'ana', 3)
    expect((await usage.report({ hours: 2 })).series.length).toBeGreaterThan(1)
  })

  it('el tope de una función vale para todos, también para el fondo', async () => {
    await usage.configure({ feature: { key: 'job:corrections', cap: 2 } }, 'eva')

    spend('job:corrections', null, 2)
    expect(() => {
      spend('job:corrections', null)
    }).toThrow(/sección/)

    await usage.configure({ feature: { key: 'job:corrections', cap: null } }, 'eva')
    spend('job:corrections', null)
    expect((await usage.report({ hours: 1 })).limits.features).toEqual({})
  })

  it('tras un reinicio, lo gastado en la hora sigue contando para el tope', async () => {
    await usage.configure({ perPerson: 4 }, 'eva')
    spend('network', 'ana', 3)
    await usage.flush()

    usage = createApiUsage({ db, now: clock.now })
    await usage.flush()
    spend('network', 'ana')
    expect(() => {
      spend('network', 'ana')
    }).toThrow(ApiError)
  })

  it('la función sale de la ruta, y el fondo no pisa lo que ya va a nombre de alguien', () => {
    expect(featureOf('/network/graph')).toBe('network')
    expect(featureOf('/stats/progress/fastest')).toBe('progress')
    expect(featureOf('/users/:login/photo')).toBe('users')
    expect(featureOf(undefined)).toBe('other')

    withApiUse({ feature: 'boards', login: 'ana' }, () => {
      inBackground('sync', () => {
        expect(currentApiUse()).toEqual({ feature: 'boards', login: 'ana' })
      })
    })
    inBackground('sync', () => {
      expect(currentApiUse()).toEqual({ feature: 'sync', login: null })
    })
  })
})
