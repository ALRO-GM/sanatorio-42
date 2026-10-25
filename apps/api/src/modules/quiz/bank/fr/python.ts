/** Banco de Not-games en francés: Python y modelos de lenguaje (`../python.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PYTHON_FR: Readonly<Record<string, ConceptText>> = {
  'py-mutable-default': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Qu'est-ce qui s'affiche à l'écran ?"],
        right: ['[1, 2]'],
        wrong: ['[2]', '[1]', '[]', '[2, 1]'],
      },
      {
        ask: [
          'Comment corriger le code pour que chaque appel commence avec une liste vide ?',
          'Quelle valeur par défaut items devrait-il avoir ?',
        ],
        right: ['None, puis créer la liste dans la fonction si items est None'],
        wrong: [
          "list (la classe elle-même, sans l'appeler)",
          'list() au lieu de []',
          'Une variable globale contenant la liste',
        ],
      },
    ],
    wrong: ['[2]', '[1]', '[]'],
    why: 'La valeur par défaut est créée une seule fois, quand la fonction est définie : tous les appels partagent la même liste.',
  },
  'py-is-eq': {
    forms: [
      {
        ask: ['Quelle est la différence entre `==` et `is` ?'],
        right: ["== compare les valeurs ; is regarde si c'est le même objet"],
        wrong: [
          "Aucune : c'est pareil",
          'is est plus rapide, sinon pareil',
          'is compare les types ; ==, les valeurs',
          "== compare l'adresse en mémoire ; is, la valeur",
        ],
      },
      {
        ask: ['Que vérifie `a is b` ?'],
        right: ['Que a et b sont le même objet en mémoire'],
        wrong: [
          'Que a et b ont la même valeur',
          'Que a et b sont du même type',
          'Que b est contenu dans a',
        ],
      },
    ],
    wrong: [
      "Aucune : c'est pareil",
      'is est plus rapide, sinon pareil',
      'is compare les types ; ==, les valeurs',
    ],
    why: 'Deux listes égales sont == mais pas is. Pour None, on utilise `is None`.',
  },
  'py-copy': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", 'Que contient a à la fin ?'],
        right: ['[1, 2, 3, 4]'],
        wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
      },
      {
        ask: [
          'Comment faire de b une copie indépendante de a ?',
          'Que faut-il écrire pour que modifier b ne modifie pas a ?',
        ],
        right: ['b = a.copy()', 'b = list(a)', 'b = a[:]'],
        wrong: ['b = a', 'b == a', 'b = a.self'],
      },
    ],
    wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
    why: 'Affecter ne copie pas : b et a sont la même liste. copy(), list() ou [:] en font une copie.',
  },
  'py-slicing': {
    forms: [
      {
        ask: ['Que donne `"program"[1:4]` ?', 'Quel est le résultat de `"program"[1:4]` ?'],
        right: ['"rog"'],
        wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
      },
      {
        ask: ['Que donne `"program"[::-1]` ?', 'Quel est le résultat de `"program"[::-1]` ?'],
        right: ['"margorp"'],
        wrong: ['"program"', '"m"', '"margor"', '"p"'],
      },
    ],
    wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
    why: "De l'indice de début (inclus) à celui de fin (exclu) ; un pas de -1 la parcourt à l'envers.",
  },
  'py-dict-get': {
    forms: [
      {
        ask: [
          'Que se passe-t-il avec `d["x"]` si "x" n\'est pas dans le dictionnaire ?',
          "Que se passe-t-il quand tu utilises les crochets avec une clé qui n'existe pas ?",
        ],
        right: ['Ça lève KeyError'],
        wrong: ['Ça renvoie None', 'Ça renvoie 0', 'Ça crée la clé', 'Ça renvoie False'],
      },
      {
        ask: [
          'Que renvoie `d.get("x")` si "x" n\'y est pas ?',
          "Que donne get avec une clé qui n'existe pas ?",
        ],
        right: ['None'],
        wrong: ['KeyError', '0', 'False', '""'],
      },
    ],
    wrong: ['Ça renvoie 0', 'Ça crée la clé', 'Ça renvoie False'],
    why: 'Les crochets exigent que la clé existe ; get renvoie None (ou la valeur par défaut que tu lui donnes).',
  },
  'py-comprehension': {
    forms: [
      {
        ask: [
          'Que donne `[x * x for x in range(4)]` ?',
          'Quelle liste sort de `[x * x for x in range(4)]` ?',
        ],
        right: ['[0, 1, 4, 9]'],
        wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
      },
      {
        ask: [
          'Que donne `[x for x in range(10) if x % 3 == 0]` ?',
          'Quelle liste sort de `[x for x in range(10) if x % 3 == 0]` ?',
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
          'Que fait `yield` dans une fonction ?',
          "Qu'est-ce qui change dans une fonction qui utilise yield ?",
        ],
        right: [
          'Elle devient un générateur : elle donne les valeurs une par une, à la demande',
          'Elle renvoie un générateur qui calcule au fur et à mesure',
        ],
      },
    ],
    wrong: [
      'Elle se termine, comme avec return',
      'Elle met tout le programme en pause',
      'Elle lance un thread',
      'Elle renvoie une liste avec tout',
    ],
    why: "Un générateur s'arrête à chaque yield et reprend de là au tour suivant : il ne garde pas tout en mémoire.",
  },
  'py-exceptions': {
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Quelles lettres sortent, dans l'ordre ?"],
        right: ['A et C'],
      },
    ],
    wrong: ['B et C', 'A, B et C', 'Seulement A', 'Seulement C'],
    why: "int(\"42a\") lève ValueError : on entre dans except ; else ne tourne que s'il n'y a pas eu d'erreur ; finally tourne toujours.",
  },
  'py-classes': {
    forms: [
      {
        ask: [
          "Qu'est-ce que `self` dans une méthode ?",
          'Que reçoit une méthode normale comme premier paramètre ?',
        ],
        right: ["L'objet sur lequel on appelle la méthode", "L'instance"],
        wrong: ['La classe', 'Le module', 'La classe parente', 'Un mot réservé sans signification'],
      },
      {
        ask: [
          "Quelle méthode s'exécute à la création d'un objet ?",
          "Laquelle joue le rôle de « constructeur » d'une classe en Python ?",
        ],
        right: ['__init__'],
        wrong: ['__main__', '__call__', '__str__'],
      },
    ],
    wrong: ['La classe', 'Le module', 'La classe parente'],
    why: "obj.methode() équivaut à Classe.methode(obj) : self, c'est cet obj. __init__ le prépare à sa création.",
  },
  'py-abc': {
    forms: [
      {
        ask: [
          "Que se passe-t-il si tu essaies de créer un objet d'une classe avec un `@abstractmethod` non implémenté ?",
          'Que se passe-t-il quand tu instancies une classe abstraite (ABC) incomplète ?',
        ],
        right: ["Ça lève TypeError : impossible de l'instancier"],
      },
    ],
    wrong: [
      'Il est créé sans problème',
      'La méthode renvoie None',
      'La méthode du parent est appelée',
      'Ça prévient, mais ça continue',
    ],
    why: "Avec ABC, Python t'empêche de créer des objets tant qu'une méthode abstraite reste non implémentée.",
  },
  'py-typing': {
    forms: [
      {
        ask: [
          "Que fait Python des annotations de type à l'exécution (`def f(x: int) -> str`) ?",
          'Que se passe-t-il si tu passes un str à `def f(x: int)` ?',
        ],
        right: [
          'Rien : il ne les vérifie pas ; ce sont des outils comme mypy qui les utilisent',
          "Ça marche pareil : les types ne sont pas vérifiés à l'exécution",
        ],
      },
    ],
    wrong: [
      'Ça lève TypeError',
      'Ça convertit x en int',
      'Ça ne compile pas',
      'Ça affiche toujours un warning',
    ],
    why: "Les annotations sont de l'information ; c'est mypy (ou un outil similaire) qui les vérifie, pas l'interpréteur.",
  },
  'py-scope': {
    forms: [
      {
        ask: ['Que se passe-t-il quand on appelle inc() ?', 'Ce code fonctionne-t-il ?'],
        right: [
          'Il plante avec UnboundLocalError : count est traité comme local',
          'Il plante : dans inc, count est une variable locale sans valeur',
        ],
      },
    ],
    wrong: [
      'count passe à 1',
      'Il ne se passe rien',
      'count reste à 0',
      'Une autre variable count qui vaut 1 est créée',
    ],
    why: "Affecter un nom dans une fonction le rend local ; le lire avant de l'affecter plante. Il faut `global count`.",
  },
  'py-venv': {
    forms: [
      {
        ask: ['À quoi sert un environnement virtuel (venv) ?', 'Que permet un venv ?'],
        right: [
          'Garder les paquets de chaque projet à part, sans les mélanger',
          "Isoler les dépendances d'un projet",
        ],
        wrong: [
          'Rendre Python plus rapide',
          'Exécuter Python sur une autre machine',
          'Compiler en C',
          'Cacher le code',
        ],
      },
      {
        ask: [
          'Quel fichier liste les paquets dont un projet a besoin, avec pip ?',
          'Quel fichier passes-tu à `pip install -r` ?',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'Makefile', 'main.py'],
      },
    ],
    wrong: ['Rendre Python plus rapide', 'Exécuter Python sur une autre machine', 'Compiler en C'],
    why: 'Chaque venv a ses propres paquets ; requirements.txt dit lesquels installer.',
  },
  'py-main-guard': {
    forms: [
      {
        ask: [
          'À quoi sert `if __name__ == "__main__":` ?',
          'Quand le code dans `if __name__ == "__main__":` s\'exécute-t-il ?',
        ],
        right: [
          "Seulement quand on exécute le fichier, pas quand on l'importe",
          'Quand le fichier est exécuté directement',
        ],
      },
    ],
    wrong: [
      "Toujours : c'est obligatoire",
      "Seulement quand on l'importe",
      'Seulement sous Windows',
      'Seulement quand on déclare la fonction main',
    ],
    why: 'À l\'import, __name__ est le nom du module ; quand on exécute le fichier, "__main__".',
  },
  'py-json': {
    forms: [
      {
        ask: [
          'Lequel de ces textes est du JSON valide ?',
          'Lequel de ces objets JSON est bien écrit ?',
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
          'Quelle fonction transforme un texte JSON en dictionnaire Python ?',
          "Qu'utilise-t-on pour lire du JSON depuis une chaîne de caractères ?",
        ],
        right: ['json.loads'],
        wrong: ['json.dumps', 'json.parse', 'eval'],
      },
    ],
    wrong: ["{'name': 'pepe', 'age': 3}", '{name: "pepe", age: 3}', '{"name": "pepe", "age": 3,}'],
    why: "JSON exige des guillemets doubles autour des clés et des chaînes, et n'accepte pas de virgule finale. loads lit ; dumps écrit.",
  },
  'llm-tokens': {
    forms: [
      {
        ask: [
          'Que génère un modèle de langage à chaque étape ?',
          'Par quelles unités un LLM écrit-il sa réponse ?',
        ],
        right: ['Le token suivant, choisi selon des probabilités', 'Un token à la fois'],
        wrong: [
          "Toute la réponse d'un coup",
          'Une phrase à la fois',
          'Un caractère, toujours',
          'Un mot du dictionnaire, toujours',
        ],
      },
      {
        ask: [
          'Comment obliger un modèle à toujours écrire du JSON valide pour une fonction ?',
          'En quoi consiste le décodage contraint ?',
        ],
        right: [
          'À retirer à chaque étape les tokens qui casseraient le format',
          'À ne le laisser choisir que des tokens qui gardent le JSON valide',
        ],
        wrong: [
          'À le lui demander poliment dans le prompt',
          "À réessayer jusqu'à ce que ce soit bon",
          'À utiliser un modèle plus gros',
        ],
      },
    ],
    wrong: ["Toute la réponse d'un coup", 'Une phrase à la fois', 'Un caractère, toujours'],
    why: 'La génération se fait token par token ; si à chaque étape seuls les tokens valides sont permis, le format est garanti.',
  },
  'llm-function-calling': {
    forms: [
      {
        ask: [
          "Qu'est-ce que le « function calling » dans un modèle de langage ?",
          'Que fait un modèle quand il fait du function calling ?',
        ],
        right: [
          "Il choisit une fonction et ses arguments ; ton programme l'exécute",
          'Il renvoie quelle fonction appeler et avec quels paramètres',
        ],
      },
    ],
    wrong: [
      'Il exécute du code sur ta machine',
      'Il est entraîné avec tes fonctions',
      'Il compile tes fonctions',
      'Il appelle un autre modèle',
    ],
    why: "Le modèle ne fait que proposer l'appel (nom et arguments, en général en JSON) ; l'exécuter, c'est ton travail.",
  },
}
