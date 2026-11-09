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
      {
        // Predicción (motor: tras el commit, «Changes not staged for commit: modified: b.txt»)
        ask: [
          'Cambias `a.txt` y `b.txt`, haces `git add a.txt` y un commit. ¿Qué dice después `git status`?',
          'Con `a.txt` y `b.txt` cambiados, tras `git add a.txt` y un commit, `git status` dice…',
        ],
        right: [
          'Que `b.txt` sigue con cambios sin preparar',
          'Que los cambios de `b.txt` siguen fuera',
        ],
        wrong: [
          'Que `b.txt` también entró en el commit',
          'Que `a.txt` sigue con cambios sin preparar',
          'Que `b.txt` está preparado para el commit',
          'Que no queda nada que guardar en `main`',
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
      {
        // Predicción (motor: «Changes to be committed: modified: main.c»)
        ask: [
          'Cambias `main.c` y haces `git add main.c`, sin commit. ¿Cómo sale `main.c` en `git status`?',
          'Tras `git add main.c` y antes del commit, `git status` enseña `main.c` como…',
        ],
        right: ['Preparado para el próximo commit', 'Listo para entrar en el próximo commit'],
        wrong: [
          'Cambiado, pero sin preparar',
          'Guardado ya en un commit nuevo',
          'Sin seguir: git aún no lo conoce',
          'Subido ya a la rama del remoto',
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
      {
        // Predicción (motor: login apunta a c0, el commit de main)
        ask: [
          'Estás en `main` y creas la rama `login` sin hacer commits. ¿A qué commit apunta `login`?',
          'Recién creada desde `main`, sin commits nuevos, la rama `login` apunta…',
        ],
        right: ['Al mismo commit que main', 'Al commit en el que está main'],
        wrong: [
          'Al primer commit del repositorio',
          'A un commit nuevo, copia del de main',
          'A ninguno hasta que hagas un commit',
          'Al commit anterior al de main',
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
      {
        // Predicción (motor: el commit hecho con HEAD separado no sale en ninguna rama al volver a main)
        ask: [
          'Con HEAD separado haces un commit y vuelves a `main`. ¿Qué pasa con ese commit?',
          'Haces un commit con HEAD separado y luego `git switch main`. Ese commit…',
        ],
        right: ['No queda en ninguna rama', 'Se queda fuera de todas las ramas'],
        wrong: [
          'Se añade a main al volver',
          'Pasa a una rama nueva llamada HEAD',
          'Se borra en cuanto lo haces',
          'Se sube solo al remoto origin',
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
      {
        // Predicción (motor: tras git branch login y un commit, avanza main y login sigue en c0)
        ask: [
          'Estás en `main`, escribes `git branch login` y haces un commit. ¿Qué rama avanza?',
          'Tras `git branch login` y un commit, estando en `main`, la rama que avanza es…',
        ],
        right: [
          'main, porque git branch no te cambia de rama',
          'main: crear login no te lleva a ella',
        ],
        wrong: [
          'login, porque es la rama recién creada',
          'Las dos, porque apuntaban al mismo commit',
          'Ninguna, porque HEAD se queda separado',
          'login, y main se queda en el anterior',
        ],
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
      {
        // Predicción (motor: «Updating c1..c2 · Fast-forward», sin commit nuevo)
        ask: [
          '`feature` lleva 2 commits y `main` no ha avanzado. ¿Cuántos commits de merge crea `git merge feature` en `main`?',
          '¿Cuántos commits de merge crea `git merge feature` si `main` no se ha movido desde que salió `feature`?',
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
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
      {
        // Predicción: las dos ramas han avanzado (motor: «Merge made by the 'ort' strategy.»)
        ask: [
          '`main` y `feature` tienen un commit nuevo cada una. Tras `git merge feature`, ¿cuántos padres tiene el commit nuevo?',
          'Si las dos ramas han avanzado, ¿cuántos padres tiene el commit que crea `git merge`?',
        ],
        right: ['2'],
        wrong: ['1', '0', '3'],
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
      {
        // Predicción: origin/main solo cambia con fetch, pull o push
        ask: [
          'Tu `origin/main` está en `c3`. Alguien sube `c4` y tú no haces nada. ¿Dónde está tu `origin/main`?',
          'Otra persona sube `c4` a origin; tú no tecleas nada. Tu `origin/main`, que estaba en `c3`, ahora está…',
        ],
        right: ['En `c3`, hasta que hagas `git fetch`', 'Aún en `c3`: no lo mueve nadie más'],
        wrong: [
          'En `c4`, porque se actualiza solo',
          'En `c4`, pero sin sus ficheros',
          'Borrada hasta el próximo `git pull`',
          'En `c3`, y tu `main` pasa a `c4`',
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
      {
        // Predicción (motor: « ! [rejected] main -> main (fetch first)»)
        ask: [
          'Tu `main` y el de origin han avanzado cada uno por su lado. ¿Qué pasa con `git push`?',
          'Si origin tiene un commit que tú no tienes y tú uno que origin no tiene, `git push`…',
        ],
        right: [
          'Lo rechaza: antes tienes que traer lo suyo',
          'Falla hasta que unas lo que hay en origin',
        ],
        wrong: [
          'Sube lo tuyo y borra lo que había en origin',
          'Une las dos historias en el remoto',
          'Sube lo tuyo en una rama nueva de origin',
          'Sube lo tuyo y deja lo suyo para después',
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
      {
        // Predicción: clone trae toda la historia
        ask: [
          'Clonas un repositorio que tiene 20 commits. ¿Qué enseña `git log --oneline` nada más clonar?',
          'Nada más hacer `git clone` de un repositorio con 20 commits, `git log --oneline` enseña…',
        ],
        right: ['Los 20 commits, con toda la historia', 'Toda la historia: los 20 commits'],
        wrong: [
          'Solo el último commit, sin historia',
          'Nada: la historia sigue en el remoto',
          'Solo los commits que hagas desde ahora',
          'Un único commit nuevo llamado clone',
        ],
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
      {
        // Predicción (motor: «Successfully rebased and updated refs/heads/feature.», y sale c5')
        ask: [
          'En `feature` tienes 2 commits y `main` ha avanzado. Tras `git rebase main`, ¿qué pasa con los ids de tus commits?',
          'Tras `git rebase main` en `feature`, los ids de tus 2 commits…',
        ],
        right: [
          'Cambian: son copias nuevas encima de main',
          'Son otros: git crea copias sobre main',
        ],
        wrong: [
          'Siguen iguales: solo se mueve la rama',
          'Desaparecen, juntos en un solo commit',
          'Pasan a main con los mismos ids',
          'Siguen iguales y main se une a feature',
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
      {
        // Predicción: la rama de origen no cambia
        ask: [
          'En `main` haces `git cherry-pick` de un commit de la rama `fix`. ¿Qué le pasa a `fix`?',
          'Tras copiar en `main` un commit de `fix` con `git cherry-pick`, la rama `fix`…',
        ],
        right: ['Nada: sigue con ese commit donde estaba', 'Se queda igual, con su commit dentro'],
        wrong: [
          'Pierde el commit, que pasa a main',
          'Se une entera a main con un merge',
          'Avanza hasta la punta de main',
          'Se borra porque ya está en main',
        ],
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
      {
        // Escenario: falta un fichero en el último commit, aún sin subir
        ask: [
          'Acabas de hacer un commit, sin subirlo, y te has dejado `libft.h` fuera. ¿Qué haces?',
          'Para meter `libft.h` en el commit que acabas de hacer (sin subir), escribes…',
        ],
        right: ['`git add libft.h` y luego `git commit --amend`'],
        wrong: [
          '`git commit --amend` y luego `git add libft.h`',
          '`git revert HEAD` y luego `git add libft.h`',
          '`git add libft.h` y luego `git push --force`',
          '`git reset --hard HEAD~1` y otro `git commit`',
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
      {
        // Predicción (motor: git checkout HEAD~2 desde c3 → «HEAD is now at c1»)
        ask: [
          'Tu rama tiene 4 commits en línea, de c0 a c3, y HEAD está en c3. ¿Qué commit es `HEAD~2`?',
          'Con 4 commits en línea, de c0 a c3, y HEAD en c3, `HEAD~2` es…',
        ],
        right: ['c1'],
        wrong: ['c2', 'c0', 'c5'],
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
      {
        // Predicción (motor: «nothing to commit, working tree clean»)
        ask: [
          'Tienes `main.c` cambiado sin commit y haces `git stash`. ¿Qué dice después `git status`?',
          'Justo después de `git stash`, con `main.c` cambiado, `git status` dice…',
        ],
        right: ['Que no hay nada que guardar', 'Que el trabajo está limpio'],
        wrong: [
          'Que main.c sigue cambiado sin preparar',
          'Que main.c está preparado para el commit',
          'Que hay un commit nuevo en main',
          'Que main.c se ha borrado del repositorio',
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
      {
        // Escenario
        ask: [
          'Con GitHub flow, terminas un arreglo en tu rama `fix-login`. ¿Qué toca ahora?',
          'En GitHub flow, cuando acabas el trabajo de la rama `fix-login`, lo siguiente es…',
        ],
        right: [
          'Abrir un pull request para unirla a main',
          'Pedir revisión con un pull request a main',
        ],
        wrong: [
          'Unirla en develop y esperar a la release',
          'Subir sus commits directamente a main',
          'Dejarla abierta hasta la próxima versión',
          'Crear una rama release desde ella',
        ],
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
      {
        // Predicción (motor: tras dos commits, el tag sigue en c3)
        ask: [
          'Pones `git tag v1.0` en `c3` y haces dos commits más. ¿Dónde está `v1.0`?',
          'Tras `git tag v1.0` en `c3` y dos commits más, `v1.0` señala…',
        ],
        right: ['`c3`, donde lo pusiste', 'Aún `c3`: un tag no se mueve'],
        wrong: [
          '`c5`, el último commit',
          '`c4`, un commit por delante',
          'Ninguno: se borra con el commit',
          '`c3` y `c5`, los dos a la vez',
        ],
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
      {
        // Escenario: el trabajo largo va a main en trozos, apagado
        ask: [
          'Tu equipo hace trunk-based y una funcionalidad llevará dos semanas. ¿Cómo la llevas?',
          'En trunk-based, una funcionalidad de dos semanas se hace…',
        ],
        right: [
          'En trozos pequeños a main, apagada con un interruptor',
          'Unida a main a diario, oculta tras un flag',
        ],
        wrong: [
          'En una rama propia que unes al acabar',
          'En develop, hasta la próxima release',
          'En un fork aparte que nadie más ve',
          'Sin commits hasta que esté terminada',
        ],
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
