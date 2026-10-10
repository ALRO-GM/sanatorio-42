import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type DoubtDetailCardProps = {
  doubtId: number
  onClose: () => void
  /** La duda ha cambiado (respuesta nueva, resuelta, borrada): hay que refrescar el corcho. */
  onChange: () => void
}

/** Una duda abierta: sus respuestas y el formulario para responder. */
export function DoubtDetailCard({ doubtId, onClose, onChange }: DoubtDetailCardProps) {
  const { t } = useI18n()
  const detail = useAsync(() => api.getDoubt(doubtId), [doubtId])
  const { busy, error, run } = useAction()
  const [reply, setReply] = useState('')

  if (detail.loading) {
    return (
      <div className="card doubt-detail">
        <p>{t('app.loading')}</p>
      </div>
    )
  }

  if (detail.data === undefined) {
    return (
      <div className="card doubt-detail">
        <ErrorNote error={detail.error} />
        <button className="pill" onClick={onClose}>
          {t('board.closeDoubt')}
        </button>
      </div>
    )
  }

  const doubt = detail.data
  const refresh = (): void => {
    void detail.reload()
    onChange()
  }

  const answer = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    if (await run(() => api.answerDoubt(doubtId, reply))) {
      setReply('')
      refresh()
    }
  }

  /** Da la duda por resuelta con esa respuesta, o la reabre con `null`. */
  const solveWith = async (answerId: number | null): Promise<void> => {
    if (await run(() => api.setDoubtResolved(doubtId, answerId))) refresh()
  }

  const resolved = doubt.status === 'resolved'

  const remove = async (): Promise<void> => {
    if (await run(() => api.removeDoubt(doubtId))) {
      onChange()
      onClose()
    }
  }

  return (
    <article className="card doubt-detail">
      <header className="card-head">
        <h3>{doubt.body}</h3>
        <span className={`postit-status ${doubt.status}`}>{t(`board.status.${doubt.status}`)}</span>
      </header>
      <p className="hint">{doubt.author}</p>

      {doubt.replies.length === 0 && <p className="estado">{t('board.noAnswers')}</p>}
      {doubt.mine && !resolved && doubt.replies.length > 0 && (
        <p className="hint">{t('board.resolveHint')}</p>
      )}
      <ul className="replies">
        {doubt.replies.map((entry) => (
          <li
            key={entry.id}
            className={[
              entry.specialist ? 'by-specialist' : '',
              entry.id === doubt.solvedAnswerId ? 'solution' : '',
            ].join(' ')}
          >
            <strong>{entry.author}</strong>
            {entry.specialist && (
              <span className="badge specialist">★ {t('board.specialistTag')}</span>
            )}
            {entry.id === doubt.solvedAnswerId && (
              <span className="badge on">{t('board.solution')}</span>
            )}
            <p>{entry.body}</p>
            {doubt.mine && !resolved && (
              <button
                type="button"
                className="pill"
                disabled={busy}
                onClick={() => void solveWith(entry.id)}
              >
                {t('board.solvedByThis')}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={(event) => void answer(event)} className="reply-form">
        <textarea
          value={reply}
          onChange={(event) => {
            setReply(event.target.value)
          }}
          placeholder={t('board.answerHint')}
          aria-label={t('board.answerHint')}
          maxLength={1000}
          rows={2}
          required
        />
        <ErrorNote error={error} />
        <div className="actions">
          <button
            type="submit"
            className="primary small"
            disabled={busy || reply.trim().length < 2}
          >
            {t('board.answer')}
          </button>
          {doubt.mine && (
            <>
              {resolved && (
                <button
                  type="button"
                  className="pill"
                  disabled={busy}
                  onClick={() => void solveWith(null)}
                >
                  {t('board.reopen')}
                </button>
              )}
              <button type="button" className="pill" disabled={busy} onClick={() => void remove()}>
                {t('board.remove')}
              </button>
            </>
          )}
          <button type="button" className="pill" onClick={onClose}>
            {t('board.closeDoubt')}
          </button>
        </div>
      </form>
    </article>
  )
}
