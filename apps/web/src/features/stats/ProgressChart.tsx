import { useId, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import type { ProgressLine, ProgressMeasure, StatsProgress } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Icon } from '../../shared/ui/Icon'
import { MAX_LINES, ME_STYLE, TRACKS, areasOf, groupSeries, personStyle } from './progressSeries'
import type { GroupKey, LineStyle, Picked, Series } from './progressSeries'
import { finishedStretch, nextStop, stepped, stopsOf, tracePoints } from './progressTrace'
import type { Stop } from './progressTrace'

const WIDTH = 640
const HEIGHT = 280
// A la izquierda caben los rótulos del eje: «Círculo 6» o «1 786 h».
const PAD = { left: 76, right: 40, top: 12, bottom: 28 }
/** Los días de un mes: dos años son 730 días. */
export const MONTH = 730 / 24
/**
 * Lo que abarca el eje del tiempo, en días desde el inicio de cada cual: del
 * día `first` al `last`. `last` `null`: hasta el último dato («Todo»).
 */
export type Span = { first: number; last: number | null }
/** Cada cuántos meses va una marca del eje: la más fina con la que no pasan de nueve. */
const MONTH_STEPS = [1, 2, 3, 6, 12, 24]
/** A cuánto (en unidades del dibujo) del puntero se engancha un hito. */
const MILESTONE_REACH = 9

/** Las marcas de meses del eje para el tramo del mes `from` al `to`: de `from` en adelante. */
function monthTicks(from: number, to: number): number[] {
  const step = MONTH_STEPS.find((each) => (to - from) / each <= 8) ?? 24
  const ticks: number[] = []

  for (
    let month = Math.max(0, Math.ceil(from / step - 0.01)) * step;
    month <= to + 0.01;
    month += step
  ) {
    ticks.push(month)
  }

  return ticks
}

type Scale = (day: number) => number
/** Cada cuántas horas va una marca del eje de horas. */
const HOURS_STEP = 250

/** La posición en el eje del tiempo de cada día, con el periodo del día `first` al `last`. */
const scaleX =
  (first: number, last: number): Scale =>
  (day) =>
    PAD.left + ((day - first) / Math.max(1, last - first)) * (WIDTH - PAD.left - PAD.right)
const y = (value: number): number =>
  HEIGHT - PAD.bottom - (value / 100) * (HEIGHT - PAD.top - PAD.bottom)

/** Un trazo de SVG por esos puntos `[día, %]`. */
const pathThrough = (x: Scale, points: readonly [number, number][]): string =>
  points
    .map(
      ([day, value], index) =>
        `${index === 0 ? 'M' : 'L'}${x(day).toFixed(1)},${y(value).toFixed(1)}`,
    )
    .join('')

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
 * amontonarían), si cae en el periodo. Si dos se pisan, el segundo sube una fila.
 */
