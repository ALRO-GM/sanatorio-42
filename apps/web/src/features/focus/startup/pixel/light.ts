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

/**
 * El tono de la hora, que se le da a cada dibujo (suelo, muebles, gente) y no
 * a la luz: así lo que alumbra no se apaga con la noche (`tinted`).
 */
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
 * Un dibujo con el tono de la hora (`TINT`), hecho una vez: solo sobre lo
 * pintado, sin salirse. De día, el mismo dibujo.
 */
export function tinted(canvas: HTMLCanvasElement, light: Daylight): HTMLCanvasElement {
  const color = TINT[light]

  if (color === null) return canvas

  const copy = document.createElement('canvas')
  const context = copy.getContext('2d')

  copy.width = canvas.width
  copy.height = canvas.height
  if (context === null) return canvas
  context.drawImage(canvas, 0, 0)
  context.globalCompositeOperation = 'source-atop'
  context.fillStyle = color
  context.fillRect(0, 0, copy.width, copy.height)

  return copy
}

/**
 * Lo que da luz por sí mismo (pedido por Alberto el 2026-11-10: de noche solo
 * alumbra lo que emite luz). Cada fuente, en su baldosa sin girar:
 *
 * - `at`: el centro de lo que alumbra (unidades; z, la altura);
 * - `facing`: hacia dónde apunta (las pantallas solo alumbran por delante);
 *   `null`, a todos lados;
 * - `width` y `height`: lo que mide la pantalla, que alumbra entera (no un
 *   punto): de lado a lado, hacia delante;
 * - `reach`: hasta dónde llega en el suelo; `power`, cuánta luz da;
 * - `air`: si se ve brillar el aire delante. Las pantallas de las mesas miran
 *   a quien se sienta, de espaldas a la sala: se ven encendidas por el brillo
 *   azul alrededor del monitor (`behind`) y su luz se le ve en la cara
 *   (`glow` en `models/workplace.ts`).
 *
 * Las lámparas echan un cono desde la bombilla al suelo que cubre su
 * baldosa y las ocho de alrededor. Todas bajan con el cuadrado de la distancia.
 */
type Emitter = {
  cone?: boolean
  color: string
  at: readonly [number, number, number]
  facing: readonly [number, number] | null
  width?: number
  height?: number
  reach: number
  power: number
  air: boolean
  /**
   * La pantalla mira hacia el otro lado (las de las mesas): su brillo se ve
   * alrededor del monitor, por detrás, y se pinta antes que su pieza para
   * que el monitor lo tape por el centro.
   */
  behind?: boolean
}

const SCREEN_BLUE = '150, 190, 255'

const EMITTERS: Partial<Record<ModelId, Emitter>> = {
  lamp: {
    cone: true,
    color: '255, 212, 150',
    at: [8, 8, 22],
    facing: null,
    reach: 24,
    power: 0.42,
    air: true,
  },
  workstation: {
    color: SCREEN_BLUE,
    at: [4, 7.8, 19],
    facing: [0, -1],
    width: 6,
    height: 8,
    reach: 20,
    power: 0.45,
    air: true,
    behind: true,
  },
  dashboard: {
    color: SCREEN_BLUE,
    at: [8, 8.4, 12],
    facing: [0, 1],
    width: 12,
    height: 10,
    reach: 26,
    power: 0.3,
    air: true,
  },
  tv: {
    color: SCREEN_BLUE,
    at: [8, 9.7, 10.5],
    facing: [0, 1],
    width: 10,
    height: 7,
    reach: 24,
    power: 0.3,
    air: true,
  },
  arcade: {
    color: '160, 170, 255',
    at: [8, 14.2, 19],
    facing: [0, 1],
    width: 8,
    height: 8,
    reach: 24,
    power: 0.28,
    air: true,
  },
  rack: {
    color: '120, 230, 200',
    at: [8, 13.2, 8],
    facing: [0, 1],
    width: 8,
    height: 10,
    reach: 14,
    power: 0.16,
    air: true,
  },
  vending: {
    color: '255, 236, 196',
    at: [8, 14.2, 15],
    facing: [0, 1],
    width: 8,
    height: 12,
    reach: 18,
    power: 0.16,
    air: true,
  },
  neon: { color: '255, 120, 210', at: [8, 8, 14], facing: null, reach: 18, power: 0.18, air: true },
  aquarium: {
    color: '120, 220, 230',
    at: [8, 8, 9],
    facing: null,
    reach: 16,
    power: 0.14,
    air: true,
  },
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

type Source = Emitter & {
  facing: readonly [number, number] | null
  world: readonly [number, number, number]
  piece: Piece
}

/** Las fuentes encendidas, ya en el mundo (girada la pieza, se giran con ella). */
function sourcesOf(pieces: readonly Piece[]): Source[] {
  return pieces.flatMap((piece) => {
    const found = EMITTERS[piece.model]

    if (found === undefined) return []

    const turned = piece.props.turn === true
    // Con portátil (nivel 0 y 1), la pantalla es más pequeña y está más baja.
    const laptop = piece.model === 'workstation' && (piece.props.level ?? 0) <= 1
    const [x, y, z] = laptop ? ([4.25, 8.9, 14.8] as const) : found.at
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
        ...(laptop ? { width: 4.5, height: 4, power: found.power * 0.7 } : {}),
        facing,
        world: [piece.gx * TILE + lx, piece.gy * TILE + ly, z],
        piece,
      },
    ]
  })
}

