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
  night: 'rgba(30, 22, 64, 0.42)',
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
 * Lo que da luz por sí mismo (pedido por Alberto el 2026-11-10: de noche solo
 * alumbra lo que emite luz). Cada fuente, en su baldosa sin girar:
 *
 * - `at`: de dónde sale (unidades; z, la altura);
 * - `facing`: hacia dónde apunta (las pantallas solo alumbran por delante);
 *   `null`, a todos lados;
 * - `reach`: hasta dónde llega en el suelo; `power`, cuánta luz da.
 *
 * Las lámparas echan un cono desde la bombilla al suelo que cubre su
 * baldosa y las ocho de alrededor; las pantallas (mesas, panel, tele,
 * arcade), una luz azulada y suave hacia delante; los servidores, la de sus
 * LED. Todas bajan con el cuadrado de la distancia.
 */
type Emitter = {
  cone?: boolean
  color: string
  at: readonly [number, number, number]
  facing: readonly [number, number] | null
  reach: number
  power: number
}

const SCREEN_BLUE = '150, 190, 255'

const EMITTERS: Partial<Record<ModelId, Emitter>> = {
  lamp: { cone: true, color: '255, 212, 150', at: [8, 8, 22], facing: null, reach: 24, power: 0.3 },
  // La pantalla mira hacia quien se sienta (hacia -y): alumbra su cara y la pared.
  workstation: { color: SCREEN_BLUE, at: [4, 7.8, 18], facing: [0, -1], reach: 20, power: 0.3 },
  dashboard: { color: SCREEN_BLUE, at: [8, 8.4, 12], facing: [0, 1], reach: 26, power: 0.3 },
  tv: { color: SCREEN_BLUE, at: [8, 9.7, 10.5], facing: [0, 1], reach: 24, power: 0.3 },
  arcade: { color: '160, 170, 255', at: [8, 14.2, 19], facing: [0, 1], reach: 24, power: 0.28 },
  rack: { color: '120, 230, 200', at: [8, 13.2, 8], facing: [0, 1], reach: 14, power: 0.16 },
  vending: { color: '255, 236, 196', at: [8, 14.2, 15], facing: [0, 1], reach: 18, power: 0.16 },
  neon: { color: '255, 120, 210', at: [8, 8, 14], facing: null, reach: 18, power: 0.18 },
  aquarium: { color: '120, 220, 230', at: [8, 8, 9], facing: null, reach: 16, power: 0.14 },
}

/** Cuánto se nota lo que emite luz a cada hora: casi nada de día, todo de noche. */
const STRENGTH: Record<Daylight, number> = { day: 0.15, dawn: 0.35, dusk: 0.65, night: 1 }

/**
 * Cuánta luz llega a un punto del suelo a `distance` de la fuente, que está a
 * `height`: con el cuadrado de la distancia (y el coseno del ángulo con que
 * llega), y a cero en el borde de su alcance.
 */
function falloff(distance: number, height: number, reach: number): number {
  const h = Math.max(4, height)
  const fade = 1 - (distance / reach) ** 2

  return (h / Math.hypot(h, distance)) ** 3 * Math.max(0, fade)
}

/** Las fuentes encendidas, ya en el mundo (girada la pieza, se giran con ella). */
function emittersOf(pieces: readonly Piece[]) {
  return pieces.flatMap((piece) => {
    const found = EMITTERS[piece.model]

    if (found === undefined) return []

    const turned = piece.props.turn === true
    const [x, y, z] = found.at
    const [lx, ly] = turned ? [y, x] : [x, y]
    const facing =
      found.facing === null
        ? null
        : turned
          ? ([found.facing[1], found.facing[0]] as const)
          : found.facing

    return [
      {
        ...found,
        facing,
        world: [piece.gx * TILE + lx, piece.gy * TILE + ly, z] as const,
        seed: piece.gx * 3 + piece.gy,
      },
    ]
  })
}

/**
 * La luz en el suelo de una fuente: en el plano del suelo (un círculo del
 * mundo, en la escena un óvalo), solo hacia donde apunta, que baja con la
 * distancia y con los bordes difuminados.
 */
