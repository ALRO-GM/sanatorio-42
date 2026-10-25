import { useState } from 'react'

import type { Maintenance } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { dayKey, hhmm } from '../../shared/day'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { maintenanceSaved } from '../../shared/maintenance'
import { DayTimeFields, instantOf } from '../../shared/ui/DayTimeFields'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/** Atajos para la hora de acabar, en minutos desde ahora. */
const QUICK = [30, 60, 120, 240] as const

/**
 * Panel de gestión: el modo mantenimiento (`docs/mantenimiento.md`). Se pone
 * con un mensaje y, si se quiere, la hora prevista de acabar; mientras dura,
 * quien no administra ve la pantalla de mantenimiento con la cuenta atrás.
 */
export function MaintenancePanel() {
  const { data, error, loading, reload } = useAsync(() => api.getMaintenance(), [])
  const { t } = useI18n()

  if (loading && data === undefined) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  return <MaintenanceForm initial={data} />
}

function MaintenanceForm({ initial }: { initial: Maintenance }) {
  const { t } = useI18n()
  const { dateTime } = useFormat()
  const action = useAction()
  const [state, setState] = useState(initial)
  const [message, setMessage] = useState(initial.message ?? '')
  const [day, setDay] = useState(initial.until === null ? '' : dayKey(new Date(initial.until)))
  const [time, setTime] = useState(initial.until === null ? '' : hhmm(initial.until))
  const until = instantOf(day, time)

  const save = (on: boolean): void => {
    void action.run(async () => {
      const next = await api.setMaintenance(
        on ? { on, message: message.trim() === '' ? null : message.trim(), until } : { on },
      )

      setState(next)
      maintenanceSaved(next)
    })
  }

  const quick = (minutes: number): void => {
    const at = new Date(Date.now() + minutes * 60_000)

    setDay(dayKey(at))
    setTime(hhmm(at.toISOString()))
  }

  return (
    <article className={`card maintenance-panel ${state.on ? 'on' : ''}`}>
      <span className="eyebrow">
        <Icon name="llave" /> {t('admin.maint.title')}
      </span>
      <p className="maintenance-state" role="status">
        <strong>{t(state.on ? 'admin.maint.isOn' : 'admin.maint.isOff')}</strong>{' '}
        {state.on &&
          state.since !== null &&
          t('admin.maint.since', { date: dateTime(state.since) })}
      </p>
      <p className="hint">{t('admin.maint.hint')}</p>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          save(true)
        }}
      >
        <label>
          {t('admin.maint.message')}
          <textarea
            rows={2}
            maxLength={500}
            value={message}
            placeholder={t('admin.maint.messagePlaceholder')}
            onChange={(event) => {
              setMessage(event.target.value)
            }}
          />
        </label>
        <fieldset className="maintenance-until">
          <legend>{t('admin.maint.until')}</legend>
          <DayTimeFields day={day} time={time} onDay={setDay} onTime={setTime} optional />
          <div className="pill-row">
            {QUICK.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="pill"
                onClick={() => {
                  quick(minutes)
                }}
              >
                {t('admin.maint.quick', {
                  n: minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`,
                })}
              </button>
            ))}
            {(day !== '' || time !== '') && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  setDay('')
                  setTime('')
                }}
              >
                {t('admin.maint.noUntil')}
              </button>
            )}
          </div>
        </fieldset>
        <ErrorNote error={action.error} />
        <div className="actions">
          {state.on && (
            <button
              type="button"
              className="pill"
              disabled={action.busy}
              onClick={() => {
                save(false)
              }}
            >
              {t('admin.maint.off')}
            </button>
          )}
          <button type="submit" className="primary small" disabled={action.busy}>
            {t(state.on ? 'admin.maint.update' : 'admin.maint.on')}
          </button>
        </div>
      </form>
    </article>
  )
}
