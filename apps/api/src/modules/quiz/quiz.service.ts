/**
 * Not-games: salas de preguntas de programación y la partida que se juega en
 * ellas.
 *
 * El servidor lleva el reloj y corrige: la partida avanza cada vez que alguien
 * la mira o contesta (`advance`), sin temporizadores. Una pregunta se cierra
 * al acabarse su tiempo o cuando han contestado todos; entonces se enseña la
 * respuesta unos segundos y empieza la siguiente. La web nunca recibe la buena
 * antes de que se cierre la pregunta, y cada persona ve las respuestas en un
 * orden distinto.
 */

import type {
  QuizLobby,
  QuizReviewItem,
  QuizPlayer,
  QuizQuestion,
  QuizRoom,
  QuizSettings,
  QuizTeam,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { domainError } from '../../core/errors.js'
import { createLocks } from '../../core/lock.js'
import { parse } from '../../core/validation.js'
import type { Concept, ReviewEntry } from './bank/types.js'
import type { PlayerRow, QuizRepository, RoomRow, RoundRow } from './quiz.repository.js'
import { localizeRound, localizeText, reviewIn } from './bank/localize.js'
import { buildRound, levelOf, LIVES, orderFor, pickConcepts, pointsFor } from './quiz.rules.js'
import { isoAt } from '../../core/time.js'

type QuizServiceOptions = {
  quiz: QuizRepository
  bank: readonly Concept[]
  /** Definición y ejemplo de cada concepto, para el Repaso. */
  review?: Readonly<Record<string, ReviewEntry>>
  /** El círculo en que va cada persona (para el mínimo de una sala). */
  circlesOf: (logins: readonly string[]) => Promise<Map<string, number>>
  /** Si alguien está ya en una partida por turnos (ajedrez…): no se juegan dos a la vez. */
  busyElsewhere?: (login: string) => Promise<boolean>
  /** Las fotos de 42, para el marcador. */
  imagesOf?: (logins: readonly string[]) => Promise<Map<string, string | null>>
  now?: () => number
  random?: () => number
}

/** Cuenta atrás antes de la primera pregunta: que salga a la vez para todos. */
export const COUNTDOWN_MS = 3_000
/** Lo que se enseña la respuesta antes de la siguiente pregunta. */
export const REVEAL_MS = 4_000
/** Margen para respuestas que llegan justo al cerrarse: la red tarda. */
const GRACE_MS = 1_000
const MAX_PLAYERS = 20
/** Menos preguntas que estas no da para una partida. */
const MIN_QUESTIONS = 3
/** Una sala sin empezar se borra pasado este tiempo; una jugada, a la semana. */
const LOBBY_TTL_MS = 2 * 3_600_000
const DONE_TTL_MS = 7 * 24 * 3_600_000

const settingsSchema = z
  .object({
    mode: z.enum(['duel', 'teams', 'ffa', 'survival']),
    competitive: z.boolean().default(false),
    pool: z.enum(['common', 'general']).default('common'),
    kinds: z.enum(['quick', 'long', 'mixed']).default('mixed'),
    difficulty: z.enum(['easy', 'medium', 'hard', 'rising']).default('rising'),
    questions: z.number().int().min(5).max(60).default(10),
    minCircle: z.number().int().min(0).max(6).nullable().default(null),
  })
  .transform((settings) => ({
    ...settings,
    // En supervivencia se pierden vidas: no hay puntos que restar.
    competitive: settings.mode === 'survival' ? false : settings.competitive,
    questions: settings.mode === 'survival' ? settings.questions : Math.min(30, settings.questions),
  }))

const joinSchema = z.object({ team: z.enum(['a', 'b']).nullable().optional() })
const answerSchema = z.object({
  question: z.number().int().min(0),
  option: z.number().int().min(0).max(9),
})

export function createQuizService(options: QuizServiceOptions) {
  const { quiz, bank } = options
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random

  /** Una cosa cada vez por sala: que dos peticiones no cierren la misma pregunta. */
  const locked = createLocks()

  async function mustRoom(id: number): Promise<RoomRow> {
    const room = await quiz.room(id)

    if (room === null) throw domainError('not_found', 'Esa sala ya no existe')

    return room
  }

  /** Termina la partida y guarda el resultado de cada cual para las estadísticas. */
  async function finish(room: RoomRow, t: number): Promise<RoomRow> {
    const done: RoomRow = { ...room, phase: null, phaseUntil: null, status: 'done' }

    await quiz.setPhase(room.id, { phase: null, until: null, status: 'done', finishedAt: isoAt(t) })

    const players = await quiz.players(room.id)
    const winners = winnersOf(done, players)

    await quiz.record(
      'quiz',
      room.settings.mode,
      room.id,
      room.campusId,
      players.map((p) => ({
        login: p.login,
        won: winners.includes(p.login) || (p.team !== null && winners.includes(p.team)),
        correct: p.correct,
        wrong: p.wrong,
        score: p.score,
      })),
      isoAt(t),
    )

    return done
  }

  /** Hace avanzar la partida hasta donde toque ahora. */
  async function advance(start: RoomRow): Promise<RoomRow> {
    let room = start

    // Si nadie miró en mucho rato, puede haber varias preguntas que cerrar seguidas.
    for (let guard = 0; guard < 200 && room.status === 'playing'; guard++) {
      const t = now()

      if (room.phase === 'question') {
        const round = await quiz.round(room.id, room.round)

        if (round?.endsAt === undefined || round.endsAt === null) return room

        const players = (await quiz.players(room.id)).filter((player) => !player.out)
        const answers = await quiz.answers(room.id, room.round)
        const everyone = players.every((player) => answers.some((a) => a.login === player.login))
        const deadline = round.endsAt + GRACE_MS

        if (!everyone && t < deadline) return room

        // Se cierra: quien no contestó, en supervivencia, pierde una vida.
        for (const player of players) {
          if (answers.some((a) => a.login === player.login)) continue
          if (room.settings.mode === 'survival') {
            const lives = Math.max(0, (player.lives ?? LIVES) - 1)

            await quiz.penalize(room.id, player.login, lives, lives === 0)
          }
        }
        await quiz.count(
          round.conceptId,
          players.length,
          players.length - answers.filter((a) => a.correct).length,
        )

        const until = (everyone ? Math.min(t, deadline) : deadline) + REVEAL_MS

        await quiz.setPhase(room.id, { phase: 'reveal', until })
        room = { ...room, phase: 'reveal', phaseUntil: until }
        continue
      }

      if (room.phase === 'reveal') {
        if (room.phaseUntil !== null && t < room.phaseUntil) return room

        const players = await quiz.players(room.id)
        const alive = players.filter((player) => !player.out)
        const total = await quiz.rounds(room.id)
        const over =
          room.round + 1 >= total ||
          alive.length === 0 ||
          (room.settings.mode === 'survival' && players.length > 1 && alive.length <= 1)

        if (over) return finish(room, t)

        const next = room.round + 1
        const round = await quiz.round(room.id, next)
        const startsAt = room.phaseUntil ?? t
        const endsAt = startsAt + (round?.seconds ?? 10) * 1000

        await quiz.setRoundTimes(room.id, next, startsAt, endsAt)
        await quiz.setPhase(room.id, { round: next, phase: 'question', until: endsAt })
        room = { ...room, round: next, phase: 'question', phaseUntil: endsAt }
        continue
      }

      return room
    }

    return room
  }

  /** Quién gana: logins, o los equipos (`a`, `b`). Empate: todos los empatados. */
  function winnersOf(room: RoomRow, players: readonly PlayerRow[]): string[] {
    if (room.status !== 'done' || players.length === 0) return []

    if (room.settings.mode === 'teams') {
      const sum = (team: QuizTeam): number =>
        players.filter((p) => p.team === team).reduce((total, p) => total + p.score, 0)
      const a = sum('a')
      const b = sum('b')

      return a === b ? ['a', 'b'] : [a > b ? 'a' : 'b']
    }

    // Supervivencia: quien más vidas conserva; después, quien más acierta y más rápido.
    const key = (p: PlayerRow): [number, number, number] =>
      room.settings.mode === 'survival'
        ? [p.lives ?? 0, p.correct, -p.ms]
        : [p.score, p.correct, -p.ms]
    const ranked = [...players].sort((x, y) => {
      const [a, b] = [key(x), key(y)]

      return b[0] - a[0] || b[1] - a[1] || b[2] - a[2]
    })
    const best = ranked[0]

    if (best === undefined) return []

    return ranked
      .filter((p) => key(p).every((value, index) => value === key(best)[index]))
      .map((p) => p.login)
  }

  /** Si alguien puede entrar en una sala, y si no, por qué. */
  async function canJoin(
    actor: Actor,
    room: RoomRow,
    players: readonly PlayerRow[],
  ): Promise<string | null> {
    if (players.some((p) => p.login === actor.login)) return null
    if (room.status !== 'lobby') return 'La partida ya ha empezado'
    if (room.campusId !== actor.campusId) return 'Esa sala es de otro campus'

    const limit = room.settings.mode === 'duel' ? 2 : MAX_PLAYERS

    if (players.length >= limit) return 'La sala está llena'

    const minCircle = room.settings.minCircle

    if (minCircle !== null && minCircle > 0) {
      const circle = (await options.circlesOf([actor.login])).get(actor.login) ?? 0

      if (circle < minCircle) return `Para entrar hace falta ir por el círculo ${minCircle} o más`
    }

    return null
  }

  /**
   * Una sala se mira si es del campus de quien pregunta o si juega en ella:
   * los ids van seguidos y, sin esto, cualquiera vería las partidas de otro
   * campus (quién juega, quién ha contestado). Si no, como si no existiera.
   */
  async function assertCanSee(actor: Actor, room: { id: number; campusId: number }): Promise<void> {
    if (room.campusId === actor.campusId) return
    if ((await quiz.players(room.id)).map((p) => p.login).some((login) => login === actor.login))
      return

    throw domainError('not_found', 'Esa sala no existe')
  }

  async function viewOf(actor: Actor, start: RoomRow): Promise<QuizRoom> {
    const room = await advance(start)
    const players = await quiz.players(room.id)
    const round = room.status === 'lobby' ? null : await quiz.round(room.id, room.round)
    const answers = round === null ? [] : await quiz.answers(room.id, room.round)
    const whyNot = await canJoin(actor, room, players)
    const images =
      (await options.imagesOf?.(players.map((p) => p.login))) ?? new Map<string, string | null>()
    const t = now()

    const playerView = (p: PlayerRow): QuizPlayer => ({
      login: p.login,
      image: images.get(p.login) ?? null,
      team: p.team,
      score: p.score,
      correct: p.correct,
      wrong: p.wrong,
      lives: room.settings.mode === 'survival' ? (p.lives ?? LIVES) : null,
      out: p.out,
      answered: room.phase === 'question' && answers.some((a) => a.login === p.login),
    })

    return {
      id: room.id,
      host: room.host,
      settings: room.settings,
      status: room.status,
      phase: room.phase,
      players: players.map(playerView),
      question:
        round === null || room.status === 'done'
          ? null
          : questionView(actor, room, round, answers, players, await quiz.rounds(room.id), t),
      now: isoAt(t),
      winners: winnersOf(room, players),
      joinable: whyNot === null,
      whyNot,
    }
  }

  function questionView(
    actor: Actor,
    room: RoomRow,
    stored: RoundRow,
    answers: Awaited<ReturnType<QuizRepository['answers']>>,
    players: readonly PlayerRow[],
    total: number,
    t: number,
  ): QuizQuestion {
    const round = localizeRound(stored, actor.lang ?? 'es')
    const startsAt = round.startsAt ?? t
    const waiting = t < startsAt
    const reveal = room.phase === 'reveal'
    const order = orderFor(`${room.id}:${round.index}:${actor.login}`, round.options.length)

    return {
      index: round.index,
      total,
      kind: round.kind,
      level: round.level,
      prompt: waiting ? '' : round.prompt,
      code: waiting ? null : round.code,
      options: waiting ? [] : order.map((id) => ({ id, text: round.options[id] ?? '' })),
      startsAt: isoAt(startsAt),
      endsAt: isoAt(round.endsAt ?? t),
      mine: answers.find((a) => a.login === actor.login)?.option ?? null,
      answer: reveal ? round.answer : null,
      why: reveal ? round.why : null,
      results: reveal
        ? players
            .filter((p) => !p.out || answers.some((a) => a.login === p.login))
            .map((p) => ({
              login: p.login,
              correct: answers.find((a) => a.login === p.login)?.correct ?? null,
            }))
        : null,
    }
  }

  /** Que nadie esté en dos salas a la vez: bastante tiene con una partida. */
  async function mustBeFree(login: string, except: number | null = null): Promise<void> {
    const open = (await quiz.openRoomsOf(login)).filter((id) => id !== except)

    if (open.length > 0 || ((await options.busyElsewhere?.(login)) ?? false)) {
      throw domainError(
        'conflict',
        'Ya estás en otra sala: sal de ella antes de entrar en una nueva',
      )
    }
  }

  return {
    /** Las salas abiertas del campus y las tuyas de las últimas horas. */
    async list(actor: Actor): Promise<QuizLobby[]> {
      const rows = await quiz.rooms(actor.campusId, actor.login, isoAt(now() - 6 * 3_600_000))

      return rows.map((room) => ({
        id: room.id,
        host: room.host,
        settings: room.settings,
        status: room.status,
        players: room.players,
        joined: room.joined,
      }))
    },

    async create(actor: Actor, input: unknown): Promise<QuizRoom> {
      const settings: QuizSettings = parse(settingsSchema, input)

      await mustBeFree(actor.login)

      const id = await quiz.createRoom(actor.campusId, actor.login, settings, isoAt(now()))

      await quiz.join(id, actor.login, settings.mode === 'teams' ? 'a' : null, isoAt(now()))

      return viewOf(actor, await mustRoom(id))
    },

    async view(actor: Actor, id: number): Promise<QuizRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)

        await assertCanSee(actor, room)

        return viewOf(actor, room)
      })
    },

    /** Entra (o cambia de equipo, si ya estaba y aún no ha empezado). */
    async join(actor: Actor, id: number, input: unknown): Promise<QuizRoom> {
      const { team } = parse(joinSchema, input ?? {})

      return locked(id, async () => {
        const room = await mustRoom(id)
        const players = await quiz.players(id)
        const whyNot = await canJoin(actor, room, players)

        if (whyNot !== null) throw domainError('conflict', whyNot)

        const inside = players.some((p) => p.login === actor.login)

        if (inside && room.status !== 'lobby') return viewOf(actor, room)
        if (!inside) await mustBeFree(actor.login, id)

        const chosen: QuizTeam | null =
          room.settings.mode !== 'teams'
            ? null
            : (team ??
              (players.filter((p) => p.team === 'a').length <=
              players.filter((p) => p.team === 'b').length
                ? 'a'
                : 'b'))

        await quiz.join(id, actor.login, chosen, isoAt(now()))

        return viewOf(actor, room)
      })
    },

    /**
     * Sale de la sala, esté como esté: sin empezar, jugando o acabada. Si se va
     * quien la creó, la sala pasa a quien entró después; si no queda nadie, la
     * sala se borra. Jugando, si ya no hay con quién jugar (un duelo o una
     * supervivencia con una sola persona, un equipo vacío), la partida acaba.
     */
    async leave(actor: Actor, id: number): Promise<void> {
      await locked(id, async () => {
        const room = await advance(await mustRoom(id))
        const players = await quiz.players(id)

        if (!players.some((p) => p.login === actor.login)) return

        await quiz.remove(id, actor.login)

        const rest = players.filter((p) => p.login !== actor.login)

        if (rest.length === 0) {
          await quiz.drop(id)

          return
        }
        if (room.host === actor.login && rest[0] !== undefined)
          await quiz.setHost(id, rest[0].login)
        if (room.status !== 'playing') return

        const { mode } = room.settings
        const alive = rest.filter((p) => !p.out)
        const alone =
          alive.length === 0 ||
          ((mode === 'duel' || mode === 'survival') && alive.length < 2) ||
          (mode === 'teams' &&
            !(['a', 'b'] as const).every((team) => alive.some((p) => p.team === team)))

        if (alone) await finish(room, now())
      })
    },

    /** Empieza la partida. Solo quien creó la sala, y con la gente que pide el modo. */
    async start(actor: Actor, id: number): Promise<QuizRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)

        if (room.host !== actor.login)
          throw domainError('forbidden', 'Solo quien creó la sala puede empezar')
        if (room.status !== 'lobby') throw domainError('conflict', 'La partida ya ha empezado')

        const players = await quiz.players(id)
        const { mode } = room.settings
        const teamSize = (team: QuizTeam): number => players.filter((p) => p.team === team).length

        if (mode === 'duel' && players.length !== 2) {
          throw domainError('conflict', 'Un duelo es de dos personas')
        }
        if (mode === 'teams' && (teamSize('a') === 0 || teamSize('b') === 0)) {
          throw domainError('conflict', 'Hace falta al menos una persona en cada equipo')
        }
        if (mode === 'survival' && players.length < 2) {
          throw domainError('conflict', 'La supervivencia es de dos personas o más')
        }

        const slugs = await quiz.slugsOf(players.map((p) => p.login))
        const stats = await quiz.stats()
        const levels = new Map(
          bank.map((concept) => {
            const seen = stats.get(concept.id)

            return [concept.id, levelOf(concept.level, seen?.shown ?? 0, seen?.wrong ?? 0)]
          }),
        )
        const concepts = pickConcepts(
          bank,
          players.map((p) => ({ slugs: slugs.get(p.login) ?? new Set<string>() })),
          { ...room.settings, levels, count: room.settings.questions },
          random,
        )

        if (concepts.length < MIN_QUESTIONS) {
          throw domainError(
            'conflict',
            'No hay preguntas suficientes que os valgan a todos: probad solo con lo general',
          )
        }

        const t = now()
        const rounds: RoundRow[] = concepts.map((concept, index) => {
          const round = buildRound(concept, random)
          const startsAt = index === 0 ? t + COUNTDOWN_MS : null

          return {
            ...round,
            index,
            level: levels.get(concept.id) ?? concept.level,
            startsAt,
            endsAt: startsAt === null ? null : startsAt + round.seconds * 1000,
          }
        })
        const first = rounds[0]

        await quiz.start(
          id,
          rounds,
          mode === 'survival' ? LIVES : null,
          first?.endsAt ?? t,
          isoAt(t),
        )

        return viewOf(actor, await mustRoom(id))
      })
    },

    async answer(actor: Actor, id: number, input: unknown): Promise<QuizRoom> {
      const { question, option } = parse(answerSchema, input)

      return locked(id, async () => {
        const room = await advance(await mustRoom(id))
        const t = now()

        if (room.status !== 'playing' || room.phase !== 'question' || room.round !== question) {
          throw domainError('conflict', 'Esa pregunta ya se ha cerrado')
        }

        const round = await quiz.round(id, question)
        const me = (await quiz.players(id)).find((p) => p.login === actor.login)

        if (me === undefined || me.out)
          throw domainError('forbidden', 'No estás jugando en esta sala')
        if (round?.startsAt === undefined || round.startsAt === null || t < round.startsAt) {
          throw domainError('conflict', 'La pregunta aún no ha empezado')
        }
        if (option >= round.options.length)
          throw domainError('invalid_input', 'Esa respuesta no existe')

        const correct = option === round.answer
        const lives =
          room.settings.mode === 'survival'
            ? Math.max(0, (me.lives ?? LIVES) - (correct ? 0 : 1))
            : me.lives

        await quiz.remember(actor.login, round.conceptId, correct, isoAt(t))
        await quiz.answer(
          id,
          question,
          actor.login,
          { login: actor.login, option, correct, ms: t - round.startsAt },
          { points: pointsFor(correct, room.settings.competitive), lives, out: lives === 0 },
        )

        return viewOf(actor, room)
      })
    },

    /**
     * El Repaso de quien pregunta: lo que ha fallado, con qué es y un ejemplo.
     * Primero lo que aún no ha acertado después, y lo más reciente antes.
     */
    async review(actor: Actor): Promise<QuizReviewItem[]> {
      const concepts = new Map(bank.map((concept) => [concept.id, concept]))
      const items: QuizReviewItem[] = []

      for (const miss of await quiz.misses(actor.login)) {
        const concept = concepts.get(miss.conceptId)
        const lang = actor.lang ?? 'es'
        const entry = reviewIn(miss.conceptId, lang, options.review)

        // Un concepto que ya no está en el banco no se puede repasar.
        if (concept === undefined || entry === undefined) continue

        items.push({
          conceptId: concept.id,
          topic: concept.topic,
          ...entry,
          why: localizeText(concept.id, concept.why, lang),
          question: localizeText(concept.id, concept.forms[0]?.ask[0] ?? '', lang),
          misses: miss.misses,
          lastMissedAt: miss.lastMissedAt,
          mastered: miss.lastRightAt !== null && miss.lastRightAt >= miss.lastMissedAt,
        })
      }

      return items.sort((a, b) => Number(a.mastered) - Number(b.mastered))
    },

    /** Borra las salas que nadie empezó y las partidas de hace más de una semana. */
    async prune(): Promise<number> {
      const t = now()

      return quiz.prune(isoAt(t - LOBBY_TTL_MS), isoAt(t - DONE_TTL_MS))
    },
  }
}

export type QuizService = ReturnType<typeof createQuizService>
