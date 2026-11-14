/**
 * Banco de Not-games: preguntas del curso de NetPractice (`docs/curso-netpractice.md`,
 * motor `packages/netsim`). Generales, como las de los otros cursos, y con el
 * `id` empezando por el del curso (`net-`). No repiten las del proyecto
 * NetPractice de 42 (`network.ts`, con `needs.projects`): aquí se pregunta por
 * lo que enseña cada unidad y por los mensajes del simulador.
 *
 * Siguen `docs/plantilla-preguntas.md`: la mala principal de cada concepto es
 * el error típico de su unidad. Lo afirmado se ha comprobado en el motor
 * (`subnetOf`, `parseMask`, `parseDest` y `ping`, 2026-11-14) y las cuentas,
 * también con `ipaddress` de Python.
 */

import type { Concept } from './types.js'

export const COURSE_NET: readonly Concept[] = [
  {
    // Unidades net-octets y net-cut: la red no son siempre los tres primeros números.
    id: 'net-network-address',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 1,
    forms: [
      {
        // Predicción (motor: subnetOf → 172.20.0.0). Malas: los tres primeros números,
        // solo el primero, el broadcast, el broadcast del /24.
        ask: [
          '¿Cuál es la dirección de red de `172.20.7.9/16`?',
          'Con máscara /16, la red de `172.20.7.9` es…',
        ],
        right: ['`172.20.0.0`'],
        wrong: ['`172.20.7.0`', '`172.0.0.0`', '`172.20.255.255`', '`172.20.7.255`'],
      },
      {
        // Predicción con un /26 (motor: 192.168.1.64). Malas: tratarlo como /24,
        // quitar uno, el broadcast, la red siguiente, un salto de 32.
        ask: [
          '¿Qué dirección de red tiene `192.168.1.77/26`?',
          'Con /26, `192.168.1.77` pertenece a la red…',
        ],
        right: ['`192.168.1.64`'],
        wrong: [
          '`192.168.1.0`',
          '`192.168.1.76`',
          '`192.168.1.127`',
          '`192.168.1.128`',
          '`192.168.1.32`',
        ],
      },
      {
        // Escenario (motor: .100 y .90 en 192.168.1.64/26; .130 en .128, .20 y .60 en .0).
        ask: [
          'Con máscara /26, ¿cuál de estas direcciones está en la misma red que `192.168.1.77`?',
          'Una máquina nueva va en la red de `192.168.1.77/26`. ¿Qué dirección le das?',
        ],
        right: ['`192.168.1.100`', '`192.168.1.90`'],
        wrong: ['`192.168.1.130`', '`192.168.1.20`', '`192.168.1.200`', '`192.168.1.60`'],
      },
    ],
    wrong: [],
    why: 'La red son los bits que marca la máscara, con los demás a 0: con /16, dos octetos; con /26, saltos de 64. No siempre son los tres primeros números.',
  },
  {
    // Unidad net-mask: los unos de una máscara van seguidos.
    id: 'net-mask-valid',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Negativa (motor: parseMask da null solo para 255.255.255.100; las demás, 26, 30, 23, 25 y 28).
        ask: [
          '¿Cuál de estas NO es una máscara válida?',
          'Todas estas son máscaras válidas EXCEPTO…',
        ],
        right: ['`255.255.255.100`'],
        wrong: [
          '`255.255.255.192`',
          '`255.255.255.252`',
          '`255.255.254.0`',
          '`255.255.255.128`',
          '`255.255.255.240`',
        ],
      },
      {
        // Predicción (motor: maskOf(27) → 255.255.255.224). Malas: el número tal cual,
        // el /28, el /26, el octeto equivocado, el tamaño del bloque.
        ask: [
          '¿Cómo se escribe /27 en decimal?',
          'La máscara /27, escrita con cuatro números, es…',
        ],
        right: ['`255.255.255.224`'],
        wrong: [
          '`255.255.255.27`',
          '`255.255.255.240`',
          '`255.255.255.192`',
          '`255.255.224.0`',
          '`255.255.255.32`',
        ],
      },
      {
        // Diagnóstico (motor: bad_mask, «no es una máscara: … con los unos seguidos»).
        ask: [
          'Le pones a una máquina la máscara `255.255.255.100` y el paquete ni sale. ¿Por qué?',
          'El simulador rechaza la máscara `255.255.255.100`. ¿Qué le pasa?',
        ],
        right: ['Sus unos no van seguidos', 'En binario, sus unos no van juntos'],
        wrong: [
          'Su último octeto pasa de 255',
          'Deja sitio para menos de 2 máquinas',
          'Las máscaras solo se escriben como prefijo',
          'Su último octeto tendría que ser 0',
        ],
      },
    ],
    wrong: [],
    why: 'Una máscara son unos seguidos y luego ceros: en un octeto solo valen 0, 128, 192, 224, 240, 248, 252, 254 y 255.',
  },
  {
    // Unidades net-range y net-fit: caben 2^h − 2, y el router gasta una.
    id: 'net-hosts-fit',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 2,
    forms: [
      {
        // Inversa (motor: prefixFor(31) → 26). Mala principal: /27, olvidar las dos reservadas.
        ask: [
          '¿Cuál es la red más pequeña en la que caben 31 máquinas?',
          'Para 31 máquinas, el prefijo más largo que te sirve es…',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/24`', '`/31`'],
      },
      {
        // Predicción (motor: subnetOf(…, 27).hosts → 30). Malas: sin restar, restar una,
        // el prefijo, el /26, los bits de máquina.
        ask: [
          '¿Cuántas máquinas caben en una red /27?',
          'Con máscara `255.255.255.224`, ¿cuántas máquinas caben?',
        ],
        right: ['30'],
        wrong: ['32', '31', '27', '62', '5'],
      },
      {
        // Escenario: 30 máquinas + el router = 31 direcciones (motor: prefixFor(31) → 26).
        ask: [
          'Una red tendrá 30 máquinas y la interfaz de su router. ¿Cuál es la red más pequeña que basta?',
          'Necesitas sitio para 30 máquinas más el router. ¿Qué red, la más pequeña posible, eliges?',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/29`'],
      },
    ],
    wrong: [],
    why: 'Con h bits de máquina caben 2^h − 2: un /27 deja 30. Cuenta también el router, que gasta una dirección.',
  },
  {
    // Unidades net-broadcast, net-edges y net-special: lo que no se da a nadie.
    id: 'net-unusable-address',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Diagnóstico (motor: broadcast_address en ana, 10.0.0.7).
        ask: [
          'En el esquema, una máquina con `10.0.0.7/30` no manda nada. ¿Por qué?',
          'Le das `10.0.0.7/30` a una máquina y el paquete ni sale. ¿Qué pasa?',
        ],
        right: ['Es la dirección de broadcast de su red', 'Es la de broadcast de esa red /30'],
        wrong: [
          'Es la dirección de red de su subred',
          'Un /30 no deja sitio para máquinas',
          'Le falta la puerta de enlace',
          'Es una dirección privada',
        ],
      },
      {
        // Escenario (motor: 10.0.0.4/30 → red .4, broadcast .7, máquinas .5 y .6).
        ask: [
          '¿Qué dirección puedes dar a una máquina de la red `10.0.0.4/30`?',
          'En la red `10.0.0.4/30`, una máquina puede llevar…',
        ],
        right: ['`10.0.0.5`', '`10.0.0.6`'],
        wrong: ['`10.0.0.4`', '`10.0.0.7`', '`10.0.0.8`', '`10.0.0.3`', '`10.0.0.9`'],
      },
      {
        // Diagnóstico (motor: reserved, loopback, en 127.0.0.5).
        ask: [
          'Numeras una red con `127.0.0.5/24` porque «localhost funciona». ¿Qué pasa?',
          'Una máquina del esquema lleva `127.0.0.5/24`. ¿Qué hace el paquete?',
        ],
        right: ['No sale: 127.x es de loopback', 'No sale: es una dirección de loopback'],
        wrong: [
          'Sale: es una privada, como 10.x',
          'Sale si la máscara es /8',
          'Sale si el router también usa 127.x',
          'Sale, pero solo hacia internet',
        ],
      },
    ],
    wrong: [],
    why: 'La de red (máquina a 0), la de broadcast (máquina a 1) y el rango 127.x no se dan a nadie: el paquete ni sale.',
  },
  {
    // Unidad net-switch: un switch no tiene IP.
    id: 'net-switch-role',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Definición. Malas: router, DHCP, puerta de enlace, tabla de rutas.
        ask: ['¿Para qué sirve un switch?', 'En una red, un switch sirve para…'],
        right: [
          'Unir máquinas de una misma red, sin tener IP',
          'Juntar en un cable las máquinas de una red',
        ],
        wrong: [
          'Unir dos redes distintas, como un router',
          'Dar una IP a cada máquina que se conecta',
          'Hacer de puerta de enlace de su red',
          'Reenviar según su tabla de rutas',
        ],
      },
      {
        // Escenario (motor: cache en otra red → «ana no tiene ruta hacia 10.0.2.12»; ana y leo, bien).
        ask: [
          'Tres máquinas cuelgan de un switch: dos se hablan y la tercera no. ¿Qué miras primero?',
          'En un switch, ana y leo se hablan y cache no. ¿Qué revisas antes?',
        ],
        right: [
          'La IP y la máscara de la que no contesta',
          'La dirección y la máscara de esa máquina',
        ],
        wrong: [
          'La IP que tiene el switch',
          'La tabla de rutas del switch',
          'La puerta de enlace del switch',
          'La máscara que tiene el switch',
        ],
      },
    ],
    wrong: [],
    why: 'Un switch no tiene IP ni decide nada: une todo lo que cuelga de él en una red. Si una máquina no contesta, mira su IP y su máscara.',
  },
  {
    // Unidad net-gateway: la puerta es la cara del router en tu red.
    id: 'net-gateway-side',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Escenario (motor: con 10.0.1.1 llega; con 10.0.2.1, gateway_outside).
        ask: [
          'r1 une `10.0.1.0/24` y `10.0.2.0/24`, con la `.1` en cada una. ¿Qué puerta le pones a una máquina de la primera?',
          'Un router tiene la `.1` en `10.0.1.0/24` y en `10.0.2.0/24`. Una máquina de la primera red sale por…',
        ],
        right: ['`10.0.1.1`'],
        wrong: ['`10.0.2.1`', '`10.0.1.0`', '`10.0.1.255`', '`10.0.2.0`', '`10.0.1.254`'],
      },
      {
        // Diagnóstico (motor: «el siguiente salto 10.0.2.1 no está en ninguna de sus redes», en ana).
        ask: [
          'El simulador dice en ana: «el siguiente salto 10.0.2.1 no está en ninguna de sus redes». ¿Qué falla?',
          'ana, en `10.0.1.10/24`, tiene de puerta `10.0.2.1` y no sale nada. ¿Por qué?',
        ],
        right: [
          'Su puerta es la cara del router en la otra red',
          'Le pusiste la IP del router en la red de enfrente',
        ],
        wrong: [
          'El router no tiene ruta hacia la red de ana',
          'Falta la ruta de vuelta en el router',
          'La IP de ana está repetida en otra máquina',
          'A ana le falta una ruta por defecto',
        ],
      },
    ],
    wrong: [],
    why: 'La puerta de enlace es la IP del router en tu propia red: un vecino de tu cable, no la cara que da a la otra red.',
  },
  {
    // Unidades net-route y net-default: el destino de una ruta es una red con su prefijo.
    id: 'net-route-destination',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        // Inversa (motor: parseDest acepta default y 0.0.0.0/0; 0.0.0.0/24 solo cubre .0 a .255).
        ask: [
          '¿Qué destino pones en una ruta para que valga para cualquier dirección?',
          'Una ruta que sirva para todo lo que no tiene otra más concreta lleva de destino…',
        ],
        right: ['`0.0.0.0/0`', '`default`'],
        wrong: ['`0.0.0.0/24`', '`0.0.0.0/32`', '`255.255.255.255/32`', '`255.255.255.0/24`'],
      },
      {
        // Diagnóstico (motor: parseDest('10.0.2.10/24') → null, bad_route; Python: «has host bits set»).
        ask: [
          'r1 tiene la ruta `10.0.2.10/24 via 10.0.0.2` y el simulador dice que está mal escrita. ¿Por qué?',
          'Escribes de destino `10.0.2.10/24` y la ruta no vale. ¿Qué le pasa?',
        ],
        right: [
          'El destino tiene bits de máquina: no es una red',
          'Es una máquina con máscara, no una dirección de red',
        ],
        wrong: [
          'El siguiente salto no es vecino del router',
          'Una ruta no admite el prefijo /24',
          'La máscara se escribe en decimal',
          'Le falta la palabra default delante',
        ],
      },
    ],
    wrong: [],
    why: 'El destino de una ruta es una red con su prefijo (10.0.2.0/24) o default (0.0.0.0/0); 0.0.0.0/24 solo cubre de 0.0.0.0 a 0.0.0.255.',
  },
  {
    // Unidades net-roundtrip, net-return y net-diag-return: la vuelta también cuenta.
    id: 'net-return-path',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        // Diagnóstico (motor: sin ruta de vuelta en r2, la ida llega y la vuelta muere en r2, no_route).
        ask: [
          'La traza dice «vuelta: r2 no tiene ruta hacia 10.0.1.10». ¿Dónde está el fallo?',
          'El ping llega a db, pero la respuesta muere en r2 por falta de ruta. ¿Qué arreglas?',
        ],
        right: [
          'La tabla de rutas de r2, que no sabe volver',
          'Las rutas de r2 hacia la red del origen',
        ],
        wrong: [
          'La IP y la máscara del origen',
          'La ruta de ida de r1 hacia db',
          'La puerta de enlace del origen',
          'El cable entre db y r2',
        ],
      },
      {
        // Escenario: si la ida llega, el origen hizo su parte.
        ask: [
          'La ida de ana a db llega y la vuelta muere. ¿Qué revisas?',
          'El paquete llega a db, pero ana no recibe respuesta. ¿Dónde miras?',
        ],
        right: [
          'Puerta, máscara y rutas de vuelta de db',
          'Cómo contesta db: su puerta y las rutas a ana',
        ],
        wrong: [
          'La IP y la máscara de ana',
          'La puerta de enlace de ana',
          'La ruta de r1 hacia la red de db',
          'El cable de ana a su router',
        ],
      },
    ],
    wrong: [],
    why: 'Un ping es ida y vuelta, y cada nodo decide con su configuración: si la vuelta muere, el fallo está en el destino o en las rutas hacia el origen.',
  },
  {
    // Unidad net-longest: gana el prefijo más largo, no el orden.
    id: 'net-longest-prefix',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        // Predicción (motor: en los dos órdenes, sale por la /24 hacia 10.9.0.6).
        ask: [
          'r1 tiene, en este orden, `10.0.0.0/16 via 10.9.0.2` y `10.0.5.0/24 via 10.9.0.6`. ¿Por dónde manda un paquete a `10.0.5.7`?',
          'Con `10.0.0.0/16 via 10.9.0.2` primero y `10.0.5.0/24 via 10.9.0.6` después, un paquete a `10.0.5.7` sale…',
        ],
        right: ['Por la ruta /24, que es más concreta', 'Por la /24: gana el prefijo más largo'],
        wrong: [
          'Por la ruta /16, que va primero',
          'Por las dos, repartiendo el tráfico',
          'Por ninguna: las dos rutas se pisan',
          'Por la ruta por defecto, si la hay',
        ],
      },
      {
        // Definición.
        ask: [
          'Si varias rutas sirven para un destino, ¿cuál usa el router?',
          'Cuando dos rutas cubren el mismo destino, el router elige…',
        ],
        right: ['La que tiene el prefijo más largo', 'La más concreta, la de más bits'],
        wrong: [
          'La que está primero en la tabla',
          'La de prefijo más corto',
          'La ruta por defecto',
          'La última que se añadió',
          'La que tiene el salto más cercano',
        ],
      },
    ],
    wrong: [],
    why: 'Gana la ruta más concreta (el prefijo más largo), esté donde esté en la tabla; la de por defecto, /0, es la última opción.',
  },
  {
    // Unidades net-public y net-exit: salir por el proveedor, con direcciones públicas.
    id: 'net-internet-exit',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        // Escenario (motor: via 163.5.20.1 llega; via 8.8.8.8, gateway_outside; via la propia
        // 163.5.20.2, gateway_absent; 0.0.0.0/24 no cubre 8.8.8.8, no_route).
        ask: [
          'r1 sale a internet por `163.5.20.2/30`; el proveedor es `163.5.20.1`. ¿Qué ruta pones en r1?',
          'r1 tiene `163.5.20.2/30` en el cable del proveedor (`163.5.20.1`). Para llegar a `8.8.8.8`, r1 lleva…',
        ],
        right: ['`default via 163.5.20.1`'],
        wrong: [
          '`default via 8.8.8.8`',
          '`default via 163.5.20.2`',
          '`8.8.8.8/32 via 8.8.8.8`',
          '`0.0.0.0/24 via 163.5.20.1`',
        ],
      },
      {
        // Diagnóstico (motor: private_internet en internet, 172.20.0.5). El simulador no hace NAT.
        ask: [
          'Desde `172.20.0.5` haces ping a `8.8.8.8` y el paquete muere al entrar en internet. ¿Por qué?',
          'El ping de `172.20.0.5` a `8.8.8.8` llega a internet y ahí se tira. ¿Qué pasa?',
        ],
        right: [
          '172.20.x es privada e internet la tira',
          'Es una dirección privada: no viaja fuera',
        ],
        wrong: [
          'A la máquina le falta la ruta por defecto',
          'El proveedor no tiene ruta hacia 8.8.8.8',
          '172.20.x es pública y está repetida',
          'Internet no contesta a pings de fuera',
        ],
      },
    ],
    wrong: [],
    why: 'r1 sale por su ruta por defecto hacia el proveedor, que es un vecino; y fuera solo viajan direcciones públicas (aquí no hay NAT).',
  },
  {
    // Unidad net-diag-mask: la máscara demasiado ancha.
    id: 'net-mask-too-wide',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Diagnóstico (motor: con /16, wrong_segment en ana; con /25, llega por r1).
        ask: [
          'En ana sale «según su máscara, 10.0.2.10 es vecina de ana, pero está en otra red». ¿Qué arreglas?',
          'ana alcanza a sus vecinas, pero a `10.0.2.10`, tras el router, no: la cree vecina. ¿Qué tocas?',
        ],
        right: ['La máscara de ana, que es demasiado ancha', 'La máscara de ana: abarca de más'],
        wrong: [
          'La máscara de ana, que es demasiado estrecha',
          'La puerta de enlace de ana',
          'La IP de 10.0.2.10, que está repetida',
          'La tabla de rutas del router',
        ],
      },
      {
        // Predicción (motor: wrong_segment, sin ningún salto).
        ask: [
          'ana pasa de `10.0.1.10/24` a `/16` y manda un paquete a `10.0.2.10`, tras r1. ¿Qué hace ana?',
          'Con `10.0.1.10/16` y puerta `10.0.1.1`, ana manda algo a `10.0.2.10`, en otra red. ¿Qué pasa?',
        ],
        right: [
          'Lo busca en su propio cable y no lo encuentra',
          'Lo busca en su cable y no usa la puerta',
        ],
        wrong: [
          'Se lo pasa a su puerta de enlace',
          'Lo entrega: /16 abarca las dos redes',
          'Lo manda a todas con un broadcast',
          'Lo tira: no tiene ruta hacia esa red',
        ],
      },
    ],
    wrong: [],
    why: 'Una máscara demasiado ancha hace creer vecino a lo que está en otra red: la máquina lo busca en su cable y nunca usa la puerta de enlace.',
  },
  {
    // Unidad net-supernet: resumir cuatro /24 en una /22.
    id: 'net-supernet',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Inversa (motor: 10.8.0.0/22 va de 10.8.0.0 a 10.8.3.255; Python: collapse_addresses).
        ask: [
          '¿Qué ruta cubre `10.8.0.0/24`, `10.8.1.0/24`, `10.8.2.0/24` y `10.8.3.0/24`, y nada más?',
          'Una sola ruta para esas cuatro /24 seguidas, de `10.8.0.0` a `10.8.3.0`, sin cubrir otras, lleva de destino…',
        ],
        right: ['`10.8.0.0/22`'],
        wrong: [
          '`10.8.0.0/16`',
          '`10.8.0.0/23`',
          '`10.8.0.0/20`',
          '`10.8.3.0/22`',
          '`10.8.0.0/26`',
        ],
      },
      {
        // Diagnóstico (motor: parseDest('10.8.1.0/22') → null, bad_route; 10.8.4.0/22 sí vale).
        ask: [
          'Para resumir de `10.8.1.0/24` a `10.8.4.0/24` pones `10.8.1.0/22` y sale mal escrita. ¿Por qué?',
          'La ruta `10.8.1.0/22 via 10.0.0.2` no vale. ¿Qué le pasa?',
        ],
        right: [
          'Un /22 empieza en múltiplos de 4 del tercer octeto',
          'Esa dirección no abre ningún bloque /22',
        ],
        wrong: [
          'Un resumen solo vale para dos redes',
          'El prefijo se escribe en decimal',
          'Un resumen solo admite /16 o /8',
          'Esas redes no salen por el mismo vecino',
        ],
      },
    ],
    wrong: [],
    why: 'Cuatro /24 seguidas caben en una /22 solo si la primera empieza en un múltiplo de 4: 10.8.0.0/22 va de 10.8.0.0 a 10.8.3.255.',
  },
  {
    // Unidades net-loop y net-two-exits: dos routers que se señalan.
    id: 'net-routing-loop',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Predicción (motor: r1 → r2 → r1… hasta loop en r1, a los 16 saltos).
        ask: [
          'r1 manda todo a r2 por defecto, y r2 devuelve `10.0.3.0/24` a r1. ¿Qué le pasa a un paquete para `10.0.3.10`?',
          'r1: `default via r2`. r2: `10.0.3.0/24 via r1`. Un paquete hacia `10.0.3.10`…',
        ],
        right: [
          'Va y viene entre r1 y r2 hasta agotar los saltos',
          'Rebota entre los dos hasta que se le acaba el TTL',
        ],
        wrong: [
          'r2 lo entrega en la red 10.0.3.0/24',
          'r1 lo tira por no tener ruta concreta',
          'r2 lo devuelve y r1 lo saca a internet',
          'Se pierde en el primer salto, en r1',
        ],
      },
      {
        // Diagnóstico (motor: loop, «da vueltas entre routers y se le acaban los saltos»).
        ask: [
          'La traza dice «el paquete da vueltas entre routers y se le acaban los saltos». ¿Qué buscas?',
          'Un paquete rebota entre dos routers hasta que se tira. ¿Qué tiene que estar mal?',
        ],
        right: ['Una ruta que lo devuelve al router de antes', 'Un salto que lo manda hacia atrás'],
        wrong: [
          'Una máscara demasiado ancha en el origen',
          'Una IP repetida en el destino',
          'Una ruta por defecto que falta',
          'Un destino de ruta mal escrito',
        ],
      },
    ],
    wrong: [],
    why: 'Si dos routers se señalan el uno al otro para el mismo destino, el paquete va y viene hasta agotar el TTL: busca quién lo manda hacia atrás.',
  },
  {
    // Unidad net-vlsm: repartir de mayor a menor.
    id: 'net-vlsm-order',
    topic: 'redes',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Escenario: sin huecos, solo /25 + /26 + /27 queda alineado (.0, .128, .192); de menor a
        // mayor, la /26 tendría que empezar en .32, que no es múltiplo de 64.
        ask: [
          'Partes un /24 desde el principio y sin huecos para 100, 50 y 20 máquinas. ¿En qué orden?',
          'Al repartir un /24 sin dejar huecos entre subredes de 100, 50 y 20 máquinas, vas…',
        ],
        right: ['De la más grande a la más pequeña', 'Primero la de 100, luego 50 y luego 20'],
        wrong: [
          'De la más pequeña a la más grande',
          'Primero la de 50, luego 100 y luego 20',
          'Primero la de 100, luego 20 y luego 50',
          'Todas con la misma máscara, /26',
        ],
      },
      {
        // Predicción (motor: los /25 de 192.168.10.0/24 son .0 y .128; .0 ya está usada).
        ask: [
          'En `192.168.10.0/24` ya diste `192.168.10.0/27` a 20 máquinas. ¿Dónde puede empezar la /25 para 100?',
          'Con `192.168.10.0/27` ya usada, la /25 para 100 máquinas dentro de `192.168.10.0/24` empieza en…',
        ],
        right: ['`192.168.10.128`'],
        wrong: [
          '`192.168.10.32`',
          '`192.168.10.0`',
          '`192.168.10.33`',
          '`192.168.10.64`',
          '`192.168.10.100`',
        ],
      },
    ],
    wrong: [],
    why: 'Cada subred empieza en un múltiplo de su tamaño: repartiendo de mayor a menor, todas caben alineadas y sin huecos.',
  },
]
