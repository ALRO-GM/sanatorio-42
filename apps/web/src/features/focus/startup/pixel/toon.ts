import type { Avatar, AvatarPart, Role } from '@sanatorio/startup'

import { UNIFORM } from './palette'
import { mix, tonesOf } from './sprite'
import type { Color, Ramp, Shades } from './sprite'

/**
 * Las personas de la startup: chibis de cabeza grande con aire de película de
 * animación (ojos almendrados con su brillo, cejas gruesas, nariz de botón,
 * pelo con volumen), sin delineado. Cada parte sale del aspecto (`Avatar`, el
 * configurador): piel, peinado, ojos, cejas, pecas, gafas, barba, ropa y
 * calzado, cada una con sus formas y colores de aquí.
 *
 * Se dibujan en un lienzo propio de 32 × 40 unidades (la figura mide media
 * baldosa de ancho), a `k` píxeles por unidad, y el motor la pone de pie en el
 * mundo (`Sprite.figure`).
 */

/** Lo que mide la figura en unidades de su lienzo. */
const TOON_WIDTH = 32
const TOON_HEIGHT = 40

/** Lo que lleva en las manos quien anda por la oficina. */
export type Carry = 'box' | 'mop' | 'wrench' | 'tray' | null

/** Una postura: el rebote, cada pierna (lo que sube y si va delante) y cada brazo (-1 atrás, 0, 1 o 2 delante). */
export type Pose = {
  bob: number
  legs: readonly { lift: number; fwd: number }[]
  arms: readonly [number, number]
  /** Sentada: sin piernas (las tapa la mesa). */
  seated?: boolean
}

export type Expression = 'contenta' | 'feliz' | 'concentrada'

const STILL: Pose = {
  bob: 0,
  legs: [
    { lift: 0, fwd: 0 },
    { lift: 0, fwd: 0 },
  ],
  arms: [0, 0],
}

/** El paso, en ocho fases: piernas que suben por turnos y brazos al revés. */
export const WALK: readonly Pose[] = [
  {
    bob: 0,
    legs: [
      { lift: 0, fwd: 1 },
      { lift: 1, fwd: 0 },
    ],
    arms: [-1, 2],
  },
  {
    bob: 1,
    legs: [
      { lift: 0, fwd: 1 },
      { lift: 2, fwd: 0 },
    ],
    arms: [-1, 1],
  },
  {
    bob: 0,
    legs: [
      { lift: 0, fwd: 0 },
      { lift: 3, fwd: 0 },
    ],
    arms: [0, 0],
  },
  {
    bob: -1,
    legs: [
      { lift: 0, fwd: 0 },
      { lift: 1, fwd: 1 },
    ],
    arms: [1, -1],
  },
  {
    bob: 0,
    legs: [
      { lift: 1, fwd: 0 },
      { lift: 0, fwd: 1 },
    ],
    arms: [2, -1],
  },
  {
    bob: 1,
    legs: [
      { lift: 2, fwd: 0 },
      { lift: 0, fwd: 1 },
    ],
    arms: [1, -1],
  },
  {
    bob: 0,
    legs: [
      { lift: 3, fwd: 0 },
      { lift: 0, fwd: 0 },
    ],
    arms: [0, 0],
  },
  {
    bob: -1,
    legs: [
      { lift: 1, fwd: 1 },
      { lift: 0, fwd: 0 },
    ],
    arms: [-1, 1],
  },
]

/** Sentada tecleando: dos fases con las manos hacia delante. */
export const SEATED: readonly Pose[] = [
  { bob: 0, legs: [], arms: [1, 1], seated: true },
  { bob: 0, legs: [], arms: [2, 1], seated: true },
]

export { STILL }

// --- El catálogo: el orden es el de `AVATAR_PARTS` (`@sanatorio/startup`). ---

const r = (...tones: [Color, Color, Color, Color, Color]): Ramp => tones

const SKINS: readonly Ramp[] = [
  r('#8a4a48', '#cc8670', '#f0bc9c', '#fad8be', '#fff0e2'),
  r('#8a4e44', '#c88a6c', '#ecc0a0', '#f8dcc2', '#fff2e4'),
  r('#7a4038', '#b8785c', '#e0a880', '#f2c8a2', '#fde4c8'),
  r('#6a3430', '#a86450', '#d49870', '#ecbc94', '#fadcbc'),
  r('#5a2e28', '#94583e', '#c08458', '#dca87a', '#f2cca0'),
  r('#4a2620', '#7e4a34', '#a8704c', '#c8946a', '#e2b88e'),
  r('#3a1e20', '#6a3a30', '#9a6044', '#c08460', '#dcaa84'),
  r('#2a1418', '#4e2a24', '#764634', '#9a6448', '#bc8664'),
]

const HAIR_COLORS: readonly Ramp[] = [
  r('#24120c', '#4a2616', '#7a4226', '#a8663a', '#d8985e'),
  r('#0e0a14', '#1e1828', '#30283e', '#4a405a', '#6e6482'),
  r('#3a0e0a', '#7a2214', '#b8401e', '#e06a32', '#f8a466'),
  r('#5a3414', '#a06a26', '#d8a040', '#f0cc6a', '#fff0a8'),
  r('#2e1a10', '#5a3420', '#8a5434', '#b47a4e', '#dca476'),
  r('#3a3a48', '#6a6a7e', '#a0a0b4', '#cfcfdc', '#f4f4fa'),
  r('#3a0e2a', '#7a1e52', '#c03a7e', '#ec78ac', '#ffbcd6'),
  r('#0e2a4a', '#1e4a8a', '#3a74c8', '#6aa4ee', '#b0d4ff'),
  r('#0e3a2a', '#1e6a4a', '#3a9a6a', '#6ac894', '#b4ecc8'),
  r('#2a1450', '#4e2a8a', '#7a48c8', '#a87ae8', '#d4b4ff'),
]

