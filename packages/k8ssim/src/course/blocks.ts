/**
 * Los nueve bloques del curso de Kubernetes, por nivel. Cada bloque acaba en
 * un jefe contrarreloj y cada nivel en un jefe final con su certificado. El
 * orden sale de la investigación (`docs/referencia/curso-kubernetes-investigacion.md`):
 * el de «Learn Kubernetes Basics» (desplegar → explorar → exponer → escalar →
 * actualizar), el temario CKAD y lo que preguntan en las entrevistas.
 */

import type { Block } from './types.js'

export const BLOCKS: Block[] = [
  {
    n: 1,
    tier: 'beginner',
    es: {
      title: 'Orientarte en el clúster',
      pitch: 'Contextos, nodos, Pods, manifiestos YAML y namespaces.',
    },
    en: {
      title: 'Find your way around the cluster',
      pitch: 'Contexts, nodes, Pods, YAML manifests and namespaces.',
    },
    jobs: ['backend', 'fullstack', 'devops', 'qa'],
  },
  {
    n: 2,
    tier: 'beginner',
    es: {
      title: 'Desplegar y exponer',
      pitch: 'Deployments que se cuidan solos, escalar, labels, Services y port-forward.',
    },
    en: {
      title: 'Deploy and expose',
      pitch: 'Self-healing Deployments, scaling, labels, Services and port-forward.',
    },
    jobs: ['backend', 'fullstack', 'devops'],
  },
  {
    n: 3,
    tier: 'beginner',
    es: {
      title: 'Configurar la aplicación',
      pitch: 'ConfigMaps, Secrets y el registro privado del equipo.',
    },
    en: {
      title: 'Configure the application',
      pitch: 'ConfigMaps, Secrets and the team private registry.',
    },
    jobs: ['backend', 'devops', 'security'],
  },
  {
    n: 4,
    tier: 'intermediate',
    es: {
      title: 'Actualizar sin cortes',
      pitch: 'Rolling update, rollback, estrategias y el YAML como fuente de la verdad.',
    },
    en: {
      title: 'Update without downtime',
      pitch: 'Rolling update, rollback, strategies and YAML as the source of truth.',
    },
    jobs: ['backend', 'devops', 'sre'],
  },
  {
    n: 5,
    tier: 'intermediate',
    es: {
      title: 'Salud y recursos',
      pitch: 'Readiness, liveness y startup; requests, limits y el OOMKilled.',
    },
    en: {
      title: 'Health and resources',
      pitch: 'Readiness, liveness and startup; requests, limits and OOMKilled.',
    },
    jobs: ['sre', 'devops', 'backend'],
  },
  {
    n: 6,
    tier: 'intermediate',
    es: {
      title: 'Depurar',
      pitch:
        'CrashLoopBackOff, ImagePullBackOff, Pending, entrar a mirar y Services que no llegan.',
    },
    en: {
      title: 'Debug',
      pitch:
        'CrashLoopBackOff, ImagePullBackOff, Pending, looking inside and Services that do not connect.',
    },
    jobs: ['sre', 'devops', 'backend', 'qa'],
  },
  {
    n: 7,
    tier: 'advanced',
    es: {
      title: 'Datos y tareas',
      pitch: 'Volúmenes persistentes, StatefulSet, Jobs, CronJobs y contenedores init.',
    },
    en: {
      title: 'Data and tasks',
      pitch: 'Persistent volumes, StatefulSet, Jobs, CronJobs and init containers.',
    },
    jobs: ['backend', 'data', 'sre', 'devops'],
  },
  {
    n: 8,
    tier: 'advanced',
    es: {
      title: 'Tráfico, escala y aislamiento',
      pitch: 'Ingress (y Gateway API), autoescalado y NetworkPolicies.',
    },
    en: {
      title: 'Traffic, scale and isolation',
      pitch: 'Ingress (and Gateway API), autoscaling and NetworkPolicies.',
    },
    jobs: ['devops', 'platform', 'sre', 'security'],
  },
  {
    n: 9,
    tier: 'advanced',
    es: {
      title: 'Empaquetar y desplegar como un equipo',
      pitch: 'Kustomize por entornos, Helm, seguridad del Pod y GitOps.',
    },
    en: {
      title: 'Package and ship as a team',
      pitch: 'Kustomize per environment, Helm, Pod security and GitOps.',
    },
    jobs: ['devops', 'platform', 'backend', 'security'],
  },
]

export function blockOf(n: number): Block | undefined {
  return BLOCKS.find((block) => block.n === n)
}
