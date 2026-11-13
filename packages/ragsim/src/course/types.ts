/**
 * Una unidad del curso de RAG, con la forma de la plantilla de cursos
 * (`docs/plantilla-cursos.md`): teoría, ejemplo y prueba. La prueba no es una
 * terminal sino un **banco de pruebas**: se ajustan los mandos de la tubería,
 * se calcula algo a mano o se eligen y ordenan trozos, y se comprueba contra
 * el corpus. Como en los demás cursos, el objetivo nunca se escribe a mano:
 * sale de ejecutar la solución (los mandos de referencia) o lo calcula el
 * motor (lo que hay que contar, elegir u ordenar).
 */

import type { Theory, UnitKind } from '@sanatorio/course'

import type { ApiRequest } from '../ops.js'
import type { Config } from '../pipeline.js'

export type Tier = 'beginner' | 'intermediate' | 'advanced'

/** Los mandos que una unidad cambia sobre la tubería de partida. */
export type Setup = Partial<Config>

export type Knob = keyof Config

/** Algo que la configuración tiene que cumplir; el umbral es lo que mide la solución. */
export type Objective = { metric: string; op: '>=' | '<=' | '=' }

/** Ajustar la tubería hasta cumplir los objetivos sobre unas preguntas. */
export type TuneTask = {
  kind: 'tune'
  /** De dónde se parte (sobre `DEFAULTS`). */
  base?: Setup
  /** Los mandos que se pueden tocar. */
  knobs: Knob[]
  /** Si un mando de elegir no enseña todas sus opciones (las que aún no se han explicado), cuáles sí. */
  only?: Partial<Record<Knob, string[]>>
  /** Las preguntas con las que se mide al comprobar. */
  questions: string[]
  /** Si las hay, preguntas de desarrollo: medir con ellas no cuenta (las de `questions` no se ven). */
  dev?: string[]
  /** Si además se simula una mañana de producción (`runWorkload`): métricas `ops.*`. */
  workload?: boolean
  objectives: Objective[]
  /** Las ejecuciones de referencia, en orden: la última cumple y fija los umbrales. */
  solution: Setup[]
}

/** Algo que se calcula a mano; lo que vale lo dice el motor. */
export type Ask =
  /** Cuántas veces sale un término en un trozo. */
  | { kind: 'tf'; term: string; chunk: string; docs: string[] }
  /** En cuántos trozos sale. */
  | { kind: 'df'; term: string; docs: string[] }
  | { kind: 'idf'; term: string; docs: string[] }
  /** Cuántas veces nombra un texto un concepto (una dimensión de su embedding). */
  | { kind: 'count'; text: string; concept: string }
  /** El coseno de dos textos, mirando solo esos conceptos. */
  | { kind: 'cosine'; a: string; b: string; concepts: string[] }
  /** La puntuación RRF de un trozo para una pregunta. */
  | { kind: 'rrf'; question: string; chunk: string; config?: Setup }
  | { kind: 'recall'; questions: string[]; k: number; config?: Setup }
  | { kind: 'precision'; question: string; k: number; config?: Setup }
  | { kind: 'mrr'; questions: string[]; config?: Setup }
  /** Cuántos trozos caben en el prompt. */
  | { kind: 'fits'; question: string; config?: Setup }
  /** La media de recall@3 de una configuración en varias particiones. */
  | { kind: 'mean'; folds: string[][]; config?: Setup }

export type CalcTask = { kind: 'calc'; asks: Ask[] }

export type PickCase =
  /** Marcar, de los primeros resultados, los trozos que contienen la respuesta. */
  | { of: 'relevant'; question: string; config?: Setup; show: number }
  /** Elegir la configuración que mejor mide en un conjunto (no la que mejor se ve en dos ejemplos). */
  | {
      of: 'best'
      presets: Record<string, Setup>
      questions: string[]
      demo: string[]
      metric: string
    }
  /** Decir en qué etapa se pierde la respuesta. */
  | { of: 'stage'; question: string; config?: Setup }

export type PickTask = { kind: 'pick'; cases: PickCase[] }

/** Ordenar los primeros trozos como los deja la fusión. */
export type OrderTask = { kind: 'order'; question: string; config?: Setup; show: number }

/** Hacer la petición correcta a la API del RAG. */
export type ApiTask = {
  kind: 'api'
  config?: Setup
  /** Las preguntas entre las que se elige el cuerpo. */
  questions: string[]
  solution: ApiRequest
}

export type Task = TuneTask | CalcTask | PickTask | OrderTask | ApiTask

export type Focus = 'answer' | 'chunks' | 'lexical' | 'semantic' | 'fusion' | 'rerank' | 'prompt'

/** Un paso del ejemplo: lo ejecuta el motor y la web lo anima. */
export type Frame =
  | { show: 'trace'; question: string; config?: Setup; focus: Focus }
  | { show: 'calc'; ask: Ask }
  | { show: 'metrics'; config?: Setup; questions: string[]; keys: string[] }
  | { show: 'ops'; config?: Setup }
  | { show: 'api'; request: ApiRequest; config?: Setup }

/** Lo que se lee de una unidad, en un idioma. */
export type UnitText = {
  title: string
  /** El reto, en una o dos frases. */
  goal: string
  theory?: Theory
  /** La pregunta de predicción del ejemplo. */
  example?: string
  /** El pie de cada paso del ejemplo. */
  frames?: string[]
  /** La historia de un jefe. */
  story?: string
  /** Las tareas de un jefe, una por banco de pruebas. */
  tasks?: string[]
}

export type UnitDef = {
  id: string
  block: number
  tier: Tier
  kind: UnitKind
  es: UnitText
  en: UnitText
  fr?: UnitText
  tasks: Task[]
  example?: Frame[]
  /** Segundos del contrarreloj (jefes). */
  limit?: number
}

/** Una unidad con su solución ya codificada como la mandaría la web (una ejecución por línea). */
export type Unit = UnitDef & { readonly solution: string[] }

/** La pieza de tu propio RAG que ya puedes escribir al acabar un bloque. */
export type BuildStep = {
  /** Qué pieza es. */
  piece: string
  /** Un esqueleto corto en Python: comentarios y firmas, no la solución. */
  skeleton: string[]
  /** Cómo comprobar que funciona. */
  verify: string
}

export type BlockText = { title: string; pitch: string; build: BuildStep }

export type Block = {
  n: number
  tier: Tier
  es: BlockText
  en: BlockText
  fr?: BlockText
  /** Los perfiles de trabajo que más lo usan. */
  jobs: string[]
}
