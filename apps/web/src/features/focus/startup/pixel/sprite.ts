/**
 * El motor de los dibujos de la startup (`docs/pomodoro-startup.md`).
 *
 * Un modelo se describe en coordenadas del mundo: una baldosa mide 16 × 16
 * (`x` hacia abajo a la derecha, `y` hacia abajo a la izquierda) y `z` sube. Se
 * proyecta en isométrico 2:1 (cada baldosa, 32 × 16 píxeles del dibujo) y se
 * pinta `scale` veces más fino.
 *
 * El estilo: volúmenes con profundidad de verdad (cada píxel guarda a qué
 * distancia está, así lo de delante tapa lo de detrás sin importar el orden
 * en que se dibuja), cantos biselados, luz suave de arriba a la izquierda con
 * varios tonos por material, y sin delineado: lo que separa unas cosas de
 * otras es la luz y una sombra de contacto suave (`finish`).
 *
 * No sabe nada del navegador: pintar en un lienzo es cosa de `paint.ts`.
 */

/** Un color en hexadecimal, `#rrggbb` (o `rgba(…)` para las sombras). */
export type Color = string

/** Los tres tonos de un material: arriba, la cara que mira a la izquierda y la de la derecha. */
export type Shades = readonly [top: Color, left: Color, right: Color]

/** Una rampa de un material: de la sombra más honda a la luz más alta, cinco tonos. */
export type Ramp = readonly [Color, Color, Color, Color, Color]

type Point = readonly [x: number, y: number, z: number]

/** Lo que mide una baldosa en coordenadas del mundo. */
export const TILE = 16

/** El trazo oscuro: solo para los bocadillos, que son interfaz. */
export const INK = '#2a2238'

/** La luz: arriba a la izquierda y un poco de frente. */
const LIGHT: Point = normalize([-0.5, 0.3, 1])

/** La sombra de contacto: un violeta cálido, nunca negro. */
const SHADOW = [74, 40, 60] as const

/** Lo que se escribe encima sin mirar la profundidad (a mano), como antes: lo de después tapa. */
const OVER = -Infinity

export class Sprite {
  /** Los píxeles de verdad (`pw × ph`, `scale` veces más finos que los del dibujo). */
  readonly pixels: (Color | null)[]
  readonly pw: number
  readonly ph: number
  /** Lo cerca que está cada píxel (x + y + z del punto del mundo): más, más delante. */
  private readonly depth: Float32Array
  /** Qué pieza pintó cada píxel (0: nada o escrito a mano), para la sombra entre piezas. */
  private readonly ids: Int32Array
  private next = 1
  /** Lo que toca el suelo, para su sombra: rectángulos `[x, y, w, d]` del mundo. */
  private readonly ground: [number, number, number, number][] = []

  /**
   * Girado: el modelo mira a la derecha. Se dibuja como siempre y sale
   * reflejado (cambia `x` por `y`), con la luz también reflejada para que siga
   * viniendo de arriba a la izquierda.
   */
  turned = false

  /**
   * @param ox, oy Dónde cae en el lienzo la esquina de arriba de la baldosa (0, 0), en píxeles del dibujo.
   * @param scale Píxeles de verdad por píxel del dibujo.
   */
  constructor(
    readonly width: number,
    readonly height: number,
    readonly ox: number,
    readonly oy: number,
    readonly scale = 1,
  ) {
    this.pw = width * scale
    this.ph = height * scale
    this.pixels = new Array<Color | null>(this.pw * this.ph).fill(null)
    this.depth = new Float32Array(this.pw * this.ph).fill(OVER)
    this.ids = new Int32Array(this.pw * this.ph)
  }

  /** Dónde cae en el lienzo un punto del mundo (en píxeles del dibujo). */
  project(x: number, y: number, z: number): [number, number] {
    const [a, b] = this.turned ? [y, x] : [x, y]

    return [this.ox + a - b, this.oy + (a + b) / 2 - z]
  }

  /** Un píxel del dibujo, a mano: un cuadrado de `scale × scale`, encima de lo que haya. */
  set(x: number, y: number, color: Color): void {
    const px = Math.floor(x) * this.scale
    const py = Math.floor(y) * this.scale

    for (let j = 0; j < this.scale; j += 1) {
      for (let i = 0; i < this.scale; i += 1) this.paint(px + i, py + j, color)
    }
  }

