/** Banco de Not-games en inglés: Python y modelos de lenguaje (`../python.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PYTHON_EN: Readonly<Record<string, ConceptText>> = {
  'py-mutable-default': {
    forms: [
      {
        ask: ['What does it print?', 'What comes out on the screen?'],
        right: ['[1, 2]'],
        wrong: ['[2]', '[1]', '[]', '[2, 1]'],
      },
      {
        ask: [
          'How do you fix it so that each call starts with an empty list?',
          'Which default value should items use?',
        ],
        right: ['None, and create the list inside if items is None'],
        wrong: [
          'list, the class, so that it builds one per call',
          'list() instead of [], which creates a new list',
          'A global list that is emptied on every call',
        ],
      },
    ],
    wrong: ['[2]', '[1]', '[]'],
    why: 'The default value is created once, when the function is defined: every call shares the same list.',
  },
  'py-is-eq': {
    forms: [
      {
        ask: ['What is the difference between `==` and `is`?'],
        right: ['== compares values; is, whether they are the same object'],
        wrong: [
          'None: they are exactly the same operator',
          'is is faster, and otherwise the same',
          'is compares types; ==, values',
          '== compares the address in memory; is, the value',
        ],
      },
      {
        ask: ['What does `a is b` check?'],
        right: ['That a and b are the same object in memory'],
        wrong: [
          'That a and b have the same value, even as copies',
          'That a and b are of the same type or class',
          'That b is inside a, as with in',
        ],
      },
    ],
    wrong: [
      'None: they are the same',
      'is is faster, and otherwise the same',
      'is compares types; ==, values',
    ],
    why: 'Two equal lists are == but not is. For None you use `is None`.',
  },
  'py-copy': {
    forms: [
      {
        ask: ['What does it print?', 'How does a end up?'],
        right: ['[1, 2, 3, 4]'],
        wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
      },
      {
        ask: [
          'How do you make b an independent copy of a?',
          'What do you have to write so that changing b does not change a?',
        ],
        right: ['b = a.copy()', 'b = list(a)', 'b = a[:]'],
        wrong: ['b = a', 'b == a', 'b = a.clone()', 'b = a.self'],
      },
    ],
    wrong: ['[1, 2, 3]', '[4]', '[1, 2, 3, [4]]'],
    why: 'Assigning does not copy: b and a are the same list. copy(), list() or [:] make a copy.',
  },
  'py-slicing': {
    forms: [
      {
        ask: ['What does `"program"[1:4]` give?', 'What is the result of `"program"[1:4]`?'],
        right: ['"rog"'],
        wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
      },
      {
        ask: ['What does `"program"[::-1]` give?', 'What is the result of `"program"[::-1]`?'],
        right: ['"margorp"'],
        wrong: ['"program"', '"m"', '"margor"', '"p"'],
      },
    ],
    wrong: ['"prog"', '"rogr"', '"ogr"', '"pro"'],
    why: 'From the start index (included) to the end one (not included); a step of -1 goes through it backwards.',
  },
  'py-dict-get': {
    forms: [
      {
        ask: [
          'What happens with `d["x"]` if "x" is not in the dictionary?',
          'What happens when you use brackets with a key that does not exist?',
        ],
        right: ['It raises KeyError'],
        wrong: ['It returns None', 'It returns 0', 'It creates the key', 'It returns False'],
      },
      {
        ask: [
          'What does `d.get("x")` return if "x" is not there?',
          'What does get give with a key that does not exist?',
        ],
        right: ['None'],
        wrong: ['KeyError', '0', 'False', '""'],
      },
    ],
    wrong: ['It returns 0', 'It creates the key', 'It returns False'],
    why: 'Brackets require the key to exist; get returns None (or the default value you give it).',
  },
  'py-comprehension': {
    forms: [
      {
        ask: [
          'What does `[x * x for x in range(4)]` give?',
          'Which list comes out of `[x * x for x in range(4)]`?',
        ],
        right: ['[0, 1, 4, 9]'],
        wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
      },
      {
        ask: [
          'What does `[x for x in range(10) if x % 3 == 0]` give?',
          'Which list comes out of `[x for x in range(10) if x % 3 == 0]`?',
        ],
        right: ['[0, 3, 6, 9]'],
        wrong: ['[3, 6, 9]', '[0, 3, 6]', '[1, 4, 7]'],
      },
    ],
    wrong: ['[1, 4, 9, 16]', '[0, 1, 4, 9, 16]', '[0, 2, 4, 6]'],
    why: 'range(n) goes from 0 to n - 1, and the if filters before adding.',
  },
  'py-generator': {
    forms: [
      {
        ask: ['What does `yield` do in a function?', 'What changes in a function that uses yield?'],
        right: [
          'It makes it a generator that gives values one by one',
          'It makes it return a lazy generator',
        ],
      },
    ],
    wrong: [
      'It ends it at that point, just like return',
      'It pauses the whole program until the next call',
      'It runs the function in a separate thread',
      'It makes it return a list with all the values',
    ],
    why: 'A generator stops at each yield and carries on from there on the next round: it does not keep everything in memory.',
  },
  'py-exceptions': {
    forms: [
      {
        ask: ['What does it print?', 'Which letters come out, in order?'],
        right: ['A and C'],
      },
    ],
    wrong: ['B and C', 'A, B and C', 'Only A', 'Only C'],
    why: 'int("42a") raises ValueError: it goes into except; else only runs if there was no error; finally always runs.',
  },
  'py-classes': {
    forms: [
      {
        ask: [
          'What is `self` in a method?',
          'What does a normal method receive as its first parameter?',
        ],
        right: ['The object the method is called on', 'The instance that gets the call'],
        wrong: [
          'The class the method belongs to',
          'The module where the class is defined',
          'The parent class, to call super',
          'A reserved word with no meaning',
        ],
      },
      {
        ask: [
          'Which method runs when an object is created?',
          'Which one acts as the «constructor» of a class in Python?',
        ],
        right: ['__init__'],
        wrong: ['__main__', '__call__', '__str__'],
      },
    ],
    wrong: ['The class', 'The module', 'The parent class'],
    why: 'obj.method() is Class.method(obj): self is that obj. __init__ sets it up when it is created.',
  },
  'py-abc': {
    forms: [
      {
        ask: [
          'What happens if you try to create an object of a class with an `@abstractmethod` not implemented?',
          'What happens when you instantiate an incomplete abstract class (ABC)?',
        ],
        right: ['It raises TypeError: it cannot be instantiated'],
      },
    ],
    wrong: [
      'It is created without trouble, with an empty method',
      'The abstract method returns None when called',
      "The parent's method is called instead",
      'It shows a warning, but carries on',
    ],
    why: 'With ABC, Python stops you from creating objects while any abstract method is left unimplemented.',
  },
  'py-typing': {
    forms: [
      {
        ask: [
          'What does Python do with type annotations at run time (`def f(x: int) -> str`)?',
          'What happens if you pass a str to `def f(x: int)`?',
        ],
        right: [
          'Nothing: it does not check them at run time',
          'It works the same: they are not checked',
        ],
      },
    ],
    wrong: [
      'It raises TypeError when f is called',
      'It converts x to int before going in',
      'It does not compile: the type does not fit',
      'It shows a warning and carries on',
    ],
    why: 'Annotations are information; what checks them is mypy (or similar), not the interpreter.',
  },
  'py-scope': {
    forms: [
      {
        ask: ['What happens when inc() is called?', 'Does this code work?'],
        right: ['It fails with UnboundLocalError', 'It fails: count is local and has no value'],
      },
    ],
    wrong: [
      'count becomes 1 without trouble',
      'Nothing happens: count stays at 0',
      'Another local count is created that is 1',
      'It fails with SyntaxError when inc is defined',
    ],
    why: 'Assigning to a name inside a function makes it local; reading it before assigning it fails. You need `global count`.',
  },
  'py-venv': {
    forms: [
      {
        ask: ['What is a virtual environment (venv) for?', 'What does a venv allow?'],
        right: ["Keeping each project's packages apart", 'Isolating the dependencies of a project'],
        wrong: [
          'Making Python run faster',
          'Running Python on another machine',
          'Compiling the project to C code',
          'Hiding the source code of the project',
        ],
      },
      {
        ask: [
          'Which file lists the packages a project needs, with pip?',
          'Which file do you pass to `pip install -r`?',
        ],
        right: ['requirements.txt'],
        wrong: ['package.json', 'packages.txt', 'Makefile'],
      },
    ],
    wrong: ['Making Python faster', 'Running Python on another machine', 'Compiling to C'],
    why: 'Each venv has its own packages; requirements.txt says which ones to install.',
  },
  'py-main-guard': {
    forms: [
      {
        ask: [
          'What is `if __name__ == "__main__":` for?',
          'When does the code inside `if __name__ == "__main__":` run?',
        ],
        right: [
          'Only when the file is run, not when it is imported',
          'When the file is run directly',
        ],
      },
    ],
    wrong: [
      'Always: it is compulsory in every file',
      'Only when it is imported from another module',
      'Only if the file is called main.py',
      'Only when a main function is declared',
    ],
    why: 'When imported, __name__ is the module name; when the file is run, "__main__".',
  },
  'py-floor-div': {
    forms: [
      {
        ask: ['What does `7 // 2` give in Python 3?', 'What is the result of `7 // 2`?'],
        right: ['3'],
        wrong: ['3.5', '4', '2'],
      },
      {
        ask: ['What does `-7 // 2` give in Python 3?', 'What is the result of `-7 // 2`?'],
        right: ['-4'],
        wrong: ['-3', '-3.5', '3'],
      },
      {
        ask: ['What does `7 / 2` give in Python 3?', 'What is the result of `7 / 2`?'],
        right: ['3.5'],
        wrong: ['3', '4', '3.0'],
      },
    ],
    wrong: ['1', '0', '7'],
    why: 'In Python 3, / always gives a float and // rounds down (towards minus infinity, not towards zero): -7 // 2 is -4, not -3 as in C.',
  },
  'py-args-kwargs': {
    forms: [
      {
        ask: [
          'In `def f(*args, **kwargs)`, what does kwargs receive?',
          'When you call `f(1, x=2)`, kwargs inside f is…',
        ],
        right: ['A dictionary with the named arguments', 'A dict from name to value'],
        wrong: [
          'A tuple with the positional arguments',
          'A list with all the arguments together',
          'A pointer to the list of arguments',
        ],
      },
      {
        ask: [
          'In `def f(*args, **kwargs)`, what does args receive?',
          'When you call `f(1, 2, x=3)`, args inside f is…',
        ],
        right: ['A tuple with the positional arguments', 'A tuple with the ones that have no name'],
        wrong: [
          'A dictionary with the named arguments',
          'A list that can be changed inside',
          'A pointer to the first argument, as in C',
        ],
      },
    ],
    wrong: ['A string with the arguments', 'The number of arguments', 'An iterator that runs out'],
    why: '*args gathers the extra loose arguments in a tuple, and **kwargs gathers the named ones in a dictionary.',
  },
  'py-with': {
    forms: [
      {
        ask: [
          'What does `with open("data.txt") as f:` guarantee?',
          'Opening a file with with is useful for…',
        ],
        right: [
          'That the file is closed when the block ends',
          'Closing the file by itself, whatever happens',
        ],
        wrong: [
          'That the whole file is read into memory',
          'That nobody else can open the file',
          'That the file is created if it does not exist',
        ],
      },
      {
        ask: [
          'If an exception is raised inside a `with open(...)`, what happens to the file?',
          'With an exception halfway through the with block, the file…',
        ],
        right: ['It is closed anyway on the way out', 'It is closed before the error goes up'],
        wrong: [
          'It stays open until the end',
          'It is deleted so as not to leave it half-done',
          'A backup copy of it is saved',
        ],
      },
    ],
    wrong: [
      'That the file opens faster',
      'That it is written in binary',
      'That it is locked for other processes',
    ],
    why: 'with calls __exit__ when the block ends, also if there is an exception: the file is always closed without writing close().',
  },
  'py-json': {
    forms: [
      {
        ask: ['Which of these is valid JSON?', 'Which of these JSON objects is written correctly?'],
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
          'Which function turns a JSON text into a Python dictionary?',
          'What is used to read JSON from a string?',
        ],
        right: ['json.loads'],
        wrong: ['json.dumps', 'json.parse', 'eval'],
      },
    ],
    wrong: ["{'name': 'pepe', 'age': 3}", '{name: "pepe", age: 3}', '{"name": "pepe", "age": 3,}'],
    why: 'JSON requires double quotes on keys and strings and does not allow trailing commas. loads reads; dumps writes.',
  },
  'llm-tokens': {
    forms: [
      {
        ask: [
          'What does a language model generate at each step?',
          'In what units does an LLM write its answer?',
        ],
        right: ['The next token, according to probabilities', 'A single token at a time'],
        wrong: [
          'The whole answer at once, already thought out',
          'One whole sentence at a time',
          'One character at a time, always one',
          'One whole word from the dictionary',
        ],
      },
      {
        ask: [
          'What does forcing a model to always write valid JSON consist of?',
          'What does constrained decoding consist of?',
        ],
        right: [
          'Removing at each step the tokens that would break the format',
          'Only letting it choose tokens that keep the JSON valid',
        ],
        wrong: [
          'Asking it politely in the system prompt',
          'Retrying until a JSON that works comes out',
          'Using a bigger model with more context',
        ],
      },
    ],
    wrong: ['The whole answer at once', 'One sentence at a time', 'One character, always'],
    why: 'It is generated token by token; if at each step only the valid tokens are allowed, the format is guaranteed.',
  },
  'llm-function-calling': {
    forms: [
      {
        ask: [
          'What is «function calling» in a language model?',
          'What does a model do when it does function calling?',
        ],
        right: [
          'It picks function and arguments; your program runs it',
          'It returns which function to call and with what arguments',
        ],
      },
    ],
    wrong: [
      'It runs the code of the function on your machine',
      'It is trained on your functions to learn them',
      'It compiles your functions and returns the binary',
      'It calls another model to do the task',
    ],
    why: 'The model only proposes the call (name and arguments, usually in JSON); running it is up to you.',
  },
}
