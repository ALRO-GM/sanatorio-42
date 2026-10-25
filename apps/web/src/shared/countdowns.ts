/**
 * Las cuentas atrás de quien mira (`docs/avisos-cuenta-atras.md`): los avisos
 * de quien administra y lo que se ha fijado. Las enseña la ventanita flotante
 * (`features/countdowns`) y se fijan desde cualquier sitio (un evento del
 * calendario), así que viven aquí y no dentro de una funcionalidad.
 *
 * Lo cerrado lo guarda la API: al cerrar un aviso aquí, no vuelve a salir en
 * ningún otro navegador.
 */

import { useSyncExternalStore } from 'react'

import type { Countdown, CountdownPinInput } from '@sanatorio/contracts'

import { api } from './api'

let current: Countdown[] | null = null
const listeners = new Set<() => void>()

function set(next: Countdown[]): void {
  current = next
  for (const listener of listeners) listener()
}

/** Las pide de nuevo. Sin respuesta, se quedan las que había. */
export async function loadCountdowns(): Promise<void> {
  try {
    set(await api.getCountdowns())
  } catch {
    // La ventanita no es imprescindible: sin ella, la web sigue igual.
  }
}

/** Fija una. El fallo (ya hay demasiadas, el evento ya empezó) es para quien lo pide. */
export async function pinCountdown(input: CountdownPinInput): Promise<void> {
  set(await api.pinCountdown(input))
}

export async function unpinCountdown(id: number): Promise<void> {
  set(await api.unpinCountdown(id))
}

export async function dismissCountdown(id: number): Promise<void> {
  set(await api.dismissCountdown(id))
}

const PICK_EVENT = 'sanatorio:countdown-pick'

/** Abre la ventanita con el formulario de fijar (el próximo compromiso o uno propio). */
export function openCountdownPicker(): void {
  window.dispatchEvent(new CustomEvent(PICK_EVENT))
}

/** Escucha las peticiones de `openCountdownPicker`. Devuelve cómo dejar de escuchar. */
export function onOpenCountdownPicker(listener: () => void): () => void {
  window.addEventListener(PICK_EVENT, listener)

  return () => {
    window.removeEventListener(PICK_EVENT, listener)
  }
}

/** Lo fijado de ese evento del calendario, si lo está. */
export const pinOf = (list: Countdown[] | null, eventId: string): Countdown | undefined =>
  (list ?? []).find((entry) => entry.kind === 'event' && entry.eventId === eventId)

export function useCountdowns(): Countdown[] | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => current,
  )
}
