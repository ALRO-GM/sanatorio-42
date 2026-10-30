import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { Icon } from '../ui/Icon'

/**
 * Qué capítulos de un curso están desplegados. De entrada, solo `current` (el
 * que toca); quien abre o cierra uno a mano manda desde entonces.
 */
export function useChapters<K>(current: K | null): {
  isOpen: (key: K) => boolean
  toggle: (key: K) => void
} {
  const [chosen, setChosen] = useState<ReadonlySet<K> | null>(null)
  const open = chosen ?? new Set(current === null ? [] : [current])

  return {
    isOpen: (key) => open.has(key),
    toggle: (key) => {
      const next = new Set(open)

      if (next.has(key)) next.delete(key)
      else next.add(key)
      setChosen(next)
    },
  }
}

/**
 * Un capítulo de un curso (un mundo del de git, un bloque del de shell),
 * plegado: su número, de qué trata y para qué sirve en la industria, y lo que
 * lleva hecho. Desplegado, sus puntos. Uno al que aún no se ha llegado (sin
 * hacer los de antes) no se despliega. Los dos cursos lo comparten para que
 * se usen igual (pedido por Alberto, 2026-10-30: el camino entero de golpe era
 * largo y agobiaba); cada uno le da su aspecto con `className`.
 */
export function CourseChapter({
  className,
  mark,
  title,
  pitch,
  industry,
  meta,
  locked,
  open,
  onToggle,
  children,
}: {
  className: string
  /** El número o el icono del capítulo. */
  mark: ReactNode
  title: ReactNode
  /** De qué trata, en una frase. */
  pitch: ReactNode
  /** Para qué sirve en el trabajo: perfiles, usos. */
  industry?: ReactNode
  /** Lo hecho, las estrellas y cuánta gente hace falta. */
  meta?: ReactNode
  locked: boolean
  open: boolean
  onToggle: () => void
  /** Los puntos del capítulo: solo se pintan desplegado. */
  children: ReactNode
}) {
  const { t } = useI18n()
  const body = useId()
  const expanded = open && !locked

  return (
    <section
      className={`course-chapter ${className} ${expanded ? 'open' : ''} ${locked ? 'locked' : ''}`}
    >
      <button
        type="button"
        className="course-chapter-head"
        aria-expanded={expanded}
        aria-controls={expanded ? body : undefined}
        disabled={locked}
        title={locked ? t('course.chapter.locked') : undefined}
        onClick={onToggle}
      >
        <span className="course-chapter-mark" aria-hidden="true">
          {locked ? <Icon name="candado" size={16} /> : mark}
        </span>
        <span className="course-chapter-text">
          <span className="course-chapter-title">{title}</span>
          <span className="course-chapter-pitch">{pitch}</span>
          {industry !== undefined && <span className="course-chapter-industry">{industry}</span>}
          {/* Lo hecho y la gente que hace falta, también sin alcanzar: para ir viendo. */}
          {meta !== undefined && <span className="course-chapter-meta">{meta}</span>}
          {locked && <span className="course-chapter-locked">{t('course.chapter.locked')}</span>}
        </span>
        <span className="course-chapter-chevron" aria-hidden="true">
          <Icon name="abajo" size={16} />
        </span>
      </button>
      {expanded && (
        <div id={body} className="course-chapter-body">
          {children}
        </div>
      )}
    </section>
  )
}
