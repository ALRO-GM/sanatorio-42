/**
 * La tubería entera, de un extremo al otro: cargar → trocear → indexar →
 * buscar → fusionar → reordenar → montar el prompt → responder. Cada mando de
 * `Config` es algo que se ajusta en el banco de pruebas del curso; `ask`
 * devuelve todo lo que pasó con una pregunta (para verlo) y `evaluate` lo
 * resume en métricas sobre un conjunto de preguntas (para medirlo).
 *
 * Todo es determinista: la misma configuración da siempre lo mismo, en el
 * navegador y en la API.
 */

import { bm25, buildLexical } from './bm25.js'
import type { LexicalIndex } from './bm25.js'
import { chunkDocs } from './chunk.js'
import type { Chunk, Chunker } from './chunk.js'
import { DOCS, SOURCES } from './corpus.js'
import type { Doc, Source } from './corpus.js'
import { buildSemantic, similarities } from './embed.js'
import type { SemanticIndex } from './embed.js'
import { bestSentence, buildPrompt, generate } from './generate.js'
import type { Answer, Prompt, PromptOrder } from './generate.js'
import { clamp, LIMITS } from './limits.js'
import { goldSpans, questionOf } from './questions.js'
import type { Question } from './questions.js'
import { ranked, rerank, rrf } from './rank.js'
import type { Fused, Scored } from './rank.js'
import { countTokens } from './text.js'

export type Mode = 'lexical' | 'semantic' | 'hybrid'

export type Config = {
  /** Con `false` no se busca nada: el modelo contesta solo, de memoria. */
  context: boolean
  /** Qué se carga del repositorio. */
  sources: Source[]
  chunker: Chunker
  /** Palabras por trozo y palabras que se repiten entre un trozo y el siguiente. */
  size: number
  overlap: number
  normalize: boolean
  stopwords: boolean
  stem: boolean
  mode: Mode
  k1: number
  b: number
  /** Peso de la lista semántica en la fusión (0: solo léxica; 1: solo semántica). */
  weight: number
  /** La constante `k` de RRF. */
  rrfK: number
  rerank: boolean
  /** Cuántos de los primeros se reordenan. */
  depth: number
  /** Cuántos trozos se recuperan. */
  k: number
  /** Tokens que puede ocupar el prompt. */
  budget: number
  order: PromptOrder
  /** Numerar las fuentes en el prompt, para poder citarlas. */
  labels: boolean
  /** Responder solo con lo que el contexto respalda (si no, «no lo sé»). */
  strict: boolean
  minSupport: number
  /** Producción: reindexar solo lo que cambió, caché de consultas y cómo se usa. */
  incremental: boolean
  cache: boolean
  cacheKey: 'raw' | 'normalized'
  invalidate: boolean
}

/** Un RAG razonable de partida: cada unidad estropea o quita una parte para que la arregles. */
export const DEFAULTS: Config = {
  context: true,
  sources: ['docs', 'code'],
  chunker: 'structure',
  size: 60,
  overlap: 0,
  normalize: true,
  stopwords: true,
  stem: true,
  mode: 'hybrid',
  k1: 1.2,
  b: 0.75,
  weight: 0.5,
  rrfK: 60,
  rerank: false,
  depth: 5,
  k: 3,
  budget: 300,
  order: 'best',
  labels: true,
  strict: true,
  minSupport: 3,
  incremental: false,
  cache: false,
  cacheKey: 'raw',
  invalidate: false,
}

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const num = (value: unknown, fallback: number, min: number, max: number, step: number): number =>
  typeof value === 'number'
    ? Math.round(Math.round(clamp(value, min, max) / step) * step * 100) / 100
    : fallback

/**
 * Una configuración válida a partir de lo que llegue (de la web, de la API):
 * lo que falta o no vale se queda como en `base`, y cada número, dentro de sus
 * topes y con su paso. Nunca falla.
 */
