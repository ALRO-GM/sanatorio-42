import type { AchievementId, CurrentUser, Profile, TitleId, XpKind } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import type { AsyncState } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { AskedCard } from './AskedCard'
import { LeaderboardCard } from './LeaderboardCard'

/** Lo que da XP, en el orden en que se explica. */
const RULES = [
  'specialist_help',
  'peer_help',
  'doubt_solved',
  'guide_proposal',
  'guide_review',
  'board_host',
  'therapy_session',
] as const satisfies readonly XpKind[]

const ACHIEVEMENT_ICONS: Record<AchievementId, string> = {
  first_duty: '⭐',
  group_therapy: '🫂',
  selfless_help: '💚',
  board_teacher: '🧑‍🏫',
  campus_guardian: '🛡️',
}

type ExpedienteProps = {
  me: CurrentUser
  profile: AsyncState<Profile>
}

/**
 * Tu expediente: nivel, títulos, logros y reacciones recibidas.
 *
 * `profile` es el resultado de `useAsync(api.getProfile)`, que vive en `Clinic`
 * porque el pie también lo necesita para saber qué campus estás mirando.
 */
export function Expediente({ me, profile }: ExpedienteProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()

  if (profile.loading) return <p>{t('xp.loading')}</p>
  if (profile.data === undefined) {
    return <ErrorNote error={profile.error} onRetry={() => void profile.reload()} />
  }

  const { xp, title, titles, achievements, reactions, rules } = profile.data
  const nextTitle = titles.find((entry) => !entry.unlocked)
  // Avance dentro del nivel actual, no sobre el total: la barra se vacía al subir.
  const pct =
    xp.next === null ? 100 : Math.round(((xp.total - xp.floor) / (xp.next - xp.floor)) * 100)

  const choose = async (titleId: TitleId): Promise<void> => {
    if (await run(() => api.updateSettings({ title: titleId }))) {
      await profile.reload()
    }
  }

  return (
    <section>
      <h2>{t('xp.title')}</h2>

      <article className="card record">
        <div className="banner" />
        <div className="record-head">
          <Avatar login={me.login} image={me.image} size={72} />
          <div className="record-name">
            <strong>{me.login}</strong>
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
          {nextTitle && <span>{t('xp.nextTitle', { title: t(`title.${nextTitle.id}`) })}</span>}
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

        <div className="tiles">
          {RULES.map((kind) => (
            <div key={kind} className="tile">
              {t(`xp.rule.${kind}`, { xp: rules[kind] })}
            </div>
          ))}
        </div>

        <span className="eyebrow">{t('xp.titles')}</span>
        <div className="filter-pills">
          {titles.map((entry) => (
            <button
              key={entry.id}
              className={`pill ${entry.id === title ? 'active' : ''}`}
              disabled={!entry.unlocked || busy}
              aria-pressed={entry.id === title}
              onClick={() => void choose(entry.id)}
            >
              {t(`title.${entry.id}`)}
              {!entry.unlocked && ` · ${t('xp.locked', { level: entry.level })}`}
            </button>
          ))}
        </div>
        <ErrorNote error={error} />
      </article>

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

      <div className="two-col">
        <LeaderboardCard me={me.login} />
        <AskedCard />
      </div>
    </section>
  )
}
