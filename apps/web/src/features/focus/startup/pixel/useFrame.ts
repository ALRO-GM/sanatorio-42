import { createContext, useContext, useState, useSyncExternalStore } from 'react'

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
 * Dentro de la pantalla del Pomodoro, los dibujos se mueven aunque la web esté
 * quieta: esa pantalla tapa la web (que entonces se marca quieta) y quien se
 * concentra no toca nada, pero es justo lo que se mira. Solo se paran con la
 * pestaña escondida.
 */
export const AwakeFrames = createContext(false)

function subscribeHidden(listener: () => void): () => void {
  document.addEventListener('visibilitychange', listener)

  return () => {
    document.removeEventListener('visibilitychange', listener)
  }
}

/**
 * El fotograma de las animaciones en píxeles. Se queda quieto con «menos
 * movimiento» pedido al sistema y con la web quieta (`shared/still.ts`), salvo
 * dentro de `AwakeFrames`, donde solo para con la pestaña escondida.
 */
export function useFrame(): number {
  const awake = useContext(AwakeFrames)
  const still = useStill()
  const hidden = useSyncExternalStore(subscribeHidden, () => document.hidden)
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const stopped = calm || (awake ? hidden : still)

  return useSyncExternalStore(stopped ? idle : subscribe, () => frame)
}
