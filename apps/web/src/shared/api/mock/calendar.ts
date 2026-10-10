/**
 * Calendario de mentira: lo que hay en memoria (guardia, terapias, pizarras) más
 * unos cuantos eventos de 42 inventados, colocados alrededor de hoy para que
 * siempre haya algo que ver.
 */

import type { CalendarEvent } from '@sanatorio/contracts'

import { inDays, ME } from './data'
import type { MockState } from './data'

const BASE = {
  place: null,
  description: null,
  joined: null,
  seats: null,
  withLogin: null,
  url: null,
  section: null,
} satisfies Partial<CalendarEvent>

const INTRA = 'https://profile.intra.42.fr'

/** Instante ISO de hoy a esa hora (`HH:MM`), en la hora del navegador. */
function todayAt(time: string): string {
  const [hours = '0', minutes = '0'] = time.split(':')

  return inDays(0, Number(hours), Number(minutes))
}

function fortyTwo(): CalendarEvent[] {
  const event = (
    id: number,
    title: string,
    joined: boolean,
    days: number,
    hour: number,
    hours: number,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => ({
    ...BASE,
    id: `event:${id}`,
    kind: joined ? 'event_joined' : 'event_open',
    title,
    start: inDays(days, hour),
    end: inDays(days, hour + hours),
    joined,
    url: `${INTRA}/events/${id}`,
    ...extra,
  })
  const exam = (id: number, days: number, joined: boolean): CalendarEvent => ({
    ...BASE,
    id: `exam:${id}`,
    kind: 'exam',
    title: 'Exam Session Morning',
    start: inDays(days, 10),
    end: inDays(days, 13),
    place: 'c1',
    joined,
    seats: { taken: joined ? 31 : 12, max: 40 },
    url: `${INTRA}/exams/${id}`,
  })

  return [
    event(44804, '[FOUNDERS on the Stage] De la piscina a tu propia startup', true, 2, 16, 2, {
      place: 'Auditorio',
      description:
        'Charla con antiguos estudiantes que montaron su empresa. Habrá ronda de preguntas.',
      seats: { taken: 86, max: 120 },
    }),
    event(44449, 'Hackathon de otoño', false, 5, 9, 11, {
      place: 'La Nave',
      description: 'Dos jornadas por equipos. Inscripción abierta hasta el día anterior.',
      seats: { taken: 43, max: null },
    }),
    event(44738, 'Alumni Fireside Chat', false, 8, 18, 1, {
      description: 'En remoto.',
      seats: { taken: 828, max: null },
    }),
    exam(31945, 3, false),
    exam(31950, 10, true),
    {
      ...BASE,
      id: 'evaluation:1',
      kind: 'evaluation',
      title: 'Te corrigen ft_printf',
      start: inDays(1, 11),
      end: inDays(1, 11, 30),
      url: `${INTRA}/`,
    },
    {
      ...BASE,
      id: 'evaluation:2',
      kind: 'evaluation',
      title: 'Corriges Libft',
      start: inDays(3, 16),
      end: inDays(3, 16, 30),
      url: `${INTRA}/`,
    },
  ]
}

export function calendarEvents(state: MockState): CalendarEvent[] {
  const events: CalendarEvent[] = fortyTwo()

  for (const window of state.help.windows) {
    events.push({
      ...BASE,
      id: `help:window:${window.start}`,
      kind: 'help',
      title: 'Te ofreces a ayudar',
      start: todayAt(window.start),
      end: todayAt(window.end),
      section: 'guardia',
    })
  }

  for (const booking of state.help.bookings) {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') continue

    events.push({
      ...BASE,
      id: `help:booking:${booking.id}`,
      kind: 'help',
      title:
        booking.role === 'helper'
          ? `Ayudas a ${booking.peer.login}`
          : `${booking.peer.login} te ayuda`,
      start: todayAt(booking.start),
      end: todayAt(booking.end),
      description: [booking.projectName, booking.note].filter((part) => part !== null).join(' · '),
      joined: booking.status === 'confirmed',
      withLogin: booking.peer.login,
      section: 'guardia',
    })
  }

  // Cada sesión de los grupos en los que estás, tres semanas atrás y seis adelante.
  for (const group of state.groups.filter((entry) => entry.members.includes(ME.login))) {
    const [startHour = '0', startMinute = '0'] = group.start.split(':')
    const [endHour = '0', endMinute = '0'] = group.end.split(':')

    for (let offset = -21; offset <= 42; offset += 1) {
      const date = new Date()

      date.setDate(date.getDate() + offset)

      // `getDay()` empieza en domingo; los grupos, en lunes = 1.
      if (!group.days.includes(((date.getDay() + 6) % 7) + 1)) continue

      events.push({
        ...BASE,
        id: `therapy:${group.id}:${offset}`,
        kind: 'therapy',
        title: `Terapia de ${group.projectName ?? 'grupo'}`,
        start: inDays(offset, Number(startHour), Number(startMinute)),
        end: inDays(offset, Number(endHour), Number(endMinute)),
        place: group.place,
        description: group.note,
        joined: true,
        seats: { taken: group.members.length, max: group.capacity },
        withLogin: group.creator,
        section: 'terapia',
      })
    }
  }

  for (const board of state.boards) {
    events.push({
      ...BASE,
      id: `board:${board.id}`,
      kind: 'board',
      title: board.title,
      start: board.startsAt,
      end: board.endsAt,
      place: board.place,
      description: board.description,
      joined: board.attendees.includes(ME.login) || board.host === ME.login,
      seats: { taken: board.attendees.length, max: board.capacity },
      withLogin: board.host,
      section: 'pizarras',
    })
  }

  return events
}
