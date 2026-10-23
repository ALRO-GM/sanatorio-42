import { useEffect, useState } from 'react'

import { focusing, startFocus, useFocus } from '../../shared/focus'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { clock } from '../../shared/time'
import { Icon } from '../../shared/ui/Icon'
import { FocusExit } from './FocusExit'
import { FocusScreen } from './FocusScreen'

const RING = 2 * Math.PI * 26

/** `m:ss` de lo que queda, redondeando hacia arriba: que el 0:00 sea el final de verdad. */
const mmss = (ms: number): string => clock(Math.ceil(Math.max(0, ms) / 1000))

/** Lo que dura el «¡bien hecho!» de seguir concentrándose. */
const CHEER_MS = 6000

/**
 * El temporizador del Pomodoro, flotando y bien a la vista: un anillo que se
 * vacía con el tiempo que queda. Al acabar la concentración, el descanso; al
 * acabar el descanso, otra vuelta con un botón.
 *
 * Se puede poner a pantalla completa (#80 del buzón). «Acabar», salir de la
 * pantalla completa o Escape no paran en seco: preguntan (`FocusExit`).
 */
export function FocusTimer() {
  const { t } = useI18n()
  const focus = useFocus()
  const active = focusing(focus)
  const until = focus?.until === undefined || focus.until === null ? null : Date.parse(focus.until)
  const started =
    focus?.startedAt === undefined || focus.startedAt === null ? null : Date.parse(focus.startedAt)
  // El descanso no se guarda: va desde que acabó la concentración que se vio aquí.
  const [breakUntil, setBreakUntil] = useState<number | null>(null)
  const [screen, setScreen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [cheer, setCheer] = useState(false)
  // Medio segundo: el anillo se vacía fino y el reloj no se salta ningún segundo.
  const now = useNow(500, { active: active || breakUntil !== null })

  useEffect(() => {
    if (!cheer) return undefined

    const done = window.setTimeout(() => {
      setCheer(false)
    }, CHEER_MS)

    return () => {
      window.clearTimeout(done)
    }
  }, [cheer])

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
    const left = mmss(until - now)
    const exit = asking && (
      <FocusExit
        left={left}
        onDone={(stopped) => {
          setAsking(false)
          if (stopped) {
            setScreen(false)
            setBreakUntil(null)
          } else {
            setCheer(true)
          }
        }}
      />
    )
    const cheering = cheer && (
      <p className="focus-cheer" role="status">
        {t('focus.exit.cheer')}
      </p>
    )

    if (screen) {
      return (
        <>
          <FocusScreen
            left={left}
            until={until}
            share={share}
            onExit={() => {
              setAsking(true)
            }}
            onShrink={() => {
              setScreen(false)
            }}
          >
            {cheering}
          </FocusScreen>
          {exit}
        </>
      )
    }

    return (
      <>
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
            <strong>{left}</strong>
            <small>{t('focus.focusing')}</small>
          </span>
          <button
            type="button"
            className="pill"
            onClick={() => {
              setScreen(true)
            }}
          >
            {t('focus.screen.open')}
          </button>
          <button
            type="button"
            className="pill"
            onClick={() => {
              setAsking(true)
            }}
          >
            {t('focus.stop')}
          </button>
        </aside>
        {exit}
        {cheering}
      </>
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
