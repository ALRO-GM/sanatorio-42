/**
 * Calendario personal: todo lo que una persona tiene (o puede tener) por
 * delante, de Sanatorio y de 42, en una sola lista.
 *
 * No guarda nada: junta lo que saben los demás módulos.
 *
 * | Tipo           | De dónde sale                                            |
 * |----------------|----------------------------------------------------------|
 * | `help`         | Tus franjas de guardia de hoy y tus reservas de ayuda    |
 * | `therapy`      | Las sesiones de los grupos de terapia en los que estás   |
 * | `board`        | Las pizarras del campus                                  |
 * | `evaluation`   | Tus correcciones concertadas en 42                       |
 * | `event_joined` | Eventos de 42 a los que estás apuntado                   |
 * | `event_open`   | Eventos de 42 del campus a los que no                    |
 * | `exam`         | Exámenes de 42 del campus                                |
 *
 * Las **franjas abiertas para corregir** no están: 42 solo las enseña a
 * aplicaciones con permiso de escritura sobre proyectos (`projects`), que esta
 * web no pide. Sí están las correcciones ya concertadas, que es lo que acaba
 * ocupando hueco en el día.
 */

import type { Calendar, CalendarEvent } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { domainError } from '../../core/errors.js'
import { minutesOf, zonedInstant } from '../../core/time.js'
import type { BoardsService } from '../boards/index.js'
import type { HelpService } from '../help/index.js'
import type { Agenda, ReplicaRepository } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'

export type CalendarServiceOptions = {
  replica: ReplicaRepository
  agenda: Agenda
  help: HelpService
  therapy: TherapyService
  boards: BoardsService
}

const DAY = 24 * 60 * 60_000

/** Lo más que se puede pedir de una vez: un mes con las semanas que asoman. */
const MAX_RANGE_DAYS = 62

const INTRA = 'https://profile.intra.42.fr'

/** Lo que cada tipo no necesita, para no repetirlo en cada evento. */
const BASE = {
  place: null,
  description: null,
  joined: null,
  seats: null,
  withLogin: null,
  url: null,
  section: null,
} satisfies Partial<CalendarEvent>

