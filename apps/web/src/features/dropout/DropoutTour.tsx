import type { DropoutStatus } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

/**
 * Lo que cambia en el decorado: el total que filtra la tabla, la ficha de una
 * persona, cómo se agrupa la gráfica, el ajuste del cálculo y la comparación.
 */
type Dropout = {
  /** Solo los probables, al pulsar su total. */
  likely: boolean
  /** La ficha de una persona, abierta. */
  person: boolean
  /** La gráfica, por semana en vez de por día. */
  week: boolean
  /** «Ajustar el cálculo», desplegado. */
  tuning: boolean
  /** «Faltar de viernes a lunes es abandono», como viene de fábrica. */
  rule: boolean
  /** La vista «Comparar piscinas». */
  compare: boolean
}

const START: Dropout = {
  likely: false,
  person: false,
  week: false,
  tuning: false,
  rule: true,
  compare: false,
}

export const TOUR = defineTour<Dropout>(
  'dropout',
  START,
  [
    ...click<Dropout>(1800, 'likely', { likely: true, caption: 2 }),
    ...click<Dropout>(4000, 'person', { person: true, caption: 3 }),
    ...cut<Dropout>(7100, { scene: 1, person: false, caption: 4, cursor: 'rest' }),
    ...click<Dropout>(8000, 'week', { week: true }),
    ...click<Dropout>(9700, 'tuning', { tuning: true, caption: 5 }),
    ...click<Dropout>(11000, 'rule', { rule: false }),
    ...click<Dropout>(12600, 'compare', { compare: true, caption: 6 }),
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.dropout-summary',
    2: '.dropout-counts',
    3: 'section.card.dropout-block',
    4: '.dropout-block:not(.card)',
    5: '.dropout-tuning',
    6: '.dropout-views',
  },
)

/** Los piscineros de mentira de la tabla, de más a menos riesgo. */
const PEOPLE: readonly { login: string; risk: number; status: DropoutStatus; hue: number }[] = [
  { login: 'jlopez', risk: 100, status: 'gone', hue: 10 },
  { login: 'mgarcia', risk: 72, status: 'likely', hue: 40 },
  { login: 'aruiz', risk: 64, status: 'likely', hue: 280 },
  { login: 'lperez', risk: 8, status: 'active', hue: 150 },
]

/** El color de cada estado, como en la tabla de verdad. */
const COLOR: Partial<Record<DropoutStatus, string>> = {
  gone: 'var(--danger)',
  likely: 'var(--warn)',
  active: 'var(--ok)',
}

/** Los totales de arriba: cuántos y cuál filtra. */
const COUNTS = [
  ['people', 24],
  ['gone', 5],
  ['likely', 3],
  ['active', 16],
] as const

/** Las horas de mgarcia de lunes a viernes: el viernes de examen no vino. */
const HOURS = [80, 100, 60, 30, 0] as const
/** Abandonos por día de piscina y por semana (en % del más alto). */
const BY_DAY = [0, 20, 0, 40, 100, 20, 0, 40, 60, 20, 0, 40] as const
const BY_WEEK = [40, 100, 60, 20] as const
/** Quién sigue cada día en dos piscinas: `[día, %]` sobre 26 días. */
const SURVIVAL = [
  [
    [0, 100],
    [5, 92],
    [12, 80],
    [19, 74],
    [26, 70],
  ],
  [
    [0, 100],
    [5, 85],
    [12, 71],
    [19, 60],
    [26, 55],
  ],
] as const

const W = 300
const H = 110

/**
 * Cómo se lee Abandono: los totales que filtran la tabla, la ficha de cada
 * piscinero, la gráfica de cuándo lo dejan, el ajuste del cálculo y la
 * comparación entre piscinas.
 */
