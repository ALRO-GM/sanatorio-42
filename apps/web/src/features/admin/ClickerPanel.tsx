import { useState } from 'react'

import type { ClickerPlayer } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { CapitalChart } from '../clicker/CapitalChart'
import { CapitalHistory } from '../clicker/CapitalHistory'
import { duration } from './StatsPanel'

const RANGES = [1, 7, 30, 90] as const

/**
 * Uso de Code Clicker: cuánta gente encuentra el secreto y qué elige, cuánto
 * tiempo se pasa con el juego abierto y cómo va la partida de cada quien.
 *
 * El periodo solo cambia el tiempo y quién cuenta como en activo: de la partida
 * la API guarda cómo está ahora, no su historia.
 */
export function ClickerPanel() {
  const { t, lang } = useI18n()
  const [days, setDays] = useState<number>(7)
  const [login, setLogin] = useState<string | null>(null)
  const { data, error, loading, reload } = useAsync(() => api.getClickerUsage(days), [days])
  const compact = new Intl.NumberFormat(localeOf(lang), {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const when = new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'short', timeStyle: 'short' })
  const one = data?.players.find((player) => player.login === login)
  const action = useAction()
  const pardon = async (id: number): Promise<void> => {
    if (!window.confirm(t('admin.clicker.pardonAsk'))) return
    if (await action.run(() => api.pardonClickerCheat(id))) await reload()
  }
  const dismiss = async (id: number): Promise<void> => {
    if (await action.run(() => api.dismissClickerAlert(id))) await reload()
  }

  return (
    <section>
      <h2>
        {one === undefined ? t('admin.clicker.title') : t('admin.clicker.of', { login: one.login })}
      </h2>

      <div className="filter-pills" role="group" aria-label={t('admin.stats.range')}>
        {RANGES.map((option) => (
          <button
            key={option}
            type="button"
            className={`pill ${days === option ? 'active' : ''}`}
            aria-pressed={days === option}
            onClick={() => {
              setDays(option)
            }}
          >
            {t('admin.stats.days', { n: option })}
          </button>
        ))}
        {one !== undefined && (
          <button
            type="button"
            className="pill"
            onClick={() => {
              setLogin(null)
            }}
          >
            {t('admin.stats.everyone')}
          </button>
        )}
      </div>

      {loading && <p className="estado">{t('app.loading')}</p>}
      {data === undefined ? (
        <ErrorNote error={error} onRetry={() => void reload()} />
      ) : one !== undefined ? (
        <>
          <div className="stat-cards">
            <Figure label={t('admin.stats.seen')} value={duration(one.seen)} strong />
            <Figure label={t('admin.stats.back')} value={duration(one.back)} />
            <Figure label={t('admin.stats.hidden')} value={duration(one.hidden)} />
            <Figure label={t('admin.clicker.plus')} value={String(one.plus)} />
            <Figure
              label={t('admin.clicker.pill')}
              value={t(`admin.clicker.pill.${one.pill ?? 'none'}`)}
            />
            <Figure label={t('admin.clicker.level')} value={String(one.level)} />
            <Figure label={t('admin.clicker.lines')} value={compact.format(one.total)} />
            <Figure label={t('admin.clicker.perSecond')} value={compact.format(one.perSecond)} />
            <Figure label={t('admin.clicker.keys')} value={compact.format(one.clicks)} />
            <Figure label={t('admin.clicker.achievements')} value={String(one.achievements)} />
            <Figure label={t('admin.clicker.prestige')} value={String(one.prestige)} />
            <Figure label={t('admin.clicker.saves')} value={String(one.saves)} />
            <Figure label={t('admin.clicker.last')} value={when.format(new Date(one.updatedAt))} />
            <Figure label={t('admin.clicker.caught')} value={String(one.caught)} />
            {one.caughtWhy !== null && (
              <Figure
                label={t('admin.clicker.why')}
                value={`${t(`admin.clicker.why.${one.caughtWhy}`)}${
                  one.caughtAt === null ? '' : ` · ${when.format(new Date(one.caughtAt))}`
                }`}
              />
            )}
          </div>

          <article className="card">
            <CapitalHistory login={one.login} lang={lang} label={t('admin.clicker.capital')} />
          </article>

          {data.cheats.some((cheat) => cheat.login === one.login) && (
            <article className="card">
              <span className="eyebrow">{t('admin.clicker.copies')}</span>
              <ul className="rows">
                {data.cheats
                  .filter((cheat) => cheat.login === one.login)
                  .map((cheat) => (
                    <li key={cheat.id} className="row">
                      <span>
                        <strong>{t(`admin.clicker.why.${cheat.why}`)}</strong>
                        <small>
                          {when.format(new Date(cheat.at))} ·{' '}
                          {t('admin.clicker.copy', {
                            total: compact.format(cheat.total),
                            perSecond: compact.format(cheat.perSecond),
                          })}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="pill"
                        disabled={action.busy}
                        onClick={() => void pardon(cheat.id)}
                      >
                        {t('admin.clicker.pardon')}
                      </button>
                    </li>
                  ))}
              </ul>
              <ErrorNote error={action.error} />
            </article>
          )}
        </>
      ) : (
        <>
          <div className="stat-cards">
            <Figure label={t('admin.stats.seen')} value={duration(data.totals.seen)} strong />
            <Figure label={t('admin.stats.back')} value={duration(data.totals.back)} />
            <Figure label={t('admin.stats.hidden')} value={duration(data.totals.hidden)} />
            <Figure label={t('admin.clicker.active')} value={String(data.totals.active)} />
            <Figure label={t('admin.clicker.lines')} value={compact.format(data.totals.total)} />
            <Figure label={t('admin.clicker.saves')} value={String(data.totals.saves)} />
            <Figure label={t('admin.clicker.cheaters')} value={String(data.totals.caught)} />
          </div>

          {data.alerts.length > 0 && (
            <article className="card">
              <span className="eyebrow">{t('admin.clicker.alerts')}</span>
              <ul className="rows">
                {data.alerts.map((alert) => (
                  <li key={alert.id} className="row clicker-alert">
                    <span>
                      <strong>
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            setLogin(alert.login)
                          }}
                        >
                          {alert.login}
                        </button>{' '}
                        ·{' '}
                        {t('admin.clicker.jump', {
                          times: (alert.to / Math.max(1, alert.from)).toFixed(1),
                          seconds: alert.seconds,
                        })}
                      </strong>
                      <small>
                        {when.format(new Date(alert.at))} · {compact.format(alert.from)} →{' '}
                        {compact.format(alert.to)}
                        {alert.golden && ` · ${t('admin.clicker.withGolden')}`}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="pill"
                      disabled={action.busy}
                      onClick={() => void dismiss(alert.id)}
                    >
                      {t('admin.clicker.dismiss')}
                    </button>
                    <CapitalChart
                      points={alert.trace}
                      lang={lang}
                      label={t('admin.clicker.trace')}
                      seconds
                    />
                  </li>
                ))}
              </ul>
              <ErrorNote error={action.error} />
            </article>
          )}

          {/* Sin tarjeta alrededor: las cifras ya son tarjetas. */}
          <span className="eyebrow">{t('admin.clicker.funnel')}</span>
          <div className="stat-cards">
            <Figure label={t('admin.clicker.pressed')} value={String(data.totals.pressed)} />
            <Figure label={t('admin.clicker.reached')} value={String(data.totals.reached)} />
            <Figure label={t('admin.clicker.red')} value={String(data.totals.red)} />
            <Figure label={t('admin.clicker.blue')} value={String(data.totals.blue)} />
            <Figure label={t('admin.clicker.players')} value={String(data.totals.players)} />
          </div>

          <article className="card">
            <span className="eyebrow">{t('admin.clicker.byUser')}</span>
            <div className="table-scroll">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>{t('admin.stats.person')}</th>
                    <th>{t('admin.clicker.plus')}</th>
                    <th>{t('admin.clicker.pill')}</th>
                    <th>{t('admin.clicker.level')}</th>
                    <th>{t('admin.clicker.lines')}</th>
                    <th>{t('admin.clicker.keys')}</th>
                    <th>{t('admin.stats.seen')}</th>
                    <th>{t('admin.stats.back')}</th>
                    <th>{t('admin.stats.hidden')}</th>
                    <th>{t('admin.clicker.caught')}</th>
                    <th>{t('admin.clicker.last')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((row: ClickerPlayer) => (
                    <tr key={row.login}>
                      <th>
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            setLogin(row.login)
                          }}
                        >
                          {row.login}
                        </button>
                      </th>
                      <td>{row.plus}</td>
                      <td>{t(`admin.clicker.pill.${row.pill ?? 'none'}`)}</td>
                      <td>{row.total > 0 ? row.level : '—'}</td>
                      <td>{row.total > 0 ? compact.format(row.total) : '—'}</td>
                      <td>{row.clicks > 0 ? compact.format(row.clicks) : '—'}</td>
                      <td>{row.seen > 0 ? duration(row.seen) : '—'}</td>
                      <td>{row.back > 0 ? duration(row.back) : '—'}</td>
                      <td>{row.hidden > 0 ? duration(row.hidden) : '—'}</td>
                      <td>{row.caught > 0 ? row.caught : '—'}</td>
                      <td>{when.format(new Date(row.updatedAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.players.length === 0 && <p className="estado">{t('admin.clicker.empty')}</p>}
          </article>
        </>
      )}
    </section>
  )
}

function Figure({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={`stat-card ${strong ? 'strong' : ''}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
