/**
 * Tablón de dudas y guía de cada proyecto.
 *
 * Cada proyecto tiene un corcho con post-its (dudas) y una guía corta: por
 * dónde empezar, problemas recurrentes y conceptos clave.
 *
 * "Especialista" aquí es lo mismo que en el resto de la web: alguien que ya
 * aprobó ese proyecto, según la réplica de 42. Sus respuestas van marcadas y
 * son quienes mantienen la guía; el resto puede proponer cambios.
 */

import type {
  DoubtBoard,
  DoubtDetail,
  DoubtStatus,
  DoubtView,
  GuideChange,
  GuideSanctions,
  GraphProject,
  GraphStatus,
  HolyGraph,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { AnswerRow, DoubtRow, DoubtsRepository, GuideRow } from './doubts.repository.js'
import { XP_KIND } from '../profile/index.js'
import type { XpService } from '../profile/index.js'
import { LAST_CIRCLE } from '../replica/index.js'
import type { Curriculum, ReplicaRepository } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import { parse, startOfDayIso, text } from '../../core/validation.js'
import type { GuideChangesRepository, StrikeRole } from './guide-changes.repository.js'
import type { Actor } from '../../core/actor.js'

export type DoubtsServiceOptions = {
  doubts: DoubtsRepository
  changes: GuideChangesRepository
  curriculum: Curriculum
  xp: XpService
  replica: ReplicaRepository
  now?: () => number
}

/** Colores de post-it. El front tiene la paleta; aquí solo se reparte el índice. */
const COLORS = 5

const DAY = 24 * 60 * 60_000

/** Personas distintas que tienen que señalar un cambio para que se retire. */
const FLAGS_TO_REVOKE = 2

/** Días durante los que un cambio aceptado se puede señalar. */
const FLAG_WINDOW_DAYS = 30

/** Faltas que provocan un bloqueo, y cuánto dura. */
const STRIKES_PER_BLOCK = 3
const BLOCK_DAYS = 30

/** Validaciones con XP que puede hacer una persona al día. */
const MAX_REVIEW_XP_PER_DAY = 5

/** Días que tienen que pasar para que la misma pareja vuelva a ganar XP por un cambio. */
const PAIR_COOLDOWN_DAYS = 7

/** Respuestas con XP que puede acumular una persona al día. */
const MAX_SOLVED_XP_PER_DAY = 5

const solvedSchema = z.object({
  resolved: z.boolean({ message: 'tiene que ser un booleano' }),
  answerId: z.number().int().positive().nullish(),
})

/** Dudas que puede poner una persona al día. */
const MAX_DOUBTS_PER_DAY = 10

const doubtSchema = z.object({ body: text(280, 5) })
const answerSchema = z.object({ body: text(1000, 2) })
const line = text(140)
const guideSchema = z.object({
  start: z.array(line).max(8),
  problems: z.array(line).max(10),
  concepts: z.array(text(30)).max(12),
})
const proposalSchema = z.object({
  section: z.enum(['start', 'problems', 'concepts']),
  body: line,
})

/** Nombres que no caben en un nodo, y cómo se abrevian. */
const SHORT_NAMES: Record<string, string> = {
  get_next_line: 'GNL',
  Born2beroot: 'B2BR',
  ft_printf: 'printf',
  Philosophers: 'Philo',
  NetPractice: 'NetPrac',
  ft_transcendence: 'transc.',
  'A-Maze-ing': 'Maze',
  'Call Me Maybe': 'CallMe',
}

/**
 * Serie de un proyecto, si es uno de varios módulos numerados: `"Python"` para
 * `Python Module 05`, `"CPP"` para `CPP Module 03`. `null` para el resto.
 */
export function seriesOf(name: string): string | null {
  return /^(.+) Module \d+$/.exec(name)?.[1] ?? null
}

/** Nombre corto de un proyecto, para que quepa dentro de su nodo. */
export function shortName(name: string): string {
  const known = SHORT_NAMES[name]

  if (known !== undefined) {
    return known
  }

  const numbered = /^(Python|CPP) Module (\d+)$/.exec(name) ?? /^(Exam) Rank (\d+)$/.exec(name)

  if (numbered !== null) {
    const prefix = { Python: 'Py', CPP: 'C++', Exam: 'Exam' }[numbered[1] ?? ''] ?? ''

    return `${prefix} ${numbered[2] ?? ''}`
  }

  return name.length <= 9 ? name : `${name.slice(0, 8)}…`
}

export function createDoubtsService(options: DoubtsServiceOptions) {
  const { doubts, changes, curriculum, replica, xp } = options
  const now = options.now ?? Date.now

  function statusOf(doubt: DoubtRow): DoubtStatus {
    if (doubt.resolved) {
      return 'resolved'
    }

    return doubt.specialistAnswered ? 'specialist' : 'open'
  }

  function view(doubt: DoubtRow, actor: Actor): DoubtView {
    return {
      id: doubt.id,
      author: doubt.author,
      body: doubt.body,
      color: doubt.color,
      status: statusOf(doubt),
      answers: doubt.answers,
      createdAt: doubt.createdAt,
      mine: doubt.author === actor.login || actor.admin,
    }
  }

  /** La duda, o 404. También si es de otro campus. */
  async function mustGet(doubtId: number, actor: Actor): Promise<DoubtRow> {
    const doubt = await doubts.get(doubtId)

    if (doubt?.campusId !== actor.campusId) {
      throw domainError('not_found', 'Esa duda no existe')
    }

    return doubt
  }

  async function mustKnowProject(projectId: number): Promise<string> {
    const name = await replica.projectName(projectId)

    if (name === null) {
      throw domainError('not_found', `El proyecto ${projectId} no existe en 42`)
    }

    return name
  }

  const iso = (at: number): string => new Date(at).toISOString()

  /**
   * Hasta cuándo está bloqueada una persona en ese papel, o `null`.
   *
   * Cada tercera falta (la 3.ª, la 6.ª…) abre un bloqueo de un mes desde ese
   * momento. Las faltas no caducan: quien vuelve a las andadas vuelve a caer.
   */
  async function blockedUntil(login: string, role: StrikeRole): Promise<string | null> {
    const strikes = await changes.strikes(login, role)
    const last = strikes[Math.floor(strikes.length / STRIKES_PER_BLOCK) * STRIKES_PER_BLOCK - 1]

    if (last === undefined) {
      return null
    }

    const until = Date.parse(last) + BLOCK_DAYS * DAY

    return until > now() ? iso(until) : null
  }

  async function mustNotBeBlocked(login: string, role: StrikeRole): Promise<void> {
    const until = await blockedUntil(login, role)

    if (until !== null) {
      throw domainError(
        'forbidden',
        role === 'proposer'
          ? `Te han rechazado varios cambios seguidos. Podrás volver a proponer el ${until.slice(0, 10)}`
          : `Varios cambios que validaste se han retirado. Podrás volver a validar el ${until.slice(0, 10)}`,
      )
    }
  }

  async function mustBeSpecialist(actor: Actor, projectId: number): Promise<void> {
    if (!actor.admin && !(await replica.isSpecialist(actor.login, projectId))) {
      throw domainError('forbidden', 'La guía la mantienen quienes ya aprobaron el proyecto')
    }
  }

  return {
    /**
     * El grafo del tablón: los proyectos del common core que quien pregunta
     * tiene o tendrá disponibles, por círculos, con cómo va en cada uno y dónde
     * hace falta una mano.
     *
     * Es **su** plan, no un catálogo: quien sigue el plan nuevo ve sus módulos
     * de Python y no los proyectos de C que ya no le tocan, y al revés. La
     * piscina no sale nunca (no es del 42cursus).
     *
     * Los avisos se filtran aquí, no en la web: quien aprobó un proyecto ve sus
     * dudas sin responder, las propuestas a la guía y si falta la guía (es
     * quien puede hacer algo con las tres cosas); quien lo está haciendo, solo
     * las dudas sin responder; quien aún no ha llegado, nada. Las dudas y
     * propuestas propias no cuentan.
     *
     * @param userId Su id en 42, para preguntar por su plan y su rango.
     */
    async graph(actor: Actor, userId: number | null): Promise<HolyGraph> {
      const { track, rank } = await curriculum.trackOf(actor.login, userId)

      await curriculum.ensureHours(actor.campusId)

      const [circles, mine, activity, perfect, cursus] = await Promise.all([
        curriculum.circles(track),
        replica.projectsOf(actor.login, true),
        doubts.activity(actor.campusId, actor.login),
        replica.perfectProjectsOf(actor.login),
        curriculum.cursusOf(actor.login, userId),
      ])
      const statusById = new Map(mine.map((project) => [project.id, project.status]))

      // Si 42 no ha dicho por qué rango va, se deduce: está en el círculo más
      // alto en el que tiene algún proyecto.
      const reached = Math.max(-1, ...mine.map((project) => circles.get(project.id) ?? -1))
      const currentCircle = Math.min(LAST_CIRCLE, rank === null ? Math.max(0, reached) : rank + 1)

      // Un proyecto suyo que aún no está en la tabla del plan (nadie lo había
      // hecho antes aquí) se coloca en el círculo en el que está. Si ya terminó
      // el common core, lo que haga después no es de este grafo.
      if (rank === null || rank < LAST_CIRCLE) {
        for (const project of mine) {
          if (!circles.has(project.id)) circles.set(project.id, currentCircle)
        }
      }

      const info = await replica.projectInfo([...circles.keys()])
      const byCircle = new Map<number, GraphProject[]>()

      for (const [projectId, circle] of circles) {
        const project = info.get(projectId)

        if (project === undefined) {
          continue
        }

        const { name, hours } = project

        const status: GraphStatus = statusById.get(projectId) ?? 'todo'
        const pending = activity.get(projectId)

        byCircle.set(circle, [
          ...(byCircle.get(circle) ?? []),
          {
            projectId,
            name,
            short: shortName(name),
            status,
            perfect: perfect.has(projectId),
            hours,
            series: seriesOf(name),
            // Lo que ya tiene (aunque sea de un círculo posterior) nunca está cerrado.
            locked: status === 'todo' && circle > currentCircle,
            signals: {
              unanswered: status === 'todo' ? 0 : (pending?.unanswered ?? 0),
              proposals: status === 'finished' ? (pending?.proposals ?? 0) : 0,
              missingGuide: status === 'finished' && pending?.hasGuide !== true,
            },
          },
        ])
      }

      const knownUpTo = Math.max(0, ...byCircle.keys())

      return {
        track,
        level: cursus.level,
        startedAt: cursus.startedAt,
        currentCircle,
        knownUpTo,
        circles: Array.from({ length: knownUpTo + 1 }, (_, circle) => ({
          circle,
          projects: (byCircle.get(circle) ?? []).sort((a, b) =>
            a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }),
          ),
        })),
      }
    },

    /** El tablón entero de un proyecto: guía, propuestas y post-its. */
    async board(actor: Actor, projectId: number): Promise<DoubtBoard> {
      const name = await mustKnowProject(projectId)
      const canEditGuide = actor.admin || (await replica.isSpecialist(actor.login, projectId))
      const [guide, list, proposals, recent, proposeBlockedUntil, reviewBlockedUntil] =
        await Promise.all([
          doubts.guide(actor.campusId, projectId),
          doubts.list(actor.campusId, projectId),
          canEditGuide ? doubts.proposals(actor.campusId, projectId) : Promise.resolve([]),
          canEditGuide
            ? changes.recent(actor.campusId, projectId, iso(now() - FLAG_WINDOW_DAYS * DAY))
            : Promise.resolve([]),
          blockedUntil(actor.login, 'proposer'),
          blockedUntil(actor.login, 'validator'),
        ])
      const sanctions: GuideSanctions = { proposeBlockedUntil, reviewBlockedUntil }
      const recentChanges: GuideChange[] = recent.map((change) => {
        const involved = change.proposer === actor.login || change.validator === actor.login
        const flaggedByMe = change.flaggedBy.includes(actor.login)

        return {
          id: change.id,
          section: change.section,
          body: change.body,
          proposer: change.proposer,
          validator: change.validator,
          acceptedAt: change.acceptedAt,
          flags: change.flaggedBy.length,
          flaggedByMe,
          canFlag: !involved && !flaggedByMe,
        }
      })

      return {
        project: { id: projectId, name },
        guide,
        canEditGuide,
        proposals: proposals.map(({ id, author, section, body }) => ({
          id,
          author,
          section,
          body,
        })),
        recentChanges,
        sanctions,
        doubts: list.map((doubt) => view(doubt, actor)),
      }
    },

    /** Pega un post-it. */
    async create(actor: Actor, projectId: number, input: unknown): Promise<DoubtView> {
      const { body } = parse(doubtSchema, input)
      await mustKnowProject(projectId)

      if ((await doubts.countBySince(actor.login, startOfDayIso(now()))) >= MAX_DOUBTS_PER_DAY) {
        throw domainError('conflict', 'Ya has puesto muchas dudas hoy. Mañana más')
      }

      const doubtId = await doubts.create({
        campusId: actor.campusId,
        projectId,
        author: actor.login,
        body,
        color: Math.floor(Math.random() * COLORS),
      })

      return view(await mustGet(doubtId, actor), actor)
    },

    /**
     * Cambia el texto de una duda. Solo quien la puso, o quien modera.
     *
     * Una duda resuelta no se puede cambiar: alguien ganó XP por responder a lo
     * que decía. Para corregirla hay que reabrirla.
     */
    async update(actor: Actor, doubtId: number, input: unknown): Promise<DoubtView> {
      const { body } = parse(doubtSchema, input)
      const doubt = await mustGet(doubtId, actor)

      if (doubt.author !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien puso la duda puede cambiarla')
      }
      if (doubt.resolved) {
        throw domainError('conflict', 'Para cambiar una duda resuelta, primero reábrela')
      }

      await doubts.updateBody(doubtId, body)

      return view(await mustGet(doubtId, actor), actor)
    },

    /** Una duda con sus respuestas. */
    async detail(actor: Actor, doubtId: number): Promise<DoubtDetail> {
      const doubt = await mustGet(doubtId, actor)

      return {
        ...view(doubt, actor),
        replies: await doubts.answers(doubtId),
        solvedAnswerId: doubt.solvedAnswerId,
      }
    },

    /**
     * Responde a una duda.
     *
     * Si quien responde aprobó el proyecto, la respuesta queda marcada y la
     * duda pasa a "de especialista".
     */
    async answer(actor: Actor, doubtId: number, input: unknown): Promise<AnswerRow[]> {
      const { body } = parse(answerSchema, input)
      const doubt = await mustGet(doubtId, actor)

      await doubts.addAnswer({
        doubtId,
        author: actor.login,
        body,
        specialist: await replica.isSpecialist(actor.login, doubt.projectId),
      })

      return doubts.answers(doubtId)
    },

    /**
     * Da la duda por resuelta **con una respuesta concreta**, o la reabre.
     *
     * Resolver sin señalar qué respuesta lo consiguió no se puede: es lo que
     * permite reconocer a quien ayudó. Quien escribió esa respuesta gana XP,
     * salvo que sea quien puso la duda.
     *
     * Para que dos personas no se pasen XP a base de dudas de mentira, la misma
     * pareja solo puntúa una vez al día y cada persona tiene un tope diario.
     *
     * Solo quien puso la duda (o quien modera).
     */
    async setResolved(actor: Actor, doubtId: number, input: unknown): Promise<void> {
      const { resolved, answerId } = parse(solvedSchema, input)
      const doubt = await mustGet(doubtId, actor)

      if (doubt.author !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien puso la duda puede darla por resuelta')
      }

      const answers = await doubts.answers(doubtId)
      const ref = `doubt:${doubtId}`
      const previous = answers.find((answer) => answer.id === doubt.solvedAnswerId)

      // Si ya estaba resuelta con otra respuesta (o se reabre), esa XP se retira.
      if (previous !== undefined) {
        await xp.revoke(previous.author, XP_KIND.DOUBT_SOLVED, ref)
      }

      if (!resolved) {
        await doubts.setSolved(doubtId, null, iso(now()))
        return
      }

      const solver = answers.find((answer) => answer.id === answerId)

      if (solver === undefined) {
        throw domainError(
          'invalid_input',
          'Para darla por resuelta, indica qué respuesta la resolvió',
        )
      }

      const today = startOfDayIso(now())
      const rewardable =
        solver.author !== doubt.author &&
        (await doubts.solvedBetweenSince(doubt.author, solver.author, today)) === 0 &&
        (await xp.countSince(solver.author, XP_KIND.DOUBT_SOLVED, today)) < MAX_SOLVED_XP_PER_DAY

      await doubts.setSolved(doubtId, solver.id, iso(now()))

      if (rewardable) {
        await xp.award(solver.author, XP_KIND.DOUBT_SOLVED, ref)
      }
    },

    /** Quita el post-it. Solo quien lo puso, o quien modera. */
    async remove(actor: Actor, doubtId: number): Promise<void> {
      const doubt = await mustGet(doubtId, actor)

      if (doubt.author !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien puso la duda puede quitarla')
      }

      await doubts.remove(doubtId)
    },

    /** Reescribe la guía. Solo especialistas del proyecto. */
    async saveGuide(actor: Actor, projectId: number, input: unknown): Promise<GuideRow> {
      const guide = parse(guideSchema, input)
      await mustKnowProject(projectId)
      await mustBeSpecialist(actor, projectId)
      // Quien no puede validar cambios tampoco puede colarlos editando a mano.
      await mustNotBeBlocked(actor.login, 'validator')

      await doubts.saveGuide(actor.campusId, projectId, guide, actor.login)

      return doubts.guide(actor.campusId, projectId)
    },

    /** Propone una línea nueva para la guía. Cualquiera. */
    async propose(actor: Actor, projectId: number, input: unknown): Promise<void> {
      const proposal = parse(proposalSchema, input)
      await mustKnowProject(projectId)
      await mustNotBeBlocked(actor.login, 'proposer')

      if ((await doubts.proposals(actor.campusId, projectId)).length >= 30) {
        throw domainError('conflict', 'Hay muchas propuestas pendientes de revisar')
      }

      await doubts.addProposal({
        ...proposal,
        campusId: actor.campusId,
        projectId,
        author: actor.login,
      })
    },

    /**
     * Valida o rechaza una propuesta. Solo especialistas del proyecto, y nunca
     * la propia.
     *
     * - **Validar** añade la línea a la guía y da XP a quien la propuso y a
     *   quien la valida. Queda apuntado quién hizo cada cosa, porque el cambio
     *   se puede señalar después (`flagChange`).
     * - **Rechazar** es una falta para quien la propuso: a la tercera, un mes sin
     *   proponer.
     *
     * Contra el reparto de XP entre dos: la misma pareja solo puntúa una vez
     * por semana, y cada persona tiene un tope diario de validaciones con XP.
     */
    async reviewProposal(actor: Actor, proposalId: number, accept: boolean): Promise<void> {
      const proposal = await doubts.proposal(proposalId)

      if (proposal?.campusId !== actor.campusId) {
        throw domainError('not_found', 'Esa propuesta no existe')
      }

      await mustBeSpecialist(actor, proposal.projectId)

      if (proposal.author === actor.login) {
        throw domainError('forbidden', 'Un cambio tuyo lo tiene que validar otra persona')
      }

      await mustNotBeBlocked(actor.login, 'validator')

      const at = iso(now())

      if (!accept) {
        await changes.addStrike(proposal.author, 'proposer', at)
        await doubts.removeProposal(proposalId)
        return
      }

      const guide = await doubts.guide(proposal.campusId, proposal.projectId)
      const section = guide[proposal.section]

      // Si la línea ya estaba, no hay cambio que apuntar ni XP que repartir.
      if (!section.includes(proposal.body)) {
        await doubts.saveGuide(
          proposal.campusId,
          proposal.projectId,
          { ...guide, [proposal.section]: [...section, proposal.body] },
          actor.login,
        )

        const rewarded =
          !(await changes.pairRewardedSince(
            proposal.author,
            actor.login,
            iso(now() - PAIR_COOLDOWN_DAYS * DAY),
          )) &&
          (await xp.countSince(actor.login, XP_KIND.GUIDE_REVIEW, startOfDayIso(now()))) <
            MAX_REVIEW_XP_PER_DAY
        const changeId = await changes.add({
          campusId: proposal.campusId,
          projectId: proposal.projectId,
          section: proposal.section,
          body: proposal.body,
          proposer: proposal.author,
          validator: actor.login,
          rewarded,
          at,
        })

        if (rewarded) {
          await xp.award(proposal.author, XP_KIND.GUIDE_PROPOSAL, `change:${changeId}`)
          await xp.award(actor.login, XP_KIND.GUIDE_REVIEW, `change:${changeId}`)
        }
      }

      await doubts.removeProposal(proposalId)
    },

    /**
     * Señala un cambio ya validado como desacertado.
     *
     * Puede hacerlo quien aprobó el proyecto y no tuvo que ver con el cambio,
     * durante un mes. Con dos señales de personas distintas el cambio se
     * **retira**: la línea sale de la guía, quien la propuso y quien la validó
     * pierden la XP que ganaron, y a cada cual se le apunta una falta. Tres
     * faltas son un mes sin proponer o sin validar.
     *
     * Hacen falta dos personas para que nadie pueda tumbar a otra por su cuenta.
     *
     * @returns `true` si con esta señal el cambio se ha retirado.
     */
    async flagChange(actor: Actor, changeId: number): Promise<boolean> {
      const change = await changes.get(changeId)

      if (change?.campusId !== actor.campusId || change.revokedAt !== null) {
        throw domainError('not_found', 'Ese cambio no existe')
      }

      await mustBeSpecialist(actor, change.projectId)

      if (change.proposer === actor.login || change.validator === actor.login) {
        throw domainError('forbidden', 'No puedes señalar un cambio en el que has participado')
      }
      if (Date.parse(change.acceptedAt) + FLAG_WINDOW_DAYS * DAY < now()) {
        throw domainError('conflict', 'Ese cambio lleva ya demasiado tiempo en la guía')
      }

      const at = iso(now())
      const flags = await changes.flag(changeId, actor.login, at)

      if (flags === undefined) {
        throw domainError('conflict', 'Ya habías señalado ese cambio')
      }
      if (flags < FLAGS_TO_REVOKE) {
        return false
      }

      const guide = await doubts.guide(change.campusId, change.projectId)

      await doubts.saveGuide(
        change.campusId,
        change.projectId,
        {
          ...guide,
          [change.section]: guide[change.section].filter((line) => line !== change.body),
        },
        actor.login,
      )
      await changes.revoke(changeId, at)
      await xp.revoke(change.proposer, XP_KIND.GUIDE_PROPOSAL, `change:${changeId}`)
      await xp.revoke(change.validator, XP_KIND.GUIDE_REVIEW, `change:${changeId}`)
      await changes.addStrike(change.proposer, 'proposer', at)
      await changes.addStrike(change.validator, 'validator', at)

      return true
    },
  }
}

export type DoubtsService = ReturnType<typeof createDoubtsService>
