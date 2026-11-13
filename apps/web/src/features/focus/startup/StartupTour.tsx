import { useI18n } from '../../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../../shared/tour/Tour'
import { Icon } from '../../../shared/ui/Icon'
import { Coin, Dots, hm } from './parts'
import { ItemArt } from './pixel/ItemArt'

/**
 * Lo que cambia en el decorado: lo comprado y contratado, la pieza elegida al
 * recolocar (dónde está, si está girada, si se va a vender) y la caja abierta.
 */
type Startup = {
  learned: boolean
  hired: boolean
  /** La planta, elegida en la lista de piezas. */
  picked: boolean
  /** La baldosa donde está la planta. */
  at: number
  turned: boolean
  /** Vender, pulsado una vez: pide la segunda. */
  armed: boolean
  sold: boolean
  /** La caja sorpresa, abierta. */
  opened: boolean
}

const START: Startup = {
  learned: false,
  hired: false,
  picked: false,
  at: 5,
  turned: false,
  armed: false,
  sold: false,
  opened: false,
}

export const TOUR = defineTour<Startup>(
  'startup',
  START,
  [
    ...click<Startup>(1700, 'learn', { learned: true, caption: 2 }),
    ...click<Startup>(3900, 'hire', { hired: true, caption: 3 }),
    ...cut<Startup>(6200, { scene: 1, caption: 4, cursor: 'rest' }),
    ...click<Startup>(7300, 'piece', { picked: true }),
    ...click<Startup>(8300, 'right', { at: 6 }),
    ...click<Startup>(9500, 'turn', { turned: true, caption: 5 }),
    ...click<Startup>(10900, 'sell', { armed: true }),
    ...click<Startup>(11900, 'sell', { sold: true, armed: false }),
    ...cut<Startup>(13500, { scene: 2, caption: 6, cursor: 'rest' }),
    ...click<Startup>(14500, 'box', { opened: true }),
    [16700, { caption: 7, cursor: 'rank' }],
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.su-figures',
    2: '.su-grid:not(.su-hiring)',
    3: '.su-hiring',
    4: '.su-editor, .su-edit',
    5: '.su-moves',
    6: '.su-surprise',
    7: '.su-ranking',
  },
)

/** Los minutos con los que empieza el decorado y lo que cuesta cada cosa. */
const MINUTES = 150
const LEARN = 60
const HIRE = 45
/** El dinero, y lo que devuelve vender la planta. */
const CASH = 120
const PLANT = 30
/** La oficina del decorado: cuatro baldosas de ancho por dos de fondo. */
const TILES = 8
const DESK = 1

const RANKING = [
  { login: 'mgarcia', hours: 31 },
  { login: 'lperez', hours: 26 },
  { login: 'aruiz', hours: 12 },
] as const

/**
 * Cómo funciona la Startup del Pomodoro: los minutos de concentración se
 * gastan en aprender, comprar y contratar; la oficina se recoloca (mover,
 * girar y vender), las sesiones largas dan cajas sorpresa y hay ranking.
 */
