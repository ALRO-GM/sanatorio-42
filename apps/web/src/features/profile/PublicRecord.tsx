import { titleText } from './title'
import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useBorrowedStyle } from '../../shared/theme'
import { themeOf } from '../../themes'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Achievements } from './Achievements'
import { HealthCard } from './HealthCard'
import { NetworkCard } from './NetworkCard'
import { Icon } from '../../shared/ui/Icon'
import { intraHref } from '../../shared/links'
import { directChatId, openChat } from '../notices/conversations'

/**
 * El expediente de otra persona: su nivel, su título, sus logros, las
 * reacciones que ha recibido y su red de correcciones.
 *
 * Es de solo lectura y enseña menos que el propio: ni el desglose de XP ni las
 * preferencias. El estado de salud sí. Se abre con `#/expediente/<login>`.
 */
export function PublicRecord({ login, me }: { login: string; me: string }) {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getPublicProfile(login), [login])
  // Si su dueña eligió con qué estilo se ve su expediente, se ve con ese.
  const style = data?.recordStyle ?? null

  useBorrowedStyle(style)

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

  const { xp, title, hacks, master, achievements, reactions } = data
  const pct =
    xp.next === null ? 100 : Math.round(((xp.total - xp.floor) / (xp.next - xp.floor)) * 100)

  return (
    <section>
      <a className="back-btn" href="#/expediente">
        {t('record.backToMine')}
      </a>
      <h2>{t('record.of', { login: data.login })}</h2>
      {style !== null && (
        <p className="hint record-style">
          <Icon name="estrella" size={14} />{' '}
          {t('record.styleOf', {
            login: data.login,
            style: themeOf(style).name[lang] ?? themeOf(style).name.es,
          })}
        </p>
      )}

      <article className="card record">
        <div className="banner" />
        <div className="record-head">
          <Avatar login={data.login} image={data.image} size={72} />
          <div className="record-name">
            <span className="record-login">
              <strong>{data.login}</strong>
              <button
                type="button"
                className="record-write"
                onClick={() => {
                  openChat(directChatId(me, data.login))
                }}
                title={t('record.write', { login: data.login })}
                aria-label={t('record.write', { login: data.login })}
              >
                <Icon name="chat" />
              </button>
            </span>
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
          <a className="profile-link" href={intraHref(data.login)} target="_blank" rel="noreferrer">
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

      <HealthCard health={data.health} />
      <NetworkCard me={data.login} />

      <Achievements achievements={achievements} reactions={reactions} />
    </section>
  )
}
