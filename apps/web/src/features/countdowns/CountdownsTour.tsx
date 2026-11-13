import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour, typing } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: el formulario de fijar, lo que se escribe, las
 * cuentas atrás que se van sumando, la ventanita plegada o sacada de la
 * esquina, y el reloj.
 */
type Countdowns = {
  /** El formulario del «+», abierto. */
  adding: boolean
  /** Pasos de escritura del título (de `TYPED`). */
  typed: number
  /** La cuenta atrás propia, fijada. */
  custom: boolean
  /** El evento del calendario, fijado desde su ficha. */
  event: boolean
  folded: boolean
  /** Sacada de la esquina, arrastrando. */
  moved: boolean
  /** Segundos que han pasado en el reloj. */
  tick: number
}

const START: Countdowns = {
  adding: false,
  typed: 0,
  custom: false,
  event: false,
  folded: false,
  moved: false,
  tick: 0,
}

/** En cuántos golpes se escribe el título, mida lo que mida en cada idioma. */
const TYPED = 12

/** El reloj corre de segundo en segundo toda la demostración. */
const TICKS: Cue<Countdowns>[] = Array.from({ length: 13 }, (_, index) => [
  (index + 1) * 1000,
  { tick: index + 1 },
])

export const TOUR = defineTour<Countdowns>(
  'countdowns',
  START,
  [
    ...TICKS,
    ...click<Countdowns>(1600, 'add', { adding: true, caption: 2 }),
    ...click<Countdowns>(3300, 'title', { caption: 3 }),
    ...typing<Countdowns>(4100, 'typed', TYPED, 80),
    ...click<Countdowns>(5400, 'pin', { adding: false, custom: true, typed: 0 }),
    ...click<Countdowns>(7000, 'pinEvent', { event: true, caption: 4 }),
    ...click<Countdowns>(9200, 'fold', { folded: true, caption: 5 }),
    // Arrastrarla: el ratón la coge por el asa y se la lleva fuera de la esquina.
    [11400, { cursor: 'grip' }],
    [12100, { press: true, drag: true, caption: 6 }],
    [12160, { cursor: 'drop', moved: true }],
    [13100, { press: false, drag: false }],
  ],
  // De qué sitio de la ventanita habla cada paso: soltando ahí el
  // interrogante, la demostración empieza en él.
  {
    1: '.countdown-list',
    2: '.countdown-head [aria-pressed]',
    3: '.countdown-picker',
    5: '.countdown-peek',
    6: '.countdown-head',
  },
)

const HOUR = 3600 * 1000
/** Cuánto falta para cada una (ms) al empezar. */
const NOTICE_AT = (2 * 24 + 4) * HOUR + 12 * 60_000 + 9000
const CUSTOM_AT = (9 * 24 + 7) * HOUR + 30 * 60_000
const EVENT_AT = 6 * HOUR + 20 * 60_000

/**
 * Cómo funciona la ventanita de Cuentas atrás de la esquina: los avisos con
 * fecha, fijarse una propia con el «+» o un evento desde su ficha del
 * calendario, plegarla en una píldora y arrastrarla fuera de la esquina.
 */
export function CountdownsTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.yo')} sub={() => t('nav.calendario')}>
      {(shot) => {
        const now = shot.tick * 1000
        const custom = t('countdown.customPlaceholder')
        const item = (kind: 'notice' | 'custom' | 'event', title: string, at: number) => (
          <span className="tour-item tour-in">
            <span className="tour-chip">{t(`countdown.kind.${kind}`)}</span>
            <span>
              <strong>{title}</strong>
              <CountdownClock className="tour-timer" at={at} now={now} />
            </span>
          </span>
        )

        return (
          <>
            <div className="tour-card tour-event kind-board">
              <strong>{t('tour.boards.topic')}</strong>
              <span className="tour-muted">17:00 · {t('map.cluster', { n: 2 })}</span>
              <span className="tour-row">
                <span className={`tour-pill ${shot.event ? 'on' : ''}`} data-tour="pinEvent">
                  <Icon name="chincheta" size={12} />{' '}
                  {t(shot.event ? 'countdown.unpinEvent' : 'countdown.pinEvent')}
                </span>
              </span>
            </div>
            <div className="tour-dock-slot">
              {/* Donde acaba el asa al sacarla de la esquina: el ratón la lleva hasta ahí. */}
              <span className="tour-anchor tour-dock-drop" data-tour="drop" />
              <div className={`tour-card tour-dock ${shot.moved ? 'moved' : ''}`}>
                <span className="tour-row tour-dock-head">
                  <span data-tour="grip">
                    <Icon name="asa" size={13} />
                  </span>
                  <Icon name="reloj" size={13} />
                  {shot.folded ? (
                    <>
                      <span>
                        {shot.event ? t('tour.boards.topic') : t('countdown.lockers.title')}
                      </span>
                      <CountdownClock
                        className="tour-timer"
                        at={shot.event ? EVENT_AT : NOTICE_AT}
                        now={now}
                      />
                    </>
                  ) : (
                    <>
                      <strong>{t('countdown.title')}</strong>
                      <span className="tour-count">
                        {1 + (shot.custom ? 1 : 0) + (shot.event ? 1 : 0)}
                      </span>
                      <span
                        className={`tour-pill tour-end ${shot.adding ? 'on' : ''}`}
                        data-tour="add"
                      >
                        <Icon name="mas" size={12} />
                      </span>
                    </>
                  )}
                  <span className={shot.folded ? 'tour-end' : undefined} data-tour="fold">
                    <Icon name="abajo" size={13} />
                  </span>
                </span>
                {!shot.folded && shot.adding && (
                  <span className="tour-booking">
                    <span className="tour-row">
                      <span className="tour-pill">
                        <Icon name="calendario" size={12} /> {t('countdown.pinNext')}
                      </span>
                    </span>
                    <span className="tour-muted">{t('countdown.customTitle')}</span>
                    <span
                      className={`tour-input ${shot.typed > 0 ? 'typing' : ''}`}
                      data-tour="title"
                    >
                      {custom.slice(0, Math.ceil((custom.length * shot.typed) / TYPED))}
                    </span>
                    <span className="tour-row">
                      <span className="tour-select">{t('countdown.day')}</span>
                      <span className="tour-select">{t('countdown.time')}</span>
                      <span className="tour-button tour-end" data-tour="pin">
                        <Icon name="chincheta" size={12} /> {t('countdown.pin')}
                      </span>
                    </span>
                  </span>
                )}
                {!shot.folded && !shot.adding && (
                  <>
                    {shot.event && item('event', t('tour.boards.topic'), EVENT_AT)}
                    {item('notice', t('countdown.lockers.title'), NOTICE_AT)}
                    {shot.custom && item('custom', custom, CUSTOM_AT)}
                  </>
                )}
              </div>
            </div>
          </>
        )
      }}
    </Tour>
  )
}
