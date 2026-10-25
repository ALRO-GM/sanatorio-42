/** Banco de Not-games en francés: algoritmos y concurrencia (`../algorithms.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const ALGORITHMS_FR: Readonly<Record<string, ConceptText>> = {
  'algo-sort-complexity': {
    forms: [
      {
        ask: [
          "Dans le pire cas, combien de comparaisons fait au minimum n'importe quel tri par comparaison ?",
          'Quel est le plus petit coût dans le pire cas que peut atteindre un tri par comparaison ?',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'],
      },
      {
        ask: [
          'Combien coûte le tri à bulles dans le pire cas ?',
          'Le tri à bulles, dans le pire cas, coûte…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n³)', 'O(2ⁿ)'],
    why: 'En comparant, il y a n! ordres possibles et chaque comparaison les coupe en deux : il en faut environ log₂(n!) ≈ n log n.',
  },
  'algo-stack': {
    forms: [
      {
        ask: [
          'Dans une pile, quel élément sort en premier ?',
          "Lequel retires-tu en premier d'une pile (stack) ?",
        ],
        right: ['Le dernier entré'],
        wrong: ['Le premier entré', 'Le plus petit', 'Celui du milieu'],
      },
      {
        ask: [
          'Dans une file, quel élément sort en premier ?',
          "Lequel retires-tu en premier d'une file (queue) ?",
        ],
        right: ['Le premier entré'],
        wrong: ['Le dernier entré', 'Le plus petit', 'Celui du milieu'],
      },
      {
        ask: ['Quel ordre suit une pile ?', "Quelle politique d'accès a une pile ?"],
        right: ['LIFO : dernier entré, premier sorti'],
        wrong: [
          'FIFO : premier entré, premier sorti',
          "Par priorité : le plus grand sort d'abord",
          "Au hasard : n'importe lequel sort",
        ],
      },
    ],
    wrong: ['Le plus petit', 'Celui du milieu', 'Le plus grand'],
    why: "Une pile retire par là où elle ajoute (LIFO) ; une file ajoute d'un côté et retire de l'autre (FIFO).",
  },
  'algo-rotate': {
    forms: [
      {
        ask: [
          'La pile a vaut 1 2 3 4 5, avec le 1 en haut. À quoi ressemble-t-elle après `ra` ?',
          'Avec a = 1 2 3 4 5 (le sommet à gauche), que donne une rotation vers le haut ?',
        ],
        right: ['2 3 4 5 1'],
        wrong: ['5 1 2 3 4', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
      {
        ask: [
          'La pile a vaut 1 2 3 4 5, avec le 1 en haut. À quoi ressemble-t-elle après `rra` ?',
          'Avec a = 1 2 3 4 5 (le sommet à gauche), que donne une rotation vers le bas ?',
        ],
        right: ['5 1 2 3 4'],
        wrong: ['2 3 4 5 1', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
    ],
    wrong: ['5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
    why: "ra fait tout monter et celui du haut passe en bas ; rra fait l'inverse : celui du bas passe en haut.",
  },
  'algo-three': {
    forms: [
      {
        ask: [
          "Combien d'opérations faut-il, au maximum, pour trier 3 nombres dans push_swap ?",
          "Dans le pire cas, combien d'opérations coûte le tri d'une pile de 3 éléments ?",
        ],
        right: ['2'],
      },
    ],
    wrong: ['1', '3', '4', '6'],
    why: "Il y a 6 ordres possibles et tous se règlent avec sa, ra, rra ou une paire d'entre elles : jamais plus de 2.",
  },
  'algo-radix': {
    forms: [
      {
        ask: ['Comment trie le tri radix ?', 'Que fait le radix sort pour trier ?'],
        right: [
          'Chiffre par chiffre (ou bit par bit), sans comparer les éléments entre eux',
          'Il regroupe selon chaque bit ou chiffre, en commençant par le moins significatif',
        ],
      },
    ],
    wrong: [
      "Il compare chaque paire d'éléments",
      'Il choisit un pivot et coupe en deux',
      'Il insère chaque élément à sa place',
      "Il mélange au hasard jusqu'à ce que ce soit trié",
    ],
    why: "Le radix répartit selon chaque chiffre ou bit ; avec des indices normalisés et des bits, il s'adapte bien à deux piles.",
  },
  'algo-quicksort': {
    forms: [
      {
        ask: [
          'Quand le quicksort tombe-t-il dans son pire cas, O(n²) ?',
          "Qu'est-ce qui rend le quicksort quadratique ?",
        ],
        right: [
          'Un pivot qui est toujours le minimum ou le maximum',
          'Des partitions très déséquilibrées',
        ],
        wrong: [
          'Des nombres en double',
          'Une liste très courte',
          'Des nombres négatifs',
          "Rien : c'est toujours n log n",
        ],
      },
      {
        ask: [
          'Quel tri coupe la liste en deux, trie chaque moitié et les réunit ?',
          "Comment s'appelle le tri qui coupe en deux, trie chaque moitié et les fusionne ?",
        ],
        right: ['Merge sort'],
        wrong: ['Quicksort', 'Bubble sort', 'Insertion sort', 'Radix sort'],
      },
    ],
    wrong: ['Des nombres en double', 'Une liste très courte', 'Des nombres négatifs'],
    why: 'Le quicksort dépend du pivot ; le merge sort coupe toujours au milieu et coûte toujours n log n.',
  },
  'algo-binary-search': {
    forms: [
      {
        ask: [
          'De quoi a besoin une recherche dichotomique pour fonctionner ?',
          'Comment doivent être les données pour chercher en coupant en deux ?',
        ],
        right: ['Triées'],
        wrong: ['Sans doublons', 'Dans une liste chaînée', 'En nombre pair', 'Sur la pile'],
      },
      {
        ask: [
          "Combien d'étapes faut-il, au maximum, à une recherche dichotomique dans 1000 éléments ?",
          "En coupant en deux parmi 1000 éléments, en combien d'étapes arrives-tu au maximum ?",
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['Sans doublons', 'Dans une liste chaînée', 'En nombre pair'],
    why: 'Couper en deux ne marche que si tu sais de quel côté regarder : il faut un ordre. 2¹⁰ = 1024.',
  },
  'algo-bfs-dfs': {
    forms: [
      {
        ask: [
          'Quel parcours trouve le plus court chemin (en nombre de pas) dans un labyrinthe ?',
          'Pour atteindre la sortie en un minimum de pas, comment parcours-tu ?',
        ],
        right: ['En largeur (BFS)'],
        wrong: ['En profondeur (DFS)', 'Au hasard', 'En suivant le mur de droite'],
      },
      {
        ask: [
          'Quelle structure utilise un parcours en profondeur (DFS) sans récursion ?',
          'Où un DFS écrit à la main garde-t-il les nœuds qui restent à visiter ?',
        ],
        right: ['Dans une pile'],
        wrong: ['Dans une file', 'Dans un tas', 'Dans une table de hachage'],
      },
    ],
    wrong: ['En profondeur (DFS)', 'Au hasard', 'En suivant le mur de droite'],
    why: 'Le BFS avance par couches (avec une file) : le premier arrivé arrive par le plus court chemin. Le DFS va au fond (avec une pile).',
  },
  'algo-dijkstra': {
    forms: [
      {
        ask: ["À quoi sert l'algorithme de Dijkstra ?", 'Que trouve Dijkstra ?'],
        right: [
          'Le plus court chemin avec des poids positifs ou nuls',
          "La distance minimale d'une origine aux autres nœuds, avec des poids",
        ],
        wrong: [
          "L'arbre couvrant minimal",
          'Un cycle qui passe par tous les nœuds',
          "L'ordre topologique",
        ],
      },
      {
        ask: [
          'Dans quel cas Dijkstra ne marche-t-il pas ?',
          'Avec quel type de graphe Dijkstra peut-il échouer ?',
        ],
        right: ['Avec des arêtes de poids négatif'],
        wrong: ['Avec des cycles', 'Avec plus de 100 nœuds', 'Avec des poids décimaux'],
      },
    ],
    wrong: [
      "L'arbre couvrant minimal",
      'Un cycle qui passe par tous les nœuds',
      "L'ordre topologique",
    ],
    why: 'Dijkstra considère le nœud le plus proche comme définitivement réglé ; un poids négatif pourrait ensuite raccourcir un chemin déjà fermé.',
  },
  'algo-maze-perfect': {
    forms: [
      {
        ask: [
          "Qu'a de particulier un labyrinthe « parfait » ?",
          'Dans un labyrinthe parfait, combien de chemins y a-t-il entre deux cases ?',
        ],
        right: ['Exactement un chemin entre chaque paire de cases'],
        wrong: [
          "Il n'a pas de sortie",
          'Il est symétrique',
          'Il y a plusieurs chemins vers la sortie',
          "Il n'a pas de culs-de-sac",
        ],
      },
      {
        ask: [
          "Vu comme un graphe, qu'est-ce qu'un labyrinthe parfait ?",
          "Quelle structure forment les cases et les passages d'un labyrinthe parfait ?",
        ],
        right: ['Un arbre'],
        wrong: ['Un graphe complet', 'Un cycle', 'Une liste'],
      },
    ],
    wrong: ['Un graphe complet', 'Un cycle', 'Une liste'],
    why: "Pas de cycles et tout est connecté : c'est un arbre, et c'est pour ça qu'il y a un seul chemin entre deux points.",
  },
  'algo-maze-gen': {
    forms: [
      {
        ask: [
          "Tu génères un labyrinthe avec un DFS : depuis une case, tu vas vers une voisine non visitée au hasard, tu casses le mur et, s'il n'en reste aucune, tu reviens en arrière. Qu'est-ce que ça donne ?",
          'Que génère le « recursive backtracker » (un DFS qui casse des murs) ?',
        ],
        right: [
          'Un labyrinthe parfait, avec de longs couloirs',
          'Un arbre qui couvre toutes les cases',
        ],
      },
    ],
    wrong: [
      'Un labyrinthe avec beaucoup de cycles',
      'Un labyrinthe sans solution',
      'Juste une ligne droite',
      'Un labyrinthe avec des cases isolées',
    ],
    why: "Il n'entre jamais dans une case déjà visitée (pas de cycles) et ne s'arrête pas avant de les avoir toutes visitées (tout est connecté).",
  },
  'thr-race': {
    forms: [
      {
        ask: ["Qu'est-ce qu'une data race ?", 'Quand y a-t-il une data race ?'],
        right: [
          "Quand deux threads accèdent en même temps à une donnée, qu'au moins un écrit et que rien ne les synchronise",
        ],
        wrong: [
          'Quand un thread finit avant un autre',
          'Quand un thread utilise beaucoup de CPU',
          "Quand deux threads s'attendent mutuellement pour toujours",
          'Quand le programme va plus vite avec des threads',
        ],
      },
      {
        ask: [
          "Deux threads touchent la même variable en même temps, au moins un écrit et il n'y a pas de mutex. Comment ça s'appelle ?",
        ],
        right: ['Data race'],
        wrong: ['Interblocage', 'Famine', 'Changement de contexte'],
      },
    ],
    wrong: [
      'Quand un thread finit avant un autre',
      'Quand un thread utilise beaucoup de CPU',
      'Quand le programme va plus vite avec des threads',
    ],
    why: "Sans mutex (ou autre synchronisation), le résultat dépend de la façon dont les threads s'entrelacent.",
  },
  'thr-counter': {
    code: 'int count = 0;\n\nvoid *add(void *arg)\n{\n    for (int i = 0; i < 100000; i++)\n        count++;\n    return NULL;\n}\n\n/* main lance deux threads avec add et attend les deux */',
    forms: [
      {
        ask: [
          'Que vaut `count` à la fin ?',
          'Quand les deux threads ont fini, combien vaut count ?',
        ],
        right: [
          "Il peut valoir moins de 200000 : count++ n'est pas atomique",
          'On ne sait pas ; en général, moins de 200000',
        ],
      },
    ],
    wrong: ['Toujours 200000', 'Toujours 100000', 'Ça ne compile pas', 'Toujours 0'],
    why: "count++, c'est lire, ajouter et écrire : deux threads peuvent lire la même valeur et une addition se perd.",
  },
  'thr-deadlock': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un interblocage (deadlock) ?", 'Quand y a-t-il un interblocage ?'],
        right: ["Quand plusieurs threads s'attendent mutuellement et qu'aucun ne peut avancer"],
        wrong: [
          'Quand un thread est très lent',
          'Quand deux threads écrivent en même temps',
          'Quand un thread se termine trop tôt',
        ],
      },
      {
        ask: [
          "Chaque thread attend quelque chose qu'un autre détient, et personne ne lâche rien. Comment ça s'appelle ?",
        ],
        right: ['Interblocage'],
        wrong: ['Data race', 'Famine', 'Fuite de mémoire'],
      },
      {
        ask: [
          "Tous les philosophes prennent d'abord la fourchette à leur gauche. Que peut-il se passer ?",
          'Si chaque philosophe prend sa fourchette gauche et attend la droite, que peut-il se passer ?',
        ],
        right: [
          'Ils finissent tous par attendre pour toujours',
          "Personne n'obtient la deuxième fourchette ni ne lâche la première",
        ],
        wrong: [
          'Ils mangent deux fois de suite',
          'Ils mangent tous en même temps',
          "Rien : c'est correct",
        ],
      },
    ],
    wrong: [
      'Quand un thread est très lent',
      'Quand deux threads écrivent en même temps',
      'Quand un thread se termine trop tôt',
    ],
    why: "Avec une attente circulaire, personne n'avance. Casser le cycle (par exemple, les philosophes pairs prennent d'abord l'autre fourchette) l'évite.",
  },
  'thr-mutex': {
    forms: [
      {
        ask: ['À quoi sert un mutex ?', 'Que garantit un mutex ?'],
        right: [
          "Qu'un seul thread à la fois entre dans une section",
          "Qu'un seul thread à la fois détient le verrou",
        ],
        wrong: [
          'Que les threads vont plus vite',
          "Que les threads démarrent dans l'ordre",
          'Que la mémoire peut être partagée entre processus',
          'Que le temps est bien mesuré',
        ],
      },
      {
        ask: [
          'Que se passe-t-il si un thread appelle `pthread_mutex_lock` deux fois de suite sur le même mutex normal ?',
          'Que se passe-t-il si un thread verrouille deux fois le même mutex (non récursif) ?',
        ],
        right: ["Il reste bloqué pour toujours, à s'attendre lui-même"],
        wrong: [
          'Rien : le deuxième est ignoré',
          'Il se déverrouille',
          'Il renvoie une erreur et continue',
        ],
      },
    ],
    wrong: [
      'Que les threads vont plus vite',
      "Que les threads démarrent dans l'ordre",
      'Que le temps est bien mesuré',
    ],
    why: "lock attend que le verrou soit libre ; si c'est toi qui l'as déjà, tu t'attends toi-même.",
  },
  'thr-join-detach': {
    forms: [
      {
        ask: ['Que fait `pthread_join` ?', 'À quoi sert `pthread_join(th, NULL)` ?'],
        right: [
          'Il attend que ce thread se termine',
          "Il attend le thread et récupère ce qu'il renvoie",
        ],
        wrong: [
          'Il lance un nouveau thread',
          'Il fusionne deux threads en un seul',
          'Il verrouille un mutex',
          'Il endort le thread',
        ],
      },
      {
        ask: ['Que fait `pthread_detach` ?', "Qu'est-ce qui change quand tu détaches un thread ?"],
        right: [
          "Ses ressources sont libérées quand il se termine, sans que personne ne l'attende",
          "On ne peut plus l'attendre avec join",
        ],
        wrong: [
          "On l'attend jusqu'à ce qu'il se termine",
          'Le thread est tué',
          'Le thread est mis en pause',
        ],
      },
    ],
    wrong: [
      'Il lance un nouveau thread',
      'Il fusionne deux threads en un seul',
      'Il verrouille un mutex',
    ],
    why: 'Chaque thread est récupéré avec join ou libéré avec detach ; sinon, ses ressources restent.',
  },
  'thr-usleep': {
    forms: [
      {
        ask: [
          "Un philosophe meurt s'il passe 410 ms sans manger, et ton thread de surveillance fait `usleep(500000)` entre deux vérifications. Qu'est-ce qui ne va pas ?",
          'Pourquoi un thread de surveillance qui dort une demi-seconde entre deux vérifications ne convient-il pas ?',
        ],
        right: [
          'Il annonce la mort en retard : il faut vérifier toutes les 2 ou 3 millisecondes',
          "Il peut prévenir jusqu'à 500 ms en retard, alors que la mort doit être annoncée en moins de 10 ms",
        ],
      },
    ],
    wrong: [
      'Rien : usleep est précis',
      'Le philosophe meurt trop tôt',
      'usleep ne marche pas dans les threads',
      'Ça bloque tous les philosophes',
    ],
    why: 'La mort doit être annoncée presque tout de suite ; en plus, usleep peut dormir plus longtemps que demandé.',
  },
  'thr-print': {
    forms: [
      {
        ask: [
          "Qu'évites-tu en protégeant le printf des messages avec un mutex ?",
          'Sans mutex pour écrire, que peut-il arriver aux messages de plusieurs threads ?',
        ],
        right: [
          "Ils se mélangent ou sortent après l'annonce d'une mort",
          "Ils s'interrompent les uns les autres ou sortent après le « died »",
        ],
      },
    ],
    wrong: [
      'printf arrête de marcher',
      'Le programme devient plus lent',
      'Le compilateur donne un warning',
      'Ça consomme plus de mémoire',
    ],
    why: 'Un message après « died » est une erreur ; le même mutex évite aussi les lignes mélangées.',
  },
}
