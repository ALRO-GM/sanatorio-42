/** Repaso de Not-games en inglés: traducción de `../review-piscine-c00-c03.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C00_C03_EN: Readonly<Record<string, ReviewEntry>> = {
  'pis-c00-putchar-write': {
    title: 'ft_putchar with write',
    definition:
      'write(fd, buf, count) writes count bytes from address buf to descriptor fd. For a single character: fd 1 (standard output), &c and 1. It lives in unistd.h.',
    example: '#include <unistd.h>\nvoid ft_putchar(char c) { write(1, &c, 1); }',
  },
  'pis-c00-write-return': {
    title: 'What write returns',
    definition:
      'write returns how many bytes it actually wrote (it can be fewer than asked) or -1 if it fails. It does not return the character or the descriptor.',
    example: 'write(1, "hola", 4) returns 4; with a closed fd it returns -1.',
  },
  'pis-c00-write-proto': {
    title: 'The prototype of write',
    definition:
      'ssize_t write(int fd, const void *buf, size_t count): the fd first, then the address of the bytes (of any type, hence void *) and how many. It returns ssize_t because it can be -1.',
    example: 'int n = 42; write(1, &n, 1); compiles: &n converts to const void *.',
  },
  'pis-c00-print-alphabet': {
    title: 'Walking letters with a char',
    definition:
      "A char is a small number: 'a' is 97 and 'z' 122, so you can add to it, compare it and use it as the counter of a while.",
    example: "c = 'a'; while (c <= 'z') { write(1, &c, 1); c++; } writes the alphabet.",
  },
  'pis-c00-reverse-alphabet': {
    title: 'The edges of a loop',
    definition:
      "With < or > the edge value is left out; with <= or >= it is included. Going backwards, while (c >= 'a') reaches the a and while (c > 'a') stops at b.",
    example: "c = 'z'; while (c >= 'a') { write(1, &c, 1); c--; } writes zyx…a.",
  },
  'pis-c00-print-numbers': {
    title: 'The digit and the character',
    definition:
      "The number 0 and the character '0' are not the same: write outputs bytes, and the byte that shows as 0 is 48. You have to write the character, not the number.",
    example: "c = '0'; while (c <= '9') { write(1, &c, 1); c++; } writes 0123456789.",
  },
  'pis-c00-char-digit': {
    title: "From digit to character with '0'",
    definition:
      "Digits are consecutive in ASCII from '0' (48) to '9' (57): n + '0' gives the character of digit n, and c - '0' gives the number of a digit character.",
    example: "char c = 7 + '0'; // '7'\nint n = '7' - '0'; // 7",
  },
  'pis-c00-is-negative': {
    title: 'ft_is_negative and zero',
    definition:
      'ft_is_negative writes N if n is negative and P if it is positive or zero: 0 is not less than 0, so it goes down the else branch.',
    example: 'ft_is_negative(-5) writes N; ft_is_negative(0) and ft_is_negative(3) write P.',
  },
  'pis-c00-print-comb': {
    title: 'ft_print_comb',
    definition:
      'Writes every combination of three distinct digits in increasing order (the first smaller than the second, and that one smaller than the third), separated by a comma and a space: 120 in all.',
    example: '012, 013, 014, …, 019, 023, …, 789',
  },
  'pis-c00-print-comb2': {
    title: 'ft_print_comb2',
    definition:
      'Writes every pair of two-digit numbers a and b with a < b, from 00 to 99, in order: the second is always larger, so 4950 pairs come out.',
    example: '00 01, 00 02, …, 00 99, 01 02, …, 98 99',
  },
  'pis-c00-putnbr-intmin': {
    title: 'INT_MIN in ft_putnbr',
    definition:
      'A 32-bit int goes from -2147483648 to 2147483647: the smallest has no positive, and -n overflows. Handle it separately (writing it as is) or move the number to a long.',
    example: 'if (n == -2147483648) { write(1, "-2147483648", 11); return; }',
  },
  'pis-c00-putnbr-code': {
    title: 'Recursive ft_putnbr',
    definition:
      "ft_putnbr writes the sign if needed, calls itself with n / 10 to write the high digits and then writes n % 10 + '0', the last one.",
    example: 'ft_putnbr(123): ft_putnbr(12) → ft_putnbr(1) writes 1, then 2 and then 3.',
  },
  'pis-c00-compile': {
    title: 'Compiling in the piscine',
    definition:
      'Everything compiles with cc -Wall -Wextra -Werror: -Wall and -Wextra turn on warnings and -Werror turns them into errors. Without -o, the executable is called a.out.',
    example: 'cc -Wall -Wextra -Werror main.c ft_putchar.c && ./a.out',
  },
  'pis-c00-print-combn': {
    title: 'ft_print_combn',
    definition:
      'The general version of ft_print_comb: writes every combination of n distinct digits in increasing order, with 0 < n < 10. It is usually solved with recursion.',
    example: 'ft_print_combn(2) writes 01, 02, …, 89 (45 combinations).',
  },
  'pis-c00-moulinette': {
    title: 'How the Moulinette grades',
    definition:
      "The Moulinette grades a day's exercises in order and stops at the first one that fails: even if the next ones are right, they no longer count towards the grade.",
    example: 'ex00 and ex01 right, ex02 wrong, ex03 right: only ex00 and ex01 count.',
  },
  'pis-c00-norm': {
    title: 'The 42 Norm',
    definition:
      'The norminette requires, among other things, functions of 25 lines at most, 5 functions per file, 4 parameters and 5 variables, and forbids for, do…while and switch.',
    example: 'A for becomes i = 0; while (i < n) { …; i++; }',
  },
  'pis-c01-ft-ft': {
    title: 'ft_ft: writing through a pointer',
    definition:
      "If a function receives the address of an int, *nbr is that int: assigning to it changes the caller's variable, not a copy.",
    example: 'int n; ft_ft(&n); // n is now 42',
  },
  'pis-c01-ultimate-ft': {
    title: 'Pointers to pointers',
    definition:
      'Each * in the type is one level of address: int ** points to an int *, which points to an int. Each * in front of the variable goes down one level.',
    example: 'int n; int *p = &n; int **pp = &p; **pp = 42; // n is 42',
  },
  'pis-c01-swap-bug': {
    title: 'Pass by value and ft_swap',
    definition:
      "In C arguments are copied: a function that receives int cannot change the caller's variables. To do so it receives their addresses (int *).",
    example: 'void ft_swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }',
  },
  'pis-c01-pointer-alias': {
    title: 'Two names for the same variable',
    definition:
      'If p = &n, *p and n are the same memory: whatever you do through one path shows through the other.',
    example: 'int n = 1; int *p = &n; *p = 5; // n is 5',
  },
  'pis-c01-div-mod': {
    title: 'ft_div_mod: returning two results',
    definition:
      'A function returns only one value; to give back two you pass pointers to write them into. Between ints, / gives the integer quotient and % the remainder.',
    example: 'ft_div_mod(17, 5, &d, &m); // d = 3, m = 2',
  },
  'pis-c01-ultimate-div-mod': {
    title: 'ft_ultimate_div_mod',
    definition:
      'It receives a and b by address and leaves the quotient in *a and the remainder in *b. Compute both before writing, or the second would use an overwritten value.',
    example: 'int q = *a / *b; int r = *a % *b; *a = q; *b = r;',
  },
  'pis-c01-negative-div': {
    title: 'Integer division with negatives',
    definition:
      'In C integer division truncates towards zero and the remainder takes the sign of the dividend, so that (a / b) * b + a % b == a always holds.',
    example: '-7 / 2 == -3 and -7 % 2 == -1; 7 / -2 == -3 and 7 % -2 == 1',
  },
  'pis-c01-putstr': {
    title: 'Walking a string with a pointer',
    definition:
      "*str is the character str points to and str++ moves to the next one. The loop while (*str) stops at the final '\\0', not when str is NULL.",
    example: 'while (*str) { write(1, str, 1); str++; }',
  },
  'pis-c01-strlen': {
    title: 'ft_strlen',
    definition:
      "Counts the characters of a string up to the '\\0', without counting it. Spaces and digits count like any other character.",
    example: 'ft_strlen("42 Madrid") == 9; ft_strlen("") == 0',
  },
  'pis-c01-rev-int-tab': {
    title: 'Reversing an array',
    definition:
      'You swap the first with the last, the second with the second to last… up to the middle. If you go on to the end, each pair is swapped twice and ends up as it was.',
    example: 'i = 0; while (i < size / 2) { swap tab[i] and tab[size - 1 - i]; i++; }',
  },
  'pis-c01-sort-int-tab': {
    title: 'Bubble sort',
    definition:
      'One pass compares each element with the next and swaps them if they are out of order: the largest ends up at the end. Passes are repeated until one changes nothing.',
    example: '{3, 2, 1} → {2, 1, 3} → {1, 2, 3}',
  },
  'pis-c01-amp-star': {
    title: '& and *',
    definition:
      '&x gives the address of x (of type pointer to the type of x) and *p goes to the address stored in p. They undo each other: *(&x) is x.',
    example: 'int n = 4; int *p = &n; *p += 1; // n is 5',
  },
  'pis-c01-array-index': {
    title: 'Arrays and indices',
    definition:
      'The name of an array is used as a pointer to its first element, and tab[i] is *(tab + i). Indices go from 0 to size - 1.',
    example: 'int tab[5]; tab[4] is the last one and *(tab + 4) the same element.',
  },
  'pis-c02-strcpy': {
    title: 'ft_strcpy',
    definition:
      "Copies src into dest character by character, including the final '\\0', and returns dest. Without that '\\0', dest does not end where it should.",
    example: "while (src[i]) { dest[i] = src[i]; i++; } dest[i] = '\\0'; return (dest);",
  },
  'pis-c02-strncpy-pad': {
    title: 'ft_strncpy',
    definition:
      "Copies at most n characters of src. If src is shorter, it pads with '\\0' up to n; if it is longer, it cuts and adds no '\\0'.",
    example:
      'ft_strncpy(d, "ab", 5) leaves a b \\0 \\0 \\0; ft_strncpy(d, "abcdefgh", 5) leaves abcde with no \\0.',
  },
  'pis-c02-str-is-numeric': {
    title: 'The ft_str_is_* functions',
    definition:
      'They return 1 if every character meets the condition and 0 if any does not. For the empty string they return 1, since there is none that fails.',
    example:
      'ft_str_is_numeric("") == 1; ft_str_is_numeric("42") == 1; ft_str_is_numeric("-42") == 0',
  },
  'pis-c02-str-is-printable': {
    title: 'Printable characters',
    definition:
      'In ASCII the printable ones go from space (32) to tilde ~ (126). Those from 0 to 31 and 127 (DEL) are control characters.',
    example: "if (c >= 32 && c <= 126) // printable; '\\n' (10) is not",
  },
  'pis-c02-str-is-lowercase': {
    title: 'ft_str_is_lowercase',
    definition:
      "It returns 1 only if every character is between 'a' and 'z'. A space, a digit or a symbol is enough to make it return 0.",
    example: 'ft_str_is_lowercase("hola") == 1; ft_str_is_lowercase("hola mundo") == 0',
  },
  'pis-c02-str-is-alpha-bug': {
    title: 'Checking every character',
    definition:
      'To see whether a whole string meets a condition, return 0 as soon as one character fails and 1 only when you reach the end. Returning 1 at the first match is something else.',
    example: 'while (str[i]) { if (!is_letter(str[i])) return (0); i++; } return (1);',
  },
  'pis-c02-strupcase': {
    title: 'Upper and lower case in ASCII',
    definition:
      "A lowercase letter and its capital are 32 apart: 'a' is 97 and 'A' 65. To uppercase, subtract 32 only from what lies between 'a' and 'z'.",
    example: "if (c >= 'a' && c <= 'z') c -= 32; // 'h' → 'H'",
  },
  'pis-c02-strcapitalize': {
    title: 'ft_strcapitalize',
    definition:
      'Capitalises the first letter of each word and lowercases the rest. A word is a run of letters and digits: any other character breaks it.',
    example: '"hOLA 42mUNDO dos-tres" → "Hola 42mundo Dos-Tres"',
  },
  'pis-c02-strlcpy': {
    title: 'ft_strlcpy',
    definition:
      "Copies at most size - 1 characters, ends dest with '\\0' (if size > 0) and returns the length of src: if it is >= size, the copy was cut.",
    example: 'ft_strlcpy(buf, "piscine", 4) leaves "pis" and returns 7.',
  },
  'pis-c02-strlcpy-vs-strncpy': {
    title: 'strlcpy versus strncpy',
    definition:
      "strncpy copies exactly n bytes (padding with '\\0' or leaving the string unterminated); strlcpy always terminates dest and returns strlen(src) so you know whether it fit.",
    example: 'strncpy(d, "abcdef", 3) leaves abc with no \\0; strlcpy(d, "abcdef", 3) leaves "ab".',
  },
  'pis-c02-non-printable': {
    title: 'ft_putstr_non_printable',
    definition:
      'Writes the string, but each non-printable character comes out as a backslash followed by its value in hexadecimal, with two lowercase digits.',
    example: '"Coucou\\ntu vas bien ?" → Coucou\\0atu vas bien ?',
  },
  'pis-c02-print-memory': {
    title: 'ft_print_memory',
    definition:
      'Makes a memory dump: each line has the address in hexadecimal, 16 bytes in hexadecimal two at a time and those bytes as text, with a dot for non-printable ones.',
    example: '000000010a161f40: 426f 6e6a 6f75 7220 6c65 7320 616d 696e Bonjour les amin',
  },
  'pis-c03-strcmp': {
    title: 'ft_strcmp',
    definition:
      "Moves on while the characters match and returns the difference of the first ones that differ (as unsigned char). If a string ends, its '\\0' counts as 0.",
    example: 'ft_strcmp("abc", "abd") == -1; ft_strcmp("ab", "abc") == -99',
  },
  'pis-c03-strcmp-unsigned': {
    title: 'strcmp and unsigned char',
    definition:
      'char may be signed, and then bytes 128 to 255 are negative. strcmp compares as unsigned char so that those bytes sort after the ASCII ones.',
    example: "(unsigned char)'\\xe9' is 233, not -23.",
  },
  'pis-c03-strcmp-sign': {
    title: 'The sign of strcmp',
    definition:
      'What matters about strcmp is the sign: negative if s1 comes before s2, 0 if they are equal and positive if it comes after. It is used to sort strings.',
    example: 'ft_strcmp("ana", "bea") < 0, so "ana" comes first.',
  },
  'pis-c03-strncmp': {
    title: 'ft_strncmp',
    definition:
      'Like strcmp, but it looks at n characters at most: if the first n match it returns 0, even if the strings differ later. With n = 0 it always gives 0.',
    example: 'ft_strncmp("piscine", "pisco", 4) == 0; with 5 it gives \'i\' - \'o\' = -6',
  },
  'pis-c03-strcat': {
    title: 'ft_strcat',
    definition:
      "Copies src starting at the '\\0' of dest, puts a new '\\0' at the end and returns dest. Each call carries on where the previous one ended.",
    example: 'dest = "42"; ft_strcat(dest, " Madrid"); // "42 Madrid"',
  },
  'pis-c03-strcat-room': {
    title: 'Room to concatenate',
    definition:
      "ft_strcat allocates no memory: dest must have room for what it holds, what is added and the '\\0', or it writes outside the array.",
    example: 'char dest[10] = "hola"; ft_strcat(dest, " mundo"); // 11 bytes in 10: overflow',
  },
  'pis-c03-strncat': {
    title: 'ft_strncat',
    definition:
      "Appends at most nb characters of src to the end of dest and always adds the final '\\0', unlike strncpy.",
    example: 'dest = "ab"; ft_strncat(dest, "cdef", 2); // "abcd"',
  },
  'pis-c03-strstr': {
    title: 'ft_strstr',
    definition:
      'Looks for to_find inside str and returns a pointer to its first occurrence. If to_find is empty it returns str; if it does not appear, NULL.',
    example: 'ft_strstr("hola", "") == "hola"; ft_strstr("hola", "x") == NULL',
  },
  'pis-c03-strstr-code': {
    title: 'What strstr returns',
    definition:
      'strstr does not return just what you searched for: it returns a pointer inside str, and from there the string runs on to the end of str.',
    example: 'ft_strstr("banana", "ana") points to "anana" (position 1).',
  },
  'pis-c03-strlcat': {
    title: 'ft_strlcat',
    definition:
      "Appends src to dest without going over size bytes in total (counting the '\\0') and returns the length it tried to create: strlen(dest) + strlen(src).",
    example: 'dest = "abc"; ft_strlcat(dest, "defgh", 6) leaves "abcde" and returns 8.',
  },
  'pis-c03-strlcat-small': {
    title: 'ft_strlcat with a small size',
    definition:
      'If size is not above strlen(dest), there is no room to add anything: ft_strlcat leaves dest as it is and returns size + strlen(src).',
    example: 'dest = "abcdef"; ft_strlcat(dest, "xyz", 4) returns 7 and leaves dest alone.',
  },
  'pis-c03-strlcat-return': {
    title: 'What the strlcat return value is for',
    definition:
      'ft_strlcat returns min(size, strlen(dest)) + strlen(src), the length it tried to create: if the result is >= size, the string was cut.',
    example: 'if (ft_strlcat(buf, s, sizeof(buf)) >= sizeof(buf)) // it did not fit',
  },
}
