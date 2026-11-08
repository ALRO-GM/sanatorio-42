/**
 * Los manifiestos: leer un YAML de varios documentos (`---`) con el lector
 * del curso de Docker (`parseYaml` de `@sanatorio/dockersim`) y escribirlo
 * como lo hace `kubectl get -o yaml`. Ese lector lo deja todo como texto; aquí
 * se vuelven números o booleanos los campos que en Kubernetes lo son (por su
 * nombre: `replicas`, `containerPort`, `runAsNonRoot`…), así que `replicas: 3`
 * y `replicas: "3"` se guardan igual y el valor de una variable de entorno
 * sigue siendo texto.
 */

import { parseYaml, YamlError } from '@sanatorio/dockersim'
import type { Yaml } from '@sanatorio/dockersim'
import { ShellError } from '@sanatorio/shellsim'

import { LIMITS } from './limits.js'
import type { Json, JsonObject } from './model.js'

/** Campos enteros (o entero-o-texto, como `targetPort: http`). */
const INTS = new Set([
  'replicas',
  'port',
  'targetPort',
  'containerPort',
  'nodePort',
  'hostPort',
  'initialDelaySeconds',
  'periodSeconds',
  'failureThreshold',
  'successThreshold',
  'timeoutSeconds',
  'minReplicas',
  'maxReplicas',
  'averageUtilization',
  'targetCPUUtilizationPercentage',
  'completions',
  'parallelism',
  'backoffLimit',
  'runAsUser',
  'runAsGroup',
  'fsGroup',
  'revisionHistoryLimit',
  'progressDeadlineSeconds',
  'terminationGracePeriodSeconds',
  'number',
  'activeDeadlineSeconds',
  'ttlSecondsAfterFinished',
  'successfulJobsHistoryLimit',
  'failedJobsHistoryLimit',
  'maxSurge',
  'maxUnavailable',
  'defaultMode',
  'count',
  'minReadySeconds',
  'startingDeadlineSeconds',
])

const BOOLS = new Set([
  'runAsNonRoot',
  'readOnlyRootFilesystem',
  'allowPrivilegeEscalation',
  'privileged',
  'readOnly',
  'automountServiceAccountToken',
  'stdin',
  'tty',
  'paused',
  'suspend',
  'optional',
  'immutable',
])

/** Los mapas cuyas claves son de quien escribe (no se tocan sus valores: son texto). */
const FREE = new Set(['labels', 'annotations', 'matchLabels', 'data', 'stringData', 'nodeSelector'])

function typed(value: Yaml, key: string, free: boolean): Json {
  if (value === null) return null
  if (typeof value === 'string') {
    if (free) return value
    if (INTS.has(key) && /^-?\d+$/.test(value)) return Number(value)
    if (BOOLS.has(key) && /^(true|false)$/.test(value)) return value === 'true'

    return value
  }
  if (Array.isArray(value)) return value.map((item) => typed(item, key, false))

  const out: JsonObject = {}

  for (const [inner, item] of Object.entries(value)) out[inner] = typed(item, inner, FREE.has(key))

  return out
}

/** Lee un YAML de uno o varios documentos; los vacíos no cuentan. */
export function parseDocs(source: string, file: string): JsonObject[] {
  const docs = source.split(/^---[ \t]*(?:#.*)?$/m)

  if (docs.length > LIMITS.documents)
    throw new ShellError(
      `error: ${file}: demasiados documentos (como mucho ${LIMITS.documents} en este simulador)`,
    )

  const out: JsonObject[] = []

  for (const doc of docs) {
    let value: Yaml

    try {
      value = parseYaml(doc)
    } catch (error) {
      if (error instanceof YamlError)
        throw new ShellError(
          `error: error parsing ${file}: error converting YAML to JSON: yaml: ${error.message}`,
        )
      throw error
    }
    if (value === null) continue
    if (typeof value !== 'object' || Array.isArray(value))
      throw new ShellError(
        `error: error parsing ${file}: error unmarshaling JSON: json: cannot unmarshal into Go value of type map[string]interface {}`,
      )

    const doc2 = typed(value, '', false)

    if (doc2 !== null && typeof doc2 === 'object' && !Array.isArray(doc2)) {
      // Una `List` (lo que escribe `kubectl get -o yaml` de varios objetos) se abre.
      const items = doc2.items

      if (doc2.kind === 'List' && Array.isArray(items))
        for (const item of items) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) out.push(item)
        }
      else out.push(doc2)
    }
  }

  return out
}

/** ¿Hace falta poner comillas para que se lea igual? */
function needsQuotes(text: string): boolean {
  return (
    text === '' ||
    /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(text) ||
    /: |\s#|\s$/.test(text) ||
    /^(true|false|yes|no|null|~|-?\d[\d._:eE+-]*)$/i.test(text)
  )
}

function scalar(value: string | number | boolean | null): string {
  if (value === null) return 'null'
  if (typeof value !== 'string') return String(value)
  if (value.includes('\n')) return JSON.stringify(value)

  return needsQuotes(value) ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : value
}

const isEmpty = (value: Json): boolean =>
  value !== null &&
  typeof value === 'object' &&
  (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0)

/** Escribe un valor como YAML en bloque, con las listas a la altura de su clave (como kubectl). */
export function toYaml(value: Json, indent = 0): string {
  const pad = ' '.repeat(indent)

  if (value === null || typeof value !== 'object') return `${scalar(value)}\n`
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]\n'

    return value
      .map((item) => {
        if (item !== null && typeof item === 'object' && !isEmpty(item)) {
          const body = toYaml(item, indent + 2)

          return `${pad}- ${body.slice(indent + 2)}`
        }

        return `${pad}- ${toYaml(item, indent + 2)}`
      })
      .join('')
  }

  const entries = Object.entries(value)

  if (entries.length === 0) return '{}\n'

  return entries
    .map(([key, item]) => {
      if (item !== null && typeof item === 'object' && !isEmpty(item))
        return `${pad}${scalar(key)}:\n${toYaml(item, Array.isArray(item) ? indent : indent + 2)}`

      return `${pad}${scalar(key)}: ${toYaml(item, indent + 2)}`
    })
    .join('')
}

/** Como `JSON.stringify` con cuatro espacios (lo que escribe `kubectl -o json`). */
export const toJsonText = (value: Json): string => `${JSON.stringify(value, null, 4)}\n`
