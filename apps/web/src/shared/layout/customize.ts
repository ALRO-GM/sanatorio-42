/**
 * Abrir «Personalizar» desde cualquier página, no solo desde el menú de la
 * cuenta (donde se descubría tarde). Como `openChat`: un evento que escucha la
 * aplicación.
 */

const OPEN_EVENT = 'sanatorio:customize'

export function openCustomize(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

/** Escucha las peticiones de `openCustomize`. Devuelve cómo dejar de escuchar. */
export function onOpenCustomize(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener)

  return () => {
    window.removeEventListener(OPEN_EVENT, listener)
  }
}
