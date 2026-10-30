import { createContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { usePrefs } from '../layout/store'
import { Icon } from './Icon'
import { Modal } from './Modal'

/**
 * El evento con el que el interrogante de la cabecera abre la demostración de
 * un panel (`features/suggest/demo.ts`). No es un clic: el clic que suelta la
 * burbuja se descarta para que no llegue a lo de debajo.
 */
export const OPEN_DEMO = 'sanatorio:open-demo'

/** Lo que lleva el evento: dónde se soltó el interrogante. */
export type OpenDemoDetail = { spot: Element | null }

/**
 * Dónde se soltó el interrogante que abrió la explicación (`null` si se abrió
 * con el icono): la demostración empieza en el paso que habla de ese sitio
 * (`spots` en `defineTour`).
 */
export const DemoSpot = createContext<Element | null>(null)

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
  const [spot, setSpot] = useState<Element | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Quien ya se sabe la web puede esconderlos en Personalizar; escondidos,
  // siguen ahí para el interrogante.
  const hidden = usePrefs().tips === false

  useEffect(() => {
    const element = button.current

    if (element === null) return undefined

    const onOpen = (event: Event): void => {
      setSpot(event instanceof CustomEvent ? ((event.detail as OpenDemoDetail).spot ?? null) : null)
      setOpen(true)
    }

    element.addEventListener(OPEN_DEMO, onOpen)

    return () => {
      element.removeEventListener(OPEN_DEMO, onOpen)
    }
  }, [])

  return (
    <>
      <button
        ref={button}
        type="button"
        hidden={hidden}
        className="info-tip"
        aria-label={t('info.open', { title })}
        title={t('info.open', { title })}
        onClick={() => {
          setSpot(null)
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
          <div className="info-body">
            <DemoSpot.Provider value={spot}>{children}</DemoSpot.Provider>
          </div>
        </Modal>
      )}
    </>
  )
}
