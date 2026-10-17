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
      { ask: ['¿Qué imprime?', '¿Qué sale por pantalla?'], right: ['[1, 2]'] },
      {
        ask: [
          '¿Cómo se arregla para que cada llamada empiece con una lista vacía?',
          '¿Qué valor por defecto debería usar items?',
        ],
        right: [
          'items=None y crear la lista dentro si es None',
          'None, y `if items is None: items = []`',
        ],
        wrong: ['items=list', 'Poner items=[] dos veces', 'Usar global items'],
      },
    ],
    wrong: ['[2]', '[1]', '[]', 'Un error'],
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
        ask: ['¿Qué diferencia hay entre `==` e `is`?', '`a is b` comprueba…'],
        right: [
          '== compara valores; is, si son el mismo objeto',
          'Que sean el mismo objeto en memoria',
        ],
      },
    ],
    wrong: [
      'Son lo mismo',
      'is es más rápido y por lo demás igual',
      'is compara tipos',
      '== compara la dirección en memoria',
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
      { ask: ['¿Qué imprime?', '¿Cómo queda a?'], right: ['[1, 2, 3, 4]'] },
      {
        ask: ['¿Cómo se hace b como copia independiente de a?', 'Para que b no cambie a…'],
        right: ['b = a.copy()', 'b = list(a)', 'b = a[:]'],
        wrong: ['b = a', 'b == a', 'b = &a'],
      },
    ],
    wrong: ['[1, 2, 3]', '[4]', 'Un error', '[1, 2, 3], [4]'],
    why: 'Asignar no copia: b y a son la misma lista. copy(), list() o [:] hacen una copia.',
  },
  {
    id: 'py-slicing',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      { ask: ['¿Qué da `"programa"[1:4]`?', '`"programa"[1:4]` es…'], right: ['"rog"'] },
      {
        ask: ['¿Qué da `"programa"[::-1]`?', '`"programa"[::-1]` es…'],
        right: ['"amargorp"'],
        wrong: ['"programa"', '"a"'],
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
          'Acceder con corchetes a una clave que no existe…',
        ],
        right: ['Lanza KeyError'],
      },
      {
        ask: ['¿Qué devuelve `d.get("x")` si "x" no está?', 'get con una clave que no existe da…'],
        right: ['None'],
        wrong: ['Lanza KeyError'],
      },
    ],
    wrong: ['Devuelve 0', 'Devuelve una cadena vacía', 'Crea la clave', 'Devuelve False'],
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
        ask: ['¿Qué da `[x * x for x in range(4)]`?', '`[x * x for x in range(4)]` es…'],
        right: ['[0, 1, 4, 9]'],
      },
      {
        ask: [
          '¿Qué da `[x for x in range(10) if x % 3 == 0]`?',
          'Los múltiplos de 3 bajo 10, con comprensión, son…',
        ],
        right: ['[0, 3, 6, 9]'],
        wrong: ['[3, 6, 9]', '[0, 3, 6]', '[1, 4, 7]'],
      },
    ],
    wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]', '[1, 4, 9]'],
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
        ask: ['¿Qué hace `yield` en una función?', 'Una función con yield…'],
        right: [
          'La convierte en generador: da valores de uno en uno, cuando se piden',
          'Devuelve un generador perezoso',
        ],
      },
    ],
    wrong: [
      'Termina la función como return',
      'Pausa el programa entero',
      'Lanza un hilo',
      'Devuelve una lista con todo',
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
    forms: [{ ask: ['¿Qué imprime?', '¿Qué letras salen, en orden?'], right: ['A y C', 'A, C'] }],
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
        ask: ['¿Qué es `self` en un método?', 'El primer parámetro de un método normal es…'],
        right: ['El objeto sobre el que se llama el método', 'La instancia'],
      },
      {
        ask: [
          '¿Qué método se ejecuta al crear un objeto?',
          'El «constructor» de una clase en Python es…',
        ],
        right: ['__init__'],
        wrong: ['__new__ solo', '__main__', '__call__'],
      },
    ],
    wrong: [
      'La clase',
      'Una palabra reservada sin significado',
      'El módulo',
      'El padre de la clase',
    ],
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
          'Instanciar una clase abstracta (ABC) incompleta…',
        ],
        right: ['Lanza TypeError', 'Da error: no se puede instanciar'],
      },
    ],
    wrong: [
      'Se crea sin problema',
      'El método devuelve None',
      'Se llama al método del padre',
      'Avisa pero sigue',
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
          'Si pasas un str a `def f(x: int)`…',
        ],
        right: [
          'Nada: no las comprueba; las usan herramientas como mypy',
          'Funciona igual: los tipos no se comprueban al ejecutar',
        ],
      },
    ],
    wrong: ['Lanza TypeError', 'Convierte x a int', 'No compila', 'Avisa con un warning siempre'],
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
        right: ['UnboundLocalError: count se trata como local', 'Falla: falta `global count`'],
      },
    ],
    wrong: [
      'count pasa a valer 1',
      'No pasa nada',
      'count pasa a valer 0',
      'Crea una variable nueva a 1',
    ],
    why: 'Asignar a un nombre dentro de una función lo hace local; leerlo antes de asignarlo falla.',
  },
  {
    id: 'py-venv',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Para qué sirve un entorno virtual (venv)?', 'Un venv permite…'],
        right: [
          'Tener los paquetes de cada proyecto aparte, sin mezclarlos',
          'Aislar las dependencias de un proyecto',
        ],
      },
      {
        ask: [
          '¿Qué fichero lista los paquetes que necesita un proyecto, con pip?',
          'Se instalan las dependencias con `pip install -r`…',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'Makefile', 'setup.cfg solo'],
      },
    ],
    wrong: [
      'Hacer Python más rápido',
      'Ejecutar Python en otra máquina',
      'Compilar a C',
      'Esconder el código',
    ],
    why: 'Cada venv tiene sus propios paquetes; requirements.txt dice cuáles poner.',
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
          'El código dentro de ese if solo se ejecuta…',
        ],
        right: [
          'Para que ese código solo corra al ejecutar el fichero, no al importarlo',
          'Cuando el fichero se ejecuta directamente',
        ],
      },
    ],
    wrong: [
      'Siempre, es obligatorio',
      'Solo al importarlo',
      'Solo en Windows',
      'Para declarar la función main',
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
        ask: ['¿Cuál de estos es JSON válido?', 'Un objeto JSON bien escrito es…'],
        right: ['{"name": "pepe", "age": 3}'],
      },
      {
        ask: [
          '¿Qué función convierte un texto JSON en un diccionario de Python?',
          'Para leer JSON desde una cadena se usa…',
        ],
        right: ['json.loads'],
        wrong: ['json.dumps', 'json.parse', 'eval'],
      },
    ],
    wrong: [
      "{'name': 'pepe', 'age': 3}",
      '{name: "pepe", age: 3}',
      '{"name": "pepe", "age": 3,}',
      '{"name": pepe}',
    ],
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
        ask: ['¿Qué genera un modelo de lenguaje en cada paso?', 'Un LLM escribe…'],
        right: ['El siguiente token, eligiendo según probabilidades', 'Un token cada vez'],
      },
      {
        ask: [
          '¿Cómo se obliga a un modelo a escribir siempre JSON válido para una función?',
          'La decodificación restringida consiste en…',
        ],
        right: [
          'Quitar en cada paso los tokens que romperían el formato',
          'Solo dejar elegir tokens que mantengan el JSON válido',
        ],
        wrong: [
          'Pedírselo con educación en el prompt',
          'Reintentar hasta que salga bien',
          'Usar un modelo más grande',
        ],
      },
    ],
    wrong: [
      'La respuesta entera de golpe',
      'Una frase cada vez',
      'Un carácter siempre',
      'Una palabra del diccionario siempre',
    ],
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
          'Cuando un modelo hace function calling…',
        ],
        right: [
          'El modelo elige una función y sus argumentos; tu programa la ejecuta',
          'Devuelve qué función llamar y con qué parámetros',
        ],
      },
    ],
    wrong: [
      'El modelo ejecuta código en tu máquina',
      'Llamas al modelo por teléfono',
      'El modelo se entrena con tus funciones',
      'Compila tus funciones',
    ],
    why: 'El modelo solo propone la llamada (nombre y argumentos, normalmente en JSON); ejecutarla es cosa tuya.',
  },
]
