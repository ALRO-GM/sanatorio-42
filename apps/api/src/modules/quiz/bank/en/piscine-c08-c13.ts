/** Banco de Not-games en inglés: la piscina, C 08 a C 13 (`../piscine-c08-c13.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C08_C13_EN: Readonly<Record<string, ConceptText>> = {
  'pis-c08-include-guard': {
    forms: [
      {
        ask: [
          'What are `#ifndef FT_H`, `#define FT_H` and `#endif` for, around ft.h?',
          'What does an include guard prevent in a .h file?',
        ],
        right: [
          'The contents being included twice in the same .c',
          'Repeated definitions if it gets included twice',
        ],
        wrong: [
          'ft.h being compiled before the .c files',
          'The norminette rejecting the header',
          'FT_H being declared as a global variable',
          'The compiler looking for ft.h in another folder',
        ],
      },
      {
        ask: [
          'Which directive closes the guard opened by `#ifndef FT_H`?',
          'An include guard starts with `#ifndef`. What closes it?',
        ],
        right: ['`#endif`'],
        wrong: ['`#undef FT_H`', '`#else`', '`#end`', '`#fi`'],
      },
    ],
    wrong: [
      'ft.h being compiled before the .c files',
      'The norminette rejecting the header',
      'FT_H being declared as a global variable',
    ],
    why: 'The first time, FT_H gets defined and the contents go in; the next time #ifndef is false and everything up to #endif is skipped.',
  },
  'pis-c08-header-content': {
    forms: [
      {
        ask: ['What goes in a header like ft.h?', 'In the Piscine, what does a .h file contain?'],
        right: [
          'Prototypes, macros and typedefs, no function bodies',
          'What other .c files need to know: prototypes and types',
        ],
        wrong: [
          'The function bodies, so they are not repeated',
          'The program main, which everyone includes',
          'The local variables of each of the functions',
          'The compiled .o files, to link faster',
        ],
      },
      {
        ask: [
          'How do you include, from a .c, the ft.h that sits in your same folder?',
          'Your ft.h is next to main.c. Which line includes it?',
        ],
        right: ['`#include "ft.h"`'],
        wrong: ['`#import "ft.h"`', '`#include ft.h`', '`#define "ft.h"`', '`include "ft.h";`'],
      },
    ],
    wrong: [
      'The function bodies, so they are not repeated',
      'The program main, which everyone includes',
      'The compiled .o files, to link faster',
    ],
    why: 'A .h announces what exists (prototypes, macros, types) and is included with quotes when it is yours; the code goes in the .c files.',
  },
  'pis-c08-macro-parens': {
    forms: [
      {
        ask: ['What is the value of `n`?', 'What value does `n` hold after this line?'],
        right: ['9'],
        wrong: ['12', '6', '18', '8'],
      },
      {
        ask: [
          'How should DOUBLE be written so it gives the expected result?',
          'Which version of DOUBLE works in any expression?',
        ],
        right: ['`#define DOUBLE(x) ((x) + (x))`'],
        wrong: [
          '`#define DOUBLE(x) (x) + (x)`',
          '`#define DOUBLE(x) x + x;`',
          '`#define DOUBLE (x) (x + x)`',
          '`#define DOUBLE(x) {x + x}`',
        ],
      },
    ],
    wrong: ['12', '6', '18'],
    why: 'A macro pastes the text as is: DOUBLE(3) * 2 becomes 3 + 3 * 2, which is 9; parentheses everywhere avoid it.',
  },
  'pis-c08-abs-macro': {
    forms: [
      {
        ask: ['What value ends up in `n`?', 'What does `ABS(2 - 5)` give with this macro?'],
        right: ['-7'],
        wrong: ['3', '-3', '7', '0'],
      },
      {
        ask: ['Why is it not 3?', 'What makes this macro fail with `2 - 5`?'],
        right: [
          'Because -Value becomes -2 - 5: parentheses are missing',
          'Because the argument is not wrapped in parentheses',
        ],
        wrong: [
          'Because the ternary cannot be used in macros',
          'Because a macro does not accept expressions',
          'Because ABS only works with positive constants',
          'Because Value has to be written in lowercase',
        ],
      },
    ],
    wrong: ['3', '-3', '7'],
    why: 'Without parentheses, -Value expands to -2 - 5 = -7; ft_abs.h has to write ((Value) < 0 ? -(Value) : (Value)).',
  },
  'pis-c08-define-semicolon': {
    forms: [
      {
        ask: ['What happens when this is compiled?', 'What does the compiler do with this code?'],
        right: [
          'Error: it expands to int tab[10;];',
          'It does not compile: the ; ends up in the brackets',
        ],
        wrong: [
          'Nothing: the ; in the #define is ignored',
          'It creates an array of 11 int, counting the ;',
          'It compiles, but -Wall warns about the extra ;',
          'It creates an array of 10 int with no problem',
        ],
      },
    ],
    wrong: [
      'Nothing: the ; in the #define is ignored',
      'It creates an array of 11 int, counting the ;',
      'It compiles, but -Wall warns about the extra ;',
    ],
    why: 'The preprocessor pastes everything after the name, semicolon included: a #define takes no ;.',
  },
  'pis-c08-even-macro': {
    forms: [
      {
        ask: [
          'In ft_boolean.h, what should `EVEN(nbr)` give?',
          'What does the `EVEN(nbr)` macro in ft_boolean.h check?',
        ],
        right: ['True if nbr is even and false if it is odd', 'Whether nbr is divisible by 2'],
        wrong: [
          'The even number closest to nbr',
          'The value of nbr multiplied by 2',
          'True if nbr is positive and false if not',
          'How many even digits nbr has',
        ],
      },
      {
        ask: [
          'Which way of writing `EVEN` is safe with any argument?',
          'Which of these definitions of EVEN does not break with `EVEN(n + 1)`?',
        ],
        right: ['`#define EVEN(nbr) ((nbr) % 2 == 0)`'],
        wrong: [
          '`#define EVEN(nbr) nbr % 2 == 0`',
          '`#define EVEN(nbr) (nbr % 2 == 0)`',
          '`#define EVEN(nbr) ((nbr) % 2 == 0);`',
          '`#define EVEN (nbr) ((nbr) % 2 == 0)`',
        ],
      },
    ],
    wrong: [
      'The even number closest to nbr',
      'The value of nbr multiplied by 2',
      'True if nbr is positive and false if not',
    ],
    why: 'EVEN is a condition (remainder 0 when divided by 2), and each nbr goes in parentheses so n + 1 does not break the maths.',
  },
  'pis-c08-typedef-struct': {
    forms: [
      {
        ask: [
          'What does `typedef struct s_point t_point;` in ft_point.h allow?',
          'With the typedef in ft_point.h, what do you gain?',
        ],
        right: [
          'Writing t_point instead of struct s_point',
          'Giving struct s_point a shorter name',
        ],
        wrong: [
          'Creating a global variable named t_point',
          'Reserving memory for an s_point at compile time',
          'Making t_point a pointer to struct s_point',
          'Copying the struct every time it is passed to a function',
        ],
      },
      {
        ask: [
          'According to the 42 Norm, what prefix does a typedef name take?',
          'In the Norm, how does the name of a type created with typedef start?',
        ],
        right: ['`t_`'],
        wrong: ['`s_`', '`g_`', '`ft_`', '`u_`'],
      },
    ],
    wrong: [
      'Creating a global variable named t_point',
      'Reserving memory for an s_point at compile time',
      'Making t_point a pointer to struct s_point',
    ],
    why: 'typedef gives another name to an existing type; the Norm wants s_ for structs and t_ for typedefs.',
  },
  'pis-c08-arrow': {
    forms: [
      {
        ask: ['What is wrong with this code?', 'Why does the last line not compile?'],
        right: [
          'ptr is a pointer: you have to write ptr->x',
          'With a pointer to a struct you use -> and not the dot',
        ],
        wrong: [
          'p has to be allocated with malloc before use',
          'The fields of a struct cannot be changed',
          'x would have to be a char to hold 42',
          'You have to write *ptr.x to reach x',
        ],
      },
      {
        ask: [
          'Without the arrow, how do you reach field x through the pointer?',
          'How do you write the arrow access using the asterisk and the dot?',
        ],
        right: ['`(*ptr).x`'],
        wrong: ['`*ptr.x`', '`&ptr.x`', '`ptr.x`', '`*(ptr.x)`'],
      },
    ],
    wrong: [
      'p has to be allocated with malloc before use',
      'The fields of a struct cannot be changed',
      'x would have to be a char to hold 42',
    ],
    why: 'The dot is for a struct; with a pointer you use ptr->x, which is (*ptr).x (the dot binds tighter than the asterisk).',
  },
  'pis-c08-stock-str': {
    forms: [
      {
        ask: [
          'In ft_strs_to_tab, how is the end of the t_stock_str array marked?',
          'How does ft_show_tab know where the array from ft_strs_to_tab ends?',
        ],
        right: [
          'With a last element whose str is 0',
          'By a final element with its str pointer set to 0',
        ],
        wrong: [
          'With a last element whose size is -1',
          'With an element whose copy points to its str',
          "With a '\\0' right after the last element",
          'It is not marked: the size goes in the first one',
        ],
      },
      {
        ask: [
          'What must `copy` hold in each t_stock_str?',
          'In struct s_stock_str, what is the copy field?',
        ],
        right: [
          'A new copy of the string, with its own malloc',
          'A duplicate of av[i] in separately allocated memory',
        ],
        wrong: [
          'The same pointer as str, pointing to av[i]',
          "The length of the string, not counting the '\\0'",
          'The string reversed, for ft_show_tab to use',
          'The address of the next t_stock_str in the array',
        ],
      },
    ],
    wrong: [
      'With a last element whose size is -1',
      'With an element whose copy points to its str',
      'It is not marked: the size goes in the first one',
    ],
    why: 'Each t_stock_str holds size, str (the string from av) and copy (a duplicate); a str set to 0 closes the array.',
  },
  'pis-c09-ar-rc': {
    forms: [
      {
        ask: [
          'Which command creates the static library libft.a from the .o files?',
          'In libft_creator.sh, what bundles the .o files into libft.a?',
        ],
        right: ['`ar rc libft.a *.o`'],
        wrong: [
          '`cc -o libft.a *.o`',
          '`ranlib libft.a *.c`',
          '`cc -c libft.a *.o`',
          '`tar cf libft.a *.o`',
        ],
      },
      {
        ask: ['What is a .a file like libft.a?', 'What is inside a static library?'],
        right: ['An archive that bundles several object files', '.o files packed to be linked'],
        wrong: [
          'An executable that does not have a main yet',
          'A header with the prototypes, already compiled',
          'A text file listing the .c files',
          'The .c files compressed to hand in via git',
        ],
      },
    ],
    wrong: ['`cc -o libft.a *.o`', '`ranlib libft.a *.c`', '`cc -c libft.a *.o`'],
    why: 'ar bundles object files into an archive (.a): r inserts or replaces them and c creates it without warning if it did not exist.',
  },
  'pis-c09-cc-c': {
    forms: [
      {
        ask: [
          'What does the `-c` option of cc do?',
          'What comes out of `cc -Wall -Wextra -Werror -c ft_putchar.c`?',
        ],
        right: [
          'It compiles to a .o without linking or making an executable',
          'An ft_putchar.o, not linked with anything',
        ],
        wrong: [
          'It compiles and runs the program right away',
          'It checks the Norm before compiling',
          'It compiles every .c in the folder',
          'An executable named c in the current folder',
        ],
      },
    ],
    wrong: [
      'It compiles and runs the program right away',
      'It checks the Norm before compiling',
      'It compiles every .c in the folder',
    ],
    why: 'With -c the compiler stops after creating the object file (.o); the .o files are later bundled with ar or linked.',
  },
  'pis-c09-link-lft': {
    forms: [
      {
        ask: [
          'With libft.a in the current folder, how do you compile main.c with it?',
          'Which command links main.c with the libft.a sitting right here?',
        ],
        right: ['`cc main.c -L. -lft`'],
        wrong: [
          '`cc main.c -L. -llibft`',
          '`cc main.c -I. -lft.a`',
          '`cc main.c -lft`',
          '`cc main.c -L libft.h`',
        ],
      },
      {
        ask: [
          'Which file does the linker look for with `-lft`?',
          'With the `-lft` option, what is the library it looks for called?',
        ],
        right: ['libft.a'],
        wrong: ['ft.a', 'lft.a', 'libft.h', 'ft.o'],
      },
    ],
    wrong: ['`cc main.c -L. -llibft`', '`cc main.c -I. -lft.a`', '`cc main.c -lft`'],
    why: '-L says which folder to search and -lft looks for libft.a: the linker adds lib in front and .a at the end.',
  },
  'pis-c09-make-default': {
    forms: [
      {
        ask: [
          'If you type just `make`, which rule runs?',
          'What does `make` do without being given any rule?',
        ],
        right: ['The first rule in the Makefile', 'It runs the first rule it finds'],
        wrong: [
          'Always the all rule, wherever it is',
          'The last rule in the Makefile',
          'The re rule, which rebuilds everything',
          'Every rule, one after the other',
        ],
      },
    ],
    wrong: [
      'Always the all rule, wherever it is',
      'The last rule in the Makefile',
      'The re rule, which rebuilds everything',
    ],
    why: 'make with no arguments runs the first rule in the file: that is why all goes at the very top.',
  },
  'pis-c09-clean-fclean': {
    forms: [
      {
        ask: [
          'What is the difference between `make clean` and `make fclean`?',
          'What does `fclean` delete that `clean` does not?',
        ],
        right: [
          'fclean also deletes the library or the binary',
          'Also the final file, $(NAME), not just the .o files',
        ],
        wrong: [
          'clean also deletes the library or the binary',
          'fclean only deletes the .o files in the srcs folder',
          'fclean compiles again after deleting',
          'None: fclean is another name for clean',
        ],
      },
      {
        ask: ['What does the `re` rule do?', 'In a 42 Makefile, what is `make re` for?'],
        right: [
          'fclean and then all: rebuilds everything from scratch',
          'It deletes everything and compiles it all again',
        ],
        wrong: [
          'It recompiles only the .c files that changed',
          'It runs the last rule that was used again',
          'It deletes the .o files and leaves the binary as it was',
          'It checks the Norm of every file',
        ],
      },
    ],
    wrong: [
      'clean also deletes the library or the binary',
      'fclean only deletes the .o files in the srcs folder',
      'fclean compiles again after deleting',
    ],
    why: 'clean removes the .o files; fclean, the .o files and $(NAME); re does fclean and then all.',
  },
  'pis-c09-relink': {
    forms: [
      {
        ask: ['What is wrong with this Makefile?', 'What is the problem with this all rule?'],
        right: [
          'all does not depend on $(NAME): it rebuilds libft.a every time',
          'It compiles and links again even when nothing changed',
        ],
        wrong: [
          'ranlib has to be called right after ar rc',
          '-Werror does not allow building a static library',
          'NAME would have to be written in lowercase',
          'A rule cannot have two commands in a row',
        ],
      },
      {
        ask: [
          'What happens if you type `make` twice in a row?',
          'After a first `make`, what does the second one do?',
        ],
        right: [
          'It compiles and creates libft.a all over again',
          'It redoes everything, though nothing changed',
        ],
        wrong: [
          'It says there is nothing to be done and stops',
          'It fails because libft.a already exists in the folder',
          'It only runs ar rc, without compiling again',
          'It deletes libft.a and stops without compiling',
        ],
      },
    ],
    wrong: [
      'ranlib has to be called right after ar rc',
      '-Werror does not allow building a static library',
      'NAME would have to be written in lowercase',
    ],
    why: 'all is not a file and depends on nothing: make always runs it; with all: $(NAME) and $(NAME): $(OBJS) only what changed is rebuilt.',
  },
  'pis-c09-make-vars': {
    forms: [
      {
        ask: [
          'How do you use the value of the first variable in a rule?',
          'Inside a rule, how do you write the value of the variable on the first line?',
        ],
        right: ['`$(NAME)`'],
        wrong: ['`$NAME`', '`%NAME%`', '`@NAME`', '`$[NAME]`'],
      },
    ],
    wrong: ['`$NAME`', '`%NAME%`', '`@NAME`'],
    why: 'In make a variable is read with $(NAME); $NAME would be read as the variable N followed by AME.',
  },
  'pis-c09-include-flag': {
    forms: [
      {
        ask: [
          'What is `-I includes` for when compiling?',
          'Your .h files are in the includes folder. What does `-I includes` tell cc?',
        ],
        right: [
          'To also look for headers in includes/',
          'Where to find the .h files that #include names',
        ],
        wrong: [
          'To add every .c in the includes folder',
          'To leave the executable inside includes/',
          'To link the libraries found in includes/',
          'Not to compile the files in includes/',
        ],
      },
    ],
    wrong: [
      'To add every .c in the includes folder',
      'To leave the executable inside includes/',
      'To link the libraries found in includes/',
    ],
    why: '-I adds a folder to those searched for .h files; libraries are searched with -L.',
  },
  'pis-c09-split': {
    forms: [
      {
        ask: [
          'How many words are in words before the end?',
          'How many strings does this call return, not counting the end?',
        ],
        right: ['3'],
        wrong: ['5', '4', '6', '2'],
      },
      {
        ask: ['How does the array returned by ft_split end?', 'What marks the end of words?'],
        right: [
          'With a pointer set to 0 after the last word',
          'With a final slot that holds 0 (NULL)',
        ],
        wrong: [
          'With an empty string after the last word',
          'With the number of words in the first slot',
          "With the '\\0' of the last word, and nothing else",
          'With the charset copied into the last slot',
        ],
      },
    ],
    wrong: ['5', '4', '6'],
    why: 'Any character of the charset separates, and consecutive separators do not create empty words; a pointer set to 0 closes the array.',
  },
  'pis-c10-display-file-errors': {
    forms: [
      {
        ask: [
          'What does display_file write if you give it no argument?',
          'You run `./ft_display_file` with nothing. Which message comes out?',
        ],
        right: ['File name missing.'],
        wrong: ['Too many arguments.', 'Cannot read file.', 'No such file or directory.'],
      },
      {
        ask: [
          'What does display_file write if you give it two files?',
          'You run `./ft_display_file a b`. Which message comes out?',
        ],
        right: ['Too many arguments.'],
        wrong: ['File name missing.', 'Cannot read file.', 'Usage: ft_display_file file'],
      },
      {
        ask: [
          'What does display_file write if the file cannot be opened?',
          'You run display_file with a file that does not exist. Which message comes out?',
        ],
        right: ['Cannot read file.'],
        wrong: ['File name missing.', 'Too many arguments.', 'Segmentation fault'],
      },
    ],
    wrong: ['No such file or directory.', 'Permission denied.', 'Bad file descriptor.'],
    why: 'The subject gives the three messages: no file, File name missing.; more than one, Too many arguments.; if it fails, Cannot read file.',
  },
  'pis-c10-stderr': {
    forms: [
      {
        ask: [
          'Why do error messages go to fd 2 and not to fd 1?',
          'What do you gain by writing errors to standard error?',
        ],
        right: [
          'They do not mix with the output if it is redirected',
          'They show up even if the output goes to a file',
        ],
        wrong: [
          'fd 1 only accepts numbers, not text',
          'write fails if it writes text to fd 1',
          'fd 2 is faster to write to than fd 1',
          'That way the program exits with an error',
        ],
      },
      {
        ask: [
          'If you run `./ft_cat nonexistent > out.txt`, where does the error show up?',
          'With the output redirected to out.txt, where does the ft_cat error appear?',
        ],
        right: [
          'In the terminal: > only redirects standard output',
          'On screen, because it goes to fd 2 and not fd 1',
        ],
        wrong: [
          'Inside out.txt, along with the normal output',
          'Nowhere: the redirection throws it away',
          'In an out.txt.err file created separately',
          'At the start of out.txt, before the output',
        ],
      },
    ],
    wrong: [
      'fd 1 only accepts numbers, not text',
      'write fails if it writes text to fd 1',
      'fd 2 is faster to write to than fd 1',
    ],
    why: '> only changes fd 1: what goes to fd 2 (stderr) still comes out in the terminal and does not pollute the output.',
  },
  'pis-c10-open-fail': {
    forms: [
      {
        ask: [
          'What is wrong with this code?',
          'Why does it not detect a file that does not exist?',
        ],
        right: [
          'open returns -1 on failure, not 0',
          'The open error is -1: you have to check fd < 0',
        ],
        wrong: [
          'O_RDONLY does not allow opening text files',
          'You have to call read before checking fd',
          'open gives 0 to files that do not exist',
          'The error message has to go to fd 1',
        ],
      },
      {
        ask: [
          'Which header holds the prototype of `open` and its flags?',
          'To use `open` with O_RDONLY, what do you have to include?',
        ],
        right: ['`<fcntl.h>`'],
        wrong: ['`<unistd.h>`', '`<stdio.h>`', '`<stdlib.h>`', '`<string.h>`'],
      },
    ],
    wrong: [
      'O_RDONLY does not allow opening text files',
      'You have to call read before checking fd',
      'open gives 0 to files that do not exist',
    ],
    why: 'open returns a descriptor (usually 3 or more) or -1 on failure; 0 is standard input. Its prototype is in fcntl.h.',
  },
  'pis-c10-read-loop': {
    forms: [
      {
        ask: ['What is wrong with this loop?', 'With a 10-byte file, what goes wrong?'],
        right: [
          'It writes 4096 bytes even if read read fewer',
          'It outputs garbage: it writes more than it read',
        ],
        wrong: [
          'read cannot read more than 1024 bytes at a time',
          'The loop should keep going while n >= 0',
          'buf has to be allocated first with malloc',
          'fd has to be closed inside the loop, each time',
        ],
      },
      {
        ask: [
          'What size should be passed to write?',
          'To avoid writing too much, what goes as the third argument of write?',
        ],
        right: ['`n`'],
        wrong: ['`4096`', '`sizeof(buf) - 1`', '`ft_strlen(buf)`', '`n + 1`'],
      },
    ],
    wrong: [
      'read cannot read more than 1024 bytes at a time',
      'The loop should keep going while n >= 0',
      'buf has to be allocated first with malloc',
    ],
    why: 'read says how many bytes it read: you write those n; buf does not end in \\0, so strlen does not work either.',
  },
  'pis-c10-cat-stdin': {
    forms: [
      {
        ask: [
          'What does ft_cat do if you give it no file?',
          'Like cat, what does `./ft_cat` do with no arguments?',
        ],
        right: [
          'It reads standard input and writes it out',
          'It copies whatever arrives on fd 0 to the output',
        ],
        wrong: [
          'It writes File name missing. and stops',
          'It does nothing and returns 0 right away',
          'It waits for someone to create a file',
          'It reads the last file that was opened',
        ],
      },
      {
        ask: [
          'Which function gives the text of an error like «No such file or directory»?',
          'To write the reason for the error in ft_cat, what do you use?',
        ],
        right: ['`strerror(errno)`'],
        wrong: ['`perror(errno)`', '`errno(strerror)`', '`write(2, errno, 4)`', '`printf(errno)`'],
      },
    ],
    wrong: [
      'It writes File name missing. and stops',
      'It does nothing and returns 0 right away',
      'It waits for someone to create a file',
    ],
    why: 'With no files, cat reads fd 0; when something fails, errno holds the reason and strerror gives it as text.',
  },
  'pis-c10-tail-c': {
    forms: [
      {
        ask: [
          'What does `ft_tail -c 5 file` show?',
          'With the -c 5 option, what does ft_tail show?',
        ],
        right: ['The last 5 bytes of the file', 'Only the end: its last 5 bytes'],
        wrong: [
          'The last 5 lines of the file',
          'The first 5 bytes of the file',
          'Everything but the last 5 bytes',
          'The whole file, 5 times in a row',
        ],
      },
      {
        ask: [
          'If the file contains `abcdefgh`, with no final newline, what does `ft_tail -c 3` print?',
          'What does `ft_tail -c 3` output for a file that only holds `abcdefgh`?',
        ],
        right: ['fgh'],
        wrong: ['abc', 'efgh', 'defgh', 'gh'],
      },
    ],
    wrong: [
      'The last 5 lines of the file',
      'The first 5 bytes of the file',
      'Everything but the last 5 bytes',
    ],
    why: 'tail -c N counts bytes (not lines) from the end: it shows the last N.',
  },
  'pis-c10-hexdump': {
    forms: [
      {
        ask: [
          'How does `hexdump -C` write the character A in the hex column?',
          'In the output of `hexdump -C`, what do you see for each A in the file?',
        ],
        right: ['41'],
        wrong: ['65', '101', '10', '14'],
      },
      {
        ask: [
          'How many bytes does `hexdump -C` show on each line?',
          'With -C, how many bytes of the file fit on a full line?',
        ],
        right: ['16'],
        wrong: ['8', '32', '10', '64'],
      },
      {
        ask: [
          'What appears on the right of each line of `hexdump -C`?',
          'With -C, what is between the bars | | at the end of the line?',
        ],
        right: [
          'The bytes as text, with a dot if they are not visible',
          'The printable characters, and . for the rest',
        ],
        wrong: [
          'The checksum of the line, in hexadecimal',
          'The same bytes written in octal',
          'The line number, counted in decimal',
          'The size of the file up to that line',
        ],
      },
    ],
    wrong: ['65', '101', '10'],
    why: "'A' is 65, which is 41 in hexadecimal; -C shows the offset, 16 bytes in hex and their text between | |.",
  },
  'pis-c10-basename': {
    forms: [
      {
        ask: [
          'Why does ft_cat use basename on argv[0] in its errors?',
          'In an ft_cat error, what do you get from `basename(argv[0])`?',
        ],
        right: [
          'The program name, without the path, for the error',
          'ft_cat, even if it was run as ./ft_cat',
        ],
        wrong: [
          'The folder that holds the file being read',
          'The name of the file without its extension',
          'Whether argv[0] is a readable file',
          'The number of arguments it was given',
        ],
      },
    ],
    wrong: [
      'The folder that holds the file being read',
      'The name of the file without its extension',
      'Whether argv[0] is a readable file',
    ],
    why: 'Like cat, the error starts with the program name: basename strips the path from argv[0] (./ft_cat gives ft_cat).',
  },
  'pis-c10-close': {
    forms: [
      {
        ask: [
          'Why do you have to `close(fd)` when you are done reading?',
          'What do you gain by closing a file you have only read?',
        ],
        right: [
          'It frees the descriptor: only so many can be open at once',
          'It gives the fd back to the system so it can be reused',
        ],
        wrong: [
          'The changes made by reading get saved to disk',
          'It deletes the file once it is no longer needed',
          'read goes back to the start of the file',
          'The data read gets erased from buf',
        ],
      },
    ],
    wrong: [
      'The changes made by reading get saved to disk',
      'It deletes the file once it is no longer needed',
      'read goes back to the start of the file',
    ],
    why: 'Each open file takes a descriptor and a process has a limited number of them; close frees it.',
  },
  'pis-c11-fptr-syntax': {
    forms: [
      {
        ask: [
          'How do you declare f, a pointer to a function that takes an int and returns an int?',
          'In ft_map, parameter f points to a function from int to int. How is it written?',
        ],
        right: ['`int (*f)(int)`'],
        wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`', '`int f*(int)`'],
      },
      {
        ask: ['What does `int *f(int)` declare?', 'Without parentheses around `*f`, what is f?'],
        right: [
          'A function that takes an int and returns an int *',
          'A regular function that returns a pointer to int',
        ],
        wrong: [
          'A pointer to a function that takes and returns int',
          'An array of pointers to int, of size int',
          'A pointer to int named f, and nothing else',
          'A function pointer that returns an int *',
        ],
      },
    ],
    wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`'],
    why: 'The parentheses in (*f) make f a pointer; without them, the * sticks to the return type and f is a function.',
  },
  'pis-c11-foreach': {
    forms: [
      {
        ask: ['What does this call print?', 'What shows up on screen?'],
        right: ['421'],
        wrong: ['124', '4', '7', '3'],
      },
      {
        ask: [
          'What does ft_foreach do with the function it receives?',
          'In ft_foreach, what is f called with?',
        ],
        right: [
          'It calls it with each element of tab, in order',
          'Once per element, passing it tab[i]',
        ],
        wrong: [
          'It calls it only once, with the whole array',
          'It builds a new array with what f returns',
          'It counts the elements for which f gives 1',
          'It calls it with each index i, not tab[i]',
        ],
      },
    ],
    wrong: ['124', '4', '7'],
    why: 'ft_foreach calls f(tab[i]) for each i from 0 to length - 1: ft_putnbr writes 4, 2 and 1 with no separator.',
  },
  'pis-c11-map': {
    forms: [
      {
        ask: ['What does ft_map return?', 'What comes out of `ft_map(tab, length, &f)`?'],
        right: [
          'A new array with what f gives for each element',
          'Another int array, with f applied to each one',
        ],
        wrong: [
          'The same tab, changed in place by f',
          'The sum of what f returns for each element',
          'The number of elements for which f gives 1',
          'The last value the function f returned',
        ],
      },
      {
        ask: [
          'Why does ft_map need malloc and ft_foreach does not?',
          'What forces ft_map to allocate memory?',
        ],
        right: [
          'It returns a new array, which has to stay alive',
          'The results go in an array that outlives the function',
        ],
        wrong: [
          'f may return a negative number',
          'ft_foreach cannot use function pointers',
          'length may be larger than the array itself',
          'Without malloc the function f cannot be called',
        ],
      },
    ],
    wrong: [
      'The same tab, changed in place by f',
      'The sum of what f returns for each element',
      'The number of elements for which f gives 1',
    ],
    why: 'ft_map leaves tab alone: it allocates an int * of length and stores f(tab[i]) in each slot, and that must live after returning.',
  },
  'pis-c11-count-if': {
    forms: [
      {
        ask: ['What does this call return?', 'What does ft_count_if give here?'],
        right: ['2'],
        wrong: ['4', '1', '3', '0'],
      },
    ],
    wrong: ['4', '1', '3'],
    why: 'ft_count_if counts the elements for which f does not give 0: piscina and norma have more than 3 letters.',
  },
  'pis-c11-any': {
    forms: [
      {
        ask: ['What does ft_any return?', 'When does `ft_any(tab, &f)` return 1?'],
        right: [
          '1 if f does not give 0 for some element, otherwise 0',
          'If at least one element makes f not give 0',
        ],
        wrong: [
          '1 only if f gives 1 for every element, otherwise 0',
          'The number of elements for which f does not give 0',
          'The position of the first element that satisfies f',
          'If f gives 0 for at least one of the elements',
        ],
      },
      {
        ask: [
          'How does ft_any know where tab ends, if it does not get its size?',
          'ft_any has no length. What marks the end of tab?',
        ],
        right: ['A last pointer that is 0', 'The last element being NULL'],
        wrong: [
          'tab always having 10 elements',
          "The '\\0' of the last string",
          'Calling sizeof(tab) inside',
          'The last string being empty',
        ],
      },
    ],
    wrong: [
      '1 only if f gives 1 for every element, otherwise 0',
      'The number of elements for which f does not give 0',
      'The position of the first element that satisfies f',
    ],
    why: 'ft_any walks tab up to the pointer set to 0 and returns 1 as soon as f gives something other than 0; if none does, 0.',
  },
  'pis-c11-is-sort': {
    forms: [
      {
        ask: ['What does this call return?', 'What does ft_is_sort give with this tab?'],
        right: ['1'],
        wrong: ['0', '4', '-1', '3'],
      },
      {
        ask: [
          'In ft_is_sort, what should f(a, b) return if a is less than b?',
          'Like strcmp, what does the comparison function give when the first one is smaller?',
        ],
        right: ['A negative number', 'Something below 0'],
        wrong: ['A positive number', 'Always 1', 'The smaller of the two', 'Always 0'],
      },
    ],
    wrong: ['0', '4', '-1'],
    why: 'f gives negative, 0 or positive like strcmp; 1, 3, 3, 7 is sorted (two equal ones in a row do not break it), so it gives 1.',
  },
  'pis-c11-do-op': {
    forms: [
      {
        ask: ['What does `./do-op 42 / 0` print?', 'In do-op, what comes out when dividing by 0?'],
        right: ['Stop : division by zero'],
        wrong: [
          'Stop : modulo by zero',
          'Error : division by zero',
          'Floating point exception',
          'Stop : divide by zero',
        ],
      },
      {
        ask: ['What does `./do-op 10 % 0` print?', 'In do-op, what comes out with modulo by 0?'],
        right: ['Stop : modulo by zero'],
        wrong: [
          'Stop : division by zero',
          'Error : modulo by zero',
          'Floating point exception',
          'Stop : mod by zero',
        ],
      },
      {
        ask: [
          'What does `./do-op 5 x 3` print?',
          'If the operator is not + - * / %, what does do-op print?',
        ],
        right: ['0'],
        wrong: ['15', '8', '-1', '53'],
      },
    ],
    wrong: ['Error : division by zero', 'Floating point exception', 'Stop : divide by zero'],
    why: 'do-op picks the operation with an array of function pointers; the subject sets both Stop messages and a 0 if the operator is invalid.',
  },
  'pis-c11-fptr-array': {
    forms: [
      {
        ask: ['What does this code print?', 'What is the output, if ft_sub subtracts?'],
        right: ['6'],
        wrong: ['14', '4', '10', '-6'],
      },
      {
        ask: ['What is `ops`?', 'What does the first line declare?'],
        right: [
          'An array of 2 pointers to functions of two int',
          'Two pointers to functions that take two int',
        ],
        wrong: [
          'A function that returns an array of 2 int',
          'A pointer to an array of 2 int, nothing more',
          'An array of 2 int initialised with two sums',
          'A function that takes 2 int and an array',
        ],
      },
    ],
    wrong: ['14', '4', '10'],
    why: 'ops[i] is a function pointer: ops[1](10, 4) calls ft_sub(10, 4), which gives 6.',
  },
  'pis-c11-advanced-sort': {
    forms: [
      {
        ask: [
          'What does ft_advanced_sort_string_tab change compared with ft_sort_string_tab?',
          'What extra does the advanced version of the string sort have?',
        ],
        right: [
          'It sorts according to the cmp function it receives',
          'The sort order is given by a function pointer',
        ],
        wrong: [
          'It sorts from largest to smallest instead',
          'It returns a new array instead of changing tab',
          'It also sorts the letters inside each string',
          'It removes repeated strings after sorting',
        ],
      },
      {
        ask: [
          'If you pass ft_strcmp to ft_advanced_sort_string_tab, what order comes out?',
          'With ft_strcmp as cmp, how does tab end up?',
        ],
        right: [
          'In ASCII order, as with ft_sort_string_tab',
          'From smallest to largest by ASCII codes',
        ],
        wrong: [
          'By length, from shortest to longest',
          'Reverse ASCII order, from largest to smallest',
          'As it was: ft_strcmp does not sort',
          'In alphabetical order, ignoring case',
        ],
      },
    ],
    wrong: [
      'It sorts from largest to smallest instead',
      'It returns a new array instead of changing tab',
      'It also sorts the letters inside each string',
    ],
    why: 'The advanced version compares with cmp(a, b) instead of fixing ASCII order; with ft_strcmp it does the same as the other one.',
  },
  'pis-c12-create-elem': {
    forms: [
      {
        ask: ['What is this ft_create_elem missing?', 'What has to be added to this function?'],
        right: [
          'Setting elem->next to NULL and checking if malloc failed',
          'Checking elem and leaving next at NULL',
        ],
        wrong: [
          'Copying data with malloc before storing it',
          'Freeing elem before returning it',
          'Allocating sizeof(t_list *) and not sizeof(t_list)',
          'Returning &elem instead of elem',
        ],
      },
      {
        ask: ['What is `elem->next` on return?', 'As it stands, what is in next?'],
        right: ['Garbage: malloc does not zero anything', 'Whatever was in that memory'],
        wrong: [
          'NULL, because malloc sets it to 0',
          'The address of elem itself',
          'The same pointer as data',
          'The element created before it',
        ],
      },
    ],
    wrong: [
      'Copying data with malloc before storing it',
      'Freeing elem before returning it',
      'Returning &elem instead of elem',
    ],
    why: 'malloc does not initialise: next holds garbage and the first traversal runs off the list; on top of that malloc may return NULL.',
  },
  'pis-c12-push-front': {
    forms: [
      {
        ask: [
          'What does the list look like, from head to end?',
          'In what order are the data, starting from list?',
        ],
        right: ['A -> B -> C'],
        wrong: ['C -> B -> A', 'A', 'C -> A -> B', 'B -> C -> A'],
      },
      {
        ask: [
          'And if the three calls were to ft_list_push_back?',
          'Swapping push_front for push_back, what would it look like?',
        ],
        right: ['C -> B -> A'],
        wrong: ['A -> B -> C', 'C', 'A -> C -> B', 'B -> A -> C'],
      },
    ],
    wrong: ['C -> A -> B', 'B -> C -> A', 'B -> A -> C'],
    why: 'push_front puts each new one in front (the last one in ends up first); push_back puts it at the end.',
  },
  'pis-c12-list-size': {
    forms: [
      {
        ask: [
          'With a list of 3 elements, what does it return?',
          'What does it give with a list A -> B -> C?',
        ],
        right: ['2'],
        wrong: ['3', '4', '0', '1'],
      },
      {
        ask: [
          'What happens if the list is empty?',
          'If begin_list is NULL, what does this function do?',
        ],
        right: [
          'It crashes: it reads next from a NULL pointer',
          'Segfault when reading begin_list->next',
        ],
        wrong: [
          'It returns 0, as it should',
          'It returns -1 to signal the error',
          'It gets stuck in an endless loop',
          'It returns 1, for the empty element',
        ],
      },
      {
        ask: ['How do you fix it?', 'Which change makes it right in every case?'],
        right: ['With `while (begin_list)` instead of checking next'],
        wrong: [
          'With `while (begin_list->next->next)`',
          'Changing `i++` to `i += 2` in the loop',
          'With `while (begin_list->data)` in the loop',
          'Putting `return (i + 2);` at the end',
        ],
      },
    ],
    wrong: ['3', '4', '0'],
    why: 'Checking begin_list->next leaves the last one uncounted and crashes on an empty list: you have to check begin_list.',
  },
  'pis-c12-list-last': {
    forms: [
      {
        ask: ['What does ft_list_last return?', 'What comes out of `ft_list_last(begin_list)`?'],
        right: [
          'A pointer to the last element, the one with next at NULL',
          'The last link of the list, or NULL if it is empty',
        ],
        wrong: [
          'A pointer to the second-to-last element of the list',
          'The data of the last element, already converted',
          'The number of elements in the list',
          'The list without its last element, already freed',
        ],
      },
      {
        ask: [
          'When looking for the last element, when does the loop stop?',
          'Which condition tells you that you are on the last element?',
        ],
        right: ['When the next of the current element is NULL', 'When there is no next one'],
        wrong: [
          'When the current element itself is NULL',
          'When data is 0 in the current element',
          'When next points back to the head',
          'After as many turns as sizeof(t_list)',
        ],
      },
    ],
    wrong: [
      'A pointer to the second-to-last element of the list',
      'The data of the last element, already converted',
      'The number of elements in the list',
    ],
    why: 'The last element is the one whose next is NULL: you move on while there is a next one and return that one.',
  },
  'pis-c12-list-clear': {
    forms: [
      {
        ask: ['What is wrong with this ft_list_clear?', 'Why is this freeing loop wrong?'],
        right: [
          'It reads begin_list->next after free(begin_list)',
          'It uses the already freed element to reach the next',
        ],
        wrong: [
          'It should free data with free, not with free_fct',
          'It frees data before the element, which is backwards',
          'It does not free the last element of the list',
          'It should set begin_list to NULL at the start',
        ],
      },
      {
        ask: ['How do you fix it?', 'Which change makes it right?'],
        right: [
          'Save next in a variable before the free',
          'Copy begin_list->next aside and then free',
        ],
        wrong: [
          'Do free(begin_list) after the loop',
          'Call free before free_fct',
          'Set begin_list to NULL before the free',
          'Walk the list twice in a row',
        ],
      },
    ],
    wrong: [
      'It should free data with free, not with free_fct',
      'It frees data before the element, which is backwards',
      'It does not free the last element of the list',
    ],
    why: 'After free(begin_list) that memory is no longer yours: you have to save the next one before freeing.',
  },
  'pis-c12-list-at': {
    forms: [
      {
        ask: [
          'Which element does `ft_list_at(list, 2)` return?',
          'What does `ft_list_at(list, 2)` give?',
        ],
        right: ['The C one'],
        wrong: ['The B one', 'The D one', 'NULL', 'The A one'],
      },
      {
        ask: ['What does `ft_list_at(list, 4)` return?', 'What does `ft_list_at(list, 4)` give?'],
        right: ['NULL'],
        wrong: ['The D one', 'The A one', 'The C one', 'The B one'],
      },
    ],
    wrong: ['The B one', 'The D one', 'The A one'],
    why: 'ft_list_at counts from 0 (the first one is 0) and returns NULL if the list ends first.',
  },
  'pis-c12-reverse': {
    forms: [
      {
        ask: [
          'With the list A -> B -> C, what does it look like at the end?',
          'If it starts as A -> B -> C, what list comes out?',
        ],
        right: ['C -> B -> A'],
        wrong: ['B -> A', 'C -> B -> A -> C', 'A', 'B -> C -> A'],
      },
      {
        ask: [
          'What is the next variable for?',
          'What would happen without saving `cur->next` in next?',
        ],
        right: [
          'So the rest of the list is not lost when cur->next changes',
          'Without it, turning cur->next loses what is left',
        ],
        wrong: [
          'To walk the list twice as fast',
          'To keep the last element of the list',
          'To free the previous element at the end',
          'To count how many elements the list has',
        ],
      },
    ],
    wrong: ['B -> A', 'C -> B -> A -> C', 'B -> C -> A'],
    why: 'Each turn flips one arrow backwards; next keeps the rest before flipping it, and prev ends up as the new head.',
  },
  'pis-c12-foreach': {
    forms: [
      {
        ask: [
          'In ft_list_foreach, what does f receive on each call?',
          'What is f called with in `ft_list_foreach(begin_list, f)`?',
        ],
        right: ['The data of each element', 'begin_list->data, one by one'],
        wrong: [
          'The whole element, with its next',
          'The address of begin_list',
          'The index of the element in the list',
          'The whole list, just once',
        ],
      },
    ],
    wrong: [
      'The whole element, with its next',
      'The address of begin_list',
      'The index of the element in the list',
    ],
    why: 'ft_list_foreach walks the list and calls f(elem->data) on each element: f never sees the next pointers.',
  },
  'pis-c12-remove-if': {
    forms: [
      {
        ask: [
          'Which elements does ft_list_remove_if remove?',
          'In ft_list_remove_if, when is an element deleted?',
        ],
        right: [
          'Those that give 0 when their data is compared with data_ref',
          'Those for which cmp(data, data_ref) returns 0',
        ],
        wrong: [
          'Those that give 1 or more when compared with data_ref',
          'Only the first one whose data equals data_ref',
          'All but the ones that are equal to data_ref',
          'Those whose data is NULL, without using cmp',
        ],
      },
      {
        ask: [
          'If the one removed is the first, what has to change?',
          'When the head of the list is deleted, what has to be updated?',
        ],
        right: [
          '*begin_list, so it points to the next one',
          'The head: *begin_list becomes the second one',
        ],
        wrong: [
          'Nothing: the previous one already points to the next',
          'The next of the first one, setting it to NULL',
          'The next of the last element of the list',
          'begin_list, the local pointer, and nothing else',
        ],
      },
    ],
    wrong: [
      'Those that give 1 or more when compared with data_ref',
      'Only the first one whose data equals data_ref',
      'All but the ones that are equal to data_ref',
    ],
    why: 'Every element whose cmp with data_ref gives 0 (like strcmp) is removed, and if it is the head, *begin_list changes.',
  },
  'pis-c12-sorted-insert': {
    code: 'list: 1 -> 3 -> 8 -> NULL\n\n5 is inserted with ft_sorted_list_insert',
    forms: [
      {
        ask: [
          'What does the list look like, if cmp sorts from smallest to largest?',
          'With cmp from smallest to largest, what list comes out?',
        ],
        right: ['1 -> 3 -> 5 -> 8'],
        wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8', '1 -> 3 -> 5'],
      },
    ],
    wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8'],
    why: 'ft_sorted_list_insert looks for the first element larger than the new one and puts it in front: the list stays sorted.',
  },
  'pis-c13-prefix': {
    forms: [
      {
        ask: [
          'In what order does `btree_apply_prefix` visit the nodes?',
          'With btree_apply_prefix and a function that writes each item, what comes out?',
        ],
        right: ['8 3 1 6 10 14'],
        wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14', '8 10 14 3 6 1'],
      },
      {
        ask: [
          'In a prefix traversal, when is the root handled?',
          'What order does btree_apply_prefix follow at each node?',
        ],
        right: ['Root, then the left child and then the right'],
        wrong: [
          'Left child, then the root and then the right',
          'Left child, then the right and then the root',
          'Right child, then the root and then the left',
        ],
      },
    ],
    wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14'],
    why: 'Prefix is root, left, right: 8, the whole subtree of 3 (3 1 6) and then that of 10 (10 14).',
  },
  'pis-c13-infix': {
    forms: [
      {
        ask: [
          'What does `btree_apply_infix` print with a function that writes each item?',
          'In what order does the infix traversal visit the nodes?',
        ],
        right: ['A B C D F G'],
        wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G', 'G F D C B A'],
      },
      {
        ask: [
          'In a search tree, what is special about the infix traversal?',
          'Why is infix used to get a search tree out in order?',
        ],
        right: [
          'It gives the items sorted from smallest to largest',
          'It visits the items in increasing order',
        ],
        wrong: [
          'It gives the items in the order they were inserted',
          'It visits the root first and then the leaves',
          'It gives the items sorted from largest to smallest',
          'It visits only the leaves, from left to right',
        ],
      },
    ],
    wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G'],
    why: 'Infix is left, root, right: in a search tree the items come out sorted.',
  },
  'pis-c13-suffix': {
    forms: [
      {
        ask: [
          'What does `btree_apply_suffix` print with a function that writes each item?',
          'In what order does the suffix traversal visit the nodes?',
        ],
        right: ['2 3 * 5 +'],
        wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +', '+ 5 * 3 2'],
      },
      {
        ask: [
          'Why is the suffix traversal good for freeing a tree?',
          'To free every node, what is good about suffix?',
        ],
        right: [
          'It handles both children before their parent',
          'Each node is freed after its children',
        ],
        wrong: [
          'It is the fastest of the three traversals',
          'It visits the root before any other node',
          'It is the only one that needs no recursion',
          'It frees the whole right subtree first',
        ],
      },
    ],
    wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +'],
    why: 'Suffix is left, right, root: children come before their parent, so you never free a node that is still needed.',
  },
  'pis-c13-insert': {
    code: 'Empty tree. Inserted in this order: 5, 3, 8, 4\n(btree_insert_data with cmpf from smallest to largest)',
    forms: [
      {
        ask: ['Where does the 4 end up?', 'Which spot does the last one inserted take?'],
        right: ['To the right of the 3'],
        wrong: ['To the left of the 3', 'To the left of the 8', 'To the right of the 5'],
      },
      {
        ask: ['Which node ends up as the root?', 'After the four insertions, which is the root?'],
        right: ['The 5'],
        wrong: ['The 3', 'The 4', 'The 8'],
      },
      {
        ask: [
          'If you then insert another 5, where does it go?',
          'An item equal to the root, on which side is it inserted?',
        ],
        right: ['Into the right subtree of the root', 'It goes down the right of the 5'],
        wrong: [
          'Into the left subtree of the root',
          'Nowhere: there are no repeats',
          'It replaces the root that was there',
        ],
      },
    ],
    wrong: ['To the left of the 3', 'To the left of the 8', 'To the right of the 5'],
    why: 'Each item goes down from the root: left if it is smaller and right if it is equal or larger. 4 < 5 and 4 > 3.',
  },
  'pis-c13-level-count': {
    forms: [
      {
        ask: [
          'How many levels does `btree_level_count` count in this tree?',
          'What does btree_level_count return with this tree?',
        ],
        right: ['4'],
        wrong: ['5', '3', '2', '6'],
      },
      {
        ask: [
          'What does btree_level_count return if root is NULL?',
          'With an empty tree, what does btree_level_count give?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
    ],
    wrong: ['5', '3', '2'],
    why: 'It counts the nodes of the longest branch (a, c, d, e): 1 + the larger of the two children, and 0 if there is no node.',
  },
  'pis-c13-by-level': {
    forms: [
      {
        ask: [
          'In what order does `btree_apply_by_level` visit the nodes?',
          'With btree_apply_by_level, which items come out and in what order?',
        ],
        right: ['1 2 3 4 5 6'],
        wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1', '1 3 2 6 5 4'],
      },
      {
        ask: [
          'btree_apply_by_level calls applyf with three values. Which ones?',
          'What does applyf receive in btree_apply_by_level?',
        ],
        right: [
          'The item, its level and whether it is the first of its level',
          'The item, the current level and whether it opens that level',
        ],
        wrong: [
          'The item, its parent and the number of children',
          'The node, its level and the height of the tree',
          'The item, the left child and the right one',
          'The item, its position and the total number of nodes',
        ],
      },
    ],
    wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1'],
    why: 'By level means breadth-first: a whole row from left to right before going down to the next (with a queue).',
  },
  'pis-c13-create-node': {
    forms: [
      {
        ask: [
          'How does `btree_create_node` leave left and right?',
          'A node just created with btree_create_node, what does it have as children?',
        ],
        right: ['Both NULL: the node starts out as a leaf', 'No children: left and right are NULL'],
        wrong: [
          'Both pointing to the new node itself',
          'Untouched: malloc already sets them to 0',
          'left at NULL and right pointing to item',
          'Pointing to the root of the whole tree',
        ],
      },
    ],
    wrong: [
      'Both pointing to the new node itself',
      'Untouched: malloc already sets them to 0',
      'left at NULL and right pointing to item',
    ],
    why: 'btree_create_node allocates a t_btree, stores item and sets left and right to NULL: malloc does not do it by itself.',
  },
  'pis-c13-search': {
    forms: [
      {
        ask: [
          'What does btree_search_item return if it finds nothing?',
          'If no item matches data_ref, what does btree_search_item give?',
        ],
        right: ['NULL'],
        wrong: ['The root of the tree', 'The last node visited', 'The closest item'],
      },
      {
        ask: [
          'When does btree_search_item consider an item found?',
          'In btree_search_item, what tells you an item is the one sought?',
        ],
        right: ['When cmpf with data_ref returns 0', 'When cmpf gives 0 with data_ref'],
        wrong: [
          'When cmpf with data_ref returns 1',
          'When item and data_ref are the same pointer',
          'When cmpf gives a negative number',
        ],
      },
    ],
    wrong: ['The root of the tree', 'The last node visited', 'The closest item'],
    why: 'cmpf works like strcmp: 0 means equal. If there is none, NULL is returned.',
  },
}
