import { useEffect, useState } from 'react'

import type { Notice } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { calendarEventOf, iconOf, noticesIn, removableCount, targetOf } from './routes'
import type { NoticeFilter, NoticeTarget } from './routes'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { Modal } from '../../shared/ui/Modal'
import { MailboxTour } from './MailboxTour'
import { Conversations } from './Conversations'
import { directChatId } from './conversations'
import { PeerPicker } from './PeerPicker'

type MailboxProps = {
  /** Quién eres: para no ofrecerte escribirte. */
  me: string
  /** La conversación abierta, o `null`. La lleva quien monta el buzón, para poder abrirla desde fuera. */
  chat: string | null
  onChat: (id: string | null) => void
  onClose: () => void
  /** Lleva a donde se ve de qué va el aviso. */
  /** `event`: el evento del calendario que hay que abrir, si el aviso lleva a uno. */
  onOpen: (target: NoticeTarget, event?: string | null) => void
  /** El número de avisos sin leer ha cambiado: que la cabecera se entere. */
  onChange: () => void
}

/**
 * El buzón: todo lo que te han dicho o te ha pasado desde la última vez (te han
 * respondido, te han pedido ayuda, hay mensajes en un chat tuyo…), lo que no
 * has leído primero. Cada aviso lleva al sitio donde se ve.
 */
export function Mailbox({ me, chat, onChat, onClose, onOpen, onChange }: MailboxProps) {
  const { t } = useI18n()
  const { date } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getNotices(), [])
  const action = useAction()
  /** A quién se va a escribir: aún no se ha dicho, o a alguien del campus. */
  const [writing, setWriting] = useState<'closed' | 'choose' | 'peer'>('closed')
  // Si se llega con una conversación ya elegida, se entra por su pestaña.
  const [tab, setTab] = useState<'notices' | 'chats'>(chat === null ? 'notices' : 'chats')
  const [filter, setFilter] = useState<NoticeFilter>('all')

  useEffect(() => {
    if (chat !== null) setTab('chats')
  }, [chat])

  const markAll = async (): Promise<void> => {
    if (await action.run(() => api.readNotices())) {
      onChange()
      await reload()
    }
  }

  /** Borra o guarda y, como el buzón vuelve con la respuesta, se pide de nuevo. */
  const change = async (job: () => Promise<unknown>): Promise<void> => {
    if (await action.run(job)) {
      onChange()
      await reload()
    }
  }

  const open = async (notice: Notice): Promise<void> => {
    if (!notice.read) {
      await action.run(() => api.readNotices([notice.id]))
      onChange()
    }

    const target = targetOf(notice)

    // Una conversación se abre aquí mismo, en su pestaña.
    if (target === 'conversations') onChat(notice.ref)
    else onOpen(target, calendarEventOf(notice))
  }

  /** "hace 5 min", "hace 3 h", o la fecha si es de otro día. */
  const when = (at: string): string => {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000))

    if (minutes < 1) return t('notices.now')
    if (minutes < 60) return t('notices.minutesAgo', { n: minutes })
    if (minutes < 24 * 60) return t('notices.hoursAgo', { n: Math.round(minutes / 60) })

    return date(at, 'dayMonth')
  }

  const all = data?.items ?? []
  const items = noticesIn(all, filter)
  const unread = data?.unread ?? 0
  // Lo sin leer de conversaciones, también en su pestaña: si no, se descubrían tarde.
  const chatsUnread = all.filter(
    (notice) => !notice.read && targetOf(notice) === 'conversations',
  ).length
  const removable = removableCount(all)

  return (
    <Modal
      label={t('notices.title')}
      className="mailbox"
      onClose={onClose}
      title={
        <>
          {t('notices.title')}
          {unread > 0 && <span className="count-badge">{unread}</span>}
          <InfoTip title={t('notices.title')}>
            <MailboxTour />
          </InfoTip>
        </>
      }
    >
      <PillGroup
        kind="tabs"
        className="mailbox-tabs"
        options={['notices', 'chats'] as const}
        value={tab}
        onChange={(option) => {
          setTab(option)
          onChat(null)
        }}
        text={(option) => (
          <>
            {t(`notices.tab.${option}`)}
            {option === 'chats' && chatsUnread > 0 && (
              <span className="count-badge">{chatsUnread}</span>
            )}
          </>
        )}
      />

      {tab === 'chats' ? (
        <Conversations me={me} openId={chat} onOpen={onChat} onChange={onChange} />
      ) : (
        <>
          {loading && <p className="hint">{t('app.loading')}</p>}
          {data === undefined && !loading && (
            <ErrorNote error={error} onRetry={() => void reload()} />
          )}
          {all.some((notice) => notice.saved) && (
            <PillGroup
              options={['all', 'saved'] as const}
              value={filter}
              onChange={setFilter}
              label={t('notices.filter')}
              text={(option) => t(`notices.filter.${option}`)}
            />
          )}
          {data !== undefined && items.length === 0 && (
            <p className="hint">{t(filter === 'saved' ? 'notices.noneSaved' : 'notices.empty')}</p>
          )}

          <ul className="notice-list">
            {items.map((notice) => (
              <li key={notice.id} className="notice-row">
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
                <span className="notice-actions">
                  <button
                    type="button"
                    className={`link ${notice.saved ? 'on' : ''}`}
                    aria-pressed={notice.saved}
                    aria-label={t(notice.saved ? 'notices.unsave' : 'notices.save')}
                    title={t(notice.saved ? 'notices.unsave' : 'notices.save')}
                    disabled={action.busy}
                    onClick={() => void change(() => api.saveNotice(notice.id, !notice.saved))}
                  >
                    <Icon name="estrella" size={16} />
                  </button>
                  <button
                    type="button"
                    className="link"
                    aria-label={t('notices.remove')}
                    title={t('notices.remove')}
                    disabled={action.busy}
                    onClick={() => void change(() => api.removeNotices({ ids: [notice.id] }))}
                  >
                    <Icon name="papelera" size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <ErrorNote error={action.error} />
        </>
      )}

      {chat === null && (
        <div className="actions">
          {tab === 'notices' ? (
            <span className="notice-bulk">
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
                className="small"
                disabled={action.busy || removable === 0}
                onClick={() => void change(() => api.removeNotices({ read: true }))}
              >
                <Icon name="papelera" size={14} /> {t('notices.removeRead', { n: removable })}
              </button>
            </span>
          ) : (
            <span />
          )}
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
      )}

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
                setWriting('closed')
                onChat(directChatId(me, login))
              }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
