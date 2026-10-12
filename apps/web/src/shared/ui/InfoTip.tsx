import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../i18n'
import { usePrefs } from '../layout/store'
import { Icon } from './Icon'

type InfoTipProps = {
  /** De qué habla la explicación: título de la ventana y nombre del botón. */
  title: string
  /** La explicación. Solo se monta con la ventana abierta. */
  children: ReactNode
}

/**
 * El icono de información que va junto a un título: al pulsarlo abre una
 * ventana con la explicación de esa parte de la web.
 *
 * Es lo que sustituye a los párrafos fijos de ayuda: quien ya sabe cómo
 * funciona no tiene que leerlos cada vez, y quien no, los tiene a un clic. Se
 * pueden esconder todos en Personalizar.
 */
export function InfoTip({ title, children }: InfoTipProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  // Quien ya se sabe la web puede esconderlos en Personalizar.
  const hidden = usePrefs().tips === false

  useEffect(() => {
    if (open && dialog.current?.open === false) dialog.current.showModal()
  }, [open])

  if (hidden) return null

  return (
    <>
      <button
        type="button"
        className="info-tip"
        aria-label={t('info.open', { title })}
        title={t('info.open', { title })}
        onClick={() => {
          setOpen(true)
        }}
      >
        <Icon name="info" />
      </button>
      {/* Fuera del título: dentro heredaría su tamaño de letra. */}
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className="layout-dialog info-dialog"
            aria-label={title}
            onClose={() => {
              setOpen(false)
            }}
            onClick={(event) => {
              // Un clic en el fondo (fuera de la ficha) la cierra.
              if (event.target === dialog.current) dialog.current.close()
            }}
          >
            <div className="layout-head">
              <h3>{title}</h3>
              <button
                type="button"
                className="link"
                aria-label={t('layout.close')}
                onClick={() => {
                  dialog.current?.close()
                }}
              >
                <Icon name="cerrar" />
              </button>
            </div>
            <div className="info-body">{children}</div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
