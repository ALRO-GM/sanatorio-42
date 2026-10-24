import { useState } from 'react'
import type { PointerEvent } from 'react'

import type {
  ProgressGroup,
  ProgressLine,
  ProgressMeasure,
  ProgressPlan,
  ProgressScope,
  StatsProgress,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PersonInput } from '../../shared/ui/PersonInput'

const WIDTH = 640
const HEIGHT = 280
const PAD = { left: 36, right: 40, top: 12, bottom: 28 }
const LAST_DAY = 730
const MONTH = 730 / 24
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
const SCOPES: readonly ProgressScope[] = ['campus', 'all']
const PLANS: readonly ProgressPlan[] = ['all', 'classic', 'next']

const x = (day: number): number => PAD.left + (day / LAST_DAY) * (WIDTH - PAD.left - PAD.right)
const y = (value: number): number =>
  HEIGHT - PAD.bottom - (value / 100) * (HEIGHT - PAD.top - PAD.bottom)

/** Los puntos de una línea en SVG, saltándose los huecos (`null`). */
function pathOf(days: readonly number[], line: ProgressLine): string {
  let path = ''
  let open = false

  line.forEach((value, index) => {
    const day = days[index]

    if (value === null || day === undefined) {
      open = false
      return
    }
    path += `${open ? 'L' : 'M'}${x(day).toFixed(1)},${y(value).toFixed(1)}`
    open = true
  })

  return path
}

/**
 * La pestaña Avance, en Datos: el avance en el common core a lo largo del tiempo (#87): tu línea, la media
 * (del campus o de todos, de un plan o de los dos), la de alguien con quien te
 * comparas y lo que pide cada pace. Se mide por círculos o por horas.
 */
export function ProgressPage() {
  const { t } = useI18n()
  const [measure, setMeasure] = useState<ProgressMeasure>('circles')
  const [scope, setScope] = useState<ProgressScope>('campus')
  const [plan, setPlan] = useState<ProgressPlan>('all')
  const [paces, setPaces] = useState(true)
  const [typed, setTyped] = useState('')
  const [other, setOther] = useState<string | null>(null)
  const { data, error, reload } = useAsync(() => api.getStatsProgress(other), [other])

  const pills = <T extends string>(
    label: string,
    options: readonly T[],
    current: T,
    set: (value: T) => void,
    text: (value: T) => string,
  ) => <PillGroup options={options} value={current} onChange={set} label={label} text={text} />

  return (
    <section className="progress-page" aria-labelledby="stats-progress">
      <div className="section-head">
        <h2 id="stats-progress">
          {t('stats.progress.title')}
          <InfoTip title={t('stats.progress.title')}>
            <p>{t('stats.progress.info')}</p>
          </InfoTip>
        </h2>
      </div>
      <article className="card progress-card">
        <div className="progress-controls">
          {pills(t('stats.progress.measure'), MEASURES, measure, setMeasure, (value) =>
            t(`stats.progress.measure.${value}`),
          )}
          <p className="hint progress-measure-hint">
            {t(`stats.progress.measure.${measure}.hint`)}
          </p>
          {pills(t('stats.progress.scope'), SCOPES, scope, setScope, (value) =>
            t(`stats.progress.scope.${value}`),
          )}
          {pills(t('stats.progress.plan'), PLANS, plan, setPlan, (value) =>
            t(`stats.progress.plan.${value}`),
          )}
          <label className="progress-toggle">
            <input
              type="checkbox"
              checked={paces}
              onChange={(event) => {
                setPaces(event.target.checked)
              }}
            />{' '}
            {t('stats.progress.paces')}
          </label>
          <form
            className="progress-compare"
            onSubmit={(event) => {
              event.preventDefault()
              setOther(typed.trim().toLowerCase() || null)
            }}
          >
            <PersonInput
              value={typed}
              label={t('stats.progress.compare')}
              placeholder={t('stats.progress.comparePlaceholder')}
              onChange={setTyped}
              onPick={(login) => {
                setTyped(login)
                setOther(login)
              }}
            />
            <button type="submit" className="pill">
              {t('stats.progress.compare')}
            </button>
            {other !== null && (
              <button
                type="button"
                className="pill"
                onClick={() => {
                  setOther(null)
                  setTyped('')
                }}
              >
                {t('stats.progress.compareClear')}
              </button>
            )}
          </form>
        </div>

        {data === undefined ? (
          <ErrorNote error={error} onRetry={() => void reload()} />
        ) : (
          <ProgressChart
            data={data}
            measure={measure}
            group={`${scope}-${plan}`}
            paces={paces}
            other={other}
          />
        )}
      </article>
    </section>
  )
}

