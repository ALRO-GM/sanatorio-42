import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Therapy = {
  joined: boolean
  seats: readonly number[]
  days: readonly number[]
  created: boolean
}

const START: Therapy = { joined: false, seats: [], days: [], created: false }

export const TOUR = defineTour<Therapy>('therapy', START, [
  [1500, { caption: 2 }],
  ...click<Therapy>(1500, 'join', { joined: true }),
  ...click<Therapy>(3700, 'new'),
  ...cut<Therapy>(4700, { scene: 1, caption: 3, cursor: 'rest' }),
  ...click<Therapy>(5900, 'seat7', { seats: [7] }),
  ...click<Therapy>(6750, 'seat8', { seats: [7, 8] }),
  ...click<Therapy>(7600, 'seat9', { seats: [7, 8, 9] }),
  [8600, { caption: 4 }],
  ...click<Therapy>(8600, 'day1', { days: [1] }),
  ...click<Therapy>(9500, 'day3', { days: [1, 3] }),
  [10500, { caption: 5 }],
  ...click<Therapy>(10500, 'create', { created: true }),
])

/** Puestos del cluster de mentira que ya tiene otra persona. */
const BUSY = [1, 4, 11]

/**
 * Cómo funcionan las terapias: te unes a un grupo de tu proyecto, o abres el
 * tuyo eligiendo puestos que se toquen y los días en que quedáis.
 */
export function TherapyTour() {
  const { t, tn } = useI18n()
  const days = t('tour.days').split(',')

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.ayuda')} sub={() => t('nav.terapia')}>
      {(shot) =>
        shot.scene === 0 ? (
          <>
            <div className="tour-card">
              <strong>{t('tour.therapy.group')}</strong>
              <span className="tour-muted">
                {tn('therapy.open', 4, { taken: shot.joined ? 3 : 2, capacity: 4 })}
              </span>
              <span>Cluster 1 · 16:00–18:00</span>
              <div className="tour-row">
                {shot.joined ? (
                  <span className="tour-saved">
                    <Icon name="hecho" size={13} /> {t('tour.therapy.in')}
                  </span>
                ) : (
                  <span className="tour-button" data-tour="join">
                    {t('therapy.join')}
                  </span>
                )}
              </div>
            </div>
            <div className="tour-row">
              <span className="tour-pill" data-tour="new">
                {t('therapy.new')}
              </span>
            </div>
          </>
        ) : (
          <div className="tour-card">
            <strong>{t('therapy.new')}</strong>
            <div className="tour-seats">
              {Array.from({ length: 12 }, (_, seat) => (
                <span
                  key={seat}
                  data-tour={`seat${seat}`}
                  className={`tour-seat ${shot.seats.includes(seat) ? 'on' : ''} ${BUSY.includes(seat) ? 'busy' : ''}`}
                />
              ))}
            </div>
            <div className="tour-row">
              {days.map((day, index) => (
                <span
                  key={index}
                  data-tour={`day${index}`}
                  className={`tour-pill ${shot.days.includes(index) ? 'on' : ''}`}
                >
                  {day}
                </span>
              ))}
              <span className="tour-muted">16:00–18:00</span>
            </div>
            <div className="tour-row">
              <span className="tour-button" data-tour="create">
                {t('therapy.create')}
              </span>
              {shot.created && (
                <span className="tour-saved">
                  <Icon name="hecho" size={13} />
                </span>
              )}
            </div>
          </div>
        )
      }
    </Tour>
  )
}
