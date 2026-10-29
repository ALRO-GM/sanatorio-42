import { Fragment } from 'react'
import type { CSSProperties } from 'react'

import { useI18n } from '../../shared/i18n'
import { clusterName } from '../../shared/seats'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { scaleColor } from './colors'

type Seats = {
  /** Color por lo solo que se sienta cada cual, en vez de por grupo. */
  alone: boolean
  /** Persona elegida: su índice en `PEOPLE`, o `-1`. */
  picked: number
  /** El desplegable del periodo, abierto. */
  menu: boolean
  /** Meses del periodo: el último o los tres últimos. */
  months: 1 | 3
  /** La ficha del puesto por el que pasa el ratón, en el mapa de calor. */
  tip: boolean
}

const START: Seats = { alone: false, picked: -1, menu: false, months: 1, tip: false }

export const TOUR = defineTour<Seats>('seats', START, [
  [2200, { caption: 2 }],
  ...click<Seats>(2200, 'alone', { alone: true }),
  [4600, { caption: 3 }],
  ...click<Seats>(4600, 'p3', { picked: 3 }),
  [7300, { caption: 4 }],
  ...click<Seats>(7300, 'period', { menu: true }),
  ...click<Seats>(8200, 'm3', { menu: false, months: 3 }),
  ...cut<Seats>(10200, { scene: 1, caption: 5, cursor: 'rest', picked: -1 }),
  [12200, { caption: 6, cursor: 'hot' }],
  [12900, { tip: true }],
  [15000, { caption: 7, cursor: 'stats', tip: false }],
])

/**
 * La gente de la red de mentira: dónde sale, con qué grupo se sienta, horas en
 * un puesto el último mes y qué parte de ellas sin nadie cerca.
 */
const PEOPLE = [
  { x: 55, y: 50, group: 0, hours: 40, alone: 0.1, login: 'aruiz' },
  { x: 95, y: 85, group: 0, hours: 60, alone: 0.2, login: 'pvidal' },
  { x: 45, y: 120, group: 0, hours: 30, alone: 0.15, login: 'nmora' },
  { x: 215, y: 140, group: 2, hours: 50, alone: 0.85, login: 'jcano' },
  { x: 170, y: 40, group: 1, hours: 70, alone: 0.05, login: 'mgarcia' },
  { x: 205, y: 80, group: 1, hours: 45, alone: 0.3, login: 'lsoto' },
  { x: 140, y: 95, group: 1, hours: 25, alone: 0.4, login: 'cvega' },
  { x: 130, y: 145, group: 2, hours: 35, alone: 0.6, login: 'dortiz' },
] as const

const LINKS = [
  [0, 1],
  [1, 2],
  [0, 2],
  [4, 5],
  [5, 6],
  [4, 6],
  [1, 6],
  [6, 7],
  [7, 3],
] as const

/** Tonos de los grupos: los tres primeros de la red de verdad (`colors.ts`). */
const GROUP_HUES = [186, 28, 262]

/** Puestos de dos clústeres por fila: de 0 (poco uso) a 4 (mucho); `-1`, sin uso. */
const HEAT = [
  {
    id: 'c1',
    rows: [
      [2, 3, 4, 3, -1, 1],
      [1, 4, 4, 3, 2, 0],
      [-1, 0, 2, 1, -1, -1],
    ],
    hours: 286,
    used: 14,
    people: 34,
  },
  {
    id: 'c2',
    rows: [
      [0, 1, -1, 0, 1, 2],
      [-1, 0, 1, 1, 0, -1],
      [1, 2, 0, -1, -1, 0],
    ],
    hours: 97,
    used: 13,
    people: 21,
  },
] as const

/** El puesto por el que pasa el ratón: clúster 1, fila 2, puesto 3. */
const HOT = { cluster: 0, row: 1, seat: 2 }

/**
 * Cómo funciona la red de asientos: quién se sienta cerca de quién, colorear
 * por grupo o por soledad, la ficha de una persona, el periodo y, debajo, el
 * mapa de calor de los puestos con sus cifras.
 */
