import { useState } from 'react'

import type { AdminGrowth } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Figure } from './Figure'
import { RangePills } from './RangePills'

const DAY_MS = 86_400_000
/** Campus que se ofrecen para elegir: los que más gente tienen. */
const SHOWN_CAMPUSES = 8
const W = 640
const H = 180
const PAD = 28

const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)

/** Todos los días del periodo, aunque no haya pasado nada en alguno. */
function daysBetween(from: string, to: string): string[] {
  const days: string[] = []

  for (let at = Date.parse(from); at <= Date.parse(to); at += DAY_MS) days.push(dayOf(at))

  return days
}

/** Un color por campus, separado del resto (no es un estado: no sale del tema). */
const hueOf = (index: number): number => (index * 137 + 190) % 360

type Series = { id: string; label: string; values: number[]; hue: number; bars?: boolean }

/** Una gráfica de días: líneas y, si alguna serie lo pide, barras. */
function DayChart({ days, series, label }: { days: string[]; series: Series[]; label: string }) {
  const max = Math.max(1, ...series.flatMap((one) => one.values))
  const x = (index: number): number => PAD + (index * (W - PAD * 2)) / Math.max(1, days.length - 1)
  const y = (value: number): number => H - PAD - (value / max) * (H - PAD * 2)
  const barWidth = Math.max(2, (W - PAD * 2) / Math.max(1, days.length) - 2)

  return (
    <figure className="growth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="growth-axis" />
        <text x={4} y={PAD} className="growth-tick">
          {max}
        </text>
        <text x={4} y={H - PAD} className="growth-tick">
          0
        </text>
        {series.map((one) =>
          one.bars === true ? (
            <g key={one.id} style={{ fill: `hsl(${one.hue} 65% 55% / 0.55)` }}>
              {one.values.map((value, index) => (
                <rect
                  key={days[index]}
                  x={x(index) - barWidth / 2}
                  y={y(value)}
                  width={barWidth}
                  height={H - PAD - y(value)}
                />
              ))}
            </g>
          ) : (
            <polyline
              key={one.id}
              fill="none"
              strokeWidth={2.5}
              style={{ stroke: `hsl(${one.hue} 70% 55%)` }}
              points={one.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
            />
          ),
        )}
        <text x={PAD} y={H - 6} className="growth-tick">
          {days[0]}
        </text>
        <text x={W - PAD} y={H - 6} textAnchor="end" className="growth-tick">
          {days.at(-1)}
        </text>
      </svg>
      <figcaption className="map-legend">
        {series.map((one) => (
          <span key={one.id}>
            <i className="growth-key" style={{ background: `hsl(${one.hue} 70% 55%)` }} />{' '}
            {one.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

/**
 * Crecimiento (#71 del buzón): cuánta gente usa la web cada día en cada campus
 * y cuánta hay en total, con las nuevas de cada día. Se elige el periodo y uno,
 * varios o todos los campus.
 */
export function GrowthPanel() {
  const { t } = useI18n()
  const [range, setRange] = useState(30)
  const [picked, setPicked] = useState<number[]>([])
  const to = dayOf(Date.now())
  const from = dayOf(Date.now() - (range - 1) * DAY_MS)
  const { data, error, loading, reload } = useAsync(
    () => api.getAdminGrowth(from, to, picked),
    [from, to, picked.join(',')],
  )

  const toggle = (id: number): void => {
    setPicked((current) =>
      current.includes(id) ? current.filter((one) => one !== id) : [...current, id],
    )
  }

  const campuses = (data?.campuses ?? []).slice(0, SHOWN_CAMPUSES)

  return (
    <article className="card growth">
      <span className="eyebrow">{t('admin.growth.title')}</span>
      <RangePills value={range} onChange={setRange} />
      <PillGroup<number | 'all'>
        options={['all', ...campuses.map((campus) => campus.id)]}
        value={null}
        pressed={(option) => (option === 'all' ? picked.length === 0 : picked.includes(option))}
        onChange={(option) => {
          if (option === 'all') setPicked([])
          else toggle(option)
        }}
        label={t('admin.growth.campuses')}
        text={(option) => {
          const campus = campuses.find((one) => one.id === option)

          if (option === 'all' || campus === undefined) return t('admin.growth.all')

          return `${campus.name === '' ? t('admin.growth.noCampus') : campus.name} · ${campus.people}`
        }}
      />
      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={error} onRetry={() => void reload()} />
      {data !== undefined && <GrowthCharts data={data} />}
    </article>
  )
}

function GrowthCharts({ data }: { data: AdminGrowth }) {
  const { t } = useI18n()
  const days = daysBetween(data.from, data.to)
  const index = new Map(days.map((day, at) => [day, at]))
  const names = new Map(data.campuses.map((campus) => [campus.id, campus.name]))
  const active = new Map<number, number[]>()
  const fresh = days.map(() => 0)

  for (const row of data.days) {
    const at = index.get(row.day)

    if (at === undefined) continue

    const line = active.get(row.campusId) ?? days.map(() => 0)

    line[at] = row.active
    active.set(row.campusId, line)
    fresh[at] = (fresh[at] ?? 0) + row.newUsers
  }

  const before = data.before.reduce((sum, row) => sum + row.people, 0)
  let running = before
  const total = fresh.map((value) => (running += value))
  const activeTotal = days.map((_, at) =>
    [...active.values()].reduce((sum, line) => sum + (line[at] ?? 0), 0),
  )
  const nameOf = (id: number): string => {
    const name = names.get(id) ?? ''

    return name === '' ? t('admin.growth.noCampus') : name
  }

  return (
    <>
      <div className="stat-cards">
        <Figure label={t('admin.growth.total')} value={String(total.at(-1) ?? before)} strong />
        <Figure label={t('admin.growth.new')} value={String(fresh.reduce((a, b) => a + b, 0))} />
        <Figure
          label={t('admin.growth.activeAvg')}
          value={(activeTotal.reduce((a, b) => a + b, 0) / Math.max(1, days.length)).toFixed(1)}
        />
      </div>
      <span className="eyebrow">{t('admin.growth.activeByCampus')}</span>
      <DayChart
        days={days}
        label={t('admin.growth.activeByCampus')}
        series={[...active.entries()].map(([id, values], at) => ({
          id: String(id),
          label: nameOf(id),
          values,
          hue: hueOf(at),
        }))}
      />
      {/* Cada una con su escala: las nuevas de un día no se ven al lado del total. */}
      <span className="eyebrow">{t('admin.growth.total')}</span>
      <DayChart
        days={days}
        label={t('admin.growth.total')}
        series={[{ id: 'total', label: t('admin.growth.total'), values: total, hue: 190 }]}
      />
      <span className="eyebrow">{t('admin.growth.newByDay')}</span>
      <DayChart
        days={days}
        label={t('admin.growth.newByDay')}
        series={[{ id: 'new', label: t('admin.growth.new'), values: fresh, hue: 150, bars: true }]}
      />
    </>
  )
}
