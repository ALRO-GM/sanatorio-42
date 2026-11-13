import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'
import { Tile } from './art'
import { fill, short, textsOf } from './texts'

/**
 * Lo que cambia en el decorado: las líneas escritas, lo comprado, la ficha de
 * un edificio, la clasificación y la ventanita.
 */
type Clicker = {
  lines: number
  /** Un cursor comprado: escribe solo. */
  owned: boolean
  /** La mejora del cursor, comprada. */
  upgraded: boolean
  /** La ficha del pisciner, al pasar por él. */
  card: boolean
  /** La pestaña Clasificación. */
  board: boolean
  /** La ventanita, encendida. */
  mini: boolean
}

/** Lo que cuestan el primer cursor y su primera mejora, como en el juego. */
const CURSOR = 15
const UPGRADE = 100
const PISCINER = 100

const START: Clicker = {
  lines: 112,
  owned: false,
  upgraded: false,
  card: false,
  board: false,
  mini: false,
}

/** Otra pulsación sin mover el ratón: aprieta, suma una línea y suelta. */
const tap = (at: number, lines: number): Cue<Clicker>[] => [
  [at, { press: true }],
  [at + 80, { lines }],
  [at + 160, { press: false }],
]

export const TOUR = defineTour<Clicker>(
  'clicker',
  START,
  [
    ...click<Clicker>(500, 'key', { lines: 113 }),
    ...tap(1600, 114),
    ...tap(1900, 115),
    ...tap(2200, 116),
    ...click<Clicker>(3000, 'cursor', { owned: true, lines: 116 - CURSOR, caption: 2 }),
    ...click<Clicker>(6000, 'upgrade', { upgraded: true, lines: 1, caption: 3 }),
    [8700, { caption: 4, cursor: 'pisciner' }],
    [9400, { card: true }],
    ...click<Clicker>(11000, 'board', { board: true, card: false, caption: 5 }),
    ...click<Clicker>(13500, 'mini', { mini: true, caption: 6 }),
    ...cut<Clicker>(15000, { scene: 1, cursor: 'rest' }),
    [16400, { lines: 2 }],
    [17400, { lines: 3 }],
  ],
  // De qué sitio del juego habla cada paso: soltando ahí el interrogante, la
  // demostración empieza en él.
  {
    1: '.cc-keywrap, .cc-bank',
    2: '.cc-buildings, .cc-store-head',
    3: '.cc-upgrades',
    4: '.cc-building',
    5: '.cc-board',
    6: '.cc-mini',
  },
)

const BOARD = [
  { login: 'mgarcia', wealth: 48_200 },
  { login: 'lperez', wealth: 9150 },
  { login: 'aruiz', wealth: 1320 },
] as const

/**
 * Cómo se juega a Code Clicker: pulsar la tecla, comprar en la tienda quien
 * escriba por ti, las mejoras, la ficha de cada cosa, la clasificación y la
 * ventanita que sigue contando fuera del juego.
 */
export function ClickerTour() {
  const { t, lang } = useI18n()
  const texts = textsOf(lang)
  const ui = (key: string, vars: Record<string, string | number> = {}): string =>
    fill(texts.ui[key] ?? key, vars)
  const number = (value: number): string => short(value, lang, 1)

  return (
    <Tour
      tour={TOUR}
      tab={(shot) => (shot.scene === 1 ? t('nav.cat.yo') : ui('title'))}
      sub={(shot) => (shot.scene === 1 ? t('nav.expediente') : '')}
    >
      {(shot) => {
        const perSecond = ui('perSecond', {
          n: number(shot.upgraded ? 0.2 : shot.owned ? 0.1 : 0),
        })

        if (shot.scene === 1) {
          return (
            <>
              <div className="tour-card">
                <span className="tour-row">
                  <span className="tour-avatar">M</span>
                  <strong>mgarcia</strong>
                </span>
                <span className="tour-muted">{t('nav.expediente')}</span>
              </div>
              <div className="tour-pop tour-corner">
                <span className="tour-row">
                  <span className="tour-key small">{'{}'}</span>
                  <span>
                    <strong className="tour-timer">{number(shot.lines)}</strong>{' '}
                    <span className="tour-muted">{perSecond}</span>
                  </span>
                  <Icon name="cerrar" size={12} />
                </span>
              </div>
            </>
          )
        }

        return (
          <>
            <div className="tour-row">
              <span className={`tour-pill ${shot.board ? '' : 'on'}`}>{ui('play')}</span>
              <span className="tour-pill">{ui('achievements')}</span>
              <span className={`tour-pill ${shot.board ? 'on' : ''}`} data-tour="board">
                {ui('board')}
              </span>
              <span className={`tour-pill tour-end ${shot.mini ? 'on' : ''}`} data-tour="mini">
                {ui(shot.mini ? 'miniOn' : 'miniOff')}
              </span>
            </div>
            <div className="tour-split">
              <div className="tour-card tour-bank">
                <span className="tour-muted">{ui('repo', { login: 'mgarcia' })}</span>
                <strong className="tour-timer">{number(shot.lines)}</strong>
                <span>{ui('code')}</span>
                <span className="tour-muted">{perSecond}</span>
                <span className="tour-key" data-tour="key">
                  {'{}'}
                </span>
              </div>
              {shot.board ? (
                <div className="tour-card tour-in">
                  <span className="tour-muted">
                    {ui('rank')} · {ui('wealth')}
                  </span>
                  {BOARD.map((row, index) => (
                    <span key={row.login} className={`tour-item ${index === 1 ? 'on' : ''}`}>
                      <b>{index + 1}</b>
                      <span>{row.login}</span>
                      <b className="tour-timer tour-end">{number(row.wealth)}</b>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="tour-card">
                  {shot.owned && !shot.upgraded && (
                    <span className="tour-row tour-in">
                      <span className="tour-muted">{ui('upgrades')}</span>
                      <span data-tour="upgrade">
                        <Tile icon="cursor" size={26} tier={0} />
                      </span>
                      <span className="tour-timer">{number(UPGRADE)}</span>
                    </span>
                  )}
                  <span className="tour-muted">{ui('store')}</span>
                  <span className={`tour-item ${shot.owned ? 'on' : ''}`} data-tour="cursor">
                    <Tile icon="cursor" size={26} />
                    <span>
                      <strong>{texts.buildings.cursor[0]}</strong>
                      <span className="tour-timer">{number(shot.owned ? 18 : CURSOR)}</span>
                    </span>
                    {shot.owned && <b className="tour-end">1</b>}
                  </span>
                  <span className="tour-item" data-tour="pisciner">
                    <Tile icon="pisciner" size={26} />
                    <span>
                      <strong>{texts.buildings.pisciner[0]}</strong>
                      <span className="tour-timer">{number(PISCINER)}</span>
                    </span>
                  </span>
                </div>
              )}
            </div>
            {shot.card && (
              <div className="tour-pop tour-tip-card">
                <span className="tour-chip">{ui('tagBuilding')}</span>
                <strong>{texts.buildings.pisciner[0]}</strong>
                <span>{ui('cardEach', { name: texts.buildings.pisciner[0], n: number(1) })}</span>
                <span className="tour-muted">{ui('cardGain', { n: number(1), pct: 500 })}</span>
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
