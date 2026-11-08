import { useI18n } from '../../shared/i18n'
import { K8sCourseTab } from './K8sCourseTab'

/** El curso de Kubernetes como pestaña propia de Aprender, junto a la de Docker. */
export function K8sCoursePage() {
  const { t } = useI18n()

  return (
    <section className="notgames">
      <h2>{t('nav.cursok8s')}</h2>
      <K8sCourseTab />
    </section>
  )
}
