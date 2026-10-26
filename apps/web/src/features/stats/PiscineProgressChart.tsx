import type { PiscineProgress, PiscineTrace, ProgressLine } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PERSON_COLORS } from './progressSeries'

const WIDTH = 640
const HEIGHT = 320
// A la izquierda caben los nombres del eje: «Shell 01», «C 13».
const PAD = { left: 62, right: 16, top: 12, bottom: 34 }
/** Cada cuántos días va una marca del eje: una por semana. */
const WEEK = 7

/** Qué medias se ven. */
export type PiscineShown = { cohort: boolean; past: boolean }

type Line = {
  key: string
  line: ProgressLine
  stroke: string
  width: number
  dash?: string
  opacity?: number
  label: string
}

/**
 * La gráfica del Avance de un piscinero: los días de piscina a lo largo y los
 * dieciséis proyectos que cuentan a lo alto (bandas azul claro las de shell y
 * azul oscuro las de C, los colores del grafo de la piscina). Tu línea, la
 * media de tu piscina, la de las anteriores de tu campus y con quien te
 * comparas. Donde una media tiene poca gente van las líneas de cada cual, más
 * finas.
 */
export function PiscineProgressChart(props: {
  data: PiscineProgress
  shown: PiscineShown
  others: readonly string[]
}) {
  const { t } = useI18n()
  const { data } = props
  const last = data.days.at(-1) ?? 30
  const total = data.steps.length
  const x = (day: number): number => PAD.left + (day / last) * (WIDTH - PAD.left - PAD.right)
  const y = (value: number): number =>
    HEIGHT - PAD.bottom - (value / Math.max(1, total)) * (HEIGHT - PAD.top - PAD.bottom)
  const pathOf = (line: ProgressLine): string => {
    let path = ''
    let open = false

    line.forEach((value, index) => {
      const day = data.days[index]

      if (value === null || day === undefined) {
        open = false
        return
      }
      path += `${open ? 'L' : 'M'}${x(day).toFixed(1)},${y(value).toFixed(1)}`
      open = true
    })

    return path
  }
  const shells = data.steps.filter((step) => step.group === 'shell').length
  const named = (traces: readonly (PiscineTrace & { login: string | null })[], stroke: string) =>
    traces.map((each, index): Line => ({
      key: `${stroke}-${index}`,
      line: each.line,
      stroke,
      width: 1,
      opacity: 0.45,
      label: each.login ?? t('piscine.chart.someone'),
    }))
  const lines: Line[] = [
    ...(props.shown.past
      ? [
          {
            key: 'past',
            line: data.past.line,
            stroke: 'var(--text-3)',
            width: 2.25,
            dash: '6 4',
            label: t('piscine.chart.past'),
          },
          ...named(data.past.individuals, 'var(--text-3)'),
        ]
      : []),
    ...(props.shown.cohort
      ? [
          {
            key: 'cohort',
            line: data.cohort.line,
            stroke: 'var(--piscine-c)',
            width: 2.5,
            label: t('piscine.chart.cohort'),
          },
          ...named(data.cohort.individuals, 'var(--piscine-c)'),
        ]
      : []),
    ...data.others.map((other) => ({
      key: `other-${other.login}`,
      line: other.line,
      stroke:
        PERSON_COLORS[props.others.indexOf(other.login) % PERSON_COLORS.length] ?? 'var(--gold)',
      width: 2.25,
      label: other.login,
    })),
    ...(data.me === null
      ? []
      : [
          {
            key: 'me',
            line: data.me.line,
            stroke: 'var(--accent)',
            width: 3,
            label: t('piscine.chart.me'),
          },
        ]),
  ]

  return (
    <div className="progress-chart piscine-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('piscine.chart.label', { done: data.me?.done ?? 0, total })}
      >
        {/* Las bandas de los grupos: shell abajo, C encima, con sus colores. */}
        <rect
          className="piscine-band shell"
          x={PAD.left}
          y={y(shells)}
          width={WIDTH - PAD.left - PAD.right}
          height={y(0) - y(shells)}
        />
        <rect
          className="piscine-band c"
          x={PAD.left}
          y={y(total)}
          width={WIDTH - PAD.left - PAD.right}
          height={y(shells) - y(total)}
        />
        <g className="progress-grid">
          {data.steps.map((step, index) => (
            <g key={step.short}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(index + 1)} y2={y(index + 1)} />
              <text x={PAD.left - 6} y={y(index + 1) + 4} textAnchor="end">
                {step.short}
              </text>
            </g>
          ))}
          {data.days
            .filter((day) => day % WEEK === 0)
            .map((day) => (
              // El día 1 es el primero: las marcas caen en el primer día de cada semana.
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
          {t('piscine.chart.days')}
        </text>
        {lines.map((each) => (
          <path
            key={each.key}
            className="progress-line"
            d={pathOf(each.line)}
            stroke={each.stroke}
            strokeWidth={each.width}
            strokeDasharray={each.dash}
            opacity={each.opacity ?? 1}
          >
            <title>{each.label}</title>
          </path>
        ))}
        {/* Tus hitos: un punto cada día que aprobaste algo, con qué. */}
        {data.me?.milestones
          .filter((milestone) => milestone.day <= last)
          .map((milestone) => (
            <circle
              key={milestone.day}
              className="progress-dot"
              cx={x(milestone.day)}
              cy={y(milestone.value)}
              r={4.5}
              fill="var(--accent)"
            >
              <title>
                {t('piscine.chart.milestone', {
                  n: milestone.day + 1,
                  projects: milestone.projects.join(', '),
                })}
              </title>
            </circle>
          ))}
      </svg>
      <ul className="piscine-chart-legend">
        {lines
          .filter((each) => each.width > 1)
          .map((each) => (
            <li key={each.key}>
              <svg className="progress-key" viewBox="0 0 24 8" aria-hidden="true">
                <line
                  x1="0"
                  x2="24"
                  y1="4"
                  y2="4"
                  stroke={each.stroke}
                  strokeWidth={each.width}
                  strokeDasharray={each.dash}
                />
              </svg>
              {each.label}
            </li>
          ))}
      </ul>
    </div>
  )
}
