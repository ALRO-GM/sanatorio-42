/**
 * Lo que pasa alrededor de un evento con otras personas.
 *
 * - **Avisos y chat**: quien participa en un evento puede decir "lo he visto",
 *   "llego tarde" o "no voy", y escribir. Todos los del evento ven lo mismo.
 * - **Asistencia con códigos** (pizarras y sesiones de ayuda): quien organiza
 *   tiene dos códigos de cuatro caracteres, uno para el principio y otro para el
 *   final. Quien asiste los escribe (o escanea su QR). Aquí solo se decide quién
 *   es quién en cada evento; las reglas y el tiempo son del módulo `attendance`.
 *
 * Quién participa en qué lo dice el módulo de cada cosa (pizarras, ayuda,
 * terapias); para lo de 42, el calendario de cada persona.
 */

import type {
  AttendanceReport,
  CalendarEvent,
  EventAlert,
  EventAlerts,
  CheckinLogEntry,
  DirectChat,
  LoggedMessage,
  MeetAttendance,
  MeetCheckin,
  MeetMessage,
  MeetReason,
  MeetThread,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Notify } from '../../core/events.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import { EVENT_ID } from '../attendance/index.js'
import type { AttendanceEvent, AttendanceService } from '../attendance/index.js'
import type { BoardsService } from '../boards/index.js'
import type { CalendarService } from '../calendar/index.js'
import type { HelpService } from '../help/index.js'
import type { ReplicaRepository } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'

export type MeetServiceOptions = {
  db: Db
  calendar: CalendarService
  boards: BoardsService
  help: HelpService
  attendance: AttendanceService
  /** Para el chat de cada grupo de terapia (`group:<id>`), que no es un evento del calendario. */
  therapy: TherapyService
  replica: ReplicaRepository
  /** Quién tiene la web abierta ahora mismo. */
  online?: () => Promise<Set<string>>
  /** Para dejar un aviso en el buzón de quien tiene que enterarse. Sin él, no se avisa. */
  notify?: Notify
  /** Para dar por leído el aviso de un chat cuando esa persona lo abre. */
  onRead?: (login: string, eventId: string) => Promise<void>
  now?: () => number
}

const HOUR = 60 * 60_000

/** Ventana del calendario en la que se busca el evento: lo de ayer aún se puede comentar. */
const LOOK_BACK_MS = 36 * HOUR
const LOOK_AHEAD_MS = 14 * 24 * HOUR

/** Mensajes que se devuelven de un evento: los últimos. */
const THREAD_LIMIT = 200

/**
 * Mensajes que puede mandar una persona en un minuto: a un mismo evento y en
 * total. Un chat de quedar no necesita más, y así nadie lo inunda.
 */
/**
 * Días que se guardan los mensajes de un chat. Son para quedar, no un archivo:
 * pasado ese plazo ya no hacen falta ni para revisar una denuncia. La web lo
 * dice en cada chat.
 */
export const MESSAGE_RETENTION_DAYS = 90

const MAX_PER_MINUTE_EVENT = 8
const MAX_PER_MINUTE_TOTAL = 20

const REASONS = ['evaluation', 'other_event', 'on_my_way', 'transport', 'other'] as const

/**
 * Minutos desde el inicio de un evento a partir de los que, si esa persona no
 * ha dicho nada, se le da por no asistida.
 */
export const MISSED_AFTER_MINUTES = 30

/** Hasta dónde se mira por delante al pedir los avisos: de sobra para el aviso más largo. */
const ALERTS_AHEAD_MS = 3 * HOUR
/** Y hacia atrás: lo que empezó hace más ya no avisa ni se da por perdido. */
const ALERTS_BACK_MS = 12 * HOUR

/** `true` si el evento es con más gente y vas: hay que decir si vas, si te retrasas o si no. */
function needsReply(event: CalendarEvent): boolean {
  if (event.joined === false) return false

  return (
    event.id.startsWith('help:booking:') ||
    event.kind === 'therapy' ||
    event.kind === 'board' ||
    event.kind === 'evaluation'
  )
}

const eventId = z.string().regex(/^[a-z_]+(:[A-Za-z0-9-]+){1,3}$/, 'evento no válido')

const messageSchema = z
  .object({
    id: eventId,
    kind: z.enum(['seen', 'late', 'absent', 'text']),
    minutes: z.number().int().min(1).max(240).optional(),
    reason: z.enum(REASONS).optional(),
    body: z.string().trim().max(500).optional(),
  })
  .refine((message) => message.kind !== 'late' || message.minutes !== undefined, {
    message: 'di cuántos minutos te retrasas',
  })
  .refine((message) => message.kind !== 'text' || (message.body ?? '') !== '', {
    message: 'el mensaje está vacío',
  })

