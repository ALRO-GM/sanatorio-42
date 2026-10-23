import { useEffect, useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Blocks } from '../../shared/layout/Blocks'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'
import { BookingCard } from './BookingCard'
import { cheerFor } from './cheers'
import { DayEditor } from './DayEditor'
import { GuardStatus } from './GuardStatus'
import { onAvailability } from '../../shared/availability'
import { GuardTour } from './GuardTour'
import { PreReviewToggle } from './PreReviewToggle'

/**
 * Tu guardia de hoy: las franjas en las que te ofreces, las reservas (las que
 * te piden y las que has pedido) y a quién no quieres ayudar.
 */
export function Guardia() {
  const { t, tree } = useI18n()
  // La frase de ánimo se elige al entrar: no cambia mientras se marcan franjas.
  const [pick] = useState(() => Math.random())
  const { data, error, loading, reload, setData } = useAsync(() => api.getHelpDay(), [])
  const unblocking = useAction()

  // Encender o apagar el interruptor cambia «cómo te ven ahora»: se pide otra
  // vez sin pasar por «cargando», para no perder lo marcado sin guardar.
  useEffect(
    () =>
      onAvailability(() => {
        api.getHelpDay().then(setData, () => undefined)
      }),
    [setData],
  )

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
      <h2>
        {t('help.title')}
        <InfoTip title={t('help.title')}>
          <GuardTour />
        </InfoTip>
      </h2>
      <p className="cheer">{cheerFor(tree, data.windows.length > 0, pick)}</p>

      <Blocks
        page="guardia"
        blocks={[
          { id: 'prereview', content: <PreReviewToggle /> },
          {
            id: 'today',
            content: (
              <>
                <GuardStatus day={data} />
                <DayEditor key={data.day} day={data} onSaved={setData} />
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
                      <span className="eyebrow">
                        {t('help.blocked')}
                        <InfoTip title={t('help.blocked')}>
                          <p>{t('help.blockedHint')}</p>
                        </InfoTip>
                      </span>
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
