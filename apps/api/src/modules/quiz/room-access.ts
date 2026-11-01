/**
 * Quién puede ver y entrar en una sala de Not-games (las de preguntas y las
 * de ajedrez). Pedido por Alberto, 2026-11-01:
 *
 * - **Cada grupo, sus salas**: un piscinero solo ve salas creadas por
 *   piscineros; un estudiante, por estudiantes (`core/audience.ts`).
 * - **Solo las del propio campus**, de momento. Quien administra puede abrir
 *   las salas a todos los campus desde el panel (`crossCampus`): es lo que
 *   hará falta para los concursos entre campus. Abierto, un estudiante ve las
 *   salas de estudiantes de cualquier campus; un piscinero sigue viendo solo
 *   piscineros de su campus, como en el resto de la web.
 *
 * Que la pestaña exista para los piscineros lo decide el panel de la piscina
 * (permiso `notgames`), no esto.
 */

import type { QuizScope } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { isoAt } from '../../core/time.js'
import { parse } from '../../core/validation.js'

/** Lo leído vale este rato: cada lista de salas lo mira. Guardar lo olvida. */
const TTL_MS = 30_000

const scopeSchema = z.object({ crossCampus: z.boolean() }).strict()

/** El ajuste de quien administra: si las salas se abren a todos los campus. */
export function createQuizScope(options: { db: Db; now?: () => number }) {
  const { db, now = Date.now } = options
  let cached: { at: number; value: Promise<QuizScope> } | null = null

  const read = async (): Promise<QuizScope> => {
    const row = (
      await db.execute("SELECT value, updated_by, updated_at FROM settings WHERE key = 'quizScope'")
    ).rows[0]
    const closed: QuizScope = { crossCampus: false, updatedBy: null, updatedAt: null }

    if (row === undefined || typeof row.value !== 'string') return closed

    try {
      return {
        crossCampus: scopeSchema.parse(JSON.parse(row.value)).crossCampus,
        updatedBy: typeof row.updated_by === 'string' ? row.updated_by : null,
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
      }
    } catch {
      // Ilegible: cerrado, que es lo prudente.
      return closed
    }
  }

  const current = (): Promise<QuizScope> => {
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

    /** Si las salas de todos los campus se ven y se puede entrar en ellas. */
    crossCampus: async (): Promise<boolean> => (await current()).crossCampus,

    /** Lo que ve el panel. Solo admins. */
    async get(actor: Actor): Promise<QuizScope> {
      assertAdmin(actor)

      return current()
    },

    /**
     * Abre o cierra las salas a todos los campus. Solo admins.
     *
     * @throws {DomainError} `invalid_input` si no llega `{ crossCampus }`.
     */
    async set(actor: Actor, input: unknown): Promise<QuizScope> {
      assertAdmin(actor)

      const scope = parse(scopeSchema, input)

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('quizScope', ?, ?, ?)`,
        args: [JSON.stringify(scope), actor.login, isoAt(now())],
      })
      cached = null

      return current()
    },
  }
}

/** La comprobación de las dos clases de sala. */
export type RoomAccess = {
  /** `null` si cualquier campus vale; si no, el de quien pregunta. */
  campusFor: (actor: Actor) => Promise<number | null>
  /**
   * Por qué quien pregunta no puede ver una sala, o `null` si puede. Quien ya
   * juega en ella la ve siempre.
   */
  whyNot: (actor: Actor, room: { campusId: number; host: string }) => Promise<string | null>
}

/** Sin piscina ni ajuste: cada campus, sus salas (los tests y lo que no lo pasa). */
export function roomAccess(
  audience: Audience = NO_POOL,
  crossCampus: () => Promise<boolean> = () => Promise.resolve(false),
): RoomAccess {
  return {
    async campusFor(actor) {
      return (await crossCampus()) ? null : actor.campusId
    },
    async whyNot(actor, room) {
      if (room.campusId !== actor.campusId && !(await crossCampus())) {
        return 'Esa sala es de otro campus'
      }
      if (!(await seesFor(audience, actor))(room.host)) return 'Esa sala no existe'

      return null
    },
  }
}
