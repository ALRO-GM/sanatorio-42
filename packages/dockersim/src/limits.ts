/**
 * Los topes de Docker simulado, encima de los de la shell (`LIMITS` de
 * `@sanatorio/shellsim`: largo de una orden, tamaño de los ficheros, trabajo
 * por orden y tamaño del mundo). Aquí, lo que es de Docker: cuántas imágenes,
 * contenedores, volúmenes o redes, cuántas líneas tiene un Dockerfile o un
 * compose.yaml y cuánto se guarda de cada registro. Si algo se pasa, la orden
 * falla con un mensaje y el mundo queda como estaba (`run` de la shell).
 *
 * Los números dejan de sobra para cualquier reto: el más grande construye
 * dos imágenes y levanta cuatro servicios.
 */

import { LIMITS as SHELL, ShellError } from '@sanatorio/shellsim'

import type { DockerState } from './model.js'

export const LIMITS = {
  // Los de la shell (largo de una orden, órdenes por intento…) valen igual aquí.
  ...SHELL,
  /** Imágenes en la máquina (con etiqueta o sin ella). */
  images: 40,
  /** Etiquetas en la máquina. */
  tags: 80,
  /** Contenedores (corriendo o parados). */
  containers: 40,
  volumes: 30,
  networks: 20,
  /** Lo publicado en el registro remoto. */
  registry: 60,
  /** Líneas de un Dockerfile (con las continuaciones ya juntas). */
  dockerfileLines: 120,
  /** Etapas de un Dockerfile (`FROM`). */
  stages: 6,
  /** Capas de una imagen. */
  layers: 60,
  /** Ficheros que se copian a una imagen o viven en un contenedor o volumen. */
  files: 300,
  /** Servicios de un compose.yaml. */
  services: 12,
  /** Réplicas de un servicio (`--scale`). */
  replicas: 6,
  /** Líneas de registro que se guardan de cada contenedor (las viejas se van). */
  logLines: 200,
  /** Pasos de la caché de construcción que se recuerdan. */
  cache: 400,
  /** Caracteres de un YAML (compose o .env) que se lee. */
  yamlChars: 12_000,
  /** Profundidad de anidamiento de un YAML. */
  yamlDepth: 12,
} as const

/** Comprueba que el estado sigue dentro de los topes; si no, la orden falla y no cambia nada. */
export function withinLimits(state: DockerState): void {
  const checks: [number, number, string][] = [
    [Object.keys(state.images).length, LIMITS.images, 'imágenes'],
    [Object.keys(state.tags).length, LIMITS.tags, 'etiquetas'],
    [state.containers.length, LIMITS.containers, 'contenedores'],
    [Object.keys(state.volumes).length, LIMITS.volumes, 'volúmenes'],
    [Object.keys(state.networks).length, LIMITS.networks, 'redes'],
    [Object.keys(state.registry.tags).length, LIMITS.registry, 'imágenes publicadas'],
  ]

  for (const [count, max, what] of checks)
    if (count > max)
      throw new ShellError(
        `peer4u-sandbox: demasiadas ${what} (${count}): el máximo es ${max}. Limpia con docker system prune`,
      )
  for (const container of state.containers)
    if (container.logs.length > LIMITS.logLines)
      container.logs.splice(0, container.logs.length - LIMITS.logLines)
  if (state.cache.length > LIMITS.cache) state.cache.splice(0, state.cache.length - LIMITS.cache)
}

/** Las claves que no valen como nombre (las del prototipo de un objeto de JavaScript). */
const RESERVED = new Set([...Object.getOwnPropertyNames(Object.prototype), '__proto__'])

/** Un nombre de contenedor, volumen, red o etiqueta que se puede guardar como clave. */
export function safeKey(name: string, what: string): string {
  if (RESERVED.has(name) || name.length > 128)
    throw new ShellError(`peer4u-sandbox: «${name.slice(0, 40)}» no vale como ${what}`)

  return name
}

/** El valor de una clave propia (nunca uno heredado del prototipo). */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

/** Borra una clave del estado (sin `delete` dinámico). */
export function drop(record: object, key: string): void {
  Reflect.deleteProperty(record, key)
}
