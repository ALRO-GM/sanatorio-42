import type { DropoutPoolSummary } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'

const WIDTH = 640
const HEIGHT = 280
const PAD = { left: 44, right: 16, top: 14, bottom: 36 }
const INNER_W = WIDTH - PAD.left - PAD.right
const INNER_H = HEIGHT - PAD.top - PAD.bottom

/**
 * El color de cada piscina, por su sitio en la lista de las que se pueden
 * elegir: no cambia al elegir otras (`styles/dropout.css`, `--pool-1…10`).
 */
export const poolColor = (index: number): string => `var(--pool-${(index % 10) + 1})`

/** Una serie de la comparación: una piscina o todas juntas. */
export type CompareSeries = {
  key: string
  label: string
  color: string
  pool: DropoutPoolSummary
  /** Todas juntas: más gruesa. */
  overall?: boolean
}

/**
 * La supervivencia: qué % de cada piscina sigue al acabar cada día de piscina,
 * una línea por piscina elegida y la de todas juntas más gruesa. Cada punto
 * dice su valor al pasar por él.
 */
export function SurvivalChart({
  series,
  lastDay,
  likely,
}: {
  series: readonly CompareSeries[]
  lastDay: number
  /** Quitando también a los probables (`stayingLikely`). */
  likely: boolean
}) {
  const { t } = useI18n()
  const lineOf = (each: CompareSeries): (number | null)[] =>
    likely ? each.pool.stayingLikely : each.pool.staying
  const values = series.flatMap((each) => lineOf(each).filter((v): v is number => v !== null))
  // El eje empieza en la decena por debajo del más bajo: con todo entre 60 y 100 se ve la diferencia.
  const bottom = Math.max(0, Math.floor(Math.min(100, ...values) / 10) * 10 - 10)
  const x = (day: number): number => PAD.left + (day / Math.max(1, lastDay)) * INNER_W
  const y = (value: number): number =>
    PAD.top + INNER_H - ((value - bottom) / (100 - bottom)) * INNER_H
  const pathOf = (line: readonly (number | null)[]): string => {
    let path = ''
    let open = false

    line.forEach((value, day) => {
      if (value === null) {
        open = false
        return
      }
      path += `${open ? 'L' : 'M'}${x(day).toFixed(1)},${y(value).toFixed(1)}`
      open = true
    })

    return path
  }
  const ticks = Array.from(
    { length: Math.floor((100 - bottom) / 10) + 1 },
    (_, i) => bottom + i * 10,
  )

  return (
    <div className="dropout-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('dropout.compare.survival.label', { pools: series.length - 1 })}
      >
        <g className="progress-grid">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end">
                {t('dropout.percent', { n: tick })}
              </text>
            </g>
          ))}
          {Array.from({ length: Math.floor(lastDay / 7) + 1 }, (_, week) => week * 7).map((day) => (
            <text key={day} x={x(day)} y={HEIGHT - PAD.bottom + 16} textAnchor="middle">
              {day + 1}
            </text>
          ))}
        </g>
        <text
          className="progress-axis"
          x={(PAD.left + WIDTH - PAD.right) / 2}
          y={HEIGHT - 2}
          textAnchor="middle"
        >
          {t('dropout.compare.survival.days')}
        </text>
        {series.map((each) => (
          <g
            key={each.key}
            className={`dropout-survival ${each.overall === true ? 'overall' : ''}`}
          >
            <path
              className="progress-line"
              d={pathOf(lineOf(each))}
              stroke={each.color}
              strokeWidth={each.overall === true ? 3.5 : 1.75}
            >
              <title>{each.label}</title>
            </path>
            {lineOf(each).map((value, day) =>
              value === null ? null : (
                <circle
                  key={day}
                  cx={x(day)}
                  cy={y(value)}
                  r={each.overall === true ? 3 : 2.25}
                  fill={each.color}
                >
                  <title>
                    {t('dropout.compare.survival.point', {
                      pool: each.label,
                      day: day + 1,
                      value: t('dropout.percent', { n: value }),
                    })}
                  </title>
                </circle>
              ),
            )}
          </g>
        ))}
      </svg>
      <SeriesLegend series={series} />
    </div>
  )
}

/** La leyenda de las series: el color de cada piscina y el total, más grueso. */
function SeriesLegend({ series }: { series: readonly CompareSeries[] }) {
  return (
    <ul className="piscine-chart-legend">
      {series.map((each) => (
        <li key={each.key}>
          <svg className="progress-key" viewBox="0 0 24 8" aria-hidden="true">
            <line
              x1="0"
              x2="24"
              y1="4"
              y2="4"
              stroke={each.color}
              strokeWidth={each.overall === true ? 4 : 2}
            />
          </svg>
          {each.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * Barras agrupadas: en cada grupo (una semana de piscina, un cambio de día),
 * qué % de la gente de cada serie lo dejó ahí. En % y no en personas, para
 * comparar piscinas de tamaños distintos.
 */
export function GroupedBars({
  series,
  groups,
  values,
  label,
}: {
  series: readonly CompareSeries[]
  /** El nombre de cada grupo, en orden. */
  groups: readonly string[]
  /** Cuántos lo dejaron en cada grupo, de una serie. */
  values: (pool: DropoutPoolSummary) => readonly number[]
  label: string
}) {
  const { t } = useI18n()
  const pct = (each: CompareSeries, index: number): number =>
    each.pool.counts.people === 0
      ? 0
      : (100 * (values(each.pool)[index] ?? 0)) / each.pool.counts.people
  const top = Math.max(1, ...series.flatMap((each) => groups.map((_, index) => pct(each, index))))
  const slot = INNER_W / Math.max(1, groups.length)
  const bar = (slot * 0.8) / Math.max(1, series.length)
  const y = (value: number): number => PAD.top + INNER_H - (value / top) * INNER_H
  const step = top <= 5 ? 1 : top <= 15 ? 2.5 : 5
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step)

  return (
    <div className="dropout-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        <g className="progress-grid">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end">
                {t('dropout.percent', { n: tick })}
              </text>
            </g>
          ))}
          {groups.map((group, index) => (
            <text
              key={group}
              x={PAD.left + slot * index + slot / 2}
              y={HEIGHT - PAD.bottom + 16}
              textAnchor="middle"
            >
              {group}
            </text>
          ))}
        </g>
        {groups.map((group, index) =>
          series.map((each, place) => {
            const value = pct(each, index)

            return (
              <rect
                key={`${group}-${each.key}`}
                x={PAD.left + slot * index + slot * 0.1 + place * bar}
                y={y(value)}
                width={Math.max(1, bar - 1)}
                height={PAD.top + INNER_H - y(value)}
                rx={2}
                fill={each.color}
              >
                <title>
                  {t('dropout.compare.bars.value', {
                    pool: each.label,
                    when: group,
                    count: values(each.pool)[index] ?? 0,
                    pct: t('dropout.percent', { n: Math.round(value * 10) / 10 }),
                  })}
                </title>
              </rect>
            )
          }),
        )}
      </svg>
      <SeriesLegend series={series} />
    </div>
  )
}
