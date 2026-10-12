import { useEffect, useRef } from 'react'

import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Tile } from './art'
import { choosePill, dismissFresh, loadEgg, PLUS_GOAL, useEgg } from './egg'
import { achievementText } from './texts'

/** Lo que dura a la vista el aviso de un logro del secreto. */
const TOAST_MS = 9000

/**
 * El secreto de la cruz, visto desde fuera del juego: un aviso de logro a la
 * primera pulsación, a las diez y a las cincuenta, y a las cien una ventana
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
        <div className={`meet-toast cc-egg-toast ${egg.fresh >= 50 ? 'dark' : ''}`} role="status">
          <Tile icon={egg.fresh >= 50 ? 'eye' : 'plus'} size={38} tier={egg.fresh >= 50 ? 9 : 1} />
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
          <h3 tabIndex={-1}>{t('egg.title')}</h3>
          <p>{t('egg.body')}</p>
          <ErrorNote error={error} />
          <div className="cc-pills">
            <button
              type="button"
              className="cc-pill blue"
              disabled={busy}
              onClick={() => void run(() => choosePill('blue'))}
            >
              <strong>{t('egg.blue')}</strong>
              <small>{t('egg.blueAbout')}</small>
            </button>
            <button
              type="button"
              className="cc-pill red"
              disabled={busy}
              onClick={() =>
                void run(() => choosePill('red')).then((ok) => {
                  if (ok) onRed()
                })
              }
            >
              <strong>{t('egg.red')}</strong>
              <small>{t('egg.redAbout')}</small>
            </button>
          </div>
        </dialog>
      )}
    </>
  )
}
