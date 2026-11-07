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
  DEFAULT_TUNING,
  assess,
  correlationsOf,
  factorAnalysis,
  hoursOf,
  pearson,
  profileLambda,
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

  it('piscina terminada: el último día que vino es su abandono, seguro; cerca del final, la acabó', () => {
    const days = axis(33)
    const after = 33

    // Dejó de venir a mitad de piscina (el miércoles de la segunda semana, día 9).
    const half = assess({ hours: weekdays(33, 8, 9) }, days, after)

    expect(half).toMatchObject({ status: 'gone', risk: 100, leftBetween: [9, 10], leftWeek: 2 })
    expect(half.reasons).toEqual(['ended'])
    // Un examen o una corrección también cuentan como venir: el viernes 18.
    expect(
      assess({ hours: weekdays(33, 8, 9), present: new Set([18]) }, days, after).leftBetween,
    ).toEqual([18, 19])
    // Vino hasta el miércoles de antes del examen final (día 23) y faltó a él:
    // puede que no pudiera ir, no lo dejó.
    const close = assess({ hours: weekdays(33, 8, 23) }, days, after)

    expect(close).toMatchObject({ status: 'active', risk: 0, leftBetween: null })
    expect(close.reasons).toEqual(['finished'])
    // Hasta el martes (día 22), sí.
    expect(assess({ hours: weekdays(33, 8, 22) }, days, after).status).toBe('gone')
    // Aunque solo faltara días sueltos que en curso no lo confirmarían, ni los ajustes.
    expect(
      assess({ hours: weekdays(33, 1, 18) }, days, after, {
        ...DEFAULT_TUNING,
        weekMissed: 30,
        fridayToMonday: false,
      }).status,
    ).toBe('gone')
  })

  it('lo de antes de que empezara su piscina no cuenta como falta', () => {
    const days = axis(14)
    const hours: (number | null)[] = weekdays(14, 8, 9).map((value, index) =>
      index < 7 ? null : value,
    )

    expect(assess({ hours }, days, 10).status).toBe('active')
  })
})

