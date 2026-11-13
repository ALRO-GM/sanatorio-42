import type { ReactNode } from 'react'

import type { Network, Node, NodeKind } from '@sanatorio/netsim'

import type { Frame, Leg } from './frames'
import { wireKey } from './frames'

/**
 * El esquema de una red, dibujado: cada nodo es una ficha con su nombre y sus
 * direcciones, los cables van de ficha a ficha y el paquete se mueve por
 * encima. Se pinta a tamaño fijo (un píxel por unidad) para que la letra no
 * baje nunca de 12 px: si no cabe, su caja se desplaza de lado, no la página.
 * Los colores salen de las variables del tema (`styles/netcourse.css`).
 */

const COL = 220
const CARD = 172
const SWITCH = 104
const HEAD = 26
const LINE = 15
const FOOT = 7
const GAP = 46
/** Dónde empiezan los valores de una interfaz de router, tras su nombre. */
const INDENT = 50

type Tone = 'name' | 'locked' | 'field'
type Row = { label?: string; text: string; tone: Tone }

/** El texto de un valor en el dibujo: lo que hay, o `?` si está por rellenar. */
function value(path: string, text: string, fields: ReadonlySet<string>): Row {
  return { text: text === '' ? '?' : text, tone: fields.has(path) ? 'field' : 'locked' }
}

/** Las líneas de la ficha de un nodo: cada interfaz con su IP y su máscara, y la puerta de una máquina. */
function rowsOf(node: Node, fields: ReadonlySet<string>): Row[] {
  const rows = node.ifaces.flatMap((iface): Row[] => {
    const at = `${node.id}.${iface.id}`
    const ip = value(`${at}.ip`, iface.ip, fields)

    return [
      node.kind === 'host' ? ip : { ...ip, label: iface.id },
      {
        ...value(`${at}.mask`, iface.mask, fields),
        ...(node.kind === 'host' ? {} : { label: '' }),
      },
    ]
  })
  const gateway = node.kind === 'host' ? node.routes[0] : undefined

  return gateway === undefined
    ? rows
    : [...rows, { ...value(`${node.id}.route0.via`, gateway.via, fields), label: 'gw' }]
}

type Box = { node: Node; rows: Row[]; x: number; y: number; w: number; h: number }

function boxes(
  network: Network,
  fields: ReadonlySet<string>,
): { all: Box[]; w: number; h: number } {
  const sized = network.nodes.map((node) => {
    const rows = rowsOf(node, fields)

    return { node, rows, h: node.kind === 'switch' ? HEAD + 4 : HEAD + rows.length * LINE + FOOT }
  })
  const row = Math.max(...sized.map((each) => each.h)) + GAP
  const all = sized.map((each) => ({
    ...each,
    w: each.node.kind === 'switch' ? SWITCH : CARD,
    x: each.node.x * COL + COL / 2,
    y: each.node.y * row + row / 2,
  }))

  return {
    all,
    w: (Math.max(...network.nodes.map((node) => node.x)) + 1) * COL,
    h: (Math.max(...network.nodes.map((node) => node.y)) + 1) * row,
  }
}

/** Por dónde sale de una ficha el cable que va hacia otra (el borde, en la recta entre sus centros). */
function edge(from: Box, to: Box): { x: number; y: number; dx: number; dy: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const reach = Math.min(
    dx === 0 ? Infinity : from.w / 2 / Math.abs(dx),
    dy === 0 ? Infinity : from.h / 2 / Math.abs(dy),
  )

  return { x: from.x + dx * reach, y: from.y + dy * reach, dx, dy }
}

/** El dibujo de cada tipo de nodo, en una casilla de 16 × 16 (solo trazos, como los iconos de la web). */
const GLYPH: Record<NodeKind, ReactNode> = {
  host: <path d="M2 3h12v8H2zM6 14h4M8 11v3" />,
  switch: <path d="M1 5h14v6H1zM4 8h3M9 8h3M4 2v3M12 11v3" />,
  router: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v8M4 8h8M6.5 5.5L8 4l1.5 1.5M6.5 10.5L8 12l1.5-1.5" />
    </>
  ),
  internet: <path d="M4.5 13a3.5 3.5 0 0 1-.4-7A4.5 4.5 0 0 1 12.6 7a3 3 0 0 1-.6 6z" />,
}

