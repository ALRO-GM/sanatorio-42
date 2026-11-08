/**
 * De una unidad a lo jugable: el mundo de partida, el objetivo (lo que deja
 * la solución), el recuento de un intento y su corrección. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también.
 *
 * Antes de comparar se dejan pasar diez minutos de reloj en una copia del
 * mundo: así da igual si acabaste antes o después de que terminara un
 * rolling update, y lo que se cae (un CrashLoopBackOff, un OOMKilled) se ve.
 */

import { commandGoals, starsFor, starsForTime, timeGoals } from '@sanatorio/course'
import type { StarGoals, Stars, TimeGoals } from '@sanatorio/course'
import { cloneWorld, commandsIn } from '@sanatorio/shellsim'
import type { World } from '@sanatorio/shellsim'

import { wait } from '../controllers.js'
import { shortRef } from '../images.js'
import { jsonpath } from '../jsonpath.js'
import { mustKind } from '../kinds.js'
import { own } from '../limits.js'
import type { K8sObject } from '../model.js'
import { clockOf, k8sOf, SECONDS_PER_ENTRY } from '../model.js'
import { hostHttp, httpFrom } from '../net.js'
import { execIn } from '../podsh.js'
import { runtimeOf } from '../runtime.js'
import { publicJson } from '../show.js'
import { arr, num, obj, podSpecOf, str } from '../spec.js'
import type { Env } from '../store.js'
import { envOfWorld, getObject, list, ownedBy } from '../store.js'
import { run } from '../terminal.js'
import { baseWorld, place } from '../world.js'
import type { Check, Unit } from './types.js'

class UnitError extends Error {}

const H = '/home/peer'
const home = (path: string): string => (path.startsWith('~/') ? `${H}${path.slice(1)}` : path)

const starts = new Map<string, string>()

/** El mundo con el que empieza la unidad. */
export function startOf(unit: Unit): World {
  const cached = starts.get(unit.id)

  if (cached !== undefined) return JSON.parse(cached) as World

  let world = baseWorld()
  const host = world.machines.dev1

  if (host === undefined) throw new UnitError('el mundo no tiene dev1')
  for (const [path, file] of Object.entries(unit.setup?.files ?? {})) place(host, home(path), file)
  for (const line of unit.setup?.run ?? []) {
    const result = run(world, line)

    if (!result.ok)
      throw new UnitError(`${unit.id} (preparación): ${line}: ${result.output.join(' / ')}`)
    world = result.world
  }

  // El reloj de la terminal vuelve a cero, pero el del clúster sigue donde iba.
  const state = k8sOf(world)

  state.waited = clockOf(world, state)
  world.clock = 0
  world.session = {
    ...world.session,
    cwd: home(unit.setup?.cwd ?? '~/').replace(/\/$/, '') || '/',
    history: [],
  }
  starts.set(unit.id, JSON.stringify(world))

  return world
}

/** Para comparar respuestas: los espacios y saltos de línea, de uno en uno. */
const loose = (text: string): string => text.trim().split(/\s+/).join(' ')

export type Tally = {
  world: World
  lines: { ok: boolean; counted: number; stdout: string; incomplete: boolean }[]
  commands: number
}

/** Vuelve a ejecutar las órdenes desde el principio de la unidad, como la terminal. */
export function tally(unit: Unit, entries: readonly string[], from = startOf(unit)): Tally {
  let world = from
  const lines: Tally['lines'] = []
  let commands = 0

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    commands += result.counted
    lines.push({
      ok: result.ok,
      counted: result.counted,
      stdout: result.stdout,
      incomplete: result.incomplete === true,
    })
  }

  return { world, lines, commands }
}

function solvedOf(unit: Unit): Tally {
  const result = tally(unit, unit.solution)
  const bad = result.lines.findIndex((line) => !line.ok)

  if (bad >= 0) throw new UnitError(`${unit.id} (solución): ${unit.solution[bad] ?? ''}`)

  return result
}

type Goal = Record<string, string>

/** `tienda deploy/api resto` → namespace, tipo, nombre y lo que sigue. */
function target(spec: string): { ns: string; kind: string; name: string; rest: string } {
  const parts = spec.split(' ')
  const hasNs = !(parts[0] ?? '').includes('/')
  const ns = hasNs ? (parts[0] ?? '') : ''
  const ref = (hasNs ? parts[1] : parts[0]) ?? ''
  const [type = '', name = ''] = ref.split('/')

  return { ns, kind: mustKind(type).kind, name, rest: parts.slice(hasNs ? 2 : 1).join(' ') }
}

