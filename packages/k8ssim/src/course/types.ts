/**
 * Una unidad del curso de Kubernetes, con la forma de la plantilla de cursos
 * (`docs/plantilla-cursos.md`) y la misma que las del curso de Docker:
 * teoría, ejemplo y prueba. La preparación deja el clúster de partida y la
 * solución llega al objetivo, que nunca se escribe a mano. Se comprueba el
 * estado final del clúster (objetos, Pods listos, lo que contesta un Service),
 * no las órdenes exactas: `kubectl create` y `apply -f` con el YAML
 * equivalente valen igual.
 */

import type { Theory, UnitKind } from '@sanatorio/course'

export type Tier = 'beginner' | 'intermediate' | 'advanced'

/** Lo que se lee de una unidad, en un idioma. */
export type UnitText = {
  title: string
  /** El reto, en una o dos frases. */
  goal: string
  theory?: Theory
  /** Qué enseña el ejemplo, en una frase. */
  example?: string
  /** La historia de un jefe. */
  story?: string
  /** Las tareas de un jefe, una por línea. */
  tasks?: string[]
  /** Cómo se dice cada cosa que se comprueba (la clave de `Check`), si el nombre genérico no basta. */
  objectives?: Record<string, string>
}

/** Un fichero que prepara la unidad en `dev1` (`~/` es la carpeta de `peer`). */
type FileSpec = string | { text: string; mode?: number }

export type Setup = {
  files?: Record<string, FileSpec>
  /** Órdenes que se ejecutan antes de empezar (crear lo que hay, romper algo…). */
  run?: string[]
  /** Dónde empiezas (por defecto, `~`). */
  cwd?: string
}

/**
 * Qué se compara entre tu clúster y el de la solución, después de dejar pasar
 * diez minutos (para que acaben los rolling updates y se vea lo que se cae).
 * Cada cosa da una clave que se ve en la lista de objetivos y se marca sola.
 * `ns tipo/nombre`: el namespace delante (sin él, un objeto sin namespace).
 */
export type Check = {
  /** Un `jsonpath` sobre un objeto: `'tienda deploy/api {.spec.replicas}'`. */
  get?: string[]
  /** Cómo está una carga (listos/deseados, imágenes, rollout): `'tienda deploy/api'`. */
  ready?: string[]
  /** Que no exista: `'default pod/prueba'`. */
  gone?: string[]
  /** Que exista (sin mirar dentro): `'tienda secret/db'`. */
  exists?: string[]
  /** Lo que contesta desde tu máquina: `'localhost:8080/'`, `'tienda.local/api/health'`. */
  http?: string[]
  /** Lo que contesta desde un Pod cualquiera de un namespace: `'tienda api:3000/health'`. */
  reach?: string[]
  /** Una orden dentro de un Pod: `'tienda deploy/db psql -U postgres -c \\dt'`. */
  exec?: string[]
  /** El contexto y el namespace de `kubectl`. */
  context?: boolean
  /** Ficheros de `dev1` con el mismo contenido. */
  files?: string[]
  /** Órdenes de la shell sobre una copia de tu mundo; su salida tiene que ser la de la solución. */
  probes?: Record<string, string[]>
  /** Algo de lo que escribiste es exactamente la salida de la solución. */
  output?: boolean
}

export type Unit = {
  id: string
  block: number
  tier: Tier
  kind: UnitKind
  es: UnitText
  en: UnitText
  fr?: UnitText
  setup?: Setup
  /** Las órdenes del ejemplo: se ejecutan de verdad sobre el mundo de partida. */
  example?: string[]
  /** Una solución: de su resultado sale el objetivo. */
  solution: string[]
  check: Check
  /** Órdenes de kubectl o helm que hay que usar (una de cada grupo) en alguna orden que salga bien. */
  requires?: string[][]
  /** Segundos del contrarreloj (jefes). */
  limit?: number
}

export type BlockText = { title: string; pitch: string }

export type Block = {
  n: number
  tier: Tier
  es: BlockText
  en: BlockText
  fr?: BlockText
  /** Los perfiles de trabajo que más lo usan. */
  jobs: string[]
}
