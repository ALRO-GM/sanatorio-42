import { useState, useSyncExternalStore } from 'react'

import { useStill } from '../../../../shared/still'

/** Fotogramas por segundo: el ritmo de los juegos de píxeles, y gasta poco. */
const FPS = 6

let frame = 0
let timer: number | undefined
const listeners = new Set<() => void>()

/** Un solo reloj para todos los dibujos: solo corre mientras alguno mira. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  timer ??= window.setInterval(() => {
    frame += 1
    for (const each of listeners) each()
  }, 1000 / FPS)

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

const idle = (): (() => void) => () => undefined

/**
 * El fotograma de las animaciones en píxeles. Se queda quieto con «menos
 * movimiento» pedido al sistema y con la web quieta (`shared/still.ts`).
 */
export function useFrame(): number {
  const still = useStill()
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  return useSyncExternalStore(calm || still ? idle : subscribe, () => frame)
}
