import type { Axis } from '@sanatorio/startup'

import type { Color, Shades } from './sprite'

/**
 * La paleta de los dibujos en píxeles: la misma en claro y en oscuro (la
 * oficina es una ilustración, como los post-its). Todo lo que se añada debería
 * salir de aquí, para que case con lo que ya hay.
 *
 * Las cajas llevan tres tonos (`Shades`): arriba, el más claro; la cara de la
 * izquierda, el medio; la de la derecha, el más oscuro. La luz viene siempre
 * de arriba a la izquierda.
 */
export const WOOD: Shades = ['#d99a5b', '#b87440', '#8f552d']
export const PLYWOOD: Shades = ['#ecc893', '#d1a66c', '#a87f4c']
export const METAL: Shades = ['#8a8fa8', '#666b85', '#4b4f66']
export const NAVY: Shades = ['#4a5891', '#33406e', '#242e52']
export const SILVER: Shades = ['#e6e9f0', '#c3c8d6', '#9ea4b8']
export const DARK: Shades = ['#4a5170', '#30354d', '#22263a']
export const POT: Shades = ['#e08a5c', '#c4643a', '#9a4a2a']
export const MUSTARD: Shades = ['#f2c95c', '#dba43a', '#b9822a']
export const WATER: Shades = ['#bfe6ff', '#9ad6ff', '#6fb6e6']
export const PORCELAIN: Shades = ['#ffffff', '#e8e4ee', '#c9c3d4']
export const GLASS: Shades = ['#cfe9f7', '#a9d3ea', '#86b7d4']

export const SOIL = '#4a3326'
export const LEAF = ['#2f6b3a', '#43914a', '#6dbb5a', '#a3dc72'] as const

export const SCREEN = '#16223d'
export const GLOW = '#7fd4ff'
export const CODE = ['#8ff0a4', '#ffd27a', '#ff8fa8'] as const

export const LED = {
  green: '#53ff8f',
  amber: '#ffb84d',
  red: '#ff5d5d',
  blue: '#5cc8ff',
  off: '#3a4058',
}

export const GOLD = { light: '#fff6c4', mid: '#ffd04d', dark: '#b9761c' }
export const OCEAN = ['#3f8fd9', '#2f6fb5'] as const
export const LAND = ['#6dbb5a', '#43914a'] as const
export const FLAME = ['#ffe27a', '#ffb02e', '#ef7d3a'] as const
export const STEAM = '#f4f0fa'
export const RED = '#e0524f'
export const BOARD = '#f4f5fa'

/**
 * El color de cada modelo de negocio, el mismo que en las tarjetas y en el
 * ranking (`art/palette.ts`), con su tono oscuro para las sombras.
 */
export const AXIS_SHADES: Record<Axis, Shades> = {
  front: ['#6fb0ef', '#3b8fe0', '#2a6cb0'],
  back: ['#f6a26c', '#ef7d3a', '#c25e22'],
  data: ['#6fd096', '#3cb46e', '#2b8a52'],
  ai: ['#cc8cee', '#b25be0', '#8b3fb6'],
  infra: ['#f2cd5c', '#e6b326', '#b88a12'],
}

/** La ropa de quien aún no tiene modelo de negocio. */
export const PLAIN: Shades = ['#a7b0bd', '#7d8a99', '#5e6a78']

/** Pieles y pelos de las personas: cada una con su tono de sombra. */
export const SKIN: readonly (readonly [Color, Color])[] = [
  ['#f5d0b5', '#dcae8d'],
  ['#e8b48f', '#cc9670'],
  ['#c98c62', '#a8714a'],
  ['#9a6340', '#7d4d2f'],
  ['#6b4128', '#54311d'],
]
export const HAIR: readonly Color[] = [
  '#2b2118',
  '#5a3a22',
  '#a8743a',
  '#d9b86a',
  '#8a8f99',
  '#c4553b',
]
