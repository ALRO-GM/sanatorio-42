import { LEAF, POT, SOIL } from '../palette'
import type { Ramp, Sprite } from '../sprite'
import type { Model } from './model'

/** Las hojas, en rampas de cinco tonos: oscuras, medias y las que dan al sol. */
const DARK_LEAF: Ramp = ['#183a24', '#245a32', LEAF[0], LEAF[1], LEAF[2]]
const LEAF_RAMP: Ramp = ['#1e4a2a', LEAF[0], LEAF[1], LEAF[2], LEAF[3]]
const SUN_LEAF: Ramp = ['#2e6a3c', LEAF[1], LEAF[2], LEAF[3], '#d4f0a0']
const CACTUS: Ramp = ['#1e4a3a', '#2e6a52', '#4a9070', '#74b48e', '#a8d8b2']
const BLOOM: Ramp = ['#8a2a4a', '#c0446a', '#ea6e92', '#f8a0b8', '#ffd4e0']

/**
 * Una copa de hojas en racimos alrededor de (cx, cy, cz), de radio `r`: cada
 * hoja, un elipsoide; por el ángulo de oro, para que no salgan en filas. Las
 * de arriba, más claras; con `frame`, se mece un poco.
 */
export function foliage(
  sprite: Sprite,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  count: number,
  frame = 0,
  leaf = 1,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.39996
    const out = r * Math.sqrt((i + 0.5) / count)
    const lift = Math.sin(i * 1.7) * r * 0.45
    const sway = Math.sin(frame * 0.8 + i) * 0.25

    sprite.blob(
      cx + Math.cos(angle) * out + sway,
      cy + Math.sin(angle) * out,
      cz + lift,
      leaf * 1.6,
      leaf * 1.6,
      leaf * 1.1,
      lift > r * 0.2 ? SUN_LEAF : i % 3 === 0 ? DARK_LEAF : LEAF_RAMP,
    )
  }
}

/** Una maceta redonda con su tierra, de radio `r` y alto `h`, en (cx, cy). */
function pot(sprite: Sprite, cx: number, cy: number, r: number, h: number, ramp = POT): void {
  sprite.cylinder(cx, cy, 0, h, r, ramp, SOIL)
  sprite.cylinder(cx, cy, h - 1, h, r + 0.3, ramp, SOIL)
}

/** Una monstera en su maceta: hojas grandes en tallos que salen en abanico y se mecen. */
export const monstera: Model = {
  frames: 8,
  draw(sprite, frame) {
    pot(sprite, 8, 8, 3.2, 6)

    for (let i = 0; i < 9; i += 1) {
      const angle = i * 2.39996 + 0.4
      const reach = 2.5 + (i % 3) * 1.4
      const height = 11 + (i % 4) * 2.5
      const sway = Math.sin(frame * 0.8 + i) * 0.35
      const [lx, ly] = [8 + Math.cos(angle) * reach + sway, 8 + Math.sin(angle) * reach]

      // El tallo, de la tierra a la hoja.
      for (let t = 0.1; t < 1; t += 0.1) {
        sprite.blob(
          8 + (lx - 8) * t,
          8 + (ly - 8) * t,
          6 + (height - 6) * t,
          0.4,
          0.4,
          0.7,
          DARK_LEAF,
        )
      }
      // La hoja: ancha, plana e inclinada hacia fuera.
      sprite.blob(
        lx,
        ly,
        height,
        2.6,
        2.2,
        0.9,
        i % 3 === 0 ? SUN_LEAF : i % 2 === 0 ? LEAF_RAMP : DARK_LEAF,
      )
    }
  },
}

/** Un cactus pequeño con dos brazos y una flor: lo primero que entra en el garaje. */
export const cactus: Model = {
  frames: 1,
  draw(sprite) {
    pot(sprite, 8, 8, 2.4, 4)
    sprite.cylinder(8, 8, 4, 12, 1.5, CACTUS)
    sprite.blob(8, 8, 12, 1.5, 1.5, 1.2, CACTUS)
    // Los brazos: uno a cada lado, que suben.
    sprite.blob(6.2, 8.4, 8, 0.9, 0.9, 0.8, CACTUS)
    sprite.cylinder(5.6, 8.4, 8, 10.5, 0.8, CACTUS)
    sprite.blob(5.6, 8.4, 10.6, 0.8, 0.8, 0.6, CACTUS)
    sprite.blob(9.8, 7.6, 9.5, 0.9, 0.9, 0.8, CACTUS)
    sprite.cylinder(10.4, 7.6, 9.5, 11.5, 0.75, CACTUS)
    sprite.blob(8.3, 8.6, 13.3, 0.8, 0.8, 0.6, BLOOM)
  },
}
