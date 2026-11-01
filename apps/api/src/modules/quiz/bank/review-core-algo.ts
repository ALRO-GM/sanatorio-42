/** Repaso de Not-games: lo nuevo de algoritmos y gráficos del common core. */

import type { ReviewEntry } from './types.js'

export const REVIEW_CORE_ALGO: Record<string, ReviewEntry> = {
  'ps-ops': {
    title: 'Las operaciones de push_swap',
    definition:
      'sa/sb intercambian los dos de arriba; pa/pb pasan la cima de una pila a la otra; ra/rb rotan hacia arriba (la cima va al fondo) y rra/rrb hacia abajo. ss, rr y rrr hacen lo mismo en a y b a la vez. Si no hay elementos suficientes, no hacen nada.',
    example: 'a = 2 1 3 → sa → 1 2 3; con b vacía, pa no hace nada.',
  },
  'ps-sequence': {
    title: 'Seguir una secuencia de operaciones',
    definition:
      'Se aplican de una en una, en orden, mirando siempre la cima. Lo más fácil es escribir las dos pilas después de cada paso.',
    example: 'a = 3 1 2, b vacía → sa → a = 1 3 2 → pb → a = 3 2, b = 1.',
  },
  'ps-limits': {
    title: 'Cuántas operaciones se aceptan en push_swap',
    definition:
      'La corrección mide la longitud de la lista: para la nota máxima, 100 números al azar en menos de 700 operaciones y 500 números en 5500 como mucho. Por encima, la nota baja por tramos.',
    example: '100 números en 650 operaciones: nota máxima en esa prueba; en 1200, no.',
  },
  'ps-errors': {
    title: 'Errores y argumentos en push_swap',
    definition:
      'Si un argumento no es un entero, no cabe en un int o está repetido, push_swap escribe «Error» y un salto de línea en la salida de error (fd 2). Sin argumentos no escribe nada.',
    example: './push_swap 1 2 2 → «Error» en stderr; ./push_swap → nada.',
  },
  'ps-output': {
    title: 'Qué escribe push_swap',
    definition:
      'La lista de instrucciones, una por línea y en la salida estándar, para que checker (u otro programa) la pueda leer. Si los números ya vienen ordenados, la lista más corta está vacía.',
    example: './push_swap 2 1 3 → «sa»; ./push_swap 1 2 3 → nada.',
  },
  'ps-checker': {
    title: 'El checker del bonus',
    definition:
      'checker recibe los números como argumentos y lee las instrucciones por la entrada estándar, una por línea. Las aplica y escribe OK si a queda ordenada y b vacía, KO si no, y «Error» en stderr si algo no vale.',
    example: './push_swap 3 2 1 | ./checker 3 2 1 → OK.',
  },
  'philo-args': {
    title: 'Los argumentos de philo',
    definition:
      'philo recibe number_of_philosophers, time_to_die, time_to_eat y time_to_sleep, con los tiempos en milisegundos, y un quinto argumento opcional: number_of_times_each_philosopher_must_eat.',
    example: './philo 5 800 200 200 → 5 filósofos que mueren a los 800 ms sin comer.',
  },
  'philo-must-eat': {
    title: 'Cuándo para la simulación',
    definition:
      'Para cuando muere un filósofo. Si se da number_of_times_each_philosopher_must_eat, también para cuando todos han comido al menos ese número de veces.',
    example: './philo 5 800 200 200 7 → para cuando los cinco han comido 7 veces o alguno muere.',
  },
  'philo-one': {
    title: 'Un solo filósofo',
    definition:
      'Hay tantos tenedores como filósofos. Uno solo tiene un tenedor y necesita dos para comer: lo coge, espera y muere a time_to_die. El programa no puede quedarse colgado esperando el segundo.',
    example: './philo 1 800 200 200 → «0 1 has taken a fork» y «800 1 died».',
  },
  'philo-bonus': {
    title: 'El bonus de philosophers',
    definition:
      'Cada filósofo es un proceso (no un hilo) y los tenedores están todos en el centro de la mesa: un semáforo cuenta cuántos quedan libres. El proceso principal no es un filósofo.',
    example: 'sem_open con valor N; cada filósofo hace sem_wait dos veces para comer.',
  },
  'sl-ber': {
    title: 'El mapa .ber de so_long',
    definition:
      'El mapa es un fichero .ber hecho con cinco caracteres: 0 (suelo), 1 (muro), C (coleccionable), E (salida) y P (posición inicial del jugador).',
    example: '11111\n1P0C1\n100E1\n11111',
  },
  'sl-rules': {
    title: 'Cuándo es válido un mapa de so_long',
    definition:
      'Rectangular, cerrado por muros, con una salida, un jugador y al menos un coleccionable, y con un camino válido. Por la salida solo se termina tras recoger todos los coleccionables.',
    example: 'Un mapa con dos E o con una fila más corta da «Error» y un mensaje.',
  },
  'sl-moves': {
    title: 'Movimientos, teclas y eventos en so_long',
    definition:
      'A cada movimiento se escribe en la terminal el número de movimientos hechos. ESC y la cruz de la ventana cierran limpiamente; mlx_hook asocia tus funciones a esos eventos.',
    example: 'mlx_hook(win, 17, 0, close_game, &game) para la cruz.',
  },
  'fdf-map': {
    title: 'El mapa de FdF',
    definition:
      'Cada número del .fdf es un punto: su columna da la x, su fila la y y su valor la altura. Puede llevar un color detrás de una coma.',
    example: '0 0 10,0xFF0000 → tres puntos; el tercero a altura 10 y en rojo.',
  },
  'fdf-rotate': {
    title: 'Rotar puntos',
    definition:
      'Girar (x, y) un ángulo θ alrededor de z da x′ = x·cos θ − y·sin θ e y′ = x·sin θ + y·cos θ; z no cambia. Para los otros ejes es igual con las otras dos coordenadas.',
    example: '(1, 0) girado 90° → (0, 1).',
  },
  'fdf-projection': {
    title: 'Proyecciones en FdF',
    definition:
      'La parte obligatoria pide la isométrica, sin perspectiva: misma escala en los tres ejes. En el bonus se puede añadir otra, como la paralela o la cónica, en la que lo lejano se ve más pequeño.',
    example: 'Isométrica: x′ = (x − y) · cos 30°, y′ = (x + y) · sin 30° − z.',
  },
  'fol-zoom': {
    title: 'Zoom hacia el ratón',
    definition:
      'Hacer zoom es escalar el trozo de plano que se ve: ×2 hacia dentro deja la mitad de ancho. Para que siga al ratón, se escala alrededor del punto que hay bajo el cursor, que no se mueve.',
    example: 'min = mouse + (min − mouse) / 2, y lo mismo con max.',
  },
  'fol-map': {
    title: 'De píxel a número complejo',
    definition:
      'Cada píxel se lleva al plano con una regla de tres: re = min + x · (max − min) / ancho. Para la parte imaginaria se invierte la fila, porque en pantalla la y crece hacia abajo.',
    example: '800 px para -2..2: el píxel 200 es -1 y el 400 es 0.',
  },
  'fol-iter': {
    title: 'Iteraciones y color',
    definition:
      'Se itera hasta que el punto escapa o se llega al máximo. Más máximo da más detalle en el borde y tarda más; el número de iteraciones que tarda en escapar decide el color.',
    example: 'Escapa en la iteración 12 de 100 → color 12 de la paleta.',
  },
  'cub-file': {
    title: 'El fichero .cub',
    definition:
      'Trae las texturas de cada cara (NO, SO, WE, EA), el color del suelo (F) y del techo (C) en RGB y, al final, el mapa, donde N, S, E o W colocan al jugador mirando hacia ese lado.',
    example: 'NO ./north.xpm\nF 220,100,0\nC 225,30,0\n111\n1N1\n111',
  },
  'cub-textures': {
    title: 'Texturas en un raycaster',
    definition:
      'El lado del muro que toca el rayo (y hacia dónde va) elige la textura. La parte decimal del punto de choque a lo largo del muro, por el ancho de la textura, da la columna que se pinta.',
    example: 'Choque en x = 3.25 con textura de 64 px → columna 16.',
  },
  'cub-collision': {
    title: 'Colisiones en cub3d',
    definition:
      'Antes de mover al jugador se mira si la casilla de destino es un muro, y se deja un pequeño margen para que la cámara no se pegue a la pared.',
    example: 'Si map[(int)(y + dy)][(int)(x + dx)] == 1, no te mueves.',
  },
  'rt-file': {
    title: 'El fichero .rt',
    definition:
      'Cada línea es un elemento: A (luz ambiente), C (cámara) y L (luz) van una sola vez; sp, pl y cy son esferas, planos y cilindros. La esfera lleva centro, diámetro y color.',
    example: 'A 0.2 255,255,255\nC -50,0,20 0,0,1 70\nsp 0,0,20.6 12.6 10,0,255',
  },
  'rt-light': {
    title: 'Luz ambiente y difusa',
    definition:
      'La parte obligatoria pide ambiente (igual en todo) y difusa (Lambert): el brillo es proporcional al coseno entre la normal y la dirección a la luz, y vale 0 a 90° o más.',
    example: 'n · l = 0.5 → la mitad de la luz del foco, más la ambiente.',
  },
  'rt-camera': {
    title: 'La cámara de miniRT',
    definition:
      'La cámara lleva posición, un vector de orientación normalizado (cada eje entre -1 y 1) y el campo de visión horizontal en grados. A distancia 1, la mitad del plano de la cámara mide tan(FOV / 2).',
    example: 'C 0,0,0 0,0,1 90 → mira hacia +z y el plano va de -1 a 1.',
  },
}