describe('el examen, las correcciones y los ajustes', () => {
  it('quien está en el examen hoy no ha abandonado, aunque los puestos no lo vean desde el miércoles', () => {
    const days = axis(14)
    // Vino de lunes a miércoles (días 0–2); hoy es viernes (día 4), día de examen.
    const hours = weekdays(14, 7, 2)
    const without = assess({ hours }, days, 4)
    const result = assess({ hours, inExam: true }, days, 4)

    expect(without.risk).toBeGreaterThan(0)
    expect(result).toMatchObject({ status: 'active', risk: 0, reasons: ['inExam'] })
  })

  it('una corrección o un examen cuentan como venir, aunque el puesto no salga', () => {
    const days = axis(14)
    // Los puestos dicen de lunes a jueves; el viernes y el lunes corrigió.
    const result = assess({ hours: weekdays(14, 6, 3), present: new Set([4, 7]) }, days, 8)

    expect(result.status).toBe('active')
    expect(result.lastSeen).toBe(7)
  })

  it('los ajustes cambian el estado: sin viernes a lunes y con más días para confirmar', () => {
    const days = axis(14)
    const hours = weekdays(14, 6, 3)
    const lenient = {
      ...DEFAULT_TUNING,
      fridayToMonday: false,
      weekMissed: 10,
      fridayExtra: 0,
      likely: 95,
      doubt: 90,
    }

    expect(assess({ hours }, days, 8).status).toBe('gone')
    expect(assess({ hours }, days, 8, lenient).status).toBe('active')
  })

  it('los pesos de los factores suben el riesgo a quien se aparta de la media en ese sentido', () => {
    const rows = [0, 50, 100].map((isolation) => ({ ...DEFAULT_TUNING.weights, isolation }))
    const profile = profileLambda(rows, { ...DEFAULT_TUNING.weights, isolation: 1 })

    expect(profile[0]).toBeLessThan(0)
    expect(profile[1]).toBeCloseTo(0)
    expect(profile[2]).toBeGreaterThan(0)
    // Sin pesos, nada.
    expect(profileLambda(rows, DEFAULT_TUNING.weights)).toEqual([0, 0, 0])

    // Con perfil, alguien que viene cada día puede tener riesgo, pero no «cuándo lo dejó».
    const days = axis(7)
    const result = assess({ hours: weekdays(7, 8, 3) }, days, 3, DEFAULT_TUNING, 3)

    expect(result.status).toBe('likely')
    expect(result.leftBetween).toBeNull()
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
    // Con seis no es una piscina que elegir (hacen falta 20), pero se mira igual.
    expect(report.pools).toEqual([])
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
    expect(report.counts).toEqual({
      people: 5,
      gone: 1,
      likely: 0,
      doubt: 0,
      active: 4,
      never: 0,
      inExam: 0,
    })
    expect(report.tuning).toEqual(report.defaults)

    // Con viernes a lunes apagado y más días para confirmar, «ana» ya no está confirmada.
    const lenient = await service.report(22, null, () => true, {
      ...DEFAULT_TUNING,
      fridayToMonday: false,
      weekMissed: 10,
    })

    expect(lenient.people.find((person) => person.login === 'ana')?.status).not.toBe('gone')
    expect(lenient.counts.gone).toBe(0)
    expect(report.correlations.length).toBe(
      (report.factors.length * (report.factors.length - 1)) / 2,
    )
  })

  it('quien está hoy en el examen de la piscina sale sin riesgo, aunque no salga en los puestos', async () => {
    const iso = (ms: number) => new Date(ms).toISOString()
    const now = START + 4 * DAY + 11 * 3_600_000

    await db.batch(
      [
        ...['jose', 'luz'].map((login, n) => ({
          sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
                VALUES (22, ?, ?, NULL, ?, ?)`,
          args: [n + 1, login, iso(START + 8 * 3_600_000), iso(START)],
        })),
        {
          sql: `INSERT INTO projects (id, name, slug) VALUES (900, 'Exam 00', 'c-piscine-exam-00')`,
        },
        // «jose» empezó el examen del viernes a las 9.
        {
          sql: `INSERT INTO exam_attempts (team_id, project_user_id, user_id, project_id, mark, validated, at)
                VALUES (1, 1, 1, 900, 40, NULL, ?)`,
          args: [iso(START + 4 * DAY + 9 * 3_600_000)],
        },
        // Los dos vinieron solo el lunes y el martes.
        ...['jose', 'luz'].flatMap((login, n) =>
          [0, 1].map((index) => ({
            sql: `INSERT INTO seat_sessions (location_id, campus_id, user_id, login, host, begin_at, seen_at, first_seen_at)
                  VALUES (?, 22, ?, ?, 'c1r1s1', ?, ?, ?)`,
            args: [
              10 * (n + 1) + index,
              n + 1,
              login,
              iso(START + index * DAY + 9 * 3_600_000),
              iso(START + index * DAY + 17 * 3_600_000),
              iso(START + index * DAY + 9 * 3_600_000),
            ],
          })),
        ),
      ],
      'write',
    )

    const service = createDropoutService({
      db,
      piscine: createPiscineRepository(db),
      now: () => now,
    })
    const report = await service.report(22, null, () => true)
    const jose = report.people.find((person) => person.login === 'jose')
    const luz = report.people.find((person) => person.login === 'luz')

    expect(jose).toMatchObject({ status: 'active', reasons: ['inExam'], lastSeen: '2026-10-09' })
    expect(jose?.factors.risk).toBe(0)
    expect(luz?.factors.risk).toBeGreaterThan(0)
    expect(report.counts.inExam).toBe(1)
  })

  it('una piscina pasada sale del historial de piscinas, y se compara con las demás', async () => {
    const iso = (ms: number) => new Date(ms).toISOString()
    const logins = Array.from({ length: 20 }, (_, n) => `p${String(n)}`)

    await db.batch(
      [
        ...logins.map((login, n) => ({
          sql: `INSERT INTO piscine_members (campus_id, user_id, login, image, begin_at)
                VALUES (22, ?, ?, NULL, ?)`,
          args: [n + 1, login, iso(START + 8 * 3_600_000)],
        })),
        // Todos vienen de 9 a 17 entre semana las dos primeras semanas; «p0» solo el lunes.
        ...logins.flatMap((login, n) =>
          Array.from({ length: 12 }, (_, index) => index)
            .filter((index) => index % 7 < 5 && (login !== 'p0' || index === 0))
            .map((index) => ({
              sql: `INSERT INTO piscine_sessions (location_id, campus_id, user_id, login, host, begin_at, end_at)
                    VALUES (?, 22, ?, ?, 'c1r1s1', ?, ?)`,
              args: [
                1000 * (n + 1) + index,
                n + 1,
                login,
                iso(START + index * DAY + 9 * 3_600_000),
                iso(START + index * DAY + 17 * 3_600_000),
              ],
            })),
        ),
        // «p1» corrigió a «p2»: cuenta en los dos.
        {
          sql: `INSERT INTO piscine_activity (campus_id, user_id, login, kind, ref, at)
                VALUES (22, 2, 'p1', 'given', 9, ?), (22, 3, 'p2', 'received', 9, ?)`,
          args: [iso(START + DAY), iso(START + DAY)],
        },
      ],
      'write',
    )

    // Dos meses después: la piscina ya acabó.
    const service = createDropoutService({
      db,
      piscine: createPiscineRepository(db),
      now: () => START + 60 * DAY,
    })
    const report = await service.report(22, null, () => true)

    expect(report.pools).toEqual([{ start: '2026-10-05', people: 20 }])
    expect(report.days).toHaveLength(33)
    expect(report.people.find((person) => person.login === 'p0')).toMatchObject({
      status: 'gone',
      leftBetween: ['2026-10-05', '2026-10-06'],
    })
    expect(report.people.find((person) => person.login === 'p1')?.factors.given).toBe(1)
    expect(report.people.find((person) => person.login === 'p2')?.factors.received).toBe(1)

    const comparison = await service.compare(22, [], () => true)

    expect(comparison.available).toEqual([{ start: '2026-10-05', people: 20 }])
    expect(comparison.pools).toHaveLength(1)
    expect(comparison.overall.counts.people).toBe(20)
    expect(comparison.overall.counts.gone).toBeGreaterThanOrEqual(1)
    // El día 0 siguen todos; «p0» lo dejó el día 1.
    expect(comparison.overall.staying[0]).toBe(100)
    expect(comparison.overall.staying[1]).toBe(95)
    expect(comparison.overall.byWeek.gone[0]).toBeGreaterThanOrEqual(1)
    // Lunes → martes.
    expect(comparison.overall.byWeekday.gone[0]).toBe(1)
    expect(comparison.overall.leaving.leftDay).not.toBeNull()
    expect(comparison.overall.sessionHours).toBeGreaterThan(0)
    // Una piscina que no existe no entra.
    expect((await service.compare(22, ['2020-01-01'], () => true)).pools).toEqual([])
  })

  it('sin elegir, sale la piscina más reciente, aunque una vieja tuviera más gente', async () => {
    const iso = (ms: number) => new Date(ms).toISOString()
    const pool = (from: number, count: number, begin: number) =>
      Array.from({ length: count }, (_, n) => ({
        sql: `INSERT INTO piscine_members (campus_id, user_id, login, image, begin_at)
              VALUES (22, ?, ?, NULL, ?)`,
        args: [from + n, `u${String(from + n)}`, iso(begin)],
      }))

    await db.batch(
      [...pool(1, 20, START + 8 * 3_600_000), ...pool(100, 40, START - 365 * DAY)],
      'write',
    )
    const service = createDropoutService({
      db,
      piscine: createPiscineRepository(db),
      now: () => START + 10 * DAY,
    })
    const report = await service.report(22, null, () => true)

    expect(report.start).toBe('2026-10-05')
    expect(report.people).toHaveLength(20)
    expect(
      (await service.report(22, report.pools[1]?.start ?? '', () => true)).people,
    ).toHaveLength(40)
  })

  it('sin piscineros, vacío y sin fallar', async () => {
    const service = createDropoutService({ db, piscine: createPiscineRepository(db) })
    const report = await service.report(99, null, () => true)

    expect(report.start).toBeNull()
    expect(report.people).toEqual([])
  })
})
