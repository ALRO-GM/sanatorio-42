/**
 * El `ping` del simulador: sigue el paquete salto a salto en la ida y en la
 * vuelta y, si no llega, dice **dónde y por qué muere**. Ese porqué es lo que
 * enseña el curso, así que cada muerte lleva su código y sus datos (la IP, la
 * interfaz, el otro nodo) para poder explicarla.
 *
 * Cómo decide cada nodo, igual que una máquina de verdad:
 * 1. Si el destino es una de sus IP, el paquete ha llegado.
 * 2. Si el destino cae en la subred de una de sus interfaces (según **su**
 *    máscara), lo entrega por ese cable a quien tenga esa IP.
 * 3. Si no, busca en su tabla la ruta más concreta (el prefijo más largo) y
 *    se lo pasa al siguiente salto, que tiene que ser vecino suyo.
 * 4. Sin ruta, lo tira.
 */

import {
  broadcastOf,
  contains,
  formatIp,
  isPrivate,
  networkOf,
  parseDest,
  parseIp,
  parseMask,
  reservedKind,
} from './ip.js'
import { LIMITS, NetError, withinLimits } from './limits.js'
import type { Death, Goal, Hop, Iface, Leg, Network, Node, Route, Trace } from './model.js'

/** Una interfaz bien configurada, ya leída. */
type Port = { node: Node; iface: Iface; ip: number; prefix: number }

/** Lo que hay al otro lado de un cable (pasando por switches): la interfaz y el camino hasta ella. */
type Neighbour = { port: Port; path: string[] }

type Sim = {
  nodes: Map<string, Node>
  /** Las interfaces válidas de cada nodo. */
  ports: Map<string, Port[]>
  /** El primer problema de configuración de cada nodo que lo tenga. */
  problems: Map<string, Death>
  wires: Map<string, string[]>
}

/** El primer problema de una interfaz, o cómo queda leída si está bien. */
function readIface(node: Node, iface: Iface): Death | Port {
  const at = { at: node.id, iface: iface.id }

  if (iface.ip.trim() === '' || iface.mask.trim() === '') return { ...at, code: 'empty' }

  const ip = parseIp(iface.ip)

  if (ip === null) return { ...at, code: 'bad_ip', ip: iface.ip }

  const prefix = parseMask(iface.mask)

  if (prefix === null || prefix === 0) return { ...at, code: 'bad_mask', ip: iface.mask }

  const kind = reservedKind(ip)

  if (kind !== null) return { ...at, code: 'reserved', ip: iface.ip, kind }
  // En /31 y /32 no hay dirección de red ni de broadcast.
  if (prefix < 31 && ip === networkOf(ip, prefix))
    return { ...at, code: 'network_address', ip: iface.ip }
  if (prefix < 31 && ip === broadcastOf(ip, prefix))
    return { ...at, code: 'broadcast_address', ip: iface.ip }

  return { node, iface, ip, prefix }
}

const isDeath = (value: Death | Port): value is Death => 'code' in value

/** Una ruta a medio rellenar es como si no estuviera (el paquete morirá sin ruta); mal escrita es un problema. */
const blank = (route: Route): boolean => route.dest.trim() === '' || route.via.trim() === ''

function readNode(node: Node): { ports: Port[]; problem: Death | null } {
  const read = node.ifaces.map((iface) => readIface(node, iface))
  const ports = read.filter((each): each is Port => !isDeath(each))
  let problem: Death | null = read.find(isDeath) ?? null

  for (const route of node.routes) {
    if (problem !== null || blank(route)) continue
    if (parseDest(route.dest) === null || parseIp(route.via) === null)
      problem = { at: node.id, code: 'bad_route', ip: route.dest, via: route.via }
  }
  for (const [index, a] of ports.entries())
    for (const b of ports.slice(index + 1))
      if (problem === null && contains(a.ip, Math.min(a.prefix, b.prefix), b.ip))
        problem = { at: node.id, code: 'overlap', iface: a.iface.id, other: b.iface.id }

  return { ports, problem }
}

