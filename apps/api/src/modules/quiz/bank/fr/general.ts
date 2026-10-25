/** Banco de Not-games en francés: lo general (`../general.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GENERAL_FR: Readonly<Record<string, ConceptText>> = {
  'gen-binary-8': {
    forms: [
      {
        ask: [
          'Combien vaut le binaire 1000 en décimal ?',
          'Le nombre binaire 1000, converti en décimal, donne…',
          'Convertis 0b1000 en base 10.',
        ],
        right: ['8'],
        wrong: ['16', '4', '10', '2', '7'],
      },
      {
        ask: ["Comment s'écrit 8 en binaire ?", 'Le 8 décimal, en base 2, donne…'],
        right: ['1000', '0b1000'],
        wrong: ['111', '0b111', '1001', '100', '0b10000'],
      },
    ],
    wrong: ['16', '4', '10', '2', '7'],
    why: "Chaque position vaut le double de la précédente : 1000, c'est 1 × 2³ = 8.",
  },
  'gen-hex-ff': {
    forms: [
      {
        ask: [
          'Quelle est la valeur décimale de 0xFF ?',
          "L'hexadécimal FF, en décimal, donne…",
          'Si un octet vaut 0xFF, combien vaut-il non signé, en base 10 ?',
        ],
        right: ['255'],
      },
      {
        ask: [
          'Quelle est la plus grande valeur qui tient dans un octet non signé ?',
          "Un unsigned char monte, au maximum, jusqu'à…",
        ],
        right: ['255'],
      },
    ],
    wrong: ['256', '15', '128', '510', '100', '127', '1515'],
    why: "F vaut 15 : 15 × 16 + 15 = 255, la plus grande valeur d'un octet non signé (8 bits à 1).",
  },
  'gen-byte-bits': {
    forms: [
      {
        ask: ['Combien de bits contient un octet ?', "Un octet, c'est combien de bits ?"],
        right: ['8'],
        wrong: ['4', '16', '10', '32', '64'],
      },
      {
        ask: [
          'Combien de valeurs différentes tiennent dans un octet ?',
          'Combien de combinaisons différentes donnent 8 bits ?',
        ],
        right: ['256'],
        wrong: ['255', '128', '512', '64'],
      },
    ],
    wrong: ['4', '16', '10', '32', '64'],
    why: 'Un octet fait 8 bits, et 8 bits donnent 2⁸ = 256 combinaisons.',
  },
  'gen-shift-left': {
    forms: [
      {
        ask: [
          'Que fait `x << 1` à un petit entier positif ?',
          "Décaler un entier d'un bit vers la gauche revient à…",
        ],
        right: ['Le multiplier par 2', 'Le doubler'],
        wrong: ['Le diviser par 2', 'Lui ajouter 1', 'Le mettre au carré', 'Changer son signe'],
      },
      {
        ask: [
          'Que fait `x >> 1` à un entier positif ?',
          "Décaler un entier positif d'un bit vers la droite revient à…",
        ],
        right: [
          'Le diviser par 2 (en arrondissant vers le bas)',
          'Le couper en deux, sans décimales',
        ],
        wrong: [
          'Le multiplier par 2',
          'Lui retirer 1',
          'Inverser tous ses bits',
          'Changer son signe',
        ],
      },
    ],
    wrong: ['Lui ajouter 1', 'Le mettre au carré', 'Changer son signe', 'Lui retirer 1'],
    why: "Chaque bit monte (ou descend) d'une position, et chaque position vaut le double de la précédente.",
  },
  'gen-and-mask': {
    forms: [
      {
        ask: ['Combien vaut `13 & 6` ?', 'Le ET bit à bit de 13 et 6 donne…'],
        right: ['4'],
        wrong: ['19', '15', '2', '7', '1'],
      },
      {
        ask: ['Combien vaut `13 | 6` ?', 'Le OU bit à bit de 13 et 6 donne…'],
        right: ['15'],
        wrong: ['4', '19', '11', '7', '78'],
      },
    ],
    wrong: ['19', '11', '2', '78', '7', '1'],
    why: "13 s'écrit 1101 et 6, 0110 : le ET ne garde que le bit présent dans les deux (0100 = 4) ; le OU les garde tous (1111 = 15).",
  },
  'gen-complexity-binary-search': {
    forms: [
      {
        ask: [
          'Quelle est la complexité de la recherche dichotomique dans un tableau trié ?',
          'Chercher dans un tableau trié en le coupant en deux à chaque fois coûte…',
        ],
        right: ['O(log n)'],
        wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
      },
      {
        ask: [
          'Quelle condition doit remplir un tableau pour utiliser la recherche dichotomique ?',
          'Avant de chercher en coupant en deux, le tableau doit…',
        ],
        right: ['Être trié'],
        wrong: [
          'Avoir une taille qui est une puissance de 2',
          'Ne pas avoir de doublons',
          'Être sur le tas',
        ],
      },
    ],
    wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
    why: "Chaque étape élimine la moitié (d'où le besoin d'ordre) : avec n éléments, environ log₂ n étapes suffisent.",
  },
  'gen-complexity-nested': {
    forms: [
      {
        ask: [
          'Quelle est la complexité de ce fragment ?',
          'En notation grand O, cette double boucle coûte…',
          'Comment le travail de ce code augmente-t-il avec n ?',
        ],
        right: ['O(n²)'],
      },
    ],
    wrong: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n³)', 'O(1)', 'O(2ⁿ)'],
    why: "Le corps s'exécute n + (n-1) + … + 1 = n(n+1)/2 fois : il croît comme n².",
  },
  'gen-sort-complexity': {
    forms: [
      {
        ask: [
          'Au minimum, combien coûte un tri par comparaisons dans le cas général ?',
          'Dans le pire des cas, un algorithme qui trie par comparaisons ne peut pas descendre sous…',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
      },
      {
        ask: [
          'Quelle est la complexité du tri à bulles dans le pire des cas ?',
          'Le bubble sort, dans le pire des cas, coûte…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Avec des comparaisons, il y a n! ordres possibles et chaque comparaison donne un bit : il en faut environ n log n. Le tri à bulles compare tout avec tout.',
  },
  'gen-stack-lifo': {
    forms: [
      {
        ask: [
          "Dans quel ordre les éléments sortent-ils d'une pile ?",
          "Quelle politique d'accès suit une pile ?",
        ],
        right: ['LIFO : dernier entré, premier sorti'],
        wrong: [
          'FIFO : premier entré, premier sorti',
          'Par priorité : le plus grand sort',
          "Au hasard : n'importe lequel sort",
        ],
      },
      {
        ask: [
          'Dans une pile, quel élément sort en premier ?',
          "Lequel retire-t-on d'abord d'une pile ?",
        ],
        right: ['Le dernier ajouté'],
        wrong: ['Le premier ajouté', 'Le plus petit', 'Celui du milieu'],
      },
      {
        ask: ['Tu empiles 1, 2 et 3, dans cet ordre. Lequel dépiles-tu en premier ?'],
        right: ['Le 3'],
        wrong: ['Le 1', 'Le 2', "N'importe lequel des trois"],
      },
    ],
    wrong: ['Le plus petit', 'Le plus grand', 'Un au hasard'],
    why: "Une pile, c'est comme une pile d'assiettes : on prend celle du dessus, la dernière posée.",
  },
  'gen-queue-fifo': {
    forms: [
      {
        ask: [
          "Dans quel ordre les éléments sortent-ils d'une file ?",
          "Quelle politique d'accès suit une file ?",
        ],
        right: ['FIFO : premier entré, premier sorti'],
        wrong: [
          'LIFO : dernier entré, premier sorti',
          'Par priorité : le plus grand sort',
          "Au hasard : n'importe lequel sort",
        ],
      },
      {
        ask: [
          'Dans une file, quel élément est servi en premier ?',
          "Lequel retire-t-on d'abord d'une file ?",
        ],
        right: ['Celui qui attend depuis le plus longtemps'],
        wrong: ['Le dernier ajouté', 'Le plus petit', 'Celui du milieu'],
      },
      {
        ask: ['Tu ajoutes 1, 2 et 3 à une file, dans cet ordre. Lequel sort en premier ?'],
        right: ['Le 1'],
        wrong: ['Le 3', 'Le 2', "N'importe lequel des trois"],
      },
    ],
    wrong: ['Le plus petit', 'Le plus grand', 'Un au hasard'],
    why: "Comme la file d'attente au supermarché : on sert dans l'ordre d'arrivée.",
  },
  'gen-list-vs-array': {
    forms: [
      {
        ask: [
          "Combien coûte l'accès à l'élément i d'une liste chaînée ?",
          "Atteindre la position i d'une liste chaînée coûte…",
        ],
        right: ['O(i)'],
        wrong: ['O(1)', 'O(log i)', 'O(i²)'],
      },
      {
        ask: [
          "Combien coûte l'accès à l'élément i d'un tableau ?",
          'Lire `a[i]` dans un tableau coûte…',
        ],
        right: ['O(1)'],
        wrong: ['O(i)', 'O(log i)', 'O(i²)'],
      },
    ],
    wrong: ['O(log i)', 'O(i²)', 'O(n)'],
    why: 'Un tableau est contigu en mémoire (adresse = début + i × taille) ; une liste se parcourt nœud par nœud depuis le début.',
  },
  'gen-recursion-base': {
    forms: [
      {
        ask: [
          'Que manque-t-il à une fonction récursive qui ne se termine jamais ?',
          'Pour se terminer, une fonction récursive doit avoir…',
        ],
        right: ['Un cas de base', "Une condition d'arrêt qui ne la rappelle pas"],
        wrong: [
          'Une boucle while',
          'Une variable globale',
          'Une valeur de retour',
          'Plus de mémoire',
        ],
      },
      {
        ask: [
          "Que se passe-t-il en général en C avec une récursion qui ne s'arrête pas ?",
          "Qu'arrive-t-il à une fonction qui s'appelle elle-même sans fin ?",
        ],
        right: ['La pile déborde (stack overflow)'],
        wrong: [
          'Une erreur de compilation',
          'Une fuite de mémoire sur le tas',
          'Elle renvoie 0',
          'Elle tourne en boucle sans consommer de mémoire',
        ],
      },
    ],
    wrong: ['Une boucle while', 'Une variable globale', 'Une valeur de retour'],
    why: "Chaque appel prend de la place sur la pile ; sans cas qui arrête les appels, la pile s'épuise.",
  },
  'gen-recursion-trace': {
    forms: [
      { ask: ['Que renvoie f(4) ?', 'Quelle valeur donne f(4) ?'], right: ['24'] },
      {
        ask: ['Que renvoie f(5) ?', 'Quelle valeur donne f(5) ?'],
        right: ['120'],
        wrong: ['24'],
      },
      {
        ask: ['Que calcule cette fonction ?', 'Que fait f avec un n positif ?'],
        right: ['La factorielle de n'],
        wrong: ['La somme de 1 à n', 'n au carré', 'Le n-ième nombre de Fibonacci'],
      },
    ],
    wrong: ['10', '4', '16', '1', '60'],
    why: "f(n) = n × f(n-1) et f(1) = 1 : c'est la factorielle (4! = 24, 5! = 120).",
  },
  'gen-git-push': {
    forms: [
      {
        ask: ['Que fait `git push` ?', 'À quoi sert `git push` ?'],
        right: [
          'Il envoie tes commits au dépôt distant',
          'Il pousse tes commits locaux vers le dépôt distant',
        ],
        wrong: [
          'Il enregistre les changements dans un commit local',
          'Il télécharge les changements du dépôt distant',
          "Il ajoute des fichiers à l'index",
          'Il crée une nouvelle branche',
        ],
      },
      {
        ask: [
          'Après `git commit`, quelle commande envoie tes changements au serveur ?',
          'Pour que ton commit arrive sur le dépôt distant, tu utilises…',
        ],
        right: ['git push'],
        wrong: ['git commit', 'git pull', 'git add', 'git fetch'],
      },
    ],
    wrong: [
      'Il enregistre les changements dans un commit local',
      'Il télécharge les changements du dépôt distant',
      'Il crée une nouvelle branche',
    ],
    why: "`commit` enregistre dans ta copie du dépôt ; `push` l'envoie au dépôt distant.",
  },
  'gen-git-add': {
    forms: [
      {
        ask: ['Que fait `git add fichier` ?', 'À quoi sert `git add` sur un fichier modifié ?'],
        right: [
          'Il le prépare pour le prochain commit',
          "Il le met dans l'index (staging) pour le prochain commit",
        ],
        wrong: [
          "Il l'envoie sur le serveur",
          'Il le supprime du dépôt',
          "Il demande à git de l'ignorer pour toujours",
          'Il le copie dans une autre branche',
        ],
      },
      {
        ask: [
          'Avant de commiter un fichier modifié, quelle commande le prépare ?',
          "Quelle commande met un changement dans l'index ?",
        ],
        right: ['git add'],
        wrong: ['git push', 'git commit', 'git stash', 'git log'],
      },
    ],
    wrong: [
      "Il l'envoie sur le serveur",
      'Il le supprime du dépôt',
      'Il le copie dans une autre branche',
    ],
    why: "L'index, c'est la liste de ce qui entrera dans le prochain commit.",
  },
  'gen-git-conflict': {
    forms: [
      {
        ask: [
          "Quand y a-t-il un conflit lors d'un merge ?",
          "Qu'est-ce qui provoque un conflit dans git ?",
        ],
        right: [
          'Les deux branches ont modifié les mêmes lignes de façon différente',
          "Deux changements touchent la même zone d'un fichier et git ne sait pas lequel garder",
        ],
        wrong: [
          'Un fichier est trop gros',
          'La branche distante a été supprimée',
          'Deux commits ont le même message',
          "N'importe quel merge, toujours",
        ],
      },
      {
        ask: [
          'Avec quels marqueurs git sépare-t-il les deux versions dans un conflit ?',
          'Dans un fichier en conflit, les deux versions apparaissent entre…',
        ],
        right: ['<<<<<<<, ======= et >>>>>>>'],
        wrong: ['/* conflict */ et /* end */', '### MERGE ###', '[[[ et ]]]'],
      },
    ],
    wrong: [
      'Un fichier est trop gros',
      'La branche distante a été supprimée',
      'Deux commits ont le même message',
    ],
    why: 'Git ne fusionne que ce qui ne se chevauche pas ; si deux branches modifient la même chose, il laisse les deux versions marquées pour que tu choisisses.',
  },
  'gen-shell-pipe': {
    forms: [
      {
        ask: ['Dans le shell, que fait `ls | wc -l` ?', 'Quel résultat donne `ls | wc -l` ?'],
        right: [
          'Il compte combien de lignes affiche ls',
          'Il passe la sortie de ls à wc, qui en compte les lignes',
        ],
        wrong: [
          'Il lance ls et wc en même temps, sans les relier',
          'Il enregistre la sortie de ls dans un fichier appelé wc',
          'Il ne lance wc que si ls échoue',
          'Il compte les fichiers cachés',
        ],
      },
      {
        ask: [
          'Dans `cmd1 | cmd2`, que devient la sortie de cmd1 ?',
          'Que fait le symbole `|` entre deux commandes ?',
        ],
        right: [
          "Elle devient l'entrée de la deuxième commande",
          "Il relie la sortie de la première à l'entrée de la deuxième",
        ],
        wrong: [
          'Elle est jetée',
          "C'est un OU logique entre les deux commandes",
          'Il ne lance la deuxième que si la première échoue',
          'Elle est écrite dans un fichier temporaire appelé pipe',
        ],
      },
    ],
    wrong: [
      'Elle est jetée',
      'Il ne lance la deuxième que si la première échoue',
      "C'est un OU logique",
    ],
    why: "Un pipe relie la sortie standard d'une commande à l'entrée standard de la suivante.",
  },
  'gen-shell-redirect': {
    forms: [
      {
        ask: [
          'Quelle est la différence entre `>` et `>>` ?',
          'En quoi `echo salut > f` et `echo salut >> f` diffèrent-ils ?',
        ],
        right: [
          '`>` écrase et `>>` ajoute à la fin',
          '`>>` ajoute sans effacer ce qui y était ; `>` vide le fichier',
        ],
        wrong: [
          '`>` ajoute et `>>` écrase',
          "`>>` redirige l'entrée",
          '`>>` redirige les erreurs',
          "`>` ne marche qu'avec des fichiers nouveaux",
        ],
      },
      {
        ask: [
          "Quelle redirection ajoute à la fin d'un fichier sans l'effacer ?",
          'Pour écrire à la suite de ce qui est déjà dans un fichier, on utilise…',
        ],
        right: ['>>'],
        wrong: ['>', '<<', '<', '|'],
      },
    ],
    wrong: ['`>` ajoute et `>>` écrase', "`>>` redirige l'entrée", '`>>` redirige les erreurs'],
    why: "`>` vide le fichier avant d'écrire ; `>>` écrit à la suite de ce qui y est.",
  },
  'gen-shell-exit-status': {
    forms: [
      {
        ask: ['Que contient `$?` dans bash ?', 'Que stocke la variable spéciale `$?` ?'],
        right: [
          'Le code de sortie de la dernière commande',
          "Comment s'est terminée la dernière commande (0 si tout s'est bien passé)",
        ],
        wrong: [
          'Le PID du shell',
          "Le nombre d'arguments",
          'Le dernier argument',
          'Le nom du script',
        ],
      },
      {
        ask: [
          "Quel code de sortie donne une commande qui s'est bien passée ?",
          'Par convention, une commande qui se termine sans erreur sort avec…',
        ],
        right: ['0'],
        wrong: ['1', '-1', '255', '42'],
      },
    ],
    wrong: ['Le PID du shell', "Le nombre d'arguments", 'Le dernier argument'],
    why: '`$?` est le code de sortie : 0 veut dire succès, et tout autre nombre, erreur.',
  },
  'gen-chmod': {
    forms: [
      {
        ask: [
          'Quels droits donne `chmod 755 fichier` ?',
          'À quoi ressemblent les droits 755 dans `ls -l` ?',
        ],
        right: ['rwxr-xr-x'],
        wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-', 'rwxr--r--'],
      },
      {
        ask: [
          'Quel nombre de chmod donne `rw-r--r--` ?',
          "Comment s'écrivent en octal les droits rw-r--r-- ?",
        ],
        right: ['644'],
        wrong: ['755', '666', '444', '777'],
      },
    ],
    wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-'],
    why: 'Chaque chiffre correspond au propriétaire, au groupe et aux autres : lecture vaut 4, écriture 2 et exécution 1 (7 = 4 + 2 + 1, 5 = 4 + 1).',
  },
  'gen-ascii-a': {
    forms: [
      {
        ask: ['Quel est le code ASCII de la lettre `A` ?', "En ASCII, 'A' vaut…"],
        right: ['65'],
        wrong: ['97', '64', '48', '90'],
      },
      {
        ask: ['Quel est le code ASCII de la minuscule `a` ?', "En ASCII, 'a' vaut…"],
        right: ['97'],
        wrong: ['65', '122', '96', '48'],
      },
      {
        ask: [
          'Quel écart y a-t-il en ASCII entre une minuscule et sa majuscule ?',
          "Quelle est la distance entre 'a' et 'A' dans la table ASCII ?",
        ],
        right: ['32'],
        wrong: ['26', '1', '64', '16'],
      },
    ],
    wrong: ['64', '48', '41', '90', '122'],
    why: 'Les majuscules commencent à 65 (A) et les minuscules à 97 (a) : elles diffèrent de 32, un seul bit.',
  },
  'gen-hash-collision': {
    forms: [
      {
        ask: [
          "Dans une table de hachage, qu'est-ce qu'une collision ?",
          'Quand y a-t-il une collision dans une table de hachage ?',
        ],
        right: [
          'Quand deux clés différentes donnent le même hash',
          'Quand deux clés tombent dans la même case',
        ],
        wrong: [
          "Quand on cherche une clé qui n'y est pas",
          'Quand la table est complètement pleine',
          'Quand une clé est supprimée deux fois',
          'Quand le hash ne tient pas dans un int',
        ],
      },
      {
        ask: [
          "Comment appelle-t-on deux clés différentes qui tombent dans la même case d'une table de hachage ?",
          'Si deux clés différentes donnent le même hash, il y a…',
        ],
        right: ['Une collision'],
        wrong: ['Un rehash', 'Un débordement', 'Un pointeur pendant', 'Un doublon'],
      },
      {
        ask: [
          'En moyenne, combien coûte une recherche dans une table de hachage bien dimensionnée ?',
          'Une recherche dans une table de hachage coûte, en moyenne…',
        ],
        right: ['O(1)'],
        wrong: ['O(n)', 'O(log n)', 'O(n log n)'],
      },
    ],
    wrong: ['Un rehash', 'Un débordement', 'Un doublon'],
    why: 'Le hash donne directement la case ; les collisions (inévitables) se règlent par chaînage ou en cherchant une autre case libre.',
  },
}
