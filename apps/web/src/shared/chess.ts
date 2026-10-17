/**
 * Ajedrez en la web: lo que necesitan el tablero (qué casillas resaltar) y la
 * API de mentira (mover y acabar como la de verdad). Igual que en la API
 * (`modules/quiz/games/chess.rules.ts`), cualquiera de los dos bandos puede
 * tener el turno, porque la pregunta decide quién mueve.
 *
 * Blancas es el bando `a` y negras el `b`.
 */

import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'

import type { TurnSide } from '@sanatorio/contracts'

export const START_FEN = new Chess().fen()

const colorOf = (side: TurnSide): Color => (side === 'a' ? 'w' : 'b')

/** La misma posición, moviendo `side` (y sin captura al paso, que ya no vale). */
function withTurn(fen: string, side: TurnSide): string {
  const parts = fen.split(' ')

  if (parts[1] === colorOf(side)) return fen

  parts[1] = colorOf(side)
  parts[3] = '-'

  return parts.join(' ')
}

/** A quién le toca por orden. */
export const sideToMove = (fen: string): TurnSide => (new Chess(fen).turn() === 'w' ? 'a' : 'b')

function kingOf(game: Chess, color: Color): Square | null {
  for (const row of game.board()) {
    for (const cell of row) if (cell?.type === 'k' && cell.color === color) return cell.square
  }

  return null
}

/** Si `side` puede mover aquí: el rey del otro no queda en jaque y tiene jugadas. */
export function canMove(fen: string, side: TurnSide): boolean {
  const game = new Chess(withTurn(fen, side))
  const theirs = kingOf(game, colorOf(side === 'a' ? 'b' : 'a'))

  if (theirs !== null && game.isAttacked(theirs, colorOf(side))) return false

  return game.moves().length > 0
}

/** Las casillas a las que puede ir la pieza de `from`, moviendo `side`. */
export function targetsOf(fen: string, side: TurnSide, from: string): string[] {
  const game = new Chess(withTurn(fen, side))

  return game.moves({ square: from as Square, verbose: true }).map((move) => move.to)
}

/** Si mover de `from` a `to` es coronar (y hay que elegir pieza). */
export function isPromotion(fen: string, side: TurnSide, from: string, to: string): boolean {
  const game = new Chess(withTurn(fen, side))

  return game
    .moves({ square: from as Square, verbose: true })
    .some((move) => move.to === to && move.promotion !== undefined)
}

export type Piece = { type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; side: TurnSide }

/** El tablero como 64 casillas, de a8 a h1 (fila a fila, como se lee). */
export function squaresOf(fen: string): { square: string; piece: Piece | null }[] {
  return new Chess(fen).board().flatMap((row, rank) =>
    row.map((cell, file) => ({
      square: `${'abcdefgh'[file] ?? 'a'}${8 - rank}`,
      piece: cell === null ? null : { type: cell.type, side: cell.color === 'w' ? 'a' : 'b' },
    })),
  )
}

/** Mueve `side`, o `null` si no vale. Devuelve la posición, la jugada y si comió o da jaque. */
export function play(
  fen: string,
  side: TurnSide,
  move: { from: string; to: string; promotion?: string | undefined },
): { fen: string; san: string; captured: boolean; check: boolean } | null {
  const game = new Chess(withTurn(fen, side))

  try {
    const done = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })

    return {
      fen: game.fen(),
      san: done.san,
      captured: done.captured !== undefined,
      check: game.inCheck(),
    }
  } catch {
    return null
  }
}

/** Una jugada al azar de `side` (para el rival de mentira). */
export function randomMove(
  fen: string,
  side: TurnSide,
  random: () => number,
): { from: string; to: string } | null {
  const moves = new Chess(withTurn(fen, side)).moves({ verbose: true })
  const pick = moves[Math.floor(random() * moves.length)]

  return pick === undefined ? null : { from: pick.from, to: pick.to }
}

/** Cómo acaba la posición tras mover `mover`, o `null` si sigue. */
export function outcomeOf(
  fen: string,
  mover: TurnSide,
): { winner: TurnSide | null; reason: 'checkmate' | 'stalemate' | 'draw' } | null {
  const game = new Chess(fen)

  if (game.isCheckmate()) return { winner: mover, reason: 'checkmate' }
  if (game.isStalemate()) return { winner: null, reason: 'stalemate' }
  if (game.isDraw()) return { winner: null, reason: 'draw' }

  return null
}
