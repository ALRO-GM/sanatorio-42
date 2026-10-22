/**
 * Ayuda reservada: quien está de guardia abre franjas del día en las que se
 * ofrece, con un tope de tiempo, y otras personas le reservan un rato.
 *
 * Aquí está la única forma de ganar XP por ayudar en persona, y está pensada
 * para que no se pueda cobrar sin haber ayudado:
 *
 * 1. Quien ayuda tiene que **aceptar** la reserva: nadie se apunta XP ajena.
 * 2. Quien recibe la ayuda **valida dos códigos** que le enseña quien ayuda:
 *    uno al empezar y otro al terminar (módulo `attendance`). Sin los dos, la
 *    sesión se cierra sin XP y sin tiempo contado.
 * 3. Al terminar, **las dos se valoran**. La XP solo se reparte cuando están
 *    las dos valoraciones.
 * 4. Una pareja solo puntúa **una vez al día** (lo garantiza `xp.creditHelp`).
 * 5. Quien tiene una sesión terminada sin valorar no puede reservar ni
 *    ofrecerse hasta que la valore (o diga que al final no se hizo).
 *
 * Las valoraciones no son notas. Quien recibe la ayuda dice *cómo* le ayudaron;
 * quien ayuda dice *cómo llegó* la otra persona. Ninguna opción es mejor que otra.
 */

import type {
  Booking,
  HelpDay,
  HelpOffer,
  HelpReputation,
  HelperTag,
  RequesterTag,
  HelpInbox,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Notify } from '../../core/events.js'
import { domainError } from '../../core/errors.js'
import { localMoment, zonedInstant } from '../../core/time.js'
import { id, optionalText, parse } from '../../core/validation.js'
import { EVENT_ID, closed } from '../attendance/index.js'
import type { AttendanceEvent, AttendanceService } from '../attendance/index.js'
import type { XpService } from '../profile/index.js'
import type { Agenda, ReplicaRepository } from '../replica/index.js'
import type { BookingRow, HelpRepository, Span } from './help.repository.js'

type HelpServiceOptions = {
  help: HelpRepository
  replica: ReplicaRepository
  /** Agenda de 42: de ahí salen las correcciones que pisan la guardia. */
  agenda: Agenda
  xp: XpService
  /** Los códigos que valida quien recibe la ayuda: de ahí sale si hubo sesión. */
  attendance: AttendanceService
  /** Para dejar un aviso en el buzón de quien tiene que enterarse. Sin él, no se avisa. */
  notify?: Notify
  /**
   * Lo que alguien ya tiene en el calendario entre dos instantes (terapias,
   * pizarras, eventos y exámenes de 42, correcciones): a esas horas no se puede
   * ofrecer. Lo da `calendar`, que se monta después. Sin él solo cuentan las
   * correcciones de 42.
   */
  commitments?: Commitments
  /** Si tiene el interruptor de guardia encendido y dónde está sentada: lo sabe `peers`. */
  presenceOf?: (login: string) => Promise<{ available: boolean; seat: string | null }>
  /**
   * Cómo llegó alguien a sus correcciones de 42, según quien le corrigió, por
   * etiqueta. Suma a lo de la ayuda reservada. Lo sabe `network`.
   */
  correctionTags?: (login: string) => Promise<Map<string, number>>
  now?: () => number
}

/** Ratos ocupados de alguien entre dos instantes. `refresh`: preguntar a 42 si lo guardado es viejo. */
export type Commitments = (
  who: Actor,
  refresh: boolean,
  from: number,
  to: number,
) => Promise<readonly { start: string; end: string }[]>

/** Todo va en medias horas: franjas, reservas y topes. */
const SLOT = 30

/** Tope de minutos que alguien puede ofrecer en un día. */
const MAX_DAY_MINUTES = 480

/** Duraciones que se pueden reservar. */
const BOOKING_MINUTES = [30, 60, 90, 120] as const

