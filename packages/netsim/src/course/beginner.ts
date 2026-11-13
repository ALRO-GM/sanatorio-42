/**
 * Nivel principiante: direcciones y máscaras (las cuentas, con los 32 bits a
 * la vista), máquinas en la misma red y el primer router con su puerta de
 * enlace. Cada bloque acaba en un contrarreloj y el nivel, en «Tu primera
 * oficina». Las redes son propias del curso: no son las de NetPractice.
 */

import { host, net, router, sw } from './build.js'
import { bossIn, reach, twoLans, unitIn } from './make.js'
import type { Unit } from './types.js'

const unit = unitIn('beginner')
const boss = bossIn('beginner')

/** Dos máquinas unidas por un cable, para los ejemplos del bloque 2. */
const pair = (a: string, b: string) =>
  net([host('ana', 0, 0, a), host('leo', 1, 0, b)], ['ana-leo'])

export const BEGINNER: Unit[] = [
  // ── Bloque 1: direcciones y máscaras ─────────────────────────────────────
  unit(
    'net-octets',
    1,
    {
      title: 'Una dirección: cuatro números, 32 bits',
      goal: 'Saca la dirección de red de tres direcciones. Toca los bits para comprobar tu idea antes de escribir.',
      theory: {
        what: 'Una dirección IPv4 son 32 bits escritos como 4 números de 0 a 255 (octetos). La máscara dice cuántos bits, desde la izquierda, nombran la red; el resto nombra la máquina.',
        how: [
          '192.168.1.42 /24      # 24 bits de red, 8 de máquina',
          'red: 192.168.1.0      # los bits de máquina, a 0',
          '172.20.7.9 /16        # red: 172.20.0.0',
        ],
        when: 'Para saber si dos máquinas están en la misma red comparas su parte de red: es lo primero que miras cuando algo no conecta.',
        problems:
          'Error típico: creer que la red son siempre «los tres primeros números». Eso solo pasa con /24. Con /16, 172.20.7.9 está en la red 172.20.0.0.',
        whenNot: 'Un octeto no pasa de 255: 192.168.1.300 no es una dirección.',
      },
      example: 'Antes de verlo: con /24, ¿qué números de 10.42.7.99 nombran la red?',
    },
    {
      title: 'An address: four numbers, 32 bits',
      goal: 'Work out the network address of three addresses. Tap the bits to test your idea before you type.',
      theory: {
        what: 'An IPv4 address is 32 bits written as 4 numbers from 0 to 255 (octets). The mask says how many bits, from the left, name the network; the rest name the machine.',
        how: [
          '192.168.1.42 /24      # 24 network bits, 8 host bits',
          'network: 192.168.1.0  # host bits set to 0',
          '172.20.7.9 /16        # network: 172.20.0.0',
        ],
        when: 'To know whether two machines share a network you compare their network part: it is the first thing you check when something will not connect.',
        problems:
          'Typical mistake: thinking the network is always “the first three numbers”. That only holds for /24. With /16, 172.20.7.9 is in network 172.20.0.0.',
        whenNot: 'An octet never goes above 255: 192.168.1.300 is not an address.',
      },
      example: 'Before you look: with /24, which numbers of 10.42.7.99 name the network?',
    },
    { ip: '10.42.7.99', mask: '/24' },
    {
      calc: [
        { ip: '192.168.1.42', mask: '/24', ask: ['network'] },
        { ip: '172.20.7.9', mask: '/16', ask: ['network'] },
        { ip: '10.200.3.4', mask: '/8', ask: ['network'] },
      ],
    },
  ),
  unit(
    'net-mask',
    1,
    {
      title: 'La máscara, de dos maneras',
      goal: 'Pasa cada máscara a la otra forma de escribirla: de decimal a prefijo y de prefijo a decimal.',
      theory: {
        what: 'La máscara se escribe como prefijo (/24: 24 bits de red) o en decimal (255.255.255.0: esos mismos 24 unos). Dicen lo mismo.',
        how: [
          '/8   = 255.0.0.0',
          '/16  = 255.255.0.0',
          '/24  = 255.255.255.0',
          '/25  = 255.255.255.128   # un bit más: 128',
          '/26  = 255.255.255.192   # 128 + 64',
        ],
        when: 'Unas herramientas piden /24 y otras 255.255.255.0: al configurar una interfaz pasas de una a otra todo el rato.',
        problems:
          'Error típico: inventar máscaras como 255.255.255.100. Los unos van seguidos: en un octeto solo valen 0, 128, 192, 224, 240, 248, 252, 254 y 255.',
      },
      example: 'Antes de verlo: ¿cuántos unos seguidos tiene 255.255.255.192?',
    },
    {
      title: 'The mask, written two ways',
      goal: 'Turn each mask into its other notation: dotted decimal to prefix and prefix to dotted decimal.',
      theory: {
        what: 'A mask is written as a prefix (/24: 24 network bits) or in dotted decimal (255.255.255.0: those same 24 ones). They say the same thing.',
        how: [
          '/8   = 255.0.0.0',
          '/16  = 255.255.0.0',
          '/24  = 255.255.255.0',
          '/25  = 255.255.255.128   # one more bit: 128',
          '/26  = 255.255.255.192   # 128 + 64',
        ],
        when: 'Some tools want /24 and others 255.255.255.0: when you configure an interface you convert between them all the time.',
        problems:
          'Typical mistake: making up masks such as 255.255.255.100. The ones are contiguous: an octet can only be 0, 128, 192, 224, 240, 248, 252, 254 or 255.',
      },
      example: 'Before you look: how many ones in a row does 255.255.255.192 have?',
    },
    { ip: '192.168.5.77', mask: '255.255.255.192' },
    {
      calc: [
        { ip: '10.0.0.1', mask: '255.255.0.0', ask: ['prefix'] },
        { ip: '192.168.1.1', mask: '/25', ask: ['decimal'] },
        { ip: '172.16.4.1', mask: '255.255.255.192', ask: ['prefix'] },
        { ip: '10.9.9.9', mask: '/30', ask: ['decimal'] },
      ],
    },
  ),
  unit(
    'net-broadcast',
    1,
    {
      title: 'Red y broadcast',
      goal: 'De cada dirección, saca la de red y la de broadcast.',
      theory: {
        what: 'Cada red reserva dos direcciones: la de red (bits de máquina a 0) le da nombre, y la de broadcast (bits de máquina a 1) habla a todas a la vez.',
        how: [
          '192.168.1.42 /24',
          'red:       192.168.1.0',
          'broadcast: 192.168.1.255',
          '10.42.7.99 /16',
          'red: 10.42.0.0    broadcast: 10.42.255.255',
        ],
        when: 'Al repartir direcciones en una oficina o en un clúster, sabes cuáles no puedes dar a nadie.',
        problems:
          'Error típico: poner a una máquina la de red o la de broadcast. El paquete ni sale: «192.168.1.255 es la dirección de broadcast de su subred».',
      },
      example: 'Antes de verlo: en 172.16.30.5/16, ¿qué octetos se ponen a 255 en el broadcast?',
    },
    {
      title: 'Network and broadcast',
      goal: 'For each address, work out its network address and its broadcast address.',
      theory: {
        what: 'Every network reserves two addresses: the network address (host bits at 0) names it, and the broadcast address (host bits at 1) talks to everyone at once.',
        how: [
          '192.168.1.42 /24',
          'network:   192.168.1.0',
          'broadcast: 192.168.1.255',
          '10.42.7.99 /16',
          'network: 10.42.0.0    broadcast: 10.42.255.255',
        ],
        when: 'When you hand out addresses in an office or a cluster, you know which ones nobody can have.',
        problems:
          'Typical mistake: giving a machine the network or the broadcast address. The packet never leaves: “192.168.1.255 is the broadcast address of its subnet”.',
      },
      example: 'Before you look: in 172.16.30.5/16, which octets become 255 in the broadcast?',
    },
    { ip: '172.16.30.5', mask: '/16' },
    {
      calc: [
        { ip: '192.168.77.130', mask: '/24', ask: ['network', 'broadcast'] },
        { ip: '10.42.200.7', mask: '/16', ask: ['network', 'broadcast'] },
      ],
    },
  ),
  unit(
    'net-range',
    1,
    {
      title: 'El rango de máquinas',
      goal: 'De cada red, saca la primera dirección que se puede usar, la última y cuántas máquinas caben.',
      theory: {
        what: 'Entre la de red y la de broadcast están las direcciones que sí puedes dar: de red + 1 a broadcast − 1. Con h bits de máquina caben 2^h − 2.',
        how: [
          '192.168.1.0 /24      # 8 bits de máquina',
          'primera: 192.168.1.1',
          'última:  192.168.1.254',
          'caben:   2^8 - 2 = 254',
        ],
        when: 'Antes de montar una red cuentas si caben todas las máquinas, y reservas la primera o la última para el router.',
        problems: 'Error típico: contar 256 en un /24. Dos están reservadas: caben 254.',
      },
      example: 'Antes de verlo: en 10.1.2.3/24, ¿cuál es la última dirección que puedes dar?',
    },
    {
      title: 'The host range',
      goal: 'For each network, work out the first usable address, the last one and how many machines fit.',
      theory: {
        what: 'Between the network and the broadcast address are the ones you can hand out: network + 1 to broadcast − 1. With h host bits, 2^h − 2 fit.',
        how: [
          '192.168.1.0 /24      # 8 host bits',
          'first: 192.168.1.1',
          'last:  192.168.1.254',
          'fit:   2^8 - 2 = 254',
        ],
        when: 'Before building a network you count whether every machine fits, and you keep the first or the last one for the router.',
        problems: 'Typical mistake: counting 256 in a /24. Two are reserved: 254 fit.',
      },
      example: 'Before you look: in 10.1.2.3/24, what is the last address you can hand out?',
    },
    { ip: '10.1.2.3', mask: '/24' },
    {
      calc: [
        { ip: '192.168.50.9', mask: '/24', ask: ['first', 'last', 'hosts'] },
        { ip: '172.31.0.1', mask: '/16', ask: ['first', 'last', 'hosts'] },
      ],
    },
  ),
  unit(
    'net-cut',
    1,
    {
      title: 'Máscaras que cortan un octeto',
      goal: 'Dos direcciones con máscaras que no caen en el punto: saca su red, su broadcast y su rango.',
      theory: {
        what: 'Un prefijo que no es 8, 16 ni 24 corta un octeto por la mitad. Las redes van a saltos: con /26 quedan 6 bits de máquina, así que saltan de 64 en 64.',
        how: [
          '192.168.1.77 /26     # salto: 2^6 = 64',
          'redes: .0  .64  .128  .192',
          'red: 192.168.1.64    # 77 cae entre 64 y 127',
          'broadcast: 192.168.1.127',
          'máquinas: .65 a .126',
        ],
        when: 'Casi ninguna red de trabajo es un /24 exacto: los enlaces entre routers y las redes de servicio son más pequeñas.',
        problems:
          'Error típico: tratar un /26 como un /24 y dar .0 por red. 192.168.1.77/26 y 192.168.1.130/26 están en redes distintas.',
      },
      example: 'Antes de verlo: 192.168.1.77 con /26, ¿en qué salto de 64 cae?',
    },
    {
      title: 'Masks that cut an octet',
      goal: 'Two addresses whose masks do not land on a dot: work out their network, broadcast and range.',
      theory: {
        what: 'A prefix other than 8, 16 or 24 cuts an octet in the middle. Networks go in steps: /26 leaves 6 host bits, so they step by 64.',
        how: [
          '192.168.1.77 /26     # step: 2^6 = 64',
          'networks: .0  .64  .128  .192',
          'network: 192.168.1.64   # 77 sits between 64 and 127',
          'broadcast: 192.168.1.127',
          'hosts: .65 to .126',
        ],
        when: 'Hardly any working network is an exact /24: links between routers and service networks are smaller.',
        problems:
          'Typical mistake: treating a /26 like a /24 and answering .0 as the network. 192.168.1.77/26 and 192.168.1.130/26 are in different networks.',
      },
      example: 'Before you look: 192.168.1.77 with /26, which step of 64 does it fall in?',
    },
    { ip: '192.168.1.77', mask: '/26' },
    {
      calc: [
        { ip: '192.168.10.200', mask: '/26', ask: ['network', 'broadcast', 'first', 'last'] },
        { ip: '10.0.5.75', mask: '255.255.255.224', ask: ['network', 'broadcast', 'hosts'] },
      ],
    },
  ),
  boss(
    'net-boss-inventory',
    1,
    300,
    {
      title: 'El inventario de direcciones',
      goal: 'Documenta las tres redes antes de que se acabe el tiempo.',
      story:
        'Mañana se muda el equipo de plataforma y nadie apuntó qué red es cada una. Tienes tres direcciones sacadas de los servidores y cinco minutos antes de la reunión.',
      tasks: [
        'Saca red, broadcast y rango de cada dirección',
        'Ojo: cada una tiene una máscara distinta',
        'Los bits siguen ahí si los necesitas',
      ],
    },
    {
      title: 'The address inventory',
      goal: 'Document the three networks before time runs out.',
      story:
        'The platform team moves tomorrow and nobody wrote down which network is which. You have three addresses pulled from the servers and five minutes before the meeting.',
      tasks: [
        'Work out network, broadcast and range for each address',
        'Careful: each one has a different mask',
        'The bits are still there if you need them',
      ],
    },
    {
      calc: [
        { ip: '10.20.30.40', mask: '/24', ask: ['network', 'broadcast', 'first', 'last'] },
        { ip: '172.16.99.200', mask: '255.255.255.128', ask: ['network', 'broadcast', 'hosts'] },
        { ip: '192.168.4.14', mask: '/28', ask: ['network', 'broadcast', 'first', 'last'] },
      ],
    },
  ),

  // ── Bloque 2: la misma red ───────────────────────────────────────────────
  unit(
    'net-pair',
    2,
    {
      title: 'Dos máquinas en el mismo cable',
      goal: 'Dale a cache una dirección con la que api la alcance.',
      theory: {
        what: 'Dos máquinas unidas por un cable se hablan directamente si cada una ve a la otra dentro de su propia red: misma parte de red, distinta parte de máquina.',
        how: [
          'ana: 192.168.1.10 /24',
          'leo: 192.168.1.20 /24    # misma red: 192.168.1.0',
          'ana -> leo               # entrega directa',
          'leo -> ana               # la respuesta vuelve igual',
        ],
        when: 'Es el caso más simple y lo primero que compruebas: ¿las dos están en la misma red?',
        problems:
          'Error típico: dar a la segunda una IP de otra red. El paquete muere en el origen: «ana no tiene ruta hacia 192.168.2.20».',
        whenNot: 'Nunca la misma IP en las dos: una dirección repetida no llega a ningún sitio.',
      },
      example: 'Antes de verlo: si leo tuviera 192.168.2.20, ¿dónde moriría el paquete de ana?',
    },
    {
      title: 'Two machines on the same wire',
      goal: 'Give cache an address that lets api reach it.',
      theory: {
        what: 'Two machines joined by a wire talk directly if each sees the other inside its own network: same network part, different host part.',
        how: [
          'ana: 192.168.1.10 /24',
          'leo: 192.168.1.20 /24    # same network: 192.168.1.0',
          'ana -> leo               # delivered directly',
          'leo -> ana               # the reply comes back the same way',
        ],
        when: 'It is the simplest case and the first thing you check: are both in the same network?',
        problems:
          'Typical mistake: giving the second one an IP from another network. The packet dies at the source: “ana has no route to 192.168.2.20”.',
        whenNot: 'Never the same IP on both: a duplicated address reaches nowhere.',
      },
      example: 'Before you look: if leo had 192.168.2.20, where would the packet from ana die?',
    },
    {
      net: pair('192.168.1.10/24', '192.168.1.20/24'),
      goal: { from: 'ana', to: 'leo' },
      broken: { 'leo.eth0.ip': '192.168.2.20' },
    },
    {
      net: net(
        [host('api', 0, 0, '10.0.5.1/24'), host('cache', 1, 0, '10.0.5.2/24')],
        ['api-cache'],
      ),
      fields: ['cache.eth0.ip'],
      goals: reach('api>cache'),
    },
  ),
  unit(
    'net-switch',
    2,
    {
      title: 'El switch',
      goal: 'Numera worker y db para que las tres máquinas del switch se alcancen.',
      theory: {
        what: 'Un switch une varias máquinas en una misma red. No tiene IP ni decide nada: pasa lo que le llega. Todo lo que cuelga de él comparte red.',
        how: [
          'ana       10.0.0.11/24 -+',
          'leo       10.0.0.12/24 -+- sw1',
          'impresora 10.0.0.50/24 -+',
          '# tres máquinas, una sola red: 10.0.0.0/24',
        ],
        when: 'Es lo que hay en cada fila del clúster y en cada rack: muchas máquinas, una red.',
        problems:
          'Error típico: buscar la IP del switch o ponerlo de puerta de enlace. No tiene. Si una máquina del switch no contesta, mira su IP y su máscara.',
      },
      example:
        'Antes de verlo: de ana a la impresora, ¿por cuántos aparatos con IP pasa el paquete?',
    },
    {
      title: 'The switch',
      goal: 'Number worker and db so the three machines on the switch reach each other.',
      theory: {
        what: 'A switch joins several machines into one network. It has no IP and decides nothing: it passes on what it receives. Everything hanging from it shares a network.',
        how: [
          'ana       10.0.0.11/24 -+',
          'leo       10.0.0.12/24 -+- sw1',
          'impresora 10.0.0.50/24 -+',
          '# three machines, one network: 10.0.0.0/24',
        ],
        when: 'It is what sits in every cluster row and every rack: many machines, one network.',
        problems:
          'Typical mistake: looking for the switch IP or using it as a gateway. It has none. If a machine on the switch does not answer, check its IP and mask.',
      },
      example:
        'Before you look: from ana to the printer, how many devices with an IP does the packet cross?',
    },
    {
      net: net(
        [
          host('ana', 0, 0, '10.0.0.11/24'),
          host('leo', 0, 1, '10.0.0.12/24'),
          sw('sw1', 1, 0),
          host('impresora', 2, 0, '10.0.0.50/24'),
        ],
        ['ana-sw1', 'leo-sw1', 'sw1-impresora'],
      ),
      goal: { from: 'ana', to: 'impresora' },
    },
    {
      net: net(
        [
          host('web', 0, 0, '172.16.3.10/24'),
          host('worker', 0, 1, '172.16.3.11/24'),
          sw('sw1', 1, 0),
          host('db', 2, 0, '172.16.3.12/24'),
        ],
        ['web-sw1', 'worker-sw1', 'sw1-db'],
      ),
      fields: ['worker.eth0.ip', 'db.eth0.ip'],
      goals: reach('web>worker', 'web>db', 'worker>db'),
    },
  ),
  unit(
    'net-range-pick',
    2,
    {
      title: 'Elegir una dirección del rango',
      goal: 'Añade logs y alertas a la red de metrics. Calcula su rango antes de elegir.',
      theory: {
        what: 'Con una máscara que corta el octeto no vale cualquier número parecido: la dirección nueva tiene que caer en el mismo salto que las demás.',
        how: [
          'api: 172.16.8.70 /26',
          'red: 172.16.8.64         # máquinas: .65 a .126',
          'vale:    172.16.8.100',
          'no vale: 172.16.8.130    # eso ya es la red .128',
        ],
        when: 'Cuando añades una máquina a una red que ya existe, calculas el rango antes de elegir.',
        problems:
          'Error típico: fiarse de los tres primeros números. Con 172.16.8.130/26, la nueva dice «no tiene ruta hacia 172.16.8.70»: para ella es otra red.',
      },
      example:
        'Antes de verlo: api es 172.16.8.70/26. ¿La alcanza una máquina con 172.16.8.130/26?',
    },
    {
      title: 'Picking an address from the range',
      goal: 'Add logs and alertas to the metrics network. Work out its range before you choose.',
      theory: {
        what: 'With a mask that cuts the octet, a similar-looking number is not enough: the new address has to fall in the same step as the others.',
        how: [
          'api: 172.16.8.70 /26',
          'network: 172.16.8.64     # hosts: .65 to .126',
          'fine:    172.16.8.100',
          'wrong:   172.16.8.130    # that is already network .128',
        ],
        when: 'When you add a machine to an existing network, you work out the range before choosing.',
        problems:
          'Typical mistake: trusting the first three numbers. With 172.16.8.130/26 the new machine says “no route to 172.16.8.70”: to it, that is another network.',
      },
      example:
        'Before you look: api is 172.16.8.70/26. Can a machine with 172.16.8.130/26 reach it?',
    },
    {
      net: net(
        [host('cola', 0, 0, '172.16.8.100/26'), host('api', 1, 0, '172.16.8.70/26')],
        ['cola-api'],
      ),
      goal: { from: 'cola', to: 'api' },
      broken: { 'cola.eth0.ip': '172.16.8.130' },
    },
    {
      net: net(
        [
          host('logs', 0, 0, '192.168.20.200 255.255.255.224'),
          host('alertas', 0, 1, '192.168.20.210 255.255.255.224'),
          sw('sw1', 1, 0),
          host('metrics', 2, 0, '192.168.20.196 255.255.255.224'),
        ],
        ['logs-sw1', 'alertas-sw1', 'sw1-metrics'],
      ),
      fields: ['logs.eth0.ip', 'alertas.eth0.ip', 'alertas.eth0.mask'],
      goals: reach('logs>metrics', 'alertas>metrics'),
    },
  ),
  unit(
    'net-edges',
    2,
    {
      title: 'Las dos que no se dan',
      goal: 'En la red de primario solo queda una dirección libre. Dásela a replica.',
      theory: {
        what: 'En cada red, la primera dirección (la de red) y la última (la de broadcast) no son de nadie. En una red /30 solo quedan 2 para máquinas.',
        how: [
          '10.0.0.4 /30',
          'red: 10.0.0.4      broadcast: 10.0.0.7',
          'máquinas: 10.0.0.5 y 10.0.0.6',
        ],
        when: 'Un cable entre dos equipos se suele numerar con un /30: gasta 4 direcciones y no sobra ninguna.',
        problems:
          'Error típico: usar la .4 o la .7. El paquete no sale: «10.0.0.7 es la dirección de broadcast de su subred».',
      },
      example: 'Antes de verlo: en 10.0.0.4/30, ¿puede una máquina llamarse 10.0.0.7?',
    },
    {
      title: 'The two you never hand out',
      goal: 'The primario network has only one free address left. Give it to replica.',
      theory: {
        what: 'In every network, the first address (network) and the last (broadcast) belong to nobody. A /30 network leaves only 2 for machines.',
        how: [
          '10.0.0.4 /30',
          'network: 10.0.0.4   broadcast: 10.0.0.7',
          'hosts: 10.0.0.5 and 10.0.0.6',
        ],
        when: 'A wire between two devices is usually numbered with a /30: it uses 4 addresses and wastes none.',
        problems:
          'Typical mistake: using .4 or .7. The packet never leaves: “10.0.0.7 is the broadcast address of its subnet”.',
      },
      example: 'Before you look: in 10.0.0.4/30, can a machine be 10.0.0.7?',
    },
    {
      net: pair('10.0.0.5/30', '10.0.0.6/30'),
      goal: { from: 'ana', to: 'leo' },
      broken: { 'leo.eth0.ip': '10.0.0.7' },
    },
    {
      net: net(
        [host('primario', 0, 0, '192.168.9.201/30'), host('replica', 1, 0, '192.168.9.202/30')],
        ['primario-replica'],
      ),
      fields: ['replica.eth0.ip'],
      goals: reach('primario>replica'),
    },
  ),
  unit(
    'net-special',
    2,
    {
      title: 'Loopback y otros rangos reservados',
      goal: 'Alguien numeró ci y runner con direcciones de loopback. Pásalas a la red de repo.',
      theory: {
        what: 'Hay rangos enteros que no sirven para una red: 127.x.x.x es el loopback (la máquina hablando consigo misma), 0.x no es de nadie y de 224 en adelante es multicast o reservado.',
        how: [
          '127.0.0.1       # localhost: nunca sale por el cable',
          '0.0.0.0         # «cualquiera», no una máquina',
          '224.0.0.0 +     # multicast y reservadas',
          '10.x  172.16-31.x  192.168.x   # privadas: para tu red',
        ],
        when: 'Para tu red eliges un rango privado; los demás tienen dueño o un uso especial.',
        problems:
          'Error típico: numerar una red con 127.0.0.x porque «localhost funciona». El paquete no sale: «127.0.0.5 es de loopback».',
      },
      example: 'Antes de verlo: ana tiene 127.0.0.5 y leo 127.0.0.6. ¿Se alcanzan?',
    },
    {
      title: 'Loopback and other reserved ranges',
      goal: 'Someone numbered ci and runner with loopback addresses. Move them into the repo network.',
      theory: {
        what: 'Whole ranges are useless for a network: 127.x.x.x is loopback (a machine talking to itself), 0.x belongs to nobody and 224 upwards is multicast or reserved.',
        how: [
          '127.0.0.1       # localhost: never leaves on the wire',
          '0.0.0.0         # “any”, not a machine',
          '224.0.0.0 +     # multicast and reserved',
          '10.x  172.16-31.x  192.168.x   # private: for your network',
        ],
        when: 'For your network you pick a private range; the others have an owner or a special use.',
        problems:
          'Typical mistake: numbering a network with 127.0.0.x because “localhost works”. The packet never leaves: “127.0.0.5 is a loopback address”.',
      },
      example: 'Before you look: ana has 127.0.0.5 and leo 127.0.0.6. Can they reach each other?',
    },
    {
      net: pair('10.0.0.5/24', '10.0.0.6/24'),
      goal: { from: 'ana', to: 'leo' },
      broken: { 'ana.eth0.ip': '127.0.0.5', 'leo.eth0.ip': '127.0.0.6' },
    },
    {
      net: net(
        [
          host('ci', 0, 0, '192.168.42.10/24'),
          host('runner', 0, 1, '192.168.42.11/24'),
          sw('sw1', 1, 0),
          host('repo', 2, 0, '192.168.42.5/24'),
        ],
        ['ci-sw1', 'runner-sw1', 'sw1-repo'],
      ),
      fields: ['ci.eth0.ip', 'runner.eth0.ip'],
      start: { 'ci.eth0.ip': '127.0.0.10', 'runner.eth0.ip': '127.0.0.11' },
      goals: reach('ci>repo', 'runner>repo', 'ci>runner'),
    },
  ),
  boss(
    'net-boss-printer',
    2,
    300,
    {
      title: 'La impresora de la sala',
      goal: 'Arregla los tres portátiles antes de la demo.',
      story:
        'Demo en diez minutos y nadie imprime las acreditaciones. Alguien «arregló» la red de la sala a mano y ahora cada portátil tiene un fallo distinto.',
      tasks: [
        'Que ana, leo y marta alcancen a la impresora',
        'La impresora está bien: no se toca',
        'Cada portátil falla por un motivo diferente',
      ],
    },
    {
      title: 'The meeting-room printer',
      goal: 'Fix the three laptops before the demo.',
      story:
        'Demo in ten minutes and nobody can print the badges. Someone “fixed” the room network by hand and now every laptop has a different fault.',
      tasks: [
        'ana, leo and marta must reach the printer',
        'The printer is fine: leave it alone',
        'Each laptop fails for a different reason',
      ],
    },
    {
      net: net(
        [
          host('ana', 0, 0, '192.168.30.66/27'),
          host('leo', 0, 1, '192.168.30.67/27'),
          host('marta', 0, 2, '192.168.30.70 255.255.255.224'),
          sw('sw1', 1, 1),
          host('impresora', 2, 1, '192.168.30.94/27'),
        ],
        ['ana-sw1', 'leo-sw1', 'marta-sw1', 'sw1-impresora'],
      ),
      fields: ['ana.eth0.ip', 'leo.eth0.ip', 'marta.eth0.mask'],
      start: {
        'ana.eth0.ip': '192.168.30.95',
        'leo.eth0.ip': '192.168.30.94',
        'marta.eth0.mask': '255.255.255.252',
      },
      goals: reach('ana>impresora', 'leo>impresora', 'marta>impresora'),
    },
  ),

  // ── Bloque 3: el router ──────────────────────────────────────────────────
  unit(
    'net-router',
    3,
    {
      title: 'El router: un pie en cada red',
      goal: 'Numera las dos interfaces de r1. Las máquinas ya dicen cuál es su puerta de enlace.',
      theory: {
        what: 'Un router une redes distintas. Tiene una interfaz en cada una, con una dirección de esa red, y pasa los paquetes de una a otra.',
        how: [
          'red A: 10.0.1.0/24     router: 10.0.1.1',
          'red B: 10.0.2.0/24     router: 10.0.2.1',
          '# cada interfaz, una dirección de SU red',
        ],
        when: 'En cuanto hay dos redes (oficina y servidores, staging y producción) hay un router entre ellas.',
        problems:
          'Error típico: dar a las dos interfaces direcciones de la misma red. El router avisa: «sus interfaces a y b están en subredes que se pisan».',
        whenNot: 'Dentro de una misma red no hace falta router: basta el switch.',
      },
      example: 'Antes de verlo: si la interfaz b de r1 fuera 10.0.1.2, ¿llegaría ana a db?',
    },
    {
      title: 'The router: one foot in each network',
      goal: 'Number both interfaces of r1. The machines already say which gateway they use.',
      theory: {
        what: 'A router joins different networks. It has one interface in each, with an address from that network, and passes packets from one to the other.',
        how: [
          'network A: 10.0.1.0/24   router: 10.0.1.1',
          'network B: 10.0.2.0/24   router: 10.0.2.1',
          '# each interface gets an address from ITS network',
        ],
        when: 'As soon as there are two networks (office and servers, staging and production) there is a router between them.',
        problems:
          'Typical mistake: giving both interfaces addresses from the same network. The router complains: “its interfaces a and b are in overlapping subnets”.',
        whenNot: 'Inside a single network you need no router: the switch is enough.',
      },
      example: 'Before you look: if interface b of r1 were 10.0.1.2, would ana reach db?',
    },
    { net: twoLans(), goal: { from: 'ana', to: 'db' }, broken: { 'r1.b.ip': '10.0.1.2' } },
    {
      net: net(
        [
          host('front', 0, 0, '192.168.1.20/24', '192.168.1.1'),
          router('r1', 1, 0, { lan: '192.168.1.1/24', srv: '192.168.2.1/24' }),
          host('back', 2, 0, '192.168.2.20/24', '192.168.2.1'),
        ],
        ['front-r1.lan', 'r1.srv-back'],
      ),
      fields: ['r1.lan.ip', 'r1.srv.ip'],
      goals: reach('front>back'),
    },
  ),
  unit(
    'net-gateway',
    3,
    {
      title: 'La puerta de enlace',
      goal: 'Dale a dev y a runner su puerta de enlace para que se alcancen a través de r1.',
      theory: {
        what: 'La puerta de enlace es la dirección del router en tu propia red: adonde mandas todo lo que no es de tu red. Sin ella, una máquina solo habla con sus vecinas.',
        how: [
          'ana: 10.0.1.10/24      puerta: 10.0.1.1',
          'destino 10.0.1.20  ->  vecina: directo',
          'destino 10.0.2.10  ->  no es de mi red: a 10.0.1.1',
        ],
        when: 'Es el tercer dato de cualquier máquina, tras la IP y la máscara: sin él no hay internet ni otras redes.',
        problems:
          'Error típico: poner de puerta la dirección del router en la otra red. La máquina dice «el siguiente salto 10.0.2.1 no está en ninguna de sus redes».',
      },
      example: 'Antes de verlo: ana pone de puerta 10.0.2.1, la otra cara de r1. ¿Sale el paquete?',
    },
    {
      title: 'The default gateway',
      goal: 'Give dev and runner their gateway so they reach each other through r1.',
      theory: {
        what: 'The gateway is the router address in your own network: where you send everything that is not in your network. Without it, a machine only talks to its neighbours.',
        how: [
          'ana: 10.0.1.10/24      gateway: 10.0.1.1',
          'destination 10.0.1.20  ->  neighbour: direct',
          'destination 10.0.2.10  ->  not my network: to 10.0.1.1',
        ],
        when: 'It is the third setting of any machine, after IP and mask: without it there is no internet and no other network.',
        problems:
          'Typical mistake: using the router address from the other network. The machine says “next hop 10.0.2.1 is not in any of its networks”.',
      },
      example:
        'Before you look: ana uses 10.0.2.1, the far side of r1, as gateway. Does the packet leave?',
    },
    { net: twoLans(), goal: { from: 'ana', to: 'db' }, broken: { 'ana.route0.via': '10.0.2.1' } },
    {
      net: net(
        [
          host('dev', 0, 0, '172.16.10.25/24', '172.16.10.254'),
          router('r1', 1, 0, { dev: '172.16.10.254/24', ci: '172.16.20.254/24' }),
          host('runner', 2, 0, '172.16.20.25/24', '172.16.20.254'),
        ],
        ['dev-r1.dev', 'r1.ci-runner'],
      ),
      fields: ['dev.route0.via', 'runner.route0.via'],
      goals: reach('dev>runner'),
    },
  ),
  unit(
    'net-roundtrip',
    3,
    {
      title: 'Ida y vuelta',
      goal: 'La pregunta de portatil llega a nas, pero la respuesta no vuelve. Arregla a nas.',
      theory: {
        what: 'Un ping son dos viajes: la pregunta va y la respuesta vuelve. Cada máquina decide por su cuenta, con su IP, su máscara y su puerta. Si falla la vuelta, tampoco hay conexión.',
        how: [
          'ida:    ana -> r1 -> db     # llega',
          'vuelta: db -> ?             # db sin puerta de enlace',
          '# la respuesta muere en db',
        ],
        when: 'Cuando algo «llega pero no contesta», el fallo suele estar en el destino: mira su máscara y su puerta.',
        problems:
          'Error típico: revisar solo la máquina que lanza el ping. Lee dónde muere: «vuelta: db no tiene ruta hacia 10.0.1.10».',
      },
      example:
        'Antes de verlo: db no tiene puerta de enlace. ¿Llega la pregunta de ana? ¿Y la respuesta?',
    },
    {
      title: 'There and back',
      goal: 'The request from portatil reaches nas, but the reply never returns. Fix nas.',
      theory: {
        what: 'A ping is two trips: the request goes and the reply comes back. Each machine decides on its own, with its IP, mask and gateway. If the way back fails, there is no connection either.',
        how: [
          'out:  ana -> r1 -> db     # arrives',
          'back: db -> ?             # db has no gateway',
          '# the reply dies at db',
        ],
        when: 'When something “arrives but never answers”, the fault is usually at the destination: check its mask and gateway.',
        problems:
          'Typical mistake: checking only the machine that sends the ping. Read where it dies: “back: db has no route to 10.0.1.10”.',
      },
      example:
        'Before you look: db has no gateway. Does the request from ana arrive? And the reply?',
    },
    { net: twoLans(), goal: { from: 'ana', to: 'db' }, broken: { 'db.route0.via': '' } },
    {
      net: net(
        [
          host('portatil', 0, 0, '10.10.1.5/24', '10.10.1.1'),
          router('r1', 1, 0, { a: '10.10.1.1/24', b: '10.10.2.1/24' }),
          host('nas', 2, 0, '10.10.2.5/24', '10.10.2.1'),
        ],
        ['portatil-r1.a', 'r1.b-nas'],
      ),
      fields: ['nas.eth0.mask', 'nas.route0.via'],
      start: { 'nas.eth0.mask': '255.255.0.0' },
      goals: reach('portatil>nas'),
    },
  ),
  unit(
    'net-lan',
    3,
    {
      title: 'Montar una red detrás del router',
      goal: 'El laboratorio cuelga de la interfaz lab de r1. Numera lab1 y lab2 enteras: IP, máscara y puerta.',
      theory: {
        what: 'Para colgar una red nueva de un router eliges su rango, das al router una dirección de ese rango y a cada máquina otra, con la misma máscara y el router de puerta.',
        how: [
          'router:    10.0.3.1/24',
          'máquina 1: 10.0.3.11/24    puerta 10.0.3.1',
          'máquina 2: 10.0.3.12/24    puerta 10.0.3.1',
        ],
        when: 'Es el trabajo entero de dar de alta una sala, un rack o un entorno nuevo.',
        problems:
          'Error típico: máscaras distintas en la misma red. Una ve a la otra como vecina y la otra no: la ida llega y la vuelta muere.',
      },
      example: 'Antes de verlo: de ana a m2, ¿cuántos saltos hay y cuál de ellos es directo?',
    },
    {
      title: 'Building a network behind the router',
      goal: 'The lab hangs from interface lab of r1. Number lab1 and lab2 completely: IP, mask and gateway.',
      theory: {
        what: 'To hang a new network from a router you pick its range, give the router one address from it and each machine another, with the same mask and the router as gateway.',
        how: [
          'router:    10.0.3.1/24',
          'machine 1: 10.0.3.11/24    gateway 10.0.3.1',
          'machine 2: 10.0.3.12/24    gateway 10.0.3.1',
        ],
        when: 'It is the whole job of bringing up a room, a rack or a new environment.',
        problems:
          'Typical mistake: different masks in the same network. One sees the other as a neighbour and the other does not: the request arrives and the reply dies.',
      },
      example: 'Before you look: from ana to m2, how many hops are there and which one is direct?',
    },
    {
      net: net(
        [
          host('ana', 0, 0, '10.0.1.10/24', '10.0.1.1'),
          router('r1', 1, 0, { a: '10.0.1.1/24', b: '10.0.3.1/24' }),
          sw('sw1', 2, 0),
          host('m1', 3, 0, '10.0.3.11/24', '10.0.3.1'),
          host('m2', 3, 1, '10.0.3.12/24', '10.0.3.1'),
        ],
        ['ana-r1.a', 'r1.b-sw1', 'sw1-m1', 'sw1-m2'],
      ),
      goal: { from: 'ana', to: 'm2' },
    },
    {
      net: net(
        [
          host('admin', 0, 0, '192.168.0.10/24', '192.168.0.1'),
          router('r1', 1, 0, { ofi: '192.168.0.1/24', lab: '192.168.7.129/25' }),
          sw('sw1', 2, 0),
          host('lab1', 3, 0, '192.168.7.130/25', '192.168.7.129'),
          host('lab2', 3, 1, '192.168.7.131/25', '192.168.7.129'),
        ],
        ['admin-r1.ofi', 'r1.lab-sw1', 'sw1-lab1', 'sw1-lab2'],
      ),
      fields: [
        'lab1.eth0.ip',
        'lab1.eth0.mask',
        'lab1.route0.via',
        'lab2.eth0.ip',
        'lab2.eth0.mask',
        'lab2.route0.via',
      ],
      goals: reach('admin>lab1', 'admin>lab2', 'lab1>lab2'),
    },
  ),
  boss(
    'net-boss-staging',
    3,
    360,
    {
      title: 'El staging no llega a la base de datos',
      goal: 'Devuelve la conexión entre la red de aplicaciones y la de datos.',
      story:
        'Tras mover la base de datos a su propia red, el staging da «connection timed out». El despliegue de las cinco depende de ti.',
      tasks: [
        'Que staging alcance a db, y db conteste',
        'Que el runner de CI también llegue a db',
        'El router está bien cableado, pero no bien numerado',
      ],
    },
    {
      title: 'Staging cannot reach the database',
      goal: 'Bring back the connection between the app network and the data network.',
      story:
        'After the database moved to its own network, staging says “connection timed out”. The five o’clock deploy depends on you.',
      tasks: [
        'staging must reach db, and db must answer',
        'The CI runner must reach db too',
        'The router is wired correctly, but not numbered correctly',
      ],
    },
    {
      net: net(
        [
          host('staging', 0, 0, '10.50.1.10/24', '10.50.1.1'),
          host('runner', 0, 1, '10.50.1.11/24', '10.50.1.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, { app: '10.50.1.1/24', data: '10.50.2.1/24' }),
          host('db', 3, 0, '10.50.2.10/24', '10.50.2.1'),
        ],
        ['staging-sw1', 'runner-sw1', 'sw1-r1.app', 'r1.data-db'],
      ),
      fields: ['runner.route0.via', 'r1.data.ip', 'db.route0.via'],
      start: {
        'runner.route0.via': '10.50.2.1',
        'r1.data.ip': '10.50.1.2',
        'db.route0.via': '10.50.2.254',
      },
      goals: reach('staging>db', 'runner>db'),
    },
  ),
  boss(
    'net-final-beginner',
    3,
    600,
    {
      title: 'Tu primera oficina',
      goal: 'Numera la oficina entera: todo tiene que alcanzar al servidor de git.',
      story:
        'Peer4U estrena oficina: una sala de desarrollo, un armario de servidores y la wifi de invitados, todo colgado de un router. El cableado está; faltan los números.',
      tasks: [
        'Numera las tres interfaces de r1',
        'Dale a leo su IP y su puerta de enlace',
        'Dale a movil su puerta de enlace',
        'ana, leo y movil tienen que alcanzar a git',
      ],
    },
    {
      title: 'Your first office',
      goal: 'Number the whole office: everything must reach the git server.',
      story:
        'Peer4U opens an office: a dev room, a server cabinet and the guest wifi, all hanging from one router. The wiring is done; the numbers are missing.',
      tasks: [
        'Number the three interfaces of r1',
        'Give leo an IP and a gateway',
        'Give movil its gateway',
        'ana, leo and movil must reach git',
      ],
    },
    {
      net: net(
        [
          host('ana', 0, 0, '10.1.0.10/24', '10.1.0.1'),
          host('leo', 0, 1, '10.1.0.11/24', '10.1.0.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, {
            dev: '10.1.0.1/24',
            srv: '10.1.1.1/24',
            inv: '10.1.2.65 255.255.255.192',
          }),
          host('git', 3, 0, '10.1.1.10/24', '10.1.1.1'),
          host('movil', 2, 1, '10.1.2.100 255.255.255.192', '10.1.2.65'),
        ],
        ['ana-sw1', 'leo-sw1', 'sw1-r1.dev', 'r1.srv-git', 'r1.inv-movil'],
      ),
      fields: [
        'r1.dev.ip',
        'r1.srv.ip',
        'r1.inv.ip',
        'leo.eth0.ip',
        'leo.route0.via',
        'movil.route0.via',
      ],
      goals: reach('ana>git', 'leo>git', 'movil>git'),
    },
    'final',
  ),
]
