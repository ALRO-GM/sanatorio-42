/** Banco de Not-games en inglés: C++ (`../cpp.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const CPP_EN: Readonly<Record<string, ConceptText>> = {
  'cpp-class-struct': {
    forms: [
      {
        ask: [
          'In C++, what is the difference between `class` and `struct`?',
          'What is the only thing that changes between class and struct?',
        ],
        right: [
          'What is private or public by default changes',
          'In a class everything is private by default, and in a struct, public',
        ],
      },
    ],
    wrong: [
      'A struct cannot have methods, only attributes',
      'A class goes on the heap and a struct on the stack',
      'A struct allows no inheritance or virtual methods',
      'Nothing: in C++ they are identical in everything',
    ],
    why: 'In C++ a struct is a class with everything public by default; it can have methods, inheritance and everything else.',
  },
  'cpp-reference': {
    forms: [
      {
        ask: [
          'What is the difference between a reference and a pointer?',
          'What is different about a reference compared with a pointer?',
        ],
        right: [
          'It cannot be null or change what it refers to',
          'It always refers to the same thing and cannot be NULL',
        ],
      },
    ],
    wrong: [
      'It takes more memory than an ordinary pointer',
      'It only works for basic types, such as int',
      'It can be reassigned to name another variable',
      'It is slower, because it is copied on every use',
    ],
    why: 'A reference is another name for something that already exists: it is always initialised and never reassigned.',
  },
  'cpp-const-method': {
    forms: [
      {
        ask: [
          'What does the `const` at the end of `int getValue() const;` mean?',
          'What does a method marked const at the end promise?',
        ],
        right: [
          'That the method does not change the object',
          'That it does not modify the attributes',
        ],
      },
    ],
    wrong: [
      'That it returns a constant value',
      'That it can only be called once per object',
      'That it is static and gets no this',
      'That it cannot be overridden in a child',
    ],
    why: 'That way it can be called on const objects, and the compiler stops you from touching the attributes inside.',
  },
  'cpp-new-delete': {
    forms: [
      {
        ask: [
          'What is wrong here?',
          'What is wrong with freeing what was created with `new Zombie[10]` like this?',
        ],
        right: [
          'It must be freed with delete[], not with delete',
          'What is created with new[] is freed with delete[]',
        ],
      },
    ],
    wrong: [
      'Nothing: delete frees the whole array',
      'It has to be freed with free(horde)',
      'You have to delete them one by one with delete',
      'new cannot create arrays of objects',
    ],
    why: 'What is created with new[] is freed with delete[], which calls the destructor of every element; plain delete is undefined behaviour.',
  },
  'cpp-canonical': {
    forms: [
      {
        ask: [
          'Which four things make up the orthodox canonical form of a class?',
          "What does Coplien's canonical form ask for?",
        ],
        right: ['Default constructor, copy constructor, assignment operator and destructor'],
        wrong: [
          'Constructor, destructor, a getter and a setter for each attribute',
          'Constructor, operator==, operator<< and a virtual destructor',
          'Default constructor, move constructor, swap and destructor',
        ],
      },
      {
        ask: ['When is the copy constructor called?'],
        right: ['When a new object is created from another one'],
        wrong: [
          'When an object is assigned to another that already exists',
          'When an object that had been copied is destroyed',
          'When an object is passed by reference',
        ],
      },
      {
        ask: ['In `A b = a;`, what runs?'],
        right: ['The copy constructor'],
        wrong: [
          'The assignment operator',
          'The default constructor and then operator=',
          'The destructor of a',
        ],
      },
    ],
    wrong: [
      'Constructor, destructor, getter and setter',
      'Constructor, operator==, operator<< and destructor',
      'Constructor and destructor, nothing else',
    ],
    why: 'Copying on creation is the copy constructor; assigning to one that already exists, operator=.',
  },
  'cpp-shallow-copy': {
    code: 'class Brain { public: std::string *ideas; ... };\n\nBrain::Brain() { ideas = new std::string[100]; }\nBrain::~Brain() { delete[] ideas; }\n// No copy constructor and no operator=\n\nBrain a;\nBrain b = a;',
    forms: [
      {
        ask: ['What happens when the program ends?', 'When a and b are destroyed, what happens?'],
        right: [
          'Double delete: the default copy copies the pointer',
          'The same array of ideas is freed twice',
        ],
      },
    ],
    wrong: [
      'Nothing: the default copy duplicates the array',
      'There is a memory leak, but nothing worse',
      'It does not compile: the copy constructor is missing',
      'Only one destructor is called, the one of a',
    ],
    why: 'The default copy copies the pointer, not what it points to: you have to write a deep copy.',
  },
  'cpp-virtual': {
    code: 'class Animal { public: void makeSound() const { std::cout << "..."; } };\nclass Dog : public Animal { public: void makeSound() const { std::cout << "Woof"; } };\n\nAnimal *a = new Dog();\na->makeSound();',
    forms: [
      {
        ask: ['What does it print?', 'What comes out on the screen?'],
        right: ['...'],
        wrong: ['Woof', 'Woof...', 'Nothing'],
      },
      {
        ask: [
          'What has to change so that it prints «Woof»?',
          'For a->makeSound() to say «Woof», what is needed?',
        ],
        right: [
          'Declare makeSound as virtual in Animal',
          'Put virtual on the method of the base class',
        ],
        wrong: [
          'Declare it virtual only in Dog, not in Animal',
          'Declare makeSound as static in both classes',
          'Change public to protected in the inheritance',
        ],
      },
    ],
    wrong: ['Woof', 'Woof...', 'Nothing'],
    why: 'Without virtual it is called according to the pointer type (Animal); with virtual, according to the real object (Dog).',
  },
  'cpp-virtual-destructor': {
    forms: [
      {
        ask: ['Why should the destructor of a base class be virtual?'],
        right: ['So that delete through the base also destroys the child'],
        wrong: [
          'So that the destructor runs faster',
          'To be able to copy objects of the class',
          'Because if it is not virtual, it does not compile',
          'So that the class becomes abstract',
        ],
      },
      {
        ask: [
          'Without a virtual destructor, what does `delete animal` do if animal points to a Dog?',
        ],
        right: ['It only calls the destructor of Animal'],
        wrong: [
          'It calls both destructors, as always',
          'It does not compile: the virtual destructor is missing',
          'It only calls the destructor of Dog',
        ],
      },
    ],
    wrong: [
      'So that it is faster',
      'To be able to copy the class',
      'Because otherwise it does not compile',
    ],
    why: 'Without virtual, delete only sees the pointer type: the child part is not destroyed (strictly speaking, it is undefined behaviour).',
  },
  'cpp-abstract': {
    forms: [
      {
        ask: ['What makes a class abstract in C++?', 'When is a C++ class abstract?'],
        right: ['Having at least one pure virtual method'],
        wrong: [
          'Having the word abstract before class',
          'Having no public constructor at all',
          'Having all its attributes private',
          'Some method always returning 0',
        ],
      },
      {
        ask: ['What does `virtual void makeSound() const = 0;` achieve in a class?'],
        right: ['That no objects of that class can be created'],
        wrong: [
          'That makeSound always returns 0',
          'That makeSound cannot be redefined in the children',
          'That nobody can inherit from that class',
        ],
      },
    ],
    wrong: ['Having the word abstract', 'Having no constructor', 'Having everything private'],
    why: '= 0 is a pure virtual method: the class cannot be instantiated and the children must implement it.',
  },
  'cpp-diamond': {
    forms: [
      {
        ask: [
          'DiamondTrap inherits from ScavTrap and FragTrap, which both inherit from ClapTrap. How do you avoid having two ClapTraps inside?',
          'In diamond inheritance, how do you get a single common base?',
        ],
        right: [
          'With virtual inheritance of the base',
          'Inheriting from ClapTrap with virtual public',
        ],
      },
    ],
    wrong: [
      'Making ClapTrap an abstract class',
      'With a virtual destructor in ClapTrap',
      'Inheriting from ClapTrap as private',
      'You cannot: there will always be two ClapTraps',
    ],
    why: 'Virtual inheritance (`class ScavTrap : virtual public ClapTrap`) shares a single copy of the base among all the paths of the diamond.',
  },
  'cpp-exceptions': {
    forms: [
      {
        ask: ['What does `throw` do?', 'What happens when you throw an exception?'],
        right: [
          'It leaves the function and jumps to the catch that takes it',
          'A catch of that type is looked for further up',
        ],
        wrong: [
          'It always ends the program, catch or no catch',
          'It makes the function return -1 to the caller',
          'It prints the error on stderr and carries on with the next line',
          'It runs the function again from the start',
        ],
      },
      {
        ask: [
          'Which method is overridden to give the message of an exception?',
          'With which method does a class that inherits from std::exception explain the error?',
        ],
        right: ['what()'],
        wrong: ['message()', 'error()', 'toString()'],
      },
    ],
    wrong: ['It always ends the program', 'It returns -1', 'It prints the error and carries on'],
    why: 'throw goes up the call stack, destroying what is local, until the catch that fits; if there is none, the program ends.',
  },
  'cpp-catch-ref': {
    forms: [
      {
        ask: [
          'Why do you catch with `catch (std::exception &e)` and not by value?',
          'What is catching an exception by reference for?',
        ],
        right: [
          'So as not to copy it or lose the real type of the child',
          'So that what() is the one of the real class',
        ],
      },
    ],
    wrong: [
      'Because catching by value does not compile in C++98',
      'To always be able to modify it inside the catch',
      'Because it is shorter to write than by value',
      'So that the exception is not thrown twice',
    ],
    why: 'By value it is copied as a std::exception and the child part is lost (slicing).',
  },
  'cpp-casts': {
    forms: [
      {
        ask: [
          'Which cast checks at run time that a pointer to Base is really a Derived?',
          'Which cast is used to find out the real type of a polymorphic object?',
        ],
        right: ['dynamic_cast'],
        wrong: ['static_cast', 'reinterpret_cast', 'const_cast'],
      },
      {
        ask: [
          'Which cast reinterprets the bits of a pointer as another type (for example, uintptr_t)?',
          'Which cast is used to turn a pointer into an integer?',
        ],
        right: ['reinterpret_cast'],
        wrong: ['dynamic_cast', 'static_cast', 'const_cast'],
      },
      {
        ask: [
          'Which cast do you use to turn a double into an int?',
          'Which cast does an ordinary conversion between numeric types?',
        ],
        right: ['static_cast'],
        wrong: ['dynamic_cast', 'reinterpret_cast', 'const_cast'],
      },
    ],
    wrong: ['const_cast', 'type_cast', 'implicit_cast'],
    why: 'static_cast converts at compile time, dynamic_cast checks at run time and reinterpret_cast changes the type of the bits.',
  },
  'cpp-dynamic-null': {
    forms: [
      {
        ask: [
          'What does `dynamic_cast<B*>(p)` do if p does not point to a B?',
          'What does a pointer dynamic_cast that does not fit return?',
        ],
        right: ['It returns a null pointer'],
        wrong: [
          'It throws std::bad_cast',
          'It returns p unchanged',
          'It does not compile',
          'It ends the program',
        ],
      },
      {
        ask: [
          'What does `dynamic_cast<B&>(r)` do if r is not a B?',
          'What happens with a reference dynamic_cast that does not fit?',
        ],
        right: ['It throws std::bad_cast'],
        wrong: [
          'It returns a null pointer',
          'It returns r unchanged',
          'It does not compile',
          'It ends the program',
        ],
      },
    ],
    wrong: ['It does not compile', 'It returns p unchanged', 'It ends the program'],
    why: 'There is no such thing as a null reference, so the reference one throws bad_cast; the pointer one gives NULL.',
  },
  'cpp-templates': {
    forms: [
      {
        ask: [
          'Why do templates usually go whole in the .hpp?',
          'Why is the code of a template put in the header?',
        ],
        right: [
          'Because the compiler needs them to instantiate them',
          'Because they are generated when used with a type',
        ],
        wrong: [
          'By style convention, for no other reason',
          'So that the final executable is smaller',
          'Because templates are always private',
          'Because that way the program runs faster',
        ],
      },
      {
        ask: [
          'What does `template <typename T> T max(T a, T b)` do?',
          'What does a template function like this one allow?',
        ],
        right: [
          'It works for any type that can be compared',
          'It generates one version for each type it is used with',
        ],
        wrong: [
          'It only works with int, the default type',
          'It turns a and b into double before comparing',
          'It compares the addresses of a and b, not the values',
        ],
      },
    ],
    wrong: [
      'By convention, nothing more',
      'So that they take less space',
      'Because they are private',
    ],
    why: 'A template is not code until it is used with a type; to generate it, the compiler has to see it.',
  },
  'cpp-containers': {
    forms: [
      {
        ask: [
          'Which STL container stores key-value pairs sorted by key?',
          'Which container do you use for a sorted dictionary?',
        ],
        right: ['std::map'],
        wrong: ['std::vector', 'std::list', 'std::stack'],
      },
      {
        ask: [
          'Which container stores the elements one after another in memory and allows access by index?',
          'What is the dynamic array of the STL?',
        ],
        right: ['std::vector'],
        wrong: ['std::map', 'std::list', 'std::stack'],
      },
    ],
    wrong: ['std::stack', 'std::list', 'std::queue'],
    why: 'vector is an array that grows; map, a tree sorted by key; list, a doubly linked list.',
  },
  'cpp-iterator-invalid': {
    forms: [
      {
        ask: ['What is the problem?', 'What happens when *it is read at the end?'],
        right: [
          'It may read freed memory: it became invalid',
          'Undefined behaviour: push_back invalidated it',
        ],
      },
    ],
    wrong: [
      'None: it prints 1, the first element',
      'None: it prints 99, the last one added',
      'It does not compile: it cannot be a vector<int> one',
      'None: it prints 0, the default value',
    ],
    why: 'If the vector needs more room, it reserves another block and copies: the old iterators point to freed memory.',
  },
  'cpp-rpn': {
    forms: [
      {
        ask: [
          'What is the value of the reverse Polish notation expression «3 4 + 2 *»?',
          'In RPN, what does «3 4 + 2 *» give?',
        ],
        right: ['14'],
        wrong: ['11', '10', '24', '9'],
      },
      {
        ask: [
          'Which structure is used to evaluate reverse Polish notation?',
          'To work out RPN, where are the numbers kept?',
        ],
        right: ['On a stack'],
        wrong: ['In a map', 'In a queue', 'In a tree'],
      },
    ],
    wrong: ['11', '10', '24', '9'],
    why: 'The numbers are pushed and each operator pops two: 3 + 4 = 7 and 7 · 2 = 14.',
  },
  'cpp00-std': {
    forms: [
      {
        ask: ['What does the `std::` in `std::cout` mean?', 'In `std::string`, what is std?'],
        right: [
          'The namespace of the standard library',
          'The namespace where everything standard lives',
        ],
        wrong: [
          'A class that groups static methods',
          'A prefix that marks what comes from libc',
          'The name of the header, like stdio.h',
        ],
      },
      {
        ask: [
          'What does `std::endl` do besides writing a line break?',
          'Apart from starting a new line, std::endl…',
        ],
        right: ['It flushes the output buffer', 'It forces out what is in the buffer'],
        wrong: [
          'It closes std::cout',
          'It adds a null character at the end',
          'It also writes a carriage return',
        ],
      },
      {
        ask: [
          'In the CPP modules, what happens if you write `using namespace std;`?',
          'According to the rules of the CPP modules, `using namespace` is…',
        ],
        right: ['Forbidden: the grade is -42', 'Forbidden, just like friend'],
        wrong: [
          'Allowed: it is what the subject recommends',
          'Allowed, although the norm advises against it',
          'Compulsory in every .cpp file',
        ],
      },
    ],
    wrong: [
      'A special kind of C++ pointer',
      'A macro from the iostream header',
      'Allowed only inside main',
    ],
    why: 'std is the namespace of the standard library; the CPP modules forbid `using namespace` (and friend) so that std:: is written out, and std::endl also flushes the buffer.',
  },
  'cpp00-megaphone': {
    forms: [
      {
        ask: [
          'What does `./megaphone` print with no arguments, in ex00 of CPP 00?',
          'If you call megaphone with nothing to shout, it prints…',
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
          'What does `./megaphone hello world` print?',
          'With the arguments hello and world, megaphone prints…',
        ],
        right: ['HELLOWORLD'],
        wrong: ['HELLO WORLD', 'Hello World', 'hello world'],
      },
    ],
    wrong: ['WORLD HELLO', 'HELLO', 'WORLD'],
    why: 'megaphone turns each argument into upper case and writes them one after another, adding no spaces; with no arguments, it lets out the feedback noise.',
  },
  'cpp00-phonebook': {
    forms: [
      {
        ask: [
          'How many contacts can the PhoneBook of CPP 00 hold at most?',
          'How many Contacts fit in the array of the PhoneBook?',
        ],
        right: ['8'],
        wrong: ['10', '16', '5', '100'],
      },
      {
        ask: [
          'What happens when you add a contact with the PhoneBook already full?',
          'With the PhoneBook full, ADD…',
        ],
        right: [
          'It replaces the oldest contact',
          'It overwrites the contact that has been there longest',
        ],
        wrong: [
          'It refuses the contact and says it is full',
          'It replaces the last contact that was added',
          'It reserves more room with new for the new one',
        ],
      },
      {
        ask: [
          'In SEARCH, how is a field longer than 10 characters shown?',
          'If a name does not fit in its SEARCH column, it is shown…',
        ],
        right: ['Cut to 9 with a dot at the end', 'Its first 9 characters and a «.»'],
        wrong: [
          'Whole, even if it breaks the column',
          'Cut to 10, with no sign that text is missing',
          'With «...» instead of the last three letters',
        ],
      },
    ],
    wrong: ['12', '20', '4'],
    why: 'The PhoneBook is a fixed array of 8 (no dynamic memory) and the ninth overwrites the oldest; SEARCH right-aligns columns of 10 with std::setw(10) and truncates with a dot.',
  },
  'cpp01-zombie': {
    forms: [
      {
        ask: [
          'When is it worth creating the Zombie on the heap, as newZombie does?',
          'newZombie returns a Zombie created with new because…',
        ],
        right: [
          'It has to stay alive after the function returns',
          'The caller will use it after the function ends',
        ],
        wrong: [
          'Objects with a std::string do not fit on the stack',
          'What is created with new announces itself faster',
          'That way only its destructor is called at the end of main',
        ],
      },
      {
        ask: [
          'In randomChump, why can the Zombie go on the stack?',
          'randomChump creates its Zombie as a local variable because…',
        ],
        right: [
          'It is only used inside the function and dies with it',
          'It does not need to live longer than the function',
        ],
        wrong: [
          'On the stack the Zombie is never destroyed',
          'What is on the stack has to be freed with delete',
          'That way its address can be returned safely',
        ],
      },
    ],
    wrong: [
      'Because the subject forbids using new',
      'Because on the stack it can be freed twice',
      'Because a Zombie has no destructor',
    ],
    why: 'What is on the stack dies when the function ends (and its destructor is called automatically); what is on the heap lives until its delete, so it can be returned.',
  },
  'cpp01-weapon': {
    forms: [
      {
        ask: [
          'In ex03 of CPP 01, why can HumanA keep its Weapon as a reference?',
          'HumanA gets the weapon in its constructor; that lets it…',
        ],
        right: [
          'It always has a weapon, from construction on',
          'It is never unarmed and never changes weapon',
        ],
        wrong: [
          'References are copied faster than the weapon',
          'That way the weapon is destroyed together with HumanA',
          'References can stay empty until setWeapon',
        ],
      },
      {
        ask: [
          'In ex03 of CPP 01, why does HumanB keep the Weapon with a pointer?',
          'HumanB gets the weapon later, with setWeapon; that is why…',
        ],
        right: [
          'It can be unarmed for a while, and that is NULL',
          'It starts unarmed and the weapon comes later',
        ],
        wrong: [
          'References cannot be class attributes',
          'That way the whole weapon is copied by setWeapon',
          'A pointer takes less memory than a reference',
        ],
      },
    ],
    wrong: [
      'Because the subject forbids references',
      'Because that way HumanB can delete the weapon',
      'Because Weapon has no copy constructor',
    ],
    why: 'A reference is set at construction and cannot be null; a pointer can start as NULL and point to the weapon when it arrives. Both see the changes made by setType.',
  },
  'cpp01-sed': {
    forms: [
      {
        ask: [
          'In ex04 of CPP 01, which file does the program create from «notes»?',
          'If you give ex04 the file notes, it writes the result to…',
        ],
        right: ['notes.replace'],
        wrong: ['notes.out', 'notes.sed', 'replace.notes'],
      },
      {
        ask: [
          'In ex04 of CPP 01, what is used to read and write the file?',
          'To open the files of ex04 without C functions, you use…',
        ],
        right: ['`std::ifstream` and `std::ofstream`'],
        wrong: [
          '`fopen`, `fgets` and `fputs`',
          '`open`, `read` and `write`',
          '`std::cin` and `std::cout`',
        ],
      },
      {
        ask: [
          'Without `std::string::replace`, how do you replace s1 with s2?',
          'In ex04 of CPP 01, swapping s1 for s2 is done…',
        ],
        right: [
          'Searching with find and joining pieces with substr',
          'With find for each match, building another string',
        ],
        wrong: [
          'With std::replace from <algorithm> on the string',
          'Calling sed from the program with system()',
          'With std::regex_replace on each line read',
        ],
      },
    ],
    wrong: ['notes.new', 'notes.txt', 'notes.copy'],
    why: 'ex04 reads with std::ifstream, writes <file>.replace with std::ofstream and replaces each s1 by hand: replace and the C file functions are forbidden.',
  },
  'cpp01-harl': {
    forms: [
      {
        ask: [
          'How does the subject ask Harl to choose between debug, info, warning and error?',
          'In complain(level), Harl calls the method of each level…',
        ],
        right: ['With pointers to member functions', 'With an array of pointers to methods'],
        wrong: [
          'With a chain of if and else if',
          'With a switch on the text of the level',
          'With inheritance: one child class per level',
        ],
      },
      {
        ask: ['How do you call the method pointer `f` on the current object?'],
        right: ['`(this->*f)()`'],
        wrong: ['`this->f()`', '`(*f)(this)`', '`this.*f()`'],
      },
    ],
    wrong: [
      'With one virtual function per level',
      'With a std::map of strings',
      'With preprocessor macros',
    ],
    why: 'ex05 forbids the forest of if/else: you keep an array of method pointers (`void (Harl::*)()`) and call the one for the level with `(this->*f)()`.',
  },
  'cpp02-fixed': {
    forms: [
      {
        ask: [
          'How many fractional bits does the Fixed of CPP 02 have?',
          'How many bits does Fixed keep for the fractional part?',
        ],
        right: ['8'],
        wrong: ['16', '4', '32', '10'],
      },
      {
        ask: [
          'With 8 fractional bits, which integer does Fixed store for 1.5?',
          'What is the raw value inside a Fixed that represents 1.5?',
        ],
        right: ['384'],
        wrong: ['150', '15', '192', '768'],
      },
      {
        ask: [
          'To turn a float into a Fixed, which <cmath> function does the subject allow?',
          'Which function rounds when converting a float into a Fixed?',
        ],
        right: ['roundf'],
        wrong: ['floorf', 'truncf', 'ceilf'],
      },
    ],
    wrong: ['256', '2', '64'],
    why: 'With 8 fractional bits the value is stored multiplied by 256 (1 << 8): 1.5 is 384, and a float is converted with roundf(f * 256) so as not to truncate.',
  },
  'cpp02-operators': {
    forms: [
      {
        ask: [
          'How do you declare the << overload that prints a Fixed?',
          'To be able to write `std::cout << fixed`, you declare…',
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
          'Why does operator<< return the std::ostream it receives?',
          'Having operator<< return the stream is useful to…',
        ],
        right: ['To chain: std::cout << a << b', 'To be able to add another << after it'],
        wrong: [
          'So that the Fixed can be changed when printed',
          'To know how many characters were written',
          'Because otherwise nothing shows on the screen',
        ],
      },
    ],
    wrong: [
      'Because the canonical form requires it',
      'So that it is a const method',
      'So that it also works with printf',
    ],
    why: 'operator<< is a free function that takes the stream by reference and returns it, so that `std::cout << a << b` carries on with the same stream.',
  },
  'cpp02-increment': {
    forms: [
      {
        ask: ['What does `a++` return on a Fixed?', 'The postfix ++ of Fixed returns…'],
        right: ['A copy with the value from before', 'The value a had before adding'],
        wrong: [
          'A reference to a, already incremented',
          'Nothing: the postfix operator is void',
          'The new value, just like ++a',
        ],
      },
      {
        ask: [
          'How are postfix and prefix ++ told apart when declaring them?',
          'For the compiler to know which is `a++` and which `++a`…',
        ],
        right: [
          'The postfix one takes an unused int parameter',
          'operator++(int) is postfix; operator++(), prefix',
        ],
        wrong: [
          'The postfix one is declared outside the class',
          'The prefix one returns void and the postfix one, Fixed',
          'They are not: a single one serves for both',
        ],
      },
      {
        ask: [
          'How much does `++a` add to a Fixed with 8 fractional bits?',
          'The smallest step that Fixed can take is…',
        ],
        right: ['0.00390625'],
        wrong: ['1', '0.1', '0.5', '0.0078125'],
      },
    ],
    wrong: ['The same as the prefix', 'A pointer to the object', 'A const reference'],
    why: 'The prefix one adds and returns *this by reference; the postfix one, marked with a dummy int, keeps a copy, adds and returns the copy. With 8 bits, one step is 1/256.',
  },
  'cpp03-traps': {
    forms: [
      {
        ask: [
          'Which function of its own does ScavTrap add to what it inherits from ClapTrap?',
          'ScavTrap enters gatekeeper mode with…',
        ],
        right: ['guardGate()'],
        wrong: ['highFivesGuys()', 'beRepaired()', 'whoAmI()'],
      },
      {
        ask: [
          'Which function of its own does FragTrap add to what it inherits from ClapTrap?',
          'FragTrap asks for a high five with…',
        ],
        right: ['highFivesGuys()'],
        wrong: ['guardGate()', 'takeDamage()', 'whoAmI()'],
      },
      {
        ask: [
          'How many hit points does a ClapTrap have when created?',
          'How many health points does a ClapTrap start with?',
        ],
        right: ['10'],
        wrong: ['100', '50', '20'],
      },
    ],
    wrong: ['attack()', 'repair()', '0'],
    why: 'ClapTrap starts with 10 hit points, 10 energy and 0 attack; ScavTrap (100, 50, 20) adds guardGate() and FragTrap (100, 100, 30), highFivesGuys().',
  },
  'cpp03-order': {
    forms: [
      {
        ask: [
          'When a ScavTrap is created, which constructor runs first?',
          'When building a ScavTrap, the first constructor to run is…',
        ],
        right: ['The one of ClapTrap, the base', 'The constructor of the base class'],
        wrong: [
          'The one of ScavTrap, the child',
          'The one declared first in the .hpp',
          'Only the ScavTrap one: the base one is not called',
        ],
      },
      {
        ask: [
          'When a ScavTrap is destroyed, which destructor runs first?',
          'When destroying a ScavTrap, the first destructor to run is…',
        ],
        right: ['The one of ScavTrap, the child', 'The destructor of the child class'],
        wrong: [
          'The one of ClapTrap, the base',
          'The one declared first in the .hpp',
          'Only the ClapTrap one: the child one is not called',
        ],
      },
    ],
    wrong: ['Both at once', 'It depends on the compiler', 'It depends on the attributes'],
    why: 'Construction goes from the base to the child and destruction the other way round: the child relies on the base, so the base is born first and dies last.',
  },
  'cpp04-brain': {
    forms: [
      {
        ask: [
          'When a Dog is copied, what does a deep copy of its Brain do?',
          'So that two Dogs do not share a Brain, when copying you have to…',
        ],
        right: ['Create a new Brain with the same ideas', 'Do new Brain(*other.brain)'],
        wrong: [
          'Copy the brain pointer of the other Dog',
          'Share the Brain and count how many use it',
          'Leave brain as NULL until it is used',
        ],
      },
      {
        ask: [
          'How many ideas does a Brain hold in CPP 04?',
          'How many std::strings are in the ideas array of Brain?',
        ],
        right: ['100'],
        wrong: ['10', '42', '256', '1000'],
      },
      {
        ask: [
          'In operator= of Dog, what must be done before copying the Brain of the other one?',
          'Before taking the Brain of another Dog, operator= has to…',
        ],
        right: [
          'Check it is not the same one and delete its Brain',
          'Check this is not &other and free its own Brain',
        ],
        wrong: [
          'Nothing: brain = other.brain is enough',
          'Call the destructor of Animal by hand',
          'Create a temporary Dog with new and copy it',
        ],
      },
    ],
    wrong: ['Nothing in particular', '8', 'Call delete this'],
    why: 'Each Dog has its own Brain: copying does new with the ideas of the other one and, when assigning, the old one is freed (unless it is the same object) so as not to lose it.',
  },
  'cpp04-amateria': {
    forms: [
      {
        ask: [
          'In C++98, what is an interface such as ICharacter?',
          'With no interface keyword in C++, an interface is written as…',
        ],
        right: [
          'A class with only pure virtual methods',
          'An abstract class with no attributes or code',
        ],
        wrong: [
          'A class with all its methods static',
          'A struct with C function pointers',
          'A template that is filled in for each type',
        ],
      },
      {
        ask: [
          'What does unequip do with the materia it takes out of the inventory?',
          'In ex03 of CPP 04, unequip(idx)…',
        ],
        right: ['It does not delete it: it just takes it out', 'It drops it without a delete'],
        wrong: [
          'It deletes it with delete right away',
          'It gives it back to the MateriaSource',
          'It moves it to the next free slot',
        ],
      },
      {
        ask: [
          'How many materias fit in the inventory of a Character?',
          'How many AMaterias can a MateriaSource learn?',
        ],
        right: ['4'],
        wrong: ['3', '5', '8', '10'],
      },
    ],
    wrong: ['A final class', 'A class with no constructor', '2'],
    why: 'AMateria is abstract (clone() = 0) and ICharacter and IMateriaSource are interfaces: only pure virtuals. The inventory has 4 slots and unequip must not delete the materia.',
  },
  'cpp05-bureaucrat': {
    forms: [
      {
        ask: [
          'What is the highest grade a Bureaucrat can have?',
          'In CPP 05, the best possible grade of a Bureaucrat is…',
        ],
        right: ['1'],
        wrong: ['150', '0', '100', '10'],
      },
      {
        ask: [
          'What happens when you create a Bureaucrat with grade 0?',
          'Creating a Bureaucrat with a grade better than 1…',
        ],
        right: ['It throws Bureaucrat::GradeTooHighException'],
        wrong: [
          'It throws Bureaucrat::GradeTooLowException',
          'It is created with the grade set to 1',
          'It is created with grade 0 without complaint',
        ],
      },
      {
        ask: [
          'If a Bureaucrat has grade 3, which grade does it have after incrementGrade()?',
          'Promoting a Bureaucrat with a 3 leaves it at…',
        ],
        right: ['2'],
        wrong: ['4', '3', '13'],
      },
    ],
    wrong: ['It returns false', '151', 'It prints a warning and carries on'],
    why: 'The grade goes from 1 (the highest) to 150 (the lowest): promoting subtracts, and going past the top throws GradeTooHighException.',
  },
  'cpp05-forms': {
    forms: [
      {
        ask: [
          'Which file does ShrubberyCreationForm create with the target «home»?',
          'When ShrubberyCreationForm("home") is executed, the trees go to…',
        ],
        right: ['home_shrubbery'],
        wrong: ['shrubbery_home', 'home.shrubbery', 'home_tree'],
      },
      {
        ask: ['When does execute() of an AForm fail?', 'A Bureaucrat cannot execute an AForm if…'],
        right: [
          'It is not signed or the grade falls short',
          'The signature is missing or the grade is too low',
        ],
        wrong: [
          'Only if the Bureaucrat has grade 150',
          'Never: signing it is enough to execute it',
          'If it was already executed once before',
        ],
      },
      {
        ask: ['What does Intern::makeForm return?', 'The intern of CPP 05 hands over the form as…'],
        right: ['A pointer to a new AForm', 'An AForm* created with new'],
        wrong: [
          'An AForm by value, already copied',
          'A reference to the last form',
          'The name of the form it created',
        ],
      },
    ],
    wrong: ['home_garden', 'Nothing', 'A new Bureaucrat'],
    why: 'AForm checks the signature and the grade before executing; Shrubbery writes ASCII trees to <target>_shrubbery, and Intern creates with new the form it is asked for and returns the pointer.',
  },
  'cpp06-scalar': {
    forms: [
      {
        ask: [
          'What does ScalarConverter::convert("0") print on the char line?',
          'With the literal 0, the char line of ScalarConverter says…',
        ],
        right: ['char: Non displayable'],
        wrong: ['char: Non printable', 'char: impossible', "char: '0'"],
      },
      {
        ask: [
          'What does ScalarConverter::convert("nan") print on the char line?',
          'With the literal nan, the char line of ScalarConverter says…',
        ],
        right: ['char: impossible'],
        wrong: ['char: Non displayable', 'char: nan', "char: 'n'"],
      },
      {
        ask: [
          'Which float pseudo-literals does ScalarConverter have to understand?',
          'Besides numbers, ScalarConverter accepts as float…',
        ],
        right: ['-inff, +inff and nanf'],
        wrong: ['-inf, +inf and nan', 'NaN, Inf and -Inf', 'FLT_MIN, FLT_MAX and 0f'],
      },
    ],
    wrong: ['char: 0', 'char: NULL', 'INFINITY and NAN'],
    why: 'convert detects the type of the literal and turns it into char, int, float and double: 0 cannot be displayed as a char, nan does not fit in a char, and the float pseudo-literals end in f.',
  },
  'cpp06-serialize': {
    forms: [
      {
        ask: [
          'Which type does `Serializer::serialize(Data *ptr)` return?',
          'In ex01 of CPP 06, the pointer is turned into a…',
        ],
        right: ['uintptr_t'],
        wrong: ['unsigned int', 'void *', 'long double'],
      },
      {
        ask: [
          'What must deserialize(serialize(p)) give?',
          'After a round trip through the Serializer, the pointer p ends up as…',
        ],
        right: ['The same pointer p', 'A pointer equal to p'],
        wrong: [
          'A new copy of the Data of p',
          'A null pointer if p was valid',
          'The number of bytes of Data',
        ],
      },
      {
        ask: [
          'Without <typeinfo>, how does identify(Base &p) know whether it is A, B or C?',
          'In identify by reference, the real type is found out…',
        ],
        right: [
          'Trying reference dynamic_casts and catching the failure',
          'With dynamic_cast<A&>(p) and a catch for each attempt',
        ],
        wrong: [
          'With typeid(p).name(), comparing the name',
          'With dynamic_cast<A*>(&p), checking for NULL',
          'Reading a type attribute that Base fills in',
        ],
      },
    ],
    wrong: ['int', 'A pointer to Base', 'With static_cast to each class'],
    why: 'uintptr_t is an integer with room for a pointer, and reinterpret_cast goes there and back losing nothing; identify(Base&) cannot use pointers, so it tries reference casts, which throw when they fail.',
  },
  'cpp07-whatever': {
    forms: [
      {
        ask: [
          'In ex00 of CPP 07, if a and b are equal, what does max(a, b) return?',
          'With two equal values, the min and max templates of CPP 07 return…',
        ],
        right: ['The second one, b', 'The second argument'],
        wrong: ['The first one, a', 'A new copy of a', 'An exception, not a value'],
      },
      {
        ask: [
          'What does `iter(array, length, f)` do in CPP 07?',
          'The iter template of ex01 of CPP 07…',
        ],
        right: ['Calls f with each element of the array', 'Applies f to each element, one by one'],
        wrong: [
          'Returns a new array with f applied',
          'Calls f once with the whole array',
          'Sorts the array using f to compare',
        ],
      },
    ],
    wrong: ['Neither: it does not compile', 'The larger of the two', 'Looks for f in the array'],
    why: 'The subject sets it: with equal values, min and max return the second one; iter goes through the array and calls f with each element.',
  },
  'cpp07-array': {
    forms: [
      {
        ask: [
          'What does `Array<int> a(3)` create in ex02 of CPP 07?',
          'With `Array<int> a(3)`, what is inside is…',
        ],
        right: ['An array of 3 ints initialised by default'],
        wrong: [
          'An empty array with room reserved for 3',
          'An array of 3 uninitialised ints, with garbage',
          'An array with a single element, worth 3',
        ],
      },
      {
        ask: [
          'What does operator[] of Array do with an out-of-range index?',
          'If you ask for a[10] on an Array of 3 elements…',
        ],
        right: ['It throws a std::exception', 'It throws an exception'],
        wrong: [
          'It returns the last element',
          'It grows the array up to that index',
          'It returns a default value',
        ],
      },
    ],
    wrong: ['Nothing', 'A std::vector of 3', 'It returns NULL'],
    why: 'Array reserves with new[] the n elements initialised by default, is copied deeply and operator[] checks the index and throws if it is out of range.',
  },
  'cpp08-span': {
    forms: [
      {
        ask: [
          'Which STL algorithm does easyfind use to look for the integer?',
          'easyfind finds the first occurrence with…',
        ],
        right: ['`std::find`'],
        wrong: ['`std::sort`', '`std::binary_search`', '`std::accumulate`'],
      },
      {
        ask: [
          'A Span holds 6, 3, 17, 9 and 11. What does shortestSpan() give?',
          'With 6, 3, 17, 9 and 11 in a Span, the smallest distance between two is…',
        ],
        right: ['2'],
        wrong: ['3', '14', '1', '6'],
      },
      {
        ask: [
          'With the Span already full, what does addNumber do?',
          'If you add one number too many to a Span of N…',
        ],
        right: ['It throws an exception', 'It throws an error'],
        wrong: [
          'It replaces the oldest number',
          'It grows the Span to twice N',
          'It ignores the number silently',
        ],
      },
    ],
    wrong: ['`std::count`', '`std::merge`', '0'],
    why: 'easyfind is std::find on the container; Span holds up to N numbers, throws when it goes over, and shortestSpan is the smallest difference between two (11 − 9 gives 2).',
  },
  'cpp08-mutantstack': {
    forms: [
      {
        ask: [
          'Where does MutantStack get the iterators that std::stack does not give?',
          'MutantStack can offer begin() and end() because…',
        ],
        right: [
          'From the protected container c of std::stack',
          'It inherits from std::stack and uses its member c',
        ],
        wrong: [
          'It copies the whole stack into a std::vector',
          'It inherits from std::vector instead of std::stack',
          'It walks the stack with top() and pop()',
        ],
      },
      {
        ask: [
          'Which container is std::stack built on if you do not give another?',
          'The default container of std::stack is…',
        ],
        right: ['`std::deque`'],
        wrong: ['`std::vector`', '`std::list`', '`std::queue`'],
      },
    ],
    wrong: ['With a pointer to top()', '`std::map`', 'With friend in std::stack'],
    why: 'std::stack is an adaptor with a protected member c (std::deque by default): a child class can see it and return c.begin() and c.end().',
  },
  'cpp09-btc': {
    forms: [
      {
        ask: [
          'If a date of the input is not in the database, which rate does btc use?',
          'In BitcoinExchange, for a date that is not in data.csv, it uses…',
        ],
        right: ['The one of the closest earlier date', 'The one of the last date before it'],
        wrong: [
          'The one of the closest later date',
          'The average of the earlier and the later one',
          'None: it prints a date error',
        ],
      },
      {
        ask: [
          'What does `lower_bound(date)` return in a std::map?',
          'In a std::map, lower_bound of a key gives…',
        ],
        right: [
          'The first key that is not less than date',
          'The first key greater than or equal to it',
        ],
        wrong: [
          'The last key strictly less than it',
          'The nearest key, above or below',
          'The number of keys less than the given one',
        ],
      },
      {
        ask: [
          'Which value does btc accept on each line of the input?',
          'In the input of btc, the amount of bitcoins has to be…',
        ],
        right: ['A number between 0 and 1000', 'An int or a float from 0 to 1000'],
        wrong: [
          'Any positive float, with no limit',
          'An integer between 1 and 100',
          'A number between -1000 and 1000',
        ],
      },
    ],
    wrong: ['The one of the first date in the database', 'Any number at all', 'The highest key'],
    why: 'The rates go in a std::map by date: lower_bound gives the first one not less than it and, if it is not the exact one, you step back one to keep the earlier date.',
  },
  'cpp09-pmergeme': {
    forms: [
      {
        ask: [
          'Which sorting algorithm does PmergeMe ask for?',
          'ex02 of CPP 09 sorts the numbers with…',
        ],
        right: ['Merge-insertion, the Ford-Johnson one', 'The Ford-Johnson algorithm'],
        wrong: [
          'Quicksort with a random pivot',
          'Classic top-down merge sort',
          'Heap sort with std::make_heap',
        ],
      },
      {
        ask: [
          'How many different containers does PmergeMe use at least?',
          'In how many different containers is the sequence sorted in PmergeMe?',
        ],
        right: ['2'],
        wrong: ['1', '3', '4'],
      },
      {
        ask: [
          'In CPP 09, what happens with a container you already used in an exercise?',
          'In CPP 09, the std::map of ex00…',
        ],
        right: [
          'It can no longer be used in the rest of the module',
          'It cannot appear again in ex01 or in ex02',
        ],
        wrong: [
          'It can be reused if it is another variable',
          'It has to be used in the other two as well',
          'It can only be used again in ex02',
        ],
      },
    ],
    wrong: ['Bubble sort', '5', 'It can be used anywhere'],
    why: 'PmergeMe sorts with Ford-Johnson in two containers and compares times; in CPP 09 each container you use is spent for the rest of the module.',
  },
}
