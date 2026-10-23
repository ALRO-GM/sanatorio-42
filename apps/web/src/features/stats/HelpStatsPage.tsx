import { useState } from 'react'

import type { LeaderboardPeriod, StatsEntry, StatsSection } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Avatar } from '../../shared/ui/Avatar'
import { PersonLink } from '../../shared/ui/PersonLink'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { InfoTip } from '../../shared/ui/InfoTip'
import { HelpStatsTour } from './HelpStatsTour'
import { ProgressCard } from './ProgressCard'

const PERIODS = ['month', 'all'] as const satisfies readonly LeaderboardPeriod[]

/**
 * Estadísticas de Ayuda: qué se mueve en el campus en cada sección (sala de
 * espera, tablón, terapia, pizarras y Not-games) y quién más lo mueve, del mes
 * o de siempre. Las cuentas son de la API.
 */
export function HelpStatsPage({ me }: { me: string }) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const { data, error, loading, reload } = useAsync(() => api.getHelpStats(period), [period])

  return (
    <section className="help-stats">
      <div className="section-head">
        <h2>
          {t('stats.title')}
          <InfoTip title={t('stats.title')}>
            <HelpStatsTour />
          </InfoTip>
        </h2>
        <PillGroup
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          label={t('stats.period')}
          text={(option) => t(`rank.${option}`)}
        />
      </div>

      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}

      <div className="help-stats-grid">
        {data?.sections.map((section) => (
          <SectionCard key={section.id} section={section} me={me} />
        ))}
      </div>

      <ProgressCard />
    </section>
  )
}

function SectionCard({ section, me }: { section: StatsSection; me: string }) {
  const { t } = useI18n()
  const { number } = useFormat()
  const mine = section.me
  const rows: StatsEntry[] =
    mine !== null && !section.ranking.some((entry) => entry.login === mine.login)
      ? [...section.ranking, mine]
      : section.ranking

  return (
    <article className="card help-stats-card" aria-labelledby={`stats-${section.id}`}>
      <h3 id={`stats-${section.id}`}>
        {section.id === 'ritmo' ? t('stats.ritmo.title') : t(`nav.${section.id}`)}
      </h3>
      <dl className="help-stats-totals">
        {section.totals.map((total) => (
          <div key={total.key}>
            <dt>{t(`stats.${section.id}.${total.key}`)}</dt>
            <dd>
              {/* Las horas llegan en minutos: se enseñan en horas, con un decimal. */}
              {total.key === 'minutes'
                ? number(Math.round(total.value / 6) / 10)
                : number(total.value)}
            </dd>
          </div>
        ))}
      </dl>

      <span className="eyebrow">{t(`stats.${section.id}.rank`)}</span>
      {rows.length === 0 ? (
        <p className="estado">{t('stats.empty')}</p>
      ) : (
        <ol className="rows ranking" aria-label={t(`stats.${section.id}.rank`)}>
          {rows.map((entry) => (
            <li key={entry.login} className={`row plain ${entry.login === me ? 'me' : ''}`}>
              <span className="rank" aria-label={t('rank.place', { n: entry.rank })}>
                <span className={entry.rank <= 3 ? `medal medal-${entry.rank}` : undefined}>
                  {entry.rank}
                </span>
              </span>
              <Avatar login={entry.login} image={entry.image} size={28} />
              <PersonLink login={entry.login} />
              {entry.login === me && <span className="chip">{t('stats.you')}</span>}
              <span className="row-count">
                <strong>{t(`stats.${section.id}.value`, { n: entry.value })}</strong>
                <small>
                  {/* En el ritmo, 0 es «más lento que el pace de 24 meses». */}
                  {section.id === 'ritmo' && entry.extra === 0
                    ? t('stats.ritmo.slow')
                    : t(`stats.${section.id}.extra`, { n: entry.extra })}
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}
      {rows.length > 0 && mine === null && <p className="hint">{t('stats.notYet')}</p>}
    </article>
  )
}
