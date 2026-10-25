import { pad2 } from '../day'
import { useI18n } from '../i18n'
import { clock } from '../time'

const DAY_S = 24 * 60 * 60

/**
 * Lo que falta hasta `at`, como en un marcador: `2 d 04:12:09`, o `04:12:09`
 * si es hoy. Lo usan la pantalla de mantenimiento y la ventanita de avisos.
 * Con la hora ya pasada se queda en `0:00`: quien lo pinta decide qué decir.
 */
export function CountdownClock({
  at,
  now,
  className,
}: {
  at: number
  now: number
  className?: string
}) {
  const { t } = useI18n()
  const seconds = Math.max(0, Math.ceil((at - now) / 1000))
  const days = Math.floor(seconds / DAY_S)
  // Con días delante, las horas siempre a dos cifras: `2 d 04:12:09`.
  const left = seconds % DAY_S
  const rest =
    days > 0
      ? `${pad2(Math.floor(left / 3600))}:${pad2(Math.floor((left % 3600) / 60))}:${pad2(left % 60)}`
      : clock(seconds)

  return (
    <span className={`countdown-clock ${className ?? ''}`}>
      {days > 0 && (
        <>
          <strong>{days}</strong>
          <small>{t('countdown.days')}</small>{' '}
        </>
      )}
      <strong>{rest}</strong>
    </span>
  )
}
