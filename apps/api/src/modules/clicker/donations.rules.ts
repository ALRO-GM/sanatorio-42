/**
 * Code Clicker: cuántos puntos de evaluación ha donado alguien a la bolsa de
 * 42, a partir de su historial de puntos. Una donación es un movimiento que
 * resta puntos y en cuyo motivo sale «pool».
 */

type PointMove = { reason: string; sum: number }

export function donatedPoints(moves: readonly PointMove[]): number {
  return moves.reduce(
    (total, move) =>
      /pool/i.test(move.reason) && move.sum < 0 ? total + Math.round(-move.sum) : total,
    0,
  )
}
