import { useI18n } from '../../shared/i18n'
import { GitCourseTab } from './GitCourseTab'

/**
 * El curso de git como pestaña propia de Aprender (reorganización del
 * 2026-10-29; antes, una pestaña dentro de Not-games). Lo fallado se repasa en
 * el Repaso de Not-games.
 */
export function GitCoursePage({ me }: { me: string }) {
  const { t } = useI18n()

  return (
    <section className="notgames">
      <h2>{t('nav.cursogit')}</h2>
      <GitCourseTab
        me={me}
        onReview={() => {
          window.location.hash = '/notgames/review'
        }}
      />
    </section>
  )
}
