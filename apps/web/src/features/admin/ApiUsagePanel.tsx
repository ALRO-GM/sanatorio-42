import { useState } from 'react'

import type { ApiUsage, ApiUsageLimitsChange } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { StepPicker } from '../../shared/ui/StepPicker'

/** Los periodos que se pueden mirar, en horas: la en curso, un rato, un día, tres y una semana. */
const HOURS: readonly number[] = [1, 6, 24, 72, 168]
const HOUR_MS = 3_600_000
/** Lo que el servidor junta como «el resto» en las series. */
const REST = '*'
/** Ocho colores fijos (`--api-series-N` en `admin.css`); el resto, en gris. */
const SLOTS = 8
const W = 640
const H = 200
const PAD = 30

/**
 * A qué se va la cuota de 42 (1 200 peticiones por hora, que vuelven enteras a
 * la hora en punto): por función (sección de la web o trabajo de fondo) y por
 * persona, hora a hora, con los topes por hora para que nadie se la coma.
 */
export function ApiUsagePanel() {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [hours, setHours] = useState(24)
  const [feature, setFeature] = useState<string | null>(null)
  const [login, setLogin] = useState<string | null>(null)
  const { data, error, loading, reload } = useAsync(
    () =>
      api.getAdminApiUsage({
        hours,
        feature: feature ?? undefined,
        login: login ?? undefined,
      }),
    [hours, feature, login],
  )
  const action = useAction()

  const change = async (next: ApiUsageLimitsChange): Promise<void> => {
    if (await action.run(() => api.setAdminApiLimits(next))) await reload()
  }

  /** Pide un tope por hora; vacío lo quita. `undefined` si se cancela o no es un número. */
  const askCap = (question: string, current: number | null): number | null | undefined => {
    const answer = window.prompt(question, current === null ? '' : String(current))

    if (answer === null) return undefined
    if (answer.trim() === '') return null

    const cap = Number(answer)

    return Number.isInteger(cap) && cap >= 0 ? cap : undefined
  }

  const label = useFeatureLabel()

  return (
    <article className="card api-usage">
      <span className="eyebrow">{t('admin.api.title')}</span>
      <p className="hint">{t('admin.api.hint')}</p>
      {loading && data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={error ?? action.error} onRetry={() => void reload()} />
      {data !== undefined && (
        <>
          <div className="progress-layout">
            <div className="progress-card">
              <UsageChart data={data} byPerson={feature !== null && login === null} />
            </div>
            <aside className="card progress-rail" aria-label={t('admin.api.options')}>
              <StepPicker
                options={HOURS}
                value={hours}
                onChange={setHours}
                label={t('common.period')}
                text={(option) => t('admin.api.hours', { n: option })}
              />
              <label className="progress-option">
                {t('admin.api.feature')}
                <select
                  value={feature ?? ''}
                  onChange={(event) => {
                    setFeature(event.target.value === '' ? null : event.target.value)
                  }}
                >
                  <option value="">{t('admin.api.all')}</option>
                  {withPicked(
                    data.features.map((row) => row.key),
                    feature,
                  ).map((key) => (
                    <option key={key} value={key}>
                      {label(key)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="progress-option">
                {t('admin.api.person')}
                <select
                  value={login ?? ''}
                  onChange={(event) => {
                    setLogin(event.target.value === '' ? null : event.target.value)
                  }}
                >
                  <option value="">{t('admin.api.everyone')}</option>
                  {withPicked(
                    data.people.map((row) => row.login),
                    login,
                  ).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
              <div className="progress-option">
                <span>{t('admin.api.perPerson')}</span>
                <button
                  type="button"
                  className="pill"
                  disabled={action.busy}
                  onClick={() => {
                    const cap = askCap(t('admin.api.askPerPerson'), data.limits.perPerson)

                    if (cap !== undefined) void change({ perPerson: cap })
                  }}
                >
                  {data.limits.perPerson === null
                    ? t('admin.api.noCap')
                    : t('admin.api.capValue', { n: data.limits.perPerson })}
                </button>
                <small className="hint">{t('admin.api.perPersonHint')}</small>
              </div>
            </aside>
          </div>

          <h3>{t('admin.api.byFeature')}</h3>
          <DataTable
            id="api-features"
            rows={data.features}
            rowKey={(row) => row.key}
            rowClass={(row) => (row.key === feature ? 'picked' : '')}
            columns={[
              {
                id: 'key',
                label: t('admin.api.feature'),
                sort: (row) => label(row.key),
                first: 'asc',
                cell: (row) => (
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setFeature(row.key === feature ? null : row.key)
                    }}
                  >
                    {label(row.key)}
                  </button>
                ),
              },
              {
                id: 'requests',
                label: t('admin.api.requests'),
                sort: (row) => row.requests,
                cell: (row) => number(row.requests),
              },
              {
                id: 'hour',
                label: t('admin.api.thisHour'),
                sort: (row) => row.thisHour,
                cell: (row) => number(row.thisHour),
              },
              {
                id: 'people',
                label: t('admin.api.people'),
                sort: (row) => row.people,
                cell: (row) => number(row.people),
              },
              {
                id: 'cap',
                label: t('admin.api.cap'),
                sort: (row) => data.limits.features[row.key] ?? -1,
                cell: (row) => (
                  <CapButton
                    cap={data.limits.features[row.key] ?? null}
                    busy={action.busy}
                    onClick={(current) => {
                      const cap = askCap(
                        t('admin.api.askFeature', { name: label(row.key) }),
                        current,
                      )

                      if (cap !== undefined) void change({ feature: { key: row.key, cap } })
                    }}
                  />
                ),
              },
            ]}
          />
          {data.background > 0 && (
            <p className="hint">{tn('admin.api.background', data.background)}</p>
          )}

          <h3>{t('admin.api.byPerson')}</h3>
          {data.people.length === 0 ? (
            <p className="hint">{t('admin.api.nobody')}</p>
          ) : (
            <DataTable
              id="api-people"
              rows={data.people}
              rowKey={(row) => row.login}
              rowClass={(row) => (row.login === login ? 'picked' : '')}
              limit={50}
              columns={[
                {
                  id: 'login',
                  label: t('admin.api.person'),
                  sort: (row) => row.login,
                  first: 'asc',
                  cell: (row) => (
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setLogin(row.login === login ? null : row.login)
                      }}
                    >
                      {row.login}
                    </button>
                  ),
                },
                {
                  id: 'requests',
                  label: t('admin.api.requests'),
                  sort: (row) => row.requests,
                  cell: (row) => number(row.requests),
                },
                {
                  id: 'hour',
                  label: t('admin.api.thisHour'),
                  sort: (row) => row.thisHour,
                  cell: (row) =>
                    row.cap === null
                      ? row.thisHour
                      : `${String(row.thisHour)} / ${String(row.cap)}`,
                },
                {
                  id: 'top',
                  label: t('admin.api.top'),
                  sort: (row) => label(row.top),
                  first: 'asc',
                  cell: (row) => label(row.top),
                },
                {
                  id: 'cap',
                  label: t('admin.api.cap'),
                  sort: (row) => data.limits.people[row.login] ?? -1,
                  cell: (row) => (
                    <CapButton
                      cap={data.limits.people[row.login] ?? null}
                      busy={action.busy}
                      onClick={(current) => {
                        const cap = askCap(t('admin.api.askPerson', { login: row.login }), current)

                        if (cap !== undefined) void change({ person: { login: row.login, cap } })
                      }}
                    />
                  ),
                },
              ]}
            />
          )}
        </>
      )}
    </article>
  )
}

/** La lista de opciones con la elegida aunque ya no salga (para que el `<select>` la enseñe). */
function withPicked(keys: readonly string[], picked: string | null): string[] {
  return picked === null || keys.includes(picked) ? [...keys] : [picked, ...keys]
}

/** El tope propio de una fila, o «sin tope»; al pulsarlo se cambia. */
function CapButton({
  cap,
  busy,
  onClick,
}: {
  cap: number | null
  busy: boolean
  onClick: (current: number | null) => void
}) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      className={`pill ${cap === null ? '' : 'active'}`}
      disabled={busy}
      onClick={() => {
        onClick(cap)
      }}
    >
      {cap === null ? t('admin.api.setCap') : t('admin.api.capValue', { n: cap })}
    </button>
  )
}

