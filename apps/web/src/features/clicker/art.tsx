import type { ReactNode } from 'react'

import { BUILDINGS } from './data'

/**
 * Los dibujos de Code Clicker. Todos salen del mismo molde para que el juego
 * tenga una sola mano: una ficha redondeada con un degradado del color de lo
 * que representa, un brillo arriba, una sombra abajo y el símbolo en trazo
 * blanco de grosor fijo, sobre una rejilla de 24 × 24.
 *
 * Son vectoriales y están hechos aquí: no hay ninguna imagen de fuera.
 */

const GLYPHS: Record<string, ReactNode> = {
  cursor: <path d="M7 3l11 8.5-5 .9 3 6.1-2.4 1.1-3-6.1L7 17z" />,
  pisciner: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M8.6 7.2h6.8M5 20.5c0-4.2 3.2-6.3 7-6.3s7 2.1 7 6.3" />
    </>
  ),
  cluster: (
    <path d="M3 4.5h7.5v6H3zM13.5 4.5H21v6h-7.5zM6.7 10.5v2.3M17.3 10.5v2.3M4.5 12.8H9M15 12.8h4.5M8 16h8v4.5H8zM10.5 18.2h3" />
  ),
  overflow: (
    <path d="M4 20.5h16M6 16.5h12M8 12.5h8M13.5 3.5c3.2 0 5.4 1.8 6.5 4.6M17.2 5.8L9.5 9.5" />
  ),
  pipeline: (
    <>
      <path d="M2.5 7.5h5l2.3 4h4.4l2.3-4h5M3 16.5h18" />
      <circle cx="6" cy="16.5" r="1.7" />
      <circle cx="12" cy="16.5" r="1.7" />
      <circle cx="18" cy="16.5" r="1.7" />
    </>
  ),
  repo: (
    <>
      <circle cx="6.5" cy="5" r="2.3" />
      <circle cx="6.5" cy="19" r="2.3" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M6.5 7.3v9.4M17.5 11.3c0 4.2-5.5 3-11 5.4" />
    </>
  ),
  temple: <path d="M3 9l9-6 9 6zM5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 20.5h18" />,
  regex: (
    <>
      <path d="M5 4v16M5 4h3M5 20h3M19 4v16M19 4h-3M19 20h-3M12 7.5v6M9.4 9l5.2 3M14.6 9l-5.2 3" />
      <circle cx="12" cy="17" r="0.9" />
    </>
  ),
  docker: (
    <path d="M2.5 13h19c0 4.2-3 7.5-8 7.5H9.5c-3.4 0-5.8-2.4-7-7.5zM6 10h3v3H6zM10 10h3v3h-3zM14 10h3v3h-3zM10 6h3v3h-3z" />
  ),
  compiler: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v3.4M12 17.8v3.4M2.8 12h3.4M17.8 12h3.4M5.5 5.5l2.4 2.4M16.1 16.1l2.4 2.4M5.5 18.5l2.4-2.4M16.1 7.9l2.4-2.4" />
    </>
  ),
  portal: (
    <>
      <ellipse cx="12" cy="12" rx="6.5" ry="9" />
      <ellipse cx="12" cy="12" rx="3" ry="5.2" />
      <path d="M1.8 12h3M19.2 12h3" />
    </>
  ),
  rebase: <path d="M4.2 12a7.8 7.8 0 1 0 2.4-5.6M4 3.8v4.4h4.4M12 7.8V12l3 2" />,
  quantum: (
    <>
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  neural: (
    <>
      <path d="M5 6l7 6-7 6M19 6l-7 6 7 6M5 6h14M5 18h14" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
    </>
  ),
  fuzzer: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1" />
      <circle cx="15.5" cy="8.5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="8.5" cy="15.5" r="1" />
      <circle cx="15.5" cy="15.5" r="1" />
    </>
  ),
  recursion: (
    <path d="M3.5 3.5h17v17h-17zM7.5 7.5h9v9h-9zM10.5 10.5h3v3h-3zM3.5 3.5l4 4M20.5 20.5l-4-4" />
  ),
  terminal: <path d="M3 5h18v14H3zM7 10l3 2-3 2M12.5 14.5h4.5" />,
  forks: (
    <>
      <path d="M12 21v-7M12 14c0-4-6-3-6-7.5M12 14c0-4 6-3 6-7.5M12 14V5.5" />
      <circle cx="6" cy="4.7" r="1.8" />
      <circle cx="12" cy="3.7" r="1.8" />
      <circle cx="18" cy="4.7" r="1.8" />
    </>
  ),
  hive: (
    <path d="M12 2.8l4 2.3v4.6l-4 2.3-4-2.3V5.1zM7 12.2l4 2.3v4.6l-4 2.3-4-2.3v-4.6zM17 12.2l4 2.3v4.6l-4 2.3-4-2.3v-4.6z" />
  ),
  you: (
    <>
      <circle cx="8.5" cy="8" r="3.2" />
      <circle cx="15.5" cy="8" r="3.2" />
      <path d="M2.5 20.5c0-4 2.8-6.2 6-6.2M21.5 20.5c0-4-2.8-6.2-6-6.2M8.5 14.3c2.3.9 4.7.9 7 0" />
    </>
  ),
  mouse: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="5.5" />
      <path d="M12 3v6.5M6.5 9.5h11" />
    </>
  ),
  duck: (
    <>
      <path d="M7.5 9.2a4.2 4.2 0 1 1 7.3 2.8c3.2.3 6 2 6 5.2 0 2.2-2.2 3.3-6 3.3H9.3c-4 0-6.3-1.9-6.3-4.6 0-1.6 1.5-2.6 3.2-2.3M7.5 9.2H4.2l2.1 2.2" />
      <circle cx="11.6" cy="8.2" r="0.8" />
    </>
  ),
  research: (
    <path d="M9 3h6M10 3v6.2l-5.2 8.6c-.7 1.3.3 3.2 2 3.2h10.4c1.7 0 2.7-1.9 2-3.2L14 9.2V3M8 15h8" />
  ),
  golden: (
    <>
      <circle cx="6.5" cy="5" r="2.3" />
      <circle cx="6.5" cy="19" r="2.3" />
      <circle cx="17.5" cy="19" r="2.3" />
      <path d="M6.5 7.3v9.4M17.5 16.7V11c0-3-2-4-5-4h-2M13 4.5L10.4 7 13 9.5" />
    </>
  ),
  bug: (
    <path d="M8 8.5a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0zM4 10l4 1M4 16.5l4-1M20 10l-4 1M20 16.5l-4-1M9 3.5l1.6 2.2M15 3.5l-1.6 2.2M12 9v10" />
  ),
  trophy: (
    <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1.4 4.6 3.4 5M17 6h3c0 3-1.4 4.6-3.4 5M12 14v4M8 20.5h8" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
}

