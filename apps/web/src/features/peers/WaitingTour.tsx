import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Waiting = {
  project: boolean
  /** La ficha de la persona, abierta para reservarle un rato. */
  open: boolean
  slot: boolean
  sent: boolean
  duty: boolean
}

const START: Waiting = { project: false, open: false, slot: false, sent: false, duty: false }

export const TOUR = defineTour<Waiting>('waiting', START, [
  ...click<Waiting>(500, 'proj', { project: true }),
  [1700, { caption: 2 }],
  [3400, { caption: 3 }],
  ...click<Waiting>(3400, 'p1', { open: true }),
  ...click<Waiting>(4700, 'slot', { slot: true }),
  ...click<Waiting>(5700, 'send', { sent: true }),
  [6700, { caption: 4 }],
  ...cut<Waiting>(8600, { scene: 1, caption: 5, cursor: 'rest' }),
  ...click<Waiting>(9900, 'duty', { duty: true }),
  [10900, { caption: 6 }],
])

const PROJECTS = ['libft', 'ft_printf', 'push_swap']

/**
 * Cómo funciona la sala de espera: eliges el proyecto, ves quién está de
 * guardia y dónde, y le reservas un rato; y cómo te pones tú de guardia.
 */
export function WaitingTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.ayuda')} sub={() => t('nav.consulta')}>
      {(shot) =>
        shot.scene === 0 ? (
          <>
            <strong>{t('projects.title')}</strong>
            <div className="tour-row">
              {PROJECTS.map((project, index) => (
                <span
                  key={project}
                  data-tour={index === 2 ? 'proj' : undefined}
                  className={`tour-pill ${index === 2 && shot.project ? 'on' : ''}`}
                >
                  {project}
                </span>
              ))}
            </div>
            {shot.project && (
              <div className="tour-split tour-in">
                <div className="tour-card">
                  <strong>{t('peers.title', { project: 'push_swap' })}</strong>
                  <span className={`tour-item ${shot.open ? 'on' : ''}`} data-tour="p1">
                    <span className="tour-avatar">M</span>
                    <span>
                      <strong>mgarcia</strong>
                      <span className="tour-muted">c1r2s4</span>
                    </span>
                    <span className="tour-chip star tour-end">
                      <Icon name="estrella" size={13} /> {t('peers.specialist')}
                    </span>
                  </span>
                  <span className="tour-item">
                    <span className="tour-avatar" style={{ ['--hue' as string]: 280 }}>
                      L
                    </span>
                    <span>
                      <strong>lsoto</strong>
                      <span className="tour-muted">c2r1s7</span>
                    </span>
                    <span className="tour-chip tour-end">{t('peers.badgeOn')}</span>
                  </span>
                </div>
                {shot.open && (
                  <div className="tour-card tour-in">
                    <strong>{t('help.bookTitle', { login: 'mgarcia' })}</strong>
                    <div className="tour-row">
                      <span className="tour-pill">16:30</span>
                      <span className={`tour-pill ${shot.slot ? 'on' : ''}`} data-tour="slot">
                        17:00
                      </span>
                      <span className="tour-pill">17:30</span>
                    </div>
                    {shot.sent ? (
                      <span className="tour-notice tour-in">
                        <Icon name="hecho" size={13} /> {t('help.bookSent', { login: 'mgarcia' })}
                      </span>
                    ) : (
                      <div className="tour-row">
                        <span className="tour-button" data-tour="send">
                          {t('help.bookSend')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* El interruptor va en la cabecera, junto al botón de tu on-call. */}
            <div className="tour-row">
              <span className="tour-pill tour-end">{t('duty.label')}</span>
              <span className={`tour-switch ${shot.duty ? 'on' : ''}`} data-tour="duty" />
            </div>
            <div className="tour-card">
              <strong>{t('peers.title', { project: 'push_swap' })}</strong>
              <span className="tour-item">
                <span className="tour-avatar">M</span>
                <strong>mgarcia</strong>
                <span className="tour-chip tour-end">{t('peers.badgeOn')}</span>
              </span>
              {shot.duty && (
                <span className="tour-item on tour-in">
                  <span className="tour-avatar" style={{ ['--hue' as string]: 120 }}>
                    T
                  </span>
                  <strong>tlopez</strong>
                  <span className="tour-chip tour-end">{t('peers.badgeOn')}</span>
                </span>
              )}
            </div>
          </>
        )
      }
    </Tour>
  )
}
