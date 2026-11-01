/** Repaso de Not-games en inglés: traducción de `../review-piscine-c04-c07.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C04_C07_EN: Readonly<Record<string, ReviewEntry>> = {
  'pis-c04-putstr': {
    title: "ft_putstr and the '\\0'",
    definition:
      "ft_putstr writes character by character up to the first '\\0'. If a literal has a '\\0' in the middle, for the function the string ends there.",
    example: 'ft_putstr("ab\\0cd") prints ab.',
  },
  'pis-c04-putnbr-intmin': {
    title: 'ft_putnbr and INT_MIN',
    definition:
      'To print a negative number you usually flip its sign, but -2147483648 has no opposite in a 32-bit int: nb = -nb overflows. Handle it apart or copy nb into a long.',
    example: 'if (nb == -2147483648) { write(1, "-2147483648", 11); return ; }',
  },
  'pis-c04-putnbr-order': {
    title: 'Printing the digits in order',
    definition:
      'nb % 10 gives the last digit and nb / 10 removes it. For the digits to come out in order, first print nb / 10 recursively and then the last digit.',
    example: "if (nb >= 10) ft_putnbr(nb / 10); ft_putchar(nb % 10 + '0');",
  },
  'pis-c04-atoi-signs': {
    title: 'Signs in ft_atoi',
    definition:
      "The Piscine's ft_atoi skips whitespace, then reads any number of '+' and '-' (an odd count of '-' makes it negative) and then digits, up to the first character that is not one.",
    example: 'ft_atoi(" ---+--+1234ab567") = -1234 (five \'-\').',
  },
  'pis-c04-atoi-spaces': {
    title: 'The whitespace ft_atoi skips',
    definition:
      'Before the signs, ft_atoi ignores the same whitespace as isspace: space, \\t, \\n, \\v, \\f and \\r (codes 32 and 9 to 13).',
    example: 'ft_atoi("\\t\\n  42") = 42.',
  },
  'pis-c04-base-valid': {
    title: 'A valid base',
    definition:
      'In ft_putnbr_base and ft_atoi_base a base is invalid if it is empty, has a single character, repeats one or contains + or -. With an invalid base, ft_putnbr_base prints nothing.',
    example: '"01" and "poneyvif" are fine; "0", "0120" and "01+" are not.',
  },
  'pis-c04-base-convert': {
    title: 'Writing a number in another base',
    definition:
      'The length of the base is how many digits there are, and each character is worth its position. Divide the number by the length again and again: the remainders, read backwards, are the digits.',
    example: '10 in "01" is 1010; 255 in "0123456789ABCDEF" is FF.',
  },
  'pis-c04-atoi-base': {
    title: 'ft_atoi_base',
    definition:
      'Like ft_atoi, but each digit is the position of its character in the base: multiply the running total by the length of the base and add the digit. With an invalid base it returns 0.',
    example: 'ft_atoi_base("101", "01") = 5; ft_atoi_base("-ff", "0123456789abcdef") = -255.',
  },
  'pis-c04-intmin-value': {
    title: 'INT_MIN and INT_MAX',
    definition:
      'A 32-bit int goes from -2147483648 (INT_MIN) to 2147483647 (INT_MAX). There is one more negative value than positive ones, which is why INT_MIN has no opposite.',
    example: 'ft_putnbr(-2147483648) must print the sign and 10 digits.',
  },
  'pis-c04-base-poney': {
    title: 'The "poneyvif" base',
    definition:
      'A base does not need to use digits: "poneyvif" has 8 characters, so it is base 8, and each letter is worth its position (p = 0, o = 1… f = 7).',
    example: '8 in "poneyvif" is op (1 × 8 + 0); 5 is v.',
  },
  'pis-c04-octal': {
    title: 'Octal',
    definition:
      'Base 8: digits from 0 to 7, and each position is worth 8 times the one on its right. To convert to octal, divide by 8 and read the remainders backwards.',
    example: '42 = 5 × 8 + 2, so it is 52 in octal. Octal 17 is 8 + 7 = 15.',
  },
  'pis-c04-base-sign': {
    title: 'Why a base has no signs',
    definition:
      "ft_atoi_base reads '+' and '-' as a sign before the digits. If they were also digits of the base, there would be no single way to read them, so such a base is invalid.",
    example: 'With the base "-01", "-1" could be -1 or the number 01.',
  },
  'pis-c05-fact-iter': {
    title: 'ft_iterative_factorial',
    definition:
      'The factorial of n is n × (n - 1) × … × 1. By definition 0! is 1, and the subject asks you to return 0 if nb is negative.',
    example: '5! = 120; 0! = 1; ft_iterative_factorial(-3) = 0.',
  },
  'pis-c05-fact-rec': {
    title: 'The base case of the recursive factorial',
    definition:
      'The recursive version returns nb × f(nb - 1) and needs a base case to stop: if it only covers nb == 1, with 0 it goes down to -1, which returns 0, and the result is 0 instead of 1.',
    example: 'if (nb == 0 || nb == 1) return (1);',
  },
  'pis-c05-power': {
    title: 'ft_iterative_power',
    definition:
      'It multiplies nb by itself power times. The subject asks for a negative power to return 0 and for 0 to the power of 0 to be 1.',
    example: 'ft_iterative_power(2, 10) = 1024; (0, 0) = 1; (5, -2) = 0.',
  },
  'pis-c05-power-rec': {
    title: 'Calls of a recursive function',
    definition:
      'Each call of ft_recursive_power lowers power by 1 until the base case power == 0. With power = n there are n + 1 calls, counting the first.',
    example: '(3, 4) → (3, 3) → (3, 2) → (3, 1) → (3, 0): 5 calls and 81.',
  },
  'pis-c05-fib': {
    title: 'ft_fibonacci',
    definition:
      'Each term is the sum of the two before it: fib(0) = 0, fib(1) = 1. The subject asks for -1 when the index is negative.',
    example: '0, 1, 1, 2, 3, 5, 8, 13: ft_fibonacci(7) = 13.',
  },
  'pis-c05-fib-cost': {
    title: 'The cost of a recursive fibonacci',
    definition:
      'fib(n) calls fib(n - 1) and fib(n - 2), and each of those splits in two again: lots of work is repeated and the calls grow exponentially.',
    example: 'fib(40) makes hundreds of millions of calls; a loop takes 40 steps.',
  },
  'pis-c05-sqrt': {
    title: 'ft_sqrt',
    definition:
      'It returns the integer square root of nb if it is exact (nb is a perfect square). If it is not, or if nb is negative, it returns 0.',
    example: 'ft_sqrt(49) = 7; ft_sqrt(50) = 0; ft_sqrt(-16) = 0.',
  },
  'pis-c05-sqrt-overflow': {
    title: 'Overflow in ft_sqrt',
    definition:
      'Testing i * i < nb with nb near INT_MAX takes i up to 46341, whose square no longer fits in an int. Avoid it by comparing i <= nb / i or by using a long.',
    example: '46340 × 46340 = 2147395600 fits; 46341 × 46341 does not.',
  },
  'pis-c05-prime': {
    title: 'ft_is_prime and numbers below 2',
    definition:
      'A prime is a number greater than 1 divisible only by 1 and itself. Neither 0, nor 1, nor negatives are prime: return 0 for them before the loop.',
    example: 'if (nb < 2) return (0); — without it, ft_is_prime(1) would give 1.',
  },
  'pis-c05-prime-sqrt': {
    title: 'Trying divisors up to the root',
    definition:
      'If n has a divisor greater than √n, it also has one smaller than √n. Trying the i with i * i <= n is enough, and much faster than going up to n.',
    example: 'For 97, trying 2 to 9 is enough (10 × 10 = 100 > 97).',
  },
  'pis-c05-next-prime': {
    title: 'ft_find_next_prime',
    definition:
      'It returns the first prime greater than or equal to nb: if nb is already prime, nb itself. Below 2, the next prime is 2.',
    example: 'ft_find_next_prime(14) = 17; (17) = 17; (-5) = 2.',
  },
  'pis-c05-queens': {
    title: 'The ten queens',
    definition:
      'ft_ten_queens_puzzle places ten queens on a 10 × 10 board so that none attack each other, with backtracking. It prints each solution as 10 digits (the row of the queen in each column) and returns how many there are: 724.',
    example: 'One output line: 0257948136.',
  },
  'pis-c05-recursion-stack': {
    title: 'The call stack',
    definition:
      'Each function call takes a piece of the stack until it returns. If a recursion never reaches its base case, calls pile up until the stack runs out and the program crashes.',
    example: 'f(-1) with base case n == 0 goes down to -2, -3… until a segfault.',
  },
  'pis-c06-program-name': {
    title: 'argv[0]',
    definition:
      'argv[0] is the name of the program as it was typed to launch it; ft_print_program_name prints it. The real arguments start at argv[1].',
    example: 'With ./a.out hola, argv[0] is "./a.out" and argv[1] is "hola".',
  },
  'pis-c06-argc-count': {
    title: 'argc',
    definition:
      'argc is how many elements argv has, counting the program name: with no arguments it is 1. What goes between quotes in the shell is a single argument.',
    example: './a.out "hola mundo" 42 → argc = 3.',
  },
  'pis-c06-argv-null': {
    title: 'argv[argc] is NULL',
    definition:
      'After the last argument, argv always has a null pointer: argv[argc] == NULL. You can walk argv until NULL without looking at argc.',
    example: 'With ./a.out x, argv[0] = "./a.out", argv[1] = "x", argv[2] = NULL.',
  },
  'pis-c06-print-params': {
    title: 'ft_print_params',
    definition:
      'It prints each argument on its own line from argv[1], without the program name. The shell joins what is between quotes into a single argument and removes the quotes.',
    example: './a.out "a b" c prints "a b" and "c", on two lines.',
  },
  'pis-c06-rev-params': {
    title: 'ft_rev_params',
    definition:
      'It prints the arguments from last to first, each on its own line, without the program name: it goes from argc - 1 down to 1, never reaching 0.',
    example: './a.out x y z prints z, y and x.',
  },
  'pis-c06-sort-ascii': {
    title: 'ASCII order',
    definition:
      'ft_sort_params sorts the arguments by comparing their characters by ASCII code, like ft_strcmp. Uppercase letters (65-90) come before lowercase ones (97-122).',
    example: 'b A a B → A, B, a, b. "Zoo" comes before "abeja".',
  },
  'pis-c06-main-proto': {
    title: 'The prototype of main',
    definition:
      'To receive the arguments, main is declared int main(int argc, char **argv): first how many there are, then the array of strings. char *argv[] is the same.',
    example: 'int main(int argc, char **argv) { ... return (0); }',
  },
  'pis-c06-argv-type': {
    title: 'The types in argv',
    definition:
      'argv is a char **: an array of strings. argv[i] is a string (char *) and argv[i][j] is a character (char) of that string.',
    example: 'With ./a.out hola, argv[1][0] is the letter h.',
  },
  'pis-c06-argv-numbers': {
    title: 'Arguments are text',
    definition:
      'Everything arrives in argv as strings, numbers too. To compute with one you have to convert it, for instance with ft_atoi.',
    example: "./a.out 42 → argv[1] is \"42\", that is '4', '2' and '\\0'.",
  },
  'pis-c06-sort-swap': {
    title: 'Sorting argv by swapping pointers',
    definition:
      'To sort the arguments you do not copy letters: you swap the pointers in argv when ft_strcmp says the first one comes after the second.',
    example: 'tmp = argv[i]; argv[i] = argv[i + 1]; argv[i + 1] = tmp;',
  },
  'pis-c06-argv-loop': {
    title: 'Walking argv up to NULL',
    definition:
      'Since argv[argc] is NULL, a while (argv[i]) stops right after the last argument, and at the end i equals argc.',
    example: 'With ./a.out x y, the loop stops with i = 3.',
  },
  'pis-c06-program': {
    title: 'Programs in C 06',
    definition:
      'Up to C 05 you hand in standalone functions; in C 06 each exercise is a whole program, with its main, which the Moulinette compiles and runs with arguments.',
    example: 'ex00/ft_print_program_name.c with an int main(int argc, char **argv).',
  },
  'pis-c07-strdup': {
    title: 'ft_strdup',
    definition:
      "It reserves strlen(src) + 1 bytes with malloc, checks it is not NULL, copies the characters and adds the final '\\0', because malloc does not zero the memory.",
    example: 'ft_strdup("Madrid") reserves 7 bytes.',
  },
  'pis-c07-range': {
    title: 'ft_range',
    definition:
      'It returns an int array reserved with malloc holding the numbers from min (included) to max (excluded): max - min elements. If min >= max, it returns NULL.',
    example: 'ft_range(3, 7) = {3, 4, 5, 6}; ft_range(5, 5) = NULL.',
  },
  'pis-c07-range-bytes': {
    title: 'How much ft_range reserves',
    definition:
      'There are max - min numbers and each takes sizeof(int) bytes, so you ask for malloc(sizeof(int) * (max - min)). The last number is max - 1.',
    example: 'ft_range(-2, 3): 5 ints, 20 bytes, from -2 to 2.',
  },
  'pis-c07-ultimate-range': {
    title: 'ft_ultimate_range',
    definition:
      'It reserves the array like ft_range but leaves it in *range (hence the int **) and returns the size. If min >= max, it sets *range to NULL and returns 0; if malloc fails, it returns -1.',
    example: 'int *tab; int n = ft_ultimate_range(&tab, 0, 3); → n = 3, tab = {0, 1, 2}.',
  },
  'pis-c07-strjoin': {
    title: 'ft_strjoin',
    definition:
      'It joins size strings, with the separator between each two (not at the end), into a new string reserved with malloc. With size 0 it returns an empty string that can be freed.',
    example: 'ft_strjoin(3, {"a", "b", "c"}, ", ") = "a, b, c" (8 bytes with the \'\\0\').',
  },
  'pis-c07-split': {
    title: 'ft_split',
    definition:
      'It cuts a string into words, using any character of charset as a separator. Consecutive separators give no empty words and the array ends with a pointer to 0.',
    example: 'ft_split("  hola,mundo  42", " ,") = {"hola", "mundo", "42", 0}.',
  },
  'pis-c07-split-free': {
    title: 'Freeing a char **',
    definition:
      'What ft_split returns is several allocations: one per word and one for the array. Free each word and, at the end, the array.',
    example: 'i = 0; while (tab[i]) free(tab[i++]); free(tab);',
  },
  'pis-c07-malloc-size': {
    title: 'malloc counts bytes',
    definition:
      'malloc takes a number of bytes, not of elements. For n elements of a type, multiply by its sizeof.',
    example: 'int *tab = malloc(sizeof(int) * 5); — 20 bytes with a 4-byte int.',
  },
  'pis-c07-leak': {
    title: 'A leak when reassigning a pointer',
    definition:
      'If the only pointer to an allocation is overwritten before freeing it, that memory can no longer be freed: it is a leak.',
    example: 'Done right: s = ft_strdup("hola"); free(s); s = ft_strdup("mundo"); free(s);',
  },
  'pis-c07-convert-base': {
    title: 'ft_convert_base',
    definition:
      'It reads nbr in base_from (like ft_atoi_base) and returns, reserved with malloc, that number written in base_to. If either base is invalid, it returns NULL.',
    example: 'ft_convert_base("ff", "0123456789abcdef", "01") = "11111111".',
  },
  'pis-c07-char-pp': {
    title: 'char ** as an array of strings',
    definition:
      'A char ** points to the first of several char *, and each of them points to a string. That is what argv and the result of ft_split are.',
    example: 'char **tab: tab[0] is the first word and tab[0][0] its first letter.',
  },
  'pis-c07-use-after-free': {
    title: 'Using freed memory',
    definition:
      'After free(p), p still holds the address, but that memory is no longer yours: reading or writing there is undefined behaviour. You can set p = NULL after the free.',
    example: 'free(s); s = NULL; — so a mistaken use hits NULL, not garbage.',
  },
}
