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

/** Días que puede tener un grupo. */
const MAX_DATES = 14

/** Puestos que puede reservar un grupo: es lo que cabe hablando sin molestar al resto. */
const MAX_SEATS = 6

/** Filas que puede haber, como mucho, entre el primer puesto y el último. */
const MAX_ROW_SPAN = 2

/** Cómo lleva alguien el proyecto, de 0 a 100. */
const progress = z.number().int().min(0).max(100)

const joinSchema = z.object({ progress: progress.optional() }).default({})

/**
 * `true` si los puestos están juntos: todos en el mismo cluster y sin más de
 * `MAX_ROW_SPAN` filas entre el primero y el último. Un puesto cuyo nombre no
 * se entiende (un campus que los llama de otra forma) no se puede comprobar y
 * se da por bueno.
 */
function seatsTogether(seats: readonly string[]): boolean {
  const places = seats.flatMap((seat) => {
    const match = /^(.+?)r(\d{1,2})[sp]\d{1,2}$/.exec(seat)

    return match === null ? [] : [{ cluster: match[1] ?? '', row: Number(match[2]) }]
  })

  if (places.length < 2) {
    return true
  }

  const rows = places.map((place) => place.row)

  return (
    new Set(places.map((place) => place.cluster)).size === 1 &&
    Math.max(...rows) - Math.min(...rows) <= MAX_ROW_SPAN
  )
}

const groupSchema = z
  .object({
    projectId: id,
    place: text(80),
    dates: z
      .array(z.iso.date('día no válido'))
      .min(1, 'elige al menos un día')
      .max(MAX_DATES, `como mucho ${MAX_DATES} días`)
      .transform((dates) => [...new Set(dates)].sort()),
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
      .max(MAX_SEATS, `máximo ${MAX_SEATS} puestos`)
      .default([])
      .transform((seats) => [...new Set(seats)]),
    kind: z.enum(['study', 'review']).default('study'),
    progress: progress.optional(),
  })
  .refine((group) => group.seats.length !== 1, {
    message: 'un grupo son al menos dos puestos',
    path: ['seats'],
  })
  .refine((group) => seatsTogether(group.seats), {
    message: `los puestos tienen que estar en el mismo cluster y a ${MAX_ROW_SPAN} filas como mucho`,
    path: ['seats'],
  })
  // Con puestos elegidos, las plazas son los puestos: no se piden aparte.
  .transform((group) => ({
    ...group,
    capacity: group.seats.length > 0 ? group.seats.length : group.capacity,
  }))
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
      group.dates.includes(moment.day) &&
      moment.minutes >= minutesOf(group.start) - CHECKIN_EARLY_MINUTES &&
      moment.minutes <= minutesOf(group.end)

    return { active, day: moment.day }
  }

  /** El día de hoy en un campus, `YYYY-MM-DD`. */
  async function todayIn(campusId: number): Promise<string> {
    return localMoment(now(), await replica.timeZoneOf(campusId)).day
  }

  /** Ningún día puede ser anterior a hoy: no se queda en el pasado. */
  async function mustBeUpcoming(dates: readonly string[], campusId: number): Promise<void> {
    const today = await todayIn(campusId)
    const past = dates.find((date) => date < today)

    if (past !== undefined) {
      throw domainError('invalid_input', `dates: el ${past} ya ha pasado`)
    }
  }

  async function view(groups: readonly GroupRow[], actor: Actor): Promise<GroupView[]> {
    const images = await replica.imagesOf(groups.flatMap((group) => group.members))
    const views: GroupView[] = []

    for (const group of groups) {
      const { members, progress: given, campusId: _campusId, closed: _closed, ...rest } = group

      views.push({
        ...rest,
        members: members.map((login) => ({
          login,
          image: images.get(login) ?? null,
          progress: given[login] ?? null,
        })),
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
          dates: group.dates,
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
      // Un grupo cuyo último día ya pasó se cierra solo: no tiene sentido
      // seguir enseñándolo ni que ocupe un hueco de los de quien lo abrió.
      await therapy.closeFinished(actor.campusId, await todayIn(actor.campusId))

      return view(await therapy.listOpen(actor.campusId, projectId), actor)
    },

    /** Abre un grupo. Quien lo abre entra en él. */
    async create(actor: Actor, input: unknown): Promise<GroupView> {
      const group = parse(groupSchema, input)

      if ((await replica.projectName(group.projectId)) === null) {
        throw domainError('not_found', `El proyecto ${group.projectId} no existe en 42`)
      }

      // Un grupo de repaso es de quien ya lo tiene terminado, empezando por quien lo abre.
      if (group.kind === 'review' && group.progress !== 100) {
        throw domainError(
          'conflict',
          'Un grupo de repaso es para quien ya tiene el proyecto terminado al 100 %',
        )
      }

      await mustBeUpcoming(group.dates, actor.campusId)
      await therapy.closeFinished(actor.campusId, await todayIn(actor.campusId))

      if ((await therapy.countOpenBy(actor.login)) >= MAX_OPEN_GROUPS) {
        throw domainError('conflict', 'Ya tienes varios grupos abiertos. Cierra alguno antes')
      }

      const groupId = await therapy.create({
        ...group,
        progress: group.progress ?? null,
        campusId: actor.campusId,
        creator: actor.login,
      })
      const [created] = await view([await mustGet(groupId, actor)], actor)

      if (created === undefined) {
        throw domainError('not_found', 'Ese grupo no existe')
      }

      return created
    },

    /**
     * Cambia un grupo: sitio, días, horario, plazas, nota o puestos. Solo quien
     * lo abrió, o quien modera.
     *
     * Los días que el grupo ya tenía se pueden conservar aunque hayan pasado;
     * los que se añadan tienen que ser de hoy en adelante. Las plazas no pueden
     * quedar por debajo de la gente que ya está apuntada.
     */
    async update(actor: Actor, groupId: number, input: unknown): Promise<GroupView> {
      const current = await mustGet(groupId, actor)

      if (current.creator !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien abrió el grupo puede cambiarlo')
      }
      if (current.closed) {
        throw domainError('conflict', 'Ese grupo ya está cerrado')
      }

      const group = parse(groupSchema, input)

      if ((await replica.projectName(group.projectId)) === null) {
        throw domainError('not_found', `El proyecto ${group.projectId} no existe en 42`)
      }
      if (group.capacity < current.members.length) {
        throw domainError(
          'conflict',
          `Ya hay ${current.members.length} personas apuntadas: no puedes dejar menos plazas`,
        )
      }

      await mustBeUpcoming(
        group.dates.filter((date) => !current.dates.includes(date)),
        actor.campusId,
      )
      await therapy.update(groupId, group)

      const [updated] = await view([await mustGet(groupId, actor)], actor)

      if (updated === undefined) {
        throw domainError('not_found', 'Ese grupo no existe')
      }

      return updated
    },

    /**
     * Se apunta, diciendo cómo lleva el proyecto. `409` si ya no quedan plazas o
     * si el grupo es de repaso y no lo tiene terminado.
     */
    async join(actor: Actor, groupId: number, input?: unknown): Promise<void> {
      const group = await mustGet(groupId, actor)
      const { progress: mine } = parse(joinSchema, input ?? {})

      if (group.members.includes(actor.login)) {
        return
      }
      if (group.kind === 'review' && mine !== 100) {
        throw domainError(
          'conflict',
          'Este grupo es de repaso: es para quien ya tiene el proyecto terminado al 100 %',
        )
      }
      if (group.closed || !(await therapy.join(groupId, actor.login, mine ?? null))) {
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
          !group.dates.includes(moment.day) ||
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
