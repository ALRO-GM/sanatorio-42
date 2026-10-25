/**
 * La agenda (`docs/agenda.md`): un Scrum individual alrededor de los proyectos
 * del cursus.
 *
 * Cada cual se pone metas («entrego ft_printf antes del viernes») con su
 * avance, lo que le queda y una lista de checkpoints (los de fábrica salen del
 * tipo de proyecto), y apunta dailies y weeklies: qué se propone, si lo hizo y,
 * si no, qué le atascó y cómo podría desatascarse. Casi todo se elige de
 * listas cerradas (`agenda.rules.ts`): «Otro» es lo único que lleva texto.
 *
 * Lo de una meta solo lo ve su dueño, salvo en el tablero de un sprint (un
 * grupo de terapia) del mismo proyecto: ahí lo ve el resto del grupo, y nadie
 * más. Quien está oculto, o es del otro mundo, no sale (`core/audience.ts`).
 *
 * No pide nada a 42: los proyectos salen de la réplica, el plan del plan de
 * estudios guardado y los eventos del calendario ya copiado.
 */

import type {
  AgendaCheckpoint,
  AgendaCheckpointKey,
  AgendaEntry,
  AgendaGoal,
  AgendaOptions,
  AgendaProblem,
  AgendaProject,
  AgendaSolution,
  AgendaView,
  CalendarEvent,
  ProjectSummary,
  SprintBoard,
} from '@sanatorio/contracts'
import { z } from 'zod'

import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Actor } from '../../core/actor.js'
import { domainError } from '../../core/errors.js'
import { clockOf } from '../../core/options.js'
import type { Clock } from '../../core/options.js'
import { isoAt, localMoment } from '../../core/time.js'
import { day, id, optionalText, parse, text } from '../../core/validation.js'
import type { SprintRoster } from '../therapy/index.js'
import type { AgendaRepository, EntryWrite, GoalRow } from './agenda.repository.js'
import {
  CHECKPOINT_KEYS,
  DEFAULT_CHECKPOINTS,
  OUTCOMES,
  PROBLEMS,
  SOLUTIONS,
  blockerOf,
  daysBetween,
  kindOf,
  mondayOf,
  stuckOn,
} from './agenda.rules.js'

const DAY_MS = 86_400_000
/** Metas en marcha a la vez: una agenda, no una lista de deseos. */
const MAX_ACTIVE_GOALS = 8
/** Checkpoints por meta. */
const MAX_CHECKPOINTS = 15
/** Hasta dónde se puede poner una meta: medio año da para cualquier proyecto. */
const MAX_TARGET_DAYS = 180
/** Cuánto atrás se puede apuntar un daily olvidado (y un weekly, en semanas). */
const MAX_LATE_DAYS = 14
/** Dailies y weeklies que se dan de cada meta propia y en el tablero del sprint. */
const ENTRIES_SHOWN = 14
const BOARD_ENTRIES = 5
/** Lo cerrado se sigue viendo un mes en la agenda, para repasarlo. */
const CLOSED_SHOWN_DAYS = 30
/** Lo de 42 que se enseña en la agenda, a dos semanas vista. */
const EVENT_DAYS = 14
/** Los siguientes del plan que se ofrecen, para no llenar el desplegable. */
const NEXT_PROJECTS = 10
/** Lo de 42 a lo que vas: lo apuntado, los exámenes y las correcciones. */
const MINE: readonly CalendarEvent['kind'][] = ['event_joined', 'exam', 'evaluation']

/** Cómo llevas el proyecto: de 0 a 100, de 5 en 5. */
const progress = z.number().int().min(0).max(100).multipleOf(5, 'va de 5 en 5')

const goalSchema = z.object({
  projectId: id,
  targetDay: day,
  progress: progress.default(0),
  note: optionalText(200),
  checkpoints: z
    .array(z.enum(CHECKPOINT_KEYS))
    .max(MAX_CHECKPOINTS, `como mucho ${MAX_CHECKPOINTS} checkpoints`)
    .transform((keys) => [...new Set(keys)])
    .optional(),
})

const updateSchema = z.object({
  targetDay: day.optional(),
  progress: progress.optional(),
  // `undefined`: no cambia; vacío o `null`: se borra.
  note: z.string().trim().max(200, 'máximo 200 caracteres').nullable().optional(),
  status: z.enum(['active', 'done', 'dropped']).optional(),
})

const checkpointSchema = z.union([
  z.object({ key: z.enum(CHECKPOINT_KEYS) }),
  z.object({ text: text(80) }),
])