export function configOf(input: unknown, base: Config = DEFAULTS): Config {
  // Solo lo que el objeto trae como propio: nada heredado de un prototipo.
  const given: Record<string, unknown> =
    typeof input === 'object' && input !== null ? Object.fromEntries(Object.entries(input)) : {}
  const sources = Array.isArray(given.sources)
    ? SOURCES.filter((source) => (given.sources as unknown[]).includes(source))
    : base.sources
  const size = num(given.size, base.size, LIMITS.minSize, LIMITS.maxSize, 1)

  return {
    context: flag(given.context, base.context),
    sources,
    chunker: oneOf(given.chunker, ['fixed', 'structure'], base.chunker),
    size,
    overlap: Math.min(num(given.overlap, base.overlap, 0, LIMITS.maxSize, 1), Math.floor(size / 2)),
    normalize: flag(given.normalize, base.normalize),
    stopwords: flag(given.stopwords, base.stopwords),
    stem: flag(given.stem, base.stem),
    mode: oneOf(given.mode, ['lexical', 'semantic', 'hybrid'], base.mode),
    k1: num(given.k1, base.k1, 0, 3, 0.1),
    b: num(given.b, base.b, 0, 1, 0.05),
    weight: num(given.weight, base.weight, 0, 1, 0.1),
    rrfK: num(given.rrfK, base.rrfK, 1, 100, 1),
    rerank: flag(given.rerank, base.rerank),
    depth: num(given.depth, base.depth, 1, LIMITS.maxDepth, 1),
    k: num(given.k, base.k, 1, LIMITS.maxK, 1),
    budget: num(given.budget, base.budget, LIMITS.minBudget, LIMITS.maxBudget, 10),
    order: oneOf(given.order, ['best', 'worst', 'file'], base.order),
    labels: flag(given.labels, base.labels),
    strict: flag(given.strict, base.strict),
    minSupport: num(given.minSupport, base.minSupport, 1, 8, 1),
    incremental: flag(given.incremental, base.incremental),
    cache: flag(given.cache, base.cache),
    cacheKey: oneOf(given.cacheKey, ['raw', 'normalized'], base.cacheKey),
    invalidate: flag(given.invalidate, base.invalidate),
  }
}

export type Index = {
  docs: readonly Doc[]
  chunks: Chunk[]
  lexical: LexicalIndex
  semantic: SemanticIndex
}

const built = new Map<string, Index>()

/** Una huella corta de un texto (FNV-1a): para saber si dos corpus son el mismo sin compararlos enteros. */
function fingerprint(text: string): number {
  let hash = 0x811c9dc5

  for (let at = 0; at < text.length; at += 1)
    hash = Math.imul(hash ^ text.charCodeAt(at), 0x01000193) >>> 0

  return hash
}

/** El índice de una configuración (se guarda: muchas ejecuciones comparten troceado). */
export function indexOf(config: Config, docs: readonly Doc[] = DOCS): Index {
  const key = JSON.stringify([
    config.sources,
    config.chunker,
    config.size,
    config.overlap,
    config.normalize,
    config.stopwords,
    config.stem,
    docs === DOCS ? '' : docs.map((doc) => fingerprint(doc.text)),
  ])
  const cached = built.get(key)

  if (cached !== undefined) return cached

  const loaded = docs.filter((doc) => config.sources.includes(doc.source))
  const chunks = chunkDocs(loaded, config)
  const index: Index = {
    docs: loaded,
    chunks,
    lexical: buildLexical(chunks, config),
    semantic: buildSemantic(chunks),
  }

  if (built.size >= LIMITS.cache) built.delete(built.keys().next().value ?? '')
  built.set(key, index)

  return index
}

/** Lo que cuesta cada etapa, en milisegundos de mentira (pero con las proporciones de verdad). */
export const COST = {
  lexical: 4,
  semantic: 18,
  /** Por cada trozo que lee el reordenado. */
  rerank: 9,
  generate: 30,
  /** Por cada token del prompt. */
  token: 0.2,
  /** Una respuesta que sale de la caché. */
  cached: 1,
} as const

/** Todo lo que pasó con una pregunta, etapa por etapa. */
export type Trace = {
  question: string
  lexical: Scored[]
  semantic: Scored[]
  /** La lista fusionada (solo en modo híbrido). */
  fused: Fused[] | null
  /** La lista tras reordenar (si se reordena). */
  reranked: Scored[] | null
  /** La lista final, entera, y los `k` que se recuperan. */
  ranking: Scored[]
  found: Chunk[]
  prompt: Prompt | null
  answer: Answer
  latency: number
}

