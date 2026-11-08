import type {
  DropoutDay,
  DropoutFactorKey,
  DropoutPerson,
  DropoutStatus,
} from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { dateOf, isExamDay, trendOf } from './dropout'
import type { DepartureBar, DropoutGrouping } from './dropout'

const WIDTH = 640
const HEIGHT = 260
const PAD = { left: 40, right: 40, top: 14, bottom: 34 }
const INNER_W = WIDTH - PAD.left - PAD.right
const INNER_H = HEIGHT - PAD.top - PAD.bottom

/** Una escala de 0 a `max` con marcas redondas. */
function ticksOf(max: number): number[] {
  const step = max <= 5 ? 1 : max <= 12 ? 2 : max <= 30 ? 5 : 10

  return Array.from({ length: Math.floor(max / step) + 1 }, (_, index) => index * step)
}

/** El color de cada estado, de las variables del tema. */
export const STATUS_COLOR: Record<DropoutStatus, string> = {
  gone: 'var(--danger)',
  likely: 'var(--warn)',
  doubt: 'var(--gold)',
  active: 'var(--ok)',
  never: 'var(--text-4)',
}

/**
 * Los abandonos por día (el primer día que ya no vinieron) o por semana de
 * piscina, en barras, con el acumulado en una línea y su escala a la derecha.
 */
export function DeparturesChart({
  bars,
  grouping,
}: {
  bars: readonly DepartureBar[]
  grouping: DropoutGrouping
}) {
  const { t } = useI18n()
  const top = Math.max(1, ...bars.map((bar) => bar.count))
  const total = Math.max(1, bars.at(-1)?.total ?? 0)
  const slot = INNER_W / Math.max(1, bars.length)
  const x = (index: number): number => PAD.left + index * slot + slot / 2
  const y = (value: number, max: number): number => PAD.top + INNER_H - (value / max) * INNER_H
  const label = (bar: DepartureBar): string =>
    bar.poolDay !== null
      ? String(bar.poolDay)
      : t('dropout.chart.weekShort', { n: bar.week > 4 ? '4+' : bar.week })
  const exam = (bar: DepartureBar): boolean => bar.poolDay !== null && isExamDay(bar.poolDay)
  const line = bars
    .map(
      (bar, index) =>
        `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(bar.total, total).toFixed(1)}`,
    )
    .join('')

  return (
    <div className="dropout-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('dropout.chart.departuresLabel', { total: bars.at(-1)?.total ?? 0 })}
      >
        {/* Los días de examen (5, 12, 19 y 26), resaltados de arriba abajo. */}
        {bars.map((bar, index) =>
          exam(bar) ? (
            <rect
              key={bar.key}
              className="dropout-exam-band"
              x={x(index) - slot / 2}
              y={PAD.top}
              width={slot}
              height={INNER_H}
            />
          ) : null,
        )}
        <g className="progress-grid">
          {ticksOf(top).map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick, top)} y2={y(tick, top)} />
              <text x={PAD.left - 6} y={y(tick, top) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {ticksOf(total).map((tick) => (
            <text key={tick} x={WIDTH - PAD.right + 6} y={y(tick, total) + 4} textAnchor="start">
              {tick}
            </text>
          ))}
          {bars.map((bar, index) => (
            <text
              key={bar.key}
              className={exam(bar) ? 'dropout-exam-label' : undefined}
              x={x(index)}
              y={HEIGHT - PAD.bottom + 16}
              textAnchor="middle"
            >
              {label(bar)}
            </text>
          ))}
        </g>
        {bars.map((bar, index) => (
          <rect
            key={bar.key}
            className="dropout-bar"
            x={x(index) - slot * 0.35}
            y={y(bar.count, top)}
            width={slot * 0.7}
            height={Math.max(0, PAD.top + INNER_H - y(bar.count, top))}
            rx={3}
          >
            <title>
              {t('dropout.chart.barTitle', {
                when:
                  bar.poolDay === null
                    ? label(bar)
                    : t(exam(bar) ? 'dropout.chart.examDay' : 'dropout.chart.poolDay', {
                        n: bar.poolDay,
                      }),
                count: bar.count,
                total: bar.total,
              })}
            </title>
          </rect>
        ))}
        <path className="dropout-total" d={line} />
      </svg>
      <ul className="piscine-chart-legend">
        <li>
          <span className="dropout-key bar" aria-hidden="true" />
          {t(grouping === 'day' ? 'dropout.chart.perDay' : 'dropout.chart.perWeek')}
        </li>
        <li>
          <span className="dropout-key total" aria-hidden="true" />
          {t('dropout.chart.total')}
        </li>
        {grouping === 'day' && (
          <li>
            <span className="dropout-key exam" aria-hidden="true" />
            {t('dropout.chart.exams')}
          </li>
        )}
      </ul>
    </div>
  )
}

