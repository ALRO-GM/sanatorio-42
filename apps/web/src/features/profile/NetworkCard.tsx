import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Meter } from '../network/Meter'
import { VerdictStats } from '../network/VerdictStats'
import { networkHref } from '../../shared/links'

/** Con cuántas personas se resume tu red. */
const SHOWN = 5

/**
 * Tu red de correcciones, en pequeño: cuánto has corregido, con cuánta gente
 * distinta, tu endogamia y con quién te cruzas más. El grafo entero está en la
 * sección Red.
 */
export function NetworkCard({ me }: { me: string }) {
  const { t } = useI18n()
  // Centrado en ti y sin fechas: tu historia entera en el campus.
  const { data, error, loading, reload } = useAsync(
    () => api.getNetwork({ login: me, min: 1, limit: 150 }),
    [me],
  )
  const mine = data?.nodes.find((node) => node.login === me)
  const partners = (data?.links ?? [])
    .flatMap((link) => {
      if (link.source === me) return [{ login: link.target, gave: link.forth, got: link.back }]

      return link.target === me ? [{ login: link.source, gave: link.back, got: link.forth }] : []
    })
    .sort((a, b) => b.gave + b.got - (a.gave + a.got))

  return (
    <article className="card net-card">
      <div className="card-head">
        <span className="eyebrow">{t('net.card.title')}</span>
        <a className="link" href={networkHref(me)}>
          {t('net.card.open')}
        </a>
      </div>
      {loading && <p className="estado">{t('net.loading')}</p>}
      {!loading && data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined && mine === undefined && (
        <p className="estado">
          {data.sync.phase === 'done' ? t('net.card.empty') : t('net.card.copying')}
        </p>
      )}
      {mine !== undefined && (
        <>
          <dl className="net-facts">
            <div>
              <dt>{t('net.given')}</dt>
              <dd>{mine.given}</dd>
            </div>
            <div>
              <dt>{t('net.received')}</dt>
              <dd>{mine.received}</dd>
            </div>
            <div>
              <dt>{t('net.partners')}</dt>
              <dd>{mine.partners}</dd>
            </div>
          </dl>
          <VerdictStats node={mine} />
          <Meter label={t('net.endogamy')} value={mine.endogamy} />
          <p className="hint">
            {t('net.personBreakdown', {
              repetition: Math.round(mine.repetition * 100),
              reciprocity: Math.round(mine.reciprocity * 100),
            })}
          </p>
          {partners.length > 0 && (
            <>
              <span className="eyebrow">{t('net.mostWith')}</span>
              <ul className="net-rows static">
                {partners.slice(0, SHOWN).map((partner) => (
                  <li key={partner.login}>
                    <span className="net-row-name">{partner.login}</span>
                    <span className="net-row-count" title={t('net.gaveGot')}>
                      {partner.gave} → · ← {partner.got}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </article>
  )
}
