/**
 * Code Clicker: los textos, en español y en inglés.
 *
 * Van aquí y no en el diccionario de la web porque son un juego entero aparte
 * (y secreto): cientos de frases que no pintan nada en el resto. Catalán y
 * euskera usan los del español.
 */

import type { Lang } from '@sanatorio/contracts'

import {
  BUILDINGS,
  CPS_GOALS,
  FINGERS_BASE,
  FINGERS_MULT,
  OWNED_GOALS,
  PROJECTS,
  RESEARCH,
  TOTAL_GOALS,
} from './data'
import type { BuildingId } from './data'

type Texts = {
  ui: Record<string, string>
  /** Nombre, plural y una línea de cada edificio. */
  buildings: Record<BuildingId, [name: string, plural: string, about: string]>
  /** Los escalones de las mejoras de un edificio, del primero al último. */
  tiers: string[]
  research: Record<string, [name: string, about: string]>
  ducks: string[]
  /** Nombres de los logros de total escrito y de producción, en orden. */
  totals: string[]
  speeds: string[]
  hands: string[]
  goldens: string[]
  /** Nombre y descripción de los logros con texto propio. */
  achievements: Record<string, [name: string, about: string]>
  /**
   * Lo que se dice al pillar una trampa: título y mensaje. Las tres primeras
   * tienen el suyo; de la cuarta en adelante van los diez siguientes, en orden,
   * y después se repite el último. `{n}` son las veces que van.
   */
  busts: [title: string, text: string][]
  /** Sufijos de los números grandes, de mil en mil a partir del millón. */
  scale: string[]
  /**
   * Las noticias del rótulo, por época. `{name}` es alguien del campus;
   * `{n}`, las líneas escritas.
   */
  news: {
    early: string[]
    mid: string[]
    late: string[]
    one: string[]
    two: string[]
    three: string[]
  }
}

