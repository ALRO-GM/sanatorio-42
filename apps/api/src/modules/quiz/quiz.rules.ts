/**
 * Reglas de Not-games, sin base de datos ni reloj: quién puede recibir cada
 * concepto, cómo se monta una pregunta, cuánto cuesta cada una según lo que
 * falla la gente, en qué orden ve cada cual las respuestas y cómo puntúa cada
 * modo.
 */

import type { QuizDifficulty, QuizKinds, QuizPool } from '@sanatorio/contracts'

import type { Concept, ConceptKind } from './bank/types.js'

/** Para los juegos de `games/`, que no entran en `bank/` directamente. */
export { localizeRound } from './bank/localize.js'

export const LIVES = 3

/** Segundos para contestar, según el tipo, si el concepto no dice otra cosa. */
const SECONDS: Record<ConceptKind, number> = { quick: 10, long: 30 }

/** Respuestas que salen en cada pregunta: una buena y tres malas. */
export const OPTIONS = 4

/** Con cuántas respuestas se fía la dificultad de lo que falla la gente. */
const TRUSTED_AFTER = 20

/** Lo que se sabe de los proyectos de una persona, para elegir preguntas. */
type Learner = {
  /** Slugs de 42 de lo que ha aprobado o está haciendo. */
  slugs: ReadonlySet<string>
}

/** Los lenguajes que ha tocado alguien, por sus proyectos. */
export function languagesOf(slugs: ReadonlySet<string>): Set<'c' | 'python' | 'cpp'> {
  const langs = new Set<'c' | 'python' | 'cpp'>()

  for (const slug of slugs) {
    if (slug.startsWith('python-module-')) langs.add('python')
    else if (slug.startsWith('cpp-module-')) langs.add('cpp')
    else langs.add('c')
  }

  return langs
}

/** `true` si el concepto no pide nada: sale a cualquiera. */
const isGeneral = (concept: Concept): boolean =>
  concept.needs.projects === undefined && concept.needs.lang === undefined

/** `true` si a esa persona le puede salir ese concepto. */
export function fits(concept: Concept, learner: Learner): boolean {
  const { projects, lang } = concept.needs

  if (lang !== undefined && !languagesOf(learner.slugs).has(lang)) return false
  if (projects !== undefined && !projects.some((slug) => learner.slugs.has(slug))) return false

  return true
}

/**
 * La dificultad de ahora, de 1 a 5. Hasta que no hay respuestas suficientes,
 * la de partida; después, la que dice lo que falla la gente (con lo de partida
 * pesando como si fueran veinte respuestas, para que no dé saltos).
 */
export function levelOf(base: number, shown: number, wrong: number): number {
  if (shown < TRUSTED_AFTER) return base

  // Lo que se espera que falle cada nivel de partida, para mezclarlo con lo visto.
  const prior = (base - 1) * 0.18 + 0.1
  const rate = (wrong + prior * TRUSTED_AFTER) / (shown + TRUSTED_AFTER)

  if (rate < 0.15) return 1
  if (rate < 0.3) return 2
  if (rate < 0.5) return 3
  if (rate < 0.7) return 4

  return 5
}

/** Un generador de números al azar con semilla: la misma semilla, la misma serie. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Un número a partir de un texto, para sembrar el azar. */
function hashOf(text: string): number {
  let hash = 2166136261

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** Baraja una copia. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    const swap = copy[index] as T

    copy[index] = copy[other] as T
    copy[other] = swap
  }

  return copy
}

/** Una pregunta ya montada: lo que se enseña y cuál es la buena. */
export type Round = {
  conceptId: string
  kind: ConceptKind
  seconds: number
  prompt: string
  code: string | null
  options: string[]
  /** Posición de la buena en `options`. */
  answer: number
  why: string
}

/**
 * La pinta de una respuesta: un número (con su unidad, si la lleva), código
 * (lleva `comillas de código`) o texto. Las opciones de una pregunta tienen
 * todas la misma: si la buena es la única con número, o la única con código,
 * se adivina sin saber nada.
 */
