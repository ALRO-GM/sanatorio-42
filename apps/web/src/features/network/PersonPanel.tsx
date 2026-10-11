import { useState } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import type { NetworkParams } from '../../shared/api/types'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Meter } from './Meter'
import { PairDetail } from './PairDetail'

type PersonPanelProps = {
  node: NetworkNode
  links: readonly NetworkLink[]
  /** Filtros del grafo: el detalle de una pareja cuenta lo mismo. */
  params: NetworkParams
  /** `true` si el grafo ya está centrado en esta persona. */
  focused: boolean
  onFocus: (login: string | null) => void
  onSelect: (login: string) => void
  onClose: () => void
}

/** Con cuánta gente se enseña el detalle. */
const SHOWN = 8

/** La ficha de la persona elegida en el grafo: sus cuentas y con quién se cruza más. */
export function PersonPanel({
  node,
  links,
  params,
  focused,
  onFocus,
  onSelect,
  onClose,
}: PersonPanelProps) {
  const { t } = useI18n()
  // Pareja de la que se están viendo las correcciones una a una.
  const [open, setOpen] = useState<string | null>(null)
  const partners = links
    .flatMap((link) => {
      if (link.source === node.login) {
        return [{ login: link.target, gave: link.forth, got: link.back }]
      }

      return link.target === node.login
        ? [{ login: link.source, gave: link.back, got: link.forth }]
        : []
    })
    .sort((a, b) => b.gave + b.got - (a.gave + a.got))

  return (
    <article className="card net-panel">
      <div className="net-panel-head">
        <Avatar login={node.login} image={node.image} size={48} />
        <div>
          <a
            className="profile-link"
            href={`https://profile.intra.42.fr/users/${node.login}`}
            target="_blank"
            rel="noreferrer"
          >
            {node.login}
          </a>
          <small>
            {node.external ? t('net.external') : t('net.fromCampus')}
            {node.cohort !== null && ` · ${t('net.since', { year: node.cohort })}`}
          </small>
        </div>
        <button type="button" className="link" aria-label={t('net.close')} onClick={onClose}>
          ✕
        </button>
      </div>

      <dl className="net-facts">
        <div>
          <dt>{t('net.given')}</dt>
          <dd>{node.given}</dd>
        </div>
        <div>
          <dt>{t('net.received')}</dt>
          <dd>{node.received}</dd>
        </div>
        <div>
          <dt>{t('net.partners')}</dt>
          <dd>{node.partners}</dd>
        </div>
      </dl>

      {node.passRate !== null && (
        <p className="net-passrate">
          {t('net.passRate', { pct: Math.round(node.passRate * 100) })}
        </p>
      )}

      <Meter label={t('net.endogamy')} value={node.endogamy} />
      <p className="hint">
        {t('net.personBreakdown', {
          repetition: Math.round(node.repetition * 100),
          reciprocity: Math.round(node.reciprocity * 100),
        })}
      </p>

      <button
        type="button"
        className="pill"
        onClick={() => {
          onFocus(focused ? null : node.login)
        }}
      >
        {focused ? t('net.backToAll') : t('net.onlyThis')}
      </button>

      {partners.length > 0 && (
        <>
          <span className="eyebrow">{t('net.mostWith')}</span>
          <ul className="net-rows">
            {partners.slice(0, SHOWN).map((partner) => (
              <li key={partner.login}>
                <button
                  type="button"
                  aria-expanded={open === partner.login}
                  onClick={() => {
                    setOpen(open === partner.login ? null : partner.login)
                  }}
                >
                  <span className="net-row-name">{partner.login}</span>
                  <span className="net-row-count" title={t('net.gaveGot')}>
                    {partner.gave} → · ← {partner.got}
                  </span>
                </button>
                {open === partner.login && (
                  <div className="net-pair-box">
                    <PairDetail a={node.login} b={partner.login} params={params} />
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        onSelect(partner.login)
                      }}
                    >
                      {t('net.pair.open', { login: partner.login })}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {partners.length > SHOWN && (
            <p className="hint">{t('net.andMore', { n: partners.length - SHOWN })}</p>
          )}
        </>
      )}
    </article>
  )
}
