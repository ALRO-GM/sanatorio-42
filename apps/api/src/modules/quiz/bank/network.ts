/**
 * Banco de Not-games: redes, servidores y despliegue. Direcciones y máscaras
 * (NetPractice), sockets y HTTP (webserv, ft_irc), contenedores (Inception) y
 * la web entera (ft_transcendence).
 *
 * Los detalles de cada enunciado (`np-`, `ws-`, `irc-`, `inc-`, `tr-`) son
 * solo los que no han cambiado entre versiones: si un dato depende de la
 * versión del enunciado, no se pregunta.
 */

import type { Concept } from './types.js'

const NETPRACTICE = ['netpractice']
const WEBSERV = ['webserv']
const IRC = ['ft_irc']
const SERVERS = [...WEBSERV, ...IRC]
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
        right: ['No: /25 parte el último byte en 0–127 y 128–255', 'No: cada una cae en una mitad'],
        wrong: [
          'Sí: los tres primeros bytes son iguales',
          'Sí, pero solo pasando por un router',
          'Depende de la puerta de enlace que tengan',
          'No se puede saber sin ver la MAC',
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
          'No: 250 se sale del rango de equipos',
          'Solo pasando por un router',
          'No se puede saber sin ver la MAC',
        ],
      },
    ],
    wrong: [
      'Solo pasando por un router',
      'Depende de la puerta de enlace que tengan',
      'No se puede saber sin ver la MAC',
    ],
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
        ask: ['¿A qué apunta la dirección 127.0.0.1?', '¿A quién llega lo que mandas a 127.0.0.1?'],
        right: ['A la propia máquina', 'Al mismo equipo que lo manda'],
        wrong: [
          'A la puerta de enlace',
          'Al DNS de Google',
          'A todos los equipos de la red',
          'Al primer router de la red',
        ],
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
          'Recibe lo que va a otras redes y lo reenvía',
          'Es la salida de la red local hacia las demás',
        ],
        wrong: [
          'Traduce los nombres de dominio a IP',
          'Reparte direcciones IP a cada equipo',
          'Cifra el tráfico que sale de la red',
          'Da nombre a cada equipo de la red',
        ],
      },
      {
        ask: [
          '¿A qué destinos se aplica la ruta 0.0.0.0/0?',
          '¿A qué destinos lleva una ruta 0.0.0.0/0?',
        ],
        right: ['A todos los que no casan con otra ruta'],
        wrong: [
          'A ninguno: es una ruta desactivada',
          'Solo a los equipos de la red local',
          'Solo a la propia máquina, como 127.0.0.1',
        ],
      },
    ],
    wrong: [
      'Traduce los nombres de dominio a IP',
      'Reparte direcciones IP a cada equipo',
      'Cifra el tráfico que sale de la red',
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
        ask: ['¿Qué garantiza TCP que no garantiza UDP?', '¿Qué da TCP, a diferencia de UDP?'],
        right: ['Que llega todo, en orden y sin duplicados', 'Entrega fiable y en orden'],
        wrong: [
          'Que va más rápido porque no espera',
          'Que va cifrado de punta a punta',
          'Que llega a todos los equipos de la red',
          'Que no hace falta abrir ningún puerto',
        ],
      },
      {
        ask: ['¿Qué protocolo de transporte usa HTTP/1.1?', '¿Sobre qué viaja HTTP/1.1?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: [
      'Que va más rápido porque no espera',
      'Que va cifrado de punta a punta',
      'Que no hace falta abrir ningún puerto',
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
        ask: ['¿Qué hace el DNS?', '¿Para qué sirve el DNS?'],
        right: ['Traduce nombres a direcciones IP'],
        wrong: [
          'Reparte direcciones IP',
          'Cifra la conexión con el servidor',
          'Encamina los paquetes',
          'Guarda copia de las páginas web',
        ],
      },
      {
        ask: ['Cuando escribes un nombre como intra.42.fr, ¿qué sistema lo convierte en una IP?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: ['Reparte direcciones IP', 'Cifra la conexión con el servidor', 'Encamina los paquetes'],
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
        right: ['Un descriptor nuevo para ese cliente', 'Un socket nuevo, solo para esa conexión'],
        wrong: [
          'El mismo socket que escucha',
          'El puerto desde el que llega el cliente',
          'El número de clientes conectados',
        ],
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
          'Saber qué descriptores están listos sin bloquearse',
          'Atender a muchos clientes con un solo hilo',
        ],
        wrong: [
          'Crear un hilo nuevo por cada cliente',
          'Cifrar la conexión de cada cliente',
          'Resolver el nombre de cada cliente',
          'Medir cuánto tarda cada respuesta',
        ],
      },
      {
        ask: [
          '¿Qué pasa al hacer `read` en un socket bloqueante que no tiene nada?',
          'Sin preguntar a poll, lees de un socket bloqueante vacío. ¿Qué pasa?',
        ],
        right: [
          'Se bloquea y los demás clientes se quedan esperando',
          'El servidor entero se para hasta que llegue algo',
        ],
        wrong: [
          'Devuelve 0 y sigue con el siguiente cliente',
          'Cierra la conexión con ese cliente',
          'Devuelve -1 y sigue con los demás clientes',
          'Lee lo que quedaba en el búfer de antes',
        ],
      },
    ],
    wrong: [
      'Crear un hilo nuevo por cada cliente',
      'Cifrar la conexión de cada cliente',
      'Resolver el nombre de cada cliente',
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
          'Guardarlo en el búfer de ese cliente hasta el fin de línea',
          'Acumular hasta tener una línea completa y procesarla',
        ],
      },
    ],
    wrong: [
      'Rechazarlo: está mal formado y hay que avisar',
      'Procesarlo tal cual y tirar lo que llegue luego',
      'Cerrar la conexión porque el cliente ha fallado',
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
          '¿Qué cabecera da el tamaño en bytes del cuerpo de la petición?',
          '¿En qué cabecera va el tamaño del cuerpo?',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Content-Encoding', 'Host', 'Accept'],
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
        right: ['Al llegar un trozo de tamaño 0', 'Con el trozo «0» y una línea vacía'],
      },
    ],
    wrong: [
      'Cuando el cliente cierra la conexión',
      'Al llegar a los 1024 bytes',
      'En el primer \\r\\n que llegue',
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
          '¿Qué hace el servidor cuando una petición va a un CGI?',
          'Con un CGI, ¿cómo saca el servidor la respuesta?',
        ],
        right: [
          'Ejecuta un programa y devuelve lo que escribe',
          'Lanza un programa que genera la respuesta',
        ],
      },
    ],
    wrong: [
      'Guarda la página en una caché y la sirve',
      'Añade una cabecera especial a la página',
      'Cifra la respuesta antes de mandarla',
      'Reparte la carga entre varios servidores',
    ],
    why: 'El servidor lanza el programa (fork + execve) con la petición en variables de entorno y en la entrada, y manda su salida.',
  },
  {
    id: 'irc-basics',
    topic: 'irc',
    needs: { projects: IRC },
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
          'La imagen es la plantilla; el contenedor, su copia viva',
          'El contenedor es la imagen puesta en marcha',
        ],
        wrong: [
          'Son lo mismo con dos nombres distintos',
          'El contenedor es una máquina virtual completa',
          'La imagen es un contenedor que se ha parado',
          'El contenedor es el Dockerfile ya compilado',
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
    wrong: [
      'Son lo mismo con dos nombres distintos',
      'La imagen es un contenedor que se ha parado',
      'El contenedor es el Dockerfile ya compilado',
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
          '¿Qué hace que un contenedor pese menos que una máquina virtual?',
        ],
        right: ['Usa el kernel del anfitrión, no uno propio'],
        wrong: [
          'Es siempre más seguro que una VM',
          'Emula el hardware entero del equipo',
          'Solo funciona en Linux con escritorio',
          'Lleva su propio kernel, más pequeño',
        ],
      },
      {
        ask: [
          '¿Por qué no vale `tail -f /dev/null` como proceso principal de un contenedor?',
          '¿Qué tiene de malo mantener vivo un contenedor con un bucle infinito como PID 1?',
        ],
        right: [
          'Es un apaño: el servicio debe ir en primer plano',
          'El servicio de verdad no es el proceso principal',
        ],
        wrong: [
          'Gasta mucha CPU dando vueltas sin hacer nada',
          '/dev/null no existe dentro del contenedor',
          'El contenedor se para nada más arrancar',
        ],
      },
    ],
    wrong: [
      'Es siempre más seguro que una VM',
      'Emula el hardware entero del equipo',
      'Lleva su propio kernel, más pequeño',
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
          'En docker-compose, WordPress tiene que hablar con el servicio de la base de datos (MariaDB). ¿Qué pone como servidor?',
          'Dos servicios en la misma red de compose. ¿A qué dirección llama uno al otro?',
        ],
        right: [
          'El nombre del servicio, que compose resuelve',
          'El nombre que tiene el servicio en el compose',
        ],
      },
    ],
    wrong: [
      'localhost, como en la propia máquina',
      'La dirección 127.0.0.1 del anfitrión',
      'La IP pública de la máquina',
      'La dirección 0.0.0.0, que llega a todos',
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
        ask: ['¿Qué añade HTTPS a HTTP?', '¿Qué gana una web al pasar de HTTP a HTTPS?'],
        right: [
          'Cifra la conexión con TLS y prueba quién es el servidor',
          'Mete HTTP dentro de una conexión cifrada con TLS',
        ],
        wrong: [
          'Comprime las páginas para que pesen menos',
          'Hace que la web cargue más rápido',
          'Guarda las contraseñas en el servidor',
          'Bloquea los anuncios y los rastreadores',
        ],
      },
      {
        ask: ['¿En qué puerto escucha HTTPS por defecto?', '¿Cuál es el puerto de HTTPS?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      'Comprime las páginas para que pesen menos',
      'Hace que la web cargue más rápido',
      'Guarda las contraseñas en el servidor',
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
          '¿Qué fallo tiene esta forma de montar la consulta?',
        ],
        right: [
          'Inyección SQL: el nombre puede reescribir la consulta',
          'Que quien escribe el nombre saca todas las filas',
        ],
      },
    ],
    wrong: [
      'Que es lenta porque no usa ningún índice',
      'Que falta un punto y coma al final del SQL',
      'Que no devuelve nada si el nombre lleva tildes',
      'Que solo funciona con MySQL y no con PostgreSQL',
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
          'Con un hash lento y con sal, como bcrypt o argon2',
          'Con bcrypt o argon2, nunca tal cual',
        ],
        wrong: [
          'En texto plano, en una tabla aparte',
          'Cifrada con una clave escrita en el código',
          'Con MD5, que es rápido de calcular',
          'En base64, para que no se lea a simple vista',
        ],
      },
      {
        ask: [
          '¿Para qué se añade sal a una contraseña antes del hash?',
          '¿Qué se gana metiendo sal en el hash de cada contraseña?',
        ],
        right: [
          'Que dos contraseñas iguales den hashes distintos',
          'Que no sirvan las tablas de hashes ya calculados',
        ],
        wrong: [
          'Que se pueda descifrar si el usuario la olvida',
          'Que el hash ocupe menos en la base de datos',
          'Que quede cifrada con una clave del servidor',
        ],
      },
    ],
    wrong: [
      'En texto plano, en una tabla aparte',
      'Con MD5, que es rápido de calcular',
      'En base64, para que no se lea a simple vista',
    ],
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
          'Que el servidor mande datos sin que se los pidan',
          'Una conexión abierta que va en los dos sentidos',
        ],
      },
    ],
    wrong: [
      'Cifrar mejor que HTTPS y sin certificado',
      'Que los datos ocupen menos que en HTTP',
      'Ir sin TCP, así que nunca se pierde nada',
      'Guardar los datos del juego en el navegador',
    ],
    why: 'HTTP es pregunta y respuesta; el WebSocket deja la conexión abierta para mandar en cualquier momento.',
  },

  // NetPractice: cada nivel es una red rota que se arregla con las cuentas de
  // la máscara, así que se pregunta haciendo esas cuentas.
  {
    id: 'np-net-broadcast',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          '¿Cuál es la dirección de difusión de 192.168.10.77/26?',
          'Un equipo tiene 192.168.10.77/26. ¿Cuál es el broadcast de su red?',
        ],
        right: ['192.168.10.127'],
        wrong: ['192.168.10.255', '192.168.10.63', '192.168.10.128', '192.168.10.191'],
      },
      {
        ask: [
          '¿Cuál es la dirección de red de 192.168.10.77/26?',
          'Un equipo tiene 192.168.10.77/26. ¿En qué red está?',
        ],
        right: ['192.168.10.64'],
        wrong: ['192.168.10.0', '192.168.10.76', '192.168.10.65', '192.168.10.128'],
      },
    ],
    wrong: ['192.168.10.255', '192.168.10.0', '192.168.10.128'],
    why: '/26 hace bloques de 64 en el último byte (0, 64, 128, 192): 77 cae en 64–127, así que la red es .64 y la difusión, .127.',
  },
  {
    id: 'np-host-range',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'En la red 172.16.0.32/28, ¿cuál es la última IP que puede llevar un equipo?',
          '¿Cuál es la IP de equipo más alta de 172.16.0.32/28?',
        ],
        right: ['172.16.0.46'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.62', '172.16.0.63'],
      },
      {
        ask: [
          '¿Cuál de estas IP puede llevar un equipo de la red 172.16.0.32/28?',
          '¿Qué dirección es válida para un equipo en 172.16.0.32/28?',
        ],
        right: ['172.16.0.33', '172.16.0.40', '172.16.0.45'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31', '172.16.0.50'],
      },
    ],
    wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31'],
    why: '/28 son bloques de 16: de .32 a .47; la primera es la red y la última la difusión, así que los equipos van de .33 a .46.',
  },
  {
    id: 'np-next-hop',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En una tabla de rutas, ¿qué es el next hop (siguiente salto)?',
          '¿Qué indica el next hop de una ruta?',
        ],
        right: [
          'La IP del router al que se entrega el paquete',
          'El router vecino que recibe el paquete',
        ],
        wrong: [
          'La IP del destino final del paquete',
          'La última red por la que pasa el paquete',
          'Los saltos que le quedan hasta el destino',
          'La máscara de la red de destino',
        ],
      },
      {
        ask: [
          '¿Qué tiene que cumplir el next hop de una ruta para que funcione?',
          '¿Dónde tiene que estar el next hop que pones en una ruta?',
        ],
        right: [
          'En una red a la que el equipo llega directamente',
          'En la misma red que una interfaz del equipo',
        ],
        wrong: [
          'En la misma red que el destino final',
          'En una red pública, nunca en una privada',
          'En cualquier red, si el router lo conoce',
          'Terminar en .1, como todos los routers',
        ],
      },
    ],
    wrong: [
      'La IP del destino final del paquete',
      'La última red por la que pasa el paquete',
      'Los saltos que le quedan hasta el destino',
    ],
    why: 'El next hop es a quién se le da el paquete: tiene que estar en una red tuya, porque solo se le puede entregar sin otro router de por medio.',
  },
  {
    id: 'np-router-interfaces',
    topic: 'redes',
    needs: { projects: NETPRACTICE },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Pueden dos interfaces de un mismo router estar en la misma red?',
          'Un router tiene dos interfaces. ¿Puedes ponerlas en la misma subred?',
        ],
        right: [
          'No: cada interfaz va a una red distinta',
          'No: el router no sabría por cuál mandar',
        ],
        wrong: [
          'Sí, si las dos tienen la misma máscara',
          'Sí: así el router reparte la carga',
          'Solo si las dos IP son seguidas',
          'Sí, si una de ellas es la puerta de enlace',
        ],
      },
      {
        ask: [
          'Un router une 10.0.1.0/24 y 10.0.2.0/24. ¿Qué IP puede llevar su interfaz de la segunda red?',
          'La interfaz de un router da a la red 10.0.2.0/24 y la otra, a 10.0.1.0/24. ¿Qué IP le pones a la primera?',
        ],
        right: ['10.0.2.1', '10.0.2.254'],
        wrong: ['10.0.1.1', '10.0.2.0', '10.0.2.255', '10.0.3.1'],
      },
    ],
    wrong: [
      'Sí, si las dos tienen la misma máscara',
      'Sí: así el router reparte la carga',
      'Solo si las dos IP son seguidas',
    ],
    why: 'Un router une redes distintas: cada interfaz es la puerta de una red, y con dos en la misma no sabría por cuál sacar el paquete.',
  },

  // webserv: el fichero de configuración se inspira en el bloque server de
  // NGINX, así que se pregunta por lo que hace NGINX, que es fijo.
  {
    id: 'ws-config',
    topic: 'http',
    needs: { projects: WEBSERV },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'El cuerpo de una petición pasa de client_max_body_size. ¿Con qué código se responde?',
          '¿Qué código HTTP devuelve NGINX si el cuerpo pasa del límite configurado?',
        ],
        right: ['413'],
        wrong: ['400', '403', '411', '500'],
      },
      {
        ask: [
          'En NGINX, ¿qué directiva enseña la lista de ficheros de un directorio sin índice?',
          '¿Qué directiva de NGINX activa el listado de un directorio?',
        ],
        right: ['`autoindex on`'],
        wrong: ['`index on`', '`listing on`', '`root on`', '`dirlist on`'],
      },
      {
        ask: [
          'En NGINX, ¿qué directiva elige la página que se manda con un 404?',
          '¿Con qué directiva de NGINX pones tu propia página de error?',
        ],
        right: ['`error_page`'],
        wrong: ['`error_log`', '`return`', '`default_page`', '`try_files`'],
      },
      {
        ask: [
          'En NGINX, ¿qué directiva dice en qué puerto escucha un server?',
          '¿Con qué directiva pones un bloque server de NGINX en el puerto 8080?',
        ],
        right: ['`listen`'],
        wrong: ['`server_name`', '`port`', '`bind`', '`root`'],
      },
    ],
    wrong: ['`server_name`', '`location`', '`index`'],
    why: '413 es «cuerpo demasiado grande»; autoindex lista el directorio, error_page pone tus páginas de error y listen, el puerto.',
  },
  {
    id: 'ws-poll-only',
    topic: 'sockets',
    needs: { projects: WEBSERV },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántos poll (o equivalente) puede usar webserv para todas sus E/S?',
          'En webserv, ¿cuántos poll atienden a los clientes y a los sockets que escuchan?',
        ],
        right: ['Uno para todo, también para escuchar'],
        wrong: [
          'Uno por cada cliente conectado',
          'Uno por cada puerto que escucha',
          'Ninguno: cada cliente va en un hilo',
          'Dos: uno para leer y otro para escribir',
        ],
      },
      {
        ask: [
          'En webserv, ¿cuándo puedes hacer read o write en un socket?',
          '¿Qué tiene que pasar antes de leer o escribir en un socket de webserv?',
        ],
        right: ['Que poll lo haya dado por listo', 'Solo cuando poll dice que está listo'],
        wrong: [
          'Nada, si el socket es no bloqueante',
          'Que errno valga EAGAIN',
          'Nada: basta con un timeout corto',
          'Que el cliente haya cerrado su lado',
        ],
      },
      {
        ask: [
          'Tras un read o un write en un socket, ¿qué prohíbe el enunciado de webserv?',
          '¿Qué no puedes hacer en webserv después de un read o un write?',
        ],
        right: ['Mirar errno para decidir qué hacer'],
        wrong: [
          'Volver a llamar a poll en el bucle',
          'Cerrar el socket si read devuelve 0',
          'Guardar lo leído en un búfer del cliente',
        ],
      },
    ],
    wrong: [
      'Uno por cada cliente conectado',
      'Uno por cada puerto que escucha',
      'Ninguno: cada cliente va en un hilo',
    ],
    why: 'Un solo poll vigila a la vez los sockets que escuchan y los de los clientes, y solo se lee o se escribe donde dice que se puede.',
  },
  {
    id: 'ws-redirect',
    topic: 'http',
    needs: { projects: WEBSERV },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué código HTTP es una redirección permanente?',
          'Una página se ha mudado para siempre. ¿Con qué código respondes?',
        ],
        right: ['301'],
        wrong: ['302', '307', '304', '404'],
      },
      {
        ask: [
          'En una respuesta 301, ¿qué cabecera lleva la dirección nueva?',
          '¿En qué cabecera de una redirección va adónde ir?',
        ],
        right: ['Location'],
        wrong: ['Referer', 'Host', 'Redirect', 'Origin'],
      },
    ],
    wrong: ['302', '307', '304'],
    why: '301 es «movido para siempre» (302 y 307 son temporales) y el navegador va a la dirección de la cabecera Location.',
  },
  {
    id: 'ws-upload',
    topic: 'http',
    needs: { projects: WEBSERV },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Un formulario HTML sube un fichero con POST. ¿Qué Content-Type lleva la petición?',
          '¿Qué tipo de cuerpo manda el navegador al subir un fichero desde un formulario?',
        ],
        right: ['`multipart/form-data`'],
        wrong: [
          '`application/json`',
          '`text/plain`',
          '`application/x-www-form-urlencoded`',
          '`application/octet-stream`',
        ],
      },
      {
        ask: [
          'En un cuerpo multipart, ¿cómo se sabe dónde acaba cada parte?',
          '¿Cómo separa multipart/form-data las partes del cuerpo?',
        ],
        right: [
          'Con el boundary que anuncia el Content-Type',
          'Con una frontera que va en la cabecera',
        ],
        wrong: [
          'Con una línea vacía entre cada parte',
          'Con el Content-Length de cada parte',
          'Con un trozo de tamaño 0 entre partes',
          'Cada parte llega en una petición aparte',
        ],
      },
    ],
    wrong: ['`application/json`', '`text/plain`', '`application/x-www-form-urlencoded`'],
    why: 'Un formulario con ficheros va como multipart/form-data: las partes se separan con el boundary que anuncia el Content-Type.',
  },

  // ft_irc: las órdenes y los modos son los del protocolo; el enunciado pide
  // los de operador (KICK, INVITE, TOPIC, MODE con i, t, k, o, l).
  {
    id: 'irc-register',
    topic: 'irc',
    needs: { projects: IRC },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué órdenes manda un cliente para registrarse en el servidor?',
          'Al conectar a tu ft_irc, ¿qué tiene que mandar el cliente antes de nada?',
        ],
        right: ['PASS, NICK y USER'],
        wrong: [
          'LOGIN, NICK y JOIN',
          'PASS, JOIN y USER',
          'AUTH, NICK y USER',
          'NICK, JOIN y PRIVMSG',
        ],
      },
      {
        ask: [
          'Al registrarse, ¿qué orden lleva la contraseña del servidor?',
          '¿Con qué orden da el cliente la contraseña de tu ft_irc?',
        ],
        right: ['PASS'],
        wrong: ['AUTH', 'LOGIN', 'USER', 'OPER'],
      },
    ],
    wrong: ['LOGIN, NICK y JOIN', 'PASS, JOIN y USER', 'AUTH, NICK y USER'],
    why: 'Con PASS da la contraseña del servidor, con NICK el apodo y con USER su nombre: hasta entonces no está registrado.',
  },
  {
    id: 'irc-modes',
    topic: 'irc',
    needs: { projects: IRC },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué modo de canal hace que solo se entre con invitación?',
          '¿Con qué modo cierras un canal a quien no esté invitado?',
        ],
        right: ['+i'],
        wrong: ['+t', '+k', '+o', '+l'],
      },
      {
        ask: [
          '¿Qué modo de canal pone una contraseña para entrar?',
          '¿Con qué modo pide un canal una clave a quien entra?',
        ],
        right: ['+k'],
        wrong: ['+i', '+p', '+l', '+o'],
      },
      {
        ask: ['¿Qué hace el modo +l en un canal?', 'Si pones +l a un canal, ¿qué cambia?'],
        right: ['Pone un tope de usuarios en el canal'],
        wrong: [
          'Solo hablan los operadores del canal',
          'Bloquea el tema a quien no es operador',
          'Guarda en un log lo que se dice',
        ],
      },
      {
        ask: ['¿Qué hace el modo +t en un canal?', 'Si pones +t a un canal, ¿qué cambia?'],
        right: ['Solo los operadores cambian el tema'],
        wrong: [
          'Solo los operadores pueden hablar',
          'El canal se cierra pasado un tiempo',
          'Solo se entra con una invitación',
        ],
      },
    ],
    wrong: ['+m', '+s', '+b'],
    why: '+i es solo con invitación, +t deja el tema a los operadores, +k pide clave, +o hace operador y +l pone un tope de usuarios.',
  },
  {
    id: 'irc-operator',
    topic: 'irc',
    needs: { projects: IRC },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué orden de operador echa a alguien de un canal?',
          '¿Con qué orden saca un operador a un usuario del canal?',
        ],
        right: ['KICK'],
        wrong: ['BAN', 'PART', 'REMOVE', 'QUIT'],
      },
      {
        ask: [
          '¿Qué orden de operador deja entrar a alguien en un canal +i?',
          'El canal es solo con invitación. ¿Qué orden usa el operador para que entre alguien?',
        ],
        right: ['INVITE'],
        wrong: ['JOIN', 'ALLOW', 'KNOCK', 'ADD'],
      },
      {
        ask: [
          '¿Qué orden cambia o enseña el tema de un canal?',
          '¿Con qué orden se pone el tema de un canal?',
        ],
        right: ['TOPIC'],
        wrong: ['TITLE', 'INFO', 'NAMES', 'MOTD'],
      },
      {
        ask: [
          '¿Con qué orden da un operador +o a otro usuario?',
          '¿Qué orden cambia los modos de un canal?',
        ],
        right: ['MODE'],
        wrong: ['OPER', 'OP', 'GRANT', 'SET'],
      },
    ],
    wrong: ['BAN', 'GRANT', 'ALLOW'],
    why: 'Los operadores de canal tienen KICK para echar, INVITE para invitar, TOPIC para el tema y MODE para los modos.',
  },
  {
    id: 'irc-privmsg',
    topic: 'irc',
    needs: { projects: IRC },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cómo mandas «hi» por privado al nick pepe?',
          '¿Qué línea manda un mensaje solo a pepe?',
        ],
        right: ['`PRIVMSG pepe :hi`'],
        wrong: ['`PRIVMSG #pepe :hi`', '`MSG pepe hi`', '`SEND pepe :hi`', '`PRIVMSG :pepe hi`'],
      },
      {
        ask: [
          '¿Cómo mandas «hi» a todos los del canal #42?',
          '¿Qué línea manda un mensaje a todo el canal #42?',
        ],
        right: ['`PRIVMSG #42 :hi`'],
        wrong: ['`PRIVMSG 42 :hi`', '`JOIN #42 :hi`', '`SAY #42 :hi`', '`PRIVMSG :#42 hi`'],
      },
    ],
    wrong: ['`MSG pepe hi`', '`SEND pepe :hi`', '`SAY #42 :hi`'],
    why: 'PRIVMSG va a un nick o a un canal (con #), y el texto va detrás de los dos puntos.',
  },
  {
    id: 'irc-server-rules',
    topic: 'irc',
    needs: { projects: IRC },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'En ft_irc, ¿puedes usar fork para atender a cada cliente?',
          '¿Vale un proceso hijo por cliente en ft_irc?',
        ],
        right: ['No: todo va en un proceso, con un solo poll'],
        wrong: [
          'Sí: un proceso hijo por cada cliente',
          'Sí, si los hijos comparten el socket',
          'Solo para los que no son operadores',
        ],
      },
      {
        ask: [
          'Con nc mandas «com», ^D, «man», ^D y «d» con Enter. ¿Qué debe hacer el servidor?',
          'Pruebas con nc partiendo una orden con ^D. ¿Qué tiene que hacer ft_irc?',
        ],
        right: ['Juntar los trozos y procesar la orden entera'],
        wrong: [
          'Procesar cada trozo como una orden aparte',
          'Cerrar la conexión al llegar el primer ^D',
          'Tirar lo que llegó antes del último ^D',
        ],
      },
    ],
    wrong: [
      'Sí: un proceso hijo por cada cliente',
      'Procesar cada trozo como una orden aparte',
      'Cerrar la conexión al llegar el primer ^D',
    ],
    why: 'El enunciado prohíbe fork y pide un único poll; y como ^D manda medio mensaje, hay que acumular hasta el fin de línea.',
  },

  // Inception: lo que el enunciado exige del montaje y lo que prohíbe.
  {
    id: 'inc-one-service',
    topic: 'contenedores',
    needs: { projects: INCEPTION },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuántos servicios lleva cada contenedor en Inception?',
          'En Inception, ¿cuántos servicios van en un mismo contenedor?',
        ],
        right: ['Uno: cada servicio en su contenedor'],
        wrong: [
          'Todos en uno, con supervisord',
          'Dos: WordPress junto a MariaDB',
          'Los que quieras si comparten red',
        ],
      },
      {
        ask: [
          'En Inception, ¿en qué contenedor va php-fpm?',
          '¿Dónde se instala php-fpm en Inception?',
        ],
        right: ['En el de WordPress, sin NGINX'],
        wrong: [
          'En el de NGINX, que lo ejecuta',
          'En el de MariaDB, junto a la base',
          'En uno propio, aparte de WordPress',
        ],
      },
      {
        ask: [
          '¿Qué tienen que hacer los contenedores de Inception si se caen?',
          'Un contenedor de Inception se cae. ¿Qué debe pasar?',
        ],
        right: ['Volver a arrancar solos, con restart'],
        wrong: [
          'Quedarse parados hasta que los mires',
          'Borrarse y bajar la imagen de nuevo',
          'Parar también a todos los demás',
        ],
      },
    ],
    wrong: [
      'Todos en uno, con supervisord',
      'Dos: WordPress junto a MariaDB',
      'Los que quieras si comparten red',
    ],
    why: 'NGINX, WordPress con php-fpm y MariaDB van cada uno en su contenedor, y se reinician solos si se caen.',
  },
  {
    id: 'inc-nginx-tls',
    topic: 'contenedores',
    needs: { projects: INCEPTION },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Por qué puerto entra el tráfico a la infraestructura de Inception?',
          'En Inception, ¿qué puerto se abre hacia fuera?',
        ],
        right: ['443'],
        wrong: ['80', '8080', '3306', '9000'],
      },
      {
        ask: [
          '¿Qué versiones de TLS puede aceptar NGINX en Inception?',
          'En Inception, ¿con qué protocolos cifra NGINX?',
        ],
        right: ['TLSv1.2 o TLSv1.3'],
        wrong: ['Cualquiera, SSLv3 incluido', 'Solo TLSv1.0 y TLSv1.1', 'TLSv1.1 o TLSv1.2'],
      },
      {
        ask: [
          '¿Qué contenedor es la única entrada a Inception desde fuera?',
          'En Inception, ¿qué servicio recibe todas las conexiones de fuera?',
        ],
        right: ['NGINX'],
        wrong: ['WordPress', 'MariaDB', 'php-fpm', 'Adminer'],
      },
    ],
    wrong: ['80', '8080', '3306'],
    why: 'NGINX es la única puerta: solo por el 443 y solo con TLSv1.2 o TLSv1.3.',
  },
  {
    id: 'inc-volumes',
    topic: 'contenedores',
    needs: { projects: INCEPTION },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿En qué carpeta del anfitrión van los volúmenes de Inception?',
          'En Inception, ¿dónde se guardan en la máquina los datos de los volúmenes?',
        ],
        right: ['`/home/login/data`'],
        wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/home/login/volumes`', '`/tmp/data`'],
      },
      {
        ask: ['¿Qué volúmenes pide Inception?', '¿Qué datos guardan los volúmenes de Inception?'],
        right: ['La base de WordPress y los ficheros de la web'],
        wrong: [
          'Los certificados de NGINX y sus logs',
          'Los logs de cada servicio y su caché',
          'Las imágenes ya construidas de cada servicio',
        ],
      },
    ],
    wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/tmp/data`'],
    why: 'Un volumen guarda la base de datos de WordPress y otro los ficheros de la web, los dos en /home/login/data del anfitrión.',
  },
  {
    id: 'inc-rules',
    topic: 'contenedores',
    needs: { projects: INCEPTION },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿De qué imagen pueden partir tus Dockerfile en Inception?',
          'En Inception, ¿qué pones en el FROM de tus Dockerfile?',
        ],
        right: ['De Alpine o de Debian, nada más'],
        wrong: [
          'De la imagen oficial de nginx',
          'De cualquiera que haya en Docker Hub',
          'De la de WordPress ya preparada',
        ],
      },
      {
        ask: [
          '¿Dónde van las contraseñas en Inception?',
          'En Inception, ¿dónde guardas la clave de MariaDB?',
        ],
        right: ['En el .env o en secretos, no en el Dockerfile'],
        wrong: [
          'En el Dockerfile, con ENV, para tenerla a mano',
          'En el docker-compose.yml, escrita tal cual',
          'En el repositorio git, en un fichero aparte',
        ],
      },
      {
        ask: [
          '¿Qué prohíbe Inception para conectar los contenedores?',
          'En Inception, ¿qué no puedes usar para unir contenedores?',
        ],
        right: ['`network: host` y `--link`'],
        wrong: ['`networks:` en el compose', '`depends_on` y `restart`', '`expose` y `ports`'],
      },
      {
        ask: [
          '¿Cómo dejas NGINX en primer plano en su contenedor?',
          '¿Qué CMD mantiene NGINX como PID 1 sin apaños?',
        ],
        right: ['`nginx -g "daemon off;"`'],
        wrong: [
          '`nginx &`',
          '`service nginx start`',
          '`nginx; tail -f /dev/null`',
          '`nginx -s reload`',
        ],
      },
    ],
    wrong: [
      'De cualquiera que haya en Docker Hub',
      'En el docker-compose.yml, escrita tal cual',
      'De la de WordPress ya preparada',
    ],
    why: 'Se construye todo desde Alpine o Debian, sin claves en los Dockerfile, con una red de Docker propia y el servicio en primer plano.',
  },

  // ft_transcendence: lo que se mantiene entre versiones (Pong en la web,
  // torneo) y la seguridad que cualquier web con usuarios necesita.
  {
    id: 'tr-pong',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Dónde se juega el Pong de ft_transcendence?',
          'En ft_transcendence, ¿desde dónde juegas al Pong?',
        ],
        right: ['En la propia web, desde el navegador'],
        wrong: [
          'En una app de escritorio aparte',
          'En la terminal, con ncurses',
          'En un cliente que hay que instalar',
        ],
      },
      {
        ask: [
          'En el torneo de ft_transcendence, ¿qué tiene que quedar claro en la web?',
          '¿Qué debe enseñar la web durante un torneo de ft_transcendence?',
        ],
        right: ['Quién juega contra quién y en qué orden'],
        wrong: [
          'El ranking mundial de cada jugador',
          'La IP de cada jugador conectado',
          'Quién ganó el torneo del año pasado',
        ],
      },
    ],
    wrong: [
      'En una app de escritorio aparte',
      'En la terminal, con ncurses',
      'En un cliente que hay que instalar',
    ],
    why: 'El Pong se juega en la web, en el navegador, y el torneo tiene que enseñar los emparejamientos y su orden.',
  },
  {
    id: 'tr-2fa',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿De qué depende el código de 6 cifras de una app de 2FA (TOTP)?',
          'En TOTP, ¿con qué se calcula cada código?',
        ],
        right: ['De un secreto compartido y de la hora'],
        wrong: [
          'De la contraseña del usuario y su IP',
          'De un número que el servidor manda por SMS',
          'De la dirección MAC del móvil',
        ],
      },
      {
        ask: [
          '¿Cada cuánto cambia normalmente un código TOTP?',
          'En una app de autenticación, ¿cuánto dura cada código?',
        ],
        right: ['30 s'],
        wrong: ['5 s', '10 min', '24 h', '1 h'],
      },
      {
        ask: [
          'En la autenticación en dos pasos, ¿qué es el segundo factor?',
          '¿Qué añade el 2FA a la contraseña?',
        ],
        right: ['Algo que tienes, como el móvil'],
        wrong: [
          'Una segunda contraseña distinta',
          'Repetir la contraseña al entrar',
          'Una pregunta secreta del registro',
        ],
      },
    ],
    wrong: [
      'De la contraseña del usuario y su IP',
      'De un número que el servidor manda por SMS',
      'De la dirección MAC del móvil',
    ],
    why: 'TOTP mezcla un secreto que comparten servidor y móvil con la hora (en tramos de 30 s): sin el móvil no hay código.',
  },
  {
    id: 'tr-auth-tokens',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué garantiza la firma de un JWT?', '¿Para qué sirve la firma de un JWT?'],
        right: ['Que nadie lo ha cambiado sin la clave'],
        wrong: [
          'Que nadie puede leer lo que lleva',
          'Que solo funciona en un navegador',
          'Que el servidor lo guarda en la base',
        ],
      },
      {
        ask: [
          '¿Se puede leer el contenido de un JWT sin la clave?',
          'Alguien sin la clave te roba un JWT. ¿Puede ver qué lleva dentro?',
        ],
        right: ['Sí: va en base64url, sin cifrar'],
        wrong: [
          'No: va cifrado con la clave del servidor',
          'No: solo se ve con la clave pública',
          'Solo si el token ya ha caducado',
        ],
      },
      {
        ask: [
          'Al entrar con la cuenta de 42 (OAuth), ¿qué recibe tu web?',
          'Con OAuth, ¿qué le llega a tu backend tras el permiso del usuario?',
        ],
        right: ['Un código que cambia por un token', 'Un token de acceso, nunca la contraseña'],
        wrong: [
          'La contraseña de 42 del usuario, cifrada',
          'Una copia del perfil y de su contraseña',
          'La cookie de sesión de la intra',
        ],
      },
    ],
    wrong: [
      'Que nadie puede leer lo que lleva',
      'Que solo funciona en un navegador',
      'La cookie de sesión de la intra',
    ],
    why: 'Un JWT va firmado, no cifrado: se lee, pero no se cambia sin la clave; con OAuth tu web recibe un token, nunca la contraseña.',
  },
  {
    id: 'tr-xss',
    topic: 'web',
    needs: { projects: TRANSCENDENCE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es un ataque XSS?', '¿En qué consiste el cross-site scripting?'],
        right: ['Colar JavaScript que corre en el navegador de otros'],
        wrong: [
          'Saturar el servidor con muchas peticiones',
          'Reescribir una consulta SQL con lo que escribes',
          'Robar la sesión escuchando la wifi sin cifrar',
        ],
      },
      {
        ask: [
          '¿Cómo se evita el XSS al enseñar texto de un usuario?',
          'Un usuario pone `<script>` en su nombre. ¿Qué evita que se ejecute?',
        ],
        right: ['Escaparlo antes de meterlo en el HTML'],
        wrong: [
          'Guardarlo con un hash en la base',
          'Mandarlo siempre por HTTPS',
          'Usar consultas SQL con parámetros',
        ],
      },
      {
        ask: [
          'La web va por HTTPS. ¿Qué esquema usan sus WebSockets?',
          '¿Cómo empieza la dirección de un WebSocket cifrado?',
        ],
        right: ['`wss://`'],
        wrong: ['`ws://`', '`https://`', '`tcp://`', '`ssl://`'],
      },
    ],
    wrong: [
      'Saturar el servidor con muchas peticiones',
      'Reescribir una consulta SQL con lo que escribes',
      'Mandarlo siempre por HTTPS',
    ],
    why: 'Con XSS el texto de un usuario se ejecuta como código en el navegador de otro; escapándolo se queda en texto, y todo va cifrado (https y wss).',
  },
]