export function shapeOf(answer: string): 'number' | 'code' | 'text' {
  const text = answer.trim()

  if (/^[-+−]?(0x[0-9a-f]+|0b[01]+|\d[\d.,']*)(\s?[a-zA-Z%]{1,5})?$/i.test(text)) return 'number'

  return text.includes('`') ? 'code' : 'text'
}

/** Monta una pregunta de un concepto: una forma, una manera de preguntar, una buena y tres malas. */
export function buildRound(concept: Concept, random: () => number): Round {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T
  const form = pick(concept.forms)
  const right = pick(form.right)
  // Todas con la pinta de la buena (`shapeOf`). Si la forma trae sus propias
  // malas, salen solo esas: las comunes pueden no pegar con lo que pregunta.
  const shape = shapeOf(right)
  const alike = (list: readonly string[]): string[] =>
    shuffled(list, random).filter((each) => shapeOf(each) === shape)
  const own = alike(form.wrong ?? [])
  const wrong = [
    ...new Set(own.length >= OPTIONS - 1 ? own : [...own, ...alike(concept.wrong)]),
  ].slice(0, OPTIONS - 1)
  const options = shuffled([right, ...wrong], random)

  return {
    conceptId: concept.id,
    kind: concept.kind,
    seconds: concept.seconds ?? SECONDS[concept.kind],
    prompt: pick(form.ask),
    code: concept.code ?? null,
    options,
    answer: options.indexOf(right),
    why: concept.why,
  }
}

/**
 * En qué orden ve cada persona las respuestas de una pregunta: distinto para
 * cada cual (no sirve decir «la de arriba») y el mismo cada vez que la mira.
 * Devuelve las posiciones de `options` en el orden en que se enseñan.
 */
export function orderFor(seed: string, size: number): number[] {
  return shuffled(
    Array.from({ length: size }, (_, index) => index),
    seeded(hashOf(seed)),
  )
}

type PoolOptions = {
  pool: QuizPool
  kinds: QuizKinds
  difficulty: QuizDifficulty
  /** La dificultad de ahora de cada concepto (`levelOf`). */
  levels: ReadonlyMap<string, number>
  count: number
}

/** Los niveles que entran en cada dificultad de partida. */
const LEVELS: Record<Exclude<QuizDifficulty, 'rising'>, readonly number[]> = {
  easy: [1, 2],
  medium: [2, 3, 4],
  hard: [4, 5],
}

/**
 * Los conceptos de una partida: los que les pueden salir a **todos** los que
 * juegan (o solo los generales), del tipo y la dificultad elegidos, sin
 * repetir mientras haya. Si la dificultad deja muy pocos, se completa con los
 * más cercanos. En `rising`, ordenados de fáciles a difíciles.
 */
export function pickConcepts(
  bank: readonly Concept[],
  learners: readonly Learner[],
  options: PoolOptions,
  random: () => number,
): Concept[] {
  const level = (concept: Concept): number => options.levels.get(concept.id) ?? concept.level
  const usable = bank.filter(
    (concept) =>
      (options.pool === 'general' ? isGeneral(concept) : true) &&
      (options.kinds === 'mixed' || concept.kind === options.kinds) &&
      learners.every((learner) => fits(concept, learner)),
  )
  const range = options.difficulty === 'rising' ? null : LEVELS[options.difficulty]
  const wanted =
    range === null ? usable : usable.filter((concept) => range.includes(level(concept)))
  // Si la dificultad deja pocos, se completa con los de nivel más cercano.
  const target = range === null ? 3 : range.reduce((sum, value) => sum + value, 0) / range.length
  const rest = shuffled(
    usable.filter((concept) => !wanted.includes(concept)),
    random,
  ).sort((a, b) => Math.abs(level(a) - target) - Math.abs(level(b) - target))
  const chosen = [...shuffled(wanted, random), ...rest].slice(0, options.count)

  return options.difficulty === 'rising' ? chosen.sort((a, b) => level(a) - level(b)) : chosen
}

/**
 * Lo que suma una respuesta. Acertar suma uno; en la versión competitiva,
 * fallar resta uno (no contestar no resta: el tiempo ya castiga).
 */
export function pointsFor(correct: boolean | null, competitive: boolean): number {
  if (correct === true) return 1

  return competitive && correct === false ? -1 : 0
}
