/** Repaso de Not-games en francés: traducción de `../review-piscine-c04-c07.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_C04_C07_FR: Readonly<Record<string, ReviewEntry>> = {
  'pis-c04-strlen': {
    title: 'ft_strlen',
    definition:
      "Elle parcourt la chaîne avec un index jusqu'au '\\0' et renvoie le nombre de caractères passés, sans compter le '\\0'. Les espaces comptent comme n'importe quel autre caractère.",
    example: 'ft_strlen("42 Madrid") = 9 ; ft_strlen("") = 0.',
  },
  'pis-c04-putstr': {
    title: "ft_putstr et le '\\0'",
    definition:
      "ft_putstr écrit caractère par caractère jusqu'au premier '\\0'. Si un littéral contient un '\\0' au milieu, pour la fonction la chaîne s'arrête là.",
    example: 'ft_putstr("ab\\0cd") affiche ab.',
  },
  'pis-c04-putnbr-intmin': {
    title: 'ft_putnbr et INT_MIN',
    definition:
      "Pour afficher un négatif, on change souvent son signe, mais -2147483648 n'a pas d'opposé dans un int de 32 bits : nb = -nb déborde. Il faut le traiter à part ou copier nb dans un long.",
    example: 'if (nb == -2147483648) { write(1, "-2147483648", 11); return ; }',
  },
  'pis-c04-putnbr-order': {
    title: "Afficher les chiffres dans l'ordre",
    definition:
      "nb % 10 donne le dernier chiffre et nb / 10 l'enlève. Pour que les chiffres sortent dans l'ordre, on affiche d'abord nb / 10 en récursif, puis le dernier chiffre.",
    example: "if (nb >= 10) ft_putnbr(nb / 10); ft_putchar(nb % 10 + '0');",
  },
  'pis-c04-atoi-signs': {
    title: 'Les signes dans ft_atoi',
    definition:
      "Le ft_atoi de la piscine saute les blancs, lit ensuite autant de '+' et de '-' qu'il y en a (un nombre impair de '-' rend le résultat négatif), puis les chiffres, jusqu'au premier caractère qui n'en est pas un.",
    example: 'ft_atoi(" ---+--+1234ab567") = -1234 (cinq \'-\').',
  },
  'pis-c04-atoi-spaces': {
    title: 'Les blancs que saute ft_atoi',
    definition:
      "Avant les signes, ft_atoi ignore les mêmes blancs qu'isspace : l'espace, \\t, \\n, \\v, \\f et \\r (les codes 32 et 9 à 13).",
    example: 'ft_atoi("\\t\\n  42") = 42.',
  },
  'pis-c04-base-valid': {
    title: 'Une base valide',
    definition:
      "Dans ft_putnbr_base et ft_atoi_base, une base est invalide si elle est vide, n'a qu'un caractère, en répète un ou contient + ou -. Avec une base invalide, ft_putnbr_base n'affiche rien.",
    example: '"01" et "poneyvif" sont valides ; "0", "0120" et "01+" ne le sont pas.',
  },
  'pis-c04-base-convert': {
    title: 'Écrire un nombre dans une autre base',
    definition:
      "La longueur de la base donne le nombre de chiffres, et chaque caractère vaut sa position. On divise le nombre par la longueur encore et encore : les restes, lus à l'envers, sont les chiffres.",
    example: '10 dans "01" donne 1010 ; 255 dans "0123456789ABCDEF" donne FF.',
  },
  'pis-c04-atoi-base': {
    title: 'ft_atoi_base',
    definition:
      'Comme ft_atoi, mais chaque chiffre est la position de son caractère dans la base : on multiplie le total par la longueur de la base et on ajoute le chiffre. Avec une base invalide, elle renvoie 0.',
    example: 'ft_atoi_base("101", "01") = 5 ; ft_atoi_base("-ff", "0123456789abcdef") = -255.',
  },
  'pis-c04-intmin-value': {
    title: 'INT_MIN et INT_MAX',
    definition:
      "Un int de 32 bits va de -2147483648 (INT_MIN) à 2147483647 (INT_MAX). Il y a une valeur négative de plus que de positives : c'est pour ça qu'INT_MIN n'a pas d'opposé.",
    example: 'ft_putnbr(-2147483648) doit afficher le signe et 10 chiffres.',
  },
  'pis-c04-base-poney': {
    title: 'La base « poneyvif »',
    definition:
      'Une base n\'a pas besoin de chiffres : "poneyvif" a 8 caractères, c\'est donc la base 8, et chaque lettre vaut sa position (p = 0, o = 1… f = 7).',
    example: 'Le 8 dans "poneyvif" s\'écrit op (1 × 8 + 0) ; le 5 s\'écrit v.',
  },
  'pis-c04-octal': {
    title: 'Octal',
    definition:
      "Base 8 : des chiffres de 0 à 7, et chaque position vaut 8 fois celle de sa droite. Pour passer en octal, on divise par 8 et on lit les restes à l'envers.",
    example: "42 = 5 × 8 + 2, donc 52 en octal. L'octal 17 vaut 8 + 7 = 15.",
  },
  'pis-c04-base-sign': {
    title: "Pourquoi une base n'a pas de signes",
    definition:
      "ft_atoi_base lit '+' et '-' comme un signe avant les chiffres. S'ils étaient aussi des chiffres de la base, on ne saurait pas comment les lire : une telle base est donc invalide.",
    example: 'Avec la base "-01", "-1" pourrait être -1 ou le nombre 01.',
  },
  'pis-c05-fact-iter': {
    title: 'ft_iterative_factorial',
    definition:
      'La factorielle de n vaut n × (n - 1) × … × 1. Par définition 0! vaut 1, et le sujet demande de renvoyer 0 si nb est négatif.',
    example: '5! = 120 ; 0! = 1 ; ft_iterative_factorial(-3) = 0.',
  },
  'pis-c05-fact-rec': {
    title: 'Le cas de base de la factorielle récursive',
    definition:
      "La version récursive renvoie nb × f(nb - 1) et a besoin d'un cas de base pour s'arrêter : s'il ne couvre que nb == 1, avec 0 elle descend à -1, qui renvoie 0, et le résultat vaut 0 au lieu de 1.",
    example: 'if (nb == 0 || nb == 1) return (1);',
  },
  'pis-c05-power': {
    title: 'ft_iterative_power',
    definition:
      "Elle multiplie nb par lui-même power fois. Le sujet demande qu'une puissance négative renvoie 0 et que 0 puissance 0 vaille 1.",
    example: 'ft_iterative_power(2, 10) = 1024 ; (0, 0) = 1 ; (5, -2) = 0.',
  },
  'pis-c05-power-rec': {
    title: "Les appels d'une fonction récursive",
    definition:
      "Chaque appel de ft_recursive_power baisse power de 1 jusqu'au cas de base power == 0. Avec power = n, il y a n + 1 appels, le premier compris.",
    example: '(3, 4) → (3, 3) → (3, 2) → (3, 1) → (3, 0) : 5 appels et 81.',
  },
  'pis-c05-fib': {
    title: 'ft_fibonacci',
    definition:
      'Chaque terme est la somme des deux précédents : fib(0) = 0, fib(1) = 1. Le sujet demande -1 pour un index négatif.',
    example: '0, 1, 1, 2, 3, 5, 8, 13 : ft_fibonacci(7) = 13.',
  },
  'pis-c05-fib-cost': {
    title: 'Le coût du fibonacci récursif',
    definition:
      "fib(n) appelle fib(n - 1) et fib(n - 2), qui se divisent chacun à nouveau en deux : beaucoup de calculs sont refaits et le nombre d'appels croît de façon exponentielle.",
    example: "fib(40) fait des centaines de millions d'appels ; une boucle, 40 étapes.",
  },
  'pis-c05-sqrt': {
    title: 'ft_sqrt',
    definition:
      'Elle renvoie la racine carrée entière de nb si elle est exacte (nb est un carré parfait). Sinon, ou si nb est négatif, elle renvoie 0.',
    example: 'ft_sqrt(49) = 7 ; ft_sqrt(50) = 0 ; ft_sqrt(-16) = 0.',
  },
  'pis-c05-sqrt-overflow': {
    title: 'Le débordement dans ft_sqrt',
    definition:
      "En testant i * i < nb avec nb proche d'INT_MAX, i monte jusqu'à 46341, dont le carré ne tient plus dans un int. On l'évite en comparant i <= nb / i ou avec un long.",
    example: '46340 × 46340 = 2147395600 tient ; 46341 × 46341, non.',
  },
  'pis-c05-prime': {
    title: 'ft_is_prime et les nombres sous 2',
    definition:
      'Un nombre premier est supérieur à 1 et ne se divise que par 1 et par lui-même. Ni 0, ni 1, ni les négatifs ne sont premiers : il faut renvoyer 0 pour eux avant la boucle.',
    example: 'if (nb < 2) return (0); — sans ça, ft_is_prime(1) donnerait 1.',
  },
  'pis-c05-prime-sqrt': {
    title: "Tester les diviseurs jusqu'à la racine",
    definition:
      "Si n a un diviseur plus grand que √n, il en a aussi un plus petit que √n. Il suffit de tester les i avec i * i <= n, ce qui est bien plus rapide que d'aller jusqu'à n.",
    example: 'Pour 97, il suffit de tester de 2 à 9 (10 × 10 = 100 > 97).',
  },
  'pis-c05-next-prime': {
    title: 'ft_find_next_prime',
    definition:
      'Elle renvoie le premier nombre premier supérieur ou égal à nb : si nb est déjà premier, nb lui-même. En dessous de 2, le suivant est 2.',
    example: 'ft_find_next_prime(14) = 17 ; (17) = 17 ; (-5) = 2.',
  },
  'pis-c05-queens': {
    title: 'Les dix dames',
    definition:
      "ft_ten_queens_puzzle place dix dames sur un échiquier de 10 × 10 sans qu'elles s'attaquent, par backtracking. Elle affiche chaque solution en 10 chiffres (la ligne de la dame dans chaque colonne) et renvoie leur nombre : 724.",
    example: 'Une ligne de sortie : 0257948136.',
  },
  'pis-c05-recursion-stack': {
    title: "La pile d'appels",
    definition:
      "Chaque appel de fonction occupe un morceau de pile jusqu'à ce qu'il revienne. Si une récursion n'atteint jamais son cas de base, les appels s'empilent jusqu'à épuiser la pile et le programme plante.",
    example: "f(-1) avec le cas de base n == 0 descend à -2, -3… jusqu'au segfault.",
  },
  'pis-c06-program-name': {
    title: 'argv[0]',
    definition:
      "argv[0] est le nom du programme tel qu'on l'a tapé pour le lancer ; ft_print_program_name l'affiche. Les vrais arguments commencent à argv[1].",
    example: 'Avec ./a.out hola, argv[0] vaut "./a.out" et argv[1] vaut "hola".',
  },
  'pis-c06-argc-count': {
    title: 'argc',
    definition:
      "argc est le nombre d'éléments d'argv, nom du programme compris : sans arguments, il vaut 1. Ce qui est entre guillemets dans le shell forme un seul argument.",
    example: './a.out "hola mundo" 42 → argc = 3.',
  },
  'pis-c06-argv-null': {
    title: 'argv[argc] vaut NULL',
    definition:
      "Après le dernier argument, argv contient toujours un pointeur nul : argv[argc] == NULL. On peut parcourir argv jusqu'à NULL sans regarder argc.",
    example: 'Avec ./a.out x, argv[0] = "./a.out", argv[1] = "x", argv[2] = NULL.',
  },
  'pis-c06-print-params': {
    title: 'ft_print_params',
    definition:
      "Il affiche chaque argument sur sa ligne à partir d'argv[1], sans le nom du programme. Le shell regroupe ce qui est entre guillemets en un seul argument et enlève les guillemets.",
    example: './a.out "a b" c affiche « a b » et « c », sur deux lignes.',
  },
  'pis-c06-rev-params': {
    title: 'ft_rev_params',
    definition:
      "Il affiche les arguments du dernier au premier, chacun sur sa ligne, sans le nom du programme : on va d'argc - 1 jusqu'à 1, sans atteindre 0.",
    example: './a.out x y z affiche z, y et x.',
  },
  'pis-c06-sort-ascii': {
    title: "L'ordre ASCII",
    definition:
      'ft_sort_params trie les arguments en comparant leurs caractères par code ASCII, comme ft_strcmp. Les majuscules (65-90) passent avant les minuscules (97-122).',
    example: 'b A a B → A, B, a, b. "Zoo" passe avant "abeja".',
  },
  'pis-c06-main-proto': {
    title: 'Le prototype de main',
    definition:
      "Pour recevoir les arguments, on déclare int main(int argc, char **argv) : d'abord leur nombre, puis le tableau de chaînes. char *argv[] revient au même.",
    example: 'int main(int argc, char **argv) { ... return (0); }',
  },
  'pis-c06-argv-type': {
    title: "Les types d'argv",
    definition:
      'argv est un char ** : un tableau de chaînes. argv[i] est une chaîne (char *) et argv[i][j] un caractère (char) de cette chaîne.',
    example: 'Avec ./a.out hola, argv[1][0] est la lettre h.',
  },
  'pis-c06-argv-numbers': {
    title: 'Les arguments sont du texte',
    definition:
      'Tout arrive dans argv sous forme de chaînes, les nombres aussi. Pour calculer avec, il faut les convertir, par exemple avec ft_atoi.',
    example: "./a.out 42 → argv[1] vaut \"42\", c'est-à-dire '4', '2' et '\\0'.",
  },
  'pis-c06-sort-swap': {
    title: 'Trier argv en échangeant des pointeurs',
    definition:
      "Pour trier les arguments, on ne copie pas de lettres : on échange les pointeurs d'argv quand ft_strcmp dit que le premier vient après le second.",
    example: 'tmp = argv[i]; argv[i] = argv[i + 1]; argv[i + 1] = tmp;',
  },
  'pis-c06-argv-loop': {
    title: "Parcourir argv jusqu'à NULL",
    definition:
      "Comme argv[argc] vaut NULL, un while (argv[i]) s'arrête juste après le dernier argument, et à la fin i vaut argc.",
    example: "Avec ./a.out x y, la boucle s'arrête avec i = 3.",
  },
  'pis-c06-program': {
    title: 'Des programmes dans le C 06',
    definition:
      "Jusqu'au C 05, on rend des fonctions seules ; dans le C 06, chaque exercice est un programme complet, avec son main, que la Moulinette compile et lance avec des arguments.",
    example: 'ex00/ft_print_program_name.c avec un int main(int argc, char **argv).',
  },
  'pis-c07-strdup': {
    title: 'ft_strdup',
    definition:
      "Elle réserve avec malloc strlen(src) + 1 octets, vérifie que ce n'est pas NULL, copie les caractères et ajoute le '\\0' final, car malloc ne met pas la mémoire à zéro.",
    example: 'ft_strdup("Madrid") réserve 7 octets.',
  },
  'pis-c07-range': {
    title: 'ft_range',
    definition:
      "Elle renvoie un tableau d'ints réservé avec malloc, avec les nombres de min (inclus) à max (exclu) : max - min éléments. Si min >= max, elle renvoie NULL.",
    example: 'ft_range(3, 7) = {3, 4, 5, 6} ; ft_range(5, 5) = NULL.',
  },
  'pis-c07-range-bytes': {
    title: 'Ce que réserve ft_range',
    definition:
      'Il y a max - min nombres et chacun occupe sizeof(int) octets : on demande donc malloc(sizeof(int) * (max - min)). Le dernier nombre est max - 1.',
    example: 'ft_range(-2, 3) : 5 ints, 20 octets, de -2 à 2.',
  },
  'pis-c07-ultimate-range': {
    title: 'ft_ultimate_range',
    definition:
      "Elle réserve le tableau comme ft_range mais le laisse dans *range (d'où le int **) et renvoie la taille. Si min >= max, elle met *range à NULL et renvoie 0 ; si malloc échoue, elle renvoie -1.",
    example: 'int *tab; int n = ft_ultimate_range(&tab, 0, 3); → n = 3, tab = {0, 1, 2}.',
  },
  'pis-c07-strjoin': {
    title: 'ft_strjoin',
    definition:
      "Elle joint size chaînes, avec le séparateur entre chaque paire (pas à la fin), dans une nouvelle chaîne réservée avec malloc. Avec size 0, elle renvoie une chaîne vide qu'on peut libérer.",
    example: 'ft_strjoin(3, {"a", "b", "c"}, ", ") = "a, b, c" (8 octets avec le \'\\0\').',
  },
  'pis-c07-split': {
    title: 'ft_split',
    definition:
      "Elle découpe une chaîne en mots, en prenant comme séparateur n'importe quel caractère de charset. Des séparateurs collés ne donnent pas de mots vides et le tableau finit par un pointeur à 0.",
    example: 'ft_split("  hola,mundo  42", " ,") = {"hola", "mundo", "42", 0}.',
  },
  'pis-c07-split-free': {
    title: 'Libérer un char **',
    definition:
      'Ce que renvoie ft_split, ce sont plusieurs allocations : une par mot et une pour le tableau. On libère chaque mot puis, à la fin, le tableau.',
    example: 'i = 0; while (tab[i]) free(tab[i++]); free(tab);',
  },
  'pis-c07-malloc-size': {
    title: 'malloc compte des octets',
    definition:
      "malloc reçoit un nombre d'octets, pas d'éléments. Pour n éléments d'un type, il faut multiplier par son sizeof.",
    example: 'int *tab = malloc(sizeof(int) * 5); — 20 octets avec un int de 4.',
  },
  'pis-c07-leak': {
    title: 'Une fuite en réaffectant un pointeur',
    definition:
      "Si le seul pointeur vers une allocation est écrasé avant de la libérer, cette mémoire ne peut plus être libérée : c'est une fuite.",
    example: 'Version correcte : s = ft_strdup("hola"); free(s); s = ft_strdup("mundo"); free(s);',
  },
  'pis-c07-convert-base': {
    title: 'ft_convert_base',
    definition:
      "Elle lit nbr dans base_from (comme ft_atoi_base) et renvoie, réservé avec malloc, ce nombre écrit dans base_to. Si l'une des deux bases est invalide, elle renvoie NULL.",
    example: 'ft_convert_base("ff", "0123456789abcdef", "01") = "11111111".',
  },
  'pis-c07-char-pp': {
    title: 'char ** comme tableau de chaînes',
    definition:
      "Un char ** pointe vers le premier de plusieurs char *, et chacun pointe vers une chaîne. C'est le cas d'argv et du résultat de ft_split.",
    example: 'char **tab : tab[0] est le premier mot et tab[0][0] sa première lettre.',
  },
  'pis-c07-use-after-free': {
    title: 'Utiliser de la mémoire libérée',
    definition:
      "Après free(p), p garde l'adresse, mais cette mémoire ne t'appartient plus : y lire ou y écrire est un comportement indéfini. On peut mettre p = NULL après le free.",
    example: 'free(s); s = NULL; — ainsi, une erreur tombe sur NULL, pas sur des déchets.',
  },
}