const markSchema = z.object({ done: z.boolean() })

/** «Otro» lleva su texto; lo demás, ninguno. */
function withOther(
  key: string | null,
  other: string | null,
  field: string,
  ctx: z.RefinementCtx,
): void {
  if (key === 'other' && other === null) {
    ctx.addIssue({ code: 'custom', message: 'con «Otro», escribe cuál', path: [field] })
  }
}

const entrySchema = z
  .object({
    kind: z.enum(['daily', 'weekly']),
    day,
    plan: z
      .array(id)
      .max(MAX_CHECKPOINTS)
      .default([])
      .transform((ids) => [...new Set(ids)]),
    outcome: z
      .enum(OUTCOMES)
      .nullish()
      .transform((value) => value ?? null),
    problem: z
      .enum(PROBLEMS)
      .nullish()
      .transform((value): AgendaProblem | null => value ?? null),
    problemOther: optionalText(120),
    solution: z
      .enum(SOLUTIONS)
      .nullish()
      .transform((value): AgendaSolution | null => value ?? null),
    solutionOther: optionalText(120),
    progress: progress.nullish().transform((value) => value ?? null),
    note: optionalText(280),
  })
  .superRefine((entry, ctx) => {
    withOther(entry.problem, entry.problemOther, 'problemOther', ctx)
    withOther(entry.solution, entry.solutionOther, 'solutionOther', ctx)
    if (entry.solution !== null && entry.problem === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'primero di qué te atasca',
        path: ['solution'],
      })
    }
  })
  // El texto de «Otro» solo se guarda con «Otro»: así cada columna dice una cosa.
  .transform((entry) => ({
    ...entry,
    problemOther: entry.problem === 'other' ? entry.problemOther : null,
    solutionOther: entry.solution === 'other' ? entry.solutionOther : null,
  }))

/** Lo que se cuenta al gancho de la ayuda cuando alguien apunta un atasco. */
export type BlockerEvent = {
  login: string
  campusId: number
  goalId: number
  projectId: number
  problem: AgendaProblem
  solution: AgendaSolution | null
}

export type AgendaServiceOptions = Clock & {
  repository: AgendaRepository
  /** Quién ve a quién en el tablero del sprint (`docs/piscineros.md`, `docs/personas-ocultas.md`). */
  audience?: Audience
  /** Los proyectos de la persona en la réplica (en curso y aprobados). */
  projectsOf: (login: string) => Promise<ProjectSummary[]>
  /** Nombre de cada proyecto, de la réplica. */
  projectNames: (ids: readonly number[]) => Promise<Map<number, string>>
  imagesOf: (logins: readonly string[]) => Promise<Map<string, string | null>>
  timeZoneOf: (campusId: number) => Promise<string | undefined>
  /** El círculo de cada proyecto del plan de la persona. Sin él, no hay «siguientes». */
  plan?: (login: string) => Promise<Map<number, number>>
  /** Lo del calendario entre dos instantes. Sin él, la agenda no enseña eventos. */
  events?: (actor: Actor, from: number, to: number) => Promise<CalendarEvent[]>
  /** Los sprints (grupos de terapia). Sin ellos, no hay tablero. */
  sprints?: {
    roster: (groupId: number, campusId: number) => Promise<SprintRoster | null>
    joinedBy: (login: string, campusId: number) => Promise<SprintRoster[]>
  }
  /**
   * Gancho con el sistema de ayuda (`docs/agenda.md`, «Lo que queda»): se
   * llama cada vez que alguien apunta un atasco. Hoy no hace nada; cuando la
   * ayuda lo use (avisar a quien puede ayudar con ese problema, proponer una
   * reserva), se conecta aquí sin tocar la agenda. Un fallo suyo no tumba el
   * daily.
   */
  onBlocker?: (blocker: BlockerEvent) => Promise<void>
}

