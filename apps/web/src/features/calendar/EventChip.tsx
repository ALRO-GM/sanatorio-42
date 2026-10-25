import type { CSSProperties } from 'react'

import type { CalendarEvent } from '@sanatorio/contracts'

import { eventTitle } from '../../shared/eventTitle'
import { useI18n } from '../../shared/i18n'
import { rangeOn, timeOn } from './dates'
import { iconOf } from './kinds'
import { Icon } from '../../shared/ui/Icon'

type EventChipProps = {
  event: CalendarEvent
  /** El día en el que se pinta: un evento de varios días solo enseña la hora el primero. */
  day: Date
  /** `true` en la vista de mes, donde solo cabe una línea. */
  compact?: boolean
  onOpen: (event: CalendarEvent) => void
  /** Dónde va en la línea de horas (posición y tamaño), si se pinta ahí. */
  style?: CSSProperties
  /** `true` si en la línea de horas es tan bajo que todo tiene que ir en una línea. */
  short?: boolean
}

/**
 * Un evento en el calendario: su color y su icono dicen de qué tipo es, y el
 * borde discontinuo, que no estás apuntado.
 */
export function EventChip({
  event,
  day,
  compact = false,
  onOpen,
  style,
  short = false,
}: EventChipProps) {
  const { t, lang } = useI18n()
  // En el mes solo cabe el inicio; en lo demás, inicio y fin.
  const hour = compact ? timeOn(event, day, lang) : rangeOn(event, day, lang)
  const title = eventTitle(t, event)
  const label = [t(`agenda.kind.${event.kind}`), hour, title].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      className={`event-chip kind-${event.kind} ${event.joined === false ? 'not-joined' : ''} ${compact ? 'compact' : ''} ${short ? 'short' : ''}`}
      aria-label={label}
      title={label}
      style={style}
      onClick={() => {
        onOpen(event)
      }}
    >
      <span className="event-icon" aria-hidden="true">
        <Icon name={iconOf(event.kind)} size={14} />
      </span>
      {hour !== '' && <span className="event-time">{hour}</span>}
      <span className="event-title">{title}</span>
      {!compact && event.place !== null && <span className="event-place">{event.place}</span>}
    </button>
  )
}
