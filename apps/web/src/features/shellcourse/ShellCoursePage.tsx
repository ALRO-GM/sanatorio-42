import { useI18n } from '../../shared/i18n'
import { ShellCourseTab } from './ShellCourseTab'

/**
 * El curso de shell como pestaña propia de Aprender (reorganización del
 * 2026-10-29; antes, una pestaña dentro de Not-games).
 */
export function ShellCoursePage() {
  const { t } = useI18n()

  return (
    <section className="notgames">
      <h2>{t('nav.cursoshell')}</h2>
      <ShellCourseTab />
    </section>
  )
}
