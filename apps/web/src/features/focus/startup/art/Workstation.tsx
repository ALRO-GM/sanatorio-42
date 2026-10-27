import type { Axis } from '@sanatorio/startup'

import { AXIS_COLOR, GLOW, INK, METAL, WOOD } from './palette'

/**
 * Una mesa con su ordenador, de 34 de ancho con la base en `y`. El equipo crece
 * con `gear` (0 portátil viejo … 5 dos pantallas grandes) y en la pantalla corre
 * código del color del modelo.
 */
export function Workstation({
  x,
  y,
  gear,
  axis,
}: {
  x: number
  y: number
  gear: number
  axis: Axis | null
}) {
  const code = axis === null ? GLOW : AXIS_COLOR[axis]
  const big = gear >= 3
  const dual = gear >= 5
  const width = big ? 18 : 14

  const screen = (left: number) => (
    <g transform={`translate(${String(left)} 0)`}>
      <rect x="0" y={big ? -22 : -17} width={width} height={big ? 13 : 10} rx="1.5" fill={INK} />
      <g className="su-code" fill={code}>
        <rect x="2" y={big ? -19.5 : -14.5} width={width * 0.55} height="1.3" rx="0.6" />
        <rect x="4" y={big ? -16.5 : -12} width={width * 0.4} height="1.3" rx="0.6" />
        <rect
          x="2"
          y={big ? -13.5 : -9.5}
          width={width * 0.6}
          height="1.3"
          rx="0.6"
          opacity="0.7"
        />
      </g>
      <rect x={width / 2 - 1} y={big ? -9 : -7} width="2" height={big ? 3 : 1} fill={METAL} />
    </g>
  )

  return (
    <g className="su-station" transform={`translate(${String(x)} ${String(y)})`}>
      {/* La mesa */}
      <rect x="0" y="-6" width="34" height="3" rx="1" fill={WOOD} />
      <rect x="2" y="-3" width="2" height="9" fill={WOOD} opacity="0.75" />
      <rect x="30" y="-3" width="2" height="9" fill={WOOD} opacity="0.75" />
      {gear <= 1 ? (
        // Un portátil
        <g transform="translate(9 0)">
          <path d="M1 -6 L3 -16 L15 -16 L13 -6Z" fill={INK} />
          <rect x="4.2" y="-14.5" width="8" height="1.2" rx="0.5" fill={code} className="su-code" />
          <rect x="0" y="-6.5" width="16" height="1.4" rx="0.6" fill={METAL} />
        </g>
      ) : (
        <>
          {screen(dual ? 0 : 34 / 2 - width / 2)}
          {dual && screen(34 - width)}
          <rect x="9" y="-7.4" width="16" height="1.4" rx="0.6" fill={METAL} />
        </>
      )}
    </g>
  )
}
