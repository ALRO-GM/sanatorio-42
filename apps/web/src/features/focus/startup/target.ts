import { canMove, canPlace } from '@sanatorio/startup'
import type { StartupAction, StartupState } from '@sanatorio/startup'

import type { Piece } from './pixel/layout'

/**
 * Lo que se tiene elegido para moverlo en la oficina: una pieza de decoración
 * (`d:3`, su número) o algo que no es decoración, por su clave (`desk:0`,
 * `rack:1`, `whiteboard`…, `fixturesOf`). Todo se mueve igual.
 */
export type Target = string

export const decorTarget = (index: number): Target => `d:${String(index)}`

/** El número de la decoración, si lo elegido es decoración. */
export function decorIndex(target: Target): number | null {
  return target.startsWith('d:') ? Number(target.slice(2)) : null
}

/** Lo que es una pieza del dibujo, si se puede mover. */
export const targetOf = (piece: Piece): Target | undefined =>
  piece.decor !== undefined ? decorTarget(piece.decor) : piece.fixture

/** Si lo elegido puede ir a (gx, gy). */
export function canPut(state: StartupState, target: Target, gx: number, gy: number): boolean {
  const index = decorIndex(target)

  return index === null ? canMove(state, target, gx, gy) : canPlace(state, index, gx, gy)
}

/** La acción de llevar lo elegido a (gx, gy). */
export function putAction(
  state: StartupState,
  target: Target,
  gx: number,
  gy: number,
): StartupAction {
  const index = decorIndex(target)

  return index === null
    ? { type: 'move', key: target, gx, gy }
    : { type: 'place', index, gx, gy, turn: state.decor[index]?.turn ?? false }
}
