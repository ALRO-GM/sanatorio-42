/**
 * El cliente real de la API (`shared/api/client.ts`) contra un `fetch` falso:
 * las direcciones, los métodos y los cuerpos que manda, y cómo lee lo que le
 * contestan. Los tests de pantalla usan la API simulada, así que esto es lo
 * único que mira el cliente de verdad.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { realApi } from '../src/shared/api/client'
import { ApiError, onMaintenance } from '../src/shared/api/http'

type Sent = { url: string; method: string; body: unknown; headers: Headers; credentials?: string }

let sent: Sent[] = []
let reply: () => Response = () => Response.json({})

beforeEach(() => {
  sent = []
  reply = () => Response.json({})
  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    sent.push({
      url,
      method: init.method ?? 'GET',
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
      headers: new Headers(init.headers),
      ...(init.credentials === undefined ? {} : { credentials: init.credentials }),
    })

    return Promise.resolve(reply())
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const last = (): Sent => {
  const request = sent.at(-1)

  if (request === undefined) throw new Error('no se ha mandado nada')

  return request
}

describe('cliente de la API', () => {
  it('pide con la cookie, el idioma y bajo /api', async () => {
    await realApi.getMe()

    expect(last()).toMatchObject({ url: '/api/auth/me', method: 'GET', credentials: 'include' })
    expect(last().headers.get('x-lang')).toBe('es')
  })

  it('cada verbo, con su método y su cuerpo en JSON', async () => {
    await realApi.setAvailability(true)
    expect(last()).toMatchObject({
      url: '/api/me/availability',
      method: 'PUT',
      body: { available: true },
    })
    expect(last().headers.get('content-type')).toBe('application/json')

    reply = () => new Response(null, { status: 204 })
    await realApi.leaveQuizRoom(7)
    expect(last()).toMatchObject({
      url: '/api/quiz/rooms/7/leave',
      method: 'POST',
      body: undefined,
    })

    reply = () => Response.json({})
    await realApi.answerQuiz(7, 2, 3)
    expect(last()).toMatchObject({ method: 'POST', body: { question: 2, option: 3 } })
  })

  it('codifica lo que va en la dirección', async () => {
    await realApi.getCalendar('2026-10-01T00:00:00+02:00', '2026-10-08T00:00:00Z')

    expect(last().url).toBe(
      '/api/calendar?from=2026-10-01T00%3A00%3A00%2B02%3A00&to=2026-10-08T00%3A00%3A00Z&fresh=1',
    )
  })

  it('lee las cabeceras que acompañan al cuerpo', async () => {
    reply = () =>
      Response.json([], { headers: { 'x-total-participants': '12', 'x-partial': 'true' } })

    expect(await realApi.getPeers(1314)).toEqual({ peers: [], total: 12, partial: true })
  })

  it('el documento de horas va por POST y trae su nombre de fichero', async () => {
    reply = () =>
      new Response('a;b\r\n', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="horas-validadas_ana_x_y_K7QF.csv"',
        },
      })

    const report = await realApi.attendanceReport({ from: '2026-09-01', to: '2026-09-30' })

    expect(last()).toMatchObject({
      url: '/api/events/report/csv',
      method: 'POST',
      body: { from: '2026-09-01', to: '2026-09-30' },
    })
    expect(report.fileName).toBe('horas-validadas_ana_x_y_K7QF.csv')
    expect(await report.data.text()).toBe('a;b\r\n')
  })

  it('un error trae su código y el motivo del servidor', async () => {
    reply = () =>
      Response.json({ error: 'conflict', message: 'El grupo está completo' }, { status: 409 })

    const error = await realApi.getMe().catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      network: false,
      serverMessage: 'El grupo está completo',
    })
  })

  it('un 503 de mantenimiento avisa a quien escucha, con la hora de acabar', async () => {
    const heard: (string | null)[] = []
    const stop = onMaintenance((until) => {
      heard.push(until)
    })

    reply = () =>
      Response.json(
        { error: 'maintenance', message: 'En mantenimiento', until: '2026-10-25T14:00:00.000Z' },
        { status: 503 },
      )
    await expect(realApi.getPulse()).rejects.toMatchObject({ status: 503 })
    // Otro 503 (el tope del plan) no es mantenimiento.
    reply = () => Response.json({ error: 'service_stopped', message: 'Parado' }, { status: 503 })
    await expect(realApi.getPulse()).rejects.toMatchObject({ status: 503 })
    stop()
    reply = () => Response.json({ error: 'maintenance', message: 'x' }, { status: 503 })
    await expect(realApi.getPulse()).rejects.toMatchObject({ status: 503 })

    expect(heard).toEqual(['2026-10-25T14:00:00.000Z'])
  })

  it('mantenimiento y cuentas atrás, cada una a su ruta', async () => {
    reply = () => Response.json([])
    await realApi.getMaintenance()
    expect(last()).toMatchObject({ url: '/api/maintenance', method: 'GET' })
    await realApi.setMaintenance({ on: true, until: null })
    expect(last()).toMatchObject({
      url: '/api/admin/maintenance',
      method: 'PUT',
      body: { on: true },
    })
    await realApi.getCountdowns()
    expect(last()).toMatchObject({ url: '/api/countdowns', method: 'GET' })
    await realApi.pinCountdown({ kind: 'next' })
    expect(last()).toMatchObject({
      url: '/api/countdowns/pins',
      method: 'POST',
      body: { kind: 'next' },
    })
    await realApi.unpinCountdown(4)
    expect(last()).toMatchObject({ url: '/api/countdowns/pins/4', method: 'DELETE' })
    await realApi.dismissCountdown(5)
    expect(last()).toMatchObject({ url: '/api/countdowns/notices/5/dismiss', method: 'POST' })
    await realApi.getAdminCountdowns()
    expect(last()).toMatchObject({ url: '/api/admin/countdowns', method: 'GET' })
    await realApi.sendCountdown({ preset: 'lockers', at: '2026-10-30T08:00:00.000Z', group: 'all' })
    expect(last()).toMatchObject({ url: '/api/admin/countdowns', method: 'POST' })
    reply = () => new Response(null, { status: 204 })
    await realApi.removeCountdown(6)
    expect(last()).toMatchObject({ url: '/api/admin/countdowns/6', method: 'DELETE' })
  })

  it('sin cuerpo legible se queda el código; sin respuesta es de red', async () => {
    reply = () => new Response('<html>', { status: 503 })
    await expect(realApi.getMe()).rejects.toMatchObject({ status: 503, serverMessage: undefined })

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(realApi.getMe()).rejects.toMatchObject({ network: true, status: undefined })
  })
})
