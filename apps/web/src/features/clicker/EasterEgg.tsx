import { useEffect, useRef, useState } from 'react'

import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Tile } from './art'
import { choosePill, dismissFresh, loadEgg, PLUS_GOAL, useEgg } from './egg'
import { PillRain } from './PillRain'
import { achievementText } from './texts'

/** Lo que dura a la vista el aviso de un logro del secreto. */
const TOAST_MS = 9000
/** Lo que tarda en escribirse cada letra del mensaje. */
const TYPE_MS = 32

/**
 * El secreto de la cruz, visto desde fuera del juego: un aviso de logro a la
 * primera pulsación, a las diez y a las veintiuna, y a las 42 una ventana
 * que no se puede cerrar y que pregunta: ¿la roja o la azul?
 *
 * Como lo guarda la API, la ventana vuelve a salir aunque se recargue. La azul
 * lo borra todo para siempre; la roja abre Code Clicker.
 */
export function EasterEgg({ onRed }: { onRed: () => void }) {
  const { t, lang } = useI18n()
  const egg = useEgg()
  const dialog = useRef<HTMLDialogElement>(null)
  const { busy, error, run } = useAction()
  const asking = egg.ready && egg.pill === null && egg.plus >= PLUS_GOAL
  const body = t('egg.body')
  // Cuántas letras del mensaje se han escrito ya; las pastillas salen al acabar.
  const [typed, setTyped] = useState(0)
  const done = typed >= body.length

  useEffect(() => {
    if (!asking) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(body.length)

      return undefined
    }

    const timer = window.setInterval(() => {
      setTyped((count) => {
        if (count >= body.length) window.clearInterval(timer)

        return Math.min(body.length, count + 1)
      })
    }, TYPE_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [asking, body])

  useEffect(() => {
    loadEgg()
  }, [])

  useEffect(() => {
    if (egg.fresh === null) return undefined

    const timer = window.setTimeout(dismissFresh, TOAST_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [egg.fresh])

  useEffect(() => {
    if (asking && dialog.current?.open === false) {
      dialog.current.showModal()
      // El foco, al título: que un Intro despistado no elija por nadie.
      dialog.current.querySelector('h3')?.focus()
    }
  }, [asking])

  const [name, about] = egg.fresh === null ? ['', ''] : achievementText(`plus:${egg.fresh}`, lang)

  return (
    <>
      {egg.fresh !== null && !asking && (
        <div className={`meet-toast cc-egg-toast ${egg.fresh >= 21 ? 'dark' : ''}`} role="status">
          <Tile icon={egg.fresh >= 21 ? 'eye' : 'plus'} size={38} tier={egg.fresh >= 21 ? 9 : 1} />
          <span>
            <small>{t('egg.achievement')}</small>
            <strong>{name}</strong>
            <span>{about}</span>
          </span>
        </div>
      )}

      {asking && (
        <dialog
          ref={dialog}
          className="cc-pill-dialog"
          aria-label={t('egg.title')}
          onCancel={(event) => {
            event.preventDefault()
          }}
          onClose={() => {
            // No se cierra sin elegir, lo intente como lo intente el navegador.
            dialog.current?.showModal()
          }}
        >
          <PillRain />
          <div className="cc-pill-screen">
            <span className="cc-pill-eyebrow">{t('egg.eyebrow')}</span>
            <h3 tabIndex={-1} className="cc-glitch" data-text={t('egg.title')}>
              {t('egg.title')}
            </h3>
            <p className="cc-typed">
              {body.slice(0, typed)}
              <i className="cc-caret" aria-hidden="true" />
            </p>
            {/* El mensaje entero, para quien no ve cómo se escribe. */}
            <p className="sr-only">{body}</p>
            <ErrorNote error={error} />
            <div className={`cc-pills ${done ? 'shown' : ''}`}>
              <button
                type="button"
                className="cc-pill blue"
                disabled={busy || !done}
                onClick={() => void run(() => choosePill('blue'))}
              >
                <span className="cc-capsule" aria-hidden="true" />
                <strong>{t('egg.blue')}</strong>
                <small>{t('egg.blueAbout')}</small>
              </button>
              <button
                type="button"
                className="cc-pill red"
                disabled={busy || !done}
                onClick={() =>
                  void run(() => choosePill('red')).then((ok) => {
                    if (ok) onRed()
                  })
                }
              >
                <span className="cc-capsule" aria-hidden="true" />
                <strong>{t('egg.red')}</strong>
                <small>{t('egg.redAbout')}</small>
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}
