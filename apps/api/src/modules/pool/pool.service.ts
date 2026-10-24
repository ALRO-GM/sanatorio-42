/**
 * La piscina (`docs/piscineros.md`): quién entra al volver de 42 y los
 * ajustes del panel (si está abierta y el aviso que se ve cerrada).
 */

import type { PoolNotice, PoolSettings } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { parse } from '../../core/validation.js'
import type { ApiUser } from '../../integrations/forty-two/types.js'
import { audienceOf } from './pool.rules.js'

type PoolServiceOptions = {
  db: Db
  /** Si alguien administra la web (por configuración o desde el panel): entra siempre. */
  isAdmin: (login: string) => Promise<boolean>
  now?: () => number
}

/** Por qué no se deja entrar a alguien. */
type LoginRefusal = 'not_student' | 'pool_closed'

const DEFAULTS: PoolSettings = { open: false, message: '' }

const settingsSchema = z.object({ message: z.string().max(2000) }).strict()

export function createPoolService(options: PoolServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now

  async function settings(): Promise<PoolSettings> {
    const stored = await db.execute("SELECT value FROM settings WHERE key = 'pool'")
    const value = stored.rows[0]?.value

    if (typeof value !== 'string') return DEFAULTS

    try {
      const parsed = JSON.parse(value) as Partial<PoolSettings>

      return {
        // Hasta que existan los permisos (fase 2) la piscina no se abre.
        open: false,
        message: typeof parsed.message === 'string' ? parsed.message : '',
      }
    } catch {
      return DEFAULTS
    }
  }

  return {
    settings,

    /**
     * Si alguien puede entrar, con su perfil de `/v2/me`; `null` si sí, o por
     * qué no. Quien administra entra siempre.
     */
    async admit(profile: ApiUser): Promise<LoginRefusal | null> {
      const audience = audienceOf(profile, now())

      if (audience === 'student') return null
      if (await options.isAdmin(profile.login.toLowerCase())) return null
      if (audience === 'other') return 'not_student'

      return (await settings()).open ? null : 'pool_closed'
    },

    /** El aviso para la portada, sin sesión. */
    async notice(): Promise<PoolNotice> {
      return { message: (await settings()).message }
    },

    async forAdmin(actor: Actor): Promise<PoolSettings> {
      assertAdmin(actor)

      return settings()
    },

    async update(actor: Actor, input: unknown): Promise<PoolSettings> {
      assertAdmin(actor)

      const changes = parse(settingsSchema, input)
      const next = { ...(await settings()), ...changes, message: changes.message.trim() }

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('pool', ?, ?, ?)`,
        args: [JSON.stringify(next), actor.login, new Date(now()).toISOString()],
      })

      return settings()
    },
  }
}

export type PoolService = ReturnType<typeof createPoolService>