/** Cuántos lo dejan tras cada día de la semana («vie → sáb»), en barras tumbadas. */
export function TransitionsChart({
  counts,
}: {
  counts: readonly { from: number; count: number }[]
}) {
  const { t } = useI18n()
  const top = Math.max(1, ...counts.map((each) => each.count))

  return (
    <ul className="dropout-transitions" aria-label={t('dropout.transitions.title')}>
      {counts.map(({ from, count }) => (
        <li key={from}>
          <span className="dropout-transition-name">
            {t('dropout.transitions.item', {
              from: t(`dropout.weekday.short.${from}`),
              to: t(`dropout.weekday.short.${(from % 7) + 1}`),
            })}
          </span>
          <span className="dropout-transition-track">
            <span
              className={`dropout-transition-fill ${from === 5 ? 'exam' : ''}`}
              style={{ width: `${(100 * count) / top}%` }}
            />
          </span>
          <b>{count}</b>
        </li>
      ))}
    </ul>
  )
}

/**
 * Las horas de una persona cada día de la piscina: los fines de semana con
 * fondo y los viernes (examen) marcados; los días que aún no han llegado, sin barra.
 */
export function PersonHoursChart({
  person,
  days,
}: {
  person: DropoutPerson
  days: readonly DropoutDay[]
}) {
  const { t } = useI18n()
  const top = Math.max(4, ...person.hours.map((hours) => hours ?? 0))
  const slot = INNER_W / Math.max(1, days.length)
  const x = (index: number): number => PAD.left + index * slot
  const y = (value: number): number => PAD.top + INNER_H - (value / top) * INNER_H

  return (
    <div className="dropout-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('dropout.person.chartLabel', {
          login: person.login,
          hours: person.factors.totalHours,
        })}
      >
        {days.map((day, index) =>
          day.weekday >= 6 ? (
            <rect
              key={day.day}
              className="dropout-weekend"
              x={x(index)}
              y={PAD.top}
              width={slot}
              height={INNER_H}
            />
          ) : null,
        )}
        <g className="progress-grid">
          {ticksOf(top).map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {/* Días de piscina (1 = el lunes del inicio): el primero y los de examen. */}
          {days.map((day, index) =>
            index === 0 || isExamDay(day.index + 1) ? (
              <text
                key={day.day}
                className={index === 0 ? undefined : 'dropout-exam-label'}
                x={x(index) + slot / 2}
                y={HEIGHT - PAD.bottom + 16}
                textAnchor="middle"
              >
                {day.index + 1}
              </text>
            ) : null,
          )}
        </g>
        {days.map((day, index) => {
          const hours = person.hours[index]

          if (hours === null || hours === undefined) return null

          return (
            <rect
              key={day.day}
              className={`dropout-day ${day.weekday === 5 ? 'exam' : ''} ${hours === 0 ? 'empty' : ''}`}
              x={x(index) + slot * 0.15}
              y={hours === 0 ? y(0) - 2 : y(hours)}
              width={slot * 0.7}
              height={hours === 0 ? 2 : PAD.top + INNER_H - y(hours)}
              rx={2}
            >
              <title>
                {t('dropout.person.dayTitle', {
                  day: t(`dropout.weekday.short.${day.weekday}`),
                  date: dateOf(day.day),
                  hours: Math.round(hours * 10) / 10,
                })}
              </title>
            </rect>
          )
        })}
      </svg>
      <ul className="piscine-chart-legend">
        <li>
          <span className="dropout-key day" aria-hidden="true" />
          {t('dropout.person.hours')}
        </li>
        <li>
          <span className="dropout-key exam" aria-hidden="true" />
          {t('dropout.person.friday')}
        </li>
        <li>
          <span className="dropout-key weekend" aria-hidden="true" />
          {t('dropout.person.weekend')}
        </li>
      </ul>
    </div>
  )
}

