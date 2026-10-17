import { useState } from 'react'

import type { ClickerReview } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useGateQueue } from '../../shared/hooks/useGateQueue'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/** Lo que hay que escribir como poco: lo mismo que pide la API. */
const DEFENSE_MIN = 20

type ReviewGateProps = {
  /** Cuántas dice el pulso que hay por contestar. */
  pending: number
  /** Se ha contestado alguna: conviene pedir el pulso otra vez. */
  onChange: () => void
}

/**
 * Una revisión de trampas de Code Clicker: quien administra ha visto un salto
 * que no cuadra y pide explicaciones. Enseña las cifras (no cómo se ha visto) y
 * no se cierra sin contestar: ni con Escape ni pulsando fuera.
 */
export function ReviewGate({ pending, onChange }: ReviewGateProps) {
  const { t, lang } = useI18n()
  const [answer, setAnswer] = useState('')
  const { setQueue, current, dialog, left } = useGateQueue<ClickerReview>(pending, () =>
    api.getClickerReviews(),
  )
  const { busy, error, run } = useAction()
  const number = (value: number): string =>
    new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 0 }).format(value)

  if (current === undefined) return null

  const { evidence } = current
  const send = (): void => {
    void run(async () => {
      await api.defendClickerReview(current.id, answer)
      setAnswer('')
      left.current -= 1
      setQueue((list) => list.slice(1))
      if (left.current <= 0) dialog.current?.close()
      onChange()
    })
  }

  return (
    <dialog
      ref={dialog}
      className="layout-dialog review-gate"
      aria-label={t('clicker.review.title')}
      onCancel={(event) => {
        event.preventDefault()
      }}
      onClose={() => {
        // Mientras quede alguna por contestar, se vuelve a abrir.
        if (left.current > 0) dialog.current?.showModal()
      }}
    >
      <div className="layout-head">
        <span className="event-kind">
          <Icon name="escudo" /> {t('clicker.review.kind')}
        </span>
      </div>
      <h3>{t('clicker.review.title')}</h3>
      <p>{t('clicker.review.intro')}</p>
      <ul className="review-evidence">
        <li>
          {t('clicker.review.jump', {
            from: number(evidence.from),
            to: number(evidence.to),
            seconds: evidence.seconds,
          })}
        </li>
        <li>{t('clicker.review.rate', { rate: number(evidence.perSecond) })}</li>
        <li>{t(evidence.golden ? 'clicker.review.golden' : 'clicker.review.noGolden')}</li>
      </ul>
      <p className="hint">{t('clicker.review.ask')}</p>
      <textarea
        value={answer}
        rows={4}
        maxLength={2000}
        aria-label={t('clicker.review.answer')}
        placeholder={t('clicker.review.answer')}
        onChange={(event) => {
          setAnswer(event.target.value)
        }}
      />
      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="button"
          className="primary small"
          disabled={busy || answer.trim().length < DEFENSE_MIN}
          onClick={send}
        >
          {t('clicker.review.send')}
        </button>
      </div>
    </dialog>
  )
}
