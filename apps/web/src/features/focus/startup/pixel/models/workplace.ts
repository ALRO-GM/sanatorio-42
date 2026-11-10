import { avatarFromKey, avatarOf } from '@sanatorio/startup'

import { DARK, METAL, NAVY, PLYWOOD, PORCELAIN, SILVER, WOOD, LED } from '../palette'

import type { Sprite } from '../sprite'
import { SEATED, STILL, WALK, toonOf } from '../toon'
import type { ToonSpec } from '../toon'
import { posts } from './model'
import type { Model, Props } from './model'

/** La silla, detrás de la mesa: asiento, pata y respaldo. */
function chair(sprite: Sprite): void {
  sprite.box(7.5, 2, 0, 1, 1, 5, DARK)
  sprite.box(5, 1.5, 5, 6, 5, 1.5, DARK)
  sprite.box(5, 1, 6.5, 6, 1.5, 12, DARK)
}

/** El aspecto de quien se dibuja: el del configurador o, si no, el que sale de `look`. */
const avatarIn = ({ avatar, look = 0 }: Props) =>
  (avatar === undefined ? null : avatarFromKey(avatar)) ?? avatarOf(look)

/** Una persona de pie (o sentada) con los pies en (fx, fy, fz) del mundo. */
function stand(sprite: Sprite, spec: Omit<ToonSpec, 'k'>, fx: number, fy: number, fz = 0): void {
  const toon = toonOf({ ...spec, k: sprite.scale / 2 })

  sprite.figure(toon.pixels, toon.w, toon.h, fx, fy, fz)
}

/**
 * Quien se sienta: de frente, detrás de la mesa, en la silla. Las piernas no
 * se dibujan (las tapa la mesa); la cadera, a la altura del asiento.
 */
/** Lo que cambia de quien se sienta en un fotograma: tecleo, parpadeo y cara. Que no lo hagan todos a la vez. */
function seatedState(frame: number, { look = 0, busy = false }: Props) {
  const own = (frame + look) % 16

  return {
    pose: busy ? own % 2 : 0,
    blink: own === 11,
    expression: busy && own < 12 ? ('concentrada' as const) : ('contenta' as const),
  }
}

/** Para `Model.same`: lo que se ve de quien se sienta y de la luz de la torre. */
function seatedKey(frame: number, props: Props): string {
  if (props.look === undefined) return (props.level ?? 0) >= 5 ? String(frame % 4 < 2) : ''

  const { pose, blink, expression } = seatedState(frame, props)

  return `${String(pose)}|${String(blink)}|${expression}|${String((props.level ?? 0) >= 5 && frame % 4 < 2)}`
}

function seated(sprite: Sprite, frame: number, props: Props): void {
  const { pose, blink, expression } = seatedState(frame, props)

  stand(
    sprite,
    {
      avatar: avatarIn(props),
      role: props.role,
      pose: SEATED[pose],
      blink,
      expression,
      glow: props.glow,
    },
    8.5,
    4.5,
    3,
  )
}

function laptop(sprite: Sprite, x: number, y: number): void {
  sprite.box(x, y, 12, 4.5, 3, 0.6, SILVER)
  sprite.box(x, y - 0.4, 12.6, 4.5, 0.5, 4, SILVER)
  // Su trasera mira a la sala, con la luz del logo.
  sprite.dot(x + 2.25, y + 0.15, 14.8, '#e8f4ff')
}

function monitor(sprite: Sprite, x: number, wide = 6): void {
  sprite.box(x + wide / 2 - 0.5, 8.6, 12, 1, 1, 3, METAL)
  sprite.box(x, 8, 15, wide, 1.2, 8, NAVY)
  // La trasera mira a la sala: un logo redondo.
  sprite.plane(1, 9.2, [x, x + wide], [15, 23], (u, v) =>
    Math.hypot(u - x - wide / 2, v - 19) < 1.1 ? '#f2b48a' : null,
  )
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
  same: seatedKey,
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

    // Las pantallas, a la izquierda: así no tapan la cara de quien se sienta.
    if (level <= 1) laptop(sprite, 2, 9)
    if (level >= 2) monitor(sprite, 0.5, level >= 4 ? 7 : 6)
    if (level >= 3) laptop(sprite, 1, 11.5)
  },
}

/** Una persona sola, de pie y parpadeando: la tarjeta de quien se puede contratar y el configurador. */
export const person: Model = {
  frames: 24,
  same: (frame, { look = 0 }) => String((frame + look) % 24 === 5),
  draw(sprite, frame, props) {
    stand(
      sprite,
      { avatar: avatarIn(props), role: props.role, blink: (frame + (props.look ?? 0)) % 24 === 5 },
      8,
      8,
    )
  },
}

/**
 * Alguien de pie o andando por la oficina (`pixel/life.ts`): entero, con su
 * uniforme si tiene oficio, de frente o de espaldas, con lo que lleve en las
 * manos. Si anda (`step`), las ocho fases del paso, una por fotograma.
 */
export const walker: Model = {
  frames: 8,
  same: (frame, { step = 0 }) => (step === 0 ? String(frame === 5) : String(frame)),
  draw(sprite, frame, props) {
    const { step = 0, back = false, carry = null, role } = props

    stand(
      sprite,
      {
        avatar: avatarIn(props),
        role,
        pose: step === 0 ? STILL : WALK[frame % WALK.length],
        back,
        carry,
        blink: step === 0 && frame === 5,
      },
      8,
      8,
    )
  },
}

/**
 * El mostrador de recepción, con quien atiende detrás (`look`) y un timbre.
 * Sale en cuanto hay alguien de recepción en la plantilla.
 */
export const reception: Model = {
  frames: 16,
  same: (frame, props) =>
    `${seatedKey(frame, { ...props, busy: false })}|${String(frame % 16 < 2)}`,
  draw(sprite, frame, props) {
    if (props.look !== undefined) {
      chair(sprite)
      seated(sprite, frame, { ...props, busy: false, role: 'reception' })
    }

    sprite.box(1, 8, 0, 14, 6, 11, PLYWOOD)
    sprite.faceY(14.01, 2, 14, 2, 9, WOOD[1])
    sprite.box(1, 7, 11, 14, 7, 1.5, WOOD)
    sprite.box(11, 10, 12.5, 2, 2, 1, SILVER)
    sprite.dot(12, 11, 14, frame % 16 < 2 ? LED.amber : METAL[0])
  },
}
