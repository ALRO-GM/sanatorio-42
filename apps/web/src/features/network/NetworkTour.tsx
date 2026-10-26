import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { click, defineTour, Tour, typing } from '../../shared/tour/Tour'

type Network = {
  /** Burbuja elegida: su índice en `NODES`, o `-1`. */
  picked: number
  /** Letras del login que ya se han escrito en el buscador. */
  typed: number
  /** El desplegable abierto: el del periodo o el del tope de personas. */
  menu: '' | 'period' | 'limit'
  /** Últimos 24 meses en vez de 12: sale más gente. */
  longer: boolean
  /** Con la segunda escuela marcada: más gente y color por escuela. */
  schools: boolean
  /** El tope de personas, subido a 2 000. */
  more: boolean
}

const START: Network = {
  picked: -1,
  typed: 0,
  menu: '',
  longer: false,
  schools: false,
  more: false,
}

const SEARCH = 'lso'

export const TOUR = defineTour<Network>('network', START, [
  [1600, { caption: 2 }],
  ...click<Network>(1600, 'n2', { picked: 2 }),
  [3800, { caption: 3 }],
  ...click<Network>(3800, 'search', { picked: -1 }),
  ...typing<Network>(4700, 'typed', SEARCH.length, 200),
  [5400, { picked: 5 }],
  [7000, { caption: 4, picked: -1, typed: 0 }],
  ...click<Network>(7000, 'period', { menu: 'period' }),
  ...click<Network>(8000, 'p24', { menu: '', longer: true }),
  [9900, { caption: 5 }],
  ...click<Network>(9900, 'school2', { schools: true }),
  [12400, { caption: 6 }],
  ...click<Network>(12400, 'limit', { menu: 'limit' }),
  ...click<Network>(13400, 'l2000', { menu: '', more: true }),
])

/**
 * Las personas de la red de mentira: dónde están, cuánto corrigen, de qué
 * escuela son (0 o 1), de qué grupo y con qué filtro aparecen (`when`).
 */
const NODES = [
  { x: 50, y: 150, weight: 20, login: 'aruiz', school: 0, group: 0, when: '' },
  { x: 120, y: 150, weight: 45, login: 'pvidal', school: 0, group: 0, when: '' },
  { x: 160, y: 80, weight: 90, login: 'mgarcia', school: 0, group: 1, when: '' },
  { x: 215, y: 140, weight: 30, login: 'jcano', school: 0, group: 1, when: '' },
  { x: 100, y: 205, weight: 60, login: 'nmora', school: 0, group: 0, when: '' },
  { x: 225, y: 50, weight: 70, login: 'lsoto', school: 0, group: 1, when: '' },
  { x: 180, y: 200, weight: 15, login: 'cvega', school: 0, group: 2, when: '' },
  { x: 40, y: 70, weight: 25, login: 'rpena', school: 0, group: 0, when: 'longer' },
  { x: 245, y: 215, weight: 35, login: 'tgil', school: 0, group: 2, when: 'longer' },
  { x: 255, y: 105, weight: 50, login: 'ebarro', school: 1, group: 1, when: 'schools' },
  { x: 95, y: 30, weight: 40, login: 'ifont', school: 1, group: 0, when: 'schools' },
  { x: 30, y: 225, weight: 20, login: 'osanz', school: 1, group: 2, when: 'schools' },
  { x: 140, y: 240, weight: 18, login: 'dlara', school: 1, group: 2, when: 'more' },
  { x: 265, y: 165, weight: 22, login: 'mrey', school: 0, group: 2, when: 'more' },
] as const

const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 5],
  [1, 4],
  [3, 6],
  [4, 6],
  [0, 2],
  [7, 0],
  [8, 6],
  [9, 3],
  [9, 5],
  [10, 2],
  [11, 4],
  [12, 6],
  [13, 8],
] as const

/** Colores de los grupos y de las dos escuelas: son códigos del grafo, iguales en los dos temas. */
const GROUP_HUES = [190, 280, 35]
const SCHOOL_HUES = [160, 15]

/** Lo que dice el selector de periodo, de menos a más (como `PeriodPicker`). */
const PERIODS = ['3', '12', '24', 'all'] as const

/**
 * Cómo funciona la red de correcciones, con sus opciones como están ahora: el
 * grafo a la izquierda y, a la derecha, escuelas, el periodo común de la web,
 * la persona, el tope de personas y el color.
 */
