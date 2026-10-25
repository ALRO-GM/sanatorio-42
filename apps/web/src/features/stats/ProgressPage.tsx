import { useId, useState } from 'react'
import type { PointerEvent } from 'react'

import type {
  CoreTrack,
  ProgressLine,
  ProgressMeasure,
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
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { useFormat } from '../../shared/i18n/useFormat'
import { ProgressCompare } from './ProgressCompare'
import { ProgressRanking } from './ProgressRanking'
import {
  MAX_LINES,
  ME_STYLE,
  POPULATIONS,
  SCOPES,
  TRACKS,
  groupSeries,
  personStyle,
} from './progressSeries'
import type { GroupKey, LineStyle, Picked, Series } from './progressSeries'

const WIDTH = 640
const HEIGHT = 280
// A la izquierda caben los rótulos del eje: «Círculo 6» o «1 786 h».
const PAD = { left: 76, right: 40, top: 12, bottom: 28 }
const MONTH = 730 / 24
/**
 * Lo que abarca el eje del tiempo: lo que pide cada pace (en meses) o «Todo»,
 * hasta el último dato. Por defecto, los dos años del pace más lento.
 */
const RANGES = ['8', '12', '15', '18', '22', '24', 'all'] as const
type Range = (typeof RANGES)[number]
const RANGE_KEY = 'sanatorio_progress_range'
/** Cada cuántos meses va una marca del eje: la más fina con la que no pasan de nueve. */
const MONTH_STEPS = [1, 2, 3, 6, 12, 24]

/** El periodo guardado; si el navegador no deja leerlo, el de siempre. */
function storedRange(): Range {
  try {
    const value = localStorage.getItem(RANGE_KEY)

    return RANGES.find((range) => range === value) ?? '24'
  } catch {
    return '24'
  }
}

function storeRange(range: Range): void {
  try {
    localStorage.setItem(RANGE_KEY, range)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): solo dura esta visita.
  }
}

/** Las marcas de meses del eje para un periodo de `months` meses. */
function monthTicks(months: number): number[] {
  const step = MONTH_STEPS.find((each) => months / each <= 8) ?? 24
  const ticks: number[] = []

  for (let month = 0; month <= months + 0.01; month += step) ticks.push(month)

  return ticks
}

type Scale = (day: number) => number
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
/** Cada cuántas horas va una marca del eje de horas. */
const HOURS_STEP = 250

/** La posición en el eje del tiempo de cada día, con el periodo que acaba en `last`. */
const scaleX =
  (last: number): Scale =>
  (day) =>
    PAD.left + (day / last) * (WIDTH - PAD.left - PAD.right)
const y = (value: number): number =>
  HEIGHT - PAD.bottom - (value / 100) * (HEIGHT - PAD.top - PAD.bottom)

