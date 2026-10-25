/** Banco de Not-games en francés: C++ (`../cpp.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const CPP_FR: Readonly<Record<string, ConceptText>> = {
  'cpp-class-struct': {
    forms: [
      {
        ask: [
          'En C++, quelle différence y a-t-il entre `class` et `struct` ?',
          'Quelle est la seule chose qui change entre class et struct ?',
        ],
        right: [
          'Ce qui est privé ou public par défaut',
          'Dans une class tout est privé par défaut, et dans une struct, public',
        ],
      },
    ],
    wrong: [
      'Une struct ne peut pas avoir de méthodes',
      'Une class va sur le tas et une struct sur la pile',
      "Une struct ne permet pas l'héritage",
      'Rien : elles sont identiques en tout',
    ],
    why: "En C++, une struct est une class où tout est public par défaut ; elle peut avoir des méthodes, de l'héritage et tout le reste.",
  },
  'cpp-reference': {
    forms: [
      {
        ask: [
          'Quelle différence y a-t-il entre une référence et un pointeur ?',
          "Qu'est-ce qu'une référence a de différent par rapport à un pointeur ?",
        ],
        right: [
          'Elle ne peut pas être nulle ni changer de cible',
          'Elle désigne toujours la même chose et ne peut pas valoir NULL',
        ],
      },
    ],
    wrong: [
      'Elle prend plus de mémoire',
      'Elle ne marche que pour les entiers',
      'On peut la réaffecter à une autre variable',
      'Elle est plus lente',
    ],
    why: 'Une référence est un autre nom pour quelque chose qui existe déjà : elle est toujours initialisée et jamais réaffectée.',
  },
  'cpp-const-method': {
    forms: [
      {
        ask: [
          'Que signifie le `const` à la fin de `int getValue() const;` ?',
          'Que promet une méthode marquée const à la fin ?',
        ],
        right: ["Que la méthode ne modifie pas l'objet", "Qu'elle ne modifie pas les attributs"],
      },
    ],
    wrong: [
      "Qu'elle renvoie une constante",
      "Qu'on ne peut l'appeler qu'une fois",
      "Qu'elle est statique",
      "Qu'elle ne peut pas être redéfinie",
    ],
    why: "Ainsi, on peut l'appeler sur des objets const, et le compilateur t'empêche de toucher aux attributs à l'intérieur.",
  },
  'cpp-new-delete': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas ici ?",
          "Qu'est-ce qui ne va pas quand on libère ainsi ce qui a été créé avec `new Zombie[10]` ?",
        ],
        right: [
          'Il faut utiliser delete[] : avec delete, seul le premier est détruit',
          'Ce qui est créé avec new[] se libère avec delete[]',
        ],
      },
    ],
    wrong: [
      "Rien : c'est correct",
      'Il faut utiliser free(horde)',
      'Il faut les supprimer un par un avec delete',
      "new n'accepte pas les tableaux",
    ],
    why: 'Ce qui est créé avec new[] se libère avec delete[], pour que le destructeur de chaque élément soit appelé.',
  },
  'cpp-canonical': {
    forms: [
      {
        ask: [
          "Quels sont les quatre éléments de la forme canonique orthodoxe d'une classe ?",
          'Que demande la forme canonique de Coplien ?',
        ],
        right: [
          "Constructeur par défaut, constructeur de copie, opérateur d'affectation et destructeur",
        ],
        wrong: [
          'Constructeur, destructeur, getter et setter',
          'Constructeur, operator==, operator<< et destructeur',
          'Constructeur par défaut, constructeur de déplacement, swap et destructeur',
        ],
      },
      {
        ask: ['Quand le constructeur de copie est-il appelé ?'],
        right: ["Quand on crée un nouvel objet à partir d'un autre"],
        wrong: [
          'Quand on affecte un objet à un autre qui existe déjà',
          'Quand un objet est détruit',
          'Quand un objet est passé par référence',
        ],
      },
      {
        ask: ["Dans `A b = a;`, qu'est-ce qui s'exécute ?"],
        right: ['Le constructeur de copie'],
        wrong: [
          "L'opérateur d'affectation",
          'Le constructeur par défaut, puis operator=',
          'Le destructeur de a',
        ],
      },
    ],
    wrong: [
      'Constructeur, destructeur, getter et setter',
      'Constructeur, operator==, operator<< et destructeur',
      'Constructeur et destructeur, rien de plus',
    ],
    why: "Copier à la création, c'est le constructeur de copie ; affecter à un objet qui existe déjà, c'est operator=.",
  },
  'cpp-shallow-copy': {
    code: 'class Brain { public: std::string *ideas; ... };\n\nBrain::Brain() { ideas = new std::string[100]; }\nBrain::~Brain() { delete[] ideas; }\n// Ni constructeur de copie ni operator=\n\nBrain a;\nBrain b = a;',
    forms: [
      {
        ask: [
          'Que se passe-t-il à la fin du programme ?',
          'Quand a et b sont détruits, que se passe-t-il ?',
        ],
        right: [
          'Le même tableau est libéré deux fois : la copie par défaut copie le pointeur',
          'Il y a un double delete : a et b partagent ideas',
        ],
      },
    ],
    wrong: [
      'Rien : la copie par défaut copie le tableau',
      'Il y a une fuite de mémoire, et rien de plus',
      'Ça ne compile pas',
      "Le destructeur n'est appelé qu'une fois",
    ],
    why: "La copie par défaut copie le pointeur, pas ce qu'il pointe : il faut écrire une copie profonde.",
  },
  'cpp-virtual': {
    code: 'class Animal { public: void makeSound() const { std::cout << "..."; } };\nclass Dog : public Animal { public: void makeSound() const { std::cout << "Ouaf"; } };\n\nAnimal *a = new Dog();\na->makeSound();',
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Qu'est-ce qui sort à l'écran ?"],
        right: ['...'],
        wrong: ['Ouaf', 'Ouaf...', 'Rien'],
      },
      {
        ask: [
          'Que faut-il changer pour que ça affiche « Ouaf » ?',
          'Pour que a->makeSound() dise « Ouaf », que faut-il ?',
        ],
        right: [
          'Déclarer makeSound virtual dans Animal',
          'Mettre virtual sur la méthode de la classe de base',
        ],
        wrong: [
          'La déclarer virtual seulement dans Dog',
          'Toujours caster en Dog',
          'Remplacer public par private',
        ],
      },
    ],
    wrong: ['Ouaf', 'Ouaf...', 'Rien'],
    why: "Sans virtual, l'appel se fait selon le type du pointeur (Animal) ; avec virtual, selon l'objet réel (Dog).",
  },
  'cpp-virtual-destructor': {
    forms: [
      {
        ask: ["Pourquoi le destructeur d'une classe de base doit-il être virtual ?"],
        right: [
          "Pour qu'un delete via un pointeur vers la base appelle aussi le destructeur de la classe fille",
        ],
        wrong: [
          "Pour qu'il soit plus rapide",
          'Pour pouvoir copier la classe',
          'Parce que sinon ça ne compile pas',
          'Pour rendre la classe abstraite',
        ],
      },
      {
        ask: ['Sans destructeur virtual, que fait `delete animal` si animal pointe vers un Dog ?'],
        right: ["Il n'appelle que le destructeur d'Animal"],
        wrong: [
          'Il appelle les deux destructeurs',
          'Ça ne compile pas',
          "Il n'appelle que celui de Dog",
        ],
      },
    ],
    wrong: [
      "Pour qu'il soit plus rapide",
      'Pour pouvoir copier la classe',
      'Parce que sinon ça ne compile pas',
    ],
    why: "Sans virtual, delete ne voit que le type du pointeur : la partie fille n'est pas détruite.",
  },
  'cpp-abstract': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui rend une classe abstraite en C++ ?",
          'Quand une classe C++ est-elle abstraite ?',
        ],
        right: ['Avoir au moins une méthode virtuelle pure (= 0)'],
        wrong: [
          'Porter le mot abstract',
          "N'avoir aucun constructeur",
          'Avoir tout en privé',
          'Une méthode qui renvoie 0',
        ],
      },
      {
        ask: ['Que produit `virtual void makeSound() const = 0;` dans une classe ?'],
        right: ["Qu'on ne peut pas créer d'objets de cette classe"],
        wrong: [
          'Que makeSound renvoie 0',
          'Que makeSound est statique',
          'Que personne ne peut en hériter',
        ],
      },
    ],
    wrong: ['Porter le mot abstract', "N'avoir aucun constructeur", 'Avoir tout en privé'],
    why: "= 0 en fait une méthode virtuelle pure : la classe ne peut pas être instanciée et les classes filles doivent l'implémenter.",
  },
  'cpp-diamond': {
    forms: [
      {
        ask: [
          "DiamondTrap hérite de ScavTrap et de FragTrap, qui héritent toutes deux de ClapTrap. Comment éviter d'avoir deux ClapTrap à l'intérieur ?",
          'Dans un héritage en diamant, comment obtenir une seule base commune ?',
        ],
        right: [
          'Avec un héritage virtuel de la base',
          'En héritant de ClapTrap avec virtual public',
        ],
      },
    ],
    wrong: [
      'En rendant ClapTrap abstraite',
      'Avec un destructeur virtual',
      'En héritant en private',
      "On ne peut pas l'éviter",
    ],
    why: "L'héritage virtuel (`class ScavTrap : virtual public ClapTrap`) partage une seule copie de la base entre tous les chemins du diamant.",
  },
  'cpp-exceptions': {
    forms: [
      {
        ask: ['Que fait `throw` ?', 'Que se passe-t-il quand tu lances une exception ?'],
        right: [
          'Il interrompt ce qui est en cours et saute au catch qui la récupère',
          'On cherche plus haut dans les appels un catch de ce type',
        ],
        wrong: [
          'Il termine toujours le programme',
          'Il renvoie -1',
          "Il affiche l'erreur et continue",
          'Il relance la fonction',
        ],
      },
      {
        ask: [
          "Quelle méthode redéfinit-on pour donner le message d'une exception ?",
          "Avec quelle méthode une classe qui hérite de std::exception explique-t-elle l'erreur ?",
        ],
        right: ['what()'],
        wrong: ['message()', 'error()', 'toString()'],
      },
    ],
    wrong: ['Il termine toujours le programme', 'Il renvoie -1', "Il affiche l'erreur et continue"],
    why: "throw remonte la pile d'appels en détruisant les variables locales, jusqu'au catch qui correspond ; s'il n'y en a aucun, le programme s'arrête.",
  },
  'cpp-catch-ref': {
    forms: [
      {
        ask: [
          'Pourquoi attrape-t-on avec `catch (std::exception &e)` et pas par valeur ?',
          "À quoi sert d'attraper une exception par référence ?",
        ],
        right: [
          'Pour ne pas la copier ni perdre le vrai type de la classe fille',
          'Pour que what() soit celui de la vraie classe',
        ],
      },
    ],
    wrong: [
      'Parce que par valeur, ça ne compile pas',
      'Pour pouvoir toujours la modifier',
      "Parce que c'est plus court à écrire",
      'Pour pouvoir la relancer',
    ],
    why: 'Par valeur, elle est copiée en std::exception et la partie fille est perdue (slicing).',
  },
  'cpp-casts': {
    forms: [
      {
        ask: [
          "Quel cast vérifie à l'exécution qu'un pointeur vers Base est en réalité un Derived ?",
          "Quel cast sert à connaître le type réel d'un objet polymorphe ?",
        ],
        right: ['dynamic_cast'],
        wrong: ['static_cast', 'reinterpret_cast', 'const_cast'],
      },
      {
        ask: [
          "Quel cast réinterprète les bits d'un pointeur comme un autre type (par exemple uintptr_t) ?",
          'Quel cast utilise-t-on pour transformer un pointeur en entier ?',
        ],
        right: ['reinterpret_cast'],
        wrong: ['dynamic_cast', 'static_cast', 'const_cast'],
      },
      {
        ask: [
          'Quel cast utilises-tu pour convertir un double en int ?',
          'Quel cast fait une conversion ordinaire entre types numériques ?',
        ],
        right: ['static_cast'],
        wrong: ['dynamic_cast', 'reinterpret_cast', 'const_cast'],
      },
    ],
    wrong: ['const_cast', 'type_cast', 'implicit_cast'],
    why: "static_cast convertit à la compilation, dynamic_cast vérifie à l'exécution et reinterpret_cast change le type des bits.",
  },
  'cpp-dynamic-null': {
    forms: [
      {
        ask: [
          'Que fait `dynamic_cast<B*>(p)` si p ne pointe pas vers un B ?',
          'Que renvoie un dynamic_cast de pointeur qui ne correspond pas ?',
        ],
        right: ['Il renvoie un pointeur nul'],
        wrong: [
          'Il lance std::bad_cast',
          'Il renvoie p inchangé',
          'Ça ne compile pas',
          'Il arrête le programme',
        ],
      },
      {
        ask: [
          "Que fait `dynamic_cast<B&>(r)` si r n'est pas un B ?",
          'Que se passe-t-il avec un dynamic_cast de référence qui ne correspond pas ?',
        ],
        right: ['Il lance std::bad_cast'],
        wrong: [
          'Il renvoie un pointeur nul',
          'Il renvoie r inchangé',
          'Ça ne compile pas',
          'Il arrête le programme',
        ],
      },
    ],
    wrong: ['Ça ne compile pas', 'Il renvoie p inchangé', 'Il arrête le programme'],
    why: "Une référence nulle, ça n'existe pas : le cast de référence lance donc bad_cast ; celui de pointeur donne NULL.",
  },
  'cpp-templates': {
    forms: [
      {
        ask: [
          'Pourquoi les templates vont-ils en général en entier dans le .hpp ?',
          "Pourquoi met-on le code d'un template dans le header ?",
        ],
        right: [
          'Parce que le compilateur doit les voir pour générer chaque version',
          "Parce qu'ils sont instanciés quand on les utilise avec un type concret",
        ],
        wrong: [
          'Par convention, rien de plus',
          "Parce qu'ils ne peuvent pas être compilés",
          "Pour qu'ils prennent moins de place",
          "Parce qu'ils sont privés",
        ],
      },
      {
        ask: [
          'Que fait `template <typename T> T max(T a, T b)` ?',
          'Que permet une fonction template comme celle-ci ?',
        ],
        right: [
          'Elle marche pour tout type comparable',
          "Elle génère une version pour chaque type avec lequel on l'utilise",
        ],
        wrong: [
          "Elle ne marche qu'avec int",
          'Elle convertit tout en double',
          "Elle s'exécute plus lentement",
        ],
      },
    ],
    wrong: [
      'Par convention, rien de plus',
      "Parce qu'ils ne peuvent pas être compilés",
      "Pour qu'ils prennent moins de place",
    ],
    why: "Un template n'est pas du code tant qu'on ne l'utilise pas avec un type ; pour le générer, le compilateur doit le voir.",
  },
  'cpp-containers': {
    forms: [
      {
        ask: [
          'Quel conteneur de la STL stocke des paires clé-valeur triées par clé ?',
          'Quel conteneur utilises-tu pour un dictionnaire trié ?',
        ],
        right: ['std::map'],
        wrong: ['std::vector', 'std::list', 'std::stack'],
      },
      {
        ask: [
          "Quel conteneur range les éléments les uns après les autres en mémoire et permet l'accès par indice ?",
          'Quel est le tableau dynamique de la STL ?',
        ],
        right: ['std::vector'],
        wrong: ['std::map', 'std::list', 'std::stack'],
      },
    ],
    wrong: ['std::stack', 'std::list', 'std::queue'],
    why: 'vector est un tableau qui grandit ; map, un arbre trié par clé ; list, une liste doublement chaînée.',
  },
  'cpp-iterator-invalid': {
    forms: [
      {
        ask: ['Quel est le problème ?', 'Peut-on lire *it sans risque à la fin ?'],
        right: [
          "En grandissant, le vector peut changer d'endroit et l'itérateur devient invalide",
          'Non : push_back peut invalider it',
        ],
      },
    ],
    wrong: ['Ça affiche toujours 1', 'Ça affiche 99', 'Ça ne compile pas', 'Ça affiche 0'],
    why: 'Si le vector a besoin de plus de place, il réserve un autre bloc et recopie : les anciens itérateurs pointent vers de la mémoire libérée.',
  },
  'cpp-rpn': {
    forms: [
      {
        ask: [
          "Que vaut l'expression en notation polonaise inverse « 3 4 + 2 * » ?",
          'En RPN, que donne « 3 4 + 2 * » ?',
        ],
        right: ['14'],
        wrong: ['11', '10', '24', '9'],
      },
      {
        ask: [
          'Quelle structure utilise-t-on pour évaluer la notation polonaise inverse ?',
          'Pour calculer en RPN, où range-t-on les nombres au fur et à mesure ?',
        ],
        right: ['Dans une pile'],
        wrong: ['Dans une map', 'Dans une file', 'Dans un arbre'],
      },
    ],
    wrong: ['11', '10', '24', '9'],
    why: 'On empile les nombres et chaque opérateur en dépile deux : 3 + 4 = 7 et 7 · 2 = 14.',
  },
}
