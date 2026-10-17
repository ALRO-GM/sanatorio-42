import { useState } from 'react'

import type { ChessBoardView, TurnSide } from '@sanatorio/contracts'

import { isPromotion, squaresOf, targetsOf } from '../../shared/chess'
import type { Piece } from '../../shared/chess'
import { useI18n } from '../../shared/i18n'

/** Los estilos de tablero que se pueden elegir. Cada cual guarda el suyo. */
export const BOARD_STYLES = ['tournament', 'wood', 'ocean', 'contrast'] as const

export type BoardStyle = (typeof BOARD_STYLES)[number]

const BOARD_KEY = 'sanatorio_chess_board'

export function loadBoardStyle(): BoardStyle {
  try {
    const stored = localStorage.getItem(BOARD_KEY)

    return BOARD_STYLES.find((style) => style === stored) ?? 'tournament'
  } catch {
    return 'tournament'
  }
}

export function saveBoardStyle(style: BoardStyle): void {
  try {
    localStorage.setItem(BOARD_KEY, style)
  } catch {
    // Sin almacenamiento, se queda para esta visita.
  }
}

/**
 * Las piezas, con los símbolos de ajedrez de Unicode (los rellenos, que se
 * colorean) y el selector de texto (U+FE0E) para que ningún sistema los pinte
 * como emoji.
 */
const GLYPH: Record<Piece['type'], string> = {
  k: '♚︎',
  q: '♛︎',
  r: '♜︎',
  b: '♝︎',
  n: '♞︎',
  p: '♟︎',
}
const PROMOTIONS = ['q', 'r', 'b', 'n'] as const

type ChessBoardProps = {
  board: ChessBoardView
  /** El bando de quien mira: va abajo. Quien solo mira, blancas abajo. */
  side: TurnSide | null
  /** Si ahora puede mover quien mira. */
  canPlay: boolean
  style: BoardStyle
  onMove: (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => void
}

/**
 * El tablero: se pulsa una pieza propia (se resaltan sus casillas) y después
 * la casilla de destino. Cada casilla es un botón: se juega también con el
 * teclado. Se ve la última jugada y, si hay jaque, el rey en rojo.
 */
export function ChessBoard({ board, side, canPlay, style, onMove }: ChessBoardProps) {
  const { t } = useI18n()
  const [from, setFrom] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<{ from: string; to: string } | null>(null)
  const mine = side ?? 'a'
  const squares = squaresOf(board.fen)
  const ordered = mine === 'a' ? squares : [...squares].reverse()
  const targets = from === null || !canPlay ? [] : targetsOf(board.fen, mine, from)
  const checked = board.lastMove?.check === true
  const lastMover =
    board.lastMove === null
      ? null
      : squares.find((s) => s.square === board.lastMove?.to)?.piece?.side

  const press = (square: string, piece: Piece | null): void => {
    if (!canPlay) return
    if (from !== null && targets.includes(square)) {
      if (isPromotion(board.fen, mine, from, square)) {
        setPromoting({ from, to: square })

        return
      }
      onMove({ from, to: square })
      setFrom(null)

      return
    }
    setFrom(piece?.side === mine && from !== square ? square : null)
  }

  return (
    <div className={`chess-board board-${style}`}>
      <div className="chess-grid" role="grid" aria-label={t('notgames.chess.board')}>
        {ordered.map(({ square, piece }, index) => {
          const file = square.charCodeAt(0) - 97
          const rank = Number(square[1])
          const light = (file + rank) % 2 === 1
          const king = piece?.type === 'k' && checked && piece.side !== lastMover
          const label =
            piece === null
              ? square
              : `${square} ${t(`notgames.chess.piece.${piece.side}${piece.type}`)}`

          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              className={[
                'chess-square',
                light ? 'light' : 'dark',
                from === square ? 'selected' : '',
                targets.includes(square) ? (piece === null ? 'target' : 'capture') : '',
                board.lastMove?.from === square || board.lastMove?.to === square ? 'last' : '',
                king ? 'check' : '',
              ].join(' ')}
              aria-label={label}
              aria-pressed={from === square}
              disabled={!canPlay}
              onClick={() => {
                press(square, piece)
              }}
            >
              {piece !== null && (
                <span className={`chess-piece side-${piece.side}`} aria-hidden="true">
                  {GLYPH[piece.type]}
                </span>
              )}
              {/* Coordenadas en el borde, como en un tablero de verdad. */}
              {index % 8 === 0 && <small className="chess-rank">{rank}</small>}
              {index >= 56 && <small className="chess-file">{square[0]}</small>}
            </button>
          )
        })}
      </div>
      {promoting !== null && (
        <div className="chess-promote" role="group" aria-label={t('notgames.chess.promote')}>
          <span>{t('notgames.chess.promote')}</span>
          {PROMOTIONS.map((promotion) => (
            <button
              key={promotion}
              type="button"
              className="pill"
              aria-label={t(`notgames.chess.piece.${mine}${promotion}`)}
              onClick={() => {
                onMove({ ...promoting, promotion })
                setPromoting(null)
                setFrom(null)
              }}
            >
              <span className={`chess-piece side-${mine}`}>{GLYPH[promotion]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
