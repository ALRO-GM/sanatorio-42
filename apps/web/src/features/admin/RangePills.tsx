import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { StepPicker } from '../../shared/ui/StepPicker'

/** Los periodos que ofrecen las pestañas del panel, en días. */
const RANGES: readonly number[] = [1, 7, 30, 90]

/**
 * El selector de periodo de las pestañas del panel: último día, semana, mes o
 * trimestre, con el selector de periodo de toda la web (`StepPicker`). Detrás
 * pueden ir más botones de la misma fila (`children`), como el que vuelve de
 * una persona a todo el mundo.
 */
export function RangePills({
  value,
  onChange,
  children,
}: {
  value: number
  onChange: (next: number) => void
  children?: ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="filter-pills range-row">
      <StepPicker
        options={RANGES}
        value={value}
        onChange={onChange}
        label={t('common.period')}
        text={(option) => t('admin.stats.days', { n: option })}
      />
      {children}
    </div>
  )
}
