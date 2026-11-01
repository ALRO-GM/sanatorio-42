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
          'list, la clase, para que la cree en cada llamada',
          'list() en vez de [], que crea una lista nueva',
          'Una lista global que se vacía en cada llamada',
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
          'Ninguna: son exactamente el mismo operador',
          'is es más rápido, y por lo demás igual',
          'is compara tipos; ==, valores',
          '== compara la dirección en memoria; is, el valor',
        ],
      },
      {
        ask: ['¿Qué comprueba `a is b`?'],
        right: ['Que a y b son el mismo objeto en memoria'],
        wrong: [
          'Que a y b valen lo mismo, aunque sean copias',
          'Que a y b son del mismo tipo o clase',
          'Que b está dentro de a, como con in',
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
        wrong: ['b = a', 'b == a', 'b = a.clone()', 'b = a.self'],
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
          'La vuelve un generador que da valores uno a uno',
          'Hace que devuelva un generador perezoso',
        ],
      },
    ],
    wrong: [
      'La termina en ese punto, igual que return',
      'Pausa todo el programa hasta la siguiente llamada',
      'Lanza la función en un hilo aparte',
      'Hace que devuelva una lista con todos los valores',
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
        right: ['El objeto sobre el que se llama el método', 'La instancia que recibe la llamada'],
        wrong: [
          'La clase a la que pertenece el método',
          'El módulo donde está definida la clase',
          'La clase padre, para llamar a super',
          'Una palabra reservada sin significado',
        ],
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
      'Se crea sin problema, con el método vacío',
      'El método abstracto devuelve None al llamarlo',
      'Se llama en su lugar al método del padre',
      'Avisa con un warning, pero sigue',
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
        right: ['Nada: no las comprueba al ejecutar', 'Funciona igual: no se comprueban'],
      },
    ],
    wrong: [
      'Lanza TypeError al llamar a f',
      'Convierte x a int antes de entrar',
      'No compila: el tipo no encaja',
      'Avisa con un warning y sigue',
    ],
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
        right: ['Falla con UnboundLocalError', 'Falla: count es local y no tiene valor'],
      },
    ],
    wrong: [
      'count pasa a valer 1 sin problema',
      'No pasa nada: count se queda en 0',
      'Se crea otra count local que vale 1',
      'Falla con SyntaxError al definir inc',
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
          'Tener los paquetes de cada proyecto aparte',
          'Aislar las dependencias de un proyecto',
        ],
        wrong: [
          'Hacer que Python ejecute más rápido',
          'Ejecutar Python en otra máquina',
          'Compilar el proyecto a código C',
          'Esconder el código fuente del proyecto',
        ],
      },
      {
        ask: [
          '¿Qué fichero lista los paquetes que necesita un proyecto, con pip?',
          '¿Qué fichero se le pasa a `pip install -r`?',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'packages.txt', 'Makefile'],
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
      'Siempre: es obligatorio en cada fichero',
      'Solo al importarlo desde otro módulo',
      'Solo si el fichero se llama main.py',
      'Solo al declarar una función main',
    ],
    why: 'Al importar, __name__ es el nombre del módulo; al ejecutar el fichero, "__main__".',
  },
  {
    id: 'py-floor-div',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué da `7 // 2` en Python 3?', '¿Cuál es el resultado de `7 // 2`?'],
        right: ['3'],
        wrong: ['3.5', '4', '2'],
      },
      {
        ask: ['¿Qué da `-7 // 2` en Python 3?', '¿Cuál es el resultado de `-7 // 2`?'],
        right: ['-4'],
        wrong: ['-3', '-3.5', '3'],
      },
      {
        ask: ['¿Qué da `7 / 2` en Python 3?', '¿Cuál es el resultado de `7 / 2`?'],
        right: ['3.5'],
        wrong: ['3', '4', '3.0'],
      },
    ],
    wrong: ['1', '0', '7'],
    why: 'En Python 3, / siempre da un float y // redondea hacia abajo (hacia menos infinito, no hacia cero): -7 // 2 es -4, no -3 como en C.',
  },
  {
    id: 'py-args-kwargs',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'En `def f(*args, **kwargs)`, ¿qué recibe kwargs?',
          'Al llamar a `f(1, x=2)`, kwargs dentro de f es…',
        ],
        right: ['Un diccionario con los argumentos con nombre', 'Un dict de nombre a valor'],
        wrong: [
          'Una tupla con los argumentos posicionales',
          'Una lista con todos los argumentos juntos',
          'Un puntero a la lista de argumentos',
        ],
      },
      {
        ask: [
          'En `def f(*args, **kwargs)`, ¿qué recibe args?',
          'Al llamar a `f(1, 2, x=3)`, args dentro de f es…',
        ],
        right: [
          'Una tupla con los argumentos posicionales',
          'Una tupla con los que no llevan nombre',
        ],
        wrong: [
          'Un diccionario con los argumentos con nombre',
          'Una lista que se puede modificar dentro',
          'Un puntero al primer argumento, como en C',
        ],
      },
    ],
    wrong: ['Un string con los argumentos', 'El número de argumentos', 'Un iterador que se gasta'],
    why: '*args recoge en una tupla los argumentos sueltos que sobran, y **kwargs, en un diccionario, los que llevan nombre.',
  },
  {
    id: 'py-with',
    topic: 'python',
    needs: { lang: 'python' },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué garantiza `with open("datos.txt") as f:`?',
          'Abrir un fichero con with sirve para…',
        ],
        right: [
          'Que el fichero se cierra al salir del bloque',
          'Cerrar el fichero solo, pase lo que pase',
        ],
        wrong: [
          'Que el fichero se lee entero en memoria',
          'Que nadie más puede abrir el fichero',
          'Que el fichero se crea si no existe',
        ],
      },
      {
        ask: [
          'Si salta una excepción dentro de un `with open(...)`, ¿qué pasa con el fichero?',
          'Con una excepción a mitad del bloque with, el fichero…',
        ],
        right: ['Se cierra igualmente al salir', 'Se cierra antes de propagar el error'],
        wrong: [
          'Se queda abierto hasta el final',
          'Se borra para no dejarlo a medias',
          'Se guarda una copia de seguridad',
        ],
      },
    ],
    wrong: [
      'Que el fichero se abre más rápido',
      'Que se escribe en binario',
      'Que se bloquea para otros procesos',
    ],
    why: 'with llama a __exit__ al salir del bloque, también si hay una excepción: el fichero se cierra siempre sin escribir close().',
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
          '¿En qué unidades va escribiendo un LLM?',
        ],
        right: ['El siguiente token, según probabilidades', 'Un solo token cada vez'],
        wrong: [
          'La respuesta entera de golpe, ya pensada',
          'Una frase completa cada vez',
          'Un carácter cada vez, siempre uno',
          'Una palabra entera del diccionario',
        ],
      },
      {
        ask: [
          '¿En qué consiste forzar a un modelo a escribir siempre JSON válido?',
          '¿En qué consiste la decodificación restringida?',
        ],
        right: [
          'En quitar en cada paso los tokens que romperían el formato',
          'En dejar elegir solo tokens que mantienen el JSON válido',
        ],
        wrong: [
          'En pedírselo con educación en el prompt del sistema',
          'En reintentar hasta que salga un JSON que valga',
          'En usar un modelo más grande y con más contexto',
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
          'Elige función y argumentos; tu programa la ejecuta',
          'Devuelve qué función llamar y con qué argumentos',
        ],
      },
    ],
    wrong: [
      'Ejecuta el código de la función en tu máquina',
      'Se entrena con tus funciones para aprenderlas',
      'Compila tus funciones y te devuelve el binario',
      'Llama a otro modelo para que haga la tarea',
    ],
    why: 'El modelo solo propone la llamada (nombre y argumentos, normalmente en JSON); ejecutarla es cosa tuya.',
  },
]
