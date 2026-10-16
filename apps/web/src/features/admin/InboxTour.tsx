import { useI18n } from '../../shared/i18n'
import { click, cut, Tour, typing } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Inbox = {
  menu: boolean
  idea: boolean
  /** Letras del mensaje que ya se han escrito. */
  typed: number
  sent: boolean
}

const START: Inbox = { menu: false, idea: false, typed: 0, sent: false }

const LETTERS = 30

export const SCRIPT: readonly Cue<Inbox>[] = [
  ...click<Inbox>(900, 'kind', { menu: true }),
  ...click<Inbox>(1900, 'idea', { menu: false, idea: true }),
  [3000, { caption: 2 }],
  ...typing<Inbox>(3200, 'typed', LETTERS, 50),
  ...click<Inbox>(5000, 'send', { sent: true }),
  ...cut<Inbox>(6800, { scene: 1, caption: 3, cursor: 'rest' }),
]

/**
 * Cómo funciona el buzón de incidencias: eliges de qué se trata, lo escribes y
 * la respuesta llega ahí mismo, con aviso en el buzón.
 */
export function InboxTour() {
  const { t } = useI18n()
  const text = t('tour.inbox.text')

  return (
    <Tour
      name="inbox"
      start={START}
      script={SCRIPT}
      steps={[1, 2, 3]}
      tab={() => t('inbox.title')}
      bell={(shot) => (shot.scene === 1 ? 1 : 0)}
    >
      {(shot) => (
        <div className="tour-card">
          {shot.scene === 0 ? (
            <>
              <div className="tour-row">
                <span className="tour-select" data-tour="kind">
                  {t(shot.idea ? 'inbox.category.improvement' : 'inbox.category.bug')} ▾
                  {shot.menu && (
                    <span className="tour-menu">
                      <span>{t('inbox.category.bug')}</span>
                      <span className="pick" data-tour="idea">
                        {t('inbox.category.improvement')}
                      </span>
                    </span>
                  )}
                </span>
              </div>
              <div className="tour-row">
                <span className="tour-input typing">{text.slice(0, shot.typed)}</span>
              </div>
              <div className="tour-row">
                <span className="tour-button" data-tour="send">
                  {t('inbox.send')}
                </span>
                {shot.sent && (
                  <span className="tour-saved">
                    <Icon name="hecho" size={13} />
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="tour-item">
                <Icon name="idea" size={14} />
                <span>{text}</span>
              </span>
              <span className="tour-item on tour-in">
                <Icon name="chat" size={14} />
                <span>{t('tour.inbox.reply')}</span>
              </span>
            </>
          )}
        </div>
      )}
    </Tour>
  )
}
