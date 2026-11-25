import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { CampusSummary, CountdownGroup, CountdownNoticeReport } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { loadCountdowns } from '../../shared/countdowns'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DayTimeFields, instantOf } from '../../shared/ui/DayTimeFields'
import { Async } from '../../shared/ui/Async'
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
 * grupo elegido en su ventanita, y cada cual lo cierra o lo deja. Se puede
 * mandar a un solo campus, cualquiera de la lista (pedido por Alberto el
 * 2026-11-25: cada campus limpia sus taquillas en su día).
 */
export function CountdownsPanel() {
  const { t } = useI18n()
  const sent = useAsync(() => api.getAdminCountdowns(), [])
  // Sin la lista de campus se puede mandar igual, a todos: no se bloquea el formulario.
  const campuses = useAsync(() => api.getCampuses(), [])
  const sending = useAction()
  const [kind, setKind] = useState<Kind>('lockers')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [group, setGroup] = useState<CountdownGroup>('all')
  // `null`: a todos los campus.
  const [campus, setCampus] = useState<number | null>(null)
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
          campusId: campus,
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
        {campuses.data !== undefined && campuses.data.length > 0 && (
          <label>
            {t('admin.countdown.campus')}
            <select
              value={campus ?? ''}
              onChange={(event) => {
                const picked = campuses.data?.find(
                  (option) => String(option.id) === event.target.value,
                )

                setCampus(picked?.id ?? null)
              }}
            >
              <option value="">{t('admin.countdown.campus.all')}</option>
              {campuses.data.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <ErrorNote error={sending.error} />
        <div className="actions">
          <button type="submit" className="primary small" disabled={sending.busy || at === null}>
            {t('admin.countdown.send')}
          </button>
        </div>
      </form>

      <Async state={sent}>
        {(list) => (
          <article className="card">
            <span className="eyebrow">{t('admin.countdown.sent')}</span>
            {list.length === 0 ? (
              <p className="hint">{t('admin.countdown.none')}</p>
            ) : (
              <ul className="rows">
                {list.map((report) => (
                  <SentCountdown
                    key={report.id}
                    report={report}
                    campuses={campuses.data ?? []}
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
      </Async>
    </>
  )
}

/** Un aviso ya mandado: cuándo, a quién (y a qué campus) y cuánta gente lo ha cerrado. */
function SentCountdown({
  report,
  campuses,
  onRemoved,
}: {
  report: CountdownNoticeReport
  campuses: readonly CampusSummary[]
  onRemoved: () => void
}) {
  const { t, tn } = useI18n()
  const { dateTime } = useFormat()
  const removing = useAction()
  const title = report.title ?? (report.preset === 'lockers' ? t('countdown.lockers.title') : '')
  // El nombre del campus si está en la lista; si no (aún no ha llegado), su número.
  const campus =
    report.campusId === null
      ? null
      : (campuses.find((one) => one.id === report.campusId)?.name ?? `#${report.campusId}`)

  return (
    <li className="row plain">
      <span>
        <strong>{title}</strong>
        <small>
          {report.at === null ? '' : dateTime(report.at)} ·{' '}
          {t(`admin.countdown.to.${report.group}`)}
          {campus === null ? '' : ` · ${campus}`} ·{' '}
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