export function createAgendaService(options: AgendaServiceOptions) {
  const { repository } = options
  const now = clockOf(options)
  const audience = options.audience ?? NO_POOL
  const onBlocker = options.onBlocker ?? (() => Promise.resolve())

  const todayIn = async (campusId: number): Promise<string> =>
    localMoment(now(), await options.timeZoneOf(campusId)).day

  /** La meta de quien pregunta, o 404: la de otra persona no existe para él. */
  async function mine(actor: Actor, goalId: number): Promise<GoalRow> {
    const goal = await repository.goal(goalId)

    if (goal?.login !== actor.login) throw domainError('not_found', 'Esa meta no existe')

    return goal
  }

  function checkTarget(targetDay: string, today: string): void {
    const ahead = daysBetween(today, targetDay)

    if (ahead < 0) throw domainError('invalid_input', 'targetDay: ese día ya ha pasado')
    if (ahead > MAX_TARGET_DAYS) {
      throw domainError('invalid_input', `targetDay: como mucho a ${MAX_TARGET_DAYS} días`)
    }
  }

  /** Las metas con sus checkpoints, entradas y sprints, como las ve su dueño. */
  async function views(actor: Actor, goals: readonly GoalRow[]): Promise<AgendaGoal[]> {
    const ids = goals.map((goal) => goal.id)
    const [checkpoints, entries, sprints] = await Promise.all([
      repository.checkpointsOf(ids),
      repository.entriesOf(ids, ENTRIES_SHOWN),
      goals.length === 0 || options.sprints === undefined
        ? Promise.resolve([])
        : options.sprints.joinedBy(actor.login, actor.campusId),
    ])

    return goals.map(({ login: _login, campusId: _campus, ...goal }) => ({
      ...goal,
      checkpoints: checkpoints.get(goal.id) ?? [],
      entries: entries.get(goal.id) ?? [],
      sprints: sprints
        .filter((sprint) => sprint.projectId === goal.projectId)
        .map((sprint) => ({
          groupId: sprint.id,
          place: sprint.place,
          members: sprint.members.length,
        })),
    }))
  }

  async function viewOf(actor: Actor, goalId: number): Promise<AgendaGoal> {
    const [view] = await views(actor, [await mine(actor, goalId)])

    if (view === undefined) throw domainError('not_found', 'Esa meta no existe')

    return view
  }

  /** Lo que se puede elegir: lo que tienes en marcha y lo siguiente de tu plan. */
  async function projectsFor(login: string): Promise<AgendaProject[]> {
    const [own, plan] = await Promise.all([
      options.projectsOf(login),
      options.plan?.(login) ?? Promise.resolve(new Map<number, number>()),
    ])
    const touched = new Set(own.map((project) => project.id))
    const doing: AgendaProject[] = own
      .filter((project) => project.status !== 'finished')
      .map((project) => ({
        id: project.id,
        name: project.name,
        status: 'in_progress',
        kind: kindOf(project.name),
        circle: plan.get(project.id) ?? null,
      }))
    const pending = [...plan]
      .filter(([projectId]) => !touched.has(projectId))
      .sort((a, b) => a[1] - b[1] || a[0] - b[0])
      .slice(0, NEXT_PROJECTS)
    const names = await options.projectNames(pending.map(([projectId]) => projectId))
    const next: AgendaProject[] = pending.flatMap(([projectId, circle]) => {
      const name = names.get(projectId)

      return name === undefined
        ? []
        : [{ id: projectId, name, status: 'next' as const, kind: kindOf(name), circle }]
    })

    return [...doing, ...next]
  }

  async function eventsFor(actor: Actor): Promise<CalendarEvent[]> {
    if (options.events === undefined) return []

    try {
      const events = await options.events(actor, now(), now() + EVENT_DAYS * DAY_MS)

      return events.filter((event) => MINE.includes(event.kind) && event.joined !== false)
    } catch {
      // Sin calendario la agenda sigue sirviendo: los eventos son un extra.
      return []
    }
  }

  return {
    /** `GET /agenda`: tus metas, lo que puedes elegir y lo de 42 a lo que vas. */
    async view(actor: Actor): Promise<AgendaView> {
      const [today, goals, projects, events] = await Promise.all([
        todayIn(actor.campusId),
        repository.goalsOf(actor.login, isoAt(now() - CLOSED_SHOWN_DAYS * DAY_MS)),
        projectsFor(actor.login),
        eventsFor(actor),
      ])

      return {
        today,
        goals: await views(actor, goals),
        projects,
        events,
        options: {
          checkpoints: [...CHECKPOINT_KEYS],
          problems: [...PROBLEMS],
          solutions: [...SOLUTIONS],
          defaults: Object.fromEntries(
            Object.entries(DEFAULT_CHECKPOINTS).map(([kind, keys]) => [kind, [...keys]]),
          ) as AgendaOptions['defaults'],
        },
      }
    },

    /**
     * Pone una meta. Sin checkpoints, los de fábrica de su tipo de proyecto.
     *
     * @throws {DomainError} `not_found` si el proyecto no está en la réplica;
     *   `invalid_input` si el día ya pasó o está a más de medio año; `conflict`
     *   con `MAX_ACTIVE_GOALS` en marcha.
     */
    async create(actor: Actor, input: unknown): Promise<AgendaGoal> {
      const wanted = parse(goalSchema, input)
      const name = (await options.projectNames([wanted.projectId])).get(wanted.projectId)

      if (name === undefined) {
        throw domainError('not_found', `El proyecto ${wanted.projectId} no existe en 42`)
      }
      checkTarget(wanted.targetDay, await todayIn(actor.campusId))
      if ((await repository.countActive(actor.login)) >= MAX_ACTIVE_GOALS) {
        throw domainError(
          'conflict',
          `Ya tienes ${MAX_ACTIVE_GOALS} metas en marcha. Cierra alguna antes`,
        )
      }

      const kind = kindOf(name)
      const goalId = await repository.create(
        {
          login: actor.login,
          campusId: actor.campusId,
          projectId: wanted.projectId,
          projectName: name,
          projectKind: kind,
          targetDay: wanted.targetDay,
          progress: wanted.progress,
          note: wanted.note,
        },
        wanted.checkpoints ?? DEFAULT_CHECKPOINTS[kind],
        isoAt(now()),
      )

      return viewOf(actor, goalId)
    },

    /**
     * Cambia el día, el avance, la nota o el estado. Cerrarla (`done`,
     * `dropped`) apunta cuándo; reabrirla cuenta otra vez para el tope.
     */
    async update(actor: Actor, goalId: number, input: unknown): Promise<AgendaGoal> {
      const goal = await mine(actor, goalId)
      const change = parse(updateSchema, input)
      const status = change.status ?? goal.status

      if (change.targetDay !== undefined && change.targetDay !== goal.targetDay) {
        checkTarget(change.targetDay, await todayIn(actor.campusId))
      }
      if (
        status === 'active' &&
        goal.status !== 'active' &&
        (await repository.countActive(actor.login)) >= MAX_ACTIVE_GOALS
      ) {
        throw domainError('conflict', `Ya tienes ${MAX_ACTIVE_GOALS} metas en marcha`)
      }

      await repository.update(
        goalId,
        {
          targetDay: change.targetDay ?? goal.targetDay,
          progress: change.progress ?? goal.progress,
          note: change.note === undefined ? goal.note : change.note === '' ? null : change.note,
          status,
          closedAt:
            status === 'active' ? null : status === goal.status ? goal.closedAt : isoAt(now()),
        },
        isoAt(now()),
      )

      return viewOf(actor, goalId)
    },

    /** Borra la meta con todo lo suyo (para lo puesto por error; lo dejado se cierra). */
    async remove(actor: Actor, goalId: number): Promise<void> {
      await mine(actor, goalId)
      await repository.remove(goalId)
    },

    /** Añade un checkpoint, de la lista o propio. */
    async addCheckpoint(actor: Actor, goalId: number, input: unknown): Promise<AgendaGoal> {
      const goal = await mine(actor, goalId)
      const wanted = parse(checkpointSchema, input)
      const current = (await repository.checkpointsOf([goalId])).get(goalId) ?? []

      if (current.length >= MAX_CHECKPOINTS) {
        throw domainError('conflict', `Como mucho, ${MAX_CHECKPOINTS} checkpoints por meta`)
      }

      const key: AgendaCheckpointKey | null = 'key' in wanted ? wanted.key : null

      // Uno de la lista que ya está no se repite.
      if (key === null || !current.some((checkpoint) => checkpoint.key === key)) {
        await repository.addCheckpoint(goal.id, actor.login, {
          key,
          text: 'text' in wanted ? wanted.text : null,
        })
      }

      return viewOf(actor, goalId)
    },

    /** Marca o desmarca un checkpoint. */
    async markCheckpoint(
      actor: Actor,
      goalId: number,
      checkpointId: number,
      input: unknown,
    ): Promise<AgendaGoal> {
      await mine(actor, goalId)

      const { done } = parse(markSchema, input)

      if (!(await repository.markCheckpoint(goalId, checkpointId, done ? isoAt(now()) : null))) {
        throw domainError('not_found', 'Ese checkpoint no existe')
      }

      return viewOf(actor, goalId)
    },

    async removeCheckpoint(
      actor: Actor,
      goalId: number,
      checkpointId: number,
    ): Promise<AgendaGoal> {
      await mine(actor, goalId)
      if (!(await repository.removeCheckpoint(goalId, checkpointId))) {
        throw domainError('not_found', 'Ese checkpoint no existe')
      }

      return viewOf(actor, goalId)
    },

    /**
     * Apunta (o reescribe) un daily o un weekly. El weekly va al lunes de su
     * semana. Si trae avance, es el nuevo avance de la meta. Con un atasco,
     * avisa al gancho de la ayuda.
     *
     * @throws {DomainError} `invalid_input` con un día fuera de plazo, un
     *   checkpoint que no es de la meta o «Otro» sin texto; `conflict` si la
     *   meta está cerrada.
     */
    async saveEntry(actor: Actor, goalId: number, input: unknown): Promise<AgendaGoal> {
      const goal = await mine(actor, goalId)
      const entry = parse(entrySchema, input)

      if (goal.status !== 'active') {
        throw domainError('conflict', 'Esa meta ya está cerrada: reábrela para apuntar algo')
      }

      const today = await todayIn(actor.campusId)
      const target = entry.kind === 'weekly' ? mondayOf(entry.day) : entry.day
      const from = entry.kind === 'weekly' ? mondayOf(today) : today
      const late = daysBetween(target, from)

      // Se puede adelantar el de mañana (o el de la semana que viene) y
      // recuperar uno olvidado de las dos últimas semanas.
      if (late < -(entry.kind === 'weekly' ? 7 : 1) || late > MAX_LATE_DAYS) {
        throw domainError('invalid_input', 'day: queda fuera de plazo')
      }

      const owned = new Set(
        ((await repository.checkpointsOf([goalId])).get(goalId) ?? []).map((each) => each.id),
      )

      if (entry.plan.some((checkpointId) => !owned.has(checkpointId))) {
        throw domainError('invalid_input', 'plan: ese checkpoint no es de esta meta')
      }

      const write: EntryWrite = { ...entry, day: target }

      await repository.saveEntry(goal, write, isoAt(now()))
      if (entry.progress !== null && entry.progress !== goal.progress) {
        await repository.update(goalId, { ...goal, progress: entry.progress }, isoAt(now()))
      }
      if (entry.problem !== null) {
        await onBlocker({
          login: actor.login,
          campusId: actor.campusId,
          goalId,
          projectId: goal.projectId,
          problem: entry.problem,
          solution: entry.solution,
        }).catch(() => undefined)
      }

      return viewOf(actor, goalId)
    },

    /**
     * `GET /agenda/sprints/:id`: el tablero del sprint. La meta de cada
     * persona del grupo para su proyecto, con checkpoints, atasco y últimos
     * dailies. Solo para quien está dentro; quien está oculto o es del otro
     * mundo no sale.
     *
     * @throws {DomainError} `not_found` si el grupo no existe, es de otro
     *   campus o está cerrado; `forbidden` si no estás dentro.
     */
    async board(actor: Actor, groupId: number): Promise<SprintBoard> {
      const roster = (await options.sprints?.roster(groupId, actor.campusId)) ?? null

      if (roster === null) throw domainError('not_found', 'Ese sprint no existe')
      if (!roster.members.includes(actor.login)) {
        throw domainError('forbidden', 'Solo quien está en el sprint ve su tablero')
      }

      const sees = await seesFor(audience, actor)
      const people = roster.members.filter(sees)
      const [goals, images] = await Promise.all([
        repository.latestFor(roster.projectId, people),
        options.imagesOf(people),
      ])
      const ids = [...goals.values()].map((goal) => goal.id)
      const [checkpoints, entries] = await Promise.all([
        repository.checkpointsOf(ids),
        repository.entriesOf(ids, BOARD_ENTRIES),
      ])

      return {
        groupId: roster.id,
        projectId: roster.projectId,
        projectName: roster.projectName,
        place: roster.place,
        members: people.map((login) => {
          const goal = goals.get(login)

          if (goal === undefined) return { login, image: images.get(login) ?? null, goal: null }

          const list: AgendaCheckpoint[] = checkpoints.get(goal.id) ?? []
          const recent: AgendaEntry[] = entries.get(goal.id) ?? []

          return {
            login,
            image: images.get(login) ?? null,
            goal: {
              id: goal.id,
              targetDay: goal.targetDay,
              progress: goal.progress,
              status: goal.status,
              note: goal.note,
              checkpoints: list,
              done: list.filter((checkpoint) => checkpoint.done).length,
              total: list.length,
              stuckOn: stuckOn(list),
              blocker: blockerOf(recent),
              entries: recent,
            },
          }
        }),
      }
    },
  }
}

export type AgendaService = ReturnType<typeof createAgendaService>
