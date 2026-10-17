/**
 * Banco de Not-games: redes, servidores y despliegue. Direcciones y máscaras
 * (NetPractice), sockets y HTTP (webserv, ft_irc), contenedores (Inception) y
 * la web entera (ft_transcendence).
 */

import type { Concept } from './types.js'

const NETPRACTICE = ['netpractice']
const SERVERS = ['webserv', 'ft_irc']
const INCEPTION = ['inception']
const TRANSCENDENCE = ['ft_transcendence']
const NETWORK = [...NETPRACTICE, ...SERVERS, ...INCEPTION, ...TRANSCENDENCE]

export const NETWORK_BANK: readonly Concept[] = [
  {
    id: 'net-mask-hosts',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántas direcciones de equipo caben en una red /24?',
          'Una máscara 255.255.255.0 deja sitio para…',
        ],
        right: ['254', '256 menos la de red y la de difusión'],
      },
      {
        ask: [
          '¿Cuántas direcciones de equipo caben en una red /30?',
          'Una máscara 255.255.255.252 deja sitio para…',
        ],
        right: ['2', 'Dos'],
        wrong: ['4', '30', '1'],
      },
    ],
    wrong: ['256', '255', '24', '128', '512'],
    why: 'Quedan 32 - n bits para equipos: 2^(32-n) direcciones, menos la de red y la de difusión.',
  },
  {
    id: 'net-mask-dotted',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué máscara es /26?', '/26 escrito con puntos es…'],
        right: ['255.255.255.192'],
      },
      {
        ask: ['¿Qué máscara es /16?', '/16 escrito con puntos es…'],
        right: ['255.255.0.0'],
        wrong: ['255.0.0.0', '255.255.255.0', '255.255.16.0'],
      },
    ],
    wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.26', '255.255.255.0'],
    why: 'Son n unos seguidos: /26 = 24 + 2 bits en el último byte = 11000000 = 192.',
  },
  {
    id: 'net-same-network',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          '¿Están en la misma red 192.168.1.10/25 y 192.168.1.200/25?',
          'Con máscara /25, ¿pueden hablarse directamente 192.168.1.10 y 192.168.1.200?',
        ],
        right: [
          'No: /25 parte el último byte en 0–127 y 128–255',
          'No, una cae en la primera mitad y la otra en la segunda',
        ],
      },
      {
        ask: [
          '¿Están en la misma red 10.0.0.5/24 y 10.0.0.250/24?',
          'Con máscara /24, ¿pueden hablarse directamente 10.0.0.5 y 10.0.0.250?',
        ],
        right: ['Sí: comparten los tres primeros bytes', 'Sí, las dos son 10.0.0.x'],
        wrong: ['No: /24 parte el último byte en dos mitades', 'No, 250 está fuera de rango'],
      },
    ],
    wrong: [
      'Sí, siempre que empiecen igual',
      'Solo con un router',
      'Depende de la puerta de enlace',
      'No se puede saber sin la MAC',
    ],
    why: 'Misma red = mismos bits en la parte de la máscara. Con /25 el bit alto del último byte cuenta.',
  },
  {
    id: 'net-private',
    topic: 'redes',
    needs: { projects: NETWORK },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuál de estas direcciones es privada (no sale a Internet tal cual)?',
          'Una dirección de red local privada es…',
        ],
        right: ['192.168.0.10', '10.1.2.3', '172.16.5.4'],
      },
      {
        ask: ['¿Qué es 127.0.0.1?', 'La dirección 127.0.0.1 es…'],
        right: ['La propia máquina (localhost)', 'El bucle local: tú mismo'],
        wrong: ['La puerta de enlace', 'El DNS de Google', 'La de difusión'],
      },
    ],
    wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250', '142.250.1.1'],
    why: '10/8, 172.16/12 y 192.168/16 son privadas; 127.0.0.1 eres tú.',
  },
  {
    id: 'net-gateway',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Para qué sirve la puerta de enlace (gateway)?',
          'Un paquete para otra red se manda a…',
        ],
        right: [
          'Es a quien se mandan los paquetes para otras redes',
          'La puerta de enlace, que los reenvía',
        ],
      },
      {
        ask: ['¿Qué significa la ruta 0.0.0.0/0?', 'Una ruta a 0.0.0.0/0 es…'],
        right: ['La ruta por defecto: todo lo que no tenga otra', 'Cualquier destino'],
        wrong: ['Ningún destino', 'Solo la red local', 'La propia máquina'],
      },
    ],
    wrong: [
      'Traduce nombres a direcciones',
      'Reparte direcciones IP',
      'Cifra el tráfico',
      'Es el switch',
    ],
    why: 'Lo que no es de tu red va al router (gateway); 0.0.0.0/0 casa con todo y por eso es la ruta por defecto.',
  },
  {
    id: 'net-tcp-udp',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué garantiza TCP que no garantiza UDP?', 'TCP, a diferencia de UDP…'],
        right: ['Que llega todo, en orden y sin duplicados', 'Entrega fiable y ordenada'],
      },
      {
        ask: ['¿Qué protocolo de transporte usa HTTP/1.1?', 'HTTP/1.1 viaja sobre…'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'IP directamente'],
      },
    ],
    wrong: [
      'Que va más rápido',
      'Que va cifrado',
      'Que llega a todos los equipos',
      'Que no hace falta puerto',
    ],
    why: 'TCP numera, confirma y reenvía; UDP manda y se olvida.',
  },
  {
    id: 'net-dns',
    topic: 'redes',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué hace el DNS?',
          'Cuando escribes un nombre como intra.42.fr, ¿quién lo convierte en una IP?',
        ],
        right: ['Traduce nombres de dominio a direcciones IP', 'El DNS'],
      },
    ],
    wrong: [
      'Reparte direcciones IP',
      'Cifra la conexión',
      'Encamina paquetes',
      'Guarda las páginas web',
      'El router, solo',
    ],
    why: 'El DNS es la agenda de Internet: de nombre a dirección.',
  },
  {
    id: 'srv-socket-steps',
    topic: 'sockets',
    needs: { projects: SERVERS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿En qué orden prepara un servidor TCP su socket?',
          'Los pasos para empezar a aceptar conexiones son…',
        ],
        right: ['socket, bind, listen, accept'],
      },
      {
        ask: ['¿Qué devuelve `accept`?', 'Cada vez que accept acepta una conexión, devuelve…'],
        right: [
          'Un descriptor nuevo para hablar con ese cliente',
          'Un socket nuevo, solo para esa conexión',
        ],
        wrong: ['El mismo socket que escucha', 'El puerto del cliente', 'El número de clientes'],
      },
    ],
    wrong: [
      'socket, listen, bind, accept',
      'bind, socket, accept, listen',
      'socket, connect, listen, accept',
      'listen, socket, bind, accept',
    ],
    why: 'Se crea, se ata a un puerto, se pone a escuchar y se aceptan conexiones, cada una con su descriptor.',
  },
  {
    id: 'srv-poll',
    topic: 'sockets',
    needs: { projects: SERVERS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Para qué sirve `poll` (o select, epoll, kqueue) en un servidor?', 'poll permite…'],
        right: [
          'Esperar a la vez en muchos descriptores y saber cuáles están listos',
          'Atender muchos clientes con un solo hilo',
        ],
      },
      {
        ask: [
          '¿Por qué no se debe hacer `read` en un socket sin que poll diga que está listo?',
          'Leer un socket que no tiene nada, en modo bloqueante…',
        ],
        right: [
          'Se queda bloqueado y para a todos los demás clientes',
          'Bloquea el servidor entero',
        ],
        wrong: ['Devuelve 0 siempre', 'Cierra la conexión', 'No pasa nada'],
      },
    ],
    wrong: [
      'Para crear hilos',
      'Para cifrar',
      'Para resolver nombres',
      'Para medir el tiempo de respuesta',
    ],
    why: 'Con un único bucle y poll, el servidor solo lee o escribe donde no va a bloquearse.',
  },
  {
    id: 'srv-partial',
    topic: 'sockets',
    needs: { projects: SERVERS },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Un cliente manda «PRIVMSG #42 :hola\\r\\n», pero `recv` te da solo «PRIVMSG #4». ¿Qué haces?',
          'recv devuelve medio mensaje. ¿Qué debe hacer el servidor?',
        ],
        right: [
          'Guardarlo en un búfer de ese cliente hasta que llegue el fin de línea',
          'Acumular hasta tener un mensaje completo y entonces procesarlo',
        ],
      },
    ],
    wrong: [
      'Rechazarlo: está mal formado',
      'Procesarlo tal cual',
      'Cerrar la conexión',
      'Esperar con sleep a que llegue el resto',
    ],
    why: 'TCP es un chorro de bytes, no de mensajes: los cortes no coinciden con tus líneas.',
  },
  {
    id: 'http-status',
    topic: 'http',
    needs: { projects: ['webserv', ...TRANSCENDENCE] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué código HTTP significa «no encontrado»?', 'Una página que no existe responde…'],
        right: ['404'],
      },
      {
        ask: [
          '¿Qué código HTTP significa «método no permitido»?',
          'Un DELETE donde solo se admite GET responde…',
        ],
        right: ['405'],
        wrong: ['404'],
      },
      {
        ask: [
          '¿Qué familia de códigos HTTP indica un error del servidor?',
          'Si el fallo es del servidor, el código empieza por…',
        ],
        right: ['5xx', 'Los que empiezan por 5'],
        wrong: ['4xx', '3xx', '2xx'],
      },
    ],
    wrong: ['200', '301', '500', '403', '201'],
    why: '2xx bien, 3xx redirige, 4xx error del cliente (404 no está, 405 método), 5xx error del servidor.',
  },
  {
    id: 'http-methods',
    topic: 'http',
    needs: { projects: ['webserv', ...TRANSCENDENCE] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué método HTTP no debería cambiar nada en el servidor?',
          'El método «solo leer» es…',
        ],
        right: ['GET'],
      },
      {
        ask: [
          '¿Qué cabecera dice cuántos bytes trae el cuerpo de la petición?',
          'El tamaño del cuerpo va en…',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Host', 'Accept'],
      },
    ],
    wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
    why: 'GET solo pide; POST, PUT, PATCH y DELETE cambian cosas. Content-Length (o chunked) dice dónde acaba el cuerpo.',
  },
  {
    id: 'http-chunked',
    topic: 'http',
    needs: { projects: ['webserv'] },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Una petición trae `Transfer-Encoding: chunked`. ¿Cómo sabes dónde acaba el cuerpo?',
          'Con chunked no hay Content-Length. ¿Cuándo se acaba el cuerpo?',
        ],
        right: [
          'Al llegar un trozo de tamaño 0',
          'Cuando llega el trozo «0» seguido de una línea vacía',
        ],
      },
    ],
    wrong: [
      'Cuando se cierra la conexión',
      'A los 1024 bytes',
      'En el primer \\r\\n',
      'Nunca: hay que esperar al timeout',
    ],
    why: 'Cada trozo dice su tamaño en hexadecimal delante; el de tamaño 0 marca el final.',
  },
  {
    id: 'http-cgi',
    topic: 'http',
    needs: { projects: ['webserv'] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es un CGI en un servidor web?', 'Con CGI, el servidor…'],
        right: [
          'Un programa aparte que el servidor ejecuta para generar la respuesta',
          'Ejecuta un programa y devuelve lo que este escribe',
        ],
      },
    ],
    wrong: ['Una caché de páginas', 'Un tipo de cabecera', 'Un cifrado', 'Un balanceador de carga'],
    why: 'El servidor lanza el programa (fork + execve) con la petición en variables y la entrada, y manda su salida.',
  },
  {
    id: 'irc-basics',
    topic: 'irc',
    needs: { projects: ['ft_irc'] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden IRC sirve para entrar en un canal?', 'Para entrar en #42 se manda…'],
        right: ['JOIN', 'JOIN #42'],
      },
      {
        ask: ['¿Cómo acaba cada mensaje en el protocolo IRC?', 'Las líneas de IRC terminan en…'],
        right: ['\\r\\n'],
        wrong: ['\\n solo', '\\0', ';'],
      },
    ],
    wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
    why: 'IRC es texto por líneas acabadas en CRLF; JOIN entra, PRIVMSG habla, NICK pone nombre.',
  },
  {
    id: 'docker-image',
    topic: 'contenedores',
    needs: { projects: [...INCEPTION, ...TRANSCENDENCE] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué diferencia hay entre una imagen y un contenedor de Docker?',
          'Un contenedor es…',
        ],
        right: [
          'La imagen es la plantilla; el contenedor, una copia en marcha',
          'Una imagen puesta en marcha',
        ],
      },
      {
        ask: [
          '¿Qué pasa con lo escrito dentro de un contenedor sin volumen al borrarlo?',
          'Sin volumen, al borrar el contenedor, los datos…',
        ],
        right: ['Se pierden', 'Desaparecen con él'],
        wrong: [
          'Se guardan en la imagen',
          'Pasan al siguiente contenedor',
          'Se suben a Docker Hub',
        ],
      },
    ],
    wrong: [
      'Son lo mismo',
      'El contenedor es una máquina virtual completa',
      'La imagen es un contenedor parado',
      'El contenedor es el Dockerfile',
    ],
    why: 'La imagen no cambia; cada contenedor añade su capa de escritura, que se va con él si no hay volumen.',
  },
  {
    id: 'docker-vm',
    topic: 'contenedores',
    needs: { projects: [...INCEPTION, ...TRANSCENDENCE] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿En qué se diferencia un contenedor de una máquina virtual?',
          'Un contenedor, frente a una máquina virtual…',
        ],
        right: ['Comparte el núcleo del sistema anfitrión', 'No lleva su propio kernel'],
      },
      {
        ask: [
          '¿Por qué no vale `tail -f /dev/null` como proceso principal de un contenedor?',
          'Un contenedor con un bucle infinito como PID 1…',
        ],
        right: [
          'Es un apaño: el contenedor debe ejecutar el servicio en primer plano',
          'Así no corre el servicio de verdad como proceso principal',
        ],
        wrong: [
          'Porque consume mucha CPU',
          'Porque /dev/null no existe',
          'Porque el contenedor se para',
        ],
      },
    ],
    wrong: [
      'Es más seguro siempre',
      'Emula el hardware',
      'Solo funciona en Linux con interfaz gráfica',
      'Lleva su propio kernel',
    ],
    why: 'Un contenedor es un proceso aislado sobre el mismo kernel; vive lo que vive su proceso principal.',
  },
  {
    id: 'docker-compose-net',
    topic: 'contenedores',
    needs: { projects: [...INCEPTION, ...TRANSCENDENCE] },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'En docker-compose, WordPress tiene que hablar con el servicio `mariadb`. ¿Qué pone como servidor de la base de datos?',
          'Dos servicios en la misma red de compose. ¿Cómo encuentra uno al otro?',
        ],
        right: [
          'mariadb: el nombre del servicio',
          'Por el nombre del servicio, que compose resuelve',
        ],
      },
    ],
    wrong: ['localhost', '127.0.0.1', 'La IP pública de la máquina', '0.0.0.0'],
    why: 'Cada contenedor tiene su localhost; compose da un DNS interno donde cada servicio es su nombre.',
  },
  {
    id: 'web-https',
    topic: 'web',
    needs: { projects: [...INCEPTION, ...TRANSCENDENCE] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué añade HTTPS a HTTP?', 'La «S» de HTTPS significa que…'],
        right: ['Cifra la conexión con TLS y prueba quién es el servidor', 'Va cifrado con TLS'],
      },
      {
        ask: ['¿En qué puerto escucha HTTPS por defecto?', 'El puerto de HTTPS es…'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      'Comprime las páginas',
      'Hace la web más rápida',
      'Guarda las contraseñas',
      'Bloquea anuncios',
    ],
    why: 'HTTPS es HTTP dentro de TLS: cifrado y certificado del servidor. 80 es HTTP; 443, HTTPS.',
  },
  {
    id: 'web-sql-injection',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'long',
    level: 3,
    code: 'query = "SELECT * FROM users WHERE name = \'" + name + "\'"',
    forms: [
      {
        ask: [
          '¿Qué problema tiene esta consulta?',
          "¿Qué pasa si alguien escribe como nombre `' OR '1'='1`?",
        ],
        right: [
          'Inyección SQL: hay que usar consultas con parámetros',
          'Cualquiera puede cambiar la consulta: devuelve todos los usuarios',
        ],
      },
    ],
    wrong: [
      'Es lenta',
      'Falta un punto y coma',
      'No devuelve nada nunca',
      'Solo funciona con MySQL',
    ],
    why: 'Pegar texto del usuario en el SQL deja que lo reescriba; los parámetros lo tratan siempre como dato.',
  },
  {
    id: 'web-hash-passwords',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo deben guardarse las contraseñas?',
          'En la base de datos, una contraseña se guarda…',
        ],
        right: [
          'Con un hash lento y con sal (bcrypt, argon2)',
          'Pasada por bcrypt o argon2, nunca tal cual',
        ],
      },
      {
        ask: [
          '¿Qué es la «sal» de un hash de contraseña?',
          'Añadir sal a una contraseña antes del hash sirve para…',
        ],
        right: [
          'Un valor al azar por usuario para que dos contraseñas iguales den hashes distintos',
          'Que no sirvan tablas precalculadas',
        ],
        wrong: ['Cifrarla con una clave', 'Que el hash sea más corto', 'Poder recuperarla'],
      },
    ],
    wrong: [
      'En texto plano, en una tabla aparte',
      'Cifradas con una clave en el código',
      'Con MD5',
      'En base64',
    ],
    why: 'Un hash lento y salado no se puede deshacer ni probar en masa; base64 o MD5 no protegen.',
  },
  {
    id: 'web-websocket',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Por qué usar WebSockets para un juego en el navegador?', 'Un WebSocket permite…'],
        right: [
          'El servidor puede mandar datos sin que el cliente pregunte',
          'Una conexión abierta en los dos sentidos',
        ],
      },
    ],
    wrong: [
      'Porque cifra mejor que HTTPS',
      'Porque ocupa menos que una imagen',
      'Porque no usa TCP',
      'Porque guarda los datos en el navegador',
    ],
    why: 'HTTP es pregunta-respuesta; el WebSocket deja la conexión abierta para mandar en cualquier momento.',
  },
]
