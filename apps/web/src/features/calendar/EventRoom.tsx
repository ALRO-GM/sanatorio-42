import { useState } from 'react'

import type { MeetReason } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Attendance } from './Attendance'
import { Chat } from '../../shared/chat/Chat'
import { useThread } from '../../shared/chat/useThread'
import { Icon } from '../../shared/ui/Icon'

const DELAYS = [5, 10, 15, 30] as const
const REASONS = [
  'evaluation',
  'other_event',
  'on_my_way',
  'transport',
  'other',
] as const satisfies readonly MeetReason[]

type EventRoomProps = {
  /** Id del evento en el calendario. */
  eventId: string
  me: string
  /** Asistencia con códigos: solo pizarras y sesiones de ayuda. */
  codes?: boolean
  /** Se ha contestado al aviso (voy, me retraso o no voy). */
  onReplied?: () => void
  /**
   * `true` si lo único que toca es contestar: sin chat ni códigos, que ya se
   * verán al abrir el evento. Es el aviso que no se puede cerrar sin responder.
   */
  replyOnly?: boolean
}

/**
 * La "sala" de un evento con otras personas: respuestas rápidas al aviso (lo he
 * visto, me retraso, no puedo ir), el chat que comparten todos los del evento
 * y, en pizarras y sesiones de ayuda, la asistencia con códigos.
 */
export function EventRoom({
  eventId,
  me,
  codes = false,
  onReplied,
  replyOnly = false,
}: EventRoomProps) {
  const { t } = useI18n()
  const thread = useThread(eventId)
  // Qué respuesta se está detallando: los minutos del retraso o el motivo de no ir.
  const [detail, setDetail] = useState<'late' | 'absent' | null>(null)
  const [minutes, setMinutes] = useState<number>(10)
  const [reason, setReason] = useState<MeetReason>('evaluation')

  const tell = async (): Promise<void> => {
    const sent = await thread.send(
      detail === 'late' ? { kind: 'late', minutes, reason } : { kind: 'absent', reason },
    )

    if (sent) {
      setDetail(null)
      onReplied?.()
    }
  }

  const going = async (): Promise<void> => {
    if (await thread.send({ kind: 'seen' })) onReplied?.()
  }

  return (
    <section className="meet-room">
      <span className="eyebrow">{t('meet.reply')}</span>
      <div className="filter-pills">
        <button
          type="button"
          className="pill"
          disabled={thread.sending}
          onClick={() => void going()}
        >
          <Icon name="hecho" /> {t('meet.seen')}
        </button>
        <button
          type="button"
          className={`pill ${detail === 'late' ? 'active' : ''}`}
          aria-expanded={detail === 'late'}
          onClick={() => {
            setDetail(detail === 'late' ? null : 'late')
          }}
        >
          <Icon name="reloj" /> {t('meet.late')}
        </button>
        <button
          type="button"
          className={`pill ${detail === 'absent' ? 'active' : ''}`}
          aria-expanded={detail === 'absent'}
          onClick={() => {
            setDetail(detail === 'absent' ? null : 'absent')
          }}
        >
          <Icon name="ausente" /> {t('meet.absent')}
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
            {t('common.reason')}
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
            disabled={thread.sending}
            onClick={() => void tell()}
          >
            {t('meet.tell')}
          </button>
        </div>
      )}

      {replyOnly ? (
        <ErrorNote error={thread.sendError} />
      ) : (
        <>
          <Chat thread={thread} me={me} />
          {codes && <Attendance eventId={eventId} />}
        </>
      )}
    </section>
  )
}