  /** Un píxel de verdad, a mano, encima de lo que haya. */
  paint(px: number, py: number, color: Color): void {
    if (px >= 0 && py >= 0 && px < this.pw && py < this.ph) {
      const index = py * this.pw + px

      this.pixels[index] = color
      this.depth[index] = OVER
      this.ids[index] = 0
    }
  }

  /** Lo pintado en un píxel de verdad. */
  at(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.pw || y >= this.ph) return null

    return this.pixels[y * this.pw + x] ?? null
  }

  /** Si en un píxel ya hay algo más cerca que `near`. */
  private hidden(px: number, py: number, near: number): boolean {
    return (this.depth[py * this.pw + px] ?? OVER) > near
  }

  /** Escribe un píxel si está delante de lo que hay. */
  private put(px: number, py: number, near: number, color: Color, id: number): void {
    if (px < 0 || py < 0 || px >= this.pw || py >= this.ph) return

    const index = py * this.pw + px

    if (near < (this.depth[index] ?? OVER)) return
    this.pixels[index] = color
    this.depth[index] = near
    this.ids[index] = id
  }

  /**
   * Recorre los píxeles de verdad del rectángulo de pantalla que cubren unos
   * puntos del mundo, con la recta de vista de cada uno: el punto del mundo
   * `(a/2 + s, -a/2 + s, s - b)` para cada `s` (más `s`, más cerca).
   */
  private scan(
    corners: readonly Point[],
    each: (px: number, py: number, a: number, b: number) => void,
  ): void {
    const projected = corners.map(([x, y, z]) => this.project(x, y, z))
    const s = this.scale
    const x0 = Math.max(0, Math.floor(Math.min(...projected.map(([x]) => x)) * s) - 1)
    const x1 = Math.min(this.pw - 1, Math.ceil(Math.max(...projected.map(([x]) => x)) * s) + 1)
    const y0 = Math.max(0, Math.floor(Math.min(...projected.map(([, y]) => y)) * s) - 1)
    const y1 = Math.min(this.ph - 1, Math.ceil(Math.max(...projected.map(([, y]) => y)) * s) + 1)

    for (let py = y0; py <= y1; py += 1) {
      for (let px = x0; px <= x1; px += 1) {
        const a = (px + 0.5) / s - this.ox

        each(px, py, this.turned ? -a : a, (py + 0.5) / s - this.oy)
      }
    }
  }

  /** El tono de una rampa según hacia dónde mira la superficie (`normal`) y un ajuste. */
  private shade(tones: readonly Color[], normal: Point, bias = 0): Color {
    const light: Point = this.turned ? [LIGHT[1], LIGHT[0], LIGHT[2]] : LIGHT
    const facing = normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]
    // Arriba sale el tono de arriba, la cara izquierda el suyo y la derecha el
    // suyo (los de siempre), y entre medias, en los biseles, los de en medio.
    const position = Math.max(0, Math.min(4, along(facing) + bias))

    return tones[Math.round(position * 2)] ?? tones[0] ?? '#000000'
  }

  /**
   * Una caja de `w × d × h` con su esquina de atrás abajo en (x, y, z), de
   * cantos biselados. `round` es el radio del bisel (por defecto, uno suave
   * según su tamaño); 0, cantos vivos.
   */
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    material: Shades | Ramp,
    round?: number,
  ): void {
    const r = Math.max(0, Math.min(round ?? 0.7, w / 3, d / 3, h / 3))

    this.rounded(x, y, z, w, d, h, r, material)
  }

  /** Una caja de cantos redondeados de radio `r` (un cojín, una maceta, un mueble blando). */
  rounded(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    r: number,
    material: Shades | Ramp,
    texture?: (
      face: 'top' | 'left' | 'right',
      u: number,
      v: number,
      height: number,
    ) => Color | null,
  ): void {
    const tones = tonesOf(material)
    const id = this.next++
    const [X, Y, Z] = [x + w, y + d, z + h]
    const [cx, cy, cz] = [x + w / 2, y + d / 2, z + h / 2]
    const [hx, hy, hz] = [w / 2 - r, d / 2 - r, h / 2 - r]
    // La distancia a la caja redondeada (negativa dentro); sin listas: se llama mucho.
    const field = ([px, py, pz]: Point): number => {
      const qx = Math.abs(px - cx) - hx
      const qy = Math.abs(py - cy) - hy
      const qz = Math.abs(pz - cz) - hz
      const ox = qx > 0 ? qx : 0
      const oy = qy > 0 ? qy : 0
      const oz = qz > 0 ? qz : 0

      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r
    }

    if (z < 0.5) this.ground.push([x, y, w, d])
    this.scan(cornersOf(x, y, z, X, Y, Z), (px, py, a, b) => {
      const lo = Math.max(x - a / 2, y + a / 2, z + b)
      const hi = Math.min(X - a / 2, Y + a / 2, Z + b)

      // Ya tapado por algo más cerca que lo más cerca de la caja: nada que hacer.
      if (lo > hi || this.hidden(px, py, 3 * hi - b)) return

      // Donde la recta entra en la caja: si cae en el llano de una cara (lejos
      // de los cantos), ahí está la superficie; solo cerca de un canto hace
      // falta buscarla paso a paso.
      {
        const p: Point = [a / 2 + hi, -a / 2 + hi, hi - b]
        const beyond =
          Number(Math.abs(p[0] - cx) > hx) +
          Number(Math.abs(p[1] - cy) > hy) +
          Number(Math.abs(p[2] - cz) > hz)

        if (r === 0 || beyond <= 1) {
          const normal = flatNormal(p, x, y, z, X, Y, Z)
          const face = normal[2] > 0.7 ? 'top' : normal[1] >= normal[0] ? 'left' : 'right'
          const own = texture?.(face, p[0] - x, p[1] - y, p[2] - z)
          const low = z < 0.5 && p[2] < 1 && normal[2] < 0.5 ? -0.5 : 0

          this.put(px, py, p[0] + p[1] + p[2], own ?? this.shade(tones, normal, low), id)

          return
        }
      }

      let s = hi + 0.01

      for (let step = 0; step < 48 && s >= lo - 0.01; step += 1) {
        const p: Point = [a / 2 + s, -a / 2 + s, s - b]
        const distance = r === 0 ? 0 : field(p)

        if (distance < 0.02) {
          const normal = r === 0 ? flatNormal(p, x, y, z, X, Y, Z) : gradient(field, p)
          const face = normal[2] > 0.7 ? 'top' : normal[1] >= normal[0] ? 'left' : 'right'
          const own = texture?.(face, p[0] - x, p[1] - y, p[2] - z)
          // Junto al suelo, un poco más oscuro: la sombra que cae al pie.
          const low = z < 0.5 && p[2] < 1 && normal[2] < 0.5 ? -0.5 : 0

          this.put(px, py, p[0] + p[1] + p[2], own ?? this.shade(tones, normal, low), id)

          return
        }
        s -= Math.max(distance / Math.sqrt(3), 0.02)
      }
    })
  }

  /** Un elipsoide de centro (cx, cy, cz) y semiejes rx, ry, rz: hojas, cojines, cabezas de lámpara. */
  blob(
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    material: Shades | Ramp,
  ): void {
    const tones = tonesOf(material)
    const id = this.next++

    if (cz - rz < 0.5) this.ground.push([cx - rx, cy - ry, 2 * rx, 2 * ry])
    this.scan(cornersOf(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz), (px, py, a, b) => {
      const p: Point = [a / 2 - cx, -a / 2 - cy, -b - cz]
      const q: Point = [1 / rx ** 2, 1 / ry ** 2, 1 / rz ** 2]
      const A = q[0] + q[1] + q[2]
      const B = 2 * (p[0] * q[0] + p[1] * q[1] + p[2] * q[2])
      const C = p[0] ** 2 * q[0] + p[1] ** 2 * q[1] + p[2] ** 2 * q[2] - 1
      const D = B * B - 4 * A * C

      if (D < 0) return

      const s = (-B + Math.sqrt(D)) / (2 * A)
      const w: Point = [a / 2 + s, -a / 2 + s, s - b]
      const normal = normalize([(w[0] - cx) * q[0], (w[1] - cy) * q[1], (w[2] - cz) * q[2]])

      this.put(px, py, w[0] + w[1] + w[2], this.shade(tones, normal), id)
    })
  }

  /** Un cilindro de pie de radio `r` entre `z0` y `z1`, con tapa: patas, tazas, macetas, lámparas. */
  cylinder(
    cx: number,
    cy: number,
    z0: number,
    z1: number,
    r: number,
    material: Shades | Ramp,
    top?: Color,
  ): void {
    const tones = tonesOf(material)
    const id = this.next++

    if (z0 < 0.5) this.ground.push([cx - r, cy - r, 2 * r, 2 * r])
    this.scan(cornersOf(cx - r, cy - r, z0, cx + r, cy + r, z1), (px, py, a, b) => {
      {
        const s = z1 + b
        const [wx, wy] = [a / 2 + s, -a / 2 + s]

        if ((wx - cx) ** 2 + (wy - cy) ** 2 <= r * r) {
          this.put(px, py, wx + wy + z1, top ?? this.shade(tones, [0, 0, 1]), id)

          return
        }
      }

      const p0 = a / 2 - cx
      const p1 = -a / 2 - cy
      const B = 2 * (p0 + p1)
      const C = p0 * p0 + p1 * p1 - r * r
      const D = B * B - 8 * C

      if (D < 0) return

      const s = (-B + Math.sqrt(D)) / 4
      const w: Point = [a / 2 + s, -a / 2 + s, s - b]

      if (w[2] < z0 || w[2] > z1) return

      const low = z0 < 0.5 && w[2] < 1 ? -0.5 : 0

      this.put(
        px,
        py,
        w[0] + w[1] + w[2],
        this.shade(tones, normalize([w[0] - cx, w[1] - cy, 0]), low),
        id,
      )
    })
  }

  /** Un rectángulo en el plano `y` fijo (lo que se ve en la cara izquierda de algo): pantallas, letreros. */
  faceY(y: number, x0: number, x1: number, z0: number, z1: number, color: Color): void {
    this.plane(1, y, [x0, x1], [z0, z1], () => color)
  }

  /** Un rectángulo en el plano `x` fijo: lo que se ve en la cara derecha. */
  faceX(x: number, y0: number, y1: number, z0: number, z1: number, color: Color): void {
    this.plane(0, x, [y0, y1], [z0, z1], () => color)
  }

  /** Un rectángulo en el plano `z` fijo: el suelo o lo de encima de algo. */
  faceZ(z: number, x0: number, x1: number, y0: number, y1: number, color: Color): void {
    this.plane(2, z, [x0, x1], [y0, y1], () => color)
  }

  /**
   * Un rectángulo plano pintado punto a punto: en el plano `axis` (0 `x`, 1
   * `y`, 2 `z`) igual a `at`, entre `[u0, u1]` y `[v0, v1]` de los otros dos
   * ejes (en orden), con el color que dé `paint(u, v)` o nada. Va pegado por
   * delante a lo que tenga detrás (un póster en una pared, la pantalla de un monitor).
   */
  plane(
    axis: 0 | 1 | 2,
    at: number,
    [u0, u1]: readonly [number, number],
    [v0, v1]: readonly [number, number],
    paint: (u: number, v: number) => Color | null,
  ): void {
    const id = this.next++
    const corners: Point[] =
      axis === 0
        ? cornersOf(at, u0, v0, at, u1, v1)
        : axis === 1
          ? cornersOf(u0, at, v0, u1, at, v1)
          : cornersOf(u0, v0, at, u1, v1, at)

    this.scan(corners, (px, py, a, b) => {
      const s = axis === 0 ? at - a / 2 : axis === 1 ? at + a / 2 : at + b
      const p: Point = [a / 2 + s, -a / 2 + s, s - b]
      const [u, v] = axis === 0 ? [p[1], p[2]] : axis === 1 ? [p[0], p[2]] : [p[0], p[1]]

      if (u < u0 - 1e-6 || u > u1 + 1e-6 || v < v0 - 1e-6 || v > v1 + 1e-6) return

      const color = paint(u, v)

      if (color !== null) this.put(px, py, p[0] + p[1] + p[2] + 0.15, color, id)
    })
  }

  /** Un punto de luz o un detalle pequeño en un punto del mundo (un LED, un ojo de mascota). */
  dot(x: number, y: number, z: number, color: Color): void {
    const [cx, cy] = this.project(x, y, z)
    const r = Math.max(1, this.scale / 2)
    const near = x + y + z + 0.3

    for (let j = 0; j < r; j += 1) {
      for (let i = 0; i < r; i += 1) {
        this.put(
          Math.floor(cx * this.scale - r / 2) + i,
          Math.floor(cy * this.scale - r / 2) + j,
          near,
          color,
          0,
        )
      }
    }
  }

  /**
   * Una figura plana de pie en (fx, fy, fz) del mundo (una persona): sus
   * píxeles (`w × h`, ya a la escala de este dibujo), con los pies en la
   * fila de abajo y centrada. Cada fila un poco más cerca cuanto más alta,
   * como si estuviera de pie: así una mesa delante le tapa las piernas y no la cabeza.
   */
  figure(
    pixels: readonly (Color | null)[],
    w: number,
    h: number,
    fx: number,
    fy: number,
    fz = 0,
  ): void {
    const id = this.next++
    const [sx, sy] = this.project(fx, fy, fz)

    if (fz < 0.5) this.ground.push([fx - 3, fy - 3, 6, 6])
    for (let j = 0; j < h; j += 1) {
      const rise = (h - j) / this.scale

      for (let i = 0; i < w; i += 1) {
        // Girado, la figura mira al otro lado.
        const color = pixels[j * w + (this.turned ? w - 1 - i : i)]

        if (color === null || color === undefined) continue
        this.put(
          Math.round(sx * this.scale - w / 2) + i,
          Math.round(sy * this.scale) - h + j,
          fx + fy + fz + 0.6 + rise,
          color,
          id,
        )
      }
    }
  }

  /**
   * Píxeles escritos a mano a partir de (x, y) del dibujo: una fila por cadena,
   * cada letra un color de `palette` y `.` transparente. Se agrandan con
   * Scale2x las veces que haga falta, para que las diagonales salgan suaves.
   */
  grid(
    rows: readonly string[],
    palette: Readonly<Record<string, Color>>,
    x: number,
    y: number,
  ): void {
    const width = Math.max(0, ...rows.map((row) => row.length))
    let cells = rows.map((row) => {
      const line = row.padEnd(width, '.').split('')

      return this.turned ? line.reverse() : line
    })
    let factor = 1

    while (factor * 2 <= this.scale) {
      cells = scale2x(cells)
      factor *= 2
    }

    const block = this.scale / factor
    const px = Math.floor(x) * this.scale
    const py = Math.floor(y) * this.scale

    cells.forEach((line, j) => {
      line.forEach((cell, i) => {
        const color = palette[cell]

        if (color === undefined) return
        for (let b = 0; b < block; b += 1) {
          for (let a = 0; a < block; a += 1)
            this.paint(px + i * block + a, py + j * block + b, color)
        }
      })
    })
  }

  /**
   * El acabado de un modelo, sin delineado: sombra entre piezas (donde algo
   * queda pegado detrás de otra cosa, un poco más oscuro) y la sombra de
   * contacto en el suelo bajo lo que lo toca, suave y transparente.
   */
  finish({ contact = true }: { contact?: boolean } = {}): this {
    const occlusion = this.occlusion()
    const shadow = contact ? this.contact() : []

    for (const [index, amount] of occlusion) {
      const color = this.pixels[index]

      if (color?.startsWith('#') === true) {
        this.pixels[index] = mixRgb(color, SHADOW, amount)
      }
    }
    for (const [index, alpha] of shadow) {
      this.pixels[index] = `rgba(${SHADOW.join(', ')}, ${alpha.toFixed(2)})`
    }

    return this
  }

  /**
   * Cuánto se oscurece cada píxel que tiene muy cerca otra pieza por delante:
   * un anillo de ocho muestras alrededor. Es lo que más se repite al dibujar,
   * así que va sin listas intermedias.
   */
  private occlusion(): [number, number][] {
    const out: [number, number][] = []
    const radius = Math.max(2, Math.round(this.scale * 1.25))
    const { pw, ph, ids, depth } = this
    const ring: number[] = []

    for (let k = 0; k < 8; k += 1) {
      ring.push(
        Math.round(Math.cos((k / 8) * Math.PI * 2) * radius),
        Math.round(Math.sin((k / 8) * Math.PI * 2) * radius * 0.75),
      )
    }

    for (let y = radius; y < ph - radius; y += 1) {
      for (let x = radius; x < pw - radius; x += 1) {
        const index = y * pw + x
        const id = ids[index] ?? 0

        if (id === 0) continue

        const near = depth[index] ?? 0
        let hidden = 0

        for (let k = 0; k < 16; k += 2) {
          const other = index + (ring[k + 1] ?? 0) * pw + (ring[k] ?? 0)
          const otherId = ids[other] ?? 0
          const gap = (depth[other] ?? OVER) - near

          if (otherId !== 0 && otherId !== id && gap > 0.6 && gap < 10) hidden += 1
        }
        if (hidden > 0) out.push([index, Math.min(1, (hidden / 8) * 2.2) * 0.26])
      }
    }

    return out
  }

  /**
   * La sombra en el suelo (z = 0) bajo lo que lo toca: bajo todo lo que toca
   * el suelo junto (las patas de una mesa, la mesa entera), más fuerte debajo
   * y que se desvanece fuera.
   */
  private contact(): [number, number][] {
    const out: [number, number][] = []

    if (this.ground.length === 0) return out

    const reach = 1.6
    const gx0 = Math.min(...this.ground.map(([gx]) => gx))
    const gy0 = Math.min(...this.ground.map(([, gy]) => gy))
    const gx1 = Math.max(...this.ground.map(([gx, , gw]) => gx + gw))
    const gy1 = Math.max(...this.ground.map(([, gy, , gd]) => gy + gd))
    // Solo el trozo de pantalla donde puede caer la sombra.
    const corners = [
      this.project(gx0 - reach, gy0 - reach, 0),
      this.project(gx1 + reach, gy0 - reach, 0),
      this.project(gx0 - reach, gy1 + reach, 0),
      this.project(gx1 + reach, gy1 + reach, 0),
    ]
    const fromX = Math.max(0, Math.floor(Math.min(...corners.map(([cx]) => cx)) * this.scale))
    const toX = Math.min(
      this.pw - 1,
      Math.ceil(Math.max(...corners.map(([cx]) => cx)) * this.scale),
    )
    const fromY = Math.max(0, Math.floor(Math.min(...corners.map(([, cy]) => cy)) * this.scale))
    const toY = Math.min(
      this.ph - 1,
      Math.ceil(Math.max(...corners.map(([, cy]) => cy)) * this.scale),
    )

    for (let py = fromY; py <= toY; py += 1) {
      for (let px = fromX; px <= toX; px += 1) {
        const index = py * this.pw + px

        if (this.pixels[index] !== null) continue

        const raw = (px + 0.5) / this.scale - this.ox
        const a = this.turned ? -raw : raw
        const s = (py + 0.5) / this.scale - this.oy
        const [wx, wy] = [a / 2 + s, -a / 2 + s]
        const dx = Math.max(gx0 - wx, 0, wx - gx1)
        const dy = Math.max(gy0 - wy, 0, wy - gy1)
        const away = Math.sqrt(dx * dx + dy * dy)

        if (away < reach) out.push([index, 0.22 * (1 - away / reach)])
      }
    }

    return out
  }

  /**
   * El contorno oscuro, solo para lo que es interfaz (los bocadillos): cada
   * píxel vacío que toca uno pintado.
   */
  outline(color: Color = INK): this {
    const edge: number[] = []

    for (let y = 0; y < this.ph; y += 1) {
      for (let x = 0; x < this.pw; x += 1) {
        if (this.at(x, y) !== null) continue
        if (
          (this.at(x, y + 1) ?? this.at(x - 1, y) ?? this.at(x + 1, y) ?? this.at(x, y - 1)) !==
          null
        ) {
          edge.push(y * this.pw + x)
        }
      }
    }
    for (const index of edge) this.pixels[index] = color

    return this
  }

  /** El rectángulo con algo pintado, en píxeles de verdad, `[x0, y0, x1, y1]` (incluidos), o `null` si está vacío. */
  bounds(): [number, number, number, number] | null {
    let x0 = this.pw
    let y0 = this.ph
    let x1 = -1
    let y1 = -1

    for (let y = 0; y < this.ph; y += 1) {
      const row = y * this.pw

      for (let x = 0; x < this.pw; x += 1) {
        if (this.pixels[row + x] === null) continue
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        y1 = y
      }
    }

    return x1 < 0 ? null : [x0, y0, x1, y1]
  }
}

