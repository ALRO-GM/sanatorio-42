/**
 * Pomodoro (#65 del buzón): te pones a concentrarte un rato y los demás ven
 * «concentrado, no me distraigas» junto a tu nombre, tu puesto y tu ficha. La
 * web, mientras tanto, solo enseña lo que elegiste (eso lo hace la web con los
 * ajustes que se guardan aquí). La concentración acaba sola a su hora.
 */

import type { Focus, FocusSettings, FocusStats, MyFocusStats } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { day, parse } from '../../core/validation.js'
import { inList, listArg } from '../../core/db/sql.js'
import { segmentOf } from '../usage/index.js'
import { averageOf, focusedByLogin, positionOf, REASONS, settle, summarize } from './focus.rules.js'
import type { SessionLog } from './focus.sessions.js'
import { isoAt } from '../../core/time.js'

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

/** Los motivos marcados al querer acabar: sin repetir y solo los que existen. */
const exitSchema = z
  .object({
    reasons: z
      .array(z.enum(REASONS))
      .max(REASONS.length)
      .default([])
      .transform((list) => [...new Set(list)]),
  })
  .default({ reasons: [] })

/** Gente mínima del tramo con el que se compara cada cual. */
const MIN_BAND_PEOPLE = 5

/** Del 0 al 100: el tramo de gente, de quien menos lo usa a quien más. */
const share = z.coerce.number().int().min(0).max(100)

const statsSchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
    /** Minutos que hay que sumar a UTC para tener la hora de quien mira (−14 h a +14 h). */
    offset: z.coerce.number().int().min(-840).max(840).default(0),
    low: share.default(0),
    high: share.default(100),
  })
  .refine((asked) => asked.low < asked.high, 'el tramo va de menos a más')

export function createFocusRepository(db: Db) {
  return {
    /** Quién de esos está concentrado ahora, y hasta cuándo. */
    async untilOf(logins: readonly string[], now: string): Promise<Map<string, string>> {
      if (logins.length === 0) return new Map()

      const result = await db.execute({
        sql: `SELECT login, until FROM focus WHERE until > ? AND ${inList('login')}`,
        args: [now, listArg(logins)],
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

export function createFocusService(
  focus: FocusRepository,
  log: SessionLog,
  now: () => number = Date.now,
) {
  async function view(login: string): Promise<Focus> {
    const found = await focus.get(login)
    const active = found !== null && Date.parse(found.until) > now()

    return {
      until: active ? found.until : null,
      startedAt: active ? found.startedAt : null,
      settings: found?.settings ?? DEFAULT_FOCUS,
    }
  }

  /** La sesión que esa persona tiene en marcha ahora, si la tiene. */
  async function running(login: string) {
    const open = await log.latestOpen(login)

    return open !== null && settle(open.session, now()).outcome === 'running' ? open : null
  }

  /**
   * El periodo pedido, en instantes UTC: de las 00:00 del primer día local a
   * las 00:00 del día siguiente al último. Sin `to`, hasta hoy; sin `from`,
   * desde siempre (el total).
   */
  function period(input: unknown) {
    const asked = parse(statsSchema, input ?? {})
    const shift = asked.offset * 60_000
    const to = asked.to ?? isoAt(now() + shift).slice(0, 10)
    const from = asked.from ?? null

    if (from !== null && from > to) throw domainError('invalid_input', 'from: va antes que to')

    const at = (local: string): string => isoAt(Date.parse(`${local}T00:00:00.000Z`) - shift)

    return {
      ...asked,
      from,
      to,
      since: from === null ? null : at(from),
      until: isoAt(Date.parse(at(to)) + 86_400_000),
    }
  }

  /**
   * Todas las sesiones del periodo y el tramo pedido de gente, por tiempo
   * concentrado. Con `minPeople`, el tramo tiene al menos esa gente.
   */
  async function chosen(input: unknown, minPeople = 0) {
    const asked = period(input)
    const sessions = await log.between(asked.since, asked.until)
    const activity = focusedByLogin(sessions, now())
    const segment = segmentOf(activity, asked.low, asked.high, minPeople)

    return { asked, sessions, activity, segment }
  }

  return {
    view: (actor: Actor) => view(actor.login),

    /** Empieza (o vuelve a empezar) a concentrarse, con esos ajustes. */
    async start(actor: Actor, input: unknown): Promise<Focus> {
      const settings = parse(settingsSchema, input)
      const t = now()
      const before = await running(actor.login)

      // Volver a empezar no es rendirse: la de antes cuenta su tiempo, sin motivos.
      if (before !== null) await log.close(before.id, isoAt(t), 'replaced', [])
      await focus.save(actor.login, isoAt(t), isoAt(t + settings.focusMinutes * 60_000), settings)
      await log.open(actor.login, isoAt(t), settings.focusMinutes * 60)

      return view(actor.login)
    },

    /**
     * Acaba antes de tiempo, con los motivos marcados (`FocusExit`; puede no
     * venir ninguno). Se guardan los ajustes para la próxima.
     */
    async stop(actor: Actor, input?: unknown): Promise<Focus> {
      const { reasons } = parse(exitSchema, input ?? undefined)
      const found = await focus.get(actor.login)
      const open = await running(actor.login)

      if (found !== null)
        await focus.save(actor.login, found.startedAt, isoAt(now()), found.settings)
      if (open !== null) await log.close(open.id, isoAt(now()), 'cancelled', reasons)

      return view(actor.login)
    },

    /**
     * Pulsó «Acabar» y, pensándolo, sigue: se apunta con sus motivos. Sin
     * sesión en marcha no hay nada que apuntar.
     */
    async stay(actor: Actor, input: unknown): Promise<Focus> {
      const { reasons } = parse(exitSchema, input ?? undefined)
      const open = await running(actor.login)

      if (open !== null) await log.stay(open.id, open.session, reasons)

      return view(actor.login)
    },

    /**
     * Tus estadísticas del periodo y, al lado, la media por persona del tramo
     * elegido de quienes lo usan (`low`–`high`, de menos a más tiempo).
     */
    async myStats(actor: Actor, input: unknown): Promise<MyFocusStats> {
      // Cualquiera puede mirar esto: el tramo no baja de cinco personas, para
      // que la media no sea la de alguien en concreto.
      const { asked, sessions, activity, segment } = await chosen(input, MIN_BAND_PEOPLE)
      const mine = sessions.filter((session) => session.login === actor.login)
      const band = sessions.filter((session) => segment.keep(session.login))

      return {
        from: asked.from,
        to: asked.to,
        ...summarize(mine, now(), asked.offset),
        segment: { low: asked.low, high: asked.high, people: segment.people, of: segment.of },
        band: averageOf(band, segment.people, now()),
        position: positionOf(activity, actor.login),
      }
    },

    /** Las de todo el mundo (o del tramo elegido), para el panel. Solo admins. */
    async adminStats(actor: Actor, input: unknown): Promise<FocusStats> {
      assertAdmin(actor)

      const { asked, sessions, segment } = await chosen(input)

      return {
        from: asked.from,
        to: asked.to,
        ...summarize(
          sessions.filter((session) => segment.keep(session.login)),
          now(),
          asked.offset,
        ),
        segment: { low: asked.low, high: asked.high, people: segment.people, of: segment.of },
      }
    },
  }
}

export type FocusService = ReturnType<typeof createFocusService>