const es: Texts = {
  ui: {
    title: 'Code Clicker',
    code: 'líneas de código',
    perSecond: 'por segundo: {n}',
    repo: 'El repositorio de {login}',
    store: 'Tienda',
    upgrades: 'Mejoras',
    buy: 'Comprar',
    sell: 'Vender',
    owned: 'tienes {n}',
    each: 'cada uno escribe {n} por segundo',
    all: '{n} por segundo entre todos ({pct} % del total)',
    locked: '???',
    stats: 'Estadísticas',
    achievements: 'Logros',
    board: 'Clasificación',
    play: 'Código',
    caffeine: 'Cafeína: {pct} %',
    caffeineAbout: 'Un 4 % por logro. Los patitos de goma la convierten en producción.',
    statTotal: 'Escritas en esta partida',
    statAll: 'Escritas desde siempre',
    statHand: 'Escritas a mano',
    statClicks: 'Pulsaciones',
    statGolden: 'Pull requests doradas abiertas',
    statBugs: 'Bugs aplastados',
    statBuildings: 'Cosas que escriben por ti',
    statPrestige: 'Prestigio',
    statLevel: 'Nivel',
    prestigeAbout: 'Cada nivel de prestigio da un 1 % más de producción, para siempre.',
    recompile: 'Recompilar la realidad',
    recompileAbout:
      'Lo borras todo menos los logros y vuelves a empezar con el prestigio que hayas ganado. Ahora subirías a {n}.',
    recompileAsk: '¿Seguro? Vuelves a cero líneas. Subes a prestigio {n}.',
    recompileNo: 'Todavía no has escrito bastante para ganar prestigio: hace falta un billón.',
    hotfix: 'Aplicar un parche ({n})',
    hotfixAbout: 'Calma la singularidad media hora y espanta a los bugs. Cada vez cuesta más.',
    hotfixOn: 'Parche aplicado: queda {n}',
    bugs: 'Bugs pegados: {n}. Se comen un {pct} % de lo que escribes; aplástalos para recuperarlo con propina.',
    gotAchievement: 'Logro conseguido',
    golden: 'Pull request dorada',
    wrath: 'Pull request envenenada',
    fx_frenzy: '¡Frenesí! Producción ×7 durante 77 segundos',
    fx_lucky: '¡Suerte! +{n} líneas',
    fx_click: '¡Dedos de fuego! Pulsaciones ×777 durante 13 segundos',
    fx_clot: 'Merge conflict: producción a la mitad durante 66 segundos',
    fx_ruin: 'rm -rf: has perdido {n} líneas',
    fx_elder: 'La Moulinette te posee: producción ×666 durante 6 segundos',
    squashed: 'Bug aplastado: +{n}',
    rank: 'Puesto',
    level: 'Nivel',
    noBoard: 'Todavía no hay nadie. Sé la primera persona.',
    saved: 'Partida guardada',
    back: 'Salir del juego',
    tagBuilding: 'Edificio',
    tagUpgrade: 'Mejora',
    tagMouse: 'Ratón',
    tagProject: 'Proyecto de 42',
    tagDuck: 'Patito de goma',
    tagResearch: 'Investigación',
    tagAchievement: 'Logro',
    tagOwned: 'Comprada',
    cardEach: 'Cada {name} escribe {n} por segundo.',
    cardAll: '{count} {plural} escriben {n} por segundo ({pct} % del total).',
    cardMade: 'Líneas escritas hasta ahora: {n}.',
    cardGain: 'Comprarlo suma +{n} por segundo (+{pct} %).',
    cardGainFirst: 'Comprarlo suma +{n} por segundo.',
    cardClick: 'Cada pulsación da +{n} más (+{pct} %).',
    cardPayback: 'Se paga solo en {t}.',
    cardNow: 'Te llega para comprarlo.',
    cardWait: 'Te llegará en {t}.',
    cardNever: 'Aún no escribes nada solo: pulsa la tecla.',
    cardSell: 'Vender {n} te devuelve {m}.',
    cardLocked: 'Aún no lo has descubierto.',
    cardCaffeine: 'Conseguido: +4 % de cafeína.',
    cardTouch: 'Toca otra vez para comprar.',
    boughtUpgrades: 'Mejoras compradas: {n}',
    levelBar: 'Nivel {n}',
    rowSpeed: '{n} por segundo',
    soundOn: 'Sonido: sí',
    soundOff: 'Sonido: no',
    drink0: 'Café solo',
    drink1: 'Café con leche',
    drink2: 'Té de la máquina',
    drink3: 'Cacao',
    drink4: 'Mate',
    drink5: 'Refresco de cola',
    drink6: 'Bebida energética',
    drink7: 'Algo que brilla',
    clickGain: 'por pulsación: {n}',
    stale: 'Esta partida se ha seguido en otro dispositivo. Lo que hagas aquí ya no se guarda.',
    staleLoad: 'Cargar la partida guardada',
    capital: 'Capital: {n} (lo que tienes, lo que costó lo comprado y lo que deben los bugs)',
    miniOn: 'Ventanita: sí',
    miniOff: 'Ventanita: no',
    miniAbout:
      'El juego sigue mientras tengas la web abierta. La ventanita enseña cuánto llevas cuando estás en otra sección.',
    miniOpen: 'Volver a Code Clicker',
    miniClose: 'Quitar la ventanita',
    bustEyebrow: 'Sistema antitrampas',
    bustOk: 'Entendido',
    bustSold: 'Vendido todo lo de la tienda por {n} líneas.',
    offline: 'Sin conexión: la partida se guarda solo en este navegador hasta que vuelva.',
    upTier: '{building}: escriben el doble.',
    upCursor: 'El cursor y cada pulsación escriben el doble.',
    upFingers: 'El cursor y cada pulsación ganan +{n} por cada cosa que no sea un cursor.',
    upMouse: 'Cada pulsación gana un 1 % de lo que escribes por segundo.',
    upMentor: 'Pisciners de {building}: todos los pisciners escriben el doble.',
    upProject: 'Has validado {project}: toda la producción sube un {n} %.',
    upDuck: 'Explícaselo al patito: produces más cuanta más cafeína tengas.',
    upPower: 'Toda la producción sube un {n} %.',
    upPisciners: 'Los pisciners escriben {n} veces más.',
    mouseName: 'Ratón {n}',
    mentorName: 'Pisciners de {building}',
    ownName: '{building} ×{n}',
    ownAbout: 'Ten {n}.',
    totalAbout: 'Líneas escritas en total: {n}.',
    cpsAbout: 'Líneas por segundo: {n}.',
    handAbout: 'Escribe {n} líneas a mano.',
    goldenAbout: 'Abre {n} pull requests doradas.',
    bugAbout: 'Aplasta {n} bugs.',
    prestigeAbout2: 'Llega a prestigio {n}.',
  },
  buildings: {
    cursor: ['Cursor', 'cursores', 'Pulsa la tecla por ti cada diez segundos.'],
    pisciner: ['Pisciner', 'pisciners', 'Recién llegado, pica código sin hacer preguntas.'],
    cluster: ['Cluster', 'clusters', 'Filas de iMacs que no se apagan nunca.'],
    overflow: [
      'Mina de Stack Overflow',
      'minas de Stack Overflow',
      'Extrae respuestas de 2011 que aún funcionan.',
    ],
    pipeline: ['Pipeline', 'pipelines', 'Fabrica builds en cadena, día y noche.'],
    repo: ['Repositorio', 'repositorios', 'Guarda el código y le saca intereses.'],
    temple: [
      'Templo de la Norminette',
      'templos de la Norminette',
      'Veinticinco líneas por función, y amén.',
    ],
    regex: [
      'Torre de regex',
      'torres de regex',
      'Magos que invocan código con símbolos que nadie entiende.',
    ],
    docker: ['Contenedor', 'contenedores', 'Trae código de otros planetas, bien empaquetado.'],
    compiler: ['Compilador', 'compiladores', 'Transmuta café en binario.'],
    portal: [
      'Portal a producción',
      'portales a producción',
      'Una puerta al sitio del que nadie vuelve en viernes.',
    ],
    rebase: [
      'Rebase interactivo',
      'rebases interactivos',
      'Trae código de antes de que se escribiera.',
    ],
    quantum: [
      'Ordenador cuántico',
      'ordenadores cuánticos',
      'Escribe y no escribe todas las líneas a la vez.',
    ],
    neural: ['Red neuronal', 'redes neuronales', 'Convierte la luz misma en código.'],
    fuzzer: ['Fuzzer', 'fuzzers', 'Genera código de la nada y de pura suerte.'],
    recursion: [
      'Motor de recursión',
      'motores de recursión',
      'Código que escribe código que escribe código.',
    ],
    terminal: [
      'Terminal raíz',
      'terminales raíz',
      'Escribe el código con el que está escrito este juego.',
    ],
    forks: [
      'Multiverso de forks',
      'multiversos de forks',
      'En cada universo, alguien pica código para ti.',
    ],
    hive: ['Mente colmena', 'mentes colmena', 'Cerebros del tamaño de planetas soñando en C.'],
    you: ['Tú', 'copias de ti', 'Tú. Solo que muchos.'],
  },
  tiers: [
    'v1.1',
    'Refactor',
    'Optimizado con -O2',
    'Sin warnings',
    'Multihilo',
    'Vectorizado',
    'Reescrito en ensamblador',
    'Autoescrito',
    'Consciente',
    'Fuera del tiempo',
    'Absoluto',
  ],
  research: {
    lab: [
      'Laboratorio de pedagogía',
      'Investiga cómo aprenden los pisciners. Escriben 4 veces más. ¿Qué podría salir mal?',
    ],
    syntax: ['Resaltado de sintaxis', 'Los colores ayudan.'],
    style: ['Guía de estilo', 'Todos indentan igual. Por fin.'],
    ritual: ['Rituales de corrección', 'Las correcciones empiezan a parecer ceremonias.'],
    underworld: ['Servidores del sótano', 'Nadie sabe quién los puso ahí abajo.'],
    onemind: [
      'Una sola mente',
      'Los pisciners empiezan a teclear al unísono. Cada uno rinde más cuantos más son. Te miran.',
    ],
    exotic: ['Dependencias exóticas', 'Paquetes que no están en ningún registro conocido.'],
    brainsweep: ['Barrido de caché cerebral', 'Ya no hace falta que piensen. Solo que tecleen.'],
    arcane: ['Macros arcanas', 'Se expanden solas. Siguen expandiéndose.'],
    pact: [
      'El pacto de la Moulinette',
      'Ella corrige la realidad. Tú escribes. Los pisciners rinden más por cada portal.',
    ],
  },
  ducks: [
    'Patito de goma',
    'Patito becario',
    'Patito ingeniero',
    'Patito arquitecto',
    'Patito jefe de proyecto',
    'Patito fundador',
    'Patito omnisciente',
  ],
  totals: [
    'Hola, mundo',
    'Primer commit',
    'Compila a la primera',
    'Un millón de líneas',
    'Cien millones no pueden estar mal',
    'Código espagueti',
    'Deuda técnica',
    'Monolito',
    'Más líneas que el kernel',
    'Todo es un fichero',
    'El repositorio pesa',
    'Git ya no puede clonarlo',
    'Código visible desde el espacio',
    'La Tierra es un diff',
    'Sistema solar versionado',
    'Galaxia en main',
    'El universo tiene un Makefile',
    'La realidad es de solo lectura',
    'Ya no',
    'Todo es código',
  ],
  speeds: [
    'Tecleo con dos dedos',
    'Mecanografía',
    'Diez dedos',
    'Teclado mecánico',
    'Sin mirar',
    'Flujo',
    'Macro',
    'El ventilador despega',
    'Más rápido que el compilador',
    'Más rápido que el pensamiento',
    'Más rápido que la luz',
    'Causalidad rota',
    'El tiempo es un bucle',
    'Escribes antes de pensarlo',
    'Escribes antes de existir',
    'Velocidad de escritura de la realidad',
  ],
  hands: [
    'Dedos calientes',
    'Callo de programador',
    'Túnel carpiano',
    'Teclas borradas',
    'Dedos de titanio',
  ],
  goldens: ['LGTM', 'Revisor de guardia', 'Aprobado sin leer', 'Mantenedor'],
  achievements: {
    'plus:1': ['Curiosidad', 'Has pulsado la cruz. No hace nada. ¿O sí?'],
    'plus:10': ['Insistencia', 'Diez veces. La cruz sigue ahí.'],
    'plus:50': ['No deberías seguir', 'Cincuenta. Algo al otro lado ha empezado a contar contigo.'],
    'plus:100': ['Toc, toc', 'Cien. Ha abierto.'],
    'pill:red': ['La pastilla roja', 'Elegiste ver hasta dónde llega la madriguera.'],
    'stage:1': ['Te están mirando', 'Los pisciners piensan como uno.'],
    'stage:2': ['Ya no parpadean', 'El barrido ha terminado.'],
    'stage:3': ['Firmado', 'El pacto de la Moulinette.'],
    hotfix: ['Funciona en mi máquina', 'Aplica un parche a la singularidad.'],
    'bug:0': ['No es un bug', 'Es una feature. Aplástala igual.'],
    'bug:1': ['Exterminador', ''],
    'bug:2': ['Entomólogo', ''],
    'prestige:0': ['Segunda compilación', ''],
    'prestige:1': ['Nada es definitivo', ''],
    'prestige:2': ['Bucle infinito', ''],
    'hack:0': ['Sombrero blanco', 'Te han pillado haciendo trampas. Con mucha educación.'],
    'hack:1': ['Sombrero gris', 'Te han pillado otra vez. Ya con menos educación.'],
    'hack:2': ['Sombrero confiscado', 'A la tercera se vendió todo.'],
  },
  busts: [
    [
      'Hacker ético',
      'Tu partida ha escrito más código del que da tiempo a escribir, y nos hemos dado cuenta. Gracias por el hackeo: así probamos que el sistema funciona. Te has ganado un título para tu banner, «Hacker ético», y la partida vuelve a como estaba antes del truco. Eso sí: no lo vuelvas a intentar. Siempre estamos vigilando.',
    ],
    [
      'Hacker poco ético',
      'Lo has vuelto a intentar. Has perdido el título de «Hacker ético», que era el bueno, y en tu banner ahora pone «Hacker poco ético». Y esta vez sí que no vamos a tener compasión. De verdad. Era la última oportunidad.',
    ],
    [
      'Hacker desencriptado',
      'Te lo avisamos y has querido ir más allá. Tu título pasa a ser «Hacker desencriptado», con un contador de las veces que te hemos cazado. Y por pasarte de listo, el juego ha vendido automáticamente todo lo que tenías comprado en la tienda: cursores, pisciners, clusters… todo. Como somos así, te lo pagamos al 50 % de lo que costó en vez del 25 % de siempre. Las mejoras te las quedas.',
    ],
    [
      'Pillado otra vez',
      'Van {n}. Ya sabes cómo funciona: se vende todo, sube el contador de tu banner y aquí no ha pasado nada.',
    ],
    ['¿Otra?', 'Van {n}. Empezamos a pensar que lo que te gusta es el cartel de «vendido».'],
    [
      'Sí, te hemos visto',
      '{n} veces. El sistema ya ni se sorprende. Nosotros todavía un poco, la verdad.',
    ],
    [
      'Mira…',
      'Van {n}. Con el tiempo que le estás echando a esto ya habrías aprobado un proyecto. Uno de los fáciles, pero aprobado.',
    ],
    [
      'El equipo de seguridad',
      '{n}. Hemos dejado de avisar al equipo de seguridad. El equipo de seguridad es un `if`, y hasta él está cansado.',
    ],
    [
      'Ya ni nos enfadamos',
      'Van {n}. Es más bien pena, como ver a alguien empujar una puerta en la que pone «tirar». Vendido todo.',
    ],
    [
      'Vendido. Otra vez.',
      '{n}. Lo vendemos todo de nuevo. Lo haríamos con más ganas, pero se nos han acabado.',
    ],
    [
      'En serio',
      '{n}… Detrás de esto hay un juego entero. Está bastante bien. Lo hicimos con cariño. Podrías jugarlo.',
    ],
    [
      'Vale',
      '{n}. Vendido. Contador. Banner. A estas alturas te sabes el resto mejor que nosotros.',
    ],
    [
      'Sin comentarios',
      '{n}. Vendido todo. Aquí seguiremos, tú y nosotros, hasta que alguien se canse. Nosotros somos un servidor: no nos cansamos. Solo nos decepcionamos.',
    ],
  ],
  scale: [
    'millones',
    'miles de millones',
    'billones',
    'miles de billones',
    'trillones',
    'miles de trillones',
    'cuatrillones',
    'miles de cuatrillones',
    'quintillones',
    'miles de quintillones',
    'sextillones',
    'miles de sextillones',
    'septillones',
    'miles de septillones',
    'octillones',
  ],
  news: {
    early: [
      'Tu código compila. Tu madre está orgullosa.',
      'Noticias: {name} dice que tu código «no está mal para ser de un pisciner».',
      'Tu repositorio tiene una estrella. Es tuya.',
      'Noticias: la cafetera del campus registra un consumo «preocupante».',
      'Has escrito {n} líneas. Alguna incluso hace algo.',
      'Noticias: {name} corrige tres proyectos antes de desayunar.',
      'Tu Makefile hace relink, pero nadie se ha dado cuenta todavía.',
      'Noticias: estudiante encuentra un punto y coma que llevaba tres días buscando.',
    ],
    mid: [
      'Noticias: {name} avisa de que tus funciones tienen más de 25 líneas; nadie le escucha ya.',
      'Tu código se usa en todo el campus. Nadie sabe muy bien para qué.',
      'Noticias: la Norminette pide la baja por estrés.',
      'Noticias: {name} bate el récord de correcciones en un día; pide que alguien le pare.',
      'Empresas de medio mundo hacen cola para leer tu repositorio.',
      'Noticias: los clusters no se apagan por la noche. Dicen que «tienen trabajo».',
      'Noticias: {name} y {name2} montan una pizarra sobre tu código. Dura nueve horas.',
      'Tus {n} líneas ocupan más que el resto de internet.',
    ],
    late: [
      'Noticias: 42 abre un campus en cada ciudad. Luego, en cada barrio.',
      'Noticias: el Gobierno sustituye las leyes por un repositorio. {name} revisa las pull requests.',
      'Noticias: los colegios dejan de enseñar a escribir; ahora enseñan a hacer commit.',
      'Noticias: la moneda oficial pasa a ser la línea de código. Tu saldo marea.',
      'Noticias: {name}, nombrado ministro de Evaluaciones. «Solo quedan tres puntos de corrección en el país».',
      'Noticias: la luna tiene ya su propio cluster. Sin ventanas, como debe ser.',
      'Noticias: el black hole deja de ser una metáfora.',
      'Noticias: se prohíbe hablar sin indentar.',
    ],
    one: [
      'Los pisciners han dejado de usar el chat. No lo necesitan.',
      'Noticias: todos los pisciners del mundo pulsan la misma tecla a la vez. Los sismógrafos lo notan.',
      'Noticias: {name} asegura que su corrección «se corrigió sola».',
      'Te miran cuando pasas. Todos. A la vez.',
      'Noticias: nadie recuerda haber escrito la última versión de la Norma.',
      '«Escribe», dicen los pisciners. No mueven la boca.',
    ],
    two: [
      'Noticias: los pisciners ya no duermen. Tampoco parpadean.',
      'Noticias: aparecen funciones en el código que nadie ha escrito. Pasan la Norminette.',
      'Noticias: {name} intenta cerrar sesión. La sesión no le deja.',
      'El compilador ha empezado a devolver cosas que no le has pedido.',
      'Noticias: los relojes del campus marcan todos 42:42.',
      '«Más», dice algo desde dentro de los clusters.',
    ],
    three: [
      'Noticias: la gravedad pasa a ser un parámetro de configuración. Alguien lo ha tocado.',
      'Noticias: {name} hace un rebase del martes pasado. El martes ya no existió.',
      'La realidad tiene un diff pendiente. Lo has escrito tú.',
      'Noticias: se detecta un segfault en el cielo, hacia el noroeste.',
      'Noticias: la Moulinette corrige a una persona. La persona suspende. La persona deja de compilar.',
      'Ya no hay noticias. Solo logs.',
      'undefined behavior: la realidad no garantiza el resultado.',
      'Todo es código. Tú también. Sigue escribiendo.',
    ],
  },
}

