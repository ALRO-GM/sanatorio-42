import type { MaintenanceStatus } from '@sanatorio/contracts'

import { usePolling } from '../../shared/hooks/usePolling'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { loadMaintenance } from '../../shared/maintenance'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { Icon } from '../../shared/ui/Icon'
import { Logo } from '../../shared/ui/Logo'

/** Cada cuánto se vuelve a mirar si ya ha acabado: al acabar, la web vuelve sola. */
const CHECK_MS = 30_000

/**
 * La pantalla de mantenimiento (`docs/mantenimiento.md`): lo que ve quien no
 * administra mientras la web está cerrada. Con la hora prevista, una cuenta
 * atrás; al acabar el mantenimiento, la web vuelve sin recargar.
 *
 * Sin sesión, un enlace discreto para entrar: es como entra quien administra.
 */
export function MaintenanceScreen({
  status,
  onLogin,
}: {
  status: MaintenanceStatus
  onLogin?: () => void
}) {
  const { t } = useI18n()
  const { time } = useFormat()
  const until = status.until === null ? null : Date.parse(status.until)
  const now = useNow(1000, { active: until !== null })

  usePolling(loadMaintenance, CHECK_MS)

  return (
    <main className="maintenance-screen" aria-labelledby="maintenance-title">
      <div className="maintenance-card">
        <Logo />
        <span className="maintenance-badge">
          <Icon name="llave" /> {t('maint.badge')}
        </span>
        <h1 id="maintenance-title">{t('maint.title')}</h1>
        <p className="maintenance-lead">{t('maint.lead')}</p>
        {status.message !== null && <p className="maintenance-message">{status.message}</p>}

        {until !== null &&
          (until > now ? (
            <div className="maintenance-count" role="timer" aria-label={t('maint.backIn')}>
              <small>{t('maint.backIn')}</small>
              <CountdownClock at={until} now={now} className="big" />
              <small>{t('maint.around', { time: time(until) })}</small>
            </div>
          ) : (
            <p className="maintenance-overdue" role="status">
              {t('maint.overdue')}
            </p>
          ))}

        <div className="actions">
          <button type="button" className="pill" onClick={() => void loadMaintenance()}>
            {t('maint.check')}
          </button>
          {onLogin !== undefined && (
            <button type="button" className="link" onClick={onLogin}>
              {t('maint.adminLogin')}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
