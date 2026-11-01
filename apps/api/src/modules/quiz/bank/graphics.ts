/**
 * Banco de Not-games: gráficos. Ventanas y eventos (so_long), proyecciones
 * (FdF), fractales y números complejos (fract-ol), raycasting (cub3d) y
 * trazado de rayos (miniRT).
 */

import type { Concept } from './types.js'

const SO_LONG = ['so_long']
const FDF = ['42cursus-fdf']
const FRACTOL = ['42cursus-fract-ol']
const CUB3D = ['cub3d']
const MINIRT = ['minirt']
const ANY_2D = [...SO_LONG, ...FDF, ...FRACTOL, ...CUB3D, ...MINIRT]

export const GRAPHICS: readonly Concept[] = [
  {
    id: 'gfx-pixel-offset',
    topic: 'gráficos',
    needs: { projects: ANY_2D },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'Una imagen de 800 px de ancho, 4 bytes por píxel y sin relleno. ¿En qué byte empieza el píxel (x = 10, y = 2)?',
          'Con line_length = 3200 y 4 bytes por píxel, ¿en qué byte empieza el píxel (10, 2)?',
        ],
        right: ['6440'],
      },
    ],
    wrong: ['1610', '820', '6410', '3210', '2010'],
    why: 'Se saltan y filas enteras (y · line_length) y luego x píxeles (x · bytes por píxel): 2 · 3200 + 10 · 4 = 6440.',
  },
  {
    id: 'gfx-color',
    topic: 'gráficos',
    needs: { projects: ANY_2D },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué color es 0x00FF0000 en formato ARGB?',
          'En 0xAARRGGBB, ¿qué color es 0x00FF0000?',
        ],
        right: ['Rojo'],
        wrong: ['Verde', 'Azul', 'Blanco', 'Negro'],
      },
      {
        ask: [
          '¿Qué color es 0x0000FF00 en formato ARGB?',
          'En 0xAARRGGBB, ¿qué color es 0x0000FF00?',
        ],
        right: ['Verde'],
        wrong: ['Rojo', 'Azul', 'Blanco', 'Negro'],
      },
    ],
    wrong: ['Azul', 'Blanco', 'Negro', 'Amarillo'],
    why: 'Cada canal ocupa un byte: AA RR GG BB. FF en el de rojo da rojo; en el de verde, verde.',
  },
  {
    id: 'gfx-events',
    topic: 'gráficos',
    needs: { projects: ANY_2D },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `mlx_loop`?', 'Después de llamar a mlx_loop, ¿qué hace el programa?'],
        right: ['Espera eventos y llama a tus hooks', 'Entra en el bucle de eventos y no vuelve'],
        wrong: [
          'Dibuja en la ventana todo lo pendiente',
          'Abre una ventana nueva con su tamaño',
          'Carga las imágenes que se han pedido',
          'Cierra la conexión y termina el programa',
        ],
      },
      {
        ask: [
          '¿Por qué hay que atender el evento de cerrar la ventana (la cruz)?',
          '¿Qué pasa si no se atiende la cruz de la ventana?',
        ],
        right: [
          'Que el programa no termina al pulsarla',
          'Que no se sale limpiamente al cerrar la ventana',
        ],
        wrong: [
          'Que la ventana se mueve sola por la pantalla',
          'Que la ventana no se puede cambiar de tamaño',
          'Que el programa va más lento al redibujar',
        ],
      },
    ],
    wrong: ['Dibuja en la ventana todo lo pendiente', 'Abre una ventana nueva con su tamaño'],
    why: 'Los programas gráficos reaccionan a eventos; el bucle de eventos llama a tus hooks y tú decides cuándo salir.',
  },
  {
    id: 'gfx-image-buffer',
    topic: 'gráficos',
    needs: { projects: ANY_2D },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué se dibuja en una imagen y se pone de golpe en vez de usar `mlx_pixel_put` píxel a píxel?',
          '¿Qué se gana dibujando en una imagen y volcándola entera?',
        ],
        right: [
          'Mucha velocidad, y que no se vea parpadear',
          'Una sola llamada lenta en vez de una por píxel',
        ],
      },
    ],
    wrong: [
      'Que se pueden usar más colores a la vez',
      'Que la ventana ocupa menos memoria',
      'Que los píxeles se ven más nítidos',
      'Que solo así se cumple la norma de 42',
    ],
    why: 'Pintar en memoria y volcar una vez evita miles de llamadas y el parpadeo de ver el dibujo a medias.',
  },
  {
    id: 'gfx-flood-fill',
    topic: 'gráficos',
    needs: { projects: SO_LONG },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo compruebas que se puede llegar a todos los coleccionables y a la salida del mapa?',
          '¿Qué se suele usar para saber si el mapa tiene solución?',
        ],
        right: [
          'Un flood fill desde el jugador, mirando qué falta',
          'Un recorrido desde el jugador, como un BFS',
        ],
      },
    ],
    wrong: [
      'Contar que haya más suelo que paredes',
      'Mirar que el mapa sea rectangular y cerrado',
      'Probar movimientos al azar un rato',
      'Comprobar que hay una sola salida y un jugador',
    ],
    why: 'Rellenando desde el jugador se marca todo lo alcanzable; si falta algo, no hay solución.',
  },
  {
    id: 'gfx-isometric',
    topic: 'gráficos',
    needs: { projects: FDF },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué tiene de especial la proyección isométrica?',
          '¿Cómo se ven los tres ejes en una proyección isométrica?',
        ],
        right: ['Igual de escorzados y a 120° entre sí', 'A 120° y con la misma escala'],
        wrong: [
          'Lo que está lejos se ve más pequeño',
          'Solo se ve el mapa desde arriba',
          'Tienen dos puntos de fuga',
          'Uno de los tres ejes desaparece',
        ],
      },
      {
        ask: ['¿Qué hace el algoritmo de Bresenham?', '¿Para qué sirve Bresenham?'],
        right: [
          'Dibuja una recta píxel a píxel, solo con enteros',
          'Traza rectas con píxeles sin usar decimales',
        ],
        wrong: [
          'Rellena de color el interior de un polígono',
          'Gira el mapa alrededor de su centro',
          'Calcula la perspectiva de cada punto',
          'Suaviza los bordes de las líneas con grises',
        ],
      },
    ],
    wrong: ['Lo que está lejos se ve más pequeño', 'Solo se ve el mapa desde arriba'],
    why: 'La isométrica no tiene perspectiva: misma escala en los tres ejes. Bresenham decide qué píxel encender en cada paso.',
  },
  {
    id: 'gfx-mandelbrot',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué fórmula se repite para el conjunto de Mandelbrot?',
          '¿Qué se itera en Mandelbrot?',
        ],
        right: ['z = z² + c, empezando con z = 0'],
        wrong: [
          'z = 2z + c, empezando con z = 0',
          'z = z³ - 1, empezando con z = c',
          'z = c² + z, empezando con z = 1',
        ],
      },
      {
        ask: [
          '¿Cuándo se da por hecho que un punto escapa (no está en el conjunto)?',
          '¿Cuándo se deja de iterar un punto?',
        ],
        right: ['Cuando |z| pasa de 2'],
        wrong: ['Cuando |z| llega a 1', 'Cuando z es negativo', 'Después de 2 iteraciones'],
      },
    ],
    wrong: ['z = 2z + c', 'z = z³ - 1', 'z = c² + z'],
    why: 'Si |z| supera 2, se va al infinito seguro. Las iteraciones que tarda dan el color.',
  },
  {
    id: 'gfx-julia',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿En qué se diferencia Julia de Mandelbrot?',
          'Julia usa la misma fórmula. ¿Qué cambia?',
        ],
        right: [
          'c es fijo y z empieza en el punto de la pantalla',
          'c no cambia y el z inicial es el píxel',
        ],
        wrong: [
          'Usa z³ + c en vez de z² + c para iterar',
          'Solo se puede pintar en blanco y negro',
          'No se le puede hacer zoom: no tiene detalle',
          'Es el mismo Mandelbrot, girado 90 grados',
        ],
      },
      {
        ask: ['¿Cuánto es i²?', '¿Cuánto vale la unidad imaginaria al cuadrado?'],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: ['Usa z³ + c en vez de z² + c para iterar', 'Solo se puede pintar en blanco y negro'],
    why: 'En Mandelbrot, c es el píxel y z empieza en 0; en Julia, c es fijo y z empieza en el píxel.',
  },
  {
    id: 'gfx-complex-square',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: ['Si z = a + bi, ¿cuánto vale z²?', '¿Cuánto es (a + bi)²?'],
        right: ['a² - b² + 2abi'],
      },
    ],
    wrong: ['a² + b² + 2abi', 'a² + b²i', 'a² - b²', '2a + 2bi'],
    why: '(a + bi)² = a² + 2abi + b²i², y como i² = -1 queda a² - b² + 2abi.',
  },
  {
    id: 'gfx-raycast',
    topic: 'raycasting',
    needs: { projects: CUB3D },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En un raycaster como Wolfenstein 3D, ¿cuántos rayos se lanzan?',
          '¿Cuántos rayos lanza el raycaster para pintar la pantalla?',
        ],
        right: ['Uno por cada columna de la pantalla', 'Tantos como píxeles de ancho'],
        wrong: [
          'Uno por cada píxel de la pantalla',
          'Uno solo, en la dirección de la vista',
          'Uno por cada pared del mapa',
          'Uno por cada grado que gira el jugador',
        ],
      },
      {
        ask: ['¿Para qué sirve DDA en cub3d?', '¿Qué encuentra el algoritmo DDA?'],
        right: [
          'La primera pared que toca cada rayo',
          'Las casillas que cruza el rayo hasta un muro',
        ],
        wrong: [
          'El color del techo según la dirección',
          'Qué textura de suelo poner en cada fila',
          'La posición del jugador en cada fotograma',
        ],
      },
    ],
    wrong: ['Uno por cada píxel de la pantalla', 'Uno por cada pared del mapa'],
    why: 'Cada columna es un rayo; la distancia a la pared que toca da la altura de esa franja.',
  },
  {
    id: 'gfx-fisheye',
    topic: 'raycasting',
    needs: { projects: CUB3D },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Tus paredes salen curvadas, como en ojo de pez. ¿Por qué?',
          'Una pared recta se ve abombada en tu raycaster. ¿Qué estás haciendo mal?',
        ],
        right: [
          'Usas la distancia real, no la perpendicular a la cámara',
          'No corriges la distancia con el coseno del rayo',
        ],
      },
    ],
    wrong: [
      'La textura de la pared se ha cargado mal',
      'El campo de visión es demasiado pequeño',
      'Lanzas pocos rayos para el ancho de pantalla',
      'El mapa no está cerrado del todo por muros',
    ],
    why: 'Los rayos de los lados son más largos aunque la pared esté igual de lejos: hay que usar la distancia perpendicular.',
  },
  {
    id: 'gfx-map-closed',
    topic: 'raycasting',
    needs: { projects: [...CUB3D, ...SO_LONG] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Por qué hay que comprobar que el mapa está cerrado por paredes?',
          '¿Qué puede pasar si el mapa tiene un hueco en el borde?',
        ],
        right: [
          'Que un rayo o el jugador salga y se lea fuera del mapa',
          'Que se lea memoria fuera del mapa al salir de él',
        ],
      },
    ],
    wrong: [
      'Que el mapa se vea menos bonito en pantalla',
      'Que la MiniLibX se niegue a abrir la ventana',
      'Que el mapa tarde más en cargar del fichero',
      'Que el contador de movimientos se desborde',
    ],
    why: 'Un hueco deja que un rayo o el jugador salgan del mapa y se lea más allá de lo reservado.',
  },
  {
    id: 'gfx-dot-product',
    topic: 'trazado de rayos',
    needs: { projects: [...MINIRT, ...CUB3D] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuánto da el producto escalar de dos vectores perpendiculares?',
          'Dos vectores forman 90°. ¿Cuánto vale a · b?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '90'],
      },
      {
        ask: [
          '¿Cuánto vale (1, 2, 3) · (4, 5, 6)?',
          '¿Cuál es el producto escalar de (1, 2, 3) y (4, 5, 6)?',
        ],
        right: ['32'],
        wrong: ['21', '15', '90', '6'],
      },
      {
        ask: ['Si a · b = 0, ¿cómo son los vectores a y b?'],
        right: ['Perpendiculares'],
        wrong: ['Paralelos', 'De la misma longitud', 'Opuestos'],
      },
    ],
    wrong: ['1', '-1', '90'],
    why: 'a · b = |a| · |b| · cos θ: con 90° el coseno es 0. Por componentes: 4 + 10 + 18 = 32.',
  },
  {
    id: 'gfx-normalize',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es normalizar un vector?', '¿Qué se le hace a un vector al normalizarlo?'],
        right: [
          'Dividirlo por su longitud para que mida 1',
          'Dejarlo con longitud 1 y la misma dirección',
        ],
        wrong: [
          'Ponerlo perpendicular al que era',
          'Hacer positivas todas sus componentes',
          'Redondear sus componentes a enteros',
          'Girarlo hasta que apunte a la cámara',
        ],
      },
      {
        ask: ['¿Cuánto mide el vector (3, 4, 0)?', '¿Cuál es la longitud de (3, 4, 0)?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: ['Ponerlo perpendicular al que era', 'Redondear sus componentes a enteros'],
    why: 'Longitud = √(x² + y² + z²); dividiendo por ella se queda la dirección con longitud 1.',
  },
  {
    id: 'gfx-ray-sphere',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Al cortar un rayo con una esfera sale una ecuación de segundo grado. ¿Qué significa un discriminante negativo?',
          'Si b² - 4ac < 0 al cruzar el rayo con la esfera, ¿qué pasa?',
        ],
        right: ['Que el rayo no toca la esfera', 'Que no hay corte: el rayo pasa de largo'],
        wrong: [
          'Que la toca en un solo punto, de refilón',
          'Que la cámara está dentro de la esfera',
          'Que la esfera está detrás de la cámara',
          'Que la toca en dos puntos distintos',
        ],
      },
      {
        ask: [
          'Hay dos cortes con la esfera, en t = -2 y en t = 5. ¿Cuál se ve?',
          'Con soluciones t = -2 y t = 5, ¿cuál es el punto visible?',
        ],
        right: ['El de t = 5: el negativo está detrás'],
        wrong: [
          'El de t = -2, porque es el más cercano',
          'Los dos, con los colores mezclados',
          'Ninguno: un t negativo anula el corte',
        ],
      },
    ],
    wrong: ['Que la cámara está dentro de la esfera', 'Que la esfera está detrás de la cámara'],
    why: 'Sin raíces reales no hay corte. Entre las raíces vale la menor positiva: las negativas quedan detrás.',
  },
  {
    id: 'gfx-acne',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'long',
    level: 5,
    forms: [
      {
        ask: [
          'Las superficies salen llenas de puntitos negros (shadow acne). ¿Cómo se arregla?',
          'El rayo de sombra choca con el mismo objeto del que sale. ¿Cómo se arregla?',
        ],
        right: [
          'Sacando el origen del rayo un epsilon por la normal',
          'Moviendo un poco el punto de salida hacia fuera',
        ],
      },
    ],
    wrong: [
      'Subiendo la luz ambiente para tapar los puntos',
      'Quitando luces hasta que dejen de salir',
      'Subiendo la resolución de la imagen',
      'Alejando la cámara de los objetos',
    ],
    why: 'Con floats, el punto de corte puede quedar un pelo bajo la superficie: el rayo de sombra la vuelve a tocar.',
  },
  {
    id: 'sl-ber',
    topic: 'gráficos',
    needs: { projects: SO_LONG },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué extensión tiene que tener el fichero del mapa de so_long?',
          'so_long recibe un mapa por argumento. ¿Con qué extensión?',
        ],
        right: ['.ber'],
        wrong: ['.map', '.cub', '.txt', '.fdf'],
      },
      {
        ask: ['¿Qué representa la letra C en un mapa de so_long?', 'En un .ber, ¿qué es cada C?'],
        right: ['Un coleccionable'],
        wrong: ['La salida del mapa', 'Un suelo vacío', 'Un enemigo que patrulla'],
      },
      {
        ask: [
          'En un mapa de so_long, ¿qué letra marca dónde empieza el jugador?',
          '¿Con qué letra se pone la posición inicial en un .ber?',
        ],
        right: ['P'],
        wrong: ['S', 'E', 'J'],
      },
    ],
    wrong: ['0', '1'],
    why: 'El mapa es un .ber con 0 (suelo), 1 (muro), C (coleccionable), E (salida) y P (posición inicial).',
  },
  {
    id: 'sl-rules',
    topic: 'gráficos',
    needs: { projects: SO_LONG },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuántas salidas (E) tiene que tener un mapa válido de so_long?',
          'En un .ber válido, ¿cuántas E tiene que haber?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '3'],
      },
      {
        ask: [
          '¿Qué forma tiene que tener el mapa de so_long?',
          '¿Cómo tienen que ser las filas de un mapa de so_long?',
        ],
        right: ['Rectangular: filas del mismo largo'],
        wrong: [
          'Cualquiera, si está cerrado por muros',
          'Simétrica respecto al centro',
          'Con más filas que columnas',
        ],
      },
      {
        ask: [
          'En so_long, ¿cuándo se puede salir por la E?',
          '¿Qué hace falta para terminar la partida en la salida de so_long?',
        ],
        right: ['Haber recogido todos los coleccionables'],
        wrong: [
          'Nada: basta con llegar a ella',
          'Haber recogido al menos la mitad',
          'Haber dado tantos pasos como casillas',
        ],
      },
    ],
    wrong: ['Que el jugador empiece al lado de la E'],
    why: 'Un mapa válido es rectangular, cerrado, con una salida, un jugador y algún coleccionable; la salida solo vale con todos recogidos.',
  },
  {
    id: 'sl-moves',
    topic: 'gráficos',
    needs: { projects: SO_LONG },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En la parte obligatoria de so_long, ¿dónde se enseña el número de movimientos?',
          '¿Dónde pide so_long (sin bonus) escribir el contador de movimientos?',
        ],
        right: ['En la terminal, a cada movimiento'],
        wrong: [
          'En la ventana, encima del mapa',
          'Solo al final, al llegar a la salida',
          'En un fichero de log al cerrar',
        ],
      },
      {
        ask: [
          'En so_long, ¿qué tecla tiene que cerrar la ventana y salir limpiamente?',
          '¿Con qué tecla se sale de so_long, según el enunciado?',
        ],
        right: ['ESC'],
        wrong: ['Q', 'Espacio', 'Enter'],
      },
      {
        ask: ['¿Para qué sirve `mlx_hook`?', '¿Qué haces con `mlx_hook(win, 17, 0, f, p)`?'],
        right: ['Asocia una función tuya a un evento de la ventana'],
        wrong: [
          'Dibuja un píxel en una posición de la ventana',
          'Carga una imagen XPM y devuelve su puntero',
          'Abre la ventana con su tamaño y su título',
        ],
      },
    ],
    wrong: ['Nada: no hace falta'],
    why: 'so_long escribe el contador en la terminal a cada paso, ESC y la cruz cierran limpio, y mlx_hook engancha tus funciones a esos eventos.',
  },
  {
    id: 'fdf-map',
    topic: 'gráficos',
    needs: { projects: FDF },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'En un mapa .fdf, ¿qué indica cada número?',
          '¿Qué es el valor de cada número en un fichero de FdF?',
        ],
        right: ['La altura de ese punto'],
        wrong: ['El color de ese punto', 'El orden en que se dibuja', 'Su distancia a la cámara'],
      },
      {
        ask: [
          '¿Qué significa «10,0xFF0000» en un mapa de FdF?',
          'En un .fdf aparece «10,0xFF0000». ¿Qué es?',
        ],
        right: ['Altura 10 y color rojo'],
        wrong: [
          'Altura 10 y color verde',
          'Columna 10 y color rojo',
          'Altura 10 y opacidad máxima',
        ],
      },
      {
        ask: [
          '¿Cuántos puntos tiene un mapa de FdF de 10 filas con 12 números cada una?',
          'Un .fdf tiene 10 líneas de 12 números. ¿Cuántos puntos hay que dibujar?',
        ],
        right: ['120'],
        wrong: ['22', '144', '100', '132'],
      },
    ],
    wrong: ['Su número de vecinos'],
    why: 'Cada número es un punto: su columna da la x, su fila la y y su valor la altura; tras la coma puede ir su color.',
  },
  {
    id: 'fdf-rotate',
    topic: 'gráficos',
    needs: { projects: FDF },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'Giras el punto (1, 0) 90° en sentido antihorario (y hacia arriba). ¿Dónde queda?',
          'Con y hacia arriba, ¿adónde va (1, 0) al rotarlo 90° en sentido antihorario?',
        ],
        right: ['(0, 1)'],
        wrong: ['(1, 0)', '(-1, 0)', '(0, -1)', '(1, 1)'],
      },
      {
        ask: [
          'Al girar (x, y) un ángulo θ alrededor del eje z, ¿cuál es la nueva x?',
          '¿Qué fórmula da la x de un punto (x, y) girado θ sobre el eje z?',
        ],
        right: ['x·cos θ − y·sin θ'],
        wrong: ['x·sin θ + y·cos θ', 'x·cos θ + y·sin θ', 'x·cos θ − y·cos θ'],
      },
    ],
    wrong: ['x + θ'],
    why: 'Rotar θ alrededor de z da x′ = x·cos θ − y·sin θ e y′ = x·sin θ + y·cos θ; con 90°, (1, 0) pasa a (0, 1).',
  },
  {
    id: 'fdf-projection',
    topic: 'gráficos',
    needs: { projects: FDF },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué proyección pide la parte obligatoria de FdF?',
          'En FdF sin bonus, ¿cómo hay que proyectar el mapa?',
        ],
        right: ['La isométrica'],
        wrong: ['La cónica, con perspectiva', 'La paralela vista desde arriba', 'La caballera'],
      },
      {
        ask: [
          'Con una proyección cónica (con perspectiva), ¿cómo se ve lo que está más lejos?',
          'En perspectiva cónica, ¿qué le pasa a un punto que se aleja de la cámara?',
        ],
        right: ['Más pequeño'],
        wrong: ['Igual de grande', 'Más grande', 'Más arriba'],
      },
    ],
    wrong: ['Más oscuro'],
    why: 'La obligatoria es la isométrica, sin perspectiva; en la cónica se divide por la profundidad y lo lejano encoge.',
  },
  {
    id: 'fol-zoom',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Para hacer zoom hacia el ratón, ¿qué punto del plano tiene que quedarse quieto?',
          'Al hacer zoom siguiendo al ratón, ¿qué punto no se mueve en pantalla?',
        ],
        right: ['El que está bajo el cursor'],
        wrong: [
          'El centro de la ventana',
          'La esquina de arriba a la izquierda',
          'El origen, 0 + 0i',
        ],
      },
      {
        ask: [
          'Acercas el zoom ×2 con la rueda. ¿Qué le pasa al ancho del plano que se ve?',
          'Tras un zoom ×2 hacia dentro, ¿cómo cambia el trozo de plano visible a lo ancho?',
        ],
        right: ['Se divide por 2'],
        wrong: ['Se multiplica por 2', 'Se queda igual', 'Se divide por 4'],
      },
    ],
    wrong: ['Se resta 2'],
    why: 'Al acercar ×2 se ve la mitad de ancho, y para seguir al ratón se escala alrededor del punto que tiene debajo.',
  },
  {
    id: 'fol-map',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'La ventana mide 800 px de ancho y enseña la parte real de -2 a 2. ¿Qué parte real tiene el píxel x = 200?',
          'Con 800 px de ancho para la parte real de -2 a 2, ¿qué valor real cae en x = 200?',
        ],
        right: ['-1'],
        wrong: ['-1.5', '0', '1', '0.5'],
      },
      {
        ask: [
          '¿Por qué suele invertirse la y al pasar de píxel a número complejo?',
          'Al convertir la fila de un píxel en la parte imaginaria, ¿por qué se le da la vuelta?',
        ],
        right: ['En pantalla la y baja; en el plano, la parte imaginaria sube'],
        wrong: [
          'Porque la MiniLibX dibuja la imagen del revés',
          'Porque la parte imaginaria siempre es negativa',
          'Para que el fractal salga girado 90 grados',
        ],
      },
    ],
    wrong: ['-2'],
    why: 're = min + x · (max − min) / ancho: -2 + 200 · 4 / 800 = -1; y la fila crece hacia abajo, al revés que el eje imaginario.',
  },
  {
    id: 'fol-iter',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué pasa al subir el máximo de iteraciones en fract-ol?',
          'Si pasas de 50 a 500 iteraciones como máximo, ¿qué cambia?',
        ],
        right: ['Más detalle en el borde, pero va más lento'],
        wrong: [
          'Hay más zoom, pero se ven menos colores',
          'Cambia la forma del conjunto entero',
          'Va más rápido, porque escapa antes',
        ],
      },
      {
        ask: [
          '¿Qué se usa normalmente para dar color a un punto que escapa?',
          'En fract-ol, ¿de qué suele depender el color de un píxel que no está en el conjunto?',
        ],
        right: ['De cuántas iteraciones tardó en escapar'],
        wrong: [
          'De su distancia al centro de la ventana',
          'Del signo de su parte imaginaria',
          'De si su parte real es positiva o negativa',
        ],
      },
    ],
    wrong: ['De la hora a la que se dibuja'],
    why: 'Más iteraciones separan mejor lo que escapa tarde (más detalle) a costa de tiempo; esas iteraciones dan el color.',
  },
  {
    id: 'cub-file',
    topic: 'raycasting',
    needs: { projects: CUB3D },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En un fichero .cub, ¿qué indica la línea «F 220,100,0»?',
          '¿Qué es «F 220,100,0» en la escena de cub3d?',
        ],
        right: ['El color del suelo, en RGB'],
        wrong: [
          'El color del techo, en RGB',
          'La posición inicial del jugador',
          'El tamaño de la ventana en píxeles',
        ],
      },
      {
        ask: [
          '¿Qué indica «NO ./textures/north.xpm» en un .cub?',
          'En la escena de cub3d, ¿para qué es la línea que empieza por NO?',
        ],
        right: ['La textura de la cara norte de los muros'],
        wrong: [
          'El color del cielo hacia el norte',
          'La dirección inicial del jugador',
          'La textura del suelo de la mitad norte',
        ],
      },
      {
        ask: [
          'En el mapa de cub3d, ¿qué letra pone al jugador mirando al oeste?',
          '¿Qué carácter del mapa de un .cub sitúa al jugador mirando hacia el oeste?',
        ],
        right: ['W'],
        wrong: ['O', 'WE', 'P'],
      },
      {
        ask: [
          '¿Qué tiene que ir siempre lo último en un fichero .cub?',
          'En la escena de cub3d, ¿qué parte va al final del fichero?',
        ],
        right: ['El mapa'],
        wrong: ['Los colores', 'Las texturas', 'La resolución'],
      },
    ],
    wrong: ['E'],
    why: 'Un .cub trae las texturas NO, SO, WE y EA, los colores F (suelo) y C (techo) y, al final, el mapa con N, S, E o W para el jugador.',
  },
  {
    id: 'cub-textures',
    topic: 'raycasting',
    needs: { projects: CUB3D },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Para elegir la columna de la textura, ¿qué dato del punto de choque se usa?',
          '¿Con qué se decide qué columna de la textura pintar en una franja de muro?',
        ],
        right: ['La parte decimal de la coordenada a lo largo del muro'],
        wrong: [
          'La distancia del jugador al punto de choque',
          'El número de la columna de la pantalla',
          'La parte entera de la casilla que se toca',
        ],
      },
      {
        ask: [
          'La textura mide 64 px de ancho y el rayo toca el muro a 0.25 de su borde. ¿Qué columna de la textura usas?',
          'Con una textura de 64 px y un choque a 0.25 del borde del muro, ¿qué columna toca?',
        ],
        right: ['16'],
        wrong: ['25', '4', '32', '8'],
      },
      {
        ask: [
          '¿Cómo sabes qué textura (NO, SO, WE o EA) toca en un choque?',
          'En cub3d, ¿de qué depende que una franja lleve la textura norte, sur, este u oeste?',
        ],
        right: ['Del lado del muro que toca y hacia dónde va el rayo'],
        wrong: [
          'De la distancia entre el jugador y el muro',
          'De la columna de la pantalla que se pinta',
          'De la casilla en que empezó el jugador',
        ],
      },
    ],
    wrong: ['64'],
    why: 'El lado tocado (x o y) y el signo del rayo dan la textura; la parte decimal del choque, por el ancho de la textura, da la columna.',
  },
  {
    id: 'cub-collision',
    topic: 'raycasting',
    needs: { projects: CUB3D },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo se suele impedir que el jugador atraviese paredes en cub3d?',
          'En el bonus de colisiones de cub3d, ¿qué se hace antes de mover al jugador?',
        ],
        right: ['Mirar si la casilla de destino es un muro'],
        wrong: [
          'Bajar la velocidad cerca de los muros',
          'Dibujar los muros más gruesos',
          'No dejar girar la cámara cerca de ellos',
        ],
      },
      {
        ask: [
          '¿Por qué conviene dejar un margen al comprobar la casilla de destino?',
          'Al mirar colisiones, ¿para qué se mira un poco más allá del destino?',
        ],
        right: ['Para no pegarse tanto al muro que se vea mal'],
        wrong: [
          'Para que el jugador se mueva más rápido',
          'Para ahorrar rayos en las esquinas',
          'Porque el mapa empieza a contar en 1',
        ],
      },
    ],
    wrong: ['Para que el mapa ocupe menos memoria'],
    why: 'Antes de mover se mira la casilla adonde iría el jugador, con un pequeño margen para que la cámara no quede pegada al muro.',
  },
  {
    id: 'rt-file',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En un fichero .rt, ¿qué es la línea «A 0.2 255,255,255»?',
          '¿Qué declara «A 0.2 255,255,255» en una escena de miniRT?',
        ],
        right: ['La luz ambiente, con intensidad 0.2, blanca'],
        wrong: [
          'Una luz puntual en el origen, de color blanco',
          'La cámara, con 0.2 de zoom y fondo blanco',
          'Un plano a 0.2 de la cámara, de color blanco',
        ],
      },
      {
        ask: [
          '¿Cuántas cámaras (C) se pueden declarar en un .rt?',
          'En una escena de miniRT, ¿cuántas veces puede aparecer la C mayúscula?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          '¿Qué declara «sp 0,0,20.6 12.6 10,0,255» en un .rt?',
          'En miniRT, ¿qué es la línea «sp 0,0,20.6 12.6 10,0,255»?',
        ],
        right: ['Una esfera en (0, 0, 20.6) de 12.6 de diámetro'],
        wrong: [
          'Una esfera en (0, 0, 20.6) de 12.6 de radio',
          'Un foco en (0, 0, 20.6) con brillo 12.6',
          'Un plano por (0, 0, 20.6) con normal 12.6',
        ],
      },
    ],
    wrong: ['Un cilindro sin altura'],
    why: 'Las mayúsculas (A, C, L) van una sola vez: A es la ambiente (intensidad y color) y sp lleva centro, diámetro y color.',
  },
  {
    id: 'rt-light',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué luces pide la parte obligatoria de miniRT?',
          'Sin bonus, ¿qué partes del modelo de Phong hay que hacer en miniRT?',
        ],
        right: ['La ambiente y la difusa'],
        wrong: ['La difusa y la especular', 'La ambiente y la especular', 'Solo la especular'],
      },
      {
        ask: [
          'En la luz difusa, ¿de qué depende el brillo de un punto?',
          '¿Qué decide cuánta luz difusa recibe un punto de una superficie?',
        ],
        right: ['Del ángulo entre la normal y la luz'],
        wrong: [
          'De la distancia del punto a la cámara',
          'Del ángulo entre la normal y la cámara',
          'Del color del fondo de la escena',
        ],
      },
      {
        ask: [
          'Si la normal y la dirección a la luz forman 90°, ¿cuánta luz difusa recibe el punto?',
          'Con la luz rasante, a 90° de la normal, ¿qué intensidad difusa sale?',
        ],
        right: ['0'],
        wrong: ['1', '0.5', '90'],
      },
    ],
    wrong: ['Del tamaño del objeto'],
    why: 'La difusa es proporcional a n · l, el coseno entre la normal y la dirección a la luz: a 90° vale 0.',
  },
  {
    id: 'rt-camera',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En «C -50,0,20 0,0,1 70», ¿qué es el 70?',
          'En la línea de la cámara de un .rt, ¿qué indica el último número?',
        ],
        right: ['El campo de visión horizontal, en grados'],
        wrong: [
          'La distancia de la cámara al origen',
          'El zoom de la cámara, en tanto por ciento',
          'El campo de visión vertical, en radianes',
        ],
      },
      {
        ask: [
          '¿Qué tiene que cumplir el vector de orientación de la cámara en un .rt?',
          'En «C -50,0,20 0,0,1 70», ¿cómo tiene que ser el vector 0,0,1?',
        ],
        right: ['Estar normalizado, con cada eje entre -1 y 1'],
        wrong: [
          'Apuntar siempre hacia el origen de la escena',
          'Tener todas sus componentes positivas',
          'Medir lo mismo que el campo de visión',
        ],
      },
      {
        ask: [
          'Con un FOV de 90°, ¿cuánto vale tan(FOV / 2)?',
          'Con un campo de visión de 90°, ¿cuánto vale la tangente de la mitad del ángulo?',
        ],
        right: ['1'],
        wrong: ['0.5', '2', '45'],
      },
    ],
    wrong: ['Estar en grados'],
    why: 'La cámara lleva posición, una orientación normalizada y el FOV horizontal en grados; la mitad del plano mide tan(FOV / 2).',
  },
]
