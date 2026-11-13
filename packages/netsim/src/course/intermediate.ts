/**
 * Nivel intermedio: partir un rango en subredes, las tablas de rutas (destino,
 * siguiente salto, ruta por defecto, la vuelta y la más concreta) y la salida
 * a internet con direcciones públicas. Acaba en «La mudanza».
 */

import { host, internet, net, router, sw } from './build.js'
import { bossIn, chain, exit, reach, unitIn } from './make.js'
import type { Unit } from './types.js'

const unit = unitIn('intermediate')
const boss = bossIn('intermediate')

/** `a — r1 — r2 — b` con otras direcciones, para las pruebas del bloque 5. */
const twoRouters = (a: string, b: string, p: string) =>
  net(
    [
      host(a, 0, 0, `${p}.1.50/24`, `${p}.1.1`),
      router('r1', 1, 0, { lan: `${p}.1.1/24`, enl: `${p}.255.1/30` }, [
        [`${p}.2.0/24`, `${p}.255.2`],
      ]),
      router('r2', 2, 0, { enl: `${p}.255.2/30`, lan: `${p}.2.1/24` }, [
        [`${p}.1.0/24`, `${p}.255.1`],
      ]),
      host(b, 3, 0, `${p}.2.50/24`, `${p}.2.1`),
    ],
    [`${a}-r1.lan`, 'r1.enl-r2.enl', `r2.lan-${b}`],
  )

