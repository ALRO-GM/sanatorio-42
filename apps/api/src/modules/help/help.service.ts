/**
 * Ayuda reservada: quien está de guardia abre franjas del día en las que se
 * ofrece, con un tope de tiempo, y otras personas le reservan un rato.
 *
 * Aquí está la única forma de ganar XP por ayudar en persona, y está pensada
 * para que no se pueda cobrar sin haber ayudado:
 *
 * 1. Quien ayuda tiene que **aceptar** la reserva: nadie se apunta XP ajena.
 * 2. Durante la franja se comprueba, con la foto de puestos de 42, que **las
 *    dos personas están en el campus**. Sin eso, la sesión se cierra sin XP.
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
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { domainError } from '../../core/errors.js'
import { localMoment } from '../../core/time.js'
import { id, optionalText, parse } from '../../core/validation.js'
import type { XpService } from '../profile/index.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import type { Agenda, ReplicaRepository, Syncer } from '../replica/index.js'
import type { BookingRow, HelpRepository, Span } from './help.repository.js'

export type HelpServiceOptions = {
  help: HelpRepository
  replica: ReplicaRepository
  /** Agenda de 42: de ahí salen las correcciones que pisan la guardia. */
  agenda: Agenda
  sync: Syncer
  xp: XpService
  now?: () => number
}

/** Todo va en medias horas: franjas, reservas y topes. */
const SLOT = 30

/** Tope de minutos que alguien puede ofrecer en un día. */
const MAX_DAY_MINUTES = 480

/** Duraciones que se pueden reservar. */
const BOOKING_MINUTES = [30, 60, 90, 120] as const

/** Reservas vivas que puede tener a la vez quien pide ayuda. */
const MAX_ACTIVE_REQUESTS = 3

export const HELPER_TAGS = ['bug', 'code', 'concept', 'patient'] as const satisfies HelperTag[]
export const REQUESTER_TAGS = [
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

const daySchema = z.object({
  windows: z
    .array(
      z
        .object({ start: halfHour, end: halfHour })
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
  const { help, replica, agenda, sync, xp } = options
  const now = options.now ?? Date.now

  /** Día y minuto actuales en la hora local de un campus. */
  async function momentIn(campusId: number): Promise<{ day: string; minutes: number }> {
    return localMoment(now(), await replica.timeZoneOf(campusId))
  }

  /**
   * Ratos de hoy en los que alguien tiene una corrección de 42, en minutos del
   * día en su campus.
   *
   * Una corrección manda sobre la guardia: mientras dura, esa persona no puede
   * estar ayudando, aunque el rato caiga dentro de una franja que abrió.
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
    const mine = refresh
      ? await agenda.userAgenda(login, await replica.userIdOf(login))
      : await agenda.userAgenda(login, null)
    const timeZone = await replica.timeZoneOf(campusId)
    const spans: Span[] = []

    for (const evaluation of mine?.evaluations ?? []) {
      const start = localMoment(Date.parse(evaluation.beginAt), timeZone)
      const end = localMoment(Date.parse(evaluation.endAt), timeZone)

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
        verified: row.verified,
        ratedByMe: role === 'helper' ? row.requesterTag !== null : row.helperTag !== null,
        ratedByPeer: role === 'helper' ? row.helperTag !== null : row.requesterTag !== null,
        xp: row.xp,
      })
    }

    return views
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
   */
  const stillOpen = async (
    login: string,
    windows: readonly Span[],
    moment: { day: string; minutes: number },
  ): Promise<Span[]> => {
    const before = (await help.day(login, moment.day))?.windows ?? []
    const kept: Span[] = []

    for (const window of windows) {
      for (let start = window.start; start < window.end; start += SLOT) {
        const had = before.some((span) => start >= span.start && start + SLOT <= span.end)

        if (start > moment.minutes || had) {
          kept.push({ start, end: Math.min(window.end, start + SLOT) })
        }
      }
    }

    return kept
  }

  return {
    /** Tu guardia de hoy: lo que ofreces, tus reservas y a quién has bloqueado. */
    async today(actor: Actor): Promise<HelpDay> {
      const moment = await momentIn(actor.campusId)
      const [day, relevant, blocked, busy] = await Promise.all([
        help.day(actor.login, moment.day),
        help.relevantTo(actor.login, moment.day),
        help.blockedBy(actor.login),
        busyOf(actor.login, actor.campusId, moment.day, true),
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
      // encima de una corrección dejaría plantada a una de las dos partes.
      if (
        (await busyOf(request.helper, actor.campusId, moment.day, true)).some((span) =>
          overlaps(slot, span),
        )
      ) {
        throw domainError('conflict', `${request.helper} tiene una corrección a esa hora`)
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

      return created
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

      await help.setStatus(bookingId, accept ? 'confirmed' : 'declined')
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

      await help.setStatus(bookingId, 'cancelled')
    },

    /**
     * Valora una sesión terminada.
     *
     * Quien recibió la ayuda elige cómo le ayudaron; quien ayudó, cómo llegó la
     * otra persona. Cuando están las dos valoraciones la sesión se cierra, y si
     * se comprobó que las dos personas estaban en el campus, quien ayudó gana XP.
     *
     * @returns La XP repartida, o `null` si todavía falta la otra valoración.
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

      const helperTag = about === 'helper' ? tag : booking.helperTag
      const requesterTag = about === 'requester' ? tag : booking.requesterTag

      if (helperTag === null || requesterTag === null) {
        return { xp: null }
      }

      // Están las dos valoraciones: se cierra. Sin comprobación de presencia, a cero.
      const earned = booking.verified
        ? await xp.creditHelp({
            from: booking.requester,
            to: booking.helper,
            kind: helperTag as HelperTag,
            projectId: booking.projectId,
            ref: `help:${bookingId}`,
          })
        : 0

      await help.setXp(bookingId, earned)

      return { xp: earned }
    },

    /**
     * Comprueba que las sesiones en curso se están haciendo de verdad: que las
     * dos personas tienen puesto en el campus durante la franja.
     *
     * La llama el trabajo periódico del módulo, cada minuto.
     *
     * @returns Cuántas sesiones se han dado por comprobadas en esta pasada.
     */
    async verify(): Promise<number> {
      const yesterday = new Date(now() - 24 * 60 * 60_000).toISOString().slice(0, 10)
      const since = new Date(now() - LOCATION_MAX_AGE_MS).toISOString()
      const fresh = new Set<number>()
      let verified = 0

      for (const booking of await help.unverifiedSince(yesterday)) {
        const moment = await momentIn(booking.campusId)

        if (
          booking.day !== moment.day ||
          moment.minutes < booking.start ||
          moment.minutes > booking.start + booking.minutes
        ) {
          continue
        }

        if (!fresh.has(booking.campusId)) {
          await sync.ensureLocations(booking.campusId)
          fresh.add(booking.campusId)
        }

        const [helperSeat, requesterSeat] = await Promise.all([
          replica.locationOf(booking.helper, since),
          replica.locationOf(booking.requester, since),
        ])

        if (helperSeat !== null && requesterSeat !== null) {
          await help.setVerified(booking.id)
          verified += 1
        }
      }

      return verified
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
      const tags = await help.requesterTags(actor.login)

      return {
        asked: {
          prepared: tags.get('prepared') ?? 0,
          curious: tags.get('curious') ?? 0,
          autonomous: tags.get('autonomous') ?? 0,
          basics: tags.get('basics') ?? 0,
        },
      }
    },
  }
}

export type HelpService = ReturnType<typeof createHelpService>
