import { useRef, useState } from 'react'

import { useI18n } from '../../shared/i18n'

type TimelineProps = {
  /** Correcciones por mes (`YYYY-MM`), en orden. */
  months: readonly { month: string; corrections: number }[]
  /** Periodo que se está mirando (`YYYY-MM-DD`), o `null` si no tiene ese límite. */
  from: string | null
  to: string | null
  /** Se llama al soltar, con el primer día del primer mes y el último del último. */
  onSelect: (from: string, to: string) => void
}

/** Último día de un mes `YYYY-MM`, como `YYYY-MM-DD`. */
function lastDayOf(month: string): string {
  const [year = '1970', index = '01'] = month.split('-')

  // El día 0 del mes siguiente es el último de este.
  return new Date(Date.UTC(Number(year), Number(index), 0)).toISOString().slice(0, 10)
}

/**
 * La actividad del campus mes a mes. Sirve para ver de un vistazo cuándo hubo
 * más correcciones y para elegir el periodo arrastrando sobre las barras.
 */
export function Timeline({ months, from, to, onSelect }: TimelineProps) {
  const { t, tn } = useI18n()
  // Mientras se arrastra: de qué barra a qué barra.
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null)
  const dragging = useRef(false)

  if (months.length < 2) {
    return null
  }

  const peak = Math.max(1, ...months.map((entry) => entry.corrections))
  const low = drag === null ? null : Math.min(drag.start, drag.end)
  const high = drag === null ? null : Math.max(drag.start, drag.end)

  const inRange = (index: number, month: string): boolean => {
    if (low !== null && high !== null) {
      return index >= low && index <= high
    }

    return (from === null || lastDayOf(month) >= from) && (to === null || `${month}-01` <= to)
  }

  const finish = (): void => {
    if (!dragging.current || low === null || high === null) {
      return
    }

    dragging.current = false

    const first = months[low]
    const last = months[high]

    setDrag(null)

    if (first !== undefined && last !== undefined) {
      onSelect(`${first.month}-01`, lastDayOf(last.month))
    }
  }

  return (
    <div className="net-timeline">
      <span className="eyebrow">{t('net.timeline')}</span>
      <div
        className="net-timeline-bars"
        role="group"
        aria-label={t('net.timeline')}
        onPointerUp={finish}
        onPointerLeave={finish}
      >
        {months.map((entry, index) => (
          <button
            key={entry.month}
            type="button"
            className={inRange(index, entry.month) ? 'on' : ''}
            title={tn('net.timeline.month', entry.corrections, { month: entry.month })}
            aria-label={tn('net.timeline.month', entry.corrections, { month: entry.month })}
            onPointerDown={(event) => {
              // Sin esto el navegador se queda el puntero en la primera barra.
              event.currentTarget.releasePointerCapture(event.pointerId)
              dragging.current = true
              setDrag({ start: index, end: index })
            }}
            onPointerEnter={() => {
              if (dragging.current) {
                setDrag((current) => (current === null ? null : { ...current, end: index }))
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(`${entry.month}-01`, lastDayOf(entry.month))
              }
            }}
          >
            <span style={{ height: `${Math.max(4, (100 * entry.corrections) / peak)}%` }} />
          </button>
        ))}
      </div>
      <div className="net-timeline-years" aria-hidden="true">
        <span>{months[0]?.month}</span>
        <span>{months.at(-1)?.month}</span>
      </div>
      <p className="hint">{t('net.timeline.hint')}</p>
    </div>
  )
}
