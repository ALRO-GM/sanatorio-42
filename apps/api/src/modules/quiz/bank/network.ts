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
          '¿Para cuántos equipos deja sitio la máscara 255.255.255.0?',
        ],
        right: ['254'],
        wrong: ['256', '255', '24', '128'],
      },
      {
        ask: [
          '¿Cuántas direcciones de equipo caben en una red /30?',
          '¿Para cuántos equipos deja sitio la máscara 255.255.255.252?',
        ],
        right: ['2'],
        wrong: ['4', '30', '1', '3'],
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
        ask: ['¿Qué máscara es /26?', '¿Cómo se escribe /26 con puntos?'],
        right: ['255.255.255.192'],
        wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.26', '255.255.255.0'],
      },
      {
        ask: ['¿Qué máscara es /16?', '¿Cómo se escribe /16 con puntos?'],
        right: ['255.255.0.0'],
        wrong: ['255.0.0.0', '255.255.255.0', '255.255.16.0'],
      },
    ],
    wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.0'],
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
          'No: una cae en la primera mitad y la otra en la segunda',
        ],
        wrong: [
          'Sí: empiezan igual',
          'Sí, pero solo con un router',
          'Depende de la puerta de enlace',
          'No se puede saber sin la MAC',
        ],
      },
      {
        ask: [
          '¿Están en la misma red 10.0.0.5/24 y 10.0.0.250/24?',
          'Con máscara /24, ¿pueden hablarse directamente 10.0.0.5 y 10.0.0.250?',
        ],
        right: ['Sí: comparten los tres primeros bytes', 'Sí: las dos son 10.0.0.x'],
        wrong: [
          'No: /24 parte el último byte en dos mitades',
          'No: 250 está fuera de rango',
          'Solo con un router',
          'No se puede saber sin la MAC',
        ],
      },
    ],
    wrong: ['Solo con un router', 'Depende de la puerta de enlace', 'No se puede saber sin la MAC'],
    why: 'Misma red = mismos bits en la parte de la máscara. Con /25, el bit alto del último byte cuenta.',
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
          '¿Cuál de estas es una dirección de red local privada?',
        ],
        right: ['192.168.0.10', '10.1.2.3', '172.16.5.4'],
        wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250', '142.250.1.1'],
      },
      {
        ask: ['¿Qué es 127.0.0.1?', '¿A quién apunta la dirección 127.0.0.1?'],
        right: ['A la propia máquina (localhost)'],
        wrong: ['A la puerta de enlace', 'Al DNS de Google', 'A la dirección de difusión'],
      },
    ],
    wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250'],
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
          '¿Qué papel tiene el gateway de una red?',
        ],
        right: [
          'Recibe los paquetes para otras redes y los reenvía',
          'Es la salida de la red local hacia las demás',
        ],
        wrong: [
          'Traduce nombres a direcciones',
          'Reparte direcciones IP',
          'Cifra el tráfico',
          'Une los cables de la red local',
        ],
      },
      {
        ask: [
          '¿A qué destinos se aplica la ruta 0.0.0.0/0?',
          '¿A qué destinos lleva una ruta 0.0.0.0/0?',
        ],
        right: ['A todos los que no tengan otra ruta (la ruta por defecto)'],
        wrong: ['A ninguno', 'Solo a la red local', 'Solo a la propia máquina'],
      },
    ],
    wrong: ['Traduce nombres a direcciones', 'Reparte direcciones IP', 'Cifra el tráfico'],
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
        ask: ['¿Qué garantiza TCP que no garantiza UDP?', '¿Qué da TCP, a diferencia de UDP?'],
        right: ['Que llega todo, en orden y sin duplicados', 'Entrega fiable y ordenada'],
        wrong: [
          'Que va más rápido',
          'Que va cifrado',
          'Que llega a todos los equipos de la red',
          'Que no hace falta puerto',
        ],
      },
      {
        ask: ['¿Qué protocolo de transporte usa HTTP/1.1?', '¿Sobre qué viaja HTTP/1.1?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: ['Que va más rápido', 'Que va cifrado', 'Que no hace falta puerto'],
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
        ask: ['¿Qué hace el DNS?', '¿Para qué sirve el DNS?'],
        right: ['Traduce nombres de dominio a direcciones IP'],
        wrong: [
          'Reparte direcciones IP',
          'Cifra la conexión',
          'Encamina los paquetes',
          'Guarda las páginas web',
        ],
      },
      {
        ask: ['Cuando escribes un nombre como intra.42.fr, ¿qué sistema lo convierte en una IP?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: ['Reparte direcciones IP', 'Cifra la conexión', 'Encamina los paquetes'],
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
          '¿Qué pasos hay que dar para empezar a aceptar conexiones?',
        ],
        right: ['socket, bind, listen, accept'],
        wrong: [
          'socket, listen, bind, accept',
          'bind, socket, accept, listen',
          'socket, connect, listen, accept',
          'listen, socket, bind, accept',
        ],
      },
      {
        ask: ['¿Qué devuelve `accept`?', 'Cada vez que acepta una conexión, ¿qué devuelve accept?'],
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
        ask: [
          '¿Para qué sirve `poll` (o select, epoll, kqueue) en un servidor?',
          '¿Qué permite poll a un servidor?',
        ],
        right: [
          'Esperar a la vez en muchos descriptores y saber cuáles están listos',
          'Atender a muchos clientes con un solo hilo',
        ],
        wrong: [
          'Crear hilos',
          'Cifrar la conexión',
          'Resolver nombres',
          'Medir el tiempo de respuesta',
        ],
      },
      {
        ask: [
          '¿Por qué no se debe hacer `read` en un socket sin que poll diga que está listo?',
          '¿Qué pasa al leer, en modo bloqueante, un socket que no tiene nada?',
        ],
        right: [
          'Se queda bloqueado y deja sin atender a los demás clientes',
          'Bloquea el servidor entero',
        ],
        wrong: ['Devuelve 0 siempre', 'Cierra la conexión', 'No pasa nada'],
      },
    ],
    wrong: ['Crear hilos', 'Cifrar la conexión', 'Resolver nombres'],
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
          'Acumular lo recibido hasta tener una línea completa y entonces procesarla',
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
        ask: [
          '¿Qué código HTTP significa «no encontrado»?',
          '¿Con qué código responde una página que no existe?',
        ],
        right: ['404'],
        wrong: ['200', '301', '500', '403'],
      },
      {
        ask: [
          '¿Qué código HTTP significa «método no permitido»?',
          '¿Con qué código responde un DELETE donde solo se admite GET?',
        ],
        right: ['405'],
        wrong: ['404', '403', '500', '400'],
      },
      {
        ask: [
          '¿Qué familia de códigos HTTP indica un error del servidor?',
          'Si el fallo es del servidor, ¿de qué familia es el código?',
        ],
        right: ['5xx'],
        wrong: ['4xx', '3xx', '2xx'],
      },
    ],
    wrong: ['200', '301', '500', '403', '201'],
    why: '2xx va bien, 3xx redirige, 4xx es un error del cliente (404 no está, 405 método no admitido) y 5xx, del servidor.',
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
          '¿Qué método HTTP sirve solo para pedir, sin modificar?',
        ],
        right: ['GET'],
        wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
      },
      {
        ask: [
          '¿Qué cabecera dice cuántos bytes trae el cuerpo de la petición?',
          '¿En qué cabecera va el tamaño del cuerpo?',
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
    why: 'Cada trozo lleva delante su tamaño en hexadecimal; el de tamaño 0 marca el final.',
  },
  {
    id: 'http-cgi',
    topic: 'http',
    needs: { projects: ['webserv'] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué es un CGI en un servidor web?',
          '¿Qué hace el servidor cuando una petición va a un CGI?',
        ],
        right: [
          'Ejecuta un programa aparte y devuelve lo que este escribe',
          'Lanza un programa que genera la respuesta',
        ],
      },
    ],
    wrong: [
      'Guarda la página en una caché',
      'Añade una cabecera especial',
      'Cifra la respuesta',
      'Reparte la carga entre servidores',
    ],
    why: 'El servidor lanza el programa (fork + execve) con la petición en variables de entorno y en la entrada, y manda su salida.',
  },
  {
    id: 'irc-basics',
    topic: 'irc',
    needs: { projects: ['ft_irc'] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué orden IRC sirve para entrar en un canal?',
          '¿Qué orden se manda para entrar en #42?',
        ],
        right: ['JOIN'],
        wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
      },
      {
        ask: [
          '¿Cómo acaba cada mensaje en el protocolo IRC?',
          '¿En qué terminan las líneas de IRC?',
        ],
        right: ['\\r\\n'],
        wrong: ['\\n solo', '\\0', ';'],
      },
    ],
    wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
    why: 'IRC es texto por líneas acabadas en CRLF; JOIN entra, PRIVMSG habla y NICK pone nombre.',
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
          '¿Qué relación hay entre un contenedor y su imagen?',
        ],
        right: [
          'La imagen es la plantilla; el contenedor, una copia en marcha',
          'El contenedor es la imagen puesta en marcha',
        ],
        wrong: [
          'Son lo mismo',
          'El contenedor es una máquina virtual completa',
          'La imagen es un contenedor parado',
          'El contenedor es el Dockerfile',
        ],
      },
      {
        ask: [
          '¿Qué pasa con lo escrito dentro de un contenedor sin volumen al borrarlo?',
          'Sin volumen, al borrar el contenedor, ¿qué pasa con sus datos?',
        ],
        right: ['Se pierden con él'],
        wrong: [
          'Se guardan en la imagen',
          'Pasan al siguiente contenedor',
          'Se suben a Docker Hub',
        ],
      },
    ],
    wrong: ['Son lo mismo', 'La imagen es un contenedor parado', 'El contenedor es el Dockerfile'],
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
          '¿Por qué un contenedor pesa menos que una máquina virtual?',
        ],
        right: ['Comparte el núcleo del sistema anfitrión: no lleva kernel propio'],
        wrong: [
          'Es siempre más seguro',
          'Emula el hardware',
          'Solo funciona en Linux con interfaz gráfica',
          'Lleva su propio kernel',
        ],
      },
      {
        ask: [
          '¿Por qué no vale `tail -f /dev/null` como proceso principal de un contenedor?',
          '¿Qué tiene de malo mantener vivo un contenedor con un bucle infinito como PID 1?',
        ],
        right: [
          'Es un apaño: el contenedor debe ejecutar el servicio en primer plano',
          'Que el servicio de verdad no es el proceso principal',
        ],
        wrong: ['Que consume mucha CPU', 'Que /dev/null no existe', 'Que el contenedor se para'],
      },
    ],
    wrong: ['Es siempre más seguro', 'Emula el hardware', 'Lleva su propio kernel'],
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
          'En docker-compose, WordPress tiene que hablar con el servicio de la base de datos (MariaDB). ¿Qué pone como servidor?',
          'Dos servicios en la misma red de compose. ¿Cómo encuentra uno al otro?',
        ],
        right: [
          'El nombre del servicio, que compose resuelve',
          'Por el nombre del servicio: compose tiene un DNS interno',
        ],
      },
    ],
    wrong: [
      'localhost',
      'La dirección 127.0.0.1',
      'La IP pública de la máquina',
      'La dirección 0.0.0.0',
    ],
    why: 'Cada contenedor tiene su propio localhost; compose da un DNS interno donde cada servicio se llama por su nombre.',
  },
  {
    id: 'web-https',
    topic: 'web',
    needs: { projects: [...INCEPTION, ...TRANSCENDENCE] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué añade HTTPS a HTTP?', '¿Qué significa la «S» de HTTPS?'],
        right: [
          'Cifra la conexión con TLS y prueba quién es el servidor',
          'Que la conexión va cifrada con TLS',
        ],
        wrong: [
          'Que comprime las páginas',
          'Que la web va más rápida',
          'Que guarda las contraseñas',
          'Que bloquea anuncios',
        ],
      },
      {
        ask: ['¿En qué puerto escucha HTTPS por defecto?', '¿Cuál es el puerto de HTTPS?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: ['Que comprime las páginas', 'Que la web va más rápida', 'Que guarda las contraseñas'],
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
          'Que el usuario puede reescribir el SQL y sacar todos los registros',
        ],
      },
    ],
    wrong: [
      'Que es lenta',
      'Que falta un punto y coma',
      'Que no devuelve nada nunca',
      'Que solo funciona con MySQL',
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
          '¿Cómo se guarda una contraseña en la base de datos?',
        ],
        right: [
          'Con un hash lento y con sal (bcrypt, argon2)',
          'Pasada por bcrypt o argon2, nunca tal cual',
        ],
        wrong: [
          'En texto plano, en una tabla aparte',
          'Cifrada con una clave escrita en el código',
          'Con MD5',
          'En base64',
        ],
      },
      {
        ask: [
          '¿Qué es la «sal» de un hash de contraseña?',
          '¿Para qué se añade sal a una contraseña antes del hash?',
        ],
        right: [
          'Un valor al azar por usuario: dos contraseñas iguales dan hashes distintos',
          'Para que no sirvan las tablas precalculadas',
        ],
        wrong: [
          'Para cifrarla con una clave',
          'Para que el hash sea más corto',
          'Para poder recuperarla',
        ],
      },
    ],
    wrong: ['En texto plano, en una tabla aparte', 'Con MD5', 'En base64'],
    why: 'Un hash lento y con sal no se puede deshacer ni probar en masa; base64 o MD5 no protegen.',
  },
  {
    id: 'web-websocket',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué usar WebSockets para un juego en el navegador?',
          '¿Qué permite un WebSocket?',
        ],
        right: [
          'Que el servidor mande datos sin que el cliente pregunte',
          'Una conexión abierta en los dos sentidos',
        ],
      },
    ],
    wrong: [
      'Cifrar mejor que HTTPS',
      'Ocupar menos que una imagen',
      'No usar TCP',
      'Guardar los datos en el navegador',
    ],
    why: 'HTTP es pregunta y respuesta; el WebSocket deja la conexión abierta para mandar en cualquier momento.',
  },
]
