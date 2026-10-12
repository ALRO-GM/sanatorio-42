import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { MeetMessage } from '@sanatorio/contracts'

import { localeOf, useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ReportButton } from '../admin/ReportButton'
import { useThread } from './useThread'
import type { Thread } from './useThread'

/**
 * Un chat: los mensajes, del más antiguo al más reciente, y la caja para
 * escribir. Los avisos (lo he visto, me retraso, no voy) salen como un mensaje más.
 */
type ChatProps = {
  thread: Thread
  me: string
  /** Es una conversación entre dos, no el chat de un evento: cambian los rótulos. */
  direct?: boolean
}

export function Chat({ thread, me, direct = false }: ChatProps) {
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const list = useRef<HTMLOListElement>(null)
  const { messages, loadError } = thread

  // Al llegar un mensaje, el chat baja solo hasta él.
  const count = messages?.length ?? 0

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [count])

  const submit = async (submitted: SyntheticEvent): Promise<void> => {
    submitted.preventDefault()

    if (text.trim() !== '' && (await thread.send({ kind: 'text', body: text }))) setText('')
  }

  const say = (message: MeetMessage): string => {
    const why = message.reason === null ? '' : ` · ${t(`meet.reason.${message.reason}`)}`

    switch (message.kind) {
      case 'seen':
        return t('meet.said.seen')
      case 'late':
        return t('meet.said.late', { n: message.minutes ?? 0 }) + why
      case 'absent':
        return t('meet.said.absent') + why
      case 'text':
        return ''
    }
  }

  return (
    <>
      <span className="eyebrow">{t(direct ? 'clusters.chat' : 'meet.chat')}</span>
      {messages === null && loadError === null && <p className="hint">{t('app.loading')}</p>}
      {loadError !== null && <ErrorNote error={loadError} />}
      {messages !== null && (
        <ol ref={list} className="meet-chat">
          {messages.length === 0 && (
            <li className="hint">{t(direct ? 'clusters.chatEmpty' : 'meet.chatEmpty')}</li>
          )}
          {messages.map((message) => (
            <li
              key={message.id}
              className={`${message.login === me ? 'mine' : ''} kind-${message.kind}`}
            >
              <Avatar login={message.login} image={message.image} size={22} />
              <span>
                <small>
                  {message.login} ·{' '}
                  {new Date(message.at).toLocaleTimeString(localeOf(lang), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
                {message.kind !== 'text' && <strong>{say(message)}</strong>}
                {message.body !== null && <span>{message.body}</span>}
                {message.login !== me && (
                  <ReportButton
                    target={`message:${message.id}`}
                    summary={`${message.login}: ${message.body ?? message.kind}`}
                  />
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="hint meet-notice">{t('meet.chatNotice')}</p>
      <form className="meet-write" onSubmit={(submitted) => void submit(submitted)}>
        <input
          value={text}
          maxLength={500}
          placeholder={t('meet.write')}
          aria-label={t('meet.write')}
          onChange={(change) => {
            setText(change.target.value)
          }}
        />
        <button
          type="submit"
          className="primary small"
          disabled={thread.sending || text.trim() === ''}
        >
          {t('meet.sendText')}
        </button>
      </form>
      <ErrorNote error={thread.sendError} />
    </>
  )
}

/**
 * Un chat a secas, sin evento alrededor: el de un grupo de terapia.
 *
 * @param chatId El id del chat: `group:<id>`.
 */
export function ChatRoom({ chatId, me }: { chatId: string; me: string }) {
  return (
    <section className="meet-room">
      <Chat thread={useThread(chatId)} me={me} />
    </section>
  )
}
