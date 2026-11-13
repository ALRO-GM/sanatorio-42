/**
 * De una unidad a lo jugable: los campos por rellenar, con qué empiezan, la
 * solución (que sale del esquema resuelto o de las cuentas del motor), qué
 * falta en una configuración y la corrección de un intento. La web y la API
 * llaman a lo mismo, así que lo que la web da por bueno la API también.
 *
 * Un intento es la lista de **comprobaciones**: cada vez que se pulsa
 * «Comprobar», todos los campos tal como estaban, en JSON. Las estrellas de
 * una unidad cuentan cuántas hicieron falta hasta acertar.
 */

import { checkGoals, starsFor, starsForTime, timeGoals } from '@sanatorio/course'
import type { StarGoals, Stars, TimeGoals } from '@sanatorio/course'

import { bitsOf, parseIp, parseMask, prefixFor, subnetOf } from '../ip.js'
import type { Subnet } from '../ip.js'
import { LIMITS, NetError } from '../limits.js'
import type { Goal, Network, Trace } from '../model.js'
import { ping } from '../ping.js'
import type { Ask, Question, Scheme, Unit } from './types.js'

/** Qué es un campo: de un esquema (`ip`, `mask`, `dest`, `via`) o lo que pide una cuenta. */
export type FieldKind = 'ip' | 'mask' | 'dest' | 'via' | Ask

export type Field = {
  /** `ana.eth0.ip`, `r1.route0.via`, `q0.network`… */
  id: string
  kind: FieldKind
  /** En un esquema: de qué nodo y de qué interfaz o ruta es. */
  node?: string
  iface?: string
  route?: number
  /** En una cuenta: de qué pregunta. */
  question?: number
}

/** Los valores de los campos, por id. */
export type Values = Record<string, string>

const isScheme = (test: Unit['test']): test is Scheme => 'net' in test

/** El esquema de una unidad, o `null` si es de cuentas. */
export function schemeOf(unit: Unit): Scheme | null {
  return isScheme(unit.test) ? unit.test : null
}

/** Las preguntas de una unidad de cuentas (ninguna si es un esquema). */
export function questionsOf(unit: Unit): Question[] {
  return isScheme(unit.test) ? [] : unit.test.calc
}

const clone = (network: Network): Network => JSON.parse(JSON.stringify(network)) as Network

/** Lee o escribe un valor de una red por su camino (`nodo.interfaz.ip`, `nodo.route0.via`). */
function slot(network: Network, path: string): { read: () => string; write: (v: string) => void } {
  const [nodeId = '', part = '', prop = ''] = path.split('.')
  const node = network.nodes.find((each) => each.id === nodeId)
  const index = /^route(\d)$/.exec(part)?.[1]

  if (index !== undefined && (prop === 'dest' || prop === 'via')) {
    const route = node?.routes[Number(index)]

    if (route !== undefined)
      return {
        read: () => route[prop],
        write: (value) => {
          route[prop] = value
        },
      }
  }
  if (prop === 'ip' || prop === 'mask') {
    const iface = node?.ifaces.find((each) => each.id === part)

    if (iface !== undefined)
      return {
        read: () => iface[prop],
        write: (value) => {
          iface[prop] = value
        },
      }
  }
  throw new NetError(`campo desconocido: ${path}`)
}

function schemeField(id: string): Field {
  const [node = '', part = '', prop = ''] = id.split('.')
  const route = /^route(\d)$/.exec(part)?.[1]

  return {
    id,
    kind: prop as FieldKind,
    node,
    ...(route === undefined ? { iface: part } : { route: Number(route) }),
  }
}

const asksOf = (question: Question): Ask[] => ('need' in question ? ['prefix'] : question.ask)

/** Los campos por rellenar de una unidad, en el orden en que se enseñan. */
export function fieldsOf(unit: Unit): Field[] {
  if (isScheme(unit.test)) return unit.test.fields.map(schemeField)

  return unit.test.calc.flatMap((question, index) =>
    asksOf(question).map((ask) => ({ id: `q${index}.${ask}`, kind: ask, question: index })),
  )
}

