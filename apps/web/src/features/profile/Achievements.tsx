import type { AchievementId, Expediente } from '@sanatorio/contracts'

import { courseIcon, isCourseAchievement } from '../../shared/courseTitles'
import { useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'

const ACHIEVEMENT_ICONS = new Map<string, IconName>(
  Object.entries({
    first_duty: 'estrella',
    group_therapy: 'terapia',
    selfless_help: 'corazon',
    board_teacher: 'pizarras',
    campus_guardian: 'escudo',
  }),
)

const iconOf = (id: AchievementId): IconName =>
  ACHIEVEMENT_ICONS.get(id) ?? (isCourseAchievement(id) ? courseIcon(id) : 'estrella')

type Achievement = Expediente['achievements'][number]

/** Una lista de logros: los conseguidos encendidos y los demás con lo que les falta. */
function AchievementRows({ entries, label }: { entries: readonly Achievement[]; label: string }) {
  const { t } = useI18n()

  return (
    <ul className="rows" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.id} className={`row ${entry.unlocked ? 'unlocked' : 'locked'}`}>
          <span className="row-icon" aria-hidden="true">
            <Icon name={iconOf(entry.id)} size={20} />
          </span>
          <span>
            <strong>{t(`ach.${entry.id}`)}</strong>
            <small>
              {entry.unlocked
                ? t(`ach.${entry.id}.d`, { goal: entry.goal })
                : t('xp.lockedAt', { progress: entry.progress, goal: entry.goal })}
              {/* Lo que da (los de los cursos), una sola vez. */}
              {entry.xp !== undefined && (
                <>
                  {' · '}
                  {t('unlock.xp', { xp: entry.xp })}
                </>
              )}
            </small>
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Los logros y las reacciones recibidas, lado a lado, y debajo los de los
 * cursos (`docs/cursos-logros.md`), que también son títulos. Igual en el
 * expediente propio y en el de otra persona.
 */
export function Achievements({
  achievements,
  reactions,
}: {
  achievements: Expediente['achievements']
  reactions: Expediente['reactions']
}) {
  const { t } = useI18n()
  const general = achievements.filter((entry) => !isCourseAchievement(entry.id))
  const courses = achievements.filter((entry) => isCourseAchievement(entry.id))

  return (
    <>
      <div className="two-col">
        <article className="card">
          <span className="eyebrow">{t('xp.achievements')}</span>
          <AchievementRows entries={general} label={t('xp.achievements')} />
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

      {courses.length > 0 && (
        <article className="card course-achievements">
          <span className="eyebrow">
            {t('xp.courseAchievements', {
              n: courses.filter((entry) => entry.unlocked).length,
              total: courses.length,
            })}
          </span>
          <AchievementRows entries={courses} label={t('xp.courseAchievementsList')} />
        </article>
      )}
    </>
  )
}
