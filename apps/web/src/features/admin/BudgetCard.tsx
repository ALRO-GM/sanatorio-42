import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { BudgetSettings, BudgetStatus } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { LimitActions, NumberField, Tile } from './LimitParts'

const GB = 1_000_000_000

/** "9,4 TB", "120 GB". */
function traffic(bytes: number): string {
  return bytes >= 1000 * GB
    ? `${(bytes / (1000 * GB)).toFixed(1)} TB`
    : `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB`
}

/** Lo que se escribe en el formulario: todo texto, como lo da un `<input>`. */
type Draft = Record<'daily' | 'monthlyGb' | 'renewDay' | 'share' | 'min' | 'max', string>

const draftOf = (settings: BudgetSettings): Draft => ({
  daily: String(settings.dailyRequests),
  monthlyGb: settings.monthlyBytes === null ? '' : String(settings.monthlyBytes / GB),
  renewDay: String(settings.renewDay),
  share: String(Math.round(settings.share * 100)),
  min: String(settings.minPerPerson),
  max: String(settings.maxPerPerson),
})

/**
 * El presupuesto de peticiones: cómo va hoy y este mes, y los ajustes para
 * regularlo a mano. Las cuentas son de la API; aquí solo se enseñan y se editan.
 */
export function BudgetCard({ status, onChange }: { status: BudgetStatus; onChange: () => void }) {
  const { t } = useI18n()
  const { number } = useFormat()
  const action = useAction()
  const [draft, setDraft] = useState(() => draftOf(status.settings))
  const { day, month, settings } = status

  const save = async (changes: Partial<BudgetSettings>): Promise<void> => {
    if (await action.run(() => api.setAdminBudget(changes))) onChange()
  }

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    void save({
      dailyRequests: Number(draft.daily),
      monthlyBytes: draft.monthlyGb.trim() === '' ? null : Math.round(Number(draft.monthlyGb) * GB),
      renewDay: Number(draft.renewDay),
      share: Number(draft.share) / 100,
      minPerPerson: Number(draft.min),
      maxPerPerson: Number(draft.max),
    })
  }

  const field = (name: keyof Draft, extra: { min?: number; max?: number } = {}) => (
    <NumberField
      label={t(`admin.budget.${name}`)}
      value={draft[name]}
      {...extra}
      onChange={(value) => {
        setDraft((current) => ({ ...current, [name]: value }))
      }}
    />
  )

  return (
    <article className={`card budget ${settings.saving ? 'saving' : ''}`}>
      <span className="eyebrow">{t('admin.budget.title')}</span>
      {status.level !== 'ok' && (
        <p className="budget-stopped" role="alert">
          {t(`admin.budget.level.${status.level}`, { day: month.renewsOn })}
        </p>
      )}
      <div className="tiles">
        <Tile
          label={t('admin.budget.today')}
          value={`${number(day.used)} / ${number(day.allowance)}`}
          hint={t(`admin.budget.limitedBy.${day.limitedBy}`, { left: number(day.left) })}
        />
        <Tile
          label={t('admin.budget.forecast')}
          value={number(day.forecast)}
          hint={t(
            day.forecast > day.allowance ? 'admin.budget.forecastOver' : 'admin.budget.forecastOk',
          )}
        />
        <Tile
          label={t('admin.budget.month')}
          value={
            month.stopAt === null
              ? traffic(month.bytesUsed)
              : `${traffic(month.bytesUsed)} / ${traffic(month.stopAt)}`
          }
          hint={
            <>
              {month.stopAt !== null && `${t('admin.budget.stopAt')} `}
              {t('admin.budget.renews', { n: month.daysLeft, day: month.renewsOn })}
            </>
          }
        />
      </div>

      <form className="budget-form" onSubmit={submit}>
        {field('daily', { min: 1000 })}
        {field('monthlyGb', { min: 0 })}
        {field('renewDay', { min: 1, max: 28 })}
        {field('share', { min: 50, max: 100 })}
        {field('min', { min: 10 })}
        {field('max', { min: 10 })}
        <LimitActions
          busy={action.busy}
          saving={settings.saving}
          onToggleSaving={() => void save({ saving: !settings.saving })}
        />
      </form>
      <p className="hint">{t('admin.budget.hint')}</p>
      <ErrorNote error={action.error} />
    </article>
  )
}