/** La subred de una pregunta con dirección (las del curso están bien escritas). */
function subnetIn(ip: string, mask: string): Subnet {
  const address = parseIp(ip)
  const prefix = parseMask(mask)

  if (address === null || prefix === null) throw new NetError(`cuenta mal escrita: ${ip} ${mask}`)

  return subnetOf(address, prefix)
}

/** La respuesta de una cuenta: la calcula el motor, no se escribe a mano. */
function answerOf(question: Question, ask: Ask): string {
  if ('need' in question) return `/${prefixFor(question.need)}`

  const subnet = subnetIn(question.ip, question.mask)

  if (ask === 'prefix') return `/${subnet.prefix}`
  if (ask === 'decimal') return subnet.mask

  return String(subnet[ask])
}

/** Si lo escrito vale por la respuesta: una IP con otra forma de escribirla también; cada notación de máscara, la suya. */
function matches(kind: Ask, given: string, expected: string): boolean {
  const text = given.trim()

  if (kind === 'hosts') return text === expected
  if (kind === 'prefix' || kind === 'decimal')
    return text.includes('.') === (kind === 'decimal') && parseMask(text) === parseMask(expected)

  return text !== '' && parseIp(text) === parseIp(expected)
}

/** Una solución: los valores del esquema resuelto, o las respuestas de las cuentas. */
export function solutionOf(unit: Unit): Values {
  const test = unit.test

  if (isScheme(test))
    return Object.fromEntries(test.fields.map((id) => [id, slot(test.net, id).read()]))

  return Object.fromEntries(
    test.calc.flatMap((question, index) =>
      asksOf(question).map((ask) => [`q${index}.${ask}`, answerOf(question, ask)]),
    ),
  )
}

/** Con qué empieza cada campo: vacío, o el valor roto que hay que arreglar. */
export function startOf(unit: Unit): Values {
  const start = isScheme(unit.test) ? (unit.test.start ?? {}) : {}

  return Object.fromEntries(fieldsOf(unit).map((field) => [field.id, start[field.id] ?? '']))
}

/** Lo escrito en un campo, recortado al tope. Solo cuentan las claves propias. */
const valueOf = (values: Values, id: string): string => {
  const value: unknown = Object.hasOwn(values, id) ? values[id] : ''

  return typeof value === 'string' ? value.trim().slice(0, LIMITS.value) : ''
}

/** La red del esquema con esos valores en sus campos (lo demás no se puede tocar). */
export function wire(scheme: Scheme, values: Values): Network {
  const network = clone(scheme.net)

  for (const id of scheme.fields) slot(network, id).write(valueOf(values, id))

  return network
}

export const goalKey = (goal: Goal): string => `goal:${goal.from}>${goal.to}`

export type Evaluation = {
  done: boolean
  /** Lo que falta: `goal:ana>db` en un esquema; el id del campo en una cuenta. */
  misses: string[]
  /** El ping de cada objetivo del esquema, en orden (vacío en una cuenta). */
  traces: Trace[]
}

/** Mira una configuración: qué objetivos se cumplen y, en un esquema, la traza de cada ping. */
export function evaluate(unit: Unit, values: Values): Evaluation {
  const test = unit.test

  if (isScheme(test)) {
    const network = wire(test, values)
    const traces = test.goals.map((goal) => ping(network, goal))
    const misses = test.goals.filter((_, index) => traces[index]?.ok !== true).map(goalKey)

    return { done: misses.length === 0, misses, traces }
  }

  const solution = solutionOf(unit)
  const misses = fieldsOf(unit)
    .filter(
      (field) => !matches(field.kind as Ask, valueOf(values, field.id), solution[field.id] ?? ''),
    )
    .map((field) => field.id)

  return { done: misses.length === 0, misses, traces: [] }
}

const goals = new Map<string, string[]>()

