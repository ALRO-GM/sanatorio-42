/**
 * Los tipos de objeto que conoce el clúster simulado (`kubectl api-resources`):
 * cómo se llaman en plural, en singular y en corto, su `apiVersion` y si
 * viven en un namespace. Así `deploy`, `deployment`, `deployments` y
 * `deployments.apps` son lo mismo.
 */

import { Fail } from '@sanatorio/shellsim'

export type KindInfo = {
  kind: string
  plural: string
  shorts: string[]
  apiVersion: string
  namespaced: boolean
  /** Se calcula al vuelo (EndpointSlice, Endpoints, Event): no se crea ni se borra. */
  derived?: boolean
}

export const KINDS: KindInfo[] = [
  { kind: 'Namespace', plural: 'namespaces', shorts: ['ns'], apiVersion: 'v1', namespaced: false },
  { kind: 'Node', plural: 'nodes', shorts: ['no'], apiVersion: 'v1', namespaced: false },
  { kind: 'Pod', plural: 'pods', shorts: ['po'], apiVersion: 'v1', namespaced: true },
  {
    kind: 'Deployment',
    plural: 'deployments',
    shorts: ['deploy'],
    apiVersion: 'apps/v1',
    namespaced: true,
  },
  {
    kind: 'ReplicaSet',
    plural: 'replicasets',
    shorts: ['rs'],
    apiVersion: 'apps/v1',
    namespaced: true,
  },
  {
    kind: 'StatefulSet',
    plural: 'statefulsets',
    shorts: ['sts'],
    apiVersion: 'apps/v1',
    namespaced: true,
  },
  { kind: 'Job', plural: 'jobs', shorts: [], apiVersion: 'batch/v1', namespaced: true },
  { kind: 'CronJob', plural: 'cronjobs', shorts: ['cj'], apiVersion: 'batch/v1', namespaced: true },
  { kind: 'Service', plural: 'services', shorts: ['svc'], apiVersion: 'v1', namespaced: true },
  {
    kind: 'Endpoints',
    plural: 'endpoints',
    shorts: ['ep'],
    apiVersion: 'v1',
    namespaced: true,
    derived: true,
  },
  {
    kind: 'EndpointSlice',
    plural: 'endpointslices',
    shorts: [],
    apiVersion: 'discovery.k8s.io/v1',
    namespaced: true,
    derived: true,
  },
  { kind: 'ConfigMap', plural: 'configmaps', shorts: ['cm'], apiVersion: 'v1', namespaced: true },
  { kind: 'Secret', plural: 'secrets', shorts: [], apiVersion: 'v1', namespaced: true },
  {
    kind: 'ServiceAccount',
    plural: 'serviceaccounts',
    shorts: ['sa'],
    apiVersion: 'v1',
    namespaced: true,
  },
  {
    kind: 'PersistentVolumeClaim',
    plural: 'persistentvolumeclaims',
    shorts: ['pvc'],
    apiVersion: 'v1',
    namespaced: true,
  },
  {
    kind: 'PersistentVolume',
    plural: 'persistentvolumes',
    shorts: ['pv'],
    apiVersion: 'v1',
    namespaced: false,
  },
  {
    kind: 'StorageClass',
    plural: 'storageclasses',
    shorts: ['sc'],
    apiVersion: 'storage.k8s.io/v1',
    namespaced: false,
  },
  {
    kind: 'Ingress',
    plural: 'ingresses',
    shorts: ['ing'],
    apiVersion: 'networking.k8s.io/v1',
    namespaced: true,
  },
  {
    kind: 'IngressClass',
    plural: 'ingressclasses',
    shorts: [],
    apiVersion: 'networking.k8s.io/v1',
    namespaced: false,
  },
  {
    kind: 'NetworkPolicy',
    plural: 'networkpolicies',
    shorts: ['netpol'],
    apiVersion: 'networking.k8s.io/v1',
    namespaced: true,
  },
  {
    kind: 'HorizontalPodAutoscaler',
    plural: 'horizontalpodautoscalers',
    shorts: ['hpa'],
    apiVersion: 'autoscaling/v2',
    namespaced: true,
  },
  {
    kind: 'Event',
    plural: 'events',
    shorts: ['ev'],
    apiVersion: 'v1',
    namespaced: true,
    derived: true,
  },
  {
    kind: 'GatewayClass',
    plural: 'gatewayclasses',
    shorts: ['gc'],
    apiVersion: 'gateway.networking.k8s.io/v1',
    namespaced: false,
  },
  {
    kind: 'Gateway',
    plural: 'gateways',
    shorts: ['gtw'],
    apiVersion: 'gateway.networking.k8s.io/v1',
    namespaced: true,
  },
  {
    kind: 'HTTPRoute',
    plural: 'httproutes',
    shorts: [],
    apiVersion: 'gateway.networking.k8s.io/v1',
    namespaced: true,
  },
]

const groupOf = (info: KindInfo): string =>
  info.apiVersion.includes('/') ? (info.apiVersion.split('/')[0] ?? '') : ''

/** El tipo por cualquiera de sus nombres (`deploy`, `Deployment`, `deployments.apps`), o `undefined`. */
export function findKind(word: string): KindInfo | undefined {
  const name = word.toLowerCase()

  return KINDS.find((info) => {
    const group = groupOf(info)
    const names = [info.plural, info.kind.toLowerCase(), ...info.shorts]

    return (
      names.includes(name) ||
      (group !== '' && names.some((each) => `${each}.${group}` === name)) ||
      (info.kind === 'HorizontalPodAutoscaler' && name === 'horizontalpodautoscaler')
    )
  })
}

export function mustKind(word: string): KindInfo {
  const info = findKind(word)

  if (info === undefined)
    throw new Fail(`error: the server doesn't have a resource type "${word.toLowerCase()}"`, 1)

  return info
}

/** Por `kind` (`Deployment`) y `apiVersion`: lo que se lee de un manifiesto. */
export function kindOfManifest(kind: string, apiVersion: string): KindInfo | undefined {
  return KINDS.find(
    (info) =>
      info.kind === kind &&
      !info.derived &&
      (info.apiVersion === apiVersion ||
        // `autoscaling/v1` también vale para un HPA; `extensions` ya no existe.
        (info.kind === 'HorizontalPodAutoscaler' && apiVersion === 'autoscaling/v1')),
  )
}

/** Cómo se escribe en las salidas (`deployment.apps/web`, `service/web`). */
export function resourceName(info: KindInfo): string {
  const group = groupOf(info)
  const singular = info.kind.toLowerCase()

  return group === '' ? singular : `${singular}.${group}`
}
