/** Repaso de Not-games: la piscina, C 08 a C 13. */

import type { ReviewEntry } from './types.js'

export const REVIEW_PISCINE_C08_C13: Record<string, ReviewEntry> = {
  'pis-c08-include-guard': {
    title: 'Guardas de inclusión',
    definition:
      'Un .h se puede acabar incluyendo dos veces (directa o indirectamente) y repetir definiciones. La guarda #ifndef NOMBRE / #define NOMBRE / #endif hace que la segunda vez se salte todo.',
    example: '#ifndef FT_H\n# define FT_H\nvoid ft_putchar(char c);\n#endif',
  },
  'pis-c08-header-content': {
    title: 'Qué va en un .h',
    definition:
      'La cabecera dice lo que existe: prototipos, macros, typedef y struct. El código de las funciones va en los .c. Los .h propios se incluyen con comillas; los del sistema, con < >.',
    example: '#include "ft.h" en tu main.c; #include <unistd.h> para write.',
  },
  'pis-c08-macro-parens': {
    title: 'Macros y paréntesis',
    definition:
      'El preprocesador sustituye texto, no valores: si la macro no lleva paréntesis, la prioridad de los operadores de alrededor se mezcla con la de dentro. Se protege cada argumento y la macro entera.',
    example: '#define DOUBLE(x) x + x → DOUBLE(3) * 2 = 3 + 3 * 2 = 9. Con ((x) + (x)) da 12.',
  },
  'pis-c08-abs-macro': {
    title: 'La macro ABS de ft_abs.h',
    definition:
      'ABS(Value) tiene que dar el valor absoluto de cualquier expresión. Si Value no va entre paréntesis, -Value niega solo el primer trozo de la expresión.',
    example: '#define ABS(Value) ((Value) < 0 ? -(Value) : (Value)) → ABS(2 - 5) = 3.',
  },
  'pis-c08-define-semicolon': {
    title: '#define sin punto y coma',
    definition:
      'Todo lo que va detrás del nombre de un #define se pega tal cual donde se usa, también un ; de más. Un #define no es una instrucción y no termina en ;.',
    example: '#define SIZE 10; → int tab[SIZE]; queda int tab[10;]; y no compila.',
  },
  'pis-c08-even-macro': {
    title: 'La macro EVEN de ft_boolean.h',
    definition:
      'EVEN(nbr) es una condición: verdadera si nbr es par (resto 0 al dividir entre 2). Como toda macro con argumento, nbr va entre paréntesis.',
    example: '#define EVEN(nbr) ((nbr) % 2 == 0) → EVEN(4) es 1, EVEN(7) es 0.',
  },
  'pis-c08-typedef-struct': {
    title: 'typedef y struct',
    definition:
      'typedef da un nombre nuevo a un tipo que ya existe, para no escribir struct cada vez. La norma de 42 pide s_ delante del nombre de la struct y t_ delante del typedef.',
    example: 'typedef struct s_point { int x; int y; } t_point; → t_point p;',
  },
  'pis-c08-arrow': {
    title: 'El punto y la flecha',
    definition:
      'Con una variable struct se llega a un campo con el punto; con un puntero a struct, con ->. ptr->x es lo mismo que (*ptr).x: el paréntesis hace falta porque el punto va antes que el *.',
    example: 't_point p; t_point *ptr = &p; p.x = 1; ptr->x = 2; (*ptr).x = 3;',
  },
  'pis-c08-stock-str': {
    title: 'ft_strs_to_tab y t_stock_str',
    definition:
      'ft_strs_to_tab convierte av en un array de struct s_stock_str: size (la longitud), str (la cadena de av) y copy (un duplicado con su malloc). El último elemento lleva str a 0 para marcar el final.',
    example: 'tab[0] = { 4, av[0], copia de av[0] } … tab[ac].str = 0;',
  },
  'pis-c09-ar-rc': {
    title: 'Bibliotecas estáticas con ar',
    definition:
      'Una biblioteca estática (.a) es un archivo con varios .o dentro. Se crea con ar: r mete o reemplaza los objetos y c crea el archivo sin quejarse si no existía.',
    example: 'cc -Wall -Wextra -Werror -c *.c && ar rc libft.a *.o',
  },
  'pis-c09-cc-c': {
    title: 'Compilar sin enlazar: -c',
    definition:
      'cc -c compila cada .c a su fichero objeto .o y para ahí, sin buscar main ni crear ejecutable. Los .o se juntan luego en una biblioteca o se enlazan en un programa.',
    example: 'cc -c ft_putchar.c → ft_putchar.o',
  },
  'pis-c09-link-lft': {
    title: 'Enlazar con -L y -l',
    definition:
      '-L carpeta añade dónde buscar bibliotecas y -lnombre busca libnombre.a (o .so). Por eso libft.a se pide con -lft, y si está en la carpeta actual, con -L. delante.',
    example: 'cc main.c -L. -lft -o prog',
  },
  'pis-c09-make-default': {
    title: 'La regla por defecto de make',
    definition:
      'Sin argumentos, make ejecuta la primera regla del Makefile (no busca all por su nombre). Por convenio se pone all la primera para que make y make all hagan lo mismo.',
    example: 'all: $(NAME) arriba del todo; make == make all.',
  },
  'pis-c09-clean-fclean': {
    title: 'clean, fclean y re',
    definition:
      'clean borra los ficheros objeto; fclean hace clean y además borra lo que se ha creado ($(NAME)); re hace fclean y luego all, para recompilar desde cero.',
    example: 'fclean: clean\n\trm -f $(NAME)\nre: fclean all',
  },
  'pis-c09-relink': {
    title: 'Un Makefile que no reenlaza',
    definition:
      'make solo rehace un objetivo si no existe o si alguna dependencia es más nueva. Si all no depende del fichero final, se ejecuta siempre y lo recompila todo aunque nada haya cambiado.',
    example: 'all: $(NAME)\n$(NAME): $(OBJS)\n\tar rc $(NAME) $(OBJS)',
  },
  'pis-c09-make-vars': {
    title: 'Variables en un Makefile',
    definition:
      'Una variable se define con NOMBRE = valor y se usa con $(NOMBRE). Sin paréntesis, make solo toma una letra: $NAME es $(N) seguido de AME.',
    example: 'NAME = libft.a → ar rc $(NAME) *.o',
  },
  'pis-c09-include-flag': {
    title: 'Cabeceras en otra carpeta: -I',
    definition:
      '-I carpeta añade una carpeta a las que el compilador mira para encontrar los .h de #include. No tiene nada que ver con los .c ni con las bibliotecas (eso es -L).',
    example: 'cc -Wall -Wextra -Werror -I includes -c srcs/ft_putchar.c',
  },
  'pis-c09-split': {
    title: 'ft_split con charset',
    definition:
      'ft_split corta str en palabras usando como separador cualquier carácter de charset. Varios separadores seguidos no crean palabras vacías y el array termina con un puntero a 0.',
    example: 'ft_split("  hola,,42 ", " ,") → {"hola", "42", 0}',
  },
  'pis-c10-display-file-errors': {
    title: 'Los errores de display_file',
    definition:
      'ft_display_file muestra un fichero y tiene tres mensajes de error, que van a la salida de error: sin fichero, File name missing.; con más de uno, Too many arguments.; si no se puede leer, Cannot read file.',
    example: './ft_display_file → File name missing.',
  },
  'pis-c10-stderr': {
    title: 'Salida estándar y salida de error',
    definition:
      'El fd 1 es la salida normal y el 2 la de error. Si alguien redirige con >, solo se va el fd 1: los errores siguen viéndose en la terminal y no ensucian el resultado.',
    example: './ft_cat noexiste > out.txt → el error sale en pantalla y out.txt queda vacío.',
  },
  'pis-c10-open-fail': {
    title: 'Comprobar open',
    definition:
      'open devuelve un descriptor nuevo (el número libre más bajo, normalmente 3 o más) o -1 si no ha podido abrir. Se declara en <fcntl.h>, donde también está O_RDONLY.',
    example: 'fd = open(argv[1], O_RDONLY); if (fd < 0) → Cannot read file.',
  },
  'pis-c10-read-loop': {
    title: 'Escribir lo que read ha leído',
    definition:
      'read devuelve cuántos bytes ha leído, que pueden ser menos de los pedidos. Hay que escribir solo esos; buf no acaba en \\0, así que tampoco vale medirlo con strlen.',
    example: 'while ((n = read(fd, buf, 4096)) > 0) write(1, buf, n);',
  },
  'pis-c10-cat-stdin': {
    title: 'ft_cat, stdin y strerror',
    definition:
      'Como cat, ft_cat sin ficheros lee la entrada estándar (fd 0). Cuando una llamada falla, errno guarda el motivo y strerror(errno) lo da como texto para el mensaje de error.',
    example: 'echo hola | ./ft_cat → hola. strerror(ENOENT) → No such file or directory',
  },
  'pis-c10-tail-c': {
    title: 'ft_tail -c',
    definition:
      'tail -c N enseña los N últimos bytes de cada fichero (bytes, no líneas). Hay que leer el fichero entero o saber su tamaño para saber dónde empiezan esos N bytes.',
    example: 'printf "abcdefgh" > f; ./ft_tail -c 3 f → fgh',
  },
  'pis-c10-hexdump': {
    title: 'hexdump -C',
    definition:
      'hexdump -C enseña por cada línea el desplazamiento en hexadecimal, 16 bytes en hexadecimal y, entre | |, esos bytes como texto (un punto si no se pueden imprimir).',
    example: "00000000  41 42 0a  |AB.| → 'A' es 0x41, el salto de línea 0x0a.",
  },
  'pis-c10-basename': {
    title: 'El nombre del programa en los errores',
    definition:
      'Los errores de cat empiezan con el nombre del programa. argv[0] trae la ruta con la que se lanzó; basename se queda solo con la última parte.',
    example: 'basename("./ft_cat") da ft_cat → ft_cat: noexiste: No such file or directory',
  },
  'pis-c10-close': {
    title: 'Cerrar los descriptores',
    definition:
      'Cada fichero abierto ocupa un descriptor del proceso, y hay un máximo. close lo devuelve al sistema; si no se cierra, un programa que abre muchos ficheros acaba sin poder abrir más.',
    example: 'fd = open(f, O_RDONLY); … close(fd);',
  },
  'pis-c11-fptr-syntax': {
    title: 'Declarar un puntero a función',
    definition:
      'Un puntero a función se declara como la función, con (*nombre) en lugar del nombre. Sin paréntesis, el * se une al tipo de vuelta y se declara una función que devuelve un puntero.',
    example: 'int (*f)(int) apunta a una función; int *f(int) es una función que devuelve int *.',
  },
  'pis-c11-foreach': {
    title: 'ft_foreach',
    definition:
      'ft_foreach(tab, length, f) llama a f con cada elemento de tab, en orden. No devuelve nada: lo que se hace depende de la función que se pasa.',
    example: 'ft_foreach(tab, 3, &ft_putnbr) con {4, 2, 1} escribe 421.',
  },
  'pis-c11-map': {
    title: 'ft_map',
    definition:
      'ft_map(tab, length, f) devuelve un array nuevo de length int donde cada casilla es f(tab[i]). tab no cambia, y el array nuevo se reserva con malloc porque tiene que sobrevivir a la función.',
    example: 'ft_map({1, 2, 3}, 3, &doble) → {2, 4, 6}',
  },
  'pis-c11-count-if': {
    title: 'ft_count_if',
    definition:
      'ft_count_if recorre un array de cadenas y cuenta cuántas hacen que f devuelva algo distinto de 0.',
    example: 'Con f = «más de 3 letras» y {"42", "piscina", "C", "norma"} → 2',
  },
  'pis-c11-any': {
    title: 'ft_any',
    definition:
      'ft_any(tab, f) devuelve 1 si f da algo distinto de 0 con al menos una cadena de tab y 0 si no. No recibe el tamaño: tab termina con un puntero a 0.',
    example: 'ft_any({"a", "", 0}, &es_vacia) → 1',
  },
  'pis-c11-is-sort': {
    title: 'ft_is_sort y la función de comparación',
    definition:
      'La función de comparación sigue el convenio de strcmp: negativo si el primero es menor, 0 si son iguales y positivo si es mayor. ft_is_sort la usa para ver si cada par seguido está en orden.',
    example: 'cmp(a, b) = a - b; {1, 3, 3, 7} está ordenado → 1',
  },
  'pis-c11-do-op': {
    title: 'do-op',
    definition:
      'do-op recibe número, operador y número, y escribe el resultado. Entre 0 da Stop : division by zero o Stop : modulo by zero; con un operador que no sea + - * / %, escribe 0.',
    example: './do-op 42 / 0 → Stop : division by zero; ./do-op 6 x 7 → 0',
  },
  'pis-c11-fptr-array': {
    title: 'Arrays de punteros a función',
    definition:
      'Un array de punteros a función guarda varias funciones con el mismo prototipo, y se llama a una con su índice. Es como do-op elige la operación sin una cadena de if.',
    example: 'int (*ops[2])(int, int) = {&ft_add, &ft_sub}; ops[1](10, 4) → 6',
  },
  'pis-c11-advanced-sort': {
    title: 'ft_advanced_sort_string_tab',
    definition:
      'Ordena un array de cadenas como ft_sort_string_tab, pero el criterio lo da la función cmp que recibe. Con ft_strcmp sale el orden ASCII; con otra, otro orden.',
    example: 'ft_advanced_sort_string_tab(tab, &ft_strcmp) == ft_sort_string_tab(tab)',
  },
  'pis-c12-create-elem': {
    title: 'ft_create_elem',
    definition:
      'Crea un eslabón t_list: reserva memoria, comprueba que malloc no ha devuelto NULL, guarda data y pone next a NULL. malloc no inicializa nada: sin ese NULL, next tiene basura.',
    example:
      'elem = malloc(sizeof(t_list)); if (!elem) return (NULL); elem->data = data; elem->next = NULL;',
  },
  'pis-c12-push-front': {
    title: 'push_front y push_back',
    definition:
      'ft_list_push_front mete el nuevo elemento delante (cambia la cabeza, por eso recibe t_list **); ft_list_push_back lo pone al final. Con push_front, el último que entra queda el primero.',
    example: 'push_front de C, B y A → A -> B -> C; push_back → C -> B -> A',
  },
  'pis-c12-list-size': {
    title: 'Contar los elementos de una lista',
    definition:
      'Se avanza mientras el puntero actual no sea NULL, contando uno por vuelta. Si se mira ->next, el último no se cuenta y con la lista vacía se lee de NULL.',
    example: 'while (begin_list) { i++; begin_list = begin_list->next; }',
  },
  'pis-c12-list-last': {
    title: 'ft_list_last',
    definition:
      'Devuelve el último elemento: el que tiene next a NULL. Se avanza mientras haya siguiente; si la lista está vacía, se devuelve NULL.',
    example: 'while (begin_list && begin_list->next) begin_list = begin_list->next;',
  },
  'pis-c12-list-clear': {
    title: 'Liberar una lista',
    definition:
      'Para liberar cada elemento hay que guardar su next antes del free: después, esa memoria ya no es tuya. free_fct libera el data y free, el eslabón.',
    example:
      'next = begin_list->next; free_fct(begin_list->data); free(begin_list); begin_list = next;',
  },
  'pis-c12-list-at': {
    title: 'ft_list_at',
    definition:
      'ft_list_at(begin_list, nbr) devuelve el elemento en la posición nbr, contando desde 0. Si la lista se acaba antes, devuelve NULL.',
    example: 'A -> B -> C -> D: ft_list_at(list, 2) → C; ft_list_at(list, 4) → NULL',
  },
  'pis-c12-reverse': {
    title: 'Dar la vuelta a una lista',
    definition:
      'ft_list_reverse gira las flechas una a una con tres punteros: prev, cur y next. next guarda el resto antes de girar cur->next; al final, prev es la nueva cabeza.',
    example: 'A -> B -> C pasa a C -> B -> A, y *begin_list apunta a C.',
  },
  'pis-c12-foreach': {
    title: 'ft_list_foreach',
    definition:
      'Recorre la lista y llama a f con el data de cada elemento, en orden. f no recibe el eslabón ni puede tocar los next.',
    example: 'ft_list_foreach(list, &ft_putstr) escribe todos los data seguidos.',
  },
  'pis-c12-remove-if': {
    title: 'ft_list_remove_if',
    definition:
      'Quita y libera cada elemento cuyo data da 0 al compararlo con data_ref usando cmp (como strcmp). Si el que se quita es la cabeza, hay que cambiar *begin_list.',
    example: 'Lista a -> b -> a, data_ref "a" con ft_strcmp → queda b.',
  },
  'pis-c12-sorted-insert': {
    title: 'Insertar en una lista ordenada',
    definition:
      'ft_sorted_list_insert recorre la lista hasta el primer elemento que va después del nuevo según cmp, y lo mete justo delante. Así la lista sigue ordenada sin volver a ordenarla.',
    example: '1 -> 3 -> 8 e insertar 5 → 1 -> 3 -> 5 -> 8',
  },
  'pis-c13-prefix': {
    title: 'Recorrido prefijo',
    definition:
      'btree_apply_prefix trata primero la raíz, luego todo el subárbol izquierdo y luego todo el derecho, y repite eso en cada nodo.',
    example: 'Raíz 8 con hijos 3 (1, 6) y 10 (-, 14) → 8 3 1 6 10 14',
  },
  'pis-c13-infix': {
    title: 'Recorrido infijo',
    definition:
      'btree_apply_infix trata el subárbol izquierdo, luego la raíz y luego el derecho. En un árbol de búsqueda, eso da los items ordenados de menor a mayor.',
    example: 'Raíz D con B (A, C) y F (-, G) → A B C D F G',
  },
  'pis-c13-suffix': {
    title: 'Recorrido sufijo',
    definition:
      'btree_apply_suffix trata el subárbol izquierdo, luego el derecho y la raíz al final. Como los hijos van antes que su padre, sirve para liberar un árbol.',
    example: 'Raíz + con * (2, 3) y 5 → 2 3 * 5 +',
  },
  'pis-c13-insert': {
    title: 'Insertar en un árbol de búsqueda',
    definition:
      'btree_insert_data baja desde la raíz comparando con cmpf: a la izquierda si el nuevo es menor y a la derecha si es igual o mayor, hasta un hueco libre. El primero que entra es la raíz.',
    example: '5, 3, 8, 4 → raíz 5; 3 a su izquierda, 8 a su derecha y 4 a la derecha del 3.',
  },
  'pis-c13-level-count': {
    title: 'btree_level_count',
    definition:
      'Devuelve la altura del árbol: cuántos nodos tiene la rama más larga. Es 0 para un árbol vacío y 1 + el mayor de los dos hijos para cualquier nodo.',
    example: 'a con b y c, c -> d -> e por la derecha → 4',
  },
  'pis-c13-by-level': {
    title: 'Recorrido por niveles',
    definition:
      'btree_apply_by_level visita el árbol en anchura: toda la fila de la raíz, luego la siguiente, de izquierda a derecha. Pasa a applyf el item, su nivel y si es el primero de ese nivel.',
    example: 'Raíz 1, hijos 2 y 3, nietos 4, 5 y 6 → 1 2 3 4 5 6',
  },
  'pis-c13-create-node': {
    title: 'btree_create_node',
    definition:
      'Reserva un t_btree, guarda item y deja left y right a NULL: un nodo nuevo es una hoja. malloc no pone nada a 0, así que hay que hacerlo a mano.',
    example: 'node->item = item; node->left = NULL; node->right = NULL;',
  },
  'pis-c13-search': {
    title: 'btree_search_item',
    definition:
      'Busca en el árbol un item que dé 0 al compararlo con data_ref usando cmpf (0 quiere decir igual, como en strcmp). Si ninguno lo da, devuelve NULL.',
    example: 'btree_search_item(root, "42", &ft_strcmp) → el item "42", o NULL',
  },
}
