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
          '¿Cuánto vale el binario 1000 en decimal?',
          'El número binario 1000, pasado a decimal, es…',
          'Convierte 0b1000 a base 10.',
        ],
        right: ['8'],
        wrong: ['16', '4', '10', '2', '7'],
      },
      {
        ask: ['¿Cómo se escribe 8 en binario?', 'El 8 decimal, en base 2, es…'],
        right: ['1000', '0b1000'],
        wrong: ['111', '0b111', '1001', '100', '0b10000'],
      },
    ],
    wrong: ['16', '4', '10', '2', '7'],
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
        right: ['255'],
      },
      {
        ask: [
          '¿Cuál es el mayor valor que cabe en un byte sin signo?',
          'Un unsigned char llega, como mucho, a…',
        ],
        right: ['255'],
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
        ask: ['¿Cuántos bits tiene un byte?', '¿Cuántos bits forman un octeto?'],
        right: ['8'],
        wrong: ['4', '16', '10', '32', '64'],
      },
      {
        ask: [
          '¿Cuántos valores distintos caben en un byte?',
          '¿Cuántas combinaciones distintas dan 8 bits?',
        ],
        right: ['256'],
        wrong: ['255', '128', '512', '64'],
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
        wrong: ['Dividirlo entre 2', 'Sumarle 1', 'Elevarlo al cuadrado', 'Cambiarle el signo'],
      },
      {
        ask: [
          '¿Qué le hace `x >> 1` a un entero positivo?',
          'Desplazar un bit a la derecha un entero positivo equivale a…',
        ],
        right: [
          'Dividirlo entre 2 (redondeando hacia abajo)',
          'Partirlo por la mitad, sin decimales',
        ],
        wrong: [
          'Multiplicarlo por 2',
          'Restarle 1',
          'Invertir todos sus bits',
          'Cambiarle el signo',
        ],
      },
    ],
    wrong: ['Sumarle 1', 'Elevarlo al cuadrado', 'Cambiarle el signo', 'Restarle 1'],
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
        right: ['4'],
        wrong: ['19', '15', '2', '7', '1'],
      },
      {
        ask: ['¿Cuánto vale `13 | 6`?', 'El OR bit a bit de 13 y 6 es…'],
        right: ['15'],
        wrong: ['4', '19', '11', '7', '78'],
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
        right: ['O(log n)'],
        wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
      },
      {
        ask: [
          '¿Qué condición tiene que cumplir un array para usar búsqueda binaria?',
          'Antes de buscar partiendo por la mitad, el array tiene que…',
        ],
        right: ['Estar ordenado'],
        wrong: ['Tener un tamaño potencia de 2', 'No tener repetidos', 'Estar en el heap'],
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
        right: ['O(n²)'],
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
          '¿Cuánto cuesta, como mínimo, ordenar comparando elementos en el caso general?',
          'En el peor caso, un algoritmo que ordena comparando no puede bajar de…',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
      },
      {
        ask: [
          '¿Qué complejidad tiene el ordenamiento de burbuja en el peor caso?',
          'Bubble sort, en el peor caso, cuesta…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Con comparaciones hay n! órdenes posibles y cada comparación da un bit: hacen falta unas n log n. La burbuja compara todos con todos.',
  },
  {
    id: 'gen-stack-lifo',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿En qué orden salen los elementos de una pila (stack)?',
          '¿Qué política de acceso tiene una pila?',
        ],
        right: ['LIFO: el último en entrar sale primero'],
        wrong: [
          'FIFO: el primero en entrar sale primero',
          'Por prioridad: sale el mayor',
          'Al azar: sale uno cualquiera',
        ],
      },
      {
        ask: ['En una pila, ¿qué elemento sale primero?', '¿Cuál se saca antes de una pila?'],
        right: ['El último que se metió'],
        wrong: ['El primero que se metió', 'El más pequeño', 'El que está en medio'],
      },
      {
        ask: ['Metes 1, 2 y 3 en una pila, en ese orden. ¿Cuál sacas primero?'],
        right: ['El 3'],
        wrong: ['El 1', 'El 2', 'Cualquiera de los tres'],
      },
    ],
    wrong: ['El más pequeño', 'El más grande', 'Uno al azar'],
    why: 'Una pila es como una torre de platos: se quita el de arriba, el último que se puso.',
  },
  {
    id: 'gen-queue-fifo',
    topic: 'estructuras',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿En qué orden salen los elementos de una cola (queue)?',
          '¿Qué política de acceso tiene una cola?',
        ],
        right: ['FIFO: el primero en entrar sale primero'],
        wrong: [
          'LIFO: el último en entrar sale primero',
          'Por prioridad: sale el mayor',
          'Al azar: sale uno cualquiera',
        ],
      },
      {
        ask: ['En una cola, ¿qué elemento se atiende primero?', '¿Cuál se saca antes de una cola?'],
        right: ['El que lleva más tiempo esperando'],
        wrong: ['El último que se metió', 'El más pequeño', 'El que está en medio'],
      },
      {
        ask: ['Metes 1, 2 y 3 en una cola, en ese orden. ¿Cuál sale primero?'],
        right: ['El 1'],
        wrong: ['El 3', 'El 2', 'Cualquiera de los tres'],
      },
    ],
    wrong: ['El más pequeño', 'El más grande', 'Uno al azar'],
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
          'Llegar a la posición i de una lista enlazada cuesta…',
        ],
        right: ['O(i)'],
        wrong: ['O(1)', 'O(log i)', 'O(i²)'],
      },
      {
        ask: ['¿Qué cuesta acceder al elemento i de un array?', 'Leer `a[i]` en un array cuesta…'],
        right: ['O(1)'],
        wrong: ['O(i)', 'O(log i)', 'O(i²)'],
      },
    ],
    wrong: ['O(log i)', 'O(i²)', 'O(n)'],
    why: 'Un array está seguido en memoria (dirección = inicio + i × tamaño); una lista hay que recorrerla nodo a nodo desde el principio.',
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
        right: ['Un caso base', 'Una condición de parada que no vuelva a llamarla'],
        wrong: ['Un bucle while', 'Una variable global', 'Un valor de retorno', 'Más memoria'],
      },
      {
        ask: [
          '¿Qué suele pasar en C con una recursión que no termina?',
          'Una función que se llama a sí misma sin parar acaba…',
        ],
        right: ['Desbordando la pila (stack overflow)'],
        wrong: [
          'Con un error de compilación',
          'Con una fuga de memoria del heap',
          'Devolviendo 0',
          'En un bucle que no gasta memoria',
        ],
      },
    ],
    wrong: ['Un bucle while', 'Una variable global', 'Un valor de retorno'],
    why: 'Cada llamada ocupa sitio en la pila; sin un caso que deje de llamarse, la pila se acaba.',
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
        right: ['El factorial de n'],
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
        ask: ['¿Qué hace `git push`?', '¿Para qué sirve `git push`?'],
        right: ['Envía tus commits al repositorio remoto', 'Sube los commits locales al remoto'],
        wrong: [
          'Guarda los cambios en un commit local',
          'Descarga los cambios del remoto',
          'Añade ficheros al índice',
          'Crea una rama nueva',
        ],
      },
      {
        ask: [
          'Después de `git commit`, ¿qué orden lleva tus cambios al servidor?',
          'Para que tu commit llegue al repositorio remoto, usas…',
        ],
        right: ['git push'],
        wrong: ['git commit', 'git pull', 'git add', 'git fetch'],
      },
    ],
    wrong: [
      'Guarda los cambios en un commit local',
      'Descarga los cambios del remoto',
      'Crea una rama nueva',
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
        ask: ['¿Qué hace `git add fichero`?', '¿Para qué sirve `git add` con un fichero cambiado?'],
        right: [
          'Lo prepara para el siguiente commit',
          'Lo pone en el índice (staging) para el próximo commit',
        ],
        wrong: [
          'Lo sube al servidor',
          'Lo borra del repositorio',
          'Hace que git lo ignore para siempre',
          'Lo copia en otra rama',
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
    wrong: ['Lo sube al servidor', 'Lo borra del repositorio', 'Lo copia en otra rama'],
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
        ask: ['¿Cuándo hay un conflicto al hacer merge?', '¿Qué provoca un conflicto en git?'],
        right: [
          'Que las dos ramas cambiaron las mismas líneas de forma distinta',
          'Que dos cambios tocan la misma zona de un fichero y git no sabe con cuál quedarse',
        ],
        wrong: [
          'Que un fichero es demasiado grande',
          'Que se ha borrado la rama remota',
          'Que hay dos commits con el mismo mensaje',
          'Que se hace merge, siempre',
        ],
      },
      {
        ask: [
          '¿Con qué marcas separa git las dos versiones en un conflicto?',
          'En un fichero con conflicto, las dos versiones aparecen entre…',
        ],
        right: ['<<<<<<<, ======= y >>>>>>>'],
        wrong: ['/* conflict */ y /* end */', '### MERGE ###', '[[[ y ]]]'],
      },
    ],
    wrong: [
      'Que un fichero es demasiado grande',
      'Que se ha borrado la rama remota',
      'Que hay dos commits con el mismo mensaje',
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
          'Pasa la salida de ls a wc, que cuenta sus líneas',
        ],
        wrong: [
          'Ejecuta ls y wc a la vez, sin conectarlas',
          'Guarda la salida de ls en un fichero llamado wc',
          'Solo ejecuta wc si ls falla',
          'Cuenta los ficheros ocultos',
        ],
      },
      {
        ask: [
          'En `cmd1 | cmd2`, ¿qué pasa con la salida de cmd1?',
          '¿Qué hace el símbolo `|` entre dos órdenes?',
        ],
        right: [
          'Se convierte en la entrada de la segunda orden',
          'Conecta la salida de la primera con la entrada de la segunda',
        ],
        wrong: [
          'Se descarta',
          'Es un OR lógico entre las dos órdenes',
          'Solo ejecuta la segunda si la primera falla',
          'Se escribe en un fichero temporal llamado pipe',
        ],
      },
    ],
    wrong: ['Se descarta', 'Solo ejecuta la segunda si la primera falla', 'Es un OR lógico'],
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
          '¿En qué se diferencian `echo hola > f` y `echo hola >> f`?',
        ],
        right: [
          '`>` sobrescribe y `>>` añade al final',
          '`>>` añade sin borrar lo que había; `>` lo vacía',
        ],
        wrong: [
          '`>` añade y `>>` sobrescribe',
          '`>>` redirige la entrada',
          '`>>` redirige los errores',
          '`>` solo funciona con ficheros nuevos',
        ],
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
      '`>` añade y `>>` sobrescribe',
      '`>>` redirige la entrada',
      '`>>` redirige los errores',
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
        ask: ['¿Qué guarda `$?` en bash?', '¿Qué contiene la variable especial `$?`?'],
        right: [
          'El código de salida de la última orden',
          'Cómo terminó la última orden (0 si fue bien)',
        ],
        wrong: [
          'El PID de la shell',
          'El número de argumentos',
          'El último argumento',
          'El nombre del script',
        ],
      },
      {
        ask: [
          '¿Qué código de salida da una orden que ha ido bien?',
          'Por convenio, una orden que termina sin error sale con…',
        ],
        right: ['0'],
        wrong: ['1', '-1', '255', '42'],
      },
    ],
    wrong: ['El PID de la shell', 'El número de argumentos', 'El último argumento'],
    why: '`$?` es el estado de salida: 0 significa éxito, y cualquier otro número, error.',
  },
  {
    id: 'gen-chmod',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué permisos da `chmod 755 fichero`?', '¿Cómo se ven los permisos 755 en `ls -l`?'],
        right: ['rwxr-xr-x'],
        wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-', 'rwxr--r--'],
      },
      {
        ask: [
          '¿Qué número de chmod da `rw-r--r--`?',
          '¿Cómo se escriben en octal los permisos rw-r--r--?',
        ],
        right: ['644'],
        wrong: ['755', '666', '444', '777'],
      },
    ],
    wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-'],
    why: 'Cada cifra es dueño, grupo y otros: leer vale 4, escribir 2 y ejecutar 1 (7 = 4 + 2 + 1, 5 = 4 + 1).',
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
        right: ['65'],
        wrong: ['97', '64', '48', '90'],
      },
      {
        ask: ['¿Qué código ASCII tiene la letra `a` minúscula?', "En ASCII, 'a' vale…"],
        right: ['97'],
        wrong: ['65', '122', '96', '48'],
      },
      {
        ask: [
          '¿Cuánto separa en ASCII una minúscula de su mayúscula?',
          "¿Cuál es la distancia entre 'a' y 'A' en la tabla ASCII?",
        ],
        right: ['32'],
        wrong: ['26', '1', '64', '16'],
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
          'Cuando dos claves distintas dan el mismo hash',
          'Cuando dos claves caen en la misma casilla',
        ],
        wrong: [
          'Cuando se busca una clave que no está',
          'Cuando la tabla se llena del todo',
          'Cuando se borra una clave dos veces',
          'Cuando el hash no cabe en un int',
        ],
      },
      {
        ask: [
          '¿Cómo se llama que dos claves distintas caigan en la misma casilla de una tabla hash?',
          'Si dos claves distintas dan el mismo hash, hay…',
        ],
        right: ['Una colisión'],
        wrong: ['Un rehash', 'Un desbordamiento', 'Un puntero colgante', 'Un duplicado'],
      },
      {
        ask: [
          '¿Qué cuesta, de media, buscar en una tabla hash bien dimensionada?',
          'Una búsqueda en una tabla hash, de media, cuesta…',
        ],
        right: ['O(1)'],
        wrong: ['O(n)', 'O(log n)', 'O(n log n)'],
      },
    ],
    wrong: ['Un rehash', 'Un desbordamiento', 'Un duplicado'],
    why: 'El hash dice directamente la casilla; las colisiones (inevitables) se resuelven encadenando o buscando otra casilla libre.',
  },
]
