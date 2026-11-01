import { useEffect, useRef, useState } from 'react'

import type { Section } from '../../app/sections'
import { shows, useDetail } from '../../shared/detail'
import type { Detail } from '../../shared/detail'
import { DetailCards } from '../../shared/ui/DetailSelect'
import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { LangSelect } from '../../shared/ui/LangSelect'
import type { IconName } from '../../shared/ui/Icon'

/** Ya se ha visto la bienvenida en este navegador. */
const SEEN_KEY = 'sanatorio_welcome_seen'
/** Cada cuánto se mira si ya no hay otra ventana delante (la legal, un comunicado…). */
const WAIT_MS = 1500

/**
 * Las diapositivas: de qué va cada parte y a dónde lleva. `from`: desde qué
 * modo de la interfaz sale (como las pestañas): quien elige el simplificado en
 * el primer paso no ve después las de lo que no le va a salir. Eran diez; se
 * juntaron el saludo con el modo, Proyectos con Sprints y el calendario con los
 * ajustes (revisión de la UX del 2026-11): seis en el simplificado, siete si no.
 */
const SLIDES: readonly { id: string; icon: IconName; go?: Section; from?: Detail }[] = [
  // Con el saludo, lo primero que se elige: cuánto enseña la web.
  { id: 'hello', icon: 'pregunta' },
  { id: 'record', icon: 'expediente', go: 'expediente' },
  { id: 'waiting', icon: 'consulta', go: 'consulta' },
  { id: 'duty', icon: 'guardia', go: 'guardia' },
  { id: 'board', icon: 'tablon', go: 'tablon' },
  { id: 'net', icon: 'red', go: 'red', from: 'normal' },
  { id: 'agenda', icon: 'calendario', go: 'calendario' },
]

function welcomeSeen(): boolean {
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
  const detail = useDetail()
  // El modo se elige en el primer paso: las que salen después ya lo siguen.
  const slides = SLIDES.filter((one) => shows(detail, one.from ?? 'simple'))

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

  const slide = slides[step] ?? slides[0]
  const last = step === slides.length - 1
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
      {/* El idioma, a mano desde el principio: quien no lee español no tiene que esperar a Ajustes. */}
      <div className="welcome-lang">
        <LangSelect />
      </div>
      <div className="welcome-art" aria-hidden="true">
        <Icon name={slide.icon} size={44} />
      </div>
      <span className="eyebrow">{t('welcome.step', { n: step + 1, total: slides.length })}</span>
      <h3>{t(`welcome.${slide.id}.title`)}</h3>
      <p>{t(`welcome.${slide.id}.body`)}</p>
      {slide.id === 'hello' && (
        <>
          <p>{t('welcome.mode.body')}</p>
          <DetailCards />
        </>
      )}
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
        {slides.map((one, index) => (
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
