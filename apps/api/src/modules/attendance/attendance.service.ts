/**
 * Asistencia validada con códigos, y el tiempo que sale de ella.
 *
 * Quien organiza una pizarra o una sesión de ayuda tiene dos códigos, uno para
 * el principio y otro para el final. Quien asiste los escribe. De ahí salen dos
 * cosas: si hubo sesión (y por tanto XP) y cuánto duró. Ese tiempo se quiere
 * poder enseñar al staff de 42, así que tiene que aguantar una discusión:
 *
 * - **Sin los dos códigos no hay nada**: ni XP ni minutos.
 * - **Los códigos caducan**: el de inicio solo vale alrededor de la hora de
 *   inicio; el de fin, cuando ha pasado un mínimo desde el de inicio y hasta un
 *   rato después de la hora de fin (`attendance.rules.ts`).
 * - **El tiempo se recorta** al horario previsto y se guarda ya calculado, con
 *   los datos del evento de ese momento.
 * - **Tope de códigos equivocados** por persona y evento: no se adivinan a base
 *   de probar.
 * - **Queda registro** de cada intento, saliera bien o mal.
 *
 * Este módulo no sabe qué es una pizarra ni una reserva: quien lo llama le dice
 * el horario y quién organiza. Así `boards` y `help` pueden preguntarle si hubo
 * asistencia sin depender de `meet`.
 */

import { randomInt } from 'node:crypto'

import type {
  AttendanceReport,
  AttendanceReportRow,
  CheckinLogEntry,
  MeetCheckin,
  MeetPresence,
  MeetWindow,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { localMoment } from '../../core/time.js'
import { day, parse } from '../../core/validation.js'
import {
  MAX_FAILED_ATTEMPTS,
  MIN_STAY_MS,
  unionMinutes,
  validSpan,
  windowOf,
} from './attendance.rules.js'

export type AttendanceServiceOptions = {
  db: Db
  /** Zona horaria de un campus, para poner los días y las horas del informe en la suya. */
  timeZoneOf: (campusId: number) => Promise<string | undefined>
  now?: () => number
}

/** Lo que hay que saber de un evento para validar su asistencia. */
export type AttendanceEvent = {
  /** Su id en el calendario: `board:12`, `help:booking:7`. */
  id: string
  campusId: number
  /** Quien imparte o ayuda: enseña los códigos y no los valida. */
  host: string
  title: string
  /** Horario previsto, en milisegundos. */
  startsAt: number
  endsAt: number
}

/** El id en el calendario de los eventos que validan la asistencia con códigos. */
export const EVENT_ID = {
  board: (boardId: number): string => `board:${boardId}`,
  help: (bookingId: number): string => `help:booking:${bookingId}`,
}

const MINUTE = 60_000
/** Marca de UTF-8: con ella delante, Excel no estropea las tildes de un CSV. */
const BOM = String.fromCharCode(0xfeff)
const DAY = 24 * 60 * MINUTE

/** Sin letras ni números que se confundan al leerlos en voz alta o en una pizarra. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

/** Días que abarca el informe si no se dice otra cosa, y lo máximo que se puede pedir. */
const REPORT_DEFAULT_DAYS = 30
const REPORT_MAX_DAYS = 366

const reportSchema = z.object({ from: day.optional(), to: day.optional() })

type Outcome = CheckinLogEntry['outcome']

/** Una fila del informe con lo que hace falta para pasarla a CSV. */
type ReportRow = AttendanceReportRow & { campusId: number }

/** Un código nuevo, distinto de `other`. */
function newCode(other?: string): string {
  for (;;) {
    const code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('')

    if (code !== other) return code
  }
}

const iso = (at: number): string => new Date(at).toISOString()

function presenceOf(row: Record<string, unknown>): MeetPresence {
  return {
    login: toText(row.login),
    startedAt: typeof row.started_at === 'string' ? row.started_at : null,
    endedAt: typeof row.ended_at === 'string' ? row.ended_at : null,
    minutes:
      row.valid_minutes === null || row.valid_minutes === undefined
        ? null
        : toNumber(row.valid_minutes),
  }
}

/**
 * Una celda de CSV. Lo que empieza por `=`, `+`, `-` o `@` lo ejecutaría una
 * hoja de cálculo como fórmula, y los títulos los escribe la gente: se desactiva
 * con un apóstrofo delante.
 */
function cell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text

  return `"${safe.replaceAll('"', '""')}"`
}

