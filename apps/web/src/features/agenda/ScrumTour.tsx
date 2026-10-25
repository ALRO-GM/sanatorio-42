import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

/** Lo que cambia en el decorado: el checkpoint marcado, el desplegable y el daily guardado. */
type Scrum = { checked: boolean; menu: boolean; picked: boolean; saved: boolean }

const START: Scrum = { checked: false, menu: false, picked: false, saved: false }

export const TOUR = defineTour<Scrum>('scrum', START, [
  [1500, { caption: 2 }],
  ...click<Scrum>(1500, 'leaks', { checked: true }),
  ...cut<Scrum>(3800, { scene: 1, caption: 3, cursor: 'rest' }),
  ...click<Scrum>(5000, 'problem', { menu: true }),
  ...click<Scrum>(6200, 'memory', { menu: false, picked: true }),
  ...click<Scrum>(7400, 'save', { saved: true }),
  ...cut<Scrum>(9000, { scene: 2, caption: 4, cursor: 'rest' }),
])

/** Las filas del tablero del sprint de mentira: login, avance y si está atascado. */
const BOARD = [
  { login: 'ana-dev', progress: 85, stuck: false },
  { login: 'nora-c', progress: 60, stuck: true },
  { login: 'kiko42', progress: 20, stuck: false },
] as const

/**
 * Cómo funciona la agenda: una meta con sus checkpoints, un daily con el
 * atasco elegido de la lista y el tablero del sprint, donde tu grupo lo ve.
 */
export function ScrumTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.agenda')}>
      {(shot) =>
        shot.scene === 0 ? (
          <div className="tour-card">
            <strong>ft_printf</strong>
            <span className="tour-muted">{t('scrum.due.left.many', { n: 4 })} · 60 %</span>
            {(['works', 'subject', 'leaks', 'slots'] as const).map((key, index) => (
              <div key={key} className="tour-row">
                <span
                  className={`tour-check ${index < 2 || (key === 'leaks' && shot.checked) ? 'on' : ''}`}
                  data-tour={key}
                >
                  {(index < 2 || (key === 'leaks' && shot.checked)) && (
                    <Icon name="hecho" size={11} />
                  )}
                </span>
                <span>{t(`scrum.check.${key}`)}</span>
              </div>
            ))}
          </div>
        ) : shot.scene === 1 ? (
          <div className="tour-card tour-in">
            <strong>{t('scrum.kind.daily')}</strong>
            <div className="tour-row">
              <span className="tour-muted">{t('scrum.entry.problem')}</span>
              <span className="tour-select" data-tour="problem">
                {t(shot.picked ? 'scrum.problem.memory' : 'scrum.problem.none')} ▾
                {shot.menu && (
                  <span className="tour-menu">
                    <span>{t('scrum.problem.bug')}</span>
                    <span className="pick" data-tour="memory">
                      {t('scrum.problem.memory')}
                    </span>
                    <span>{t('scrum.problem.other')}</span>
                  </span>
                )}
              </span>
            </div>
            <div className="tour-row">
              <span className="tour-button" data-tour="save">
                {t('scrum.entry.save')}
              </span>
              {shot.saved && (
                <span className="tour-saved">
                  <Icon name="hecho" size={13} />
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="tour-card tour-in">
            <strong>{t('scrum.board.title')}</strong>
            {BOARD.map((row) => (
              <span key={row.login} className={`tour-item ${row.stuck ? 'on' : ''}`}>
                <span className="tour-avatar">{row.login.slice(0, 1).toUpperCase()}</span>
                <span>
                  {row.login} · {row.progress} %
                </span>
                {row.stuck && <span className="tour-chip">{t('scrum.problem.memory')}</span>}
              </span>
            ))}
          </div>
        )
      }
    </Tour>
  )
}
