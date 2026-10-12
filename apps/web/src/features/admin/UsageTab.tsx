import { useState } from 'react'

import { useI18n } from '../../shared/i18n'
import { FlowsPanel } from './FlowsPanel'
import { EVERYONE } from './SegmentSlider'
import { UsageHeatmap } from './UsageHeatmap'

const VIEWS = ['heat', 'flows'] as const

/** «Qué se usa»: el mapa de calor de cada elemento, o los recorridos entre secciones. */
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
      {view === 'heat' ? (
        <UsageHeatmap segment={segment} onSegment={setSegment} />
      ) : (
        <>
          <h2>{t('admin.flows.title')}</h2>
          <FlowsPanel segment={segment} onSegment={setSegment} />
        </>
      )}
    </section>
  )
}
