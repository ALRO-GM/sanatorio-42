/**
 * Avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`).
 *
 * Dos fuentes que la web enseña juntas en una ventanita flotante:
 *
 * - **Avisos** de quien administra (la limpieza de taquillas): a un grupo
 *   (estudiantes, piscineros o todos) y, si se quiere, a un campus. Cada cual
 *   lo cierra o lo deja; lo cerrado se guarda aquí, no en el navegador, para
 *   que no vuelva a salir en otro.
 * - **Lo fijado** por cada cual: un evento de su calendario, su próximo
 *   compromiso (que se busca cada vez, así que cambia solo cuando pasa) o algo
 *   suyo con título y hora.
 *
 * Lo que ya ha pasado se sigue dando un rato (`GRACE_MS`) para que la web
 * enseñe «ya ha pasado» antes de quitarlo; después deja de salir.
 */

import type {
  CalendarEvent,
  Countdown,
  CountdownGroup,
  CountdownNoticeReport,
} from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toNumberOrNull, toText, toTextOrNull } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { clockOf } from '../../core/options.js'
import type { Clock } from '../../core/options.js'
import { isoAt } from '../../core/time.js'
import { id, optionalText, parse, text } from '../../core/validation.js'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
/** Lo que ya ha pasado se sigue dando este rato: la web enseña «ya ha pasado». */
export const GRACE_MS = 30 * MINUTE
/** Hasta dónde se puede poner una cuenta atrás: un año da para cualquier aviso. */
const MAX_AHEAD_MS = 366 * DAY
/** Cuánto se mira hacia delante para el próximo compromiso y para fijar un evento. */
const LOOKAHEAD_MS = 60 * DAY
/** Lo fijado por persona a la vez: una ventanita, no una agenda. */
export const MAX_PINS = 12
/** Avisos que se enseñan en el panel, del más reciente al más antiguo. */
const REPORT_LIMIT = 50

const GROUPS = ['all', 'students', 'pool'] as const satisfies readonly CountdownGroup[]

const instant = z.iso
  .datetime({ offset: true, message: 'la hora va en ISO-8601' })
  .transform((value) => Date.parse(value))

const noticeSchema = z.object({
  title: optionalText(120),
  body: optionalText(1000),
  preset: z
    .enum(['lockers'])
    .nullish()
    .transform((value) => value ?? null),
  at: instant,
  group: z.enum(GROUPS),
  campusId: id.nullish().transform((value) => value ?? null),
})

const pinSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('event'), eventId: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal('next') }),
  z.object({ kind: z.literal('custom'), title: text(120), at: instant }),
])

/** Los eventos de alguien entre dos instantes: lo da el calendario. */
type EventsOf = (actor: Actor, from: number, to: number) => Promise<CalendarEvent[]>

export type CountdownsServiceOptions = Clock & {
  db: Db
  /** Sin calendario (tests de otros módulos), no hay eventos que fijar. */
  events?: EventsOf
}

/** `true` si un aviso con ese grupo y campus es para esa persona. */
function reaches(group: CountdownGroup, campusId: number | null, actor: Actor): boolean {
  const inGroup = group === 'all' || (group === 'pool' ? actor.pool === true : actor.pool !== true)

  return inGroup && (campusId === null || campusId === actor.campusId)
}

/**
 * El próximo compromiso: lo primero que empieza a partir de ahora y a lo que
 * vas (lo tuyo, lo apuntado, una corrección o un examen). Las franjas en las
 * que te ofreces a ayudar no son un compromiso con nadie.
 */
function nextOf(events: readonly CalendarEvent[], now: number): CalendarEvent | null {
  return (
    events
      .filter(
        (event) =>
          Date.parse(event.start) > now &&
          event.joined !== false &&
          event.kind !== 'event_open' &&
          !event.id.startsWith('help:window:'),
      )
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  )
}

