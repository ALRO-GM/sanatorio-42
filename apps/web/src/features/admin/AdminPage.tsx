import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { Consumption } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { PersonLink } from '../../shared/ui/PersonLink'
import { HoursReport } from '../profile/HoursReport'
import { BudgetCard } from './BudgetCard'
import { QuotaCard } from './QuotaCard'
import { ApiUsagePanel } from './ApiUsagePanel'
import { BroadcastsTab } from './BroadcastsTab'
import { ClickerPanel } from './ClickerPanel'
import { DataPanel } from './DataPanel'
import { FacilityList } from '../facility/FacilityList'
import { GrowthPanel } from './GrowthPanel'
import { FocusPanel } from './FocusPanel'
import { PoolPanel } from './PoolPanel'
import { HiddenPanel } from './HiddenPanel'
import { MaintenancePanel } from './MaintenancePanel'
import { CountdownsPanel } from './CountdownsPanel'
import { StatsPanel } from './StatsPanel'
import { UsageTab } from './UsageTab'
import { Icon } from '../../shared/ui/Icon'
import { StaffAccounts } from './StaffAccounts'
import { InboxTab } from './InboxTab'
import { PanelLock } from './PanelLock'
import { PersonInput } from '../../shared/ui/PersonInput'

const TABS = [
  'consumption',
  'people',
  'inbox',
  'messages',
  'usage',
  'stats',
  'clicker',
  'casts',
  'countdowns',
  'maintenance',
  'facility',
  'focus',
  'pool',
  'hidden',
  'data',
] as const

type Tab = (typeof TABS)[number]

/**
 * Panel de gestión: consumo y límites, permisos y bloqueos, buzón, registro de
 * mensajes y mapa de calor de uso. Solo lo ve quien administra la web.
 */
export function AdminPage({ campusId, me }: { campusId?: number | undefined; me: string }) {
  const { t } = useI18n()

  return (
    <section className="admin">
      <h2>{t('admin.title')}</h2>
      <PanelLock>
        <AdminTabs campusId={campusId} me={me} />
      </PanelLock>
    </section>
  )
}

/** Las pestañas del panel, ya con el segundo factor dado. */
function AdminTabs({ campusId, me }: { campusId?: number | undefined; me: string }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('consumption')

  return (
    <>
      <PillGroup
        kind="tabs"
        options={TABS}
        value={tab}
        onChange={setTab}
        label={t('admin.title')}
        text={(option) => t(`admin.tab.${option}`)}
      />
      {tab === 'consumption' && <ConsumptionTab />}
      {tab === 'people' && <PeopleTab />}
      {tab === 'people' && <StaffAccounts />}
      {tab === 'people' && (
        <article className="card">
          <HoursReport everyone />
        </article>
      )}
      {tab === 'inbox' && <InboxTab />}
      {tab === 'messages' && <MessagesTab />}
      {tab === 'usage' && <UsageTab />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'stats' && <GrowthPanel />}
      {tab === 'clicker' && <ClickerPanel me={me} />}
      {tab === 'data' && <DataPanel />}
      {tab === 'focus' && <FocusPanel />}
      {tab === 'pool' && <PoolPanel />}
      {tab === 'hidden' && <HiddenPanel />}
      {tab === 'casts' && <BroadcastsTab campusId={campusId} />}
      {tab === 'countdowns' && <CountdownsPanel campusId={campusId} />}
      {tab === 'maintenance' && <MaintenancePanel />}
      {tab === 'facility' && (
        <FacilityList
          load={() => api.getAdminFacility()}
          resolve={(id) => api.resolveAdminFacility(id)}
        />
      )}
    </>
  )
}

// --- Consumo -----------------------------------------------------------------