/** Reservas vivas que puede tener a la vez quien pide ayuda. */
const MAX_ACTIVE_REQUESTS = 3

const HELPER_TAGS = ['bug', 'code', 'concept', 'patient'] as const satisfies HelperTag[]
const REQUESTER_TAGS = [
  'prepared',
  'curious',
  'autonomous',
  'basics',
] as const satisfies RequesterTag[]

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** `HH:MM` en medias horas, convertido a minutos desde medianoche. */
const halfHour = z
  .string()
  .regex(TIME, 'hora no válida')
  .transform((time) => toMinutes(time))
  .refine((minutes) => minutes % SLOT === 0, 'tiene que ser en punto o a y media')

/**
 * El final de una franja: como `halfHour`, pero también `24:00`, la medianoche
 * del final del día (la franja de las 23:30 acaba ahí).
 */
const endHalfHour = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'hora no válida')
  .transform((time) => toMinutes(time))
  .refine((minutes) => minutes % SLOT === 0, 'tiene que ser en punto o a y media')

const daySchema = z.object({
  windows: z
    .array(
      z
        .object({ start: halfHour, end: endHalfHour })
        .refine((span) => span.end - span.start >= SLOT, 'cada franja dura al menos media hora'),
    )
    .max(8, 'demasiadas franjas'),
  maxMinutes: z
    .number()
    .int()
    .min(SLOT, 'como mínimo media hora')
    .max(MAX_DAY_MINUTES, 'como mucho ocho horas')
    .refine((minutes) => minutes % SLOT === 0, 'tiene que ir en medias horas'),
})

const bookingSchema = z.object({
  helper: z.string().trim().min(1).max(40),
  projectId: id.nullish(),
  start: halfHour,
  minutes: z
    .number()
    .refine(
      (minutes): minutes is (typeof BOOKING_MINUTES)[number] =>
        (BOOKING_MINUTES as readonly number[]).includes(minutes),
      'elige 30, 60, 90 o 120 minutos',
    ),
  note: optionalText(140),
})

const blockSchema = z.object({ login: z.string().trim().min(1).max(40) })

function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Junta las franjas que se tocan o se pisan, ordenadas. */
function merge(spans: readonly Span[]): Span[] {
  const merged: Span[] = []

  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1)

    if (last !== undefined && span.start <= last.end) {
      last.end = Math.max(last.end, span.end)
    } else {
      merged.push({ ...span })
    }
  }

  return merged
}

const overlaps = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end

const spanOf = (booking: BookingRow): Span => ({
  start: booking.start,
  end: booking.start + booking.minutes,
})

const bookedMinutes = (bookings: readonly BookingRow[]): number =>
  bookings.reduce((sum, booking) => sum + booking.minutes, 0)