function ProgressChart({
  data,
  measure,
  group,
  paces,
  other,
}: {
  data: StatsProgress
  measure: ProgressMeasure
  group: ProgressGroup
  paces: boolean
  other: string | null
}) {
  const { t } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const average = data.averages[measure][group]
  const mine = data.me?.[measure] ?? null
  const theirs = data.other?.line[measure] ?? null
  const series = [
    { key: 'me', label: t('stats.progress.me'), line: mine },
    {
      key: 'average',
      label: t('stats.progress.average', { n: data.people[group] }),
      line: average,
    },
    { key: 'other', label: data.other?.login ?? '', line: theirs },
  ].filter((each): each is { key: string; label: string; line: ProgressLine } => each.line !== null)

  const onMove = (event: PointerEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    const at = ((event.clientX - box.left) / box.width) * WIDTH
    const day = ((at - PAD.left) / (WIDTH - PAD.left - PAD.right)) * LAST_DAY
    let best = 0

    data.days.forEach((each, index) => {
      if (Math.abs(each - day) < Math.abs((data.days[best] ?? 0) - day)) best = index
    })
    setHover(best)
  }

  const hoverDay = hover === null ? null : (data.days[hover] ?? null)

  return (
    <>
      {data.me === null && <p className="hint">{t('stats.progress.noMe')}</p>}
      {other !== null && data.other === null && (
        <p className="hint">{t('stats.progress.noOther', { login: other })}</p>
      )}
      <div className="progress-chart">
        <svg
          viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
          role="img"
          aria-label={t('stats.progress.title')}
          onPointerMove={onMove}
          onPointerLeave={() => {
            setHover(null)
          }}
        >
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value} className="progress-grid">
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} />
              <text x={PAD.left - 6} y={y(value)} textAnchor="end" dominantBaseline="middle">
                {value} %
              </text>
            </g>
          ))}
          {[0, 6, 12, 18, 24].map((months) => (
            <text
              key={months}
              className="progress-axis"
              x={x(months * MONTH)}
              y={HEIGHT - 8}
              textAnchor="middle"
            >
              {t('stats.progress.months', { n: months })}
            </text>
          ))}
          {paces &&
            data.paces[measure].map((line) => {
              const end = line.points.at(-1)

              return (
                <g key={line.pace} className="progress-pace">
                  <path
                    d={line.points
                      .map(
                        ([day, value], index) =>
                          `${index === 0 ? 'M' : 'L'}${x(day).toFixed(1)},${y(value).toFixed(1)}`,
                      )
                      .join('')}
                  />
                  {end !== undefined && (
                    <text x={x(end[0]) + 4} y={y(end[1])} dominantBaseline="middle">
                      {t('stats.progress.paceShort', { n: line.pace })}
                    </text>
                  )}
                </g>
              )
            })}
          {series.map((each) => (
            <path
              key={each.key}
              className={`progress-line ${each.key}`}
              d={pathOf(data.days, each.line)}
            />
          ))}
          {hoverDay !== null && hover !== null && (
            <g className="progress-hover">
              <line x1={x(hoverDay)} x2={x(hoverDay)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
              {series.map((each) => {
                const value = each.line[hover]

                return value === null || value === undefined ? null : (
                  <circle
                    key={each.key}
                    className={`progress-dot ${each.key}`}
                    cx={x(hoverDay)}
                    cy={y(value)}
                    r={4}
                  />
                )
              })}
            </g>
          )}
        </svg>
        {hoverDay !== null && hover !== null && (
          <div
            className="progress-tip"
            style={{ left: `${String((x(hoverDay) / WIDTH) * 100)}%` }}
            role="status"
          >
            <strong>
              {t('stats.progress.day', {
                n: hoverDay,
                m: Math.round((hoverDay / MONTH) * 10) / 10,
              })}
            </strong>
            {series.map((each) => (
              <span key={each.key}>
                <i className={`progress-swatch ${each.key}`} /> {each.label}:{' '}
                {each.line[hover] ?? '—'} %
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="progress-legend">
        {series.map((each) => (
          <li key={each.key}>
            <i className={`progress-swatch ${each.key}`} /> {each.label}
          </li>
        ))}
        {paces && (
          <li>
            <i className="progress-swatch pace" /> {t('stats.progress.paceLegend')}
          </li>
        )}
      </ul>
      <details className="progress-table">
        <summary>{t('stats.progress.table')}</summary>
        <table>
          <thead>
            <tr>
              <th>{t('stats.progress.tableMonth')}</th>
              {series.map((each) => (
                <th key={each.key}>{each.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.days.map((day, index) =>
              index % 6 !== 0 ? null : (
                <tr key={day}>
                  <td>{Math.round(day / MONTH)}</td>
                  {series.map((each) => (
                    <td key={each.key}>{each.line[index] ?? '—'}</td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </details>
    </>
  )
}
