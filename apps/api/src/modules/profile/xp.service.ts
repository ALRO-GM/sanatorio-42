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
  FoundPerson,
  PublicProfile,
  Health,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  ReactionKind,
  TitleId,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { ProfilesRepository } from './profiles.repository.js'
import type { XpRepository } from './xp.repository.js'
import { LAST_CIRCLE } from '../replica/index.js'
import type { Curriculum, ReplicaRepository } from '../replica/index.js'
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
import { day, id, parse } from '../../core/validation.js'
import { canUseStyle, isStyle, NO_RECORD_STYLE, recordStyleOf } from './styles.rules.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Actor } from '../../core/actor.js'
import { dayOf } from '../../core/time.js'

export type XpServiceOptions = {
  xp: XpRepository
  profiles: ProfilesRepository
  replica: ReplicaRepository
  /** Plan de estudios: de ahí salen los rangos validados y sus fechas. */
  curriculum: Curriculum
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  /** Los piscineros en curso de un campus, para el buscador de un piscinero. */
  poolPeople?: (campusId: number) => Promise<{ login: string; image: string | null }[]>
  /**
   * El título que se ha ganado alguien en Code Clicker por hacer trampas, y las
   * veces que le han pillado. Lo sabe `clicker`.
   */
  hacker?: (login: string) => Promise<{ title: TitleId | null; caught: number }>
  /**
   * En cuántos proyectos ha hecho alguien `MASTER_AT` correcciones o más. Da
   * el título de maestro del código. Lo sabe `network`.
   */
  master?: (login: string) => Promise<number>
  now?: () => number
}

/** Correcciones de un mismo proyecto que hacen maestro del código. */
export const MASTER_AT = 10

/** Los paces que existen: los meses en los que se prevé acabar el common core. */
const PACES = [8, 12, 15, 18, 22, 24]
/** Un plazo no puede caer más lejos que esto de hoy: el pace más lento dura dos años. */
const MAX_DEADLINE_DAYS = 800
const DAY_MS = 24 * 60 * 60_000
/** Personas que ofrece el buscador de una vez. */
const SEARCH_LIMIT = 8

const paceRefSchema = z.object({
  pace: z.number().refine((pace) => PACES.includes(pace), 'Ese pace no existe'),
  deadline: day,
})

const settingsSchema = z.object({
  campusId: id.optional(),
  lang: z.enum(['es', 'en', 'ca', 'eu', 'fr']).optional(),
  title: z.string().optional(),
  preReview: z.boolean().optional(),
  /** El id de un estilo, `none` (el de quien mira) o `default` (lo de fábrica). */
  recordStyle: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,30}$/, 'estilo no válido')
    .optional(),
})

/**
 * El título que luce alguien (y con él, su banner): el que eligió, si todavía
 * le corresponde; si no eligió (o ya no le vale), el más alto de su nivel.
 */
function activeTitle(
  chosen: string | null,
  level: number,
  hacker: TitleId | null,
  master: number,
): TitleId {
  if (chosen !== null && chosen === hacker) return hacker
  if (chosen === 'maestro' && master > 0) return 'maestro'

  const picked = TITLES.find((title) => title.id === chosen && level >= title.level)
  const best = [...TITLES].reverse().find((title) => level >= title.level) ?? TITLES[0]

  return (picked ?? best).id
}

