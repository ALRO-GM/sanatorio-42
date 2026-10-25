/**
 * Abrir «Personalizar» desde cualquier página, no solo desde el menú de la
 * cuenta (donde se descubría tarde). Como `openChat`: un evento que escucha la
 * aplicación.
 */

const OPEN_EVENT = 'sanatorio:customize'

/** La pestaña del estudio con la que se abre: el estilo, el orden o los ajustes. */
export type StudioTab = 'style' | 'order' | 'settings'

export function openCustomize(tab: StudioTab = 'style'): void {
  window.dispatchEvent(new CustomEvent<StudioTab>(OPEN_EVENT, { detail: tab }))
}

/** Escucha las peticiones de `openCustomize`. Devuelve cómo dejar de escuchar. */
export function onOpenCustomize(listener: (tab: StudioTab) => void): () => void {
  const handler = (event: Event): void => {
    listener(event instanceof CustomEvent ? (event.detail as StudioTab) : 'style')
  }

  window.addEventListener(OPEN_EVENT, handler)

  return () => {
    window.removeEventListener(OPEN_EVENT, handler)
  }
}
