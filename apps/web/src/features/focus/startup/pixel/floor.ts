import { LEAF, POT, WOOD } from './palette'
import { mix, scatter, TILE } from './sprite'
import type { Color, Ramp, Sprite } from './sprite'

/**
 * Los suelos y las paredes, uno por cada sitio (el espacio, `FLOOR_OF_SPACE`):
 * tu cuarto de tablas de madera, el coworking de cemento pulido, la oficina
 * pequeña de parquet, la grande de moqueta, el edificio con suelo técnico y el
 * edificio entero con mármol. Todo en tonos cálidos.
 *
 * Las dos paredes de atrás llevan ventanas (en la de la derecha) y en la otra
 * lo de cada sitio: estantes con plantas y libros, cuadros, un reloj y
 * plantas colgadas. Es fondo: no ocupa baldosas ni estorba a nada.
 */
export type Floor = 'planks' | 'concrete' | 'parquet' | 'tiles' | 'carpet' | 'raised' | 'marble'

export const FLOOR_OF_SPACE: readonly Floor[] = [
  'planks',
  'concrete',
  'parquet',
  'carpet',
  'raised',
  'marble',
]

/** Lo alta que es la pared y dónde van las ventanas (en altura). */
const WALL = 34
const SILL = 11
const LINTEL = 29

/** Las ventanas de la pared de la derecha (`y` = 0): de `x0` a `x1`, una cada dos baldosas. */
export function windowsOf(size: number): { x0: number; x1: number }[] {
  const out: { x0: number; x1: number }[] = []

  for (let tile = 1; tile + 1 <= size; tile += 2)
    out.push({ x0: tile * TILE - 4, x1: tile * TILE + 12 })

  return out
}

/** Cómo es cada sitio: juntas, canto, zócalo, pared y cortinas. */
type Look = {
  joint: Color
  edge: readonly [Color, Color]
  /** La pared de arriba y el zócalo de abajo. */
  wall: Ramp
  base: Ramp
  /** Ladrillo visto en la pared de la izquierda (el coworking). */
  brick?: boolean
  curtain?: Ramp
}

const ramp = (...tones: [Color, Color, Color, Color, Color]): Ramp => tones

const LOOK: Record<Floor, Look> = {
  planks: {
    joint: '#7a4a2a',
    edge: ['#9a6238', '#7a4a2a'],
    wall: ramp('#b88e74', '#d8b392', '#efd2ad', '#f8e4c4', '#fff4de'),
    base: ramp('#6a3e24', '#8e5632', '#b27142', '#cc8d58', '#e2ac78'),
    curtain: ramp('#7a2a2a', '#a8403a', '#d0604a', '#e88a68', '#f8b892'),
  },
  concrete: {
    joint: '#b09a86',
    edge: ['#b8a592', '#9a8672'],
    wall: ramp('#a89480', '#c8b49c', '#e0cfb6', '#efe2cc', '#faf2e2'),
    base: ramp('#5a4a3e', '#7a6656', '#9a8470', '#b8a08a', '#d2bca4'),
    brick: true,
  },
  parquet: {
    joint: '#8e5a32',
    edge: ['#a8703f', '#8a5a31'],
    wall: ramp('#7e8e6c', '#9cac86', '#bcc8a2', '#d4dcbc', '#e8eed6'),
    base: ramp('#5a3a22', '#7e5232', '#a26a40', '#c08454', '#daa272'),
    curtain: ramp('#7a5a1e', '#a87e2a', '#d4a640', '#ecc866', '#fae29a'),
  },
  tiles: {
    joint: '#cdbfa8',
    edge: ['#cfc2ac', '#b9ab94'],
    wall: ramp('#b8a48e', '#d6c2aa', '#ecdcc4', '#f6ead6', '#fff8ea'),
    base: ramp('#6a4e3a', '#8e6c52', '#b08a6a', '#caa686', '#e0c2a4'),
  },
  carpet: {
    joint: '#9a5a4a',
    edge: ['#b06a54', '#8e5242'],
    wall: ramp('#b89c84', '#d4baa0', '#ead4ba', '#f6e6d2', '#fff6ea'),
    base: ramp('#4a3424', '#6a4a32', '#8c6444', '#aa805c', '#c69e7a'),
    curtain: ramp('#2e4a4a', '#3e6a66', '#5a908a', '#86b6ac', '#b6d8cc'),
  },
  raised: {
    joint: '#a89682',
    edge: ['#b8a692', '#9a8874'],
    wall: ramp('#a8988a', '#c4b4a4', '#ddcfbf', '#ece2d6', '#f8f2ea'),
    base: ramp('#4a3a30', '#665044', '#86685a', '#a48676', '#c2a696'),
  },
  marble: {
    joint: '#d8c8b0',
    edge: ['#e2d4bc', '#c8b89e'],
    wall: ramp('#c4b29a', '#dccab0', '#efe0c8', '#f8eedc', '#fffaf0'),
    base: ramp('#6a4a2a', '#8e6a3a', '#b88e4e', '#d6ae6a', '#ecce92'),
    curtain: ramp('#5a1e2e', '#8a2e44', '#b84a5e', '#d87a86', '#f0aeb2'),
  },
}

