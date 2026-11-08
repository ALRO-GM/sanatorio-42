/** Curso de git en inglés: mundos 0 y 1 (`../basics.ts`), por id del nivel. */

import type { LevelText } from './types.js'

export const BASICS_EN: Readonly<Record<string, LevelText>> = {
  'w0-commit': {
    title: 'Your first commit',
    goal: 'Make two commits on main.',
    theory: {
      what: 'A commit saves a snapshot of your files with a message. Each commit points to the one before: that is how history is built.',
      how: [
        'git commit -m "Añade el Makefile"   # a new circle on main',
        'git log --oneline                   # the history, newest on top',
      ],
      when: 'Every time you finish a small change that makes sense on its own: a function, a fix, a test.',
      whenNot:
        'One giant commit of “various changes” is unreadable later: better several small ones, one per change.',
      looks: 'A new circle on top of the previous one, and main moves forward to it.',
      problems:
        'Leaving the message empty: git commit -m "" answers “el mensaje está vacío: git commit -m "qué has hecho"” (empty message). Say what the change does.',
    },
  },
  'w0-add': {
    title: 'The index: git add',
    goal: 'Create hola.c with the text «int main(void)» and save it in a commit.',
    theory: {
      what: 'Between your files and the commit sits the index. git add chooses which changes go into the next commit; what you do not add stays out.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status                    # hola.c, not staged',
        'git add hola.c                # into the index',
        'git commit -m "Añade hola.c"',
      ],
      when: 'After a while touching several things, to make clean commits: one per change.',
      whenNot:
        'git add . adds everything at once, including what you did not want (binaries, .o files, keys). Check git status first.',
      looks: 'The index is not drawn: it is what will go inside the next circle.',
      problems:
        'Forgetting the add: the commit goes out without hola.c and git status still says “Cambios sin preparar: hola.c” (not staged). Run git add hola.c and commit again.',
    },
  },
  'w0-status': {
    title: 'Look before you save',
    goal: 'Two files have changed: save only libft.h in a commit (not main.c).',
    theory: {
      what: 'git status tells you which branch you are on, what is staged for the commit and what is not.',
      how: [
        'git status                  # libft.h and main.c, not staged',
        'git add libft.h',
        'git status                  # only libft.h, staged',
        'git commit -m "Prototipos"',
      ],
      when: 'Before every add and every commit: it is free and avoids surprises.',
      whenNot:
        'git status does not show history: the commits already made are in git log --oneline.',
      looks: 'Only libft.h goes into the commit; main.c is still modified in your directory.',
      problems:
        'git add . without looking: git status says “Preparado para el commit: libft.h, main.c” (staged) and the commit would take both. Add by name: git add libft.h.',
    },
  },
  'w0-world': {
    title: 'Root: the history',
    goal: 'Three commits: the first creates notas.txt with «a», the second adds a line «b» to it and the third adds todo.txt with «c».',
    theory: {
      what: 'Review: add stages, commit saves and the branch moves forward. git commit -am stages and saves in one go what git already tracks.',
      how: [
        'echo a > notas.txt',
        'git add notas.txt            # new: it needs add',
        'git commit -m "notas"',
        'echo b >> notas.txt',
        'git commit -am "más notas"   # already tracked: -a works',
      ],
      when: 'For changes to files already in the history, without typing add every time.',
      whenNot:
        'To save just one of several changes, -a is no good: it stages everything. Use git add with its name.',
      looks: 'Three circles in a row on main.',
      problems:
        'Using -a with a new file: it does not add it. The commit goes out without it and git status says “Cambios sin preparar: notas.txt”. Run git add first.',
    },
  },
  'w1-branch': {
    title: 'Create a branch',
    goal: 'Create the branch feature, switch to it and make a commit there.',
    theory: {
      what: 'A branch is a name that points to a commit. Creating one copies nothing: it lets you work without touching main.',
      how: [
        'git branch feature          # creates it; you stay on main',
        'git switch feature          # you move onto it',
        'git switch -c otra          # create and switch at once',
      ],
      when: 'For each new thing: a feature, a fix, an experiment.',
      whenNot:
        'A branch that lives for months without merging drifts away from main: merging it later costs much more.',
      looks: 'A new label on the same circle; once you commit on it, it splits off from main.',
      problems:
        'Committing after git branch without switching: the commit lands on main, and git status says so: “En la rama main” (on branch main). Use git switch first.',
    },
  },
  'w1-head': {
    title: 'HEAD: where you are',
    goal: 'Go back to main and make a commit: main and feature diverge.',
    theory: {
      what: 'HEAD marks where you are: it points to a branch, and the branch to a commit. When you commit, the HEAD branch moves forward.',
      how: [
        'git switch main             # HEAD moves to main',
        'git commit -m "arreglo"     # main moves, not feature',
        'git log --oneline --all     # both branches',
      ],
      when: 'To switch branch and work on something else without mixing.',
      whenNot:
        'git log --oneline only shows the history of where you are; with --all you also see the other branches.',
      looks: 'Two paths leaving the same commit: history forks.',
      problems:
        'Switching branch with uncommitted changes: the course answers “tienes cambios sin guardar: haz commit o stash antes de cambiar de rama” (unsaved changes). Commit first.',
    },
  },
  'w1-ff': {
    title: 'Merge: fast-forward',
    goal: 'Merge feature into main without creating a new commit (fast-forward).',
    theory: {
      what: 'If main has not moved since you branched feature off, merging only moves main forward: a fast-forward, with no new commit.',
      how: ['git switch main', 'git merge feature           # “Avance rápido (fast-forward)”'],
      when: 'When nobody touched main while you worked on your branch.',
      whenNot:
        'To keep a trace of the branch, git merge --no-ff makes a merge commit even when it could fast-forward.',
      looks: 'The main label jumps to feature. No new circle appears.',
      problems:
        'Merging the wrong way, from feature: git merge main says “Ya está todo unido” (already merged) and main does not move. Switch to main and merge feature.',
    },
  },
  'w1-merge': {
    title: 'Merge: three-way merge',
    goal: 'main and feature have both moved forward: merge them into main with a merge commit.',
    theory: {
      what: 'If both branches have new commits, git combines their changes since the common ancestor in a merge commit with two parents.',
      how: [
        'git switch main',
        'git merge feature           # “Merge hecho: c4”',
        'git log --oneline           # “Merge feature” on top',
      ],
      when: 'To bring a branch’s finished work into main.',
      whenNot:
        'If both branches change the same line, there is a conflict: you will see it in world 4.',
      looks: 'A new circle with two arrows: one to each branch.',
      problems:
        'Merging from the wrong branch: on feature, git merge main leaves “(HEAD -> feature) Merge main” in the log and main untouched. Switch to main first.',
    },
  },
  'w1-delete': {
    title: 'Review: branch, merge and clean up',
    goal: 'Create fix from main, make a commit, merge it into main and delete fix.',
    theory: {
      what: 'A merged branch is no longer needed: delete it and its work stays in main. git branch -d will not delete an unmerged branch.',
      how: [
        'git switch -c fix',
        'git commit -m "arreglo"',
        'git switch main',
        'git merge fix',
        'git branch -d fix           # “Rama fix borrada”',
      ],
      when: 'When you finish each branch: that way the branch list shows what is alive.',
      whenNot: 'git branch -D deletes even if unmerged: its commits are left with no branch.',
      looks: 'The fix label disappears; the circles are still there, inside main.',
      problems:
        'Deleting before merging: git branch -d fix answers “fix tiene commits sin unir: usa -D para borrarla igualmente” (unmerged commits). Merge first.',
    },
  },
  'w1-world': {
    title: 'Branches: two at a time',
    goal: 'Two branches, a and b, leave main with one commit each; merge both into main (first a, then b).',
    theory: {
      what: 'Review: several branches in parallel, each with its own work, and main merging them one by one.',
      how: [
        'git switch -c a',
        'git commit -m "a1"',
        'git switch main             # go back before creating b',
        'git merge a                 # fast-forward',
        'git merge b                 # merge with two parents',
      ],
      when: 'The usual in a team: everyone on their branch, and main collecting.',
      whenNot:
        'Order matters: the first branch you merge fast-forwards; the second one needs a merge.',
      looks: 'main fast-forwards to a and then merges b.',
      problems:
        'Creating b without going back to main: git switch -c b says “Rama b creada en c2”, a’s commit, so b takes a1 along. Go back to main first.',
    },
  },
}
