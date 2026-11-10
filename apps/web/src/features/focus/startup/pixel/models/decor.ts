/**
 * La decoración que se compra o sale en las cajas (`DECOR` de
 * `@sanatorio/startup`): un modelo por pieza, con el mismo nombre que su id.
 * Lo que anima (pantallas, peces, péndulo, agua, brillos) va por fotogramas,
 * y lo que parece al azar sale de `scatter`.
 */
import {
  BOARD,
  BRASS,
  CHERRY,
  CORK,
  DARK,
  GLASS,
  GLOW,
  GOLD,
  LEAF,
  LED,
  LIGHT,
  METAL,
  MUSTARD,
  NAVY,
  NEON,
  PLUM,
  POT,
  RED,
  SCREEN,
  SEA,
  SILVER,
  SOIL,
  STONE,
  TEAL,
  WATER,
  WOOD,
} from '../palette'
import { scatter } from '../sprite'
import { posts } from './model'
import type { Model } from './model'
import { foliage } from './plants'

const MID = LEAF[1]

/** Una lámpara de pie: peana, palo y pantalla con su luz en el suelo. */
export const lamp: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(6, 6, 0, 4, 4, 1, DARK)
    sprite.box(7.5, 7.5, 1, 1, 1, 22, METAL)
    sprite.box(5, 5, 22, 6, 6, 6, MUSTARD)
    sprite.faceZ(22, 5.5, 10.5, 5.5, 10.5, LIGHT)
  },
}

/** Una alfombra a rayas: se pisa (va plana). */
export const rug: Model = {
  frames: 1,
  draw(sprite) {
    sprite.faceZ(0.5, 1, 15, 2, 14, RED)
    for (let stripe = 0; stripe < 4; stripe += 1) {
      sprite.faceZ(
        0.6,
        2,
        14,
        3.5 + stripe * 3,
        4.5 + stripe * 3,
        stripe % 2 === 0 ? GOLD.mid : BOARD,
      )
    }
  },
}

/** Una guitarra en su soporte. */
export const guitar: Model = {
  frames: 1,
  draw(sprite) {
    posts(
      sprite,
      [
        [6, 9],
        [10, 9],
      ],
      3,
      METAL,
    )

    const [x, y] = sprite.project(8, 9, 3)

    sprite.grid(
      [
        '...dd...',
        '...dd...',
        '...nn...',
        '...nn...',
        '...nn...',
        '...nn...',
        '..wwww..',
        '.wwwwww.',
        '.wwbbww.',
        '.wwwwww.',
        'wwwwwwww',
        'wwwbbwww',
        'wwwwwwww',
        '.wwwwww.',
      ],
      { d: DARK[1], n: WOOD[2], w: WOOD[0], b: '#3a2416' },
      Math.round(x) - 4,
      Math.round(y) - 14,
    )
  },
}

/** Un tablero de corcho de pie, con notas y chinchetas. */
export const corkboard: Model = {
  frames: 1,
  draw(sprite) {
    posts(
      sprite,
      [
        [3, 8],
        [12, 8],
      ],
      6,
      WOOD,
    )
    sprite.box(1.5, 8, 6, 13, 1, 11, WOOD)
    sprite.faceY(9.01, 2.5, 13.5, 7, 16, CORK)

    const notes: [number, number, string][] = [
      [3.5, 13, '#ffd35c'],
      [7, 12, BOARD],
      [10.5, 13.5, '#8fe3c4'],
      [5, 8.5, '#ff9ab2'],
    ]

    for (const [x, z, color] of notes) {
      sprite.faceY(9.02, x, x + 2.5, z, z + 2.5, color)
      sprite.dot(x + 1.2, 9.03, z + 2.2, RED)
    }
  },
}

/** Un sofá de dos plazas, con sus cojines. */
export const sofa: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(1, 3, 0, 14, 10, 5, TEAL)
    sprite.box(1, 3, 5, 14, 3, 7, TEAL)
    sprite.box(1, 6, 5, 2, 7, 3, TEAL)
    sprite.box(13, 6, 5, 2, 7, 3, TEAL)
    sprite.box(3.5, 6, 5, 4.5, 6, 1.5, TEAL)
    sprite.box(8.5, 6, 5, 4.5, 6, 1.5, TEAL)
    sprite.box(4, 6, 6.5, 3, 1, 3, MUSTARD)
  },
}

