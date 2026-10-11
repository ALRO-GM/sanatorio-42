import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { TicketKind } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

const KINDS = ['issue', 'idea'] as const satisfies readonly TicketKind[]

/**
 * El buzón de cada persona: contar que algo no va o proponer una mejora, y ver
 * lo que le han respondido.
 */
export function Inbox({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const mine = useAsync(() => api.getMyTickets(), [])
  const { busy, error, run } = useAction()
  const [kind, setKind] = useState<TicketKind>('issue')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    // Sin limpieza a propósito: ver `LayoutSettings`.
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    if (await run(() => api.openTicket({ kind, subject, body }))) {
      setSubject('')
      setBody('')
      await mine.reload()
    }
  }

  return (
    <dialog ref={dialog} className="layout-dialog" onClose={onClose} aria-label={t('inbox.title')}>
      <div className="layout-head">
        <h3>{t('inbox.title')}</h3>
        <button type="button" className="link" aria-label={t('layout.close')} onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="hint">{t('inbox.hint')}</p>

      <form className="inbox-form" onSubmit={(event) => void submit(event)}>
        <div className="filter-pills" role="group" aria-label={t('inbox.kind')}>
          {KINDS.map((option) => (
            <button
              key={option}
              type="button"
              className={`pill ${kind === option ? 'active' : ''}`}
              aria-pressed={kind === option}
              onClick={() => {
                setKind(option)
              }}
            >
              {t(`inbox.kind.${option}`)}
            </button>
          ))}
        </div>
        <input
          value={subject}
          maxLength={120}
          required
          placeholder={t('inbox.subject')}
          aria-label={t('inbox.subject')}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
        />
        <textarea
          value={body}
          maxLength={2000}
          rows={4}
          required
          placeholder={t(`inbox.body.${kind === 'idea' ? 'idea' : 'issue'}`)}
          aria-label={t('inbox.bodyLabel')}
          onChange={(event) => {
            setBody(event.target.value)
          }}
        />
        <ErrorNote error={error} />
        <button type="submit" className="primary small" disabled={busy}>
          {t('inbox.send')}
        </button>
      </form>

      <h4>{t('inbox.mine')}</h4>
      {(mine.data ?? []).length === 0 && <p className="hint">{t('inbox.none')}</p>}
      <ul className="ticket-list">
        {(mine.data ?? []).map((ticket) => (
          <li key={ticket.id} className={`ticket status-${ticket.status}`}>
            <div className="ticket-head">
              <span className="badge subtle">{t(`inbox.kind.${ticket.kind}`)}</span>
              <strong>{ticket.subject}</strong>
              <small>
                {new Date(ticket.createdAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB')}
              </small>
            </div>
            <p>{ticket.body}</p>
            {ticket.answer === null ? (
              <small className="ticket-pending">{t('inbox.pending')}</small>
            ) : (
              <p className="ticket-answer">
                <strong>{t('inbox.answer')}</strong> {ticket.answer}
              </p>
            )}
          </li>
        ))}
      </ul>
    </dialog>
  )
}