/** El extremo de un cable: `nodo` vale por un switch o por la primera interfaz del nodo. */
function endOf(nodes: Map<string, Node>, text: string): string {
  if (text.includes('.')) return text

  const node = nodes.get(text)

  if (node === undefined) throw new NetError(`cable a un nodo que no existe: ${text}`)

  return node.kind === 'switch' ? node.id : `${node.id}.${node.ifaces[0]?.id ?? ''}`
}

function prepare(network: Network): Sim {
  withinLimits(network)

  const nodes = new Map(network.nodes.map((node) => [node.id, node]))
  const ports = new Map<string, Port[]>()
  const problems = new Map<string, Death>()
  const wires = new Map<string, string[]>()
  const owners = new Map<number, Port>()

  for (const node of network.nodes) {
    const read = readNode(node)

    ports.set(node.id, read.ports)
    if (read.problem !== null) problems.set(node.id, read.problem)
  }
  // Una IP repetida estropea a los dos que la tienen.
  for (const port of [...ports.values()].flat()) {
    const other = owners.get(port.ip)

    if (other === undefined) {
      owners.set(port.ip, port)
      continue
    }
    for (const [mine, theirs] of [
      [port, other],
      [other, port],
    ] as const)
      if (!problems.has(mine.node.id))
        problems.set(mine.node.id, {
          at: mine.node.id,
          code: 'duplicate',
          iface: mine.iface.id,
          ip: mine.iface.ip,
          other: theirs.node.id,
        })
  }
  for (const [a, b] of network.links) {
    const ends = [endOf(nodes, a), endOf(nodes, b)] as const

    wires.set(ends[0], [...(wires.get(ends[0]) ?? []), ends[1]])
    wires.set(ends[1], [...(wires.get(ends[1]) ?? []), ends[0]])
  }

  return { nodes, ports, problems, wires }
}

/** Las interfaces que comparten cable con una (a través de los switches que haya). */
function neighbours(sim: Sim, from: Port): Neighbour[] {
  const start = `${from.node.id}.${from.iface.id}`
  const seen = new Set([start])
  const queue: { end: string; path: string[] }[] = [{ end: start, path: [from.node.id] }]
  const found: Neighbour[] = []

  // La cola crece mientras se recorre: el `for…of` de un array también ve lo que se le añade.
  for (const { end, path } of queue) {
    // Solo el punto de partida y los switches pasan la señal a sus otros cables.
    if (end !== start && end.includes('.')) continue
    for (const next of sim.wires.get(end) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)

      const id = next.split('.')[0] ?? next
      const port = (sim.ports.get(id) ?? []).find((each) => `${id}.${each.iface.id}` === next)

      queue.push({ end: next, path: [...path, id] })
      if (port !== undefined) found.push({ port, path: [...path, id] })
    }
  }

  return found
}

/** Dónde está de verdad una IP (en cualquier cable de la red). */
function ownerOf(sim: Sim, ip: number): Port | undefined {
  return [...sim.ports.values()].flat().find((port) => port.ip === ip)
}

type Choice = { port: Port; prefix: number; route: Route | null; via: number }

/** Por dónde sale el paquete: lo vecino y las rutas, y gana el prefijo más largo. */
function choose(sim: Sim, node: Node, dest: number): Choice | Death {
  const ports = sim.ports.get(node.id) ?? []
  let best: { prefix: number; route: Route | null; port: Port | null; via: number } | null = null

  for (const port of ports)
    if (contains(port.ip, port.prefix, dest) && (best === null || port.prefix > best.prefix))
      best = { prefix: port.prefix, route: null, port, via: dest }
  for (const route of node.routes) {
    const to = blank(route) ? null : parseDest(route.dest)
    const via = parseIp(route.via)

    if (to === null || via === null || !contains(to.network, to.prefix, dest)) continue
    // A igual prefijo gana lo vecino (y, entre rutas, la primera).
    if (best === null || to.prefix > best.prefix)
      best = { prefix: to.prefix, route, port: null, via }
  }
  if (best === null) return { at: node.id, code: 'no_route', ip: formatIp(dest) }
  if (best.port !== null) return { ...best, port: best.port }

  const out = ports.find((port) => contains(port.ip, port.prefix, best.via))

  if (out === undefined)
    return { at: node.id, code: 'gateway_outside', via: formatIp(best.via), ip: formatIp(dest) }

  return { ...best, port: out }
}

