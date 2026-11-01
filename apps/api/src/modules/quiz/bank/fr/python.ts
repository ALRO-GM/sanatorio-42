/** Banco de Not-games en francés: Python y modelos de lenguaje (`../python.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PYTHON_FR: Readonly<Record<string, ConceptText>> = {
  'py-mutable-default': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Qu'est-ce qui s'affiche à l'écran ?"],
        right: ['[1, 2]'],
        wrong: ['[2]', '[1]', '[]', '[2, 1]'],
      },
      {
        ask: [
          'Comment corriger le code pour que chaque appel commence avec une liste vide ?',
          'Quelle valeur par défaut items devrait-il avoir ?',
        ],
        right: ['None, puis créer la liste dans la fonction si items est None'],
        wrong: [
          "list, la classe, pour qu'elle en crée une à chaque appel",
          'list() au lieu de [], qui crée une nouvelle liste',
          'Une liste globale vidée à chaque appel',
        ],
      },
    ],
    wrong: ['[2]', '[1]', '[]'],
    why: 'La valeur par défaut est créée une seule fois, quand la fonction est définie : tous les appels partagent la même liste.',
  },
  'py-is-eq': {
    forms: [
      {
        ask: ['Quelle est la différence entre `==` et `is` ?'],
        right: ["== compare les valeurs ; is regarde si c'est le même objet"],
        wrong: [
          "Aucune : c'est exactement le même opérateur",
          'is est plus rapide, sinon pareil',
          'is compare les types ; ==, les valeurs',
          "== compare l'adresse en mémoire ; is, la valeur",
        ],
      },
      {
        ask: ['Que vérifie `a is b` ?'],
        right: ['Que a et b sont le même objet en mémoire'],
        wrong: [
          'Que a et b ont la même valeur, même copiés',
          'Que a et b sont du même type ou de la même classe',
          'Que b est contenu dans a, comme avec in',
        ],
      },
    ],
    wrong: [
      "Aucune : c'est pareil",
      'is est plus rapide, sinon pareil',
      'is compare les types ; ==, les valeurs',
    ],
    why: 'Deux listes égales sont == mais pas is. Pour None, on utilise `is None`.',
  },
  'py-copy': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", 'Que contient a à la fin ?'],
        right: ['[1, 2, 3, 4]'],
        wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
      },
      {
        ask: [
          'Comment faire de b une copie indépendante de a ?',
          'Que faut-il écrire pour que modifier b ne modifie pas a ?',
        ],
        right: ['b = a.copy()', 'b = list(a)', 'b = a[:]'],
        wrong: ['b = a', 'b == a', 'b = a.clone()', 'b = a.self'],
      },
    ],
    wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
    why: 'Affecter ne copie pas : b et a sont la même liste. copy(), list() ou [:] en font une copie.',
  },
  'py-slicing': {
    forms: [
      {
        ask: ['Que donne `"program"[1:4]` ?', 'Quel est le résultat de `"program"[1:4]` ?'],
        right: ['"rog"'],
        wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
      },
      {
        ask: ['Que donne `"program"[::-1]` ?', 'Quel est le résultat de `"program"[::-1]` ?'],
        right: ['"margorp"'],
        wrong: ['"program"', '"m"', '"margor"', '"p"'],
      },
    ],
    wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
    why: "De l'indice de début (inclus) à celui de fin (exclu) ; un pas de -1 la parcourt à l'envers.",
  },
  'py-dict-get': {
    forms: [
      {
        ask: [
          'Que se passe-t-il avec `d["x"]` si "x" n\'est pas dans le dictionnaire ?',
          "Que se passe-t-il quand tu utilises les crochets avec une clé qui n'existe pas ?",
        ],
        right: ['Ça lève KeyError'],
        wrong: ['Ça renvoie None', 'Ça renvoie 0', 'Ça crée la clé', 'Ça renvoie False'],
      },
      {
        ask: [
          'Que renvoie `d.get("x")` si "x" n\'y est pas ?',
          "Que donne get avec une clé qui n'existe pas ?",
        ],
        right: ['None'],
        wrong: ['KeyError', '0', 'False', '""'],
      },
    ],
    wrong: ['Ça renvoie 0', 'Ça crée la clé', 'Ça renvoie False'],
    why: 'Les crochets exigent que la clé existe ; get renvoie None (ou la valeur par défaut que tu lui donnes).',
  },
  'py-comprehension': {
    forms: [
      {
        ask: [
          'Que donne `[x * x for x in range(4)]` ?',
          'Quelle liste sort de `[x * x for x in range(4)]` ?',
        ],
        right: ['[0, 1, 4, 9]'],
        wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
      },
      {
        ask: [
          'Que donne `[x for x in range(10) if x % 3 == 0]` ?',
          'Quelle liste sort de `[x for x in range(10) if x % 3 == 0]` ?',
        ],
        right: ['[0, 3, 6, 9]'],
        wrong: ['[3, 6, 9]', '[0, 3, 6]', '[1, 4, 7]'],
      },
    ],
    wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
    why: "range(n) va de 0 à n - 1, et le if filtre avant d'ajouter.",
  },
  'py-generator': {
    forms: [
      {
        ask: [
          'Que fait `yield` dans une fonction ?',
          "Qu'est-ce qui change dans une fonction qui utilise yield ?",
        ],
        right: [
          'Elle devient un générateur qui donne les valeurs une à une',
          'Elle renvoie un générateur paresseux',
        ],
      },
    ],
    wrong: [
      'Elle se termine à cet endroit, comme avec return',
      "Elle met tout le programme en pause jusqu'au prochain appel",
      'Elle lance la fonction dans un thread à part',
      'Elle renvoie une liste avec toutes les valeurs',
    ],
    why: "Un générateur s'arrête à chaque yield et reprend de là au tour suivant : il ne garde pas tout en mémoire.",
  },
  'py-exceptions': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Quelles lettres sortent, dans l'ordre ?"],
        right: ['A et C'],
      },
    ],
    wrong: ['B et C', 'A, B et C', 'Seulement A', 'Seulement C'],
    why: "int(\"42a\") lève ValueError : on entre dans except ; else ne tourne que s'il n'y a pas eu d'erreur ; finally tourne toujours.",
  },
  'py-classes': {
    forms: [
      {
        ask: [
          "Qu'est-ce que `self` dans une méthode ?",
          'Que reçoit une méthode normale comme premier paramètre ?',
        ],
        right: ["L'objet sur lequel on appelle la méthode", "L'instance qui reçoit l'appel"],
        wrong: [
          'La classe à laquelle appartient la méthode',
          'Le module où la classe est définie',
          'La classe parente, pour appeler super',
          'Un mot réservé sans signification',
        ],
      },
      {
        ask: [
          "Quelle méthode s'exécute à la création d'un objet ?",
          "Laquelle joue le rôle de « constructeur » d'une classe en Python ?",
        ],
        right: ['__init__'],
        wrong: ['__main__', '__call__', '__str__'],
      },
    ],
    wrong: ['La classe', 'Le module', 'La classe parente'],
    why: "obj.methode() équivaut à Classe.methode(obj) : self, c'est cet obj. __init__ le prépare à sa création.",
  },
  'py-abc': {
    forms: [
      {
        ask: [
          "Que se passe-t-il si tu essaies de créer un objet d'une classe avec un `@abstractmethod` non implémenté ?",
          'Que se passe-t-il quand tu instancies une classe abstraite (ABC) incomplète ?',
        ],
        right: ["Ça lève TypeError : impossible de l'instancier"],
      },
    ],
    wrong: [
      'Il est créé sans problème, avec une méthode vide',
      "La méthode abstraite renvoie None quand on l'appelle",
      'La méthode du parent est appelée à la place',
      'Ça affiche un warning, mais ça continue',
    ],
    why: "Avec ABC, Python t'empêche de créer des objets tant qu'une méthode abstraite reste non implémentée.",
  },
  'py-typing': {
    forms: [
      {
        ask: [
          "Que fait Python des annotations de type à l'exécution (`def f(x: int) -> str`) ?",
          'Que se passe-t-il si tu passes un str à `def f(x: int)` ?',
        ],
        right: [
          "Rien : il ne les vérifie pas à l'exécution",
          'Ça marche pareil : elles ne sont pas vérifiées',
        ],
      },
    ],
    wrong: [
      "Ça lève TypeError à l'appel de f",
      "Ça convertit x en int avant d'entrer",
      'Ça ne compile pas : le type ne colle pas',
      'Ça affiche un warning et ça continue',
    ],
    why: "Les annotations sont de l'information ; c'est mypy (ou un outil similaire) qui les vérifie, pas l'interpréteur.",
  },
  'py-scope': {
    forms: [
      {
        ask: ['Que se passe-t-il quand on appelle inc() ?', 'Ce code fonctionne-t-il ?'],
        right: [
          'Il plante avec UnboundLocalError',
          "Il plante : count est locale et n'a pas de valeur",
        ],
      },
    ],
    wrong: [
      'count passe à 1 sans problème',
      'Il ne se passe rien : count reste à 0',
      'Une autre count locale qui vaut 1 est créée',
      'Il plante avec SyntaxError à la définition de inc',
    ],
    why: "Affecter un nom dans une fonction le rend local ; le lire avant de l'affecter plante. Il faut `global count`.",
  },
  'py-venv': {
    forms: [
      {
        ask: ['À quoi sert un environnement virtuel (venv) ?', 'Que permet un venv ?'],
        right: ['Garder les paquets de chaque projet à part', "Isoler les dépendances d'un projet"],
        wrong: [
          "Faire que Python s'exécute plus vite",
          'Exécuter Python sur une autre machine',
          'Compiler le projet en code C',
          'Cacher le code source du projet',
        ],
      },
      {
        ask: [
          'Quel fichier liste les paquets dont un projet a besoin, avec pip ?',
          'Quel fichier passes-tu à `pip install -r` ?',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'packages.txt', 'Makefile'],
      },
    ],
    wrong: ['Rendre Python plus rapide', 'Exécuter Python sur une autre machine', 'Compiler en C'],
    why: 'Chaque venv a ses propres paquets ; requirements.txt dit lesquels installer.',
  },
  'py-main-guard': {
    forms: [
      {
        ask: [
          'À quoi sert `if __name__ == "__main__":` ?',
          'Quand le code dans `if __name__ == "__main__":` s\'exécute-t-il ?',
        ],
        right: [
          "Seulement quand on exécute le fichier, pas quand on l'importe",
          'Quand le fichier est exécuté directement',
        ],
      },
    ],
    wrong: [
      "Toujours : c'est obligatoire dans chaque fichier",
      "Seulement quand on l'importe depuis un autre module",
      "Seulement si le fichier s'appelle main.py",
      'Seulement quand on déclare une fonction main',
    ],
    why: 'À l\'import, __name__ est le nom du module ; quand on exécute le fichier, "__main__".',
  },
  'py-floor-div': {
    forms: [
      {
        ask: ['Que donne `7 // 2` en Python 3 ?', 'Quel est le résultat de `7 // 2` ?'],
        right: ['3'],
        wrong: ['3.5', '4', '2'],
      },
      {
        ask: ['Que donne `-7 // 2` en Python 3 ?', 'Quel est le résultat de `-7 // 2` ?'],
        right: ['-4'],
        wrong: ['-3', '-3.5', '3'],
      },
      {
        ask: ['Que donne `7 / 2` en Python 3 ?', 'Quel est le résultat de `7 / 2` ?'],
        right: ['3.5'],
        wrong: ['3', '4', '3.0'],
      },
    ],
    wrong: ['1', '0', '7'],
    why: "En Python 3, / donne toujours un float et // arrondit vers le bas (vers moins l'infini, pas vers zéro) : -7 // 2 vaut -4, pas -3 comme en C.",
  },
  'py-args-kwargs': {
    forms: [
      {
        ask: [
          'Dans `def f(*args, **kwargs)`, que reçoit kwargs ?',
          'Quand tu appelles `f(1, x=2)`, kwargs dans f est…',
        ],
        right: ['Un dictionnaire avec les arguments nommés', 'Un dict qui associe nom et valeur'],
        wrong: [
          'Un tuple avec les arguments positionnels',
          'Une liste avec tous les arguments ensemble',
          'Un pointeur vers la liste des arguments',
        ],
      },
      {
        ask: [
          'Dans `def f(*args, **kwargs)`, que reçoit args ?',
          'Quand tu appelles `f(1, 2, x=3)`, args dans f est…',
        ],
        right: [
          'Un tuple avec les arguments positionnels',
          "Un tuple avec ceux qui n'ont pas de nom",
        ],
        wrong: [
          'Un dictionnaire avec les arguments nommés',
          "Une liste qu'on peut modifier dedans",
          'Un pointeur vers le premier argument, comme en C',
        ],
      },
    ],
    wrong: ['Une chaîne avec les arguments', "Le nombre d'arguments", "Un itérateur qui s'épuise"],
    why: '*args rassemble dans un tuple les arguments en trop passés sans nom, et **kwargs rassemble dans un dictionnaire ceux qui ont un nom.',
  },
  'py-with': {
    forms: [
      {
        ask: [
          'Que garantit `with open("donnees.txt") as f:` ?',
          'Ouvrir un fichier avec with sert à…',
        ],
        right: [
          'Que le fichier est fermé à la sortie du bloc',
          "Fermer le fichier tout seul, quoi qu'il arrive",
        ],
        wrong: [
          'Que le fichier est lu en entier en mémoire',
          "Que personne d'autre ne peut ouvrir le fichier",
          "Que le fichier est créé s'il n'existe pas",
        ],
      },
      {
        ask: [
          'Si une exception est levée dans un `with open(...)`, que devient le fichier ?',
          'Avec une exception au milieu du bloc with, le fichier…',
        ],
        right: ['Est fermé quand même à la sortie', "Est fermé avant que l'erreur remonte"],
        wrong: [
          "Reste ouvert jusqu'à la fin",
          'Est supprimé pour ne pas le laisser à moitié écrit',
          'Est sauvegardé dans une copie de secours',
        ],
      },
    ],
    wrong: [
      "Que le fichier s'ouvre plus vite",
      "Qu'on écrit en binaire",
      "Qu'il est verrouillé pour les autres processus",
    ],
    why: "with appelle __exit__ à la sortie du bloc, même s'il y a une exception : le fichier est toujours fermé sans écrire close().",
  },
  'py-json': {
    forms: [
      {
        ask: [
          'Lequel de ces textes est du JSON valide ?',
          'Lequel de ces objets JSON est bien écrit ?',
        ],
        right: ['{"name": "pepe", "age": 3}'],
        wrong: [
          "{'name': 'pepe', 'age': 3}",
          '{name: "pepe", age: 3}',
          '{"name": "pepe", "age": 3,}',
          '{"name": pepe}',
        ],
      },
      {
        ask: [
          'Quelle fonction transforme un texte JSON en dictionnaire Python ?',
          "Qu'utilise-t-on pour lire du JSON depuis une chaîne de caractères ?",
        ],
        right: ['json.loads'],
        wrong: ['json.dumps', 'json.parse', 'eval'],
      },
    ],
    wrong: ["{'name': 'pepe', 'age': 3}", '{name: "pepe", age: 3}', '{"name": "pepe", "age": 3,}'],
    why: "JSON exige des guillemets doubles autour des clés et des chaînes, et n'accepte pas de virgule finale. loads lit ; dumps écrit.",
  },
  'llm-tokens': {
    forms: [
      {
        ask: [
          'Que génère un modèle de langage à chaque étape ?',
          'Par quelles unités un LLM écrit-il sa réponse ?',
        ],
        right: ['Le token suivant, selon des probabilités', 'Un seul token à la fois'],
        wrong: [
          "Toute la réponse d'un coup, déjà réfléchie",
          'Une phrase complète à la fois',
          'Un caractère à la fois, toujours un seul',
          'Un mot entier du dictionnaire',
        ],
      },
      {
        ask: [
          'En quoi consiste le fait de forcer un modèle à toujours écrire du JSON valide ?',
          'En quoi consiste le décodage contraint ?',
        ],
        right: [
          'À retirer à chaque étape les tokens qui casseraient le format',
          'À ne le laisser choisir que des tokens qui gardent le JSON valide',
        ],
        wrong: [
          'À le lui demander poliment dans le prompt système',
          "À réessayer jusqu'à obtenir un JSON qui passe",
          'À utiliser un modèle plus gros, avec plus de contexte',
        ],
      },
    ],
    wrong: ["Toute la réponse d'un coup", 'Une phrase à la fois', 'Un caractère, toujours'],
    why: 'La génération se fait token par token ; si à chaque étape seuls les tokens valides sont permis, le format est garanti.',
  },
  'llm-function-calling': {
    forms: [
      {
        ask: [
          "Qu'est-ce que le « function calling » dans un modèle de langage ?",
          'Que fait un modèle quand il fait du function calling ?',
        ],
        right: [
          "Il choisit fonction et arguments ; ton programme l'exécute",
          'Il renvoie quelle fonction appeler et avec quels arguments',
        ],
      },
    ],
    wrong: [
      'Il exécute le code de la fonction sur ta machine',
      'Il est entraîné sur tes fonctions pour les apprendre',
      'Il compile tes fonctions et te renvoie le binaire',
      'Il appelle un autre modèle pour faire la tâche',
    ],
    why: "Le modèle ne fait que proposer l'appel (nom et arguments, en général en JSON) ; l'exécuter, c'est ton travail.",
  },
}