/**
 * Dos factores frente a frente: un punto por persona, del color de su estado,
 * y la recta que mejor pasa por ellos.
 */
export function ScatterChart({
  people,
  x: xKey,
  y: yKey,
  r,
}: {
  people: readonly DropoutPerson[]
  x: DropoutFactorKey
  y: DropoutFactorKey
  /** La correlación entre los dos (−100…100). */
  r: number
}) {
  const { t } = useI18n()
  const points = people.map((person) => ({
    person,
    x: person.factors[xKey],
    y: person.factors[yKey],
  }))
  const maxX = Math.max(1, ...points.map((point) => point.x))
  const maxY = Math.max(1, ...points.map((point) => point.y))
  const sx = (value: number): number => PAD.left + (value / maxX) * INNER_W
  const sy = (value: number): number => PAD.top + INNER_H - (value / maxY) * INNER_H
  const trend = trendOf(points)
  // Un poco de separación para los que caen en el mismo sitio (0 o 1).
  const jitter = (login: string): number => {
    let sum = 0

    for (let index = 0; index < login.length; index++) sum += login.charCodeAt(index)

    return (sum % 7) - 3
  }

  return (
    <div className="dropout-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('dropout.scatter.label', {
          x: t(`dropout.factor.${xKey}`),
          y: t(`dropout.factor.${yKey}`),
          r,
        })}
      >
        <g className="progress-grid">
          {[0, 0.5, 1].map((part) => (
            <g key={part}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={sy(part * maxY)}
                y2={sy(part * maxY)}
              />
              <text x={PAD.left - 6} y={sy(part * maxY) + 4} textAnchor="end">
                {Math.round(part * maxY)}
              </text>
              <text x={sx(part * maxX)} y={HEIGHT - PAD.bottom + 16} textAnchor="middle">
                {Math.round(part * maxX)}
              </text>
            </g>
          ))}
        </g>
        <text
          className="progress-axis"
          x={(PAD.left + WIDTH - PAD.right) / 2}
          y={HEIGHT - 2}
          textAnchor="middle"
        >
          {t(`dropout.factor.${xKey}`)}
        </text>
        {trend !== null && (
          <line
            className="dropout-trend"
            x1={sx(0)}
            y1={sy(Math.min(maxY, Math.max(0, trend.intercept)))}
            x2={sx(maxX)}
            y2={sy(Math.min(maxY, Math.max(0, trend.intercept + trend.slope * maxX)))}
          />
        )}
        {points.map((point) => (
          <circle
            key={point.person.login}
            className="dropout-point"
            cx={sx(point.x) + (xKey === 'gone' ? jitter(point.person.login) * 3 : 0)}
            cy={sy(point.y) + (yKey === 'gone' ? jitter(point.person.login) * 3 : 0)}
            r={4.5}
            fill={STATUS_COLOR[point.person.status]}
          >
            <title>
              {t('dropout.scatter.point', {
                login: point.person.login,
                x: point.x,
                y: point.y,
              })}
            </title>
          </circle>
        ))}
      </svg>
      <p className="hint dropout-scatter-y">
        {t('dropout.scatter.y', { y: t(`dropout.factor.${yKey}`) })}
      </p>
    </div>
  )
}
