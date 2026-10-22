/** Curso de git en inglés: mundos 0 y 1 (`../basics.ts`), por id del nivel. */

import type { LevelText } from './types.js'

export const BASICS_EN: Readonly<Record<string, LevelText>> = {
  'w0-commit': {
    title: 'Your first commit',
    goal: 'Make two commits on main.',
    theory: {
      what: 'A commit is a snapshot of your files at one moment, with a message. Each commit points to the one before it: that is how history is built.',
      how: ['git commit -m "Add the Makefile"', 'git log --oneline'],
      when: 'Every time you finish a small change that makes sense on its own: a function, a fix, a test.',
      whenNot:
        "With half-done code that does not compile, if you are going to share it: you break everyone else's work.",
      looks: 'A new circle on top of the previous one, and the branch (main) moves forward to it.',
      problems:
        'Giant commits called «various changes»: later nobody (not even you) knows what each one did.',
    },
  },
  'w0-add': {
    title: 'The index: git add',
    goal: 'Create hola.c with the text «int main(void)» and save it in a commit.',
    theory: {
      what: 'Between your files and the commit sits the index (staging area): git add chooses which changes go into the next commit.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status',
        'git add hola.c',
        'git commit -m "Add hola.c"',
      ],
      when: 'Always before a commit. With add you can make several clean commits from the changes of one work session.',
      whenNot: 'git add . without looking: you end up committing binaries, .o files or keys.',
      looks: 'The index does not show in the tree: it is what will go inside the next circle.',
      problems:
        'Forgetting the add: the commit comes out without your changes (git status tells you).',
    },
  },
  'w0-status': {
    title: 'Look before you save',
    goal: 'Two files have changed: save only libft.h in a commit (not main.c).',
    theory: {
      what: 'git status tells you which branch you are on, what is staged and what is not. git log shows the history.',
      how: ['git status', 'git add libft.h', 'git commit -m "Prototypes"', 'git log --oneline'],
      when: 'Before every add and every commit: it is free and avoids surprises.',
      looks:
        'Only libft.h goes into the commit; main.c is still modified in your working directory.',
    },
  },
  'w0-world': {
    title: 'Root: the history',
    goal: 'Three commits: the first creates notas.txt with «a», the second adds a line «b» to it and the third adds todo.txt with «c».',
    theory: {
      what: 'World review: each commit saves a snapshot of what you staged with add, and the branch moves forward with each one.',
      how: [
        'echo a > notas.txt',
        'git add notas.txt',
        'git commit -m "notes"',
        'echo b >> notas.txt',
        'git commit -am "more notes"',
      ],
      when: 'From here on, everything else is built on commits.',
      looks: 'Three circles in a row on main.',
    },
  },
  'w1-branch': {
    title: 'Create a branch',
    goal: 'Create the branch feature, switch to it and make a commit there.',
    theory: {
      what: 'A branch is just a name that points to a commit. Creating one is free: use it to work on something without touching main.',
      how: [
        'git branch feature',
        'git switch feature',
        'git switch -c otra   # create and switch at the same time',
      ],
      when: 'For every new thing: a feature, a fix, an experiment.',
      whenNot: 'Branches that live for months without being merged: the merge later is hell.',
      looks: 'A new label on the same circle; when you commit on it, it separates from main.',
      problems:
        'Committing without checking which branch you are on (git status tells you, and so does the prompt).',
    },
  },
  'w1-head': {
    title: 'HEAD: where you are',
    goal: 'Go back to main and make a commit: main and feature end up diverged.',
    theory: {
      what: 'HEAD is where you are: usually it points to a branch, and the branch to a commit. When you commit, the branch that HEAD points to moves forward.',
      how: ['git switch main', 'git log --oneline --all'],
      when: 'You switch branches to work on something else without mixing things.',
      looks: 'Two paths leaving the same commit: the history forks.',
      problems:
        'Switching branches with unsaved changes: git does not let you (or carries them along). Commit or stash first.',
    },
  },
  'w1-ff': {
    title: 'Merge: fast-forward',
    goal: 'Merge feature into main without creating a new commit (fast-forward).',
    theory: {
      what: 'If main has not moved since you branched off, merging feature just moves main forward: this is a fast-forward.',
      how: ['git switch main', 'git merge feature'],
      when: 'When nobody has touched main while you were working.',
      whenNot:
        'If you want to keep a record that a branch existed: git merge --no-ff creates the merge commit anyway.',
      looks: 'The main label jumps to where feature is. No new circle appears.',
    },
  },
  'w1-merge': {
    title: 'Merge: three-way merge',
    goal: 'main and feature have both moved forward: merge them into main with a merge commit.',
    theory: {
      what: 'If both branches have new commits, git combines the changes of both (from their common ancestor) in a merge commit with two parents.',
      how: ['git switch main', 'git merge feature'],
      when: 'To bring the finished work of a branch into main.',
      whenNot:
        'If both branches changed the same thing in different ways there will be a conflict: it is not bad, but you have to resolve it calmly.',
      looks: 'A new circle with two arrows: one to each branch.',
      problems: 'Merging main into your branch every five minutes makes the history messy.',
    },
  },
  'w1-delete': {
    title: 'Review: branch, merge and clean up',
    goal: 'Create fix from main, make a commit, merge it into main and delete fix.',
    theory: {
      what: 'A branch that is already merged is not needed: delete it (the work stays in main). git branch -d does not let you delete one that is not merged.',
      how: [
        'git switch -c fix',
        'git commit -m "fix"',
        'git switch main',
        'git merge fix',
        'git branch -d fix',
      ],
      when: 'When you finish each branch: that way the branch list shows what is still alive.',
      whenNot:
        'git branch -D (capital) deletes even if it is not merged: the work is lost (or almost).',
      looks: 'The fix label disappears; the circles are still there, inside main.',
    },
  },
  'w1-world': {
    title: 'Branches: two at a time',
    goal: 'Two branches, a and b, leave main with one commit each; merge both into main (first a, then b).',
    theory: {
      what: 'World review: several branches in parallel, each with its own work, and main merging them one by one.',
      how: [
        'git switch -c a',
        'git commit',
        'git switch main',
        'git switch -c b',
        'git commit',
        'git switch main',
        'git merge a',
        'git merge b',
      ],
      when: 'The normal thing in a team: everyone on their own branch, and main collecting the work.',
      looks: 'main fast-forwards with a and then makes a merge with b.',
    },
  },
}