export function createCalendarService(options: CalendarServiceOptions) {
  const { replica, agenda, help, therapy, boards } = options

  const iso = (at: number): string => new Date(at).toISOString()

  /** Franjas de guardia de hoy y reservas de ayuda. */
  async function helpEvents(actor: Actor, timeZone: string | undefined): Promise<CalendarEvent[]> {
    const day = await help.today(actor)
    const at = (date: string, time: string): string =>
      iso(zonedInstant(date, minutesOf(time), timeZone))

    return [
      ...day.windows.map((window): CalendarEvent => ({
        ...BASE,
        id: `help:window:${day.day}:${window.start}`,
        kind: 'help',
        title: 'Te ofreces a ayudar',
        start: at(day.day, window.start),
        end: at(day.day, window.end),
        section: 'guardia',
      })),
      ...day.bookings
        .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
        .map((booking): CalendarEvent => ({
          ...BASE,
          id: `help:booking:${booking.id}`,
          kind: 'help',
          title:
            booking.role === 'helper'
              ? `Ayudas a ${booking.peer.login}`
              : `${booking.peer.login} te ayuda`,
          start: at(booking.day, booking.start),
          end: at(booking.day, booking.end),
          description:
            [booking.projectName, booking.note].filter((part) => part !== null).join(' · ') || null,
          // Una reserva sin aceptar todavía no es un compromiso.
          joined: booking.status === 'confirmed',
          withLogin: booking.peer.login,
          section: 'guardia',
        })),
    ]
  }

  /** Cada sesión, día a día, de los grupos de terapia en los que está. */
  async function therapyEvents(
    actor: Actor,
    from: number,
    to: number,
    timeZone: string | undefined,
  ): Promise<CalendarEvent[]> {
    const groups = (await therapy.list(actor)).filter((group) => group.joined)
    const events: CalendarEvent[] = []

    for (const group of groups) {
      for (const day of group.dates) {
        const start = zonedInstant(day, minutesOf(group.start), timeZone)
        const end = zonedInstant(day, minutesOf(group.end), timeZone)

        if (start < to && end > from) {
          events.push({
            ...BASE,
            id: `therapy:${group.id}:${day}`,
            kind: 'therapy',
            title: `Terapia de ${group.projectName ?? 'grupo'}`,
            start: iso(start),
            end: iso(end),
            place: group.place,
            description: group.note,
            joined: true,
            seats: { taken: group.members.length, max: group.capacity },
            withLogin: group.creator,
            section: 'terapia',
          })
        }
      }
    }

    return events
  }

  async function boardEvents(actor: Actor, from: number, to: number): Promise<CalendarEvent[]> {
    return (await boards.list(actor, iso(from), iso(to))).map((board) => ({
      ...BASE,
      id: `board:${board.id}`,
      kind: 'board',
      title: board.title,
      start: board.startsAt,
      end: board.endsAt,
      place: board.place,
      description: board.description,
      joined: board.joined || board.host === actor.login,
      seats: { taken: board.attendees, max: board.capacity },
      withLogin: board.host,
      section: 'pizarras',
    }))
  }

  /** Eventos, exámenes y correcciones de 42. */
  async function fortyTwoEvents(
    actor: Actor,
    userId: number | null,
    from: number,
    to: number,
  ): Promise<{ events: CalendarEvent[]; at: string | null }> {
    const [campus, mine] = await Promise.all([
      agenda.campusEvents(actor.campusId, iso(from), iso(to)),
      agenda.userAgenda(actor.login, userId),
    ])
    const events: CalendarEvent[] = []

    for (const event of campus) {
      const joined =
        mine === null
          ? false
          : (event.source === 'exam' ? mine.exams : mine.events).includes(event.id)

      events.push({
        ...BASE,
        id: `${event.source}:${event.id}`,
        kind: event.source === 'exam' ? 'exam' : joined ? 'event_joined' : 'event_open',
        title: event.name,
        start: event.beginAt,
        end: event.endAt,
        place: event.location,
        description: event.description,
        joined,
        seats:
          event.subscribers === null ? null : { taken: event.subscribers, max: event.maxPeople },
        url: `${INTRA}/${event.source === 'exam' ? 'exams' : 'events'}/${event.id}`,
      })
    }

    for (const evaluation of mine?.evaluations ?? []) {
      if (Date.parse(evaluation.beginAt) >= to || Date.parse(evaluation.endAt) <= from) {
        continue
      }

      const project =
        evaluation.projectId === null ? null : await replica.projectName(evaluation.projectId)

      events.push({
        ...BASE,
        id: `evaluation:${evaluation.id}`,
        kind: 'evaluation',
        // No se dice con quién: 42 lo oculta hasta que llega la hora.
        title:
          evaluation.role === 'corrector'
            ? `Corriges${project === null ? '' : ` ${project}`}`
            : `Te corrigen${project === null ? '' : ` ${project}`}`,
        start: evaluation.beginAt,
        end: evaluation.endAt,
        url: `${INTRA}/`,
      })
    }

    return { events, at: mine?.fetchedAt ?? null }
  }

  return {
    /**
     * Los eventos de `actor` entre dos instantes, ordenados por hora.
     *
     * @param userId Su id en 42, para pedir lo que tiene apuntado allí.
     * @throws {DomainError} 400 si las fechas no valen o el intervalo es demasiado largo.
     */
    async between(
      actor: Actor,
      userId: number | null,
      fromIso: string | undefined,
      toIso: string | undefined,
    ): Promise<Calendar> {
      const from = Date.parse(fromIso ?? '')
      const to = Date.parse(toIso ?? '')

      if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
        throw domainError('invalid_input', 'Indica `from` y `to` como fechas ISO, en ese orden')
      }
      if (to - from > MAX_RANGE_DAYS * DAY) {
        throw domainError('invalid_input', `Como mucho se pueden pedir ${MAX_RANGE_DAYS} días`)
      }

      const timeZone = await replica.timeZoneOf(actor.campusId)
      const [own, sessions, whiteboards, fortyTwo] = await Promise.all([
        helpEvents(actor, timeZone),
        therapyEvents(actor, from, to, timeZone),
        boardEvents(actor, from, to),
        fortyTwoEvents(actor, userId, from, to),
      ])
      const inRange = (event: CalendarEvent): boolean =>
        Date.parse(event.start) < to && Date.parse(event.end) > from

      return {
        events: [...own, ...sessions, ...whiteboards, ...fortyTwo.events]
          .filter(inRange)
          .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)),
        fortyTwoAt: fortyTwo.at,
      }
    },
  }
}

export type CalendarService = ReturnType<typeof createCalendarService>
