/**
 * Modo mantenimiento (`docs/mantenimiento.md`).
 *
 * Quien administra lo pone desde el panel, con un mensaje y, si quiere, la hora
 * a la que se prevé acabar. Mientras dura, la API contesta `503` a quien no
 * administra (el gancho de `index.ts`), salvo lo justo para que la web sepa
 * qué pasa y quien administra pueda entrar.
 *
 * Vive en `settings` (clave `maintenance`): sobrevive a un reinicio, que es
 * justo lo que suele pasar en un mantenimiento.
 */

import type { Maintenance, MaintenanceStatus } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { domainError } from '../../core/errors.js'
import { clockOf } from '../../core/options.js'
import type { Clock } from '../../core/options.js'
import { isoAt } from '../../core/time.js'
import { optionalText, parse } from '../../core/validation.js'

/** Lo leído de la base vale este rato: se mira en cada petición. El panel lo olvida al cambiarlo. */
const TTL_MS = 10_000
/** Como mucho se anuncia el final a una semana vista: más es que no es un mantenimiento. */
const MAX_AHEAD_MS = 7 * 24 * 60 * 60_000

const OFF: Maintenance = { on: false, message: null, until: null, since: null }

/**
 * Lo que sigue abierto durante el mantenimiento: la salud (la mira Caddy), la
 * sesión (para que quien administra pueda entrar y la web sepa quién es), el
 * propio estado y los fallos de la web. Todo lo demás, solo para admins.
 */
const OPEN_PREFIXES = ['/health', '/auth/'] as const
const OPEN_PATHS = new Set(['/maintenance', '/client-errors', '/pool/notice'])

/** `true` si la ruta sigue abierta para todo el mundo durante el mantenimiento. */
export function openDuringMaintenance(path: string): boolean {
  return OPEN_PATHS.has(path) || OPEN_PREFIXES.some((prefix) => path.startsWith(prefix))
}

const instant = z.iso
  .datetime({ offset: true, message: 'la hora va en ISO-8601' })
  .transform((value) => isoAt(Date.parse(value)))

const inputSchema = z.object({
  on: z.boolean(),
  message: optionalText(500),
  until: instant.nullish().transform((value) => value ?? null),
})

const storedSchema = z.object({
  on: z.boolean(),
  message: z.string().nullable(),
  until: z.string().nullable(),
  since: z.string().nullable(),
})

export function createMaintenance(options: Clock & { db: Db }) {
  const { db } = options
  const now = clockOf(options)
  let cached: { at: number; value: Promise<Maintenance> } | null = null

  const read = async (): Promise<Maintenance> => {
    const result = await db.execute("SELECT value FROM settings WHERE key = 'maintenance'")
    const value = result.rows[0]?.value

    if (typeof value !== 'string') return OFF

    try {
      return storedSchema.parse(JSON.parse(value))
    } catch {
      // Ilegible: mejor la web abierta que cerrada sin que nadie sepa por qué.
      return OFF
    }
  }

  const current = (): Promise<Maintenance> => {
    if (cached !== null && now() - cached.at < TTL_MS) return cached.value

    const value = read()

    cached = { at: now(), value }
    value.catch(() => {
      cached = null
    })

    return value
  }

  return {
    current,

    /** El estado para `GET /maintenance`, con si quien pregunta puede seguir. */
    async status(admin: boolean): Promise<MaintenanceStatus> {
      return { ...(await current()), exempt: admin }
    },

    /**
     * Lo pone o lo quita. Solo admins.
     *
     * @throws {DomainError} `invalid_input` si la hora de acabar ya ha pasado o
     *   está a más de una semana.
     */
    async set(actor: Actor, input: unknown): Promise<Maintenance> {
      assertAdmin(actor)

      const wanted = parse(inputSchema, input)

      if (wanted.on && wanted.until !== null) {
        const until = Date.parse(wanted.until)

        if (until <= now()) throw domainError('invalid_input', 'La hora de acabar ya ha pasado')
        if (until - now() > MAX_AHEAD_MS) {
          throw domainError('invalid_input', 'Como mucho, una semana de mantenimiento')
        }
      }

      const before = await current()
      const next: Maintenance = wanted.on
        ? {
            on: true,
            message: wanted.message,
            until: wanted.until,
            // Cambiar el mensaje o la hora no lo vuelve a empezar.
            since: before.on ? before.since : isoAt(now()),
          }
        : OFF

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('maintenance', ?, ?, ?)`,
        args: [JSON.stringify(next), actor.login, isoAt(now())],
      })
      cached = null

      return next
    },
  }
}

export type MaintenanceService = ReturnType<typeof createMaintenance>
