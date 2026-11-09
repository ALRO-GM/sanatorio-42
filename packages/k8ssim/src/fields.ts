/**
 * Los campos que conoce el servidor de la API, para la validación estricta
 * que hace kubectl por defecto (`--validate=strict` desde la 1.27): un campo
 * mal escrito («replica», «imagen») no se ignora, da «strict decoding error:
 * unknown field "spec.replica"». Lo que no se modela en detalle (afinidad,
 * tolerancias, `status`…) se deja abierto: mejor aceptar un campo raro que
 * rechazar uno bueno.
 */

import type { Json } from './model.js'

/** `any`: no se mira; `map`: claves libres (etiquetas, `data`…); si no, los campos que valen. */
type Shape = 'any' | 'map' | { readonly [field: string]: Shape }

const any = 'any' as const

/** Varios campos que se aceptan sin mirar dentro. */
const open = (...names: string[]): Record<string, Shape> =>
  Object.fromEntries(names.map((name) => [name, any]))

const META: Shape = {
  ...open(
    'name',
    'generateName',
    'namespace',
    'uid',
    'resourceVersion',
    'generation',
    'creationTimestamp',
    'deletionTimestamp',
    'deletionGracePeriodSeconds',
    'ownerReferences',
    'finalizers',
    'managedFields',
    'selfLink',
  ),
  labels: 'map',
  annotations: 'map',
}

const SELECTOR: Shape = {
  matchLabels: 'map',
  matchExpressions: open('key', 'operator', 'values'),
}

const PROBE: Shape = {
  httpGet: open('path', 'port', 'host', 'scheme', 'httpHeaders'),
  tcpSocket: open('port', 'host'),
  exec: open('command'),
  grpc: open('port', 'service'),
  ...open(
    'initialDelaySeconds',
    'periodSeconds',
    'timeoutSeconds',
    'successThreshold',
    'failureThreshold',
    'terminationGracePeriodSeconds',
  ),
}

const RESOURCES: Shape = { requests: 'map', limits: 'map', claims: any }

const KEY_REF: Shape = open('name', 'key', 'optional')

const CONTAINER: Shape = {
  ...open(
    'name',
    'image',
    'imagePullPolicy',
    'command',
    'args',
    'workingDir',
    'resizePolicy',
    'restartPolicy',
    'restartPolicyRules',
    'volumeDevices',
    'lifecycle',
    'terminationMessagePath',
    'terminationMessagePolicy',
    'stdin',
    'stdinOnce',
    'tty',
    'targetContainerName',
  ),
  ports: open('name', 'containerPort', 'protocol', 'hostPort', 'hostIP'),
  env: {
    ...open('name', 'value'),
    valueFrom: {
      configMapKeyRef: KEY_REF,
      secretKeyRef: KEY_REF,
      fieldRef: open('fieldPath', 'apiVersion'),
      resourceFieldRef: any,
      fileKeyRef: any,
    },
  },
  envFrom: {
    prefix: any,
    configMapRef: open('name', 'optional'),
    secretRef: open('name', 'optional'),
  },
  resources: RESOURCES,
  volumeMounts: open(
    'name',
    'mountPath',
    'subPath',
    'subPathExpr',
    'readOnly',
    'recursiveReadOnly',
    'mountPropagation',
  ),
  livenessProbe: PROBE,
  readinessProbe: PROBE,
  startupProbe: PROBE,
  securityContext: {
    ...open(
      'runAsUser',
      'runAsGroup',
      'runAsNonRoot',
      'allowPrivilegeEscalation',
      'readOnlyRootFilesystem',
      'privileged',
      'procMount',
      'seLinuxOptions',
      'windowsOptions',
      'appArmorProfile',
    ),
    capabilities: open('add', 'drop'),
    seccompProfile: open('type', 'localhostProfile'),
  },
}

