/**
 * El motor de redes (`packages/netsim`): las cuentas de direcciones y
 * máscaras, y el `ping` que sigue el paquete salto a salto y dice dónde y por
 * qué muere. Las cinco familias: lo normal, los bordes (/30, /31, /32, 0 y
 * 255), lo vacío y lo enorme, lo imprevisible y que no toca nada del sistema.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  bitsOf,
  formatIp,
  fromBits,
  isPrivate,
  LIMITS,
  maskOf,
  parseDest,
  parseIp,
  parseMask,
  ping,
  prefixFor,
  reservedKind,
  subnetOf,
} from '@sanatorio/netsim'
import type { Network, Node, Trace } from '@sanatorio/netsim'
import { describe, expect, it } from 'vitest'

const ip = (text: string): number => {
  const value = parseIp(text)

  if (value === null) throw new Error(`mala IP: ${text}`)

  return value
}

describe('direcciones y máscaras', () => {
  it('lee y escribe direcciones, y rechaza lo que no lo es', () => {
    expect(formatIp(ip('192.168.1.42'))).toBe('192.168.1.42')
    expect(ip('0.0.0.0')).toBe(0)
    expect(ip('255.255.255.255')).toBe(2 ** 32 - 1)
    expect(parseIp(' 10.0.0.1 ')).toBe(ip('10.0.0.1'))
    for (const bad of ['', '10.0.0', '10.0.0.1.2', '10.0.0.256', '10.0.0.-1', '10.0.0.1e1'])
      expect(parseIp(bad), bad).toBeNull()
    // Un cero delante se leería en octal en algunas herramientas: no vale.
    expect(parseIp('010.0.0.1')).toBeNull()
    expect(parseIp('a.b.c.d')).toBeNull()
    expect(parseIp('1'.repeat(5000))).toBeNull()
  })

  it('la máscara, en sus dos formas, y solo con los unos seguidos', () => {
    expect(parseMask('/24')).toBe(24)
    expect(parseMask('24')).toBe(24)
    expect(parseMask('255.255.255.0')).toBe(24)
    expect(parseMask('255.255.255.192')).toBe(26)
    expect(parseMask('0.0.0.0')).toBe(0)
    expect(parseMask('/32')).toBe(32)
    for (const bad of ['/33', '255.255.255.100', '255.0.255.0', '', 'abc', '/-1', '/2.5'])
      expect(parseMask(bad), bad).toBeNull()
    expect(maskOf(8)).toBe('255.0.0.0')
    expect(maskOf(30)).toBe('255.255.255.252')
    expect(maskOf(0)).toBe('0.0.0.0')
  })

  it('red, broadcast, rango y cuántas caben', () => {
    expect(subnetOf(ip('192.168.1.77'), 26)).toEqual({
      prefix: 26,
      mask: '255.255.255.192',
      network: '192.168.1.64',
      broadcast: '192.168.1.127',
      first: '192.168.1.65',
      last: '192.168.1.126',
      hosts: 62,
    })
    expect(subnetOf(ip('10.42.7.99'), 16)).toMatchObject({
      network: '10.42.0.0',
      broadcast: '10.42.255.255',
      hosts: 65_534,
    })
    expect(subnetOf(ip('10.0.0.5'), 30)).toMatchObject({ first: '10.0.0.5', last: '10.0.0.6' })
    // En /31 y /32 no se aparta ni la de red ni la de broadcast.
    expect(subnetOf(ip('10.0.0.5'), 31)).toMatchObject({ first: '10.0.0.4', hosts: 2 })
    expect(subnetOf(ip('8.8.8.8'), 32)).toMatchObject({ network: '8.8.8.8', hosts: 1 })
    expect(subnetOf(ip('200.1.2.3'), 0)).toMatchObject({
      network: '0.0.0.0',
      broadcast: '255.255.255.255',
    })
  })

  it('la máscara justa para tantas máquinas', () => {
    expect([2, 3, 6, 14, 30, 31, 50, 100, 254, 255].map(prefixFor)).toEqual([
      30, 29, 29, 28, 27, 26, 26, 25, 24, 23,
    ])
    expect(prefixFor(0)).toBe(30)
    expect(prefixFor(2 ** 40)).toBe(0)
  })

  it('los bits, de ida y de vuelta', () => {
    expect(bitsOf(ip('192.168.1.42'))).toBe('11000000101010000000000100101010')
    expect(fromBits(bitsOf(ip('10.20.30.40')))).toBe(ip('10.20.30.40'))
    expect(fromBits('1')).toBe(2 ** 31)
  })

  it('privadas, reservadas y destinos de ruta', () => {
    expect(
      ['10.1.2.3', '172.16.0.1', '172.31.255.254', '192.168.0.1'].map(ip).every(isPrivate),
    ).toBe(true)
    expect(
      ['172.32.0.1', '172.15.0.1', '192.169.0.1', '11.0.0.1', '8.8.8.8'].map(ip).some(isPrivate),
    ).toBe(false)
    expect(
      ['0.1.2.3', '127.0.0.1', '224.0.0.5', '240.0.0.1', '10.0.0.1'].map(ip).map(reservedKind),
    ).toEqual(['zero', 'loopback', 'multicast', 'experimental', null])
    expect(parseDest('default')).toEqual({ network: 0, prefix: 0 })
    expect(parseDest('0.0.0.0/0')).toEqual({ network: 0, prefix: 0 })
    expect(parseDest('10.0.2.0/24')).toEqual({ network: ip('10.0.2.0'), prefix: 24 })
    // Una máquina con prefijo de red no es una red; ni una dirección sin prefijo.
    for (const bad of ['10.0.2.7/24', '10.0.2.0', '10.0.2.0/33', '10.0.2.0/', 'defaults', ''])
      expect(parseDest(bad), bad).toBeNull()
  })
})

const host = (id: string, address: string, mask: string, gateway?: string): Node => ({
  id,
  kind: 'host',
  x: 0,
  y: 0,
  ifaces: [{ id: 'eth0', ip: address, mask }],
  routes: gateway === undefined ? [] : [{ dest: 'default', via: gateway }],
})

const router = (
  id: string,
  ifaces: Record<string, string>,
  routes: [string, string][] = [],
  kind: 'router' | 'internet' = 'router',
): Node => ({
  id,
  kind,
  x: 0,
  y: 0,
  ifaces: Object.entries(ifaces).map(([name, address]) => {
    const [address4 = '', prefix = ''] = address.split('/')

    return { id: name, ip: address4, mask: `/${prefix}` }
  }),
  routes: routes.map(([dest, via]) => ({ dest, via })),
})

const sw = (id: string): Node => ({ id, kind: 'switch', x: 0, y: 0, ifaces: [], routes: [] })

/** `ana — sw — r1 — r2 — db`, todo bien puesto. */
function office(change: (nodes: Record<string, Node>) => void = () => undefined): Network {
  const nodes: Record<string, Node> = {
    ana: host('ana', '10.0.1.10', '/24', '10.0.1.1'),
    leo: host('leo', '10.0.1.11', '255.255.255.0', '10.0.1.1'),
    sw1: sw('sw1'),
    r1: router('r1', { lan: '10.0.1.1/24', enl: '10.0.0.1/30' }, [['10.0.2.0/24', '10.0.0.2']]),
    r2: router('r2', { enl: '10.0.0.2/30', lan: '10.0.2.1/24' }, [['10.0.1.0/24', '10.0.0.1']]),
    db: host('db', '10.0.2.10', '/24', '10.0.2.1'),
  }

  change(nodes)

  return {
    nodes: Object.values(nodes),
    links: [
      ['ana', 'sw1'],
      ['leo', 'sw1'],
      ['sw1', 'r1.lan'],
      ['r1.enl', 'r2.enl'],
      ['r2.lan', 'db'],
    ],
  }
}

