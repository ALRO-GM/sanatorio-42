import { useI18n } from '../i18n'
import { Icon } from '../ui/Icon'

type CourseOrderHintProps = {
  /** Si ya está hecho lo que se recomienda antes: entonces no se enseña nada. */
  done: boolean
  /** Qué conviene terminar antes, ya traducido («el nivel principiante del curso de shell»). */
  before: string
  /** Adónde lleva el enlace (la sección de ese curso, `#/cursoshell`). */
  href: string
  /** El nombre del curso al que lleva el enlace. */
  course: string
}

/**
 * Sugerencia de orden entre cursos (shell → git → Docker → Kubernetes;
 * decidido con Alberto el 2026-11-08): arriba del camino, si aún no has hecho
 * lo que conviene antes, se dice qué y se enlaza. No bloquea nada: se puede
 * seguir igual. Dentro de cada curso el camino sigue abriéndose de uno en uno.
 * Regla en `docs/plantilla-cursos.md`.
 */
export function CourseOrderHint({ done, before, href, course }: CourseOrderHintProps) {
  const { t } = useI18n()

  if (done) return null

  return (
    <p className="notice course-order" role="note">
      <Icon name="info" size={16} /> {t('course.order.hint', { before })}{' '}
      <a href={href}>{t('course.order.go', { course })}</a>
    </p>
  )
}
