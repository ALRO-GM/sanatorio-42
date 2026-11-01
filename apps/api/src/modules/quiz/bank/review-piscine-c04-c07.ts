/** Repaso de Not-games: la piscina, C 04 a C 07. */

import type { ReviewEntry } from './types.js'

export const REVIEW_PISCINE_C04_C07: Record<string, ReviewEntry> = {
  'pis-c04-strlen': {
    title: 'ft_strlen',
    definition:
      "Recorre la cadena con un índice hasta encontrar el '\\0' y devuelve cuántos caracteres ha pasado, sin contar el '\\0'. Los espacios cuentan como cualquier otro carácter.",
    example: 'ft_strlen("42 Madrid") = 9; ft_strlen("") = 0.',
  },
  'pis-c04-putstr': {
    title: "ft_putstr y el '\\0'",
    definition:
      "ft_putstr escribe carácter a carácter hasta el primer '\\0'. Si hay un '\\0' en medio de un literal, para la función la cadena acaba ahí.",
    example: 'ft_putstr("ab\\0cd") imprime ab.',
  },
  'pis-c04-putnbr-intmin': {
    title: 'ft_putnbr e INT_MIN',
    definition:
      'Para imprimir un negativo se suele cambiar de signo, pero -2147483648 no tiene opuesto en un int de 32 bits: nb = -nb se desborda. Hay que tratarlo aparte o copiar nb a un long.',
    example: 'if (nb == -2147483648) { write(1, "-2147483648", 11); return ; }',
  },
  'pis-c04-putnbr-order': {
    title: 'Imprimir las cifras en orden',
    definition:
      'nb % 10 da la última cifra y nb / 10 quita esa cifra. Para que salgan en orden, primero se imprime recursivamente nb / 10 y después la última cifra.',
    example: "if (nb >= 10) ft_putnbr(nb / 10); ft_putchar(nb % 10 + '0');",
  },
  'pis-c04-atoi-signs': {
    title: 'Los signos en ft_atoi',
    definition:
      "El ft_atoi de la piscina salta blancos, luego lee cualquier cantidad de '+' y '-' (si los '-' son impares, el número es negativo) y después cifras, hasta el primer carácter que no lo sea.",
    example: 'ft_atoi(" ---+--+1234ab567") = -1234 (cinco \'-\').',
  },
  'pis-c04-atoi-spaces': {
    title: 'Los blancos que salta ft_atoi',
    definition:
      'Antes de los signos, ft_atoi ignora los mismos blancos que isspace: el espacio, \\t, \\n, \\v, \\f y \\r (los códigos 32 y del 9 al 13).',
    example: 'ft_atoi("\\t\\n  42") = 42.',
  },
  'pis-c04-base-valid': {
    title: 'Una base válida',
    definition:
      'En ft_putnbr_base y ft_atoi_base una base no vale si está vacía, tiene un solo carácter, repite alguno o contiene + o -. Con una base inválida, ft_putnbr_base no imprime nada.',
    example: '"01" y "poneyvif" valen; "0", "0120" y "01+" no.',
  },
  'pis-c04-base-convert': {
    title: 'Escribir un número en otra base',
    definition:
      'La longitud de la base es cuántas cifras hay, y cada carácter vale su posición. Se divide el número por la longitud una y otra vez y los restos, leídos al revés, son las cifras.',
    example: '10 en "01" es 1010; 255 en "0123456789ABCDEF" es FF.',
  },
  'pis-c04-atoi-base': {
    title: 'ft_atoi_base',
    definition:
      'Como ft_atoi, pero cada cifra es la posición de su carácter en la base: se multiplica lo acumulado por la longitud de la base y se suma la cifra. Con una base inválida devuelve 0.',
    example: 'ft_atoi_base("101", "01") = 5; ft_atoi_base("-ff", "0123456789abcdef") = -255.',
  },
  'pis-c04-intmin-value': {
    title: 'INT_MIN e INT_MAX',
    definition:
      'Un int de 32 bits va de -2147483648 (INT_MIN) a 2147483647 (INT_MAX). Hay un negativo más que positivos, por eso INT_MIN no tiene opuesto.',
    example: 'ft_putnbr(-2147483648) tiene que imprimir el signo y 10 cifras.',
  },
  'pis-c04-base-poney': {
    title: 'La base «poneyvif»',
    definition:
      'Una base no tiene por qué usar cifras: con "poneyvif" hay 8 caracteres, así que es base 8, y cada letra vale su posición (p = 0, o = 1… f = 7).',
    example: 'El 8 en "poneyvif" es op (1 × 8 + 0); el 5 es v.',
  },
  'pis-c04-octal': {
    title: 'Octal',
    definition:
      'Base 8: cifras del 0 al 7, y cada posición vale 8 veces la de su derecha. Para pasar a octal se divide entre 8 y se leen los restos al revés.',
    example: '42 = 5 × 8 + 2, así que es 52 en octal. El octal 17 es 8 + 7 = 15.',
  },
  'pis-c04-base-sign': {
    title: 'Por qué una base no lleva signos',
    definition:
      "ft_atoi_base lee '+' y '-' como signo antes de las cifras. Si fueran también cifras de la base, no se sabría cómo leerlos, así que esa base es inválida.",
    example: 'Con la base "-01", "-1" podría ser -1 o el número 01.',
  },
  'pis-c05-fact-iter': {
    title: 'ft_iterative_factorial',
    definition:
      'El factorial de n es n × (n - 1) × … × 1. Por definición 0! vale 1, y el enunciado pide devolver 0 si nb es negativo.',
    example: '5! = 120; 0! = 1; ft_iterative_factorial(-3) = 0.',
  },
  'pis-c05-fact-rec': {
    title: 'El caso base del factorial recursivo',
    definition:
      'La versión recursiva devuelve nb × f(nb - 1) y necesita un caso base que pare: si solo cubre nb == 1, con 0 baja a -1, que devuelve 0, y el resultado sale 0 en vez de 1.',
    example: 'if (nb == 0 || nb == 1) return (1);',
  },
  'pis-c05-power': {
    title: 'ft_iterative_power',
    definition:
      'Multiplica nb por sí mismo power veces. El enunciado pide que una potencia negativa devuelva 0 y que 0 elevado a 0 valga 1.',
    example: 'ft_iterative_power(2, 10) = 1024; (0, 0) = 1; (5, -2) = 0.',
  },
  'pis-c05-power-rec': {
    title: 'Llamadas de una función recursiva',
    definition:
      'Cada llamada de ft_recursive_power baja power en 1 hasta llegar al caso base power == 0. Con power = n hay n + 1 llamadas, contando la primera.',
    example: '(3, 4) → (3, 3) → (3, 2) → (3, 1) → (3, 0): 5 llamadas y 81.',
  },
  'pis-c05-fib': {
    title: 'ft_fibonacci',
    definition:
      'Cada término es la suma de los dos anteriores: fib(0) = 0, fib(1) = 1. El enunciado pide -1 para un índice negativo.',
    example: '0, 1, 1, 2, 3, 5, 8, 13: ft_fibonacci(7) = 13.',
  },
  'pis-c05-fib-cost': {
    title: 'El coste del fibonacci recursivo',
    definition:
      'fib(n) llama a fib(n - 1) y a fib(n - 2), y cada una vuelve a abrirse en dos: muchos cálculos se repiten y las llamadas crecen de forma exponencial.',
    example: 'fib(40) hace cientos de millones de llamadas; con un bucle son 40 pasos.',
  },
  'pis-c05-sqrt': {
    title: 'ft_sqrt',
    definition:
      'Devuelve la raíz cuadrada entera de nb si es exacta (nb es un cuadrado perfecto). Si no lo es, o si nb es negativo, devuelve 0.',
    example: 'ft_sqrt(49) = 7; ft_sqrt(50) = 0; ft_sqrt(-16) = 0.',
  },
  'pis-c05-sqrt-overflow': {
    title: 'Desbordamiento en ft_sqrt',
    definition:
      'Si se prueba i * i < nb con nb cerca de INT_MAX, i llega a 46341 y su cuadrado ya no cabe en un int. Se evita comparando i <= nb / i o usando un long.',
    example: '46340 × 46340 = 2147395600 cabe; 46341 × 46341 ya no.',
  },
  'pis-c05-prime': {
    title: 'ft_is_prime y los menores que 2',
    definition:
      'Un primo es un número mayor que 1 que solo se divide entre 1 y él mismo. Ni 0, ni 1, ni los negativos son primos: hay que devolver 0 para ellos antes del bucle.',
    example: 'if (nb < 2) return (0); — sin eso, ft_is_prime(1) daría 1.',
  },
  'pis-c05-prime-sqrt': {
    title: 'Probar divisores hasta la raíz',
    definition:
      'Si n tiene un divisor mayor que √n, tiene otro menor que √n. Basta probar los i con i * i <= n, que es mucho más rápido que llegar a n.',
    example: 'Para 97 basta probar de 2 a 9 (10 × 10 = 100 > 97).',
  },
  'pis-c05-next-prime': {
    title: 'ft_find_next_prime',
    definition:
      'Devuelve el primer primo mayor o igual que nb: si nb ya es primo, nb mismo. Por debajo de 2, el siguiente primo es 2.',
    example: 'ft_find_next_prime(14) = 17; (17) = 17; (-5) = 2.',
  },
  'pis-c05-queens': {
    title: 'Las diez damas',
    definition:
      'ft_ten_queens_puzzle coloca diez damas en un tablero de 10 × 10 sin que se ataquen, con backtracking. Imprime cada solución como 10 cifras (la fila de la dama en cada columna) y devuelve cuántas hay: 724.',
    example: 'Una línea de salida: 0257948136.',
  },
  'pis-c05-recursion-stack': {
    title: 'La pila de llamadas',
    definition:
      'Cada llamada a una función ocupa un trozo de pila hasta que vuelve. Si una recursión no llega nunca a su caso base, las llamadas se acumulan hasta que la pila se acaba y el programa cae.',
    example: 'f(-1) con caso base n == 0 baja a -2, -3… hasta un segfault.',
  },
  'pis-c06-program-name': {
    title: 'argv[0]',
    definition:
      'argv[0] es el nombre del programa tal como se escribió para lanzarlo; ft_print_program_name lo imprime. Los argumentos de verdad empiezan en argv[1].',
    example: 'Con ./a.out hola, argv[0] es "./a.out" y argv[1] es "hola".',
  },
  'pis-c06-argc-count': {
    title: 'argc',
    definition:
      'argc es cuántos elementos tiene argv, contando el nombre del programa: sin argumentos vale 1. Lo que va entre comillas en la shell es un solo argumento.',
    example: './a.out "hola mundo" 42 → argc = 3.',
  },
  'pis-c06-argv-null': {
    title: 'argv[argc] es NULL',
    definition:
      'Tras el último argumento, argv tiene siempre un puntero nulo: argv[argc] == NULL. Se puede recorrer argv hasta NULL sin mirar argc.',
    example: 'Con ./a.out x, argv[0] = "./a.out", argv[1] = "x", argv[2] = NULL.',
  },
  'pis-c06-print-params': {
    title: 'ft_print_params',
    definition:
      'Imprime cada argumento en su línea desde argv[1], sin el nombre del programa. La shell junta lo que va entre comillas en un solo argumento y le quita las comillas.',
    example: './a.out "a b" c imprime «a b» y «c», en dos líneas.',
  },
  'pis-c06-rev-params': {
    title: 'ft_rev_params',
    definition:
      'Imprime los argumentos del último al primero, cada uno en su línea, sin el nombre del programa: se va de argc - 1 hasta 1, sin llegar a 0.',
    example: './a.out x y z imprime z, y y x.',
  },
  'pis-c06-sort-ascii': {
    title: 'Orden ASCII',
    definition:
      'ft_sort_params ordena los argumentos comparando sus caracteres por código ASCII, como ft_strcmp. Las mayúsculas (65-90) van antes que las minúsculas (97-122).',
    example: 'b A a B → A, B, a, b. "Zoo" va antes que "abeja".',
  },
  'pis-c06-main-proto': {
    title: 'El prototipo de main',
    definition:
      'Para recibir los argumentos, main se declara int main(int argc, char **argv): primero cuántos son y luego el array de cadenas. char *argv[] es lo mismo.',
    example: 'int main(int argc, char **argv) { ... return (0); }',
  },
  'pis-c06-argv-type': {
    title: 'Los tipos de argv',
    definition:
      'argv es un char **: un array de cadenas. argv[i] es una cadena (char *) y argv[i][j] es un carácter (char) de esa cadena.',
    example: 'Con ./a.out hola, argv[1][0] es la letra h.',
  },
  'pis-c06-argv-numbers': {
    title: 'Los argumentos son texto',
    definition:
      'Todo llega en argv como cadenas, también los números. Para operar con uno hay que convertirlo, por ejemplo con ft_atoi.',
    example: "./a.out 42 → argv[1] es \"42\", es decir '4', '2' y '\\0'.",
  },
  'pis-c06-sort-swap': {
    title: 'Ordenar argv cambiando punteros',
    definition:
      'Para ordenar los argumentos no se copian letras: se intercambian los punteros de argv cuando ft_strcmp dice que el primero va después del segundo.',
    example: 'tmp = argv[i]; argv[i] = argv[i + 1]; argv[i + 1] = tmp;',
  },
  'pis-c06-argv-loop': {
    title: 'Recorrer argv hasta NULL',
    definition:
      'Como argv[argc] es NULL, un while (argv[i]) para justo después del último argumento, y al acabar i vale argc.',
    example: 'Con ./a.out x y, el bucle para con i = 3.',
  },
  'pis-c06-program': {
    title: 'Programas en el C 06',
    definition:
      'Hasta el C 05 se entregan funciones sueltas; en el C 06 cada ejercicio es un programa completo, con su main, que la Moulinette compila y lanza con argumentos.',
    example: 'ex00/ft_print_program_name.c con un int main(int argc, char **argv).',
  },
  'pis-c07-strdup': {
    title: 'ft_strdup',
    definition:
      "Reserva con malloc strlen(src) + 1 bytes, comprueba que no sea NULL, copia los caracteres y pone el '\\0' final, porque malloc no deja la memoria a cero.",
    example: 'ft_strdup("Madrid") reserva 7 bytes.',
  },
  'pis-c07-range': {
    title: 'ft_range',
    definition:
      'Devuelve un array de ints reservado con malloc con los números de min (incluido) a max (sin incluir): max - min elementos. Si min >= max, devuelve NULL.',
    example: 'ft_range(3, 7) = {3, 4, 5, 6}; ft_range(5, 5) = NULL.',
  },
  'pis-c07-range-bytes': {
    title: 'Cuánto reserva ft_range',
    definition:
      'Hay max - min números y cada uno ocupa sizeof(int) bytes, así que se pide malloc(sizeof(int) * (max - min)). El último número es max - 1.',
    example: 'ft_range(-2, 3): 5 ints, 20 bytes, del -2 al 2.',
  },
  'pis-c07-ultimate-range': {
    title: 'ft_ultimate_range',
    definition:
      'Reserva el array como ft_range pero lo deja en *range (por eso recibe int **) y devuelve el tamaño. Si min >= max, pone *range a NULL y devuelve 0; si malloc falla, devuelve -1.',
    example: 'int *tab; int n = ft_ultimate_range(&tab, 0, 3); → n = 3, tab = {0, 1, 2}.',
  },
  'pis-c07-strjoin': {
    title: 'ft_strjoin',
    definition:
      'Junta size cadenas con el separador entre cada dos (no al final) en una cadena nueva reservada con malloc. Con size 0 devuelve una cadena vacía que se puede liberar.',
    example: 'ft_strjoin(3, {"a", "b", "c"}, ", ") = "a, b, c" (8 bytes con el \'\\0\').',
  },
  'pis-c07-split': {
    title: 'ft_split',
    definition:
      'Corta una cadena en palabras usando como separador cualquiera de los caracteres de charset. Los separadores seguidos no dan palabras vacías y el array acaba con un puntero a 0.',
    example: 'ft_split("  hola,mundo  42", " ,") = {"hola", "mundo", "42", 0}.',
  },
  'pis-c07-split-free': {
    title: 'Liberar un char **',
    definition:
      'Lo que devuelve ft_split son varias reservas: una por palabra y otra para el array. Se libera cada palabra y, al final, el array.',
    example: 'i = 0; while (tab[i]) free(tab[i++]); free(tab);',
  },
  'pis-c07-malloc-size': {
    title: 'malloc cuenta bytes',
    definition:
      'malloc recibe un número de bytes, no de elementos. Para n elementos de un tipo hay que multiplicar por su sizeof.',
    example: 'int *tab = malloc(sizeof(int) * 5); — 20 bytes con int de 4.',
  },
  'pis-c07-leak': {
    title: 'Fuga al reasignar un puntero',
    definition:
      'Si el único puntero a una reserva se sobrescribe sin liberarla antes, esa memoria ya no se puede liberar: es una fuga.',
    example: 'Bien hecho: s = ft_strdup("hola"); free(s); s = ft_strdup("mundo"); free(s);',
  },
  'pis-c07-convert-base': {
    title: 'ft_convert_base',
    definition:
      'Lee nbr en base_from (como ft_atoi_base) y devuelve, reservado con malloc, ese número escrito en base_to. Si alguna de las dos bases no vale, devuelve NULL.',
    example: 'ft_convert_base("ff", "0123456789abcdef", "01") = "11111111".',
  },
  'pis-c07-char-pp': {
    title: 'char ** como array de cadenas',
    definition:
      'Un char ** apunta al primero de varios char *, y cada uno apunta a una cadena. Así son argv y lo que devuelve ft_split.',
    example: 'char **tab: tab[0] es la primera palabra y tab[0][0] su primera letra.',
  },
  'pis-c07-use-after-free': {
    title: 'Usar memoria liberada',
    definition:
      'Después de free(p), p sigue guardando la dirección, pero esa memoria ya no es tuya: leer o escribir ahí es comportamiento indefinido. Se puede poner p = NULL tras el free.',
    example: 'free(s); s = NULL; — así un uso por error da NULL, no basura.',
  },
}
