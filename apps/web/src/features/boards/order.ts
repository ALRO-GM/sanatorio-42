import type { BoardView as Board } from '@sanatorio/contracts'

/**
 * Las pizarras en el orden en que interesan: primero las que no han
 * terminado, de la más cercana a la más lejana; después las pasadas, de la más
 * reciente hacia atrás (el histórico).
 */
export function orderBoards(
  boards: readonly Board[],
  now: number,
): { coming: Board[]; past: Board[] } {
  const start = (board: Board): number => Date.parse(board.startsAt)
  const coming = boards.filter((board) => Date.parse(board.endsAt) > now)
  const past = boards.filter((board) => Date.parse(board.endsAt) <= now)

  return {
    coming: coming.sort((a, b) => start(a) - start(b)),
    past: past.sort((a, b) => start(b) - start(a)),
  }
}
