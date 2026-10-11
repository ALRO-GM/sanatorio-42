import type { QuotaStatus } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'

/**
 * Aviso de que la API de 42 va justa y, si te toca esperar, tu turno en la
 * cola, como el tique de una sala de espera: tu número, por cuál van y cuánto
 * se calcula que falta. El estado llega con el pulso de la web (`usePulse`).
 *
 * Con la cuota bien y sin turno no pinta nada.
 */
export function QuotaNotice({ status }: { status: QuotaStatus | null }) {
  const { t } = useI18n()

  if (status === null || (status.level === 'ok' && status.ticket === null)) return null

  const { ticket } = status

  return (
    <aside className="quota-notice" role="status" aria-live="polite">
      <p>
        <strong>{t(`quota.${status.level}.title`)}</strong> {t(`quota.${status.level}.body`)}
      </p>
      {ticket !== null && (
        <div className="quota-ticket">
          <span className="quota-ticket-head">{t('quota.ticket.title')}</span>
          <div className="quota-ticket-turn">
            <small>{t('quota.ticket.yours')}</small>
            <strong>{ticket.number}</strong>
          </div>
          <dl>
            <div>
              <dt>{t('quota.ticket.serving')}</dt>
              <dd>{ticket.serving ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('quota.ticket.ahead')}</dt>
              <dd>{ticket.ahead}</dd>
            </div>
            <div>
              <dt>{t('quota.ticket.eta')}</dt>
              <dd>
                {ticket.etaMinutes === null
                  ? t('quota.ticket.etaUnknown')
                  : t('quota.ticket.etaMinutes', { n: ticket.etaMinutes })}
              </dd>
            </div>
          </dl>
          <small className="quota-ticket-foot">{t('quota.ticket.foot')}</small>
        </div>
      )}
    </aside>
  )
}