export type Playback = {
  /** El fotograma en el que va el paquete. */
  frame: Frame
  /** Los cables ya recorridos, con el viaje en el que se recorrieron por última vez. */
  trail: ReadonlyMap<string, Leg>
  /** El nodo donde ha muerto, si ha muerto ya. */
  dead: string | null
}

export function Diagram({
  network,
  fields,
  label,
  play,
}: {
  network: Network
  /** Los valores que se rellenan (se pintan resaltados). */
  fields: ReadonlySet<string>
  /** Cómo se llama el dibujo para quien no lo ve. */
  label: string
  play: Playback | null
}) {
  const { all, w, h } = boxes(network, fields)
  const byId = new Map(all.map((box) => [box.node.id, box]))
  const end = (text: string) => {
    const [id = '', iface] = text.split('.')

    return { box: byId.get(id), iface }
  }
  const packet = play === null ? undefined : byId.get(play.frame.at)

  return (
    <div className="net-diagram">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        {network.links.map(([a, b]) => {
          const from = end(a)
          const to = end(b)

          if (from.box === undefined || to.box === undefined) return null

          const leg = play?.trail.get(wireKey(from.box.node.id, to.box.node.id))

          return (
            <g key={`${a}-${b}`} className={`net-wire ${leg ?? ''}`}>
              <line x1={from.box.x} y1={from.box.y} x2={to.box.x} y2={to.box.y} />
              {[
                [from, to],
                [to, from],
              ].map(([near, far]) => {
                // Solo los routers dicen qué interfaz es cada cable; una máquina solo tiene una.
                if (near?.box === undefined || far?.box === undefined) return null
                if (near.box.node.kind === 'host' || near.box.node.kind === 'switch') return null

                const out = edge(near.box, far.box)
                const flat = Math.abs(out.dx) >= Math.abs(out.dy)

                return (
                  <text
                    key={near.box.node.id}
                    className="net-tag"
                    x={out.x + (flat ? Math.sign(out.dx) * 4 : 5)}
                    y={out.y + (flat ? (out.dx > 0 ? -5 : 14) : out.dy > 0 ? 13 : -5)}
                    textAnchor={flat && out.dx < 0 ? 'end' : 'start'}
                  >
                    {near.iface ?? near.box.node.ifaces[0]?.id}
                  </text>
                )
              })}
            </g>
          )
        })}
        {all.map((box) => (
          <g
            key={box.node.id}
            className={`net-node ${box.node.kind} ${play?.dead === box.node.id ? 'dead' : ''}`}
            transform={`translate(${box.x - box.w / 2} ${box.y - box.h / 2})`}
          >
            <rect width={box.w} height={box.h} rx="8" />
            <g className="net-glyph" transform="translate(8 5)">
              {GLYPH[box.node.kind]}
            </g>
            <text className="net-name" x="30" y="18">
              {box.node.id}
            </text>
            {box.rows.map((row, index) => (
              <text key={index} y={HEAD + 12 + index * LINE}>
                {row.label !== undefined && (
                  <tspan className="net-label" x="8">
                    {row.label}
                  </tspan>
                )}
                <tspan className={`net-value ${row.tone}`} x={row.label === undefined ? 8 : INDENT}>
                  {row.text}
                </tspan>
              </text>
            ))}
          </g>
        ))}
        {packet !== undefined && play !== null && (
          <g
            className={`net-packet ${play.frame.leg} ${play.dead === null ? '' : 'dead'}`}
            style={{ transform: `translate(${packet.x}px, ${packet.y - packet.h / 2}px)` }}
          >
            <circle r="8" />
            {play.dead !== null && <path d="M-3.5-3.5l7 7M3.5-3.5l-7 7" />}
          </g>
        )}
      </svg>
    </div>
  )
}
