/**
 * Topes por persona que se regulan desde el panel (`docs/limites.md`).
 *
 * Cada tope tiene su valor de fábrica (el que había escrito en su servicio) y
 * unos márgenes razonables. Quien administra puede cambiarlo para todo el
 * mundo o solo para una persona; manda lo más concreto: persona > todo el
 * mundo > fábrica.
 *
 * Lo que protege la máquina o el plan (el corte al 90 % de Oracle, el cupo de
 * la API de 42, los topes por IP, los de CPU) **no está aquí** y no se regula:
 * ver `AGENTS.md`, «Límites del plan».
 *
 * Los cambios se guardan en `action_limits` (migración 89): `login = ''` es lo
 * de todo el mundo. La tabla es pequeña, así que se lee entera y se guarda en
 * memoria un minuto; al cambiar algo desde aquí se olvida al momento.
 */

import { z } from 'zod'

import type {
  ActionLimit,
  ActionLimitKey,
  ActionLimits,
  ActionLimitUnit,
} from '@sanatorio/contracts'

import { assertAdmin } from './actor.js'
import type { Actor } from './actor.js'
import type { Db } from './db/database.js'
import { toNumber, toText } from './db/rows.js'
import { clockOf } from './options.js'
import type { Clock } from './options.js'
import { parse } from './validation.js'

type LimitDef = { default: number; min: number; max: number; unit: ActionLimitUnit }

/**
 * Los topes, con su valor de fábrica. El porqué de cada uno está junto a donde
 * se aplica. Los márgenes evitan un cero por error (que dejaría a alguien sin
 * poder hacer nada sin saber por qué) y un número que deje inundar a los demás.
 */
export const ACTION_LIMITS = {
  // Chats de los eventos y conversaciones del buzón (`meet.service.ts`).
  'messages.perMinute': { default: 20, min: 1, max: 200, unit: 'per_minute' },
  'messages.perMinuteChat': { default: 8, min: 1, max: 100, unit: 'per_minute' },
  // Buzón de incidencias y sugerencias (`admin.service.ts`).
  'tickets.open': { default: 10, min: 1, max: 100, unit: 'at_once' },
  'tickets.per10Minutes': { default: 3, min: 1, max: 50, unit: 'per_10_minutes' },
  'suggestions.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  // Puestos rotos vigentes (`map.service.ts`).
  'brokenSeats.active': { default: 10, min: 1, max: 100, unit: 'at_once' },
  // Dudas nuevas al día (`doubts.service.ts`).
  'doubts.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  // Peticiones de ayuda abiertas (`help.service.ts`).
  'help.activeRequests': { default: 3, min: 1, max: 20, unit: 'at_once' },
  // Sprints abiertos que organiza una persona (`therapy.service.ts`).
  'therapy.openGroups': { default: 3, min: 1, max: 20, unit: 'at_once' },
  // Pizarras por venir que organiza una persona (`boards.service.ts`).
  'boards.upcoming': { default: 5, min: 1, max: 50, unit: 'at_once' },
  // Avisos al staff del edificio al día (`facility.service.ts`).
  'facility.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  // Metas en marcha de la agenda (`agenda.service.ts`).
  'agenda.activeGoals': { default: 8, min: 1, max: 50, unit: 'at_once' },
  // Cuentas atrás fijadas a la vez (`countdowns.service.ts`).
  'countdowns.pins': { default: 12, min: 1, max: 50, unit: 'at_once' },
} as const satisfies Record<ActionLimitKey, LimitDef>

const KEYS = Object.keys(ACTION_LIMITS) as ActionLimitKey[]

/** Lo que se guarda en memoria antes de volver a leer la tabla. */
const CACHE_MS = 60_000

/** El login de las filas que valen para todo el mundo. */
const EVERYONE = ''

const login = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,30}$/, 'login no válido')

const keySchema = z.enum(KEYS as [ActionLimitKey, ...ActionLimitKey[]])

const changeSchema = z
  .object({
    key: keySchema,
    /** Sin él, para todo el mundo. */
    login: login.optional(),
    /** `null` vuelve a lo de arriba (todo el mundo o fábrica). */
    value: z.number().int().nullable(),
  })
  .refine(
    ({ key, value }) =>
      value === null || (value >= ACTION_LIMITS[key].min && value <= ACTION_LIMITS[key].max),
    { message: 'fuera de los márgenes de ese tope', path: ['value'] },
  )

