import type { CalendarEvent } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { timeOn } from './dates'
import { iconOf } from './kinds'

type EventChipProps = {
  event: CalendarEvent
  /** El día en el que se pinta: un evento de varios días solo enseña la hora el primero. */
  day: Date
  /** `true` en la vista de mes, donde solo cabe una línea. */
  compact?: boolean
  onOpen: (event: CalendarEvent) => void
}

/**
 * Un evento en el calendario: su color y su icono dicen de qué tipo es, y el
 * borde discontinuo, que no estás apuntado.
 */
export function EventChip({ event, day, compact = false, onOpen }: EventChipProps) {
  const { t, lang } = useI18n()
  const hour = timeOn(event, day, lang)
  const label = [t(`agenda.kind.${event.kind}`), hour, event.title].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      className={`event-chip kind-${event.kind} ${event.joined === false ? 'not-joined' : ''} ${compact ? 'compact' : ''}`}
      aria-label={label}
      title={label}
      onClick={() => {
        onOpen(event)
      }}
    >
      <span className="event-icon" aria-hidden="true">
        {iconOf(event.kind)}
      </span>
      {hour !== '' && <span className="event-time">{hour}</span>}
      <span className="event-title">{event.title}</span>
      {!compact && event.place !== null && <span className="event-place">{event.place}</span>}
    </button>
  )
}