const VOLUME: Shape = {
  name: any,
  persistentVolumeClaim: open('claimName', 'readOnly'),
  configMap: open('name', 'items', 'defaultMode', 'optional'),
  secret: open('secretName', 'items', 'defaultMode', 'optional'),
  emptyDir: open('medium', 'sizeLimit'),
  hostPath: open('path', 'type'),
  // El resto de tipos de volumen existen, pero el curso no los usa.
  ...open(
    'projected',
    'downwardAPI',
    'ephemeral',
    'csi',
    'nfs',
    'image',
    'iscsi',
    'fc',
    'local',
    'awsElasticBlockStore',
    'azureDisk',
    'azureFile',
    'cephfs',
    'cinder',
    'flexVolume',
    'flocker',
    'gcePersistentDisk',
    'gitRepo',
    'glusterfs',
    'photonPersistentDisk',
    'portworxVolume',
    'quobyte',
    'rbd',
    'scaleIO',
    'storageos',
    'vsphereVolume',
  ),
}

const POD_SPEC: Shape = {
  containers: CONTAINER,
  initContainers: CONTAINER,
  volumes: VOLUME,
  imagePullSecrets: open('name'),
  securityContext: open(
    'runAsUser',
    'runAsGroup',
    'runAsNonRoot',
    'fsGroup',
    'fsGroupChangePolicy',
    'supplementalGroups',
    'supplementalGroupsPolicy',
    'seccompProfile',
    'seLinuxOptions',
    'seLinuxChangePolicy',
    'sysctls',
    'windowsOptions',
    'appArmorProfile',
  ),
  nodeSelector: 'map',
  resources: RESOURCES,
  ...open(
    'ephemeralContainers',
    'restartPolicy',
    'terminationGracePeriodSeconds',
    'activeDeadlineSeconds',
    'dnsPolicy',
    'dnsConfig',
    'serviceAccountName',
    'serviceAccount',
    'automountServiceAccountToken',
    'nodeName',
    'hostNetwork',
    'hostPID',
    'hostIPC',
    'hostUsers',
    'shareProcessNamespace',
    'hostname',
    'hostnameOverride',
    'subdomain',
    'setHostnameAsFQDN',
    'affinity',
    'schedulerName',
    'tolerations',
    'hostAliases',
    'priorityClassName',
    'priority',
    'preemptionPolicy',
    'readinessGates',
    'runtimeClassName',
    'enableServiceLinks',
    'overhead',
    'topologySpreadConstraints',
    'os',
    'schedulingGates',
    'resourceClaims',
  ),
}

const TEMPLATE: Shape = { metadata: META, spec: POD_SPEC }

const PVC_SPEC: Shape = {
  accessModes: any,
  resources: RESOURCES,
  selector: SELECTOR,
  ...open(
    'storageClassName',
    'volumeMode',
    'volumeName',
    'dataSource',
    'dataSourceRef',
    'volumeAttributesClassName',
  ),
}

const JOB_SPEC: Shape = {
  template: TEMPLATE,
  selector: SELECTOR,
  ...open(
    'backoffLimit',
    'backoffLimitPerIndex',
    'maxFailedIndexes',
    'completions',
    'parallelism',
    'activeDeadlineSeconds',
    'ttlSecondsAfterFinished',
    'completionMode',
    'suspend',
    'manualSelector',
    'podFailurePolicy',
    'podReplacementPolicy',
    'successPolicy',
    'managedBy',
  ),
}

const BACKEND: Shape = { service: { name: any, port: open('number', 'name') }, resource: any }

const PEER: Shape = {
  podSelector: SELECTOR,
  namespaceSelector: SELECTOR,
  ipBlock: open('cidr', 'except'),
}

const PORTS: Shape = open('port', 'endPort', 'protocol')

const WORKLOAD: Record<string, Shape> = {
  replicas: any,
  selector: SELECTOR,
  template: TEMPLATE,
  minReadySeconds: any,
}

