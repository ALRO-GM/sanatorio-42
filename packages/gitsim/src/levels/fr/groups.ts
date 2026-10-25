/**
 * Las pruebas de grupo y el jefe final en francés (`../groups.ts`): la
 * historia y las tareas de cada una, y cada misión por su texto en español,
 * con los mismos `{login}` y `{n}`.
 */

import type { GroupMission } from '../groups.js'

type MissionText = Pick<GroupMission, 'title' | 'story' | 'tasks'>

export const GROUPS_FR: Readonly<Record<string, MissionText>> = {
  group1: {
    title: 'Une branche par personne, et tout dans main',
    story:
      'Vous partagez un dépôt sur origin et vous l’avez déjà cloné. Chaque personne crée une branche qui porte son login, y enregistre son propre fichier dans un commit et la pousse. Ensuite, chaque personne fusionne sa branche dans main avec un commit de merge et pousse main : qui arrive en dernier trouve main modifiée et doit d’abord la récupérer.',
    tasks: [
      'git switch -c {login}',
      'echo "hola" > {login}.txt, git add {login}.txt et git commit -m "Mon fichier"',
      'git push origin {login}',
      'git switch main et git pull (récupère ce que les autres ont poussé)',
      'git merge --no-ff {login} (un commit de merge, même si une avance rapide était possible)',
      'git push. S’il est refusé parce que quelqu’un a poussé avant toi : git pull, puis de nouveau git push',
    ],
  },
  group2: {
    title: 'GitHub flow avec conflits',
    story:
      'main est protégée : on n’y entre que par une pull request. Chaque personne ajoute son nom à la fin d’equipo.txt depuis sa branche. Mais pendant que vous travaillez, quelqu’un modifie cette même fin de fichier sur main : il y aura un conflit pour tout le monde. Chaque personne doit ramener main dans sa branche, résoudre le conflit en gardant toutes les lignes, la pousser et accepter la pull request.',
    tasks: [
      'git switch -c {login}',
      'echo "- {login}" >> equipo.txt, git add equipo.txt et git commit -m "Je m’inscris"',
      'git push origin {login} et gh pr merge {login} : la pull request est en conflit avec main',
      'git pull origin main : conflit dans equipo.txt (regarde-le avec cat equipo.txt)',
      'Laisse equipo.txt avec toutes les lignes et sans les marqueurs (echo "…" > equipo.txt et echo "…" >> equipo.txt), git add equipo.txt et git commit',
      'git push origin {login} et de nouveau gh pr merge {login} (si le conflit revient, recommence à partir de git pull origin main)',
    ],
  },
  group3: {
    title: 'Gitflow : fonctionnalité, hotfix et release',
    story:
      'main contient la version 1.0 et develop prépare la suivante. Chaque personne fait les trois choses de Gitflow : une fonctionnalité qui entre dans develop, une correction urgente qui part de main et une release qui part de develop. Chaque correction et chaque release finissent dans main avec leur tag et reviennent dans develop.',
    tasks: [
      'Fonctionnalité : git switch develop, git switch -c feature/{login}, echo "hecho" > {login}.txt, git add et git commit',
      'git switch develop, git pull, git merge --no-ff feature/{login} et git push origin develop',
      'Hotfix : git switch main, git pull, git switch -c hotfix/1.0.{n}, echo "arreglado" > arreglo-{login}.txt, git add et git commit',
      'git switch main, git merge --no-ff hotfix/1.0.{n}, git tag v1.0.{n} ; git switch develop, git pull et git merge --no-ff hotfix/1.0.{n}',
      'Release : git switch -c release/1.{n} (depuis develop, avec ta fonctionnalité), echo "notas" > notas-1.{n}.txt, git add et git commit',
      'git switch main, git pull, git merge --no-ff release/1.{n}, git tag v1.{n} ; git switch develop, git pull et git merge --no-ff release/1.{n}',
      'git push origin main, git push origin develop et git push --tags (si c’est refusé, git pull sur cette branche et recommence)',
    ],
  },
  boss: {
    title: 'Boss final : tout, sans parler',
    story:
      'Chaque personne à son poste, loin des autres et sans parler : vous ne voyez qu’origin. main est protégée et contient un commit cassé par personne. Chaque personne annule le sien sans réécrire l’historique, met sa fonctionnalité dans develop en un seul commit au-dessus du travail le plus récent (sans merge) et, quand tout est dans develop et que main est réparée, publie sa release.',
    tasks: [
      'Annule « Rompe {n} » : git switch -c fix/{login}, trouve-le avec git log, git revert <son id>, git push origin fix/{login} et gh pr merge fix/{login}',
      'Fonctionnalité : git switch develop, git switch -c feature/{login}, deux commits dans {login}.txt (« uno », puis « dos » avec >>)',
      'Regroupe-les en un seul : git reset --soft HEAD~2 et git commit -m "Fonctionnalité de {login}"',
      'Place-la au-dessus du travail le plus récent : git fetch et git rebase origin/develop',
      'git switch develop, git pull, git merge feature/{login} (ça doit avancer sans merge) et git push origin develop. Si develop a bougé : git reset --hard origin/develop, reviens sur ta branche, rebase et recommence',
      'Quand develop a toutes les fonctionnalités et que main n’a plus aucun rompe-*.txt : gh pr merge develop, git switch main, git pull, git tag v2.{n} et git push --tags',
    ],
  },
}

/** Cada misión, por su plantilla en español (`MissionItem.key`). */
export const MISSION_ITEMS_FR: Readonly<Record<string, string>> = {
  'origin/{login} tiene un commit de {login} con {login}.txt':
    'origin/{login} a un commit de {login} avec {login}.txt',
  '{login} ha unido su rama en main con un merge y lo ha subido':
    '{login} a fusionné sa branche dans main avec un merge et a poussé main',
  '{login} ha traído main a su rama y ha resuelto el conflicto':
    '{login} a ramené main dans sa branche et a résolu le conflit',
  '{login} está en equipo.txt de main, por pull request':
    '{login} est dans equipo.txt sur main, via une pull request',
  'equipo.txt de main conserva «- coordinación» y no tiene marcas de conflicto':
    'equipo.txt sur main garde « - coordinación » et n’a aucun marqueur de conflit',
  'feature/{login} unida en develop con un merge':
    'feature/{login} fusionnée dans develop avec un merge',
  'v1.0.{n}: el arreglo de {login}, en main y en develop':
    'v1.0.{n} : la correction de {login}, dans main et dans develop',
  'v1.{n}: la versión de {login}, con su funcionalidad, en main y en develop':
    'v1.{n} : la release de {login}, avec sa fonctionnalité, dans main et dans develop',
  '{login} ha deshecho «Rompe {n}» con un revert, por pull request':
    '{login} a annulé « Rompe {n} » avec un revert, via une pull request',
  'La funcionalidad de {login}, en develop en un solo commit y sin merges':
    'La fonctionnalité de {login}, dans develop en un seul commit et sans merge',
  'v2.{n}: en main, con todas las funcionalidades y sin nada roto':
    'v2.{n} : dans main, avec toutes les fonctionnalités et rien de cassé',
}
