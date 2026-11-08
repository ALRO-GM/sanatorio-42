/**
 * Los topes de Kubernetes simulado, encima de los de la shell (`LIMITS` de
 * `@sanatorio/shellsim`: largo de una orden, tamaño de los ficheros, trabajo
 * por orden y tamaño del mundo). Aquí, lo que es del clúster: cuántos
 * objetos, cuántos Pods, cuántas réplicas, cuánto YAML se lee y cuánto se
 * guarda de los eventos. Si algo se pasa, la orden falla con un mensaje y el
 * mundo queda como estaba (`run` de la shell).
 *
 * Los números dejan de sobra para cualquier reto: el más grande levanta una
 * tienda con front, API y base de datos, con su Ingress, HPA y políticas.
 */

import { LIMITS as SHELL, ShellError } from '@sanatorio/shellsim'

import type { Cluster } from './model.js'

export const LIMITS = {
  // Los de la shell (largo de una orden, órdenes por intento…) valen igual aquí.
  ...SHELL,
  /** Objetos de un clúster (de todos los tipos, Pods incluidos). */
  objects: 260,
  /** Pods de un clúster. */
  pods: 80,
  /** Réplicas de un Deployment, ReplicaSet o StatefulSet. */
  replicas: 12,
  /** Namespaces de un clúster. */
  namespaces: 16,
  /** Documentos de un YAML (`---`). */
  documents: 24,
  /** Caracteres de un valor de un ConfigMap o Secret. */
  valueChars: 4000,
  /** Eventos que se guardan (los viejos se van, como en un clúster de verdad). */
  events: 120,
  /** Port-forwards abiertos. */
  forwards: 10,
  /** Revisiones de Helm que se guardan por release. */
  helmRevisions: 10,
  /** Ficheros de un volumen o de la capa de un contenedor. */
  files: 60,
  /** Pasos de los controladores en una orden (cada uno, unos segundos de reloj). */
  steps: 160,
} as const

/** Comprueba que el clúster sigue dentro de los topes; si no, la orden falla y no cambia nada. */
export function withinLimits(cluster: Cluster): void {
  const objects = Object.values(cluster.objects)
  const checks: [number, number, string][] = [
    [objects.length, LIMITS.objects, 'objetos'],
    [objects.filter((each) => each.kind === 'Pod').length, LIMITS.pods, 'Pods'],
    [objects.filter((each) => each.kind === 'Namespace').length, LIMITS.namespaces, 'namespaces'],
  ]

  for (const [count, max, what] of checks)
    if (count > max)
      throw new ShellError(
        `peer4u-sandbox: demasiados ${what} en el clúster (${count}): el máximo es ${max}. Borra lo que no uses con kubectl delete`,
      )
  if (cluster.events.length > LIMITS.events)
    cluster.events.splice(0, cluster.events.length - LIMITS.events)
  for (const files of Object.values(cluster.store))
    if (Object.keys(files).length > LIMITS.files)
      throw new ShellError('peer4u-sandbox: demasiados ficheros en un volumen')
}

/** Las claves que no valen como nombre (las del prototipo de un objeto de JavaScript). */
const RESERVED = new Set([...Object.getOwnPropertyNames(Object.prototype), '__proto__'])

/** Un nombre que se puede guardar como clave. */
export function safeKey(name: string, what: string): string {
  if (RESERVED.has(name) || name.length > 253)
    throw new ShellError(`peer4u-sandbox: «${name.slice(0, 40)}» no vale como ${what}`)

  return name
}

/** El valor de una clave propia (nunca uno heredado del prototipo). */
export function own<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

/** Borra una clave del estado (sin `delete` dinámico). */
export function drop(record: object, key: string): void {
  Reflect.deleteProperty(record, key)
}
