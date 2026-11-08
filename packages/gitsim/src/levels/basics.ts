/**
 * Mundos 0 y 1: guardar trabajo (commit, índice) y ramas (crear, cambiar, unir).
 */

import type { Level } from './types.js'

export const WORLD_0: Level[] = [
  {
    id: 'w0-commit',
    world: 0,
    kind: 'step',
    title: 'Tu primer commit',
    goal: 'Haz dos commits en main.',
    theory: {
      what: 'Un commit guarda una foto de tus ficheros con un mensaje. Cada commit apunta al anterior: así se forma la historia.',
      how: [
        'git commit -m "Añade el Makefile"   # un círculo nuevo en main',
        'git log --oneline                   # la historia, lo último arriba',
      ],
      when: 'Cada vez que terminas un cambio pequeño con sentido propio: una función, un arreglo, un test.',
      whenNot:
        'Un commit gigante de «cambios varios» no se entiende luego: mejor varios pequeños, uno por cambio.',
      looks: 'Un círculo nuevo encima del anterior, y main avanza hasta él.',
      problems:
        'Dejar el mensaje vacío: git commit -m "" responde «el mensaje está vacío: git commit -m "qué has hecho"». Escribe qué hace el cambio.',
    },
    start: [],
    solution: ['git commit -m "uno"', 'git commit -m "dos"'],
  },
  {
    id: 'w0-add',
    world: 0,
    kind: 'step',
    title: 'El índice: git add',
    goal: 'Crea hola.c con el texto «int main(void)» y guárdalo en un commit.',
    theory: {
      what: 'Entre tus ficheros y el commit está el índice. git add elige qué cambios entran en el próximo commit; lo que no añades se queda fuera.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status                    # hola.c, sin preparar',
        'git add hola.c                # al índice',
        'git commit -m "Añade hola.c"',
      ],
      when: 'Tras un rato tocando varias cosas, para hacer commits limpios: uno por cambio.',
      whenNot:
        'git add . añade todo de golpe, también lo que no querías (binarios, .o, claves). Mira git status antes.',
      looks: 'El índice no se dibuja: es lo que irá dentro del próximo círculo.',
      problems:
        'Olvidar el add: el commit sale sin hola.c y git status sigue diciendo «Cambios sin preparar: hola.c». Haz git add hola.c y otro commit.',
    },
    start: [],
    solution: ['echo "int main(void)" > hola.c', 'git add hola.c', 'git commit -m "Añade hola.c"'],
    check: { files: { main: ['hola.c'] } },
  },
  {
    id: 'w0-status',
    world: 0,
    kind: 'step',
    title: 'Mirar antes de guardar',
    goal: 'Hay dos ficheros cambiados: guarda solo libft.h en un commit (main.c, no).',
    theory: {
      what: 'git status te dice en qué rama estás, qué está preparado para el commit y qué no.',
      how: [
        'git status                  # libft.h y main.c, sin preparar',
        'git add libft.h',
        'git status                  # solo libft.h, preparado',
        'git commit -m "Prototipos"',
      ],
      when: 'Antes de cada add y de cada commit: es gratis y evita sustos.',
      whenNot:
        'git status no enseña la historia: los commits ya hechos se ven con git log --oneline.',
      looks: 'Solo libft.h entra en el commit; main.c sigue cambiado en tu carpeta.',
      problems:
        'git add . sin mirar: git status dice «Preparado para el commit: libft.h, main.c» y el commit se llevaría los dos. Añade por nombre: git add libft.h.',
    },
    start: [
      'echo "v1" > libft.h',
      'echo "v1" > main.c',
      'git add .',
      'git commit -m "Base"',
      'echo "v2" > libft.h',
      'echo "v2" > main.c',
    ],
    solution: ['git add libft.h', 'git commit -m "Prototipos"'],
    check: { files: { main: ['libft.h', 'main.c'] } },
  },
  {
    id: 'w0-world',
    world: 0,
    kind: 'world',
    title: 'Raíz: la historia',
    goal: 'Tres commits: el primero crea notas.txt con «a», el segundo le añade una línea «b» y el tercero añade todo.txt con «c».',
    theory: {
      what: 'Repaso: add prepara, commit guarda y la rama avanza. git commit -am prepara y guarda de una vez lo que git ya sigue.',
      how: [
        'echo a > notas.txt',
        'git add notas.txt            # nuevo: hace falta add',
        'git commit -m "notas"',
        'echo b >> notas.txt',
        'git commit -am "más notas"   # ya seguido: vale -a',
      ],
      when: 'Para cambios en ficheros que ya están en la historia, sin escribir add cada vez.',
      whenNot:
        'Para guardar solo uno de varios cambios, -a no sirve: lo prepara todo. Usa git add con su nombre.',
      looks: 'Tres círculos seguidos en main.',
      problems:
        'Usar -a con un fichero nuevo: no lo añade. El commit sale sin él y git status dice «Cambios sin preparar: notas.txt». Haz git add primero.',
    },
    start: [],
    solution: [
      'echo a > notas.txt',
      'git add notas.txt',
      'git commit -m "notas"',
      'echo b >> notas.txt',
      'git commit -am "más notas"',
      'echo c > todo.txt',
      'git add todo.txt',
      'git commit -m "todo"',
    ],
    check: { files: { main: ['notas.txt', 'todo.txt'] } },
  },
]

