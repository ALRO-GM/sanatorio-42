import { useEffect, useRef, useState } from 'react'
import type { UIEvent } from 'react'

import type { RankingBy, RankingEntry, StatsRanking } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { RankingQuery } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { RangeSlider } from '../../shared/ui/RangeSlider'
import { RankingList, withMe } from '../../shared/ui/RankingList'

const BYS: readonly RankingBy[] = ['circle', 'circles', 'hours']
const PLANS = ['all', 'classic', 'next'] as const
const COHORTS = ['only', 'since'] as const
/** El círculo de quien terminó el common core: uno más que el último. */
const FINISHED = 7
/** Filas por página: el top 10 a la vista y el resto al desplazar. */
const PAGE = 50
/** Lo que se espera a que los tiradores se queden quietos antes de preguntar. */
const SETTLE_MS = 250

type Filters = Omit<RankingQuery, 'offset' | 'limit'>

/**
 * Quién va más rápido en el common core (antes en las estadísticas de Ayuda):
 * por el círculo en el que está cada cual o por el % hecho (por círculos o por
 * horas de su plan), con filtros de plan, kickoff y rangos. Sin quien se tragó
 * el black hole (`docs/blackhole.md`). La lista va por páginas al desplazar y
 * tu fila se queda fija abajo hasta llegar a tu puesto, y arriba después.
 */
export function ProgressRanking() {
  const { t } = useI18n()
  const { number, date } = useFormat()
  const [filters, setFilters] = useState<Filters>({
    by: 'circle',
    plan: 'all',
    kickoff: null,
    cohort: 'only',
    circleMin: 0,
    circleMax: FINISHED,
    pctMin: 0,
    pctMax: 100,
  })
  const [data, setData] = useState<StatsRanking | null>(null)
  const [rows, setRows] = useState<RankingEntry[]>([])
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  // La petición en curso: si cambian los filtros, la vieja no pisa a la nueva.
  const asked = useRef(0)

  const set = (changes: Partial<Filters>): void => {
    setFilters((current) => ({ ...current, ...changes }))
  }

  const load = async (offset: number): Promise<void> => {
    const ticket = ++asked.current

    setBusy(true)
    try {
      const page = await api.getStatsRanking({ ...filters, offset, limit: PAGE })

      if (ticket !== asked.current) return
      setData(page)
      setRows((current) => (offset === 0 ? page.entries : [...current, ...page.entries]))
      setError(null)
    } catch (caught) {
      if (ticket === asked.current) setError(caught)
    } finally {
      if (ticket === asked.current) setBusy(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(0), SETTLE_MS)

    return () => {
      clearTimeout(timer)
    }
    // `load` lee los filtros de este mismo render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const more = data !== null && rows.length < data.total
  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    const box = event.currentTarget

    if (more && !busy && box.scrollTop + box.clientHeight >= box.scrollHeight - 80) {
      void load(rows.length)
    }
  }
  const mine = data?.me ?? null
  const month = (value: string): string => date(`${value}-01T00:00:00Z`, 'monthYear')
  const circleText = (circle: number): string =>
    circle >= FINISHED ? t('stats.ranking.finished') : t('stats.ranking.circle', { n: circle })
  const pctLabel = filters.by === 'hours' ? 'stats.ranking.pctHours' : 'stats.ranking.pctCircles'

  return (
    <article className="card progress-ranking" aria-labelledby="stats-ranking">
      <h3 id="stats-ranking">{t('stats.ranking.title')}</h3>
      <div className="progress-controls">
        <PillGroup
          options={BYS}
          value={filters.by}
          onChange={(by) => {
            set({ by })
          }}
          label={t('stats.ranking.by')}
          text={(value) => t(`stats.ranking.by.${value}`)}
        />
        <PillGroup
          options={PLANS}
          value={filters.plan}
          onChange={(plan) => {
            set({ plan })
          }}
          label={t('stats.progress.plan')}
          text={(value) => t(`stats.progress.plan.${value}`)}
        />
        <label className="progress-kickoff">
          {t('stats.ranking.kickoff')}{' '}
          <select
            value={filters.kickoff ?? ''}
            onChange={(event) => {
              set({ kickoff: event.target.value === '' ? null : event.target.value })
            }}
          >
            <option value="">{t('stats.ranking.kickoff.all')}</option>
            {data?.kickoffs.map((kickoff) => (
              <option key={kickoff.month} value={kickoff.month}>
                {t('stats.ranking.kickoff.month', {
                  month: month(kickoff.month),
                  n: kickoff.people,
                })}
              </option>
            ))}
          </select>
        </label>
        {filters.kickoff !== null && (
          <PillGroup
            options={COHORTS}
            value={filters.cohort}
            onChange={(cohort) => {
              set({ cohort })
            }}
            label={t('stats.ranking.cohort')}
            text={(value) => t(`stats.ranking.cohort.${value}`)}
          />
        )}
        <div className="progress-range">
          <span>
            {t('stats.ranking.circleRange', {
              low: circleText(filters.circleMin),
              high: circleText(filters.circleMax),
            })}
          </span>
          <RangeSlider
            max={FINISHED}
            low={filters.circleMin}
            high={filters.circleMax}
            onChange={(circleMin, circleMax) => {
              set({ circleMin, circleMax })
            }}
            lowLabel={t('stats.ranking.circleMin')}
            highLabel={t('stats.ranking.circleMax')}
          />
        </div>
        <div className="progress-range">
          <span>
            {t('stats.ranking.pctRange', {
              what: t(`stats.ranking.by.${filters.by === 'hours' ? 'hours' : 'circles'}`),
              low: number(filters.pctMin),
              high: number(filters.pctMax),
            })}
          </span>
          <RangeSlider
            max={100}
            low={filters.pctMin}
            high={filters.pctMax}
            onChange={(pctMin, pctMax) => {
              set({ pctMin, pctMax })
            }}
            lowLabel={t('stats.ranking.pctMin')}
            highLabel={t('stats.ranking.pctMax')}
          />
        </div>
      </div>

      {data === null ? (
        error === null ? (
          <p className="estado">{t('app.loading')}</p>
        ) : (
          <ErrorNote error={error} onRetry={() => void load(0)} />
        )
      ) : (
        <>
          <p className="hint" role="status">
            {t('stats.ranking.total', { n: data.total })}
            {mine === null && data.total > 0 && ` · ${t('stats.ranking.notIn')}`}
          </p>
          {rows.length === 0 ? (
            <p className="estado">{t('stats.ranking.empty')}</p>
          ) : (
            <div className="progress-ranking-scroll" onScroll={onScroll} tabIndex={0}>
              <RankingList
                rows={withMe(rows, mine)}
                me={mine?.login ?? ''}
                label={t('stats.ranking.title')}
                // Tu fila, fija abajo mientras no llegas a ella y arriba al pasarla.
                rowClass={(row) => (row.login === mine?.login ? 'pinned' : '')}
                value={(entry) => (
                  <span className="row-count">
                    <strong>
                      {filters.by === 'circle'
                        ? circleText(entry.circle)
                        : t(pctLabel, { n: number(entry[filters.by]) })}
                    </strong>
                    <small>
                      {filters.by === 'circle'
                        ? t('stats.ranking.pctCircles', { n: number(entry.circles) })
                        : circleText(entry.circle)}
                    </small>
                  </span>
                )}
              />
            </div>
          )}
          {more && (
            <button
              type="button"
              className="pill"
              disabled={busy}
              onClick={() => void load(rows.length)}
            >
              {t('stats.ranking.more')}
            </button>
          )}
        </>
      )}
    </article>
  )
}
