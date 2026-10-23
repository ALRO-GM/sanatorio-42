/**
 * API de mentira: avisos, chat y asistencia de un evento.
 */

import { ME } from './data'
import type { Api } from '../types'
import { delay, fail, projectName, state, threads, presences } from './state'
import { portrait } from './portrait'
import type { Conversation } from '@sanatorio/contracts'
import { calendarEvents } from './calendar'

export const meetMock: Pick<
  Api,
  | 'getEventAlerts'
  | 'ackEventAlert'
  | 'getEventThread'
  | 'sendEventMessage'
  | 'getEventAttendance'
  | 'checkinEvent'
  | 'attendanceReport'
  | 'getConversations'
  | 'markConversation'
> = {
  // En la web de mentira avisa lo que empieza en las próximas horas y es con más
  // gente; contestar en su chat lo quita de la lista, como en la de verdad.
  async getEventAlerts() {
    await delay(120)

    const now = Date.now()

    // Para enseñar el aviso obligatorio sin esperar a que toque: con `?avisos`
    // en la dirección, los dos próximos eventos con más gente "empiezan" ya.
    if (new URLSearchParams(window.location.search).has('avisos')) {
      return {
        alerts: calendarEvents(state)
          .filter((event) => event.kind === 'therapy' || event.kind === 'board')
          .filter(
            (event) =>
              !(threads.get(event.id) ?? []).some(
                (message) => message.login === ME.login && message.kind !== 'text',
              ),
          )
          .slice(0, 2)
          .map((event, index) => ({
            event: { ...event, start: new Date(now + (index + 2) * 60_000).toISOString() },
            state: 'pending' as const,
          })),
      }
    }

    return {
      alerts: calendarEvents(state)
        .filter((event) => {
          const start = Date.parse(event.start)

          return start > now - 30 * 60_000 && start < now + 3 * 3_600_000
        })
        .filter((event) => event.joined !== false && event.kind !== 'event_open')
        .filter(
          (event) =>
            !(threads.get(event.id) ?? []).some(
              (message) => message.login === ME.login && message.kind !== 'text',
            ),
        )
        .map((event) => ({
          event,
          // Como la API: las correcciones de 42 solo avisan, no piden respuesta.
          state:
            event.kind === 'therapy' || event.kind === 'board'
              ? ('pending' as const)
              : ('info' as const),
        })),
    }
  },

  async ackEventAlert() {
    await delay(80)
  },

  async getEventThread(id, after = 0) {
    await delay(120)

    // Abrir una conversación es leerla.
    markOf(id).readUpto = (threads.get(id) ?? []).at(-1)?.id ?? 0

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
    markOf(message.id).readUpto = thread.length

    return { messages: [...thread] }
  },

  async getConversations() {
    await delay(150)

    return conversations()
  },

  async markConversation(change) {
    await delay(120)

    const mark = markOf(change.id)
    const thread = threads.get(change.id) ?? []

    if (change.read !== undefined) {
      const lastOther = thread.findLast((message) => message.login !== ME.login)?.id ?? 0

      mark.readUpto = change.read || lastOther === 0 ? (thread.at(-1)?.id ?? 0) : lastOther - 1
    }
    if (change.pending !== undefined) mark.pending = change.pending
    if (change.remindAt !== undefined) {
      mark.remindAt = change.remindAt
      if (change.remindAt !== null && change.pending === undefined) mark.pending = true
    }
    if (change.projectId !== undefined) mark.projectId = change.projectId

    return conversations()
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

  async attendanceReport({ from = '', to = '' }) {
    await delay(80)

    return {
      fileName: `horas-validadas_${ME.login}_${from}_${to}_K7QF.csv`,
      data: new Blob(
        [
          [
            'login;rol;tipo;evento;titulo;fecha;inicio;fin;minutos_validados;minutos_previstos;con',
            `${ME.login};organiza;pizarra;board:1;Ejemplo de ${from} a ${to};${to};16:30;18:00;90;90;jdoe mgarcia`,
            // El código con el que el staff puede comprobarlo (en la web de mentira, siempre este).
            'codigo_de_verificacion;K7QF',
            '',
          ].join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    }
  },

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

// --- Conversaciones de mentira ------------------------------------------------

type Mark = {
  readUpto: number
  pending: boolean
  remindAt: string | null
  projectId: number | null
}

const marks = new Map<string, Mark>()

function markOf(id: string): Mark {
  const known = marks.get(id)

  if (known !== undefined) return known

  const fresh: Mark = { readUpto: 0, pending: false, remindAt: null, projectId: null }

  marks.set(id, fresh)

  return fresh
}

const TITLES: Record<string, string> = {
  'board:1': 'malloc: dónde vive tu memoria',
  'group:1': 'ft_printf',
  'help:booking:4': 'ft_printf',
}

const kindOf = (id: string): Conversation['kind'] =>
  id.startsWith('dm:')
    ? 'direct'
    : id.startsWith('group:') || id.startsWith('therapy:')
      ? 'group'
      : id.startsWith('board:')
        ? 'board'
        : id.startsWith('help:')
          ? 'help'
          : 'event'

/** Unas cuantas conversaciones ya empezadas, para que la bandeja no salga vacía. */
function seed(): void {
  if (seeded) return

  seeded = true

  const minutes = (ago: number): string => new Date(Date.now() - ago * 60_000).toISOString()
  const dm = (login: string): string => `dm:${[login, ME.login].sort().join(':')}`
  const say = (id: string, login: string, body: string, ago: number): void => {
    const thread = threads.get(id) ?? []

    thread.push({
      id: thread.length + 1,
      login,
      image: login === ME.login ? null : portrait(login),
      kind: 'text',
      minutes: null,
      reason: null,
      body,
      at: minutes(ago),
    })
    threads.set(id, thread)
  }

  if ((threads.get('board:1') ?? []).length === 0) {
    say('board:1', 'jdoe', '¿A qué hora empezamos?', 30)
    say('board:1', 'jdoe', '¿Hace falta traer algo?', 4)
  }
  say(dm('jdoe'), 'jdoe', '¿Sigues por el cluster 1?', 12)
  say(dm('mgarcia'), ME.login, '¿Me echas un ojo al parser de ft_printf?', 60 * 26)
  say(dm('mgarcia'), 'mgarcia', 'Claro. ¿Te va mañana por la tarde?', 60 * 25)
  say('group:1', 'agarcia', 'Mañana quedamos a las cinco en el cluster 2.', 60 * 3)
  say('group:1', ME.login, 'Perfecto, llevo las pruebas.', 60 * 2)

  markOf(dm('mgarcia')).readUpto = 2
  markOf(dm('mgarcia')).pending = true
  markOf(dm('mgarcia')).projectId = 1314
  markOf('group:1').readUpto = 2
}

let seeded = false

function conversations(): { items: Conversation[] } {
  seed()

  const items = [...threads]
    .filter(([id, thread]) => thread.length > 0 && (id.startsWith('dm:') || id in TITLES))
    .map(([id, thread]): Conversation => {
      const mark = markOf(id)
      const last = thread.at(-1)
      const peer = id.startsWith('dm:')
        ? (id
            .split(':')
            .slice(1)
            .find((login) => login !== ME.login) ?? null)
        : null

      return {
        id,
        kind: kindOf(id),
        title: peer ?? TITLES[id] ?? null,
        peer,
        image: peer === null ? null : portrait(peer),
        online: peer === 'jdoe',
        last:
          last === undefined
            ? null
            : {
                from: last.login,
                body: last.body?.slice(0, 80) ?? null,
                kind: last.kind,
                at: last.at,
              },
        unread: thread.filter((message) => message.login !== ME.login && message.id > mark.readUpto)
          .length,
        pending: mark.pending,
        remindAt: mark.remindAt,
        project:
          mark.projectId === null
            ? null
            : { id: mark.projectId, name: projectName(mark.projectId) },
      }
    })

  return { items: items.sort((a, b) => (b.last?.at ?? '').localeCompare(a.last?.at ?? '')) }
}