/** Hace una pregunta a la tubería. */
export function ask(config: Config, question: string, docs: readonly Doc[] = DOCS): Trace {
  const empty = { lexical: [], semantic: [], fused: null, reranked: null, ranking: [], found: [] }

  if (!config.context)
    return {
      question,
      ...empty,
      prompt: null,
      answer: generate(question, null, { strict: false, minSupport: config.minSupport }),
      latency: COST.generate,
    }

  const index = indexOf(config, docs)
  const chunkAt = (at: number): Chunk | undefined => index.chunks[at]
  const lexical = config.mode === 'semantic' ? [] : ranked(bm25(index.lexical, question, config))
  const semantic = config.mode === 'lexical' ? [] : ranked(similarities(index.semantic, question))
  const fused = config.mode === 'hybrid' ? rrf(lexical, semantic, config.weight, config.rrfK) : null
  const first = fused ?? (config.mode === 'lexical' ? lexical : semantic)
  const depth = Math.min(config.depth, first.length)
  const reranked = config.rerank
    ? rerank(first, depth, (at) => {
        const chunk = chunkAt(at)

        return chunk === undefined ? 0 : (bestSentence(question, chunk)?.support ?? 0)
      })
    : null
  const ranking = reranked ?? first
  const found = ranking.slice(0, config.k).flatMap((each) => chunkAt(each.at) ?? [])
  const prompt = buildPrompt(
    found,
    (chunk) => index.chunks.indexOf(chunk),
    countTokens(question),
    config,
  )
  const latency =
    (config.mode === 'semantic' ? 0 : COST.lexical) +
    (config.mode === 'lexical' ? 0 : COST.semantic) +
    (config.rerank ? COST.rerank * depth : 0) +
    COST.generate +
    COST.token * prompt.tokens

  return {
    question,
    lexical,
    semantic,
    fused,
    reranked,
    ranking,
    found,
    prompt,
    answer: generate(question, prompt, config),
    latency: Math.round(latency),
  }
}

/** Si un trozo contiene entera alguna de las frases con la respuesta. */
export function hits(chunk: Chunk, spans: readonly [string, number, number][]): boolean {
  return spans.some(
    ([doc, start, end]) => chunk.doc === doc && chunk.start <= start && chunk.end >= end,
  )
}

/** En qué etapa se pierde la respuesta de una pregunta (o `ok` si llega hasta el final). */
export type Stage = 'chunking' | 'retrieval' | 'prompt' | 'generation' | 'ok'

export const STAGES: readonly Stage[] = ['chunking', 'retrieval', 'prompt', 'generation', 'ok']

/** Lo que pasó con una pregunta del conjunto de referencia, ya comparado con su respuesta. */
export type Judged = {
  question: Question
  trace: Trace
  /** Puesto del primer trozo que acierta en la lista final (`null`: no está). */
  rank: number | null
  /** De los `k` recuperados, cuántos aciertan. */
  relevant: number
  /** Si algún trozo del índice contiene entera la frase con la respuesta. */
  whole: boolean
  /** Si un trozo que acierta entró en el prompt. */
  inPrompt: boolean
  /** Si la respuesta sale de la frase buena. */
  correct: boolean
  stage: Stage
}