const death = (trace: Trace) => trace.out.death ?? trace.back?.death ?? null
const go = (network: Network, from = 'ana', to = 'db') => ping(network, { from, to })

describe('ping: el camino', () => {
  it('ida y vuelta por dos routers, pasando por el switch', () => {
    const trace = go(office())

    expect(trace).toMatchObject({ ok: true, source: '10.0.1.10', target: '10.0.2.10' })
    expect(trace.out.hops.map((hop) => [hop.from, hop.to, hop.rule])).toEqual([
      ['ana', 'r1', 'default'],
      ['r1', 'r2', 'route'],
      ['r2', 'db', 'direct'],
    ])
    expect(trace.out.hops[0]?.path).toEqual(['ana', 'sw1', 'r1'])
    expect(trace.back?.hops.map((hop) => hop.to)).toEqual(['r2', 'r1', 'ana'])
  })

  it('vecinas del mismo switch se hablan sin router, aunque escriban la máscara distinto', () => {
    const trace = go(office(), 'ana', 'leo')

    expect(trace.ok).toBe(true)
    expect(trace.out.hops).toHaveLength(1)
    expect(trace.out.hops[0]).toMatchObject({ rule: 'direct', path: ['ana', 'sw1', 'leo'] })
  })

  it('a sí misma llega sin dar un paso', () => {
    expect(go(office(), 'ana', 'ana')).toMatchObject({ ok: true, out: { hops: [] } })
  })

  it('gana la ruta más concreta, y a igual prefijo, lo vecino', () => {
    const network = office((nodes) => {
      nodes.r1 = router('r1', { lan: '10.0.1.1/24', enl: '10.0.0.1/30' }, [
        ['default', '10.0.1.11'],
        ['10.0.0.0/8', '10.0.1.11'],
        ['10.0.2.0/24', '10.0.0.2'],
        ['10.0.1.0/24', '10.0.0.2'],
      ])
    })
    const trace = go(network)

    expect(trace.ok).toBe(true)
    expect(trace.out.hops[1]?.route).toEqual({ dest: '10.0.2.0/24', via: '10.0.0.2' })
    // La vuelta entra en r1 hacia 10.0.1.10: su red vecina gana a la ruta del mismo prefijo.
    expect(trace.back?.hops.at(-1)).toMatchObject({ from: 'r1', to: 'ana', rule: 'direct' })
  })
})