const en: Texts = {
  ui: {
    title: 'Code Clicker',
    code: 'lines of code',
    perSecond: 'per second: {n}',
    repo: "{login}'s repository",
    store: 'Store',
    upgrades: 'Upgrades',
    buy: 'Buy',
    sell: 'Sell',
    owned: 'you have {n}',
    each: 'each writes {n} per second',
    all: '{n} per second between them all ({pct}% of the total)',
    locked: '???',
    stats: 'Stats',
    achievements: 'Achievements',
    board: 'Leaderboard',
    play: 'Code',
    caffeine: 'Caffeine: {pct}%',
    caffeineAbout: '4% per achievement. Rubber ducks turn it into production.',
    statTotal: 'Written this run',
    statAll: 'Written all time',
    statHand: 'Written by hand',
    statClicks: 'Key presses',
    statGolden: 'Golden pull requests opened',
    statBugs: 'Bugs squashed',
    statBuildings: 'Things writing for you',
    statPrestige: 'Prestige',
    statLevel: 'Level',
    prestigeAbout: 'Each prestige level gives 1% more production, forever.',
    recompile: 'Recompile reality',
    recompileAbout:
      'You wipe everything but the achievements and start over with the prestige you have earned. Right now you would reach {n}.',
    recompileAsk: 'Sure? You go back to zero lines. You reach prestige {n}.',
    recompileNo: 'You have not written enough to earn prestige yet: it takes a trillion.',
    hotfix: 'Apply a hotfix ({n})',
    hotfixAbout:
      'Calms the singularity for half an hour and scares the bugs off. It costs more each time.',
    hotfixOn: 'Hotfix applied: {n} left',
    bugs: 'Bugs attached: {n}. They eat {pct}% of what you write; squash them to get it back with a tip.',
    gotAchievement: 'Achievement unlocked',
    golden: 'Golden pull request',
    wrath: 'Poisoned pull request',
    fx_frenzy: 'Frenzy! Production ×7 for 77 seconds',
    fx_lucky: 'Lucky! +{n} lines',
    fx_click: 'Fingers of fire! Key presses ×777 for 13 seconds',
    fx_clot: 'Merge conflict: production halved for 66 seconds',
    fx_ruin: 'rm -rf: you lost {n} lines',
    fx_elder: 'The Moulinette possesses you: production ×666 for 6 seconds',
    squashed: 'Bug squashed: +{n}',
    rank: 'Rank',
    level: 'Level',
    noBoard: 'Nobody here yet. Be the first.',
    saved: 'Game saved',
    back: 'Leave the game',
    tagBuilding: 'Building',
    tagUpgrade: 'Upgrade',
    tagMouse: 'Mouse',
    tagProject: '42 project',
    tagDuck: 'Rubber duck',
    tagResearch: 'Research',
    tagAchievement: 'Achievement',
    tagOwned: 'Bought',
    cardEach: 'Each {name} writes {n} per second.',
    cardAll: '{count} {plural} write {n} per second ({pct}% of total).',
    cardMade: 'Lines written so far: {n}.',
    cardGain: 'Buying it adds +{n} per second (+{pct}%).',
    cardGainFirst: 'Buying it adds +{n} per second.',
    cardClick: 'Each press gives +{n} more (+{pct}%).',
    cardPayback: 'Pays for itself in {t}.',
    cardNow: 'You can afford it.',
    cardWait: 'You can afford it in {t}.',
    cardNever: 'Nothing writes for you yet: press the key.',
    cardSell: 'Selling {n} gives back {m}.',
    cardLocked: 'You have not discovered it yet.',
    cardCaffeine: 'Unlocked: +4% caffeine.',
    cardTouch: 'Tap again to buy.',
    boughtUpgrades: 'Upgrades bought: {n}',
    levelBar: 'Level {n}',
    rowSpeed: '{n} per second',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    drink0: 'Black coffee',
    drink1: 'Latte',
    drink2: 'Vending machine tea',
    drink3: 'Cocoa',
    drink4: 'Mate',
    drink5: 'Cola',
    drink6: 'Energy drink',
    drink7: 'Something that glows',
    clickGain: 'per press: {n}',
    stale: 'This game has been continued on another device. What you do here is no longer saved.',
    staleLoad: 'Load the saved game',
    capital: 'Worth: {n} (what you hold, what your purchases cost and what the bugs owe)',
    miniOn: 'Mini window: on',
    miniOff: 'Mini window: off',
    miniAbout:
      'The game keeps going while the site is open. The mini window shows your count when you are in another section.',
    miniOpen: 'Back to Code Clicker',
    miniClose: 'Hide the mini window',
    bustEyebrow: 'Anti-cheat system',
    bustOk: 'Got it',
    bustSold: 'Everything from the shop sold for {n} lines.',
    offline: 'Offline: the game is saved only in this browser until the connection is back.',
    upTier: '{building}: they write twice as much.',
    upCursor: 'The cursor and every key press write twice as much.',
    upFingers: 'The cursor and every key press gain +{n} for each thing that is not a cursor.',
    upMouse: 'Every key press gains 1% of what you write per second.',
    upMentor: '{building} pisciners: every pisciner writes twice as much.',
    upProject: 'You validated {project}: all production goes up {n}%.',
    upDuck: 'Explain it to the duck: you produce more the more caffeine you have.',
    upPower: 'All production goes up {n}%.',
    upPisciners: 'Pisciners write {n} times more.',
    mouseName: 'Mouse {n}',
    mentorName: '{building} pisciners',
    ownName: '{building} ×{n}',
    ownAbout: 'Have {n}.',
    totalAbout: 'Lines written in total: {n}.',
    cpsAbout: 'Lines per second: {n}.',
    handAbout: 'Write {n} lines by hand.',
    goldenAbout: 'Open {n} golden pull requests.',
    bugAbout: 'Squash {n} bugs.',
    prestigeAbout2: 'Reach prestige {n}.',
  },
  buildings: {
    cursor: ['Cursor', 'cursors', 'Presses the key for you every ten seconds.'],
    pisciner: ['Pisciner', 'pisciners', 'Fresh arrival, bangs out code without asking questions.'],
    cluster: ['Cluster', 'clusters', 'Rows of iMacs that never switch off.'],
    overflow: [
      'Stack Overflow mine',
      'Stack Overflow mines',
      'Digs up answers from 2011 that still work.',
    ],
    pipeline: ['Pipeline', 'pipelines', 'Churns out builds on a belt, day and night.'],
    repo: ['Repository', 'repositories', 'Stores the code and earns interest on it.'],
    temple: [
      'Temple of the Norminette',
      'temples of the Norminette',
      'Twenty-five lines per function, and amen.',
    ],
    regex: [
      'Regex tower',
      'regex towers',
      'Wizards summoning code with symbols nobody understands.',
    ],
    docker: ['Container', 'containers', 'Ships code in from other planets, neatly packed.'],
    compiler: ['Compiler', 'compilers', 'Transmutes coffee into binary.'],
    portal: [
      'Portal to production',
      'portals to production',
      'A door to the place nobody returns from on a Friday.',
    ],
    rebase: [
      'Interactive rebase',
      'interactive rebases',
      'Brings code from before it was written.',
    ],
    quantum: [
      'Quantum computer',
      'quantum computers',
      'Writes and does not write every line at once.',
    ],
    neural: ['Neural network', 'neural networks', 'Turns light itself into code.'],
    fuzzer: ['Fuzzer', 'fuzzers', 'Makes code out of nothing and sheer luck.'],
    recursion: ['Recursion engine', 'recursion engines', 'Code that writes code that writes code.'],
    terminal: ['Root terminal', 'root terminals', 'Writes the very code this game is written in.'],
    forks: [
      'Multiverse of forks',
      'multiverses of forks',
      'In every universe, someone is coding for you.',
    ],
    hive: ['Hive mind', 'hive minds', 'Planet-sized brains dreaming in C.'],
    you: ['You', 'copies of you', 'You. Only many.'],
  },
  tiers: [
    'v1.1',
    'Refactor',
    'Optimised with -O2',
    'No warnings',
    'Multithreaded',
    'Vectorised',
    'Rewritten in assembly',
    'Self-written',
    'Sentient',
    'Outside time',
    'Absolute',
  ],
  research: {
    lab: [
      'Pedagogy lab',
      'Researches how pisciners learn. They write 4 times more. What could go wrong?',
    ],
    syntax: ['Syntax highlighting', 'Colours help.'],
    style: ['Style guide', 'Everyone indents the same. At last.'],
    ritual: ['Evaluation rituals', 'Evaluations are starting to look like ceremonies.'],
    underworld: ['Basement servers', 'Nobody knows who put them down there.'],
    onemind: [
      'One mind',
      'The pisciners start typing in unison. Each does more the more there are. They are looking at you.',
    ],
    exotic: ['Exotic dependencies', 'Packages found in no known registry.'],
    brainsweep: ['Brain cache sweep', 'They no longer need to think. Only to type.'],
    arcane: ['Arcane macros', 'They expand by themselves. They keep expanding.'],
    pact: [
      'The Moulinette pact',
      'She grades reality. You write. Pisciners do more for each portal.',
    ],
  },
  ducks: [
    'Rubber duck',
    'Intern duck',
    'Engineer duck',
    'Architect duck',
    'Project manager duck',
    'Founder duck',
    'Omniscient duck',
  ],
  totals: [
    'Hello, world',
    'First commit',
    'Compiles first time',
    'A million lines',
    'A hundred million cannot be wrong',
    'Spaghetti code',
    'Technical debt',
    'Monolith',
    'More lines than the kernel',
    'Everything is a file',
    'The repository is heavy',
    'Git can no longer clone it',
    'Code visible from space',
    'The Earth is a diff',
    'Solar system under version control',
    'Galaxy on main',
    'The universe has a Makefile',
    'Reality is read-only',
    'Not any more',
    'Everything is code',
  ],
  speeds: [
    'Two-finger typing',
    'Touch typing',
    'Ten fingers',
    'Mechanical keyboard',
    'Without looking',
    'Flow',
    'Macro',
    'The fan takes off',
    'Faster than the compiler',
    'Faster than thought',
    'Faster than light',
    'Causality broken',
    'Time is a loop',
    'You write before thinking it',
    'You write before existing',
    'Write speed of reality',
  ],
  hands: [
    'Warm fingers',
    "Programmer's callus",
    'Carpal tunnel',
    'Worn-off keys',
    'Titanium fingers',
  ],
  goldens: ['LGTM', 'Reviewer on call', 'Approved without reading', 'Maintainer'],
  achievements: {
    'plus:1': ['Curiosity', 'You pressed the cross. It does nothing. Or does it?'],
    'plus:10': ['Insistence', 'Ten times. The cross is still there.'],
    'plus:50': [
      'You should not go on',
      'Fifty. Something on the other side has started counting on you.',
    ],
    'plus:100': ['Knock, knock', 'A hundred. It opened.'],
    'pill:red': ['The red pill', 'You chose to see how deep the rabbit hole goes.'],
    'stage:1': ['They are watching you', 'The pisciners think as one.'],
    'stage:2': ['They no longer blink', 'The sweep is done.'],
    'stage:3': ['Signed', 'The Moulinette pact.'],
    hotfix: ['Works on my machine', 'Apply a hotfix to the singularity.'],
    'bug:0': ['Not a bug', 'It is a feature. Squash it anyway.'],
    'bug:1': ['Exterminator', ''],
    'bug:2': ['Entomologist', ''],
    'prestige:0': ['Second compilation', ''],
    'prestige:1': ['Nothing is final', ''],
    'prestige:2': ['Infinite loop', ''],
    'hack:0': ['White hat', 'You got caught cheating. Very politely.'],
    'hack:1': ['Grey hat', 'You got caught again. Less politely.'],
    'hack:2': ['Confiscated hat', 'Third time, everything got sold.'],
  },
  busts: [
    [
      'Ethical hacker',
      'Your game wrote more code than there was time to write, and we noticed. Thanks for the hack: it proves the system works. You have earned a title for your banner, "Ethical hacker", and your game is back to how it was before the trick. But do not try it again. We are always watching.',
    ],
    [
      'Not so ethical hacker',
      'You tried again. You have lost the "Ethical hacker" title, which was the good one, and your banner now says "Not so ethical hacker". And this time there will be no mercy. Really. That was your last chance.',
    ],
    [
      'Decrypted hacker',
      'We warned you and you went further. Your title is now "Decrypted hacker", with a counter of the times we have caught you. And for being too clever, the game has automatically sold everything you had bought in the shop: cursors, pisciners, clusters… all of it. Because we are like that, you get 50% of what it cost instead of the usual 25%. You keep the upgrades.',
    ],
    [
      'Caught again',
      'That makes {n}. You know how it goes: everything gets sold, the counter on your banner goes up, and nothing happened here.',
    ],
    ['Another one?', 'That makes {n}. We are starting to think you just like the "sold" sign.'],
    [
      'Yes, we saw you',
      '{n} times. The system is not even surprised any more. We still are, a little.',
    ],
    [
      'Look…',
      'That makes {n}. With the time you are putting into this you could have passed a project. An easy one, but passed.',
    ],
    [
      'The security team',
      '{n}. We stopped telling the security team. The security team is an `if`, and even it is tired.',
    ],
    [
      'We are not even angry',
      'That makes {n}. It is more like pity, like watching someone push a door that says "pull". Everything sold.',
    ],
    [
      'Sold. Again.',
      '{n}. We are selling everything again. We would do it with more enthusiasm, but we ran out.',
    ],
    [
      'Seriously',
      '{n}… There is a whole game behind this. It is rather good. We made it with love. You could play it.',
    ],
    ['Fine', '{n}. Sold. Counter. Banner. By now you know the rest better than we do.'],
    [
      'No comment',
      '{n}. Everything sold. We will stay here, you and us, until someone gets tired. We are a server: we do not get tired. We only get disappointed.',
    ],
  ],
  scale: [
    'million',
    'billion',
    'trillion',
    'quadrillion',
    'quintillion',
    'sextillion',
    'septillion',
    'octillion',
    'nonillion',
    'decillion',
    'undecillion',
    'duodecillion',
    'tredecillion',
    'quattuordecillion',
    'quindecillion',
  ],
  news: {
    early: [
      'Your code compiles. Your mother is proud.',
      "News: {name} says your code is 'not bad for a pisciner'.",
      'Your repository has one star. It is yours.',
      "News: the campus coffee machine reports 'worrying' usage.",
      'You have written {n} lines. Some even do something.',
      'News: {name} evaluates three projects before breakfast.',
      'Your Makefile relinks, but nobody has noticed yet.',
      'News: student finds a semicolon they had been hunting for three days.',
    ],
    mid: [
      'News: {name} warns your functions run over 25 lines; nobody listens any more.',
      'Your code is used across the campus. Nobody quite knows what for.',
      'News: the Norminette goes on stress leave.',
      'News: {name} breaks the record for evaluations in a day; asks for someone to stop them.',
      'Companies from half the world queue up to read your repository.',
      "News: the clusters no longer switch off at night. They say they 'have work to do'.",
      'News: {name} and {name2} run a whiteboard session on your code. It lasts nine hours.',
      'Your {n} lines take up more than the rest of the internet.',
    ],
    late: [
      'News: 42 opens a campus in every city. Then in every neighbourhood.',
      'News: the Government replaces the law with a repository. {name} reviews the pull requests.',
      'News: schools stop teaching writing; they teach committing.',
      'News: the line of code becomes the official currency. Your balance is dizzying.',
      "News: {name} appointed Minister of Evaluations. 'There are three evaluation points left in the country.'",
      'News: the moon now has its own cluster. No windows, as it should be.',
      'News: the black hole stops being a metaphor.',
      'News: speaking without indenting is banned.',
    ],
    one: [
      'The pisciners have stopped using the chat. They do not need it.',
      'News: every pisciner in the world presses the same key at once. Seismographs notice.',
      "News: {name} claims their evaluation 'evaluated itself'.",
      'They look at you when you walk by. All of them. At once.',
      'News: nobody remembers writing the latest version of the Norm.',
      "'Write,' say the pisciners. Their mouths do not move.",
    ],
    two: [
      'News: pisciners no longer sleep. Nor blink.',
      'News: functions nobody wrote appear in the code. They pass the Norminette.',
      'News: {name} tries to log out. The session will not let them.',
      'The compiler has started returning things you did not ask for.',
      'News: every clock on campus reads 42:42.',
      "'More,' says something from inside the clusters.",
    ],
    three: [
      'News: gravity becomes a configuration parameter. Someone has changed it.',
      'News: {name} rebases last Tuesday. Tuesday never happened.',
      'Reality has a pending diff. You wrote it.',
      'News: a segfault is detected in the sky, to the north-west.',
      'News: the Moulinette grades a person. The person fails. The person stops compiling.',
      'There is no more news. Only logs.',
      'undefined behavior: reality does not guarantee the result.',
      'Everything is code. So are you. Keep writing.',
    ],
  },
}

