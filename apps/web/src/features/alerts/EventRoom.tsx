import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { MeetMessage, MeetMessageInput, MeetReason } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ReportButton } from '../admin/ReportButton'
import { Attendance } from './Attendance'

const DELAYS = [5, 10, 15, 30] as const
const REASONS = [
  'evaluation',
  'other_event',
  'on_my_way',
  'transport',
  'other',
] as const satisfies readonly MeetReason[]

/**
 * Cada cuánto se mira si hay mensajes nuevos, con la sala abierta. Mientras
 * nadie escribe, la espera se va alargando hasta el máximo; en cuanto llega
 * algo, vuelve al mínimo. Con la pestaña en segundo plano no se mira.
 */
const POLL_MIN_MS = 8000
const POLL_MAX_MS = 30_000

/**
 * La "sala" de un evento con otras personas: respuestas rápidas al aviso (lo he
 * visto, me retraso, no puedo ir), el chat que comparten todos los del evento
 * y, en pizarras y sesiones de ayuda, la asistencia con códigos.
 */
type EventRoomProps = {
  /** Id del evento en el calendario, o `group:<id>` para el chat de un grupo de terapia. */
  eventId: string
  me: string
  /** Respuestas rápidas al aviso (lo he visto, me retraso, no puedo ir). Sobran en un chat de grupo. */
  replies?: boolean
  /** Asistencia con códigos: solo pizarras y sesiones de ayuda. */
  codes?: boolean
}

export function EventRoom({ eventId, me, replies = true, codes = false }: EventRoomProps) {
  const { t, lang } = useI18n()
  const [messages, setMessages] = useState<MeetMessage[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [text, setText] = useState('')
  // Qué respuesta se está detallando: los minutos del retraso o el motivo de no ir.
  const [detail, setDetail] = useState<'late' | 'absent' | null>(null)
  const [minutes, setMinutes] = useState<number>(10)
  const [reason, setReason] = useState<MeetReason>('evaluation')
  const action = useAction()
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    let current = true
    let timer: number | undefined
    let wait = POLL_MIN_MS
    // El último mensaje que ya se tiene: al refrescar solo se piden los posteriores.
    let last: number | undefined

    const load = (): void => {
      window.clearTimeout(timer)

      // Con la pestaña en segundo plano no se pregunta: al volver se pone al día.
      if (document.hidden) return

      api
        .getEventThread(eventId, last)
        .then(
          (thread) => {
            if (!current) return

            const fresh = thread.messages

            wait = fresh.length > 0 ? POLL_MIN_MS : Math.min(POLL_MAX_MS, wait * 1.5)
            last = fresh.at(-1)?.id ?? last ?? 0
            setLoadError(null)
            setMessages((known) => {
              const seen = new Set((known ?? []).map((message) => message.id))

              return [...(known ?? []), ...fresh.filter((message) => !seen.has(message.id))]
            })
          },
          (cause: unknown) => {
            if (current) setLoadError(cause)
          },
        )
        .finally(() => {
          if (current) timer = window.setTimeout(load, wait)
        })
    }

    setMessages(null)
    load()
    document.addEventListener('visibilitychange', load)

    return () => {
      current = false
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [eventId])

  // Al llegar un mensaje, el chat baja solo hasta él.
  const count = messages?.length ?? 0

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [count])

  const send = async (message: Omit<MeetMessageInput, 'id'>): Promise<void> => {
    const ok = await action.run(async () => {
      setMessages((await api.sendEventMessage({ id: eventId, ...message })).messages)
    })

    if (ok) {
      setText('')
      setDetail(null)
    }
  }

  const submit = (submitted: SyntheticEvent): void => {
    submitted.preventDefault()

    if (text.trim() !== '') void send({ kind: 'text', body: text })
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
    <section className="meet-room">
      {replies && (
        <>
          <span className="eyebrow">{t('meet.reply')}</span>
          <div className="filter-pills">
            <button
              type="button"
              className="pill"
              disabled={action.busy}
              onClick={() => void send({ kind: 'seen' })}
            >
              👍 {t('meet.seen')}
            </button>
            <button
              type="button"
              className={`pill ${detail === 'late' ? 'active' : ''}`}
              aria-expanded={detail === 'late'}
              onClick={() => {
                setDetail(detail === 'late' ? null : 'late')
              }}
            >
              ⏳ {t('meet.late')}
            </button>
            <button
              type="button"
              className={`pill ${detail === 'absent' ? 'active' : ''}`}
              aria-expanded={detail === 'absent'}
              onClick={() => {
                setDetail(detail === 'absent' ? null : 'absent')
              }}
            >
              🚫 {t('meet.absent')}
            </button>
          </div>

          {detail !== null && (
            <div className="meet-detail">
              {detail === 'late' && (
                <label>
                  {t('meet.howLong')}
                  <select
                    value={minutes}
                    onChange={(change) => {
                      setMinutes(Number(change.target.value))
                    }}
                  >
                    {DELAYS.map((option) => (
                      <option key={option} value={option}>
                        {t('meet.minutes', { n: option })}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {t('meet.why')}
                <select
                  value={reason}
                  onChange={(change) => {
                    setReason(REASONS.find((option) => option === change.target.value) ?? 'other')
                  }}
                >
                  {REASONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`meet.reason.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary small"
                disabled={action.busy}
                onClick={() =>
                  void send(
                    detail === 'late'
                      ? { kind: 'late', minutes, reason }
                      : { kind: 'absent', reason },
                  )
                }
              >
                {t('meet.tell')}
              </button>
            </div>
          )}
        </>
      )}

      <span className="eyebrow">{t('meet.chat')}</span>
      {messages === null && loadError === null && <p className="hint">{t('app.loading')}</p>}
      {loadError !== null && <ErrorNote error={loadError} />}
      {messages !== null && (
        <ol ref={list} className="meet-chat">
          {messages.length === 0 && <li className="hint">{t('meet.chatEmpty')}</li>}
          {messages.map((message) => (
            <li
              key={message.id}
              className={`${message.login === me ? 'mine' : ''} kind-${message.kind}`}
            >
              <Avatar login={message.login} image={message.image} size={22} />
              <span>
                <small>
                  {message.login} ·{' '}
                  {new Date(message.at).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', {
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
      <form className="meet-write" onSubmit={submit}>
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
          disabled={action.busy || text.trim() === ''}
        >
          {t('meet.sendText')}
        </button>
      </form>
      <ErrorNote error={action.error} />

      {codes && <Attendance eventId={eventId} />}
    </section>
  )
}
