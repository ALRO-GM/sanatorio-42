import { starsFor } from '@sanatorio/course'
import type { StarGoals, TimeGoals } from '@sanatorio/course'

import { useI18n } from '../i18n'

/** Estrellas, de 1 a 3, como texto: `★★☆`. */
export const starText = (stars: number): string => '★'.repeat(stars) + '☆'.repeat(3 - stars)

/** `2:05` */
export const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`

/**
 * Lo que da cada estrella, a la vista desde el principio (plantilla de
 * cursos): por comandos en una unidad, por tiempo en un contrarreloj. Los
 * números salen de `@sanatorio/course`, lo mismo que usa la API al corregir.
 */
export function StarRules({
  goals,
  time,
  rule,
}: {
  goals?: StarGoals
  time?: TimeGoals
  rule: string
}) {
  const { t, tn } = useI18n()
  const lines =
    time !== undefined
      ? [
          t('course.time.three', { time: clock(time.three) }),
          t('course.time.two', { time: clock(time.two) }),
          t('course.time.limit', { time: clock(time.limit) }),
        ]
      : [
          tn('course.stars.three', goals?.three ?? 0),
          tn('course.stars.two', goals?.two ?? 0),
          t('course.stars.any'),
        ]

  return (
    <div className="course-star-rules">
      <ul aria-label={t('course.stars.title')}>
        {lines.map((line, index) => (
          <li key={index}>
            <span className="course-stars" aria-hidden="true">
              {starText(3 - index)}
            </span>{' '}
            {line}
          </li>
        ))}
      </ul>
      <details>
        <summary>{t(time === undefined ? 'course.stars.what' : 'course.time.what')}</summary>
        <p>{rule}</p>
      </details>
    </div>
  )
}

/** Por qué salieron esas estrellas: con cuántos comandos, y qué faltaba para más. */
export function StarsWhy({ goals, commands }: { goals: StarGoals; commands: number }) {
  const { tn } = useI18n()
  const stars = starsFor(commands, goals)

  return (
    <p className="course-why">
      {stars === 3
        ? tn('course.why.three', commands, { three: goals.three })
        : stars === 2
          ? tn('course.why.two', commands, { three: goals.three })
          : tn('course.why.one', commands, { two: goals.two, three: goals.three })}
    </p>
  )
}
