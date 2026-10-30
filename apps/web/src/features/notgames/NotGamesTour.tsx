import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type NotGames = {
  survival: boolean
  /** La respuesta pulsada (la buena es la 0). */
  answer: number | null
  reveal: boolean
}

const START: NotGames = { survival: false, answer: null, reveal: false }

export const TOUR = defineTour<NotGames>(
  'notGames',
  START,
  [
    ...click<NotGames>(900, 'survival', { survival: true }),
    [2400, { caption: 2 }],
    ...click<NotGames>(3600, 'create', {}),
    ...cut<NotGames>(4700, { scene: 1, caption: 3, cursor: 'rest' }),
    ...click<NotGames>(6800, 'a0', { answer: 0 }),
    [8000, { reveal: true, caption: 4 }],
    ...cut<NotGames>(11000, { scene: 2, caption: 5, cursor: 'rest' }),
    [13500, { caption: 6 }],
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.quiz-modes + .quiz-modes',
    3: '.quiz-timer, .quiz-options',
    4: '.quiz-reveal',
    5: '.quiz-lives',
    6: '.quiz-final',
  },
)

const MODES = ['duel', 'ffa', 'survival'] as const
const PLAYERS = [
  { login: 'mgarcia', lives: 3, hue: 200 },
  { login: 'jdoe', lives: 1, hue: 30 },
  { login: 'lsoto', lives: 0, hue: 280 },
]

/**
 * Cómo funciona Not-games: eliges el modo y creas la sala, contestas antes de
 * que se acabe el tiempo, ves la buena y por qué, y el marcador.
 */
export function NotGamesTour() {
  const { t } = useI18n()
  // La buena va primero en el guion, pero en pantalla sale la tercera.
  const options = [
    { key: 'b', text: '-1' },
    { key: 'c', text: t('tour.notGames.pid') },
    { key: 'a0', text: '0' },
    { key: 'd', text: '1' },
  ]

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.notgames')}>
      {(shot) => {
        if (shot.scene === 0) {
          return (
            <div className="tour-card">
              <strong>{t('notgames.modeLabel')}</strong>
              <div className="tour-row">
                {MODES.map((mode) => (
                  <span
                    key={mode}
                    data-tour={mode === 'survival' ? 'survival' : undefined}
                    className={`tour-pill ${mode === (shot.survival ? 'survival' : 'duel') ? 'on' : ''}`}
                  >
                    {t(`notgames.mode.${mode}`)}
                  </span>
                ))}
              </div>
              {shot.survival && (
                <span className="tour-muted tour-in">{t('notgames.mode.survival.hint')}</span>
              )}
              <div className="tour-row">
                <span className="tour-button" data-tour="create">
                  {t('notgames.createSend')}
                </span>
              </div>
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <div className="tour-row">
                <strong>{t('notgames.questionOf', { n: 3, total: 10 })}</strong>
                <span className="tour-chip">{t('notgames.kind.quick')}</span>
                <span className="tour-muted tour-end">{t('notgames.secondsLeft', { n: 6 })}</span>
              </div>
              <span>{t('tour.notGames.ask')}</span>
              <div className="tour-row">
                {options.map((option) => (
                  <span
                    key={option.key}
                    data-tour={option.key}
                    className={`tour-pill ${option.key === 'a0' && shot.answer === 0 ? 'on' : ''}`}
                  >
                    {option.text}
                    {shot.reveal && option.key === 'a0' && <Icon name="hecho" size={13} />}
                  </span>
                ))}
              </div>
              {shot.reveal && (
                <span className="tour-notice tour-in">
                  <strong>{t('notgames.right')}</strong> {t('tour.notGames.why')}
                </span>
              )}
            </div>
          )
        }

        return (
          <div className="tour-card">
            <strong>{t('notgames.scores')}</strong>
            {PLAYERS.map((player) => (
              <span key={player.login} className={`tour-item ${player.lives === 0 ? '' : 'on'}`}>
                <span className="tour-avatar" style={{ ['--hue' as string]: player.hue }}>
                  {player.login.charAt(0).toUpperCase()}
                </span>
                <strong>{player.login}</strong>
                <span className="tour-chip tour-end">
                  {t('notgames.lives', { n: player.lives })}
                </span>
              </span>
            ))}
          </div>
        )
      }}
    </Tour>
  )
}
