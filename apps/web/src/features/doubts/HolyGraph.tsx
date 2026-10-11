import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import type { GraphProject, HolyGraph as HolyGraphData } from '@sanatorio/contracts'

import { useMediaQuery } from '../../shared/hooks/useMediaQuery'
import { useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import {
  completion,
  countSignals,
  hasSignal,
  itemsOf,
  lookOf,
  mainSignal,
  mergeSignals,
  seriesIn,
  SIGNAL_GLYPH,
  SIGNALS,
} from './graph'
import type { NodeLook, RingItem, Signal } from './graph'
import { isoOf } from './iso'
import type { Half } from './iso'
import { layoutOf, radiusFor } from './layout'
import { deadlinesFor, loadPace, PACES, savePace } from '../../shared/pace'
import type { Pace } from '../../shared/pace'

type HolyGraphProps = {
  graph: HolyGraphData
  /** Proyecto abierto en el tablón, o `null`. */
  selected: number | null
  onSelect: (projectId: number) => void
}

/** El último círculo del common core. */
const LAST_CIRCLE = 6

/** Tamaño mínimo de la burbuja de una serie cerrada: caben sus módulos en miniatura. */
const SERIES_RADIUS = 40

/**
 * Tono de cada círculo (matiz HSL). Van seguidos, del turquesa al violeta, para
 * que de un círculo al siguiente el color avance un paso y no dé un salto: se
 * lee como un degradado de dentro afuera. Los colores concretos (pastel en
 * claro, apagados en oscuro) los ponen los estilos.
 */
const HUES = [172, 190, 208, 226, 244, 262, 280] as const

/** Alturas de las bandejas: todas tienen grosor, cada una un escalón más que la de fuera. */
const PLATE_BASE = 9
const PLATE_STEP = 6
/** Lo que sube una bandeja al pasar por ella o al tener abierto uno de sus proyectos. */
const PLATE_LIFT = 30
/** Lo que encogen las burbujas en la vista en perspectiva. */
const ORB_SCALE = 0.84

/**
 * Lleva unas alturas hacia sus destinos poco a poco, fotograma a fotograma, para
 * que una bandeja suba y baje en vez de saltar. Sin animaciones (preferencia
 * del sistema), salta.
 */
function useEased(targets: readonly number[]): readonly number[] {
  const [values, setValues] = useState(targets)
  const current = useRef(targets)
  const key = targets.join(',')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = targets
      setValues(targets)

      return undefined
    }

    let frame = 0
    const step = (): void => {
      const next = targets.map((target, index) => {
        const value = current.current[index] ?? target
        const left = target - value

        return Math.abs(left) < 0.4 ? target : value + left * 0.24
      })

      current.current = next
      setValues(next)

      // Mientras alguna no haya llegado, otro fotograma.
      if (next.some((value, index) => value !== targets[index])) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frame)
    }
    // `key` resume `targets`: la lista es nueva en cada pintado aunque no cambie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return values
}

const hueOf = (circle: number): number => HUES[circle % HUES.length] ?? 172

/** Horas que suman esos proyectos, contando solo los que tienen estimación. */
const hoursOf = (projects: readonly GraphProject[]): number =>
  projects.reduce((sum, project) => sum + (project.hours ?? 0), 0)

/**
 * Cómo se pinta la burbuja de una serie: como aprobada si lo están todos sus
 * módulos, como en curso si hay alguno empezado, cerrada si aún no se puede
 * hacer ninguno, y si no, como disponible.
 */
function seriesLook(projects: readonly GraphProject[]): NodeLook {
  if (projects.every((project) => project.status === 'finished')) return 'finished'
  if (projects.some((project) => project.status !== 'todo')) return 'in_progress'

  return projects.every((project) => project.locked) ? 'locked' : 'todo'
}

/** El radio de la burbuja de una serie: el de sus horas juntas, sin bajar del mínimo. */
const seriesRadius = (projects: readonly GraphProject[]): number =>
  Math.max(SERIES_RADIUS, radiusFor(hoursOf(projects) || null))

