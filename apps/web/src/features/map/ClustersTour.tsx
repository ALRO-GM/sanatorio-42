import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: el clúster elegido, el resaltado, la ficha de
 * un puesto, el puesto libre elegido y su aviso, la colocación y el tamaño.
 */
type Clusters = {
  room: number
  mine: boolean
  open: boolean
  chosen: boolean
  broken: boolean
  /** El desplegable «Colocación de los puestos», abierto. */
  placement: boolean
  /** Invertir en vertical: la fila 1 arriba. */
  flipped: boolean
  /** Al 100 % en vez de ajustado al ancho. */
  full: boolean
}

const START: Clusters = {
  room: 0,
  mine: false,
  open: false,
  chosen: false,
  broken: false,
  placement: false,
  flipped: false,
  full: false,
}

/** Puestos ocupados de cada clúster del decorado; el número de la pestaña sale de aquí. */
const BUSY: readonly (readonly number[])[] = [
  [0, 2, 3, 5, 8, 12, 13, 16],
  [1, 4, 6, 9, 10, 14, 17],
  [7, 11, 15],
]
/** En el segundo clúster, quién hace tu proyecto. */
const MINE = [4, 10, 17]
/** El puesto que se abre (de alguien con tu proyecto) y el libre que no funciona. */
const PICKED = 10
const BROKEN = 15
const PER_ROW = 6

export const TOUR = defineTour<Clusters>('clusters', START, [
  ...click<Clusters>(900, 'room1', { room: 1 }),
  [2400, { caption: 2 }],
  ...click<Clusters>(2400, 'mine', { mine: true }),
  [4200, { caption: 3 }],
  ...click<Clusters>(4200, `seat${PICKED}`, { open: true }),
  [6400, { caption: 4 }],
  ...click<Clusters>(6400, `seat${BROKEN}`, { open: false, chosen: true }),
  ...click<Clusters>(7500, 'report', { broken: true }),
  [9300, { caption: 5 }],
  ...click<Clusters>(9300, 'placement', { placement: true }),
  ...click<Clusters>(10400, 'flipRows', { flipped: true }),
  [12300, { caption: 6 }],
  ...click<Clusters>(12300, 'full', { full: true }),
])

/**
 * Cómo funciona el mapa de los clústeres, como está ahora: pestañas de clúster
 * con cuánta gente hay sentada, los resaltados arriba, la ficha de un puesto
 * para escribir, el aviso de avería de un puesto libre y, debajo del plano, la
 * colocación plegada y el tamaño (ajustar o al 100 %).
 */
export function ClustersTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.campus')}>
      {(shot) => (
        <div className="tour-card">
          <div className="tour-row">
            {BUSY.map((busy, index) => (
              <span
                key={index}
                data-tour={`room${index}`}
                className={`tour-pill ${shot.room === index ? 'on' : ''}`}
              >
                {t('map.cluster', { n: index + 1 })}
                <span className="tour-count">{busy.length}</span>
              </span>
            ))}
          </div>
          <div className="tour-row">
            <span className="tour-muted">{t('map.highlight')}</span>
            <span className="tour-pill">{t('map.mate.circle')}</span>
            <span className={`tour-pill ${shot.mine ? 'on' : ''}`} data-tour="mine">
              {t('map.mate.project')}
            </span>
            <span className="tour-pill">{t('map.mate.done')}</span>
            <span className={`tour-pill tour-end ${shot.full ? '' : 'on'}`}>
              {t('map.zoomFit')}
            </span>
            <span className={`tour-pill ${shot.full ? 'on' : ''}`} data-tour="full">
              {t('map.zoomFull')}
            </span>
          </div>
          <div className="tour-pan">
            <div
              className={`tour-seats ${shot.flipped ? 'flip' : ''}`}
              style={{ width: shot.full ? '150%' : '100%' }}
            >
              {Array.from({ length: PER_ROW * 3 }, (_, seat) => (
                <span
                  key={seat}
                  data-tour={`seat${seat}`}
                  className={[
                    'tour-seat',
                    (BUSY[shot.room] ?? []).includes(seat) ? 'busy' : '',
                    shot.room === 1 && shot.mine && MINE.includes(seat) ? 'glow' : '',
                    seat === BROKEN && shot.broken ? 'broken' : '',
                    seat === BROKEN && shot.chosen ? 'on' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
          {shot.open && (
            <div className="tour-pop" style={{ top: '34%', left: '6%', width: '46%' }}>
              <span className="tour-row">
                <span className="tour-avatar" style={{ ['--hue' as string]: 200 }}>
                  L
                </span>
                <strong>lsoto</strong>
                <span className="tour-chip">{t('map.circle', { n: 3 })}</span>
              </span>
              <span className="tour-muted">push_swap</span>
              <span className="tour-row">
                <span className="tour-button">
                  <Icon name="chat" size={13} /> {t('clusters.write')}
                </span>
              </span>
            </div>
          )}
          {shot.chosen && (
            <div className="tour-row tour-in">
              <strong>
                {t('map.seatName', {
                  cluster: t('map.cluster', { n: 2 }),
                  row: Math.floor(BROKEN / PER_ROW) + 1,
                  seat: (BROKEN % PER_ROW) + 1,
                })}
              </strong>
              <span className="tour-muted">
                {t(shot.broken ? 'map.seatBroken' : 'map.seatFree')}
              </span>
              <span className="tour-pill" data-tour="report">
                {t(shot.broken ? 'map.fixed' : 'map.reportBroken')}
              </span>
            </div>
          )}
          <span className="tour-row" data-tour="placement">
            <span className="tour-muted">{shot.placement ? '▾' : '▸'}</span>
            {t('map.placement')}
          </span>
          {shot.placement && (
            <div className="tour-row tour-in">
              <span className={`tour-pill ${shot.flipped ? 'on' : ''}`} data-tour="flipRows">
                {t('map.flipRows')}
              </span>
              <span className="tour-pill">{t('map.flipSeats')}</span>
              <span className="tour-pill">{t('map.flat')}</span>
            </div>
          )}
        </div>
      )}
    </Tour>
  )
}
