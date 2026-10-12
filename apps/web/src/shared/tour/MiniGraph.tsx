/** Los círculos del grafo de mentira, de fuera adentro: los tonos del de verdad. */
const PLATES = [172, 208, 244, 280]
/** Dónde va cada proyecto dentro de su círculo, en radianes. */
const ANGLES = [0.4, 2.1, 3.6, 5.2]

type MiniGraphProps = {
  /** Cuánto se ha arrastrado: `0` es centrado. */
  pan?: 0 | 1 | 2
  /** Proyecto resaltado, como `círculo-posición`; el ratón lo busca por `data-tour="node"`. */
  picked?: boolean
}

/**
 * El grafo del tablón en miniatura, para las demostraciones: cuatro bandejas
 * en perspectiva con sus proyectos.
 */
export function MiniGraph({ pan = 0, picked = false }: MiniGraphProps) {
  return (
    <svg className={`tour-graph pan${pan}`} viewBox="0 0 400 250">
      {PLATES.map((hue, index) => {
        const rx = 170 - index * 38
        const cy = 150 - index * 16

        return (
          <g key={hue}>
            <ellipse cx="200" cy={cy + 12} rx={rx} ry={rx * 0.46} fill={`hsl(${hue} 45% 34%)`} />
            <ellipse cx="200" cy={cy} rx={rx} ry={rx * 0.46} fill={`hsl(${hue} 55% 52%)`} />
            {ANGLES.slice(0, 4 - index).map((angle, spot) => {
              // El proyecto que se elige en las demostraciones: el segundo del tercer círculo.
              const target = index === 2 && spot === 1

              return (
                <circle
                  key={angle}
                  data-tour={target ? 'node' : undefined}
                  cx={200 + Math.cos(angle + index) * (rx - 18)}
                  cy={cy + Math.sin(angle + index) * (rx - 18) * 0.46}
                  r={target && picked ? 10 : 7}
                  fill={target && picked ? '#ffd166' : '#fff'}
                  opacity="0.9"
                />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
