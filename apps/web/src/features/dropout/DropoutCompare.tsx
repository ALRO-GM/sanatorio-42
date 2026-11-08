import { useState } from 'react'

import type { DropoutAverages, DropoutComparison, DropoutPoolSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { DropoutTweaks } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ChartWithRail } from '../../shared/ui/ChartWithRail'
import { DataTable } from '../../shared/ui/DataTable'
import { PillGroup } from '../../shared/ui/PillGroup'
import { INCLUDES } from './dropout'
import type { DropoutInclude } from './dropout'
import { GroupedBars, poolColor, SurvivalChart } from './DropoutCompareCharts'
import type { CompareSeries } from './DropoutCompareCharts'
import { HeavyLoad, ReloadState } from '../../shared/ui/Refreshing'
import { timedLoad } from '../../shared/loadMemory'

/** Dónde se guardan las piscinas elegidas en este navegador. */
const STORAGE = 'sanatorio_dropout_compare'

/** Por qué se agrupan las barras y qué series llevan. */
const BARS_BY = ['week', 'weekday'] as const
const BARS_SERIES = ['pools', 'overall'] as const

/** Las medias que se comparan entre quien lo dejó y quien sigue, en la tabla. */
const AVERAGES = [
  'avgHours',
  'totalHours',
  'firstWeekHours',
  'attendance',
  'isolation',
  'given',
  'received',
  'passed',
] as const satisfies readonly Exclude<keyof DropoutAverages, 'people' | 'leftDay'>[]

/** Las elegidas guardadas: `null` si nunca se eligió (entonces, todas). */
function storedPicked(): string[] | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') as unknown

    return Array.isArray(raw)
      ? raw.filter((each): each is string => typeof each === 'string')
      : null
  } catch {
    return null
  }
}

function storePicked(picked: readonly string[] | null): void {
  try {
    if (picked === null) localStorage.removeItem(STORAGE)
    else localStorage.setItem(STORAGE, JSON.stringify(picked))
  } catch {
    // Sin almacenamiento, la elección dura lo que la página.
  }
}

/**
 * Comparar piscinas (pedido por Alberto el 2026-11-06, `docs/abandono.md`):
 * las últimas diez de su campus, cada una y todas juntas, con los mismos
 * ajustes del cálculo que la pestaña. Supervivencia día a día, abandonos por
 * semana y por cambio de día, y la tabla de cifras.
 */
export function DropoutCompare({ tweaks }: { tweaks: DropoutTweaks }) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<string[] | null>(storedPicked)
  const asked = picked ?? []
  // Sin ninguna elegida no se pide nada: a la API, vacío es «todas».
  const fetched = useAsync(
    () =>
      picked !== null && picked.length === 0
        ? Promise.resolve(null)
        : timedLoad(
            'dropout-compare',
            () => api.getDropoutComparison(asked, tweaks),
            () => ({}),
          ),
    [asked.join(','), picked === null, JSON.stringify(tweaks)],
  )
  const [kept, setKept] = useState<DropoutComparison | undefined>(undefined)

  if (fetched.data !== undefined && fetched.data !== null && fetched.data !== kept) {
    setKept(fetched.data)
  }
  const data = kept
  const choose = (next: string[] | null): void => {
    setPicked(next)
    storePicked(next)
  }

  if (data === undefined) return <HeavyLoad id="dropout-compare" error={fetched.error} />

  const chosen = picked ?? data.available.map((pool) => pool.start)

  return (
    <div className="dropout-compare">
      <ReloadState loading={fetched.loading} error={fetched.error} />
      <fieldset className="card dropout-block dropout-pools">
        <legend className="eyebrow">{t('dropout.compare.pools')}</legend>
        <div className="dropout-pool-list">
          {data.available.map((pool, index) => (
            <label key={pool.start} className="progress-toggle">
              <input
                type="checkbox"
                checked={chosen.includes(pool.start)}
                onChange={(event) => {
                  choose(
                    event.target.checked
                      ? data.available
                          .map((each) => each.start)
                          .filter((start) => start === pool.start || chosen.includes(start))
                      : chosen.filter((start) => start !== pool.start),
                  )
                }}
              />{' '}
              <span className="dropout-pool-dot" style={{ background: poolColor(index) }} />
              {t('dropout.poolOption', { start: pool.start, people: pool.people })}
            </label>
          ))}
        </div>
        <div className="dropout-pool-actions">
          <button
            type="button"
            className="pill"
            onClick={() => {
              choose(null)
            }}
          >
            {t('dropout.compare.all')}
          </button>
          <button
            type="button"
            className="pill"
            onClick={() => {
              choose([])
            }}
          >
            {t('dropout.compare.none')}
          </button>
        </div>
      </fieldset>
      {chosen.length === 0 ? (
        <p className="empty">{t('dropout.compare.pickOne')}</p>
      ) : (
        <CompareBody data={data} />
      )}
    </div>
  )
}

