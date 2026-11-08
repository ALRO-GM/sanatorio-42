/**
 * El almacén de objetos de un clúster (lo que en Kubernetes guarda etcd):
 * buscar, listar, guardar y borrar por tipo, namespace y nombre, y apuntar
 * eventos. Es lo único que toca `cluster.objects` directamente.
 */

import type { World } from '@sanatorio/shellsim'

import { drop, own, safeKey } from './limits.js'
import type { Cluster, K8sEvent, K8sObject, K8sState } from './model.js'
import { clockOf, k8sOf, keyOf } from './model.js'
import { uidOf } from './util.js'

/** Lo que necesita casi cualquier operación: el mundo, el clúster del contexto y su namespace. */
export type Env = { world: World; state: K8sState; cluster: Cluster; ns: string; now: number }

export function envOfWorld(world: World): Env {
  const state = k8sOf(world)
  const context = own(state.contexts, state.current)
  const cluster = context === undefined ? undefined : own(state.clusters, context.cluster)

  if (context === undefined || cluster === undefined)
    throw new Error(`el contexto ${state.current} no existe`)

  return { world, state, cluster, ns: context.namespace, now: clockOf(world, state) }
}

export const nsOf = (object: K8sObject): string => object.metadata.namespace ?? ''

export function getObject(
  cluster: Cluster,
  kind: string,
  ns: string,
  name: string,
): K8sObject | undefined {
  return own(cluster.objects, keyOf(kind, ns, name))
}

/** Los objetos de un tipo (en un namespace, o en todos con `null`), por nombre. */
export function list(cluster: Cluster, kind: string, ns: string | null): K8sObject[] {
  return Object.values(cluster.objects)
    .filter((each) => each.kind === kind && (ns === null || nsOf(each) === ns))
    .sort((a, b) =>
      nsOf(a) === nsOf(b)
        ? a.metadata.name.localeCompare(b.metadata.name)
        : nsOf(a).localeCompare(nsOf(b)),
    )
}

/** Guarda un objeto: le pone uid y hora de creación si es nuevo. */
export function put(cluster: Cluster, object: K8sObject, now: number): K8sObject {
  const key = keyOf(object.kind, nsOf(object), safeKey(object.metadata.name, 'nombre'))
  const old = own(cluster.objects, key)

  if (old === undefined) {
    cluster.seq++
    object.metadata.uid ??= uidOf(`${key}#${cluster.seq}`)
    object.metadata.creationTimestamp ??= now
  } else {
    object.metadata.uid = old.metadata.uid ?? uidOf(key)
    object.metadata.creationTimestamp = old.metadata.creationTimestamp ?? now
  }
  cluster.objects[key] = object

  return object
}

export function remove(cluster: Cluster, object: K8sObject): void {
  drop(cluster.objects, keyOf(object.kind, nsOf(object), object.metadata.name))
}

export const labelsOf = (object: K8sObject): Record<string, string> => object.metadata.labels ?? {}

/** ¿Lo controla este dueño? */
export const ownedBy = (object: K8sObject, owner: K8sObject): boolean =>
  (object.metadata.ownerReferences ?? []).some((ref) => ref.uid === owner.metadata.uid)

export function ownerRef(owner: K8sObject): {
  kind: string
  name: string
  uid: string
  controller: boolean
} {
  return {
    kind: owner.kind,
    name: owner.metadata.name,
    uid: owner.metadata.uid ?? '',
    controller: true,
  }
}

/** Apunta un evento (si es igual que el último de ese objeto, solo cuenta uno más). */
export function emit(
  cluster: Cluster,
  now: number,
  ns: string,
  object: string,
  type: K8sEvent['type'],
  reason: string,
  message: string,
): void {
  const same = cluster.events.find(
    (each) =>
      each.ns === ns &&
      each.object === object &&
      each.reason === reason &&
      each.message === message,
  )

  if (same !== undefined) {
    // Como el kubelet: el mismo aviso se repite cada diez segundos como mucho.
    if (now - same.t >= 10) {
      same.count++
      same.t = now
    }

    return
  }
  cluster.events.push({ t: now, ns, object, type, reason, message, count: 1, first: now })
}

/** El número siguiente del clúster (para IP y nombres). */
export function next(cluster: Cluster): number {
  cluster.seq++

  return cluster.seq
}
