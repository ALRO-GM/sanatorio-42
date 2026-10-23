import { useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { usePrefs } from '../layout/store'
import { Icon } from './Icon'
import { Modal } from './Modal'

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
  // Quien ya se sabe la web puede esconderlos en Personalizar.
  const hidden = usePrefs().tips === false

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
      {/* Fuera del título (en `body`): dentro heredaría su tamaño de letra. */}
      {open && (
        <Modal
          portal
          label={title}
          title={title}
          className="info-dialog"
          onClose={() => {
            setOpen(false)
          }}
        >
          <div className="info-body">{children}</div>
        </Modal>
      )}
    </>
  )
}