export const INTERMEDIATE: Unit[] = [
  // ── Bloque 4: subredes ───────────────────────────────────────────────────
  unit(
    'net-split',
    4,
    {
      title: 'Partir una red en dos',
      goal: 'El rango 10.8.4.0/24 se ha partido en dos mitades, pero tres máscaras siguen en /24. Corrígelas.',
      theory: {
        what: 'Un bit más de máscara parte una red en dos mitades. De 192.168.10.0/24 salen 192.168.10.0/25 (.1 a .126) y 192.168.10.128/25 (.129 a .254).',
        how: [
          '192.168.10.0/24  ->  /25 + /25',
          'mitad baja: .0 a .127',
          'mitad alta: .128 a .255',
          '# el router pone un pie en cada mitad',
        ],
        when: 'Te dan un solo rango y tienes dos salas: lo partes y pones un router en medio.',
        problems:
          'Error típico: dejar /24 en el router. Dice «sus interfaces a y b están en subredes que se pisan» y no reenvía nada.',
      },
      example:
        'Antes de verlo: r1 con /24 en sus dos interfaces, ¿por cuál sacaría un paquete para .200?',
    },
    {
      title: 'Splitting a network in two',
      goal: 'Range 10.8.4.0/24 was split into two halves, but three masks still say /24. Fix them.',
      theory: {
        what: 'One more mask bit splits a network into two halves. 192.168.10.0/24 gives 192.168.10.0/25 (.1 to .126) and 192.168.10.128/25 (.129 to .254).',
        how: [
          '192.168.10.0/24  ->  /25 + /25',
          'lower half: .0 to .127',
          'upper half: .128 to .255',
          '# the router puts one foot in each half',
        ],
        when: 'You get a single range and have two rooms: you split it and put a router in between.',
        problems:
          'Typical mistake: leaving /24 on the router. It says “its interfaces a and b are in overlapping subnets” and forwards nothing.',
      },
      example: 'Before you look: r1 with /24 on both interfaces, which one would it use for .200?',
    },
    {
      net: net(
        [
          host('ana', 0, 0, '192.168.10.10/25', '192.168.10.1'),
          router('r1', 1, 0, { a: '192.168.10.1/25', b: '192.168.10.129/25' }),
          host('leo', 2, 0, '192.168.10.200/25', '192.168.10.129'),
        ],
        ['ana-r1.a', 'r1.b-leo'],
      ),
      goal: { from: 'ana', to: 'leo' },
      broken: { 'r1.a.mask': '/24', 'r1.b.mask': '/24' },
    },
    {
      net: net(
        [
          host('diseno', 0, 0, '10.8.4.20/25', '10.8.4.1'),
          router('r1', 1, 0, { izq: '10.8.4.1/25', der: '10.8.4.129/25' }),
          host('video', 2, 0, '10.8.4.150/25', '10.8.4.129'),
        ],
        ['diseno-r1.izq', 'r1.der-video'],
      ),
      fields: ['r1.izq.mask', 'r1.der.mask', 'video.eth0.mask'],
      start: { 'r1.izq.mask': '/24', 'r1.der.mask': '/24', 'video.eth0.mask': '/24' },
      goals: reach('diseno>video'),
    },
  ),
  unit(
    'net-p2p',
    4,
    {
      title: 'El enlace entre dos routers',
      goal: 'Numera el extremo de r2 en el enlace con r1.',
      theory: {
        what: 'Dos routers se unen con una red propia, solo para ellos. Con /30 caben justo sus dos direcciones.',
        how: [
          'enlace: 10.255.0.0/30',
          'r1: 10.255.0.1      r2: 10.255.0.2',
          '# .0 es la red y .3 el broadcast',
        ],
        when: 'Entre sedes, entre tu router y el del proveedor, entre racks: cada cable entre routers es una red pequeña.',
        problems:
          'Error típico: dar a los extremos direcciones de dos /30 distintos (.1 y .5). r1 dice «no tiene ruta hacia 10.255.0.5»: para él es otra red.',
      },
      example: 'Antes de verlo: r1 es 10.255.0.1/30 y r2 es 10.255.0.5/30. ¿Se ven?',
    },
    {
      title: 'The link between two routers',
      goal: 'Number the r2 end of the link with r1.',
      theory: {
        what: 'Two routers are joined by a network of their own, just for them. A /30 fits exactly their two addresses.',
        how: [
          'link: 10.255.0.0/30',
          'r1: 10.255.0.1      r2: 10.255.0.2',
          '# .0 is the network and .3 the broadcast',
        ],
        when: 'Between sites, between your router and the provider, between racks: every wire between routers is a small network.',
        problems:
          'Typical mistake: giving the ends addresses from two different /30s (.1 and .5). r1 says “no route to 10.255.0.5”: to it, that is another network.',
      },
      example:
        'Before you look: r1 is 10.255.0.1/30 and r2 is 10.255.0.5/30. Do they see each other?',
    },
    {
      net: net(
        [
          router('r1', 0, 0, { enl: '10.255.0.1/30' }),
          router('r2', 1, 0, { enl: '10.255.0.2/30' }),
        ],
        ['r1.enl-r2.enl'],
      ),
      goal: { from: 'r1', to: 'r2' },
      broken: { 'r2.enl.ip': '10.255.0.5' },
    },
    {
      net: net(
        [
          router('r1', 0, 0, { enl: '172.30.0.9/30', lan: '10.1.1.1/24' }),
          router('r2', 1, 0, { enl: '172.30.0.10/30', lan: '10.1.2.1/24' }),
        ],
        ['r1.enl-r2.enl'],
      ),
      fields: ['r2.enl.ip', 'r2.enl.mask'],
      goals: reach('r1>r2'),
    },
  ),
  unit(
    'net-fit',
    4,
    {
      title: '¿Qué máscara para cuántas máquinas?',
      goal: 'Para cada número de máquinas, escribe el prefijo de la red más pequeña en la que caben.',
      theory: {
        what: 'Eliges la máscara por el tamaño: la red más pequeña en la que caben tus máquinas. Con h bits de máquina caben 2^h − 2.',
        how: [
          '/30 -> 2      /29 -> 6      /28 -> 14',
          '/27 -> 30     /26 -> 62     /25 -> 126',
          '/24 -> 254',
          '50 máquinas -> /26     # en /27 solo caben 30',
        ],
        when: 'Al repartir un rango entre equipos: a cada uno lo justo, para que quede sitio para el siguiente.',
        problems:
          'Error típico: olvidar las 2 reservadas. Para 30 máquinas vale /27; para 31 ya hace falta /26. Y el router gasta una.',
      },
      example: 'Antes de verlo: ¿cuántas máquinas caben en un /26?',
    },
    {
      title: 'Which mask for how many machines?',
      goal: 'For each number of machines, write the prefix of the smallest network that fits them.',
      theory: {
        what: 'You choose the mask by size: the smallest network your machines fit in. With h host bits, 2^h − 2 fit.',
        how: [
          '/30 -> 2      /29 -> 6      /28 -> 14',
          '/27 -> 30     /26 -> 62     /25 -> 126',
          '/24 -> 254',
          '50 machines -> /26     # a /27 only fits 30',
        ],
        when: 'When you share a range between teams: each gets just enough, so there is room for the next one.',
        problems:
          'Typical mistake: forgetting the 2 reserved ones. 30 machines fit in a /27; 31 already need a /26. And the router takes one.',
      },
      example: 'Before you look: how many machines fit in a /26?',
    },
    { ip: '10.0.0.0', mask: '/26' },
    { calc: [{ need: 50 }, { need: 6 }, { need: 100 }, { need: 14 }, { need: 31 }] },
  ),
  unit(
    'net-overlap',
    4,
    {
      title: 'Subredes que se pisan',
      goal: 'Las tres interfaces de r1 están en /24 y se pisan. Dale a cada una la máscara de su trozo.',
      theory: {
        what: 'Dos redes se pisan si una dirección puede ser de las dos. Un router no puede tener dos interfaces en redes que se pisan: no sabría por cuál salir.',
        how: [
          '10.0.0.0/24 y 10.0.0.128/25    # se pisan',
          '10.0.0.0/25 y 10.0.0.128/25    # no se pisan',
          '10.0.0.0/25  10.0.0.128/26  10.0.0.192/26   # tres trozos limpios',
        ],
        when: 'Al añadir una subred a un plan que ya existe: compruebas que su rango no toca ninguno de los que hay.',
        problems:
          'Error típico: agrandar una máscara «para que quepan más» sin mirar a la vecina. El router dice que sus interfaces se pisan y deja de reenviar.',
      },
      example: 'Antes de verlo: la interfaz a de r1 pasa de /25 a /24. ¿Sigue llegando h1 a h3?',
    },
    {
      title: 'Overlapping subnets',
      goal: 'The three interfaces of r1 are /24 and overlap. Give each one the mask of its slice.',
      theory: {
        what: 'Two networks overlap if one address could belong to both. A router cannot have two interfaces in overlapping networks: it would not know which way out to use.',
        how: [
          '10.0.0.0/24 and 10.0.0.128/25    # overlap',
          '10.0.0.0/25 and 10.0.0.128/25    # do not overlap',
          '10.0.0.0/25  10.0.0.128/26  10.0.0.192/26   # three clean slices',
        ],
        when: 'When you add a subnet to an existing plan: you check its range touches none of the others.',
        problems:
          'Typical mistake: widening a mask “so more fit” without looking at its neighbour. The router says its interfaces overlap and stops forwarding.',
      },
      example: 'Before you look: interface a of r1 goes from /25 to /24. Does h1 still reach h3?',
    },
    {
      net: net(
        [
          host('h1', 0, 0, '10.0.0.10/25', '10.0.0.1'),
          router('r1', 1, 0, { a: '10.0.0.1/25', b: '10.0.0.129/26', c: '10.0.0.193/26' }),
          host('h2', 2, 0, '10.0.0.140/26', '10.0.0.129'),
          host('h3', 1, 1, '10.0.0.200/26', '10.0.0.193'),
        ],
        ['h1-r1.a', 'r1.b-h2', 'r1.c-h3'],
      ),
      goal: { from: 'h1', to: 'h3' },
      broken: { 'r1.a.mask': '/24' },
    },
    {
      net: net(
        [
          host('crm', 0, 0, '192.168.100.50/25', '192.168.100.1'),
          router('r1', 1, 0, {
            vent: '192.168.100.1/25',
            sop: '192.168.100.129/26',
            dir: '192.168.100.193/27',
          }),
          host('tickets', 2, 0, '192.168.100.180/26', '192.168.100.129'),
          host('nominas', 1, 1, '192.168.100.220/27', '192.168.100.193'),
        ],
        ['crm-r1.vent', 'r1.sop-tickets', 'r1.dir-nominas'],
      ),
      fields: ['r1.vent.mask', 'r1.sop.mask', 'r1.dir.mask'],
      start: { 'r1.vent.mask': '/24', 'r1.sop.mask': '/24', 'r1.dir.mask': '/24' },
      goals: reach('crm>tickets', 'tickets>nominas', 'crm>nominas'),
    },
  ),
  boss(
    'net-boss-teams',
    4,
    420,
    {
      title: 'Tres equipos, un solo /24',
      goal: 'Reparte 10.42.7.0/24 entre producto, datos y legal sin que se pisen.',
      story:
        'A la oficina nueva le han dado 10.42.7.0/24 y nada más. Caben los tres equipos si lo partes bien: 100 personas en producto, 50 en datos y 20 en legal.',
      tasks: [
        'Producto necesita 100 direcciones, datos 50 y legal 20',
        'Las máquinas ya tienen su IP: faltan las máscaras',
        'Las tres subredes no se pueden pisar',
        'p1, d1 y l1 tienen que alcanzarse',
      ],
    },
    {
      title: 'Three teams, a single /24',
      goal: 'Share 10.42.7.0/24 between product, data and legal with no overlap.',
      story:
        'The new office got 10.42.7.0/24 and nothing else. The three teams fit if you split it well: 100 people in product, 50 in data and 20 in legal.',
      tasks: [
        'Product needs 100 addresses, data 50 and legal 20',
        'The machines already have their IP: the masks are missing',
        'The three subnets must not overlap',
        'p1, d1 and l1 must reach each other',
      ],
    },
    {
      net: net(
        [
          host('p1', 0, 0, '10.42.7.100/25', '10.42.7.1'),
          router('r1', 1, 0, {
            prod: '10.42.7.1/25',
            datos: '10.42.7.129/26',
            legal: '10.42.7.193/27',
          }),
          host('d1', 2, 0, '10.42.7.190/26', '10.42.7.129'),
          host('l1', 1, 1, '10.42.7.200/27', '10.42.7.193'),
        ],
        ['p1-r1.prod', 'r1.datos-d1', 'r1.legal-l1'],
      ),
      fields: [
        'r1.prod.mask',
        'r1.datos.mask',
        'r1.legal.mask',
        'p1.eth0.mask',
        'd1.eth0.mask',
        'l1.eth0.mask',
      ],
      goals: reach('p1>d1', 'd1>l1', 'l1>p1'),
    },
  ),

  // ── Bloque 5: tablas de rutas ────────────────────────────────────────────
  unit(
    'net-route',
    5,
    {
      title: 'Una ruta: destino y siguiente salto',
      goal: 'r1 no conoce la red de cola. Escríbele la ruta: a qué red y por qué vecino.',
      theory: {
        what: 'Un router solo conoce las redes que toca. Para las demás necesita una ruta: «para llegar a esa red, pásaselo a este vecino».',
        how: [
          'r1 toca: 10.0.1.0/24 y 10.0.0.0/30',
          'ruta en r1:',
          '10.0.2.0/24  via 10.0.0.2    # la red de detrás de r2',
          '# destino = una RED; via = la dirección de un vecino',
        ],
        when: 'Con dos routers o más, cada uno necesita saber qué hay detrás de los otros.',
        problems:
          'Error típico: poner de destino una máquina con máscara de red (10.0.2.10/24). No es una red: «r1 tiene una ruta mal escrita».',
      },
      example:
        'Antes de verlo: r1 no tiene ninguna ruta. ¿Hasta dónde llega el paquete de ana a db?',
    },
    {
      title: 'A route: destination and next hop',
      goal: 'r1 does not know the network of cola. Write its route: which network and through which neighbour.',
      theory: {
        what: 'A router only knows the networks it touches. For the rest it needs a route: “to reach that network, hand it to this neighbour”.',
        how: [
          'r1 touches: 10.0.1.0/24 and 10.0.0.0/30',
          'route on r1:',
          '10.0.2.0/24  via 10.0.0.2    # the network behind r2',
          '# destination = a NETWORK; via = a neighbour address',
        ],
        when: 'With two routers or more, each needs to know what sits behind the others.',
        problems:
          'Typical mistake: using a machine with a network mask as destination (10.0.2.10/24). That is not a network: “r1 has a badly written route”.',
      },
      example:
        'Before you look: r1 has no route at all. How far does the packet from ana to db get?',
    },
    { net: chain(), goal: { from: 'ana', to: 'db' }, broken: { 'r1.route0.dest': '' } },
    {
      net: net(
        [
          host('web', 0, 0, '192.168.10.5/24', '192.168.10.1'),
          router('r1', 1, 0, { lan: '192.168.10.1/24', enl: '172.16.0.1/30' }, [
            ['192.168.20.0/24', '172.16.0.2'],
          ]),
          router('r2', 2, 0, { enl: '172.16.0.2/30', lan: '192.168.20.1/24' }, [
            ['192.168.10.0/24', '172.16.0.1'],
          ]),
          host('cola', 3, 0, '192.168.20.5/24', '192.168.20.1'),
        ],
        ['web-r1.lan', 'r1.enl-r2.enl', 'r2.lan-cola'],
      ),
      fields: ['r1.route0.dest', 'r1.route0.via'],
      goals: reach('web>cola'),
    },
  ),
  unit(
    'net-default',
    5,
    {
      title: 'La ruta por defecto',
      goal: 'r1 solo tiene sitio para una ruta y hay dos redes detrás de r2. Escribe la que sirve para las dos.',
      theory: {
        what: 'La ruta por defecto (default, o 0.0.0.0/0) sirve para todo lo que no tiene una ruta más concreta. La puerta de enlace de una máquina es justo eso.',
        how: [
          'default      via 10.0.0.2',
          '0.0.0.0/0    via 10.0.0.2    # lo mismo',
          '# /0: cero bits que comparar; cualquier destino encaja',
        ],
        when: 'En un router de borde no puedes listar todas las redes del mundo: «lo demás, al de arriba».',
        problems:
          'Error típico: escribir 0.0.0.0 sin el /0 («una ruta mal escrita») o 0.0.0.0/24, que solo cubre de 0.0.0.0 a 0.0.0.255.',
      },
      example:
        'Antes de verlo: la ruta de r1 es 0.0.0.0/24 en vez de 0.0.0.0/0. ¿Encaja 10.0.2.10 en ella?',
    },
    {
      title: 'The default route',
      goal: 'r1 has room for one route only and two networks sit behind r2. Write the one that covers both.',
      theory: {
        what: 'The default route (default, or 0.0.0.0/0) is for everything without a more specific route. A machine’s gateway is exactly that.',
        how: [
          'default      via 10.0.0.2',
          '0.0.0.0/0    via 10.0.0.2    # the same',
          '# /0: zero bits to compare; any destination matches',
        ],
        when: 'On an edge router you cannot list every network in the world: “everything else goes upstream”.',
        problems:
          'Typical mistake: writing 0.0.0.0 without the /0 (“a badly written route”) or 0.0.0.0/24, which only covers 0.0.0.0 to 0.0.0.255.',
      },
      example:
        'Before you look: the route on r1 is 0.0.0.0/24 instead of 0.0.0.0/0. Does 10.0.2.10 match it?',
    },
    { net: chain(), goal: { from: 'ana', to: 'db' }, broken: { 'r1.route0.dest': '0.0.0.0/24' } },
    {
      net: net(
        [
          host('oficina', 0, 0, '10.1.0.20/24', '10.1.0.1'),
          router('r1', 1, 0, { lan: '10.1.0.1/24', up: '10.9.9.1/30' }, [['default', '10.9.9.2']]),
          router('r2', 2, 0, { down: '10.9.9.2/30', a: '10.2.0.1/24', b: '10.3.0.1/24' }, [
            ['10.1.0.0/24', '10.9.9.1'],
          ]),
          host('git', 3, 0, '10.2.0.10/24', '10.2.0.1'),
          host('wiki', 2, 1, '10.3.0.10/24', '10.3.0.1'),
        ],
        ['oficina-r1.lan', 'r1.up-r2.down', 'r2.a-git', 'r2.b-wiki'],
      ),
      fields: ['r1.route0.dest', 'r1.route0.via'],
      goals: reach('oficina>git', 'oficina>wiki'),
    },
  ),
  unit(
    'net-return',
    5,
    {
      title: 'La ruta de vuelta',
      goal: 'La pregunta de portatil llega a nas y la respuesta se pierde en r2. Dale a r2 la ruta que le falta.',
      theory: {
        what: 'Cada router del camino necesita ruta en los dos sentidos. Que r1 sepa llegar a la red de db no sirve si r2 no sabe volver a la de ana.',
        how: [
          'ida:    r1: 10.0.2.0/24 via 10.0.0.2    # está',
          'vuelta: r2: 10.0.1.0/24 via 10.0.0.1    # falta',
          '# la respuesta muere en r2',
        ],
        when: 'Cada vez que añades una red la anuncias en los routers del otro lado, no solo en el suyo.',
        problems:
          'Error típico: configurar solo el router «de tu lado». Síntoma: la ida llega y «vuelta: r2 no tiene ruta hacia 10.0.1.10».',
      },
      example:
        'Antes de verlo: r2 no tiene ruta hacia la red de ana. ¿En qué viaje muere el paquete, y dónde?',
    },
    {
      title: 'The route back',
      goal: 'The request from portatil reaches nas and the reply gets lost at r2. Give r2 the route it lacks.',
      theory: {
        what: 'Every router on the path needs a route in both directions. r1 knowing the way to db’s network is useless if r2 cannot get back to ana’s.',
        how: [
          'out:  r1: 10.0.2.0/24 via 10.0.0.2    # there',
          'back: r2: 10.0.1.0/24 via 10.0.0.1    # missing',
          '# the reply dies at r2',
        ],
        when: 'Every time you add a network you announce it on the routers of the other side, not just on its own.',
        problems:
          'Typical mistake: configuring only the router “on your side”. Symptom: the request arrives and “back: r2 has no route to 10.0.1.10”.',
      },
      example:
        'Before you look: r2 has no route to ana’s network. On which trip does the packet die, and where?',
    },
    { net: chain(), goal: { from: 'ana', to: 'db' }, broken: { 'r2.route0.via': '' } },
    {
      net: twoRouters('portatil', 'nas', '172.20'),
      fields: ['r2.route0.dest', 'r2.route0.via'],
      goals: reach('portatil>nas'),
    },
  ),
  unit(
    'net-nexthop',
    5,
    {
      title: 'El siguiente salto es un vecino',
      goal: 'Dos rutas hacia la red de b apuntan a alguien que no es vecino. Corrige sus siguientes saltos.',
      theory: {
        what: 'El siguiente salto de una ruta es siempre la dirección de un vecino: alguien en uno de tus propios cables. No el destino final ni la otra cara del router de al lado.',
        how: [
          'r1: enlace 10.0.0.1/30     # su vecino: r2 = 10.0.0.2',
          'bien: 10.0.2.0/24 via 10.0.0.2',
          'mal:  10.0.2.0/24 via 10.0.2.1    # la otra cara de r2',
        ],
        when: 'Al escribir cualquier ruta te preguntas: «¿a cuál de mis vecinos se lo doy?».',
        problems:
          'Error típico: poner la dirección del router en la red de destino. r1 dice «el siguiente salto 10.0.2.1 no está en ninguna de sus redes».',
      },
      example:
        'Antes de verlo: la ruta de r1 va «via 10.0.2.1», la cara de r2 que da a db. ¿Puede r1 entregárselo?',
    },
    {
      title: 'The next hop is a neighbour',
      goal: 'Two routes to the network of b point at someone who is not a neighbour. Fix their next hops.',
      theory: {
        what: 'The next hop of a route is always a neighbour address: someone on one of your own wires. Not the final destination, nor the far side of the router next door.',
        how: [
          'r1: link 10.0.0.1/30       # its neighbour: r2 = 10.0.0.2',
          'right: 10.0.2.0/24 via 10.0.0.2',
          'wrong: 10.0.2.0/24 via 10.0.2.1   # the far side of r2',
        ],
        when: 'Whenever you write a route you ask: “which of my neighbours do I hand it to?”.',
        problems:
          'Typical mistake: using the router address inside the destination network. r1 says “next hop 10.0.2.1 is not in any of its networks”.',
      },
      example:
        'Before you look: the route on r1 says “via 10.0.2.1”, the side of r2 facing db. Can r1 hand it over?',
    },
    { net: chain(), goal: { from: 'ana', to: 'db' }, broken: { 'r1.route0.via': '10.0.2.1' } },
    {
      net: net(
        [
          host('a', 0, 0, '10.10.1.10/24', '10.10.1.1'),
          router('r1', 1, 0, { lan: '10.10.1.1/24', e: '10.10.255.1/30' }, [
            ['10.10.3.0/24', '10.10.255.2'],
          ]),
          router('r2', 2, 0, { w: '10.10.255.2/30', e: '10.10.255.5/30' }, [
            ['10.10.1.0/24', '10.10.255.1'],
            ['10.10.3.0/24', '10.10.255.6'],
          ]),
          router('r3', 3, 0, { w: '10.10.255.6/30', lan: '10.10.3.1/24' }, [
            ['10.10.1.0/24', '10.10.255.5'],
          ]),
          host('b', 4, 0, '10.10.3.10/24', '10.10.3.1'),
        ],
        ['a-r1.lan', 'r1.e-r2.w', 'r2.e-r3.w', 'r3.lan-b'],
      ),
      fields: ['r1.route0.via', 'r2.route1.via'],
      start: { 'r1.route0.via': '10.10.3.1', 'r2.route1.via': '10.10.3.1' },
      goals: reach('a>b'),
    },
  ),
  unit(
    'net-longest',
    5,
    {
      title: 'Gana la ruta más concreta',
      goal: 'Todo sale por r2 con la ruta por defecto, pero backup está detrás de r3. Añade la ruta que lo desvía.',
      theory: {
        what: 'Si varias rutas sirven para un destino, gana la más concreta: la de prefijo más largo. La ruta por defecto (/0) es la última opción.',
        how: [
          'default        via 10.0.0.2     # todo lo demás',
          '10.5.0.0/16    via 10.0.0.6',
          '10.5.7.0/24    via 10.0.0.10',
          '# destino 10.5.7.9 -> gana /24',
          '# destino 10.5.8.9 -> gana /16',
        ],
        when: 'Para mandar casi todo por un sitio y una red concreta por otro, sin tocar lo demás.',
        problems:
          'Error típico: creer que manda el orden de la tabla. No: una ruta /24 gana a una /16 esté donde esté.',
      },
      example:
        'Antes de verlo: sin la ruta a 10.5.7.0/24, el paquete para x sale por la de defecto. ¿Quién lo tira?',
    },
    {
      title: 'The most specific route wins',
      goal: 'Everything leaves through r2 on the default route, but backup sits behind r3. Add the route that diverts it.',
      theory: {
        what: 'If several routes match a destination, the most specific wins: the longest prefix. The default route (/0) is the last resort.',
        how: [
          'default        via 10.0.0.2     # everything else',
          '10.5.0.0/16    via 10.0.0.6',
          '10.5.7.0/24    via 10.0.0.10',
          '# destination 10.5.7.9 -> /24 wins',
          '# destination 10.5.8.9 -> /16 wins',
        ],
        when: 'To send almost everything one way and one particular network another, without touching the rest.',
        problems:
          'Typical mistake: thinking table order decides. It does not: a /24 route beats a /16 wherever it is.',
      },
      example:
        'Before you look: without the route to 10.5.7.0/24, the packet for x takes the default. Who drops it?',
    },
    {
      net: net(
        [
          host('ana', 0, 0, '10.0.1.10/24', '10.0.1.1'),
          router('r1', 1, 0, { lan: '10.0.1.1/24', a: '10.0.0.1/30', b: '10.0.0.5/30' }, [
            ['default', '10.0.0.2'],
            ['10.5.7.0/24', '10.0.0.6'],
          ]),
          router('r2', 2, 0, { a: '10.0.0.2/30', lan: '10.5.8.1/24' }, [
            ['10.0.1.0/24', '10.0.0.1'],
          ]),
          router('r3', 1, 1, { b: '10.0.0.6/30', lan: '10.5.7.1/24' }, [
            ['10.0.1.0/24', '10.0.0.5'],
          ]),
          host('x', 2, 1, '10.5.7.9/24', '10.5.7.1'),
        ],
        ['ana-r1.lan', 'r1.a-r2.a', 'r1.b-r3.b', 'r3.lan-x'],
      ),
      goal: { from: 'ana', to: 'x' },
      broken: { 'r1.route1.dest': '' },
    },
    {
      net: net(
        [
          host('dev', 0, 0, '192.168.1.10/24', '192.168.1.1'),
          router('r1', 1, 0, { lan: '192.168.1.1/24', izq: '10.0.0.1/30', der: '10.0.0.5/30' }, [
            ['default', '10.0.0.2'],
            ['172.16.50.0/24', '10.0.0.6'],
          ]),
          router('r2', 2, 0, { izq: '10.0.0.2/30', lan: '172.16.0.1/16' }, [
            ['192.168.1.0/24', '10.0.0.1'],
          ]),
          host('nube', 3, 0, '172.16.9.9/16', '172.16.0.1'),
          router('r3', 1, 1, { der: '10.0.0.6/30', lan: '172.16.50.1/24' }, [
            ['192.168.1.0/24', '10.0.0.5'],
          ]),
          host('backup', 2, 1, '172.16.50.9/24', '172.16.50.1'),
        ],
        ['dev-r1.lan', 'r1.izq-r2.izq', 'r2.lan-nube', 'r1.der-r3.der', 'r3.lan-backup'],
      ),
      fields: ['r1.route1.dest', 'r1.route1.via'],
      goals: reach('dev>nube', 'dev>backup'),
    },
  ),
  boss(
    'net-boss-monitor',
    5,
    480,
    {
      title: 'El monitor se ha quedado ciego',
      goal: 'Arregla las tablas de rutas para que monitor vuelva a ver producción.',
      story:
        'Desde el cambio de anoche, el panel de monitorización no ve los servidores de producción. Hay tres routers por medio y cada uno tiene su tabla.',
      tasks: [
        'Que monitor alcance a prod1 y a prod2',
        'Una ruta apunta a quien no es vecino',
        'Un destino no es una red',
        'Y hay una vuelta que nadie apuntó',
      ],
    },
    {
      title: 'The monitor has gone blind',
      goal: 'Fix the routing tables so monitor can see production again.',
      story:
        'Since last night’s change, the monitoring dashboard cannot see the production servers. There are three routers in between and each has its own table.',
      tasks: [
        'monitor must reach prod1 and prod2',
        'One route points at someone who is not a neighbour',
        'One destination is not a network',
        'And nobody wrote down one of the routes back',
      ],
    },
    {
      net: net(
        [
          host('monitor', 0, 0, '10.60.1.10/24', '10.60.1.1'),
          router('r1', 1, 0, { lan: '10.60.1.1/24', e: '10.60.0.1/30' }, [
            ['default', '10.60.0.2'],
          ]),
          router('r2', 2, 0, { w: '10.60.0.2/30', e: '10.60.0.5/30' }, [
            ['10.60.1.0/24', '10.60.0.1'],
            ['10.60.3.0/24', '10.60.0.6'],
          ]),
          router('r3', 3, 0, { w: '10.60.0.6/30', lan: '10.60.3.1/24' }, [
            ['10.60.1.0/24', '10.60.0.5'],
          ]),
          sw('sw1', 3, 1),
          host('prod1', 2, 1, '10.60.3.11/24', '10.60.3.1'),
          host('prod2', 4, 1, '10.60.3.12/24', '10.60.3.1'),
        ],
        ['monitor-r1.lan', 'r1.e-r2.w', 'r2.e-r3.w', 'r3.lan-sw1', 'sw1-prod1', 'sw1-prod2'],
      ),
      fields: ['r1.route0.via', 'r2.route1.dest', 'r3.route0.dest', 'r3.route0.via'],
      start: { 'r1.route0.via': '10.60.0.6', 'r2.route1.dest': '10.60.3.11/24' },
      goals: reach('monitor>prod1', 'monitor>prod2'),
    },
  ),

  // ── Bloque 6: salir a internet ───────────────────────────────────────────
  unit(
    'net-public',
    6,
    {
      title: 'Privadas y públicas',
      goal: 'tienda tiene una dirección privada y no sale a internet. Pásala, con su router, al rango público que internet ya conoce.',
      theory: {
        what: 'Los rangos privados (10.x, 172.16–31.x, 192.168.x) se repiten en miles de redes: internet no sabría a cuál contestar y los tira. Fuera solo viajan direcciones públicas.',
        how: [
          'privadas: 10.0.0.0/8',
          '          172.16.0.0/12     # de 172.16 a 172.31',
          '          192.168.0.0/16',
          'pública:  cualquier otra no reservada (163.5.20.9)',
        ],
        when: 'Al decidir qué máquinas se ven desde fuera: un servidor web público necesita una dirección pública.',
        problems:
          'Error típico: creer que 172.20.x es pública. Síntoma: «internet tira los paquetes con direcciones privadas (172.20.0.5)».',
        whenNot:
          'En casa sales con direcciones privadas porque el router las traduce (NAT). Este simulador, como NetPractice, no traduce.',
      },
      example:
        'Antes de verlo: web pasa a ser 192.168.20.9. ¿Hasta dónde llega su paquete a 8.8.8.8?',
    },
    {
      title: 'Private and public',
      goal: 'tienda has a private address and cannot get out. Move it, and its router, into the public range the internet already knows.',
      theory: {
        what: 'Private ranges (10.x, 172.16–31.x, 192.168.x) repeat in thousands of networks: the internet would not know which one to answer, so it drops them. Only public addresses travel outside.',
        how: [
          'private: 10.0.0.0/8',
          '         172.16.0.0/12     # 172.16 to 172.31',
          '         192.168.0.0/16',
          'public:  any other non-reserved one (163.5.20.9)',
        ],
        when: 'When you decide which machines are visible from outside: a public web server needs a public address.',
        problems:
          'Typical mistake: thinking 172.20.x is public. Symptom: “the internet drops packets with private addresses (172.20.0.5)”.',
        whenNot:
          'At home you get out with private addresses because the router translates them (NAT). This simulator, like NetPractice, does not.',
      },
      example: 'Before you look: web becomes 192.168.20.9. How far does its packet to 8.8.8.8 get?',
    },
    {
      net: exit(),
      goal: { from: 'web', to: 'internet' },
      broken: {
        'web.eth0.ip': '192.168.20.9',
        'web.route0.via': '192.168.20.1',
        'r1.lan.ip': '192.168.20.1',
      },
    },
    {
      net: net(
        [
          host('tienda', 0, 0, '145.14.8.5/24', '145.14.8.1'),
          router('r1', 1, 0, { lan: '145.14.8.1/24', wan: '62.4.0.2/30' }, [
            ['default', '62.4.0.1'],
          ]),
          internet('internet', 2, 0, { dns: '1.1.1.1/32', wan: '62.4.0.1/30' }, [
            ['145.14.8.0/24', '62.4.0.2'],
          ]),
        ],
        ['tienda-r1.lan', 'r1.wan-internet.wan'],
      ),
      fields: ['tienda.eth0.ip', 'tienda.route0.via', 'r1.lan.ip'],
      start: {
        'tienda.eth0.ip': '172.20.0.5',
        'tienda.route0.via': '172.20.0.1',
        'r1.lan.ip': '172.20.0.1',
      },
      goals: reach('tienda>internet'),
    },
  ),
  unit(
    'net-exit',
    6,
    {
      title: 'La salida a internet',
      goal: 'Dale a leo su puerta de enlace y a r1 su ruta de salida para que la oficina llegue a internet.',
      theory: {
        what: 'Para salir a internet la red entera apunta hacia fuera: cada máquina a su router y el router, con su ruta por defecto, a la dirección del proveedor en el cable de salida.',
        how: [
          'máquina: puerta = su router',
          'router:  default via 80.10.0.1    # el proveedor, su vecino',
          '# 8.8.8.8 no es de ninguna red conocida -> default',
        ],
        when: 'Es la configuración de cualquier router de oficina: una ruta por defecto y poco más.',
        problems:
          'Error típico: poner de siguiente salto el propio 8.8.8.8. No es vecino: «el siguiente salto 8.8.8.8 no está en ninguna de sus redes».',
      },
      example:
        'Antes de verlo: la ruta por defecto de r1 dice «via 8.8.8.8». ¿Sabe r1 por qué cable sacarlo?',
    },
    {
      title: 'The way out to the internet',
      goal: 'Give leo its gateway and r1 its exit route so the office reaches the internet.',
      theory: {
        what: 'To reach the internet the whole network points outwards: each machine at its router and the router, with its default route, at the provider’s address on the exit wire.',
        how: [
          'machine: gateway = its router',
          'router:  default via 80.10.0.1    # the provider, its neighbour',
          '# 8.8.8.8 is in no known network -> default',
        ],
        when: 'It is the setup of any office router: one default route and little else.',
        problems:
          'Typical mistake: using 8.8.8.8 itself as next hop. It is not a neighbour: “next hop 8.8.8.8 is not in any of its networks”.',
      },
      example:
        'Before you look: the default route on r1 says “via 8.8.8.8”. Does r1 know which wire to use?',
    },
    { net: exit(), goal: { from: 'web', to: 'internet' }, broken: { 'r1.route0.via': '8.8.8.8' } },
    {
      net: net(
        [
          host('ana', 0, 0, '130.20.1.10/24', '130.20.1.1'),
          host('leo', 0, 1, '130.20.1.11/24', '130.20.1.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, { lan: '130.20.1.1/24', wan: '91.7.7.6/30' }, [
            ['default', '91.7.7.5'],
          ]),
          internet('internet', 3, 0, { dns: '9.9.9.9/32', wan: '91.7.7.5/30' }, [
            ['130.20.1.0/24', '91.7.7.6'],
          ]),
        ],
        ['ana-sw1', 'leo-sw1', 'sw1-r1.lan', 'r1.wan-internet.wan'],
      ),
      fields: ['leo.route0.via', 'r1.route0.dest', 'r1.route0.via'],
      goals: reach('ana>internet', 'leo>internet'),
    },
  ),
  unit(
    'net-inbound',
    6,
    {
      title: 'Que internet sepa volver',
      goal: 'Internet solo tiene sitio para una ruta hacia vosotros y tenéis dos redes. Escribe la que cubre las dos.',
      theory: {
        what: 'Internet también es un router con su tabla: solo devuelve la respuesta si tiene una ruta hacia tu red, con tu router como siguiente salto.',
        how: [
          'tu red: 163.5.20.0/24     tu router, por fuera: 80.10.0.2',
          'en internet:',
          '163.5.20.0/24  via 80.10.0.2',
          '# dos mitades seguidas caben en una ruta: .0/25 + .128/25 = .0/24',
        ],
        when: 'Cuando contratas un rango público, el proveedor apunta esa ruta hacia ti; sin ella sales, pero nada vuelve.',
        problems:
          'Error típico: apuntar la ruta a media red. Unas máquinas contestan y otras no: «vuelta: internet no tiene ruta hacia 163.5.20.200».',
      },
      example:
        'Antes de verlo: la ruta de internet apunta a 163.5.21.0/24 por error. ¿Qué viaje falla?',
    },
    {
      title: 'Making the internet find its way back',
      goal: 'The internet has room for one route towards you and you have two networks. Write the one that covers both.',
      theory: {
        what: 'The internet is a router with a table too: it only returns the reply if it has a route to your network, with your router as next hop.',
        how: [
          'your network: 163.5.20.0/24   your router, outside: 80.10.0.2',
          'on the internet:',
          '163.5.20.0/24  via 80.10.0.2',
          '# two adjacent halves fit in one route: .0/25 + .128/25 = .0/24',
        ],
        when: 'When you rent a public range, the provider points that route at you; without it you get out, but nothing comes back.',
        problems:
          'Typical mistake: pointing the route at half the network. Some machines answer and others do not: “back: internet has no route to 163.5.20.200”.',
      },
      example:
        'Before you look: the internet route points at 163.5.21.0/24 by mistake. Which trip fails?',
    },
    {
      net: exit(),
      goal: { from: 'web', to: 'internet' },
      broken: { 'internet.route0.dest': '163.5.21.0/24' },
    },
    {
      net: net(
        [
          host('a', 0, 0, '150.10.4.10/25', '150.10.4.1'),
          host('b', 0, 1, '150.10.4.200/25', '150.10.4.129'),
          router('r1', 1, 0, { a: '150.10.4.1/25', b: '150.10.4.129/25', wan: '77.1.1.2/30' }, [
            ['default', '77.1.1.1'],
          ]),
          internet('internet', 2, 0, { dns: '8.8.4.4/32', wan: '77.1.1.1/30' }, [
            ['150.10.4.0/24', '77.1.1.2'],
          ]),
        ],
        ['a-r1.a', 'b-r1.b', 'r1.wan-internet.wan'],
      ),
      fields: ['internet.route0.dest', 'internet.route0.via'],
      goals: reach('a>internet', 'b>internet'),
    },
  ),
  boss(
    'net-boss-demo',
    6,
    480,
    {
      title: 'La demo sale en directo',
      goal: 'Saca la oficina a internet antes de que empiece el directo.',
      story:
        'En veinte minutos enseñáis Peer4U en streaming desde la oficina, y el portátil de la demo no sale a internet. El proveedor jura que su lado está bien… casi.',
      tasks: [
        'Que demo y camara salgan a internet',
        'La oficina tiene el rango público 141.95.6.0/24',
        'r1 necesita su ruta por defecto',
        'Revisa la ruta que internet tiene hacia vosotros',
      ],
    },
    {
      title: 'The demo goes live',
      goal: 'Get the office onto the internet before the stream starts.',
      story:
        'In twenty minutes you show Peer4U live from the office, and the demo laptop cannot reach the internet. The provider swears their side is fine… almost.',
      tasks: [
        'demo and camara must reach the internet',
        'The office owns the public range 141.95.6.0/24',
        'r1 needs its default route',
        'Check the route the internet has towards you',
      ],
    },
    {
      net: net(
        [
          host('demo', 0, 0, '141.95.6.10/24', '141.95.6.1'),
          host('camara', 0, 1, '141.95.6.11/24', '141.95.6.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, { lan: '141.95.6.1/24', wan: '185.3.3.2/30' }, [
            ['default', '185.3.3.1'],
          ]),
          internet('internet', 3, 0, { dns: '8.8.8.8/32', wan: '185.3.3.1/30' }, [
            ['141.95.6.0/24', '185.3.3.2'],
          ]),
        ],
        ['demo-sw1', 'camara-sw1', 'sw1-r1.lan', 'r1.wan-internet.wan'],
      ),
      fields: [
        'demo.eth0.ip',
        'camara.route0.via',
        'r1.route0.dest',
        'r1.route0.via',
        'internet.route0.dest',
      ],
      start: {
        'demo.eth0.ip': '192.168.6.10',
        'camara.route0.via': '141.95.6.254',
        'internet.route0.dest': '141.95.60.0/24',
      },
      goals: reach('demo>internet', 'camara>internet'),
    },
  ),
  boss(
    'net-final-intermediate',
    6,
    720,
    {
      title: 'La mudanza',
      goal: 'Monta la red de las dos plantas con un solo rango público y una sola salida.',
      story:
        'Peer4U crece y se muda a dos plantas. Te dan el rango público 138.40.12.0/24 para todo: desarrollo abajo, servidores arriba, un router por planta y una sola salida a internet.',
      tasks: [
        'Parte el rango: desarrollo en la mitad baja, servidores en la alta',
        'Numera r2: su enlace con r1 y su red de servidores',
        'Rutas de ida y de vuelta en los dos routers',
        'Internet devuelve todo el rango por r1',
        'dev llega a api, y los dos salen a internet',
      ],
    },
    {
      title: 'Moving day',
      goal: 'Build the network for both floors with a single public range and a single exit.',
      story:
        'Peer4U grows and moves to two floors. You get the public range 138.40.12.0/24 for everything: development downstairs, servers upstairs, one router per floor and a single way out.',
      tasks: [
        'Split the range: development in the lower half, servers in the upper',
        'Number r2: its link with r1 and its server network',
        'Routes out and back on both routers',
        'The internet returns the whole range through r1',
        'dev reaches api, and both reach the internet',
      ],
    },
    {
      net: net(
        [
          host('dev', 0, 0, '138.40.12.10/25', '138.40.12.1'),
          router('r1', 1, 0, { lan: '138.40.12.1/25', enl: '10.0.0.1/30', wan: '92.8.8.2/30' }, [
            ['default', '92.8.8.1'],
            ['138.40.12.128/25', '10.0.0.2'],
          ]),
          internet('internet', 2, 0, { dns: '8.8.8.8/32', wan: '92.8.8.1/30' }, [
            ['138.40.12.0/24', '92.8.8.2'],
          ]),
          router('r2', 1, 1, { enl: '10.0.0.2/30', lan: '138.40.12.129/25' }, [
            ['default', '10.0.0.1'],
          ]),
          host('api', 2, 1, '138.40.12.140/25', '138.40.12.129'),
        ],
        ['dev-r1.lan', 'r1.wan-internet.wan', 'r1.enl-r2.enl', 'r2.lan-api'],
      ),
      fields: [
        'r1.lan.mask',
        'r2.enl.ip',
        'r2.lan.ip',
        'r2.lan.mask',
        'r1.route1.dest',
        'r1.route1.via',
        'r2.route0.dest',
        'r2.route0.via',
        'internet.route0.dest',
      ],
      goals: reach('dev>api', 'dev>internet', 'api>internet'),
    },
    'final',
  ),
]