/** Las ocho esquinas de una caja del mundo. */
function cornersOf(x: number, y: number, z: number, X: number, Y: number, Z: number): Point[] {
  return [
    [x, y, z],
    [X, y, z],
    [x, Y, z],
    [X, Y, z],
    [x, y, Z],
    [X, y, Z],
    [x, Y, Z],
    [X, Y, Z],
  ]
}

function normalize([x, y, z]: Point): Point {
  const length = Math.hypot(x, y, z) || 1

  return [x / length, y / length, z / length]
}

/** Hacia dónde mira una superficie dada por su campo de distancia, en un punto. */
function gradient(field: (p: Point) => number, [x, y, z]: Point): Point {
  const e = 0.05

  return normalize([
    field([x + e, y, z]) - field([x - e, y, z]),
    field([x, y + e, z]) - field([x, y - e, z]),
    field([x, y, z + e]) - field([x, y, z - e]),
  ])
}

/** La cara de una caja de cantos vivos en la que cae un punto de su superficie. */
function flatNormal(
  p: Point,
  x: number,
  y: number,
  z: number,
  X: number,
  Y: number,
  Z: number,
): Point {
  const gaps = [
    Math.abs(p[2] - Z),
    Math.abs(p[1] - Y),
    Math.abs(p[0] - X),
    Math.abs(p[0] - x),
    Math.abs(p[1] - y),
    Math.abs(p[2] - z),
  ]
  const nearest = gaps.indexOf(Math.min(...gaps))
  const normals: Point[] = [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ]

  return normals[nearest] ?? [0, 0, 1]
}