/** Los ojos: borde, tono de arriba, medio y abajo. */
const EYE_COLORS: readonly (readonly [Color, Color, Color, Color])[] = [
  ['#1e0e08', '#5a3018', '#94602e', '#d0a070'],
  ['#123a26', '#2a7a4a', '#5ab872', '#a8e8a8'],
  ['#0e1e4a', '#2456a8', '#4a92e0', '#a8d4ff'],
  ['#3a1e08', '#8a5418', '#d0902e', '#f8d078'],
  ['#1e2a2a', '#3e5a5a', '#6a8e8e', '#b0d0cc'],
  ['#2a1040', '#5a2a8a', '#9a5ad0', '#d4b0f4'],
]

const CLOTHES: readonly Ramp[] = [
  r('#5a3a1a', '#a8682a', '#e0a23e', '#f4c862', '#fde6a0'),
  r('#1a3a2e', '#2e6a4a', '#4f9a62', '#86c27a', '#c2e6a2'),
  r('#2e1f4a', '#55408a', '#8a6ac2', '#b69ae0', '#e0d0f6'),
  r('#5a1e2a', '#a83e3e', '#e0654e', '#f4987a', '#ffd0b8'),
  r('#16203e', '#283e6e', '#3e62a0', '#6a90c8', '#a8c4e8'),
  r('#8a8aa0', '#bcbcd0', '#e8e8f0', '#f8f8fc', '#ffffff'),
  r('#2a2a34', '#4a4a58', '#707082', '#9a9aac', '#c8c8d6'),
  r('#0e2a3a', '#1a5060', '#2e8090', '#5ab4c0', '#a4e0e4'),
  r('#4a1a3a', '#8a2e64', '#c4508e', '#e884b4', '#fcc4dc'),
  r('#2a160e', '#4a2a1a', '#6e4028', '#94603c', '#bc8a5e'),
  r('#3a3410', '#6a6224', '#9c943e', '#c8c068', '#ece6a8'),
  r('#0e0e16', '#1a1a26', '#2a2a3a', '#40405a', '#5e5e7e'),
]

/** Los colores de la ropa de arriba (los doce), de abajo (los diez primeros) y del calzado. */
const TOP_COLORS: readonly Ramp[] = CLOTHES
const BOTTOM_COLORS: readonly Ramp[] = [
  CLOTHES[4],
  CLOTHES[6],
  CLOTHES[11],
  CLOTHES[9],
  CLOTHES[10],
  CLOTHES[1],
  CLOTHES[3],
  CLOTHES[2],
  CLOTHES[5],
  CLOTHES[7],
].map((ramp) => ramp ?? r('#16203e', '#283e6e', '#3e62a0', '#6a90c8', '#a8c4e8'))
const SHOE_COLORS: readonly Ramp[] = [
  CLOTHES[5],
  CLOTHES[11],
  CLOTHES[9],
  CLOTHES[3],
  CLOTHES[4],
  CLOTHES[0],
].map((ramp) => ramp ?? r('#8a8aa0', '#bcbcd0', '#e8e8f0', '#f8f8fc', '#ffffff'))

/** El color de muestra de una opción de color del configurador (`null` si la parte es de formas). */
export function swatchOf(part: AvatarPart, option: number): Color | null {
  const ramps: Partial<Record<AvatarPart, readonly (readonly Color[])[]>> = {
    skin: SKINS,
    hairColor: HAIR_COLORS,
    eyeColor: EYE_COLORS,
    topColor: TOP_COLORS,
    bottomColor: BOTTOM_COLORS,
    shoesColor: SHOE_COLORS,
  }
  const ramp = ramps[part]?.[option]

  return ramp === undefined ? null : (ramp[2] ?? null)
}

/** Lo que lleva en la cabeza cada oficio, si algo. */
const HATS: Partial<Record<Role, 'cap' | 'chef' | 'helmet'>> = {
  delivery: 'cap',
  security: 'cap',
  kitchen: 'chef',
  maintenance: 'helmet',
}

/** La prenda del uniforme de cada oficio (la del aspecto, si no). */
const UNIFORM_TOP: Partial<Record<Role, number>> = {
  reception: 4,
  kitchen: 1,
  security: 4,
  delivery: 3,
  cleaning: 3,
  maintenance: 2,
}

const LID = '#3a1e1e'
const MOUTH_IN = '#6a1e2a'
const TONGUE = '#e0707a'
const LIP = '#b85a5a'
const CHEEK = '#f08a84'

/** El lienzo de la figura: píxeles a `k` por unidad, con transparencia para el rubor. */
class Paper {
  readonly w: number
  readonly h: number
  readonly pixels: (Color | null)[]

  constructor(readonly k: number) {
    this.w = Math.round(TOON_WIDTH * k)
    this.h = Math.round(TOON_HEIGHT * k)
    this.pixels = new Array<Color | null>(this.w * this.h).fill(null)
  }

