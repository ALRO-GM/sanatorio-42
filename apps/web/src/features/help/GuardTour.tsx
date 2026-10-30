import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { MiniGraph } from '../../shared/tour/MiniGraph'
import { Icon } from '../../shared/ui/Icon'

type Guard = {
  /** Medias horas marcadas (índices de `SLOTS`). */
  slots: readonly number[]
  /** El desplegable del tope, abierto. */
  menu: boolean
  /** Tope elegido, en minutos. */
  max: number
  pre: boolean
  saved: boolean
  /** El buzón: nada, el punto rojo, abierto, la reserva, o ya aceptada. */
  box: 'none' | 'badge' | 'open' | 'booking' | 'accepted'
  /** El aviso de "en 5 minutos". */
  alert: boolean
  /** Cuánto se ha desplazado el grafo. */
  pan: 0 | 1 | 2
}

const START: Guard = {
  slots: [],
  menu: false,
  max: 120,
  pre: false,
  saved: false,
  box: 'none',
  alert: false,
  pan: 0,
}

/** Coger el grafo y arrastrarlo de un punto a otro. */
const drag = (at: number, to: string, pan: Guard['pan']): Cue<Guard>[] => [
  [at, { press: true, drag: true }],
  [at + 60, { cursor: to, pan }],
  [at + 1000, { press: false, drag: false }],
]

export const TOUR = defineTour<Guard>(
  'guard',
  START,
  [
    // Escena 1: arrastrar por cuatro medias horas, el tope, preevaluar y guardar.
    [300, { cursor: 'slot2' }],
    [1000, { press: true, slots: [2] }],
    [1500, { cursor: 'slot3', slots: [2, 3] }],
    [2000, { cursor: 'slot4', slots: [2, 3, 4] }],
    [2500, { cursor: 'slot5', slots: [2, 3, 4, 5] }],
    [3100, { press: false }],
    [3700, { caption: 2 }],
    ...click<Guard>(3700, 'max', { menu: true }),
    ...click<Guard>(4600, 'opt30', { menu: false, max: 30 }),
    [5450, { caption: 3 }],
    ...click<Guard>(5450, 'pre', { pre: true }),
    [6300, { caption: 4 }],
    ...click<Guard>(6300, 'save', { saved: true }),
    // Escena 2: en el tablón, llega una reserva al buzón y se acepta.
    ...cut<Guard>(7500, { scene: 1, cursor: 'g1', caption: 5 }),
    ...drag(8500, 'g2', 1),
    [9700, { box: 'badge', caption: 6 }],
    ...click<Guard>(9900, 'bell', { box: 'open' }),
    ...click<Guard>(10800, 'notice', { box: 'booking' }),
    [11700, { caption: 7 }],
    ...click<Guard>(11700, 'accept', { box: 'accepted' }),
    // Escena 3: de vuelta al tablón, salta el aviso de cinco minutos antes.
    ...cut<Guard>(12900, { scene: 2, box: 'none', cursor: 'g2', caption: 5 }),
    ...drag(13800, 'g3', 2),
    [15000, { alert: true, caption: 8 }],
    ...click<Guard>(15800, 'going', { alert: false }),
    [17000, { caption: 9 }],
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.slot-day',
    2: '[data-feedback="guardia.today"] .form-grid',
    3: '.pre-review',
    4: '[data-feedback="guardia.today"] .form > .actions',
    6: '.appbar .mailbox-btn',
    7: '.booking',
  },
)

/** Las medias horas de la rejilla de mentira. */
const SLOTS = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00']

const label = (minutes: number): string => (minutes < 60 ? `${minutes} min` : `${minutes / 60} h`)

/**
 * Cómo funciona la guardia: un ratón marca cuatro medias horas, pone el tope,
 * se ofrece a preevaluar y guarda; luego, mientras mira el tablón, le llega una
 * reserva al buzón y la acepta; y al rato salta el aviso de cinco minutos antes.
 */