const checkinSchema = z.object({
  id: eventId,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}$/, 'el código son cuatro letras o números'),
})

const reportSchema = z.object({
  login: z.string().trim().toLowerCase().max(40).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

/** Conversaciones directas que se listan como mucho. */
const MAX_CHATS = 50

export function createMeetService(options: MeetServiceOptions) {
  const { db, calendar, boards, help, attendance, therapy, replica } = options
  const now = options.now ?? Date.now
  const notify: Notify = options.notify ?? (() => Promise.resolve())
  // Preguntar al calendario en cada mensaje del chat sería caro: se recuerda un rato.
  const membership = createTtlCache<boolean>({ ttlMs: 5 * 60_000, maxEntries: 500, now })

  /**
   * Comprueba que `actor` participa en el evento.
   *
   * @throws {DomainError} `forbidden` si el evento no está en su calendario.
   */
  const assertParticipant = async (
    actor: Actor,
    userId: number | null,
    id: string,
  ): Promise<void> => {
    const takesPart = await membership.get(`${actor.login}|${actor.campusId}|${id}`, async () => {
      const [kind, second, third] = id.split(':')

      // Lo de Sanatorio se pregunta a quien lo sabe: calcular el calendario
      // entero (con la agenda de 42 incluida) para saber si alguien está en una
      // pizarra sale caro, y esto se mira en cada mensaje.
      // El chat de un grupo de terapia es de quien está dentro, haya o no sesión pronto.
      if (kind === 'group' || kind === 'therapy') {
        return (await therapy.list(actor)).some(
          (group) =>
            group.id === Number(second) &&
            group.joined &&
            (kind === 'group' || group.dates.includes(third ?? '')),
        )
      }
      // Un chat directo es de sus dos logins, en orden alfabético para que
      // haya un solo chat por pareja, y los dos tienen que existir.
      if (kind === 'dm') {
        const pair = [second ?? '', third ?? '']

        return (
          pair.includes(actor.login) &&
          pair[0] !== pair[1] &&
          [...pair].sort().join() === pair.join() &&
          (await Promise.all(pair.map((login) => replica.userExists(login)))).every(Boolean)
        )
      }
      if (kind === 'board') {
        return (await boards.list(actor)).some(
          (board) => board.id === Number(second) && (board.joined || board.host === actor.login),
        )
      }
      if (kind === 'help' && second === 'booking') {
        // Una reserva sin aceptar todavía no es un compromiso: no tiene chat.
        return help.session(actor, Number(third)).then(
          () => true,
          () => false,
        )
      }

      // El resto es de 42 (correcciones, eventos, exámenes): lo dice su agenda.
      const { events } = await calendar.between(
        actor,
        userId,
        new Date(now() - LOOK_BACK_MS).toISOString(),
        new Date(now() + LOOK_AHEAD_MS).toISOString(),
      )

      // `joined: false` es un evento que se ve pero al que no se ha apuntado.
      return events.some((event) => event.id === id && event.joined !== false)
    })

    if (!takesPart) {
      throw domainError('forbidden', 'Ese evento no está en tu calendario')
    }
  }

  /**
   * Qué papel tiene `actor` en un evento con asistencia por códigos, y lo que
   * hace falta saber del evento para validarla.
   *
   * @throws {DomainError} `invalid_input` si ese tipo de evento no los usa.
   */
  const resolve = async (
    actor: Actor,
    id: string,
  ): Promise<{ role: 'host' | 'guest'; event: AttendanceEvent }> => {
    const [kind, second, third] = id.split(':')

    if (kind === 'board') {
      const board = (await boards.list(actor)).find((entry) => entry.id === Number(second))

      if (board !== undefined && (board.joined || board.host === actor.login)) {
        return {
          role: board.host === actor.login ? 'host' : 'guest',
          event: {
            id: EVENT_ID.board(board.id),
            campusId: actor.campusId,
            host: board.host,
            title: board.title,
            startsAt: Date.parse(board.startsAt),
            endsAt: Date.parse(board.endsAt),
          },
        }
      }

      throw domainError('forbidden', 'Ese evento no está en tu calendario')
    }
    if (kind === 'help' && second === 'booking') {
      return help.session(actor, Number(third))
    }

    throw domainError('invalid_input', 'Ese tipo de evento no valida la asistencia con códigos')
  }

  /**
   * Quién más está en un evento, para avisarle de que hay mensajes. De lo de 42
   * (correcciones, eventos) no se sabe: ahí no se avisa a nadie.
   */
  const peopleIn = async (actor: Actor, id: string): Promise<string[]> => {
    const [kind, second, third] = id.split(':')

    if (kind === 'dm') {
      return [second ?? '', third ?? '']
    }
    if (kind === 'board') {
      return boards.people(Number(second))
    }
    if (kind === 'group' || kind === 'therapy') {
      return (
        (await therapy.list(actor)).find((group) => group.id === Number(second))?.members ?? []
      ).map((member) => member.login)
    }
    if (kind === 'help' && second === 'booking') {
      const { event, guest } = await help.session(actor, Number(third))

      return [event.host, guest]
    }

    return []
  }

  /** De quién puede pedir `actor` el informe de horas: `null` es de todo el mundo. */
  const reportOf = (actor: Actor, login: string | undefined): string | null => {
    if (login === undefined || login === actor.login) {
      return actor.login
    }
    if (!actor.admin) {
      throw domainError('forbidden', 'Solo puedes pedir tus propias horas')
    }

    return login === 'all' ? null : login
  }

  return {
    /**
     * El chat de un evento, del mensaje más antiguo al más reciente.
     *
     * @param after Si se da, solo los mensajes posteriores a ese `id`: es lo
     *   que pide la web al refrescar, para no traerse el chat entero cada vez.
     */
    async thread(
      actor: Actor,
      userId: number | null,
      id: unknown,
      after?: unknown,
    ): Promise<MeetThread> {
      const event = parse(eventId, id)
      const since = after === undefined ? 0 : parse(z.coerce.number().int().min(0), after)

      await assertParticipant(actor, userId, event)
      // Quien abre el chat ya ha visto lo que había: su aviso deja de contar.
      await options.onRead?.(actor.login, event)

      const result = await db.execute({
        sql: `SELECT id, login, kind, minutes, reason, body, created_at FROM (
                SELECT * FROM event_messages WHERE event_id = ? AND id > ?
                ORDER BY id DESC LIMIT ?
              ) ORDER BY id`,
        args: [event, since, THREAD_LIMIT],
      })
      const images = await replica.imagesOf(result.rows.map((row) => toText(row.login)))

      return {
        messages: result.rows.map((row): MeetMessage => ({
          id: toNumber(row.id),
          login: toText(row.login),
          image: images.get(toText(row.login)) ?? null,
          kind: toText(row.kind) as MeetMessage['kind'],
          minutes: row.minutes === null ? null : toNumber(row.minutes),
          reason: typeof row.reason === 'string' ? (row.reason as MeetReason) : null,
          body: typeof row.body === 'string' ? row.body : null,
          at: toText(row.created_at),
        })),
      }
    },

    /**
     * Manda un aviso o un mensaje al chat de un evento.
     *
     * @throws {DomainError} `conflict` si esa persona lleva demasiados en el último minuto.
     */
    async send(actor: Actor, userId: number | null, input: unknown): Promise<MeetThread> {
      const message = parse(messageSchema, input)

      await assertParticipant(actor, userId, message.id)

      const recent = (
        await db.execute({
          sql: `SELECT COUNT(*) AS total, SUM(event_id = ?) AS here FROM event_messages
                WHERE login = ? AND created_at > ?`,
          args: [message.id, actor.login, new Date(now() - 60_000).toISOString()],
        })
      ).rows[0]

      if (
        toNumber(recent?.here ?? 0) >= MAX_PER_MINUTE_EVENT ||
        toNumber(recent?.total) >= MAX_PER_MINUTE_TOTAL
      ) {
        throw domainError('conflict', 'Demasiados mensajes seguidos: espera un minuto')
      }

      await db.execute({
        sql: `INSERT INTO event_messages (event_id, login, kind, minutes, reason, body, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          message.id,
          actor.login,
          message.kind,
          message.kind === 'late' ? (message.minutes ?? null) : null,
          message.kind === 'late' || message.kind === 'absent' ? (message.reason ?? null) : null,
          message.body === undefined || message.body === '' ? null : message.body,
          new Date(now()).toISOString(),
        ],
      })

      // "Lo he visto" no merece un aviso: lo demás, sí.
      if (message.kind !== 'seen') {
        await notify({
          to: await peopleIn(actor, message.id),
          kind: 'chat',
          ref: message.id,
          from: actor.login,
          text: message.body ?? null,
        })
      }

      return this.thread(actor, userId, message.id)
    },

    /**
     * Las conversaciones directas de alguien, la más reciente primero.
     *
     * Salen de los propios mensajes: un chat existe desde que alguien escribe.
     */
    async chats(actor: Actor): Promise<DirectChat[]> {
      const result = await db.execute({
        sql: `SELECT m.event_id, m.login, m.body, m.created_at FROM event_messages m
              JOIN (
                SELECT event_id, MAX(id) AS id FROM event_messages
                WHERE event_id LIKE ? OR event_id LIKE ? GROUP BY event_id
              ) last ON last.id = m.id
              ORDER BY m.id DESC LIMIT ?`,
        args: [`dm:${actor.login}:%`, `dm:%:${actor.login}`, MAX_CHATS],
      })
      const others = result.rows.map(
        (row) =>
          toText(row.event_id)
            .split(':')
            .slice(1)
            .find((login) => login !== actor.login) ?? '',
      )
      const [images, online] = await Promise.all([
        replica.imagesOf(others),
        options.online?.() ?? new Set<string>(),
      ])

      return result.rows.map((row, index): DirectChat => {
        const login = others[index] ?? ''
        const body = typeof row.body === 'string' ? row.body : null

        return {
          login,
          image: images.get(login) ?? null,
          id: toText(row.event_id),
          last: body === null ? null : body.slice(0, 80),
          lastFrom: toText(row.login),
          at: toText(row.created_at),
          online: online.has(login),
        }
      })
    },

    /**
     * Los últimos mensajes de todos los chats, para revisarlos si hay una
     * denuncia. Solo para quien administra la web.
     */
    async log(actor: Actor, limit = 200): Promise<LoggedMessage[]> {
      if (!actor.admin) {
        throw domainError('forbidden', 'Solo para quien administra la web')
      }

      const result = await db.execute({
        sql: `SELECT id, event_id, login, kind, body, created_at FROM event_messages
              ORDER BY id DESC LIMIT ?`,
        args: [Math.max(1, Math.min(500, limit))],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        eventId: toText(row.event_id),
        login: toText(row.login),
        kind: toText(row.kind),
        body: typeof row.body === 'string' ? row.body : null,
        at: toText(row.created_at),
      }))
    },

    /**
     * Borra los mensajes que ya han cumplido el plazo. Lo lanza un trabajo periódico.
     *
     * @returns Cuántos ha borrado.
     */
    async purge(): Promise<number> {
      const before = new Date(now() - MESSAGE_RETENTION_DAYS * 24 * HOUR).toISOString()
      const result = await db.execute({
        sql: 'DELETE FROM event_messages WHERE created_at < ?',
        args: [before],
      })

      await db.execute({ sql: 'DELETE FROM event_alerts WHERE missed_at < ?', args: [before] })

      return result.rowsAffected
    },

    /**
     * Los avisos de quien pregunta, por orden de inicio.
     *
     * De paso da por no asistido a quien no dijo nada de un evento que empezó
     * hace más de media hora: queda apuntado en su chat (para que los demás lo
     * sepan) y se le enseña una vez como aviso que se le pasó.
     */
    async alerts(actor: Actor, userId: number | null): Promise<EventAlerts> {
      const at = now()
      const { events } = await calendar.between(
        actor,
        userId,
        new Date(at - ALERTS_BACK_MS).toISOString(),
        new Date(at + ALERTS_AHEAD_MS).toISOString(),
      )
      const mine = events.filter((event) => event.joined !== false && event.kind !== 'event_open')
      const replied = new Set<string>()

      if (mine.length > 0) {
        const result = await db.execute({
          sql: `SELECT DISTINCT event_id FROM event_messages
                WHERE login = ? AND kind IN ('seen', 'late', 'absent')
                  AND event_id IN (${mine.map(() => '?').join(', ')})`,
          args: [actor.login, ...mine.map((event) => event.id)],
        })

        for (const row of result.rows) replied.add(toText(row.event_id))
      }

      const alerts: EventAlert[] = []

      for (const event of mine) {
        const start = Date.parse(event.start)

        if (!needsReply(event)) {
          // Lo que no pide respuesta solo avisa antes de empezar.
          if (start > at) alerts.push({ event, state: 'info' })
        } else if (!replied.has(event.id)) {
          if (at <= start + MISSED_AFTER_MINUTES * 60_000) {
            alerts.push({ event, state: 'pending' })
          } else {
            // Se le pasó: no asistido, y a su lista de avisos por cerrar.
            await db.batch(
              [
                {
                  sql: `INSERT INTO event_messages (event_id, login, kind, reason, created_at)
                        VALUES (?, ?, 'absent', 'missed', ?)`,
                  args: [event.id, actor.login, new Date(at).toISOString()],
                },
                {
                  sql: `INSERT OR IGNORE INTO event_alerts (event_id, login, event, starts_at, missed_at)
                        VALUES (?, ?, ?, ?, ?)`,
                  args: [
                    event.id,
                    actor.login,
                    JSON.stringify(event),
                    event.start,
                    new Date(at).toISOString(),
                  ],
                },
              ],
              'write',
            )
          }
        }
      }

      const missed = await db.execute({
        sql: `SELECT event FROM event_alerts WHERE login = ? AND acked_at IS NULL
              ORDER BY starts_at`,
        args: [actor.login],
      })

      for (const row of missed.rows) {
        try {
          alerts.push({ event: JSON.parse(toText(row.event)) as CalendarEvent, state: 'missed' })
        } catch {
          // Un aviso ilegible no se puede enseñar: se queda sin salir.
        }
      }

      return { alerts: alerts.sort((a, b) => a.event.start.localeCompare(b.event.start)) }
    },

    /** Cierra el aviso de un evento que se le pasó a quien pregunta. */
    async ackAlert(actor: Actor, id: unknown): Promise<void> {
      await db.execute({
        sql: `UPDATE event_alerts SET acked_at = ? WHERE event_id = ? AND login = ?
              AND acked_at IS NULL`,
        args: [new Date(now()).toISOString(), parse(eventId, id), actor.login],
      })
    },

    /** La asistencia de un evento: los códigos para quien organiza, lo validado para quien asiste. */
    async attendance(actor: Actor, id: unknown): Promise<MeetAttendance> {
      const { role, event } = await resolve(actor, parse(eventId, id))
      const people = await attendance.presences(event.id)
      const common = {
        role,
        window: attendance.window(event),
        attemptsLeft: await attendance.attemptsLeft(event.id, actor.login),
      }

      return role === 'host'
        ? { ...common, codes: await attendance.codes(event.id), mine: null, people }
        : {
            ...common,
            codes: null,
            mine: people.find((entry) => entry.login === actor.login) ?? null,
            people: [],
          }
    },

    /**
     * Valida un código de asistencia. El de inicio marca cuándo empezaste; el
     * de fin, cuándo terminaste, y solo vale si antes validaste el de inicio.
     * Cuándo vale cada uno y cuánto tiempo cuenta lo decide `attendance`.
     *
     * @throws {DomainError} `invalid_input` si el código no es de ese evento;
     *   `conflict` si no es el momento de ese código; `forbidden` si ya has
     *   fallado demasiadas veces.
     */
    async checkin(actor: Actor, input: unknown): Promise<MeetCheckin> {
      const { id, code } = parse(checkinSchema, input)
      const { role, event } = await resolve(actor, id)

      if (role === 'host') {
        throw domainError('conflict', 'Los códigos los valida quien asiste, no quien organiza')
      }

      const result = await attendance.checkin(event, actor.login, code)

      // Una sesión de ayuda ya valorada puede estar esperando solo a este código.
      if (result.phase === 'end' && id.startsWith('help:')) {
        await help.settle()
      }

      return result
    },

    /**
     * Las horas validadas con códigos en un periodo. Cada quien puede pedir las
     * suyas; quien administra, las de cualquiera (`login`) o las de todo el
     * mundo (`login=all`).
     */
    async report(actor: Actor, query: unknown): Promise<AttendanceReport> {
      const { login, ...period } = parse(reportSchema, query)

      return attendance.report(reportOf(actor, login), period)
    },

    /** El mismo informe en CSV, para llevárselo a una hoja de cálculo. */
    async reportCsv(actor: Actor, query: unknown): Promise<string> {
      const { login, ...period } = parse(reportSchema, query)

      return attendance.reportCsv(reportOf(actor, login), period)
    },

    /** Cada intento de validar un código de un evento. Solo para quien administra la web. */
    async checkins(actor: Actor, id: unknown): Promise<CheckinLogEntry[]> {
      if (!actor.admin) {
        throw domainError('forbidden', 'Solo para quien administra la web')
      }

      return attendance.log(parse(eventId, id))
    },
  }
}

export type MeetService = ReturnType<typeof createMeetService>