export function SeatsTour() {
  const { t, tn } = useI18n()
  const period = (months: number): string => tn('period.last', months)

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.campus')}
      // Los asientos son una vista de Red: «Datos › Red › Asientos».
      sub={() => `${t('nav.red')} › ${t('seats.view.seats')}`}
    >
      {(shot) => {
        if (shot.scene === 1) {
          return (
            <div className="seat-heat tour-heat">
              <strong>{t('seats.heat.title')}</strong>
              <div className="heat-clusters">
                {HEAT.map((cluster, index) => (
                  <figure key={cluster.id} className="heat-cluster">
                    <figcaption>{clusterName(cluster.id, t)}</figcaption>
                    {shot.tip && index === HOT.cluster && (
                      <span className="tour-tip tour-in">
                        {`c1r2s3 · ${t('seats.heat.hours', { n: 41 })} · ${tn('seats.heat.people', 9)}`}
                      </span>
                    )}
                    <div
                      className="heat-grid"
                      style={{ gridTemplateColumns: 'auto repeat(6, var(--cell))' }}
                    >
                      <span />
                      {cluster.rows[0].map((_, seat) => (
                        <span key={seat} className="heat-axis">
                          {seat + 1}
                        </span>
                      ))}
                      {cluster.rows.map((row, rowIndex) => (
                        <Fragment key={rowIndex}>
                          <span className="heat-axis heat-row">{rowIndex + 1}</span>
                          {row.map((level, seat) => (
                            <span
                              key={seat}
                              data-tour={
                                index === HOT.cluster && rowIndex === HOT.row && seat === HOT.seat
                                  ? 'hot'
                                  : undefined
                              }
                              className={`heat-cell ${level < 0 ? 'free' : 'used'}`}
                              style={
                                level < 0
                                  ? undefined
                                  : ({
                                      '--from': `var(--heat-${String(level)})`,
                                      '--to': `var(--heat-${String(level)})`,
                                      '--mix': '0%',
                                    } as CSSProperties)
                              }
                            />
                          ))}
                        </Fragment>
                      ))}
                    </div>
                    <ul className="heat-stats" data-tour={index === 0 ? 'stats' : undefined}>
                      <li>{t('seats.heat.cluster.hours', { n: cluster.hours })}</li>
                      <li>{t('seats.heat.cluster.used', { used: cluster.used, total: 18 })}</li>
                      <li>{t('seats.heat.cluster.people', { n: cluster.people })}</li>
                    </ul>
                  </figure>
                ))}
              </div>
              <div className="heat-legend">
                <span className="heat-legend-item">
                  <span className="heat-cell free" />
                  {t('seats.heat.unused')}
                </span>
                <span className="heat-legend-item">
                  {t('seats.heat.hours', { n: 2 })}
                  <span className="heat-ramp" />
                  {t('seats.heat.hours', { n: 41 })}
                </span>
              </div>
            </div>
          )
        }

        const picked = PEOPLE[shot.picked]
        // Con tres meses salen más horas, y las burbujas crecen.
        const hoursOf = (hours: number): number => hours * shot.months

        return (
          <div className="tour-split lean">
            <div className="tour-card tour-net">
              <svg className="tour-graph" viewBox="0 0 260 180">
                {LINKS.map(([from, to]) => (
                  <line
                    key={`${from}-${to}`}
                    x1={PEOPLE[from].x}
                    y1={PEOPLE[from].y}
                    x2={PEOPLE[to].x}
                    y2={PEOPLE[to].y}
                    stroke="#fff"
                    strokeWidth={from === shot.picked || to === shot.picked ? 3 : 1.5}
                    opacity={
                      shot.picked === -1
                        ? 0.35
                        : from === shot.picked || to === shot.picked
                          ? 0.9
                          : 0.1
                    }
                  />
                ))}
                {PEOPLE.map((person, index) => (
                  <circle
                    key={person.login}
                    data-tour={`p${index}`}
                    cx={person.x}
                    cy={person.y}
                    r={5 + Math.sqrt(hoursOf(person.hours)) * 0.9 + (index === shot.picked ? 3 : 0)}
                    fill={
                      shot.alone
                        ? scaleColor(person.alone * 100, { min: 0, max: 100 })
                        : `hsl(${GROUP_HUES[person.group] ?? 200} 70% 62%)`
                    }
                    opacity={shot.picked === -1 || index === shot.picked ? 1 : 0.45}
                  />
                ))}
              </svg>
            </div>
            <div className="tour-card">
              <span className="tour-select" data-tour="period">
                {period(shot.months)} ▾
                {shot.menu && (
                  <span className="tour-menu">
                    <span>{period(1)}</span>
                    <span className="pick" data-tour="m3">
                      {period(3)}
                    </span>
                    <span>{period(6)}</span>
                  </span>
                )}
              </span>
              <span className="tour-muted">{t('seats.colour')}</span>
              <div className="tour-row">
                <span className={`tour-pill ${shot.alone ? '' : 'on'}`}>
                  {t('seats.mode.community')}
                </span>
                <span className={`tour-pill ${shot.alone ? 'on' : ''}`} data-tour="alone">
                  {t('seats.mode.alone')}
                </span>
              </div>
              {picked !== undefined && (
                <div className="tour-in" style={{ display: 'grid', gap: '0.3em' }}>
                  <span className="tour-row">
                    <span className="tour-avatar" style={{ ['--hue' as string]: 30 }}>
                      {picked.login.charAt(0).toUpperCase()}
                    </span>
                    <strong>{picked.login}</strong>
                  </span>
                  <span className="tour-row">
                    <span>
                      <span className="tour-muted">{t('seats.person.hours')}</span>{' '}
                      <strong>{hoursOf(picked.hours)}</strong>
                    </span>
                    <span>
                      <span className="tour-muted">{t('seats.person.alone')}</span>{' '}
                      <strong>{Math.round(picked.alone * 100)} %</strong>
                    </span>
                  </span>
                  <span className="tour-muted">{t('seats.person.usual', { seats: 'c2r4s5' })}</span>
                </div>
              )}
            </div>
          </div>
        )
      }}
    </Tour>
  )
}
