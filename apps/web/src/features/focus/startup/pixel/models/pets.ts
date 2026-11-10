/**
 * Las mascotas de las cajas sorpresa (gato, perro y robot) y lo de la
 * mudanza (cajas y camión). Las mascotas van solas por la oficina
 * (`pixel/life.ts`): `step` es su paso y, quietas, mueven la cola o la luz.
 */
import { CARDBOARD, CHERRY, DARK, GLOW, LED, METAL, PORCELAIN, SILVER, WATER } from '../palette'
import type { Ramp, Sprite } from '../sprite'
import type { Model } from './model'

const CAT: Ramp = ['#7a3e1a', '#b8682e', '#e89650', '#f4b878', '#fcd8a8']
const DOG: Ramp = ['#6a4426', '#9c6c42', '#c99a68', '#e2bc8c', '#f4dcb6']
const WHITE: Ramp = ['#b8a89a', '#d8ccc0', '#f2e8dc', '#fbf4ea', '#ffffff']
const NOSE = '#3a2420'

/**
 * Un animal de cuatro patas mirando hacia `x` (girado, hacia el otro lado):
 * cuerpo, cabeza, patas que se alternan al andar y la cola.
 */
function animal(
  sprite: Sprite,
  coat: Ramp,
  frame: number,
  step: number,
  { tall, tail, ears }: { tall: number; tail: number; ears: 'cat' | 'dog' },
): void {
  const walk = step === 0 ? 0 : step === 1 ? 1 : -1
  // Patas: delante y detrás, a los dos lados; al andar, se adelantan por pares.
  for (const [px, side] of [
    [5.5, 0],
    [5.5, 1],
    [10, 0],
    [10, 1],
  ] as const) {
    const swing = (side === (px > 8 ? 1 : 0) ? 1 : -1) * walk * 0.7

    sprite.cylinder(px + swing, 7 + side * 2, 0, tall, 0.55, coat)
  }
  sprite.blob(8, 8, tall + 1.6, 3.6, 1.9, 1.8, coat)
  sprite.blob(8.4, 9.4, tall + 1.2, 2.2, 0.6, 1.1, WHITE)
  // La cabeza, delante, y su hocico.
  sprite.blob(12, 8, tall + 3.6, 1.8, 1.7, 1.7, coat)
  sprite.blob(13.3, 8.3, tall + 3.1, 0.9, 0.9, 0.7, WHITE)
  sprite.dot(14.1, 8.4, tall + 3.4, NOSE)
  sprite.dot(13.2, 9.3, tall + 4.3, NOSE)
  if (ears === 'cat') {
    sprite.blob(11.6, 7.2, tall + 5.4, 0.6, 0.6, 0.9, coat)
    sprite.blob(12.4, 9, tall + 5.4, 0.6, 0.6, 0.9, coat)
  } else {
    sprite.blob(11.3, 6.6, tall + 3.9, 0.7, 0.4, 1.4, [
      '#4a2a16',
      '#6a4426',
      '#8c5e38',
      '#a87a50',
      '#c49a70',
    ])
    sprite.blob(11.3, 9.5, tall + 3.9, 0.7, 0.4, 1.4, [
      '#4a2a16',
      '#6a4426',
      '#8c5e38',
      '#a87a50',
      '#c49a70',
    ])
  }
  // La cola: de la grupa hacia arriba y atrás, que se mueve.
  for (let t = 0; t < 1; t += 0.2) {
    const wag = Math.sin(frame * 1.2 + t * 2) * tail

    sprite.blob(4.4 - t * 2, 8 + wag * t, tall + 2 + t * 3, 0.55, 0.55, 0.55, coat)
  }
}

/** Un gato atigrado: anda o, quieto, mueve la cola. */
export const cat: Model = {
  frames: 8,
  draw(sprite, frame, { step = 0 }) {
    animal(sprite, CAT, frame, step, { tall: 2.2, tail: step === 0 ? 1 : 0.3, ears: 'cat' })
  },
}

/** Un perro canela: anda o, quieto, mueve la cola sin parar. */
export const dog: Model = {
  frames: 8,
  draw(sprite, frame, { step = 0 }) {
    animal(sprite, DOG, frame, step, { tall: 3, tail: 1.4, ears: 'dog' })
    if (frame % 8 < 4) sprite.dot(13.6, 8.4, 5.2, '#ff8a9a')
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
