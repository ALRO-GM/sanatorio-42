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
import { useConfirm } from '../../shared/ui/useConfirm'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Icon } from '../../shared/ui/Icon'
import { REPORT_REASONS } from '../../shared/report'
import { placeHref } from '../../shared/links'
import { INBOX_VIEWS, ticketsIn } from './inbox'
import type { InboxFilter, InboxView } from './inbox'

export function InboxTab() {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getAdminTickets(), [])
  // A quién se acaba de responder: se dice dónde va a ver la respuesta.
  const [answered, setAnswered] = useState<string | null>(null)
  const [view, setView] = useState<InboxView>('pending')
  const [filter, setFilter] = useState<InboxFilter>('all')

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const shown = ticketsIn(data, view, filter)
  const reports = ticketsIn(data, view).filter((ticket) => ticket.kind === 'report').length

  return (
    <>
      <PillGroup
        kind="tabs"
        className="sub-tabs"
        options={INBOX_VIEWS}
        value={view}
        onChange={setView}
        label={t('admin.tab.inbox')}
        text={(option) => `${t(`admin.inbox.view.${option}`)} (${ticketsIn(data, option).length})`}
      />
      {(reports > 0 || filter !== 'all') && (
        <PillGroup
          options={['all', ...REPORT_REASONS] as const}
          value={filter}
          onChange={setFilter}
          label={t('admin.inbox.byReason')}
          text={(option) =>
            `${option === 'all' ? t('admin.inbox.allKinds') : t(`report.reason.${option}`)} (${ticketsIn(data, view, option).length})`
          }
        />
      )}
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
  const confirm = useConfirm()
  const [answer, setAnswer] = useState(ticket.answer ?? '')

  const send = async (status: 'answered' | 'closed'): Promise<void> => {
    if (await run(() => api.answerTicket(ticket.id, answer, status))) onDone()
  }

  return (
    <li className={`card ticket status-${ticket.status}`}>
      <div className="ticket-head">
        <span className={`badge ${ticket.kind === 'report' ? 'specialist' : 'subtle'}`}>
          {t(
            ticket.category === null
              ? `inbox.kind.${ticket.kind}`
              : `inbox.category.${ticket.category}`,
          )}
        </span>
        {ticket.section !== null && (
          <span className="badge subtle">{t(`nav.${ticket.section}`)}</span>
        )}
        <strong>{ticket.subject}</strong>
        <small>
          {ticket.login} · {new Date(ticket.createdAt).toLocaleString(localeOf(lang))}
          {ticket.target !== null && ` · ${ticket.target}`}
        </small>
      </div>
      <p>{ticket.body}</p>
      {ticket.proposal !== null && (
        <p className="ticket-proposal">
          <strong>{t('suggest.proposalShort')}</strong> {ticket.proposal}
        </p>
      )}
      {ticket.place !== null && (
        <p className="hint">
          <Icon name="idea" size={14} /> {ticket.place.label}
          {ticket.place.detail !== null && ` · ${ticket.place.detail}`}
          {` · ${ticket.place.viewport.width}×${ticket.place.viewport.height} · ${ticket.place.theme} · ${ticket.place.lang} · ${ticket.place.mode}`}
          {ticket.place.version !== null && ` · ${ticket.place.version.slice(0, 7)}`}{' '}
          <a href={placeHref(ticket.place.hash, ticket.place.section)}>{t('suggest.goPlace')}</a>
        </p>
      )}
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
        <button
          type="button"
          className="link"
          disabled={busy}
          onClick={() => {
            void confirm
              .ask({
                body: t('admin.inbox.removeConfirm'),
                okText: t('common.remove'),
                danger: true,
              })
              .then(async (yes) => {
                if (yes && (await run(() => api.removeTicket(ticket.id)))) onDone()
              })
          }}
        >
          <Icon name="papelera" size={14} /> {t('common.remove')}
        </button>
      </div>
      {confirm.dialog}
    </li>
  )
}