function tagsOf(
  x: Scale,
  days: readonly number[],
  series: readonly Series[],
  shown: (day: number) => boolean,
): Tag[] {
  const placed: Tag[] = []
  const width = (text: string): number => text.length * 6.5

  for (const each of series) {
    const end = lastPoint(days, each.line)

    if (each.tag === undefined || end === null) continue
    const reached = each.line.findIndex((value) => value === end[1])
    const day = Math.max(days[reached] ?? end[0], days.find(shown) ?? 0)

    if (!shown(end[0])) continue
    const anchor = x(day) + 4 + width(each.tag) > WIDTH ? 'end' : 'start'
    const tag: Tag = {
      key: each.key,
      text: each.tag,
      x: anchor === 'start' ? x(day) + 4 : x(day) - 4,
      // Por encima del trofeo de quien terminó, que va en la línea.
      y: y(end[1]) - (each.trace?.finished === null || each.trace === undefined ? 4 : 12),
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

/** Las marcas del eje vertical: dónde (en %) y qué dicen. */
function axisTicks(
  data: StatsProgress,
  measure: ProgressMeasure,
  t: ReturnType<typeof useI18n>['t'],
  number: (value: number) => string,
): { at: number; label: string }[] {
  if (measure === 'circles') {
    // Al terminar cada círculo: siete que pesan 1/7 cada uno, en cualquier línea
    // (la API da las marcas fijas y cada línea cae en ellas al completar un círculo).
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

/**
 * La gráfica del Avance: las medias encendidas, tu línea y la de con quien te
 * comparas, los paces, y de cada persona sus hitos (un punto por cada día en
 * que aprobó algo) y, si terminó, el tramo del 100 % resaltado y un trofeo.
 *
 * La ficha sale al pasar el ratón (por días o, cerca de un hito, con sus
 * proyectos) y con el teclado: la gráfica coge el foco y las flechas van de un
 * día o hito al siguiente.
 */
export function ProgressChart({
  data,
  measure,
  picked,
  paces,
  span,
  mine = true,
}: {
  data: StatsProgress
  measure: ProgressMeasure
  picked: Picked
  paces: boolean
  span: Span
  /** Si va tu línea (un enlace puede pedir que no). */
  mine?: boolean
}) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [hover, setHover] = useState<Stop | null>(null)
  // El eje del tiempo va del principio al final del periodo; con «Todo», hasta el último dato.
  const firstDay = span.first
  const lastDay = Math.max(firstDay + 1, span.last ?? data.days.at(-1) ?? 730)
  const x = scaleX(firstDay, lastDay)
  // Un día de margen: el pace de 8 meses acaba en el 244 y 8 meses son 243,3 días.
  const shown = (day: number): boolean => day >= firstDay - 1 && day <= lastDay + 1
  const groups = groupSeries(data, measure, picked, {
    plan: (track) => t(`stats.progress.plan.${track}`),
    population: (population) => t(`stats.progress.population.${population}`),
    scope: (area) =>
      area.id === null
        ? t('stats.progress.scope.all')
        : (area.name ?? t('stats.progress.scope.campus')),
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
    hours: other.hours,
    style: personStyle(index),
    tag: other.login,
    trace: other,
  }))
  const every: Series[] = [
    ...(tooMany ? [] : groups.series),
    ...people,
    ...(data.me === null || !mine
      ? []
      : [
          {
            key: 'me',
            label: t('stats.progress.me'),
            line: data.me.line[measure],
            hours: data.axis.hours,
            style: ME_STYLE,
            trace: data.me,
          },
        ]),
  ]
  // Solo lo que cae en el periodo, más el punto de antes de su borde izquierdo
  // para que la línea entre por él (el `clipPath` corta lo que sobra). Por la
  // derecha, la línea se corta en el borde.
  const end = data.days.filter((day) => day <= lastDay + 1).length
  const start = Math.max(0, data.days.findIndex((day) => day >= firstDay - 1) - 1)
  const days = data.days.slice(start, end)
  const series = every.map((each) => ({ ...each, line: each.line.slice(start, end) }))
  const traced = series.flatMap((each) =>
    each.trace === undefined ? [] : [{ key: each.key, trace: each.trace, series: each }],
  )
  const stops = stopsOf(days, traced, firstDay - 1, lastDay + 1)
  const id = useId().replace(/:/g, '')
  const clip = `progress-clip-${id}`
  // Quien no se sabe si sigue: de todos juntos si van; si no, de cada campus
  // encendido; en los planes encendidos.
  const counted = picked.together ? [data.all] : areasOf(data, picked)
  const unknown = TRACKS.filter((track) => picked.tracks.has(track)).reduce(
    (sum, track) => sum + counted.reduce((each, area) => each + area.census[track].unknown, 0),
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
    const height = ((event.clientY - box.top) / box.height) * HEIGHT
    // Cerca de un hito, el hito; si no, el día más cercano.
    const near: { stop: Stop | null; distance: number } = { stop: null, distance: MILESTONE_REACH }

    for (const { key, trace } of traced) {
      trace.milestones.forEach((milestone, index) => {
        if (!shown(milestone.day)) return
        const distance = Math.hypot(x(milestone.day) - at, y(milestone.value[measure]) - height)

        if (distance < near.distance) {
          near.distance = distance
          near.stop = { kind: 'milestone', key, at: index, day: milestone.day }
        }
      })
    }
    if (near.stop !== null) {
      setHover(near.stop)
      return
    }
    const day = firstDay + ((at - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (lastDay - firstDay)
    // El día del periodo más cercano (el de antes del borde izquierdo no cuenta).
    const closest = stops.reduce<Stop | null>(
      (best, stop) =>
        stop.kind === 'day' &&
        (best === null || Math.abs(stop.day - day) < Math.abs(best.day - day))
          ? stop
          : best,
      null,
    )

    if (closest !== null) setHover(closest)
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === 'Escape') {
      setHover(null)
      return
    }
    const next = nextStop(stops, hover, event.key)

    if (next === null) return
    event.preventDefault()
    setHover(next)
  }

  const hoverDay = hover?.day ?? null
  const hoverIndex = hover?.kind === 'day' ? hover.index : null
  const hovered =
    hover?.kind === 'milestone'
      ? (() => {
          const owner = traced.find((each) => each.key === hover.key)
          const milestone = owner?.trace.milestones[hover.at]

          return owner === undefined || milestone === undefined ? null : { owner, milestone }
        })()
      : null
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
    ...(data.me === null || !mine
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
  const anyMilestone = traced.some((each) => each.trace.milestones.length > 0)
  const anyFinished = traced.some(
    (each) => each.trace.finished !== null && shown(each.trace.finished),
  )

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
          role="group"
          aria-label={t('stats.progress.title')}
          aria-describedby={`${id}-keys`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => {
            setHover(null)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setHover(null)
          }}
        >
          <desc id={`${id}-keys`}>{t('stats.progress.chartKeys')}</desc>
          <g aria-hidden="true">
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
            {monthTicks(firstDay / MONTH, lastDay / MONTH).map((months) => (
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
                    <path clipPath={`url(#${clip})`} d={pathThrough(x, line.points)} />
                    {end !== undefined && paceTags.has(line.pace) && (
                      // Arriba del todo, debajo de la raya: ahí va el tramo de quien terminó.
                      <text
                        x={x(end[0]) + 4}
                        y={end[1] >= 100 ? y(end[1]) + 6 : y(end[1])}
                        dominantBaseline={end[1] >= 100 ? 'hanging' : 'middle'}
                      >
                        {t('stats.progress.paceShort', { n: line.pace })}
                      </text>
                    )}
                  </g>
                )
              })}
            {series.map((each) => {
              const end = lastPoint(days, each.line)
              const points =
                each.trace === undefined
                  ? null
                  : tracePoints(days, each.line, each.trace, measure, lastDay)
              const stretch =
                points === null || each.trace === undefined
                  ? null
                  : finishedStretch(points, each.trace.finished)

              return (
                <g
                  key={each.key}
                  className="progress-series"
                  data-series={each.key}
                  clipPath={`url(#${clip})`}
                  style={{ color: each.style.stroke }}
                >
                  <path
                    className="progress-line"
                    d={
                      points === null ? pathOf(x, days, each.line) : pathThrough(x, stepped(points))
                    }
                    {...strokeOf(each.style)}
                  />
                  {stretch !== null && (
                    <path
                      className="progress-finished"
                      d={pathThrough(x, stretch)}
                      stroke={each.style.stroke}
                      strokeWidth={each.style.width + 1.5}
                    />
                  )}
                  {each.trace?.milestones.map((milestone, index) =>
                    shown(milestone.day) ? (
                      <circle
                        key={milestone.day}
                        className={`progress-milestone ${
                          hovered?.owner.key === each.key &&
                          hover?.kind === 'milestone' &&
                          hover.at === index
                            ? 'on'
                            : ''
                        }`.trim()}
                        cx={x(milestone.day)}
                        cy={y(milestone.value[measure])}
                        r={2.6}
                        stroke={each.style.stroke}
                      />
                    ) : null,
                  )}
                  {each.style.marker && end !== null && stretch === null && shown(end[0]) && (
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
            {tagsOf(x, days, series, shown).map((tag) => (
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
          </g>
          {/* El trofeo de quien terminó, el día exacto, con su nombre para quien no lo ve. */}
          {traced.map(({ key, trace, series: each }) =>
            trace.finished === null || !shown(trace.finished) ? null : (
              <g
                key={key}
                className="progress-trophy"
                data-series={key}
                transform={`translate(${x(trace.finished).toFixed(1)},${y(100).toFixed(1)})`}
                role="img"
                aria-label={t('stats.progress.finishedAt', {
                  line: each.label,
                  n: trace.finished,
                  m: Math.round((trace.finished / MONTH) * 10) / 10,
                })}
                style={{ color: each.style.stroke }}
              >
                <circle r={10} />
                <g transform="translate(-7.5,-7.5)">
                  <Icon name="trofeo" size={15} />
                </g>
              </g>
            ),
          )}
          {hoverDay !== null && (
            <g className="progress-hover" aria-hidden="true">
              <line x1={x(hoverDay)} x2={x(hoverDay)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
              {hovered !== null ? (
                <circle
                  className="progress-dot"
                  cx={x(hoverDay)}
                  cy={y(hovered.milestone.value[measure])}
                  r={4.5}
                  fill={hovered.owner.series.style.stroke}
                />
              ) : (
                series.map((each) => {
                  const value = hoverIndex === null ? null : each.line[hoverIndex]

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
                })
              )}
            </g>
          )}
        </svg>
        {hoverDay !== null && (
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
            {hovered !== null ? (
              <>
                <span>
                  <LineKey style={hovered.owner.series.style} /> {hovered.owner.series.label}:{' '}
                  {valueOf(hovered.milestone.value[measure], hovered.owner.series.hours)}
                </span>
                <span className="progress-tip-projects">
                  {tn('stats.progress.delivered', hovered.milestone.projects.length, {
                    projects: hovered.milestone.projects.join(', '),
                  })}
                </span>
                {hovered.owner.trace.finished === hovered.milestone.day && (
                  <span className="progress-tip-done">
                    <Icon name="trofeo" size={14} /> {t('stats.progress.finished')}
                  </span>
                )}
              </>
            ) : (
              series.map((each) => (
                <span key={each.key}>
                  <LineKey style={each.style} /> {each.label}:{' '}
                  {valueOf(hoverIndex === null ? null : each.line[hoverIndex], each.hours)}
                </span>
              ))
            )}
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
        {anyMilestone && (
          <li>
            <i className="progress-swatch milestone" /> {t('stats.progress.milestones')}
          </li>
        )}
        {anyFinished && (
          <li>
            <i className="progress-swatch trophy">
              <Icon name="trofeo" size={11} />
            </i>{' '}
            {t('stats.progress.finished')}
          </li>
        )}
      </ul>
      <p className="hint progress-encoding">
        {t(
          areasOf(data, picked).filter((area) => area.id !== null).length > 1
            ? 'stats.progress.encodingCampuses'
            : 'stats.progress.encoding',
        )}
      </p>
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
                day % 90 !== 0 || !shown(day) ? null : (
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
