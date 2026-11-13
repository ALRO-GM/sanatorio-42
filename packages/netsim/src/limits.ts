/**
 * Los topes del simulador de redes: cuánto mide una red, cuántos saltos da un
 * paquete y cuánto puede mandar un intento. Los números dejan de sobra para
 * cualquier reto (el más grande tiene 14 nodos y 20 campos) y hacen que nada
 * de lo que se escriba cuelgue la pestaña o la API.
 */

import type { Network } from './model.js'

export const LIMITS = {
  /** Nodos de una red (máquinas, switches, routers e internet). */
  nodes: 24,
  /** Interfaces de un nodo. */
  ifaces: 6,
  /** Rutas de un nodo. */
  routes: 8,
  /** Cables. */
  links: 48,
  /** Saltos de un paquete antes de darlo por perdido (como el TTL). */
  ttl: 16,
  /** Caracteres de un campo (una IP, una máscara, un destino). */
  value: 40,
  /** Campos por rellenar de una unidad. */
  fields: 32,
  /** Caracteres de una comprobación (todos los campos, en JSON). */
  entry: 2400,
  /** Comprobaciones por intento. */
  attemptEntries: 40,
} as const

export class NetError extends Error {}

/** Comprueba que una red cabe en los topes; si no, no se simula. */
export function withinLimits(network: Network): void {
  if (network.nodes.length > LIMITS.nodes) throw new NetError('demasiados nodos')
  if (network.links.length > LIMITS.links) throw new NetError('demasiados cables')
  for (const node of network.nodes) {
    if (node.ifaces.length > LIMITS.ifaces) throw new NetError(`${node.id}: demasiadas interfaces`)
    if (node.routes.length > LIMITS.routes) throw new NetError(`${node.id}: demasiadas rutas`)
  }
}
