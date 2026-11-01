/**
 * Banco de Not-games: la piscina, C 04 a C 07.
 *
 * C 04 (ft_strlen, ft_putnbr, ft_atoi y las bases), C 05 (recursividad:
 * factorial, potencia, fibonacci, raíz, primos y las diez damas), C 06 (argc
 * y argv) y C 07 (malloc: strdup, range, strjoin, convert_base y split).
 * Cada concepto le sale a quien está en su módulo o ya ha pasado a uno de
 * después (`fromPiscine`); casi todo es leer un trozo de código corto, que es
 * lo que se hace en la piscina.
 */

import { fromPiscine } from './piscine-steps.js'
import type { Concept } from './types.js'

const C04 = fromPiscine('c-piscine-c-04')
const C05 = fromPiscine('c-piscine-c-05')
const C06 = fromPiscine('c-piscine-c-06')
const C07 = fromPiscine('c-piscine-c-07')

/** C 04: cadenas, números y bases. */
const C04_CONCEPTS: readonly Concept[] = [
  {
    id: 'pis-c04-strlen',
    topic: 'cadenas',
    needs: { projects: C04 },
    kind: 'long',
    level: 1,
    code: "int ft_strlen(char *str)\n{\n    int i;\n\n    i = 0;\n    while (str[i] != '\\0')\n        i++;\n    return (i);\n}",
    forms: [
      {
        ask: ['¿Qué devuelve con "42 Madrid"?', 'Con la cadena "42 Madrid", ¿qué devuelve?'],
        right: ['9'],
        wrong: ['10', '8', '2', '7'],
      },
      {
        ask: ['¿Qué devuelve con la cadena vacía ""?', 'Con "", ¿qué devuelve esta función?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
    ],
    wrong: ['10', '8', '2'],
    why: "Cuenta los caracteres hasta el '\\0' sin contarlo: el espacio cuenta, y la cadena vacía da 0.",
  },
  {
    id: 'pis-c04-putstr',
    topic: 'cadenas',
    needs: { projects: C04 },
    kind: 'long',
    level: 2,
    code: 'void ft_putstr(char *str)\n{\n    while (*str)\n        write(1, str++, 1);\n}\n\nint main(void)\n{\n    ft_putstr("ab\\0cd");\n    return (0);\n}',
    forms: [
      {
        ask: ['¿Qué imprime este programa?', '¿Cuál es la salida de este programa?'],
        right: ['ab'],
        wrong: ['abcd', 'ab\\0cd', 'a', 'cd'],
      },
    ],
    wrong: ['abcd', 'ab\\0cd', 'cd'],
    why: "El '\\0' metido en medio corta la cadena: para el bucle, la cadena acaba ahí, y lo que sigue no se imprime.",
  },
  {
    id: 'pis-c04-putnbr-intmin',
    topic: 'números',
    needs: { projects: C04 },
    kind: 'long',
    level: 3,
    code: "void ft_putnbr(int nb)\n{\n    if (nb < 0)\n    {\n        ft_putchar('-');\n        nb = -nb;\n    }\n    if (nb >= 10)\n        ft_putnbr(nb / 10);\n    ft_putchar(nb % 10 + '0');\n}",
    forms: [
      {
        ask: ['¿Con qué número falla esta ft_putnbr?', '¿Qué entrada imprime mal esta versión?'],
        right: ['-2147483648'],
        wrong: ['0', '-1', '2147483647', '-10'],
      },
      {
        ask: ['¿Por qué falla esta versión con INT_MIN?', '¿Qué pasa en `nb = -nb` con INT_MIN?'],
        right: [
          'Su opuesto, 2147483648, no cabe en un int',
          'Cambiarle el signo se desborda: no hay +2147483648',
        ],
        wrong: [
          'nb / 10 redondea mal con números negativos',
          'write no puede imprimir el signo menos',
          'La recursión no tiene caso base para él',
          'ft_putchar no acepta cifras negativas',
        ],
      },
    ],
    wrong: ['0', '-1', '2147483647'],
    why: 'Un int de 32 bits va de -2147483648 a 2147483647: el opuesto de INT_MIN no cabe, y hay que tratarlo aparte o pasar a un long.',
  },
  {
    id: 'pis-c04-putnbr-order',
    topic: 'recursividad',
    needs: { projects: C04 },
    kind: 'long',
    level: 2,
    code: "void put(int nb)\n{\n    ft_putchar(nb % 10 + '0');\n    if (nb >= 10)\n        put(nb / 10);\n}",
    forms: [
      {
        ask: ['¿Qué imprime `put(123)`?', '¿Cuál es la salida de `put(123)`?'],
        right: ['321'],
        wrong: ['123', '3', '12', '1'],
      },
      {
        ask: [
          '¿Qué cambio hace que `put(123)` imprima las cifras en su orden?',
          '¿Cómo se arregla para que salga el número bien?',
        ],
        right: [
          'Llamar a put(nb / 10) antes de imprimir la cifra',
          'Imprimir nb % 10 después de la llamada recursiva',
        ],
        wrong: [
          'Imprimir nb / 10 en vez de nb % 10',
          'Cambiar nb >= 10 por nb > 0 en el if',
          "Sumar '1' a la cifra en vez de '0'",
          'Llamar a put(nb % 10) en vez de put(nb / 10)',
        ],
      },
    ],
    wrong: ['123', '3', '12'],
    why: 'nb % 10 es la última cifra: si se imprime antes de la llamada, el número sale al revés; las de delante hay que imprimirlas primero.',
  },
  {
    id: 'pis-c04-atoi-signs',
    topic: 'números',
    needs: { projects: C04 },
    kind: 'long',
    level: 3,
    code: 'ft_atoi(" ---+--+1234ab567");\nft_atoi("\\t\\n -+-42");\nft_atoi("12 34");',
    forms: [
      {
        ask: ['¿Qué devuelve la primera llamada?', 'Con la primera cadena, ¿qué devuelve ft_atoi?'],
        right: ['-1234'],
        wrong: ['1234', '-1234567', '0', '1234567'],
      },
      {
        ask: ['¿Qué devuelve la segunda llamada?', 'Con la segunda cadena, ¿qué devuelve ft_atoi?'],
        right: ['42'],
        wrong: ['-42', '0', '4', '-4'],
      },
      {
        ask: ['¿Qué devuelve la tercera llamada?', 'Con la tercera cadena, ¿qué devuelve ft_atoi?'],
        right: ['12'],
        wrong: ['1234', '34', '0', '1'],
      },
    ],
    wrong: ['0', '1234', '-42'],
    why: "El ft_atoi de la piscina salta blancos, lee todos los '+' y '-' (un número impar de '-' lo hace negativo) y para en lo primero que no es cifra.",
  },
  {
    id: 'pis-c04-atoi-spaces',
    topic: 'números',
    needs: { projects: C04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué caracteres se salta ft_atoi antes del signo?',
          'En el ft_atoi del C 04, ¿qué blancos se ignoran al principio?',
        ],
        right: [
          "' ', \\t, \\n, \\v, \\f y \\r",
          "Los seis de isspace: ' ', \\t, \\n, \\v, \\f y \\r",
        ],
        wrong: [
          "Solo el espacio ' ', ningún otro",
          "Solo ' ' y \\t, los de la tecla",
          'Ninguno: si empieza por blanco da 0',
          'Todo lo que no sea una cifra',
        ],
      },
    ],
    wrong: ["Solo ' ', \\t y \\n", 'Los espacios y también las letras'],
    why: 'Los blancos que salta son los mismos que los de isspace: espacio, tabulador, salto de línea, \\v, \\f y \\r.',
  },
  {
    id: 'pis-c04-base-valid',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuál de estas bases acepta ft_putnbr_base?',
          '¿Qué base es válida para ft_putnbr_base?',
        ],
        right: ['`"poneyvif"`', '`"0123456789ABCDEF"`'],
        wrong: [
          '`"0123-456789"`',
          '`"0123456789abcdeF0"`',
          '`"+0123456789"`',
          '`"poneyvifp"`',
          '`"0"`',
        ],
      },
      {
        ask: [
          '¿Qué hace ft_putnbr_base si la base no vale?',
          'Con una base inválida, ¿qué tiene que hacer ft_putnbr_base?',
        ],
        right: ['No imprimir nada'],
        wrong: [
          'Imprimir el número en decimal',
          'Imprimir «Error» por la salida',
          'Imprimir solo el signo menos',
          'Usar la base "01" por defecto',
        ],
      },
    ],
    wrong: ['`"0"`', '`""`', '`"0123-456"`'],
    why: 'Una base no vale si está vacía, tiene un solo carácter, repite alguno o lleva + o -; entonces no se imprime nada.',
  },
  {
    id: 'pis-c04-base-convert',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'long',
    level: 2,
    code: 'ft_putnbr_base(10, "01");\nft_putnbr_base(255, "0123456789ABCDEF");\nft_putnbr_base(8, "poneyvif");',
    forms: [
      {
        ask: ['¿Qué imprime la primera línea?', 'En binario, ¿qué saca la primera línea?'],
        right: ['1010'],
        wrong: ['0101', '10', '1001', '110'],
      },
      {
        ask: ['¿Qué imprime la segunda línea?', 'En base 16, ¿qué saca la segunda línea?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FE', 'EF'],
      },
      {
        ask: [
          '¿Qué imprime la tercera línea?',
          'En la base "poneyvif", ¿qué saca la tercera línea?',
        ],
        right: ['op'],
        wrong: ['f', 'po', 'pp', 'oo'],
      },
    ],
    wrong: ['10', '0101', '1001'],
    why: 'La longitud de la base es el número de cifras, y cada carácter vale su posición: 10 = 1010 en binario, 255 = FF en hexadecimal y 8 = «10» en base 8, que con poneyvif es op.',
  },
  {
    id: 'pis-c04-atoi-base',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'long',
    level: 3,
    code: 'ft_atoi_base("101", "01");\nft_atoi_base(" -ff", "0123456789abcdef");\nft_atoi_base("42", "0");',
    forms: [
      {
        ask: [
          '¿Qué devuelve la primera llamada?',
          'Leído en binario, ¿qué devuelve la primera llamada?',
        ],
        right: ['5'],
        wrong: ['101', '3', '6', '4'],
      },
      {
        ask: [
          '¿Qué devuelve la segunda llamada?',
          'Leído en hexadecimal, ¿qué devuelve la segunda?',
        ],
        right: ['-255'],
        wrong: ['255', '-15', '-256', '0'],
      },
      {
        ask: ['¿Qué devuelve la tercera llamada?', 'Con la base de la tercera, ¿qué devuelve?'],
        right: ['0'],
        wrong: ['42', '-1', '1', '2'],
      },
    ],
    wrong: ['101', '255', '-1'],
    why: 'ft_atoi_base lee como ft_atoi pero con las cifras de la base (101 en binario es 5, -ff en hexadecimal es -255); con una base inválida, como la de un solo carácter, devuelve 0.',
  },
  {
    id: 'pis-c04-intmin-value',
    topic: 'números',
    needs: { projects: C04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cuánto vale INT_MIN con un int de 32 bits?', 'El int más pequeño (32 bits) es…'],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-4294967296', '-32768', '-4294967295'],
      },
      {
        ask: [
          '¿Cuántas cifras tiene INT_MIN, sin contar el signo?',
          '¿Cuántas cifras imprime ft_putnbr con INT_MIN, sin el signo?',
        ],
        right: ['10'],
        wrong: ['11', '9', '32', '8'],
      },
    ],
    wrong: ['-2147483647', '-32768', '-4294967296'],
    why: 'Con 32 bits caben 2³² valores: de -2147483648 a 2147483647, y el negativo tiene uno más que el positivo.',
  },
  {
    id: 'pis-c04-base-poney',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Con la base "poneyvif", ¿en qué base se escribe el número?',
          'La base "poneyvif", ¿de cuántas cifras es?',
        ],
        right: ['8'],
        wrong: ['16', '2', '10', '7'],
      },
      {
        ask: [
          'En la base "poneyvif", ¿qué carácter vale 5?',
          '¿Cómo se escribe el 5 con la base "poneyvif"?',
        ],
        right: ['v'],
        wrong: ['y', 'i', 'e', 'f'],
      },
    ],
    wrong: ['16', '2', '10'],
    why: 'Cada carácter de la base vale su posición desde 0: p = 0, o = 1, n = 2, e = 3, y = 4, v = 5, i = 6 y f = 7; son 8, base 8.',
  },
  {
    id: 'pis-c04-octal',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cómo se escribe 42 en octal?', 'El 42 decimal, en base 8, es…'],
        right: ['52'],
        wrong: ['50', '25', '62', '54'],
      },
      {
        ask: ['¿Cuánto vale en decimal el octal 17?', 'El 17 en base 8, pasado a decimal, es…'],
        right: ['15'],
        wrong: ['17', '16', '23', '13'],
      },
    ],
    wrong: ['50', '25', '62'],
    why: 'En base 8 cada cifra vale 8 veces la de su derecha: 42 = 5 × 8 + 2, y 17 en octal es 1 × 8 + 7 = 15.',
  },
  {
    id: 'pis-c04-base-sign',
    topic: 'bases',
    needs: { projects: C04 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué una base no puede llevar + ni -?',
          '¿Por qué ft_atoi_base rechaza una base con un signo?',
        ],
        right: [
          'Se confundirían con el signo del número',
          'No se sabría si son una cifra o el signo',
        ],
        wrong: [
          'write no sabe imprimir esos dos caracteres',
          'No son caracteres ASCII imprimibles',
          'Ocupan dos bytes en memoria cada uno',
          'La norminette prohíbe usarlos en cadenas',
        ],
      },
    ],
    wrong: ['Se confunden con los espacios', 'Son más lentos de comparar'],
    why: "Delante de las cifras se leen '+' y '-' como signo: si fueran cifras de la base, «-1» no tendría una sola lectura.",
  },
]

