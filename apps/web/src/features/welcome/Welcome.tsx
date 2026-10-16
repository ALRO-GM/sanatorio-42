import { useEffect, useRef, useState } from 'react'

import type { Section } from '../../app/sections'
import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'

/** Ya se ha visto la bienvenida en este navegador. */
const SEEN_KEY = 'sanatorio_welcome_seen'
/** Cada cuánto se mira si ya no hay otra ventana delante (la legal, un comunicado…). */
const WAIT_MS = 1500

/** Las diapositivas: de qué va cada parte y a dónde lleva. */
const SLIDES: readonly { id: string; icon: IconName; go?: Section }[] = [
  { id: 'hello', icon: 'pregunta' },
  { id: 'record', icon: 'expediente', go: 'expediente' },
  { id: 'waiting', icon: 'consulta', go: 'consulta' },
  { id: 'duty', icon: 'guardia', go: 'guardia' },
  { id: 'board', icon: 'tablon', go: 'tablon' },
  { id: 'groups', icon: 'terapia', go: 'terapia' },
  { id: 'agenda', icon: 'calendario', go: 'calendario' },
  { id: 'net', icon: 'red', go: 'red' },
  { id: 'comfort', icon: 'ajustes' },
]

export function welcomeSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null
  } catch {
    return true
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString())
  } catch {
    // Sin almacenamiento se volvería a ver; mejor eso que no verla nunca.
  }
}

type WelcomeProps = {
  /** `true` para abrirla a mano (desde el menú de la cuenta). */
  open: boolean
  onGo: (section: Section) => void
  onClose: () => void
}

/**
 * La bienvenida: un paseo corto por la web la primera vez que se entra, y
 * cuando se pide desde el menú de la cuenta. Espera a que no haya otra
 * ventana delante, y se puede saltar.
 */
export function Welcome({ open, onGo, onClose }: WelcomeProps) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  const [first, setFirst] = useState(() => !welcomeSeen())
  const showing = open || first

  useEffect(() => {
    if (!showing) return undefined

    const show = (): boolean => {
      const other = [...document.querySelectorAll('dialog[open]')].some(
        (element) => element !== dialog.current,
      )

      if (other || dialog.current === null) return false
      if (!dialog.current.open) dialog.current.showModal()

      return true
    }

    if (show()) return undefined

    const timer = window.setInterval(() => {
      if (show()) window.clearInterval(timer)
    }, WAIT_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [showing])

  if (!showing) return null

  const slide = SLIDES[step] ?? SLIDES[0]
  const last = step === SLIDES.length - 1
  const close = (): void => {
    markSeen()
    setFirst(false)
    setStep(0)
    dialog.current?.close()
    onClose()
  }

  if (slide === undefined) return null

  return (
    <dialog
      ref={dialog}
      className="layout-dialog welcome"
      aria-label={t('welcome.title')}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <div className="welcome-art" aria-hidden="true">
        <Icon name={slide.icon} size={44} />
      </div>
      <span className="eyebrow">{t('welcome.step', { n: step + 1, total: SLIDES.length })}</span>
      <h3>{t(`welcome.${slide.id}.title`)}</h3>
      <p>{t(`welcome.${slide.id}.body`)}</p>
      {slide.go !== undefined && (
        <button
          type="button"
          className="link"
          onClick={() => {
            if (slide.go !== undefined) onGo(slide.go)
            close()
          }}
        >
          {t('welcome.go')}
        </button>
      )}
      <div className="welcome-dots" aria-hidden="true">
        {SLIDES.map((one, index) => (
          <i key={one.id} className={index === step ? 'on' : ''} />
        ))}
      </div>
      <div className="actions">
        <button type="button" className="link" onClick={close}>
          {t('welcome.skip')}
        </button>
        {step > 0 && (
          <button
            type="button"
            className="pill"
            onClick={() => {
              setStep(step - 1)
            }}
          >
            {t('welcome.back')}
          </button>
        )}
        <button
          type="button"
          className="primary small"
          onClick={() => {
            if (last) close()
            else setStep(step + 1)
          }}
        >
          {last ? t('welcome.done') : t('welcome.next')}
        </button>
      </div>
    </dialog>
  )
}
