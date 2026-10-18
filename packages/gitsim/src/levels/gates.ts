/**
 * Las pruebas de grupo y el jefe final: van en el tronco del camino, detrás de
 * un mundo. Antes de cada una, un test de preguntas rápidas con el 100 % de
 * aciertos (si se falla, una hora de espera).
 */

export type Gate = {
  id: 'group1' | 'group2' | 'group3' | 'boss'
  kind: 'group' | 'boss'
  /** El punto del camino que hay que haber superado. */
  after: string
  /** Cuántas personas, como poco. */
  min: number
  /** Hasta qué mundo entra en el test previo. */
  upTo: number
}

export const GATES: readonly Gate[] = [
  { id: 'group1', kind: 'group', after: 'w1-world', min: 2, upTo: 1 },
  { id: 'group2', kind: 'group', after: 'w4-world', min: 3, upTo: 4 },
  { id: 'group3', kind: 'group', after: 'w5-world', min: 3, upTo: 5 },
  { id: 'boss', kind: 'boss', after: 'w5-world', min: 2, upTo: 5 },
]

export function gateOf(id: string): Gate | undefined {
  return GATES.find((gate) => gate.id === id)
}
