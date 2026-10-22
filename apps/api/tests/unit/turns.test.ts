/**
 * Juegos por turnos con pregunta: la mecánica (relojes, pregunta, quién mueve,
 * castigo por fallar), las reglas del ajedrez y una partida entera de ajedrez
 * con el reloj de mentira.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import type { TurnRoom } from '@sanatorio/contracts'

import {
  canMove,
  outcome,
  play,
  sideToMove,
  START_FEN,
} from '../../src/modules/quiz/games/chess.rules.js'
import {
  afterMove,
  answerTurn,
  checkFlag,
  clocksAt,
  MISS_PENALTY,
  settleQuestion,
  startTurns,
} from '../../src/modules/quiz/turns.rules.js'
import type { TurnState } from '../../src/modules/quiz/turns.rules.js'
import { actor, expectCode, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'
import { projectUser } from '../helpers/fixtures.js'

const MINUTE = 60_000
const Q = { conceptId: 'c1', answer: 2, seconds: 10 }
const yes = (): boolean => true

/** `a` mueve a los 20 s y sale la pregunta; le toca `b` por orden. */
function questioned(): TurnState {
  return afterMove(startTurns(5 * MINUTE, 'a', 0), 20_000, Q, 'b')
}

describe('turnos con pregunta: la mecánica', () => {
  it('corre solo el reloj de quien mueve, y al mover se paran los dos', () => {
    const state = startTurns(5 * MINUTE, 'a', 0)

    expect(clocksAt(state, 30_000)).toEqual({ a: 5 * MINUTE - 30_000, b: 5 * MINUTE })

    const asked = questioned()

    expect(asked.mover).toBeNull()
    expect(clocksAt(asked, 90_000)).toEqual({ a: 5 * MINUTE - 20_000, b: 5 * MINUTE })
  })

  it('el primero que acierta mueve, aunque no le tocara; y su reloj corre desde que contestó', () => {
    const answered = answerTurn(questioned(), 'a', 2, 23_000)
    const settled = settleQuestion(must(answered), 25_000, yes)

    expect(settled).toMatchObject({ mover: 'a', since: 23_000, question: null })
    expect(settled.last).toMatchObject({ winner: 'a', penalized: null })
  })

  it('quien contesta primero y falla pierde el 10 % de lo que le queda, y mueve el otro', () => {
    const settled = settleQuestion(must(answerTurn(questioned(), 'b', 0, 22_000)), 22_000, yes)

    expect(settled.mover).toBe('a')
    expect(settled.clocks.b).toBe(Math.floor(5 * MINUTE * (1 - MISS_PENALTY)))
    expect(settled.clocks.a).toBe(5 * MINUTE - 20_000)
    expect(settled.last).toMatchObject({ winner: 'a', penalized: 'b' })
  })

  it('si nadie contesta, al acabarse el tiempo mueve a quien le tocaba', () => {
    const asked = questioned()

    // Aún no ha acabado: sigue la pregunta.
    expect(settleQuestion(asked, 29_000, yes)).toBe(asked)
    expect(settleQuestion(asked, 31_000, yes)).toMatchObject({ mover: 'b', since: 30_000 })
  })

  it('si el que gana no puede mover (posición imposible), mueve el otro', () => {
    const settled = settleQuestion(
      must(answerTurn(questioned(), 'a', 2, 21_000)),
      21_000,
      (side) => side !== 'a',
    )

    expect(settled.mover).toBe('b')
  })

  it('solo vale la primera respuesta de cada bando, y dentro de tiempo', () => {
    const asked = questioned()
    const once = must(answerTurn(asked, 'a', 1, 21_000))

    expect(answerTurn(once, 'a', 2, 21_500)).toBeNull()
    expect(answerTurn(asked, 'a', 2, 19_000)).toBeNull()
    expect(answerTurn(asked, 'a', 2, 31_000)).toBeNull()
    expect(answerTurn(asked, 'a', 2, 31_000, 1_000)).not.toBeNull()
    expect(answerTurn(startTurns(MINUTE, 'a', 0), 'a', 2, 10)).toBeNull()
  })

  it('quien se queda sin tiempo queda marcado; con la pregunta en marcha no corre', () => {
    const state = startTurns(MINUTE, 'a', 0)

    expect(checkFlag(state, 59_000).flagged).toBeNull()
    expect(checkFlag(state, 60_000).flagged).toBe('a')
    expect(checkFlag(afterMove(state, 10_000, Q, 'b'), 10 * MINUTE).flagged).toBeNull()
  })
})