export const WORLD_1: Level[] = [
  {
    id: 'w1-branch',
    world: 1,
    kind: 'step',
    title: 'Crear una rama',
    goal: 'Crea la rama feature, cámbiate a ella y haz un commit allí.',
    theory: {
      what: 'Una rama es un nombre que apunta a un commit. Crearla no copia nada: sirve para trabajar sin tocar main.',
      how: [
        'git branch feature          # la crea; sigues en main',
        'git switch feature          # te cambias a ella',
        'git switch -c otra          # crear y cambiarse a la vez',
      ],
      when: 'Para cada cosa nueva: una funcionalidad, un arreglo, un experimento.',
      whenNot:
        'Una rama que vive meses sin unirse se aleja de main: unirla luego cuesta mucho más.',
      looks: 'Una etiqueta nueva sobre el mismo círculo; con un commit en ella, se separa de main.',
      problems:
        'Hacer commit tras git branch sin cambiarte: el commit va a main, y git status lo dice: «En la rama main». Usa git switch antes.',
    },
    start: ['git commit -m "base"'],
    solution: ['git switch -c feature', 'git commit -m "trabajo"'],
  },
  {
    id: 'w1-head',
    world: 1,
    kind: 'step',
    title: 'HEAD: dónde estás',
    goal: 'Vuelve a main y haz un commit: main y feature quedan separadas.',
    theory: {
      what: 'HEAD marca dónde estás: señala a una rama, y la rama a un commit. Al hacer commit, avanza la rama de HEAD.',
      how: [
        'git switch main             # HEAD pasa a main',
        'git commit -m "arreglo"     # avanza main, no feature',
        'git log --oneline --all     # las dos ramas',
      ],
      when: 'Para cambiar de rama y trabajar en otra cosa sin mezclar.',
      whenNot:
        'git log --oneline solo enseña la historia de donde estás; con --all ves también las otras ramas.',
      looks: 'Dos caminos que salen del mismo commit: la historia se bifurca.',
      problems:
        'Cambiar de rama con cambios sin commit: el curso responde «tienes cambios sin guardar: haz commit o stash antes de cambiar de rama». Haz commit antes.',
    },
    start: ['git commit -m "base"', 'git switch -c feature', 'git commit -m "trabajo"'],
    solution: ['git switch main', 'git commit -m "arreglo"'],
  },
  {
    id: 'w1-ff',
    world: 1,
    kind: 'step',
    title: 'Unir: avance rápido',
    goal: 'Une feature en main sin crear commit nuevo (fast-forward).',
    theory: {
      what: 'Si main no ha avanzado desde que sacaste feature, unirla solo mueve main hacia delante: es un avance rápido (fast-forward), sin commit nuevo.',
      how: ['git switch main', 'git merge feature           # «Avance rápido (fast-forward)»'],
      when: 'Cuando nadie ha tocado main mientras trabajabas en tu rama.',
      whenNot:
        'Para dejar constancia de la rama, git merge --no-ff crea un commit de merge aunque pudiera avanzar rápido.',
      looks: 'La etiqueta main salta hasta feature. No aparece ningún círculo nuevo.',
      problems:
        'Unir al revés, desde feature: git merge main dice «Ya está todo unido» y main no se mueve. Cámbiate a main y une feature.',
    },
    start: [
      'git commit -m "base"',
      'git switch -c feature',
      'git commit -m "a"',
      'git commit -m "b"',
      'git switch main',
    ],
    solution: ['git merge feature'],
  },
  {
    id: 'w1-merge',
    world: 1,
    kind: 'step',
    title: 'Unir: merge de tres vías',
    goal: 'main y feature han avanzado las dos: únelas en main con un commit de merge.',
    theory: {
      what: 'Si las dos ramas tienen commits nuevos, git junta sus cambios desde el ancestro común en un commit de merge con dos padres.',
      how: [
        'git switch main',
        'git merge feature           # «Merge hecho: c4»',
        'git log --oneline           # «Merge feature», arriba',
      ],
      when: 'Para traer a main el trabajo terminado de una rama.',
      whenNot: 'Si las dos ramas cambian la misma línea, hay conflicto: lo verás en el mundo 4.',
      looks: 'Un círculo nuevo con dos flechas: una a cada rama.',
      problems:
        'Unir desde la rama equivocada: en feature, git merge main deja «(HEAD -> feature) Merge main» en el log y main sin tocar. Cámbiate a main antes.',
    },
    start: [
      'git commit -m "base"',
      'git switch -c feature',
      'git commit -m "f1"',
      'git switch main',
      'git commit -m "m1"',
    ],
    solution: ['git merge feature'],
  },
  {
    id: 'w1-delete',
    world: 1,
    kind: 'review',
    title: 'Repaso: rama, merge y limpiar',
    goal: 'Crea fix desde main, haz un commit, únela en main y borra fix.',
    theory: {
      what: 'Una rama ya unida sobra: se borra y su trabajo sigue en main. git branch -d no borra una rama sin unir.',
      how: [
        'git switch -c fix',
        'git commit -m "arreglo"',
        'git switch main',
        'git merge fix',
        'git branch -d fix           # «Rama fix borrada»',
      ],
      when: 'Al terminar cada rama: así la lista de ramas dice lo que está vivo.',
      whenNot: 'git branch -D borra aunque no esté unida: sus commits se quedan sin rama.',
      looks: 'Desaparece la etiqueta fix; los círculos siguen ahí, dentro de main.',
      problems:
        'Borrar antes de unir: git branch -d fix responde «fix tiene commits sin unir: usa -D para borrarla igualmente». Haz el merge primero.',
    },
    start: ['git commit -m "base"'],
    solution: [
      'git switch -c fix',
      'git commit -m "arreglo"',
      'git switch main',
      'git merge fix',
      'git branch -d fix',
    ],
    check: { branches: ['main', 'fix'] },
  },
  {
    id: 'w1-world',
    world: 1,
    kind: 'world',
    title: 'Ramas: dos a la vez',
    goal: 'Dos ramas, a y b, salen de main con un commit cada una; únelas las dos en main (primero a, luego b).',
    theory: {
      what: 'Repaso: varias ramas en paralelo, cada una con lo suyo, y main que las va uniendo una a una.',
      how: [
        'git switch -c a',
        'git commit -m "a1"',
        'git switch main             # vuelve antes de sacar b',
        'git merge a                 # avance rápido',
        'git merge b                 # merge con dos padres',
      ],
      when: 'Lo normal en un equipo: cada cual en su rama, y main recogiendo.',
      whenNot:
        'El orden cuenta: la primera rama que unes avanza rápido; la segunda ya necesita un merge.',
      looks: 'main avanza rápido con a y luego hace un merge con b.',
      problems:
        'Sacar b sin volver a main: git switch -c b dice «Rama b creada en c2», el commit de a, y b se lleva a1. Vuelve a main antes.',
    },
    start: ['git commit -m "base"'],
    solution: [
      'git switch -c a',
      'git commit -m "a1"',
      'git switch main',
      'git switch -c b',
      'git commit -m "b1"',
      'git switch main',
      'git merge a',
      'git merge b',
    ],
  },
]
