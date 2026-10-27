import type { Axis } from '@sanatorio/startup'

import { AXIS_COLOR } from './palette'

/**
 * El dibujo de cada modelo de negocio, en un cuadrado de 24: una ventana (apps),
 * llaves (plataforma), barras (datos), una chispa con nodos (IA) y una nube
 * (infraestructura). Sin texto: el color y la forma lo dicen.
 */
export function AxisGlyph({ axis, size = 24 }: { axis: Axis; size?: number }) {
  const color = AXIS_COLOR[axis]

  return (
    <svg className="su-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={color} opacity="0.18" />
      {axis === 'front' && (
        <g fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round">
          <rect x="5" y="6" width="14" height="11" rx="2" />
          <path d="M5 9.5h14" />
          <circle cx="7.3" cy="7.8" r="0.4" />
        </g>
      )}
      {axis === 'back' && (
        <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6c-2 0-2 1.5-2 3s-1 3-2 3c1 0 2 1.5 2 3s0 3 2 3" />
          <path d="M15 6c2 0 2 1.5 2 3s1 3 2 3c-1 0-2 1.5-2 3s0 3-2 3" />
        </g>
      )}
      {axis === 'data' && (
        <g fill={color}>
          <rect x="6" y="12" width="3" height="6" rx="1" />
          <rect x="10.5" y="8" width="3" height="10" rx="1" />
          <rect x="15" y="5" width="3" height="13" rx="1" />
        </g>
      )}
      {axis === 'ai' && (
        <g fill={color} stroke={color} strokeWidth="1.5">
          <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" stroke="none" />
          <circle cx="6.5" cy="17.5" r="1.4" />
          <circle cx="17.5" cy="17.5" r="1.4" />
          <path d="M8 17.5h8" fill="none" />
        </g>
      )}
      {axis === 'infra' && (
        <path d="M7.5 17h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A4 4 0 0 0 7.5 17z" fill={color} />
      )}
    </svg>
  )
}
