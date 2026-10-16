import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { MeetPresence } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Qr } from '../../shared/ui/Qr'

/** La dirección que abre la web y valida el código sola: es lo que lleva el QR. */
export function checkinUrl(eventId: string, code: string): string {
  return `${window.location.origin}${window.location.pathname}#/asistencia/${encodeURIComponent(eventId)}/${code}`
}

function hour(iso: string | null, lang: string): string {
  return iso === null
    ? '—'
    : new Date(iso).toLocaleTimeString(localeOf(lang), {
        hour: '2-digit',
        minute: '2-digit',
      })
}

/**
 * La asistencia a una pizarra o a una sesión de ayuda, validada con dos códigos.
 *
 * Quien organiza ve el código de inicio y el de fin (con su QR) y quién los ha
 * validado. Quien asiste escribe el que le enseñen: el de inicio al empezar y el
 * de fin al terminar. Solo con los dos hay asistencia válida. Cuándo vale cada
 * código y cuánto tiempo cuenta lo decide la API; aquí solo se enseña.
 */
export function Attendance({ eventId }: { eventId: string }) {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(
    () => api.getEventAttendance(eventId),
    [eventId],
  )
  const action = useAction()
  const [code, setCode] = useState('')
  const [shown, setShown] = useState<'start' | 'end'>('start')

  if (loading) return <p className="hint">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const row = (presence: MeetPresence) => (
    <li key={presence.login}>
      <span>{presence.login}</span>
      <span>
        {hour(presence.startedAt, lang)} → {hour(presence.endedAt, lang)}
      </span>
      <strong className={presence.minutes === null ? 'pending' : 'valid'}>
        {presence.minutes === null
          ? t('meet.att.pending')
          : t('meet.att.minutes', { n: presence.minutes })}
      </strong>
    </li>
  )

  const { window } = data
  const startWindow = t('meet.att.windowStart', {
    from: hour(window.startFrom, lang),
    to: hour(window.startUntil, lang),
  })
  const endWindow = t('meet.att.windowEnd', {
    n: window.minStay,
    to: hour(window.endUntil, lang),
  })

  if (data.role === 'host' && data.codes !== null) {
    const current = data.codes[shown]

    return (
      <div className="meet-att">
        <span className="eyebrow">{t('meet.att.title')}</span>
        <p className="hint">{t('meet.att.hostHint')}</p>
        <p className="hint">{shown === 'start' ? startWindow : endWindow}</p>
        <div className="filter-pills" role="group" aria-label={t('meet.att.title')}>
          {(['start', 'end'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              className={`pill ${shown === phase ? 'active' : ''}`}
              aria-pressed={shown === phase}
              onClick={() => {
                setShown(phase)
              }}
            >
              {t(`meet.att.${phase}`)}
            </button>
          ))}
        </div>
        <div className="meet-code">
          <Qr text={checkinUrl(eventId, current)} label={t(`meet.att.${shown}`)} />
          <div>
            <small>{t(`meet.att.${shown}Code`)}</small>
            <strong>{current}</strong>
          </div>
        </div>
        {data.people.length > 0 && <ul className="meet-people">{data.people.map(row)}</ul>}
        <button type="button" className="link" onClick={() => void reload()}>
          {t('meet.att.refresh')}
        </button>
      </div>
    )
  }

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    if (await action.run(() => api.checkinEvent(eventId, code))) {
      setCode('')
      await reload()
    }
  }

  const mine = data.mine
  // Con los dos códigos validados ya no hay nada más que escribir.
  const validated = typeof mine?.minutes === 'number'

  return (
    <div className="meet-att">
      <span className="eyebrow">{t('meet.att.title')}</span>
      <p className="hint">
        {mine === null
          ? t('meet.att.guestStart')
          : mine.minutes === null
            ? t('meet.att.guestEnd', { time: hour(mine.startedAt, lang) })
            : t('meet.att.guestDone', { n: mine.minutes })}
      </p>
      {!validated && <p className="hint">{mine === null ? startWindow : endWindow}</p>}
      {!validated && data.attemptsLeft < 5 && (
        <p className="hint" role="status">
          {data.attemptsLeft === 0
            ? t('meet.att.locked')
            : t('meet.att.attempts', { n: data.attemptsLeft })}
        </p>
      )}
      {!validated && (
        <form className="meet-code-form" onSubmit={(event) => void submit(event)}>
          <input
            value={code}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            aria-label={t('meet.att.code')}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
            }}
          />
          <button
            type="submit"
            className="primary small"
            disabled={action.busy || code.length !== 4}
          >
            {t('meet.att.validate')}
          </button>
        </form>
      )}
      <ErrorNote error={action.error} />
    </div>
  )
}
