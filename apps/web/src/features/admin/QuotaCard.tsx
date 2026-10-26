import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { FortyTwoQuotaSettings } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { LimitActions, NumberField, Tile } from './LimitParts'

/** Un tope escrito en el formulario: vacío es "sin tope". */
const capOf = (text: string): number | null => (text.trim() === '' ? null : Number(text))

/**
 * La cuota de la API de 42: lo que queda esta hora, lo gastado hoy y este mes,
 * cuánta gente espera turno y los topes para regularla a mano.
 */
export function QuotaCard() {
  const { t, tn } = useI18n()
  const { number, time } = useFormat()
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
    <NumberField
      label={t(`admin.quota.${name}`)}
      value={form[name]}
      {...extra}
      onChange={(value) => {
        setDraft({ ...form, [name]: value })
      }}
    />
  )

  return (
    <article className={`card budget ${settings.saving ? 'saving' : ''}`}>
      <span className="eyebrow">{t('admin.quota.title')}</span>
      <div className="tiles">
        <Tile
          label={t('admin.quota.hour')}
          value={data.hourlyRemaining ?? '—'}
          hint={t(`admin.quota.level.${data.level}`)}
        />
        <Tile
          label={t('admin.quota.today')}
          value={
            day.allowance === null
              ? number(day.spent)
              : `${number(day.spent)} / ${number(day.allowance)}`
          }
          hint={t(day.allowance === null ? 'admin.quota.noCap' : 'admin.quota.cap')}
        />
        <Tile
          label={t('admin.quota.month')}
          value={number(month.spent)}
          hint={tn('admin.budget.renews', month.daysLeft, { day: month.renewsOn })}
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

      <form className="budget-form" onSubmit={submit}>
        {field('daily', { min: 100 })}
        {field('monthly', { min: 1000 })}
        {field('renewDay', { min: 1, max: 28 })}
        <LimitActions
          busy={action.busy}
          saving={settings.saving}
          onToggleSaving={() => void save({ saving: !settings.saving })}
        />
      </form>
      <p className="hint">{t('admin.quota.hint')}</p>
      <ErrorNote error={action.error} />
    </article>
  )
}
