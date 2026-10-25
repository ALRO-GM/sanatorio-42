/**
 * Lo que puede ver quien ha entrado (`docs/piscineros.md`): un estudiante, todo;
 * un piscinero, lo que permite el panel. Se pregunta una vez al entrar
 * (`GET /pool/access`). La API corta igual lo que no se permite: esto solo
 * evita enseñar botones que darían 403.
 */

import { useSyncExternalStore } from 'react'

import type { PoolAccess, PoolKey } from '@sanatorio/contracts'

import { api } from './api'

/** Mientras no se sabe, como estudiante: la API es la que corta. */
let current: PoolAccess = { pool: false, allow: null }
const listeners = new Set<() => void>()

function set(next: PoolAccess): void {
  current = next
  document.documentElement.dataset.pool = next.pool ? 'on' : 'off'
  // La franja de la vista de piscinero deja su hueco arriba (`styles/admin.css`).
  document.documentElement.dataset.poolPreview = next.preview === true ? 'on' : 'off'
  for (const listener of listeners) listener()
}

/** Al salir de la web con sesión: lo de esta sesión no vale para la siguiente. */
export function resetPoolAccess(): void {
  set({ pool: false, allow: null })
}

/** Pregunta qué se puede ver. Una vez, al montar la web con sesión. */
export async function loadPoolAccess(): Promise<void> {
  try {
    set(await api.getPoolAccess())
  } catch {
    // Sin respuesta, se queda como estaba.
  }
}

export function usePoolAccess(): PoolAccess {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => current,
  )
}

/** Si se puede ver esto: un estudiante, siempre; un piscinero, si está permitido. */
export function poolAllows(key: PoolKey, access: PoolAccess = current): boolean {
  return access.allow === null || access.allow.includes(key)
}

/** Si se puede ver esto, para pintar o no un elemento. */
export function usePoolAllows(key: PoolKey): boolean {
  return poolAllows(key, usePoolAccess())
}

/**
 * Entra en la vista de piscinero (quien administra) o sale de ella. La API
 * cambia la cookie; la web se carga de nuevo para que nada de lo pedido con la
 * otra vista (expediente, pulso, permisos) se quede pintado. Al entrar se
 * empieza por la portada; al salir, se vuelve al panel.
 */
export async function switchPoolPreview(on: boolean): Promise<void> {
  await (on ? api.startPoolPreview() : api.stopPoolPreview())
  window.location.hash = on ? '#/expediente' : '#/gestion'
  window.location.reload()
}
