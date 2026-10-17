import type { AchievementId, Expediente } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'

const ACHIEVEMENT_ICONS: Record<AchievementId, IconName> = {
  first_duty: 'estrella',
  group_therapy: 'terapia',
  selfless_help: 'corazon',
  board_teacher: 'pizarras',
  campus_guardian: 'escudo',
}

/**
 * Los logros y las reacciones recibidas, lado a lado. Igual en el expediente
 * propio y en el de otra persona.
 */
export function Achievements({
  achievements,
  reactions,
}: {
  achievements: Expediente['achievements']
  reactions: Expediente['reactions']
}) {
  const { t } = useI18n()

  return (
    <div className="two-col">
      <article className="card">
        <span className="eyebrow">{t('xp.achievements')}</span>
        <ul className="rows">
          {achievements.map((entry) => (
            <li key={entry.id} className={`row ${entry.unlocked ? 'unlocked' : 'locked'}`}>
              <span className="row-icon" aria-hidden="true">
                <Icon name={ACHIEVEMENT_ICONS[entry.id]} size={20} />
              </span>
              <span>
                <strong>{t(`ach.${entry.id}`)}</strong>
                <small>
                  {entry.unlocked
                    ? t(`ach.${entry.id}.d`, { goal: entry.goal })
                    : t('xp.lockedAt', { progress: entry.progress, goal: entry.goal })}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className="card">
        <span className="eyebrow">{t('xp.reactions')}</span>
        <ul className="rows">
          {REACTIONS.map(({ kind, emoji }) => (
            <li key={kind} className="row plain">
              <span className="row-icon" aria-hidden="true">
                <Icon name={emoji} size={20} />
              </span>
              <span>{t(`react.${kind}`)}</span>
              <strong className="row-count">{reactions[kind]}</strong>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
