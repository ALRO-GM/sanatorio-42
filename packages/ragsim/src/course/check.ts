/**
 * El banco de pruebas: qué se ve en cada tarea, qué manda la web al comprobar
 * y cómo se corrige. Una **ejecución** es un JSON pequeño (los mandos, los
 * números, lo elegido, el orden o la petición); la web manda las que hiciste,
 * en orden, y `checkAttempt` las vuelve a corregir una a una con este mismo
 * motor. Mirar y probar una consulta no es una ejecución: no se manda ni
 * cuenta.
 */

import { starsFor, starsForTime, timeGoals, tryGoals } from '@sanatorio/course'
import type { StarGoals, Stars, TimeGoals } from '@sanatorio/course'

import { buildLexical, idf } from '../bm25.js'
import { chunkDocs } from '../chunk.js'
import type { Chunk } from '../chunk.js'
import { DOCS } from '../corpus.js'
import { conceptCounts, CONCEPTS, cosine } from '../embed.js'
import { clamp, LIMITS } from '../limits.js'
import { handle, runWorkload } from '../ops.js'
import type { ApiRequest, ApiResponse, OpsResult } from '../ops.js'
import { ask, configOf, DEFAULTS, evaluate, hits, indexOf, judge, STAGES } from '../pipeline.js'
import type { Config, Judged, Metrics } from '../pipeline.js'
import { goldSpans, questionOf } from '../questions.js'
import type { Question } from '../questions.js'
import { rrfTerm } from '../rank.js'
import { ALL_TOKEN_OPTIONS, tokenize } from '../text.js'
import type {
  ApiTask,
  Ask,
  Frame,
  Knob,
  OrderTask,
  PickCase,
  Setup,
  Task,
  TuneTask,
  UnitDef,
} from './types.js'

/* ---------- Ajustar la tubería ---------- */

/** Cómo es cada mando en el banco de pruebas. */
export type KnobSpec =
  | { type: 'flag' }
  | { type: 'choice'; options: readonly string[] }
  | { type: 'many'; options: readonly string[] }
  | { type: 'range'; min: number; max: number; step: number }

export const KNOBS: Record<Knob, KnobSpec> = {
  context: { type: 'flag' },
  sources: { type: 'many', options: ['docs', 'code', 'lock', 'env', 'eval'] },
  chunker: { type: 'choice', options: ['fixed', 'structure'] },
  size: { type: 'range', min: 10, max: 120, step: 5 },
  overlap: { type: 'range', min: 0, max: 30, step: 5 },
  normalize: { type: 'flag' },
  stopwords: { type: 'flag' },
  stem: { type: 'flag' },
  mode: { type: 'choice', options: ['lexical', 'semantic', 'hybrid'] },
  k1: { type: 'range', min: 0, max: 3, step: 0.1 },
  b: { type: 'range', min: 0, max: 1, step: 0.05 },
  weight: { type: 'range', min: 0, max: 1, step: 0.1 },
  rrfK: { type: 'range', min: 1, max: 100, step: 1 },
  rerank: { type: 'flag' },
  depth: { type: 'range', min: 1, max: LIMITS.maxDepth, step: 1 },
  k: { type: 'range', min: 1, max: LIMITS.maxK, step: 1 },
  budget: { type: 'range', min: LIMITS.minBudget, max: LIMITS.maxBudget, step: 10 },
  order: { type: 'choice', options: ['best', 'worst', 'file'] },
  labels: { type: 'flag' },
  strict: { type: 'flag' },
  minSupport: { type: 'range', min: 1, max: 8, step: 1 },
  incremental: { type: 'flag' },
  cache: { type: 'flag' },
  cacheKey: { type: 'choice', options: ['raw', 'normalized'] },
  invalidate: { type: 'flag' },
}

const config = (setup: Setup | undefined, base: Config = DEFAULTS): Config => configOf(setup, base)

/** La tubería de partida de una tarea de ajustar. */
export const baseOf = (task: TuneTask): Config => config(task.base)

/** La tubería con lo que alguien ha puesto en los mandos: solo se le hace caso en los de la tarea. */
export function tuned(task: TuneTask, given: unknown): Config {
  const input = (typeof given === 'object' && given !== null ? given : {}) as Record<
    string,
    unknown
  >

  return configOf(Object.fromEntries(task.knobs.map((knob) => [knob, input[knob]])), baseOf(task))
}

