/**
 * Terapias de grupo: gente con el mismo proyecto pendiente que acuerda quedar.
 *
 * Un grupo tiene sitio, días de la semana, horario y plazas. Asistir da XP, y
 * para que "asistir" signifique algo se ficha: solo un día de quedada, dentro
 * del horario y, si sabemos dónde está cada cual, estando en el campus.
 */

import type { GroupView, SeatReservation } from '@sanatorio/contracts'
import { z } from 'zod'

import type { GroupRow, TherapyRepository } from './therapy.repository.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import { localMoment, minutesOf } from '../../core/time.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import { XP_KIND } from '../profile/index.js'
import type { XpService } from '../profile/index.js'
import { id, optionalText, parse, startOfDayIso, text } from '../../core/validation.js'
import type { Actor } from '../../core/actor.js'

export type TherapyServiceOptions = {
  therapy: TherapyRepository
  replica: ReplicaRepository
  sync: Syncer
  xp: XpService
  now?: () => number
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const groupSchema = z
  .object({
    projectId: id,
    place: text(80),
    days: z
      .array(z.number().int().min(1).max(7))
      .min(1, 'elige al menos un día')
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    start: z.string().regex(TIME, 'hora no válida'),
    end: z.string().regex(TIME, 'hora no válida'),
    capacity: z.number().int().min(2).max(12).default(5),
    note: optionalText(200),
    seats: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9-]{2,24}$/, 'no parece un puesto (ejemplo: c1r2s4)'),
      )
      .max(12, 'máximo 12 puestos')
      .default([])
      .transform((seats) => [...new Set(seats)]),
  })
  .refine((group) => group.seats.length <= group.capacity, {
    message: 'no puedes reservar más puestos que plazas tiene el grupo',
    path: ['seats'],
  })
  .refine((group) => minutesOf(group.end) > minutesOf(group.start), {
    message: 'la hora de fin tiene que ser posterior a la de inicio',
    path: ['end'],
  })

/** Grupos abiertos que puede tener una persona a la vez. */
const MAX_OPEN_GROUPS = 3

/** Minutos antes de la hora en que el grupo ya figura como reunido. */
const CHECKIN_EARLY_MINUTES = 15

/** Cada cuánto se comprueba la asistencia, y lo que dura cada tramo con XP. */
const SLOT_MINUTES = 30

/** Margen tras el final de la sesión para hacer la última comprobación. */
const CHECK_GRACE_MINUTES = 5

/** Personas del grupo que tiene que haber en sus puestos para que cuente. */
const MIN_PRESENT = 2

/** Medias horas con XP que puede acumular una persona al día (4 horas). */
const MAX_SLOTS_PER_DAY = 8

