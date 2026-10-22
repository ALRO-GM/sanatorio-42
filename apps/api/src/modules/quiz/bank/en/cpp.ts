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
          'What is private or public by default',
          'In a class everything is private by default, and in a struct, public',
        ],
      },
    ],
    wrong: [
      'A struct cannot have methods',
      'A class goes on the heap and a struct on the stack',
      'A struct does not allow inheritance',
      'Nothing: they are identical in everything',
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
      'It takes more memory',
      'It only works for integers',
      'It can be reassigned to another variable',
      'It is slower',
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
      'That it returns a constant',
      'That it can only be called once',
      'That it is static',
      'That it cannot be overridden',
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
          'You have to use delete[]: with delete only the first one is destroyed',
          'What is created with new[] is freed with delete[]',
        ],
      },
    ],
    wrong: [
      'Nothing: it is fine',
      'You have to use free(horde)',
      'You have to delete them one by one with delete',
      'new does not accept arrays',
    ],
    why: 'What is created with new[] is freed with delete[], so that the destructor of every element is called.',
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
          'Constructor, destructor, getter and setter',
          'Constructor, operator==, operator<< and destructor',
          'Default constructor, move constructor, swap and destructor',
        ],
      },
      {
        ask: ['When is the copy constructor called?'],
        right: ['When a new object is created from another one'],
        wrong: [
          'When an object is assigned to another that already exists',
          'When an object is destroyed',
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
          'The same array is freed twice: the default copy copies the pointer',
          'There is a double delete: a and b share ideas',
        ],
      },
    ],
    wrong: [
      'Nothing: the default copy copies the array',
      'There is a memory leak, and nothing else',
      'It does not compile',
      'The destructor is only called once',
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
        wrong: ['Declare it virtual only in Dog', 'Always cast to Dog', 'Change public to private'],
      },
    ],
    wrong: ['Woof', 'Woof...', 'Nothing'],
    why: 'Without virtual it is called according to the pointer type (Animal); with virtual, according to the real object (Dog).',
  },
  'cpp-virtual-destructor': {
    forms: [
      {
        ask: ['Why should the destructor of a base class be virtual?'],
        right: [
          'So that delete through a pointer to the base also calls the destructor of the child',
        ],
        wrong: [
          'So that it is faster',
          'To be able to copy the class',
          'Because otherwise it does not compile',
          'To make the class abstract',
        ],
      },
      {
        ask: [
          'Without a virtual destructor, what does `delete animal` do if animal points to a Dog?',
        ],
        right: ['It only calls the destructor of Animal'],
        wrong: ['It calls both destructors', 'It does not compile', 'It only calls the one of Dog'],
      },
    ],
    wrong: [
      'So that it is faster',
      'To be able to copy the class',
      'Because otherwise it does not compile',
    ],
    why: 'Without virtual, delete only sees the pointer type: the child part is not destroyed.',
  },
  'cpp-abstract': {
    forms: [
      {
        ask: ['What makes a class abstract in C++?', 'When is a C++ class abstract?'],
        right: ['Having at least one pure virtual method (= 0)'],
        wrong: [
          'Having the word abstract',
          'Having no constructor',
          'Having everything private',
          'A method returning 0',
        ],
      },
      {
        ask: ['What does `virtual void makeSound() const = 0;` achieve in a class?'],
        right: ['That no objects of that class can be created'],
        wrong: [
          'That makeSound returns 0',
          'That makeSound is static',
          'That nobody can inherit from it',
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
      'Making ClapTrap abstract',
      'With a virtual destructor',
      'Inheriting as private',
      'It cannot be avoided',
    ],
    why: 'Virtual inheritance (`class ScavTrap : virtual public ClapTrap`) shares a single copy of the base among all the paths of the diamond.',
  },
  'cpp-exceptions': {
    forms: [
      {
        ask: ['What does `throw` do?', 'What happens when you throw an exception?'],
        right: [
          'It stops what is being done and jumps to the catch that picks it up',
          'A catch of that type is looked for further up',
        ],
        wrong: [
          'It always ends the program',
          'It returns -1',
          'It prints the error and carries on',
          'It restarts the function',
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
      'Because by value it does not compile',
      'To always be able to modify it',
      'Because it is shorter to write',
      'To be able to rethrow it',
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
          'Because the compiler needs to see them to generate each version',
          'Because they are instantiated when used with a concrete type',
        ],
        wrong: [
          'By convention, nothing more',
          'Because they cannot be compiled',
          'So that they take less space',
          'Because they are private',
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
        wrong: ['It only works with int', 'It turns everything into double', 'It runs slower'],
      },
    ],
    wrong: [
      'By convention, nothing more',
      'Because they cannot be compiled',
      'So that they take less space',
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
        ask: ['What is the problem?', 'Is it safe to read *it at the end?'],
        right: [
          'As it grows, the vector can move and the iterator becomes invalid',
          'No: push_back can invalidate it',
        ],
      },
    ],
    wrong: ['It always prints 1', 'It prints 99', 'It does not compile', 'It prints 0'],
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
}
