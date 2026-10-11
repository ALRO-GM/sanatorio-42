import type { AchievementId } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { NetworkCard } from './NetworkCard'

const ACHIEVEMENT_ICONS: Record<AchievementId, string> = {
  first_duty: '⭐',
  group_therapy: '🫂',
  selfless_help: '💚',
  board_teacher: '🧑‍🏫',
  campus_guardian: '🛡️',
}

/**
 * El expediente de otra persona: su nivel, su título, sus logros, las
 * reacciones que ha recibido y su red de correcciones.
 *
 * Es de solo lectura y enseña menos que el propio: ni el desglose de XP, ni el
 * estado de salud, ni las preferencias. Se abre con `#/expediente/<login>`.
 */
export function PublicRecord({ login }: { login: string }) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getPublicProfile(login), [login])

  if (loading) return <p>{t('xp.loading')}</p>
  if (data === undefined) {
    return (
      <section>
        <a className="back-btn" href="#/expediente">
          {t('record.backToMine')}
        </a>
        <ErrorNote error={error} onRetry={() => void reload()} />
      </section>
    )
  }

  const { xp, title, achievements, reactions } = data
  const pct =
    xp.next === null ? 100 : Math.round(((xp.total - xp.floor) / (xp.next - xp.floor)) * 100)

  return (
    <section>
      <a className="back-btn" href="#/expediente">
        {t('record.backToMine')}
      </a>
      <h2>{t('record.of', { login: data.login })}</h2>

      <article className="card record">
        <div className="banner" />
        <div className="record-head">
          <Avatar login={data.login} image={data.image} size={72} />
          <div className="record-name">
            <strong>{data.login}</strong>
            <span className="record-title">{t(`title.${title}`)}</span>
          </div>
          <div className="level">
            <span className="eyebrow">{t('xp.level')}</span>
            <strong>{xp.level}</strong>
          </div>
        </div>

        <div className="xp-line">
          <span>
            {xp.next === null
              ? t('xp.max', { xp: xp.total })
              : t('xp.progress', { xp: xp.total, next: xp.next })}
          </span>
          <a
            className="profile-link"
            href={`https://profile.intra.42.fr/users/${data.login}`}
            target="_blank"
            rel="noreferrer"
          >
            {t('record.intra')}
          </a>
        </div>
        <div
          className="xp-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t('xp.level')}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </article>

      <NetworkCard me={data.login} />

      <div className="two-col">
        <article className="card">
          <span className="eyebrow">{t('xp.achievements')}</span>
          <ul className="rows">
            {achievements.map((entry) => (
              <li key={entry.id} className={`row ${entry.unlocked ? 'unlocked' : 'locked'}`}>
                <span className="row-icon" aria-hidden="true">
                  {ACHIEVEMENT_ICONS[entry.id]}
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
                  {emoji}
                </span>
                <span>{t(`react.${kind}`)}</span>
                <strong className="row-count">{reactions[kind]}</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