export function createAttendanceService(options: AttendanceServiceOptions) {
  const { db, timeZoneOf } = options
  const now = options.now ?? Date.now

  /** Los códigos de un evento. Se crean la primera vez que alguien los pide. */
  async function codes(eventId: string): Promise<{ start: string; end: string }> {
    const start = newCode()

    await db.execute({
      sql: `INSERT OR IGNORE INTO event_codes (event_id, start_code, end_code, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [eventId, start, newCode(start), iso(now())],
    })

    const row = (
      await db.execute({
        sql: 'SELECT start_code, end_code FROM event_codes WHERE event_id = ?',
        args: [eventId],
      })
    ).rows[0]

    return { start: toText(row?.start_code), end: toText(row?.end_code) }
  }

  async function record(
    eventId: string,
    login: string,
    code: string,
    phase: 'start' | 'end' | null,
    outcome: Outcome,
  ): Promise<void> {
    await db.execute({
      sql: `INSERT INTO event_checkins (event_id, login, code, phase, outcome, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [eventId, login, code, phase, outcome, iso(now())],
    })
  }

  /** Códigos equivocados que lleva esa persona en ese evento. */
  async function failures(eventId: string, login: string): Promise<number> {
    const result = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM event_checkins
            WHERE event_id = ? AND login = ? AND outcome = 'wrong_code'`,
      args: [eventId, login],
    })

    return toNumber(result.rows[0]?.total)
  }

  async function rowOf(eventId: string, login: string): Promise<Record<string, unknown> | null> {
    const result = await db.execute({
      sql: 'SELECT * FROM event_attendance WHERE event_id = ? AND login = ?',
      args: [eventId, login],
    })

    return result.rows[0] ?? null
  }

  /** Las filas con tiempo validado que empiezan dentro del periodo, de una persona o de todas. */
  async function load(login: string | null, from: number, to: number): Promise<ReportRow[]> {
    const result = await db.execute({
      sql: `SELECT * FROM event_attendance
            WHERE valid_minutes > 0 AND valid_from >= ? AND valid_from < ?
              ${login === null ? '' : 'AND (login = ?3 OR host = ?3)'}
            ORDER BY valid_from, event_id, login`,
      args: login === null ? [iso(from), iso(to)] : [iso(from), iso(to), login],
    })
    const zones = new Map<number, string | undefined>()
    const rows: ReportRow[] = []
    const byEvent = new Map<string, Record<string, unknown>[]>()

    for (const row of result.rows) {
      const eventId = toText(row.event_id)

      byEvent.set(eventId, [...(byEvent.get(eventId) ?? []), row])
    }

    for (const [eventId, guests] of byEvent) {
      const first = guests[0]

      if (first === undefined) continue

      const campusId = toNumber(first.campus_id)

      if (!zones.has(campusId)) zones.set(campusId, await timeZoneOf(campusId))

      const host = toText(first.host)
      const startsAt = Date.parse(toText(first.starts_at))
      const scheduledMinutes = Math.floor((Date.parse(toText(first.ends_at)) - startsAt) / MINUTE)
      const common = {
        eventId,
        kind: eventId.startsWith('board:') ? ('board' as const) : ('help' as const),
        title: toText(first.title),
        day: localMoment(startsAt, zones.get(campusId)).day,
        scheduledMinutes,
        campusId,
      }
      const spans = guests.map((guest) => ({
        login: toText(guest.login),
        from: Date.parse(toText(guest.valid_from)),
        to: Date.parse(toText(guest.valid_to)),
        minutes: toNumber(guest.valid_minutes),
      }))

      for (const span of spans) {
        if (login === null || span.login === login) {
          rows.push({
            ...common,
            login: span.login,
            role: 'guest',
            from: iso(span.from),
            to: iso(span.to),
            minutes: span.minutes,
            with: [host],
          })
        }
      }

      // Quien organiza no valida códigos: su tiempo es el rato en que tuvo a
      // alguien validado, sin contar dos veces a quienes coinciden.
      if (login === null || host === login) {
        rows.push({
          ...common,
          login: host,
          role: 'host',
          from: iso(Math.min(...spans.map((span) => span.from))),
          to: iso(Math.max(...spans.map((span) => span.to))),
          minutes: Math.min(scheduledMinutes, unionMinutes(spans)),
          with: spans.map((span) => span.login),
        })
      }
    }

    return rows.sort(
      (a, b) =>
        a.from.localeCompare(b.from) ||
        a.eventId.localeCompare(b.eventId) ||
        a.login.localeCompare(b.login),
    )
  }

  /** El periodo pedido, en días y en instantes. Sin fechas, los últimos treinta días. */
  function period(input: unknown): { from: string; to: string; start: number; end: number } {
    const wanted = parse(reportSchema, input)
    const to = wanted.to ?? iso(now()).slice(0, 10)
    const end = Date.parse(`${to}T00:00:00.000Z`) + DAY
    const from = wanted.from ?? iso(end - REPORT_DEFAULT_DAYS * DAY).slice(0, 10)
    const start = Date.parse(`${from}T00:00:00.000Z`)

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      throw domainError('invalid_input', 'El periodo no es válido')
    }
    if (end - start > REPORT_MAX_DAYS * DAY) {
      throw domainError('invalid_input', 'El periodo no puede pasar de un año')
    }

    return { from, to, start, end }
  }

  return {
    codes,

    /** Cuándo vale cada código de ese evento. */
    window(event: AttendanceEvent): MeetWindow {
      const window = windowOf(event)

      return {
        startFrom: iso(window.startFrom),
        startUntil: iso(window.startUntil),
        endUntil: iso(window.endUntil),
        minStay: MIN_STAY_MS / MINUTE,
      }
    },

    /** Lo que ha validado cada persona en un evento. */
    async presences(eventId: string): Promise<MeetPresence[]> {
      const result = await db.execute({
        sql: 'SELECT * FROM event_attendance WHERE event_id = ? ORDER BY login',
        args: [eventId],
      })

      return result.rows.map(presenceOf)
    },

    /** Códigos equivocados que le quedan a esa persona en ese evento. */
    async attemptsLeft(eventId: string, login: string): Promise<number> {
      return Math.max(0, MAX_FAILED_ATTEMPTS - (await failures(eventId, login)))
    },

    /**
     * Quiénes tienen asistencia válida en un evento: los dos códigos y tiempo
     * contado. Es lo que `boards` y `help` miran antes de dar XP.
     */
    async attended(eventId: string): Promise<string[]> {
      const result = await db.execute({
        sql: `SELECT login FROM event_attendance
              WHERE event_id = ? AND valid_minutes > 0 ORDER BY login`,
        args: [eventId],
      })

      return result.rows.map((row) => toText(row.login))
    },

    /**
     * Valida un código. El de inicio marca cuándo empezaste; el de fin, cuándo
     * terminaste, y con él se calcula y se guarda el tiempo que cuenta.
     *
     * Cada intento queda en el registro, también los que fallan.
     *
     * @throws {DomainError} `invalid_input` si el código no es de ese evento;
     *   `forbidden` si ya has fallado demasiadas veces; `conflict` si es pronto
     *   o tarde para ese código, o si falta el de inicio.
     */
    async checkin(event: AttendanceEvent, login: string, code: string): Promise<MeetCheckin> {
      const at = now()
      const reject = async (
        phase: 'start' | 'end' | null,
        outcome: Outcome,
        error: ReturnType<typeof domainError>,
      ): Promise<never> => {
        await record(event.id, login, code, phase, outcome)

        throw error
      }

      const failed = await failures(event.id, login)

      if (failed >= MAX_FAILED_ATTEMPTS) {
        return reject(
          null,
          'locked',
          domainError(
            'forbidden',
            'Has escrito demasiados códigos equivocados en este evento: ya no puedes validar',
          ),
        )
      }

      const valid = await codes(event.id)
      const phase = code === valid.start ? 'start' : code === valid.end ? 'end' : null

      if (phase === null) {
        const left = MAX_FAILED_ATTEMPTS - failed - 1

        return reject(
          null,
          'wrong_code',
          domainError(
            'invalid_input',
            left > 0
              ? `Ese código no es de este evento. Te quedan ${left} intentos`
              : 'Ese código no es de este evento, y era tu último intento',
          ),
        )
      }

      const window = windowOf(event)
      const before = await rowOf(event.id, login)
      const startedAt = typeof before?.started_at === 'string' ? before.started_at : null

      if (phase === 'start') {
        // El primer momento es el que cuenta: volver a escribirlo no lo mueve.
        if (startedAt !== null) {
          await record(event.id, login, code, phase, 'repeat')

          return { phase, presence: presenceOf(before ?? {}) }
        }
        if (at < window.startFrom) {
          return reject(
            phase,
            'too_early',
            domainError('conflict', 'Todavía es pronto para validar el código de inicio'),
          )
        }
        if (at > window.startUntil) {
          return reject(
            phase,
            'too_late',
            domainError('conflict', 'El código de inicio ya ha caducado'),
          )
        }

        await db.execute({
          sql: `INSERT INTO event_attendance
                  (event_id, login, started_at, campus_id, host, title, starts_at, ends_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (event_id, login) DO UPDATE SET
                  started_at = COALESCE(event_attendance.started_at, excluded.started_at)`,
          args: [
            event.id,
            login,
            iso(at),
            event.campusId,
            event.host,
            event.title,
            iso(event.startsAt),
            iso(event.endsAt),
          ],
        })
      } else {
        if (startedAt === null) {
          return reject(
            phase,
            'no_start',
            domainError('conflict', 'Valida primero el código de inicio'),
          )
        }
        if (typeof before?.ended_at === 'string') {
          await record(event.id, login, code, phase, 'repeat')

          return { phase, presence: presenceOf(before) }
        }
        if (at < Date.parse(startedAt) + MIN_STAY_MS) {
          return reject(
            phase,
            'too_early',
            domainError(
              'conflict',
              `El código de fin vale cuando han pasado ${MIN_STAY_MS / MINUTE} minutos desde el de inicio`,
            ),
          )
        }
        if (at > window.endUntil) {
          return reject(
            phase,
            'too_late',
            domainError('conflict', 'El código de fin ya ha caducado'),
          )
        }

        const span = validSpan(Date.parse(startedAt), at, event)

        // El horario y quién organiza se guardan como estén al terminar: si la
        // pizarra se movió entre un código y otro, manda el horario definitivo.
        await db.execute({
          sql: `UPDATE event_attendance SET
                  ended_at = ?, valid_from = ?, valid_to = ?, valid_minutes = ?,
                  campus_id = ?, host = ?, title = ?, starts_at = ?, ends_at = ?
                WHERE event_id = ? AND login = ? AND ended_at IS NULL`,
          args: [
            iso(at),
            iso(span.from),
            iso(span.to),
            span.minutes,
            event.campusId,
            event.host,
            event.title,
            iso(event.startsAt),
            iso(event.endsAt),
            event.id,
            login,
          ],
        })
      }

      await record(event.id, login, code, phase, 'ok')

      return { phase, presence: presenceOf((await rowOf(event.id, login)) ?? {}) }
    },

    /**
     * Las horas validadas en un periodo, de una persona o de todo el mundo.
     *
     * Los días del periodo se cuentan en UTC; el día de cada fila, en la hora
     * de su campus.
     *
     * @param login `null` para todas las personas.
     * @param input `{ from?, to? }` en `YYYY-MM-DD`, los dos incluidos.
     */
    async report(login: string | null, input: unknown): Promise<AttendanceReport> {
      const { from, to, start, end } = period(input)
      const rows = (await load(login, start, end)).map(
        ({ campusId: _campusId, ...row }): AttendanceReportRow => row,
      )

      return { from, to, rows, totalMinutes: rows.reduce((sum, row) => sum + row.minutes, 0) }
    },

    /**
     * El mismo informe, como CSV para abrir en una hoja de cálculo, con el
     * periodo y los totales que hacen falta para emitirlo como documento.
     */
    async reportCsv(
      login: string | null,
      input: unknown,
    ): Promise<{ csv: string; from: string; to: string; rows: number; totalMinutes: number }> {
      const { from, to, start, end } = period(input)
      let rows = 0
      let totalMinutes = 0
      const zones = new Map<number, string | undefined>()
      const lines = [
        [
          'login',
          'rol',
          'tipo',
          'evento',
          'titulo',
          'fecha',
          'inicio',
          'fin',
          'minutos_validados',
          'minutos_previstos',
          'con',
        ]
          .map(cell)
          .join(';'),
      ]

      for (const row of await load(login, start, end)) {
        if (!zones.has(row.campusId)) zones.set(row.campusId, await timeZoneOf(row.campusId))

        const zone = zones.get(row.campusId)
        const time = (at: string): string => {
          const { minutes } = localMoment(Date.parse(at), zone)

          return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
        }

        rows += 1
        totalMinutes += row.minutes
        lines.push(
          [
            row.login,
            row.role === 'host' ? 'organiza' : 'asiste',
            row.kind === 'board' ? 'pizarra' : 'ayuda',
            row.eventId,
            row.title,
            row.day,
            time(row.from),
            time(row.to),
            row.minutes,
            row.scheduledMinutes,
            row.with.join(' '),
          ]
            .map(cell)
            .join(';'),
        )
      }

      return { csv: `${BOM}${lines.join('\r\n')}\r\n`, from, to, rows, totalMinutes }
    },

    /** Los intentos de validar códigos de un evento, del más antiguo al más reciente. */
    async log(eventId: string): Promise<CheckinLogEntry[]> {
      const result = await db.execute({
        sql: `SELECT id, event_id, login, code, phase, outcome, created_at FROM event_checkins
              WHERE event_id = ? ORDER BY id LIMIT 1000`,
        args: [eventId],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        eventId: toText(row.event_id),
        login: toText(row.login),
        code: toText(row.code),
        phase: typeof row.phase === 'string' ? (row.phase as 'start' | 'end') : null,
        outcome: toText(row.outcome) as Outcome,
        at: toText(row.created_at),
      }))
    },
  }
}

export type AttendanceService = ReturnType<typeof createAttendanceService>
