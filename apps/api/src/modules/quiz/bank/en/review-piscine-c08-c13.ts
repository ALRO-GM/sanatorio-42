/** Repaso de Not-games en inglés: traducción de `../review-piscine-c08-c13.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C08_C13_EN: Readonly<Record<string, ReviewEntry>> = {
  'pis-c08-include-guard': {
    title: 'Include guards',
    definition:
      'A .h can end up included twice (directly or indirectly) and repeat definitions. The guard #ifndef NAME / #define NAME / #endif makes the second inclusion skip everything.',
    example: '#ifndef FT_H\n# define FT_H\nvoid ft_putchar(char c);\n#endif',
  },
  'pis-c08-header-content': {
    title: 'What goes in a .h',
    definition:
      'The header says what exists: prototypes, macros, typedefs and structs. The function code goes in the .c files. Your own .h files are included with quotes; system ones, with < >.',
    example: '#include "ft.h" in your main.c; #include <unistd.h> for write.',
  },
  'pis-c08-macro-parens': {
    title: 'Macros and parentheses',
    definition:
      'The preprocessor replaces text, not values: without parentheses, the precedence of the surrounding operators mixes with the one inside. Protect every argument and the whole macro.',
    example:
      '#define DOUBLE(x) x + x → DOUBLE(3) * 2 = 3 + 3 * 2 = 9. With ((x) + (x)) it gives 12.',
  },
  'pis-c08-abs-macro': {
    title: 'The ABS macro in ft_abs.h',
    definition:
      'ABS(Value) has to give the absolute value of any expression. If Value is not in parentheses, -Value only negates the first piece of the expression.',
    example: '#define ABS(Value) ((Value) < 0 ? -(Value) : (Value)) → ABS(2 - 5) = 3.',
  },
  'pis-c08-define-semicolon': {
    title: '#define without a semicolon',
    definition:
      'Everything after the name of a #define is pasted as is wherever it is used, including an extra ;. A #define is not a statement and does not end with ;.',
    example: '#define SIZE 10; → int tab[SIZE]; becomes int tab[10;]; and does not compile.',
  },
  'pis-c08-even-macro': {
    title: 'The EVEN macro in ft_boolean.h',
    definition:
      'EVEN(nbr) is a condition: true if nbr is even (remainder 0 when divided by 2). Like any macro with an argument, nbr goes in parentheses.',
    example: '#define EVEN(nbr) ((nbr) % 2 == 0) → EVEN(4) is 1, EVEN(7) is 0.',
  },
  'pis-c08-typedef-struct': {
    title: 'typedef and struct',
    definition:
      'typedef gives a new name to an existing type, so you do not have to write struct every time. The 42 Norm wants s_ in front of a struct name and t_ in front of a typedef.',
    example: 'typedef struct s_point { int x; int y; } t_point; → t_point p;',
  },
  'pis-c08-arrow': {
    title: 'The dot and the arrow',
    definition:
      'With a struct variable you reach a field with the dot; with a pointer to a struct, with ->. ptr->x is the same as (*ptr).x: the parentheses are needed because the dot binds before the *.',
    example: 't_point p; t_point *ptr = &p; p.x = 1; ptr->x = 2; (*ptr).x = 3;',
  },
  'pis-c08-stock-str': {
    title: 'ft_strs_to_tab and t_stock_str',
    definition:
      'ft_strs_to_tab turns av into an array of struct s_stock_str: size (the length), str (the string from av) and copy (a duplicate with its own malloc). The last element has str set to 0 to mark the end.',
    example: 'tab[0] = { 4, av[0], copy of av[0] } … tab[ac].str = 0;',
  },
  'pis-c09-ar-rc': {
    title: 'Static libraries with ar',
    definition:
      'A static library (.a) is an archive holding several .o files. It is created with ar: r inserts or replaces the objects and c creates the archive without complaining if it did not exist.',
    example: 'cc -Wall -Wextra -Werror -c *.c && ar rc libft.a *.o',
  },
  'pis-c09-cc-c': {
    title: 'Compiling without linking: -c',
    definition:
      'cc -c compiles each .c into its .o object file and stops there, without looking for main or making an executable. The .o files are later bundled into a library or linked into a program.',
    example: 'cc -c ft_putchar.c → ft_putchar.o',
  },
  'pis-c09-link-lft': {
    title: 'Linking with -L and -l',
    definition:
      '-L folder adds a place to look for libraries and -lname looks for libname.a (or .so). That is why libft.a is requested with -lft, and if it is in the current folder, with -L. in front.',
    example: 'cc main.c -L. -lft -o prog',
  },
  'pis-c09-make-default': {
    title: 'The default rule of make',
    definition:
      'With no arguments, make runs the first rule in the Makefile (it does not look for all by name). By convention all goes first so that make and make all do the same thing.',
    example: 'all: $(NAME) at the very top; make == make all.',
  },
  'pis-c09-clean-fclean': {
    title: 'clean, fclean and re',
    definition:
      'clean deletes the object files; fclean does clean and also deletes what was built ($(NAME)); re does fclean and then all, to recompile from scratch.',
    example: 'fclean: clean\n\trm -f $(NAME)\nre: fclean all',
  },
  'pis-c09-relink': {
    title: 'A Makefile that does not relink',
    definition:
      'make only rebuilds a target if it does not exist or if a dependency is newer. If all does not depend on the final file, it always runs and recompiles everything even when nothing changed.',
    example: 'all: $(NAME)\n$(NAME): $(OBJS)\n\tar rc $(NAME) $(OBJS)',
  },
  'pis-c09-make-vars': {
    title: 'Variables in a Makefile',
    definition:
      'A variable is defined with NAME = value and used with $(NAME). Without parentheses, make only takes one letter: $NAME is $(N) followed by AME.',
    example: 'NAME = libft.a → ar rc $(NAME) *.o',
  },
  'pis-c09-include-flag': {
    title: 'Headers in another folder: -I',
    definition:
      '-I folder adds a folder to those the compiler searches for the .h files in #include. It has nothing to do with .c files or with libraries (that is -L).',
    example: 'cc -Wall -Wextra -Werror -I includes -c srcs/ft_putchar.c',
  },
  'pis-c09-split': {
    title: 'ft_split with a charset',
    definition:
      'ft_split cuts str into words using any character of charset as a separator. Several separators in a row do not create empty words, and the array ends with a pointer set to 0.',
    example: 'ft_split("  hola,,42 ", " ,") → {"hola", "42", 0}',
  },
  'pis-c10-display-file-errors': {
    title: 'The errors of display_file',
    definition:
      'ft_display_file shows a file and has three error messages, which go to standard error: no file, File name missing.; more than one, Too many arguments.; if it cannot be read, Cannot read file.',
    example: './ft_display_file → File name missing.',
  },
  'pis-c10-stderr': {
    title: 'Standard output and standard error',
    definition:
      'fd 1 is the normal output and fd 2 the error one. If someone redirects with >, only fd 1 moves: errors still show in the terminal and do not pollute the result.',
    example: './ft_cat nonexistent > out.txt → the error shows on screen and out.txt stays empty.',
  },
  'pis-c10-open-fail': {
    title: 'Checking open',
    definition:
      'open returns a new descriptor (the lowest free number, usually 3 or more) or -1 if it could not open the file. It is declared in <fcntl.h>, where O_RDONLY also lives.',
    example: 'fd = open(argv[1], O_RDONLY); if (fd < 0) → Cannot read file.',
  },
  'pis-c10-read-loop': {
    title: 'Writing what read has read',
    definition:
      'read returns how many bytes it read, which may be fewer than requested. Only those should be written; buf does not end in \\0, so measuring it with strlen does not work either.',
    example: 'while ((n = read(fd, buf, 4096)) > 0) write(1, buf, n);',
  },
  'pis-c10-cat-stdin': {
    title: 'ft_cat, stdin and strerror',
    definition:
      'Like cat, ft_cat with no files reads standard input (fd 0). When a call fails, errno holds the reason and strerror(errno) gives it as text for the error message.',
    example: 'echo hello | ./ft_cat → hello. strerror(ENOENT) → No such file or directory',
  },
  'pis-c10-tail-c': {
    title: 'ft_tail -c',
    definition:
      'tail -c N shows the last N bytes of each file (bytes, not lines). You have to read the whole file or know its size to find where those N bytes start.',
    example: 'printf "abcdefgh" > f; ./ft_tail -c 3 f → fgh',
  },
  'pis-c10-hexdump': {
    title: 'hexdump -C',
    definition:
      'hexdump -C shows on each line the offset in hexadecimal, 16 bytes in hexadecimal and, between | |, those bytes as text (a dot if they cannot be printed).',
    example: "00000000  41 42 0a  |AB.| → 'A' is 0x41, the newline 0x0a.",
  },
  'pis-c10-basename': {
    title: 'The program name in errors',
    definition:
      'cat errors start with the program name. argv[0] holds the path the program was run with; basename keeps only the last part.',
    example: 'basename("./ft_cat") gives ft_cat → ft_cat: nonexistent: No such file or directory',
  },
  'pis-c10-close': {
    title: 'Closing descriptors',
    definition:
      'Each open file takes one of the process descriptors, and there is a maximum. close gives it back to the system; if you never close, a program that opens many files ends up unable to open more.',
    example: 'fd = open(f, O_RDONLY); … close(fd);',
  },
  'pis-c11-fptr-syntax': {
    title: 'Declaring a function pointer',
    definition:
      'A function pointer is declared like the function, with (*name) instead of the name. Without parentheses, the * joins the return type and you declare a function that returns a pointer.',
    example: 'int (*f)(int) points to a function; int *f(int) is a function returning int *.',
  },
  'pis-c11-foreach': {
    title: 'ft_foreach',
    definition:
      'ft_foreach(tab, length, f) calls f with each element of tab, in order. It returns nothing: what happens depends on the function you pass.',
    example: 'ft_foreach(tab, 3, &ft_putnbr) with {4, 2, 1} writes 421.',
  },
  'pis-c11-map': {
    title: 'ft_map',
    definition:
      'ft_map(tab, length, f) returns a new array of length int where each slot is f(tab[i]). tab does not change, and the new array is allocated with malloc because it has to outlive the function.',
    example: 'ft_map({1, 2, 3}, 3, &twice) → {2, 4, 6}',
  },
  'pis-c11-count-if': {
    title: 'ft_count_if',
    definition:
      'ft_count_if walks an array of strings and counts how many make f return something other than 0.',
    example: 'With f = «more than 3 letters» and {"42", "piscina", "C", "norma"} → 2',
  },
  'pis-c11-any': {
    title: 'ft_any',
    definition:
      'ft_any(tab, f) returns 1 if f gives something other than 0 for at least one string of tab, and 0 otherwise. It gets no size: tab ends with a pointer set to 0.',
    example: 'ft_any({"a", "", 0}, &is_empty) → 1',
  },
  'pis-c11-is-sort': {
    title: 'ft_is_sort and the comparison function',
    definition:
      'The comparison function follows the strcmp convention: negative if the first is smaller, 0 if they are equal and positive if it is larger. ft_is_sort uses it to check that each consecutive pair is in order.',
    example: 'cmp(a, b) = a - b; {1, 3, 3, 7} is sorted → 1',
  },
  'pis-c11-do-op': {
    title: 'do-op',
    definition:
      'do-op takes number, operator and number, and writes the result. Dividing by 0 gives Stop : division by zero or Stop : modulo by zero; with an operator other than + - * / %, it writes 0.',
    example: './do-op 42 / 0 → Stop : division by zero; ./do-op 6 x 7 → 0',
  },
  'pis-c11-fptr-array': {
    title: 'Arrays of function pointers',
    definition:
      'An array of function pointers holds several functions with the same prototype, and you call one by its index. That is how do-op picks the operation without a chain of ifs.',
    example: 'int (*ops[2])(int, int) = {&ft_add, &ft_sub}; ops[1](10, 4) → 6',
  },
  'pis-c11-advanced-sort': {
    title: 'ft_advanced_sort_string_tab',
    definition:
      'It sorts an array of strings like ft_sort_string_tab, but the order comes from the cmp function it receives. With ft_strcmp you get ASCII order; with another one, another order.',
    example: 'ft_advanced_sort_string_tab(tab, &ft_strcmp) == ft_sort_string_tab(tab)',
  },
  'pis-c12-create-elem': {
    title: 'ft_create_elem',
    definition:
      'It creates a t_list link: allocates memory, checks that malloc did not return NULL, stores data and sets next to NULL. malloc initialises nothing: without that NULL, next holds garbage.',
    example:
      'elem = malloc(sizeof(t_list)); if (!elem) return (NULL); elem->data = data; elem->next = NULL;',
  },
  'pis-c12-push-front': {
    title: 'push_front and push_back',
    definition:
      'ft_list_push_front puts the new element in front (it changes the head, which is why it takes t_list **); ft_list_push_back puts it at the end. With push_front, the last one in ends up first.',
    example: 'push_front of C, B and A → A -> B -> C; push_back → C -> B -> A',
  },
  'pis-c12-list-size': {
    title: 'Counting the elements of a list',
    definition:
      'You move on while the current pointer is not NULL, counting one per turn. If you check ->next, the last one is not counted and an empty list reads from NULL.',
    example: 'while (begin_list) { i++; begin_list = begin_list->next; }',
  },
  'pis-c12-list-last': {
    title: 'ft_list_last',
    definition:
      'It returns the last element: the one whose next is NULL. You move on while there is a next one; if the list is empty, it returns NULL.',
    example: 'while (begin_list && begin_list->next) begin_list = begin_list->next;',
  },
  'pis-c12-list-clear': {
    title: 'Freeing a list',
    definition:
      'To free each element you have to save its next before the free: afterwards, that memory is no longer yours. free_fct frees the data and free, the link.',
    example:
      'next = begin_list->next; free_fct(begin_list->data); free(begin_list); begin_list = next;',
  },
  'pis-c12-list-at': {
    title: 'ft_list_at',
    definition:
      'ft_list_at(begin_list, nbr) returns the element at position nbr, counting from 0. If the list ends first, it returns NULL.',
    example: 'A -> B -> C -> D: ft_list_at(list, 2) → C; ft_list_at(list, 4) → NULL',
  },
  'pis-c12-reverse': {
    title: 'Reversing a list',
    definition:
      'ft_list_reverse flips the arrows one by one with three pointers: prev, cur and next. next saves the rest before flipping cur->next; at the end, prev is the new head.',
    example: 'A -> B -> C becomes C -> B -> A, and *begin_list points to C.',
  },
  'pis-c12-foreach': {
    title: 'ft_list_foreach',
    definition:
      'It walks the list and calls f with the data of each element, in order. f does not get the link and cannot touch the next pointers.',
    example: 'ft_list_foreach(list, &ft_putstr) writes all the data one after another.',
  },
  'pis-c12-remove-if': {
    title: 'ft_list_remove_if',
    definition:
      'It removes and frees every element whose data gives 0 when compared with data_ref using cmp (like strcmp). If the one removed is the head, *begin_list has to change.',
    example: 'List a -> b -> a, data_ref "a" with ft_strcmp → b is left.',
  },
  'pis-c12-sorted-insert': {
    title: 'Inserting into a sorted list',
    definition:
      'ft_sorted_list_insert walks the list to the first element that goes after the new one according to cmp, and puts it right in front. The list stays sorted without sorting it again.',
    example: '1 -> 3 -> 8 and insert 5 → 1 -> 3 -> 5 -> 8',
  },
  'pis-c13-prefix': {
    title: 'Prefix traversal',
    definition:
      'btree_apply_prefix handles the root first, then the whole left subtree and then the whole right one, and repeats that at every node.',
    example: 'Root 8 with children 3 (1, 6) and 10 (-, 14) → 8 3 1 6 10 14',
  },
  'pis-c13-infix': {
    title: 'Infix traversal',
    definition:
      'btree_apply_infix handles the left subtree, then the root and then the right one. In a search tree, that gives the items sorted from smallest to largest.',
    example: 'Root D with B (A, C) and F (-, G) → A B C D F G',
  },
  'pis-c13-suffix': {
    title: 'Suffix traversal',
    definition:
      'btree_apply_suffix handles the left subtree, then the right one and the root last. Since children come before their parent, it is the one for freeing a tree.',
    example: 'Root + with * (2, 3) and 5 → 2 3 * 5 +',
  },
  'pis-c13-insert': {
    title: 'Inserting into a search tree',
    definition:
      'btree_insert_data goes down from the root comparing with cmpf: left if the new one is smaller and right if it is equal or larger, until a free spot. The first one in is the root.',
    example: '5, 3, 8, 4 → root 5; 3 on its left, 8 on its right and 4 to the right of 3.',
  },
  'pis-c13-level-count': {
    title: 'btree_level_count',
    definition:
      'It returns the height of the tree: how many nodes the longest branch has. It is 0 for an empty tree and 1 + the larger of the two children for any node.',
    example: 'a with b and c, c -> d -> e on the right → 4',
  },
  'pis-c13-by-level': {
    title: 'Level-order traversal',
    definition:
      'btree_apply_by_level visits the tree breadth-first: the whole row of the root, then the next, left to right. It passes applyf the item, its level and whether it is the first of that level.',
    example: 'Root 1, children 2 and 3, grandchildren 4, 5 and 6 → 1 2 3 4 5 6',
  },
  'pis-c13-create-node': {
    title: 'btree_create_node',
    definition:
      'It allocates a t_btree, stores item and leaves left and right at NULL: a new node is a leaf. malloc does not zero anything, so you have to do it by hand.',
    example: 'node->item = item; node->left = NULL; node->right = NULL;',
  },
  'pis-c13-search': {
    title: 'btree_search_item',
    definition:
      'It searches the tree for an item that gives 0 when compared with data_ref using cmpf (0 means equal, as in strcmp). If none does, it returns NULL.',
    example: 'btree_search_item(root, "42", &ft_strcmp) → the item "42", or NULL',
  },
}