/** Un trayecto: desde `start` hasta quien tenga `dest`, o hasta donde muera. */
function travel(
  sim: Sim,
  start: Node,
  from: number | null,
  dest: number,
): { leg: Leg; source: number | null } {
  const hops: Hop[] = []
  let node = start
  let source = from
  const dead = (death: Death) => ({ leg: { hops, death }, source })

  for (let ttl = 0; ttl <= LIMITS.ttl; ttl += 1) {
    const problem = sim.problems.get(node.id)

    if (problem !== undefined) return dead(problem)
    if (node.kind === 'internet') {
      const secret = [dest, source].find((ip) => ip !== null && isPrivate(ip))

      if (secret !== undefined && secret !== null)
        return dead({ at: node.id, code: 'private_internet', ip: formatIp(secret) })
    }
    if ((sim.ports.get(node.id) ?? []).some((port) => port.ip === dest))
      return { leg: { hops, death: null }, source }
    if (node.kind === 'host' && node !== start)
      return dead({ at: node.id, code: 'not_router', ip: formatIp(dest) })

    const choice = choose(sim, node, dest)

    if ('code' in choice) return dead(choice)

    const next = neighbours(sim, choice.port).find((each) => each.port.ip === choice.via)

    if (next === undefined) {
      const at = { at: node.id, iface: choice.port.iface.id }

      if (choice.route !== null)
        return dead({ ...at, code: 'gateway_absent', via: formatIp(choice.via) })

      const elsewhere = ownerOf(sim, dest)

      return dead(
        elsewhere === undefined
          ? { ...at, code: 'nobody', ip: formatIp(dest) }
          : { ...at, code: 'wrong_segment', ip: formatIp(dest), other: elsewhere.node.id },
      )
    }
    source ??= choice.port.ip
    hops.push({
      from: node.id,
      to: next.port.node.id,
      path: next.path,
      rule: choice.route === null ? 'direct' : choice.prefix === 0 ? 'default' : 'route',
      out: choice.port.iface.id,
      ...(choice.route === null ? {} : { route: choice.route }),
    })
    node = next.port.node
  }

  return dead({ at: node.id, code: 'loop', ip: formatIp(dest) })
}

function nodeOf(sim: Sim, id: string): Node {
  const node = sim.nodes.get(id)

  if (node === undefined || node.kind === 'switch') throw new NetError(`no hay máquina «${id}»`)

  return node
}

/**
 * Manda un paquete de `from` a `to` (a su primera interfaz) y espera la
 * respuesta. Si algo está mal configurado en el origen o en el destino, muere
 * ahí mismo, antes de salir.
 */
export function ping(network: Network, goal: Goal): Trace {
  const sim = prepare(network)
  const from = nodeOf(sim, goal.from)
  const to = nodeOf(sim, goal.to)
  const base = { from: from.id, to: to.id, target: null, source: null, back: null }
  const broken = sim.problems.get(from.id) ?? sim.problems.get(to.id)

  if (broken !== undefined) return { ...base, ok: false, out: { hops: [], death: broken } }

  const target = (sim.ports.get(to.id) ?? []).find((port) => port.iface.id === to.ifaces[0]?.id)

  if (target === undefined) throw new NetError(`«${to.id}» no tiene interfaces`)

  const out = travel(sim, from, null, target.ip)
  const sent = {
    ...base,
    target: formatIp(target.ip),
    source: out.source === null ? null : formatIp(out.source),
  }

  if (out.leg.death !== null) return { ...sent, ok: false, out: out.leg }

  // Sin saltos (el destino es la propia máquina), la respuesta tampoco viaja.
  const back = travel(sim, to, target.ip, out.source ?? target.ip)

  return { ...sent, ok: back.leg.death === null, out: out.leg, back: back.leg }
}