/** C 05: recursividad y algo de matemáticas. */
const C05_CONCEPTS: readonly Concept[] = [
  {
    id: 'pis-c05-fact-iter',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 1,
    code: 'int ft_iterative_factorial(int nb)\n{\n    int result;\n\n    if (nb < 0)\n        return (0);\n    result = 1;\n    while (nb > 1)\n        result *= nb--;\n    return (result);\n}',
    forms: [
      {
        ask: ['¿Qué devuelve con nb = 5?', 'Con nb = 5, ¿qué devuelve esta función?'],
        right: ['120'],
        wrong: ['24', '25', '60', '720'],
      },
      {
        ask: ['¿Qué devuelve con nb = 0?', 'Con nb = 0, ¿qué devuelve esta función?'],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: ['¿Qué devuelve con nb = -3?', 'Con nb = -3, ¿qué devuelve esta función?'],
        right: ['0'],
        wrong: ['-6', '1', '-1', '6'],
      },
    ],
    wrong: ['24', '-1', '720'],
    why: '5! = 5 × 4 × 3 × 2 × 1 = 120; 0! vale 1 (el bucle no entra), y con un negativo el enunciado pide devolver 0.',
  },
  {
    id: 'pis-c05-fact-rec',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 3,
    code: 'int ft_recursive_factorial(int nb)\n{\n    if (nb < 0)\n        return (0);\n    if (nb == 1)\n        return (1);\n    return (nb * ft_recursive_factorial(nb - 1));\n}',
    forms: [
      {
        ask: ['¿Qué devuelve esta versión con nb = 0?', 'Con nb = 0, ¿qué devuelve?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: ['¿Qué falla en esta versión?', '¿Por qué no pasaría la Moulinette?'],
        right: ['Con 0 devuelve 0, y 0! vale 1', 'Le falta que nb == 0 también dé 1'],
        wrong: [
          'Con 1 se llama a sí misma sin parar',
          'Con negativos devuelve 1, no 0',
          'No falla nada: cumple el enunciado',
          'Con 5 devuelve 24 en vez de 120',
        ],
      },
    ],
    wrong: ['1', '-1', '2'],
    why: 'Con 0 hace 0 × f(-1), y f(-1) devuelve 0: el resultado es 0, pero 0! vale 1, así que el caso base tiene que cubrir también el 0.',
  },
  {
    id: 'pis-c05-power',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 2,
    code: 'ft_iterative_power(2, 10);\nft_iterative_power(0, 0);\nft_iterative_power(5, -2);',
    forms: [
      {
        ask: ['¿Qué devuelve la primera llamada?', '¿Cuánto da 2 elevado a 10 con esta función?'],
        right: ['1024'],
        wrong: ['20', '100', '512', '2048'],
      },
      {
        ask: [
          'Según el enunciado, ¿qué devuelve la segunda llamada?',
          '¿Qué pide el enunciado para 0 elevado a 0?',
        ],
        right: ['Que devuelva 1', 'Que dé 1, como en matemáticas'],
        wrong: [
          'Que devuelva 0',
          'Que devuelva -1, como error',
          'Que devuelva 0, por no estar definido',
        ],
      },
      {
        ask: ['¿Qué devuelve la tercera llamada?', 'Con una potencia negativa, ¿qué devuelve?'],
        right: ['0'],
        wrong: ['-25', '1', '-1', '25'],
      },
    ],
    wrong: ['512', '2048', '100'],
    why: 'Multiplica nb por sí mismo power veces (2¹⁰ = 1024); 0 elevado a 0 vale 1 y una potencia negativa devuelve 0, como pide el enunciado.',
  },
  {
    id: 'pis-c05-power-rec',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 3,
    code: 'int ft_recursive_power(int nb, int power)\n{\n    if (power < 0)\n        return (0);\n    if (power == 0)\n        return (1);\n    return (nb * ft_recursive_power(nb, power - 1));\n}',
    forms: [
      {
        ask: [
          '¿Cuántas veces se ejecuta ft_recursive_power con (3, 4), contando la primera?',
          '¿Cuántas llamadas hay en total para nb = 3 y power = 4?',
        ],
        right: ['5'],
        wrong: ['4', '3', '81', '12'],
      },
      {
        ask: ['¿Qué devuelve con nb = 3 y power = 4?', 'Con (3, 4), ¿qué devuelve?'],
        right: ['81'],
        wrong: ['12', '64', '27', '243'],
      },
    ],
    wrong: ['12', '64', '27'],
    why: 'Cada llamada baja power en 1 hasta el caso base: 4, 3, 2, 1 y 0 son 5 llamadas, y el resultado es 3 × 3 × 3 × 3 × 1 = 81.',
  },
  {
    id: 'pis-c05-fib',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 2,
    code: 'int ft_fibonacci(int index)\n{\n    if (index < 0)\n        return (-1);\n    if (index < 2)\n        return (index);\n    return (ft_fibonacci(index - 1) + ft_fibonacci(index - 2));\n}',
    forms: [
      {
        ask: ['¿Qué devuelve con index = 7?', 'Con index = 7, ¿qué devuelve?'],
        right: ['13'],
        wrong: ['8', '21', '7', '11'],
      },
      {
        ask: ['¿Qué devuelve con index = -4?', 'Con un index negativo, ¿qué devuelve?'],
        right: ['-1'],
        wrong: ['0', '-3', '3', '1'],
      },
    ],
    wrong: ['8', '21', '0'],
    why: 'La sucesión empieza 0, 1, 1, 2, 3, 5, 8, 13: el índice 7 es 13; con un índice negativo el enunciado pide -1.',
  },
  {
    id: 'pis-c05-fib-cost',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo crecen las llamadas de un ft_fibonacci recursivo, sin guardar nada?',
          'Si ft_fibonacci se llama dos veces a sí misma, ¿cómo crece su coste con el índice?',
        ],
        right: [
          'De forma exponencial: cada llamada hace otras dos',
          'Exponencialmente, repitiendo los mismos cálculos',
        ],
        wrong: [
          'De forma lineal: una llamada por índice',
          'Como un logaritmo, igual que una búsqueda binaria',
          'Como el cuadrado del índice, ni más ni menos',
          'No crece: siempre son dos llamadas',
        ],
      },
    ],
    wrong: ['De forma lineal, como un bucle', 'Igual que el factorial recursivo'],
    why: 'fib(n) llama a fib(n-1) y a fib(n-2), que vuelven a repetir los mismos cálculos: el número de llamadas crece casi como 1,6ⁿ.',
  },
  {
    id: 'pis-c05-sqrt',
    topic: 'números',
    needs: { projects: C05 },
    kind: 'long',
    level: 2,
    code: 'ft_sqrt(49);\nft_sqrt(50);\nft_sqrt(-16);',
    forms: [
      {
        ask: ['¿Qué devuelve la primera llamada?', 'Con 49, ¿qué devuelve ft_sqrt?'],
        right: ['7'],
        wrong: ['0', '24', '6', '49'],
      },
      {
        ask: ['¿Qué devuelve la segunda llamada?', 'Con 50, ¿qué devuelve ft_sqrt?'],
        right: ['0'],
        wrong: ['7', '8', '-1', '7.07'],
      },
      {
        ask: ['¿Qué devuelve la tercera llamada?', 'Con -16, ¿qué devuelve ft_sqrt?'],
        right: ['0'],
        wrong: ['4', '-4', '-1', '16'],
      },
    ],
    wrong: ['-1', '-4', '16'],
    why: 'ft_sqrt devuelve la raíz entera solo si es exacta: 49 da 7; 50 no es un cuadrado perfecto y un negativo no tiene raíz, así que dan 0.',
  },
  {
    id: 'pis-c05-sqrt-overflow',
    topic: 'números',
    needs: { projects: C05 },
    kind: 'long',
    level: 4,
    code: 'int ft_sqrt(int nb)\n{\n    int i;\n\n    i = 1;\n    while (i * i < nb)\n        i++;\n    if (i * i == nb)\n        return (i);\n    return (0);\n}',
    forms: [
      {
        ask: ['¿Qué falla en esta ft_sqrt?', '¿Con qué entradas se rompe esta versión?'],
        right: [
          'Con nb cerca de INT_MAX, i * i se desborda',
          'i * i no cabe en un int con nb muy grande',
        ],
        wrong: [
          'Con nb = 1 devuelve 0 en vez de 1',
          'Con negativos se queda en un bucle infinito',
          'Con cuadrados perfectos devuelve i + 1',
          'Con nb = 0 se queda en el bucle sin salir',
        ],
      },
    ],
    wrong: ['Con nb = 4 devuelve 0', 'No falla nada: cumple el enunciado'],
    why: 'Para nb cerca de 2147483647, i llega a 46341 y 46341 × 46341 ya no cabe en un int: se desborda; con 0, 1 y negativos sale bien.',
  },
  {
    id: 'pis-c05-prime',
    topic: 'números',
    needs: { projects: C05 },
    kind: 'long',
    level: 3,
    code: 'int ft_is_prime(int nb)\n{\n    int i;\n\n    i = 2;\n    while (i < nb)\n    {\n        if (nb % i == 0)\n            return (0);\n        i++;\n    }\n    return (1);\n}',
    forms: [
      {
        ask: [
          '¿Con qué número da una respuesta equivocada?',
          '¿Qué entrada hace que esta versión mienta?',
        ],
        right: ['1'],
        wrong: ['2', '3', '97', '4'],
      },
      {
        ask: ['¿Qué le falta a esta ft_is_prime?', '¿Qué hay que añadir para que esté bien?'],
        right: ['Devolver 0 si nb es menor que 2', 'Tratar 0, 1 y negativos como no primos'],
        wrong: [
          'Empezar el bucle en i = 1, no en 2',
          'Devolver 1 en cuanto nb sea par',
          'Probar i hasta nb incluido',
          'Devolver 0 si nb vale 2',
        ],
      },
    ],
    wrong: ['2', '3', '97'],
    why: 'Con nb menor que 2 el bucle no entra y devuelve 1, pero ni 0, ni 1, ni los negativos son primos.',
  },
  {
    id: 'pis-c05-prime-sqrt',
    topic: 'números',
    needs: { projects: C05 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Para saber si n es primo, ¿cuál es el divisor más alto que hace falta probar?',
          'Para que ft_is_prime no sea lenta, ¿hasta qué divisor basta llegar?',
        ],
        right: ['La raíz cuadrada de n', 'El mayor i tal que i * i <= n'],
        wrong: [
          'La mitad de n, n / 2',
          'El anterior a n, n - 1',
          'El logaritmo en base 2 de n',
          'La décima parte de n',
        ],
      },
    ],
    wrong: ['El propio n', 'El primo anterior a n'],
    why: 'Si n = a × b, uno de los dos es como mucho √n: si no hay divisor hasta ahí, no hay ninguno.',
  },
  {
    id: 'pis-c05-next-prime',
    topic: 'números',
    needs: { projects: C05 },
    kind: 'long',
    level: 2,
    code: 'ft_find_next_prime(14);\nft_find_next_prime(17);\nft_find_next_prime(-5);',
    forms: [
      {
        ask: ['¿Qué devuelve la primera llamada?', 'Con 14, ¿qué devuelve ft_find_next_prime?'],
        right: ['17'],
        wrong: ['15', '13', '19', '16'],
      },
      {
        ask: ['¿Qué devuelve la segunda llamada?', 'Si nb ya es primo, ¿qué devuelve?'],
        right: ['17'],
        wrong: ['19', '18', '23'],
      },
      {
        ask: ['¿Qué devuelve la tercera llamada?', 'Con un número negativo, ¿qué devuelve?'],
        right: ['2'],
        wrong: ['-5', '0', '-3', '1'],
      },
    ],
    wrong: ['19', '13', '0'],
    why: 'Devuelve el primer primo mayor o igual que nb: 14 da 17, 17 ya lo es, y por debajo de 2 el primero es 2.',
  },
  {
    id: 'pis-c05-queens',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántas soluciones tiene el problema de las diez damas?',
          '¿Cuántas formas hay de poner 10 damas en un tablero de 10 × 10 sin que se ataquen?',
        ],
        right: ['724'],
        wrong: ['92', '10', '512', '2680'],
      },
      {
        ask: [
          '¿Cómo se imprime cada solución en ft_ten_queens_puzzle?',
          'En ft_ten_queens_puzzle, ¿qué pinta tiene cada línea que sale?',
        ],
        right: [
          'Diez cifras: la fila de la dama de cada columna',
          'Una línea de 10 cifras, una por columna',
        ],
        wrong: [
          'Un tablero de 10 × 10 con puntos y Q',
          'Las coordenadas de cada dama, con comas',
          'Un número del 0 al 723 por solución',
          'Diez letras de la A a la J, una por fila',
        ],
      },
    ],
    wrong: ['92', '512', '1024'],
    why: 'Hay 724 maneras de colocar diez damas; cada una se escribe como 10 cifras, la posición de la dama en cada columna, y la función devuelve cuántas hay.',
  },
  {
    id: 'pis-c05-recursion-stack',
    topic: 'recursividad',
    needs: { projects: C05 },
    kind: 'long',
    level: 2,
    code: 'int f(int n)\n{\n    if (n == 0)\n        return (0);\n    return (1 + f(n - 1));\n}',
    forms: [
      {
        ask: ['¿Qué devuelve `f(4)`?', 'Con n = 4, ¿qué devuelve f?'],
        right: ['4'],
        wrong: ['0', '5', '10', '24'],
      },
      {
        ask: ['¿Qué pasa con `f(-1)`?', 'Si se llama con n = -1, ¿qué ocurre?'],
        right: [
          'Se llama sin fin hasta desbordar la pila',
          'Nunca llega a n == 0 y la pila se desborda',
        ],
        wrong: [
          'Devuelve -1, igual que f(4) da 4',
          'Devuelve 0 nada más entrar',
          'Devuelve 1 tras una sola llamada',
          'No compila con un número negativo',
        ],
      },
    ],
    wrong: ['0', '5', '10'],
    why: 'Cada llamada suma 1 y baja n; con -1 nunca llega al caso base n == 0, y cada llamada ocupa pila hasta que se acaba (segfault).',
  },
]

