/**
 * Un RAG (Retrieval-Augmented Generation) en miniatura para el curso de RAG de
 * Peer4U (`docs/curso-rag.md`): un corpus pequeño inventado, troceadores,
 * tokenizador, BM25, embeddings deterministas de juguete, coseno, RRF,
 * reordenado, montaje del prompt con presupuesto, un «generador» que responde
 * extrayendo y citando (o dice «no lo sé») y las métricas para medirlo. El
 * mismo motor en la web (los ejemplos y el banco de pruebas) y en la API (que
 * vuelve a corregir cada intento). No lee ficheros, no usa la red ni ejecuta
 * ningún modelo: todo son cuentas sobre cadenas.
 */

export { LIMITS } from './limits.js'
export { DOCS, docOf } from './corpus.js'
export type { Doc, Source } from './corpus.js'
export { countTokens, tokenize } from './text.js'
export type { Chunk } from './chunk.js'
export { CONCEPTS, cosine, embed } from './embed.js'
export { MEMORY, sentences } from './generate.js'
export type { Answer, Prompt, PromptItem } from './generate.js'
export { rrf } from './rank.js'
export type { Fused, Scored } from './rank.js'
export { QUESTIONS, questionOf } from './questions.js'
export type { Question } from './questions.js'
export { ask, configOf, COST, DEFAULTS, evaluate, indexOf, judge, STAGES } from './pipeline.js'
export type { Config, Index, Judged, Metrics, Mode, Stage, Trace } from './pipeline.js'
export { API_ROUTES, runWorkload } from './ops.js'
export type { ApiRequest, ApiResponse, ApiSource, OpsResult, OpsStep } from './ops.js'
export {
  accepts,
  askView,
  baseOf,
  BLOCKS,
  blockOf,
  caseView,
  checkAttempt,
  checkRun,
  encodeRun,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  exampleOf,
  FINALS,
  KNOBS,
  measure,
  missing,
  objectivesOf,
  orderView,
  parseRun,
  respond,
  starGoals,
  tally,
  targetOf,
  TIERS,
  timeGoalsOf,
  tuned,
  unitIn,
  unitOf,
  UNITS,
} from './course/index.js'
export type {
  ApiTask,
  Ask,
  AskView,
  Attempt,
  Block,
  BuildStep,
  CalcTask,
  CaseView,
  Focus,
  FrameView,
  Knob,
  KnobSpec,
  Objective,
  OrderTask,
  OrderView,
  PickCase,
  PickTask,
  Run,
  Tally,
  Task,
  Tier,
  TuneTask,
  Unit,
  UnitDef,
  UnitText,
} from './course/index.js'
