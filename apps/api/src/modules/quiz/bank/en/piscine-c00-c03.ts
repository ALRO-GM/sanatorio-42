/** Banco de Not-games en inglés: la piscina, C 00 a C 03 (`../piscine-c00-c03.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C00_C03_EN: Readonly<Record<string, ConceptText>> = {
  'pis-c00-putchar-write': {
    forms: [
      {
        ask: [
          'Which call writes the character `c` in ft_putchar?',
          'Inside `ft_putchar(char c)`, how do you write c to standard output?',
        ],
        right: ['`write(1, &c, 1)`'],
        wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(1, &c, 4)`', '`write(&c, 1, 1)`'],
      },
      {
        ask: [
          'Which header do you need to include to use `write`?',
          'Which `#include` does write need?',
        ],
        right: ['`#include <unistd.h>`'],
        wrong: ['`#include <stdio.h>`', '`#include <stdlib.h>`', '`#include <string.h>`'],
      },
    ],
    wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(&c, 1, 1)`'],
    why: 'write takes a descriptor (1 is standard output), the address of what to write and how many bytes; it is declared in unistd.h.',
  },
  'pis-c00-write-return': {
    forms: [
      {
        ask: [
          'What does `write` return when all goes well?',
          'When write succeeds, its return value is…',
        ],
        right: ['The number of bytes it wrote'],
        wrong: [
          'The character it has just written',
          'The file descriptor it used',
          'A pointer to the buffer it wrote',
          '0, to say there was no error',
        ],
      },
      {
        ask: ['What does `write` return when it fails?', 'When write cannot write, it returns…'],
        right: ['-1'],
        wrong: ['0', '1', '2', '-2'],
      },
    ],
    wrong: ['The character it has just written', 'The file descriptor it used', '0', '1', '2'],
    why: 'write returns how many bytes it actually wrote, or -1 if there was an error.',
  },
  'pis-c00-write-proto': {
    forms: [
      {
        ask: ['What is the prototype of `write`?', 'How is the write function declared?'],
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
          'What type is the second parameter of `write`?',
          'What type is the buffer that write receives?',
        ],
        right: ['`const void *`'],
        wrong: ['`char *`', '`const char **`', '`int`', '`void`'],
      },
    ],
    wrong: ['`int write(int fd, char *buf, int count)`', '`char *`', '`int`', '`void`'],
    why: 'write takes the fd, a const void * to the bytes (any address will do) and how many, and returns an ssize_t.',
  },
  'pis-c00-print-alphabet': {
    forms: [
      {
        ask: ['What does this code write?', 'What is the output?'],
        right: ['`acegikmoqsuwy`'],
        wrong: [
          '`acegikmoqsuwyz`',
          '`bdfhjlnprtvxz`',
          '`abcdefghijklmnopqrstuvwxyz`',
          '`acegikmoqsuw`',
        ],
      },
      {
        ask: ['How many letters does it write?', 'How many characters come out in total?'],
        right: ['13'],
        wrong: ['12', '14', '26', '25'],
      },
    ],
    wrong: ['`acegikmoqsuwyz`', '`bdfhjlnprtvxz`', '12', '14', '26'],
    why: "A char is a number: from 'a' (97) it goes up two at a time to 'y' (121), and the next one, 123, is already past 'z'.",
  },
  'pis-c00-reverse-alphabet': {
    forms: [
      {
        ask: ['Which letter does it write last?', 'Which letter does the output end with?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`z`'],
      },
      {
        ask: [
          'How many letters does it write in total?',
          'How many characters are printed on screen?',
        ],
        right: ['25'],
        wrong: ['26', '24', '27'],
      },
    ],
    wrong: ['`a`', '`c`', '26', '24'],
    why: "With c > 'a' the loop stops before writing the 'a': it prints 'z' down to 'b', 25 letters.",
  },
  'pis-c00-print-numbers': {
    forms: [
      {
        ask: [
          'Why does this not write `0123456789`?',
          'This was meant to be ft_print_numbers. What is wrong?',
        ],
        right: ["It writes the bytes 0 to 9, not the characters '0' to '9'"],
        wrong: [
          'Nothing: it writes 0123456789 just fine',
          'It skips the 9 by using <= instead of <',
          'It does not compile: write takes no int *',
          'It writes the numbers 1 to 10, one too many',
        ],
      },
    ],
    wrong: [
      'Nothing: it writes 0123456789 just fine',
      'It skips the 9 by using <= instead of <',
      'It does not compile: write takes no int *',
    ],
    why: "write outputs the byte whose value is i (0 to 9, control characters); the digit '0' is byte 48.",
  },
  'pis-c00-char-digit': {
    forms: [
      {
        ask: ["What value does `'0'` have in ASCII?", "As a number, the character '0' is…"],
        right: ['48'],
        wrong: ['0', '30', '49', '65'],
      },
      {
        ask: ["What is `'7' - '0'` in C?", "In C, the subtraction '7' - '0' gives…"],
        right: ['7'],
        wrong: ['55', '48', '0', '70'],
      },
      {
        ask: [
          'To turn the digit `n`, from 0 to 9, into its character, what do you write?',
          'Which expression turns an int n, from 0 to 9, into the character of its digit?',
        ],
        right: ["`n + '0'`", '`n + 48`'],
        wrong: ["`n - '0'`", "`'n'`", "`n + 'a'`", "`n * '0'`"],
      },
    ],
    wrong: ['0', '49', '55'],
    why: "Digits are consecutive in ASCII starting at '0' (48): adding or subtracting '0' goes from number to character and back.",
  },
  'pis-c00-is-negative': {
    forms: [
      {
        ask: [
          'What does `ft_is_negative(0)` write?',
          'If it is called with n = 0, what comes out?',
        ],
        right: ['`P`'],
        wrong: ['`N`', '`0`', '`NP`'],
      },
    ],
    wrong: ['`N`', '`0`', '`NP`'],
    why: 'Zero is not less than 0, so it takes the else branch: ft_is_negative writes P for zero, as the subject asks.',
  },
  'pis-c00-print-comb': {
    forms: [
      {
        ask: [
          'In ft_print_comb, which combination comes right after `019`?',
          'ft_print_comb has just written 019. Which one does it write next?',
        ],
        right: ['`023`'],
        wrong: ['`020`', '`021`', '`029`', '`120`'],
      },
      {
        ask: [
          'What is the last combination of ft_print_comb?',
          'Which number does ft_print_comb end with?',
        ],
        right: ['`789`'],
        wrong: ['`999`', '`987`', '`678`', '`890`'],
      },
      {
        ask: [
          'How many combinations does ft_print_comb write?',
          'How many numbers with three distinct, increasing digits does ft_print_comb write?',
        ],
        right: ['120'],
        wrong: ['1000', '720', '84', '100'],
      },
    ],
    wrong: ['`020`', '`999`', '1000', '720'],
    why: 'ft_print_comb writes the digits in strictly increasing order (012, 013… 789): those are the 120 ways to pick 3 out of 10.',
  },
  'pis-c00-print-comb2': {
    forms: [
      {
        ask: [
          'In ft_print_comb2, which pair comes right after `00 99`?',
          'ft_print_comb2 has just written 00 99. What does it write next?',
        ],
        right: ['`01 02`'],
        wrong: ['`01 00`', '`01 01`', '`10 00`', '`00 100`'],
      },
      {
        ask: [
          'What is the last pair ft_print_comb2 writes?',
          'Which pair does ft_print_comb2 end with?',
        ],
        right: ['`98 99`'],
        wrong: ['`99 99`', '`99 98`', '`98 98`', '`89 99`'],
      },
      {
        ask: [
          'How many pairs does ft_print_comb2 write?',
          'How many pairs come out of ft_print_comb2?',
        ],
        right: ['4950'],
        wrong: ['9900', '10000', '5050', '4851'],
      },
    ],
    wrong: ['`01 00`', '`99 99`', '9900', '10000'],
    why: 'ft_print_comb2 writes pairs a < b from 00 to 99: the first is always smaller, so there are 100 × 99 / 2 = 4950.',
  },
  'pis-c00-putnbr-intmin': {
    forms: [
      {
        ask: [
          'Why can `ft_putnbr` not simply do `n = -n` with -2147483648?',
          'What is special about -2147483648 for ft_putnbr?',
        ],
        right: ['Its positive, 2147483648, does not fit in an int'],
        wrong: [
          'write cannot print the minus sign',
          'It is the only negative ending in 8',
          'The compiler will not let you negate a variable',
          'A negative int takes 8 bytes, not 4',
        ],
      },
      {
        ask: [
          'What is INT_MIN in a 32-bit int?',
          'What is the smallest int there is, with 32 bits?',
        ],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-2147483649', '-4294967296', '-32768'],
      },
    ],
    wrong: [
      'write cannot print the minus sign',
      'The compiler will not let you negate a variable',
      '-2147483647',
      '-4294967296',
    ],
    why: 'An int goes from -2147483648 to 2147483647: the smallest has no positive, so it needs its own case (or a long).',
  },
  'pis-c00-putnbr-code': {
    forms: [
      {
        ask: ['What does `ft_putnbr(-42)` write?', 'With n = -42, what is the output?'],
        right: ['`-42`'],
        wrong: ['`-24`', '`42`', '`24`', '`--42`'],
      },
      {
        ask: [
          'Which number does this version get wrong?',
          'Which value of n does this ft_putnbr print badly?',
        ],
        right: ['-2147483648'],
        wrong: ['2147483647', '0', '-1', '10'],
      },
    ],
    wrong: ['`-24`', '`42`', '2147483647', '0'],
    why: 'The recursion writes the high digits first (n / 10) and then the last one (n % 10); only INT_MIN breaks on -n.',
  },
  'pis-c00-compile': {
    forms: [
      {
        ask: [
          'Which flags must the piscine C exercises compile with?',
          'Which compile command does the piscine grading use?',
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
        ask: ['What does the `-Werror` flag do?', 'When you compile with -Werror, what changes?'],
        right: ['It turns every warning into an error'],
        wrong: [
          'It shows every possible warning',
          'It turns off compiler warnings',
          'It adds debugging information',
          'It optimises the code before linking',
        ],
      },
      {
        ask: [
          'If you compile with `cc main.c` and no `-o`, what is the executable called?',
          'Which file does cc leave when you give it no output name?',
        ],
        right: ['`a.out`'],
        wrong: ['`main`', '`main.out`', '`main.exe`', '`a.exe`'],
      },
    ],
    wrong: ['`cc -Wall -Werror -O2`', '`cc -g -fsanitize=address`', '`main`', '`main.out`'],
    why: 'In the piscine everything compiles with -Wall -Wextra -Werror (a warning is already an error), and cc without -o leaves the executable in a.out.',
  },
  'pis-c00-print-combn': {
    forms: [
      {
        ask: [
          'How many combinations does `ft_print_combn(2)` write?',
          'How many come out of ft_print_combn(2)?',
        ],
        right: ['45'],
        wrong: ['90', '100', '55', '81'],
      },
      {
        ask: [
          'Which combination does `ft_print_combn(4)` write first?',
          'What does the output of ft_print_combn(4) start with?',
        ],
        right: ['`0123`'],
        wrong: ['`0000`', '`1234`', '`0001`', '`0124`'],
      },
    ],
    wrong: ['90', '100', '`0000`', '`1234`'],
    why: 'ft_print_combn(n) writes n distinct digits in increasing order: with 2 there are the 45 pairs 01… 89, and with 4 it starts at 0123.',
  },
  'pis-c00-moulinette': {
    forms: [
      {
        ask: [
          'On a piscine C day, if one exercise is wrong, what happens to the ones after it?',
          'The Moulinette finds ex02 wrong. What happens to ex03 and the rest?',
        ],
        right: ['They do not count, even if correct'],
        wrong: [
          'They are graded anyway, one by one',
          'They count for only half the grade',
          'They get graded again tomorrow',
          'They count if a peer approves them',
        ],
      },
    ],
    wrong: [
      'They are graded anyway, one by one',
      'They count for only half the grade',
      'They get graded again tomorrow',
    ],
    why: 'The Moulinette grades in order and stops at the first exercise that fails: whatever comes after does not count.',
  },
  'pis-c00-norm': {
    forms: [
      {
        ask: [
          'According to the 42 Norm, which loop can you use in the piscine?',
          'Which loop does the norminette allow?',
        ],
        right: ['`while`'],
        wrong: ['`for`', '`do { } while`', '`foreach`'],
      },
      {
        ask: [
          'How many lines can the body of a function have, at most, according to the norminette?',
          'For the Norm, how many lines fit inside a function at most?',
        ],
        right: ['25'],
        wrong: ['20', '30', '42', '50'],
      },
      {
        ask: [
          'How many functions fit, at most, in a .c file according to the Norm?',
          'The norminette allows a maximum number of functions per file. How many?',
        ],
        right: ['5'],
        wrong: ['4', '10', '3', '7'],
      },
    ],
    wrong: ['`for`', '`do { } while`', '20', '30'],
    why: 'The 42 Norm forbids for, do…while and switch, and limits each function to 25 lines and each file to 5 functions.',
  },
  'pis-c01-ft-ft': {
    forms: [
      {
        ask: [
          'What does `ft_ft(int *nbr)` do?',
          'The ft_ft exercise takes an int *nbr. What must it do?',
        ],
        right: ['Store 42 in the int that nbr points to'],
        wrong: [
          'Make nbr point to the address 42',
          'Return 42 without touching anything',
          'Write 42 to standard output',
          'Store 42 in a local copy of nbr',
        ],
      },
      {
        ask: ['Which line goes inside ft_ft?', 'Which statement does ft_ft come down to?'],
        right: ['`*nbr = 42;`'],
        wrong: ['`nbr = 42;`', '`&nbr = 42;`', '`*nbr == 42;`', '`return (42);`'],
      },
    ],
    wrong: [
      'Make nbr point to the address 42',
      'Return 42 without touching anything',
      '`nbr = 42;`',
    ],
    why: 'nbr is the address of an int: *nbr is that int, and assigning 42 to it changes it for the caller too.',
  },
  'pis-c01-ultimate-ft': {
    forms: [
      {
        ask: [
          'In `ft_ultimate_ft(int *********nbr)`, how many `*` do you put before nbr to reach the int?',
          'To store 42 in ft_ultimate_ft, how many times do you dereference nbr?',
        ],
        right: ['9'],
        wrong: ['8', '10', '1', '7'],
      },
      {
        ask: [
          'If `nbr` is a triple pointer to an integer, what type is `*nbr`?',
          'With an nbr with three asterisks, what type is *nbr?',
        ],
        right: ['`int **`'],
        wrong: ['`int ***`', '`int *`', '`int`', '`int ****`'],
      },
    ],
    wrong: ['8', '10', '`int *`', '`int`'],
    why: 'Each * removes one level of pointer: with nine stars in the type, you need nine * to reach the int.',
  },
  'pis-c01-swap-bug': {
    forms: [
      {
        ask: ['What is wrong with this ft_swap?', 'Why does this ft_swap swap nothing?'],
        right: ["It gets copies: the caller's values stay put"],
        wrong: [
          'It forgets to free tmp at the end',
          'tmp should be a pointer',
          'It loses the value of a before copying it',
          'It is missing a return of both values',
        ],
      },
      {
        ask: [
          'What prototype does the correct ft_swap have?',
          'How must ft_swap be declared to work?',
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
      'It forgets to free tmp at the end',
      'tmp should be a pointer',
      'It is missing a return of both values',
    ],
    why: "In C everything is passed by value: to change the caller's variables you have to receive their addresses.",
  },
  'pis-c01-pointer-alias': {
    forms: [
      {
        ask: ['What is `*p` at the end?', 'What is n when it finishes?'],
        right: ['12'],
        wrong: ['6', '10', '11', '5'],
      },
    ],
    wrong: ['6', '10', '11', '5'],
    why: 'p points to n, so *p and n are the same variable: 5 + 1 = 6, and then 6 × 2 = 12.',
  },
  'pis-c01-div-mod': {
    forms: [
      {
        ask: [
          'After `ft_div_mod(17, 5, &div, &mod)`, what are div and mod?',
          'If ft_div_mod is called with a = 17 and b = 5, what ends up in div and mod?',
        ],
        right: ['div = 3 and mod = 2'],
        wrong: [
          'div = 3 and mod = 5',
          'div = 2 and mod = 3',
          'div = 3.4 and mod = 2',
          'div = 3 and mod = 0',
        ],
      },
      {
        ask: ['What prototype does ft_div_mod have?', 'How is ft_div_mod declared?'],
        right: ['`void ft_div_mod(int a, int b, int *div, int *mod)`'],
        wrong: [
          '`int ft_div_mod(int a, int b, int div, int mod)`',
          '`void ft_div_mod(int *a, int *b, int div, int mod)`',
          '`void ft_div_mod(int a, int b, int **div, int **mod)`',
          '`int *ft_div_mod(int a, int b)`',
        ],
      },
    ],
    wrong: ['div = 3 and mod = 5', 'div = 2 and mod = 3', 'div = 3.4 and mod = 2'],
    why: 'Between ints, / gives the quotient without decimals and % the remainder: 17 = 5 × 3 + 2; the results go out through the pointers.',
  },
  'pis-c01-ultimate-div-mod': {
    forms: [
      {
        ask: [
          'With a = 17 and b = 5, what does `ft_ultimate_div_mod(&a, &b)` leave in a and b?',
          'ft_ultimate_div_mod gets the addresses of a = 17 and b = 5. How do they end up?',
        ],
        right: ['a = 3 and b = 2'],
        wrong: ['a = 2 and b = 3', 'a = 17 and b = 5', 'a = 3 and b = 5', 'a = 3.4 and b = 2'],
      },
    ],
    wrong: ['a = 2 and b = 3', 'a = 17 and b = 5', 'a = 3 and b = 5'],
    why: 'ft_ultimate_div_mod stores the quotient in *a and the remainder in *b: you must compute both before overwriting either.',
  },
  'pis-c01-negative-div': {
    forms: [
      {
        ask: ['In C, what is `-7 / 2`?', 'What does the integer division -7 / 2 give in C?'],
        right: ['-3'],
        wrong: ['-4', '-3.5', '3', '-2'],
      },
      {
        ask: ['In C, what is `-7 % 2`?', 'What remainder does -7 % 2 give in C?'],
        right: ['-1'],
        wrong: ['1', '0', '-2', '3'],
      },
      {
        ask: ['In C, what is `7 % -2`?', 'What remainder does 7 % -2 give in C?'],
        right: ['1'],
        wrong: ['-1', '0', '2', '-3'],
      },
    ],
    wrong: ['0', '-4', '-2'],
    why: 'In C integer division truncates towards zero (-3.5 becomes -3) and the remainder takes the sign of the dividend: -7 = 2 × -3 - 1.',
  },
  'pis-c01-putstr': {
    forms: [
      {
        ask: ['Why does this loop end?', 'What makes the while stop?'],
        right: ["*str is '\\0' at the end of the string"],
        wrong: [
          'str becomes NULL at the end',
          'write returns 0 on the last one',
          'str++ fails after the last letter',
          'The loop has a limit of 25 turns',
        ],
      },
      {
        ask: [
          'What would it write with `write(1, &str, 1)`?',
          'Changing str to &str in the write, what comes out?',
        ],
        right: ['A byte of the address of str, not the letter'],
        wrong: [
          'The same letter: &str and str are the same',
          'The whole string in one go',
          'Nothing: &str does not compile with write',
          'The letters of the string backwards',
        ],
      },
    ],
    wrong: ['str becomes NULL at the end', 'write returns 0 on the last one'],
    why: "*str is the letter str points to: the loop moves on until the final '\\0', and str (not &str) is that letter's address.",
  },
  'pis-c01-strlen': {
    forms: [
      {
        ask: [
          'What does `ft_strlen("42 Madrid")` return?',
          'With the string "42 Madrid", what does it return?',
        ],
        right: ['9'],
        wrong: ['10', '8', '2', '7'],
      },
      {
        ask: ['What does it return for the empty string?', 'If str is "", what does it return?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: ['What happens if you pass it NULL?', 'Called with str = NULL, what happens?'],
        right: ['It usually segfaults: it reads address 0'],
        wrong: [
          'It returns 0, as with the empty string',
          'It returns -1 to signal the error',
          'It does not compile: NULL is not a char *',
        ],
      },
    ],
    wrong: ['10', '8', '1'],
    why: "ft_strlen counts the chars up to the '\\0', without counting it (the space does count), and does not check for NULL.",
  },
  'pis-c01-rev-int-tab': {
    forms: [
      {
        ask: ['What does tab look like after the call?', 'What is in tab at the end?'],
        right: ['`{1, 2, 3, 4}`'],
        wrong: ['`{4, 3, 2, 1}`', '`{4, 2, 3, 1}`', '`{1, 3, 2, 4}`', '`{4, 3, 3, 4}`'],
      },
      {
        ask: [
          'Which condition fixes the loop?',
          'Which while makes the function really reverse the array?',
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
    why: 'Going over the whole array swaps each pair twice and puts it back: you only need to go halfway.',
  },
  'pis-c01-sort-int-tab': {
    forms: [
      {
        ask: ['What does tab look like after this pass?', 'What is in tab when the loop ends?'],
        right: ['`{2, 1, 3}`'],
        wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`', '`{1, 3, 2}`'],
      },
      {
        ask: [
          'What is missing for ft_sort_int_tab to always sort?',
          'To sort any array with this, what else is needed?',
        ],
        right: ['Repeating the pass until nothing changes'],
        wrong: [
          'Starting the loop at i = 1, not at 0',
          'Comparing with >= instead of with >',
          'Going over the array from right to left',
          'Copying the array into a spare one first',
        ],
      },
    ],
    wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`'],
    why: 'One bubble pass only carries the largest to the end ({3, 2, 1} becomes {2, 1, 3}): you repeat it until nothing changes.',
  },
  'pis-c01-amp-star': {
    forms: [
      {
        ask: [
          'If `n` is an integer, what type is `&n`?',
          'With n declared as an integer, what type is &n?',
        ],
        right: ['`int *`'],
        wrong: ['`int`', '`int **`', '`int &`', '`unsigned int`'],
      },
      {
        ask: ['With `p = &n`, what is `*p`?', 'If p holds &n, what does *p stand for?'],
        right: ['n itself: change it and n changes'],
        wrong: [
          'The address of n, in hexadecimal',
          'A copy of n made when p was set',
          'The size of n in bytes',
          'The address where p is stored',
        ],
      },
    ],
    wrong: [
      '`int`',
      '`int **`',
      'The address of n, in hexadecimal',
      'A copy of n made when p was set',
    ],
    why: '& gives the address of a variable (a pointer to its type) and * goes to that address: *(&n) is the same n.',
  },
  'pis-c01-array-index': {
    forms: [
      {
        ask: [
          'Which pointer expression is the same as the third element of `tab`?',
          'With pointer arithmetic, how do you read the third element of tab?',
        ],
        right: ['`*(tab + 2)`'],
        wrong: ['`*tab + 2`', '`&tab + 2`', '`*(tab + 3)`', '`tab + 2`'],
      },
      {
        ask: [
          'What index does the last element of `int tab[5]` have?',
          'In an array of 5 ints, what is the index of the last one?',
        ],
        right: ['4'],
        wrong: ['5', '3', '-1'],
      },
    ],
    wrong: ['`*tab + 2`', '`tab + 2`', '5', '3'],
    why: 'tab[i] is *(tab + i), and the pointer moves one int at a time; the indices go from 0 to size - 1.',
  },
  'pis-c02-strcpy': {
    forms: [
      {
        ask: ['What is this ft_strcpy missing?', 'What does this copy get wrong?'],
        right: ["Copying the final '\\0' into dest"],
        wrong: [
          'Returning src instead of dest',
          'Allocating dest with malloc first',
          'Checking that dest is longer',
          'Copying from the end backwards',
        ],
      },
      {
        ask: [
          'If dest held `"xxxxxx"`, which string is left after copying `"hola"`?',
          'With dest = "xxxxxx" and src = "hola", which string do you then read in dest?',
        ],
        right: ['`holaxx`'],
        wrong: ['`hola`', '`xxhola`', '`hol`'],
      },
    ],
    wrong: [
      'Returning src instead of dest',
      'Allocating dest with malloc first',
      'Checking that dest is longer',
    ],
    why: "Without copying the '\\0', dest ends wherever it ended before: leftovers of what it held stay stuck behind.",
  },
  'pis-c02-strncpy-pad': {
    forms: [
      {
        ask: [
          'What does ft_strncpy leave in the first 5 bytes of dest?',
          'What do dest[0] to dest[4] hold?',
        ],
        right: ["`'a' 'b' '\\0' '\\0' '\\0'`"],
        wrong: [
          "`'a' 'b' '\\0'` and two untouched",
          "`'a' 'b' 'a' 'b' 'a'`",
          "`'a' 'b' ' ' ' ' ' '`",
          "`'a' 'b' '\\0' '0' '0'`",
        ],
      },
      {
        ask: [
          'If it copied "abcdefgh" instead of "ab", how would dest end up?',
          'With src = "abcdefgh" and n = 5, what does ft_strncpy leave in dest?',
        ],
        right: ["abcde, with no '\\0' after it"],
        wrong: [
          "abcd, with a '\\0' at the end",
          'All of abcdefgh, overflowing',
          'Empty: it copies nothing if it does not fit',
          "abcde, with a '\\0' in dest[5]",
        ],
      },
    ],
    wrong: ['All of abcdefgh, overflowing', 'Empty: it copies nothing if it does not fit'],
    why: "strncpy always writes n bytes: if src is shorter it pads with '\\0', and if it is longer it cuts without a '\\0'.",
  },
  'pis-c02-str-is-numeric': {
    forms: [
      {
        ask: [
          'What do these three calls return, in order?',
          'What does each call give, from top to bottom?',
        ],
        right: ['`1 1 0`'],
        wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`', '`0 0 0`'],
      },
    ],
    wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`'],
    why: "The ft_str_is_* functions return 1 for the empty string (nothing fails), and '-' is not a digit.",
  },
  'pis-c02-str-is-printable': {
    forms: [
      {
        ask: [
          'Which characters does ft_str_is_printable accept?',
          'For ft_str_is_printable, which ASCII range is printable?',
        ],
        right: ['From 32 (space) to 126 (~)'],
        wrong: [
          'From 0 to 127, the whole table',
          'From 33 (!) to 127 (DEL)',
          'Only letters and digits',
          "From 48 ('0') to 122 ('z')",
        ],
      },
    ],
    wrong: [
      'From 0 to 127, the whole table',
      'From 33 (!) to 127 (DEL)',
      'Only letters and digits',
    ],
    why: 'In ASCII the printable characters go from space (32) to tilde (126); below that, and 127, are control characters.',
  },
  'pis-c02-str-is-lowercase': {
    forms: [
      {
        ask: [
          'What does `ft_str_is_lowercase("hola mundo")` return?',
          'ft_str_is_lowercase gets "hola mundo". What does it return, and why?',
        ],
        right: ['0, because a space is not lowercase'],
        wrong: [
          '1, because all its letters are',
          '1, because spaces do not count',
          '0, because it has two words',
          '9, the number of lowercase letters',
        ],
      },
    ],
    wrong: [
      '1, because all its letters are',
      '1, because spaces do not count',
      '0, because it has two words',
    ],
    why: "ft_str_is_lowercase returns 1 only if every character is between 'a' and 'z': the space already breaks it.",
  },
  'pis-c02-str-is-alpha-bug': {
    forms: [
      {
        ask: ['What does this version get wrong?', 'Why does it not meet the subject?'],
        right: ['It returns 1 at the first lowercase and rejects uppercase'],
        wrong: [
          'Nothing: it is exactly what the subject asks',
          'It also accepts digits as if they were letters',
          'It returns 1 for the empty string, and should not',
          "It runs off the string by not checking the '\\0'",
        ],
      },
      {
        ask: [
          'What does it return with `"ABC"`?',
          'If str is "ABC", what does this version return?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '3'],
      },
    ],
    wrong: [
      'Nothing: it is exactly what the subject asks',
      'It also accepts digits as if they were letters',
      '1',
    ],
    why: 'You must check every character (as soon as one is not a letter, 0) and accept a to z and A to Z.',
  },
  'pis-c02-strupcase': {
    forms: [
      {
        ask: [
          'What happens if you change `-= 32` to `+= 32`?',
          'Adding 32 instead of subtracting it, what does the function do?',
        ],
        right: ['Lowercase letters turn into other symbols, not capitals'],
        wrong: [
          'It turns the string lowercase instead of uppercase',
          'Nothing: adding or subtracting 32 gives the same letter',
          'It does not compile: a char does not support +=',
          'It changes the capitals and leaves lowercase as is',
        ],
      },
    ],
    wrong: [
      'It turns the string lowercase instead of uppercase',
      'Nothing: adding or subtracting 32 gives the same letter',
      'It does not compile: a char does not support +=',
    ],
    why: "It only touches 'a' to 'z' (97 to 122): adding 32 takes them out of ASCII (129 to 154), not to the capitals (65 to 90).",
  },
  'pis-c02-strcapitalize': {
    forms: [
      {
        ask: [
          'Which string does this call return?',
          'How does the string end up after ft_strcapitalize?',
        ],
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
          'For ft_strcapitalize, what is a word?',
          'In ft_strcapitalize, where does a word start and end?',
        ],
        right: ['A run of letters and digits'],
        wrong: [
          'Whatever sits between two spaces',
          'A run of letters only',
          'Whatever sits between two symbols',
          'Whatever starts with a capital',
        ],
      },
    ],
    wrong: [
      'Whatever sits between two spaces',
      'A run of letters only',
      'Whatever starts with a capital',
    ],
    why: 'A word is a run of letters and digits: its first character goes uppercase (if it is a letter) and the rest lowercase.',
  },
  'pis-c02-strlcpy': {
    forms: [
      {
        ask: ['What is n?', 'What does ft_strlcpy return here?'],
        right: ['7'],
        wrong: ['3', '4', '8', '0'],
      },
      {
        ask: ['Which string is left in buf?', 'What do you read in buf after the call?'],
        right: ['`pis`'],
        wrong: ['`pisc`', '`piscine`', '`pi`'],
      },
    ],
    wrong: ['3', '4', '8'],
    why: "ft_strlcpy copies at most size - 1 characters, ends with '\\0' and returns the length of src, whether it fits or not.",
  },
  'pis-c02-strlcpy-vs-strncpy': {
    forms: [
      {
        ask: [
          'What does ft_strlcpy do that ft_strncpy does not?',
          'Where does ft_strlcpy beat ft_strncpy?',
        ],
        right: ["It always ends dest with '\\0', if size is not 0"],
        wrong: [
          "It pads dest with '\\0' all the way to size",
          "It copies size bytes ignoring the '\\0' of src",
          'It returns dest, just like strncpy does',
          'It mallocs whatever room is missing',
        ],
      },
    ],
    wrong: [
      "It pads dest with '\\0' all the way to size",
      'It returns dest, just like strncpy does',
      'It mallocs whatever room is missing',
    ],
    why: "strncpy can leave dest without a '\\0' if src does not fit; strlcpy always adds it and returns the length of src.",
  },
  'pis-c02-non-printable': {
    forms: [
      {
        ask: [
          'How does ft_putstr_non_printable write the newline?',
          "ft_putstr_non_printable finds a '\\n'. What does it write?",
        ],
        right: ['`\\0a`'],
        wrong: ['`\\0A`', '`\\n`', '`\\10`', '`\\x0a`'],
      },
      {
        ask: [
          'How does ft_putstr_non_printable write character 127 (DEL)?',
          'With byte 127, what does ft_putstr_non_printable write?',
        ],
        right: ['`\\7f`'],
        wrong: ['`\\7F`', '`\\127`', '`\\177`', '`\\x7f`'],
      },
      {
        ask: [
          'How does ft_putstr_non_printable write character 27 (ESC)?',
          'With byte 27, what does ft_putstr_non_printable write?',
        ],
        right: ['`\\1b`'],
        wrong: ['`\\27`', '`\\1B`', '`\\e`', '`\\033`'],
      },
    ],
    wrong: ['`\\0A`', '`\\n`', '`\\10`'],
    why: 'ft_putstr_non_printable replaces each non-printable byte with a backslash and its value in hexadecimal, two lowercase digits.',
  },
  'pis-c02-print-memory': {
    forms: [
      {
        ask: [
          'How many bytes does ft_print_memory show on each line?',
          'How many bytes go on a line in ft_print_memory?',
        ],
        right: ['16'],
        wrong: ['8', '32', '4', '64'],
      },
      {
        ask: [
          'In the right-hand column of ft_print_memory, how does a non-printable byte appear?',
          'ft_print_memory finds a non-printable byte. How does it show it on the right?',
        ],
        right: ['As a dot'],
        wrong: ['As its hexadecimal value', 'As a blank space', 'As a question mark'],
      },
      {
        ask: [
          'In which base does ft_print_memory show the address of each line?',
          'The address at the start of each ft_print_memory line, in which base is it?',
        ],
        right: ['In hexadecimal'],
        wrong: ['In decimal', 'In octal', 'In binary'],
      },
    ],
    wrong: ['8', '32', '4'],
    why: 'ft_print_memory shows each line as a dump: the address in hexadecimal, 16 bytes in hexadecimal and those bytes as text, with a dot for the non-printable ones.',
  },
  'pis-c03-strcmp': {
    forms: [
      {
        ask: [
          'What does `ft_strcmp("abc", "abd")` return?',
          'With s1 = "abc" and s2 = "abd", what does it return?',
        ],
        right: ['-1'],
        wrong: ['1', '0', '3', '-100'],
      },
      {
        ask: [
          'What does `ft_strcmp("a", "A")` return?',
          'With s1 = "a" and s2 = "A", what does it return?',
        ],
        right: ['32'],
        wrong: ['-32', '1', '0', '97'],
      },
      {
        ask: [
          'What does `ft_strcmp("ab", "abc")` return?',
          'With s1 = "ab" and s2 = "abc", what does it return?',
        ],
        right: ['-99'],
        wrong: ['-1', '99', '0', '1'],
      },
    ],
    wrong: ['0', '1', '-32'],
    why: "ft_strcmp moves on while they match and returns the difference of the first different ones: the '\\0' counts as 0.",
  },
  'pis-c03-strcmp-unsigned': {
    forms: [
      {
        ask: [
          'Why does ft_strcmp subtract the characters as unsigned char?',
          'In ft_strcmp, what is the point of turning the chars into unsigned char before subtracting?',
        ],
        right: ['So that bytes 128 to 255 count as greater'],
        wrong: [
          'So that the result can never be negative',
          'Because in C you cannot subtract two chars',
          'To ignore upper and lower case',
          'To make the comparison run faster',
        ],
      },
    ],
    wrong: [
      'So that the result can never be negative',
      'Because in C you cannot subtract two chars',
    ],
    why: 'If char is signed, bytes 128 to 255 are negative; strcmp compares as unsigned char so that they sort after.',
  },
  'pis-c03-strcmp-sign': {
    forms: [
      {
        ask: [
          'If `ft_strcmp(s1, s2)` gives a negative number, what does it mean?',
          'What does it mean when ft_strcmp returns less than 0?',
        ],
        right: ['That s1 comes before s2 in ASCII order'],
        wrong: [
          'That s1 is shorter than s2',
          'That there was an error comparing',
          'That s2 comes before s1 in ASCII order',
          'That they have no letter in common',
        ],
      },
    ],
    wrong: [
      'That s1 is shorter than s2',
      'That there was an error comparing',
      'That they have no letter in common',
    ],
    why: 'Negative means s1 comes first, 0 that they are equal and positive that it comes after, comparing character by character.',
  },
  'pis-c03-strncmp': {
    forms: [
      {
        ask: [
          'What does `ft_strncmp("piscine", "pisco", 4)` return?',
          'What does `ft_strncmp("piscine", "pisco", 0)` return?',
        ],
        right: ['0'],
        wrong: ['-6', '6', '1', '-1'],
      },
      {
        ask: [
          'What does `ft_strncmp("piscine", "pisco", 5)` return?',
          'With "piscine", "pisco" and n = 5, what does it return?',
        ],
        right: ['-6'],
        wrong: ['6', '0', '-1', '1'],
      },
    ],
    wrong: ['6', '1', '-1'],
    why: "ft_strncmp looks at n characters at most: the first 4 are equal (0) and the fifth is 'i' - 'o' = -6.",
  },
  'pis-c03-strcat': {
    forms: [
      {
        ask: ['Which string is left in dest?', 'What do you read in dest at the end?'],
        right: ['`42 Madrid!`'],
        wrong: ['`42Madrid!`', '` Madrid!`', '`!`', '`42 Madrid`'],
      },
      {
        ask: ['What does ft_strcat return?', 'What does each call to ft_strcat return?'],
        right: ['A pointer to dest'],
        wrong: ['A pointer to src', 'The new length of dest', "A pointer to the final '\\0'"],
      },
    ],
    wrong: ['`42Madrid!`', '` Madrid!`', 'A pointer to src'],
    why: "ft_strcat copies src starting at the '\\0' of dest (and puts a new one at the end), and returns dest.",
  },
  'pis-c03-strcat-room': {
    forms: [
      {
        ask: [
          'What must dest satisfy so that `ft_strcat(dest, src)` does not overflow?',
          'Before calling ft_strcat, how much room does dest need?',
        ],
        right: ["Room for both strings and the '\\0'"],
        wrong: [
          'Room for src, not counting what it holds',
          'Nothing: ft_strcat allocates what is missing',
          'Room for the longer of the two',
          'Room for dest and src, without the end',
        ],
      },
    ],
    wrong: [
      'Room for src, not counting what it holds',
      'Nothing: ft_strcat allocates what is missing',
    ],
    why: 'ft_strcat allocates nothing: it writes after dest, which must have room for strlen(dest) + strlen(src) + 1.',
  },
  'pis-c03-strncat': {
    forms: [
      {
        ask: ['Which string is left in dest?', 'What do you read in dest after the call?'],
        right: ['`abcd`'],
        wrong: ['`abcdef`', '`ab`', '`cd`', '`abc`'],
      },
      {
        ask: [
          "Does ft_strncat add the '\\0' at the end even when it cuts src?",
          'When ft_strncat cuts src, does dest end properly?',
        ],
        right: ["Yes, it always adds the final '\\0'"],
        wrong: [
          'No, just like strncpy',
          'Only if src is shorter than nb',
          'Only if dest has room to spare',
        ],
      },
    ],
    wrong: ['`abcdef`', '`ab`', '`cd`'],
    why: "ft_strncat appends at most nb characters of src to the end of dest and always ends with '\\0'.",
  },
  'pis-c03-strstr': {
    forms: [
      {
        ask: [
          'What does `ft_strstr(str, "")` return?',
          'If the needle of ft_strstr is the empty string, what does it return?',
        ],
        right: ['A pointer to the start of str'],
        wrong: [
          'NULL, since there is nothing to find',
          "A pointer to the final '\\0' of str",
          'The length of str, touching nothing',
        ],
      },
      {
        ask: [
          'What does ft_strstr return if to_find is not in str?',
          'When ft_strstr does not find the needle, it returns…',
        ],
        right: ['NULL'],
        wrong: [
          'A pointer to the start of str',
          "A pointer to the '\\0' of str",
          'The empty string ""',
        ],
      },
    ],
    wrong: ["A pointer to the final '\\0' of str", 'The length of str, touching nothing'],
    why: 'Like strstr: an empty needle is found at the start (it returns str), and if it does not appear it returns NULL.',
  },
  'pis-c03-strstr-code': {
    forms: [
      {
        ask: ['Which string do you read from s?', 'After the call, which string is s?'],
        right: ['`anana`'],
        wrong: ['`ana`', '`nana`', '`na`', '`banana`'],
      },
    ],
    wrong: ['`ana`', '`nana`', '`banana`'],
    why: 'ft_strstr returns a pointer to the first occurrence inside str, which runs to the end: from position 1, anana.',
  },
  'pis-c03-strlcat': {
    forms: [
      {
        ask: ['What is n?', 'What does ft_strlcat return here?'],
        right: ['8'],
        wrong: ['5', '6', '3', '9'],
      },
      {
        ask: ['Which string is left in dest?', 'How does dest end up after the call?'],
        right: ['`abcde`'],
        wrong: ['`abcdef`', '`abcdefgh`', '`abc`', '`abcdefg`'],
      },
    ],
    wrong: ['5', '6', '9'],
    why: "With size 6 there is room for 5 characters and the '\\0': it adds de and stops; it returns strlen(dest) + strlen(src) = 3 + 5.",
  },
  'pis-c03-strlcat-small': {
    forms: [
      {
        ask: ['What is n?', 'What does ft_strlcat return here?'],
        right: ['7'],
        wrong: ['9', '4', '3', '10'],
      },
      {
        ask: ['How does dest end up?', 'What do you read in dest afterwards?'],
        right: ['`abcdef`'],
        wrong: ['`abcdefxyz`', '`abc`', '`abcx`', '`abcxyz`'],
      },
    ],
    wrong: ['9', '4', '10'],
    why: 'If size is not above strlen(dest), ft_strlcat leaves dest alone and returns size + strlen(src): 4 + 3 = 7.',
  },
  'pis-c03-strlcat-return': {
    forms: [
      {
        ask: [
          'What is the value returned by ft_strlcat for?',
          'What can you tell by looking at what ft_strlcat returns?',
        ],
        right: ['Whether it was cut: when it is >= size, it did not fit'],
        wrong: [
          'How many characters it managed to copy',
          'Where dest ends in memory',
          'Whether dest and src overlap or not',
          'How much room is still left in dest',
        ],
      },
      {
        ask: [
          'What does `ft_strlcat(dest, src, size)` return?',
          'Which formula gives what ft_strlcat returns?',
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
      'How many characters it managed to copy',
      'Where dest ends in memory',
      'How much room is still left in dest',
    ],
    why: 'ft_strlcat returns the length it tried to create, min(size, strlen(dest)) + strlen(src): if it reaches size, it was cut.',
  },
}
