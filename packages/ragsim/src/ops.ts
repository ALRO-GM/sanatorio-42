/**
 * Producción en miniatura: lo que pasa cuando el RAG deja de ser un guion y
 * hay gente preguntando mientras el repositorio cambia.
 *
 * - `runWorkload`: una mañana cualquiera. Se indexa, llegan preguntas (algunas
 *   repetidas, una con otras mayúsculas), alguien cambia un documento, se
 *   vuelve a indexar y siguen llegando preguntas. Cuenta lo que cuesta
 *   (trozos que se vuelven a calcular, milisegundos) y lo que sale mal
 *   (respuestas viejas servidas desde la caché).
 * - `handle`: la API HTTP mínima de un RAG (`/healthz`, `/search`, `/answer`),
 *   con sus códigos de error.
 */

import { chunkDocs } from './chunk.js'
import { DOCS, editedDocs } from './corpus.js'
import type { Doc } from './corpus.js'
import { LIMITS } from './limits.js'
import { ask, COST, indexOf } from './pipeline.js'
import type { Config } from './pipeline.js'
import { questionOf } from './questions.js'
import { normalized } from './text.js'

export type OpsStep =
  | { kind: 'index'; version: 1 | 2; embedded: number; chunks: number }
  | { kind: 'query'; question: string; cached: boolean; stale: boolean; latency: number }

export type OpsResult = {
  /** Trozos cuyo embedding se ha calculado entre las dos indexaciones. */
  embeddings: number
  /** Milisegundos sumados de todas las consultas. */
  latency: number
  /** Consultas servidas desde la caché. */
  hits: number
  /** De esas, las que dieron una respuesta que ya no es la del corpus. */
  stale: number
  steps: OpsStep[]
}

/** Las consultas de la mañana: `[id de la pregunta, cómo la escribe quien pregunta]`. */
const BEFORE: readonly [string, (text: string) => string][] = [
  ['retries', (text) => text],
  ['retries', (text) => `  ${text.toUpperCase()}`],
  ['heartbeat', (text) => text],
  ['retries', (text) => text],
]
const AFTER: readonly [string, (text: string) => string][] = [
  ['retries', (text) => text],
  ['heartbeat', (text) => text],
]

const answerText = (config: Config, question: string, docs: readonly Doc[]): string => {
  const { answer } = ask(config, question, docs)

  return answer.kind === 'grounded' ? answer.text : answer.kind
}

/** La mañana entera con esa configuración. */
export function runWorkload(config: Config): OpsResult {
  const steps: OpsStep[] = []
  const cache = new Map<string, string>()
  const hashes = new Map<string, string>()
  let docs: readonly Doc[] = DOCS

  const index = (version: 1 | 2): void => {
    const loaded = docs.filter((doc) => config.sources.includes(doc.source))
    // Incremental: solo se vuelve a trocear y a calcular lo que cambió (por su contenido).
    const changed = loaded.filter((doc) => !config.incremental || hashes.get(doc.path) !== doc.text)

    for (const doc of loaded) hashes.set(doc.path, doc.text)
    if (config.invalidate) cache.clear()
    steps.push({
      kind: 'index',
      version,
      embedded: chunkDocs(changed, config).length,
      chunks: indexOf(config, docs).chunks.length,
    })
  }
  const query = (id: string, write: (text: string) => string): void => {
    const question = write(questionOf(id)?.text ?? '')
    const key = config.cacheKey === 'normalized' ? normalized(question).join(' ') : question
    const fresh = answerText(config, question, docs)
    const cached = config.cache ? cache.get(key) : undefined

    if (config.cache && cached === undefined) cache.set(key, fresh)
    steps.push({
      kind: 'query',
      question: id,
      cached: cached !== undefined,
      stale: cached !== undefined && cached !== fresh,
      latency: cached === undefined ? ask(config, question, docs).latency : COST.cached,
    })
  }

  index(1)
  for (const [id, write] of BEFORE) query(id, write)
  docs = editedDocs()
  index(2)
  for (const [id, write] of AFTER) query(id, write)

  const queries = steps.filter((step) => step.kind === 'query')

  return {
    embeddings: steps.reduce((sum, step) => sum + (step.kind === 'index' ? step.embedded : 0), 0),
    latency: queries.reduce((sum, step) => sum + step.latency, 0),
    hits: queries.filter((step) => step.cached).length,
    stale: queries.filter((step) => step.stale).length,
    steps,
  }
}

export type ApiRequest = { method: 'GET' | 'POST'; path: string; q: string; k: number }

export type ApiSource = { n: number; path: string; lines: string }

export type ApiResponse =
  | { status: 200; body: { status: 'ok'; chunks: number } }
  | { status: 200; body: { sources: ApiSource[] } }
  | { status: 200; body: { answer: string | null; cites: number | null; sources: ApiSource[] } }
  | { status: 404 | 405 | 422; body: { error: string } }

export const API_ROUTES: readonly { method: ApiRequest['method']; path: string }[] = [
  { method: 'GET', path: '/healthz' },
  { method: 'GET', path: '/search' },
  { method: 'POST', path: '/answer' },
]

const fail = (status: 404 | 405 | 422, error: string): ApiResponse => ({ status, body: { error } })

/**
 * Atiende una petición como lo haría la API de tu RAG: valida antes de
 * trabajar (una consulta vacía o un `k` fuera de rango son un 422, no una
 * búsqueda), y devuelve siempre las fuentes con su ruta y sus líneas.
 */
export function handle(config: Config, request: ApiRequest): ApiResponse {
  const route = API_ROUTES.find((each) => each.path === request.path)

  if (route === undefined) return fail(404, 'not_found')
  if (route.method !== request.method) return fail(405, 'method_not_allowed')
  if (route.path === '/healthz')
    return { status: 200, body: { status: 'ok', chunks: indexOf(config).chunks.length } }
  if (request.q.trim() === '') return fail(422, 'empty_query')
  if (!Number.isInteger(request.k) || request.k < 1 || request.k > LIMITS.maxK)
    return fail(422, 'k_out_of_range')

  const trace = ask({ ...config, k: request.k }, request.q)

  if (route.path === '/search')
    return {
      status: 200,
      body: {
        sources: trace.found.map((chunk, at) => ({
          n: at + 1,
          path: chunk.doc,
          lines: chunk.lines.join('-'),
        })),
      },
    }

  const sources = (trace.prompt?.items ?? []).flatMap((item, at) =>
    item.included
      ? [{ n: item.n ?? at + 1, path: item.chunk.doc, lines: item.chunk.lines.join('-') }]
      : [],
  )

  return {
    status: 200,
    body: {
      answer: trace.answer.kind === 'grounded' ? trace.answer.text : null,
      cites: trace.answer.kind === 'grounded' ? trace.answer.cite : null,
      sources,
    },
  }
}
