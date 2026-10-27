import type { Axis } from '@sanatorio/startup'

/**
 * Los colores de los dibujos de la startup. Son de ilustración plana, iguales
 * en claro y en oscuro (como los post-its): por eso hexadecimales.
 *
 * Cada modelo de negocio tiene el suyo, del mismo orden repartido por la rueda
 * que la Red (`network/colors.ts`).
 */
export const AXIS_COLOR: Record<Axis, string> = {
  front: '#3b8fe0',
  back: '#ef7d3a',
  data: '#3cb46e',
  ai: '#b25be0',
  infra: '#e6b326',
}

/** Tonos de piel, pelo y ropa: el aspecto sale de `look` (0-999) de cada persona. */
export const SKIN = ['#f5d0b5', '#e8b48f', '#c98c62', '#9a6340', '#6b4128']
export const HAIR = ['#2b2118', '#5a3a22', '#a8743a', '#d9b86a', '#8a8f99', '#c4553b']

export const INK = '#2f3a45'
export const METAL = '#9aa7b4'
export const WOOD = '#c9925c'
export const LEAF = '#4caf63'
export const GLOW = '#9ff3ff'

/** Lo que toca de una lista según `look`, saltando de a `step` para que no vayan a la par. */
export const pick = <T>(list: readonly T[], look: number, step = 1): T =>
  list[Math.floor(look / step) % list.length] as T
