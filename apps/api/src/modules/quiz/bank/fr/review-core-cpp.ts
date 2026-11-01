/** Repaso de Not-games en francés: traducción de `../review-core-cpp.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_CPP_FR: Readonly<Record<string, ReviewEntry>> = {
  'cpp00-std': {
    title: 'std::, cout et endl',
    definition:
      "std est l'espace de noms de la bibliothèque standard : cout, endl ou string y vivent et s'écrivent avec std:: devant. Dans les CPP, `using namespace` et friend sont interdits (note -42). std::endl écrit un saut de ligne et vide en plus le tampon.",
    example: 'std::string nom = "Ada"; std::cout << "Salut, " << nom << std::endl;',
  },
  'cpp00-megaphone': {
    title: 'megaphone (CPP 00, ex00)',
    definition:
      "L'ex00 de CPP 00 met chaque argument en majuscules et les affiche à la suite, sans ajouter d'espace. Sans argument, il affiche « * LOUD AND UNBEARABLE FEEDBACK NOISE * ».",
    example: './megaphone "chut... " salut → CHUT... SALUT',
  },
  'cpp00-phonebook': {
    title: 'PhoneBook (CPP 00, ex01)',
    definition:
      'Le PhoneBook garde au maximum 8 contacts dans un tableau fixe, sans mémoire dynamique ; le neuvième remplace le plus ancien. SEARCH les affiche en colonnes de 10 caractères alignées à droite (std::setw(10)) et, si un texte ne tient pas, le coupe à 9 et ajoute un point.',
    example: '"Alexandrina" → "Alexandri." et "Ada" → "       Ada".',
  },
  'cpp01-zombie': {
    title: 'Pile ou tas (CPP 01, ex00)',
    definition:
      "Ce qui est créé sur la pile meurt à la fin de la fonction, et son destructeur est appelé tout seul. Ce qui est créé avec new vit sur le tas jusqu'à son delete : on peut donc le renvoyer et s'en servir après.",
    example: 'randomChump("Bob") crée un Zombie local ; Zombie *z = newZombie("Ann"); … delete z;',
  },
  'cpp01-weapon': {
    title: 'Référence ou pointeur (CPP 01, ex03)',
    definition:
      "HumanA reçoit son arme à la construction et l'a toujours : il peut la garder par référence. HumanB peut être désarmé, donc il garde un pointeur qui part de NULL et que setWeapon remplit. Les deux voient les changements de l'arme.",
    example: 'class HumanA { Weapon &_weapon; }; class HumanB { Weapon *_weapon; };',
  },
  'cpp01-sed': {
    title: 'Remplacer dans un fichier (CPP 01, ex04)',
    definition:
      'Le programme reçoit un fichier, s1 et s2, et écrit <fichier>.replace avec chaque s1 remplacé par s2. On lit avec std::ifstream, on écrit avec std::ofstream et on remplace à la main avec find et substr : std::string::replace et les fonctions de fichiers du C sont interdites.',
    example: './replace notes salut ciao → crée notes.replace',
  },
  'cpp01-harl': {
    title: 'Pointeurs sur méthodes (CPP 01, ex05)',
    definition:
      "Harl choisit quelle plainte lancer sans forêt de if/else : il range les niveaux dans un tableau de pointeurs sur fonctions membres et appelle le bon sur l'objet lui-même.",
    example:
      'void (Harl::*f[4])() = {&Harl::debug, &Harl::info, &Harl::warning, &Harl::error}; (this->*f[i])();',
  },
  'cpp02-fixed': {
    title: 'Virgule fixe (CPP 02)',
    definition:
      'Fixed garde un nombre à virgule dans un int, avec 8 bits pour la partie fractionnaire : la vraie valeur est multipliée par 256 (1 << 8). Pour convertir un float, on utilise roundf, qui arrondit au lieu de tronquer.',
    example: '1.5 est stocké comme 384 ; _raw = roundf(f * (1 << 8));',
  },
  'cpp02-operators': {
    title: 'Surcharge des opérateurs',
    definition:
      "Une classe peut définir ce que font +, ==, < ou << avec elle. operator<< s'écrit comme une fonction libre qui reçoit le std::ostream par référence et le renvoie, pour pouvoir enchaîner plusieurs sorties.",
    example:
      'std::ostream &operator<<(std::ostream &o, Fixed const &f) { return o << f.toFloat(); }',
  },
  'cpp02-increment': {
    title: '++ préfixe et suffixe',
    definition:
      "Le préfixe (++a) ajoute et renvoie l'objet lui-même par référence. Le suffixe (a++) se déclare avec un paramètre int inutilisé, garde une copie, ajoute et renvoie la copie, avec la valeur d'avant.",
    example:
      'Fixed &operator++(); Fixed operator++(int); Avec 8 bits, ++a ajoute 1/256 = 0.00390625.',
  },
  'cpp03-traps': {
    title: 'ClapTrap, ScavTrap et FragTrap',
    definition:
      "ClapTrap commence avec 10 points de vie, 10 d'énergie et 0 d'attaque, et attaquer ou se réparer coûte de l'énergie. ScavTrap (100, 50, 20) en hérite et ajoute guardGate() ; FragTrap (100, 100, 30) ajoute highFivesGuys().",
    example: 'class ScavTrap : public ClapTrap { public: void guardGate(); };',
  },
  'cpp03-order': {
    title: 'Ordre de construction et de destruction',
    definition:
      "Quand on crée un objet d'une classe fille, on construit d'abord la base puis la fille ; à la destruction, c'est l'inverse : d'abord la fille, puis la base, parce que la fille dépend de la base.",
    example:
      'ScavTrap s; → « ClapTrap créé », « ScavTrap créé »… et à la sortie, « ScavTrap détruit », « ClapTrap détruit ».',
  },
  'cpp04-brain': {
    title: 'Copie profonde de Brain (CPP 04)',
    definition:
      "Chaque Dog et chaque Cat a son propre Brain, avec 100 idées, créé avec new. Les copier demande une copie profonde : un nouveau Brain avec les mêmes idées. Dans operator=, on vérifie d'abord que ce n'est pas le même objet et on libère l'ancien Brain.",
    example:
      'Dog &Dog::operator=(Dog const &o) { if (this != &o) { delete _brain; _brain = new Brain(*o._brain); } return *this; }',
  },
  'cpp04-amateria': {
    title: 'Interfaces et AMateria (CPP 04, ex03)',
    definition:
      "En C++98, une interface est une classe qui n'a que des méthodes virtuelles pures, comme ICharacter ou IMateriaSource. AMateria est abstraite (clone() = 0). Un Character a 4 emplacements d'inventaire et unequip ne supprime pas la materia : il la retire seulement.",
    example:
      'class ICharacter { public: virtual ~ICharacter() {} virtual void use(int idx, ICharacter &target) = 0; };',
  },
  'cpp05-bureaucrat': {
    title: 'Bureaucrat et ses notes (CPP 05)',
    definition:
      "La note d'un Bureaucrat va de 1 (la plus haute) à 150 (la plus basse). Monter en grade retire un ; sortir par le haut lance GradeTooHighException, et par le bas, GradeTooLowException.",
    example:
      'Bureaucrat b("Ana", 3); b.incrementGrade(); // note 2. Bureaucrat("X", 0) lance GradeTooHighException.',
  },
  'cpp05-forms': {
    title: 'AForm et Intern (CPP 05)',
    definition:
      "AForm est abstraite : execute() vérifie que le formulaire est signé et que la note de celui qui l'exécute suffit. ShrubberyCreationForm écrit des arbres ASCII dans <cible>_shrubbery, et Intern::makeForm crée avec new le formulaire demandé et renvoie le pointeur.",
    example:
      'AForm *f = intern.makeForm("shrubbery creation", "home"); // son exécution crée home_shrubbery',
  },
  'cpp06-scalar': {
    title: 'ScalarConverter (CPP 06)',
    definition:
      "ScalarConverter::convert reçoit un littéral, détecte s'il est char, int, float ou double et l'affiche sous les quatre formes. Si un char ne s'affiche pas, il écrit « Non displayable » ; si la conversion n'a pas de sens, « impossible ». Il accepte -inff, +inff et nanf pour float, et -inf, +inf et nan pour double.",
    example: 'convert("nan") → char: impossible, int: impossible, float: nanf, double: nan',
  },
  'cpp06-serialize': {
    title: 'serialize et identify (CPP 06)',
    definition:
      "serialize convertit un Data* en uintptr_t avec reinterpret_cast et deserialize fait le chemin inverse : on doit retrouver le même pointeur. identify devine si une Base est un A, un B ou un C avec dynamic_cast, sans <typeinfo> ; la version par référence ne peut pas utiliser de pointeurs et essaie des casts qui lancent une exception en cas d'échec.",
    example: 'try { (void)dynamic_cast<A &>(p); std::cout << "A"; } catch (std::exception &) {}',
  },
  'cpp07-whatever': {
    title: 'swap, min, max et iter (CPP 07)',
    definition:
      "Ce sont des templates de fonction qui marchent pour n'importe quel type. min et max renvoient le second argument si les deux sont égaux. iter reçoit un tableau, sa longueur et une fonction, et l'appelle sur chaque élément.",
    example: 'template <typename T> T const &max(T const &a, T const &b) { return a > b ? a : b; }',
  },
  'cpp07-array': {
    title: 'Le template Array (CPP 07)',
    definition:
      "Array<T> est un template de classe : Array(n) réserve avec new[] n éléments initialisés par défaut, la copie est profonde, size() donne leur nombre et operator[] lance une std::exception si l'indice sort des limites.",
    example: 'Array<int> a(3); a[0] = 42; a[5]; // lance une exception',
  },
  'cpp08-span': {
    title: 'easyfind et Span (CPP 08)',
    definition:
      "easyfind cherche un entier dans un conteneur avec std::find. Span garde jusqu'à N nombres : addNumber lance une exception s'il est déjà plein, et shortestSpan et longestSpan donnent le plus petit et le plus grand écart entre deux d'entre eux.",
    example: 'Avec 6, 3, 17, 9 et 11 : shortestSpan() = 2 et longestSpan() = 14.',
  },
  'cpp08-mutantstack': {
    title: 'MutantStack (CPP 08)',
    definition:
      "std::stack est un adaptateur posé sur un autre conteneur (std::deque si on n'en précise pas d'autre), rangé dans un membre protégé c. MutantStack hérite de std::stack et donne des itérateurs en renvoyant ceux de c.",
    example:
      'typedef typename std::stack<T>::container_type::iterator iterator; iterator begin() { return this->c.begin(); }',
  },
  'cpp09-btc': {
    title: 'BitcoinExchange (CPP 09, ex00)',
    definition:
      "btc lit une base de taux par date et une entrée « date | valeur », avec des valeurs de 0 à 1000. Les taux vont dans une std::map ; si la date n'y est pas, on prend la plus proche avant : lower_bound donne la première clé non inférieure et, si ce n'est pas la bonne, on recule d'un cran.",
    example:
      'std::map<std::string, float>::iterator it = rates.lower_bound(date); if (it->first != date) --it;',
  },
  'cpp09-pmergeme': {
    title: 'PmergeMe et Ford-Johnson (CPP 09)',
    definition:
      "PmergeMe trie des entiers positifs avec le merge-insertion (l'algorithme de Ford-Johnson) dans deux conteneurs différents et compare le temps de chacun. Dans CPP 09, un conteneur utilisé dans un exercice ne peut plus servir dans le reste du module.",
    example:
      './PmergeMe 3 5 9 7 4 → Before: 3 5 9 7 4 / After: 3 4 5 7 9, avec le temps de std::vector et de std::deque.',
  },
  'py-floor-div': {
    title: 'Division entière en Python',
    definition:
      "En Python 3, / donne toujours un float et // divise en arrondissant vers le bas, vers moins l'infini. Avec des nombres négatifs, ce n'est pas comme en C, qui tronque vers zéro.",
    example: '7 / 2 → 3.5 ; 7 // 2 → 3 ; -7 // 2 → -4',
  },
  'py-args-kwargs': {
    title: '*args et **kwargs',
    definition:
      "Dans la définition d'une fonction, *args rassemble dans un tuple les arguments positionnels en trop, et **kwargs rassemble dans un dictionnaire ceux qu'on passe avec un nom.",
    example: "def f(*args, **kwargs): print(args, kwargs); f(1, 2, x=3) → (1, 2) {'x': 3}",
  },
  'py-with': {
    title: 'with et les fichiers',
    definition:
      "with ouvre une ressource et garantit qu'elle est fermée à la sortie du bloc, même si une exception est levée : à la fin, il appelle __exit__, qui fait close() sur un fichier.",
    example: 'with open("donnees.txt") as f: texte = f.read()  # ici, f est déjà fermé',
  },
}