const LOOKS: readonly NodeLook[] = ['finished', 'in_progress', 'todo', 'locked']

const sizeOf = (item: RingItem): number =>
  item.kind === 'series' ? seriesRadius(item.projects) : radiusFor(item.project.hours)

/** `64 %`. */
const percent = (fraction: number): string => `${Math.round(fraction * 100)} %`

/** Lo que lee un lector de pantalla (y lo que enseña la barra de detalle) de un proyecto. */
function describe(project: GraphProject, circle: number, t: Translate): string {
  const parts = [project.name, t('graph.circle', { n: circle })]
  const { signals } = project

  parts.push(t(project.perfect ? 'graph.perfect' : `graph.status.${lookOf(project)}`))
  if (project.hours !== null) parts.push(t('graph.hours', { n: Math.round(project.hours) }))

  if (signals.unanswered > 0) {
    parts.push(
      t(signals.unanswered === 1 ? 'graph.one.unanswered' : 'graph.count.unanswered', {
        n: signals.unanswered,
      }),
    )
  }
  if (signals.proposals > 0) {
    parts.push(
      t(signals.proposals === 1 ? 'graph.one.proposals' : 'graph.count.proposals', {
        n: signals.proposals,
      }),
    )
  }
  if (signals.missingGuide) parts.push(t('graph.signal.missingGuide'))

  return parts.join(' · ')
}

/** Lo mismo, de una serie cerrada. */
function describeSeries(series: string, projects: readonly GraphProject[], t: Translate): string {
  const done = projects.filter((project) => project.status === 'finished').length
  const hours = hoursOf(projects)

  return [
    t('graph.seriesLabel', { series, done, total: projects.length }),
    ...(hours > 0 ? [t('graph.hours', { n: Math.round(hours) })] : []),
  ].join(' · ')
}

/**
 * El grafo del tablón: **tu** plan del common core, por círculos.
 *
 * - Cada círculo es una bandeja con grosor, vista en perspectiva, que se va
 *   **rellenando** según lo que llevas aprobado en él (por horas); su etiqueta
 *   dice el porcentaje. Al pasar por una bandeja, **se levanta** con sus
 *   proyectos por encima de las demás; la del proyecto abierto se queda arriba.
 * - Cada proyecto es una burbuja, más grande cuantas más horas estima 42 para él.
 *   Turquesa si lo aprobaste (con aro dorado si fue con 125), blanca si lo estás
 *   haciendo, gris si lo tienes disponible y gris con candado si todavía no.
 * - Los módulos numerados (Python, CPP) van **juntos en una burbuja**, con cada
 *   módulo como un punto dentro; al pulsarla se abren, y se vuelven a cerrar con
 *   su botón de arriba.
 *
 * En pantallas estrechas los círculos pasan a ser filas, porque los nombres
 * dejarían de leerse.
 */
