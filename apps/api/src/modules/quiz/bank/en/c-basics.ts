/** Banco de Not-games en inglés: C (`../c-basics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const C_BASICS_EN: Readonly<Record<string, ConceptText>> = {
  'c-string-end': {
    forms: [
      {
        ask: [
          'How does `strlen` know where a C string ends?',
          'What marks the end of a string in C?',
        ],
        right: ["The null character '\\0'", 'The first byte that is 0'],
        wrong: [
          "The newline '\\n'",
          'Its length, stored in the first byte',
          'The last space',
          "The character '0'",
        ],
      },
      {
        ask: ['How many bytes does the string "hola" take in memory?', 'What is `sizeof("hola")`?'],
        right: ['5'],
        wrong: ['4', '8', '6', '1'],
      },
    ],
    wrong: ["The newline '\\n'", 'Its length, stored in the first byte', 'The last space'],
    why: "A C string is an array of char ending in '\\0': it takes one byte more than its length.",
  },
  'c-sizeof-char': {
    forms: [
      {
        ask: [
          'What is `sizeof(char)`, always?',
          'In C, how many bytes does a char take, by definition?',
        ],
        right: ['1'],
        wrong: ['2', '4', '8', '0'],
      },
      {
        ask: [
          'How many bytes does a pointer take on a 64-bit machine?',
          'On x86-64, what is `sizeof(int *)`?',
        ],
        right: ['8'],
        wrong: ['4', '2', '16', '1'],
      },
    ],
    wrong: ['2', '4', '16', '0'],
    why: 'sizeof(char) is 1 by definition; a pointer takes the size of an address (8 bytes on 64 bits), whatever it points to.',
  },
  'c-malloc-free': {
    forms: [
      {
        ask: [
          'What must you do with the memory returned by `malloc` once it is no longer used?',
          'Memory reserved with malloc, when no longer needed, has to be…',
        ],
        right: ['Freed with free', 'Passed to free, exactly once'],
        wrong: [
          'Nothing: it frees itself when the function returns',
          'Set to NULL, which is enough',
          'Freed twice, to be safe',
          'Released with delete',
        ],
      },
      {
        ask: [
          'If you allocate with `malloc` and never call `free`, you have…',
          'What do you call reserved memory that can no longer be freed because its pointer was lost?',
        ],
        right: ['A leak (memory leak)'],
        wrong: ['A dangling pointer', 'A double free', 'A stack overflow'],
      },
    ],
    wrong: [
      'Nothing: it frees itself when the function returns',
      'Set to NULL, which is enough',
      'Released with delete',
    ],
    why: 'C has no garbage collector: what you ask for with malloc you give back with free, exactly once.',
  },
  'c-malloc-null': {
    forms: [
      {
        ask: [
          'What does `malloc` return if it cannot reserve the memory?',
          'When an allocation fails, malloc returns…',
        ],
        right: ['NULL', 'A null pointer'],
        wrong: [
          '-1',
          'A pointer to the stack',
          'A pointer to uninitialised memory',
          'Whatever was there before',
        ],
      },
      {
        ask: ['What does `free(NULL)` do?', 'What happens if you call free with a null pointer?'],
        right: ['Nothing: it is safe'],
        wrong: ['It segfaults', 'It counts as a double free', 'It aborts the program'],
      },
    ],
    wrong: ['-1', 'A pointer to the stack', 'It aborts the program'],
    why: 'malloc returns NULL when it fails (you have to check it) and free(NULL) does nothing, by definition.',
  },
  'c-dangling': {
    forms: [
      {
        ask: ['What is wrong with this code?', 'Why is this wrong?'],
        right: [
          'It returns the address of a local variable, which stops existing on return',
          'The returned pointer points to the stack of a call that has already ended',
        ],
        wrong: [
          'It is missing a cast to int*',
          'n should be unsigned',
          'Nothing is wrong',
          'You have to free(&n) before returning',
        ],
      },
      {
        ask: [
          'What is the pointer f returns called?',
          'A pointer to memory that is no longer valid is called…',
        ],
        right: ['Dangling (dangling pointer)'],
        wrong: ['Null', 'Wild, because it was never initialised', 'A function pointer'],
      },
    ],
    wrong: ['It is missing a cast to int*', 'n should be unsigned', 'Nothing is wrong'],
    why: 'n lives on the stack of f; on return that memory is reused and the pointer is no longer valid.',
  },
  'c-memmove-overlap': {
    forms: [
      {
        ask: [
          'What makes `memmove` different from `memcpy`?',
          'Why does memmove exist if there is already memcpy?',
        ],
        right: [
          'memmove copies correctly even if source and destination overlap',
          'With overlapping areas, only memmove guarantees the result',
        ],
        wrong: [
          'memmove is always faster',
          'memmove clears the source after copying',
          'They are exactly the same',
          'memmove only copies strings',
        ],
      },
      {
        ask: [
          'If source and destination overlap, which function copies correctly?',
          'To move bytes inside the same array with overlap, you use…',
        ],
        right: ['memmove'],
        wrong: ['memcpy', 'strcpy', 'memset', 'strlcpy'],
      },
    ],
    wrong: ['memmove is always faster', 'They are exactly the same', 'memmove only copies strings'],
    why: 'With overlap, memcpy can overwrite what it has not copied yet; memmove picks the direction of the copy.',
  },
  'c-pointer-arith': {
    forms: [
      {
        ask: ['What does this code print?', 'What is the output?'],
        right: ['30'],
        wrong: ['20', '12', '10', '40'],
      },
      {
        ask: ['What does `p` point to at the end?', 'After `p += 2`, what does p point to?'],
        right: ['To a[2]', 'To the third element'],
        wrong: ['To 2 bytes after a[0]', 'To a[1]', 'To the second element', 'Outside the array'],
      },
    ],
    wrong: ['20', '12', '10', '40'],
    why: 'Adding 2 to an int* moves two ints, not two bytes: p points to a[2], which is 30.',
  },
  'c-string-literal-write': {
    forms: [
      {
        ask: ['What happens when you run this?', 'This code compiles. What happens when it runs?'],
        right: [
          'Undefined behaviour: it writes to a literal (usually a segmentation fault)',
          'It usually segfaults: literals cannot be modified',
        ],
        wrong: ['It prints Hola', 'It prints hola', 'It prints H', 'It leaks memory'],
      },
      {
        ask: [
          'How must `s` be declared to be able to change its letters?',
          'Which declaration fixes this code?',
        ],
        right: ['char s[] = "hola";'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';", 'static char *s = "hola";'],
      },
    ],
    wrong: ['It prints Hola', 'It prints hola', 'It prints H'],
    why: 'A literal lives in read-only memory; char s[] = "hola" makes your own copy, which can be changed.',
  },
  'c-off-by-one-malloc': {
    forms: [
      {
        ask: ['This function copies a string. What is wrong?', 'What bug does this strdup have?'],
        right: [
          "It allocates one byte too few: the one for '\\0' is missing",
          'It should allocate strlen(s) + 1',
        ],
      },
    ],
    wrong: [
      'strcpy does not copy the last character',
      'You have to free(d) before the return',
      'malloc needs a cast to char*',
      's should be char**',
      'Nothing is wrong',
    ],
    why: "strlen does not count the '\\0', but strcpy copies it: it writes one byte outside what was reserved.",
  },
  'c-static-local': {
    forms: [
      {
        ask: [
          'What is special about a local variable declared `static`?',
          'What changes when you make a variable inside a function static?',
        ],
        right: [
          'It keeps its value between calls',
          'It lasts the whole program, though only visible inside the function',
        ],
        wrong: [
          'It is reset on every call',
          'It is visible from other files',
          'It becomes constant',
          "It is stored on the caller's stack",
        ],
      },
      {
        ask: [
          'What lets get_next_line remember what was left over from the previous read?',
          'To keep what was read too far between two calls to get_next_line, you use…',
        ],
        right: ['A static variable'],
        wrong: ['A normal local variable', 'An extra parameter', 'A global variable with extern'],
      },
    ],
    wrong: ['It is reset on every call', 'It is visible from other files', 'It becomes constant'],
    why: 'static gives the variable the lifetime of the whole program (initialised once) without changing where it is visible.',
  },
  'c-read-return': {
    forms: [
      {
        ask: [
          'What does `read` return at the end of the file?',
          'When there is nothing left to read, read returns…',
        ],
        right: ['0'],
        wrong: ['-1', '1', '42'],
      },
      {
        ask: ['What does `read` return on error?', 'If read fails, it returns…'],
        right: ['-1'],
        wrong: ['0', '1', '42'],
      },
      {
        ask: [
          'If `read(fd, buf, 42)` returns 10, what happened?',
          'read asked for 42 bytes and returned 10. What does it mean?',
        ],
        right: [
          'Only 10 bytes were available (it is not an error)',
          'It read 10 bytes, fewer than requested',
        ],
        wrong: [
          'There was an error',
          '32 bytes are missing because of a disk failure',
          'The file is 52 bytes long',
        ],
      },
    ],
    wrong: ['1', '42', '2'],
    why: 'read returns the bytes read (maybe fewer than requested): 0 is end of file and -1, error.',
  },
  'c-fd-standard': {
    forms: [
      {
        ask: [
          'Which file descriptor is standard error (stderr)?',
          'To write an error with `write`, which fd do you use?',
        ],
        right: ['2'],
        wrong: ['1', '0', '3'],
      },
      {
        ask: [
          'Which descriptor is standard input (stdin)?',
          'From which fd does `read` read when reading the keyboard?',
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
      },
      {
        ask: [
          'What number does `open` usually give to the first file a program opens?',
          'What is the first free fd of a freshly started program?',
        ],
        right: ['3'],
        wrong: ['0', '2', '1'],
      },
    ],
    wrong: ['1', '-1', '4', '42'],
    why: 'By convention, 0 is input, 1 output and 2 errors; open gives the lowest free number (3).',
  },
  'c-variadic': {
    forms: [
      {
        ask: [
          'What do you use to go through the arguments of a variadic function?',
          'To read the arguments of `printf(const char *fmt, ...)` you use…',
        ],
        right: ['va_start, va_arg and va_end', 'A va_list with va_arg'],
        wrong: ['argc and argv', 'An array of void*', 'malloc and free', 'getopt'],
      },
      {
        ask: [
          'How does printf know how many arguments it was given?',
          'Where does a variadic function get the number of its arguments from?',
        ],
        right: ['It does not know: it deduces it from the format', 'From the format string'],
        wrong: ['From argc', 'From sizeof(...)', 'Because va_arg returns NULL at the end'],
      },
    ],
    wrong: ['argc and argv', 'An array of void*', 'getopt'],
    why: 'va_start starts, va_arg gives the next one with the type you say and va_end finishes; how many there are is said by the format.',
  },
  'c-printf-formats': {
    forms: [
      {
        ask: ['What does `printf("%x", 255)` print?', 'What does the %x format give with 255?'],
        right: ['ff'],
        wrong: ['FF', 'f', 'fff', 'ef'],
      },
      {
        ask: ['What does `printf("%X", 255)` print?', 'What does the %X format give with 255?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FFF', 'EF'],
      },
      {
        ask: [
          'What does `printf("%u", -1)` print with a 32-bit int?',
          'How does -1 come out written with %u (32 bits)?',
        ],
        right: ['4294967295'],
        wrong: ['-1', '1', '2147483647'],
      },
    ],
    wrong: ['0xff', '255', '377', '11111111'],
    why: '%x and %X write hexadecimal without prefix (lowercase and uppercase); %u reads the bits as unsigned: -1 is 32 ones.',
  },
  'c-char-promotion': {
    forms: [
      {
        ask: [
          'In a variadic function, with what type do you read a char passed as an argument?',
          'For `%c`, what type do you pass to va_arg?',
        ],
        right: ['int'],
      },
    ],
    wrong: ['char', 'unsigned char', 'char *', 'short'],
    why: 'In variable arguments, char and short are promoted to int; reading them as char is undefined.',
  },
  'c-list-add-front': {
    forms: [
      {
        ask: [
          'What is wrong with this lstadd_front?',
          'It should put `new` at the start of the list. What happens?',
        ],
        right: [
          'It changes a copy of the pointer: outside, the head does not change',
          'It should take t_list **lst to change the head',
        ],
      },
    ],
    wrong: [
      'It does not allocate memory for new',
      'It should be lst->next = new',
      'You have to free lst',
      'It works fine',
      'It is missing a return',
    ],
    why: 'In C arguments are passed by value: to change the head you have to pass its address.',
  },
  'c-unsigned-loop': {
    forms: [
      {
        ask: [
          'How many times does this loop run?',
          'It wants to count from 10 to 0. What happens?',
        ],
        right: ['It never ends: a size_t is always >= 0', 'It repeats forever'],
      },
    ],
    wrong: ['11 times', '10 times', 'Never', 'It does not compile', 'It stops at -1'],
    why: 'size_t has no sign: going below 0 wraps around to the largest value and the condition always holds.',
  },
  'c-signed-overflow': {
    forms: [
      {
        ask: [
          'What happens in C if a signed int goes past INT_MAX?',
          'What happens when you add 1 to INT_MAX in an int?',
        ],
        right: ['Undefined behaviour', 'Undefined: the standard does not say what happens'],
        wrong: [
          'A compilation error',
          'It stays at the maximum',
          'It throws an exception',
          'It becomes a long',
        ],
      },
      {
        ask: [
          'And if an unsigned int goes past its maximum?',
          'What does adding 1 to UINT_MAX give?',
        ],
        right: ['It goes back to 0, in a defined way'],
        wrong: ['Undefined behaviour', 'It stays at the maximum', 'A compilation error'],
      },
    ],
    wrong: ['A compilation error', 'It stays at the maximum', 'It throws an exception'],
    why: 'Unsigned types wrap around (arithmetic modulo 2ⁿ); with a sign, overflowing is undefined.',
  },
  'c-makefile-relink': {
    forms: [
      {
        ask: [
          'How does make know there is no need to compile again?',
          'What does make look at to decide whether to rebuild a target?',
        ],
        right: [
          'The modification times of the target and its dependencies',
          'Whether the target is newer than everything it needs',
        ],
        wrong: [
          'A hash of each file',
          'What it remembers in memory between runs',
          'Nothing: it always recompiles everything',
          'Whether the obj folder exists',
        ],
      },
      {
        ask: ['What is `.PHONY` for in a Makefile?', 'Why do you declare `.PHONY: clean`?'],
        right: [
          'So make runs the rule even if a file with that name exists',
          'To say that the rule does not create any file',
        ],
        wrong: [
          'To compile in parallel',
          'To hide the rule from the help',
          'So the rule runs first',
        ],
      },
    ],
    wrong: [
      'A hash of each file',
      'Nothing: it always recompiles everything',
      'Whether the obj folder exists',
    ],
    why: 'make rebuilds a target if any dependency is newer; .PHONY marks rules that are not files.',
  },
}
