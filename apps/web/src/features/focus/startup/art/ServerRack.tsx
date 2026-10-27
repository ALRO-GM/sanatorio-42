import { INK, METAL } from './palette'

/**
 * Un armario de servidores, de 16 de ancho con la base en `y`: una bandeja por
 * nivel (hasta seis), cada una con sus lucecitas parpadeando a destiempo.
 */
export function ServerRack({ x, y, level }: { x: number; y: number; level: number }) {
  const units = Math.max(1, Math.min(6, level))

  return (
    <g className="su-rack" transform={`translate(${String(x)} ${String(y)})`}>
      <rect x="0" y={-6 - units * 6} width="16" height={units * 6 + 6} rx="1.5" fill={INK} />
      {Array.from({ length: units }, (_, index) => (
        <g key={index} transform={`translate(2 ${String(-4 - (index + 1) * 6)})`}>
          <rect width="12" height="4.5" rx="0.8" fill={METAL} opacity="0.35" />
          <circle
            className="su-led"
            cx="2.2"
            cy="2.25"
            r="0.9"
            fill="#4ef08a"
            style={{ animationDelay: `${String(index * 0.37)}s` }}
          />
          <circle
            className="su-led"
            cx="4.6"
            cy="2.25"
            r="0.9"
            fill="#ffd54a"
            style={{ animationDelay: `${String(index * 0.21 + 0.5)}s` }}
          />
        </g>
      ))}
    </g>
  )
}
