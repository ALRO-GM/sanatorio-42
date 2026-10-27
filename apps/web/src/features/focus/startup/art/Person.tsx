import type { Axis } from '@sanatorio/startup'

import { AXIS_COLOR, HAIR, INK, SKIN, pick } from './palette'

/**
 * Una personita sentada, de 20 de ancho y 30 de alto con la base en `y`: la
 * piel, el pelo y el peinado salen de `look`, la camiseta del modelo en el que
 * es especialista. Con `working`, teclea (los brazos suben y bajan).
 */
export function Person({
  x,
  y,
  axis,
  look,
  working = true,
}: {
  x: number
  y: number
  axis: Axis | null
  look: number
  working?: boolean
}) {
  const skin = pick(SKIN, look)
  const hair = pick(HAIR, look, 5)
  const style = Math.floor(look / 30) % 3
  const shirt = axis === null ? '#7d8a99' : AXIS_COLOR[axis]
  // Que no tecleen todos a la vez.
  const delay = `${String((look % 7) * 0.13)}s`

  return (
    <g className="su-person" transform={`translate(${String(x)} ${String(y - 30)})`}>
      {/* Cuerpo y cabeza */}
      <path d="M3 30 Q3 17 10 17 Q17 17 17 30 Z" fill={shirt} />
      <circle cx="10" cy="10" r="6" fill={skin} />
      {style === 0 && <path d="M4 9 Q4 3 10 3 Q16 3 16 9 Q13 6 10 6.5 Q7 6 4 9Z" fill={hair} />}
      {style === 1 && (
        <path d="M4 10 Q3 2 10 2.5 Q17 2 16 10 L16 13 Q15 7 10 6 Q5 7 4 13Z" fill={hair} />
      )}
      {style === 2 && (
        <>
          <path d="M4.5 8 Q5 3 10 3 Q15 3 15.5 8Z" fill={hair} />
          <circle cx="10" cy="2.6" r="2.4" fill={hair} />
        </>
      )}
      <circle cx="8" cy="10.5" r="0.7" fill={INK} />
      <circle cx="12" cy="10.5" r="0.7" fill={INK} />
      {/* Brazos hacia el teclado */}
      <g className={working ? 'su-typing' : undefined} style={{ animationDelay: delay }}>
        <path d="M5 22 L1 26" stroke={skin} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M15 22 L19 26" stroke={skin} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  )
}
