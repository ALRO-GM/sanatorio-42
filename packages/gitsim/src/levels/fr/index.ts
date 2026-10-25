/**
 * El curso de git en francés: los textos de cada punto, de cada prueba de
 * grupo y de cada misión. Lo que falte aquí sale en inglés (`../en/index.ts`).
 */

import type { LevelText } from '../en/types.js'
import { BASICS_FR } from './basics.js'
import { SHARED_FR } from './shared.js'

export const LEVELS_FR: Readonly<Record<string, LevelText>> = { ...BASICS_FR, ...SHARED_FR }

export { GROUPS_FR, MISSION_ITEMS_FR } from './groups.js'
