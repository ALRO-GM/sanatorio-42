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
          'Con line_length = 3200 y 4 bytes por píxel, ¿dónde empieza el píxel (10, 2)?',
        ],
        right: ['6440', 'En el 6440: 2 · 3200 + 10 · 4'],
      },
    ],
    wrong: ['1610', '820', '6410', '3210', '2010'],
    why: 'Se salta y filas enteras (y · line_length) y luego x píxeles (x · bytes por píxel).',
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
          'En 0xAARRGGBB, el color 0x00FF0000 es…',
        ],
        right: ['Rojo'],
      },
      {
        ask: [
          '¿Qué color es 0x0000FF00 en formato ARGB?',
          'En 0xAARRGGBB, el color 0x0000FF00 es…',
        ],
        right: ['Verde'],
        wrong: ['Rojo'],
      },
    ],
    wrong: ['Azul', 'Blanco', 'Negro', 'Amarillo'],
    why: 'Cada canal ocupa un byte: AA RR GG BB. FF en el de rojo, rojo; en el de verde, verde.',
  },
  {
    id: 'gfx-events',
    topic: 'gráficos',
    needs: { projects: ANY_2D },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `mlx_loop`?', 'Tras llamar a mlx_loop, el programa…'],
        right: [
          'Se queda esperando eventos y llamando a tus funciones (hooks)',
          'Entra en el bucle de eventos y no vuelve',
        ],
      },
      {
        ask: [
          '¿Por qué hay que atender el evento de cerrar la ventana (la cruz)?',
          'Si no se atiende la cruz de la ventana…',
        ],
        right: [
          'Para salir limpiamente: si no, la ventana no se cierra bien',
          'El programa no termina al pulsarla',
        ],
        wrong: [
          'Para que la ventana no se mueva',
          'Para cambiar de tamaño',
          'Para que vaya más rápido',
        ],
      },
    ],
    wrong: ['Dibuja un píxel', 'Abre una ventana', 'Carga una imagen', 'Termina el programa'],
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
          'Dibujar en una imagen y volcarla entera es mejor porque…',
        ],
        right: [
          'Es muchísimo más rápido y no se ve parpadear',
          'Cada pixel_put es una llamada lenta; la imagen se pinta de una vez',
        ],
      },
    ],
    wrong: [
      'Porque pixel_put no admite colores',
      'Porque ocupa menos memoria',
      'Porque pixel_put está prohibido siempre',
      'Para que se vea pixelado',
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
          'Para saber si el mapa tiene solución, se suele usar…',
        ],
        right: [
          'Un flood fill (rellenar desde el jugador) y ver qué queda sin tocar',
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
          'En una isométrica, los tres ejes…',
        ],
        right: [
          'Los tres ejes se ven igual de escorzados, a 120° entre sí',
          'Se ven a 120° y con la misma escala',
        ],
      },
      {
        ask: ['¿Qué hace el algoritmo de Bresenham?', 'Bresenham sirve para…'],
        right: [
          'Dibujar una línea entre dos puntos con píxeles, solo con enteros',
          'Trazar rectas píxel a píxel sin decimales',
        ],
        wrong: ['Rellenar polígonos', 'Rotar el mapa', 'Calcular la perspectiva'],
      },
    ],
    wrong: [
      'Lo lejano se ve más pequeño',
      'Solo se ve desde arriba',
      'Se ve un único eje',
      'Usa dos puntos de fuga',
    ],
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
        ask: ['¿Qué fórmula se repite para el conjunto de Mandelbrot?', 'Mandelbrot itera…'],
        right: ['z = z² + c, empezando con z = 0', 'zₙ₊₁ = zₙ² + c'],
      },
      {
        ask: [
          '¿Cuándo se da por hecho que un punto escapa (no está en el conjunto)?',
          'Se deja de iterar en cuanto…',
        ],
        right: ['Cuando |z| pasa de 2', 'El módulo de z supera 2'],
        wrong: ['Cuando |z| llega a 1', 'Cuando z es negativo', 'Tras 2 iteraciones'],
      },
    ],
    wrong: ['z = 2z + c', 'z = z³ - 1', 'z = c² + z', 'z = z / c'],
    why: 'Si |z| supera 2, ya se va al infinito seguro. Las iteraciones que tarda dan el color.',
  },
  {
    id: 'gfx-julia',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: ['¿En qué se diferencia Julia de Mandelbrot?', 'Julia usa la misma fórmula, pero…'],
        right: [
          'c es fijo y el punto de la pantalla es el z inicial',
          'Cambia qué es fijo: c no varía y z empieza en el píxel',
        ],
      },
      {
        ask: ['¿Cuánto es i²?', 'La unidad imaginaria al cuadrado vale…'],
        right: ['-1'],
        wrong: ['1', 'i', '0'],
      },
    ],
    wrong: [
      'Usa z³ en vez de z²',
      'Solo se ve en blanco y negro',
      'No tiene zoom',
      'Es Mandelbrot girado',
    ],
    why: 'En Mandelbrot c es el píxel y z empieza en 0; en Julia, c es fijo y z empieza en el píxel.',
  },
  {
    id: 'gfx-complex-square',
    topic: 'fractales',
    needs: { projects: FRACTOL },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: ['Si z = a + bi, ¿cuánto vale z²?', '(a + bi)² es…'],
        right: ['a² - b² + 2abi', '(a² - b²) + (2ab)i'],
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
          'Para pintar la pantalla, el raycaster lanza…',
        ],
        right: ['Uno por cada columna de la pantalla', 'Tantos como píxeles de ancho'],
      },
      {
        ask: ['¿Para qué sirve DDA en cub3d?', 'El algoritmo DDA encuentra…'],
        right: [
          'La primera pared que toca el rayo, casilla a casilla',
          'Por qué casillas pasa el rayo hasta dar con una pared',
        ],
        wrong: ['El color del cielo', 'La textura del suelo', 'La posición del jugador'],
      },
    ],
    wrong: [
      'Uno por píxel de la pantalla',
      'Uno solo',
      'Uno por pared del mapa',
      'Cuatro, uno por cada dirección',
    ],
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
          'Una pared recta se ve abombada en tu raycaster. ¿Qué distancia estás usando?',
        ],
        right: [
          'Usas la distancia real al punto, no la perpendicular al plano de la cámara',
          'Falta corregir la distancia con el coseno del ángulo del rayo',
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
          'Si el mapa tiene un hueco al borde…',
        ],
        right: [
          'Para que nada se salga del mapa (ni el jugador ni los rayos)',
          'Los rayos o el jugador se salen y se lee fuera de la memoria',
        ],
      },
    ],
    wrong: [
      'Para que se vea más bonito',
      'Porque lo pide la MiniLibX',
      'Para que cargue más rápido',
      'Para que haya salida',
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
          'Si a · b = 0, los vectores son…',
        ],
        right: ['0', 'Perpendiculares: da 0'],
      },
      {
        ask: [
          '¿Cuánto vale (1, 2, 3) · (4, 5, 6)?',
          'El producto escalar de (1,2,3) y (4,5,6) es…',
        ],
        right: ['32'],
        wrong: ['21', '(4, 10, 18)', '15'],
      },
    ],
    wrong: ['1', '-1', 'El producto de sus longitudes', 'Un vector perpendicular a los dos'],
    why: 'a · b = |a|·|b|·cos θ: con 90° el coseno es 0. Por componentes: 4 + 10 + 18 = 32.',
  },
  {
    id: 'gfx-normalize',
    topic: 'trazado de rayos',
    needs: { projects: MINIRT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es normalizar un vector?', 'Un vector normalizado…'],
        right: ['Dividirlo por su longitud para que mida 1', 'Mide 1 y conserva la dirección'],
      },
      {
        ask: ['¿Cuánto mide el vector (3, 4, 0)?', 'La longitud de (3, 4, 0) es…'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: [
      'Ponerlo perpendicular',
      'Hacerlo positivo',
      'Redondear sus componentes',
      'Girarlo hacia la cámara',
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
          'Si b² - 4ac < 0 al cruzar el rayo con la esfera…',
        ],
        right: ['Que el rayo no toca la esfera', 'No hay corte: el rayo pasa de largo'],
      },
      {
        ask: [
          'Hay dos cortes con la esfera, en t = -2 y t = 5. ¿Cuál se ve?',
          'Con soluciones t = -2 y t = 5, el punto visible es…',
        ],
        right: ['t = 5: el de t negativo está detrás de la cámara', 't = 5'],
        wrong: ['t = -2, porque es el menor', 'Los dos', 'Ninguno'],
      },
    ],
    wrong: [
      'Que la toca en un solo punto',
      'Que la cámara está dentro',
      'Que la esfera está detrás',
      'Que la toca en dos puntos',
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
          'Por precisión, el rayo de sombra se corta con su propia superficie: hay que separarlo un poco (epsilon)',
          'Mover un poco el origen del rayo de sombra a lo largo de la normal',
        ],
      },
    ],
    wrong: [
      'Falta luz ambiente',
      'La normal está sin normalizar siempre',
      'Hay demasiadas luces',
      'La resolución es baja',
    ],
    why: 'Con floats, el punto de corte puede quedar un pelo bajo la superficie: el rayo de sombra la vuelve a tocar.',
  },
]
