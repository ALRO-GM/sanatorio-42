/**
 * El motor de los juegos por turnos con pregunta: salas, bandos, relojes,
 * preguntas entre jugada y jugada y final. Cada juego (ajedrez y los que
 * vengan) entra como un `TurnGame`: su tablero, sus jugadas y su final. La
 * mecánica de la pregunta está en `../turns.rules.ts`.
 *
 * Como las salas de preguntas, el servidor lleva el reloj: la partida avanza
 * cada vez que alguien la mira, mueve o contesta (`advance`), sin
 * temporizadores, y la web nunca ve la buena antes de tiempo.
 */

import type {
  TurnEnd,
  TurnGameKind,
  TurnLastQuestion,
  TurnLobby,
  TurnPlayer,
  TurnQuestionView,
  TurnRoom,
  TurnSettings,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../../core/actor.js'
import { domainError } from '../../../core/errors.js'
import { createLocks } from '../../../core/lock.js'
import { parse } from '../../../core/validation.js'
import type { Concept } from '../bank/index.js'
import type { QuizRepository } from '../quiz.repository.js'
import { buildRound, levelOf, localizeRound, orderFor, pickConcepts } from '../quiz.rules.js'
import type { Round } from '../quiz.rules.js'
import {
  afterMove,
  answerTurn,
  checkFlag,
  clocksAt,
  other,
  passTurn,
  reask,
  settleQuestion,
  startTurns,
  unanswered,
} from '../turns.rules.js'
import type { Side, TurnState } from '../turns.rules.js'
import type { TurnPlayerRow, TurnRoomRow, TurnsRepository } from './turns.repository.js'
import { isoAt } from '../../../core/time.js'

/** Lo que tiene que dar cada juego. `Board` es su tablero; `View`, cómo lo ve la web. */
export type TurnGame<Board, View> = {
  kind: TurnGameKind
  start: () => Board
  /** A quién le toca por orden. */
  natural: (board: Board) => Side
  /** Si `side` puede mover ahora en este tablero. */
  canMove: (board: Board, side: Side) => boolean
  /** Aplica la jugada (aún sin validar) de `side`, o `null` si no vale. */
  play: (board: Board, side: Side, move: unknown) => { board: Board; summary: string } | null
  /** A quién obliga el juego a mover ya, sin pregunta (en ajedrez, a quien está en jaque). */
  forced?: (board: Board) => Side | null
  /** Si la partida ha acabado tras mover `mover`. */
  outcome: (board: Board, mover: Side) => { winner: Side | null; reason: TurnEnd['reason'] } | null
  view: (board: Board) => View
}

/** La pregunta montada, con lo que hace falta para enseñarla y corregirla. */
type StoredRound = Round & { index: number }

export type TurnGameState<Board> = {
  board: Board
  turns: TurnState
  /** Conceptos de la partida, en orden; al acabarse, se vuelve a empezar. */
  deck: string[]
  next: number
  round: StoredRound | null
  lastRound: StoredRound | null
  counts: Record<Side, { correct: number; wrong: number }>
  end: TurnEnd | null
}

/** Margen para respuestas que llegan justo al cerrarse: la red tarda. */
const GRACE_MS = 1_000
/** Preguntas que se preparan por partida (se repiten si se acaban). */
const DECK = 80
const LOBBY_TTL_MS = 2 * 3_600_000
const DONE_TTL_MS = 7 * 24 * 3_600_000

const settingsSchema = z.object({
  game: z.enum(['chess']),
  minutes: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]).default(5),
  pool: z.enum(['common', 'general']).default('common'),
  kinds: z.enum(['quick', 'long', 'mixed']).default('quick'),
  minCircle: z.number().int().min(0).max(6).nullable().default(null),
})
const answerSchema = z.object({
  question: z.number().int().min(0),
  option: z.number().int().min(0).max(9),
})

type TurnsServiceOptions<Board, View> = {
  turns: TurnsRepository<TurnGameState<Board>>
  /** De las salas de preguntas: quién está ocupado, qué ha hecho cada cual y los resultados. */
  quiz: QuizRepository
  game: TurnGame<Board, View>
  bank: readonly Concept[]
  circlesOf: (logins: readonly string[]) => Promise<Map<string, number>>
  imagesOf?: (logins: readonly string[]) => Promise<Map<string, string | null>>
  now?: () => number
  random?: () => number
}

