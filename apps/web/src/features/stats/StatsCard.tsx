import type { StatsEntry, StatsTotal } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { RankingList, withMe } from '../../shared/ui/RankingList'

type StatsCardProps = {
  /** Para el id del título. */
  id: string
  title: string
  /** De qué va la clasificación: sale encima y nombra la lista. */
  rankLabel: string
  totals: readonly StatsTotal[]
  /** El nombre de cada cifra del campus. */
  totalLabel: (key: string) => string
  ranking: readonly StatsEntry[]
  /** Dónde está quien mira, aunque no entre en la lista. */
  mine: StatsEntry | null
  me: string
  /** Las dos cifras de cada fila, ya escritas. */
  value: (entry: StatsEntry) => string
  extra: (entry: StatsEntry) => string
}

/**
 * Una clasificación de Clasificaciones: las cifras del campus arriba y los
 * primeros puestos con foto, con tu fila aunque no entres. La usan las de
 * Ayuda y las de los cursos.
 */
export function StatsCard(props: StatsCardProps) {
  const { t } = useI18n()
  const { number } = useFormat()
  const rows = withMe(props.ranking, props.mine)

  return (
    <article className="card help-stats-card" aria-labelledby={`stats-${props.id}`}>
      <h3 id={`stats-${props.id}`}>{props.title}</h3>
      <dl className="help-stats-totals">
        {props.totals.map((total) => (
          <div key={total.key}>
            <dt>{props.totalLabel(total.key)}</dt>
            <dd>
              {/* Las horas llegan en minutos: se enseñan en horas, con un decimal. */}
              {total.key === 'minutes'
                ? number(Math.round(total.value / 6) / 10)
                : number(total.value)}
            </dd>
          </div>
        ))}
      </dl>

      <span className="eyebrow">{props.rankLabel}</span>
      {rows.length === 0 ? (
        <p className="estado">{t('stats.empty')}</p>
      ) : (
        <RankingList
          rows={rows}
          me={props.me}
          label={props.rankLabel}
          value={(entry) => (
            <span className="row-count">
              <strong>{props.value(entry)}</strong>
              <small>{props.extra(entry)}</small>
            </span>
          )}
        />
      )}
      {rows.length > 0 && props.mine === null && <p className="hint">{t('stats.notYet')}</p>}
    </article>
  )
}
