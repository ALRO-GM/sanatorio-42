import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

type Progress = {
  /** París añadido: su media sale con su propia línea. */
  paris: boolean
  /** El eje acaba en el mes 12 en vez del 24. */
  short: boolean
  /** Por horas en vez de por círculos. */
  hours: boolean
  /** La ficha del hito, abierta. */
  milestone: boolean
}

const START: Progress = { paris: false, short: false, hours: false, milestone: false }

export const TOUR = defineTour<Progress>('progress', START, [
  [1800, { caption: 2 }],
  ...click<Progress>(3400, 'paris', { paris: true, caption: 3 }),
  ...click<Progress>(6200, 'period', { short: true, caption: 4 }),
  ...cut<Progress>(8800, { scene: 1, caption: 5, cursor: 'rest' }),
  ...click<Progress>(10200, 'hours', { hours: true }),
  ...click<Progress>(12600, 'milestone', { milestone: true, caption: 6 }),
])

/** Puntos `[mes, %]` de cada línea, con 24 meses de eje. */
const LINES = {
  me: [
    [0, 0],
    [3, 16],
    [7, 30],
    [11, 47],
    [14, 55],
  ],
  home: [
    [0, 0],
    [6, 20],
    [12, 38],
    [18, 55],
    [24, 70],
  ],
  paris: [
    [0, 0],
    [6, 16],
    [12, 31],
    [18, 46],
    [24, 61],
  ],
} as const

const W = 300
const H = 130

/**
 * Cómo se lee Avance: tu línea frente a la media de tu campus, otros campus
 * con su propia línea, el periodo del eje y, con los hitos, qué aprobaste.
 */
export function ProgressTour() {
  const { t, tn } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.datos')} sub={() => t('nav.avance')}>
      {(shot) => {
        const months = shot.short ? 12 : 24
        // Por horas la curva es algo más lenta al principio: se ve que cambia.
        const ease = (value: number): number => (shot.hours ? value ** 1.15 / 100 ** 0.15 : value)
        // Lo que pasa del borde derecho lo recorta el `clipPath`.
        const path = (points: readonly (readonly [number, number])[]): string =>
          points
            .map(
              ([month, value], index) =>
                `${index === 0 ? 'M' : 'L'}${((month / months) * W).toFixed(1)},${(H - (ease(value) / 100) * H).toFixed(1)}`,
            )
            .join('')
        const hit = LINES.me[3]

        return (
          <div className="tour-split tour-progress-scene">
            <div className="tour-card">
              <svg className="tour-chart" viewBox={`0 0 ${String(W)} ${String(H)}`}>
                <defs>
                  <clipPath id="tour-progress-clip">
                    <rect width={W} height={H} />
                  </clipPath>
                </defs>
                <g clipPath="url(#tour-progress-clip)">
                  <path className="tour-chart-line avg" d={path(LINES.home)} />
                  {shot.paris && (
                    <path className="tour-chart-line other tour-in" d={path(LINES.paris)} />
                  )}
                  <path className="tour-chart-line me" d={path(LINES.me)} />
                </g>
                {shot.scene === 1 && (
                  <circle
                    className="tour-chart-dot"
                    cx={(hit[0] / months) * W}
                    cy={H - (ease(hit[1]) / 100) * H}
                    r={5}
                    data-tour="milestone"
                  />
                )}
              </svg>
              <div className="tour-row">
                <span className="tour-chip">{t('stats.progress.me')}</span>
                <span className="tour-chip">{t('stats.progress.scope.campus')}</span>
                {shot.paris && <span className="tour-chip tour-in">Paris</span>}
              </div>
              {shot.milestone && (
                <div className="tour-pop tour-in">
                  {tn('stats.progress.delivered', 2, { projects: 'push_swap, minitalk' })}
                </div>
              )}
            </div>
            <div className="tour-card">
              {shot.scene === 0 ? (
                <>
                  <span className="tour-muted">{t('stats.progress.scope')}</span>
                  <span className="tour-pill on">Madrid</span>
                  <span className={`tour-pill ${shot.paris ? 'on' : ''}`} data-tour="paris">
                    Paris
                  </span>
                  <span className="tour-muted">{t('common.period')}</span>
                  <span className="tour-select" data-tour="period">
                    {tn('stats.progress.first', months)}
                  </span>
                </>
              ) : (
                <>
                  <span className="tour-muted">{t('stats.progress.measure')}</span>
                  <span className={`tour-pill ${shot.hours ? '' : 'on'}`}>
                    {t('stats.progress.measure.circles')}
                  </span>
                  <span className={`tour-pill ${shot.hours ? 'on' : ''}`} data-tour="hours">
                    {t('stats.progress.measure.hours')}
                  </span>
                  <span className="tour-muted">{t('stats.progress.population')}</span>
                  <span className="tour-pill on">{t('stats.progress.population.current')}</span>
                </>
              )}
            </div>
          </div>
        )
      }}
    </Tour>
  )
}
