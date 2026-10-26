import { useI18n } from '../i18n'
import { PERIODS } from '../period'
import type { Period } from '../period'
import { StepPicker } from './StepPicker'

type PeriodPickerProps = {
  value: Period
  onChange: (next: Period) => void
  /**
   * Lo de «a mano» (vacío si aún no se ha dicho): dos fechas `YYYY-MM-DD` o, con
   * `unit="months"`, dos números de meses. Solo se ve con «a mano».
   */
  from: string
  to: string
  onDates: (from: string, to: string) => void
  /**
   * `dates`: fechas de calendario. `months`: meses contados desde un inicio (el
   * Avance, cuyo eje es el tiempo desde que empezó cada cual), de 0 a `maxMonths`.
   */
  unit?: 'dates' | 'months'
  maxMonths?: number
  /** Los periodos que se ofrecen, si no son todos (por ejemplo, sin «Fechas…»). */
  options?: readonly Period[]
  /** El texto de cada opción, si no es el de siempre («Últimos 3 meses»…). */
  text?: (period: Period) => string
}

/**
 * El selector de periodo de toda la web: último mes, 3, 6, 12 y 24 meses, todo
 * y «Fechas…», que abre dos campos de fecha (o, con `unit="months"`, «Meses…»,
 * que abre dos de meses). Va sobre `StepPicker`: desplegable en escritorio y
 * rueda en el móvil.
 */
export function PeriodPicker({
  value,
  onChange,
  from,
  to,
  onDates,
  unit = 'dates',
  maxMonths,
  options = PERIODS,
  text,
}: PeriodPickerProps) {
  const { t, tn } = useI18n()
  const months = unit === 'months'
  const label = (period: Period): string =>
    period === 'all'
      ? t('period.all')
      : period === 'custom'
        ? t(months ? 'period.customMonths' : 'period.custom')
        : tn('period.last', Number(period))
  const limit = (other: string): string | undefined => (other === '' ? undefined : other)

  return (
    <>
      <StepPicker
        options={options}
        value={value}
        onChange={onChange}
        label={t('common.period')}
        text={text ?? label}
      />
      {value === 'custom' && months && (
        <div className="net-dates">
          <label>
            {t('period.fromMonth')}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={limit(to)}
              step={1}
              value={from}
              onChange={(event) => {
                onDates(event.target.value, to)
              }}
            />
          </label>
          <label>
            {t('period.toMonth')}
            <input
              type="number"
              inputMode="numeric"
              min={from === '' ? 1 : from}
              max={maxMonths}
              step={1}
              value={to}
              onChange={(event) => {
                onDates(from, event.target.value)
              }}
            />
          </label>
        </div>
      )}
      {value === 'custom' && !months && (
        <div className="net-dates">
          <label>
            {t('common.from')}
            <input
              type="date"
              value={from}
              max={limit(to)}
              onChange={(event) => {
                onDates(event.target.value, to)
              }}
            />
          </label>
          <label>
            {t('common.to')}
            <input
              type="date"
              value={to}
              min={limit(from)}
              onChange={(event) => {
                onDates(from, event.target.value)
              }}
            />
          </label>
        </div>
      )}
    </>
  )
}
