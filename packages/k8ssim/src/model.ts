/**
 * El estado de Kubernetes simulado, guardado en el mundo de la shell
 * (`world.ext.k8s`): los contextos de `kubectl`, los clústeres con sus objetos
 * y los `port-forward` abiertos. Los objetos se guardan como JSON con la forma
 * de la API de Kubernetes (`apiVersion`, `kind`, `metadata`, `spec`, `status`),
 * así `-o yaml`, `jsonpath`, `patch` y `diff` trabajan sobre lo mismo que se
 * ve; la lógica los lee con vistas tipadas (`spec.ts`).
 */

import { ShellError } from '@sanatorio/shellsim'
import type { World } from '@sanatorio/shellsim'

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type JsonObject = Record<string, Json>

export type Meta = {
  name: string
  namespace?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  uid?: string
  /** Segundos del reloj del clúster en que se creó (en `-o yaml` sale como fecha). */
  creationTimestamp?: number
  generation?: number
  ownerReferences?: { kind: string; name: string; uid: string; controller?: boolean }[]
  /** El sufijo que pone el controlador (`web-7c9d8f6b5d-x2kq9`). */
  generateName?: string
}

export type K8sObject = {
  apiVersion: string
  kind: string
  metadata: Meta
  spec?: JsonObject
  status?: JsonObject
  /** ConfigMap y Secret (en un Secret, en base64). */
  data?: Record<string, string>
  stringData?: Record<string, string>
  type?: string
}

/** Un aviso de `kubectl get events` y de `describe`. */
export type K8sEvent = {
  t: number
  ns: string
  /** `Pod/web-…`, `Deployment/web`. */
  object: string
  type: 'Normal' | 'Warning'
  reason: string
  message: string
  count: number
  /** Cuándo pasó la primera vez (para «x3 over 2m»). */
  first?: number
}

export type Cluster = {
  name: string
  server: string
  /** Por `kind/namespace/nombre` (sin namespace: `kind//nombre`). */
  objects: Record<string, K8sObject>
  events: K8sEvent[]
  /** Contador para nombres, IP y uid deterministas. */
  seq: number
  /** Hasta qué segundo se han puesto al día los controladores. */
  now: number
  /** Lo que guardan los volúmenes y la capa de cada contenedor: `pvc:ns/nombre` o `pod:uid` → ruta → texto. */
  store: Record<string, Record<string, string>>
  /** Revisiones de Helm por `namespace/release`. */
  releases: Record<string, HelmRevision[]>
}

export type HelmRevision = {
  revision: number
  chart: string
  version: string
  appVersion: string
  values: JsonObject
  status: 'deployed' | 'superseded' | 'failed' | 'uninstalled'
  description: string
  updated: number
  /** Los objetos que creó (`kind/ns/nombre`). */
  objects: string[]
}

export type Context = { cluster: string; namespace: string; user: string }

/** Un `kubectl port-forward` que se queda «en segundo plano». */
export type Forward = {
  cluster: string
  ns: string
  /** `svc/web`, `pod/web-…`, `deploy/web`. */
  target: string
  local: number
  remote: number
}

export type K8sState = {
  contexts: Record<string, Context>
  current: string
  clusters: Record<string, Cluster>
  forwards: Forward[]
  /** Segundos que se han esperado de más (`rollout status`, `wait`, `sleep` de `kubectl`). */
  waited: number
  /** Repositorios de Helm añadidos (`helm repo add`). */
  repos: Record<string, string>
}

/** Cada orden de la terminal hace pasar este tiempo en el clúster. */
export const SECONDS_PER_ENTRY = 5

export function k8sOf(world: World): K8sState {
  const state = world.ext?.k8s

  if (state === undefined || state === null || typeof state !== 'object')
    throw new ShellError('kubectl: este mundo no tiene clúster')

  return state as K8sState
}

/** El segundo del clúster ahora: lo que avanza la terminal más lo esperado. */
export const clockOf = (world: World, state: K8sState): number =>
  world.clock * SECONDS_PER_ENTRY + state.waited

export function emptyCluster(name: string, server: string): Cluster {
  return { name, server, objects: {}, events: [], seq: 0, now: 0, store: {}, releases: {} }
}

export const keyOf = (kind: string, ns: string, name: string): string => `${kind}/${ns}/${name}`

export const MI = 1024 * 1024