/** Lo que va arriba de cada tipo (además de `apiVersion`, `kind`, `metadata` y `status`). */
const TOP: Readonly<Record<string, Readonly<Record<string, Shape>>>> = {
  Pod: { spec: POD_SPEC },
  Deployment: {
    spec: {
      ...WORKLOAD,
      strategy: { type: any, rollingUpdate: open('maxSurge', 'maxUnavailable') },
      ...open('revisionHistoryLimit', 'paused', 'progressDeadlineSeconds'),
    },
  },
  ReplicaSet: { spec: WORKLOAD },
  StatefulSet: {
    spec: {
      ...WORKLOAD,
      serviceName: any,
      volumeClaimTemplates: { apiVersion: any, kind: any, metadata: META, spec: PVC_SPEC },
      updateStrategy: { type: any, rollingUpdate: open('partition', 'maxUnavailable') },
      persistentVolumeClaimRetentionPolicy: open('whenDeleted', 'whenScaled'),
      ...open('podManagementPolicy', 'revisionHistoryLimit', 'ordinals'),
    },
  },
  Job: { spec: JOB_SPEC },
  CronJob: {
    spec: {
      jobTemplate: { metadata: META, spec: JOB_SPEC },
      ...open(
        'schedule',
        'timeZone',
        'startingDeadlineSeconds',
        'concurrencyPolicy',
        'suspend',
        'successfulJobsHistoryLimit',
        'failedJobsHistoryLimit',
      ),
    },
  },
  Service: {
    spec: {
      selector: 'map',
      ports: open('name', 'port', 'targetPort', 'protocol', 'nodePort', 'appProtocol'),
      ...open(
        'type',
        'clusterIP',
        'clusterIPs',
        'externalIPs',
        'externalName',
        'sessionAffinity',
        'sessionAffinityConfig',
        'loadBalancerIP',
        'loadBalancerSourceRanges',
        'loadBalancerClass',
        'externalTrafficPolicy',
        'internalTrafficPolicy',
        'healthCheckNodePort',
        'publishNotReadyAddresses',
        'ipFamilies',
        'ipFamilyPolicy',
        'allocateLoadBalancerNodePorts',
        'trafficDistribution',
      ),
    },
  },
  ConfigMap: { data: 'map', binaryData: 'map', immutable: any },
  Secret: { data: 'map', stringData: 'map', type: any, immutable: any },
  ServiceAccount: {
    secrets: any,
    imagePullSecrets: open('name'),
    automountServiceAccountToken: any,
  },
  Namespace: { spec: open('finalizers') },
  PersistentVolumeClaim: { spec: PVC_SPEC },
  Ingress: {
    spec: {
      ingressClassName: any,
      defaultBackend: BACKEND,
      tls: open('hosts', 'secretName'),
      rules: {
        host: any,
        http: { paths: { path: any, pathType: any, backend: BACKEND } },
      },
    },
  },
  NetworkPolicy: {
    spec: {
      podSelector: SELECTOR,
      policyTypes: any,
      ingress: { from: PEER, ports: PORTS },
      egress: { to: PEER, ports: PORTS },
    },
  },
  HorizontalPodAutoscaler: {
    spec: {
      scaleTargetRef: open('apiVersion', 'kind', 'name'),
      ...open(
        'minReplicas',
        'maxReplicas',
        'metrics',
        'behavior',
        'targetCPUUtilizationPercentage',
      ),
    },
  },
}

/** Recorre `value` y apunta (o quita, con `prune`) lo que no está en `shape`. */
function walk(value: Json, shape: Shape, path: string, out: string[], prune: boolean): void {
  if (shape === 'any' || shape === 'map' || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      walk(item, shape, `${path}[${i}]`, out, prune)
    })

    return
  }
  for (const [key, item] of Object.entries(value)) {
    const at = path === '' ? key : `${path}.${key}`
    const inner = Object.hasOwn(shape, key) ? shape[key] : undefined

    if (inner !== undefined) walk(item, inner, at, out, prune)
    else {
      out.push(at)
      if (prune) Reflect.deleteProperty(value, key)
    }
  }
}

/**
 * Los campos que el servidor no conoce, con su ruta («spec.replica»,
 * «spec.template.spec.containers[0].imagen»). Vacío si el tipo no se modela.
 * Con `prune`, además los quita (lo que hace el servidor con `--validate=false`).
 */
export function unknownFields(kind: string, doc: Json, prune = false): string[] {
  const top = TOP[kind]

  if (top === undefined) return []

  const out: string[] = []

  walk(doc, { apiVersion: any, kind: any, metadata: META, status: any, ...top }, '', out, prune)

  return out
}
