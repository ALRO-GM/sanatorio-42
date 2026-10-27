/**
 * Módulo `startup`: la startup del Pomodoro (`docs/pomodoro-startup.md`). Cada
 * minuto de concentración es un minuto para gastar en construir una empresa,
 * del garaje al control global; y un ranking con las de los demás.
 *
 * Las reglas son las de `@sanatorio/startup`, las mismas que pinta la web: aquí
 * se hacen cumplir. Lo ganado sale de las sesiones del Pomodoro (`focus`), no de
 * lo que diga el navegador.
 */

import type { StartupRankRow, StartupSnapshot } from '@sanatorio/contracts'
import {
  MILESTONES,
  NAME_MAX,
  act,
  focusOf,
  parseStartup,
  stageOf,
  valuationOf,
} from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import type { AppModule } from '../../core/module.js'
import { parse } from '../../core/validation.js'

/** Filas del ranking, como mucho (más la propia, si queda fuera). */
const RANKING_SIZE = 50

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('buy'), item: z.string().min(1).max(40) }),
  z.object({
    type: z.literal('milestone'),
    milestone: z.enum(MILESTONES),
    // Un nombre de verdad: letras, cifras, espacios y poco más.
    name: z
      .string()
      .max(NAME_MAX)
      .regex(/^[\p{L}\p{N} .,&'+-]*$/u)
      .optional(),
  }),
  z.object({ type: z.literal('hire'), index: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal('reroll') }),
  z.object({ type: z.literal('round') }),
])

/** Lo que dice la web cuando no se puede (`Refusal` de `@sanatorio/startup`). */
const REFUSED: Record<string, string> = {
  poor: 'No te llegan los minutos de concentración',
  locked: 'Aún no: falta algo antes',
  max: 'Ya está al máximo',
  full: 'No queda sitio para más gente',
  invalid: 'Eso no se puede',
}

type StartupDeps = {
  db: Db
  /** Minutos de concentración de cada persona (o de una), del módulo `focus`. */
  focusedMinutes: (login?: string) => Promise<Map<string, number>>
  audience?: Audience
  now?: () => number
}

export function createStartupModule(deps: StartupDeps) {
  const { db } = deps
  const now = deps.now ?? Date.now

  const load = async (login: string): Promise<StartupState> => {
    const row = (
      await db.execute({ sql: 'SELECT state FROM startup WHERE login = ?', args: [login] })
    ).rows[0]

    try {
      return parseStartup(row === undefined ? null : JSON.parse(toText(row.state)))
    } catch {
      return parseStartup(null)
    }
  }

  const earnedOf = async (login: string): Promise<number> =>
    (await deps.focusedMinutes(login)).get(login) ?? 0

  const service = {
    async snapshot(actor: Actor): Promise<StartupSnapshot> {
      const [state, earnedMinutes] = await Promise.all([load(actor.login), earnedOf(actor.login)])

      return { login: actor.login, state, earnedMinutes }
    },

    /** Hace una acción (comprar, hito, contratar, volver a sacar, ronda) y devuelve cómo queda. */
    async act(actor: Actor, input: unknown): Promise<StartupSnapshot> {
      const action = parse(actionSchema, input)
      const [state, earnedMinutes] = await Promise.all([load(actor.login), earnedOf(actor.login)])
      const result = act(actor.login, state, earnedMinutes, action)

      if ('refused' in result) {
        throw domainError('conflict', REFUSED[result.refused] ?? 'Eso no se puede')
      }

      await db.execute({
        sql: `INSERT INTO startup (login, state, updated_at) VALUES (?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
        args: [actor.login, JSON.stringify(result.state), new Date(now()).toISOString()],
      })

      return { login: actor.login, state: result.state, earnedMinutes }
    },

    /**
     * El ranking: quien tiene una startup, por horas de concentración y, a
     * igualdad, por lo que vale. Solo la gente que quien mira puede ver (cada
     * mundo, el suyo; nadie oculto).
     */
    async ranking(actor: Actor): Promise<StartupRankRow[]> {
      const [rows, minutes, sees] = await Promise.all([
        db.execute('SELECT login, state FROM startup'),
        deps.focusedMinutes(),
        seesFor(deps.audience ?? NO_POOL, actor),
      ])
      const all = rows.rows
        .map((row) => {
          const login = toText(row.login)
          let state: StartupState

          try {
            state = parseStartup(JSON.parse(toText(row.state)))
          } catch {
            state = parseStartup(null)
          }

          return {
            login,
            name: state.name,
            hours: Math.round(((minutes.get(login) ?? 0) / 60) * 10) / 10,
            valuation: valuationOf(state),
            stage: stageOf(state),
            focus: focusOf(state),
            team: state.team.length,
          }
        })
        .filter((row) => sees(row.login))
        .sort((a, b) => b.hours - a.hours || b.valuation - a.valuation)
      const top = all.slice(0, RANKING_SIZE)
      const mine = all.find((row) => row.login === actor.login)

      return mine === undefined || top.includes(mine) ? top : [...top, mine]
    },
  }

  return {
    name: 'startup',
    personal: [{ table: 'startup', logins: ['login'] }],
    service,
    routes: (app, { session }) => {
      /** `GET /me/startup` → `StartupSnapshot`: tu partida y los minutos ganados. */
      app.get('/me/startup', async (request, reply) => {
        return reply.send(await service.snapshot(await session.actor(request)))
      })

      /** `POST /me/startup/action` → una acción; `409` si no se puede. Devuelve `StartupSnapshot`. */
      app.post('/me/startup/action', async (request, reply) => {
        return reply.send(await service.act(await session.actor(request), request.body))
      })

      /** `GET /startup/ranking` → `StartupRankRow[]`. */
      app.get('/startup/ranking', async (request, reply) => {
        return reply.send(await service.ranking(await session.actor(request)))
      })
    },
  } satisfies AppModule & { service: typeof service }
}