export function createHelpService(options: HelpServiceOptions) {
  const { help, replica, agenda, xp, attendance } = options
  const now = options.now ?? Date.now
  const notify: Notify = options.notify ?? (() => Promise.resolve())

  /** Día y minuto actuales en la hora local de un campus. */
  async function momentIn(campusId: number): Promise<{ day: string; minutes: number }> {
    return localMoment(now(), await replica.timeZoneOf(campusId))
  }

  /** Lo que se usa sin `calendar`: solo las correcciones de 42 de la agenda. */
  const evaluationsOnly: Commitments = async (who, refresh) => {
    const mine = refresh
      ? await agenda.userAgenda(who.login, await replica.userIdOf(who.login))
      : await agenda.userAgenda(who.login, null)

    return (mine?.evaluations ?? []).map((evaluation) => ({
      start: evaluation.beginAt,
      end: evaluation.endAt,
    }))
  }
  const commitments = options.commitments ?? evaluationsOnly

  /**
   * Ratos de hoy en los que alguien ya tiene algo en el calendario, en minutos
   * del día en su campus.
   *
   * Lo que ya está en el calendario manda sobre la guardia: mientras dura, esa
   * persona no puede estar ayudando, aunque el rato caiga dentro de una franja
   * que abrió.
   *
   * @param refresh Si es `true` y lo guardado es viejo, se pregunta a 42 (tres
   *   peticiones). Con `false` vale lo último que se supo: es lo que se usa al
   *   listar a todo el campus, donde preguntar por cada persona saldría caro.
   */
  async function busyOf(
    login: string,
    campusId: number,
    day: string,
    refresh: boolean,
  ): Promise<Span[]> {
    const timeZone = await replica.timeZoneOf(campusId)
    const taken = await commitments(
      { login, campusId, admin: false },
      refresh,
      zonedInstant(day, 0, timeZone),
      zonedInstant(day, 24 * 60, timeZone),
    )
    const spans: Span[] = []

    for (const span of taken) {
      const start = localMoment(Date.parse(span.start), timeZone)
      const end = localMoment(Date.parse(span.end), timeZone)

      // Solo lo que toca el día: lo que empieza antes o acaba después se recorta.
      if (start.day <= day && end.day >= day) {
        spans.push({
          start: start.day < day ? 0 : start.minutes,
          end: end.day > day ? 24 * 60 : end.minutes,
        })
      }
    }

    return merge(spans.filter((span) => span.end > span.start))
  }

  /** `true` si la franja de la reserva ya ha terminado. */
  const finished = (booking: BookingRow, moment: { day: string; minutes: number }): boolean =>
    booking.day < moment.day ||
    (booking.day === moment.day && booking.start + booking.minutes <= moment.minutes)

  /** `true` si a esa persona le falta valorar esa sesión. */
  const owesRating = (booking: BookingRow, login: string): boolean =>
    booking.status === 'confirmed' &&
    booking.xp === null &&
    (booking.helper === login ? booking.requesterTag === null : booking.helperTag === null)

  async function mustRate(
    actor: Actor,
    moment: { day: string; minutes: number },
  ): Promise<boolean> {
    return (await help.relevantTo(actor.login, moment.day)).some(
      (booking) => finished(booking, moment) && owesRating(booking, actor.login),
    )
  }

  /** El horario de una reserva, en instantes. */
  async function scheduleOf(booking: BookingRow): Promise<{ startsAt: number; endsAt: number }> {
    const startsAt = zonedInstant(
      booking.day,
      booking.start,
      await replica.timeZoneOf(booking.campusId),
    )

    return { startsAt, endsAt: startsAt + booking.minutes * 60_000 }
  }

  /** `true` si quien pidió la ayuda validó los dos códigos de esa sesión. */
  const attended = async (booking: BookingRow): Promise<boolean> =>
    booking.verified ||
    (await attendance.attended(EVENT_ID.help(booking.id))).includes(booking.requester)

  /**
   * Cierra una sesión valorada por las dos partes y reparte su XP.
   *
   * Con los dos códigos validados, quien ayudó gana XP. Sin ellos se cierra a
   * cero, pero solo cuando el código de fin ya ha caducado: hasta entonces
   * todavía se puede validar, y la sesión se queda abierta.
   *
   * @returns La XP repartida, o `null` si la sesión sigue abierta.
   */
  async function close(booking: BookingRow): Promise<number | null> {
    if (
      booking.status !== 'confirmed' ||
      booking.xp !== null ||
      booking.helperTag === null ||
      booking.requesterTag === null
    ) {
      return booking.xp
    }

    let earned = 0

    if (await attended(booking)) {
      await help.setVerified(booking.id)
      earned = await xp.creditHelp({
        from: booking.requester,
        to: booking.helper,
        kind: booking.helperTag as HelperTag,
        projectId: booking.projectId,
        ref: `help:${booking.id}`,
      })
    } else if (!closed(await scheduleOf(booking), now())) {
      return null
    }

    await help.setXp(booking.id, earned)

    return earned
  }

  /** Cierra las sesiones valoradas que estaban esperando a los códigos. Idempotente. */
  async function settle(): Promise<void> {
    for (const booking of await help.ratedAndOpen()) {
      await close(booking)
    }
  }

  async function view(
    rows: readonly BookingRow[],
    actor: Actor,
    moment: { day: string; minutes: number },
  ): Promise<Booking[]> {
    const images = await replica.imagesOf(
      rows.map((row) => (row.helper === actor.login ? row.requester : row.helper)),
    )
    const views: Booking[] = []

    for (const row of rows) {
      const role = row.helper === actor.login ? 'helper' : 'requester'
      const peer = role === 'helper' ? row.requester : row.helper

      views.push({
        id: row.id,
        helper: row.helper,
        requester: row.requester,
        peer: { login: peer, image: images.get(peer) ?? null },
        role,
        projectId: row.projectId,
        projectName: row.projectId === null ? null : await replica.projectName(row.projectId),
        day: row.day,
        start: toTime(row.start),
        end: toTime(row.start + row.minutes),
        note: row.note,
        status: row.status,
        finished: finished(row, moment),
        verified: row.status === 'confirmed' && (await attended(row)),
        ratedByMe: role === 'helper' ? row.requesterTag !== null : row.helperTag !== null,
        ratedByPeer: role === 'helper' ? row.helperTag !== null : row.requesterTag !== null,
        xp: row.xp,
      })
    }

    return views
  }

  /** Las filas de la ventana de ayuda: peticiones vivas por contestar y novedades. */
  async function inboxRows(
    actor: Actor,
    moment: { day: string; minutes: number },
  ): Promise<{ pending: BookingRow[]; news: BookingRow[] }> {
    const [pending, news] = await Promise.all([
      help.pendingFor(actor.login, moment.day),
      help.newsFor(actor.login),
    ])

    return { pending: pending.filter((row) => !finished(row, moment)), news }
  }

  /** La reserva, si quien pregunta es una de las dos personas. Si no, 404. */
  async function mustGet(bookingId: number, actor: Actor): Promise<BookingRow> {
    const booking = await help.booking(bookingId)

    if (
      booking === undefined ||
      (booking.helper !== actor.login && booking.requester !== actor.login)
    ) {
      throw domainError('not_found', 'Esa reserva no existe')
    }

    return booking
  }

  /** Inicios libres de alguien, de `from` en adelante, y los minutos que le quedan. */
  function free(
    windows: readonly Span[],
    maxMinutes: number,
    active: readonly BookingRow[],
    busy: readonly Span[],
    from: number,
  ): { starts: number[]; remaining: number } {
    const remaining = Math.max(0, maxMinutes - bookedMinutes(active))
    const starts: number[] = []

    if (remaining >= SLOT) {
      for (const window of windows) {
        for (let start = window.start; start + SLOT <= window.end; start += SLOT) {
          const slot = { start, end: start + SLOT }

          if (
            slot.end > from &&
            !active.some((booking) => overlaps(slot, spanOf(booking))) &&
            !busy.some((span) => overlaps(slot, span))
          ) {
            starts.push(start)
          }
        }
      }
    }

    return { starts, remaining }
  }

  /**
   * Las franjas pedidas, sin las medias horas que ya han empezado, salvo las
   * que esa persona ya tenía abiertas.
   *
   * Quitar una media hora siempre se puede, también la que está en curso (te
   * tienes que ir), salvo si alguien la tiene reservada: esas se quedan aunque
   * no vengan en lo pedido, para no dejar una reserva sin franja. Para soltarlas
   * hay que cancelar o rechazar la reserva.
   */
  const stillOpen = async (
    login: string,
    windows: readonly Span[],
    moment: { day: string; minutes: number },
  ): Promise<Span[]> => {
    const before = (await help.day(login, moment.day))?.windows ?? []
    const booked = (await help.activeOfHelper(login, moment.day)).map((booking) => ({
      start: booking.start,
      end: booking.start + booking.minutes,
    }))
    const kept: Span[] = []

    for (const window of windows) {
      for (let start = window.start; start < window.end; start += SLOT) {
        const had = before.some((span) => start >= span.start && start + SLOT <= span.end)

        if (start > moment.minutes || had) {
          kept.push({ start, end: Math.min(window.end, start + SLOT) })
        }
      }
    }

    return [...kept, ...booked]
  }

  return {
    settle,

    /**
     * Lo que `meet` necesita para validar la asistencia a una sesión: el papel
     * de quien pregunta y el horario. Los códigos solo existen para una reserva
     * aceptada.
     *
     * @throws {DomainError} `not_found` si la reserva no es suya; `conflict` si
     *   no está aceptada.
     */
    async session(
      actor: Actor,
      bookingId: number,
    ): Promise<{ role: 'host' | 'guest'; event: AttendanceEvent; guest: string }> {
      const booking = await mustGet(bookingId, actor)

      if (booking.status !== 'confirmed') {
        throw domainError('conflict', 'Los códigos son para las reservas aceptadas')
      }

      return {
        // Quien ayuda enseña los códigos; quien pidió la ayuda los escribe.
        role: booking.helper === actor.login ? 'host' : 'guest',
        guest: booking.requester,
        event: {
          id: EVENT_ID.help(booking.id),
          campusId: booking.campusId,
          host: booking.helper,
          title:
            (booking.projectId === null ? null : await replica.projectName(booking.projectId)) ??
            'Sesión de ayuda',
          ...(await scheduleOf(booking)),
        },
      }
    },

    /** Tu guardia de hoy: lo que ofreces, tus reservas y a quién has bloqueado. */
    async today(actor: Actor): Promise<HelpDay> {
      await settle()

      const moment = await momentIn(actor.campusId)
      const [day, relevant, blocked, busy, presence] = await Promise.all([
        help.day(actor.login, moment.day),
        help.relevantTo(actor.login, moment.day),
        help.blockedBy(actor.login),
        busyOf(actor.login, actor.campusId, moment.day, true),
        options.presenceOf?.(actor.login) ?? Promise.resolve({ available: false, seat: null }),
      ])
      const asHelper = relevant.filter(
        (booking) =>
          booking.helper === actor.login &&
          booking.day === moment.day &&
          (booking.status === 'pending' || booking.status === 'confirmed'),
      )

      return {
        day: moment.day,
        now: toTime(moment.minutes),
        windows: (day?.windows ?? []).map((span) => ({
          start: toTime(span.start),
          end: toTime(span.end),
        })),
        maxMinutes: day?.maxMinutes ?? 60,
        busy: busy.map((span) => ({ start: toTime(span.start), end: toTime(span.end) })),
        bookedMinutes: bookedMinutes(asHelper),
        bookings: await view(relevant, actor, moment),
        mustRate: relevant.some(
          (booking) => finished(booking, moment) && owesRating(booking, actor.login),
        ),
        blocked,
        presence,
      }
    },

    /**
     * Abre (o cambia) las franjas de hoy y el tope de tiempo.
     *
     * Las franjas van en medias horas; las que se pisan se juntan. El tope no
     * puede quedar por debajo de lo que ya tienes reservado. Una lista vacía
     * retira la oferta.
     *
     * Una media hora que ya ha empezado no se puede abrir: nadie podría
     * reservarla entera. Las que ya estaban abiertas se respetan, para que
     * guardar a media tarde no borre la franja en la que estás.
     */
    async setToday(actor: Actor, input: unknown): Promise<HelpDay> {
      const { windows, maxMinutes } = parse(daySchema, input)
      const moment = await momentIn(actor.campusId)

      if (await mustRate(actor, moment)) {
        throw domainError(
          'conflict',
          'Antes de ofrecerte, valora las sesiones que tienes pendientes',
        )
      }

      const booked = bookedMinutes(await help.activeOfHelper(actor.login, moment.day))

      if (maxMinutes < booked) {
        throw domainError('conflict', `Ya tienes ${booked} minutos reservados hoy`)
      }

      await help.saveDay({
        login: actor.login,
        campusId: actor.campusId,
        day: moment.day,
        windows: merge(await stillOpen(actor.login, windows, moment)),
        maxMinutes,
      })

      return this.today(actor)
    },

    /**
     * Quién se ofrece hoy en el campus y aún tiene hueco.
     *
     * No sale quien ha bloqueado a quien pregunta, ni a quien este ha bloqueado.
     */
    async offers(actor: Actor): Promise<HelpOffer[]> {
      const moment = await momentIn(actor.campusId)
      const [days, active, blockers, blocked] = await Promise.all([
        help.daysIn(actor.campusId, moment.day),
        help.activeIn(actor.campusId, moment.day),
        help.blockersOf(actor.login),
        help.blockedBy(actor.login),
      ])
      const hidden = new Set([actor.login, ...blockers, ...blocked])
      const offers: HelpOffer[] = []

      for (const day of days) {
        if (hidden.has(day.login)) {
          continue
        }

        const { starts, remaining } = free(
          day.windows,
          day.maxMinutes,
          active.filter((booking) => booking.helper === day.login),
          await busyOf(day.login, actor.campusId, moment.day, false),
          moment.minutes,
        )

        if (starts.length > 0) {
          offers.push({
            login: day.login,
            freeStarts: starts.map(toTime),
            remainingMinutes: remaining,
          })
        }
      }

      return offers
    },

    /**
     * Pide un rato de ayuda a alguien que se ofrece hoy. Queda pendiente hasta
     * que esa persona la acepte.
     *
     * Si esa persona ha bloqueado a quien pide, la respuesta es la misma que si
     * no se ofreciera: no se le dice que está bloqueado.
     */
    async book(actor: Actor, input: unknown): Promise<Booking> {
      const request = parse(bookingSchema, input)
      const moment = await momentIn(actor.campusId)
      const slot = { start: request.start, end: request.start + request.minutes }

      if (request.helper === actor.login) {
        throw domainError('invalid_input', 'No puedes reservarte a ti')
      }
      if (await mustRate(actor, moment)) {
        throw domainError(
          'conflict',
          'Antes de reservar, valora las sesiones que tienes pendientes',
        )
      }

      const [day, blockers, blocked] = await Promise.all([
        help.day(request.helper, moment.day),
        help.blockersOf(actor.login),
        help.blockedBy(actor.login),
      ])
      const window = day?.windows.find((span) => slot.start >= span.start && slot.end <= span.end)

      if (
        day?.campusId !== actor.campusId ||
        window === undefined ||
        blockers.includes(request.helper) ||
        blocked.includes(request.helper)
      ) {
        throw domainError('not_found', `${request.helper} no se ofrece en esa franja`)
      }
      if (slot.end <= moment.minutes) {
        throw domainError('invalid_input', 'Esa franja ya ha pasado')
      }
      if (
        typeof request.projectId === 'number' &&
        (await replica.projectName(request.projectId)) === null
      ) {
        throw domainError('not_found', `El proyecto ${request.projectId} no existe en 42`)
      }

      const active = await help.activeOfHelper(request.helper, moment.day)

      if (active.some((booking) => booking.requester === actor.login)) {
        throw domainError('conflict', `Ya tienes una reserva hoy con ${request.helper}`)
      }
      if (active.some((booking) => overlaps(slot, spanOf(booking)))) {
        throw domainError('conflict', 'Esa franja ya está cogida')
      }
      // Aquí sí se pregunta a 42 si hace falta: es una sola persona, y reservar
      // encima de otra cosa dejaría plantada a una de las dos partes.
      if (
        (await busyOf(request.helper, actor.campusId, moment.day, true)).some((span) =>
          overlaps(slot, span),
        )
      ) {
        throw domainError(
          'conflict',
          `${request.helper} tiene otra cosa en el calendario a esa hora`,
        )
      }

      const remaining = day.maxMinutes - bookedMinutes(active)

      if (request.minutes > remaining) {
        throw domainError(
          'conflict',
          remaining < SLOT
            ? `${request.helper} ya no tiene más tiempo hoy`
            : `A ${request.helper} solo le quedan ${remaining} minutos hoy`,
        )
      }

      const mine = (await help.relevantTo(actor.login, moment.day)).filter(
        (booking) =>
          booking.requester === actor.login &&
          booking.day === moment.day &&
          (booking.status === 'pending' || booking.status === 'confirmed'),
      )

      if (mine.length >= MAX_ACTIVE_REQUESTS) {
        throw domainError('conflict', 'Ya tienes varias reservas hoy')
      }

      const bookingId = await help.create({
        campusId: actor.campusId,
        helper: request.helper,
        requester: actor.login,
        projectId: request.projectId ?? null,
        day: moment.day,
        start: request.start,
        minutes: request.minutes,
        note: request.note,
      })
      const [created] = await view([await mustGet(bookingId, actor)], actor, moment)

      if (created === undefined) {
        throw domainError('not_found', 'Esa reserva no existe')
      }

      await notify({
        to: [request.helper],
        kind: 'booking_requested',
        ref: EVENT_ID.help(bookingId),
        from: actor.login,
        text: `${created.start}–${created.end}${created.projectName === null ? '' : ` · ${created.projectName}`}`,
      })

      return created
    },

    /**
     * Lo que tiene que salir en una ventana que no se salta: las peticiones de
     * ayuda por contestar (si aún no ha pasado su hora) y los rechazos y
     * anulaciones que todavía no ha visto.
     */
    async inbox(actor: Actor): Promise<HelpInbox> {
      const moment = await momentIn(actor.campusId)
      const { pending, news } = await inboxRows(actor, moment)

      return {
        requests: await view(pending, actor, moment),
        news: await view(news, actor, moment),
      }
    },

    /** Cuántas cosas tiene en esa ventana. Para el pulso: sin fotos ni nombres. */
    async inboxCount(actor: Actor): Promise<number> {
      const { pending, news } = await inboxRows(actor, await momentIn(actor.campusId))

      return pending.length + news.length
    },

    /** Ya ha visto que le rechazaron o anularon esa reserva. */
    async seen(actor: Actor, bookingId: number): Promise<void> {
      await mustGet(bookingId, actor)
      await help.clearNews(bookingId, actor.login)
    },

    /** Acepta o rechaza una reserva pendiente. Solo quien ayuda. */
    async respond(actor: Actor, bookingId: number, accept: boolean): Promise<void> {
      const booking = await mustGet(bookingId, actor)

      if (booking.helper !== actor.login) {
        throw domainError('forbidden', 'Solo quien ayuda puede aceptar la reserva')
      }
      if (booking.status !== 'pending') {
        throw domainError('conflict', 'Esa reserva ya estaba contestada')
      }

      // Un rechazo se le enseña a quien pidió la ayuda en una ventana.
      await help.setStatus(
        bookingId,
        accept ? 'confirmed' : 'declined',
        accept ? null : booking.requester,
      )
      await notify({
        to: [booking.requester],
        kind: accept ? 'booking_accepted' : 'booking_declined',
        ref: EVENT_ID.help(bookingId),
        from: actor.login,
        text: `${toTime(booking.start)}–${toTime(booking.start + booking.minutes)}`,
      })
    },

    /**
     * Anula una reserva. Cualquiera de las dos personas, antes o después de la
     * hora: es también la forma de decir "al final no quedamos". No da XP.
     */
    async cancel(actor: Actor, bookingId: number): Promise<void> {
      const booking = await mustGet(bookingId, actor)

      if (booking.xp !== null || (booking.status !== 'pending' && booking.status !== 'confirmed')) {
        throw domainError('conflict', 'Esa reserva ya está cerrada')
      }

      // Quien no la anuló se entera en una ventana.
      await help.setStatus(
        bookingId,
        'cancelled',
        actor.login === booking.helper ? booking.requester : booking.helper,
      )
      await notify({
        to: [booking.helper, booking.requester],
        kind: 'booking_cancelled',
        ref: EVENT_ID.help(bookingId),
        from: actor.login,
        text: `${toTime(booking.start)}–${toTime(booking.start + booking.minutes)}`,
      })
    },

    /**
     * Valora una sesión terminada.
     *
     * Quien recibió la ayuda elige cómo le ayudaron; quien ayudó, cómo llegó la
     * otra persona. Cuando están las dos valoraciones la sesión se cierra, y si
     * quien recibió la ayuda validó los dos códigos, quien ayudó gana XP.
     *
     * @returns La XP repartida, o `null` si todavía falta la otra valoración o
     *   aún se puede validar el código de fin.
     */
    async rate(actor: Actor, bookingId: number, input: unknown): Promise<{ xp: number | null }> {
      const booking = await mustGet(bookingId, actor)
      const moment = await momentIn(booking.campusId)
      const about = booking.helper === actor.login ? 'requester' : 'helper'
      const { tag } = parse(
        z.object({ tag: z.enum(about === 'helper' ? HELPER_TAGS : REQUESTER_TAGS) }),
        input,
      )

      if (booking.status !== 'confirmed' || booking.xp !== null) {
        throw domainError('conflict', 'Esa sesión no se puede valorar')
      }
      if (!finished(booking, moment)) {
        throw domainError('conflict', 'Podrás valorarla cuando termine la franja')
      }
      if ((about === 'helper' ? booking.helperTag : booking.requesterTag) !== null) {
        throw domainError('conflict', 'Ya habías valorado esa sesión')
      }

      await help.setTag(bookingId, about, tag)

      return {
        xp: await close({
          ...booking,
          helperTag: about === 'helper' ? tag : booking.helperTag,
          requesterTag: about === 'requester' ? tag : booking.requesterTag,
        }),
      }
    },

    /**
     * Deja de ofrecer ayuda a una persona: ya no ve tus franjas ni puede
     * reservarte, y lo que te tuviera pedido se rechaza. No se le avisa.
     */
    async block(actor: Actor, input: unknown): Promise<void> {
      const { login } = parse(blockSchema, input)

      if (login === actor.login) {
        throw domainError('invalid_input', 'No puedes bloquearte a ti')
      }
      if (!(await replica.userExists(login))) {
        throw domainError('not_found', `No conocemos a ${login}`)
      }

      await help.block(actor.login, login)
      await help.declinePendingFrom(login, actor.login)
    },

    async unblock(actor: Actor, login: string): Promise<void> {
      await help.unblock(actor.login, login)
    },

    /** Cómo han descrito a quien pregunta las personas que le ayudaron. */
    async reputation(actor: Actor): Promise<HelpReputation> {
      const [helped, corrected] = await Promise.all([
        help.requesterTags(actor.login),
        // Si no se puede saber, no suma: la tarjeta no se cae por esto.
        options.correctionTags?.(actor.login).catch(() => undefined),
      ])
      const count = (tag: RequesterTag): number =>
        (helped.get(tag) ?? 0) + (corrected?.get(tag) ?? 0)

      return {
        asked: {
          prepared: count('prepared'),
          curious: count('curious'),
          autonomous: count('autonomous'),
          basics: count('basics'),
        },
      }
    },
  }
}

export type HelpService = ReturnType<typeof createHelpService>
