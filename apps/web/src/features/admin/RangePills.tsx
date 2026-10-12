import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'

/** Los periodos que ofrecen las pestañas del panel, en días. */
export const RANGES = [1, 7, 30, 90] as const

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
    <div className="filter-pills" role="group" aria-label={t('admin.stats.range')}>
      {RANGES.map((option) => (
        <button
          key={option}
          type="button"
          className={`pill ${value === option ? 'active' : ''}`}
          aria-pressed={value === option}
          onClick={() => {
            onChange(option)
          }}
        >
          {t('admin.stats.days', { n: option })}
        </button>
      ))}
      {children}
    </div>
  )
}
