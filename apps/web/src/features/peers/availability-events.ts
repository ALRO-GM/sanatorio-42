/**
 * Avisa de que alguien ha encendido o apagado su interruptor de guardia, para
 * que lo que depende de eso (la página de guardia) se ponga al día sin
 * recargar. Es un evento de la ventana, como `openChat`: quien escucha no tiene
 * que saber quién lo lanza.
 */

const EVENT = 'sanatorio:availability'

export function announceAvailability(available: boolean): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: available }))
}

/** Escucha los cambios del interruptor. Devuelve cómo dejar de escuchar. */
export function onAvailability(listener: (available: boolean) => void): () => void {
  const handler = (event: Event): void => {
    listener((event as CustomEvent<boolean>).detail)
  }

  window.addEventListener(EVENT, handler)

  return () => {
    window.removeEventListener(EVENT, handler)
  }
}