  /**
   * Pinta donde `fn(x, y)` (en unidades, centro del píxel) da color; `alpha`
   * mezcla con lo de debajo. Con `box` (`[x0, y0, x1, y1]` en unidades), solo
   * ahí: lo que más cuesta es recorrer el lienzo entero por cada forma.
   */
  paint(
    fn: (x: number, y: number) => Color | null,
    alpha = 1,
    box?: readonly [number, number, number, number],
  ): void {
    const [fromX, fromY, toX, toY] =
      box === undefined
        ? [0, 0, this.w - 1, this.h - 1]
        : [
            Math.max(0, Math.floor(box[0] * this.k)),
            Math.max(0, Math.floor(box[1] * this.k)),
            Math.min(this.w - 1, Math.ceil(box[2] * this.k)),
            Math.min(this.h - 1, Math.ceil(box[3] * this.k)),
          ]

    for (let py = fromY; py <= toY; py += 1) {
      for (let px = fromX; px <= toX; px += 1) {
        const color = fn((px + 0.5) / this.k, (py + 0.5) / this.k)

        if (color === null) continue

        const index = py * this.w + px
        const below = this.pixels[index]

        this.pixels[index] =
          alpha >= 1 || below === null || below === undefined ? color : mix(below, color, alpha)
      }
    }
  }
}

type Tones = readonly Color[]

/** El tono de un volumen redondo con luz de arriba a la izquierda (`nx`, `ny` de -1 a 1). */
function lit(tones: Tones, nx: number, ny: number, lift = 0): Color {
  const light = -nx * 0.5 - ny * 0.7 + (1 - Math.min(1, nx * nx + ny * ny)) * 0.5 + lift
  const index = Math.round(((light + 1.1) / 2.2) * (tones.length - 1))

  return tones[Math.max(0, Math.min(tones.length - 1, index))] ?? '#000000'
}

const inside = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

function near(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
): boolean {
  const [dx, dy] = [bx - ax, by - ay]
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))

  return Math.hypot(ax + dx * t - x, ay + dy * t - y) < w
}

function oval(
  paper: Paper,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tones: Tones,
  keep?: (x: number, y: number) => boolean,
  lift = 0,
): void {
  paper.paint(
    (x, y) =>
      inside(x, y, cx, cy, rx, ry) && (keep?.(x, y) ?? true)
        ? lit(tones, (x - cx) / rx, (y - cy) / ry, lift)
        : null,
    1,
    [cx - rx, cy - ry, cx + rx, cy + ry],
  )
}

const flat = (
  paper: Paper,
  test: (x: number, y: number) => boolean,
  color: Color,
  alpha = 1,
): void => {
  paper.paint((x, y) => (test(x, y) ? color : null), alpha)
}

function capsule(
  paper: Paper,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
  tones: Tones,
): void {
  paper.paint(
    (x, y) => {
      const [dx, dy] = [bx - ax, by - ay]
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
      const [px, py] = [ax + dx * t - x, ay + dy * t - y]

      return Math.hypot(px, py) > radius ? null : lit(tones, -px / radius, -0.1 + t * 0.3)
    },
    1,
    [
      Math.min(ax, bx) - radius,
      Math.min(ay, by) - radius,
      Math.max(ax, bx) + radius,
      Math.max(ay, by) + radius,
    ],
  )
}

const at = <T>(list: readonly T[], index: number): T =>
  list[((index % list.length) + list.length) % list.length] as T

/** Quién y cómo se dibuja. */
export type ToonSpec = {
  avatar: Avatar
  role?: Role | undefined
  pose?: Pose | undefined
  back?: boolean | undefined
  blink?: boolean | undefined
  expression?: Expression | undefined
  carry?: Carry | undefined
  /** La luz azulada de una pantalla delante: más en la cara, menos al bajar. */
  glow?: boolean | undefined
  /** Píxeles por unidad del lienzo de la figura. */
  k: number
}

type Toon = { pixels: readonly (Color | null)[]; w: number; h: number }

/** El azul de la luz de una pantalla (`glow`), el mismo que en `light.ts`. */
const SCREEN_LIGHT = '#96beff'

const drawn = new Map<string, Toon>()

/** La figura, dibujada una vez por cada combinación y guardada. */
export function toonOf(spec: ToonSpec): Toon {
  const key = JSON.stringify(spec)
  let found = drawn.get(key)

  if (found === undefined) {
    if (drawn.size > 600) drawn.clear()
    found = drawToon(spec)
    drawn.set(key, found)
  }

  return found
}

