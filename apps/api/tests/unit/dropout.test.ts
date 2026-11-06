/**
 * El abandono de la piscina (`docs/abandono.md`): faltar el fin de semana no
 * cuenta; faltar de viernes (examen) a lunes es abandono; una falta pesa más
 * en quien venía muchas horas; y con qué se relaciona.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { DropoutDay, DropoutFactors } from '@sanatorio/contracts'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import {
  assess,
  correlationsOf,
  factorAnalysis,
  hoursOf,
  pearson,
} from '../../src/modules/stats/dropout.rules.js'
import { createDropoutService } from '../../src/modules/stats/dropout.service.js'
import { createPiscineRepository } from '../../src/modules/stats/stats.repository.js'

const DAY = 86_400_000
/** Un lunes. */
const START = Date.UTC(2026, 9, 5)

/** Los días de una piscina que empieza en lunes. */
const axis = (length: number): DropoutDay[] =>
  Array.from({ length }, (_, index) => ({
    day: new Date(START + index * DAY).toISOString().slice(0, 10),
    weekday: (index % 7) + 1,
    index,
    week: Math.floor(index / 7) + 1,
  }))

/** Horas de cada día: `per` entre semana, 0 el fin de semana, hasta `last` (incluido). */
const weekdays = (length: number, per: number, last: number): number[] =>
  axis(length).map((day) => (day.index > last || day.weekday >= 6 ? 0 : per))

describe('si alguien ha dejado la piscina', () => {
  it('faltar solo el fin de semana no es abandono', () => {
    const days = axis(14)
    // Vino de lunes a viernes; hoy es lunes (día 7), aún sin acabar.
    const result = assess({ hours: weekdays(14, 9, 4) }, days, 7)

    expect(result.status).toBe('active')
    expect(result.risk).toBe(0)
    expect(result.reasons).toContain('weekendOnly')
    expect(result.leftBetween).toBeNull()
  })

  it('faltar viernes de examen, sábado, domingo y lunes es abandono, entre el jueves y el viernes', () => {
    const days = axis(14)
    // Vino de lunes a jueves (días 0–3); hoy es martes (día 8).
    const result = assess({ hours: weekdays(14, 6, 3) }, days, 8)

    expect(result.status).toBe('gone')
    expect(result.risk).toBe(100)
    expect(result.reasons).toContain('missedWeekend')
    expect(result.leftBetween).toEqual([3, 4])
    expect(result.leftWeek).toBe(1)
    expect(result.missedDays).toBe(4)
    expect(result.missedWeekdays).toBe(2)
  })

  it('una falta pesa más en quien venía diez horas que en quien venía una', () => {
    const days = axis(14)
    // Vino de lunes a lunes (días 0–7) y faltó el martes (día 8); hoy es miércoles.
    const heavy = assess({ hours: weekdays(14, 10, 7) }, days, 9)
    const light = assess({ hours: weekdays(14, 1, 7) }, days, 9)

    expect(heavy.risk).toBeGreaterThan(light.risk)
    expect(heavy.status).not.toBe('gone')
    expect(heavy.reasons).toContain('heavyUser')
    expect(light.reasons).toContain('lightUser')
  })

  it('faltar el viernes de examen sube mucho el riesgo, aunque aún no sea seguro', () => {
    const days = axis(14)
    // Vino de lunes a jueves; hoy es sábado (día 5): solo ha faltado el viernes.
    const result = assess({ hours: weekdays(14, 6, 3) }, days, 5)

    expect(result.reasons).toContain('missedFriday')
    expect(result.status).toBe('likely')
    expect(result.leftBetween).toEqual([3, 4])
  })

  it('quien no ha venido nunca, y quien llegó al examen final', () => {
    const days = axis(30)

    expect(assess({ hours: days.map(() => 0) }, days, 3).status).toBe('never')
    // El primer día aún no ha pasado: no se sabe nada.
    expect(assess({ hours: days.map(() => 0) }, days, 0).status).toBe('active')

    const finished = assess({ hours: weekdays(30, 7, 25) }, days, 29)

    expect(finished.status).toBe('active')
    expect(finished.reasons).toEqual(['finished'])
  })

  it('lo de antes de que empezara su piscina no cuenta como falta', () => {
    const days = axis(14)
    const hours: (number | null)[] = weekdays(14, 8, 9).map((value, index) =>
      index < 7 ? null : value,
    )

    expect(assess({ hours }, days, 10).status).toBe('active')
  })
})

describe('las horas de cada cual', () => {
  it('total, media de los días que vino, primera semana y parte en fin de semana', () => {
    const hours = [4, 0, 6, 0, 0, 2, 0, 8]

    expect(hoursOf(hours, axis(8))).toEqual({
      totalHours: 20,
      avgHours: 5,
      firstWeekHours: 12,
      weekendShare: 10,
    })
  })
})

