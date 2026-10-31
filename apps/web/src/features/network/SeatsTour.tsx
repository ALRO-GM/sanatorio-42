import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
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
}

const START: Seats = { alone: false, picked: -1, menu: false, months: 1 }

export const TOUR = defineTour<Seats>(
  'seats',
  START,
  [
    [2200, { caption: 2 }],
    ...click<Seats>(2200, 'alone', { alone: true }),
    [4600, { caption: 3 }],
    ...click<Seats>(4600, 'p3', { picked: 3 }),
    [7300, { caption: 4 }],
    ...click<Seats>(7300, 'period', { menu: true }),
    ...click<Seats>(8200, 'm3', { menu: false, months: 3 }),
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.seats .force-graph',
    2: '.seats-modes',
    3: '.seats .net-panel, .seats-person',
    4: '.seats-period',
  },
)

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

/**
 * Cómo funciona la red de asientos: quién se sienta cerca de quién, colorear
 * por grupo o por soledad, la ficha de una persona y el periodo. El mapa de
 * calor de los puestos se enseña en la de Clústeres, donde está ahora.
 */
export function SeatsTour() {
  const { t, tn } = useI18n()
  const period = (months: number): string => tn('period.last', months)

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.campus')}
      // Los asientos son una vista de Red: «Datos › Red › Asientos».
      sub={() => t('nav.asientos')}
    >
      {(shot) => {
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
