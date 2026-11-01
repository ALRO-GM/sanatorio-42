/** Banco de Not-games en francés: la piscina, C 08 a C 13 (`../piscine-c08-c13.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C08_C13_FR: Readonly<Record<string, ConceptText>> = {
  'pis-c08-include-guard': {
    forms: [
      {
        ask: [
          'À quoi servent `#ifndef FT_H`, `#define FT_H` et `#endif` autour de ft.h ?',
          "Qu'est-ce qu'une garde d'inclusion évite dans un fichier .h ?",
        ],
        right: [
          'Que le contenu soit inclus deux fois dans le même .c',
          "Les définitions en double si on l'inclut deux fois",
        ],
        wrong: [
          'Que ft.h soit compilé avant les fichiers .c',
          'Que la norminette refuse le header',
          'Que FT_H soit déclarée comme variable globale',
          'Que le compilateur cherche ft.h dans un autre dossier',
        ],
      },
      {
        ask: [
          'Quelle directive ferme la garde ouverte par `#ifndef FT_H` ?',
          "Une garde d'inclusion commence par `#ifndef`. Avec quoi se ferme-t-elle ?",
        ],
        right: ['`#endif`'],
        wrong: ['`#undef FT_H`', '`#else`', '`#end`', '`#fi`'],
      },
    ],
    wrong: [
      'Que ft.h soit compilé avant les fichiers .c',
      'Que la norminette refuse le header',
      'Que FT_H soit déclarée comme variable globale',
    ],
    why: "La première fois, FT_H est défini et le contenu passe ; la fois suivante, #ifndef est faux et tout est sauté jusqu'à #endif.",
  },
  'pis-c08-header-content': {
    forms: [
      {
        ask: [
          'Que met-on dans un header comme ft.h ?',
          'À la piscine, que contient un fichier .h ?',
        ],
        right: [
          'Des prototypes, des macros et des typedef, sans corps de fonction',
          'Ce que les autres .c doivent connaître : prototypes et types',
        ],
        wrong: [
          'Le corps des fonctions, pour ne pas le répéter',
          'Le main du programme, que tout le monde inclut',
          'Les variables locales de chacune des fonctions',
          'Les .o déjà compilés, pour lier plus vite',
        ],
      },
      {
        ask: [
          'Comment inclure depuis un .c le ft.h qui est dans ton dossier ?',
          "Ton ft.h est à côté de main.c. Quelle ligne l'inclut ?",
        ],
        right: ['`#include "ft.h"`'],
        wrong: ['`#import "ft.h"`', '`#include ft.h`', '`#define "ft.h"`', '`include "ft.h";`'],
      },
    ],
    wrong: [
      'Le corps des fonctions, pour ne pas le répéter',
      'Le main du programme, que tout le monde inclut',
      'Les .o déjà compilés, pour lier plus vite',
    ],
    why: "Un .h annonce ce qui existe (prototypes, macros, types) et, quand il est à toi, on l'inclut avec des guillemets ; le code reste dans les .c.",
  },
  'pis-c08-macro-parens': {
    forms: [
      {
        ask: ['Que vaut `n` ?', 'Quelle valeur contient `n` après cette ligne ?'],
        right: ['9'],
        wrong: ['12', '6', '18', '8'],
      },
      {
        ask: [
          'Comment écrire DOUBLE pour obtenir le résultat attendu ?',
          "Quelle version de DOUBLE marche dans n'importe quelle expression ?",
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
    why: 'Une macro recopie le texte tel quel : DOUBLE(3) * 2 devient 3 + 3 * 2, soit 9 ; des parenthèses partout règlent le problème.',
  },
  'pis-c08-abs-macro': {
    forms: [
      {
        ask: ['Quelle valeur finit dans `n` ?', 'Que donne `ABS(2 - 5)` avec cette macro ?'],
        right: ['-7'],
        wrong: ['3', '-3', '7', '0'],
      },
      {
        ask: [
          'Pourquoi ça ne donne pas 3 ?',
          "Qu'est-ce qui fait échouer cette macro avec `2 - 5` ?",
        ],
        right: [
          'Parce que -Value devient -2 - 5 : il manque des parenthèses',
          "Parce que l'argument n'est pas entre parenthèses",
        ],
        wrong: [
          'Parce que le ternaire est interdit dans une macro',
          "Parce qu'une macro n'accepte pas d'expressions",
          "Parce que ABS ne marche qu'avec des constantes positives",
          'Parce que Value doit être écrit en minuscules',
        ],
      },
    ],
    wrong: ['3', '-3', '7'],
    why: 'Sans parenthèses, -Value se développe en -2 - 5 = -7 ; ft_abs.h doit écrire ((Value) < 0 ? -(Value) : (Value)).',
  },
  'pis-c08-define-semicolon': {
    forms: [
      {
        ask: ['Que se passe-t-il à la compilation ?', 'Que fait le compilateur avec ce code ?'],
        right: [
          'Erreur : ça devient int tab[10;];',
          'Ça ne compile pas : le ; se retrouve entre les crochets',
        ],
        wrong: [
          'Rien : le ; du #define est ignoré',
          'Ça crée un tableau de 11 int, en comptant le ;',
          'Ça compile, mais -Wall signale le ; en trop',
          'Ça crée un tableau de 10 int sans problème',
        ],
      },
    ],
    wrong: [
      'Rien : le ; du #define est ignoré',
      'Ça crée un tableau de 11 int, en comptant le ;',
      'Ça compile, mais -Wall signale le ; en trop',
    ],
    why: 'Le préprocesseur colle tout ce qui suit le nom, point-virgule compris : on ne met pas de ; à un #define.',
  },
  'pis-c08-even-macro': {
    forms: [
      {
        ask: [
          'Dans ft_boolean.h, que doit donner `EVEN(nbr)` ?',
          'Que vérifie la macro `EVEN(nbr)` de ft_boolean.h ?',
        ],
        right: ["Vrai si nbr est pair et faux s'il est impair", 'Si nbr est divisible par 2'],
        wrong: [
          'Le nombre pair le plus proche de nbr',
          'La valeur de nbr multipliée par 2',
          'Vrai si nbr est positif et faux sinon',
          'Le nombre de chiffres pairs de nbr',
        ],
      },
      {
        ask: [
          "Quelle écriture d'`EVEN` est sûre avec n'importe quel argument ?",
          'Laquelle de ces définitions de EVEN ne casse pas avec `EVEN(n + 1)` ?',
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
      'Le nombre pair le plus proche de nbr',
      'La valeur de nbr multipliée par 2',
      'Vrai si nbr est positif et faux sinon',
    ],
    why: 'EVEN est une condition (reste nul en divisant par 2), et chaque nbr est entre parenthèses pour que n + 1 ne fausse pas le calcul.',
  },
  'pis-c08-typedef-struct': {
    forms: [
      {
        ask: [
          'Que permet `typedef struct s_point t_point;` dans ft_point.h ?',
          'Avec le typedef de ft_point.h, que gagne-t-on ?',
        ],
        right: [
          'Écrire t_point au lieu de struct s_point',
          'Donner un nom plus court à struct s_point',
        ],
        wrong: [
          'Créer une variable globale appelée t_point',
          "Réserver la mémoire d'un s_point à la compilation",
          'Faire de t_point un pointeur sur struct s_point',
          'Copier la struct à chaque passage à une fonction',
        ],
      },
      {
        ask: [
          "Selon la norme de 42, quel préfixe prend le nom d'un typedef ?",
          "Dans la norme, par quoi commence le nom d'un type créé avec typedef ?",
        ],
        right: ['`t_`'],
        wrong: ['`s_`', '`g_`', '`ft_`', '`u_`'],
      },
    ],
    wrong: [
      'Créer une variable globale appelée t_point',
      "Réserver la mémoire d'un s_point à la compilation",
      'Faire de t_point un pointeur sur struct s_point',
    ],
    why: 'typedef donne un autre nom à un type existant ; la norme veut s_ pour les struct et t_ pour les typedef.',
  },
  'pis-c08-arrow': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans ce code ?",
          'Pourquoi la dernière ligne ne compile pas ?',
        ],
        right: [
          'ptr est un pointeur : il faut écrire ptr->x',
          'Avec un pointeur sur struct, on utilise -> et pas le point',
        ],
        wrong: [
          "Il faut allouer p avec malloc avant de s'en servir",
          "Les champs d'une struct ne peuvent pas changer",
          'x devrait être un char pour contenir 42',
          'Il faut écrire *ptr.x pour atteindre x',
        ],
      },
      {
        ask: [
          'Sans la flèche, comment atteindre le champ x à travers le pointeur ?',
          "Comment écrire l'accès avec flèche en utilisant l'astérisque et le point ?",
        ],
        right: ['`(*ptr).x`'],
        wrong: ['`*ptr.x`', '`&ptr.x`', '`ptr.x`', '`*(ptr.x)`'],
      },
    ],
    wrong: [
      "Il faut allouer p avec malloc avant de s'en servir",
      "Les champs d'une struct ne peuvent pas changer",
      'x devrait être un char pour contenir 42',
    ],
    why: "Le point sert pour une struct ; avec un pointeur on écrit ptr->x, c'est-à-dire (*ptr).x (le point est prioritaire sur l'astérisque).",
  },
  'pis-c08-stock-str': {
    forms: [
      {
        ask: [
          'Dans ft_strs_to_tab, comment marque-t-on la fin du tableau de t_stock_str ?',
          'Comment ft_show_tab sait-elle où finit le tableau donné par ft_strs_to_tab ?',
        ],
        right: [
          'Avec un dernier élément dont str vaut 0',
          'Par un élément final avec le pointeur str à 0',
        ],
        wrong: [
          'Avec un dernier élément dont size vaut -1',
          'Avec un élément dont copy pointe sur son str',
          "Avec un '\\0' juste après le dernier élément",
          'On ne la marque pas : la taille est dans le premier',
        ],
      },
      {
        ask: [
          'Que doit contenir `copy` dans chaque t_stock_str ?',
          "Dans struct s_stock_str, qu'est-ce que le champ copy ?",
        ],
        right: [
          'Une nouvelle copie de la chaîne, avec son propre malloc',
          'Un double de av[i] dans une mémoire allouée à part',
        ],
        wrong: [
          'Le même pointeur que str, qui pointe sur av[i]',
          "La taille de la chaîne, sans compter le '\\0'",
          "La chaîne à l'envers, pour ft_show_tab",
          "L'adresse du t_stock_str suivant du tableau",
        ],
      },
    ],
    wrong: [
      'Avec un dernier élément dont size vaut -1',
      'Avec un élément dont copy pointe sur son str',
      'On ne la marque pas : la taille est dans le premier',
    ],
    why: 'Chaque t_stock_str garde size, str (la chaîne de av) et copy (un double) ; un str à 0 termine le tableau.',
  },
  'pis-c09-ar-rc': {
    forms: [
      {
        ask: [
          'Quelle commande crée la bibliothèque statique libft.a à partir des .o ?',
          'Dans libft_creator.sh, avec quoi regroupe-t-on les .o dans libft.a ?',
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
        ask: [
          "Qu'est-ce qu'un fichier .a comme libft.a ?",
          "Qu'y a-t-il dans une bibliothèque statique ?",
        ],
        right: [
          'Une archive qui regroupe plusieurs fichiers objets',
          'Des fichiers .o empaquetés pour être liés',
        ],
        wrong: [
          "Un exécutable qui n'a pas encore de main",
          'Un header avec les prototypes, déjà compilé',
          'Un fichier texte avec la liste des .c',
          'Les .c compressés pour le rendu sur git',
        ],
      },
    ],
    wrong: ['`cc -o libft.a *.o`', '`ranlib libft.a *.c`', '`cc -c libft.a *.o`'],
    why: 'ar range des fichiers objets dans une archive (.a) : r les ajoute ou les remplace, c la crée sans prévenir si elle manquait.',
  },
  'pis-c09-cc-c': {
    forms: [
      {
        ask: [
          "Que fait l'option `-c` de cc ?",
          'Que produit `cc -Wall -Wextra -Werror -c ft_putchar.c` ?',
        ],
        right: [
          "Elle compile en .o sans lier ni créer d'exécutable",
          'Un ft_putchar.o, lié avec rien du tout',
        ],
        wrong: [
          'Elle compile et lance le programme tout de suite',
          'Elle vérifie la norme avant de compiler',
          'Elle compile tous les .c du dossier',
          'Un exécutable nommé c dans le dossier courant',
        ],
      },
    ],
    wrong: [
      'Elle compile et lance le programme tout de suite',
      'Elle vérifie la norme avant de compiler',
      'Elle compile tous les .c du dossier',
    ],
    why: "Avec -c, le compilateur s'arrête une fois le fichier objet (.o) créé ; les .o sont ensuite archivés avec ar ou liés.",
  },
  'pis-c09-link-lft': {
    forms: [
      {
        ask: [
          'Avec libft.a dans le dossier courant, comment compiler main.c avec elle ?',
          'Quelle commande lie main.c avec la libft.a qui est juste ici ?',
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
          "Quel fichier l'éditeur de liens cherche-t-il avec `-lft` ?",
          "Avec l'option `-lft`, comment s'appelle la bibliothèque cherchée ?",
        ],
        right: ['libft.a'],
        wrong: ['ft.a', 'lft.a', 'libft.h', 'ft.o'],
      },
    ],
    wrong: ['`cc main.c -L. -llibft`', '`cc main.c -I. -lft.a`', '`cc main.c -lft`'],
    why: "-L indique le dossier où chercher et -lft cherche libft.a : l'éditeur de liens ajoute lib devant et .a derrière.",
  },
  'pis-c09-make-default': {
    forms: [
      {
        ask: [
          'Si tu tapes seulement `make`, quelle règle est exécutée ?',
          'Que fait `make` quand on ne lui donne aucune règle ?',
        ],
        right: ['La première règle du Makefile', "Il exécute la première règle qu'il trouve"],
        wrong: [
          "Toujours la règle all, où qu'elle soit",
          'La dernière règle du Makefile',
          'La règle re, qui refait tout',
          "Toutes les règles, l'une après l'autre",
        ],
      },
    ],
    wrong: [
      "Toujours la règle all, où qu'elle soit",
      'La dernière règle du Makefile',
      'La règle re, qui refait tout',
    ],
    why: 'Sans argument, make exécute la première règle du fichier : voilà pourquoi all se met tout en haut.',
  },
  'pis-c09-clean-fclean': {
    forms: [
      {
        ask: [
          'Quelle différence entre `make clean` et `make fclean` ?',
          'Que supprime `fclean` que `clean` ne supprime pas ?',
        ],
        right: [
          'fclean supprime en plus la bibliothèque ou le binaire',
          'Aussi le fichier final, $(NAME), pas seulement les .o',
        ],
        wrong: [
          'clean supprime en plus la bibliothèque ou le binaire',
          'fclean ne supprime que les .o du dossier srcs',
          'fclean recompile après avoir tout supprimé',
          'Aucune : fclean est un autre nom de clean',
        ],
      },
      {
        ask: ['Que fait la règle `re` ?', 'Dans un Makefile de 42, à quoi sert `make re` ?'],
        right: [
          'fclean puis all : elle refait tout depuis zéro',
          "Elle supprime tout et recompile l'ensemble",
        ],
        wrong: [
          'Elle recompile seulement les .c modifiés',
          'Elle relance la dernière règle utilisée',
          'Elle supprime les .o et garde le binaire tel quel',
          'Elle vérifie la norme de tous les fichiers',
        ],
      },
    ],
    wrong: [
      'clean supprime en plus la bibliothèque ou le binaire',
      'fclean ne supprime que les .o du dossier srcs',
      'fclean recompile après avoir tout supprimé',
    ],
    why: 'clean enlève les .o ; fclean, les .o et $(NAME) ; re enchaîne fclean puis all.',
  },
  'pis-c09-relink': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas dans ce Makefile ?", 'Quel problème pose cette règle all ?'],
        right: [
          'all ne dépend pas de $(NAME) : elle refait libft.a à chaque fois',
          "Elle recompile et relie même si rien n'a changé",
        ],
        wrong: [
          'Il faut appeler ranlib juste après ar rc',
          '-Werror empêche de créer une bibliothèque statique',
          'NAME devrait être écrit en minuscules',
          'Une règle ne peut pas avoir deux commandes de suite',
        ],
      },
      {
        ask: [
          'Que se passe-t-il si tu tapes `make` deux fois de suite ?',
          'Après un premier `make`, que fait le second ?',
        ],
        right: [
          'Il recompile et recrée libft.a une nouvelle fois',
          "Il refait tout, alors que rien n'a changé",
        ],
        wrong: [
          "Il dit qu'il n'y a rien à faire et s'arrête",
          'Il échoue parce que libft.a existe déjà',
          'Il lance seulement ar rc, sans recompiler',
          "Il supprime libft.a et s'arrête sans compiler",
        ],
      },
    ],
    wrong: [
      'Il faut appeler ranlib juste après ar rc',
      '-Werror empêche de créer une bibliothèque statique',
      'NAME devrait être écrit en minuscules',
    ],
    why: "all n'est pas un fichier et ne dépend de rien : make l'exécute toujours ; avec all: $(NAME) et $(NAME): $(OBJS), seul ce qui a changé est refait.",
  },
  'pis-c09-make-vars': {
    forms: [
      {
        ask: [
          'Comment utiliser dans une règle la valeur de la première variable ?',
          'Dans une règle, comment écrire la valeur de la variable de la première ligne ?',
        ],
        right: ['`$(NAME)`'],
        wrong: ['`$NAME`', '`%NAME%`', '`@NAME`', '`$[NAME]`'],
      },
    ],
    wrong: ['`$NAME`', '`%NAME%`', '`@NAME`'],
    why: 'Dans make, une variable se lit avec $(NAME) ; $NAME serait lu comme la variable N suivie de AME.',
  },
  'pis-c09-include-flag': {
    forms: [
      {
        ask: [
          'À quoi sert `-I includes` à la compilation ?',
          'Tes .h sont dans le dossier includes. Que dit `-I includes` à cc ?',
        ],
        right: [
          'De chercher aussi les headers dans includes/',
          'Où trouver les .h que nomme #include',
        ],
        wrong: [
          "D'ajouter tous les .c du dossier includes",
          "De mettre l'exécutable dans includes/",
          'De lier les bibliothèques de includes/',
          'De ne pas compiler les fichiers de includes/',
        ],
      },
    ],
    wrong: [
      "D'ajouter tous les .c du dossier includes",
      "De mettre l'exécutable dans includes/",
      'De lier les bibliothèques de includes/',
    ],
    why: "-I ajoute un dossier à ceux où l'on cherche les .h ; les bibliothèques, elles, se cherchent avec -L.",
  },
  'pis-c09-split': {
    forms: [
      {
        ask: [
          'Combien de mots y a-t-il dans words avant la fin ?',
          'Combien de chaînes renvoie cet appel, sans compter la fin ?',
        ],
        right: ['3'],
        wrong: ['5', '4', '6', '2'],
      },
      {
        ask: [
          'Comment se termine le tableau renvoyé par ft_split ?',
          "Qu'est-ce qui marque la fin de words ?",
        ],
        right: [
          'Par un pointeur à 0 après le dernier mot',
          'Par une dernière case qui vaut 0 (NULL)',
        ],
        wrong: [
          'Par une chaîne vide après le dernier mot',
          'Par le nombre de mots dans la première case',
          "Par le '\\0' du dernier mot, et rien d'autre",
          'Par le charset recopié dans la dernière case',
        ],
      },
    ],
    wrong: ['5', '4', '6'],
    why: 'Chaque caractère du charset sépare, et des séparateurs collés ne créent pas de mots vides ; un pointeur à 0 ferme le tableau.',
  },
  'pis-c10-display-file-errors': {
    forms: [
      {
        ask: [
          "Qu'écrit display_file si tu ne lui donnes aucun argument ?",
          'Tu lances `./ft_display_file` sans rien. Quel message sort ?',
        ],
        right: ['File name missing.'],
        wrong: ['Too many arguments.', 'Cannot read file.', 'No such file or directory.'],
      },
      {
        ask: [
          "Qu'écrit display_file si tu lui donnes deux fichiers ?",
          'Tu lances `./ft_display_file a b`. Quel message sort ?',
        ],
        right: ['Too many arguments.'],
        wrong: ['File name missing.', 'Cannot read file.', 'Usage: ft_display_file file'],
      },
      {
        ask: [
          "Qu'écrit display_file si le fichier ne peut pas être ouvert ?",
          "Tu lances display_file avec un fichier qui n'existe pas. Quel message sort ?",
        ],
        right: ['Cannot read file.'],
        wrong: ['File name missing.', 'Too many arguments.', 'Segmentation fault'],
      },
    ],
    wrong: ['No such file or directory.', 'Permission denied.', 'Bad file descriptor.'],
    why: "Le sujet fixe les trois messages : sans fichier, File name missing. ; avec plusieurs, Too many arguments. ; en cas d'échec, Cannot read file.",
  },
  'pis-c10-stderr': {
    forms: [
      {
        ask: [
          "Pourquoi les messages d'erreur vont-ils sur le fd 2 et pas sur le 1 ?",
          "Que gagne-t-on à écrire les erreurs sur la sortie d'erreur ?",
        ],
        right: [
          "Qu'elles ne se mélangent pas à la sortie redirigée",
          "Qu'on les voie même si la sortie va dans un fichier",
        ],
        wrong: [
          'Que le fd 1 accepte seulement des nombres',
          'Que write échoue en écrivant du texte sur le fd 1',
          'Que le fd 2 est plus rapide à écrire que le 1',
          'Que le programme se termine ainsi sur une erreur',
        ],
      },
      {
        ask: [
          "Si tu fais `./ft_cat inexistant > out.txt`, où sort l'erreur ?",
          "Avec la sortie redirigée vers out.txt, où apparaît l'erreur de ft_cat ?",
        ],
        right: [
          'Dans le terminal : > ne redirige que la sortie standard',
          "À l'écran, car elle va sur le fd 2 et pas sur le 1",
        ],
        wrong: [
          'Dans out.txt, avec la sortie normale',
          'Nulle part : la redirection la jette',
          'Dans un fichier out.txt.err créé à part',
          'Au début de out.txt, avant la sortie',
        ],
      },
    ],
    wrong: [
      'Que le fd 1 accepte seulement des nombres',
      'Que write échoue en écrivant du texte sur le fd 1',
      'Que le fd 2 est plus rapide à écrire que le 1',
    ],
    why: "> ne touche que le fd 1 : ce qui part sur le 2 (stderr) s'affiche toujours dans le terminal sans salir la sortie.",
  },
  'pis-c10-open-fail': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans ce code ?",
          "Pourquoi ne détecte-t-il pas un fichier qui n'existe pas ?",
        ],
        right: [
          "open renvoie -1 en cas d'échec, pas 0",
          "L'erreur d'open est -1 : il faut tester fd < 0",
        ],
        wrong: [
          "O_RDONLY n'ouvre pas les fichiers texte",
          'Il faut appeler read avant de tester fd',
          "open donne 0 aux fichiers qui n'existent pas",
          "Le message d'erreur doit aller sur le fd 1",
        ],
      },
      {
        ask: [
          "Quel header contient le prototype d'`open` et ses flags ?",
          'Pour utiliser `open` avec O_RDONLY, que faut-il inclure ?',
        ],
        right: ['`<fcntl.h>`'],
        wrong: ['`<unistd.h>`', '`<stdio.h>`', '`<stdlib.h>`', '`<string.h>`'],
      },
    ],
    wrong: [
      "O_RDONLY n'ouvre pas les fichiers texte",
      'Il faut appeler read avant de tester fd',
      "open donne 0 aux fichiers qui n'existent pas",
    ],
    why: "open renvoie un descripteur (en général 3 ou plus) ou -1 en cas d'échec ; 0, c'est l'entrée standard. Son prototype est dans fcntl.h.",
  },
  'pis-c10-read-loop': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans cette boucle ?",
          "Avec un fichier de 10 octets, qu'est-ce qui cloche ?",
        ],
        right: [
          'Elle écrit 4096 octets même si read en a lu moins',
          'Elle sort des déchets : elle écrit plus que ce qui a été lu',
        ],
        wrong: [
          'read ne peut pas lire plus de 1024 octets à la fois',
          'La boucle devrait continuer tant que n >= 0',
          'buf doit être alloué avant avec malloc',
          'Il faut fermer fd dans la boucle, à chaque tour',
        ],
      },
      {
        ask: [
          'Quelle taille faut-il passer à write ?',
          'Pour ne pas écrire trop, que met-on en troisième argument de write ?',
        ],
        right: ['`n`'],
        wrong: ['`4096`', '`sizeof(buf) - 1`', '`ft_strlen(buf)`', '`n + 1`'],
      },
    ],
    wrong: [
      'read ne peut pas lire plus de 1024 octets à la fois',
      'La boucle devrait continuer tant que n >= 0',
      'buf doit être alloué avant avec malloc',
    ],
    why: "read indique combien d'octets il a lus : on en écrit n ; buf ne finit pas par \\0, donc strlen ne convient pas non plus.",
  },
  'pis-c10-cat-stdin': {
    forms: [
      {
        ask: [
          'Que fait ft_cat si tu ne lui donnes aucun fichier ?',
          'Comme cat, que fait `./ft_cat` sans arguments ?',
        ],
        right: [
          "Il lit l'entrée standard et la réécrit",
          'Il recopie ce qui arrive sur le fd 0 vers la sortie',
        ],
        wrong: [
          "Il écrit File name missing. et s'arrête",
          'Il ne fait rien et renvoie 0 tout de suite',
          "Il attend que quelqu'un crée un fichier",
          'Il lit le dernier fichier qui a été ouvert',
        ],
      },
      {
        ask: [
          "Quelle fonction donne le texte d'une erreur comme « No such file or directory » ?",
          "Pour écrire la raison de l'erreur dans ft_cat, qu'utilise-t-on ?",
        ],
        right: ['`strerror(errno)`'],
        wrong: ['`perror(errno)`', '`errno(strerror)`', '`write(2, errno, 4)`', '`printf(errno)`'],
      },
    ],
    wrong: [
      "Il écrit File name missing. et s'arrête",
      'Il ne fait rien et renvoie 0 tout de suite',
      "Il attend que quelqu'un crée un fichier",
    ],
    why: 'Sans fichier, cat lit le fd 0 ; quand quelque chose échoue, errno garde la cause et strerror la donne sous forme de texte.',
  },
  'pis-c10-tail-c': {
    forms: [
      {
        ask: ["Qu'affiche `ft_tail -c 5 fichier` ?", "Avec l'option -c 5, que montre ft_tail ?"],
        right: ['Les 5 derniers octets du fichier', 'Seulement la fin : ses 5 derniers octets'],
        wrong: [
          'Les 5 dernières lignes du fichier',
          'Les 5 premiers octets du fichier',
          'Tout sauf les 5 derniers octets',
          'Le fichier entier, 5 fois de suite',
        ],
      },
      {
        ask: [
          "Si le fichier contient `abcdefgh`, sans retour à la ligne final, qu'affiche `ft_tail -c 3` ?",
          'Que sort `ft_tail -c 3` pour un fichier qui ne contient que `abcdefgh` ?',
        ],
        right: ['fgh'],
        wrong: ['abc', 'efgh', 'defgh', 'gh'],
      },
    ],
    wrong: [
      'Les 5 dernières lignes du fichier',
      'Les 5 premiers octets du fichier',
      'Tout sauf les 5 derniers octets',
    ],
    why: 'tail -c N compte des octets (pas des lignes) depuis la fin : il montre les N derniers.',
  },
  'pis-c10-hexdump': {
    forms: [
      {
        ask: [
          'Comment `hexdump -C` écrit-il le caractère A dans la colonne hexadécimale ?',
          'Dans la sortie de `hexdump -C`, que voit-on pour chaque A du fichier ?',
        ],
        right: ['41'],
        wrong: ['65', '101', '10', '14'],
      },
      {
        ask: [
          "Combien d'octets `hexdump -C` affiche-t-il par ligne ?",
          "Avec -C, combien d'octets du fichier tiennent sur une ligne complète ?",
        ],
        right: ['16'],
        wrong: ['8', '32', '10', '64'],
      },
      {
        ask: [
          'Que voit-on à droite de chaque ligne de `hexdump -C` ?',
          "Avec -C, qu'y a-t-il entre les barres | | en fin de ligne ?",
        ],
        right: [
          "Les octets en texte, avec un point s'ils sont invisibles",
          'Les caractères imprimables, et . pour le reste',
        ],
        wrong: [
          'La somme de contrôle de la ligne, en hexadécimal',
          'Les mêmes octets écrits en octal',
          'Le numéro de ligne, compté en décimal',
          "La taille du fichier jusqu'à cette ligne",
        ],
      },
    ],
    wrong: ['65', '101', '10'],
    why: "'A' vaut 65, soit 41 en hexadécimal ; -C affiche le décalage, 16 octets en hexa et leur texte entre | |.",
  },
  'pis-c10-basename': {
    forms: [
      {
        ask: [
          'Pourquoi ft_cat utilise-t-il basename sur argv[0] dans ses erreurs ?',
          'Dans une erreur de ft_cat, que tire-t-on de `basename(argv[0])` ?',
        ],
        right: [
          "Le nom du programme, sans le chemin, pour l'erreur",
          "ft_cat, même s'il a été lancé en ./ft_cat",
        ],
        wrong: [
          'Le dossier où se trouve le fichier lu',
          'Le nom du fichier sans son extension',
          'Si argv[0] est un fichier lisible',
          "Le nombre d'arguments qu'on lui a donnés",
        ],
      },
    ],
    wrong: [
      'Le dossier où se trouve le fichier lu',
      'Le nom du fichier sans son extension',
      'Si argv[0] est un fichier lisible',
    ],
    why: "Comme pour cat, l'erreur commence par le nom du programme : basename retire le chemin d'argv[0] (./ft_cat donne ft_cat).",
  },
  'pis-c10-close': {
    forms: [
      {
        ask: [
          'Pourquoi faut-il faire `close(fd)` une fois la lecture finie ?',
          "Que gagne-t-on à fermer un fichier qu'on a seulement lu ?",
        ],
        right: [
          'Libérer le descripteur : il y en a un nombre maximum ouverts',
          "Rendre le fd au système pour qu'il puisse resservir",
        ],
        wrong: [
          'Que les changements de la lecture soient enregistrés',
          'Supprimer le fichier quand il ne sert plus',
          'Que read revienne au début du fichier',
          'Que le contenu lu soit effacé de buf',
        ],
      },
    ],
    wrong: [
      'Que les changements de la lecture soient enregistrés',
      'Supprimer le fichier quand il ne sert plus',
      'Que read revienne au début du fichier',
    ],
    why: 'Chaque fichier ouvert occupe un descripteur, et un processus en a un nombre limité ; close le rend.',
  },
  'pis-c11-fptr-syntax': {
    forms: [
      {
        ask: [
          'Comment déclarer f, un pointeur sur une fonction qui prend un int et renvoie un int ?',
          "Dans ft_map, le paramètre f pointe sur une fonction d'int vers int. Comment l'écrire ?",
        ],
        right: ['`int (*f)(int)`'],
        wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`', '`int f*(int)`'],
      },
      {
        ask: ['Que déclare `int *f(int)` ?', "Sans parenthèses autour de `*f`, qu'est-ce que f ?"],
        right: [
          'Une fonction qui prend un int et renvoie un int *',
          'Une fonction normale qui renvoie un pointeur sur int',
        ],
        wrong: [
          'Un pointeur sur une fonction qui prend et renvoie un int',
          'Un tableau de pointeurs sur int, de taille int',
          "Un pointeur sur int appelé f, et rien d'autre",
          'Un pointeur sur fonction qui renvoie un int *',
        ],
      },
    ],
    wrong: ['`int *f(int)`', '`int (*f(int))`', '`(int *)f(int)`'],
    why: "Les parenthèses de (*f) font de f un pointeur ; sans elles, le * s'accroche au type de retour et f devient une fonction.",
  },
  'pis-c11-foreach': {
    forms: [
      {
        ask: ["Qu'affiche cet appel ?", "Qu'est-ce qui sort à l'écran ?"],
        right: ['421'],
        wrong: ['124', '4', '7', '3'],
      },
      {
        ask: [
          "Que fait ft_foreach de la fonction qu'elle reçoit ?",
          'Dans ft_foreach, avec quoi f est-elle appelée ?',
        ],
        right: [
          "Elle l'appelle avec chaque élément de tab, dans l'ordre",
          'Une fois par élément, en lui passant tab[i]',
        ],
        wrong: [
          "Elle l'appelle une seule fois, avec tout le tableau",
          'Elle crée un nouveau tableau avec ce que renvoie f',
          'Elle compte les éléments pour lesquels f donne 1',
          "Elle l'appelle avec chaque indice i, pas tab[i]",
        ],
      },
    ],
    wrong: ['124', '4', '7'],
    why: 'ft_foreach appelle f(tab[i]) pour chaque i de 0 à length - 1 : ft_putnbr écrit 4, 2 et 1 sans séparateur.',
  },
  'pis-c11-map': {
    forms: [
      {
        ask: ['Que renvoie ft_map ?', 'Que sort `ft_map(tab, length, &f)` ?'],
        right: [
          'Un nouveau tableau avec ce que donne f pour chaque élément',
          "Un autre tableau d'int, avec f appliquée à chacun",
        ],
        wrong: [
          'Le même tab, modifié sur place par f',
          'La somme de ce que renvoie f pour chaque élément',
          "Le nombre d'éléments pour lesquels f donne 1",
          'La dernière valeur renvoyée par la fonction f',
        ],
      },
      {
        ask: [
          'Pourquoi ft_map a-t-elle besoin de malloc et pas ft_foreach ?',
          "Qu'est-ce qui oblige ft_map à allouer de la mémoire ?",
        ],
        right: [
          'Elle renvoie un nouveau tableau, qui doit rester en vie',
          'Les résultats vont dans un tableau qui survit à la fonction',
        ],
        wrong: [
          'f peut renvoyer un nombre négatif',
          'ft_foreach ne peut pas utiliser de pointeurs sur fonction',
          'length peut dépasser la taille du tableau',
          'Sans malloc, on ne peut pas appeler la fonction f',
        ],
      },
    ],
    wrong: [
      'Le même tab, modifié sur place par f',
      'La somme de ce que renvoie f pour chaque élément',
      "Le nombre d'éléments pour lesquels f donne 1",
    ],
    why: 'ft_map ne touche pas à tab : elle alloue un int * de length cases et y range f(tab[i]), qui doit survivre au retour.',
  },
  'pis-c11-count-if': {
    forms: [
      {
        ask: ['Que renvoie cet appel ?', 'Que donne ft_count_if ici ?'],
        right: ['2'],
        wrong: ['4', '1', '3', '0'],
      },
    ],
    wrong: ['4', '1', '3'],
    why: 'ft_count_if compte les éléments pour lesquels f ne donne pas 0 : piscina et norma ont plus de 3 lettres.',
  },
  'pis-c11-any': {
    forms: [
      {
        ask: ['Que renvoie ft_any ?', 'Quand `ft_any(tab, &f)` renvoie-t-elle 1 ?'],
        right: [
          '1 si f ne donne pas 0 pour au moins un élément, sinon 0',
          'Si au moins un élément fait que f ne donne pas 0',
        ],
        wrong: [
          '1 seulement si f donne 1 pour tous les éléments, sinon 0',
          "Le nombre d'éléments pour lesquels f ne donne pas 0",
          'La position du premier élément qui satisfait f',
          'Si f donne 0 pour au moins un des éléments',
        ],
      },
      {
        ask: [
          'Comment ft_any sait-elle où finit tab, sans recevoir sa taille ?',
          "ft_any n'a pas de length. Qu'est-ce qui marque la fin de tab ?",
        ],
        right: ['Un dernier pointeur qui vaut 0', 'Le dernier élément, qui vaut NULL'],
        wrong: [
          'tab a toujours 10 éléments',
          "Le '\\0' de la dernière chaîne",
          'Un appel à sizeof(tab) dedans',
          'La dernière chaîne, qui est vide',
        ],
      },
    ],
    wrong: [
      '1 seulement si f donne 1 pour tous les éléments, sinon 0',
      "Le nombre d'éléments pour lesquels f ne donne pas 0",
      'La position du premier élément qui satisfait f',
    ],
    why: "ft_any parcourt tab jusqu'au pointeur à 0 et renvoie 1 dès que f donne autre chose que 0 ; si aucun, 0.",
  },
  'pis-c11-is-sort': {
    forms: [
      {
        ask: ['Que renvoie cet appel ?', 'Que donne ft_is_sort avec ce tab ?'],
        right: ['1'],
        wrong: ['0', '4', '-1', '3'],
      },
      {
        ask: [
          'Dans ft_is_sort, que doit renvoyer f(a, b) si a est plus petit que b ?',
          'Comme strcmp, que donne la fonction de comparaison quand le premier est plus petit ?',
        ],
        right: ['Un nombre négatif', 'Une valeur inférieure à 0'],
        wrong: ['Un nombre positif', 'Toujours 1', 'Le plus petit des deux', 'Toujours 0'],
      },
    ],
    wrong: ['0', '4', '-1'],
    why: "f donne un négatif, 0 ou un positif comme strcmp ; 1, 3, 3, 7 est trié (deux égaux à la suite ne le cassent pas), d'où 1.",
  },
  'pis-c11-do-op': {
    forms: [
      {
        ask: [
          "Qu'affiche `./do-op 42 / 0` ?",
          "Dans do-op, qu'est-ce qui sort en divisant par 0 ?",
        ],
        right: ['Stop : division by zero'],
        wrong: [
          'Stop : modulo by zero',
          'Error : division by zero',
          'Floating point exception',
          'Stop : divide by zero',
        ],
      },
      {
        ask: [
          "Qu'affiche `./do-op 10 % 0` ?",
          "Dans do-op, qu'est-ce qui sort avec un modulo par 0 ?",
        ],
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
          "Qu'affiche `./do-op 5 x 3` ?",
          "Si l'opérateur n'est pas + - * / %, qu'affiche do-op ?",
        ],
        right: ['0'],
        wrong: ['15', '8', '-1', '53'],
      },
    ],
    wrong: ['Error : division by zero', 'Floating point exception', 'Stop : divide by zero'],
    why: "do-op choisit l'opération dans un tableau de pointeurs sur fonction ; le sujet impose les deux Stop et un 0 si l'opérateur n'est pas valide.",
  },
  'pis-c11-fptr-array': {
    forms: [
      {
        ask: ["Qu'affiche ce code ?", 'Quelle est la sortie, si ft_sub fait une soustraction ?'],
        right: ['6'],
        wrong: ['14', '4', '10', '-6'],
      },
      {
        ask: ["Qu'est-ce que `ops` ?", 'Que déclare la première ligne ?'],
        right: [
          'Un tableau de 2 pointeurs sur fonctions à deux int',
          'Deux pointeurs sur des fonctions qui prennent deux int',
        ],
        wrong: [
          'Une fonction qui renvoie un tableau de 2 int',
          "Un pointeur sur un tableau de 2 int, rien d'autre",
          'Un tableau de 2 int initialisé avec deux sommes',
          'Une fonction qui prend 2 int et un tableau',
        ],
      },
    ],
    wrong: ['14', '4', '10'],
    why: 'ops[i] est un pointeur sur fonction : ops[1](10, 4) appelle ft_sub(10, 4), qui vaut 6.',
  },
  'pis-c11-advanced-sort': {
    forms: [
      {
        ask: [
          "Qu'est-ce que ft_advanced_sort_string_tab change par rapport à ft_sort_string_tab ?",
          "Qu'a de plus la version advanced du tri de chaînes ?",
        ],
        right: [
          "Elle trie selon la fonction cmp qu'elle reçoit",
          "Le critère de tri vient d'un pointeur sur fonction",
        ],
        wrong: [
          "Elle trie du plus grand au plus petit, à l'inverse",
          'Elle renvoie un nouveau tableau au lieu de modifier tab',
          "Elle trie aussi les lettres à l'intérieur de chaque chaîne",
          'Elle enlève les chaînes en double après le tri',
        ],
      },
      {
        ask: [
          'Si tu passes ft_strcmp à ft_advanced_sort_string_tab, quel ordre obtiens-tu ?',
          'Avec ft_strcmp comme cmp, dans quel état finit tab ?',
        ],
        right: [
          "Dans l'ordre ASCII, comme avec ft_sort_string_tab",
          'Du plus petit au plus grand selon les codes ASCII',
        ],
        wrong: [
          'Par longueur, de la plus courte à la plus longue',
          "À l'inverse de l'ordre ASCII, du plus grand au plus petit",
          'Comme avant : ft_strcmp ne trie rien',
          'Par ordre alphabétique, sans tenir compte des majuscules',
        ],
      },
    ],
    wrong: [
      "Elle trie du plus grand au plus petit, à l'inverse",
      'Elle renvoie un nouveau tableau au lieu de modifier tab',
      "Elle trie aussi les lettres à l'intérieur de chaque chaîne",
    ],
    why: "La version advanced compare avec cmp(a, b) au lieu d'imposer l'ordre ASCII ; avec ft_strcmp, elle fait pareil que l'autre.",
  },
  'pis-c12-create-elem': {
    forms: [
      {
        ask: ['Que manque-t-il à ce ft_create_elem ?', 'Que faut-il ajouter à cette fonction ?'],
        right: [
          'Mettre elem->next à NULL et vérifier si malloc a échoué',
          'Vérifier elem et laisser next à NULL',
        ],
        wrong: [
          'Copier data avec malloc avant de le ranger',
          'Libérer elem avant de le renvoyer',
          'Allouer sizeof(t_list *) et non sizeof(t_list)',
          'Renvoyer &elem au lieu de elem',
        ],
      },
      {
        ask: ['Que vaut `elem->next` au retour ?', 'Tel quel, que contient next ?'],
        right: ['Des déchets : malloc ne met rien à 0', 'Ce qui traînait dans cette mémoire'],
        wrong: [
          'NULL, parce que malloc le met à 0',
          "L'adresse de elem lui-même",
          'Le même pointeur que data',
          "L'élément créé juste avant",
        ],
      },
    ],
    wrong: [
      'Copier data avec malloc avant de le ranger',
      'Libérer elem avant de le renvoyer',
      'Renvoyer &elem au lieu de elem',
    ],
    why: "malloc n'initialise rien : next contient des déchets et le premier parcours sort de la liste ; en plus, malloc peut renvoyer NULL.",
  },
  'pis-c12-push-front': {
    forms: [
      {
        ask: [
          'À quoi ressemble la liste, de la tête à la fin ?',
          'Dans quel ordre sont les data, en partant de list ?',
        ],
        right: ['A -> B -> C'],
        wrong: ['C -> B -> A', 'A', 'C -> A -> B', 'B -> C -> A'],
      },
      {
        ask: [
          'Et si les trois appels étaient des ft_list_push_back ?',
          'En remplaçant push_front par push_back, que donnerait-elle ?',
        ],
        right: ['C -> B -> A'],
        wrong: ['A -> B -> C', 'C', 'A -> C -> B', 'B -> A -> C'],
      },
    ],
    wrong: ['C -> A -> B', 'B -> C -> A', 'B -> A -> C'],
    why: 'push_front place chaque nouvel élément devant (le dernier arrivé passe en tête) ; push_back le met à la fin.',
  },
  'pis-c12-list-size': {
    forms: [
      {
        ask: [
          'Avec une liste de 3 éléments, que renvoie-t-elle ?',
          'Que donne-t-elle avec une liste A -> B -> C ?',
        ],
        right: ['2'],
        wrong: ['3', '4', '0', '1'],
      },
      {
        ask: [
          'Que se passe-t-il si la liste est vide ?',
          'Si begin_list vaut NULL, que fait cette fonction ?',
        ],
        right: ['Elle plante : elle lit next sur un NULL', 'Segfault en lisant begin_list->next'],
        wrong: [
          'Elle renvoie 0, comme prévu',
          "Elle renvoie -1 pour signaler l'erreur",
          'Elle tourne dans une boucle sans fin',
          "Elle renvoie 1, pour l'élément vide",
        ],
      },
      {
        ask: ['Comment la corriger ?', 'Quel changement la rend juste dans tous les cas ?'],
        right: ['Avec `while (begin_list)` au lieu de tester next'],
        wrong: [
          'Avec `while (begin_list->next->next)`',
          'En changeant `i++` en `i += 2` dans la boucle',
          'Avec `while (begin_list->data)` dans la boucle',
          'En mettant `return (i + 2);` à la fin',
        ],
      },
    ],
    wrong: ['3', '4', '0'],
    why: "Tester begin_list->next laisse le dernier de côté et plante sur une liste vide : c'est begin_list qu'il faut tester.",
  },
  'pis-c12-list-last': {
    forms: [
      {
        ask: ['Que renvoie ft_list_last ?', 'Que sort `ft_list_last(begin_list)` ?'],
        right: [
          'Un pointeur sur le dernier élément, celui dont next vaut NULL',
          'Le dernier maillon de la liste, ou NULL si elle est vide',
        ],
        wrong: [
          "Un pointeur sur l'avant-dernier élément de la liste",
          'Le data du dernier élément, déjà converti',
          "Le nombre d'éléments que contient la liste",
          'La liste sans son dernier élément, déjà libéré',
        ],
      },
      {
        ask: [
          "En cherchant le dernier élément, quand la boucle s'arrête-t-elle ?",
          'Quelle condition dit que tu es sur le dernier élément ?',
        ],
        right: ["Quand le next de l'élément courant vaut NULL", "Quand il n'y a plus de suivant"],
        wrong: [
          "Quand l'élément courant lui-même vaut NULL",
          "Quand data vaut 0 dans l'élément courant",
          'Quand next pointe de nouveau sur la tête',
          'Après autant de tours que sizeof(t_list)',
        ],
      },
    ],
    wrong: [
      "Un pointeur sur l'avant-dernier élément de la liste",
      'Le data du dernier élément, déjà converti',
      "Le nombre d'éléments que contient la liste",
    ],
    why: "Le dernier élément est celui dont next vaut NULL : on avance tant qu'il y a un suivant, puis on le renvoie.",
  },
  'pis-c12-list-clear': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans ce ft_list_clear ?",
          'Pourquoi cette boucle de libération est-elle fausse ?',
        ],
        right: [
          'Elle lit begin_list->next après free(begin_list)',
          "Elle se sert de l'élément déjà libéré pour passer au suivant",
        ],
        wrong: [
          'Elle devrait libérer data avec free, pas avec free_fct',
          "Elle libère data avant l'élément, c'est à l'envers",
          'Elle ne libère pas le dernier élément de la liste',
          'Elle devrait mettre begin_list à NULL au début',
        ],
      },
      {
        ask: ['Comment la corriger ?', 'Quel changement la rend juste ?'],
        right: [
          'Garder next dans une variable avant le free',
          'Copier begin_list->next à part, puis libérer',
        ],
        wrong: [
          'Faire free(begin_list) après la boucle',
          'Appeler free avant free_fct',
          'Mettre begin_list à NULL avant le free',
          'Parcourir la liste deux fois de suite',
        ],
      },
    ],
    wrong: [
      'Elle devrait libérer data avec free, pas avec free_fct',
      "Elle libère data avant l'élément, c'est à l'envers",
      'Elle ne libère pas le dernier élément de la liste',
    ],
    why: "Après free(begin_list), cette mémoire ne t'appartient plus : il faut mettre le suivant de côté avant de libérer.",
  },
  'pis-c12-list-at': {
    forms: [
      {
        ask: ['Quel élément renvoie `ft_list_at(list, 2)` ?', 'Que donne `ft_list_at(list, 2)` ?'],
        right: ['Celui de C'],
        wrong: ['Celui de B', 'Celui de D', 'NULL', 'Celui de A'],
      },
      {
        ask: ['Que renvoie `ft_list_at(list, 4)` ?', 'Que donne `ft_list_at(list, 4)` ?'],
        right: ['NULL'],
        wrong: ['Celui de D', 'Celui de A', 'Celui de C', 'Celui de B'],
      },
    ],
    wrong: ['Celui de B', 'Celui de D', 'Celui de A'],
    why: 'ft_list_at compte à partir de 0 (le premier est le 0) et renvoie NULL si la liste se termine avant.',
  },
  'pis-c12-reverse': {
    forms: [
      {
        ask: [
          'Avec la liste A -> B -> C, à quoi ressemble-t-elle à la fin ?',
          'Si elle commence par A -> B -> C, quelle liste en sort ?',
        ],
        right: ['C -> B -> A'],
        wrong: ['B -> A', 'C -> B -> A -> C', 'A', 'B -> C -> A'],
      },
      {
        ask: [
          'À quoi sert la variable next ?',
          'Que se passerait-il sans garder `cur->next` dans next ?',
        ],
        right: [
          'À ne pas perdre le reste de la liste quand cur->next change',
          'Sans elle, en retournant cur->next on perd la suite',
        ],
        wrong: [
          'À parcourir la liste deux fois plus vite',
          'À garder le dernier élément de la liste',
          "À libérer l'élément précédent à la fin",
          "À compter combien d'éléments a la liste",
        ],
      },
    ],
    wrong: ['B -> A', 'C -> B -> A -> C', 'B -> C -> A'],
    why: "Chaque tour retourne une flèche vers l'arrière ; next garde la suite avant de la retourner, et prev finit en nouvelle tête.",
  },
  'pis-c12-foreach': {
    forms: [
      {
        ask: [
          'Dans ft_list_foreach, que reçoit f à chaque appel ?',
          'Avec quoi f est-elle appelée dans `ft_list_foreach(begin_list, f)` ?',
        ],
        right: ['Le data de chaque élément', 'begin_list->data, un par un'],
        wrong: [
          "L'élément entier, avec son next",
          "L'adresse de begin_list",
          "L'indice de l'élément dans la liste",
          'La liste entière, une seule fois',
        ],
      },
    ],
    wrong: [
      "L'élément entier, avec son next",
      "L'adresse de begin_list",
      "L'indice de l'élément dans la liste",
    ],
    why: 'ft_list_foreach parcourt la liste et appelle f(elem->data) sur chaque élément : f ne voit jamais les pointeurs next.',
  },
  'pis-c12-remove-if': {
    forms: [
      {
        ask: [
          'Quels éléments ft_list_remove_if enlève-t-elle ?',
          'Dans ft_list_remove_if, quand un élément est-il supprimé ?',
        ],
        right: [
          'Ceux qui donnent 0 quand on compare leur data à data_ref',
          'Ceux pour lesquels cmp(data, data_ref) renvoie 0',
        ],
        wrong: [
          'Ceux qui donnent 1 ou plus comparés à data_ref',
          'Seulement le premier dont data est égal à data_ref',
          'Tous sauf ceux qui sont égaux à data_ref',
          'Ceux dont data vaut NULL, sans utiliser cmp',
        ],
      },
      {
        ask: [
          "Si celui qu'on enlève est le premier, que faut-il changer ?",
          'Quand on supprime la tête de la liste, que faut-il mettre à jour ?',
        ],
        right: [
          "*begin_list, pour qu'il pointe sur le suivant",
          'La tête : *begin_list devient le deuxième',
        ],
        wrong: [
          'Rien : le précédent pointe déjà sur le suivant',
          'Le next du premier, en le mettant à NULL',
          'Le next du dernier élément de la liste',
          "begin_list, le pointeur local, et rien d'autre",
        ],
      },
    ],
    wrong: [
      'Ceux qui donnent 1 ou plus comparés à data_ref',
      'Seulement le premier dont data est égal à data_ref',
      'Tous sauf ceux qui sont égaux à data_ref',
    ],
    why: "On retire chaque élément dont la comparaison avec data_ref donne 0 (comme strcmp), et si c'est la tête, *begin_list change.",
  },
  'pis-c12-sorted-insert': {
    code: 'list: 1 -> 3 -> 8 -> NULL\n\nOn insère 5 avec ft_sorted_list_insert',
    forms: [
      {
        ask: [
          'À quoi ressemble la liste, si cmp trie du plus petit au plus grand ?',
          'Avec cmp du plus petit au plus grand, quelle liste en sort ?',
        ],
        right: ['1 -> 3 -> 5 -> 8'],
        wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8', '1 -> 3 -> 5'],
      },
    ],
    wrong: ['5 -> 1 -> 3 -> 8', '1 -> 3 -> 8 -> 5', '1 -> 5 -> 3 -> 8'],
    why: 'ft_sorted_list_insert cherche le premier élément plus grand que le nouveau et le place devant : la liste reste triée.',
  },
  'pis-c13-prefix': {
    forms: [
      {
        ask: [
          'Dans quel ordre `btree_apply_prefix` visite-t-elle les nœuds ?',
          'Avec btree_apply_prefix et une fonction qui écrit chaque item, que sort-il ?',
        ],
        right: ['8 3 1 6 10 14'],
        wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14', '8 10 14 3 6 1'],
      },
      {
        ask: [
          'Dans un parcours préfixe, quand la racine est-elle traitée ?',
          'Quel ordre suit btree_apply_prefix à chaque nœud ?',
        ],
        right: ["La racine, puis l'enfant gauche, puis le droit"],
        wrong: [
          "L'enfant gauche, puis la racine, puis le droit",
          "L'enfant gauche, puis le droit, puis la racine",
          "L'enfant droit, puis la racine, puis le gauche",
        ],
      },
    ],
    wrong: ['1 3 6 8 10 14', '1 6 3 14 10 8', '8 3 10 1 6 14'],
    why: 'Préfixe veut dire racine, gauche, droite : 8, tout le sous-arbre de 3 (3 1 6), puis celui de 10 (10 14).',
  },
  'pis-c13-infix': {
    forms: [
      {
        ask: [
          "Qu'affiche `btree_apply_infix` avec une fonction qui écrit chaque item ?",
          'Dans quel ordre le parcours infixe visite-t-il les nœuds ?',
        ],
        right: ['A B C D F G'],
        wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G', 'G F D C B A'],
      },
      {
        ask: [
          "Dans un arbre de recherche, qu'a de particulier le parcours infixe ?",
          "Pourquoi utilise-t-on l'infixe pour sortir trié un arbre de recherche ?",
        ],
        right: [
          'Il donne les items triés du plus petit au plus grand',
          "Il visite les items dans l'ordre croissant",
        ],
        wrong: [
          "Il donne les items dans l'ordre où ils ont été insérés",
          "Il visite la racine d'abord, puis les feuilles",
          'Il donne les items triés du plus grand au plus petit',
          'Il ne visite que les feuilles, de gauche à droite',
        ],
      },
    ],
    wrong: ['D B A C F G', 'A C B G F D', 'D B F A C G'],
    why: 'Infixe veut dire gauche, racine, droite : dans un arbre de recherche, les items sortent triés.',
  },
  'pis-c13-suffix': {
    forms: [
      {
        ask: [
          "Qu'affiche `btree_apply_suffix` avec une fonction qui écrit chaque item ?",
          'Dans quel ordre le parcours suffixe visite-t-il les nœuds ?',
        ],
        right: ['2 3 * 5 +'],
        wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +', '+ 5 * 3 2'],
      },
      {
        ask: [
          'Pourquoi le parcours suffixe convient-il pour libérer un arbre ?',
          "Pour faire free de tous les nœuds, qu'a de bien le suffixe ?",
        ],
        right: [
          'Il traite les deux enfants avant leur parent',
          'Chaque nœud est libéré après ses enfants',
        ],
        wrong: [
          "C'est le plus rapide des trois parcours",
          'Il visite la racine avant tout autre nœud',
          "C'est le seul qui n'a pas besoin de récursivité",
          "Il libère d'abord tout le sous-arbre droit",
        ],
      },
    ],
    wrong: ['+ * 2 3 5', '2 * 3 + 5', '5 3 2 * +'],
    why: 'Suffixe veut dire gauche, droite, racine : les enfants passent avant leur parent, on ne libère donc jamais un nœud encore utile.',
  },
  'pis-c13-insert': {
    code: 'Arbre vide. On insère, dans cet ordre : 5, 3, 8, 4\n(btree_insert_data avec un cmpf du plus petit au plus grand)',
    forms: [
      {
        ask: ['Où finit le 4 ?', 'Quelle place prend le dernier inséré ?'],
        right: ['À droite du 3'],
        wrong: ['À gauche du 3', 'À gauche du 8', 'À droite du 5'],
      },
      {
        ask: [
          'Quel nœud reste à la racine ?',
          'Après les quatre insertions, quelle est la racine ?',
        ],
        right: ['Le 5'],
        wrong: ['Le 3', 'Le 4', 'Le 8'],
      },
      {
        ask: [
          'Si tu insères ensuite un autre 5, où va-t-il ?',
          'Un item égal à la racine, de quel côté est-il inséré ?',
        ],
        right: ['Dans le sous-arbre droit de la racine', 'Il descend à droite du 5'],
        wrong: [
          'Dans le sous-arbre gauche de la racine',
          'Nulle part : pas de doublons',
          'Il remplace la racine existante',
        ],
      },
    ],
    wrong: ['À gauche du 3', 'À gauche du 8', 'À droite du 5'],
    why: "Chaque item descend depuis la racine : à gauche s'il est plus petit, à droite s'il est égal ou plus grand. 4 < 5 et 4 > 3.",
  },
  'pis-c13-level-count': {
    forms: [
      {
        ask: [
          'Combien de niveaux `btree_level_count` compte-t-elle dans cet arbre ?',
          'Que renvoie btree_level_count avec cet arbre ?',
        ],
        right: ['4'],
        wrong: ['5', '3', '2', '6'],
      },
      {
        ask: [
          'Que renvoie btree_level_count si root vaut NULL ?',
          'Avec un arbre vide, que donne btree_level_count ?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
    ],
    wrong: ['5', '3', '2'],
    why: "Elle compte les nœuds de la plus longue branche (a, c, d, e) : 1 + le plus grand des deux enfants, et 0 s'il n'y a pas de nœud.",
  },
  'pis-c13-by-level': {
    forms: [
      {
        ask: [
          'Dans quel ordre `btree_apply_by_level` visite-t-elle les nœuds ?',
          'Avec btree_apply_by_level, quels items sortent et dans quel ordre ?',
        ],
        right: ['1 2 3 4 5 6'],
        wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1', '1 3 2 6 5 4'],
      },
      {
        ask: [
          'btree_apply_by_level appelle applyf avec trois valeurs. Lesquelles ?',
          'Que reçoit applyf dans btree_apply_by_level ?',
        ],
        right: [
          "L'item, son niveau et s'il est le premier de son niveau",
          "L'item, le niveau courant et s'il ouvre ce niveau",
        ],
        wrong: [
          "L'item, son parent et le nombre d'enfants",
          "Le nœud, son niveau et la hauteur de l'arbre",
          "L'item, l'enfant gauche et le droit",
          "L'item, sa position et le nombre total de nœuds",
        ],
      },
    ],
    wrong: ['1 2 4 3 5 6', '4 2 1 5 3 6', '4 2 5 6 3 1'],
    why: "Par niveaux, c'est en largeur : toute une rangée de gauche à droite avant de descendre à la suivante (avec une file).",
  },
  'pis-c13-create-node': {
    forms: [
      {
        ask: [
          'Comment `btree_create_node` laisse-t-elle left et right ?',
          'Un nœud tout juste créé avec btree_create_node, quels enfants a-t-il ?',
        ],
        right: ['Les deux à NULL : le nœud naît feuille', 'Aucun : left et right valent NULL'],
        wrong: [
          'Les deux pointent sur le nouveau nœud lui-même',
          'Intacts : malloc les met déjà à 0',
          'left à NULL et right qui pointe sur item',
          "Ils pointent sur la racine de l'arbre entier",
        ],
      },
    ],
    wrong: [
      'Les deux pointent sur le nouveau nœud lui-même',
      'Intacts : malloc les met déjà à 0',
      'left à NULL et right qui pointe sur item',
    ],
    why: "btree_create_node alloue un t_btree, y range item et met left et right à NULL : malloc ne s'en charge pas tout seul.",
  },
  'pis-c13-search': {
    forms: [
      {
        ask: [
          'Que renvoie btree_search_item si elle ne trouve rien ?',
          'Si aucun item ne correspond à data_ref, que donne btree_search_item ?',
        ],
        right: ['NULL'],
        wrong: ["La racine de l'arbre", 'Le dernier nœud visité', "L'item le plus proche"],
      },
      {
        ask: [
          'Quand btree_search_item considère-t-elle un item comme trouvé ?',
          "Dans btree_search_item, qu'est-ce qui indique que c'est l'item cherché ?",
        ],
        right: ['Quand cmpf avec data_ref renvoie 0', 'Quand cmpf donne 0 avec data_ref'],
        wrong: [
          'Quand cmpf avec data_ref renvoie 1',
          'Quand item et data_ref sont le même pointeur',
          'Quand cmpf donne un nombre négatif',
        ],
      },
    ],
    wrong: ["La racine de l'arbre", 'Le dernier nœud visité', "L'item le plus proche"],
    why: "cmpf marche comme strcmp : 0 veut dire égal. S'il n'y en a aucun, on renvoie NULL.",
  },
}
