/** Banco de Not-games en francés: algoritmos y concurrencia (`../algorithms.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const ALGORITHMS_FR: Readonly<Record<string, ConceptText>> = {
  'ps-ops': {
    forms: [
      {
        ask: ['Que fait `sa` dans push_swap ?', "Dans push_swap, que fait l'opération `sa` ?"],
        right: ['Il échange les deux premiers éléments de a'],
        wrong: [
          'Il met le sommet de a au sommet de b',
          'Il décale a vers le haut et le premier passe en bas',
          'Il échange le premier de a avec celui de b',
          'Il échange le premier et le dernier de la pile a',
        ],
      },
      {
        ask: ['Que fait `pb` dans push_swap ?', "Dans push_swap, que fait l'opération `pb` ?"],
        right: ['Il met le sommet de a au sommet de b'],
        wrong: [
          'Il met le sommet de b au sommet de a',
          'Il échange les deux premiers de b',
          'Il décale b vers le bas et le dernier monte',
        ],
      },
      {
        ask: ['Que fait `rr` dans push_swap ?', "Dans push_swap, que fait l'opération `rr` ?"],
        right: ['Il fait ra et rb en même temps'],
        wrong: [
          'Il fait rra et rrb en même temps',
          'Il fait ra deux fois de suite',
          'Il fait tourner a vers le bas',
        ],
      },
      {
        ask: ['Que fait `rrr` dans push_swap ?', "Dans push_swap, que fait l'opération `rrr` ?"],
        right: ['Il fait rra et rrb en même temps'],
        wrong: [
          'Il fait ra et rb en même temps',
          'Il fait rra trois fois de suite',
          'Il fait rr puis rra',
        ],
      },
      {
        ask: ['Que fait `pa` si la pile b est vide ?', 'Avec b vide, que se passe-t-il sur `pa` ?'],
        right: ['Il ne fait rien'],
        wrong: ['Il affiche « Error » et sort', 'Il empile un 0 sur a', 'Il fait pb à la place'],
      },
    ],
    wrong: [
      'Il vide toute la pile b',
      'Il trie les trois premiers de a',
      'Il retourne toute la pile a',
    ],
    why: 'sa échange les deux du haut de a, pb passe le sommet de a sur b, ra tourne vers le haut et rra vers le bas ; ss, rr et rrr font pareil sur les deux piles.',
  },
  'ps-sequence': {
    forms: [
      {
        ask: [
          'a = 3 1 2 (sommet à gauche) et b est vide. Que donnent les piles après `sa` et `pb` ?',
          'Avec a = 3 1 2 (le 3 en haut) et b vide, tu fais `sa` puis `pb`. Comment sont les piles ?',
        ],
        right: ['a = 3 2, b = 1'],
        wrong: ['a = 1 2, b = 3', 'a = 1 3, b = 2', 'a = 2 3, b = 1', 'a = 3 1, b = 2'],
      },
      {
        ask: [
          'a = 1 2 3 et b = 4 5 (sommets à gauche). Que devient a après `pa` et `rra` ?',
          'Avec a = 1 2 3 et b = 4 5 (le 1 et le 4 en haut), tu fais `pa` puis `rra`. Comment est a ?',
        ],
        right: ['3 4 1 2'],
        wrong: ['4 1 2 3', '1 2 3 4', '4 3 1 2', '3 5 1 2'],
      },
    ],
    wrong: ['Comme avant', 'Vides toutes les deux'],
    why: "Elles s'appliquent dans l'ordre : sa échange les deux du haut, pb et pa passent le sommet d'une pile à l'autre et rra fait monter celui du fond.",
  },
  'ps-limits': {
    forms: [
      {
        ask: [
          "Pour la note maximale de push_swap, en moins de combien d'opérations faut-il trier 100 nombres au hasard ?",
          "Avec 100 nombres au hasard, sous combien d'opérations push_swap demande-t-il de rester pour la note maximale ?",
        ],
        right: ['700'],
        wrong: ['1100', '500', '1500', '300'],
      },
      {
        ask: [
          "Pour la note maximale de push_swap, combien d'opérations au plus sont acceptées avec 500 nombres au hasard ?",
          "Avec 500 nombres au hasard, quel est le maximum d'opérations de push_swap pour la note maximale ?",
        ],
        right: ['5500'],
        wrong: ['7000', '3500', '11500', '8500'],
      },
    ],
    wrong: ['1000', '2000', '10000'],
    why: 'La correction compte les opérations : la note maximale exige moins de 700 avec 100 nombres et pas plus de 5500 avec 500.',
  },
  'ps-errors': {
    forms: [
      {
        ask: [
          'Tu passes un nombre en double à push_swap. Que fait-il ?',
          "Que fait push_swap si un argument n'est pas un entier, comme « 12a » ?",
          'Que fait push_swap avec un nombre qui ne tient pas dans un int ?',
        ],
        right: ['Il affiche « Error » et un retour à la ligne sur stderr'],
        wrong: [
          'Il le saute et trie le reste des nombres',
          'Il affiche « Error » sur la sortie standard',
          'Il affiche « KO » suivi d’un retour à la ligne',
          'Il continue et laisse ce nombre à sa place',
        ],
      },
      {
        ask: [
          'Que fait push_swap si tu le lances sans arguments ?',
          'Tu lances `./push_swap` sans rien d’autre. Que doit-il se passer ?',
        ],
        right: ["Il n'affiche rien et se termine"],
        wrong: [
          'Il affiche « Error » sur stderr',
          "Il attend des nombres sur l'entrée",
          'Il affiche comment utiliser le programme',
        ],
      },
    ],
    wrong: ['Il reste bloqué pour toujours', 'Il trie une pile vide et affiche OK'],
    why: "Le sujet demande « Error » et un retour à la ligne sur la sortie d'erreur pour tout mauvais argument, et rien quand il n'y a pas d'arguments.",
  },
  'ps-output': {
    forms: [
      {
        ask: [
          'Comment push_swap affiche-t-il la liste des instructions ?',
          'Où et sous quel format push_swap sort-il les opérations ?',
        ],
        right: ['Une par ligne, sur la sortie standard'],
        wrong: [
          'Toutes sur une ligne, séparées par des virgules',
          "Une par ligne, sur la sortie d'erreur",
          'Dans un fichier que checker lit ensuite',
        ],
      },
      {
        ask: [
          "Qu'affiche push_swap si les nombres sont déjà triés ?",
          'Avec `./push_swap 1 2 3`, que sort-il ?',
        ],
        right: ['Rien : aucune instruction'],
        wrong: [
          'OK et un retour à la ligne',
          "« Error » sur la sortie d'erreur",
          'Un sa pour vérifier',
        ],
      },
    ],
    wrong: ['Les piles après chaque étape'],
    why: "push_swap affiche la liste la plus courte qu'il trouve, une instruction par ligne sur stdout ; si c'est déjà trié, la plus courte, c'est ne rien faire.",
  },
  'ps-checker': {
    forms: [
      {
        ask: [
          "Qu'affiche `checker` si, après les instructions, a est triée et b vide ?",
          'Les instructions laissent a triée et b vide. Que répond checker ?',
        ],
        right: ['OK'],
        wrong: ['KO', 'Error', 'Rien'],
      },
      {
        ask: [
          "Qu'affiche `checker` si a finit triée mais que b n'est pas vide ?",
          'Les instructions laissent a triée, mais il reste des nombres dans b. Que répond checker ?',
        ],
        right: ['KO'],
        wrong: ['OK', 'Error', 'Rien'],
      },
      {
        ask: [
          'Où `checker` lit-il les instructions ?',
          'Dans le bonus de push_swap, par où les opérations arrivent-elles à checker ?',
        ],
        right: ["Sur l'entrée standard, une par ligne"],
        wrong: [
          'Dans les arguments, après les nombres',
          'Dans un fichier nommé instructions.txt',
          "Sur la sortie d'erreur de push_swap",
        ],
      },
    ],
    wrong: ['Trié', 'Fini'],
    why: "checker lit les instructions sur stdin, les applique et n'affiche OK que si a est triée et b vide ; sinon, KO.",
  },
  'algo-rotate': {
    forms: [
      {
        ask: [
          'La pile a est 1 2 3 4 5 (le 1 en haut). Comment est-elle après `ra` ?',
          'Avec a = 1 2 3 4 5 (le sommet à gauche), que donne une rotation vers le haut ?',
        ],
        right: ['2 3 4 5 1'],
        wrong: ['5 1 2 3 4', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
      {
        ask: [
          'La pile a est 1 2 3 4 5 (le 1 en haut). Comment est-elle après `rra` ?',
          'Avec a = 1 2 3 4 5 (le sommet à gauche), que donne une rotation vers le bas ?',
        ],
        right: ['5 1 2 3 4'],
        wrong: ['2 3 4 5 1', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
    ],
    wrong: ['5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
    why: 'ra fait tout monter et celui du haut passe au fond ; rra fait l’inverse : celui du fond passe en haut.',
  },
  'algo-three': {
    forms: [
      {
        ask: [
          "Combien d'opérations faut-il, au maximum, pour trier 3 nombres dans push_swap ?",
          "Dans le pire des cas, combien d'opérations coûte le tri d'une pile de 3 éléments ?",
        ],
        right: ['2'],
      },
    ],
    wrong: ['1', '3', '4', '6'],
    why: "Il y a 6 ordres possibles et tous se règlent avec sa, ra, rra ou une paire d'entre elles : jamais plus de 2.",
  },
  'algo-radix': {
    forms: [
      {
        ask: ['Comment le tri radix trie-t-il ?', 'Que fait le radix sort pour trier ?'],
        right: [
          'Par bits ou chiffres, un à un, sans comparer',
          'Il regroupe selon chaque bit, du moins significatif au plus',
        ],
      },
    ],
    wrong: [
      'Il compare chaque paire de voisins et les échange',
      'Il choisit un pivot et coupe la liste en deux',
      'Il insère chaque élément à sa place, un à un',
      'Il coupe en moitiés, trie chacune et les fusionne',
    ],
    why: "Le radix répartit selon chaque chiffre ou bit ; avec des indices normalisés et des bits, il s'adapte bien à deux piles.",
  },
  'algo-quicksort': {
    forms: [
      {
        ask: [
          'Quand le quicksort tombe-t-il dans son pire cas, O(n²) ?',
          "Qu'est-ce qui rend le quicksort quadratique ?",
        ],
        right: [
          'Un pivot qui est toujours le minimum ou le maximum',
          'Des partitions qui sortent très déséquilibrées',
        ],
        wrong: [
          'Des nombres entiers très grands',
          'Une liste de moins de dix éléments',
          'Des nombres négatifs mêlés aux positifs',
          'Rien : le quicksort coûte toujours n log n',
        ],
      },
      {
        ask: [
          'Quel tri coupe la liste en deux, trie chaque moitié et les réunit ?',
          "Comment s'appelle le tri qui coupe en deux, trie chaque moitié et les fusionne ?",
        ],
        right: ['Merge sort'],
        wrong: ['Quicksort', 'Bubble sort', 'Insertion sort', 'Radix sort'],
      },
    ],
    wrong: ['Des nombres entiers très grands', 'Des nombres négatifs mêlés aux positifs'],
    why: 'Le quicksort dépend du pivot ; le merge sort coupe toujours au milieu et coûte toujours n log n.',
  },
  'algo-binary-search': {
    forms: [
      {
        ask: [
          "Combien d'étapes faut-il, au maximum, à une recherche dichotomique dans 1000 éléments ?",
          "En coupant en deux parmi 1000 éléments, en combien d'étapes arrives-tu au maximum ?",
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['20', '50'],
    why: 'Chaque étape écarte la moitié de ce qui reste, et 2¹⁰ = 1024 dépasse déjà 1000 : 10 suffisent.',
  },
  'algo-bfs-dfs': {
    forms: [
      {
        ask: [
          'Quel parcours trouve le plus court chemin (en nombre de pas) dans un labyrinthe ?',
          'Pour atteindre la sortie en un minimum de pas, comment parcours-tu ?',
        ],
        right: ['En largeur (BFS)'],
        wrong: ['En profondeur (DFS)', 'Au hasard', 'En suivant le mur de droite'],
      },
      {
        ask: [
          'Quelle structure utilise un parcours en profondeur (DFS) sans récursion ?',
          'Où un DFS écrit à la main garde-t-il les nœuds qui restent à visiter ?',
        ],
        right: ['Dans une pile'],
        wrong: ['Dans une file', 'Dans un tas', 'Dans une table de hachage'],
      },
    ],
    wrong: ['En profondeur (DFS)', 'Au hasard', 'En suivant le mur de droite'],
    why: 'Le BFS avance par couches (avec une file) : le premier arrivé arrive par le plus court chemin. Le DFS va au fond (avec une pile).',
  },
  'algo-dijkstra': {
    forms: [
      {
        ask: ["À quoi sert l'algorithme de Dijkstra ?", 'Que trouve Dijkstra ?'],
        right: [
          'Le plus court chemin avec des poids positifs ou nuls',
          "La distance minimale d'une origine à chaque nœud",
        ],
        wrong: [
          "L'arbre couvrant minimal du graphe",
          'Un cycle qui passe une fois par chaque nœud',
          "L'ordre topologique d'un graphe orienté",
        ],
      },
      {
        ask: [
          'Dans quel cas Dijkstra ne marche-t-il pas ?',
          'Avec quel type de graphe Dijkstra peut-il échouer ?',
        ],
        right: ['Avec des poids négatifs'],
        wrong: ['Avec des poids décimaux', 'Avec des cycles orientés', 'Avec plus de mille nœuds'],
      },
    ],
    wrong: ["L'arbre couvrant minimal du graphe", "L'ordre topologique d'un graphe orienté"],
    why: 'Dijkstra fige le nœud le plus proche ; un poids négatif pourrait ensuite raccourcir un nœud déjà figé.',
  },
  'algo-maze-perfect': {
    forms: [
      {
        ask: [
          "Qu'a de spécial un labyrinthe « parfait » ?",
          'Que doit respecter un labyrinthe pour être dit parfait ?',
        ],
        right: ["Entre deux cases, il n'y a qu'un seul chemin"],
        wrong: [
          "Il n'a aucune sortie sur le bord",
          'Il est symétrique par rapport au centre',
          'Il y a plusieurs chemins vers la sortie',
          "Il n'a aucune impasse nulle part",
        ],
      },
      {
        ask: [
          'Dans un labyrinthe parfait, combien de chemins y a-t-il entre deux cases ?',
          "Combien de chemins différents relient l'entrée et la sortie d'un labyrinthe parfait ?",
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          "Vu comme un graphe, qu'est-ce qu'un labyrinthe parfait ?",
          "Quelle structure forment les cases et les passages d'un labyrinthe parfait ?",
        ],
        right: ['Un arbre'],
        wrong: ['Un graphe complet', 'Un cycle', 'Un graphe avec des cycles'],
      },
    ],
    wrong: ['Un graphe complet', 'Un cycle'],
    why: "Sans cycles et entièrement connexe : c'est un arbre, et c'est pour ça qu'il y a un seul chemin entre deux points.",
  },
  'algo-maze-gen': {
    forms: [
      {
        ask: [
          "Tu génères un labyrinthe avec un DFS : depuis une case tu vas vers une voisine non visitée au hasard, tu abats le mur et, s'il n'en reste aucune, tu reviens en arrière. Qu'est-ce que ça donne ?",
          'Que génère le « recursive backtracker » (DFS qui abat les murs) ?',
        ],
        right: [
          'Un labyrinthe parfait, aux longs couloirs',
          'Un arbre qui couvre toutes les cases',
        ],
      },
    ],
    wrong: [
      'Un labyrinthe plein de cycles et de raccourcis',
      "Un labyrinthe qui n'a pas de solution",
      "Un couloir droit d'un côté à l'autre",
      'Un labyrinthe avec des zones isolées',
    ],
    why: "Il n'entre jamais dans une case déjà visitée (pas de cycles) et ne s'arrête pas avant de toutes les visiter (tout est connexe).",
  },
  'thr-race': {
    forms: [
      {
        ask: ["Qu'est-ce qu'une data race ?", 'Quand y a-t-il une data race ?'],
        right: ['Quand deux threads touchent une donnée en même temps, un écrit, sans mutex'],
        wrong: [
          "Quand un thread finit avant qu'un autre commence",
          'Quand un thread prend presque tout le CPU du processus',
          "Quand deux threads s'attendent l'un l'autre pour toujours",
          'Quand le programme va plus vite avec des threads que sans',
        ],
      },
      {
        ask: [
          "Deux threads touchent la même variable en même temps, au moins l'un écrit et il n'y a pas de mutex. Comment ça s'appelle ?",
        ],
        right: ['Data race'],
        wrong: ['Interblocage', 'Famine', 'Changement de contexte'],
      },
    ],
    wrong: [
      "Quand un thread finit avant qu'un autre commence",
      'Quand un thread prend presque tout le CPU du processus',
    ],
    why: "Sans mutex (ou autre synchronisation), le résultat dépend de la façon dont les threads s'entremêlent.",
  },
  'thr-counter': {
    code: 'int count = 0;\n\nvoid *add(void *arg)\n{\n    for (int i = 0; i < 100000; i++)\n        count++;\n    return NULL;\n}\n\n/* main lance deux threads avec add et attend les deux */',
    forms: [
      {
        ask: ['Que vaut `count` à la fin ?', 'Quand les deux threads ont fini, que vaut count ?'],
        right: [
          "Ça peut être moins de 200000 : count++ n'est pas atomique",
          'On ne sait pas, mais ça donne souvent moins de 200000',
        ],
      },
    ],
    wrong: [
      'Toujours 200000 : chaque thread ajoute 100000',
      'Toujours 100000 : seul le dernier thread compte',
      'Toujours 200000, car main attend les deux',
      'Toujours 0 : chaque thread ajoute à sa propre copie',
    ],
    why: "count++, c'est lire, ajouter et écrire : deux threads peuvent lire la même valeur et une addition se perd.",
  },
  'thr-deadlock': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un interblocage (deadlock) ?", 'Quand y a-t-il un interblocage ?'],
        right: ["Quand plusieurs threads s'attendent entre eux et aucun n'avance"],
        wrong: [
          'Quand un thread est bien plus lent que les autres',
          'Quand deux threads écrivent la même donnée en même temps',
          'Quand un thread finit avant la fin de main',
        ],
      },
      {
        ask: [
          "Chaque thread attend quelque chose qu'un autre détient, et personne ne lâche. Comment ça s'appelle ?",
        ],
        right: ['Interblocage'],
        wrong: ['Data race', 'Famine', 'Fuite de mémoire'],
      },
      {
        ask: [
          "Tous les philosophes prennent d'abord la fourchette de gauche. Que peut-il se passer ?",
          'Si chaque philosophe prend sa fourchette gauche et attend la droite, que peut-il se passer ?',
        ],
        right: [
          "Qu'ils restent tous à attendre pour toujours",
          'Que personne ne prenne la seconde ni ne lâche la première',
        ],
        wrong: [
          'Que chacun mange deux fois de suite sans arrêt',
          "Qu'ils mangent tous en même temps avec une seule fourchette",
          "Rien : c'est la bonne façon d'éviter les blocages",
        ],
      },
    ],
    wrong: [
      'Quand un thread est bien plus lent que les autres',
      'Quand deux threads écrivent la même donnée en même temps',
    ],
    why: "Avec une attente circulaire, personne n'avance. Casser le cycle (par exemple, les pairs prennent d'abord l'autre fourchette) l'évite.",
  },
  'thr-mutex': {
    forms: [
      {
        ask: ['À quoi sert un mutex ?', 'Que garantit un mutex ?'],
        right: [
          "Qu'un seul thread à la fois entre dans une section",
          "Qu'un seul thread à la fois tienne le verrou",
        ],
        wrong: [
          'Que les threads aillent plus vite en partageant',
          "Que les threads démarrent dans l'ordre du code",
          'Que la mémoire puisse être partagée entre processus',
          'Que le temps soit bien mesuré dans chaque thread',
        ],
      },
      {
        ask: [
          'Que se passe-t-il si un thread fait `pthread_mutex_lock` deux fois de suite sur le même mutex normal ?',
          'Un thread verrouille deux fois de suite le même mutex de type normal. Que se passe-t-il ?',
        ],
        right: ["Il se bloque pour toujours en s'attendant lui-même"],
        wrong: [
          'Rien : le second lock est simplement ignoré',
          "Il se déverrouille, car lock inverse l'état",
          'Le second lock passe et le mutex compte deux',
        ],
      },
    ],
    wrong: [
      'Que les threads aillent plus vite en partageant',
      "Que les threads démarrent dans l'ordre du code",
    ],
    why: "lock attend que le verrou soit libre ; si c'est toi qui l'as déjà, tu t'attends toi-même.",
  },
  'thr-join-detach': {
    forms: [
      {
        ask: ['Que fait `pthread_join` ?', 'À quoi sert `pthread_join(th, NULL)` ?'],
        right: [
          'Il attend que ce thread se termine',
          'Il attend le thread et récupère ce qu’il renvoie',
        ],
        wrong: [
          'Il lance un nouveau thread avec cette fonction',
          'Il fusionne deux threads en un seul',
          'Il verrouille le mutex de ce thread',
          'Il endort le thread courant quelques millisecondes',
        ],
      },
      {
        ask: ['Que fait `pthread_detach` ?', "Qu'est-ce qui change quand tu détaches un thread ?"],
        right: [
          'Il se libère seul en finissant, sans être attendu',
          "On ne peut plus l'attendre avec join",
        ],
        wrong: [
          "Le thread courant attend qu'il se termine",
          'Le thread est tué à ce moment précis',
          "Le thread se met en pause jusqu'à un signal",
        ],
      },
    ],
    wrong: [
      'Il lance un nouveau thread avec cette fonction',
      'Il fusionne deux threads en un seul',
    ],
    why: 'Chaque thread se récupère avec join ou se lâche avec detach ; sinon, ses ressources restent.',
  },
  'thr-usleep': {
    forms: [
      {
        ask: [
          'Un philosophe meurt si 410 ms passent sans manger, et ton thread de surveillance fait `usleep(500000)` entre deux vérifications. Qu’est-ce qui ne va pas ?',
          'Pourquoi un surveillant qui dort une demi-seconde entre deux vérifications ne marche-t-il pas ?',
        ],
        right: [
          'Il annonce la mort en retard : vérifie toutes les quelques ms',
          'Il peut avoir 500 ms de retard, et la limite est de 10 ms',
        ],
      },
    ],
    wrong: [
      'Rien : usleep dort exactement ce que tu demandes',
      'Le philosophe meurt trop tôt à cause du usleep',
      "usleep ne s'utilise pas dans un thread",
      'Il bloque tous les philosophes en même temps',
    ],
    why: 'La mort doit être annoncée au plus 10 ms après ; en plus, usleep peut dormir plus que demandé.',
  },
  'thr-print': {
    forms: [
      {
        ask: [
          "Qu'évite-t-on en protégeant par un mutex le printf des messages ?",
          'Sans mutex pour écrire, que peut-il arriver aux messages de plusieurs threads ?',
        ],
        right: [
          "Qu'ils se mélangent ou sortent après une mort",
          "Qu'ils se coupent ou sortent après le « died »",
        ],
      },
    ],
    wrong: [
      'Que printf ne marche plus dans les autres threads',
      "Que le programme ralentisse à l'écriture",
      'Que le compilateur signale une data race',
      'Que le buffer consomme plus de mémoire',
    ],
    why: 'Un message après « died » est un bug ; ce même mutex évite aussi les lignes mélangées.',
  },
  'philo-args': {
    forms: [
      {
        ask: [
          "Combien d'arguments obligatoires prend `philo` ?",
          "Sans compter l'optionnel, combien d'arguments prend `./philo` ?",
        ],
        right: ['4'],
        wrong: ['5', '3', '6', '2'],
      },
      {
        ask: [
          'En quelle unité sont time_to_die, time_to_eat et time_to_sleep ?',
          'Dans `./philo 5 800 200 200`, en quelle unité sont le 800 et les 200 ?',
        ],
        right: ['En millisecondes'],
        wrong: ['En microsecondes', 'En secondes', 'En dixièmes de seconde'],
      },
      {
        ask: [
          'Dans quel ordre vont les arguments de `philo` ?',
          'Quel ordre suivent les arguments obligatoires de philosophers ?',
        ],
        right: ['Philosophes, mourir, manger, dormir'],
        wrong: [
          'Philosophes, manger, dormir, mourir',
          'Philosophes, dormir, manger, mourir',
          'Mourir, manger, dormir, philosophes',
        ],
      },
    ],
    wrong: ['Manger, dormir, mourir, philosophes'],
    why: 'Ce sont number_of_philosophers, time_to_die, time_to_eat et time_to_sleep, en millisecondes, plus un cinquième facultatif.',
  },
  'philo-must-eat': {
    forms: [
      {
        ask: [
          'Que fait le cinquième argument, number_of_times_each_philosopher_must_eat ?',
          'Si tu donnes number_of_times_each_philosopher_must_eat, quand la simulation s’arrête-t-elle ?',
        ],
        right: ['Elle s’arrête quand tous ont mangé au moins autant de fois'],
        wrong: [
          'Chaque philosophe meurt après avoir mangé autant de fois',
          'Elle s’arrête quand le premier a mangé autant de fois',
          'C’est le nombre de fourchettes sur la table',
        ],
      },
      {
        ask: [
          'Sans number_of_times_each_philosopher_must_eat, quand la simulation finit-elle ?',
          "Sans l'argument facultatif, qu'est-ce qui arrête philo ?",
        ],
        right: ['La mort d’un philosophe'],
        wrong: ['Chacun a mangé une fois', 'Une minute entière passe', 'Tous ont dormi une fois'],
      },
    ],
    wrong: ['Elle ne s’arrête jamais : il faut un Ctrl+C'],
    why: "La simulation s'arrête à la première mort ou, avec le cinquième argument, quand tous ont mangé au moins ce nombre de fois.",
  },
  'philo-one': {
    forms: [
      {
        ask: [
          'Avec un seul philosophe (`./philo 1 800 200 200`), que doit-il se passer ?',
          'Tu lances philo avec 1 philosophe et time_to_die = 800. Qu’est-ce qui est correct ?',
        ],
        right: ['Il prend une fourchette, ne peut pas manger et meurt à 800 ms'],
        wrong: [
          'Il mange avec une seule fourchette et vit pour toujours',
          'Le programme renvoie une erreur : il en faut au moins 2',
          'Il reste à penser et ne meurt pas : personne ne lui prend rien',
        ],
      },
      {
        ask: [
          'Dans la partie obligatoire, combien de fourchettes y a-t-il à une table de N philosophes ?',
          'Combien de fourchettes y a-t-il sur la table avec N philosophes ?',
        ],
        right: ['Autant que de philosophes'],
        wrong: [
          'Une de moins que de philosophes',
          'Deux fois plus que de philosophes',
          'Moitié moins que de philosophes',
        ],
      },
    ],
    wrong: ['Il reste bloqué sans rien afficher'],
    why: 'Il y a une fourchette par philosophe ; seul, il en a une et il lui en faut deux, donc il ne mange pas et meurt à time_to_die.',
  },
  'philo-bonus': {
    forms: [
      {
        ask: [
          "Dans le bonus de philosophers, qu'est-ce que chaque philosophe ?",
          'Dans philo_bonus, comment chaque philosophe est-il lancé ?',
        ],
        right: ['Un processus'],
        wrong: ['Un thread', 'Un sémaphore', 'Un signal'],
      },
      {
        ask: [
          'Dans le bonus de philosophers, qui tient le compte des fourchettes libres ?',
          'Dans philo_bonus, que représente le nombre de fourchettes restantes ?',
        ],
        right: ['Un sémaphore compteur'],
        wrong: ['Un mutex par fourchette', 'Un tube entre voisins', 'Un fichier dans /tmp'],
      },
      {
        ask: [
          'Dans le bonus de philosophers, où sont les fourchettes ?',
          'Dans philo_bonus, comment les fourchettes sont-elles placées sur la table ?',
        ],
        right: ['Toutes au milieu de la table'],
        wrong: [
          'Une entre chaque paire de philosophes',
          'Deux devant chaque philosophe',
          'Dans les mains du processus parent',
        ],
      },
    ],
    wrong: ['Une variable globale partagée'],
    why: 'Dans le bonus, chaque philosophe est un processus et les fourchettes sont au milieu : un sémaphore tient leur nombre.',
  },
}