export function NetworkTour() {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const period = (value: (typeof PERIODS)[number]): string =>
    value === 'all' ? t('period.all') : tn('period.last', Number(value))

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.datos')} sub={() => t('nav.red')}>
      {(shot) => {
        const shown = (when: string): boolean =>
          when === '' ||
          (when === 'longer' && shot.longer) ||
          (when === 'schools' && shot.schools) ||
          (when === 'more' && shot.more)
        const near = (index: number): boolean =>
          shot.picked === -1 ||
          index === shot.picked ||
          LINKS.some(
            ([from, to]) =>
              (from === shot.picked && to === index) || (to === shot.picked && from === index),
          )
        const picked = shot.picked === -1 ? undefined : NODES[shot.picked]
        const hueOf = (node: (typeof NODES)[number]): number =>
          shot.schools ? (SCHOOL_HUES[node.school] ?? 0) : (GROUP_HUES[node.group] ?? 0)

        return (
          <div className="tour-split" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
            <svg className="tour-graph" viewBox="0 0 290 260">
              {LINKS.filter(([from, to]) => shown(NODES[from].when) && shown(NODES[to].when)).map(
                ([from, to]) => (
                  <line
                    key={`${from}-${to}`}
                    x1={NODES[from].x}
                    y1={NODES[from].y}
                    x2={NODES[to].x}
                    y2={NODES[to].y}
                    stroke="currentColor"
                    strokeWidth={from === shot.picked || to === shot.picked ? 3 : 1.5}
                    opacity={
                      shot.picked === -1
                        ? 0.3
                        : from === shot.picked || to === shot.picked
                          ? 0.8
                          : 0.08
                    }
                  />
                ),
              )}
              {NODES.map(
                (node, index) =>
                  shown(node.when) && (
                    <circle
                      key={node.login}
                      className={node.when === '' ? undefined : 'tour-in'}
                      data-tour={`n${index}`}
                      cx={node.x}
                      cy={node.y}
                      r={8 + node.weight / 10 + (index === shot.picked ? 4 : 0)}
                      fill={`hsl(${hueOf(node)} 65% 55%)`}
                      opacity={near(index) ? 1 : 0.25}
                    />
                  ),
              )}
            </svg>
            <div className="tour-card">
              <div className="tour-row">
                <span className="tour-muted">{t('net.campuses')}</span>
                <span className="tour-pill on">Urduliz</span>
                <span className={`tour-pill ${shot.schools ? 'on' : ''}`} data-tour="school2">
                  Madrid
                </span>
                <span className="tour-pill">{t('net.campuses.all')}</span>
              </div>
              <span className="tour-select" data-tour="period">
                {period(shot.longer ? '24' : '12')} ▾
                {shot.menu === 'period' && (
                  <span className="tour-menu">
                    {PERIODS.map((value) => (
                      <span
                        key={value}
                        className={value === '24' ? 'pick' : undefined}
                        data-tour={`p${value}`}
                      >
                        {period(value)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className={`tour-input ${shot.typed > 0 ? 'typing' : ''}`} data-tour="search">
                {SEARCH.slice(0, shot.typed) || (
                  <span className="tour-muted">{t('common.person')}</span>
                )}
              </span>
              {picked !== undefined && (
                <span className="tour-in">
                  <strong>{picked.login}</strong>{' '}
                  <span className="tour-muted">
                    {t('tour.network.count', { n: picked.weight })}
                  </span>
                </span>
              )}
              <div className="tour-row">
                <span className="tour-muted">{t('net.limit')}</span>
                <span className="tour-select" data-tour="limit">
                  {number(shot.more ? 2000 : 1000)} ▾
                  {shot.menu === 'limit' && (
                    <span className="tour-menu">
                      <span>{number(1500)}</span>
                      <span className="pick" data-tour="l2000">
                        {t('net.limit.slow', { n: number(2000) })}
                      </span>
                      <span>{t('net.limit.all')}</span>
                    </span>
                  )}
                </span>
              </div>
              <div className="tour-row">
                <span className="tour-muted">{t('net.color')}</span>
                <span key={String(shot.schools)} className="tour-select tour-in">
                  {t(shot.schools ? 'net.color.campus' : 'net.color.community')}
                </span>
              </div>
            </div>
          </div>
        )
      }}
    </Tour>
  )
}