function ConsumptionTab() {
  const { t, tn } = useI18n()
  const { number, bytes: size } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getAdminConsumption(), [])
  const action = useAction()

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const limit = async (login: string, current: number | null): Promise<void> => {
    const answer = window.prompt(
      t('admin.limit.ask', { login }),
      current === null ? '' : String(current),
    )

    if (answer === null) return

    const perHour = answer.trim() === '' ? null : Number(answer)

    if (perHour !== null && !Number.isFinite(perHour)) return

    if (await action.run(() => api.setUserLimit(login, perHour))) await reload()
  }

  return (
    <>
      <BudgetCard status={data.budget} onChange={() => void reload()} />
      <QuotaCard />
      <ApiUsagePanel />
      <div className="tiles">
        <div className="tile">
          <span className="eyebrow">{t('admin.cons.perPerson')}</span>
          <strong>{number(data.limit.perPerson)}</strong>
          <small>
            {tn('admin.cons.budget', data.limit.activePeople, {
              budget: number(data.limit.budget),
              people: data.limit.activePeople,
            })}
          </small>
        </div>
        <div className="tile">
          <span className="eyebrow">{t('admin.cons.fortyTwo')}</span>
          <strong>{data.limit.fortyTwoRemaining ?? '—'}</strong>
          <small>{t('admin.cons.fortyTwoHint')}</small>
        </div>
      </div>

      <article className="card">
        <span className="eyebrow">{t('admin.cons.warnings')}</span>
        {data.warnings.length === 0 ? (
          <p className="hint">{t('admin.cons.noWarnings')}</p>
        ) : (
          <ul className="admin-warnings">
            {data.warnings.map((warning) => (
              <li key={`${warning.weekday}-${warning.hour}`}>
                <Icon name="aviso" /> {t(`admin.weekday.${warning.weekday}`)}{' '}
                {String(warning.hour).padStart(2, '0')}:00 ·{' '}
                {tn('admin.cons.warning', warning.requests, {
                  pct: Math.round(warning.share * 100),
                })}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.cons.pattern')}</span>
        <WeekPattern data={data} />
        <p className="hint">{t('admin.cons.patternHint')}</p>
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.cons.recent')}</span>
        <RecentBars data={data} />
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.cons.top')}</span>
        <ErrorNote error={action.error} />
        <DataTable
          id="admin-top"
          className="admin-table"
          rows={data.top}
          rowKey={(row) => row.login}
          columns={[
            {
              id: 'login',
              label: t('common.person'),
              sort: (row) => row.login,
              first: 'asc',
              cell: (row) => <PersonLink login={row.login} />,
            },
            {
              id: 'requests',
              label: t('admin.col.requests'),
              sort: (row) => row.requests,
              cell: (row) => number(row.requests),
            },
            {
              id: 'bytes',
              label: t('admin.col.bytes'),
              sort: (row) => row.bytes,
              cell: (row) => size(row.bytes),
            },
            {
              id: 'limited',
              label: t('admin.col.limited'),
              sort: (row) => row.limited,
              cell: (row) => <span className={row.limited > 0 ? 'bad' : ''}>{row.limited}</span>,
            },
            {
              id: 'limit',
              label: t('admin.col.limit'),
              sort: (row) => row.manualLimit,
              cell: (row) => (
                <button
                  type="button"
                  className="pill"
                  disabled={action.busy}
                  onClick={() => void limit(row.login, row.manualLimit)}
                >
                  {row.manualLimit ?? t('admin.limit.auto')}
                </button>
              ),
            },
          ]}
        />
        <p className="hint">{t('admin.cons.topHint')}</p>
      </article>
    </>
  )
}

/** Media de peticiones por día de la semana y hora: una fila por día, una celda por hora. */
function WeekPattern({ data }: { data: Consumption }) {
  const { t } = useI18n()
  const peak = Math.max(1, ...data.pattern.map((cell) => cell.requests))
  const at = (weekday: number, hour: number): number =>
    data.pattern.find((cell) => cell.weekday === weekday && cell.hour === hour)?.requests ?? 0
  const hours = Array.from({ length: 24 }, (_, hour) => hour)

  return (
    <div className="week-pattern" role="img" aria-label={t('admin.cons.pattern')}>
      <span />
      {hours.map((hour) => (
        <small key={hour}>{hour % 3 === 0 ? hour : ''}</small>
      ))}
      {/* De lunes a domingo. */}
      {[1, 2, 3, 4, 5, 6, 0].map((weekday) => (
        <div key={weekday} className="week-row">
          <small>{t(`admin.weekday.${weekday}`)}</small>
          {hours.map((hour) => {
            const requests = at(weekday, hour)

            return (
              <span
                key={hour}
                className={requests >= data.limit.budget * 0.8 ? 'over' : ''}
                style={{ '--heat': (requests / peak).toFixed(3) } as React.CSSProperties}
                title={`${t(`admin.weekday.${weekday}`)} ${hour}:00 · ${requests}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** "1,2k", "340": una cifra que quepa encima de una barra. */
const brief = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k` : String(value)

/** Peticiones de las últimas 48 horas, una barra por hora. */
function RecentBars({ data }: { data: Consumption }) {
  const { t } = useI18n()
  const { bytes: size } = useFormat()
  const peak = Math.max(1, ...data.recent.map((hour) => hour.requests))

  if (data.recent.length === 0) return <p className="hint">{t('admin.cons.empty')}</p>

  return (
    <div className="recent-bars">
      {data.recent.map((hour) => (
        <span
          key={`${hour.day}-${hour.hour}`}
          style={{ height: `${Math.max(3, (100 * hour.requests) / peak)}%` }}
          data-value={hour.requests > 0 ? brief(hour.requests) : undefined}
          title={t('admin.cons.hour', {
            day: hour.day,
            hour: hour.hour,
            requests: hour.requests,
            people: hour.people,
            size: size(hour.bytes),
          })}
        />
      ))}
    </div>
  )
}

// --- Personas ------------------------------------------------------------------

function PeopleTab() {
  const { t, tn } = useI18n()
  const { date } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getAdminPeople(), [])
  const action = useAction()
  const [login, setLogin] = useState('')
  const [reason, setReason] = useState('')
  const [days, setDays] = useState('7')

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    if (await action.run(fn)) {
      setLogin('')
      setReason('')
      await reload()
    }
  }

  const block = (event: SyntheticEvent): void => {
    event.preventDefault()
    void act(() => api.blockUser(login, reason, days === '' ? null : Number(days)))
  }

  return (
    <>
      <ErrorNote error={action.error} />
      <article className="card">
        <span className="eyebrow">{t('admin.people.admins')}</span>
        <ul className="rows">
          {data.admins.map((admin) => (
            <li key={admin.login} className="row plain">
              <span>{admin.login}</span>
              {admin.fixed ? (
                <small className="row-count">{t('admin.people.fixed')}</small>
              ) : (
                <button
                  type="button"
                  className="pill row-count"
                  disabled={action.busy}
                  onClick={() => void act(() => api.setAdminRole(admin.login, false))}
                >
                  {t('admin.people.revoke')}
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="admin-inline"
          onSubmit={(event) => {
            event.preventDefault()
            void act(() => api.setAdminRole(login, true))
          }}
        >
          <PersonInput
            value={login}
            label={t('admin.people.login')}
            placeholder={t('admin.people.login')}
            onChange={setLogin}
            onPick={setLogin}
          />
          <button type="submit" className="pill" disabled={action.busy || login.trim() === ''}>
            {t('admin.people.grant')}
          </button>
        </form>
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.people.blocks')}</span>
        {data.blocks.length === 0 && <p className="hint">{t('admin.people.noBlocks')}</p>}
        <ul className="rows">
          {data.blocks.map((entry) => (
            <li key={entry.login} className="row plain">
              <span>
                <strong>{entry.login}</strong>
                <small>
                  {entry.reason} ·{' '}
                  {entry.until === null
                    ? t('admin.people.forever')
                    : t('admin.people.until', {
                        date: date(entry.until),
                      })}
                </small>
              </span>
              <button
                type="button"
                className="pill row-count"
                disabled={action.busy}
                onClick={() => void act(() => api.unblockUser(entry.login))}
              >
                {t('admin.people.unblock')}
              </button>
            </li>
          ))}
        </ul>
        <form className="admin-inline" onSubmit={block}>
          <PersonInput
            value={login}
            label={t('admin.people.login')}
            placeholder={t('admin.people.login')}
            onChange={setLogin}
            onPick={setLogin}
          />
          <input
            value={reason}
            placeholder={t('common.reason')}
            aria-label={t('common.reason')}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
          <select
            value={days}
            aria-label={t('admin.people.duration')}
            onChange={(event) => {
              setDays(event.target.value)
            }}
          >
            {['1', '7', '30', ''].map((option) => (
              <option key={option} value={option}>
                {option === ''
                  ? t('admin.people.forever')
                  : tn('admin.people.days', Number(option))}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="pill"
            disabled={action.busy || login.trim() === '' || reason.trim().length < 3}
          >
            {t('admin.people.block')}
          </button>
        </form>
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.people.limits')}</span>
        {data.limits.length === 0 ? (
          <p className="hint">{t('admin.people.noLimits')}</p>
        ) : (
          <ul className="rows">
            {data.limits.map((entry) => (
              <li key={entry.login} className="row plain">
                <span>{entry.login}</span>
                <span className="row-count">{t('admin.people.perHour', { n: entry.perHour })}</span>
                <button
                  type="button"
                  className="pill"
                  disabled={action.busy}
                  onClick={() => void act(() => api.setUserLimit(entry.login, null))}
                >
                  {t('admin.limit.auto')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </>
  )
}

// --- Registro de mensajes -----------------------------------------------------

function MessagesTab() {
  const { t, lang } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getAdminMessages(), [])
  const [filter, setFilter] = useState('')

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const wanted = filter.trim().toLowerCase()
  const rows = data.filter(
    (message) =>
      wanted === '' ||
      message.login.includes(wanted) ||
      message.eventId.includes(wanted) ||
      (message.body ?? '').toLowerCase().includes(wanted),
  )

  return (
    <article className="card">
      <p className="hint">{t('admin.messages.hint')}</p>
      <input
        type="search"
        value={filter}
        placeholder={t('admin.messages.filter')}
        aria-label={t('admin.messages.filter')}
        onChange={(event) => {
          setFilter(event.target.value)
        }}
      />
      {rows.length === 0 && <p className="hint">{t('admin.messages.empty')}</p>}
      <DataTable
        id="admin-messages"
        className="admin-table"
        rows={rows}
        rowKey={(message) => String(message.id)}
        columns={[
          {
            id: 'id',
            label: '#',
            sort: (message) => message.id,
            cell: (message) => <small>#{message.id}</small>,
          },
          {
            id: 'at',
            label: t('admin.cheats.when'),
            sort: (message) => message.at,
            cell: (message) => new Date(message.at).toLocaleString(localeOf(lang)),
          },
          {
            id: 'login',
            label: t('common.person'),
            sort: (message) => message.login,
            first: 'asc',
            cell: (message) => message.login,
          },
          {
            id: 'event',
            label: t('chats.kind.event'),
            sort: (message) => message.eventId,
            first: 'asc',
            cell: (message) => <small>{message.eventId}</small>,
          },
          {
            id: 'body',
            label: t('meet.chat'),
            cell: (message) =>
              message.body ?? t(`meet.said.${message.kind === 'text' ? 'seen' : message.kind}`),
          },
        ]}
      />
    </article>
  )
}
