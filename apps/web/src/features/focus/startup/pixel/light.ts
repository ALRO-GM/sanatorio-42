import { BULBS, bulbsOf, LINTEL, SILL, WALL_TOP, windowsOf } from './floor'
import type { Piece } from './layout'
import type { ModelId } from './models'
import { TILE } from './sprite'

/**
 * La luz de la oficina según la hora de quien la mira: amanecer (de 7 a 9),
 * día (de 9 a 18), atardecer (de 18 a 21) y noche. Cambia lo que se ve por
 * las ventanas (`floor.ts`), el tono de la sala y la luz que entra.
 */
export type Daylight = 'dawn' | 'day' | 'dusk' | 'night'

export function daylightOf(hour: number): Daylight {
  if (hour >= 21 || hour < 7) return 'night'
  if (hour < 9) return 'dawn'

  return hour < 18 ? 'day' : 'dusk'
}

/** Un punto del mundo (en unidades) en la escena, en píxeles del dibujo. */
type Point = (x: number, y: number, z?: number) => [number, number]

/**
 * La luz que entra por las ventanas: su color, cuánto baja (`slope`, más
 * tumbada con el sol bajo), hacia qué lado se tuerce (`drift`) y lo fuerte
 * que se ve el haz en el aire (`beam`) y la mancha en el suelo (`pool`).
 * Sutil: se nota sin tapar lo que alumbra. De noche no entra.
 */
type Sunny = Exclude<Daylight, 'night'>

const SUN: Record<
  Sunny,
  { color: string; slope: number; drift: number; beam: number; pool: number }
> = {
  dawn: { color: '255, 200, 168', slope: 0.5, drift: 0.55, beam: 0.14, pool: 0.22 },
  day: { color: '255, 238, 196', slope: 0.85, drift: 0.2, beam: 0.11, pool: 0.24 },
  dusk: { color: '255, 168, 96', slope: 0.45, drift: -0.5, beam: 0.15, pool: 0.22 },
}

/**
 * Lo que se difumina la luz, en píxeles del dibujo: mucho en el suelo (una
 * mancha sin bordes) y algo en el aire. `density`, los píxeles de verdad de
 * cada uno (el filtro va en píxeles del lienzo).
 */
function soften(context: CanvasRenderingContext2D, amount: number, density: number): void {
  context.filter = `blur(${String(amount * density)}px)`
}

/** El tono que se le da a toda la sala encima de lo pintado (nada de día). */
const TINT: Record<Daylight, string | null> = {
  dawn: 'rgba(255, 180, 170, 0.07)',
  day: null,
  dusk: 'rgba(150, 70, 110, 0.13)',
  night: 'rgba(36, 26, 72, 0.3)',
}

/** Cada cristal de cada ventana: dos columnas y dos filas, como el marco (`floor.ts`). */
function panesOf(size: number): { x0: number; x1: number; z0: number; z1: number }[] {
  const split = SILL + (LINTEL - SILL) * 0.55

  return windowsOf(size).flatMap(({ x0, x1 }) => {
    const middle = (x0 + x1) / 2

    return [
      [x0 + 1, middle - 0.5],
      [middle + 0.5, x1 - 1],
    ].flatMap(([a, b]) => [
      { x0: a ?? x0, x1: b ?? x1, z0: SILL + 1, z1: split - 0.4 },
      { x0: a ?? x0, x1: b ?? x1, z0: split + 0.4, z1: LINTEL - 1 },
    ])
  })
}

/** Dónde llega al suelo el rayo que entra por (x, 0, z): hacia dentro (+y) y abajo. */
function hit(light: Sunny, x: number, z: number): [number, number] {
  const { slope, drift } = SUN[light]
  const t = z / slope

  return [x + drift * t, t]
}

/** La envolvente convexa de unos puntos de la pantalla (para el haz entero de un cristal). */
function hull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: [number, number][]): [number, number][] => {
    const out: [number, number][] = []

    for (const point of list) {
      for (;;) {
        const [a, b] = [out.at(-2), out.at(-1)]

        if (a === undefined || b === undefined || cross(a, b, point) > 0) break
        out.pop()
      }
      out.push(point)
    }

    return out.slice(0, -1)
  }

  return [...half(sorted), ...half([...sorted].reverse())]
}

function trace(context: CanvasRenderingContext2D, points: [number, number][]): void {
  context.beginPath()
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.closePath()
}

/** Solo dentro de la sala: el suelo y el aire sobre él, hasta lo alto de las paredes. */
function clipRoom(
  context: CanvasRenderingContext2D,
  size: number,
  point: Point,
  top = LINTEL + 6,
): void {
  const end = size * TILE

  // Con el canto de delante del suelo (3 unidades por debajo).
  trace(context, [
    point(0, 0, top),
    point(end, 0, top),
    point(end, 0, -3),
    point(end, end, -3),
    point(0, end, -3),
    point(0, end, top),
  ])
  context.clip()
}

