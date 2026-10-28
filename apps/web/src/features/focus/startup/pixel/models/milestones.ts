import {
  AXIS_SHADES,
  FLAME,
  GLASS,
  GOLD,
  LAND,
  LED,
  METAL,
  NAVY,
  OCEAN,
  SILVER,
  WOOD,
} from '../palette'
import { INK, scatter } from '../sprite'
import type { Model } from './model'

const COIN = ['.yyyy.', 'yLLLLy', 'oyyyyo', '.oooo.']

/** Las rondas de inversión: una pila de monedas por ronda (`level`, hasta 6), con un brillo. */
export const coins: Model = {
  frames: 12,
  draw(sprite, frame, { level = 1 }) {
    sprite.box(3, 3, 0, 10, 10, 3, NAVY)

    const [x, y] = sprite.project(8, 8, 3)
    const stacks: [number, number][] = [
      [0, -2],
      [-7, 0],
      [5, 1],
      [-3, 3],
      [3, -5],
      [-6, -4],
    ]

    stacks.slice(0, Math.max(1, level)).forEach(([dx, dy], stack) => {
      for (let coin = 0; coin < 3 + (stack % 3); coin += 1) {
        sprite.grid(
          COIN,
          { y: GOLD.mid, L: GOLD.light, o: GOLD.dark },
          Math.round(x) - 3 + dx,
          Math.round(y) - 4 + dy - coin * 2,
        )
      }
    })

    if (frame < 3) sprite.set(Math.round(x) + frame - 1, Math.round(y) - 14, '#ffffff')
  },
}

/** El planeta del control global, girando sobre su peana. */
export const globe: Model = {
  frames: 24,
  draw(sprite, frame) {
    sprite.box(5, 5, 0, 6, 6, 2, WOOD)
    sprite.box(7.5, 7.5, 2, 1, 1, 5, METAL)

    const [cx, cy] = sprite.project(8, 8, 13)
    const radius = 6.5

    for (let y = -7; y <= 7; y += 1) {
      for (let x = -7; x <= 7; x += 1) {
        const dx = x + 0.5
        const dy = y + 0.5

        if (Math.hypot(dx, dy) > radius) continue

        const half = Math.sqrt(Math.max(0.01, radius * radius - dy * dy))
        const longitude = Math.asin(Math.max(-1, Math.min(1, dx / half))) + frame * (Math.PI / 12)
        const latitude = dy / radius
        const land =
          Math.sin(longitude * 2) +
            Math.sin(longitude * 3 + latitude * 4) * 0.8 +
            Math.cos(latitude * 5) >
          0.7
        const shade = x + y > 3 ? 1 : 0

        sprite.set(cx + x, cy + y, land ? LAND[shade] : OCEAN[shade])
      }
    }

    for (let angle = -0.9; angle <= 0.9; angle += 0.12) {
      sprite.set(
        cx + Math.round(Math.sin(angle) * 8.5),
        cy - Math.round(Math.cos(angle) * 8.5),
        METAL[2],
      )
    }
  },
}

/** El cohete del MVP, despegando con su llama. */
export const rocket: Model = {
  frames: 4,
  draw(sprite, frame) {
    const [x, y] = sprite.project(8, 8, 0)
    const flame = frame % 2 === 0 ? ['.fFf.', '..f..'] : ['.FfF.', '.f.f.']

    sprite.grid(
      [
        '...w...',
        '..wWw..',
        '..wWw..',
        '.wwbww.',
        '.wbBbw.',
        '.wwbww.',
        '.wWWWw.',
        'rwWWWwr',
        'rrwWwrr',
        'r.www.r',
      ],
      { w: SILVER[1], W: SILVER[0], b: NAVY[1], B: '#3b8fe0', r: AXIS_SHADES.back[1] },
      Math.round(x) - 3,
      Math.round(y) - 22,
    )
    sprite.grid(flame, { f: FLAME[2], F: FLAME[0] }, Math.round(x) - 2, Math.round(y) - 12)
  },
}

/** La bandera de la startup fundada, ondeando, del color de su modelo de negocio. */
export const flag: Model = {
  frames: 4,
  draw(sprite, frame, { axis = null }) {
    const [, cloth, fold] = axis === null ? AXIS_SHADES.back : AXIS_SHADES[axis]

    sprite.box(6.5, 6.5, 0, 3, 3, 1.5, METAL)
    sprite.box(7.5, 7.5, 1.5, 1, 1, 22, SILVER)

    const [x, y] = sprite.project(8.5, 8, 22)
    const wave = frame % 2

    for (let column = 0; column < 9; column += 1) {
      const lift = column % 4 === (wave === 0 ? 1 : 3) ? 1 : 0

      for (let row = 0; row < 6; row += 1) {
        sprite.set(x + column, y + row - lift + Math.floor(column / 3), row === 5 ? fold : cloth)
      }
    }
  },
}

/**
 * El sitio de la startup (`level`, del espacio comprado: 0 el garaje, 5 el
 * campus): un edificio con más plantas, con ventanas que se encienden.
 */
export const building: Model = {
  frames: 8,
  draw(sprite, frame, { level = 0 }) {
    // Hasta el campus: más plantas no caben en el lienzo.
    const floors = 1 + Math.max(0, Math.min(level, 5))
    const height = 4 + floors * 4.5

    sprite.box(2, 2, 0, 12, 12, height, level === 0 ? WOOD : SILVER)

    if (level === 0) {
      sprite.faceY(14.01, 4, 12, 0, 6, METAL[1])
      for (let z = 1; z < 6; z += 1.5) sprite.faceY(14.02, 4, 12, z, z + 0.4, METAL[2])

      return
    }

    for (let floor = 0; floor < floors; floor += 1) {
      const z = 2 + floor * 4.5

      for (let window = 0; window < 3; window += 1) {
        const lit = scatter(floor * 13 + window * 5 + Math.floor(frame / 2)) % 4 === 0

        sprite.faceY(
          14.01,
          3.5 + window * 3.7,
          5.8 + window * 3.7,
          z,
          z + 2.5,
          lit ? LED.amber : GLASS[1],
        )
        sprite.faceX(14.01, 3.5 + window * 3.7, 5.8 + window * 3.7, z, z + 2.5, GLASS[2])
      }
    }

    sprite.faceZ(height + 0.01, 3, 13, 3, 13, SILVER[1])
    sprite.dot(8, 8, height + 0.02, INK)
  },
}