/** Los puntos de una pantalla de lado a lado (perpendicular a donde mira): alumbra entera. */
function across(source: Source, count: number): [number, number, number][] {
  const [x, y, z] = source.world
  const half = (source.width ?? 0) / 2

  if (source.facing === null || half === 0 || count <= 1) return [[x, y, z]]

  const [fx, fy] = source.facing

  return Array.from({ length: count }, (_, index) => {
    const t = -half + (index / (count - 1)) * half * 2

    return [x - fy * t, y + fx * t, z]
  })
}

/**
 * La luz en el suelo de una fuente puntual: en el plano del suelo (un
 * círculo del mundo, en la escena un óvalo), solo hacia donde apunta, que
 * baja con la distancia.
 */
function floorLight(
  context: CanvasRenderingContext2D,
  point: Point,
  [x, y, z]: readonly [number, number, number],
  color: string,
  reach: number,
  facing: readonly [number, number] | null,
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

    context.moveTo(0, 0)
    context.arc(0, 0, reach, angle - 1.25, angle + 1.25)
    context.closePath()
  }
  context.fillStyle = pool
  context.fill()
  context.restore()
}

/**
 * La luz que llega al suelo, toda junta: la de las ventanas (de día) y la de
 * lo que emite luz. Va debajo de los muebles y de la gente, que la tapan si
 * están delante; se calcula una vez (`paintOffice`).
 */
export function floorLights(
  context: CanvasRenderingContext2D,
  size: number,
  pieces: readonly Piece[],
  light: Daylight,
  point: Point,
  density: number,
): void {
  context.save()
  // Solo en el suelo: lo que caería más allá no sube por la pared.
  clipRoom(context, size, point, 0)
  context.globalCompositeOperation = 'screen'
  soften(context, 3, density)
  if (light !== 'night') {
    const { color, pool } = SUN[light]

    context.fillStyle = `rgba(${color}, ${pool.toFixed(3)})`
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
  }
  soften(context, 1.5, density)
  for (const source of sourcesOf(pieces)) {
    const points = across(source, 5)
    const power = (source.power * STRENGTH[light]) / points.length

    for (const at of points) {
      floorLight(context, point, at, source.color, source.reach, source.facing, power)
    }
  }
  context.restore()
}

/** Un brillo pequeño alrededor de un punto: la bombilla, el neón, el acuario. */
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

/** El cono de una lámpara: de la bombilla al óvalo que alumbra en el suelo. */
function cone(
  context: CanvasRenderingContext2D,
  point: Point,
  source: Source,
  power: number,
): void {
  const [x, y, z] = source.world
  const [bx, by] = point(x, y, z)
  const [cx, cy] = point(x, y, 0)
  // Un círculo del suelo de radio `reach`, visto en la escena.
  const [rx, ry] = [source.reach * Math.SQRT2, (source.reach * Math.SQRT2) / 2]
  const gradient = context.createLinearGradient(bx, by, cx, cy + ry)

  gradient.addColorStop(0, `rgba(${source.color}, ${(power * 0.9).toFixed(3)})`)
  gradient.addColorStop(0.5, `rgba(${source.color}, ${(power * 0.5).toFixed(3)})`)
  gradient.addColorStop(1, `rgba(${source.color}, ${(power * 0.2).toFixed(3)})`)
  context.beginPath()
  context.moveTo(bx - 2.5, by)
  context.lineTo(cx - rx, cy)
  context.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true)
  context.lineTo(bx + 2.5, by)
  context.closePath()
  context.fillStyle = gradient
  context.fill()
}

