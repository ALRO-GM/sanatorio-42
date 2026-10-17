/**
 * El ajedrez como juego por turnos con pregunta: el tablero que guarda el
 * motor (`turns.service.ts`) y cómo se valida una jugada que llega de la web.
 */

import type { ChessBoardView } from '@sanatorio/contracts'
import { z } from 'zod'

import { canMove, outcome, play, sideToMove, START_FEN } from './chess.rules.js'
import type { TurnGame } from './turns.service.js'

export type ChessBoard = ChessBoardView

const square = z.string().regex(/^[a-h][1-8]$/)
const moveSchema = z.object({
  from: square,
  to: square,
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
})

export const CHESS: TurnGame<ChessBoard, ChessBoardView> = {
  kind: 'chess',
  start: () => ({ fen: START_FEN, lastMove: null, history: [] }),
  natural: (board) => sideToMove(board.fen),
  canMove: (board, side) => canMove(board.fen, side),
  play(board, side, input) {
    const move = moveSchema.safeParse(input)

    if (!move.success) return null

    const done = play(board.fen, side, move.data)

    if (done === null) return null

    return {
      board: {
        fen: done.fen,
        lastMove: { from: done.from, to: done.to, captured: done.captured, check: done.check },
        history: [...board.history, done.san],
      },
      summary: done.san,
    }
  },
  outcome: (board, mover) => outcome(board.fen, mover),
  view: (board) => board,
}
