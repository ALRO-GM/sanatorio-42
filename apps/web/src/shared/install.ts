/**
 * Instalar Peer4U como aplicación (pedido por Alberto el 2026-11-08).
 *
 * Chrome, Edge y los navegadores de Android avisan con `beforeinstallprompt`
 * de que se puede instalar; ese aviso llega una vez y pronto, a veces antes
 * de que React pinte, así que se escucha desde `main.tsx` y se guarda aquí.
 * Safari en iPhone y iPad no tiene ese aviso: se instala a mano desde
 * Compartir, y lo único que se puede hacer es explicarlo. Firefox de
 * escritorio no instala webs: allí no sale nada.
 */

import { useSyncExternalStore } from 'react'

/** El aviso de Chrome; no está en los tipos de TypeScript. */
type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pending: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()

const changed = (): void => {
  for (const listener of listeners) listener()
}

/** Ya abierta como aplicación (desde el icono del escritorio o de la pantalla de inicio). */
function standalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Safari en iPhone o iPad (los iPad nuevos dicen ser un Mac con pantalla táctil). */
function appleMobile(): boolean {
  const ua = navigator.userAgent
  const ios =
    /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)

  // En iOS, Chrome y los demás también usan Safari por dentro, pero solo
  // Safari tiene «Añadir a pantalla de inicio» a mano de forma fiable.
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

/** Se llama una vez al arrancar, antes de pintar. */
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sin esto, Chrome enseña su propia barra; el botón de la cabecera la sustituye.
    event.preventDefault()
    pending = event as InstallPrompt
    changed()
  })
  window.addEventListener('appinstalled', () => {
    pending = null
    installed = true
    changed()
  })
}

/** Qué se puede hacer: instalar con el aviso del navegador, explicar cómo (Safari) o nada. */
type InstallWay = 'prompt' | 'apple' | null

function way(): InstallWay {
  if (installed || standalone()) return null
  if (pending !== null) return 'prompt'

  return appleMobile() ? 'apple' : null
}

export function useInstall(): { way: InstallWay; install: () => Promise<void> } {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    way,
    () => null,
  )

  return {
    way: current,
    install: async () => {
      const prompt = pending

      if (prompt === null) return

      // El aviso solo se puede usar una vez, acepte o no.
      pending = null
      await prompt.prompt()

      if ((await prompt.userChoice).outcome === 'accepted') installed = true
      changed()
    },
  }
}
