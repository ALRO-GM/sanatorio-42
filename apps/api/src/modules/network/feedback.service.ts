/**
 * Valoración de las correcciones de 42 (#91 del buzón).
 *
 * Al poco de una corrección, la web pregunta a las dos partes, igual que tras
 * una sesión de ayuda reservada:
 *
 * - Quien fue corregido dice qué tal entiende el problema ahora. Se pregunta eso
 *   y no «¿qué tal te corrigió?» para que la respuesta sea realista. Si quiere,
 *   deja además una reacción a quien le corrigió, que cuenta en sus
 *   «Reacciones recibidas».
 * - Quien corrigió dice cómo llegó la otra persona, con las etiquetas de la
 *   ayuda reservada. Cuenta en su «Cómo llegas cuando pides ayuda».
 *
 * Quien corrigió ve qué tal entendió la gente a la que corrigió, solo en total y
 * solo cuando hay respuestas de sobra para no saber de quién es cada una.
 *
 * Las correcciones salen de la copia de `corrections`, que solo guarda las que
 * ya tienen nota (las hechas) y se pone al día cada diez minutos. La agenda de
 * 42 no sirve: solo se pide al abrir el calendario y no dice con quién es la
 * corrección hasta que llega la hora.
 */

import type {
  CorrectionPrompt,
  CorrectionUnderstanding,
  CorrectionUnderstood,
  ReactionKind,
  RequesterTag,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'
import type { FeedbackRepository, FeedbackRole, RecentCorrection } from './feedback.repository.js'
import { isAnonymised } from './network.analysis.js'

type FeedbackServiceOptions = {
  feedback: FeedbackRepository
  replica: ReplicaRepository
  /** Campus de los que se copian las correcciones. */
  campusIds: readonly number[]
  now?: () => number
}

const HOUR = 60 * 60_000

/** Solo se pregunta por las correcciones que empezaron hace menos de esto. */
const FEEDBACK_WINDOW_MS = 7 * 24 * HOUR

/** Tras «Ahora no», cuánto se tarda en volver a preguntar. */
const SNOOZE_MS = 6 * HOUR

/** Veces que se vuelve a preguntar tras «Ahora no». Después, ya no. */
const ASK_AGAIN = 2

/**
 * Respuestas que tiene que haber para enseñar las cuentas a quien corrigió.
 * Con menos, sabría de quién es cada una por cuándo apareció.
 */
const MIN_ANSWERS = 3

const UNDERSTANDINGS = [
  'perfect',
  'enough',
  'better',
  'same',
] as const satisfies CorrectionUnderstanding[]
const REACTIONS = ['bug', 'code', 'concept', 'patient'] as const satisfies ReactionKind[]
const REQUESTER_TAGS = [
  'prepared',
  'curious',
  'autonomous',
  'basics',
] as const satisfies RequesterTag[]

const correctedSchema = z.object({
  understanding: z.enum(UNDERSTANDINGS),
  reaction: z.enum(REACTIONS).nullish(),
})
const correctorSchema = z.object({ tag: z.enum(REQUESTER_TAGS) })
const skipSchema = z.object({ forever: z.boolean() })

/** Lo que hay que preguntar, aún sin fotos ni nombres de proyecto. */
type Due = Omit<CorrectionPrompt, 'peers' | 'projectName'> & { peers: string[] }

export function createFeedbackService(options: FeedbackServiceOptions) {
  const { feedback, replica, campusIds } = options
  const now = options.now ?? Date.now
  const iso = (at: number): string => new Date(at).toISOString()

  /** `true` si la corrección empezó dentro de la ventana y no es del futuro. */
  const recent = (beginAt: string): boolean => {
    const begin = Date.parse(beginAt)

    return begin >= now() - FEEDBACK_WINDOW_MS && begin <= now()
  }

  /** Desde qué lado está alguien en una corrección, o `null` si no estuvo. */
  const roleIn = (rows: readonly RecentCorrection[], login: string): FeedbackRole | null =>
    rows.some((row) => row.corrected === login)
      ? 'corrected'
      : rows.some((row) => row.corrector === login)
        ? 'corrector'
        : null

  /** Lo que toca preguntar a alguien, la corrección más reciente primero. */
  async function due(actor: Actor): Promise<Due[]> {
    const rows = await feedback.recentOf(
      actor.login,
      campusIds,
      iso(now() - FEEDBACK_WINDOW_MS),
      iso(now()),
    )
    const byId = new Map<number, RecentCorrection[]>()

    for (const row of rows) {
      byId.set(row.id, [...(byId.get(row.id) ?? []), row])
    }

    const states = await feedback.statesOf(actor.login, [...byId.keys()])
    const list: Due[] = []

    for (const [id, team] of byId) {
      const state = states.get(id)
      const role = roleIn(team, actor.login)
      const first = team[0]

      if (
        first === undefined ||
        role === null ||
        (state !== undefined &&
          (state.answered ||
            state.dismissed ||
            state.postponed > ASK_AGAIN ||
            (state.snoozedUntil !== null && Date.parse(state.snoozedUntil) > now())))
      ) {
        continue
      }

      // Una cuenta anonimizada por 42 no tiene a nadie detrás a quien valorar.
      const peers = (
        role === 'corrected' ? [first.corrector] : team.map((row) => row.corrected)
      ).filter((login) => !isAnonymised(login))

      if (peers.length > 0) {
        list.push({ id, role, peers, projectId: first.projectId, beginAt: first.beginAt })
      }
    }

    return list
  }

  /** La corrección y el lado de quien la valora, o un error que explica por qué no puede. */
  async function mine(actor: Actor, id: number): Promise<FeedbackRole> {
    const rows = await feedback.correction(id)
    const role = roleIn(rows, actor.login)

    if (role === null) {
      throw domainError('not_found', 'No conocemos esa corrección tuya')
    }
    if (!recent(rows[0]?.beginAt ?? '')) {
      throw domainError('conflict', 'Esa corrección ya no se puede valorar')
    }

    return role
  }

  /** `true` si ya contestó. */
  const answered = async (actor: Actor, id: number): Promise<boolean> =>
    (await feedback.statesOf(actor.login, [id])).get(id)?.answered === true

  return {
    /** Cuántas correcciones toca valorar: lo pregunta el pulso. */
    async pendingCount(actor: Actor): Promise<number> {
      return (await due(actor)).length
    },

    /** Las correcciones recientes que toca valorar, con fotos y nombre del proyecto. */
    async pending(actor: Actor): Promise<CorrectionPrompt[]> {
      const list = await due(actor)
      const [images, names] = await Promise.all([
        replica.imagesOf(list.flatMap((item) => item.peers)),
        replica.projectNames(list.flatMap((item) => item.projectId ?? [])),
      ])

      return list.map((item) => ({
        ...item,
        peers: item.peers.map((login) => ({ login, image: images.get(login) ?? null })),
        projectName: item.projectId === null ? null : (names.get(item.projectId) ?? null),
      }))
    },

    /**
     * Valora una corrección. Una sola vez por corrección y persona: lo que se
     * contesta no se cambia.
     */
    async rate(actor: Actor, id: number, input: unknown): Promise<void> {
      const role = await mine(actor, id)
      let understanding: CorrectionUnderstanding | null = null
      let tag: string | null

      if (role === 'corrected') {
        const answer = parse(correctedSchema, input)

        understanding = answer.understanding
        tag = answer.reaction ?? null
      } else {
        tag = parse(correctorSchema, input).tag
      }

      if (!(await feedback.answer(id, actor.login, role, understanding, tag, iso(now())))) {
        throw domainError('conflict', 'Ya habías valorado esa corrección')
      }
    },

    /**
     * «Ahora no» (`forever: false`): se vuelve a preguntar más tarde, como mucho
     * `ASK_AGAIN` veces. «No volver a preguntar» (`forever: true`): nunca más.
     */
    async skip(actor: Actor, id: number, input: unknown): Promise<void> {
      const { forever } = parse(skipSchema, input)
      const role = await mine(actor, id)

      if (await answered(actor, id)) {
        throw domainError('conflict', 'Ya habías valorado esa corrección')
      }

      await (forever
        ? feedback.dismiss(id, actor.login, role)
        : feedback.postpone(id, actor.login, role, iso(now() + SNOOZE_MS)))
    },

    /** Qué tal entendieron el problema, en total, las personas a las que corregiste. */
    async understood(actor: Actor): Promise<CorrectionUnderstood> {
      const counts = await feedback.tally('understanding', actor.login)
      const answers = Object.fromEntries(
        UNDERSTANDINGS.map((answer) => [answer, counts.get(answer) ?? 0]),
      ) as Record<CorrectionUnderstanding, number>
      const total = Object.values(answers).reduce((sum, count) => sum + count, 0)

      return { total, answers: total < MIN_ANSWERS ? null : answers }
    },

    /** Reacciones que ha recibido alguien de la gente a la que corrigió, por tipo. */
    reactionsTo: (login: string): Promise<Map<string, number>> =>
      feedback.tally('reactions', login),

    /** Cómo llegó alguien a sus correcciones, según quien le corrigió, por etiqueta. */
    tagsTo: (login: string): Promise<Map<string, number>> => feedback.tally('tags', login),
  }
}

export type FeedbackService = ReturnType<typeof createFeedbackService>
