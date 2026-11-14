/**
 * El francés del curso de RAG: los textos de cada unidad (por id, uno por
 * nivel) y de cada bloque (por número). Se juntan con el castellano y el
 * inglés en `course/index.ts`.
 */

import type { UnitText } from '../types.js'
import { ADVANCED_FR } from './advanced.js'
import { BEGINNER_FR } from './beginner.js'
import { INTERMEDIATE_FR } from './intermediate.js'

export { BLOCKS_FR } from './blocks.js'

export const UNITS_FR: Record<string, UnitText> = {
  ...BEGINNER_FR,
  ...INTERMEDIATE_FR,
  ...ADVANCED_FR,
}