/** Los puntos de una línea en SVG, saltándose los huecos (`null`). */
function pathOf(x: Scale, days: readonly number[], line: ProgressLine): string {
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

/** El último punto con valor de una línea: donde va su punto final o su login. */
function lastPoint(days: readonly number[], line: ProgressLine): [number, number] | null {
  for (let index = line.length - 1; index >= 0; index--) {
    const value = line[index]
    const day = days[index]

    if (value !== null && value !== undefined && day !== undefined) return [day, value]
  }

  return null
}

/** Dónde va el login de una línea: dónde se puso donde acaba, sin pisar a otro. */
type Tag = {
  key: string
  text: string
  x: number
  y: number
  anchor: 'start' | 'end'
  fill: string
}

/**
 * Los logins de quien te comparas, escritos en su línea: donde llega a su
 * último valor (quien terminó se queda en el 100 % hasta el final, y ahí se
 * amontonarían). Si dos se pisan, el segundo sube una fila.
 */
function tagsOf(x: Scale, days: readonly number[], series: readonly Series[]): Tag[] {
  const placed: Tag[] = []
  const width = (text: string): number => text.length * 6.5

  for (const each of series) {
    const end = lastPoint(days, each.line)

    if (each.tag === undefined || end === null) continue
    const first = each.line.findIndex((value) => value === end[1])
    const day = days[first] ?? end[0]
    const anchor = x(day) + 4 + width(each.tag) > WIDTH ? 'end' : 'start'
    const tag: Tag = {
      key: each.key,
      text: each.tag,
      x: anchor === 'start' ? x(day) + 4 : x(day) - 4,
      y: y(end[1]) - 4,
      anchor,
      fill: each.style.stroke,
    }
    const left = (one: Tag): number => (one.anchor === 'start' ? one.x : one.x - width(one.text))
    const hits = (one: Tag): boolean =>
      Math.abs(one.y - tag.y) < 12 &&
      left(one) < left(tag) + width(tag.text) &&
      left(tag) < left(one) + width(one.text)

    for (let turn = 0; turn < 8 && placed.some(hits); turn++) {
      tag.y = tag.y - 12 < PAD.top + 8 ? tag.y + 24 : tag.y - 12
    }
    placed.push(tag)
  }

  return placed
}

/** Los atributos de SVG de un estilo de línea. */
const strokeOf = (style: LineStyle) => ({
  stroke: style.stroke,
  strokeWidth: style.width,
  strokeDasharray: style.dash,
  strokeOpacity: style.opacity,
})

/** La muestra de una línea en la leyenda: el mismo color, trazo y grosor. */
function LineKey({ style }: { style: LineStyle }) {
  return (
    <svg className="progress-key" viewBox="0 0 28 8" aria-hidden="true">
      <line x1={2} x2={26} y1={4} y2={4} {...strokeOf(style)} strokeLinecap="round" />
      {style.marker && <circle cx={24} cy={4} r={2.5} fill={style.stroke} />}
    </svg>
  )
}

/** Un botón por opción que se enciende y apaga solo; varias a la vez. */
function Toggles<T extends string>(props: {
  label: string
  options: readonly T[]
  on: ReadonlySet<T>
  set: (next: Set<T>) => void
  text: (value: T) => string
}) {
  return (
    <PillGroup
      options={props.options}
      value={null}
      pressed={(option) => props.on.has(option)}
      onChange={(option) => {
        const next = new Set(props.on)

        if (next.has(option)) next.delete(option)
        else next.add(option)
        props.set(next)
      }}
      label={props.label}
      text={props.text}
    />
  )
}

/**
 * La pestaña Avance, en Datos: el avance en el common core a lo largo del
 * tiempo (#87). Tu línea, las medias que enciendas (plan × quién cuenta ×
 * alcance, cada combinación en su línea), hasta cinco personas con quien
 * compararte y lo que pide cada pace. Se mide por círculos o por horas.
 */
export function ProgressPage({ me }: { me: string }) {
  const { t } = useI18n()
  const { number } = useFormat()
  const [measure, setMeasure] = useState<ProgressMeasure>('circles')
  const [scopes, setScopes] = useState<ReadonlySet<ProgressScope>>(new Set(['campus']))
  // Por defecto, quien sigue más quien terminó: la media de la gente que está.
  const [populations, setPopulations] = useState<ReadonlySet<ProgressPopulation>>(
    new Set(['current']),
  )
  // Sin tocar, el plan de quien mira (C o Python); si no se sabe, los dos.
  const [chosenTracks, setTracks] = useState<ReadonlySet<CoreTrack> | null>(null)
  const [paces, setPaces] = useState(true)
  const [range, setRange] = useState<Range>(storedRange)
  const [others, setOthers] = useState<string[]>([])
  const { data, error, reload } = useAsync(() => api.getStatsProgress(others), [others.join(',')])
  const tracks: ReadonlySet<CoreTrack> =
    chosenTracks ??
    new Set(data?.track === undefined || data.track === null ? TRACKS : [data.track])
  const missing =
    data === undefined
      ? []
      : others.filter((login) => !data.others.some((each) => each.login === login))

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
          <PillGroup
            options={MEASURES}
            value={measure}
            onChange={setMeasure}
            label={t('stats.progress.measure')}
            text={(value) => t(`stats.progress.measure.${value}`)}
          />
          <p className="hint progress-measure-hint">
            {t(`stats.progress.measure.${measure}.hint`, { n: number(data?.axis.hours ?? 0) })}
          </p>
          <Toggles
            label={t('stats.progress.plan')}
            options={TRACKS}
            on={tracks}
            set={setTracks}
            text={(value) => t(`stats.progress.plan.${value}`)}
          />
          <Toggles
            label={t('stats.progress.population')}
            options={POPULATIONS}
            on={populations}
            set={setPopulations}
            text={(value) => t(`stats.progress.population.${value}`)}
          />
          <Toggles
            label={t('stats.progress.scope')}
            options={SCOPES}
            on={scopes}
            set={setScopes}
            text={(value) =>
              value === 'campus' && data !== undefined && data.campus !== null
                ? data.campus
                : t(`stats.progress.scope.${value}`)
            }
          />
          <PillGroup
            options={RANGES}
            value={range}
            onChange={(next) => {
              setRange(next)
              storeRange(next)
            }}
            label={t('rank.period')}
            before={<span className="progress-range-label">{t('rank.period')}</span>}
            text={(value) =>
              value === 'all' ? t('net.period.all') : t('stats.progress.months', { n: value })
            }
          />
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
            <ProgressCompare
              others={others}
              onChange={setOthers}
              missing={missing}
              tracks={tracks}
              scopes={scopes}
              me={me}
              campus={data?.campus ?? null}
            />
          </PoolOnly>
        </div>

        {data === undefined ? (
          <ErrorNote error={error} onRetry={() => void reload()} />
        ) : (
          <ProgressChart
            data={data}
            measure={measure}
            picked={{ tracks, populations, scopes }}
            paces={paces}
            range={range}
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
  picked,
  paces,
  range,
}: {
  data: StatsProgress
  measure: ProgressMeasure
  picked: Picked
  paces: boolean
  range: Range
}) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [hover, setHover] = useState<number | null>(null)
  // El eje del tiempo acaba donde acaba el periodo; con «Todo», en el último dato.
  const lastDay = range === 'all' ? (data.days.at(-1) ?? 730) : Number(range) * MONTH
  const x = scaleX(lastDay)
  // Un día de margen: el pace de 8 meses acaba en el 244 y 8 meses son 243,3 días.
  const shown = (day: number): boolean => day <= lastDay + 1
  const groups = groupSeries(data, measure, picked, {
    plan: (track) => t(`stats.progress.plan.${track}`),
    population: (population) => t(`stats.progress.population.${population}`),
    scope: (scope) =>
      scope === 'campus' && data.campus !== null ? data.campus : t(`stats.progress.scope.${scope}`),
    average: (parts) => t('stats.progress.line', parts),
    one: (parts) => t('stats.progress.lineOne', parts),
    anonymous: (parts) => t('stats.progress.lineAnon', parts),
  })
  // Más de las que caben no se pintan: se dice y se quitan opciones.
  const tooMany = groups.series.length > MAX_LINES
  const people: Series[] = data.others.map((other, index) => ({
    key: `other-${other.login}`,
    label: other.login,
    line: other.line[measure],
    hours: null,
    style: personStyle(index),
    tag: other.login,
  }))
  const every: Series[] = [
    ...(tooMany ? [] : groups.series),
    ...people,
    ...(data.me === null
      ? []
      : [
          {
            key: 'me',
            label: t('stats.progress.me'),
            line: data.me[measure],
            hours: data.axis.hours,
            style: ME_STYLE,
          },
        ]),
  ]
  // Solo lo que cae en el periodo: la línea se corta en su borde derecho.
  const count = data.days.filter(shown).length
  const days = data.days.slice(0, count)
  const series = every.map((each) => ({ ...each, line: each.line.slice(0, count) }))
  const clip = `progress-clip-${useId().replace(/:/g, '')}`
  // Quien no se sabe si sigue: del alcance más amplio encendido, en los planes encendidos.
  const widest: ProgressScope = picked.scopes.has('all') ? 'all' : 'campus'
  const unknown = TRACKS.filter((track) => picked.tracks.has(track)).reduce(
    (sum, track) => sum + data.census[widest][track].unknown,
    0,
  )
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
    const day = ((at - PAD.left) / (WIDTH - PAD.left - PAD.right)) * lastDay
    let best = 0

    days.forEach((each, index) => {
      if (Math.abs(each - day) < Math.abs((days[best] ?? 0) - day)) best = index
    })
    setHover(best)
  }

  const hoverDay = hover === null ? null : (days[hover] ?? null)
  // Los rótulos de los paces, sin pisarse: con «Todo» quedan muy juntos y se
  // salta el que caería encima del anterior (su línea sigue).
  const paceTags = new Set<number>()
  // Del más lento al más rápido: el de 24 meses, el que marca el plazo, siempre.
  let lastTag = Infinity

  for (const line of [...data.paces[measure]].reverse()) {
    const end = line.points.at(-1)

    if (end === undefined || !shown(end[0]) || lastTag - x(end[0]) < 36) continue
    paceTags.add(line.pace)
    lastTag = x(end[0])
  }
  const legend: GroupKey[] = [
    ...(data.me === null
      ? []
      : [{ key: 'me', label: t('stats.progress.me'), style: ME_STYLE, empty: false }]),
    ...people.map((each) => ({
      key: each.key,
      label: each.label,
      style: each.style,
      empty: false,
    })),
    ...(tooMany ? [] : groups.keys),
  ]

  return (
    <>
      {data.me === null && <p className="hint">{t('stats.progress.noMe')}</p>}
      {unknown > 0 && <p className="hint">{tn('stats.progress.unknown', unknown)}</p>}
      {tooMany && (
        <p className="hint progress-too-many" role="status">
          {t('stats.progress.tooMany', { n: groups.series.length, max: MAX_LINES })}
        </p>
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
          {ticks.map((tick) => (
            <g key={tick.label} className="progress-grid">
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick.at)} y2={y(tick.at)} />
              <text x={PAD.left - 6} y={y(tick.at)} textAnchor="end" dominantBaseline="middle">
                {tick.label}
              </text>
            </g>
          ))}
          <clipPath id={clip}>
            <rect
              x={PAD.left - 4}
              y={0}
              width={WIDTH - PAD.left - PAD.right + 8}
              height={HEIGHT - PAD.bottom}
            />
          </clipPath>
          {monthTicks(lastDay / MONTH).map((months) => (
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
                    clipPath={`url(#${clip})`}
                    d={line.points
                      .map(
                        ([day, value], index) =>
                          `${index === 0 ? 'M' : 'L'}${x(day).toFixed(1)},${y(value).toFixed(1)}`,
                      )
                      .join('')}
                  />
                  {end !== undefined && paceTags.has(line.pace) && (
                    <text x={x(end[0]) + 4} y={y(end[1])} dominantBaseline="middle">
                      {t('stats.progress.paceShort', { n: line.pace })}
                    </text>
                  )}
                </g>
              )
            })}
          {series.map((each) => {
            const end = lastPoint(days, each.line)

            return (
              <g key={each.key} className="progress-series" data-series={each.key}>
                <path
                  className="progress-line"
                  d={pathOf(x, days, each.line)}
                  {...strokeOf(each.style)}
                />
                {each.style.marker && end !== null && (
                  <circle
                    cx={x(end[0])}
                    cy={y(end[1])}
                    r={3}
                    fill={each.style.stroke}
                    fillOpacity={each.style.opacity}
                  />
                )}
              </g>
            )
          })}
          {tagsOf(x, days, series).map((tag) => (
            <text
              key={tag.key}
              className="progress-tag"
              x={tag.x}
              y={tag.y}
              textAnchor={tag.anchor}
              fill={tag.fill}
            >
              {tag.text}
            </text>
          ))}
          {hoverDay !== null && hover !== null && (
            <g className="progress-hover">
              <line x1={x(hoverDay)} x2={x(hoverDay)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
              {series.map((each) => {
                const value = each.line[hover]

                return value === null || value === undefined ? null : (
                  <circle
                    key={each.key}
                    className="progress-dot"
                    cx={x(hoverDay)}
                    cy={y(value)}
                    r={4}
                    fill={each.style.stroke}
                  />
                )
              })}
            </g>
          )}
        </svg>
        {hoverDay !== null && hover !== null && (
          <div
            className={`progress-tip ${x(hoverDay) > WIDTH / 2 ? 'left' : 'right'}`}
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
                <LineKey style={each.style} /> {each.label}: {valueOf(each.line[hover], each.hours)}
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="progress-legend">
        {legend.map((each) => (
          <li key={each.key} className={each.empty ? 'empty' : undefined}>
            <LineKey style={each.style} /> {each.label}
          </li>
        ))}
        {paces && (
          <li>
            <i className="progress-swatch pace" /> {t('stats.progress.paceLegend')}
          </li>
        )}
      </ul>
      <p className="hint progress-encoding">{t('stats.progress.encoding')}</p>
      {groups.individuals && !tooMany && (
        <p className="hint">{t('stats.progress.fewPeople', { n: data.minPeople })}</p>
      )}
      <details className="progress-table">
        <summary>{t('stats.progress.table')}</summary>
        <div className="progress-table-scroll">
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
              {days.map((day, index) =>
                day % 90 !== 0 ? null : (
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
        </div>
      </details>
    </>
  )
}