/**
 * Lo que hay que conseguir, por clave. Sale de **ejecutar la solución**: si la
 * red resuelta de la unidad no cumple sus objetivos, o la de partida ya los
 * cumple, la unidad está mal escrita y se dice.
 */
export function goalOf(unit: Unit): string[] {
  const known = goals.get(unit.id)

  if (known !== undefined) return known
  if (fieldsOf(unit).length === 0 || fieldsOf(unit).length > LIMITS.fields)
    throw new NetError(`${unit.id}: tiene que tener de 1 a ${LIMITS.fields} campos`)

  const solved = evaluate(unit, solutionOf(unit))

  if (!solved.done)
    throw new NetError(`${unit.id}: la solución no cumple ${solved.misses.join(', ')}`)
  if (evaluate(unit, startOf(unit)).done) throw new NetError(`${unit.id}: empieza resuelta`)

  const keys = isScheme(unit.test) ? unit.test.goals.map(goalKey) : Object.keys(solutionOf(unit))

  goals.set(unit.id, keys)

  return keys
}

/** Una comprobación, como viaja a la API. */
export function encodeEntry(values: Values): string {
  return JSON.stringify(values)
}

/** Lee una comprobación; lo que no sea un objeto de textos cuenta como todo vacío (falla). */
function decodeEntry(text: string): Values {
  try {
    const parsed: unknown = JSON.parse(text)

    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Values)
      : {}
  } catch {
    return {}
  }
}

/** Las estrellas de una unidad: por comprobaciones (`checkGoals` de la plantilla). */
export function starGoals(): StarGoals {
  return checkGoals()
}

export function timeGoalsOf(unit: Unit): TimeGoals | null {
  return unit.limit === undefined ? null : timeGoals(unit.limit)
}

export type Attempt = { done: boolean; misses: string[]; stars: Stars | 0; commands: number }

/**
 * Corrige un intento: vuelve a mirar cada comprobación, en orden, hasta la
 * primera que acierta. `commands` son las comprobaciones que hicieron falta.
 */
export function checkAttempt(unit: Unit, entries: readonly string[], seconds?: number): Attempt {
  let misses = goalOf(unit)
  let used = 0

  for (const entry of entries.slice(0, LIMITS.attemptEntries)) {
    used += 1
    misses = entry.length > LIMITS.entry ? misses : evaluate(unit, decodeEntry(entry)).misses
    if (misses.length === 0) break
  }

  const done = misses.length === 0
  const limits = timeGoalsOf(unit)
  let stars: Stars | 0 = 0

  if (done)
    stars = limits === null ? starsFor(used, starGoals()) : starsForTime(seconds ?? 0, limits)

  return {
    done: done && stars > 0,
    misses: done && stars === 0 ? ['time'] : misses,
    stars,
    commands: used,
  }
}

export type ExampleRun =
  | {
      kind: 'net'
      network: Network
      trace: Trace
      /** La misma red con el error típico, qué valores cambian y cómo muere el paquete. */
      broken: { network: Network; trace: Trace; changed: string[] } | null
    }
  | { kind: 'calc'; ip: string; subnet: Subnet; bits: string }

/** El ejemplo de una unidad, ejecutado por el motor: el ping con su traza real, o la cuenta hecha. */
export function exampleOf(unit: Unit): ExampleRun | null {
  const example = unit.example

  if (example === undefined) return null
  if (!('net' in example))
    return {
      kind: 'calc',
      ip: example.ip,
      subnet: subnetIn(example.ip, example.mask),
      bits: bitsOf(parseIp(example.ip) ?? 0),
    }

  const broken = example.broken === undefined ? null : clone(example.net)

  for (const [path, value] of Object.entries(example.broken ?? {}))
    if (broken !== null) slot(broken, path).write(value)

  return {
    kind: 'net',
    network: example.net,
    trace: ping(example.net, example.goal),
    broken:
      broken === null
        ? null
        : {
            network: broken,
            trace: ping(broken, example.goal),
            changed: Object.keys(example.broken ?? {}),
          },
  }
}
