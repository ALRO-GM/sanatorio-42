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
          'Una foto de lo preparado, con su mensaje y su padre',
          'Una versión guardada que apunta a la anterior',
        ],
      },
      {
        ask: ['¿Qué entra en un commit?', 'Al hacer git commit se guarda…'],
        right: ['Lo que está en el índice, preparado con git add'],
        wrong: [
          'Todo lo que hay en la carpeta, siempre',
          'Solo los ficheros nuevos, nunca los cambiados',
          'Lo que no está en el índice todavía',
        ],
      },
    ],
    wrong: [
      'Una copia del repositorio en el servidor',
      'Una rama nueva que sale de main',
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
          'Tu rama, lo preparado y lo cambiado sin preparar',
          'El estado de tus ficheros y de tu rama',
        ],
      },
    ],
    wrong: [
      'La historia de commits de la rama',
      'Quién ha cambiado cada línea de un fichero',
      'Si el servidor remoto está encendido',
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
        right: ['Un puntero a un commit que avanza con cada commit'],
      },
      {
        ask: ['¿Qué copia git al crear una rama?', 'Crear una rama copia…'],
        right: ['Nada: solo crea un puntero al commit actual'],
        wrong: [
          'Todos los ficheros del proyecto',
          'La historia entera de la rama actual',
          'El índice y los cambios sin preparar',
        ],
      },
    ],
    wrong: [
      'Una copia de la carpeta del proyecto',
      'Un repositorio aparte, con su propia historia',
      'Un commit especial que no tiene padre',
      'Un servidor remoto donde se sube el código',
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
          'La rama o el commit en el que estás trabajando',
        ],
      },
      {
        ask: ['¿Qué es estar con HEAD separado (detached)?', 'HEAD separado quiere decir…'],
        right: ['Que HEAD apunta a un commit, no a una rama'],
        wrong: [
          'Que se ha borrado la rama en la que estabas',
          'Que no hay conexión con el remoto origin',
          'Que el repositorio está vacío, sin commits',
        ],
      },
    ],
    wrong: [
      'El primer commit del repositorio',
      'La rama main tal como está en el remoto',
      'El último commit de cualquier rama',
      'El fichero de configuración del repositorio',
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
        ask: [
          '¿Qué hace git en un merge fast-forward?',
          'En un avance rápido (fast-forward), git…',
        ],
        right: [
          'Solo mueve la rama adelante, sin commit nuevo',
          'Solo avanza el puntero, porque no hay nada que mezclar',
        ],
      },
    ],
    wrong: [
      'Crea un commit de merge con dos padres',
      'Ignora los conflictos y se queda con lo tuyo',
      'Hace un push forzado de la rama al remoto',
      'Borra la otra rama después de unir',
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
        right: ['Un commit con dos padres', 'Un commit que une las dos historias'],
      },
    ],
    wrong: [
      'Un commit sin padre, como el primero',
      'Una copia de cada commit de la otra rama',
      'Una rama nueva con los dos cambios',
      'Nada: si avanzan las dos, no se pueden unir',
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
        right: ['Borra el nombre; los commits siguen en main'],
      },
      {
        ask: [
          '¿Qué hace git branch -d con una rama que tiene commits sin unir?',
          'Si una rama tiene trabajo sin unir, git branch -d…',
        ],
        right: ['Se niega a borrarla; con -D sí la borra'],
        wrong: [
          'La borra y sus commits pasan a main',
          'La une a main antes de borrarla',
          'La borra junto con todos sus commits',
        ],
      },
    ],
    wrong: [
      'Borra todos sus commits de la historia',
      'La borra también en el remoto, en origin',
      'Deshace el merge que la unió a main',
      'Borra sus ficheros de la carpeta',
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
          'Baja lo nuevo y mueve origin/main, sin tocar tus ramas',
          'Trae los commits del remoto pero no los une con lo tuyo',
        ],
      },
      {
        ask: ['¿Qué hace git pull, comparado con fetch?', 'git pull es…'],
        right: ['Un fetch seguido de un merge con tu rama'],
        wrong: [
          'Lo mismo que fetch, con otro nombre',
          'Un fetch seguido de un push de lo tuyo',
          'Un clone de nuevo, sobre lo que tienes',
        ],
      },
    ],
    wrong: [
      'Sube tus commits nuevos a la rama del remoto',
      'Baja lo nuevo y lo une en tu rama actual',
      'Borra las ramas que ya no están en el remoto',
      'Clona el repositorio otra vez, desde cero',
    ],
    why: 'fetch solo descarga y actualiza las ramas de seguimiento; pull además une con tu rama (con merge, o con rebase si se lo pides).',
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
          'Dónde estaba main en origin la última vez que miraste',
          'Tu copia de cómo estaba main en el remoto',
        ],
      },
    ],
    wrong: [
      'La rama main del remoto, en tiempo real',
      'Una rama en la que haces commits, como en main',
      'El primer commit que se subió a main',
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
        right: ['Traer lo suyo con git pull y volver a hacer push'],
        wrong: [
          'git push --force, sin mirar qué hay',
          'Borrar el repositorio y clonarlo de nuevo',
          'git commit --amend y otra vez git push',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: 'El remoto no deja que pises trabajo ajeno: primero traes lo suyo (pull, o pull --rebase), unes y luego subes.',
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
        right: ['Copia el repositorio con su historia y deja origin configurado'],
      },
    ],
    wrong: [
      'Descarga solo la última versión de los ficheros, sin historia',
      'Crea en el remoto una rama nueva con tu nombre',
      'Sube tu carpeta al servidor como repositorio',
      'Une dos repositorios en uno solo con su historia',
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
          'Copia tus commits encima de main, en línea',
          'Reaplica tus commits sobre main, con ids nuevos',
        ],
      },
      {
        ask: ['¿Cuándo no deberías hacer rebase?', 'El rebase es peligroso en…'],
        right: ['Ramas que ya comparte más gente'],
        wrong: [
          'Ramas que solo tienes tú en local',
          'Ramas con un solo commit',
          'Ramas que aún no has subido al remoto',
        ],
      },
    ],
    wrong: [
      'Une main en feature con un commit de merge',
      'Borra de main los commits que no tiene feature',
      'Sube feature al remoto y la une con main',
      'Cambia el nombre de la rama por main',
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
        right: ['Copia ese commit encima de donde estás', 'Trae un commit concreto de otra rama'],
      },
    ],
    wrong: [
      'Trae la rama entera de ese commit',
      'Borra ese commit de la historia',
      'Te mueve a ese commit con HEAD separado',
      'Deshace ese commit con otro nuevo',
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
          'Rehace el último commit, con otro mensaje o ficheros',
          'Cambia el último commit por otro corregido',
        ],
      },
    ],
    wrong: [
      'Añade un commit vacío detrás del último',
      'Deshace el último commit y borra sus cambios',
      'Cambia el mensaje de cualquier commit antiguo',
      'Sube el último commit al remoto, corregido',
    ],
    why: 'amend sustituye el último commit por uno nuevo; si ya lo subiste, los demás tienen el viejo.',
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
        right: ['El commit dos pasos antes de HEAD', 'El abuelo de HEAD, por el primer padre'],
      },
      {
        ask: ['¿Qué es `main^`?', 'main^ se refiere a…'],
        right: ['El padre del commit al que apunta main'],
        wrong: [
          'La rama main tal como está en el remoto',
          'El primer commit de la historia de main',
          'El hijo del commit al que apunta main',
        ],
      },
    ],
    wrong: [
      'La segunda rama del repositorio',
      'Los dos últimos commits juntos',
      'El commit dos pasos después de HEAD',
      'HEAD tal como está en el remoto',
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
        right: ['Retrocede un commit y borra sus cambios de la carpeta'],
        wrong: [
          'Retrocede un commit y deja sus cambios preparados',
          'Retrocede un commit y deja los cambios sin preparar',
          'Crea un commit nuevo que deshace el anterior',
        ],
      },
      {
        ask: ['¿Qué hace `git reset --soft HEAD~1`?', 'reset --soft HEAD~1…'],
        right: ['Retrocede un commit y deja sus cambios preparados'],
        wrong: [
          'Retrocede un commit y borra sus cambios de la carpeta',
          'Retrocede un commit y deja los cambios sin preparar',
          'Crea un commit nuevo que deshace el anterior',
        ],
      },
    ],
    wrong: ['Borra la rama', 'Descarga la versión del remoto', 'Deshace el último push'],
    why: 'reset mueve la rama: --soft deja lo deshecho preparado; sin opción (--mixed), sin preparar; y --hard lo borra.',
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
          'git reset --hard HEAD~1 y git push --force',
          'git commit --amend y git push --force',
          'Borrar la rama en origin y crearla de nuevo',
        ],
      },
      {
        ask: ['¿Qué hace `git revert`?', 'git revert de un commit…'],
        right: ['Crea un commit que deshace sus cambios'],
      },
    ],
    wrong: [
      'Borra el commit de la historia de la rama',
      'Vuelve a la versión que hay en el remoto',
      'Cambia el mensaje de ese commit',
      'Mueve la rama hasta ese commit',
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
          'Aparca los cambios sin commit y limpia la carpeta',
          'Guarda tus cambios a medias para cambiar de rama',
        ],
      },
    ],
    wrong: [
      'Hace un commit temporal en la rama main',
      'Borra los cambios que no tienen commit',
      'Sube los cambios a una rama oculta del remoto',
      'Añade los ficheros nuevos a .gitignore',
    ],
    why: 'stash guarda en una pila lo que aún no tiene commit; con stash pop vuelve donde estés.',
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
        right: ['Ramas cortas desde main que se unen por pull request'],
      },
    ],
    wrong: [
      'Todo el mundo hace commit directamente en main',
      'Hay dos ramas largas, main y develop, y ramas de release',
      'Cada persona tiene su propio repositorio sin remoto',
      'Solo se une a main una vez al año, en bloque',
    ],
    why: 'main siempre funciona: cada cambio va en una rama corta desde main, se revisa en un pull request y vuelve a main. Es el flujo más común en equipos pequeños.',
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
        wrong: [
          'De develop, y se une solo en develop',
          'De la última release, y se une en ella',
          'De una rama feature cualquiera',
        ],
      },
      {
        ask: ['En Gitflow, ¿para qué sirve develop?', 'La rama develop de Gitflow…'],
        right: ['Recoge el trabajo terminado hasta la próxima versión'],
        wrong: [
          'Es lo que está publicado ahora mismo en producción',
          'Es una rama de pruebas que se borra al acabar',
          'Guarda solo los hotfix que se han hecho en main',
        ],
      },
    ],
    wrong: [
      'No existe: en Gitflow no hay hotfix',
      'De origin/develop sin unir nunca',
      'Es una copia de seguridad de main',
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
      'Avanza con cada commit que haces',
      'Solo existe en el remoto, no en local',
      'Guarda una copia aparte de los ficheros',
      'Es una rama protegida que nadie toca',
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
        right: ['Todos unen en main varias veces al día, con ramas de horas'],
      },
    ],
    wrong: [
      'Cada versión vive en su rama para siempre',
      'Nadie usa ramas y se trabaja por correo',
      'Solo una persona puede hacer commits en main',
      'Las ramas duran meses y se unen al final',
    ],
    why: 'Ramas muy cortas y main siempre unido: pide tests automáticos y una CI que proteja main.',
  },
]
