/** Repaso de Not-games: lo nuevo de C++, Python y git. */

import type { ReviewEntry } from './types.js'

export const REVIEW_CORE_CPP: Record<string, ReviewEntry> = {
  'cpp00-std': {
    title: 'std::, cout y endl',
    definition:
      'std es el espacio de nombres de la biblioteca estándar: cout, endl o string viven ahí y se escriben con std:: delante. En los CPP `using namespace` y friend están prohibidos (nota -42). std::endl escribe un salto de línea y además vacía el búfer.',
    example: 'std::string nombre = "Ada"; std::cout << "Hola, " << nombre << std::endl;',
  },
  'cpp00-megaphone': {
    title: 'megaphone (CPP 00, ex00)',
    definition:
      'El ex00 de CPP 00 pasa a mayúsculas cada argumento y los imprime seguidos, sin añadir espacios. Sin argumentos imprime «* LOUD AND UNBEARABLE FEEDBACK NOISE *».',
    example: './megaphone "shhh... " hola → SHHH... HOLA',
  },
  'cpp00-phonebook': {
    title: 'PhoneBook (CPP 00, ex01)',
    definition:
      'El PhoneBook guarda como mucho 8 contactos en un array fijo, sin memoria dinámica; el noveno sustituye al más antiguo. SEARCH los enseña en columnas de 10 caracteres alineadas a la derecha (std::setw(10)) y, si un texto no cabe, lo corta a 9 y pone un punto.',
    example: '"Alexandrina" → "Alexandri." y "Ada" → "       Ada".',
  },
  'cpp01-zombie': {
    title: 'Pila o montón (CPP 01, ex00)',
    definition:
      'Lo que se crea en la pila muere al salir de la función, y su destructor se llama solo. Lo que se crea con new vive en el montón hasta su delete, así que sirve para devolverlo y usarlo después.',
    example: 'randomChump("Bob") crea un Zombie local; Zombie *z = newZombie("Ann"); … delete z;',
  },
  'cpp01-weapon': {
    title: 'Referencia o puntero (CPP 01, ex03)',
    definition:
      'HumanA recibe el arma al construirse y la tiene siempre: puede guardarla como referencia. HumanB puede estar sin arma, así que guarda un puntero que empieza a NULL y se rellena con setWeapon. Los dos ven los cambios del arma.',
    example: 'class HumanA { Weapon &_weapon; }; class HumanB { Weapon *_weapon; };',
  },
  'cpp01-sed': {
    title: 'Sustituir en un fichero (CPP 01, ex04)',
    definition:
      'El programa recibe un fichero, s1 y s2, y escribe <fichero>.replace con cada s1 cambiado por s2. Se lee con std::ifstream, se escribe con std::ofstream y se sustituye a mano con find y substr: std::string::replace y las funciones de ficheros de C están prohibidas.',
    example: './replace notas hola adiós → crea notas.replace',
  },
  'cpp01-harl': {
    title: 'Punteros a métodos (CPP 01, ex05)',
    definition:
      'Harl elige qué queja soltar sin un bosque de if/else: guarda los niveles en un array de punteros a funciones miembro y llama al que toca sobre el propio objeto.',
    example:
      'void (Harl::*f[4])() = {&Harl::debug, &Harl::info, &Harl::warning, &Harl::error}; (this->*f[i])();',
  },
  'cpp02-fixed': {
    title: 'Punto fijo (CPP 02)',
    definition:
      'Fixed guarda un número con decimales en un int, con 8 bits para la parte fraccionaria: el valor real se multiplica por 256 (1 << 8). Para pasar de float se usa roundf, que redondea en lugar de truncar.',
    example: '1.5 se guarda como 384; _raw = roundf(f * (1 << 8));',
  },
  'cpp02-operators': {
    title: 'Sobrecarga de operadores',
    definition:
      'Una clase puede definir qué hacen +, ==, < o << con ella. operator<< se escribe como función libre que recibe el std::ostream por referencia y lo devuelve, para poder encadenar varias salidas.',
    example:
      'std::ostream &operator<<(std::ostream &o, Fixed const &f) { return o << f.toFloat(); }',
  },
  'cpp02-increment': {
    title: '++ prefijo y sufijo',
    definition:
      'El prefijo (++a) suma y devuelve el propio objeto por referencia. El sufijo (a++) se declara con un parámetro int que no se usa, guarda una copia, suma y devuelve la copia, con el valor de antes.',
    example: 'Fixed &operator++(); Fixed operator++(int); Con 8 bits, ++a suma 1/256 = 0.00390625.',
  },
  'cpp03-traps': {
    title: 'ClapTrap, ScavTrap y FragTrap',
    definition:
      'ClapTrap empieza con 10 de vida, 10 de energía y 0 de ataque, y atacar o repararse gasta energía. ScavTrap (100, 50, 20) hereda de él y añade guardGate(); FragTrap (100, 100, 30) añade highFivesGuys().',
    example: 'class ScavTrap : public ClapTrap { public: void guardGate(); };',
  },
  'cpp03-order': {
    title: 'Orden de construcción y destrucción',
    definition:
      'Al crear un objeto de una clase hija se construye primero la base y luego la hija; al destruirlo, al revés: primero la hija y luego la base, porque la hija depende de la base.',
    example:
      'ScavTrap s; → «ClapTrap creado», «ScavTrap creado»… y al salir, «ScavTrap destruido», «ClapTrap destruido».',
  },
  'cpp04-brain': {
    title: 'Copia profunda de Brain (CPP 04)',
    definition:
      'Cada Dog y cada Cat tienen su propio Brain, con 100 ideas, creado con new. Copiarlos exige una copia profunda: un Brain nuevo con las mismas ideas. En operator=, antes, se comprueba que no es el mismo objeto y se libera el Brain viejo.',
    example:
      'Dog &Dog::operator=(Dog const &o) { if (this != &o) { delete _brain; _brain = new Brain(*o._brain); } return *this; }',
  },
  'cpp04-amateria': {
    title: 'Interfaces y AMateria (CPP 04, ex03)',
    definition:
      'En C++98 una interfaz es una clase con solo métodos virtuales puros, como ICharacter o IMateriaSource. AMateria es abstracta (clone() = 0). Un Character tiene 4 huecos en el inventario y unequip no borra la materia: solo la saca.',
    example:
      'class ICharacter { public: virtual ~ICharacter() {} virtual void use(int idx, ICharacter &target) = 0; };',
  },
  'cpp05-bureaucrat': {
    title: 'Bureaucrat y sus notas (CPP 05)',
    definition:
      'La nota de un Bureaucrat va de 1 (la más alta) a 150 (la más baja). Subir de nota resta uno; salirse por arriba lanza GradeTooHighException y por abajo, GradeTooLowException.',
    example:
      'Bureaucrat b("Ana", 3); b.incrementGrade(); // nota 2. Bureaucrat("X", 0) lanza GradeTooHighException.',
  },
  'cpp05-forms': {
    title: 'AForm e Intern (CPP 05)',
    definition:
      'AForm es abstracta: execute() comprueba que el formulario está firmado y que la nota de quien lo ejecuta llega. ShrubberyCreationForm escribe árboles ASCII en <objetivo>_shrubbery, y Intern::makeForm crea con new el formulario que le piden y devuelve el puntero.',
    example:
      'AForm *f = intern.makeForm("shrubbery creation", "home"); // al ejecutarlo crea home_shrubbery',
  },
  'cpp06-scalar': {
    title: 'ScalarConverter (CPP 06)',
    definition:
      'ScalarConverter::convert recibe un literal, detecta si es char, int, float o double y lo enseña en los cuatro. Si un char no se puede ver dice «Non displayable»; si la conversión no tiene sentido, «impossible». Acepta -inff, +inff y nanf para float, y -inf, +inf y nan para double.',
    example: 'convert("nan") → char: impossible, int: impossible, float: nanf, double: nan',
  },
  'cpp06-serialize': {
    title: 'serialize e identify (CPP 06)',
    definition:
      'serialize convierte un Data* en uintptr_t con reinterpret_cast y deserialize lo devuelve: tiene que salir el mismo puntero. identify averigua si una Base es A, B o C con dynamic_cast, sin <typeinfo>; la versión con referencia no puede usar punteros y prueba casts que lanzan si fallan.',
    example: 'try { (void)dynamic_cast<A &>(p); std::cout << "A"; } catch (std::exception &) {}',
  },
  'cpp07-whatever': {
    title: 'swap, min, max e iter (CPP 07)',
    definition:
      'Son plantillas de función que valen para cualquier tipo. min y max devuelven el segundo argumento si los dos son iguales. iter recibe un array, su longitud y una función, y la llama con cada elemento.',
    example: 'template <typename T> T const &max(T const &a, T const &b) { return a > b ? a : b; }',
  },
  'cpp07-array': {
    title: 'La plantilla Array (CPP 07)',
    definition:
      'Array<T> es una plantilla de clase: Array(n) reserva con new[] n elementos inicializados por defecto, la copia es profunda, size() dice cuántos hay y operator[] lanza una std::exception si el índice se sale.',
    example: 'Array<int> a(3); a[0] = 42; a[5]; // lanza',
  },
  'cpp08-span': {
    title: 'easyfind y Span (CPP 08)',
    definition:
      'easyfind busca un entero en un contenedor con std::find. Span guarda hasta N números: addNumber lanza si ya está lleno, y shortestSpan y longestSpan dan la menor y la mayor distancia entre dos de ellos.',
    example: 'Con 6, 3, 17, 9 y 11: shortestSpan() = 2 y longestSpan() = 14.',
  },
  'cpp08-mutantstack': {
    title: 'MutantStack (CPP 08)',
    definition:
      'std::stack es un adaptador sobre otro contenedor (std::deque si no se dice otro), guardado en un miembro protegido c. MutantStack hereda de std::stack y da iteradores devolviendo los de c.',
    example:
      'typedef typename std::stack<T>::container_type::iterator iterator; iterator begin() { return this->c.begin(); }',
  },
  'cpp09-btc': {
    title: 'BitcoinExchange (CPP 09, ex00)',
    definition:
      'btc lee una base de tasas por fecha y una entrada «fecha | valor», con valores de 0 a 1000. Las tasas van en un std::map; si la fecha no está, se usa la anterior más cercana: lower_bound da la primera no menor y, si no coincide, se retrocede una.',
    example:
      'std::map<std::string, float>::iterator it = rates.lower_bound(date); if (it->first != date) --it;',
  },
  'cpp09-pmergeme': {
    title: 'PmergeMe y Ford-Johnson (CPP 09)',
    definition:
      'PmergeMe ordena enteros positivos con merge-insertion (el algoritmo de Ford-Johnson) en dos contenedores distintos y compara cuánto tarda cada uno. En CPP 09 un contenedor usado en un ejercicio ya no se puede usar en el resto del módulo.',
    example:
      './PmergeMe 3 5 9 7 4 → Before: 3 5 9 7 4 / After: 3 4 5 7 9, con el tiempo de std::vector y de std::deque.',
  },
  'py-floor-div': {
    title: 'División entera en Python',
    definition:
      'En Python 3, / siempre da un float y // divide redondeando hacia abajo, hacia menos infinito. Con negativos no es como en C, que trunca hacia cero.',
    example: '7 / 2 → 3.5; 7 // 2 → 3; -7 // 2 → -4',
  },
  'py-args-kwargs': {
    title: '*args y **kwargs',
    definition:
      'En la definición de una función, *args recoge en una tupla los argumentos posicionales que sobran y **kwargs recoge en un diccionario los que se pasan con nombre.',
    example: "def f(*args, **kwargs): print(args, kwargs); f(1, 2, x=3) → (1, 2) {'x': 3}",
  },
  'py-with': {
    title: 'with y los ficheros',
    definition:
      'with abre un recurso y garantiza que se cierra al salir del bloque, también si salta una excepción: al terminar llama a __exit__, que en un fichero hace close().',
    example: 'with open("datos.txt") as f: texto = f.read()  # aquí f ya está cerrado',
  },
}
