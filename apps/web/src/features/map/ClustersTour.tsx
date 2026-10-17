import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: la sala elegida, el resaltado, la ficha de un
 * puesto, el puesto averiado elegido y su aviso.
 */
type Clusters = { room: number; mine: boolean; open: boolean; chosen: boolean; broken: boolean }

const START: Clusters = { room: 0, mine: false, open: false, chosen: false, broken: false }

/** Puestos ocupados del decorado y, de ellos, quién hace tu proyecto. */
const BUSY = [1, 4, 6, 9, 10, 14, 17]
const MINE = [4, 10, 17]
/** El puesto que se abre (de alguien con tu proyecto) y el que no funciona. */
const PICKED = 10
const BROKEN = 15

export const TOUR = defineTour<Clusters>('clusters', START, [
  ...click<Clusters>(1000, 'room1', { room: 1 }),
  [2400, { caption: 2 }],
  ...click<Clusters>(2600, 'mine', { mine: true }),
  [4200, { caption: 3 }],
  ...click<Clusters>(4400, `seat${PICKED}`, { open: true }),
  [6600, { caption: 4 }],
  ...click<Clusters>(6800, `seat${BROKEN}`, { open: false, chosen: true }),
  ...click<Clusters>(8000, 'report', { broken: true }),
])

/**
 * Cómo funciona el mapa de los clústeres: eliges la sala, resaltas a quien hace
 * tu proyecto, abres un puesto para ver quién es y escribirle, y avisas de un
 * ordenador que no funciona.
 */
export function ClustersTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.clusters')}>
      {(shot) => (
        <div className="tour-card">
          <div className="tour-row">
            {[1, 2, 3].map((room, index) => (
              <span
                key={room}
                data-tour={`room${index}`}
                className={`tour-pill ${shot.room === index ? 'on' : ''}`}
              >
                {t('map.cluster', { n: room })}
              </span>
            ))}
          </div>
          <div className="tour-row">
            <span className="tour-muted">{t('map.highlight')}</span>
            <span className={`tour-pill ${shot.mine ? 'on' : ''}`} data-tour="mine">
              {t('map.mate.project')}
            </span>
          </div>
          <div className="tour-seats">
            {Array.from({ length: 18 }, (_, seat) => (
              <span
                key={seat}
                data-tour={`seat${seat}`}
                className={[
                  'tour-seat',
                  shot.room === 1 && BUSY.includes(seat) ? 'busy' : '',
                  shot.room === 1 && shot.mine && MINE.includes(seat) ? 'glow' : '',
                  seat === BROKEN && shot.broken ? 'broken' : '',
                ].join(' ')}
              />
            ))}
          </div>
          {shot.open && (
            <div className="tour-row tour-in">
              <span className="tour-item on">
                <span className="tour-avatar" style={{ ['--hue' as string]: 200 }}>
                  L
                </span>
                <span>
                  <strong>lsoto</strong>
                  <span className="tour-muted">push_swap</span>
                </span>
              </span>
              <span className="tour-button">
                <Icon name="chat" size={13} /> {t('clusters.write')}
              </span>
            </div>
          )}
          {shot.chosen && (
            <div className="tour-row tour-in">
              <span className="tour-button" data-tour="report">
                {t('map.reportBroken')}
              </span>
            </div>
          )}
        </div>
      )}
    </Tour>
  )
}
