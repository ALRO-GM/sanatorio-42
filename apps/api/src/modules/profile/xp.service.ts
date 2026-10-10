/**
 * Sistema de experiencia: expediente, reacciones y preferencias.
 *
 * La XP nunca se guarda como total: es la suma de `xp_events`, y cada fila tiene
 * una referencia única (la sesión, la reacción, la pizarra). Por eso otorgarla
 * es idempotente y los demás servicios pueden llamar a `award` sin preocuparse
 * de si ya lo hicieron.
 */

import type {
  Expediente,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  ReactionKind,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { ProfilesRepository } from './profiles.repository.js'
import type { XpRepository } from './xp.repository.js'
import type { ReplicaRepository } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import {
  ACHIEVEMENTS,
  HELP_KINDS,
  TITLES,
  XP_AMOUNT,
  XP_KIND,
  levelFor,
  titleUnlocked,
} from './xp.rules.js'
import type { AchievementId, XpKind } from './xp.rules.js'
import { id, parse } from '../../core/validation.js'
import type { Actor } from '../../core/actor.js'

export type XpServiceOptions = {
  xp: XpRepository
  profiles: ProfilesRepository
  replica: ReplicaRepository
  now?: () => number
}

const settingsSchema = z.object({
  campusId: id.optional(),
  lang: z.enum(['es', 'en']).optional(),
  title: z.string().optional(),
})

export function createXpService(options: XpServiceOptions) {
  const { xp, profiles, replica } = options
  const now = options.now ?? Date.now

  /** Día UTC de hoy, que es la unidad de "una reacción por pareja y día". */
  const today = (): string => new Date(now()).toISOString().slice(0, 10)

  return {
    /** Otorga XP una sola vez por referencia. */
    async award(login: string, kind: XpKind, ref: string): Promise<boolean> {
      return xp.award(login, kind, XP_AMOUNT[kind], ref)
    },

    /** Anota la primera vez que alguien se pone de guardia. */
    async markFirstDuty(login: string): Promise<void> {
      await xp.award(login, XP_KIND.FIRST_DUTY, XP_AMOUNT.first_duty, 'first')
    },

    /** Expediente completo de quien pregunta. */
    async expediente(actor: Actor): Promise<Expediente> {
      const [total, counts, received, profile] = await Promise.all([
        xp.total(actor.login),
        xp.countsByKind(actor.login),
        xp.reactionsReceived(actor.login),
        profiles.get(actor.login),
      ])
      const level = levelFor(total)
      const count = (kind: XpKind): number => counts.get(kind) ?? 0

      const progress: Record<AchievementId, number> = {
        first_duty: count(XP_KIND.FIRST_DUTY),
        group_therapy: count(XP_KIND.THERAPY_SESSION),
        selfless_help: count(XP_KIND.SPECIALIST_HELP),
        board_teacher: count(XP_KIND.BOARD_HOST),
        campus_guardian: count(XP_KIND.SPECIALIST_HELP) + count(XP_KIND.PEER_HELP),
      }

      // Si no ha elegido título (o el elegido ya no le corresponde), luce el
      // más alto que tenga.
      const best = [...TITLES].reverse().find((title) => level.level >= title.level) ?? TITLES[0]
      const chosen = profile?.title ?? null
      const title = chosen !== null && titleUnlocked(chosen, level.level) ? chosen : best.id

      return {
        login: actor.login,
        campusId: actor.campusId,
        lang: profile?.lang ?? null,
        admin: actor.admin,
        xp: { total, ...level },
        title,
        titles: TITLES.map((entry) => ({ ...entry, unlocked: level.level >= entry.level })),
        achievements: ACHIEVEMENTS.map((entry) => ({
          id: entry.id,
          goal: entry.goal,
          progress: Math.min(progress[entry.id], entry.goal),
          unlocked: progress[entry.id] >= entry.goal,
        })),
        reactions: {
          bug: received.get('bug') ?? 0,
          code: received.get('code') ?? 0,
          concept: received.get('concept') ?? 0,
          patient: received.get('patient') ?? 0,
        },
        rules: XP_AMOUNT,
      }
    },

    /**
     * Apunta una sesión de ayuda terminada: la reacción de quien la recibió
     * ("¿cómo te ayudó?") y la XP de quien ayudó.
     *
     * Vale más si quien ayudó ya había aprobado ese proyecto. Solo la llama el
     * módulo `help`, cuando la sesión está confirmada, comprobada y valorada por
     * las dos partes: fuera de ahí no hay forma de dar XP por ayudar.
     *
     * @returns La XP repartida. `0` si esa pareja ya se apuntó una sesión hoy.
     */
    async creditHelp(help: {
      from: string
      to: string
      kind: ReactionKind
      projectId: number | null
      ref: string
    }): Promise<number> {
      const specialist =
        help.projectId !== null && (await replica.isSpecialist(help.to, help.projectId))
      const reactionId = await xp.addReaction({
        from: help.from,
        to: help.to,
        kind: help.kind,
        projectId: help.projectId,
        specialist,
        day: today(),
      })

      // Una por pareja y día: dos personas no pueden pasarse XP en bucle.
      if (reactionId === undefined) {
        return 0
      }

      const kind = specialist ? XP_KIND.SPECIALIST_HELP : XP_KIND.PEER_HELP

      await xp.award(help.to, kind, XP_AMOUNT[kind], help.ref)

      return XP_AMOUNT[kind]
    },

    /** Retira XP ya dada, cuando lo que la ganó se da por malo. */
    async revoke(login: string, kind: XpKind, ref: string): Promise<boolean> {
      return xp.revoke(login, kind, ref)
    },

    /** Cuántas veces ha ganado alguien una cosa desde un instante (ISO). */
    async countSince(login: string, kind: XpKind, since: string): Promise<number> {
      return xp.countSince(login, kind, since)
    },

    /**
     * Quién ayuda más en el campus que mira `actor`.
     *
     * Cuenta solo la XP de ayudar (`HELP_KINDS`). Devuelve los `limit` primeros
     * y, aparte, el puesto de quien pregunta.
     */
    async leaderboard(actor: Actor, period: LeaderboardPeriod, limit = 20): Promise<Leaderboard> {
      const date = new Date(now())
      const since =
        period === 'month'
          ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString()
          : null
      const rows = await xp.ranking(actor.campusId, HELP_KINDS, since)
      const entries: LeaderboardEntry[] = []

      for (const [index, row] of rows.entries()) {
        const previous = entries[index - 1]

        // Quien empata comparte puesto.
        entries.push({ ...row, rank: previous?.xp === row.xp ? previous.rank : index + 1 })
      }

      return {
        period,
        entries: entries.slice(0, limit),
        me: entries.find((entry) => entry.login === actor.login) ?? null,
      }
    },

    /**
     * Cambia campus, idioma o título.
     *
     * El título solo se acepta si su nivel ya lo permite: si no, cualquiera
     * podría ponerse "Jefe de planta" con una petición a mano.
     */
    async updateSettings(actor: Actor, input: unknown): Promise<void> {
      const settings = parse(settingsSchema, input)

      // Un campus inventado acabaría en peticiones inútiles a 42. Solo se puede
      // comprobar si el catálogo ya se ha bajado; si no, se acepta.
      if (settings.campusId !== undefined) {
        const known = await replica.listCampuses([])

        if (known.length > 0 && !known.some((campus) => campus.id === settings.campusId)) {
          throw domainError('invalid_input', `El campus ${settings.campusId} no existe`)
        }
      }

      if (settings.title !== undefined) {
        const level = levelFor(await xp.total(actor.login)).level

        if (!titleUnlocked(settings.title, level)) {
          throw domainError('forbidden', 'Ese título todavía no lo has desbloqueado')
        }
      }

      await profiles.update(actor.login, settings)
    },
  }
}

export type XpService = ReturnType<typeof createXpService>
