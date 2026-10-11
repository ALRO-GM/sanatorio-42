import { useState } from 'react'

import type { Booking, HelperTag, RequesterTag } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { REQUESTER_TAGS } from './tags'

type BookingCardProps = {
  booking: Booking
  /** `true` si la reserva es de hoy; si no, se enseña el día. */
  today: boolean
  onChange: () => void
}

/**
 * Una reserva de ayuda, con lo que toca hacer en cada momento: aceptarla,
 * anularla, valorarla o ver cómo se cerró.
 */
export function BookingCard({ booking, today, onChange }: BookingCardProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [earned, setEarned] = useState<number | null>(null)
  const helping = booking.role === 'helper'
  const live = booking.status === 'pending' || booking.status === 'confirmed'
  const toRate = booking.status === 'confirmed' && booking.finished && !booking.ratedByMe
  const closedXp = booking.xp ?? earned

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    if (await run(fn)) onChange()
  }

  const rate = async (tag: HelperTag | RequesterTag): Promise<void> => {
    await act(async () => {
      setEarned((await api.rateBooking(booking.id, tag)).xp)
    })
  }

  const status =
    booking.status === 'confirmed' && booking.finished
      ? 'finished'
      : booking.status === 'confirmed' && !booking.finished
        ? 'confirmed'
        : booking.status

  return (
    <article className={`card booking ${toRate ? 'to-rate' : ''}`}>
      <header className="card-head">
        <Avatar login={booking.peer.login} image={booking.peer.image} size={36} />
        <h3>{t(helping ? 'help.youHelp' : 'help.helpsYou', { login: booking.peer.login })}</h3>
        <span
          className={`badge ${status === 'confirmed' ? 'on' : status === 'pending' ? 'on plain' : 'off'}`}
        >
          {t(`help.status.${status}`)}
        </span>
      </header>
      <p className="hint">
        {!today && `${booking.day} · `}
        {booking.start}–{booking.end}
        {booking.projectName !== null && ` · ${booking.projectName}`}
      </p>
      {booking.note !== null && <p>{booking.note}</p>}

      {toRate && (
        <div className="rating">
          <strong>
            {t(helping ? 'help.rateRequester' : 'help.rateHelper', { login: booking.peer.login })}
          </strong>
          <span className="hint">{t('help.rateHint')}</span>
          <div className="rating-options">
            {helping
              ? REQUESTER_TAGS.map(({ tag, emoji }) => (
                  <button
                    key={tag}
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => void rate(tag)}
                  >
                    <span aria-hidden="true">{emoji}</span> {t(`help.tag.${tag}`)}
                  </button>
                ))
              : REACTIONS.map(({ kind, emoji }) => (
                  <button
                    key={kind}
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => void rate(kind)}
                  >
                    <span aria-hidden="true">{emoji}</span> {t(`react.${kind}`)}
                  </button>
                ))}
          </div>
        </div>
      )}

      {booking.status === 'confirmed' &&
        booking.finished &&
        booking.ratedByMe &&
        closedXp === null && (
          <p className="hint" role="status">
            {booking.ratedByPeer
              ? t('help.waitingCode')
              : t('help.waitingPeer', { login: booking.peer.login })}
          </p>
        )}
      {closedXp !== null && (
        <p className={closedXp > 0 ? 'reaction-done' : 'hint'} role="status">
          {closedXp > 0
            ? t(helping ? 'help.closedXpMine' : 'help.closedXp', {
                login: booking.peer.login,
                xp: closedXp,
              })
            : t('help.closedNoXp')}
        </p>
      )}

      <ErrorNote error={error} />
      {live && closedXp === null && (
        <div className="actions">
          {helping && booking.status === 'pending' && (
            <>
              <button
                type="button"
                className="primary small"
                disabled={busy}
                onClick={() => void act(() => api.respondBooking(booking.id, true))}
              >
                {t('help.accept')}
              </button>
              <button
                type="button"
                className="pill"
                disabled={busy}
                onClick={() => void act(() => api.respondBooking(booking.id, false))}
              >
                {t('help.decline')}
              </button>
            </>
          )}
          {!(helping && booking.status === 'pending') && (
            <button
              type="button"
              className="pill"
              disabled={busy}
              onClick={() => void act(() => api.cancelBooking(booking.id))}
            >
              {t(booking.finished ? 'help.didNotHappen' : 'help.cancel')}
            </button>
          )}
          {helping && (
            <button
              type="button"
              className="link"
              disabled={busy}
              onClick={() => void act(() => api.blockHelp(booking.peer.login))}
            >
              {t('help.block', { login: booking.peer.login })}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
