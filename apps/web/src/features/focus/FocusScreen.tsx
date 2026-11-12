import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { cover } from '../../shared/still'
import { Icon } from '../../shared/ui/Icon'
import { FocusSound } from './FocusSound'
import { StartupStrip } from './startup/StartupStrip'
import { useWakeLock } from './useWakeLock'

/**
 * El Pomodoro a pantalla completa (#80 del buzón): el tiempo que queda en
 * grande y, para quien pase por al lado, «en concentración · no molestar».
 *
 * Es una ventana modal, fuera de la web (en `body`), que la tapa entera y,
 * si el navegador deja, pide además la pantalla completa de verdad. Va siempre
 * encima: si se abre otra ventana (un aviso, una petición de ayuda), se vuelve
 * a poner delante. Mientras está, la web de debajo ni se pinta ni gasta
 * (`cover`). «Parar la sesión» pregunta si de verdad se quiere parar; lo
 * demás solo la quita, sin parar nada.
 *
 * Escape, en dos pasos (pedido por Alberto, 2026-11-12): el primero lo usa el
 * navegador para quitar la pantalla completa de verdad, y la ventana sigue
 * tapando la web; el segundo la cierra y vuelve al temporizador pequeño. Antes
 * el primero preguntaba si parar, y al tercero Chrome cerraba la ventana a la
 * fuerza (no deja frenar Escape dos veces seguidas sin un clic) con la web aún
 * tapada: todo en negro. Por eso, si el navegador la cierra por su cuenta,
 * también se vuelve al temporizador pequeño.
 *
 * @param onExit Quiere acabar la sesión: se le pregunta.
 * @param onShrink Vuelve al temporizador pequeño, sin parar.
 * @param children Lo que salga encima (el «¡bien hecho!» de seguir).
 */
export function FocusScreen({
  left,
  until,
  share,
  onExit,
  onShrink,
  children,
}: {
  left: string
  until: number
  share: number
  onExit: () => void
  onShrink: () => void
  children?: ReactNode
}) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  // Al quitarla con el botón, el aviso de que se ha salido no es una huida.
  const leaving = useRef(false)
  const shrink = useRef(onShrink)

  shrink.current = onShrink

  useEffect(() => {
    const element = dialog.current

    if (element?.open === false) element.showModal()
    cover(true)

    // Otra ventana modal se abriría por encima: se vuelve a poner delante.
    // Solo por las que se abren nuevas (las de dentro, como la pregunta de
    // parar, ya van encima): cerrar y abrir esta también cambia el DOM.
    const seen = new Set<Element>()
    const front = (): void => {
      if (element === null) return
      for (const old of seen) if (!old.hasAttribute('open')) seen.delete(old)

      const fresh = [...document.querySelectorAll('dialog[open]')].filter(
        (other) => other !== element && !element.contains(other) && !seen.has(other),
      )

      if (fresh.length === 0) return
      for (const other of fresh) seen.add(other)
      element.close()
      element.showModal()
    }
    const watcher = new MutationObserver(front)

    watcher.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    })

    // La de verdad es un extra: sin ella (o sin permiso, o en un iPhone, que
    // no la tiene) la ventana ya lo tapa todo. Safari la tiene con prefijo.
    // Quitarla (Escape, F11) no cierra nada: la ventana sigue tapando la web.
    enterFullscreen()

    return () => {
      leaving.current = true
      watcher.disconnect()
      cover(false)
      leaveFullscreen()
    }
  }, [])

  // En el móvil, que la pantalla no se apague: el tiempo y el aviso, siempre a la vista.
  useWakeLock()

  const time = useFormat().time(until)

  return createPortal(
    <dialog
      ref={dialog}
      className="focus-screen"
      aria-label={t('focus.screen.label')}
      onCancel={(event) => {
        // El Escape de una ventana de dentro (la pregunta de parar) es suyo.
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        // Si el navegador no se ha quedado el Escape, primero la de verdad.
        if (fullscreenElement() !== null) {
          leaveFullscreen()

          return
        }
        leaving.current = true
        onShrink()
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return
        // Cerrada por el navegador (o al ponerse delante, que se reabre al momento).
        if (!leaving.current && dialog.current?.open === false) {
          leaving.current = true
          shrink.current()
        }
      }}
    >
      <p className="focus-sign">
        <Icon name="reloj" size={28} /> {t('focus.screen.sign')}
      </p>
      <div className="focus-big" role="timer" aria-label={t('focus.timerLabel')}>
        <span className="focus-big-bar" aria-hidden="true">
          <i style={{ width: `${share * 100}%` }} />
        </span>
        <strong>{left}</strong>
        <small>{t('focus.screen.until', { time })}</small>
      </div>
      <FocusSound />
      <StartupStrip />
      {children}
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            leaving.current = true
            onShrink()
          }}
        >
          {t('focus.screen.shrink')}
        </button>
        <button type="button" className="primary" onClick={onExit}>
          {t('focus.screen.exit')}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}

/** La pantalla completa con y sin el prefijo de Safari. */
type Fullscreen = {
  requestFullscreen?: () => Promise<void>
  webkitRequestFullscreen?: () => void
}
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}

/** Pide la pantalla completa; `true` si el navegador la tiene. */
function enterFullscreen(): boolean {
  const root: Fullscreen = document.documentElement

  if (root.requestFullscreen !== undefined) {
    void root.requestFullscreen().catch(() => undefined)

    return true
  }
  if (root.webkitRequestFullscreen !== undefined) {
    root.webkitRequestFullscreen()

    return true
  }

  return false
}

function fullscreenElement(): Element | null {
  const page = document as FullscreenDocument

  return page.fullscreenElement ?? page.webkitFullscreenElement ?? null
}

function leaveFullscreen(): void {
  const page = document as FullscreenDocument

  if (page.fullscreenElement) void page.exitFullscreen().catch(() => undefined)
  else if (page.webkitFullscreenElement) page.webkitExitFullscreen?.()
}