/** Un bonsái en su bandeja. */
export const bonsai: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(3, 5, 0, 10, 6, 6, NAVY)
    sprite.rounded(4, 6, 6, 8, 4, 2, 0.6, POT)
    sprite.faceZ(8.01, 4.5, 11.5, 6.5, 9.5, SOIL)
    // El tronco retorcido y dos copas planas.
    sprite.cylinder(7, 8, 8, 10, 0.7, WOOD)
    sprite.blob(8, 8, 10.5, 1.4, 0.7, 0.6, WOOD)
    sprite.cylinder(9, 8, 10.5, 12, 0.5, WOOD)
    foliage(sprite, 6, 8, 11.5, 2.2, 7, 0, 0.8)
    foliage(sprite, 9.8, 8, 13, 2, 6, 0, 0.8)
  },
}

/** La librería de casa: estantes con libros de colores y una planta. */
export const bookcase: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(1, 7, 0, 14, 5, 26, WOOD)

    for (let shelf = 0; shelf < 3; shelf += 1) {
      const z = 2 + shelf * 8

      sprite.faceY(12.01, 2, 14, z, z + 6.5, '#5a3520')

      for (let book = 0; book < 6; book += 1) {
        const seed = scatter(shelf * 13 + book)
        const color = [RED, GLOW, MUSTARD[1], TEAL[1], PLUM[1]][seed % 5] ?? RED

        if (seed % 7 !== 0) {
          sprite.faceY(12.02, 2.4 + book * 2, 3.9 + book * 2, z, z + 4 + (seed % 3), color)
        }
      }
    }
  },
}

/** La tele en su mueble, con lo que echan (un juego de píxeles). */
export const tv: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.box(1, 6, 0, 14, 7, 6, WOOD)
    sprite.faceY(13.01, 2, 7.5, 1.5, 5, WOOD[2])
    sprite.faceY(13.01, 8.5, 14, 1.5, 5, WOOD[2])
    sprite.box(2, 8, 6, 12, 1.5, 9, DARK)
    sprite.faceY(9.51, 3, 13, 7, 14, SCREEN)

    // Un muñequito salta entre bloques.
    for (let x = 3.5; x < 13; x += 2) sprite.faceY(9.52, x, x + 1.6, 7.3, 8.5, MID)
    sprite.faceY(
      9.53,
      4 + frame,
      5.5 + frame,
      9 + (frame % 4 < 2 ? 2 : 0),
      10.5 + (frame % 4 < 2 ? 2 : 0),
      RED,
    )
    sprite.dot(13.3, 9.53, 13.3, LED.green)
  },
}

/** Un letrero de neón de pie: un rayo que parpadea a ratos. */
export const neon: Model = {
  frames: 24,
  draw(sprite, frame) {
    posts(
      sprite,
      [
        [4, 8],
        [11, 8],
      ],
      5,
      METAL,
    )
    sprite.box(2, 8, 5, 12, 1, 14, DARK)

    const on = frame % 24 !== 7 && frame % 24 !== 9
    const pink = on ? NEON[0] : '#6b3a5e'
    const cyan = on ? NEON[1] : '#2f5a62'

    for (let step = 0; step < 6; step += 1) {
      sprite.dot(5 + step, 9.01, 16 - step * 1.6, pink)
      sprite.dot(11 - step, 9.01, 9 + step * 1.0, pink)
    }
    for (let x = 3.5; x < 13; x += 1) {
      sprite.dot(x, 9.01, 6.5, cyan)
      sprite.dot(x, 9.01, 17.5, cyan)
    }
  },
}

/** La máquina de refrescos: frente de cristal con latas y su luz. */
export const vending: Model = {
  frames: 12,
  draw(sprite, frame) {
    sprite.box(2, 4, 0, 12, 10, 30, CHERRY)
    sprite.faceY(14.01, 3, 10.5, 9, 27, GLASS[1])

    for (let row = 0; row < 4; row += 1) {
      for (let can = 0; can < 3; can += 1) {
        const color = [GOLD.mid, GLOW, MID, BOARD][(row + can) % 4] ?? BOARD

        sprite.faceY(14.02, 3.7 + can * 2.3, 5.2 + can * 2.3, 10.5 + row * 4, 13 + row * 4, color)
      }
    }
    sprite.faceY(14.01, 11.2, 13.2, 18, 24, DARK[2])
    sprite.dot(12.2, 14.02, 22, frame % 12 < 6 ? LED.green : LED.off)
    sprite.faceY(14.01, 4, 10, 3, 6, DARK[2])
  },
}

