import { useEffect, useState } from 'react'

import type { QuotaStatus } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'

/** Cada cuánto se pregunta: a menudo si esperas turno, poco si todo va bien. */
const EVERY_MS = { waiting: 20_000, tight: 60_000, ok: 300_000 }

/**
 * Aviso de que la API de 42 va justa y, si te toca esperar, tu turno en la
 * cola, como el tique de una sala de espera: tu número, por cuál van y cuánto
 * se calcula que falta. Se actualiza solo.
 *
 * Con la cuota bien y sin turno no pinta nada.
 */
export function QuotaNotice() {
  const { t } = useI18n()
  const [status, setStatus] = useState<QuotaStatus | null>(null)
  const waiting = status !== null && status.ticket !== null
  const pace = waiting ? 'waiting' : status !== null && status.level !== 'ok' ? 'tight' : 'ok'

  useEffect(() => {
    let alive = true
    const ask = (): void => {
      // Con la pestaña en segundo plano no se gasta una petición en un rótulo que nadie ve.
      if (document.hidden) return

      api.getQuota().then(
        (next) => {
          if (alive) setStatus(next)
        },
        () => undefined,
      )
    }

    ask()

    const timer = window.setInterval(ask, EVERY_MS[pace])

    document.addEventListener('visibilitychange', ask)

    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', ask)
    }
  }, [pace])

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
