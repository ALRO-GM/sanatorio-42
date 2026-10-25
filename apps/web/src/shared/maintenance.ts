/**
 * El modo mantenimiento en la web (`docs/mantenimiento.md`): si está puesto y
 * si quien mira puede seguir usando la web (quien administra, sí).
 *
 * Se pregunta al abrir la web; después lo cuenta cualquier petición que vuelva
 * con un `503` de mantenimiento (`onMaintenance` de `api/http.ts`) y, a quien
 * administra, el pulso. Quien lo cambia en el panel lo deja aquí al momento.
 */

import { useSyncExternalStore } from 'react'

import type { Maintenance, MaintenanceStatus } from '@sanatorio/contracts'

import { api, onMaintenance } from './api'

let current: MaintenanceStatus | null = null
const listeners = new Set<() => void>()

function set(next: MaintenanceStatus | null): void {
  current = next
  for (const listener of listeners) listener()
}

/** Pregunta cómo está. Sin respuesta, se queda lo que se sabía. */
export async function loadMaintenance(): Promise<void> {
  try {
    set(await api.getMaintenance())
  } catch {
    // Sin servidor ya lo dice la pantalla de «no hay servidor».
  }
}

/** Lo que acaba de guardar quien administra en el panel: a quien lo guarda no le cierra nada. */
export function maintenanceSaved(next: Maintenance): void {
  set({ ...next, exempt: true })
}

// Una petición rechazada por mantenimiento: se cierra ya, y se pregunta el mensaje.
onMaintenance((until) => {
  set({
    on: true,
    message: current?.message ?? null,
    since: current?.since ?? null,
    until,
    exempt: false,
  })
  void loadMaintenance()
})

/** `true` si a quien mira le toca la pantalla de mantenimiento. */
export const shutOut = (status: MaintenanceStatus | null): status is MaintenanceStatus =>
  status !== null && status.on && !status.exempt

export function useMaintenance(): MaintenanceStatus | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => current,
  )
}
