/**
 * La cuota de 42 con el ritmo de la copia (`budget.ts`): de noche y al final de
 * la hora la copia gasta lo que sobra, por turnos de prioridad; quien usa la web
 * gana siempre; y la cuota se da por renovada a la hora en punto.
 *
 * Con reloj falso y un cliente de mentira al que se le dice cuánto queda.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { BULK_LEASE_MS } from '../../src/modules/replica/budget.js'
import type { BudgetConfig } from '../../src/modules/replica/budget.js'
import { BUDGET_STATE_KEY, createQuota } from '../../src/modules/replica/quota.js'
import { createReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import { createFakeClock } from '../helpers/fake-api.js'

const MINUTE = 60_000

/** 03:00 en Madrid (UTC+1 desde el 25 de octubre): de noche. */
const NIGHT = Date.parse('2026-10-26T02:00:00.000Z')
/** 11:20 en Madrid: de día, lejos del final de la hora. */
const DAY = Date.parse('2026-10-26T10:20:00.000Z')

const BUDGET: BudgetConfig = {
  dayReserve: 300,
  nightReserve: 50,
  nightWindow: { from: 120, to: 360 },
  timeZone: 'Europe/Madrid',
  spendMinutes: 10,
  spendMargin: 30,
}

describe('ritmo de la copia en la cuota de 42', () => {
  let db: Db
  let clock: ReturnType<typeof createFakeClock>
  let client: { remaining: number | undefined; made: number }
  let active: boolean
  let logs: string[]

  const build = () =>
    createQuota({
      db,
      client: { hourlyRemaining: () => client.remaining, requestCount: () => client.made },
      hourlyReserve: 300,
      budget: BUDGET,
      isActive: () => active,
      now: clock.now,
      log: (line) => logs.push(line),
    })

  /** Una petición hecha ahora, tras la que 42 dice que quedan `remaining`. */
  const spend = (remaining: number): void => {
    client.made += 1
    client.remaining = remaining
  }

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    clock = createFakeClock(DAY)
    client = { remaining: 1200, made: 0 }
    active = false
    logs = []
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('de día no cambia nada: la copia para en la reserva y va con pausa', () => {
    const quota = build()

    spend(301)
    expect(quota.paced()).toBe(true)
    expect(quota.allowsBulk('initial', 300)).toBe(true)
    expect(quota.upkeep(100)).toBe(100)

    spend(300)
    expect(quota.allowsBulk('initial', 300)).toBe(false)
    expect(quota.allows('deferrable')).toBe(false)
    expect(quota.allows('critical')).toBe(true)
  })

  it('de noche la copia baja de la reserva, de corrido, y el mantenimiento llega al suelo', () => {
    clock = createFakeClock(NIGHT + 50 * MINUTE)
    const quota = build()

    spend(100)
    expect(quota.paced()).toBe(false)
    // A diez minutos de renovarse: 50 + 3 × 10 = 80.
    expect(quota.allowsBulk('initial', 300)).toBe(true)
    spend(80)
    expect(quota.allowsBulk('initial', 300)).toBe(false)
    // Los puestos siguen: su reserva baja hasta el suelo de la noche.
    expect(quota.upkeep(300)).toBe(50)
    expect(quota.allows('background', quota.upkeep(300))).toBe(true)
    expect(logs).toContain('cuota de 42: modo noche, la copia baja hasta 80')
  })

  it('fuera del día, la tarea de más prioridad se lleva la cuota y las demás esperan su turno', () => {
    clock = createFakeClock(NIGHT)
    const quota = build()

    spend(1000)
    // Sin nadie delante, el histórico de correcciones puede.
    expect(quota.allowsBulk('corrections', 300)).toBe(true)
    // Llega la copia inicial: a partir de ahí, las de detrás esperan.
    expect(quota.allowsBulk('initial', 300)).toBe(true)
    expect(quota.allowsBulk('cursus', 300)).toBe(false)
    expect(quota.allowsBulk('corrections', 300)).toBe(false)
    expect(quota.allowsBulk('sweep', 300)).toBe(false)

    // La copia inicial termina (deja de pedir): su turno caduca y pasa el siguiente.
    clock.advance(BULK_LEASE_MS)
    expect(quota.allowsBulk('cursus', 300)).toBe(true)
    expect(quota.allowsBulk('corrections', 300)).toBe(false)
  })

  it('de día no hay turnos: todas comparten como antes', () => {
    const quota = build()

    spend(1000)
    expect(quota.allowsBulk('initial', 300)).toBe(true)
    expect(quota.allowsBulk('sweep', 450)).toBe(true)
  })

  it('si alguien entra de noche, la copia vuelve a la reserva y su petición aplazable pasa', () => {
    clock = createFakeClock(NIGHT + 20 * MINUTE)
    const quota = build()

    spend(200)
    expect(quota.allowsBulk('initial', 300)).toBe(true)

    active = true
    // La copia para en seco: vuelve la reserva de día.
    expect(quota.paced()).toBe(true)
    expect(quota.allowsBulk('initial', 300)).toBe(false)
    // Pero a quien ha entrado no se le hace esperar a la hora siguiente.
    expect(quota.allows('deferrable')).toBe(true)
    spend(70)
    expect(quota.allows('deferrable')).toBe(false)
    expect(quota.allows('critical')).toBe(true)
    expect(logs.at(-1)).toBe('cuota de 42: modo día')
  })

  it('en los últimos minutos de la hora gasta lo que sobra, también con gente, con margen', () => {
    clock = createFakeClock(DAY + 25 * MINUTE)
    active = true
    const quota = build()

    spend(250)
    expect(quota.allowsBulk('initial', 300)).toBe(false)

    clock.advance(5 * MINUTE)
    // A las 11:50 en Madrid: 70 + 3 × 10 = 100.
    expect(quota.paced()).toBe(false)
    expect(quota.allowsBulk('initial', 300)).toBe(true)
    spend(100)
    expect(quota.allowsBulk('initial', 300)).toBe(false)
    // Lo aplazable de las personas aguanta hasta 70; lo crítico, hasta 40.
    expect(quota.allows('deferrable')).toBe(true)
    expect(logs).toContain('cuota de 42: modo gastar lo que sobra, la copia baja hasta 100')
  })

  it('a la hora en punto da la cuota por renovada aunque no se haya pedido nada', () => {
    clock = createFakeClock(DAY)
    const quota = build()

    spend(250)
    expect(quota.allows('background')).toBe(false)

    // A las 12:00 de Madrid lo que dijo 42 a las 11:20 ya no vale: se pregunta.
    clock.advance(40 * MINUTE)
    expect(quota.allows('background')).toBe(true)

    // Y al ver que ha vuelto, lo apunta.
    spend(1199)
    expect(quota.allows('background')).toBe(true)
    expect(logs).toContain('cuota de 42 renovada: quedaban 250, ahora 1199')
  })

  it('guarda el modo y la última renovación para `npm run sync:status`', async () => {
    clock = createFakeClock(NIGHT)
    const quota = build()

    spend(300)
    quota.allows('background')
    spend(1100)
    quota.allows('background')
    await quota.refresh(true)

    const stored = await createReplicaRepository(db).getState(BUDGET_STATE_KEY)

    expect(stored).toMatchObject({
      mode: 'night',
      nightWindow: '02:00-06:00',
      timeZone: 'Europe/Madrid',
      lastReset: { from: 300, to: 1100 },
    })

    const status = await quota.status()

    expect(status.budget).toMatchObject({
      mode: 'night',
      resetsAt: '2026-10-26T03:00:00.000Z',
    })
  })

  it('el turno de quien espera se calcula hasta la hora en punto', async () => {
    const quota = build()

    quota.register('agenda', () => Promise.resolve())
    spend(250)
    expect(await quota.defer('ana', 'agenda')).toBe(false)

    const ticket = (await quota.statusFor('ana')).ticket

    // De 11:20 a 12:00 en Madrid, más lo que tarda la cola en llegar.
    expect(ticket?.etaMinutes).toBe(40 + 1)
  })
})
