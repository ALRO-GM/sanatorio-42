import { DARK, LED } from '../palette'
import { scatter } from '../sprite'
import type { Model } from './model'

/** Las ranuras del armario según el nivel de servidores (el 1 es una torre suelta). */
const UNITS = [0, 0, 4, 6, 8, 10, 10]

const SLOT = '#1b1e2e'

/**
 * Los servidores (`level`, de 1 a 6): una torre y luego un armario que se
 * llena de ranuras, cada una con sus luces parpadeando a su ritmo.
 */
export const rack: Model = {
  frames: 12,
  draw(sprite, frame, { level = 1 }) {
    const units = UNITS[Math.min(level, UNITS.length - 1)] ?? 0

    if (units === 0) {
      sprite.box(5, 5, 0, 6, 7, 13, DARK)
      sprite.faceY(12.01, 6, 10, 9, 10, SLOT)
      sprite.dot(9.5, 12.01, 4, frame % 4 < 2 ? LED.blue : LED.off)
      for (let z = 3; z < 12; z += 2) sprite.dot(11.01, 8, z, SLOT)

      return
    }

    const height = 3 + units * 3

    sprite.box(3, 3, 0, 10, 10, height, DARK)

    for (let unit = 0; unit < units; unit += 1) {
      const z = 2 + unit * 3

      sprite.faceY(13.01, 4, 12, z, z + 2, SLOT)

      for (let light = 0; light < 3; light += 1) {
        const on = scatter(unit * 31 + light * 7 + Math.floor(frame / (1 + (unit % 3)))) % 3 !== 0
        const color = light < 2 ? LED.green : unit % 4 === 1 ? LED.amber : LED.blue

        sprite.dot(5 + light, 13.02, z + 1, on ? color : LED.off)
      }
    }

    for (let z = 3; z < height - 1; z += 2) {
      for (let y = 5; y < 12; y += 2) sprite.dot(13.01, y, z, SLOT)
    }
  },
}
