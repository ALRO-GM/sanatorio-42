import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Boards = {
  day: boolean
  joined: boolean
  /** Letras del tema que ya se han escrito. */
  typed: number
  created: boolean
  /** Caracteres del código que ya se han tecleado. */
  code: number
  valid: boolean
}

const START: Boards = { day: false, joined: false, typed: 0, created: false, code: 0, valid: false }

const LETTERS = 20
const CODE = 'K7QM'

export const TOUR = defineTour<Boards>('boards', START, [
  ...click<Boards>(600, 'day9', { day: true }),
  [1800, { caption: 2 }],
  ...click<Boards>(2700, 'join', { joined: true }),
  ...click<Boards>(4300, 'propose'),
  ...cut<Boards>(5300, { scene: 1, caption: 3, cursor: 'rest' }),
  ...typing<Boards>(6500, 'typed', LETTERS),
  ...click<Boards>(7900, 'create', { created: true }),
  ...cut<Boards>(9600, { scene: 2, caption: 4, cursor: 'rest' }),
  ...typing<Boards>(11000, 'code', CODE.length, 220),
  [12100, { caption: 5 }],
  ...click<Boards>(12100, 'validate', { valid: true }),
])

/**
 * Cómo funcionan las pizarras: te apuntas a una del calendario, propones la
 * tuya y, el día de la sesión, validas tu asistencia con los códigos.
 */
export function BoardsTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.pizarras')}>
      {(shot) =>
        shot.scene === 0 ? (
          <>
            <div className="tour-split">
              <div className="tour-card">
                <div className="tour-cal">
                  {Array.from({ length: 14 }, (_, index) => index + 1).map((day) => (
                    <span
                      key={day}
                      data-tour={`day${day}`}
                      className={`tour-day ${day === 9 || day === 12 ? 'dot' : ''} ${day === 9 && shot.day ? 'on' : ''}`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              {shot.day && (
                <div className="tour-card tour-in">
                  <strong>{t('tour.boards.topic')}</strong>
                  <span className="tour-muted">17:00 · Cluster 2 · mgarcia</span>
                  <div className="tour-row">
                    {shot.joined ? (
                      <span className="tour-saved">
                        <Icon name="hecho" size={13} />
                      </span>
                    ) : (
                      <span className="tour-button" data-tour="join">
                        {t('cal.join')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="tour-row">
              <span className="tour-pill" data-tour="propose">
                {t('cal.proposeBtn')}
              </span>
            </div>
          </>
        ) : shot.scene === 1 ? (
          <div className="tour-card">
            <strong>{t('cal.proposeBtn')}</strong>
            <div className="tour-row">
              <span className="tour-input typing">
                {t('tour.boards.mine').slice(0, shot.typed)}
              </span>
            </div>
            <span className="tour-muted">18:00 · Cluster 1</span>
            <div className="tour-row">
              <span className="tour-button" data-tour="create">
                {t('tour.boards.create')}
              </span>
              {shot.created && (
                <span className="tour-saved">
                  <Icon name="hecho" size={13} />
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="tour-card">
            <strong>{t('meet.att.title')}</strong>
            <div className="tour-row">
              <span>{t('meet.att.startCode')}</span>
              <span className="tour-code">{CODE.slice(0, shot.code) || '····'}</span>
              <span className="tour-button" data-tour="validate">
                {t('meet.att.validate')}
              </span>
            </div>
            <div className="tour-row">
              <span className="tour-muted">{t('meet.att.endCode')}</span>
              <span className="tour-code">····</span>
            </div>
            {shot.valid && (
              <span className="tour-saved">
                <Icon name="hecho" size={13} /> {t('meet.att.start')}
              </span>
            )}
          </div>
        )
      }
    </Tour>
  )
}
