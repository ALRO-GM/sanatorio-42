import type { ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { WaitingTour } from './WaitingTour'

type ProjectSelectProps = {
  onSelect: (project: ProjectSummary) => void
}

/** La sala de espera: tus proyectos en curso, para elegir con cuál necesitas ayuda. */
export function ProjectSelect({ onSelect }: ProjectSelectProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getMyProjects(), [])

  if (loading) {
    return <p>{t('projects.loading')}</p>
  }

  if (data === undefined) {
    return (
      <section>
        <h2>{t('projects.title')}</h2>
        <ErrorNote error={error} onRetry={() => void reload()} />
      </section>
    )
  }

  return (
    <section>
      <h2>
        {t('projects.title')}
        <InfoTip title={t('nav.consulta')}>
          <WaitingTour />
        </InfoTip>
      </h2>
      {data.length === 0 && <p className="estado">{t('projects.empty')}</p>}
      <ul className="project-list">
        {data.map((project) => (
          <li key={project.id}>
            <button
              className="project"
              onClick={() => {
                onSelect(project)
              }}
            >
              <span className="project-icon">
                <Icon name="terminal" size={26} />
              </span>
              {project.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
