/**
 * Una unidad del curso de Docker, con la forma de la plantilla de cursos
 * (`docs/plantilla-cursos.md`): teoría, ejemplo y prueba. Igual que en el de
 * shell, se monta solo con órdenes: la preparación deja el mundo de partida y
 * la solución llega al objetivo, que nunca se escribe a mano. Se comprueba el
 * estado final (contenedores, imágenes, lo que contesta un puerto), no las
 * órdenes exactas: cualquier forma equivalente vale.
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
  /**
   * Cómo se dice cada cosa que se comprueba (la clave de `Check`, como
   * `container:web` o `probe:cache`), si el nombre genérico no basta.
   */
  objectives?: Record<string, string>
}

/** Un fichero que prepara la unidad en `dev1` (`~/` es la carpeta de `peer`). */
type FileSpec = string | { text: string; size?: number; mode?: number }

export type Setup = {
  files?: Record<string, FileSpec>
  /** Órdenes que se ejecutan como `peer` antes de empezar (descargar, arrancar algo roto…). */
  run?: string[]
  /** Dónde empiezas (por defecto, `~`). */
  cwd?: string
}

/**
 * Qué se compara entre tu mundo y el de la solución. Cada cosa da una clave
 * (`container:web`, `http:localhost:8080/`…) que se ve en la lista de
 * objetivos y se marca sola.
 */
export type Check = {
  /** Contenedores por nombre: estado (y código de salida), imagen pedida, puertos y salud. */
  containers?: string[]
  /** Que no exista ningún contenedor con este nombre. */
  gone?: string[]
  /** Imágenes que tienen que existir con esa etiqueta. */
  images?: string[]
  /** Plantilla de `docker inspect -f` sobre un objeto: `'web {{.HostConfig.Memory}}'`. */
  inspect?: string[]
  /** Lo que contesta el anfitrión: `'localhost:8080/health'`. */
  http?: string[]
  /** Una orden dentro de un contenedor y lo que escribe: `'db psql -U postgres -c \\dt'`. */
  exec?: string[]
  volumes?: string[]
  networks?: string[]
  /** Referencias publicadas en el registro. */
  registry?: string[]
  /** Ficheros del anfitrión: que existan con el mismo contenido. */
  files?: string[]
  /** Ficheros del anfitrión que tienen que existir (sin mirar dentro). */
  exists?: string[]
  /** Una imagen que pesa menos de tantos MB: `'api:2.0 200'`. */
  size?: string[]
  /**
   * Órdenes de la shell sobre una copia de tu mundo al final; su salida tiene
   * que ser la de la solución. Sirven para comprobar por lo que hace (la
   * caché de un Dockerfile, que no se cuela el `.env`).
   */
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
  /**
   * Órdenes o subórdenes de docker que hay que usar (una de cada grupo) en
   * alguna orden que salga bien: `[['logs', 'inspect']]`.
   */
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
