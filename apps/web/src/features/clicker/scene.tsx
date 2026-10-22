import { BUILDINGS } from '@sanatorio/clicker'
import type { BuildingId } from '@sanatorio/clicker'

/**
 * El decorado de Code Clicker: lo que se mueve alrededor de la tecla y el fondo
 * de cada fila de edificios. Todo es vectorial y está dibujado aquí.
 *
 * Sigue al original en lo que hace que la pantalla parezca viva: los rayos que
 * giran detrás de la tecla, los cursores que la rodean y la pulsan por turnos,
 * el líquido que sube con los logros y una fila con su fondo por cada edificio.
 */

/** Cuántos cursores caben en cada anillo alrededor de la tecla. */
const RINGS = [22, 30] as const

/** Los cursores que rodean la tecla: giran despacio y la pulsan uno tras otro. */
export function CursorRing({ count }: { count: number }) {
  let left = Math.min(count, RINGS[0] + RINGS[1])

  return (
    <div className="cc-orbit" aria-hidden="true">
      {RINGS.map((size, ring) => {
        const shown = Math.min(left, size)

        left -= shown

        return Array.from({ length: shown }, (_, index) => (
          <i
            key={`${ring}-${index}`}
            className={`ring-${ring}`}
            style={{
              ['--a' as string]: `${(360 / size) * index + ring * 6}deg`,
              animationDelay: `${((index * 7) % size) * (2.6 / size) + ring * 0.4}s`,
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path
                d="M12 21l-5.5-9.5 3.6.6V3h3.8v9.1l3.6-.6z"
                fill="#fff"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </i>
        ))
      })}
    </div>
  )
}

/** Color del líquido según cuántos logros hay: cambia cada veinticinco. */
const DRINKS = [
  [24, 45, 22],
  [28, 48, 46],
  [38, 62, 38],
  [18, 40, 30],
  [82, 48, 36],
  [8, 62, 22],
  [146, 78, 46],
  [286, 84, 58],
] as const

/** Qué bebida toca con esos logros (para el color y para su nombre). */
export const drinkOf = (achievements: number): number =>
  Math.min(DRINKS.length - 1, Math.floor(achievements / 25))

/**
 * El líquido del fondo: sube con los logros y tiene oleaje. Es la "leche" del
 * original; aquí, lo que se bebe para aguantar despierto.
 */
export function Coffee({
  achievements,
  ducks,
  title,
}: {
  achievements: number
  /** Patitos de goma comprados: flota uno por cada uno, hasta `DUCKS_AFLOAT`. */
  ducks: number
  title: string
}) {
  const [hue, saturation, light] = DRINKS[drinkOf(achievements)] ?? DRINKS[0]
  // Un 4 % de cafeína por logro: la taza se llena del todo con unos ochenta.
  const height = Math.min(58, 6 + achievements * 0.65)
  // Olas altas y seguidas: tiene que verse que es líquido y no un suelo.
  const wave = 'M0 16 Q 25 -6 50 16 T 100 16 T 150 16 T 200 16 V 48 H 0 Z'
  const liquid = `hsl(${hue} ${saturation}% ${light}%`

  if (achievements === 0) return null

  return (
    <div className="cc-coffee" style={{ height: `${height}%` }} title={title}>
      {/* De vez en cuando cae un chorro, y donde cae salpica. */}
      <span className="cc-pour" style={{ background: `${liquid} / 0.85)` }} aria-hidden="true" />
      <span className="cc-splash" style={{ borderColor: `${liquid} / 0.9)` }} aria-hidden="true" />
      <svg
        className="cc-wave back"
        viewBox="0 0 200 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={wave} fill={`hsl(${hue} ${saturation}% ${light + 12}% / 0.45)`} />
      </svg>
      <svg
        className="cc-wave mid"
        viewBox="0 0 200 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={wave} fill={`hsl(${hue} ${saturation}% ${light + 5}% / 0.6)`} />
      </svg>
      {/* Los patitos flotan entre dos olas: la de delante les tapa la panza. */}
      {Array.from({ length: Math.min(DUCKS_AFLOAT, ducks) }, (_, index) => (
        <span
          key={index}
          className="cc-duck"
          style={{
            ['--from' as string]: `${8 + index * 19}%`,
            ['--to' as string]: `${46 + index * 9}%`,
            animationDuration: `${34 + index * 9}s, ${2.4 + index * 0.35}s`,
            animationDelay: `${-index * 7}s, ${-index * 0.6}s`,
          }}
          aria-hidden="true"
        >
          <Duck />
        </span>
      ))}
      <svg className="cc-wave" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
        <path d={wave} fill={`${liquid} / 0.85)`} />
      </svg>
      <div
        className="cc-coffee-body"
        style={{
          background: `linear-gradient(180deg, ${liquid} / 0.85), hsl(${hue} ${saturation}% ${Math.max(8, light - 14)}% / 0.94))`,
        }}
      >
        {/* Burbujas que suben: otra pista de que esto se bebe. */}
        {[12, 31, 54, 73, 88].map((left, index) => (
          <i
            key={left}
            className="cc-bubble"
            style={{ left: `${left}%`, animationDelay: `${-index * 1.7}s` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Patitos que caben flotando a la vez, por muchos que se hayan comprado. */
const DUCKS_AFLOAT = 4

/** Un patito de goma, de perfil. */
function Duck() {
  return (
    <svg viewBox="0 0 40 34" width="34" height="29">
      <path
        d="M4 21c0-6 5-9 11-8 1-6 5-10 11-10 6 0 10 4 10 9 0 3-1 5-3 7 2 2 3 4 3 6 0 5-6 8-15 8S4 29 4 21z"
        fill="#ffd23f"
        stroke="#c98a00"
        strokeWidth="1.5"
      />
      <path d="M34 11l5 1.5-5 2.5z" fill="#ff8a1f" stroke="#c35a00" strokeWidth="1" />
      <circle cx="27" cy="9.5" r="1.7" fill="#2a1a00" />
      <path
        d="M10 22c3 3 9 3 13 0"
        fill="none"
        stroke="#c98a00"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * La silueta del campus al fondo, con las ventanas encendidas. Con la
 * singularidad las luces se vuelven rojas y, al final, no queda ninguna
 * apagada: ya no duerme nadie.
 */
export function Skyline({ stage }: { stage: number }) {
  const towers = [
    [0, 62, 26],
    [24, 40, 30],
    [52, 70, 22],
    [72, 28, 34],
    [104, 56, 24],
    [126, 46, 28],
    [152, 74, 20],
    [170, 34, 32],
    [200, 60, 26],
    [224, 48, 30],
    [252, 68, 22],
    [272, 38, 28],
  ] as const
  const lit = [0.35, 0.55, 0.8, 1][stage] ?? 0.35

  return (
    <svg
      className="cc-skyline"
      viewBox="0 0 300 100"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {towers.map(([x, top, width], tower) => (
        <g key={x}>
          <rect x={x} y={top} width={width} height={100 - top} className="cc-tower" />
          {Array.from({ length: Math.floor((96 - top) / 9) }, (_, row) =>
            Array.from({ length: Math.floor((width - 4) / 7) }, (_, column) => {
              // Un reparto fijo, para que las luces no bailen al repintar.
              const seed = ((tower * 31 + row * 17 + column * 7) % 20) / 20

              return seed < lit ? (
                <rect
                  key={`${row}-${column}`}
                  x={x + 3 + column * 7}
                  y={top + 5 + row * 9}
                  width="4"
                  height="5"
                  className="cc-window"
                  style={{ animationDelay: `${seed * 9}s` }}
                />
              ) : null
            }),
          )}
        </g>
      ))}
    </svg>
  )
}

/** Qué clase de sitio es cada edificio: de eso sale el fondo de su fila. */
const PLACES: Record<BuildingId, 'desk' | 'cave' | 'factory' | 'net' | 'temple' | 'space'> = {
  cursor: 'desk',
  pisciner: 'desk',
  cluster: 'desk',
  overflow: 'cave',
  pipeline: 'factory',
  repo: 'net',
  temple: 'temple',
  regex: 'temple',
  docker: 'factory',
  compiler: 'factory',
  portal: 'space',
  rebase: 'space',
  quantum: 'space',
  neural: 'net',
  fuzzer: 'cave',
  recursion: 'space',
  terminal: 'desk',
  forks: 'net',
  hive: 'net',
  you: 'space',
}

/** El color de un edificio, el mismo arco que el de sus fichas. */
export const hueOf = (id: BuildingId): number =>
  (176 + BUILDINGS.findIndex((building) => building.id === id) * 17) % 360

/** El fondo de la fila de un edificio: su sitio, pintado con su color. */
export function Backdrop({ id }: { id: BuildingId }) {
  const hue = hueOf(id)
  const place = PLACES[id]
  const ink = `hsl(${hue} 55% 62% / 0.3)`
  const soft = `hsl(${hue} 55% 62% / 0.14)`
  const key = `cc-bd-${id}`

  return (
    <svg
      className="cc-backdrop"
      viewBox="0 0 400 64"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={key} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 50% 20%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 20) % 360} 55% 9%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="64" fill={`url(#${key})`} />
      {place === 'desk' && (
        <g stroke={ink} strokeWidth="1.2" fill="none">
          <path d="M0 50h400" />
          {Array.from({ length: 10 }, (_, index) => (
            <g key={index} transform={`translate(${12 + index * 40} 0)`}>
              <rect x="0" y="10" width="20" height="13" rx="1.5" fill={soft} />
              <path d="M10 23v4M5 27h10" />
            </g>
          ))}
        </g>
      )}
      {place === 'cave' && (
        <g fill={soft} stroke={ink} strokeWidth="1">
          <path d="M0 0h400v6l-22 14-18-12-30 20-26-18-34 12-28-16-36 22-30-20-38 14-32-18-28 16-30-12-24 10L0 12z" />
          <path d="M0 64v-8l40-10 46 8 52-12 60 10 48-8 58 12 50-10 46 6v12z" />
        </g>
      )}
      {place === 'factory' && (
        <g stroke={ink} strokeWidth="1.2" fill="none">
          <path d="M0 14h400M0 20h400" />
          {Array.from({ length: 9 }, (_, index) => (
            <g key={index}>
              <path d={`M${20 + index * 46} 14v-14`} />
              <circle cx={10 + index * 46} cy="54" r="5" fill={soft} />
              <path d={`M${10 + index * 46} 49v10M${5 + index * 46} 54h10`} />
            </g>
          ))}
          <path d="M0 48h400M0 60h400" />
        </g>
      )}
      {place === 'net' && (
        <g stroke={ink} strokeWidth="1" fill={soft}>
          <path d="M10 14l50 26 44-30 52 34 40-28 56 22 46-26 50 30 42-18" fill="none" />
          <path d="M10 44l50-4 44 14 52-10 40 6 56-22 46 24 50-10 42 6" fill="none" />
          {[10, 60, 104, 156, 196, 252, 298, 348, 390].map((x, index) => (
            <g key={x}>
              <circle cx={x} cy={[14, 40, 10, 44, 16, 38, 12, 42, 24][index]} r="3" />
              <circle cx={x} cy={[44, 40, 54, 44, 50, 28, 52, 42, 48][index]} r="2.2" />
            </g>
          ))}
        </g>
      )}
      {place === 'temple' && (
        <g stroke={ink} strokeWidth="1.2" fill={soft}>
          <path d="M0 8h400M0 56h400" fill="none" />
          {Array.from({ length: 11 }, (_, index) => (
            <g key={index} transform={`translate(${8 + index * 38} 0)`}>
              <rect x="0" y="8" width="12" height="4" />
              <rect x="2" y="12" width="8" height="40" />
              <rect x="0" y="52" width="12" height="4" />
            </g>
          ))}
        </g>
      )}
      {place === 'space' && (
        <g fill={`hsl(${hue} 70% 80% / 0.55)`}>
          {Array.from({ length: 46 }, (_, index) => (
            <circle
              key={index}
              cx={(index * 53) % 400}
              cy={(index * 29) % 64}
              r={index % 5 === 0 ? 1.4 : 0.7}
            />
          ))}
          <ellipse cx="320" cy="34" rx="46" ry="9" fill="none" stroke={ink} strokeWidth="1" />
          <ellipse cx="80" cy="26" rx="30" ry="6" fill="none" stroke={soft} strokeWidth="1" />
        </g>
      )}
    </svg>
  )
}
