import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

type Chess = {
  /** El peón, elegido. */
  picked: boolean
  /** El peón, ya en su casilla nueva. */
  moved: boolean
  /** La respuesta pulsada: la buena o la mala. */
  answer: 'right' | 'wrong' | null
  /** El rival ha perdido el 10 % por fallar. */
  penalty: boolean
}

const START: Chess = { picked: false, moved: false, answer: null, penalty: false }

export const TOUR = defineTour<Chess>('chess', START, [
  ...click<Chess>(800, 'pawn', { picked: true }),
  ...click<Chess>(1800, 'target', { moved: true }),
  ...cut<Chess>(3200, { scene: 1, caption: 2, cursor: 'rest' }),
  ...click<Chess>(5000, 'right', { answer: 'right' }),
  [6000, { caption: 3 }],
  ...cut<Chess>(8600, { scene: 2, caption: 4, answer: null, cursor: 'rest' }),
  [10200, { penalty: true }],
  [12600, { caption: 5 }],
])

const FILES = ['d', 'e', 'f']

/**
 * Cómo se juega al ajedrez de Not-games: mueves y los relojes se paran; sale
 * una pregunta a los dos; quien acierta primero mueve, y quien falla pierde
 * tiempo.
 */
export function ChessTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.notgames')}>
      {(shot) => {
        if (shot.scene === 0) {
          return (
            <div className="tour-card">
              <strong>{t('notgames.chess.yourMove')}</strong>
              <div className="tour-chess">
                {[4, 3, 2].flatMap((rank) =>
                  FILES.map((file, index) => {
                    const square = `${file}${rank}`
                    const here = (shot.moved ? 'e4' : 'e2') === square

                    return (
                      <span
                        key={square}
                        data-tour={
                          square === 'e2' ? 'pawn' : square === 'e4' ? 'target' : undefined
                        }
                        className={[
                          'tour-chess-square',
                          (index + rank) % 2 === 0 ? 'dark' : 'light',
                          shot.picked && !shot.moved && square === 'e2' ? 'on' : '',
                          shot.picked && !shot.moved && (square === 'e3' || square === 'e4')
                            ? 'target'
                            : '',
                        ].join(' ')}
                      >
                        {here && <span className="chess-piece side-a">{'♟︎'}</span>}
                      </span>
                    )
                  }),
                )}
              </div>
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <span className="tour-chip">{t('notgames.chess.questionTitle')}</span>
              <span>{t('tour.notGames.ask')}</span>
              <div className="tour-row">
                {['-1', t('tour.notGames.pid'), '0', '1'].map((text) => (
                  <span
                    key={text}
                    data-tour={text === '0' ? 'right' : undefined}
                    className={`tour-pill ${text === '0' && shot.answer === 'right' ? 'on' : ''}`}
                  >
                    {text}
                  </span>
                ))}
              </div>
              {shot.answer === 'right' && (
                <span className="tour-notice tour-in">{t('notgames.chess.firstRightMe')}</span>
              )}
            </div>
          )
        }

        return (
          <div className="tour-card">
            <span className="tour-item">
              <span className="tour-avatar" style={{ ['--hue' as string]: 200 }}>
                M
              </span>
              <strong>mgarcia</strong>
              <strong className={`tour-end ${shot.penalty ? 'tour-danger' : ''}`}>
                {shot.penalty ? '4:30' : '5:00'}
              </strong>
            </span>
            <span className="tour-item on">
              <span className="tour-avatar">P</span>
              <strong>plopez-l</strong>
              <strong className="tour-end">4:58</strong>
            </span>
            {shot.penalty && (
              <span className="tour-notice tour-in">
                {t('notgames.chess.firstWrongYouMove', { login: 'mgarcia' })}
              </span>
            )}
          </div>
        )
      }}
    </Tour>
  )
}
