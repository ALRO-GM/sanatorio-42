import type { Chunk, Focus, Knob } from '@sanatorio/ragsim'

/** `docs/reintentos.md#1` → `reintentos#1`: lo que cabe en una lista estrecha. */
export const shortId = (id: string): string =>
  id.replace(/^.*\//, '').replace(/\.(md|py|lock|jsonl)#/, '#')

/** `docs/reintentos.md:3-5`: como se cita una fuente. */
export const whereOf = (chunk: Chunk): string => `${chunk.doc}:${chunk.lines[0]}-${chunk.lines[1]}`

/** La clave de texto de una métrica (`recall@3` → `recall3`, `ops.stale` → `ops_stale`). */
export const metricKey = (metric: string): string => metric.replace('@', '').replace('.', '_')

/** Las métricas que son una parte del total (de 0 a 1): se enseñan con dos decimales. */
const SHARES = new Set([
  'recall@1',
  'recall@3',
  'recall@5',
  'recall@k',
  'precision',
  'mrr',
  'context',
  'answers',
  'cited',
  'match',
  'abstain',
  'whole',
])

/** El valor de una métrica como se lee: `0,92`, `148`. */
export function metricText(
  metric: string,
  value: number,
  number: (value: number, digits?: number) => string,
): string {
  return SHARES.has(metric) ? number(Math.round(value * 100) / 100, 2) : number(value, 0)
}

/** Qué parte de la tubería se mira al tocar cada mando. */
const FOCUS: Partial<Record<Knob, Focus>> = {
  sources: 'chunks',
  chunker: 'chunks',
  size: 'chunks',
  overlap: 'chunks',
  normalize: 'lexical',
  stopwords: 'lexical',
  stem: 'lexical',
  k1: 'lexical',
  b: 'lexical',
  k: 'lexical',
  mode: 'semantic',
  weight: 'fusion',
  rrfK: 'fusion',
  rerank: 'rerank',
  depth: 'rerank',
  budget: 'prompt',
  order: 'prompt',
  labels: 'prompt',
}

/** La vista con la que empieza una tarea de ajustar: la del primer mando que tenga una. */
export function focusOf(knobs: readonly Knob[]): Focus {
  for (const knob of knobs) {
    const focus = FOCUS[knob]

    if (focus !== undefined) return focus
  }

  return 'answer'
}

/** Un número escrito a mano, con coma o con punto (`0,83`); `NaN` si no lo es. */
export function typedNumber(text: string): number {
  const clean = text.trim().replace(',', '.')

  return clean === '' ? Number.NaN : Number(clean)
}
