/** Lo que se traduce de un punto del curso: lo que lee quien juega. */

import type { Theory } from '../types.js'

export type LevelText = {
  title: string
  goal: string
  theory: Theory
}
