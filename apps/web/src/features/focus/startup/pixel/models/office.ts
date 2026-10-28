import { AXES } from '@sanatorio/startup'

import {
  AXIS_SHADES,
  BOARD,
  CODE,
  DARK,
  GLOW,
  LED,
  METAL,
  MUSTARD,
  NAVY,
  PLAIN,
  PORCELAIN,
  RED,
  SCREEN,
  SILVER,
  STEAM,
  WATER,
  WOOD,
} from '../palette'
import type { Shades, Sprite } from '../sprite'
import { posts } from './model'
import type { Model } from './model'

/** Una pantalla o un tablero de pie, de cara a la izquierda: los dos postes y el marco. */
function standing(sprite: Sprite, frame: Shades): void {
  posts(
    sprite,
    [
      [3, 7],
      [12, 7],
    ],
    7,
    METAL,
  )
  sprite.box(1, 7, 6, 14, 1.2, 12, frame)
}

/** La pizarra con pósits y garabatos. */
export const whiteboard: Model = {
  frames: 1,
  draw(sprite) {
    standing(sprite, SILVER)
    sprite.faceY(8.21, 2, 14, 7, 17, BOARD)

    const notes: [number, number, string][] = [
      [3, 14, '#ffd35c'],
      [5.5, 14, '#ff9ab2'],
      [3, 11, '#8fe3c4'],
      [11, 14.5, '#ffd35c'],
    ]

    for (const [x, z, color] of notes) sprite.faceY(8.22, x, x + 1.8, z, z + 1.8, color)
    for (let x = 7.5; x < 13; x += 1) sprite.dot(x, 8.23, 11 + (Math.round(x) % 2), '#3f7fd9')
    for (let x = 7.5; x < 12; x += 1) sprite.dot(x, 8.23, 9, RED)
  },
}

/** El panel de métricas: barras y una línea que se mueven. */
export const dashboard: Model = {
  frames: 16,
  draw(sprite, frame) {
    standing(sprite, NAVY)
    sprite.faceY(8.21, 2, 14, 7, 17, SCREEN)

    for (let bar = 0; bar < 5; bar += 1) {
      const height = 1.5 + 2.5 * (1 + Math.sin(frame * 0.4 + bar * 1.3))
      const color = bar === 4 ? CODE[1] : GLOW

      sprite.faceY(8.22, 2.6 + bar * 2.2, 3.9 + bar * 2.2, 7.5, 7.5 + height, color)
    }

    for (let x = 2.5; x < 14; x += 1) {
      sprite.dot(x, 8.23, 14.5 + Math.sin(x * 0.7 + frame * 0.4) * 1.2, CODE[0])
    }
  },
}

/** La cafetera en su mueble, con vapor. */
export const coffee: Model = {
  frames: 6,
  draw(sprite, frame) {
    sprite.box(2, 4, 0, 12, 10, 10, WOOD)
    sprite.faceY(14.01, 3, 13, 5, 5.5, WOOD[2])
    sprite.box(4, 6, 10, 7, 5, 9, DARK)
    sprite.faceY(11.01, 6, 9, 13, 14, '#1b1e2e')
    sprite.dot(9.6, 11.01, 17, RED)
    sprite.box(6.5, 11.5, 10, 2, 1.5, 2, PORCELAIN)

    const [x, y] = sprite.project(7.5, 12, 12.6)

    for (let puff = 0; puff < 3; puff += 1) {
      const rise = (frame + puff * 2) % 6

      sprite.set(x + (rise % 2) + puff - 1, y - 1 - rise, STEAM)
    }
  },
}

/** La fuente de agua. */
export const cooler: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(5, 5, 0, 6, 6, 14, SILVER)
    sprite.faceY(11.01, 6.5, 9.5, 8, 10, METAL[2])
    sprite.dot(7, 11.02, 9, RED)
    sprite.dot(9, 11.02, 9, LED.blue)
    sprite.box(6, 6, 14, 4, 4, 7, WATER)
    sprite.box(7, 7, 21, 2, 2, 1, WATER)
  },
}

/** Un puf para los descansos. */
export const beanbag: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(3, 3, 0, 10, 10, 4.5, MUSTARD)
    sprite.box(3.5, 3.5, 4.5, 9, 9, 1.5, MUSTARD)
    sprite.dot(8, 8, 6, MUSTARD[1])
  },
}

/** La impresora 3D: el cabezal va y viene y la pieza crece. */
export const printer: Model = {
  frames: 16,
  draw(sprite, frame) {
    sprite.box(3, 3, 0, 10, 10, 2, DARK)
    sprite.box(3, 3, 2, 1, 1, 15, METAL)
    sprite.box(12, 3, 2, 1, 1, 15, METAL)
    sprite.box(6, 6, 2, 4, 4, 0.5 + (Math.floor(frame / 2) % 8) * 0.8, AXIS_SHADES.back)

    const head = 5 + Math.abs((frame % 8) - 4) * 1.2

    sprite.box(3.5, 7.5, 12, 9, 1, 1, METAL)
    sprite.box(head, 7, 10.5, 2, 2, 2.5, NAVY)
    sprite.dot(head + 1, 9.01, 11.5, frame % 2 === 1 ? LED.red : LED.amber)
    sprite.box(3, 12, 2, 1, 1, 15, METAL)
    sprite.box(12, 12, 2, 1, 1, 15, METAL)
    sprite.box(3, 3, 17, 10, 1, 1, METAL)
    sprite.box(3, 3, 17, 1, 10, 1, METAL)
    sprite.box(3, 12, 17, 10, 1, 1, METAL)
    sprite.box(12, 3, 17, 1, 10, 1, METAL)
  },
}

/** Tres libros del color de lo que se aprende (`axis`): la tarjeta de aprender. */
export const books: Model = {
  frames: 1,
  draw(sprite, _frame, { axis = null }) {
    const shades = axis === null ? PLAIN : AXIS_SHADES[axis]
    const page = PORCELAIN[0]

    sprite.box(3, 4, 0, 10, 8, 2.5, shades)
    sprite.faceY(12.01, 3.5, 12.5, 0.8, 1.7, page)
    sprite.box(4, 4.5, 2.5, 9, 7, 2.5, NAVY)
    sprite.faceY(11.51, 4.5, 12.5, 3.3, 4.2, page)
    sprite.box(3.5, 4, 5, 9.5, 7.5, 2.5, shades)
    sprite.faceY(11.51, 4, 12.5, 5.8, 6.7, page)
  },
}

/**
 * La estantería de lo aprendido: un libro por nivel (`level`, hasta 15), del
 * color de cada rama por turnos.
 */
export const bookshelf: Model = {
  frames: 1,
  draw(sprite, _frame, { level = 0 }) {
    sprite.box(2, 6, 0, 12, 4, 22, WOOD)

    for (let shelf = 0; shelf < 3; shelf += 1) {
      const z = 2 + shelf * 7

      sprite.faceY(10.01, 3, 13, z, z + 5.5, '#5a3520')

      for (let book = 0; book < 5; book += 1) {
        const index = shelf * 5 + book

        if (index >= level) break

        const axis = AXES[index % AXES.length] ?? 'front'
        const tall = 3.5 + (index % 3) * 0.7

        sprite.faceY(10.02, 3.4 + book * 1.9, 4.9 + book * 1.9, z, z + tall, AXIS_SHADES[axis][1])
      }
    }
  },
}
