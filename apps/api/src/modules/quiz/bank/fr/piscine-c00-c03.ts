/** Banco de Not-games en francés: la piscina, C 00 a C 03 (`../piscine-c00-c03.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C00_C03_FR: Readonly<Record<string, ConceptText>> = {
  'pis-c00-putchar-write': {
    forms: [
      {
        ask: [
          'Quel appel écrit le caractère `c` dans ft_putchar ?',
          'Dans `ft_putchar(char c)`, comment écris-tu c sur la sortie standard ?',
        ],
        right: ['`write(1, &c, 1)`'],
        wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(1, &c, 4)`', '`write(&c, 1, 1)`'],
      },
      {
        ask: [
          'Quel en-tête faut-il inclure pour utiliser `write` ?',
          'Quel `#include` demande la fonction write ?',
        ],
        right: ['`#include <unistd.h>`'],
        wrong: ['`#include <stdio.h>`', '`#include <stdlib.h>`', '`#include <string.h>`'],
      },
    ],
    wrong: ['`write(1, c, 1)`', '`write(0, &c, 1)`', '`write(&c, 1, 1)`'],
    why: "write prend un descripteur (1 est la sortie standard), l'adresse de ce qu'elle écrit et le nombre d'octets ; elle est déclarée dans unistd.h.",
  },
  'pis-c00-write-return': {
    forms: [
      {
        ask: [
          'Que renvoie `write` si tout se passe bien ?',
          'Quand write réussit, sa valeur de retour est…',
        ],
        right: ["Le nombre d'octets qu'elle a écrits"],
        wrong: [
          "Le caractère qu'elle vient d'écrire",
          "Le descripteur de fichier qu'elle a utilisé",
          "Un pointeur vers le buffer qu'elle a écrit",
          "0, pour dire qu'il n'y a pas eu d'erreur",
        ],
      },
      {
        ask: [
          'Que renvoie `write` quand elle échoue ?',
          "Quand write n'arrive pas à écrire, elle renvoie…",
        ],
        right: ['-1'],
        wrong: ['0', '1', '2', '-2'],
      },
    ],
    wrong: [
      "Le caractère qu'elle vient d'écrire",
      "Le descripteur de fichier qu'elle a utilisé",
      '0',
      '1',
      '2',
    ],
    why: "write renvoie combien d'octets elle a vraiment écrits, ou -1 en cas d'erreur.",
  },
  'pis-c00-write-proto': {
    forms: [
      {
        ask: ['Quel est le prototype de `write` ?', 'Comment est déclarée la fonction write ?'],
        right: ['`ssize_t write(int fd, const void *buf, size_t count)`'],
        wrong: [
          '`int write(int fd, char *buf, int count)`',
          '`void write(int fd, const void *buf, size_t count)`',
          '`ssize_t write(const void *buf, size_t count, int fd)`',
          '`size_t write(int fd, const char *buf)`',
        ],
      },
      {
        ask: [
          'De quel type est le deuxième paramètre de `write` ?',
          'Le buffer que reçoit write, quel type a-t-il ?',
        ],
        right: ['`const void *`'],
        wrong: ['`char *`', '`const char **`', '`int`', '`void`'],
      },
    ],
    wrong: ['`int write(int fd, char *buf, int count)`', '`char *`', '`int`', '`void`'],
    why: "write reçoit le fd, un const void * vers les octets (n'importe quelle adresse convient) et leur nombre, et renvoie un ssize_t.",
  },
  'pis-c00-print-alphabet': {
    forms: [
      {
        ask: ["Qu'écrit ce code ?", 'Quelle est la sortie ?'],
        right: ['`acegikmoqsuwy`'],
        wrong: [
          '`acegikmoqsuwyz`',
          '`bdfhjlnprtvxz`',
          '`abcdefghijklmnopqrstuvwxyz`',
          '`acegikmoqsuw`',
        ],
      },
      {
        ask: ['Combien de lettres écrit-il ?', 'Combien de caractères sortent en tout ?'],
        right: ['13'],
        wrong: ['12', '14', '26', '25'],
      },
    ],
    wrong: ['`acegikmoqsuwyz`', '`bdfhjlnprtvxz`', '12', '14', '26'],
    why: "Un char est un nombre : depuis 'a' (97), il avance de deux en deux jusqu'à 'y' (121), et le suivant, 123, dépasse déjà 'z'.",
  },
  'pis-c00-reverse-alphabet': {
    forms: [
      {
        ask: ['Quelle lettre écrit-il en dernier ?', 'Par quelle lettre se termine la sortie ?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`z`'],
      },
      {
        ask: [
          'Combien de lettres écrit-il en tout ?',
          "Combien de caractères s'affichent à l'écran ?",
        ],
        right: ['25'],
        wrong: ['26', '24', '27'],
      },
    ],
    wrong: ['`a`', '`c`', '26', '24'],
    why: "Avec c > 'a', la boucle s'arrête avant d'écrire le 'a' : on obtient de 'z' à 'b', soit 25 lettres.",
  },
  'pis-c00-print-numbers': {
    forms: [
      {
        ask: [
          "Pourquoi ce code n'écrit-il pas `0123456789` ?",
          "C'était censé être ft_print_numbers. Qu'est-ce qui cloche ?",
        ],
        right: ["Il écrit les octets 0 à 9, pas les caractères '0' à '9'"],
        wrong: [
          'Rien : il écrit 0123456789 sans souci',
          'Il saute le 9 en utilisant <= au lieu de <',
          "Ça ne compile pas : write n'accepte pas un int *",
          'Il écrit les nombres de 1 à 10, un de trop',
        ],
      },
    ],
    wrong: [
      'Rien : il écrit 0123456789 sans souci',
      'Il saute le 9 en utilisant <= au lieu de <',
      "Ça ne compile pas : write n'accepte pas un int *",
    ],
    why: "write envoie l'octet qui vaut i (de 0 à 9, des caractères de contrôle) ; le chiffre '0' est l'octet 48.",
  },
  'pis-c00-char-digit': {
    forms: [
      {
        ask: ["Quelle valeur a `'0'` en ASCII ?", "Le caractère '0', en tant que nombre, vaut…"],
        right: ['48'],
        wrong: ['0', '30', '49', '65'],
      },
      {
        ask: ["Combien vaut `'7' - '0'` en C ?", "En C, la soustraction '7' - '0' donne…"],
        right: ['7'],
        wrong: ['55', '48', '0', '70'],
      },
      {
        ask: [
          "Pour passer le chiffre `n` (de 0 à 9) à son caractère, qu'écris-tu ?",
          'Quelle expression transforme un int n, de 0 à 9, en le caractère de son chiffre ?',
        ],
        right: ["`n + '0'`", '`n + 48`'],
        wrong: ["`n - '0'`", "`'n'`", "`n + 'a'`", "`n * '0'`"],
      },
    ],
    wrong: ['0', '49', '55'],
    why: "Les chiffres se suivent en ASCII à partir de '0' (48) : ajouter ou retirer '0' fait passer du nombre au caractère, et inversement.",
  },
  'pis-c00-is-negative': {
    forms: [
      {
        ask: ["Qu'écrit `ft_is_negative(0)` ?", "Si on l'appelle avec n = 0, qu'est-ce qui sort ?"],
        right: ['`P`'],
        wrong: ['`N`', '`0`', '`NP`'],
      },
    ],
    wrong: ['`N`', '`0`', '`NP`'],
    why: "0 n'est pas inférieur à 0, donc on passe par le else : ft_is_negative écrit P pour zéro, comme le demande le sujet.",
  },
  'pis-c00-print-comb': {
    forms: [
      {
        ask: [
          'Dans ft_print_comb, quelle combinaison vient juste après `019` ?',
          "ft_print_comb vient d'écrire 019. Laquelle écrit-il ensuite ?",
        ],
        right: ['`023`'],
        wrong: ['`020`', '`021`', '`029`', '`120`'],
      },
      {
        ask: [
          'Quelle est la dernière combinaison de ft_print_comb ?',
          'Par quel nombre se termine ft_print_comb ?',
        ],
        right: ['`789`'],
        wrong: ['`999`', '`987`', '`678`', '`890`'],
      },
      {
        ask: [
          'Combien de combinaisons écrit ft_print_comb ?',
          'Combien de nombres à trois chiffres distincts et croissants écrit ft_print_comb ?',
        ],
        right: ['120'],
        wrong: ['1000', '720', '84', '100'],
      },
    ],
    wrong: ['`020`', '`999`', '1000', '720'],
    why: "ft_print_comb écrit les chiffres dans un ordre strictement croissant (012, 013… 789) : ce sont les 120 façons d'en choisir 3 parmi 10.",
  },
  'pis-c00-print-comb2': {
    forms: [
      {
        ask: [
          'Dans ft_print_comb2, quelle paire vient juste après `00 99` ?',
          "ft_print_comb2 vient d'écrire 00 99. Qu'écrit-il ensuite ?",
        ],
        right: ['`01 02`'],
        wrong: ['`01 00`', '`01 01`', '`10 00`', '`00 100`'],
      },
      {
        ask: [
          'Quelle est la dernière paire écrite par ft_print_comb2 ?',
          'Par quelle paire se termine ft_print_comb2 ?',
        ],
        right: ['`98 99`'],
        wrong: ['`99 99`', '`99 98`', '`98 98`', '`89 99`'],
      },
      {
        ask: [
          'Combien de paires écrit ft_print_comb2 ?',
          'Combien de couples sortent de ft_print_comb2 ?',
        ],
        right: ['4950'],
        wrong: ['9900', '10000', '5050', '4851'],
      },
    ],
    wrong: ['`01 00`', '`99 99`', '9900', '10000'],
    why: 'ft_print_comb2 écrit des paires a < b de 00 à 99 : la première est toujours plus petite, il y en a donc 100 × 99 / 2 = 4950.',
  },
  'pis-c00-putnbr-intmin': {
    forms: [
      {
        ask: [
          'Pourquoi `ft_putnbr` ne peut-elle pas simplement faire `n = -n` avec -2147483648 ?',
          "Qu'a de spécial -2147483648 pour ft_putnbr ?",
        ],
        right: ['Son opposé, 2147483648, ne tient pas dans un int'],
        wrong: [
          'write ne sait pas écrire le signe moins',
          "C'est le seul négatif qui finit par 8",
          'Le compilateur interdit de négativer une variable',
          'Un int négatif prend 8 octets, pas 4',
        ],
      },
      {
        ask: [
          'Combien vaut INT_MIN dans un int de 32 bits ?',
          'Quel est le plus petit int qui existe, sur 32 bits ?',
        ],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-2147483649', '-4294967296', '-32768'],
      },
    ],
    wrong: [
      'write ne sait pas écrire le signe moins',
      'Le compilateur interdit de négativer une variable',
      '-2147483647',
      '-4294967296',
    ],
    why: "Un int va de -2147483648 à 2147483647 : le plus petit n'a pas d'opposé, il faut donc le traiter à part (ou passer par un long).",
  },
  'pis-c00-putnbr-code': {
    forms: [
      {
        ask: ["Qu'écrit `ft_putnbr(-42)` ?", 'Avec n = -42, quelle est la sortie ?'],
        right: ['`-42`'],
        wrong: ['`-24`', '`42`', '`24`', '`--42`'],
      },
      {
        ask: [
          'Avec quel nombre cette version se trompe-t-elle ?',
          'Quelle valeur de n ce ft_putnbr écrit-il mal ?',
        ],
        right: ['-2147483648'],
        wrong: ['2147483647', '0', '-1', '10'],
      },
    ],
    wrong: ['`-24`', '`42`', '2147483647', '0'],
    why: "La récursion écrit d'abord les chiffres de poids fort (n / 10), puis le dernier (n % 10) ; seul INT_MIN casse au moment du -n.",
  },
  'pis-c00-compile': {
    forms: [
      {
        ask: [
          'Avec quels flags doivent compiler les exercices de C de la piscine ?',
          'Quelle commande de compilation utilise la correction de la piscine ?',
        ],
        right: ['`cc -Wall -Wextra -Werror`'],
        wrong: [
          '`cc -Wall -Werror -O2`',
          '`cc -g -fsanitize=address`',
          '`cc -Wall -Wextra -std=c89`',
          '`cc -Wall -pedantic -Werror`',
        ],
      },
      {
        ask: [
          'Que fait le flag `-Werror` ?',
          "Quand tu compiles avec -Werror, qu'est-ce qui change ?",
        ],
        right: ['Il transforme chaque warning en erreur'],
        wrong: [
          'Il affiche tous les warnings possibles',
          'Il désactive les warnings du compilateur',
          'Il ajoute des infos pour le débogage',
          "Il optimise le code avant l'édition de liens",
        ],
      },
      {
        ask: [
          "Si tu compiles avec `cc main.c` et sans `-o`, comment s'appelle l'exécutable ?",
          'Quel fichier laisse cc quand tu ne lui donnes pas de nom de sortie ?',
        ],
        right: ['`a.out`'],
        wrong: ['`main`', '`main.out`', '`main.exe`', '`a.exe`'],
      },
    ],
    wrong: ['`cc -Wall -Werror -O2`', '`cc -g -fsanitize=address`', '`main`', '`main.out`'],
    why: "À la piscine, tout compile avec -Wall -Wextra -Werror (un warning est déjà une erreur), et cc sans -o laisse l'exécutable dans a.out.",
  },
  'pis-c00-print-combn': {
    forms: [
      {
        ask: [
          'Combien de combinaisons écrit `ft_print_combn(2)` ?',
          'Combien en sortent avec ft_print_combn(2) ?',
        ],
        right: ['45'],
        wrong: ['90', '100', '55', '81'],
      },
      {
        ask: [
          'Quelle combinaison écrit `ft_print_combn(4)` en premier ?',
          'Par quoi commence la sortie de ft_print_combn(4) ?',
        ],
        right: ['`0123`'],
        wrong: ['`0000`', '`1234`', '`0001`', '`0124`'],
      },
    ],
    wrong: ['90', '100', '`0000`', '`1234`'],
    why: "ft_print_combn(n) écrit n chiffres distincts dans l'ordre croissant : avec 2, ce sont les 45 paires 01… 89, et avec 4 on commence par 0123.",
  },
  'pis-c00-moulinette': {
    forms: [
      {
        ask: [
          'Un jour de C à la piscine, si un exercice est faux, que deviennent ceux qui suivent ?',
          'La Moulinette trouve le ex02 faux. Que deviennent ex03 et les suivants ?',
        ],
        right: ['Ils ne comptent pas, même justes'],
        wrong: [
          'Ils sont corrigés quand même, un par un',
          'Ils ne comptent que pour moitié',
          'Ils sont recorrigés le lendemain',
          'Ils comptent si un peer les valide',
        ],
      },
    ],
    wrong: [
      'Ils sont corrigés quand même, un par un',
      'Ils ne comptent que pour moitié',
      'Ils sont recorrigés le lendemain',
    ],
    why: "La Moulinette corrige dans l'ordre et s'arrête au premier exercice qui échoue : la suite ne rapporte rien.",
  },
  'pis-c00-norm': {
    forms: [
      {
        ask: [
          'Selon la norme de 42, quelle boucle peux-tu utiliser à la piscine ?',
          'Quelle boucle la norminette autorise-t-elle ?',
        ],
        right: ['`while`'],
        wrong: ['`for`', '`do { } while`', '`foreach`'],
      },
      {
        ask: [
          "Combien de lignes peut avoir, au maximum, le corps d'une fonction selon la norminette ?",
          'Pour la norme, combien de lignes tiennent au maximum dans une fonction ?',
        ],
        right: ['25'],
        wrong: ['20', '30', '42', '50'],
      },
      {
        ask: [
          'Combien de fonctions tiennent, au maximum, dans un fichier .c selon la norme ?',
          'La norminette fixe un maximum de fonctions par fichier. Combien ?',
        ],
        right: ['5'],
        wrong: ['4', '10', '3', '7'],
      },
    ],
    wrong: ['`for`', '`do { } while`', '20', '30'],
    why: 'La norme de 42 interdit for, do…while et switch, et limite chaque fonction à 25 lignes et chaque fichier à 5 fonctions.',
  },
  'pis-c01-ft-ft': {
    forms: [
      {
        ask: [
          'Que fait `ft_ft(int *nbr)` ?',
          "L'exercice ft_ft reçoit un int *nbr. Que doit-il faire ?",
        ],
        right: ["Mettre 42 dans l'int pointé par nbr"],
        wrong: [
          "Faire pointer nbr vers l'adresse 42",
          'Renvoyer 42 sans rien toucher',
          'Écrire 42 sur la sortie standard',
          'Mettre 42 dans une copie locale de nbr',
        ],
      },
      {
        ask: ['Quelle ligne va dans ft_ft ?', 'Avec quelle instruction fait-on ft_ft ?'],
        right: ['`*nbr = 42;`'],
        wrong: ['`nbr = 42;`', '`&nbr = 42;`', '`*nbr == 42;`', '`return (42);`'],
      },
    ],
    wrong: ["Faire pointer nbr vers l'adresse 42", 'Renvoyer 42 sans rien toucher', '`nbr = 42;`'],
    why: "nbr est l'adresse d'un int : *nbr est cet int, et lui affecter 42 le change aussi pour l'appelant.",
  },
  'pis-c01-ultimate-ft': {
    forms: [
      {
        ask: [
          "Dans `ft_ultimate_ft(int *********nbr)`, combien de `*` faut-il mettre devant nbr pour atteindre l'int ?",
          'Pour mettre 42 dans ft_ultimate_ft, combien de fois faut-il déréférencer nbr ?',
        ],
        right: ['9'],
        wrong: ['8', '10', '1', '7'],
      },
      {
        ask: [
          'Si `nbr` est un triple pointeur vers un entier, quel type a `*nbr` ?',
          'Avec un nbr à trois astérisques, de quel type est *nbr ?',
        ],
        right: ['`int **`'],
        wrong: ['`int ***`', '`int *`', '`int`', '`int ****`'],
      },
    ],
    wrong: ['8', '10', '`int *`', '`int`'],
    why: "Chaque * retire un niveau de pointeur : avec neuf étoiles dans le type, il faut neuf * pour atteindre l'int.",
  },
  'pis-c01-swap-bug': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans ce ft_swap ?",
          "Pourquoi ce ft_swap n'échange-t-il rien ?",
        ],
        right: ["Il reçoit des copies : l'appelant ne voit rien changer"],
        wrong: [
          'Il oublie de libérer tmp à la fin',
          'tmp devrait être un pointeur',
          'Il perd la valeur de a avant de la copier',
          'Il lui manque un return des deux valeurs',
        ],
      },
      {
        ask: [
          'Quel prototype a le bon ft_swap ?',
          'Comment faut-il déclarer ft_swap pour que ça marche ?',
        ],
        right: ['`void ft_swap(int *a, int *b)`'],
        wrong: [
          '`void ft_swap(int &a, int &b)`',
          '`int ft_swap(int a, int b)`',
          '`void ft_swap(int **a, int b)`',
          '`void *ft_swap(int a, int b)`',
        ],
      },
    ],
    wrong: [
      'Il oublie de libérer tmp à la fin',
      'tmp devrait être un pointeur',
      'Il lui manque un return des deux valeurs',
    ],
    why: "En C, tout passe par valeur : pour changer les variables de l'appelant, il faut recevoir leurs adresses.",
  },
  'pis-c01-pointer-alias': {
    forms: [
      {
        ask: ['Combien vaut `*p` à la fin ?', 'Combien vaut n une fois terminé ?'],
        right: ['12'],
        wrong: ['6', '10', '11', '5'],
      },
    ],
    wrong: ['6', '10', '11', '5'],
    why: 'p pointe vers n, donc *p et n sont la même variable : 5 + 1 = 6, puis 6 × 2 = 12.',
  },
  'pis-c01-div-mod': {
    forms: [
      {
        ask: [
          'Après `ft_div_mod(17, 5, &div, &mod)`, que valent div et mod ?',
          'Si on appelle ft_div_mod avec a = 17 et b = 5, que contiennent div et mod ?',
        ],
        right: ['div = 3 et mod = 2'],
        wrong: [
          'div = 3 et mod = 5',
          'div = 2 et mod = 3',
          'div = 3.4 et mod = 2',
          'div = 3 et mod = 0',
        ],
      },
      {
        ask: ['Quel prototype a ft_div_mod ?', 'Comment se déclare ft_div_mod ?'],
        right: ['`void ft_div_mod(int a, int b, int *div, int *mod)`'],
        wrong: [
          '`int ft_div_mod(int a, int b, int div, int mod)`',
          '`void ft_div_mod(int *a, int *b, int div, int mod)`',
          '`void ft_div_mod(int a, int b, int **div, int **mod)`',
          '`int *ft_div_mod(int a, int b)`',
        ],
      },
    ],
    wrong: ['div = 3 et mod = 5', 'div = 2 et mod = 3', 'div = 3.4 et mod = 2'],
    why: 'Entre int, / donne le quotient sans décimales et % le reste : 17 = 5 × 3 + 2 ; les résultats sortent par les pointeurs.',
  },
  'pis-c01-ultimate-div-mod': {
    forms: [
      {
        ask: [
          'Avec a = 17 et b = 5, que laisse `ft_ultimate_div_mod(&a, &b)` dans a et b ?',
          'ft_ultimate_div_mod reçoit les adresses de a = 17 et b = 5. Que deviennent-ils ?',
        ],
        right: ['a = 3 et b = 2'],
        wrong: ['a = 2 et b = 3', 'a = 17 et b = 5', 'a = 3 et b = 5', 'a = 3.4 et b = 2'],
      },
    ],
    wrong: ['a = 2 et b = 3', 'a = 17 et b = 5', 'a = 3 et b = 5'],
    why: "ft_ultimate_div_mod range le quotient dans *a et le reste dans *b : il faut calculer les deux avant d'en écraser un.",
  },
  'pis-c01-negative-div': {
    forms: [
      {
        ask: ['En C, combien vaut `-7 / 2` ?', 'Que donne en C la division entière -7 / 2 ?'],
        right: ['-3'],
        wrong: ['-4', '-3.5', '3', '-2'],
      },
      {
        ask: ['En C, combien vaut `-7 % 2` ?', 'Quel reste donne -7 % 2 en C ?'],
        right: ['-1'],
        wrong: ['1', '0', '-2', '3'],
      },
      {
        ask: ['En C, combien vaut `7 % -2` ?', 'Quel reste donne 7 % -2 en C ?'],
        right: ['1'],
        wrong: ['-1', '0', '2', '-3'],
      },
    ],
    wrong: ['0', '-4', '-2'],
    why: 'En C, la division entière tronque vers zéro (-3,5 devient -3) et le reste prend le signe du dividende : -7 = 2 × -3 - 1.',
  },
  'pis-c01-putstr': {
    forms: [
      {
        ask: ["Pourquoi cette boucle s'arrête-t-elle ?", "Qu'est-ce qui fait s'arrêter le while ?"],
        right: ["*str vaut '\\0' à la fin de la chaîne"],
        wrong: [
          'str finit par valoir NULL',
          'write renvoie 0 sur le dernier',
          'str++ échoue après la dernière lettre',
          'La boucle est limitée à 25 tours',
        ],
      },
      {
        ask: [
          "Qu'écrirait-il avec `write(1, &str, 1)` ?",
          'En remplaçant str par &str dans le write, que sort-il ?',
        ],
        right: ["Un octet de l'adresse de str, pas la lettre"],
        wrong: [
          "La même lettre : &str et str, c'est pareil",
          "La chaîne entière d'un seul coup",
          'Rien : &str ne compile pas avec write',
          "Les lettres de la chaîne à l'envers",
        ],
      },
    ],
    wrong: ['str finit par valoir NULL', 'write renvoie 0 sur le dernier'],
    why: "*str est la lettre pointée par str : la boucle avance jusqu'au '\\0' final, et c'est str (pas &str) qui est l'adresse de cette lettre.",
  },
  'pis-c01-strlen': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_strlen("42 Madrid")` ?',
          'Avec la chaîne "42 Madrid", que renvoie-t-elle ?',
        ],
        right: ['9'],
        wrong: ['10', '8', '2', '7'],
      },
      {
        ask: ['Que renvoie-t-elle avec la chaîne vide ?', 'Si str vaut "", que renvoie-t-elle ?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: [
          'Que se passe-t-il si on lui passe NULL ?',
          'Appelée avec str = NULL, que se passe-t-il ?',
        ],
        right: ["En général un segfault : elle lit l'adresse 0"],
        wrong: [
          'Elle renvoie 0, comme avec la chaîne vide',
          "Elle renvoie -1 pour signaler l'erreur",
          "Ça ne compile pas : NULL n'est pas un char *",
        ],
      },
    ],
    wrong: ['10', '8', '1'],
    why: "ft_strlen compte les char jusqu'au '\\0' sans le compter (l'espace, lui, compte), et ne vérifie pas NULL.",
  },
  'pis-c01-rev-int-tab': {
    forms: [
      {
        ask: ["À quoi ressemble tab après l'appel ?", "Qu'y a-t-il dans tab à la fin ?"],
        right: ['`{1, 2, 3, 4}`'],
        wrong: ['`{4, 3, 2, 1}`', '`{4, 2, 3, 1}`', '`{1, 3, 2, 4}`', '`{4, 3, 3, 4}`'],
      },
      {
        ask: [
          'Quelle condition répare la boucle ?',
          'Quel while fait vraiment inverser le tableau à la fonction ?',
        ],
        right: ['`while (i < size / 2)`'],
        wrong: [
          '`while (i <= size)`',
          '`while (i < size - 1)`',
          '`while (i > size / 2)`',
          '`while (i < size * 2)`',
        ],
      },
    ],
    wrong: ['`{4, 3, 2, 1}`', '`{4, 2, 3, 1}`', '`while (i <= size)`'],
    why: "En parcourant tout le tableau, chaque paire est échangée deux fois et revient à sa place : il suffit d'aller jusqu'à la moitié.",
  },
  'pis-c01-sort-int-tab': {
    forms: [
      {
        ask: [
          'À quoi ressemble tab après ce passage ?',
          "Qu'y a-t-il dans tab en sortant de la boucle ?",
        ],
        right: ['`{2, 1, 3}`'],
        wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`', '`{1, 3, 2}`'],
      },
      {
        ask: [
          'Que manque-t-il pour que ft_sort_int_tab trie toujours ?',
          "Pour trier n'importe quel tableau avec ça, que faut-il de plus ?",
        ],
        right: ["Répéter le passage jusqu'à ce que rien ne change"],
        wrong: [
          'Commencer la boucle à i = 1, pas à 0',
          'Comparer avec >= au lieu de >',
          'Parcourir le tableau de droite à gauche',
          "Copier d'abord le tableau dans un autre",
        ],
      },
    ],
    wrong: ['`{1, 2, 3}`', '`{2, 3, 1}`', '`{3, 2, 1}`'],
    why: "Un passage de tri à bulles n'amène que le plus grand à la fin ({3, 2, 1} devient {2, 1, 3}) : on le répète jusqu'à ce que plus rien ne bouge.",
  },
  'pis-c01-amp-star': {
    forms: [
      {
        ask: [
          'Si `n` est un entier, quel type a `&n` ?',
          'Avec n déclaré comme entier, de quel type est &n ?',
        ],
        right: ['`int *`'],
        wrong: ['`int`', '`int **`', '`int &`', '`unsigned int`'],
      },
      {
        ask: ["Avec `p = &n`, qu'est-ce que `*p` ?", 'Si p contient &n, que représente *p ?'],
        right: ['n lui-même : si tu le changes, n change'],
        wrong: [
          "L'adresse de n, en hexadécimal",
          'Une copie de n faite en affectant p',
          'La taille de n en octets',
          "L'adresse où p est rangé",
        ],
      },
    ],
    wrong: [
      '`int`',
      '`int **`',
      "L'adresse de n, en hexadécimal",
      'Une copie de n faite en affectant p',
    ],
    why: "& donne l'adresse d'une variable (un pointeur vers son type) et * va à cette adresse : *(&n), c'est le même n.",
  },
  'pis-c01-array-index': {
    forms: [
      {
        ask: [
          'Quelle expression avec des pointeurs équivaut au troisième élément de `tab` ?',
          "Avec l'arithmétique des pointeurs, comment lis-tu le troisième élément de tab ?",
        ],
        right: ['`*(tab + 2)`'],
        wrong: ['`*tab + 2`', '`&tab + 2`', '`*(tab + 3)`', '`tab + 2`'],
      },
      {
        ask: [
          'Quel indice a le dernier élément de `int tab[5]` ?',
          "Dans un tableau de 5 int, quel est l'indice du dernier ?",
        ],
        right: ['4'],
        wrong: ['5', '3', '-1'],
      },
    ],
    wrong: ['`*tab + 2`', '`tab + 2`', '5', '3'],
    why: "tab[i], c'est *(tab + i), et le pointeur avance d'un int à la fois ; les indices vont de 0 à size - 1.",
  },
  'pis-c02-strcpy': {
    forms: [
      {
        ask: ['Que manque-t-il à ce ft_strcpy ?', "Qu'est-ce que cette copie fait mal ?"],
        right: ["Copier le '\\0' final dans dest"],
        wrong: [
          'Renvoyer src au lieu de dest',
          "Allouer dest avec malloc d'abord",
          'Vérifier que dest est plus longue',
          'Copier en partant de la fin',
        ],
      },
      {
        ask: [
          'Si dest contenait `"xxxxxx"`, quelle chaîne reste après avoir copié `"hola"` ?',
          'Avec dest = "xxxxxx" et src = "hola", quelle chaîne lit-on ensuite dans dest ?',
        ],
        right: ['`holaxx`'],
        wrong: ['`hola`', '`xxhola`', '`hol`'],
      },
    ],
    wrong: [
      'Renvoyer src au lieu de dest',
      "Allouer dest avec malloc d'abord",
      'Vérifier que dest est plus longue',
    ],
    why: "Sans copier le '\\0', dest se termine là où elle se terminait avant : les restes de son ancien contenu restent collés derrière.",
  },
  'pis-c02-strncpy-pad': {
    forms: [
      {
        ask: [
          'Que laisse ft_strncpy dans les 5 premiers octets de dest ?',
          'Que contiennent dest[0] à dest[4] ?',
        ],
        right: ["`'a' 'b' '\\0' '\\0' '\\0'`"],
        wrong: [
          "`'a' 'b' '\\0'` et deux intacts",
          "`'a' 'b' 'a' 'b' 'a'`",
          "`'a' 'b' ' ' ' ' ' '`",
          "`'a' 'b' '\\0' '0' '0'`",
        ],
      },
      {
        ask: [
          'Si elle copiait "abcdefgh" au lieu de "ab", à quoi ressemblerait dest ?',
          'Avec src = "abcdefgh" et n = 5, que laisse ft_strncpy dans dest ?',
        ],
        right: ["abcde, sans '\\0' derrière"],
        wrong: [
          "abcd, avec un '\\0' à la fin",
          'Tout abcdefgh, en débordant',
          'Vide : elle ne copie rien si ça ne tient pas',
          "abcde, avec un '\\0' dans dest[5]",
        ],
      },
    ],
    wrong: ['Tout abcdefgh, en débordant', 'Vide : elle ne copie rien si ça ne tient pas'],
    why: "strncpy écrit toujours n octets : si src est plus courte, elle complète avec des '\\0', et si elle est plus longue, elle coupe sans '\\0'.",
  },
  'pis-c02-str-is-numeric': {
    forms: [
      {
        ask: [
          "Que renvoient ces trois appels, dans l'ordre ?",
          'Que donne chaque appel, de haut en bas ?',
        ],
        right: ['`1 1 0`'],
        wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`', '`0 0 0`'],
      },
    ],
    wrong: ['`0 1 0`', '`0 1 1`', '`1 1 1`'],
    why: "Les ft_str_is_* renvoient 1 pour la chaîne vide (rien n'y fait échouer le test), et le '-' n'est pas un chiffre.",
  },
  'pis-c02-str-is-printable': {
    forms: [
      {
        ask: [
          'Quels caractères accepte ft_str_is_printable ?',
          'Pour ft_str_is_printable, quelle plage ASCII est imprimable ?',
        ],
        right: ["De 32 (l'espace) à 126 (~)"],
        wrong: [
          'De 0 à 127, toute la table',
          'De 33 (!) à 127 (DEL)',
          'Seulement les lettres et les chiffres',
          "De 48 ('0') à 122 ('z')",
        ],
      },
    ],
    wrong: [
      'De 0 à 127, toute la table',
      'De 33 (!) à 127 (DEL)',
      'Seulement les lettres et les chiffres',
    ],
    why: "En ASCII, les imprimables vont de l'espace (32) au tilde (126) ; en dessous, et le 127, ce sont des caractères de contrôle.",
  },
  'pis-c02-str-is-lowercase': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_str_is_lowercase("hola mundo")` ?',
          'ft_str_is_lowercase reçoit "hola mundo". Que renvoie-t-elle, et pourquoi ?',
        ],
        right: ["0, car l'espace n'est pas une minuscule"],
        wrong: [
          '1, car toutes ses lettres le sont',
          '1, car les espaces ne comptent pas',
          '0, car il y a deux mots',
          '9, le nombre de minuscules',
        ],
      },
    ],
    wrong: [
      '1, car toutes ses lettres le sont',
      '1, car les espaces ne comptent pas',
      '0, car il y a deux mots',
    ],
    why: "ft_str_is_lowercase ne renvoie 1 que si chaque caractère est entre 'a' et 'z' : l'espace suffit à tout faire tomber.",
  },
  'pis-c02-str-is-alpha-bug': {
    forms: [
      {
        ask: [
          "Qu'est-ce que cette version fait mal ?",
          'Pourquoi ne respecte-t-elle pas le sujet ?',
        ],
        right: ['Elle renvoie 1 dès une minuscule et refuse les majuscules'],
        wrong: [
          "Rien : c'est exactement ce que demande le sujet",
          'Elle accepte aussi les chiffres comme des lettres',
          'Elle renvoie 1 pour la chaîne vide, à tort',
          "Elle sort de la chaîne en ne regardant pas le '\\0'",
        ],
      },
      {
        ask: [
          'Que renvoie-t-elle avec `"ABC"` ?',
          'Si str vaut "ABC", que renvoie cette version ?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '3'],
      },
    ],
    wrong: [
      "Rien : c'est exactement ce que demande le sujet",
      'Elle accepte aussi les chiffres comme des lettres',
      '1',
    ],
    why: "Il faut vérifier chaque caractère (dès qu'un n'est pas une lettre, 0) et accepter de a à z et de A à Z.",
  },
  'pis-c02-strupcase': {
    forms: [
      {
        ask: [
          'Que se passe-t-il si on remplace `-= 32` par `+= 32` ?',
          'En ajoutant 32 au lieu de le retirer, que fait la fonction ?',
        ],
        right: ["Les minuscules deviennent d'autres signes, pas des majuscules"],
        wrong: [
          'Elle met la chaîne en minuscules au lieu de majuscules',
          'Rien : ajouter ou retirer 32 donne la même lettre',
          "Ça ne compile pas : un char n'accepte pas +=",
          'Elle change les majuscules et laisse les minuscules',
        ],
      },
    ],
    wrong: [
      'Elle met la chaîne en minuscules au lieu de majuscules',
      'Rien : ajouter ou retirer 32 donne la même lettre',
      "Ça ne compile pas : un char n'accepte pas +=",
    ],
    why: "Elle ne touche que 'a' à 'z' (97 à 122) : en leur ajoutant 32, on sort de l'ASCII (129 à 154) au lieu d'arriver aux majuscules (65 à 90).",
  },
  'pis-c02-strcapitalize': {
    forms: [
      {
        ask: [
          'Quelle chaîne renvoie cet appel ?',
          'À quoi ressemble la chaîne après ft_strcapitalize ?',
        ],
        right: ['`Hola 42mundo Dos-Tres`'],
        wrong: [
          '`Hola 42Mundo Dos-Tres`',
          '`Hola 42mUNDO Dos-tres`',
          '`HOLA 42MUNDO DOS-TRES`',
          '`Hola 42mundo Dos-tres`',
        ],
      },
      {
        ask: [
          "Pour ft_strcapitalize, qu'est-ce qu'un mot ?",
          'Dans ft_strcapitalize, où commence et où finit un mot ?',
        ],
        right: ['Une suite de lettres et de chiffres'],
        wrong: [
          'Ce qui se trouve entre deux espaces',
          'Une suite de lettres uniquement',
          'Ce qui se trouve entre deux signes',
          'Ce qui commence par une majuscule',
        ],
      },
    ],
    wrong: [
      'Ce qui se trouve entre deux espaces',
      'Une suite de lettres uniquement',
      'Ce qui commence par une majuscule',
    ],
    why: "Un mot est une suite de lettres et de chiffres : son premier caractère passe en majuscule (si c'est une lettre) et le reste en minuscules.",
  },
  'pis-c02-strlcpy': {
    forms: [
      {
        ask: ['Combien vaut n ?', 'Que renvoie ft_strlcpy ici ?'],
        right: ['7'],
        wrong: ['3', '4', '8', '0'],
      },
      {
        ask: ['Quelle chaîne reste dans buf ?', "Que lit-on dans buf après l'appel ?"],
        right: ['`pis`'],
        wrong: ['`pisc`', '`piscine`', '`pi`'],
      },
    ],
    wrong: ['3', '4', '8'],
    why: "ft_strlcpy copie au plus size - 1 caractères, termine par '\\0' et renvoie la longueur de src, que ça tienne ou non.",
  },
  'pis-c02-strlcpy-vs-strncpy': {
    forms: [
      {
        ask: [
          'Que fait ft_strlcpy que ne fait pas ft_strncpy ?',
          'En quoi ft_strlcpy fait-elle mieux que ft_strncpy ?',
        ],
        right: ["Elle termine toujours dest par '\\0', si size n'est pas 0"],
        wrong: [
          "Elle remplit dest de '\\0' jusqu'à size",
          "Elle copie size octets sans regarder le '\\0' de src",
          'Elle renvoie dest, comme le fait strncpy',
          'Elle alloue avec malloc la place qui manque',
        ],
      },
    ],
    wrong: [
      "Elle remplit dest de '\\0' jusqu'à size",
      'Elle renvoie dest, comme le fait strncpy',
      'Elle alloue avec malloc la place qui manque',
    ],
    why: "strncpy peut laisser dest sans '\\0' si src ne tient pas ; strlcpy le met toujours et renvoie la longueur de src.",
  },
  'pis-c02-non-printable': {
    forms: [
      {
        ask: [
          'Comment ft_putstr_non_printable écrit-elle le retour à la ligne ?',
          "ft_putstr_non_printable tombe sur un '\\n'. Qu'écrit-elle ?",
        ],
        right: ['`\\0a`'],
        wrong: ['`\\0A`', '`\\n`', '`\\10`', '`\\x0a`'],
      },
      {
        ask: [
          'Comment ft_putstr_non_printable écrit-elle le caractère 127 (DEL) ?',
          "Avec l'octet 127, qu'écrit ft_putstr_non_printable ?",
        ],
        right: ['`\\7f`'],
        wrong: ['`\\7F`', '`\\127`', '`\\177`', '`\\x7f`'],
      },
      {
        ask: [
          'Comment ft_putstr_non_printable écrit-elle le caractère 27 (ESC) ?',
          "Avec l'octet 27, qu'écrit ft_putstr_non_printable ?",
        ],
        right: ['`\\1b`'],
        wrong: ['`\\27`', '`\\1B`', '`\\e`', '`\\033`'],
      },
    ],
    wrong: ['`\\0A`', '`\\n`', '`\\10`'],
    why: 'ft_putstr_non_printable remplace chaque octet non imprimable par un backslash suivi de sa valeur en hexadécimal, sur deux chiffres en minuscules.',
  },
  'pis-c02-print-memory': {
    forms: [
      {
        ask: [
          "Combien d'octets ft_print_memory affiche-t-elle par ligne ?",
          "Combien d'octets tiennent sur une ligne de ft_print_memory ?",
        ],
        right: ['16'],
        wrong: ['8', '32', '4', '64'],
      },
      {
        ask: [
          'Dans la colonne de droite de ft_print_memory, comment apparaît un octet non imprimable ?',
          'ft_print_memory tombe sur un octet non imprimable. Comment le montre-t-elle à droite ?',
        ],
        right: ['Comme un point'],
        wrong: [
          'Comme sa valeur en hexadécimal',
          'Comme un espace vide',
          "Comme un point d'interrogation",
        ],
      },
      {
        ask: [
          "Dans quelle base ft_print_memory affiche-t-elle l'adresse de chaque ligne ?",
          "L'adresse au début de chaque ligne de ft_print_memory, dans quelle base est-elle ?",
        ],
        right: ['En hexadécimal'],
        wrong: ['En décimal', 'En octal', 'En binaire'],
      },
    ],
    wrong: ['8', '32', '4'],
    why: "ft_print_memory affiche chaque ligne comme un dump : l'adresse en hexadécimal, 16 octets en hexadécimal puis ces octets en texte, avec un point pour les non imprimables.",
  },
  'pis-c03-strcmp': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_strcmp("abc", "abd")` ?',
          'Avec s1 = "abc" et s2 = "abd", que renvoie-t-elle ?',
        ],
        right: ['-1'],
        wrong: ['1', '0', '3', '-100'],
      },
      {
        ask: [
          'Que renvoie `ft_strcmp("a", "A")` ?',
          'Avec s1 = "a" et s2 = "A", que renvoie-t-elle ?',
        ],
        right: ['32'],
        wrong: ['-32', '1', '0', '97'],
      },
      {
        ask: [
          'Que renvoie `ft_strcmp("ab", "abc")` ?',
          'Avec s1 = "ab" et s2 = "abc", que renvoie-t-elle ?',
        ],
        right: ['-99'],
        wrong: ['-1', '99', '0', '1'],
      },
    ],
    wrong: ['0', '1', '-32'],
    why: "ft_strcmp avance tant que les caractères sont égaux et renvoie la différence des premiers qui diffèrent : le '\\0' compte pour 0.",
  },
  'pis-c03-strcmp-unsigned': {
    forms: [
      {
        ask: [
          'Pourquoi ft_strcmp soustrait-elle les caractères en unsigned char ?',
          'Dans ft_strcmp, à quoi sert de passer les char en unsigned char avant de soustraire ?',
        ],
        right: ['Pour que les octets de 128 à 255 comptent comme plus grands'],
        wrong: [
          'Pour que le résultat ne soit jamais négatif',
          "Parce qu'en C on ne peut pas soustraire deux char",
          'Pour ignorer les majuscules et les minuscules',
          'Pour que la comparaison aille plus vite',
        ],
      },
    ],
    wrong: [
      'Pour que le résultat ne soit jamais négatif',
      "Parce qu'en C on ne peut pas soustraire deux char",
    ],
    why: "Si char est signé, les octets de 128 à 255 sont négatifs ; strcmp compare en unsigned char pour qu'ils passent après.",
  },
  'pis-c03-strcmp-sign': {
    forms: [
      {
        ask: [
          'Si `ft_strcmp(s1, s2)` donne un nombre négatif, que veut dire ce résultat ?',
          'Que signifie un retour de ft_strcmp inférieur à 0 ?',
        ],
        right: ["Que s1 vient avant s2 dans l'ordre ASCII"],
        wrong: [
          'Que s1 est plus courte que s2',
          "Qu'il y a eu une erreur de comparaison",
          "Que s2 vient avant s1 dans l'ordre ASCII",
          "Qu'elles n'ont aucune lettre en commun",
        ],
      },
    ],
    wrong: [
      'Que s1 est plus courte que s2',
      "Qu'il y a eu une erreur de comparaison",
      "Qu'elles n'ont aucune lettre en commun",
    ],
    why: "Négatif veut dire que s1 passe avant, 0 qu'elles sont égales et positif qu'elle passe après, en comparant caractère par caractère.",
  },
  'pis-c03-strncmp': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_strncmp("piscine", "pisco", 4)` ?',
          'Que renvoie `ft_strncmp("piscine", "pisco", 0)` ?',
        ],
        right: ['0'],
        wrong: ['-6', '6', '1', '-1'],
      },
      {
        ask: [
          'Que renvoie `ft_strncmp("piscine", "pisco", 5)` ?',
          'Avec "piscine", "pisco" et n = 5, que renvoie-t-elle ?',
        ],
        right: ['-6'],
        wrong: ['6', '0', '-1', '1'],
      },
    ],
    wrong: ['6', '1', '-1'],
    why: "ft_strncmp regarde au plus n caractères : les 4 premiers sont égaux (0) et le cinquième donne 'i' - 'o' = -6.",
  },
  'pis-c03-strcat': {
    forms: [
      {
        ask: ['Quelle chaîne reste dans dest ?', 'Que lit-on dans dest à la fin ?'],
        right: ['`42 Madrid!`'],
        wrong: ['`42Madrid!`', '` Madrid!`', '`!`', '`42 Madrid`'],
      },
      {
        ask: ['Que renvoie ft_strcat ?', 'Chaque appel à ft_strcat, que renvoie-t-il ?'],
        right: ['Un pointeur vers dest'],
        wrong: [
          'Un pointeur vers src',
          'La nouvelle longueur de dest',
          "Un pointeur vers le '\\0' final",
        ],
      },
    ],
    wrong: ['`42Madrid!`', '` Madrid!`', 'Un pointeur vers src'],
    why: "ft_strcat copie src à partir du '\\0' de dest (et en remet un à la fin), puis renvoie dest.",
  },
  'pis-c03-strcat-room': {
    forms: [
      {
        ask: [
          'Que doit respecter dest pour que `ft_strcat(dest, src)` ne déborde pas ?',
          "Avant d'appeler ft_strcat, quelle place faut-il dans dest ?",
        ],
        right: ["De la place pour les deux chaînes et le '\\0'"],
        wrong: [
          'De la place pour src, sans compter son contenu',
          'Rien : ft_strcat alloue ce qui manque',
          'De la place pour la plus longue des deux',
          'De la place pour dest et src, sans la fin',
        ],
      },
    ],
    wrong: [
      'De la place pour src, sans compter son contenu',
      'Rien : ft_strcat alloue ce qui manque',
    ],
    why: "ft_strcat n'alloue rien : elle écrit après dest, qui doit avoir la place pour strlen(dest) + strlen(src) + 1.",
  },
  'pis-c03-strncat': {
    forms: [
      {
        ask: ['Quelle chaîne reste dans dest ?', "Que lit-on dans dest après l'appel ?"],
        right: ['`abcd`'],
        wrong: ['`abcdef`', '`ab`', '`cd`', '`abc`'],
      },
      {
        ask: [
          "ft_strncat met-elle le '\\0' final même quand elle coupe src ?",
          'Quand ft_strncat coupe src, dest se termine-t-elle bien ?',
        ],
        right: ["Oui, elle ajoute toujours le '\\0' final"],
        wrong: [
          'Non, comme le fait strncpy',
          'Seulement si src est plus courte que nb',
          "Seulement s'il reste de la place dans dest",
        ],
      },
    ],
    wrong: ['`abcdef`', '`ab`', '`cd`'],
    why: "ft_strncat ajoute au plus nb caractères de src à la fin de dest et termine toujours par un '\\0'.",
  },
  'pis-c03-strstr': {
    forms: [
      {
        ask: [
          'Que renvoie `ft_strstr(str, "")` ?',
          "Si l'aiguille de ft_strstr est la chaîne vide, que renvoie-t-elle ?",
        ],
        right: ['Un pointeur vers le début de str'],
        wrong: [
          "NULL, car il n'y a rien à chercher",
          "Un pointeur vers le '\\0' final de str",
          'La longueur de str, sans rien toucher',
        ],
      },
      {
        ask: [
          "Que renvoie ft_strstr si to_find n'est pas dans str ?",
          "Quand ft_strstr ne trouve pas l'aiguille, elle renvoie…",
        ],
        right: ['NULL'],
        wrong: [
          'Un pointeur vers le début de str',
          "Un pointeur vers le '\\0' de str",
          'La chaîne vide ""',
        ],
      },
    ],
    wrong: ["Un pointeur vers le '\\0' final de str", 'La longueur de str, sans rien toucher'],
    why: "Comme strstr : une aiguille vide se trouve au début (elle renvoie str), et si elle n'apparaît pas, elle renvoie NULL.",
  },
  'pis-c03-strstr-code': {
    forms: [
      {
        ask: ['Quelle chaîne lit-on à partir de s ?', "Après l'appel, quelle chaîne est s ?"],
        right: ['`anana`'],
        wrong: ['`ana`', '`nana`', '`na`', '`banana`'],
      },
    ],
    wrong: ['`ana`', '`nana`', '`banana`'],
    why: "ft_strstr renvoie un pointeur vers la première occurrence dans str, qui court jusqu'à la fin : depuis la position 1, anana.",
  },
  'pis-c03-strlcat': {
    forms: [
      {
        ask: ['Combien vaut n ?', 'Que renvoie ft_strlcat ici ?'],
        right: ['8'],
        wrong: ['5', '6', '3', '9'],
      },
      {
        ask: ['Quelle chaîne reste dans dest ?', "À quoi ressemble dest après l'appel ?"],
        right: ['`abcde`'],
        wrong: ['`abcdef`', '`abcdefgh`', '`abc`', '`abcdefg`'],
      },
    ],
    wrong: ['5', '6', '9'],
    why: "Avec size 6, il y a la place pour 5 caractères et le '\\0' : elle ajoute de et s'arrête ; elle renvoie strlen(dest) + strlen(src) = 3 + 5.",
  },
  'pis-c03-strlcat-small': {
    forms: [
      {
        ask: ['Combien vaut n ?', 'Que renvoie ft_strlcat ici ?'],
        right: ['7'],
        wrong: ['9', '4', '3', '10'],
      },
      {
        ask: ['À quoi ressemble dest ?', 'Que lit-on ensuite dans dest ?'],
        right: ['`abcdef`'],
        wrong: ['`abcdefxyz`', '`abc`', '`abcx`', '`abcxyz`'],
      },
    ],
    wrong: ['9', '4', '10'],
    why: 'Si size ne dépasse pas strlen(dest), ft_strlcat ne touche pas à dest et renvoie size + strlen(src) : 4 + 3 = 7.',
  },
  'pis-c03-strlcat-return': {
    forms: [
      {
        ask: [
          'À quoi sert la valeur que renvoie ft_strlcat ?',
          "Qu'apprend-on en regardant ce que renvoie ft_strlcat ?",
        ],
        right: ["Si ça a coupé : quand c'est >= size, ça n'a pas tenu"],
        wrong: [
          'Combien de caractères elle a réussi à copier',
          'Où se termine dest en mémoire',
          'Si dest et src se chevauchent ou non',
          'Combien de place il reste encore dans dest',
        ],
      },
      {
        ask: [
          'Que renvoie `ft_strlcat(dest, src, size)` ?',
          'Avec quelle formule calcule-t-on ce que renvoie ft_strlcat ?',
        ],
        right: ['`min(size, strlen(dest)) + strlen(src)`'],
        wrong: [
          '`strlen(dest) + strlen(src) + 1`',
          '`size - strlen(dest) - 1`',
          '`max(size, strlen(dest)) + strlen(src)`',
          '`min(size, strlen(src)) + strlen(dest)`',
        ],
      },
    ],
    wrong: [
      'Combien de caractères elle a réussi à copier',
      'Où se termine dest en mémoire',
      'Combien de place il reste encore dans dest',
    ],
    why: "ft_strlcat renvoie la longueur qu'elle a voulu créer, min(size, strlen(dest)) + strlen(src) : si ça atteint size, ça a été coupé.",
  },
}
