import type { Axis } from '@sanatorio/startup'

import { Building } from './Building'
import { Coin, Globe, Book } from './Props'
import { Person } from './Person'
import { ServerRack } from './ServerRack'
import { Workstation } from './Workstation'
import { AXIS_COLOR, INK } from './palette'

/** De qué es el dibujo de una tarjeta. */
export type ArtOf =
  | { kind: 'learn'; axis: Axis }
  | { kind: 'computer'; level: number }
  | { kind: 'space'; level: number }
  | { kind: 'servers'; level: number }
  | { kind: 'side' | 'mvp' | 'founded' | 'global' }
  | { kind: 'round'; index: number }
  | { kind: 'hire'; axis: Axis; look: number }

/**
 * El dibujo de una tarjeta del juego, en un cuadrado de 48: lo que se compra,
 * el hito, la ronda o la persona candidata. Reúne las piezas de `art/`.
 */
export function ItemArt({ art, size = 48 }: { art: ArtOf; size?: number }) {
  return (
    <svg className="su-item-art" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {art.kind === 'learn' && (
        <g transform="translate(4 2) scale(1.75)">
          <Book axis={art.axis} />
        </g>
      )}
      {art.kind === 'computer' && (
        <g transform="translate(24 30) scale(1.3) translate(-17 0)">
          <Workstation x={0} y={0} gear={art.level} axis={null} />
        </g>
      )}
      {art.kind === 'space' && (
        <g transform="translate(24 46) scale(0.78) translate(-26 0)">
          <Building x={0} y={0} stage={[0, 3, 4, 5, 6, 7][art.level] ?? 3} />
        </g>
      )}
      {art.kind === 'servers' && (
        <g transform="translate(24 46) scale(1.15) translate(-8 0)">
          <ServerRack x={0} y={0} level={art.level} />
        </g>
      )}
      {art.kind === 'side' && (
        <g transform="translate(24 32) scale(1.3) translate(-17 0)">
          <Workstation x={0} y={0} gear={0} axis="front" />
        </g>
      )}
      {art.kind === 'mvp' && (
        // Un cohete: el producto mínimo despega.
        <g transform="translate(24 24) rotate(35)">
          <path
            d="M0 -16 Q7 -8 6 6 L-6 6 Q-7 -8 0 -16Z"
            fill="#e9eef3"
            stroke={INK}
            strokeWidth="1.2"
          />
          <circle cy="-4" r="3" fill="#3b8fe0" />
          <path d="M-6 2 L-11 10 L-5 7Z M6 2 L11 10 L5 7Z" fill="#ef7d3a" />
          <path className="su-flame" d="M-3 7 Q0 16 3 7Z" fill="#ffb02e" />
        </g>
      )}
      {art.kind === 'founded' && (
        // Una bandera: la empresa tiene nombre.
        <g>
          <rect x="14" y="8" width="2.5" height="34" rx="1" fill={INK} />
          <path className="su-flag" d="M16.5 9 L36 13 L16.5 22Z" fill="#ef7d3a" />
        </g>
      )}
      {art.kind === 'global' && <Globe x={24} y={24} r={17} />}
      {art.kind === 'round' && (
        <g>
          {Array.from({ length: Math.min(6, art.index + 1) }, (_, coin) => (
            <g
              key={coin}
              transform={`translate(${String(12 + (coin % 3) * 12)} ${String(34 - Math.floor(coin / 3) * 12)}) scale(1.4)`}
            >
              <Coin x={0} y={0} index={coin} />
            </g>
          ))}
        </g>
      )}
      {art.kind === 'hire' && (
        <g>
          <circle cx="24" cy="24" r="21" fill={AXIS_COLOR[art.axis]} opacity="0.15" />
          <g transform="translate(9 3) scale(1.5)">
            <Person x={0} y={30} axis={art.axis} look={art.look} working={false} />
          </g>
        </g>
      )}
    </svg>
  )
}
