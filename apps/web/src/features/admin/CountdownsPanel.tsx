import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { CountdownGroup, CountdownNoticeReport } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { loadCountdowns } from '../../shared/countdowns'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DayTimeFields, instantOf } from '../../shared/ui/DayTimeFields'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'

/** Qué aviso se manda: la limpieza de taquillas (texto ya escrito) u otro cualquiera. */
const KINDS = ['lockers', 'custom'] as const
const GROUPS = ['all', 'students', 'pool'] as const satisfies readonly CountdownGroup[]

type Kind = (typeof KINDS)[number]

/**
 * Panel de gestión: avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`).
 * La limpieza de taquillas va con su texto en cada idioma y solo pide el día y
 * la hora; otro aviso lleva título y, si se quiere, texto. Le sale a todo el
 * grupo elegido en su ventanita, y cada cual lo cierra o lo deja.
 */
export function CountdownsPanel({ campusId }: { campusId: number | undefined }) {
  const { t } = useI18n()
  const sent = useAsync(() => api.getAdminCountdowns(), [])
  const sending = useAction()
  const [kind, setKind] = useState<Kind>('lockers')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [group, setGroup] = useState<CountdownGroup>('all')
  const [onlyHere, setOnlyHere] = useState(false)
  const at = instantOf(day, time)

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    if (at === null) return

    void sending
      .run(() =>
        api.sendCountdown({
          ...(kind === 'lockers' ? { preset: 'lockers' } : { title, body }),
          at,
          group,
          campusId: onlyHere ? (campusId ?? null) : null,
        }),
      )
      .then((ok) => {
        if (!ok) return
        setTitle('')
        setBody('')
        void sent.reload()
        // Quien lo manda también lo ve en su ventanita.
        void loadCountdowns()
      })
  }

  return (
    <>
      <form className="card form countdown-form" onSubmit={submit}>
        <h3>{t('admin.countdown.new')}</h3>
        <PillGroup
          options={KINDS}
          value={kind}
          onChange={setKind}
          label={t('admin.countdown.kind')}
          text={(option) => t(`admin.countdown.kind.${option}`)}
        />
        {kind === 'lockers' ? (
          <div className="countdown-preview">
            <strong>{t('countdown.lockers.title')}</strong>
            <p>{t('countdown.lockers.body')}</p>
            <small className="hint">{t('admin.countdown.lockersHint')}</small>
          </div>
        ) : (
          <>
            <label>
              {t('admin.countdown.title')}
              <input
                value={title}
                maxLength={120}
                required
                onChange={(event) => {
                  setTitle(event.target.value)
                }}
              />
            </label>
            <label>
              {t('admin.countdown.body')}
              <textarea
                rows={3}
                value={body}
                maxLength={1000}
                onChange={(event) => {
                  setBody(event.target.value)
                }}
              />
            </label>
          </>
        )}
        <DayTimeFields day={day} time={time} onDay={setDay} onTime={setTime} />
        <label>
          {t('admin.countdown.to')}
          <select
            value={group}
            onChange={(event) => {
              setGroup(GROUPS.find((option) => option === event.target.value) ?? 'all')
            }}
          >
            {GROUPS.map((option) => (
              <option key={option} value={option}>
                {t(`admin.countdown.to.${option}`)}
              </option>
            ))}
          </select>
        </label>
        {campusId !== undefined && (
          <label className="duty-check">
            <input
              type="checkbox"
              checked={onlyHere}
              onChange={(event) => {
                setOnlyHere(event.target.checked)
              }}
            />
            {t('admin.countdown.onlyHere')}
          </label>
        )}
        <ErrorNote error={sending.error} />
        <div className="actions">
          <button type="submit" className="primary small" disabled={sending.busy || at === null}>
            {t('admin.countdown.send')}
          </button>
        </div>
      </form>

      {sent.loading && <p className="estado">{t('app.loading')}</p>}
      {sent.data === undefined ? (
        <ErrorNote error={sent.error} onRetry={() => void sent.reload()} />
      ) : (
        <article className="card">
          <span className="eyebrow">{t('admin.countdown.sent')}</span>
          {sent.data.length === 0 ? (
            <p className="hint">{t('admin.countdown.none')}</p>
          ) : (
            <ul className="rows">
              {sent.data.map((report) => (
                <SentCountdown
                  key={report.id}
                  report={report}
                  onRemoved={() => {
                    void sent.reload()
                    void loadCountdowns()
                  }}
                />
              ))}
            </ul>
          )}
        </article>
      )}
    </>
  )
}

/** Un aviso ya mandado: cuándo, a quién y cuánta gente lo ha cerrado. */
function SentCountdown({
  report,
  onRemoved,
}: {
  report: CountdownNoticeReport
  onRemoved: () => void
}) {
  const { t, tn } = useI18n()
  const { dateTime } = useFormat()
  const removing = useAction()
  const title = report.title ?? (report.preset === 'lockers' ? t('countdown.lockers.title') : '')

  return (
    <li className="row plain">
      <span>
        <strong>{title}</strong>
        <small>
          {report.at === null ? '' : dateTime(report.at)} ·{' '}
          {t(`admin.countdown.to.${report.group}`)}
          {report.campusId === null ? '' : ` · #${report.campusId}`} ·{' '}
          {tn('admin.countdown.dismissed', report.dismissed)}
        </small>
        <ErrorNote error={removing.error} />
      </span>
      <button
        type="button"
        className="pill row-count"
        disabled={removing.busy}
        aria-label={t('admin.countdown.removeOne', { title })}
        onClick={() => {
          void removing
            .run(() => api.removeCountdown(report.id))
            .then((ok) => {
              if (ok) onRemoved()
            })
        }}
      >
        {t('common.withdraw')}
      </button>
    </li>
  )
}
