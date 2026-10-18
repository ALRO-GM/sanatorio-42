import { useState } from 'react'

import { useI18n } from '../../shared/i18n'
import { ClickMap } from './ClickMap'
import { FlowsPanel } from './FlowsPanel'
import { EVERYONE } from './SegmentSlider'
import { UsageHeatmap } from './UsageHeatmap'

const VIEWS = ['heat', 'flows', 'clicks'] as const

/** «Qué se usa»: el mapa de calor de cada elemento, los recorridos entre secciones o los clics. */
export function UsageTab() {
  const { t } = useI18n()
  const [view, setView] = useState<(typeof VIEWS)[number]>('heat')
  // El tramo de gente vale para las dos vistas: se cambia de una a otra sin perderlo.
  const [segment, setSegment] = useState(EVERYONE)

  return (
    <section>
      <div className="filter-pills sub-tabs" role="tablist" aria-label={t('admin.tab.usage')}>
        {VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            className={`pill ${view === option ? 'active' : ''}`}
            onClick={() => {
              setView(option)
            }}
          >
            {t(`admin.usage.view.${option}`)}
          </button>
        ))}
      </div>
      {view === 'heat' && <UsageHeatmap segment={segment} onSegment={setSegment} />}
      {view === 'flows' && (
        <>
          <h2>{t('admin.flows.title')}</h2>
          <FlowsPanel segment={segment} onSegment={setSegment} />
        </>
      )}
      {view === 'clicks' && <ClickMap />}
    </section>
  )
}
