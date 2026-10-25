/**
 * Git simulado para el curso de git de Not-games. El mismo motor en la web
 * (la terminal y las animaciones) y en la API (que vuelve a ejecutar los retos
 * y lleva las pruebas de grupo).
 */

export { goalOf, missing, shape } from './compare.js'
export type { Goal, Miss } from './compare.js'
export { ancestors, emptyRepo, GitError, headId, isAncestor, mergeBase } from './model.js'
export type { Commit, Files, Head, Remote, Repo } from './model.js'
export { LIMITS } from './limits.js'
export { resolve, run, runAll, threeWay, tokenize } from './run.js'
export type { RunResult, World } from './run.js'
export {
  checkAttempt,
  estimateOfGate,
  estimateOfGitCourse,
  estimateOfLevel,
  estimateOfWorld,
  gateOf,
  farApart,
  filled,
  GATES,
  goalOfLevel,
  GROUP_MISSIONS,
  groupStart,
  LEVELS,
  levelIn,
  levelOf,
  LEVELS_EN,
  missionIn,
  missionItemIn,
  GROUPS_EN,
  MISSION_ITEMS_EN,
  MAX_PLAYERS,
  missionDone,
  missionOf,
  PREFIXES,
  solvedOf,
  starGoals,
  starsOf,
  startOf,
  tally,
  WORLDS,
} from './levels/index.js'
export type {
  Attempt,
  Gate,
  GroupMission,
  GroupPlayer,
  Level,
  MissionItem,
  Tally,
  Theory,
} from './levels/index.js'