/** Lo que mide una configuración en una tarea (con las de producción, si la tarea las pide). */
export function measure(
  task: TuneTask,
  setup: Config,
  questions: readonly string[] = task.questions,
): { metrics: Metrics; judged: Judged[]; ops: OpsResult | null } {
  const { metrics, judged } = evaluate(setup, questions)
  const ops = task.workload === true ? runWorkload(setup) : null

  return {
    judged,
    ops,
    metrics:
      ops === null
        ? metrics
        : {
            ...metrics,
            'ops.embeddings': ops.embeddings,
            'ops.latency': ops.latency,
            'ops.hits': ops.hits,
            'ops.stale': ops.stale,
          },
  }
}

const targets = new WeakMap<TuneTask, Metrics>()

/** Los umbrales de una tarea: lo que mide su solución de referencia. */
export function targetOf(task: TuneTask): Metrics {
  const known = targets.get(task)

  if (known !== undefined) return known

  const measured = measure(task, tuned(task, task.solution.at(-1))).metrics
  const target = Object.fromEntries(
    task.objectives.map(({ metric }) => [metric, measured[metric] ?? 0]),
  )

  targets.set(task, target)

  return target
}

const EPSILON = 1e-9

/** Los objetivos que no cumple una medida. */
function unmet(task: TuneTask, metrics: Metrics): string[] {
  const target = targetOf(task)

  return task.objectives
    .filter(({ metric, op }) => {
      const value = metrics[metric] ?? 0
      const goal = target[metric] ?? 0

      return op === '>='
        ? value < goal - EPSILON
        : op === '<='
          ? value > goal + EPSILON
          : Math.abs(value - goal) > EPSILON
    })
    .map(({ metric }) => metric)
}

/* ---------- Calcular a mano ---------- */

/** Lo que se enseña de una pregunta de cálculo, y lo que vale. */
export type AskView = {
  ask: Ask
  expected: number
  /** Decimales con los que se pide (0: un entero exacto). */
  decimals: number
  /** Trozos o textos que hay que leer. */
  cards: { id: string; text: string }[]
  /** Datos sueltos: `['N', '7']`. */
  facts: [string, string][]
  /** Listas ordenadas: una fila por pregunta o por buscador; `mark` es «acierta». */
  rows: { label: string; cells: { text: string; mark: boolean }[] }[]
  formula: string
  /** El cálculo, paso a paso, con los números puestos. */
  steps: string[]
}

const fix = (value: number, decimals = 2): string => value.toFixed(decimals)

/** Un índice pequeño, solo con unos documentos, para contar a mano. */
function handIndex(paths: readonly string[]) {
  const chunks = chunkDocs(
    DOCS.filter((doc) => paths.includes(doc.path)),
    DEFAULTS,
  )

  return { chunks, lexical: buildLexical(chunks, ALL_TOKEN_OPTIONS) }
}

const termOf = (word: string): string => tokenize(word, ALL_TOKEN_OPTIONS)[0] ?? ''