/** C 06: los argumentos de main. */
const C06_CONCEPTS: readonly Concept[] = [
  {
    id: 'pis-c06-program-name',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'long',
    level: 1,
    code: 'int main(int argc, char **argv)\n{\n    (void)argc;\n    ft_putstr(argv[0]);\n    return (0);\n}\n\n/* $ ./a.out hola mundo */',
    forms: [
      {
        ask: ['¿Qué imprime?', '¿Cuál es la salida de esta orden?'],
        right: ['./a.out'],
        wrong: ['hola', './a.out hola mundo', 'hola mundo', 'a.out'],
      },
      {
        ask: ['¿Qué guarda argv[0]?', '¿Qué hay en el primer elemento de argv?'],
        right: [
          'El nombre con que se lanzó el programa',
          'La orden tal como se escribió para lanzarlo',
        ],
        wrong: [
          'El primer argumento tras el nombre',
          'El número de argumentos, como texto',
          'La ruta del directorio actual',
          'NULL si no se le pasa ningún argumento',
        ],
      },
    ],
    wrong: ['hola', 'hola mundo', 'a.out'],
    why: 'argv[0] es el nombre del programa tal como se escribió en la shell (aquí ./a.out); los argumentos empiezan en argv[1].',
  },
  {
    id: 'pis-c06-argc-count',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Cuánto vale argc si lanzas el programa sin argumentos?',
          'Con `./a.out` a secas, ¿cuánto vale argc?',
        ],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: [
          '¿Cuánto vale argc con `./a.out "hola mundo" 42`?',
          'Si lanzas `./a.out "hola mundo" 42`, ¿qué valor tiene argc?',
        ],
        right: ['3'],
        wrong: ['4', '2', '5'],
      },
    ],
    wrong: ['0', '2', '4'],
    why: 'argc cuenta también el nombre del programa, y lo que va entre comillas es un solo argumento: «hola mundo» cuenta como uno.',
  },
  {
    id: 'pis-c06-argv-null',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hay en argv[argc]?', 'Justo después del último argumento, ¿qué guarda argv?'],
        right: ['NULL', 'Un puntero nulo'],
        wrong: [
          'El último argumento',
          'Una cadena vacía ""',
          'Basura: está fuera del array',
          'El nombre del programa',
        ],
      },
    ],
    wrong: ["Un carácter '\\0'", 'El valor de argc'],
    why: 'La norma de C garantiza que argv[argc] es un puntero nulo: por eso se puede recorrer argv hasta encontrar NULL.',
  },
  {
    id: 'pis-c06-print-params',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'long',
    level: 2,
    code: 'int main(int argc, char **argv)\n{\n    int i;\n\n    i = 1;\n    while (i < argc)\n    {\n        ft_putstr(argv[i]);\n        ft_putstr("\\n");\n        i++;\n    }\n    return (0);\n}\n\n/* $ ./a.out "a b" c */',
    forms: [
      {
        ask: ['¿Cuántas líneas imprime?', '¿Cuántas líneas salen con esa orden?'],
        right: ['2'],
        wrong: ['3', '4', '1'],
      },
      {
        ask: ['¿Qué sale en la primera línea?', '¿Qué imprime en la primera línea?'],
        right: ['a b'],
        wrong: ['./a.out', 'a', '"a b"', 'b'],
      },
    ],
    wrong: ['3', '4', '1'],
    why: 'Empieza en argv[1], así que no imprime el nombre; las comillas juntan «a b» en un solo argumento y la shell se las quita.',
  },
  {
    id: 'pis-c06-rev-params',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'long',
    level: 2,
    code: 'int main(int argc, char **argv)\n{\n    int i;\n\n    i = argc - 1;\n    while (i >= 0)\n    {\n        ft_putstr(argv[i]);\n        ft_putstr("\\n");\n        i--;\n    }\n    return (0);\n}\n\n/* $ ./a.out x y z */',
    forms: [
      {
        ask: ['¿Qué imprime en la última línea?', '¿Qué sale lo último?'],
        right: ['./a.out'],
        wrong: ['x', 'z', '(null)'],
      },
      {
        ask: [
          '¿Qué hay que cambiar para que haga lo que pide ft_rev_params?',
          '¿Cómo se arregla este ft_rev_params?',
        ],
        right: ['Parar en i > 0 para no imprimir argv[0]', 'Cambiar i >= 0 por i >= 1 en el while'],
        wrong: [
          'Empezar en i = argc, no en argc - 1',
          'Empezar en i = 1 y sumar en vez de restar',
          'Imprimir argv[i - 1] en vez de argv[i]',
          'Nada: ft_rev_params incluye argv[0]',
        ],
      },
    ],
    wrong: ['x', 'z', '(null)'],
    why: 'Con i >= 0 llega hasta argv[0] e imprime también el nombre del programa, que ft_rev_params no tiene que sacar.',
  },
  {
    id: 'pis-c06-sort-ascii',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'ft_sort_params recibe `b A a B`. ¿En qué orden los imprime?',
          '¿Cómo quedan ordenados `b A a B` en orden ASCII?',
        ],
        right: ['A, B, a, b'],
        wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
      },
      {
        ask: [
          '¿Por qué "Zoo" sale antes que "abeja" en ft_sort_params?',
          'En orden ASCII, ¿por qué "Zoo" va delante de "abeja"?',
        ],
        right: [
          'Las mayúsculas tienen códigos ASCII menores',
          "Porque 'Z' es 90 y 'a' es 97 en ASCII",
        ],
        wrong: [
          'Porque es la más corta de las dos',
          'Porque se ordena de la Z a la A',
          'Porque las mayúsculas van siempre al final',
          'Porque ordena sin mirar mayúsculas',
        ],
      },
    ],
    wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
    why: 'Se compara con los códigos ASCII, como ft_strcmp: todas las mayúsculas (65 a 90) van antes que las minúsculas (97 a 122).',
  },
  {
    id: 'pis-c06-main-proto',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Con qué prototipo recibe main los argumentos?',
          'Para leer los argumentos de la orden, ¿cómo se declara main?',
        ],
        right: ['`int main(int argc, char **argv)`', '`int main(int argc, char *argv[])`'],
        wrong: [
          '`void main(char **argv)`',
          '`int main(char **argv, int argc)`',
          '`int main(int argc, char *argv)`',
          '`char **main(int argc)`',
        ],
      },
    ],
    wrong: ['`int main(int *argc, char **argv)`', '`int main(char argv[])`'],
    why: 'main recibe primero argc (cuántos hay) y luego argv (un array de cadenas), y devuelve un int.',
  },
  {
    id: 'pis-c06-argv-type',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿De qué tipo es argv[1]?', 'En main, ¿qué tipo tiene cada argv[i]?'],
        right: ['`char *`'],
        wrong: ['`char`', '`char **`', '`int`', '`int *`'],
      },
      {
        ask: ['¿Qué es `argv[1][0]`?', '¿Qué guarda `argv[1][0]`?'],
        right: ['La primera letra del primer argumento', 'El primer char del primer argumento'],
        wrong: [
          'El primer argumento entero',
          'El nombre del programa',
          'La primera letra del nombre del programa',
          'El número de argumentos',
        ],
      },
    ],
    wrong: ['`char`', '`char **`', '`int`'],
    why: 'argv es un array de cadenas: argv[1] es una cadena (char *) y argv[1][0], su primer carácter.',
  },
  {
    id: 'pis-c06-argv-numbers',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Si lanzas `./a.out 42`, ¿qué llega en argv[1]?',
          'Con `./a.out 42`, ¿qué tipo de dato es lo que recibe el programa?',
        ],
        right: ['La cadena "42"', "Los chars '4', '2' y un '\\0'"],
        wrong: [
          'El int 42',
          'El número 42 ya convertido',
          "El char de código 42, '*'",
          'Un puntero al int 42',
        ],
      },
    ],
    wrong: ['Un long con el valor 42', 'Un float con 42.0'],
    why: 'Los argumentos llegan siempre como texto; para usarlos como número hay que convertirlos, por ejemplo con ft_atoi.',
  },
  {
    id: 'pis-c06-sort-swap',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'long',
    level: 3,
    code: 'char *tmp;\n\nif (ft_strcmp(argv[i], argv[i + 1]) > 0)\n{\n    tmp = argv[i];\n    argv[i] = argv[i + 1];\n    argv[i + 1] = tmp;\n}',
    forms: [
      {
        ask: ['¿Qué intercambia este trozo?', '¿Qué se mueve al hacer el cambio?'],
        right: ['Los punteros de dos argumentos', 'Las direcciones de las dos cadenas'],
        wrong: [
          'Las letras de las dos cadenas, una a una',
          'Solo el primer carácter de cada cadena',
          'Los valores de i e i + 1',
          'Las longitudes de las dos cadenas',
        ],
      },
      {
        ask: ['¿Cuándo los intercambia?', '¿En qué caso entra en el if?'],
        right: [
          'Cuando argv[i] va después que argv[i + 1]',
          'Cuando las dos están en orden ASCII al revés',
        ],
        wrong: [
          'Cuando argv[i] es más larga que la siguiente',
          'Cuando argv[i] va antes que argv[i + 1]',
          'Cuando las dos cadenas son iguales',
          'Cuando la primera empieza por mayúscula',
        ],
      },
    ],
    wrong: [
      'Los valores de i e i + 1',
      'Las longitudes de las dos cadenas',
      'Solo el primer carácter de cada cadena',
    ],
    why: 'ft_strcmp da más de 0 si la primera va después; entonces se cambian los punteros de argv, sin copiar ninguna letra.',
  },
  {
    id: 'pis-c06-argv-loop',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'long',
    level: 2,
    code: 'i = 1;\nwhile (argv[i])\n    i++;\n\n/* $ ./a.out x y */',
    forms: [
      {
        ask: ['¿Cuánto vale i al acabar?', 'Al salir del bucle, ¿qué vale i?'],
        right: ['3'],
        wrong: ['2', '4', '1'],
      },
      {
        ask: ['¿Por qué termina este bucle?', '¿Qué hace que el while pare?'],
        right: ['Porque argv[argc] es NULL', 'Porque argv acaba en un puntero nulo'],
        wrong: [
          "Porque cada argumento acaba en '\\0'",
          'Porque i llega a argc y el while lo sabe',
          'Porque se sale del array y da segfault',
          'Porque argv[i] vale 0 cuando i llega a 10',
        ],
      },
    ],
    wrong: ['2', '4', '1'],
    why: 'argv[0] es ./a.out, argv[1] x, argv[2] y y argv[3] es NULL: el bucle para con i = 3, que es argc.',
  },
  {
    id: 'pis-c06-program',
    topic: 'argumentos',
    needs: { projects: C06 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué se entrega en los ejercicios del C 06?',
          'A diferencia del C 05, en el C 06 entregas…',
        ],
        right: ['Un programa entero, con su main', 'Un .c con su main, que se compila solo'],
        wrong: [
          'Solo la función, sin ningún main',
          'Un Makefile y una librería .a',
          'Un script de shell que lo lanza',
          'Una cabecera .h con el prototipo',
        ],
      },
    ],
    wrong: ['Un main vacío y la función aparte', 'El ejecutable ya compilado'],
    why: 'Los ejercicios del C 06 piden programas: el main lee argc y argv y se compila él solo.',
  },
]