export function createTherapyService(options: TherapyServiceOptions) {
  const { therapy, replica, sync, xp } = options
  const now = options.now ?? Date.now

  /** `true` si ahora, en la hora del campus, el grupo está reunido. */
  async function inSession(group: GroupRow): Promise<{ active: boolean; day: string }> {
    const moment = localMoment(now(), await replica.timeZoneOf(group.campusId))
    const active =
      group.days.includes(moment.weekday) &&
      moment.minutes >= minutesOf(group.start) - CHECKIN_EARLY_MINUTES &&
      moment.minutes <= minutesOf(group.end)

    return { active, day: moment.day }
  }

  async function view(groups: readonly GroupRow[], actor: Actor): Promise<GroupView[]> {
    const images = await replica.imagesOf(groups.flatMap((group) => group.members))
    const views: GroupView[] = []

    for (const group of groups) {
      const { members, campusId: _campusId, closed: _closed, ...rest } = group

      views.push({
        ...rest,
        members: members.map((login) => ({ login, image: images.get(login) ?? null })),
        joined: members.includes(actor.login),
        mine: group.creator === actor.login || actor.admin,
        inSession: (await inSession(group)).active,
      })
    }

    return views
  }

  /** El grupo, o 404. También si es de otro campus: no se mezclan listas. */
  async function mustGet(groupId: number, actor: Actor): Promise<GroupRow> {
    const group = await therapy.get(groupId)

    if (group?.campusId !== actor.campusId) {
      throw domainError('not_found', 'Ese grupo no existe')
    }

    return group
  }

  return {
    /**
     * Puestos reservados por los grupos abiertos de un campus, para el mapa.
     *
     * Si dos grupos reservan el mismo puesto, gana el que esté reunido ahora.
     */
    async reservations(campusId: number): Promise<Map<string, SeatReservation>> {
      const reserved = new Map<string, SeatReservation>()

      for (const group of await therapy.listOpen(campusId)) {
        if (group.seats.length === 0) {
          continue
        }

        const reservation: SeatReservation = {
          groupId: group.id,
          projectName: group.projectName,
          days: group.days,
          start: group.start,
          end: group.end,
          inSession: (await inSession(group)).active,
        }

        for (const host of group.seats) {
          if (reserved.get(host)?.inSession !== true) {
            reserved.set(host, reservation)
          }
        }
      }

      return reserved
    },

    /** Grupos abiertos del campus; con `projectId`, los de ese proyecto. */
    async list(actor: Actor, projectId?: number): Promise<GroupView[]> {
      return view(await therapy.listOpen(actor.campusId, projectId), actor)
    },

    /** Abre un grupo. Quien lo abre entra en él. */
    async create(actor: Actor, input: unknown): Promise<GroupView> {
      const group = parse(groupSchema, input)

      if ((await replica.projectName(group.projectId)) === null) {
        throw domainError('not_found', `El proyecto ${group.projectId} no existe en 42`)
      }
      if ((await therapy.countOpenBy(actor.login)) >= MAX_OPEN_GROUPS) {
        throw domainError('conflict', 'Ya tienes varios grupos abiertos. Cierra alguno antes')
      }

      const groupId = await therapy.create({
        ...group,
        campusId: actor.campusId,
        creator: actor.login,
      })
      const [created] = await view([await mustGet(groupId, actor)], actor)

      if (created === undefined) {
        throw domainError('not_found', 'Ese grupo no existe')
      }

      return created
    },

    /** Se apunta. `409` si ya no quedan plazas. */
    async join(actor: Actor, groupId: number): Promise<void> {
      const group = await mustGet(groupId, actor)

      if (group.members.includes(actor.login)) {
        return
      }
      if (group.closed || !(await therapy.join(groupId, actor.login))) {
        throw domainError('conflict', 'El grupo está completo')
      }
    },

    /** Se va. Si era la última persona, el grupo se cierra solo. */
    async leave(actor: Actor, groupId: number): Promise<void> {
      const group = await mustGet(groupId, actor)

      await therapy.leave(groupId, actor.login)

      if (group.members.every((login) => login === actor.login)) {
        await therapy.close(groupId)
      }
    },

    /** Cierra el grupo. Solo quien lo abrió, o quien modera. */
    async close(actor: Actor, groupId: number): Promise<void> {
      const group = await mustGet(groupId, actor)

      if (group.creator !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien abrió el grupo puede cerrarlo')
      }

      await therapy.close(groupId)
    },

    /**
     * Comprueba la asistencia de los grupos que están reunidos ahora.
     *
     * Cada media hora desde que empieza la sesión se mira quién de los apuntados
     * está sentado en uno de los puestos reservados del grupo, según la foto de
     * puestos de 42. Quien está, gana XP por esa media hora.
     *
     * No hay botón de fichar: no se puede cobrar desde casa ni desde otro
     * cluster. Y para que no valga apuntarse a solas a un grupo fantasma:
     *
     * - un grupo sin puestos reservados no da XP (no hay nada que comprobar);
     * - tiene que haber al menos dos personas del grupo en sus puestos;
     * - cada media hora se comprueba una sola vez (queda en `therapy_checks`);
     * - hay un tope diario de medias horas por persona.
     *
     * La llama el trabajo periódico del módulo, cada minuto.
     *
     * @returns Cuántas medias horas se han apuntado en esta pasada.
     */
    async checkAttendance(): Promise<number> {
      const fresh = new Set<number>()
      const since = new Date(now() - LOCATION_MAX_AGE_MS).toISOString()
      let awarded = 0

      for (const group of await therapy.listAllOpen()) {
        if (group.seats.length === 0) {
          continue
        }

        const moment = localMoment(now(), await replica.timeZoneOf(group.campusId))
        const slot = Math.floor((moment.minutes - minutesOf(group.start)) / SLOT_MINUTES)

        if (
          !group.days.includes(moment.weekday) ||
          slot < 1 ||
          moment.minutes > minutesOf(group.end) + CHECK_GRACE_MINUTES
        ) {
          continue
        }

        // La foto de puestos tiene que ser de ahora: se refresca una vez por campus.
        if (!fresh.has(group.campusId)) {
          await sync.ensureLocations(group.campusId)
          fresh.add(group.campusId)
        }

        const seatOf = new Map(
          (await replica.presenceIn(group.campusId, since)).map((person) => [
            person.login,
            person.host,
          ]),
        )
        const present = group.members.filter((login) =>
          group.seats.includes(seatOf.get(login) ?? ''),
        )

        const first = await therapy.recordCheck({
          groupId: group.id,
          day: moment.day,
          slot,
          present,
          at: new Date(now()).toISOString(),
        })

        if (!first || present.length < MIN_PRESENT) {
          continue
        }

        for (const login of present) {
          const today = await xp.countSince(login, XP_KIND.THERAPY_SESSION, startOfDayIso(now()))

          if (
            today < MAX_SLOTS_PER_DAY &&
            (await xp.award(
              login,
              XP_KIND.THERAPY_SESSION,
              `therapy:${group.id}:${moment.day}:${slot}`,
            ))
          ) {
            awarded += 1
          }
        }
      }

      return awarded
    },
  }
}

export type TherapyService = ReturnType<typeof createTherapyService>
