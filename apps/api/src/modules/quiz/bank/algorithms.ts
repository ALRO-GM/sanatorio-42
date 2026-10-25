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
          'En el peor caso, ¿cuántas comparaciones hace como mínimo cualquier ordenación por comparación?',
          '¿De qué coste no puede bajar, en el peor caso, ordenar comparando?',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'],
      },
      {
        ask: [
          '¿Qué coste tiene la ordenación por burbuja en el peor caso?',
          'Bubble sort, en el peor caso, cuesta…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Comparando, hay n! órdenes posibles y cada comparación parte en dos: hacen falta unas log₂(n!) ≈ n log n.',
  },
  {
    id: 'algo-stack',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'En una pila, ¿qué elemento sale primero?',
          '¿Cuál se saca antes de una pila (stack)?',
        ],
        right: ['El último que entró'],
        wrong: ['El primero que entró', 'El más pequeño', 'El del medio'],
      },
      {
        ask: [
          'En una cola, ¿qué elemento sale primero?',
          '¿Cuál se saca antes de una cola (queue)?',
        ],
        right: ['El primero que entró'],
        wrong: ['El último que entró', 'El más pequeño', 'El del medio'],
      },
      {
        ask: ['¿Qué orden sigue una pila?', '¿Qué política de acceso tiene una pila?'],
        right: ['LIFO: último en entrar, primero en salir'],
        wrong: [
          'FIFO: primero en entrar, primero en salir',
          'Por prioridad: sale el mayor',
          'Al azar: sale uno cualquiera',
        ],
      },
    ],
    wrong: ['El más pequeño', 'El del medio', 'El más grande'],
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
          'La pila a es 1 2 3 4 5 (el 1 arriba). ¿Cómo queda después de `ra`?',
          'Con a = 1 2 3 4 5 (la cima a la izquierda), ¿qué da rotar una vez hacia arriba?',
        ],
        right: ['2 3 4 5 1'],
        wrong: ['5 1 2 3 4', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
      {
        ask: [
          'La pila a es 1 2 3 4 5 (el 1 arriba). ¿Cómo queda después de `rra`?',
          'Con a = 1 2 3 4 5 (la cima a la izquierda), ¿qué da rotar una vez hacia abajo?',
        ],
        right: ['5 1 2 3 4'],
        wrong: ['2 3 4 5 1', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
    ],
    wrong: ['5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
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
          'En el peor caso, ¿cuántas operaciones cuesta ordenar una pila de 3 elementos?',
        ],
        right: ['2'],
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
        ask: ['¿Cómo ordena la ordenación radix?', '¿Qué hace radix sort para ordenar?'],
        right: [
          'Por dígitos (o bits), de uno en uno, sin comparar elementos entre sí',
          'Agrupa por cada bit o cifra, empezando por el menos significativo',
        ],
      },
    ],
    wrong: [
      'Compara cada par de elementos',
      'Elige un pivote y parte en dos',
      'Inserta cada elemento en su sitio',
      'Prueba al azar hasta que sale ordenado',
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
        ask: [
          '¿Cuándo cae quicksort en su peor caso, O(n²)?',
          '¿Qué hace que quicksort se vuelva cuadrático?',
        ],
        right: [
          'Que el pivote sea siempre el mínimo o el máximo',
          'Que las particiones salgan muy descompensadas',
        ],
        wrong: [
          'Que haya números repetidos',
          'Que la lista sea muy corta',
          'Que haya números negativos',
          'Nada: siempre es n log n',
        ],
      },
      {
        ask: [
          '¿Qué ordenación parte la lista en dos, ordena cada mitad y las junta?',
          '¿Cómo se llama ordenar partiendo en dos, ordenando cada mitad y fusionándolas?',
        ],
        right: ['Merge sort'],
        wrong: ['Quicksort', 'Bubble sort', 'Insertion sort', 'Radix sort'],
      },
    ],
    wrong: [
      'Que haya números repetidos',
      'Que la lista sea muy corta',
      'Que haya números negativos',
    ],
    why: 'Quicksort depende del pivote; merge sort parte siempre por la mitad y cuesta n log n siempre.',
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
          '¿Cómo tienen que estar los datos para buscar partiendo por la mitad?',
        ],
        right: ['Ordenados'],
        wrong: ['Sin repetidos', 'En una lista enlazada', 'En un número par', 'En la pila'],
      },
      {
        ask: [
          '¿Cuántos pasos necesita, como mucho, una búsqueda binaria en 1000 elementos?',
          'Buscando por la mitad entre 1000 elementos, ¿en cuántos pasos se llega como mucho?',
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['Sin repetidos', 'En una lista enlazada', 'En un número par'],
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
          'Para llegar a la salida en el menor número de pasos, ¿cómo se recorre?',
        ],
        right: ['En anchura (BFS)'],
        wrong: ['En profundidad (DFS)', 'Al azar', 'Siguiendo la pared derecha'],
      },
      {
        ask: [
          '¿Qué estructura usa un recorrido en profundidad (DFS) sin recursión?',
          'Un DFS hecho a mano, ¿dónde guarda los pendientes?',
        ],
        right: ['En una pila'],
        wrong: ['En una cola', 'En un montículo', 'En una tabla hash'],
      },
    ],
    wrong: ['En profundidad (DFS)', 'Al azar', 'Siguiendo la pared derecha'],
    why: 'BFS avanza por capas (con una cola): el primero en llegar llega por el camino más corto. DFS va al fondo (con una pila).',
  },
  {
    id: 'algo-dijkstra',
    topic: 'grafos',
    needs: { projects: GRAPHS },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Para qué sirve el algoritmo de Dijkstra?', '¿Qué encuentra Dijkstra?'],
        right: [
          'El camino más corto con pesos no negativos',
          'La distancia mínima desde un origen a los demás nodos, con pesos',
        ],
        wrong: [
          'El árbol de expansión mínima',
          'Un ciclo que pase por todos los nodos',
          'El orden topológico',
        ],
      },
      {
        ask: ['¿En qué caso no sirve Dijkstra?', '¿Con qué tipo de grafo puede fallar Dijkstra?'],
        right: ['Con aristas de peso negativo'],
        wrong: ['Con ciclos', 'Con más de 100 nodos', 'Con pesos decimales'],
      },
    ],
    wrong: [
      'El árbol de expansión mínima',
      'Un ciclo que pase por todos los nodos',
      'El orden topológico',
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
          '¿Qué tiene de especial un laberinto «perfecto»?',
          'En un laberinto perfecto, ¿cuántos caminos hay entre dos casillas?',
        ],
        right: ['Exactamente un camino entre cada par de casillas'],
        wrong: [
          'Que no tiene salida',
          'Que es simétrico',
          'Que hay varios caminos a la salida',
          'Que no tiene callejones',
        ],
      },
      {
        ask: [
          'Visto como grafo, ¿qué es un laberinto perfecto?',
          '¿Qué estructura forman las casillas y los pasos de un laberinto perfecto?',
        ],
        right: ['Un árbol'],
        wrong: ['Un grafo completo', 'Un ciclo', 'Una lista'],
      },
    ],
    wrong: ['Un grafo completo', 'Un ciclo', 'Una lista'],
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
          'Generas un laberinto con DFS: desde una casilla vas a una vecina sin visitar al azar, tiras la pared y, si no te queda ninguna, retrocedes. ¿Qué sale?',
          '¿Qué genera el «recursive backtracker» (DFS tirando paredes)?',
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
      'Un laberinto con casillas sueltas',
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
          '¿Cuándo hay una condición de carrera?',
        ],
        right: [
          'Cuando dos hilos acceden a la vez a un dato, al menos uno escribe y nada lo sincroniza',
        ],
        wrong: [
          'Cuando un hilo acaba antes que otro',
          'Cuando un hilo usa mucha CPU',
          'Cuando dos hilos se esperan entre sí para siempre',
          'Cuando el programa va más rápido con hilos',
        ],
      },
      {
        ask: [
          'Dos hilos tocan la misma variable a la vez, al menos uno escribe y no hay mutex. ¿Cómo se llama eso?',
        ],
        right: ['Condición de carrera'],
        wrong: ['Interbloqueo', 'Inanición', 'Cambio de contexto'],
      },
    ],
    wrong: [
      'Cuando un hilo acaba antes que otro',
      'Cuando un hilo usa mucha CPU',
      'Cuando el programa va más rápido con hilos',
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
        ask: ['¿Qué vale `count` al final?', 'Cuando acaban los dos hilos, ¿cuánto vale count?'],
        right: [
          'Puede ser menos de 200000: count++ no es atómico',
          'No se sabe; normalmente, menos de 200000',
        ],
      },
    ],
    wrong: ['Siempre 200000', 'Siempre 100000', 'No compila', 'Siempre 0'],
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
        ask: ['¿Qué es un interbloqueo (deadlock)?', '¿Cuándo hay un interbloqueo?'],
        right: ['Cuando varios hilos se esperan entre sí y ninguno puede avanzar'],
        wrong: [
          'Cuando un hilo va muy lento',
          'Cuando dos hilos escriben a la vez',
          'Cuando un hilo termina antes de tiempo',
        ],
      },
      {
        ask: ['Cada hilo espera algo que tiene otro, y nadie lo suelta. ¿Cómo se llama eso?'],
        right: ['Interbloqueo'],
        wrong: ['Condición de carrera', 'Inanición', 'Fuga de memoria'],
      },
      {
        ask: [
          'Todos los filósofos cogen primero el tenedor de su izquierda. ¿Qué puede pasar?',
          'Si cada filósofo coge su tenedor izquierdo y espera el derecho, ¿qué puede pasar?',
        ],
        right: [
          'Que se queden todos esperando para siempre',
          'Que nadie consiga el segundo tenedor ni suelte el primero',
        ],
        wrong: ['Que coman dos veces seguidas', 'Que coman todos a la vez', 'Nada: es lo correcto'],
      },
    ],
    wrong: [
      'Cuando un hilo va muy lento',
      'Cuando dos hilos escriben a la vez',
      'Cuando un hilo termina antes de tiempo',
    ],
    why: 'Con espera circular nadie avanza. Romper el ciclo (por ejemplo, que los pares cojan primero el otro tenedor) lo evita.',
  },
  {
    id: 'thr-mutex',
    topic: 'concurrencia',
    needs: { projects: THREADS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Para qué sirve un mutex?', '¿Qué garantiza un mutex?'],
        right: [
          'Que solo un hilo a la vez entre en una sección',
          'Que solo un hilo a la vez tenga el candado',
        ],
        wrong: [
          'Que los hilos vayan más rápido',
          'Que los hilos se lancen en orden',
          'Que se pueda compartir memoria entre procesos',
          'Que el tiempo se mida bien',
        ],
      },
      {
        ask: [
          '¿Qué pasa si un hilo hace `pthread_mutex_lock` dos veces seguidas del mismo mutex normal?',
          '¿Qué pasa si un hilo bloquea dos veces el mismo mutex (no recursivo)?',
        ],
        right: ['Se queda bloqueado para siempre, esperándose a sí mismo'],
        wrong: ['Nada: el segundo se ignora', 'Se desbloquea', 'Da un error y sigue'],
      },
    ],
    wrong: [
      'Que los hilos vayan más rápido',
      'Que los hilos se lancen en orden',
      'Que el tiempo se mida bien',
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
        ask: ['¿Qué hace `pthread_join`?', '¿Para qué sirve `pthread_join(th, NULL)`?'],
        right: ['Espera a que ese hilo termine', 'Espera al hilo y recoge lo que devuelve'],
        wrong: [
          'Lanza un hilo nuevo',
          'Junta dos hilos en uno',
          'Bloquea un mutex',
          'Duerme el hilo',
        ],
      },
      {
        ask: ['¿Qué hace `pthread_detach`?', '¿Qué cambia al hacer detach de un hilo?'],
        right: [
          'Que libera sus recursos solo al terminar, sin que nadie lo espere',
          'Que ya no se puede esperar con join',
        ],
        wrong: ['Que se espera a que termine', 'Que se mata el hilo', 'Que se pausa el hilo'],
      },
    ],
    wrong: ['Lanza un hilo nuevo', 'Junta dos hilos en uno', 'Bloquea un mutex'],
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
          'Un filósofo muere si pasan 410 ms sin comer, y tu hilo vigilante hace `usleep(500000)` entre comprobaciones. ¿Qué falla?',
          '¿Por qué no sirve un vigilante que duerme medio segundo entre comprobaciones?',
        ],
        right: [
          'Anuncia la muerte tarde: hay que comprobar cada pocos milisegundos',
          'Puede avisar hasta 500 ms tarde, y se pide anunciarla en 10 ms',
        ],
      },
    ],
    wrong: [
      'Nada: usleep es exacto',
      'El filósofo muere antes de tiempo',
      'usleep no funciona en hilos',
      'Bloquea a todos los filósofos',
    ],
    why: 'La muerte tiene que anunciarse casi al momento; además, usleep puede dormir más de lo pedido.',
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
          '¿Qué se evita protegiendo con un mutex el printf de los mensajes?',
          'Sin mutex para escribir, ¿qué puede pasar con los mensajes de varios hilos?',
        ],
        right: [
          'Que se mezclen o salgan después de anunciar una muerte',
          'Que se corten unos a otros o salgan tras el «died»',
        ],
      },
    ],
    wrong: [
      'Que printf deje de funcionar',
      'Que el programa vaya más lento',
      'Que el compilador dé un aviso',
      'Que se gaste más memoria',
    ],
    why: 'Un mensaje después de «died» es un fallo; el mismo mutex también impide líneas mezcladas.',
  },
]
