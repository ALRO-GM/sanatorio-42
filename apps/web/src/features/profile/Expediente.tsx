import { titleText } from './title'
import type { CurrentUser, Profile } from '@sanatorio/contracts'

import type { AsyncState } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { intraHref } from '../../shared/links'
import { Show } from '../../shared/detail'
import { Blocks } from '../../shared/layout/Blocks'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { TitleBanner } from '../../shared/ui/TitleBanner'
import { Achievements } from './Achievements'
import { AskedCard } from './AskedCard'
import { HealthCard } from './HealthCard'
import { HoursReport } from './HoursReport'
import { LeaderboardCard } from './LeaderboardCard'
import { NetworkCard } from './NetworkCard'
import { InfoTip } from '../../shared/ui/InfoTip'
import { Icon } from '../../shared/ui/Icon'
import { RecordTour } from './RecordTour'
import { LevelButton } from './LevelButton'
import { TitlePicker } from './TitlePicker'
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { MyShellCertificates } from '../../shared/course/Certificates'

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

  if (profile.loading) return <p>{t('xp.loading')}</p>
  if (profile.data === undefined) {
    return <ErrorNote error={profile.error} onRetry={() => void profile.reload()} />
  }

  const { xp, title, hacks, master, titles, achievements, reactions, rules, earned } = profile.data
  const nextTitle = titles.find((entry) => !entry.unlocked)
  // Avance dentro del nivel actual, no sobre el total: la barra se vacía al subir.
  const pct =
    xp.next === null ? 100 : Math.round(((xp.total - xp.floor) / (xp.next - xp.floor)) * 100)

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
                <TitleBanner title={title} />
                <div className="record-head">
                  <Avatar login={me.login} image={me.image} size={72} />
                  <div className="record-name">
                    <strong>{me.login}</strong>
                    <span className="record-title">{titleText(t, title, hacks, master)}</span>
                  </div>
                  <LevelButton xp={xp} rules={rules} earned={earned} />
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
                    {t('record.intra')} <Icon name="fuera" size={14} />
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

                <TitlePicker
                  title={title}
                  titles={titles}
                  hacks={hacks}
                  master={master}
                  onSaved={profile.reload}
                />
                {/* Los niveles del curso de shell superados (jefes finales). */}
                <PoolOnly k="shellcourse">
                  <MyShellCertificates />
                </PoolOnly>
                <Show from="normal">
                  <PoolOnly k="expediente.hours">
                    <HoursReport folded />
                  </PoolOnly>
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
