import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { MeetPresence } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { formatsFor } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Qr } from '../../shared/ui/Qr'

/** La dirección que abre la web y valida el código sola: es lo que lleva el QR. */
function checkinUrl(eventId: string, code: string): string {
  return `${window.location.origin}${window.location.pathname}#/asistencia/${encodeURIComponent(eventId)}/${code}`
}

function hour(iso: string | null, lang: string): string {
  return iso === null ? '—' : formatsFor(lang).time(iso)
}

/**
 * La asistencia a una pizarra o a una sesión de ayuda, validada con un código.
 *
 * Quien organiza ve el código (con su QR) y quién lo ha validado. Quien asiste
 * lo escribe al llegar, y le cuenta desde entonces hasta la hora de fin. Cuándo
 * vale y cuánto tiempo cuenta lo decide la API; aquí solo se enseña.
 */
export function Attendance({ eventId }: { eventId: string }) {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(
    () => api.getEventAttendance(eventId),
    [eventId],
  )
  const action = useAction()
  const [code, setCode] = useState('')

  if (loading) return <p className="hint">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} retry />

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

  const when = t('meet.att.window', {
    from: hour(data.window.from, lang),
    to: hour(data.window.until, lang),
  })

  if (data.role === 'host' && data.code !== null) {
    return (
      <div className="meet-att">
        <span className="eyebrow">{t('meet.att.title')}</span>
        <p className="hint">{t('meet.att.hostHint')}</p>
        <p className="hint">{when}</p>
        <div className="meet-code">
          <Qr text={checkinUrl(eventId, data.code)} label={t('meet.att.codeLabel')} />
          <div>
            <small>{t('meet.att.codeLabel')}</small>
            <strong>{data.code}</strong>
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

  // Con el código validado ya no hay nada más que escribir.
  const minutes = data.mine?.minutes ?? null
  const validated = minutes !== null

  return (
    <div className="meet-att">
      <span className="eyebrow">{t('meet.att.title')}</span>
      <p className="hint">
        {validated ? t('meet.att.guestDone', { n: minutes }) : t('meet.att.guestStart')}
      </p>
      {!validated && <p className="hint">{when}</p>}
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
