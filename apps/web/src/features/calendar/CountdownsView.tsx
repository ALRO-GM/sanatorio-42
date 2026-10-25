import { useEffect } from 'react'

import type { CalendarEvent } from '@sanatorio/contracts'

import { eventTitle } from '../../shared/eventTitle'
import { api } from '../../shared/api'
import { markCountdownsPage, useCountdowns } from '../../shared/countdowns'
import { useAsync } from '../../shared/hooks/useAsync'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { CountdownItem } from '../countdowns/CountdownDock'
import { CountdownPicker } from '../countdowns/CountdownPicker'
import { addDays, startOfDay } from './dates'
import { KINDS } from './kinds'
import { PinCountdown } from './PinCountdown'

/** Hasta dónde se buscan eventos que fijar. */
const AHEAD_DAYS = 30

/**
 * La vista de cuentas atrás del calendario (`docs/avisos-cuenta-atras.md`):
 * las que tienes, en grande, y cómo fijar más sin buscar cada evento en el
 * calendario: el próximo compromiso, algo tuyo, o cualquiera de lo que viene
 * en el próximo mes, con un botón.
 */
export function CountdownsView({ onOpen }: { onOpen: (event: CalendarEvent) => void }) {
  const { t } = useI18n()
  const { dateTime } = useFormat()
  const list = useCountdowns()
  const shown = list ?? []
  const now = useNow(1000, { active: shown.length > 0 })
  const start = startOfDay(new Date()).toISOString()
  const end = addDays(new Date(start), AHEAD_DAYS).toISOString()
  const { data, error, reload } = useAsync(() => api.getCalendar(start, end), [start, end])
  const coming = (data?.events ?? [])
    .filter((event) => Date.parse(event.start) > Date.now())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  // Aquí ya está todo en grande: la ventanita flotante sobra y taparía la lista.
  useEffect(() => {
    markCountdownsPage(true)

    return () => {
      markCountdownsPage(false)
    }
  }, [])

  const iconOf = (kind: CalendarEvent['kind']) =>
    KINDS.find((entry) => entry.kind === kind)?.icon ?? 'calendario'

  return (
    <div className="countdowns-view">
      <section className="countdowns-mine" aria-labelledby="countdowns-mine">
        <h3 id="countdowns-mine">{t('countdown.mine')}</h3>
        {shown.length === 0 ? (
          <p className="hint">{t('countdown.none')}</p>
        ) : (
          <ul className="countdown-list">
            {shown.map((entry) => (
              <CountdownItem key={`${entry.kind}-${entry.id}`} entry={entry} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section className="countdowns-add" aria-labelledby="countdowns-add">
        <h3 id="countdowns-add">{t('countdown.add')}</h3>
        <CountdownPicker list={shown} onDone={() => undefined} inPage />
      </section>

      <section className="countdowns-coming" aria-labelledby="countdowns-coming">
        <h3 id="countdowns-coming">{t('countdown.coming', { n: AHEAD_DAYS })}</h3>
        {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
        {data !== undefined && coming.length === 0 && (
          <p className="hint">{t('countdown.comingNone')}</p>
        )}
        <ul className="countdowns-events">
          {coming.map((event) => (
            <li key={event.id} className={`countdowns-event kind-${event.kind}`}>
              <button
                type="button"
                className="countdowns-event-open"
                onClick={() => {
                  onOpen(event)
                }}
              >
                <Icon name={iconOf(event.kind)} size={16} />
                <span>
                  <strong>{eventTitle(t, event)}</strong>
                  <small>
                    {t(`agenda.kind.${event.kind}`)} · {dateTime(Date.parse(event.start))}
                  </small>
                </span>
              </button>
              <PinCountdown event={event} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
