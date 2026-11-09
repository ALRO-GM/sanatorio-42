/**
 * Mundos 0 y 1: guardar trabajo (commit, índice) y ramas (crear, cambiar, unir).
 */

import { save } from './save.js'
import type { Level } from './types.js'

export const WORLD_0: Level[] = [
  {
    id: 'w0-commit',
    world: 0,
    kind: 'step',
    title: 'Tu primer commit',
    goal: 'El Makefile ya está preparado: guárdalo en un commit.',
    theory: {
      what: 'Un commit guarda una foto de lo que has preparado, con un mensaje. Cada commit apunta al anterior: así se forma la historia.',
      how: [
        'git status                          # Makefile, preparado',
        'git commit -m "Añade el Makefile"   # un círculo nuevo en main',
        'git log --oneline                   # la historia, lo último arriba',
      ],
      when: 'Cada vez que terminas un cambio pequeño con sentido propio: una función, un arreglo, un test.',
      whenNot:
        'Un commit gigante de «cambios varios» no se entiende luego: mejor varios pequeños, uno por cambio.',
      looks: 'Un círculo nuevo encima del anterior, y main avanza hasta él.',
      problems:
        'Hacer commit sin nada preparado: git responde «nothing to commit, working tree clean» y no guarda nada. Primero tiene que haber un cambio preparado.',
    },
    start: ['echo "all:" > Makefile', 'git add Makefile'],
    solution: ['git commit -m "Añade el Makefile"'],
    check: { files: { main: ['Makefile'] } },
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
        'git status                    # hola.c, en «Untracked files»',
        'git add hola.c                # al índice',
        'git commit -m "Añade hola.c"',
      ],
      when: 'Tras un rato tocando varias cosas, para hacer commits limpios: uno por cambio.',
      whenNot:
        'git add . añade todo de golpe, también lo que no querías (binarios, .o, claves). Mira git status antes.',
      looks: 'El índice no se dibuja: es lo que irá dentro del próximo círculo.',
      problems:
        'Olvidar el add: git commit responde «nothing added to commit but untracked files present» y no guarda nada. Haz git add hola.c y repite el commit.',
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
        'git status                  # libft.h y main.c, «not staged»',
        'git add libft.h',
        'git status                  # libft.h, «to be committed»',
        'git commit -m "Prototipos"',
      ],
      when: 'Antes de cada add y de cada commit: es gratis y evita sustos.',
      whenNot:
        'git status no enseña la historia: los commits ya hechos se ven con git log --oneline.',
      looks: 'Solo libft.h entra en el commit; main.c sigue cambiado en tu carpeta.',
      problems:
        'git add . sin mirar: git status pone libft.h y main.c bajo «Changes to be committed» y el commit se llevaría los dos. Añade por nombre: git add libft.h.',
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
        'Usar -a con un fichero nuevo: git commit -am responde «nothing added to commit but untracked files present». -a no añade ficheros nuevos: haz git add primero.',
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

/** El commit con el que empiezan los puntos de ramas: un README. */
const BASE = save('base', 'README.md')

export const WORLD_1: Level[] = [
  {
    id: 'w1-branch',
    world: 1,
    kind: 'step',
    title: 'Crear una rama',
    goal: 'Crea la rama feature, cámbiate a ella y haz allí un commit (con un fichero nuevo).',
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
        'Hacer commit tras git branch sin cambiarte: el commit va a main, y git status lo dice: «On branch main». Usa git switch antes.',
    },
    start: BASE,
    solution: ['git switch -c feature', ...save('trabajo')],
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
        'Cambiar de rama con cambios sin commit: git switch se los lleva (avisa con «M» delante del fichero) y acabarían en el commit de la otra rama. Haz commit antes de cambiar.',
    },
    start: [...BASE, 'git switch -c feature', ...save('trabajo')],
    solution: ['git switch main', ...save('arreglo')],
  },
  {
    id: 'w1-ff',
    world: 1,
    kind: 'step',
    title: 'Unir: avance rápido',
    goal: 'Une feature en main sin crear commit nuevo (fast-forward).',
    theory: {
      what: 'Si main no ha avanzado desde que sacaste feature, unirla solo mueve main hacia delante: es un avance rápido (fast-forward), sin commit nuevo.',
      how: ['git switch main', 'git merge feature           # «Fast-forward»'],
      when: 'Cuando nadie ha tocado main mientras trabajabas en tu rama.',
      whenNot:
        'Para dejar constancia de la rama, git merge --no-ff crea un commit de merge aunque pudiera avanzar rápido.',
      looks: 'La etiqueta main salta hasta feature. No aparece ningún círculo nuevo.',
      problems:
        'Unir al revés, desde feature: git merge main dice «Already up to date.» y main no se mueve. Cámbiate a main y une feature.',
    },
    start: [...BASE, 'git switch -c feature', ...save('a'), ...save('b'), 'git switch main'],
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
        "git merge feature           # «Merge made by the 'ort' strategy.»",
        "git log --oneline           # «Merge branch 'feature'», arriba",
      ],
      when: 'Para traer a main el trabajo terminado de una rama.',
      whenNot: 'Si las dos ramas cambian la misma línea, hay conflicto: lo verás en el mundo 4.',
      looks: 'Un círculo nuevo con dos flechas: una a cada rama.',
      problems:
        "Unir desde la rama equivocada: en feature, git merge main deja «(HEAD -> feature) Merge branch 'main' into feature» en el log y main sin tocar. Cámbiate a main antes.",
    },
    start: [...BASE, 'git switch -c feature', ...save('f1'), 'git switch main', ...save('m1')],
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
        'git branch -d fix           # «Deleted branch fix»',
      ],
      when: 'Al terminar cada rama: así la lista de ramas dice lo que está vivo.',
      whenNot: 'git branch -D borra aunque no esté unida: sus commits se quedan sin rama.',
      looks: 'Desaparece la etiqueta fix; los círculos siguen ahí, dentro de main.',
      problems:
        "Borrar antes de unir: git branch -d fix responde «error: The branch 'fix' is not fully merged.». Haz el merge primero.",
    },
    start: BASE,
    solution: [
      'git switch -c fix',
      ...save('arreglo'),
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
        'Sacar b sin volver a main: b sale de a y se lleva a1; git log --oneline b lo enseña. Vuelve a main antes de git switch -c b.',
    },
    start: BASE,
    solution: [
      'git switch -c a',
      ...save('a1'),
      'git switch main',
      'git switch -c b',
      ...save('b1'),
      'git switch main',
      'git merge a',
      'git merge b',
    ],
  },
]