/** Una baldosa del suelo en (gx, gy). */
function drawTile(sprite: Sprite, gx: number, gy: number, floor: Floor): void {
  const x = gx * TILE
  const y = gy * TILE
  const odd = (gx + gy) % 2 === 1
  const seed = (n: number): number => scatter(gx * 71 + gy * 17 + n)

  switch (floor) {
    case 'concrete': {
      // Cemento pulido cálido, con nubes suaves de otro tono.
      sprite.plane(2, 0, [x, x + TILE], [y, y + TILE], (u, v) =>
        Math.sin(u * 0.31 + gy) + Math.cos(v * 0.27 + gx) > 1.2 ? '#cdb9a4' : '#d6c3ad',
      )
      break
    }
    case 'parquet': {
      // Espiga: tablillas en diagonal que cambian de sentido en cada baldosa.
      sprite.plane(2, 0, [x, x + TILE], [y, y + TILE], (u, v) => {
        const along = odd ? u - x : v - y
        const across = odd ? v - y : u - x
        const strip = Math.floor((along + across) / 4)
        const tone =
          ['#c98f58', '#bb8150', '#d39a62', '#c48a55'][(strip + gx + gy) % 4] ?? '#c98f58'

        return (along + across) % 4 < 0.35 ? '#9c6a3e' : tone
      })
      break
    }
    case 'tiles': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, odd ? '#ecdcc2' : '#e4d2b6')
      break
    }
    case 'carpet': {
      // Moqueta terracota con un dibujo suave de rombos.
      sprite.plane(2, 0, [x, x + TILE], [y, y + TILE], (u, v) => {
        const d = Math.abs(u - x - 8) + Math.abs(v - y - 8)

        return d > 6.6 && d < 7.2 ? '#bd765c' : '#b56e56'
      })
      break
    }
    case 'planks': {
      // Tablas anchas con veta: la junta de cada una cae en un sitio distinto.
      for (let board = 0; board < 4; board += 1) {
        const base =
          ['#c08048', '#b47442', '#c88a52', '#ba7a46'][(board + gy * 3 + gx) % 4] ?? '#c08048'
        const cut = seed(board) % 16

        sprite.plane(2, 0, [x + board * 4, x + board * 4 + 4], [y, y + TILE], (u, v) => {
          if (Math.abs(v - y - cut) < 0.3) return '#8a5430'
          if (Math.abs(u - x - board * 4) < 0.25) return '#8a5430'

          const grain = Math.sin((u - x) * 2.1 + Math.sin((v - y) * 0.4 + board) * 1.6)

          return grain > 0.85
            ? mix(base, '#7a4a2a', 0.18)
            : grain < -0.9
              ? mix(base, '#f0c48a', 0.15)
              : base
        })
      }
      break
    }
    case 'marble': {
      sprite.plane(2, 0, [x, x + TILE], [y, y + TILE], (u, v) => {
        const vein = Math.abs(Math.sin((u + v * 0.6) * 0.22 + seed(1) * 0.001) * 6 - (v - y) * 0.3)

        return vein < 0.35 ? '#d8c4a8' : odd ? '#f6ecdc' : '#efe3d0'
      })
      break
    }
    case 'raised': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, '#c8b6a2')
      sprite.faceZ(0, x + 1.5, x + TILE - 1.5, y + 1.5, y + TILE - 1.5, '#dccbb8')
      break
    }
  }

  const joint = LOOK[floor].joint

  sprite.plane(2, 0, [x, x + TILE], [y, y + TILE], (u, v) =>
    u - x < 0.3 || v - y < 0.3 ? joint : null,
  )
}

