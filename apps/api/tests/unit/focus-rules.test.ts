/**
 * Reglas de las estadísticas del Pomodoro (#80 del buzón): cómo acaba cada
 * sesión, cómo se reparte su tiempo por horas y días y cómo se compara una
 * persona con un tramo de quienes lo usan.
 */
import { describe, expect, it } from 'vitest'

import {
  averageOf,
  figuresOf,
  focusedByLogin,
  positionOf,
  settle,
  summarize,
} from '../../src/modules/focus/focus.rules.js'
import type { FocusSession } from '../../src/modules/focus/focus.rules.js'

const MINUTE = 60_000
/** Un lunes a las 10:45 UTC. */
const AT = Date.parse('2026-10-19T10:45:00.000Z')

const session = (extra: Partial<FocusSession> = {}): FocusSession => ({
  login: 'ana',
  startedAt: AT,
  plannedS: 25 * 60,
  endedAt: null,
  outcome: null,
  reasons: [],
  stays: 0,
  stayReasons: [],
  ...extra,
})

describe('cómo acaba una sesión', () => {
  it('sin final guardado: en marcha hasta su hora, completada después', () => {
    expect(settle(session(), AT + 10 * MINUTE)).toEqual({
      outcome: 'running',
      endsAt: AT + 10 * MINUTE,
    })
    // Justo a su hora ya cuenta como completada (el límite).
    expect(settle(session(), AT + 25 * MINUTE)).toEqual({
      outcome: 'completed',
      endsAt: AT + 25 * MINUTE,
    })
  })

  it('parada: cuenta hasta que se paró, nunca más de lo planeado ni antes de empezar', () => {
    const now = AT + 60 * MINUTE

    expect(settle(session({ outcome: 'cancelled', endedAt: AT + 5 * MINUTE }), now).endsAt).toBe(
      AT + 5 * MINUTE,
    )
    expect(settle(session({ outcome: 'cancelled', endedAt: AT + 50 * MINUTE }), now).endsAt).toBe(
      AT + 25 * MINUTE,
    )
    // Un reloj que va hacia atrás no da tiempo negativo.
    expect(settle(session({ outcome: 'cancelled', endedAt: AT - MINUTE }), now).endsAt).toBe(AT)
  })
})

describe('cifras de unas sesiones', () => {
  it('suma sesiones, completadas, paradas, veces que siguió y tiempo', () => {
    const now = AT + 3 * 60 * MINUTE

    expect(
      figuresOf(
        [
          session(),
          session({ outcome: 'cancelled', endedAt: AT + 10 * MINUTE, stays: 2 }),
          session({ outcome: 'replaced', endedAt: AT + 4 * MINUTE }),
        ],
        now,
      ),
    ).toEqual({ sessions: 3, completed: 1, cancelled: 1, stayed: 2, focusedSeconds: 39 * 60 })
  })

  it('sin sesiones, todo a cero', () => {
    expect(figuresOf([], AT)).toEqual({
      sessions: 0,
      completed: 0,
      cancelled: 0,
      stayed: 0,
      focusedSeconds: 0,
    })
  })
})

describe('por días y por horas', () => {
  it('el tiempo se reparte por las horas que ocupó, en la hora de quien mira', () => {
    // 90 minutos desde las 10:45 UTC; en Madrid (+120) son las 12:45.
    const stats = summarize([session({ plannedS: 90 * 60 })], AT + 5 * 60 * MINUTE, 120)

    expect(stats.hours.filter((hour) => hour.focusedSeconds > 0)).toEqual([
      { hour: 12, sessions: 1, focusedSeconds: 15 * 60 },
      { hour: 13, sessions: 0, focusedSeconds: 60 * 60 },
      { hour: 14, sessions: 0, focusedSeconds: 15 * 60 },
    ])
    expect(stats.hours).toHaveLength(24)
    expect(stats.days).toEqual([
      {
        day: '2026-10-19',
        sessions: 1,
        completed: 1,
        cancelled: 0,
        stayed: 0,
        focusedSeconds: 5400,
      },
    ])
  })

  it('una sesión que cruza la medianoche reparte su tiempo entre los dos días', () => {
    const late = Date.parse('2026-10-19T23:30:00.000Z')
    const stats = summarize([session({ startedAt: late, plannedS: 60 * 60 })], late + 1e8, 0)

    expect(stats.days.map((one) => [one.day, one.sessions, one.focusedSeconds])).toEqual([
      ['2026-10-19', 1, 1800],
      ['2026-10-20', 0, 1800],
    ])
  })

  it('los motivos: los de parar solo de las paradas; los de seguir, siempre', () => {
    const stats = summarize(
      [
        session({
          outcome: 'cancelled',
          endedAt: AT + MINUTE,
          reasons: ['tired', 'urgent'],
          stays: 1,
          stayReasons: ['tired'],
        }),
        // Sustituida: sus motivos no son de parar.
        session({ outcome: 'replaced', endedAt: AT + MINUTE, reasons: ['other'] }),
      ],
      AT + 60 * MINUTE,
      0,
    )
    const of = (reason: string) => stats.reasons.find((one) => one.reason === reason)

    expect(of('tired')).toEqual({ reason: 'tired', cancelled: 1, stayed: 1 })
    expect(of('urgent')).toEqual({ reason: 'urgent', cancelled: 1, stayed: 0 })
    expect(of('other')).toEqual({ reason: 'other', cancelled: 0, stayed: 0 })
    expect(stats.reasons).toHaveLength(7)
    expect(stats.totals.people).toBe(1)
  })

  it('miles de sesiones de mucha gente no se pierden ni un segundo', () => {
    const many = Array.from({ length: 5000 }, (_, at) =>
      session({ login: `p${at % 300}`, startedAt: AT + at * 7 * MINUTE }),
    )
    const stats = summarize(many, AT + 1e10, 0)

    expect(stats.totals).toMatchObject({ sessions: 5000, completed: 5000, people: 300 })
    expect(stats.hours.reduce((sum, hour) => sum + hour.focusedSeconds, 0)).toBe(5000 * 25 * 60)
    expect(stats.days.reduce((sum, one) => sum + one.sessions, 0)).toBe(5000)
  })
})

describe('comparación con un tramo', () => {
  const now = AT + 10 * 60 * MINUTE
  const minutes = { ana: 10, leo: 20, mar: 30, sol: 40 }
  const sessions = Object.entries(minutes).map(([login, planned]) =>
    session({ login, plannedS: planned * 60 }),
  )

  it('lo concentrada que está cada cual y su puesto entre los demás', () => {
    const activity = focusedByLogin(sessions, now)

    expect(activity.get('mar')).toBe(30 * 60)
    expect(positionOf(activity, 'ana')).toBe(0)
    expect(positionOf(activity, 'mar')).toBe(67)
    expect(positionOf(activity, 'sol')).toBe(100)
    // Sin sesiones, o sin nadie con quien compararse: no hay puesto.
    expect(positionOf(activity, 'zoe')).toBeNull()
    expect(positionOf(new Map([['ana', 10]]), 'ana')).toBeNull()
  })

  it('la media por persona, con un decimal; sin nadie, ceros', () => {
    expect(averageOf(sessions.slice(2), 2, now)).toEqual({
      sessions: 1,
      completed: 1,
      cancelled: 0,
      stayed: 0,
      focusedSeconds: 35 * 60,
    })
    expect(averageOf(sessions.slice(0, 3), 2, now).sessions).toBe(1.5)
    expect(averageOf([], 0, now).focusedSeconds).toBe(0)
  })
})
