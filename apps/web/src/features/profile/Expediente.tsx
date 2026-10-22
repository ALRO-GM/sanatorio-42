import { useState } from 'react'

import { titleText } from './title'
import type { CurrentUser, Profile, TitleId, XpKind } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import type { AsyncState } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { intraHref } from '../../shared/links'
import { Show, useDetail } from '../../shared/detail'
import { Blocks } from '../../shared/layout/Blocks'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Achievements } from './Achievements'
import { AskedCard } from './AskedCard'
import { HealthCard } from './HealthCard'
import { HoursReport } from './HoursReport'
import { LeaderboardCard } from './LeaderboardCard'
import { NetworkCard } from './NetworkCard'
import { InfoTip } from '../../shared/ui/InfoTip'
import { RecordTour } from './RecordTour'

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
  // Cómo se gana XP y cuánta llevas con cada cosa: plegado hasta que se pide.
  const detail = useDetail()
  // En el modo de datos, el desglose de la XP viene abierto.
  const [showRules, setShowRules] = useState(() => detail === 'datos')

  if (profile.loading) return <p>{t('xp.loading')}</p>
  if (profile.data === undefined) {
    return <ErrorNote error={profile.error} onRetry={() => void profile.reload()} />
  }

  const { xp, title, hacks, master, titles, achievements, reactions, rules, earned } = profile.data
  // La barra más larga es la de lo que más XP te ha dado.
  const most = Math.max(1, ...RULES.map((kind) => earned[kind].xp))
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
      <h2>
        {t('xp.title')}
        <InfoTip title={t('xp.title')}>
          <RecordTour />
        </InfoTip>
      </h2>

      <Blocks
        page="expediente"
        blocks={[
          {
            id: 'record',
            content: (
              <article className="card record">
                <div className="banner" />
                <div className="record-head">
                  <Avatar login={me.login} image={me.image} size={72} />
                  <div className="record-name">
                    <strong>{me.login}</strong>
                    <span className="record-title">{titleText(t, title, hacks, master)}</span>
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
                  {nextTitle && (
                    <span>{t('xp.nextTitle', { title: t(`title.${nextTitle.id}`) })}</span>
                  )}
                  {/* Tu perfil en la intra, también desde el tuyo (#78 del buzón). */}
                  <a
                    className="profile-link"
                    href={intraHref(me.login)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('record.intra')}
                  </a>
                </div>
                <div className="xp-row">
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
                  <button
                    type="button"
                    className={`xp-toggle ${showRules ? 'open' : ''}`}
                    aria-expanded={showRules}
                    aria-controls="xp-breakdown"
                    onClick={() => {
                      setShowRules((open) => !open)
                    }}
                  >
                    {/* Con texto: la flecha sola era pequeña y no se veía que abre algo. */}
                    {t('xp.howTo')} <span aria-hidden="true">▾</span>
                  </button>
                </div>

                {showRules && (
                  <ul id="xp-breakdown" className="xp-breakdown">
                    {RULES.map((kind) => (
                      <li key={kind} className={earned[kind].times === 0 ? 'none' : ''}>
                        <span className="xp-what">{t(`xp.rule.${kind}`, { xp: rules[kind] })}</span>
                        <span className="xp-meter" aria-hidden="true">
                          <span style={{ width: `${(earned[kind].xp / most) * 100}%` }} />
                        </span>
                        <span className="xp-got">
                          <strong>{t('xp.gotXp', { xp: earned[kind].xp })}</strong>
                          <small>
                            {t(earned[kind].times === 1 ? 'xp.gotOnce' : 'xp.gotTimes', {
                              n: earned[kind].times,
                            })}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

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
                      {titleText(t, entry.id, hacks, master)}
                      {!entry.unlocked && ` · ${t('xp.locked', { level: entry.level })}`}
                    </button>
                  ))}
                </div>
                <ErrorNote error={error} />
                <Show from="normal">
                  <HoursReport />
                </Show>
              </article>
            ),
          },
          { id: 'health', content: <HealthCard /> },
          { id: 'network', content: <NetworkCard me={me.login} /> },
          {
            id: 'achievements',
            content: <Achievements achievements={achievements} reactions={reactions} />,
          },
          {
            id: 'ranking',
            content: (
              <div className="two-col">
                <LeaderboardCard me={me.login} />
                <AskedCard />
              </div>
            ),
          },
        ]}
      />
    </section>
  )
}