/** La pared de la derecha (`y` = 0) o de la izquierda (`x` = 0), con zócalo y su remate. */
function wall(sprite: Sprite, size: number, along: 'x' | 'y', look: Look): void {
  const end = size * TILE
  const [x, y, w, d] = along === 'x' ? [-2, -2, end + 2, 2] : [-2, 0, 2, end]

  sprite.rounded(x, y, 0, w, d, WALL, 0.3, look.wall, (face, u, v, z) => {
    if (face === 'top') return null

    const run = along === 'x' ? u : v

    // Zócalo de madera abajo, con su moldura.
    if (z < 8) return z > 7.4 ? look.base[4] : (look.base[(Math.floor(run / 5) % 2) + 2] ?? null)
    if (look.brick === true && along === 'y') {
      const row = Math.floor((z - 8) / 2)
      const joint = (z - 8) % 2 < 0.3 || (run + (row % 2) * 3) % 6 < 0.3

      return joint
        ? '#d8c4ac'
        : (['#b8644a', '#c47452', '#a85a42'][(row + Math.floor(run / 6)) % 3] ?? null)
    }

    return null
  })
}

/** Una ventana en la pared de la derecha, de `x0` a `x1`: cielo, nubes o estrellas, marco, alféizar y cortinas. */
function window(
  sprite: Sprite,
  x0: number,
  x1: number,
  look: Look,
  night: boolean,
  index: number,
): void {
  const frame = WOOD[0]
  const width = x1 - x0
  const height = LINTEL - SILL

  sprite.plane(1, 0.05, [x0, x1], [SILL, LINTEL], (u, v) => {
    const [a, b] = [u - x0, v - SILL]

    if (a < 0.9 || a > width - 0.9 || b < 0.9 || b > height - 0.9) return frame
    if (Math.abs(a - width / 2) < 0.45 || Math.abs(b - height * 0.55) < 0.4) return WOOD[1]

    const t = b / height

    if (night) {
      const star = scatter(Math.floor(a * 2) * 131 + Math.floor(b * 2) * 17 + index) % 97 === 0

      return star ? '#fff4c8' : mix('#1e2a52', '#3a3a6e', t)
    }

    // Abajo, colinas y copas de árboles; arriba, cielo con nubes.
    const hill = 3.2 + Math.sin(a * 0.55 + index * 2) * 1.2 + Math.sin(a * 1.7) * 0.4

    if (b < hill) return b < hill - 1.2 ? '#5e9a5a' : '#78b266'

    const cloud = Math.sin(a * 0.7 + index) + Math.cos(b * 0.9 - a * 0.2) > 1.3 && t > 0.55

    return cloud ? '#fffaf0' : mix('#f6d8a8', '#9ccce0', Math.min(1, (t - 0.15) * 1.6))
  })
  // Alféizar y una maceta con su planta en una de cada dos.
  sprite.box(x0 - 1, 0, SILL - 1, width + 2, 2.2, 1, WOOD, 0.3)
  if (index % 2 === 0) {
    const cx = x0 + width * 0.3

    sprite.cylinder(cx, 1.1, SILL, SILL + 2.2, 1.1, POT)
    for (let leaf = 0; leaf < 6; leaf += 1) {
      const angle = leaf * 1.05

      sprite.blob(
        cx + Math.cos(angle) * 0.9,
        1.1 + Math.sin(angle) * 0.5,
        SILL + 3 + (leaf % 3) * 0.7,
        0.9,
        0.7,
        0.7,
        leaf % 2 === 0 ? LEAF_RAMP : LEAF_LIGHT,
      )
    }
  }
  // Cortinas recogidas a los lados.
  if (look.curtain !== undefined) {
    for (const side of [x0 - 1.6, x1 + 0.2]) {
      sprite.rounded(
        side,
        0.2,
        SILL - 3,
        1.4,
        1.2,
        LINTEL - SILL + 4.5,
        0.6,
        look.curtain,
        (face, u) =>
          face === 'left' && Math.floor(u * 2.4) % 2 === 1 ? (look.curtain?.[2] ?? null) : null,
      )
    }
    sprite.box(x0 - 2.5, 0.3, LINTEL + 1.4, width + 5, 0.6, 0.6, WOOD, 0.2)
  }
}

