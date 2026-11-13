/**
 * Nivel avanzado: diagnosticar redes que ya están numeradas (leer dónde muere
 * el paquete), diseñar con subredes de tamaños distintos y rutas que resumen,
 * y redes con más de un camino (bucles, dos salidas, un servidor visible
 * desde fuera). Acaba en «La red entera de Peer4U».
 */

import { host, internet, net, router, sw } from './build.js'
import { bossIn, chain, exit, reach, twoLans, unitIn } from './make.js'
import type { Unit } from './types.js'

const unit = unitIn('advanced')
const boss = bossIn('advanced')

/** Tres routers en fila con una red en cada extremo: `ana — r1 — r2 — r3 — db`. */
const row = () =>
  net(
    [
      host('ana', 0, 0, '10.0.1.10/24', '10.0.1.1'),
      router('r1', 1, 0, { lan: '10.0.1.1/24', e: '10.0.0.1/30' }, [['default', '10.0.0.2']]),
      router('r2', 2, 0, { w: '10.0.0.2/30', e: '10.0.0.5/30' }, [
        ['10.0.1.0/24', '10.0.0.1'],
        ['10.0.3.0/24', '10.0.0.6'],
      ]),
      router('r3', 3, 0, { w: '10.0.0.6/30', lan: '10.0.3.1/24' }, [['default', '10.0.0.5']]),
      host('db', 4, 0, '10.0.3.10/24', '10.0.3.1'),
    ],
    ['ana-r1.lan', 'r1.e-r2.w', 'r2.e-r3.w', 'r3.lan-db'],
  )

