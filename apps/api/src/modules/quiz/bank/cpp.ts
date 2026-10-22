/**
 * Banco de Not-games: C++ (los CPP 00 a 09). Clases, forma canónica,
 * herencia y polimorfismo, excepciones, casts, plantillas y la STL.
 */

import type { Concept } from './types.js'

const cpp = (...modules: string[]): string[] => modules.map((module) => `cpp-module-${module}`)

const FROM_00 = cpp('00', '01', '02', '03', '04', '05', '06', '07', '08', '09')
const FROM_02 = cpp('02', '03', '04', '05', '06', '07', '08', '09')
const FROM_04 = cpp('04', '05', '06', '07', '08', '09')
const FROM_05 = cpp('05', '06', '07', '08', '09')
const FROM_06 = cpp('06', '07', '08', '09')
const FROM_07 = cpp('07', '08', '09')
const FROM_08 = cpp('08', '09')

export const CPP: readonly Concept[] = [
  {
    id: 'cpp-class-struct',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'En C++, ¿qué diferencia hay entre `class` y `struct`?',
          '¿Qué es lo único que cambia entre class y struct?',
        ],
        right: [
          'Lo que es privado o público por defecto',
          'Que en class todo es privado por defecto, y en struct, público',
        ],
      },
    ],
    wrong: [
      'Que struct no puede tener métodos',
      'Que class va en el montón y struct en la pila',
      'Que struct no admite herencia',
      'Nada: son idénticas en todo',
    ],
    why: 'En C++ una struct es una clase con todo público por defecto; puede tener métodos, herencia y todo lo demás.',
  },
  {
    id: 'cpp-reference',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué diferencia hay entre una referencia y un puntero?',
          '¿Qué tiene de distinto una referencia frente a un puntero?',
        ],
        right: [
          'Que no puede ser nula ni cambiar a qué se refiere',
          'Que siempre se refiere a lo mismo y no puede ser NULL',
        ],
      },
    ],
    wrong: [
      'Que ocupa más memoria',
      'Que solo sirve para enteros',
      'Que se puede reasignar a otra variable',
      'Que es más lenta',
    ],
    why: 'Una referencia es otro nombre para algo que ya existe: se inicializa siempre y no se reasigna.',
  },
  {
    id: 'cpp-const-method',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué significa el `const` al final de `int getValue() const;`?',
          '¿Qué promete un método marcado const al final?',
        ],
        right: ['Que el método no cambia el objeto', 'Que no modifica los atributos'],
      },
    ],
    wrong: [
      'Que devuelve una constante',
      'Que solo se puede llamar una vez',
      'Que es estático',
      'Que no se puede sobrescribir',
    ],
    why: 'Así se puede llamar sobre objetos const, y el compilador impide tocar los atributos dentro.',
  },
  {
    id: 'cpp-new-delete',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'long',
    level: 3,
    code: 'Zombie *horde = new Zombie[10];\n// ...\ndelete horde;',
    forms: [
      {
        ask: ['¿Qué falla aquí?', '¿Qué tiene de malo liberar así lo creado con `new Zombie[10]`?'],
        right: [
          'Que hay que usar delete[]: con delete solo se destruye el primero',
          'Que lo creado con new[] se libera con delete[]',
        ],
      },
    ],
    wrong: [
      'Nada: está bien',
      'Que hay que usar free(horde)',
      'Que hay que borrarlos uno a uno con delete',
      'Que new no admite arrays',
    ],
    why: 'Lo que se crea con new[] se libera con delete[], para que se llame al destructor de cada elemento.',
  },
  {
    id: 'cpp-canonical',
    topic: 'c++',
    needs: { projects: FROM_02 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué cuatro cosas forman la forma canónica ortodoxa de una clase?',
          '¿Qué pide la forma canónica de Coplien?',
        ],
        right: [
          'Constructor por defecto, constructor de copia, operador de asignación y destructor',
        ],
        wrong: [
          'Constructor, destructor, getter y setter',
          'Constructor, operator==, operator<< y destructor',
          'Constructor por defecto, constructor de movimiento, swap y destructor',
        ],
      },
      {
        ask: ['¿Cuándo se llama al constructor de copia?'],
        right: ['Al crear un objeto nuevo a partir de otro'],
        wrong: [
          'Al asignar un objeto a otro que ya existe',
          'Al destruir un objeto',
          'Al pasar un objeto por referencia',
        ],
      },
      {
        ask: ['En `A b = a;`, ¿qué se ejecuta?'],
        right: ['El constructor de copia'],
        wrong: [
          'El operador de asignación',
          'El constructor por defecto y luego operator=',
          'El destructor de a',
        ],
      },
    ],
    wrong: [
      'Constructor, destructor, getter y setter',
      'Constructor, operator==, operator<< y destructor',
      'Constructor y destructor, nada más',
    ],
    why: 'Copiar al crear es el constructor de copia; asignar a uno que ya existe, operator=.',
  },
  {
    id: 'cpp-shallow-copy',
    topic: 'c++',
    needs: { projects: FROM_02 },
    kind: 'long',
    level: 4,
    code: 'class Brain { public: std::string *ideas; ... };\n\nBrain::Brain() { ideas = new std::string[100]; }\nBrain::~Brain() { delete[] ideas; }\n// Sin constructor de copia ni operator=\n\nBrain a;\nBrain b = a;',
    seconds: 60,
    forms: [
      {
        ask: ['¿Qué pasa al terminar el programa?', 'Al destruirse a y b, ¿qué ocurre?'],
        right: [
          'Se libera dos veces el mismo array: la copia por defecto copia el puntero',
          'Hay un doble delete: a y b comparten ideas',
        ],
      },
    ],
    wrong: [
      'Nada: la copia por defecto copia el array',
      'Hay una fuga de memoria, y nada más',
      'No compila',
      'Se llama al destructor solo una vez',
    ],
    why: 'La copia por defecto copia el puntero, no lo apuntado: hay que escribir una copia profunda.',
  },
  {
    id: 'cpp-virtual',
    topic: 'c++',
    needs: { projects: FROM_04 },
    kind: 'long',
    level: 3,
    code: 'class Animal { public: void makeSound() const { std::cout << "..."; } };\nclass Dog : public Animal { public: void makeSound() const { std::cout << "Guau"; } };\n\nAnimal *a = new Dog();\na->makeSound();',
    forms: [
      {
        ask: ['¿Qué imprime?', '¿Qué sale por pantalla?'],
        right: ['...'],
        wrong: ['Guau', 'Guau...', 'Nada'],
      },
      {
        ask: [
          '¿Qué hay que cambiar para que imprima «Guau»?',
          'Para que a->makeSound() diga «Guau», ¿qué hace falta?',
        ],
        right: [
          'Declarar makeSound como virtual en Animal',
          'Poner virtual en el método de la clase base',
        ],
        wrong: [
          'Declararlo virtual solo en Dog',
          'Hacer siempre un cast a Dog',
          'Cambiar public por private',
        ],
      },
    ],
    wrong: ['Guau', 'Guau...', 'Nada'],
    why: 'Sin virtual se llama según el tipo del puntero (Animal); con virtual, según el objeto real (Dog).',
  },
  {
    id: 'cpp-virtual-destructor',
    topic: 'c++',
    needs: { projects: FROM_04 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Por qué el destructor de una clase base debe ser virtual?'],
        right: ['Para que delete por un puntero a la base llame también al destructor de la hija'],
        wrong: [
          'Para que sea más rápido',
          'Para poder copiar la clase',
          'Porque si no, no compila',
          'Para que la clase sea abstracta',
        ],
      },
      {
        ask: ['Sin destructor virtual, ¿qué hace `delete animal` si animal apunta a un Dog?'],
        right: ['Llama solo al destructor de Animal'],
        wrong: ['Llama a los dos destructores', 'No compila', 'Llama solo al de Dog'],
      },
    ],
    wrong: ['Para que sea más rápido', 'Para poder copiar la clase', 'Porque si no, no compila'],
    why: 'Sin virtual, delete solo ve el tipo del puntero: la parte de la hija no se destruye.',
  },
  {
    id: 'cpp-abstract',
    topic: 'c++',
    needs: { projects: FROM_04 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace abstracta a una clase en C++?', '¿Cuándo es abstracta una clase de C++?'],
        right: ['Tener al menos un método virtual puro (= 0)'],
        wrong: [
          'Llevar la palabra abstract',
          'No tener constructor',
          'Tener todo privado',
          'Que un método devuelva 0',
        ],
      },
      {
        ask: ['¿Qué consigue `virtual void makeSound() const = 0;` en una clase?'],
        right: ['Que no se puedan crear objetos de esa clase'],
        wrong: [
          'Que makeSound devuelva 0',
          'Que makeSound sea estático',
          'Que no se pueda heredar de ella',
        ],
      },
    ],
    wrong: ['Llevar la palabra abstract', 'No tener constructor', 'Tener todo privado'],
    why: '= 0 es un método virtual puro: la clase no se puede instanciar y las hijas deben implementarlo.',
  },
  {
    id: 'cpp-diamond',
    topic: 'c++',
    needs: { projects: cpp('03', '04', '05', '06', '07', '08', '09') },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          'DiamondTrap hereda de ScavTrap y de FragTrap, que heredan las dos de ClapTrap. ¿Cómo se evita tener dos ClapTrap dentro?',
          'En una herencia en diamante, ¿cómo se consigue una sola base común?',
        ],
        right: ['Con herencia virtual de la base', 'Heredando de ClapTrap con virtual public'],
      },
    ],
    wrong: [
      'Haciendo ClapTrap abstracta',
      'Con un destructor virtual',
      'Heredando como private',
      'No se puede evitar',
    ],
    why: 'La herencia virtual (`class ScavTrap : virtual public ClapTrap`) comparte una única copia de la base entre todos los caminos del diamante.',
  },
  {
    id: 'cpp-exceptions',
    topic: 'c++',
    needs: { projects: FROM_05 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `throw`?', '¿Qué pasa al lanzar una excepción con throw?'],
        right: [
          'Corta lo que se está haciendo y salta al catch que la recoja',
          'Se busca hacia arriba un catch de ese tipo',
        ],
        wrong: [
          'Termina el programa siempre',
          'Devuelve -1',
          'Imprime el error y sigue',
          'Reinicia la función',
        ],
      },
      {
        ask: [
          '¿Qué método se sobrescribe para dar el mensaje de una excepción?',
          '¿Con qué método explica el error una clase que hereda de std::exception?',
        ],
        right: ['what()'],
        wrong: ['message()', 'error()', 'toString()'],
      },
    ],
    wrong: ['Termina el programa siempre', 'Devuelve -1', 'Imprime el error y sigue'],
    why: 'throw sube por la pila de llamadas, destruyendo lo local, hasta el catch que encaje; si no hay ninguno, termina.',
  },
  {
    id: 'cpp-catch-ref',
    topic: 'c++',
    needs: { projects: FROM_05 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué se captura con `catch (std::exception &e)` y no por valor?',
          '¿Para qué sirve capturar una excepción por referencia?',
        ],
        right: [
          'Para no copiarla ni perder el tipo real de la hija',
          'Para que what() sea el de la clase real',
        ],
      },
    ],
    wrong: [
      'Porque por valor no compila',
      'Para poder modificarla siempre',
      'Porque es más corto de escribir',
      'Para poder relanzarla',
    ],
    why: 'Por valor se copia como std::exception y se pierde la parte de la hija (slicing).',
  },
  {
    id: 'cpp-casts',
    topic: 'c++',
    needs: { projects: FROM_06 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué cast comprueba en ejecución que un puntero a Base es en realidad un Derived?',
          '¿Qué cast sirve para saber el tipo real de un objeto polimórfico?',
        ],
        right: ['dynamic_cast'],
        wrong: ['static_cast', 'reinterpret_cast', 'const_cast'],
      },
      {
        ask: [
          '¿Qué cast reinterpreta los bits de un puntero como otro tipo (por ejemplo, uintptr_t)?',
          '¿Qué cast se usa para convertir un puntero en un entero?',
        ],
        right: ['reinterpret_cast'],
        wrong: ['dynamic_cast', 'static_cast', 'const_cast'],
      },
      {
        ask: [
          '¿Qué cast usas para convertir un double en int?',
          '¿Qué cast hace una conversión normal entre tipos numéricos?',
        ],
        right: ['static_cast'],
        wrong: ['dynamic_cast', 'reinterpret_cast', 'const_cast'],
      },
    ],
    wrong: ['const_cast', 'type_cast', 'implicit_cast'],
    why: 'static_cast convierte en compilación, dynamic_cast comprueba en ejecución y reinterpret_cast cambia el tipo de los bits.',
  },
  {
    id: 'cpp-dynamic-null',
    topic: 'c++',
    needs: { projects: FROM_06 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué hace `dynamic_cast<B*>(p)` si p no apunta a un B?',
          '¿Qué devuelve un dynamic_cast de puntero que no encaja?',
        ],
        right: ['Devuelve un puntero nulo'],
        wrong: [
          'Lanza std::bad_cast',
          'Devuelve p sin cambiar',
          'No compila',
          'Termina el programa',
        ],
      },
      {
        ask: [
          '¿Qué hace `dynamic_cast<B&>(r)` si r no es un B?',
          '¿Qué pasa con un dynamic_cast de referencia que no encaja?',
        ],
        right: ['Lanza std::bad_cast'],
        wrong: [
          'Devuelve un puntero nulo',
          'Devuelve r sin cambiar',
          'No compila',
          'Termina el programa',
        ],
      },
    ],
    wrong: ['No compila', 'Devuelve p sin cambiar', 'Termina el programa'],
    why: 'No existe una referencia nula, así que el de referencia lanza bad_cast; el de puntero da NULL.',
  },
  {
    id: 'cpp-templates',
    topic: 'c++',
    needs: { projects: FROM_07 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué las plantillas suelen ir enteras en el .hpp?',
          '¿Por qué el código de una template se pone en la cabecera?',
        ],
        right: [
          'Porque el compilador necesita verlas para generar cada versión',
          'Porque se instancian al usarlas con un tipo concreto',
        ],
        wrong: [
          'Por convención, sin más',
          'Porque no se pueden compilar',
          'Para que ocupen menos',
          'Porque son privadas',
        ],
      },
      {
        ask: [
          '¿Qué hace `template <typename T> T max(T a, T b)`?',
          '¿Qué permite una función plantilla como esta?',
        ],
        right: [
          'Sirve para cualquier tipo que se pueda comparar',
          'Genera una versión por cada tipo con que se use',
        ],
        wrong: ['Solo funciona con int', 'Convierte todo a double', 'Se ejecuta más lenta'],
      },
    ],
    wrong: ['Por convención, sin más', 'Porque no se pueden compilar', 'Para que ocupen menos'],
    why: 'Una plantilla no es código hasta que se usa con un tipo; para generarlo, el compilador tiene que verla.',
  },
  {
    id: 'cpp-containers',
    topic: 'c++',
    needs: { projects: FROM_08 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué contenedor de la STL guarda pares clave-valor ordenados por clave?',
          '¿Qué contenedor usas para un diccionario ordenado?',
        ],
        right: ['std::map'],
        wrong: ['std::vector', 'std::list', 'std::stack'],
      },
      {
        ask: [
          '¿Qué contenedor guarda los elementos seguidos en memoria y deja acceder por índice?',
          '¿Cuál es el array dinámico de la STL?',
        ],
        right: ['std::vector'],
        wrong: ['std::map', 'std::list', 'std::stack'],
      },
    ],
    wrong: ['std::stack', 'std::list', 'std::queue'],
    why: 'vector es un array que crece; map, un árbol ordenado por clave; list, una lista doblemente enlazada.',
  },
  {
    id: 'cpp-iterator-invalid',
    topic: 'c++',
    needs: { projects: FROM_08 },
    kind: 'long',
    level: 4,
    code: 'std::vector<int> v;\nv.push_back(1);\nstd::vector<int>::iterator it = v.begin();\nfor (int i = 0; i < 100; i++)\n    v.push_back(i);\nstd::cout << *it;',
    forms: [
      {
        ask: ['¿Qué problema tiene?', '¿Es seguro leer *it al final?'],
        right: [
          'Al crecer, el vector puede cambiar de sitio y el iterador queda inválido',
          'No: push_back puede invalidar it',
        ],
      },
    ],
    wrong: ['Imprime 1 siempre', 'Imprime 99', 'No compila', 'Imprime 0'],
    why: 'Si el vector necesita más sitio, reserva otro bloque y copia: los iteradores viejos apuntan a memoria liberada.',
  },
  {
    id: 'cpp-rpn',
    topic: 'c++',
    needs: { projects: cpp('09') },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuánto vale la expresión en notación polaca inversa «3 4 + 2 *»?',
          'En RPN, ¿cuánto da «3 4 + 2 *»?',
        ],
        right: ['14'],
        wrong: ['11', '10', '24', '9'],
      },
      {
        ask: [
          '¿Qué estructura se usa para evaluar notación polaca inversa?',
          'Para calcular RPN, ¿dónde se van guardando los números?',
        ],
        right: ['En una pila'],
        wrong: ['En un map', 'En una cola', 'En un árbol'],
      },
    ],
    wrong: ['11', '10', '24', '9'],
    why: 'Se apilan los números y cada operador saca dos: 3 + 4 = 7 y 7 · 2 = 14.',
  },
]
