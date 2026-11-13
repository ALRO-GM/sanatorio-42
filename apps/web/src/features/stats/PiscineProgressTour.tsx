import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour, typing } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: la media de la piscina, el login que se
 * escribe para compararse, su línea y la ficha de un hito.
 */
type Piscine = {
  /** «Tu piscina», marcada: sale la media. */
  cohort: boolean
  /** Letras escritas del login con quien compararse. */
  typed: number
  /** La otra persona, ya añadida: sale su línea. */
  other: boolean
  /** Lo que se aprobó el día del punto por el que pasa el ratón. */
  tip: boolean
}

const START: Piscine = { cohort: false, typed: 0, other: false, tip: false }

/** Con quién se compara en el decorado. */
const OTHER = 'lperez'

export const TOUR = defineTour<Piscine>(
  'piscineProgress',
  START,
  [
    [2400, { caption: 2, cursor: 'done' }],
    ...click<Piscine>(3800, 'cohort', { cohort: true, caption: 3 }),
    ...click<Piscine>(6200, 'login', { caption: 4 }),
    ...typing<Piscine>(7000, 'typed', OTHER.length, 120),
    ...click<Piscine>(8100, 'add', { other: true, typed: 0 }),
    [10200, { caption: 5, cursor: 'dot' }],
    [10900, { tip: true }],
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.piscine-chart',
    2: '.piscine-summary',
    3: '.progress-toggle',
    4: '.progress-compare-row, .progress-chips',
    5: '.progress-dot',
  },
)

/** Los dieciséis proyectos que cuentan y los 26 días de piscina. */
const TOTAL = 16
const DAYS = 26
/** Aprobados `[día, cuántos]` de cada línea. */
const LINES = {
  me: [
    [0, 0],
    [4, 2],
    [8, 4],
    [12, 7],
    [16, 9],
  ],
  cohort: [
    [0, 0],
    [6, 2],
    [12, 5],
    [18, 7],
    [26, 10],
  ],
  other: [
    [0, 0],
    [5, 3],
    [10, 6],
    [14, 9],
    [16, 11],
  ],
} as const

const W = 300
const H = 130

const x = (day: number): number => (day / DAYS) * W
const y = (done: number): number => H - (done / TOTAL) * H
const path = (points: readonly (readonly [number, number])[]): string =>
  points
    .map(
      ([day, done], index) =>
        `${index === 0 ? 'M' : 'L'}${x(day).toFixed(1)},${y(done).toFixed(1)}`,
    )
    .join('')

/**
 * Cómo se lee el Avance de la piscina: tu línea de proyectos aprobados, lo
 * que no suma, la media de tu piscina, compararte con otro piscinero y qué
 * aprobaste cada día.
 */
export function PiscineProgressTour() {
  const { t, tn } = useI18n()
  const hit = LINES.me[2]

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.campus')} sub={() => t('nav.avance')}>
      {(shot) => (
        <div className="tour-split lean">
          <div className="tour-card">
            <span className="tour-row">
              <strong data-tour="done">{t('piscine.done', { done: 9, total: TOTAL })}</strong>
            </span>
            <svg className="tour-chart" viewBox={`0 0 ${String(W)} ${String(H)}`}>
              {shot.cohort && (
                <path className="tour-chart-line avg tour-in" d={path(LINES.cohort)} />
              )}
              {shot.other && (
                <path className="tour-chart-line other tour-in" d={path(LINES.other)} />
              )}
              <path className="tour-chart-line me" d={path(LINES.me)} />
              <circle
                className="tour-chart-dot"
                cx={x(hit[0])}
                cy={y(hit[1])}
                r={5}
                data-tour="dot"
              />
            </svg>
            <div className="tour-row">
              <span className="tour-chip">{t('piscine.chart.me')}</span>
              {shot.cohort && (
                <span className="tour-chip tour-in">{t('piscine.chart.cohort')}</span>
              )}
              {shot.other && <span className="tour-chip tour-in">{OTHER}</span>}
            </div>
            {shot.tip && (
              <div className="tour-pop tour-in" style={{ top: '24%', left: '12%' }}>
                {t('piscine.chart.milestone', { n: hit[0] + 1, projects: 'C 01, C 02' })}
              </div>
            )}
          </div>
          <div className="tour-card">
            <span className="tour-muted">{t('piscine.chart.compareWith')}</span>
            <span className="tour-row tour-nowrap" data-tour="cohort">
              <span className={`tour-check ${shot.cohort ? 'on' : ''}`}>
                {shot.cohort && <Icon name="hecho" size={11} />}
              </span>
              <span>
                {t('piscine.chart.cohort')} · {tn('piscine.chart.people', 86)}
              </span>
            </span>
            <span className="tour-muted">{t('stats.progress.compare')}</span>
            <span className={`tour-input ${shot.typed > 0 ? 'typing' : ''}`} data-tour="login">
              {OTHER.slice(0, shot.typed)}
            </span>
            <span className="tour-row">
              <span className="tour-pill" data-tour="add">
                {t('stats.progress.compareAdd')}
              </span>
            </span>
          </div>
        </div>
      )}
    </Tour>
  )
}
