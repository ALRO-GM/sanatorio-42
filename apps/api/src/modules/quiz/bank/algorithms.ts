/**
 * Banco de Not-games: algoritmos y concurrencia. Ordenar con pocas
 * operaciones (push_swap), recorrer grafos y laberintos (a-maze-ing, fly-in) e
 * hilos que comparten cosas (philosophers, codexion).
 */

import type { Concept } from './types.js'

const PUSH_SWAP = ['42cursus-push_swap', '42next-push_swap']
// Lo que solo es seguro en el enunciado clásico (límites, errores, checker):
// del de 42next no sabemos si cambia, y mejor no preguntarlo.
const PUSH_SWAP_CURSUS = ['42cursus-push_swap']
const GRAPHS = ['a-maze-ing', 'fly-in']
const THREADS = ['42cursus-philosophers', 'codexion']
const PHILO = ['42cursus-philosophers']

export const ALGORITHMS: readonly Concept[] = [
  {
    id: 'ps-ops',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué hace `sa` en push_swap?', 'En push_swap, ¿qué hace la operación `sa`?'],
        right: ['Intercambia los dos primeros elementos de a'],
        wrong: [
          'Pasa el primero de a a la cima de b',
          'Sube todos los de a y el primero va al fondo',
          'Intercambia el primero de a con el de b',
          'Cambia el primero y el último de la pila a',
        ],
      },
      {
        ask: ['¿Qué hace `pb` en push_swap?', 'En push_swap, ¿qué hace la operación `pb`?'],
        right: ['Pasa el primero de a a la cima de b'],
        wrong: [
          'Pasa el primero de b a la cima de a',
          'Intercambia los dos primeros de b',
          'Baja todos los de b y el último sube',
        ],
      },
      {
        ask: ['¿Qué hace `rr` en push_swap?', 'En push_swap, ¿qué hace la operación `rr`?'],
        right: ['Hace ra y rb a la vez'],
        wrong: ['Hace rra y rrb a la vez', 'Hace ra dos veces seguidas', 'Rota a hacia abajo'],
      },
      {
        ask: ['¿Qué hace `rrr` en push_swap?', 'En push_swap, ¿qué hace la operación `rrr`?'],
        right: ['Hace rra y rrb a la vez'],
        wrong: ['Hace ra y rb a la vez', 'Hace rra tres veces seguidas', 'Hace rr y luego rra'],
      },
      {
        ask: ['¿Qué hace `pa` si la pila b está vacía?', 'Con b vacía, ¿qué pasa al hacer `pa`?'],
        right: ['No hace nada'],
        wrong: ['Escribe «Error» y sale', 'Mete un 0 en la cima de a', 'Hace pb en su lugar'],
      },
    ],
    wrong: ['Vacía la pila b entera', 'Ordena los tres primeros de a', 'Da la vuelta a la pila a'],
    why: 'sa cambia los dos de arriba de a, pb pasa la cima de a a b, ra rota hacia arriba y rra hacia abajo; ss, rr y rrr hacen lo mismo en las dos pilas.',
  },
  {
    id: 'ps-sequence',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'a = 3 1 2 (la cima a la izquierda) y b está vacía. ¿Cómo quedan tras `sa` y `pb`?',
          'Con a = 3 1 2 (el 3 arriba) y b vacía, haces `sa` y luego `pb`. ¿Cómo quedan las pilas?',
        ],
        right: ['a = 3 2, b = 1'],
        wrong: ['a = 1 2, b = 3', 'a = 1 3, b = 2', 'a = 2 3, b = 1', 'a = 3 1, b = 2'],
      },
      {
        ask: [
          'a = 1 2 3 y b = 4 5 (las cimas a la izquierda). ¿Cómo queda a tras `pa` y `rra`?',
          'Con a = 1 2 3 y b = 4 5 (el 1 y el 4 arriba), haces `pa` y luego `rra`. ¿Cómo queda a?',
        ],
        right: ['3 4 1 2'],
        wrong: ['4 1 2 3', '1 2 3 4', '4 3 1 2', '3 5 1 2'],
      },
    ],
    wrong: ['Igual que estaba', 'Vacías las dos'],
    why: 'Se aplican en orden: sa cambia los dos de arriba, pb y pa pasan la cima de una pila a la otra y rra sube el del fondo.',
  },
  {
    id: 'ps-limits',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP_CURSUS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Para la nota máxima de push_swap, ¿con menos de cuántas operaciones hay que ordenar 100 números al azar?',
          'Con 100 números al azar, ¿por debajo de cuántas operaciones pide push_swap quedarse para la nota máxima?',
        ],
        right: ['700'],
        wrong: ['1100', '500', '1500', '300'],
      },
      {
        ask: [
          'Para la nota máxima de push_swap, ¿cuántas operaciones como mucho se aceptan con 500 números al azar?',
          'Con 500 números al azar, ¿cuál es el máximo de operaciones de push_swap para la nota máxima?',
        ],
        right: ['5500'],
        wrong: ['7000', '3500', '11500', '8500'],
      },
    ],
    wrong: ['1000', '2000', '10000'],
    why: 'La corrección cuenta operaciones: la nota máxima pide menos de 700 con 100 números y no más de 5500 con 500.',
  },
  {
    id: 'ps-errors',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP_CURSUS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Le pasas a push_swap un número repetido. ¿Qué hace?',
          '¿Qué hace push_swap si un argumento no es un entero, como «12a»?',
          '¿Qué hace push_swap con un número que no cabe en un int?',
        ],
        right: ['Escribe «Error» y un salto de línea en stderr'],
        wrong: [
          'Lo salta y ordena el resto de números',
          'Escribe «Error» en la salida estándar',
          'Escribe «KO» y un salto de línea',
          'Sigue y deja ese número donde estaba',
        ],
      },
      {
        ask: [
          '¿Qué hace push_swap si lo lanzas sin argumentos?',
          'Ejecutas `./push_swap` sin nada más. ¿Qué tiene que pasar?',
        ],
        right: ['No escribe nada y termina'],
        wrong: [
          'Escribe «Error» en stderr',
          'Espera números por la entrada',
          'Escribe cómo se usa el programa',
        ],
      },
    ],
    wrong: ['Se queda colgado para siempre', 'Ordena una pila vacía y escribe OK'],
    why: 'El enunciado pide «Error» y un salto de línea en la salida de error para cualquier argumento malo, y nada si no hay argumentos.',
  },
  {
    id: 'ps-output',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP_CURSUS },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cómo escribe push_swap la lista de instrucciones?',
          '¿Dónde y en qué formato saca push_swap las operaciones?',
        ],
        right: ['Una por línea, en la salida estándar'],
        wrong: [
          'Todas en una línea, separadas por comas',
          'Una por línea, en la salida de error',
          'En un fichero que lee luego checker',
        ],
      },
      {
        ask: [
          '¿Qué escribe push_swap si los números ya vienen ordenados?',
          'Con `./push_swap 1 2 3`, ¿qué sale?',
        ],
        right: ['Nada: ninguna instrucción'],
        wrong: ['OK y un salto de línea', '«Error» en la salida de error', 'Un sa para comprobar'],
      },
    ],
    wrong: ['Las pilas al final de cada paso'],
    why: 'push_swap escribe la lista más corta que encuentre, una instrucción por línea en stdout; si ya está ordenado, la más corta es no hacer nada.',
  },
  {
    id: 'ps-checker',
    topic: 'algoritmos',
    needs: { projects: PUSH_SWAP_CURSUS },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué escribe `checker` si, tras las instrucciones, a está ordenada y b vacía?',
          'Las instrucciones dejan a ordenada y b vacía. ¿Qué responde checker?',
        ],
        right: ['OK'],
        wrong: ['KO', 'Error', 'Nada'],
      },
      {
        ask: [
          '¿Qué escribe `checker` si a queda ordenada pero b no está vacía?',
          'Las instrucciones dejan a ordenada, pero quedan números en b. ¿Qué responde checker?',
        ],
        right: ['KO'],
        wrong: ['OK', 'Error', 'Nada'],
      },
      {
        ask: [
          '¿De dónde lee `checker` las instrucciones?',
          'En el bonus de push_swap, ¿por dónde le llegan a checker las operaciones?',
        ],
        right: ['De la entrada estándar, una por línea'],
        wrong: [
          'De los argumentos, tras los números',
          'De un fichero llamado instructions.txt',
          'De la salida de error de push_swap',
        ],
      },
    ],
    wrong: ['Sorted', 'Done'],
    why: 'checker lee las instrucciones por stdin, las aplica y escribe OK solo si a queda ordenada y b vacía; si no, KO.',
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
          'Por bits o cifras, de uno en uno, sin comparar',
          'Agrupa por cada bit, del menos significativo al más',
        ],
      },
    ],
    wrong: [
      'Compara cada par de vecinos y los cambia',
      'Elige un pivote y parte la lista en dos mitades',
      'Inserta cada elemento en su sitio, uno a uno',
      'Parte en mitades, ordena cada una y las fusiona',
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
          'Que los números sean enteros muy grandes',
          'Que la lista tenga menos de diez elementos',
          'Que haya números negativos y positivos',
          'Nada: quicksort cuesta siempre n log n',
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
    wrong: ['Que los números sean enteros muy grandes', 'Que haya números negativos y positivos'],
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
          '¿Cuántos pasos necesita, como mucho, una búsqueda binaria en 1000 elementos?',
          'Buscando por la mitad entre 1000 elementos, ¿en cuántos pasos se llega como mucho?',
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['20', '50'],
    why: 'Cada paso descarta la mitad de lo que queda, y 2¹⁰ = 1024 ya pasa de 1000: bastan 10.',
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
          'La distancia mínima de un origen a cada nodo',
        ],
        wrong: [
          'El árbol de expansión mínima del grafo',
          'Un ciclo que pase una vez por cada nodo',
          'El orden topológico de un grafo dirigido',
        ],
      },
      {
        ask: ['¿En qué caso no sirve Dijkstra?', '¿Con qué tipo de grafo puede fallar Dijkstra?'],
        right: ['Con pesos negativos'],
        wrong: ['Con pesos decimales', 'Con ciclos dirigidos', 'Con más de mil nodos'],
      },
    ],
    wrong: ['El árbol de expansión mínima del grafo', 'El orden topológico de un grafo dirigido'],
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
          '¿Qué cumple un laberinto para llamarse perfecto?',
        ],
        right: ['Que entre dos casillas hay un solo camino'],
        wrong: [
          'Que no tiene ninguna salida al borde',
          'Que es simétrico respecto al centro',
          'Que hay varios caminos hasta la salida',
          'Que no tiene callejones sin salida',
        ],
      },
      {
        ask: [
          'En un laberinto perfecto, ¿cuántos caminos hay entre dos casillas?',
          '¿Cuántos caminos distintos unen la entrada y la salida de un laberinto perfecto?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          'Visto como grafo, ¿qué es un laberinto perfecto?',
          '¿Qué estructura forman las casillas y los pasos de un laberinto perfecto?',
        ],
        right: ['Un árbol'],
        wrong: ['Un grafo completo', 'Un ciclo', 'Un grafo con ciclos'],
      },
    ],
    wrong: ['Un grafo completo', 'Un ciclo'],
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
      'Un laberinto con muchos ciclos y atajos',
      'Un laberinto que no tiene solución',
      'Un pasillo recto de lado a lado',
      'Un laberinto con zonas aisladas',
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
        right: ['Cuando dos hilos tocan un dato a la vez, uno escribe y sin mutex'],
        wrong: [
          'Cuando un hilo termina antes de que otro empiece',
          'Cuando un hilo gasta casi toda la CPU del proceso',
          'Cuando dos hilos se esperan entre sí para siempre',
          'Cuando el programa va más rápido con hilos que sin ellos',
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
      'Cuando un hilo termina antes de que otro empiece',
      'Cuando un hilo gasta casi toda la CPU del proceso',
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
          'No se sabe, pero suele salir menos de 200000',
        ],
      },
    ],
    wrong: [
      'Siempre 200000: cada hilo suma 100000',
      'Siempre 100000: solo cuenta el último hilo',
      'Siempre 200000, porque main espera a los dos',
      'Siempre 0: cada hilo suma en su propia copia',
    ],
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
        right: ['Cuando varios hilos se esperan entre sí y nadie avanza'],
        wrong: [
          'Cuando un hilo va mucho más lento que los demás',
          'Cuando dos hilos escriben a la vez el mismo dato',
          'Cuando un hilo termina antes de que acabe main',
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
          'Que nadie coja el segundo ni suelte el primero',
        ],
        wrong: [
          'Que cada uno coma dos veces seguidas sin parar',
          'Que coman todos a la vez con un solo tenedor',
          'Nada: es la forma correcta de evitar bloqueos',
        ],
      },
    ],
    wrong: [
      'Cuando un hilo va mucho más lento que los demás',
      'Cuando dos hilos escriben a la vez el mismo dato',
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
          'Que los hilos vayan más rápido al compartir',
          'Que los hilos se lancen en el orden del código',
          'Que se pueda compartir memoria entre procesos',
          'Que el tiempo se mida bien en cada hilo',
        ],
      },
      {
        ask: [
          '¿Qué pasa si un hilo hace `pthread_mutex_lock` dos veces seguidas del mismo mutex normal?',
          'Un hilo bloquea dos veces seguidas el mismo mutex de tipo normal. ¿Qué pasa?',
        ],
        right: ['Se bloquea para siempre esperándose a sí mismo'],
        wrong: [
          'Nada: el segundo lock se ignora sin más',
          'Se desbloquea, porque lock alterna el estado',
          'El segundo lock pasa y el mutex cuenta dos',
        ],
      },
    ],
    wrong: [
      'Que los hilos vayan más rápido al compartir',
      'Que los hilos se lancen en el orden del código',
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
          'Lanza un hilo nuevo con esa función',
          'Junta dos hilos en uno solo',
          'Bloquea el mutex de ese hilo',
          'Duerme el hilo actual unos milisegundos',
        ],
      },
      {
        ask: ['¿Qué hace `pthread_detach`?', '¿Qué cambia al hacer detach de un hilo?'],
        right: [
          'Que se libera solo al terminar, sin que nadie lo espere',
          'Que ya no se puede esperar con join',
        ],
        wrong: [
          'Que el hilo actual espera a que termine',
          'Que el hilo se mata en ese mismo momento',
          'Que el hilo se pausa hasta que se le avise',
        ],
      },
    ],
    wrong: ['Lanza un hilo nuevo con esa función', 'Junta dos hilos en uno solo'],
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
          'Avisa de la muerte tarde: hay que mirar cada pocos ms',
          'Avisa hasta 500 ms tarde, y el límite es de 10 ms',
        ],
      },
    ],
    wrong: [
      'Nada: usleep duerme justo lo pedido y basta',
      'El filósofo muere antes de tiempo por el usleep',
      'usleep no se puede usar dentro de un hilo',
      'Deja bloqueados a todos los filósofos a la vez',
    ],
    why: 'La muerte tiene que anunciarse como mucho 10 ms después; además, usleep puede dormir más de lo pedido.',
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
          'Que se mezclen o salgan después de una muerte',
          'Que se corten o salgan detrás del «died»',
        ],
      },
    ],
    wrong: [
      'Que printf deje de funcionar en los demás hilos',
      'Que el programa vaya más lento al escribir',
      'Que el compilador avise de una carrera',
      'Que se gaste más memoria en el buffer',
    ],
    why: 'Un mensaje después de «died» es un fallo; el mismo mutex también impide líneas mezcladas.',
  },
  {
    id: 'philo-args',
    topic: 'concurrencia',
    needs: { projects: PHILO },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cuántos argumentos obligatorios recibe `philo`?',
          'Sin contar el opcional, ¿cuántos argumentos lleva `./philo`?',
        ],
        right: ['4'],
        wrong: ['5', '3', '6', '2'],
      },
      {
        ask: [
          '¿En qué unidad van time_to_die, time_to_eat y time_to_sleep?',
          'En `./philo 5 800 200 200`, ¿en qué unidad están el 800 y los 200?',
        ],
        right: ['En milisegundos'],
        wrong: ['En microsegundos', 'En segundos', 'En décimas de segundo'],
      },
      {
        ask: [
          '¿En qué orden van los argumentos de `philo`?',
          '¿Qué orden siguen los argumentos obligatorios de philosophers?',
        ],
        right: ['Filósofos, morir, comer, dormir'],
        wrong: [
          'Filósofos, comer, dormir, morir',
          'Filósofos, dormir, comer, morir',
          'Morir, comer, dormir, filósofos',
        ],
      },
    ],
    wrong: ['Comer, dormir, morir, filósofos'],
    why: 'Son number_of_philosophers, time_to_die, time_to_eat y time_to_sleep, en milisegundos, y un quinto opcional.',
  },
  {
    id: 'philo-must-eat',
    topic: 'concurrencia',
    needs: { projects: PHILO },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué hace el quinto argumento, number_of_times_each_philosopher_must_eat?',
          'Si das number_of_times_each_philosopher_must_eat, ¿cuándo para la simulación?',
        ],
        right: ['Para cuando todos han comido al menos esas veces'],
        wrong: [
          'Cada filósofo muere al comer ese número de veces',
          'Para cuando el primero ha comido esas veces',
          'Es el número de tenedores que hay en la mesa',
        ],
      },
      {
        ask: [
          'Si no se da number_of_times_each_philosopher_must_eat, ¿cuándo acaba la simulación?',
          'Sin el argumento opcional, ¿qué hace parar a philo?',
        ],
        right: ['Que muere un filósofo'],
        wrong: [
          'Que cada uno ha comido una vez',
          'Que pasa un minuto de reloj',
          'Que todos han dormido una vez',
        ],
      },
    ],
    wrong: ['Nunca para: hay que matarlo con Ctrl+C'],
    why: 'La simulación para con la primera muerte o, si se da el quinto argumento, cuando todos han comido al menos esas veces.',
  },
  {
    id: 'philo-one',
    topic: 'concurrencia',
    needs: { projects: PHILO },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'Con un solo filósofo (`./philo 1 800 200 200`), ¿qué tiene que pasar?',
          'Lanzas philo con 1 filósofo y time_to_die = 800. ¿Qué es lo correcto?',
        ],
        right: ['Coge un tenedor, no puede comer y muere a los 800 ms'],
        wrong: [
          'Come con un solo tenedor y vive para siempre',
          'El programa da error: hacen falta al menos 2',
          'Se queda pensando y no muere: nadie le quita nada',
        ],
      },
      {
        ask: [
          'En la parte obligatoria, ¿cuántos tenedores hay en una mesa de N filósofos?',
          '¿Cuántos tenedores hay en la mesa con N filósofos?',
        ],
        right: ['Tantos como filósofos'],
        wrong: ['Uno menos que filósofos', 'El doble que filósofos', 'La mitad que filósofos'],
      },
    ],
    wrong: ['Se queda colgado sin escribir nada'],
    why: 'Hay un tenedor por filósofo; solo, tiene uno y necesita dos, así que no come y muere a time_to_die.',
  },
  {
    id: 'philo-bonus',
    topic: 'concurrencia',
    needs: { projects: PHILO },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En el bonus de philosophers, ¿qué es cada filósofo?',
          'En philo_bonus, ¿cómo se lanza cada filósofo?',
        ],
        right: ['Un proceso'],
        wrong: ['Un hilo', 'Un semáforo', 'Una señal'],
      },
      {
        ask: [
          'En el bonus de philosophers, ¿qué lleva la cuenta de los tenedores libres?',
          'En philo_bonus, ¿qué representa el número de tenedores que quedan?',
        ],
        right: ['Un semáforo contador'],
        wrong: ['Un mutex por cada tenedor', 'Una tubería entre vecinos', 'Un fichero en /tmp'],
      },
      {
        ask: [
          'En el bonus de philosophers, ¿dónde están los tenedores?',
          'En philo_bonus, ¿cómo se colocan los tenedores en la mesa?',
        ],
        right: ['Todos en el centro de la mesa'],
        wrong: [
          'Uno entre cada dos filósofos',
          'Dos delante de cada filósofo',
          'En manos del proceso padre',
        ],
      },
    ],
    wrong: ['Una variable global compartida'],
    why: 'En el bonus cada filósofo es un proceso y los tenedores están en el centro: su número lo lleva un semáforo.',
  },
]