/** Color de cada símbolo: los edificios recorren el arco del turquesa al rojo. */
const HUES: Record<string, number> = {
  ...Object.fromEntries(BUILDINGS.map(({ id }, index) => [id, (176 + index * 17) % 360])),
  mouse: 200,
  duck: 46,
  research: 284,
  golden: 44,
  bug: 0,
  trophy: 40,
  plus: 176,
  eye: 350,
  project: 176,
}

/** El marco de cada escalón de mejora, del más corriente al más raro. */
const FRAMES = [
  '#c9d3cf',
  '#7fd6a8',
  '#5ec2e6',
  '#8f8cf2',
  '#c77df0',
  '#f07db4',
  '#f29a5e',
  '#f2cf5e',
  '#ffffff',
  '#ff5f5f',
  '#111111',
]

type TileProps = {
  icon: string
  size?: number
  /** Escalón de la mejora: pinta un marco de su color. Sin él no hay marco. */
  tier?: number
  /** Apagado: aún no se tiene o no se ha visto. */
  dim?: boolean
  /** Texto dentro de la ficha en vez del símbolo (el `42` de los proyectos). */
  label?: string
}

/** Una ficha del juego: el dibujo de un edificio, una mejora o un logro. */
export function Tile({ icon, size = 44, tier, dim = false, label }: TileProps) {
  const hue = HUES[icon] ?? 176
  const id = `cc-${icon}-${tier ?? 'x'}`
  const gold = icon === 'golden' || icon === 'trophy' || icon === 'duck'

  return (
    <svg
      className={`cc-tile ${dim ? 'dim' : ''}`}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} ${gold ? 90 : 68}% ${gold ? 62 : 54}%)`} />
          <stop
            offset="1"
            stopColor={`hsl(${(hue + 28) % 360} ${gold ? 85 : 62}% ${gold ? 42 : 30}%)`}
          />
        </linearGradient>
      </defs>
      <rect x="3" y="4.5" width="42" height="42" rx="11" fill="rgba(0,0,0,0.35)" />
      <rect x="3" y="2" width="42" height="42" rx="11" fill={`url(#${id})`} />
      <path
        d="M14 2h20a11 11 0 0 1 11 11v3C36 9 12 9 3 16v-3A11 11 0 0 1 14 2z"
        fill="rgba(255,255,255,0.2)"
      />
      {tier !== undefined && (
        <rect
          x="4.2"
          y="3.2"
          width="39.6"
          height="39.6"
          rx="9.8"
          fill="none"
          stroke={FRAMES[tier % FRAMES.length]}
          strokeWidth="2.4"
        />
      )}
      {label === undefined ? (
        <g
          transform="translate(11 10) scale(1.08)"
          fill="none"
          stroke="#fff"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {GLYPHS[icon] ?? GLYPHS.terminal}
        </g>
      ) : (
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
          fontWeight="800"
          fontSize="17"
          fill="#fff"
        >
          {label}
        </text>
      )}
    </svg>
  )
}