/**
 * La mancha de luz de cada cristal en el suelo: va antes que los muebles y
 * la gente, que la tapan. Respira un poco.
 */
export function lightOnFloor(
  context: CanvasRenderingContext2D,
  size: number,
  light: Daylight,
  frame: number,
  point: Point,
  density: number,
): void {
  // De noche no entra luz por las ventanas.
  if (light === 'night') return

  const { color, pool } = SUN[light]
  const breathe = 1 + Math.sin(frame * 0.15) * 0.08

  context.save()
  // Solo en el suelo: lo que caería más allá no sube por la pared.
  clipRoom(context, size, point, 0)
  context.globalCompositeOperation = 'screen'
  soften(context, 3, density)
  context.fillStyle = `rgba(${color}, ${(pool * breathe).toFixed(3)})`
  for (const pane of panesOf(size)) {
    trace(
      context,
      [
        hit(light, pane.x0, pane.z0),
        hit(light, pane.x1, pane.z0),
        hit(light, pane.x1, pane.z1),
        hit(light, pane.x0, pane.z1),
      ].map(([x, y]) => point(x, y, 0)),
    )
    context.fill()
  }
  context.restore()
}

/**
 * Los haces de luz en el aire (efecto Tyndall): de cada cristal al suelo, más
 * fuertes junto a la ventana y desvaneciéndose al bajar, con motas de polvo
 * que brillan al cruzarlos. Van encima de todo, como la luz en el aire.
 */
