/**
 * Redes IPv4 simuladas para el curso de NetPractice de Peer4U: direcciones y
 * máscaras, máquinas, switches, routers con su tabla de rutas e internet, y un
 * `ping` que sigue el paquete salto a salto y dice dónde y por qué muere. El
 * mismo motor en la web (el esquema, los ejemplos) y en la API (que vuelve a
 * mirar cada intento). Es puro: sin ficheros, sin red de verdad y sin `eval`.
 */

export {
  bitsOf,
  formatIp,
  fromBits,
  isPrivate,
  maskOf,
  parseDest,
  parseIp,
  parseMask,
  prefixFor,
  reservedKind,
  subnetOf,
} from './ip.js'
export type { Subnet } from './ip.js'
export { LIMITS, NetError } from './limits.js'
export type {
  Death,
  DeathCode,
  Goal,
  Hop,
  Iface,
  Leg,
  Network,
  Node,
  NodeKind,
  Route,
  Trace,
} from './model.js'
export { ping } from './ping.js'
export {
  BLOCKS,
  checkAttempt,
  encodeEntry,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  evaluate,
  exampleOf,
  fieldsOf,
  FINALS,
  goalKey,
  goalOf,
  questionsOf,
  schemeOf,
  solutionOf,
  starGoals,
  startOf,
  theoryWords,
  TIERS,
  timeGoalsOf,
  unitIn,
  unitOf,
  UNITS,
  wire,
} from './course/index.js'
export type {
  Ask,
  Attempt,
  Block,
  Evaluation,
  ExampleRun,
  Field,
  FieldKind,
  Question,
  Scheme,
  Tier,
  Unit,
  UnitText,
  Values,
} from './course/index.js'
