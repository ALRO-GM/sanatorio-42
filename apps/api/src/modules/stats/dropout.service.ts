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
  DropoutDay,
  DropoutFactorKey,
  DropoutFactors,
  DropoutPerson,
  DropoutReport,
} from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { localMoment, zonedInstant } from '../../core/time.js'
import { seatSessionsIn, seatingOf } from '../network/index.js'
import { PISCINE_PROGRESS } from '../replica/index.js'
import { LAST_SHOWN_DAY, assess, correlationsOf, factorAnalysis, hoursOf } from './dropout.rules.js'
import { poolAnchorOf, samePool } from './piscine.rules.js'
import type { PiscineRepository } from './stats.repository.js'

const CACHE_MS = 10 * 60_000
/** Un día de piscina con estas personas o más se ofrece como piscina para elegir. */
const MIN_POOL = 5

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
  const reports = createTtlCache<Omit<DropoutReport, 'people'> & { people: DropoutPerson[] }>({
    ttlMs: CACHE_MS,
    maxEntries: 20,
    now,
  })

  /** Correcciones hechas y recibidas en `[since, until)` por login. */
  async function correctionsOf(
    campusId: number,
    since: number,
    until: number,
  ): Promise<{ given: Map<string, number>; received: Map<string, number> }> {
    const result = await options.db.execute({
      sql: `SELECT corrector, corrected FROM corrections
            WHERE campus_id = ? AND begin_at >= ? AND begin_at < ?`,
      args: [campusId, new Date(since).toISOString(), new Date(until).toISOString()],
    })
    const given = new Map<string, number>()
    const received = new Map<string, number>()

    for (const row of result.rows) {
      const corrector = toText(row.corrector).toLowerCase()
      const corrected = toText(row.corrected).toLowerCase()

      given.set(corrector, (given.get(corrector) ?? 0) + 1)
      received.set(corrected, (received.get(corrected) ?? 0) + 1)
    }

    return { given, received }
  }

  async function build(campusId: number, wanted: string | null): Promise<DropoutReport> {
    const t = now()
    const zone = await timeZoneOf(campusId)
    const members = await options.piscine.members(campusId)
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
      .map(([start, people]) => ({ start, people }))
    const chosen = members.find((member) => wanted !== null && dayOfStart(member.begin) === wanted)
    const anchor =
      chosen?.begin ??
      poolAnchorOf(
        members.map((member) => member.begin),
        t,
      )
    const today = localMoment(t, zone).day
    const campus = await options.piscine.campusName(campusId)
    const empty = {
      campus,
      start: null,
      pools,
      days: [],
      today,
      people: [],
      factors: [...DROPOUT_FACTORS],
      correlations: [],
      pairs: [],
      groups: [],
      sample: 0,
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
    const { sessions } = await seatSessionsIn(options.db, campusId, firstMs, until, () => true)
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
    const [rows, corrections] = await Promise.all([
      options.piscine.rows(campusId, [...ids.values()]),
      correctionsOf(campusId, firstMs, until),
    ])
    const passed = new Map<string, number>()

    for (const row of rows) {
      if (row.doneAt !== null && row.doneAt <= t)
        passed.set(row.login, (passed.get(row.login) ?? 0) + 1)
    }

    const current = todayIndex === -1 ? days.length : todayIndex
    const people: DropoutPerson[] = swimmers.map((member) => {
      // Lo de antes de que empezara su propia piscina no es suyo.
      const own = Math.max(0, Math.floor((member.begin - firstMs) / 86_400_000))
      const raw = hours.get(member.login) ?? days.map(() => 0)
      const line = days.map((_, index) =>
        index < own || index > current ? null : Math.round((raw[index] ?? 0) * 10) / 10,
      )
      const assessment = assess({ hours: line }, days, current)
      const seat = seating.people.get(member.login)
      const factors: DropoutFactors = {
        risk: assessment.risk,
        gone: assessment.status === 'gone' ? 1 : 0,
        ...hoursOf(line, days),
        attendance: assessment.attendance,
        isolation:
          seat === undefined || seat.hours === 0
            ? 0
            : Math.round((100 * seat.aloneHours) / seat.hours),
        partners: seat?.partners ?? 0,
        given: corrections.given.get(member.login) ?? 0,
        received: corrections.received.get(member.login) ?? 0,
        passed: passed.get(member.login) ?? 0,
      }
      const dayAt = (index: number) => days[index]?.day ?? ''

      return {
        login: member.login,
        image: member.image,
        status: assessment.status,
        hours: line,
        lastSeen: assessment.lastSeen === null ? null : dayAt(assessment.lastSeen),
        missedDays: assessment.missedDays,
        missedWeekdays: assessment.missedWeekdays,
        leftBetween:
          assessment.leftBetween === null
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
        factors,
      }
    })

    // Las correlaciones, con quien ha venido alguna vez: de quien no vino no se sabe nada.
    const sample = people
      .filter((person) => person.status !== 'never')
      .map((person) => person.factors)
    const { pairs, groups } = factorAnalysis(sample, CANDIDATES, 'gone')

    return {
      ...empty,
      start,
      days,
      people: people.sort(
        (a, b) => b.factors.risk - a.factors.risk || a.login.localeCompare(b.login),
      ),
      correlations: correlationsOf(sample, DROPOUT_FACTORS),
      pairs,
      groups,
      sample: sample.length,
    }
  }

  return {
    /**
     * El abandono de una piscina del campus (`start`, su primer día; `null`,
     * la del día en que empezó más gente). `sees` quita a las personas ocultas.
     */
    async report(
      campusId: number,
      start: string | null,
      sees: (login: string) => boolean,
    ): Promise<DropoutReport> {
      const report = await reports.get(`${campusId}:${start ?? ''}`, () => build(campusId, start))

      return { ...report, people: report.people.filter((person) => sees(person.login)) }
    },
  }
}
