import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { CurrentUser, NetworkGraph, NetworkNode } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { NetworkParams } from '../../shared/api/types'
import { usePolling } from '../../shared/hooks/usePolling'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Blocks } from '../../shared/layout/Blocks'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { CampusPicker } from '../../shared/ui/CampusPicker'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { startOf } from '../../shared/period'
import type { Period } from '../../shared/period'
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
import { PersonPanel } from './PersonPanel'
import { PersonSearch } from './PersonSearch'
import { RangeSlider, Slider } from '../../shared/ui/RangeSlider'
import { RankCard, ranked } from './RankCard'
import type { Order } from './RankCard'
import { StrictestCard } from './StrictestCard'
import { Timeline } from './Timeline'
import { InfoTip } from '../../shared/ui/InfoTip'
import { NetworkTour } from './NetworkTour'
import { decodePart, networkHref } from '../../shared/links'

/** «Todas»: lo más que acepta la API (`MAX_LIMIT` en `network.service.ts`). */
const ALL_PEOPLE = 20_000

/**
 * Topes de personas que se pueden pedir. Siempre se ven las más activas. Con
 * París o todos los campus, pasar de 1 500 hace ir lento el grafo: lo dice la
 * propia opción.
 */
const LIMITS = [150, 300, 600, 1000, 1500, 2000, ALL_PEOPLE] as const

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
export function NetworkPage({ me, switcher }: { me: CurrentUser; switcher?: ReactNode }) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [filters, setFilters] = useState<Filters>({
    // Un enlace a una persona enseña su historia entera; el campus, el último año.
    period: loginInUrl() === null ? '12' : 'all',
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

  // Las opciones de los filtros (campus, meses, proyectos) salen del último
  // grafo con gente: si unos filtros no dejan a nadie, siguen ahí para
  // cambiarlos, en vez de desaparecer con el grafo.
  const [lastFull, setLastFull] = useState<NetworkGraph | null>(null)

  if (graph !== null && graph.nodes.length > 0 && graph !== lastFull) setLastFull(graph)

  const options = graph !== null && graph.nodes.length === 0 ? (lastFull ?? graph) : graph

  // Sin quien no es de ninguna de las escuelas elegidas: solo llenan de líneas.
  const [onlyInside, setOnlyInside] = useState(false)
  const shownGraph = useMemo(() => {
    if (graph === null || !onlyInside) return graph

    const nodes = graph.nodes.filter((node) => !node.external)
    const inside = new Set(nodes.map((node) => node.login))

    return {
      ...graph,
      nodes,
      links: graph.links.filter((link) => inside.has(link.source) && inside.has(link.target)),
    }
  }, [graph, onlyInside])

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
        <span>
          {tn('net.tip.endogamy', node.partners, { n: node.endogamy, partners: node.partners })}
        </span>
      </>
    ),
    [t, tn],
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
  const available = options?.available
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
  const allProjects = options?.projects
  // Entre cuántas correcciones tiene que tener un proyecto para salir en su
  // lista; `null` es sin tope por ese lado. Se puede elegir cualquier cantidad;
  // las que hay de verdad salen como marcas en la barra.
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
            {switcher}

            {graph !== null && graph.sync.phase !== 'done' && (
              <div className="net-sync" role="status">
                <span>
                  {graph.sync.total === null
                    ? t('net.sync.pending')
                    : tn('net.sync.copying', graph.sync.total, {
                        rows: number(graph.sync.rows),
                        total: graph.sync.total,
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
            {graph !== null && options !== null && options.available.length > 1 && (
              <div className="net-filter">
                <span className="eyebrow">{t('net.campuses')}</span>
                <CampusPicker
                  available={options.available}
                  current={graph.campuses}
                  onApply={(next) => {
                    change({ campuses: next })
                    // Con más de una, lo que interesa ver es de cuál es cada quien.
                    if (next === 'all' || next.length > 1) setMode('campus')
                  }}
                />
              </div>
            )}
            <div className="net-filter">
              {/* El selector de periodo de toda la web: de menos a más, y al final «a mano». */}
              <PeriodPicker
                value={filters.period}
                onChange={(period) => {
                  change({ period })
                }}
                from={filters.from}
                to={filters.to}
                onDates={(from, to) => {
                  change({ from, to })
                }}
              />
            </div>

            {graph !== null && (
              <Timeline
                months={(options ?? graph).timeline}
                from={params.from ?? null}
                to={params.to ?? null}
                onSelect={(from, to) => {
                  change({ period: 'custom', from, to })
                }}
              />
            )}

            <div className="net-filter">
              <span className="eyebrow">{t('common.person')}</span>
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
                  {(options?.projects ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.corrections})
                    </option>
                  ))}
                </select>
              </label>
              <div className="net-min">
                <span>{t('net.min', { n: filters.min })}</span>
                <Slider
                  min={1}
                  max={12}
                  value={filters.min}
                  label={t('net.minLabel')}
                  // Cada cambio vuelve a pedir el grafo: al soltar.
                  commit="release"
                  onChange={(min) => {
                    change({ min })
                  }}
                />
              </div>
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
                      {limit === ALL_PEOPLE
                        ? t('net.limit.all')
                        : limit > 1500
                          ? t('net.limit.slow', { n: number(limit) })
                          : number(limit)}
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
              <label className="net-check">
                <input
                  type="checkbox"
                  checked={onlyInside}
                  onChange={(event) => {
                    setOnlyInside(event.target.checked)
                  }}
                />
                {t('net.onlyInside')}
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
                          <strong>{number(graph.totals.corrections)}</strong>
                        </div>
                        <div className="tile">
                          <span className="eyebrow">{t('common.people')}</span>
                          <strong>{number(graph.totals.people)}</strong>
                        </div>
                        <div className="tile">
                          <span className="eyebrow">{t('net.total.pairs')}</span>
                          <strong>{number(graph.totals.pairs)}</strong>
                          <small>
                            {tn('net.total.mutual', graph.totals.mutualPairs, {
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
                          <strong>{number(graph.totals.communities)}</strong>
                        </div>
                        <div className="tile wide">
                          <Meter label={t('net.total.endogamy')} value={graph.totals.endogamy} />
                          <small>{t('net.endogamyScale')}</small>
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
                                    : `${t('net.endogamyScale')} ${t('net.rankingHint')}`}
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
                                              min: number(spanLow),
                                              max: number(spanHigh),
                                            })}
                                          </span>
                                          <RangeSlider
                                            // Cualquier cantidad, no solo las que hay: las
                                            // que hay salen como marcas. En curva
                                            // logarítmica, porque unos pocos proyectos
                                            // tienen muchísimas más que el resto.
                                            min={projectSteps[0] ?? 0}
                                            max={projectSteps.at(-1) ?? 0}
                                            curve="log"
                                            ticks={projectSteps}
                                            low={spanLow}
                                            high={spanHigh}
                                            lowLabel={t('net.projects.min')}
                                            highLabel={t('net.projects.max')}
                                            onChange={(low, high) => {
                                              // En los extremos no se fija nada: si cambian
                                              // los datos, el tramo sigue siendo "todos".
                                              setProjectSpan({
                                                min: low === projectSteps[0] ? null : low,
                                                max: high === projectSteps.at(-1) ? null : high,
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
                                            {number(project.corrections)}
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
              {(shownGraph ?? graph).nodes.length === 0 ? (
                <p className="estado">
                  {graph.query.login === null ? t('net.empty') : t('net.emptyPerson')}
                </p>
              ) : (
                <ForceGraph
                  nodes={(shownGraph ?? graph).nodes}
                  links={(shownGraph ?? graph).links}
                  colorOf={paint}
                  selected={selected}
                  onSelect={setSelected}
                  label={t('net.graphLabel', {
                    people: (shownGraph ?? graph).nodes.length,
                    links: (shownGraph ?? graph).links.length,
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
                    <div className="net-scale-range">
                      <span>
                        {t('net.scale.from', { n: scale.min })} ·{' '}
                        {t('net.scale.to', { n: scale.max })}
                      </span>
                      <RangeSlider
                        max={100}
                        low={scale.min}
                        high={scale.max}
                        // Siempre queda al menos un punto de tramo.
                        minGap={1}
                        format={(n) => t('range.percent', { n })}
                        lowLabel={t('net.scale.low')}
                        highLabel={t('net.scale.high')}
                        onChange={(min, max) => {
                          setScales((current) => ({ ...current, [mode]: { min, max } }))
                        }}
                      />
                    </div>
                    <div className="net-scale-actions">
                      <button
                        type="button"
                        className="pill"
                        onClick={() => {
                          setScales((current) => ({
                            ...current,
                            [mode]: fitScale((shownGraph ?? graph).nodes, mode),
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
                {t('net.shown', {
                  people: (shownGraph ?? graph).nodes.length,
                  links: (shownGraph ?? graph).links.length,
                })}
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
