import { DARK, METAL, NAVY, PLYWOOD, PORCELAIN, SILVER, WOOD, GLOW, LED } from '../palette'
import { PERSON_WIDTH, PERSON_HEIGHT, drawPerson } from '../person'
import type { Sprite } from '../sprite'
import { posts } from './model'
import type { Model, Props } from './model'

/** La silla, detrás de la mesa: asiento, pata y respaldo. */
function chair(sprite: Sprite): void {
  sprite.box(7.5, 2, 0, 1, 1, 5, DARK)
  sprite.box(5, 1.5, 5, 6, 5, 1.5, DARK)
  sprite.box(5, 1, 6.5, 6, 1.5, 12, DARK)
}

/** Quien se sienta: de frente, detrás de la mesa, con la cabeza por encima de la pantalla. */
function seated(
  sprite: Sprite,
  frame: number,
  { look = 0, axis = null, busy = false }: Props,
): void {
  const [x, y] = sprite.project(8, 4.5, 9)
  // Que no tecleen ni parpadeen todos a la vez.
  const own = (frame + look) % 16

  drawPerson(
    sprite,
    Math.round(x) - PERSON_WIDTH / 2,
    Math.round(y) - PERSON_HEIGHT + (busy && own % 2 === 1 ? 1 : 0),
    { look, axis, blink: busy && own === 11 },
  )
}

function laptop(sprite: Sprite, x: number): void {
  sprite.box(x, 9, 12, 4.5, 3.5, 0.8, SILVER)
  sprite.box(x, 8.6, 12.8, 4.5, 0.6, 5, SILVER)
  sprite.dot(x + 2.2, 9.2, 15.5, GLOW)
}

function monitor(sprite: Sprite, x: number, wide = 6): void {
  sprite.box(x + wide / 2 - 0.5, 8.6, 12, 1, 1, 3, METAL)
  sprite.box(x, 8, 15, wide, 1.2, 8, NAVY)
  sprite.dot(x + wide / 2, 9.2, 19, NAVY[0])
}

function desk(sprite: Sprite): void {
  posts(
    sprite,
    [
      [1.5, 7.5],
      [13.5, 7.5],
      [1.5, 12.5],
      [13.5, 12.5],
    ],
    10,
    METAL,
  )
  sprite.box(1, 7, 10, 14, 7, 2, WOOD)
}

/** La mesa de caballetes del garaje, con una taza. */
function trestle(sprite: Sprite): void {
  sprite.box(2, 8, 0, 1.5, 5, 10, PLYWOOD)
  sprite.box(12.5, 8, 0, 1.5, 5, 10, PLYWOOD)
  sprite.box(1, 7, 10, 14, 7, 1.5, PLYWOOD)
  sprite.box(3, 11, 11.5, 2, 2, 2.5, PORCELAIN)
  sprite.dot(4, 12, 14.4, '#6b3f25')
}

/**
 * Un puesto: la mesa crece con el ordenador (`level`, de 0 a 5) y, si lleva
 * `look`, alguien sentado tecleando.
 *
 * 0. Caballetes y un portátil viejo.
 * 1. Mesa y portátil.
 * 2. Mesa y monitor.
 * 3. Monitor y portátil.
 * 4. Monitor ancho y portátil.
 * 5. Lo anterior y una torre debajo con su luz.
 */
export const workstation: Model = {
  frames: 16,
  draw(sprite, frame, props) {
    const level = props.level ?? 0

    if (props.look !== undefined) {
      chair(sprite)
      seated(sprite, frame, props)
    }

    if (level >= 5) {
      sprite.box(10, 8.5, 0, 3.5, 4.5, 8, DARK)
      sprite.dot(11, 13.01, 6, frame % 4 < 2 ? LED.blue : LED.off)
    }

    if (level === 0) trestle(sprite)
    else desk(sprite)

    if (level <= 1) laptop(sprite, 9.5)
    if (level >= 2) monitor(sprite, level >= 4 ? 0.5 : 1.5, level >= 4 ? 7 : 6)
    if (level >= 3) laptop(sprite, 10)
  },
}

/** Una persona sola, de pie y parpadeando: la tarjeta de quien se puede contratar. */
export const person: Model = {
  frames: 24,
  draw(sprite, frame, { look = 0, axis = null }) {
    const [x, y] = sprite.project(8, 8, 0)

    drawPerson(sprite, Math.round(x) - PERSON_WIDTH / 2, Math.round(y) - PERSON_HEIGHT, {
      look,
      axis,
      blink: (frame + look) % 24 === 5,
    })
  },
}
