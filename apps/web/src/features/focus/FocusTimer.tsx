import { useEffect, useState } from 'react'

import { focusing, startFocus, stopFocus, useFocus } from '../../shared/focus'
import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'

const RING = 2 * Math.PI * 26

const mmss = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000))

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * El temporizador del Pomodoro, flotando y bien a la vista: un anillo que se
 * vacía con el tiempo que queda. Al acabar la concentración, el descanso; al
 * acabar el descanso, otra vuelta con un botón.
 */
export function FocusTimer() {
  const { t } = useI18n()
  const focus = useFocus()
  const [now, setNow] = useState(Date.now)
  const active = focusing(focus)
  const until = focus?.until === undefined || focus.until === null ? null : Date.parse(focus.until)
  const started =
    focus?.startedAt === undefined || focus.startedAt === null ? null : Date.parse(focus.startedAt)
  // El descanso no se guarda: va desde que acabó la concentración que se vio aquí.
  const [breakUntil, setBreakUntil] = useState<number | null>(null)

  useEffect(() => {
    if (!active && breakUntil === null) return undefined

    const tick = window.setInterval(() => {
      setNow(Date.now())
    }, 500)

    return () => {
      window.clearInterval(tick)
    }
  }, [active, breakUntil])

  // Cuando acaba la concentración a su hora, empieza el descanso.
  useEffect(() => {
    if (until === null || focus === null) return undefined

    const left = until - Date.now()
    const breakMs = focus.settings.breakMinutes * 60_000

    if (left <= 0 || breakMs === 0) return undefined

    const done = window.setTimeout(() => {
      setBreakUntil(Date.now() + breakMs)
    }, left)

    return () => {
      window.clearTimeout(done)
    }
  }, [until, focus])

  const resting = !active && breakUntil !== null && breakUntil > now

  if (!active && !resting && breakUntil === null) return null

  if (active && until !== null && started !== null) {
    const share = Math.max(0, Math.min(1, (until - now) / Math.max(1, until - started)))

    return (
      <aside className="focus-timer" role="timer" aria-label={t('focus.timerLabel')}>
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="26" className="focus-track" />
          <circle
            cx="30"
            cy="30"
            r="26"
            className="focus-ring"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - share)}
          />
        </svg>
        <span className="focus-text">
          <strong>{mmss(until - now)}</strong>
          <small>{t('focus.focusing')}</small>
        </span>
        <button
          type="button"
          className="pill"
          onClick={() => {
            setBreakUntil(null)
            void stopFocus()
          }}
        >
          {t('focus.stop')}
        </button>
      </aside>
    )
  }

  return (
    <aside className="focus-timer resting" role="status">
      <Icon name="reloj" size={22} />
      <span className="focus-text">
        <strong>{resting ? mmss(breakUntil - now) : t('focus.breakOver')}</strong>
        <small>{t('focus.resting')}</small>
      </span>
      {focus !== null && (
        <button
          type="button"
          className="primary small"
          onClick={() => {
            setBreakUntil(null)
            void startFocus(focus.settings)
          }}
        >
          {t('focus.again')}
        </button>
      )}
      <button
        type="button"
        className="link"
        onClick={() => {
          setBreakUntil(null)
        }}
      >
        {t('focus.close')}
      </button>
    </aside>
  )
}
