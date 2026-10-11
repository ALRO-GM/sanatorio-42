import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Blocks } from '../../shared/layout/Blocks'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { BookingCard } from './BookingCard'
import { DayEditor } from './DayEditor'
import { PreReviewToggle } from './PreReviewToggle'

/**
 * Tu guardia de hoy: las franjas en las que te ofreces, las reservas (las que
 * te piden y las que has pedido) y a quién no quieres ayudar.
 */
export function Guardia() {
  const { t } = useI18n()
  const { data, error, loading, reload, setData } = useAsync(() => api.getHelpDay(), [])
  const unblocking = useAction()

  if (loading) {
    return <p>{t('app.loading')}</p>
  }

  if (data === undefined) {
    return <ErrorNote error={error} onRetry={() => void reload()} />
  }

  // Primero lo que espera una respuesta tuya: valorar o aceptar.
  const urgency = (booking: (typeof data.bookings)[number]): number =>
    booking.status === 'confirmed' && booking.finished && !booking.ratedByMe
      ? 0
      : booking.status === 'pending' && booking.role === 'helper'
        ? 1
        : booking.status === 'pending' || booking.status === 'confirmed'
          ? 2
          : 3
  const bookings = [...data.bookings].sort(
    (a, b) => urgency(a) - urgency(b) || a.start.localeCompare(b.start),
  )

  return (
    <section>
      <h2>{t('help.title')}</h2>
      <p className="lead">{t('help.subtitle')}</p>

      <Blocks
        page="guardia"
        blocks={[
          {
            id: 'today',
            content: (
              <>
                <DayEditor key={data.day} day={data} onSaved={setData} />
                <PreReviewToggle />
              </>
            ),
          },
          {
            id: 'bookings',
            content: (
              <>
                {bookings.length === 0 && <p className="estado">{t('help.noBookings')}</p>}
                <ul className="stack">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <BookingCard
                        booking={booking}
                        today={booking.day === data.day}
                        onChange={() => void reload()}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
          ...(data.blocked.length > 0
            ? [
                {
                  id: 'blocked',
                  content: (
                    <article className="card">
                      <span className="eyebrow">{t('help.blocked')}</span>
                      <p className="hint">{t('help.blockedHint')}</p>
                      <ul className="rows">
                        {data.blocked.map((login) => (
                          <li key={login} className="row plain">
                            <span>{login}</span>
                            <button
                              type="button"
                              className="pill row-count"
                              disabled={unblocking.busy}
                              onClick={() =>
                                void unblocking
                                  .run(() => api.unblockHelp(login))
                                  .then(() => reload())
                              }
                            >
                              {t('help.unblock')}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <ErrorNote error={unblocking.error} />
                    </article>
                  ),
                },
              ]
            : []),
        ]}
      />
    </section>
  )
}
