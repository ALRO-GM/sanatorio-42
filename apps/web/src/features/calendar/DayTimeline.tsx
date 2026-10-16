import { useEffect, useState } from 'react'

import type { CalendarEvent } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { eventsOn, locale, sameDay } from './dates'
import { EventChip } from './EventChip'
import { hourRange, hoursIn, lanesOf, minutesUntilNext } from './timeline'
import type { Layout } from './timeline'

/** Alto, en píxeles, de una hora: lo justo para leer un evento de media hora. */
const MIN_HOUR_PX = 44
/** Con pocas horas a la vista, se estiran hasta que el día ocupe esto. */
const TARGET_PX = 640
const MAX_HOUR_PX = 120
/** Por debajo de este alto, un evento va en una sola línea. */
const SHORT_PX = 44

type DayTimelineProps = {
  days: readonly Date[]
  events: readonly CalendarEvent[]
  layout: Exclude<Layout, 'list'>
  /** `true` en la semana: cada día con su cabecera, que lo abre. */
  week: boolean
  onOpen: (event: CalendarEvent) => void
  onOpenDay: (day: Date) => void
}

/**
 * El día o la semana con las horas a la vista: cada evento ocupa su franja, y
 * los que se pisan van uno al lado del otro. Una raya marca la hora actual.
 */
export function DayTimeline({ days, events, layout, week, onOpen, onOpenDay }: DayTimelineProps) {
  const { t, lang } = useI18n()
  const [now, setNow] = useState(() => new Date())

  // La raya de ahora y lo que falta se mueven solos, cada minuto.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  const { from, to } = hourRange(layout, events, days, now)
  const hourPx = Math.min(MAX_HOUR_PX, Math.max(MIN_HOUR_PX, TARGET_PX / (to - from)))
  const hours = Array.from({ length: to - from }, (_, index) => from + index)
  const today = days.find((day) => sameDay(day, now))
  const waiting = today === undefined ? null : minutesUntilNext(eventsOn(events, today), now)
  const top = (hour: number): number => (hour - from) * hourPx

  return (
    <div className="timeline-wrap">
      {layout === 'now' && today !== undefined && (
        <p className="timeline-wait" role="status">
          {waiting === null
            ? t('agenda.nothingLeft')
            : t('agenda.waiting', {
                time:
                  waiting >= 60
                    ? t('agenda.hoursMinutes', { h: Math.floor(waiting / 60), m: waiting % 60 })
                    : t('agenda.minutes', { m: waiting }),
              })}
        </p>
      )}
      <div
        className={`timeline ${week ? 'week' : 'day'}`}
        style={{ gridTemplateColumns: `3.2rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {week && <span aria-hidden="true" />}
        {week &&
          days.map((day) => (
            <button
              key={`head-${day.toISOString()}`}
              type="button"
              className={`day-head ${sameDay(day, now) ? 'today' : ''}`}
              onClick={() => {
                onOpenDay(day)
              }}
            >
              <span>{day.toLocaleDateString(locale(lang), { weekday: 'short' })}</span>
              <strong>{day.getDate()}</strong>
            </button>
          ))}

        <div className="timeline-hours" style={{ height: (to - from) * hourPx }} aria-hidden="true">
          {hours.map((hour) => (
            <span key={hour} style={{ top: top(hour) }}>
              {String(hour).padStart(2, '0')}:00
            </span>
          ))}
        </div>

        {days.map((day) => {
          const shown = lanesOf(eventsOn(events, day), day).filter(
            (one) => one.end > from && one.start < to,
          )
          const nowAt = sameDay(day, now) ? hoursIn(day, now.toISOString()) : null

          return (
            <div
              key={day.toISOString()}
              className={`timeline-day ${sameDay(day, now) ? 'today' : ''}`}
              style={{ height: (to - from) * hourPx }}
            >
              {hours.map((hour) => (
                <i key={hour} className="timeline-line" style={{ top: top(hour) }} />
              ))}
              {shown.length === 0 && <p className="day-empty">{t('agenda.empty')}</p>}
              {shown.map(({ event, start, end, lane, lanes }) => {
                const height = Math.max(
                  22,
                  (Math.min(end, to) - Math.max(start, from)) * hourPx - 2,
                )

                return (
                  <EventChip
                    key={event.id}
                    event={event}
                    day={day}
                    onOpen={onOpen}
                    short={height < SHORT_PX}
                    style={{
                      position: 'absolute',
                      top: top(Math.max(start, from)),
                      height,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  />
                )
              })}
              {nowAt !== null && nowAt >= from && nowAt <= to && (
                <i className="timeline-now" style={{ top: top(nowAt) }} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
