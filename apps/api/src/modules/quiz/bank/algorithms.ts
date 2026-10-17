/**
 * Banco de Not-games: algoritmos y concurrencia. Ordenar con pocas
 * operaciones (push_swap), recorrer grafos y laberintos (a-maze-ing, fly-in) e
 * hilos que comparten cosas (philosophers, codexion).
 */

import type { Concept } from './types.js'

const PUSH_SWAP = ['42cursus-push_swap', '42next-push_swap']
const GRAPHS = ['a-maze-ing', 'fly-in']
const THREADS = ['42cursus-philosophers', 'codexion']

export const ALGORITHMS: readonly Concept[] = [
  {
    id: 'algo-sort-complexity',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuántas comparaciones hace, como mínimo, cualquier ordenación por comparación en el peor caso?',
          'Ordenar comparando no puede bajar de…',
        ],
        right: ['Del orden de n·log n', 'O(n log n)'],
      },
      {
        ask: [
          '¿Qué coste tiene la ordenación por burbuja en el peor caso?',
          'Bubble sort, en el peor caso, es…',
        ],
        right: ['O(n²)', 'Cuadrático'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)'],
      },
    ],
    wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Comparando, hay n! órdenes posibles y cada comparación parte en dos: hacen falta unas log₂(n!) ≈ n·log n.',
  },
  {
    id: 'algo-stack',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['En una pila, ¿qué elemento sale primero?', 'Una pila (stack) es…'],
        right: ['El último que entró', 'LIFO: último en entrar, primero en salir'],
      },
      {
        ask: ['En una cola, ¿qué elemento sale primero?', 'Una cola (queue) es…'],
        right: ['El primero que entró', 'FIFO: primero en entrar, primero en salir'],
        wrong: ['El último que entró', 'LIFO: último en entrar, primero en salir'],
      },
    ],
    wrong: ['El más pequeño', 'Uno al azar', 'El del medio', 'El más grande'],
    why: 'La pila saca por donde mete (LIFO); la cola mete por un lado y saca por el otro (FIFO).',
  },
  {
    id: 'algo-rotate',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'La pila a es 1 2 3 4 5 (el 1 arriba). ¿Cómo queda tras `ra`?',
          'Con a = 1 2 3 4 5 (cima a la izquierda), rotar una vez hacia arriba da…',
        ],
        right: ['2 3 4 5 1'],
      },
      {
        ask: [
          'La pila a es 1 2 3 4 5 (el 1 arriba). ¿Cómo queda tras `rra`?',
          'Con a = 1 2 3 4 5 (cima a la izquierda), rotar una vez hacia abajo da…',
        ],
        right: ['5 1 2 3 4'],
        wrong: ['2 3 4 5 1'],
      },
    ],
    wrong: ['5 4 3 2 1', '2 1 3 4 5', '1 2 3 4 5', '1 5 2 3 4'],
    why: 'ra sube todos y el de arriba pasa al fondo; rra hace lo contrario: el del fondo pasa arriba.',
  },
  {
    id: 'algo-three',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántas operaciones necesita, como mucho, ordenar 3 números en push_swap?',
          'Ordenar una pila de 3 elementos cuesta, en el peor caso…',
        ],
        right: ['2', 'Dos'],
      },
    ],
    wrong: ['1', '3', '4', '6'],
    why: 'Hay 6 órdenes posibles y todos se arreglan con sa, ra, rra o una pareja de ellas: nunca más de 2.',
  },
  {
    id: 'algo-radix',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace la ordenación radix?', 'Radix sort ordena…'],
        right: [
          'Por dígitos (o bits), de uno en uno, sin comparar elementos entre sí',
          'Agrupando por cada bit o cifra, empezando por el menos significativo',
        ],
      },
    ],
    wrong: [
      'Comparando cada par de elementos',
      'Eligiendo un pivote y partiendo en dos',
      'Insertando cada elemento en su sitio',
      'Al azar hasta que sale ordenado',
    ],
    why: 'Radix reparte por cada cifra o bit; con índices normalizados y bits, encaja bien con dos pilas.',
  },
  {
    id: 'algo-quicksort',
    topic: 'algoritmos',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Cuándo hace quicksort su peor caso, O(n²)?', 'Quicksort se vuelve cuadrático si…'],
        right: [
          'El pivote es siempre el mínimo o el máximo',
          'Las particiones salen muy descompensadas',
        ],
      },
      {
        ask: [
          '¿Qué ordenación divide la lista en mitades, ordena cada una y las mezcla?',
          'Partir en dos, ordenar y fusionar es…',
        ],
        right: ['Merge sort', 'Ordenación por mezcla'],
        wrong: ['Quicksort', 'Bubble sort', 'Insertion sort'],
      },
    ],
    wrong: [
      'Si la lista tiene números repetidos, siempre',
      'Si la lista es muy corta',
      'Nunca: siempre es n·log n',
      'Si hay negativos',
    ],
    why: 'Quicksort depende del pivote; merge sort parte siempre por la mitad y da n·log n siempre.',
  },
  {
    id: 'algo-binary-search',
    topic: 'algoritmos',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué necesita una búsqueda binaria para funcionar?',
          'Para buscar partiendo por la mitad, los datos tienen que estar…',
        ],
        right: ['Que los datos estén ordenados', 'Ordenados'],
      },
      {
        ask: [
          '¿Cuántos pasos necesita, como mucho, una búsqueda binaria en 1000 elementos?',
          'Buscando por la mitad entre 1000 elementos, se llega en…',
        ],
        right: ['Unos 10', '10'],
        wrong: ['500', '1000', '100'],
      },
    ],
    wrong: [
      'Que no haya repetidos',
      'Que sean números pares',
      'Que estén en una lista enlazada',
      'Nada en especial',
    ],
    why: 'Partir por la mitad solo sirve si sabes hacia qué lado mirar: hace falta orden. 2¹⁰ = 1024.',
  },
  {
    id: 'algo-bfs-dfs',
    topic: 'grafos',
    needs: { projects: GRAPHS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué recorrido encuentra el camino más corto (en pasos) en un laberinto?',
          'Para la salida en el menor número de pasos, se recorre…',
        ],
        right: ['En anchura (BFS)', 'BFS, con una cola'],
      },
      {
        ask: [
          '¿Qué estructura usa un recorrido en profundidad (DFS) sin recursión?',
          'DFS, hecho a mano, guarda los pendientes en…',
        ],
        right: ['Una pila', 'Una pila (LIFO)'],
        wrong: ['Una cola', 'Un montículo', 'Una tabla hash'],
      },
    ],
    wrong: [
      'En profundidad (DFS)',
      'Al azar',
      'Siguiendo la pared derecha',
      'Probando todos los caminos',
    ],
    why: 'BFS avanza por capas (cola): el primero en llegar llega por el camino más corto. DFS va al fondo (pila).',
  },
  {
    id: 'algo-dijkstra',
    topic: 'grafos',
    needs: { projects: GRAPHS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Para qué sirve el algoritmo de Dijkstra?', 'Dijkstra encuentra…'],
        right: [
          'El camino más corto con pesos no negativos',
          'La distancia mínima desde un origen a los demás nodos, con pesos',
        ],
      },
      {
        ask: ['¿Qué no admite Dijkstra?', 'Dijkstra puede fallar si hay…'],
        right: ['Aristas de peso negativo', 'Pesos negativos'],
        wrong: ['Ciclos', 'Más de 100 nodos', 'Pesos decimales'],
      },
    ],
    wrong: [
      'El árbol de expansión mínima',
      'Un ciclo que pase por todos',
      'El orden topológico',
      'Si hay ciclos',
    ],
    why: 'Dijkstra da por cerrado el nodo más cercano; un peso negativo podría acortar luego algo ya cerrado.',
  },
  {
    id: 'algo-maze-perfect',
    topic: 'grafos',
    needs: { projects: ['a-maze-ing'] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué es un laberinto «perfecto»?',
          'En un laberinto perfecto, entre dos casillas hay…',
        ],
        right: ['Uno con un único camino entre cada par de casillas', 'Exactamente un camino'],
      },
      {
        ask: [
          'Visto como grafo, un laberinto perfecto es…',
          '¿Qué estructura forman las casillas y los pasos de un laberinto perfecto?',
        ],
        right: ['Un árbol', 'Un árbol de expansión de la cuadrícula'],
        wrong: ['Un grafo completo', 'Un ciclo', 'Una lista'],
      },
    ],
    wrong: [
      'Uno sin salida',
      'Uno simétrico',
      'Uno con varios caminos a la salida',
      'Uno sin callejones',
    ],
    why: 'Sin ciclos y todo conectado: eso es un árbol, y por eso hay un camino único entre dos puntos.',
  },
  {
    id: 'algo-maze-gen',
    topic: 'grafos',
    needs: { projects: ['a-maze-ing'] },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Generas un laberinto con DFS: desde una casilla, vas a una vecina sin visitar al azar tirando la pared, y retrocedes al no tener. ¿Qué sale?',
          'El «recursive backtracker» (DFS con paredes) genera…',
        ],
        right: [
          'Un laberinto perfecto, con pasillos largos',
          'Un árbol que cubre todas las casillas',
        ],
      },
    ],
    wrong: [
      'Un laberinto con muchos ciclos',
      'Un laberinto sin solución',
      'Solo una línea recta',
      'Depende: a veces quedan casillas sueltas',
    ],
    why: 'Nunca entra en una casilla ya visitada (no hay ciclos) y no para hasta visitarlas todas (todo conectado).',
  },
  {
    id: 'thr-race',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué es una condición de carrera (data race)?',
          'Dos hilos tocan la misma variable a la vez y al menos uno escribe: eso es…',
        ],
        right: [
          'Dos hilos acceden a la vez a un dato y al menos uno escribe, sin sincronizar',
          'Una condición de carrera',
        ],
      },
    ],
    wrong: [
      'Un hilo que acaba antes que otro',
      'Un bloqueo mutuo',
      'Un hilo que usa mucha CPU',
      'Que el programa vaya más rápido con hilos',
    ],
    why: 'Sin mutex (u otra sincronización), el resultado depende de cómo se intercalen los hilos.',
  },
  {
    id: 'thr-counter',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'long',
    level: 3,
    code: 'int count = 0;\n\nvoid *add(void *arg)\n{\n    for (int i = 0; i < 100000; i++)\n        count++;\n    return NULL;\n}\n\n/* main lanza dos hilos con add y espera a los dos */',
    forms: [
      {
        ask: ['¿Qué vale `count` al final?', 'Tras los dos hilos, ¿cuánto suma count?'],
        right: [
          'Puede ser menos de 200000: count++ no es atómico',
          'No se sabe; normalmente menos de 200000',
        ],
      },
    ],
    wrong: ['Siempre 200000', 'Siempre 100000', 'El programa no compila', 'Siempre 0'],
    why: 'count++ es leer, sumar y escribir: dos hilos pueden leer el mismo valor y una suma se pierde.',
  },
  {
    id: 'thr-deadlock',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué es un interbloqueo (deadlock)?',
          'Cada hilo espera algo que tiene otro, y nadie lo suelta: eso es…',
        ],
        right: ['Hilos que se esperan entre sí para siempre', 'Un interbloqueo'],
      },
      {
        ask: [
          'Todos los filósofos cogen primero el tenedor de su izquierda. ¿Qué puede pasar?',
          'Si cada filósofo coge su tenedor izquierdo y espera el derecho…',
        ],
        right: [
          'Que se queden todos esperando para siempre',
          'Un interbloqueo: nadie suelta ni consigue el segundo',
        ],
        wrong: ['Que coman dos veces seguidas', 'Que coman todos a la vez', 'Nada: es lo correcto'],
      },
    ],
    wrong: [
      'Un hilo que va muy lento',
      'Dos hilos escribiendo a la vez',
      'Un hilo que termina antes de tiempo',
    ],
    why: 'Con espera circular nadie avanza. Romper el ciclo (p. ej. que los pares cojan primero el otro tenedor) lo evita.',
  },
  {
    id: 'thr-mutex',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Para qué sirve un mutex?', 'Un mutex garantiza que…'],
        right: [
          'Para que solo un hilo a la vez entre en una sección',
          'Solo un hilo a la vez tenga el candado',
        ],
      },
      {
        ask: [
          '¿Qué pasa si un hilo hace `pthread_mutex_lock` dos veces seguidas del mismo mutex normal?',
          'Bloquear dos veces el mismo mutex (no recursivo) desde el mismo hilo…',
        ],
        right: ['Se queda bloqueado para siempre', 'Se bloquea a sí mismo'],
        wrong: ['Nada: el segundo se ignora', 'Lo desbloquea', 'Devuelve un error y sigue siempre'],
      },
    ],
    wrong: [
      'Para lanzar hilos',
      'Para que los hilos vayan más rápido',
      'Para medir el tiempo',
      'Para compartir memoria entre procesos',
    ],
    why: 'lock espera a que el candado esté libre; si ya lo tienes tú, esperas a ti mismo.',
  },
  {
    id: 'thr-join-detach',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `pthread_join`?', 'pthread_join(th, NULL) sirve para…'],
        right: ['Esperar a que ese hilo termine', 'Esperar al hilo y recoger lo que devuelve'],
      },
      {
        ask: ['¿Qué hace `pthread_detach`?', 'Un hilo «detached»…'],
        right: [
          'Libera sus recursos solo al terminar; nadie lo espera',
          'No se puede esperar con join',
        ],
        wrong: ['Esperar a que ese hilo termine', 'Lo mata', 'Lo pausa'],
      },
    ],
    wrong: [
      'Lanzar un hilo nuevo',
      'Juntar dos hilos en uno',
      'Bloquear un mutex',
      'Dormir el hilo',
    ],
    why: 'Todo hilo se recoge con join o se suelta con detach; si no, se quedan sus recursos.',
  },
  {
    id: 'thr-usleep',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'Un filósofo muere si pasan 410 ms sin comer, y tu hilo de vigilancia hace `usleep(500000)` entre comprobaciones. ¿Qué falla?',
          '¿Por qué un vigilante que duerme medio segundo entre comprobaciones no sirve?',
        ],
        right: [
          'La muerte se anuncia tarde: hay que comprobar cada pocos milisegundos',
          'Avisa con hasta medio segundo de retraso, y se pide anunciarla en 10 ms',
        ],
      },
    ],
    wrong: [
      'Nada: usleep es exacto',
      'El filósofo muere antes de tiempo',
      'usleep no existe en hilos',
      'Bloquea a todos los filósofos',
    ],
    why: 'La muerte tiene que anunciarse casi al momento; además usleep puede dormir más de lo pedido.',
  },
  {
    id: 'thr-print',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué se protege con un mutex el printf de los mensajes?',
          'Sin mutex para escribir, los mensajes de varios hilos pueden…',
        ],
        right: [
          'Para que no se mezclen ni salgan después de anunciar una muerte',
          'Mezclarse o salir tras el mensaje de muerte',
        ],
      },
    ],
    wrong: [
      'Porque printf no funciona en hilos',
      'Para que vaya más rápido',
      'Porque lo pide el compilador',
      'Para no gastar memoria',
    ],
    why: 'Un mensaje tras «died» es un fallo; el mismo mutex también impide líneas mezcladas.',
  },
]
