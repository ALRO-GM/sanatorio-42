import { useEffect, useState } from 'react'

import type { Conversation, ConversationKind, ConversationMark } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'
import { Chat } from '../alerts/Chat'
import { useThread } from '../alerts/useThread'
import { kindsIn, matches, NO_FILTERS, projectsIn, remindTime } from './conversations'
import type { Filters, RemindPreset, StateFilter } from './conversations'

const KIND_ICON: Record<ConversationKind, IconName> = {
  direct: 'chat',
  group: 'terapia',
  board: 'pizarras',
  help: 'guardia',
  event: 'calendario',
}

const STATES: readonly StateFilter[] = ['all', 'unread', 'pending']
const PRESETS: readonly RemindPreset[] = ['hour', 'tomorrow', 'monday']

type ConversationsProps = {
  me: string
  /** La conversación que hay que enseñar abierta, o `null` para ver la lista. */
  openId: string | null
  onOpen: (id: string | null) => void
  /** Algo ha cambiado en lo leído: que la cabecera vuelva a contar. */
  onChange: () => void
}

/**
 * La bandeja de conversaciones: todos tus chats juntos (con otra persona, de un
 * grupo, de una pizarra…), con lo que has apuntado de cada uno. Se pueden ver
 * solo las no leídas o las pendientes, por tipo y por proyecto.
 */