describe('con qué se relaciona el abandono', () => {
  const row = (gone: number, totalHours: number, given: number, isolation: number) =>
    ({
      risk: gone * 100,
      gone,
      totalHours,
      avgHours: 0,
      firstWeekHours: 0,
      attendance: 0,
      weekendShare: 0,
      isolation,
      partners: 0,
      given,
      received: 0,
      passed: 0,
    }) satisfies DropoutFactors

  it('Pearson: igual, al revés y sin relación', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1)
    expect(pearson([1, 2, 3], [5, 5, 5])).toBe(0)
  })

  it('la tabla de correlaciones va de −100 a 100 y los factores parecidos forman grupo', () => {
    const rows = [
      row(1, 10, 0, 90),
      row(1, 20, 1, 80),
      row(0, 120, 6, 20),
      row(0, 140, 7, 10),
      row(0, 90, 5, 30),
    ]
    const table = correlationsOf(rows, ['gone', 'totalHours', 'given'])
    const between = table.find((each) => each.a === 'totalHours' && each.b === 'given')

    expect(table).toHaveLength(3)
    expect(table.find((each) => each.b === 'totalHours')?.r).toBeLessThan(-80)
    expect(between?.r).toBeGreaterThan(90)

    const { pairs, groups } = factorAnalysis(rows, ['totalHours', 'given', 'isolation'], 'gone')

    expect(pairs).toHaveLength(3)
    // Juntos, cada uno en el sentido en que va con el abandono: muy relacionados.
    expect(pairs[0]?.together).toBeGreaterThan(80)
    expect(groups[0]?.factors.sort()).toEqual(['given', 'isolation', 'totalHours'])
  })
})

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

describe('el informe de una piscina', () => {
  it('las horas de cada día, quién lo ha dejado y las correlaciones', async () => {
    const iso = (ms: number) => new Date(ms).toISOString()
    const people = ['ana', 'bea', 'carl', 'dani', 'eva', 'fran']

    await db.batch(
      people.flatMap((login, n) => [
        {
          sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
                VALUES (22, ?, ?, NULL, ?, ?)`,
          args: [n + 1, login, iso(START + 8 * 3_600_000), iso(START)],
        },
      ]),
      'write',
    )
    // Todos vienen de 9 a 17 entre semana; «ana» deja de venir el viernes (día 4).
    let location = 1
    const sessions = people.flatMap((login, n) =>
      Array.from({ length: 9 }, (_, index) => index)
        .filter((index) => index % 7 < 5 && (login !== 'ana' || index < 4))
        .map((index) => {
          const begin = START + index * DAY + 9 * 3_600_000

          return {
            sql: `INSERT INTO seat_sessions (location_id, campus_id, user_id, login, host, begin_at, seen_at, first_seen_at)
                  VALUES (?, 22, ?, ?, ?, ?, ?, ?)`,
            args: [
              location++,
              n + 1,
              login,
              `c1r1s${String(n + 1)}`,
              iso(begin),
              iso(begin + 8 * 3_600_000),
              iso(begin),
            ],
          }
        }),
    )

    await db.batch(sessions, 'write')

    const service = createDropoutService({
      db,
      piscine: createPiscineRepository(db),
      // Martes de la segunda semana (día 8), a mediodía.
      now: () => START + 8 * DAY + 12 * 3_600_000,
    })
    const report = await service.report(22, null, (login) => login !== 'fran')

    expect(report.start).toBe('2026-10-05')
    expect(report.pools).toEqual([{ start: '2026-10-05', people: 6 }])
    expect(report.days).toHaveLength(9)
    // Quien no se ve no sale en la lista.
    expect(report.people.map((person) => person.login)).not.toContain('fran')

    const ana = report.people.find((person) => person.login === 'ana')
    const bea = report.people.find((person) => person.login === 'bea')

    expect(ana?.status).toBe('gone')
    expect(ana?.leftBetween).toEqual(['2026-10-08', '2026-10-09'])
    expect(ana?.hours.slice(0, 5)).toEqual([8, 8, 8, 8, 0])
    expect(bea?.status).toBe('active')
    // Seis días de 8 h y hoy, hasta el mediodía, 3 h más.
    expect(bea?.factors.totalHours).toBe(51)
    // Lo primero, quien tiene más riesgo.
    expect(report.people[0]?.login).toBe('ana')
    expect(report.sample).toBe(6)
    expect(report.correlations.length).toBe(
      (report.factors.length * (report.factors.length - 1)) / 2,
    )
  })

  it('sin piscineros, vacío y sin fallar', async () => {
    const service = createDropoutService({ db, piscine: createPiscineRepository(db) })
    const report = await service.report(99, null, () => true)

    expect(report.start).toBeNull()
    expect(report.people).toEqual([])
  })
})
