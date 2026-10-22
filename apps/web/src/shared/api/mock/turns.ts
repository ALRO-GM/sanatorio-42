/**
 * API de mentira: ajedrez con pregunta entre jugadas. Hace lo mismo que el
 * motor de la API (relojes que se paran, pregunta a los dos, el primero que
 * acierta mueve, fallar quita el 10 % del tiempo) con las preguntas de ejemplo
 * de Not-games y un rival de mentira que entra, contesta y mueve solo.
 */

import type {
  ChessBoardView,
  TurnEnd,
  TurnLastQuestion,
  TurnLobby,
  TurnRoom,
  TurnSettings,
  TurnSide,
} from '@sanatorio/contracts'

import { canMove, outcomeOf, play, randomMove, sideToMove, START_FEN } from '../../chess'
import { ME } from './data'
import { portrait } from './portrait'
import { SAMPLES } from './quiz'
import { delay, fail } from './state'
import type { Api } from '../types'

const RIVAL = 'mgarcia'
const MISS = 0.1
const other = (side: TurnSide): TurnSide => (side === 'a' ? 'b' : 'a')

type Answer = { side: TurnSide; option: number; correct: boolean; at: number }
type Question = {
  index: number
  sample: number
  startsAt: number
  endsAt: number
  answers: Answer[]
  natural: TurnSide
  rivalAt: number
  rivalRight: boolean
  /** Las veces que se ha cambiado de pregunta porque nadie contestaba. */
  reasks?: number
}

/** Como en la API (`turns.rules.ts`): preguntas de repuesto antes de mover por orden. */
const MAX_REASKS = 2

type MockTurnRoom = {
  id: number
  host: string
  settings: TurnSettings
  status: 'lobby' | 'playing' | 'done'
  players: { login: string; side: TurnSide }[]
  fen: string
  history: string[]
  positions: string[]
  lastMove: ChessBoardView['lastMove']
  clocks: Record<TurnSide, number>
  mover: TurnSide | null
  since: number
  question: Question | null
  last: (Question & { winner: TurnSide; penalized: TurnSide | null }) | null
  counts: Record<TurnSide, { correct: number; wrong: number }>
  end: TurnEnd | null
  asked: number
}

const rooms = new Map<number, MockTurnRoom>()
let nextId = 1

const sideOf = (room: MockTurnRoom, login: string): TurnSide | null =>
  room.players.find((p) => p.login === login)?.side ?? null

function mustRoom(id: number): MockTurnRoom {
  const room = rooms.get(id)

  if (room === undefined) throw fail(404, 'Esa sala ya no existe')

  return room
}

function clocksAt(room: MockTurnRoom, t: number): Record<TurnSide, number> {
  if (room.mover === null) return room.clocks

  return { ...room.clocks, [room.mover]: Math.max(0, room.clocks[room.mover] - (t - room.since)) }
}

function finish(room: MockTurnRoom, end: TurnEnd, t: number): void {
  room.clocks = clocksAt(room, t)
  room.mover = null
  room.question = null
  room.status = 'done'
  room.end = end
}

function ask(room: MockTurnRoom, t: number): void {
  room.clocks = clocksAt(room, t)
  room.mover = null

  const sample = room.asked % SAMPLES.length
  const seconds = SAMPLES[sample]?.seconds ?? 10

  room.question = {
    index: room.asked,
    sample,
    startsAt: t,
    endsAt: t + seconds * 1000,
    answers: [],
    natural: sideToMove(room.fen),
    // El rival contesta entre 3 y 7 s, y acierta más o menos dos de cada tres.
    rivalAt: t + 3000 + Math.random() * 4000,
    rivalRight: Math.random() < 0.65,
  }
  room.asked += 1
}

function answer(room: MockTurnRoom, side: TurnSide, option: number, t: number): void {
  const q = room.question
  const sample = q === null ? undefined : SAMPLES[q.sample]

  if (q === null || sample === undefined || q.answers.some((a) => a.side === side)) return

  const correct = option === sample.answer

  q.answers.push({ side, option, correct, at: t })
  room.counts[side][correct ? 'correct' : 'wrong'] += 1
}

