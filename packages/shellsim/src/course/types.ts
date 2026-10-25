/**
 * Una unidad del curso de shell, con la forma de la plantilla de cursos
 * (`docs/plantilla-cursos.md`): teoría, ejemplo y prueba. Se monta solo con
 * comandos: la preparación (`setup`) deja el mundo de partida y la solución
 * llega al objetivo, así que el objetivo nunca se escribe a mano ni se
 * desfasa del motor. Los jefes (`boss`, `final`) no traen teoría: son la
 * prueba de todo lo anterior, contra el reloj.
 */

import type { Theory, UnitKind } from '@sanatorio/course'

export type Tier = 'beginner' | 'intermediate' | 'advanced'

/** Lo que se lee de una unidad, en un idioma. */
export type UnitText = {
  title: string
  /** El reto, en una o dos frases: qué hay que conseguir. */
  goal: string
  /** La teoría (no la llevan los jefes). */
  theory?: Theory
  /** Qué enseña el ejemplo, en una frase. */
  example?: string
  /** La historia de un jefe: qué ha pasado en el servidor. */
  story?: string
  /** Las tareas de un jefe, una por línea, en el orden en que se suelen hacer. */
  tasks?: string[]
}

/** Un fichero que prepara la unidad: el texto, o el texto con dueño, permisos, edad (días) o tamaño. */
export type FileSpec =
  | string
  | { text: string; owner?: string; group?: string; mode?: number; age?: number; size?: number }

export type Setup = {
  /** Ficheros que se crean (con sus carpetas). `db1:/ruta` para la otra máquina. */
  files?: Record<string, FileSpec>
  /** Órdenes que se ejecutan como root en web1 antes de empezar (procesos, servicios rotos…). */
  run?: string[]
  /** Dónde empiezas (por defecto, tu carpeta personal). */
  cwd?: string
  /** Procesos que ya están corriendo (uno que se come la CPU, uno colgado…). */
  procs?: {
    host?: string
    user: string
    cmd: string
    cpu: number
    mem: number
    stubborn?: boolean
    count?: number
  }[]
}

/**
 * Qué se compara entre tu mundo y el de la solución. Las rutas pueden ir
 * con `db1:` delante para mirar la otra máquina.
 */
export type Check = {
  /** Que exista (o no) y con el mismo contenido. */
  files?: string[]
  /** Que exista (o no) como carpeta. */
  dirs?: string[]
  /** Permisos, dueño y grupo. */
  modes?: string[]
  /** Algo de lo que escribiste en la terminal es exactamente la salida de la solución. */
  output?: boolean
  /** La carpeta en la que acabas. */
  cwd?: boolean
  /** Servicios: activo y arrancado al inicio. */
  services?: string[]
  /** Procesos cuyo comando contiene esto: vivos o no. */
  procs?: string[]
  /** Usuarios: si existen y sus grupos. */
  users?: string[]
  /** La tabla de cron de estos usuarios. */
  crontab?: string[]
  /** Variables exportadas de tu sesión. */
  env?: string[]
  /** Contenido de un paquete tar (los ficheros que lleva, sin la ruta de delante). */
  archives?: string[]
  /** El disco de esta máquina, por debajo de este porcentaje. */
  disk?: { host?: string; below: number }
  /**
   * Órdenes que se ejecutan al final sobre una copia de tu mundo (como
   * `peer`, en tu carpeta) y cuya salida tiene que ser la misma que con la
   * solución. Sirven para comprobar guiones por lo que hacen, no por cómo
   * están escritos.
   */
  probes?: string[]
}

export type Unit = {
  id: string
  /** El bloque (1–9); cada bloque acaba en su jefe. */
  block: number
  tier: Tier
  kind: UnitKind
  es: UnitText
  en: UnitText
  /** El francés; si falta, se lee el inglés (`courseText`). */
  fr?: UnitText
  setup?: Setup
  /** Las órdenes del ejemplo: se ejecutan de verdad sobre el mundo de partida. */
  example?: string[]
  /** Una solución: de su resultado sale el objetivo. */
  solution: string[]
  check: Check
  /**
   * Programas que hay que usar (al menos uno de cada grupo) en alguna orden
   * que salga bien: así una respuesta no se puede escribir a mano con `echo`.
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
  /** El francés; si falta, se lee el inglés (`courseText`). */
  fr?: BlockText
  /** Los perfiles de trabajo que más lo usan (`docs/curso-shell.md`). */
  jobs: string[]
}
