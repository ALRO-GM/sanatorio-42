import { useSyncExternalStore } from 'react'

/**
 * La calidad de los dibujos de la startup, que elige cada cual en su
 * navegador: 8 bits (la de siempre) o 16 bits (el doble de resolución, más
 * tonos y lo escrito a mano suavizado, `sprite.ts`). Para añadir otra, una
 * entrada aquí con sus píxeles por píxel del dibujo: el motor ya lo admite.
 */
export const QUALITIES = [8, 16] as const
export type Quality = (typeof QUALITIES)[number]

/** Píxeles de verdad por píxel del dibujo, y si lleva el sombreado rico. */
export const DENSITY: Record<Quality, { scale: number; rich: boolean }> = {
  8: { scale: 1, rich: false },
  16: { scale: 2, rich: true },
}

const KEY = 'sanatorio_pixel_quality'
const listeners = new Set<() => void>()

function read(): Quality {
  try {
    const saved = Number(localStorage.getItem(KEY))

    return QUALITIES.find((quality) => quality === saved) ?? 8
  } catch {
    return 8
  }
}

let current: Quality = typeof window === 'undefined' ? 8 : read()

export function setQuality(next: Quality): void {
  current = next
  try {
    localStorage.setItem(KEY, String(next))
  } catch {
    // Dura lo que dure la pestaña.
  }
  for (const listener of listeners) listener()
}

/** La calidad elegida; cambia en todas las vistas a la vez. */
export function useQuality(): Quality {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    () => current,
    () => 8,
  )
}
