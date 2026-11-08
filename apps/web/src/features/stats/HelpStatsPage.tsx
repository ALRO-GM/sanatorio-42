import { useState } from 'react'

import type { LeaderboardPeriod, StatsSection } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { SectionTitle } from '../../shared/ui/SectionTitle'
import { CourseStats } from './CourseStats'
import { HelpStatsTour } from './HelpStatsTour'
import { StatsCard } from './StatsCard'

const PERIODS = ['month', 'all'] as const satisfies readonly LeaderboardPeriod[]

/**
 * Estadísticas de Ayuda: qué se mueve en el campus en cada sección (sala de
 * espera, tablón, terapia, pizarras y Not-games) y quién más lo mueve, del mes
 * o de siempre. Las cuentas son de la API. Debajo, las de los cuatro cursos
 * (`CourseStats`). Quién va más rápido en el common core está en el Avance
 * (`ProgressRanking`).
 */
export function HelpStatsPage({ me }: { me: string }) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const { data, error, loading } = useAsync(() => api.getHelpStats(period), [period])
  // Primera capa (2026-10-29): tu mejor puesto entre todas las clasificaciones.
  const best =
    data?.sections.reduce<{ rank: number; section: string } | null>(
      (top, section) =>
        section.me !== null && (top === null || section.me.rank < top.rank)
          ? { rank: section.me.rank, section: section.id }
          : top,
      null,
    ) ?? null

  return (
    <section className="help-stats">
      <div className="section-head">
        <SectionTitle title={t('stats.title')}>
          <HelpStatsTour />
        </SectionTitle>
        <PillGroup
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          label={t('stats.period')}
          text={(option) => t(`rank.${option}`)}
        />
      </div>

      {best !== null && (
        <p className="progress-answer good">
          <span className="eyebrow">{t('stats.progress.answer.label')}</span>
          <strong>
            {t('stats.answer', { rank: best.rank, section: t(`nav.${best.section}`) })}
          </strong>
        </p>
      )}
      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      {data === undefined && <ErrorNote error={error} retry />}

      <div className="help-stats-grid">
        {data?.sections.map((section) => (
          <SectionCard key={section.id} section={section} me={me} />
        ))}
      </div>

      {/* Los cursos, con el mismo periodo (`docs/cursos-logros.md`). */}
      <CourseStats me={me} period={period} />
    </section>
  )
}

function SectionCard({ section, me }: { section: StatsSection; me: string }) {
  const { t } = useI18n()

  return (
    <StatsCard
      id={section.id}
      title={t(`nav.${section.id}`)}
      rankLabel={t(`stats.${section.id}.rank`)}
      totals={section.totals}
      totalLabel={(key) => t(`stats.${section.id}.${key}`)}
      ranking={section.ranking}
      mine={section.me}
      me={me}
      value={(entry) => t(`stats.${section.id}.value`, { n: entry.value })}
      extra={(entry) => t(`stats.${section.id}.extra`, { n: entry.extra })}
    />
  )
}