/** C 07: memoria dinámica. */
const C07_CONCEPTS: readonly Concept[] = [
  {
    id: 'pis-c07-strdup',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 2,
    code: "char *ft_strdup(char *src)\n{\n    char *dup;\n    int  i;\n\n    dup = malloc(sizeof(char) * (ft_strlen(src) + 1));\n    if (!dup)\n        return (NULL);\n    i = 0;\n    while (src[i])\n    {\n        dup[i] = src[i];\n        i++;\n    }\n    dup[i] = '\\0';\n    return (dup);\n}",
    forms: [
      {
        ask: [
          'Con src = "Madrid", ¿cuántos bytes pide a malloc?',
          '¿Cuántos bytes reserva para "Madrid"?',
        ],
        right: ['7'],
        wrong: ['6', '8', '1'],
      },
      {
        ask: ['¿Para qué sirve el `if (!dup)`?', '¿Qué comprueba `if (!dup)`?'],
        right: [
          'Para devolver NULL si malloc no pudo reservar',
          'Para no escribir en memoria si malloc falló',
        ],
        wrong: [
          'Para no copiar si src es una cadena vacía',
          'Para liberar dup si ya estaba reservado',
          'Para comprobar que src no sea NULL',
          'Para saber si src y dup son iguales',
        ],
      },
      {
        ask: [
          "¿Qué pasa si se quita `dup[i] = '\\0'`?",
          "Sin la línea `dup[i] = '\\0'`, ¿qué ocurre?",
        ],
        right: ["La copia se queda sin su '\\0' final"],
        wrong: [
          'Nada: malloc deja la memoria a cero',
          'Se pierde la última letra de la copia',
          'Hay una fuga de memoria al volver',
        ],
      },
    ],
    wrong: ['6', '8', '1'],
    why: "malloc reserva strlen + 1 bytes (el último, para el '\\0') y no los pone a cero; si falla, devuelve NULL y no hay que escribir.",
  },
  {
    id: 'pis-c07-range',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuántos ints tiene el array de `ft_range(3, 7)`?',
          '¿Cuántos números devuelve `ft_range(3, 7)`?',
        ],
        right: ['4'],
        wrong: ['5', '3', '7'],
      },
      {
        ask: [
          '¿Qué devuelve `ft_range(5, 5)`?',
          'Si min y max son iguales, ¿qué devuelve ft_range?',
        ],
        right: ['NULL', 'Un puntero nulo'],
        wrong: [
          'Un array con el 5',
          'Un array vacío de tamaño 0',
          'El número 0',
          'Un array con 5 y 5',
        ],
      },
    ],
    wrong: ['5', '3', '7'],
    why: 'ft_range va de min incluido a max sin incluir (3, 4, 5 y 6); si min >= max, devuelve NULL.',
  },
  {
    id: 'pis-c07-range-bytes',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 2,
    code: 'int *ft_range(int min, int max)\n{\n    int *tab;\n    int i;\n\n    if (min >= max)\n        return (NULL);\n    tab = malloc(sizeof(int) * (max - min));\n    /* ... */\n}\n\nft_range(-2, 3);',
    forms: [
      {
        ask: [
          '¿Cuántos bytes pide a malloc, con int de 4 bytes?',
          'Con int de 4 bytes, ¿cuántos bytes reserva?',
        ],
        right: ['20'],
        wrong: ['12', '5', '24', '16'],
      },
      {
        ask: ['¿Cuál es el último número del array?', '¿Qué valor queda en la última casilla?'],
        right: ['2'],
        wrong: ['3', '1', '4'],
      },
    ],
    wrong: ['12', '24', '3'],
    why: 'De -2 a 3 sin incluir el 3 hay 5 números (-2, -1, 0, 1 y 2), y 5 × sizeof(int) son 20 bytes.',
  },
  {
    id: 'pis-c07-ultimate-range',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Si min >= max, ¿qué hace ft_ultimate_range?',
          'Con min >= max, ¿cómo acaba ft_ultimate_range?',
        ],
        right: ['Pone *range a NULL y devuelve 0'],
        wrong: [
          'Pone *range a NULL y devuelve -1',
          'Deja *range como estaba y devuelve 0',
          'Reserva un int y devuelve 1',
          'Devuelve max - min, que es negativo',
        ],
      },
      {
        ask: [
          'Si malloc falla, ¿qué devuelve ft_ultimate_range?',
          'Cuando malloc no puede reservar, ¿qué devuelve ft_ultimate_range?',
        ],
        right: ['Devuelve -1'],
        wrong: ['Devuelve 0', 'Devuelve NULL', 'Devuelve el tamaño pedido'],
      },
      {
        ask: [
          '¿Por qué ft_ultimate_range recibe `int **range`?',
          '¿Para qué es el doble puntero de ft_ultimate_range?',
        ],
        right: [
          'Para dejar en *range el array que reserva',
          'Para cambiar el puntero de quien la llama',
        ],
        wrong: [
          'Porque devuelve un array de dos dimensiones',
          'Para que range sea de solo lectura',
          'Porque cada número va en su propio malloc',
          'Para recibir min y max dentro de range',
        ],
      },
    ],
    wrong: ['Devuelve 0', 'Devuelve NULL', 'Devuelve el tamaño pedido'],
    why: 'ft_ultimate_range devuelve el tamaño y deja el array en *range: por eso recibe la dirección del puntero; si min >= max, *range = NULL y 0; si malloc falla, -1.',
  },
  {
    id: 'pis-c07-strjoin',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 3,
    code: 'char *strs[] = {"a", "b", "c"};\n\nft_strjoin(3, strs, ", ");',
    forms: [
      {
        ask: ['¿Qué cadena devuelve?', '¿Qué devuelve esta llamada?'],
        right: ['a, b, c'],
        wrong: ['a, b, c,', 'abc', ', a, b, c', 'a,b,c'],
      },
      {
        ask: [
          '¿Cuántos bytes hay que reservar para el resultado?',
          '¿Cuántos bytes pide el malloc justo?',
        ],
        right: ['8'],
        wrong: ['7', '9', '10', '6'],
      },
      {
        ask: [
          'Con size = 0, ¿qué devuelve ft_strjoin?',
          'Si size vale 0, ¿qué tiene que devolver?',
        ],
        right: [
          'Una cadena vacía que se puede pasar a free',
          'Un "" reservado con malloc, que se libera',
        ],
        wrong: [
          'NULL, porque no hay nada que juntar',
          'El separador, sin ninguna cadena',
          'Un puntero a strs[0], sin copiarla',
          'Una cadena con un solo espacio',
        ],
      },
    ],
    wrong: ['7', '9', '10'],
    why: "El separador va solo entre cadenas, no al final: 3 letras, 2 separadores de 2 y el '\\0' son 8 bytes; con size 0 se devuelve una cadena vacía reservada.",
  },
  {
    id: 'pis-c07-split',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 3,
    code: 'char **tab;\n\ntab = ft_split("  hola,mundo  42", " ,");',
    forms: [
      {
        ask: ['¿Cuántas palabras devuelve?', '¿Cuántas cadenas hay en tab antes del final?'],
        right: ['3'],
        wrong: ['4', '2', '5', '6'],
      },
      {
        ask: ['¿Qué hay en la última casilla de tab?', '¿Con qué acaba el array tab?'],
        right: ['Un puntero nulo (0)', 'NULL, que marca el final'],
        wrong: [
          'La cadena "42"',
          'Una cadena vacía ""',
          'La cadena " ," del separador',
          'La cadena "mundo  42"',
        ],
      },
      {
        ask: [
          '¿Cómo trata ft_split su segundo argumento, " ,"?',
          '¿Qué significa " ," para ft_split?',
        ],
        right: ['Como un conjunto: cada carácter separa', "Como dos separadores, ' ' y ','"],
        wrong: [
          'Como un único separador de dos caracteres',
          'Como el texto exacto que hay que buscar',
          'Solo usa el primero, el espacio',
          'Como una expresión regular',
        ],
      },
    ],
    wrong: ['4', '2', '5'],
    why: 'Cada carácter de la cadena de separadores corta, y los separadores seguidos no dan palabras vacías: salen hola, mundo y 42, y el array acaba con un puntero a 0.',
  },
  {
    id: 'pis-c07-split-free',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cómo se libera todo lo que devuelve ft_split?',
          'Para no tener fugas con el resultado de ft_split, ¿qué hay que liberar?',
        ],
        right: [
          'Un free por palabra y luego otro para el array',
          'Primero cada palabra y al final el array',
        ],
        wrong: [
          'Un solo free del array, que lo libera todo',
          'Primero el array y luego cada palabra',
          'free(*tab), que libera todas las palabras',
          'Nada: las palabras son cadenas literales',
        ],
      },
    ],
    wrong: ['Solo la última palabra, la del NULL', 'Un free por palabra, sin el array'],
    why: 'Cada palabra es un malloc y el array es otro: se liberan las palabras y después el array, que si va primero ya no se puede leer.',
  },
  {
    id: 'pis-c07-malloc-size',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 2,
    code: 'int *tab;\n\ntab = malloc(5);\n/* se usan tab[0] ... tab[4] */',
    forms: [
      {
        ask: ['¿Qué falla?', '¿Qué error tiene esta reserva?'],
        right: ['Reserva 5 bytes, no 5 ints', 'Debería ser malloc(sizeof(int) * 5)'],
        wrong: [
          'malloc no puede reservar ints',
          'Falta poner tab a NULL antes',
          'Debería ser malloc(sizeof(tab))',
          'Hay que castear: (int)malloc(5)',
        ],
      },
      {
        ask: ['¿Cuántos bytes reserva?', '¿Cuántos bytes hay en tab?'],
        right: ['5'],
        wrong: ['20', '40', '4'],
      },
    ],
    wrong: ['20', '40', '4'],
    why: 'malloc cuenta bytes, no elementos: para 5 ints hay que pedir 5 × sizeof(int), que suelen ser 20.',
  },
  {
    id: 'pis-c07-leak',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 2,
    code: 'char *s;\n\ns = ft_strdup("hola");\ns = ft_strdup("mundo");\nfree(s);',
    forms: [
      {
        ask: ['¿Qué falla en este código?', '¿Qué problema tiene?'],
        right: [
          'Se pierde el primer malloc: hay una fuga',
          'La copia de "hola" no se libera nunca',
        ],
        wrong: [
          'Libera "mundo" dos veces: doble free',
          'Escribe fuera de la memoria reservada',
          'No falla nada: el último free basta',
          'ft_strdup no se puede llamar dos veces',
        ],
      },
      {
        ask: ['¿Cuántos bytes se quedan sin liberar?', '¿Cuántos bytes pierde?'],
        right: ['5'],
        wrong: ['4', '6', '11', '0'],
      },
    ],
    wrong: ['4', '6', '11'],
    why: 'Al reasignar s se pierde la única dirección de la copia de "hola" (5 bytes con el \'\\0\'): ya nadie puede liberarla.',
  },
  {
    id: 'pis-c07-convert-base',
    topic: 'bases',
    needs: { projects: C07 },
    kind: 'long',
    level: 3,
    code: 'ft_convert_base("ff", "0123456789abcdef", "01");\nft_convert_base("-10", "0123456789", "0123456789ABCDEF");',
    forms: [
      {
        ask: [
          '¿Qué devuelve la primera llamada?',
          'Pasado de hexadecimal a binario, ¿qué devuelve?',
        ],
        right: ['11111111'],
        wrong: ['255', '1111111', '111111111', '11110000'],
      },
      {
        ask: [
          '¿Qué devuelve la segunda llamada?',
          'Pasado de decimal a hexadecimal, ¿qué devuelve?',
        ],
        right: ['-A'],
        wrong: ['A', '-a', 'A-', '-F'],
      },
      {
        ask: [
          'Si alguna de las dos bases no es válida, ¿qué devuelve ft_convert_base?',
          'Con una base inválida, ¿qué devuelve ft_convert_base?',
        ],
        right: ['NULL'],
        wrong: ['La cadena "0"', 'nbr sin cambiar', 'Una cadena vacía'],
      },
    ],
    wrong: ['255', '1111111', '11110000'],
    why: 'ft_convert_base lee nbr en base_from y lo escribe, reservado con malloc, en base_to: ff es 255, que en binario es 11111111, y -10 es -A; si una base no vale, NULL.',
  },
  {
    id: 'pis-c07-char-pp',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué es el `char **` que devuelve ft_split?',
          'Un `char **` usado como en ft_split es…',
        ],
        right: ['Un array de punteros a cadenas', 'Un puntero a punteros a char'],
        wrong: [
          'Una cadena el doble de larga',
          'Un array fijo de char[10][10]',
          'Un puntero a un solo char',
          'Un char que ocupa dos bytes',
        ],
      },
    ],
    wrong: ['Un array de int', 'Un puntero a función'],
    why: 'Cada casilla de un char ** es un char *, una cadena: es un array de cadenas, como argv.',
  },
  {
    id: 'pis-c07-use-after-free',
    topic: 'memoria',
    needs: { projects: C07 },
    kind: 'long',
    level: 3,
    code: 'char *s;\n\ns = ft_strdup("42");\nfree(s);\ns[0] = \'X\';',
    forms: [
      {
        ask: ['¿Qué falla en estas líneas?', '¿Qué error hay?'],
        right: ['Escribe en memoria ya liberada', 'Usa s después de free'],
        wrong: [
          'Hay una fuga: falta otro free',
          'Un literal no se puede cambiar',
          'Hay un doble free de s',
          'No falla nada: s sigue ahí',
        ],
      },
    ],
    wrong: ['ft_strdup devuelve NULL', 'Falta un cast a char'],
    why: 'Tras free(s) la memoria ya no es tuya aunque s siga guardando la dirección: escribir ahí es comportamiento indefinido.',
  },
]

export const PISCINE_C04_C07: readonly Concept[] = [
  ...C04_CONCEPTS,
  ...C05_CONCEPTS,
  ...C06_CONCEPTS,
  ...C07_CONCEPTS,
]
