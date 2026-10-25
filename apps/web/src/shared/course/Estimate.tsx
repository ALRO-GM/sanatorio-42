import { useI18n } from '../i18n'

/**
 * El tiempo estimado de los cursos (`estimateSeconds` de `@sanatorio/course`):
 * el total con su reparto por nivel o mundo, y el de cada punto. Es un
 * cálculo de partida; se ajustará con lo que tarda la gente de verdad.
 */

/** «~25 min», «~1 h 40 min» o «~2 h». */
export function useDuration(): (seconds: number) => string {
  const { t } = useI18n()

  return (seconds) => {
    const minutes = Math.max(1, Math.round(seconds / 60))
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (hours === 0) return t('course.estimate.minutes', { n: minutes })

    return rest === 0
      ? t('course.estimate.hours', { h: hours })
      : t('course.estimate.hoursMinutes', { h: hours, m: rest })
  }
}

/** El tiempo de un punto, un bloque o un nivel, discreto junto a su nombre. */
export function EstimateBadge({ seconds }: { seconds: number }) {
  const { t } = useI18n()
  const time = useDuration()(seconds)

  return (
    <span className="course-estimate" title={t('course.estimate.title', { time })}>
      {time}
    </span>
  )
}

/** El total del curso y cuánto lleva cada parte (niveles o mundos). */
export function CourseEstimate({
  total,
  parts,
}: {
  total: number
  parts: readonly { id: string; label: string; seconds: number }[]
}) {
  const { t } = useI18n()
  const duration = useDuration()

  return (
    <div className="course-estimate-total" title={t('course.estimate.hint')}>
      <strong>{t('course.estimate.total', { time: duration(total) })}</strong>
      <ul aria-label={t('course.estimate.parts')}>
        {parts.map((part) => (
          <li key={part.id}>
            {part.label} <span className="course-estimate">{duration(part.seconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