const LEAF_RAMP: Ramp = ['#1e4a2a', LEAF[0], LEAF[1], LEAF[2], LEAF[3]]
const LEAF_LIGHT: Ramp = ['#2e6a3c', LEAF[1], LEAF[2], LEAF[3], '#d4f0a0']
const BOOKS: readonly Ramp[] = [
  ['#5a1e2a', '#a83e3e', '#e0654e', '#f4987a', '#ffd0b8'],
  ['#16304a', '#285a7e', '#3e82a8', '#6aaccc', '#a8d4e8'],
  ['#5a3a1a', '#a8682a', '#e0a23e', '#f4c862', '#fde6a0'],
  ['#1a3a2e', '#2e6a4a', '#4f9a62', '#86c27a', '#c2e6a2'],
]

/** Un estante en la pared de la izquierda a la altura `z`, con libros y una planta que cuelga. */
function shelf(sprite: Sprite, y: number, z: number, seed: number): void {
  sprite.box(0, y, z, 3, 12, 0.8, WOOD, 0.2)

  let at = y + 0.8

  for (let book = 0; book < 4; book += 1) {
    const thick = 0.9 + ((seed >> book) % 3) * 0.3
    const tall = 3 + ((seed >> (book + 2)) % 3) * 0.6

    sprite.box(0.4, at, z + 0.8, 2, thick, tall, BOOKS[(seed + book) % BOOKS.length] ?? WOOD, 0.15)
    at += thick + 0.15
  }
  // Una planta colgante: maceta y hojas que caen por delante del estante.
  const py = y + 9

  sprite.cylinder(1.5, py, z + 0.8, z + 2.6, 1.2, POT)
  for (let leaf = 0; leaf < 9; leaf += 1) {
    sprite.blob(
      1.8 + Math.sin(leaf) * 0.4,
      py + Math.cos(leaf * 1.3) * 1.2,
      z + 2.8 - leaf * 0.9,
      0.8,
      0.8,
      0.6,
      leaf % 2 === 0 ? LEAF_RAMP : LEAF_LIGHT,
    )
  }
}

/** Un cuadro en la pared de la izquierda: marco y una escena simple (montaña, sol, mar o formas). */
function picture(sprite: Sprite, y: number, z: number, kind: number): void {
  const [w, h] = [9, 7]

  sprite.plane(0, 0.05, [y, y + w], [z, z + h], (u, v) => {
    const [a, b] = [u - y, v - z]

    if (a < 0.6 || a > w - 0.6 || b < 0.6 || b > h - 0.6) return '#8e5632'

    switch (kind % 3) {
      case 0:
        // Montañas al atardecer.
        return b < 2.5 + Math.abs(a - 4.5) * -0.6 + 2
          ? '#6a8e6a'
          : Math.hypot(a - 6.5, b - 5) < 1
            ? '#fff0b0'
            : '#f2b880'
      case 1:
        // El mar con un barquito.
        return b < 3
          ? Math.sin(a * 2) * 0.2 + 2.8 > b
            ? '#4a8eb0'
            : '#6aaccc'
          : Math.abs(a - 4) < 0.7 && b < 4.2
            ? '#fff8ea'
            : '#bfe0e8'
      default:
        // Formas de colores, como un cartel.
        return Math.hypot(a - 3, b - 3) < 1.6
          ? '#e0654e'
          : a > 5 && b > 2 && b < 5
            ? '#f4c862'
            : '#f6ead6'
    }
  })
}

/** Un reloj redondo en la pared de la izquierda. */
function clock(sprite: Sprite, y: number, z: number): void {
  sprite.plane(0, 0.05, [y - 2.6, y + 2.6], [z - 2.6, z + 2.6], (u, v) => {
    const d = Math.hypot(u - y, v - z)

    if (d > 2.5) return null
    if (d > 2.05) return '#8e5632'

    const hand = Math.atan2(v - z, u - y)

    return (Math.abs(hand - 1.2) < 0.18 && d < 1.7) || (Math.abs(hand + 2.6) < 0.22 && d < 1.2)
      ? '#45343f'
      : '#fffaf0'
  })
}

