/**
 * Banco de Not-games: lo general, que le sirve a cualquiera que programe
 * (shell, git, binario, complejidad, estructuras de datos). Sale a todo el
 * mundo.
 */

import type { Concept } from './types.js'

export const GENERAL: readonly Concept[] = [
  {
    id: 'gen-binary-8',
    topic: 'binario',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cuánto vale 1000 en binario, pasado a decimal?',
          'El número binario 1000 es, en decimal…',
          'Convierte 0b1000 a base 10.',
        ],
        right: ['8', 'Ocho'],
      },
      {
        ask: ['¿Cómo se escribe 8 en binario?', 'El 8 decimal, en base 2, es…'],
        right: ['1000', '0b1000'],
        wrong: ['111', '0b111'],
      },
    ],
    wrong: ['16', '4', '10', '2', '7', '1001', '100'],
    why: 'Cada posición vale el doble que la anterior: 1000 es 1 × 2³ = 8.',
  },
  {
    id: 'gen-hex-ff',
    topic: 'binario',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué valor decimal tiene 0xFF?',
          'El hexadecimal FF, en decimal, es…',
          'Si un byte vale 0xFF, ¿cuánto vale sin signo en base 10?',
        ],
        right: ['255', 'Doscientos cincuenta y cinco'],
      },
      {
        ask: [
          '¿Cuál es el mayor valor que cabe en un byte sin signo?',
          'Un unsigned char llega como mucho a…',
        ],
        right: ['255', '0xFF'],
      },
    ],
    wrong: ['256', '15', '128', '510', '100', '127', '1515'],
    why: 'F es 15: 15 × 16 + 15 = 255, el mayor valor de un byte sin signo (8 bits a 1).',
  },
  {
    id: 'gen-byte-bits',
    topic: 'binario',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cuántos bits tiene un byte?',
          'Un byte está formado por…',
          'Número de bits en un octeto:',
        ],
        right: ['8', 'Ocho bits'],
      },
      {
        ask: ['¿Cuántos valores distintos caben en un byte?', 'Con 8 bits se pueden representar…'],
        right: ['256', '2⁸ valores'],
        wrong: ['255', '128', '512'],
      },
    ],
    wrong: ['4', '16', '10', '32', '64'],
    why: 'Un byte son 8 bits, y 8 bits dan 2⁸ = 256 combinaciones.',
  },
  {
    id: 'gen-shift-left',
    topic: 'binario',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué le hace `x << 1` a un entero positivo pequeño?',
          'Desplazar un entero un bit a la izquierda equivale a…',
        ],
        right: ['Multiplicarlo por 2', 'Duplicarlo'],
      },
      {
        ask: [
          '¿Qué le hace `x >> 1` a un entero positivo?',
          'Desplazar un bit a la derecha un positivo equivale a…',
        ],
        right: [
          'Dividirlo entre 2 (redondeando hacia abajo)',
          'Partirlo por la mitad, sin decimales',
        ],
        wrong: ['Multiplicarlo por 2', 'Duplicarlo'],
      },
    ],
    wrong: [
      'Sumarle 1',
      'Elevarlo al cuadrado',
      'Cambiarle el signo',
      'Restarle 1',
      'Invertir todos sus bits',
    ],
    why: 'Cada bit sube (o baja) una posición, y cada posición vale el doble que la anterior.',
  },
  {
    id: 'gen-and-mask',
    topic: 'binario',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: ['¿Cuánto vale `13 & 6`?', 'El AND bit a bit de 13 y 6 es…'],
        right: ['4', '0b0100'],
      },
      {
        ask: ['¿Cuánto vale `13 | 6`?', 'El OR bit a bit de 13 y 6 es…'],
        right: ['15', '0b1111'],
        wrong: ['4'],
      },
    ],
    wrong: ['19', '11', '2', '78', '7', '1'],
    why: '13 es 1101 y 6 es 0110: en AND solo queda el bit que está en los dos (0100 = 4); en OR, todos (1111 = 15).',
  },
  {
    id: 'gen-complexity-binary-search',
    topic: 'complejidad',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué complejidad tiene la búsqueda binaria en un array ordenado?',
          'Buscar partiendo un array ordenado por la mitad cada vez cuesta…',
        ],
        right: ['O(log n)', 'Logarítmica'],
      },
      {
        ask: [
          '¿Qué necesita un array para poder usar búsqueda binaria?',
          'La búsqueda binaria solo funciona si el array está…',
        ],
        right: ['Estar ordenado', 'Ordenado'],
        wrong: ['Tener tamaño potencia de 2', 'No tener repetidos', 'Estar en el heap'],
      },
    ],
    wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
    why: 'Cada paso descarta la mitad (por eso hace falta orden): con n elementos bastan unos log₂ n pasos.',
  },
  {
    id: 'gen-complexity-nested',
    topic: 'complejidad',
    needs: {},
    kind: 'long',
    level: 3,
    code: 'for (i = 0; i < n; i++)\n    for (j = i; j < n; j++)\n        total += j;',
    forms: [
      {
        ask: [
          '¿Qué complejidad tiene este fragmento?',
          'En notación O grande, este doble bucle cuesta…',
          '¿Cómo crece el trabajo de este código con n?',
        ],
        right: ['O(n²)', 'Cuadrática'],
      },
    ],
    wrong: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n³)', 'O(1)', 'O(2ⁿ)'],
    why: 'El cuerpo se ejecuta n + (n-1) + … + 1 = n(n+1)/2 veces: crece como n².',
  },
  {
    id: 'gen-sort-complexity',
    topic: 'complejidad',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuál es lo mínimo que puede costar ordenar comparando elementos, en el caso general?',
          'Un algoritmo de ordenación por comparaciones no puede bajar, en el peor caso, de…',
        ],
        right: ['O(n log n)', 'n log n comparaciones'],
      },
      {
        ask: [
          '¿Qué complejidad tiene el ordenamiento de burbuja en el peor caso?',
          'Bubble sort, en el peor caso, cuesta…',
        ],
        right: ['O(n²)', 'Cuadrática'],
        wrong: ['O(n log n)'],
      },
    ],
    wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Con comparaciones hay n! órdenes posibles y cada una da un bit: hacen falta unas n log n. La burbuja compara todos con todos.',
  },
  {
    id: 'gen-stack-lifo',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['Una pila (stack) sigue el orden…', '¿Qué política de acceso tiene una pila?'],
        right: ['LIFO: el último en entrar sale primero', 'LIFO'],
        wrong: ['FIFO: el primero en entrar sale primero', 'FIFO'],
      },
      {
        ask: [
          'En una pila, ¿qué elemento sale primero?',
          'Si metes 1, 2 y 3 en una pila, ¿cuál sacas primero?',
        ],
        right: ['El último que se metió', 'El 3'],
        wrong: ['El primero que se metió', 'El 1', 'El 2'],
      },
    ],
    wrong: ['El menor', 'El mayor', 'Uno al azar', 'Por orden alfabético'],
    why: 'Una pila es como una torre de platos: se quita el de arriba, el último puesto.',
  },
  {
    id: 'gen-queue-fifo',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['Una cola (queue) sigue el orden…', '¿Qué política de acceso tiene una cola?'],
        right: ['FIFO: el primero en entrar sale primero', 'FIFO'],
        wrong: ['LIFO: el último en entrar sale primero', 'LIFO'],
      },
      {
        ask: [
          'Si metes 1, 2 y 3 en una cola, ¿cuál sale primero?',
          'En una cola, ¿qué elemento se atiende antes?',
        ],
        right: ['El 1', 'El que llegó antes'],
        wrong: ['El 3', 'El que llegó el último', 'El 2'],
      },
    ],
    wrong: ['El más corto', 'Uno al azar', 'El mayor'],
    why: 'Como la cola del supermercado: se atiende por orden de llegada.',
  },
  {
    id: 'gen-list-vs-array',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué cuesta acceder al elemento i de una lista enlazada?',
          'Llegar a la posición i de una lista enlazada es…',
        ],
        right: ['O(i): hay que recorrerla desde el principio', 'Lineal'],
      },
      {
        ask: ['¿Qué cuesta acceder al elemento i de un array?', 'Leer `a[i]` en un array cuesta…'],
        right: ['O(1): se calcula su dirección', 'Constante'],
        wrong: ['Lineal'],
      },
    ],
    wrong: ['O(log i)', 'O(i²)', 'Depende del valor del elemento'],
    why: 'Un array está seguido en memoria (dirección = inicio + i × tamaño); una lista hay que seguirla nodo a nodo.',
  },
  {
    id: 'gen-recursion-base',
    topic: 'recursividad',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué le falta a una función recursiva que nunca termina?',
          'Para que una función recursiva acabe, necesita…',
        ],
        right: ['Un caso base', 'Una condición de parada que no se llame a sí misma'],
      },
      {
        ask: [
          '¿Qué suele pasar con una recursión sin fin en C?',
          'Una función que se llama a sí misma sin parar acaba en…',
        ],
        right: ['Se desborda la pila (stack overflow)', 'Un desbordamiento de pila'],
        wrong: ['Un caso base'],
      },
    ],
    wrong: [
      'Un bucle while',
      'Una variable global',
      'Una fuga de memoria del heap',
      'Un error de compilación',
    ],
    why: 'Cada llamada ocupa pila; sin un caso que deje de llamarse, se acaba la pila.',
  },
  {
    id: 'gen-recursion-trace',
    topic: 'recursividad',
    needs: {},
    kind: 'long',
    level: 3,
    code: 'int f(int n)\n{\n    if (n <= 1)\n        return 1;\n    return n * f(n - 1);\n}',
    forms: [
      { ask: ['¿Cuánto devuelve f(4)?', '¿Qué valor da f(4)?'], right: ['24'] },
      { ask: ['¿Cuánto devuelve f(5)?', '¿Qué valor da f(5)?'], right: ['120'], wrong: ['24'] },
      {
        ask: ['¿Qué calcula esta función?', '¿Qué hace f con un n positivo?'],
        right: ['El factorial de n', 'n!'],
        wrong: ['La suma de 1 a n', 'n al cuadrado', 'El n-ésimo número de Fibonacci'],
      },
    ],
    wrong: ['10', '4', '16', '1', '60'],
    why: 'f(n) = n × f(n-1) y f(1) = 1: es el factorial (4! = 24, 5! = 120).',
  },
  {
    id: 'gen-git-push',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué hace `git push`?', '`git push` sirve para…'],
        right: ['Enviar tus commits al repositorio remoto', 'Subir los commits locales al remoto'],
      },
      {
        ask: [
          'Tras `git commit`, ¿con qué orden llegan tus cambios al servidor?',
          'Para que tu commit llegue al repositorio remoto, usas…',
        ],
        right: ['git push'],
        wrong: ['git commit', 'git pull', 'git add', 'git fetch'],
      },
    ],
    wrong: [
      'Guardar los cambios en un commit local',
      'Descargar los cambios del remoto',
      'Añadir ficheros al índice',
      'Crear una rama nueva',
    ],
    why: '`commit` guarda en tu copia del repositorio; `push` lo manda al remoto.',
  },
  {
    id: 'gen-git-add',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Para qué sirve `git add fichero`?', '`git add` pone el fichero…'],
        right: [
          'Lo prepara para el siguiente commit',
          'En el índice (staging), listo para el commit',
        ],
      },
      {
        ask: [
          'Antes de hacer commit de un fichero cambiado, ¿qué orden lo prepara?',
          '¿Qué orden mete un cambio en el índice?',
        ],
        right: ['git add'],
        wrong: ['git push', 'git commit', 'git stash', 'git log'],
      },
    ],
    wrong: [
      'Lo sube al servidor',
      'Lo borra del repositorio',
      'Lo ignora para siempre',
      'Lo copia en otra rama',
    ],
    why: 'El índice es la lista de lo que entrará en el próximo commit.',
  },
  {
    id: 'gen-git-conflict',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cuándo hay un conflicto al hacer merge?', 'Un conflicto de git aparece cuando…'],
        right: [
          'Las dos ramas cambiaron las mismas líneas de forma distinta',
          'Dos cambios tocan la misma zona de un fichero y git no sabe cuál quedarse',
        ],
      },
      {
        ask: [
          '¿Qué marcas deja git en un fichero con conflicto?',
          'En un conflicto, git separa las dos versiones con…',
        ],
        right: ['<<<<<<<, ======= y >>>>>>>', 'Las marcas <<<<<<< ======= >>>>>>>'],
        wrong: ['/* conflict */', '### MERGE ###', 'Ninguna: elige una sola'],
      },
    ],
    wrong: [
      'Cuando un fichero es demasiado grande',
      'Cuando se borra la rama remota',
      'Cuando hay dos commits con el mismo mensaje',
      'Siempre que se hace merge',
    ],
    why: 'Git une solo lo que no se pisa; si dos ramas cambian lo mismo, deja las dos versiones marcadas para que elijas.',
  },
  {
    id: 'gen-shell-pipe',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['En la shell, ¿qué hace `ls | wc -l`?', '¿Qué resultado da `ls | wc -l`?'],
        right: [
          'Cuenta cuántas líneas saca ls',
          'Pasa la salida de ls a wc, que cuenta las líneas',
        ],
      },
      {
        ask: [
          'En `cmd1 | cmd2`, ¿qué pasa con la salida de cmd1?',
          'El símbolo `|` entre dos órdenes…',
        ],
        right: [
          'Es la entrada de cmd2',
          'Conecta la salida de la primera con la entrada de la segunda',
        ],
      },
    ],
    wrong: [
      'Ejecuta las dos a la vez sin conectarlas',
      'Guarda la salida en un fichero llamado wc',
      'Solo ejecuta la segunda si la primera falla',
      'Es un OR lógico',
      'Se descarta',
    ],
    why: 'Una tubería conecta la salida estándar de una orden con la entrada estándar de la siguiente.',
  },
  {
    id: 'gen-shell-redirect',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué diferencia hay entre `>` y `>>`?',
          '`echo hola > f` frente a `echo hola >> f`:',
        ],
        right: [
          '`>` sobrescribe y `>>` añade al final',
          '`>>` añade sin borrar lo que había; `>` lo vacía',
        ],
        wrong: ['`>` añade y `>>` sobrescribe', 'Son lo mismo'],
      },
      {
        ask: [
          '¿Qué redirección añade al final de un fichero sin borrarlo?',
          'Para escribir a continuación de lo que ya hay en un fichero se usa…',
        ],
        right: ['>>'],
        wrong: ['>', '<<', '<', '|'],
      },
    ],
    wrong: [
      '`>>` redirige la entrada',
      '`>>` redirige los errores',
      '`>` solo funciona con ficheros nuevos',
    ],
    why: '`>` vacía el fichero antes de escribir; `>>` escribe a continuación.',
  },
  {
    id: 'gen-shell-exit-status',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué guarda `$?` en bash?', 'La variable especial `$?` contiene…'],
        right: [
          'El código de salida de la última orden',
          'Cómo terminó la última orden (0 si fue bien)',
        ],
      },
      {
        ask: [
          '¿Qué código de salida da una orden que fue bien?',
          'Por convenio, una orden que termina sin error sale con…',
        ],
        right: ['0', 'Cero'],
        wrong: ['1', '-1', '255', '42'],
      },
    ],
    wrong: [
      'El PID de la shell',
      'El número de argumentos',
      'El último argumento',
      'El nombre del script',
    ],
    why: '`$?` es el estado de salida: 0 significa éxito y cualquier otro número, error.',
  },
  {
    id: 'gen-chmod',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué permisos da `chmod 755 fichero`?', '755, en permisos de Unix, significa…'],
        right: ['Todo para el dueño; leer y ejecutar para el grupo y los demás', 'rwxr-xr-x'],
      },
      {
        ask: ['¿Qué número de chmod da `rw-r--r--`?', 'Los permisos rw-r--r-- en octal son…'],
        right: ['644'],
        wrong: ['755', '666', '444'],
      },
    ],
    wrong: ['rwxrwxrwx', 'Solo leer para todos', '777', 'r--r--r--', 'rw-rw-rw-'],
    why: 'Cada cifra es dueño, grupo y otros: leer vale 4, escribir 2 y ejecutar 1 (7 = 4+2+1, 5 = 4+1).',
  },
  {
    id: 'gen-ascii-a',
    topic: 'binario',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué código ASCII tiene la letra `A`?', "En ASCII, 'A' vale…"],
        right: ['65', 'Sesenta y cinco'],
      },
      {
        ask: ['¿Qué código ASCII tiene la letra `a` minúscula?', "En ASCII, 'a' vale…"],
        right: ['97', 'Noventa y siete'],
        wrong: ['65'],
      },
      {
        ask: [
          '¿Cuánto separa en ASCII una minúscula de su mayúscula?',
          "La distancia entre 'a' y 'A' en la tabla ASCII es…",
        ],
        right: ['32'],
        wrong: ['26', '1'],
      },
    ],
    wrong: ['64', '48', '41', '90', '122'],
    why: 'Las mayúsculas empiezan en 65 (A) y las minúsculas en 97 (a): se diferencian en 32, un solo bit.',
  },
  {
    id: 'gen-hash-collision',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En una tabla hash, ¿qué es una colisión?',
          '¿Cuándo hay una colisión en una tabla hash?',
        ],
        right: [
          'Dos claves distintas con el mismo hash',
          'Dos claves que caen en la misma casilla',
        ],
      },
      {
        ask: [
          '¿Cómo se llama que dos claves distintas caigan en la misma casilla de una tabla hash?',
          'Dos claves con el mismo hash provocan…',
        ],
        right: ['Una colisión', 'Colisión'],
        wrong: ['Un rehash', 'Un desbordamiento', 'Un puntero colgante', 'Un duplicado'],
      },
      {
        ask: [
          '¿Qué cuesta, de media, buscar en una tabla hash bien dimensionada?',
          'Una búsqueda en una tabla hash, de media, es…',
        ],
        right: ['O(1)', 'Constante'],
        wrong: ['O(n)', 'O(log n)'],
      },
    ],
    wrong: [
      'Una clave que no existe',
      'Un desbordamiento de la pila',
      'Un fallo de segmentación',
      'Un bucle infinito',
    ],
    why: 'El hash dice directamente la casilla; las colisiones (inevitables) se resuelven encadenando o buscando otra.',
  },
]
