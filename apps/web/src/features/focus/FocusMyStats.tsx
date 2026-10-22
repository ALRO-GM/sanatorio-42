import { useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { EVERYONE, SegmentSlider } from '../admin/SegmentSlider'
import { FocusCharts, FocusFigureCards, PeriodPills, periodQuery } from './FocusStatsView'
import type { FocusPeriod } from './FocusStatsView'

/**
 * Tus estadísticas del Pomodoro (#80 del buzón): cuánto, qué días y a qué
 * horas, cuántas veces paraste antes y por qué, y las veces que quisiste parar
 * y seguiste. Al lado de cada cifra, la media de un tramo de quienes lo usan:
 * con el deslizador doble se elige con quién compararse (del 50 % al 90 % de
 * quienes más lo usan, por ejemplo).
 */
export function FocusMyStats() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<FocusPeriod>('week')
  const [band, setBand] = useState(EVERYONE)
  const { data, error, loading, reload } = useAsync(
    () => api.getMyFocusStats(periodQuery(period, band)),
    [period, band.low, band.high],
  )

  return (
    <section className="focus-stats" aria-label={t('focus.tab.stats')}>
      <PeriodPills value={period} onChange={setPeriod} />

      <SegmentSlider value={band} onChange={setBand} told={data?.segment} texts="focus.band" />

      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={error} onRetry={() => void reload()} />
      {data !== undefined && (
        <>
          <FocusFigureCards figures={data.totals} band={data.band} who="me" />
          {data.position !== null && (
            <p className="hint">{t('focus.stats.position', { n: data.position })}</p>
          )}
          <FocusCharts stats={data} />
        </>
      )}
    </section>
  )
}
