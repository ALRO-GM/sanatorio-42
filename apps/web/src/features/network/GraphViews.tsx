/**
 * Otras formas de ver una red, además del grafo de fuerzas (`ForceGraph`), según
 * cuánta gente se mira (pedido por Alberto, 2026-10-29; `docs/red-vistas.md`):
 *
 * - **Una persona**: su red en anillos, ella en el centro y las demás más cerca
 *   cuanto más fuerte es la unión. Se entiende sin explicación y cabe en el móvil.
 * - **Un grupo mediano** (hasta `MATRIX_MAX` personas): la matriz persona ×
 *   persona ordenada por grupo. Los grupos cerrados salen como bloques en la
 *   diagonal y la reciprocidad, como simetría. Sin maraña.
 * - **Mucha gente**: las cuerdas entre grupos (comunidades): cuánto se unen unos
 *   con otros y cuánto dentro de sí mismos.
 *
 * El grafo de siempre se ofrece en los tres casos. Las vistas usan los mismos
 * nodos, uniones y colores que el grafo; lo sirven igual la red de correcciones
 * y la de asientos (`undirected`).
 */

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import { distinctColor } from './colors'

type GraphView = 'graph' | 'ego' | 'matrix' | 'chord'

/** Hasta cuánta gente cabe la matriz: más, y cada casilla sería un punto. */
const MATRIX_MAX = 150
/** Cuántas personas salen en los anillos, de la unión más fuerte a la más débil. */
const EGO_MAX = 24
/** Cuántos grupos tienen su propio arco en las cuerdas; el resto, juntos. */
const CHORD_GROUPS = 10

/** Las vistas que tienen sentido para lo que se mira, la de fábrica primero. */
export function viewsFor(people: number, selected: string | null): GraphView[] {
  if (selected !== null) return ['ego', 'graph']

  return people <= MATRIX_MAX ? ['graph', 'matrix'] : ['graph', 'chord']
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
      <PillGroup
        kind="tabs"
        className="net-views"
        options={options}
        value={view}
        onChange={setPicked}
        label={t('net.view.label')}
        text={(option) => t(`net.view.${option}`)}
      />
      {view === 'graph' && props.graph}
      {view === 'ego' && selected !== null && <EgoRings {...props} center={selected} />}
      {view === 'matrix' && <Matrix {...props} />}
      {view === 'chord' && <Chords {...props} />}
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
              strokeWidth={1 + 5 * Math.sqrt(weightOf(link) / strongest)}
              strokeDasharray={mutual ? undefined : '6 5'}
            />
          )
        })}
        {placed.map(({ link, login, node, x, y }) => (
          <g key={login} className="net-ego-person">
            <title>{`${login}: ${describe(link, center)}`}</title>
            <circle
              cx={x}
              cy={y}
              r={14}
              fill={node === undefined ? 'var(--text-4)' : colorOf(node)}
              onClick={() => {
                onSelect(login)
              }}
            />
            <text x={x} y={y + 30} textAnchor="middle">
              {login}
            </text>
          </g>
        ))}
        <circle cx={mid} cy={mid} r={26} fill={colorOf(me)} className="net-ego-center" />
        <text x={mid} y={mid + 46} textAnchor="middle" className="net-ego-name">
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

/** Un punto del círculo de las cuerdas. */
const at = (radius: number, angle: number, mid: number): [number, number] => [
  mid + radius * Math.cos(angle - Math.PI / 2),
  mid + radius * Math.sin(angle - Math.PI / 2),
]

