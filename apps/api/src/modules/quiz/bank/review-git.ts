/**
 * Repaso de Not-games: los conceptos de git (los del curso de git). Lo que se
 * ve en «Repaso» si se fallan, también en el test previo a una prueba de grupo.
 */

import type { ReviewEntry } from './types.js'

export const REVIEW_GIT: Record<string, ReviewEntry> = {
  'git-commit': {
    title: 'Commit',
    definition:
      'Una foto de lo que preparaste con git add, con un mensaje y un enlace al commit anterior. La cadena de commits es la historia.',
    example: 'git add hola.c && git commit -m "Añade hola.c"',
  },
  'git-status': {
    title: 'git status',
    definition:
      'Dice en qué rama estás, qué está preparado para el próximo commit y qué ha cambiado sin preparar. La historia se ve con git log.',
    example: 'git status → «Cambios sin preparar: main.c»',
  },
  'git-branch-what': {
    title: 'Rama',
    definition:
      'Un nombre que apunta a un commit y avanza con cada commit que haces en ella. Crearla no copia nada.',
    example: 'git branch login → login apunta al mismo commit que la rama actual.',
  },
  'git-head': {
    title: 'HEAD',
    definition:
      'Dónde estás. Normalmente apunta a una rama; si apunta a un commit directamente, está separado (detached) y lo que hagas no queda en ninguna rama.',
    example: 'git checkout HEAD~2 → HEAD separado; git switch -c nueva para guardar lo que hagas.',
  },
  'git-switch-c': {
    title: 'Crear y cambiarse de rama',
    definition: 'git switch -c (o git checkout -b) crea una rama y te cambia a ella de una vez.',
    example: 'git switch -c login',
  },
  'git-fast-forward': {
    title: 'Merge fast-forward',
    definition:
      'Si la rama de destino no ha avanzado, unir solo la mueve hasta la punta de la otra: no hay commit nuevo. Con --no-ff se fuerza el commit de merge.',
    example: 'main en c1, feature en c3 (sale de c1): git merge feature → main en c3.',
  },
  'git-merge-commit': {
    title: 'Commit de merge',
    definition:
      'Si las dos ramas han avanzado, git junta sus cambios desde el ancestro común en un commit con dos padres.',
    example: 'git switch main && git merge feature → «Merge feature», con padres main y feature.',
  },
  'git-branch-delete': {
    title: 'Borrar ramas',
    definition:
      'git branch -d borra el nombre de una rama ya unida (sus commits siguen donde estén). Si tiene trabajo sin unir, se niega; -D la borra igualmente.',
    example: 'git merge fix && git branch -d fix',
  },
  'git-fetch': {
    title: 'fetch y pull',
    definition:
      'fetch baja lo nuevo del remoto y mueve origin/rama, sin tocar tus ramas. pull es fetch más merge (o más rebase con --rebase).',
    example: 'git fetch && git log --oneline --all; luego git merge origin/main.',
  },
  'git-tracking': {
    title: 'Ramas de seguimiento',
    definition:
      'origin/main es tu copia de dónde estaba main en el remoto la última vez que hablaste con él. Solo cambia con fetch, pull o push.',
    example: 'Tras git fetch, origin/main puede ir por delante de tu main.',
  },
  'git-push-rejected': {
    title: 'Push rechazado',
    definition:
      'El remoto no acepta un push que pisaría commits que tú no tienes. Hay que traerlos (pull o pull --rebase), unir y volver a subir.',
    example: 'git push → rechazado; git pull --rebase; git push.',
  },
  'git-clone': {
    title: 'git clone',
    definition:
      'Copia el repositorio entero, con toda la historia, y deja configurado el remoto origin.',
    example: 'git clone git@github.com:yo/libft.git',
  },
  'git-rebase': {
    title: 'Rebase',
    definition:
      'Copia los commits de tu rama encima de otra: la historia queda en línea, pero los commits son nuevos (otros ids). No se hace en ramas que comparte más gente.',
    example: 'git switch feature && git rebase main',
  },
  'git-cherry-pick': {
    title: 'Cherry-pick',
    definition: 'Copia los cambios de un commit concreto encima de donde estás.',
    example: 'git cherry-pick a1b2c3 → trae solo ese arreglo de la otra rama.',
  },
  'git-amend': {
    title: 'commit --amend',
    definition:
      'Sustituye el último commit por uno corregido (mensaje o ficheros). Si ya lo habías subido, tocará forzar el push.',
    example: 'git add olvidado.c && git commit --amend',
  },
  'git-relative': {
    title: 'Referencias relativas',
    definition: 'HEAD~n es n commits antes de HEAD; rama^ es el padre del commit de la rama.',
    example: 'git reset HEAD~2, git checkout main^',
  },
  'git-reset': {
    title: 'Reset',
    definition:
      'Mueve la rama a otro commit. --soft deja lo deshecho preparado, el normal (--mixed) sin preparar y --hard lo borra. Solo en commits que no ha visto nadie.',
    example: 'git reset --soft HEAD~3 && git commit -m "Todo junto" junta tres commits en uno.',
  },
  'git-revert': {
    title: 'Revert',
    definition:
      'Crea un commit nuevo que hace lo contrario de otro. No reescribe la historia: es la forma segura de deshacer algo que ya está en el remoto.',
    example: 'git revert HEAD && git push',
  },
  'git-stash': {
    title: 'Stash',
    definition:
      'Aparca los cambios sin commit y deja la carpeta limpia. git stash pop los devuelve donde estés.',
    example: 'git stash; git switch fix; …; git switch main; git stash pop',
  },
  'git-github-flow': {
    title: 'GitHub flow',
    definition:
      'main siempre funciona. Cada cambio va en una rama corta que se sube, se revisa en un pull request y se une a main.',
    example: 'git switch -c api; commits; git push origin api; pull request; merge.',
  },
  'git-gitflow': {
    title: 'Gitflow',
    definition:
      'Dos ramas largas: main (lo publicado) y develop (lo próximo). Las versiones salen en ramas release; los arreglos urgentes, en hotfix desde main, que se une en main y en develop.',
    example: 'git switch -c hotfix main; arreglo; merge en main (tag v1.0.1) y en develop.',
  },
  'git-tag': {
    title: 'Tags',
    definition:
      'Un nombre fijo para un commit, normalmente una versión. A diferencia de una rama, no se mueve. Se suben con git push --tags.',
    example: 'git tag v1.0 && git push --tags',
  },
  'git-trunk': {
    title: 'Trunk-based',
    definition:
      'Todo el mundo une en main varias veces al día, con ramas de horas. Necesita tests automáticos que protejan main.',
    example: 'git switch -c mini; un commit; rebase en main; merge rápido; push; borrar mini.',
  },
}
