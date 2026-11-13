/**
 * Búsqueda semántica con embeddings **de juguete**. Un modelo de verdad
 * (MiniLM, por ejemplo) aprende de millones de frases a poner cerca los textos
 * que significan lo mismo; aquí ese conocimiento está escrito a mano: una
 * lista corta de conceptos, cada uno con las palabras que lo nombran en
 * castellano y en inglés. El embedding de un texto es cuánto habla de cada
 * concepto (un vector con una dimensión por concepto) y dos textos se parecen
 * si sus vectores apuntan hacia el mismo sitio (similitud coseno).
 *
 * Es determinista y cabe en la cabeza, y falla igual que los de verdad: no
 * distingue un identificador exacto (`QueueFull` no es ningún concepto) y
 * encuentra «volver a intentarlo» aunque el documento diga «reintentos» o
 * «retry».
 */

import type { Chunk } from './chunk.js'
import { plain } from './text.js'

type Concept = { id: string; terms: readonly string[] }

/**
 * Los conceptos del mundo de Colmena. Cada término casa con las palabras que
 * empiezan por él (`reintent` casa con «reintentos» y «reintentar»); los que
 * llevan un espacio, con dos palabras seguidas.
 */
export const CONCEPTS: readonly Concept[] = [
  { id: 'retry', terms: ['reintent', 'retry', 'retri', 'volver a', 'again', 'intent', 'attempt'] },
  {
    id: 'wait',
    terms: ['espera', 'wait', 'tarda', 'delay', 'retras', 'exponencial', 'exponential'],
  },
  {
    id: 'fail',
    terms: ['fall', 'fail', 'error', 'exception', 'crash', 'raise', 'lanza', 'problema'],
  },
  { id: 'queue', terms: ['cola', 'queue', 'encol', 'enqueue', 'dequeue', 'push'] },
  { id: 'task', terms: ['tarea', 'task', 'job', 'trabajo'] },
  { id: 'worker', terms: ['worker'] },
  { id: 'priority', terms: ['priorid', 'priorit', 'antes', 'first', 'urgent'] },
  { id: 'limit', terms: ['limit', 'max', 'tamano', 'size', 'llena', 'full', 'tope', 'caben'] },
  { id: 'stop', terms: ['shutdown', 'apag', 'parar', 'stop', 'sigterm', 'deten', 'graceful'] },
  { id: 'alive', terms: ['heartbeat', 'latido', 'alive', 'vivo', 'health', 'salud'] },
  { id: 'dead', terms: ['dead', 'muert', 'muere', 'died', 'caid'] },
  { id: 'twice', terms: ['duplic', 'twice', 'dos veces', 'idempot', 'repet'] },
  { id: 'deploy', terms: ['deploy', 'despleg', 'produc', 'scal', 'escal', 'port', 'puerto'] },
  { id: 'memory', terms: ['memor', 'ram', 'mb'] },
  { id: 'logs', terms: ['log', 'registro', 'json'] },
  { id: 'install', terms: ['instal', 'pip', 'requisit', 'need', 'necesit', 'python', 'version'] },
  { id: 'config', terms: ['config', 'variable', 'env', 'entorno', 'setting', 'redis', 'url'] },
  { id: 'parallel', terms: ['concurren', 'a la vez', 'same time', 'paralel', 'parallel'] },
  { id: 'where', terms: ['donde', 'where', 'pasa', 'goes'] },
  { id: 'default', terms: ['defecto', 'default'] },
  { id: 'time', terms: ['segundo', 'second', 'timeout', 'often', 'tarda'] },
  { id: 'start', terms: ['arranc', 'start', 'empez', 'run', 'ejecut'] },
  { id: 'format', terms: ['format', 'written', 'escrib', 'line'] },
]

/**
 * Los conceptos que salen en medio corpus: compartirlos dice poco. El lector
 * (el generador y el reordenado) les da la mitad de peso que a los demás.
 */
export const GENERIC: readonly string[] = ['queue', 'task', 'worker', 'default', 'time', 'start']

/** Cuántas veces nombra el texto cada concepto, en el orden de `concepts`. */
export function conceptCounts(text: string, concepts: readonly Concept[] = CONCEPTS): number[] {
  const tokens = plain(text)

  return concepts.map((concept) => {
    let count = 0

    for (const term of concept.terms) {
      const [first, second] = term.split(' ')

      if (first === undefined) continue
      tokens.forEach((token, at) => {
        if (second === undefined) {
          if (token.startsWith(first)) count += 1
        } else if (token === first && (tokens[at + 1] ?? '').startsWith(second)) count += 1
      })
    }

    return count
  })
}

/** Los conceptos que nombra un texto (sus ids). */
export function conceptsIn(text: string): string[] {
  const counts = conceptCounts(text)

  return CONCEPTS.filter((_, at) => (counts[at] ?? 0) > 0).map((concept) => concept.id)
}

/** El producto escalar de dos vectores de la misma dimensión. */
const dot = (a: readonly number[], b: readonly number[]): number =>
  a.reduce((sum, value, at) => sum + value * (b[at] ?? 0), 0)

/** Similitud coseno: 1 si apuntan igual, 0 si no comparten nada (o alguno es todo ceros). */
export function cosine(a: readonly number[], b: readonly number[]): number {
  const norms = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b))

  return norms === 0 ? 0 : dot(a, b) / norms
}

/**
 * El embedding de un texto: la raíz de cuántas veces nombra cada concepto (que
 * repetir una palabra diez veces no pese diez veces más).
 */
export function embed(text: string): number[] {
  return conceptCounts(text).map(Math.sqrt)
}

export type SemanticIndex = { vectors: number[][] }

export function buildSemantic(chunks: readonly Chunk[]): SemanticIndex {
  return { vectors: chunks.map((chunk) => embed(chunk.text)) }
}

/** El coseno de cada trozo con la consulta: sus vecinos más cercanos son los más altos. */
export function similarities(index: SemanticIndex, query: string): number[] {
  const vector = embed(query)

  return index.vectors.map((each) => cosine(each, vector))
}