export const ADVANCED: Unit[] = [
  // ── Bloque 7: diagnóstico ────────────────────────────────────────────────
  unit(
    'net-diag-mask',
    7,
    {
      title: 'Diagnóstico: la máscara que miente',
      goal: 'La red está numerada y una sola máscara está mal. Lee dónde muere el paquete y corrígela.',
      theory: {
        what: 'Una máscara demasiado ancha hace creer a una máquina que el destino es vecino suyo. Lo busca en su cable, nadie contesta y no usa la puerta de enlace.',
        how: [
          'ana: 10.0.1.10 /16       # debería ser /24',
          'destino 10.0.2.10  ->  «es de mi red» (10.0.0.0/16)',
          '# lo busca en su cable: no está',
        ],
        when: 'De guardia: una máquina llega a sus vecinas pero no a otras redes.',
        problems:
          'Síntoma literal: «según su máscara, 10.0.2.10 es vecina suya, pero está en otra red (db)».',
      },
      example: 'Antes de verlo: ana pasa a /16. ¿Le pasa el paquete a r1 o lo busca en su cable?',
    },
    {
      title: 'Diagnosis: the mask that lies',
      goal: 'The network is numbered and a single mask is wrong. Read where the packet dies and fix it.',
      theory: {
        what: 'A mask that is too wide makes a machine believe the destination is its neighbour. It looks on its own wire, nobody answers and it never uses the gateway.',
        how: [
          'ana: 10.0.1.10 /16       # should be /24',
          'destination 10.0.2.10  ->  “my network” (10.0.0.0/16)',
          '# it looks on its own wire: not there',
        ],
        when: 'On call: a machine reaches its neighbours but no other network.',
        problems:
          'Literal symptom: “by its mask, 10.0.2.10 is a neighbour, but it lives in another network (db)”.',
      },
      example:
        'Before you look: ana becomes /16. Does it hand the packet to r1 or look on its own wire?',
    },
    { net: twoLans(), goal: { from: 'ana', to: 'db' }, broken: { 'ana.eth0.mask': '/16' } },
    {
      net: net(
        [
          host('ana', 0, 0, '10.30.1.10 255.255.255.0', '10.30.1.1'),
          host('leo', 0, 1, '10.30.1.11 255.255.255.0', '10.30.1.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, { a: '10.30.1.1/24', b: '10.30.2.1/24' }),
          sw('sw2', 3, 0),
          host('db', 4, 0, '10.30.2.10 255.255.255.0', '10.30.2.1'),
          host('cache', 4, 1, '10.30.2.11 255.255.255.0', '10.30.2.1'),
        ],
        ['ana-sw1', 'leo-sw1', 'sw1-r1.a', 'r1.b-sw2', 'sw2-db', 'sw2-cache'],
      ),
      fields: ['ana.eth0.mask', 'leo.eth0.mask', 'db.eth0.mask', 'cache.eth0.mask'],
      start: {
        'ana.eth0.mask': '255.255.255.0',
        'leo.eth0.mask': '255.255.0.0',
        'db.eth0.mask': '255.255.255.0',
        'cache.eth0.mask': '255.255.255.0',
      },
      goals: reach('ana>db', 'leo>db', 'leo>cache'),
    },
  ),
  unit(
    'net-diag-dup',
    7,
    {
      title: 'Diagnóstico: direcciones repetidas',
      goal: 'Han clonado la base de datos dos veces sin cambiarle la dirección. Deja cada máquina con la suya.',
      theory: {
        what: 'Dos interfaces con la misma dirección se quitan los paquetes entre sí. Aquí, una dirección repetida no llega a ningún sitio.',
        how: [
          'db:     10.0.2.10/24',
          'backup: 10.0.2.10/24     # copiada de db',
          '# ninguna de las dos es alcanzable',
        ],
        when: 'Pasa al clonar una máquina: el clon arranca con la dirección del original.',
        problems:
          'Síntoma literal: «10.0.2.10 está repetida: también la tiene backup». Se arregla cambiando una, no la máscara.',
      },
      example:
        'Antes de verlo: db toma por error la dirección de r1 en su red. ¿Quién deja de funcionar?',
    },
    {
      title: 'Diagnosis: duplicated addresses',
      goal: 'The database was cloned twice without changing its address. Leave each machine with its own.',
      theory: {
        what: 'Two interfaces with the same address steal each other’s packets. Here, a duplicated address reaches nowhere.',
        how: [
          'db:     10.0.2.10/24',
          'backup: 10.0.2.10/24     # copied from db',
          '# neither can be reached',
        ],
        when: 'It happens when you clone a machine: the clone boots with the original’s address.',
        problems:
          'Literal symptom: “10.0.2.10 is duplicated: backup has it too”. You fix it by changing one of them, not the mask.',
      },
      example:
        'Before you look: db takes r1’s address in its network by mistake. Who stops working?',
    },
    { net: twoLans(), goal: { from: 'ana', to: 'db' }, broken: { 'db.eth0.ip': '10.0.2.1' } },
    {
      net: net(
        [
          host('admin', 0, 0, '10.77.1.5/24', '10.77.1.1'),
          router('r1', 1, 0, { a: '10.77.1.1/24', b: '10.77.2.1/24' }),
          sw('sw1', 2, 0),
          host('db', 3, 0, '10.77.2.10/24', '10.77.2.1'),
          host('replica1', 3, 1, '10.77.2.11/24', '10.77.2.1'),
          host('replica2', 2, 1, '10.77.2.12/24', '10.77.2.1'),
        ],
        ['admin-r1.a', 'r1.b-sw1', 'sw1-db', 'sw1-replica1', 'sw1-replica2'],
      ),
      fields: ['db.eth0.ip', 'replica1.eth0.ip', 'replica2.eth0.ip'],
      start: {
        'db.eth0.ip': '10.77.2.10',
        'replica1.eth0.ip': '10.77.2.10',
        'replica2.eth0.ip': '10.77.2.1',
      },
      goals: reach('admin>db', 'admin>replica1', 'admin>replica2'),
    },
  ),
  unit(
    'net-diag-return',
    7,
    {
      title: 'Diagnóstico: llega, pero no vuelve',
      goal: 'Seis valores, uno mal. La pregunta de user llega a api: encuentra por qué no vuelve la respuesta.',
      theory: {
        what: 'Si la ida llega y la vuelta muere, el fallo está del lado del destino: su máscara, su puerta o la ruta de vuelta de un router.',
        how: [
          'ida:    ana -> r1 -> r2 -> db    # llega',
          'vuelta: db -> r2 -> ?            # muere en r2',
          '# mira la tabla de r2, no la de ana',
        ],
        when: '«Desde el servidor funciona, desde mi portátil no»: lee dónde muere la vuelta.',
        problems: 'Error típico: tocar el origen. El origen hizo su parte.',
      },
      example:
        'Antes de verlo: la puerta de db apunta a 10.0.2.254, que no existe. ¿Qué viaje muere?',
    },
    {
      title: 'Diagnosis: it arrives, but never returns',
      goal: 'Six values, one wrong. The request from user reaches api: find why the reply does not come back.',
      theory: {
        what: 'If the request arrives and the reply dies, the fault is on the destination side: its mask, its gateway or a router’s route back.',
        how: [
          'out:  ana -> r1 -> r2 -> db    # arrives',
          'back: db -> r2 -> ?            # dies at r2',
          '# look at r2’s table, not at ana',
        ],
        when: '“Works from the server, not from my laptop”: read where the reply dies.',
        problems: 'Typical mistake: changing the source. The source did its part.',
      },
      example:
        'Before you look: db’s gateway points at 10.0.2.254, which does not exist. Which trip dies?',
    },
    { net: chain(), goal: { from: 'ana', to: 'db' }, broken: { 'db.route0.via': '10.0.2.254' } },
    {
      net: net(
        [
          host('user', 0, 0, '10.90.1.10/24', '10.90.1.1'),
          router('r1', 1, 0, { lan: '10.90.1.1/24', enl: '10.90.0.1/30' }, [
            ['10.90.2.0/24', '10.90.0.2'],
          ]),
          router('r2', 2, 0, { enl: '10.90.0.2/30', lan: '10.90.2.1/24' }, [
            ['10.90.1.0/24', '10.90.0.1'],
          ]),
          host('api', 3, 0, '10.90.2.10/24', '10.90.2.1'),
        ],
        ['user-r1.lan', 'r1.enl-r2.enl', 'r2.lan-api'],
      ),
      fields: [
        'user.route0.via',
        'r1.route0.dest',
        'r1.route0.via',
        'r2.route0.dest',
        'r2.route0.via',
        'api.route0.via',
      ],
      start: {
        'user.route0.via': '10.90.1.1',
        'r1.route0.dest': '10.90.2.0/24',
        'r1.route0.via': '10.90.0.2',
        'r2.route0.dest': '10.90.11.0/24',
        'r2.route0.via': '10.90.0.1',
        'api.route0.via': '10.90.2.1',
      },
      goals: reach('user>api'),
    },
  ),
  boss(
    'net-boss-oncall',
    7,
    480,
    {
      title: 'Guardia de noche: tres tickets',
      goal: 'Cierra los tres tickets: solo hay tres valores mal en toda la red.',
      story:
        '03:12. Tres tickets a la vez: «pagos no ve la base de datos», «el worker nuevo no arranca» y «el panel no contesta». La red es una; los fallos, tres.',
      tasks: [
        'Que pagos y worker alcancen a db',
        'Que panel alcance a pagos',
        'Lee dónde muere cada paquete antes de tocar nada',
        'Solo hay tres valores mal',
      ],
    },
    {
      title: 'Night shift: three tickets',
      goal: 'Close the three tickets: only three values are wrong in the whole network.',
      story:
        '03:12. Three tickets at once: “payments cannot see the database”, “the new worker will not start” and “the dashboard does not answer”. One network; three faults.',
      tasks: [
        'pagos and worker must reach db',
        'panel must reach pagos',
        'Read where each packet dies before touching anything',
        'Only three values are wrong',
      ],
    },
    {
      net: net(
        [
          host('pagos', 0, 0, '10.13.1.10/24', '10.13.1.1'),
          host('worker', 0, 1, '10.13.1.11/24', '10.13.1.1'),
          sw('sw1', 1, 0),
          router('r1', 2, 0, { app: '10.13.1.1/24', enl: '10.13.0.1/30' }, [
            ['10.13.2.0/24', '10.13.0.2'],
            ['10.13.3.0/24', '10.13.0.2'],
          ]),
          router('r2', 3, 0, { enl: '10.13.0.2/30', data: '10.13.2.1/24', ops: '10.13.3.1/24' }, [
            ['10.13.1.0/24', '10.13.0.1'],
          ]),
          host('db', 4, 0, '10.13.2.10/24', '10.13.2.1'),
          host('panel', 3, 1, '10.13.3.10/24', '10.13.3.1'),
        ],
        ['pagos-sw1', 'worker-sw1', 'sw1-r1.app', 'r1.enl-r2.enl', 'r2.data-db', 'r2.ops-panel'],
      ),
      fields: [
        'pagos.eth0.ip',
        'worker.eth0.ip',
        'r1.route0.dest',
        'r1.route1.dest',
        'r2.route0.dest',
        'db.eth0.mask',
        'db.route0.via',
        'panel.route0.via',
      ],
      start: {
        'pagos.eth0.ip': '10.13.1.10',
        'worker.eth0.ip': '10.13.1.10',
        'r1.route0.dest': '10.13.2.0/24',
        'r1.route1.dest': '10.13.33.0/24',
        'r2.route0.dest': '10.13.1.0/24',
        'db.eth0.mask': '/16',
        'db.route0.via': '10.13.2.1',
        'panel.route0.via': '10.13.3.1',
      },
      goals: reach('pagos>db', 'worker>db', 'panel>pagos'),
    },
  ),

  // ── Bloque 8: diseño de direcciones ──────────────────────────────────────
  unit(
    'net-vlsm',
    8,
    {
      title: 'Subredes de tamaños distintos',
      goal: 'De 172.16.40.0/24 salen la sala, el laboratorio y el enlace con r2. Pon a cada trozo su máscara justa.',
      theory: {
        what: 'Las subredes de un rango no tienen por qué ser iguales. Repartes de mayor a menor, cada una con su máscara justa.',
        how: [
          '10.0.0.0/24 para 100, 50 y 2 máquinas',
          '100 -> /25: 10.0.0.0      (.0 a .127)',
          '50  -> /26: 10.0.0.128    (.128 a .191)',
          '2   -> /30: 10.0.0.192    (.192 a .195)',
        ],
        when: 'Con un rango escaso: la sala grande se lleva la mitad y cada enlace, cuatro direcciones.',
        problems: 'Error típico: empezar por la pequeña. La grande ya no cabe alineada.',
      },
      example:
        'Antes de verlo: h1 está en un /25 y h3 en un /30. ¿Importa eso para que se alcancen?',
    },
    {
      title: 'Subnets of different sizes',
      goal: '172.16.40.0/24 feeds the room, the lab and the link to r2. Give each slice its exact mask.',
      theory: {
        what: 'The subnets of a range need not be equal. You allocate from largest to smallest, each with its exact mask.',
        how: [
          '10.0.0.0/24 for 100, 50 and 2 machines',
          '100 -> /25: 10.0.0.0      (.0 to .127)',
          '50  -> /26: 10.0.0.128    (.128 to .191)',
          '2   -> /30: 10.0.0.192    (.192 to .195)',
        ],
        when: 'With a tight range: the big room takes half and each link takes four addresses.',
        problems:
          'Typical mistake: starting with the small one. The big one no longer fits aligned.',
      },
      example:
        'Before you look: h1 is in a /25 and h3 in a /30. Does that matter for them to reach each other?',
    },
    {
      net: net(
        [
          host('h1', 0, 0, '10.0.0.10/25', '10.0.0.1'),
          router('r1', 1, 0, { a: '10.0.0.1/25', b: '10.0.0.129/26', c: '10.0.0.193/30' }),
          host('h2', 2, 0, '10.0.0.140/26', '10.0.0.129'),
          host('h3', 1, 1, '10.0.0.194/30', '10.0.0.193'),
        ],
        ['h1-r1.a', 'r1.b-h2', 'r1.c-h3'],
      ),
      goal: { from: 'h1', to: 'h3' },
    },
    {
      net: net(
        [
          host('s1', 0, 0, '172.16.40.100/25', '172.16.40.1'),
          router('r1', 1, 0, {
            sala: '172.16.40.1/25',
            lab: '172.16.40.129/27',
            enl: '172.16.40.161/30',
          }),
          router('r2', 2, 0, { enl: '172.16.40.162/30' }, [['default', '172.16.40.161']]),
          host('l1', 1, 1, '172.16.40.150/27', '172.16.40.129'),
        ],
        ['s1-r1.sala', 'r1.enl-r2.enl', 'r1.lab-l1'],
      ),
      fields: [
        'r1.sala.mask',
        'r1.lab.mask',
        'r1.enl.mask',
        's1.eth0.mask',
        'l1.eth0.mask',
        'r2.enl.mask',
      ],
      goals: reach('s1>l1', 's1>r2', 'l1>r2'),
    },
  ),
  unit(
    'net-chain',
    8,
    {
      title: 'Tres routers en fila',
      goal: 'Escribe las tablas de los tres routers: a, b y c tienen que alcanzarse.',
      theory: {
        what: 'En una fila de routers, los de los extremos tiran con una ruta por defecto hacia el centro. El del centro necesita una ruta concreta hacia cada lado.',
        how: ['r1: default via r2', 'r2: red-A via r1      red-C via r3', 'r3: default via r2'],
        when: 'Sedes en cadena o capas de red (borde, distribución, acceso): piensas qué sabe cada router.',
        problems:
          'Error típico: dar default al del centro hacia un lado y olvidar el otro. Lo del lado olvidado rebota.',
      },
      example: 'Antes de verlo: de ana a db hay tres routers. ¿Cuántas rutas se usan en la ida?',
    },
    {
      title: 'Three routers in a row',
      goal: 'Write the tables of the three routers: a, b and c must reach each other.',
      theory: {
        what: 'In a row of routers, the ones at the ends get by with a default route towards the middle. The middle one needs a specific route to each side.',
        how: ['r1: default via r2', 'r2: net-A via r1      net-C via r3', 'r3: default via r2'],
        when: 'Chained sites or network layers (edge, distribution, access): you think about what each router knows.',
        problems:
          'Typical mistake: giving the middle one a default to one side and forgetting the other. Traffic for the forgotten side bounces.',
      },
      example:
        'Before you look: there are three routers from ana to db. How many routes are used on the way out?',
    },
    { net: row(), goal: { from: 'ana', to: 'db' } },
    {
      net: net(
        [
          host('a', 0, 0, '10.1.1.10/24', '10.1.1.1'),
          router('r1', 1, 0, { lan: '10.1.1.1/24', e: '10.0.12.1/30' }, [['default', '10.0.12.2']]),
          router('r2', 2, 0, { w: '10.0.12.2/30', e: '10.0.23.1/30', lan: '10.1.2.1/24' }, [
            ['10.1.1.0/24', '10.0.12.1'],
            ['10.1.3.0/24', '10.0.23.2'],
          ]),
          router('r3', 3, 0, { w: '10.0.23.2/30', lan: '10.1.3.1/24' }, [['default', '10.0.23.1']]),
          host('b', 2, 1, '10.1.2.10/24', '10.1.2.1'),
          host('c', 4, 0, '10.1.3.10/24', '10.1.3.1'),
        ],
        ['a-r1.lan', 'r1.e-r2.w', 'r2.e-r3.w', 'r2.lan-b', 'r3.lan-c'],
      ),
      fields: [
        'r1.route0.dest',
        'r1.route0.via',
        'r2.route0.dest',
        'r2.route0.via',
        'r2.route1.dest',
        'r2.route1.via',
        'r3.route0.dest',
        'r3.route0.via',
      ],
      goals: reach('a>c', 'a>b', 'c>b'),
    },
  ),
  unit(
    'net-supernet',
    8,
    {
      title: 'Una ruta para muchas redes',
      goal: 'Detrás de r2 hay cuatro redes seguidas y a r1 le queda sitio para una ruta. Resúmelas en una.',
      theory: {
        what: 'Varias redes seguidas que salen por el mismo vecino caben en una sola ruta de prefijo más corto: cuatro /24 seguidas son una /22.',
        how: [
          '10.8.0.0/24   10.8.1.0/24',
          '10.8.2.0/24   10.8.3.0/24',
          '-> 10.8.0.0/22 via el mismo vecino',
          '# /22: el tercer octeto va de 4 en 4 (0, 4, 8…)',
        ],
        when: 'Tablas cortas: en vez de una ruta por sala, una por edificio.',
        problems:
          'Error típico: resumir desde donde no empieza un salto. 10.8.1.0/22 no es una red: «una ruta mal escrita».',
      },
      example:
        'Antes de verlo: la ruta de r1 es 10.8.0.0/24 en vez de /22. ¿Llega ana a h3 (10.8.3.10)?',
    },
    {
      title: 'One route for many networks',
      goal: 'Four consecutive networks sit behind r2 and r1 has room for one more route. Summarise them in one.',
      theory: {
        what: 'Several consecutive networks leaving through the same neighbour fit in one route with a shorter prefix: four consecutive /24s are one /22.',
        how: [
          '10.8.0.0/24   10.8.1.0/24',
          '10.8.2.0/24   10.8.3.0/24',
          '-> 10.8.0.0/22 via the same neighbour',
          '# /22: the third octet steps by 4 (0, 4, 8…)',
        ],
        when: 'Short tables: instead of one route per room, one per building.',
        problems:
          'Typical mistake: summarising from where no step begins. 10.8.1.0/22 is not a network: “a badly written route”.',
      },
      example:
        'Before you look: the route on r1 is 10.8.0.0/24 instead of /22. Does ana reach h3 (10.8.3.10)?',
    },
    {
      net: net(
        [
          host('ana', 0, 0, '192.168.1.10/24', '192.168.1.1'),
          router('r1', 1, 0, { lan: '192.168.1.1/24', e: '10.0.0.1/30' }, [
            ['10.8.0.0/22', '10.0.0.2'],
          ]),
          router('r2', 2, 0, { w: '10.0.0.2/30', n0: '10.8.0.1/24', n3: '10.8.3.1/24' }, [
            ['default', '10.0.0.1'],
          ]),
          host('h0', 3, 0, '10.8.0.10/24', '10.8.0.1'),
          host('h3', 2, 1, '10.8.3.10/24', '10.8.3.1'),
        ],
        ['ana-r1.lan', 'r1.e-r2.w', 'r2.n0-h0', 'r2.n3-h3'],
      ),
      goal: { from: 'ana', to: 'h3' },
      broken: { 'r1.route0.dest': '10.8.0.0/24' },
    },
    {
      net: net(
        [
          host('ops', 0, 1, '192.168.200.10/24', '192.168.200.1'),
          router('r1', 1, 1, { lan: '192.168.200.1/24', e: '10.0.0.1/30', up: '10.0.0.5/30' }, [
            ['default', '10.0.0.6'],
            ['172.24.4.0/22', '10.0.0.2'],
          ]),
          router('borde', 1, 2, { down: '10.0.0.6/30' }, [['default', '10.0.0.5']]),
          router(
            'r2',
            2,
            1,
            {
              w: '10.0.0.2/30',
              a: '172.24.4.1/24',
              b: '172.24.5.1/24',
              c: '172.24.6.1/24',
              d: '172.24.7.1/24',
            },
            [['default', '10.0.0.1']],
          ),
          host('h4', 2, 0, '172.24.4.10/24', '172.24.4.1'),
          host('h5', 3, 0, '172.24.5.10/24', '172.24.5.1'),
          host('h6', 3, 1, '172.24.6.10/24', '172.24.6.1'),
          host('h7', 3, 2, '172.24.7.10/24', '172.24.7.1'),
        ],
        ['ops-r1.lan', 'r1.e-r2.w', 'r1.up-borde.down', 'r2.a-h4', 'r2.b-h5', 'r2.c-h6', 'r2.d-h7'],
      ),
      fields: ['r1.route1.dest'],
      goals: reach('ops>h4', 'ops>h5', 'ops>h6', 'ops>h7'),
    },
  ),
  boss(
    'net-boss-campus',
    8,
    540,
    {
      title: 'El plan de direcciones del campus',
      goal: 'Reparte 10.80.0.0/22 entre el clúster, el staff y el enlace con el edificio.',
      story:
        'El campus nuevo tiene un único rango, 10.80.0.0/22, y tres zonas: el clúster (300 puestos), la sala de staff (60) y el enlace con el router del edificio. Tu plan se despliega esta noche.',
      tasks: [
        'Clúster: 300 direcciones; staff: 60; enlace: 2',
        'Las subredes no se pueden pisar',
        'r2 vuelve hacia todo el campus con una sola ruta',
        'puesto y staff1 alcanzan a examen y se alcanzan entre sí',
      ],
    },
    {
      title: 'The campus address plan',
      goal: 'Share 10.80.0.0/22 between the cluster, the staff room and the link to the building.',
      story:
        'The new campus has a single range, 10.80.0.0/22, and three zones: the cluster (300 seats), the staff room (60) and the link to the building router. Your plan ships tonight.',
      tasks: [
        'Cluster: 300 addresses; staff: 60; link: 2',
        'The subnets must not overlap',
        'r2 gets back to the whole campus with a single route',
        'puesto and staff1 reach examen and each other',
      ],
    },
    {
      net: net(
        [
          host('puesto', 0, 0, '10.80.1.200/23', '10.80.0.1'),
          router(
            'r1',
            1,
            0,
            { clus: '10.80.0.1/23', staff: '10.80.2.1/26', enl: '10.80.2.65/30' },
            [['default', '10.80.2.66']],
          ),
          router('r2', 2, 0, { enl: '10.80.2.66/30', srv: '10.99.0.1/24' }, [
            ['10.80.0.0/22', '10.80.2.65'],
          ]),
          host('examen', 3, 0, '10.99.0.10/24', '10.99.0.1'),
          host('staff1', 1, 1, '10.80.2.50/26', '10.80.2.1'),
        ],
        ['puesto-r1.clus', 'r1.enl-r2.enl', 'r2.srv-examen', 'r1.staff-staff1'],
      ),
      fields: [
        'r1.clus.mask',
        'r1.staff.mask',
        'r1.enl.mask',
        'puesto.eth0.mask',
        'staff1.eth0.mask',
        'r2.enl.mask',
        'r2.route0.dest',
      ],
      goals: reach('puesto>examen', 'staff1>examen', 'puesto>staff1'),
    },
  ),

  // ── Bloque 9: varios caminos ─────────────────────────────────────────────
  unit(
    'net-loop',
    9,
    {
      title: 'Bucles',
      goal: 'El paquete de x a y da vueltas entre dos routers. Encuentra el siguiente salto que lo devuelve atrás.',
      theory: {
        what: 'Si dos routers se señalan el uno al otro para el mismo destino, el paquete va y viene hasta que se le acaban los saltos (el TTL) y se tira.',
        how: [
          'r1: default       via r2',
          'r2: 10.0.3.0/24   via r1     # debería ser r3',
          '# r1 -> r2 -> r1 -> r2 …',
        ],
        when: 'Tras tocar rutas en dos sitios a la vez.',
        problems:
          'Síntoma literal: «el paquete da vueltas y se le acaban los saltos». Mira quién lo manda hacia atrás.',
      },
      example:
        'Antes de verlo: r2 manda la red de db de vuelta a r1. ¿Qué hace r1 con ese paquete?',
    },
    {
      title: 'Loops',
      goal: 'The packet from x to y bounces between two routers. Find the next hop that sends it backwards.',
      theory: {
        what: 'If two routers point at each other for the same destination, the packet goes back and forth until it runs out of hops (the TTL) and is dropped.',
        how: [
          'r1: default       via r2',
          'r2: 10.0.3.0/24   via r1     # should be r3',
          '# r1 -> r2 -> r1 -> r2 …',
        ],
        when: 'After changing routes in two places at once.',
        problems:
          'Literal symptom: “the packet goes round in circles and runs out of hops”. Look at who sends it backwards.',
      },
      example:
        'Before you look: r2 sends db’s network back to r1. What does r1 do with that packet?',
    },
    { net: row(), goal: { from: 'ana', to: 'db' }, broken: { 'r2.route1.via': '10.0.0.1' } },
    {
      net: net(
        [
          host('x', 0, 0, '10.21.1.10/24', '10.21.1.1'),
          router('r1', 1, 0, { lan: '10.21.1.1/24', e: '10.21.0.1/30' }, [
            ['default', '10.21.0.2'],
          ]),
          router('r2', 2, 0, { w: '10.21.0.2/30', e: '10.21.0.5/30' }, [
            ['10.21.1.0/24', '10.21.0.1'],
            ['10.21.3.0/24', '10.21.0.6'],
          ]),
          router('r3', 3, 0, { w: '10.21.0.6/30', lan: '10.21.3.1/24' }, [
            ['default', '10.21.0.5'],
          ]),
          host('y', 4, 0, '10.21.3.10/24', '10.21.3.1'),
        ],
        ['x-r1.lan', 'r1.e-r2.w', 'r2.e-r3.w', 'r3.lan-y'],
      ),
      fields: ['r1.route0.via', 'r2.route0.via', 'r2.route1.via', 'r3.route0.via'],
      start: {
        'r1.route0.via': '10.21.0.2',
        'r2.route0.via': '10.21.0.1',
        'r2.route1.via': '10.21.0.1',
        'r3.route0.via': '10.21.0.5',
      },
      goals: reach('x>y'),
    },
  ),
  unit(
    'net-two-exits',
    9,
    {
      title: 'Dos salidas',
      goal: 'r1 tiene dos vecinos: r2 hacia dentro e internet hacia fuera. Escribe sus dos rutas.',
      theory: {
        what: 'Un router con dos vecinos reparte: lo de dentro, por una ruta concreta hacia el router interno; todo lo demás, por la ruta por defecto hacia internet.',
        how: [
          'r1: 150.1.2.0/24  via r2          # la red de detrás de r2',
          'r1: default       via proveedor',
          '# 150.1.2.9 -> r2;   8.8.8.8 -> proveedor',
        ],
        when: 'El router de borde de cualquier empresa.',
        problems:
          'Error típico: dejar lo interno a la ruta por defecto. Internet lo devuelve y el paquete da vueltas.',
      },
      example:
        'Antes de verlo: r1 solo tiene la ruta por defecto. ¿Adónde manda un paquete para la red de b?',
    },
    {
      title: 'Two ways out',
      goal: 'r1 has two neighbours: r2 inwards and the internet outwards. Write its two routes.',
      theory: {
        what: 'A router with two neighbours splits traffic: internal networks through a specific route to the inner router; everything else through the default route to the internet.',
        how: [
          'r1: 150.1.2.0/24  via r2          # the network behind r2',
          'r1: default       via provider',
          '# 150.1.2.9 -> r2;   8.8.8.8 -> provider',
        ],
        when: 'The edge router of any company.',
        problems:
          'Typical mistake: leaving internal traffic to the default route. The internet sends it back and the packet loops.',
      },
      example:
        'Before you look: r1 only has the default route. Where does it send a packet for b’s network?',
    },
    {
      net: net(
        [
          host('a', 0, 0, '150.1.1.10/24', '150.1.1.1'),
          router('r1', 1, 0, { lan: '150.1.1.1/24', in: '10.0.0.1/30', wan: '80.80.0.2/30' }, [
            ['default', '80.80.0.1'],
            ['150.1.2.0/24', '10.0.0.2'],
          ]),
          internet('internet', 2, 0, { dns: '8.8.8.8/32', wan: '80.80.0.1/30' }, [
            ['150.1.0.0/16', '80.80.0.2'],
          ]),
          router('r2', 1, 1, { up: '10.0.0.2/30', lan: '150.1.2.1/24' }, [['default', '10.0.0.1']]),
          host('b', 2, 1, '150.1.2.10/24', '150.1.2.1'),
        ],
        ['a-r1.lan', 'r1.wan-internet.wan', 'r1.in-r2.up', 'r2.lan-b'],
      ),
      goal: { from: 'a', to: 'b' },
      broken: { 'r1.route1.dest': '' },
    },
    {
      net: net(
        [
          host('ofi', 0, 0, '149.20.1.10/24', '149.20.1.1'),
          router('r1', 1, 0, { lan: '149.20.1.1/24', in: '10.0.0.1/30', wan: '64.9.0.2/30' }, [
            ['default', '64.9.0.1'],
            ['149.20.2.0/24', '10.0.0.2'],
          ]),
          internet('internet', 2, 0, { dns: '1.1.1.1/32', wan: '64.9.0.1/30' }, [
            ['149.20.0.0/16', '64.9.0.2'],
          ]),
          router('r2', 1, 1, { up: '10.0.0.2/30', lan: '149.20.2.1/24' }, [
            ['default', '10.0.0.1'],
          ]),
          host('lab', 2, 1, '149.20.2.10/24', '149.20.2.1'),
        ],
        ['ofi-r1.lan', 'r1.wan-internet.wan', 'r1.in-r2.up', 'r2.lan-lab'],
      ),
      fields: ['r1.route0.dest', 'r1.route0.via', 'r1.route1.dest', 'r1.route1.via'],
      goals: reach('ofi>lab', 'ofi>internet', 'lab>internet'),
    },
  ),
  unit(
    'net-dmz',
    9,
    {
      title: 'Un servidor visible desde fuera',
      goal: 'Publica web: internet tiene que alcanzarlo, y pc, desde la oficina, también.',
      theory: {
        what: 'Para que internet llegue a un servidor tuyo hacen falta tres cosas: dirección pública, ruta en internet hacia su red y camino de vuelta.',
        how: [
          'internet -> r1 -> web     # ida: la ruta de internet a tu red',
          'web -> r1 -> internet     # vuelta: puerta de web + default de r1',
        ],
        when: 'Publicar la web, la API o el correo.',
        problems:
          'Error típico: probar solo desde dentro. Desde la oficina llega; desde internet no hay ruta.',
      },
      example:
        'Antes de verlo: web no tiene puerta de enlace. ¿Le llega la pregunta de internet? ¿Contesta?',
    },
    {
      title: 'A server visible from outside',
      goal: 'Publish web: the internet must reach it, and so must pc from the office.',
      theory: {
        what: 'For the internet to reach one of your servers you need three things: a public address, a route on the internet to its network and a way back.',
        how: [
          'internet -> r1 -> web     # out: the internet’s route to your network',
          'web -> r1 -> internet     # back: web’s gateway + r1’s default',
        ],
        when: 'Publishing the website, the API or mail.',
        problems:
          'Typical mistake: testing only from inside. From the office it works; from the internet there is no route.',
      },
      example:
        'Before you look: web has no gateway. Does the request from the internet arrive? Does it answer?',
    },
    { net: exit(), goal: { from: 'internet', to: 'web' }, broken: { 'web.route0.via': '' } },
    {
      net: net(
        [
          internet('internet', 0, 0, { dns: '8.8.8.8/32', wan: '193.0.0.1/30' }, [
            ['151.80.5.0/28', '193.0.0.2'],
          ]),
          router('r1', 1, 0, { wan: '193.0.0.2/30', dmz: '151.80.5.1/28', lan: '10.0.0.1/24' }, [
            ['default', '193.0.0.1'],
          ]),
          host('web', 2, 0, '151.80.5.2/28', '151.80.5.1'),
          host('pc', 1, 1, '10.0.0.10/24', '10.0.0.1'),
        ],
        ['internet.wan-r1.wan', 'r1.dmz-web', 'r1.lan-pc'],
      ),
      fields: ['internet.route0.dest', 'internet.route0.via', 'web.eth0.ip', 'web.route0.via'],
      goals: reach('internet>web', 'pc>web'),
    },
  ),
  boss(
    'net-boss-split',
    9,
    540,
    {
      title: 'Producción partida en dos',
      goal: 'Vuelve a unir producción: los clientes tienen que ver la API y la API, su cola.',
      story:
        'Un cambio de rutas a media tarde ha partido producción: la API ya no ve a la cola y los clientes no ven a la API. Los paquetes dan vueltas entre dos routers.',
      tasks: [
        'Que internet alcance a api',
        'Que api alcance a cola',
        'Hay un bucle entre r1 e internet',
        'Y una máquina que no sabe volver',
      ],
    },
    {
      title: 'Production split in two',
      goal: 'Join production again: customers must see the API and the API must see its queue.',
      story:
        'A mid-afternoon routing change has split production: the API cannot see the queue and customers cannot see the API. Packets bounce between two routers.',
      tasks: [
        'The internet must reach api',
        'api must reach cola',
        'There is a loop between r1 and the internet',
        'And a machine that cannot find its way back',
      ],
    },
    {
      net: net(
        [
          internet('internet', 0, 0, { dns: '8.8.8.8/32', wan: '198.51.0.1/30' }, [
            ['152.60.0.0/23', '198.51.0.2'],
          ]),
          router('r1', 1, 0, { wan: '198.51.0.2/30', pub: '152.60.0.1/24', in: '10.0.0.1/30' }, [
            ['default', '198.51.0.1'],
            ['152.60.1.0/24', '10.0.0.2'],
          ]),
          host('api', 2, 0, '152.60.0.10/24', '152.60.0.1'),
          router('r2', 1, 1, { up: '10.0.0.2/30', lan: '152.60.1.1/24' }, [
            ['default', '10.0.0.1'],
          ]),
          host('cola', 2, 1, '152.60.1.10/24', '152.60.1.1'),
        ],
        ['internet.wan-r1.wan', 'r1.pub-api', 'r1.in-r2.up', 'r2.lan-cola'],
      ),
      fields: [
        'internet.route0.dest',
        'r1.route0.via',
        'r1.route1.dest',
        'r1.route1.via',
        'r2.route0.via',
        'cola.route0.via',
      ],
      start: {
        'internet.route0.dest': '152.60.1.0/24',
        'r1.route0.via': '198.51.0.1',
        'r1.route1.dest': '152.60.1.0/24',
        'r1.route1.via': '198.51.0.1',
        'r2.route0.via': '10.0.0.1',
      },
      goals: reach('internet>api', 'api>cola'),
    },
  ),
  boss(
    'net-final-advanced',
    9,
    900,
    {
      title: 'La red entera de Peer4U',
      goal: 'Deja la red de lanzamiento funcionando de punta a punta.',
      story:
        'Último día antes del lanzamiento. Una zona pública, la oficina, el centro de datos y una salida a internet; parte de la red está sin numerar y parte la «arregló» alguien con prisa. Si esto funciona, Peer4U sale mañana.',
      tasks: [
        'Internet alcanza a web; ana y leo salen a internet',
        'ana alcanza a db, y db alcanza a web',
        'Numera la interfaz de la oficina en r2 y escribe las rutas que faltan',
        'Hay cuatro valores mal puestos: una ruta de internet, dos siguientes saltos y lo de leo y db',
      ],
    },
    {
      title: 'The whole Peer4U network',
      goal: 'Leave the launch network working end to end.',
      story:
        'Last day before launch. A public zone, the office, the data centre and one way out; part of the network is not numbered and part was “fixed” by someone in a hurry. If this works, Peer4U ships tomorrow.',
      tasks: [
        'The internet reaches web; ana and leo reach the internet',
        'ana reaches db, and db reaches web',
        'Number the office interface on r2 and write the missing routes',
        'Four values are wrong: an internet route, two next hops, and something on leo and db',
      ],
    },
    {
      net: net(
        [
          internet('internet', 0, 0, { dns: '8.8.8.8/32', wan: '203.0.113.1/30' }, [
            ['160.20.0.0/24', '203.0.113.2'],
          ]),
          router(
            'r1',
            1,
            0,
            { wan: '203.0.113.2/30', dmz: '160.20.0.1/26', core: '10.255.0.1/30' },
            [
              ['default', '203.0.113.1'],
              ['160.20.0.64/26', '10.255.0.2'],
              ['160.20.0.128/25', '10.255.0.2'],
            ],
          ),
          host('web', 2, 0, '160.20.0.10/26', '160.20.0.1'),
          router(
            'r2',
            1,
            1,
            { core: '10.255.0.2/30', ofi: '160.20.0.65/26', enl: '10.255.0.5/30' },
            [
              ['default', '10.255.0.1'],
              ['160.20.0.128/25', '10.255.0.6'],
            ],
          ),
          sw('sw1', 0, 1),
          host('ana', 0, 2, '160.20.0.70/26', '160.20.0.65'),
          host('leo', 1, 2, '160.20.0.71/26', '160.20.0.65'),
          router('r3', 2, 1, { enl: '10.255.0.6/30', datos: '160.20.0.129/25' }, [
            ['default', '10.255.0.5'],
          ]),
          host('db', 3, 1, '160.20.0.200/25', '160.20.0.129'),
        ],
        [
          'internet.wan-r1.wan',
          'r1.dmz-web',
          'r1.core-r2.core',
          'r2.ofi-sw1',
          'sw1-ana',
          'sw1-leo',
          'r2.enl-r3.enl',
          'r3.datos-db',
        ],
      ),
      fields: [
        'internet.route0.dest',
        'r1.route1.dest',
        'r1.route1.via',
        'r1.route2.via',
        'r2.ofi.ip',
        'r2.ofi.mask',
        'r2.route1.dest',
        'r2.route1.via',
        'r3.route0.via',
        'leo.eth0.ip',
        'db.eth0.mask',
      ],
      start: {
        'internet.route0.dest': '160.20.0.0/26',
        'r1.route2.via': '10.255.0.6',
        'r3.route0.via': '10.255.0.1',
        'leo.eth0.ip': '160.20.0.127',
        'db.eth0.mask': '/24',
      },
      goals: reach('internet>web', 'ana>internet', 'leo>internet', 'ana>db', 'db>web'),
    },
    'final',
  ),
]
