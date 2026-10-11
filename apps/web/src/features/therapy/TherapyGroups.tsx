import { useState } from 'react'

import type { ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ProjectPills } from '../../shared/ui/ProjectPills'
import { GroupCard } from './GroupCard'
import { GroupForm } from './GroupForm'

type TherapyGroupsProps = {
  /** Todos los proyectos de la persona; aquí solo se usan los que tiene en curso. */
  projects: readonly ProjectSummary[]
  /** Proyecto con el que se abre el filtro, si se llega desde la consulta. */
  initialProject: number | null
}

/** Terapias de grupo: grupos abiertos del campus y formulario para abrir uno. */
export function TherapyGroups({ projects, initialProject }: TherapyGroupsProps) {
  const { t } = useI18n()
  const doing = projects.filter((project) => project.status !== 'finished')
  const [projectId, setProjectId] = useState<number | null>(initialProject)
  const [creating, setCreating] = useState(false)
  const groups = useAsync(() => api.getGroups(projectId), [projectId])

  return (
    <section>
      <h2>{t('therapy.title')}</h2>
      <p className="lead">{t('therapy.subtitle')}</p>

      <div className="filters">
        <ProjectPills
          projects={doing}
          value={projectId}
          onChange={setProjectId}
          allLabel={t('therapy.allProjects')}
        />
        {!creating && (
          <button
            className="primary small"
            onClick={() => {
              setCreating(true)
            }}
          >
            {t('therapy.new')}
          </button>
        )}
      </div>

      {creating && (
        <GroupForm
          projects={doing}
          defaultProject={projectId ?? doing[0]?.id}
          onCancel={() => {
            setCreating(false)
          }}
          onSaved={() => {
            setCreating(false)
            void groups.reload()
          }}
        />
      )}

      {groups.loading && <p>{t('therapy.loading')}</p>}
      <ErrorNote error={groups.error} onRetry={() => void groups.reload()} />
      {groups.data?.length === 0 && <p className="estado">{t('therapy.empty')}</p>}

      <ul className="stack">
        {(groups.data ?? []).map((group) => (
          <li key={group.id}>
            <GroupCard group={group} projects={doing} onChange={() => void groups.reload()} />
          </li>
        ))}
      </ul>
    </section>
  )
}
