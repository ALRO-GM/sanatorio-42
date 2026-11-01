/**
 * Banco de Not-games: C++ (los CPP 00 a 09). Clases, forma canónica,
 * herencia y polimorfismo, excepciones, casts, plantillas y la STL. Primero lo
 * general del lenguaje; después, lo de cada módulo y sus ejercicios.
 */

import type { Concept } from './types.js'

const cpp = (...modules: string[]): string[] => modules.map((module) => `cpp-module-${module}`)

// Cada concepto sale a quien hace su módulo o uno de después: lo de un módulo
// se sigue usando en los siguientes.
const FROM_00 = cpp('00', '01', '02', '03', '04', '05', '06', '07', '08', '09')
const FROM_01 = cpp('01', '02', '03', '04', '05', '06', '07', '08', '09')
const FROM_02 = cpp('02', '03', '04', '05', '06', '07', '08', '09')
const FROM_03 = cpp('03', '04', '05', '06', '07', '08', '09')
const FROM_04 = cpp('04', '05', '06', '07', '08', '09')
const FROM_05 = cpp('05', '06', '07', '08', '09')
const FROM_06 = cpp('06', '07', '08', '09')
const FROM_07 = cpp('07', '08', '09')
const FROM_08 = cpp('08', '09')
const FROM_09 = cpp('09')

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
          'Que cambia lo que es privado o público por defecto',
          'Que en class todo es privado por defecto, y en struct, público',
        ],
      },
    ],
    wrong: [
      'Que struct no puede tener métodos, solo atributos',
      'Que class va en el montón y struct en la pila',
      'Que struct no admite herencia ni métodos virtuales',
      'Nada: en C++ son idénticas en todo',
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
      'Que ocupa más memoria que un puntero normal',
      'Que solo sirve para tipos básicos, como int',
      'Que se puede reasignar para que nombre a otra variable',
      'Que es más lenta, porque se copia en cada uso',
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
      'Que devuelve un valor constante',
      'Que solo se puede llamar una vez por objeto',
      'Que es estático y no recibe this',
      'Que no se puede sobrescribir en una hija',
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
          'Que debe liberarse con delete[], no con delete',
          'Que lo creado con new[] se libera con delete[]',
        ],
      },
    ],
    wrong: [
      'Nada: delete libera el array entero',
      'Que hay que liberarlo con free(horde)',
      'Que hay que borrarlos uno a uno con delete',
      'Que new no puede crear arrays de objetos',
    ],
    why: 'Lo que se crea con new[] se libera con delete[], que llama al destructor de cada elemento; con delete a secas es comportamiento indefinido.',
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
          'Constructor, destructor, getter y setter de cada atributo',
          'Constructor, operator==, operator<< y un destructor virtual',
          'Constructor por defecto, constructor de movimiento, swap y destructor',
        ],
      },
      {
        ask: ['¿Cuándo se llama al constructor de copia?'],
        right: ['Al crear un objeto nuevo a partir de otro'],
        wrong: [
          'Al asignar un objeto a otro que ya existe',
          'Al destruir un objeto que se había copiado',
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
          'Doble delete: la copia por defecto copia el puntero',
          'Se libera dos veces el mismo array de ideas',
        ],
      },
    ],
    wrong: [
      'Nada: la copia por defecto duplica el array',
      'Hay una fuga de memoria, pero nada más grave',
      'No compila: falta el constructor de copia',
      'Solo se llama a un destructor, el de a',
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
          'Declararlo virtual solo en Dog, no en Animal',
          'Declarar makeSound como static en las dos',
          'Cambiar public por protected en la herencia',
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
        right: ['Para que delete por la base destruya también la hija'],
        wrong: [
          'Para que el destructor sea más rápido',
          'Para poder copiar objetos de la clase',
          'Porque si no es virtual, no compila',
          'Para que la clase pase a ser abstracta',
        ],
      },
      {
        ask: ['Sin destructor virtual, ¿qué hace `delete animal` si animal apunta a un Dog?'],
        right: ['Llama solo al destructor de Animal'],
        wrong: [
          'Llama a los dos destructores, como siempre',
          'No compila: falta el destructor virtual',
          'Llama solo al destructor de Dog',
        ],
      },
    ],
    wrong: ['Para que sea más rápido', 'Para poder copiar la clase', 'Porque si no, no compila'],
    why: 'Sin virtual, delete solo ve el tipo del puntero: la parte de la hija no se destruye (en rigor, es comportamiento indefinido).',
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
        right: ['Tener al menos un método virtual puro'],
        wrong: [
          'Llevar la palabra abstract delante de class',
          'No tener ningún constructor público',
          'Tener todos sus atributos privados',
          'Que algún método devuelva siempre 0',
        ],
      },
      {
        ask: ['¿Qué consigue `virtual void makeSound() const = 0;` en una clase?'],
        right: ['Que no se puedan crear objetos de esa clase'],
        wrong: [
          'Que makeSound devuelva siempre 0',
          'Que makeSound no se pueda redefinir en las hijas',
          'Que no se pueda heredar de esa clase',
        ],
      },
    ],
    wrong: ['Llevar la palabra abstract', 'No tener constructor', 'Tener todo privado'],
    why: '= 0 es un método virtual puro: la clase no se puede instanciar y las hijas deben implementarlo.',
  },
  {
    id: 'cpp-diamond',
    topic: 'c++',
    needs: { projects: FROM_03 },
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
      'Haciendo ClapTrap una clase abstracta',
      'Con un destructor virtual en ClapTrap',
      'Heredando de ClapTrap como private',
      'No se puede: siempre habrá dos ClapTrap',
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
          'Sale de la función y salta al catch que la recoja',
          'Se busca hacia arriba un catch de ese tipo',
        ],
        wrong: [
          'Termina el programa siempre, haya catch o no',
          'Hace que la función devuelva -1 al llamante',
          'Imprime el error por stderr y sigue en la línea siguiente',
          'Vuelve a ejecutar la función desde el principio',
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
      'Porque capturar por valor no compila en C++98',
      'Para poder modificarla dentro del catch siempre',
      'Porque es más corto de escribir que por valor',
      'Para que la excepción no se lance dos veces',
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
          'Porque el compilador las necesita al instanciarlas',
          'Porque se generan al usarlas con un tipo concreto',
        ],
        wrong: [
          'Por convención de estilo, sin más motivo',
          'Para que el ejecutable final ocupe menos',
          'Porque las plantillas son siempre privadas',
          'Porque así el programa se ejecuta más rápido',
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
        wrong: [
          'Solo funciona con int, el tipo por defecto',
          'Convierte a y b a double antes de compararlos',
          'Compara las direcciones de a y b, no los valores',
        ],
      },
    ],
    wrong: ['Por convención, sin más', 'Para que ocupen menos', 'Porque son privadas'],
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
        ask: ['¿Qué problema tiene?', '¿Qué pasa al leer *it al final?'],
        right: [
          'Puede leer memoria liberada: it quedó inválido',
          'Comportamiento indefinido: push_back invalidó it',
        ],
      },
    ],
    wrong: [
      'Ninguno: imprime 1, el primer elemento',
      'Ninguno: imprime 99, el último añadido',
      'No compila: it no puede ser de vector<int>',
      'Ninguno: imprime 0, el valor por defecto',
    ],
    why: 'Si el vector necesita más sitio, reserva otro bloque y copia: los iteradores viejos apuntan a memoria liberada.',
  },
  {
    id: 'cpp-rpn',
    topic: 'c++',
    needs: { projects: FROM_09 },
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

  // --- CPP 00 ------------------------------------------------------------------
  {
    id: 'cpp00-std',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué quiere decir el `std::` de `std::cout`?', 'En `std::string`, ¿qué es std?'],
        right: [
          'El espacio de nombres de la biblioteca estándar',
          'El namespace donde vive todo lo estándar',
        ],
        wrong: [
          'Una clase que agrupa métodos estáticos',
          'Un prefijo que marca lo que viene de la libc',
          'El nombre de la cabecera, como stdio.h',
        ],
      },
      {
        ask: [
          '¿Qué hace `std::endl` además de escribir un salto de línea?',
          'Aparte de bajar de línea, std::endl…',
        ],
        right: ['Vacía el búfer de la salida', 'Fuerza a escribir lo que hay en el búfer'],
        wrong: [
          'Cierra el flujo std::cout',
          'Añade un carácter nulo al final',
          'Escribe también un retorno de carro',
        ],
      },
      {
        ask: [
          'En los CPP, ¿qué pasa si escribes `using namespace std;`?',
          'Según las normas de los CPP, `using namespace` está…',
        ],
        right: ['Prohibido: la nota es -42', 'Prohibido, igual que friend'],
        wrong: [
          'Permitido: es lo que recomienda el enunciado',
          'Permitido, aunque la norma lo desaconseja',
          'Obligatorio en cada fichero .cpp',
        ],
      },
    ],
    wrong: [
      'Un tipo especial de puntero de C++',
      'Una macro de la cabecera iostream',
      'Permitido solo dentro de main',
    ],
    why: 'std es el namespace de la biblioteca estándar; los CPP prohíben `using namespace` (y friend) para que se escriba std:: a mano, y std::endl además vacía el búfer.',
  },
  {
    id: 'cpp00-megaphone',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué imprime `./megaphone` sin argumentos, en el ex00 de CPP 00?',
          'Si llamas a megaphone sin nada que gritar, saca…',
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
          '¿Qué imprime `./megaphone hola mundo`?',
          'Con los argumentos hola y mundo, megaphone saca…',
        ],
        right: ['HOLAMUNDO'],
        wrong: ['HOLA MUNDO', 'Hola Mundo', 'hola mundo'],
      },
    ],
    wrong: ['MUNDO HOLA', 'HOLA', 'MUNDO'],
    why: 'megaphone pasa a mayúsculas cada argumento y los escribe seguidos, sin añadir espacios; sin argumentos, suelta el ruido de acople.',
  },
  {
    id: 'cpp00-phonebook',
    topic: 'c++',
    needs: { projects: FROM_00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuántos contactos guarda como mucho el PhoneBook de CPP 00?',
          '¿Cuántos Contact caben en el array del PhoneBook?',
        ],
        right: ['8'],
        wrong: ['10', '16', '5', '100'],
      },
      {
        ask: [
          '¿Qué pasa al añadir un contacto con el PhoneBook ya lleno?',
          'Con el PhoneBook lleno, ADD…',
        ],
        right: ['Sustituye al contacto más antiguo', 'Pisa el contacto que lleva más tiempo'],
        wrong: [
          'Rechaza el contacto y avisa de que está lleno',
          'Sustituye al último contacto que se añadió',
          'Reserva más sitio con new para el nuevo',
        ],
      },
      {
        ask: [
          'En SEARCH, ¿cómo se enseña un campo de más de 10 caracteres?',
          'Si un nombre no cabe en su columna de SEARCH, se enseña…',
        ],
        right: ['Cortado a 9 y con un punto al final', 'Sus 9 primeros caracteres y un «.»'],
        wrong: [
          'Entero, aunque descuadre la columna',
          'Cortado a 10, sin avisar de que falta',
          'Con «...» en lugar de las tres últimas letras',
        ],
      },
    ],
    wrong: ['12', '20', '4'],
    why: 'El PhoneBook es un array fijo de 8 (sin memoria dinámica) y el noveno pisa al más antiguo; SEARCH alinea a la derecha columnas de 10 con std::setw(10) y trunca con un punto.',
  },

  // --- CPP 01 ------------------------------------------------------------------
  {
    id: 'cpp01-zombie',
    topic: 'c++',
    needs: { projects: FROM_01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuándo conviene crear el Zombie en el montón, como newZombie?',
          'newZombie devuelve un Zombie creado con new porque…',
        ],
        right: [
          'Tiene que seguir vivo al salir de la función',
          'Quien llama lo usará después de que la función acabe',
        ],
        wrong: [
          'Los objetos con std::string no caben en la pila',
          'Lo creado con new va más rápido al anunciarse',
          'Así se llama solo a su destructor al acabar main',
        ],
      },
      {
        ask: [
          'En randomChump, ¿por qué el Zombie puede ir en la pila?',
          'randomChump crea su Zombie como variable local porque…',
        ],
        right: [
          'Solo se usa dentro de la función y muere con ella',
          'No hace falta que viva más que la función',
        ],
        wrong: [
          'En la pila el Zombie no llega a destruirse nunca',
          'Lo que hay en la pila hay que liberarlo con delete',
          'Así se puede devolver su dirección sin peligro',
        ],
      },
    ],
    wrong: [
      'Porque el enunciado prohíbe usar new',
      'Porque en la pila se puede liberar dos veces',
      'Porque un Zombie no tiene destructor',
    ],
    why: 'Lo de la pila muere al acabar la función (y su destructor se llama solo); lo del montón vive hasta su delete, así que sirve para devolverlo.',
  },
  {
    id: 'cpp01-weapon',
    topic: 'c++',
    needs: { projects: FROM_01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En el ex03 de CPP 01, ¿por qué HumanA puede guardar su Weapon como referencia?',
          'HumanA recibe el arma en el constructor; eso le permite…',
        ],
        right: [
          'Tiene arma siempre, desde que se construye',
          'Nunca está sin arma ni cambia de arma',
        ],
        wrong: [
          'Las referencias se copian más rápido que el arma',
          'Así el arma se destruye a la vez que HumanA',
          'Las referencias pueden quedar vacías hasta setWeapon',
        ],
      },
      {
        ask: [
          'En el ex03 de CPP 01, ¿por qué HumanB guarda el Weapon con un puntero?',
          'HumanB recibe el arma más tarde, con setWeapon; por eso…',
        ],
        right: [
          'Puede estar sin arma un tiempo, y eso es NULL',
          'Empieza desarmado y el arma llega después',
        ],
        wrong: [
          'Las referencias no pueden ser atributos de clase',
          'Así el arma se copia entera al llamar a setWeapon',
          'Un puntero ocupa menos memoria que una referencia',
        ],
      },
    ],
    wrong: [
      'Porque el enunciado prohíbe las referencias',
      'Porque así HumanB puede borrar el arma',
      'Porque Weapon no tiene constructor de copia',
    ],
    why: 'Una referencia se inicializa al construir y no puede ser nula; un puntero puede empezar a NULL y apuntar al arma cuando llegue. Los dos ven los cambios de setType.',
  },
  {
    id: 'cpp01-sed',
    topic: 'c++',
    needs: { projects: FROM_01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En el ex04 de CPP 01, ¿qué fichero crea el programa a partir de «notas»?',
          'Si al ex04 le pasas el fichero notas, escribe el resultado en…',
        ],
        right: ['notas.replace'],
        wrong: ['notas.out', 'notas.sed', 'replace.notas'],
      },
      {
        ask: [
          'En el ex04 de CPP 01, ¿con qué se lee y se escribe el fichero?',
          'Para abrir los ficheros del ex04 sin funciones de C, se usan…',
        ],
        right: ['`std::ifstream` y `std::ofstream`'],
        wrong: [
          '`fopen`, `fgets` y `fputs`',
          '`open`, `read` y `write`',
          '`std::cin` y `std::cout`',
        ],
      },
      {
        ask: [
          'Sin poder usar `std::string::replace`, ¿cómo se sustituye s1 por s2?',
          'En el ex04 de CPP 01, el cambio de s1 por s2 se hace…',
        ],
        right: [
          'Buscando con find y juntando trozos con substr',
          'Con find para cada aparición y armando otra cadena',
        ],
        wrong: [
          'Con std::replace de <algorithm> sobre la cadena',
          'Llamando a sed desde el programa con system()',
          'Con std::regex_replace sobre cada línea leída',
        ],
      },
    ],
    wrong: ['notas.new', 'notas.txt', 'notas.copy'],
    why: 'El ex04 lee con std::ifstream, escribe <fichero>.replace con std::ofstream y sustituye cada s1 a mano: replace y las funciones de ficheros de C están prohibidas.',
  },
  {
    id: 'cpp01-harl',
    topic: 'c++',
    needs: { projects: FROM_01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo pide el enunciado que Harl elija entre debug, info, warning y error?',
          'En complain(level), Harl llama al método de cada nivel…',
        ],
        right: ['Con punteros a funciones miembro', 'Con un array de punteros a métodos'],
        wrong: [
          'Con una cadena de if y else if',
          'Con un switch sobre el texto del nivel',
          'Con herencia: una clase hija por nivel',
        ],
      },
      {
        ask: ['¿Cómo se llama al puntero a método `f` sobre el objeto actual?'],
        right: ['`(this->*f)()`'],
        wrong: ['`this->f()`', '`(*f)(this)`', '`this.*f()`'],
      },
    ],
    wrong: [
      'Con una función virtual por nivel',
      'Con un std::map de cadenas',
      'Con macros del preprocesador',
    ],
    why: 'El ex05 prohíbe el bosque de if/else: se guarda un array de punteros a métodos (`void (Harl::*)()`) y se llama al del nivel con `(this->*f)()`.',
  },

  // --- CPP 02 ------------------------------------------------------------------
  {
    id: 'cpp02-fixed',
    topic: 'c++',
    needs: { projects: FROM_02 },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cuántos bits fraccionarios tiene el Fixed de CPP 02?',
          '¿Cuántos bits guarda Fixed para la parte decimal?',
        ],
        right: ['8'],
        wrong: ['16', '4', '32', '10'],
      },
      {
        ask: [
          'Con 8 bits fraccionarios, ¿qué entero guarda Fixed para 1.5?',
          '¿Cuánto vale por dentro un Fixed que representa 1.5?',
        ],
        right: ['384'],
        wrong: ['150', '15', '192', '768'],
      },
      {
        ask: [
          'Para pasar un float a Fixed, ¿qué función de <cmath> permite el enunciado?',
          '¿Con qué función se redondea al convertir un float en Fixed?',
        ],
        right: ['roundf'],
        wrong: ['floorf', 'truncf', 'ceilf'],
      },
    ],
    wrong: ['256', '2', '64'],
    why: 'Con 8 bits fraccionarios el valor se guarda multiplicado por 256 (1 << 8): 1.5 es 384, y de float se pasa con roundf(f * 256) para no truncar.',
  },
  {
    id: 'cpp02-operators',
    topic: 'c++',
    needs: { projects: FROM_02 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Cómo se declara la sobrecarga de << para imprimir un Fixed?',
          'Para poder escribir `std::cout << fixed`, se declara…',
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
          '¿Por qué operator<< devuelve el std::ostream que recibe?',
          'Que operator<< devuelva el flujo sirve para…',
        ],
        right: ['Para encadenar: std::cout << a << b', 'Para poder seguir con otro << detrás'],
        wrong: [
          'Para que el Fixed se pueda modificar al imprimir',
          'Para saber cuántos caracteres se escribieron',
          'Porque si no, no se imprime nada en pantalla',
        ],
      },
    ],
    wrong: [
      'Porque lo exige la forma canónica',
      'Para que sea un método const',
      'Para que funcione también con printf',
    ],
    why: 'operator<< es una función libre que recibe el flujo por referencia y lo devuelve, para que `std::cout << a << b` siga con el mismo flujo.',
  },
  {
    id: 'cpp02-increment',
    topic: 'c++',
    needs: { projects: FROM_02 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué devuelve `a++` sobre un Fixed?', 'El ++ sufijo de Fixed devuelve…'],
        right: ['Una copia con el valor de antes', 'El valor que tenía a antes de sumar'],
        wrong: [
          'Una referencia a a, ya incrementado',
          'Nada: el operador sufijo es void',
          'El valor nuevo, igual que ++a',
        ],
      },
      {
        ask: [
          '¿Cómo se distinguen al declararlos el ++ sufijo y el prefijo?',
          'Para que el compilador sepa cuál es `a++` y cuál `++a`…',
        ],
        right: [
          'El sufijo lleva un parámetro int que no se usa',
          'operator++(int) es el sufijo; operator++(), el prefijo',
        ],
        wrong: [
          'El sufijo se declara fuera de la clase',
          'El prefijo devuelve void y el sufijo, Fixed',
          'No se distinguen: uno solo sirve para los dos',
        ],
      },
      {
        ask: [
          '¿Cuánto suma `++a` a un Fixed de 8 bits fraccionarios?',
          'El paso más pequeño que puede dar ese Fixed es…',
        ],
        right: ['0.00390625'],
        wrong: ['1', '0.1', '0.5', '0.0078125'],
      },
    ],
    wrong: ['Lo mismo que el prefijo', 'Un puntero al objeto', 'Una referencia constante'],
    why: 'El prefijo suma y devuelve *this por referencia; el sufijo, marcado con un int falso, guarda una copia, suma y devuelve la copia. Con 8 bits, un paso es 1/256.',
  },

  // --- CPP 03 ------------------------------------------------------------------
  {
    id: 'cpp03-traps',
    topic: 'c++',
    needs: { projects: FROM_03 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué función propia añade ScavTrap a lo que hereda de ClapTrap?',
          'ScavTrap entra en modo guardián con…',
        ],
        right: ['guardGate()'],
        wrong: ['highFivesGuys()', 'beRepaired()', 'whoAmI()'],
      },
      {
        ask: [
          '¿Qué función propia añade FragTrap a lo que hereda de ClapTrap?',
          'FragTrap pide chocar esos cinco con…',
        ],
        right: ['highFivesGuys()'],
        wrong: ['guardGate()', 'takeDamage()', 'whoAmI()'],
      },
      {
        ask: [
          '¿Cuántos hit points tiene un ClapTrap al crearse?',
          '¿Con cuántos puntos de vida empieza un ClapTrap?',
        ],
        right: ['10'],
        wrong: ['100', '50', '20'],
      },
    ],
    wrong: ['attack()', 'repair()', '0'],
    why: 'ClapTrap empieza con 10 de vida, 10 de energía y 0 de ataque; ScavTrap (100, 50, 20) añade guardGate() y FragTrap (100, 100, 30), highFivesGuys().',
  },
  {
    id: 'cpp03-order',
    topic: 'c++',
    needs: { projects: FROM_03 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Al crear un ScavTrap, ¿qué constructor se ejecuta primero?',
          'Al construir un ScavTrap, el primer constructor que corre es…',
        ],
        right: ['El de ClapTrap, la base', 'El constructor de la clase base'],
        wrong: [
          'El de ScavTrap, la hija',
          'El que se declare antes en el .hpp',
          'Solo el de ScavTrap: el de la base no se llama',
        ],
      },
      {
        ask: [
          'Al destruirse un ScavTrap, ¿qué destructor se ejecuta primero?',
          'Al destruir un ScavTrap, el primer destructor que corre es…',
        ],
        right: ['El de ScavTrap, la hija', 'El destructor de la clase hija'],
        wrong: [
          'El de ClapTrap, la base',
          'El que se declare antes en el .hpp',
          'Solo el de ClapTrap: el de la hija no se llama',
        ],
      },
    ],
    wrong: ['Los dos a la vez', 'Depende del compilador', 'Depende de los atributos'],
    why: 'Se construye de la base a la hija y se destruye al revés: la hija se apoya en la base, así que la base nace antes y muere después.',
  },

  // --- CPP 04 ------------------------------------------------------------------
  {
    id: 'cpp04-brain',
    topic: 'c++',
    needs: { projects: FROM_04 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Al copiar un Dog, ¿qué hace una copia profunda de su Brain?',
          'Para que dos Dog no compartan Brain, al copiar hay que…',
        ],
        right: ['Crear un Brain nuevo con las mismas ideas', 'Hacer new Brain(*other.brain)'],
        wrong: [
          'Copiar el puntero brain del otro Dog',
          'Compartir el Brain y contar cuántos lo usan',
          'Dejar brain a NULL hasta que se use',
        ],
      },
      {
        ask: [
          '¿Cuántas ideas guarda un Brain en CPP 04?',
          '¿De cuántos std::string es el array ideas de Brain?',
        ],
        right: ['100'],
        wrong: ['10', '42', '256', '1000'],
      },
      {
        ask: [
          'En operator= de Dog, ¿qué hay que hacer antes de copiar el Brain del otro?',
          'Antes de asignarle el Brain de otro Dog, operator= tiene que…',
        ],
        right: [
          'Comprobar que no es el mismo y borrar su Brain',
          'Mirar que this no sea &other y liberar su Brain',
        ],
        wrong: [
          'Nada: basta con brain = other.brain',
          'Llamar a mano al destructor de Animal',
          'Crear un Dog temporal con new y copiarlo',
        ],
      },
    ],
    wrong: ['Nada en especial', '8', 'Llamar a delete this'],
    why: 'Cada Dog tiene su propio Brain: al copiar se hace new con las ideas del otro y, al asignar, se libera el viejo (salvo si es el mismo objeto) para no perderlo.',
  },
  {
    id: 'cpp04-amateria',
    topic: 'c++',
    needs: { projects: FROM_04 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En C++98, ¿qué es una interfaz como ICharacter?',
          'Sin palabra interface en C++, una interfaz se escribe como…',
        ],
        right: [
          'Una clase con solo métodos virtuales puros',
          'Una clase abstracta sin atributos ni código',
        ],
        wrong: [
          'Una clase con todos sus métodos estáticos',
          'Una struct con punteros a funciones de C',
          'Una plantilla que se rellena con cada tipo',
        ],
      },
      {
        ask: [
          '¿Qué hace unequip con la materia que quita del inventario?',
          'En el ex03 de CPP 04, unequip(idx)…',
        ],
        right: ['No la borra: solo la saca del inventario', 'La suelta sin hacer delete'],
        wrong: [
          'La borra con delete en ese momento',
          'La devuelve a la MateriaSource',
          'La pasa al siguiente hueco libre',
        ],
      },
      {
        ask: [
          '¿Cuántas materias caben en el inventario de un Character?',
          '¿Cuántas AMateria puede aprender una MateriaSource?',
        ],
        right: ['4'],
        wrong: ['3', '5', '8', '10'],
      },
    ],
    wrong: ['Una clase final', 'Una clase sin constructor', '2'],
    why: 'AMateria es abstracta (clone() = 0) e ICharacter e IMateriaSource son interfaces: solo virtuales puros. El inventario tiene 4 huecos y unequip no debe borrar la materia.',
  },

  // --- CPP 05 ------------------------------------------------------------------
  {
    id: 'cpp05-bureaucrat',
    topic: 'c++',
    needs: { projects: FROM_05 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cuál es la nota más alta que puede tener un Bureaucrat?',
          'En CPP 05, la mejor nota posible de un Bureaucrat es…',
        ],
        right: ['1'],
        wrong: ['150', '0', '100', '10'],
      },
      {
        ask: [
          '¿Qué pasa al crear un Bureaucrat con nota 0?',
          'Crear un Bureaucrat con una nota mejor que 1…',
        ],
        right: ['Lanza Bureaucrat::GradeTooHighException'],
        wrong: [
          'Lanza Bureaucrat::GradeTooLowException',
          'Se crea con la nota ajustada a 1',
          'Se crea con nota 0 sin quejarse',
        ],
      },
      {
        ask: [
          'Si un Bureaucrat tiene nota 3, ¿qué nota tiene tras incrementGrade()?',
          'Subir de nota a un Bureaucrat con un 3 lo deja en…',
        ],
        right: ['2'],
        wrong: ['4', '3', '13'],
      },
    ],
    wrong: ['Devuelve false', '151', 'Imprime un aviso y sigue'],
    why: 'La nota va de 1 (la más alta) a 150 (la más baja): subir de nota resta, y salirse por arriba lanza GradeTooHighException.',
  },
  {
    id: 'cpp05-forms',
    topic: 'c++',
    needs: { projects: FROM_05 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué fichero crea ShrubberyCreationForm con el objetivo «home»?',
          'Al ejecutar ShrubberyCreationForm("home"), los árboles van a…',
        ],
        right: ['home_shrubbery'],
        wrong: ['shrubbery_home', 'home.shrubbery', 'home_tree'],
      },
      {
        ask: [
          '¿Cuándo falla execute() de un AForm?',
          'Un Bureaucrat no puede ejecutar un AForm si…',
        ],
        right: ['No está firmado o su nota no llega', 'Falta la firma o la nota no basta'],
        wrong: [
          'Solo si el Bureaucrat tiene nota 150',
          'Nunca: firmarlo ya basta para ejecutarlo',
          'Si ya se ejecutó una vez antes',
        ],
      },
      {
        ask: [
          '¿Qué devuelve Intern::makeForm?',
          'El becario de CPP 05 entrega el formulario como…',
        ],
        right: ['Un puntero a un AForm nuevo', 'Un AForm* creado con new'],
        wrong: [
          'Un AForm por valor, ya copiado',
          'Una referencia al último formulario',
          'El nombre del formulario que creó',
        ],
      },
    ],
    wrong: ['home_garden', 'Nada', 'Un Bureaucrat nuevo'],
    why: 'AForm comprueba firma y nota antes de ejecutar; Shrubbery escribe árboles ASCII en <objetivo>_shrubbery, y Intern crea con new el formulario que le piden y devuelve el puntero.',
  },

  // --- CPP 06 ------------------------------------------------------------------
  {
    id: 'cpp06-scalar',
    topic: 'c++',
    needs: { projects: FROM_06 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué saca ScalarConverter::convert("0") en la línea de char?',
          'Con el literal 0, la línea char de ScalarConverter dice…',
        ],
        right: ['char: Non displayable'],
        wrong: ['char: Non printable', 'char: impossible', "char: '0'"],
      },
      {
        ask: [
          '¿Qué saca ScalarConverter::convert("nan") en la línea de char?',
          'Con el literal nan, la línea char de ScalarConverter dice…',
        ],
        right: ['char: impossible'],
        wrong: ['char: Non displayable', 'char: nan', "char: 'n'"],
      },
      {
        ask: [
          '¿Qué pseudoliterales float tiene que entender ScalarConverter?',
          'Además de los números, ScalarConverter acepta como float…',
        ],
        right: ['-inff, +inff y nanf'],
        wrong: ['-inf, +inf y nan', 'NaN, Inf y -Inf', 'FLT_MIN, FLT_MAX y 0f'],
      },
    ],
    wrong: ['char: 0', 'char: NULL', 'INFINITY y NAN'],
    why: 'convert detecta el tipo del literal y lo pasa a char, int, float y double: el 0 no se ve como char, nan no cabe en un char, y los pseudoliterales float llevan f.',
  },
  {
    id: 'cpp06-serialize',
    topic: 'c++',
    needs: { projects: FROM_06 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué tipo devuelve `Serializer::serialize(Data *ptr)`?',
          'En el ex01 de CPP 06, el puntero se convierte en un…',
        ],
        right: ['uintptr_t'],
        wrong: ['unsigned int', 'void *', 'long double'],
      },
      {
        ask: [
          '¿Qué tiene que dar deserialize(serialize(p))?',
          'Ida y vuelta por el Serializer, el puntero p queda…',
        ],
        right: ['El mismo puntero p', 'Un puntero igual a p'],
        wrong: [
          'Una copia nueva del Data de p',
          'Un puntero nulo si p era válido',
          'El número de bytes de Data',
        ],
      },
      {
        ask: [
          'Sin <typeinfo>, ¿cómo sabe identify(Base &p) si es A, B o C?',
          'En identify por referencia, el tipo real se averigua…',
        ],
        right: [
          'Probando dynamic_cast de referencia y capturando el fallo',
          'Con dynamic_cast<A&>(p) y un catch para cada intento',
        ],
        wrong: [
          'Con typeid(p).name(), comparando el nombre',
          'Con dynamic_cast<A*>(&p) y mirando si da NULL',
          'Leyendo un atributo type que rellena Base',
        ],
      },
    ],
    wrong: ['int', 'Un puntero a Base', 'Con static_cast a cada clase'],
    why: 'uintptr_t es un entero con sitio para un puntero, y reinterpret_cast va y vuelve sin perder nada; identify(Base&) no puede usar punteros, así que prueba casts de referencia, que lanzan si fallan.',
  },

  // --- CPP 07 ------------------------------------------------------------------
  {
    id: 'cpp07-whatever',
    topic: 'c++',
    needs: { projects: FROM_07 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En el ex00 de CPP 07, si a y b son iguales, ¿qué devuelve max(a, b)?',
          'Con dos valores iguales, las plantillas min y max de CPP 07 devuelven…',
        ],
        right: ['El segundo, b', 'El segundo argumento'],
        wrong: ['El primero, a', 'Una copia nueva de a', 'Una excepción, no un valor'],
      },
      {
        ask: [
          '¿Qué hace `iter(array, length, f)` en CPP 07?',
          'La plantilla iter del ex01 de CPP 07…',
        ],
        right: ['Llama a f con cada elemento del array', 'Aplica f a cada elemento, uno a uno'],
        wrong: [
          'Devuelve un array nuevo con f aplicada',
          'Llama a f una vez con el array entero',
          'Ordena el array usando f para comparar',
        ],
      },
    ],
    wrong: ['Ninguno: no compila', 'El mayor de los dos', 'Busca f en el array'],
    why: 'El enunciado lo fija: con valores iguales, min y max devuelven el segundo; iter recorre el array y llama a f con cada elemento.',
  },
  {
    id: 'cpp07-array',
    topic: 'c++',
    needs: { projects: FROM_07 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué crea `Array<int> a(3)` en el ex02 de CPP 07?',
          'Con `Array<int> a(3)`, lo que hay dentro es…',
        ],
        right: ['Un array de 3 int inicializados por defecto'],
        wrong: [
          'Un array vacío con sitio reservado para 3',
          'Un array de 3 int sin iniciar, con basura',
          'Un array con un solo elemento, que vale 3',
        ],
      },
      {
        ask: [
          '¿Qué hace operator[] de Array con un índice fuera de rango?',
          'Si pides a[10] a un Array de 3 elementos…',
        ],
        right: ['Lanza una std::exception', 'Lanza una excepción'],
        wrong: [
          'Devuelve el último elemento',
          'Agranda el array hasta ese índice',
          'Devuelve un valor por defecto',
        ],
      },
    ],
    wrong: ['Nada', 'Un std::vector de 3', 'Devuelve NULL'],
    why: 'Array reserva con new[] los n elementos inicializados por defecto, se copia en profundo y operator[] comprueba el índice y lanza si se sale.',
  },

  // --- CPP 08 ------------------------------------------------------------------
  {
    id: 'cpp08-span',
    topic: 'c++',
    needs: { projects: FROM_08 },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué algoritmo de la STL usa easyfind para buscar el entero?',
          'easyfind encuentra la primera aparición con…',
        ],
        right: ['`std::find`'],
        wrong: ['`std::sort`', '`std::binary_search`', '`std::accumulate`'],
      },
      {
        ask: [
          'Un Span tiene 6, 3, 17, 9 y 11. ¿Cuánto da shortestSpan()?',
          'Con 6, 3, 17, 9 y 11 en un Span, la menor distancia entre dos es…',
        ],
        right: ['2'],
        wrong: ['3', '14', '1', '6'],
      },
      {
        ask: [
          'Con el Span ya lleno, ¿qué hace addNumber?',
          'Si añades un número de más a un Span de N…',
        ],
        right: ['Lanza una excepción', 'Lanza un error con throw'],
        wrong: [
          'Sustituye el número más antiguo',
          'Amplía el Span al doble de N',
          'Ignora el número sin avisar',
        ],
      },
    ],
    wrong: ['`std::count`', '`std::merge`', '0'],
    why: 'easyfind es std::find sobre el contenedor; Span guarda hasta N números, lanza si se pasa y shortestSpan es la menor diferencia entre dos (11 − 9 da 2).',
  },
  {
    id: 'cpp08-mutantstack',
    topic: 'c++',
    needs: { projects: FROM_08 },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿De dónde saca MutantStack los iteradores que std::stack no da?',
          'MutantStack puede dar begin() y end() porque…',
        ],
        right: [
          'Del contenedor protegido c de std::stack',
          'Hereda de std::stack y usa su miembro c',
        ],
        wrong: [
          'Copia la pila entera a un std::vector',
          'Hereda de std::vector en vez de std::stack',
          'Recorre la pila con top() y pop()',
        ],
      },
      {
        ask: [
          '¿Sobre qué contenedor está hecho std::stack si no le dices otro?',
          'El contenedor por defecto de std::stack es…',
        ],
        right: ['`std::deque`'],
        wrong: ['`std::vector`', '`std::list`', '`std::queue`'],
      },
    ],
    wrong: ['Con un puntero a top()', '`std::map`', 'Con friend en std::stack'],
    why: 'std::stack es un adaptador con un miembro protegido c (por defecto, std::deque): una hija lo ve y puede devolver c.begin() y c.end().',
  },

  // --- CPP 09 ------------------------------------------------------------------
  {
    id: 'cpp09-btc',
    topic: 'c++',
    needs: { projects: FROM_09 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Si una fecha de la entrada no está en la base, ¿qué tasa usa btc?',
          'En BitcoinExchange, para una fecha que no está en data.csv se usa…',
        ],
        right: ['La de la fecha anterior más cercana', 'La de la última fecha antes de esa'],
        wrong: [
          'La de la fecha posterior más cercana',
          'La media de la anterior y la siguiente',
          'Ninguna: imprime un error de fecha',
        ],
      },
      {
        ask: [
          '¿Qué devuelve `lower_bound(fecha)` en un std::map?',
          'En un std::map, lower_bound de una clave da…',
        ],
        right: [
          'La primera clave que no es menor que fecha',
          'La primera clave mayor o igual que la dada',
        ],
        wrong: [
          'La última clave estrictamente menor',
          'La clave más cercana, por arriba o por abajo',
          'El número de claves menores que la dada',
        ],
      },
      {
        ask: [
          '¿Qué valor acepta btc en cada línea de la entrada?',
          'En la entrada de btc, la cantidad de bitcoins tiene que ser…',
        ],
        right: ['Un número entre 0 y 1000', 'Un int o un float de 0 a 1000'],
        wrong: [
          'Cualquier float positivo, sin límite',
          'Un entero entre 1 y 100',
          'Un número entre -1000 y 1000',
        ],
      },
    ],
    wrong: ['La de la primera fecha de la base', 'Un número cualquiera', 'La clave más alta'],
    why: 'Las tasas van en un std::map por fecha: lower_bound da la primera no menor y, si no es la exacta, se retrocede una para quedarse con la anterior.',
  },
  {
    id: 'cpp09-pmergeme',
    topic: 'c++',
    needs: { projects: FROM_09 },
    kind: 'quick',
    level: 4,
    forms: [
      {
        ask: [
          '¿Qué algoritmo de ordenación pide PmergeMe?',
          'El ex02 de CPP 09 ordena los números con…',
        ],
        right: ['Merge-insertion, el de Ford-Johnson', 'El algoritmo de Ford-Johnson'],
        wrong: [
          'Quicksort con un pivote al azar',
          'Merge sort clásico, de arriba abajo',
          'Heap sort con std::make_heap',
        ],
      },
      {
        ask: [
          '¿Cuántos contenedores distintos usa PmergeMe como mínimo?',
          '¿En cuántos contenedores distintos se ordena la secuencia en PmergeMe?',
        ],
        right: ['2'],
        wrong: ['1', '3', '4'],
      },
      {
        ask: [
          'En CPP 09, ¿qué pasa con un contenedor que ya usaste en un ejercicio?',
          'En CPP 09, el std::map del ex00…',
        ],
        right: [
          'Ya no se puede usar en el resto del módulo',
          'No puede volver a salir en el ex01 ni en el ex02',
        ],
        wrong: [
          'Se puede reutilizar si es otra variable',
          'Hay que usarlo también en los otros dos',
          'Solo se puede volver a usar en el ex02',
        ],
      },
    ],
    wrong: ['Bubble sort', '5', 'Se puede usar donde quieras'],
    why: 'PmergeMe ordena con Ford-Johnson en dos contenedores y compara tiempos; en CPP 09 cada contenedor que usas queda gastado para el resto del módulo.',
  },
]
