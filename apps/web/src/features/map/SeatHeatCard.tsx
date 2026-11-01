import { useState } from 'react'

import type { SeatHeat } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { SeatDates } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { daysOf } from '../../shared/period'
import type { Period } from '../../shared/period'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { SeatHeatMap } from './SeatHeatMap'

/** «Todo»: los días más que acepta la API (diez años). */
const ALL_DAYS = 3650

/**
 * Cuánto se usa cada ordenador de los clústeres en un periodo
 * (`docs/asientos.md`), bajo el plano de Clústeres. Antes iba en Amigos, bajo
 * la red de asientos y con su periodo; desde el 2026-10-31 tiene el suyo.
 */
export function SeatHeatCard() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('1')
  const [dates, setDates] = useState<SeatDates>({ from: '', to: '' })
  // A mano, hasta que haya fecha de inicio se sigue con el último mes.
  const custom = period === 'custom' && dates.from !== '' ? dates : undefined
  const days = period === 'custom' ? 30 : (daysOf(period) ?? ALL_DAYS)
  const key = custom === undefined ? String(days) : `${custom.from}..${custom.to}`
  const heat = useAsync<SeatHeat>(() => api.getSeatHeat(days, custom), [key])

  return (
    <article className="card seat-heat-card">
      <div className="seat-heat-head">
        <h3>{t('seats.heat.title')}</h3>
        <div className="seat-heat-period">
          <PeriodPicker
            value={period}
            onChange={setPeriod}
            from={dates.from}
            to={dates.to}
            onDates={(from, to) => {
              setDates({ from, to })
            }}
          />
        </div>
      </div>
      <ErrorNote error={heat.error} retry />
      {heat.data !== undefined && <SeatHeatMap heat={heat.data} />}
    </article>
  )
}