export function GuardTour() {
  const { t } = useI18n()

  return (
    <Tour
      tour={TOUR}
      // El on-call se abre desde la cabecera, sin categoría; luego se sigue en
      // Ayuda › Proyectos.
      tab={(shot) => t(shot.scene === 0 ? 'nav.guardia' : 'nav.cat.ayuda')}
      sub={(shot) => (shot.scene === 0 ? '' : t('nav.tablon'))}
      bell={(shot) => (shot.box === 'badge' ? 1 : 0)}
    >
      {(shot) =>
        shot.scene === 0 ? (
          <div className="tour-card">
            <strong>{t('help.today')}</strong>
            <div className="tour-slot-day">
              {SLOTS.map((time, index) => (
                <span key={time} className="tour-slot-row">
                  <small className="tour-muted">{time.endsWith(':00') ? time : ''}</small>
                  <span
                    data-tour={`slot${index}`}
                    className={[
                      'tour-slot',
                      shot.slots.includes(index) ? 'on' : '',
                      shot.slots.includes(index - 1) ? 'joined-above' : '',
                      shot.slots.includes(index + 1) ? 'joined-below' : '',
                    ].join(' ')}
                  />
                </span>
              ))}
            </div>
            <div className="tour-row">
              <span>{t('help.max')}</span>
              <span className="tour-select" data-tour="max">
                {label(shot.max)} ▾
                {shot.menu && (
                  <span className="tour-menu">
                    <span className="pick" data-tour="opt30">
                      {label(30)}
                    </span>
                    <span>{label(60)}</span>
                    <span>{label(90)}</span>
                  </span>
                )}
              </span>
            </div>
            <div className="tour-row">
              {/* Como en la página: un interruptor, en su propio bloque arriba. */}
              <span className={`tour-switch ${shot.pre ? 'on' : ''}`} data-tour="pre" />
              <span>{t('help.preReview')}</span>
            </div>
            <div className="tour-row">
              <span className="tour-button" data-tour="save">
                {t('help.save')}
              </span>
              {shot.saved && <span className="tour-saved">{t('help.saved')}</span>}
            </div>
          </div>
        ) : (
          <div className="tour-scene wide">
            <MiniGraph pan={shot.pan} />
            <span className="tour-anchor" data-tour="g1" style={{ left: '62%', top: '58%' }} />
            <span className="tour-anchor" data-tour="g2" style={{ left: '42%', top: '46%' }} />
            <span className="tour-anchor" data-tour="g3" style={{ left: '56%', top: '62%' }} />

            {shot.box !== 'none' && shot.box !== 'badge' && (
              <div className="tour-pop tour-box">
                <strong>{t('notices.title')}</strong>
                <span className="tour-notice" data-tour="notice">
                  <Icon name="guardia" size={14} />
                  {t('notices.kind.booking_requested', { from: 'mgarcia' })}
                </span>
                {shot.box !== 'open' && (
                  <div className="tour-booking">
                    <span>16:30–17:00 · push_swap</span>
                    {shot.box === 'accepted' ? (
                      <span className="tour-saved">
                        <Icon name="hecho" size={13} /> {t('tour.guard.accepted')}
                      </span>
                    ) : (
                      <span className="tour-row">
                        <span className="tour-button" data-tour="accept">
                          {t('common.accept')}
                        </span>
                        <span className="tour-pill">{t('common.decline')}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {shot.alert && (
              <div className="tour-pop tour-alert">
                <span className="tour-kind">
                  <Icon name="reloj" size={13} /> {t('tour.guard.soon')}
                </span>
                <strong>{t('tour.guard.soonTitle', { login: 'mgarcia' })}</strong>
                <span>16:30–17:00 · push_swap</span>
                <span className="tour-row">
                  <span className="tour-button" data-tour="going">
                    {t('meet.seen')}
                  </span>
                  <span className="tour-pill">{t('meet.late')}</span>
                  <span className="tour-pill">{t('meet.absent')}</span>
                </span>
              </div>
            )}
          </div>
        )
      }
    </Tour>
  )
}