/** Lleva la partida hasta ahora, como `advance` en la API. */
function advance(room: MockTurnRoom, t: number): void {
  if (room.status !== 'playing') return

  for (let guard = 0; guard < 20; guard++) {
    const q = room.question

    if (q !== null) {
      const rival = sideOf(room, RIVAL)

      if (rival !== null && t >= q.rivalAt && q.answers.length === 0) {
        const right = SAMPLES[q.sample]?.answer ?? 0

        answer(room, rival, q.rivalRight ? right : (right + 1) % 4, q.rivalAt)
      }

      const first = q.answers[0]

      if (first === undefined && t <= q.endsAt) return
      // Nadie ha contestado: otra pregunta, hasta MAX_REASKS veces.
      if (first === undefined && (q.reasks ?? 0) < MAX_REASKS) {
        ask(room, q.endsAt)
        if (room.question !== null) room.question.reasks = (q.reasks ?? 0) + 1
        continue
      }

      let winner = first === undefined ? q.natural : first.correct ? first.side : other(first.side)
      const penalized = first !== undefined && !first.correct ? first.side : null

      if (!canMove(room.fen, winner)) winner = other(winner)
      if (penalized !== null)
        room.clocks[penalized] = Math.floor(room.clocks[penalized] * (1 - MISS))

      room.last = { ...q, winner, penalized }
      room.question = null
      room.mover = winner
      room.since = first === undefined ? q.endsAt : first.at
      continue
    }

    if (room.mover === null) return

    const clocks = clocksAt(room, t)

    if (clocks[room.mover] <= 0) {
      finish(room, { winner: other(room.mover), reason: 'time' }, t)

      return
    }

    // El rival piensa un par de segundos y mueve al azar.
    if (room.players.find((p) => p.side === room.mover)?.login === RIVAL && t - room.since > 2500) {
      const side = room.mover
      const move = randomMove(room.fen, side, Math.random)

      if (move === null) return

      applyMove(room, side, move, room.since + 2500)
      continue
    }

    return
  }
}

/** Aplica una jugada y, si la partida sigue, saca la pregunta. */
function applyMove(
  room: MockTurnRoom,
  side: TurnSide,
  move: { from: string; to: string; promotion?: string | undefined },
  t: number,
): boolean {
  const done = play(room.fen, side, move)

  if (done === null) return false

  room.clocks = clocksAt(room, t)
  room.fen = done.fen
  room.history = [...room.history, done.san]
  room.positions = [...room.positions, done.fen]
  room.lastMove = { from: move.from, to: move.to, captured: done.captured, check: done.check }

  const ended = outcomeOf(done.fen, side)

  if (ended !== null) finish(room, ended, t)
  else if (done.check) {
    // En jaque se mueve ya, sin pregunta.
    room.mover = sideToMove(done.fen)
    room.since = t
  } else ask(room, t)

  return true
}

function view(room: MockTurnRoom): TurnRoom {
  const t = Date.now()

  advance(room, t)

  const clocks = clocksAt(room, t)
  const mine = sideOf(room, ME.login)
  const q = room.question
  const sample = q === null ? undefined : SAMPLES[q.sample]
  const options = (index: number) =>
    (SAMPLES[index]?.options ?? []).map((text, id) => ({ id, text })).reverse()
  const last = room.last
  const lastSample = last === null ? undefined : SAMPLES[last.sample]
  const first = last?.answers[0]
  const lastView: TurnLastQuestion | null =
    last === null || lastSample === undefined
      ? null
      : {
          index: last.index,
          prompt: lastSample.prompt,
          options: options(last.sample),
          answer: lastSample.answer,
          why: lastSample.why,
          first:
            first === undefined
              ? null
              : {
                  login: room.players.find((p) => p.side === first.side)?.login ?? '',
                  correct: first.correct,
                },
          winner: last.winner,
          penalized: last.penalized,
        }

  return {
    id: room.id,
    host: room.host,
    settings: room.settings,
    status: room.status,
    players: room.players.map((p) => ({
      login: p.login,
      image: portrait(p.login),
      side: p.side,
      clockMs: clocks[p.side],
      correct: room.counts[p.side].correct,
      wrong: room.counts[p.side].wrong,
    })),
    mover: room.status === 'playing' ? room.mover : null,
    question:
      q === null || sample === undefined
        ? null
        : {
            index: q.index,
            kind: sample.seconds > 10 ? 'long' : 'quick',
            prompt: sample.prompt,
            code: sample.code ?? null,
            options: options(q.sample),
            startsAt: new Date(q.startsAt).toISOString(),
            endsAt: new Date(q.endsAt).toISOString(),
            mine: q.answers.find((a) => a.side === mine)?.option ?? null,
          },
    last: lastView,
    board:
      room.status === 'lobby'
        ? null
        : {
            fen: room.fen,
            lastMove: room.lastMove,
            history: room.history,
            positions: room.positions,
          },
    end: room.end,
    now: new Date(t).toISOString(),
    joinable: room.status === 'lobby' && room.players.length < 2,
    whyNot: room.status === 'lobby' ? null : 'La partida ya ha empezado',
  }
}

