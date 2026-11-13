/**
 * El prompt y el «generador». Un modelo de verdad escribe; este, determinista,
 * hace lo que hace un modelo pequeño bien dirigido: busca en el contexto la
 * frase que mejor responde a la pregunta y la devuelve con su cita. Y falla
 * como ellos:
 *
 * - Sin contexto (o sin nada que lo respalde, si no se le exige fundamento)
 *   contesta **de memoria**: un dato viejo dicho con toda seguridad.
 * - Con contexto de relleno puede quedarse con una frase parecida de un trozo
 *   que no tocaba.
 * - Solo dice «no lo sé» si se le pide que responda únicamente con lo que el
 *   contexto respalda (`strict`) y ninguna frase llega al mínimo (`minSupport`).
 */

import type { Chunk } from './chunk.js'
import { conceptsIn, GENERIC } from './embed.js'
import { normalized, plain } from './text.js'

/** Lo que ocupan las instrucciones fijas del prompt («Responde solo con el contexto…»). */
const INSTRUCTION_TOKENS = 20
/** Lo que añade a cada trozo su etiqueta de fuente (`[2] docs/colas.md:9-11`). */
const LABEL_TOKENS = 2

export type PromptOrder = 'best' | 'worst' | 'file'

export type PromptItem = {
  chunk: Chunk
  tokens: number
  /** Si cupo en el presupuesto. */
  included: boolean
  /** Su número de fuente en el prompt (si se numeran y cupo). */
  n: number | null
}

export type Prompt = {
  budget: number
  /** Instrucciones y pregunta: lo que se gasta antes de meter ningún trozo. */
  fixed: number
  /** Lo gastado en total. */
  tokens: number
  items: PromptItem[]
}

/**
 * Monta el prompt: instrucciones, trozos y pregunta, sin pasar del
 * presupuesto. Los trozos entran en el orden pedido y **el primero que no cabe
 * corta**: lo que venía detrás se queda fuera. Por eso importa el orden.
 */
export function buildPrompt(
  found: readonly Chunk[],
  position: (chunk: Chunk) => number,
  questionTokens: number,
  options: { budget: number; order: PromptOrder; labels: boolean },
): Prompt {
  const ordered =
    options.order === 'best'
      ? [...found]
      : options.order === 'worst'
        ? [...found].reverse()
        : [...found].sort((a, b) => position(a) - position(b))
  const fixed = INSTRUCTION_TOKENS + questionTokens
  let tokens = fixed
  let open = true
  let n = 0
  const items = ordered.map((chunk): PromptItem => {
    const cost = chunk.size + (options.labels ? LABEL_TOKENS : 0)

    open = open && tokens + cost <= options.budget
    if (!open) return { chunk, tokens: cost, included: false, n: null }
    tokens += cost
    n += 1

    return { chunk, tokens: cost, included: true, n: options.labels ? n : null }
  })

  return { budget: options.budget, fixed, tokens, items }
}

type Sentence = { text: string; start: number; end: number }

/** Las frases de un trozo (una por línea de código), con su sitio en el documento. Los títulos no cuentan. */
export function sentences(chunk: Chunk): Sentence[] {
  const found: Sentence[] = []

  for (const line of chunk.text.matchAll(/[^\n]+/g)) {
    if (line[0].trimStart().startsWith('#')) continue
    for (const match of line[0].matchAll(/\S.*?(?:[.!?](?=\s|$)|$)/g)) {
      const start = chunk.start + line.index + match.index

      found.push({ text: match[0], start, end: start + match[0].length })
    }
  }

  return found
}

/** Si la pregunta pide una cantidad («¿cuántas…?», «how often…?»). */
const asksNumber = (question: string): boolean =>
  plain(question).some((word) => word.startsWith('cuant') || word === 'how')

