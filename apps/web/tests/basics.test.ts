/**
 * Funciones pequeñas que usa toda la web: días y horas, títulos, avisos,
 * peticiones HTTP y comodidad. Cada una con lo normal, el borde y lo raro.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CalendarEvent, Notice, NoticeKind } from '@sanatorio/contracts'

import { hasCodes, hasRoom } from '../src/features/calendar/eligible'
import { addDays, daysOf, eventsOn, move, rangeOn, sameDay } from '../src/features/calendar/dates'
import { iconOf, targetOf } from '../src/features/notices/routes'
import { titleText } from '../src/features/profile/title'
import { ApiError, fetchApi, intHeader } from '../src/shared/api/http'
import { autoSize, readComfort } from '../src/shared/comfort'
import { clockOf, dayKey, hhmm, pad2, todayKey } from '../src/shared/day'

describe('días y horas', () => {
  it('rellena con ceros y da la clave del día en la hora local', () => {
    expect(pad2(0)).toBe('00')
    expect(pad2(9)).toBe('09')
    expect(pad2(10)).toBe('10')
    expect(pad2(123)).toBe('123')
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    // El 29 de febrero solo existe en bisiestos: el 2027 pasa al 1 de marzo.
    expect(dayKey(new Date(2028, 1, 29))).toBe('2028-02-29')
    expect(dayKey(new Date(2027, 1, 29))).toBe('2027-03-01')
  })

  it('hoy es el día de ese instante', () => {
    expect(todayKey(new Date(2026, 9, 17, 0, 0).getTime())).toBe('2026-10-17')
    expect(todayKey(new Date(2026, 9, 17, 23, 59, 59).getTime())).toBe('2026-10-17')
    expect(todayKey()).toBe(dayKey(new Date()))
  })

  it('escribe las horas', () => {
    expect(hhmm(new Date(2026, 9, 17, 7, 5).toISOString())).toBe('07:05')
    expect(clockOf(0)).toBe('00:00')
    expect(clockOf(570)).toBe('09:30')
    expect(clockOf(1439)).toBe('23:59')
    // La medianoche del final del día se escribe 24:00, como en el editor de franjas.
    expect(clockOf(1440)).toBe('24:00')
  })
})

describe('calendario', () => {
  const event = (start: Date, end: Date): CalendarEvent => ({
    id: 'board:1',
    kind: 'board',
    title: 'Pizarra',
    label: null,
    start: start.toISOString(),
    end: end.toISOString(),
    place: null,
    description: null,
    joined: true,
    seats: null,
    withLogin: null,
    url: null,
    section: 'pizarras',
  })

  it('un mes son semanas enteras, de lunes a domingo', () => {
    for (const month of [0, 1, 5, 9, 11]) {
      const days = daysOf('month', new Date(2026, month, 15))

      expect(days.length % 7).toBe(0)
      expect(days[0]?.getDay()).toBe(1)
      expect(days.at(-1)?.getDay()).toBe(0)
      expect(days.some((day) => day.getDate() === 1 && day.getMonth() === month)).toBe(true)
    }
    expect(daysOf('week', new Date(2026, 9, 18))).toHaveLength(7)
    expect(daysOf('day', new Date(2026, 9, 18, 15))).toEqual([new Date(2026, 9, 18)])
  })

  it('avanza y retrocede por día, semana o mes, también al cambiar de año', () => {
    expect(move('day', new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1))
    expect(move('week', new Date(2026, 0, 3), -1)).toEqual(new Date(2025, 11, 27))
    expect(move('month', new Date(2026, 0, 31), -1)).toEqual(new Date(2025, 11, 1))
    expect(sameDay(addDays(new Date(2026, 1, 28), 1), new Date(2026, 2, 1))).toBe(true)
  })

  it('un evento de varios días sale en cada uno, sin hora donde no empieza ni acaba', () => {
    const day = new Date(2026, 9, 17)
    const long = event(new Date(2026, 9, 16, 22), new Date(2026, 9, 18, 2))

    expect(eventsOn([long], day)).toHaveLength(1)
    expect(eventsOn([long], new Date(2026, 9, 19))).toHaveLength(0)
    expect(rangeOn(long, day, 'es')).toBe('')
    // Uno que acaba justo a medianoche no sale al día siguiente.
    const toMidnight = event(new Date(2026, 9, 17, 22), new Date(2026, 9, 18))

    expect(eventsOn([toMidnight], new Date(2026, 9, 18))).toHaveLength(0)
  })

  it('solo hay sala y aviso en lo que es con más gente y vas a ir', () => {
    const base = event(new Date(), new Date())

    expect(hasRoom(base)).toBe(true)
    expect(hasRoom({ ...base, joined: false })).toBe(false)
    expect(hasRoom({ ...base, kind: 'event_joined', joined: true })).toBe(false)
    expect(hasRoom({ ...base, kind: 'help', id: 'help:booking:3', joined: null })).toBe(true)
    expect(hasCodes(base)).toBe(true)
    expect(hasCodes({ ...base, kind: 'therapy' })).toBe(false)
  })
})

describe('títulos', () => {
  const t = (key: string): string => key.replace('title.', '')

  it('el de maestro cuenta proyectos desde dos, y el de hacker pillado desde tres', () => {
    expect(titleText(t, 'maestro', 0, 1)).toBe('maestro')
    expect(titleText(t, 'maestro', 0, 2)).toBe('maestro ×2')
    expect(titleText(t, 'hacker_cazado', 2)).toBe('hacker_cazado')
    expect(titleText(t, 'hacker_cazado', 3)).toBe('hacker_cazado ×3')
    expect(titleText(t, 'paciente', 99, 99)).toBe('paciente')
  })
})

describe('avisos', () => {
  const kinds: NoticeKind[] = [
    'ticket_answered',
    'ticket_new',
    'chat',
    'chat_reminder',
    'booking_requested',
    'booking_accepted',
    'booking_declined',
    'booking_cancelled',
    'doubt_answered',
    'doubt_solved',
    'proposal_accepted',
    'proposal_rejected',
    'board_changed',
    'board_cancelled',
    'group_joined',
    'group_closed',
    'group_invite',
    'clicker_defense',
  ]
  const notice = (kind: NoticeKind, ref = 'x:1'): Notice =>
    ({ id: 1, kind, ref, from: null, at: '', read: false, saved: false }) as unknown as Notice

  it('cada tipo tiene icono y sitio al que llevar', () => {
    for (const kind of kinds) {
      expect(iconOf(notice(kind))).toBeTruthy()
      expect(targetOf(notice(kind))).toBeTruthy()
    }
  })

  it('un chat lleva a donde vive: conversación, grupo o evento', () => {
    expect(targetOf(notice('chat', 'dm:ana:leo'))).toBe('conversations')
    expect(targetOf(notice('chat', 'group:4'))).toBe('terapia')
    expect(targetOf(notice('chat', 'board:9'))).toBe('calendario')
  })
})

describe('peticiones a la API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const respond = (response: Response | Error) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
      ),
    )
  }

  it('devuelve la respuesta buena tal cual', async () => {
    respond(new Response('{"ok":true}', { status: 200 }))
    expect(await (await fetchApi('/x')).json()).toEqual({ ok: true })
  })

  it('un error con cuerpo trae el motivo del servidor', async () => {
    respond(
      new Response('{"error":"conflict","message":"El grupo está completo"}', { status: 409 }),
    )
    await expect(fetchApi('/x')).rejects.toMatchObject({
      status: 409,
      network: false,
      serverMessage: 'El grupo está completo',
    })
  })

  it('un error sin cuerpo legible se queda con el código', async () => {
    respond(new Response('<html>caído</html>', { status: 502 }))
    const error = await fetchApi('/x').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, serverMessage: undefined })
  })

  it('sin red es un error de red, no de servidor', async () => {
    respond(new TypeError('Failed to fetch'))
    await expect(fetchApi('/x')).rejects.toMatchObject({ network: true, status: undefined })
  })

  it('lee enteros de cabecera y no se inventa los que no vienen', () => {
    const headers = (value: string | null) =>
      new Response(null, value === null ? {} : { headers: { 'x-n': value } })

    expect(intHeader(headers('42'), 'x-n')).toBe(42)
    expect(intHeader(headers('0'), 'x-n')).toBe(0)
    expect(intHeader(headers('-3'), 'x-n')).toBe(-3)
    expect(intHeader(headers(''), 'x-n')).toBeNull()
    expect(intHeader(headers('   '), 'x-n')).toBeNull()
    expect(intHeader(headers('cuarenta'), 'x-n')).toBeNull()
    expect(intHeader(headers(null), 'x-n')).toBeNull()
  })
})

describe('comodidad', () => {
  it('lee lo guardado y descarta lo que no entiende', () => {
    expect(readComfort('{"text":125,"cvd":true,"zen":true}')).toEqual({
      text: 125,
      cvd: true,
      zen: true,
    })
    expect(readComfort(null)).toEqual({ text: 'auto', cvd: false, zen: false })
    expect(readComfort('no es json')).toEqual({ text: 'auto', cvd: false, zen: false })
    // Un tamaño que no está en la lista, o valores del tipo que no toca.
    expect(readComfort('{"text":300,"cvd":"sí","zen":1}')).toEqual({
      text: 'auto',
      cvd: false,
      zen: false,
    })
    expect(readComfort('[]')).toEqual({ text: 'auto', cvd: false, zen: false })
  })

  it('agranda el texto solo en las pantallas grandes del cluster', () => {
    expect(autoSize(1280)).toBe(100)
    expect(autoSize(1799)).toBe(100)
    expect(autoSize(1800)).toBe(110)
    expect(autoSize(2399)).toBe(110)
    expect(autoSize(2400)).toBe(125)
  })
})
