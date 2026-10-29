/**
 * El modo de la interfaz: cuánto enseña la web.
 *
 * - `simple`  (simplificado): lo esencial para pedir y dar ayuda. Sin la
 *   categoría de datos ni los bloques de cifras.
 * - `normal`: lo de siempre.
 * - `datos` (loco por los datos): todo, con los rankings, las estadísticas y los
 *   desgloses abiertos.
 *
 * Cada elemento dice desde qué modo sale (`from`): uno de `simple` sale en los
 * tres, uno de `datos` solo en el último. El mapa de qué sale dónde está en
 * `docs/interfaz.md`.
 *
 * Se guarda en el navegador y se escribe en `<html data-detail>`, por si una
 * hoja de estilos lo necesita.
 */

import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

export const DETAILS = ['simple', 'normal', 'datos'] as const

export type Detail = (typeof DETAILS)[number]

const KEY = 'sanatorio_detail'
const listeners = new Set<() => void>()

function isDetail(value: unknown): value is Detail {
  return typeof value === 'string' && (DETAILS as readonly string[]).includes(value)
}

function load(): Detail {
  try {
    const stored = localStorage.getItem(KEY)

    return isDetail(stored) ? stored : 'normal'
  } catch {
    return 'normal'
  }
}

let current: Detail = load()

function apply(detail: Detail): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.detail = detail
}

apply(current)

/** Cambia el modo en toda la web. */
export function setDetail(next: Detail): void {
  current = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Dura lo que dure la pestaña.
  }
  apply(next)
  for (const listener of listeners) listener()
}

/** Vuelve a leer lo guardado (para los tests, que vacían el almacenamiento). */
export function reloadDetail(): void {
  current = load()
  apply(current)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/** El modo de ahora; la página se repinta al cambiarlo. */
export function useDetail(): Detail {
  return useSyncExternalStore(subscribe, () => current)
}

/** `true` si un elemento que sale desde el modo `from` se ve en el modo `detail`. */
export function shows(detail: Detail, from: Detail): boolean {
  return DETAILS.indexOf(detail) >= DETAILS.indexOf(from)
}

/** Lo de dentro solo sale desde el modo `from`. */
export function Show({ from, children }: { from: Detail; children: ReactNode }) {
  return shows(useDetail(), from) ? <>{children}</> : null
}