export function Conversations({ me, openId, onOpen, onChange }: ConversationsProps) {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getConversations(), [])
  const [fresh, setFresh] = useState<Conversation[] | null>(null)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const action = useAction()
  const items = fresh ?? data?.items ?? []

  // Al volver de un hilo, la lista se pide otra vez: lo leído ha cambiado.
  useEffect(() => {
    if (openId === null) {
      setFresh(null)
      void reload()
    }
  }, [openId, reload])

  const mark = (change: ConversationMark): void => {
    void action
      .run(async () => {
        setFresh((await api.markConversation(change)).items)
      })
      .then(onChange)
  }

  const when = (at: string): string => {
    const date = new Date(at)
    const today = new Date().toDateString() === date.toDateString()

    return today
      ? date.toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })
  }
  const titleOf = (entry: Pick<Conversation, 'title' | 'kind'>): string =>
    entry.title ?? t(`chats.kind.${entry.kind}`)

  if (openId !== null) {
    // Una conversación recién empezada todavía no está en la lista: se abre igual.
    const peer = openId.startsWith('dm:')
      ? (openId
          .split(':')
          .slice(1)
          .find((login) => login !== me) ?? null)
      : null
    const current: Conversation = items.find((entry) => entry.id === openId) ?? {
      id: openId,
      kind: peer === null ? 'event' : 'direct',
      title: peer,
      peer,
      image: null,
      online: false,
      last: null,
      unread: 0,
      pending: false,
      remindAt: null,
      project: null,
    }

    return (
      <div className="conversation">
        <div className="conversation-head">
          <button
            type="button"
            className="pill"
            onClick={() => {
              onOpen(null)
            }}
          >
            ← {t('chats.back')}
          </button>
          <span className="conversation-title">
            {current.peer !== null ? (
              <Avatar login={current.peer} image={current.image} size={28} />
            ) : (
              <Icon name={KIND_ICON[current.kind]} size={20} />
            )}
            <strong>{titleOf(current)}</strong>
            {current.online && <span className="badge on">{t('clusters.online')}</span>}
          </span>
        </div>

        <ThreadTools
          key={current.id}
          conversation={current}
          busy={action.busy}
          onMark={mark}
          when={when}
        />
        <ErrorNote error={action.error} />
        <OpenThread key={openId} id={openId} me={me} direct={current.kind === 'direct'} />
      </div>
    )
  }

  const shown = items.filter((entry) => matches(entry, filters))
  const kinds = kindsIn(items)
  const projects = projectsIn(items)

  return (
    <div className="conversations">
      <div className="filter-pills" role="group" aria-label={t('chats.filter')}>
        {STATES.map((state) => (
          <button
            key={state}
            type="button"
            className={`pill ${filters.state === state ? 'active' : ''}`}
            aria-pressed={filters.state === state}
            onClick={() => {
              setFilters({ ...filters, state })
            }}
          >
            {t(`chats.state.${state}`)}
            {state !== 'all' && (
              <span className="pill-count">
                {items.filter((entry) => matches(entry, { ...NO_FILTERS, state })).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {(kinds.length > 1 || projects.length > 0) && (
        <div className="conversation-filters">
          {kinds.length > 1 && (
            <label>
              <span className="sr-only">{t('chats.byKind')}</span>
              <select
                value={filters.kind}
                onChange={(event) => {
                  setFilters({ ...filters, kind: event.target.value as Filters['kind'] })
                }}
              >
                <option value="all">{t('chats.allKinds')}</option>
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`chats.kind.${kind}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {projects.length > 0 && (
            <label>
              <span className="sr-only">{t('chats.byProject')}</span>
              <select
                value={filters.projectId ?? ''}
                onChange={(event) => {
                  setFilters({
                    ...filters,
                    projectId: event.target.value === '' ? null : Number(event.target.value),
                  })
                }}
              >
                <option value="">{t('chats.allProjects')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {loading && fresh === null && <p className="hint">{t('app.loading')}</p>}
      {data === undefined && !loading && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined && items.length === 0 && <p className="hint">{t('chats.empty')}</p>}
      {items.length > 0 && shown.length === 0 && <p className="hint">{t('chats.noneShown')}</p>}
      <ErrorNote error={action.error} />

      <ul className="notice-list">
        {shown.map((entry) => (
          <li key={entry.id} className="conversation-row">
            <button
              type="button"
              className={`notice ${entry.unread > 0 ? 'unread' : 'read'}`}
              onClick={() => {
                onOpen(entry.id)
              }}
            >
              <span className="notice-icon" aria-hidden="true">
                {entry.peer !== null ? (
                  <Avatar login={entry.peer} image={entry.image} size={32} />
                ) : (
                  <Icon name={KIND_ICON[entry.kind]} size={20} />
                )}
              </span>
              <span className="notice-body">
                <strong>
                  {titleOf(entry)}
                  {entry.online && <span className="seat-online sample" />}
                </strong>
                <span className="notice-text">
                  {entry.last === null
                    ? '…'
                    : `${entry.last.from === me ? `${t('map.you')}: ` : ''}${entry.last.body ?? t(`chats.said.${entry.last.kind}`)}`}
                </span>
                <small className="conversation-tags">
                  <span>{t(`chats.kind.${entry.kind}`)}</span>
                  {entry.last !== null && <span>{when(entry.last.at)}</span>}
                  {entry.project !== null && <span className="chip">{entry.project.name}</span>}
                  {entry.pending && (
                    <span className="chip pending">
                      <Icon name="bandera" size={12} /> {t('chats.pending')}
                    </span>
                  )}
                  {entry.remindAt !== null && (
                    <span className="chip">
                      <Icon name="reloj" size={12} /> {when(entry.remindAt)}
                    </span>
                  )}
                </small>
              </span>
              {entry.unread > 0 && (
                <span
                  className="count-badge"
                  aria-label={t('chats.unreadCount', { n: entry.unread })}
                >
                  {entry.unread}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <p className="hint conversation-privacy">{t('meet.chatNotice')}</p>
    </div>
  )
}

/** El hilo abierto. Aparte, para que el sondeo empiece y acabe con él. */
function OpenThread({ id, me, direct }: { id: string; me: string; direct: boolean }) {
  return <Chat thread={useThread(id)} me={me} direct={direct} />
}

/** Lo que se puede apuntar de una conversación: no leída, pendiente, recordatorio y proyecto. */
function ThreadTools({
  conversation,
  busy,
  onMark,
  when,
}: {
  conversation: Conversation
  busy: boolean
  onMark: (change: ConversationMark) => void
  when: (at: string) => string
}) {
  const { t } = useI18n()
  const projects = useAsync(() => api.getMyProjects(true), [])
  const { id } = conversation

  return (
    <div className="conversation-tools">
      <button
        type="button"
        className={`pill ${conversation.pending ? 'active' : ''}`}
        aria-pressed={conversation.pending}
        disabled={busy}
        onClick={() => {
          onMark({ id, pending: !conversation.pending })
        }}
      >
        <Icon name="bandera" /> {t('chats.pending')}
      </button>
      <button
        type="button"
        className="pill"
        disabled={busy}
        onClick={() => {
          onMark({ id, read: false })
        }}
      >
        <Icon name="buzon" /> {t('chats.markUnread')}
      </button>
      <label className="conversation-select">
        <Icon name="reloj" />
        <span className="sr-only">{t('chats.remind')}</span>
        <select
          value=""
          disabled={busy}
          onChange={(event) => {
            const choice = event.target.value

            if (choice === 'none') onMark({ id, remindAt: null })
            else if (choice !== '') {
              onMark({ id, remindAt: remindTime(choice as RemindPreset, new Date()).toISOString() })
            }
          }}
        >
          <option value="">
            {conversation.remindAt === null
              ? t('chats.remind')
              : t('chats.remindSet', { when: when(conversation.remindAt) })}
          </option>
          {PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {t(`chats.remind.${preset}`)}
            </option>
          ))}
          {conversation.remindAt !== null && <option value="none">{t('chats.remind.none')}</option>}
        </select>
      </label>
      <label className="conversation-select">
        <Icon name="tablon" />
        <span className="sr-only">{t('chats.project')}</span>
        <select
          value={conversation.project?.id ?? ''}
          disabled={busy}
          onChange={(event) => {
            onMark({ id, projectId: event.target.value === '' ? null : Number(event.target.value) })
          }}
        >
          <option value="">{t('chats.project')}</option>
          {/* El que ya tiene puesto sale aunque no esté entre tus proyectos. */}
          {conversation.project !== null &&
            projects.data?.some((project) => project.id === conversation.project?.id) !== true && (
              <option value={conversation.project.id}>{conversation.project.name}</option>
            )}
          {(projects.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
