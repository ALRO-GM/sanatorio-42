/**
 * El motor de los dibujos en píxeles de la startup (`docs/pomodoro-startup.md`).
 *
 * Un modelo se describe en coordenadas del mundo: una baldosa mide 16 × 16
 * (`x` hacia abajo a la derecha, `y` hacia abajo a la izquierda) y `z` sube. Se
 * proyecta en isométrico 2:1 (cada baldosa, 32 × 16 píxeles) y solo se pintan
 * los píxeles cuyo centro cae dentro de cada cara: por eso los bordes salen
 * escalonados, como el pixel art hecho a mano. Al final, `outline` le pone el
 * contorno oscuro.
 *
 * No sabe nada del navegador: pintar en un lienzo es cosa de `paint.ts`.
 */

/** Un color en hexadecimal, `#rrggbb`. */
export type Color = string

/** Los tres tonos de una caja: arriba, la cara que mira a la izquierda y la de la derecha. */
export type Shades = readonly [top: Color, left: Color, right: Color]

type Point = readonly [x: number, y: number, z: number]

/** Lo que mide una baldosa en coordenadas del mundo. */
export const TILE = 16

/** El trazo de los contornos. */
export const INK = '#2a2238'

export class Sprite {
  readonly pixels: (Color | null)[]

  /**
   * @param ox, oy Dónde cae en el lienzo la esquina de arriba de la baldosa (0, 0).
   */
  constructor(
    readonly width: number,
    readonly height: number,
    readonly ox: number,
    readonly oy: number,
  ) {
    this.pixels = new Array<Color | null>(width * height).fill(null)
  }

  /** Dónde cae en el lienzo un punto del mundo. */
  project(x: number, y: number, z: number): [number, number] {
    return [this.ox + x - y, this.oy + (x + y) / 2 - z]
  }

  set(x: number, y: number, color: Color): void {
    const px = Math.floor(x)
    const py = Math.floor(y)

    if (px >= 0 && py >= 0 && px < this.width && py < this.height) {
      this.pixels[py * this.width + px] = color
    }
  }

  at(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null

    return this.pixels[y * this.width + x] ?? null
  }

  /** Un polígono convexo del mundo: se pintan los píxeles con el centro dentro (o en el borde). */
  polygon(points: readonly Point[], color: Color): void {
    const projected = points.map(([x, y, z]) => this.project(x, y, z))
    const xs = projected.map(([x]) => x)
    const ys = projected.map(([, y]) => y)

    for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py += 1) {
      for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px += 1) {
        if (inside(projected, px + 0.5, py + 0.5)) this.set(px, py, color)
      }
    }
  }

  /** Una caja de `w × d × h` con su esquina de atrás abajo en (x, y, z). */
  box(x: number, y: number, z: number, w: number, d: number, h: number, shades: Shades): void {
    const [top, left, right] = shades
    const X = x + w
    const Y = y + d
    const Z = z + h

    this.polygon(
      [
        [x, Y, z],
        [X, Y, z],
        [X, Y, Z],
        [x, Y, Z],
      ],
      left,
    )
    this.polygon(
      [
        [X, y, z],
        [X, Y, z],
        [X, Y, Z],
        [X, y, Z],
      ],
      right,
    )
    this.polygon(
      [
        [x, y, Z],
        [X, y, Z],
        [X, Y, Z],
        [x, Y, Z],
      ],
      top,
    )
  }

  /** Un rectángulo en el plano `y` fijo: lo que se ve en la cara izquierda de algo. */
  faceY(y: number, x0: number, x1: number, z0: number, z1: number, color: Color): void {
    this.polygon(
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
      ],
      color,
    )
  }

  /** Un rectángulo en el plano `x` fijo: lo que se ve en la cara derecha. */
  faceX(x: number, y0: number, y1: number, z0: number, z1: number, color: Color): void {
    this.polygon(
      [
        [x, y0, z0],
        [x, y1, z0],
        [x, y1, z1],
        [x, y0, z1],
      ],
      color,
    )
  }

  /** Un rectángulo en el plano `z` fijo: el suelo o lo de encima de algo. */
  faceZ(z: number, x0: number, x1: number, y0: number, y1: number, color: Color): void {
    this.polygon(
      [
        [x0, y0, z],
        [x1, y0, z],
        [x1, y1, z],
        [x0, y1, z],
      ],
      color,
    )
  }

  /** Un píxel suelto en un punto del mundo. */
  dot(x: number, y: number, z: number, color: Color): void {
    const [px, py] = this.project(x, y, z)

    this.set(px, py, color)
  }

  /**
   * Píxeles escritos a mano a partir de (x, y) del lienzo: una fila por cadena,
   * cada letra un color de `palette` y `.` transparente.
   */
  grid(
    rows: readonly string[],
    palette: Readonly<Record<string, Color>>,
    x: number,
    y: number,
  ): void {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i += 1) {
        const color = palette[row.charAt(i)]

        if (color !== undefined) this.set(x + i, y + j, color)
      }
    })
  }

  /** El contorno: cada píxel vacío que toca uno pintado, de `color`. */
  outline(color: Color = INK): this {
    const edge: number[] = []

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.at(x, y) !== null) continue

        const touches =
          this.at(x - 1, y) !== null ||
          this.at(x + 1, y) !== null ||
          this.at(x, y - 1) !== null ||
          this.at(x, y + 1) !== null

        if (touches) edge.push(y * this.width + x)
      }
    }

    for (const index of edge) this.pixels[index] = color

    return this
  }

  /** El rectángulo con algo pintado, `[x0, y0, x1, y1]` (incluidos), o `null` si está vacío. */
  bounds(): [number, number, number, number] | null {
    let x0 = this.width
    let y0 = this.height
    let x1 = -1
    let y1 = -1

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.at(x, y) === null) continue

        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }

    return x1 < 0 ? null : [x0, y0, x1, y1]
  }
}

/** Si un punto está dentro de un polígono convexo (o en su borde), sea cual sea su sentido. */
function inside(polygon: readonly (readonly [number, number])[], x: number, y: number): boolean {
  let positive = false
  let negative = false

  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index] ?? [0, 0]
    const [bx, by] = polygon[(index + 1) % polygon.length] ?? [ax, ay]
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax)

    if (cross > 1e-6) positive = true
    else if (cross < -1e-6) negative = true
  }

  return !(positive && negative)
}

/** Un número estable a partir de otro, para lo que parece al azar (luces, motas). */
export function scatter(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)

  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)

  return (x ^ (x >>> 16)) >>> 0
}
