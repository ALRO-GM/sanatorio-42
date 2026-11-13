/**
 * El modelo de una red del curso: máquinas con interfaces (IP y máscara),
 * switches que unen cables, routers con tabla de rutas e «internet». Todo son
 * datos planos (JSON): lo mismo en la web y en la API.
 */

/** Una interfaz: su dirección y su máscara, tal como están escritas (pueden estar mal o vacías). */
export type Iface = { id: string; ip: string; mask: string }

/** Una ruta: adónde (`default` o `red/prefijo`) y por quién (la IP del siguiente salto). */
export type Route = { dest: string; via: string }

/**
 * `host`: una máquina con una interfaz; no reenvía paquetes de otros.
 * `router`: varias interfaces, reenvía según su tabla de rutas.
 * `switch`: une cables; no tiene IP ni decide nada.
 * `internet`: reenvía como un router, pero tira lo que lleve direcciones privadas.
 */
export type NodeKind = 'host' | 'router' | 'switch' | 'internet'

export type Node = {
  id: string
  kind: NodeKind
  /** Dónde se dibuja, en casillas (columna, fila). */
  x: number
  y: number
  ifaces: Iface[]
  routes: Route[]
}

/** Un cable entre dos extremos: `nodo` (un switch, o la primera interfaz) o `nodo.interfaz`. */
export type Link = [string, string]

export type Network = { nodes: Node[]; links: Link[] }

/** Lo que se pide: que `from` alcance a `to` (ida y vuelta). */
export type Goal = { from: string; to: string }

/**
 * Por qué muere un paquete o por qué no vale una configuración.
 *
 * De la configuración de un nodo: `empty` (sin rellenar), `bad_ip`,
 * `bad_mask`, `network_address` y `broadcast_address` (la IP es la de red o la
 * de broadcast de su subred), `reserved` (loopback, 0.x, multicast…),
 * `duplicate` (otra interfaz tiene la misma IP), `overlap` (dos interfaces del
 * nodo en subredes que se pisan) y `bad_route` (una ruta mal escrita).
 *
 * Del camino: `no_route` (no hay ruta hacia el destino), `gateway_outside`
 * (el siguiente salto no está en ninguna de sus subredes), `gateway_absent`
 * (nadie en ese cable tiene la IP del siguiente salto), `nobody` (el destino
 * debería estar en su cable y nadie lo tiene), `wrong_segment` (según su
 * máscara el destino es vecino, pero está en otra red), `not_router` (el
 * siguiente salto es una máquina que no reenvía), `private_internet`
 * (internet tira las direcciones privadas) y `loop` (da vueltas).
 */
export type DeathCode =
  | 'empty'
  | 'bad_ip'
  | 'bad_mask'
  | 'network_address'
  | 'broadcast_address'
  | 'reserved'
  | 'duplicate'
  | 'overlap'
  | 'bad_route'
  | 'no_route'
  | 'gateway_outside'
  | 'gateway_absent'
  | 'nobody'
  | 'wrong_segment'
  | 'not_router'
  | 'private_internet'
  | 'loop'

/** Dónde muere y con qué datos explicarlo (la IP, la interfaz, el otro nodo…). */
export type Death = {
  at: string
  code: DeathCode
  /** La dirección de la que se habla (el destino, la repetida, la privada…). */
  ip?: string
  iface?: string
  /** El siguiente salto de la ruta que falla. */
  via?: string
  /** El otro nodo implicado (quién tiene la IP repetida, dónde está de verdad el destino). */
  other?: string
  /** El tipo de rango reservado. */
  kind?: string
}

/** Un salto: de un nodo con IP al siguiente, pasando por los switches que haya. */
export type Hop = {
  from: string
  to: string
  /** Los nodos por los que pasa, con los extremos: `['ana', 'sw1', 'r1']`. */
  path: string[]
  /** Por qué sale por ahí: el destino es vecino, una ruta concreta o la ruta por defecto. */
  rule: 'direct' | 'route' | 'default'
  /** La interfaz de salida. */
  out: string
  /** La ruta usada, si no era vecino. */
  route?: Route
}

/** Un trayecto (la ida o la vuelta): sus saltos y, si no llega, dónde y por qué muere. */
export type Leg = { hops: Hop[]; death: Death | null }

/** El resultado de un ping: la ida, la vuelta (si la ida llegó) y si llegó la respuesta. */
export type Trace = {
  from: string
  to: string
  ok: boolean
  /** La IP a la que se manda y la IP desde la que sale (las que se conozcan). */
  target: string | null
  source: string | null
  out: Leg
  back: Leg | null
}
