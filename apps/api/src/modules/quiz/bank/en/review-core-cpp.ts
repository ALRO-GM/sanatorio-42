/** Repaso de Not-games en inglés: traducción de `../review-core-cpp.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_CPP_EN: Readonly<Record<string, ReviewEntry>> = {
  'cpp00-std': {
    title: 'std::, cout and endl',
    definition:
      'std is the namespace of the standard library: cout, endl and string live there and are written with std:: in front. In the CPP modules `using namespace` and friend are forbidden (grade -42). std::endl writes a line break and also flushes the buffer.',
    example: 'std::string name = "Ada"; std::cout << "Hello, " << name << std::endl;',
  },
  'cpp00-megaphone': {
    title: 'megaphone (CPP 00, ex00)',
    definition:
      'ex00 of CPP 00 turns each argument into upper case and prints them one after another, adding no spaces. With no arguments it prints «* LOUD AND UNBEARABLE FEEDBACK NOISE *».',
    example: './megaphone "shhh... " hello → SHHH... HELLO',
  },
  'cpp00-phonebook': {
    title: 'PhoneBook (CPP 00, ex01)',
    definition:
      'The PhoneBook holds at most 8 contacts in a fixed array, with no dynamic memory; the ninth replaces the oldest. SEARCH shows them in right-aligned columns of 10 characters (std::setw(10)) and, if a text does not fit, cuts it to 9 and adds a dot.',
    example: '"Alexandrina" → "Alexandri." and "Ada" → "       Ada".',
  },
  'cpp01-zombie': {
    title: 'Stack or heap (CPP 01, ex00)',
    definition:
      'What is created on the stack dies when the function returns, and its destructor is called automatically. What is created with new lives on the heap until its delete, so it can be returned and used later.',
    example: 'randomChump("Bob") creates a local Zombie; Zombie *z = newZombie("Ann"); … delete z;',
  },
  'cpp01-weapon': {
    title: 'Reference or pointer (CPP 01, ex03)',
    definition:
      'HumanA gets its weapon when it is built and always has it: it can keep it as a reference. HumanB can be unarmed, so it keeps a pointer that starts as NULL and is filled by setWeapon. Both see the changes made to the weapon.',
    example: 'class HumanA { Weapon &_weapon; }; class HumanB { Weapon *_weapon; };',
  },
  'cpp01-sed': {
    title: 'Replacing in a file (CPP 01, ex04)',
    definition:
      'The program gets a file, s1 and s2, and writes <file>.replace with every s1 changed into s2. It reads with std::ifstream, writes with std::ofstream and replaces by hand with find and substr: std::string::replace and the C file functions are forbidden.',
    example: './replace notes hello bye → creates notes.replace',
  },
  'cpp01-harl': {
    title: 'Pointers to methods (CPP 01, ex05)',
    definition:
      'Harl picks which complaint to make without a forest of if/else: it keeps the levels in an array of pointers to member functions and calls the right one on the object itself.',
    example:
      'void (Harl::*f[4])() = {&Harl::debug, &Harl::info, &Harl::warning, &Harl::error}; (this->*f[i])();',
  },
  'cpp02-fixed': {
    title: 'Fixed point (CPP 02)',
    definition:
      'Fixed keeps a number with decimals in an int, with 8 bits for the fractional part: the real value is multiplied by 256 (1 << 8). To convert from a float you use roundf, which rounds instead of truncating.',
    example: '1.5 is stored as 384; _raw = roundf(f * (1 << 8));',
  },
  'cpp02-operators': {
    title: 'Operator overloading',
    definition:
      'A class can define what +, ==, < or << do with it. operator<< is written as a free function that takes the std::ostream by reference and returns it, so that several outputs can be chained.',
    example:
      'std::ostream &operator<<(std::ostream &o, Fixed const &f) { return o << f.toFloat(); }',
  },
  'cpp02-increment': {
    title: 'Prefix and postfix ++',
    definition:
      'The prefix one (++a) adds and returns the object itself by reference. The postfix one (a++) is declared with an unused int parameter, keeps a copy, adds and returns the copy, with the value from before.',
    example:
      'Fixed &operator++(); Fixed operator++(int); With 8 bits, ++a adds 1/256 = 0.00390625.',
  },
  'cpp03-traps': {
    title: 'ClapTrap, ScavTrap and FragTrap',
    definition:
      'ClapTrap starts with 10 hit points, 10 energy and 0 attack, and attacking or repairing costs energy. ScavTrap (100, 50, 20) inherits from it and adds guardGate(); FragTrap (100, 100, 30) adds highFivesGuys().',
    example: 'class ScavTrap : public ClapTrap { public: void guardGate(); };',
  },
  'cpp03-order': {
    title: 'Order of construction and destruction',
    definition:
      'When an object of a child class is created, the base is built first and then the child; when it is destroyed, the other way round: first the child and then the base, because the child depends on the base.',
    example:
      'ScavTrap s; → «ClapTrap created», «ScavTrap created»… and on the way out, «ScavTrap destroyed», «ClapTrap destroyed».',
  },
  'cpp04-brain': {
    title: 'Deep copy of Brain (CPP 04)',
    definition:
      'Each Dog and each Cat has its own Brain, with 100 ideas, created with new. Copying them needs a deep copy: a new Brain with the same ideas. In operator=, you first check it is not the same object and free the old Brain.',
    example:
      'Dog &Dog::operator=(Dog const &o) { if (this != &o) { delete _brain; _brain = new Brain(*o._brain); } return *this; }',
  },
  'cpp04-amateria': {
    title: 'Interfaces and AMateria (CPP 04, ex03)',
    definition:
      'In C++98 an interface is a class with only pure virtual methods, such as ICharacter or IMateriaSource. AMateria is abstract (clone() = 0). A Character has 4 inventory slots and unequip does not delete the materia: it only takes it out.',
    example:
      'class ICharacter { public: virtual ~ICharacter() {} virtual void use(int idx, ICharacter &target) = 0; };',
  },
  'cpp05-bureaucrat': {
    title: 'Bureaucrat and its grades (CPP 05)',
    definition:
      'The grade of a Bureaucrat goes from 1 (the highest) to 150 (the lowest). Promoting subtracts one; going past the top throws GradeTooHighException and past the bottom, GradeTooLowException.',
    example:
      'Bureaucrat b("Ana", 3); b.incrementGrade(); // grade 2. Bureaucrat("X", 0) throws GradeTooHighException.',
  },
  'cpp05-forms': {
    title: 'AForm and Intern (CPP 05)',
    definition:
      'AForm is abstract: execute() checks that the form is signed and that the grade of whoever executes it is high enough. ShrubberyCreationForm writes ASCII trees to <target>_shrubbery, and Intern::makeForm creates with new the form it is asked for and returns the pointer.',
    example:
      'AForm *f = intern.makeForm("shrubbery creation", "home"); // executing it creates home_shrubbery',
  },
  'cpp06-scalar': {
    title: 'ScalarConverter (CPP 06)',
    definition:
      'ScalarConverter::convert gets a literal, detects whether it is a char, int, float or double and shows it as all four. If a char cannot be displayed it says «Non displayable»; if the conversion makes no sense, «impossible». It accepts -inff, +inff and nanf for float, and -inf, +inf and nan for double.',
    example: 'convert("nan") → char: impossible, int: impossible, float: nanf, double: nan',
  },
  'cpp06-serialize': {
    title: 'serialize and identify (CPP 06)',
    definition:
      'serialize turns a Data* into a uintptr_t with reinterpret_cast and deserialize turns it back: the same pointer has to come out. identify finds out whether a Base is an A, B or C with dynamic_cast, without <typeinfo>; the reference version cannot use pointers and tries casts that throw when they fail.',
    example: 'try { (void)dynamic_cast<A &>(p); std::cout << "A"; } catch (std::exception &) {}',
  },
  'cpp07-whatever': {
    title: 'swap, min, max and iter (CPP 07)',
    definition:
      'They are function templates that work for any type. min and max return the second argument if both are equal. iter gets an array, its length and a function, and calls it with each element.',
    example: 'template <typename T> T const &max(T const &a, T const &b) { return a > b ? a : b; }',
  },
  'cpp07-array': {
    title: 'The Array template (CPP 07)',
    definition:
      'Array<T> is a class template: Array(n) reserves with new[] n elements initialised by default, the copy is deep, size() says how many there are and operator[] throws a std::exception if the index is out of range.',
    example: 'Array<int> a(3); a[0] = 42; a[5]; // throws',
  },
  'cpp08-span': {
    title: 'easyfind and Span (CPP 08)',
    definition:
      'easyfind looks for an integer in a container with std::find. Span holds up to N numbers: addNumber throws if it is already full, and shortestSpan and longestSpan give the smallest and the largest distance between two of them.',
    example: 'With 6, 3, 17, 9 and 11: shortestSpan() = 2 and longestSpan() = 14.',
  },
  'cpp08-mutantstack': {
    title: 'MutantStack (CPP 08)',
    definition:
      'std::stack is an adaptor over another container (std::deque unless you say otherwise), kept in a protected member c. MutantStack inherits from std::stack and offers iterators by returning those of c.',
    example:
      'typedef typename std::stack<T>::container_type::iterator iterator; iterator begin() { return this->c.begin(); }',
  },
  'cpp09-btc': {
    title: 'BitcoinExchange (CPP 09, ex00)',
    definition:
      'btc reads a database of rates by date and an input of «date | value» lines, with values from 0 to 1000. The rates go in a std::map; if the date is not there, the closest earlier one is used: lower_bound gives the first one not less than it and, if it does not match, you step back one.',
    example:
      'std::map<std::string, float>::iterator it = rates.lower_bound(date); if (it->first != date) --it;',
  },
  'cpp09-pmergeme': {
    title: 'PmergeMe and Ford-Johnson (CPP 09)',
    definition:
      'PmergeMe sorts positive integers with merge-insertion (the Ford-Johnson algorithm) in two different containers and compares how long each one takes. In CPP 09 a container used in one exercise cannot be used in the rest of the module.',
    example:
      './PmergeMe 3 5 9 7 4 → Before: 3 5 9 7 4 / After: 3 4 5 7 9, with the time of std::vector and of std::deque.',
  },
  'py-floor-div': {
    title: 'Integer division in Python',
    definition:
      'In Python 3, / always gives a float and // divides rounding down, towards minus infinity. With negative numbers it is not like C, which truncates towards zero.',
    example: '7 / 2 → 3.5; 7 // 2 → 3; -7 // 2 → -4',
  },
  'py-args-kwargs': {
    title: '*args and **kwargs',
    definition:
      'In the definition of a function, *args gathers the extra positional arguments in a tuple and **kwargs gathers the ones passed by name in a dictionary.',
    example: "def f(*args, **kwargs): print(args, kwargs); f(1, 2, x=3) → (1, 2) {'x': 3}",
  },
  'py-with': {
    title: 'with and files',
    definition:
      'with opens a resource and guarantees that it is closed when the block ends, also if an exception is raised: at the end it calls __exit__, which for a file does close().',
    example: 'with open("data.txt") as f: text = f.read()  # here f is already closed',
  },
}
