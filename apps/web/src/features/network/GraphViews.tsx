/**
 * Otras formas de ver una red, además del grafo de fuerzas (`ForceGraph`), según
 * cuánta gente se mira (pedido por Alberto, 2026-10-29; `docs/red-vistas.md`):
 *
 * - **Una persona**: su red en anillos, ella en el centro y las demás más cerca
 *   cuanto más fuerte es la unión. Se entiende sin explicación y cabe en el móvil.
 * - **Un grupo mediano** (hasta `MATRIX_MAX` personas): la matriz persona ×
 *   persona ordenada por grupo. Los grupos cerrados salen como bloques en la
 *   diagonal y la reciprocidad, como simetría. Sin maraña.
 * - **Mucha gente**: el grafo de siempre (las cuerdas entre grupos se probaron
 *   y se quitaron el 2026-10-30: no convencían).
 *
 * El grafo de siempre se ofrece en todos los casos. Las vistas usan los mismos
 * nodos, uniones y colores que el grafo; lo sirven igual la red de correcciones
 * y la de asientos (`undirected`).
 */

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import { distinctColor } from './colors'

type GraphView = 'graph' | 'ego' | 'matrix'

/** Hasta cuánta gente cabe la matriz: más, y cada casilla sería un punto. */
const MATRIX_MAX = 150
/** Cuántas personas salen en los anillos, de la unión más fuerte a la más débil. */
const EGO_MAX = 24

/** Las vistas que tienen sentido para lo que se mira, la de fábrica primero. */
export function viewsFor(people: number, selected: string | null): GraphView[] {
  if (selected !== null) return ['ego', 'graph']

  return people <= MATRIX_MAX ? ['graph', 'matrix'] : ['graph']
}

/** La fuerza de una unión: correcciones en los dos sentidos, o la cercanía. */
const weightOf = (link: NetworkLink): number => link.forth + link.back

type GraphViewsProps = {
  nodes: readonly NetworkNode[]
  links: readonly NetworkLink[]
  selected: string | null
  onSelect: (login: string | null) => void
  colorOf: (node: NetworkNode) => string
  /** Sin dirección (asientos): la unión es la misma vista desde los dos lados. */
  undirected?: boolean
  /** Lo que se cuenta de una unión vista desde `from` (la ficha al pasar). */
  describe: (link: NetworkLink, from: string) => string
  /** El grafo de fuerzas de siempre. */
  graph: ReactNode
}

/**
 * El selector de vista y la vista elegida. Al elegir a alguien se pasa a su red
 * en anillos; al soltarlo, a la de fábrica para lo que se ve.
 */
export function GraphViews(props: GraphViewsProps) {
  const { t } = useI18n()
  const { nodes, selected } = props
  const options = viewsFor(nodes.length, selected)
  const [picked, setPicked] = useState<GraphView | null>(null)

  // Al cambiar de persona (o soltarla), la vista de fábrica para lo nuevo.
  useEffect(() => {
    setPicked(null)
  }, [selected])

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
      {view === 'ego' && selected !== null && <EgoRings {...props} center={selected} />}
      {view === 'matrix' && <Matrix {...props} />}
    </>
  )
}

