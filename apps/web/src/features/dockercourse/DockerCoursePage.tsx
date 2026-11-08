import { useI18n } from '../../shared/i18n'
import { DockerCourseTab } from './DockerCourseTab'

/** El curso de Docker como pestaña propia de Aprender, junto a la de shell. */
export function DockerCoursePage() {
  const { t } = useI18n()

  return (
    <section className="notgames">
      <h2>{t('nav.cursodocker')}</h2>
      <DockerCourseTab />
    </section>
  )
}
