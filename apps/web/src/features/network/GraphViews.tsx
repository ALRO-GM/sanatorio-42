/**
 * Otras formas de ver una red, además del grafo de fuerzas (`ForceGraph`), según
 * cuánta gente se mira (pedido por Alberto, 2026-10-29; `docs/red-vistas.md`):
 *
 * - **Un grupo mediano** (hasta `MATRIX_MAX` personas): la matriz persona ×
 *   persona ordenada por grupo. Los grupos cerrados salen como bloques en la
 *   diagonal y la reciprocidad, como simetría. Sin maraña.
 * - **Mucha gente**: el grafo de siempre (las cuerdas entre grupos se probaron
 *   y se quitaron el 2026-10-30: no convencían). La red en anillos de una
 *   persona («Su red») también se quitó el 2026-10-30: con alguien elegido, el
 *   grafo ya la centra y agranda a quien más se une.
 *
 * El grafo de siempre se ofrece en todos los casos. Las vistas usan los mismos
 * nodos, uniones y colores que el grafo; lo sirven igual la red de correcciones
 * y la de asientos (`undirected`).
 */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import { distinctColor } from './colors'

type GraphView = 'graph' | 'matrix'

/** Hasta cuánta gente cabe la matriz: más, y cada casilla sería un punto. */
const MATRIX_MAX = 150

/** Las vistas que tienen sentido para lo que se mira, la de fábrica primero. */
export function viewsFor(people: number): GraphView[] {
  return people <= MATRIX_MAX ? ['graph', 'matrix'] : ['graph']
}

/** La fuerza de una unión: correcciones en los dos sentidos, o la cercanía. */
const weightOf = (link: NetworkLink): number => link.forth + link.back

type GraphViewsProps = {
  nodes: readonly NetworkNode[]
  links: readonly NetworkLink[]
  onSelect: (login: string | null) => void
  colorOf: (node: NetworkNode) => string
  /** Sin dirección (asientos): la unión es la misma vista desde los dos lados. */
  undirected?: boolean
  /** Lo que se cuenta de una unión vista desde `from` (la ficha al pasar). */
  describe: (link: NetworkLink, from: string) => string
  /** El grafo de fuerzas de siempre. */
  graph: ReactNode
}

/** El selector de vista y la vista elegida. */
export function GraphViews(props: GraphViewsProps) {
  const { t } = useI18n()
  const options = viewsFor(props.nodes.length)
  const [picked, setPicked] = useState<GraphView | null>(null)

  const view = picked !== null && options.includes(picked) ? picked : (options[0] ?? 'graph')

  return (
    <>
      {options.length > 1 && (
        <PillGroup
          kind="tabs"
          className="net-views"
          options={options}
          value={view}
          onChange={setPicked}
          label={t('net.view.label')}
          text={(option) => t(`net.view.${option}`)}
        />
      )}
      {view === 'graph' && props.graph}
      {view === 'matrix' && <Matrix {...props} />}
    </>
  )
}

/** Persona × persona, ordenadas por grupo: los grupos cerrados son bloques. */
function Matrix({
  nodes,
  links,
  onSelect,
  colorOf,
  undirected = false,
  describe,
}: GraphViewsProps) {
  const { t } = useI18n()
  const order = useMemo(() => {
    const degree = new Map<string, number>()

    for (const link of links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + weightOf(link))
      degree.set(link.target, (degree.get(link.target) ?? 0) + weightOf(link))
    }

    return [...nodes]
      .sort(
        (a, b) =>
          a.community - b.community ||
          (degree.get(b.login) ?? 0) - (degree.get(a.login) ?? 0) ||
          a.login.localeCompare(b.login),
      )
      .slice(0, MATRIX_MAX)
  }, [nodes, links])
  const index = new Map(order.map((node, position) => [node.login, position]))
  const n = order.length
  const labels = n <= 60
  const pad = labels ? 90 : 8
  const cell = Math.max(3, Math.min(16, Math.floor(560 / Math.max(1, n))))
  const size = pad + n * cell + 8
  const strongest = links.reduce((most, link) => Math.max(most, link.forth, link.back), 1)
  const cells = links.flatMap((link) => {
    const row = index.get(link.source)
    const column = index.get(link.target)

    if (row === undefined || column === undefined) return []

    const both = [
      { row, column, value: undirected ? weightOf(link) : link.forth },
      { row: column, column: row, value: undirected ? weightOf(link) : link.back },
    ]

    return both.filter((entry) => entry.value > 0).map((entry) => ({ ...entry, link }))
  })
  // Los bloques de cada grupo en la diagonal.
  const blocks: { community: number; from: number; to: number }[] = []

  order.forEach((node, position) => {
    const last = blocks.at(-1)

    if (last?.community === node.community) last.to = position
    else blocks.push({ community: node.community, from: position, to: position })
  })

  return (
    <figure className="net-view net-matrix">
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={t('net.view.matrixLabel', { n })}
      >
        {blocks.map((block) => (
          <rect
            key={`b-${String(block.from)}`}
            x={pad + block.from * cell}
            y={pad + block.from * cell}
            width={(block.to - block.from + 1) * cell}
            height={(block.to - block.from + 1) * cell}
            className="net-matrix-block"
            stroke={distinctColor(block.community)}
          />
        ))}
        {cells.map(({ row, column, value, link }) => {
          const from = order[row]?.login ?? ''

          return (
            <rect
              key={`${String(row)}-${String(column)}`}
              x={pad + column * cell}
              y={pad + row * cell}
              width={cell}
              height={cell}
              className="net-matrix-cell"
              fillOpacity={0.2 + 0.8 * Math.sqrt(value / strongest)}
              onClick={() => {
                onSelect(from)
              }}
            >
              <title>{`${from} · ${order[column]?.login ?? ''}: ${describe(link, from)}`}</title>
            </rect>
          )
        })}
        {labels &&
          order.map((node, position) => (
            <g key={node.login} className="net-matrix-label">
              <text
                x={pad - 6}
                y={pad + position * cell + cell * 0.75}
                textAnchor="end"
                fill={colorOf(node)}
              >
                {node.login}
              </text>
              <text
                x={0}
                y={0}
                transform={`translate(${String(pad + position * cell + cell * 0.75)} ${String(pad - 6)}) rotate(-90)`}
                fill={colorOf(node)}
              >
                {node.login}
              </text>
            </g>
          ))}
      </svg>
      <figcaption className="hint">
        {undirected ? t('net.view.matrixHintSeats') : t('net.view.matrixHint')}
      </figcaption>
    </figure>
  )
}
