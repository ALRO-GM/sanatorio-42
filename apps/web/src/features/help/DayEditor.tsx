import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { HelpDay } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import {
  bookedSlotsOf,
  canToggle,
  DAY_END,
  DAY_START,
  duration,
  SLOT,
  slotsOf,
  toMinutes,
  toTime,
  windowsOf,
} from './time'
import { Icon } from '../../shared/ui/Icon'

type DayEditorProps = {
  day: HelpDay
  onSaved: (day: HelpDay) => void
}

/** Dónde acaba la franja que empieza en `start`: la última media hora seguida, más una. */
function endOf(slots: ReadonlySet<number>, start: number): number {
  let end = start + SLOT

  while (slots.has(end)) end += SLOT

  return end
}

/** Topes que se pueden elegir: de media hora a ocho horas. */
const MAX_OPTIONS = Array.from({ length: 16 }, (_, index) => (index + 1) * SLOT)

/**
 * El calendario de hoy, como el día del calendario: se arrastra por las medias
 * horas en las que te ofreces (varias franjas si quieres) y se elige el tope
 * de tiempo que quieres ayudar. Una media hora que ya ha empezado no se
 * puede marcar (nadie podría reservarla entera), pero sí quitar si te vas. La
 * que alguien ha reservado no se quita aquí: hay que cancelar la reserva.
 */
