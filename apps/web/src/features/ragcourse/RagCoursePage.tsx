import { useI18n } from '../../shared/i18n'
import { RagCourseTab } from './RagCourseTab'

/** El curso de RAG como pestaña propia de Aprender, junto a los demás cursos. */
export function RagCoursePage() {
  const { t } = useI18n()

  return (
    <section className="notgames">
      <h2>{t('nav.cursorag')}</h2>
      <RagCourseTab />
    </section>
  )
}
