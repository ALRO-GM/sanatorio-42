import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Tile } from './LimitParts'

/**
 * La cuota de la API de 42: 1 200 peticiones por hora que vuelven enteras a la
 * hora en punto y 2 por segundo. Sin topes diarios ni mensuales (42 no los
 * tiene): lo que se gasta en la hora, el ritmo de la copia, quién espera turno
 * y el modo ahorro. Los topes por función y por persona, en `ApiUsagePanel`.
 */
export function QuotaCard() {
  const { t } = useI18n()
  const { number, time } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getAdminQuota(), [])
  const action = useAction()

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const { settings } = data

  const toggleSaving = async (): Promise<void> => {
    if (await action.run(() => api.setAdminQuota({ saving: !settings.saving }))) await reload()
  }

  return (
    <article className={`card budget ${settings.saving ? 'saving' : ''}`}>
      <span className="eyebrow">{t('admin.quota.title')}</span>
      <div className="tiles">
        <Tile
          label={t('admin.quota.hour')}
          value={
            data.hourlyRemaining === null
              ? '—'
              : `${number(data.hourlyLimit - data.hourlyRemaining)} / ${number(data.hourlyLimit)}`
          }
          hint={t('admin.quota.hourHint', {
            left: data.hourlyRemaining ?? data.hourlyLimit,
            time: time(data.budget.resetsAt),
            perSecond: data.secondlyLimit,
          })}
        />
        <Tile
          label={t('admin.quota.state')}
          value={t(`admin.quota.level.${data.level}`)}
          hint={t('admin.quota.today', { n: data.day.spent })}
        />
        <Tile
          label={t('admin.quota.mode')}
          value={t(`admin.quota.mode.${data.budget.mode}`)}
          hint={t('admin.quota.modeHint', {
            reserve: number(data.budget.bulkReserve),
            time: time(data.budget.resetsAt),
          })}
        />
        <Tile
          label={t('admin.quota.queued')}
          value={data.queued}
          hint={t('admin.quota.queuedHint')}
        />
      </div>
      <div className="actions">
        <button
          type="button"
          className={`small ${settings.saving ? 'primary' : ''}`}
          aria-pressed={settings.saving}
          disabled={action.busy}
          onClick={() => void toggleSaving()}
        >
          {t(settings.saving ? 'admin.budget.savingOff' : 'admin.budget.savingOn')}
        </button>
      </div>
      <p className="hint">{t('admin.quota.hint')}</p>
      <ErrorNote error={action.error} />
    </article>
  )
}
