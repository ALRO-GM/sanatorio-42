import { useState } from 'react'

import type { BoardView } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ReportButton } from '../admin/ReportButton'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { useConfirm } from '../../shared/ui/useConfirm'
import { BoardForm } from './BoardForm'
import { dayKey, hhmm } from '../../shared/day'

type BoardCardProps = {
  board: BoardView
  /** `true` en la próxima pizarra, que se destaca. */
  featured: boolean
  onChange: () => void
}

export function BoardCard({ board, featured, onChange }: BoardCardProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const start = new Date(board.startsAt)
  const past = Date.parse(board.endsAt) <= Date.now()
  const full = board.attendees >= board.capacity
  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    if (await run(fn)) onChange()
  }

  if (editing) {
    return (
      <BoardForm
        defaultDay={dayKey(start)}
        board={board}
        onCancel={() => {
          setEditing(false)
        }}
        onSaved={() => {
          setEditing(false)
          onChange()
        }}
      />
    )
  }

  return (
    <article className={`card board-card ${featured ? 'featured' : ''}`}>
      <div className="date-badge" aria-hidden="true">
        <span>{t('cal.weekdaysShort').split(',')[(start.getDay() + 6) % 7]}</span>
        <strong>{start.getDate()}</strong>
      </div>
      <div className="board-body">
        {featured && <span className="badge on plain">{t('cal.nextBoard')}</span>}
        <h3>{board.title}</h3>
        <p className="hint">
          {start.getDate()} {t('cal.monthsShort').split(',')[start.getMonth()]} ·{' '}
          {hhmm(board.startsAt)}–{hhmm(board.endsAt)} · {board.place}
        </p>
        {board.description !== null && <p>{board.description}</p>}
        <p className="host">
          <Avatar login={board.host} image={board.hostImage} size={24} />
          <strong>{board.host}</strong>
          <span className="hint">
            {t('cal.seats', { taken: board.attendees, capacity: board.capacity })}
          </span>
        </p>
        <ErrorNote error={error} />
      </div>
      <div className="board-side">
        {board.topic !== null && <span className="chip">{board.topic}</span>}
        {past ? (
          <span className="badge off">{t('cal.past')}</span>
        ) : board.mine ? (
          <>
            <button
              className="pill"
              onClick={() => {
                setEditing(true)
              }}
            >
              {t('edit.edit')}
            </button>
            <button
              className="pill"
              disabled={busy}
              onClick={() => void act(() => api.cancelBoard(board.id))}
            >
              {t('cal.cancel')}
            </button>
          </>
        ) : board.joined ? (
          <button
            className="pill"
            disabled={busy}
            onClick={() => void act(() => api.leaveBoard(board.id))}
          >
            {t('cal.leave')}
          </button>
        ) : (
          <button
            className="primary small"
            disabled={busy || full}
            onClick={() => void act(() => api.joinBoard(board.id))}
          >
            {full ? t('cal.full') : t('cal.join')}
          </button>
        )}
        {/* Quien modera puede retirar la de otra persona, pero no cambiarla. */}
        {!past && !board.mine && board.canCancel && (
          <button
            className="link"
            disabled={busy}
            onClick={() => {
              void confirm
                .ask({
                  body: t('cal.removeAsk', { host: board.host }),
                  okText: t('cal.remove'),
                  danger: true,
                })
                .then((ok) => (ok ? act(() => api.cancelBoard(board.id)) : undefined))
            }}
          >
            {t('cal.remove')}
          </button>
        )}
      </div>
      {!board.mine && (
        <ReportButton target={`board:${board.id}`} summary={`${board.host}: ${board.title}`} />
      )}
      {confirm.dialog}
    </article>
  )
}
