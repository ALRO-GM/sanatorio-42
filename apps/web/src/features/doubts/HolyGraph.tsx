import { useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { GraphProject, HolyGraph as HolyGraphData } from '@sanatorio/contracts'

import { useMediaQuery } from '../../shared/hooks/useMediaQuery'
import { useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { countSignals, hasSignal, mainSignal, SIGNAL_GLYPH, SIGNALS } from './graph'
import type { Signal } from './graph'

type HolyGraphProps = {
  graph: HolyGraphData
  /** Proyecto abierto en el tablón, o `null`. */
  selected: number | null
  onSelect: (projectId: number) => void
}

type Point = { x: number; y: number }

// Geometría del dibujo, en unidades del `viewBox`.
const RING_STEP = 56
const NODE_RADIUS = 23
const MARGIN = 8
const LAST_RING = 6
const CENTER = LAST_RING * RING_STEP + NODE_RADIUS + MARGIN
const SIZE = CENTER * 2

/** Ángulo donde empieza un círculo: las doce, más 23° por cada círculo. */
const ringAngle = (circle: number): number => -Math.PI / 2 + circle * 0.4

/** El punto de un círculo que está en ese ángulo. */
function onRing(circle: number, angle: number): Point {
  const radius = circle * RING_STEP

  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) }
}

/**
 * Dónde cae cada proyecto de un círculo.
 *
 * Se reparten a partes iguales empezando medio paso después del ángulo del
 * círculo (`ringAngle`): así ahí siempre queda un hueco, que es donde va su
 * número. Cada círculo gira un poco más que el anterior para que los proyectos
 * no formen columnas de dentro afuera.
 */
function position(circle: number, index: number, total: number): Point {
  return circle === 0
    ? { x: CENTER, y: CENTER }
    : onRing(circle, ringAngle(circle) + ((index + 0.5) * 2 * Math.PI) / total)
}

/** Lo que lee un lector de pantalla (y el `title`) en cada proyecto. */
function describe(project: GraphProject, t: Translate): string {
  const parts = [project.name, t(`graph.status.${project.status}`)]
  const { signals } = project

  if (project.projectId === null) parts.push(t('graph.unknown'))
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

/**
 * El "Holy Graph" del tablón: el common core en círculos concéntricos, del 0
 * (centro) al 6.
 *
 * Cada proyecto va en gris (sin hacer), blanco (en curso) o turquesa (aprobado),
 * y lleva como mucho una marca: lo más urgente que la persona puede atender
 * ahí. En pantallas estrechas los círculos pasan a ser filas, porque los nombres
 * dejarían de leerse.
 */
export function HolyGraph({ graph, selected, onSelect }: HolyGraphProps) {
  const { t } = useI18n()
  const narrow = useMediaQuery('(max-width: 700px)')
  // Aviso con el que se filtra el grafo: los proyectos que no lo tienen se apagan.
  const [focus, setFocus] = useState<Signal | null>(null)
  const totals = countSignals(graph)
  const active = SIGNALS.filter((signal) => totals[signal] > 0)

  const dimmed = (project: GraphProject): boolean =>
    focus !== null && !hasSignal(project.signals, focus)

  const classes = (project: GraphProject): string =>
    [
      'graph-node',
      project.status,
      project.projectId === null ? 'unknown' : '',
      project.projectId !== null && project.projectId === selected ? 'selected' : '',
      dimmed(project) ? 'dimmed' : '',
    ]
      .filter((name) => name !== '')
      .join(' ')

  const pick = (project: GraphProject): void => {
    if (project.projectId !== null) onSelect(project.projectId)
  }

  return (
    <div className="card holy-graph">
      {active.length > 0 && (
        <div className="graph-summary">
          <span className="eyebrow">{t('graph.needsYou')}</span>
          <div className="filter-pills" role="group" aria-label={t('graph.needsYou')}>
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
        </div>
      )}

      {narrow ? (
        <ol className="graph-rows">
          {graph.circles.map(({ circle, projects }) => (
            <li key={circle}>
              <span className="graph-ring-name">{t('graph.circle', { n: circle })}</span>
              <div className="graph-row">
                {projects.map((project) => {
                  const signal = mainSignal(project.signals)

                  return (
                    <button
                      key={project.key}
                      type="button"
                      className={classes(project)}
                      disabled={project.projectId === null}
                      aria-pressed={project.projectId !== null && project.projectId === selected}
                      aria-label={describe(project, t)}
                      onClick={() => {
                        pick(project)
                      }}
                    >
                      {project.name}
                      {signal !== null && (
                        <span className={`graph-mark ${signal}`} aria-hidden="true">
                          {signal === 'unanswered'
                            ? project.signals.unanswered
                            : SIGNAL_GLYPH[signal]}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <svg
          className="graph-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="group"
          aria-label={t('graph.title')}
        >
          {graph.circles.slice(1).map(({ circle }) => {
            const label = onRing(circle, ringAngle(circle))

            return (
              <g key={circle} aria-hidden="true">
                <circle className="graph-ring" cx={CENTER} cy={CENTER} r={circle * RING_STEP} />
                <text className="graph-ring-number" x={label.x.toFixed(1)} y={label.y.toFixed(1)}>
                  {circle}
                </text>
              </g>
            )
          })}

          {graph.circles.flatMap(({ circle, projects }) =>
            projects.map((project, index) => {
              const { x, y } = position(circle, index, projects.length)
              const signal = mainSignal(project.signals)
              const enabled = project.projectId !== null
              const label = describe(project, t)

              return (
                <g
                  key={project.key}
                  className={classes(project)}
                  transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                  role="button"
                  tabIndex={enabled ? 0 : undefined}
                  aria-disabled={!enabled}
                  aria-pressed={enabled && project.projectId === selected}
                  aria-label={label}
                  onClick={() => {
                    pick(project)
                  }}
                  onKeyDown={(event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      pick(project)
                    }
                  }}
                >
                  <title>{label}</title>
                  <circle className="graph-disc" r={NODE_RADIUS} />
                  <text
                    className="graph-label"
                    // Los nombres largos se aprietan para no salirse del círculo.
                    {...(project.short.length > 8
                      ? { textLength: NODE_RADIUS * 2 - 6, lengthAdjust: 'spacingAndGlyphs' }
                      : {})}
                  >
                    {project.short}
                  </text>
                  {signal !== null && (
                    <g className={`graph-mark ${signal}`} transform={`translate(17 -17)`}>
                      <circle r="9" />
                      <text>
                        {signal === 'unanswered'
                          ? project.signals.unanswered
                          : SIGNAL_GLYPH[signal]}
                      </text>
                    </g>
                  )}
                </g>
              )
            }),
          )}
        </svg>
      )}

      <ul className="graph-legend">
        {(['finished', 'in_progress', 'todo'] as const).map((status) => (
          <li key={status}>
            <span className={`graph-swatch ${status}`} aria-hidden="true" />
            {t(`graph.status.${status}`)}
          </li>
        ))}
        {active.map((signal) => (
          <li key={signal}>
            <span className={`graph-mark ${signal}`} aria-hidden="true">
              {SIGNAL_GLYPH[signal]}
            </span>
            {t(`graph.signal.${signal}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
