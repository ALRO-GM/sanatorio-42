/**
 * El modo Pomodoro (#65 del buzón), en la web: si estás concentrado, hasta
 * cuándo y qué quieres seguir viendo. Mientras dura, `<html data-focus="on">`:
 * el CSS esconde lo de los juegos, la navegación se queda con las secciones
 * elegidas y solo saltan los avisos elegidos (los obligatorios de un evento con
 * más gente, siempre).
 */

import { useSyncExternalStore } from 'react'

import type { Focus, FocusSettings, FocusShow } from '@sanatorio/contracts'

import { api } from './api'

let current: Focus | null = null
let timer: number | undefined
const listeners = new Set<() => void>()

/** Si ahora mismo se está concentrado (y no en el descanso). */
export function focusing(focus: Focus | null = current): boolean {
  return focus?.until !== null && focus?.until !== undefined && Date.parse(focus.until) > Date.now()
}

function set(next: Focus | null): void {
  current = next
  document.documentElement.dataset.focus = focusing(next) ? 'on' : 'off'
  window.clearTimeout(timer)
  // Al acabar la concentración, todo vuelve solo.
  if (focusing(next) && next?.until !== undefined && next.until !== null) {
    timer = window.setTimeout(
      () => {
        set(current)
      },
      Date.parse(next.until) - Date.now() + 50,
    )
  }
  for (const listener of listeners) listener()
}

export async function loadFocus(): Promise<void> {
  try {
    set(await api.getFocus())
  } catch {
    // Sin respuesta, sin Pomodoro: la web va como siempre.
  }
}

export async function startFocus(settings: FocusSettings): Promise<void> {
  set(await api.startFocus(settings))
}

export async function stopFocus(): Promise<void> {
  set(await api.stopFocus())
}

export function useFocus(): Focus | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => current,
  )
}

/** Si, concentrado, se quiere seguir viendo esto (sin concentrarse, todo). */
export function shows(what: FocusShow, focus: Focus | null = current): boolean {
  return !focusing(focus) || (focus?.settings.show.includes(what) ?? true)
}
