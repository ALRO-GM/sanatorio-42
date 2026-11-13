import { useI18n } from '../../shared/i18n'
import { NetCourseTab } from './NetCourseTab'

/** El curso de NetPractice (redes IPv4) como pestaña propia de Aprender, junto a los demás cursos. */
export function NetCoursePage() {
  const { t } = useI18n()

  return (
    <section className="notgames netcourse">
      <h2>{t('nav.cursonet')}</h2>
      <NetCourseTab />
    </section>
  )
}
