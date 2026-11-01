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
          'Freed with delete',
        ],
      },
      {
        ask: [
          'If you allocate with `malloc` and never call `free`, you have…',
          'What do you call reserved memory that can no longer be freed because its pointer was lost?',
        ],
        right: ['A memory leak'],
        wrong: ['A dangling pointer', 'A double free', 'A stack overflow'],
      },
    ],
    wrong: [
      'Nothing: it frees itself when the function returns',
      'Set to NULL, which is enough',
      'Freed with delete',
    ],
    why: 'C has no garbage collector: what you ask for with malloc you give back with free, exactly once.',
  },
  'c-malloc-null': {
    forms: [
      {
        ask: [
          'What does `malloc` return if it cannot reserve the memory?',
          'If an allocation fails, malloc returns…',
        ],
        right: ['`NULL`'],
        wrong: ['`(void *)-1`', '`-1`', '`EOF`', '`ENOMEM`'],
      },
      {
        ask: ['What does `free(NULL)` do?', 'What happens if you call free with a null pointer?'],
        right: ['Nothing at all, it is safe'],
        wrong: [
          'It causes a segmentation fault',
          'It counts as a double free',
          'It aborts the program',
        ],
      },
    ],
    wrong: ['It causes a segmentation fault', 'It aborts the program', 'It frees the memory twice'],
    why: 'malloc returns NULL when it fails (you must check it) and free(NULL) does nothing, by definition.',
  },
  'c-dangling': {
    forms: [
      {
        ask: ['What is wrong with this code?', 'Why is this wrong?'],
        right: [
          'It returns the address of a local variable',
          'It points to the stack of a finished call',
        ],
        wrong: [
          'The return is missing a cast of &n to int*',
          'You have to call free(&n) before returning',
          'Nothing is wrong: the caller reads a 42',
          'f should receive n as a parameter',
        ],
      },
      {
        ask: [
          'What do you call the pointer f returns?',
          'A pointer to memory that is no longer valid is called…',
        ],
        right: ['A dangling pointer'],
        wrong: ['A null pointer', 'A function pointer', 'A constant pointer'],
      },
    ],
    wrong: [
      'The return is missing a cast of &n to int*',
      'You have to call free(&n) before returning',
      'Nothing is wrong: the caller reads a 42',
    ],
    why: 'n lives on the stack of f; after the return, that memory is reused and the pointer is no longer valid.',
  },
  'c-memmove-overlap': {
    forms: [
      {
        ask: [
          'What makes `memmove` different from `memcpy`?',
          'Why does memmove exist if there is already memcpy?',
        ],
        right: ['memmove allows the areas to overlap', 'Only memmove copies right with overlap'],
        wrong: [
          'memmove is always faster than memcpy',
          'memmove deletes the source after copying',
          'memmove only works for copying strings',
          'They are the same: memmove is another name for memcpy',
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
    wrong: [
      'memmove is always faster than memcpy',
      'memmove deletes the source after copying',
      'memmove only works for copying strings',
    ],
    why: 'With overlap, memcpy may overwrite what it has not copied yet; memmove picks the direction of the copy.',
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
        ask: [
          'What happens when you run this?',
          'This code compiles. What happens when you run it?',
        ],
        right: [
          'Undefined behaviour: it usually segfaults',
          'It usually segfaults: a literal is read-only',
        ],
        wrong: [
          'It prints Hola, with a capital H',
          'It prints hola, because s[0] is a copy',
          'It prints H and stops at the first letter',
          'It leaks: the literal is never freed',
        ],
      },
      {
        ask: [
          'How must `s` be declared so you can change its letters?',
          'Which declaration fixes this code?',
        ],
        right: ['char s[] = "hola";'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';", 'static char *s = "hola";'],
      },
    ],
    wrong: [
      'It prints Hola, with a capital H',
      'It prints hola, because s[0] is a copy',
      'It prints H and stops at the first letter',
    ],
    why: 'A literal lives in read-only memory; char s[] = "hola" makes its own copy, which can be changed.',
  },
  'c-off-by-one-malloc': {
    forms: [
      {
        ask: ['This function copies a string. What is wrong?', 'What bug does this strdup have?'],
        right: ["It allocates one byte short, the '\\0' one", 'It should allocate strlen(s) + 1'],
      },
    ],
    wrong: [
      'strcpy does not copy the last character',
      'You have to free(d) before the return',
      'malloc needs a cast to char *',
      "Nothing: strlen already counts the '\\0'",
      'd should be static to be returned',
    ],
    why: "strlen does not count the '\\0', but strcpy does copy it: it writes one byte outside what was reserved.",
  },
  'c-static-local': {
    forms: [
      {
        ask: [
          'What is special about a local variable declared `static`?',
          'What changes when you make a variable inside a function static?',
        ],
        right: ['It keeps its value between calls', 'It lasts the whole program, not one call'],
        wrong: [
          'It is reset to 0 on every call',
          'It can also be seen from other files',
          'It becomes constant once assigned',
          'It is stored on the stack of the caller',
        ],
      },
      {
        ask: [
          'What lets get_next_line remember what was left over from the previous read?',
          'To keep the extra bytes read between two calls to get_next_line, you use…',
        ],
        right: ['A static local variable'],
        wrong: ['A plain local variable', 'A register local variable', 'A const local variable'],
      },
    ],
    wrong: [
      'It is reset to 0 on every call',
      'It can also be seen from other files',
      'It becomes constant once assigned',
    ],
    why: 'static gives the variable the lifetime of the whole program (it is initialised once) without changing where it is visible.',
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
        ask: ['What does `read` return if there is an error?', 'If read fails, it returns…'],
        right: ['-1'],
        wrong: ['0', '1', '42'],
      },
      {
        ask: [
          'If `read(fd, buf, 42)` returns 10, what happened?',
          'read asked for 42 bytes and returned 10. What does it mean?',
        ],
        right: ['Only 10 bytes were there to read', 'It read 10 bytes, fewer than asked'],
        wrong: [
          'An error happened halfway through',
          '32 bytes are missing due to a disk fault',
          'The file is 52 bytes long in total',
        ],
      },
    ],
    wrong: ['1', '42', '2'],
    why: 'read returns the bytes it read (maybe fewer than asked): 0 is end of file and -1, an error.',
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
          'What do you use to walk through the arguments of a variadic function?',
          'To read the arguments of `printf(const char *fmt, ...)` you use…',
        ],
        right: ['va_start, va_arg and va_end', 'A va_list with va_arg'],
        wrong: [
          'argc and argv, as in main',
          'An array of void * ending in NULL',
          'getopt and optarg',
          'malloc, memcpy and free',
        ],
      },
      {
        ask: [
          'How does printf know the number of arguments it was given?',
          'Where does a variadic function get the number of its arguments?',
        ],
        right: [
          'It does not: it infers it from the format',
          'From what the format string asks for',
        ],
        wrong: [
          'From a hidden argc the compiler passes',
          'From sizeof(...) on the arguments',
          'From va_arg, which gives NULL at the end',
        ],
      },
    ],
    wrong: ['argc and argv, as in main', 'An array of void * ending in NULL', 'getopt and optarg'],
    why: 'va_start begins, va_arg gives the next one with the type you say and va_end finishes; how many there are is told by the format.',
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
        right: ['It only changes its local copy of lst', 'It should take a t_list **lst'],
      },
    ],
    wrong: [
      'Memory for new is not allocated',
      'It should be lst->next = new',
      'lst must be freed before changing it',
      'It works: new ends up first',
    ],
    why: 'In C arguments are passed by value: to change the head you have to pass its address.',
  },
  'c-unsigned-loop': {
    forms: [
      {
        ask: ['What happens with this loop?', 'It wants to count from 10 down to 0. What happens?'],
        right: ['It never ends: i never goes below 0', 'It loops forever'],
      },
    ],
    wrong: [
      'It stops after 11 rounds',
      'It stops after 10 rounds',
      'It does not run even once',
      'It does not compile due to i >= 0',
      'It stops when it reaches -1',
    ],
    why: 'size_t has no sign: going below 0 wraps around to the largest value, so the condition is always true.',
  },
  'c-signed-overflow': {
    forms: [
      {
        ask: [
          'What happens in C if a signed int goes past INT_MAX?',
          'What happens when you add 1 to INT_MAX in an int?',
        ],
        right: ['Undefined behaviour', 'The standard does not say'],
        wrong: [
          'It fails to compile',
          'It stays stuck at INT_MAX',
          'It throws an exception at run time',
          'It turns into a long by itself',
        ],
      },
      {
        ask: [
          'What happens if an unsigned int goes past its maximum?',
          'What does adding 1 to UINT_MAX give?',
        ],
        right: ['It wraps to 0, in a defined way'],
        wrong: [
          'Undefined behaviour',
          'It stays stuck at UINT_MAX',
          'It fails to compile',
          'It becomes -1, with a sign',
        ],
      },
    ],
    wrong: ['It fails to compile', 'It stays stuck at INT_MAX', 'It turns into a long by itself'],
    why: 'Unsigned values wrap around (arithmetic modulo 2ⁿ); with a sign, overflowing is undefined.',
  },
  'c-makefile-relink': {
    forms: [
      {
        ask: [
          'How does make know it does not need to recompile?',
          'What does make look at to decide whether to rebuild a target?',
        ],
        right: [
          'The modification times of the files',
          'Whether the target is newer than its dependencies',
        ],
        wrong: [
          'A hash of the contents of each file',
          'What it remembers in memory between runs',
          'Nothing: it always recompiles everything',
          'Whether the objects folder already exists',
        ],
      },
      {
        ask: ['What is `.PHONY` for in a Makefile?', 'Why do you declare `.PHONY: clean`?'],
        right: ['To run it even if a file has its name', 'To mark that the rule creates no file'],
        wrong: [
          'To compile its dependencies in parallel',
          'To hide the rule from the help of make',
          'To make the rule run before all',
          'To stop make from echoing the commands',
        ],
      },
    ],
    wrong: [
      'A hash of the contents of each file',
      'Nothing: it always recompiles everything',
      'Whether the objects folder already exists',
    ],
    why: 'make rebuilds a target if any dependency is more recent; .PHONY marks rules that are not files.',
  },
  'libft-split': {
    forms: [
      {
        ask: [
          'What does `ft_split("  hola  42 ", \' \')` return?',
          'Splitting `"  hola  42 "` on spaces, `ft_split` returns…',
        ],
        right: ['`{"hola", "42", NULL}`'],
        wrong: [
          '`{"hola", "42"}`',
          '`{"", "hola", "", "42", NULL}`',
          '`{"  hola", "  42 ", NULL}`',
          '`{"hola  42", NULL}`',
        ],
      },
      {
        ask: [
          'How does whoever uses the array from `ft_split` know where it ends?',
          'The array ft_split returns does not carry its size. How do you know where it ends?',
        ],
        right: ['Because the last pointer is NULL', 'Thanks to a NULL pointer after the last one'],
        wrong: [
          'Because it ends with an empty string',
          'Because the first one stores the count',
          "Because there is a '\\0' after the last one",
        ],
      },
    ],
    wrong: [
      'Because it ends with an empty string',
      'Because the first one stores the count',
      'Because ft_split warns with a printf',
    ],
    why: 'ft_split skips repeated separators (it gives no empty strings) and closes the array with a NULL pointer, like argv.',
  },
  'libft-itoa': {
    forms: [
      {
        ask: [
          'With which n does an ft_itoa that starts with `if (n < 0) n = -n;` fail, with a 32-bit int?',
          'An ft_itoa flips the sign with a bare `n = -n`. Which value of n breaks it?',
        ],
        right: ['-2147483648'],
        wrong: ['-1', '0', '2147483647', '-2147483647'],
      },
      {
        ask: [
          "How many bytes must `ft_itoa(-42)` allocate, counting the '\\0'?",
          "Counting the sign and the '\\0', how many bytes does the result of `ft_itoa(-42)` take?",
        ],
        right: ['4'],
        wrong: ['3', '5', '2'],
      },
    ],
    wrong: ['1', '6', '11'],
    why: '-(-2147483648) does not fit in an int (the maximum is 2147483647), so INT_MIN is handled apart or with a long; "-42" is a sign, two digits and the \'\\0\'.',
  },
  'libft-ar': {
    forms: [
      {
        ask: [
          'Which command bundles the `.o` files into the `libft.a` library?',
          'To build `libft.a` from the compiled objects, the Makefile calls…',
        ],
        right: ['`ar rcs libft.a *.o`'],
        wrong: [
          '`gcc -shared -o libft.a *.o`',
          '`ld -o libft.a *.o`',
          '`tar -cf libft.a *.o`',
          '`cc -c -o libft.a *.c`',
        ],
      },
      {
        ask: ['What is `libft.a`?', 'What kind of file is the `libft.a` you hand in?'],
        right: [
          'A static library: the .o files together',
          'An archive with the .o of your functions',
        ],
        wrong: [
          'An executable with all the functions',
          'A dynamic library loaded at start-up',
          'An already compiled .h header',
          'A .c file with all the functions together',
        ],
      },
    ],
    wrong: [
      'An executable with all the functions',
      'An already compiled .h header',
      'A .c file with all the functions together',
    ],
    why: 'A static .a library is an archive of objects made with ar; when linking, the ones needed are copied into the program.',
  },
  'libft-lstclear': {
    forms: [
      {
        ask: [
          'What must `ft_lstclear(&lst, del)` do?',
          'According to the Libft subject, ft_lstclear has to…',
        ],
        right: [
          'Free every node and its content, and set lst to NULL',
          'Delete the whole list and set the pointer to NULL',
        ],
        wrong: [
          'Free only the first node and its content',
          'Empty the content and keep the nodes',
          'Free the nodes, but not their content',
          'Set lst to NULL without freeing anything',
        ],
      },
      {
        ask: [
          'In `ft_lstclear`, what is the `del` parameter for?',
          'What does the `del` function given to ft_lstclear do?',
        ],
        right: ['It frees the content of each node'],
        wrong: [
          'It frees the node, but not its content',
          'It decides which nodes are deleted',
          'It compares contents and drops duplicates',
        ],
      },
    ],
    wrong: [
      'Free only the first node and its content',
      'Empty the content and keep the nodes',
      'Set lst to NULL without freeing anything',
    ],
    why: 'The list does not know what content holds: del frees it, free frees each node and, at the end, the list pointer is left as NULL.',
  },
  'printf-return': {
    forms: [
      {
        ask: [
          'What does `ft_printf("hola %d\\n", 42)` return?',
          'After writing `hola 42` and a newline, ft_printf returns…',
        ],
        right: ['8'],
        wrong: ['7', '9', '0', '2'],
      },
      {
        ask: [
          'What must `ft_printf` return?',
          'What return value does the ft_printf subject ask for?',
        ],
        right: ['The number of characters it has written'],
        wrong: [
          'The number of conversions in the format',
          'The number of arguments it has read',
          'The length of the format string',
          'A 0 if everything went well',
        ],
      },
    ],
    wrong: ['1', '10', '42'],
    why: 'Like printf, ft_printf returns how many characters it wrote: "hola 42\\n" is 8.',
  },
  'printf-pointer': {
    forms: [
      {
        ask: [
          'What does `ft_printf("%p", (void *)42)` print?',
          'A pointer whose value is 42, written with `%p`, comes out as…',
        ],
        right: ['0x2a'],
        wrong: ['42', '2a', '0x2A', '0x0000002a'],
      },
      {
        ask: [
          'In what format does `%p` write the address?',
          'With %p, the address of a pointer comes out in…',
        ],
        right: ['Hexadecimal, lowercase and with 0x'],
        wrong: [
          'Decimal, like an unsigned long',
          'Uppercase hexadecimal, without 0x',
          'Binary, with the 0b prefix',
          'Octal, with a leading 0',
        ],
      },
    ],
    wrong: ['0x42', '0X2A', '0b101010'],
    why: '%p writes the address in lowercase hexadecimal with the 0x prefix, like printf: 42 is 0x2a.',
  },
  'printf-percent': {
    forms: [
      {
        ask: [
          'What does `ft_printf("%d%%", 50)` print?',
          'With the format `"%d%%"` and 50, you get…',
        ],
        right: ['50%'],
        wrong: ['50', '50%%', '5%', '0%'],
      },
      {
        ask: [
          'What does `ft_printf("%%d", 42)` print?',
          'With the format `"%%d"` and 42, you get…',
        ],
        right: ['%d'],
        wrong: ['%42', '%%d', '%d42'],
      },
    ],
    wrong: ['%%', '%50', 'd'],
    why: '%% writes a single % and uses up no argument; whatever follows is printed as it is.',
  },
  'gnl-buffer-size': {
    forms: [
      {
        ask: [
          'Which cc option sets BUFFER_SIZE when compiling get_next_line?',
          'To compile get_next_line with a 42-byte buffer, you pass cc…',
        ],
        right: ['`-D BUFFER_SIZE=42`'],
        wrong: ['`-O BUFFER_SIZE=42`', '`-I BUFFER_SIZE=42`', '`-l BUFFER_SIZE=42`'],
      },
      {
        ask: [
          'With BUFFER_SIZE=1, how many calls to read does it take to read the line `hola\\n`?',
          'If each read brings 1 byte, how many reads does the line `hola\\n` cost?',
        ],
        right: ['5'],
        wrong: ['1', '4', '6', '2'],
      },
      {
        ask: [
          'With `-D BUFFER_SIZE=10000000`, what goes wrong if the buffer is a local `char buf[BUFFER_SIZE]`?',
          'A 10 MB local buffer in get_next_line breaks the program. Why?',
        ],
        right: ['It does not fit on the stack: use malloc'],
        wrong: [
          'read cannot read that much at once',
          'It does not compile: an array cannot be that big',
          'Nothing: the stack grows as much as needed',
        ],
      },
    ],
    wrong: [
      'read cannot read that much at once',
      'It does not compile: an array cannot be that big',
      'It is slow: read reads byte by byte',
    ],
    why: '-D defines the macro at compile time; with 1 byte there is one read per character, and a 10 MB buffer does not fit on the stack, which is usually 8 MB.',
  },
  'gnl-last-line': {
    forms: [
      {
        ask: [
          'A file ends with a line without `\\n`. How does get_next_line return it?',
          'If the last line has no newline, get_next_line returns it…',
        ],
        right: ['As it is, without adding the newline'],
        wrong: [
          'With a newline added at the end',
          'It does not: it returns NULL straight away',
          'Empty: only lines with \\n count',
        ],
      },
      {
        ask: [
          'After returning the last line, what does the next call to get_next_line return?',
          'When there is nothing left to read, get_next_line returns…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`-1`'],
      },
      {
        ask: [
          'How does get_next_line return a line that does end with a newline?',
          'When reading a normal line, with its newline, get_next_line returns…',
        ],
        right: ['The line, with its \\n at the end'],
        wrong: [
          'The line, without the final \\n',
          'The line plus what was left in the buffer',
          'Only the \\n, without the text',
        ],
      },
    ],
    wrong: [
      'With a newline added at the end',
      'It does not: it returns NULL straight away',
      'The line, without the final \\n',
    ],
    why: 'The line comes back with its \\n if it has one (the last one may not) and, when nothing is left, get_next_line returns NULL.',
  },
  'gnl-errors': {
    forms: [
      {
        ask: [
          'What must `get_next_line(-1)` return?',
          'With a descriptor that is not valid, get_next_line returns…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`-1`', '`"(null)"`'],
      },
      {
        ask: [
          'If read fails halfway through a line, what do you do with what is kept in the static?',
          'read returns -1 and the static holds half a line. What should you do?',
        ],
        right: ['Free it and return NULL'],
        wrong: [
          'Return what was read so far',
          'Keep it for the next call',
          'Call exit with an error',
        ],
      },
    ],
    wrong: ['Return what was read so far', 'Keep it for the next call', 'Print an error and go on'],
    why: 'On an error (bad fd or a failing read) get_next_line returns NULL, and freeing what was kept avoids the leak.',
  },
  'gnl-bonus-fd': {
    forms: [
      {
        ask: [
          'In the bonus, what does it take to read from several fds at once?',
          'For get_next_line to switch between several files without mixing them, you have to…',
        ],
        right: ['Keep the leftover of each fd separately'],
        wrong: [
          'Open the files always in the same order',
          'Read each file whole in one go',
          'Use lseek to go back in each fd',
          'Close each fd before moving to the next',
        ],
      },
      {
        ask: [
          'How many static variables does the get_next_line bonus allow?',
          'The bonus asks you to do it with, at most, how many statics?',
        ],
        right: ['1'],
        wrong: ['2', '0', '3', '1024'],
      },
      {
        ask: [
          'You alternate calls with fd 3 and fd 4. What does each one return?',
          'In the bonus, if you call with fd 3, then with 4 and again with 3, each call gives…',
        ],
        right: ['The next line of that fd, unmixed'],
        wrong: [
          'The next line of the last fd opened',
          'Always the first line of each file',
          'A line mixing what both fds hold',
          'NULL: descriptors cannot be mixed',
        ],
      },
    ],
    wrong: [
      'Read each file whole in one go',
      'Close each fd before moving to the next',
      'Open the files always in the same order',
    ],
    why: 'Each fd has its own pending leftover (for example, an array of leftovers indexed by fd), and the bonus asks for it with a single static.',
  },
}
