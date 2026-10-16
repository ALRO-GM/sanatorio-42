import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { TicketCategory } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { InboxTour } from './InboxTour'

import { CATEGORIES, kindOf, reportableSections, sectionFor } from './inbox'

/**
 * El buzón de cada persona: contar que algo no va o proponer una mejora, y ver
 * lo que le han respondido. Se elige el tipo y la sección (por defecto, la que
 * estaba abierta); no hace falta inventarse un título.
 *
 * @param section La sección abierta al pulsar «Incidencias y sugerencias».
 * @param sections Las secciones de la web, para el desplegable.
 */
export function Inbox({
  onClose,
  section,
  sections,
}: {
  onClose: () => void
  section: string
  sections: readonly { id: string; inNav: boolean }[]
}) {
  const { t, lang } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const mine = useAsync(() => api.getMyTickets(), [])
  const { busy, error, run } = useAction()
  const [category, setCategory] = useState<TicketCategory>('bug')
  const [where, setWhere] = useState(() => sectionFor(section, sections))
  const [body, setBody] = useState('')

  useEffect(() => {
    // Sin limpieza a propósito: ver `LayoutSettings`.
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    const ticket = {
      kind: kindOf(category),
      category,
      body,
      ...(where === null ? {} : { section: where }),
    }

    if (await run(() => api.openTicket(ticket))) {
      setBody('')
      await mine.reload()
    }
  }

  return (
    <dialog ref={dialog} className="layout-dialog" onClose={onClose} aria-label={t('inbox.title')}>
      <div className="layout-head">
        <h3>
          {t('inbox.title')}
          <InfoTip title={t('inbox.title')}>
            <InboxTour />
          </InfoTip>
        </h3>
        <button type="button" className="link" aria-label={t('layout.close')} onClick={onClose}>
          <Icon name="cerrar" />
        </button>
      </div>

      <form className="inbox-form" onSubmit={(event) => void submit(event)}>
        <p className="hint inbox-to">
          <Icon name="buzon" size={14} /> {t('inbox.to')}
        </p>
        <div className="form-grid">
          <label>
            {t('inbox.kind')}
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as TicketCategory)
              }}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {t(`inbox.category.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('inbox.section')}
            <select
              value={where ?? ''}
              onChange={(event) => {
                setWhere(event.target.value === '' ? null : event.target.value)
              }}
            >
              <option value="">{t('inbox.section.general')}</option>
              {reportableSections(sections).map((id) => (
                <option key={id} value={id}>
                  {t(`nav.${id}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          value={body}
          maxLength={2000}
          rows={4}
          required
          placeholder={t(`inbox.body.${category}`)}
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
              <span className="badge subtle">
                {t(
                  ticket.category === null
                    ? `inbox.kind.${ticket.kind}`
                    : `inbox.category.${ticket.category}`,
                )}
              </span>
              <strong>{ticket.subject}</strong>
              <small>{new Date(ticket.createdAt).toLocaleDateString(localeOf(lang))}</small>
            </div>
            <p>{ticket.body}</p>
            {ticket.withdrawUntil !== null && Date.parse(ticket.withdrawUntil) > Date.now() && (
              <button
                type="button"
                className="link"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api.withdrawTicket(ticket.id)
                    await mine.reload()
                  })
                }
              >
                <Icon name="papelera" size={14} /> {t('inbox.withdraw')}
              </button>
            )}
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
