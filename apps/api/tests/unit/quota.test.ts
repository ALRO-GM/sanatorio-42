/**
 * Tests de la cuota de la API de 42: los tres escalones, que solo hay cuota
 * horaria y la cola por orden de llegada.
 *
 * Sobre SQLite en memoria, con un cliente de mentira al que se le dice cuánto
 * queda en la hora y cuánto lleva pedido.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createQuota, hourlyQuota, ticketNumber } from '../../src/modules/replica/quota.js'
import type { QuotaTask } from '../../src/modules/replica/quota.js'
import { createFakeClock } from '../helpers/fake-api.js'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Martes 6 de octubre de 2026, 14:30 UTC. */
const START = Date.parse('2026-10-06T14:30:00.000Z')

describe('cuota de 42', () => {
  let db: Db
  let clock: ReturnType<typeof createFakeClock>
  /** Lo que dice 42 que queda en la hora, y lo que el cliente lleva pedido. */
  let client: { remaining: number | undefined; made: number }
  let served: string[]

  const build = (priority?: (login: string) => boolean) => {
    const quota = createQuota({
      db,
      client: { hourlyRemaining: () => client.remaining, requestCount: () => client.made },
      hourlyReserve: 300,
      now: clock.now,
      ...(priority === undefined ? {} : { priority }),
    })

    for (const task of ['agenda', 'cursus', 'track'] as QuotaTask[]) {
      quota.register(task, (login) => {
        served.push(`${login}:${task}`)
        client.made += 1

        return Promise.resolve()
      })
    }

    return quota
  }

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    clock = createFakeClock(START)
    client = { remaining: 1200, made: 0 }
    served = []
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('con la cuota de la hora, primero para el fondo y lo aplazable, y lo crítico aguanta', () => {
    const quota = build()

    expect(quota.level()).toBe('ok')
    // El fondo puede pedir más margen que la reserva.
    expect(quota.allows('background', 600)).toBe(true)

    client.remaining = 500
    expect(quota.allows('background', 600)).toBe(false)
    expect(quota.allows('background')).toBe(true)

    client.remaining = 300
    expect(quota.allows('background')).toBe(false)
    expect(quota.allows('deferrable')).toBe(false)
    expect(quota.allows('critical')).toBe(true)
    expect(quota.level()).toBe('tight')

    client.remaining = 40
    expect(quota.allows('critical')).toBe(false)
    expect(quota.level()).toBe('critical')

    // Si pasa una hora sin pedir nada, lo que dijo 42 ya no vale: la cuota se ha renovado.
    clock.advance(HOUR)
    expect(quota.level()).toBe('ok')

    // Y antes de la primera respuesta no se sabe cuánto queda: se asume que sí.
    client.made += 1
    expect(quota.level()).toBe('critical')
    client.remaining = undefined
    expect(quota.level()).toBe('ok')
  })

  it('solo hay cuota horaria: lo del día se cuenta pero no frena, y los topes de antes se ignoran', async () => {
    const quota = build()

    await db.execute({
      sql: "INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('quota42', ?, 'eva', '')",
      args: [JSON.stringify({ dailyRequests: 100, monthlyRequests: 1000, renewDay: 1 })],
    })
    client.made = 5000
    await quota.refresh(true)
    expect(quota.allows('background')).toBe(true)
    expect(await quota.status()).toMatchObject({
      settings: { saving: false },
      hourlyRemaining: 1200,
      hourlyLimit: 1200,
      secondlyLimit: 2,
      day: { spent: 5000 },
    })

    // Al día siguiente el contador empieza de cero.
    clock.advance(DAY)
    await quota.refresh()
    expect((await quota.status()).day.spent).toBe(0)
  })

  it('el modo ahorro solo deja pasar lo crítico', async () => {
    const quota = build()

    expect((await quota.configure({ saving: true }, 'eva')).level).toBe('tight')
    expect(quota.allows('background')).toBe(false)
    expect(quota.allows('deferrable')).toBe(false)
    expect(quota.allows('critical')).toBe(true)

    expect(await quota.defer('ana', 'agenda')).toBe(false)
    // No se sabe cuándo se quitará: no hay tiempo estimado.
    expect((await quota.statusFor('ana')).ticket).toMatchObject({ etaMinutes: null })
  })

  it('la cola es por orden de llegada, nadie se cuela y avanza sola cuando hay cuota', async () => {
    const quota = build()

    // Con cuota y sin cola, se pide en el momento.
    expect(await quota.defer('ana', 'agenda')).toBe(true)
    expect(await quota.statusFor('ana')).toEqual({ level: 'ok', ticket: null })

    client.remaining = 250
    expect(await quota.defer('ana', 'agenda')).toBe(false)
    clock.advance(MINUTE)
    expect(await quota.defer('leo', 'track')).toBe(false)
    expect(await quota.defer('sol', 'agenda')).toBe(false)
    // Volver a pedir lo mismo no da otro turno.
    expect(await quota.defer('ana', 'agenda')).toBe(false)

    // Son las 14:31: la cuota vuelve a las 15:00, y después la cola tarda un minuto.
    expect(await quota.statusFor('sol')).toEqual({
      level: 'tight',
      ticket: {
        number: 'A-003',
        serving: null,
        ahead: 2,
        etaMinutes: 30,
        since: '2026-10-06T14:31:00.000Z',
      },
    })
    expect((await quota.statusFor('ana')).ticket).toMatchObject({ number: 'A-001', ahead: 0 })
    expect((await quota.status()).queued).toBe(3)

    // Sin cuota, la cola no se mueve.
    expect(await quota.drain()).toBe(0)

    // Vuelve la cuota. Quien llega ahora no se cuela: hay gente esperando.
    client.remaining = 1200
    expect(await quota.defer('eva', 'cursus')).toBe(false)
    expect((await quota.statusFor('eva')).ticket).toMatchObject({
      number: 'A-004',
      ahead: 3,
      etaMinutes: 1,
    })

    expect(await quota.drain(2)).toBe(2)
    expect(served).toEqual(['ana:agenda', 'leo:track'])
    expect(await quota.statusFor('ana')).toEqual({ level: 'ok', ticket: null })
    expect((await quota.statusFor('sol')).ticket).toMatchObject({ serving: 'A-002', ahead: 0 })

    expect(await quota.drain()).toBe(2)
    expect(served).toEqual(['ana:agenda', 'leo:track', 'sol:agenda', 'eva:cursus'])
    // Con la cola vacía se vuelve a pedir en el momento.
    expect(await quota.defer('leo', 'agenda')).toBe(true)
  })

  it('cuando le toca a alguien, su petición pasa aunque siga habiendo cola', async () => {
    const quota = build()
    const allowed: boolean[] = []

    client.remaining = 250
    await quota.defer('ana', 'agenda')
    await quota.defer('leo', 'agenda')
    // Lo que se hace al llegar el turno vuelve a preguntar, como en una visita.
    quota.register('agenda', async (login) => {
      allowed.push(await quota.defer(login, 'agenda'))
    })

    client.remaining = 1200
    expect(await quota.drain(1)).toBe(1)
    expect(allowed).toEqual([true])
    // `leo` sigue esperando: fuera de su turno no pasa.
    expect(await quota.defer('leo', 'agenda')).toBe(false)
  })

  it('un turno que falla no bloquea a los de detrás', async () => {
    const quota = build()

    client.remaining = 250
    await quota.defer('ana', 'agenda')
    await quota.defer('leo', 'track')
    quota.register('agenda', () => Promise.reject(new Error('42 no contesta')))

    client.remaining = 1200
    expect(await quota.drain()).toBe(2)
    expect(served).toEqual(['leo:track'])
  })

  it('quien administra no hace cola, y lo crítico pasa aunque la haya', async () => {
    const quota = build((login) => login === 'eva')

    client.remaining = 250
    expect(await quota.defer('ana', 'agenda')).toBe(false)
    expect(await quota.defer('eva', 'agenda')).toBe(true)
    expect(quota.allows('critical')).toBe(true)
    expect((await quota.statusFor('eva')).ticket).toBeNull()

    // Con la cuota casi a cero ya no pasa ni quien administra.
    client.remaining = 30
    expect(await quota.defer('eva', 'agenda')).toBe(false)
  })

  it('un reinicio no pierde lo gastado ni desordena la cola', async () => {
    const first = build()

    await first.configure({ saving: true }, 'eva')
    client.remaining = 250
    await first.defer('ana', 'agenda')
    await first.defer('leo', 'agenda')
    client.made = 400
    clock.advance(2 * MINUTE)
    await first.refresh()

    // Otro proceso sobre la misma base: su cliente empieza a contar de cero.
    client = { remaining: 1200, made: 0 }

    const second = build()

    expect(await second.status()).toMatchObject({
      settings: { saving: true },
      day: { spent: 400 },
      queued: 2,
    })
    expect((await second.statusFor('leo')).ticket).toMatchObject({ number: 'A-002', ahead: 1 })
    await second.configure({ saving: false }, 'eva')
    expect(await second.drain()).toBe(2)
    expect(served).toEqual(['ana:agenda', 'leo:agenda'])
    // Los turnos atendidos se borran al día siguiente.
    clock.advance(DAY + HOUR)
    await second.drain()
    expect((await db.execute('SELECT COUNT(*) AS total FROM quota_queue')).rows[0]?.total).toBe(0)
  })

  it('el número del turno es como el de un tique, y sin base solo cuenta la hora', async () => {
    expect(ticketNumber(7)).toBe('A-007')
    expect(ticketNumber(1042)).toBe('A-042')

    const gate = hourlyQuota({ hourlyRemaining: () => client.remaining }, 300)

    expect(gate.allows('background', 600)).toBe(true)
    client.remaining = 300
    expect(gate.allows('deferrable')).toBe(false)
    expect(await gate.defer('ana', 'agenda')).toBe(false)
    expect(gate.allows('critical')).toBe(true)
  })
})
