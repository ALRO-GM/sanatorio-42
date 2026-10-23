import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'

/** Los periodos que ofrecen las pestañas del panel, en días. */
const RANGES: readonly number[] = [1, 7, 30, 90]

/**
 * El selector de periodo de las pestañas del panel: último día, semana, mes o
 * trimestre. Detrás pueden ir más botones de la misma fila (`children`), como
 * el que vuelve de una persona a todo el mundo.
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
    <PillGroup
      options={RANGES}
      value={value}
      onChange={onChange}
      label={t('admin.stats.range')}
      text={(option) => t('admin.stats.days', { n: option })}
    >
      {children}
    </PillGroup>
  )
}