describe('ping: dónde y por qué muere', () => {
  const broken: [string, (nodes: Record<string, Node>) => void, object, 'out' | 'back'][] = [
    [
      'sin puerta de enlace',
      (n) => (n.ana = host('ana', '10.0.1.10', '/24')),
      { at: 'ana', code: 'no_route', ip: '10.0.2.10' },
      'out',
    ],
    [
      'la puerta no es de su red',
      (n) => (n.ana = host('ana', '10.0.1.10', '/24', '10.0.2.1')),
      { at: 'ana', code: 'gateway_outside', via: '10.0.2.1' },
      'out',
    ],
    [
      'nadie tiene la puerta',
      (n) => (n.ana = host('ana', '10.0.1.10', '/24', '10.0.1.254')),
      { at: 'ana', code: 'gateway_absent', via: '10.0.1.254' },
      'out',
    ],
    [
      'la puerta es una máquina',
      (n) => (n.ana = host('ana', '10.0.1.10', '/24', '10.0.1.11')),
      { at: 'leo', code: 'not_router' },
      'out',
    ],
    [
      'máscara demasiado ancha',
      (n) => (n.ana = host('ana', '10.0.1.10', '/16', '10.0.1.1')),
      { at: 'ana', code: 'wrong_segment', other: 'db' },
      'out',
    ],
    [
      'r1 sin ruta',
      (n) => (n.r1 = router('r1', { lan: '10.0.1.1/24', enl: '10.0.0.1/30' })),
      { at: 'r1', code: 'no_route' },
      'out',
    ],
    [
      'r2 sin ruta de vuelta',
      (n) => (n.r2 = router('r2', { enl: '10.0.0.2/30', lan: '10.0.2.1/24' })),
      { at: 'r2', code: 'no_route', ip: '10.0.1.10' },
      'back',
    ],
    [
      'el destino sin puerta',
      (n) => (n.db = host('db', '10.0.2.10', '/24')),
      { at: 'db', code: 'no_route' },
      'back',
    ],
    [
      'bucle entre routers',
      (n) =>
        (n.r2 = router('r2', { enl: '10.0.0.2/30', lan: '10.0.9.1/24' }, [
          ['default', '10.0.0.1'],
        ])),
      { code: 'loop' },
      'out',
    ],
    [
      'ruta a medio escribir',
      (n) =>
        (n.r1 = router('r1', { lan: '10.0.1.1/24', enl: '10.0.0.1/30' }, [['10.0.2.0/24', '']])),
      { at: 'r1', code: 'no_route' },
      'out',
    ],
  ]

  it.each(broken)('%s', (_, change, expected, leg) => {
    const trace = go(office(change))

    expect(trace.ok).toBe(false)
    expect(death(trace)).toMatchObject(expected)
    expect(trace.back === null ? 'out' : 'back').toBe(leg)
  })

  it('el destino no existe en ningún cable', () => {
    const network = office((nodes) => {
      nodes.db = host('db', '10.0.2.10', '/24', '10.0.2.1')
      nodes.r2 = router('r2', { enl: '10.0.0.2/30', lan: '10.0.3.1/24' }, [
        ['10.0.1.0/24', '10.0.0.1'],
      ])
    })

    // db cree que r2 está en su red, pero nadie tiene esa puerta.
    expect(death(go(network, 'db', 'ana'))).toMatchObject({ at: 'db', code: 'gateway_absent' })
  })

  const invalid: [string, Node, object][] = [
    ['sin rellenar', host('ana', '', '/24'), { code: 'empty', iface: 'eth0' }],
    ['máscara vacía', host('ana', '10.0.1.10', ' '), { code: 'empty' }],
    ['IP mal escrita', host('ana', '10.0.1.300', '/24'), { code: 'bad_ip', ip: '10.0.1.300' }],
    ['máscara imposible', host('ana', '10.0.1.10', '255.255.255.100'), { code: 'bad_mask' }],
    ['máscara /0', host('ana', '10.0.1.10', '/0'), { code: 'bad_mask' }],
    ['la de red', host('ana', '10.0.1.0', '/24'), { code: 'network_address' }],
    ['la de broadcast', host('ana', '10.0.1.255', '/24'), { code: 'broadcast_address' }],
    ['loopback', host('ana', '127.0.0.5', '/24'), { code: 'reserved', kind: 'loopback' }],
    ['multicast', host('ana', '224.0.0.5', '/24'), { code: 'reserved', kind: 'multicast' }],
    ['repetida', host('ana', '10.0.1.11', '/24', '10.0.1.1'), { code: 'duplicate', other: 'leo' }],
    [
      'ruta mal escrita',
      { ...host('ana', '10.0.1.10', '/24'), routes: [{ dest: '10.0.2.7/24', via: '10.0.1.1' }] },
      { code: 'bad_route' },
    ],
  ]

  it.each(invalid)('una máquina mal configurada no manda nada: %s', (_, ana, expected) => {
    const trace = go(office((nodes) => (nodes.ana = ana)))

    expect(trace).toMatchObject({ ok: false, back: null, source: null })
    expect(trace.out.hops).toEqual([])
    expect(trace.out.death).toMatchObject({ at: 'ana', ...expected })
  })

  it('si lo mal puesto es el destino o un router del camino, muere allí', () => {
    const target = go(office((nodes) => (nodes.db = host('db', '10.0.2.255', '/24', '10.0.2.1'))))

    expect(target.out.death).toMatchObject({ at: 'db', code: 'broadcast_address' })

    const overlap = go(
      office((nodes) => (nodes.r1 = router('r1', { lan: '10.0.1.1/16', enl: '10.0.0.1/30' }))),
    )

    expect(overlap.out.death).toMatchObject({
      at: 'r1',
      code: 'overlap',
      iface: 'lan',
      other: 'enl',
    })
    expect(overlap.out.hops).toHaveLength(1)
  })

  it('internet tira las direcciones privadas y devuelve las públicas', () => {
    const exit = (lan: string): Network => ({
      nodes: [
        host('web', `${lan}.9`, '/24', `${lan}.1`),
        router('r1', { lan: `${lan}.1/24`, wan: '80.10.0.2/30' }, [['default', '80.10.0.1']]),
        router(
          'internet',
          { dns: '8.8.8.8/32', wan: '80.10.0.1/30' },
          [[`${lan}.0/24`, '80.10.0.2']],
          'internet',
        ),
      ],
      links: [
        ['web', 'r1.lan'],
        ['r1.wan', 'internet.wan'],
      ],
    })

    expect(go(exit('163.5.20'), 'web', 'internet').ok).toBe(true)
    expect(go(exit('163.5.20'), 'internet', 'web').ok).toBe(true)
    expect(death(go(exit('192.168.20'), 'web', 'internet'))).toEqual({
      at: 'internet',
      code: 'private_internet',
      ip: '192.168.20.9',
    })
    expect(death(go(exit('172.20.0'), 'internet', 'web'))).toMatchObject({
      code: 'private_internet',
      ip: '172.20.0.9',
    })
  })
})