export function HolyGraph({ graph, selected, onSelect }: HolyGraphProps) {
  const { t, lang } = useI18n()
  const narrow = useMediaQuery('(max-width: 700px)')
  // Aviso con el que se filtra el grafo: los proyectos que no lo tienen se apagan.
  const [focus, setFocus] = useState<Signal | null>(null)
  // Proyecto bajo el ratón o con el foco: la barra de detalle habla de él.
  const [hovered, setHovered] = useState<string | null>(null)
  // Series abiertas. Por defecto, todas cerradas: es lo que deja respirar al grafo.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [pace, setPace] = useState<Pace | null>(loadPace)
  // Círculo bajo el ratón o con el foco: su bandeja se levanta.
  const [raised, setRaised] = useState<number | null>(null)

  const rings = useMemo(
    () =>
      graph.circles.map(({ circle, projects }) => ({
        circle,
        projects,
        items: itemsOf(projects, expanded),
        done: completion(projects),
      })),
    [graph.circles, expanded],
  )
  const layout = useMemo(() => layoutOf(rings.map((ring) => ring.items.map(sizeOf))), [rings])
  const iso = useMemo(() => isoOf(layout), [layout])
  const allSeries = useMemo(() => seriesIn(graph), [graph])

  const totals = countSignals(graph)
  const active = SIGNALS.filter((signal) => totals[signal] > 0)
  const everything = graph.circles.flatMap(({ circle, projects }) =>
    projects.map((project) => ({ project, circle })),
  )
  const looks = new Set(everything.map(({ project }) => lookOf(project)))
  const anyPerfect = everything.some(({ project }) => project.perfect)
  const selectedEntry = everything.find(({ project }) => project.projectId === selected)

  // Cada bandeja, un escalón más alta que la de fuera; la del ratón y la del
  // proyecto abierto, levantadas.
  const lifted = (circle: number): boolean => circle === raised || circle === selectedEntry?.circle
  const heights = useEased(
    rings.map(
      ({ circle }, index) =>
        PLATE_BASE + (rings.length - 1 - index) * PLATE_STEP + (lifted(circle) ? PLATE_LIFT : 0),
    ),
  )

  const deadlines =
    pace === null || graph.startedAt === null ? [] : deadlinesFor(graph.startedAt, pace)

  const choosePace = (next: Pace | null): void => {
    savePace(next)
    setPace(next)
  }

  const toggleSeries = (series: string): void => {
    const next = new Set(expanded)

    if (!next.delete(series)) next.add(series)

    setExpanded(next)
  }

  const dimmed = (projects: readonly GraphProject[]): boolean =>
    focus !== null && !projects.some((project) => hasSignal(project.signals, focus))

  // El orden en que se pinta: mitades de atrás de fuera adentro, y de delante al revés.
  const halves: { circle: number; index: number; half: Half }[] = [
    ...rings.map(({ circle }, index) => ({ circle, index, half: 'back' as const })).reverse(),
    ...rings.map(({ circle }, index) => ({ circle, index, half: 'front' as const })),
  ]

  /** Las burbujas de un círculo que caen en esa mitad, de la más lejana a la más cercana. */
  const nodesOf = (index: number, half: Half) =>
    (rings[index]?.items ?? [])
      .flatMap((item, at) => {
        const point = layout.rings[index]?.nodes[at]

        return point === undefined ? [] : [{ item, point }]
      })
      .filter(({ point }) => point.y >= layout.center === (half === 'front'))
      .sort((a, b) => a.point.y - b.point.y)

  /** Texto de la barra de detalle: lo que hay bajo el ratón, o lo que está abierto. */
  const detail = (): string => {
    for (const ring of rings) {
      for (const item of ring.items) {
        if (item.kind === 'series' && hovered === `series:${item.series}`) {
          return describeSeries(item.series, item.projects, t)
        }
        if (item.kind === 'project' && hovered === `project:${item.project.projectId}`) {
          return describe(item.project, ring.circle, t)
        }
      }
    }

    return selectedEntry === undefined
      ? t('graph.pick')
      : describe(selectedEntry.project, selectedEntry.circle, t)
  }

  /** Atributos comunes de una burbuja pulsable del dibujo. */
  const bubble = (key: string, label: string, pressed: boolean, activate: () => void) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    'aria-pressed': pressed,
    onClick: activate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        activate()
      }
    },
    onMouseEnter: () => {
      setHovered(key)
    },
    onMouseLeave: () => {
      setHovered(null)
    },
    onFocus: () => {
      setHovered(key)
    },
    onBlur: () => {
      setHovered(null)
    },
  })

  const markOf = (signals: GraphProject['signals'], radius: number): ReactNode => {
    const signal = mainSignal(signals)

    if (signal === null) return null

    return (
      <g
        className={`graph-mark ${signal}`}
        transform={`translate(${(radius * 0.72).toFixed(1)} ${(-radius * 0.72).toFixed(1)})`}
      >
        <circle r="9" />
        <text>{signal === 'unanswered' ? signals.unanswered : SIGNAL_GLYPH[signal]}</text>
      </g>
    )
  }

  return (
    <div className="card holy-graph">
      <header className="graph-head">
        <span className={`graph-track ${graph.track}`}>{t(`graph.track.${graph.track}`)}</span>
        <span className="graph-here">{t('graph.here', { n: graph.currentCircle })}</span>
        {graph.level !== null && (
          <span className="graph-level" title={t('graph.levelHint')}>
            {t('graph.level', { level: graph.level.toFixed(2) })}
            <span
              className="graph-level-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((graph.level % 1) * 100)}
              aria-label={t('graph.levelHint')}
            >
              <span style={{ width: `${(graph.level % 1) * 100}%` }} />
            </span>
          </span>
        )}
      </header>

      {(active.length > 0 || allSeries.length > 0) && (
        <div className="graph-summary">
          {active.length > 0 && (
            <div className="filter-pills" role="group" aria-label={t('graph.needsYou')}>
              <span className="eyebrow">{t('graph.needsYou')}</span>
              {active.map((signal) => (
                <button
                  key={signal}
                  type="button"
                  className={`pill ${focus === signal ? 'active' : ''}`}
                  aria-pressed={focus === signal}
                  onClick={() => {
                    setFocus(focus === signal ? null : signal)
                  }}
                >
                  <span className={`graph-mark ${signal}`} aria-hidden="true">
                    {SIGNAL_GLYPH[signal]}
                  </span>
                  {t(`graph.${totals[signal] === 1 ? 'one' : 'count'}.${signal}`, {
                    n: totals[signal],
                  })}
                </button>
              ))}
            </div>
          )}
          {allSeries.length > 0 && (
            <div className="filter-pills" role="group" aria-label={t('graph.series')}>
              <span className="eyebrow">{t('graph.series')}</span>
              {allSeries.map(({ series, total }) => (
                <button
                  key={series}
                  type="button"
                  className={`pill ${expanded.has(series) ? 'active' : ''}`}
                  aria-expanded={expanded.has(series)}
                  onClick={() => {
                    toggleSeries(series)
                  }}
                >
                  {t(expanded.has(series) ? 'graph.collapse' : 'graph.expand', {
                    series,
                    n: total,
                  })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {narrow ? (
        <ol className="graph-rows">
          {rings.map(({ circle, items, done }) => (
            <li
              key={circle}
              className={circle === graph.currentCircle ? 'current' : ''}
              style={{ ['--done' as string]: `${done * 100}%`, ['--hue' as string]: hueOf(circle) }}
            >
              <span className="graph-ring-name">
                {t('graph.circle', { n: circle })}
                {circle <= graph.currentCircle && ` · ${percent(done)}`}
                {circle === graph.currentCircle && ` · ${t('graph.youAreHere')}`}
              </span>
              <div className="graph-row">
                {items.map((item) =>
                  item.kind === 'series' ? (
                    <button
                      key={item.series}
                      type="button"
                      className={`graph-node series ${dimmed(item.projects) ? 'dimmed' : ''}`}
                      aria-expanded={false}
                      aria-label={describeSeries(item.series, item.projects, t)}
                      onClick={() => {
                        toggleSeries(item.series)
                      }}
                    >
                      {item.series} ·{' '}
                      {item.projects.filter((project) => project.status === 'finished').length}/
                      {item.projects.length} ▸
                    </button>
                  ) : (
                    <button
                      key={item.project.projectId}
                      type="button"
                      className={`graph-node ${lookOf(item.project)} ${item.project.perfect ? 'perfect' : ''} ${item.project.projectId === selected ? 'selected' : ''} ${dimmed([item.project]) ? 'dimmed' : ''}`}
                      aria-pressed={item.project.projectId === selected}
                      aria-label={describe(item.project, circle, t)}
                      onClick={() => {
                        onSelect(item.project.projectId)
                      }}
                    >
                      {item.project.locked && <Icon name="candado" size={13} />}
                      {item.project.perfect && <span aria-hidden="true">★</span>}
                      {item.project.name}
                      {mainSignal(item.project.signals) !== null && (
                        <span
                          className={`graph-mark ${mainSignal(item.project.signals) ?? ''}`}
                          aria-hidden="true"
                        >
                          {mainSignal(item.project.signals) === 'unanswered'
                            ? item.project.signals.unanswered
                            : SIGNAL_GLYPH[mainSignal(item.project.signals) ?? 'missingGuide']}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <svg
          className={`graph-svg ${raised === null ? '' : 'focusing'}`}
          viewBox={`0 0 ${iso.width} ${iso.height.toFixed(0)}`}
          style={{ maxWidth: Math.min(760, iso.width * 1.3) }}
          role="group"
          aria-label={t('graph.title')}
          onMouseLeave={() => {
            setRaised(null)
          }}
        >
          <defs>
            {/* La luz viene de arriba a la izquierda: es lo que da volumen a cada burbuja. */}
            {LOOKS.map((look) => (
              <radialGradient key={look} id={`orb-${look}`} cx="35%" cy="28%" r="80%">
                <stop offset="0%" className={`orb-light ${look}`} />
                <stop offset="100%" className={`orb-dark ${look}`} />
              </radialGradient>
            ))}
            <radialGradient id="orb-series" cx="35%" cy="28%" r="85%">
              <stop offset="0%" className="orb-light series" />
              <stop offset="100%" className="orb-dark series" />
            </radialGradient>
            {/* Las paredes: más oscuras hacia los lados, como un cilindro iluminado de frente. */}
            <linearGradient id="wall-shade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
              <stop offset="45%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.26" />
            </linearGradient>
            <filter id="orb-shadow" x="-40%" y="-40%" width="180%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* La sombra de todo el conjunto sobre el suelo. */}
          <path
            className="graph-ground"
            d={`${iso.top(layout.rings.at(-1)?.outer ?? 0, 0, -6, 'back')} ${iso.top(layout.rings.at(-1)?.outer ?? 0, 0, -6, 'front')}`}
          />

          {/* Primero las mitades de atrás, de fuera adentro; después las de delante, de dentro afuera. */}
          {halves.map(({ circle, index, half }) => {
            const ring = layout.rings[index]
            const entry = rings[index]

            if (ring === undefined || entry === undefined) return null

            const z = heights[index] ?? PLATE_BASE
            const inner = layout.rings[index - 1]?.outer ?? 0
            const state =
              circle === graph.currentCircle
                ? 'current'
                : circle < graph.currentCircle
                  ? 'done'
                  : 'ahead'
            const tag = iso.point(ring.tag.x, ring.tag.y, z)
            // La etiqueta va con la mitad en la que cae, para que no la tape la otra.
            const tagHere = ring.radius > 0 && ring.tag.y >= layout.center === (half === 'front')

            return (
              <g
                key={`${circle}-${half}`}
                className={`graph-ring ${lifted(circle) ? 'lifted' : ''}`}
                onMouseEnter={() => {
                  setRaised(circle)
                }}
                onFocus={() => {
                  setRaised(circle)
                }}
                onBlur={() => {
                  setRaised(null)
                }}
              >
                <g
                  className={`graph-plate ${state}`}
                  style={{ ['--hue' as string]: hueOf(circle) }}
                  aria-hidden="true"
                >
                  {/* Atrás se ve la pared de dentro; delante, la de fuera. */}
                  {half === 'back' && inner > 0 && (
                    <>
                      <path className="wall inner" d={iso.wall(inner, z, 'back')} />
                      <path className="wall-shade" d={iso.wall(inner, z, 'back')} />
                    </>
                  )}
                  {half === 'front' && (
                    <>
                      <path className="wall" d={iso.wall(ring.outer, z, 'front')} />
                      <path className="wall-shade" d={iso.wall(ring.outer, z, 'front')} />
                    </>
                  )}
                  <path className="plate" d={iso.top(ring.outer, inner, z, half)} />
                  {/* El canto se pinta aparte: si fuera el borde de la cara, se vería la costura entre las dos mitades. */}
                  <path className="rim" d={iso.rim(ring.outer, z, half)} />
                  {/* El relleno: la porción del círculo que ya está aprobada. */}
                  {entry.done > 0 && (
                    <path
                      className="fill"
                      d={iso.sector(ring.outer, inner, z, ring.start, entry.done, half)}
                    />
                  )}
                  {tagHere && (
                    <g transform={`translate(${tag.x.toFixed(1)} ${tag.y.toFixed(1)})`}>
                      {/* A un círculo al que aún no se ha llegado le basta su número. */}
                      {state === 'ahead' ? (
                        <>
                          <circle className="ring-tag" r="10" />
                          <text className="ring-number">{circle}</text>
                        </>
                      ) : (
                        <>
                          <rect
                            className="ring-tag"
                            x="-26"
                            y="-10"
                            width="52"
                            height="20"
                            rx="10"
                          />
                          <text className="ring-number">
                            {circle} · {percent(entry.done)}
                          </text>
                        </>
                      )}
                    </g>
                  )}
                </g>

                {nodesOf(index, half).map(({ item, point }) => {
                  // En perspectiva lo profundo se aprieta: las burbujas, algo más pequeñas, para que no se pisen.
                  const size = sizeOf(item) * ORB_SCALE
                  // La burbuja se apoya en la bandeja: su centro queda un poco por encima.
                  const at = iso.point(point.x, point.y, z)
                  const place = `translate(${at.x.toFixed(1)} ${(at.y - size * 0.62).toFixed(1)})`
                  const shadow = (
                    <ellipse
                      className="orb-ground"
                      cy={size * 0.62}
                      rx={size * 0.7}
                      ry={size * 0.2}
                    />
                  )

                  if (item.kind === 'series') {
                    const key = `series:${item.series}`
                    const holdsSelected = item.projects.some(
                      (project) => project.projectId === selected,
                    )
                    const look = seriesLook(item.projects)
                    const hours = hoursOf(item.projects)

                    return (
                      <g
                        key={key}
                        transform={place}
                        className={`graph-node series ${look} ${holdsSelected ? 'selected' : ''} ${dimmed(item.projects) ? 'dimmed' : ''}`}
                        {...bubble(
                          key,
                          describeSeries(item.series, item.projects, t),
                          false,
                          () => {
                            toggleSeries(item.series)
                          },
                        )}
                        aria-expanded={false}
                      >
                        {shadow}
                        <g className="orb">
                          <circle className="halo" r={size + 6} />
                          <circle
                            className="disc"
                            r={size}
                            // Aprobada entera, se pinta como cualquier proyecto aprobado.
                            fill={look === 'finished' ? 'url(#orb-finished)' : 'url(#orb-series)'}
                            filter="url(#orb-shadow)"
                          />
                          {/* El mini grafo: un punto por módulo, con el color de su estado. */}
                          {item.projects.map((project, dot) => {
                            const angle = -Math.PI / 2 + (dot * 2 * Math.PI) / item.projects.length

                            return (
                              <circle
                                key={project.projectId}
                                className={`series-dot ${lookOf(project)}`}
                                cx={((size - 9) * Math.cos(angle)).toFixed(1)}
                                cy={((size - 9) * Math.sin(angle)).toFixed(1)}
                                r="4.6"
                              />
                            )
                          })}
                          <text className="series-name" y={hours > 0 ? -10 : -4}>
                            {item.series}
                          </text>
                          <text className="series-count" y={hours > 0 ? 2 : 9}>
                            {
                              item.projects.filter((project) => project.status === 'finished')
                                .length
                            }
                            /{item.projects.length}
                          </text>
                          {hours > 0 && (
                            <text className="series-hours" y="13">
                              {Math.round(hours)} h
                            </text>
                          )}
                          {markOf(mergeSignals(item.projects), size)}
                        </g>
                      </g>
                    )
                  }

                  const { project } = item
                  const key = `project:${project.projectId}`

                  return (
                    <g
                      key={key}
                      transform={place}
                      className={`graph-node ${lookOf(project)} ${project.perfect ? 'perfect' : ''} ${project.projectId === selected ? 'selected' : ''} ${dimmed([project]) ? 'dimmed' : ''}`}
                      {...bubble(
                        key,
                        describe(project, circle, t),
                        project.projectId === selected,
                        () => {
                          onSelect(project.projectId)
                        },
                      )}
                    >
                      {shadow}
                      {/* Capa aparte para la animación: el `<g>` de fuera ya lleva la posición. */}
                      <g className="orb">
                        <circle className="halo" r={size + 6} />
                        <circle
                          className="disc"
                          r={size}
                          fill={`url(#orb-${lookOf(project)})`}
                          filter="url(#orb-shadow)"
                        />
                        {project.perfect && <circle className="laurel" r={size + 2.5} />}
                        <text
                          className="graph-label"
                          style={{ fontSize: size < 24 ? 8.5 : size > 34 ? 12 : 10 }}
                          // Los nombres largos se aprietan para no salirse de la burbuja.
                          {...(project.short.length > 7
                            ? { textLength: size * 2 - 8, lengthAdjust: 'spacingAndGlyphs' }
                            : {})}
                        >
                          {project.short}
                        </text>
                        {project.locked && (
                          <g
                            className="graph-lock"
                            transform={`translate(${(-size * 0.7 - 6).toFixed(1)} ${(-size * 0.7 - 6).toFixed(1)})`}
                          >
                            <circle cx="6" cy="6" r="8" />
                            <Icon name="candado" size={12} />
                          </g>
                        )}
                        {project.perfect && (
                          <text className="graph-star" y={size * 0.62}>
                            ★
                          </text>
                        )}
                        {markOf(project.signals, size)}
                      </g>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      )}

      {graph.startedAt !== null && (
        <div className="graph-pace">
          <label className="setting">
            <span>{t('pace.label')}</span>
            <select
              value={pace ?? ''}
              onChange={(event) => {
                choosePace(PACES.find((option) => String(option) === event.target.value) ?? null)
              }}
            >
              <option value="">{t('pace.none')}</option>
              {PACES.map((option) => (
                <option key={option} value={option}>
                  {t('pace.option', { n: option })}
                </option>
              ))}
            </select>
          </label>
          {deadlines.length > 0 && (
            <ol className="pace-strip" aria-label={t('pace.deadlines')}>
              {deadlines.map(({ circle, date, daysLeft }) => {
                const completed = circle < graph.currentCircle
                const state = completed
                  ? 'done'
                  : daysLeft < 0
                    ? 'late'
                    : circle === graph.currentCircle
                      ? 'current'
                      : 'ahead'

                return (
                  <li
                    key={circle}
                    className={`pace-chip ${state}`}
                    style={{ ['--hue' as string]: hueOf(circle) }}
                  >
                    <strong>{circle}</strong>
                    <span>
                      {date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </span>
                    <span className="pace-left">
                      {completed
                        ? t('pace.done')
                        : daysLeft < 0
                          ? t('pace.late', { n: -daysLeft })
                          : t('pace.left', { n: daysLeft })}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      <p className="graph-detail" aria-live="polite">
        {detail()}
      </p>

      <ul className="graph-legend">
        {LOOKS.filter((look) => looks.has(look)).map((look) => (
          <li key={look}>
            <span className={`graph-swatch ${look}`} aria-hidden="true" />
            {t(`graph.status.${look}`)}
          </li>
        ))}
        {anyPerfect && (
          <li>
            <span className="graph-swatch finished perfect" aria-hidden="true" />
            {t('graph.perfect')}
          </li>
        )}
        {active.map((signal) => (
          <li key={signal}>
            <span className={`graph-mark ${signal}`} aria-hidden="true">
              {SIGNAL_GLYPH[signal]}
            </span>
            {t(`graph.signal.${signal}`)}
          </li>
        ))}
        <li>{t('graph.sizeHint')}</li>
      </ul>

      {graph.knownUpTo < LAST_CIRCLE && (
        <p className="hint graph-partial">{t('graph.partial', { n: graph.knownUpTo })}</p>
      )}
    </div>
  )
}