export function StartupTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.pomodoro')}>
      {(shot) => {
        const balance = MINUTES - (shot.learned ? LEARN : 0) - (shot.hired ? HIRE : 0)
        const figures = (
          <div className="tour-row">
            <span className="tour-chip">
              <Icon name="reloj" size={12} /> <b className="tour-timer">{hm(balance)}</b>
            </span>
            <span className="tour-chip">
              <Coin size={11} /> <b className="tour-timer">{CASH + (shot.sold ? PLANT : 0)}</b>
            </span>
            <span className="tour-chip">
              <Icon name="persona" size={12} /> <b>{shot.hired ? '2/2' : '1/2'}</b>
            </span>
            <span className={`tour-pill tour-end ${shot.scene === 1 ? 'on' : ''}`}>
              <Icon name="agarrar" size={12} /> {t('startup.edit')}
            </span>
          </div>
        )

        return (
          <>
            <div className="tour-tabs">
              <span>{t('focus.tab.settings')}</span>
              <span className="on">{t('focus.tab.startup')}</span>
              <span>{t('focus.tab.stats')}</span>
            </div>
            {figures}
            {shot.scene === 0 && (
              <div className="tour-row tour-shop">
                <span className="tour-card" data-tour="learn">
                  <ItemArt art={{ kind: 'learn', axis: 'front' }} size={44} />
                  <Dots level={shot.learned ? 2 : 1} of={5} />
                  <span className="tour-row">
                    <Icon name="reloj" size={11} /> {hm(LEARN)}
                  </span>
                </span>
                <span className="tour-card">
                  <ItemArt art={{ kind: 'computer', level: 2 }} size={44} />
                  <Dots level={1} of={4} />
                  <span className="tour-row">
                    <Icon name="reloj" size={11} /> {hm(120)}
                  </span>
                </span>
                <span className="tour-card" data-tour="hire">
                  <ItemArt art={{ kind: 'hire', axis: 'back', look: 412 }} size={44} />
                  <span className="su-stars">
                    <Icon name="estrella" size={10} />
                    <Icon name="estrella" size={10} />
                    <Icon name="estrella" size={10} />
                  </span>
                  <span className="tour-row">
                    {shot.hired ? (
                      <Icon name="hecho" size={11} />
                    ) : (
                      <>
                        <Icon name="reloj" size={11} /> {hm(HIRE)}
                      </>
                    )}
                  </span>
                </span>
              </div>
            )}
            {shot.scene === 1 && (
              <div className="tour-split tour-in">
                <div className="tour-office">
                  {Array.from({ length: TILES }, (_, tile) => (
                    <span key={tile}>
                      {tile === DESK && <ItemArt art={{ kind: 'computer', level: 2 }} size={30} />}
                      {tile === shot.at && !shot.sold && (
                        <span
                          className="tour-in"
                          style={{ transform: shot.turned ? 'scaleX(-1)' : undefined }}
                        >
                          <ItemArt art={{ kind: 'model', model: 'plant' }} size={30} />
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="tour-card">
                  <span className="tour-row">
                    {!shot.sold && (
                      <span className={`tour-pill ${shot.picked ? 'on' : ''}`} data-tour="piece">
                        <ItemArt art={{ kind: 'model', model: 'plant' }} size={20} />
                      </span>
                    )}
                    <span className="tour-pill">
                      <ItemArt art={{ kind: 'computer', level: 2 }} size={20} />
                    </span>
                  </span>
                  {shot.picked && !shot.sold && (
                    <span className="tour-row tour-in">
                      <span className="tour-pill">
                        <Icon name="atras" size={12} />
                      </span>
                      <span className="tour-pill" data-tour="right">
                        <Icon name="adelante" size={12} />
                      </span>
                      <span className={`tour-pill ${shot.turned ? 'on' : ''}`} data-tour="turn">
                        <Icon name="chispa" size={12} /> {t('startup.turn')}
                      </span>
                      <span className="tour-pill">
                        <Icon name="capas" size={12} />
                      </span>
                      <span className={`tour-pill ${shot.armed ? 'on' : ''}`} data-tour="sell">
                        <Coin size={11} /> {shot.armed ? `+${String(PLANT)}?` : `+${String(PLANT)}`}
                      </span>
                    </span>
                  )}
                  {shot.picked && !shot.sold && (
                    <span className="tour-muted">
                      {t(shot.armed ? 'startup.sell.confirm' : 'startup.sell', { n: PLANT })}
                    </span>
                  )}
                </div>
              </div>
            )}
            {shot.scene === 2 && (
              <div className="tour-split tour-in">
                <div className="tour-card">
                  <strong>{t('startup.boxes')}</strong>
                  <span className="tour-row">
                    {shot.opened ? (
                      <span className="tour-in">
                        <ItemArt art={{ kind: 'model', model: 'cat' }} size={40} />
                      </span>
                    ) : (
                      <ItemArt
                        art={{ kind: 'model', model: 'crate', props: { level: 1 } }}
                        size={40}
                      />
                    )}
                    <span className="tour-count">{shot.opened ? 0 : 1}</span>
                    {!shot.opened && (
                      <span className="tour-button" data-tour="box">
                        <Icon name="chispa" size={12} />
                      </span>
                    )}
                  </span>
                  {shot.opened && (
                    <span className="tour-saved">
                      {t('startup.prize', { name: t('startup.decor.cat') })}
                    </span>
                  )}
                </div>
                <div className="tour-card">
                  <strong>{t('startup.ranking')}</strong>
                  {RANKING.map((row, index) => (
                    <span
                      key={row.login}
                      className={`tour-item ${index === 1 ? 'on' : ''}`}
                      data-tour={index === 0 ? 'rank' : undefined}
                    >
                      <b>{index + 1}</b>
                      <span>{row.login}</span>
                      <span className="tour-muted tour-end">
                        <Icon name="trofeo" size={11} /> {row.hours}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