/**
 * Cuánto respalda un texto a una pregunta: una por cada palabra que comparten
 * (ya normalizadas), dos por cada concepto concreto que comparten y una por
 * cada concepto genérico (`GENERIC`); y si la pregunta pide una cantidad, una
 * más si el texto trae alguna cifra. Es la lectura «cara» del curso: la usan
 * el generador, frase a frase, y el reordenado.
 */
function support(question: string, text: string): number {
  const words = new Set(normalized(text))
  const concepts = new Set(conceptsIn(text))
  const shared = [...new Set(normalized(question))].filter((word) => words.has(word)).length
  const base = conceptsIn(question)
    .filter((concept) => concepts.has(concept))
    .reduce((sum, concept) => sum + (GENERIC.includes(concept) ? 1 : 2), shared)

  return base > 0 && asksNumber(question) && /\d/.test(text) ? base + 1 : base
}

/** La mejor frase de un trozo para una pregunta, y cuánto la respalda. */
export function bestSentence(
  question: string,
  chunk: Chunk,
): { sentence: Sentence; support: number } | null {
  let best: { sentence: Sentence; support: number } | null = null

  for (const sentence of sentences(chunk)) {
    const value = support(question, sentence.text)

    if (best === null || value > best.support) best = { sentence, support: value }
  }

  return best
}

/** Lo que el modelo «recuerda» de Colmena: datos de la versión 1, ya viejos. */
export const MEMORY: readonly {
  id: string
  concepts: readonly string[]
  es: string
  en: string
}[] = [
  {
    id: 'retries',
    concepts: ['retry'],
    es: 'Colmena reintenta cada tarea 3 veces, con 10 segundos de espera entre intentos.',
    en: 'Colmena retries every task 3 times, waiting 10 seconds between attempts.',
  },
  {
    id: 'heartbeat',
    concepts: ['alive'],
    es: 'Cada worker manda un latido cada 30 segundos.',
    en: 'Every worker sends a heartbeat every 30 seconds.',
  },
  {
    id: 'limit',
    concepts: ['limit', 'queue'],
    es: 'Las colas de Colmena no tienen límite de tamaño.',
    en: 'Colmena queues have no size limit.',
  },
  {
    id: 'config',
    concepts: ['config', 'install'],
    es: 'Colmena se configura con el fichero colmena.ini.',
    en: 'Colmena is configured with the colmena.ini file.',
  },
]

/** Cuando no recuerda nada del tema, improvisa igual. */
const GUESS = 'guess'

export type Answer =
  | {
      kind: 'grounded'
      text: string
      /** El trozo del que sale y el número con el que se cita (`null`: sin numerar, no cita). */
      chunk: string
      cite: number | null
      doc: string
      start: number
      end: number
      support: number
    }
  /** Inventada: un dato de memoria (`id` de `MEMORY`) o una improvisación (`guess`). */
  | { kind: 'memory'; id: string }
  | { kind: 'idk' }

function fromMemory(question: string): Answer {
  const concepts = conceptsIn(question)
  const fact = MEMORY.find((each) => each.concepts.some((concept) => concepts.includes(concept)))

  return { kind: 'memory', id: fact?.id ?? GUESS }
}

/** Responde a la pregunta con lo que hay en el prompt. */
export function generate(
  question: string,
  prompt: Prompt | null,
  options: { strict: boolean; minSupport: number },
): Answer {
  let best: (Answer & { kind: 'grounded' }) | null = null

  for (const item of prompt?.items ?? []) {
    if (!item.included) continue

    const found = bestSentence(question, item.chunk)

    // A igualdad se queda con la que leyó antes: el orden del prompt importa.
    if (found !== null && (best === null || found.support > best.support))
      best = {
        kind: 'grounded',
        text: found.sentence.text,
        chunk: item.chunk.id,
        cite: item.n,
        doc: item.chunk.doc,
        start: found.sentence.start,
        end: found.sentence.end,
        support: found.support,
      }
  }
  if (best !== null && best.support >= options.minSupport) return best

  return options.strict ? { kind: 'idk' } : fromMemory(question)
}
