/** Banco de Not-games en francés: C (`../c-basics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const C_BASICS_FR: Readonly<Record<string, ConceptText>> = {
  'c-string-end': {
    forms: [
      {
        ask: [
          'Comment `strlen` sait-elle où se termine une chaîne de caractères en C ?',
          "Qu'est-ce qui marque la fin d'une chaîne en C ?",
        ],
        right: ["Le caractère nul '\\0'", 'Le premier octet qui vaut 0'],
        wrong: [
          "Le retour à la ligne '\\n'",
          'Sa longueur, stockée dans le premier octet',
          'Le dernier espace',
          "Le caractère '0'",
        ],
      },
      {
        ask: [
          'Combien d\'octets la chaîne "hola" occupe-t-elle en mémoire ?',
          'Que vaut `sizeof("hola")` ?',
        ],
        right: ['5'],
        wrong: ['4', '8', '6', '1'],
      },
    ],
    wrong: [
      "Le retour à la ligne '\\n'",
      'Sa longueur, stockée dans le premier octet',
      'Le dernier espace',
    ],
    why: "Une chaîne C est un tableau de char terminé par '\\0' : elle occupe un octet de plus que sa longueur.",
  },
  'c-sizeof-char': {
    forms: [
      {
        ask: [
          'Que vaut toujours `sizeof(char)` ?',
          "En C, combien d'octets occupe un char, par définition ?",
        ],
        right: ['1'],
        wrong: ['2', '4', '8', '0'],
      },
      {
        ask: [
          "Combien d'octets occupe un pointeur sur une machine 64 bits ?",
          'Sur x86-64, que vaut `sizeof(int *)` ?',
        ],
        right: ['8'],
        wrong: ['4', '2', '16', '1'],
      },
    ],
    wrong: ['2', '4', '16', '0'],
    why: "sizeof(char) vaut 1 par définition ; un pointeur occupe la taille d'une adresse (8 octets en 64 bits), quoi qu'il pointe.",
  },
  'c-malloc-free': {
    forms: [
      {
        ask: [
          "Que faut-il faire de la mémoire renvoyée par `malloc` quand on ne s'en sert plus ?",
          "La mémoire réservée avec malloc, quand on n'en a plus besoin, il faut…",
        ],
        right: ['La libérer avec free', 'La passer à free, une seule fois'],
        wrong: [
          'Rien : elle se libère toute seule en sortant de la fonction',
          'La mettre à NULL, ça suffit',
          'Appeler free deux fois, par sécurité',
          'La libérer avec delete',
        ],
      },
      {
        ask: [
          "Si tu alloues avec `malloc` et que tu n'appelles jamais `free`, tu as…",
          "Comment appelle-t-on la mémoire réservée qu'on ne peut plus libérer parce qu'on a perdu son pointeur ?",
        ],
        right: ['Une fuite de mémoire'],
        wrong: ['Un pointeur pendant', 'Un double free', 'Un débordement de pile'],
      },
    ],
    wrong: [
      'Rien : elle se libère toute seule en sortant de la fonction',
      'La mettre à NULL, ça suffit',
      'La libérer avec delete',
    ],
    why: "Le C n'a pas de ramasse-miettes : ce qu'on demande avec malloc, on le rend avec free, une seule fois.",
  },
  'c-malloc-null': {
    forms: [
      {
        ask: [
          "Que renvoie `malloc` s'il ne peut pas réserver la mémoire ?",
          'Si une allocation échoue, malloc renvoie…',
        ],
        right: ['`NULL`'],
        wrong: ['`(void *)-1`', '`-1`', '`EOF`', '`ENOMEM`'],
      },
      {
        ask: [
          'Que fait `free(NULL)` ?',
          'Que se passe-t-il si tu appelles free avec un pointeur nul ?',
        ],
        right: ['Rien du tout, sans danger'],
        wrong: [
          'Une erreur de segmentation',
          'Ça compte comme un double free',
          "Le programme s'arrête net",
        ],
      },
    ],
    wrong: [
      'Une erreur de segmentation',
      "Le programme s'arrête net",
      'La mémoire est libérée deux fois',
    ],
    why: "Quand il échoue, malloc renvoie NULL (il faut le vérifier) et free(NULL) ne fait rien, c'est prévu par la norme.",
  },
  'c-dangling': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas dans ce code ?", 'Pourquoi ce code est-il faux ?'],
        right: [
          "Il renvoie l'adresse d'une variable locale",
          "Il pointe vers la pile d'un appel terminé",
        ],
        wrong: [
          'Il manque un cast de &n en int* au return',
          'Il faut faire free(&n) avant de revenir',
          "Rien ne cloche : l'appelant lit bien 42",
          'f devrait recevoir n en paramètre',
        ],
      },
      {
        ask: [
          'Comment appelle-t-on le pointeur que renvoie f ?',
          "Un pointeur vers de la mémoire qui n'est plus valide, on l'appelle…",
        ],
        right: ['Un pointeur pendant'],
        wrong: ['Un pointeur nul', 'Un pointeur de fonction', 'Un pointeur constant'],
      },
    ],
    wrong: [
      'Il manque un cast de &n en int* au return',
      'Il faut faire free(&n) avant de revenir',
      "Rien ne cloche : l'appelant lit bien 42",
    ],
    why: "n vit dans la pile de f ; au retour, cette mémoire est réutilisée et le pointeur n'est plus valide.",
  },
  'c-memmove-overlap': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui distingue `memmove` de `memcpy` ?",
          "Pourquoi memmove existe-t-il alors qu'on a déjà memcpy ?",
        ],
        right: [
          'memmove accepte que les zones se chevauchent',
          'Seul memmove copie bien avec chevauchement',
        ],
        wrong: [
          'memmove est toujours plus rapide que memcpy',
          'memmove efface la source après la copie',
          "memmove ne sert qu'à copier des chaînes",
          'Ce sont les mêmes : memmove est un autre nom de memcpy',
        ],
      },
      {
        ask: [
          'Si la source et la destination se chevauchent, quelle fonction copie correctement ?',
          'Pour déplacer des octets dans un même tableau avec chevauchement, tu utilises…',
        ],
        right: ['memmove'],
        wrong: ['memcpy', 'strcpy', 'memset', 'strlcpy'],
      },
    ],
    wrong: [
      'memmove est toujours plus rapide que memcpy',
      'memmove efface la source après la copie',
      "memmove ne sert qu'à copier des chaînes",
    ],
    why: "Quand les zones se chevauchent, memcpy peut écraser ce qu'il n'a pas encore copié ; memmove choisit le sens de la copie.",
  },
  'c-pointer-arith': {
    forms: [
      {
        ask: ["Qu'affiche ce code ?", 'Quelle est la sortie ?'],
        right: ['30'],
        wrong: ['20', '12', '10', '40'],
      },
      {
        ask: ['Vers quoi pointe `p` à la fin ?', 'Après `p += 2`, vers quoi pointe p ?'],
        right: ['Vers a[2]', 'Vers le troisième élément'],
        wrong: [
          '2 octets après a[0]',
          'Vers a[1]',
          'Vers le deuxième élément',
          'En dehors du tableau',
        ],
      },
    ],
    wrong: ['20', '12', '10', '40'],
    why: 'Ajouter 2 à un int* avance de deux int, pas de deux octets : p pointe vers a[2], qui vaut 30.',
  },
  'c-string-literal-write': {
    forms: [
      {
        ask: [
          "Que se passe-t-il à l'exécution ?",
          "Ce code compile. Que se passe-t-il quand on l'exécute ?",
        ],
        right: [
          'Comportement indéfini : souvent un segfault',
          'Souvent un segfault : un littéral ne se modifie pas',
        ],
        wrong: [
          'Il affiche Hola, avec un H majuscule',
          'Il affiche hola, car s[0] est une copie',
          "Il affiche H et s'arrête à la première lettre",
          "Il fuit : le littéral n'est jamais libéré",
        ],
      },
      {
        ask: [
          'Comment déclarer `s` pour pouvoir changer ses lettres ?',
          'Quelle déclaration corrige ce code ?',
        ],
        right: ['char s[] = "hola";'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';", 'static char *s = "hola";'],
      },
    ],
    wrong: [
      'Il affiche Hola, avec un H majuscule',
      'Il affiche hola, car s[0] est une copie',
      "Il affiche H et s'arrête à la première lettre",
    ],
    why: 'Un littéral est rangé en mémoire en lecture seule ; char s[] = "hola" en fait une copie à soi, modifiable.',
  },
  'c-off-by-one-malloc': {
    forms: [
      {
        ask: [
          "Cette fonction copie une chaîne. Qu'est-ce qui ne va pas ?",
          'Quelle erreur contient ce strdup ?',
        ],
        right: [
          "Elle alloue un octet de trop peu, celui du '\\0'",
          'Il faudrait allouer strlen(s) + 1',
        ],
      },
    ],
    wrong: [
      'strcpy ne copie pas le dernier caractère',
      'Il faut faire free(d) avant le return',
      "malloc a besoin d'un cast en char *",
      "Rien : strlen compte déjà le '\\0'",
      'd devrait être static pour être renvoyée',
    ],
    why: "strlen ne compte pas le '\\0', mais strcpy le copie bien : la fonction écrit un octet hors de la zone réservée.",
  },
  'c-static-local': {
    forms: [
      {
        ask: [
          "Qu'a de particulier une variable locale déclarée `static` ?",
          "Qu'est-ce qui change quand tu déclares static une variable dans une fonction ?",
        ],
        right: [
          'Elle garde sa valeur entre deux appels',
          'Elle vit tout le programme, pas un seul appel',
        ],
        wrong: [
          'Elle est remise à 0 à chaque appel',
          "Elle est aussi visible depuis d'autres fichiers",
          'Elle devient constante une fois affectée',
          "Elle est stockée dans la pile de l'appelant",
        ],
      },
      {
        ask: [
          "Qu'est-ce qui permet à get_next_line de se souvenir de ce qui restait de la lecture précédente ?",
          'Pour garder ce qui a été lu en trop entre deux appels à get_next_line, on utilise…',
        ],
        right: ['Une variable locale static'],
        wrong: [
          'Une variable locale normale',
          'Une variable locale register',
          'Une variable locale const',
        ],
      },
    ],
    wrong: [
      'Elle est remise à 0 à chaque appel',
      "Elle est aussi visible depuis d'autres fichiers",
      'Elle devient constante une fois affectée',
    ],
    why: "static donne à la variable la durée de vie du programme entier (elle n'est initialisée qu'une fois) sans changer sa portée.",
  },
  'c-read-return': {
    forms: [
      {
        ask: [
          'Que renvoie `read` à la fin du fichier ?',
          "Quand il n'y a plus rien à lire, read renvoie…",
        ],
        right: ['0'],
        wrong: ['-1', '1', '42'],
      },
      {
        ask: ["Que renvoie `read` en cas d'erreur ?", 'Si read échoue, il renvoie…'],
        right: ['-1'],
        wrong: ['0', '1', '42'],
      },
      {
        ask: [
          "Si `read(fd, buf, 42)` renvoie 10, que s'est-il passé ?",
          "read a demandé 42 octets et en a renvoyé 10. Qu'est-ce que ça veut dire ?",
        ],
        right: ["Il n'y avait que 10 octets à lire", 'Il a lu 10 octets, moins que demandé'],
        wrong: [
          'Une erreur est survenue en pleine lecture',
          'Il manque 32 octets à cause du disque',
          'Le fichier fait 52 octets en tout',
        ],
      },
    ],
    wrong: ['1', '42', '2'],
    why: "read renvoie le nombre d'octets lus (parfois moins que demandé) : 0 signale la fin du fichier et -1, une erreur.",
  },
  'c-fd-standard': {
    forms: [
      {
        ask: [
          "Quel descripteur de fichier correspond à la sortie d'erreur (stderr) ?",
          'Pour écrire une erreur avec `write`, quel fd utilises-tu ?',
        ],
        right: ['2'],
        wrong: ['1', '0', '3'],
      },
      {
        ask: [
          "Quel descripteur correspond à l'entrée standard (stdin) ?",
          'Depuis quel fd `read` lit-il ce que tu tapes au clavier ?',
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
      },
      {
        ask: [
          'Quel numéro `open` donne-t-il en général au premier fichier ouvert par un programme ?',
          "Quel est le premier fd libre d'un programme qui vient de démarrer ?",
        ],
        right: ['3'],
        wrong: ['0', '2', '1'],
      },
    ],
    wrong: ['1', '-1', '4', '42'],
    why: "Par convention, 0 est l'entrée, 1 la sortie et 2 les erreurs ; open donne le plus petit numéro libre (3).",
  },
  'c-variadic': {
    forms: [
      {
        ask: [
          "Avec quoi parcourt-on les arguments d'une fonction variadique ?",
          'Pour lire les arguments de `printf(const char *fmt, ...)`, on utilise…',
        ],
        right: ['va_start, va_arg et va_end', 'Une va_list avec va_arg'],
        wrong: [
          'argc et argv, comme dans main',
          'Un tableau de void * fini par NULL',
          'getopt et optarg',
          'malloc, memcpy et free',
        ],
      },
      {
        ask: [
          "Comment printf connaît-il le nombre d'arguments qu'on lui a passés ?",
          "D'où une fonction variadique tire-t-elle le nombre de ses arguments ?",
        ],
        right: [
          'Il ne le sait pas : il le déduit du format',
          'De ce que demande la chaîne de format',
        ],
        wrong: [
          "D'un argc caché que passe le compilateur",
          'De sizeof(...) sur les arguments',
          'De va_arg, qui renvoie NULL à la fin',
        ],
      },
    ],
    wrong: [
      'argc et argv, comme dans main',
      'Un tableau de void * fini par NULL',
      'getopt et optarg',
    ],
    why: "va_start commence, va_arg donne le suivant avec le type que tu indiques et va_end termine ; c'est le format qui dit combien il y en a.",
  },
  'c-printf-formats': {
    forms: [
      {
        ask: ['Qu\'affiche `printf("%x", 255)` ?', 'Que donne le format %x avec 255 ?'],
        right: ['ff'],
        wrong: ['FF', 'f', 'fff', 'ef'],
      },
      {
        ask: ['Qu\'affiche `printf("%X", 255)` ?', 'Que donne le format %X avec 255 ?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FFF', 'EF'],
      },
      {
        ask: [
          'Qu\'affiche `printf("%u", -1)` avec un int de 32 bits ?',
          "Comment s'écrit -1 avec %u (32 bits) ?",
        ],
        right: ['4294967295'],
        wrong: ['-1', '1', '2147483647'],
      },
    ],
    wrong: ['0xff', '255', '377', '11111111'],
    why: '%x et %X écrivent en hexadécimal sans préfixe (en minuscules et en majuscules) ; %u lit les bits comme non signés : -1, ce sont 32 bits à 1.',
  },
  'c-char-promotion': {
    forms: [
      {
        ask: [
          'Dans une fonction variadique, avec quel type lit-on un char passé en argument ?',
          'Pour `%c`, quel type faut-il passer à va_arg ?',
        ],
        right: ['int'],
      },
    ],
    wrong: ['char', 'unsigned char', 'char *', 'short'],
    why: 'Dans les arguments variables, char et short sont promus en int ; les lire comme char est un comportement indéfini.',
  },
  'c-list-add-front': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans ce lstadd_front ?",
          'Il devrait mettre `new` au début de la liste. Que se passe-t-il ?',
        ],
        right: [
          'Elle ne change que sa copie locale de lst',
          'Elle devrait prendre un t_list **lst',
        ],
      },
    ],
    wrong: [
      "Il manque l'allocation de new",
      'Il faudrait écrire lst->next = new',
      'Il faut libérer lst avant de la changer',
      'Ça marche : new se retrouve en tête',
    ],
    why: 'En C, les arguments passent par valeur : pour changer la tête de liste, il faut passer son adresse.',
  },
  'c-unsigned-loop': {
    forms: [
      {
        ask: [
          'Que se passe-t-il avec cette boucle ?',
          'Elle veut compter de 10 à 0. Que se passe-t-il ?',
        ],
        right: ['Elle ne finit jamais : i ne passe pas sous 0', 'Elle tourne sans fin'],
      },
    ],
    wrong: [
      'Elle finit après 11 tours',
      'Elle finit après 10 tours',
      "Elle n'entre pas une seule fois",
      'Elle ne compile pas à cause de i >= 0',
      "Elle s'arrête en arrivant à -1",
    ],
    why: "size_t n'a pas de signe : en descendant sous 0, il repart à la plus grande valeur, donc la condition reste toujours vraie.",
  },
  'c-signed-overflow': {
    forms: [
      {
        ask: [
          'Que se passe-t-il en C si un int signé dépasse INT_MAX ?',
          'Que se passe-t-il quand on ajoute 1 à INT_MAX dans un int ?',
        ],
        right: ['Comportement indéfini', 'La norme ne dit pas ce qui se passe'],
        wrong: [
          'Une erreur à la compilation',
          'Il reste bloqué à INT_MAX',
          "Une exception est levée pendant l'exécution",
          'Il devient tout seul un long',
        ],
      },
      {
        ask: [
          'Que se passe-t-il si un unsigned int dépasse son maximum ?',
          'Que donne 1 ajouté à UINT_MAX ?',
        ],
        right: ['Il repart à 0, de façon définie'],
        wrong: [
          'Comportement indéfini',
          'Il reste bloqué à UINT_MAX',
          'Une erreur à la compilation',
          'Il passe à -1, avec un signe',
        ],
      },
    ],
    wrong: [
      'Une erreur à la compilation',
      'Il reste bloqué à INT_MAX',
      'Il devient tout seul un long',
    ],
    why: 'Les unsigned font le tour (arithmétique modulo 2ⁿ) ; pour les signés, dépasser est un comportement indéfini.',
  },
  'c-makefile-relink': {
    forms: [
      {
        ask: [
          "Comment make sait-il qu'il n'a pas besoin de recompiler ?",
          'Sur quoi make se base-t-il pour décider de reconstruire une cible ?',
        ],
        right: [
          'Sur les dates de modification des fichiers',
          'Sur le fait que la cible est plus récente que ses dépendances',
        ],
        wrong: [
          'Sur un hash du contenu de chaque fichier',
          "Sur ce qu'il garde en mémoire d'une exécution à l'autre",
          'Sur rien : il recompile toujours tout',
          'Sur le fait que le dossier des objets existe déjà',
        ],
      },
      {
        ask: ['À quoi sert `.PHONY` dans un Makefile ?', 'Pourquoi déclare-t-on `.PHONY: clean` ?'],
        right: [
          "Pour l'exécuter même si un fichier porte son nom",
          'Pour indiquer que la règle ne crée aucun fichier',
        ],
        wrong: [
          'Pour compiler ses dépendances en parallèle',
          "Pour cacher la règle dans l'aide de make",
          'Pour que la règle passe avant all',
          "Pour que make n'affiche pas les commandes lancées",
        ],
      },
    ],
    wrong: [
      'Sur un hash du contenu de chaque fichier',
      'Sur rien : il recompile toujours tout',
      'Sur le fait que le dossier des objets existe déjà',
    ],
    why: 'make reconstruit une cible si une de ses dépendances est plus récente ; .PHONY marque les règles qui ne sont pas des fichiers.',
  },
  'libft-split': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_split("  hola  42 ", \' \')` ?',
          'En coupant `"  hola  42 "` sur les espaces, `ft_split` renvoie…',
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
          'Comment celui qui utilise le tableau de `ft_split` sait-il où il finit ?',
          'Le tableau que renvoie ft_split ne porte pas sa taille. Comment sait-on où il se termine ?',
        ],
        right: [
          'Parce que le dernier pointeur est NULL',
          'Grâce à un pointeur NULL après le dernier mot',
        ],
        wrong: [
          "Parce qu'il finit par une chaîne vide",
          'Parce que le premier garde le nombre de mots',
          "Parce qu'il y a un '\\0' après le dernier mot",
        ],
      },
    ],
    wrong: [
      "Parce qu'il finit par une chaîne vide",
      'Parce que le premier garde le nombre de mots',
      'Parce que ft_split prévient avec un printf',
    ],
    why: 'ft_split saute les séparateurs qui se suivent (pas de chaînes vides) et ferme le tableau par un pointeur NULL, comme argv.',
  },
  'libft-itoa': {
    forms: [
      {
        ask: [
          'Avec quel n échoue un ft_itoa qui commence par `if (n < 0) n = -n;`, avec un int de 32 bits ?',
          'Un ft_itoa change le signe avec un simple `n = -n`. Quelle valeur de n le casse ?',
        ],
        right: ['-2147483648'],
        wrong: ['-1', '0', '2147483647', '-2147483647'],
      },
      {
        ask: [
          "Combien d'octets doit allouer `ft_itoa(-42)`, en comptant le '\\0' ?",
          "En comptant le signe et le '\\0', combien d'octets occupe le résultat de `ft_itoa(-42)` ?",
        ],
        right: ['4'],
        wrong: ['3', '5', '2'],
      },
    ],
    wrong: ['1', '6', '11'],
    why: "-(-2147483648) ne tient pas dans un int (le maximum vaut 2147483647) : on traite INT_MIN à part ou avec un long ; « -42 » prend le signe, deux chiffres et le '\\0'.",
  },
  'libft-ar': {
    forms: [
      {
        ask: [
          'Quelle commande regroupe les `.o` dans la bibliothèque `libft.a` ?',
          'Pour créer `libft.a` à partir des objets compilés, le Makefile appelle…',
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
        ask: ["Qu'est-ce que `libft.a` ?", 'Quel genre de fichier est le `libft.a` que tu rends ?'],
        right: [
          'Une bibliothèque statique : les .o réunis',
          'Une archive avec les .o de tes fonctions',
        ],
        wrong: [
          'Un exécutable avec toutes les fonctions',
          'Une bibliothèque dynamique chargée au lancement',
          'Un en-tête .h déjà compilé',
          'Un .c avec toutes les fonctions réunies',
        ],
      },
    ],
    wrong: [
      'Un exécutable avec toutes les fonctions',
      'Un en-tête .h déjà compilé',
      'Un .c avec toutes les fonctions réunies',
    ],
    why: "Une bibliothèque statique .a est une archive d'objets faite avec ar ; à l'édition de liens, on copie dans le programme ceux dont il a besoin.",
  },
  'libft-lstclear': {
    forms: [
      {
        ask: [
          'Que doit faire `ft_lstclear(&lst, del)` ?',
          "D'après le sujet de la Libft, ft_lstclear doit…",
        ],
        right: [
          'Libérer chaque nœud et son contenu, puis mettre lst à NULL',
          'Effacer toute la liste et mettre le pointeur à NULL',
        ],
        wrong: [
          'Libérer seulement le premier nœud et son contenu',
          'Vider le contenu et garder les nœuds',
          'Libérer les nœuds, mais pas leur contenu',
          'Mettre lst à NULL sans rien libérer',
        ],
      },
      {
        ask: [
          'Dans `ft_lstclear`, à quoi sert le paramètre `del` ?',
          'Que fait la fonction `del` que reçoit ft_lstclear ?',
        ],
        right: ['Elle libère le contenu de chaque nœud'],
        wrong: [
          'Elle libère le nœud, mais pas son contenu',
          'Elle choisit quels nœuds sont supprimés',
          'Elle compare les contenus et ôte les doublons',
        ],
      },
    ],
    wrong: [
      'Libérer seulement le premier nœud et son contenu',
      'Vider le contenu et garder les nœuds',
      'Mettre lst à NULL sans rien libérer',
    ],
    why: 'La liste ignore ce que contient content : del le libère, free libère chaque nœud et, à la fin, le pointeur vers la liste vaut NULL.',
  },
  'printf-return': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_printf("hola %d\\n", 42)` ?',
          'Après avoir écrit `hola 42` et un saut de ligne, ft_printf renvoie…',
        ],
        right: ['8'],
        wrong: ['7', '9', '0', '2'],
      },
      {
        ask: [
          'Que doit renvoyer `ft_printf` ?',
          'Quelle valeur de retour demande le sujet de ft_printf ?',
        ],
        right: ["Le nombre de caractères qu'il a écrits"],
        wrong: [
          'Le nombre de conversions du format',
          "Le nombre d'arguments qu'il a lus",
          'La longueur de la chaîne de format',
          "Un 0 si tout s'est bien passé",
        ],
      },
    ],
    wrong: ['1', '10', '42'],
    why: 'Comme printf, ft_printf renvoie le nombre de caractères écrits : « hola 42\\n » en fait 8.',
  },
  'printf-pointer': {
    forms: [
      {
        ask: [
          'Qu\'affiche `ft_printf("%p", (void *)42)` ?',
          'Un pointeur qui vaut 42, écrit avec `%p`, donne…',
        ],
        right: ['0x2a'],
        wrong: ['42', '2a', '0x2A', '0x0000002a'],
      },
      {
        ask: [
          "Sous quelle forme `%p` écrit-il l'adresse ?",
          "Avec %p, l'adresse d'un pointeur sort en…",
        ],
        right: ['Hexadécimal, en minuscules et avec 0x'],
        wrong: [
          'Décimal, comme un unsigned long',
          'Hexadécimal en majuscules, sans 0x',
          'Binaire, avec le préfixe 0b',
          'Octal, avec un 0 devant',
        ],
      },
    ],
    wrong: ['0x42', '0X2A', '0b101010'],
    why: "%p écrit l'adresse en hexadécimal minuscule précédé de 0x, comme printf : 42 donne 0x2a.",
  },
  'printf-percent': {
    forms: [
      {
        ask: [
          'Qu\'affiche `ft_printf("%d%%", 50)` ?',
          'Avec le format `"%d%%"` et 50, on obtient…',
        ],
        right: ['50%'],
        wrong: ['50', '50%%', '5%', '0%'],
      },
      {
        ask: ['Qu\'affiche `ft_printf("%%d", 42)` ?', 'Avec le format `"%%d"` et 42, on obtient…'],
        right: ['%d'],
        wrong: ['%42', '%%d', '%d42'],
      },
    ],
    wrong: ['%%', '%50', 'd'],
    why: "%% écrit un seul % sans prendre d'argument ; ce qui suit s'affiche tel quel.",
  },
  'gnl-buffer-size': {
    forms: [
      {
        ask: [
          'Quelle option de cc fixe BUFFER_SIZE à la compilation de get_next_line ?',
          'Pour compiler get_next_line avec un tampon de 42 octets, tu passes à cc…',
        ],
        right: ['`-D BUFFER_SIZE=42`'],
        wrong: ['`-O BUFFER_SIZE=42`', '`-I BUFFER_SIZE=42`', '`-l BUFFER_SIZE=42`'],
      },
      {
        ask: [
          "Avec BUFFER_SIZE=1, combien d'appels à read faut-il pour lire la ligne `hola\\n` ?",
          'Si chaque read ramène 1 octet, combien de lectures coûte la ligne `hola\\n` ?',
        ],
        right: ['5'],
        wrong: ['1', '4', '6', '2'],
      },
      {
        ask: [
          "Avec `-D BUFFER_SIZE=10000000`, qu'est-ce qui casse si le tampon est un `char buf[BUFFER_SIZE]` local ?",
          'Un tampon local de 10 Mo dans get_next_line fait planter le programme. Pourquoi ?',
        ],
        right: ['Il ne tient pas dans la pile : il faut un malloc'],
        wrong: [
          "read ne peut pas lire autant d'un coup",
          'Ça ne compile pas : un tableau ne peut pas être si grand',
          "Rien : la pile grandit autant qu'il faut",
        ],
      },
    ],
    wrong: [
      "read ne peut pas lire autant d'un coup",
      'Ça ne compile pas : un tableau ne peut pas être si grand',
      "C'est lent : read lit octet par octet",
    ],
    why: '-D définit la macro à la compilation ; avec 1 octet, il faut un read par caractère, et un tampon de 10 Mo ne rentre pas dans la pile, qui fait en général 8 Mo.',
  },
  'gnl-last-line': {
    forms: [
      {
        ask: [
          'Un fichier finit par une ligne sans `\\n`. Comment get_next_line la renvoie-t-il ?',
          "Si la dernière ligne n'a pas de saut de ligne, get_next_line la renvoie…",
        ],
        right: ['Telle quelle, sans lui ajouter de saut'],
        wrong: [
          'Avec un saut de ligne ajouté à la fin',
          'Il ne la renvoie pas : il renvoie NULL tout de suite',
          'Vide : seules les lignes avec \\n comptent',
        ],
      },
      {
        ask: [
          "Après la dernière ligne, que renvoie l'appel suivant à get_next_line ?",
          "Quand il n'y a plus rien à lire, get_next_line renvoie…",
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`-1`'],
      },
      {
        ask: [
          'Comment get_next_line renvoie-t-il une ligne qui finit bien par un saut de ligne ?',
          'En lisant une ligne normale, avec son saut, get_next_line renvoie…',
        ],
        right: ['La ligne, avec son \\n à la fin'],
        wrong: [
          'La ligne, sans le \\n final',
          'La ligne et ce qui restait dans le tampon',
          'Seulement le \\n, sans le texte',
        ],
      },
    ],
    wrong: [
      'Avec un saut de ligne ajouté à la fin',
      'Il ne la renvoie pas : il renvoie NULL tout de suite',
      'La ligne, sans le \\n final',
    ],
    why: 'La ligne revient avec son \\n si elle en a un (la dernière peut ne pas en avoir) et, quand il ne reste rien, get_next_line renvoie NULL.',
  },
  'gnl-errors': {
    forms: [
      {
        ask: [
          'Que doit renvoyer `get_next_line(-1)` ?',
          "Avec un descripteur qui n'est pas valide, get_next_line renvoie…",
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`-1`', '`"(null)"`'],
      },
      {
        ask: [
          "Si read échoue au milieu d'une ligne, que fais-tu de ce que garde la static ?",
          'read renvoie -1 et la static contient une ligne à moitié lue. Que faut-il faire ?',
        ],
        right: ['Le libérer et renvoyer NULL'],
        wrong: [
          'Renvoyer ce qui a été lu jusque-là',
          "Le garder pour l'appel suivant",
          'Appeler exit avec une erreur',
        ],
      },
    ],
    wrong: [
      'Renvoyer ce qui a été lu jusque-là',
      "Le garder pour l'appel suivant",
      'Afficher une erreur et continuer',
    ],
    why: "En cas d'erreur (fd invalide ou read qui échoue), get_next_line renvoie NULL, et libérer ce qui était gardé évite la fuite.",
  },
  'gnl-bonus-fd': {
    forms: [
      {
        ask: [
          'Dans le bonus, que faut-il pour lire plusieurs fd en même temps ?',
          'Pour que get_next_line alterne entre plusieurs fichiers sans les mélanger, il faut…',
        ],
        right: ['Garder à part le reste de chaque fd'],
        wrong: [
          'Ouvrir les fichiers toujours dans le même ordre',
          "Lire chaque fichier en entier d'un coup",
          'Utiliser lseek pour revenir en arrière dans chaque fd',
          'Fermer chaque fd avant de passer au suivant',
        ],
      },
      {
        ask: [
          'Combien de variables static le bonus de get_next_line autorise-t-il ?',
          'Le bonus demande de le faire avec, au plus, combien de static ?',
        ],
        right: ['1'],
        wrong: ['2', '0', '3', '1024'],
      },
      {
        ask: [
          'Tu alternes les appels avec le fd 3 et le fd 4. Que renvoie chacun ?',
          'Dans le bonus, si tu appelles avec le fd 3, puis le 4 et encore le 3, chaque appel donne…',
        ],
        right: ['La ligne suivante de ce fd, sans mélange'],
        wrong: [
          'La ligne suivante du dernier fd ouvert',
          'Toujours la première ligne de chaque fichier',
          'Une ligne qui mélange les deux fd',
          'NULL : on ne peut pas mélanger les descripteurs',
        ],
      },
    ],
    wrong: [
      "Lire chaque fichier en entier d'un coup",
      'Fermer chaque fd avant de passer au suivant',
      'Ouvrir les fichiers toujours dans le même ordre',
    ],
    why: "Chaque fd a son propre reste en attente (par exemple un tableau de restes indexé par le fd), et le bonus l'exige avec une seule static.",
  },
}