function floorLight(
  context: CanvasRenderingContext2D,
  point: Point,
  [x, y, z]: readonly [number, number, number],
  {
    color,
    reach,
    facing,
  }: { color: string; reach: number; facing: readonly [number, number] | null },
  power: number,
): void {
  const [cx, cy] = point(x, y, 0)
  const pool = context.createRadialGradient(0, 0, 0, 0, 0, reach)

  for (const stop of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
    pool.addColorStop(
      stop,
      `rgba(${color}, ${(power * falloff(stop * reach, z, reach)).toFixed(3)})`,
    )
  }
  context.save()
  // Las unidades del suelo: +x hacia abajo a la derecha, +y hacia abajo a la izquierda.
  context.translate(cx, cy)
  context.transform(1, 0.5, -1, 0.5, 0, 0)
  context.beginPath()
  if (facing === null) context.arc(0, 0, reach, 0, Math.PI * 2)
  else {
    const angle = Math.atan2(facing[1], facing[0])

    context.moveTo(-facing[0], -facing[1])
    context.arc(0, 0, reach, angle - 1.15, angle + 1.15)
    context.closePath()
  }
  context.fillStyle = pool
  context.fill()
  context.restore()
}

/** El cono de una lámpara: de la bombilla al óvalo que alumbra en el suelo. */
function cone(
  context: CanvasRenderingContext2D,
  point: Point,
  [x, y, z]: readonly [number, number, number],
  color: string,
  reach: number,
  power: number,
): void {
  const [bx, by] = point(x, y, z)
  const [cx, cy] = point(x, y, 0)
  // Un círculo del suelo de radio `reach`, visto en la escena.
  const [rx, ry] = [reach * Math.SQRT2, (reach * Math.SQRT2) / 2]
  const gradient = context.createLinearGradient(bx, by, cx, cy + ry)

  gradient.addColorStop(0, `rgba(${color}, ${(power * 0.55).toFixed(3)})`)
  gradient.addColorStop(0.5, `rgba(${color}, ${(power * 0.22).toFixed(3)})`)
  gradient.addColorStop(1, `rgba(${color}, ${(power * 0.06).toFixed(3)})`)
  context.beginPath()
  context.moveTo(bx - 2.5, by)
  context.lineTo(cx - rx, cy)
  context.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true)
  context.lineTo(bx + 2.5, by)
  context.closePath()
  context.fillStyle = gradient
  context.fill()
}

/** Un brillo pequeño alrededor de un punto: la bombilla, la pantalla, el LED. */
function halo(
  context: CanvasRenderingContext2D,
  [cx, cy]: [number, number],
  radius: number,
  color: string,
  alpha: number,
): void {
  const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius)

  glow.addColorStop(0, `rgba(${color}, ${alpha.toFixed(3)})`)
  glow.addColorStop(0.4, `rgba(${color}, ${(alpha * 0.35).toFixed(3)})`)
  glow.addColorStop(1, `rgba(${color}, 0)`)
  context.fillStyle = glow
  context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
}

/**
 * La luz de lo que la emite: en el suelo, el cono de las lámparas y un brillo
 * en cada fuente; y, al caer la tarde, la guirnalda. Va después del tono de
 * la hora, para que de noche se vea lo que alumbra y nada más.
 */
export function emitted(
  context: CanvasRenderingContext2D,
  size: number,
  pieces: readonly Piece[],
  light: Daylight,
  frame: number,
  point: Point,
  density: number,
): void {
  const strength = STRENGTH[light]
  const sources = emittersOf(pieces)

  context.save()
  clipRoom(context, size, point, WALL_TOP)
  context.globalCompositeOperation = 'screen'
  // Lo de la luz en el suelo y los conos, sin bordes.
  soften(context, 1.5, density)
  for (const source of sources) {
    const flicker = 1 + Math.sin(frame * 0.3 + source.seed) * 0.04
    const power = source.power * strength * flicker

    if (source.cone === true) cone(context, point, source.world, source.color, source.reach, power)
    floorLight(context, point, source.world, source, power)
  }
  context.filter = 'none'
  for (const source of sources) {
    const [x, y, z] = source.world
    const [fx, fy] = source.facing ?? [0, 0]
    const power = source.power * strength

    halo(
      context,
      point(x + fx * 1.5, y + fy * 1.5, z),
      source.cone === true ? 7 : 5,
      source.color,
      power * 1.6,
    )
  }
  if (light === 'dusk' || light === 'night') {
    bulbsOf(size).forEach(([x, y, z], index) => {
      const hex = Number.parseInt((BULBS[index % BULBS.length] ?? BULBS[0]).slice(1), 16)
      const color = `${String(hex >> 16)}, ${String((hex >> 8) & 255)}, ${String(hex & 255)}`

      halo(context, point(x, y, z), 4, color, (0.3 + ((index * 7 + frame) % 5) * 0.05) * strength)
    })
  }
  context.restore()
}