const TEXTS: Record<Lang, Texts> = { es, en, ca: es, eu: es }

export const textsOf = (lang: Lang): Texts => TEXTS[lang]

/** Sustituye `{clave}` por su valor. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => String(vars[key] ?? whole))
}

/**
 * Un número grande, legible: "1,234 millones", "12 trillion". Hasta un millón
 * se escribe entero, con separador de miles.
 */
export function short(value: number, lang: Lang, decimals = 3): string {
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'

  if (!Number.isFinite(value)) return '∞'
  if (Math.abs(value) < 1e6) {
    return value.toLocaleString(locale, {
      maximumFractionDigits: Math.abs(value) < 100 && value % 1 !== 0 ? 1 : 0,
    })
  }

  const scale = textsOf(lang).scale
  const step = Math.min(scale.length - 1, Math.floor(Math.log10(Math.abs(value)) / 3) - 2)

  return `${(value / 10 ** ((step + 2) * 3)).toLocaleString(locale, { maximumFractionDigits: decimals })} ${scale[step] ?? ''}`
}

/** Título y mensaje de la ventana de la trampa número `n`. */
export function bustText(n: number, lang: Lang): [title: string, text: string] {
  const { busts } = textsOf(lang)
  const [title, text] = busts[Math.min(n, busts.length) - 1] ?? ['', '']

  return [title, fill(text, { n })]
}