export function DropoutTour() {
  const { t } = useI18n()
  const days = t('tour.days').split(',')

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.campus')} sub={() => t('nav.abandono')}>
      {(shot) => (
        <>
          <div className="tour-tabs">
            <span className={shot.compare ? '' : 'on'}>{t('dropout.view.pool')}</span>
            <span className={shot.compare ? 'on' : ''} data-tour="compare">
              {t('dropout.view.compare')}
            </span>
          </div>
          {shot.scene === 0 && (
            <>
              <div className="tour-row">
                {COUNTS.map(([key, count]) => (
                  <span
                    key={key}
                    className={`tour-pill ${key === 'likely' && shot.likely ? 'on' : ''}`}
                    data-tour={key === 'likely' ? 'likely' : undefined}
                  >
                    <b>{count}</b> {t(`dropout.counts.${key}`)}
                  </span>
                ))}
              </div>
              <div className="tour-card">
                <strong>{t('dropout.people.title')}</strong>
                {PEOPLE.filter((person) => !shot.likely || person.status === 'likely').map(
                  (person) => (
                    <span
                      key={person.login}
                      className={`tour-item ${shot.person && person.login === 'mgarcia' ? 'on' : ''}`}
                      data-tour={person.login === 'mgarcia' ? 'person' : undefined}
                    >
                      <span
                        className="tour-avatar"
                        style={{ ['--hue' as string]: String(person.hue) }}
                      >
                        {person.login.charAt(0).toUpperCase()}
                      </span>
                      <span>{person.login}</span>
                      <b className="tour-timer tour-end">
                        {t('dropout.percent', { n: person.risk })}
                      </b>
                      <span
                        className="tour-chip tour-status"
                        style={{ color: COLOR[person.status] }}
                      >
                        {t(`dropout.status.${person.status}`)}
                      </span>
                    </span>
                  ),
                )}
              </div>
              {shot.person && (
                <div className="tour-pop tour-side" style={{ top: '5.6em' }}>
                  <strong>mgarcia</strong>
                  <span className="tour-muted">{t('dropout.person.risk', { n: 72 })}</span>
                  <span>{t('dropout.person.hours')}</span>
                  <div className="tour-bars">
                    {HOURS.map((hours, day) => (
                      <span key={day}>
                        <i style={{ height: `${String(hours)}%` }} />
                        {days[day]}
                      </span>
                    ))}
                  </div>
                  <span>{t('dropout.reason.missedFriday')}</span>
                </div>
              )}
            </>
          )}
          {shot.scene === 1 && !shot.compare && (
            <>
              <div className="tour-split lean tour-in">
                <div className="tour-card">
                  <strong>{t('dropout.chart.title')}</strong>
                  <div className="tour-bars">
                    {(shot.week ? BY_WEEK : BY_DAY).map((share, index) => (
                      <span key={`${String(shot.week)}-${String(index)}`}>
                        <i style={{ height: `${String(share)}%` }} />
                        {shot.week ? t('dropout.chart.weekShort', { n: index + 1 }) : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="tour-card">
                  <span className="tour-muted">{t('dropout.chart.grouping')}</span>
                  <span className={`tour-pill ${shot.week ? '' : 'on'}`}>
                    {t('dropout.grouping.day')}
                  </span>
                  <span className={`tour-pill ${shot.week ? 'on' : ''}`} data-tour="week">
                    {t('dropout.grouping.week')}
                  </span>
                </div>
              </div>
              <div className="tour-card">
                <span className="tour-row">
                  <strong data-tour="tuning">{t('dropout.tuning.title')}</strong>
                  {!shot.rule && (
                    <span className="tour-chip tour-in">{t('dropout.tuning.changed')}</span>
                  )}
                </span>
                {shot.tuning && (
                  <span className="tour-row tour-in">
                    <span className={`tour-switch ${shot.rule ? 'on' : ''}`} data-tour="rule" />
                    {t('dropout.tuning.fridayToMonday')}
                  </span>
                )}
              </div>
            </>
          )}
          {shot.compare && (
            <div className="tour-card tour-in">
              <strong>{t('dropout.compare.survival.title')}</strong>
              <svg className="tour-chart" viewBox={`0 0 ${String(W)} ${String(H)}`}>
                {SURVIVAL.map((points, pool) => (
                  <path
                    key={pool}
                    className={`tour-chart-line ${pool === 0 ? 'me' : 'other'}`}
                    d={points
                      .map(
                        ([day, share], index) =>
                          `${index === 0 ? 'M' : 'L'}${((day / 26) * W).toFixed(1)},${(H - ((share - 40) / 60) * H).toFixed(1)}`,
                      )
                      .join('')}
                  />
                ))}
              </svg>
              <div className="tour-row">
                <span className="tour-chip">
                  {t('dropout.compare.poolName', { start: '2026-07-06' })}
                </span>
                <span className="tour-chip">
                  {t('dropout.compare.poolName', { start: '2026-08-03' })}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Tour>
  )
}
