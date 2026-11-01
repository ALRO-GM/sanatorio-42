/** Banco de Not-games en francés: la piscina, C 04 a C 07 (`../piscine-c04-c07.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_C04_C07_FR: Readonly<Record<string, ConceptText>> = {
  'pis-c04-strlen': {
    forms: [
      {
        ask: [
          'Que renvoie-t-elle avec "42 Madrid" ?',
          'Avec la chaîne "42 Madrid", que renvoie-t-elle ?',
        ],
        right: ['9'],
        wrong: ['10', '8', '2', '7'],
      },
      {
        ask: [
          'Que renvoie-t-elle avec la chaîne vide "" ?',
          'Avec "", que renvoie cette fonction ?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
    ],
    wrong: ['10', '8', '2'],
    why: "Elle compte les caractères jusqu'au '\\0' sans le compter : l'espace compte, et la chaîne vide donne 0.",
  },
  'pis-c04-putstr': {
    forms: [
      {
        ask: ["Qu'affiche ce programme ?", 'Quelle est la sortie de ce programme ?'],
        right: ['ab'],
        wrong: ['abcd', 'ab\\0cd', 'a', 'cd'],
      },
    ],
    wrong: ['abcd', 'ab\\0cd', 'cd'],
    why: "Le '\\0' glissé au milieu coupe la chaîne : pour la boucle, elle s'arrête là, et la suite n'est pas affichée.",
  },
  'pis-c04-putnbr-intmin': {
    forms: [
      {
        ask: [
          'Avec quel nombre ce ft_putnbr échoue-t-il ?',
          'Quelle entrée cette version affiche-t-elle mal ?',
        ],
        right: ['-2147483648'],
        wrong: ['0', '-1', '2147483647', '-10'],
      },
      {
        ask: [
          'Pourquoi cette version échoue-t-elle avec INT_MIN ?',
          'Que se passe-t-il dans `nb = -nb` avec INT_MIN ?',
        ],
        right: [
          'Son opposé, 2147483648, ne tient pas dans un int',
          "Changer son signe déborde : +2147483648 n'existe pas",
        ],
        wrong: [
          'nb / 10 arrondit mal les nombres négatifs',
          'write ne sait pas afficher le signe moins',
          "La récursion n'a pas de cas de base pour lui",
          "ft_putchar n'accepte pas les chiffres négatifs",
        ],
      },
    ],
    wrong: ['0', '-1', '2147483647'],
    why: "Un int de 32 bits va de -2147483648 à 2147483647 : l'opposé d'INT_MIN n'y tient pas, il faut le traiter à part ou passer par un long.",
  },
  'pis-c04-putnbr-order': {
    forms: [
      {
        ask: ["Qu'affiche `put(123)` ?", 'Quelle est la sortie de `put(123)` ?'],
        right: ['321'],
        wrong: ['123', '3', '12', '1'],
      },
      {
        ask: [
          "Quel changement fait que `put(123)` affiche les chiffres dans l'ordre ?",
          'Comment la corriger pour que le nombre sorte bien ?',
        ],
        right: [
          "Appeler put(nb / 10) avant d'afficher le chiffre",
          "Afficher nb % 10 après l'appel récursif",
        ],
        wrong: [
          'Afficher nb / 10 au lieu de nb % 10',
          'Remplacer nb >= 10 par nb > 0 dans le if',
          "Ajouter '1' au chiffre au lieu de '0'",
          'Appeler put(nb % 10) au lieu de put(nb / 10)',
        ],
      },
    ],
    wrong: ['123', '3', '12'],
    why: "nb % 10 est le dernier chiffre : affiché avant l'appel, le nombre sort à l'envers ; ceux de devant doivent être affichés d'abord.",
  },
  'pis-c04-atoi-signs': {
    forms: [
      {
        ask: ['Que renvoie le premier appel ?', 'Avec la première chaîne, que renvoie ft_atoi ?'],
        right: ['-1234'],
        wrong: ['1234', '-1234567', '0', '1234567'],
      },
      {
        ask: ['Que renvoie le deuxième appel ?', 'Avec la deuxième chaîne, que renvoie ft_atoi ?'],
        right: ['42'],
        wrong: ['-42', '0', '4', '-4'],
      },
      {
        ask: [
          'Que renvoie le troisième appel ?',
          'Avec la troisième chaîne, que renvoie ft_atoi ?',
        ],
        right: ['12'],
        wrong: ['1234', '34', '0', '1'],
      },
    ],
    wrong: ['0', '1234', '-42'],
    why: "Le ft_atoi de la piscine saute les blancs, lit tous les '+' et '-' (un nombre impair de '-' le rend négatif) et s'arrête au premier caractère qui n'est pas un chiffre.",
  },
  'pis-c04-atoi-spaces': {
    forms: [
      {
        ask: [
          'Quels caractères ft_atoi saute-t-elle avant le signe ?',
          'Dans le ft_atoi du C 04, quels blancs sont ignorés au début ?',
        ],
        right: [
          "' ', \\t, \\n, \\v, \\f et \\r",
          "Les six d'isspace : ' ', \\t, \\n, \\v, \\f et \\r",
        ],
        wrong: [
          "Seulement l'espace ' ', aucun autre",
          "Seulement ' ' et \\t, ceux du clavier",
          'Aucun : un blanc au début donne 0',
          "Tout ce qui n'est pas un chiffre",
        ],
      },
    ],
    wrong: ["Seulement ' ', \\t et \\n", 'Les espaces et aussi les lettres'],
    why: "Les blancs sautés sont ceux d'isspace : espace, tabulation, retour à la ligne, \\v, \\f et \\r.",
  },
  'pis-c04-base-valid': {
    forms: [
      {
        ask: [
          'Laquelle de ces bases ft_putnbr_base accepte-t-elle ?',
          'Quelle base est valide pour ft_putnbr_base ?',
        ],
        right: ['`"poneyvif"`', '`"0123456789ABCDEF"`'],
        wrong: [
          '`"0123-456789"`',
          '`"0123456789abcdeF0"`',
          '`"+0123456789"`',
          '`"poneyvifp"`',
          '`"0"`',
        ],
      },
      {
        ask: [
          "Que fait ft_putnbr_base si la base n'est pas valide ?",
          'Avec une base invalide, que doit faire ft_putnbr_base ?',
        ],
        right: ['Ne rien afficher du tout'],
        wrong: [
          'Afficher le nombre en décimal',
          'Afficher « Error » sur la sortie',
          'Afficher seulement le signe moins',
          'Utiliser la base "01" par défaut',
        ],
      },
    ],
    wrong: ['`"0"`', '`""`', '`"0123-456"`'],
    why: "Une base est invalide si elle est vide, n'a qu'un caractère, en répète un ou contient + ou - ; dans ce cas, rien n'est affiché.",
  },
  'pis-c04-base-convert': {
    forms: [
      {
        ask: ["Qu'affiche la première ligne ?", 'En binaire, que sort la première ligne ?'],
        right: ['1010'],
        wrong: ['0101', '10', '1001', '110'],
      },
      {
        ask: ["Qu'affiche la deuxième ligne ?", 'En base 16, que sort la deuxième ligne ?'],
        right: ['FF'],
        wrong: ['ff', 'F', 'FE', 'EF'],
      },
      {
        ask: [
          "Qu'affiche la troisième ligne ?",
          'Dans la base "poneyvif", que sort la troisième ligne ?',
        ],
        right: ['op'],
        wrong: ['f', 'po', 'pp', 'oo'],
      },
    ],
    wrong: ['10', '0101', '1001'],
    why: 'La longueur de la base donne le nombre de chiffres, et chaque caractère vaut sa position : 10 = 1010 en binaire, 255 = FF en hexadécimal et 8 = « 10 » en base 8, soit op avec poneyvif.',
  },
  'pis-c04-atoi-base': {
    forms: [
      {
        ask: ['Que renvoie le premier appel ?', 'Lu en binaire, que renvoie le premier appel ?'],
        right: ['5'],
        wrong: ['101', '3', '6', '4'],
      },
      {
        ask: ['Que renvoie le deuxième appel ?', 'Lu en hexadécimal, que renvoie le deuxième ?'],
        right: ['-255'],
        wrong: ['255', '-15', '-256', '0'],
      },
      {
        ask: [
          'Que renvoie le troisième appel ?',
          'Avec la base du troisième, que renvoie-t-elle ?',
        ],
        right: ['0'],
        wrong: ['42', '-1', '1', '2'],
      },
    ],
    wrong: ['101', '255', '-1'],
    why: "ft_atoi_base lit comme ft_atoi mais avec les chiffres de la base (101 en binaire vaut 5, -ff en hexadécimal vaut -255) ; avec une base invalide, comme celle d'un seul caractère, elle renvoie 0.",
  },
  'pis-c04-intmin-value': {
    forms: [
      {
        ask: ['Que vaut INT_MIN avec un int de 32 bits ?', 'Le plus petit int (32 bits) est…'],
        right: ['-2147483648'],
        wrong: ['-2147483647', '-4294967296', '-32768', '-4294967295'],
      },
      {
        ask: [
          'Combien de chiffres a INT_MIN, sans compter le signe ?',
          'Combien de chiffres ft_putnbr affiche-t-elle pour INT_MIN, sans le signe ?',
        ],
        right: ['10'],
        wrong: ['11', '9', '32', '8'],
      },
    ],
    wrong: ['-2147483647', '-32768', '-4294967296'],
    why: 'Sur 32 bits tiennent 2³² valeurs : de -2147483648 à 2147483647, et le côté négatif en a une de plus que le positif.',
  },
  'pis-c04-base-poney': {
    forms: [
      {
        ask: [
          'Avec la base "poneyvif", dans quelle base le nombre est-il écrit ?',
          'Combien de chiffres compte la base "poneyvif" ?',
        ],
        right: ['8'],
        wrong: ['16', '2', '10', '7'],
      },
      {
        ask: [
          'Dans la base "poneyvif", quel caractère vaut 5 ?',
          'Comment s\'écrit le 5 avec la base "poneyvif" ?',
        ],
        right: ['v'],
        wrong: ['y', 'i', 'e', 'f'],
      },
    ],
    wrong: ['16', '2', '10'],
    why: 'Chaque caractère de la base vaut sa position depuis 0 : p = 0, o = 1, n = 2, e = 3, y = 4, v = 5, i = 6 et f = 7 ; ça en fait 8, la base 8.',
  },
  'pis-c04-octal': {
    forms: [
      {
        ask: ["Comment s'écrit 42 en octal ?", 'Le 42 décimal, en base 8, donne…'],
        right: ['52'],
        wrong: ['50', '25', '62', '54'],
      },
      {
        ask: ["Que vaut en décimal l'octal 17 ?", 'Le 17 en base 8, converti en décimal, donne…'],
        right: ['15'],
        wrong: ['17', '16', '23', '13'],
      },
    ],
    wrong: ['50', '25', '62'],
    why: 'En base 8, chaque chiffre vaut 8 fois celui de sa droite : 42 = 5 × 8 + 2, et 17 en octal fait 1 × 8 + 7 = 15.',
  },
  'pis-c04-base-sign': {
    forms: [
      {
        ask: [
          'Pourquoi une base ne peut-elle pas contenir + ou - ?',
          'Pourquoi ft_atoi_base refuse-t-elle une base avec un signe ?',
        ],
        right: [
          'On les confondrait avec le signe du nombre',
          "On ne saurait pas si c'est un chiffre ou le signe",
        ],
        wrong: [
          'write ne sait pas afficher ces deux caractères',
          'Ce ne sont pas des caractères ASCII imprimables',
          'Chacun occupe deux octets en mémoire',
          'La norminette les interdit dans les chaînes',
        ],
      },
    ],
    wrong: ['On les confond avec les espaces', 'Ils sont plus lents à comparer'],
    why: "Devant les chiffres, '+' et '-' se lisent comme un signe : s'ils étaient des chiffres de la base, « -1 » aurait plusieurs lectures.",
  },
  'pis-c05-fact-iter': {
    forms: [
      {
        ask: ['Que renvoie-t-elle avec nb = 5 ?', 'Avec nb = 5, que renvoie cette fonction ?'],
        right: ['120'],
        wrong: ['24', '25', '60', '720'],
      },
      {
        ask: ['Que renvoie-t-elle avec nb = 0 ?', 'Avec nb = 0, que renvoie cette fonction ?'],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: ['Que renvoie-t-elle avec nb = -3 ?', 'Avec nb = -3, que renvoie cette fonction ?'],
        right: ['0'],
        wrong: ['-6', '1', '-1', '6'],
      },
    ],
    wrong: ['24', '-1', '720'],
    why: "5! = 5 × 4 × 3 × 2 × 1 = 120 ; 0! vaut 1 (on n'entre pas dans la boucle), et pour un négatif le sujet demande de renvoyer 0.",
  },
  'pis-c05-fact-rec': {
    forms: [
      {
        ask: ['Que renvoie cette version avec nb = 0 ?', 'Avec nb = 0, que renvoie-t-elle ?'],
        right: ['0'],
        wrong: ['1', '-1', '2'],
      },
      {
        ask: [
          "Qu'est-ce qui ne va pas dans cette version ?",
          'Pourquoi ne passerait-elle pas la Moulinette ?',
        ],
        right: ['Avec 0 elle renvoie 0, alors que 0! vaut 1', 'Il faut que nb == 0 donne 1 aussi'],
        wrong: [
          "Avec 1 elle s'appelle sans fin",
          'Avec un négatif elle renvoie 1, pas 0',
          'Rien : elle respecte le sujet',
          'Avec 5 elle renvoie 24 au lieu de 120',
        ],
      },
    ],
    wrong: ['1', '-1', '2'],
    why: 'Avec 0 elle calcule 0 × f(-1), et f(-1) renvoie 0 : le résultat est 0, or 0! vaut 1, donc le cas de base doit aussi couvrir 0.',
  },
  'pis-c05-power': {
    forms: [
      {
        ask: [
          'Que renvoie le premier appel ?',
          'Combien donne 2 puissance 10 avec cette fonction ?',
        ],
        right: ['1024'],
        wrong: ['20', '100', '512', '2048'],
      },
      {
        ask: [
          "D'après le sujet, que renvoie le deuxième appel ?",
          'Que demande le sujet pour 0 puissance 0 ?',
        ],
        right: ["Qu'elle renvoie 1", "Qu'elle donne 1, comme en maths"],
        wrong: [
          "Qu'elle renvoie 0",
          "Qu'elle renvoie -1, comme erreur",
          "Qu'elle renvoie 0, faute de définition",
        ],
      },
      {
        ask: [
          'Que renvoie le troisième appel ?',
          'Avec une puissance négative, que renvoie-t-elle ?',
        ],
        right: ['0'],
        wrong: ['-25', '1', '-1', '25'],
      },
    ],
    wrong: ['512', '2048', '100'],
    why: 'Elle multiplie nb par lui-même power fois (2¹⁰ = 1024) ; 0 puissance 0 vaut 1 et une puissance négative renvoie 0, comme le veut le sujet.',
  },
  'pis-c05-power-rec': {
    forms: [
      {
        ask: [
          "Combien de fois ft_recursive_power s'exécute-t-elle avec (3, 4), la première comprise ?",
          "Combien y a-t-il d'appels en tout pour nb = 3 et power = 4 ?",
        ],
        right: ['5'],
        wrong: ['4', '3', '81', '12'],
      },
      {
        ask: ['Que renvoie-t-elle avec nb = 3 et power = 4 ?', 'Avec (3, 4), que renvoie-t-elle ?'],
        right: ['81'],
        wrong: ['12', '64', '27', '243'],
      },
    ],
    wrong: ['12', '64', '27'],
    why: "Chaque appel baisse power de 1 jusqu'au cas de base : 4, 3, 2, 1 et 0 font 5 appels, et le résultat vaut 3 × 3 × 3 × 3 × 1 = 81.",
  },
  'pis-c05-fib': {
    forms: [
      {
        ask: ['Que renvoie-t-elle avec index = 7 ?', 'Avec index = 7, que renvoie-t-elle ?'],
        right: ['13'],
        wrong: ['8', '21', '7', '11'],
      },
      {
        ask: [
          'Que renvoie-t-elle avec index = -4 ?',
          'Avec un index négatif, que renvoie-t-elle ?',
        ],
        right: ['-1'],
        wrong: ['0', '-3', '3', '1'],
      },
    ],
    wrong: ['8', '21', '0'],
    why: "La suite commence par 0, 1, 1, 2, 3, 5, 8, 13 : l'index 7 vaut 13 ; pour un index négatif, le sujet demande -1.",
  },
  'pis-c05-fib-cost': {
    forms: [
      {
        ask: [
          "Comment croît le nombre d'appels d'un ft_fibonacci récursif qui ne garde rien ?",
          "Si ft_fibonacci s'appelle deux fois, comment son coût croît-il avec l'index ?",
        ],
        right: [
          'De façon exponentielle : chaque appel en lance deux',
          'Exponentiellement, en refaisant les mêmes calculs',
        ],
        wrong: [
          'De façon linéaire : un appel par index',
          'Comme un logarithme, comme une recherche binaire',
          "Comme le carré de l'index, pas plus",
          'Il ne croît pas : toujours deux appels',
        ],
      },
    ],
    wrong: ['De façon linéaire, comme une boucle', 'Comme la factorielle récursive'],
    why: "fib(n) appelle fib(n-1) et fib(n-2), qui refont les mêmes calculs : le nombre d'appels croît à peu près comme 1,6ⁿ.",
  },
  'pis-c05-sqrt': {
    forms: [
      {
        ask: ['Que renvoie le premier appel ?', 'Avec 49, que renvoie ft_sqrt ?'],
        right: ['7'],
        wrong: ['0', '24', '6', '49'],
      },
      {
        ask: ['Que renvoie le deuxième appel ?', 'Avec 50, que renvoie ft_sqrt ?'],
        right: ['0'],
        wrong: ['7', '8', '-1', '7.07'],
      },
      {
        ask: ['Que renvoie le troisième appel ?', 'Avec -16, que renvoie ft_sqrt ?'],
        right: ['0'],
        wrong: ['4', '-4', '-1', '16'],
      },
    ],
    wrong: ['-1', '-4', '16'],
    why: "ft_sqrt renvoie la racine entière seulement si elle est exacte : 49 donne 7 ; 50 n'est pas un carré parfait et un négatif n'a pas de racine, donc les deux donnent 0.",
  },
  'pis-c05-sqrt-overflow': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui cloche dans ce ft_sqrt ?",
          'Avec quelles entrées cette version casse-t-elle ?',
        ],
        right: [
          "Avec nb proche d'INT_MAX, i * i déborde",
          'i * i ne tient plus dans un int si nb est énorme',
        ],
        wrong: [
          'Avec nb = 1 elle renvoie 0 au lieu de 1',
          'Avec un négatif elle boucle sans fin',
          'Pour un carré parfait elle renvoie i + 1',
          'Avec nb = 0 elle ne sort jamais de la boucle',
        ],
      },
    ],
    wrong: ['Avec nb = 4 elle renvoie 0', 'Rien : elle respecte le sujet'],
    why: 'Pour nb proche de 2147483647, i atteint 46341 et 46341 × 46341 ne tient plus dans un int : ça déborde ; 0, 1 et les négatifs marchent bien.',
  },
  'pis-c05-prime': {
    forms: [
      {
        ask: [
          'Avec quel nombre donne-t-elle une mauvaise réponse ?',
          'Quelle entrée fait mentir cette version ?',
        ],
        right: ['1'],
        wrong: ['2', '3', '97', '4'],
      },
      {
        ask: [
          'Que manque-t-il à ce ft_is_prime ?',
          "Qu'est-ce qu'il faut ajouter pour qu'elle soit juste ?",
        ],
        right: [
          'Renvoyer 0 si nb est inférieur à 2',
          'Traiter 0, 1 et les négatifs comme non premiers',
        ],
        wrong: [
          'Commencer la boucle à i = 1, pas à 2',
          'Renvoyer 1 dès que nb est pair',
          "Tester i jusqu'à nb inclus",
          'Renvoyer 0 si nb vaut 2',
        ],
      },
    ],
    wrong: ['2', '3', '97'],
    why: "Avec nb inférieur à 2, on n'entre pas dans la boucle et elle renvoie 1, alors que ni 0, ni 1, ni les négatifs ne sont premiers.",
  },
  'pis-c05-prime-sqrt': {
    forms: [
      {
        ask: [
          'Pour savoir si n est premier, quel est le plus grand diviseur à tester ?',
          "Pour que ft_is_prime ne soit pas lente, jusqu'à quel diviseur suffit-il d'aller ?",
        ],
        right: ['La racine carrée de n', 'Le plus grand i tel que i * i <= n'],
        wrong: [
          'La moitié de n, n / 2',
          'Celui juste avant n, n - 1',
          'Le logarithme en base 2 de n',
          'Le dixième de n',
        ],
      },
    ],
    wrong: ['n lui-même', 'Le nombre premier juste avant n'],
    why: "Si n = a × b, l'un des deux vaut au plus √n : s'il n'y a pas de diviseur jusque-là, il n'y en a aucun.",
  },
  'pis-c05-next-prime': {
    forms: [
      {
        ask: ['Que renvoie le premier appel ?', 'Avec 14, que renvoie ft_find_next_prime ?'],
        right: ['17'],
        wrong: ['15', '13', '19', '16'],
      },
      {
        ask: ['Que renvoie le deuxième appel ?', 'Si nb est déjà premier, que renvoie-t-elle ?'],
        right: ['17'],
        wrong: ['19', '18', '23'],
      },
      {
        ask: ['Que renvoie le troisième appel ?', 'Avec un nombre négatif, que renvoie-t-elle ?'],
        right: ['2'],
        wrong: ['-5', '0', '-3', '1'],
      },
    ],
    wrong: ['19', '13', '0'],
    why: "Elle renvoie le premier nombre premier supérieur ou égal à nb : 14 donne 17, 17 l'est déjà, et sous 2 le premier est 2.",
  },
  'pis-c05-queens': {
    forms: [
      {
        ask: [
          'Combien de solutions a le problème des dix dames ?',
          "Combien de façons y a-t-il de placer 10 dames sur un échiquier de 10 × 10 sans qu'elles s'attaquent ?",
        ],
        right: ['724'],
        wrong: ['92', '10', '512', '2680'],
      },
      {
        ask: [
          "Comment s'affiche chaque solution dans ft_ten_queens_puzzle ?",
          'Dans ft_ten_queens_puzzle, à quoi ressemble chaque ligne affichée ?',
        ],
        right: [
          'Dix chiffres : la ligne de la dame de chaque colonne',
          'Une ligne de 10 chiffres, un par colonne',
        ],
        wrong: [
          'Un échiquier de 10 × 10 avec des points et des Q',
          'Les coordonnées de chaque dame, avec des virgules',
          'Un nombre de 0 à 723 par solution',
          'Dix lettres de A à J, une par ligne',
        ],
      },
    ],
    wrong: ['92', '512', '1024'],
    why: "Il y a 724 façons de placer dix dames ; chacune s'écrit en 10 chiffres, la position de la dame dans chaque colonne, et la fonction renvoie leur nombre.",
  },
  'pis-c05-recursion-stack': {
    forms: [
      {
        ask: ['Que renvoie `f(4)` ?', 'Avec n = 4, que renvoie f ?'],
        right: ['4'],
        wrong: ['0', '5', '10', '24'],
      },
      {
        ask: [
          'Que se passe-t-il avec `f(-1)` ?',
          "Si on l'appelle avec n = -1, que se passe-t-il ?",
        ],
        right: [
          "Elle s'appelle sans fin jusqu'à saturer la pile",
          "Elle n'atteint jamais n == 0 et la pile déborde",
        ],
        wrong: [
          'Elle renvoie -1, comme f(4) donne 4',
          'Elle renvoie 0 tout de suite',
          'Elle renvoie 1 après un seul appel',
          'Ça ne compile pas avec un négatif',
        ],
      },
    ],
    wrong: ['0', '5', '10'],
    why: "Chaque appel ajoute 1 et baisse n ; avec -1 on n'atteint jamais le cas de base n == 0, et chaque appel prend de la pile jusqu'à l'épuiser (segfault).",
  },
  'pis-c06-program-name': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", 'Quelle est la sortie de cette commande ?'],
        right: ['./a.out'],
        wrong: ['hola', './a.out hola mundo', 'hola mundo', 'a.out'],
      },
      {
        ask: ['Que contient argv[0] ?', "Qu'y a-t-il dans le premier élément d'argv ?"],
        right: [
          'Le nom avec lequel le programme a été lancé',
          "La commande telle qu'on l'a tapée pour le lancer",
        ],
        wrong: [
          'Le premier argument après le nom',
          "Le nombre d'arguments, en texte",
          'Le chemin du dossier courant',
          'NULL si on ne passe aucun argument',
        ],
      },
    ],
    wrong: ['hola', 'hola mundo', 'a.out'],
    why: "argv[0] est le nom du programme tel qu'il a été tapé dans le shell (ici ./a.out) ; les arguments commencent à argv[1].",
  },
  'pis-c06-argc-count': {
    forms: [
      {
        ask: [
          'Que vaut argc si tu lances le programme sans arguments ?',
          'Avec un simple `./a.out`, que vaut argc ?',
        ],
        right: ['1'],
        wrong: ['0', '-1', '2'],
      },
      {
        ask: [
          'Que vaut argc avec `./a.out "hola mundo" 42` ?',
          'Si tu lances `./a.out "hola mundo" 42`, quelle valeur a argc ?',
        ],
        right: ['3'],
        wrong: ['4', '2', '5'],
      },
    ],
    wrong: ['0', '2', '4'],
    why: 'argc compte aussi le nom du programme, et ce qui est entre guillemets forme un seul argument : « hola mundo » compte pour un.',
  },
  'pis-c06-argv-null': {
    forms: [
      {
        ask: [
          "Qu'y a-t-il dans argv[argc] ?",
          'Juste après le dernier argument, que contient argv ?',
        ],
        right: ['NULL', 'Un pointeur nul'],
        wrong: [
          'Le dernier argument',
          'Une chaîne vide ""',
          'Des déchets : hors du tableau',
          'Le nom du programme',
        ],
      },
    ],
    wrong: ["Un caractère '\\0'", "La valeur d'argc"],
    why: "La norme du C garantit qu'argv[argc] est un pointeur nul : c'est pour ça qu'on peut parcourir argv jusqu'à trouver NULL.",
  },
  'pis-c06-print-params': {
    forms: [
      {
        ask: [
          'Combien de lignes affiche-t-il ?',
          'Combien de lignes sortent avec cette commande ?',
        ],
        right: ['2'],
        wrong: ['3', '4', '1'],
      },
      {
        ask: ['Que sort-il sur la première ligne ?', "Qu'affiche-t-il sur la première ligne ?"],
        right: ['a b'],
        wrong: ['./a.out', 'a', '"a b"', 'b'],
      },
    ],
    wrong: ['3', '4', '1'],
    why: "Il commence à argv[1], donc il n'affiche pas le nom ; les guillemets regroupent « a b » en un seul argument et le shell les enlève.",
  },
  'pis-c06-rev-params': {
    forms: [
      {
        ask: ["Qu'affiche-t-il sur la dernière ligne ?", "Qu'est-ce qui sort en dernier ?"],
        right: ['./a.out'],
        wrong: ['x', 'z', '(null)'],
      },
      {
        ask: [
          "Que faut-il changer pour qu'il fasse ce que demande ft_rev_params ?",
          'Comment corriger ce ft_rev_params ?',
        ],
        right: [
          "S'arrêter à i > 0 pour ne pas afficher argv[0]",
          'Remplacer i >= 0 par i >= 1 dans le while',
        ],
        wrong: [
          'Commencer à i = argc, pas à argc - 1',
          'Commencer à i = 1 et ajouter au lieu de retirer',
          'Afficher argv[i - 1] au lieu de argv[i]',
          'Rien : ft_rev_params inclut argv[0]',
        ],
      },
    ],
    wrong: ['x', 'z', '(null)'],
    why: "Avec i >= 0, il descend jusqu'à argv[0] et affiche aussi le nom du programme, que ft_rev_params ne doit pas sortir.",
  },
  'pis-c06-sort-ascii': {
    forms: [
      {
        ask: [
          'ft_sort_params reçoit `b A a B`. Dans quel ordre les affiche-t-il ?',
          "Comment `b A a B` sont-ils triés dans l'ordre ASCII ?",
        ],
        right: ['A, B, a, b'],
        wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
      },
      {
        ask: [
          'Pourquoi "Zoo" sort-il avant "abeja" dans ft_sort_params ?',
          'Dans l\'ordre ASCII, pourquoi "Zoo" passe-t-il devant "abeja" ?',
        ],
        right: [
          'Les majuscules ont des codes ASCII plus petits',
          "Parce que 'Z' vaut 90 et 'a' vaut 97 en ASCII",
        ],
        wrong: [
          "Parce que c'est la plus courte des deux",
          'Parce que le tri va de Z à A',
          'Parce que les majuscules vont toujours à la fin',
          'Parce que le tri ignore la casse',
        ],
      },
    ],
    wrong: ['a, A, b, B', 'A, a, B, b', 'b, a, B, A'],
    why: 'On compare les codes ASCII, comme ft_strcmp : toutes les majuscules (65 à 90) passent avant les minuscules (97 à 122).',
  },
  'pis-c06-main-proto': {
    forms: [
      {
        ask: [
          'Avec quel prototype main reçoit-elle les arguments ?',
          'Pour lire les arguments de la commande, comment déclare-t-on main ?',
        ],
        right: ['`int main(int argc, char **argv)`', '`int main(int argc, char *argv[])`'],
        wrong: [
          '`void main(char **argv)`',
          '`int main(char **argv, int argc)`',
          '`int main(int argc, char *argv)`',
          '`char **main(int argc)`',
        ],
      },
    ],
    wrong: ['`int main(int *argc, char **argv)`', '`int main(char argv[])`'],
    why: "main reçoit d'abord argc (combien il y en a), puis argv (un tableau de chaînes), et renvoie un int.",
  },
  'pis-c06-argv-type': {
    forms: [
      {
        ask: ['De quel type est argv[1] ?', 'Dans main, quel type a chaque argv[i] ?'],
        right: ['`char *`'],
        wrong: ['`char`', '`char **`', '`int`', '`int *`'],
      },
      {
        ask: ["Qu'est-ce que `argv[1][0]` ?", 'Que contient `argv[1][0]` ?'],
        right: ['La première lettre du premier argument', 'Le premier char du premier argument'],
        wrong: [
          'Le premier argument en entier',
          'Le nom du programme',
          'La première lettre du nom du programme',
          "Le nombre d'arguments",
        ],
      },
    ],
    wrong: ['`char`', '`char **`', '`int`'],
    why: 'argv est un tableau de chaînes : argv[1] est une chaîne (char *) et argv[1][0] son premier caractère.',
  },
  'pis-c06-argv-numbers': {
    forms: [
      {
        ask: [
          "Si tu lances `./a.out 42`, qu'arrive-t-il dans argv[1] ?",
          'Avec `./a.out 42`, quel type de donnée le programme reçoit-il ?',
        ],
        right: ['La chaîne "42"', "Les char '4', '2' et un '\\0'"],
        wrong: [
          "L'int 42",
          'Le nombre 42 déjà converti',
          "Le char de code 42, '*'",
          "Un pointeur vers l'int 42",
        ],
      },
    ],
    wrong: ['Un long qui vaut 42', 'Un float qui vaut 42.0'],
    why: "Les arguments arrivent toujours sous forme de texte ; pour s'en servir comme nombres, il faut les convertir, par exemple avec ft_atoi.",
  },
  'pis-c06-sort-swap': {
    forms: [
      {
        ask: ['Que permute ce bout de code ?', "Qu'est-ce qui bouge lors de l'échange ?"],
        right: ['Les pointeurs de deux arguments', 'Les adresses des deux chaînes'],
        wrong: [
          'Les lettres des deux chaînes, une à une',
          'Seulement le premier caractère de chaque chaîne',
          'Les valeurs de i et de i + 1',
          'Les longueurs des deux chaînes',
        ],
      },
      {
        ask: ['Quand les échange-t-il ?', 'Dans quel cas entre-t-il dans le if ?'],
        right: [
          'Quand argv[i] vient après argv[i + 1]',
          "Quand les deux sont dans l'ordre ASCII inverse",
        ],
        wrong: [
          'Quand argv[i] est plus longue que la suivante',
          'Quand argv[i] vient avant argv[i + 1]',
          'Quand les deux chaînes sont égales',
          'Quand la première commence par une majuscule',
        ],
      },
    ],
    wrong: [
      'Les valeurs de i et de i + 1',
      'Les longueurs des deux chaînes',
      'Seulement le premier caractère de chaque chaîne',
    ],
    why: "ft_strcmp donne plus de 0 si la première vient après ; on échange alors les pointeurs d'argv, sans copier la moindre lettre.",
  },
  'pis-c06-argv-loop': {
    forms: [
      {
        ask: ['Que vaut i à la fin ?', 'En sortant de la boucle, que vaut i ?'],
        right: ['3'],
        wrong: ['2', '4', '1'],
      },
      {
        ask: ["Pourquoi cette boucle s'arrête-t-elle ?", "Qu'est-ce qui arrête le while ?"],
        right: ['Parce que argv[argc] vaut NULL', 'Parce que argv finit par un pointeur nul'],
        wrong: [
          "Parce que chaque argument finit par '\\0'",
          'Parce que i atteint argc et le while le sait',
          "Parce qu'elle sort du tableau et fait un segfault",
          'Parce que argv[i] vaut 0 quand i arrive à 10',
        ],
      },
    ],
    wrong: ['2', '4', '1'],
    why: "argv[0] vaut ./a.out, argv[1] x, argv[2] y et argv[3] NULL : la boucle s'arrête avec i = 3, soit argc.",
  },
  'pis-c06-program': {
    forms: [
      {
        ask: [
          'Que rends-tu dans les exercices du C 06 ?',
          'Contrairement au C 05, dans le C 06 tu rends…',
        ],
        right: ['Un programme complet, avec son main', 'Un .c avec son main, qui compile seul'],
        wrong: [
          'Seulement la fonction, sans aucun main',
          'Un Makefile et une bibliothèque .a',
          'Un script shell qui le lance',
          'Un en-tête .h avec le prototype',
        ],
      },
    ],
    wrong: ['Un main vide et la fonction à part', "L'exécutable déjà compilé"],
    why: 'Les exercices du C 06 demandent des programmes : le main lit argc et argv et compile tout seul.',
  },
  'pis-c07-strdup': {
    forms: [
      {
        ask: [
          'Avec src = "Madrid", combien d\'octets demande-t-elle à malloc ?',
          'Combien d\'octets réserve-t-elle pour "Madrid" ?',
        ],
        right: ['7'],
        wrong: ['6', '8', '1'],
      },
      {
        ask: ['À quoi sert le `if (!dup)` ?', 'Que vérifie `if (!dup)` ?'],
        right: [
          "À renvoyer NULL si malloc n'a pas pu réserver",
          'À ne pas écrire en mémoire si malloc a échoué',
        ],
        wrong: [
          'À ne pas copier si src est une chaîne vide',
          "À libérer dup s'il était déjà réservé",
          "À vérifier que src n'est pas NULL",
          'À savoir si src et dup sont égales',
        ],
      },
      {
        ask: [
          "Que se passe-t-il si on enlève `dup[i] = '\\0'` ?",
          "Sans la ligne `dup[i] = '\\0'`, que se passe-t-il ?",
        ],
        right: ["La copie reste sans son '\\0' final"],
        wrong: [
          'Rien : malloc met la mémoire à zéro',
          'On perd la dernière lettre de la copie',
          'Il y a une fuite de mémoire au retour',
        ],
      },
    ],
    wrong: ['6', '8', '1'],
    why: "malloc réserve strlen + 1 octets (le dernier pour le '\\0') sans les mettre à zéro ; en cas d'échec, il renvoie NULL et il ne faut rien écrire.",
  },
  'pis-c07-range': {
    forms: [
      {
        ask: [
          "Combien d'ints contient le tableau de `ft_range(3, 7)` ?",
          'Combien de nombres renvoie `ft_range(3, 7)` ?',
        ],
        right: ['4'],
        wrong: ['5', '3', '7'],
      },
      {
        ask: ['Que renvoie `ft_range(5, 5)` ?', 'Si min et max sont égaux, que renvoie ft_range ?'],
        right: ['NULL', 'Un pointeur nul'],
        wrong: [
          'Un tableau avec le 5',
          'Un tableau vide de taille 0',
          'Le nombre 0',
          'Un tableau avec 5 et 5',
        ],
      },
    ],
    wrong: ['5', '3', '7'],
    why: 'ft_range va de min inclus à max exclu (3, 4, 5 et 6) ; si min >= max, elle renvoie NULL.',
  },
  'pis-c07-range-bytes': {
    forms: [
      {
        ask: [
          "Combien d'octets demande-t-elle à malloc, avec un int de 4 octets ?",
          "Avec un int de 4 octets, combien d'octets réserve-t-elle ?",
        ],
        right: ['20'],
        wrong: ['12', '5', '24', '16'],
      },
      {
        ask: [
          'Quel est le dernier nombre du tableau ?',
          'Quelle valeur reste dans la dernière case ?',
        ],
        right: ['2'],
        wrong: ['3', '1', '4'],
      },
    ],
    wrong: ['12', '24', '3'],
    why: 'De -2 à 3, sans le 3, il y a 5 nombres (-2, -1, 0, 1 et 2), et 5 × sizeof(int) font 20 octets.',
  },
  'pis-c07-ultimate-range': {
    forms: [
      {
        ask: [
          'Si min >= max, que fait ft_ultimate_range ?',
          'Avec min >= max, comment finit ft_ultimate_range ?',
        ],
        right: ['Elle met *range à NULL et renvoie 0'],
        wrong: [
          'Elle met *range à NULL et renvoie -1',
          'Elle laisse *range tel quel et renvoie 0',
          'Elle réserve un int et renvoie 1',
          'Elle renvoie max - min, qui est négatif',
        ],
      },
      {
        ask: [
          'Si malloc échoue, que renvoie ft_ultimate_range ?',
          'Quand malloc ne peut pas réserver, que renvoie ft_ultimate_range ?',
        ],
        right: ['Elle renvoie -1'],
        wrong: ['Elle renvoie 0', 'Elle renvoie NULL', 'Elle renvoie la taille voulue'],
      },
      {
        ask: [
          'Pourquoi ft_ultimate_range reçoit-elle `int **range` ?',
          'À quoi sert le double pointeur de ft_ultimate_range ?',
        ],
        right: [
          "À laisser dans *range le tableau qu'elle réserve",
          "À modifier le pointeur de celui qui l'appelle",
        ],
        wrong: [
          "Parce qu'elle renvoie un tableau à deux dimensions",
          'Pour que range soit en lecture seule',
          'Parce que chaque nombre a son propre malloc',
          'Pour recevoir min et max dans range',
        ],
      },
    ],
    wrong: ['Elle renvoie 0', 'Elle renvoie NULL', 'Elle renvoie la taille voulue'],
    why: "ft_ultimate_range renvoie la taille et laisse le tableau dans *range, d'où l'adresse du pointeur en paramètre ; si min >= max, *range = NULL et 0 ; si malloc échoue, -1.",
  },
  'pis-c07-strjoin': {
    forms: [
      {
        ask: ['Quelle chaîne renvoie-t-elle ?', 'Que renvoie cet appel ?'],
        right: ['a, b, c'],
        wrong: ['a, b, c,', 'abc', ', a, b, c', 'a,b,c'],
      },
      {
        ask: [
          "Combien d'octets faut-il réserver pour le résultat ?",
          "Combien d'octets demande le malloc exact ?",
        ],
        right: ['8'],
        wrong: ['7', '9', '10', '6'],
      },
      {
        ask: [
          'Avec size = 0, que renvoie ft_strjoin ?',
          'Si size vaut 0, que doit-elle renvoyer ?',
        ],
        right: [
          "Une chaîne vide que l'on peut passer à free",
          'Un "" réservé avec malloc, que l\'on libère',
        ],
        wrong: [
          "NULL, puisqu'il n'y a rien à joindre",
          'Le séparateur, sans aucune chaîne',
          'Un pointeur vers strs[0], sans la copier',
          'Une chaîne avec un seul espace',
        ],
      },
    ],
    wrong: ['7', '9', '10'],
    why: "Le séparateur ne va qu'entre les chaînes, pas à la fin : 3 lettres, 2 séparateurs de 2 et le '\\0' font 8 octets ; avec size 0, on renvoie une chaîne vide réservée.",
  },
  'pis-c07-split': {
    forms: [
      {
        ask: [
          'Combien de mots renvoie-t-elle ?',
          'Combien de chaînes y a-t-il dans tab avant la fin ?',
        ],
        right: ['3'],
        wrong: ['4', '2', '5', '6'],
      },
      {
        ask: ["Qu'y a-t-il dans la dernière case de tab ?", 'Par quoi finit le tableau tab ?'],
        right: ['Un pointeur nul (0)', 'NULL, qui marque la fin'],
        wrong: [
          'La chaîne "42"',
          'Une chaîne vide ""',
          'La chaîne " ," du séparateur',
          'La chaîne "mundo  42"',
        ],
      },
      {
        ask: [
          'Comment ft_split traite-t-elle son deuxième argument, " ," ?',
          'Que signifie " ," pour ft_split ?',
        ],
        right: ['Comme un ensemble : chaque caractère coupe', "Comme deux séparateurs, ' ' et ','"],
        wrong: [
          'Comme un seul séparateur de deux caractères',
          'Comme le texte exact à chercher',
          "Elle ne prend que le premier, l'espace",
          'Comme une expression régulière',
        ],
      },
    ],
    wrong: ['4', '2', '5'],
    why: 'Chaque caractère de la chaîne de séparateurs coupe, et des séparateurs collés ne donnent pas de mots vides : on obtient hola, mundo et 42, et le tableau finit par un pointeur à 0.',
  },
  'pis-c07-split-free': {
    forms: [
      {
        ask: [
          'Comment libérer tout ce que renvoie ft_split ?',
          'Pour ne pas avoir de fuites avec le résultat de ft_split, que faut-il libérer ?',
        ],
        right: [
          'Un free par mot, puis un pour le tableau',
          "D'abord chaque mot, et le tableau à la fin",
        ],
        wrong: [
          'Un seul free du tableau, qui libère tout',
          "D'abord le tableau, puis chaque mot",
          'free(*tab), qui libère tous les mots',
          'Rien : les mots sont des littéraux',
        ],
      },
    ],
    wrong: ['Seulement le dernier mot, celui du NULL', 'Un free par mot, sans le tableau'],
    why: "Chaque mot est un malloc et le tableau en est un autre : on libère les mots puis le tableau, qu'on ne pourrait plus lire s'il partait en premier.",
  },
  'pis-c07-malloc-size': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas ?", 'Quelle erreur y a-t-il dans cette allocation ?'],
        right: ['Elle réserve 5 octets, pas 5 ints', 'Il faudrait malloc(sizeof(int) * 5)'],
        wrong: [
          'malloc ne peut pas réserver des ints',
          'Il faut mettre tab à NULL avant',
          'Il faudrait malloc(sizeof(tab))',
          'Il faut un cast : (int)malloc(5)',
        ],
      },
      {
        ask: ["Combien d'octets réserve-t-elle ?", "Combien d'octets y a-t-il dans tab ?"],
        right: ['5'],
        wrong: ['20', '40', '4'],
      },
    ],
    code: 'int *tab;\n\ntab = malloc(5);\n/* on utilise tab[0] ... tab[4] */',
    wrong: ['20', '40', '4'],
    why: 'malloc compte des octets, pas des éléments : pour 5 ints, il faut demander 5 × sizeof(int), en général 20.',
  },
  'pis-c07-leak': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas dans ce code ?", 'Quel problème a-t-il ?'],
        right: [
          'Le premier malloc est perdu : il y a une fuite',
          'La copie de "hola" n\'est jamais libérée',
        ],
        wrong: [
          'Il libère "mundo" deux fois : double free',
          'Il écrit hors de la mémoire réservée',
          'Rien : le dernier free suffit',
          'On ne peut pas appeler ft_strdup deux fois',
        ],
      },
      {
        ask: ["Combien d'octets restent sans être libérés ?", "Combien d'octets perd-il ?"],
        right: ['5'],
        wrong: ['4', '6', '11', '0'],
      },
    ],
    wrong: ['4', '6', '11'],
    why: 'En réaffectant s, on perd la seule adresse de la copie de "hola" (5 octets avec le \'\\0\') : plus personne ne peut la libérer.',
  },
  'pis-c07-convert-base': {
    forms: [
      {
        ask: [
          'Que renvoie le premier appel ?',
          "De l'hexadécimal au binaire, que renvoie-t-elle ?",
        ],
        right: ['11111111'],
        wrong: ['255', '1111111', '111111111', '11110000'],
      },
      {
        ask: [
          'Que renvoie le deuxième appel ?',
          "Du décimal à l'hexadécimal, que renvoie-t-elle ?",
        ],
        right: ['-A'],
        wrong: ['A', '-a', 'A-', '-F'],
      },
      {
        ask: [
          "Si l'une des deux bases n'est pas valide, que renvoie ft_convert_base ?",
          'Avec une base invalide, que renvoie ft_convert_base ?',
        ],
        right: ['NULL'],
        wrong: ['La chaîne "0"', 'nbr inchangé', 'Une chaîne vide'],
      },
    ],
    wrong: ['255', '1111111', '11110000'],
    why: "ft_convert_base lit nbr dans base_from et l'écrit, réservé avec malloc, dans base_to : ff vaut 255, soit 11111111 en binaire, et -10 donne -A ; si une base est invalide, NULL.",
  },
  'pis-c07-char-pp': {
    forms: [
      {
        ask: [
          "Qu'est-ce que le `char **` que renvoie ft_split ?",
          "Un `char **` utilisé comme dans ft_split, c'est…",
        ],
        right: [
          'Un tableau de pointeurs vers des chaînes',
          'Un pointeur vers des pointeurs sur char',
        ],
        wrong: [
          'Une chaîne deux fois plus longue',
          'Un tableau fixe char[10][10]',
          'Un pointeur vers un seul char',
          'Un char qui occupe deux octets',
        ],
      },
    ],
    wrong: ["Un tableau d'int", 'Un pointeur sur fonction'],
    why: "Chaque case d'un char ** est un char *, une chaîne : c'est un tableau de chaînes, comme argv.",
  },
  'pis-c07-use-after-free': {
    forms: [
      {
        ask: ["Qu'est-ce qui ne va pas dans ces lignes ?", "Quelle est l'erreur ?"],
        right: ['Elle écrit dans de la mémoire libérée', 'Elle utilise s après le free'],
        wrong: [
          'Une fuite : il manque un free',
          'Un littéral ne se modifie pas',
          'Il y a un double free de s',
          'Rien : s pointe toujours là',
        ],
      },
    ],
    wrong: ['ft_strdup renvoie NULL', 'Il manque un cast en char'],
    why: "Après free(s), la mémoire ne t'appartient plus même si s garde l'adresse : y écrire est un comportement indéfini.",
  },
}
