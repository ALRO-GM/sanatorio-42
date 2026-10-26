import { useI18n } from '../../shared/i18n'
import { MiniGraph } from '../../shared/tour/MiniGraph'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Mailbox = { open: boolean; read: boolean }

const START: Mailbox = { open: false, read: false }

export const TOUR = defineTour<Mailbox>('mailbox', START, [
  ...click<Mailbox>(1500, 'bell', { open: true }),
  [2600, { caption: 2 }],
  ...click<Mailbox>(4300, 'n1', { read: true }),
  ...cut<Mailbox>(5300, { scene: 1, caption: 3, open: false, cursor: 'rest' }),
])

/**
 * Cómo funciona el buzón: el número rojo son avisos sin leer, dentro está lo
 * que te ha pasado y cada aviso lleva a donde se ve.
 */
export function MailboxTour() {
  const { t } = useI18n()

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.ayuda')}
      sub={(shot) => t(shot.scene === 0 ? 'nav.consulta' : 'nav.tablon')}
      bell={(shot) => (shot.read ? 1 : 2)}
    >
      {(shot) => (
        <div className="tour-scene wide">
          <MiniGraph picked={shot.scene === 1} />
          {shot.open && (
            <div className="tour-pop tour-box">
              <strong>{t('notices.title')}</strong>
              <span className="tour-row">
                <span className="tour-pill on">{t('notices.tab.notices')}</span>
                <span className="tour-pill">{t('notices.tab.chats')}</span>
              </span>
              <span className="tour-notice" data-tour="n1">
                <Icon name="pregunta" size={14} />
                {t('notices.kind.doubt_answered', { from: 'lsoto' })}
              </span>
              <span className="tour-notice">
                <Icon name="guardia" size={14} />
                {t('notices.kind.booking_requested', { from: 'mgarcia' })}
              </span>
            </div>
          )}
          {shot.scene === 1 && (
            <div className="tour-pop tour-side">
              <strong>{t('board.guide', { project: 'push_swap' })}</strong>
              <span className="tour-item">
                <Icon name="pregunta" size={14} />
                <span>{t('tour.board.q')}</span>
              </span>
              <span className="tour-item on">
                <span className="tour-avatar" style={{ ['--hue' as string]: 280 }}>
                  L
                </span>
                <span>{t('tour.board.a')}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </Tour>
  )
}
