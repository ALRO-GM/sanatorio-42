import type { Axis } from '@sanatorio/startup'

import type { Shades, Sprite } from '../sprite'

/** Lo que cambia un mismo modelo de un sitio a otro. Cada modelo mira lo que le toca. */
export type Props = {
  /** El nivel de lo comprado (ordenador, servidores, espacio…) o cuántos hay. */
  level?: number
  /** Quien se sienta, si alguien: su aspecto (0-999)… */
  look?: number
  /** …y su especialidad, o el modelo de negocio de lo que se dibuja. */
  axis?: Axis | null
  /** Si trabaja: teclea y parpadea. Si no, se queda quieto. */
  busy?: boolean
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