describe('ajedrez: las reglas', () => {
  it('se mueve por turnos y una jugada ilegal no vale', () => {
    expect(sideToMove(START_FEN)).toBe('a')
    expect(play(START_FEN, 'a', { from: 'e2', to: 'e5' })).toBeNull()
    expect(play(START_FEN, 'a', { from: 'z9', to: 'e4' })).toBeNull()

    const moved = must(play(START_FEN, 'a', { from: 'e2', to: 'e4' }))

    expect(moved).toMatchObject({ san: 'e4', captured: false, check: false })
    expect(sideToMove(moved.fen)).toBe('b')
  })

  it('el mismo bando puede mover dos veces seguidas, salvo que el rey del otro esté en jaque', () => {
    const e4 = must(play(START_FEN, 'a', { from: 'e2', to: 'e4' })).fen

    expect(canMove(e4, 'a')).toBe(true)
    expect(must(play(e4, 'a', { from: 'd2', to: 'd4' })).san).toBe('d4')
    // Blancas dan jaque: no pueden mover otra vez (se comerían el rey).
    const check = '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1'

    expect(canMove(check, 'a')).toBe(false)
    expect(canMove(check, 'b')).toBe(true)
  })

  it('jaque mate gana quien mueve; ahogado son tablas', () => {
    // Mate del pastor en una jugada: Dxf7#.
    const before = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 3'
    const mate = must(play(before, 'a', { from: 'h5', to: 'f7' }))

    expect(mate.check).toBe(true)
    expect(outcome(mate.fen, 'a')).toEqual({ winner: 'a', reason: 'checkmate' })
    expect(outcome('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'a')).toEqual({
      winner: null,
      reason: 'stalemate',
    })
    expect(outcome(START_FEN, 'a')).toBeNull()
  })

  it('al coronar, si no se dice nada, sale dama', () => {
    expect(must(play('8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a', { from: 'a7', to: 'a8' })).san).toBe(
      'a8=Q',
    )
  })
})

