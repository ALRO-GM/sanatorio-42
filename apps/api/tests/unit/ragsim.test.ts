/**
 * El RAG en miniatura (`packages/ragsim`): que cada pieza haga lo que el curso
 * dice que hace (trocear, tokenizar, BM25, embeddings, fusión, prompt,
 * generador, métricas y producción), que nada de lo que llegue de fuera lo
 * cuelgue y que el motor no toque el sistema.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { starsFor, tryGoals } from '@sanatorio/course'
import {
  ask,
  configOf,
  cosine,
  countTokens,
  DEFAULTS,
  DOCS,
  embed,
  evaluate,
  indexOf,
  judge,
  LIMITS,
  QUESTIONS,
  questionOf,
  rrf,
  runWorkload,
  tokenize,
} from '@sanatorio/ragsim'
import type { Config } from '@sanatorio/ragsim'
import { describe, expect, it } from 'vitest'

const with_ = (over: Partial<Config>): Config => configOf(over)
const DEV = QUESTIONS.filter((question) => question.set === 'dev').map((question) => question.id)
const FOUND = QUESTIONS.filter(
  (question) => question.set === 'dev' && question.kind !== 'none',
).map((question) => question.id)

const question = (id: string) => {
  const found = questionOf(id)

  if (found === undefined) throw new Error(`falta la pregunta ${id}`)

  return found
}

describe('RAG en miniatura: trocear', () => {
  it('fijo: ventanas de tantas palabras, con el solape repetido', () => {
    const { chunks } = indexOf(with_({ chunker: 'fixed', size: 30, overlap: 10 }))
    const colas = chunks.filter((chunk) => chunk.doc === 'docs/colas.md')

    expect(colas.every((chunk) => chunk.size <= 30)).toBe(true)
    expect(colas.length).toBeGreaterThan(3)
    // Cada trozo empieza 20 palabras después del anterior: comparte sus 10 últimas.
    expect(colas[0]?.text.split(/\s+/).slice(20).join(' ')).toBe(
      colas[1]?.text.split(/\s+/).slice(0, 10).join(' '),
    )
    expect(colas[0]?.id).toBe('docs/colas.md#1')
    expect(colas[0]?.lines[0]).toBe(1)
  })

  it('por estructura: un trozo por apartado o función, y lo largo se parte', () => {
    const { chunks } = indexOf(DEFAULTS)
    const retry = chunks.filter((chunk) => chunk.doc === 'src/colmena/retry.py')

    expect(retry.map((chunk) => chunk.text.split('\n')[0]?.slice(0, 22))).toEqual([
      '"""Retry policy: how m',
      'def backoff_seconds(at',
      'def should_retry(attem',
      'def to_dead_letter(tas',
    ])
    // El título suelto se queda con su primer apartado.
    expect(chunks.find((chunk) => chunk.id === 'docs/colas.md#1')?.text).toMatch(/^# Colas/)
    expect(chunks.every((chunk) => chunk.size <= DEFAULTS.size)).toBe(true)
    // Con trozos pequeños, las respuestas se parten; por estructura quedan enteras.
    expect(evaluate(with_({ chunker: 'fixed', size: 10 }), FOUND).metrics.whole).toBeLessThan(0.3)
    expect(evaluate(DEFAULTS, FOUND).metrics.whole).toBe(1)
  })
})

describe('RAG en miniatura: buscar', () => {
  it('tokeniza según las opciones', () => {
    const all = { normalize: true, stopwords: true, stem: true }

    expect(
      tokenize('Límite de Tamaño', { normalize: false, stopwords: false, stem: false }),
    ).toEqual(['Límite', 'de', 'Tamaño'])
    expect(tokenize('Límite de Tamaño', all)).toEqual(['limit', 'taman'])
    expect(tokenize('MAX_RETRIES QueueFull', { ...all, stem: false })).toEqual([
      'max_retries',
      'max',
      'retries',
      'queuefull',
      'queue',
      'full',
    ])
    expect(tokenize('reintentos reintenta reintentar', all)).toEqual([
      'reintent',
      'reintent',
      'reintent',
    ])
    expect(countTokens('  una  frase de cinco palabras ')).toBe(5)
  })

  it('BM25 encuentra el identificador exacto y la semántica, las otras palabras', () => {
    const lexical = with_({ mode: 'lexical' })
    const semantic = with_({ mode: 'semantic' })

    expect(judge(lexical, question('legacy')).rank).toBe(1)
    expect(judge(semantic, question('legacy')).rank).toBeNull()
    expect(judge(lexical, question('twice')).rank).toBeNull()
    expect(judge(semantic, question('twice')).rank).toBe(1)
    // Juntas aciertan más que cada una por separado.
    const recall = (config: Config): number => evaluate(config, FOUND).metrics['recall@3'] ?? 0

    expect(recall(DEFAULTS)).toBeGreaterThan(recall(lexical))
    expect(recall(DEFAULTS)).toBeGreaterThan(recall(semantic))
  })

  it('embeddings: mismo significado, vectores parecidos; sin conceptos, coseno 0', () => {
    expect(cosine(embed('volver a intentarlo'), embed('retry again'))).toBeCloseTo(1)
    expect(cosine(embed('volver a intentarlo'), embed('How much memory?'))).toBe(0)
    expect(cosine(embed('QueueFull8787'), embed('reintentos'))).toBe(0)
    expect(cosine([1, 1, 0], [2, 2, 0])).toBeCloseTo(1)
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })

  it('RRF mira los puestos, no las puntuaciones, y el peso inclina la balanza', () => {
    const lexical = [
      { at: 7, score: 900 },
      { at: 3, score: 1 },
    ]
    const semantic = [
      { at: 3, score: 0.2 },
      { at: 9, score: 0.1 },
    ]
    const fused = rrf(lexical, semantic, 0.5, 60)

    // El 3 está en las dos listas: gana aunque el 7 tenga 900 puntos.
    expect(fused.map((each) => each.at)).toEqual([3, 7, 9])
    expect(fused[0]).toMatchObject({ lexical: 2, semantic: 1 })
    expect(fused[0]?.score).toBeCloseTo(1 / 62 + 1 / 61)
    expect(rrf(lexical, semantic, 0, 60).map((each) => each.at)).toEqual([7, 3])
    expect(rrf(lexical, semantic, 1, 60).map((each) => each.at)).toEqual([3, 9])
    expect(rrf([], [], 0.5, 60)).toEqual([])
  })

  it('reordenar sube el trozo bueno y cuesta tiempo', () => {
    const plain = evaluate(DEFAULTS, FOUND).metrics
    const reranked = evaluate(with_({ rerank: true, depth: 5 }), FOUND).metrics

    expect(reranked.mrr).toBe(1)
    expect(reranked.mrr).toBeGreaterThan(plain.mrr ?? 1)
    expect(reranked.latency).toBeGreaterThan(plain.latency ?? 0)
  })
})

describe('RAG en miniatura: prompt y respuesta', () => {
  it('el presupuesto corta en el primer trozo que no cabe', () => {
    const tight = ask(with_({ k: 5, budget: 80 }), question('twice').text).prompt
    const wide = ask(with_({ k: 5, budget: 600 }), question('twice').text).prompt

    expect(tight?.tokens).toBeLessThanOrEqual(80)
    expect(tight?.items.filter((item) => item.included)).toHaveLength(1)
    expect(wide?.items.every((item) => item.included)).toBe(true)
    expect(wide?.items.map((item) => item.n)).toEqual([1, 2, 3, 4, 5])
    // Del peor al mejor, lo que se cae es lo mejor.
    expect(judge(with_({ k: 5, budget: 120, order: 'worst' }), question('retries')).stage).toBe(
      'prompt',
    )
  })

  it('con contexto responde citando; sin él, inventa; sin respaldo, dice que no lo sabe', () => {
    const grounded = ask(DEFAULTS, question('retries').text).answer
    const alone = ask(with_({ context: false }), question('retries').text).answer
    const unknown = ask(DEFAULTS, question('price').text).answer

    expect(grounded).toMatchObject({
      kind: 'grounded',
      text: 'Por defecto cada tarea se reintenta 5 veces.',
      doc: 'docs/reintentos.md',
      cite: 1,
    })
    expect(alone).toEqual({ kind: 'memory', id: 'retries' })
    expect(unknown).toEqual({ kind: 'idk' })
    // Sin numerar las fuentes no hay con qué citar.
    expect(ask(with_({ labels: false }), question('retries').text).answer).toMatchObject({
      cite: null,
    })
    // Sin exigir fundamento, lo que no encuentra se lo inventa.
    expect(
      ask(with_({ mode: 'lexical', strict: false, minSupport: 4 }), question('backoff').text).answer
        .kind,
    ).toBe('memory')
  })

  it('las métricas cuentan lo que dicen', () => {
    const { metrics, judged } = evaluate(DEFAULTS, DEV)

    expect(judged).toHaveLength(DEV.length)
    expect(metrics['recall@1']).toBeLessThanOrEqual(metrics['recall@3'] ?? 0)
    expect(metrics['recall@3']).toBeLessThanOrEqual(metrics['recall@5'] ?? 0)
    expect(metrics.abstain).toBe(1)
    expect(metrics.invented).toBe(0)
    expect(metrics.chunks).toBe(indexOf(DEFAULTS).chunks.length)
    // Más resultados: más recall y menos precisión.
    const few = evaluate(with_({ k: 1 }), FOUND).metrics
    const many = evaluate(with_({ k: 10 }), FOUND).metrics

    expect(many['recall@k']).toBeGreaterThan(few['recall@k'] ?? 1)
    expect(many.precision).toBeLessThan(few.precision ?? 0)
    // Sin preguntas no hay nada que dividir.
    expect(evaluate(DEFAULTS, []).metrics).toMatchObject({ 'recall@3': 1, mrr: 1, latency: 0 })
    expect(evaluate(DEFAULTS, ['no-existe']).judged).toEqual([])
  })

  it('lo que no debe indexarse se nota: secretos, ruido y fugas', () => {
    const everything = with_({ sources: ['docs', 'code', 'lock', 'env', 'eval'] })
    const { metrics } = evaluate(everything, FOUND)

    expect(metrics.secrets).toBeGreaterThan(0)
    expect(metrics.noise).toBeGreaterThan(0)
    expect(metrics.leaks).toBeGreaterThan(0)
    expect(evaluate(DEFAULTS, FOUND).metrics).toMatchObject({ secrets: 0, noise: 0, leaks: 0 })
    // Con las preguntas dentro del índice, la evaluación rápida sale perfecta aunque se trocee mal.
    const leaky = with_({
      mode: 'lexical',
      sources: ['docs', 'code', 'eval'],
      chunker: 'fixed',
      size: 15,
    })
    const leaked = ['retries', 'full', 'heartbeat', 'redis', 'health', 'dead']

    expect(evaluate(leaky, leaked).metrics.match).toBe(1)
    expect(evaluate(leaky, leaked).metrics.answers).toBeLessThan(0.5)
  })
})

describe('RAG en miniatura: producción', () => {
  it('incremental recalcula solo lo cambiado; la caché sin invalidar sirve respuestas viejas', () => {
    const chunks = indexOf(DEFAULTS).chunks.length
    const plain = runWorkload(DEFAULTS)
    const incremental = runWorkload(with_({ incremental: true }))
    const cached = runWorkload(with_({ cache: true }))
    const careful = runWorkload(with_({ cache: true, cacheKey: 'normalized', invalidate: true }))

    expect(plain).toMatchObject({ embeddings: chunks * 2, hits: 0, stale: 0 })
    expect(incremental.embeddings).toBe(chunks + 3)
    expect(cached.stale).toBe(1)
    expect(cached.latency).toBeLessThan(plain.latency)
    // La clave normalizada acierta también la pregunta escrita en mayúsculas.
    expect(careful).toMatchObject({ stale: 0, hits: 2 })
    expect(careful.latency).toBeLessThan(plain.latency)
    expect(plain.steps.filter((step) => step.kind === 'index')).toHaveLength(2)
  })
})

describe('RAG en miniatura: topes y entradas raras', () => {
  it('una configuración cualquiera acaba dentro de sus topes', () => {
    const wild = configOf({
      size: 1e9,
      overlap: -5,
      k: Number.NaN,
      depth: Infinity,
      budget: '300',
      mode: 'cuántica',
      sources: ['env', 'nada', 7],
      k1: 99,
      b: -1,
      weight: 2,
      minSupport: 0,
      __proto__: { context: false },
    })

    expect(wild).toMatchObject({
      // Lo heredado de un prototipo no cuenta: solo lo que el objeto trae como propio.
      context: true,
      size: LIMITS.maxSize,
      overlap: 0,
      k: 1,
      depth: 1,
      budget: DEFAULTS.budget,
      mode: DEFAULTS.mode,
      sources: ['env'],
      k1: 3,
      b: 0,
      weight: 1,
      minSupport: 1,
    })
    for (const input of [null, undefined, 7, 'x', [], [1, 2]])
      expect(configOf(input)).toEqual(DEFAULTS)
    // El solape nunca pasa de la mitad del trozo: las ventanas siempre avanzan.
    expect(configOf({ size: 20, overlap: 200 }).overlap).toBe(10)
  })

  it('el índice no crece sin tope y las preguntas enormes o vacías no rompen nada', () => {
    const tiny = configOf({
      chunker: 'fixed',
      size: LIMITS.minSize,
      overlap: 4,
      sources: ['docs', 'code', 'lock', 'env', 'eval'],
    })

    expect(indexOf(tiny).chunks.length).toBeLessThanOrEqual(LIMITS.chunks)
    expect(ask(DEFAULTS, '').answer).toEqual({ kind: 'idk' })
    expect(ask(DEFAULTS, 'cola '.repeat(5000)).found.length).toBeLessThanOrEqual(DEFAULTS.k)
    expect(ask(DEFAULTS, '¿¡…!? <script>alert(1)</script> \u0000').answer.kind).toBe('idk')
    expect(ask(configOf({ sources: [] }), 'cola').found).toEqual([])
  })

  it('el corpus es inventado y pequeño, y cada pregunta con respuesta la tiene en él', () => {
    expect(DOCS.length).toBeLessThan(20)
    for (const each of QUESTIONS)
      for (const gold of each.gold)
        expect(
          DOCS.find((doc) => doc.path === gold.doc)?.text,
          `${each.id} en ${gold.doc}`,
        ).toContain(gold.needle)
    expect(new Set(QUESTIONS.map((each) => each.id)).size).toBe(QUESTIONS.length)
  })

  it('el motor no importa nada del sistema (ni fs, ni procesos, ni red, ni eval)', () => {
    const dir = fileURLToPath(new URL('../../../../packages/ragsim/src', import.meta.url))
    const files = readdirSync(dir, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.ts'))

    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8')

      for (const from of text.matchAll(/^import .* from '([^']+)'/gm))
        expect(from[1], file).toMatch(/^(\.|@sanatorio\/course$)/)
      expect(text, file).not.toMatch(
        /\beval\(|new Function\(|globalThis|\bfetch\(|Math\.random|Date\./,
      )
    }
  })
})

describe('estrellas por comprobaciones (`tryGoals`)', () => {
  it('tres con las de la solución más una; dos hasta el doble más dos', () => {
    expect(tryGoals(1)).toEqual({ three: 2, two: 4 })
    expect(tryGoals(2)).toEqual({ three: 3, two: 6 })
    expect(tryGoals(0)).toEqual(tryGoals(1))
    expect([1, 2, 3, 4, 5].map((used) => starsFor(used, tryGoals(1)))).toEqual([3, 3, 2, 2, 1])
  })
})
