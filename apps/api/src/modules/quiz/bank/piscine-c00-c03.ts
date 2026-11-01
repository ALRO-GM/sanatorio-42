/**
 * Banco de Not-games: la piscina, C 00 a C 03.
 *
 * Lo que se ve en los primeros días de C de la piscina: `write`, los
 * caracteres como números, los punteros y las cadenas (copiar, comparar,
 * concatenar). Muchas son de leer un trozo de código corto, como los
 * ejercicios que corrige la Moulinette: ¿qué imprime?, ¿qué devuelve?, ¿qué
 * falla? Cada concepto le sale a quien está en su módulo o ya ha pasado.
 */

import { fromPiscine } from './piscine-steps.js'
import type { Concept } from './types.js'

const C00 = fromPiscine('c-piscine-c-00')
const C01 = fromPiscine('c-piscine-c-01')
const C02 = fromPiscine('c-piscine-c-02')
const C03 = fromPiscine('c-piscine-c-03')

// Las implementaciones de referencia que se enseñan en las preguntas de C 03.
const STRCMP =
  'int    ft_strcmp(char *s1, char *s2)\n{\n    int    i;\n\n    i = 0;\n    while (s1[i] && s1[i] == s2[i])\n        i++;\n    return ((unsigned char)s1[i] - (unsigned char)s2[i]);\n}'
const STRNCMP =
  'int    ft_strncmp(char *s1, char *s2, unsigned int n)\n{\n    unsigned int    i;\n\n    i = 0;\n    while (i < n && s1[i] && s1[i] == s2[i])\n        i++;\n    if (i == n)\n        return (0);\n    return ((unsigned char)s1[i] - (unsigned char)s2[i]);\n}'

