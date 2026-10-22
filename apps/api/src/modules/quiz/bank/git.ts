/**
 * Banco de Not-games: git, por los mundos del curso de git (raíz, ramas,
 * remotos, reescribir, deshacer y flujos). Son generales: salen a cualquiera, y
 * los test previos a las pruebas de grupo del curso se hacen con ellos.
 */

import type { Concept } from './types.js'

export const GIT: readonly Concept[] = [
  // --- Mundo 0: la historia -------------------------------------------------
  {
    id: 'git-commit',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué es un commit?', 'Un commit guarda…'],
        right: [
          'Una foto de los ficheros preparados, con un mensaje y su commit anterior',
          'Una versión guardada del proyecto que apunta a la anterior',
        ],
      },
      {
        ask: ['¿Qué entra en un commit?', 'Al hacer git commit se guarda…'],
        right: ['Lo que está en el índice (lo preparado con git add)'],
        wrong: [
          'Todo lo que hay en la carpeta, siempre',
          'Solo los ficheros nuevos',
          'Lo que no está en el índice',
        ],
      },
    ],
    wrong: [
      'Una copia del repositorio en el servidor',
      'Una rama nueva',
      'Un fichero de configuración de git',
      'La lista de ficheros que git ignora',
    ],
    why: 'Cada commit es una foto de lo preparado con add, con su mensaje y un enlace a su padre: así se forma la historia.',
  },
  {
    id: 'git-status',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué te dice `git status`?', '`git status` sirve para ver…'],
        right: [
          'En qué rama estás, qué está preparado y qué ha cambiado sin preparar',
          'El estado de tus ficheros y de tu rama',
        ],
      },
    ],
    wrong: [
      'La historia de commits',
      'Quién ha cambiado cada línea',
      'Si el servidor está encendido',
      'Las diferencias línea a línea',
    ],
    why: 'status es la foto de ahora: rama, preparado y no preparado. La historia es git log.',
  },

  // --- Mundo 1: ramas ---------------------------------------------------------
  {
    id: 'git-branch-what',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué es una rama en git?', 'Para git, una rama es…'],
        right: ['Un nombre que apunta a un commit y avanza con cada commit nuevo'],
      },
      {
        ask: ['¿Qué copia git al crear una rama?', 'Crear una rama copia…'],
        right: ['Nada: solo crea un puntero al commit actual'],
        wrong: ['Todos los ficheros del proyecto', 'La historia entera', 'El índice'],
      },
    ],
    wrong: [
      'Una copia de la carpeta del proyecto',
      'Un repositorio aparte',
      'Un commit especial sin padre',
      'Un servidor remoto',
    ],
    why: 'Una rama es solo una etiqueta que apunta a un commit: crearla es gratis.',
  },
  {
    id: 'git-head',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué es HEAD?', 'En git, HEAD señala…'],
        right: [
          'Dónde estás: normalmente la rama actual',
          'La rama (o el commit) en la que estás trabajando',
        ],
      },
      {
        ask: ['¿Qué es estar con HEAD separado (detached)?', 'HEAD separado quiere decir que…'],
        right: ['HEAD apunta a un commit directamente, no a una rama'],
        wrong: [
          'Que se ha borrado la rama main',
          'Que no hay conexión con el remoto',
          'Que el repositorio está vacío',
        ],
      },
    ],
    wrong: [
      'El primer commit del repositorio',
      'La rama main del remoto',
      'El último commit de cualquier rama',
      'El fichero de configuración',
    ],
    why: 'HEAD es dónde estás; al hacer commit avanza la rama a la que apunta. Si apunta a un commit, está separado.',
  },
  {
    id: 'git-switch-c',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          '¿Qué orden crea una rama y se cambia a ella a la vez?',
          'Para crear la rama login y pasarte a ella, escribes…',
        ],
        right: ['git switch -c login', 'git checkout -b login'],
        wrong: ['git branch login', 'git switch login', 'git merge login', 'git commit -b login'],
      },
    ],
    wrong: ['git push login', 'git add login', 'git init login'],
    why: 'git branch solo la crea; switch -c (o checkout -b) la crea y te cambia a ella.',
  },
  {
    id: 'git-fast-forward',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué es un merge fast-forward?', 'Un avance rápido (fast-forward) ocurre cuando…'],
        right: [
          'La rama de destino no ha avanzado: solo se mueve hacia delante, sin commit nuevo',
          'Unir solo mueve el puntero de la rama, porque no hay nada que mezclar',
        ],
      },
    ],
    wrong: [
      'Un merge que crea un commit con dos padres',
      'Un merge que ignora los conflictos',
      'Un push forzado',
      'Un merge que borra la otra rama',
    ],
    why: 'Si main no ha avanzado desde que saliste, unir solo mueve main hasta la punta de tu rama.',
  },
  {
    id: 'git-merge-commit',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué tiene de especial un commit de merge?',
          'Si las dos ramas han avanzado, git merge crea…',
        ],
        right: ['Un commit con dos padres', 'Un commit que une las dos historias (dos padres)'],
      },
    ],
    wrong: [
      'Un commit sin padre',
      'Una copia de cada commit de la otra rama',
      'Una rama nueva',
      'Nada: las ramas no se pueden unir si han avanzado las dos',
    ],
    why: 'El merge de tres vías junta los cambios desde el ancestro común en un commit con dos padres.',
  },
  {
    id: 'git-branch-delete',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué pasa al borrar con git branch -d una rama ya unida?',
          'Tras unir feature en main, git branch -d feature…',
        ],
        right: ['Se borra el nombre; los commits siguen en main'],
      },
      {
        ask: [
          '¿Qué hace git branch -d con una rama que tiene commits sin unir?',
          'Si una rama tiene trabajo sin unir, git branch -d…',
        ],
        right: ['Se niega a borrarla (con -D sí la borra)'],
        wrong: ['La borra y sus commits pasan a main', 'La une antes de borrarla'],
      },
    ],
    wrong: [
      'Se borran todos sus commits',
      'Se borra también en el remoto',
      'Se deshace el merge',
      'Se borran sus ficheros de la carpeta',
    ],
    why: 'Una rama es un nombre: borrarla no borra commits que estén en otra rama. -d protege lo que no está unido.',
  },

  // --- Mundo 2: remotos -------------------------------------------------------
  {
    id: 'git-fetch',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `git fetch`?', '¿Para qué sirve git fetch?'],
        right: [
          'Baja lo nuevo del remoto y mueve origin/main, sin tocar tus ramas',
          'Trae los commits del remoto pero no los une con lo tuyo',
        ],
      },
      {
        ask: ['¿Qué diferencia hay entre fetch y pull?', 'git pull es…'],
        right: ['fetch y después merge (o rebase con --rebase)'],
        wrong: ['Lo mismo que fetch', 'Lo contrario de push: sube cambios', 'fetch más push'],
      },
    ],
    wrong: [
      'Sube tus commits al remoto',
      'Une origin/main en tu rama',
      'Borra las ramas que no están en el remoto',
      'Clona el repositorio otra vez',
    ],
    why: 'fetch solo descarga y actualiza las ramas de seguimiento; pull además une con tu rama.',
  },
  {
    id: 'git-tracking',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es origin/main?', 'La rama origin/main de tu repositorio es…'],
        right: [
          'Dónde estaba main en origin la última vez que hablaste con él',
          'Una rama de seguimiento: tu copia de cómo está main en el remoto',
        ],
      },
    ],
    wrong: [
      'La rama main del remoto en tiempo real',
      'Una rama en la que puedes hacer commits como en main',
      'El primer commit de main',
      'Una copia de seguridad automática de tu main',
    ],
    why: 'origin/main solo cambia con fetch, pull o push: es lo último que sabes del remoto.',
  },
  {
    id: 'git-push-rejected',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'git push te dice «rejected» porque el remoto tiene commits que tú no tienes. ¿Qué haces?',
          'Tu push sale rechazado (non-fast-forward). Lo normal es…',
        ],
        right: ['git pull (o pull --rebase) y después git push otra vez'],
        wrong: [
          'git push --force sin mirar',
          'Borrar el repositorio y clonar de nuevo',
          'git commit --amend y otra vez git push',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: 'El remoto no deja que pises trabajo ajeno: primero traes lo suyo, unes y luego subes.',
  },
  {
    id: 'git-clone',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué hace `git clone url`?', '¿Para qué sirve git clone?'],
        right: [
          'Copia el repositorio entero, con su historia, y lo deja con origin apuntando a la url',
        ],
      },
    ],
    wrong: [
      'Descarga solo la última versión de los ficheros, sin historia',
      'Crea una rama nueva en el remoto',
      'Sube tu carpeta al servidor',
      'Une dos repositorios',
    ],
    why: 'clone trae toda la historia y deja configurado el remoto origin.',
  },

  // --- Mundo 3: reescribir ----------------------------------------------------
  {
    id: 'git-rebase',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `git rebase main` estando en feature?', 'git rebase main desde tu rama…'],
        right: [
          'Copia los commits de feature encima de main: la historia queda en línea',
          'Vuelve a aplicar tus commits sobre la punta de main, con ids nuevos',
        ],
      },
      {
        ask: ['¿Cuándo no deberías hacer rebase?', 'El rebase es peligroso en…'],
        right: ['Ramas que ya comparte más gente (sus commits cambian de id)'],
        wrong: [
          'Ramas que solo tienes tú en local',
          'Ramas con un solo commit',
          'Ramas que aún no has subido al remoto',
        ],
      },
    ],
    wrong: [
      'Une main en feature con un commit de merge',
      'Borra los commits de main',
      'Sube feature al remoto',
      'Cambia el nombre de la rama',
    ],
    why: 'rebase copia tus commits encima de otra rama: historia lineal, pero commits nuevos. En ramas compartidas rompe la historia de los demás.',
  },
  {
    id: 'git-cherry-pick',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `git cherry-pick a1b2c3`?', '¿Para qué sirve cherry-pick?'],
        right: [
          'Copia los cambios de ese commit encima de donde estás',
          'Trae un commit concreto de otra rama',
        ],
      },
    ],
    wrong: [
      'Trae la rama entera de ese commit',
      'Borra ese commit de la historia',
      'Te mueve a ese commit con HEAD separado',
      'Deshace ese commit',
    ],
    why: 'cherry-pick copia un commit suelto; la rama de la que viene no cambia.',
  },
  {
    id: 'git-amend',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `git commit --amend`?', '¿Para qué sirve --amend en git commit?'],
        right: [
          'Rehace el último commit (mensaje o ficheros) como un commit nuevo',
          'Cambia el último commit por otro corregido',
        ],
      },
    ],
    wrong: [
      'Añade un commit vacío',
      'Deshace el último commit y borra sus cambios',
      'Cambia el mensaje de cualquier commit antiguo',
      'Sube el último commit al remoto',
    ],
    why: 'amend sustituye el último commit; si ya lo subiste, los demás tienen el viejo.',
  },
  {
    id: 'git-relative',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es `HEAD~2`?', 'HEAD~2 se refiere a…'],
        right: [
          'El commit dos pasos antes de HEAD',
          'El abuelo de HEAD (siguiendo el primer padre)',
        ],
      },
      {
        ask: ['¿Qué es `main^`?', 'main^ se refiere a…'],
        right: ['El padre del commit al que apunta main'],
        wrong: [
          'La rama main del remoto',
          'El primer commit de main',
          'El hijo del commit de main',
        ],
      },
    ],
    wrong: [
      'La segunda rama del repositorio',
      'Los dos últimos commits juntos',
      'El commit dos pasos después de HEAD',
      'HEAD en el remoto',
    ],
    why: '~n retrocede n commits por el primer padre; ^ es el padre. Sirven para no copiar ids.',
  },

  // --- Mundo 4: deshacer --------------------------------------------------------
  {
    id: 'git-reset',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `git reset --hard HEAD~1`?', 'reset --hard HEAD~1…'],
        right: ['Lleva la rama un commit atrás y borra los cambios de la carpeta'],
        wrong: ['Lleva la rama atrás y deja los cambios preparados'],
      },
      {
        ask: ['¿Qué hace `git reset --soft HEAD~1`?', 'reset --soft HEAD~1…'],
        right: ['Lleva la rama un commit atrás y deja sus cambios preparados'],
        wrong: ['Lleva la rama atrás y borra los cambios de la carpeta'],
      },
    ],
    wrong: [
      'Crea un commit que deshace el anterior',
      'Borra la rama',
      'Descarga la versión del remoto',
      'Deshace el último push',
    ],
    why: 'reset mueve la rama: --soft deja lo deshecho preparado, el normal sin preparar y --hard lo borra.',
  },
  {
    id: 'git-revert',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'Un commit malo ya está en origin y lo tiene más gente. ¿Cómo lo deshaces?',
          'Para deshacer un commit que ya es público, lo seguro es…',
        ],
        right: ['git revert: un commit nuevo que hace lo contrario'],
        wrong: [
          'git reset --hard y git push --force',
          'git commit --amend',
          'Borrar la rama y crearla de nuevo',
        ],
      },
      {
        ask: ['¿Qué hace `git revert`?', 'git revert de un commit…'],
        right: ['Crea un commit nuevo que deshace sus cambios, sin reescribir la historia'],
      },
    ],
    wrong: [
      'Borra el commit de la historia',
      'Vuelve a la versión del remoto',
      'Cambia el mensaje del commit',
      'Mueve la rama a ese commit',
    ],
    why: 'revert añade, no reescribe: nadie tiene que arreglar su historia.',
  },
  {
    id: 'git-stash',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Para qué sirve `git stash`?', '¿Qué hace git stash?'],
        right: [
          'Aparca los cambios sin commit y deja la carpeta limpia (stash pop los devuelve)',
          'Guarda tus cambios a medias para cambiar de rama un momento',
        ],
      },
    ],
    wrong: [
      'Hace un commit temporal en main',
      'Borra los cambios sin guardar',
      'Sube los cambios a una rama oculta del remoto',
      'Ignora los ficheros nuevos',
    ],
    why: 'stash guarda lo no comprometido en una pila; con pop vuelve donde estés.',
  },

  // --- Mundo 5: flujos ----------------------------------------------------------
  {
    id: 'git-github-flow',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿En qué consiste GitHub flow?', 'Con GitHub flow…'],
        right: [
          'main siempre funciona; cada cambio en una rama corta que se revisa en un pull request y se une',
        ],
      },
    ],
    wrong: [
      'Todo el mundo hace commit directamente en main',
      'Hay dos ramas largas, main y develop, y ramas de release',
      'Cada persona tiene su propio repositorio sin remoto',
      'Solo se une a main una vez al año',
    ],
    why: 'Ramas cortas desde main, pull request y vuelta a main: el flujo más común en equipos pequeños.',
  },
  {
    id: 'git-gitflow',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['En Gitflow, ¿de dónde sale una rama hotfix?', 'Un hotfix de Gitflow sale de…'],
        right: ['De main, y se une en main y en develop'],
        wrong: ['De develop, y se une solo en develop', 'De la última release'],
      },
      {
        ask: ['En Gitflow, ¿para qué sirve develop?', 'La rama develop de Gitflow…'],
        right: ['Recoge el trabajo terminado hasta la próxima versión'],
        wrong: [
          'Es lo que está publicado',
          'Es una rama de pruebas que se borra',
          'Guarda solo los hotfix',
        ],
      },
    ],
    wrong: [
      'De una rama feature cualquiera',
      'No existe: en Gitflow no hay hotfix',
      'De origin/develop sin unir nunca',
    ],
    why: 'main es lo publicado y develop lo próximo: el hotfix arregla lo publicado y vuelve a los dos.',
  },
  {
    id: 'git-tag',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué diferencia hay entre un tag y una rama?',
          'Un tag (git tag v1.0), a diferencia de una rama…',
        ],
        right: ['No se mueve: señala siempre el mismo commit'],
      },
      {
        ask: ['¿Cómo subes los tags al remoto?', 'Los tags se suben con…'],
        right: ['git push --tags', 'git push origin v1.0'],
        wrong: ['git push, que sube siempre los tags', 'git tag --push', 'git commit --tags'],
      },
    ],
    wrong: [
      'Avanza con cada commit',
      'Solo existe en el remoto',
      'Guarda los ficheros aparte',
      'Es una rama protegida',
    ],
    why: 'Un tag es un nombre fijo para un commit: una versión.',
  },
  {
    id: 'git-trunk',
    topic: 'git',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es trunk-based development?', 'En trunk-based…'],
        right: [
          'Todo el mundo une en main varias veces al día, con ramas de horas y tests automáticos',
        ],
      },
    ],
    wrong: [
      'Cada versión vive en su rama para siempre',
      'Nadie usa ramas y se trabaja por correo',
      'Solo una persona puede hacer commits en main',
      'Las ramas duran meses y se unen al final',
    ],
    why: 'Ramas muy cortas y main siempre unido: pide una CI que proteja main.',
  },
]