function drawToon({
  avatar,
  role,
  pose = STILL,
  back = false,
  blink = false,
  expression = 'contenta',
  carry = null,
  glow = false,
  k,
}: ToonSpec): Toon {
  const paper = new Paper(k)
  const uniform = role === undefined ? undefined : UNIFORM[role]
  const skin = tonesOf(at(SKINS, avatar.skin))
  const hair = tonesOf(at(HAIR_COLORS, avatar.hairColor))
  const top = tonesOf(uniform ?? at(TOP_COLORS, avatar.topColor))
  const bottom = tonesOf(at(BOTTOM_COLORS, avatar.bottomColor))
  const shoe = tonesOf(at(SHOE_COLORS, avatar.shoesColor))
  const topKind = (role === undefined ? undefined : UNIFORM_TOP[role]) ?? avatar.top
  const bob = pose.bob * 0.5
  const cx = TOON_WIDTH / 2
  const hy = 15.2 + bob
  const [rx, ry] = [9.4, 8.8]
  const footY = 38.6
  const hipY = 33 + bob
  const shY = 24.6 + bob
  const cut = avatar.hair
  const hat = role === undefined ? undefined : HATS[role]

  // Pelo de detrás (de frente asoma por los lados; de espaldas, se ve entero).
  if (cut === 0 || cut === 7 || cut === 4) {
    const length = cut === 7 ? 15.5 : 10.5

    paper.paint((x, y) => {
      const t = (y - hy) / length

      if (t < -0.2 || t > 1.05) return null

      const half =
        rx *
        (1.12 + Math.sin(Math.min(1, Math.max(0, t)) * Math.PI * 0.8) * (cut === 7 ? 0.06 : 0.12))
      const u = (x - cx) / half

      if (Math.abs(u) > 1) return null

      const end = 1 - (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 0.35 + Math.cos(u * 9) * 0.02

      return t > end ? null : lit(hair, u, 0.3 + t * 0.3, -0.25)
    })
  }
  if (cut === 3) {
    for (let a = 0; a < 16; a += 1) {
      const t = Math.PI * (0.8 + (a / 15) * 1.4)

      oval(paper, cx + Math.cos(t) * 10, hy - 0.6 + Math.sin(t) * 9.4, 2.8, 2.8, hair)
    }
  }
  if (cut === 5 && !back) oval(paper, cx + 9.8, hy + 4, 2.4, 5.6, hair, undefined, -0.1)
  if (cut === 4 && !back) {
    for (let i = 0; i < 5; i += 1)
      oval(paper, cx + 9.4 + Math.sin(i) * 0.4, hy + 3 + i * 2.4, 2 - i * 0.12, 1.5, hair)
  }

  // Piernas y calzado.
  if (pose.seated !== true) {
    pose.legs.forEach((leg, index) => {
      const side = index === 0 ? -1 : 1
      const hx = cx + side * 2.1
      const fy = footY - 0.5 - Math.min(leg.lift, 2) * 0.55
      const bare = avatar.bottom === 2 || avatar.bottom === 3

      capsule(paper, hx, hipY - 1, hx, fy - 0.6, 1.5, bare ? skin : bottom)
      // Vaqueros: costura clara por fuera y el bajo vuelto; pantalón: la raya en medio.
      if (avatar.bottom === 0) {
        flat(
          paper,
          (x, y) => Math.abs(x - hx - side * 1.05) < 0.2 && y > hipY && y < fy - 1.6,
          bottom[6] ?? '#ffffff',
          0.7,
        )
        flat(
          paper,
          (x, y) => Math.abs(x - hx) < 1.5 && Math.abs(y - (fy - 1.6)) < 0.35,
          bottom[6] ?? '#ffffff',
        )
      }
      if (avatar.bottom === 1)
        flat(
          paper,
          (x, y) => Math.abs(x - hx) < 0.16 && y > hipY && y < fy - 1,
          bottom[2] ?? '#000000',
        )
      if (avatar.shoes === 1) capsule(paper, hx, fy - 2.6, hx, fy - 0.4, 1.7, shoe)
      oval(
        paper,
        hx + side * 0.5,
        fy,
        avatar.shoes === 2 ? 2.1 : 2.3,
        avatar.shoes === 2 ? 1.2 : 1.4,
        shoe,
      )
      if (avatar.shoes === 0)
        flat(
          paper,
          (x, y) => inside(x, y, hx + side * 0.5, fy, 2.3, 1.4) && y > fy + 0.75,
          '#f4f0ec',
        )
    })
  }

  // Abajo: falda o pantalón corto por encima de las piernas.
  if (pose.seated !== true && (avatar.bottom === 2 || avatar.bottom === 3)) {
    const long = avatar.bottom === 2 ? 4.2 : 2.6

    paper.paint((x, y) => {
      const t = (y - hipY + 1.2) / long

      if (t < 0 || t > 1) return null

      const half = 4.8 + t * (avatar.bottom === 2 ? 2 : 0.6)

      return Math.abs(x - cx) < half && !(avatar.bottom === 3 && Math.abs(x - cx) < 0.4 && t > 0.4)
        ? lit(bottom, (x - cx) / half, t - 0.5)
        : null
    })
  }

  // El tronco: hombros redondos y cintura.
  paper.paint((x, y) => {
    const t = (y - shY) / (hipY - shY + 0.4)

    if (t < 0 || t > 1) return null

    const half = 5 - Math.sin(t * Math.PI) * 0.5 + t * 0.4 - (t < 0.15 ? (0.15 - t) * 9 : 0)

    return Math.abs(x - cx) < half ? lit(top, (x - cx) / half, t * 1.4 - 0.7) : null
  })
  flat(
    paper,
    (x, y) => Math.abs(y - hipY + 0.3) < 0.45 && Math.abs(x - cx) < 4.8,
    top[3] ?? '#000000',
  )
  if (!back) clothesFront(paper, topKind, top, cx, shY, hipY)
  else if (topKind === 2) oval(paper, cx, shY + 0.6, 3.6, 1.8, top, undefined, 0.2)
  else if (topKind === 1) flat(paper, (x, y) => inside(x, y, cx, shY + 0.2, 3, 1.2), '#f8f8fc')

  // Brazos: manga, y en camiseta, el brazo al aire.
  pose.arms.forEach((swing, index) => {
    const side = index === 0 ? -1 : 1
    const [sx, sy] = [cx + side * 4.3, shY + 1.4]
    const ex = sx + side * (1.3 - (swing > 0 ? 1 : 0))
    const ey = sy + 5 - (swing < 0 ? 1 : 0)

    if (topKind === 3) {
      capsule(paper, sx, sy, ex, ey, 1.3, skin)
      capsule(paper, sx, sy, sx + (ex - sx) * 0.35, sy + (ey - sy) * 0.35, 1.55, top)
    } else capsule(paper, sx, sy, ex, ey, 1.45, top)
    oval(paper, ex + side * 0.1, ey + 1.3, 1.25, 1.35, skin)
  })

  // El cuello y la cabeza: mofletes llenos y barbilla pequeña.
  capsule(paper, cx, shY - 1.6, cx, shY + 0.2, 1.4, skin)

  const face = (x: number, y: number): boolean => {
    const nx = (x - cx) / rx

    if (y <= hy) return nx * nx + ((y - hy) / ry) ** 2 <= 1

    const ny = (y - hy) / (ry - 0.6)
    const half = Math.sqrt(Math.max(0, 1 - ny * ny)) * (1 - ny * ny * 0.18) * rx

    return Math.abs(x - cx) <= half
  }

  paper.paint((x, y) => (face(x, y) ? lit(skin, (x - cx) / rx, (y - hy) / ry, 0.2) : null))
  for (const side of [-1, 1]) {
    oval(paper, cx + side * (rx + 0.1), hy + 1.6, 1.1, 1.6, skin)
    flat(
      paper,
      (x, y) => inside(x, y, cx + side * (rx + 0.2), hy + 1.6, 0.4, 0.8),
      skin[3] ?? '#000000',
    )
  }

  if (back) hairBack(paper, cut, hair, skin, cx, hy, rx, ry)
  else {
    hairFront(paper, cut, hair, cx, hy, rx, ry)
    faceOf(paper, avatar, skin, hair, cx, hy, blink, expression)
  }
  if (hat !== undefined)
    hatOf(paper, hat, uniform ?? (['#ffffff', '#eceaf2', '#c9c5d6'] as Shades), cx, hy, rx, ry)
  carryOf(paper, carry, cx, shY, back)

  const pixels = glow
    ? paper.pixels.map((color, index) => {
        if (color === null) return null

        // De la cabeza (arriba) a la cintura, cada vez menos.
        const fade = Math.max(0, 1 - (Math.floor(index / paper.w) / paper.h) * 1.4)

        return mix(color, SCREEN_LIGHT, 0.3 * fade)
      })
    : paper.pixels

  return { pixels, w: paper.w, h: paper.h }
}

/** Lo de delante de cada prenda de arriba: cuello, cuello de camisa, capucha, solapas. */
function clothesFront(
  paper: Paper,
  kind: number,
  top: Tones,
  cx: number,
  shY: number,
  hipY: number,
): void {
  const light = top[6] ?? '#ffffff'
  const dark = top[2] ?? '#000000'

  switch (kind) {
    case 0:
      flat(paper, (x, y) => inside(x, y, cx, shY + 0.4, 2.4, 1.3) && y > shY + 0.2, top[3] ?? dark)
      break
    case 1:
      flat(
        paper,
        (x, y) =>
          near(x, y, cx, shY + 2.2, cx - 2.2, shY + 0.2, 0.75) ||
          near(x, y, cx, shY + 2.2, cx + 2.2, shY + 0.2, 0.75),
        '#f8f8fc',
      )
      for (const dy of [3.6, 5.6, 7.4])
        flat(paper, (x, y) => inside(x, y, cx, shY + dy, 0.32, 0.32), light)
      break
    case 2:
      oval(paper, cx, shY + 0.4, 3.8, 1.6, top, (_, y) => y > shY - 0.4, 0.25)
      flat(
        paper,
        (x, y) =>
          near(x, y, cx - 1, shY + 1.4, cx - 1.2, shY + 3.8, 0.18) ||
          near(x, y, cx + 1, shY + 1.4, cx + 1.2, shY + 3.8, 0.18),
        '#f8f8fc',
      )
      flat(paper, (x, y) => inside(x, y, cx, hipY - 2.6, 3.2, 1.4) && y > hipY - 3.2, dark)
      break
    case 3:
      flat(paper, (x, y) => inside(x, y, cx, shY + 0.4, 2.2, 1.1) && y > shY + 0.2, top[3] ?? dark)
      break
    default:
      flat(paper, (x, y) => Math.abs(x - cx) < 1.6 && y > shY + 0.2 && y < hipY, '#f4f0ea')
      flat(
        paper,
        (x, y) =>
          near(x, y, cx - 1.7, shY + 0.4, cx - 1.4, hipY, 0.3) ||
          near(x, y, cx + 1.7, shY + 0.4, cx + 1.4, hipY, 0.3),
        dark,
      )
      flat(
        paper,
        (x, y) =>
          near(x, y, cx - 1.6, shY + 0.4, cx - 3, shY + 3, 0.5) ||
          near(x, y, cx + 1.6, shY + 0.4, cx + 3, shY + 3, 0.5),
        top[3] ?? dark,
      )
  }
}

/** El pelo de delante: casquete y flequillo de cada peinado. */
function hairFront(
  paper: Paper,
  cut: number,
  hair: Tones,
  cx: number,
  hy: number,
  rx: number,
  ry: number,
): void {
  const capOf = (x: number, y: number): boolean => inside(x, y, cx, hy - 1.4, rx * 1.12, ry * 1.06)
  const sides = (x: number, y: number, depth: number): boolean =>
    Math.abs(x - cx) > rx * 0.82 && inside(x, y, cx, hy, rx * 1.12, ry * 1.04) && y < hy + depth
  let inHair: (x: number, y: number) => boolean

  switch (cut) {
    case 0:
    case 4: {
      // Un mechón grande barre la frente y acaba en curva.
      const sweep = (x: number): number => {
        const u = (x - cx) / rx

        return hy - 5.4 + (u + 1) * 2.4 + Math.sin((u + 1) * 2.2) * 0.9
      }

      inHair = (x, y) =>
        (capOf(x, y) && y < sweep(x)) ||
        (x - cx > rx * 0.66 && inside(x, y, cx, hy, rx * 1.12, ry * 1.04) && y < hy + 3.4) ||
        sides(x, y, 1)
      break
    }
    case 2:
      inHair = (x, y) =>
        (inside(x, y, cx, hy - 1.6, rx * 1.08, ry * 1.02) &&
          y < hy - 4.2 + Math.sin((x - cx) * 0.5) * 0.6) ||
        inside(x, y, cx - 1.6, hy - 9.6, 6.4, 3.4) ||
        sides(x, y, 0.6)
      break
    case 3:
      inHair = (x, y) =>
        inside(x, y, cx, hy - 1.6, rx * 1.1, ry * 1.04) &&
        y < hy - 4 + Math.abs(Math.sin((x - cx) * 0.55)) * 1.2
      break
    case 7:
      // Raya en medio: dos cortinas que bajan a los lados.
      inHair = (x, y) => (capOf(x, y) && y < hy - 4.4 + Math.abs(x - cx) * 0.5) || sides(x, y, 5)
      break
    case 8:
      inHair = (x, y) => inside(x, y, cx, hy - 0.6, rx * 1.03, ry * 1.0) && y < hy - 5.2
      break
    default:
      // Corto, coleta y moño: un flequillo suave y ondulado.
      inHair = (x, y) =>
        (capOf(x, y) && y < hy - 4.6 + Math.sin((x - cx) * 0.7) * 0.7) || sides(x, y, 0.8)
  }

  const tones = cut === 8 ? hair.map((color) => mix(color, '#c8a088', 0.25)) : hair

  paper.paint((x, y) =>
    inHair(x, y) ? lit(tones, (x - cx) / rx, (y - hy + 1.4) / ry, 0.05) : null,
  )
  if (cut === 3)
    for (let a = 0; a < 7; a += 1)
      oval(paper, cx - 7 + a * 2.3, hy - 5 + Math.sin(a * 1.7) * 0.6, 1.8, 1.6, hair)
  if (cut === 6) oval(paper, cx + 0.6, hy - 10.6, 3.6, 3, hair)
  if (cut === 5) flat(paper, (x, y) => inside(x, y, cx + 8.6, hy - 1, 1, 0.7), '#e0654e')
  // Volumen: un par de mechones en tono más oscuro y un brillo ancho y suave.
  if (cut !== 8) {
    flat(
      paper,
      (x, y) =>
        inHair(x, y) &&
        (near(x, y, cx - 2, hy - 9.4, cx + 3.8, hy - 2.2, 0.3) ||
          near(x, y, cx - 6.4, hy - 6.8, cx - 3, hy - 3.4, 0.28)),
      hair[3] ?? '#000000',
      0.6,
    )
    flat(
      paper,
      (x, y) =>
        inHair(x, y) &&
        Math.abs(Math.hypot((x - cx + 1) / 7.4, (y - hy + 2) / 6.4) - 1) < 0.09 &&
        x < cx + 3 &&
        y < hy - 4,
      hair[7] ?? '#ffffff',
      0.8,
    )
  }
}

/** De espaldas: la cabeza, pelo; con el pelo muy corto, asoma la nuca. */
function hairBack(
  paper: Paper,
  cut: number,
  hair: Tones,
  skin: Tones,
  cx: number,
  hy: number,
  rx: number,
  ry: number,
): void {
  const nape = cut === 1 || cut === 2 || cut === 8 ? hy + 3 : hy + ry
  const tones = cut === 8 ? hair.map((color) => mix(color, skin[4] ?? color, 0.25)) : hair

  paper.paint((x, y) =>
    inside(x, y, cx, hy - 0.8, rx * 1.1, ry * 1.08) && y < nape
      ? lit(tones, (x - cx) / rx, (y - hy) / ry, -0.1)
      : null,
  )
  if (cut === 3)
    for (let a = 0; a < 9; a += 1)
      oval(paper, cx - 8 + a * 2, hy + 6 + Math.sin(a * 1.3) * 0.6, 1.8, 1.8, hair)
  if (cut === 5) capsule(paper, cx, hy + 2, cx + 0.4, hy + 12, 2.2, hair)
  if (cut === 4)
    for (let i = 0; i < 6; i += 1)
      oval(paper, cx + Math.sin(i) * 0.4, hy + 4 + i * 2.2, 2 - i * 0.12, 1.5, hair)
  if (cut === 6) oval(paper, cx, hy - 9.6, 3.6, 3, hair)
  flat(
    paper,
    (x, y) =>
      inside(x, y, cx, hy - 0.8, rx * 1.1, ry * 1.08) &&
      y < nape &&
      Math.abs(Math.hypot((x - cx + 1) / 7, (y - hy + 1) / 6.2) - 1) < 0.09 &&
      y < hy - 3,
    hair[7] ?? '#ffffff',
    0.7,
  )
}

/** La cara: ojos, cejas, nariz, boca, mofletes y lo que lleve (pecas, gafas, barba). */
function faceOf(
  paper: Paper,
  avatar: Avatar,
  skin: Tones,
  hair: Tones,
  cx: number,
  hy: number,
  blink: boolean,
  expression: Expression,
): void {
  const ey = hy + 1.3
  const iris = at(EYE_COLORS, avatar.eyeColor)
  const kind = blink
    ? 'closed'
    : expression === 'feliz'
      ? 'smile'
      : expression === 'concentrada'
        ? 'focus'
        : 'open'

  for (const side of [-1, 1] as const)
    eye(paper, cx + side * 4.3, ey, side, kind, avatar.eyes, iris, skin)

  // Cejas del color del pelo, que se afilan hacia fuera.
  const [thick, arch] = at(
    [
      [0.5, 0.55],
      [0.28, 0.4],
      [0.4, 1],
    ] as const,
    avatar.brows,
  )

  for (const side of [-1, 1]) {
    const bx = cx + side * 4.3
    const lift = expression === 'feliz' ? -0.5 : expression === 'concentrada' ? 0.5 : 0
    const by = ey - 4.1 + lift
    const inner = expression === 'concentrada' ? 0.5 : 0.15

    paper.paint((x, y) => {
      const t = ((x - (bx - side * 1.8)) * side) / 3.6

      if (t < 0 || t > 1) return null

      const line = by + inner * (1 - t) - Math.sin(t * Math.PI) * arch

      return Math.abs(y - line) < thick - t * thick * 0.5 ? (hair[2] ?? '#000000') : null
    })
  }

  // Nariz de botón: sombra abajo y un brillo.
  flat(
    paper,
    (x, y) => inside(x, y, cx + 0.2, ey + 3.4, 0.9, 0.42) && y > ey + 3.4,
    skin[3] ?? '#000000',
  )
  flat(paper, (x, y) => inside(x, y, cx - 0.2, ey + 2.8, 0.32, 0.28), skin[8] ?? '#ffffff')

  // Barba (antes que la boca, que asoma).
  const beard = hair[2] ?? '#000000'

  if (avatar.beard === 1)
    flat(
      paper,
      (x, y) =>
        y > ey + 3.6 &&
        Math.abs(x - cx) < 7.2 - (y - ey - 3.6) * 0.6 &&
        y < hy + 8.2 &&
        Math.abs(x - cx) > (y < ey + 6 ? 2.6 : 0),
      beard,
      0.9,
    )
  if (avatar.beard === 3) flat(paper, (x, y) => inside(x, y, cx, hy + 7.4, 1.6, 1.1), beard, 0.95)

  const my = ey + 5.1

  if (expression === 'feliz') {
    paper.paint((x, y) => {
      const u = (x - cx) / 2.7

      if (
        Math.abs(u) > 1 ||
        y < my - 0.9 - u * u * 0.3 ||
        y > my - 0.9 + 2.6 * Math.sqrt(1 - u * u)
      )
        return null

      return y < my - 0.2 ? '#ffffff' : y > my + 0.6 ? TONGUE : MOUTH_IN
    })
  } else if (expression === 'concentrada') {
    flat(paper, (x, y) => near(x, y, cx - 0.9, my, cx + 0.9, my, 0.25), LIP)
  } else {
    flat(
      paper,
      (x, y) =>
        Math.abs(x - cx) < 2.3 &&
        Math.abs(y - (my - 0.4 + (1 - ((x - cx) / 2.3) ** 2) * 0.6)) < 0.28,
      LIP,
    )
    flat(paper, (x, y) => inside(x, y, cx, my + 0.6, 0.8, 0.25), skin[3] ?? '#000000')
  }
  if (avatar.beard === 2)
    flat(
      paper,
      (x, y) =>
        inside(x, y, cx - 1.3, my - 0.9, 1.6, 0.6) || inside(x, y, cx + 1.3, my - 0.9, 1.6, 0.6),
      beard,
    )

  // Mofletes rosados, suaves; pecas; gafas.
  for (const side of [-1, 1])
    flat(paper, (x, y) => inside(x, y, cx + side * 6, ey + 3.2, 1.8, 1), CHEEK, 0.3)
  if (avatar.freckles === 1) {
    for (const side of [-1, 1]) {
      for (const [dx, dy] of [
        [0, 0],
        [0.9, 0.4],
        [-0.5, 0.7],
        [0.4, -0.4],
      ] as const) {
        flat(
          paper,
          (x, y) => inside(x, y, cx + side * 5.4 + dx * 1.3, ey + 3.7 + dy * 0.8, 0.3, 0.3),
          '#b4684e',
        )
      }
    }
  }
  if (avatar.glasses > 0) {
    const square = avatar.glasses === 2

    for (const side of [-1, 1]) {
      flat(
        paper,
        (x, y) => {
          const [u, v] = [(x - cx - side * 4.3) / 3, (y - ey) / 2.9]
          const ring = square
            ? Math.max(Math.abs(u) ** 4 + Math.abs(v) ** 4, 0) ** 0.25
            : Math.hypot(u, v)

          return (
            Math.abs(ring - 1) < 0.1 ||
            (side < 0 && near(x, y, cx - 1.3, ey - 0.6, cx + 1.3, ey - 0.6, 0.2))
          )
        },
        '#6a3a24',
      )
    }
  }
}

/** Un ojo almendrado (`shape` del catálogo), mirando de frente, cerrado o sonriendo. */
function eye(
  paper: Paper,
  x0: number,
  ey: number,
  side: -1 | 1,
  kind: 'open' | 'closed' | 'smile' | 'focus',
  shape: number,
  iris: readonly [Color, Color, Color, Color],
  skin: Tones,
): void {
  const w = shape === 1 ? 2.2 : 2.4
  const round = shape === 1
  const lidDrop = (kind === 'focus' ? 1 : 0) + (shape === 3 ? 0.9 : 0)
  const smile = (kind === 'smile' ? 1.3 : 0) + (shape === 2 ? 0.7 : 0)
  const top = (x: number): number => {
    const u = (x - x0) / w

    return (
      ey -
      (round ? 2.4 : 2.5) +
      u * u * (round ? 1.1 : 1.5) -
      side * u * (round ? 0 : 0.25) +
      lidDrop
    )
  }
  const bottom = (x: number): number => {
    const u = (x - x0) / w

    return ey + (round ? 2.3 : 2.1) - u * u * (round ? 1.1 : 1.3) - smile
  }
  const open = (x: number, y: number): boolean =>
    Math.abs(x - x0) < w && y > top(x) && y < bottom(x)

  if (kind === 'closed') {
    flat(
      paper,
      (x, y) => Math.abs(x - x0) < w && Math.abs(y - (ey + 0.4 - ((x - x0) / w) ** 2 * 0.9)) < 0.32,
      LID,
    )
    flat(
      paper,
      (x, y) => near(x, y, x0 + side * w * 0.95, ey + 0.1, x0 + side * (w + 0.8), ey - 0.5, 0.22),
      LID,
    )

    return
  }

  flat(paper, open, '#fbf6f2')

  const ir = 1.85
  const iy = ey + 0.15

  paper.paint((x, y) => {
    if (!open(x, y) || !inside(x, y, x0, iy, ir, ir * 1.05)) return null
    if (Math.hypot(x - x0, y - iy) / ir > 0.86) return iris[0]

    return y < iy - ir * 0.35 ? iris[1] : y < iy + ir * 0.4 ? iris[2] : iris[3]
  })
  flat(paper, (x, y) => open(x, y) && inside(x, y, x0, iy, ir * 0.45, ir * 0.48), '#120a0e')
  flat(paper, (x, y) => open(x, y) && inside(x, y, x0 - 0.55, iy - 0.6, 0.48, 0.5), '#ffffff')
  flat(paper, (x, y) => open(x, y) && inside(x, y, x0 + 0.6, iy + 0.65, 0.22, 0.22), '#ffffff')
  // Sombra del párpado sobre el ojo y el párpado de arriba, grueso, con dos pestañas al final.
  flat(paper, (x, y) => open(x, y) && y < top(x) + 0.55, mix(iris[0], '#c8b0b0', 0.55), 0.6)
  flat(paper, (x, y) => Math.abs(x - x0) < w + 0.1 && y > top(x) - 0.45 && y < top(x) + 0.12, LID)
  for (const [length, angle] of [
    [0.9, -0.5],
    [0.7, 0.05],
  ] as const) {
    flat(
      paper,
      (x, y) =>
        near(
          x,
          y,
          x0 + side * (w - 0.1),
          top(x0 + side * (w - 0.1)),
          x0 + side * (w - 0.1 + length),
          top(x0 + side * w) - 0.5 + angle,
          0.2,
        ),
      LID,
    )
  }
  flat(
    paper,
    (x, y) => Math.abs(x - x0) < w * 0.8 && Math.abs(y - (top(x) - 0.9)) < 0.16,
    skin[3] ?? '#000000',
  )
  flat(
    paper,
    (x, y) => Math.abs(x - x0) < w * 0.75 && Math.abs(y - bottom(x) - 0.1) < 0.14,
    skin[3] ?? '#000000',
  )
}

/** La gorra, el gorro de cocina o el casco del oficio. */
function hatOf(
  paper: Paper,
  hat: 'cap' | 'chef' | 'helmet',
  shades: Shades,
  cx: number,
  hy: number,
  rx: number,
  ry: number,
): void {
  const tones = tonesOf(
    hat === 'helmet'
      ? (['#ffe27a', '#ffd04d', '#d9a420'] as Shades)
      : hat === 'chef'
        ? (['#ffffff', '#f2f0f6', '#d6d2e0'] as Shades)
        : shades,
  )

  if (hat === 'chef') {
    oval(paper, cx, hy - 11.4, 7, 4.6, tones)
    paper.paint((x, y) =>
      Math.abs(x - cx) < rx * 0.92 && y > hy - 9.6 && y < hy - 5.4
        ? lit(tones, (x - cx) / rx, 0)
        : null,
    )

    return
  }

  oval(paper, cx, hy - 3.4, rx * 1.12, ry * 0.84, tones, (_, y) => y < hy - 3.6)
  if (hat === 'cap')
    flat(
      paper,
      (x, y) => inside(x, y, cx - 1, hy - 3.6, rx * 1.05, 1.4) && y > hy - 3.8,
      tones[2] ?? '#000000',
    )
  else
    flat(
      paper,
      (x, y) => Math.abs(y - (hy - 3.8)) < 0.5 && Math.abs(x - cx) < rx * 1.2,
      tones[3] ?? '#000000',
    )
}

/** Lo que lleva en las manos: una caja, la fregona, una llave inglesa o una bandeja con café. */
function carryOf(paper: Paper, carry: Carry, cx: number, shY: number, back: boolean): void {
  if (carry === null) return

  const wood = tonesOf(['#e2b878', '#c4955a', '#9f7442'] as Shades)

  switch (carry) {
    case 'box':
      if (back) return
      paper.paint((x, y) =>
        Math.abs(x - cx) < 4.6 && y > shY + 3 && y < shY + 9
          ? lit(wood, (x - cx) / 4.6, (y - shY - 6) / 3)
          : null,
      )
      flat(paper, (x, y) => Math.abs(x - cx) < 0.5 && y > shY + 3 && y < shY + 5, '#e8d8a8')
      break
    case 'mop':
      flat(paper, (x, y) => near(x, y, cx + 6.2, shY - 6, cx + 6.8, shY + 12, 0.4), '#c4955a')
      oval(paper, cx + 7, shY + 13, 2.6, 1.2, tonesOf(['#f4f0fa', '#d6d2e0', '#a8a4b8'] as Shades))
      break
    case 'wrench':
      flat(
        paper,
        (x, y) =>
          near(x, y, cx + 5.4, shY + 6, cx + 7.4, shY + 2.4, 0.45) ||
          inside(x, y, cx + 7.6, shY + 2, 1, 0.9),
        '#9aa0b4',
      )
      break
    case 'tray':
      if (back) return
      flat(paper, (x, y) => Math.abs(x - cx - 4) < 3.4 && Math.abs(y - shY - 4.6) < 0.45, '#c3c8d6')
      oval(paper, cx + 4, shY + 3.2, 1.2, 1.3, tonesOf(['#ffffff', '#e8e4ee', '#c9c3d4'] as Shades))
  }
}
