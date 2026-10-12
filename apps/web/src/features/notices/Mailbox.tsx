import { useEffect, useRef, useState } from 'react'

import type { Notice } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { iconOf, targetOf } from './routes'
import type { NoticeTarget } from './routes'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { MailboxTour } from './MailboxTour'
import { PeerPicker } from './PeerPicker'
import { chatHref } from '../../shared/links'

type MailboxProps = {
  /** Quién eres: para no ofrecerte escribirte. */
  me: string
  onClose: () => void
  /** Lleva a donde se ve de qué va el aviso. */
  onOpen: (target: NoticeTarget) => void
  /** El número de avisos sin leer ha cambiado: que la cabecera se entere. */
  onChange: () => void
}

/**
 * El buzón: todo lo que te han dicho o te ha pasado desde la última vez (te han
 * respondido, te han pedido ayuda, hay mensajes en un chat tuyo…), lo que no
 * has leído primero. Cada aviso lleva al sitio donde se ve.
 */
export function Mailbox({ me, onClose, onOpen, onChange }: MailboxProps) {
  const { t, lang } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const { data, error, loading, reload } = useAsync(() => api.getNotices(), [])
  const action = useAction()
  /** A quién se va a escribir: aún no se ha dicho, o a alguien del campus. */
  const [writing, setWriting] = useState<'closed' | 'choose' | 'peer'>('closed')

  useEffect(() => {
    // Sin limpieza a propósito: ver `LayoutSettings`.
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const markAll = async (): Promise<void> => {
    if (await action.run(() => api.readNotices())) {
      onChange()
      await reload()
    }
  }

  const open = async (notice: Notice): Promise<void> => {
    if (!notice.read) {
      await action.run(() => api.readNotices([notice.id]))
      onChange()
    }

    onOpen(targetOf(notice))
  }

  /** "hace 5 min", "hace 3 h", o la fecha si es de otro día. */
  const when = (at: string): string => {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000))

    if (minutes < 1) return t('notices.now')
    if (minutes < 60) return t('notices.minutesAgo', { n: minutes })
    if (minutes < 24 * 60) return t('notices.hoursAgo', { n: Math.round(minutes / 60) })

    return new Date(at).toLocaleDateString(localeOf(lang), {
      day: 'numeric',
      month: 'short',
    })
  }

  const items = data?.items ?? []
  const unread = data?.unread ?? 0

  return (
    <dialog
      ref={dialog}
      className="layout-dialog mailbox"
      onClose={onClose}
      aria-label={t('notices.title')}
    >
      <div className="layout-head">
        <h3>
          {t('notices.title')}
          {unread > 0 && <span className="count-badge">{unread}</span>}
          <InfoTip title={t('notices.title')}>
            <MailboxTour />
          </InfoTip>
        </h3>
        <button type="button" className="link" aria-label={t('layout.close')} onClick={onClose}>
          <Icon name="cerrar" />
        </button>
      </div>

      {loading && <p className="hint">{t('app.loading')}</p>}
      {data === undefined && !loading && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined && items.length === 0 && <p className="hint">{t('notices.empty')}</p>}

      <ul className="notice-list">
        {items.map((notice) => (
          <li key={notice.id}>
            <button
              type="button"
              className={`notice ${notice.read ? 'read' : 'unread'}`}
              disabled={action.busy}
              onClick={() => void open(notice)}
            >
              <span className="notice-icon" aria-hidden="true">
                <Icon name={iconOf(notice)} size={20} />
              </span>
              <span className="notice-body">
                <strong>
                  {!notice.read && <span className="sr-only">{t('notices.unreadMark')} </span>}
                  {t(`notices.kind.${notice.kind}`, {
                    from: notice.from ?? t('notices.someone'),
                    n: notice.count,
                  })}
                </strong>
                {notice.text !== null && <span className="notice-text">{notice.text}</span>}
                <small>
                  {when(notice.at)} · {t(`notices.go.${targetOf(notice)}`)}
                </small>
              </span>
              {!notice.read && <span className="notice-dot" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <ErrorNote error={action.error} />

      <div className="actions">
        <button
          type="button"
          className="small"
          disabled={action.busy || unread === 0}
          onClick={() => void markAll()}
        >
          {t('notices.readAll')}
        </button>
        <button
          type="button"
          className="link"
          aria-expanded={writing !== 'closed'}
          onClick={() => {
            setWriting(writing === 'closed' ? 'choose' : 'closed')
          }}
        >
          <Icon name="lapiz" /> {t('notices.compose')}
        </button>
      </div>

      {writing !== 'closed' && (
        <div className="compose">
          <div className="filter-pills" role="group" aria-label={t('notices.compose')}>
            <button
              type="button"
              className="pill"
              onClick={() => {
                onOpen('inbox')
              }}
            >
              <Icon name="buzon" /> {t('notices.toAdmin')}
            </button>
            <button
              type="button"
              className={`pill ${writing === 'peer' ? 'active' : ''}`}
              aria-pressed={writing === 'peer'}
              onClick={() => {
                setWriting('peer')
              }}
            >
              <Icon name="chat" /> {t('notices.toPeer')}
            </button>
          </div>
          {writing === 'peer' && (
            <PeerPicker
              me={me}
              onPick={(login) => {
                // La conversación se abre en los clusters, con su chat ya a la vista.
                window.location.hash = chatHref(login)
                dialog.current?.close()
              }}
            />
          )}
        </div>
      )}
    </dialog>
  )
}
