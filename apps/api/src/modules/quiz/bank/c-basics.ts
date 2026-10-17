/**
 * Banco de Not-games: C y lo de los primeros proyectos (Libft, ft_printf,
 * get_next_line). C le sale a cualquiera que lo haya tocado, que en el
 * 42cursus es todo el mundo; lo de cada proyecto, a quien lo ha hecho o lo
 * está haciendo.
 */

import type { Concept } from './types.js'

const LIBFT = ['42cursus-libft']
const PRINTF = ['42cursus-ft_printf']
const GNL = ['42cursus-get_next_line']

export const C_BASICS: readonly Concept[] = [
  {
    id: 'c-string-end',
    topic: 'cadenas',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cómo sabe `strlen` dónde acaba una cadena en C?',
          '¿Qué marca el final de un string en C?',
        ],
        right: ["El carácter nulo '\\0'", 'El primer byte que vale 0'],
      },
      {
        ask: ['¿Cuántos bytes ocupa en memoria la cadena "hola"?', '`sizeof("hola")` vale…'],
        right: ['5', "5: cuatro letras y el '\\0'"],
        wrong: ['4'],
      },
    ],
    wrong: [
      "El salto de línea '\\n'",
      'Su longitud, guardada en el primer byte',
      'El último espacio',
      "El carácter '0'",
      '8',
    ],
    why: "Una cadena de C es un array de char terminado en '\\0': ocupa una más que su longitud.",
  },
  {
    id: 'c-sizeof-char',
    topic: 'tipos',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cuánto vale siempre `sizeof(char)`?',
          'En C, el tamaño de un char es, por definición…',
        ],
        right: ['1', 'Uno, siempre'],
      },
      {
        ask: [
          '¿Cuánto ocupa un puntero en una máquina de 64 bits?',
          'En x86-64, `sizeof(int *)` es…',
        ],
        right: ['8 bytes', '8'],
        wrong: ['4', '4 bytes'],
      },
    ],
    wrong: ['2', 'Depende del tipo apuntado', '0', '16'],
    why: 'sizeof(char) es 1 por definición; un puntero ocupa lo que una dirección (8 bytes en 64 bits).',
  },
  {
    id: 'c-malloc-free',
    topic: 'memoria',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué hay que hacer con la memoria que devuelve `malloc` cuando ya no se usa?',
          'Toda memoria reservada con malloc debe…',
        ],
        right: ['Liberarla con free', 'Pasársela a free, una sola vez'],
      },
      {
        ask: [
          'Si reservas con `malloc` y nunca llamas a `free`, tienes…',
          '¿Cómo se llama la memoria reservada que ya no se puede liberar porque se perdió su puntero?',
        ],
        right: ['Una fuga de memoria', 'Un memory leak'],
        wrong: ['Un puntero colgante', 'Un doble free'],
      },
    ],
    wrong: [
      'Nada, se libera sola al salir de la función',
      'Ponerla a NULL basta',
      'Llamar a free dos veces por seguridad',
      'Liberarla con delete',
    ],
    why: 'C no tiene recolector de basura: lo que se pide con malloc se devuelve con free, una sola vez.',
  },
  {
    id: 'c-malloc-null',
    topic: 'memoria',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `malloc` si no puede reservar la memoria?',
          'Si falla una reserva, malloc da…',
        ],
        right: ['NULL', 'Un puntero nulo'],
      },
      {
        ask: ['¿Qué hace `free(NULL)`?', 'Llamar a free con un puntero nulo…'],
        right: ['Nada: es seguro', 'No hace nada'],
        wrong: ['Un fallo de segmentación', 'Un doble free'],
      },
    ],
    wrong: ['-1', 'Aborta el programa', 'Un puntero a la pila', 'Un comportamiento indefinido'],
    why: 'malloc devuelve NULL al fallar (hay que comprobarlo) y free(NULL) no hace nada, por definición.',
  },
  {
    id: 'c-dangling',
    topic: 'memoria',
    needs: { lang: 'c' },
    kind: 'long',
    level: 3,
    code: 'int *f(void)\n{\n    int n = 42;\n    return &n;\n}',
    forms: [
      {
        ask: ['¿Qué falla en esta función?', '¿Por qué está mal esto?'],
        right: [
          'Devuelve la dirección de una variable local, que deja de existir al salir',
          'El puntero que devuelve apunta a la pila de una función que ya terminó',
        ],
      },
      {
        ask: [
          '¿Cómo se llama el puntero que devuelve?',
          'Un puntero a memoria que ya no es válida se llama…',
        ],
        right: ['Un puntero colgante (dangling pointer)', 'Dangling pointer'],
        wrong: ['Un puntero nulo', 'Una fuga de memoria', 'Un puntero a función'],
      },
    ],
    wrong: [
      'Falta un cast a int*',
      'n debería ser unsigned',
      'No falla nada',
      'Hay que hacer free(&n)',
    ],
    why: 'n vive en la pila de f; al volver, esa memoria se reutiliza y el puntero ya no vale.',
  },
  {
    id: 'c-memmove-overlap',
    topic: 'memoria',
    needs: { projects: LIBFT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué diferencia a `memmove` de `memcpy`?',
          '¿Por qué existe memmove si ya está memcpy?',
        ],
        right: [
          'memmove funciona aunque origen y destino se solapen',
          'memcpy no garantiza nada con zonas solapadas; memmove sí',
        ],
      },
      {
        ask: [
          'Si origen y destino se solapan, ¿cuál de las dos copia bien?',
          'Para mover bytes dentro de un mismo array con solapamiento, usas…',
        ],
        right: ['memmove'],
        wrong: ['memcpy', 'strcpy', 'memset'],
      },
    ],
    wrong: [
      'memmove es siempre más rápida',
      'memmove borra el origen después de copiar',
      'Son exactamente iguales',
      'memmove solo copia cadenas',
    ],
    why: 'Con solapamiento memcpy puede pisar lo que aún no ha copiado; memmove elige el sentido de la copia.',
  },
  {
    id: 'c-pointer-arith',
    topic: 'punteros',
    needs: { lang: 'c' },
    kind: 'long',
    level: 2,
    code: 'int a[] = {10, 20, 30, 40};\nint *p = a;\np += 2;\nprintf("%d\\n", *p);',
    forms: [
      { ask: ['¿Qué imprime este código?', '¿Cuál es la salida?'], right: ['30'] },
      {
        ask: ['¿A qué apunta `p` al final?', 'Tras `p += 2`, p apunta a…'],
        right: ['A a[2]', 'Al tercer elemento'],
        wrong: ['A a[0] + 2 bytes', 'A a[1]'],
      },
    ],
    wrong: ['20', '12', '10', '40', 'La dirección de a'],
    why: 'Sumar 2 a un int* avanza dos enteros, no dos bytes: p apunta a a[2], que vale 30.',
  },
  {
    id: 'c-string-literal-write',
    topic: 'punteros',
    needs: { lang: 'c' },
    kind: 'long',
    level: 3,
    code: 'char *s = "hola";\ns[0] = \'H\';\nprintf("%s\\n", s);',
    forms: [
      {
        ask: ['¿Qué pasa al ejecutar esto?', 'Este código compila. ¿Qué ocurre al ejecutarlo?'],
        right: [
          'Comportamiento indefinido: escribe en un literal (suele dar segmentation fault)',
          'Suele dar segfault: los literales no se pueden modificar',
        ],
      },
      {
        ask: [
          '¿Cómo hay que declarar `s` para poder cambiarle letras?',
          '¿Qué cambio arregla este código?',
        ],
        right: ['char s[] = "hola";', 'Como array: char s[] = "hola"'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';"],
      },
    ],
    wrong: ['Imprime Hola', 'Imprime hola', 'No compila', 'Imprime H', 'Una fuga de memoria'],
    why: 'Un literal vive en memoria de solo lectura; char s[] = "hola" hace una copia propia que sí se puede cambiar.',
  },
  {
    id: 'c-off-by-one-malloc',
    topic: 'memoria',
    needs: { projects: LIBFT },
    kind: 'long',
    level: 3,
    code: 'char *dup(const char *s)\n{\n    char *d = malloc(strlen(s));\n    strcpy(d, s);\n    return d;\n}',
    forms: [
      {
        ask: ['Esta función copia una cadena. ¿Qué falla?', '¿Qué error tiene este strdup?'],
        right: ["Reserva un byte de menos: falta el del '\\0'", 'Debería reservar strlen(s) + 1'],
      },
    ],
    wrong: [
      'strcpy no copia el último carácter',
      'Hay que hacer free(d) antes del return',
      'malloc necesita un cast a char*',
      's debería ser char**',
      'No falla nada',
      'Falta comprobar que s no es NULL, y nada más',
    ],
    why: "strlen no cuenta el '\\0', pero strcpy sí lo copia: escribe un byte fuera de lo reservado.",
  },
  {
    id: 'c-static-local',
    topic: 'variables',
    needs: { projects: GNL },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué tiene de especial una variable local declarada `static`?',
          'Una variable static dentro de una función…',
        ],
        right: [
          'Conserva su valor entre llamadas',
          'Vive todo el programa aunque solo se vea en la función',
        ],
      },
      {
        ask: [
          '¿Qué permite a get_next_line recordar lo que sobró de la lectura anterior?',
          'Para guardar lo leído de más entre dos llamadas a get_next_line se usa…',
        ],
        right: ['Una variable static', 'Una variable local static'],
        wrong: ['Una variable local normal', 'Un parámetro más', 'Una variable global con extern'],
      },
    ],
    wrong: [
      'Se reinicia en cada llamada',
      'Es visible desde otros ficheros',
      'Se guarda en la pila',
      'Es constante',
    ],
    why: 'static da a la variable duración de todo el programa (se inicializa una vez) sin cambiar dónde se ve.',
  },
  {
    id: 'c-read-return',
    topic: 'ficheros',
    needs: { projects: GNL },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `read` al llegar al final del fichero?',
          'Cuando no queda nada que leer, read devuelve…',
        ],
        right: ['0'],
        wrong: ['-1'],
      },
      {
        ask: ['¿Qué devuelve `read` si hay un error?', 'Si read falla, devuelve…'],
        right: ['-1'],
        wrong: ['0'],
      },
      {
        ask: [
          'Si `read(fd, buf, 42)` devuelve 10, ¿qué ha pasado?',
          'read pidió 42 bytes y devolvió 10. Significa…',
        ],
        right: [
          'Que solo había 10 bytes disponibles (no es un error)',
          'Ha leído 10 bytes, menos de lo pedido',
        ],
        wrong: ['Un error', 'Que faltan 32 bytes por un fallo'],
      },
    ],
    wrong: ['EOF, que es un carácter', "'\\0'", 'El número de bytes pedido', '42'],
    why: 'read devuelve los bytes leídos (pueden ser menos de los pedidos): 0 es fin de fichero y -1, error.',
  },
  {
    id: 'c-fd-standard',
    topic: 'ficheros',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué descriptor de fichero es la salida de error (stderr)?',
          'Para escribir un error con `write`, ¿qué fd usas?',
        ],
        right: ['2'],
      },
      {
        ask: [
          '¿Qué descriptor es la entrada estándar (stdin)?',
          'read(…, …) desde el teclado lee del fd…',
        ],
        right: ['0'],
        wrong: ['2'],
      },
      {
        ask: [
          '¿Qué número suele dar `open` al primer fichero que abre un programa?',
          'El primer fd libre de un programa recién arrancado es…',
        ],
        right: ['3'],
        wrong: ['0', '2'],
      },
    ],
    wrong: ['1', '-1', '4', '42'],
    why: 'Por convenio, 0 es la entrada, 1 la salida y 2 los errores; open da el número libre más bajo (3).',
  },
  {
    id: 'c-variadic',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Con qué se recorren los argumentos de una función variádica?',
          'Para leer los argumentos de `printf(const char *fmt, ...)` se usa…',
        ],
        right: ['va_start, va_arg y va_end', 'Una va_list con va_arg'],
      },
      {
        ask: [
          '¿Cómo sabe printf cuántos argumentos le han pasado?',
          'Una función variádica conoce el número de argumentos…',
        ],
        right: ['No lo sabe: lo deduce del formato', 'Por la cadena de formato'],
        wrong: ['Con argc', 'Con sizeof(...)', 'va_arg devuelve NULL al acabar'],
      },
    ],
    wrong: ['argc y argv', 'Un array de void*', 'malloc y free', 'getopt'],
    why: 'va_start empieza, va_arg da el siguiente con el tipo que digas y va_end termina; cuántos hay lo dice el formato.',
  },
  {
    id: 'c-printf-formats',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 2,
    forms: [
      { ask: ['¿Qué imprime `printf("%x", 255)`?', 'El formato %x con 255 da…'], right: ['ff'] },
      {
        ask: ['¿Qué imprime `printf("%X", 255)`?', 'El formato %X con 255 da…'],
        right: ['FF'],
        wrong: ['ff'],
      },
      {
        ask: [
          '¿Qué imprime `printf("%u", -1)` con int de 32 bits?',
          '-1 escrito con %u (32 bits) sale como…',
        ],
        right: ['4294967295'],
        wrong: ['-1', '1', '2147483647'],
      },
    ],
    wrong: ['0xff', '255', '377', '11111111'],
    why: '%x/%X escriben en hexadecimal sin prefijo; %u lee los bits como sin signo: -1 son 32 unos.',
  },
  {
    id: 'c-char-promotion',
    topic: 'tipos',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          'En una función variádica, ¿con qué tipo se lee un char pasado como argumento?',
          'Para `%c`, printf debe hacer va_arg(ap, …) con…',
        ],
        right: ['int', 'Con int, porque se promociona'],
      },
    ],
    wrong: ['char', 'unsigned char', 'char *', 'short', 'Tal cual, sin cambiar'],
    why: 'En los argumentos variables, char y short se promocionan a int; leerlos como char es indefinido.',
  },
  {
    id: 'c-list-add-front',
    topic: 'listas',
    needs: { projects: LIBFT },
    kind: 'long',
    level: 3,
    code: 'void lstadd_front(t_list *lst, t_list *new)\n{\n    new->next = lst;\n    lst = new;\n}',
    forms: [
      {
        ask: [
          '¿Qué falla en este lstadd_front?',
          'Debería poner `new` al principio de la lista. ¿Qué pasa?',
        ],
        right: [
          'Cambia una copia del puntero: fuera, la cabeza no cambia',
          'Hay que recibir t_list **lst para cambiar la cabeza',
        ],
      },
    ],
    wrong: [
      'Falta reservar memoria para new',
      'Debería ser lst->next = new',
      'Hay que liberar lst',
      'Funciona bien',
      'Falta un return',
    ],
    why: 'En C los argumentos se pasan por valor: para cambiar la cabeza hay que pasar su dirección.',
  },
  {
    id: 'c-unsigned-loop',
    topic: 'tipos',
    needs: { lang: 'c' },
    kind: 'long',
    level: 4,
    code: 'for (size_t i = 10; i >= 0; i--)\n    printf("%zu\\n", i);',
    forms: [
      {
        ask: ['¿Cuántas veces se ejecuta este bucle?', 'Quiere contar de 10 a 0. ¿Qué pasa?'],
        right: ['Nunca termina: un size_t siempre es >= 0', 'Es un bucle infinito'],
      },
    ],
    wrong: ['11 veces', '10 veces', 'Ninguna', 'Da error de compilación', 'Se para en -1'],
    why: 'size_t no tiene signo: al bajar de 0 da la vuelta al valor más grande y la condición siempre se cumple.',
  },
  {
    id: 'c-signed-overflow',
    topic: 'tipos',
    needs: { projects: LIBFT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué pasa en C si un int con signo pasa de INT_MAX?',
          'Sumar 1 a INT_MAX en un int es…',
        ],
        right: ['Comportamiento indefinido', 'Indefinido: el estándar no dice qué pasa'],
      },
      {
        ask: ['¿Y si un unsigned int pasa de su máximo?', 'Sumar 1 a UINT_MAX da…'],
        right: ['0: da la vuelta de forma definida', 'Vuelve a 0'],
        wrong: ['Comportamiento indefinido'],
      },
    ],
    wrong: [
      'Da error de compilación',
      'Se queda en el máximo',
      'Lanza una excepción',
      'Pasa a ser un long',
    ],
    why: 'Los unsigned dan la vuelta (aritmética módulo 2ⁿ); con signo, desbordar es indefinido.',
  },
  {
    id: 'c-makefile-relink',
    topic: 'makefile',
    needs: { lang: 'c' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cómo sabe make que no hace falta volver a compilar?',
          'make decide si rehacer un objetivo mirando…',
        ],
        right: [
          'Las fechas de modificación del objetivo y sus dependencias',
          'Si el objetivo es más nuevo que todo lo que necesita',
        ],
      },
      {
        ask: ['¿Para qué sirve `.PHONY` en un Makefile?', 'Declarar `.PHONY: clean` sirve para…'],
        right: [
          'Que make ejecute la regla aunque exista un fichero con ese nombre',
          'Decir que esa regla no crea un fichero',
        ],
        wrong: ['Compilar en paralelo', 'Ocultar la regla de la ayuda'],
      },
    ],
    wrong: [
      'Un hash de cada fichero',
      'Lo que recuerda en memoria entre ejecuciones',
      'Siempre recompila todo',
      'Si existe la carpeta obj',
    ],
    why: 'make rehace un objetivo si alguna dependencia es más reciente; .PHONY marca reglas que no son ficheros.',
  },
]