/**
 * De lo que mira hacia la luz (de -1 a 1) a un punto de la rampa (de 0 a 4):
 * la cara derecha (-0,43) cae en el tono 1, la izquierda (0,26) en el 2 y
 * arriba (0,86) en el 3; lo que mira de lleno a la luz, en el 4.
 */
function along(facing: number): number {
  const stops: readonly (readonly [number, number])[] = [
    [-1, 0],
    [-0.43, 1],
    [0.26, 2],
    [0.86, 3],
    [1, 4],
  ]

  for (let i = 1; i < stops.length; i += 1) {
    const [d1, p1] = stops[i] ?? [1, 4]
    const [d0, p0] = stops[i - 1] ?? [-1, 0]

    if (facing <= d1) return p0 + ((facing - d0) / (d1 - d0)) * (p1 - p0)
  }

  return 4
}

const tonesCache = new Map<string, readonly Color[]>()

/**
 * Los nueve tonos de un material: de una rampa, sus cinco y los de en medio;
 * de los tres tonos de siempre, una rampa con una sombra más honda (hacia el
 * violeta) y una luz más alta (hacia el amarillo).
 */
export function tonesOf(material: Shades | Ramp): readonly Color[] {
  const key = material.join()
  let tones = tonesCache.get(key)

  if (tones === undefined) {
    const ramp: readonly Color[] =
      material.length === 5
        ? material
        : [tint(material[2], -0.3), material[2], material[1], material[0], tint(material[0], 0.25)]

    tones = Array.from({ length: 9 }, (_, i) => {
      const at = i / 2
      const low = Math.floor(at)

      return mix(ramp[low] ?? '#000000', ramp[Math.min(4, low + 1)] ?? '#000000', at - low)
    })
    tonesCache.set(key, tones)
  }

  return tones
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
export function mix(color: Color, other: Color, amount: number): Color {
  const a = channels(color)
  const b = channels(other)

  return hex(a.map((part, index) => part + ((b[index] ?? 0) - part) * amount))
}

const mixRgb = (color: Color, rgb: readonly number[], amount: number): Color =>
  hex(channels(color).map((part, index) => part + ((rgb[index] ?? 0) - part) * amount))

/**
 * Más claro (`amount` > 0) o más oscuro: hacia un blanco cálido o un violeta
 * oscuro, no hacia el gris (las luces amarillean y las sombras azulean).
 */
const tint = (color: Color, amount: number): Color =>
  amount >= 0 ? mix(color, '#fff4d6', amount) : mix(color, '#2a1838', -amount)

/** Scale2x (EPX): cada celda, cuatro; las esquinas siguen a sus vecinas si coinciden. */
function scale2x(cells: readonly string[][]): string[][] {
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
