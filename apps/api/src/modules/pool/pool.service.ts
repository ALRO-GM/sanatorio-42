/**
 * La piscina (`docs/piscineros.md`): quién entra al volver de 42, qué puede
 * ver un piscinero y los ajustes del panel.
 */

import type { PoolAccess, PoolKey, PoolNotice, PoolSettings } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { parse } from '../../core/validation.js'
import type { ApiUser } from '../../integrations/forty-two/types.js'
import { effective, POOL_DEFAULT, POOL_KEYS, poolAllows } from './pool.keys.js'
import { audienceOf } from './pool.rules.js'

type PoolServiceOptions = {
  db: Db
  /** Si alguien administra la web (por configuración o desde el panel): entra siempre. */
  isAdmin: (login: string) => Promise<boolean>
  now?: () => number
}

/** Como qué entra alguien, o por qué no. */
type Admission = 'student' | 'pool' | 'not_student' | 'pool_closed'

/** Lo leído de la base vale este rato: el corte lo mira en cada petición de un piscinero. */
const SETTINGS_TTL_MS = 10_000

const DEFAULTS: PoolSettings = { open: false, message: '', allow: [...POOL_DEFAULT] }

const keySchema = z.enum(POOL_KEYS as [PoolKey, ...PoolKey[]])
const settingsSchema = z
  .object({
    open: z.boolean().optional(),
    message: z.string().max(2000).optional(),
    allow: z
      .array(keySchema)
      .max(POOL_KEYS.length * 2)
      .optional(),
  })
  .strict()

export function createPoolService(options: PoolServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  let cached: { at: number; settings: PoolSettings; allowed: Set<PoolKey> } | null = null

  async function read(): Promise<PoolSettings> {
    const stored = await db.execute("SELECT value FROM settings WHERE key = 'pool'")
    const value = stored.rows[0]?.value

    if (typeof value !== 'string') return DEFAULTS

    try {
      const parsed = JSON.parse(value) as Partial<PoolSettings>
      const known = new Set<string>(POOL_KEYS)

      return {
        open: parsed.open === true,
        message: typeof parsed.message === 'string' ? parsed.message : '',
        // Una clave que ya no existe (se quitó una pestaña) se olvida sin más.
        allow: Array.isArray(parsed.allow)
          ? parsed.allow.filter((key): key is PoolKey => known.has(key))
          : [...POOL_DEFAULT],
      }
    } catch {
      return DEFAULTS
    }
  }

  async function current(): Promise<{ settings: PoolSettings; allowed: Set<PoolKey> }> {
    if (cached === null || now() - cached.at > SETTINGS_TTL_MS) {
      const settings = await read()

      cached = { at: now(), settings, allowed: effective(settings.allow) }
    }

    return cached
  }

  return {
    /**
     * Si alguien puede entrar y como qué, con su perfil de `/v2/me`. Quien
     * administra entra siempre, como estudiante.
     */
    async admit(profile: ApiUser): Promise<Admission> {
      const audience = audienceOf(profile, now())

      if (audience === 'student') return 'student'
      if (await options.isAdmin(profile.login.toLowerCase())) return 'student'
      if (audience === 'other') return 'not_student'

      return (await current()).settings.open ? 'pool' : 'pool_closed'
    },

    /**
     * Un piscinero acaba de entrar: su campus principal, para la sesión. Lo
     * suyo no va a la réplica de los estudiantes (mundos separados).
     */
    enter(profile: ApiUser): Promise<{ campusId: number | null }> {
      const campuses = profile.campus_users ?? []
      const primary = campuses.find((entry) => entry.is_primary === true) ?? campuses[0]

      return Promise.resolve({ campusId: primary?.campus_id ?? null })
    },

    /** Si un piscinero puede usar esa ruta (la plantilla, `/projects/:id/peers`). */
    async allows(route: string): Promise<boolean> {
      return poolAllows(route, (await current()).allowed)
    },

    /** Qué puede ver quien pregunta: todo un estudiante, lo permitido un piscinero. */
    async access(pool: boolean): Promise<PoolAccess> {
      return pool
        ? { pool: true, allow: [...(await current()).allowed] }
        : { pool: false, allow: null }
    },

    /** El aviso para la portada, sin sesión. */
    async notice(): Promise<PoolNotice> {
      return { message: (await current()).settings.message }
    },

    async forAdmin(actor: Actor): Promise<PoolSettings> {
      assertAdmin(actor)

      return read()
    },

    async update(actor: Actor, input: unknown): Promise<PoolSettings> {
      assertAdmin(actor)

      const changes = parse(settingsSchema, input)

      const before = await read()
      const next: PoolSettings = {
        open: changes.open ?? before.open,
        message: changes.message === undefined ? before.message : changes.message.trim(),
        allow: changes.allow === undefined ? before.allow : [...new Set(changes.allow)],
      }

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('pool', ?, ?, ?)`,
        args: [JSON.stringify(next), actor.login, new Date(now()).toISOString()],
      })
      cached = null

      return read()
    },
  }
}

export type PoolService = ReturnType<typeof createPoolService>