/** Un acuario en su mueble: los peces van y vienen y suben burbujas. */
export const aquarium: Model = {
  frames: 16,
  draw(sprite, frame) {
    sprite.box(1, 5, 0, 14, 8, 8, NAVY)
    sprite.box(1, 5, 8, 14, 8, 11, WATER)
    sprite.faceY(13.01, 2, 14, 9, 18, SEA[0])
    sprite.faceY(13.02, 2, 14, 9, 10, '#e8d29a')

    for (let weed = 0; weed < 3; weed += 1) {
      const x = 3 + weed * 4.5

      for (let z = 10; z < 14 + weed; z += 1) sprite.dot(x + (z % 2) * 0.6, 13.03, z, MID)
    }

    const fish = (frame % 16) / 15
    const fx = 3 + Math.abs(fish * 2 - 1) * 9

    sprite.faceY(13.04, fx, fx + 2, 13.5, 15, GOLD.mid)
    sprite.dot(frame < 8 ? fx + 2.3 : fx - 0.4, 13.04, 14.3, POT[1])

    const gx = 12 - Math.abs(((frame + 5) % 16) / 15 - 0.5) * 14

    sprite.faceY(13.04, gx, gx + 1.5, 11, 12, RED)
    sprite.dot(11, 13.05, 10.5 + ((frame * 0.6) % 7), BOARD)
  },
}

/** Una máquina recreativa: la pantalla se mueve y el botón se enciende. */
export const arcade: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.box(3, 4, 0, 10, 10, 26, PLUM)
    sprite.box(3, 11, 10, 10, 3, 3, PLUM)
    sprite.faceY(14.01, 4, 12, 15, 23, SCREEN)

    for (let star = 0; star < 5; star += 1) {
      const seed = scatter(star * 9 + Math.floor(frame / 2))

      sprite.dot(4.5 + (seed % 7), 14.02, 16 + ((seed >>> 4) % 6), NEON[(star % 3) as 0 | 1 | 2])
    }
    sprite.faceY(14.02, 6 + (frame % 4), 7.5 + (frame % 4), 15.5, 16.5, GOLD.mid)
    sprite.box(6, 12, 13, 1, 1, 2.5, DARK)
    sprite.dot(10, 14, 13.5, frame % 2 === 0 ? LED.red : LED.amber)
    sprite.faceY(14.01, 4, 12, 24, 25.5, NEON[0])
  },
}

/** Un árbol de interior grande, en su macetón. */
export const tree: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.rounded(4, 4, 0, 8, 8, 7, 1, STONE)
    sprite.faceZ(7.01, 4.5, 11.5, 4.5, 11.5, SOIL)
    sprite.cylinder(8, 8, 7, 20, 0.8, WOOD)
    foliage(sprite, 8, 8, 24, 5.5, 26, frame)
  },
}

/** Un reloj de pie con su péndulo. */
export const clock: Model = {
  frames: 12,
  draw(sprite, frame) {
    sprite.box(4, 6, 0, 8, 5, 30, WOOD)
    sprite.box(4.5, 6.5, 30, 7, 4, 2, WOOD)
    sprite.faceY(11.01, 5.5, 10.5, 22, 28, BOARD)
    sprite.dot(8, 11.02, 25, DARK[2])
    sprite.dot(8.5, 11.02, 26.5, DARK[2])
    sprite.dot(9.3, 11.02, 25.2, DARK[2])
    sprite.faceY(11.01, 5.5, 10.5, 4, 20, '#5a3520')

    const swing = Math.sin((frame / 12) * Math.PI * 2) * 1.6

    for (let z = 9; z < 19; z += 1) sprite.dot(8 + swing * ((19 - z) / 10), 11.02, z, GOLD.dark)
    sprite.faceY(11.03, 7 + swing, 9 + swing, 7, 9, GOLD.mid)
  },
}

/** Un piano de pared con sus teclas. */
export const piano: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(1, 5, 0, 14, 6, 20, DARK)
    sprite.box(1, 11, 9, 14, 3, 2, DARK)
    sprite.faceZ(11.01, 1.5, 14.5, 11.2, 13.8, BOARD)

    for (let key = 0; key < 9; key += 1) {
      if (key % 7 !== 2 && key % 7 !== 6)
        sprite.faceZ(11.02, 2.6 + key * 1.4, 3.3 + key * 1.4, 11.2, 12.4, DARK[2])
    }
    sprite.faceY(11.01, 4, 12, 14, 18, '#5a3520')
    sprite.box(11, 6.5, 20, 2, 2, 3, BRASS)
  },
}

