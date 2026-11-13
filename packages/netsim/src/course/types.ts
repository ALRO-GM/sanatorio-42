/**
 * Una unidad del curso de redes, con la forma de la plantilla de cursos
 * (`docs/plantilla-cursos.md`): teoría, ejemplo y prueba. La prueba no es una
 * terminal: o es un **esquema** de red al que le faltan valores (IP, máscara,
 * ruta, puerta de enlace), o es una **cuenta** (dada una IP y su máscara,
 * sacar red, broadcast y rango). En los dos casos la solución no se escribe
 * aparte: el esquema se guarda resuelto y las cuentas las hace el motor.
 */

import type { Theory, UnitKind } from '@sanatorio/course'

import type { Goal, Network } from '../model.js'

export type Tier = 'beginner' | 'intermediate' | 'advanced'

/** Lo que se lee de una unidad, en un idioma. */
export type UnitText = {
  title: string
  /** El reto, en una o dos frases. */
  goal: string
  theory?: Theory
  /** Qué enseña el ejemplo, con su pregunta de predicción («Antes de verlo: …»). */
  example?: string
  /** La historia de un jefe. */
  story?: string
  /** Las tareas de un jefe, una por línea. */
  tasks?: string[]
}

/** Lo que se puede preguntar de una dirección con su máscara. */
export type Ask = 'network' | 'broadcast' | 'first' | 'last' | 'hosts' | 'prefix' | 'decimal'

/**
 * Una cuenta: de una dirección con su máscara, lo que se pide (`prefix`: la
 * máscara como `/26`; `decimal`: como `255.255.255.192`); o, con `need`, el
 * prefijo de la subred más pequeña en la que caben tantos hosts.
 */
export type Question = { ip: string; mask: string; ask: Ask[] } | { need: number }

/** Un esquema: la red **resuelta**, qué valores se vacían para rellenarlos y qué tiene que alcanzar a qué. */
export type Scheme = {
  net: Network
  /** Los campos por rellenar: `nodo.interfaz.ip`, `nodo.interfaz.mask`, `nodo.route0.dest`, `nodo.route0.via`. */
  fields: string[]
  /** Con qué empieza un campo en vez de vacío (una red ya numerada, con fallos que hay que encontrar). */
  start?: Record<string, string>
  goals: Goal[]
}

export type Test = Scheme | { calc: Question[] }

/**
 * El ejemplo: otra red (no la de la prueba) con el ping que se anima; con
 * `broken`, primero se ve cómo muere con esos valores y luego cómo llega. O
 * una cuenta resuelta paso a paso.
 */
export type Example =
  { net: Network; goal: Goal; broken?: Record<string, string> } | { ip: string; mask: string }

export type Unit = {
  id: string
  block: number
  tier: Tier
  kind: UnitKind
  es: UnitText
  en: UnitText
  fr?: UnitText
  example?: Example
  test: Test
  /** Segundos del contrarreloj (jefes). */
  limit?: number
}

type BlockText = { title: string; pitch: string }

export type Block = {
  n: number
  tier: Tier
  es: BlockText
  en: BlockText
  fr?: BlockText
  /** Los perfiles de trabajo que más lo usan. */
  jobs: string[]
}
