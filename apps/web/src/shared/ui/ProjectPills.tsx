import type { ProjectSummary } from '@sanatorio/contracts'

import { useI18n } from '../i18n'
import { PillGroup } from './PillGroup'

type ProjectPillsProps = {
  projects: readonly ProjectSummary[]
  /** Proyecto elegido, o `null` para "todos". */
  value: number | null
  onChange: (projectId: number | null) => void
  /** Si viene, añade una primera pastilla para "todos". */
  allLabel?: string
}

/** La pastilla de "todos": una opción más, que el grupo trata como las demás. */
const ALL = 'all'

/** Selector de proyecto en forma de pastillas. */
export function ProjectPills({ projects, value, onChange, allLabel }: ProjectPillsProps) {
  const { t } = useI18n()
  const byId = new Map(projects.map((project) => [project.id, project]))
  const options: (number | typeof ALL)[] = [
    ...(allLabel === undefined ? [] : ([ALL] as const)),
    ...projects.map((project) => project.id),
  ]

  return (
    <PillGroup
      options={options}
      value={value ?? ALL}
      label={t('projects.pick')}
      onChange={(option) => {
        onChange(option === ALL ? null : option)
      }}
      title={(option) => {
        const project = option === ALL ? undefined : byId.get(option)

        return project === undefined
          ? undefined
          : t(project.status === 'finished' ? 'projects.passed' : 'projects.doing')
      }}
      text={(option) => {
        if (option === ALL) return allLabel
        const project = byId.get(option)

        return (
          <>
            {project?.status === 'finished' && <span aria-hidden="true">★ </span>}
            {project?.name}
          </>
        )
      }}
    />
  )
}
