/**
 * El interrogante de la cabecera (`docs/sugerencias.md`, «El interrogante»):
 * se coge, se lleva hasta cualquier parte de la web y, al soltarlo, abre la
 * demostración animada de ese panel (la de su icono de información). El mismo
 * gesto que el bicho (`useCarry`).
 *
 * Con el ratón, un clic lo engancha y una etiqueta al lado dice qué hacer; con
 * el dedo, se arrastra. Un toque, Intro o Espacio abren una ventana que
 * explica el interrogante, con la demostración de la página abierta a un clic.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { OPEN_DEMO } from '../../shared/ui/InfoTip'
import type { OpenDemoDetail } from '../../shared/ui/InfoTip'
import { Modal } from '../../shared/ui/Modal'
import { BubbleGhost } from './BubbleGhost'
import { pageTip, tipNear } from './demo'
import { Highlight } from './SuggestBubble'
import { useCarry } from './useCarry'

/** Cuánto se queda a la vista el aviso de «sin demostración». */
const NOTE_MS = 3500

export function HelpBubble({ section }: { section: string }) {
  const { t } = useI18n()
  const [intro, setIntro] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  /** Un aviso corto junto al interrogante. */
  const flash = (text: string): void => {
    setNote(text)
    window.setTimeout(() => {
      setNote(null)
    }, NOTE_MS)
  }

  /**
   * Abre la demostración de `tip`, o avisa de que no hay ninguna. Con `spot`
   * (donde se soltó), empieza en el paso que habla de ese sitio.
   */
  const show = (tip: HTMLElement | null, spot: Element | null = null): void => {
    if (tip === null) flash(t('howto.none'))
    else tip.dispatchEvent(new CustomEvent<OpenDemoDetail>(OPEN_DEMO, { detail: { spot } }))
  }

  const { button, ghost, returning, hover, goHome, handlers } = useCarry({
    onDrop: (spot) => {
      goHome()
      // Lo que no tiene demostración propia enseña la de la página.
      const near = tipNear(spot?.element ?? null)

      if (near === null && pageTip() !== null) flash(t('howto.page'))
      show(near ?? pageTip(), spot?.element ?? null)
    },
    onTap: () => {
      setIntro(true)
    },
    onStart: () => {
      setNote(null)
    },
  })

  return (
    <>
      <span className="suggest-slot">
        <button
          ref={button}
          type="button"
          className={`icon-btn suggest-bubble help-bubble ${ghost === null ? '' : 'away'}`}
          aria-label={t('howto.open')}
          aria-haspopup="dialog"
          title={t('howto.hint')}
          {...handlers}
        >
          <Icon name="pregunta" size={20} />
        </button>
        {note !== null && (
          <span className="suggest-thanks" role="status">
            {note}
          </span>
        )}
      </span>

      {ghost !== null && (
        <BubbleGhost at={ghost} returning={returning} icon="pregunta" hint={t('howto.carry')} />
      )}
      {hover !== null &&
        createPortal(<Highlight spot={hover} held={false} section={section} />, document.body)}
      {intro && (
        <Modal
          label={t('howto.title')}
          title={t('howto.title')}
          className="help-intro"
          onClose={() => {
            setIntro(false)
          }}
        >
          <p>{t('howto.intro')}</p>
          <p className="hint">{t('howto.bug')}</p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setIntro(false)
                show(pageTip())
              }}
            >
              {t('howto.showPage')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