/**
 * El aire que brilla delante de una pantalla: un volumen con su forma (la de
 * la pantalla entera), que sale hacia donde mira y se apaga al alejarse.
 */
function screenGlow(
  context: CanvasRenderingContext2D,
  point: Point,
  source: Source,
  power: number,
): void {
  const [x, y, z] = source.world
  const [fx, fy] = source.facing ?? [0, 1]
  const [half, tall, out] = [(source.width ?? 6) / 2, (source.height ?? 6) / 2, source.reach * 0.35]
  const corner = (side: number, up: number, ahead: number, spread: number): [number, number] =>
    point(
      x - fy * side * spread + fx * ahead,
      y + fx * side * spread + fy * ahead,
      z + up * spread - ahead * 0.35,
    )
  const shape = hull(
    [-1, 1].flatMap((side) =>
      [-1, 1].flatMap((up) => [
        corner(side * half, up * tall, 0, 1),
        corner(side * half, up * tall, out, 1.5),
      ]),
    ),
  )
  const from = point(x, y, z)
  const to = point(x + fx * out, y + fy * out, z - out * 0.35)
  const gradient = context.createLinearGradient(from[0], from[1], to[0], to[1])

  gradient.addColorStop(0, `rgba(${source.color}, ${Math.min(0.8, power * 1.8).toFixed(3)})`)
  gradient.addColorStop(0.4, `rgba(${source.color}, ${(power * 0.7).toFixed(3)})`)
  gradient.addColorStop(1, `rgba(${source.color}, 0)`)
  context.fillStyle = gradient
  trace(context, shape)
  context.fill()
}

/** Una luz en el aire ya dibujada: su lienzo, dónde va y en qué orden (`depth` como `depthOf`). */
export type AirLight = {
  canvas: HTMLCanvasElement
  x: number
  y: number
  depth: number
  /** Antes que su pieza (`behind`) o después de todo lo de su fila. */
  before: boolean
}

/**
 * Dibuja una luz en su propio lienzo, recortado a lo que ocupa (`box`, en
 * píxeles del dibujo), difuminada y solo dentro de la sala.
 */
function airLight(
  box: [number, number, number, number],
  depth: number,
  size: number,
  point: Point,
  density: number,
  draw: (context: CanvasRenderingContext2D) => void,
): AirLight | null {
  const [x0, y0, x1, y1] = [
    Math.floor(box[0]) - 4,
    Math.floor(box[1]) - 4,
    Math.ceil(box[2]) + 4,
    Math.ceil(box[3]) + 4,
  ]
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = (x1 - x0) * density
  canvas.height = (y1 - y0) * density
  if (context === null) return null
  context.setTransform(density, 0, 0, density, -x0 * density, -y0 * density)
  clipRoom(context, size, point, WALL_TOP)
  soften(context, 1.5, density)
  draw(context)

  return { canvas, x: x0, y: y0, depth, before: false }
}

