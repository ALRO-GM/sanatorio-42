import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CurrentUser, NetworkGraph, NetworkNode } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { NetworkParams } from '../../shared/api/types'
import { usePolling } from '../../shared/hooks/usePolling'
import { useI18n } from '../../shared/i18n'
import { Blocks } from '../../shared/layout/Blocks'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import {
  COLOR_MODES,
  colorOf,
  DEFAULT_SCALES,
  fitScale,
  isScaleMode,
  legendOf,
  passColor,
  scaleColor,
  badgeStyle,
} from './colors'
import type { Scale, ScaleMode } from './colors'
import type { ColorMode } from './colors'
import { ForceGraph } from './ForceGraph'
import { Meter } from './Meter'
import { PERIODS, startOf } from './period'
import type { Period } from './period'
import { PersonPanel } from './PersonPanel'
import { PersonSearch } from './PersonSearch'
import { RangeSlider } from '../../shared/ui/RangeSlider'
import { RankCard, ranked } from './RankCard'
import type { Order } from './RankCard'
import { StrictestCard } from './StrictestCard'
import { Timeline } from './Timeline'
import { InfoTip } from '../../shared/ui/InfoTip'
import { NetworkTour } from './NetworkTour'
import { decodePart, networkHref } from '../../shared/links'

/** Topes de personas que se pueden pedir. */
const LIMITS = [150, 300, 600, 1000, 2000, 20_000] as const

/** El tope más alto es, en la práctica, el campus entero. */
const ALL_PEOPLE = 20_000

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
  /** `''` es todas las correcciones. */
  verdict: '' | 'pass' | 'fail'
  /** Solo las uniones en las que las dos personas se han corregido. */
  mutual: boolean
  min: number
  limit: number
  /** Los campus que se miran juntos; `null` es solo el propio y `'all'`, todos. */
  campuses: readonly number[] | 'all' | null
}

