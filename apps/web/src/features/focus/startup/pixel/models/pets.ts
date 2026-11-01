/**
 * Las mascotas de las cajas sorpresa (gato, perro y robot) y lo de la
 * mudanza (cajas y camión). Las mascotas van solas por la oficina
 * (`pixel/life.ts`): `step` es su paso y, quietas, mueven la cola o la luz.
 */
import { CARDBOARD, CHERRY, DARK, GLOW, LED, METAL, PORCELAIN, SILVER, WATER } from '../palette'
import { INK } from '../sprite'
import type { Model } from './model'

const CAT = { o: '#f0a85a', O: '#c97a34', w: '#fff3e0', e: INK, p: '#ff9ab2' }
const DOG = { o: '#d9b07a', O: '#a8783f', w: '#fff3e0', e: INK, p: '#5a3a22' }

/** Un gato atigrado: anda o, quieto, mueve la cola. */
export const cat: Model = {
  frames: 8,
  draw(sprite, frame, { step = 0 }) {
    const [x, y] = sprite.project(8, 8, 0)
    const tail = step === 0 && frame % 8 < 4 ? 'O' : '.'

    sprite.grid(
      [
        `o.o.....${tail}.`,
        'ooo....O.O',
        'eoe...O...',
        'wpw.oOoO..',
        '.ooooOoOo.',
        '.oOoOoOoo.',
        step === 1 ? '.o..o.o..o' : '.o.o..o.o.',
      ],
      CAT,
      Math.round(x) - 5,
      Math.round(y) - 7,
    )
  },
}

/** Un perro canela: anda o, quieto, mueve la cola y saca la lengua. */
export const dog: Model = {
  frames: 8,
  draw(sprite, frame, { step = 0 }) {
    const [x, y] = sprite.project(8, 8, 0)
    const wag = step !== 0 || frame % 4 < 2

    sprite.grid(
      [
        'OO........',
        'oOo.....' + (wag ? 'O.' : '.O'),
        'eoeo....O.',
        'ooooooooo.',
        `p${frame % 8 < 4 ? 'w' : 'o'}oooOooo.`,
        '..oOoooOo.',
        '..oo..oo..',
        step === 1 ? '.o...o..o.' : '..o..o..o.',
      ],
      DOG,
      Math.round(x) - 5,
      Math.round(y) - 8,
    )
  },
}

/** Un robot pequeño de ruedas, con su antena que parpadea. */
export const robot: Model = {
  frames: 12,
  draw(sprite, frame, { step = 0 }) {
    sprite.box(5, 5, 0, 6, 6, 1.5, DARK)
    sprite.box(5.5, 5.5, 1.5 + (step === 1 ? 0.5 : 0), 5, 5, 6, SILVER)
    sprite.faceY(10.51, 6.5, 9.5, 4 + (step === 1 ? 0.5 : 0), 6.5 + (step === 1 ? 0.5 : 0), DARK[1])
    sprite.dot(7.2, 10.52, 5.5, GLOW)
    sprite.dot(8.8, 10.52, 5.5, GLOW)
    sprite.box(7.7, 7.7, 7.5, 0.6, 0.6, 3, METAL)
    sprite.dot(8, 8, 11, frame % 12 < 6 ? LED.red : LED.off)
  },
}

/**
 * Las cajas de la mudanza: una pila de una a tres (`level`), con su cinta.
 * Sale en el sitio de cada cosa mientras se recoge.
 */
export const crate: Model = {
  frames: 1,
  draw(sprite, _frame, { level = 1 }) {
    const count = Math.max(1, Math.min(3, level))

    for (let box = 0; box < count; box += 1) {
      const z = box * 6
      const shift = box % 2 === 0 ? 0 : 1.5

      sprite.box(3 + shift, 3, z, 10, 10, 6, CARDBOARD)
      sprite.faceZ(z + 6.01, 7.5 + shift, 8.5 + shift, 3, 13, '#c9a45a')
    }
  },
}

/** El camión de la mudanza, de lado, con sus ruedas que giran. */
export const truck: Model = {
  frames: 4,
  draw(sprite, frame) {
    sprite.box(0, 3, 2, 11, 10, 14, PORCELAIN)
    sprite.box(11, 4, 2, 5, 8, 9, CHERRY)
    sprite.faceY(12.01, 12, 15, 7, 10, WATER[1])
    sprite.faceY(13.01, 2, 9, 9, 12, CARDBOARD[1])

    for (const x of [2.5, 12.5]) {
      sprite.box(x, 12.5, 0, 3, 1, 3, DARK)
      sprite.dot(x + 1.5, 13.6, 1.5 + (frame % 2), METAL[0])
    }
  },
}
