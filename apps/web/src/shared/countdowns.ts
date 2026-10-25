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

const PAGE_EVENT = 'sanatorio:countdown-page'
/** La vista del calendario elegida (calendario o cuentas atrás), en este navegador. */
export const CALENDAR_TAB_KEY = 'sanatorio_calendar_tab'

/** Lleva al calendario, a su vista de cuentas atrás. */
export function openCountdownsPage(): void {
  try {
    localStorage.setItem(CALENDAR_TAB_KEY, 'countdowns')
  } catch {
    // Sin almacenamiento, el aviso de abajo basta si el calendario ya está abierto.
  }
  window.dispatchEvent(new CustomEvent(PAGE_EVENT))
  window.location.hash = '#/calendario'
}

/** Escucha las peticiones de `openCountdownsPage`. Devuelve cómo dejar de escuchar. */
export function onOpenCountdownsPage(listener: () => void): () => void {
  window.addEventListener(PAGE_EVENT, listener)

  return () => {
    window.removeEventListener(PAGE_EVENT, listener)
  }
}

/** El final del día de entrega de una meta de la agenda: hasta ahí cuenta su cuenta atrás. */
export const goalDeadline = (day: string): string => new Date(`${day}T23:59:00`).toISOString()

/**
 * La cuenta atrás de una meta de la agenda, si está fijada. Es una propia con
 * el título de la meta (`scrum.pin.title`) y el final de su día: así se
 * reconoce desde la agenda y desde el formulario de fijar.
 */
export const goalPinOf = (
  list: Countdown[] | null,
  title: string,
  day: string,
): Countdown | undefined =>
  (list ?? []).find(
    (entry) => entry.kind === 'custom' && entry.title === title && entry.at === goalDeadline(day),
  )

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
