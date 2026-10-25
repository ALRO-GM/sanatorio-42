import { useI18n } from '../i18n'
import { todayKey } from '../day'

/** Un día y una hora del navegador, como instante ISO; `null` si falta alguno. */
export function instantOf(day: string, time: string): string | null {
  if (day === '' || time === '') return null

  const at = new Date(`${day}T${time}:00`)

  return Number.isNaN(at.getTime()) ? null : at.toISOString()
}

/**
 * El día y la hora de una cuenta atrás (`docs/avisos-cuenta-atras.md`), en dos
 * campos como los de las pizarras: así se ve bien en el móvil y en todos los
 * navegadores. No deja elegir un día pasado.
 */
export function DayTimeFields({
  day,
  time,
  onDay,
  onTime,
  optional = false,
}: {
  day: string
  time: string
  onDay: (day: string) => void
  onTime: (time: string) => void
  /** `true` si se puede dejar en blanco (el final de un mantenimiento). */
  optional?: boolean
}) {
  const { t } = useI18n()

  return (
    <div className="day-time-fields">
      <label>
        {t('countdown.day')}
        <input
          type="date"
          value={day}
          min={todayKey()}
          required={!optional}
          onChange={(event) => {
            onDay(event.target.value)
          }}
        />
      </label>
      <label>
        {t('countdown.time')}
        <input
          type="time"
          value={time}
          required={!optional}
          onChange={(event) => {
            onTime(event.target.value)
          }}
        />
      </label>
    </div>
  )
}
