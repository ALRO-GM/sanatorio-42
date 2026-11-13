/**
 * Atajos para escribir las redes del curso en pocas líneas. Una dirección se
 * escribe con su máscara, como se verá en el esquema: `10.0.0.2/24` o
 * `10.0.0.2 255.255.255.0`.
 */

import type { Iface, Link, Network, Node, Route } from '../model.js'

function iface(id: string, address: string): Iface {
  const space = address.indexOf(' ')
  const slash = address.indexOf('/')

  if (space >= 0) return { id, ip: address.slice(0, space), mask: address.slice(space + 1) }

  return { id, ip: address.slice(0, slash), mask: address.slice(slash) }
}

const routesOf = (routes: readonly (readonly [string, string])[]): Route[] =>
  routes.map(([dest, via]) => ({ dest, via }))

/** Una máquina con su interfaz `eth0` y, si sale de su red, su puerta de enlace. */
export function host(id: string, x: number, y: number, address: string, gateway?: string): Node {
  return {
    id,
    kind: 'host',
    x,
    y,
    ifaces: [iface('eth0', address)],
    routes: gateway === undefined ? [] : [{ dest: 'default', via: gateway }],
  }
}

/** Un switch: sin IP, solo une cables. */
export function sw(id: string, x: number, y: number): Node {
  return { id, kind: 'switch', x, y, ifaces: [], routes: [] }
}

function forwarder(kind: 'router' | 'internet') {
  return (
    id: string,
    x: number,
    y: number,
    ifaces: Record<string, string>,
    routes: readonly (readonly [string, string])[] = [],
  ): Node => ({
    id,
    kind,
    x,
    y,
    ifaces: Object.entries(ifaces).map(([name, address]) => iface(name, address)),
    routes: routesOf(routes),
  })
}

/** Un router: sus interfaces por nombre y su tabla de rutas (`[destino, siguiente salto]`). */
export const router = forwarder('router')

/** Internet: la primera interfaz es el servicio al que se llega; las demás, sus cables. */
export const internet = forwarder('internet')

/** La red: sus nodos y sus cables (`'ana-sw1'`, `'sw1-r1.lan'`). */
export function net(nodes: Node[], links: string[]): Network {
  return {
    nodes,
    links: links.map((link): Link => {
      const at = link.indexOf('-')

      return [link.slice(0, at), link.slice(at + 1)]
    }),
  }
}
