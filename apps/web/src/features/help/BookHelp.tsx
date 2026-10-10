import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { HelpOffer } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { duration, SLOT } from './time'

type BookHelpProps = {
  offer: HelpOffer
  projectId: number
  onClose: () => void
  /** La reserva se ha enviado: los huecos de esa persona han cambiado. */
  onBooked: () => void
}

/** Duraciones que se pueden reservar, sin pasarse de lo que le queda a esa persona. */
const lengths = (remaining: number): number[] =>
  [30, 60, 90, 120].filter((minutes) => minutes <= Math.max(SLOT, remaining))

/**
 * Pedirle un rato a alguien que se ofrece hoy. La reserva queda pendiente hasta
 * que esa persona la acepte.
 */
export function BookHelp({ offer, projectId, onClose, onBooked }: BookHelpProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [start, setStart] = useState(offer.freeStarts[0] ?? '')
  const [minutes, setMinutes] = useState(30)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    if (await run(() => api.bookHelp({ helper: offer.login, projectId, start, minutes, note }))) {
      setSent(true)
      onBooked()
    }
  }

  if (sent) {
    return (
      <p className="reaction-done" role="status">
        {t('help.bookSent', { login: offer.login })}
      </p>
    )
  }

  return (
    <form className="book-help" onSubmit={(event) => void submit(event)}>
      <strong>{t('help.bookTitle', { login: offer.login })}</strong>
      <span className="hint">{t('help.bookLeft', { left: duration(offer.remainingMinutes) })}</span>
      <label>
        {t('help.bookStart')}
        <select
          value={start}
          onChange={(event) => {
            setStart(event.target.value)
          }}
        >
          {offer.freeStarts.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('help.bookMinutes')}
        <select
          value={minutes}
          onChange={(event) => {
            setMinutes(Number(event.target.value))
          }}
        >
          {lengths(offer.remainingMinutes).map((option) => (
            <option key={option} value={option}>
              {duration(option)}
            </option>
          ))}
        </select>
      </label>
      <input
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
        }}
        placeholder={t('help.bookNote')}
        aria-label={t('help.bookNote')}
        maxLength={140}
      />
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy || start === ''}>
          {t('help.bookSend')}
        </button>
        <button type="button" className="link" onClick={onClose}>
          {t('react.cancel')}
        </button>
      </div>
    </form>
  )
}
