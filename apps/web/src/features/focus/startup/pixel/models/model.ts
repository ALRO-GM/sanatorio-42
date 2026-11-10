import type { Axis, Role } from '@sanatorio/startup'

import type { Shades, Sprite } from '../sprite'
import type { Carry } from '../toon'

/** Lo que cambia un mismo modelo de un sitio a otro. Cada modelo mira lo que le toca. */
export type Props = {
  /** El nivel de lo comprado (ordenador, servidores, espacio…) o cuántos hay. */
  level?: number
  /** Quien se sienta, si alguien: su aspecto (0-999)… */
  look?: number
  /** …o el elegido en el configurador (`avatarKey`), que manda sobre `look`. */
  avatar?: string | undefined
  /** …y su especialidad, o el modelo de negocio de lo que se dibuja. */
  axis?: Axis | null
  /** Si trabaja: teclea y parpadea. Si no, se queda quieto. */
  busy?: boolean
  /** Al caer la tarde: la luz azulada de la pantalla en quien se sienta delante. */
  glow?: boolean | undefined
  /** El oficio de quien se dibuja, si no programa: su uniforme. */
  role?: Role | undefined
  /** Girado: mira a la derecha (lo hace el motor, `Sprite.turned`). */
  turn?: boolean | undefined
  /** Quien camina: el paso (0 quieto, 1 y 2 andando), si va de espaldas y lo que lleva. */
  step?: number | undefined
  back?: boolean | undefined
  carry?: Carry | undefined
}

/**
 * Un modelo: algo que ocupa una baldosa. Se dibuja con el motor de `sprite.ts`
 * en coordenadas del mundo, con la baldosa de (0, 0) a (16, 16) y `z` hacia
 * arriba. Para añadir uno: un `Model` en `models/` y su entrada en `MODELS`
 * (`models/index.ts`).
 */
export type Model = {
  /**
   * Fotogramas de su animación, que pasan a 6 por segundo (1: quieto). Cada
   * uno se dibuja una sola vez y se guarda.
   */
  frames: number
  draw: (sprite: Sprite, frame: number, props: Props) => void
  /**
   * Qué se ve en un fotograma, si muchos salen iguales (una mesa tiene 16 y
   * solo cambian el tecleo y el parpadeo): los que den lo mismo comparten
   * dibujo, que es lo que más cuesta. Sin él, cada fotograma el suyo.
   */
  same?: (frame: number, props: Props) => string
}

/** Patas o postes: cajas de `size × size` desde el suelo hasta `height`. */
export function posts(
  sprite: Sprite,
  points: readonly (readonly [number, number])[],
  height: number,
  shades: Shades,
  size = 1,
): void {
  for (const [x, y] of points) sprite.box(x, y, 0, size, size, height, shades)
}