/** Una estatua sobre su peana: un busto de piedra. */
export const statue: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(3, 3, 0, 10, 10, 10, STONE)
    sprite.box(4, 4, 10, 8, 8, 1, STONE)

    const [x, y] = sprite.project(8, 8, 11)

    sprite.grid(
      [
        '...bbbb...',
        '..bbbbbb..',
        '..bBbbBb..',
        '..bbbbbb..',
        '...bbbb...',
        '....bb....',
        '.bbbbbbbb.',
        'bbbbbbbbbb',
        'bbbBBBBbbb',
      ],
      { b: STONE[0], B: STONE[1] },
      Math.round(x) - 5,
      Math.round(y) - 9,
    )
  },
}

/** Una fuente: el agua sube y cae. */
export const fountain: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.box(1, 1, 0, 14, 14, 4, STONE)
    sprite.faceZ(4.01, 2, 14, 2, 14, SEA[1])
    sprite.faceZ(4.02, 3, 13, 3, 13, SEA[0])
    sprite.box(7, 7, 4, 2, 2, 6, STONE)
    sprite.box(5.5, 5.5, 10, 5, 5, 1.5, STONE)

    const [x, y] = sprite.project(8, 8, 11.5)

    for (let drop = 0; drop < 6; drop += 1) {
      const t = (frame + drop * 1.3) % 8
      const side = drop % 2 === 0 ? -1 : 1

      sprite.set(
        Math.round(x) + side * Math.round(t / 2),
        Math.round(y) - 3 + Math.round((t - 4) ** 2 / 4),
        WATER[0],
      )
    }
    sprite.set(Math.round(x), Math.round(y) - 3 - (frame % 2), BOARD)
  },
}

/** El trofeo dorado de las cajas, con su brillo. */
export const trophy: Model = {
  frames: 16,
  draw(sprite, frame) {
    sprite.box(4, 4, 0, 8, 8, 8, NAVY)
    sprite.box(6, 6, 8, 4, 4, 2, BRASS)

    const [x, y] = sprite.project(8, 8, 10)

    sprite.grid(
      [
        'yyyyyyyy',
        'yLLyyyyo',
        '.yLyyyo.',
        'y.yyyy.y',
        '.y.yy.y.',
        '...yy...',
        '...yy...',
        '..oooo..',
      ],
      { y: GOLD.mid, L: GOLD.light, o: GOLD.dark },
      Math.round(x) - 4,
      Math.round(y) - 8,
    )
    if (frame < 3) sprite.set(Math.round(x) - 2 + frame, Math.round(y) - 10, '#ffffff')
  },
}

/** La bola de discoteca, girando en su soporte y soltando brillos. */
export const discoball: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.box(6, 6, 0, 4, 4, 1, DARK)
    sprite.box(7.5, 7.5, 1, 1, 1, 16, METAL)

    const [cx, cy] = sprite.project(8, 8, 22)

    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        if (dx * dx + dy * dy > 17) continue

        const tile = (Math.floor((dx + frame) / 2) + Math.floor(dy / 2)) % 2 === 0

        sprite.set(cx + dx, cy + dy, tile ? SILVER[0] : SILVER[2])
      }
    }

    for (let spark = 0; spark < 3; spark += 1) {
      const seed = scatter(frame * 5 + spark)

      sprite.set(cx - 9 + (seed % 19), cy + 6 + ((seed >>> 5) % 10), NEON[spark as 0 | 1 | 2])
    }
  },
}

/** Un telescopio de trípode, mirando arriba a la izquierda. */
export const telescope: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(4, 7, 0, 1, 1, 12, WOOD)
    sprite.box(11, 7, 0, 1, 1, 12, WOOD)
    sprite.box(7.5, 11, 0, 1, 1, 12, WOOD)
    sprite.box(7, 7.5, 12, 2, 2, 2, DARK)

    const [x, y] = sprite.project(8, 8, 15)

    for (let step = 0; step < 9; step += 1) {
      sprite.set(Math.round(x) - step, Math.round(y) - Math.round(step * 0.8), NAVY[1])
      sprite.set(Math.round(x) - step, Math.round(y) - Math.round(step * 0.8) + 1, NAVY[2])
      sprite.set(Math.round(x) - step + 1, Math.round(y) - Math.round(step * 0.8) - 1, NAVY[0])
    }
    sprite.set(Math.round(x) - 9, Math.round(y) - 8, GLASS[0])
  },
}
