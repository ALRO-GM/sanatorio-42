import { useState } from 'react'

import type { LeaderboardEntry, LeaderboardPeriod } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { PersonLink } from '../../shared/ui/PersonLink'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'

const PERIODS = ['month', 'all'] as const satisfies readonly LeaderboardPeriod[]

/** Cuántos se enseñan. Si quien mira queda por debajo, se le añade al final. */
const SHOWN = 10

/**
 * Quién ayuda más en el campus. Cuenta solo la XP de ayudar a otras personas:
 * sesiones de ayuda, dudas resueltas, guías y pizarras.
 */
export function LeaderboardCard({ me }: { me: string }) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const { data, error, loading, reload } = useAsync(() => api.getLeaderboard(period), [period])

  const top = data?.entries.slice(0, SHOWN) ?? []
  const mine = data?.me ?? null
  const rows: LeaderboardEntry[] =
    mine !== null && !top.some((entry) => entry.login === mine.login) ? [...top, mine] : top

  return (
    <article className="card">
      <div className="card-head">
        <span className="eyebrow">
          {t('rank.title')}
          <InfoTip title={t('rank.title')}>
            <p>{t('rank.hint')}</p>
          </InfoTip>
        </span>
        <div className="filter-pills" role="group" aria-label={t('rank.period')}>
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              className={`pill ${period === option ? 'active' : ''}`}
              aria-pressed={period === option}
              onClick={() => {
                setPeriod(option)
              }}
            >
              {t(`rank.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>{t('app.loading')}</p>}
      {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined && rows.length === 0 && <p className="estado">{t('rank.empty')}</p>}
      {data !== undefined && mine === null && rows.length > 0 && (
        <p className="hint">{t('rank.notYet')}</p>
      )}

      <ol className="rows ranking">
        {rows.map((entry) => (
          <li key={entry.login} className={`row plain ${entry.login === me ? 'me' : ''}`}>
            <span className="rank" aria-label={t('rank.place', { n: entry.rank })}>
              <span className={entry.rank <= 3 ? `medal medal-${entry.rank}` : undefined}>
                {entry.rank}
              </span>
            </span>
            <Avatar login={entry.login} image={entry.image} size={28} />
            <PersonLink login={entry.login} />
            <strong className="row-count">{t('rank.xp', { xp: entry.xp })}</strong>
          </li>
        ))}
      </ol>
    </article>
  )
}