export const turnsMock: Pick<
  Api,
  | 'getTurnRooms'
  | 'createTurnRoom'
  | 'getTurnRoom'
  | 'joinTurnRoom'
  | 'leaveTurnRoom'
  | 'startTurnRoom'
  | 'moveTurn'
  | 'answerTurn'
  | 'resignTurn'
> = {
  async getTurnRooms() {
    await delay(120)

    const list: TurnLobby[] = [...rooms.values()].map((room) => ({
      id: room.id,
      host: room.host,
      settings: room.settings,
      status: room.status,
      players: room.players.length,
      joined: room.players.some((p) => p.login === ME.login),
    }))

    return list.reverse()
  },

  async createTurnRoom(settings) {
    await delay(150)

    const room: MockTurnRoom = {
      id: nextId++,
      host: ME.login,
      settings,
      status: 'lobby',
      // El rival de mentira entra en cuanto se crea la sala.
      players: [
        { login: ME.login, side: 'a' },
        { login: RIVAL, side: 'b' },
      ],
      fen: START_FEN,
      history: [],
      positions: [],
      lastMove: null,
      clocks: { a: settings.minutes * 60_000, b: settings.minutes * 60_000 },
      mover: null,
      since: Date.now(),
      question: null,
      last: null,
      counts: { a: { correct: 0, wrong: 0 }, b: { correct: 0, wrong: 0 } },
      end: null,
      asked: 0,
    }

    rooms.set(room.id, room)

    return view(room)
  },

  async getTurnRoom(id) {
    await delay(60)

    return view(mustRoom(id))
  },

  async joinTurnRoom(id) {
    await delay(100)

    return view(mustRoom(id))
  },

  async leaveTurnRoom(id) {
    await delay(100)

    const room = mustRoom(id)
    const side = sideOf(room, ME.login)

    if (room.status === 'playing' && side !== null)
      finish(room, { winner: other(side), reason: 'left' }, Date.now())
    room.players = room.players.filter((p) => p.login !== ME.login)
    // Sin nadie de verdad dentro, la sala se borra.
    if (room.players.every((p) => p.login === RIVAL)) rooms.delete(id)
  },

  async startTurnRoom(id) {
    await delay(150)

    const room = mustRoom(id)

    room.status = 'playing'
    room.mover = 'a'
    room.since = Date.now()

    return view(room)
  },

  async moveTurn(id, move) {
    await delay(80)

    const room = mustRoom(id)

    advance(room, Date.now())

    const side = sideOf(room, ME.login)

    if (room.status !== 'playing' || side === null || room.mover !== side)
      throw fail(409, 'Ahora no te toca mover')
    if (!applyMove(room, side, move, Date.now())) throw fail(400, 'Esa jugada no vale')

    return view(room)
  },

  async answerTurn(id, question, option) {
    await delay(80)

    const room = mustRoom(id)

    advance(room, Date.now())

    const side = sideOf(room, ME.login)

    if (room.question?.index !== question || side === null)
      throw fail(409, 'Esa pregunta ya se ha cerrado')
    answer(room, side, option, Date.now())

    return view(room)
  },

  async resignTurn(id) {
    await delay(80)

    const room = mustRoom(id)
    const side = sideOf(room, ME.login)

    if (room.status === 'playing' && side !== null)
      finish(room, { winner: other(side), reason: 'resign' }, Date.now())

    return view(room)
  },
}
