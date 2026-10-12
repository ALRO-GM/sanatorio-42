import { api } from '../../shared/api'
import type { NetworkParams } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type PairDetailProps = {
  a: string
  b: string
  /** Los filtros de fecha y proyecto del grafo, para contar lo mismo. */
  params: NetworkParams
}

/** Las correcciones que se han hecho dos personas: cuándo, de qué y con qué nota. */
export function PairDetail({ a, b, params }: PairDetailProps) {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(
    () => api.getNetworkPair(a, b, params),
    [a, b, params],
  )

  if (loading) return <p className="hint">{t('net.pair.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  return (
    <div className="net-pair">
      <p className="hint">{t('net.pair.summary', { a, b, forth: data.forth, back: data.back })}</p>
      <ol>
        {data.corrections.map((row) => (
          <li key={`${row.id}-${row.corrected}`}>
            <time dateTime={row.at}>
              {new Date(row.at).toLocaleDateString(localeOf(lang), {
                day: 'numeric',
                month: 'short',
                year: '2-digit',
              })}
            </time>
            <span className="net-pair-what">
              <strong>{row.project ?? t('net.pair.unknownProject')}</strong>
              <small>
                {row.corrector} → {row.corrected}
              </small>
            </span>
            <span
              className={`net-pair-mark ${row.positive === false ? 'fail' : row.positive === true ? 'pass' : ''}`}
            >
              {row.mark ?? '–'}
            </span>
          </li>
        ))}
      </ol>
      {data.corrections.length < data.forth + data.back && (
        <p className="hint">{t('net.pair.more', { n: data.corrections.length })}</p>
      )}
    </div>
  )
}
