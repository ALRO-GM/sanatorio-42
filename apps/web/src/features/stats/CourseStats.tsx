import type { CourseBoardId, LeaderboardPeriod } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { HeavyLoad, ReloadState } from '../../shared/ui/Refreshing'
import { StatsCard } from './StatsCard'

/** El título de cada clasificación: los de cada curso son los de su pestaña. */
const TITLE: Record<CourseBoardId, string> = {
  total: 'stats.courses.total',
  shell: 'nav.cursoshell',
  git: 'nav.cursogit',
  docker: 'nav.cursodocker',
  k8s: 'nav.cursok8s',
  net: 'nav.cursonet',
  rag: 'nav.cursorag',
  bosses: 'stats.courses.bosses',
  certificates: 'stats.courses.certificates',
}

/** Qué cifra ordena cada clasificación y cuál va al lado (como en la API, `courses.rules.ts`). */
const METRICS: Record<CourseBoardId, [string, string]> = {
  total: ['points', 'units'],
  shell: ['points', 'units'],
  git: ['points', 'units'],
  docker: ['points', 'units'],
  k8s: ['points', 'units'],
  net: ['points', 'units'],
  rag: ['points', 'units'],
  bosses: ['bosses', 'points'],
  certificates: ['certificates', 'bosses'],
}

/**
 * Las clasificaciones de los cursos (`docs/cursos-logros.md`): el total de los
 * cuatro, una por curso, jefes vencidos y certificados, del mismo periodo que
 * las de Ayuda. Puede tardar (lee el progreso de todo el campus): enseña cómo
 * avanza.
 */
export function CourseStats({ me, period }: { me: string; period: LeaderboardPeriod }) {
  const { t } = useI18n()
  const { data, error, loading } = useAsync(() => api.getCourseRanking(period), [period])

  return (
    <section className="help-stats-courses" aria-labelledby="stats-courses-title">
      <h2 id="stats-courses-title">{t('stats.courses.title')}</h2>
      {data === undefined ? (
        <HeavyLoad id="course-ranking" error={error} />
      ) : (
        <ReloadState loading={loading} error={error} />
      )}
      <div className="help-stats-grid">
        {data?.boards.map((board) => {
          const [value, extra] = METRICS[board.id]

          return (
            <StatsCard
              key={board.id}
              id={`courses-${board.id}`}
              title={t(TITLE[board.id])}
              rankLabel={t(`stats.courses.${board.id}.rank`)}
              totals={board.totals}
              totalLabel={(key) => t(`stats.courses.sum.${key}`)}
              ranking={board.ranking}
              mine={board.me}
              me={me}
              value={(entry) => t(`stats.courses.metric.${value}`, { n: entry.value })}
              extra={(entry) => t(`stats.courses.metric.${extra}`, { n: entry.extra })}
            />
          )
        })}
      </div>
    </section>
  )
}