export function DayEditor({ day, onSaved }: DayEditorProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [slots, setSlots] = useState(() => slotsOf(day.windows))
  const [maxMinutes, setMaxMinutes] = useState(day.maxMinutes)
  const [saved, setSaved] = useState(false)

  // La hora del campus, que sigue corriendo con la página abierta: la de la API
  // más lo que ha pasado desde que llegó.
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const since = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - since) / 60_000))
    }, 20_000)

    setElapsed(0)

    return () => {
      clearInterval(timer)
    }
  }, [day.now])

  const now = toMinutes(day.now) + elapsed
  // Medias horas en las que ya tienes algo en el calendario: ahí no te puedes ofrecer.
  const evaluationSlots = slotsOf(day.busy)
  const bookedSlots = bookedSlotsOf(day)
  const offered = slots.size * SLOT
  // Primera hora que se enseña: la de ahora, para no gastar pantalla en el pasado.
  const first = Math.max(DAY_START, Math.floor(now / 60) * 60)
  const starts = Array.from(
    { length: (DAY_END - first) / SLOT },
    (_, index) => first + index * SLOT,
  )

  /** Si una media hora se puede poner (`add`) o quitar (`remove`) ahora. */
  const allowed = (start: number, mode: 'add' | 'remove'): boolean => {
    const past = start <= now
    const booked = bookedSlots.has(start)
    const taken = evaluationSlots.has(start)

    return mode === 'add'
      ? canToggle({ past, active: false, booked, taken })
      : canToggle({ past, active: true, booked, taken })
  }

  const apply = (start: number, mode: 'add' | 'remove'): void => {
    if (!allowed(start, mode)) return

    setSaved(false)
    setSlots((current) => {
      if (current.has(start) === (mode === 'add')) return current

      const next = new Set(current)

      if (mode === 'add') next.add(start)
      else next.delete(start)

      return next
    })
  }

  // Arrastrar: lo que hace la primera media hora pulsada (poner o quitar) se
  // repite en todas las que se recorren. Así se marcan franjas enteras de un
  // gesto, y varias en el mismo día.
  const drag = useRef<'add' | 'remove' | null>(null)
  const slotAt = (event: ReactPointerEvent): number | null => {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-slot]')

    return target?.dataset.slot === undefined ? null : Number(target.dataset.slot)
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const start = slotAt(event)

    // Solo el botón principal (o el dedo): el derecho abre su menú, como siempre.
    if (start === null || day.mustRate || event.button > 0) return

    event.preventDefault()
    drag.current = slots.has(start) ? 'remove' : 'add'
    // Que el arrastre siga aunque el dedo se salga de la rejilla.
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    apply(start, drag.current)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (drag.current === null) return

    const start = slotAt(event)

    if (start !== null) apply(start, drag.current)
  }
  const onPointerUp = (): void => {
    drag.current = null
  }

  const save = async (): Promise<void> => {
    const ok = await run(async () => {
      const result = await api.setHelpDay({ windows: windowsOf(slots), maxMinutes })

      // La API descarta lo que ya ha empezado: se enseña lo que ha quedado.
      setSlots(slotsOf(result.windows))
      onSaved(result)
    })

    setSaved(ok)
  }

  return (
    <article className="card form">
      <h3>{t('help.today')}</h3>

      <p className="hint">{t('help.dragHint')}</p>
      <div
        className="slot-day"
        role="group"
        aria-label={t('help.today')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {starts.map((start) => {
          const past = start <= now
          const active = slots.has(start)
          const taken = evaluationSlots.has(start)
          const booked = bookedSlots.has(start)
          // Las seguidas se pintan como un bloque, como un evento del calendario.
          const joinedAbove = active && slots.has(start - SLOT)
          const joinedBelow = active && slots.has(start + SLOT)

          return (
            <div key={start} className={`slot-row ${start % 60 === 0 ? 'hour' : ''}`}>
              <span className="slot-hour" aria-hidden="true">
                {start % 60 === 0 ? toTime(start) : ''}
              </span>
              <button
                type="button"
                data-slot={start}
                className={[
                  'slot',
                  active ? 'active' : '',
                  taken ? 'busy' : '',
                  past ? 'past' : '',
                  booked ? 'booked' : '',
                  joinedAbove ? 'joined-above' : '',
                  joinedBelow ? 'joined-below' : '',
                ].join(' ')}
                aria-pressed={active}
                aria-label={`${toTime(start)}–${toTime(start + SLOT)}`}
                title={
                  booked
                    ? t('help.bookedSlot')
                    : past && !active
                      ? t('help.pastSlot')
                      : taken
                        ? t('help.busySlot')
                        : undefined
                }
                disabled={!canToggle({ past, active, booked, taken }) || day.mustRate}
                onClick={(event) => {
                  // Con el ratón o el dedo ya lo ha hecho el arrastre; esto es el teclado.
                  if (event.detail === 0) apply(start, active ? 'remove' : 'add')
                }}
              >
                {taken && <Icon name="lupa" size={13} />}
                {active && !joinedAbove && (
                  <span className="slot-label">
                    {toTime(start)}–{toTime(endOf(slots, start))}
                  </span>
                )}
                {booked && <span className="slot-label">{t('help.bookedShort')}</span>}
              </button>
            </div>
          )
        })}
      </div>

      <div className="form-grid">
        <label>
          {t('help.max')}
          <select
            value={maxMinutes}
            onChange={(event) => {
              setSaved(false)
              setMaxMinutes(Number(event.target.value))
            }}
            disabled={day.mustRate}
          >
            {MAX_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {duration(minutes)}
              </option>
            ))}
          </select>
        </label>
        {/* Un solo aviso, el más importante: sin valorar no se puede tocar nada. */}
        {day.mustRate ? (
          <p className="estado aviso" role="status">
            {t('help.mustRate')}
          </p>
        ) : (
          <p className="hint help-summary" role="status">
            {offered === 0
              ? t('help.noWindows')
              : t('help.summary', {
                  offered: duration(offered),
                  max: duration(Math.min(maxMinutes, offered)),
                })}
            {day.bookedMinutes > 0 &&
              ` ${t('help.booked', { booked: duration(day.bookedMinutes) })}`}
            {day.busy.length > 0 &&
              ` ${t('help.busy', {
                ranges: day.busy.map((range) => `${range.start}–${range.end}`).join(', '),
              })}`}
          </p>
        )}
      </div>

      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="button"
          className="primary small"
          disabled={busy || day.mustRate}
          onClick={() => void save()}
        >
          {t('help.save')}
        </button>
        {saved && (
          <span className="hint" role="status">
            {t('help.saved')}
          </span>
        )}
      </div>
    </article>
  )
}
