import type { Axis, Role } from '@sanatorio/startup'

import type { Shades } from './sprite'

/**
 * La paleta de los dibujos en píxeles: la misma en claro y en oscuro (la
 * oficina es una ilustración, como los post-its). Todo lo que se añada debería
 * salir de aquí, para que case con lo que ya hay.
 *
 * Las cajas llevan tres tonos (`Shades`): arriba, el más claro; la cara de la
 * izquierda, el medio; la de la derecha, el más oscuro. La luz viene siempre
 * de arriba a la izquierda.
 */
export const WOOD: Shades = ['#e2a865', '#c07e45', '#965a30']
export const PLYWOOD: Shades = ['#f2d29e', '#d9ac70', '#b0834e']
export const METAL: Shades = ['#b3a196', '#8c786c', '#6a574d']
export const NAVY: Shades = ['#4a6a80', '#344f63', '#26394a']
export const SILVER: Shades = ['#f4ede4', '#dbcfc2', '#b9aa9a']
export const DARK: Shades = ['#5e4a56', '#45343f', '#32252e']
export const POT: Shades = ['#e8956a', '#c96e44', '#9e4f30']
export const MUSTARD: Shades = ['#f2c95c', '#dba43a', '#b9822a']
export const WATER: Shades = ['#b6e8e2', '#8ed4cc', '#62b0a8']
export const PORCELAIN: Shades = ['#fffaf2', '#ede4d8', '#cfc2b2']
export const GLASS: Shades = ['#d4ece6', '#acd6cc', '#88b8ac']

export const SOIL = '#5a3a28'
export const LEAF = ['#2e6a3c', '#46944c', '#74bf5a', '#b0e07a'] as const

export const SCREEN = '#1e2a3a'
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
export const STEAM = '#fbf4ec'
export const RED = '#e0524f'
export const BOARD = '#fbf7ee'

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

/**
 * La ropa de cada oficio que no programa (`ROLES`): recepción de chaqueta,
 * limpieza en verde agua, reparto en marrón, cocina de blanco, seguridad de
 * azul oscuro y mantenimiento con su mono naranja.
 */
export const UNIFORM: Record<Role, Shades> = {
  reception: ['#7aa5c9', '#4f7fa8', '#3a6286'],
  cleaning: ['#6fd1c4', '#2fa59a', '#22807a'],
  delivery: ['#c9965f', '#9a6b3c', '#7a522c'],
  kitchen: ['#ffffff', '#eceaf2', '#c9c5d6'],
  security: ['#4a5476', '#2d3450', '#20263c'],
  maintenance: ['#f6a65a', '#e8822e', '#bb6420'],
}

/** La decoración: tapicería, piedra, corcho, teclas, neón y el agua del acuario. */
export const TEAL: Shades = ['#5fc2b6', '#3a9e93', '#2a776f']
export const PLUM: Shades = ['#b07ab8', '#8a5594', '#683e70']
export const STONE: Shades = ['#ece2d2', '#cbbda8', '#a69580']
export const CORK = '#c8955a'
export const CHERRY: Shades = ['#e86a5f', '#c94a40', '#9c362e']
export const BRASS: Shades = [GOLD.light, GOLD.mid, GOLD.dark]
export const NEON = ['#ff6fd8', '#6ff7ff', '#fff27a'] as const
export const SEA = ['#4fb3e8', '#2f86c4'] as const
export const LIGHT = '#fff3b0'

/** Cartón de las cajas de la mudanza y de los paquetes. */
export const CARDBOARD: Shades = ['#e2b878', '#c4955a', '#9f7442']

/** La ropa de quien aún no tiene modelo de negocio. */
export const PLAIN: Shades = ['#c9b8a4', '#a6927c', '#82705e']