const short = (chunk: Chunk | undefined): string => chunk?.id.replace(/^.*\//, '') ?? '—'

function judgedRow(setup: Config, question: Question, k: number): AskView['rows'][number] {
  const index = indexOf(setup)
  const spans = goldSpans(question, DOCS)

  return {
    label: question.text,
    cells: ask(setup, question.text)
      .ranking.slice(0, k)
      .map((each) => {
        const chunk = index.chunks[each.at]

        return { text: short(chunk), mark: chunk !== undefined && hits(chunk, spans) }
      }),
  }
}

const questions = (ids: readonly string[]): Question[] => ids.flatMap((id) => questionOf(id) ?? [])

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

export function askView(given: Ask): AskView {
  const view = (
    rest: Partial<AskView> & Pick<AskView, 'expected' | 'formula' | 'steps'>,
  ): AskView => ({
    ask: given,
    decimals: 2,
    cards: [],
    facts: [],
    rows: [],
    ...rest,
  })

  switch (given.kind) {
    case 'tf':
    case 'df':
    case 'idf': {
      const { chunks, lexical } = handIndex(given.docs)
      const term = termOf(given.term)
      const df = lexical.df.get(term) ?? 0
      const n = chunks.length

      if (given.kind === 'tf') {
        const at = chunks.findIndex((chunk) => chunk.id === given.chunk)
        const tf = lexical.tf[at]?.get(term) ?? 0

        return view({
          expected: tf,
          decimals: 0,
          cards: chunks.filter((chunk) => chunk.id === given.chunk),
          formula: 'tf(t, d)',
          steps: [`tf(«${given.term}», ${short(chunks[at])}) = ${tf}`],
        })
      }

      const cards = chunks.map(({ id, text }) => ({ id, text }))

      if (given.kind === 'df')
        return view({
          expected: df,
          decimals: 0,
          cards,
          formula: 'df(t)',
          steps: [`N = ${n}`, `df(«${given.term}») = ${df}`],
        })

      const value = idf(lexical, term)

      return view({
        expected: value,
        cards,
        facts: [['N', String(n)]],
        formula: 'idf = ln(1 + (N − df + 0.5) / (df + 0.5))',
        steps: [
          `N = ${n}, df(«${given.term}») = ${df}`,
          `idf = ln(1 + (${n} − ${df} + 0.5) / (${df} + 0.5))`,
          `idf = ln(${fix(1 + (n - df + 0.5) / (df + 0.5), 3)}) = ${fix(value)}`,
        ],
      })
    }
    case 'count': {
      const concept = CONCEPTS.filter((each) => each.id === given.concept)
      const count = conceptCounts(given.text, concept)[0] ?? 0

      return view({
        expected: count,
        decimals: 0,
        cards: [{ id: '', text: given.text }],
        facts: [[given.concept, (concept[0]?.terms ?? []).map((term) => `${term}…`).join(' ')]],
        formula: 'v[c]',
        steps: [`v[${given.concept}] = ${count}`],
      })
    }
    case 'cosine': {
      const concepts = CONCEPTS.filter((each) => given.concepts.includes(each.id))
      const a = conceptCounts(given.a, concepts)
      const b = conceptCounts(given.b, concepts)
      const dot = a.reduce((sum, value, at) => sum + value * (b[at] ?? 0), 0)
      const norm = (vector: readonly number[]): number =>
        Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
      const value = cosine(a, b)

      return view({
        expected: value,
        cards: [
          { id: 'a', text: given.a },
          { id: 'b', text: given.b },
        ],
        facts: [
          ['', concepts.map((each) => each.id).join(', ')],
          ['a', `(${a.join(', ')})`],
          ['b', `(${b.join(', ')})`],
        ],
        formula: 'cos(a, b) = a·b / (|a| × |b|)',
        steps: [
          `a·b = ${a.map((each, at) => `${each}×${b[at] ?? 0}`).join(' + ')} = ${dot}`,
          `|a| = √${a.map((each) => `${each}²`).join('+')} = ${fix(norm(a))}`,
          `|b| = √${b.map((each) => `${each}²`).join('+')} = ${fix(norm(b))}`,
          `cos = ${dot} / (${fix(norm(a))} × ${fix(norm(b))}) = ${fix(value)}`,
        ],
      })
    }
    case 'rrf': {
      const setup = config({ mode: 'hybrid', ...given.config })
      const index = indexOf(setup)
      const trace = ask(setup, questionOf(given.question)?.text ?? '')
      const row = (label: string, list: readonly { at: number }[]): AskView['rows'][number] => ({
        label,
        cells: list.slice(0, 5).map((each) => ({
          text: short(index.chunks[each.at]),
          mark: index.chunks[each.at]?.id === given.chunk,
        })),
      })
      const fused = trace.fused?.find((each) => index.chunks[each.at]?.id === given.chunk)
      const lex = fused?.lexical ?? null
      const sem = fused?.semantic ?? null
      const k = setup.rrfK
      const value = rrfTerm(k, lex) + rrfTerm(k, sem)
      const part = (rank: number | null): string => (rank === null ? '0' : `1/(${k} + ${rank})`)

      return view({
        expected: value,
        decimals: 4,
        facts: [['k', String(k)]],
        rows: [row('lexical', trace.lexical), row('semantic', trace.semantic)],
        formula: 'RRF(d) = 1/(k + r_lex) + 1/(k + r_sem)',
        steps: [
          `r_lex = ${lex ?? '—'}, r_sem = ${sem ?? '—'}`,
          `RRF = ${part(lex)} + ${part(sem)} = ${fix(value, 4)}`,
        ],
      })
    }
    case 'recall':
    case 'mrr': {
      const setup = config(given.config)
      const k = given.kind === 'recall' ? given.k : 5
      const rows = questions(given.questions).map((question) => judgedRow(setup, question, k))
      const firsts = rows.map((row) => row.cells.findIndex((cell) => cell.mark) + 1)
      const found = firsts.filter((first) => first > 0).length
      const value =
        given.kind === 'recall'
          ? found / Math.max(1, rows.length)
          : mean(firsts.map((first) => (first > 0 ? 1 / first : 0)))

      return view({
        expected: value,
        rows,
        formula: given.kind === 'recall' ? `recall@${k} = hits / N` : 'MRR = (Σ 1 / rank) / N',
        steps:
          given.kind === 'recall'
            ? [
                `hits = ${found}, N = ${rows.length}`,
                `recall@${k} = ${found} / ${rows.length} = ${fix(value)}`,
              ]
            : [
                `rank = ${firsts.map((first) => (first > 0 ? first : '—')).join(', ')}`,
                `MRR = (${firsts.map((first) => (first > 0 ? `1/${first}` : '0')).join(' + ')}) / ${rows.length} = ${fix(value)}`,
              ],
      })
    }
    case 'precision': {
      const question = questionOf(given.question)
      const row = question === undefined ? null : judgedRow(config(given.config), question, given.k)
      const good = row?.cells.filter((cell) => cell.mark).length ?? 0
      const value = good / given.k

      return view({
        expected: value,
        rows: row === null ? [] : [row],
        formula: `precision@${given.k} = relevant / ${given.k}`,
        steps: [`precision@${given.k} = ${good} / ${given.k} = ${fix(value)}`],
      })
    }
    case 'fits': {
      const setup = config(given.config)
      const prompt = ask(setup, questionOf(given.question)?.text ?? '').prompt
      const items = prompt?.items ?? []
      const count = items.filter((item) => item.included).length

      return view({
        expected: count,
        decimals: 0,
        facts: [
          ['budget', String(setup.budget)],
          ['fixed', String(prompt?.fixed ?? 0)],
        ],
        rows: [
          {
            label: 'tokens',
            cells: items.map((item) => ({
              text: `${short(item.chunk)}: ${item.tokens}`,
              mark: false,
            })),
          },
        ],
        formula: 'fixed + Σ tokens ≤ budget',
        steps: [
          `${prompt?.fixed ?? 0}${items
            .filter((item) => item.included)
            .map((item) => ` + ${item.tokens}`)
            .join('')} = ${prompt?.tokens ?? 0} ≤ ${setup.budget}`,
          `n = ${count}`,
        ],
      })
    }
    case 'mean': {
      const setup = config(given.config)
      const scores = given.folds.map((fold) => evaluate(setup, fold).metrics['recall@3'] ?? 0)
      const value = mean(scores)

      return view({
        expected: value,
        rows: scores.map((score, at) => ({
          label: `fold ${at + 1}`,
          cells: [{ text: `recall@3 = ${fix(score)}`, mark: false }],
        })),
        formula: 'mean = Σ recall@3 / folds',
        steps: [
          `(${scores.map((score) => fix(score)).join(' + ')}) / ${scores.length} = ${fix(value)}`,
        ],
      })
    }
  }
}

/** Si un número escrito a mano vale: exacto si es un entero, o a una unidad del último decimal. */
export function accepts(view: AskView, value: number): boolean {
  const tolerance = view.decimals === 0 ? 0 : 10 ** -view.decimals

  return Number.isFinite(value) && Math.abs(value - view.expected) <= tolerance + EPSILON
}

/* ---------- Elegir y ordenar ---------- */

export type CaseView = {
  given: PickCase
  options: { id: string; text: string }[]
  /** Si se pueden marcar varias. */
  multi: boolean
  expected: string[]
  /** Lo que mide cada opción (elegir configuración): se enseña al pedir que se mida. */
  measured: Record<string, number>
  /** Lo que pasa con las preguntas de muestra (elegir configuración) o con la del caso (etapa). */
  judged: { option: string; judged: Judged; config: Config }[]
}

export function caseView(given: PickCase): CaseView {
  if (given.of === 'relevant') {
    const setup = config(given.config)
    const index = indexOf(setup)
    const question = questionOf(given.question)
    const spans = question === undefined ? [] : goldSpans(question, DOCS)
    const shown = ask(setup, question?.text ?? '')
      .ranking.slice(0, given.show)
      .flatMap((each) => index.chunks[each.at] ?? [])

    return {
      given,
      options: shown.map(({ id, text }) => ({ id, text })),
      multi: true,
      expected: shown.filter((chunk) => hits(chunk, spans)).map((chunk) => chunk.id),
      measured: {},
      judged: [],
    }
  }
  if (given.of === 'best') {
    const ids = Object.keys(given.presets)
    const measured = Object.fromEntries(
      ids.map((id) => [
        id,
        evaluate(config(given.presets[id]), given.questions).metrics[given.metric] ?? 0,
      ]),
    )
    const best = Math.max(...Object.values(measured))

    return {
      given,
      options: ids.map((id) => ({ id, text: id })),
      multi: false,
      expected: ids.filter((id) => (measured[id] ?? 0) >= best - EPSILON),
      measured,
      judged: ids.flatMap((id) =>
        questions(given.demo).map((question) => {
          const setup = config(given.presets[id])

          return { option: id, judged: judge(setup, question), config: setup }
        }),
      ),
    }
  }

  const setup = config(given.config)
  const question = questionOf(given.question)
  const judged = question === undefined ? null : judge(setup, question)

  return {
    given,
    options: STAGES.map((stage) => ({ id: stage, text: stage })),
    multi: false,
    expected: [judged?.stage ?? 'ok'],
    measured: {},
    judged: judged === null ? [] : [{ option: '', judged, config: setup }],
  }
}

export type OrderView = {
  /** Los trozos, en el orden en que se enseñan (el del corpus, no el bueno). */
  items: { id: string; text: string; lexical: number | null; semantic: number | null }[]
  expected: string[]
}

export function orderView(task: OrderTask): OrderView {
  const setup = config({ mode: 'hybrid', ...task.config })
  const index = indexOf(setup)
  const fused = (ask(setup, questionOf(task.question)?.text ?? '').fused ?? []).slice(0, task.show)
  const items = fused.flatMap((each) => {
    const chunk = index.chunks[each.at]

    return chunk === undefined
      ? []
      : [
          {
            id: chunk.id,
            text: chunk.text,
            lexical: each.lexical,
            semantic: each.semantic,
            at: each.at,
          },
        ]
  })

  return {
    expected: items.map((item) => item.id),
    items: [...items]
      .sort((a, b) => a.at - b.at)
      .map(({ id, text, lexical, semantic }) => ({ id, text, lexical, semantic })),
  }
}

/* ---------- La API ---------- */

/** La petición tal como llega al motor: la pregunta, por su id (vacía si no existe). */
const requestOf = (task: ApiTask, request: ApiRequest): ApiRequest => ({
  ...request,
  q: task.questions.includes(request.q) ? (questionOf(request.q)?.text ?? '') : '',
})

export function respond(task: ApiTask, request: ApiRequest): ApiResponse {
  return handle(config(task.config), requestOf(task, request))
}

/* ---------- Ejecuciones ---------- */

/** Lo que manda la web por cada comprobación (`t`: de qué tarea de la unidad). */
export type Run =
  | { t: number; c: Record<string, unknown> }
  | { t: number; v: number[] }
  | { t: number; p: string[][] }
  | { t: number; o: string[] }
  | { t: number; r: ApiRequest }

export const encodeRun = (run: Run): string => JSON.stringify(run)

const isIds = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= LIMITS.values &&
  value.every((each) => typeof each === 'string' && each.length <= LIMITS.id)

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length <= LIMITS.values &&
  value.every((each) => typeof each === 'number')

/** Lee una ejecución; `null` si no tiene la forma de ninguna (no se corrige ni cuenta). */
export function parseRun(text: string): Run | null {
  if (text.length > LIMITS.entry) return null

  let data: unknown

  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null

  const { t, c, v, p, o, r } = data as Record<string, unknown>

  if (typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t > LIMITS.values) return null
  if (typeof c === 'object' && c !== null && !Array.isArray(c))
    return { t, c: c as Record<string, unknown> }
  if (isNumbers(v)) return { t, v }
  if (Array.isArray(p) && p.length <= LIMITS.values && p.every(isIds)) return { t, p }
  if (isIds(o)) return { t, o }
  if (typeof r === 'object' && r !== null) {
    const { method, path, q, k } = r as Record<string, unknown>

    if (
      (method === 'GET' || method === 'POST') &&
      typeof path === 'string' &&
      path.length <= LIMITS.id &&
      typeof q === 'string' &&
      q.length <= LIMITS.id &&
      typeof k === 'number'
    )
      return { t, r: { method, path, q, k: clamp(k, -1000, 1000) } }
  }

  return null
}

/** Lo que se comprueba en una tarea: una clave por objetivo. */
export function objectivesOf(task: Task): string[] {
  switch (task.kind) {
    case 'tune':
      return task.objectives.map((objective) => objective.metric)
    case 'calc':
      return task.asks.map((_, at) => `ask:${at}`)
    case 'pick':
      return task.cases.map((_, at) => `case:${at}`)
    case 'order':
      return ['order']
    case 'api':
      return ['status', 'body']
  }
}

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((each, at) => each === b[at])

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  same([...new Set(a)].sort(), [...b].sort())

/**
 * Corrige una ejecución de una tarea: los objetivos que no cumple (vacío:
 * cumple). `null` si la ejecución no es de la forma de esa tarea.
 */
export function checkRun(task: Task, run: Run): string[] | null {
  switch (task.kind) {
    case 'tune':
      return 'c' in run ? unmet(task, measure(task, tuned(task, run.c)).metrics) : null
    case 'calc':
      return 'v' in run
        ? task.asks.flatMap((each, at) =>
            accepts(askView(each), run.v[at] ?? Number.NaN) ? [] : [`ask:${at}`],
          )
        : null
    case 'pick':
      return 'p' in run
        ? task.cases.flatMap((each, at) =>
            sameSet(run.p[at] ?? [], caseView(each).expected) ? [] : [`case:${at}`],
          )
        : null
    case 'order':
      return 'o' in run ? (same(run.o, orderView(task).expected) ? [] : ['order']) : null
    case 'api': {
      if (!('r' in run)) return null

      const got = respond(task, run.r)
      const want = respond(task, task.solution)

      return [
        ...(got.status === want.status ? [] : ['status']),
        ...(JSON.stringify(got.body) === JSON.stringify(want.body) ? [] : ['body']),
      ]
    }
  }
}

/** Las ejecuciones de referencia de una tarea (la última cumple). */
function solutionRuns(task: Task, t: number): Run[] {
  switch (task.kind) {
    case 'tune':
      return task.solution.map((setup) => ({ t, c: { ...setup } }))
    case 'calc':
      return [{ t, v: task.asks.map((each) => askView(each).expected) }]
    case 'pick':
      return [{ t, p: task.cases.map((each) => caseView(each).expected) }]
    case 'order':
      return [{ t, o: orderView(task).expected }]
    case 'api':
      return [{ t, r: task.solution }]
  }
}

/** La solución de una unidad, como la mandaría la web. */
export function solutionOf(unit: UnitDef): string[] {
  return unit.tasks.flatMap((task, t) => solutionRuns(task, t).map(encodeRun))
}

/* ---------- Estrellas y corrección ---------- */

/** Comprobaciones que caben en cada estrella de una unidad (según las de su solución). */
export function starGoals(unit: UnitDef): StarGoals {
  return tryGoals(unit.tasks.reduce((sum, task, t) => sum + solutionRuns(task, t).length, 0))
}

export function timeGoalsOf(unit: UnitDef): TimeGoals | null {
  return unit.limit === undefined ? null : timeGoals(unit.limit)
}

/** Cómo va un intento: qué tareas han salido, qué le falta a cada una y cuántas comprobaciones cuentan. */
export type Tally = {
  /** Por tarea: si ya salió alguna vez. */
  passed: boolean[]
  /** Por tarea: lo que no cumplía su última comprobación (`null`: aún ninguna). */
  last: (string[] | null)[]
  /** Comprobaciones que cuentan: las bien formadas, hasta que sale la última tarea. */
  runs: number
}

export function tally(unit: UnitDef, entries: readonly string[]): Tally {
  const passed = unit.tasks.map(() => false)
  const last: (string[] | null)[] = unit.tasks.map(() => null)
  let runs = 0

  for (const entry of entries.slice(0, LIMITS.attemptEntries)) {
    if (passed.every(Boolean)) break

    const run = parseRun(entry)
    const task = run === null ? undefined : unit.tasks[run.t]
    const misses = run === null || task === undefined ? null : checkRun(task, run)

    if (run === null || misses === null) continue
    runs += 1
    last[run.t] = misses
    if (misses.length === 0) passed[run.t] = true
  }

  return { passed, last, runs }
}

/** Lo que falta: `task:N` por cada tarea sin salir (la primera es la 0). */
export function missing(tallied: Tally): string[] {
  return tallied.passed.flatMap((done, t) => (done ? [] : [`task:${t}`]))
}

export type Attempt = { done: boolean; misses: string[]; stars: Stars | 0; commands: number }

/**
 * Corrige un intento: vuelve a comprobar las ejecuciones desde el principio.
 * En un contrarreloj, `seconds` es el tiempo que ha medido quien corrige (la
 * API, no el navegador). `commands` son las comprobaciones que contaron (se
 * llama así porque es el campo que guardan todos los cursos).
 */
export function checkAttempt(unit: UnitDef, entries: readonly string[], seconds?: number): Attempt {
  const tallied = tally(unit, entries)
  const misses = missing(tallied)
  const done = misses.length === 0
  const limits = timeGoalsOf(unit)
  let stars: Stars | 0 = 0

  if (done && limits !== null) stars = starsForTime(seconds ?? limits.limit + 1, limits)
  else if (done) stars = starsFor(tallied.runs, starGoals(unit))

  const late = done && stars === 0

  return {
    done: done && !late,
    misses: late ? ['time'] : misses,
    stars: late ? 0 : stars,
    commands: tallied.runs,
  }
}

/* ---------- El ejemplo ---------- */

export type FrameView =
  | {
      show: 'trace'
      focus: Extract<Frame, { show: 'trace' }>['focus']
      judged: Judged
      config: Config
    }
  | { show: 'calc'; view: AskView }
  | { show: 'metrics'; metrics: Metrics; keys: string[]; config: Config }
  | { show: 'ops'; result: OpsResult; config: Config }
  | { show: 'api'; request: ApiRequest; response: ApiResponse }

/** El ejemplo de una unidad, ejecutado: cada paso con lo que el motor ha hecho de verdad. */
export function exampleOf(unit: UnitDef): FrameView[] {
  return (unit.example ?? []).flatMap((frame): FrameView[] => {
    switch (frame.show) {
      case 'trace': {
        const question = questionOf(frame.question)
        const setup = config(frame.config)

        return question === undefined
          ? []
          : [{ show: 'trace', focus: frame.focus, judged: judge(setup, question), config: setup }]
      }
      case 'calc':
        return [{ show: 'calc', view: askView(frame.ask) }]
      case 'metrics': {
        const setup = config(frame.config)

        return [
          {
            show: 'metrics',
            metrics: evaluate(setup, frame.questions).metrics,
            keys: frame.keys,
            config: setup,
          },
        ]
      }
      case 'ops': {
        const setup = config(frame.config)

        return [{ show: 'ops', result: runWorkload(setup), config: setup }]
      }
      case 'api':
        return [
          {
            show: 'api',
            request: frame.request,
            response: handle(config(frame.config), {
              ...frame.request,
              q: questionOf(frame.request.q)?.text ?? '',
            }),
          },
        ]
    }
  })
}