/**
 * La tecla grande que se pulsa. Tiene tres capas (la base, el cuerpo y la
 * cara) para que al pulsarla la cara baje sobre el cuerpo, como una tecla de
 * verdad. `stage` es la fase de la singularidad: la va tiñendo de rojo.
 */
export function BigKey({ stage }: { stage: number }) {
  const hue = [176, 28, 350, 350][stage] ?? 176

  return (
    <svg className="cc-key-art" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cc-key-face" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 78% 60%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 24) % 360} 72% 38%)`} />
        </linearGradient>
        <linearGradient id="cc-key-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 60% 30%)`} />
          <stop offset="1" stopColor={`hsl(${hue} 60% 16%)`} />
        </linearGradient>
        <radialGradient id="cc-key-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor={`hsl(${hue} 90% 60% / 0.55)`} />
          <stop offset="1" stopColor={`hsl(${hue} 90% 60% / 0)`} />
        </radialGradient>
      </defs>
      <circle cx="110" cy="112" r="108" fill="url(#cc-key-glow)" />
      <rect x="22" y="40" width="176" height="164" rx="34" fill="rgba(0,0,0,0.45)" />
      <rect x="22" y="30" width="176" height="164" rx="34" fill="url(#cc-key-body)" />
      <g className="cc-key-face">
        <rect x="34" y="22" width="152" height="140" rx="28" fill="url(#cc-key-face)" />
        <path
          d="M62 22h96a28 28 0 0 1 28 28v10c-36-22-116-22-152 0V50a28 28 0 0 1 28-28z"
          fill="rgba(255,255,255,0.22)"
        />
        <g fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
          {stage < 3 ? (
            <path d="M92 58c-12 0-16 6-16 15v8c0 7-4 11-12 11 8 0 12 4 12 11v8c0 9 4 15 16 15M128 58c12 0 16 6 16 15v8c0 7 4 11 12 11-8 0-12 4-12 11v8c0 9-4 15-16 15" />
          ) : (
            // El pacto: la tecla ya no enseña llaves. Te mira.
            <>
              <path d="M56 92s20-34 54-34 54 34 54 34-20 34-54 34-54-34-54-34z" />
              <circle cx="110" cy="92" r="13" fill="#fff" />
            </>
          )}
        </g>
      </g>
    </svg>
  )
}
