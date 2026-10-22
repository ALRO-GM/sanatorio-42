/**
 * Banco de Not-games: Python (los módulos del plan nuevo y sus proyectos).
 * Lo del lenguaje sale a quien ha tocado Python; lo de proyectos concretos,
 * como JSON y modelos de lenguaje (call-me-maybe), a quien los hace.
 */

import type { Concept } from './types.js'

const CALL_ME_MAYBE = ['call-me-maybe']

export const PYTHON: readonly Concept[] = [
  {
    id: 'py-mutable-default',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'long',
    level: 4,
    code: 'def add(item, items=[]):\n    items.append(item)\n    return items\n\nadd(1)\nprint(add(2))',
    forms: [
      {
        ask: ['¿Qué imprime?', '¿Qué sale por pantalla?'],
        right: ['[1, 2]'],
        wrong: ['[2]', '[1]', '[]', '[2, 1]'],
      },
      {
        ask: [
          '¿Cómo se arregla para que cada llamada empiece con una lista vacía?',
          '¿Qué valor por defecto debería usar items?',
        ],
        right: ['None, y crear la lista dentro si items es None'],
        wrong: [
          'list, sin paréntesis',
          '[], escrito dos veces',
          'Una variable global con la lista',
        ],
      },
    ],
    wrong: ['[2]', '[1]', '[]'],
    why: 'El valor por defecto se crea una vez, al definir la función: todas las llamadas comparten la misma lista.',
  },
  {
    id: 'py-is-eq',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué diferencia hay entre `==` e `is`?'],
        right: ['== compara valores; is, si son el mismo objeto'],
        wrong: [
          'Ninguna: son lo mismo',
          'is es más rápido, y por lo demás igual',
          'is compara tipos; ==, valores',
          '== compara la dirección en memoria; is, el valor',
        ],
      },
      {
        ask: ['¿Qué comprueba `a is b`?'],
        right: ['Que a y b son el mismo objeto en memoria'],
        wrong: [
          'Que a y b valen lo mismo',
          'Que a y b son del mismo tipo',
          'Que b está dentro de a',
        ],
      },
    ],
    wrong: [
      'Ninguna: son lo mismo',
      'is es más rápido, y por lo demás igual',
      'is compara tipos; ==, valores',
    ],
    why: 'Dos listas iguales son == pero no is. Para None se usa `is None`.',
  },
  {
    id: 'py-copy',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'long',
    level: 3,
    code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)',
    forms: [
      {
        ask: ['¿Qué imprime?', '¿Cómo queda a?'],
        right: ['[1, 2, 3, 4]'],
        wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
      },
      {
        ask: [
          '¿Cómo se hace b como copia independiente de a?',
          '¿Qué hay que escribir para que cambiar b no cambie a?',
        ],
        right: ['b = a.copy()', 'b = list(a)', 'b = a[:]'],
        wrong: ['b = a', 'b == a', 'b = a.self'],
      },
    ],
    wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
    why: 'Asignar no copia: b y a son la misma lista. copy(), list() o [:] hacen una copia.',
  },
  {
    id: 'py-slicing',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué da `"programa"[1:4]`?', '¿Cuál es el resultado de `"programa"[1:4]`?'],
        right: ['"rog"'],
        wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
      },
      {
        ask: ['¿Qué da `"programa"[::-1]`?', '¿Cuál es el resultado de `"programa"[::-1]`?'],
        right: ['"amargorp"'],
        wrong: ['"programa"', '"a"', '"amargor"', '"p"'],
      },
    ],
    wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
    why: 'Del índice inicial (incluido) al final (sin incluir); el paso -1 lo recorre al revés.',
  },
  {
    id: 'py-dict-get',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué pasa con `d["x"]` si "x" no está en el diccionario?',
          '¿Qué pasa al acceder con corchetes a una clave que no existe?',
        ],
        right: ['Lanza KeyError'],
        wrong: ['Devuelve None', 'Devuelve 0', 'Crea la clave', 'Devuelve False'],
      },
      {
        ask: [
          '¿Qué devuelve `d.get("x")` si "x" no está?',
          '¿Qué da get con una clave que no existe?',
        ],
        right: ['None'],
        wrong: ['KeyError', '0', 'False', '""'],
      },
    ],
    wrong: ['Devuelve 0', 'Crea la clave', 'Devuelve False'],
    why: 'Los corchetes exigen que la clave exista; get devuelve None (o el valor por defecto que le des).',
  },
  {
    id: 'py-comprehension',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué da `[x * x for x in range(4)]`?',
          '¿Qué lista sale de `[x * x for x in range(4)]`?',
        ],
        right: ['[0, 1, 4, 9]'],
        wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
      },
      {
        ask: [
          '¿Qué da `[x for x in range(10) if x % 3 == 0]`?',
          '¿Qué lista sale de `[x for x in range(10) if x % 3 == 0]`?',
        ],
        right: ['[0, 3, 6, 9]'],
        wrong: ['[3, 6, 9]', '[0, 3, 6]', '[1, 4, 7]'],
      },
    ],
    wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
    why: 'range(n) va de 0 a n - 1, y el if filtra antes de añadir.',
  },
  {
    id: 'py-generator',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `yield` en una función?', '¿Qué cambia en una función que usa yield?'],
        right: [
          'La convierte en generador: da valores de uno en uno, cuando se piden',
          'Que devuelve un generador que calcula sobre la marcha',
        ],
      },
    ],
    wrong: [
      'La termina, como return',
      'Pausa el programa entero',
      'Lanza un hilo',
      'Hace que devuelva una lista con todo',
    ],
    why: 'Un generador se queda parado en cada yield y sigue desde ahí en la siguiente vuelta: no guarda todo en memoria.',
  },
  {
    id: 'py-exceptions',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'long',
    level: 3,
    code: 'try:\n    x = int("42a")\nexcept ValueError:\n    print("A")\nelse:\n    print("B")\nfinally:\n    print("C")',
    forms: [{ ask: ['¿Qué imprime?', '¿Qué letras salen, en orden?'], right: ['A y C'] }],
    wrong: ['B y C', 'A, B y C', 'Solo A', 'Solo C'],
    why: 'int("42a") lanza ValueError: entra en except; else solo va si no hubo error; finally va siempre.',
  },
  {
    id: 'py-classes',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué es `self` en un método?',
          '¿Qué recibe un método normal como primer parámetro?',
        ],
        right: ['El objeto sobre el que se llama el método', 'La instancia'],
        wrong: ['La clase', 'El módulo', 'La clase padre', 'Una palabra reservada sin significado'],
      },
      {
        ask: [
          '¿Qué método se ejecuta al crear un objeto?',
          '¿Cuál hace de «constructor» de una clase en Python?',
        ],
        right: ['__init__'],
        wrong: ['__main__', '__call__', '__str__'],
      },
    ],
    wrong: ['La clase', 'El módulo', 'La clase padre'],
    why: 'obj.metodo() es Clase.metodo(obj): self es ese obj. __init__ lo prepara al crearlo.',
  },
  {
    id: 'py-abc',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué pasa si intentas crear un objeto de una clase con un `@abstractmethod` sin implementar?',
          '¿Qué pasa al instanciar una clase abstracta (ABC) incompleta?',
        ],
        right: ['Lanza TypeError: no se puede instanciar'],
      },
    ],
    wrong: [
      'Se crea sin problema',
      'El método devuelve None',
      'Se llama al método del padre',
      'Avisa, pero sigue',
    ],
    why: 'Con ABC, Python impide crear objetos mientras quede algún método abstracto sin implementar.',
  },
  {
    id: 'py-typing',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué hace Python con las anotaciones de tipo al ejecutar (`def f(x: int) -> str`)?',
          '¿Qué pasa si le pasas un str a `def f(x: int)`?',
        ],
        right: [
          'Nada: no las comprueba; las usan herramientas como mypy',
          'Funciona igual: los tipos no se comprueban al ejecutar',
        ],
      },
    ],
    wrong: ['Lanza TypeError', 'Convierte x a int', 'No compila', 'Avisa siempre con un warning'],
    why: 'Las anotaciones son información; quien las comprueba es mypy (o similares), no el intérprete.',
  },
  {
    id: 'py-scope',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'long',
    level: 4,
    code: 'count = 0\n\ndef inc():\n    count += 1\n\ninc()',
    forms: [
      {
        ask: ['¿Qué pasa al llamar a inc()?', '¿Funciona este código?'],
        right: [
          'Falla con UnboundLocalError: count se trata como local',
          'Falla: dentro de inc, count es una variable local sin valor',
        ],
      },
    ],
    wrong: [
      'count pasa a valer 1',
      'No pasa nada',
      'count se queda en 0',
      'Se crea otra variable count que vale 1',
    ],
    why: 'Asignar a un nombre dentro de una función lo hace local; leerlo antes de asignarlo falla. Hace falta `global count`.',
  },
  {
    id: 'py-venv',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Para qué sirve un entorno virtual (venv)?', '¿Qué permite un venv?'],
        right: [
          'Tener los paquetes de cada proyecto aparte, sin mezclarlos',
          'Aislar las dependencias de un proyecto',
        ],
        wrong: [
          'Hacer Python más rápido',
          'Ejecutar Python en otra máquina',
          'Compilar a C',
          'Esconder el código',
        ],
      },
      {
        ask: [
          '¿Qué fichero lista los paquetes que necesita un proyecto, con pip?',
          '¿Qué fichero se le pasa a `pip install -r`?',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'Makefile', 'main.py'],
      },
    ],
    wrong: ['Hacer Python más rápido', 'Ejecutar Python en otra máquina', 'Compilar a C'],
    why: 'Cada venv tiene sus propios paquetes; requirements.txt dice cuáles instalar.',
  },
  {
    id: 'py-main-guard',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Para qué sirve `if __name__ == "__main__":`?',
          '¿Cuándo se ejecuta el código dentro de `if __name__ == "__main__":`?',
        ],
        right: [
          'Solo al ejecutar el fichero, no al importarlo',
          'Cuando el fichero se ejecuta directamente',
        ],
      },
    ],
    wrong: [
      'Siempre: es obligatorio',
      'Solo al importarlo',
      'Solo en Windows',
      'Solo al declarar la función main',
    ],
    why: 'Al importar, __name__ es el nombre del módulo; al ejecutar el fichero, "__main__".',
  },
  {
    id: 'py-json',
    topic: 'json',
    needs: { projects: CALL_ME_MAYBE },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cuál de estos es JSON válido?', '¿Cuál de estos objetos JSON está bien escrito?'],
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
          '¿Qué función convierte un texto JSON en un diccionario de Python?',
          '¿Qué se usa para leer JSON desde una cadena?',
        ],
        right: ['json.loads'],
        wrong: ['json.dumps', 'json.parse', 'eval'],
      },
    ],
    wrong: ["{'name': 'pepe', 'age': 3}", '{name: "pepe", age: 3}', '{"name": "pepe", "age": 3,}'],
    why: 'JSON exige comillas dobles en claves y textos y no admite comas finales. loads lee; dumps escribe.',
  },
  {
    id: 'llm-tokens',
    topic: 'modelos de lenguaje',
    needs: { projects: CALL_ME_MAYBE },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué genera un modelo de lenguaje en cada paso?',
          '¿De cuánto en cuánto escribe un LLM?',
        ],
        right: ['El siguiente token, elegido según probabilidades', 'Un token cada vez'],
        wrong: [
          'La respuesta entera de golpe',
          'Una frase cada vez',
          'Un carácter, siempre',
          'Una palabra del diccionario, siempre',
        ],
      },
      {
        ask: [
          '¿Cómo se obliga a un modelo a escribir siempre JSON válido para una función?',
          '¿En qué consiste la decodificación restringida?',
        ],
        right: [
          'En quitar en cada paso los tokens que romperían el formato',
          'En dejar elegir solo tokens que mantienen el JSON válido',
        ],
        wrong: [
          'En pedírselo con educación en el prompt',
          'En reintentar hasta que salga bien',
          'En usar un modelo más grande',
        ],
      },
    ],
    wrong: ['La respuesta entera de golpe', 'Una frase cada vez', 'Un carácter, siempre'],
    why: 'Se genera token a token; si en cada paso solo se permiten los tokens válidos, el formato está garantizado.',
  },
  {
    id: 'llm-function-calling',
    topic: 'modelos de lenguaje',
    needs: { projects: CALL_ME_MAYBE },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué es «function calling» en un modelo de lenguaje?',
          '¿Qué hace un modelo cuando hace function calling?',
        ],
        right: [
          'Elige una función y sus argumentos; tu programa la ejecuta',
          'Devuelve qué función llamar y con qué parámetros',
        ],
      },
    ],
    wrong: [
      'Ejecuta código en tu máquina',
      'Se entrena con tus funciones',
      'Compila tus funciones',
      'Llama a otro modelo',
    ],
    why: 'El modelo solo propone la llamada (nombre y argumentos, normalmente en JSON); ejecutarla es cosa tuya.',
  },
]
