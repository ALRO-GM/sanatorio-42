/**
 * Los topes de la shell simulada. La terminal del curso no toca el ordenador
 * de nadie (todo es un objeto en memoria: sin `fs`, sin procesos, sin `eval`,
 * sin red), pero quien escribe puede intentar colgarla o llenarla: un bucle
 * infinito, una expresión regular que se dispara, miles de ficheros, salidas
 * enormes. En la web eso colgaría la pestaña y en la API (que vuelve a
 * ejecutar cada intento) se comería la CPU y la memoria. Por eso:
 *
 * - Cada orden tiene un **presupuesto de trabajo** (`Budget`): cada comando,
 *   cada vuelta de un bucle, cada paso de una expresión regular o de awk lo
 *   gastan. Si se acaba, la orden falla y el mundo queda como estaba.
 * - Después de cada orden se mide el mundo (`withinLimits`): ficheros,
 *   tamaños, procesos. Si se pasa, falla igual y no cambia nada.
 * - Las expresiones regulares son de un motor propio (`regex.ts`) que va en
 *   tiempo lineal: no hay patrón que lo cuelgue.
 *
 * Los números dejan de sobra para cualquier reto (el más grande crea una
 * docena de ficheros y ejecuta un bucle de 20 vueltas).
 */

import type { Machine, World } from './model.js'
import { ShellError } from './model.js'

export const LIMITS = {
  /** Caracteres de una orden de la terminal (puede tener varias líneas: un heredoc, un bucle). */
  entry: 2000,
  /** Líneas de una orden. */
  entryLines: 60,
  /** Órdenes de un intento que la API vuelve a ejecutar. */
  attemptEntries: 300,
  /** Ficheros, carpetas y enlaces de una máquina. */
  nodes: 400,
  /** Caracteres de un fichero. */
  fileChars: 12_000,
  /** Caracteres de todos los ficheros de una máquina. */
  totalChars: 120_000,
  /** Caracteres de una ruta. */
  path: 200,
  /** Procesos de una máquina. */
  procs: 80,
  /** Líneas del registro de una máquina (las viejas se van, como en un journal de verdad). */
  journal: 300,
  /** Caracteres de una variable. */
  varChars: 4000,
  /** Variables de la sesión. */
  vars: 100,
  /** Caracteres de lo que una orden escribe en la pantalla (lo demás se corta). */
  output: 20_000,
  /** Vueltas de un bucle. */
  loop: 1000,
  /** Comandos que puede ejecutar una orden (bucles y guiones incluidos). */
  commands: 3000,
  /** Profundidad de guiones dentro de guiones, funciones y `$(…)`. */
  depth: 12,
  /** Unidades de trabajo de una orden (comandos, pasos de regex y de awk…). */
  work: 4_000_000,
  /** Tamaño del mundo entero en JSON. */
  worldBytes: 600_000,
} as const

/** El presupuesto de trabajo de una orden. */
export class Budget {
  private work = 0
  private commands = 0

  /** Gasta `n` unidades; si se acaba, la orden falla. */
  tick(n = 1): void {
    this.work += n
    if (this.work > LIMITS.work)
      throw new ShellError(
        'peer4u-sandbox: demasiado trabajo para una orden (¿un bucle sin fin?): se para aquí',
      )
  }

  command(): void {
    this.commands++
    this.tick(50)
    if (this.commands > LIMITS.commands)
      throw new ShellError(
        `peer4u-sandbox: más de ${LIMITS.commands} comandos en una orden: se para aquí`,
      )
  }
}

/**
 * Nombres que no valen como clave de nada: los de las propiedades de un objeto
 * de JavaScript. El estado son objetos planos y `__proto__` como nombre de
 * fichero, usuario o variable daría resultados raros en vez de un error.
 */
const RESERVED = new Set([...Object.getOwnPropertyNames(Object.prototype), '__proto__'])

export const reserved = (name: string): boolean => RESERVED.has(name)

/** Borra una clave de un objeto del estado (sin `delete` dinámico). */
export function drop(record: object, key: string): void {
  Reflect.deleteProperty(record, key)
}

/** El valor de una clave propia (nunca uno heredado del prototipo). */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

function machineWithin(machine: Machine): void {
  const paths = Object.keys(machine.fs)

  if (paths.length > LIMITS.nodes)
    throw new ShellError(
      `peer4u-sandbox: demasiados ficheros en ${machine.name} (${paths.length}): el máximo es ${LIMITS.nodes}`,
    )

  let total = 0

  for (const path of paths) {
    const node = machine.fs[path]

    if (node?.kind !== 'file') continue
    if (node.text.length > LIMITS.fileChars)
      throw new ShellError(
        `peer4u-sandbox: ${path} es demasiado grande: como mucho ${LIMITS.fileChars} caracteres`,
      )
    total += node.text.length
  }
  if (total > LIMITS.totalChars)
    throw new ShellError(
      `peer4u-sandbox: los ficheros de ${machine.name} ocupan demasiado: como mucho ${LIMITS.totalChars} caracteres`,
    )
  if (machine.procs.length > LIMITS.procs)
    throw new ShellError(`peer4u-sandbox: demasiados procesos: el máximo es ${LIMITS.procs}`)
}

/** Comprueba que el mundo sigue dentro de los topes. Lanza un `ShellError`. */
export function withinLimits(world: World): void {
  for (const machine of Object.values(world.machines)) {
    machineWithin(machine)
    // El registro se recorta solo, como un journal con tope de tamaño.
    if (machine.journal.length > LIMITS.journal)
      machine.journal.splice(0, machine.journal.length - LIMITS.journal)
  }

  const session = world.session

  if (Object.keys(session.vars).length + Object.keys(session.env).length > LIMITS.vars * 2)
    throw new ShellError(`peer4u-sandbox: demasiadas variables: el máximo es ${LIMITS.vars}`)
  if (world.stack.length > LIMITS.depth)
    throw new ShellError('peer4u-sandbox: demasiadas sesiones abiertas una dentro de otra')
  if (JSON.stringify(world).length > LIMITS.worldBytes)
    throw new ShellError(
      'peer4u-sandbox: el mundo ha crecido demasiado para este simulador: empieza de nuevo',
    )
}

/** Un nombre de fichero (cada parte de una ruta) que se puede guardar. */
export function safeName(name: string): void {
  if (reserved(name)) throw new ShellError(`peer4u-sandbox: «${name}» no vale como nombre`)
  if (name.length > 120) throw new ShellError(`${name.slice(0, 40)}…: File name too long`)
}
