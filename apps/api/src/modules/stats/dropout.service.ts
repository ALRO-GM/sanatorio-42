/**
 * El abandono de la piscina (pedido por Alberto el 2026-11-06,
 * `docs/abandono.md`): para cada piscinero de una piscina, sus horas de cada
 * día en los ordenadores (`seat_sessions`), si lo ha dejado y con qué
 * probabilidad (`dropout.rules.ts`), y con qué se relaciona: horas,
 * aislamiento (la red de asientos), correcciones y proyectos aprobados.
 *
 * Todo sale de la réplica, sin preguntar a 42. La piscina se elige por el día
 * en que empezó; sin decirlo, la del día en que empezó más gente.
 */

import type {
  DropoutComparison,
  DropoutTuning,
  DropoutDay,
  DropoutFactorKey,
  DropoutFactors,
  DropoutPerson,
  DropoutReport,
} from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { localMoment, zonedInstant } from '../../core/time.js'
import { seatSessionsIn, seatingOf } from '../network/index.js'
import type { SeatSession } from '../network/index.js'
import { PISCINE, PISCINE_PROGRESS } from '../replica/index.js'
import {
  DEFAULT_TUNING,
  LAST_COUNTED_DAY,
  LAST_SHOWN_DAY,
  assess,
  correlationsOf,
  factorAnalysis,
  hoursOf,
  profileLambda,
  summarize,
} from './dropout.rules.js'
import { poolAnchorOf, samePool } from './piscine.rules.js'
import type { PiscineRepository } from './stats.repository.js'

const CACHE_MS = 10 * 60_000
/** Las piscinas que se pueden elegir: las últimas. */
const MAX_POOLS = 10
/** Como en la red de asientos: más de 12 h seguidas en un puesto no es estar sentado. */
const MAX_SESSION_MS = 12 * 3_600_000
/** Un día con estas personas empezando o más es una piscina (no quien repite o llega tarde). */
const MIN_POOL = 20

/** Los factores de la tabla de correlaciones, en su orden. */
const DROPOUT_FACTORS: readonly DropoutFactorKey[] = [
  'gone',
  'risk',
  'totalHours',
  'avgHours',
  'firstWeekHours',
  'attendance',
  'weekendShare',
  'isolation',
  'partners',
  'given',
  'received',
  'passed',
]

/** Los que se juntan para buscar factores comunes: todos menos el propio abandono. */
const CANDIDATES = DROPOUT_FACTORS.filter((key) => key !== 'gone' && key !== 'risk')

/** Lo que no depende de los ajustes de una persona: sus horas, los días que vino y sus factores. */
type BasePerson = {
  login: string
  image: string | null
  attendance: {
    hours: (number | null)[]
    present: Set<number>
    inExam: boolean
  }
  /** Si ha venido alguna vez: solo con esa gente se comparan los factores. */
  came: boolean
  factors: Omit<DropoutFactors, 'risk' | 'gone'>
}

/** Lo que se guarda de una piscina 10 minutos: todo menos el riesgo. */
type Base = Pick<DropoutReport, 'campus' | 'start' | 'pools' | 'days' | 'today'> & {
  /** El índice de hoy en `days`. */
  current: number
  zone: string | undefined
  people: BasePerson[]
}

