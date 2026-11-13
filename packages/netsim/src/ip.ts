/**
 * Direcciones IPv4 y máscaras: leerlas, escribirlas y las cuentas de una
 * subred (red, broadcast, primer y último host). Una dirección se guarda como
 * un entero sin signo de 32 bits; una máscara, como su prefijo (cuántos bits
 * de red, de 0 a 32).
 */

/** Una dirección como entero de 32 bits, o `null` si no es una IPv4 bien escrita. */
export function parseIp(text: string): number | null {
  const parts = text.trim().split('.')

  if (parts.length !== 4) return null

  let value = 0

  for (const part of parts) {
    // Solo cifras, sin ceros delante («010» se leería en octal en algunas herramientas).
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null

    const octet = Number(part)

    if (octet > 255) return null
    value = value * 256 + octet
  }

  return value
}

export function formatIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.')
}

/** Los 32 bits de la máscara de un prefijo, como entero. */
function maskBits(prefix: number): number {
  return prefix === 0 ? 0 : 2 ** 32 - 2 ** (32 - prefix)
}

/** La máscara de un prefijo en decimal: 26 → `255.255.255.192`. */
export function maskOf(prefix: number): string {
  return formatIp(maskBits(prefix))
}

/**
 * El prefijo de una máscara escrita como `/26`, `26` o `255.255.255.192`, o
 * `null` si no vale: una máscara son unos seguidos y luego ceros.
 */
export function parseMask(text: string): number | null {
  const trimmed = text.trim()
  const slash = /^\/?(\d{1,2})$/.exec(trimmed)

  if (slash !== null) {
    const prefix = Number(slash[1])

    return prefix <= 32 ? prefix : null
  }

  const value = parseIp(trimmed)

  if (value === null) return null
  for (let prefix = 0; prefix <= 32; prefix += 1) if (maskBits(prefix) === value) return prefix

  return null
}

/** La dirección de red: los bits de host a cero. */
export function networkOf(ip: number, prefix: number): number {
  const size = 2 ** (32 - prefix)

  return Math.floor(ip / size) * size
}

/** La de broadcast: los bits de host a uno. */
export function broadcastOf(ip: number, prefix: number): number {
  return networkOf(ip, prefix) + 2 ** (32 - prefix) - 1
}

/** Si `ip` cae dentro de la red de `network` con ese prefijo. */
export function contains(network: number, prefix: number, ip: number): boolean {
  return networkOf(ip, prefix) === networkOf(network, prefix)
}

export type Subnet = {
  prefix: number
  mask: string
  network: string
  broadcast: string
  /** Primer y último host que se pueden usar. */
  first: string
  last: string
  /** Cuántos hosts caben (sin la de red ni la de broadcast). */
  hosts: number
}

/** Todo lo que se saca de una dirección y su prefijo. */
export function subnetOf(ip: number, prefix: number): Subnet {
  const network = networkOf(ip, prefix)
  const broadcast = broadcastOf(ip, prefix)
  // En /31 y /32 no hay direcciones de red ni de broadcast que apartar.
  const edge = prefix >= 31 ? 0 : 1

  return {
    prefix,
    mask: maskOf(prefix),
    network: formatIp(network),
    broadcast: formatIp(broadcast),
    first: formatIp(network + edge),
    last: formatIp(broadcast - edge),
    hosts: 2 ** (32 - prefix) - 2 * edge,
  }
}

/** El prefijo más largo (la red más pequeña) en el que caben tantos hosts. */
export function prefixFor(hosts: number): number {
  for (let prefix = 30; prefix >= 1; prefix -= 1) if (2 ** (32 - prefix) - 2 >= hosts) return prefix

  return 0
}

/** Los 32 bits de una dirección, de izquierda a derecha, como `0` y `1`. */
export function bitsOf(ip: number): string {
  return ip.toString(2).padStart(32, '0')
}

/** La dirección de 32 caracteres `0`/`1` (lo contrario de `bitsOf`). */
export function fromBits(bits: string): number {
  return Number.parseInt(bits.padEnd(32, '0').slice(0, 32), 2)
}

/** Privadas (RFC 1918): 10/8, 172.16/12 y 192.168/16. No viajan por internet. */
export function isPrivate(ip: number): boolean {
  return (
    contains(10 * 2 ** 24, 8, ip) ||
    contains(172 * 2 ** 24 + 16 * 2 ** 16, 12, ip) ||
    contains(192 * 2 ** 24 + 168 * 2 ** 16, 16, ip)
  )
}

type Reserved = 'zero' | 'loopback' | 'multicast' | 'experimental'

/** Si la dirección es de un rango que no se puede poner a una máquina, cuál. */
export function reservedKind(ip: number): Reserved | null {
  const first = Math.floor(ip / 2 ** 24)

  if (first === 0) return 'zero'
  if (first === 127) return 'loopback'
  if (first >= 240) return 'experimental'
  if (first >= 224) return 'multicast'

  return null
}

/** Un destino de ruta: `default`, `0.0.0.0/0` o `10.0.2.0/24` (la dirección de red, con su prefijo). */
export function parseDest(text: string): { network: number; prefix: number } | null {
  const trimmed = text.trim()

  if (trimmed === 'default') return { network: 0, prefix: 0 }

  const at = trimmed.indexOf('/')

  if (at < 0) return null

  const network = parseIp(trimmed.slice(0, at))
  const prefix = /^\d{1,2}$/.test(trimmed.slice(at + 1)) ? Number(trimmed.slice(at + 1)) : 33

  if (network === null || prefix > 32) return null
  // `10.0.2.7/24` no es una red: tiene bits de host puestos.
  if (networkOf(network, prefix) !== network) return null

  return { network, prefix }
}
