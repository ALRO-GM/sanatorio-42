import { useEffect, useRef } from 'react'
import type { ReactNode, Ref, RefObject } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../i18n'
import { Icon } from './Icon'

type ModalProps = {
  /** Nombre de la ventana para quien no la ve. */
  label: string
  /** Si viene, la cabecera: el título y el botón de cerrar. */
  title?: ReactNode
  /** Cuando la ventana se cierra, por el motivo que sea. */
  onClose: () => void
  className?: string
  children: ReactNode
  /** Un clic en el fondo (fuera de la ventana) la cierra. */
  closeOnBackdrop?: boolean
  /** Escape la cierra. `false` en las obligatorias. */
  cancelable?: boolean
  /** Qué hacer con Escape en vez de cerrar (por ejemplo, preguntar). */
  onEscape?: () => void
  /** Pintarla en `document.body`: para salir de un título o de un contenedor con `overflow`. */
  portal?: boolean
  /** Qué recibe el foco al abrirse; si no, el navegador elige el primer control. */
  initialFocus?: RefObject<HTMLElement | null>
  /** Para cerrarla desde dentro (`ref.current?.close()`). */
  ref?: Ref<HTMLDialogElement>
}

/**
 * El armazón de las ventanas de la web (buzón, personalizar, Pomodoro, ayuda
 * de cada sección…): un `<dialog>` modal que se abre solo al montarse y que se
 * cierra igual en todas: con su botón, con Escape y pulsando el fondo. Antes
 * cada ventana repetía el `showModal()` y decidía por su cuenta cómo cerrarse.
 *
 * El navegador se encarga de que el foco no se escape y de devolverlo a donde
 * estaba. Las ventanas obligatorias (`cancelable={false}`) no se van con
 * Escape ni con el fondo.
 */
export function Modal({
  label,
  title,
  onClose,
  className = '',
  children,
  closeOnBackdrop = true,
  cancelable = true,
  onEscape,
  portal = false,
  initialFocus,
  ref,
}: ModalProps) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    // Sin limpieza a propósito: cerrar aquí dispararía `onClose` en el doble
    // montaje de desarrollo y la ventana se cerraría nada más abrirse. Al
    // desmontarse, el `<dialog>` desaparece con su capa.
    if (dialog.current?.open === false) dialog.current.showModal()
    initialFocus?.current?.focus()
    // Solo al abrirse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const element = (
    <dialog
      ref={(node) => {
        dialog.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref !== undefined && ref !== null) ref.current = node
      }}
      className={`layout-dialog ${className}`.trim()}
      aria-label={label}
      onClose={onClose}
      onCancel={(event) => {
        if (onEscape !== undefined) {
          event.preventDefault()
          onEscape()
        } else if (!cancelable) {
          event.preventDefault()
        }
      }}
      onClick={(event) => {
        // El propio `<dialog>` es el fondo: un clic en él (y no en su contenido) cierra.
        if (closeOnBackdrop && cancelable && event.target === dialog.current) dialog.current.close()
      }}
    >
      {title !== undefined && (
        <div className="layout-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="link"
            aria-label={t('layout.close')}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="cerrar" />
          </button>
        </div>
      )}
      {children}
    </dialog>
  )

  return portal ? createPortal(element, document.body) : element
}