export function createCountdownsService(options: CountdownsServiceOptions) {
  const { db } = options
  const now = clockOf(options)
  const eventsOf: EventsOf = options.events ?? (() => Promise.resolve([]))

  const notice = (row: Record<string, unknown>): Countdown => ({
    id: toNumber(row.id),
    kind: 'notice',
    title: toTextOrNull(row.title),
    body: toTextOrNull(row.body),
    preset: toTextOrNull(row.preset) === 'lockers' ? 'lockers' : null,
    at: toText(row.target_at),
    eventId: null,
    from: toText(row.created_by),
  })

  const groupOf = (row: Record<string, unknown>): CountdownGroup =>
    GROUPS.find((group) => group === row.target_group) ?? 'all'

  /** Los avisos de quien administra que esa persona tiene a la vista. */
  const noticesFor = async (actor: Actor): Promise<Countdown[]> => {
    const result = await db.execute({
      sql: `SELECT n.* FROM countdown_notices n
            WHERE n.target_at > ?
              AND NOT EXISTS (
                SELECT 1 FROM countdown_dismissals d WHERE d.notice_id = n.id AND d.login = ?
              )
            ORDER BY n.target_at, n.id`,
      args: [isoAt(now() - GRACE_MS), actor.login],
    })

    return result.rows
      .filter((row) => reaches(groupOf(row), toNumberOrNull(row.campus_id), actor))
      .map(notice)
  }

  /** Lo fijado por esa persona, con el próximo compromiso ya buscado. */
  const pinsFor = async (actor: Actor): Promise<Countdown[]> => {
    const result = await db.execute({
      sql: 'SELECT * FROM countdown_pins WHERE login = ? ORDER BY id',
      args: [actor.login],
    })
    const rows = result.rows.filter(
      (row) => row.target_at === null || Date.parse(toText(row.target_at)) > now() - GRACE_MS,
    )
    const next = rows.some((row) => row.kind === 'next')
      ? nextOf(await eventsOf(actor, now(), now() + LOOKAHEAD_MS).catch(() => []), now())
      : null

    return rows.map((row): Countdown => {
      const kind = toText(row.kind) as Countdown['kind']
      const base = {
        id: toNumber(row.id),
        kind,
        body: null,
        preset: null,
        from: null,
      }

      return kind === 'next'
        ? {
            ...base,
            title: next?.title ?? null,
            at: next?.start ?? null,
            eventId: next?.id ?? null,
          }
        : {
            ...base,
            title: toTextOrNull(row.title),
            at: toTextOrNull(row.target_at),
            eventId: toTextOrNull(row.event_id),
          }
    })
  }

  /** Lo más cercano primero; lo que no tiene hora (nada a la vista), al final. */
  const sorted = (list: Countdown[]): Countdown[] =>
    list.sort((a, b) => (a.at ?? '9999').localeCompare(b.at ?? '9999') || a.id - b.id)

  const checkAhead = (at: number): void => {
    if (at <= now()) throw domainError('invalid_input', 'Esa hora ya ha pasado')
    if (at - now() > MAX_AHEAD_MS) throw domainError('invalid_input', 'Como mucho, a un año vista')
  }

  return {
    /** Lo que esa persona tiene en su ventanita: avisos y lo fijado, lo más cercano primero. */
    async list(actor: Actor): Promise<Countdown[]> {
      const [notices, pins] = await Promise.all([noticesFor(actor), pinsFor(actor)])

      return sorted([...notices, ...pins])
    },

    /**
     * Una huella de los avisos que esa persona tiene a la vista, para el pulso:
     * si llega uno nuevo o se retira alguno, cambia y la web los vuelve a pedir.
     */
    async stamp(actor: Actor): Promise<number> {
      const notices = await noticesFor(actor)

      return notices.reduce((sum, entry) => sum + entry.id * 31, notices.length)
    },

    /**
     * Fija una cuenta atrás: un evento del calendario, el próximo compromiso o
     * una propia. Fijar dos veces lo mismo no lo repite.
     *
     * @throws {DomainError} `not_found` si el evento no está en tu calendario;
     *   `invalid_input` si ya ha empezado o la hora no vale; `conflict` si ya
     *   tienes `MAX_PINS`.
     */
    async pin(actor: Actor, input: unknown): Promise<Countdown[]> {
      const wanted = parse(pinSchema, input)
      const mine = await db.execute({
        sql: 'SELECT kind, event_id, target_at FROM countdown_pins WHERE login = ?',
        args: [actor.login],
      })
      const live = mine.rows.filter(
        (row) => row.target_at === null || Date.parse(toText(row.target_at)) > now() - GRACE_MS,
      )
      const repeated =
        wanted.kind === 'next'
          ? live.some((row) => row.kind === 'next')
          : wanted.kind === 'event' && live.some((row) => row.event_id === wanted.eventId)

      if (repeated) return this.list(actor)
      if (live.length >= MAX_PINS) {
        throw domainError('conflict', `Como mucho, ${MAX_PINS} cuentas atrás a la vez`)
      }

      let row: { title: string | null; at: string | null; eventId: string | null } = {
        title: null,
        at: null,
        eventId: null,
      }

      if (wanted.kind === 'custom') {
        checkAhead(wanted.at)
        row = { title: wanted.title, at: isoAt(wanted.at), eventId: null }
      } else if (wanted.kind === 'event') {
        const events = await eventsOf(actor, now() - DAY, now() + LOOKAHEAD_MS)
        const event = events.find((each) => each.id === wanted.eventId)

        if (event === undefined)
          throw domainError('not_found', 'Ese evento no está en tu calendario')
        checkAhead(Date.parse(event.start))
        row = { title: event.title, at: event.start, eventId: event.id }
      }

      await db.batch(
        [
          // Lo que ya pasó hace rato no sirve para nada: se va al fijar algo nuevo.
          {
            sql: 'DELETE FROM countdown_pins WHERE login = ? AND target_at IS NOT NULL AND target_at <= ?',
            args: [actor.login, isoAt(now() - GRACE_MS)],
          },
          {
            sql: `INSERT INTO countdown_pins (login, kind, title, target_at, event_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [actor.login, wanted.kind, row.title, row.at, row.eventId, isoAt(now())],
          },
        ],
        'write',
      )

      return this.list(actor)
    },

    /** Quita algo fijado. Lo de otra persona no se toca (y no se dice que exista). */
    async unpin(actor: Actor, pinId: number): Promise<Countdown[]> {
      await db.execute({
        sql: 'DELETE FROM countdown_pins WHERE id = ? AND login = ?',
        args: [pinId, actor.login],
      })

      return this.list(actor)
    },

    /**
     * Cierra un aviso de quien administra: deja de salirte en cualquier navegador.
     *
     * @throws {DomainError} `not_found` si no es para ti o ya lo has cerrado.
     */
    async dismiss(actor: Actor, noticeId: number): Promise<Countdown[]> {
      if (!(await noticesFor(actor)).some((entry) => entry.id === noticeId)) {
        throw domainError('not_found', 'Ese aviso no existe o ya lo has cerrado')
      }

      await db.execute({
        sql: `INSERT INTO countdown_dismissals (notice_id, login, dismissed_at) VALUES (?, ?, ?)
              ON CONFLICT (notice_id, login) DO NOTHING`,
        args: [noticeId, actor.login, isoAt(now())],
      })

      return this.list(actor)
    },

    /**
     * Manda un aviso con cuenta atrás. Solo admins. Con `preset` (la limpieza
     * de taquillas) basta con la hora: el texto lo pone la web en cada idioma.
     *
     * @throws {DomainError} `invalid_input` sin título ni `preset`, o con una
     *   hora pasada o a más de un año.
     */
    async send(actor: Actor, input: unknown): Promise<CountdownNoticeReport> {
      assertAdmin(actor)

      const wanted = parse(noticeSchema, input)

      if (wanted.preset === null && wanted.title === null) {
        throw domainError('invalid_input', 'title: hace falta un título')
      }
      checkAhead(wanted.at)

      const result = await db.execute({
        sql: `INSERT INTO countdown_notices
                (title, body, preset, target_at, target_group, campus_id, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        args: [
          wanted.title,
          wanted.body,
          wanted.preset,
          isoAt(wanted.at),
          wanted.group,
          wanted.campusId,
          actor.login,
          isoAt(now()),
        ],
      })
      const sent = (await this.reports(actor)).find(
        (report) => report.id === toNumber(result.rows[0]?.id),
      )

      if (sent === undefined) throw domainError('not_found', 'El aviso no se ha guardado')

      return sent
    },

    /** Los últimos avisos mandados, con cuánta gente los ha cerrado. Solo admins. */
    async reports(actor: Actor): Promise<CountdownNoticeReport[]> {
      assertAdmin(actor)

      const result = await db.execute({
        sql: `SELECT n.*, (SELECT COUNT(*) FROM countdown_dismissals d WHERE d.notice_id = n.id)
                AS dismissed
              FROM countdown_notices n ORDER BY n.id DESC LIMIT ?`,
        args: [REPORT_LIMIT],
      })

      return result.rows.map((row) => ({
        ...notice(row),
        group: groupOf(row),
        campusId: toNumberOrNull(row.campus_id),
        dismissed: toNumber(row.dismissed),
        createdAt: toText(row.created_at),
      }))
    },

    /** Retira un aviso: deja de salirle a todo el mundo. Solo admins. */
    async remove(actor: Actor, noticeId: number): Promise<void> {
      assertAdmin(actor)
      await db.batch(
        [
          { sql: 'DELETE FROM countdown_dismissals WHERE notice_id = ?', args: [noticeId] },
          { sql: 'DELETE FROM countdown_notices WHERE id = ?', args: [noticeId] },
        ],
        'write',
      )
    },
  }
}

export type CountdownsService = ReturnType<typeof createCountdownsService>
