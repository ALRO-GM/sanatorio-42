/** Repaso de Not-games: lo nuevo de redes y web del common core. */

import type { ReviewEntry } from './types.js'

export const REVIEW_CORE_NET: Record<string, ReviewEntry> = {
  'np-net-broadcast': {
    title: 'Dirección de red y de difusión',
    definition:
      'La máscara parte el último byte en bloques (de 64 con /26, de 16 con /28). La dirección de red es el principio del bloque en que cae la IP y la de difusión, el final.',
    example: '192.168.10.77/26 → bloque 64–127: red 192.168.10.64, difusión 192.168.10.127.',
  },
  'np-host-range': {
    title: 'IP válidas de una red',
    definition:
      'Un equipo puede llevar cualquier IP del bloque menos la primera (la red) y la última (la difusión). Una IP fuera del bloque es de otra red.',
    example: '172.16.0.32/28 va de .32 a .47: los equipos, de .33 a .46.',
  },
  'np-next-hop': {
    title: 'Tabla de rutas y next hop',
    definition:
      'Cada ruta dice: para tal destino, entrega el paquete a tal router (next hop). Ese router tiene que estar en una red a la que llegas directamente, si no, no hay forma de dárselo.',
    example: 'Equipo 192.168.1.2/24 → ruta «default → 192.168.1.1»: el router .1 está en su red.',
  },
  'np-router-interfaces': {
    title: 'Interfaces de un router',
    definition:
      'Un router une redes distintas: cada interfaz tiene una IP de su red, y dos interfaces del mismo router no pueden estar en la misma red porque no sabría por cuál sacar el paquete.',
    example: 'Router con 10.0.1.1/24 en una interfaz y 10.0.2.1/24 en la otra.',
  },
  'ws-config': {
    title: 'Configuración tipo NGINX',
    definition:
      'El fichero de webserv se parece a un bloque server de NGINX: listen pone el puerto, server_name el nombre, root la carpeta, index el fichero por defecto, autoindex el listado y error_page las páginas de error. Si el cuerpo pasa de client_max_body_size, se responde 413.',
    example:
      'server { listen 8080; root /var/www; index index.html; client_max_body_size 1M; error_page 404 /404.html; }',
  },
  'ws-poll-only': {
    title: 'Un poll para todo',
    definition:
      'webserv usa un único poll (o equivalente) para los sockets que escuchan y para los de los clientes, y solo lee o escribe en un socket cuando poll dice que está listo. Tras un read o un write no se mira errno.',
    example: 'poll(fds, n, -1); si fds[i].revents & POLLIN → recv; si POLLOUT → send.',
  },
  'ws-redirect': {
    title: 'Redirecciones HTTP',
    definition:
      'Una redirección responde con un código 3xx y la dirección nueva en la cabecera Location. 301 es permanente (el navegador la recuerda); 302 y 307, temporales.',
    example: 'HTTP/1.1 301 Moved Permanently\\r\\nLocation: /nueva/\\r\\n',
  },
  'ws-upload': {
    title: 'Subir ficheros con POST',
    definition:
      'Un formulario que sube ficheros manda el cuerpo como multipart/form-data: cada parte lleva sus cabeceras y su contenido, y van separadas por el boundary que anuncia el Content-Type.',
    example:
      'Content-Type: multipart/form-data; boundary=----abc → partes separadas por ------abc.',
  },
  'irc-register': {
    title: 'Registrarse en IRC',
    definition:
      'Al conectar, el cliente manda PASS con la contraseña del servidor, NICK con su apodo y USER con su nombre. Hasta tenerlo todo, el servidor no le deja hacer nada más.',
    example: 'PASS secreto\\r\\nNICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\n',
  },
  'irc-modes': {
    title: 'Modos de canal',
    definition:
      'MODE cambia cómo funciona un canal: +i solo con invitación, +t el tema solo lo cambian los operadores, +k pide clave, +o da operador a alguien y +l pone un tope de usuarios.',
    example: 'MODE #42 +k clave → para entrar: JOIN #42 clave.',
  },
  'irc-operator': {
    title: 'Órdenes de operador',
    definition:
      'Un operador de canal tiene KICK para echar a alguien, INVITE para invitar a un canal +i, TOPIC para cambiar el tema y MODE para los modos del canal.',
    example: 'KICK #42 pepe :spam / INVITE pepe #42 / TOPIC #42 :Examen el lunes',
  },
  'irc-privmsg': {
    title: 'PRIVMSG',
    definition:
      'PRIVMSG manda un mensaje a un nick (privado) o a un canal (empieza por #, le llega a todos sus miembros). El texto va detrás de los dos puntos.',
    example: 'PRIVMSG pepe :hola / PRIVMSG #42 :hola a todos',
  },
  'irc-server-rules': {
    title: 'Las reglas del servidor de ft_irc',
    definition:
      'ft_irc no puede usar fork: un solo proceso con un solo poll atiende a todos. Y como los mensajes pueden llegar a trozos (nc con ^D), se acumulan por cliente hasta el \\r\\n.',
    example: 'nc -C 127.0.0.1 6667 → «com» ^D «man» ^D «d» Enter: el servidor procesa «command».',
  },
  'inc-one-service': {
    title: 'Un contenedor por servicio',
    definition:
      'En Inception, NGINX, WordPress con php-fpm y MariaDB van cada uno en su contenedor, cada uno con su Dockerfile, y se reinician solos si se caen (restart en el compose).',
    example: 'services: nginx, wordpress, mariadb; cada uno con restart: always.',
  },
  'inc-nginx-tls': {
    title: 'NGINX como única entrada',
    definition:
      'Solo NGINX está abierto hacia fuera, solo por el puerto 443 y solo con TLSv1.2 o TLSv1.3. WordPress y MariaDB solo se ven dentro de la red de Docker.',
    example: 'listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'inc-volumes': {
    title: 'Volúmenes de Inception',
    definition:
      'Hay dos volúmenes: uno con la base de datos de WordPress y otro con los ficheros de la web. En el anfitrión, los dos viven en /home/login/data (con tu login).',
    example: '/home/pepe/data/mariadb y /home/pepe/data/wordpress.',
  },
  'inc-rules': {
    title: 'Lo que Inception prohíbe',
    definition:
      'Las imágenes se construyen desde Alpine o Debian, sin bajar las ya hechas; las contraseñas van en un .env o en secretos, no en el Dockerfile; nada de network: host ni --link; y el servicio corre en primer plano como PID 1.',
    example: 'FROM debian:… y CMD ["nginx", "-g", "daemon off;"]',
  },
  'tr-pong': {
    title: 'Pong y torneo',
    definition:
      'ft_transcendence es una web donde se juega al Pong en el propio navegador. El torneo enfrenta a varios jugadores y la web tiene que dejar claro quién juega contra quién y en qué orden.',
    example: 'Torneo de 4: A contra B, C contra D, y la final entre los ganadores.',
  },
  'tr-2fa': {
    title: '2FA con TOTP',
    definition:
      'La autenticación en dos pasos pide, además de la contraseña, algo que tienes. Con TOTP, el móvil y el servidor comparten un secreto y calculan con la hora un código de 6 cifras que cambia cada 30 s.',
    example: 'Escaneas un QR con la app de autenticación y luego tecleas el código que enseña.',
  },
  'tr-auth-tokens': {
    title: 'JWT y OAuth',
    definition:
      'Un JWT (cabecera, contenido y firma) va firmado, no cifrado: cualquiera lo lee, pero nadie lo cambia sin la clave. Con OAuth, tu web recibe un código que cambia por un token: nunca ve la contraseña de 42.',
    example: 'Authorization: Bearer eyJhbGciOi… (lo que va entre los puntos es base64url).',
  },
  'tr-xss': {
    title: 'XSS',
    definition:
      'Un XSS es colar JavaScript en la web para que se ejecute en el navegador de otros. Se evita escapando lo que escribe cada usuario antes de meterlo en el HTML. Y toda la web va cifrada: https y wss.',
    example: 'Nombre «<script>robar()</script>» → se enseña como &lt;script&gt;…, no se ejecuta.',
  },
}
