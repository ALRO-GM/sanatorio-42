import type {
  PiscineExamDay,
  PiscineProgress,
  PiscineTrace,
  ProgressLine,
} from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PERSON_COLORS } from './progressSeries'

const WIDTH = 640
const HEIGHT = 320
// A la izquierda caben los nombres del eje: «Shell 01», «C 13».
const PAD = { left: 62, right: 16, top: 12, bottom: 34 }
/** A la derecha, con las notas de los exámenes, cabe su eje: «100». */
const EXAM_RIGHT = 34
/** Las marcas del eje de notas, sobre 100. */
const MARK_TICKS = [0, 50, 100]
/** Cada cuántos días va una marca del eje: una por semana. */
const WEEK = 7
/**
 * Hasta dónde se dibuja (pedido por Alberto el 2026-11-07): cuatro semanas
 * que empiezan en lunes, y la última acaba el viernes del examen final (el
 * día 25 contando desde 0).
 */
const LAST_DAY = 3 * WEEK + 4
/** Los viernes de examen: el 4.º día de cada semana contando desde 0. */
const FRIDAYS = [4, 11, 18, 25]

/**
 * Qué se ve: la media de tu piscina y, de los exámenes de los viernes, la nota
 * media y la mediana con la más baja y la más alta (pedido por Alberto el
 * 2026-11-20).
 */
export type PiscineShown = { cohort: boolean; examMean: boolean; examRange: boolean }

