import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { useMaintenance } from '../../shared/maintenance'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { Icon } from '../../shared/ui/Icon'

/**
 * A quien administra, mientras la web está en mantenimiento: una franja
 * arriba para que no se le olvide quitarlo (el resto ve la pantalla de
 * mantenimiento). Lleva al panel, que es donde se quita.
 */
export function MaintenanceBanner({ onPanel }: { onPanel: () => void }) {
  const { t } = useI18n()
  const status = useMaintenance()
  const until =
    status?.until === null || status?.until === undefined ? null : Date.parse(status.until)
  const now = useNow(1000, { active: status?.on === true && until !== null })

  if (status === null || !status.on || !status.exempt) return null

  return (
    <aside className="maintenance-banner" role="status">
      <Icon name="llave" />
      <span>
        <strong>{t('maint.banner.title')}</strong> {t('maint.banner.body')}
      </span>
      {until !== null && until > now && <CountdownClock at={until} now={now} />}
      <button type="button" className="pill" onClick={onPanel}>
        {t('maint.banner.go')}
      </button>
    </aside>
  )
}