/** Login de un enlace directo `#/red/<login>`, o `null`. */
function loginInUrl(): string | null {
  const login = (
    decodePart(window.location.hash.replace(/^#\/?/, '').split('/')[1] ?? '') ?? ''
  ).toLowerCase()

  return /^[a-z0-9-]{1,30}$/.test(login) ? login : null
}

function paramsOf(filters: Filters): NetworkParams {
  const from = filters.period === 'custom' ? filters.from : startOf(filters.period)

  return {
    ...(from === null || from === '' ? {} : { from }),
    ...(filters.period === 'custom' && filters.to !== '' ? { to: filters.to } : {}),
    ...(filters.login === null ? {} : { login: filters.login }),
    ...(filters.projectId === null ? {} : { projectId: filters.projectId }),
    ...(filters.verdict === '' ? {} : { verdict: filters.verdict }),
    ...(filters.mutual ? { mutual: true } : {}),
    min: filters.min,
    limit: filters.limit,
    ...(filters.campuses === null
      ? {}
      : { campuses: filters.campuses === 'all' ? 'all' : filters.campuses.join(',') }),
  }
}

/**
 * Red de correcciones: quién ha corregido a quién en el campus, como un grafo
 * de burbujas que se recoloca solo, con filtros y el cálculo de endogamia.
 */
export function NetworkPage({ me }: { me: CurrentUser }) {
  const { t } = useI18n()
  const [filters, setFilters] = useState<Filters>({
    // Un enlace a una persona enseña su historia entera; el campus, el último año.
    period: loginInUrl() === null ? 'year' : 'all',
    from: '',
    to: '',
    login: loginInUrl(),
    projectId: null,
    verdict: '',
    mutual: false,
    // Con una persona elegida interesa toda su red, no solo sus uniones fuertes.
    min: loginInUrl() === null ? 2 : 1,
    limit: 300,
    campuses: null,
  })
  const [mode, setMode] = useState<ColorMode>('community')
  const [selected, setSelected] = useState<string | null>(loginInUrl)
  // El grafo anterior se sigue viendo mientras llega el nuevo: así se recoloca
  // en vez de desaparecer y volver a aparecer.
  const [graph, setGraph] = useState<NetworkGraph | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [reloads, setReloads] = useState(0)

  const params = useMemo(() => paramsOf(filters), [filters])

  // La persona elegida va en la URL (`#/red/<login>`): el enlace se puede compartir.
  useEffect(() => {
    const wanted = networkHref(filters.login)

    if (window.location.hash !== wanted) {
      // `replaceState` no dispara `hashchange`: la sección no se vuelve a montar.
      window.history.replaceState(null, '', wanted)
    }
  }, [filters.login])

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

  usePolling(
    () => {
      setReloads((count) => count + 1)
    },
    copying ? REFRESH_WHILE_COPYING_MS : null,
  )

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

  // Entre qué porcentajes se reparte el degradado de cada modo que lo usa.
  const [scales, setScales] = useState<Record<ScaleMode, Scale>>(DEFAULT_SCALES)
  const scale = isScaleMode(mode) ? scales[mode] : undefined
  const paint = useCallback((node: NetworkNode) => colorOf(node, mode, scale), [mode, scale])
  const tooltip = useCallback(
    (node: NetworkNode) => (
      <>
        <strong>{node.login}</strong>
        <span>{t('net.tip.counts', { given: node.given, received: node.received })}</span>
        {node.givenPassRate !== null && (
          <span>{t('net.tip.given', { pct: Math.round(node.givenPassRate * 100) })}</span>
        )}
        {node.receivedPassRate !== null && (
          <span>{t('net.tip.received', { pct: Math.round(node.receivedPassRate * 100) })}</span>
        )}
        <span>{t('net.tip.endogamy', { n: node.endogamy, partners: node.partners })}</span>
      </>
    ),
    [t],
  )
  const controls = useMemo(
    () => ({
      zoomIn: t('net.zoomIn'),
      zoomOut: t('net.zoomOut'),
      fit: t('net.fit'),
      find: t('net.find'),
      none: t('net.findNone'),
      gave: t('net.arrows.gave'),
      got: t('net.arrows.got'),
    }),
    [t],
  )
  const nodes = graph?.nodes
  const available = graph?.available
  const legend = useMemo(
    () => legendOf(nodes ?? [], mode, t, scale, available),
    [nodes, mode, t, scale, available],
  )
  const chosen = nodes?.find((node) => node.login === selected) ?? null
  // Sentido de cada lista del panel: de mayor a menor mientras no se cambie.
  const [orders, setOrders] = useState<Record<'endogamy' | 'pairs' | 'projects', Order>>({
    endogamy: 'desc',
    pairs: 'desc',
    projects: 'desc',
  })
  const ranking = useMemo(
    () =>
      ranked(
        (nodes ?? []).filter(
          (node) => !node.external && node.given + node.received >= RANKING_MIN_ACTIVITY,
        ),
        // La actividad desempata sin cambiar el orden entre endogamias distintas.
        (node) => node.endogamy + (node.given + node.received) / 1e6,
        orders.endogamy,
      ),
    [nodes, orders.endogamy],
  )
  const topPairs = graph?.topPairs
  const pairs = useMemo(
    () =>
      ranked(
        topPairs ?? [],
        // Primero lo que se devuelven; después, el total.
        (pair) => Math.min(pair.forth, pair.back) + (pair.forth + pair.back) / 1e4,
        orders.pairs,
      ),
    [topPairs, orders.pairs],
  )
  const allProjects = graph?.projects
  // Entre cuántas correcciones tiene que tener un proyecto para salir en su
  // lista; `null` es sin tope por ese lado. Los pasos del deslizador son las
  // cantidades que hay de verdad: de uno en uno, casi todo el recorrido serían
  // los cuatro proyectos que más tienen.
  const [projectSpan, setProjectSpan] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  })
  const projectSteps = useMemo(
    () =>
      [...new Set((allProjects ?? []).map((project) => project.corrections))].sort((a, b) => a - b),
    [allProjects],
  )
  const spanLow = projectSpan.min ?? projectSteps[0] ?? 0
  const spanHigh = projectSpan.max ?? projectSteps.at(-1) ?? 0
  const projects = useMemo(
    () =>
      ranked(
        (allProjects ?? []).filter(
          (project) => project.corrections >= spanLow && project.corrections <= spanHigh,
        ),
        (project) => project.corrections,
        orders.projects,
      ),
    [allProjects, orders.projects, spanLow, spanHigh],
  )

  return (
    <section className="network">
      <div className="net-layout">
        {/* La columna de la derecha: título, filtros y paneles. En pantalla ancha
            tiene su propio desplazamiento, y el grafo se queda quieto a su lado. */}
        <div className="net-rail">
          <div className="net-head">
            <h2>
              {t('net.title')}
              <InfoTip title={t('net.title')}>
                <NetworkTour />
              </InfoTip>
            </h2>

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
          </div>

          <div className="card net-filters">
            {graph !== null && graph.available.length > 1 && (
              <div className="net-filter">
                <span className="eyebrow">{t('net.campuses')}</span>
                <PillGroup<number | 'all'>
                  options={[...graph.available.map((campus) => campus.id), 'all']}
                  value={null}
                  pressed={(option) =>
                    option === 'all'
                      ? graph.campuses.length === graph.available.length
                      : graph.campuses.includes(option)
                  }
                  onChange={(option) => {
                    if (option === 'all') {
                      change({ campuses: 'all' })
                      setMode('campus')

                      return
                    }

                    const on = graph.campuses.includes(option)
                    const next = on
                      ? graph.campuses.filter((id) => id !== option)
                      : [...graph.campuses, option]

                    // Sin ninguno no hay grafo: el último no se puede quitar.
                    if (next.length === 0) return

                    change({ campuses: next })
                    // Con más de uno, lo que interesa ver es de cuál es cada quien.
                    if (next.length > 1) setMode('campus')
                  }}
                  label={t('net.campuses')}
                  text={(option) =>
                    option === 'all'
                      ? t('net.campuses.all')
                      : graph.available.find((campus) => campus.id === option)?.name
                  }
                />
              </div>
            )}
            <div className="net-filter">
              <span className="eyebrow">{t('net.period')}</span>
              <PillGroup
                options={PERIODS}
                value={filters.period}
                onChange={(period) => {
                  change({ period })
                }}
                label={t('net.period')}
                text={(period) => t(`net.period.${period}`)}
              />
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

            {graph !== null && (
              <Timeline
                months={graph.timeline}
                from={params.from ?? null}
                to={params.to ?? null}
                onSelect={(from, to) => {
                  change({ period: 'custom', from, to })
                }}
              />
            )}

            <div className="net-filter">
              <span className="eyebrow">{t('net.person')}</span>
              <PersonSearch
                value={filters.login}
                me={me.login}
                onChange={focusOn}
                campuses={params.campuses}
              />
            </div>

            <div className="net-filter-grid">
              <label>
                {t('net.project')}
                <select
                  value={filters.projectId ?? ''}
                  onChange={(event) => {
                    change({
                      projectId: event.target.value === '' ? null : Number(event.target.value),
                    })
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
                      {limit === ALL_PEOPLE ? t('net.limit.all') : limit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('net.color')}
                <select
                  value={mode}
                  onChange={(event) => {
                    setMode(
                      COLOR_MODES.find((option) => option === event.target.value) ?? 'community',
                    )
                  }}
                >
                  {COLOR_MODES.map((option) => (
                    <option key={option} value={option}>
                      {t(`net.color.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('net.verdict')}
                <select
                  value={filters.verdict}
                  onChange={(event) => {
                    const verdict = event.target.value

                    change({ verdict: verdict === 'pass' || verdict === 'fail' ? verdict : '' })
                  }}
                >
                  <option value="">{t('net.verdict.all')}</option>
                  <option value="pass">{t('net.verdict.pass')}</option>
                  <option value="fail">{t('net.verdict.fail')}</option>
                </select>
              </label>
              <label className="net-check">
                <input
                  type="checkbox"
                  checked={filters.mutual}
                  onChange={(event) => {
                    change({ mutual: event.target.checked })
                  }}
                />
                {t('net.mutualOnly')}
              </label>
            </div>
          </div>
          {graph !== null && (
            <aside className="net-side">
              {chosen !== null && (
                <PersonPanel
                  node={chosen}
                  links={graph.links}
                  params={params}
                  focused={graph.query.login === chosen.login}
                  onFocus={focusOn}
                  onSelect={setSelected}
                  onClose={() => {
                    setSelected(null)
                  }}
                />
              )}

              <Blocks
                page="red"
                blocks={[
                  {
                    id: 'totals',
                    chrome: false,
                    content: (
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
                                  : Math.round(
                                      (100 * graph.totals.mutualPairs) / graph.totals.pairs,
                                    ),
                            })}
                          </small>
                        </div>
                        <div className="tile">
                          <span className="eyebrow">{t('net.total.communities')}</span>
                          <strong>{graph.totals.communities.toLocaleString()}</strong>
                        </div>
                        <div className="tile wide">
                          <Meter label={t('net.total.endogamy')} value={graph.totals.endogamy} />
                          <small>
                            {t('net.personBreakdown', {
                              repetition: Math.round(graph.totals.repetition * 100),
                              reciprocity: Math.round(graph.totals.reciprocity * 100),
                            })}
                          </small>
                        </div>
                      </div>
                    ),
                  },
                  // Con una persona elegida, su ficha ocupa el sitio de las listas.
                  ...(chosen === null
                    ? [
                        {
                          id: 'endogamy',
                          chrome: false,
                          content: (
                            <RankCard
                              id="endogamy"
                              title={t('net.ranking')}
                              order={orders.endogamy}
                              onOrder={(order) => {
                                setOrders((current) => ({ ...current, endogamy: order }))
                              }}
                              count={ranking.length}
                              footer={
                                <p className="hint">
                                  {ranking.length === 0
                                    ? t('net.rankingEmpty')
                                    : t('net.rankingHint')}
                                </p>
                              }
                            >
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
                                      style={badgeStyle(colorOf(node, 'endogamy', scales.endogamy))}
                                    >
                                      {node.endogamy}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </RankCard>
                          ),
                        },
                        {
                          id: 'pairs',
                          chrome: false,
                          content: (
                            <RankCard
                              id="pairs"
                              title={t('net.topPairs')}
                              order={orders.pairs}
                              onOrder={(order) => {
                                setOrders((current) => ({ ...current, pairs: order }))
                              }}
                              count={pairs.length}
                              footer={<p className="hint">{t('net.topPairsHint')}</p>}
                            >
                              {pairs.map((pair) => (
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
                            </RankCard>
                          ),
                        },
                        {
                          id: 'strictest',
                          chrome: false,
                          content: <StrictestCard params={params} onSelect={focusOn} />,
                        },
                        ...(projects.length > 0
                          ? [
                              {
                                id: 'projects',
                                chrome: false,
                                content: (
                                  <RankCard
                                    id="projects"
                                    title={t('net.projects')}
                                    order={orders.projects}
                                    onOrder={(order) => {
                                      setOrders((current) => ({ ...current, projects: order }))
                                    }}
                                    count={projects.length}
                                    controls={
                                      projectSteps.length > 1 && (
                                        <div className="net-span">
                                          <span>
                                            {t('net.projects.span', {
                                              min: spanLow.toLocaleString(),
                                              max: spanHigh.toLocaleString(),
                                            })}
                                          </span>
                                          <RangeSlider
                                            max={projectSteps.length - 1}
                                            // El paso más cercano por dentro del tramo elegido.
                                            low={Math.max(
                                              0,
                                              projectSteps.findIndex((step) => step >= spanLow),
                                            )}
                                            high={Math.max(
                                              0,
                                              projectSteps.findLastIndex(
                                                (step) => step <= spanHigh,
                                              ),
                                            )}
                                            lowLabel={t('net.projects.min')}
                                            highLabel={t('net.projects.max')}
                                            onChange={(low, high) => {
                                              // En los extremos no se fija nada: si cambian
                                              // los datos, el tramo sigue siendo "todos".
                                              setProjectSpan({
                                                min: low === 0 ? null : (projectSteps[low] ?? null),
                                                max:
                                                  high === projectSteps.length - 1
                                                    ? null
                                                    : (projectSteps[high] ?? null),
                                              })
                                            }}
                                          />
                                        </div>
                                      )
                                    }
                                    footer={<p className="hint">{t('net.projects.hint')}</p>}
                                  >
                                    {projects.map((project) => (
                                      <li key={project.id}>
                                        <button
                                          type="button"
                                          aria-pressed={filters.projectId === project.id}
                                          className={
                                            filters.projectId === project.id ? 'active' : ''
                                          }
                                          onClick={() => {
                                            change({
                                              projectId:
                                                filters.projectId === project.id
                                                  ? null
                                                  : project.id,
                                            })
                                          }}
                                        >
                                          <span className="net-row-name" title={project.name}>
                                            {project.name}
                                          </span>
                                          <span className="net-row-count">
                                            {project.corrections.toLocaleString()}
                                            {project.passRate !== null && (
                                              <span
                                                className="net-row-badge"
                                                title={t('net.projects.pass')}
                                                style={badgeStyle(passColor(project.passRate))}
                                              >
                                                {Math.round(project.passRate * 100)} %
                                              </span>
                                            )}
                                          </span>
                                        </button>
                                      </li>
                                    ))}
                                  </RankCard>
                                ),
                              },
                            ]
                          : []),
                      ]
                    : []),
                  {
                    id: 'about',
                    chrome: false,
                    content: (
                      <details className="card net-about">
                        <summary>{t('net.about')}</summary>
                        <p>{t('net.about.graph')}</p>
                        <p>{t('net.about.endogamy')}</p>
                        <p>{t('net.about.external')}</p>
                      </details>
                    ),
                  },
                ]}
              />
            </aside>
          )}
        </div>

        {graph === null && (
          <div className="net-stage">
            {error === null ? (
              <p className="estado">{t('net.loading')}</p>
            ) : (
              <ErrorNote
                error={error}
                onRetry={() => {
                  setReloads((count) => count + 1)
                }}
              />
            )}
          </div>
        )}

        {graph !== null && (
          <>
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
                  tooltip={tooltip}
                  controls={controls}
                />
              )}
              <div className="net-key">
                <ul className="net-legend">
                  {legend.map((entry) => (
                    <li key={entry.label}>
                      <span style={{ background: entry.color }} />
                      {entry.label}
                    </li>
                  ))}
                </ul>
                {/* La escala: entre qué porcentajes se reparte el degradado, de punto en punto. */}
                {isScaleMode(mode) && scale !== undefined && (
                  <div className="net-scale">
                    <span
                      className="net-scale-bar"
                      aria-hidden="true"
                      style={{
                        background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1]
                          .map((step) =>
                            scaleColor(scale.min + (scale.max - scale.min) * step, scale),
                          )
                          .join(', ')})`,
                      }}
                    />
                    <label>
                      <span>{t('net.scale.from', { n: scale.min })}</span>
                      <input
                        type="range"
                        min={0}
                        max={99}
                        step={1}
                        value={scale.min}
                        onChange={(event) => {
                          const min = Number(event.target.value)

                          // El mínimo empuja al máximo si lo alcanza: siempre queda un punto de tramo.
                          setScales((current) => ({
                            ...current,
                            [mode]: { min, max: Math.max(min + 1, scale.max) },
                          }))
                        }}
                      />
                    </label>
                    <label>
                      <span>{t('net.scale.to', { n: scale.max })}</span>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={scale.max}
                        onChange={(event) => {
                          const max = Number(event.target.value)

                          setScales((current) => ({
                            ...current,
                            [mode]: { min: Math.min(max - 1, scale.min), max },
                          }))
                        }}
                      />
                    </label>
                    <div className="net-scale-actions">
                      <button
                        type="button"
                        className="pill"
                        onClick={() => {
                          setScales((current) => ({
                            ...current,
                            [mode]: fitScale(graph.nodes, mode),
                          }))
                        }}
                      >
                        {t('net.scale.fit')}
                      </button>
                      <button
                        type="button"
                        className="pill"
                        onClick={() => {
                          setScales((current) => ({ ...current, [mode]: DEFAULT_SCALES[mode] }))
                        }}
                      >
                        {t('net.scale.reset')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="net-help">{t('net.help')}</p>
              <p className="net-shown" role="status">
                {t('net.shown', { people: graph.nodes.length, links: graph.links.length })}
                {graph.hidden !== null &&
                  ` · ${t('net.hidden', { people: graph.hidden.nodes, links: graph.hidden.links })}`}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
