/** Banco de Not-games en inglés: la piscina, C 04 a C 07 (`../piscine-c04-c07.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C04_C07_EN: Readonly<Record<string, ConceptText>> = {
  'pis-c04-putstr': {
    forms: [
      {
        ask: ['What does this program print?', 'What is the output of this program?'],
        right: ['ab'],
        wrong: ['abcd', 'ab\\0cd', 'a', 'cd'],
      },
    ],
    wrong: ['abcd', 'ab\\0cd', 'cd'],
    why: "The '\\0' in the middle cuts the string: for the loop the string ends there, and what follows is not printed.",
  },
  'pis-c04-putnbr-intmin': {
    forms: [
      {
        ask: ['Which number breaks this ft_putnbr?', 'Which input does this version print wrong?'],
        right: ['-2147483648'],
        wrong: ['0', '-1', '2147483647', '-10'],
      },
      {
        ask: [
          'Why does this version fail with INT_MIN?',
          'What happens in `nb = -nb` with INT_MIN?',
        ],
        right: [
          'Its opposite, 2147483648, does not fit in an int',
          'Flipping its sign overflows: there is no +2147483648',
        ],
        wrong: [
          'nb / 10 rounds wrongly with negative numbers',
          'write cannot print the minus sign',
          'The recursion has no base case for it',
          'ft_putchar does not accept negative digits',
        ],
      },
    ],
    wrong: ['0', '-1', '2147483647'],
    why: 'A 32-bit int goes from -2147483648 to 2147483647: the opposite of INT_MIN does not fit, so it needs its own case or a long.',
  },
  'pis-c04-putnbr-order': {
    forms: [
      {
        ask: ['What does `put(123)` print?', 'What is the output of `put(123)`?'],
        right: ['321'],
        wrong: ['123', '3', '12', '1'],
      },
      {
        ask: [
          'What change makes `put(123)` print the digits in order?',
          'How do you fix it so the number comes out right?',
        ],
        right: [
          'Call put(nb / 10) before printing the digit',
          'Print nb % 10 after the recursive call',
        ],
        wrong: [
          'Print nb / 10 instead of nb % 10',
          'Change nb >= 10 to nb > 0 in the if',
          "Add '1' to the digit instead of '0'",
          'Call put(nb % 10) instead of put(nb / 10)',
        ],
      },
    ],
    wrong: ['123', '3', '12'],
    why: 'nb % 10 is the last digit: printed before the call, the number comes out reversed; the leading digits have to be printed first.',
  },
  'pis-c04-atoi-signs': {
    forms: [
      {
        ask: [
          'What does the first call return?',
          'Given the first string, what does ft_atoi return?',
        ],
        right: ['-1234'],
        wrong: ['1234', '-1234567', '0', '1234567'],
      },
      {
        ask: [
          'What does the second call return?',
          'Given the second string, what does ft_atoi return?',
        ],
        right: ['42'],
        wrong: ['-42', '0', '4', '-4'],
      },
      {
        ask: [
          'What does the third call return?',
          'Given the third string, what does ft_atoi return?',
        ],
        right: ['12'],
        wrong: ['1234', '34', '0', '1'],
      },
    ],
    wrong: ['0', '1234', '-42'],
    why: "The Piscine's ft_atoi skips whitespace, reads every '+' and '-' (an odd number of '-' makes it negative) and stops at the first non-digit.",
  },
  'pis-c04-atoi-spaces': {
    forms: [
      {
        ask: [
          'Which characters does ft_atoi skip before the sign?',
          'In the C 04 ft_atoi, which whitespace is ignored at the start?',
        ],
        right: [
          "' ', \\t, \\n, \\v, \\f and \\r",
          "The six from isspace: ' ', \\t, \\n, \\v, \\f and \\r",
        ],
        wrong: [
          "Only the space ' ', nothing else",
          "Only ' ' and \\t, the ones on the keyboard",
          'None: a leading blank gives 0',
          'Anything that is not a digit',
        ],
      },
    ],
    wrong: ["Only ' ', \\t and \\n", 'Spaces and letters too'],
    why: 'The whitespace it skips is the same as isspace: space, tab, newline, \\v, \\f and \\r.',
  },
  'pis-c04-base-valid': {
    forms: [
      {
        ask: [
          'Which of these bases does ft_putnbr_base accept?',
          'Which base is valid for ft_putnbr_base?',
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
          'What does ft_putnbr_base do if the base is not valid?',
          'With an invalid base, what must ft_putnbr_base do?',
        ],
        right: ['Print nothing at all'],
        wrong: [
          'Print the number in decimal',
          'Print "Error" on the output',
          'Print only the minus sign',
          'Use the base "01" by default',
        ],
      },
    ],
    wrong: ['`"0"`', '`""`', '`"0123-456"`'],
    why: 'A base is invalid if it is empty, has a single character, repeats one or contains + or -; then nothing is printed.',
  },
  'pis-c04-base-convert': {
    forms: [
      {
        ask: ['What does the first line print?', 'In binary, what does the first line output?'],
        right: ['1010'],
        wrong: ['0101', '10', '1001', '110'],
      },
      {
        ask: ['What does the second line print?', 'In base 16, what does the second line output?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FE', 'EF'],
      },
      {
        ask: [
          'What does the third line print?',
          'In the base "poneyvif", what does the third line output?',
        ],
        right: ['op'],
        wrong: ['f', 'po', 'pp', 'oo'],
      },
    ],
    wrong: ['10', '0101', '1001'],
    why: 'The length of the base is the number of digits and each character is worth its position: 10 = 1010 in binary, 255 = FF in hex and 8 = "10" in base 8, which with poneyvif is op.',
  },
  'pis-c04-atoi-base': {
    forms: [
      {
        ask: [
          'What does the first call return?',
          'Read in binary, what does the first call return?',
        ],
        right: ['5'],
        wrong: ['101', '3', '6', '4'],
      },
      {
        ask: ['What does the second call return?', 'Read in hex, what does the second one return?'],
        right: ['-255'],
        wrong: ['255', '-15', '-256', '0'],
      },
      {
        ask: [
          'What does the third call return?',
          'With the base of the third one, what does it return?',
        ],
        right: ['0'],
        wrong: ['42', '-1', '1', '2'],
      },
    ],
    wrong: ['101', '255', '-1'],
    why: 'ft_atoi_base reads like ft_atoi but with the digits of the base (101 in binary is 5, -ff in hex is -255); with an invalid base, such as a one-character one, it returns 0.',
  },
  'pis-c04-intmin-value': {
    forms: [
      {
        ask: ['What is INT_MIN with a 32-bit int?', 'The smallest int (32 bits) is…'],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-4294967296', '-32768', '-4294967295'],
      },
      {
        ask: [
          'How many digits does INT_MIN have, not counting the sign?',
          'How many digits does ft_putnbr print for INT_MIN, without the sign?',
        ],
        right: ['10'],
        wrong: ['11', '9', '32', '8'],
      },
    ],
    wrong: ['-2147483647', '-32768', '-4294967296'],
    why: '32 bits hold 2³² values: from -2147483648 to 2147483647, and the negative side has one more than the positive side.',
  },
  'pis-c04-base-poney': {
    forms: [
      {
        ask: [
          'With the base "poneyvif", in which base is the number written?',
          'How many digits does the base "poneyvif" have?',
        ],
        right: ['8'],
        wrong: ['16', '2', '10', '7'],
      },
      {
        ask: [
          'In the base "poneyvif", which character is worth 5?',
          'How is 5 written with the base "poneyvif"?',
        ],
        right: ['v'],
        wrong: ['y', 'i', 'e', 'f'],
      },
    ],
    wrong: ['16', '2', '10'],
    why: 'Each character of the base is worth its position from 0: p = 0, o = 1, n = 2, e = 3, y = 4, v = 5, i = 6 and f = 7; that is 8, base 8.',
  },
  'pis-c04-octal': {
    forms: [
      {
        ask: ['How is 42 written in octal?', 'Decimal 42, in base 8, is…'],
        right: ['52'],
        wrong: ['50', '25', '62', '54'],
      },
      {
        ask: ['What is octal 17 in decimal?', '17 in base 8, converted to decimal, is…'],
        right: ['15'],
        wrong: ['17', '16', '23', '13'],
      },
    ],
    wrong: ['50', '25', '62'],
    why: 'In base 8 each digit is worth 8 times the one on its right: 42 = 5 × 8 + 2, and octal 17 is 1 × 8 + 7 = 15.',
  },
  'pis-c04-base-sign': {
    forms: [
      {
        ask: [
          'Why can a base not contain + or -?',
          'Why does ft_atoi_base reject a base with a sign in it?',
        ],
        right: [
          'They would be mixed up with the sign of the number',
          'You could not tell a digit from the sign',
        ],
        wrong: [
          'write cannot print those two characters',
          'They are not printable ASCII characters',
          'Each of them takes two bytes in memory',
          'The norminette forbids them in strings',
        ],
      },
    ],
    wrong: ['They get mixed up with spaces', 'They are slower to compare'],
    why: "Before the digits, '+' and '-' are read as a sign: if they were digits of the base, \"-1\" would have more than one reading.",
  },
  'pis-c05-fact-iter': {
    forms: [
      {
        ask: ['What does it return with nb = 5?', 'With nb = 5, what does this function return?'],
        right: ['120'],
        wrong: ['24', '25', '60', '720'],
      },
      {
        ask: ['What does it return with nb = 0?', 'With nb = 0, what does this function return?'],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: ['What does it return with nb = -3?', 'With nb = -3, what does this function return?'],
        right: ['0'],
        wrong: ['-6', '1', '-1', '6'],
      },
    ],
    wrong: ['24', '-1', '720'],
    why: '5! = 5 × 4 × 3 × 2 × 1 = 120; 0! is 1 (the loop never runs), and for a negative number the subject asks for 0.',
  },
  'pis-c05-fact-rec': {
    forms: [
      {
        ask: ['What does this version return with nb = 0?', 'With nb = 0, what does it return?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: ['What is wrong with this version?', 'Why would it fail the Moulinette?'],
        right: ['With 0 it returns 0, and 0! is 1', 'It needs nb == 0 to return 1 as well'],
        wrong: [
          'With 1 it calls itself forever',
          'With negatives it returns 1, not 0',
          'Nothing: it matches the subject',
          'With 5 it returns 24 instead of 120',
        ],
      },
    ],
    wrong: ['1', '-1', '2'],
    why: 'With 0 it computes 0 × f(-1), and f(-1) returns 0: the result is 0, but 0! is 1, so the base case must also cover 0.',
  },
  'pis-c05-power': {
    forms: [
      {
        ask: [
          'What does the first call return?',
          'How much is 2 to the power of 10 with this function?',
        ],
        right: ['1024'],
        wrong: ['20', '100', '512', '2048'],
      },
      {
        ask: [
          'According to the subject, what does the second call return?',
          'What does the subject ask for 0 to the power of 0?',
        ],
        right: ['That it returns 1', 'That it gives 1, as in maths'],
        wrong: [
          'That it returns 0',
          'That it returns -1, as an error',
          'That it returns 0, being undefined',
        ],
      },
      {
        ask: ['What does the third call return?', 'With a negative power, what does it return?'],
        right: ['0'],
        wrong: ['-25', '1', '-1', '25'],
      },
    ],
    wrong: ['512', '2048', '100'],
    why: 'It multiplies nb by itself power times (2¹⁰ = 1024); 0 to the power of 0 is 1 and a negative power returns 0, as the subject asks.',
  },
  'pis-c05-power-rec': {
    forms: [
      {
        ask: [
          'How many times does ft_recursive_power run with (3, 4), counting the first one?',
          'How many calls are there in total for nb = 3 and power = 4?',
        ],
        right: ['5'],
        wrong: ['4', '3', '81', '12'],
      },
      {
        ask: [
          'What does it return with nb = 3 and power = 4?',
          'With (3, 4), what does it return?',
        ],
        right: ['81'],
        wrong: ['12', '64', '27', '243'],
      },
    ],
    wrong: ['12', '64', '27'],
    why: 'Each call lowers power by 1 down to the base case: 4, 3, 2, 1 and 0 make 5 calls, and the result is 3 × 3 × 3 × 3 × 1 = 81.',
  },
  'pis-c05-fib': {
    forms: [
      {
        ask: ['What does it return with index = 7?', 'With index = 7, what does it return?'],
        right: ['13'],
        wrong: ['8', '21', '7', '11'],
      },
      {
        ask: [
          'What does it return with index = -4?',
          'With a negative index, what does it return?',
        ],
        right: ['-1'],
        wrong: ['0', '-3', '3', '1'],
      },
    ],
    wrong: ['8', '21', '0'],
    why: 'The sequence starts 0, 1, 1, 2, 3, 5, 8, 13: index 7 is 13; for a negative index the subject asks for -1.',
  },
  'pis-c05-fib-cost': {
    forms: [
      {
        ask: [
          'How does the number of calls grow in a recursive ft_fibonacci that stores nothing?',
          'If ft_fibonacci calls itself twice, how does its cost grow with the index?',
        ],
        right: [
          'Exponentially: each call makes two more',
          'Exponentially, repeating the same work',
        ],
        wrong: [
          'Linearly: one call per index',
          'Like a logarithm, as in a binary search',
          'Like the square of the index, no more',
          'It does not grow: always two calls',
        ],
      },
    ],
    wrong: ['Linearly, like a loop', 'Like the recursive factorial'],
    why: 'fib(n) calls fib(n-1) and fib(n-2), which repeat the same work again: the number of calls grows roughly like 1.6ⁿ.',
  },
  'pis-c05-sqrt': {
    forms: [
      {
        ask: ['What does the first call return?', 'Given 49, what does ft_sqrt return?'],
        right: ['7'],
        wrong: ['0', '24', '6', '49'],
      },
      {
        ask: ['What does the second call return?', 'Given 50, what does ft_sqrt return?'],
        right: ['0'],
        wrong: ['7', '8', '-1', '7.07'],
      },
      {
        ask: ['What does the third call return?', 'Given -16, what does ft_sqrt return?'],
        right: ['0'],
        wrong: ['4', '-4', '-1', '16'],
      },
    ],
    wrong: ['-1', '-4', '16'],
    why: 'ft_sqrt returns the integer root only if it is exact: 49 gives 7; 50 is not a perfect square and a negative has no root, so both give 0.',
  },
  'pis-c05-sqrt-overflow': {
    forms: [
      {
        ask: ['What is wrong with this ft_sqrt?', 'Which inputs break this version?'],
        right: [
          'With nb near INT_MAX, i * i overflows',
          'i * i does not fit in an int for a huge nb',
        ],
        wrong: [
          'With nb = 1 it returns 0 instead of 1',
          'With negatives it loops forever',
          'For perfect squares it returns i + 1',
          'With nb = 0 it never leaves the loop',
        ],
      },
    ],
    wrong: ['With nb = 4 it returns 0', 'Nothing: it matches the subject'],
    why: 'For nb near 2147483647, i reaches 46341 and 46341 × 46341 no longer fits in an int: it overflows; 0, 1 and negatives work fine.',
  },
  'pis-c05-prime': {
    forms: [
      {
        ask: ['Which number gets a wrong answer?', 'Which input makes this version lie?'],
        right: ['1'],
        wrong: ['2', '3', '97', '4'],
      },
      {
        ask: ['What is this ft_is_prime missing?', 'What must be added to make it right?'],
        right: ['Returning 0 when nb is less than 2', 'Treating 0, 1 and negatives as not prime'],
        wrong: [
          'Starting the loop at i = 1, not 2',
          'Returning 1 as soon as nb is even',
          'Trying i up to nb included',
          'Returning 0 when nb is 2',
        ],
      },
    ],
    wrong: ['2', '3', '97'],
    why: 'With nb below 2 the loop never runs and it returns 1, but 0, 1 and negatives are not prime.',
  },
  'pis-c05-prime-sqrt': {
    forms: [
      {
        ask: [
          'To know whether n is prime, what is the highest divisor you need to try?',
          'For ft_is_prime not to be slow, up to which divisor is enough?',
        ],
        right: ['The square root of n', 'The largest i such that i * i <= n'],
        wrong: [
          'Half of n, n / 2',
          'The number before n, n - 1',
          'The base-2 logarithm of n',
          'A tenth of n',
        ],
      },
    ],
    wrong: ['n itself', 'The prime just below n'],
    why: 'If n = a × b, one of them is at most √n: if there is no divisor up to there, there is none at all.',
  },
  'pis-c05-next-prime': {
    forms: [
      {
        ask: ['What does the first call return?', 'Given 14, what does ft_find_next_prime return?'],
        right: ['17'],
        wrong: ['15', '13', '19', '16'],
      },
      {
        ask: ['What does the second call return?', 'If nb is already prime, what does it return?'],
        right: ['17'],
        wrong: ['19', '18', '23'],
      },
      {
        ask: ['What does the third call return?', 'Given a negative number, what does it return?'],
        right: ['2'],
        wrong: ['-5', '0', '-3', '1'],
      },
    ],
    wrong: ['19', '13', '0'],
    why: 'It returns the first prime greater than or equal to nb: 14 gives 17, 17 already is one, and below 2 the first one is 2.',
  },
  'pis-c05-queens': {
    forms: [
      {
        ask: [
          'How many solutions does the ten queens puzzle have?',
          'How many ways are there to place 10 queens on a 10 × 10 board without attacks?',
        ],
        right: ['724'],
        wrong: ['92', '10', '512', '2680'],
      },
      {
        ask: [
          'How is each solution printed in ft_ten_queens_puzzle?',
          'In ft_ten_queens_puzzle, what does each output line look like?',
        ],
        right: [
          'Ten digits: the row of the queen in each column',
          'A line of 10 digits, one per column',
        ],
        wrong: [
          'A 10 × 10 board with dots and Q',
          'The coordinates of each queen, with commas',
          'A number from 0 to 723 per solution',
          'Ten letters from A to J, one per row',
        ],
      },
    ],
    wrong: ['92', '512', '1024'],
    why: 'There are 724 ways to place ten queens; each is written as 10 digits, the position of the queen in each column, and the function returns how many there are.',
  },
  'pis-c05-recursion-stack': {
    forms: [
      {
        ask: ['What does `f(4)` return?', 'With n = 4, what does f return?'],
        right: ['4'],
        wrong: ['0', '5', '10', '24'],
      },
      {
        ask: ['What happens with `f(-1)`?', 'If it is called with n = -1, what happens?'],
        right: [
          'It calls itself until the stack overflows',
          'It never reaches n == 0 and the stack overflows',
        ],
        wrong: [
          'It returns -1, just as f(4) gives 4',
          'It returns 0 straight away',
          'It returns 1 after a single call',
          'It does not compile with a negative',
        ],
      },
    ],
    wrong: ['0', '5', '10'],
    why: 'Each call adds 1 and lowers n; with -1 it never reaches the base case n == 0, and each call takes stack space until it runs out (segfault).',
  },
  'pis-c06-program-name': {
    forms: [
      {
        ask: ['What does it print?', 'What is the output of this command?'],
        right: ['./a.out'],
        wrong: ['hola', './a.out hola mundo', 'hola mundo', 'a.out'],
      },
      {
        ask: ['What does argv[0] hold?', 'What is in the first element of argv?'],
        right: [
          'The name the program was launched with',
          'The command as it was typed to launch it',
        ],
        wrong: [
          'The first argument after the name',
          'The number of arguments, as text',
          'The path of the current directory',
          'NULL when no argument is given',
        ],
      },
    ],
    wrong: ['hola', 'hola mundo', 'a.out'],
    why: 'argv[0] is the name of the program as it was typed in the shell (here ./a.out); the arguments start at argv[1].',
  },
  'pis-c06-argc-count': {
    forms: [
      {
        ask: [
          'What is argc if you run the program with no arguments?',
          'With a bare `./a.out`, what is argc?',
        ],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: [
          'What is argc with `./a.out "hola mundo" 42`?',
          'If you run `./a.out "hola mundo" 42`, what value does argc have?',
        ],
        right: ['3'],
        wrong: ['4', '2', '5'],
      },
    ],
    wrong: ['0', '2', '4'],
    why: 'argc also counts the program name, and what goes between quotes is a single argument: "hola mundo" counts as one.',
  },
  'pis-c06-argv-null': {
    forms: [
      {
        ask: ['What is in argv[argc]?', 'Right after the last argument, what does argv hold?'],
        right: ['NULL', 'A null pointer'],
        wrong: [
          'The last argument',
          'An empty string ""',
          'Garbage: it is out of the array',
          'The name of the program',
        ],
      },
    ],
    wrong: ["A '\\0' character", 'The value of argc'],
    why: 'The C standard guarantees that argv[argc] is a null pointer: that is why you can walk argv until you find NULL.',
  },
  'pis-c06-print-params': {
    forms: [
      {
        ask: ['How many lines does it print?', 'How many lines come out with that command?'],
        right: ['2'],
        wrong: ['3', '4', '1'],
      },
      {
        ask: ['What comes out on the first line?', 'What does it print on the first line?'],
        right: ['a b'],
        wrong: ['./a.out', 'a', '"a b"', 'b'],
      },
    ],
    wrong: ['3', '4', '1'],
    why: 'It starts at argv[1], so it does not print the name; the quotes join "a b" into a single argument and the shell removes them.',
  },
  'pis-c06-rev-params': {
    forms: [
      {
        ask: ['What does it print on the last line?', 'What comes out last?'],
        right: ['./a.out'],
        wrong: ['x', 'z', '(null)'],
      },
      {
        ask: [
          'What must change for it to do what ft_rev_params asks?',
          'How do you fix this ft_rev_params?',
        ],
        right: ['Stop at i > 0 so argv[0] is not printed', 'Change i >= 0 to i >= 1 in the while'],
        wrong: [
          'Start at i = argc, not at argc - 1',
          'Start at i = 1 and add instead of subtract',
          'Print argv[i - 1] instead of argv[i]',
          'Nothing: ft_rev_params includes argv[0]',
        ],
      },
    ],
    wrong: ['x', 'z', '(null)'],
    why: 'With i >= 0 it goes down to argv[0] and also prints the program name, which ft_rev_params must not print.',
  },
  'pis-c06-sort-ascii': {
    forms: [
      {
        ask: [
          'ft_sort_params gets `b A a B`. In what order does it print them?',
          'How are `b A a B` sorted in ASCII order?',
        ],
        right: ['A, B, a, b'],
        wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
      },
      {
        ask: [
          'Why does "Zoo" come before "abeja" in ft_sort_params?',
          'In ASCII order, why does "Zoo" go ahead of "abeja"?',
        ],
        right: [
          'Uppercase letters have lower ASCII codes',
          "Because 'Z' is 90 and 'a' is 97 in ASCII",
        ],
        wrong: [
          'Because it is the shorter of the two',
          'Because it sorts from Z to A',
          'Because uppercase always goes last',
          'Because it sorts ignoring case',
        ],
      },
    ],
    wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
    why: 'It compares ASCII codes, like ft_strcmp: all uppercase letters (65 to 90) come before lowercase ones (97 to 122).',
  },
  'pis-c06-main-proto': {
    forms: [
      {
        ask: [
          'With which prototype does main receive the arguments?',
          'To read the command arguments, how is main declared?',
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
    why: 'main first receives argc (how many there are) and then argv (an array of strings), and returns an int.',
  },
  'pis-c06-argv-type': {
    forms: [
      {
        ask: ['What type is argv[1]?', 'In main, what type is each argv[i]?'],
        right: ['`char *`'],
        wrong: ['`char`', '`char **`', '`int`', '`int *`'],
      },
      {
        ask: ['What is `argv[1][0]`?', 'What does `argv[1][0]` hold?'],
        right: ['The first letter of the first argument', 'The first char of the first argument'],
        wrong: [
          'The whole first argument',
          'The name of the program',
          'The first letter of the program name',
          'The number of arguments',
        ],
      },
    ],
    wrong: ['`char`', '`char **`', '`int`'],
    why: 'argv is an array of strings: argv[1] is a string (char *) and argv[1][0] is its first character.',
  },
  'pis-c06-argv-numbers': {
    forms: [
      {
        ask: [
          'If you run `./a.out 42`, what arrives in argv[1]?',
          'With `./a.out 42`, what kind of data does the program receive?',
        ],
        right: ['The string "42"', "The chars '4', '2' and a '\\0'"],
        wrong: [
          'The int 42',
          'The number 42, already converted',
          "The char with code 42, '*'",
          'A pointer to the int 42',
        ],
      },
    ],
    wrong: ['A long holding 42', 'A float holding 42.0'],
    why: 'Arguments always arrive as text; to use them as numbers you have to convert them, for instance with ft_atoi.',
  },
  'pis-c06-sort-swap': {
    forms: [
      {
        ask: ['What does this snippet swap?', 'What moves when the swap happens?'],
        right: ['The pointers of two arguments', 'The addresses of the two strings'],
        wrong: [
          'The letters of both strings, one by one',
          'Only the first character of each string',
          'The values of i and i + 1',
          'The lengths of the two strings',
        ],
      },
      {
        ask: ['When does it swap them?', 'In which case does it enter the if?'],
        right: ['When argv[i] comes after argv[i + 1]', 'When the two are in reverse ASCII order'],
        wrong: [
          'When argv[i] is longer than the next one',
          'When argv[i] comes before argv[i + 1]',
          'When the two strings are equal',
          'When the first starts with an uppercase',
        ],
      },
    ],
    wrong: [
      'The values of i and i + 1',
      'The lengths of the two strings',
      'Only the first character of each string',
    ],
    why: 'ft_strcmp gives more than 0 if the first comes after; then the pointers in argv are swapped, without copying any letter.',
  },
  'pis-c06-argv-loop': {
    forms: [
      {
        ask: ['What is i at the end?', 'When the loop exits, what is i?'],
        right: ['3'],
        wrong: ['2', '4', '1'],
      },
      {
        ask: ['Why does this loop end?', 'What makes the while stop?'],
        right: ['Because argv[argc] is NULL', 'Because argv ends with a null pointer'],
        wrong: [
          "Because each argument ends in '\\0'",
          'Because i reaches argc and the while knows',
          'Because it leaves the array and segfaults',
          'Because argv[i] is 0 once i reaches 10',
        ],
      },
    ],
    wrong: ['2', '4', '1'],
    why: 'argv[0] is ./a.out, argv[1] is x, argv[2] is y and argv[3] is NULL: the loop stops with i = 3, which is argc.',
  },
  'pis-c06-program': {
    forms: [
      {
        ask: ['What do you hand in for the C 06 exercises?', 'Unlike C 05, in C 06 you hand in…'],
        right: ['A whole program, with its main', 'A .c with its main, compiled on its own'],
        wrong: [
          'Only the function, without any main',
          'A Makefile and a .a library',
          'A shell script that runs it',
          'A .h header with the prototype',
        ],
      },
    ],
    wrong: ['An empty main and the function apart', 'The executable, already compiled'],
    why: 'The C 06 exercises ask for programs: the main reads argc and argv and compiles on its own.',
  },
  'pis-c07-strdup': {
    forms: [
      {
        ask: [
          'With src = "Madrid", how many bytes does it ask malloc for?',
          'How many bytes does it reserve for "Madrid"?',
        ],
        right: ['7'],
        wrong: ['6', '8', '1'],
      },
      {
        ask: ['What is the `if (!dup)` for?', 'What does `if (!dup)` check?'],
        right: [
          'To return NULL if malloc could not reserve',
          'To avoid writing to memory if malloc failed',
        ],
        wrong: [
          'To skip the copy if src is an empty string',
          'To free dup if it was already reserved',
          'To check that src is not NULL',
          'To know whether src and dup are equal',
        ],
      },
      {
        ask: [
          "What happens if `dup[i] = '\\0'` is removed?",
          "Without the line `dup[i] = '\\0'`, what happens?",
        ],
        right: ["The copy is left without its final '\\0'"],
        wrong: [
          'Nothing: malloc sets the memory to zero',
          'The last letter of the copy is lost',
          'There is a memory leak on return',
        ],
      },
    ],
    wrong: ['6', '8', '1'],
    why: "malloc reserves strlen + 1 bytes (the last one for the '\\0') and does not zero them; if it fails it returns NULL and nothing must be written.",
  },
  'pis-c07-range': {
    forms: [
      {
        ask: [
          'How many ints are in the array from `ft_range(3, 7)`?',
          'How many numbers does `ft_range(3, 7)` return?',
        ],
        right: ['4'],
        wrong: ['5', '3', '7'],
      },
      {
        ask: [
          'What does `ft_range(5, 5)` return?',
          'If min and max are equal, what does ft_range return?',
        ],
        right: ['NULL', 'A null pointer'],
        wrong: [
          'An array holding 5',
          'An empty array of size 0',
          'The number 0',
          'An array holding 5 and 5',
        ],
      },
    ],
    wrong: ['5', '3', '7'],
    why: 'ft_range goes from min included to max excluded (3, 4, 5 and 6); if min >= max, it returns NULL.',
  },
  'pis-c07-range-bytes': {
    forms: [
      {
        ask: [
          'How many bytes does it ask malloc for, with a 4-byte int?',
          'With a 4-byte int, how many bytes does it reserve?',
        ],
        right: ['20'],
        wrong: ['12', '5', '24', '16'],
      },
      {
        ask: ['What is the last number in the array?', 'Which value ends up in the last slot?'],
        right: ['2'],
        wrong: ['3', '1', '4'],
      },
    ],
    wrong: ['12', '24', '3'],
    why: 'From -2 to 3, without 3, there are 5 numbers (-2, -1, 0, 1 and 2), and 5 × sizeof(int) is 20 bytes.',
  },
  'pis-c07-ultimate-range': {
    forms: [
      {
        ask: [
          'If min >= max, what does ft_ultimate_range do?',
          'With min >= max, how does ft_ultimate_range end?',
        ],
        right: ['Sets *range to NULL and returns 0'],
        wrong: [
          'Sets *range to NULL and returns -1',
          'Leaves *range as it was and returns 0',
          'Reserves one int and returns 1',
          'Returns max - min, which is negative',
        ],
      },
      {
        ask: [
          'If malloc fails, what does ft_ultimate_range return?',
          'When malloc cannot reserve, what does ft_ultimate_range return?',
        ],
        right: ['It returns -1'],
        wrong: ['It returns 0', 'It returns NULL', 'It returns the size asked for'],
      },
      {
        ask: [
          'Why does ft_ultimate_range take `int **range`?',
          'What is the double pointer of ft_ultimate_range for?',
        ],
        right: ['To leave in *range the array it reserves', "To change the caller's own pointer"],
        wrong: [
          'Because it returns a two-dimensional array',
          'So that range is read-only',
          'Because each number gets its own malloc',
          'To receive min and max inside range',
        ],
      },
    ],
    wrong: ['It returns 0', 'It returns NULL', 'It returns the size asked for'],
    why: 'ft_ultimate_range returns the size and leaves the array in *range, which is why it gets the address of the pointer; if min >= max, *range = NULL and 0; if malloc fails, -1.',
  },
  'pis-c07-strjoin': {
    forms: [
      {
        ask: ['Which string does it return?', 'What does this call return?'],
        right: ['a, b, c'],
        wrong: ['a, b, c,', 'abc', ', a, b, c', 'a,b,c'],
      },
      {
        ask: [
          'How many bytes must be reserved for the result?',
          'How many bytes does the exact malloc ask for?',
        ],
        right: ['8'],
        wrong: ['7', '9', '10', '6'],
      },
      {
        ask: ['With size = 0, what does ft_strjoin return?', 'If size is 0, what must it return?'],
        right: [
          'An empty string that can be passed to free',
          'A "" reserved with malloc, which gets freed',
        ],
        wrong: [
          'NULL, since there is nothing to join',
          'The separator, without any string',
          'A pointer to strs[0], without copying it',
          'A string with a single space',
        ],
      },
    ],
    wrong: ['7', '9', '10'],
    why: "The separator only goes between strings, not at the end: 3 letters, 2 separators of 2 and the '\\0' make 8 bytes; with size 0 you return a reserved empty string.",
  },
  'pis-c07-split': {
    forms: [
      {
        ask: [
          'How many words does it return?',
          'How many strings are there in tab before the end?',
        ],
        right: ['3'],
        wrong: ['4', '2', '5', '6'],
      },
      {
        ask: ['What is in the last slot of tab?', 'What does the tab array end with?'],
        right: ['A null pointer (0)', 'NULL, which marks the end'],
        wrong: [
          'The string "42"',
          'An empty string ""',
          'The separator string " ,"',
          'The string "mundo  42"',
        ],
      },
      {
        ask: [
          'How does ft_split treat its second argument, " ,"?',
          'What does " ," mean to ft_split?',
        ],
        right: ['As a set: each character splits', "As two separators, ' ' and ','"],
        wrong: [
          'As a single two-character separator',
          'As the exact text to look for',
          'It only uses the first one, the space',
          'As a regular expression',
        ],
      },
    ],
    wrong: ['4', '2', '5'],
    why: 'Each character of the separator string splits, and consecutive separators give no empty words: out come hola, mundo and 42, and the array ends with a pointer to 0.',
  },
  'pis-c07-split-free': {
    forms: [
      {
        ask: [
          'How do you free everything ft_split returns?',
          'To avoid leaks with the result of ft_split, what must be freed?',
        ],
        right: [
          'One free per word and then one for the array',
          'First each word and the array at the end',
        ],
        wrong: [
          'A single free of the array, which frees it all',
          'First the array and then each word',
          'free(*tab), which frees all the words',
          'Nothing: the words are string literals',
        ],
      },
    ],
    wrong: ['Only the last word, the NULL one', 'One free per word, not the array'],
    why: 'Each word is a malloc and the array is another: free the words and then the array, which can no longer be read if freed first.',
  },
  'pis-c07-malloc-size': {
    forms: [
      {
        ask: ['What is wrong?', 'What is the mistake in this allocation?'],
        right: ['It reserves 5 bytes, not 5 ints', 'It should be malloc(sizeof(int) * 5)'],
        wrong: [
          'malloc cannot reserve ints',
          'tab must be set to NULL first',
          'It should be malloc(sizeof(tab))',
          'It needs a cast: (int)malloc(5)',
        ],
      },
      {
        ask: ['How many bytes does it reserve?', 'How many bytes are there in tab?'],
        right: ['5'],
        wrong: ['20', '40', '4'],
      },
    ],
    code: 'int *tab;\n\ntab = malloc(5);\n/* tab[0] ... tab[4] are used */',
    wrong: ['20', '40', '4'],
    why: 'malloc counts bytes, not elements: for 5 ints you must ask for 5 × sizeof(int), usually 20.',
  },
  'pis-c07-leak': {
    forms: [
      {
        ask: ['What is wrong with this code?', 'What problem does it have?'],
        right: ['The first malloc is lost: there is a leak', 'The copy of "hola" is never freed'],
        wrong: [
          'It frees "mundo" twice: a double free',
          'It writes outside the reserved memory',
          'Nothing: the last free is enough',
          'ft_strdup cannot be called twice',
        ],
      },
      {
        ask: ['How many bytes are left unfreed?', 'How many bytes does it lose?'],
        right: ['5'],
        wrong: ['4', '6', '11', '0'],
      },
    ],
    wrong: ['4', '6', '11'],
    why: 'Reassigning s loses the only address of the copy of "hola" (5 bytes with the \'\\0\'): nobody can free it any more.',
  },
  'pis-c07-convert-base': {
    forms: [
      {
        ask: [
          'What does the first call return?',
          'Converted from hex to binary, what does it return?',
        ],
        right: ['11111111'],
        wrong: ['255', '1111111', '111111111', '11110000'],
      },
      {
        ask: [
          'What does the second call return?',
          'Converted from decimal to hex, what does it return?',
        ],
        right: ['-A'],
        wrong: ['A', '-a', 'A-', '-F'],
      },
      {
        ask: [
          'If either base is not valid, what does ft_convert_base return?',
          'With an invalid base, what does ft_convert_base return?',
        ],
        right: ['NULL'],
        wrong: ['The string "0"', 'nbr unchanged', 'An empty string'],
      },
    ],
    wrong: ['255', '1111111', '11110000'],
    why: 'ft_convert_base reads nbr in base_from and writes it, reserved with malloc, in base_to: ff is 255, which in binary is 11111111, and -10 is -A; if a base is invalid, NULL.',
  },
  'pis-c07-char-pp': {
    forms: [
      {
        ask: [
          'What is the `char **` that ft_split returns?',
          'A `char **` used as in ft_split is…',
        ],
        right: ['An array of pointers to strings', 'A pointer to pointers to char'],
        wrong: [
          'A string twice as long',
          'A fixed char[10][10] array',
          'A pointer to a single char',
          'A char that takes two bytes',
        ],
      },
    ],
    wrong: ['An array of int', 'A pointer to a function'],
    why: 'Each slot of a char ** is a char *, a string: it is an array of strings, like argv.',
  },
  'pis-c07-use-after-free': {
    forms: [
      {
        ask: ['What is wrong with these lines?', 'What is the mistake?'],
        right: ['It writes to memory already freed', 'It uses s after free'],
        wrong: [
          'A leak: another free is missing',
          'A literal cannot be changed',
          'There is a double free of s',
          'Nothing: s still points there',
        ],
      },
    ],
    wrong: ['ft_strdup returns NULL', 'A cast to char is missing'],
    why: 'After free(s) the memory is no longer yours even if s still holds the address: writing there is undefined behaviour.',
  },
}
