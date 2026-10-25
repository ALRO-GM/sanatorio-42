/** Banco de Not-games en francés: C (`../c-basics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const C_BASICS_FR: Readonly<Record<string, ConceptText>> = {
  'c-string-end': {
    forms: [
      {
        ask: [
          'Comment `strlen` sait-elle où se termine une chaîne de caractères en C ?',
          "Qu'est-ce qui marque la fin d'une chaîne en C ?",
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
          'Combien d\'octets la chaîne "hola" occupe-t-elle en mémoire ?',
          'Que vaut `sizeof("hola")` ?',
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
    why: "Une chaîne C est un tableau de char terminé par '\\0' : elle occupe un octet de plus que sa longueur.",
  },
  'c-sizeof-char': {
    forms: [
      {
        ask: [
          'Que vaut toujours `sizeof(char)` ?',
          "En C, combien d'octets occupe un char, par définition ?",
        ],
        right: ['1'],
        wrong: ['2', '4', '8', '0'],
      },
      {
        ask: [
          "Combien d'octets occupe un pointeur sur une machine 64 bits ?",
          'Sur x86-64, que vaut `sizeof(int *)` ?',
        ],
        right: ['8'],
        wrong: ['4', '2', '16', '1'],
      },
    ],
    wrong: ['2', '4', '16', '0'],
    why: "sizeof(char) vaut 1 par définition ; un pointeur occupe la taille d'une adresse (8 octets en 64 bits), quoi qu'il pointe.",
  },
  'c-malloc-free': {
    forms: [
      {
        ask: [
          "Que faut-il faire de la mémoire renvoyée par `malloc` quand on ne s'en sert plus ?",
          "Quand on n'a plus besoin de la mémoire allouée avec malloc, il faut…",
        ],
        right: ['La libérer avec free', 'La passer à free, une seule fois'],
        wrong: [
          'Rien : elle se libère toute seule à la sortie de la fonction',
          'La mettre à NULL, ça suffit',
          'Appeler free deux fois, par sécurité',
          'La libérer avec delete',
        ],
      },
      {
        ask: [
          "Si tu alloues avec `malloc` et que tu n'appelles jamais `free`, tu as…",
          "Comment appelle-t-on de la mémoire allouée qu'on ne peut plus libérer parce qu'on a perdu son pointeur ?",
        ],
        right: ['Une fuite de mémoire (memory leak)'],
        wrong: ['Un pointeur pendant', 'Un double free', 'Un dépassement de pile'],
      },
    ],
    wrong: [
      'Rien : elle se libère toute seule à la sortie de la fonction',
      'La mettre à NULL, ça suffit',
      'La libérer avec delete',
    ],
    why: "C n'a pas de ramasse-miettes : ce que tu demandes avec malloc, tu le rends avec free, une seule fois.",
  },
  'c-malloc-null': {
    forms: [
      {
        ask: [
          "Que renvoie `malloc` s'il ne peut pas allouer la mémoire ?",
          'Quand une allocation échoue, malloc renvoie…',
        ],
        right: ['NULL', 'Un pointeur nul'],
        wrong: [
          '-1',
          'Un pointeur vers la pile',
          'Un pointeur vers de la mémoire non initialisée',
          "Ce qu'il y avait avant",
        ],
      },
      {
        ask: [
          'Que fait `free(NULL)` ?',
          'Que se passe-t-il si tu appelles free avec un pointeur nul ?',
        ],
        right: ["Rien : c'est sans danger"],
        wrong: [
          'Une erreur de segmentation',
          'Ça compte comme un double free',
          'Le programme est arrêté (abort)',
        ],
      },
    ],
    wrong: ['-1', 'Un pointeur vers la pile', 'Le programme est arrêté (abort)'],
    why: "malloc renvoie NULL en cas d'échec (il faut le vérifier) et free(NULL) ne fait rien, par définition.",
  },
  'c-dangling': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas dans ce code ?", 'Pourquoi ce code est-il faux ?'],
        right: [
          "Il renvoie l'adresse d'une variable locale, qui cesse d'exister au retour",
          "Le pointeur renvoyé pointe vers la pile d'un appel déjà terminé",
        ],
        wrong: [
          'Il manque un cast en int*',
          'n devrait être unsigned',
          "Il n'y a aucun problème",
          'Il faut faire free(&n) avant le return',
        ],
      },
      {
        ask: [
          'Comment appelle-t-on le pointeur que renvoie f ?',
          "Un pointeur vers de la mémoire qui n'est plus valide, on l'appelle…",
        ],
        right: ['Pendant (dangling pointer)'],
        wrong: ['Nul', "Sauvage, parce qu'il n'a jamais été initialisé", 'Pointeur de fonction'],
      },
    ],
    wrong: ['Il manque un cast en int*', 'n devrait être unsigned', "Il n'y a aucun problème"],
    why: "n vit dans la pile de f ; au retour, cette mémoire est réutilisée et le pointeur n'est plus valide.",
  },
  'c-memmove-overlap': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui distingue `memmove` de `memcpy` ?",
          'Pourquoi memmove existe-t-elle alors que memcpy existe déjà ?',
        ],
        right: [
          'memmove copie correctement même si la source et la destination se chevauchent',
          'Avec des zones qui se chevauchent, seule memmove garantit le résultat',
        ],
        wrong: [
          'memmove est toujours plus rapide',
          'memmove efface la source après la copie',
          'Elles font exactement la même chose',
          'memmove ne copie que des chaînes',
        ],
      },
      {
        ask: [
          'Si la source et la destination se chevauchent, quelle fonction copie correctement ?',
          "Pour déplacer des octets à l'intérieur d'un même tableau avec chevauchement, tu utilises…",
        ],
        right: ['memmove'],
        wrong: ['memcpy', 'strcpy', 'memset', 'strlcpy'],
      },
    ],
    wrong: [
      'memmove est toujours plus rapide',
      'Elles font exactement la même chose',
      'memmove ne copie que des chaînes',
    ],
    why: "En cas de chevauchement, memcpy peut écraser ce qu'elle n'a pas encore copié ; memmove choisit le sens de la copie.",
  },
  'c-pointer-arith': {
    forms: [
      {
        ask: ["Qu'affiche ce code ?", 'Quelle est la sortie ?'],
        right: ['30'],
        wrong: ['20', '12', '10', '40'],
      },
      {
        ask: ['Vers quoi pointe `p` à la fin ?', 'Après `p += 2`, vers quoi pointe p ?'],
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
    why: 'Ajouter 2 à un int* avance de deux int, pas de deux octets : p pointe vers a[2], qui vaut 30.',
  },
  'c-string-literal-write': {
    forms: [
      {
        ask: [
          "Que se passe-t-il quand tu l'exécutes ?",
          "Ce code compile. Que se passe-t-il à l'exécution ?",
        ],
        right: [
          'Comportement indéfini : il écrit dans un littéral (souvent une segmentation fault)',
          'En général, un segfault : un littéral ne se modifie pas',
        ],
        wrong: ['Il affiche Hola', 'Il affiche hola', 'Il affiche H', 'Il a une fuite de mémoire'],
      },
      {
        ask: [
          'Comment faut-il déclarer `s` pour pouvoir en modifier les lettres ?',
          'Quelle déclaration corrige ce code ?',
        ],
        right: ['char s[] = "hola";'],
        wrong: ['const char *s = "hola";', "char *s = 'hola';", 'static char *s = "hola";'],
      },
    ],
    wrong: ['Il affiche Hola', 'Il affiche hola', 'Il affiche H'],
    why: 'Un littéral vit en mémoire en lecture seule ; char s[] = "hola" crée ta propre copie, que tu peux modifier.',
  },
  'c-off-by-one-malloc': {
    forms: [
      {
        ask: ['Cette fonction copie une chaîne. Où est le problème ?', 'Quel bug a ce strdup ?'],
        right: [
          "Elle alloue un octet de moins que nécessaire : celui du '\\0'",
          'Il faudrait allouer strlen(s) + 1',
        ],
      },
    ],
    wrong: [
      'strcpy ne copie pas le dernier caractère',
      'Il faut faire free(d) avant le return',
      "malloc a besoin d'un cast en char*",
      's devrait être char**',
      "Il n'y a aucun problème",
    ],
    why: "strlen ne compte pas le '\\0', mais strcpy le copie : elle écrit un octet en dehors de la zone allouée.",
  },
  'c-static-local': {
    forms: [
      {
        ask: [
          "Qu'a de particulier une variable locale déclarée `static` ?",
          "Qu'est-ce qui change quand tu déclares static une variable dans une fonction ?",
        ],
        right: [
          'Elle garde sa valeur entre deux appels',
          "Elle existe pendant tout le programme, même si elle n'est visible que dans la fonction",
        ],
        wrong: [
          'Elle est remise à zéro à chaque appel',
          "Elle est visible depuis d'autres fichiers",
          'Elle devient constante',
          "Elle est stockée dans la pile de l'appelant",
        ],
      },
      {
        ask: [
          "Qu'est-ce qui permet à get_next_line de se souvenir de ce qui restait de la lecture précédente ?",
          'Pour garder ce qui a été lu en trop entre deux appels à get_next_line, on utilise…',
        ],
        right: ['Une variable static'],
        wrong: [
          'Une variable locale normale',
          'Un paramètre en plus',
          'Une variable globale avec extern',
        ],
      },
    ],
    wrong: [
      'Elle est remise à zéro à chaque appel',
      "Elle est visible depuis d'autres fichiers",
      'Elle devient constante',
    ],
    why: "static donne à la variable la durée de vie du programme entier (elle n'est initialisée qu'une fois) sans changer sa portée.",
  },
  'c-read-return': {
    forms: [
      {
        ask: [
          'Que renvoie `read` en fin de fichier ?',
          'Quand il ne reste plus rien à lire, read renvoie…',
        ],
        right: ['0'],
        wrong: ['-1', '1', '42'],
      },
      {
        ask: ["Que renvoie `read` en cas d'erreur ?", 'Si read échoue, il renvoie…'],
        right: ['-1'],
        wrong: ['0', '1', '42'],
      },
      {
        ask: [
          "Si `read(fd, buf, 42)` renvoie 10, qu'est-ce qui s'est passé ?",
          "read a demandé 42 octets et en a renvoyé 10. Qu'est-ce que ça veut dire ?",
        ],
        right: [
          "Il n'y avait que 10 octets disponibles (ce n'est pas une erreur)",
          'Il a lu 10 octets, moins que demandé',
        ],
        wrong: [
          'Il y a eu une erreur',
          "Il manque 32 octets à cause d'une panne de disque",
          'Le fichier fait 52 octets',
        ],
      },
    ],
    wrong: ['1', '42', '2'],
    why: "read renvoie le nombre d'octets lus (parfois moins que demandé) : 0, c'est la fin du fichier, et -1, une erreur.",
  },
  'c-fd-standard': {
    forms: [
      {
        ask: [
          "Quel descripteur de fichier correspond à la sortie d'erreur (stderr) ?",
          'Pour écrire une erreur avec `write`, quel fd utilises-tu ?',
        ],
        right: ['2'],
        wrong: ['1', '0', '3'],
      },
      {
        ask: [
          "Quel descripteur correspond à l'entrée standard (stdin) ?",
          'Depuis quel fd `read` lit-il ce que tu tapes au clavier ?',
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
      },
      {
        ask: [
          'Quel numéro `open` donne-t-il en général au premier fichier ouvert par un programme ?',
          "Quel est le premier fd libre d'un programme qui vient de démarrer ?",
        ],
        right: ['3'],
        wrong: ['0', '2', '1'],
      },
    ],
    wrong: ['1', '-1', '4', '42'],
    why: "Par convention, 0 est l'entrée, 1 la sortie et 2 les erreurs ; open donne le plus petit numéro libre (3).",
  },
  'c-variadic': {
    forms: [
      {
        ask: [
          "Avec quoi parcourt-on les arguments d'une fonction variadique ?",
          'Pour lire les arguments de `printf(const char *fmt, ...)`, on utilise…',
        ],
        right: ['va_start, va_arg et va_end', 'Une va_list avec va_arg'],
        wrong: ['argc et argv', 'Un tableau de void*', 'malloc et free', 'getopt'],
      },
      {
        ask: [
          "Comment printf sait-il combien d'arguments on lui a passés ?",
          "D'où une fonction variadique tire-t-elle le nombre de ses arguments ?",
        ],
        right: ['Il ne le sait pas : il le déduit du format', 'De la chaîne de format'],
        wrong: ["D'argc", 'De sizeof(...)', 'Parce que va_arg renvoie NULL à la fin'],
      },
    ],
    wrong: ['argc et argv', 'Un tableau de void*', 'getopt'],
    why: "va_start commence, va_arg donne le suivant avec le type que tu indiques et va_end termine ; c'est le format qui dit combien il y en a.",
  },
  'c-printf-formats': {
    forms: [
      {
        ask: ['Qu\'affiche `printf("%x", 255)` ?', 'Que donne le format %x avec 255 ?'],
        right: ['ff'],
        wrong: ['FF', 'f', 'fff', 'ef'],
      },
      {
        ask: ['Qu\'affiche `printf("%X", 255)` ?', 'Que donne le format %X avec 255 ?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FFF', 'EF'],
      },
      {
        ask: [
          'Qu\'affiche `printf("%u", -1)` avec un int de 32 bits ?',
          "Comment s'écrit -1 avec %u (32 bits) ?",
        ],
        right: ['4294967295'],
        wrong: ['-1', '1', '2147483647'],
      },
    ],
    wrong: ['0xff', '255', '377', '11111111'],
    why: '%x et %X écrivent en hexadécimal sans préfixe (en minuscules et en majuscules) ; %u lit les bits comme non signés : -1, ce sont 32 bits à 1.',
  },
  'c-char-promotion': {
    forms: [
      {
        ask: [
          'Dans une fonction variadique, avec quel type lit-on un char passé en argument ?',
          'Pour `%c`, quel type faut-il passer à va_arg ?',
        ],
        right: ['int'],
      },
    ],
    wrong: ['char', 'unsigned char', 'char *', 'short'],
    why: 'Dans les arguments variables, char et short sont promus en int ; les lire comme char est un comportement indéfini.',
  },
  'c-list-add-front': {
    forms: [
      {
        ask: [
          'Où est le problème dans ce lstadd_front ?',
          'Elle devrait mettre `new` en tête de liste. Que se passe-t-il ?',
        ],
        right: [
          "Elle modifie une copie du pointeur : à l'extérieur, la tête ne change pas",
          'Elle devrait prendre un t_list **lst pour changer la tête',
        ],
      },
    ],
    wrong: [
      "Elle n'alloue pas de mémoire pour new",
      'Il faudrait écrire lst->next = new',
      'Il faut libérer lst',
      'Elle fonctionne bien',
      'Il manque un return',
    ],
    why: 'En C, les arguments sont passés par valeur : pour changer la tête, il faut passer son adresse.',
  },
  'c-unsigned-loop': {
    forms: [
      {
        ask: [
          "Combien de fois s'exécute cette boucle ?",
          'Elle veut compter de 10 à 0. Que se passe-t-il ?',
        ],
        right: ['Elle ne finit jamais : un size_t est toujours >= 0', "Elle tourne à l'infini"],
      },
    ],
    wrong: ['11 fois', '10 fois', 'Aucune fois', 'Ça ne compile pas', "Elle s'arrête à -1"],
    why: "size_t n'a pas de signe : en passant sous 0, il revient à la plus grande valeur et la condition est toujours vraie.",
  },
  'c-signed-overflow': {
    forms: [
      {
        ask: [
          'Que se passe-t-il en C si un int signé dépasse INT_MAX ?',
          'Que se passe-t-il quand tu ajoutes 1 à INT_MAX dans un int ?',
        ],
        right: ['Comportement indéfini', 'Indéfini : la norme ne dit pas ce qui se passe'],
        wrong: [
          'Une erreur de compilation',
          'Il reste bloqué au maximum',
          'Il lève une exception',
          'Il devient un long',
        ],
      },
      {
        ask: ['Et si un unsigned int dépasse son maximum ?', 'Que donne UINT_MAX + 1 ?'],
        right: ['Il revient à 0, de façon définie'],
        wrong: ['Comportement indéfini', 'Il reste bloqué au maximum', 'Une erreur de compilation'],
      },
    ],
    wrong: ['Une erreur de compilation', 'Il reste bloqué au maximum', 'Il lève une exception'],
    why: 'Les types non signés reviennent à 0 (arithmétique modulo 2ⁿ) ; avec un signe, le dépassement est indéfini.',
  },
  'c-makefile-relink': {
    forms: [
      {
        ask: [
          "Comment make sait-il qu'il n'a pas besoin de recompiler ?",
          'Sur quoi make se base-t-il pour décider de reconstruire une cible ?',
        ],
        right: [
          'Les dates de modification de la cible et de ses dépendances',
          'Si la cible est plus récente que tout ce dont elle a besoin',
        ],
        wrong: [
          'Un hash de chaque fichier',
          "Ce qu'il garde en mémoire d'une exécution à l'autre",
          'Rien : il recompile toujours tout',
          'Si le dossier obj existe',
        ],
      },
      {
        ask: ['À quoi sert `.PHONY` dans un Makefile ?', 'Pourquoi déclare-t-on `.PHONY: clean` ?'],
        right: [
          "Pour que make exécute la règle même s'il existe un fichier de ce nom",
          'Pour dire que la règle ne crée aucun fichier',
        ],
        wrong: [
          'Pour compiler en parallèle',
          "Pour cacher la règle dans l'aide",
          'Pour que la règle passe en premier',
        ],
      },
    ],
    wrong: [
      'Un hash de chaque fichier',
      'Rien : il recompile toujours tout',
      'Si le dossier obj existe',
    ],
    why: 'make reconstruit une cible si une de ses dépendances est plus récente ; .PHONY marque les règles qui ne sont pas des fichiers.',
  },
}
