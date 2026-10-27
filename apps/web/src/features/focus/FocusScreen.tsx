import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { cover } from '../../shared/still'
import { Icon } from '../../shared/ui/Icon'
import { FocusSound } from './FocusSound'

/**
 * El Pomodoro a pantalla completa (#80 del buzón): el tiempo que queda en
 * grande y, para quien pase por al lado, «en concentración · no molestar».
 *
 * Es una ventana modal, fuera de la web (en `body`), que la tapa entera y,
 * si el navegador deja, pide además la pantalla completa de verdad. Va siempre
 * encima: si se abre otra ventana (un aviso, una petición de ayuda), se vuelve
 * a poner delante. Mientras está, la web de debajo ni se pinta ni gasta
 * (`cover`). Salir de ella (el botón, Escape o
 * cuando el navegador quita la pantalla completa) pregunta si de verdad se
 * quiere parar; «quitar pantalla completa» solo la cierra, sin parar nada.
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
  const exit = useRef(onExit)

  exit.current = onExit

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

    // La de verdad es un extra: sin ella (o sin permiso, o en un móvil que no
    // la tiene) la ventana ya lo tapa todo.
    const root: { requestFullscreen?: () => Promise<void> } = document.documentElement

    if (root.requestFullscreen !== undefined) void root.requestFullscreen().catch(() => undefined)

    const changed = (): void => {
      if (document.fullscreenElement === null && !leaving.current) exit.current()
    }

    document.addEventListener('fullscreenchange', changed)

    return () => {
      leaving.current = true
      watcher.disconnect()
      cover(false)
      document.removeEventListener('fullscreenchange', changed)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const time = useFormat().time(until)

  return createPortal(
    <dialog
      ref={dialog}
      className="focus-screen"
      aria-label={t('focus.screen.label')}
      onCancel={(event) => {
        event.preventDefault()
        onExit()
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