/** Cuánto se unen los grupos entre sí (cuerdas) y dentro de sí (cuerda que vuelve). */
function Chords({ nodes, links }: GraphViewsProps) {
  const { t } = useI18n()
  const model = useMemo(() => {
    const groupOf = new Map(nodes.map((node) => [node.login, node.community]))
    const sizes = new Map<number, number>()

    for (const node of nodes) sizes.set(node.community, (sizes.get(node.community) ?? 0) + 1)

    // Los grupos más grandes con arco propio; el resto, juntos en «otros» (-1).
    const top = [...sizes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, CHORD_GROUPS)
      .map(([community]) => community)
    const keyOf = (community: number | undefined): number =>
      community !== undefined && top.includes(community) ? community : -1
    const groups = [...top, ...(sizes.size > top.length ? [-1] : [])]
    const flows = new Map<string, number>()

    for (const link of links) {
      const a = keyOf(groupOf.get(link.source))
      const b = keyOf(groupOf.get(link.target))
      const [low, high] = groups.indexOf(a) <= groups.indexOf(b) ? [a, b] : [b, a]
      const key = `${String(low)}:${String(high)}`

      flows.set(key, (flows.get(key) ?? 0) + weightOf(link))
    }

    const flowOf = (a: number, b: number): number =>
      flows.get(`${String(a)}:${String(b)}`) ?? flows.get(`${String(b)}:${String(a)}`) ?? 0
    // Lo de cada grupo: la cuerda que vuelve a sí mismo cuenta dos veces (sale y entra).
    const totals = groups.map((a) =>
      groups.reduce((sum, b) => sum + flowOf(a, b) * (a === b ? 2 : 1), 0),
    )
    const total = totals.reduce((sum, value) => sum + value, 0)

    return {
      groups,
      sizes,
      flowOf,
      totals,
      total,
      otherSize: nodes.length - top.reduce((s, c) => s + (sizes.get(c) ?? 0), 0),
    }
  }, [nodes, links])

  if (model.total === 0) return <p className="estado">{t('net.view.chordEmpty')}</p>

  const size = 640
  const mid = size / 2
  const outer = 270
  const inner = 252
  const gap = 0.02
  const usable = 2 * Math.PI - gap * model.groups.length
  // Dónde empieza cada grupo y, dentro, el trozo que lleva a cada otro.
  let cursor = 0
  const arcs = model.groups.map((group, position) => {
    const span = ((model.totals[position] ?? 0) / model.total) * usable
    const start = cursor

    cursor += span + gap

    return { group, start, end: start + span }
  })
  const slots = new Map<string, [number, number]>()

  arcs.forEach((arc, position) => {
    let inside = arc.start

    model.groups.forEach((other) => {
      const flow = model.flowOf(arc.group, other) * (other === arc.group ? 2 : 1)
      const span =
        ((model.totals[position] ?? 0) === 0 ? 0 : flow / (model.totals[position] ?? 1)) *
        (arc.end - arc.start)

      if (other === arc.group) {
        slots.set(`${String(arc.group)}>${String(other)}`, [inside, inside + span / 2])
        slots.set(`${String(arc.group)}<${String(other)}`, [inside + span / 2, inside + span])
      } else {
        slots.set(`${String(arc.group)}>${String(other)}`, [inside, inside + span])
      }
      inside += span
    })
  })

  const ribbon = (a: [number, number], b: [number, number]): string => {
    const [a0x, a0y] = at(inner, a[0], mid)
    const [a1x, a1y] = at(inner, a[1], mid)
    const [b0x, b0y] = at(inner, b[0], mid)
    const [b1x, b1y] = at(inner, b[1], mid)
    const r = String(inner)

    return `M${String(a0x)} ${String(a0y)}A${r} ${r} 0 0 1 ${String(a1x)} ${String(a1y)}Q${String(mid)} ${String(mid)} ${String(b0x)} ${String(b0y)}A${r} ${r} 0 0 1 ${String(b1x)} ${String(b1y)}Q${String(mid)} ${String(mid)} ${String(a0x)} ${String(a0y)}Z`
  }
  const nameOf = (group: number): string =>
    group === -1
      ? t('net.view.chordOthers', { size: model.otherSize })
      : t('net.legend.community', { n: group + 1, size: model.sizes.get(group) ?? 0 })
  const colorOfGroup = (group: number): string =>
    group === -1 ? 'var(--text-4)' : distinctColor(group)

  return (
    <figure className="net-view net-chord">
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={t('net.view.chordLabel', { n: model.groups.length })}
      >
        {model.groups.flatMap((a, i) =>
          model.groups.slice(i).map((b) => {
            const from =
              a === b
                ? slots.get(`${String(a)}>${String(b)}`)
                : slots.get(`${String(a)}>${String(b)}`)
            const to =
              a === b
                ? slots.get(`${String(a)}<${String(b)}`)
                : slots.get(`${String(b)}>${String(a)}`)
            const flow = model.flowOf(a, b)

            if (from === undefined || to === undefined || flow === 0) return null

            return (
              <path
                key={`${String(a)}-${String(b)}`}
                d={ribbon(from, to)}
                fill={colorOfGroup(
                  a === b ? a : (model.sizes.get(a) ?? 0) >= (model.sizes.get(b) ?? 0) ? a : b,
                )}
                className={`net-chord-ribbon ${a === b ? 'self' : ''}`}
              >
                <title>
                  {a === b
                    ? t('net.view.chordSelf', { group: nameOf(a), n: flow })
                    : t('net.view.chordFlow', { a: nameOf(a), b: nameOf(b), n: flow })}
                </title>
              </path>
            )
          }),
        )}
        {arcs.map((arc) => {
          const [x0, y0] = at(outer, arc.start, mid)
          const [x1, y1] = at(outer, arc.end, mid)
          const [i1x, i1y] = at(inner, arc.end, mid)
          const [i0x, i0y] = at(inner, arc.start, mid)
          const large = arc.end - arc.start > Math.PI ? 1 : 0
          const [lx, ly] = at(outer + 18, (arc.start + arc.end) / 2, mid)
          const middle = (arc.start + arc.end) / 2

          return (
            <g key={`arc-${String(arc.group)}`} className="net-chord-group">
              <title>{nameOf(arc.group)}</title>
              <path
                d={`M${String(x0)} ${String(y0)}A${String(outer)} ${String(outer)} 0 ${String(large)} 1 ${String(x1)} ${String(y1)}L${String(i1x)} ${String(i1y)}A${String(inner)} ${String(inner)} 0 ${String(large)} 0 ${String(i0x)} ${String(i0y)}Z`}
                fill={colorOfGroup(arc.group)}
              />
              {arc.end - arc.start > 0.15 && (
                <text x={lx} y={ly} textAnchor={middle > Math.PI ? 'end' : 'start'}>
                  {nameOf(arc.group)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="hint">{t('net.view.chordHint')}</figcaption>
    </figure>
  )
}