export function createXpService(options: XpServiceOptions) {
  const { xp, profiles, replica, curriculum } = options
  const now = options.now ?? Date.now

  /** Día UTC de hoy, que es la unidad de "una reacción por pareja y día". */
  const today = (): string => dayOf(now())
  /** Si no se puede saber, es que no hay título: el expediente no se cae por esto. */
  const masterOf = async (login: string): Promise<number> =>
    (await options.master?.(login).catch(() => 0)) ?? 0

  const hackerOf = async (login: string): Promise<{ title: TitleId | null; caught: number }> =>
    (await options.hacker?.(login).catch(() => undefined)) ?? { title: null, caught: 0 }

  return {
    /** Otorga XP una sola vez por referencia. */
    async award(login: string, kind: XpKind, ref: string): Promise<boolean> {
      return xp.award(login, kind, XP_AMOUNT[kind], ref)
    },

    /**
     * El título que luce alguien, para pintar su banner donde sale su ficha.
     * Cuesta lo mismo que la cabecera de su expediente, sin logros ni desglose.
     */
    async titleOf(login: string): Promise<TitleId> {
      const [total, profile, hacker, master] = await Promise.all([
        xp.total(login),
        profiles.get(login),
        hackerOf(login),
        masterOf(login),
      ])

      return activeTitle(profile?.title ?? null, levelFor(total).level, hacker.title, master)
    },

    /** Anota la primera vez que alguien se pone de guardia. */
    async markFirstDuty(login: string): Promise<void> {
      await xp.award(login, XP_KIND.FIRST_DUTY, XP_AMOUNT.first_duty, 'first')
    },

    /**
     * El expediente de otra persona, en su versión pública.
     *
     * @throws {DomainError} `not_found` si no conocemos a nadie con ese login.
     */
    async publicProfile(actor: Actor, login: string): Promise<PublicProfile> {
      const wanted = login.trim().toLowerCase()
      const sees = await seesFor(options.audience ?? NO_POOL, actor)

      // Alguien del otro mundo (estudiante o piscinero) no existe para quien mira.
      if (
        !/^[a-z0-9-]{1,30}$/.test(wanted) ||
        !sees(wanted) ||
        (actor.pool !== true && !(await replica.userExists(wanted)))
      ) {
        throw domainError('not_found', 'No conocemos a nadie con ese login')
      }

      // El campus y los permisos no influyen en lo que se devuelve.
      const person = { login: wanted, campusId: 0, admin: false }
      const [full, images, health] = await Promise.all([
        this.expediente(person),
        replica.imagesOf([wanted]),
        // Sus hitos se piden a 42 con su id, como mucho una vez al día.
        this.health(person, await replica.userIdOf(wanted)),
      ])

      return {
        login: full.login,
        image: images.get(wanted) ?? null,
        xp: full.xp,
        title: full.title,
        hacks: full.hacks,
        master: full.master,
        recordStyle: full.recordStyle,
        achievements: full.achievements,
        reactions: full.reactions,
        health,
      }
    },

    /**
     * Personas que se llaman así, para el buscador de arriba: por login o por
     * nombre, sin distinguir mayúsculas. Con menos de dos letras no busca.
     */
    async search(actor: Actor, q: unknown): Promise<FoundPerson[]> {
      const text = typeof q === 'string' ? q.trim() : ''

      if (text.length < 2 || text.length > 40) return []

      // A un estudiante no le salen piscineros; a nadie, quien está oculto a su grupo.
      const sees = await seesFor(options.audience ?? NO_POOL, actor)

      // Un piscinero busca entre los piscineros de su campus, por login.
      if (actor.pool === true) {
        const wanted = text.toLowerCase()

        return ((await options.poolPeople?.(actor.campusId)) ?? [])
          .filter((person) => person.login.includes(wanted) && sees(person.login))
          .slice(0, SEARCH_LIMIT)
          .map((person) => ({ ...person, name: null }))
      }

      // Se pide de más por si alguno no se puede ver.
      return (await replica.searchUsers(text, actor.campusId, SEARCH_LIMIT * 2))
        .filter((person) => sees(person.login))
        .slice(0, SEARCH_LIMIT)
    },

    /** Expediente completo de quien pregunta. */
    async expediente(actor: Actor): Promise<Expediente> {
      const [total, earned, received, profile, hacker, master] = await Promise.all([
        xp.total(actor.login),
        xp.earnedByKind(actor.login),
        xp.reactionsReceived(actor.login),
        profiles.get(actor.login),
        hackerOf(actor.login),
        masterOf(actor.login),
      ])
      const level = levelFor(total)
      const count = (kind: XpKind): number => earned.get(kind)?.times ?? 0

      const earnedOf = (kind: XpKind): { xp: number; times: number } =>
        earned.get(kind) ?? { xp: 0, times: 0 }

      const progress: Record<AchievementId, number> = {
        first_duty: count(XP_KIND.FIRST_DUTY),
        group_therapy: count(XP_KIND.THERAPY_SESSION),
        selfless_help: count(XP_KIND.SPECIALIST_HELP),
        board_teacher: count(XP_KIND.BOARD_HOST),
        campus_guardian: count(XP_KIND.SPECIALIST_HELP) + count(XP_KIND.PEER_HELP),
      }

      const title = activeTitle(profile?.title ?? null, level.level, hacker.title, master)

      return {
        login: actor.login,
        campusId: actor.campusId,
        lang: profile?.lang ?? null,
        admin: actor.admin,
        preReview: profile?.preReview ?? false,
        recordStyle: recordStyleOf(actor.login, profile?.recordStyle ?? null),
        xp: { total, ...level },
        title,
        hacks: hacker.caught,
        master,
        titles: [
          ...TITLES.map((entry) => ({ ...entry, unlocked: level.level >= entry.level })),
          ...(hacker.title === null ? [] : [{ id: hacker.title, level: 0, unlocked: true }]),
          ...(master > 0 ? [{ id: 'maestro' as const, level: 0, unlocked: true }] : []),
        ],
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
        earned: {
          therapy_session: earnedOf(XP_KIND.THERAPY_SESSION),
          specialist_help: earnedOf(XP_KIND.SPECIALIST_HELP),
          peer_help: earnedOf(XP_KIND.PEER_HELP),
          board_host: earnedOf(XP_KIND.BOARD_HOST),
          doubt_solved: earnedOf(XP_KIND.DOUBT_SOLVED),
          guide_proposal: earnedOf(XP_KIND.GUIDE_PROPOSAL),
          guide_review: earnedOf(XP_KIND.GUIDE_REVIEW),
          first_duty: earnedOf(XP_KIND.FIRST_DUTY),
        },
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

    /**
     * Los datos del "estado de salud": cuándo empezó el 42cursus, cuándo
     * completó cada círculo y la fecha de black hole que dé 42.
     *
     * Son solo los hechos; los plazos de cada pace los calcula la web. Cuesta,
     * como mucho, una petición a 42 por persona y día (sus hitos).
     *
     * @param userId Su id en 42, para preguntar por sus rangos.
     */
    async health(actor: Actor, userId: number | null): Promise<Health> {
      const [{ track, rank, ranks }, cursus, declared] = await Promise.all([
        curriculum.trackOf(actor.login, userId),
        curriculum.cursusOf(actor.login, userId),
        profiles.paceRef(actor.login),
      ])

      return {
        startedAt: cursus.startedAt,
        blackholedAt: cursus.blackholedAt,
        track,
        currentCircle: Math.min(LAST_CIRCLE, (rank ?? -1) + 1),
        milestones: ranks,
        declared: declared ?? null,
      }
    },

    /**
     * Anota el pace y el *Milestone Deadline* que la persona ve en su perfil de
     * la intra. Con eso la web deduce su día cero (con los días de bonus
     * dentro) y saca de la tabla el resto de fechas.
     *
     * El plazo se guarda junto al círculo en el que está ahora: es el de ese
     * círculo, y sigue valiendo cuando pase al siguiente.
     *
     * @throws {DomainError} `invalid_input` si el pace no existe, la fecha no es
     *   razonable o ya ha completado el common core.
     */
    async declarePace(actor: Actor, userId: number | null, input: unknown): Promise<Health> {
      const { pace, deadline } = parse(paceRefSchema, input)
      const away = Math.abs(Date.parse(`${deadline}T00:00:00Z`) - now()) / DAY_MS

      if (away > MAX_DEADLINE_DAYS) {
        throw domainError('invalid_input', 'Esa fecha queda demasiado lejos para ser un plazo')
      }

      const current = await this.health(actor, userId)

      if (current.milestones.length > LAST_CIRCLE) {
        throw domainError('invalid_input', 'Ya has completado el common core: no te quedan plazos')
      }

      await profiles.savePaceRef(actor.login, { pace, circle: current.currentCircle, deadline })

      return this.health(actor, userId)
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

        if (
          !titleUnlocked(settings.title, level) &&
          settings.title !== (await hackerOf(actor.login)).title &&
          !(settings.title === 'maestro' && (await masterOf(actor.login)) > 0)
        ) {
          throw domainError('forbidden', 'Ese título todavía no lo has desbloqueado')
        }
      }

      const { recordStyle, ...rest } = settings

      if (recordStyle !== undefined) {
        if (recordStyle !== 'default' && recordStyle !== NO_RECORD_STYLE && !isStyle(recordStyle)) {
          throw domainError('invalid_input', 'Ese estilo no existe')
        }
        if (isStyle(recordStyle) && !canUseStyle(recordStyle, actor.login)) {
          throw domainError('forbidden', 'Ese estilo es de otra persona')
        }

        await profiles.setRecordStyle(actor.login, recordStyle === 'default' ? null : recordStyle)
      }

      await profiles.update(actor.login, rest)
    },
  }
}

export type XpService = ReturnType<typeof createXpService>