describe('ajedrez: una partida', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']

  beforeEach(async () => {
    ;({ services, clock, db } = community)
    await services.repositories.replica.ingestProjectUsers(
      ['ana', 'leo', 'eva'].map((login) =>
        projectUser(login, {
          projectId: 20,
          projectName: 'Libft',
          slug: '42cursus-libft',
          status: 'finished',
        }),
      ),
      MADRID,
    )
  })

  const rightOf = async (room: TurnRoom): Promise<number> => {
    const row = await db.execute({
      sql: 'SELECT state FROM turn_rooms WHERE id = ?',
      args: [room.id],
    })
    const state = JSON.parse(typeof row.rows[0]?.state === 'string' ? row.rows[0].state : '{}') as {
      round: { answer: number }
    }

    return state.round.answer
  }

  async function begin(minutes = 5): Promise<number> {
    const { chess } = services
    const { id } = await chess.create(actor('ana'), { game: 'chess', minutes, pool: 'general' })

    await chess.join(actor('leo'), id)
    await chess.start(actor('ana'), id)

    return id
  }

  it('mueve blancas, sale la pregunta a los dos, quien acierta primero mueve', async () => {
    const { chess } = services
    const id = await begin()
    let room = await chess.view(actor('leo'), id)

    expect(room).toMatchObject({ status: 'playing', mover: 'a', question: null })
    expect(room.players.map((p) => [p.login, p.side])).toEqual([
      ['ana', 'a'],
      ['leo', 'b'],
    ])
    // Negras no pueden mover: no es su turno.
    await expectCode(chess.move(actor('leo'), id, { from: 'e7', to: 'e5' }), 'conflict')
    await expectCode(chess.move(actor('ana'), id, { from: 'e2', to: 'e5' }), 'invalid_input')

    clock.advance(5_000)
    room = await chess.move(actor('ana'), id, { from: 'e2', to: 'e4' })
    expect(room.mover).toBeNull()
    expect(room.question?.options).toHaveLength(4)
    expect(room.board?.history).toEqual(['e4'])
    // La posición de después, para repasar la partida al acabar.
    expect(room.board?.positions).toEqual([room.board?.fen])
    // Con la pregunta, los relojes no corren.
    clock.advance(4_000)
    room = await chess.view(actor('ana'), id)
    expect(room.players.find((p) => p.side === 'a')?.clockMs).toBe(5 * MINUTE - 5_000)

    // ana acierta primero: vuelve a mover blancas.
    room = await chess.answer(actor('ana'), id, { question: 0, option: await rightOf(room) })
    expect(room.mover).toBe('a')
    expect(room.last).toMatchObject({ first: { login: 'ana', correct: true }, winner: 'a' })
    await expectCode(chess.answer(actor('leo'), id, { question: 0, option: 0 }), 'conflict')

    room = await chess.move(actor('ana'), id, { from: 'd2', to: 'd4' })
    expect(room.board?.history).toEqual(['e4', 'd4'])
  })

  it('fallar quita el 10 % del reloj y da el turno al rival', async () => {
    const { chess } = services
    const id = await begin()
    let room = await chess.move(actor('ana'), id, { from: 'e2', to: 'e4' })
    const wrong = ((await rightOf(room)) + 1) % 4

    room = await chess.answer(actor('leo'), id, { question: 0, option: wrong })
    expect(room.mover).toBe('a')
    expect(room.players.find((p) => p.side === 'b')?.clockMs).toBe(Math.floor(5 * MINUTE * 0.9))
    expect(room.last).toMatchObject({ penalized: 'b', first: { login: 'leo', correct: false } })
  })

  it('sin tiempo se pierde, y el resultado queda guardado', async () => {
    const { chess } = services
    const id = await begin(3)

    clock.advance(3 * MINUTE + 1)

    const room = await chess.view(actor('leo'), id)

    expect(room).toMatchObject({ status: 'done', end: { winner: 'b', reason: 'time' } })

    const results = await db.execute(
      'SELECT game, login, won, score FROM game_results ORDER BY login',
    )

    expect(results.rows).toEqual([
      expect.objectContaining({ game: 'chess', login: 'ana', won: 0, score: 0 }),
      expect.objectContaining({ game: 'chess', login: 'leo', won: 1, score: 2 }),
    ])
  })

  it('abandonar o irse da la partida al otro; vacía, la sala se borra', async () => {
    const { chess } = services
    const id = await begin()

    expect((await chess.resign(actor('leo'), id)).end).toEqual({ winner: 'a', reason: 'resign' })

    const other = await begin()

    await chess.leave(actor('ana'), other)
    expect((await chess.view(actor('leo'), other)).end).toEqual({ winner: 'b', reason: 'left' })
    await chess.leave(actor('leo'), other)
    await expectCode(chess.view(actor('leo'), other), 'not_found')
  })

  it('jaque mate acaba la partida', async () => {
    const { chess } = services
    const id = await begin()
    // Mate del loco: f3 e5 g4 Dh4#. Tras cada jugada, nadie contesta y mueve a quien toca.
    const moves: [string, string, string][] = [
      ['ana', 'f2', 'f3'],
      ['leo', 'e7', 'e5'],
      ['ana', 'g2', 'g4'],
      ['leo', 'd8', 'h4'],
    ]
    let room: TurnRoom | null = null

    for (const [login, from, to] of moves) {
      room = await chess.move(actor(login), id, { from, to })
      if (room.status === 'playing') clock.advance(12_000)
    }

    expect(room?.end).toEqual({ winner: 'b', reason: 'checkmate' })
  })

  it('nadie juega dos partidas a la vez, ni de preguntas ni de ajedrez; y la sala tiene dos plazas', async () => {
    const { chess, quiz } = services
    const { id } = await chess.create(actor('ana'), { game: 'chess', pool: 'general' })

    await expectCode(quiz.create(actor('ana'), { mode: 'ffa', pool: 'general' }), 'conflict')
    await expectCode(chess.create(actor('ana'), { game: 'chess', pool: 'general' }), 'conflict')
    await chess.join(actor('leo'), id)
    await expectCode(chess.join(actor('eva'), id), 'conflict')
    await expectCode(chess.start(actor('leo'), id), 'forbidden')
    await expectCode(chess.create(actor('eva'), { game: 'chess', minutes: 7 }), 'invalid_input')
  })
})

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('falta un valor')

  return value
}
