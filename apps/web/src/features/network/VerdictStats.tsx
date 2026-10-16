import type { NetworkNode } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { passColor, badgeStyle } from './colors'

/**
 * Las dos caras de una persona en las correcciones, sin mezclarlas:
 *
 *  - **como corrector**: los proyectos de otros que ha evaluado y cuántos aprobó;
 *  - **como corregido**: las evaluaciones de sus propios proyectos y en cuántas
 *    se los aprobaron.
 */
export function VerdictStats({ node }: { node: NetworkNode }) {
  const { t } = useI18n()

  return (
    <div className="net-verdicts">
      <Side
        title={t('net.asCorrector')}
        subtitle={t('net.asCorrector.hint')}
        count={t('net.asCorrector.count', { n: node.given })}
        rate={node.givenPassRate}
        passes={(pct) => t('net.asCorrector.pass', { pct })}
        fails={(pct) => t('net.asCorrector.fail', { pct })}
        unknown={t('net.verdictUnknown')}
      />
      <Side
        title={t('net.asCorrected')}
        subtitle={t('net.asCorrected.hint')}
        count={t('net.asCorrected.count', { n: node.received })}
        rate={node.receivedPassRate}
        passes={(pct) => t('net.asCorrected.pass', { pct })}
        fails={(pct) => t('net.asCorrected.fail', { pct })}
        unknown={t('net.verdictUnknown')}
      />
    </div>
  )
}

type SideProps = {
  title: string
  subtitle: string
  count: string
  /** Parte de aprobados (0-1), o `null` si no hay datos suficientes. */
  rate: number | null
  passes: (pct: number) => string
  fails: (pct: number) => string
  unknown: string
}

function Side({ title, subtitle, count, rate, passes, fails, unknown }: SideProps) {
  const pass = rate === null ? null : Math.round(rate * 100)

  return (
    <div className="net-verdict">
      <strong>{title}</strong>
      <small>{subtitle}</small>
      <span className="net-verdict-count">{count}</span>
      {rate === null || pass === null ? (
        <small>{unknown}</small>
      ) : (
        <>
          <div className="net-verdict-bar" aria-hidden="true">
            <span style={{ width: `${pass}%` }} />
          </div>
          <span className="net-verdict-line">
            <span>{passes(pass)}</span>
            <span className="net-row-badge" style={badgeStyle(passColor(rate))}>
              {fails(100 - pass)}
            </span>
          </span>
        </>
      )}
    </div>
  )
}