function CompareBody({ data }: { data: DropoutComparison }) {
  const { t } = useI18n()
  const [likely, setLikely] = useState(false)
  const [by, setBy] = useState<(typeof BARS_BY)[number]>('week')
  const [seriesOf, setSeriesOf] = useState<(typeof BARS_SERIES)[number]>('pools')
  const [include, setInclude] = useState<DropoutInclude>('gone')
  const indexOf = (start: string | null): number =>
    data.available.findIndex((pool) => pool.start === start)
  const poolSeries: CompareSeries[] = data.pools.map((pool) => ({
    key: pool.start ?? '',
    label: t('dropout.compare.poolName', { start: pool.start ?? '' }),
    color: poolColor(indexOf(pool.start)),
    pool,
  }))
  const overall: CompareSeries = {
    key: 'overall',
    label: t('dropout.compare.overall'),
    color: 'var(--text)',
    pool: data.overall,
    overall: true,
  }
  const missing = data.pools.filter((pool) => pool.sessionHours === 0)
  const barSeries = seriesOf === 'pools' ? poolSeries : [overall]
  const counted =
    (pick: (pool: DropoutPoolSummary) => { gone: number[]; likely: number[] }) =>
    (pool: DropoutPoolSummary): number[] =>
      pick(pool).gone.map(
        (gone, index) => gone + (include === 'likely' ? (pick(pool).likely[index] ?? 0) : 0),
      )
  const groups =
    by === 'week'
      ? [1, 2, 3, 4].map((n) => t('dropout.chart.weekShort', { n }))
      : [1, 2, 3, 4, 5, 6, 7].map((from) =>
          t('dropout.transitions.item', {
            from: t(`dropout.weekday.short.${from}`),
            to: t(`dropout.weekday.short.${(from % 7) + 1}`),
          }),
        )
  const number = (value: number | null): string =>
    value === null ? '—' : String(Math.round(value * 10) / 10)
  const rows = [...data.pools, data.overall]

  return (
    <>
      {missing.length > 0 && (
        <ul className="dropout-missing" role="status">
          {missing.map((pool) => (
            <li key={pool.start}>{t('dropout.compare.missing', { start: pool.start ?? '' })}</li>
          ))}
        </ul>
      )}

      <section className="dropout-block" aria-labelledby="dropout-survival">
        <h3 id="dropout-survival">{t('dropout.compare.survival.title')}</h3>
        <ChartWithRail
          railLabel={t('dropout.compare.options')}
          chart={
            <SurvivalChart
              series={[...poolSeries, overall]}
              lastDay={data.lastDay}
              likely={likely}
            />
          }
        >
          <div className="progress-option">
            <label className="progress-toggle">
              <input
                type="checkbox"
                checked={likely}
                onChange={(event) => {
                  setLikely(event.target.checked)
                }}
              />{' '}
              {t('dropout.compare.survival.likely')}
            </label>
          </div>
        </ChartWithRail>
      </section>

      <section className="dropout-block" aria-labelledby="dropout-bars">
        <h3 id="dropout-bars">{t('dropout.compare.bars.title')}</h3>
        <ChartWithRail
          railLabel={t('dropout.compare.options')}
          chart={
            <GroupedBars
              series={barSeries}
              groups={groups}
              values={
                by === 'week' ? counted((pool) => pool.byWeek) : counted((pool) => pool.byWeekday)
              }
              label={t(`dropout.compare.bars.label.${by}`)}
            />
          }
        >
          <div className="progress-option">
            <PillGroup
              label={t('dropout.compare.bars.by')}
              options={BARS_BY}
              value={by}
              onChange={setBy}
              text={(option) => t(`dropout.compare.by.${option}`)}
            />
          </div>
          <div className="progress-option">
            <PillGroup
              label={t('dropout.compare.series')}
              options={BARS_SERIES}
              value={seriesOf}
              onChange={setSeriesOf}
              text={(option) => t(`dropout.compare.series.${option}`)}
            />
          </div>
          <div className="progress-option">
            <PillGroup
              label={t('dropout.chart.include')}
              options={INCLUDES}
              value={include}
              onChange={setInclude}
              text={(option) => t(`dropout.include.${option}`)}
            />
          </div>
        </ChartWithRail>
      </section>

      <section className="card dropout-block" aria-labelledby="dropout-compare-table">
        <h3 id="dropout-compare-table">{t('dropout.compare.table.title')}</h3>
        <p className="hint">{t('dropout.compare.table.hint')}</p>
        <DataTable<DropoutPoolSummary>
          id="dropout-compare"
          rows={rows}
          rowKey={(row) => row.start ?? 'overall'}
          rowClass={(row) => (row.start === null ? 'dropout-overall' : '')}
          columns={[
            {
              id: 'pool',
              label: t('dropout.compare.col.pool'),
              sort: (row) => row.start ?? '',
              first: 'asc',
              cell: (row) =>
                row.start === null
                  ? t('dropout.compare.overall')
                  : t('dropout.compare.poolName', { start: row.start }),
            },
            ...(['people', 'gone', 'likely', 'doubt', 'active', 'never'] as const).map((key) => ({
              id: key,
              label: t(`dropout.counts.${key}`),
              sort: (row: DropoutPoolSummary) => row.counts[key],
              cell: (row: DropoutPoolSummary) => row.counts[key],
            })),
            {
              id: 'rate',
              label: t('dropout.compare.col.rate'),
              sort: (row) => (row.counts.people === 0 ? 0 : row.counts.gone / row.counts.people),
              cell: (row) =>
                t('dropout.percent', {
                  n:
                    row.counts.people === 0
                      ? 0
                      : Math.round((100 * row.counts.gone) / row.counts.people),
                }),
            },
            {
              id: 'leftDay',
              label: t('dropout.compare.col.leftDay'),
              sort: (row) => row.leaving.leftDay ?? -1,
              cell: (row) => number(row.leaving.leftDay),
            },
            ...AVERAGES.map((key) => ({
              id: key,
              label: t(`dropout.factor.${key}`),
              sort: (row: DropoutPoolSummary) => row.leaving[key] ?? -1,
              cell: (row: DropoutPoolSummary) =>
                t('dropout.compare.pair', {
                  leaving: number(row.leaving[key]),
                  remaining: number(row.remaining[key]),
                }),
            })),
          ]}
        />
      </section>
    </>
  )
}