/** C 00: write, el primer main, los caracteres como números y las combinaciones. */
const C_00: readonly Concept[] = [
  {
    id: 'pis-c00-putchar-write',
    topic: 'funciones',
    needs: { projects: C00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué llamada escribe el carácter `c` en ft_putchar?',
          'Dentro de `ft_putchar(char c)`, ¿cómo se escribe c por la salida estándar?',
        ],
        right: ['`write(1, &c, 1)`'],
        wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(1, &c, 4)`', '`write(&c, 1, 1)`'],
      },
      {
        ask: [
          '¿Qué cabecera hay que incluir para poder usar `write`?',
          '¿Qué `#include` pide la función write?',
        ],
        right: ['`#include <unistd.h>`'],
        wrong: ['`#include <stdio.h>`', '`#include <stdlib.h>`', '`#include <string.h>`'],
      },
    ],
    wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(&c, 1, 1)`'],
    why: 'write pide un descriptor (1 es la salida estándar), la dirección de lo que escribe y cuántos bytes; está declarada en unistd.h.',
  },
  {
    id: 'pis-c00-write-return',
    topic: 'funciones',
    needs: { projects: C00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `write` si todo va bien?',
          'Cuando write funciona, su valor de retorno es…',
        ],
        right: ['El número de bytes que ha escrito'],
        wrong: [
          'El carácter que acaba de escribir',
          'El descriptor de fichero que usó',
          'Un puntero al buffer que escribió',
          '0, para decir que no hubo error',
        ],
      },
      {
        ask: ['¿Qué devuelve `write` si falla?', 'Cuando write no puede escribir, devuelve…'],
        right: ['-1'],
        wrong: ['0', '1', '2', '-2'],
      },
    ],
    wrong: ['El carácter que acaba de escribir', 'El descriptor de fichero que usó', '0', '1', '2'],
    why: 'write devuelve cuántos bytes ha escrito de verdad, o -1 si hubo un error.',
  },
  {
    id: 'pis-c00-write-proto',
    topic: 'funciones',
    needs: { projects: C00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cuál es el prototipo de `write`?', '¿Cómo está declarada la función write?'],
        right: ['`ssize_t write(int fd, const void *buf, size_t count)`'],
        wrong: [
          '`int write(int fd, char *buf, int count)`',
          '`void write(int fd, const void *buf, size_t count)`',
          '`ssize_t write(const void *buf, size_t count, int fd)`',
          '`size_t write(int fd, const char *buf)`',
        ],
      },
      {
        ask: [
          '¿De qué tipo es el segundo parámetro de `write`?',
          'El buffer que recibe write, ¿qué tipo tiene?',
        ],
        right: ['`const void *`'],
        wrong: ['`char *`', '`const char **`', '`int`', '`void`'],
      },
    ],
    wrong: ['`int write(int fd, char *buf, int count)`', '`char *`', '`int`', '`void`'],
    why: 'write recibe el fd, un const void * a los bytes (sirve cualquier dirección) y cuántos, y devuelve un ssize_t.',
  },
  {
    id: 'pis-c00-print-alphabet',
    topic: 'bucles',
    needs: { projects: C00 },
    kind: 'long',
    level: 1,
    code: "char    c;\n\nc = 'a';\nwhile (c <= 'z')\n{\n    write(1, &c, 1);\n    c += 2;\n}",
    forms: [
      {
        ask: ['¿Qué escribe este código?', '¿Cuál es la salida?'],
        right: ['`acegikmoqsuwy`'],
        wrong: [
          '`acegikmoqsuwyz`',
          '`bdfhjlnprtvxz`',
          '`abcdefghijklmnopqrstuvwxyz`',
          '`acegikmoqsuw`',
        ],
      },
      {
        ask: ['¿Cuántas letras escribe?', '¿Cuántos caracteres salen en total?'],
        right: ['13'],
        wrong: ['12', '14', '26', '25'],
      },
    ],
    wrong: ['`acegikmoqsuwyz`', '`bdfhjlnprtvxz`', '12', '14', '26'],
    why: "Un char es un número: de 'a' (97) avanza de dos en dos hasta 'y' (121), y la siguiente, 123, ya pasa de 'z'.",
  },
  {
    id: 'pis-c00-reverse-alphabet',
    topic: 'bucles',
    needs: { projects: C00 },
    kind: 'long',
    level: 2,
    code: "char    c;\n\nc = 'z';\nwhile (c > 'a')\n{\n    write(1, &c, 1);\n    c--;\n}",
    forms: [
      {
        ask: ['¿Qué letra escribe la última?', '¿Con qué letra acaba la salida?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`z`'],
      },
      {
        ask: ['¿Cuántas letras escribe en total?', '¿Cuántos caracteres salen por pantalla?'],
        right: ['25'],
        wrong: ['26', '24', '27'],
      },
    ],
    wrong: ['`a`', '`c`', '26', '24'],
    why: "Con c > 'a' el bucle para antes de escribir la 'a': salen de la 'z' a la 'b', 25 letras.",
  },
  {
    id: 'pis-c00-print-numbers',
    topic: 'caracteres',
    needs: { projects: C00 },
    kind: 'long',
    level: 2,
    code: 'int    i;\n\ni = 0;\nwhile (i <= 9)\n{\n    write(1, &i, 1);\n    i++;\n}',
    forms: [
      {
        ask: ['¿Por qué esto no escribe `0123456789`?', 'Quería ser ft_print_numbers. ¿Qué falla?'],
        right: ["Escribe los bytes 0 a 9, no los caracteres '0' a '9'"],
        wrong: [
          'No falla: escribe 0123456789 sin problema',
          'Se salta el 9 por usar <= en vez de <',
          'No compila: write no acepta un int *',
          'Escribe los números del 1 al 10, uno de más',
        ],
      },
    ],
    wrong: [
      'No falla: escribe 0123456789 sin problema',
      'Se salta el 9 por usar <= en vez de <',
      'No compila: write no acepta un int *',
    ],
    why: "write escribe el byte que vale i (de 0 a 9, caracteres de control); la cifra '0' es el byte 48.",
  },
  {
    id: 'pis-c00-char-digit',
    topic: 'caracteres',
    needs: { projects: C00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ["¿Qué valor tiene `'0'` en ASCII?", "El carácter '0', como número, vale…"],
        right: ['48'],
        wrong: ['0', '30', '49', '65'],
      },
      {
        ask: ["¿Cuánto vale `'7' - '0'` en C?", "En C, la resta '7' - '0' da…"],
        right: ['7'],
        wrong: ['55', '48', '0', '70'],
      },
      {
        ask: [
          'Para pasar la cifra `n` (de 0 a 9) a su carácter, ¿qué se escribe?',
          '¿Qué expresión pasa un int n, de 0 a 9, al carácter de su cifra?',
        ],
        right: ["`n + '0'`", '`n + 48`'],
        wrong: ["`n - '0'`", "`'n'`", "`n + 'a'`", "`n * '0'`"],
      },
    ],
    wrong: ['0', '49', '55'],
    why: "Las cifras van seguidas en ASCII desde '0' (48): sumar o restar '0' pasa de número a carácter y al revés.",
  },
  {
    id: 'pis-c00-is-negative',
    topic: 'condiciones',
    needs: { projects: C00 },
    kind: 'long',
    level: 1,
    code: 'void    ft_is_negative(int n)\n{\n    if (n < 0)\n        write(1, "N", 1);\n    else\n        write(1, "P", 1);\n}',
    forms: [
      {
        ask: ['¿Qué escribe `ft_is_negative(0)`?', 'Si se llama con n = 0, ¿qué sale?'],
        right: ['`P`'],
        wrong: ['`N`', '`0`', '`NP`'],
      },
    ],
    wrong: ['`N`', '`0`', '`NP`'],
    why: 'El 0 no es menor que 0, así que va por el else: ft_is_negative escribe P para el cero, como pide el enunciado.',
  },
  {
    id: 'pis-c00-print-comb',
    topic: 'bucles',
    needs: { projects: C00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En ft_print_comb, ¿qué combinación va justo después de `019`?',
          'ft_print_comb acaba de escribir 019. ¿Cuál escribe después?',
        ],
        right: ['`023`'],
        wrong: ['`020`', '`021`', '`029`', '`120`'],
      },
      {
        ask: [
          '¿Cuál es la última combinación de ft_print_comb?',
          '¿Con qué número acaba ft_print_comb?',
        ],
        right: ['`789`'],
        wrong: ['`999`', '`987`', '`678`', '`890`'],
      },
      {
        ask: [
          '¿Cuántas combinaciones escribe ft_print_comb?',
          '¿Cuántos números de tres cifras distintas y crecientes escribe ft_print_comb?',
        ],
        right: ['120'],
        wrong: ['1000', '720', '84', '100'],
      },
    ],
    wrong: ['`020`', '`999`', '1000', '720'],
    why: 'ft_print_comb escribe las cifras en orden estrictamente creciente (012, 013… 789): son las 120 formas de elegir 3 de 10.',
  },
  {
    id: 'pis-c00-print-comb2',
    topic: 'bucles',
    needs: { projects: C00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En ft_print_comb2, ¿qué par va justo después de `00 99`?',
          'ft_print_comb2 acaba de escribir 00 99. ¿Qué escribe después?',
        ],
        right: ['`01 02`'],
        wrong: ['`01 00`', '`01 01`', '`10 00`', '`00 100`'],
      },
      {
        ask: [
          '¿Cuál es el último par que escribe ft_print_comb2?',
          '¿Con qué par acaba ft_print_comb2?',
        ],
        right: ['`98 99`'],
        wrong: ['`99 99`', '`99 98`', '`98 98`', '`89 99`'],
      },
      {
        ask: [
          '¿Cuántos pares escribe ft_print_comb2?',
          '¿Cuántas parejas salen con ft_print_comb2?',
        ],
        right: ['4950'],
        wrong: ['9900', '10000', '5050', '4851'],
      },
    ],
    wrong: ['`01 00`', '`99 99`', '9900', '10000'],
    why: 'ft_print_comb2 escribe pares a < b de 00 a 99: el primero siempre es menor, así que hay 100 × 99 / 2 = 4950.',
  },
  {
    id: 'pis-c00-putnbr-intmin',
    topic: 'tipos',
    needs: { projects: C00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué `ft_putnbr` no puede hacer sin más `n = -n` con -2147483648?',
          '¿Qué tiene de especial -2147483648 para ft_putnbr?',
        ],
        right: ['Su positivo, 2147483648, no cabe en un int'],
        wrong: [
          'write no sabe escribir el signo menos',
          'Es el único negativo que acaba en 8',
          'El compilador no deja negar una variable',
          'Un int negativo ocupa 8 bytes, no 4',
        ],
      },
      {
        ask: [
          '¿Cuánto vale INT_MIN en un int de 32 bits?',
          '¿Cuál es el int más pequeño que hay, con 32 bits?',
        ],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-2147483649', '-4294967296', '-32768'],
      },
    ],
    wrong: [
      'write no sabe escribir el signo menos',
      'El compilador no deja negar una variable',
      '-2147483647',
      '-4294967296',
    ],
    why: 'Un int va de -2147483648 a 2147483647: el menor no tiene positivo, así que hay que tratarlo aparte (o pasar a long).',
  },
  {
    id: 'pis-c00-putnbr-code',
    topic: 'recursividad',
    needs: { projects: C00 },
    kind: 'long',
    level: 3,
    code: 'void    ft_putnbr(int n)\n{\n    char    c;\n\n    if (n < 0)\n    {\n        write(1, "-", 1);\n        n = -n;\n    }\n    if (n > 9)\n        ft_putnbr(n / 10);\n    c = n % 10 + \'0\';\n    write(1, &c, 1);\n}',
    forms: [
      {
        ask: ['¿Qué escribe `ft_putnbr(-42)`?', 'Con n = -42, ¿cuál es la salida?'],
        right: ['`-42`'],
        wrong: ['`-24`', '`42`', '`24`', '`--42`'],
      },
      {
        ask: ['¿Con qué número falla esta versión?', '¿Qué valor de n escribe mal este ft_putnbr?'],
        right: ['-2147483648'],
        wrong: ['2147483647', '0', '-1', '10'],
      },
    ],
    wrong: ['`-24`', '`42`', '2147483647', '0'],
    why: 'La recursión escribe primero las cifras altas (n / 10) y luego la última (n % 10); solo INT_MIN se rompe al hacer -n.',
  },
  {
    id: 'pis-c00-compile',
    topic: 'compilar',
    needs: { projects: C00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Con qué flags tienen que compilar los ejercicios de C de la piscina?',
          '¿Qué orden de compilación usa la corrección de la piscina?',
        ],
        right: ['`cc -Wall -Wextra -Werror`'],
        wrong: [
          '`cc -Wall -Werror -O2`',
          '`cc -g -fsanitize=address`',
          '`cc -Wall -Wextra -std=c89`',
          '`cc -Wall -pedantic -Werror`',
        ],
      },
      {
        ask: ['¿Qué hace el flag `-Werror`?', 'Al compilar con -Werror, ¿qué cambia?'],
        right: ['Convierte cualquier aviso en un error'],
        wrong: [
          'Muestra todos los avisos posibles',
          'Desactiva los avisos del compilador',
          'Añade información para depurar',
          'Optimiza el código antes de enlazar',
        ],
      },
      {
        ask: [
          'Si compilas con `cc main.c` y sin `-o`, ¿cómo se llama el ejecutable?',
          '¿Qué fichero deja cc cuando no le dices el nombre de salida?',
        ],
        right: ['`a.out`'],
        wrong: ['`main`', '`main.out`', '`main.exe`', '`a.exe`'],
      },
    ],
    wrong: ['`cc -Wall -Werror -O2`', '`cc -g -fsanitize=address`', '`main`', '`main.out`'],
    why: 'En la piscina todo compila con -Wall -Wextra -Werror (un aviso ya es un error), y cc sin -o deja el ejecutable en a.out.',
  },
  {
    id: 'pis-c00-print-combn',
    topic: 'recursividad',
    needs: { projects: C00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántas combinaciones escribe `ft_print_combn(2)`?',
          '¿Cuántas salen con ft_print_combn(2)?',
        ],
        right: ['45'],
        wrong: ['90', '100', '55', '81'],
      },
      {
        ask: [
          '¿Qué combinación escribe primero `ft_print_combn(4)`?',
          '¿Con qué empieza la salida de ft_print_combn(4)?',
        ],
        right: ['`0123`'],
        wrong: ['`0000`', '`1234`', '`0001`', '`0124`'],
      },
    ],
    wrong: ['90', '100', '`0000`', '`1234`'],
    why: 'ft_print_combn(n) escribe n cifras distintas en orden creciente: con 2 son las 45 parejas 01… 89, y con 4 empieza por 0123.',
  },
  {
    id: 'pis-c00-moulinette',
    topic: 'norma',
    needs: { projects: C00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En un día de C de la piscina, si un ejercicio está mal, ¿qué pasa con los de detrás?',
          'La Moulinette encuentra mal el ex02. ¿Qué pasa con ex03 y los siguientes?',
        ],
        right: ['No cuentan, aunque estén bien'],
        wrong: [
          'Se corrigen igual, uno a uno',
          'Cuentan solo la mitad de nota',
          'Se corrigen otra vez mañana',
          'Cuentan si los aprueba un peer',
        ],
      },
    ],
    wrong: [
      'Se corrigen igual, uno a uno',
      'Cuentan solo la mitad de nota',
      'Se corrigen otra vez mañana',
    ],
    why: 'La Moulinette corrige en orden y se para en el primer ejercicio que falla: lo de después no suma.',
  },
  {
    id: 'pis-c00-norm',
    topic: 'norma',
    needs: { projects: C00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'Según la norma de 42, ¿qué bucle puedes usar en la piscina?',
          '¿Qué bucle deja la norminette?',
        ],
        right: ['`while`'],
        wrong: ['`for`', '`do { } while`', '`foreach`'],
      },
      {
        ask: [
          '¿Cuántas líneas puede tener, como mucho, el cuerpo de una función según la norminette?',
          'Para la norma, ¿cuántas líneas caben como mucho dentro de una función?',
        ],
        right: ['25'],
        wrong: ['20', '30', '42', '50'],
      },
      {
        ask: [
          '¿Cuántas funciones caben, como mucho, en un fichero .c según la norma?',
          'La norminette deja un máximo de funciones por fichero. ¿Cuántas son?',
        ],
        right: ['5'],
        wrong: ['4', '10', '3', '7'],
      },
    ],
    wrong: ['`for`', '`do { } while`', '20', '30'],
    why: 'La norma de 42 prohíbe for, do…while y switch, y limita cada función a 25 líneas y cada fichero a 5 funciones.',
  },
]

/** C 01: punteros, paso por dirección, división entera y los primeros arrays. */
const C_01: readonly Concept[] = [
  {
    id: 'pis-c01-ft-ft',
    topic: 'punteros',
    needs: { projects: C01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué hace `ft_ft(int *nbr)`?',
          'El ejercicio ft_ft recibe un int *nbr. ¿Qué tiene que hacer?',
        ],
        right: ['Guardar 42 en el int al que apunta nbr'],
        wrong: [
          'Hacer que nbr apunte a la dirección 42',
          'Devolver 42 sin tocar nada más',
          'Escribir 42 por la salida estándar',
          'Guardar 42 en una copia local de nbr',
        ],
      },
      {
        ask: ['¿Qué línea va dentro de ft_ft?', '¿Con qué instrucción se hace ft_ft?'],
        right: ['`*nbr = 42;`'],
        wrong: ['`nbr = 42;`', '`&nbr = 42;`', '`*nbr == 42;`', '`return (42);`'],
      },
    ],
    wrong: [
      'Hacer que nbr apunte a la dirección 42',
      'Devolver 42 sin tocar nada más',
      '`nbr = 42;`',
    ],
    why: 'nbr es la dirección de un int: *nbr es ese int, y asignarle 42 lo cambia también para quien llamó.',
  },
  {
    id: 'pis-c01-ultimate-ft',
    topic: 'punteros',
    needs: { projects: C01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En `ft_ultimate_ft(int *********nbr)`, ¿cuántos `*` hay que poner delante de nbr para llegar al int?',
          'Para guardar 42 en ft_ultimate_ft, ¿cuántas veces hay que desreferenciar nbr?',
        ],
        right: ['9'],
        wrong: ['8', '10', '1', '7'],
      },
      {
        ask: [
          'Si `nbr` es un triple puntero a entero, ¿qué tipo tiene `*nbr`?',
          'Con un nbr de tres asteriscos, ¿de qué tipo es *nbr?',
        ],
        right: ['`int **`'],
        wrong: ['`int ***`', '`int *`', '`int`', '`int ****`'],
      },
    ],
    wrong: ['8', '10', '`int *`', '`int`'],
    why: 'Cada * quita un nivel de puntero: con nueve estrellas en el tipo, hacen falta nueve * para llegar al int.',
  },
  {
    id: 'pis-c01-swap-bug',
    topic: 'punteros',
    needs: { projects: C01 },
    kind: 'long',
    level: 2,
    code: 'void    ft_swap(int a, int b)\n{\n    int    tmp;\n\n    tmp = a;\n    a = b;\n    b = tmp;\n}',
    forms: [
      {
        ask: ['¿Qué falla en este ft_swap?', '¿Por qué este ft_swap no intercambia nada?'],
        right: ['Recibe copias: lo de quien llama no cambia'],
        wrong: [
          'Falta liberar tmp al terminar',
          'tmp tendría que ser un puntero',
          'Pierde el valor de a antes de copiarlo',
          'Le falta devolver los dos valores',
        ],
      },
      {
        ask: [
          '¿Qué prototipo tiene el ft_swap bueno?',
          '¿Cómo hay que declarar ft_swap para que funcione?',
        ],
        right: ['`void ft_swap(int *a, int *b)`'],
        wrong: [
          '`void ft_swap(int &a, int &b)`',
          '`int ft_swap(int a, int b)`',
          '`void ft_swap(int **a, int b)`',
          '`void *ft_swap(int a, int b)`',
        ],
      },
    ],
    wrong: [
      'Falta liberar tmp al terminar',
      'tmp tendría que ser un puntero',
      'Le falta devolver los dos valores',
    ],
    why: 'En C todo se pasa por valor: para cambiar las variables de quien llama hay que recibir sus direcciones.',
  },
  {
    id: 'pis-c01-pointer-alias',
    topic: 'punteros',
    needs: { projects: C01 },
    kind: 'long',
    level: 2,
    code: 'int    n;\nint    *p;\n\nn = 5;\np = &n;\n*p = *p + 1;\nn = n * 2;',
    forms: [
      {
        ask: ['¿Cuánto vale `*p` al final?', '¿Cuánto vale n al terminar?'],
        right: ['12'],
        wrong: ['6', '10', '11', '5'],
      },
    ],
    wrong: ['6', '10', '11', '5'],
    why: 'p apunta a n, así que *p y n son la misma variable: 5 + 1 = 6, y luego 6 × 2 = 12.',
  },
  {
    id: 'pis-c01-div-mod',
    topic: 'aritmética',
    needs: { projects: C01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'Tras `ft_div_mod(17, 5, &div, &mod)`, ¿qué valen div y mod?',
          'Si se llama a ft_div_mod con a = 17 y b = 5, ¿qué queda en div y en mod?',
        ],
        right: ['div = 3 y mod = 2'],
        wrong: [
          'div = 3 y mod = 5',
          'div = 2 y mod = 3',
          'div = 3.4 y mod = 2',
          'div = 3 y mod = 0',
        ],
      },
      {
        ask: ['¿Qué prototipo tiene ft_div_mod?', '¿Cómo se declara ft_div_mod?'],
        right: ['`void ft_div_mod(int a, int b, int *div, int *mod)`'],
        wrong: [
          '`int ft_div_mod(int a, int b, int div, int mod)`',
          '`void ft_div_mod(int *a, int *b, int div, int mod)`',
          '`void ft_div_mod(int a, int b, int **div, int **mod)`',
          '`int *ft_div_mod(int a, int b)`',
        ],
      },
    ],
    wrong: ['div = 3 y mod = 5', 'div = 2 y mod = 3', 'div = 3.4 y mod = 2'],
    why: 'Entre int, / da el cociente sin decimales y % el resto: 17 = 5 × 3 + 2; los resultados salen por los punteros.',
  },
  {
    id: 'pis-c01-ultimate-div-mod',
    topic: 'aritmética',
    needs: { projects: C01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Con a = 17 y b = 5, ¿qué dejan en a y b `ft_ultimate_div_mod(&a, &b)`?',
          'ft_ultimate_div_mod recibe las direcciones de a = 17 y b = 5. ¿Cómo quedan?',
        ],
        right: ['a = 3 y b = 2'],
        wrong: ['a = 2 y b = 3', 'a = 17 y b = 5', 'a = 3 y b = 5', 'a = 3.4 y b = 2'],
      },
    ],
    wrong: ['a = 2 y b = 3', 'a = 17 y b = 5', 'a = 3 y b = 5'],
    why: 'ft_ultimate_div_mod guarda el cociente en *a y el resto en *b: hay que calcular los dos antes de pisar ninguno.',
  },
  {
    id: 'pis-c01-negative-div',
    topic: 'aritmética',
    needs: { projects: C01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['En C, ¿cuánto vale `-7 / 2`?', '¿Qué da en C la división entera -7 / 2?'],
        right: ['-3'],
        wrong: ['-4', '-3.5', '3', '-2'],
      },
      {
        ask: ['En C, ¿cuánto vale `-7 % 2`?', '¿Qué resto da en C -7 % 2?'],
        right: ['-1'],
        wrong: ['1', '0', '-2', '3'],
      },
      {
        ask: ['En C, ¿cuánto vale `7 % -2`?', '¿Qué resto da en C 7 % -2?'],
        right: ['1'],
        wrong: ['-1', '0', '2', '-3'],
      },
    ],
    wrong: ['0', '-4', '-2'],
    why: 'En C la división entera corta hacia el cero (-3,5 da -3) y el resto lleva el signo del dividendo: -7 = 2 × -3 - 1.',
  },
  {
    id: 'pis-c01-putstr',
    topic: 'cadenas',
    needs: { projects: C01 },
    kind: 'long',
    level: 1,
    code: 'void    ft_putstr(char *str)\n{\n    while (*str)\n    {\n        write(1, str, 1);\n        str++;\n    }\n}',
    forms: [
      {
        ask: ['¿Por qué acaba este bucle?', '¿Qué hace que el while se pare?'],
        right: ["Que *str vale '\\0' al final de la cadena"],
        wrong: [
          'Que str llega a valer NULL al final',
          'Que write devuelve 0 en el último',
          'Que str++ falla tras la última letra',
          'Que el bucle tiene un tope de 25 vueltas',
        ],
      },
      {
        ask: [
          '¿Qué escribiría si pusiera `write(1, &str, 1)`?',
          'Cambiando str por &str en el write, ¿qué sale?',
        ],
        right: ['Un byte de la dirección de str, no la letra'],
        wrong: [
          'La misma letra: &str y str son lo mismo',
          'La cadena entera de una sola vez',
          'Nada: &str no compila con write',
          'Las letras de la cadena al revés',
        ],
      },
    ],
    wrong: ['Que str llega a valer NULL al final', 'Que write devuelve 0 en el último'],
    why: "*str es la letra a la que apunta str: el bucle avanza hasta el '\\0' final, y str (no &str) es la dirección de esa letra.",
  },
  {
    id: 'pis-c01-strlen',
    topic: 'cadenas',
    needs: { projects: C01 },
    kind: 'long',
    level: 1,
    code: 'int    ft_strlen(char *str)\n{\n    int    i;\n\n    i = 0;\n    while (str[i])\n        i++;\n    return (i);\n}',
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_strlen("42 Madrid")`?',
          'Con la cadena "42 Madrid", ¿qué devuelve?',
        ],
        right: ['9'],
        wrong: ['10', '8', '2', '7'],
      },
      {
        ask: ['¿Qué devuelve con la cadena vacía?', 'Si str es "", ¿qué devuelve?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: ['¿Qué pasa si se le pasa NULL?', 'Llamada con str = NULL, ¿qué ocurre?'],
        right: ['Suele dar segfault: lee en la dirección 0'],
        wrong: [
          'Devuelve 0, como con la cadena vacía',
          'Devuelve -1 para avisar del error',
          'No compila: NULL no es un char *',
        ],
      },
    ],
    wrong: ['10', '8', '1'],
    why: "ft_strlen cuenta los char hasta el '\\0', sin contarlo (el espacio sí cuenta), y no comprueba NULL.",
  },
  {
    id: 'pis-c01-rev-int-tab',
    topic: 'arrays',
    needs: { projects: C01 },
    kind: 'long',
    level: 3,
    code: 'void    ft_rev_int_tab(int *tab, int size)\n{\n    int    i;\n    int    tmp;\n\n    i = 0;\n    while (i < size)\n    {\n        tmp = tab[i];\n        tab[i] = tab[size - 1 - i];\n        tab[size - 1 - i] = tmp;\n        i++;\n    }\n}\n\nint    tab[4] = {1, 2, 3, 4};\nft_rev_int_tab(tab, 4);',
    forms: [
      {
        ask: ['¿Cómo queda tab tras la llamada?', '¿Qué hay en tab al final?'],
        right: ['`{1, 2, 3, 4}`'],
        wrong: ['`{4, 3, 2, 1}`', '`{4, 2, 3, 1}`', '`{1, 3, 2, 4}`', '`{4, 3, 3, 4}`'],
      },
      {
        ask: [
          '¿Qué condición arregla el bucle?',
          '¿Qué while hace que la función le dé la vuelta de verdad?',
        ],
        right: ['`while (i < size / 2)`'],
        wrong: [
          '`while (i <= size)`',
          '`while (i < size - 1)`',
          '`while (i > size / 2)`',
          '`while (i < size * 2)`',
        ],
      },
    ],
    wrong: ['`{4, 3, 2, 1}`', '`{4, 2, 3, 1}`', '`while (i <= size)`'],
    why: 'Recorriendo el array entero cada pareja se cambia dos veces y vuelve a su sitio: basta con llegar a la mitad.',
  },
  {
    id: 'pis-c01-sort-int-tab',
    topic: 'arrays',
    needs: { projects: C01 },
    kind: 'long',
    level: 3,
    code: 'int    tab[3] = {3, 2, 1};\nint    i;\nint    tmp;\n\ni = 0;\nwhile (i < 2)\n{\n    if (tab[i] > tab[i + 1])\n    {\n        tmp = tab[i];\n        tab[i] = tab[i + 1];\n        tab[i + 1] = tmp;\n    }\n    i++;\n}',
    forms: [
      {
        ask: ['¿Cómo queda tab tras esta pasada?', '¿Qué hay en tab al salir del bucle?'],
        right: ['`{2, 1, 3}`'],
        wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`', '`{1, 3, 2}`'],
      },
      {
        ask: [
          '¿Qué le falta para que ft_sort_int_tab ordene siempre?',
          'Para ordenar cualquier array con esto, ¿qué hace falta?',
        ],
        right: ['Repetir la pasada hasta que no haya cambios'],
        wrong: [
          'Empezar el bucle en i = 1, no en 0',
          'Comparar con >= en vez de con >',
          'Recorrer el array de derecha a izquierda',
          'Copiar antes el array en otro auxiliar',
        ],
      },
    ],
    wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`'],
    why: 'Una pasada de burbuja solo lleva el mayor al final ({3, 2, 1} queda {2, 1, 3}): hay que repetirla hasta que no cambie nada.',
  },
  {
    id: 'pis-c01-amp-star',
    topic: 'punteros',
    needs: { projects: C01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'Si `n` es un entero, ¿qué tipo tiene `&n`?',
          'Con n declarado como entero, ¿de qué tipo es &n?',
        ],
        right: ['`int *`'],
        wrong: ['`int`', '`int **`', '`int &`', '`unsigned int`'],
      },
      {
        ask: ['Con `p = &n`, ¿qué es `*p`?', 'Si p guarda &n, ¿qué representa *p?'],
        right: ['El propio n: si lo cambias, cambia n'],
        wrong: [
          'La dirección de n, en hexadecimal',
          'Una copia de n hecha al asignar p',
          'El tamaño de n en bytes',
          'La dirección donde está guardado p',
        ],
      },
    ],
    wrong: [
      '`int`',
      '`int **`',
      'La dirección de n, en hexadecimal',
      'Una copia de n hecha al asignar p',
    ],
    why: '& da la dirección de una variable (un puntero a su tipo) y * va a esa dirección: *(&n) es el mismo n.',
  },
  {
    id: 'pis-c01-array-index',
    topic: 'arrays',
    needs: { projects: C01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué expresión con punteros equivale al tercer elemento de `tab`?',
          'Con aritmética de punteros, ¿cómo se lee el tercer elemento de tab?',
        ],
        right: ['`*(tab + 2)`'],
        wrong: ['`*tab + 2`', '`&tab + 2`', '`*(tab + 3)`', '`tab + 2`'],
      },
      {
        ask: [
          '¿Qué índice tiene el último elemento de `int tab[5]`?',
          'En un array de 5 int, ¿cuál es el índice del último?',
        ],
        right: ['4'],
        wrong: ['5', '3', '-1'],
      },
    ],
    wrong: ['`*tab + 2`', '`tab + 2`', '5', '3'],
    why: 'tab[i] es *(tab + i), y el puntero avanza de int en int; los índices van de 0 a size - 1.',
  },
]