export function lightInAir(
  context: CanvasRenderingContext2D,
  size: number,
  light: Daylight,
  frame: number,
  point: Point,
  density: number,
): void {
  if (light === 'night') return

  const { color, beam, slope, drift } = SUN[light]

  context.save()
  clipRoom(context, size, point)
  context.globalCompositeOperation = 'screen'
  soften(context, 1.5, density)
  panesOf(size).forEach((pane, index) => {
    const wall: [number, number][] = [
      point(pane.x0, 0, pane.z0),
      point(pane.x1, 0, pane.z0),
      point(pane.x1, 0, pane.z1),
      point(pane.x0, 0, pane.z1),
    ]
    const floor = [
      hit(light, pane.x0, pane.z0),
      hit(light, pane.x1, pane.z0),
      hit(light, pane.x1, pane.z1),
      hit(light, pane.x0, pane.z1),
    ].map(([x, y]) => point(x, y, 0))
    const from = point((pane.x0 + pane.x1) / 2, 0, (pane.z0 + pane.z1) / 2)
    const [fx, fy] = hit(light, (pane.x0 + pane.x1) / 2, (pane.z0 + pane.z1) / 2)
    const to = point(fx, fy, 0)
    const shimmer = 1 + Math.sin(frame * 0.12 + index * 1.7) * 0.12
    const gradient = context.createLinearGradient(from[0], from[1], to[0], to[1])

    gradient.addColorStop(0, `rgba(${color}, ${(beam * shimmer).toFixed(3)})`)
    gradient.addColorStop(0.6, `rgba(${color}, ${(beam * shimmer * 0.45).toFixed(3)})`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    context.fillStyle = gradient
    trace(context, hull([...wall, ...floor]))
    context.fill()
  })

  // Las motas, nítidas: cada una baja despacio por el haz de su cristal.
  context.filter = 'none'
  {
    context.fillStyle = `rgba(${color}, 0.6)`
    panesOf(size).forEach((pane, index) => {
      for (let mote = 0; mote < 3; mote += 1) {
        const seed = mote * 7 + index * 13
        const t = (frame * 0.008 + seed * 0.37) % 1
        const x = pane.x0 + ((seed * 5) % Math.max(1, pane.x1 - pane.x0))
        const z = pane.z0 + ((seed * 3) % Math.max(1, pane.z1 - pane.z0))
        const along = t * (z / slope)
        const twinkle = Math.sin(frame * 0.3 + seed) > -0.2
        const [px, py] = point(
          x + drift * along + Math.sin(frame * 0.05 + seed) * 0.8,
          along,
          z - along * slope,
        )

        if (twinkle) context.fillRect(px, py, 0.5, 0.5)
      }
    })
  }
  context.restore()
}

/** El tono de la hora sobre toda la sala (antes de las luces, que brillan por encima). */
export function tint(
  context: CanvasRenderingContext2D,
  size: number,
  light: Daylight,
  point: Point,
): void {
  const color = TINT[light]

  if (color === null) return
  context.save()
  clipRoom(context, size, point, WALL_TOP)
  context.fillStyle = color
  context.fillRect(-1e4, -1e4, 2e4, 2e4)
  context.restore()
}

/**
 * Lo que alumbra: de dónde sale la luz (altura en unidades), su color y si se
 * enciende también de día (lámparas, neón, pantallas grandes) o solo al caer
 * la tarde (las pantallas de las mesas).
 */
const LIGHTS: Partial<Record<ModelId, { color: string; z: number; day: boolean }>> = {
  lamp: { color: '255, 214, 140', z: 23, day: true },
  neon: { color: '255, 120, 210', z: 14, day: true },
  tv: { color: '140, 210, 255', z: 12, day: true },
  arcade: { color: '170, 140, 255', z: 16, day: true },
  aquarium: { color: '120, 220, 230', z: 9, day: true },
  vending: { color: '255, 230, 170', z: 16, day: true },
  workstation: { color: '255, 196, 120', z: 12, day: false },
  reception: { color: '255, 196, 120', z: 12, day: false },
}

/** Cuánto se nota la luz de las lámparas a cada hora: poco de día, mucho de noche. */
const STRENGTH: Record<Daylight, number> = { day: 0.4, dawn: 0.55, dusk: 0.7, night: 0.85 }

/** Lo que alumbra, encendido a esta hora. */
function lit(pieces: readonly Piece[], light: Daylight) {
  return pieces.flatMap((piece) => {
    const found = LIGHTS[piece.model]

    return found === undefined || (!found.day && (light === 'day' || light === 'dawn'))
      ? []
      : [{ piece, ...found }]
  })
}

/**
 * La zona que alumbra cada lámpara: un óvalo transparente alrededor de su
 * pie que aclara el suelo y lo que hay cerca. Va después del tono de la hora,
 * para que de noche se note la luz.
 */
export function lampPools(
  context: CanvasRenderingContext2D,
  pieces: readonly Piece[],
  light: Daylight,
  frame: number,
  point: Point,
): void {
  const strength = STRENGTH[light]

  context.save()
  context.globalCompositeOperation = 'screen'
  for (const { piece, color, z } of lit(pieces, light)) {
    const [cx, cy] = point(piece.gx * TILE + 8, piece.gy * TILE + 8, 0)
    const radius = 10 + z * 0.7
    const flicker = 1 + Math.sin(frame * 0.3 + piece.gx * 3 + piece.gy) * 0.05
    const pool = context.createRadialGradient(0, 0, 0, 0, 0, radius)

    pool.addColorStop(0, `rgba(${color}, ${(0.3 * strength * flicker).toFixed(3)})`)
    pool.addColorStop(0.55, `rgba(${color}, ${(0.12 * strength * flicker).toFixed(3)})`)
    pool.addColorStop(1, `rgba(${color}, 0)`)
    // Un círculo aplastado a la mitad: en el suelo de la perspectiva, un óvalo.
    context.save()
    context.translate(cx, cy)
    context.scale(1, 0.5)
    context.fillStyle = pool
    context.fillRect(-radius, -radius, radius * 2, radius * 2)
    context.restore()
  }
  context.restore()
}

/**
 * El halo de cada luz en el aire, alrededor de la bombilla o la pantalla, y
 * la guirnalda al caer la tarde. Va encima de todo.
 */
export function lampHalos(
  context: CanvasRenderingContext2D,
  size: number,
  pieces: readonly Piece[],
  light: Daylight,
  frame: number,
  point: Point,
): void {
  const strength = STRENGTH[light]
  const glow = (cx: number, cy: number, radius: number, color: string, alpha: number): void => {
    const halo = context.createRadialGradient(cx, cy, 0, cx, cy, radius)

    halo.addColorStop(0, `rgba(${color}, ${alpha.toFixed(3)})`)
    halo.addColorStop(0.4, `rgba(${color}, ${(alpha * 0.4).toFixed(3)})`)
    halo.addColorStop(1, `rgba(${color}, 0)`)
    context.fillStyle = halo
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  }

  context.save()
  context.globalCompositeOperation = 'screen'
  for (const { piece, color, z } of lit(pieces, light)) {
    const [cx, cy] = point(piece.gx * TILE + 8, piece.gy * TILE + 8, z)
    const flicker = 1 + Math.sin(frame * 0.3 + piece.gx * 3 + piece.gy) * 0.06

    glow(cx, cy, 14, color, 0.35 * strength * flicker)
  }
  if (light === 'dusk' || light === 'night') {
    bulbsOf(size).forEach(([x, y, z], index) => {
      const [cx, cy] = point(x, y, z)
      const hex = Number.parseInt((BULBS[index % BULBS.length] ?? BULBS[0]).slice(1), 16)
      const color = `${String(hex >> 16)}, ${String((hex >> 8) & 255)}, ${String(hex & 255)}`

      glow(cx, cy, 4, color, (0.35 + ((index * 7 + frame) % 5) * 0.06) * strength)
    })
  }
  context.restore()
}
