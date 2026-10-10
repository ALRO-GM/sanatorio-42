import type { ProjectSummary } from '@sanatorio/contracts'

import { useI18n } from '../i18n'

type ProjectPillsProps = {
  projects: readonly ProjectSummary[]
  /** Proyecto elegido, o `null` para "todos". */
  value: number | null
  onChange: (projectId: number | null) => void
  /** Si viene, añade una primera pastilla para "todos". */
  allLabel?: string
}

/** Selector de proyecto en forma de pastillas. */
export function ProjectPills({ projects, value, onChange, allLabel }: ProjectPillsProps) {
  const { t } = useI18n()

  return (
    <div className="filter-pills" role="group" aria-label={t('projects.pick')}>
      {allLabel !== undefined && (
        <button
          className={`pill ${value === null ? 'active' : ''}`}
          aria-pressed={value === null}
          onClick={() => {
            onChange(null)
          }}
        >
          {allLabel}
        </button>
      )}
      {projects.map((project) => (
        <button
          key={project.id}
          className={`pill ${value === project.id ? 'active' : ''}`}
          aria-pressed={value === project.id}
          onClick={() => {
            onChange(project.id)
          }}
          title={t(project.status === 'finished' ? 'projects.passed' : 'projects.doing')}
        >
          {project.status === 'finished' && <span aria-hidden="true">★ </span>}
          {project.name}
        </button>
      ))}
    </div>
  )
}
