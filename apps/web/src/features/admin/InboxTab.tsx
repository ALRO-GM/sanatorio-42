/**
 * El buzón de incidencias y sugerencias del panel, partido en lo que falta por
 * atender y lo ya respondido o cerrado.
 */

import { useState } from 'react'

import type { Ticket } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { INBOX_VIEWS, ticketsIn } from './inbox'
import type { InboxView } from './inbox'

export function InboxTab() {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getAdminTickets(), [])
  // A quién se acaba de responder: se dice dónde va a ver la respuesta.
  const [answered, setAnswered] = useState<string | null>(null)
  const [view, setView] = useState<InboxView>('pending')

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const shown = ticketsIn(data, view)

  return (
    <>
      <div className="filter-pills sub-tabs" role="tablist" aria-label={t('admin.tab.inbox')}>
        {INBOX_VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            className={`pill ${view === option ? 'active' : ''}`}
            onClick={() => {
              setView(option)
            }}
          >
            {t(`admin.inbox.view.${option}`)} ({ticketsIn(data, option).length})
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="estado">{t('admin.inbox.empty')}</p>}
      {answered !== null && (
        <p className="reaction-done" role="status">
          {t('admin.inbox.sent', { login: answered })}
        </p>
      )}
      <ul className="ticket-list">
        {shown.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onDone={() => {
              setAnswered(ticket.login)
              void reload()
            }}
          />
        ))}
      </ul>
    </>
  )
}

function TicketRow({ ticket, onDone }: { ticket: Ticket; onDone: () => void }) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()
  const [answer, setAnswer] = useState(ticket.answer ?? '')

  const send = async (status: 'answered' | 'closed'): Promise<void> => {
    if (await run(() => api.answerTicket(ticket.id, answer, status))) onDone()
  }

  return (
    <li className={`card ticket status-${ticket.status}`}>
      <div className="ticket-head">
        <span className={`badge ${ticket.kind === 'report' ? 'specialist' : 'subtle'}`}>
          {t(`inbox.kind.${ticket.kind}`)}
        </span>
        <strong>{ticket.subject}</strong>
        <small>
          {ticket.login} · {new Date(ticket.createdAt).toLocaleString(localeOf(lang))}
          {ticket.target !== null && ` · ${ticket.target}`}
        </small>
      </div>
      <p>{ticket.body}</p>
      <textarea
        value={answer}
        rows={2}
        maxLength={2000}
        placeholder={t('admin.inbox.answer')}
        aria-label={t('admin.inbox.answer')}
        onChange={(event) => {
          setAnswer(event.target.value)
        }}
      />
      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="button"
          className="primary small"
          disabled={busy || answer.trim() === ''}
          onClick={() => void send('answered')}
        >
          {t('admin.inbox.reply')}
        </button>
        <button
          type="button"
          className="pill"
          disabled={busy || answer.trim() === ''}
          onClick={() => void send('closed')}
        >
          {t('admin.inbox.close')}
        </button>
        <small>{t(`admin.inbox.status.${ticket.status}`)}</small>
      </div>
    </li>
  )
}
