import { useState } from 'react'

import type { ClickLayout } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { RangePills } from './RangePills'

const LAYOUTS: readonly ClickLayout[] = ['desktop', 'mobile']

/**
 * El mapa de calor de clics de una sección (#69 del buzón): dónde se pulsa,
 * sobre una rejilla normalizada del contenido, y qué se pulsa. Lo que se pulsa
 * sin que se pueda pulsar va destacado: es donde la gente espera que algo
 * haga algo.
 */
export function ClickMap() {
  const { t } = useI18n()
  const [section, setSection] = useState<string | null>(null)
  const [layout, setLayout] = useState<ClickLayout>('desktop')
  const [days, setDays] = useState(30)
  const { data, error, loading, reload } = useAsync(
    () => api.getClickHeatmap(section, layout, days),
    [section, layout, days],
  )
  const max = Math.max(1, ...(data?.cells ?? []).map((cell) => cell.n))
  const rows = Math.max(10, ...(data?.cells ?? []).map((cell) => cell.y + 1))
  const byCell = new Map((data?.cells ?? []).map((cell) => [`${cell.x},${cell.y}`, cell.n]))

  return (
    <section className="click-map">
      <h2>{t('admin.clicks.title')}</h2>
      <div className="filter-pills">
        <label>
          {t('admin.clicks.section')}{' '}
          <select
            value={data?.section ?? section ?? ''}
            onChange={(event) => {
              setSection(event.target.value)
            }}
          >
            {(data?.sections ?? []).map((one) => (
              <option key={one} value={one}>
                {t(`nav.${one}`)}
              </option>
            ))}
          </select>
        </label>
        <PillGroup
          options={LAYOUTS}
          value={layout}
          onChange={setLayout}
          label={t('admin.clicks.title')}
          text={(option) => t(`admin.clicks.layout.${option}`)}
        />
      </div>
      <RangePills value={days} onChange={setDays} />
      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={error} onRetry={() => void reload()} />
      {data !== undefined && (
        <div className="click-layout">
          <div
            className={`click-grid ${layout}`}
            role="img"
            aria-label={t('admin.clicks.gridLabel')}
            style={{ gridTemplateColumns: `repeat(${data.columns}, 1fr)` }}
          >
            {Array.from({ length: rows * data.columns }, (_, index) => {
              const x = index % data.columns
              const y = Math.floor(index / data.columns)
              const n = byCell.get(`${x},${y}`) ?? 0

              return (
                <span
                  key={index}
                  title={n === 0 ? undefined : String(n)}
                  style={{ opacity: n === 0 ? 0.06 : 0.15 + (0.85 * n) / max }}
                />
              )
            })}
          </div>
          <DataTable
            id="click-elements"
            rows={data.elements}
            rowKey={(row) => `${row.interactive ? 1 : 0}|${row.element}`}
            rowClass={(row) => (row.interactive ? '' : 'dead-click')}
            columns={[
              {
                id: 'element',
                label: t('admin.clicks.element'),
                sort: (row) => row.element,
                first: 'asc',
                cell: (row) => <code>{row.element}</code>,
              },
              {
                id: 'interactive',
                label: t('admin.clicks.interactive'),
                sort: (row) => (row.interactive ? 1 : 0),
                cell: (row) => (row.interactive ? t('admin.clicks.yes') : t('admin.clicks.dead')),
              },
              {
                id: 'n',
                label: t('admin.clicks.count'),
                sort: (row) => row.n,
                cell: (row) => row.n,
              },
            ]}
          />
        </div>
      )}
      <p className="hint">{t('admin.clicks.hint')}</p>
    </section>
  )
}
