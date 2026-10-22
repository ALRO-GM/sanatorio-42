/**
 * Las pruebas de grupo y el jefe final en inglés (`../groups.ts`): la historia
 * y las tareas de cada una, y cada misión por su texto en español, con los
 * mismos `{login}` y `{n}`.
 */

import type { GroupMission } from '../groups.js'

type MissionText = Pick<GroupMission, 'title' | 'story' | 'tasks'>

export const GROUPS_EN: Readonly<Record<string, MissionText>> = {
  group1: {
    title: 'Each one their own branch, and all into main',
    story:
      'You share a repository on origin and you have already cloned it. Each of you creates a branch named after your login, saves a file of your own on it and pushes it. Then each of you merges your branch into main with a merge commit and pushes main: whoever comes late finds main changed and has to bring it in first.',
    tasks: [
      'git switch -c {login}',
      'echo "hola" > {login}.txt, git add {login}.txt and git commit -m "My file"',
      'git push origin {login}',
      'git switch main and git pull (brings in what the others have pushed)',
      'git merge --no-ff {login} (a merge commit, even if it could move forward without one)',
      'git push. If it is rejected because someone pushed first: git pull and git push again',
    ],
  },
  group2: {
    title: 'GitHub flow with conflicts',
    story:
      'main is protected: the only way in is a pull request. Each of you adds your name at the end of equipo.txt from your branch. But while you work, someone changes that same ending on main: it will clash for all of you. You have to bring main into your branch, solve the conflict keeping every line, push it and accept the pull request.',
    tasks: [
      'git switch -c {login}',
      'echo "- {login}" >> equipo.txt, git add equipo.txt and git commit -m "Count me in"',
      'git push origin {login} and gh pr merge {login}: the pull request clashes with main',
      'git pull origin main: conflict in equipo.txt (look at it with cat equipo.txt)',
      'Leave equipo.txt with every line and without the markers (echo "…" > equipo.txt and echo "…" >> equipo.txt), git add equipo.txt and git commit',
      'git push origin {login} and gh pr merge {login} again (if it clashes again, repeat from git pull origin main)',
    ],
  },
  group3: {
    title: 'Gitflow: feature, hotfix and release',
    story:
      'main holds version 1.0 and develop is preparing the next one. Each of you does the three Gitflow things: a feature that goes into develop, an urgent fix that comes out of main and a release that comes out of develop. Every fix and every release ends up in main with its tag and goes back to develop.',
    tasks: [
      'Feature: git switch develop, git switch -c feature/{login}, echo "hecho" > {login}.txt, git add and git commit',
      'git switch develop, git pull, git merge --no-ff feature/{login} and git push origin develop',
      'Hotfix: git switch main, git pull, git switch -c hotfix/1.0.{n}, echo "arreglado" > arreglo-{login}.txt, git add and git commit',
      'git switch main, git merge --no-ff hotfix/1.0.{n}, git tag v1.0.{n}; git switch develop, git pull and git merge --no-ff hotfix/1.0.{n}',
      'Release: git switch -c release/1.{n} (from develop, with your feature), echo "notas" > notas-1.{n}.txt, git add and git commit',
      'git switch main, git pull, git merge --no-ff release/1.{n}, git tag v1.{n}; git switch develop, git pull and git merge --no-ff release/1.{n}',
      'git push origin main, git push origin develop and git push --tags (if you are rejected, git pull on that branch and try again)',
    ],
  },
  boss: {
    title: 'Final boss: everything, without talking',
    story:
      'Each of you at your own seat, far from the others and without talking: all you see is origin. main is protected and has one broken commit per person. Each of you undoes yours without rewriting history, puts your feature into develop in a single commit on top of the latest work (no merges), and, once everything is in develop and main is fixed, publishes your release.',
    tasks: [
      'Undo «Rompe {n}»: git switch -c fix/{login}, find it with git log, git revert <its id>, git push origin fix/{login} and gh pr merge fix/{login}',
      'Feature: git switch develop, git switch -c feature/{login}, two commits in {login}.txt («uno» and then «dos» with >>)',
      'Squash them into one: git reset --soft HEAD~2 and git commit -m "Feature by {login}"',
      'Put it on top of the latest work: git fetch and git rebase origin/develop',
      'git switch develop, git pull, git merge feature/{login} (it has to move forward without a merge) and git push origin develop. If develop moved: git reset --hard origin/develop, go back to your branch, rebase and try again',
      'When develop has every feature and main no longer has any rompe-*.txt: gh pr merge develop, git switch main, git pull, git tag v2.{n} and git push --tags',
    ],
  },
}

/** Cada misión, por su plantilla en español (`MissionItem.key`). */
export const MISSION_ITEMS_EN: Readonly<Record<string, string>> = {
  'origin/{login} tiene un commit de {login} con {login}.txt':
    'origin/{login} has a commit by {login} with {login}.txt',
  '{login} ha unido su rama en main con un merge y lo ha subido':
    '{login} has merged their branch into main with a merge and pushed it',
  '{login} ha traído main a su rama y ha resuelto el conflicto':
    '{login} has brought main into their branch and solved the conflict',
  '{login} está en equipo.txt de main, por pull request':
    '{login} is in equipo.txt on main, through a pull request',
  'equipo.txt de main conserva «- coordinación» y no tiene marcas de conflicto':
    'equipo.txt on main keeps «- coordinación» and has no conflict markers',
  'feature/{login} unida en develop con un merge':
    'feature/{login} merged into develop with a merge',
  'v1.0.{n}: el arreglo de {login}, en main y en develop':
    'v1.0.{n}: the fix by {login}, on main and on develop',
  'v1.{n}: la versión de {login}, con su funcionalidad, en main y en develop':
    'v1.{n}: the release by {login}, with their feature, on main and on develop',
  '{login} ha deshecho «Rompe {n}» con un revert, por pull request':
    '{login} has undone «Rompe {n}» with a revert, through a pull request',
  'La funcionalidad de {login}, en develop en un solo commit y sin merges':
    "{login}'s feature, on develop in a single commit and without merges",
  'v2.{n}: en main, con todas las funcionalidades y sin nada roto':
    'v2.{n}: on main, with every feature and nothing broken',
}