/** Una persona y sus uniones en anillos: la más fuerte, en el de dentro. */
function EgoRings({
  nodes,
  links,
  center,
  onSelect,
  colorOf,
  undirected = false,
  describe,
}: GraphViewsProps & { center: string }) {
  const { t } = useI18n()
  const byLogin = useMemo(() => new Map(nodes.map((node) => [node.login, node])), [nodes])
  const mine = useMemo(
    () =>
      links
        .filter((link) => link.source === center || link.target === center)
        .sort((a, b) => weightOf(b) - weightOf(a))
        .slice(0, EGO_MAX),
    [links, center],
  )
  const me = byLogin.get(center)

  if (me === undefined || mine.length === 0) {
    return <p className="estado">{t('net.view.egoEmpty')}</p>
  }

  const size = 640
  const mid = size / 2
  const strongest = Math.max(1, ...mine.map(weightOf))
  // Tres anillos: el tercio más fuerte dentro.
  const ringOf = (index: number): number => Math.min(2, Math.floor((index * 3) / mine.length))
  const radii = [110, 190, 270]
  const perRing = [0, 1, 2].map((ring) => mine.filter((_, index) => ringOf(index) === ring).length)
  const placed = mine.map((link, index) => {
    const ring = ringOf(index)
    const before = mine.slice(0, index).filter((_, other) => ringOf(other) === ring).length
    // Cada anillo empieza girado para que los nombres no se alineen.
    const angle = ((before + 0.5) / (perRing[ring] ?? 1)) * 2 * Math.PI + ring * 0.4 - Math.PI / 2
    const radius = radii[ring] ?? 270
    const login = link.source === center ? link.target : link.source

    return {
      link,
      login,
      node: byLogin.get(login),
      x: mid + radius * Math.cos(angle),
      y: mid + radius * Math.sin(angle),
    }
  })

  return (
    <figure className="net-view net-ego">
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={t('net.view.egoLabel', { login: center, n: mine.length })}
      >
        {radii.map((radius) => (
          <circle key={radius} cx={mid} cy={mid} r={radius} className="net-ego-ring" />
        ))}
        {placed.map(({ link, login, x, y }) => {
          // Con dirección: continua si es mutua, a trazos si va en un solo sentido.
          const mutual = undirected || (link.forth > 0 && link.back > 0)

          return (
            <line
              key={`l-${login}`}
              x1={mid}
              y1={mid}
              x2={x}
              y2={y}
              className="net-ego-link"
              strokeWidth={1 + 5 * (weightOf(link) / strongest)}
              strokeDasharray={mutual ? undefined : '6 5'}
            />
          )
        })}
        {placed.map(({ link, login, node, x, y }) => {
          // Más grande cuanto más fuerte es la unión, en relación a la más fuerte.
          const radius = 12 + 10 * (weightOf(link) / strongest)

          return (
            <g
              key={login}
              className="net-ego-person"
              onClick={() => {
                onSelect(login)
              }}
            >
              <title>{`${login}: ${describe(link, center)}`}</title>
              <Face
                id={`ego-${login}`}
                x={x}
                y={y}
                r={radius}
                image={node?.image ?? null}
                ring={node === undefined ? 'var(--text-4)' : colorOf(node)}
                initial={login}
              />
              <text x={x} y={y + radius + 14} textAnchor="middle">
                {login}
              </text>
            </g>
          )
        })}
        <Face
          id="ego-center"
          x={mid}
          y={mid}
          r={30}
          image={me.image}
          ring="var(--accent)"
          initial={center}
        />
        <text x={mid} y={mid + 48} textAnchor="middle" className="net-ego-name">
          {center}
        </text>
      </svg>
      <figcaption className="hint">
        {undirected ? t('net.view.egoHintSeats') : t('net.view.egoHint')}
      </figcaption>
    </figure>
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

/** Una cara en el dibujo: la foto recortada en círculo (o la inicial) con un aro del color de su grupo. */
function Face({
  id,
  x,
  y,
  r,
  image,
  ring,
  initial,
}: {
  id: string
  x: number
  y: number
  r: number
  image: string | null
  ring: string
  initial: string
}) {
  return (
    <>
      <clipPath id={id}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} className="net-face-bg" />
      {image === null ? (
        <text x={x} y={y + r * 0.35} textAnchor="middle" className="net-face-initial" fontSize={r}>
          {initial.charAt(0).toUpperCase()}
        </text>
      ) : (
        <image
          href={image}
          x={x - r}
          y={y - r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      <circle cx={x} cy={y} r={r} className="net-face-ring" stroke={ring} />
    </>
  )
}