/** El nombre de una función: el de su texto si lo tiene; si no, la clave tal cual. */
function useFeatureLabel(): (key: string) => string {
  const { t } = useI18n()

  return (key) => {
    if (key === REST) return t('admin.api.rest')
    if (key === '') return t('admin.api.backgroundShort')

    const id = key.replace(':', '-')
    const text = t(`admin.api.f.${id}`)

    // Sin texto, `t` devuelve la clave: una función nueva sale con su nombre técnico.
    return text.startsWith('admin.api.f.') ? key : text
  }
}

/** Barras apiladas por hora: una serie por función, o por persona si se mira una función. */
function UsageChart({ data, byPerson }: { data: ApiUsage; byPerson: boolean }) {
  const { t } = useI18n()
  const { number, time } = useFormat()
  const label = useFeatureLabel()
  const [hover, setHover] = useState<number | null>(null)
  const start = Date.parse(data.hour.start) - (data.hours - 1) * HOUR_MS
  const slots = Array.from({ length: data.hours }, (_, index) =>
    new Date(start + index * HOUR_MS).toISOString().slice(0, 13),
  )
  const at = new Map(slots.map((slot, index) => [slot, index]))
  // El color sigue a la serie, no a su puesto: se reparte por orden alfabético.
  const keys = [...new Set(data.series.map((row) => row.key))].sort((a, b) =>
    a === REST ? 1 : b === REST ? -1 : a.localeCompare(b),
  )
  const colorOf = (key: string): string => {
    const index = keys.indexOf(key)

    return key === REST || index >= SLOTS
      ? 'var(--api-series-rest)'
      : `var(--api-series-${String(index + 1)})`
  }
  const stacks = slots.map(() => new Map<string, number>())

  for (const row of data.series) {
    const index = at.get(row.hour)

    if (index !== undefined) stacks[index]?.set(row.key, row.requests)
  }

  const totals = stacks.map((stack) => [...stack.values()].reduce((sum, value) => sum + value, 0))
  const max = Math.max(1, ...totals)
  const step = (W - PAD * 2) / slots.length
  const barWidth = Math.max(2, step - 2)
  const y = (value: number): number => H - PAD - (value / max) * (H - PAD * 2)
  const name = (key: string): string => (byPerson ? (key === '' ? label('') : key) : label(key))
  const shown =
    hover === null
      ? null
      : { slot: slots[hover] ?? '', stack: stacks[hover], total: totals[hover] ?? 0 }

  return (
    <figure className="growth-chart api-chart">
      <svg
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        role="img"
        aria-label={t('admin.api.chart')}
        onPointerLeave={() => {
          setHover(null)
        }}
      >
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="growth-axis" />
        <text x={4} y={PAD} className="growth-tick">
          {number(max)}
        </text>
        <text x={4} y={H - PAD} className="growth-tick">
          0
        </text>
        {stacks.map((stack, index) => {
          let base = 0
          const x = PAD + index * step + (step - barWidth) / 2

          return (
            <g
              key={slots[index]}
              onPointerEnter={() => {
                setHover(index)
              }}
            >
              <rect
                x={PAD + index * step}
                y={PAD}
                width={step}
                height={H - PAD * 2}
                fill="transparent"
              />
              {keys.map((key) => {
                const value = stack.get(key) ?? 0

                if (value === 0) return null

                const top = y(base + value)
                const height = Math.max(0, y(base) - top - (base > 0 ? 1 : 0))

                base += value

                return (
                  <rect
                    key={key}
                    x={x}
                    y={top}
                    width={barWidth}
                    height={height}
                    rx={1}
                    style={{ fill: colorOf(key) }}
                  />
                )
              })}
            </g>
          )
        })}
        <text x={PAD} y={H - 8} className="growth-tick">
          {time(`${slots[0] ?? ''}:00:00Z`)}
        </text>
        <text x={W - PAD} y={H - 8} textAnchor="end" className="growth-tick">
          {time(`${slots.at(-1) ?? ''}:00:00Z`)}
        </text>
      </svg>
      <p className="api-tip" aria-live="polite">
        {shown === null
          ? t('admin.api.now', {
              n: data.hour.spent,
              time: time(data.hour.resetsAt),
            })
          : t('admin.api.tip', {
              time: time(`${shown.slot}:00:00Z`),
              n: shown.total,
              detail: [...(shown.stack ?? [])]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([key, value]) => `${name(key)} ${number(value)}`)
                .join(' · '),
            })}
      </p>
      <figcaption className="map-legend">
        {keys.map((key) => (
          <span key={key}>
            <i className="growth-key" style={{ background: colorOf(key) }} /> {name(key)}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