/** Nombre y descripción de un logro. */
export function achievementText(id: string, lang: Lang): [name: string, about: string] {
  const texts = textsOf(lang)
  const [kind = '', second = '', third = ''] = id.split(':')
  const index = Number(second)
  const own = texts.achievements[id]

  if (own !== undefined && own[1] !== '') return own

  switch (kind) {
    case 'total':
      return [
        texts.totals[index] ?? id,
        fill(texts.ui.totalAbout ?? '', { n: short(TOTAL_GOALS[index] ?? 0, lang) }),
      ]
    case 'cps':
      return [
        texts.speeds[index] ?? id,
        fill(texts.ui.cpsAbout ?? '', { n: short(CPS_GOALS[index] ?? 0, lang) }),
      ]
    case 'hand':
      return [
        texts.hands[index] ?? id,
        fill(texts.ui.handAbout ?? '', { n: short(10 ** (3 + 2 * index), lang) }),
      ]
    case 'golden':
      return [
        texts.goldens[index] ?? id,
        fill(texts.ui.goldenAbout ?? '', { n: [1, 7, 27, 77][index] ?? 0 }),
      ]
    case 'bug':
      return [own?.[0] ?? id, fill(texts.ui.bugAbout ?? '', { n: [1, 50, 200][index] ?? 0 })]
    case 'prestige':
      return [own?.[0] ?? id, fill(texts.ui.prestigeAbout2 ?? '', { n: [1, 10, 100][index] ?? 0 })]
    case 'own': {
      const building = BUILDINGS.find((entry) => entry.id === second)
      const goal = OWNED_GOALS[Number(third)] ?? 0
      const names = building === undefined ? undefined : texts.buildings[building.id]

      return [
        fill(texts.ui.ownName ?? '', { building: names?.[0] ?? second, n: goal }),
        fill(texts.ui.ownAbout ?? '', {
          n: `${goal} ${goal === 1 ? (names?.[0] ?? '') : (names?.[1] ?? '')}`,
        }),
      ]
    }
    default:
      return own ?? [id, '']
  }
}

