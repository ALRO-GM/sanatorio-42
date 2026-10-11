/**
 * API de mentira: avisos, chat y asistencia de un evento.
 */

import { ME } from './data'
import type { Api } from '../types'
import { delay, fail, threads, presences } from './state'

export const meetMock: Pick<
  Api,
  | 'getEventThread'
  | 'sendEventMessage'
  | 'getEventAttendance'
  | 'checkinEvent'
  | 'attendanceReportUrl'
> = {
  async getEventThread(id, after = 0) {
    await delay(120)

    return { messages: (threads.get(id) ?? []).filter((message) => message.id > after) }
  },

  async sendEventMessage(message) {
    await delay(150)

    const thread = threads.get(message.id) ?? []

    thread.push({
      id: thread.length + 1,
      login: ME.login,
      image: null,
      kind: message.kind,
      minutes: message.minutes ?? null,
      reason: message.reason ?? null,
      body: message.body ?? null,
      at: new Date().toISOString(),
    })
    threads.set(message.id, thread)

    return { messages: [...thread] }
  },

  async getEventAttendance(id) {
    await delay(150)

    const common = {
      window: {
        startFrom: new Date(Date.now() - 10 * 60_000).toISOString(),
        startUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
        endUntil: new Date(Date.now() + 120 * 60_000).toISOString(),
        minStay: 10,
      },
      attemptsLeft: 5,
    }

    // En la web de mentira impartes las pizarras y pides las sesiones de ayuda.
    return id.startsWith('board:')
      ? {
          ...common,
          role: 'host',
          codes: { start: 'K7QM', end: 'R3XD' },
          mine: null,
          people: [
            {
              login: 'jdoe',
              startedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
              endedAt: new Date().toISOString(),
              minutes: 50,
            },
            {
              login: 'mgarcia',
              startedAt: new Date(Date.now() - 48 * 60_000).toISOString(),
              endedAt: null,
              minutes: null,
            },
          ],
        }
      : { ...common, role: 'guest', codes: null, mine: presences.get(id) ?? null, people: [] }
  },

  attendanceReportUrl: ({ from = '', to = '' }) =>
    `data:text/csv;charset=utf-8,${encodeURIComponent(
      [
        'login;rol;tipo;evento;titulo;fecha;inicio;fin;minutos_validados;minutos_previstos;con',
        `${ME.login};organiza;pizarra;board:1;Ejemplo de ${from} a ${to};${to};16:30;18:00;90;90;jdoe mgarcia`,
        '',
      ].join('\r\n'),
    )}`,

  async checkinEvent(id, code) {
    await delay(200)

    const before = presences.get(id)
    const phase =
      code.toUpperCase() === 'K7QM' ? 'start' : code.toUpperCase() === 'R3XD' ? 'end' : null

    if (phase === null) throw fail(400, 'Ese código no es de este evento')
    if (phase === 'end' && before === undefined)
      throw fail(409, 'Valida primero el código de inicio')

    const now = new Date().toISOString()
    const startedAt = before?.startedAt ?? now
    const endedAt = phase === 'end' ? now : null
    const presence = {
      login: ME.login,
      startedAt,
      endedAt,
      minutes:
        endedAt === null
          ? null
          : Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000),
    }

    presences.set(id, presence)

    return { phase, presence }
  },
}
