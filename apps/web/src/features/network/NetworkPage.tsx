import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CurrentUser, NetworkGraph, NetworkNode } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { NetworkParams } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { COLOR_MODES, colorOf, legendOf } from './colors'
import type { ColorMode } from './colors'
import { ForceGraph } from './ForceGraph'
import { Meter } from './Meter'
import { PERIODS, startOf } from './period'
import type { Period } from './period'
import { PersonPanel } from './PersonPanel'
import { PersonSearch } from './PersonSearch'

/** Topes de personas que se pueden pedir. */
const LIMITS = [150, 300, 600, 1000, 2000] as const

/** Espera antes de pedir de nuevo al mover un control (el deslizador sobre todo). */
const DEBOUNCE_MS = 250

/** Cada cuánto se refresca mientras la copia desde 42 sigue en marcha. */
const REFRESH_WHILE_COPYING_MS = 45_000

/** Actividad mínima para salir en el ranking: con dos correcciones cualquier índice engaña. */
const RANKING_MIN_ACTIVITY = 12

type Filters = {
  period: Period
  from: string
  to: string
  login: string | null
  projectId: number | null
  min: number
  limit: number
}

function paramsOf(filters: Filters): NetworkParams {
  const from = filters.period === 'custom' ? filters.from : startOf(filters.period)

  return {
    ...(from === null || from === '' ? {} : { from }),
    ...(filters.period === 'custom' && filters.to !== '' ? { to: filters.to } : {}),
    ...(filters.login === null ? {} : { login: filters.login }),
    ...(filters.projectId === null ? {} : { projectId: filters.projectId }),
    min: filters.min,
    limit: filters.limit,
  }
}

/**
 * Red de correcciones: quién ha corregido a quién en el campus, como un grafo
 * de burbujas que se recoloca solo, con filtros y el cálculo de endogamia.
 */
