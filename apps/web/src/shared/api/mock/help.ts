/**
 * API de mentira: ayuda reservada (la guardia).
 */

import type { Booking } from '@sanatorio/contracts'
import { offers, today, ME } from './data'
import type { Api } from '../types'
import { state, delay, fail, emptyToNull, projectName, find, helpDay, newId } from './state'

/**
 * La ventana de ayuda solo sale en la demo si se pide (`?ayuda=peticion` o
 * `?ayuda=rechazo`): si no, taparía todo lo demás en cada visita.
 */
const wantedHelp = new URLSearchParams(window.location.search).get('ayuda')

/** Rechazos y anulaciones que aún no has visto. */
const helpNews = new Set<number>()

if (wantedHelp === 'rechazo') {
  const declined: Booking = {
    id: 90,
    helper: 'jdoe',
    requester: ME.login,
    peer: { login: 'jdoe', image: null },
    role: 'requester',
    projectId: 1314,
    projectName: 'ft_printf',
    day: today(),
    start: '18:00',
    end: '18:30',
    note: null,
    status: 'declined',
    finished: false,
    verified: false,
    ratedByMe: false,
    ratedByPeer: false,
    xp: null,
  }

  state.help.bookings.push(declined)
  helpNews.add(declined.id)
}

/** Lo que sale en la ventana de ayuda. */
export function helpInbox(): { requests: Booking[]; news: Booking[] } {
  return {
    requests:
      wantedHelp === 'peticion'
        ? state.help.bookings.filter(
            (booking) => booking.role === 'helper' && booking.status === 'pending',
          )
        : [],
    news: state.help.bookings.filter((booking) => helpNews.has(booking.id)),
  }
}

export const helpMock: Pick<
  Api,
  | 'getHelpDay'
  | 'setHelpDay'
  | 'getHelpOffers'
  | 'bookHelp'
  | 'respondBooking'
  | 'cancelBooking'
  | 'rateBooking'
  | 'blockHelp'
  | 'unblockHelp'
  | 'getHelpReputation'
  | 'getHelpInbox'
  | 'seenBooking'
> = {
  async getHelpInbox() {
    await delay(80)

    return helpInbox()
  },

  async seenBooking(id) {
    await delay(60)
    helpNews.delete(id)
  },

  // --- Ayuda reservada ---------------------------------------------------------

  async getHelpDay() {
    await delay()

    return helpDay()
  },

  async setHelpDay(day) {
    await delay()

    if (helpDay().mustRate) {
      throw fail(409, 'Antes de ofrecerte, valora las sesiones que tienes pendientes')
    }

    state.help.windows = day.windows
    state.help.maxMinutes = day.maxMinutes

    return helpDay()
  },

  async getHelpOffers() {
    await delay()
    const taken = new Set(
      state.help.bookings
        .filter((booking) => booking.role === 'requester' && booking.status !== 'cancelled')
        .map((booking) => `${booking.helper}@${booking.start}`),
    )

    return offers()
      .filter((offer) => !state.help.blocked.includes(offer.login))
      .map((offer) => ({
        ...offer,
        freeStarts: offer.freeStarts.filter((start) => !taken.has(`${offer.login}@${start}`)),
      }))
  },

  async bookHelp(booking) {
    await delay()

    if (helpDay().mustRate) {
      throw fail(409, 'Antes de reservar, valora las sesiones que tienes pendientes')
    }
    if (
      state.help.bookings.some(
        (other) =>
          other.helper === booking.helper &&
          other.day === today() &&
          (other.status === 'pending' || other.status === 'confirmed') &&
          !other.finished,
      )
    ) {
      throw fail(409, `Ya tienes una reserva hoy con ${booking.helper}`)
    }

    const [hours = '0', minutes = '0'] = booking.start.split(':')
    const end = Number(hours) * 60 + Number(minutes) + booking.minutes
    const created: Booking = {
      id: newId(),
      helper: booking.helper,
      requester: ME.login,
      peer: { login: booking.helper, image: null },
      role: 'requester',
      projectId: booking.projectId ?? null,
      projectName: typeof booking.projectId === 'number' ? projectName(booking.projectId) : null,
      day: today(),
      start: booking.start,
      end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
      note: emptyToNull(booking.note),
      status: 'pending',
      finished: false,
      verified: false,
      ratedByMe: false,
      ratedByPeer: false,
      xp: null,
    }

    state.help.bookings.push(created)

    return created
  },

  async respondBooking(id, accept) {
    await delay()
    find(state.help.bookings, id, 'Esa reserva').status = accept ? 'confirmed' : 'declined'
  },

  async cancelBooking(id) {
    await delay()
    find(state.help.bookings, id, 'Esa reserva').status = 'cancelled'
  },

  async rateBooking(id) {
    await delay()
    const booking = find(state.help.bookings, id, 'Esa reserva')

    booking.ratedByMe = true

    if (!booking.ratedByPeer) {
      return { xp: null }
    }

    // Están las dos valoraciones: se cierra. Sin comprobación, a cero.
    booking.xp = booking.verified ? 40 : 0

    return { xp: booking.xp }
  },

  async blockHelp(login) {
    await delay()

    if (!state.help.blocked.includes(login)) state.help.blocked.push(login)

    for (const booking of state.help.bookings) {
      if (booking.requester === login && booking.status === 'pending') booking.status = 'declined'
    }
  },

  async unblockHelp(login) {
    await delay()
    state.help.blocked = state.help.blocked.filter((other) => other !== login)
  },

  async getHelpReputation() {
    await delay()

    return { asked: { prepared: 4, curious: 6, autonomous: 2, basics: 1 } }
  },
}
