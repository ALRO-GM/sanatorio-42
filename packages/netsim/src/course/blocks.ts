/**
 * Los nueve bloques del curso de redes, por nivel. Cada bloque acaba en un
 * jefe contrarreloj y cada nivel en un jefe final con su certificado. El orden
 * es el de NetPractice (direcciones, la misma red, el router, subredes, rutas,
 * internet) con dos cosas que allí se aprenden a golpes: diagnosticar por
 * dónde muere el paquete y diseñar un plan de direcciones.
 */

import type { Block } from './types.js'

export const BLOCKS: Block[] = [
  {
    n: 1,
    tier: 'beginner',
    es: {
      title: 'Direcciones y máscaras',
      pitch: 'Octetos, prefijos, red, broadcast y rango: las cuentas, con los 32 bits a la vista.',
    },
    en: {
      title: 'Addresses and masks',
      pitch: 'Octets, prefixes, network, broadcast and range: the maths, with all 32 bits in view.',
    },
    jobs: ['sysadmin', 'devops', 'backend', 'support'],
  },
  {
    n: 2,
    tier: 'beginner',
    es: {
      title: 'La misma red',
      pitch: 'Dos máquinas, un switch y las direcciones que no se pueden dar.',
    },
    en: {
      title: 'The same network',
      pitch: 'Two machines, a switch and the addresses you cannot hand out.',
    },
    jobs: ['sysadmin', 'support', 'devops'],
  },
  {
    n: 3,
    tier: 'beginner',
    es: {
      title: 'El router',
      pitch: 'Un pie en cada red, la puerta de enlace y el viaje de ida y vuelta.',
    },
    en: {
      title: 'The router',
      pitch: 'One foot in each network, the gateway and the trip there and back.',
    },
    jobs: ['sysadmin', 'devops', 'backend', 'sre'],
  },
  {
    n: 4,
    tier: 'intermediate',
    es: {
      title: 'Subredes',
      pitch: 'Partir un rango, enlaces de /30, cuántas máquinas caben y redes que se pisan.',
    },
    en: {
      title: 'Subnets',
      pitch: 'Splitting a range, /30 links, how many machines fit and overlapping networks.',
    },
    jobs: ['sysadmin', 'devops', 'platform'],
  },
  {
    n: 5,
    tier: 'intermediate',
    es: {
      title: 'Tablas de rutas',
      pitch: 'Destino y siguiente salto, la ruta por defecto, la vuelta y la más concreta.',
    },
    en: {
      title: 'Routing tables',
      pitch: 'Destination and next hop, the default route, the way back and the most specific.',
    },
    jobs: ['devops', 'sre', 'platform', 'sysadmin'],
  },
  {
    n: 6,
    tier: 'intermediate',
    es: {
      title: 'Salir a internet',
      pitch: 'Privadas y públicas, la salida y la ruta con la que internet vuelve.',
    },
    en: {
      title: 'Reaching the internet',
      pitch: 'Private and public, the way out and the route the internet uses to come back.',
    },
    jobs: ['devops', 'backend', 'security', 'sysadmin'],
  },
  {
    n: 7,
    tier: 'advanced',
    es: {
      title: 'Diagnóstico',
      pitch: 'Leer dónde muere el paquete: máscaras que mienten, IP repetidas y vueltas perdidas.',
    },
    en: {
      title: 'Diagnosis',
      pitch: 'Reading where the packet dies: lying masks, duplicated IPs and lost replies.',
    },
    jobs: ['sre', 'devops', 'support', 'sysadmin'],
  },
  {
    n: 8,
    tier: 'advanced',
    es: {
      title: 'Diseño de direcciones',
      pitch: 'Subredes de tamaños distintos, routers en fila y rutas que resumen.',
    },
    en: {
      title: 'Address design',
      pitch: 'Subnets of different sizes, routers in a row and routes that summarise.',
    },
    jobs: ['platform', 'sysadmin', 'devops'],
  },
  {
    n: 9,
    tier: 'advanced',
    es: {
      title: 'Varios caminos',
      pitch: 'Bucles, dos salidas y un servidor visible desde fuera.',
    },
    en: {
      title: 'More than one path',
      pitch: 'Loops, two ways out and a server visible from outside.',
    },
    jobs: ['sre', 'platform', 'security', 'devops'],
  },
]