/** Una línea de más (la media de los mejores, quien cae entre dos percentiles). */
export type Line = {
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
  /** Líneas de más, debajo de las tuyas (la vista sin límites del dueño). */
  extra?: readonly Line[]
}) {
  const { t, tn } = useI18n()
  const { data } = props
  const last = Math.min(data.days.at(-1) ?? LAST_DAY, LAST_DAY)
  const total = data.steps.length
  // Los exámenes con cifras que caen en lo dibujado (con poca gente no las hay).
  const exams = data.exams.filter((exam) => exam.median !== null && exam.day <= last)
  const showExams = (props.shown.examMean || props.shown.examRange) && exams.length > 0
  const right = showExams ? EXAM_RIGHT : PAD.right
  const x = (day: number): number => PAD.left + (day / last) * (WIDTH - PAD.left - right)
  const y = (value: number): number =>
    HEIGHT - PAD.bottom - (value / Math.max(1, total)) * (HEIGHT - PAD.top - PAD.bottom)
  // Las notas, sobre 100, en la misma altura que los proyectos: su eje va a la derecha.
  const yMark = (mark: number): number =>
    HEIGHT - PAD.bottom - (Math.min(mark, 100) / 100) * (HEIGHT - PAD.top - PAD.bottom)
  const examTitle = (exam: PiscineExamDay): string =>
    `${t('piscine.chart.examTip', {
      name: exam.name,
      mean: exam.mean ?? 0,
      median: exam.median ?? 0,
      min: exam.min ?? 0,
      max: exam.max ?? 0,
    })} · ${tn('piscine.chart.people', exam.people)}`
  const pathOf = (line: ProgressLine): string => {
    let path = ''
    let open = false

    line.forEach((value, index) => {
      const day = data.days[index]

      if (value === null || day === undefined || day > last) {
        open = false
        return
      }
      path += `${open ? 'L' : 'M'}${x(day).toFixed(1)},${y(value).toFixed(1)}`
      open = true
    })

    return path
  }
  const shells = data.steps.filter((step) => step.group === 'shell').length
  const named = (traces: readonly (PiscineTrace & { login: string })[], stroke: string) =>
    traces.map((each, index): Line => ({
      key: `${stroke}-${index}`,
      line: each.line,
      stroke,
      width: 1,
      opacity: 0.45,
      label: each.login,
    }))
  const lines: Line[] = [
    ...(props.extra ?? []),
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
          width={WIDTH - PAD.left - right}
          height={y(0) - y(shells)}
        />
        <rect
          className="piscine-band c"
          x={PAD.left}
          y={y(total)}
          width={WIDTH - PAD.left - right}
          height={y(shells) - y(total)}
        />
        <g className="progress-grid">
          {data.steps.map((step, index) => (
            <g key={step.short}>
              <line x1={PAD.left} x2={WIDTH - right} y1={y(index + 1)} y2={y(index + 1)} />
              <text x={PAD.left - 6} y={y(index + 1) + 4} textAnchor="end">
                {step.short}
              </text>
            </g>
          ))}
        </g>
        {/* Las semanas: una raya al empezar cada una y su nombre en medio. */}
        <g className="piscine-weeks">
          {[0, 1, 2, 3].map((week) => {
            const from = week * WEEK
            const to = Math.min(from + WEEK - 1, last)

            return (
              <g key={week}>
                {week > 0 && (
                  <line x1={x(from)} x2={x(from)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
                )}
                <text x={(x(from) + x(to)) / 2} y={HEIGHT - PAD.bottom + 16} textAnchor="middle">
                  {t('piscine.chart.week', { n: week + 1 })}
                </text>
              </g>
            )
          })}
        </g>
        {/* Los viernes de examen, y el último, el examen final, más marcado. */}
        <g className="piscine-fridays">
          {FRIDAYS.filter((day) => day <= last).map((day) => {
            const final = day === LAST_DAY

            return (
              <g key={day} className={final ? 'final' : undefined}>
                <line x1={x(day)} x2={x(day)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
                <circle cx={x(day)} cy={HEIGHT - PAD.bottom} r={final ? 5 : 4}>
                  <title>
                    {t(final ? 'piscine.chart.finalExam' : 'piscine.chart.friday', {
                      n: day + 1,
                    })}
                  </title>
                </circle>
              </g>
            )
          })}
        </g>
        <text
          className="progress-axis"
          x={(PAD.left + WIDTH - right) / 2}
          y={HEIGHT - 2}
          textAnchor="middle"
        >
          {t('piscine.chart.days')}
        </text>
        {/* Las notas de los exámenes, con su eje a la derecha (0 a 100). */}
        {showExams && (
          <g className="piscine-exam-axis">
            <text className="title" x={WIDTH - right + 6} y={PAD.top - 2}>
              {t('piscine.chart.markAxis')}
            </text>
            {MARK_TICKS.map((mark) => (
              <text key={mark} x={WIDTH - right + 6} y={yMark(mark) + 4}>
                {mark}
              </text>
            ))}
          </g>
        )}
        {showExams && props.shown.examRange && (
          <g className="piscine-exam-range">
            {exams.map((exam) => (
              <g key={exam.day}>
                <title>{examTitle(exam)}</title>
                <line
                  x1={x(exam.day)}
                  x2={x(exam.day)}
                  y1={yMark(exam.min ?? 0)}
                  y2={yMark(exam.max ?? 0)}
                />
                {[exam.min ?? 0, exam.max ?? 0].map((mark, index) => (
                  <line
                    key={index}
                    className="cap"
                    x1={x(exam.day) - 5}
                    x2={x(exam.day) + 5}
                    y1={yMark(mark)}
                    y2={yMark(mark)}
                  />
                ))}
                <rect
                  className="median"
                  x={x(exam.day) - 8}
                  y={yMark(exam.median ?? 0) - 2}
                  width={16}
                  height={4}
                  rx={1}
                />
              </g>
            ))}
          </g>
        )}
        {showExams && props.shown.examMean && (
          <g className="piscine-exam-mean">
            <path
              d={exams
                .map(
                  (exam, index) =>
                    `${index === 0 ? 'M' : 'L'}${x(exam.day).toFixed(1)},${yMark(exam.mean ?? 0).toFixed(1)}`,
                )
                .join('')}
            />
            {exams.map((exam) => (
              <circle key={exam.day} cx={x(exam.day)} cy={yMark(exam.mean ?? 0)} r={4}>
                <title>{examTitle(exam)}</title>
              </circle>
            ))}
          </g>
        )}
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
        {showExams && props.shown.examMean && (
          <li>
            <svg className="progress-key piscine-exam-mean" viewBox="0 0 24 8" aria-hidden="true">
              <path d="M0,4L24,4" />
              <circle cx="12" cy="4" r="3" />
            </svg>
            {t('piscine.chart.examMean')}
          </li>
        )}
        {showExams && props.shown.examRange && (
          <li>
            <svg className="progress-key piscine-exam-range" viewBox="0 0 24 12" aria-hidden="true">
              <line x1="12" x2="12" y1="1" y2="11" />
              <rect className="median" x="6" y="4.5" width="12" height="3" rx="1" />
            </svg>
            {t('piscine.chart.examRange')}
          </li>
        )}
      </ul>
    </div>
  )
}
