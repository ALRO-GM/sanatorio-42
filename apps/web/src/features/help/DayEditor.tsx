import { useState } from 'react'

import type { HelpDay } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { DAY_END, DAY_START, duration, SLOT, slotsOf, toMinutes, toTime, windowsOf } from './time'

type DayEditorProps = {
  day: HelpDay
  onSaved: (day: HelpDay) => void
}

/** Topes que se pueden elegir: de media hora a ocho horas. */
const MAX_OPTIONS = Array.from({ length: 16 }, (_, index) => (index + 1) * SLOT)

/**
 * El calendario de hoy: se marcan las medias horas en las que te ofreces y el
 * tope de tiempo que quieres ayudar. Las que ya han pasado no se pueden marcar.
 */
export function DayEditor({ day, onSaved }: DayEditorProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [slots, setSlots] = useState(() => slotsOf(day.windows))
  const [maxMinutes, setMaxMinutes] = useState(day.maxMinutes)
  const [saved, setSaved] = useState(false)

  const now = toMinutes(day.now)
  const offered = slots.size * SLOT
  // Primera hora que se enseña: la de ahora, para no gastar pantalla en el pasado.
  const first = Math.max(DAY_START, Math.floor(now / 60) * 60)
  const starts = Array.from(
    { length: (DAY_END - first) / SLOT },
    (_, index) => first + index * SLOT,
  )

  const toggle = (start: number): void => {
    setSaved(false)
    setSlots((current) => {
      const next = new Set(current)

      if (!next.delete(start)) next.add(start)

      return next
    })
  }

  const save = async (): Promise<void> => {
    const ok = await run(async () => {
      onSaved(await api.setHelpDay({ windows: windowsOf(slots), maxMinutes }))
    })

    setSaved(ok)
  }

  return (
    <article className="card form">
      <h3>{t('help.today')}</h3>
      <p className="hint">{t('help.todayHint')}</p>

      <div className="slot-grid" role="group" aria-label={t('help.today')}>
        {starts.map((start) => {
          const past = start + SLOT <= now
          const active = slots.has(start)

          return (
            <button
              key={start}
              type="button"
              className={`slot ${active ? 'active' : ''}`}
              aria-pressed={active}
              disabled={past || day.mustRate}
              onClick={() => {
                toggle(start)
              }}
            >
              {toTime(start)}
            </button>
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
        <p className="hint help-summary" role="status">
          {offered === 0
            ? t('help.noWindows')
            : t('help.summary', {
                offered: duration(offered),
                max: duration(Math.min(maxMinutes, offered)),
              })}
          {day.bookedMinutes > 0 && ` ${t('help.booked', { booked: duration(day.bookedMinutes) })}`}
        </p>
      </div>

      {day.mustRate && <p className="estado aviso">{t('help.mustRate')}</p>}
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
