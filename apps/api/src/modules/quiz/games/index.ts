/**
 * Juegos por turnos con pregunta de Not-games: el motor común
 * (`turns.service.ts`, sobre `../turns.rules.ts`) y cada juego. Por ahora, el
 * ajedrez. Un juego nuevo es un `TurnGame` más y su `game` en los ajustes.
 */

import type { Db } from '../../../core/db/database.js'
import type { Concept } from '../bank/index.js'
import type { QuizRepository } from '../quiz.repository.js'
import { CHESS } from './chess.game.js'
import type { ChessBoard } from './chess.game.js'
import { createTurnsRepository } from './turns.repository.js'
import { createTurnsService } from './turns.service.js'
import type { TurnGameState } from './turns.service.js'
import { given } from '../../../core/options.js'

type ChessDeps = {
  db: Db
  quiz: QuizRepository
  bank: readonly Concept[]
  circlesOf: (logins: readonly string[]) => Promise<Map<string, number>>
  imagesOf: (logins: readonly string[]) => Promise<Map<string, string | null>>
  now?: () => number
  random?: () => number
}

export function createChessService(deps: ChessDeps) {
  return createTurnsService({
    turns: createTurnsRepository<TurnGameState<ChessBoard>>(deps.db),
    quiz: deps.quiz,
    game: CHESS,
    bank: deps.bank,
    circlesOf: deps.circlesOf,
    imagesOf: deps.imagesOf,
    ...given({ now: deps.now, random: deps.random }),
  })
}

export type ChessService = ReturnType<typeof createChessService>

/** Las salas por turnos sin acabar de alguien (para no estar en dos partidas a la vez). */
export function openTurnRoomsOf(db: Db): (login: string) => Promise<number[]> {
  const turns = createTurnsRepository<unknown>(db)

  return (login) => turns.openRoomsOf(login)
}
