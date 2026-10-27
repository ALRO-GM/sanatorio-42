import { GLOW, INK, METAL } from './palette'

/**
 * El sitio donde está la empresa, al fondo, según la etapa: el garaje (0-2),
 * un coworking (3), una oficina (4), un edificio (5), un rascacielos con la
 * bolsa subiendo (6) y la sede global (7). Ocupa `width` de ancho con la base en
 * `y`; las ventanas se encienden y apagan despacio.
 */
export function Building({ x, y, stage }: { x: number; y: number; stage: number }) {
  const floors = [2, 2, 2, 3, 4, 6, 8, 9][Math.min(7, Math.max(0, stage))] ?? 2
  const width = stage <= 2 ? 46 : stage <= 4 ? 52 : 40
  const height = floors * 11 + 8

  return (
    <g className="su-building" transform={`translate(${String(x)} ${String(y)})`}>
      {stage <= 2 ? (
        // El garaje: tejado a dos aguas y la persiana medio subida.
        <>
          <path d={`M-2 -26 L${String(width / 2)} -40 L${String(width + 2)} -26Z`} fill="#c45b4a" />
          <rect x="0" y="-26" width={width} height="26" fill="#e8d9c4" />
          <rect x="8" y="-20" width={width - 16} height="20" fill={METAL} />
          <g fill={INK} opacity="0.25">
            <rect x="8" y="-16" width={width - 16} height="1" />
            <rect x="8" y="-12" width={width - 16} height="1" />
          </g>
          <rect
            x="8"
            y="-6"
            width={width - 16}
            height="6"
            fill={GLOW}
            opacity={stage === 0 ? 0.15 : 0.5}
          />
        </>
      ) : (
        <>
          <rect x="0" y={-height} width={width} height={height} rx="2" fill="#5c6f86" />
          {Array.from({ length: floors }, (_, floor) =>
            Array.from({ length: stage <= 4 ? 4 : 3 }, (__, column) => (
              <rect
                key={`${String(floor)}-${String(column)}`}
                className="su-window"
                x={5 + column * (stage <= 4 ? 11.5 : 11)}
                y={-height + 5 + floor * 11}
                width="7"
                height="6"
                rx="1"
                fill={GLOW}
                style={{ animationDelay: `${String((floor * 3 + column * 5) % 11)}s` }}
              />
            )),
          )}
          {stage >= 6 && (
            // La bolsa: una flecha que sube por la fachada.
            <path
              className="su-stock"
              d={`M${String(width + 4)} -10 l8 -10 l6 5 l10 -16`}
              fill="none"
              stroke="#4ef08a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </>
      )}
    </g>
  )
}
