import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { FortyTwoQuotaSettings } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/** Un tope escrito en el formulario: vacío es "sin tope". */
const capOf = (text: string): number | null => (text.trim() === '' ? null : Number(text))

/**
 * La cuota de la API de 42: lo que queda esta hora, lo gastado hoy y este mes,
 * cuánta gente espera turno y los topes para regularla a mano.
 */
export function QuotaCard() {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getAdminQuota(), [])
  const action = useAction()
  const [draft, setDraft] = useState<{ daily: string; monthly: string; renewDay: string } | null>(
    null,
  )

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const { settings, day, month } = data
  const form = draft ?? {
    daily: settings.dailyRequests === null ? '' : String(settings.dailyRequests),
    monthly: settings.monthlyRequests === null ? '' : String(settings.monthlyRequests),
    renewDay: String(settings.renewDay),
  }

  const save = async (changes: Partial<FortyTwoQuotaSettings>): Promise<void> => {
    if (await action.run(() => api.setAdminQuota(changes))) {
      setDraft(null)
      await reload()
    }
  }

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    void save({
      dailyRequests: capOf(form.daily),
      monthlyRequests: capOf(form.monthly),
      renewDay: Number(form.renewDay),
    })
  }

  const field = (name: keyof typeof form, extra: { min?: number; max?: number } = {}) => (
    <label>
      {t(`admin.quota.${name}`)}
      <input
        type="number"
        inputMode="numeric"
        value={form[name]}
        {...extra}
        onChange={(event) => {
          setDraft({ ...form, [name]: event.target.value })
        }}
      />
    </label>
  )

  return (
    <article className={`card budget ${settings.saving ? 'saving' : ''}`}>
      <span className="eyebrow">{t('admin.quota.title')}</span>
      <div className="tiles">
        <div className="tile">
          <span className="eyebrow">{t('admin.quota.hour')}</span>
          <strong>{data.hourlyRemaining ?? '—'}</strong>
          <small>{t(`admin.quota.level.${data.level}`)}</small>
        </div>
        <div className="tile">
          <span className="eyebrow">{t('admin.quota.today')}</span>
          <strong>
            {day.spent.toLocaleString()}
            {day.allowance !== null && ` / ${day.allowance.toLocaleString()}`}
          </strong>
          <small>{t(day.allowance === null ? 'admin.quota.noCap' : 'admin.quota.cap')}</small>
        </div>
        <div className="tile">
          <span className="eyebrow">{t('admin.quota.month')}</span>
          <strong>{month.spent.toLocaleString()}</strong>
          <small>{t('admin.budget.renews', { n: month.daysLeft, day: month.renewsOn })}</small>
        </div>
        <div className="tile">
          <span className="eyebrow">{t('admin.quota.queued')}</span>
          <strong>{data.queued}</strong>
          <small>{t('admin.quota.queuedHint')}</small>
        </div>
      </div>

      <form className="budget-form" onSubmit={submit}>
        {field('daily', { min: 100 })}
        {field('monthly', { min: 1000 })}
        {field('renewDay', { min: 1, max: 28 })}
        <div className="actions">
          <button type="submit" className="primary small" disabled={action.busy}>
            {t('admin.budget.save')}
          </button>
          <button
            type="button"
            className={`small ${settings.saving ? 'primary' : ''}`}
            aria-pressed={settings.saving}
            disabled={action.busy}
            onClick={() => void save({ saving: !settings.saving })}
          >
            {t(settings.saving ? 'admin.budget.savingOff' : 'admin.budget.savingOn')}
          </button>
        </div>
      </form>
      <p className="hint">{t('admin.quota.hint')}</p>
      <ErrorNote error={action.error} />
    </article>
  )
}
