/** Repaso de Not-games en francés: traducción de `../review-piscine-c08-c13.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C08_C13_FR: Readonly<Record<string, ReviewEntry>> = {
  'pis-c08-include-guard': {
    title: "Gardes d'inclusion",
    definition:
      'Un .h peut finir inclus deux fois (directement ou non) et répéter des définitions. La garde #ifndef NOM / #define NOM / #endif fait sauter tout le contenu la deuxième fois.',
    example: '#ifndef FT_H\n# define FT_H\nvoid ft_putchar(char c);\n#endif',
  },
  'pis-c08-header-content': {
    title: "Ce qu'on met dans un .h",
    definition:
      "Le header dit ce qui existe : prototypes, macros, typedef et struct. Le code des fonctions va dans les .c. Tes propres .h s'incluent avec des guillemets ; ceux du système, avec < >.",
    example: '#include "ft.h" dans ton main.c ; #include <unistd.h> pour write.',
  },
  'pis-c08-macro-parens': {
    title: 'Macros et parenthèses',
    definition:
      "Le préprocesseur remplace du texte, pas des valeurs : sans parenthèses, la priorité des opérateurs autour se mélange avec celle de l'intérieur. On protège chaque argument et la macro entière.",
    example:
      '#define DOUBLE(x) x + x → DOUBLE(3) * 2 = 3 + 3 * 2 = 9. Avec ((x) + (x)), ça donne 12.',
  },
  'pis-c08-abs-macro': {
    title: 'La macro ABS de ft_abs.h',
    definition:
      "ABS(Value) doit donner la valeur absolue de n'importe quelle expression. Si Value n'est pas entre parenthèses, -Value ne change le signe que du premier morceau.",
    example: '#define ABS(Value) ((Value) < 0 ? -(Value) : (Value)) → ABS(2 - 5) = 3.',
  },
  'pis-c08-define-semicolon': {
    title: '#define sans point-virgule',
    definition:
      "Tout ce qui suit le nom d'un #define est recopié tel quel là où on l'utilise, y compris un ; en trop. Un #define n'est pas une instruction et ne se termine pas par ;.",
    example: '#define SIZE 10; → int tab[SIZE]; devient int tab[10;]; et ne compile pas.',
  },
  'pis-c08-even-macro': {
    title: 'La macro EVEN de ft_boolean.h',
    definition:
      'EVEN(nbr) est une condition : vraie si nbr est pair (reste 0 en divisant par 2). Comme toute macro avec argument, nbr se met entre parenthèses.',
    example: '#define EVEN(nbr) ((nbr) % 2 == 0) → EVEN(4) vaut 1, EVEN(7) vaut 0.',
  },
  'pis-c08-typedef-struct': {
    title: 'typedef et struct',
    definition:
      "typedef donne un nouveau nom à un type existant, pour ne pas écrire struct à chaque fois. La norme de 42 veut s_ devant le nom d'une struct et t_ devant un typedef.",
    example: 'typedef struct s_point { int x; int y; } t_point; → t_point p;',
  },
  'pis-c08-arrow': {
    title: 'Le point et la flèche',
    definition:
      "Avec une variable struct, on atteint un champ avec le point ; avec un pointeur sur struct, avec ->. ptr->x revient à (*ptr).x : les parenthèses sont nécessaires car le point passe avant l'*.",
    example: 't_point p; t_point *ptr = &p; p.x = 1; ptr->x = 2; (*ptr).x = 3;',
  },
  'pis-c08-stock-str': {
    title: 'ft_strs_to_tab et t_stock_str',
    definition:
      "ft_strs_to_tab transforme av en tableau de struct s_stock_str : size (la longueur), str (la chaîne d'av) et copy (un double avec son malloc). Le dernier élément a str à 0 pour marquer la fin.",
    example: 'tab[0] = { 4, av[0], copie de av[0] } … tab[ac].str = 0;',
  },
  'pis-c09-ar-rc': {
    title: 'Bibliothèques statiques avec ar',
    definition:
      "Une bibliothèque statique (.a) est une archive qui contient plusieurs .o. On la crée avec ar : r ajoute ou remplace les objets et c crée l'archive sans se plaindre si elle n'existait pas.",
    example: 'cc -Wall -Wextra -Werror -c *.c && ar rc libft.a *.o',
  },
  'pis-c09-cc-c': {
    title: 'Compiler sans lier : -c',
    definition:
      "cc -c compile chaque .c en fichier objet .o et s'arrête là, sans chercher de main ni créer d'exécutable. Les .o sont ensuite réunis dans une bibliothèque ou liés dans un programme.",
    example: 'cc -c ft_putchar.c → ft_putchar.o',
  },
  'pis-c09-link-lft': {
    title: 'Lier avec -L et -l',
    definition:
      "-L dossier ajoute un endroit où chercher les bibliothèques et -lnom cherche libnom.a (ou .so). C'est pour ça que libft.a se demande avec -lft, et avec -L. devant si elle est dans le dossier courant.",
    example: 'cc main.c -L. -lft -o prog',
  },
  'pis-c09-make-default': {
    title: 'La règle par défaut de make',
    definition:
      'Sans argument, make exécute la première règle du Makefile (il ne cherche pas all par son nom). Par convention, all est placée en premier pour que make et make all fassent la même chose.',
    example: 'all: $(NAME) tout en haut ; make == make all.',
  },
  'pis-c09-clean-fclean': {
    title: 'clean, fclean et re',
    definition:
      'clean supprime les fichiers objets ; fclean fait clean et supprime aussi ce qui a été construit ($(NAME)) ; re fait fclean puis all, pour tout recompiler depuis zéro.',
    example: 'fclean: clean\n\trm -f $(NAME)\nre: fclean all',
  },
  'pis-c09-relink': {
    title: 'Un Makefile qui ne relie pas',
    definition:
      "make ne refait une cible que si elle n'existe pas ou si une dépendance est plus récente. Si all ne dépend pas du fichier final, elle s'exécute toujours et recompile tout même sans changement.",
    example: 'all: $(NAME)\n$(NAME): $(OBJS)\n\tar rc $(NAME) $(OBJS)',
  },
  'pis-c09-make-vars': {
    title: 'Variables dans un Makefile',
    definition:
      "Une variable se définit avec NOM = valeur et s'utilise avec $(NOM). Sans parenthèses, make ne prend qu'une lettre : $NAME, c'est $(N) suivi de AME.",
    example: 'NAME = libft.a → ar rc $(NAME) *.o',
  },
  'pis-c09-include-flag': {
    title: 'Headers dans un autre dossier : -I',
    definition:
      "-I dossier ajoute un dossier à ceux où le compilateur cherche les .h des #include. Ça n'a rien à voir avec les .c ni avec les bibliothèques (ça, c'est -L).",
    example: 'cc -Wall -Wextra -Werror -I includes -c srcs/ft_putchar.c',
  },
  'pis-c09-split': {
    title: 'ft_split avec un charset',
    definition:
      "ft_split découpe str en mots en prenant comme séparateur n'importe quel caractère du charset. Plusieurs séparateurs à la suite ne créent pas de mots vides, et le tableau finit par un pointeur à 0.",
    example: 'ft_split("  hola,,42 ", " ,") → {"hola", "42", 0}',
  },
  'pis-c10-display-file-errors': {
    title: 'Les erreurs de display_file',
    definition:
      "ft_display_file affiche un fichier et a trois messages d'erreur, envoyés sur la sortie d'erreur : sans fichier, File name missing. ; avec plusieurs, Too many arguments. ; si la lecture échoue, Cannot read file.",
    example: './ft_display_file → File name missing.',
  },
  'pis-c10-stderr': {
    title: "Sortie standard et sortie d'erreur",
    definition:
      "Le fd 1 est la sortie normale et le 2 celle des erreurs. Si quelqu'un redirige avec >, seul le fd 1 part : les erreurs restent visibles dans le terminal et ne salissent pas le résultat.",
    example: "./ft_cat inexistant > out.txt → l'erreur s'affiche à l'écran et out.txt reste vide.",
  },
  'pis-c10-open-fail': {
    title: 'Vérifier open',
    definition:
      "open renvoie un nouveau descripteur (le plus petit numéro libre, en général 3 ou plus) ou -1 s'il n'a pas pu ouvrir le fichier. Il est déclaré dans <fcntl.h>, avec O_RDONLY.",
    example: 'fd = open(argv[1], O_RDONLY); if (fd < 0) → Cannot read file.',
  },
  'pis-c10-read-loop': {
    title: 'Écrire ce que read a lu',
    definition:
      "read renvoie le nombre d'octets lus, qui peut être inférieur à ce qu'on a demandé. Il faut écrire seulement ceux-là ; buf ne finit pas par \\0, donc le mesurer avec strlen ne marche pas non plus.",
    example: 'while ((n = read(fd, buf, 4096)) > 0) write(1, buf, n);',
  },
  'pis-c10-cat-stdin': {
    title: 'ft_cat, stdin et strerror',
    definition:
      "Comme cat, ft_cat sans fichier lit l'entrée standard (fd 0). Quand un appel échoue, errno garde la cause et strerror(errno) la donne en texte pour le message d'erreur.",
    example: 'echo salut | ./ft_cat → salut. strerror(ENOENT) → No such file or directory',
  },
  'pis-c10-tail-c': {
    title: 'ft_tail -c',
    definition:
      'tail -c N affiche les N derniers octets de chaque fichier (des octets, pas des lignes). Il faut lire tout le fichier ou connaître sa taille pour savoir où commencent ces N octets.',
    example: 'printf "abcdefgh" > f; ./ft_tail -c 3 f → fgh',
  },
  'pis-c10-hexdump': {
    title: 'hexdump -C',
    definition:
      "hexdump -C affiche sur chaque ligne le décalage en hexadécimal, 16 octets en hexadécimal et, entre | |, ces octets en texte (un point s'ils ne sont pas imprimables).",
    example: "00000000  41 42 0a  |AB.| → 'A' vaut 0x41, le retour à la ligne 0x0a.",
  },
  'pis-c10-basename': {
    title: 'Le nom du programme dans les erreurs',
    definition:
      "Les erreurs de cat commencent par le nom du programme. argv[0] contient le chemin avec lequel on l'a lancé ; basename n'en garde que la dernière partie.",
    example: 'basename("./ft_cat") donne ft_cat → ft_cat: inexistant: No such file or directory',
  },
  'pis-c10-close': {
    title: 'Fermer les descripteurs',
    definition:
      'Chaque fichier ouvert occupe un descripteur du processus, et il y a un maximum. close le rend au système ; sans close, un programme qui ouvre beaucoup de fichiers finit par ne plus pouvoir en ouvrir.',
    example: 'fd = open(f, O_RDONLY); … close(fd);',
  },
  'pis-c11-fptr-syntax': {
    title: 'Déclarer un pointeur sur fonction',
    definition:
      "Un pointeur sur fonction se déclare comme la fonction, avec (*nom) à la place du nom. Sans parenthèses, l'* se colle au type de retour et on déclare une fonction qui renvoie un pointeur.",
    example:
      'int (*f)(int) pointe sur une fonction ; int *f(int) est une fonction qui renvoie un int *.',
  },
  'pis-c11-foreach': {
    title: 'ft_foreach',
    definition:
      "ft_foreach(tab, length, f) appelle f avec chaque élément de tab, dans l'ordre. Elle ne renvoie rien : ce qui se passe dépend de la fonction passée.",
    example: 'ft_foreach(tab, 3, &ft_putnbr) avec {4, 2, 1} écrit 421.',
  },
  'pis-c11-map': {
    title: 'ft_map',
    definition:
      'ft_map(tab, length, f) renvoie un nouveau tableau de length int où chaque case vaut f(tab[i]). tab ne change pas, et le nouveau tableau est alloué avec malloc car il doit survivre à la fonction.',
    example: 'ft_map({1, 2, 3}, 3, &double_it) → {2, 4, 6}',
  },
  'pis-c11-count-if': {
    title: 'ft_count_if',
    definition:
      'ft_count_if parcourt un tableau de chaînes et compte combien font renvoyer à f autre chose que 0.',
    example: 'Avec f = « plus de 3 lettres » et {"42", "piscina", "C", "norma"} → 2',
  },
  'pis-c11-any': {
    title: 'ft_any',
    definition:
      'ft_any(tab, f) renvoie 1 si f donne autre chose que 0 pour au moins une chaîne de tab, et 0 sinon. Elle ne reçoit pas de taille : tab se termine par un pointeur à 0.',
    example: 'ft_any({"a", "", 0}, &est_vide) → 1',
  },
  'pis-c11-is-sort': {
    title: 'ft_is_sort et la fonction de comparaison',
    definition:
      "La fonction de comparaison suit la convention de strcmp : négatif si le premier est plus petit, 0 s'ils sont égaux, positif s'il est plus grand. ft_is_sort s'en sert pour vérifier chaque paire voisine.",
    example: 'cmp(a, b) = a - b ; {1, 3, 3, 7} est trié → 1',
  },
  'pis-c11-do-op': {
    title: 'do-op',
    definition:
      'do-op reçoit nombre, opérateur et nombre, et écrit le résultat. Par 0, il affiche Stop : division by zero ou Stop : modulo by zero ; avec un opérateur autre que + - * / %, il écrit 0.',
    example: './do-op 42 / 0 → Stop : division by zero ; ./do-op 6 x 7 → 0',
  },
  'pis-c11-fptr-array': {
    title: 'Tableaux de pointeurs sur fonction',
    definition:
      "Un tableau de pointeurs sur fonction range plusieurs fonctions de même prototype, et on en appelle une par son indice. C'est ainsi que do-op choisit l'opération sans enchaîner les if.",
    example: 'int (*ops[2])(int, int) = {&ft_add, &ft_sub}; ops[1](10, 4) → 6',
  },
  'pis-c11-advanced-sort': {
    title: 'ft_advanced_sort_string_tab',
    definition:
      "Elle trie un tableau de chaînes comme ft_sort_string_tab, mais l'ordre vient de la fonction cmp reçue. Avec ft_strcmp, on obtient l'ordre ASCII ; avec une autre, un autre ordre.",
    example: 'ft_advanced_sort_string_tab(tab, &ft_strcmp) == ft_sort_string_tab(tab)',
  },
  'pis-c12-create-elem': {
    title: 'ft_create_elem',
    definition:
      "Elle crée un maillon t_list : alloue la mémoire, vérifie que malloc n'a pas renvoyé NULL, range data et met next à NULL. malloc n'initialise rien : sans ce NULL, next contient des déchets.",
    example:
      'elem = malloc(sizeof(t_list)); if (!elem) return (NULL); elem->data = data; elem->next = NULL;',
  },
  'pis-c12-push-front': {
    title: 'push_front et push_back',
    definition:
      "ft_list_push_front place le nouvel élément devant (elle change la tête, d'où le t_list **) ; ft_list_push_back le met à la fin. Avec push_front, le dernier arrivé finit en premier.",
    example: 'push_front de C, B et A → A -> B -> C ; push_back → C -> B -> A',
  },
  'pis-c12-list-size': {
    title: "Compter les éléments d'une liste",
    definition:
      "On avance tant que le pointeur courant n'est pas NULL, en comptant un par tour. Si on teste ->next, le dernier n'est pas compté et une liste vide fait lire NULL.",
    example: 'while (begin_list) { i++; begin_list = begin_list->next; }',
  },
  'pis-c12-list-last': {
    title: 'ft_list_last',
    definition:
      "Elle renvoie le dernier élément : celui dont next vaut NULL. On avance tant qu'il y a un suivant ; si la liste est vide, elle renvoie NULL.",
    example: 'while (begin_list && begin_list->next) begin_list = begin_list->next;',
  },
  'pis-c12-list-clear': {
    title: 'Libérer une liste',
    definition:
      "Pour libérer chaque élément, il faut garder son next avant le free : après, cette mémoire ne t'appartient plus. free_fct libère le data et free, le maillon.",
    example:
      'next = begin_list->next; free_fct(begin_list->data); free(begin_list); begin_list = next;',
  },
  'pis-c12-list-at': {
    title: 'ft_list_at',
    definition:
      "ft_list_at(begin_list, nbr) renvoie l'élément à la position nbr, en comptant à partir de 0. Si la liste se termine avant, elle renvoie NULL.",
    example: 'A -> B -> C -> D : ft_list_at(list, 2) → C ; ft_list_at(list, 4) → NULL',
  },
  'pis-c12-reverse': {
    title: 'Retourner une liste',
    definition:
      'ft_list_reverse retourne les flèches une à une avec trois pointeurs : prev, cur et next. next garde la suite avant de retourner cur->next ; à la fin, prev est la nouvelle tête.',
    example: 'A -> B -> C devient C -> B -> A, et *begin_list pointe sur C.',
  },
  'pis-c12-foreach': {
    title: 'ft_list_foreach',
    definition:
      "Elle parcourt la liste et appelle f avec le data de chaque élément, dans l'ordre. f ne reçoit pas le maillon et ne peut pas toucher aux next.",
    example: 'ft_list_foreach(list, &ft_putstr) écrit tous les data à la suite.',
  },
  'pis-c12-remove-if': {
    title: 'ft_list_remove_if',
    definition:
      "Elle retire et libère chaque élément dont le data donne 0 quand on le compare à data_ref avec cmp (comme strcmp). Si l'élément retiré est la tête, il faut changer *begin_list.",
    example: 'Liste a -> b -> a, data_ref "a" avec ft_strcmp → il reste b.',
  },
  'pis-c12-sorted-insert': {
    title: 'Insérer dans une liste triée',
    definition:
      "ft_sorted_list_insert parcourt la liste jusqu'au premier élément qui vient après le nouveau selon cmp, et l'insère juste devant. La liste reste triée sans qu'on ait à la retrier.",
    example: '1 -> 3 -> 8 et on insère 5 → 1 -> 3 -> 5 -> 8',
  },
  'pis-c13-prefix': {
    title: 'Parcours préfixe',
    definition:
      "btree_apply_prefix traite d'abord la racine, puis tout le sous-arbre gauche, puis tout le droit, et recommence ainsi à chaque nœud.",
    example: 'Racine 8 avec les enfants 3 (1, 6) et 10 (-, 14) → 8 3 1 6 10 14',
  },
  'pis-c13-infix': {
    title: 'Parcours infixe',
    definition:
      'btree_apply_infix traite le sous-arbre gauche, puis la racine, puis le droit. Dans un arbre de recherche, ça donne les items triés du plus petit au plus grand.',
    example: 'Racine D avec B (A, C) et F (-, G) → A B C D F G',
  },
  'pis-c13-suffix': {
    title: 'Parcours suffixe',
    definition:
      "btree_apply_suffix traite le sous-arbre gauche, puis le droit, et la racine en dernier. Comme les enfants passent avant leur parent, c'est celui qu'il faut pour libérer un arbre.",
    example: 'Racine + avec * (2, 3) et 5 → 2 3 * 5 +',
  },
  'pis-c13-insert': {
    title: 'Insérer dans un arbre de recherche',
    definition:
      "btree_insert_data descend depuis la racine en comparant avec cmpf : à gauche si le nouveau est plus petit, à droite s'il est égal ou plus grand, jusqu'à une place libre. Le premier inséré est la racine.",
    example: '5, 3, 8, 4 → racine 5 ; 3 à sa gauche, 8 à sa droite et 4 à droite du 3.',
  },
  'pis-c13-level-count': {
    title: 'btree_level_count',
    definition:
      "Elle renvoie la hauteur de l'arbre : le nombre de nœuds de la plus longue branche. Elle vaut 0 pour un arbre vide et 1 + le plus grand des deux enfants pour tout nœud.",
    example: 'a avec b et c, c -> d -> e à droite → 4',
  },
  'pis-c13-by-level': {
    title: 'Parcours par niveaux',
    definition:
      "btree_apply_by_level visite l'arbre en largeur : toute la rangée de la racine, puis la suivante, de gauche à droite. Elle passe à applyf l'item, son niveau et s'il est le premier de ce niveau.",
    example: 'Racine 1, enfants 2 et 3, petits-enfants 4, 5 et 6 → 1 2 3 4 5 6',
  },
  'pis-c13-create-node': {
    title: 'btree_create_node',
    definition:
      'Elle alloue un t_btree, range item et laisse left et right à NULL : un nouveau nœud est une feuille. malloc ne met rien à 0, il faut donc le faire à la main.',
    example: 'node->item = item; node->left = NULL; node->right = NULL;',
  },
  'pis-c13-search': {
    title: 'btree_search_item',
    definition:
      "Elle cherche dans l'arbre un item qui donne 0 quand on le compare à data_ref avec cmpf (0 veut dire égal, comme avec strcmp). Si aucun ne convient, elle renvoie NULL.",
    example: 'btree_search_item(root, "42", &ft_strcmp) → l\'item "42", ou NULL',
  },
}