export function judge(config: Config, question: Question, docs: readonly Doc[] = DOCS): Judged {
  const trace = ask(config, question.text, docs)
  const index = config.context ? indexOf(config, docs) : null
  const spans = goldSpans(question, docs)
  const good = (chunk: Chunk | undefined): boolean => chunk !== undefined && hits(chunk, spans)
  const first = trace.ranking.findIndex((each) => good(index?.chunks[each.at]))
  const rank = first < 0 ? null : first + 1
  const inPrompt = (trace.prompt?.items ?? []).some((item) => item.included && good(item.chunk))
  const answer = trace.answer
  // Acierta si la frase que devuelve es (parte de) la buena y el trozo del que sale la trae entera.
  const correct =
    answer.kind === 'grounded' &&
    good(index?.chunks.find((chunk) => chunk.id === answer.chunk)) &&
    spans.some(
      ([doc, start, end]) => answer.doc === doc && answer.start < end && answer.end > start,
    )
  const whole = (index?.chunks ?? []).some(good)
  const lost: Stage = !whole
    ? 'chunking'
    : rank === null || rank > config.k
      ? 'retrieval'
      : !inPrompt
        ? 'prompt'
        : 'generation'
  // Sin respuesta en el corpus, lo único que puede fallar es no decir «no lo sé».
  const stage: Stage =
    question.kind === 'none' ? (answer.kind === 'idk' ? 'ok' : 'generation') : correct ? 'ok' : lost

  return {
    question,
    trace,
    rank,
    relevant: trace.found.filter(good).length,
    whole,
    inPrompt,
    correct,
    stage,
  }
}

/** Las métricas de una configuración sobre un conjunto de preguntas. */
export type Metrics = Record<string, number>

const share = (count: number, total: number): number => (total === 0 ? 1 : count / total)

/**
 * Mide una configuración. Las de recuperar (`recall@n`, `precision`, `mrr`) y
 * las de responder (`context`, `answers`, `cited`) cuentan solo las preguntas
 * que tienen respuesta; `abstain`, las que no la tienen; `invented`, todas.
 */
export function evaluate(
  config: Config,
  ids: readonly string[],
  docs: readonly Doc[] = DOCS,
): { metrics: Metrics; judged: Judged[] } {
  const judged = ids.flatMap((id) => {
    const question = questionOf(id)

    return question === undefined ? [] : [judge(config, question, docs)]
  })
  const answerable = judged.filter((each) => each.question.kind !== 'none')
  const rest = judged.filter((each) => each.question.kind === 'none')
  const total = answerable.length
  const within = (n: number): number =>
    share(answerable.filter((each) => each.rank !== null && each.rank <= n).length, total)
  const index = config.context ? indexOf(config, docs) : null
  const from = (source: Source): number =>
    (index?.chunks ?? []).filter(
      (chunk) => index?.docs.find((doc) => doc.path === chunk.doc)?.source === source,
    ).length
  const sum = (value: (each: Judged) => number, list: readonly Judged[] = judged): number =>
    list.reduce((all, each) => all + value(each), 0)

  return {
    judged,
    metrics: {
      'recall@1': within(1),
      'recall@3': within(3),
      'recall@5': within(5),
      'recall@k': within(config.k),
      precision: total === 0 ? 1 : sum((each) => each.relevant, answerable) / (total * config.k),
      mrr:
        total === 0
          ? 1
          : sum((each) => (each.rank === null || each.rank > 10 ? 0 : 1 / each.rank), answerable) /
            total,
      context: share(answerable.filter((each) => each.inPrompt).length, total),
      answers: share(answerable.filter((each) => each.correct).length, total),
      cited: share(
        answerable.filter(
          (each) =>
            each.correct &&
            each.trace.answer.kind === 'grounded' &&
            each.trace.answer.cite !== null,
        ).length,
        total,
      ),
      // La evaluación rápida: que el texto de la respuesta diga lo esperado, salga de donde salga.
      match: share(
        answerable.filter((each) => {
          const answer = each.trace.answer

          return (
            answer.kind === 'grounded' &&
            each.question.says.some((text) =>
              answer.text.toLowerCase().includes(text.toLowerCase()),
            )
          )
        }).length,
        total,
      ),
      abstain: share(rest.filter((each) => each.trace.answer.kind === 'idk').length, rest.length),
      invented: judged.filter((each) => each.trace.answer.kind === 'memory').length,
      // De trocear: en cuántas preguntas la frase con la respuesta quedó entera en algún trozo.
      whole: share(answerable.filter((each) => each.whole).length, total),
      chunks: index?.chunks.length ?? 0,
      k: config.k,
      tokens: Math.max(0, ...judged.map((each) => each.trace.prompt?.tokens ?? 0)),
      latency:
        judged.length === 0 ? 0 : Math.round(sum((each) => each.trace.latency) / judged.length),
      secrets: from('env'),
      leaks: from('eval'),
      noise: from('lock'),
    },
  }
}
