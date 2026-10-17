import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour, typing } from '../../shared/tour/Tour'

type Network = {
  /** Burbuja elegida: su índice en `NODES`, o `-1`. */
  picked: number
  /** Letras del login que ya se han escrito en el buscador. */
  typed: number
  /** Dónde está el tope de la escala de color, en tanto por ciento. */
  scale: number
}

const START: Network = { picked: -1, typed: 0, scale: 80 }

const SEARCH = 'lso'

export const TOUR = defineTour<Network>('network', START, [
  [1700, { caption: 2 }],
  ...click<Network>(1700, 'n2', { picked: 2 }),
  [4300, { caption: 3 }],
  ...click<Network>(4300, 'search', { picked: -1 }),
  ...typing<Network>(5300, 'typed', SEARCH.length, 200),
  [6100, { picked: 5 }],
  [8000, { caption: 4, cursor: 'k1', picked: -1, typed: 0 }],
  [9000, { press: true, drag: true }],
  [9060, { cursor: 'k2', scale: 35 }],
  [10100, { press: false, drag: false }],
])

/** Las personas de la red de mentira: dónde están, cuánto corrigen y quién son. */
const NODES = [
  { x: 60, y: 150, weight: 20, login: 'aruiz' },
  { x: 170, y: 150, weight: 45, login: 'pvidal' },
  { x: 230, y: 80, weight: 90, login: 'mgarcia' },
  { x: 310, y: 140, weight: 30, login: 'jcano' },
  { x: 140, y: 205, weight: 60, login: 'nmora' },
  { x: 330, y: 50, weight: 70, login: 'lsoto' },
  { x: 260, y: 200, weight: 15, login: 'cvega' },
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
] as const

/** Del turquesa al rojo según cuánto corrige alguien frente al tope de la escala. */
const colorOf = (weight: number, scale: number): string =>
  `hsl(${Math.round(190 - 190 * Math.min(1, weight / scale))} 65% 55%)`

/**
 * Cómo funciona la red de correcciones: cada burbuja es una persona, se pulsa
 * o se busca para ver con quién se corrige, y la escala de color se mueve.
 */
export function NetworkTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.red')}>
      {(shot) => {
        const near = (index: number): boolean =>
          shot.picked === -1 ||
          index === shot.picked ||
          LINKS.some(
            ([from, to]) =>
              (from === shot.picked && to === index) || (to === shot.picked && from === index),
          )
        const picked = NODES[shot.picked]

        return (
          <div className="tour-scene wide">
            <svg className="tour-graph" viewBox="0 0 400 250">
              {LINKS.map(([from, to]) => (
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
              ))}
              {NODES.map((node, index) => (
                <circle
                  key={node.login}
                  data-tour={`n${index}`}
                  cx={node.x}
                  cy={node.y}
                  r={10 + node.weight / 9 + (index === shot.picked ? 4 : 0)}
                  fill={colorOf(node.weight, shot.scale)}
                  opacity={near(index) ? 1 : 0.25}
                />
              ))}
            </svg>
            <div className="tour-pop" style={{ top: '0.6em', left: '0.8em', width: '34%' }}>
              <span className={`tour-input ${shot.typed > 0 ? 'typing' : ''}`} data-tour="search">
                {SEARCH.slice(0, shot.typed) || <span className="tour-muted">login…</span>}
              </span>
              {picked !== undefined && (
                <span className="tour-in">
                  <strong>{picked.login}</strong>{' '}
                  <span className="tour-muted">
                    {t('tour.network.count', { n: picked.weight })}
                  </span>
                </span>
              )}
            </div>
            <div
              className="tour-row"
              style={{ position: 'absolute', left: '8%', right: '8%', bottom: '6%' }}
            >
              <span className="tour-range">
                <i style={{ left: `${shot.scale}%` }} />
                <span className="tour-anchor" data-tour="k1" style={{ left: '80%', top: '50%' }} />
                <span className="tour-anchor" data-tour="k2" style={{ left: '35%', top: '50%' }} />
              </span>
            </div>
          </div>
        )
      }}
    </Tour>
  )
}
