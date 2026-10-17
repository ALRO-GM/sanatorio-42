/**
 * Ajedrez para los juegos por turnos con pregunta (`../turns.rules.ts`): solo
 * lo que es del ajedrez. Las jugadas las valida `chess.js`.
 *
 * Blancas es el bando `a` y negras el `b`. Como la pregunta puede dar dos
 * jugadas seguidas al mismo bando, aquí se puede «dar el turno» a cualquiera:
 * se cambia el bando que mueve en la posición (y se olvida la captura al paso,
 * que solo vale justo después del avance doble).
 */

import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'

import type { Side } from '../turns.rules.js'

export const START_FEN = new Chess().fen()

const colorOf = (side: Side): Color => (side === 'a' ? 'w' : 'b')
const sideOf = (color: Color): Side => (color === 'w' ? 'a' : 'b')

/** La misma posición, moviendo `side`. */
function withTurn(fen: string, side: Side): string {
  const parts = fen.split(' ')

  if (parts[1] === colorOf(side)) return fen

  parts[1] = colorOf(side)
  parts[3] = '-'

  return parts.join(' ')
}

function kingOf(game: Chess, color: Color): Square | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell?.type === 'k' && cell.color === color) return cell.square
    }
  }

  return null
}

/** A quién le toca por orden en esta posición. */
export function sideToMove(fen: string): Side {
  return sideOf(new Chess(fen).turn())
}

/**
 * Si `side` puede mover ahora: la posición con él moviendo es posible (el rey
 * del otro no está en jaque, o se lo podría comer) y tiene alguna jugada.
 */
export function canMove(fen: string, side: Side): boolean {
  const game = new Chess(withTurn(fen, side))
  const theirs = kingOf(game, colorOf(side === 'a' ? 'b' : 'a'))

  if (theirs !== null && game.isAttacked(theirs, colorOf(side))) return false

  return game.moves().length > 0
}

type ChessMove = { from: string; to: string; promotion?: string | undefined }

type MoveResult = {
  fen: string
  san: string
  from: string
  to: string
  captured: boolean
  check: boolean
}

/** Mueve `side`, o `null` si la jugada no vale. */
export function play(fen: string, side: Side, move: ChessMove): MoveResult | null {
  const game = new Chess(withTurn(fen, side))

  try {
    const done = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })

    return {
      fen: game.fen(),
      san: done.san,
      from: done.from,
      to: done.to,
      captured: done.captured !== undefined,
      check: game.inCheck(),
    }
  } catch {
    return null
  }
}

type ChessOutcome = { winner: Side | null; reason: 'checkmate' | 'stalemate' | 'draw' }

/**
 * Si la partida ha acabado tras la jugada de `mover`. Jaque mate: gana quien
 * movió. Ahogado o tablas por material, repetición o 50 jugadas: tablas.
 *
 * Con la pregunta, el otro podría no mover ahora; aun así, si el que tiene el
 * turno por orden no tiene jugadas, se decide aquí: es lo que dice el tablero.
 */
export function outcome(fen: string, mover: Side): ChessOutcome | null {
  const game = new Chess(fen)

  if (game.isCheckmate()) return { winner: mover, reason: 'checkmate' }
  if (game.isStalemate()) return { winner: null, reason: 'stalemate' }
  if (game.isDraw()) return { winner: null, reason: 'draw' }

  return null
}
