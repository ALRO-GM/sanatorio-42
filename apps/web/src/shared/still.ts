/**
 * La web «quieta»: la pestaña está oculta, la ventana no tiene el foco o hace
 * un rato que nadie toca nada. Entonces no tiene sentido animar: se escribe
 * `data-still="on"` en `<html>` y el CSS pausa todas las animaciones
 * (`styles/comfort.css`); Code Clicker, además, refresca menos.
 *
 * Una animación que no para obliga al navegador a sacar fotogramas sin
 * descanso aunque nadie mire, y con la web abierta un rato calentaba el
 * ordenador y el móvil. Al mover el ratón, tocar o pulsar una tecla, todo
 * vuelve a moverse.
 */

import { useSyncExternalStore } from 'react'

/** Sin tocar nada durante este tiempo, la web se queda quieta. */
export const STILL_AFTER_MS = 30_000

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

let still = false
let last = 0
let timer: number | undefined
const listeners = new Set<() => void>()

function set(next: boolean): void {
  if (next === still) return

  still = next
  document.documentElement.dataset.still = next ? 'on' : 'off'

  for (const listener of listeners) listener()
}

/** Se mira cuándo fue lo último y, si aún no toca, se vuelve a mirar cuando toque. */
function check(): void {
  window.clearTimeout(timer)

  if (document.hidden || !document.hasFocus()) {
    set(true)

    return
  }

  const left = last + STILL_AFTER_MS - Date.now()

  if (left <= 0) {
    set(true)

    return
  }

  set(false)
  timer = window.setTimeout(check, left)
}

function active(): void {
  last = Date.now()
  // Solo se recalcula al despertar: mientras se usa, el temporizador ya está
  // puesto y, al saltar, ve la última actividad.
  if (still) check()
}

/** Empieza a vigilar. Una vez, al arrancar la web. */
export function watchStill(): void {
  last = Date.now()
  document.documentElement.dataset.still = 'off'

  for (const name of ACTIVITY)
    window.addEventListener(name, active, { passive: true, capture: true })

  window.addEventListener('focus', active)
  window.addEventListener('blur', check)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) check()
    else active()
  })
  check()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/** `true` mientras la web está quieta. */
export function useStill(): boolean {
  return useSyncExternalStore(subscribe, () => still)
}
