import { useState } from 'react'
import type { PointerEvent } from 'react'

import type {
  CoreTrack,
  ProgressGroup,
  ProgressLine,
  ProgressMeasure,
  ProgressPlan,
  ProgressPopulation,
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
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { useFormat } from '../../shared/i18n/useFormat'
import { ProgressRanking } from './ProgressRanking'

const WIDTH = 640
const HEIGHT = 280
// A la izquierda caben los rótulos del eje: «Círculo 6» o «1 786 h».
const PAD = { left: 64, right: 40, top: 12, bottom: 28 }
const LAST_DAY = 730
const MONTH = 730 / 24
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
const SCOPES: readonly ProgressScope[] = ['campus', 'all']
const PLANS: readonly ProgressPlan[] = ['all', 'classic', 'next']
const POPULATIONS: readonly ProgressPopulation[] = ['finished', 'current', 'blackholed']
/** Cada cuántas horas va una marca del eje de horas. */
const HOURS_STEP = 250

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
  const { number } = useFormat()
  const [measure, setMeasure] = useState<ProgressMeasure>('circles')
  const [scope, setScope] = useState<ProgressScope>('campus')
  // Por defecto, quien sigue más quien terminó: la media de la gente que está.
  const [population, setPopulation] = useState<ProgressPopulation>('current')
  // Sin elegir, el plan de quien mira (C o Python); si no se sabe, los dos.
  const [chosenPlan, setPlan] = useState<ProgressPlan | null>(null)
  const [paces, setPaces] = useState(true)
  const [typed, setTyped] = useState('')
  const [other, setOther] = useState<string | null>(null)
  const { data, error, reload } = useAsync(() => api.getStatsProgress(other), [other])
  const plan = chosenPlan ?? data?.track ?? 'all'

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
            {t(`stats.progress.measure.${measure}.hint`, { n: number(data?.axis.hours ?? 0) })}
          </p>
          {pills(t('stats.progress.scope'), SCOPES, scope, setScope, (value) =>
            t(`stats.progress.scope.${value}`),
          )}
          {pills(t('stats.progress.population'), POPULATIONS, population, setPopulation, (value) =>
            t(`stats.progress.population.${value}`),
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
          <PoolOnly k="avance.compare">
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
          </PoolOnly>
        </div>

        {data === undefined ? (
          <ErrorNote error={error} onRetry={() => void reload()} />
        ) : (
          <ProgressChart
            data={data}
            measure={measure}
            scope={scope}
            population={population}
            plan={plan}
            paces={paces}
            other={other}
          />
        )}
      </article>
      <ProgressRanking />
    </section>
  )
}

/** Las marcas del eje vertical: dónde (en %) y qué dicen. */
function axisTicks(
  data: StatsProgress,
  measure: ProgressMeasure,
  t: ReturnType<typeof useI18n>['t'],
  number: (value: number) => string,
): { at: number; label: string }[] {
  if (measure === 'circles') {
    // Al terminar cada círculo: con siete que pesan igual, cada uno es 1/7.
    return [
      { at: 0, label: t('stats.progress.axisStart') },
      ...data.axis.circles.map((at, circle) => ({
        at,
        label: t('stats.progress.axisCircle', { n: circle }),
      })),
    ]
  }

  // En horas del plan de quien mira; cada línea va en % de su propio plan.
  const total = data.axis.hours
  const ticks: { at: number; label: string }[] = []

  if (total <= 0) return [{ at: 0, label: t('stats.progress.hours', { n: 0 }) }]
  for (let hours = 0; hours < total - HOURS_STEP / 2; hours += HOURS_STEP) {
    ticks.push({
      at: (hours / total) * 100,
      label: t('stats.progress.hours', { n: number(hours) }),
    })
  }
  ticks.push({ at: 100, label: t('stats.progress.hours', { n: number(total) }) })

  return ticks
}

function ProgressChart({
  data,
  measure,
  scope,
  population,
  plan,
  paces,
  other,
}: {
  data: StatsProgress
  measure: ProgressMeasure
  scope: ProgressScope
  population: ProgressPopulation
  plan: ProgressPlan
  paces: boolean
  other: string | null
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const [hover, setHover] = useState<number | null>(null)
  const mine = data.me?.[measure] ?? null
  const theirs = data.other?.line[measure] ?? null
  // Con los dos planes, una media para cada uno: C y Python van a ritmos muy
  // distintos y juntos no dirían nada de ninguno.
  const averageOf = (one: ProgressPlan, key: string, label: string) => {
    const group: ProgressGroup = `${scope}-${one}`

    return {
      key,
      label: t(label, { n: data.people[population][group] }),
      line: data.averages[measure][population][group],
      // Las horas de su plan, para pasar el % a horas en la ficha.
      hours: one === 'all' ? null : data.axis.planHours[one],
    }
  }
  const averages =
    plan === 'all'
      ? [
          averageOf('classic', 'average-c', 'stats.progress.averageC'),
          averageOf('next', 'average-python', 'stats.progress.averagePython'),
        ]
      : [averageOf(plan, 'average', 'stats.progress.average')]
  const series = [
    { key: 'me', label: t('stats.progress.me'), line: mine, hours: data.axis.hours },
    ...averages,
    { key: 'other', label: data.other?.login ?? '', line: theirs, hours: null },
  ].filter(
    (each): each is { key: string; label: string; line: ProgressLine; hours: number | null } =>
      each.line !== null,
  )
  const tracks: readonly CoreTrack[] = plan === 'all' ? ['classic', 'next'] : [plan]
  const unknown = tracks.reduce((sum, track) => sum + data.census[scope][track].unknown, 0)
  const ticks = axisTicks(data, measure, t, number)
  /** «48 %» y, por horas, «48 % · 690 h» con las horas del plan de esa línea. */
  const valueOf = (value: number | null | undefined, hours: number | null): string =>
    value === null || value === undefined
      ? '—'
      : measure === 'hours' && hours !== null
        ? `${number(value)} % · ${t('stats.progress.hours', { n: number(Math.round((value / 100) * hours)) })}`
        : `${number(value)} %`

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
      {unknown > 0 && <p className="hint">{t('stats.progress.unknown', { n: unknown })}</p>}
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
          {ticks.map((tick) => (
            <g key={tick.label} className="progress-grid">
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick.at)} y2={y(tick.at)} />
              <text x={PAD.left - 6} y={y(tick.at)} textAnchor="end" dominantBaseline="middle">
                {tick.label}
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
                {valueOf(each.line[hover], each.hours)}
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