/** Lo que ocupa en la escena un puñado de puntos. */
function boxOf(points: [number, number][]): [number, number, number, number] {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/**
 * La luz en el aire, cada una en su lienzo y con su sitio en el orden de
 * pintado: los conos de las lámparas, el brillo delante de las pantallas, el
 * de los LED, el neón y el acuario, y los haces de las ventanas (efecto
 * Tyndall, de día). Así lo que está delante la tapa. Se calcula una vez.
 */
export function airLights(
  size: number,
  pieces: readonly Piece[],
  light: Daylight,
  point: Point,
  density: number,
): AirLight[] {
  const out: (AirLight | null)[] = []

  for (const source of sourcesOf(pieces)) {
    if (!source.air) continue

    const power = source.power * STRENGTH[light]
    const [x, y, z] = source.world
    const depth = source.piece.gx + source.piece.gy
    const reach = source.reach * Math.SQRT2

    if (source.behind === true) {
      // El brillo del monitor encendido: alrededor de la pantalla, azul y
      // fuerte; el monitor lo tapa por el centro y quien se sienta, por detrás.
      const [cx, cy] = point(x, y, z)
      const glow = airLight(
        [cx - 14, cy - 14, cx + 14, cy + 14],
        depth,
        size,
        point,
        density,
        (context) => {
          halo(context, [cx, cy], 12, source.color, Math.min(0.9, power * 2))
          screenGlow(context, point, source, power)
        },
      )

      out.push(glow === null ? null : { ...glow, before: true })
    } else if (source.cone === true) {
      const [cx, cy] = point(x, y, 0)
      const [bx, by] = point(x, y, z)

      out.push(
        airLight(
          [cx - reach, by - 8, cx + reach, cy + reach / 2],
          depth,
          size,
          point,
          density,
          (context) => {
            cone(context, point, source, power)
            halo(context, [bx, by], 8, source.color, Math.min(0.85, power * 2.6))
          },
        ),
      )
    } else if (source.facing === null) {
      const [cx, cy] = point(x, y, z)

      out.push(
        airLight([cx - 10, cy - 10, cx + 10, cy + 10], depth, size, point, density, (context) => {
          halo(context, [cx, cy], 9, source.color, Math.min(0.8, power * 2.4))
        }),
      )
    } else {
      const [cx, cy] = point(x, y, z)
      const span = source.reach * 0.5 + (source.width ?? 6)

      out.push(
        airLight(
          [cx - span * 1.5, cy - span, cx + span * 1.5, cy + span],
          depth,
          size,
          point,
          density,
          (context) => {
            screenGlow(context, point, source, power)
          },
        ),
      )
    }
  }

  if (light !== 'night') {
    const { color, beam } = SUN[light]

    for (const pane of panesOf(size)) {
      const wall: [number, number][] = [
        point(pane.x0, 0, pane.z0),
        point(pane.x1, 0, pane.z0),
        point(pane.x1, 0, pane.z1),
        point(pane.x0, 0, pane.z1),
      ]
      const hits = [
        hit(light, pane.x0, pane.z0),
        hit(light, pane.x1, pane.z0),
        hit(light, pane.x1, pane.z1),
        hit(light, pane.x0, pane.z1),
      ]
      const floor = hits.map(([hx, hy]) => point(hx, hy, 0))
      const middle = (pane.z0 + pane.z1) / 2
      const [mx, my] = hit(light, (pane.x0 + pane.x1) / 2, middle)
      const from = point((pane.x0 + pane.x1) / 2, 0, middle)
      const to = point(mx, my, 0)
      // En el orden de pintado, a media altura del haz: lo que está más
      // cerca lo tapa.
      const depth = (mx + my) / 2 / TILE

      out.push(
        airLight(boxOf([...wall, ...floor]), depth, size, point, density, (context) => {
          const gradient = context.createLinearGradient(from[0], from[1], to[0], to[1])

          gradient.addColorStop(0, `rgba(${color}, ${beam.toFixed(3)})`)
          gradient.addColorStop(0.6, `rgba(${color}, ${(beam * 0.45).toFixed(3)})`)
          gradient.addColorStop(1, `rgba(${color}, 0)`)
          context.fillStyle = gradient
          trace(context, hull([...wall, ...floor]))
          context.fill()
        }),
      )
    }
  }

  return out.filter((one) => one !== null)
}

/**
 * Las motas de polvo de los haces, nítidas: cada una baja despacio por el
 * haz de su cristal. Se pintan en cada fotograma (son pocas y sin
 * desenfoque); los haces, no (`paintOffice` los guarda hechos).
 */
export function motes(
  context: CanvasRenderingContext2D,
  size: number,
  light: Daylight,
  frame: number,
  point: Point,
): void {
  if (light === 'night') return

  const { color, slope, drift } = SUN[light]

  context.save()
  context.globalCompositeOperation = 'screen'
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
  context.restore()
}

/** La guirnalda encendida al caer la tarde: un brillo pequeño en cada bombilla, que titila. */
export function garland(
  context: CanvasRenderingContext2D,
  size: number,
  light: Daylight,
  frame: number,
  point: Point,
): void {
  if (light !== 'dusk' && light !== 'night') return

  const strength = STRENGTH[light]

  context.save()
  context.globalCompositeOperation = 'screen'
  bulbsOf(size).forEach(([x, y, z], index) => {
    const hex = Number.parseInt((BULBS[index % BULBS.length] ?? BULBS[0]).slice(1), 16)
    const color = `${String(hex >> 16)}, ${String((hex >> 8) & 255)}, ${String(hex & 255)}`

    halo(context, point(x, y, z), 4, color, (0.3 + ((index * 7 + frame) % 5) * 0.05) * strength)
  })
  context.restore()
}
