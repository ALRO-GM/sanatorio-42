import { useState } from 'react'

import type { Countdown } from '@sanatorio/contracts'

import { pinCountdown } from '../../shared/countdowns'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { DayTimeFields, instantOf } from '../../shared/ui/DayTimeFields'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/**
 * Fijarse una cuenta atrás desde la ventanita: el próximo compromiso del
 * calendario (cambia solo cuando pasa) o algo propio con título y hora. Un
 * evento concreto se fija desde su ficha del calendario.
 */
export function CountdownPicker({ list, onDone }: { list: Countdown[]; onDone: () => void }) {
  const { t } = useI18n()
  const action = useAction()
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const hasNext = list.some((entry) => entry.kind === 'next')
  const at = instantOf(day, time)

  const pin = (input: Parameters<typeof pinCountdown>[0]): void => {
    void action
      .run(() => pinCountdown(input))
      .then((ok) => {
        if (ok) onDone()
      })
  }

  return (
    <div className="countdown-picker">
      <button
        type="button"
        className="primary small"
        disabled={action.busy || hasNext}
        onClick={() => {
          pin({ kind: 'next' })
        }}
      >
        <Icon name="calendario" size={14} /> {t('countdown.pinNext')}
      </button>
      <form
        className="countdown-custom"
        onSubmit={(event) => {
          event.preventDefault()
          if (at !== null) pin({ kind: 'custom', title, at })
        }}
      >
        <label>
          {t('countdown.customTitle')}
          <input
            value={title}
            maxLength={120}
            required
            placeholder={t('countdown.customPlaceholder')}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
        </label>
        <DayTimeFields day={day} time={time} onDay={setDay} onTime={setTime} />
        <div className="actions">
          <button type="button" className="link" onClick={onDone}>
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="pill"
            disabled={action.busy || at === null || title.trim() === ''}
          >
            <Icon name="chincheta" size={14} /> {t('countdown.pin')}
          </button>
        </div>
      </form>
      <small className="hint">{t('countdown.fromCalendar')}</small>
      <ErrorNote error={action.error} />
    </div>
  )
}
