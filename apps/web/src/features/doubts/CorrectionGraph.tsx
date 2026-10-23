import type { HolyGraph } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { CORRECTION_TIERS, correctionRings, tierCounts } from './corrections'

type CorrectionGraphProps = {
  graph: HolyGraph
  selected: number | null
  onSelect: (projectId: number) => void
}

/**
 * El holy graph de correcciones: por círculos, cada proyecto como una medalla
 * del color de las veces que lo has corregido (1, 3, 5 y 10). Los que aún no
 * has aprobado salen a trazos: podrás corregirlos cuando los apruebes. Los que
 * nadie corrige ya en tu campus no salen.
 */
export function CorrectionGraph({ graph, selected, onSelect }: CorrectionGraphProps) {
  const { t, tn } = useI18n()
  const rings = correctionRings(graph)
  const counts = tierCounts(graph)
  const master = counts[CORRECTION_TIERS.length - 1] ?? 0

  return (
    <div className="card correction-graph">
      <p className="hint">{t('cgraph.intro')}</p>
      {master > 0 && (
        <p className="cgraph-master" role="status">
          ✦ {tn('cgraph.master', master)}
        </p>
      )}
      <ul className="cgraph-legend">
        {CORRECTION_TIERS.map((goal, index) => (
          <li key={goal}>
            <span className={`cgraph-medal tier-${index + 1} sample`} aria-hidden="true" />
            {t(`cgraph.tier${index + 1}`, { n: goal })} · {counts[index] ?? 0}
          </li>
        ))}
      </ul>
      <ol className="cgraph-rings">
        {rings.map(({ circle, projects }) => (
          <li key={circle}>
            <span className="cgraph-circle">{t('graph.circle', { n: circle })}</span>
            <div className="cgraph-row">
              {projects.map((project) => (
                <button
                  key={project.projectId}
                  type="button"
                  className={`cgraph-medal tier-${project.tier} ${project.future ? 'future' : ''} ${project.projectId === selected ? 'selected' : ''}`}
                  title={
                    project.future
                      ? t('cgraph.future', { name: project.name })
                      : t('cgraph.times', { name: project.name, n: project.corrected })
                  }
                  onClick={() => {
                    onSelect(project.projectId)
                  }}
                >
                  <strong>{project.short}</strong>
                  <small>{project.future ? '—' : `×${project.corrected}`}</small>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