export function NetworkPage({ me }: { me: CurrentUser }) {
  const { t } = useI18n()
  const [filters, setFilters] = useState<Filters>({
    period: 'year',
    from: '',
    to: '',
    login: null,
    projectId: null,
    min: 2,
    limit: 300,
  })
  const [mode, setMode] = useState<ColorMode>('community')
  const [selected, setSelected] = useState<string | null>(null)
  // El grafo anterior se sigue viendo mientras llega el nuevo: así se recoloca
  // en vez de desaparecer y volver a aparecer.
  const [graph, setGraph] = useState<NetworkGraph | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [reloads, setReloads] = useState(0)

  const params = useMemo(() => paramsOf(filters), [filters])

  useEffect(() => {
    let current = true
    const timer = setTimeout(() => {
      setLoading(true)
      api
        .getNetwork(params)
        .then((result) => {
          if (!current) return
          setGraph(result)
          setError(null)
        })
        .catch((cause: unknown) => {
          if (current) setError(cause)
        })
        .finally(() => {
          if (current) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [params, reloads])

  // Mientras se copia el histórico, el grafo crece solo.
  const copying = graph !== null && graph.sync.phase !== 'done'

  useEffect(() => {
    if (!copying) return undefined

    const timer = setInterval(() => {
      setReloads((count) => count + 1)
    }, REFRESH_WHILE_COPYING_MS)

    return () => {
      clearInterval(timer)
    }
  }, [copying])

  const change = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const focusOn = useCallback(
    (login: string | null) => {
      change({ login, ...(login === null ? {} : { min: 1 }) })
      setSelected(login)
    },
    [change],
  )

  const paint = useCallback((node: NetworkNode) => colorOf(node, mode), [mode])
  const nodes = graph?.nodes
  const legend = useMemo(() => legendOf(nodes ?? [], mode, t), [nodes, mode, t])
  const chosen = nodes?.find((node) => node.login === selected) ?? null
  const ranking = useMemo(
    () =>
      (nodes ?? [])
        .filter((node) => !node.external && node.given + node.received >= RANKING_MIN_ACTIVITY)
        .sort((a, b) => b.endogamy - a.endogamy || b.given + b.received - (a.given + a.received))
        .slice(0, 8),
    [nodes],
  )

  return (
    <section className="network">
      <h2>{t('net.title')}</h2>
      <p className="lead">{t('net.subtitle')}</p>

      {graph !== null && graph.sync.phase !== 'done' && (
        <div className="net-sync" role="status">
          <span>
            {graph.sync.total === null
              ? t('net.sync.pending')
              : t('net.sync.copying', {
                  rows: graph.sync.rows.toLocaleString(),
                  total: graph.sync.total.toLocaleString(),
                })}
          </span>
          {graph.sync.first !== null && graph.sync.last !== null && (
            <small>
              {t('net.sync.range', {
                from: graph.sync.first.slice(0, 10),
                to: graph.sync.last.slice(0, 10),
              })}
            </small>
          )}
        </div>
      )}

      <div className="card net-filters">
        <div className="net-filter">
          <span className="eyebrow">{t('net.period')}</span>
          <div className="filter-pills" role="group" aria-label={t('net.period')}>
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                className={`pill ${filters.period === period ? 'active' : ''}`}
                aria-pressed={filters.period === period}
                onClick={() => {
                  change({ period })
                }}
              >
                {t(`net.period.${period}`)}
              </button>
            ))}
          </div>
          {filters.period === 'custom' && (
            <div className="net-dates">
              <label>
                {t('net.from')}
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to === '' ? undefined : filters.to}
                  onChange={(event) => {
                    change({ from: event.target.value })
                  }}
                />
              </label>
              <label>
                {t('net.to')}
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from === '' ? undefined : filters.from}
                  onChange={(event) => {
                    change({ to: event.target.value })
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <div className="net-filter">
          <span className="eyebrow">{t('net.person')}</span>
          <PersonSearch value={filters.login} me={me.login} onChange={focusOn} />
        </div>

        <div className="net-filter-grid">
          <label>
            {t('net.project')}
            <select
              value={filters.projectId ?? ''}
              onChange={(event) => {
                change({ projectId: event.target.value === '' ? null : Number(event.target.value) })
              }}
            >
              <option value="">{t('net.project.all')}</option>
              {(graph?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.corrections})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('net.min', { n: filters.min })}
            <input
              type="range"
              min={1}
              max={12}
              value={filters.min}
              onChange={(event) => {
                change({ min: Number(event.target.value) })
              }}
            />
          </label>
          <label>
            {t('net.limit')}
            <select
              value={filters.limit}
              onChange={(event) => {
                change({ limit: Number(event.target.value) })
              }}
            >
              {LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('net.color')}
            <select
              value={mode}
              onChange={(event) => {
                setMode(COLOR_MODES.find((option) => option === event.target.value) ?? 'community')
              }}
            >
              {COLOR_MODES.map((option) => (
                <option key={option} value={option}>
                  {t(`net.color.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {graph === null && error !== null && (
        <ErrorNote
          error={error}
          onRetry={() => {
            setReloads((count) => count + 1)
          }}
        />
      )}
      {graph === null && error === null && <p className="estado">{t('net.loading')}</p>}

      {graph !== null && (
        <>
          <div className="net-totals">
            <div className="tile">
              <span className="eyebrow">{t('net.total.corrections')}</span>
              <strong>{graph.totals.corrections.toLocaleString()}</strong>
            </div>
            <div className="tile">
              <span className="eyebrow">{t('net.total.people')}</span>
              <strong>{graph.totals.people.toLocaleString()}</strong>
            </div>
            <div className="tile">
              <span className="eyebrow">{t('net.total.pairs')}</span>
              <strong>{graph.totals.pairs.toLocaleString()}</strong>
              <small>
                {t('net.total.mutual', {
                  n: graph.totals.mutualPairs.toLocaleString(),
                  pct:
                    graph.totals.pairs === 0
                      ? 0
                      : Math.round((100 * graph.totals.mutualPairs) / graph.totals.pairs),
                })}
              </small>
            </div>
            <div className="tile">
              <Meter label={t('net.total.endogamy')} value={graph.totals.endogamy} />
              <small>
                {t('net.personBreakdown', {
                  repetition: Math.round(graph.totals.repetition * 100),
                  reciprocity: Math.round(graph.totals.reciprocity * 100),
                })}
              </small>
            </div>
          </div>

          <div className="net-body">
            <div className={`net-stage ${loading ? 'loading' : ''}`}>
              {graph.nodes.length === 0 ? (
                <p className="estado">
                  {graph.query.login === null ? t('net.empty') : t('net.emptyPerson')}
                </p>
              ) : (
                <ForceGraph
                  nodes={graph.nodes}
                  links={graph.links}
                  colorOf={paint}
                  selected={selected}
                  onSelect={setSelected}
                  label={t('net.graphLabel', {
                    people: graph.nodes.length,
                    links: graph.links.length,
                  })}
                />
              )}
              <ul className="net-legend">
                {legend.map((entry) => (
                  <li key={entry.label}>
                    <span style={{ background: entry.color }} />
                    {entry.label}
                  </li>
                ))}
              </ul>
              <p className="net-help">{t('net.help')}</p>
              <p className="net-shown" role="status">
                {t('net.shown', { people: graph.nodes.length, links: graph.links.length })}
                {graph.hidden !== null &&
                  ` · ${t('net.hidden', { people: graph.hidden.nodes, links: graph.hidden.links })}`}
              </p>
            </div>

            <aside className="net-side">
              {chosen !== null ? (
                <PersonPanel
                  node={chosen}
                  links={graph.links}
                  focused={graph.query.login === chosen.login}
                  onFocus={focusOn}
                  onSelect={setSelected}
                  onClose={() => {
                    setSelected(null)
                  }}
                />
              ) : (
                <>
                  <article className="card net-panel">
                    <span className="eyebrow">{t('net.ranking')}</span>
                    {ranking.length === 0 ? (
                      <p className="hint">{t('net.rankingEmpty')}</p>
                    ) : (
                      <ul className="net-rows">
                        {ranking.map((node) => (
                          <li key={node.login}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(node.login)
                              }}
                            >
                              <span className="net-row-name">{node.login}</span>
                              <span
                                className="net-row-badge"
                                style={{ background: colorOf(node, 'endogamy') }}
                              >
                                {node.endogamy}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                  <article className="card net-panel">
                    <span className="eyebrow">{t('net.topPairs')}</span>
                    <ul className="net-rows">
                      {graph.topPairs.map((pair) => (
                        <li key={`${pair.source}-${pair.target}`}>
                          <button
                            type="button"
                            onClick={() => {
                              focusOn(pair.source)
                            }}
                          >
                            <span className="net-row-name">
                              {pair.source} ⇄ {pair.target}
                            </span>
                            <span className="net-row-count">
                              {pair.forth} · {pair.back}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                </>
              )}
            </aside>
          </div>

          <details className="card net-about">
            <summary>{t('net.about')}</summary>
            <p>{t('net.about.graph')}</p>
            <p>{t('net.about.endogamy')}</p>
            <p>{t('net.about.external')}</p>
          </details>
        </>
      )}
    </section>
  )
}