const querySchema = z.object({ login: login.optional() })

/** Lo que leen los servicios: el tope que le toca a una persona. */
export type Limits = {
  of: (key: ActionLimitKey, login: string) => Promise<number>
}

export type LimitsAdmin = Limits & {
  /** `GET /admin/action-limits`: los topes, de una persona si se dice. */
  list: (actor: Actor, query: unknown) => Promise<ActionLimits>
  /** `PUT /admin/action-limits`: pone o quita un tope, de todo el mundo o de alguien. */
  set: (actor: Actor, input: unknown) => Promise<ActionLimits>
  /** `DELETE /admin/action-limits/:login`: devuelve a alguien a lo de todo el mundo. */
  reset: (actor: Actor, login: unknown) => Promise<ActionLimits>
}

/**
 * Los valores de fábrica, sin base: para los servicios que se montan sueltos
 * (tests de un servicio). La aplicación les pasa el de `createLimits`.
 */
export const fixedLimits: Limits = {
  of: (key) => Promise.resolve(ACTION_LIMITS[key].default),
}

type Overrides = Map<string, Map<ActionLimitKey, number>>

export function createLimits(options: Clock & { db: Db }): LimitsAdmin {
  const { db } = options
  const now = clockOf(options)
  let cached: { at: number; value: Promise<Overrides> } | null = null

  const load = async (): Promise<Overrides> => {
    const result = await db.execute('SELECT login, key, value FROM action_limits')
    const overrides: Overrides = new Map()

    for (const row of result.rows) {
      const key = toText(row.key) as ActionLimitKey

      // Una clave que ya no existe (un tope retirado) no cuenta.
      if (!(key in ACTION_LIMITS)) continue

      const who = toText(row.login)
      const mine = overrides.get(who) ?? new Map<ActionLimitKey, number>()

      mine.set(key, toNumber(row.value))
      overrides.set(who, mine)
    }

    return overrides
  }

  const overrides = (): Promise<Overrides> => {
    if (cached === null || now() - cached.at >= CACHE_MS) {
      const value = load()

      cached = { at: now(), value }
      // Un fallo de la base no se queda guardado: la siguiente vez se reintenta.
      value.catch(() => {
        if (cached?.value === value) cached = null
      })
    }

    return cached.value
  }

  const resolve = (all: Overrides, key: ActionLimitKey, who: string | null): ActionLimit => {
    const def: LimitDef = ACTION_LIMITS[key]
    const global = all.get(EVERYONE)?.get(key) ?? null
    const user = who === null ? null : (all.get(who)?.get(key) ?? null)

    return {
      key,
      unit: def.unit,
      default: def.default,
      min: def.min,
      max: def.max,
      global,
      user,
      effective: user ?? global ?? def.default,
    }
  }

  const listFor = async (who: string | null): Promise<ActionLimits> => {
    const all = await overrides()

    return {
      login: who,
      limits: KEYS.map((key) => resolve(all, key, who)),
      people: [...all]
        .filter(([person]) => person !== EVERYONE)
        .map(([person, mine]) => ({ login: person, count: mine.size }))
        .sort((a, b) => a.login.localeCompare(b.login)),
    }
  }

  return {
    async of(key, who) {
      return resolve(await overrides(), key, who.toLowerCase()).effective
    },

    async list(actor, query) {
      assertAdmin(actor)

      return listFor(parse(querySchema, query).login ?? null)
    },

    async set(actor, input) {
      assertAdmin(actor)

      const change = parse(changeSchema, input)
      const who = change.login ?? EVERYONE

      await (change.value === null
        ? db.execute({
            sql: 'DELETE FROM action_limits WHERE login = ? AND key = ?',
            args: [who, change.key],
          })
        : db.execute({
            sql: `INSERT INTO action_limits (login, key, value, set_by, set_at) VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT (login, key) DO UPDATE
                    SET value = excluded.value, set_by = excluded.set_by, set_at = excluded.set_at`,
            args: [who, change.key, change.value, actor.login, new Date(now()).toISOString()],
          }))
      cached = null

      return listFor(change.login ?? null)
    },

    async reset(actor, input) {
      assertAdmin(actor)

      const who = parse(login, input)

      await db.execute({ sql: 'DELETE FROM action_limits WHERE login = ?', args: [who] })
      cached = null

      return listFor(who)
    },
  }
}
