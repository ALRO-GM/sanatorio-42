/**
 * Pomodoro (#65 del buzón): te pones a concentrarte un rato y los demás ven
 * «concentrado, no me distraigas» junto a tu nombre, tu puesto y tu ficha. La
 * web, mientras tanto, solo enseña lo que elegiste (eso lo hace la web con los
 * ajustes que se guardan aquí). La concentración acaba sola a su hora.
 */

import type { Focus, FocusSettings } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import { parse } from '../../core/validation.js'

const DEFAULT_FOCUS: FocusSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  sections: ['calendario', 'expediente'],
  show: ['corrections', 'events'],
}

const settingsSchema = z.object({
  focusMinutes: z.number().int().min(5).max(180),
  breakMinutes: z.number().int().min(0).max(60),
  sections: z.array(z.string().regex(/^[a-z]{2,20}$/)).max(20),
  show: z.array(z.enum(['corrections', 'events', 'messages', 'guard', 'notices'])).max(5),
})

export function createFocusRepository(db: Db) {
  return {
    /** Quién de esos está concentrado ahora, y hasta cuándo. */
    async untilOf(logins: readonly string[], now: string): Promise<Map<string, string>> {
      if (logins.length === 0) return new Map()

      const result = await db.execute({
        sql: `SELECT login, until FROM focus WHERE until > ? AND login IN (${logins.map(() => '?').join(', ')})`,
        args: [now, ...logins],
      })

      return new Map(result.rows.map((row) => [toText(row.login), toText(row.until)]))
    },

    async get(
      login: string,
    ): Promise<{ startedAt: string; until: string; settings: FocusSettings } | null> {
      const result = await db.execute({ sql: 'SELECT * FROM focus WHERE login = ?', args: [login] })
      const row = result.rows[0]

      if (row === undefined) return null

      return {
        startedAt: toText(row.started_at),
        until: toText(row.until),
        settings: {
          ...DEFAULT_FOCUS,
          ...(JSON.parse(toText(row.settings)) as Partial<FocusSettings>),
        },
      }
    },

    async save(
      login: string,
      startedAt: string,
      until: string,
      settings: FocusSettings,
    ): Promise<void> {
      await db.execute({
        sql: `INSERT INTO focus (login, started_at, until, settings) VALUES (?, ?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET started_at = excluded.started_at,
                until = excluded.until, settings = excluded.settings`,
        args: [login, startedAt, until, JSON.stringify(settings)],
      })
    },
  }
}

export type FocusRepository = ReturnType<typeof createFocusRepository>

export function createFocusService(focus: FocusRepository, now: () => number = Date.now) {
  const iso = (ms: number): string => new Date(ms).toISOString()

  async function view(login: string): Promise<Focus> {
    const found = await focus.get(login)
    const active = found !== null && Date.parse(found.until) > now()

    return {
      until: active ? found.until : null,
      startedAt: active ? found.startedAt : null,
      settings: found?.settings ?? DEFAULT_FOCUS,
    }
  }

  return {
    view: (actor: Actor) => view(actor.login),

    /** Empieza (o vuelve a empezar) a concentrarse, con esos ajustes. */
    async start(actor: Actor, input: unknown): Promise<Focus> {
      const settings = parse(settingsSchema, input)
      const t = now()

      await focus.save(actor.login, iso(t), iso(t + settings.focusMinutes * 60_000), settings)

      return view(actor.login)
    },

    /** Acaba antes de tiempo. Se guardan los ajustes para la próxima. */
    async stop(actor: Actor): Promise<Focus> {
      const found = await focus.get(actor.login)

      if (found !== null) await focus.save(actor.login, found.startedAt, iso(now()), found.settings)

      return view(actor.login)
    },
  }
}

export type FocusService = ReturnType<typeof createFocusService>
