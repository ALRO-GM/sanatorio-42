import { useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { FocusCharts, FocusFigureCards, PeriodPicker, periodQuery } from '../focus/FocusStatsView'
import type { FocusPeriod } from '../focus/FocusStatsView'
import { EVERYONE, SegmentSlider } from '../../shared/ui/SegmentSlider'

/**
 * Panel de gestión: cómo se usa el Pomodoro (#80 del buzón). Por días y por
 * horas, el tiempo concentrado, cuántas sesiones se paran antes y por qué, y
 * cuántas veces alguien quiso parar y siguió. Se elige el periodo y el tramo de
 * gente, por lo que lo usa.
 */
export function FocusPanel() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<FocusPeriod>('month')
  const [segment, setSegment] = useState(EVERYONE)
  const { data, error, loading, reload } = useAsync(
    () => api.getAdminFocusStats(periodQuery(period, segment)),
    [period, segment.low, segment.high],
  )

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.focus.title')}</span>
      <PeriodPicker value={period} onChange={setPeriod} />
      <SegmentSlider value={segment} onChange={setSegment} told={data?.segment} />
      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={error} onRetry={() => void reload()} />
      {data !== undefined && (
        <>
          <FocusFigureCards figures={data.totals} who="all" people={data.totals.people} />
          <FocusCharts stats={data} />
        </>
      )}
    </article>
  )
}
