import { scatter, TILE } from './sprite'
import type { Color, Sprite } from './sprite'

/**
 * Los suelos, uno por cada sitio (el espacio comprado, `FLOOR_OF_SPACE`): el
 * garaje de cemento, el coworking de parquet, la oficina de baldosa, la planta
 * con moqueta y el edificio y el campus con suelo técnico.
 */
export type Floor = 'concrete' | 'parquet' | 'tiles' | 'carpet' | 'raised'

export const FLOOR_OF_SPACE: readonly Floor[] = [
  'concrete',
  'parquet',
  'tiles',
  'carpet',
  'raised',
  'raised',
]

/** Las juntas entre baldosas y el canto de la plataforma (izquierda y derecha). */
const LOOK: Record<Floor, { joint: Color; edge: readonly [Color, Color] }> = {
  concrete: { joint: '#a9a49c', edge: ['#a39d93', '#8c867c'] },
  parquet: { joint: '#9c6a3e', edge: ['#a8703f', '#8a5a31'] },
  tiles: { joint: '#cdbfa8', edge: ['#cfc2ac', '#b9ab94'] },
  carpet: { joint: '#5d6888', edge: ['#66719a', '#525c7e'] },
  raised: { joint: '#8e93a5', edge: ['#a3a8b8', '#888d9e'] },
}

/** Una baldosa del suelo en (gx, gy). */
function drawTile(sprite: Sprite, gx: number, gy: number, floor: Floor): void {
  const x = gx * TILE
  const y = gy * TILE
  const odd = (gx + gy) % 2 === 1

  switch (floor) {
    case 'concrete': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, '#c4bfb6')
      for (let speck = 0; speck < 6; speck += 1) {
        const seed = scatter(gx * 71 + gy * 17 + speck)

        sprite.dot(x + (seed % 15) + 0.5, y + ((seed >>> 8) % 15) + 0.5, 0, '#b3ada3')
      }
      break
    }
    case 'parquet': {
      for (let strip = 0; strip < 4; strip += 1) {
        const color = (strip + gx) % 2 === 1 ? '#c98f5a' : '#bb8150'

        sprite.faceZ(0, x, x + TILE, y + strip * 4, y + strip * 4 + 4, color)
      }
      break
    }
    case 'tiles': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, odd ? '#e8dfcf' : '#e1d6c3')
      break
    }
    case 'carpet': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, '#7d88a8')
      for (let speck = 0; speck < 10; speck += 1) {
        const seed = scatter(gx * 97 + gy * 13 + speck)
        const color = speck % 2 === 1 ? '#6c7697' : '#909bbb'

        sprite.dot(x + (seed % 15) + 0.5, y + ((seed >>> 8) % 15) + 0.5, 0, color)
      }
      break
    }
    case 'raised': {
      sprite.faceZ(0, x, x + TILE, y, y + TILE, '#b7bbc8')
      sprite.faceZ(0, x + 1.5, x + TILE - 1.5, y + 1.5, y + TILE - 1.5, '#d1d4de')
      for (const [a, b] of [
        [4, 4],
        [12, 4],
        [4, 12],
        [12, 12],
      ] as const) {
        sprite.dot(x + a, y + b, 0, '#8e93a5')
      }
      break
    }
  }

  for (let step = 0; step < TILE; step += 0.5) {
    sprite.dot(x + step, y, 0, LOOK[floor].joint)
    sprite.dot(x, y + step, 0, LOOK[floor].joint)
  }
}

/** El suelo entero, de `size × size` baldosas, con su canto delante: una isla, sin paredes. */
export function drawFloor(sprite: Sprite, size: number, floor: Floor): void {
  for (let gx = 0; gx < size; gx += 1) {
    for (let gy = 0; gy < size; gy += 1) drawTile(sprite, gx, gy, floor)
  }

  const end = size * TILE
  const [left, right] = LOOK[floor].edge

  sprite.faceY(end, 0, end, -3, 0, left)
  sprite.faceX(end, 0, end, -3, 0, right)
}
