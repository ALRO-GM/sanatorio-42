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
        wrong: [
          "El salto de línea '\\n'",
          'Su longitud, guardada en el primer byte',
          'El último espacio',
          "El carácter '0'",
        ],
      },
      {
        ask: [
          '¿Cuántos bytes ocupa en memoria la cadena "hola"?',
          '¿Cuánto vale `sizeof("hola")`?',
        ],
        right: ['5'],
        wrong: ['4', '8', '6', '1'],
      },
    ],
    wrong: [
      "El salto de línea '\\n'",
      'Su longitud, guardada en el primer byte',
      'El último espacio',
    ],
    why: "Una cadena de C es un array de char terminado en '\\0': ocupa un byte más que su longitud.",
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
          'En C, ¿cuántos bytes ocupa un char, por definición?',
        ],
        right: ['1'],
        wrong: ['2', '4', '8', '0'],
      },
      {
        ask: [
          '¿Cuántos bytes ocupa un puntero en una máquina de 64 bits?',
          'En x86-64, ¿cuánto vale `sizeof(int *)`?',
        ],
        right: ['8'],
        wrong: ['4', '2', '16', '1'],
      },
    ],
    wrong: ['2', '4', '16', '0'],
    why: 'sizeof(char) es 1 por definición; un puntero ocupa lo que una dirección (8 bytes en 64 bits), apunte a lo que apunte.',
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
          'La memoria reservada con malloc, cuando ya no hace falta, hay que…',
        ],
        right: ['Liberarla con free', 'Pasársela a free, una sola vez'],
        wrong: [
          'Nada: se libera sola al salir de la función',
          'Ponerla a NULL, que basta',
          'Llamar a free dos veces, por seguridad',
          'Liberarla con delete',
        ],
      },
      {
        ask: [
          'Si reservas con `malloc` y nunca llamas a `free`, tienes…',
          '¿Cómo se llama la memoria reservada que ya no se puede liberar porque se perdió su puntero?',
        ],
        right: ['Una fuga de memoria'],
        wrong: ['Un puntero colgante', 'Un doble free', 'Un desbordamiento de pila'],
      },
    ],
    wrong: [
      'Nada: se libera sola al salir de la función',
      'Ponerla a NULL, que basta',
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
          'Si falla una reserva, malloc devuelve…',
        ],
        // Todas como código, para que «NULL» no destaque entre frases largas.
        right: ['`NULL`'],
        wrong: ['`(void *)-1`', '`-1`', '`EOF`', '`ENOMEM`'],
      },
      {
        ask: ['¿Qué hace `free(NULL)`?', '¿Qué pasa si llamas a free con un puntero nulo?'],
        right: ['No hace nada, es seguro'],
        wrong: ['Da un fallo de segmentación', 'Cuenta como un doble free', 'Aborta el programa'],
      },
    ],
    wrong: ['Da un fallo de segmentación', 'Aborta el programa', 'Libera la memoria dos veces'],
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
        ask: ['¿Qué falla en este código?', '¿Por qué está mal esto?'],
        right: [
          'Devuelve la dirección de una variable local',
          'Apunta a la pila de una llamada ya terminada',
        ],
        wrong: [
          'Falta un cast de &n a int* en el return',
          'Hay que hacer free(&n) antes de volver',
          'No falla nada: el que llama lee un 42',
          'f debería recibir n como parámetro',
        ],
      },
      {
        ask: [
          '¿Cómo se llama el puntero que devuelve f?',
          'Un puntero a memoria que ya no es válida se llama…',
        ],
        right: ['Un puntero colgante'],
        wrong: ['Un puntero nulo', 'Un puntero a función', 'Un puntero constante'],
      },
    ],
    wrong: [
      'Falta un cast de &n a int* en el return',
      'Hay que hacer free(&n) antes de volver',
      'No falla nada: el que llama lee un 42',
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
          'memmove admite que las zonas se solapen',
          'Solo memmove copia bien con solapamiento',
        ],
        wrong: [
          'memmove es siempre más rápida que memcpy',
          'memmove borra el origen después de copiar',
          'memmove solo sirve para copiar cadenas',
          'Son iguales: memmove es otro nombre de memcpy',
        ],
      },
      {
        ask: [
          'Si origen y destino se solapan, ¿qué función copia bien?',
          'Para mover bytes dentro de un mismo array con solapamiento, usas…',
        ],
        right: ['memmove'],
        wrong: ['memcpy', 'strcpy', 'memset', 'strlcpy'],
      },
    ],
    wrong: [
      'memmove es siempre más rápida que memcpy',
      'memmove borra el origen después de copiar',
      'memmove solo sirve para copiar cadenas',
    ],
    why: 'Con solapamiento, memcpy puede pisar lo que aún no ha copiado; memmove elige el sentido de la copia.',
  },
  {
    id: 'c-pointer-arith',
    topic: 'punteros',
    needs: { lang: 'c' },
    kind: 'long',
    level: 2,
    code: 'int a[] = {10, 20, 30, 40};\nint *p = a;\np += 2;\nprintf("%d\\n", *p);',
    forms: [
      {
        ask: ['¿Qué imprime este código?', '¿Cuál es la salida?'],
        right: ['30'],
        wrong: ['20', '12', '10', '40'],
      },
      {
        ask: ['¿A qué apunta `p` al final?', 'Después de `p += 2`, ¿a qué apunta p?'],
        right: ['A a[2]', 'Al tercer elemento'],
        wrong: ['A 2 bytes después de a[0]', 'A a[1]', 'Al segundo elemento', 'Fuera del array'],
      },
    ],
    wrong: ['20', '12', '10', '40'],
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
          'Comportamiento indefinido: suele dar segfault',
          'Suele dar segfault: un literal no se modifica',
        ],
        wrong: [
          'Imprime Hola, con la H mayúscula',
          'Imprime hola, porque s[0] es una copia',
          'Imprime H y se para en la primera letra',
          'Tiene una fuga: el literal no se libera',
        ],
      },
      {
        ask: [
          '¿Cómo hay que declarar `s` para poder cambiarle letras?',
          '¿Qué declaración arregla este código?',
        ],
        right: ['char s[] = "hola";'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';", 'static char *s = "hola";'],
      },
    ],
    wrong: [
      'Imprime Hola, con la H mayúscula',
      'Imprime hola, porque s[0] es una copia',
      'Imprime H y se para en la primera letra',
    ],
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
        right: ["Reserva un byte de menos, el del '\\0'", 'Debería reservar strlen(s) + 1'],
      },
    ],
    wrong: [
      'strcpy no copia el último carácter',
      'Hay que hacer free(d) antes del return',
      'malloc necesita un cast a char *',
      "No falla: strlen ya cuenta el '\\0'",
      'd debería ser static para devolverla',
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
          '¿Qué cambia al poner static a una variable dentro de una función?',
        ],
        right: ['Conserva su valor entre llamadas', 'Dura todo el programa, no solo una llamada'],
        wrong: [
          'Se reinicia a 0 en cada llamada',
          'Se ve también desde otros ficheros',
          'Pasa a ser constante tras asignarla',
          'Se guarda en la pila de quien llama',
        ],
      },
      {
        ask: [
          '¿Qué permite a get_next_line recordar lo que sobró de la lectura anterior?',
          'Para guardar lo leído de más entre dos llamadas a get_next_line se usa…',
        ],
        // Todas son locales con otro calificativo: lo que cuenta es saber cuál dura entre llamadas.
        right: ['Una variable local static'],
        wrong: [
          'Una variable local normal',
          'Una variable local register',
          'Una variable local const',
        ],
      },
    ],
    wrong: [
      'Se reinicia a 0 en cada llamada',
      'Se ve también desde otros ficheros',
      'Pasa a ser constante tras asignarla',
    ],
    why: 'static da a la variable la duración de todo el programa (se inicializa una vez) sin cambiar dónde se ve.',
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
        wrong: ['-1', '1', '42'],
      },
      {
        ask: ['¿Qué devuelve `read` si hay un error?', 'Si read falla, devuelve…'],
        right: ['-1'],
        wrong: ['0', '1', '42'],
      },
      {
        ask: [
          'Si `read(fd, buf, 42)` devuelve 10, ¿qué ha pasado?',
          'read pidió 42 bytes y devolvió 10. ¿Qué significa?',
        ],
        right: ['Que solo había 10 bytes para leer', 'Que ha leído 10 bytes, menos de lo pedido'],
        wrong: [
          'Que ha habido un error a mitad de lectura',
          'Que faltan 32 bytes por un fallo de disco',
          'Que el fichero tiene 52 bytes en total',
        ],
      },
    ],
    wrong: ['1', '42', '2'],
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
        wrong: ['1', '0', '3'],
      },
      {
        ask: [
          '¿Qué descriptor es la entrada estándar (stdin)?',
          '¿De qué fd lee `read` cuando lee del teclado?',
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
      },
      {
        ask: [
          '¿Qué número suele dar `open` al primer fichero que abre un programa?',
          '¿Cuál es el primer fd libre de un programa recién arrancado?',
        ],
        right: ['3'],
        wrong: ['0', '2', '1'],
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
        wrong: [
          'argc y argv, como en main',
          'Un array de void * con NULL al final',
          'getopt y optarg',
          'malloc, memcpy y free',
        ],
      },
      {
        ask: [
          '¿Cómo sabe printf cuántos argumentos le han pasado?',
          '¿De dónde saca una función variádica cuántos argumentos tiene?',
        ],
        right: ['No lo sabe: lo deduce del formato', 'De lo que pide la cadena de formato'],
        wrong: [
          'De un argc oculto que pasa el compilador',
          'De sizeof(...) sobre los argumentos',
          'De va_arg, que da NULL al acabar',
        ],
      },
    ],
    wrong: ['argc y argv, como en main', 'Un array de void * con NULL al final', 'getopt y optarg'],
    why: 'va_start empieza, va_arg da el siguiente con el tipo que digas y va_end termina; cuántos hay lo dice el formato.',
  },
  {
    id: 'c-printf-formats',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué imprime `printf("%x", 255)`?', '¿Qué da el formato %x con 255?'],
        right: ['ff'],
        wrong: ['FF', 'f', 'fff', 'ef'],
      },
      {
        ask: ['¿Qué imprime `printf("%X", 255)`?', '¿Qué da el formato %X con 255?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FFF', 'EF'],
      },
      {
        ask: [
          '¿Qué imprime `printf("%u", -1)` con int de 32 bits?',
          '¿Cómo sale -1 escrito con %u (32 bits)?',
        ],
        right: ['4294967295'],
        wrong: ['-1', '1', '2147483647'],
      },
    ],
    wrong: ['0xff', '255', '377', '11111111'],
    why: '%x y %X escriben en hexadecimal sin prefijo (en minúsculas y mayúsculas); %u lee los bits como sin signo: -1 son 32 unos.',
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
          'Para `%c`, ¿qué tipo hay que pasar a va_arg?',
        ],
        right: ['int'],
      },
    ],
    wrong: ['char', 'unsigned char', 'char *', 'short'],
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
        right: ['Cambia solo su copia local de lst', 'Debería recibir t_list **lst'],
      },
    ],
    wrong: [
      'Falta reservar memoria para new',
      'Debería ser lst->next = new',
      'Hay que liberar lst antes de cambiarla',
      'Funciona bien: new queda el primero',
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
        ask: ['¿Qué pasa con este bucle?', 'Quiere contar de 10 a 0. ¿Qué pasa?'],
        right: ['Nunca termina: i nunca baja de 0', 'Da vueltas sin fin'],
      },
    ],
    // Con texto y no con números: si no, «11 veces» no saldría nunca junto a la buena.
    wrong: [
      'Termina tras 11 vueltas',
      'Termina tras 10 vueltas',
      'No entra ni una vez',
      'No compila por el i >= 0',
      'Se para al llegar a -1',
    ],
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
          '¿Qué pasa al sumar 1 a INT_MAX en un int?',
        ],
        right: ['Comportamiento indefinido', 'El estándar no dice qué pasa'],
        wrong: [
          'Da un error al compilar',
          'Se queda fijo en INT_MAX',
          'Lanza una excepción en tiempo de ejecución',
          'Se convierte solo en un long',
        ],
      },
      {
        ask: ['¿Qué pasa si un unsigned int pasa de su máximo?', '¿Qué da sumar 1 a UINT_MAX?'],
        right: ['Vuelve a 0, de forma definida'],
        wrong: [
          'Comportamiento indefinido',
          'Se queda fijo en UINT_MAX',
          'Da un error al compilar',
          'Pasa a valer -1, con signo',
        ],
      },
    ],
    wrong: ['Da un error al compilar', 'Se queda fijo en INT_MAX', 'Se convierte solo en un long'],
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
          '¿En qué se fija make para decidir si rehace un objetivo?',
        ],
        right: [
          'En las fechas de modificación de los ficheros',
          'En si el objetivo es más nuevo que sus dependencias',
        ],
        wrong: [
          'En un hash del contenido de cada fichero',
          'En lo que recuerda en memoria entre ejecuciones',
          'En nada: siempre lo recompila todo',
          'En si existe ya la carpeta de los objetos',
        ],
      },
      {
        ask: ['¿Para qué sirve `.PHONY` en un Makefile?', '¿Para qué se declara `.PHONY: clean`?'],
        right: [
          'Para ejecutarla aunque haya un fichero con su nombre',
          'Para marcar que la regla no crea ningún fichero',
        ],
        wrong: [
          'Para compilar sus dependencias en paralelo',
          'Para ocultar la regla en la ayuda de make',
          'Para que la regla se ejecute antes que all',
          'Para que make no muestre las órdenes que ejecuta',
        ],
      },
    ],
    wrong: [
      'En un hash del contenido de cada fichero',
      'En nada: siempre lo recompila todo',
      'En si existe ya la carpeta de los objetos',
    ],
    why: 'make rehace un objetivo si alguna dependencia es más reciente; .PHONY marca reglas que no son ficheros.',
  },
  {
    id: 'libft-split',
    topic: 'cadenas',
    needs: { projects: LIBFT },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_split("  hola  42 ", \' \')`?',
          'Partiendo `"  hola  42 "` por espacios, `ft_split` devuelve…',
        ],
        right: ['`{"hola", "42", NULL}`'],
        wrong: [
          '`{"hola", "42"}`',
          '`{"", "hola", "", "42", NULL}`',
          '`{"  hola", "  42 ", NULL}`',
          '`{"hola  42", NULL}`',
        ],
      },
      {
        ask: [
          '¿Cómo sabe quien usa el array de `ft_split` dónde acaba?',
          'El array que devuelve ft_split no lleva su tamaño. ¿Cómo se sabe dónde termina?',
        ],
        right: ['Porque el último puntero es NULL', 'Por un puntero NULL detrás de la última'],
        wrong: [
          'Porque acaba en una cadena vacía',
          'Porque el primero guarda cuántas hay',
          "Porque detrás de la última hay un '\\0'",
        ],
      },
    ],
    wrong: [
      'Porque acaba en una cadena vacía',
      'Porque el primero guarda cuántas hay',
      'Porque ft_split avisa con un printf',
    ],
    why: 'ft_split salta los separadores seguidos (no da cadenas vacías) y cierra el array con un puntero NULL, como argv.',
  },
  {
    id: 'libft-itoa',
    topic: 'cadenas',
    needs: { projects: LIBFT },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Con qué n falla un ft_itoa que empieza por `if (n < 0) n = -n;` con int de 32 bits?',
          'Un ft_itoa cambia el signo con `n = -n` sin más. ¿Con qué valor de n se rompe?',
        ],
        right: ['-2147483648'],
        wrong: ['-1', '0', '2147483647', '-2147483647'],
      },
      {
        ask: [
          "¿Cuántos bytes tiene que reservar `ft_itoa(-42)`, contando el '\\0'?",
          "Contando signo y '\\0', ¿cuántos bytes ocupa el resultado de `ft_itoa(-42)`?",
        ],
        right: ['4'],
        wrong: ['3', '5', '2'],
      },
    ],
    wrong: ['1', '6', '11'],
    why: '-(-2147483648) no cabe en un int (el máximo es 2147483647), así que INT_MIN se trata aparte o con un long; "-42" son signo, dos cifras y el \'\\0\'.',
  },
  {
    id: 'libft-ar',
    topic: 'makefile',
    needs: { projects: LIBFT },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué orden junta los `.o` en la biblioteca `libft.a`?',
          'Para crear `libft.a` con los objetos ya compilados, el Makefile llama a…',
        ],
        right: ['`ar rcs libft.a *.o`'],
        wrong: [
          '`gcc -shared -o libft.a *.o`',
          '`ld -o libft.a *.o`',
          '`tar -cf libft.a *.o`',
          '`cc -c -o libft.a *.c`',
        ],
      },
      {
        ask: ['¿Qué es `libft.a`?', '¿Qué fichero es el `libft.a` que entregas?'],
        right: ['Una biblioteca estática: los .o juntos', 'Un archivo con los .o de tus funciones'],
        wrong: [
          'Un ejecutable con todas las funciones',
          'Una biblioteca dinámica que se carga al arrancar',
          'Una cabecera .h ya compilada',
          'Un .c con todas las funciones juntas',
        ],
      },
    ],
    wrong: [
      'Un ejecutable con todas las funciones',
      'Una cabecera .h ya compilada',
      'Un .c con todas las funciones juntas',
    ],
    why: 'Una biblioteca estática .a es un archivo de objetos hecho con ar; al enlazar, se copian en el programa los que hacen falta.',
  },
  {
    id: 'libft-lstclear',
    topic: 'listas',
    needs: { projects: LIBFT },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué tiene que hacer `ft_lstclear(&lst, del)`?',
          'Según el enunciado de la Libft, ft_lstclear tiene que…',
        ],
        right: [
          'Liberar cada nodo y su contenido, y dejar lst a NULL',
          'Borrar la lista entera y dejar el puntero a NULL',
        ],
        wrong: [
          'Liberar solo el primer nodo y su contenido',
          'Vaciar el contenido y dejar los nodos',
          'Liberar los nodos, pero no su contenido',
          'Poner lst a NULL sin liberar nada',
        ],
      },
      {
        ask: [
          'En `ft_lstclear`, ¿para qué sirve el parámetro `del`?',
          '¿Qué hace la función `del` que recibe ft_lstclear?',
        ],
        right: ['Libera el contenido de cada nodo'],
        wrong: [
          'Libera el nodo, pero no su contenido',
          'Decide qué nodos se borran y cuáles no',
          'Compara contenidos y quita repetidos',
        ],
      },
    ],
    wrong: [
      'Liberar solo el primer nodo y su contenido',
      'Vaciar el contenido y dejar los nodos',
      'Poner lst a NULL sin liberar nada',
    ],
    why: 'La lista no sabe qué guarda content: del lo libera, free libera cada nodo y al final el puntero a la lista queda a NULL.',
  },
  {
    id: 'printf-return',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_printf("hola %d\\n", 42)`?',
          'Tras escribir `hola 42` y un salto de línea, ft_printf devuelve…',
        ],
        right: ['8'],
        wrong: ['7', '9', '0', '2'],
      },
      {
        ask: [
          '¿Qué tiene que devolver `ft_printf`?',
          '¿Qué valor de retorno pide el enunciado de ft_printf?',
        ],
        right: ['El número de caracteres que ha escrito'],
        wrong: [
          'El número de conversiones del formato',
          'El número de argumentos que ha leído',
          'La longitud de la cadena de formato',
          'Un 0 si todo ha ido bien',
        ],
      },
    ],
    wrong: ['1', '10', '42'],
    why: 'Como printf, ft_printf devuelve cuántos caracteres ha escrito: "hola 42\\n" son 8.',
  },
  {
    id: 'printf-pointer',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué imprime `ft_printf("%p", (void *)42)`?',
          'Un puntero que vale 42, escrito con `%p`, sale como…',
        ],
        right: ['0x2a'],
        wrong: ['42', '2a', '0x2A', '0x0000002a'],
      },
      {
        ask: [
          '¿En qué formato escribe `%p` la dirección?',
          'Con %p, la dirección de un puntero sale en…',
        ],
        right: ['Hexadecimal, en minúsculas y con 0x'],
        wrong: [
          'Decimal, como un unsigned long',
          'Hexadecimal en mayúsculas, sin 0x',
          'Binario, con el prefijo 0b',
          'Octal, con un 0 delante',
        ],
      },
    ],
    wrong: ['0x42', '0X2A', '0b101010'],
    why: '%p escribe la dirección en hexadecimal en minúsculas con el prefijo 0x, como printf: 42 es 0x2a.',
  },
  {
    id: 'printf-percent',
    topic: 'funciones',
    needs: { projects: PRINTF },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué imprime `ft_printf("%d%%", 50)`?', 'Con el formato `"%d%%"` y 50, sale…'],
        right: ['50%'],
        wrong: ['50', '50%%', '5%', '0%'],
      },
      {
        ask: ['¿Qué imprime `ft_printf("%%d", 42)`?', 'Con el formato `"%%d"` y 42, sale…'],
        right: ['%d'],
        wrong: ['%42', '%%d', '%d42'],
      },
    ],
    wrong: ['%%', '%50', 'd'],
    why: '%% escribe un solo % y no consume ningún argumento; lo que va detrás se imprime tal cual.',
  },
  {
    id: 'gnl-buffer-size',
    topic: 'ficheros',
    needs: { projects: GNL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué opción de cc fija BUFFER_SIZE al compilar get_next_line?',
          'Para compilar get_next_line con un búfer de 42 bytes, le pasas a cc…',
        ],
        right: ['`-D BUFFER_SIZE=42`'],
        wrong: ['`-O BUFFER_SIZE=42`', '`-I BUFFER_SIZE=42`', '`-l BUFFER_SIZE=42`'],
      },
      {
        ask: [
          'Con BUFFER_SIZE=1, ¿cuántas llamadas a read hacen falta para leer la línea `hola\\n`?',
          'Si cada read trae 1 byte, ¿cuántas lecturas cuesta la línea `hola\\n`?',
        ],
        right: ['5'],
        wrong: ['1', '4', '6', '2'],
      },
      {
        ask: [
          'Con `-D BUFFER_SIZE=10000000`, ¿qué falla si el búfer es un `char buf[BUFFER_SIZE]` local?',
          'Un búfer local de 10 MB en get_next_line rompe el programa. ¿Por qué?',
        ],
        right: ['No cabe en la pila: hay que pedirlo con malloc'],
        wrong: [
          'read no admite leer tanto de una vez',
          'No compila: un array no puede ser tan grande',
          'Nada: la pila crece todo lo que haga falta',
        ],
      },
    ],
    wrong: [
      'read no admite leer tanto de una vez',
      'No compila: un array no puede ser tan grande',
      'Tarda mucho: read lee byte a byte',
    ],
    why: '-D define la macro al compilar; con 1 byte hay un read por carácter, y un búfer de 10 MB no cabe en la pila, que suele tener 8 MB.',
  },
  {
    id: 'gnl-last-line',
    topic: 'ficheros',
    needs: { projects: GNL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Un fichero acaba con una línea sin `\\n`. ¿Cómo la devuelve get_next_line?',
          'Si la última línea no lleva salto de línea, get_next_line la devuelve…',
        ],
        right: ['Tal cual, sin añadirle el salto'],
        wrong: [
          'Con un salto de línea añadido al final',
          'No la devuelve: devuelve NULL directamente',
          'Vacía: solo cuentan las líneas con \\n',
        ],
      },
      {
        ask: [
          'Tras devolver la última línea, ¿qué devuelve la siguiente llamada a get_next_line?',
          'Cuando ya no queda nada que leer, get_next_line devuelve…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`-1`'],
      },
      {
        ask: [
          '¿Cómo devuelve get_next_line una línea que sí acaba en salto de línea?',
          'Al leer una línea normal, con su salto, get_next_line devuelve…',
        ],
        right: ['La línea, con su \\n al final'],
        wrong: [
          'La línea, sin el \\n del final',
          'La línea y lo que sobró del búfer',
          'Solo el \\n, sin el texto',
        ],
      },
    ],
    wrong: [
      'Con un salto de línea añadido al final',
      'No la devuelve: devuelve NULL directamente',
      'La línea, sin el \\n del final',
    ],
    why: 'La línea se devuelve con su \\n si lo tiene (la última puede no tenerlo) y, cuando no queda nada, get_next_line devuelve NULL.',
  },
  {
    id: 'gnl-errors',
    topic: 'ficheros',
    needs: { projects: GNL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué tiene que devolver `get_next_line(-1)`?',
          'Con un descriptor que no vale, get_next_line devuelve…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`-1`', '`"(null)"`'],
      },
      {
        ask: [
          'Si read falla a mitad de una línea, ¿qué se hace con lo guardado en la static?',
          'read devuelve -1 y la static tiene texto a medias. ¿Qué toca hacer?',
        ],
        right: ['Liberarlo y devolver NULL'],
        wrong: [
          'Devolver lo leído hasta ahí',
          'Guardarlo para la siguiente llamada',
          'Llamar a exit con un error',
        ],
      },
    ],
    wrong: [
      'Devolver lo leído hasta ahí',
      'Guardarlo para la siguiente llamada',
      'Imprimir un error y seguir',
    ],
    why: 'Ante un error (fd malo o read que falla) get_next_line devuelve NULL, y liberar lo guardado evita la fuga.',
  },
  {
    id: 'gnl-bonus-fd',
    topic: 'ficheros',
    needs: { projects: GNL },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          'En el bonus, ¿qué hace falta para leer de varios fd a la vez?',
          'Para que get_next_line alterne entre varios ficheros sin mezclarlos, hay que…',
        ],
        right: ['Guardar lo sobrante de cada fd por separado'],
        wrong: [
          'Abrir los ficheros en el mismo orden siempre',
          'Leer cada fichero entero de una vez',
          'Usar lseek para volver atrás en cada fd',
          'Cerrar cada fd antes de pasar al siguiente',
        ],
      },
      {
        ask: [
          '¿Cuántas variables static permite el bonus de get_next_line?',
          'El bonus pide hacerlo con, como mucho, ¿cuántas static?',
        ],
        right: ['1'],
        wrong: ['2', '0', '3', '1024'],
      },
      {
        ask: [
          'Alternas llamadas con el fd 3 y el fd 4. ¿Qué devuelve cada una?',
          'En el bonus, si llamas con el fd 3, luego con el 4 y otra vez con el 3, cada llamada da…',
        ],
        right: ['La siguiente línea de ese fd, sin mezclas'],
        wrong: [
          'La siguiente línea del último fd que se abrió',
          'Siempre la primera línea de cada fichero',
          'Una línea que mezcla lo de los dos fd',
          'NULL: no se pueden mezclar descriptores',
        ],
      },
    ],
    wrong: [
      'Leer cada fichero entero de una vez',
      'Cerrar cada fd antes de pasar al siguiente',
      'Abrir los ficheros en el mismo orden siempre',
    ],
    why: 'Cada fd tiene su propio resto pendiente (por ejemplo, un array de restos indexado por fd), y el bonus lo pide con una sola static.',
  },
]