const objectOf = (env: Env, spec: string): K8sObject | undefined => {
  const t = target(spec)

  return getObject(env.cluster, t.kind, t.ns, t.name)
}

/** Las imágenes, escritas de la forma corta (`docker.io/library/nginx:1.27` es `nginx:1.27`). */
const imagesOf = (object: K8sObject): string =>
  podSpecOf(object.kind === 'Pod' ? object.spec : obj(object.spec?.template).spec)
    .containers.map((c) => shortRef(c.image))
    .join(',')

/** Cómo está una carga: listos/deseados, imágenes y si el rollout acabó. */
function readiness(env: Env, object: K8sObject): string {
  const spec = obj(object.spec)
  const status = obj(object.status)

  switch (object.kind) {
    case 'Deployment':
      return `${num(status.readyReplicas)}/${num(spec.replicas, 1)} ${imagesOf(object)} updated=${num(status.updatedReplicas)} total=${num(status.replicas)}`
    case 'StatefulSet':
      return `${num(status.readyReplicas)}/${num(spec.replicas, 1)} ${imagesOf(object)}`
    case 'Job':
      return `${num(status.succeeded)} ${arr(status.conditions)
        .map((c) => str(obj(c).type))
        .join(',')}`
    case 'Pod': {
      const rt = runtimeOf(env, object)

      return `${rt.phase} ${rt.ready ? 'ready' : 'not-ready'} ${imagesOf(object)}`
    }
    default:
      return 'ok'
  }
}

/** El primer Pod listo de `deploy/x`, `sts/x` o `pod/x`. */
function podOf(env: Env, ns: string, kind: string, name: string): K8sObject | undefined {
  if (kind === 'Pod') return getObject(env.cluster, 'Pod', ns, name)

  const owner = getObject(env.cluster, kind, ns, name)

  if (owner === undefined) return undefined

  const sets = list(env.cluster, 'ReplicaSet', ns).filter((rs) => ownedBy(rs, owner))

  return list(env.cluster, 'Pod', ns).find(
    (pod) =>
      (ownedBy(pod, owner) || sets.some((rs) => ownedBy(pod, rs))) && runtimeOf(env, pod).ready,
  )
}

/** Deja pasar diez minutos en una copia (lo que tarda en asentarse todo). */
function settled(world: World): World {
  const copy = cloneWorld(world)

  copy.clock += 1
  wait(copy, 600 - SECONDS_PER_ENTRY)

  return copy
}

/** Cómo está el mundo en lo que mira la unidad (una clave por cosa). Mira una copia: no cambia nada. */
function snapshot(original: World, check: Check): Goal {
  const world = settled(original)
  const env = envOfWorld(world)
  const out: Goal = {}

  for (const spec of check.get ?? []) {
    const object = objectOf(env, spec)

    try {
      out[`get:${spec}`] =
        object === undefined ? '∅' : jsonpath(target(spec).rest, publicJson(object))
    } catch {
      out[`get:${spec}`] = 'error'
    }
  }
  for (const spec of check.ready ?? []) {
    const object = objectOf(env, spec)

    out[`ready:${spec}`] = object === undefined ? '∅' : readiness(env, object)
  }
  for (const spec of check.gone ?? [])
    out[`gone:${spec}`] = objectOf(env, spec) === undefined ? 'gone' : 'there'
  for (const spec of check.exists ?? [])
    out[`exists:${spec}`] = objectOf(env, spec) === undefined ? '∅' : 'ok'
  for (const url of check.http ?? []) {
    const parsed = /^([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url)
    const reply = hostHttp(
      world,
      parsed?.[1] ?? 'localhost',
      Number(parsed?.[2] ?? 80),
      parsed?.[3] ?? '/',
      {},
    )

    out[`http:${url}`] = reply === null ? '∅' : `${reply.status} ${loose(reply.body)}`
  }
  for (const spec of check.reach ?? []) {
    const [ns = '', url = ''] = spec.split(' ')
    const probe: K8sObject = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: 'comprobacion', namespace: ns, labels: { run: 'comprobacion' } },
    }
    const answer = httpFrom({ ...env, ns }, probe, url)

    out[`reach:${spec}`] =
      'error' in answer ? `(${answer.code})` : `${answer.reply.status} ${loose(answer.reply.body)}`
  }
  for (const spec of check.exec ?? []) {
    const t = target(spec)
    const pod = podOf(env, t.ns, t.kind, t.name)
    const container = pod === undefined ? undefined : podSpecOf(pod.spec).containers[0]

    out[`exec:${spec}`] =
      pod === undefined || container === undefined
        ? '∅'
        : (() => {
            const result = execIn(env, pod, container, ['sh', '-c', t.rest])

            return `${result.code} ${loose(result.out)}`
          })()
  }
  if (check.context === true) {
    const state = k8sOf(world)

    out.context = `${state.current} ${own(state.contexts, state.current)?.namespace ?? ''}`
  }
  for (const path of check.files ?? []) {
    const node = own(world.machines.dev1?.fs ?? {}, home(path))

    out[`file:${path}`] = node === undefined ? '∅' : node.kind === 'file' ? node.text : node.kind
  }
  for (const [name, entries] of Object.entries(check.probes ?? {})) {
    let current = cloneWorld(world)
    const outputs: string[] = []

    for (const entry of entries) {
      const result = run(current, entry)

      current = result.world
      outputs.push(`${loose(result.output.join('\n'))} [${result.code}]`)
    }
    out[`probe:${name}`] = outputs.join('\n')
  }

  return out
}

