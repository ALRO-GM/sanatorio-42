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
        right: [
          'Espera eventos y llama a tus funciones (hooks)',
          'Entra en el bucle de eventos y no vuelve',
        ],
        wrong: ['Dibuja un píxel', 'Abre una ventana', 'Carga una imagen', 'Termina el programa'],
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
          'Que la ventana se mueve sola',
          'Que no se puede cambiar de tamaño',
          'Que el programa va más lento',
        ],
      },
    ],
    wrong: ['Dibuja un píxel', 'Abre una ventana', 'Carga una imagen'],
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
          'Muchísima velocidad, y que no se vea parpadear',
          'Que cada píxel no es una llamada lenta: se pinta todo de una vez',
        ],
      },
    ],
    wrong: [
      'Que se pueden usar colores',
      'Que ocupa menos memoria',
      'Que se ve más pixelado',
      'Que se cumple la norma',
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
          'Un flood fill desde el jugador, y ver qué queda sin tocar',
          'Un recorrido desde el jugador, como BFS o flood fill',
        ],
      },
    ],
    wrong: [
      'Contar las paredes',
      'Mirar que el mapa sea rectangular',
      'Probar movimientos al azar',
      'Comprobar que hay una sola salida',
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
          'Lo lejano se ve más pequeño',
          'Solo se ve desde arriba',
          'Con dos puntos de fuga',
          'Uno de ellos desaparece',
        ],
      },
      {
        ask: ['¿Qué hace el algoritmo de Bresenham?', '¿Para qué sirve Bresenham?'],
        right: [
          'Dibuja una línea entre dos puntos píxel a píxel, solo con enteros',
          'Traza rectas con píxeles sin usar decimales',
        ],
        wrong: ['Rellena polígonos', 'Rota el mapa', 'Calcula la perspectiva'],
      },
    ],
    wrong: ['Lo lejano se ve más pequeño', 'Solo se ve desde arriba', 'Con dos puntos de fuga'],
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
          'c es fijo y el punto de la pantalla es el z inicial',
          'c no varía y z empieza en el píxel',
        ],
        wrong: [
          'Usa z³ en vez de z²',
          'Solo se ve en blanco y negro',
          'No se le puede hacer zoom',
          'Es Mandelbrot girado',
        ],
      },
      {
        ask: ['¿Cuánto es i²?', '¿Cuánto vale la unidad imaginaria al cuadrado?'],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: ['Usa z³ en vez de z²', 'Solo se ve en blanco y negro', 'Es Mandelbrot girado'],
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
          'Uno solo',
          'Uno por cada pared del mapa',
          'Uno por cada dirección del jugador',
        ],
      },
      {
        ask: ['¿Para qué sirve DDA en cub3d?', '¿Qué encuentra el algoritmo DDA?'],
        right: [
          'La primera pared que toca el rayo, casilla a casilla',
          'Por qué casillas pasa el rayo hasta dar con una pared',
        ],
        wrong: ['El color del cielo', 'La textura del suelo', 'La posición del jugador'],
      },
    ],
    wrong: ['Uno por cada píxel de la pantalla', 'Uno solo', 'Uno por cada pared del mapa'],
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
          'Usas la distancia real al punto, no la perpendicular al plano de la cámara',
          'No corriges la distancia con el coseno del ángulo del rayo',
        ],
      },
    ],
    wrong: [
      'La textura está mal cargada',
      'El campo de visión es pequeño',
      'Faltan rayos',
      'El mapa no está cerrado',
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
          'Que el jugador o los rayos se salgan y se lea fuera de la memoria',
          'Que algo se escape del mapa y el programa lea donde no debe',
        ],
      },
    ],
    wrong: [
      'Que se vea menos bonito',
      'Que la MiniLibX se niegue a abrirlo',
      'Que cargue más despacio',
      'Que no haya salida',
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
        wrong: ['Paralelos', 'Iguales', 'Opuestos'],
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
          'Ponerlo perpendicular',
          'Hacer positivas sus componentes',
          'Redondear sus componentes',
          'Girarlo hacia la cámara',
        ],
      },
      {
        ask: ['¿Cuánto mide el vector (3, 4, 0)?', '¿Cuál es la longitud de (3, 4, 0)?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: [
      'Ponerlo perpendicular',
      'Hacer positivas sus componentes',
      'Redondear sus componentes',
    ],
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
          'Que la toca en un solo punto',
          'Que la cámara está dentro',
          'Que la esfera está detrás',
          'Que la toca en dos puntos',
        ],
      },
      {
        ask: [
          'Hay dos cortes con la esfera, en t = -2 y en t = 5. ¿Cuál se ve?',
          'Con soluciones t = -2 y t = 5, ¿cuál es el punto visible?',
        ],
        right: ['El de t = 5: el de t negativo está detrás de la cámara'],
        wrong: ['El de t = -2, porque es el menor', 'Los dos, mezclados', 'Ninguno de los dos'],
      },
    ],
    wrong: [
      'Que la toca en un solo punto',
      'Que la cámara está dentro',
      'Que la esfera está detrás',
    ],
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
          'Las superficies salen llenas de puntitos negros (shadow acne). ¿Qué falla?',
          'El rayo de sombra choca con el mismo objeto del que sale. ¿Cómo se arregla?',
        ],
        right: [
          'Hay que separar un poco (epsilon) el origen del rayo de sombra de la superficie',
          'Hay que mover el origen del rayo de sombra un poco a lo largo de la normal',
        ],
      },
    ],
    wrong: [
      'Falta luz ambiente',
      'Hay demasiadas luces',
      'La resolución es baja',
      'La cámara está mal colocada',
    ],
    why: 'Con floats, el punto de corte puede quedar un pelo bajo la superficie: el rayo de sombra la vuelve a tocar.',
  },
]
