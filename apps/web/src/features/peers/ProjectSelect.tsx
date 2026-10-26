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

/**
 * La sala de espera: tus proyectos en curso, para elegir con cuál necesitas
 * ayuda. Un piscinero, todos los de la piscina.
 */
export function ProjectSelect({ onSelect }: ProjectSelectProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getMyProjects(), [])
  // Lo que llega con grupo es de la piscina: la lista de un piscinero.
  const piscine = data?.some((project) => project.group !== undefined) === true

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
      {/* «¿Qué te duele hoy?» es un juego de palabras: esto dice qué hacer. */}
      {data.length > 0 && <span className="eyebrow">{t('projects.pick')}</span>}
      {piscine ? (
        // Un piscinero elige entre todos los de la piscina: lo que cuenta para
        // su avance y, aparte, los rushes, BSQ y exámenes (`docs/piscineros.md`).
        <>
          <ProjectList
            projects={data.filter((project) => project.group === 'shell' || project.group === 'c')}
            label={t('piscine.progress')}
            onSelect={onSelect}
          />
          <span className="eyebrow">{t('piscine.apart')}</span>
          <ProjectList
            projects={data.filter(
              (project) => project.group === 'rush' || project.group === 'exam',
            )}
            label={t('piscine.apart')}
            onSelect={onSelect}
          />
        </>
      ) : (
        <ProjectList projects={data} label={t('projects.pick')} onSelect={onSelect} />
      )}
    </section>
  )
}

/** Una lista de proyectos para elegir; en la piscina, con su color y lo que llevas en curso marcado. */
function ProjectList(props: {
  projects: readonly ProjectSummary[]
  label: string
  onSelect: (project: ProjectSummary) => void
}) {
  const { t } = useI18n()

  return (
    <ul className="project-list" aria-label={props.label}>
      {props.projects.map((project) => (
        <li key={project.id}>
          <button
            className={`project ${project.group === undefined ? '' : `piscine ${project.group}`}`.trim()}
            onClick={() => {
              props.onSelect(project)
            }}
          >
            <span className="project-icon">
              <Icon name="terminal" size={26} />
            </span>
            {project.name}
            {project.group !== undefined && project.status !== undefined && (
              <span className="project-status">
                {t(project.status === 'finished' ? 'projects.passed' : 'projects.doing')}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
