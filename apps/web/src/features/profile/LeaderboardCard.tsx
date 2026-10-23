import { useState } from 'react'

import type { LeaderboardEntry, LeaderboardPeriod } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { InfoTip } from '../../shared/ui/InfoTip'
import { RankingList, withMe } from '../../shared/ui/RankingList'

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

  const mine = data?.me ?? null
  const rows: LeaderboardEntry[] = withMe(data?.entries.slice(0, SHOWN) ?? [], mine)

  return (
    <article className="card">
      <div className="card-head">
        <span className="eyebrow">
          {t('rank.title')}
          <InfoTip title={t('rank.title')}>
            <p>{t('rank.hint')}</p>
          </InfoTip>
        </span>
        <PillGroup
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          label={t('rank.period')}
          text={(option) => t(`rank.${option}`)}
        />
      </div>

      {loading && <p>{t('app.loading')}</p>}
      {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined && rows.length === 0 && <p className="estado">{t('rank.empty')}</p>}
      {data !== undefined && mine === null && rows.length > 0 && (
        <p className="hint">{t('rank.notYet')}</p>
      )}

      <RankingList
        rows={rows}
        me={me}
        label={t('rank.title')}
        value={(entry) => <strong className="row-count">{t('rank.xp', { xp: entry.xp })}</strong>}
      />
    </article>
  )
}