export function createDropoutService(options: {
  db: Db
  piscine: PiscineRepository
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const timeZoneOf = async (campusId: number): Promise<string | undefined> => {
    const result = await options.db.execute({
      sql: 'SELECT time_zone FROM campuses WHERE id = ?',
      args: [campusId],
    })
    const zone = result.rows[0]?.time_zone

    return typeof zone === 'string' && zone !== '' ? zone : undefined
  }
  const bases = createTtlCache<Base>({
    ttlMs: CACHE_MS,
    // Las 10 piscinas de un campus y la de entrada, de varios campus.
    maxEntries: 40,
    now,
  })

  /**
   * Correcciones hechas y recibidas en `[since, until)` por login, y cuándo
   * fue cada una: en la piscina se corrige en persona, así que ese día vino.
   */
  async function correctionsOf(
    campusId: number,
    since: number,
    until: number,
  ): Promise<{
    given: Map<string, number>
    received: Map<string, number>
    seen: { login: string; at: number }[]
  }> {
    const range = [new Date(since).toISOString(), new Date(until).toISOString()]
    // Las de la copia de correcciones y las del historial de piscinas, sin repetir
    // (las dos llevan el id de la corrección de 42).
    const [copied, history] = await Promise.all([
      options.db.execute({
        sql: `SELECT id, corrector, corrected, begin_at FROM corrections
              WHERE campus_id = ? AND begin_at >= ? AND begin_at < ?`,
        args: [campusId, ...range],
      }),
      options.db.execute({
        sql: `SELECT ref, login, kind, at FROM piscine_activity
              WHERE campus_id = ? AND kind IN ('given', 'received') AND at >= ? AND at < ?`,
        args: [campusId, ...range],
      }),
    ])
    const given = new Map<string, Set<number>>()
    const received = new Map<string, Set<number>>()
    const seen: { login: string; at: number }[] = []
    const add = (into: Map<string, Set<number>>, login: string, id: number, at: number) => {
      into.set(login, (into.get(login) ?? new Set()).add(id))
      seen.push({ login, at })
    }

    for (const row of copied.rows) {
      const at = Date.parse(toText(row.begin_at))
      const id = toNumber(row.id)

      add(given, toText(row.corrector).toLowerCase(), id, at)
      add(received, toText(row.corrected).toLowerCase(), id, at)
    }
    for (const row of history.rows) {
      const into = toText(row.kind) === 'given' ? given : received

      add(into, toText(row.login), toNumber(row.ref), Date.parse(toText(row.at)))
    }

    const sizes = (map: Map<string, Set<number>>) =>
      new Map([...map].map(([login, ids]) => [login, ids.size]))

    return { given: sizes(given), received: sizes(received), seen }
  }

  /**
   * Los piscineros del campus: los de ahora (`pool_members`) y los de las
   * piscinas pasadas que ha copiado el historial (`piscine_members`).
   */
  async function membersOf(
    campusId: number,
  ): Promise<{ login: string; begin: number; image: string | null }[]> {
    const result = await options.db.execute({
      sql: `SELECT login, begin_at, image FROM pool_members WHERE campus_id = ?
            UNION ALL
            SELECT login, begin_at, image FROM piscine_members WHERE campus_id = ?`,
      args: [campusId, campusId],
    })
    const seen = new Map<string, { login: string; begin: number; image: string | null }>()

    for (const row of result.rows) {
      const login = toText(row.login).toLowerCase()
      const begin = Date.parse(toText(row.begin_at))

      if (seen.has(login) || Number.isNaN(begin)) continue
      seen.set(login, { login, begin, image: row.image === null ? null : toText(row.image) })
    }

    return [...seen.values()]
  }

  /**
   * Las sesiones del historial de piscinas en `[since, until)` que no estén ya
   * en la copia de puestos, recortadas como allí (como mucho 12 h seguidas).
   */
  async function historySessions(
    campusId: number,
    since: number,
    until: number,
  ): Promise<SeatSession[]> {
    const result = await options.db.execute({
      sql: `SELECT login, host, begin_at, end_at FROM piscine_sessions p
            WHERE campus_id = ? AND begin_at < ? AND end_at > ?
              AND NOT EXISTS (SELECT 1 FROM seat_sessions s WHERE s.location_id = p.location_id)`,
      args: [campusId, new Date(until).toISOString(), new Date(since).toISOString()],
    })

    return result.rows.flatMap((row) => {
      const begin = Math.max(since, Date.parse(toText(row.begin_at)))
      const end = Math.min(until, Date.parse(toText(row.end_at)), begin + MAX_SESSION_MS)

      return end > begin ? [{ login: toText(row.login), host: toText(row.host), begin, end }] : []
    })
  }

  /** Lo aprobado de la piscina según el historial: login → ids de proyecto. */
  async function historyPassed(campusId: number, until: number): Promise<Map<string, Set<number>>> {
    const result = await options.db.execute({
      sql: `SELECT login, ref FROM piscine_activity
            WHERE campus_id = ? AND kind = 'passed' AND at <= ?`,
      args: [campusId, new Date(until).toISOString()],
    })
    const passed = new Map<string, Set<number>>()

    for (const row of result.rows) {
      const login = toText(row.login)

      passed.set(login, (passed.get(login) ?? new Set()).add(toNumber(row.ref)))
    }

    return passed
  }

  /**
   * Cuándo ha tocado cada piscinero un examen de la piscina en `[since, until)`:
   * los intentos (`exam_attempts`, con la fecha de su último cambio) y sus
   * filas del proyecto. Quien está en el examen vino, aunque el puesto de
   * examen no salga en la copia de los puestos (pedido por Alberto el 2026-11-06).
   */
  async function examsOf(
    campusId: number,
    since: number,
    until: number,
  ): Promise<{ login: string; at: number }[]> {
    const ids = await options.piscine.idsOf(
      PISCINE.filter((project) => project.group === 'exam').map((project) => project.slug),
    )

    if (ids.size === 0) return []

    const list = listArg([...ids.values()])
    const range = [new Date(since).toISOString(), new Date(until).toISOString()]
    const result = await options.db.execute({
      sql: `SELECT pm.login, ea.at FROM exam_attempts ea
            JOIN pool_members pm ON pm.user_id = ea.user_id AND pm.campus_id = ?
            WHERE ${inList('ea.project_id')} AND ea.at >= ? AND ea.at < ?
            UNION ALL
            SELECT pm.login, pu.updated_at_42 FROM project_users pu
            JOIN pool_members pm ON pm.user_id = pu.user_id AND pm.campus_id = ?
            WHERE ${inList('pu.project_id')} AND pu.updated_at_42 >= ? AND pu.updated_at_42 < ?
            UNION ALL
            SELECT login, at FROM piscine_activity
            WHERE campus_id = ? AND kind = 'exam' AND at >= ? AND at < ?`,
      args: [campusId, list, ...range, campusId, list, ...range, campusId, ...range],
    })

    return result.rows.map((row) => ({
      login: toText(row.login).toLowerCase(),
      at: Date.parse(toText(row.at)),
    }))
  }

  async function build(campusId: number, wanted: string | null): Promise<Base> {
    const t = now()
    const zone = await timeZoneOf(campusId)
    const members = await membersOf(campusId)
    const dayOfStart = (start: number) => localMoment(start, zone).day
    // Las piscinas para elegir: los días en que empezó bastante gente.
    const byDay = new Map<string, number>()

    for (const member of members) {
      if (member.begin <= t)
        byDay.set(dayOfStart(member.begin), (byDay.get(dayOfStart(member.begin)) ?? 0) + 1)
    }

    const pools = [...byDay]
      .filter(([, people]) => people >= MIN_POOL)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, MAX_POOLS)
      .map(([start, people]) => ({ start, people }))
    // Sin elegir, la más reciente. No la de más gente: con el historial de tres
    // años esa era una de 2024, fuera de las 10 y sin nada copiado (2026-11-07).
    const day = wanted ?? pools[0]?.start ?? null
    const chosen = members
      .filter((member) => day !== null && dayOfStart(member.begin) === day)
      .sort((a, b) => a.begin - b.begin)[0]
    const anchor =
      chosen?.begin ??
      poolAnchorOf(
        members.map((member) => member.begin),
        t,
      )
    const today = localMoment(t, zone).day
    const campus = await options.piscine.campusName(campusId)
    const empty: Base = {
      campus,
      start: null,
      pools,
      days: [],
      today,
      current: 0,
      zone,
      people: [],
    }

    if (anchor === null) return empty

    const swimmers = members.filter((member) => samePool(member.begin, anchor))
    const start = dayOfStart(anchor)
    // Los días del eje y dónde empieza cada uno en la hora del campus.
    const firstMs = zonedInstant(start, 0, zone)
    const days: DropoutDay[] = []
    const bounds: number[] = []

    for (let index = 0; index <= LAST_SHOWN_DAY; index++) {
      const at = zonedInstant(start, index * 24 * 60, zone)
      const local = localMoment(at + 3_600_000, zone)

      if (at > t) break
      days.push({
        day: local.day,
        weekday: local.weekday,
        index,
        week: Math.min(5, Math.floor(index / 7) + 1),
      })
      bounds.push(at)
    }
    bounds.push(zonedInstant(start, days.length * 24 * 60, zone))

    const until = Math.min(t, bounds[bounds.length - 1] ?? t)
    const todayIndex = days.findIndex((day) => day.day === today)
    const logins = new Set(swimmers.map((member) => member.login))
    // Todo el campus, para saber quién se sentó cerca de quién (el aislamiento).
    const [{ sessions: seen }, history] = await Promise.all([
      seatSessionsIn(options.db, campusId, firstMs, until, () => true),
      historySessions(campusId, firstMs, until),
    ])
    const sessions = [...seen, ...history]
    const seating = await seatingOf(sessions)
    const hours = new Map<string, number[]>()

    for (const session of sessions) {
      const login = session.login.toLowerCase()

      if (!logins.has(login)) continue
      const row = hours.get(login) ?? days.map(() => 0)

      hours.set(login, row)
      for (let index = 0; index < days.length; index++) {
        const from = Math.max(session.begin, bounds[index] ?? 0)
        const to = Math.min(session.end, bounds[index + 1] ?? 0)

        if (to > from) row[index] = (row[index] ?? 0) + (to - from) / 3_600_000
      }
    }

    const ids = await options.piscine.idsOf(PISCINE_PROGRESS.map((project) => project.slug))
    const [rows, corrections, exams, archived] = await Promise.all([
      options.piscine.rows(campusId, [...ids.values()]),
      correctionsOf(campusId, firstMs, until),
      examsOf(campusId, firstMs, until),
      historyPassed(campusId, t),
    ])
    // Los días en que vino sin que lo digan los puestos: una corrección o un examen.
    const dayIndexOf = (at: number): number =>
      bounds.findIndex((from, index) => at >= from && at < (bounds[index + 1] ?? from))
    const present = new Map<string, Set<number>>()
    const examDays = new Map<string, Set<number>>()
    const mark = (into: Map<string, Set<number>>, login: string, at: number) => {
      const index = dayIndexOf(at)

      if (index < 0 || !logins.has(login)) return
      into.set(login, (into.get(login) ?? new Set()).add(index))
    }

    for (const each of corrections.seen) mark(present, each.login, each.at)
    for (const each of exams) {
      mark(present, each.login, each.at)
      mark(examDays, each.login, each.at)
    }
    // Lo aprobado de la réplica y lo del historial, sin repetir proyecto.
    const counted = new Set(ids.values())
    const passedIds = new Map<string, Set<number>>()

    for (const row of rows) {
      if (row.doneAt !== null && row.doneAt <= t)
        passedIds.set(row.login, (passedIds.get(row.login) ?? new Set()).add(row.projectId))
    }
    for (const [login, projects] of archived) {
      for (const id of projects) {
        if (counted.has(id)) passedIds.set(login, (passedIds.get(login) ?? new Set()).add(id))
      }
    }
    const passed = new Map([...passedIds].map(([login, projects]) => [login, projects.size]))

    const current = todayIndex === -1 ? days.length : todayIndex
    const people: BasePerson[] = swimmers.map((member) => {
      // Lo de antes de que empezara su propia piscina no es suyo.
      const own = Math.max(0, Math.floor((member.begin - firstMs) / 86_400_000))
      const raw = hours.get(member.login) ?? days.map(() => 0)
      const line = days.map((_, index) =>
        index < own || index > current ? null : Math.round((raw[index] ?? 0) * 10) / 10,
      )
      const attendance = {
        hours: line,
        present: present.get(member.login) ?? new Set<number>(),
        inExam: examDays.get(member.login)?.has(current) === true,
      }
      // Lo que no depende de los ajustes: si vino alguna vez y su asistencia.
      const plain = assess(attendance, days, current)
      const seat = seating.people.get(member.login)

      return {
        login: member.login,
        image: member.image,
        attendance,
        came: plain.lastSeen !== null,
        factors: {
          ...hoursOf(line, days),
          attendance: plain.attendance,
          isolation:
            seat === undefined || seat.hours === 0
              ? 0
              : Math.round((100 * seat.aloneHours) / seat.hours),
          partners: seat?.partners ?? 0,
          given: corrections.given.get(member.login) ?? 0,
          received: corrections.received.get(member.login) ?? 0,
          passed: passed.get(member.login) ?? 0,
        },
      }
    })

    return { ...empty, start, days, current, zone, people }
  }

  /** El informe con unos ajustes: lo único que se rehace al mover un deslizador. */
  function apply(
    base: Base,
    tuning: DropoutTuning,
    sees: (login: string) => boolean,
  ): DropoutReport {
    const { days, current, zone, start } = base
    // Los factores de cada cual frente a la media de quien ha venido alguna vez.
    const came = base.people.filter((person) => person.came)
    const profiles = new Map(
      profileLambda(
        came.map((person) => person.factors),
        tuning.weights,
      ).map((value, index) => [came[index]?.login ?? '', value]),
    )
    const dayAt = (index: number) => days[index]?.day ?? ''
    const people: DropoutPerson[] = base.people.map((person) => {
      const assessment = assess(
        person.attendance,
        days,
        current,
        tuning,
        profiles.get(person.login) ?? 0,
      )

      return {
        login: person.login,
        image: person.image,
        status: assessment.status,
        hours: [...person.attendance.hours],
        lastSeen: assessment.lastSeen === null ? null : dayAt(assessment.lastSeen),
        missedDays: assessment.missedDays,
        missedWeekdays: assessment.missedWeekdays,
        leftBetween:
          assessment.leftBetween === null || start === null
            ? null
            : [
                dayAt(assessment.leftBetween[0]),
                // El siguiente puede ser hoy o después de lo dibujado.
                localMoment(
                  zonedInstant(start, (assessment.leftBetween[1] * 24 + 12) * 60, zone),
                  zone,
                ).day,
              ],
        leftWeek: assessment.leftWeek,
        reasons: assessment.reasons,
        factors: {
          risk: assessment.risk,
          gone: assessment.status === 'gone' ? 1 : 0,
          ...person.factors,
        },
      }
    })

    // Las correlaciones, con quien ha venido alguna vez: de quien no vino no se sabe nada.
    const sample = people
      .filter((person) => person.status !== 'never')
      .map((person) => person.factors)
    const { pairs, groups } = factorAnalysis(sample, CANDIDATES, 'gone')
    const visible = people
      .filter((person) => sees(person.login))
      .sort((a, b) => b.factors.risk - a.factors.risk || a.login.localeCompare(b.login))
    const count = (status: DropoutPerson['status']) =>
      visible.filter((person) => person.status === status).length

    return {
      campus: base.campus,
      start,
      pools: base.pools,
      days,
      today: base.today,
      tuning,
      defaults: DEFAULT_TUNING,
      counts: {
        people: visible.length,
        gone: count('gone'),
        likely: count('likely'),
        doubt: count('doubt'),
        active: count('active'),
        never: count('never'),
        inExam: visible.filter((person) => person.reasons.includes('inExam')).length,
      },
      people: visible,
      factors: [...DROPOUT_FACTORS],
      correlations: correlationsOf(sample, DROPOUT_FACTORS),
      pairs,
      groups,
      sample: sample.length,
    }
  }

  return {
    /**
     * El abandono de una piscina del campus (`start`, su primer día; `null`,
     * la del día en que empezó más gente), con unos ajustes (`tuning`). `sees`
     * quita a las personas ocultas. Las horas y los factores se guardan 10
     * minutos; los ajustes solo rehacen el riesgo, que es al momento.
     */
    async report(
      campusId: number,
      start: string | null,
      sees: (login: string) => boolean,
      tuning: DropoutTuning = DEFAULT_TUNING,
    ): Promise<DropoutReport> {
      const base = await bases.get(`${campusId}:${start ?? ''}`, () => build(campusId, start))

      return apply(base, tuning, sees)
    },

    /**
     * Varias piscinas del campus en cifras, cada una y todas juntas
     * (`starts`; vacío, todas las que se pueden elegir). Se rehacen de una en
     * una: cada una lee los puestos de todo el campus de su mes.
     */
    async compare(
      campusId: number,
      starts: readonly string[],
      sees: (login: string) => boolean,
      tuning: DropoutTuning = DEFAULT_TUNING,
    ): Promise<DropoutComparison> {
      const latest = await bases.get(`${campusId}:`, () => build(campusId, null))
      const available = latest.pools
      const chosen = available
        .map((pool) => pool.start)
        .filter((start) => starts.length === 0 || starts.includes(start))
      const pools: { start: string; people: DropoutPerson[]; days: DropoutDay[] }[] = []

      for (const start of chosen) {
        const base = await bases.get(`${campusId}:${start}`, () => build(campusId, start))
        const report = apply(base, tuning, sees)

        pools.push({ start, people: report.people, days: report.days })
      }

      return {
        pools: pools.map((pool) => summarize([pool], pool.start)),
        overall: summarize(pools, null),
        available,
        lastDay: LAST_COUNTED_DAY,
        tuning,
      }
    },
  }
}
