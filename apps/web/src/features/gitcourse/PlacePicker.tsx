import type { CoursePlace, GitCourse } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'

/** Los sitios que se pueden decir, en el orden en que se enseñan. */
const COURSE_PLACES: readonly CoursePlace[] = ['campus', 'remote', 'outside']

/**
 * Para quien tiene permiso de hacer el curso fuera del clúster y no está en un
 * puesto: antes de jugar dice dónde está. Vale unas horas; después se pregunta otra vez.
 */
export function PlacePicker({
  course,
  onCourse,
}: {
  course: GitCourse
  onCourse: (course: GitCourse) => void
}) {
  const { t } = useI18n()
  const action = useAction()
  const chosen = course.remote.place

  return (
    <div className={chosen === null ? 'notice' : 'muted'}>
      <p>
        {chosen === null
          ? t('git.place.ask')
          : t('git.place.at', { place: t(`git.place.${chosen}`) })}
      </p>
      <PillGroup
        options={COURSE_PLACES}
        value={chosen}
        label={t('git.place.ask')}
        text={(place) => t(`git.place.${place}`)}
        disabled={() => action.busy}
        onChange={(place) => {
          void action.run(async () => {
            onCourse(await api.setGitPlace(place))
          })
        }}
      />
      <ErrorNote error={action.error} />
    </div>
  )
}

/**
 * Desde dónde se juega: el puesto o, fuera del clúster con permiso, el sitio
 * dicho. `null` si no se puede jugar (solo practicar).
 */
export function playingFrom(
  course: GitCourse,
  label: (place: CoursePlace) => string,
): string | null {
  if (course.seat !== null) return course.seat

  return course.remote.place === null ? null : label(course.remote.place)
}