/** C 02: copiar cadenas, mirar qué caracteres llevan y cambiarlos. */
const C_02: readonly Concept[] = [
  {
    id: 'pis-c02-strcpy',
    topic: 'cadenas',
    needs: { projects: C02 },
    kind: 'long',
    level: 2,
    code: 'char    *ft_strcpy(char *dest, char *src)\n{\n    int    i;\n\n    i = 0;\n    while (src[i])\n    {\n        dest[i] = src[i];\n        i++;\n    }\n    return (dest);\n}',
    forms: [
      {
        ask: ['¿Qué le falta a este ft_strcpy?', '¿Qué hace mal esta copia?'],
        right: ["Copiar el '\\0' del final en dest"],
        wrong: [
          'Devolver src en vez de dest',
          'Reservar dest con malloc antes',
          'Comprobar que dest es más larga',
          'Empezar a copiar desde el final',
        ],
      },
      {
        ask: [
          'Si dest tenía `"xxxxxx"`, ¿qué cadena queda tras copiar `"hola"`?',
          'Con dest = "xxxxxx" y src = "hola", ¿qué cadena se lee luego en dest?',
        ],
        right: ['`holaxx`'],
        wrong: ['`hola`', '`xxhola`', '`hol`'],
      },
    ],
    wrong: [
      'Devolver src en vez de dest',
      'Reservar dest con malloc antes',
      'Comprobar que dest es más larga',
    ],
    why: "Sin copiar el '\\0', dest acaba donde acabara antes: los restos de lo que tenía se quedan pegados detrás.",
  },
  {
    id: 'pis-c02-strncpy-pad',
    topic: 'cadenas',
    needs: { projects: C02 },
    kind: 'long',
    level: 3,
    code: 'char    dest[6];\n\nft_strncpy(dest, "ab", 5);',
    forms: [
      {
        ask: [
          '¿Qué deja ft_strncpy en los 5 primeros bytes de dest?',
          '¿Cómo quedan dest[0] a dest[4]?',
        ],
        right: ["`'a' 'b' '\\0' '\\0' '\\0'`"],
        wrong: [
          "`'a' 'b' '\\0'` y dos sin tocar",
          "`'a' 'b' 'a' 'b' 'a'`",
          "`'a' 'b' ' ' ' ' ' '`",
          "`'a' 'b' '\\0' '0' '0'`",
        ],
      },
      {
        ask: [
          'Si en vez de "ab" copiara "abcdefgh", ¿cómo quedaría dest?',
          'Con src = "abcdefgh" y n = 5, ¿qué deja ft_strncpy en dest?',
        ],
        right: ["Con abcde y sin '\\0' detrás"],
        wrong: [
          "Con abcd y un '\\0' al final",
          'Con abcdefgh entera, desbordada',
          'Vacía: no copia si no cabe',
          "Con abcde y un '\\0' en dest[5]",
        ],
      },
    ],
    wrong: ['Con abcdefgh entera, desbordada', 'Vacía: no copia si no cabe'],
    why: "strncpy escribe siempre n bytes: si src es más corta rellena con '\\0', y si es más larga corta sin poner '\\0'.",
  },
  {
    id: 'pis-c02-str-is-numeric',
    topic: 'cadenas',
    needs: { projects: C02 },
    kind: 'long',
    level: 2,
    code: 'ft_str_is_numeric("");\nft_str_is_numeric("42");\nft_str_is_numeric("-42");',
    forms: [
      {
        ask: [
          '¿Qué devuelven estas tres llamadas, en orden?',
          '¿Qué da cada llamada, de arriba abajo?',
        ],
        right: ['`1 1 0`'],
        wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`', '`0 0 0`'],
      },
    ],
    wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`'],
    why: "Las ft_str_is_* devuelven 1 con la cadena vacía (no hay nada que falle), y el '-' no es una cifra.",
  },
  {
    id: 'pis-c02-str-is-printable',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué caracteres acepta ft_str_is_printable?',
          'Para ft_str_is_printable, ¿qué rango de ASCII es imprimible?',
        ],
        right: ['Del 32 (espacio) al 126 (~)'],
        wrong: [
          'Del 0 al 127, toda la tabla',
          'Del 33 (!) al 127 (DEL)',
          'Solo las letras y las cifras',
          "Del 48 ('0') al 122 ('z')",
        ],
      },
    ],
    wrong: [
      'Del 0 al 127, toda la tabla',
      'Del 33 (!) al 127 (DEL)',
      'Solo las letras y las cifras',
    ],
    why: 'En ASCII los imprimibles van del espacio (32) a la virgulilla (126); por debajo y el 127 son de control.',
  },
  {
    id: 'pis-c02-str-is-lowercase',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_str_is_lowercase("hola mundo")`?',
          'ft_str_is_lowercase recibe "hola mundo". ¿Qué devuelve y por qué?',
        ],
        right: ['0, porque el espacio no es minúscula'],
        wrong: [
          '1, porque todas sus letras lo son',
          '1, porque los espacios no cuentan',
          '0, porque tiene dos palabras',
          '9, que son sus minúsculas',
        ],
      },
    ],
    wrong: [
      '1, porque todas sus letras lo son',
      '1, porque los espacios no cuentan',
      '0, porque tiene dos palabras',
    ],
    why: "ft_str_is_lowercase devuelve 1 solo si todos los caracteres están entre 'a' y 'z': el espacio ya lo rompe.",
  },
  {
    id: 'pis-c02-str-is-alpha-bug',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'long',
    level: 3,
    code: "int    ft_str_is_alpha(char *str)\n{\n    int    i;\n\n    i = 0;\n    while (str[i])\n    {\n        if (str[i] >= 'a' && str[i] <= 'z')\n            return (1);\n        i++;\n    }\n    return (0);\n}",
    forms: [
      {
        ask: ['¿Qué hace mal esta versión?', '¿Por qué no cumple el enunciado?'],
        right: ['Da 1 en cuanto ve una minúscula y no acepta mayúsculas'],
        wrong: [
          'Nada: es justo lo que pide el enunciado',
          'Acepta también las cifras como si fueran letras',
          'Devuelve 1 con la cadena vacía, y no debería',
          "Se sale de la cadena al no mirar el '\\0' final",
        ],
      },
      {
        ask: ['¿Qué devuelve con `"ABC"`?', 'Si str es "ABC", ¿qué devuelve esta versión?'],
        right: ['0'],
        wrong: ['1', '-1', '3'],
      },
    ],
    wrong: [
      'Nada: es justo lo que pide el enunciado',
      'Acepta también las cifras como si fueran letras',
      '1',
    ],
    why: 'Hay que comprobar todos los caracteres (en cuanto uno no es letra, 0) y aceptar de la a a la z y de la A a la Z.',
  },
  {
    id: 'pis-c02-strupcase',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'long',
    level: 2,
    code: "char    *ft_strupcase(char *str)\n{\n    int    i;\n\n    i = 0;\n    while (str[i])\n    {\n        if (str[i] >= 'a' && str[i] <= 'z')\n            str[i] -= 32;\n        i++;\n    }\n    return (str);\n}",
    forms: [
      {
        ask: [
          '¿Qué pasa si se cambia `-= 32` por `+= 32`?',
          'Sumando 32 en vez de restarlo, ¿qué hace la función?',
        ],
        right: ['Las minúsculas pasan a otros signos, no a mayúsculas'],
        wrong: [
          'Pasa la cadena a minúsculas en vez de a mayúsculas',
          'Nada: sumar o restar 32 da la misma letra',
          'No compila: un char no admite el operador +=',
          'Cambia las mayúsculas y deja las minúsculas igual',
        ],
      },
    ],
    wrong: [
      'Pasa la cadena a minúsculas en vez de a mayúsculas',
      'Nada: sumar o restar 32 da la misma letra',
      'No compila: un char no admite el operador +=',
    ],
    why: "Solo toca de 'a' a 'z' (97 a 122): sumándoles 32 salen del ASCII (129 a 154), no van a las mayúsculas (65 a 90).",
  },
  {
    id: 'pis-c02-strcapitalize',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'long',
    level: 3,
    code: 'ft_strcapitalize("hOLA 42mUNDO dos-tres");',
    forms: [
      {
        ask: ['¿Qué cadena devuelve esta llamada?', '¿Cómo queda la cadena tras ft_strcapitalize?'],
        right: ['`Hola 42mundo Dos-Tres`'],
        wrong: [
          '`Hola 42Mundo Dos-Tres`',
          '`Hola 42mUNDO Dos-tres`',
          '`HOLA 42MUNDO DOS-TRES`',
          '`Hola 42mundo Dos-tres`',
        ],
      },
      {
        ask: [
          'Para ft_strcapitalize, ¿qué es una palabra?',
          'En ft_strcapitalize, ¿dónde empieza y acaba una palabra?',
        ],
        right: ['Un trozo seguido de letras y cifras'],
        wrong: [
          'Lo que va entre dos espacios',
          'Un trozo seguido solo de letras',
          'Lo que va entre dos signos',
          'Lo que empieza por mayúscula',
        ],
      },
    ],
    wrong: [
      'Lo que va entre dos espacios',
      'Un trozo seguido solo de letras',
      'Lo que empieza por mayúscula',
    ],
    why: 'Una palabra es un trozo de letras y cifras: su primer carácter va en mayúscula (si es letra) y el resto en minúscula.',
  },
  {
    id: 'pis-c02-strlcpy',
    topic: 'cadenas',
    needs: { projects: C02 },
    kind: 'long',
    level: 3,
    code: 'char            buf[4];\nunsigned int    n;\n\nn = ft_strlcpy(buf, "piscine", 4);',
    forms: [
      {
        ask: ['¿Cuánto vale n?', '¿Qué devuelve aquí ft_strlcpy?'],
        right: ['7'],
        wrong: ['3', '4', '8', '0'],
      },
      {
        ask: ['¿Qué cadena queda en buf?', '¿Qué se lee en buf tras la llamada?'],
        right: ['`pis`'],
        wrong: ['`pisc`', '`piscine`', '`pi`'],
      },
    ],
    wrong: ['3', '4', '8'],
    why: "ft_strlcpy copia como mucho size - 1 caracteres, termina con '\\0' y devuelve la longitud de src, quepa o no.",
  },
  {
    id: 'pis-c02-strlcpy-vs-strncpy',
    topic: 'cadenas',
    needs: { projects: C02 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué hace ft_strlcpy que no hace ft_strncpy?',
          '¿En qué gana ft_strlcpy a ft_strncpy?',
        ],
        right: ["Termina siempre dest con '\\0', si size no es 0"],
        wrong: [
          "Rellena dest con '\\0' hasta llegar a size",
          "Copia size bytes sin mirar el '\\0' de src",
          'Devuelve dest, igual que hace strncpy',
          'Reserva con malloc el sitio que falta',
        ],
      },
    ],
    wrong: [
      "Rellena dest con '\\0' hasta llegar a size",
      'Devuelve dest, igual que hace strncpy',
      'Reserva con malloc el sitio que falta',
    ],
    why: "strncpy puede dejar dest sin '\\0' si src no cabe; strlcpy siempre lo pone y devuelve la longitud de src.",
  },
  {
    id: 'pis-c02-non-printable',
    topic: 'caracteres',
    needs: { projects: C02 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo escribe ft_putstr_non_printable el salto de línea?',
          "ft_putstr_non_printable encuentra un '\\n'. ¿Qué escribe?",
        ],
        right: ['`\\0a`'],
        wrong: ['`\\0A`', '`\\n`', '`\\10`', '`\\x0a`'],
      },
      {
        ask: [
          '¿Cómo escribe ft_putstr_non_printable el carácter 127 (DEL)?',
          'Con el byte 127, ¿qué escribe ft_putstr_non_printable?',
        ],
        right: ['`\\7f`'],
        wrong: ['`\\7F`', '`\\127`', '`\\177`', '`\\x7f`'],
      },
      {
        ask: [
          '¿Cómo escribe ft_putstr_non_printable el carácter 27 (ESC)?',
          'Con el byte 27, ¿qué escribe ft_putstr_non_printable?',
        ],
        right: ['`\\1b`'],
        wrong: ['`\\27`', '`\\1B`', '`\\e`', '`\\033`'],
      },
    ],
    wrong: ['`\\0A`', '`\\n`', '`\\10`'],
    why: 'ft_putstr_non_printable cambia cada byte no imprimible por una barra y su valor en hexadecimal, con dos cifras y en minúsculas.',
  },
  {
    id: 'pis-c02-print-memory',
    topic: 'memoria',
    needs: { projects: C02 },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿Cuántos bytes enseña ft_print_memory en cada línea?',
          '¿Cuántos bytes van por línea en ft_print_memory?',
        ],
        right: ['16'],
        wrong: ['8', '32', '4', '64'],
      },
      {
        ask: [
          'En la columna de la derecha de ft_print_memory, ¿cómo sale un byte no imprimible?',
          'ft_print_memory encuentra un byte no imprimible. ¿Cómo lo enseña a la derecha?',
        ],
        right: ['Como un punto'],
        wrong: [
          'Como su valor en hexadecimal',
          'Como un espacio en blanco',
          'Como un signo de interrogación',
        ],
      },
      {
        ask: [
          '¿En qué base enseña ft_print_memory la dirección de cada línea?',
          'La dirección al principio de cada línea de ft_print_memory, ¿en qué base va?',
        ],
        right: ['En hexadecimal'],
        wrong: ['En decimal', 'En octal', 'En binario'],
      },
    ],
    wrong: ['8', '32', '4'],
    why: 'ft_print_memory enseña cada línea como un volcado: dirección en hexadecimal, 16 bytes en hexadecimal y esos bytes como texto, con un punto para los no imprimibles.',
  },
]

/** C 03: comparar, concatenar y buscar en cadenas. */
const C_03: readonly Concept[] = [
  {
    id: 'pis-c03-strcmp',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 2,
    code: STRCMP,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_strcmp("abc", "abd")`?',
          'Con s1 = "abc" y s2 = "abd", ¿qué devuelve?',
        ],
        right: ['-1'],
        wrong: ['1', '0', '3', '-100'],
      },
      {
        ask: ['¿Qué devuelve `ft_strcmp("a", "A")`?', 'Con s1 = "a" y s2 = "A", ¿qué devuelve?'],
        right: ['32'],
        wrong: ['-32', '1', '0', '97'],
      },
      {
        ask: [
          '¿Qué devuelve `ft_strcmp("ab", "abc")`?',
          'Con s1 = "ab" y s2 = "abc", ¿qué devuelve?',
        ],
        right: ['-99'],
        wrong: ['-1', '99', '0', '1'],
      },
    ],
    wrong: ['0', '1', '-32'],
    why: "ft_strcmp avanza mientras coinciden y devuelve la resta de los primeros distintos: el '\\0' cuenta como 0.",
  },
  {
    id: 'pis-c03-strcmp-unsigned',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿Por qué ft_strcmp resta los caracteres como unsigned char?',
          'En ft_strcmp, ¿para qué sirve pasar los char a unsigned char antes de restar?',
        ],
        right: ['Para que los bytes de 128 a 255 cuenten como mayores'],
        wrong: [
          'Para que la resta no pueda dar nunca negativo',
          'Porque en C no se pueden restar dos char',
          'Para no distinguir mayúsculas de minúsculas',
          'Para que la comparación vaya más rápida',
        ],
      },
    ],
    wrong: [
      'Para que la resta no pueda dar nunca negativo',
      'Porque en C no se pueden restar dos char',
    ],
    why: 'Si char tiene signo, los bytes de 128 a 255 valen negativo; strcmp compara como unsigned char para que vayan detrás.',
  },
  {
    id: 'pis-c03-strcmp-sign',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Si `ft_strcmp(s1, s2)` da un número negativo, ¿qué significa?',
          '¿Qué quiere decir que ft_strcmp devuelva menos de 0?',
        ],
        right: ['Que s1 va antes que s2 en orden ASCII'],
        wrong: [
          'Que s1 es más corta que s2',
          'Que hubo un error al comparar',
          'Que s2 va antes que s1 en orden ASCII',
          'Que no tienen ninguna letra en común',
        ],
      },
    ],
    wrong: [
      'Que s1 es más corta que s2',
      'Que hubo un error al comparar',
      'Que no tienen ninguna letra en común',
    ],
    why: 'Negativo es que s1 va antes, 0 que son iguales y positivo que va después, comparando carácter a carácter.',
  },
  {
    id: 'pis-c03-strncmp',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 3,
    code: STRNCMP,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_strncmp("piscine", "pisco", 4)`?',
          '¿Qué devuelve `ft_strncmp("piscine", "pisco", 0)`?',
        ],
        right: ['0'],
        wrong: ['-6', '6', '1', '-1'],
      },
      {
        ask: [
          '¿Qué devuelve `ft_strncmp("piscine", "pisco", 5)`?',
          'Con "piscine", "pisco" y n = 5, ¿qué devuelve?',
        ],
        right: ['-6'],
        wrong: ['6', '0', '-1', '1'],
      },
    ],
    wrong: ['6', '1', '-1'],
    why: "ft_strncmp mira como mucho n caracteres: los 4 primeros son iguales (0) y el quinto es 'i' - 'o' = -6.",
  },
  {
    id: 'pis-c03-strcat',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 2,
    code: 'char    dest[20] = "42";\n\nft_strcat(dest, " Madrid");\nft_strcat(dest, "!");',
    forms: [
      {
        ask: ['¿Qué cadena queda en dest?', '¿Qué se lee en dest al final?'],
        right: ['`42 Madrid!`'],
        wrong: ['`42Madrid!`', '` Madrid!`', '`!`', '`42 Madrid`'],
      },
      {
        ask: ['¿Qué devuelve ft_strcat?', 'Cada llamada a ft_strcat, ¿qué devuelve?'],
        right: ['Un puntero a dest'],
        wrong: ['Un puntero a src', 'La nueva longitud de dest', "Un puntero al '\\0' final"],
      },
    ],
    wrong: ['`42Madrid!`', '` Madrid!`', 'Un puntero a src'],
    why: "ft_strcat copia src a partir del '\\0' de dest (y pone uno nuevo al final), y devuelve dest.",
  },
  {
    id: 'pis-c03-strcat-room',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué tiene que cumplir dest para que `ft_strcat(dest, src)` no se desborde?',
          'Antes de llamar a ft_strcat, ¿cuánto sitio necesita dest?',
        ],
        right: ["Sitio para las dos cadenas y el '\\0'"],
        wrong: [
          'Sitio para src, sin contar lo que ya tiene',
          'Nada: ft_strcat reserva lo que falte',
          'Sitio para la más larga de las dos',
          'Sitio para dest y src, sin el final',
        ],
      },
    ],
    wrong: ['Sitio para src, sin contar lo que ya tiene', 'Nada: ft_strcat reserva lo que falte'],
    why: 'ft_strcat no reserva nada: escribe detrás de dest, que debe tener sitio para strlen(dest) + strlen(src) + 1.',
  },
  {
    id: 'pis-c03-strncat',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 3,
    code: 'char    dest[10] = "ab";\n\nft_strncat(dest, "cdef", 2);',
    forms: [
      {
        ask: ['¿Qué cadena queda en dest?', '¿Qué se lee en dest tras la llamada?'],
        right: ['`abcd`'],
        wrong: ['`abcdef`', '`ab`', '`cd`', '`abc`'],
      },
      {
        ask: [
          "¿Pone ft_strncat el '\\0' al final aunque corte src?",
          'Cuando ft_strncat corta src, ¿termina dest bien?',
        ],
        right: ["Sí, siempre añade el '\\0' final"],
        wrong: [
          'No, igual que hace strncpy',
          'Solo si src es más corta que nb',
          'Solo si queda sitio de sobra en dest',
        ],
      },
    ],
    wrong: ['`abcdef`', '`ab`', '`cd`'],
    why: "ft_strncat añade como mucho nb caracteres de src al final de dest y siempre termina con '\\0'.",
  },
  {
    id: 'pis-c03-strstr',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué devuelve `ft_strstr(str, "")`?',
          'Si la aguja de ft_strstr es la cadena vacía, ¿qué devuelve?',
        ],
        right: ['Un puntero al principio de str'],
        wrong: [
          'NULL, porque no hay nada que buscar',
          "Un puntero al '\\0' del final de str",
          'La longitud de str, sin tocar nada',
        ],
      },
      {
        ask: [
          '¿Qué devuelve ft_strstr si to_find no está en str?',
          'Cuando ft_strstr no encuentra la aguja, devuelve…',
        ],
        right: ['NULL'],
        wrong: [
          'Un puntero al principio de str',
          "Un puntero al '\\0' de str",
          'La cadena vacía ""',
        ],
      },
    ],
    wrong: ["Un puntero al '\\0' del final de str", 'La longitud de str, sin tocar nada'],
    why: 'Como strstr: una aguja vacía se encuentra en el principio (devuelve str), y si no aparece devuelve NULL.',
  },
  {
    id: 'pis-c03-strstr-code',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 2,
    code: 'char    *s;\n\ns = ft_strstr("banana", "ana");',
    forms: [
      {
        ask: ['¿Qué cadena se lee desde s?', 'Tras la llamada, ¿qué cadena es s?'],
        right: ['`anana`'],
        wrong: ['`ana`', '`nana`', '`na`', '`banana`'],
      },
    ],
    wrong: ['`ana`', '`nana`', '`banana`'],
    why: 'ft_strstr devuelve un puntero a la primera aparición dentro de str, que sigue hasta el final: desde la posición 1, anana.',
  },
  {
    id: 'pis-c03-strlcat',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 4,
    code: 'char            dest[10] = "abc";\nunsigned int    n;\n\nn = ft_strlcat(dest, "defgh", 6);',
    forms: [
      {
        ask: ['¿Cuánto vale n?', '¿Qué devuelve aquí ft_strlcat?'],
        right: ['8'],
        wrong: ['5', '6', '3', '9'],
      },
      {
        ask: ['¿Qué cadena queda en dest?', '¿Cómo queda dest tras la llamada?'],
        right: ['`abcde`'],
        wrong: ['`abcdef`', '`abcdefgh`', '`abc`', '`abcdefg`'],
      },
    ],
    wrong: ['5', '6', '9'],
    why: "Con size 6 caben 5 caracteres y el '\\0': añade de y para; devuelve strlen(dest) + strlen(src) = 3 + 5.",
  },
  {
    id: 'pis-c03-strlcat-small',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'long',
    level: 4,
    code: 'char            dest[10] = "abcdef";\nunsigned int    n;\n\nn = ft_strlcat(dest, "xyz", 4);',
    forms: [
      {
        ask: ['¿Cuánto vale n?', '¿Qué devuelve aquí ft_strlcat?'],
        right: ['7'],
        wrong: ['9', '4', '3', '10'],
      },
      {
        ask: ['¿Cómo queda dest?', '¿Qué se lee en dest después?'],
        right: ['`abcdef`'],
        wrong: ['`abcdefxyz`', '`abc`', '`abcx`', '`abcxyz`'],
      },
    ],
    wrong: ['9', '4', '10'],
    why: 'Si size no pasa de strlen(dest), ft_strlcat no toca dest y devuelve size + strlen(src): 4 + 3 = 7.',
  },
  {
    id: 'pis-c03-strlcat-return',
    topic: 'cadenas',
    needs: { projects: C03 },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿Para qué sirve el valor que devuelve ft_strlcat?',
          '¿Qué se sabe mirando lo que devuelve ft_strlcat?',
        ],
        right: ['Si se cortó: cuando es >= size, no cupo'],
        wrong: [
          'Cuántos caracteres llegó a copiar',
          'Dónde acaba dest en la memoria',
          'Si dest y src se solapan o no',
          'Cuánto sitio sobra todavía en dest',
        ],
      },
      {
        ask: [
          '¿Qué devuelve `ft_strlcat(dest, src, size)`?',
          '¿Con qué fórmula se calcula lo que devuelve ft_strlcat?',
        ],
        right: ['`min(size, strlen(dest)) + strlen(src)`'],
        wrong: [
          '`strlen(dest) + strlen(src) + 1`',
          '`size - strlen(dest) - 1`',
          '`max(size, strlen(dest)) + strlen(src)`',
          '`min(size, strlen(src)) + strlen(dest)`',
        ],
      },
    ],
    wrong: [
      'Cuántos caracteres llegó a copiar',
      'Dónde acaba dest en la memoria',
      'Cuánto sitio sobra todavía en dest',
    ],
    why: 'ft_strlcat devuelve la longitud que habría querido crear, min(size, strlen(dest)) + strlen(src): si llega a size, se cortó.',
  },
]

export const PISCINE_C00_C03: readonly Concept[] = [...C_00, ...C_01, ...C_02, ...C_03]
