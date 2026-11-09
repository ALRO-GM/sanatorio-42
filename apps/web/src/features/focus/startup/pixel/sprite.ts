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
  /**
   * Los píxeles de verdad: `scale` veces más finos que los del dibujo en cada
   * eje (`pw × ph`). Con `scale` 1 es el 8 bits de siempre; con 2, el 16 bits.
   */
  readonly pixels: (Color | null)[]
  readonly pw: number
  readonly ph: number

  /**
   * Girado: el modelo mira a la derecha. Se dibuja como siempre y el motor lo
   * refleja (cambia `x` por `y`) y cambia los tonos de las caras, para que la
   * luz siga viniendo de arriba a la izquierda.
   */
  turned = false

  /**
   * Los modelos dibujan siempre en las mismas coordenadas (las del 8 bits): a
   * más calidad, las caras salen con bordes más finos y más tonos, y lo escrito
   * a mano se suaviza (`grid`). Así un mismo modelo vale para las dos, y uno
   * hecho a mano para 16 bits (`Model.hd`) pinta con `paint`, píxel a píxel.
   *
   * @param ox, oy Dónde cae en el lienzo la esquina de arriba de la baldosa (0, 0).
   * @param scale Píxeles de verdad por píxel del dibujo (1, 2…).
   * @param rich Sombreado de 16 bits: degradado en las caras, brillo en los
   *   cantos y contorno del color de lo que rodea (`outline`).
   */
  constructor(
    readonly width: number,
    readonly height: number,
    readonly ox: number,
    readonly oy: number,
    readonly scale = 1,
    readonly rich = false,
  ) {
    this.pw = width * scale
    this.ph = height * scale
    this.pixels = new Array<Color | null>(this.pw * this.ph).fill(null)
  }

  /** Dónde cae en el lienzo un punto del mundo (en píxeles del dibujo). */
  project(x: number, y: number, z: number): [number, number] {
    const [a, b] = this.turned ? [y, x] : [x, y]

    return [this.ox + a - b, this.oy + (a + b) / 2 - z]
  }

  /** Un píxel del dibujo: con más calidad, un cuadrado de `scale × scale`. */
  set(x: number, y: number, color: Color): void {
    const px = Math.floor(x) * this.scale
    const py = Math.floor(y) * this.scale

    for (let j = 0; j < this.scale; j += 1) {
      for (let i = 0; i < this.scale; i += 1) this.paint(px + i, py + j, color)
    }
  }

  /** Un píxel de verdad (de `pw × ph`): para lo dibujado a mano en alta calidad. */
  paint(px: number, py: number, color: Color): void {
    if (px >= 0 && py >= 0 && px < this.pw && py < this.ph) {
      this.pixels[py * this.pw + px] = color
    }
  }

  /** Lo pintado en un píxel de verdad. */
  at(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.pw || y >= this.ph) return null

    return this.pixels[y * this.pw + x] ?? null
  }

  /** Un polígono convexo del mundo: se pintan los píxeles con el centro dentro (o en el borde). */
  polygon(points: readonly Point[], color: Color): void {
    const s = this.scale
    const projected = points.map(([x, y, z]) => this.project(x, y, z))
    const xs = projected.map(([x]) => x * s)
    const ys = projected.map(([, y]) => y * s)

    for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py += 1) {
      for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px += 1) {
        if (inside(projected, (px + 0.5) / s, (py + 0.5) / s)) this.paint(px, py, color)
      }
    }
  }

  /**
   * Una cara vertical en franjas de abajo arriba, de más oscura a más clara:
   * el degradado del 16 bits (luz de arriba y sombra junto al suelo).
   */
  private bands(corners: (z: number) => Point[], z0: number, z1: number, color: Color): void {
    const count = Math.min(4, Math.max(1, Math.round((z1 - z0) / 3)))

    for (let band = 0; band < count; band += 1) {
      const from = z0 + ((z1 - z0) * band) / count
      const to = z0 + ((z1 - z0) * (band + 1)) / count
      const [a, b] = [corners(from), corners(to)]
      // De -18 % abajo a +10 % arriba.
      const amount = count === 1 ? 0 : -0.18 + (0.28 * band) / (count - 1)

      this.polygon(
        [a[0] ?? [0, 0, 0], a[1] ?? [0, 0, 0], b[1] ?? [0, 0, 0], b[0] ?? [0, 0, 0]],
        tint(color, amount),
      )
    }
  }

  /** Una caja de `w × d × h` con su esquina de atrás abajo en (x, y, z). */
  box(x: number, y: number, z: number, w: number, d: number, h: number, shades: Shades): void {
    const [top, left, right] = this.turned ? [shades[0], shades[2], shades[1]] : shades
    const X = x + w
    const Y = y + d
    const Z = z + h

    if (this.rich) {
      this.bands(
        (at) => [
          [x, Y, at],
          [X, Y, at],
        ],
        z,
        Z,
        left,
      )
      this.bands(
        (at) => [
          [X, y, at],
          [X, Y, at],
        ],
        z,
        Z,
        right,
      )
    } else {
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
    }
    this.polygon(
      [
        [x, y, Z],
        [X, y, Z],
        [X, Y, Z],
        [x, Y, Z],
      ],
      top,
    )

    // El canto de delante, con brillo: un píxel de verdad (medio del dibujo).
    if (this.rich && w >= 2 && d >= 2) {
      const edge = 1 / this.scale
      const shine = tint(top, 0.14)

      this.polygon(
        [
          [x, Y - edge, Z],
          [X, Y - edge, Z],
          [X, Y, Z],
          [x, Y, Z],
        ],
        shine,
      )
      this.polygon(
        [
          [X - edge, y, Z],
          [X, y, Z],
          [X, Y, Z],
          [X - edge, Y, Z],
        ],
        shine,
      )
    }
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
   * Píxeles escritos a mano a partir de (x, y) del dibujo: una fila por cadena,
   * cada letra un color de `palette` y `.` transparente. Con el doble de
   * calidad, se agranda con Scale2x: las diagonales salen redondeadas en vez
   * de en escalones gordos, sin colores nuevos.
   */
  grid(
    rows: readonly string[],
    palette: Readonly<Record<string, Color>>,
    x: number,
    y: number,
  ): void {
    // Girado, lo escrito a mano se da la vuelta en su sitio: el sitio ya sale
    // reflejado de `project`.
    const width = Math.max(0, ...rows.map((row) => row.length))
    const cells = rows.map((row) => {
      const line = row.padEnd(width, '.').split('')

      return this.turned ? line.reverse() : line
    })
    const px = Math.floor(x) * this.scale
    const py = Math.floor(y) * this.scale

    if (this.scale === 2) {
      scale2x(cells).forEach((line, j) => {
        line.forEach((cell, i) => {
          const color = palette[cell]

          if (color !== undefined) this.paint(px + i, py + j, color)
        })
      })

      return
    }

    cells.forEach((line, j) => {
      line.forEach((cell, i) => {
        const color = palette[cell]

        if (color !== undefined) this.set(x + i, y + j, color)
      })
    })
  }

  /**
   * El contorno: cada píxel vacío que toca uno pintado. En 8 bits, de
   * `color`; con sombreado de 16 bits, del tono de lo que toca muy oscurecido
   * (el «sel-out» de los juegos de entonces), que se lee igual y pesa menos.
   */
  outline(color: Color = INK): this {
    const edge: [number, Color][] = []

    for (let y = 0; y < this.ph; y += 1) {
      for (let x = 0; x < this.pw; x += 1) {
        if (this.at(x, y) !== null) continue

        const touched =
          this.at(x, y + 1) ?? this.at(x - 1, y) ?? this.at(x + 1, y) ?? this.at(x, y - 1)

        if (touched !== null)
          edge.push([y * this.pw + x, this.rich ? mix(touched, color, 0.7) : color])
      }
    }

    for (const [index, ink] of edge) this.pixels[index] = ink

    return this
  }

  /** El rectángulo con algo pintado, en píxeles de verdad, `[x0, y0, x1, y1]` (incluidos), o `null` si está vacío. */
  bounds(): [number, number, number, number] | null {
    let x0 = this.pw
    let y0 = this.ph
    let x1 = -1
    let y1 = -1

    for (let y = 0; y < this.ph; y += 1) {
      for (let x = 0; x < this.pw; x += 1) {
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

/** Un color `#rrggbb` en sus tres canales. */
function channels(color: Color): [number, number, number] {
  const value = Number.parseInt(color.slice(1, 7), 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const hex = (parts: readonly number[]): Color =>
  `#${parts
    .map((part) =>
      Math.round(Math.max(0, Math.min(255, part)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

/** Un color mezclado con otro: `amount` 0 es el primero; 1, el segundo. */
function mix(color: Color, other: Color, amount: number): Color {
  const a = channels(color)
  const b = channels(other)

  return hex(a.map((part, index) => part + ((b[index] ?? 0) - part) * amount))
}

/**
 * Más claro (`amount` > 0) o más oscuro: hacia un blanco cálido o un azul
 * oscuro, no hacia el gris (el «hue shifting» del pixel art: las luces
 * amarillean y las sombras azulean).
 */
export const tint = (color: Color, amount: number): Color =>
  amount >= 0 ? mix(color, '#fff4d6', amount) : mix(color, '#1b1638', -amount)

/** Scale2x (EPX): cada celda, cuatro; las esquinas siguen a sus vecinas si coinciden. */
export function scale2x(cells: readonly string[][]): string[][] {
  const at = (i: number, j: number): string => cells[j]?.[i] ?? '.'
  const out: string[][] = []

  cells.forEach((line, j) => {
    const top: string[] = []
    const bottom: string[] = []

    line.forEach((p, i) => {
      const a = at(i, j - 1)
      const b = at(i + 1, j)
      const c = at(i - 1, j)
      const d = at(i, j + 1)

      top.push(c === a && c !== d && a !== b ? a : p, a === b && a !== c && b !== d ? b : p)
      bottom.push(d === c && d !== b && c !== a ? c : p, b === d && b !== a && d !== c ? d : p)
    })
    out.push(top, bottom)
  })

  return out
}
