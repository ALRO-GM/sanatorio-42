/** Banco de Not-games en francés: C++ (`../cpp.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const CPP_FR: Readonly<Record<string, ConceptText>> = {
  'cpp-class-struct': {
    forms: [
      {
        ask: [
          'En C++, quelle différence y a-t-il entre `class` et `struct` ?',
          'Quelle est la seule chose qui change entre class et struct ?',
        ],
        right: [
          'Ce qui est privé ou public par défaut change',
          'Dans une class, tout est privé par défaut, et dans une struct, public',
        ],
      },
    ],
    wrong: [
      'Une struct ne peut pas avoir de méthodes, seulement des attributs',
      'Une class va sur le tas et une struct sur la pile',
      "Une struct ne permet ni l'héritage ni les méthodes virtuelles",
      'Rien : en C++, elles sont identiques en tout',
    ],
    why: "En C++, une struct est une class où tout est public par défaut ; elle peut avoir des méthodes, de l'héritage et tout le reste.",
  },
  'cpp-reference': {
    forms: [
      {
        ask: [
          'Quelle différence y a-t-il entre une référence et un pointeur ?',
          "Qu'est-ce qu'une référence a de différent par rapport à un pointeur ?",
        ],
        right: [
          'Elle ne peut pas être nulle ni changer de cible',
          'Elle désigne toujours la même chose et ne vaut jamais NULL',
        ],
      },
    ],
    wrong: [
      "Elle prend plus de mémoire qu'un pointeur normal",
      'Elle ne marche que pour les types de base, comme int',
      'On peut la réaffecter pour nommer une autre variable',
      'Elle est plus lente, car elle est copiée à chaque usage',
    ],
    why: 'Une référence est un autre nom pour quelque chose qui existe déjà : elle est toujours initialisée et jamais réaffectée.',
  },
  'cpp-const-method': {
    forms: [
      {
        ask: [
          'Que signifie le `const` à la fin de `int getValue() const;` ?',
          'Que promet une méthode marquée const à la fin ?',
        ],
        right: ["Que la méthode ne modifie pas l'objet", "Qu'elle ne modifie pas les attributs"],
      },
    ],
    wrong: [
      "Qu'elle renvoie une valeur constante",
      "Qu'on ne peut l'appeler qu'une fois par objet",
      "Qu'elle est statique et ne reçoit pas this",
      "Qu'elle ne peut pas être redéfinie dans une fille",
    ],
    why: "Ainsi, on peut l'appeler sur des objets const, et le compilateur t'empêche de toucher aux attributs à l'intérieur.",
  },
  'cpp-new-delete': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas ici ?",
          "Qu'est-ce qui ne va pas quand on libère ainsi ce qui a été créé avec `new Zombie[10]` ?",
        ],
        right: [
          'Il faut le libérer avec delete[], pas avec delete',
          'Ce qui est créé avec new[] se libère avec delete[]',
        ],
      },
    ],
    wrong: [
      'Rien : delete libère le tableau entier',
      'Il faut le libérer avec free(horde)',
      'Il faut les supprimer un par un avec delete',
      "new ne peut pas créer de tableaux d'objets",
    ],
    why: 'Ce qui est créé avec new[] se libère avec delete[], qui appelle le destructeur de chaque élément ; un simple delete donne un comportement indéfini.',
  },
  'cpp-canonical': {
    forms: [
      {
        ask: [
          "Quels sont les quatre éléments de la forme canonique orthodoxe d'une classe ?",
          'Que demande la forme canonique de Coplien ?',
        ],
        right: [
          "Constructeur par défaut, constructeur de copie, opérateur d'affectation et destructeur",
        ],
        wrong: [
          'Constructeur, destructeur, un getter et un setter par attribut',
          'Constructeur, operator==, operator<< et un destructeur virtual',
          'Constructeur par défaut, constructeur de déplacement, swap et destructeur',
        ],
      },
      {
        ask: ['Quand le constructeur de copie est-il appelé ?'],
        right: ["Quand on crée un nouvel objet à partir d'un autre"],
        wrong: [
          'Quand on affecte un objet à un autre qui existe déjà',
          'Quand un objet qui avait été copié est détruit',
          'Quand un objet est passé par référence',
        ],
      },
      {
        ask: ["Dans `A b = a;`, qu'est-ce qui s'exécute ?"],
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
    why: "Copier à la création, c'est le constructeur de copie ; affecter à un objet qui existe déjà, c'est operator=.",
  },
  'cpp-shallow-copy': {
    code: 'class Brain { public: std::string *ideas; ... };\n\nBrain::Brain() { ideas = new std::string[100]; }\nBrain::~Brain() { delete[] ideas; }\n// Ni constructeur de copie ni operator=\n\nBrain a;\nBrain b = a;',
    forms: [
      {
        ask: [
          'Que se passe-t-il à la fin du programme ?',
          'Quand a et b sont détruits, que se passe-t-il ?',
        ],
        right: [
          'Double delete : la copie par défaut copie le pointeur',
          "Le même tableau d'idées est libéré deux fois",
        ],
      },
    ],
    wrong: [
      'Rien : la copie par défaut duplique le tableau',
      'Il y a une fuite de mémoire, mais rien de plus grave',
      'Ça ne compile pas : il manque le constructeur de copie',
      'Un seul destructeur est appelé, celui de a',
    ],
    why: "La copie par défaut copie le pointeur, pas ce qu'il pointe : il faut écrire une copie profonde.",
  },
  'cpp-virtual': {
    code: 'class Animal { public: void makeSound() const { std::cout << "..."; } };\nclass Dog : public Animal { public: void makeSound() const { std::cout << "Ouaf"; } };\n\nAnimal *a = new Dog();\na->makeSound();',
    forms: [
      {
        ask: ["Qu'est-ce que ça affiche ?", "Qu'est-ce qui sort à l'écran ?"],
        right: ['...'],
        wrong: ['Ouaf', 'Ouaf...', 'Rien'],
      },
      {
        ask: [
          'Que faut-il changer pour que ça affiche « Ouaf » ?',
          'Pour que a->makeSound() dise « Ouaf », que faut-il ?',
        ],
        right: [
          'Déclarer makeSound virtual dans Animal',
          'Mettre virtual sur la méthode de la classe de base',
        ],
        wrong: [
          'La déclarer virtual seulement dans Dog, pas dans Animal',
          'Déclarer makeSound static dans les deux classes',
          "Remplacer public par protected dans l'héritage",
        ],
      },
    ],
    wrong: ['Ouaf', 'Ouaf...', 'Rien'],
    why: "Sans virtual, l'appel se fait selon le type du pointeur (Animal) ; avec virtual, selon l'objet réel (Dog).",
  },
  'cpp-virtual-destructor': {
    forms: [
      {
        ask: ["Pourquoi le destructeur d'une classe de base doit-il être virtual ?"],
        right: ["Pour qu'un delete via la base détruise aussi la fille"],
        wrong: [
          "Pour que le destructeur s'exécute plus vite",
          'Pour pouvoir copier les objets de la classe',
          "Parce que s'il n'est pas virtual, ça ne compile pas",
          'Pour que la classe devienne abstraite',
        ],
      },
      {
        ask: ['Sans destructeur virtual, que fait `delete animal` si animal pointe vers un Dog ?'],
        right: ["Il n'appelle que le destructeur d'Animal"],
        wrong: [
          'Il appelle les deux destructeurs, comme toujours',
          'Ça ne compile pas : il manque le destructeur virtual',
          "Il n'appelle que le destructeur de Dog",
        ],
      },
    ],
    wrong: [
      "Pour qu'il soit plus rapide",
      'Pour pouvoir copier la classe',
      'Parce que sinon ça ne compile pas',
    ],
    why: "Sans virtual, delete ne voit que le type du pointeur : la partie fille n'est pas détruite (à la rigueur, c'est un comportement indéfini).",
  },
  'cpp-abstract': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui rend une classe abstraite en C++ ?",
          'Quand une classe C++ est-elle abstraite ?',
        ],
        right: ['Avoir au moins une méthode virtuelle pure'],
        wrong: [
          'Porter le mot abstract devant class',
          "N'avoir aucun constructeur public",
          'Avoir tous ses attributs en privé',
          'Avoir une méthode qui renvoie toujours 0',
        ],
      },
      {
        ask: ["Qu'implique `virtual void makeSound() const = 0;` dans une classe ?"],
        right: ["Qu'on ne peut pas créer d'objets de cette classe"],
        wrong: [
          'Que makeSound renvoie toujours 0',
          'Que makeSound ne peut pas être redéfinie dans les filles',
          'Que personne ne peut hériter de cette classe',
        ],
      },
    ],
    wrong: ['Porter le mot abstract', "N'avoir aucun constructeur", 'Avoir tout en privé'],
    why: "= 0 en fait une méthode virtuelle pure : la classe ne peut pas être instanciée et les classes filles doivent l'implémenter.",
  },
  'cpp-diamond': {
    forms: [
      {
        ask: [
          "DiamondTrap hérite de ScavTrap et de FragTrap, qui héritent toutes deux de ClapTrap. Comment éviter d'avoir deux ClapTrap à l'intérieur ?",
          'Dans un héritage en diamant, comment obtenir une seule base commune ?',
        ],
        right: [
          'Avec un héritage virtuel de la base',
          'En héritant de ClapTrap avec virtual public',
        ],
      },
    ],
    wrong: [
      'En faisant de ClapTrap une classe abstraite',
      'Avec un destructeur virtual dans ClapTrap',
      'En héritant de ClapTrap en private',
      'Impossible : il y aura toujours deux ClapTrap',
    ],
    why: "L'héritage virtuel (`class ScavTrap : virtual public ClapTrap`) partage une seule copie de la base entre tous les chemins du diamant.",
  },
  'cpp-exceptions': {
    forms: [
      {
        ask: ['Que fait `throw` ?', 'Que se passe-t-il quand tu lances une exception ?'],
        right: [
          'Il quitte la fonction et saute au catch qui la récupère',
          'On cherche plus haut dans les appels un catch de ce type',
        ],
        wrong: [
          "Il termine toujours le programme, qu'il y ait un catch ou non",
          "Il fait renvoyer -1 à la fonction, pour l'appelant",
          "Il affiche l'erreur sur stderr et continue à la ligne suivante",
          'Il relance la fonction depuis le début',
        ],
      },
      {
        ask: [
          "Quelle méthode redéfinit-on pour donner le message d'une exception ?",
          "Avec quelle méthode une classe qui hérite de std::exception explique-t-elle l'erreur ?",
        ],
        right: ['what()'],
        wrong: ['message()', 'error()', 'toString()'],
      },
    ],
    wrong: ['Il termine toujours le programme', 'Il renvoie -1', "Il affiche l'erreur et continue"],
    why: "throw remonte la pile d'appels en détruisant les variables locales, jusqu'au catch qui correspond ; s'il n'y en a aucun, le programme s'arrête.",
  },
  'cpp-catch-ref': {
    forms: [
      {
        ask: [
          'Pourquoi attrape-t-on avec `catch (std::exception &e)` et pas par valeur ?',
          "À quoi sert d'attraper une exception par référence ?",
        ],
        right: [
          'Pour ne pas la copier ni perdre le vrai type de la classe fille',
          'Pour que what() soit celui de la vraie classe',
        ],
      },
    ],
    wrong: [
      'Parce que par valeur, ça ne compile pas en C++98',
      'Pour pouvoir toujours la modifier dans le catch',
      "Parce que c'est plus court à écrire que par valeur",
      "Pour que l'exception ne soit pas lancée deux fois",
    ],
    why: 'Par valeur, elle est copiée en std::exception et la partie fille est perdue (slicing).',
  },
  'cpp-casts': {
    forms: [
      {
        ask: [
          "Quel cast vérifie à l'exécution qu'un pointeur vers Base est en réalité un Derived ?",
          "Quel cast sert à connaître le type réel d'un objet polymorphe ?",
        ],
        right: ['dynamic_cast'],
        wrong: ['static_cast', 'reinterpret_cast', 'const_cast'],
      },
      {
        ask: [
          "Quel cast réinterprète les bits d'un pointeur comme un autre type (par exemple uintptr_t) ?",
          'Quel cast utilise-t-on pour transformer un pointeur en entier ?',
        ],
        right: ['reinterpret_cast'],
        wrong: ['dynamic_cast', 'static_cast', 'const_cast'],
      },
      {
        ask: [
          'Quel cast utilises-tu pour convertir un double en int ?',
          'Quel cast fait une conversion ordinaire entre types numériques ?',
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
          'Que fait `dynamic_cast<B*>(p)` si p ne pointe pas vers un B ?',
          'Que renvoie un dynamic_cast de pointeur qui ne correspond pas ?',
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
          "Que fait `dynamic_cast<B&>(r)` si r n'est pas un B ?",
          'Que se passe-t-il avec un dynamic_cast de référence qui ne correspond pas ?',
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
    why: "Une référence nulle, ça n'existe pas : le cast de référence lance donc bad_cast ; celui de pointeur donne NULL.",
  },
  'cpp-templates': {
    forms: [
      {
        ask: [
          'Pourquoi les templates vont-ils en général en entier dans le .hpp ?',
          "Pourquoi met-on le code d'un template dans le header ?",
        ],
        right: [
          'Parce que le compilateur en a besoin pour les instancier',
          "Parce qu'ils sont générés à l'usage, avec un type précis",
        ],
        wrong: [
          'Par convention de style, sans autre raison',
          "Pour que l'exécutable final soit plus petit",
          'Parce que les templates sont toujours privés',
          "Parce qu'ainsi le programme s'exécute plus vite",
        ],
      },
      {
        ask: [
          'Que fait `template <typename T> T max(T a, T b)` ?',
          'Que permet une fonction template comme celle-ci ?',
        ],
        right: [
          'Elle marche pour tout type comparable',
          "Elle génère une version pour chaque type avec lequel on l'utilise",
        ],
        wrong: [
          "Elle ne marche qu'avec int, le type par défaut",
          'Elle convertit a et b en double avant de comparer',
          'Elle compare les adresses de a et b, pas les valeurs',
        ],
      },
    ],
    wrong: [
      'Par convention, rien de plus',
      "Pour qu'ils prennent moins de place",
      "Parce qu'ils sont privés",
    ],
    why: "Un template n'est pas du code tant qu'on ne l'utilise pas avec un type ; pour le générer, le compilateur doit le voir.",
  },
  'cpp-containers': {
    forms: [
      {
        ask: [
          'Quel conteneur de la STL stocke des paires clé-valeur triées par clé ?',
          'Quel conteneur utilises-tu pour un dictionnaire trié ?',
        ],
        right: ['std::map'],
        wrong: ['std::vector', 'std::list', 'std::stack'],
      },
      {
        ask: [
          "Quel conteneur range les éléments les uns après les autres en mémoire et permet l'accès par indice ?",
          'Quel est le tableau dynamique de la STL ?',
        ],
        right: ['std::vector'],
        wrong: ['std::map', 'std::list', 'std::stack'],
      },
    ],
    wrong: ['std::stack', 'std::list', 'std::queue'],
    why: 'vector est un tableau qui grandit ; map, un arbre trié par clé ; list, une liste doublement chaînée.',
  },
  'cpp-iterator-invalid': {
    forms: [
      {
        ask: ['Quel est le problème ?', 'Que se passe-t-il quand on lit *it à la fin ?'],
        right: [
          'Il peut lire de la mémoire libérée : it est invalide',
          'Comportement indéfini : push_back a invalidé it',
        ],
      },
    ],
    wrong: [
      'Aucun : ça affiche 1, le premier élément',
      'Aucun : ça affiche 99, le dernier ajouté',
      "Ça ne compile pas : it ne peut pas être d'un vector<int>",
      'Aucun : ça affiche 0, la valeur par défaut',
    ],
    why: 'Si le vector a besoin de plus de place, il réserve un autre bloc et recopie : les anciens itérateurs pointent vers de la mémoire libérée.',
  },
  'cpp-rpn': {
    forms: [
      {
        ask: [
          "Que vaut l'expression en notation polonaise inverse « 3 4 + 2 * » ?",
          'En RPN, que donne « 3 4 + 2 * » ?',
        ],
        right: ['14'],
        wrong: ['11', '10', '24', '9'],
      },
      {
        ask: [
          'Quelle structure utilise-t-on pour évaluer la notation polonaise inverse ?',
          'Pour calculer en RPN, où range-t-on les nombres au fur et à mesure ?',
        ],
        right: ['Dans une pile'],
        wrong: ['Dans une map', 'Dans une file', 'Dans un arbre'],
      },
    ],
    wrong: ['11', '10', '24', '9'],
    why: 'On empile les nombres et chaque opérateur en dépile deux : 3 + 4 = 7 et 7 · 2 = 14.',
  },
  'cpp00-std': {
    forms: [
      {
        ask: [
          'Que veut dire le `std::` de `std::cout` ?',
          "Dans `std::string`, qu'est-ce que std ?",
        ],
        right: [
          "L'espace de noms de la bibliothèque standard",
          'Le namespace où vit tout ce qui est standard',
        ],
        wrong: [
          'Une classe qui regroupe des méthodes statiques',
          'Un préfixe qui marque ce qui vient de la libc',
          "Le nom de l'en-tête, comme stdio.h",
        ],
      },
      {
        ask: [
          'Que fait `std::endl` en plus d’écrire un saut de ligne ?',
          'En plus de passer à la ligne, std::endl…',
        ],
        right: ['Il vide le tampon de sortie', "Il force l'écriture du tampon"],
        wrong: [
          'Il ferme std::cout',
          'Il ajoute un caractère nul à la fin',
          'Il écrit aussi un retour chariot',
        ],
      },
      {
        ask: [
          'Dans les CPP, que se passe-t-il si tu écris `using namespace std;` ?',
          'Selon les règles des CPP, `using namespace` est…',
        ],
        right: ['Interdit : la note est -42', 'Interdit, tout comme friend'],
        wrong: [
          "Autorisé : c'est ce que recommande le sujet",
          'Autorisé, même si la norme le déconseille',
          'Obligatoire dans chaque fichier .cpp',
        ],
      },
    ],
    wrong: [
      'Un type spécial de pointeur C++',
      "Une macro de l'en-tête iostream",
      'Autorisé seulement dans main',
    ],
    why: "std est l'espace de noms de la bibliothèque standard ; les CPP interdisent `using namespace` (et friend) pour qu'on écrive std:: soi-même, et std::endl vide en plus le tampon.",
  },
  'cpp00-megaphone': {
    forms: [
      {
        ask: [
          "Qu'affiche `./megaphone` sans arguments, dans l'ex00 de CPP 00 ?",
          'Si tu lances megaphone sans rien à crier, il affiche…',
        ],
        right: ['* LOUD AND UNBEARABLE FEEDBACK NOISE *'],
        wrong: [
          'Usage: ./megaphone "text to shout"',
          '* SILENCE IS LOUDER THAN ANY NOISE *',
          'Error: megaphone needs at least one argument',
        ],
      },
      {
        ask: [
          "Qu'affiche `./megaphone salut monde` ?",
          'Avec les arguments salut et monde, megaphone affiche…',
        ],
        right: ['SALUTMONDE'],
        wrong: ['SALUT MONDE', 'Salut Monde', 'salut monde'],
      },
    ],
    wrong: ['MONDE SALUT', 'SALUT', 'MONDE'],
    why: "megaphone met chaque argument en majuscules et les écrit à la suite, sans ajouter d'espace ; sans argument, il lâche le bruit de larsen.",
  },
  'cpp00-phonebook': {
    forms: [
      {
        ask: [
          'Combien de contacts le PhoneBook de CPP 00 garde-t-il au maximum ?',
          'Combien de Contact tiennent dans le tableau du PhoneBook ?',
        ],
        right: ['8'],
        wrong: ['10', '16', '5', '100'],
      },
      {
        ask: [
          'Que se passe-t-il quand tu ajoutes un contact avec le PhoneBook déjà plein ?',
          'Avec le PhoneBook plein, ADD…',
        ],
        right: [
          'Remplace le contact le plus ancien',
          'Écrase le contact qui est là depuis le plus longtemps',
        ],
        wrong: [
          'Refuse le contact et prévient que c’est plein',
          'Remplace le dernier contact ajouté',
          'Réserve plus de place avec new pour le nouveau',
        ],
      },
      {
        ask: [
          "Dans SEARCH, comment s'affiche un champ de plus de 10 caractères ?",
          'Si un nom ne tient pas dans sa colonne de SEARCH, il s’affiche…',
        ],
        right: ['Coupé à 9, avec un point à la fin', 'Ses 9 premiers caractères et un « . »'],
        wrong: [
          'En entier, même si ça décale la colonne',
          'Coupé à 10, sans signaler ce qui manque',
          'Avec « ... » à la place des trois dernières lettres',
        ],
      },
    ],
    wrong: ['12', '20', '4'],
    why: 'Le PhoneBook est un tableau fixe de 8 (sans mémoire dynamique) et le neuvième écrase le plus ancien ; SEARCH aligne à droite des colonnes de 10 avec std::setw(10) et tronque avec un point.',
  },
  'cpp01-zombie': {
    forms: [
      {
        ask: [
          'Quand vaut-il mieux créer le Zombie sur le tas, comme newZombie ?',
          'newZombie renvoie un Zombie créé avec new parce que…',
        ],
        right: [
          'Il doit rester en vie après la fin de la fonction',
          "L'appelant s'en servira après la fin de la fonction",
        ],
        wrong: [
          'Les objets avec une std::string ne tiennent pas sur la pile',
          "Ce qui est créé avec new s'annonce plus vite",
          'Ainsi, seul son destructeur est appelé à la fin de main',
        ],
      },
      {
        ask: [
          'Dans randomChump, pourquoi le Zombie peut-il aller sur la pile ?',
          'randomChump crée son Zombie en variable locale parce que…',
        ],
        right: [
          'Il ne sert que dans la fonction et meurt avec elle',
          "Il n'a pas besoin de vivre plus longtemps que la fonction",
        ],
        wrong: [
          "Sur la pile, le Zombie n'est jamais détruit",
          'Ce qui est sur la pile doit être libéré avec delete',
          'Ainsi, on peut renvoyer son adresse sans danger',
        ],
      },
    ],
    wrong: [
      "Parce que le sujet interdit d'utiliser new",
      'Parce que sur la pile on peut le libérer deux fois',
      "Parce qu'un Zombie n'a pas de destructeur",
    ],
    why: "Ce qui est sur la pile meurt à la fin de la fonction (et son destructeur est appelé tout seul) ; ce qui est sur le tas vit jusqu'à son delete, donc on peut le renvoyer.",
  },
  'cpp01-weapon': {
    forms: [
      {
        ask: [
          "Dans l'ex03 de CPP 01, pourquoi HumanA peut-il garder son Weapon par référence ?",
          'HumanA reçoit son arme dans le constructeur ; ça lui permet…',
        ],
        right: [
          'Il a toujours une arme, dès sa construction',
          "Il n'est jamais désarmé et ne change jamais d'arme",
        ],
        wrong: [
          "Les références se copient plus vite que l'arme",
          "Ainsi, l'arme est détruite en même temps que HumanA",
          "Les références peuvent rester vides jusqu'à setWeapon",
        ],
      },
      {
        ask: [
          "Dans l'ex03 de CPP 01, pourquoi HumanB garde-t-il le Weapon avec un pointeur ?",
          "HumanB reçoit l'arme plus tard, avec setWeapon ; c'est pour ça que…",
        ],
        right: [
          "Il peut rester sans arme un moment, et c'est NULL",
          "Il commence désarmé et l'arme arrive après",
        ],
        wrong: [
          'Les références ne peuvent pas être des attributs de classe',
          "Ainsi, setWeapon copie l'arme en entier",
          "Un pointeur prend moins de mémoire qu'une référence",
        ],
      },
    ],
    wrong: [
      'Parce que le sujet interdit les références',
      "Parce qu'ainsi HumanB peut supprimer l'arme",
      "Parce que Weapon n'a pas de constructeur de copie",
    ],
    why: "Une référence s'initialise à la construction et ne peut pas être nulle ; un pointeur peut partir de NULL et viser l'arme quand elle arrive. Les deux voient les changements faits par setType.",
  },
  'cpp01-sed': {
    forms: [
      {
        ask: [
          "Dans l'ex04 de CPP 01, quel fichier le programme crée-t-il à partir de « notes » ?",
          "Si tu donnes le fichier notes à l'ex04, il écrit le résultat dans…",
        ],
        right: ['notes.replace'],
        wrong: ['notes.out', 'notes.sed', 'replace.notes'],
      },
      {
        ask: [
          "Dans l'ex04 de CPP 01, avec quoi lit-on et écrit-on le fichier ?",
          "Pour ouvrir les fichiers de l'ex04 sans fonctions C, on utilise…",
        ],
        right: ['`std::ifstream` et `std::ofstream`'],
        wrong: [
          '`fopen`, `fgets` et `fputs`',
          '`open`, `read` et `write`',
          '`std::cin` et `std::cout`',
        ],
      },
      {
        ask: [
          'Sans `std::string::replace`, comment remplacer s1 par s2 ?',
          "Dans l'ex04 de CPP 01, le remplacement de s1 par s2 se fait…",
        ],
        right: [
          'En cherchant avec find et en recollant les morceaux avec substr',
          'Avec find pour chaque occurrence, en construisant une autre chaîne',
        ],
        wrong: [
          'Avec std::replace de <algorithm> sur la chaîne',
          'En appelant sed depuis le programme avec system()',
          'Avec std::regex_replace sur chaque ligne lue',
        ],
      },
    ],
    wrong: ['notes.new', 'notes.txt', 'notes.copy'],
    why: "L'ex04 lit avec std::ifstream, écrit <fichier>.replace avec std::ofstream et remplace chaque s1 à la main : replace et les fonctions de fichiers du C sont interdites.",
  },
  'cpp01-harl': {
    forms: [
      {
        ask: [
          'Comment le sujet demande-t-il à Harl de choisir entre debug, info, warning et error ?',
          'Dans complain(level), Harl appelle la méthode de chaque niveau…',
        ],
        right: [
          'Avec des pointeurs sur fonctions membres',
          'Avec un tableau de pointeurs sur méthodes',
        ],
        wrong: [
          'Avec une suite de if et de else if',
          'Avec un switch sur le texte du niveau',
          'Avec de l’héritage : une classe fille par niveau',
        ],
      },
      {
        ask: ['Comment appelle-t-on le pointeur sur méthode `f` sur l’objet courant ?'],
        right: ['`(this->*f)()`'],
        wrong: ['`this->f()`', '`(*f)(this)`', '`this.*f()`'],
      },
    ],
    wrong: [
      'Avec une fonction virtual par niveau',
      'Avec une std::map de chaînes',
      'Avec des macros du préprocesseur',
    ],
    why: "L'ex05 interdit la forêt de if/else : on garde un tableau de pointeurs sur méthodes (`void (Harl::*)()`) et on appelle celui du niveau avec `(this->*f)()`.",
  },
  'cpp02-fixed': {
    forms: [
      {
        ask: [
          'Combien de bits fractionnaires a le Fixed de CPP 02 ?',
          'Combien de bits Fixed garde-t-il pour la partie décimale ?',
        ],
        right: ['8'],
        wrong: ['16', '4', '32', '10'],
      },
      {
        ask: [
          'Avec 8 bits fractionnaires, quel entier Fixed stocke-t-il pour 1.5 ?',
          'Que vaut en interne un Fixed qui représente 1.5 ?',
        ],
        right: ['384'],
        wrong: ['150', '15', '192', '768'],
      },
      {
        ask: [
          'Pour passer un float en Fixed, quelle fonction de <cmath> le sujet autorise-t-il ?',
          'Avec quelle fonction arrondit-on en convertissant un float en Fixed ?',
        ],
        right: ['roundf'],
        wrong: ['floorf', 'truncf', 'ceilf'],
      },
    ],
    wrong: ['256', '2', '64'],
    why: 'Avec 8 bits fractionnaires, la valeur est stockée multipliée par 256 (1 << 8) : 1.5 donne 384, et un float se convertit avec roundf(f * 256) pour ne pas tronquer.',
  },
  'cpp02-operators': {
    forms: [
      {
        ask: [
          'Comment déclare-t-on la surcharge de << qui affiche un Fixed ?',
          'Pour pouvoir écrire `std::cout << fixed`, on déclare…',
        ],
        right: ['`std::ostream &operator<<(std::ostream &o, Fixed const &f)`'],
        wrong: [
          '`void Fixed::operator<<(std::ostream &o) const`',
          '`std::ostream operator<<(std::ostream o, Fixed f)`',
          '`Fixed &operator<<(std::ostream &o, Fixed const &f)`',
        ],
      },
      {
        ask: [
          'Pourquoi operator<< renvoie-t-il le std::ostream qu’il reçoit ?',
          'Que operator<< renvoie le flux, ça sert à…',
        ],
        right: ['Pour enchaîner : std::cout << a << b', 'Pour pouvoir mettre un autre << derrière'],
        wrong: [
          'Pour que le Fixed puisse changer à l’affichage',
          'Pour savoir combien de caractères ont été écrits',
          "Parce que sinon rien ne s'affiche à l'écran",
        ],
      },
    ],
    wrong: [
      "Parce que la forme canonique l'exige",
      'Pour en faire une méthode const',
      'Pour que ça marche aussi avec printf',
    ],
    why: 'operator<< est une fonction libre qui reçoit le flux par référence et le renvoie, pour que `std::cout << a << b` continue avec le même flux.',
  },
  'cpp02-increment': {
    forms: [
      {
        ask: ['Que renvoie `a++` sur un Fixed ?', 'Le ++ suffixe de Fixed renvoie…'],
        right: ["Une copie avec la valeur d'avant", "La valeur qu'avait a avant l'ajout"],
        wrong: [
          'Une référence vers a, déjà incrémenté',
          "Rien : l'opérateur suffixe est void",
          'La nouvelle valeur, comme ++a',
        ],
      },
      {
        ask: [
          'Comment distingue-t-on à la déclaration le ++ suffixe du préfixe ?',
          'Pour que le compilateur sache lequel est `a++` et lequel `++a`…',
        ],
        right: [
          'Le suffixe prend un paramètre int inutilisé',
          'operator++(int) est le suffixe ; operator++(), le préfixe',
        ],
        wrong: [
          'Le suffixe se déclare hors de la classe',
          'Le préfixe renvoie void et le suffixe, Fixed',
          'On ne les distingue pas : un seul sert pour les deux',
        ],
      },
      {
        ask: [
          'Combien `++a` ajoute-t-il à un Fixed à 8 bits fractionnaires ?',
          'Le plus petit pas que peut faire ce Fixed, c’est…',
        ],
        right: ['0.00390625'],
        wrong: ['1', '0.1', '0.5', '0.0078125'],
      },
    ],
    wrong: ['La même chose que le préfixe', "Un pointeur vers l'objet", 'Une référence constante'],
    why: 'Le préfixe ajoute et renvoie *this par référence ; le suffixe, marqué par un faux int, garde une copie, ajoute et renvoie la copie. Avec 8 bits, un pas vaut 1/256.',
  },
  'cpp03-traps': {
    forms: [
      {
        ask: [
          "Quelle fonction propre ScavTrap ajoute-t-il à ce qu'il hérite de ClapTrap ?",
          'ScavTrap passe en mode gardien avec…',
        ],
        right: ['guardGate()'],
        wrong: ['highFivesGuys()', 'beRepaired()', 'whoAmI()'],
      },
      {
        ask: [
          "Quelle fonction propre FragTrap ajoute-t-il à ce qu'il hérite de ClapTrap ?",
          'FragTrap demande un high five avec…',
        ],
        right: ['highFivesGuys()'],
        wrong: ['guardGate()', 'takeDamage()', 'whoAmI()'],
      },
      {
        ask: [
          'Combien de hit points un ClapTrap a-t-il à sa création ?',
          'Avec combien de points de vie un ClapTrap commence-t-il ?',
        ],
        right: ['10'],
        wrong: ['100', '50', '20'],
      },
    ],
    wrong: ['attack()', 'repair()', '0'],
    why: "ClapTrap commence avec 10 points de vie, 10 d'énergie et 0 d'attaque ; ScavTrap (100, 50, 20) ajoute guardGate() et FragTrap (100, 100, 30), highFivesGuys().",
  },
  'cpp03-order': {
    forms: [
      {
        ask: [
          "À la création d'un ScavTrap, quel constructeur s'exécute en premier ?",
          "Quand on construit un ScavTrap, le premier constructeur qui s'exécute est…",
        ],
        right: ['Celui de ClapTrap, la base', 'Le constructeur de la classe de base'],
        wrong: [
          'Celui de ScavTrap, la fille',
          'Celui déclaré en premier dans le .hpp',
          'Seulement celui de ScavTrap',
        ],
      },
      {
        ask: [
          "À la destruction d'un ScavTrap, quel destructeur s'exécute en premier ?",
          "Quand on détruit un ScavTrap, le premier destructeur qui s'exécute est…",
        ],
        right: ['Celui de ScavTrap, la fille', 'Le destructeur de la classe fille'],
        wrong: [
          'Celui de ClapTrap, la base',
          'Celui déclaré en premier dans le .hpp',
          'Seulement celui de ClapTrap',
        ],
      },
    ],
    wrong: ['Les deux en même temps', 'Ça dépend du compilateur', 'Ça dépend des attributs'],
    why: "On construit de la base vers la fille et on détruit dans l'autre sens : la fille s'appuie sur la base, donc la base naît avant et meurt après.",
  },
  'cpp04-brain': {
    forms: [
      {
        ask: [
          'Quand on copie un Dog, que fait une copie profonde de son Brain ?',
          'Pour que deux Dog ne partagent pas de Brain, à la copie il faut…',
        ],
        right: ['Créer un nouveau Brain avec les mêmes idées', 'Faire new Brain(*other.brain)'],
        wrong: [
          "Copier le pointeur brain de l'autre Dog",
          "Partager le Brain et compter qui l'utilise",
          "Laisser brain à NULL jusqu'à ce qu'on s'en serve",
        ],
      },
      {
        ask: [
          "Combien d'idées un Brain garde-t-il dans CPP 04 ?",
          'Combien de std::string contient le tableau ideas de Brain ?',
        ],
        right: ['100'],
        wrong: ['10', '42', '256', '1000'],
      },
      {
        ask: [
          "Dans operator= de Dog, que faut-il faire avant de copier le Brain de l'autre ?",
          "Avant de prendre le Brain d'un autre Dog, operator= doit…",
        ],
        right: [
          "Vérifier que ce n'est pas le même et supprimer son Brain",
          "Vérifier que this n'est pas &other et libérer son Brain",
        ],
        wrong: [
          'Rien : brain = other.brain suffit',
          "Appeler à la main le destructeur d'Animal",
          'Créer un Dog temporaire avec new et le copier',
        ],
      },
    ],
    wrong: ['Rien de spécial', '8', 'Appeler delete this'],
    why: "Chaque Dog a son propre Brain : la copie fait un new avec les idées de l'autre et, à l'affectation, on libère l'ancien (sauf si c'est le même objet) pour ne pas le perdre.",
  },
  'cpp04-amateria': {
    forms: [
      {
        ask: [
          "En C++98, qu'est-ce qu'une interface comme ICharacter ?",
          "Sans mot interface en C++, une interface s'écrit comme…",
        ],
        right: [
          'Une classe avec seulement des méthodes virtuelles pures',
          'Une classe abstraite sans attributs ni code',
        ],
        wrong: [
          'Une classe dont toutes les méthodes sont statiques',
          'Une struct avec des pointeurs sur fonctions C',
          'Un template qu’on remplit pour chaque type',
        ],
      },
      {
        ask: [
          "Que fait unequip de la materia qu'il retire de l'inventaire ?",
          "Dans l'ex03 de CPP 04, unequip(idx)…",
        ],
        right: ["Il ne la supprime pas : il l'enlève juste", 'Il la lâche sans faire de delete'],
        wrong: [
          'Il la supprime avec delete tout de suite',
          'Il la rend à la MateriaSource',
          "Il la déplace vers l'emplacement libre suivant",
        ],
      },
      {
        ask: [
          "Combien de materias tiennent dans l'inventaire d'un Character ?",
          "Combien d'AMateria une MateriaSource peut-elle apprendre ?",
        ],
        right: ['4'],
        wrong: ['3', '5', '8', '10'],
      },
    ],
    wrong: ['Une classe final', 'Une classe sans constructeur', '2'],
    why: "AMateria est abstraite (clone() = 0) et ICharacter et IMateriaSource sont des interfaces : que des virtuelles pures. L'inventaire a 4 emplacements et unequip ne doit pas supprimer la materia.",
  },
  'cpp05-bureaucrat': {
    forms: [
      {
        ask: [
          "Quelle est la note la plus haute qu'un Bureaucrat peut avoir ?",
          "Dans CPP 05, la meilleure note possible d'un Bureaucrat est…",
        ],
        right: ['1'],
        wrong: ['150', '0', '100', '10'],
      },
      {
        ask: [
          'Que se passe-t-il quand tu crées un Bureaucrat avec la note 0 ?',
          'Créer un Bureaucrat avec une note meilleure que 1…',
        ],
        right: ['Lance Bureaucrat::GradeTooHighException'],
        wrong: [
          'Lance Bureaucrat::GradeTooLowException',
          'Le crée avec la note ramenée à 1',
          'Le crée avec la note 0 sans broncher',
        ],
      },
      {
        ask: [
          'Si un Bureaucrat a la note 3, quelle note a-t-il après incrementGrade() ?',
          'Faire monter en grade un Bureaucrat qui a 3 le laisse à…',
        ],
        right: ['2'],
        wrong: ['4', '3', '13'],
      },
    ],
    wrong: ['Renvoie false', '151', 'Affiche un avertissement et continue'],
    why: 'La note va de 1 (la plus haute) à 150 (la plus basse) : monter en grade soustrait, et dépasser par le haut lance GradeTooHighException.',
  },
  'cpp05-forms': {
    forms: [
      {
        ask: [
          'Quel fichier ShrubberyCreationForm crée-t-il avec la cible « home » ?',
          'Quand ShrubberyCreationForm("home") est exécuté, les arbres vont dans…',
        ],
        right: ['home_shrubbery'],
        wrong: ['shrubbery_home', 'home.shrubbery', 'home_tree'],
      },
      {
        ask: [
          "Quand execute() d'un AForm échoue-t-il ?",
          'Un Bureaucrat ne peut pas exécuter un AForm si…',
        ],
        right: [
          "Il n'est pas signé ou la note ne suffit pas",
          'La signature manque ou la note est trop basse',
        ],
        wrong: [
          'Seulement si le Bureaucrat a la note 150',
          "Jamais : le signer suffit pour l'exécuter",
          "S'il a déjà été exécuté une fois avant",
        ],
      },
      {
        ask: [
          'Que renvoie Intern::makeForm ?',
          'Le stagiaire de CPP 05 remet le formulaire sous forme…',
        ],
        right: ["D'un pointeur vers un nouvel AForm", "D'un AForm* créé avec new"],
        wrong: [
          "D'un AForm par valeur, déjà copié",
          "D'une référence vers le dernier formulaire",
          "Du nom du formulaire qu'il a créé",
        ],
      },
    ],
    wrong: ['home_garden', 'Rien', 'Un nouveau Bureaucrat'],
    why: "AForm vérifie la signature et la note avant d'exécuter ; Shrubbery écrit des arbres ASCII dans <cible>_shrubbery, et Intern crée avec new le formulaire demandé et renvoie le pointeur.",
  },
  'cpp06-scalar': {
    forms: [
      {
        ask: [
          'Que sort ScalarConverter::convert("0") sur la ligne char ?',
          'Avec le littéral 0, la ligne char de ScalarConverter dit…',
        ],
        right: ['char: Non displayable'],
        wrong: ['char: Non printable', 'char: impossible', "char: '0'"],
      },
      {
        ask: [
          'Que sort ScalarConverter::convert("nan") sur la ligne char ?',
          'Avec le littéral nan, la ligne char de ScalarConverter dit…',
        ],
        right: ['char: impossible'],
        wrong: ['char: Non displayable', 'char: nan', "char: 'n'"],
      },
      {
        ask: [
          'Quels pseudo-littéraux float ScalarConverter doit-il comprendre ?',
          'En plus des nombres, ScalarConverter accepte comme float…',
        ],
        right: ['-inff, +inff et nanf'],
        wrong: ['-inf, +inf et nan', 'NaN, Inf et -Inf', 'FLT_MIN, FLT_MAX et 0f'],
      },
    ],
    wrong: ['char: 0', 'char: NULL', 'INFINITY et NAN'],
    why: "convert détecte le type du littéral et le convertit en char, int, float et double : 0 ne s'affiche pas comme char, nan ne tient pas dans un char, et les pseudo-littéraux float finissent par f.",
  },
  'cpp06-serialize': {
    forms: [
      {
        ask: [
          'Quel type renvoie `Serializer::serialize(Data *ptr)` ?',
          "Dans l'ex01 de CPP 06, le pointeur est converti en…",
        ],
        right: ['uintptr_t'],
        wrong: ['unsigned int', 'void *', 'long double'],
      },
      {
        ask: [
          'Que doit donner deserialize(serialize(p)) ?',
          'Après un aller-retour par le Serializer, le pointeur p devient…',
        ],
        right: ['Le même pointeur p', 'Un pointeur égal à p'],
        wrong: [
          'Une nouvelle copie du Data de p',
          'Un pointeur nul si p était valide',
          "Le nombre d'octets de Data",
        ],
      },
      {
        ask: [
          'Sans <typeinfo>, comment identify(Base &p) sait-il si c’est A, B ou C ?',
          'Dans identify par référence, on trouve le vrai type…',
        ],
        right: [
          "En essayant des dynamic_cast de référence et en attrapant l'échec",
          'Avec dynamic_cast<A&>(p) et un catch pour chaque essai',
        ],
        wrong: [
          'Avec typeid(p).name(), en comparant le nom',
          'Avec dynamic_cast<A*>(&p), en regardant si ça donne NULL',
          'En lisant un attribut type que Base remplit',
        ],
      },
    ],
    wrong: ['int', 'Un pointeur vers Base', 'Avec un static_cast vers chaque classe'],
    why: "uintptr_t est un entier assez grand pour un pointeur, et reinterpret_cast fait l'aller-retour sans rien perdre ; identify(Base&) ne peut pas utiliser de pointeurs, donc il essaie des casts de référence, qui lancent une exception en cas d'échec.",
  },
  'cpp07-whatever': {
    forms: [
      {
        ask: [
          "Dans l'ex00 de CPP 07, si a et b sont égaux, que renvoie max(a, b) ?",
          'Avec deux valeurs égales, les templates min et max de CPP 07 renvoient…',
        ],
        right: ['Le second, b', 'Le second argument'],
        wrong: ['Le premier, a', 'Une copie de a', 'Une exception'],
      },
      {
        ask: [
          'Que fait `iter(array, length, f)` dans CPP 07 ?',
          "Le template iter de l'ex01 de CPP 07…",
        ],
        right: [
          'Appelle f avec chaque élément du tableau',
          'Applique f à chaque élément, un par un',
        ],
        wrong: [
          'Renvoie un nouveau tableau avec f appliquée',
          'Appelle f une fois avec le tableau entier',
          'Trie le tableau en se servant de f pour comparer',
        ],
      },
    ],
    wrong: ['Aucun : ça ne compile pas', 'Le plus grand des deux', 'Cherche f dans le tableau'],
    why: 'Le sujet le fixe : avec des valeurs égales, min et max renvoient la seconde ; iter parcourt le tableau et appelle f sur chaque élément.',
  },
  'cpp07-array': {
    forms: [
      {
        ask: [
          "Que crée `Array<int> a(3)` dans l'ex02 de CPP 07 ?",
          'Avec `Array<int> a(3)`, ce qu’il y a dedans, c’est…',
        ],
        right: ['Un tableau de 3 int initialisés par défaut'],
        wrong: [
          'Un tableau vide avec de la place réservée pour 3',
          'Un tableau de 3 int non initialisés, pleins de déchets',
          'Un tableau d’un seul élément, qui vaut 3',
        ],
      },
      {
        ask: [
          "Que fait operator[] d'Array avec un indice hors limites ?",
          'Si tu demandes a[10] à un Array de 3 éléments…',
        ],
        right: ['Il lance une std::exception', 'Il lance une exception'],
        wrong: [
          'Il renvoie le dernier élément',
          "Il agrandit le tableau jusqu'à cet indice",
          'Il renvoie une valeur par défaut',
        ],
      },
    ],
    wrong: ['Rien', 'Un std::vector de 3', 'Il renvoie NULL'],
    why: "Array réserve avec new[] les n éléments initialisés par défaut, se copie en profondeur, et operator[] vérifie l'indice et lance une exception s'il sort des limites.",
  },
  'cpp08-span': {
    forms: [
      {
        ask: [
          "Quel algorithme de la STL easyfind utilise-t-il pour chercher l'entier ?",
          'easyfind trouve la première occurrence avec…',
        ],
        right: ['`std::find`'],
        wrong: ['`std::sort`', '`std::binary_search`', '`std::accumulate`'],
      },
      {
        ask: [
          'Un Span contient 6, 3, 17, 9 et 11. Que donne shortestSpan() ?',
          'Avec 6, 3, 17, 9 et 11 dans un Span, le plus petit écart entre deux est…',
        ],
        right: ['2'],
        wrong: ['3', '14', '1', '6'],
      },
      {
        ask: [
          'Avec le Span déjà plein, que fait addNumber ?',
          'Si tu ajoutes un nombre de trop à un Span de N…',
        ],
        right: ['Il lance une exception', 'Il lance une erreur'],
        wrong: ['Il remplace le plus ancien', 'Il double sa taille', 'Il ignore le nombre'],
      },
    ],
    wrong: ['`std::count`', '`std::merge`', '0'],
    why: "easyfind, c'est std::find sur le conteneur ; Span garde jusqu'à N nombres, lance une exception s'il déborde, et shortestSpan est le plus petit écart entre deux (11 − 9 donne 2).",
  },
  'cpp08-mutantstack': {
    forms: [
      {
        ask: [
          'Où MutantStack prend-il les itérateurs que std::stack ne donne pas ?',
          'MutantStack peut offrir begin() et end() parce que…',
        ],
        right: [
          'Dans le conteneur protégé c de std::stack',
          'Il hérite de std::stack et utilise son membre c',
        ],
        wrong: [
          'Il copie toute la pile dans un std::vector',
          'Il hérite de std::vector au lieu de std::stack',
          'Il parcourt la pile avec top() et pop()',
        ],
      },
      {
        ask: [
          'Sur quel conteneur std::stack est-il construit si tu ne lui en donnes pas d’autre ?',
          'Le conteneur par défaut de std::stack est…',
        ],
        right: ['`std::deque`'],
        wrong: ['`std::vector`', '`std::list`', '`std::queue`'],
      },
    ],
    wrong: ['Avec un pointeur vers top()', '`std::map`', 'Avec friend dans std::stack'],
    why: 'std::stack est un adaptateur avec un membre protégé c (std::deque par défaut) : une classe fille le voit et peut renvoyer c.begin() et c.end().',
  },
  'cpp09-btc': {
    forms: [
      {
        ask: [
          "Si une date de l'entrée n'est pas dans la base, quel taux btc utilise-t-il ?",
          'Dans BitcoinExchange, pour une date absente de data.csv, on utilise…',
        ],
        right: [
          'Celui de la date antérieure la plus proche',
          'Celui de la dernière date avant elle',
        ],
        wrong: [
          'Celui de la date postérieure la plus proche',
          'La moyenne de la date avant et de celle après',
          'Aucun : il affiche une erreur de date',
        ],
      },
      {
        ask: [
          'Que renvoie `lower_bound(date)` dans une std::map ?',
          "Dans une std::map, le lower_bound d'une clé donne…",
        ],
        right: [
          "La première clé qui n'est pas inférieure à date",
          'La première clé supérieure ou égale à celle donnée',
        ],
        wrong: [
          'La dernière clé strictement inférieure',
          'La clé la plus proche, au-dessus ou en dessous',
          'Le nombre de clés inférieures à celle donnée',
        ],
      },
      {
        ask: [
          "Quelle valeur btc accepte-t-il sur chaque ligne de l'entrée ?",
          "Dans l'entrée de btc, la quantité de bitcoins doit être…",
        ],
        right: ['Un nombre entre 0 et 1000', 'Un int ou un float de 0 à 1000'],
        wrong: [
          "N'importe quel float positif, sans limite",
          'Un entier entre 1 et 100',
          'Un nombre entre -1000 et 1000',
        ],
      },
    ],
    wrong: ['Celui de la première date de la base', "N'importe quel nombre", 'La plus grande clé'],
    why: "Les taux vont dans une std::map par date : lower_bound donne la première clé non inférieure et, si ce n'est pas la bonne, on recule d'un cran pour garder la date d'avant.",
  },
  'cpp09-pmergeme': {
    forms: [
      {
        ask: [
          'Quel algorithme de tri PmergeMe demande-t-il ?',
          "L'ex02 de CPP 09 trie les nombres avec…",
        ],
        right: ['Le merge-insertion, celui de Ford-Johnson', "L'algorithme de Ford-Johnson"],
        wrong: [
          'Un quicksort avec un pivot au hasard',
          'Un merge sort classique, de haut en bas',
          'Un heap sort avec std::make_heap',
        ],
      },
      {
        ask: [
          'Combien de conteneurs différents PmergeMe utilise-t-il au minimum ?',
          'Dans combien de conteneurs différents PmergeMe trie-t-il la suite ?',
        ],
        right: ['2'],
        wrong: ['1', '3', '4'],
      },
      {
        ask: [
          'Dans CPP 09, que se passe-t-il avec un conteneur déjà utilisé dans un exercice ?',
          "Dans CPP 09, le conteneur std::map de l'ex00…",
        ],
        right: [
          'Il ne peut plus servir dans le reste du module',
          "Il ne peut plus revenir ni dans l'ex01 ni dans l'ex02",
        ],
        wrong: [
          "Il peut resservir si c'est une autre variable",
          'Il doit aussi servir dans les deux autres',
          "Il ne peut resservir que dans l'ex02",
        ],
      },
    ],
    wrong: ['Un tri à bulles', '5', 'Il peut servir partout'],
    why: 'PmergeMe trie avec Ford-Johnson dans deux conteneurs et compare les temps ; dans CPP 09, chaque conteneur utilisé est grillé pour le reste du module.',
  },
}
