import { useI18n } from '../i18n'
import { PERIODS } from '../period'
import type { Period } from '../period'
import { StepPicker } from './StepPicker'

type PeriodPickerProps = {
  value: Period
  onChange: (next: Period) => void
  /** Las fechas a mano (`YYYY-MM-DD`, o vacías): solo se ven con «Fechas…». */
  from: string
  to: string
  onDates: (from: string, to: string) => void
  /** Los periodos que se ofrecen, si no son todos (por ejemplo, sin «Fechas…»). */
  options?: readonly Period[]
  /** El texto de cada opción, si no es el de siempre («Últimos 3 meses»…). */
  text?: (period: Period) => string
}

/**
 * El selector de periodo de toda la web: último mes, 3, 6, 12 y 24 meses, todo
 * y «Fechas…», que abre dos campos de fecha. Va sobre `StepPicker`: desplegable
 * en escritorio y rueda en el móvil.
 */
export function PeriodPicker({
  value,
  onChange,
  from,
  to,
  onDates,
  options = PERIODS,
  text,
}: PeriodPickerProps) {
  const { t, tn } = useI18n()
  const label = (period: Period): string =>
    period === 'all' || period === 'custom'
      ? t(`period.${period}`)
      : tn('period.last', Number(period))

  return (
    <>
      <StepPicker
        options={options}
        value={value}
        onChange={onChange}
        label={t('common.period')}
        text={text ?? label}
      />
      {value === 'custom' && (
        <div className="net-dates">
          <label>
            {t('common.from')}
            <input
              type="date"
              value={from}
              max={to === '' ? undefined : to}
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
              min={from === '' ? undefined : from}
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
