import type { Axis } from '@sanatorio/startup'

import { AXIS_COLOR, INK, LEAF, WOOD } from './palette'

/** Una planta en su maceta, de 10 de ancho con la base en `y`: el despacho se va llenando. */
export function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g className="su-plant" transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M2 -6 L8 -6 L7 0 L3 0Z" fill={WOOD} />
      <path d="M5 -6 Q1 -12 2 -16 Q6 -12 5 -6Z" fill={LEAF} />
      <path d="M5 -6 Q9 -13 8.5 -17 Q4 -12 5 -6Z" fill={LEAF} opacity="0.85" />
    </g>
  )
}

/** Una moneda que flota: cada ronda de inversión deja una sobre la empresa. */
export function Coin({ x, y, index }: { x: number; y: number; index: number }) {
  return (
    <g
      className="su-coin"
      transform={`translate(${String(x)} ${String(y)})`}
      style={{ animationDelay: `${String(index * 0.4)}s` }}
    >
      <circle r="4.5" fill="#f2c94c" />
      <circle r="3" fill="none" stroke="#c99a1e" strokeWidth="1" />
    </g>
  )
}

/** El planeta, girando: control global. */
export function Globe({ x, y, r = 12 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <circle r={r} fill="#3b8fe0" />
      <g className="su-globe">
        <path
          d={`M${String(-r * 0.6)} ${String(-r * 0.3)} q${String(r * 0.4)} ${String(-r * 0.5)} ${String(r * 0.8)} 0 q${String(-r * 0.1)} ${String(r * 0.5)} ${String(-r * 0.6)} ${String(r * 0.6)}z`}
          fill={LEAF}
        />
        <path
          d={`M${String(r * 0.2)} ${String(r * 0.2)} q${String(r * 0.5)} ${String(-r * 0.1)} ${String(r * 0.5)} ${String(r * 0.4)} q${String(-r * 0.3)} ${String(r * 0.3)} ${String(-r * 0.6)} 0z`}
          fill={LEAF}
        />
      </g>
      <circle r={r} fill="none" stroke={INK} strokeOpacity="0.2" />
    </g>
  )
}

/** Un libro con el color de la rama que se aprende. */
export function Book({ axis }: { axis: Axis }) {
  return (
    <g>
      <rect x="5" y="4" width="14" height="17" rx="1.5" fill={AXIS_COLOR[axis]} />
      <rect x="7" y="4" width="2" height="17" fill={INK} opacity="0.2" />
      <rect x="10.5" y="8" width="6" height="1.6" rx="0.8" fill="#fff" opacity="0.8" />
      <rect x="10.5" y="11" width="4.5" height="1.6" rx="0.8" fill="#fff" opacity="0.6" />
    </g>
  )
}