/** Los colores de las bombillas de la guirnalda, por turnos. */
export const BULBS = ['#ffd27a', '#ff9a7a', '#fff0b8', '#9ae0c8'] as const

/**
 * Dónde cuelgan las bombillas de la guirnalda: a lo largo de lo alto de las
 * dos paredes, en curvas entre clavo y clavo. Puntos del mundo `[x, y, z]`.
 */
export function bulbsOf(size: number): [number, number, number][] {
  const out: [number, number, number][] = []
  const end = size * TILE
  const sag = (t: number): number => WALL - 2.5 - Math.sin(t * Math.PI) * 2.2

  for (let along = 1; along < end - 1; along += 2.5) {
    const t = (along % 8) / 8

    out.push([along, 0.6, sag(t)], [0.6, along, sag(t)])
  }

  return out
}

/** La guirnalda: el cable y sus bombillas (de noche, encendidas). */
function garland(sprite: Sprite, size: number, night: boolean): void {
  bulbsOf(size).forEach(([x, y, z], index) => {
    const color = BULBS[index % BULBS.length] ?? BULBS[0]

    sprite.dot(x, y, z + 0.6, '#5a3a2a')
    sprite.blob(
      x,
      y,
      z,
      0.5,
      0.5,
      0.6,
      night
        ? [color, color, color, '#ffffff', '#ffffff']
        : [mix(color, '#5a3a2a', 0.5), mix(color, '#5a3a2a', 0.3), color, color, '#fffaf0'],
    )
  })
}

/** Una jardinera colgada en la pared de la derecha, entre dos ventanas, con hojas que caen. */
function planter(sprite: Sprite, x: number): void {
  sprite.rounded(x - 2, 0, 19, 4, 2.2, 2.4, 0.5, POT)
  for (let leaf = 0; leaf < 10; leaf += 1) {
    sprite.blob(
      x - 1.5 + (leaf % 4),
      1.6 + Math.sin(leaf) * 0.4,
      21.5 - Math.floor(leaf / 4) * 2.4 - (leaf % 2) * 0.8,
      0.9,
      0.7,
      0.8,
      leaf % 3 === 0 ? LEAF_LIGHT : LEAF_RAMP,
    )
  }
}

/**
 * El suelo entero, de `size × size` baldosas, con su canto delante y las dos
 * paredes de atrás con lo suyo. De noche (`night`), las ventanas muestran el
 * cielo oscuro con estrellas.
 */
export function drawFloor(sprite: Sprite, size: number, floor: Floor, night = false): void {
  for (let gx = 0; gx < size; gx += 1) {
    for (let gy = 0; gy < size; gy += 1) drawTile(sprite, gx, gy, floor)
  }

  const end = size * TILE
  const look = LOOK[floor]
  const [left, right] = look.edge

  sprite.faceY(end, 0, end, -3, 0, left)
  sprite.faceX(end, 0, end, -3, 0, right)

  wall(sprite, size, 'x', look)
  wall(sprite, size, 'y', look)
  windowsOf(size).forEach(({ x0, x1 }, index) => {
    window(sprite, x0, x1, look, night, index)
  })

  // Entre ventana y ventana, una jardinera colgada.
  const windows = windowsOf(size)

  windows.slice(1).forEach(({ x0 }, index) => {
    planter(sprite, (x0 + (windows[index]?.x1 ?? x0)) / 2)
  })
  garland(sprite, size, night)

  // La pared de la izquierda: cada dos baldosas, un estante, un cuadro o el reloj.
  for (let tile = 0; tile + 1 < size; tile += 2) {
    const y = tile * TILE + 2
    const kind = tile === 0 ? 0 : (tile / 2 + size) % 3

    if (kind === 0) shelf(sprite, y, 17, scatter(tile + size))
    else if (kind === 1) picture(sprite, y + 2, 15, tile + size)
    else clock(sprite, y + 6, 22)
  }
  if (size >= 2) picture(sprite, (size - 1) * TILE + 3, 14, size + 1)

  sprite.finish({ contact: false })
}
