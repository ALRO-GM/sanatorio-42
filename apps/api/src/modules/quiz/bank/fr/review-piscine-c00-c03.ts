/** Repaso de Not-games en francés: traducción de `../review-piscine-c00-c03.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C00_C03_FR: Readonly<Record<string, ReviewEntry>> = {
  'pis-c00-putchar-write': {
    title: 'ft_putchar avec write',
    definition:
      "write(fd, buf, count) écrit count octets depuis l'adresse buf sur le descripteur fd. Pour un seul caractère : fd 1 (sortie standard), &c et 1. Elle se trouve dans unistd.h.",
    example: '#include <unistd.h>\nvoid ft_putchar(char c) { write(1, &c, 1); }',
  },
  'pis-c00-write-return': {
    title: 'Ce que renvoie write',
    definition:
      "write renvoie combien d'octets elle a vraiment écrits (parfois moins que demandé) ou -1 en cas d'échec. Elle ne renvoie ni le caractère ni le descripteur.",
    example: 'write(1, "hola", 4) renvoie 4 ; avec un fd fermé, elle renvoie -1.',
  },
  'pis-c00-write-proto': {
    title: 'Le prototype de write',
    definition:
      "ssize_t write(int fd, const void *buf, size_t count) : le fd d'abord, puis l'adresse des octets (de n'importe quel type, d'où le void *) et leur nombre. Elle renvoie un ssize_t car elle peut renvoyer -1.",
    example: 'int n = 42; write(1, &n, 1); compile : &n est converti en const void *.',
  },
  'pis-c00-print-alphabet': {
    title: 'Parcourir les lettres avec un char',
    definition:
      "Un char est un petit nombre : 'a' vaut 97 et 'z' 122, on peut donc l'additionner, le comparer et s'en servir comme compteur d'un while.",
    example: "c = 'a'; while (c <= 'z') { write(1, &c, 1); c++; } écrit l'alphabet.",
  },
  'pis-c00-reverse-alphabet': {
    title: "Les bornes d'une boucle",
    definition:
      "Avec < ou >, la valeur de la borne est exclue ; avec <= ou >=, elle est incluse. À l'envers, while (c >= 'a') va jusqu'au a et while (c > 'a') s'arrête au b.",
    example: "c = 'z'; while (c >= 'a') { write(1, &c, 1); c--; } écrit zyx…a.",
  },
  'pis-c00-print-numbers': {
    title: 'Le chiffre et le caractère',
    definition:
      "Le nombre 0 et le caractère '0' ne sont pas la même chose : write envoie des octets, et l'octet qui s'affiche comme 0 est le 48. Il faut écrire le caractère, pas le nombre.",
    example: "c = '0'; while (c <= '9') { write(1, &c, 1); c++; } écrit 0123456789.",
  },
  'pis-c00-char-digit': {
    title: "Du chiffre au caractère avec '0'",
    definition:
      "Les chiffres se suivent en ASCII de '0' (48) à '9' (57) : n + '0' donne le caractère du chiffre n, et c - '0' le nombre d'un caractère chiffre.",
    example: "char c = 7 + '0'; // '7'\nint n = '7' - '0'; // 7",
  },
  'pis-c00-is-negative': {
    title: 'ft_is_negative et le zéro',
    definition:
      "ft_is_negative écrit N si n est négatif et P s'il est positif ou nul : 0 n'est pas inférieur à 0, il passe donc par la branche du else.",
    example: 'ft_is_negative(-5) écrit N ; ft_is_negative(0) et ft_is_negative(3) écrivent P.',
  },
  'pis-c00-print-comb': {
    title: 'ft_print_comb',
    definition:
      "Écrit toutes les combinaisons de trois chiffres distincts dans l'ordre croissant (le premier plus petit que le deuxième, et celui-ci que le troisième), séparées par une virgule et une espace : 120 en tout.",
    example: '012, 013, 014, …, 019, 023, …, 789',
  },
  'pis-c00-print-comb2': {
    title: 'ft_print_comb2',
    definition:
      "Écrit toutes les paires de nombres à deux chiffres a et b avec a < b, de 00 à 99, dans l'ordre : le second est toujours plus grand, ce qui donne 4950 paires.",
    example: '00 01, 00 02, …, 00 99, 01 02, …, 98 99',
  },
  'pis-c00-putnbr-intmin': {
    title: 'INT_MIN dans ft_putnbr',
    definition:
      "Un int de 32 bits va de -2147483648 à 2147483647 : le plus petit n'a pas d'opposé, et -n déborde. On le traite à part (en l'écrivant tel quel) ou on passe le nombre en long.",
    example: 'if (n == -2147483648) { write(1, "-2147483648", 11); return; }',
  },
  'pis-c00-putnbr-code': {
    title: 'ft_putnbr récursive',
    definition:
      "ft_putnbr écrit le signe si besoin, s'appelle avec n / 10 pour écrire les chiffres de poids fort, puis écrit n % 10 + '0', le dernier.",
    example: 'ft_putnbr(123) : ft_putnbr(12) → ft_putnbr(1) écrit 1, puis 2, puis 3.',
  },
  'pis-c00-compile': {
    title: 'Compiler à la piscine',
    definition:
      "Tout se compile avec cc -Wall -Wextra -Werror : -Wall et -Wextra activent les warnings et -Werror les transforme en erreurs. Sans -o, l'exécutable s'appelle a.out.",
    example: 'cc -Wall -Wextra -Werror main.c ft_putchar.c && ./a.out',
  },
  'pis-c00-print-combn': {
    title: 'ft_print_combn',
    definition:
      "La version générale de ft_print_comb : écrit toutes les combinaisons de n chiffres distincts dans l'ordre croissant, avec 0 < n < 10. On la résout souvent par récursion.",
    example: 'ft_print_combn(2) écrit 01, 02, …, 89 (45 combinaisons).',
  },
  'pis-c00-moulinette': {
    title: 'Comment corrige la Moulinette',
    definition:
      "La Moulinette corrige les exercices d'un jour dans l'ordre et s'arrête au premier qui échoue : même justes, les suivants ne comptent plus pour la note.",
    example: 'ex00 et ex01 justes, ex02 faux, ex03 juste : seuls ex00 et ex01 comptent.',
  },
  'pis-c00-norm': {
    title: 'La norme de 42',
    definition:
      'La norminette impose, entre autres, des fonctions de 25 lignes au plus, 5 fonctions par fichier, 4 paramètres et 5 variables, et interdit for, do…while et switch.',
    example: 'Un for se réécrit en i = 0; while (i < n) { …; i++; }',
  },
  'pis-c01-ft-ft': {
    title: 'ft_ft : écrire à travers un pointeur',
    definition:
      "Si une fonction reçoit l'adresse d'un int, *nbr est cet int : lui affecter une valeur change la variable de l'appelant, pas une copie.",
    example: 'int n; ft_ft(&n); // n vaut maintenant 42',
  },
  'pis-c01-ultimate-ft': {
    title: 'Pointeurs de pointeurs',
    definition:
      "Chaque * du type est un niveau d'adresse : int ** pointe vers un int *, qui pointe vers un int. Chaque * devant la variable descend d'un niveau.",
    example: 'int n; int *p = &n; int **pp = &p; **pp = 42; // n vaut 42',
  },
  'pis-c01-swap-bug': {
    title: 'Passage par valeur et ft_swap',
    definition:
      "En C, les arguments sont copiés : une fonction qui reçoit des int ne peut pas changer les variables de l'appelant. Pour ça, elle reçoit leurs adresses (int *).",
    example: 'void ft_swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }',
  },
  'pis-c01-pointer-alias': {
    title: 'Deux noms pour la même variable',
    definition:
      "Si p = &n, *p et n désignent la même mémoire : ce qu'on fait par un chemin se voit par l'autre.",
    example: 'int n = 1; int *p = &n; *p = 5; // n vaut 5',
  },
  'pis-c01-div-mod': {
    title: 'ft_div_mod : rendre deux résultats',
    definition:
      "Une fonction ne renvoie qu'une valeur ; pour en rendre deux, on passe des pointeurs où les écrire. Entre int, / donne le quotient entier et % le reste.",
    example: 'ft_div_mod(17, 5, &d, &m); // d = 3, m = 2',
  },
  'pis-c01-ultimate-div-mod': {
    title: 'ft_ultimate_div_mod',
    definition:
      "Elle reçoit a et b par adresse et laisse le quotient dans *a et le reste dans *b. Il faut calculer les deux avant d'écrire, sinon le second utiliserait une valeur déjà écrasée.",
    example: 'int q = *a / *b; int r = *a % *b; *a = q; *b = r;',
  },
  'pis-c01-negative-div': {
    title: 'Division entière et négatifs',
    definition:
      'En C, la division entière tronque vers zéro et le reste prend le signe du dividende, de sorte que (a / b) * b + a % b == a reste toujours vrai.',
    example: '-7 / 2 == -3 et -7 % 2 == -1 ; 7 / -2 == -3 et 7 % -2 == 1',
  },
  'pis-c01-putstr': {
    title: 'Parcourir une chaîne avec un pointeur',
    definition:
      "*str est le caractère pointé par str et str++ passe au suivant. La boucle while (*str) s'arrête sur le '\\0' final, pas quand str vaut NULL.",
    example: 'while (*str) { write(1, str, 1); str++; }',
  },
  'pis-c01-strlen': {
    title: 'ft_strlen',
    definition:
      "Compte les caractères d'une chaîne jusqu'au '\\0', sans le compter. Les espaces et les chiffres comptent comme n'importe quel autre caractère.",
    example: 'ft_strlen("42 Madrid") == 9 ; ft_strlen("") == 0',
  },
  'pis-c01-rev-int-tab': {
    title: 'Inverser un tableau',
    definition:
      "On échange le premier avec le dernier, le deuxième avec l'avant-dernier… jusqu'à la moitié. Si on continue jusqu'au bout, chaque paire est échangée deux fois et revient comme avant.",
    example: 'i = 0; while (i < size / 2) { échanger tab[i] et tab[size - 1 - i]; i++; }',
  },
  'pis-c01-sort-int-tab': {
    title: 'Le tri à bulles',
    definition:
      "Un passage compare chaque élément au suivant et les échange s'ils sont dans le mauvais ordre : le plus grand finit au bout. On répète les passages jusqu'à ce qu'un passage ne change rien.",
    example: '{3, 2, 1} → {2, 1, 3} → {1, 2, 3}',
  },
  'pis-c01-amp-star': {
    title: '& et *',
    definition:
      "&x donne l'adresse de x (de type pointeur vers le type de x) et *p va à l'adresse rangée dans p. Ce sont des opérations inverses : *(&x), c'est x.",
    example: 'int n = 4; int *p = &n; *p += 1; // n vaut 5',
  },
  'pis-c01-array-index': {
    title: 'Tableaux et indices',
    definition:
      "Le nom d'un tableau s'utilise comme un pointeur vers son premier élément, et tab[i] vaut *(tab + i). Les indices vont de 0 à size - 1.",
    example: 'int tab[5]; tab[4] est le dernier et *(tab + 4) le même élément.',
  },
  'pis-c02-strcpy': {
    title: 'ft_strcpy',
    definition:
      "Copie src dans dest caractère par caractère, '\\0' final compris, et renvoie dest. Sans ce '\\0', dest ne se termine pas là où il faut.",
    example: "while (src[i]) { dest[i] = src[i]; i++; } dest[i] = '\\0'; return (dest);",
  },
  'pis-c02-strncpy-pad': {
    title: 'ft_strncpy',
    definition:
      "Copie au plus n caractères de src. Si src est plus courte, elle complète avec des '\\0' jusqu'à n ; si elle est plus longue, elle coupe sans mettre de '\\0'.",
    example:
      'ft_strncpy(d, "ab", 5) laisse a b \\0 \\0 \\0 ; ft_strncpy(d, "abcdefgh", 5) laisse abcde sans \\0.',
  },
  'pis-c02-str-is-numeric': {
    title: 'Les ft_str_is_*',
    definition:
      "Elles renvoient 1 si tous les caractères respectent la condition et 0 si l'un d'eux ne la respecte pas. Pour la chaîne vide, elles renvoient 1, puisqu'aucun caractère n'échoue.",
    example:
      'ft_str_is_numeric("") == 1 ; ft_str_is_numeric("42") == 1 ; ft_str_is_numeric("-42") == 0',
  },
  'pis-c02-str-is-printable': {
    title: 'Les caractères imprimables',
    definition:
      "En ASCII, les imprimables vont de l'espace (32) au tilde ~ (126). Ceux de 0 à 31 et le 127 (DEL) sont des caractères de contrôle.",
    example: "if (c >= 32 && c <= 126) // imprimable ; '\\n' (10) ne l'est pas",
  },
  'pis-c02-str-is-lowercase': {
    title: 'ft_str_is_lowercase',
    definition:
      "Elle ne renvoie 1 que si chaque caractère est entre 'a' et 'z'. Une espace, un chiffre ou un signe suffit pour qu'elle renvoie 0.",
    example: 'ft_str_is_lowercase("hola") == 1 ; ft_str_is_lowercase("hola mundo") == 0',
  },
  'pis-c02-str-is-alpha-bug': {
    title: 'Vérifier tous les caractères',
    definition:
      "Pour savoir si toute une chaîne respecte une condition, il faut renvoyer 0 dès qu'un caractère échoue et 1 seulement en arrivant au bout. Renvoyer 1 au premier qui convient, c'est autre chose.",
    example: 'while (str[i]) { if (!est_lettre(str[i])) return (0); i++; } return (1);',
  },
  'pis-c02-strupcase': {
    title: 'Majuscules et minuscules en ASCII',
    definition:
      "Une minuscule et sa majuscule sont séparées de 32 : 'a' vaut 97 et 'A' 65. Pour passer en majuscule, on retire 32 seulement à ce qui est entre 'a' et 'z'.",
    example: "if (c >= 'a' && c <= 'z') c -= 32; // 'h' → 'H'",
  },
  'pis-c02-strcapitalize': {
    title: 'ft_strcapitalize',
    definition:
      "Met en majuscule la première lettre de chaque mot et le reste en minuscules. Un mot est une suite de lettres et de chiffres : tout autre caractère l'interrompt.",
    example: '"hOLA 42mUNDO dos-tres" → "Hola 42mundo Dos-Tres"',
  },
  'pis-c02-strlcpy': {
    title: 'ft_strlcpy',
    definition:
      "Copie au plus size - 1 caractères, termine dest par '\\0' (si size > 0) et renvoie la longueur de src : si elle est >= size, la copie a été coupée.",
    example: 'ft_strlcpy(buf, "piscine", 4) laisse "pis" et renvoie 7.',
  },
  'pis-c02-strlcpy-vs-strncpy': {
    title: 'strlcpy face à strncpy',
    definition:
      "strncpy copie exactement n octets (en complétant avec des '\\0' ou en laissant la chaîne non terminée) ; strlcpy termine toujours dest et renvoie strlen(src) pour savoir si ça a tenu.",
    example: 'strncpy(d, "abcdef", 3) laisse abc sans \\0 ; strlcpy(d, "abcdef", 3) laisse "ab".',
  },
  'pis-c02-non-printable': {
    title: 'ft_putstr_non_printable',
    definition:
      "Écrit la chaîne, mais chaque caractère non imprimable sort sous forme d'un backslash suivi de sa valeur en hexadécimal, sur deux chiffres en minuscules.",
    example: '"Coucou\\ntu vas bien ?" → Coucou\\0atu vas bien ?',
  },
  'pis-c02-print-memory': {
    title: 'ft_print_memory',
    definition:
      "Fait un dump de la mémoire : chaque ligne donne l'adresse en hexadécimal, 16 octets en hexadécimal deux par deux, puis ces octets en texte, avec un point pour les non imprimables.",
    example: '000000010a161f40: 426f 6e6a 6f75 7220 6c65 7320 616d 696e Bonjour les amin',
  },
  'pis-c03-strcmp': {
    title: 'ft_strcmp',
    definition:
      "Avance tant que les caractères sont égaux et renvoie la différence des premiers qui diffèrent (en unsigned char). Si une chaîne se termine, son '\\0' vaut 0.",
    example: 'ft_strcmp("abc", "abd") == -1 ; ft_strcmp("ab", "abc") == -99',
  },
  'pis-c03-strcmp-unsigned': {
    title: 'strcmp et unsigned char',
    definition:
      "char peut être signé, et alors les octets de 128 à 255 sont négatifs. strcmp compare en unsigned char pour que ces octets passent après ceux de l'ASCII.",
    example: "(unsigned char)'\\xe9' vaut 233, pas -23.",
  },
  'pis-c03-strcmp-sign': {
    title: 'Le signe de strcmp',
    definition:
      "Ce qui compte dans strcmp, c'est le signe : négatif si s1 passe avant s2, 0 si elles sont égales et positif si elle passe après. On s'en sert pour trier des chaînes.",
    example: 'ft_strcmp("ana", "bea") < 0, donc "ana" passe avant.',
  },
  'pis-c03-strncmp': {
    title: 'ft_strncmp',
    definition:
      'Comme strcmp, mais elle regarde au plus n caractères : si les n premiers sont égaux, elle renvoie 0, même si les chaînes diffèrent ensuite. Avec n = 0, elle donne toujours 0.',
    example: 'ft_strncmp("piscine", "pisco", 4) == 0 ; avec 5, elle donne \'i\' - \'o\' = -6',
  },
  'pis-c03-strcat': {
    title: 'ft_strcat',
    definition:
      "Copie src à partir du '\\0' de dest, remet un '\\0' à la fin et renvoie dest. Chaque appel reprend là où le précédent s'est arrêté.",
    example: 'dest = "42"; ft_strcat(dest, " Madrid"); // "42 Madrid"',
  },
  'pis-c03-strcat-room': {
    title: 'De la place pour concaténer',
    definition:
      "ft_strcat n'alloue pas de mémoire : dest doit avoir la place pour ce qu'elle contient, ce qu'on ajoute et le '\\0', sinon elle écrit hors du tableau.",
    example:
      'char dest[10] = "hola"; ft_strcat(dest, " mundo"); // 11 octets dans 10 : débordement',
  },
  'pis-c03-strncat': {
    title: 'ft_strncat',
    definition:
      "Ajoute au plus nb caractères de src à la fin de dest et met toujours le '\\0' final, contrairement à strncpy.",
    example: 'dest = "ab"; ft_strncat(dest, "cdef", 2); // "abcd"',
  },
  'pis-c03-strstr': {
    title: 'ft_strstr',
    definition:
      "Cherche to_find dans str et renvoie un pointeur vers sa première occurrence. Si to_find est vide, elle renvoie str ; si elle n'apparaît pas, NULL.",
    example: 'ft_strstr("hola", "") == "hola" ; ft_strstr("hola", "x") == NULL',
  },
  'pis-c03-strstr-code': {
    title: 'Ce que renvoie strstr',
    definition:
      "strstr ne renvoie pas seulement ce qu'on cherchait : elle renvoie un pointeur à l'intérieur de str, et à partir de là la chaîne continue jusqu'à la fin de str.",
    example: 'ft_strstr("banana", "ana") pointe vers "anana" (position 1).',
  },
  'pis-c03-strlcat': {
    title: 'ft_strlcat',
    definition:
      "Ajoute src à dest sans dépasser size octets au total ('\\0' compris) et renvoie la longueur qu'elle a voulu créer : strlen(dest) + strlen(src).",
    example: 'dest = "abc"; ft_strlcat(dest, "defgh", 6) laisse "abcde" et renvoie 8.',
  },
  'pis-c03-strlcat-small': {
    title: 'ft_strlcat avec un petit size',
    definition:
      "Si size ne dépasse pas strlen(dest), il n'y a pas de place pour ajouter quoi que ce soit : ft_strlcat laisse dest tel quel et renvoie size + strlen(src).",
    example: 'dest = "abcdef"; ft_strlcat(dest, "xyz", 4) renvoie 7 et ne touche pas à dest.',
  },
  'pis-c03-strlcat-return': {
    title: 'À quoi sert le retour de strlcat',
    definition:
      "ft_strlcat renvoie min(size, strlen(dest)) + strlen(src), la longueur qu'elle a tenté de créer : si le résultat est >= size, la chaîne a été coupée.",
    example: "if (ft_strlcat(buf, s, sizeof(buf)) >= sizeof(buf)) // ça n'a pas tenu",
  },
}