describe('topes y lo imprevisible', () => {
  it('una red enorme o mal cableada no se simula', () => {
    const many = Array.from({ length: LIMITS.nodes + 1 }, (_, index) =>
      host(`h${index}`, `10.0.${index}.1`, '/24'),
    )

    expect(() => ping({ nodes: many, links: [] }, { from: 'h0', to: 'h1' })).toThrow(/demasiados/)
    expect(() =>
      ping(
        { nodes: [host('a', '10.0.0.1', '/24')], links: [['a', 'nadie']] },
        { from: 'a', to: 'a' },
      ),
    ).toThrow(/no existe/)
    expect(() => go(office(), 'ana', 'sw1')).toThrow(/no hay máquina/)
    expect(() => go(office(), 'nadie', 'db')).toThrow(/no hay máquina/)

    const wide = router(
      'r',
      Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`e${i}`, `10.${i}.0.1/24`])),
    )

    expect(() => ping({ nodes: [wide], links: [] }, { from: 'r', to: 'r' })).toThrow(/interfaces/)
  })

  it('un anillo de switches no cuelga la búsqueda de vecinos', () => {
    const network: Network = {
      nodes: [
        host('a', '10.0.0.1', '/24'),
        sw('s1'),
        sw('s2'),
        sw('s3'),
        host('b', '10.0.0.2', '/24'),
      ],
      links: [
        ['a', 's1'],
        ['s1', 's2'],
        ['s2', 's3'],
        ['s3', 's1'],
        ['s3', 'b'],
      ],
    }

    expect(ping(network, { from: 'a', to: 'b' }).ok).toBe(true)
  })

  it('lo raro en un campo es una muerte con su porqué, no una excepción', () => {
    for (const text of [
      '__proto__',
      '<script>',
      '../../etc/passwd',
      '9'.repeat(400),
      '1.2.3.4; rm -rf /',
      '\u0000',
    ])
      expect(go(office((nodes) => (nodes.ana = host('ana', text, text, text)))).ok).toBe(false)
  })

  it('el motor no importa nada del sistema (ni fs, ni procesos, ni red, ni eval)', () => {
    const dir = fileURLToPath(new URL('../../../../packages/netsim/src', import.meta.url))
    const files = readdirSync(dir, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.ts'))

    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8')

      // Solo importa de sí mismo y de la plantilla de cursos; nada de eval.
      for (const from of text.matchAll(/\bfrom '([^']+)'/g))
        expect(from[1], file).toMatch(/^(\.|@sanatorio\/course$)/)
      expect(text, file).not.toMatch(/\beval\(|new Function\(|globalThis|\bfetch\(|\brequire\(/)
    }
  })
})
