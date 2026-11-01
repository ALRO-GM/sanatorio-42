/** Repaso de Not-games: la piscina, C 00 a C 03. */

import type { ReviewEntry } from './types.js'

export const REVIEW_PISCINE_C00_C03: Record<string, ReviewEntry> = {
  'pis-c00-putchar-write': {
    title: 'ft_putchar con write',
    definition:
      'write(fd, buf, count) escribe count bytes desde la dirección buf en el descriptor fd. Para un solo carácter: fd 1 (salida estándar), &c y 1. Está en unistd.h.',
    example: '#include <unistd.h>\nvoid ft_putchar(char c) { write(1, &c, 1); }',
  },
  'pis-c00-write-return': {
    title: 'Lo que devuelve write',
    definition:
      'write devuelve cuántos bytes ha escrito de verdad (puede ser menos de los pedidos) o -1 si falla. No devuelve el carácter ni el descriptor.',
    example: 'write(1, "hola", 4) devuelve 4; con un fd cerrado devuelve -1.',
  },
  'pis-c00-write-proto': {
    title: 'El prototipo de write',
    definition:
      'ssize_t write(int fd, const void *buf, size_t count): el fd primero, luego la dirección de los bytes (de cualquier tipo, por eso void *) y cuántos. Devuelve ssize_t porque puede ser -1.',
    example: 'int n = 42; write(1, &n, 1); compila: &n se convierte a const void *.',
  },
  'pis-c00-print-alphabet': {
    title: 'Recorrer letras con un char',
    definition:
      "Un char es un número pequeño: 'a' vale 97 y 'z' 122, así que se puede sumar, comparar y usar como contador de un while.",
    example: "c = 'a'; while (c <= 'z') { write(1, &c, 1); c++; } escribe el abecedario.",
  },
  'pis-c00-reverse-alphabet': {
    title: 'Los bordes de un bucle',
    definition:
      "Con < o > el valor del borde no entra; con <= o >= sí. Al recorrer al revés, while (c >= 'a') llega a la a y while (c > 'a') se queda en la b.",
    example: "c = 'z'; while (c >= 'a') { write(1, &c, 1); c--; } escribe zyx…a.",
  },
  'pis-c00-print-numbers': {
    title: 'La cifra y el carácter',
    definition:
      "El número 0 y el carácter '0' no son lo mismo: write escribe bytes, y el byte que se ve como 0 es el 48. Hay que escribir el carácter, no el número.",
    example: "c = '0'; while (c <= '9') { write(1, &c, 1); c++; } escribe 0123456789.",
  },
  'pis-c00-char-digit': {
    title: "Pasar de cifra a carácter con '0'",
    definition:
      "Las cifras van seguidas en ASCII desde '0' (48) hasta '9' (57): n + '0' da el carácter de la cifra n, y c - '0' da el número de un carácter cifra.",
    example: "char c = 7 + '0'; // '7'\nint n = '7' - '0'; // 7",
  },
  'pis-c00-is-negative': {
    title: 'ft_is_negative y el cero',
    definition:
      'ft_is_negative escribe N si n es negativo y P si es positivo o nulo: el 0 no es menor que 0, así que va por la rama del else.',
    example: 'ft_is_negative(-5) escribe N; ft_is_negative(0) y ft_is_negative(3) escriben P.',
  },
  'pis-c00-print-comb': {
    title: 'ft_print_comb',
    definition:
      'Escribe todas las combinaciones de tres cifras distintas en orden creciente (la primera menor que la segunda y esta que la tercera), separadas por coma y espacio: 120 en total.',
    example: '012, 013, 014, …, 019, 023, …, 789',
  },
  'pis-c00-print-comb2': {
    title: 'ft_print_comb2',
    definition:
      'Escribe todos los pares de números de dos cifras a y b con a < b, de 00 a 99, en orden: el segundo siempre es mayor, así que salen 4950 pares.',
    example: '00 01, 00 02, …, 00 99, 01 02, …, 98 99',
  },
  'pis-c00-putnbr-intmin': {
    title: 'INT_MIN en ft_putnbr',
    definition:
      'Un int de 32 bits va de -2147483648 a 2147483647: el menor no tiene positivo, y -n se desborda. Se trata aparte (escribiéndolo tal cual) o se pasa el número a long.',
    example: 'if (n == -2147483648) { write(1, "-2147483648", 11); return; }',
  },
  'pis-c00-putnbr-code': {
    title: 'ft_putnbr recursivo',
    definition:
      "ft_putnbr escribe el signo si hace falta, se llama con n / 10 para escribir las cifras altas y luego escribe n % 10 + '0', la última.",
    example: 'ft_putnbr(123): ft_putnbr(12) → ft_putnbr(1) escribe 1, luego 2 y luego 3.',
  },
  'pis-c00-compile': {
    title: 'Compilar en la piscina',
    definition:
      'Todo se compila con cc -Wall -Wextra -Werror: -Wall y -Wextra activan los avisos y -Werror los convierte en errores. Sin -o, el ejecutable se llama a.out.',
    example: 'cc -Wall -Wextra -Werror main.c ft_putchar.c && ./a.out',
  },
  'pis-c00-print-combn': {
    title: 'ft_print_combn',
    definition:
      'La versión general de ft_print_comb: escribe todas las combinaciones de n cifras distintas en orden creciente, con 0 < n < 10. Suele resolverse con recursión.',
    example: 'ft_print_combn(2) escribe 01, 02, …, 89 (45 combinaciones).',
  },
  'pis-c00-moulinette': {
    title: 'Cómo corrige la Moulinette',
    definition:
      'La Moulinette corrige los ejercicios de un día en orden y se para en el primero que falla: aunque los siguientes estén bien, ya no cuentan para la nota.',
    example: 'ex00 y ex01 bien, ex02 mal, ex03 bien: solo cuentan ex00 y ex01.',
  },
  'pis-c00-norm': {
    title: 'La norma de 42',
    definition:
      'La norminette exige, entre otras cosas, funciones de 25 líneas como mucho, 5 funciones por fichero, 4 parámetros y 5 variables, y prohíbe for, do…while y switch.',
    example: 'Un for se reescribe como i = 0; while (i < n) { …; i++; }',
  },
  'pis-c01-ft-ft': {
    title: 'ft_ft: escribir a través de un puntero',
    definition:
      'Si una función recibe la dirección de un int, *nbr es ese int: asignarle un valor cambia la variable de quien llamó, no una copia.',
    example: 'int n; ft_ft(&n); // ahora n vale 42',
  },
  'pis-c01-ultimate-ft': {
    title: 'Punteros a punteros',
    definition:
      'Cada * en el tipo es un nivel de dirección: int ** apunta a un int *, que apunta a un int. Cada * delante de la variable baja un nivel.',
    example: 'int n; int *p = &n; int **pp = &p; **pp = 42; // n vale 42',
  },
  'pis-c01-swap-bug': {
    title: 'Paso por valor y ft_swap',
    definition:
      'En C los argumentos se copian: una función que recibe int no puede cambiar las variables de quien llama. Para eso recibe sus direcciones (int *).',
    example: 'void ft_swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }',
  },
  'pis-c01-pointer-alias': {
    title: 'Dos nombres para la misma variable',
    definition:
      'Si p = &n, *p y n son la misma memoria: lo que se haga por un camino se ve por el otro.',
    example: 'int n = 1; int *p = &n; *p = 5; // n vale 5',
  },
  'pis-c01-div-mod': {
    title: 'ft_div_mod: devolver dos resultados',
    definition:
      'Una función solo devuelve un valor; para dar dos se pasan punteros donde escribirlos. Entre int, / da el cociente entero y % el resto.',
    example: 'ft_div_mod(17, 5, &d, &m); // d = 3, m = 2',
  },
  'pis-c01-ultimate-div-mod': {
    title: 'ft_ultimate_div_mod',
    definition:
      'Recibe a y b por dirección y deja el cociente en *a y el resto en *b. Hay que calcular los dos antes de escribir, o el segundo usaría un valor ya pisado.',
    example: 'int q = *a / *b; int r = *a % *b; *a = q; *b = r;',
  },
  'pis-c01-negative-div': {
    title: 'División entera con negativos',
    definition:
      'En C la división entera trunca hacia el cero y el resto lleva el signo del dividendo, de forma que (a / b) * b + a % b == a siempre.',
    example: '-7 / 2 == -3 y -7 % 2 == -1; 7 / -2 == -3 y 7 % -2 == 1',
  },
  'pis-c01-putstr': {
    title: 'Recorrer una cadena con un puntero',
    definition:
      "*str es el carácter al que apunta str y str++ pasa al siguiente. El bucle while (*str) para en el '\\0' final, no cuando str es NULL.",
    example: 'while (*str) { write(1, str, 1); str++; }',
  },
  'pis-c01-strlen': {
    title: 'ft_strlen',
    definition:
      "Cuenta los caracteres de una cadena hasta el '\\0', sin contarlo. Los espacios y las cifras cuentan como cualquier otro carácter.",
    example: 'ft_strlen("42 Madrid") == 9; ft_strlen("") == 0',
  },
  'pis-c01-rev-int-tab': {
    title: 'Dar la vuelta a un array',
    definition:
      'Se intercambia el primero con el último, el segundo con el penúltimo… hasta la mitad. Si se sigue hasta el final, cada pareja se intercambia dos veces y queda como estaba.',
    example: 'i = 0; while (i < size / 2) { swap tab[i] y tab[size - 1 - i]; i++; }',
  },
  'pis-c01-sort-int-tab': {
    title: 'Ordenar con burbuja',
    definition:
      'Una pasada compara cada elemento con el siguiente y los cambia si están al revés: el mayor acaba al final. Se repiten las pasadas hasta que una no cambia nada.',
    example: '{3, 2, 1} → {2, 1, 3} → {1, 2, 3}',
  },
  'pis-c01-amp-star': {
    title: '& y *',
    definition:
      '&x da la dirección de x (de tipo puntero al tipo de x) y *p va a la dirección guardada en p. Son operaciones inversas: *(&x) es x.',
    example: 'int n = 4; int *p = &n; *p += 1; // n vale 5',
  },
  'pis-c01-array-index': {
    title: 'Arrays e índices',
    definition:
      'El nombre de un array se usa como puntero a su primer elemento, y tab[i] es *(tab + i). Los índices van de 0 a size - 1.',
    example: 'int tab[5]; tab[4] es el último y *(tab + 4) el mismo elemento.',
  },
  'pis-c02-strcpy': {
    title: 'ft_strcpy',
    definition:
      "Copia src en dest carácter a carácter, incluido el '\\0' final, y devuelve dest. Sin ese '\\0', dest no acaba donde debe.",
    example: "while (src[i]) { dest[i] = src[i]; i++; } dest[i] = '\\0'; return (dest);",
  },
  'pis-c02-strncpy-pad': {
    title: 'ft_strncpy',
    definition:
      "Copia como mucho n caracteres de src. Si src es más corta, rellena con '\\0' hasta n; si es más larga, corta y no pone '\\0'.",
    example:
      'ft_strncpy(d, "ab", 5) deja a b \\0 \\0 \\0; ft_strncpy(d, "abcdefgh", 5) deja abcde sin \\0.',
  },
  'pis-c02-str-is-numeric': {
    title: 'Las ft_str_is_*',
    definition:
      'Devuelven 1 si todos los caracteres cumplen la condición y 0 si alguno no. Con la cadena vacía devuelven 1, porque no hay ninguno que falle.',
    example:
      'ft_str_is_numeric("") == 1; ft_str_is_numeric("42") == 1; ft_str_is_numeric("-42") == 0',
  },
  'pis-c02-str-is-printable': {
    title: 'Caracteres imprimibles',
    definition:
      'En ASCII son imprimibles del espacio (32) a la virgulilla ~ (126). Los de 0 a 31 y el 127 (DEL) son caracteres de control.',
    example: "if (c >= 32 && c <= 126) // imprimible; '\\n' (10) no lo es",
  },
  'pis-c02-str-is-lowercase': {
    title: 'ft_str_is_lowercase',
    definition:
      "Devuelve 1 solo si cada carácter está entre 'a' y 'z'. Un espacio, una cifra o un signo ya hacen que devuelva 0.",
    example: 'ft_str_is_lowercase("hola") == 1; ft_str_is_lowercase("hola mundo") == 0',
  },
  'pis-c02-str-is-alpha-bug': {
    title: 'Comprobar todos los caracteres',
    definition:
      'Para ver si toda la cadena cumple algo, hay que devolver 0 en cuanto un carácter falla y 1 solo al llegar al final. Devolver 1 al primero que cumple es otra cosa.',
    example: 'while (str[i]) { if (!es_letra(str[i])) return (0); i++; } return (1);',
  },
  'pis-c02-strupcase': {
    title: 'Mayúsculas y minúsculas en ASCII',
    definition:
      "Una minúscula y su mayúscula se separan 32 posiciones: 'a' es 97 y 'A' 65. Para pasar a mayúscula se resta 32 solo a lo que esté entre 'a' y 'z'.",
    example: "if (c >= 'a' && c <= 'z') c -= 32; // 'h' → 'H'",
  },
  'pis-c02-strcapitalize': {
    title: 'ft_strcapitalize',
    definition:
      'Pone en mayúscula la primera letra de cada palabra y el resto en minúscula. Una palabra es un trozo seguido de letras y cifras: cualquier otro carácter la corta.',
    example: '"hOLA 42mUNDO dos-tres" → "Hola 42mundo Dos-Tres"',
  },
  'pis-c02-strlcpy': {
    title: 'ft_strlcpy',
    definition:
      "Copia como mucho size - 1 caracteres, termina dest con '\\0' (si size > 0) y devuelve la longitud de src: si es >= size, la copia se cortó.",
    example: 'ft_strlcpy(buf, "piscine", 4) deja "pis" y devuelve 7.',
  },
  'pis-c02-strlcpy-vs-strncpy': {
    title: 'strlcpy frente a strncpy',
    definition:
      "strncpy copia n bytes justos (rellena con '\\0' o deja la cadena sin terminar); strlcpy siempre termina dest y devuelve strlen(src) para saber si cupo.",
    example: 'strncpy(d, "abcdef", 3) deja abc sin \\0; strlcpy(d, "abcdef", 3) deja "ab".',
  },
  'pis-c02-non-printable': {
    title: 'ft_putstr_non_printable',
    definition:
      'Escribe la cadena, pero cada carácter no imprimible sale como una barra invertida seguida de su valor en hexadecimal, con dos cifras en minúscula.',
    example: '"Coucou\\ntu vas bien ?" → Coucou\\0atu vas bien ?',
  },
  'pis-c02-print-memory': {
    title: 'ft_print_memory',
    definition:
      'Hace un volcado de memoria: cada línea lleva la dirección en hexadecimal, 16 bytes en hexadecimal de dos en dos y esos bytes como texto, con un punto en los no imprimibles.',
    example: '000000010a161f40: 426f 6e6a 6f75 7220 6c65 7320 616d 696e Bonjour les amin',
  },
  'pis-c03-strcmp': {
    title: 'ft_strcmp',
    definition:
      "Avanza mientras los caracteres coinciden y devuelve la resta de los primeros que difieren (como unsigned char). Si una cadena se acaba, su '\\0' vale 0.",
    example: 'ft_strcmp("abc", "abd") == -1; ft_strcmp("ab", "abc") == -99',
  },
  'pis-c03-strcmp-unsigned': {
    title: 'strcmp y unsigned char',
    definition:
      'char puede tener signo, y entonces los bytes de 128 a 255 valen negativo. strcmp compara como unsigned char para que esos bytes vayan detrás de los ASCII.',
    example: "(unsigned char)'\\xe9' es 233, no -23.",
  },
  'pis-c03-strcmp-sign': {
    title: 'El signo de strcmp',
    definition:
      'Lo que importa de strcmp es el signo: negativo si s1 va antes que s2, 0 si son iguales y positivo si va después. Se usa para ordenar cadenas.',
    example: 'ft_strcmp("ana", "bea") < 0, así que "ana" va antes.',
  },
  'pis-c03-strncmp': {
    title: 'ft_strncmp',
    definition:
      'Como strcmp, pero mira como mucho n caracteres: si los n primeros coinciden devuelve 0, aunque después las cadenas sean distintas. Con n = 0 siempre da 0.',
    example: 'ft_strncmp("piscine", "pisco", 4) == 0; con 5 da \'i\' - \'o\' = -6',
  },
  'pis-c03-strcat': {
    title: 'ft_strcat',
    definition:
      "Copia src a partir del '\\0' de dest, pone un '\\0' nuevo al final y devuelve dest. Cada llamada sigue donde acabó la anterior.",
    example: 'dest = "42"; ft_strcat(dest, " Madrid"); // "42 Madrid"',
  },
  'pis-c03-strcat-room': {
    title: 'Sitio para concatenar',
    definition:
      "ft_strcat no reserva memoria: dest tiene que tener sitio para lo que ya tiene, lo que se añade y el '\\0', o escribe fuera del array.",
    example: 'char dest[10] = "hola"; ft_strcat(dest, " mundo"); // 11 bytes en 10: desborda',
  },
  'pis-c03-strncat': {
    title: 'ft_strncat',
    definition:
      "Añade como mucho nb caracteres de src al final de dest y siempre pone el '\\0' final, a diferencia de strncpy.",
    example: 'dest = "ab"; ft_strncat(dest, "cdef", 2); // "abcd"',
  },
  'pis-c03-strstr': {
    title: 'ft_strstr',
    definition:
      'Busca to_find dentro de str y devuelve un puntero a su primera aparición. Si to_find está vacía devuelve str; si no aparece, NULL.',
    example: 'ft_strstr("hola", "") == "hola"; ft_strstr("hola", "x") == NULL',
  },
  'pis-c03-strstr-code': {
    title: 'Lo que devuelve strstr',
    definition:
      'strstr no devuelve solo lo que se buscaba: devuelve un puntero dentro de str, y desde ahí la cadena sigue hasta el final de str.',
    example: 'ft_strstr("banana", "ana") apunta a "anana" (posición 1).',
  },
  'pis-c03-strlcat': {
    title: 'ft_strlcat',
    definition:
      "Añade src a dest sin pasar de size bytes en total (contando el '\\0') y devuelve la longitud que habría querido crear: strlen(dest) + strlen(src).",
    example: 'dest = "abc"; ft_strlcat(dest, "defgh", 6) deja "abcde" y devuelve 8.',
  },
  'pis-c03-strlcat-small': {
    title: 'ft_strlcat con size pequeño',
    definition:
      'Si size no pasa de strlen(dest), no hay sitio para añadir nada: ft_strlcat deja dest igual y devuelve size + strlen(src).',
    example: 'dest = "abcdef"; ft_strlcat(dest, "xyz", 4) devuelve 7 y no toca dest.',
  },
  'pis-c03-strlcat-return': {
    title: 'Para qué sirve lo que devuelve strlcat',
    definition:
      'ft_strlcat devuelve min(size, strlen(dest)) + strlen(src), la longitud que intentó crear: si el resultado es >= size, la cadena se cortó.',
    example: 'if (ft_strlcat(buf, s, sizeof(buf)) >= sizeof(buf)) // no cupo',
  },
}
