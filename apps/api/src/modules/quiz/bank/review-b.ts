/**
 * Repaso de Not-games (2/2): algoritmos, concurrencia, gráficos, redes, C++ y
 * Python. Mismo formato que `review-a.ts`.
 */

import type { ReviewEntry } from './types.js'

export const REVIEW_B: Record<string, ReviewEntry> = {
  'algo-sort-complexity': {
    title: 'Límite de ordenar comparando',
    definition:
      'Cualquier ordenación que solo compare elementos necesita, en el peor caso, del orden de n·log n comparaciones. Por debajo solo se baja sin comparar (radix, counting sort).',
    example: '100 números: unas 700 comparaciones como mínimo; la burbuja hace hasta 4950.',
  },
  'algo-stack': {
    title: 'Pilas y colas en push_swap',
    definition:
      'Una pila saca lo último que entró (LIFO); una cola, lo primero (FIFO). En push_swap las dos pilas solo dejan tocar la cima, y las rotaciones las usan casi como colas circulares.',
    example: 'pb mueve la cima de a a la cima de b; pa, al revés.',
  },
  'algo-rotate': {
    title: 'Rotar una pila',
    definition:
      'ra sube todos los elementos una posición y el de arriba pasa al fondo; rra hace lo contrario: el del fondo pasa arriba. rr y rrr hacen lo mismo en las dos pilas a la vez.',
    example: 'a = 1 2 3 → ra → 2 3 1 → rra → 1 2 3.',
  },
  'algo-three': {
    title: 'Ordenar tres números',
    definition:
      'Con tres elementos hay 6 órdenes posibles y todos se resuelven con dos operaciones como mucho, mirando dónde está el mayor.',
    example: '3 1 2 → ra → 1 2 3. 2 3 1 → rra → 1 2 3. 3 2 1 → sa, rra.',
  },
  'algo-radix': {
    title: 'Radix sort',
    definition:
      'Radix ordena por cifras o bits, del menos significativo al más, sin comparar elementos. En push_swap se suelen normalizar los números a índices 0..n-1 y repartir por cada bit entre las dos pilas.',
    example: 'Para cada bit: si es 0, pb; si es 1, ra. Luego pa de todo. Con 500 números, 9 bits.',
  },
  'algo-quicksort': {
    title: 'Quicksort y merge sort',
    definition:
      'Quicksort elige un pivote, parte en menores y mayores y ordena cada parte: rápido en la práctica, pero O(n²) si el pivote sale siempre extremo. Merge sort parte por la mitad y mezcla: siempre n·log n.',
    example:
      'Quicksort con el primer elemento como pivote sobre un array ya ordenado: el peor caso.',
  },
  'algo-binary-search': {
    title: 'Búsqueda binaria',
    definition:
      'En datos ordenados, se mira el del medio y se descarta la mitad donde no puede estar. Cada paso divide a la mitad: unos log₂ n pasos.',
    example: 'Buscar 37 en 1..100: 50 → 25 → 37. Tres pasos.',
  },
  'algo-bfs-dfs': {
    title: 'BFS y DFS',
    definition:
      'BFS (en anchura) visita por capas usando una cola: el primero en llegar a un sitio lo hace por el camino más corto en pasos. DFS (en profundidad) va hasta el fondo con una pila (o recursión) y vuelve atrás.',
    example:
      'La salida más cercana de un laberinto: BFS. Ver si todo está conectado: vale cualquiera.',
  },
  'algo-dijkstra': {
    title: 'Dijkstra',
    definition:
      'Dijkstra calcula los caminos más cortos desde un origen cuando las aristas tienen pesos no negativos: cada vez cierra el nodo pendiente más cercano y actualiza a sus vecinos.',
    example: 'Rutas con distancias o tiempos (fly-in). Con pesos negativos se usa Bellman-Ford.',
  },
  'algo-maze-perfect': {
    title: 'Laberinto perfecto',
    definition:
      'Un laberinto es perfecto si entre dos casillas cualesquiera hay exactamente un camino: no tiene ciclos ni zonas aisladas. Como grafo, es un árbol.',
    example:
      'En una cuadrícula de 10 × 10 perfecta hay 100 casillas y exactamente 99 pasos abiertos.',
  },
  'algo-maze-gen': {
    title: 'Generar laberintos con DFS',
    definition:
      'El «recursive backtracker» parte de una casilla, va a una vecina sin visitar al azar tirando la pared y retrocede cuando no hay más: sale un laberinto perfecto con pasillos largos.',
    example: 'Con Prim o Kruskal aleatorios también salen perfectos, con más ramas cortas.',
  },
  'thr-race': {
    title: 'Condición de carrera',
    definition:
      'Hay una carrera cuando dos hilos usan el mismo dato a la vez y al menos uno escribe, sin sincronizar: el resultado depende del orden en que se intercalen. Se detecta con -fsanitize=thread o helgrind.',
    example: 'Dos filósofos leen y escriben last_meal a la vez sin mutex.',
  },
  'thr-counter': {
    title: 'Operaciones no atómicas',
    definition:
      'count++ son tres pasos: leer, sumar y escribir. Si dos hilos los intercalan, una suma se pierde. Se protege con un mutex o se usa una operación atómica.',
    example: 'pthread_mutex_lock(&m); count++; pthread_mutex_unlock(&m);',
  },
  'thr-deadlock': {
    title: 'Interbloqueo',
    definition:
      'Varios hilos se esperan en círculo: cada uno tiene algo que otro necesita y nadie lo suelta. Se evita rompiendo el círculo, por ejemplo cogiendo los recursos siempre en el mismo orden.',
    example: 'Filósofos pares cogen primero el tenedor derecho y los impares el izquierdo.',
  },
  'thr-mutex': {
    title: 'Mutex',
    definition:
      'Un mutex es un candado: solo un hilo a la vez puede tenerlo; los demás esperan en lock. Protege una sección que no debe ejecutarse a la vez. Bloquear dos veces el mismo (no recursivo) te bloquea a ti.',
    example: 'pthread_mutex_init(&m, NULL); … lock … unlock … pthread_mutex_destroy(&m);',
  },
  'thr-join-detach': {
    title: 'join y detach',
    definition:
      'pthread_join espera a que un hilo termine y recoge lo que devuelve. pthread_detach lo suelta: libera sus recursos solo al terminar y ya no se puede esperar. Todo hilo debe acabar de una de las dos formas.',
    example: 'for (i = 0; i < n; i++) pthread_join(th[i], NULL);',
  },
  'thr-usleep': {
    title: 'Medir el tiempo con hilos',
    definition:
      'usleep puede dormir más de lo pedido, y un vigilante que duerme mucho anuncia tarde. Se duerme en trozos cortos comprobando el reloj (gettimeofday) y se vigila cada pocos milisegundos.',
    example: 'while (now() - start < ms) usleep(500);',
  },
  'thr-print': {
    title: 'Mensajes entre hilos',
    definition:
      'Si varios hilos escriben a la vez, las líneas se pueden mezclar, y un mensaje puede salir después de anunciar la muerte. Se protege la escritura con un mutex y se comprueba antes si la simulación sigue.',
    example: 'lock(print); if (!stopped) printf("%ld %d is eating\\n", t, id); unlock(print);',
  },
  'gfx-pixel-offset': {
    title: 'Dónde está un píxel en memoria',
    definition:
      'Una imagen es una tira de bytes fila a fila. El píxel (x, y) empieza en y × line_length + x × (bits por píxel / 8). line_length puede ser algo mayor que el ancho por relleno.',
    example: '*(unsigned int *)(addr + y * line_len + x * (bpp / 8)) = color;',
  },
  'gfx-color': {
    title: 'Colores ARGB',
    definition:
      'Un color en un entero de 32 bits: un byte para la transparencia y uno para rojo, verde y azul (0xAARRGGBB). Se montan desplazando bits.',
    example: 'int color = (r << 16) | (g << 8) | b; 0x00FF00 es verde.',
  },
  'gfx-events': {
    title: 'Bucle de eventos',
    definition:
      'Un programa gráfico no sigue un guion: espera eventos (teclas, ratón, cerrar la ventana) y llama a tus funciones (hooks). mlx_loop es ese bucle y no vuelve; para salir, se cierra desde un hook.',
    example:
      'mlx_hook(win, 17, 0, close_window, &data); mlx_key_hook(win, on_key, &data); mlx_loop(mlx);',
  },
  'gfx-image-buffer': {
    title: 'Dibujar en una imagen',
    definition:
      'Pintar píxel a píxel en la ventana es lento y se ve parpadear. Se dibuja en una imagen en memoria y se pone entera de una vez.',
    example: 'Pintar en img.addr y luego mlx_put_image_to_window(mlx, win, img.ptr, 0, 0);',
  },
  'gfx-flood-fill': {
    title: 'Flood fill',
    definition:
      'Rellenar desde un punto todo lo alcanzable, como un bote de pintura. Sirve para saber si se llega a todos los coleccionables y a la salida: se rellena desde el jugador en una copia del mapa y se mira qué falta.',
    example:
      'fill(x, y): si es pared o ya está, para; si no, márcalo y llama a fill en las cuatro vecinas.',
  },
  'gfx-isometric': {
    title: 'Proyección isométrica',
    definition:
      'Una forma de dibujar 3D en 2D sin perspectiva: los tres ejes a 120° y con la misma escala. Las líneas entre puntos se trazan con Bresenham, que decide qué píxel encender con enteros.',
    example: "x' = (x - y) × cos(30°); y' = (x + y) × sin(30°) - z.",
  },
  'gfx-mandelbrot': {
    title: 'Conjunto de Mandelbrot',
    definition:
      'Para cada punto c del plano se repite z = z² + c empezando en z = 0. Si |z| pasa de 2, se escapa; el color sale de cuántas vueltas tardó. Los que nunca escapan son el conjunto.',
    example: 'c = 0 no escapa nunca; c = 1 da 0, 1, 2, 5… y escapa.',
  },
  'gfx-julia': {
    title: 'Conjuntos de Julia',
    definition:
      'La misma fórmula z = z² + c, pero c es fijo para toda la imagen y z empieza en el punto del píxel. Cada c da un Julia distinto.',
    example: 'c = -0.8 + 0.156i da un Julia con espirales.',
  },
  'gfx-complex-square': {
    title: 'Números complejos',
    definition:
      'Un complejo es a + bi, con i² = -1. Se suman por partes y al multiplicar se usa i² = -1. Para fractales basta con el cuadrado y el módulo.',
    example:
      '(a + bi)² = (a² - b²) + 2abi. |z|² = a² + b² (se compara con 4 para no hacer la raíz).',
  },
  'gfx-raycast': {
    title: 'Raycasting',
    definition:
      'Por cada columna de la pantalla se lanza un rayo desde el jugador; DDA avanza casilla a casilla hasta dar con una pared. La distancia decide la altura de la franja: lejos, baja; cerca, alta.',
    example: 'Una pantalla de 640 de ancho son 640 rayos por fotograma.',
  },
  'gfx-fisheye': {
    title: 'Efecto ojo de pez',
    definition:
      'Si se usa la distancia real del jugador a la pared, los rayos laterales (más largos) encogen las paredes de los lados. Hay que usar la distancia perpendicular al plano de la cámara.',
    example: 'perp = distancia × cos(ángulo del rayo - ángulo de la vista).',
  },
  'gfx-map-closed': {
    title: 'Mapas cerrados',
    definition:
      'El borde del mapa tiene que ser pared: si no, el jugador o un rayo se salen del mapa y se lee memoria que no es suya. Se comprueba antes de jugar, también los huecos de los mapas irregulares.',
    example: 'Cada casilla transitable no puede tocar ni el borde ni un espacio vacío.',
  },
  'gfx-dot-product': {
    title: 'Producto escalar',
    definition:
      'a · b = ax·bx + ay·by + az·bz = |a|·|b|·cos θ. Vale 0 si son perpendiculares y es positivo si apuntan hacia el mismo lado: sirve para la luz y para saber de qué lado está algo.',
    example: 'Luz difusa: intensidad = max(0, normal · dirección_a_la_luz).',
  },
  'gfx-normalize': {
    title: 'Normalizar un vector',
    definition:
      'Dividir un vector por su longitud (√(x² + y² + z²)) para que mida 1 y quede solo la dirección. Las normales y las direcciones de los rayos se usan normalizadas.',
    example: '(3, 4, 0) mide 5 → normalizado (0.6, 0.8, 0).',
  },
  'gfx-ray-sphere': {
    title: 'Rayo contra esfera',
    definition:
      'Sustituir el rayo (origen + t · dirección) en la ecuación de la esfera da una de segundo grado en t. Discriminante negativo: no hay corte. Si hay, vale la t positiva más pequeña.',
    example: 't = (-b ± √(b² - 4ac)) / 2a; con t = -2 y t = 5, se ve el punto de t = 5.',
  },
  'gfx-acne': {
    title: 'Shadow acne',
    definition:
      'Por la precisión de los float, el punto de corte puede quedar un pelo dentro de la superficie y su rayo de sombra choca consigo mismo: salen puntitos negros. Se separa un poco el origen (epsilon) a lo largo de la normal.',
    example: 'origen_sombra = punto + normal × 1e-4.',
  },
  'net-mask-hosts': {
    title: 'Máscaras y equipos por red',
    definition:
      'En /n, los n primeros bits son la red y los demás, el equipo: caben 2^(32-n) direcciones, menos la de red (todo a 0) y la de difusión (todo a 1).',
    example: '/24 → 254 equipos. /30 → 2 (lo justo para unir dos routers).',
  },
  'net-mask-dotted': {
    title: 'Máscara con puntos',
    definition:
      '/n son n unos seguidos de ceros, escritos byte a byte en decimal. Para el último byte se suman los bits a 1: 128, 192, 224, 240, 248, 252, 254, 255.',
    example: '/26 = 255.255.255.192. /20 = 255.255.240.0.',
  },
  'net-same-network': {
    title: '¿Misma red?',
    definition:
      'Dos direcciones están en la misma red si coinciden en los bits de la máscara: se hace AND de cada una con la máscara y se comparan. Si están en la misma, se hablan sin router.',
    example: '/25: 192.168.1.10 → red .0; 192.168.1.200 → red .128. Redes distintas.',
  },
  'net-private': {
    title: 'Direcciones privadas',
    definition:
      'Hay rangos reservados para redes locales, que no se enrutan en Internet: 10.0.0.0/8, 172.16.0.0/12 y 192.168.0.0/16. 127.0.0.1 es la propia máquina.',
    example: 'Tu portátil en casa: 192.168.1.34. Un servidor público: no puede ser privada.',
  },
  'net-gateway': {
    title: 'Puerta de enlace y rutas',
    definition:
      'Un equipo manda directamente a su red; para cualquier otra, al router (puerta de enlace). La ruta 0.0.0.0/0 es la ruta por defecto: casa con todo lo que no tenga otra.',
    example: 'ip route → default via 192.168.1.1 dev eth0.',
  },
  'net-tcp-udp': {
    title: 'TCP y UDP',
    definition:
      'TCP es una conexión fiable: lo entrega todo, en orden y sin duplicados, reenviando si hace falta. UDP manda paquetes sueltos sin garantías, pero con menos espera.',
    example: 'HTTP, SSH e IRC van sobre TCP; el DNS y muchos juegos en línea, sobre UDP.',
  },
  'net-dns': {
    title: 'DNS',
    definition:
      'El DNS traduce nombres (intra.42.fr) a direcciones IP. Tu equipo pregunta a un servidor DNS y guarda la respuesta un rato.',
    example: 'dig intra.42.fr o nslookup intra.42.fr enseñan la IP.',
  },
  'srv-socket-steps': {
    title: 'Un servidor TCP',
    definition:
      'socket crea el socket, bind lo ata a un puerto, listen lo pone a escuchar y accept espera una conexión y devuelve un descriptor nuevo para hablar solo con ese cliente.',
    example:
      'fd = socket(AF_INET, SOCK_STREAM, 0); bind(…6667…); listen(fd, 10); c = accept(fd, …);',
  },
  'srv-poll': {
    title: 'poll',
    definition:
      'poll espera a la vez en muchos descriptores y dice cuáles se pueden leer o escribir sin bloquear. Así un solo hilo atiende a muchos clientes; leer sin que poll lo diga puede bloquear el servidor entero.',
    example: 'poll(fds, n, -1); for (…) if (fds[i].revents & POLLIN) leer(fds[i].fd);',
  },
  'srv-partial': {
    title: 'Mensajes a trozos',
    definition:
      'TCP es un chorro de bytes, no de mensajes: un recv puede traer medio mensaje o varios. Se acumula en un búfer por cliente y se procesa cada mensaje completo (hasta \\r\\n).',
    example:
      'buffer += recibido; while ((pos = buffer.find("\\r\\n")) != npos) { procesar(buffer.substr(0, pos)); … }',
  },
  'http-status': {
    title: 'Códigos HTTP',
    definition: '2xx bien, 3xx redirección, 4xx error de quien pide y 5xx error del servidor.',
    example:
      '200 OK, 301 Moved, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 500 Internal Server Error.',
  },
  'http-methods': {
    title: 'Métodos HTTP',
    definition:
      'GET pide algo sin cambiar nada; POST crea o envía datos; PUT y PATCH cambian; DELETE borra. El tamaño del cuerpo va en Content-Length (o por trozos con chunked).',
    example: 'POST /upload con Content-Length: 1024 y el fichero en el cuerpo.',
  },
  'http-chunked': {
    title: 'Transfer-Encoding: chunked',
    definition:
      'El cuerpo llega en trozos: cada uno empieza con su tamaño en hexadecimal y una línea; un trozo de tamaño 0 marca el final.',
    example: '4\\r\\nWiki\\r\\n5\\r\\npedia\\r\\n0\\r\\n\\r\\n → «Wikipedia».',
  },
  'http-cgi': {
    title: 'CGI',
    definition:
      'Con CGI, el servidor ejecuta un programa (fork y execve) para generar la respuesta: le pasa la petición en variables de entorno y en la entrada estándar, y devuelve lo que el programa escribe.',
    example:
      'GET /cgi-bin/hola.py → el servidor ejecuta python3 hola.py con QUERY_STRING, REQUEST_METHOD…',
  },
  'irc-basics': {
    title: 'Protocolo IRC',
    definition:
      'IRC es texto por líneas acabadas en \\r\\n. Para entrar: PASS, NICK y USER; después JOIN para canales y PRIVMSG para hablar. Los operadores tienen KICK, INVITE, TOPIC y MODE.',
    example: 'NICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\nJOIN #42\\r\\nPRIVMSG #42 :hola\\r\\n',
  },
  'docker-image': {
    title: 'Imágenes y contenedores',
    definition:
      'Una imagen es una plantilla de solo lectura (se construye con un Dockerfile). Un contenedor es una imagen en marcha con su capa de escritura, que se pierde al borrarlo si no se usa un volumen.',
    example: 'docker build -t nginx-42 . && docker run -d -p 443:443 nginx-42',
  },
  'docker-vm': {
    title: 'Contenedor frente a máquina virtual',
    definition:
      'Una máquina virtual emula un ordenador entero, con su kernel. Un contenedor es un proceso aislado que comparte el kernel del anfitrión: arranca en segundos y ocupa poco. Vive lo que vive su proceso principal (PID 1).',
    example: 'CMD ["nginx", "-g", "daemon off;"] deja nginx en primer plano como PID 1.',
  },
  'docker-compose-net': {
    title: 'Redes de docker-compose',
    definition:
      'Los servicios de un compose comparten una red con DNS interno: cada servicio se encuentra por su nombre. localhost, dentro de un contenedor, es el propio contenedor.',
    example: "En wp-config.php: define('DB_HOST', 'mariadb:3306');",
  },
  'web-https': {
    title: 'HTTPS y TLS',
    definition:
      'HTTPS es HTTP dentro de una conexión TLS: va cifrado y el servidor demuestra quién es con un certificado. Escucha en el 443 (HTTP, en el 80).',
    example: 'En nginx: listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'web-sql-injection': {
    title: 'Inyección SQL',
    definition:
      'Pegar texto del usuario dentro de una consulta deja que lo que escribe cambie la consulta. Con consultas parametrizadas, el dato siempre es dato.',
    example: "db.query('SELECT * FROM users WHERE name = ?', [name])",
  },
  'web-hash-passwords': {
    title: 'Guardar contraseñas',
    definition:
      'Nunca se guardan tal cual ni cifradas con una clave: se guarda un hash lento con sal (bcrypt, argon2). Para comprobar, se calcula otra vez y se compara.',
    example: 'hash = await bcrypt.hash(password, 12); ok = await bcrypt.compare(intento, hash);',
  },
  'web-websocket': {
    title: 'WebSockets',
    definition:
      'Un WebSocket deja abierta una conexión en los dos sentidos: el servidor manda datos cuando quiere, sin que el cliente pregunte. Ideal para juegos y chats en tiempo real.',
    example:
      'const ws = new WebSocket("wss://…/pong"); ws.onmessage = (e) => dibujar(JSON.parse(e.data));',
  },
  'cpp-class-struct': {
    title: 'class y struct',
    definition:
      'En C++ son casi lo mismo: las dos tienen métodos, constructores y herencia. Solo cambia lo que es por defecto: en class todo es privado y en struct, público.',
    example: 'class Contact { std::string name; }; ← name es privado.',
  },
  'cpp-reference': {
    title: 'Referencias',
    definition:
      'Una referencia es otro nombre para algo que ya existe: se inicializa al crearla, no puede ser nula y no se puede reasignar a otra cosa. Se usan para pasar sin copiar.',
    example: 'void subir(int &n) { n++; } int x = 1; subir(x); // x vale 2',
  },
  'cpp-const-method': {
    title: 'Métodos const',
    definition:
      'Un método marcado const al final promete no cambiar el objeto: dentro no se pueden modificar atributos, y es el único que se puede llamar sobre un objeto const.',
    example: 'int getValue() const { return _value; }',
  },
  'cpp-new-delete': {
    title: 'new y delete',
    definition:
      'new crea un objeto (llamando a su constructor) y delete lo destruye. Lo creado con new[] se libera con delete[], para que se llame al destructor de cada elemento.',
    example: 'Zombie *z = new Zombie[5]; … delete[] z;',
  },
  'cpp-canonical': {
    title: 'Forma canónica ortodoxa',
    definition:
      'Una clase con recursos propios define: constructor por defecto, constructor de copia, operador de asignación y destructor. La copia se usa al crear desde otro; operator=, al asignar a uno que ya existe.',
    example: 'A b(a); // copia. A c; c = a; // operator=',
  },
  'cpp-shallow-copy': {
    title: 'Copia superficial y profunda',
    definition:
      'La copia por defecto copia los punteros, no lo apuntado: dos objetos comparten la misma memoria y al destruirse la liberan dos veces. Una copia profunda reserva su propia memoria y copia el contenido.',
    example:
      'Brain(const Brain &o) { ideas = new std::string[100]; for (…) ideas[i] = o.ideas[i]; }',
  },
  'cpp-virtual': {
    title: 'Métodos virtuales',
    definition:
      'Sin virtual, el método que se ejecuta depende del tipo del puntero; con virtual, del objeto real. Es lo que permite el polimorfismo: un Animal* que es un Dog ladra.',
    example:
      'virtual void makeSound() const; en Animal → a->makeSound() dice «Guau» si a es un Dog.',
  },
  'cpp-virtual-destructor': {
    title: 'Destructor virtual',
    definition:
      'Si una clase se usa como base polimórfica, su destructor debe ser virtual: si no, delete por un puntero a la base no llama al destructor de la hija y se queda memoria sin liberar.',
    example: 'virtual ~Animal();',
  },
  'cpp-abstract': {
    title: 'Clases abstractas',
    definition:
      'Una clase con algún método virtual puro (= 0) es abstracta: no se pueden crear objetos de ella, solo de hijas que implementen esos métodos. Sirve de interfaz.',
    example: 'class AMateria { public: virtual AMateria *clone() const = 0; };',
  },
  'cpp-diamond': {
    title: 'Herencia en diamante',
    definition:
      'Si dos clases heredan de la misma base y una cuarta hereda de las dos, tendría dos copias de la base. Con herencia virtual, las dos comparten una sola.',
    example:
      'class ScavTrap : virtual public ClapTrap {}; class FragTrap : virtual public ClapTrap {};',
  },
  'cpp-exceptions': {
    title: 'Excepciones',
    definition:
      'throw lanza una excepción: se corta lo que se hacía y se busca, subiendo por las llamadas, un catch de ese tipo. Las propias heredan de std::exception y explican el error con what().',
    example:
      'class GradeTooHighException : public std::exception { const char *what() const throw() { return "Grade too high"; } };',
  },
  'cpp-catch-ref': {
    title: 'Capturar por referencia',
    definition:
      'Se captura con catch (const std::exception &e): sin copiar y sin perder el tipo real. Por valor se copia como la base y what() sería el de la base (slicing).',
    example:
      'try { b.incrementGrade(); } catch (const std::exception &e) { std::cerr << e.what(); }',
  },
  'cpp-casts': {
    title: 'Casts de C++',
    definition:
      'static_cast convierte entre tipos relacionados (números, punteros de la jerarquía) al compilar. dynamic_cast comprueba en ejecución el tipo real de un objeto polimórfico. reinterpret_cast reinterpreta los bits (puntero ↔ entero). const_cast quita o pone const.',
    example: 'int n = static_cast<int>(3.7); uintptr_t raw = reinterpret_cast<uintptr_t>(ptr);',
  },
  'cpp-dynamic-null': {
    title: 'dynamic_cast que falla',
    definition:
      'Con punteros, un dynamic_cast que no encaja devuelve NULL; con referencias (que no pueden ser nulas) lanza std::bad_cast. Así se identifica el tipo real.',
    example:
      'if (dynamic_cast<A *>(p)) std::cout << "A"; try { (void)dynamic_cast<B &>(r); } catch (std::exception &) {}',
  },
  'cpp-templates': {
    title: 'Plantillas',
    definition:
      'Una plantilla es código genérico: el compilador genera una versión para cada tipo con que se usa. Por eso va entera en la cabecera: hay que verla para generarla.',
    example: 'template <typename T> void swap(T &a, T &b) { T tmp = a; a = b; b = tmp; }',
  },
  'cpp-containers': {
    title: 'Contenedores de la STL',
    definition:
      'vector: array que crece, acceso por índice. list: lista doblemente enlazada. map: árbol ordenado por clave. stack y queue: adaptadores LIFO y FIFO. deque: inserta rápido por los dos lados.',
    example: 'std::map<std::string, float> rates; rates["2011-01-03"] = 0.3;',
  },
  'cpp-iterator-invalid': {
    title: 'Iteradores invalidados',
    definition:
      'Algunas operaciones invalidan los iteradores: en un vector, cuando crece y cambia de sitio (push_back), o al borrar. Usar un iterador inválido es comportamiento indefinido.',
    example: 'Tras v.push_back(x) hay que volver a pedir it = v.begin().',
  },
  'cpp-rpn': {
    title: 'Notación polaca inversa',
    definition:
      'Los operadores van detrás de sus operandos. Se evalúa con una pila: cada número se apila y cada operador saca dos, opera y apila el resultado.',
    example: '3 4 + 2 * → 7 2 * → 14. 5 1 2 + 4 * + 3 - → 14.',
  },
  'py-mutable-default': {
    title: 'Valores por defecto mutables',
    definition:
      'El valor por defecto se crea una sola vez, al definir la función. Si es una lista o un diccionario, todas las llamadas comparten el mismo. Se usa None y se crea dentro.',
    example: 'def add(item, items=None):\\n    if items is None:\\n        items = []',
  },
  'py-is-eq': {
    title: '== e is',
    definition:
      '== compara valores; is, si son el mismo objeto. Para None, True y False se usa is.',
    example: '[1] == [1] → True; [1] is [1] → False. if x is None: …',
  },
  'py-copy': {
    title: 'Asignar no copia',
    definition:
      'En Python las variables son nombres que apuntan a objetos: b = a hace que los dos nombres apunten a la misma lista. Para una copia: a.copy(), list(a) o a[:] (y copy.deepcopy si hay listas dentro).',
    example: 'a = [1, 2]; b = a; b.append(3) → a también es [1, 2, 3].',
  },
  'py-slicing': {
    title: 'Slicing',
    definition:
      'secuencia[inicio:fin:paso] coge del inicio (incluido) al fin (sin incluir) con ese paso. Los índices negativos cuentan desde el final y el paso -1 da la vuelta.',
    example: '"programa"[1:4] → "rog"; "programa"[-3:] → "ama"; "programa"[::-1] → "amargorp".',
  },
  'py-dict-get': {
    title: 'Diccionarios',
    definition:
      'd[clave] lanza KeyError si no está; d.get(clave, defecto) devuelve el defecto (o None). `in` dice si la clave existe.',
    example: 'edades.get("ana", 0) + 1; if "ana" in edades: …',
  },
  'py-comprehension': {
    title: 'Comprensiones',
    definition:
      'Una forma corta de construir listas, conjuntos o diccionarios: [expresión for x in iterable if condición].',
    example: '[x * x for x in range(5) if x % 2 == 0] → [0, 4, 16]. {k: len(k) for k in nombres}',
  },
  'py-generator': {
    title: 'Generadores',
    definition:
      'Una función con yield devuelve un generador: produce valores de uno en uno, cuando se piden, y se queda parada en cada yield. No guarda toda la secuencia en memoria.',
    example:
      'def fib():\\n    a, b = 0, 1\\n    while True:\\n        yield a\\n        a, b = b, a + b',
  },
  'py-exceptions': {
    title: 'try, except, else y finally',
    definition:
      'try prueba un bloque; except atrapa los errores del tipo que diga; else se ejecuta si no hubo error; finally, siempre, haya error o no.',
    example: 'try:\\n    n = int(texto)\\nexcept ValueError:\\n    print("no es un número")',
  },
  'py-classes': {
    title: 'Clases y self',
    definition:
      '__init__ prepara cada objeto nuevo. self es el objeto sobre el que se llama el método: obj.metodo() equivale a Clase.metodo(obj).',
    example: 'class Planta:\\n    def __init__(self, nombre):\\n        self.nombre = nombre',
  },
  'py-abc': {
    title: 'Clases abstractas (ABC)',
    definition:
      'Heredando de ABC y marcando métodos con @abstractmethod, Python no deja crear objetos de la clase mientras falte alguno por implementar (TypeError).',
    example: 'class Forma(ABC):\\n    @abstractmethod\\n    def area(self) -> float: ...',
  },
  'py-typing': {
    title: 'Anotaciones de tipo',
    definition:
      'Las anotaciones (x: int, -> str) documentan los tipos, pero Python no las comprueba al ejecutar. Las comprueban herramientas como mypy, antes de ejecutar.',
    example: 'def saluda(nombre: str) -> str: … ; mypy programa.py avisa si pasas un int.',
  },
  'py-scope': {
    title: 'Ámbito de las variables',
    definition:
      'Asignar a un nombre dentro de una función lo hace local en toda la función. Para cambiar una variable global hace falta global (o nonlocal para la de la función de fuera).',
    example: 'def inc():\\n    global count\\n    count += 1',
  },
  'py-venv': {
    title: 'Entornos virtuales',
    definition:
      'Un venv es una carpeta con su propio Python y sus paquetes, aparte del sistema. requirements.txt lista las dependencias para instalarlas iguales en cualquier sitio.',
    example:
      'python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt',
  },
  'py-main-guard': {
    title: 'if __name__ == "__main__"',
    definition:
      'Al ejecutar un fichero, __name__ vale "__main__"; al importarlo, el nombre del módulo. El if deja código que solo corre al ejecutar el fichero, no al importarlo.',
    example: 'if __name__ == "__main__":\\n    main()',
  },
  'py-json': {
    title: 'JSON',
    definition:
      'JSON es texto con objetos, listas, cadenas, números, true, false y null. Las claves y los textos van entre comillas dobles y no se admiten comas finales. En Python: json.loads lee y json.dumps escribe.',
    example: 'json.loads(\'{"name": "fn_add", "args": [1, 2]}\')["args"] → [1, 2]',
  },
  'llm-tokens': {
    title: 'Tokens y decodificación restringida',
    definition:
      'Un modelo de lenguaje genera texto token a token, eligiendo cada uno según probabilidades. Si en cada paso solo se dejan elegir tokens que mantengan un formato (por ejemplo JSON válido), la salida cumple el formato siempre.',
    example: 'Tras {"name": se quitan los tokens que no empiecen una cadena.',
  },
  'llm-function-calling': {
    title: 'Function calling',
    definition:
      'El modelo no ejecuta nada: elige qué función llamar y con qué argumentos (normalmente en JSON), y tu programa la ejecuta y le devuelve el resultado.',
    example: 'Pregunta «¿Cuánto es 2 + 3?» → {"name": "add", "parameters": {"a": 2, "b": 3}}.',
  },
}
