import { useMemo, useState } from 'react'

import type { CalendarEvent, CalendarKind, CalendarSection } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { addDays, daysOf, eventsOn, locale, move, rangeTitle, sameDay, startOfDay } from './dates'
import { EventChip } from './EventChip'
import { EventDialog } from './EventDialog'
import { KINDS, loadHidden, loadView, saveHidden, saveView, VIEWS } from './kinds'
import type { View } from './kinds'

type CalendarPageProps = {
  /** Ir a otra sección de la web, desde la ficha de un evento propio. */
  onGo: (section: CalendarSection) => void
}

/** Eventos que caben en cada casilla del mes antes de resumir el resto en "+N". */
const MONTH_CELL_EVENTS = 3

/**
 * Tu calendario: lo de Sanatorio (guardia, terapias, pizarras) y lo de 42
 * (correcciones, eventos, exámenes), por día, semana o mes. Cada tipo tiene su
 * color y su icono, y se puede ocultar.
 */
export function CalendarPage({ onGo }: CalendarPageProps) {
  const { t, lang } = useI18n()
  const [view, setView] = useState<View>(loadView)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [hidden, setHidden] = useState(loadHidden)
  const [open, setOpen] = useState<CalendarEvent | null>(null)

  const days = useMemo(() => daysOf(view, cursor), [view, cursor])
  const from = (days[0] ?? cursor).toISOString()
  const to = addDays(days.at(-1) ?? cursor, 1).toISOString()
  const { data, error, loading, reload } = useAsync(() => api.getCalendar(from, to), [from, to])

  const today = startOfDay(new Date())
  const visible = (data?.events ?? []).filter((event) => !hidden.has(event.kind))
  // Cuántos hay de cada tipo en lo que se está viendo, para los filtros.
  const counts = new Map<CalendarKind, number>()

  for (const event of data?.events ?? []) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1)
  }

  const changeView = (next: View): void => {
    saveView(next)
    setView(next)
  }

  const toggleKind = (kind: CalendarKind): void => {
    const next = new Set(hidden)

    if (!next.delete(kind)) next.add(kind)

    saveHidden(next)
    setHidden(next)
  }

  const openDay = (day: Date): void => {
    setCursor(day)
    changeView('day')
  }

  const weekdays = (days.length >= 7 ? days.slice(0, 7) : []).map((day) =>
    day.toLocaleDateString(locale(lang), { weekday: 'short' }),
  )

  return (
    <section>
      <h2>{t('agenda.title')}</h2>
      <p className="lead">{t('agenda.subtitle')}</p>

      <div className="card agenda">
        <div className="agenda-bar">
          <div className="agenda-nav">
            <button
              type="button"
              className="icon-btn"
              aria-label={t('agenda.prev')}
              onClick={() => {
                setCursor(move(view, cursor, -1))
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => {
                setCursor(today)
              }}
            >
              {t('agenda.today')}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('agenda.next')}
              onClick={() => {
                setCursor(move(view, cursor, 1))
              }}
            >
              ›
            </button>
            <strong className="agenda-range" aria-live="polite">
              {rangeTitle(view, cursor, lang)}
            </strong>
          </div>
          <div className="filter-pills" role="group" aria-label={t('agenda.view')}>
            {VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pill ${view === option ? 'active' : ''}`}
                aria-pressed={view === option}
                onClick={() => {
                  changeView(option)
                }}
              >
                {t(`agenda.view.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="agenda-kinds" role="group" aria-label={t('agenda.kinds')}>
          {KINDS.map(({ kind, icon }) => (
            <button
              key={kind}
              type="button"
              className={`kind-toggle kind-${kind} ${hidden.has(kind) ? 'off' : ''}`}
              aria-pressed={!hidden.has(kind)}
              onClick={() => {
                toggleKind(kind)
              }}
            >
              <span className="kind-dot" aria-hidden="true" />
              <span aria-hidden="true">{icon}</span>
              {t(`agenda.kind.${kind}`)}
              {(counts.get(kind) ?? 0) > 0 && (
                <span className="kind-count">{counts.get(kind)}</span>
              )}
            </button>
          ))}
        </div>

        {loading && <p>{t('agenda.loading')}</p>}
        {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}

        {data !== undefined && view === 'month' && (
          <div className="month-grid">
            {weekdays.map((name) => (
              <span key={name} className="month-dow" aria-hidden="true">
                {name}
              </span>
            ))}
            {days.map((day) => {
              const events = eventsOn(visible, day)
              const shown = events.slice(0, MONTH_CELL_EVENTS)
              const outside = day.getMonth() !== cursor.getMonth()

              return (
                <div
                  key={day.toISOString()}
                  className={`month-cell ${outside ? 'outside' : ''} ${sameDay(day, today) ? 'today' : ''}`}
                >
                  <button
                    type="button"
                    className="month-day"
                    aria-label={day.toLocaleDateString(locale(lang), {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    onClick={() => {
                      openDay(day)
                    }}
                  >
                    {day.getDate()}
                  </button>
                  {shown.map((event) => (
                    <EventChip key={event.id} event={event} day={day} compact onOpen={setOpen} />
                  ))}
                  {events.length > shown.length && (
                    <button
                      type="button"
                      className="month-more"
                      onClick={() => {
                        openDay(day)
                      }}
                    >
                      {t('agenda.more', { n: events.length - shown.length })}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {data !== undefined && view !== 'month' && (
          <div className={`day-columns view-${view}`}>
            {days.map((day) => {
              const events = eventsOn(visible, day)

              return (
                <div
                  key={day.toISOString()}
                  className={`day-column ${sameDay(day, today) ? 'today' : ''}`}
                >
                  {view === 'week' && (
                    <button
                      type="button"
                      className="day-head"
                      onClick={() => {
                        openDay(day)
                      }}
                    >
                      <span>{day.toLocaleDateString(locale(lang), { weekday: 'short' })}</span>
                      <strong>{day.getDate()}</strong>
                    </button>
                  )}
                  {events.length === 0 && <p className="day-empty">{t('agenda.empty')}</p>}
                  {events.map((event) => (
                    <EventChip key={event.id} event={event} day={day} onOpen={setOpen} />
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {data !== undefined && (
          <p className="hint agenda-source">
            {data.fortyTwoAt === null
              ? t('agenda.no42')
              : t('agenda.from42', {
                  min: Math.max(0, Math.round((Date.now() - Date.parse(data.fortyTwoAt)) / 60_000)),
                })}
          </p>
        )}
      </div>

      {open !== null && (
        <EventDialog
          key={open.id}
          event={open}
          onClose={() => {
            setOpen(null)
          }}
          onGo={(section) => {
            setOpen(null)
            onGo(section)
          }}
        />
      )}
    </section>
  )
}
