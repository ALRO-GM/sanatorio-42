import { lazy, Suspense, useState } from 'react'

import type { ClickerVerdict } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { CapitalChart } from '../clicker/CapitalChart'
import { CapitalHistory } from '../clicker/CapitalHistory'
import { duration } from './StatsPanel'
import { RangePills } from './RangePills'
import { SanctionForm } from './SanctionForm'
import { CheatsPanel } from './CheatsPanel'
import { Figure } from './Figure'

// El juego entero solo se baja si se quiere ver la partida de alguien.
const CodeClicker = lazy(() =>
  import('../clicker/CodeClicker').then((m) => ({ default: m.CodeClicker })),
)

/**
 * Uso de Code Clicker: cuánta gente encuentra el secreto y qué elige, cuánto
 * tiempo se pasa con el juego abierto y cómo va la partida de cada quien.
 *
 * El periodo solo cambia el tiempo y quién cuenta como en activo: de la partida
 * la API guarda cómo está ahora, no su historia.
 */
export function ClickerPanel({ me }: { me: string }) {
  const { t, lang } = useI18n()
  const [days, setDays] = useState<number>(7)
  const [login, setLogin] = useState<string | null>(null)
  // De quién se está viendo la partida, o `null`.
  const [watching, setWatching] = useState<string | null>(null)
  // El uso del juego o el apartado de las trampas.
  const [view, setView] = useState<'usage' | 'cheats'>('usage')
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
  /** Lo que se decide sobre un salto. La trampa requisa todo: se pregunta antes. */
  const review = async (id: number, verdict: ClickerVerdict): Promise<void> => {
    if (verdict === 'cheat' && !window.confirm(t('admin.clicker.cheatAsk'))) return
    if (await action.run(() => api.reviewClickerAlert(id, verdict))) await reload()
  }

  return (
    <section>
      <h2>
        {view === 'cheats'
          ? t('admin.cheats.title')
          : one === undefined
            ? t('admin.clicker.title')
            : t('admin.clicker.of', { login: one.login })}
      </h2>

      <PillGroup
        kind="tabs"
        options={['usage', 'cheats'] as const}
        value={view}
        onChange={setView}
        label={t('admin.clicker.title')}
        text={(option) => t(`admin.clicker.view.${option}`)}
      />

      {view === 'cheats' ? (
        <CheatsPanel
          me={me}
          onWatch={(who) => {
            setView('usage')
            setLogin(who)
            setWatching(who)
          }}
        />
      ) : (
        <>
          <RangePills value={days} onChange={setDays}>
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
          </RangePills>

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
                <Figure
                  label={t('admin.clicker.perSecond')}
                  value={compact.format(one.perSecond)}
                />
                <Figure label={t('admin.clicker.code')} value={compact.format(one.code)} />
                <Figure label={t('admin.clicker.wealth')} value={compact.format(one.wealth)} />
                <Figure label={t('admin.clicker.buildings')} value={String(one.buildings)} />
                <Figure label={t('admin.clicker.upgrades')} value={String(one.upgrades)} />
                <Figure label={t('admin.clicker.keys')} value={compact.format(one.clicks)} />
                <Figure label={t('admin.clicker.achievements')} value={String(one.achievements)} />
                <Figure label={t('admin.clicker.prestige')} value={String(one.prestige)} />
                <Figure label={t('admin.clicker.saves')} value={String(one.saves)} />
                <Figure
                  label={t('admin.clicker.last')}
                  value={when.format(new Date(one.updatedAt))}
                />
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

              {/* Su pantalla de juego, tal como la tiene: para mirar, sin guardar nada. */}
              {one.pill === 'red' &&
                (watching === one.login ? (
                  <Suspense fallback={<p className="estado">{t('app.loading')}</p>}>
                    <CodeClicker
                      key={one.login}
                      me={one.login}
                      spectate={one.login}
                      onExit={() => {
                        setWatching(null)
                      }}
                    />
                  </Suspense>
                ) : (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => {
                      setWatching(one.login)
                    }}
                  >
                    {t('admin.clicker.watch')}
                  </button>
                ))}

              {one.pill === 'red' && watching !== one.login && (
                <SanctionForm login={one.login} onDone={() => void reload()} />
              )}

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
                <Figure
                  label={t('admin.clicker.lines')}
                  value={compact.format(data.totals.total)}
                />
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
                        <span className="clicker-verdicts">
                          {(['cheat', 'likely', 'clean'] as const).map((verdict) => (
                            <button
                              key={verdict}
                              type="button"
                              className={`pill ${verdict === 'cheat' ? 'danger' : ''}`}
                              disabled={
                                action.busy || (verdict === 'likely' && alert.status !== 'open')
                              }
                              onClick={() => void review(alert.id, verdict)}
                            >
                              {t(`admin.clicker.verdict.${verdict}`)}
                            </button>
                          ))}
                        </span>
                        {alert.status !== 'open' && (
                          <p className="hint clicker-defense">
                            {alert.status === 'asked'
                              ? t('admin.clicker.asked')
                              : t('admin.clicker.answered', { answer: alert.answer ?? '' })}
                          </p>
                        )}
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
                <DataTable
                  id="clicker-players"
                  rows={data.players}
                  rowKey={(row) => row.login}
                  columns={[
                    {
                      id: 'login',
                      label: t('admin.stats.person'),
                      sort: (row) => row.login,
                      first: 'asc',
                      cell: (row) => (
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            setLogin(row.login)
                          }}
                        >
                          {row.login}
                        </button>
                      ),
                    },
                    {
                      id: 'plus',
                      label: t('admin.clicker.plus'),
                      sort: (row) => row.plus,
                      cell: (row) => row.plus,
                    },
                    {
                      id: 'pill',
                      label: t('admin.clicker.pill'),
                      sort: (row) => row.pill,
                      first: 'asc',
                      cell: (row) => t(`admin.clicker.pill.${row.pill ?? 'none'}`),
                    },
                    {
                      id: 'level',
                      label: t('admin.clicker.level'),
                      sort: (row) => (row.total > 0 ? row.level : null),
                      cell: (row) => (row.total > 0 ? row.level : '—'),
                    },
                    {
                      id: 'total',
                      label: t('admin.clicker.lines'),
                      sort: (row) => (row.total > 0 ? row.total : null),
                      cell: (row) => (row.total > 0 ? compact.format(row.total) : '—'),
                    },
                    {
                      id: 'wealth',
                      label: t('admin.clicker.wealth'),
                      sort: (row) => (row.wealth > 0 ? row.wealth : null),
                      cell: (row) => (row.wealth > 0 ? compact.format(row.wealth) : '—'),
                    },
                    {
                      id: 'buildings',
                      label: t('admin.clicker.buildings'),
                      sort: (row) => (row.buildings > 0 ? row.buildings : null),
                      cell: (row) => (row.buildings > 0 ? row.buildings : '—'),
                    },
                    {
                      id: 'upgrades',
                      label: t('admin.clicker.upgrades'),
                      sort: (row) => (row.upgrades > 0 ? row.upgrades : null),
                      cell: (row) => (row.upgrades > 0 ? row.upgrades : '—'),
                    },
                    {
                      id: 'clicks',
                      label: t('admin.clicker.keys'),
                      sort: (row) => (row.clicks > 0 ? row.clicks : null),
                      cell: (row) => (row.clicks > 0 ? compact.format(row.clicks) : '—'),
                    },
                    {
                      id: 'seen',
                      label: t('admin.stats.seen'),
                      sort: (row) => (row.seen > 0 ? row.seen : null),
                      cell: (row) => (row.seen > 0 ? duration(row.seen) : '—'),
                    },
                    {
                      id: 'back',
                      label: t('admin.stats.back'),
                      sort: (row) => (row.back > 0 ? row.back : null),
                      cell: (row) => (row.back > 0 ? duration(row.back) : '—'),
                    },
                    {
                      id: 'hidden',
                      label: t('admin.stats.hidden'),
                      sort: (row) => (row.hidden > 0 ? row.hidden : null),
                      cell: (row) => (row.hidden > 0 ? duration(row.hidden) : '—'),
                    },
                    {
                      id: 'caught',
                      label: t('admin.clicker.caught'),
                      sort: (row) => (row.caught > 0 ? row.caught : null),
                      cell: (row) => (row.caught > 0 ? row.caught : '—'),
                    },
                    {
                      id: 'updatedAt',
                      label: t('admin.clicker.last'),
                      sort: (row) => row.updatedAt,
                      cell: (row) => when.format(new Date(row.updatedAt)),
                    },
                  ]}
                />
                {data.players.length === 0 && <p className="estado">{t('admin.clicker.empty')}</p>}
              </article>
            </>
          )}
        </>
      )}
    </section>
  )
}