/** Nombre y descripción de una mejora de la tienda. */
export function upgradeText(id: string, lang: Lang): [name: string, about: string] {
  const texts = textsOf(lang)
  const ui = (key: string): string => texts.ui[key] ?? key
  const [kind = '', second = '', third = ''] = id.split(':')
  const building = texts.buildings[second as BuildingId] as
    [name: string, plural: string, about: string] | undefined

  switch (kind) {
    case 'cursor': {
      const tier = Number(second)

      return [
        `${texts.buildings.cursor[0]} · ${texts.tiers[tier] ?? ''}`,
        tier < 3
          ? ui('upCursor')
          : fill(ui('upFingers'), {
              n: short(
                FINGERS_BASE *
                  FINGERS_MULT.slice(0, tier - 2).reduce((total, step) => total * step, 1),
                lang,
              ),
            }),
      ]
    }
    case 'mouse':
      return [fill(ui('mouseName'), { n: texts.tiers[Number(second)] ?? '' }), ui('upMouse')]
    case 'tier':
      return [
        `${building?.[0] ?? second} · ${texts.tiers[Number(third)] ?? ''}`,
        fill(ui('upTier'), { building: capital(building?.[1] ?? second) }),
      ]
    case 'mentor':
      return [
        fill(ui('mentorName'), { building: building?.[0] ?? second }),
        fill(ui('upMentor'), { building: building?.[0] ?? second }),
      ]
    case 'project': {
      const project = PROJECTS.find((entry) => entry.id === second)

      return [second, fill(ui('upProject'), { project: second, n: project?.power ?? 0 })]
    }
    case 'duck':
      return [texts.ducks[Number(second)] ?? id, ui('upDuck')]
    case 'research': {
      const [name, about] = texts.research[second] ?? [id, '']
      const step = RESEARCH.find((entry) => entry.id === second)
      const effect =
        step?.power !== undefined
          ? fill(ui('upPower'), { n: step.power })
          : step?.pisciners !== undefined && second !== 'lab'
            ? fill(ui('upPisciners'), { n: step.pisciners })
            : ''

      return [name, `${about} ${effect}`.trim()]
    }
    default:
      return [id, '']
  }
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Las noticias que tocan según cómo va la partida: mandan las de la
 * singularidad; si no ha empezado, las del tamaño de lo escrito.
 */
export function newsFor(lang: Lang, stage: number, total: number): string[] {
  const { news } = textsOf(lang)

  if (stage >= 3) return news.three
  if (stage === 2) return news.two
  if (stage === 1) return news.one

  return total < 1e6 ? news.early : total < 1e12 ? news.mid : news.late
}