const goals = new Map<string, { goal: Goal; output: string | null; par: number }>()

/** Lo que hay que conseguir (y la salida esperada, si la unidad pide una). */
export function goalOf(unit: Unit): { goal: Goal; output: string | null; par: number } {
  const known = goals.get(unit.id)

  if (known !== undefined) return known

  const solved = solvedOf(unit)
  const result = {
    goal: snapshot(solved.world, unit.check),
    output: unit.check.output === true ? loose(solved.lines.at(-1)?.stdout ?? '') : null,
    par: solved.commands,
  }

  goals.set(unit.id, result)

  return result
}

/** Las órdenes y subórdenes de kubectl, helm y kustomize usadas en una entrada (para `requires`). */
function usedIn(entry: string): string[] {
  const subs = [
    ...entry.matchAll(
      /\b(?:kubectl|helm|kustomize)\s+(?:(?:-n\s+\S+|--namespace[= ]\S+|-A)\s+)*([a-z-]+)/g,
    ),
  ].map((match) => match[1] ?? '')

  return [...commandsIn(entry), ...subs]
}

/** Qué falta: las claves que no coinciden, `output` y `requires`. */
export function missing(unit: Unit, tallied: Tally, entries: readonly string[]): string[] {
  const { goal, output } = goalOf(unit)
  const now = snapshot(tallied.world, unit.check)
  const misses = Object.keys(goal).filter((key) => now[key] !== goal[key])

  if (output !== null && !tallied.lines.some((line) => line.ok && loose(line.stdout) === output))
    misses.push('output')

  const used = new Set(
    entries.flatMap((entry, index) => (tallied.lines[index]?.ok === true ? usedIn(entry) : [])),
  )

  for (const group of unit.requires ?? [])
    if (!group.some((name) => used.has(name))) misses.push(`requires:${group.join('|')}`)

  return misses
}

export function starGoals(unit: Unit): StarGoals {
  return commandGoals(goalOf(unit).par)
}

export function timeGoalsOf(unit: Unit): TimeGoals | null {
  return unit.limit === undefined ? null : timeGoals(unit.limit)
}

export type Attempt = { done: boolean; misses: string[]; stars: Stars | 0; commands: number }

/** Corrige un intento: vuelve a ejecutar las órdenes y mira si el mundo llegó al objetivo. */
export function checkAttempt(unit: Unit, entries: readonly string[], seconds?: number): Attempt {
  const tallied = tally(unit, entries)
  const misses = missing(unit, tallied, entries)
  const done = misses.length === 0
  const limits = timeGoalsOf(unit)
  let stars: Stars | 0 = 0

  if (done)
    stars =
      limits === null
        ? starsFor(tallied.commands, starGoals(unit))
        : starsForTime(seconds ?? 0, limits)

  return {
    done: done && stars > 0,
    misses: done && stars === 0 ? ['time'] : misses,
    stars,
    commands: tallied.commands,
  }
}

/** El ejemplo: cada orden con lo que contesta, sobre el mundo de partida. */
export function exampleOf(unit: Unit): { line: string; output: string[] }[] {
  let world = startOf(unit)

  return (unit.example ?? []).map((line) => {
    const result = run(world, line)

    world = result.world

    return { line, output: result.output }
  })
}
