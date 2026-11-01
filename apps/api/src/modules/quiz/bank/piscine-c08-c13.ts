/**
 * Banco de Not-games: la piscina, C 08 a C 13. Cabeceras y macros (C 08), la
 * libft de la piscina y el Makefile (C 09), ficheros (C 10), punteros a
 * función (C 11), listas enlazadas (C 12) y árboles binarios (C 13). Cada
 * concepto le sale a quien está en su módulo o ya ha pasado a uno de después.
 */

import { fromPiscine } from './piscine-steps.js'
import type { Concept } from './types.js'

const C08 = fromPiscine('c-piscine-c-08')
const C09 = fromPiscine('c-piscine-c-09')
const C10 = fromPiscine('c-piscine-c-10')
const C11 = fromPiscine('c-piscine-c-11')
const C12 = fromPiscine('c-piscine-c-12')
const C13 = fromPiscine('c-piscine-c-13')

export const PISCINE_C08_C13: readonly Concept[] = [
  // C 08: cabeceras, macros, typedef y struct.
  {
    id: 'pis-c08-include-guard',
    topic: 'cabeceras',
    needs: { projects: C08 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Para qué sirven `#ifndef FT_H`, `#define FT_H` y `#endif` alrededor de ft.h?',
          '¿Qué evita una guarda de inclusión en un fichero .h?',
        ],
        right: [
          'Que el contenido se incluya dos veces en el mismo .c',
          'Las definiciones repetidas si se incluye dos veces',
        ],
        wrong: [
          'Que ft.h se compile antes que los ficheros .c',
          'Que la norminette dé error con la cabecera',
          'Que FT_H se declare como variable global',
          'Que el compilador busque ft.h en otra carpeta',
        ],
      },
      {
        ask: [
          '¿Qué directiva cierra la guarda que abre `#ifndef FT_H`?',
          'Una guarda de inclusión empieza con `#ifndef`. ¿Con qué se cierra?',
        ],
        right: ['`#endif`'],
        wrong: ['`#undef FT_H`', '`#else`', '`#end`', '`#fi`'],
      },
    ],
    wrong: [
      'Que ft.h se compile antes que los ficheros .c',
      'Que la norminette dé error con la cabecera',
      'Que FT_H se declare como variable global',
    ],
    why: 'La primera vez se define FT_H y entra el contenido; la siguiente, #ifndef ya es falso y se salta hasta #endif.',
  },
  {
    id: 'pis-c08-header-content',
    topic: 'cabeceras',
    needs: { projects: C08 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué se pone en una cabecera como ft.h?',
          'En la piscina, ¿qué lleva un fichero .h?',
        ],
        right: [
          'Prototipos, macros y typedef, sin cuerpos de funciones',
          'Lo que otros .c necesitan conocer: prototipos y tipos',
        ],
        wrong: [
          'Los cuerpos de las funciones, para no repetirlos',
          'El main del programa, que lo incluyen todos',
          'Las variables locales de cada una de las funciones',
          'Los .o ya compilados, para enlazar más rápido',
        ],
      },
      {
        ask: [
          '¿Cómo se incluye desde un .c el ft.h que está en tu misma carpeta?',
          'Tu ft.h está junto a main.c. ¿Qué línea lo incluye?',
        ],
        right: ['`#include "ft.h"`'],
        wrong: ['`#import "ft.h"`', '`#include ft.h`', '`#define "ft.h"`', '`include "ft.h";`'],
      },
    ],
    wrong: [
      'Los cuerpos de las funciones, para no repetirlos',
      'El main del programa, que lo incluyen todos',
      'Los .o ya compilados, para enlazar más rápido',
    ],
    why: 'Un .h anuncia lo que existe (prototipos, macros, tipos) y se incluye con comillas si es tuyo; el código va en los .c.',
  },
  {
    id: 'pis-c08-macro-parens',
    topic: 'macros',
    needs: { projects: C08 },
    kind: 'long',
    level: 3,
    code: '#define DOUBLE(x) x + x\n\nint n = DOUBLE(3) * 2;',
    forms: [
      {
        ask: ['¿Cuánto vale `n`?', '¿Qué valor guarda `n` después de esta línea?'],
        right: ['9'],
        wrong: ['12', '6', '18', '8'],
      },
      {
        ask: [
          '¿Cómo se escribe DOUBLE para que dé lo que se espera?',
          '¿Qué versión de DOUBLE funciona en cualquier expresión?',
        ],
        right: ['`#define DOUBLE(x) ((x) + (x))`'],
        wrong: [
          '`#define DOUBLE(x) (x) + (x)`',
          '`#define DOUBLE(x) x + x;`',
          '`#define DOUBLE (x) (x + x)`',
          '`#define DOUBLE(x) {x + x}`',
        ],
      },
    ],
    wrong: ['12', '6', '18'],
    why: 'Una macro copia el texto tal cual: DOUBLE(3) * 2 queda 3 + 3 * 2, que es 9; con paréntesis en todo se evita.',
  },
  {
    id: 'pis-c08-abs-macro',
    topic: 'macros',
    needs: { projects: C08 },
    kind: 'long',
    level: 3,
    code: '#define ABS(Value) (Value < 0 ? -Value : Value)\n\nint n = ABS(2 - 5);',
    forms: [
      {
        ask: ['¿Qué valor acaba en `n`?', '¿Cuánto da `ABS(2 - 5)` con esta macro?'],
        right: ['-7'],
        wrong: ['3', '-3', '7', '0'],
      },
      {
        ask: ['¿Por qué no da 3?', '¿Qué hace que esta macro falle con `2 - 5`?'],
        right: [
          'Porque -Value queda -2 - 5: faltan paréntesis',
          'Porque el argumento no va entre paréntesis',
        ],
        wrong: [
          'Porque el ternario no se puede usar en macros',
          'Porque una macro no acepta expresiones',
          'Porque ABS solo sirve con constantes positivas',
          'Porque Value tiene que ir en minúsculas',
        ],
      },
    ],
    wrong: ['3', '-3', '7'],
    why: 'Sin paréntesis, -Value se expande a -2 - 5 = -7; ft_abs.h tiene que escribir ((Value) < 0 ? -(Value) : (Value)).',
  },
  {
    id: 'pis-c08-define-semicolon',
    topic: 'macros',
    needs: { projects: C08 },
    kind: 'long',
    level: 2,
    code: '#define SIZE 10;\n\nint tab[SIZE];',
    forms: [
      {
        ask: ['¿Qué pasa al compilar esto?', '¿Qué hace el compilador con este código?'],
        right: ['Da error: se expande a int tab[10;];', 'No compila: el ; entra en los corchetes'],
        wrong: [
          'Nada: el ; del #define se ignora',
          'Crea un array de 11 int, contando el ;',
          'Compila, pero -Wall avisa del ; de más',
          'Crea un array de 10 int sin problemas',
        ],
      },
    ],
    wrong: [
      'Nada: el ; del #define se ignora',
      'Crea un array de 11 int, contando el ;',
      'Compila, pero -Wall avisa del ; de más',
    ],
    why: 'El preprocesador pega todo lo que hay detrás del nombre, punto y coma incluido: un #define no lleva ;.',
  },
  {
    id: 'pis-c08-even-macro',
    topic: 'macros',
    needs: { projects: C08 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En ft_boolean.h, ¿qué tiene que dar `EVEN(nbr)`?',
          '¿Qué comprueba la macro `EVEN(nbr)` de ft_boolean.h?',
        ],
        right: ['Verdadero si nbr es par y falso si es impar', 'Si nbr es divisible entre 2'],
        wrong: [
          'El número par más cercano a nbr',
          'El valor de nbr multiplicado por 2',
          'Verdadero si nbr es positivo y falso si no',
          'El número de cifras pares que tiene nbr',
        ],
      },
      {
        ask: [
          '¿Qué escritura de `EVEN` es segura con cualquier argumento?',
          '¿Cuál de estas definiciones de EVEN no falla con `EVEN(n + 1)`?',
        ],
        right: ['`#define EVEN(nbr) ((nbr) % 2 == 0)`'],
        wrong: [
          '`#define EVEN(nbr) nbr % 2 == 0`',
          '`#define EVEN(nbr) (nbr % 2 == 0)`',
          '`#define EVEN(nbr) ((nbr) % 2 == 0);`',
          '`#define EVEN (nbr) ((nbr) % 2 == 0)`',
        ],
      },
    ],
    wrong: [
      'El número par más cercano a nbr',
      'El valor de nbr multiplicado por 2',
      'Verdadero si nbr es positivo y falso si no',
    ],
    why: 'EVEN es una condición (resto 0 al dividir entre 2), y cada nbr va entre paréntesis para que n + 1 no rompa la cuenta.',
  },
  {
    id: 'pis-c08-typedef-struct',
    topic: 'estructuras',
    needs: { projects: C08 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué permite `typedef struct s_point t_point;` en ft_point.h?',
          'Con el typedef de ft_point.h, ¿qué se gana?',
        ],
        right: [
          'Escribir t_point en lugar de struct s_point',
          'Dar a struct s_point un nombre más corto',
        ],
        wrong: [
          'Crear una variable global que se llama t_point',
          'Reservar memoria para un s_point al compilar',
          'Que t_point sea un puntero a struct s_point',
          'Copiar la struct cada vez que se pasa a una función',
        ],
      },
      {
        ask: [
          'Según la norma de 42, ¿qué prefijo lleva el nombre de un typedef?',
          'En la norma, ¿cómo empieza el nombre de un tipo creado con typedef?',
        ],
        right: ['`t_`'],
        wrong: ['`s_`', '`g_`', '`ft_`', '`u_`'],
      },
    ],
    wrong: [
      'Crear una variable global que se llama t_point',
      'Reservar memoria para un s_point al compilar',
      'Que t_point sea un puntero a struct s_point',
    ],
    why: 'typedef da otro nombre a un tipo que ya existe; la norma pide s_ para las struct y t_ para los typedef.',
  },
  {
    id: 'pis-c08-arrow',
    topic: 'estructuras',
    needs: { projects: C08 },
    kind: 'long',
    level: 2,
    code: 't_point p;\nt_point *ptr;\n\nptr = &p;\nptr.x = 42;',
    forms: [
      {
        ask: ['¿Qué falla en este código?', '¿Por qué no compila la última línea?'],
        right: [
          'ptr es un puntero: hay que escribir ptr->x',
          'Con un puntero a struct se usa -> y no el punto',
        ],
        wrong: [
          'Falta reservar p con malloc antes de usarlo',
          'Los campos de una struct no se pueden cambiar',
          'x tendría que ser un char para guardar 42',
          'Hay que escribir *ptr.x para llegar a x',
        ],
      },
      {
        ask: [
          'Sin la flecha, ¿cómo se llega al campo x a través del puntero?',
          '¿Cómo se escribe el acceso con flecha usando el asterisco y el punto?',
        ],
        right: ['`(*ptr).x`'],
        wrong: ['`*ptr.x`', '`&ptr.x`', '`ptr.x`', '`*(ptr.x)`'],
      },
    ],
    wrong: [
      'Falta reservar p con malloc antes de usarlo',
      'Los campos de una struct no se pueden cambiar',
      'x tendría que ser un char para guardar 42',
    ],
    why: 'El punto es para una struct; con un puntero se usa ptr->x, que es (*ptr).x (el punto pesa más que el asterisco).',
  },
  {
    id: 'pis-c08-stock-str',
    topic: 'estructuras',
    needs: { projects: C08 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En ft_strs_to_tab, ¿cómo se marca el final del array de t_stock_str?',
          '¿Cómo sabe ft_show_tab dónde acaba el array que da ft_strs_to_tab?',
        ],
        right: [
          'Con un último elemento cuyo str vale 0',
          'Por un elemento final con el puntero str a 0',
        ],
        wrong: [
          'Con un último elemento cuyo size vale -1',
          'Con un elemento cuyo copy apunta a su str',
          "Con un '\\0' justo después del último elemento",
          'No se marca: el tamaño va en el primero',
        ],
      },
      {
        ask: [
          '¿Qué tiene que guardar `copy` en cada t_stock_str?',
          'En struct s_stock_str, ¿qué es el campo copy?',
        ],
        right: [
          'Una copia nueva de la cadena, con su propio malloc',
          'Un duplicado de av[i] en memoria reservada aparte',
        ],
        wrong: [
          'El mismo puntero que str, que apunta a av[i]',
          "El tamaño de la cadena, sin contar el '\\0'",
          'La cadena al revés, para que la use ft_show_tab',
          'La dirección del siguiente t_stock_str del array',
        ],
      },
    ],
    wrong: [
      'Con un último elemento cuyo size vale -1',
      'Con un elemento cuyo copy apunta a su str',
      'No se marca: el tamaño va en el primero',
    ],
    why: 'Cada t_stock_str guarda size, str (la cadena de av) y copy (un duplicado); un str a 0 cierra el array.',
  },

  // C 09: la libft de la piscina, ar y el Makefile.
  {
    id: 'pis-c09-ar-rc',
    topic: 'compilación',
    needs: { projects: C09 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué orden crea la biblioteca estática libft.a con los .o?',
          'En libft_creator.sh, ¿con qué se juntan los .o en libft.a?',
        ],
        right: ['`ar rc libft.a *.o`'],
        wrong: [
          '`cc -o libft.a *.o`',
          '`ranlib libft.a *.c`',
          '`cc -c libft.a *.o`',
          '`tar cf libft.a *.o`',
        ],
      },
      {
        ask: ['¿Qué es un fichero .a como libft.a?', '¿Qué hay dentro de una biblioteca estática?'],
        right: [
          'Un archivo que junta varios ficheros objeto',
          'Ficheros .o empaquetados para enlazarlos',
        ],
        wrong: [
          'Un ejecutable que todavía no tiene main',
          'Una cabecera con los prototipos ya compilada',
          'Un fichero de texto con la lista de los .c',
          'Los .c comprimidos para entregarlos por git',
        ],
      },
    ],
    wrong: ['`cc -o libft.a *.o`', '`ranlib libft.a *.c`', '`cc -c libft.a *.o`'],
    why: 'ar junta ficheros objeto en un archivo (.a): r los mete o reemplaza y c lo crea sin avisar si no existía.',
  },
  {
    id: 'pis-c09-cc-c',
    topic: 'compilación',
    needs: { projects: C09 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué hace la opción `-c` de cc?',
          '¿Qué sale de `cc -Wall -Wextra -Werror -c ft_putchar.c`?',
        ],
        right: [
          'Compila a un .o sin enlazar ni crear ejecutable',
          'Un ft_putchar.o, sin enlazar con nada',
        ],
        wrong: [
          'Compila y ejecuta el programa en el momento',
          'Comprueba la norma antes de compilar',
          'Compila todos los .c que hay en la carpeta',
          'Un ejecutable llamado c en la carpeta actual',
        ],
      },
    ],
    wrong: [
      'Compila y ejecuta el programa en el momento',
      'Comprueba la norma antes de compilar',
      'Compila todos los .c que hay en la carpeta',
    ],
    why: 'Con -c el compilador para tras crear el fichero objeto (.o); los .o se juntan después con ar o se enlazan.',
  },
  {
    id: 'pis-c09-link-lft',
    topic: 'compilación',
    needs: { projects: C09 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Con libft.a en la carpeta actual, ¿cómo se compila main.c con ella?',
          '¿Qué orden enlaza main.c con la libft.a que está aquí mismo?',
        ],
        right: ['`cc main.c -L. -lft`'],
        wrong: [
          '`cc main.c -L. -llibft`',
          '`cc main.c -I. -lft.a`',
          '`cc main.c -lft`',
          '`cc main.c -L libft.h`',
        ],
      },
      {
        ask: [
          '¿Qué fichero busca el enlazador con `-lft`?',
          'Con la opción `-lft`, ¿cómo se llama la biblioteca que se busca?',
        ],
        right: ['libft.a'],
        wrong: ['ft.a', 'lft.a', 'libft.h', 'ft.o'],
      },
    ],
    wrong: ['`cc main.c -L. -llibft`', '`cc main.c -I. -lft.a`', '`cc main.c -lft`'],
    why: '-L dice en qué carpeta buscar y -lft busca libft.a: el enlazador añade lib delante y .a detrás.',
  },
  {
    id: 'pis-c09-make-default',
    topic: 'makefile',
    needs: { projects: C09 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Si escribes solo `make`, ¿qué regla se ejecuta?',
          '¿Qué hace `make` sin decirle ninguna regla?',
        ],
        right: ['La primera regla del Makefile', 'Ejecuta la primera regla que encuentra'],
        wrong: [
          'Siempre la regla all, esté donde esté',
          'La última regla del Makefile',
          'La regla re, que lo rehace todo',
          'Todas las reglas, una detrás de otra',
        ],
      },
    ],
    wrong: [
      'Siempre la regla all, esté donde esté',
      'La última regla del Makefile',
      'La regla re, que lo rehace todo',
    ],
    why: 'make sin argumentos ejecuta la primera regla del fichero: por eso all va arriba del todo.',
  },
  {
    id: 'pis-c09-clean-fclean',
    topic: 'makefile',
    needs: { projects: C09 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué diferencia hay entre `make clean` y `make fclean`?',
          '¿Qué borra `fclean` que no borre `clean`?',
        ],
        right: [
          'fclean borra además la biblioteca o el binario',
          'También el fichero final, $(NAME), y no solo los .o',
        ],
        wrong: [
          'clean borra además la biblioteca o el binario',
          'fclean solo borra los .o de la carpeta srcs',
          'fclean vuelve a compilar después de borrar',
          'Ninguna: fclean es otro nombre de clean',
        ],
      },
      {
        ask: ['¿Qué hace la regla `re`?', 'En un Makefile de 42, ¿para qué sirve `make re`?'],
        right: [
          'fclean y después all: lo rehace todo desde cero',
          'Lo borra todo y vuelve a compilarlo entero',
        ],
        wrong: [
          'Recompila solo los .c que han cambiado',
          'Vuelve a ejecutar la última regla que se usó',
          'Borra los .o y deja el binario como estaba',
          'Revisa la norma de todos los ficheros',
        ],
      },
    ],
    wrong: [
      'clean borra además la biblioteca o el binario',
      'fclean solo borra los .o de la carpeta srcs',
      'fclean vuelve a compilar después de borrar',
    ],
    why: 'clean quita los .o; fclean, los .o y $(NAME); re hace fclean y luego all.',
  },
  {
    id: 'pis-c09-relink',
    topic: 'makefile',
    needs: { projects: C09 },
    kind: 'long',
    level: 3,
    code: 'NAME = libft.a\n\nall:\n\tcc -Wall -Wextra -Werror -c *.c\n\tar rc $(NAME) *.o',
    forms: [
      {
        ask: ['¿Qué falla en este Makefile?', '¿Qué problema tiene esta regla all?'],
        right: [
          'all no depende de $(NAME): rehace libft.a cada vez',
          'Vuelve a compilar y enlazar aunque nada haya cambiado',
        ],
        wrong: [
          'Falta llamar a ranlib justo después de ar rc',
          '-Werror no deja crear una biblioteca estática',
          'NAME tendría que escribirse en minúsculas',
          'Una regla no puede tener dos órdenes seguidas',
        ],
      },
      {
        ask: [
          '¿Qué pasa si escribes `make` dos veces seguidas?',
          'Tras un primer `make`, ¿qué hace el segundo?',
        ],
        right: [
          'Vuelve a compilar y a crear libft.a otra vez',
          'Lo repite todo, aunque nada haya cambiado',
        ],
        wrong: [
          'Dice que no hay nada que hacer y termina',
          'Falla porque libft.a ya existe en la carpeta',
          'Solo ejecuta ar rc, sin volver a compilar',
          'Borra libft.a y termina sin compilar nada',
        ],
      },
    ],
    wrong: [
      'Falta llamar a ranlib justo después de ar rc',
      '-Werror no deja crear una biblioteca estática',
      'NAME tendría que escribirse en minúsculas',
    ],
    why: 'all no es un fichero y no depende de nada: make lo ejecuta siempre; con all: $(NAME) y $(NAME): $(OBJS) solo rehace lo cambiado.',
  },
  {
    id: 'pis-c09-make-vars',
    topic: 'makefile',
    needs: { projects: C09 },
    kind: 'long',
    level: 1,
    code: 'NAME = libft.a\nSRCS = ft_putchar.c ft_swap.c ft_strlen.c',
    forms: [
      {
        ask: [
          '¿Cómo se pone en una regla el valor de la primera variable?',
          'Dentro de una regla, ¿cómo se escribe el valor de la variable de la primera línea?',
        ],
        right: ['`$(NAME)`'],
        wrong: ['`$NAME`', '`%NAME%`', '`@NAME`', '`$[NAME]`'],
      },
    ],
    wrong: ['`$NAME`', '`%NAME%`', '`@NAME`'],
    why: 'En make una variable se lee con $(NOMBRE); $NAME se leería como la variable N seguida de AME.',
  },
  {
    id: 'pis-c09-include-flag',
    topic: 'compilación',
    needs: { projects: C09 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Para qué sirve `-I includes` al compilar?',
          'Tus .h están en la carpeta includes. ¿Qué le dice `-I includes` a cc?',
        ],
        right: [
          'Que busque las cabeceras también en includes/',
          'Dónde encontrar los .h que pone #include',
        ],
        wrong: [
          'Que meta todos los .c de la carpeta includes',
          'Que deje el ejecutable dentro de includes/',
          'Que enlace las bibliotecas que hay en includes/',
          'Que no compile los ficheros de includes/',
        ],
      },
    ],
    wrong: [
      'Que meta todos los .c de la carpeta includes',
      'Que deje el ejecutable dentro de includes/',
      'Que enlace las bibliotecas que hay en includes/',
    ],
    why: '-I añade una carpeta a las que se buscan los .h; las bibliotecas se buscan con -L.',
  },
  {
    id: 'pis-c09-split',
    topic: 'cadenas',
    needs: { projects: C09 },
    kind: 'long',
    level: 3,
    code: 'char **words = ft_split("  hola,,42 piscina ", " ,");',
    forms: [
      {
        ask: [
          '¿Cuántas palabras hay en words antes del final?',
          '¿Cuántas cadenas devuelve esta llamada, sin contar el final?',
        ],
        right: ['3'],
        wrong: ['5', '4', '6', '2'],
      },
      {
        ask: ['¿Cómo acaba el array que devuelve ft_split?', '¿Qué marca el final de words?'],
        right: [
          'Con un puntero a 0 después de la última palabra',
          'Con una casilla final que vale 0 (NULL)',
        ],
        wrong: [
          'Con una cadena vacía después de la última palabra',
          'Con el número de palabras en la primera casilla',
          "Con el '\\0' de la última palabra, y nada más",
          'Con el charset copiado en la última casilla',
        ],
      },
    ],
    wrong: ['5', '4', '6'],
    why: 'Cualquier carácter del charset separa y los separadores seguidos no crean palabras vacías; un puntero a 0 cierra el array.',
  },

  // C 10: ficheros con open, read, write y close.
  {
    id: 'pis-c10-display-file-errors',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué escribe display_file si no le pasas ningún argumento?',
          'Lanzas `./ft_display_file` sin nada. ¿Qué mensaje sale?',
        ],
        right: ['File name missing.'],
        wrong: ['Too many arguments.', 'Cannot read file.', 'No such file or directory.'],
      },
      {
        ask: [
          '¿Qué escribe display_file si le pasas dos ficheros?',
          'Lanzas `./ft_display_file a b`. ¿Qué mensaje sale?',
        ],
        right: ['Too many arguments.'],
        wrong: ['File name missing.', 'Cannot read file.', 'Usage: ft_display_file file'],
      },
      {
        ask: [
          '¿Qué escribe display_file si el fichero no se puede abrir?',
          'Lanzas display_file con un fichero que no existe. ¿Qué mensaje sale?',
        ],
        right: ['Cannot read file.'],
        wrong: ['File name missing.', 'Too many arguments.', 'Segmentation fault'],
      },
    ],
    wrong: ['No such file or directory.', 'Permission denied.', 'Bad file descriptor.'],
    why: 'El enunciado da los tres mensajes: sin fichero, File name missing.; con más de uno, Too many arguments.; si falla, Cannot read file.',
  },
  {
    id: 'pis-c10-stderr',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Por qué los mensajes de error van al fd 2 y no al 1?',
          '¿Qué se gana escribiendo los errores en la salida de error?',
        ],
        right: [
          'Que no se mezclen con la salida si se redirige',
          'Que se vean aunque la salida vaya a un fichero',
        ],
        wrong: [
          'Que el fd 1 solo admite números, no texto',
          'Que write falla si escribe texto en el fd 1',
          'Que el fd 2 se escribe más rápido que el 1',
          'Que así el programa termina con un error',
        ],
      },
      {
        ask: [
          'Si haces `./ft_cat noexiste > out.txt`, ¿dónde sale el error?',
          'Con la salida redirigida a out.txt, ¿dónde aparece el error de ft_cat?',
        ],
        right: [
          'En la terminal: > solo redirige la salida estándar',
          'En pantalla, porque va al fd 2 y no al 1',
        ],
        wrong: [
          'Dentro de out.txt, junto con la salida normal',
          'En ningún sitio: la redirección lo descarta',
          'En un fichero out.txt.err que se crea aparte',
          'Al principio de out.txt, antes de la salida',
        ],
      },
    ],
    wrong: [
      'Que el fd 1 solo admite números, no texto',
      'Que write falla si escribe texto en el fd 1',
      'Que el fd 2 se escribe más rápido que el 1',
    ],
    why: '> solo cambia el fd 1: lo que va al 2 (stderr) sigue saliendo por la terminal y no ensucia la salida.',
  },
  {
    id: 'pis-c10-open-fail',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'long',
    level: 2,
    code: 'fd = open(argv[1], O_RDONLY);\nif (fd == 0)\n{\n    write(2, "Cannot read file.\\n", 18);\n    return (1);\n}',
    forms: [
      {
        ask: ['¿Qué falla en este código?', '¿Por qué no detecta un fichero que no existe?'],
        right: ['open devuelve -1 al fallar, no 0', 'El error de open es -1: hay que mirar fd < 0'],
        wrong: [
          'O_RDONLY no deja abrir ficheros de texto',
          'Hay que llamar a read antes de mirar fd',
          'open da 0 a los ficheros que no existen',
          'El mensaje de error tiene que ir al fd 1',
        ],
      },
      {
        ask: [
          '¿Qué cabecera trae el prototipo de `open` y sus flags?',
          'Para usar `open` con O_RDONLY, ¿qué hay que incluir?',
        ],
        right: ['`<fcntl.h>`'],
        wrong: ['`<unistd.h>`', '`<stdio.h>`', '`<stdlib.h>`', '`<string.h>`'],
      },
    ],
    wrong: [
      'O_RDONLY no deja abrir ficheros de texto',
      'Hay que llamar a read antes de mirar fd',
      'open da 0 a los ficheros que no existen',
    ],
    why: 'open devuelve un descriptor (3 o más, normalmente) o -1 si falla; 0 es la entrada estándar. Su prototipo está en fcntl.h.',
  },
  {
    id: 'pis-c10-read-loop',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'long',
    level: 3,
    code: 'n = read(fd, buf, 4096);\nwhile (n > 0)\n{\n    write(1, buf, 4096);\n    n = read(fd, buf, 4096);\n}',
    forms: [
      {
        ask: ['¿Qué falla en este bucle?', 'Con un fichero de 10 bytes, ¿qué va mal?'],
        right: [
          'Escribe 4096 bytes aunque read haya leído menos',
          'Saca basura: escribe más de lo que se ha leído',
        ],
        wrong: [
          'read no puede leer más de 1024 bytes cada vez',
          'El bucle tendría que seguir mientras n >= 0',
          'buf tiene que reservarse antes con malloc',
          'Hay que cerrar fd dentro del bucle, cada vez',
        ],
      },
      {
        ask: [
          '¿Qué tamaño hay que pasar a write?',
          'Para no escribir de más, ¿qué va como tercer argumento de write?',
        ],
        right: ['`n`'],
        wrong: ['`4096`', '`sizeof(buf) - 1`', '`ft_strlen(buf)`', '`n + 1`'],
      },
    ],
    wrong: [
      'read no puede leer más de 1024 bytes cada vez',
      'El bucle tendría que seguir mientras n >= 0',
      'buf tiene que reservarse antes con malloc',
    ],
    why: 'read dice cuántos bytes ha leído: se escriben esos n; buf no acaba en \\0, así que strlen tampoco sirve.',
  },
  {
    id: 'pis-c10-cat-stdin',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué hace ft_cat si no le pasas ningún fichero?',
          'Como cat, ¿qué hace `./ft_cat` sin argumentos?',
        ],
        right: [
          'Lee de la entrada estándar y lo escribe',
          'Copia lo que le llega por el fd 0 a la salida',
        ],
        wrong: [
          'Escribe File name missing. y termina',
          'No hace nada y devuelve 0 enseguida',
          'Espera a que alguien cree un fichero',
          'Lee el último fichero que se abrió',
        ],
      },
      {
        ask: [
          '¿Qué función da el texto de un error como «No such file or directory»?',
          'Para escribir el motivo del error en ft_cat, ¿qué se usa?',
        ],
        right: ['`strerror(errno)`'],
        wrong: ['`perror(errno)`', '`errno(strerror)`', '`write(2, errno, 4)`', '`printf(errno)`'],
      },
    ],
    wrong: [
      'Escribe File name missing. y termina',
      'No hace nada y devuelve 0 enseguida',
      'Espera a que alguien cree un fichero',
    ],
    why: 'Sin ficheros, cat lee del fd 0; cuando algo falla, errno guarda el motivo y strerror lo da como texto.',
  },
  {
    id: 'pis-c10-tail-c',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué muestra `ft_tail -c 5 fichero`?', 'Con la opción -c 5, ¿qué enseña ft_tail?'],
        right: ['Los últimos 5 bytes del fichero', 'Solo el final: sus 5 últimos bytes'],
        wrong: [
          'Las últimas 5 líneas del fichero',
          'Los primeros 5 bytes del fichero',
          'Todo menos los últimos 5 bytes',
          'El fichero entero, 5 veces seguidas',
        ],
      },
      {
        ask: [
          'Si el fichero contiene `abcdefgh`, sin salto final, ¿qué imprime `ft_tail -c 3`?',
          '¿Qué saca `ft_tail -c 3` de un fichero que solo tiene `abcdefgh`?',
        ],
        right: ['fgh'],
        wrong: ['abc', 'efgh', 'defgh', 'gh'],
      },
    ],
    wrong: [
      'Las últimas 5 líneas del fichero',
      'Los primeros 5 bytes del fichero',
      'Todo menos los últimos 5 bytes',
    ],
    why: 'tail -c N cuenta bytes (no líneas) desde el final: enseña los N últimos.',
  },
  {
    id: 'pis-c10-hexdump',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo escribe `hexdump -C` el carácter A en la columna hexadecimal?',
          'En la salida de `hexdump -C`, ¿qué se ve por cada A del fichero?',
        ],
        right: ['41'],
        wrong: ['65', '101', '10', '14'],
      },
      {
        ask: [
          '¿Cuántos bytes enseña `hexdump -C` en cada línea?',
          'Con -C, ¿cuántos bytes del fichero caben en una línea completa?',
        ],
        right: ['16'],
        wrong: ['8', '32', '10', '64'],
      },
      {
        ask: [
          '¿Qué sale a la derecha de cada línea de `hexdump -C`?',
          'Con -C, ¿qué hay entre las barras | | al final de la línea?',
        ],
        right: [
          'Los bytes como texto, con un punto si no se ven',
          'Los caracteres que se pueden imprimir, y . el resto',
        ],
        wrong: [
          'La suma de comprobación de la línea, en hexadecimal',
          'Los mismos bytes escritos en octal',
          'El número de línea, contado en decimal',
          'El tamaño del fichero hasta esa línea',
        ],
      },
    ],
    wrong: ['65', '101', '10'],
    why: "'A' es 65, que en hexadecimal es 41; -C pone el desplazamiento, 16 bytes en hexadecimal y su texto entre | |.",
  },
  {
    id: 'pis-c10-basename',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Para qué usa ft_cat basename con argv[0] en sus errores?',
          'En un error de ft_cat, ¿qué se saca de `basename(argv[0])`?',
        ],
        right: [
          'El nombre del programa, sin la ruta, para el error',
          'ft_cat, aunque se lanzara como ./ft_cat',
        ],
        wrong: [
          'La carpeta en la que está el fichero leído',
          'El nombre del fichero sin su extensión',
          'Si argv[0] es un fichero que se puede leer',
          'El número de argumentos que se le pasaron',
        ],
      },
    ],
    wrong: [
      'La carpeta en la que está el fichero leído',
      'El nombre del fichero sin su extensión',
      'Si argv[0] es un fichero que se puede leer',
    ],
    why: 'Como cat, el error empieza por el nombre del programa: basename quita la ruta de argv[0] (./ft_cat da ft_cat).',
  },
  {
    id: 'pis-c10-close',
    topic: 'ficheros',
    needs: { projects: C10 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Por qué hay que hacer `close(fd)` al terminar de leer?',
          '¿Qué se gana cerrando un fichero que solo se ha leído?',
        ],
        right: [
          'Liberar el descriptor: hay un máximo abiertos a la vez',
          'Devolver el fd al sistema para que se pueda reutilizar',
        ],
        wrong: [
          'Que se guarden en el disco los cambios de la lectura',
          'Borrar el fichero cuando ya no hace falta',
          'Que read vuelva al principio del fichero',
          'Que el contenido leído se borre de buf',
        ],
      },
    ],
    wrong: [
      'Que se guarden en el disco los cambios de la lectura',
      'Borrar el fichero cuando ya no hace falta',
      'Que read vuelva al principio del fichero',
    ],
    why: 'Cada fichero abierto ocupa un descriptor y un proceso tiene un número limitado; close lo libera.',
  },

  // C 11: punteros a función.
  {
    id: 'pis-c11-fptr-syntax',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cómo se declara f, un puntero a una función que recibe un int y devuelve un int?',
          'En ft_map, el parámetro f apunta a una función de int a int. ¿Cómo se escribe?',
        ],
        right: ['`int (*f)(int)`'],
        wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`', '`int f*(int)`'],
      },
      {
        ask: ['¿Qué declara `int *f(int)`?', 'Sin paréntesis alrededor de `*f`, ¿qué es f?'],
        right: [
          'Una función que recibe un int y devuelve un int *',
          'Una función normal que devuelve un puntero a int',
        ],
        wrong: [
          'Un puntero a una función que recibe y devuelve int',
          'Un array de punteros a int, de tamaño int',
          'Un puntero a int llamado f, y nada más',
          'Un puntero a función que devuelve un int *',
        ],
      },
    ],
    wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`'],
    why: 'Los paréntesis de (*f) hacen de f un puntero; sin ellos, el * se pega al tipo de vuelta y f es una función.',
  },
  {
    id: 'pis-c11-foreach',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'long',
    level: 2,
    code: 'int tab[] = {4, 2, 1};\n\nft_foreach(tab, 3, &ft_putnbr);',
    forms: [
      {
        ask: ['¿Qué imprime esta llamada?', '¿Qué sale por pantalla?'],
        right: ['421'],
        wrong: ['124', '4', '7', '3'],
      },
      {
        ask: [
          '¿Qué hace ft_foreach con la función que recibe?',
          'En ft_foreach, ¿con qué se llama a f?',
        ],
        right: [
          'La llama con cada elemento de tab, en orden',
          'Una vez por elemento, pasándole tab[i]',
        ],
        wrong: [
          'La llama una sola vez, con el array entero',
          'Crea un array nuevo con lo que devuelve f',
          'Cuenta los elementos para los que f da 1',
          'La llama con cada índice i, no con tab[i]',
        ],
      },
    ],
    wrong: ['124', '4', '7'],
    why: 'ft_foreach llama a f(tab[i]) para cada i de 0 a length - 1: ft_putnbr escribe 4, 2 y 1 sin separar.',
  },
  {
    id: 'pis-c11-map',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué devuelve ft_map?', '¿Qué sale de `ft_map(tab, length, &f)`?'],
        right: [
          'Un array nuevo con lo que da f para cada elemento',
          'Otro array de int, con f aplicada a cada uno',
        ],
        wrong: [
          'El mismo tab, cambiado en su sitio por f',
          'La suma de lo que devuelve f con cada elemento',
          'El número de elementos para los que f da 1',
          'El último valor que ha devuelto la función f',
        ],
      },
      {
        ask: [
          '¿Por qué ft_map necesita malloc y ft_foreach no?',
          '¿Qué obliga a ft_map a reservar memoria?',
        ],
        right: [
          'Devuelve un array nuevo, que tiene que seguir vivo',
          'Los resultados van en un array que sobrevive a la función',
        ],
        wrong: [
          'f puede devolver un número negativo',
          'ft_foreach no puede usar punteros a función',
          'length puede ser mayor que el propio array',
          'Sin malloc no se puede llamar a la función f',
        ],
      },
    ],
    wrong: [
      'El mismo tab, cambiado en su sitio por f',
      'La suma de lo que devuelve f con cada elemento',
      'El número de elementos para los que f da 1',
    ],
    why: 'ft_map no toca tab: reserva un int * de length y guarda f(tab[i]) en cada casilla, y eso tiene que vivir tras volver.',
  },
  {
    id: 'pis-c11-count-if',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'long',
    level: 2,
    code: 'int is_long(char *s)\n{\n    return (ft_strlen(s) > 3);\n}\n\nchar *tab[] = {"42", "piscina", "C", "norma", 0};\n\nft_count_if(tab, 4, &is_long);',
    forms: [
      {
        ask: ['¿Qué devuelve esta llamada?', '¿Cuánto da ft_count_if aquí?'],
        right: ['2'],
        wrong: ['4', '1', '3', '0'],
      },
    ],
    wrong: ['4', '1', '3'],
    why: 'ft_count_if cuenta los elementos con los que f no da 0: piscina y norma tienen más de 3 letras.',
  },
  {
    id: 'pis-c11-any',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué devuelve ft_any?', '¿Cuándo devuelve 1 `ft_any(tab, &f)`?'],
        right: [
          '1 si f no da 0 con alguno de los elementos, si no 0',
          'Si al menos un elemento hace que f no dé 0',
        ],
        wrong: [
          '1 solo si f da 1 con todos los elementos, si no 0',
          'El número de elementos con los que f no da 0',
          'La posición del primer elemento que cumple f',
          'Si f da 0 con al menos uno de los elementos',
        ],
      },
      {
        ask: [
          '¿Cómo sabe ft_any dónde acaba tab, si no recibe su tamaño?',
          'ft_any no tiene length. ¿Qué marca el final de tab?',
        ],
        right: ['Un último puntero que vale 0', 'Que el último elemento es NULL'],
        wrong: [
          'Que tab siempre tiene 10 elementos',
          "El '\\0' de la última cadena",
          'Llamando a sizeof(tab) dentro',
          'Que la última cadena está vacía',
        ],
      },
    ],
    wrong: [
      '1 solo si f da 1 con todos los elementos, si no 0',
      'El número de elementos con los que f no da 0',
      'La posición del primer elemento que cumple f',
    ],
    why: 'ft_any recorre tab hasta el puntero a 0 y devuelve 1 en cuanto f da algo distinto de 0; si ninguno, 0.',
  },
  {
    id: 'pis-c11-is-sort',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'long',
    level: 3,
    code: 'int cmp(int a, int b)\n{\n    return (a - b);\n}\n\nint tab[] = {1, 3, 3, 7};\n\nft_is_sort(tab, 4, &cmp);',
    forms: [
      {
        ask: ['¿Qué devuelve esta llamada?', '¿Cuánto da ft_is_sort con este tab?'],
        right: ['1'],
        wrong: ['0', '4', '-1', '3'],
      },
      {
        ask: [
          'En ft_is_sort, ¿qué tiene que devolver f(a, b) si a es menor que b?',
          'Como strcmp, ¿qué da la función de comparación cuando el primero es menor?',
        ],
        right: ['Un número negativo', 'Algo menor que 0'],
        wrong: ['Un número positivo', 'Siempre 1', 'El menor de los dos', 'Siempre 0'],
      },
    ],
    wrong: ['0', '4', '-1'],
    why: 'f da negativo, 0 o positivo como strcmp; 1, 3, 3, 7 está ordenado (dos iguales seguidos no lo rompen), así que da 1.',
  },
  {
    id: 'pis-c11-do-op',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué imprime `./do-op 42 / 0`?', 'En do-op, ¿qué sale al dividir entre 0?'],
        right: ['Stop : division by zero'],
        wrong: [
          'Stop : modulo by zero',
          'Error : division by zero',
          'Floating point exception',
          'Stop : divide by zero',
        ],
      },
      {
        ask: ['¿Qué imprime `./do-op 10 % 0`?', 'En do-op, ¿qué sale con el módulo entre 0?'],
        right: ['Stop : modulo by zero'],
        wrong: [
          'Stop : division by zero',
          'Error : modulo by zero',
          'Floating point exception',
          'Stop : mod by zero',
        ],
      },
      {
        ask: [
          '¿Qué imprime `./do-op 5 x 3`?',
          'Si el operador no es + - * / %, ¿qué imprime do-op?',
        ],
        right: ['0'],
        wrong: ['15', '8', '-1', '53'],
      },
    ],
    wrong: ['Error : division by zero', 'Floating point exception', 'Stop : divide by zero'],
    why: 'do-op elige la operación con un array de punteros a función; el enunciado fija los dos Stop y un 0 si el operador no vale.',
  },
  {
    id: 'pis-c11-fptr-array',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'long',
    level: 3,
    code: 'int (*ops[2])(int, int);\n\nops[0] = &ft_add;\nops[1] = &ft_sub;\nprintf("%d\\n", ops[1](10, 4));',
    forms: [
      {
        ask: ['¿Qué imprime este código?', '¿Cuál es la salida, si ft_sub resta?'],
        right: ['6'],
        wrong: ['14', '4', '10', '-6'],
      },
      {
        ask: ['¿Qué es `ops`?', '¿Qué declara la primera línea?'],
        right: [
          'Un array de 2 punteros a función de dos int',
          'Dos punteros a funciones que reciben dos int',
        ],
        wrong: [
          'Una función que devuelve un array de 2 int',
          'Un puntero a un array de 2 int, sin más',
          'Un array de 2 int iniciado con dos sumas',
          'Una función que recibe 2 int y un array',
        ],
      },
    ],
    wrong: ['14', '4', '10'],
    why: 'ops[i] es un puntero a función: ops[1](10, 4) llama a ft_sub(10, 4), que da 6.',
  },
  {
    id: 'pis-c11-advanced-sort',
    topic: 'punteros a función',
    needs: { projects: C11 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué cambia ft_advanced_sort_string_tab respecto a ft_sort_string_tab?',
          '¿Qué tiene de más la versión advanced del ordenado de cadenas?',
        ],
        right: [
          'Ordena según la función cmp que recibe',
          'El criterio de orden lo da un puntero a función',
        ],
        wrong: [
          'Ordena de mayor a menor en vez de al revés',
          'Devuelve un array nuevo en vez de cambiar tab',
          'Ordena también las letras dentro de cada cadena',
          'Quita las cadenas repetidas después de ordenar',
        ],
      },
      {
        ask: [
          'Si a ft_advanced_sort_string_tab le pasas ft_strcmp, ¿qué orden sale?',
          'Con ft_strcmp como cmp, ¿cómo queda tab?',
        ],
        right: [
          'Por orden ASCII, como con ft_sort_string_tab',
          'De menor a mayor según los códigos ASCII',
        ],
        wrong: [
          'Por longitud, de la más corta a la más larga',
          'Al revés del orden ASCII, de mayor a menor',
          'Igual que estaba: ft_strcmp no ordena',
          'Por orden alfabético, sin mirar mayúsculas',
        ],
      },
    ],
    wrong: [
      'Ordena de mayor a menor en vez de al revés',
      'Devuelve un array nuevo en vez de cambiar tab',
      'Ordena también las letras dentro de cada cadena',
    ],
    why: 'La versión advanced compara con cmp(a, b) en lugar de fijar el orden ASCII; con ft_strcmp hace lo mismo que la otra.',
  },

  // C 12: listas enlazadas con t_list.
  {
    id: 'pis-c12-create-elem',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 2,
    code: 't_list *ft_create_elem(void *data)\n{\n    t_list *elem;\n\n    elem = malloc(sizeof(t_list));\n    elem->data = data;\n    return (elem);\n}',
    forms: [
      {
        ask: ['¿Qué le falta a este ft_create_elem?', '¿Qué hay que añadir a esta función?'],
        right: [
          'Poner elem->next a NULL y mirar si malloc falló',
          'Comprobar elem y dejar next a NULL',
        ],
        wrong: [
          'Copiar data con malloc antes de guardarlo',
          'Liberar elem antes de devolverlo',
          'Reservar sizeof(t_list *) y no sizeof(t_list)',
          'Devolver &elem en lugar de elem',
        ],
      },
      {
        ask: ['¿Qué vale `elem->next` al volver?', 'Tal como está, ¿qué hay en next?'],
        right: ['Basura: malloc no pone nada a 0', 'Lo que hubiera en esa memoria'],
        wrong: [
          'NULL, porque malloc lo deja a 0',
          'La dirección del propio elem',
          'El mismo puntero que data',
          'El elemento que se creó antes',
        ],
      },
    ],
    wrong: [
      'Copiar data con malloc antes de guardarlo',
      'Liberar elem antes de devolverlo',
      'Devolver &elem en lugar de elem',
    ],
    why: 'malloc no inicializa: next queda con basura y el primer recorrido se sale de la lista; además malloc puede dar NULL.',
  },
  {
    id: 'pis-c12-push-front',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 2,
    code: 't_list *list;\n\nlist = NULL;\nft_list_push_front(&list, "C");\nft_list_push_front(&list, "B");\nft_list_push_front(&list, "A");',
    forms: [
      {
        ask: [
          '¿Cómo queda la lista, de la cabeza al final?',
          '¿En qué orden están los data, empezando por list?',
        ],
        right: ['A -> B -> C'],
        wrong: ['C -> B -> A', 'A', 'C -> A -> B', 'B -> C -> A'],
      },
      {
        ask: [
          '¿Y si las tres llamadas fueran a ft_list_push_back?',
          'Cambiando push_front por push_back, ¿cómo quedaría?',
        ],
        right: ['C -> B -> A'],
        wrong: ['A -> B -> C', 'C', 'A -> C -> B', 'B -> A -> C'],
      },
    ],
    wrong: ['C -> A -> B', 'B -> C -> A', 'B -> A -> C'],
    why: 'push_front mete cada nuevo delante (el último en entrar queda primero); push_back lo pone al final.',
  },
  {
    id: 'pis-c12-list-size',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 2,
    code: 'int ft_list_size(t_list *begin_list)\n{\n    int i;\n\n    i = 0;\n    while (begin_list->next)\n    {\n        i++;\n        begin_list = begin_list->next;\n    }\n    return (i);\n}',
    forms: [
      {
        ask: [
          'Con una lista de 3 elementos, ¿qué devuelve?',
          '¿Cuánto da con una lista A -> B -> C?',
        ],
        right: ['2'],
        wrong: ['3', '4', '0', '1'],
      },
      {
        ask: [
          '¿Qué pasa si la lista está vacía?',
          'Si begin_list llega a NULL, ¿qué hace esta función?',
        ],
        right: ['Falla: lee next de un puntero NULL', 'Segfault al leer begin_list->next'],
        wrong: [
          'Devuelve 0, como debería',
          'Devuelve -1 para avisar del error',
          'Se queda en un bucle sin fin',
          'Devuelve 1, por el elemento vacío',
        ],
      },
      {
        ask: ['¿Cómo se arregla?', '¿Qué cambio la deja bien en todos los casos?'],
        right: ['Con `while (begin_list)` en vez de mirar next'],
        wrong: [
          'Con `while (begin_list->next->next)`',
          'Cambiando `i++` por `i += 2` en el bucle',
          'Con `while (begin_list->data)` en el bucle',
          'Poniendo `return (i + 2);` al final',
        ],
      },
    ],
    wrong: ['3', '4', '0'],
    why: 'Mirar begin_list->next deja el último sin contar y revienta con la lista vacía: hay que mirar begin_list.',
  },
  {
    id: 'pis-c12-list-last',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué devuelve ft_list_last?', '¿Qué sale de `ft_list_last(begin_list)`?'],
        right: [
          'Un puntero al último elemento, el de next a NULL',
          'El último eslabón de la lista, o NULL si está vacía',
        ],
        wrong: [
          'Un puntero al penúltimo elemento de la lista',
          'El data del último elemento, ya convertido',
          'El número de elementos que tiene la lista',
          'La lista sin el último elemento, ya liberado',
        ],
      },
      {
        ask: [
          'Al buscar el último elemento, ¿cuándo se para el bucle?',
          '¿Qué condición dice que ya estás en el último elemento?',
        ],
        right: ['Cuando el next del elemento actual es NULL', 'Cuando ya no hay siguiente'],
        wrong: [
          'Cuando el propio elemento actual es NULL',
          'Cuando data vale 0 en el elemento actual',
          'Cuando next apunta otra vez a la cabeza',
          'Tras dar tantas vueltas como sizeof(t_list)',
        ],
      },
    ],
    wrong: [
      'Un puntero al penúltimo elemento de la lista',
      'El data del último elemento, ya convertido',
      'El número de elementos que tiene la lista',
    ],
    why: 'El último elemento es el que tiene next a NULL: se avanza mientras haya siguiente y se devuelve ese.',
  },
  {
    id: 'pis-c12-list-clear',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 3,
    code: 'while (begin_list)\n{\n    free_fct(begin_list->data);\n    free(begin_list);\n    begin_list = begin_list->next;\n}',
    forms: [
      {
        ask: ['¿Qué falla en este ft_list_clear?', '¿Por qué este bucle de liberar está mal?'],
        right: [
          'Lee begin_list->next después del free(begin_list)',
          'Usa el elemento ya liberado para ir al siguiente',
        ],
        wrong: [
          'Tendría que liberar data con free, no con free_fct',
          'Libera data antes que el elemento, y es al revés',
          'No libera el último elemento de la lista',
          'Le falta poner begin_list a NULL al principio',
        ],
      },
      {
        ask: ['¿Cómo se arregla?', '¿Qué cambio lo deja bien?'],
        right: [
          'Guardar next en una variable antes del free',
          'Copiar begin_list->next aparte y luego liberar',
        ],
        wrong: [
          'Hacer free(begin_list) después del bucle',
          'Llamar a free antes que a free_fct',
          'Poner begin_list a NULL antes del free',
          'Recorrer la lista dos veces seguidas',
        ],
      },
    ],
    wrong: [
      'Tendría que liberar data con free, no con free_fct',
      'Libera data antes que el elemento, y es al revés',
      'No libera el último elemento de la lista',
    ],
    why: 'Tras free(begin_list) esa memoria ya no es tuya: hay que guardar el siguiente antes de liberar.',
  },
  {
    id: 'pis-c12-list-at',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 2,
    code: 'list: A -> B -> C -> D -> NULL',
    forms: [
      {
        ask: ['¿Qué elemento devuelve `ft_list_at(list, 2)`?', '¿Qué da `ft_list_at(list, 2)`?'],
        right: ['El de C'],
        wrong: ['El de B', 'El de D', 'NULL', 'El de A'],
      },
      {
        ask: ['¿Qué devuelve `ft_list_at(list, 4)`?', '¿Qué da `ft_list_at(list, 4)`?'],
        right: ['NULL'],
        wrong: ['El de D', 'El de A', 'El de C', 'El de B'],
      },
    ],
    wrong: ['El de B', 'El de D', 'El de A'],
    why: 'ft_list_at cuenta desde 0 (el primero es el 0) y devuelve NULL si la lista se acaba antes.',
  },
  {
    id: 'pis-c12-reverse',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 3,
    code: 'prev = NULL;\ncur = *begin_list;\nwhile (cur)\n{\n    next = cur->next;\n    cur->next = prev;\n    prev = cur;\n    cur = next;\n}\n*begin_list = prev;',
    forms: [
      {
        ask: [
          'Con la lista A -> B -> C, ¿cómo queda al final?',
          'Si empieza con A -> B -> C, ¿qué lista sale?',
        ],
        right: ['C -> B -> A'],
        wrong: ['B -> A', 'C -> B -> A -> C', 'A', 'B -> C -> A'],
      },
      {
        ask: ['¿Para qué sirve la variable next?', '¿Qué pasaría sin guardar `cur->next` en next?'],
        right: [
          'Para no perder el resto de la lista al cambiar cur->next',
          'Sin ella, al girar cur->next se pierde lo que queda',
        ],
        wrong: [
          'Para recorrer la lista el doble de rápido',
          'Para guardar el último elemento de la lista',
          'Para liberar el elemento anterior al final',
          'Para contar cuántos elementos tiene la lista',
        ],
      },
    ],
    wrong: ['B -> A', 'C -> B -> A -> C', 'B -> C -> A'],
    why: 'Cada vuelta gira una flecha hacia atrás; next guarda el resto antes de girarla, y prev acaba siendo la nueva cabeza.',
  },
  {
    id: 'pis-c12-foreach',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En ft_list_foreach, ¿qué recibe f en cada llamada?',
          '¿Con qué se llama a f en `ft_list_foreach(begin_list, f)`?',
        ],
        right: ['El data de cada elemento', 'begin_list->data, uno por uno'],
        wrong: [
          'El elemento entero, con su next',
          'La dirección de begin_list',
          'El índice del elemento en la lista',
          'La lista entera, una sola vez',
        ],
      },
    ],
    wrong: [
      'El elemento entero, con su next',
      'La dirección de begin_list',
      'El índice del elemento en la lista',
    ],
    why: 'ft_list_foreach recorre la lista y llama a f(elem->data) en cada elemento: f no ve los punteros next.',
  },
  {
    id: 'pis-c12-remove-if',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué elementos quita ft_list_remove_if?',
          'En ft_list_remove_if, ¿cuándo se borra un elemento?',
        ],
        right: [
          'Los que dan 0 al comparar su data con data_ref',
          'Aquellos en que cmp(data, data_ref) devuelve 0',
        ],
        wrong: [
          'Los que dan 1 o más al comparar con data_ref',
          'Solo el primero cuyo data es igual a data_ref',
          'Todos menos los que son iguales a data_ref',
          'Los que tienen data a NULL, sin usar cmp',
        ],
      },
      {
        ask: [
          'Si el que se quita es el primero, ¿qué hay que cambiar?',
          'Al borrar la cabeza de la lista, ¿qué hay que actualizar?',
        ],
        right: [
          '*begin_list, para que apunte al siguiente',
          'La cabeza: *begin_list pasa a ser el segundo',
        ],
        wrong: [
          'Nada: el anterior ya apunta al siguiente',
          'El next del primero, poniéndolo a NULL',
          'El next del último elemento de la lista',
          'begin_list, el puntero local, y nada más',
        ],
      },
    ],
    wrong: [
      'Los que dan 1 o más al comparar con data_ref',
      'Solo el primero cuyo data es igual a data_ref',
      'Todos menos los que son iguales a data_ref',
    ],
    why: 'Se quita cada elemento cuyo cmp con data_ref da 0 (como strcmp), y si es la cabeza se cambia *begin_list.',
  },
  {
    id: 'pis-c12-sorted-insert',
    topic: 'listas',
    needs: { projects: C12 },
    kind: 'long',
    level: 2,
    code: 'list: 1 -> 3 -> 8 -> NULL\n\nSe inserta 5 con ft_sorted_list_insert',
    forms: [
      {
        ask: [
          '¿Cómo queda la lista, si cmp ordena de menor a mayor?',
          'Con cmp de menor a mayor, ¿qué lista sale?',
        ],
        right: ['1 -> 3 -> 5 -> 8'],
        wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8', '1 -> 3 -> 5'],
      },
    ],
    wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8'],
    why: 'ft_sorted_list_insert busca el primer elemento mayor que el nuevo y lo mete delante: la lista sigue ordenada.',
  },

  // C 13: árboles binarios con t_btree.
  {
    id: 'pis-c13-prefix',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 2,
    code: '        8\n       / \\\n      3   10\n     / \\    \\\n    1   6    14',
    forms: [
      {
        ask: [
          '¿En qué orden visita los nodos `btree_apply_prefix`?',
          'Con btree_apply_prefix y una función que escribe cada item, ¿qué sale?',
        ],
        right: ['8 3 1 6 10 14'],
        wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14', '8 10 14 3 6 1'],
      },
      {
        ask: [
          'En el recorrido prefijo, ¿cuándo se trata la raíz?',
          '¿Qué orden sigue btree_apply_prefix en cada nodo?',
        ],
        right: ['Raíz, luego el hijo izquierdo y luego el derecho'],
        wrong: [
          'Hijo izquierdo, luego la raíz y luego el derecho',
          'Hijo izquierdo, luego el derecho y luego la raíz',
          'Hijo derecho, luego la raíz y luego el izquierdo',
        ],
      },
    ],
    wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14'],
    why: 'Prefijo es raíz, izquierda, derecha: 8, todo el subárbol de 3 (3 1 6) y luego el de 10 (10 14).',
  },
  {
    id: 'pis-c13-infix',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 2,
    code: '      D\n     / \\\n    B   F\n   / \\   \\\n  A   C   G',
    forms: [
      {
        ask: [
          '¿Qué imprime `btree_apply_infix` con una función que escribe cada item?',
          '¿En qué orden visita los nodos el recorrido infijo?',
        ],
        right: ['A B C D F G'],
        wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G', 'G F D C B A'],
      },
      {
        ask: [
          'En un árbol de búsqueda, ¿qué tiene de especial el recorrido infijo?',
          '¿Por qué se usa el infijo para sacar ordenado un árbol de búsqueda?',
        ],
        right: ['Da los items ordenados de menor a mayor', 'Visita los items en orden creciente'],
        wrong: [
          'Da los items en el orden en que se insertaron',
          'Visita primero la raíz y luego las hojas',
          'Da los items ordenados de mayor a menor',
          'Visita solo las hojas, de izquierda a derecha',
        ],
      },
    ],
    wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G'],
    why: 'Infijo es izquierda, raíz, derecha: en un árbol de búsqueda salen los items ordenados.',
  },
  {
    id: 'pis-c13-suffix',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 3,
    code: '      +\n     / \\\n    *   5\n   / \\\n  2   3',
    forms: [
      {
        ask: [
          '¿Qué imprime `btree_apply_suffix` con una función que escribe cada item?',
          '¿En qué orden visita los nodos el recorrido sufijo?',
        ],
        right: ['2 3 * 5 +'],
        wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +', '+ 5 * 3 2'],
      },
      {
        ask: [
          '¿Por qué el recorrido sufijo sirve para liberar un árbol?',
          'Para hacer free de todos los nodos, ¿qué tiene de bueno el sufijo?',
        ],
        right: [
          'Trata los dos hijos antes que a su padre',
          'Cada nodo se libera después que sus hijos',
        ],
        wrong: [
          'Es el más rápido de los tres recorridos',
          'Visita la raíz antes que ningún otro nodo',
          'Es el único que no necesita recursividad',
          'Libera primero el subárbol derecho entero',
        ],
      },
    ],
    wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +'],
    why: 'Sufijo es izquierda, derecha, raíz: los hijos van antes que su padre, así que nunca liberas un nodo que aún hace falta.',
  },
  {
    id: 'pis-c13-insert',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 3,
    code: 'Árbol vacío. Se insertan, en este orden: 5, 3, 8, 4\n(btree_insert_data con cmpf de menor a mayor)',
    forms: [
      {
        ask: ['¿Dónde queda el 4?', '¿Qué sitio ocupa el último que se inserta?'],
        right: ['A la derecha del 3'],
        wrong: ['A la izquierda del 3', 'A la izquierda del 8', 'A la derecha del 5'],
      },
      {
        ask: ['¿Qué nodo queda como raíz?', 'Después de las cuatro inserciones, ¿cuál es la raíz?'],
        right: ['El 5'],
        wrong: ['El 3', 'El 4', 'El 8'],
      },
      {
        ask: [
          'Si después insertas otro 5, ¿adónde va?',
          'Un item igual a la raíz, ¿en qué lado se inserta?',
        ],
        right: ['Al subárbol derecho de la raíz', 'Baja por la derecha del 5'],
        wrong: [
          'Al subárbol izquierdo de la raíz',
          'A ningún sitio: no se repiten',
          'Sustituye a la raíz que había',
        ],
      },
    ],
    wrong: ['A la izquierda del 3', 'A la izquierda del 8', 'A la derecha del 5'],
    why: 'Cada item baja desde la raíz: a la izquierda si es menor y a la derecha si es igual o mayor. 4 < 5 y 4 > 3.',
  },
  {
    id: 'pis-c13-level-count',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 2,
    code: '    a\n   / \\\n  b   c\n       \\\n        d\n         \\\n          e',
    forms: [
      {
        ask: [
          '¿Cuántos niveles cuenta `btree_level_count` en este árbol?',
          '¿Qué devuelve btree_level_count con este árbol?',
        ],
        right: ['4'],
        wrong: ['5', '3', '2', '6'],
      },
      {
        ask: [
          '¿Qué devuelve btree_level_count si root es NULL?',
          'Con un árbol vacío, ¿cuánto da btree_level_count?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
    ],
    wrong: ['5', '3', '2'],
    why: 'Cuenta los nodos de la rama más larga (a, c, d, e): 1 + el mayor de los dos hijos, y 0 si no hay nodo.',
  },
  {
    id: 'pis-c13-by-level',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'long',
    level: 3,
    code: '      1\n     / \\\n    2   3\n   /   / \\\n  4   5   6',
    forms: [
      {
        ask: [
          '¿En qué orden visita los nodos `btree_apply_by_level`?',
          'Con btree_apply_by_level, ¿qué items salen y en qué orden?',
        ],
        right: ['1 2 3 4 5 6'],
        wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1', '1 3 2 6 5 4'],
      },
      {
        ask: [
          'btree_apply_by_level llama a applyf con tres datos. ¿Cuáles?',
          '¿Qué recibe applyf en btree_apply_by_level?',
        ],
        right: [
          'El item, su nivel y si es el primero de su nivel',
          'El item, el nivel actual y si abre ese nivel',
        ],
        wrong: [
          'El item, su padre y el número de hijos',
          'El nodo, su nivel y la altura del árbol',
          'El item, el hijo izquierdo y el derecho',
          'El item, su posición y el total de nodos',
        ],
      },
    ],
    wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1'],
    why: 'Por niveles es en anchura: toda una fila de izquierda a derecha antes de bajar a la siguiente (con una cola).',
  },
  {
    id: 'pis-c13-create-node',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cómo deja left y right `btree_create_node`?',
          'Un nodo recién creado con btree_create_node, ¿qué tiene en sus hijos?',
        ],
        right: ['A NULL los dos: el nodo nace como hoja', 'Sin hijos: left y right valen NULL'],
        wrong: [
          'Apuntando los dos al propio nodo nuevo',
          'Sin tocar: malloc ya los deja a 0',
          'left a NULL y right apuntando a item',
          'Apuntando a la raíz del árbol entero',
        ],
      },
    ],
    wrong: [
      'Apuntando los dos al propio nodo nuevo',
      'Sin tocar: malloc ya los deja a 0',
      'left a NULL y right apuntando a item',
    ],
    why: 'btree_create_node reserva un t_btree, guarda item y pone left y right a NULL: malloc no lo hace solo.',
  },
  {
    id: 'pis-c13-search',
    topic: 'árboles',
    needs: { projects: C13 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve btree_search_item si no encuentra nada?',
          'Si ningún item coincide con data_ref, ¿qué da btree_search_item?',
        ],
        right: ['NULL'],
        wrong: ['La raíz del árbol', 'El último nodo visitado', 'El item más parecido'],
      },
      {
        ask: [
          '¿Cuándo da por encontrado un item btree_search_item?',
          'En btree_search_item, ¿qué indica que un item es el buscado?',
        ],
        right: ['Cuando cmpf con data_ref devuelve 0', 'Cuando cmpf da 0 con data_ref'],
        wrong: [
          'Cuando cmpf con data_ref devuelve 1',
          'Cuando item y data_ref son el mismo puntero',
          'Cuando cmpf da un número negativo',
        ],
      },
    ],
    wrong: ['La raíz del árbol', 'El último nodo visitado', 'El item más parecido'],
    why: 'cmpf funciona como strcmp: 0 es igual. Si no hay ninguno, se devuelve NULL.',
  },
]
