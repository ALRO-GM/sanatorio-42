/**
 * Terapias de grupo: gente con el mismo proyecto pendiente que acuerda quedar.
 *
 * Un grupo tiene sitio, días de la semana, horario y plazas. Asistir da XP, y
 * para que "asistir" signifique algo se ficha: solo un día de quedada, dentro
 * del horario y, si sabemos dónde está cada cual, estando en el campus.
 */

import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { GroupView, SeatReservation } from '@sanatorio/contracts'
import { z } from 'zod'

import type { GroupRow, TherapyRepository } from './therapy.repository.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import {
  EVENT_HORIZON_DAYS,
  beyondHorizon,
  localMoment,
  minutesOf,
  startOfDayIso,
} from '../../core/time.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import { XP_KIND } from '../profile/index.js'
import type { XpService } from '../profile/index.js'
import { id, optionalText, parse, text } from '../../core/validation.js'
import type { Actor } from '../../core/actor.js'
import type { Notify } from '../../core/events.js'

type TherapyServiceOptions = {
  therapy: TherapyRepository
  /** Quién ve a quién: del otro grupo no se apunta nadie (`docs/piscineros.md`). */
  audience?: Audience
  replica: ReplicaRepository
  sync: Syncer
  xp: XpService
  /** Para dejar un aviso en el buzón de quien tiene que enterarse. Sin él, no se avisa. */
  notify?: Notify
  now?: () => number
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Días que puede tener un grupo. */
const MAX_DATES = 14

/** Puestos que puede reservar un grupo: es lo que cabe hablando sin molestar al resto. */
const MAX_SEATS = 6

/** Cómo lleva alguien el proyecto, de 0 a 100. */
const progress = z.number().int().min(0).max(100)

const joinSchema = z.object({ progress: progress.optional() }).default({})

/**
 * `true` si los puestos se tocan: todos en el mismo cluster y formando un solo
 * bloque, en el que cada puesto tiene otro del grupo al lado, delante, detrás o
 * en diagonal. Es lo que hace falta para hablarse sin levantarse.
 *
 * Un puesto cuyo nombre no se entiende (un campus que los llama de otra forma)
 * no se puede comprobar y se da por bueno.
 */
function seatsTogether(seats: readonly string[]): boolean {
  const places = seats.flatMap((seat) => {
    const match = /^(.+?)r(\d{1,2})[sp](\d{1,2})$/.exec(seat)

    return match === null
      ? []
      : [{ cluster: match[1] ?? '', row: Number(match[2]), seat: Number(match[3]) }]
  })
  const [first, ...rest] = places

  if (first === undefined || rest.length === 0) {
    return true
  }

  // Se parte de un puesto y se va llegando a los que tocan a alguno ya alcanzado.
  const reached = [first]
  let pending = rest

  for (;;) {
    const next = pending.filter((place) =>
      reached.some(
        (other) =>
          other.cluster === place.cluster &&
          Math.abs(other.row - place.row) <= 1 &&
          Math.abs(other.seat - place.seat) <= 1,
      ),
    )

    if (next.length === 0) {
      return pending.length === 0
    }

    reached.push(...next)
    pending = pending.filter((place) => !next.includes(place))
  }
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
    message: 'los puestos tienen que tocarse: mismo cluster y cada uno pegado a otro del grupo',
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

/** Un grupo visto desde la agenda: su proyecto, dónde queda y quién está. */
export type SprintRoster = {
  id: number
  projectId: number
  projectName: string | null
  place: string
  members: string[]
}

const rosterOf = (group: GroupRow): SprintRoster => ({
  id: group.id,
  projectId: group.projectId,
  projectName: group.projectName,
  place: group.place,
  members: group.members,
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
  const notify: Notify = options.notify ?? (() => Promise.resolve())

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

  /**
   * Ningún día puede ser anterior a hoy (no se queda en el pasado) ni caer más
   * allá de lo que se deja reservar.
   */
  async function mustBeUpcoming(dates: readonly string[], campusId: number): Promise<void> {
    const today = await todayIn(campusId)
    const past = dates.find((date) => date < today)

    if (past !== undefined) {
      throw domainError('invalid_input', `dates: el ${past} ya ha pasado`)
    }

    const far = dates.find((date) => beyondHorizon(Date.parse(`${date}T00:00:00Z`), now()))

    if (far !== undefined) {
      throw domainError(
        'invalid_input',
        `dates: el ${far} queda a más de ${EVENT_HORIZON_DAYS} días. No se puede reservar con tanta antelación`,
      )
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
        mine: group.creator === actor.login,
        canClose: group.creator === actor.login || actor.admin,
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
     * lo abrió (quien modera, si hay que quitarlo, lo cierra).
     *
     * Los días que el grupo ya tenía se pueden conservar aunque hayan pasado;
     * los que se añadan tienen que ser de hoy en adelante. Las plazas no pueden
     * quedar por debajo de la gente que ya está apuntada.
     */
    async update(actor: Actor, groupId: number, input: unknown): Promise<GroupView> {
      const current = await mustGet(groupId, actor)

      if (current.creator !== actor.login) {
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

      // El grupo de alguien del otro grupo, para quien mira, no existe.
      if (!(await seesFor(options.audience ?? NO_POOL, actor))(group.creator)) {
        throw domainError('not_found', 'Ese grupo no existe')
      }
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

      await notify({
        to: [group.creator],
        kind: 'group_joined',
        ref: `group:${groupId}`,
        from: actor.login,
        text: group.projectName,
      })
    },

    /** Se va. Si era la última persona, el grupo se cierra solo. */
    async leave(actor: Actor, groupId: number): Promise<void> {
      const group = await mustGet(groupId, actor)

      await therapy.leave(groupId, actor.login)

      if (group.members.every((login) => login === actor.login)) {
        await therapy.close(groupId)
      }
    },

    /**
     * Avisa del grupo a quien tiene el proyecto en curso en el campus y aún no
     * está dentro. Solo quien lo abrió, y una sola vez por grupo: es un aviso
     * en el buzón de mucha gente.
     *
     * @returns A cuántas personas se avisó.
     * @throws {DomainError} `forbidden` si no lo abrió; `conflict` si está
     *   cerrado o ya se avisó.
     */
    async invite(actor: Actor, groupId: number): Promise<{ invited: number }> {
      const group = await mustGet(groupId, actor)

      if (group.creator !== actor.login) {
        throw domainError('forbidden', 'Solo quien abrió el grupo puede avisar')
      }
      if (group.closed) {
        throw domainError('conflict', 'Ese grupo ya está cerrado')
      }
      if (group.invited !== null) {
        throw domainError('conflict', 'Ya se avisó de este grupo')
      }

      const people = (await replica.doingProject(group.projectId, group.campusId)).filter(
        (login) => !group.members.includes(login),
      )

      if (!(await therapy.markInvited(groupId, people.length))) {
        throw domainError('conflict', 'Ya se avisó de este grupo')
      }

      await notify({
        to: people,
        kind: 'group_invite',
        ref: `group:${groupId}`,
        from: actor.login,
        text: group.projectName,
      })

      return { invited: people.length }
    },

    /** Cierra el grupo. Solo quien lo abrió, o quien modera. */
    async close(actor: Actor, groupId: number): Promise<void> {
      const group = await mustGet(groupId, actor)

      if (group.creator !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien abrió el grupo puede cerrarlo')
      }

      await therapy.close(groupId)
      await notify({
        to: group.members,
        kind: 'group_closed',
        ref: `group:${groupId}`,
        from: actor.login,
        text: group.projectName,
      })
    },

    /**
     * El grupo y su gente, para el tablero del sprint de la agenda
     * (`docs/agenda.md`). `null` si no existe, es de otro campus o está
     * cerrado: para la agenda, es lo mismo. Quién puede verlo lo decide ella.
     */
    async roster(groupId: number, campusId: number): Promise<SprintRoster | null> {
      const group = await therapy.get(groupId)

      return group?.campusId !== campusId || group.closed ? null : rosterOf(group)
    },

    /** Los grupos abiertos de un campus en los que está esa persona: sus sprints. */
    async joinedBy(login: string, campusId: number): Promise<SprintRoster[]> {
      return (await therapy.listOpen(campusId))
        .filter((group) => group.members.includes(login))
        .map(rosterOf)
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
