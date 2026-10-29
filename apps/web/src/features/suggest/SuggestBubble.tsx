/**
 * La burbuja de sugerencias de la cabecera (`docs/sugerencias.md`): se coge,
 * se lleva hasta lo que mejorarías y, al dejarla, se abre un panel pequeño con
 * el sitio detectado, el problema y tu propuesta. Al mandarla, vuelve volando
 * a su sitio.
 *
 * Con el dedo o el lápiz se arrastra y se suelta (un toque sin arrastrar abre
 * el panel). Con el ratón, arrastrar es raro: un clic la engancha al puntero y
 * el siguiente la deja donde esté. Con el teclado, Intro o Espacio abren el
 * panel sin llevarla a ningún sitio, y el sitio se elige de una lista.
 */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { BubbleGhost } from './BubbleGhost'
import { spotLabel } from './detect'
import type { Spot } from './detect'
import { SuggestPanel } from './SuggestPanel'
import type { Opened } from './SuggestPanel'
import { useCarry } from './useCarry'

/** Cuánto se queda a la vista el «gracias». */
const THANKS_MS = 3500

export function SuggestBubble({
  section,
  sections,
}: {
  /** La sección abierta: de ella va la sugerencia, salvo que se cambie. */
  section: string
  /** Las secciones que se pueden elegir en el panel. */
  sections: readonly string[]
}) {
  const { t } = useI18n()
  const [opened, setOpened] = useState<Opened | null>(null)
  const [thanks, setThanks] = useState(false)
  const { button, ghost, returning, hover, goHome, handlers } = useCarry({
    busy: opened !== null,
    onDrop: (spot, at) => {
      setOpened({ spot, at })
    },
    onTap: () => {
      setOpened({ spot: null, at: null })
    },
    onBusyClick: () => {
      close(false)
    },
    onStart: () => {
      setThanks(false)
    },
  })
  const close = useCallback(
    (sent: boolean) => {
      setOpened(null)
      goHome()
      if (sent) {
        setThanks(true)
        window.setTimeout(() => {
          setThanks(false)
        }, THANKS_MS)
      }
      button.current?.focus()
    },
    [goHome, button],
  )
  // Lo que se resalta: lo de debajo mientras se arrastra; con el panel, lo elegido.
  const marked = hover ?? opened?.spot ?? null

  return (
    <>
      <span className="suggest-slot">
        <button
          ref={button}
          type="button"
          className={`icon-btn suggest-bubble ${ghost === null ? '' : 'away'}`}
          aria-label={t('suggest.open')}
          aria-expanded={opened !== null}
          aria-haspopup="dialog"
          title={t('suggest.hint')}
          {...handlers}
        >
          <Icon name="bicho" size={20} />
        </button>
        {thanks && (
          <span className="suggest-thanks" role="status">
            {t('suggest.thanks')}
          </span>
        )}
      </span>

      {ghost !== null && (
        <BubbleGhost
          at={ghost}
          returning={returning}
          icon="bicho"
          hint={opened === null ? t('suggest.carry') : undefined}
        />
      )}
      {marked !== null &&
        createPortal(
          <Highlight spot={marked} held={hover === null} section={section} />,
          document.body,
        )}
      {opened !== null && (
        <SuggestPanel
          opened={opened}
          section={section}
          sections={sections}
          anchor={button.current}
          onClose={close}
        />
      )}
    </>
  )
}

/** Lo que se resalta bajo la burbuja: un marco con el nombre del sitio. */
export function Highlight({ spot, held, section }: { spot: Spot; held: boolean; section: string }) {
  const { t } = useI18n()
  const [rect, setRect] = useState(() => spot.element.getBoundingClientRect())

  // Al bajar por la página con el panel abierto, el marco sigue al sitio.
  useEffect(() => {
    const measure = (): void => {
      setRect(spot.element.getBoundingClientRect())
    }

    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)

    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [spot])

  return (
    <div
      className={`suggest-outline ${held ? 'held' : ''}`}
      style={{
        left: rect.left - 3,
        top: rect.top - 3,
        width: rect.width + 6,
        height: rect.height + 6,
      }}
      aria-hidden="true"
    >
      <span className={`suggest-outline-label ${rect.top < 28 ? 'inside' : ''}`}>
        {spotLabel(spot, section, t)}
      </span>
    </div>
  )
}
