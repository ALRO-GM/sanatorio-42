/** El camino del curso de git: los mundos en orden, y cómo jugar cada punto. */

import { WORLD_0, WORLD_1 } from './basics.js'
import { WORLD_2, WORLD_3, WORLD_4, WORLD_5 } from './shared.js'
import type { Level } from './types.js'

export const LEVELS: Level[] = [
  ...WORLD_0,
  ...WORLD_1,
  ...WORLD_2,
  ...WORLD_3,
  ...WORLD_4,
  ...WORLD_5,
]

export function levelOf(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id)
}

export { checkAttempt, goalOfLevel, solvedOf, starGoals, starsOf, startOf, tally } from './build.js'
export type { Attempt, Tally } from './build.js'
export {
  estimateOfGate,
  estimateOfGitCourse,
  estimateOfLevel,
  estimateOfWorld,
  WORLDS,
} from './estimate.js'
export type { Level, Theory } from './types.js'
export { levelIn, LEVELS_EN, missionIn, missionItemIn } from './en/index.js'
export { GROUPS_EN, MISSION_ITEMS_EN } from './en/groups.js'
export { GROUPS_FR, LEVELS_FR, MISSION_ITEMS_FR } from './fr/index.js'
export { gateOf, GATES } from './gates.js'
export type { Gate } from './gates.js'
export {
  farApart,
  filled,
  GROUP_MISSIONS,
  groupStart,
  MAX_PLAYERS,
  missionDone,
  missionOf,
  PREFIXES,
} from './groups.js'
export type { GroupMission, GroupPlayer, MissionItem } from './groups.js'
