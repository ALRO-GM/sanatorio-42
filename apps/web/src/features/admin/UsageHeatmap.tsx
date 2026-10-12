import { useState } from 'react'

import type { UsageHeatmap as Heatmap } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'

const GROUPINGS = [
  'total',
  'activity',
  'track',
  'cohort',
] as const satisfies readonly Heatmap['by'][]

/**
 * Panel de gestión: mapa de calor de qué se usa en la web.
 *
 * Una fila por elemento (cada pestaña, cada bloque de cada página) y una columna
 * por grupo de personas. El color de cada celda es la parte del uso de ese grupo
 * que se lleva el elemento, así que grupos de tamaños distintos se comparan bien.
 * Solo lo ve quien administra la web.
 */
export function UsageHeatmap() {
  const { t } = useI18n()
  const [by, setBy] = useState<Heatmap['by']>('total')
  const { data, error, loading, reload } = useAsync(() => api.getUsageHeatmap(by), [by])

  /** Nombre legible de un elemento: la pestaña o el bloque, con su página delante. */
  const nameOf = (key: string): string => {
    const [page = '', id = ''] = key.split('.')

    return page === 'nav'
      ? `${t('admin.usage.tab')} · ${t(`nav.${id}`)}`
      : `${t(`layout.page.${page}`)} · ${t(`layout.${page}.${id}`)}`
  }

  const groupName = (id: string): string =>
    by === 'cohort' && /^\d{4}$/.test(id) ? id : t(`admin.usage.group.${id}`)

  return (
    <section>
      <h2>
        {t('admin.usage.title')}
        <InfoTip title={t('admin.usage.title')}>
          <p>{t('admin.usage.subtitle')}</p>
        </InfoTip>
      </h2>

      <div className="filter-pills" role="group" aria-label={t('admin.usage.by')}>
        {GROUPINGS.map((option) => (
          <button
            key={option}
            type="button"
            className={`pill ${by === option ? 'active' : ''}`}
            aria-pressed={by === option}
            onClick={() => {
              setBy(option)
            }}
          >
            {t(`admin.usage.by.${option}`)}
          </button>
        ))}
      </div>

      {loading && <p className="estado">{t('app.loading')}</p>}
      {!loading && data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined &&
        (data.rows.length === 0 ? (
          <p className="estado">{t('admin.usage.empty')}</p>
        ) : (
          <HeatTable data={data} nameOf={nameOf} groupName={groupName} />
        ))}
    </section>
  )
}

type HeatTableProps = {
  data: Heatmap
  nameOf: (key: string) => string
  groupName: (id: string) => string
}

function HeatTable({ data, nameOf, groupName }: HeatTableProps) {
  const { t } = useI18n()
  // Usos totales de cada grupo: cada celda se pinta como parte de los suyos.
  const totals = data.groups.map((_, column) =>
    data.rows.reduce((sum, row) => sum + (row.counts[column] ?? 0), 0),
  )
  const share = (count: number, column: number): number =>
    (totals[column] ?? 0) === 0 ? 0 : count / (totals[column] ?? 1)
  // La celda más cargada marca el color más intenso.
  const peak = Math.max(
    0.0001,
    ...data.rows.flatMap((row) => row.counts.map((count, column) => share(count, column))),
  )
  // Lo más usado arriba.
  const rows = [...data.rows].sort(
    (a, b) => b.counts.reduce((x, y) => x + y, 0) - a.counts.reduce((x, y) => x + y, 0),
  )

  return (
    <div className="card heat-wrap">
      <table className="heat">
        <thead>
          <tr>
            <th scope="col">{t('admin.usage.element')}</th>
            {data.groups.map((group, column) => (
              <th key={group.id} scope="col">
                {groupName(group.id)}
                <small>
                  {t('admin.usage.people', { n: group.people, uses: totals[column] ?? 0 })}
                </small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{nameOf(row.key)}</th>
              {row.counts.map((count, column) => {
                const part = share(count, column)

                return (
                  <td
                    key={data.groups[column]?.id ?? column}
                    style={{ '--heat': (part / peak).toFixed(3) } as React.CSSProperties}
                    title={t('admin.usage.cell', { uses: count, pct: Math.round(part * 100) })}
                  >
                    {count === 0 ? '·' : `${Math.round(part * 100)} %`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">{t('admin.usage.hint')}</p>
    </div>
  )
}