export function createTurnsService<Board, View>(options: TurnsServiceOptions<Board, View>) {
  const { turns, quiz, game, bank } = options
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random
  const concepts = new Map(bank.map((concept) => [concept.id, concept]))

  type Row = TurnRoomRow<TurnGameState<Board>>

  /** Una cosa cada vez por sala: que dos peticiones no cierren la misma pregunta. */
  const locked = createLocks()

  async function mustRoom(id: number): Promise<Row> {
    const room = await turns.room(id)

    if (room === null) throw domainError('not_found', 'Esa sala ya no existe')

    return room
  }

  /** Nadie juega dos partidas a la vez, ni de preguntas ni por turnos. */
  async function mustBeFree(login: string, except: number | null = null): Promise<void> {
    const busy =
      (await quiz.openRoomsOf(login)).length > 0 ||
      (await turns.openRoomsOf(login)).some((id) => id !== except)

    if (busy) {
      throw domainError(
        'conflict',
        'Ya estás en otra sala: sal de ella antes de entrar en una nueva',
      )
    }
  }

  /** La siguiente pregunta del mazo, ya montada. */
  function nextRound(state: TurnGameState<Board>, index: number): StoredRound {
    for (let tries = 0; tries < state.deck.length; tries++) {
      const id = state.deck[(state.next + tries) % state.deck.length]
      const concept = id === undefined ? undefined : concepts.get(id)

      if (concept !== undefined) {
        state.next = (state.next + tries + 1) % state.deck.length

        return { ...buildRound(concept, random), index }
      }
    }

    throw domainError('conflict', 'Esta partida se ha quedado sin preguntas')
  }

  /** Termina, guarda el resultado de cada bando y devuelve la sala acabada. */
  async function finish(
    room: Row,
    state: TurnGameState<Board>,
    end: TurnEnd,
    t: number,
  ): Promise<Row> {
    const done: TurnGameState<Board> = {
      ...state,
      turns: {
        ...state.turns,
        clocks: clocksAt(state.turns, t),
        mover: null,
        since: null,
        question: null,
      },
      round: null,
      end,
    }

    await turns.save(room.id, 'done', done, isoAt(t))

    const players = await turns.players(room.id)

    await quiz.record(
      room.game,
      'duel',
      room.id,
      room.campusId,
      players.map((p) => ({
        login: p.login,
        won: end.winner === p.side,
        correct: state.counts[p.side].correct,
        wrong: state.counts[p.side].wrong,
        // Victoria 2, tablas 1, derrota 0: que las tablas cuenten algo.
        score: end.winner === null ? 1 : end.winner === p.side ? 2 : 0,
      })),
      isoAt(t),
    )

    return { ...room, status: 'done', state: done }
  }

  /** Lleva la partida hasta ahora: relojes, y cerrar la pregunta si toca. */
  async function advance(start: Row): Promise<Row> {
    const state = start.state

    if (start.status !== 'playing' || state === null) return start

    const t = now()
    let next = checkFlag(state.turns, t)

    if (next.flagged !== null) {
      return finish(
        start,
        { ...state, turns: next },
        { winner: other(next.flagged), reason: 'time' },
        t,
      )
    }

    // Nadie ha contestado a tiempo: otra pregunta (y otra, si sigue sin haber
    // respuesta y ha pasado más tiempo), hasta el límite de las reglas.
    const work: TurnGameState<Board> = { ...state }
    let round = state.round
    let asked = false

    while (round !== null && unanswered(next, t, GRACE_MS)) {
      round = nextRound(work, round.index + 1)
      next = reask(next, round, GRACE_MS)
      asked = true
    }

    const settled = settleQuestion(next, t, (side) => game.canMove(state.board, side), GRACE_MS)

    if (settled === next && !asked) return start
    if (settled === next) {
      const saved: TurnGameState<Board> = { ...work, turns: next, round }

      await turns.save(start.id, 'playing', saved)

      return { ...start, state: saved }
    }

    next = settled

    const answers = settled.last?.answers ?? []

    if (round !== null && answers.length > 0) {
      await quiz.count(round.conceptId, answers.length, answers.filter((a) => !a.correct).length)
    }

    const saved: TurnGameState<Board> = { ...work, turns: next, round: null, lastRound: round }

    await turns.save(start.id, 'playing', saved)

    return { ...start, state: saved }
  }

  function sideOf(players: readonly TurnPlayerRow[], login: string): Side | null {
    return players.find((p) => p.login === login)?.side ?? null
  }

  async function canJoin(
    actor: Actor,
    room: Row,
    players: readonly TurnPlayerRow[],
  ): Promise<string | null> {
    if (players.some((p) => p.login === actor.login)) return null
    if (room.status !== 'lobby') return 'La partida ya ha empezado'
    if (room.campusId !== actor.campusId) return 'Esa sala es de otro campus'
    if (players.length >= 2) return 'La sala está llena'

    const minCircle = room.settings.minCircle

    if (minCircle !== null && minCircle > 0) {
      const circle = (await options.circlesOf([actor.login])).get(actor.login) ?? 0

      if (circle < minCircle) return `Para entrar hace falta ir por el círculo ${minCircle} o más`
    }

    return null
  }

  function optionsFor(round: StoredRound, viewer: string) {
    const order = orderFor(`turn:${round.index}:${round.conceptId}:${viewer}`, round.options.length)

    return order.map((id) => ({ id, text: round.options[id] ?? '' }))
  }

  /**
   * Una sala se mira si es del campus de quien pregunta o si juega en ella:
   * los ids van seguidos y, sin esto, cualquiera vería las partidas de otro
   * campus (quién juega, quién ha contestado). Si no, como si no existiera.
   */
  async function assertCanSee(actor: Actor, room: { id: number; campusId: number }): Promise<void> {
    if (room.campusId === actor.campusId) return
    if ((await turns.players(room.id)).map((p) => p.login).some((login) => login === actor.login))
      return

    throw domainError('not_found', 'Esa sala no existe')
  }

  async function viewOf(actor: Actor, start: Row): Promise<TurnRoom> {
    const room = await advance(start)
    const players = await turns.players(room.id)
    const images =
      (await options.imagesOf?.(players.map((p) => p.login))) ?? new Map<string, string | null>()
    const whyNot = await canJoin(actor, room, players)
    const state = room.state
    const t = now()
    const clocks = state === null ? null : clocksAt(state.turns, t)
    const question = state?.turns.question ?? null
    const mySide = sideOf(players, actor.login)
    const lang = actor.lang ?? 'es'
    const stored = state?.round ?? null
    const round = stored === null ? null : localizeRound(stored, lang)
    const last = state?.turns.last ?? null
    const storedLast = state?.lastRound ?? null
    const lastRound = storedLast === null ? null : localizeRound(storedLast, lang)

    const playerView = (p: TurnPlayerRow): TurnPlayer => ({
      login: p.login,
      image: images.get(p.login) ?? null,
      side: p.side,
      clockMs: clocks?.[p.side] ?? room.settings.minutes * 60_000,
      correct: state?.counts[p.side].correct ?? 0,
      wrong: state?.counts[p.side].wrong ?? 0,
    })

    const questionView: TurnQuestionView | null =
      question === null || round === null
        ? null
        : {
            index: round.index,
            kind: round.kind,
            prompt: round.prompt,
            code: round.code,
            options: optionsFor(round, actor.login),
            startsAt: isoAt(question.startsAt),
            endsAt: isoAt(question.endsAt),
            mine: question.answers.find((a) => a.side === mySide)?.option ?? null,
          }

    const firstAnswer = last === null ? undefined : [...last.answers].sort((x, y) => x.at - y.at)[0]
    const lastView: TurnLastQuestion | null =
      last === null || lastRound === null
        ? null
        : {
            index: lastRound.index,
            prompt: lastRound.prompt,
            options: optionsFor(lastRound, actor.login),
            answer: lastRound.answer,
            why: lastRound.why,
            first:
              firstAnswer === undefined
                ? null
                : {
                    login: players.find((p) => p.side === firstAnswer.side)?.login ?? '',
                    correct: firstAnswer.correct,
                  },
            winner: last.winner,
            penalized: last.penalized,
          }

    return {
      id: room.id,
      host: room.host,
      settings: room.settings,
      status: room.status,
      players: players.map(playerView),
      mover: room.status === 'playing' ? (state?.turns.mover ?? null) : null,
      question: room.status === 'playing' ? questionView : null,
      last: lastView,
      board: state === null ? null : (game.view(state.board) as TurnRoom['board']),
      end: state?.end ?? null,
      now: isoAt(t),
      joinable: whyNot === null,
      whyNot,
    }
  }

  /** Se va `login`: la sala pasa a otra persona, se borra si queda vacía y, jugando, pierde. */
  async function leaveRoom(room: Row, login: string): Promise<void> {
    const players = await turns.players(room.id)
    const side = sideOf(players, login)

    if (side === null) return

    if (room.status === 'playing' && room.state !== null) {
      await finish(room, room.state, { winner: other(side), reason: 'left' }, now())
    }

    await turns.remove(room.id, login)

    const rest = players.filter((p) => p.login !== login)

    if (rest.length === 0) await turns.drop(room.id)
    else if (room.host === login && rest[0] !== undefined)
      await turns.setHost(room.id, rest[0].login)
  }

  return {
    async list(actor: Actor): Promise<TurnLobby[]> {
      const rows = await turns.rooms(actor.campusId, actor.login, isoAt(now() - 6 * 3_600_000))

      return rows.map((room) => ({
        id: room.id,
        host: room.host,
        settings: room.settings,
        status: room.status,
        players: room.players,
        joined: room.joined,
      }))
    },

    async create(actor: Actor, input: unknown): Promise<TurnRoom> {
      const settings: TurnSettings = parse(settingsSchema, input)

      await mustBeFree(actor.login)

      const id = await turns.create(actor.campusId, actor.login, settings, isoAt(now()))

      await turns.join(id, actor.login, 'a', isoAt(now()))

      return viewOf(actor, await mustRoom(id))
    },

    async view(actor: Actor, id: number): Promise<TurnRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)

        await assertCanSee(actor, room)

        return viewOf(actor, room)
      })
    },

    async join(actor: Actor, id: number): Promise<TurnRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)
        const players = await turns.players(id)
        const whyNot = await canJoin(actor, room, players)

        if (whyNot !== null) throw domainError('conflict', whyNot)
        if (players.some((p) => p.login === actor.login)) return viewOf(actor, room)

        await mustBeFree(actor.login, id)

        const taken = new Set(players.map((p) => p.side))

        await turns.join(id, actor.login, taken.has('a') ? 'b' : 'a', isoAt(now()))

        return viewOf(actor, room)
      })
    },

    async leave(actor: Actor, id: number): Promise<void> {
      await locked(id, async () => {
        await leaveRoom(await advance(await mustRoom(id)), actor.login)
      })
    },

    /** Empieza: quien creó la sala, con los dos bandos ocupados. Mueve primero `a`. */
    async start(actor: Actor, id: number): Promise<TurnRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)

        if (room.host !== actor.login)
          throw domainError('forbidden', 'Solo quien creó la sala puede empezar')
        if (room.status !== 'lobby') throw domainError('conflict', 'La partida ya ha empezado')

        const players = await turns.players(id)

        if (players.length !== 2) throw domainError('conflict', 'Hacen falta dos personas')

        const slugs = await quiz.slugsOf(players.map((p) => p.login))
        const stats = await quiz.stats()
        const levels = new Map(
          bank.map((concept) => {
            const seen = stats.get(concept.id)

            return [concept.id, levelOf(concept.level, seen?.shown ?? 0, seen?.wrong ?? 0)]
          }),
        )
        const deck = pickConcepts(
          bank,
          players.map((p) => ({ slugs: slugs.get(p.login) ?? new Set<string>() })),
          {
            pool: room.settings.pool,
            kinds: room.settings.kinds,
            difficulty: 'rising',
            levels,
            count: DECK,
          },
          random,
        ).map((concept) => concept.id)

        if (deck.length < 3) {
          throw domainError(
            'conflict',
            'No hay preguntas suficientes que os valgan a los dos: probad solo con lo general',
          )
        }

        const board = game.start()
        const state: TurnGameState<Board> = {
          board,
          turns: startTurns(room.settings.minutes * 60_000, game.natural(board), now()),
          deck,
          next: 0,
          round: null,
          lastRound: null,
          counts: { a: { correct: 0, wrong: 0 }, b: { correct: 0, wrong: 0 } },
          end: null,
        }

        await turns.save(id, 'playing', state)

        return viewOf(actor, { ...room, status: 'playing', state })
      })
    },

    /** Mueve quien tiene el turno. Tras la jugada, se paran los relojes y sale la pregunta. */
    async move(actor: Actor, id: number, input: unknown): Promise<TurnRoom> {
      return locked(id, async () => {
        const room = await advance(await mustRoom(id))
        const state = room.state

        if (room.status !== 'playing' || state === null)
          throw domainError('conflict', 'La partida no está en juego')

        const side = sideOf(await turns.players(id), actor.login)

        if (side === null) throw domainError('forbidden', 'No juegas en esta sala')
        if (state.turns.mover !== side) throw domainError('conflict', 'Ahora no te toca mover')

        const played = game.play(state.board, side, input)

        if (played === null) throw domainError('invalid_input', 'Esa jugada no vale')

        const t = now()
        const ended = game.outcome(played.board, side)

        if (ended !== null) {
          await finish(room, { ...state, board: played.board }, ended, t)

          return viewOf(actor, await mustRoom(id))
        }

        // Quien queda obligado a mover (en jaque) mueve ya, sin pregunta.
        const forced = game.forced?.(played.board) ?? null

        if (forced !== null && game.canMove(played.board, forced)) {
          const saved: TurnGameState<Board> = {
            ...state,
            board: played.board,
            turns: passTurn(state.turns, t, forced),
          }

          await turns.save(id, 'playing', saved)

          return viewOf(actor, { ...room, state: saved })
        }

        const index = (state.lastRound?.index ?? -1) + 1
        const work: TurnGameState<Board> = { ...state, board: played.board }
        const round = nextRound(work, index)
        const saved: TurnGameState<Board> = {
          ...work,
          round,
          turns: afterMove(
            work.turns,
            t,
            { conceptId: round.conceptId, answer: round.answer, seconds: round.seconds },
            game.natural(played.board),
          ),
        }

        await turns.save(id, 'playing', saved)

        return viewOf(actor, { ...room, state: saved })
      })
    },

    /** Contesta la pregunta. La primera respuesta de los dos decide quién mueve. */
    async answer(actor: Actor, id: number, input: unknown): Promise<TurnRoom> {
      const { question, option } = parse(answerSchema, input)

      return locked(id, async () => {
        const room = await advance(await mustRoom(id))
        const state = room.state
        const round = state?.round ?? null

        if (room.status !== 'playing' || state === null || round?.index !== question) {
          throw domainError('conflict', 'Esa pregunta ya se ha cerrado')
        }

        const side = sideOf(await turns.players(id), actor.login)

        if (side === null) throw domainError('forbidden', 'No juegas en esta sala')
        if (option >= round.options.length)
          throw domainError('invalid_input', 'Esa respuesta no existe')

        const answered = answerTurn(state.turns, side, option, now(), GRACE_MS)

        if (answered === null) throw domainError('conflict', 'Esa pregunta ya se ha cerrado')

        const correct = option === round.answer

        await quiz.remember(actor.login, round.conceptId, correct, isoAt(now()))
        const counts = {
          ...state.counts,
          [side]: {
            correct: state.counts[side].correct + (correct ? 1 : 0),
            wrong: state.counts[side].wrong + (correct ? 0 : 1),
          },
        }
        const saved: TurnGameState<Board> = { ...state, turns: answered, counts }

        await turns.save(id, 'playing', saved)

        // Cerrarla ya: con la primera respuesta se sabe quién mueve.
        return viewOf(actor, { ...room, state: saved })
      })
    },

    /** Abandona sin irse de la sala: gana el otro bando. */
    async resign(actor: Actor, id: number): Promise<TurnRoom> {
      return locked(id, async () => {
        const room = await advance(await mustRoom(id))
        const side = sideOf(await turns.players(id), actor.login)

        if (side === null) throw domainError('forbidden', 'No juegas en esta sala')
        if (room.status !== 'playing' || room.state === null) {
          throw domainError('conflict', 'La partida no está en juego')
        }

        await finish(room, room.state, { winner: other(side), reason: 'resign' }, now())

        return viewOf(actor, await mustRoom(id))
      })
    },

    async prune(): Promise<number> {
      const t = now()

      return turns.prune(isoAt(t - LOBBY_TTL_MS), isoAt(t - DONE_TTL_MS))
    },
  }
}
