/** Repaso de Not-games en inglés: git, traducción de `../review-git.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_GIT_EN: Readonly<Record<string, ReviewEntry>> = {
  'git-commit': {
    title: 'Commit',
    definition:
      'A snapshot of what you staged with git add, with a message and a link to the previous commit. The chain of commits is the history.',
    example: 'git add hola.c && git commit -m "Add hola.c"',
  },
  'git-status': {
    title: 'git status',
    definition:
      'Tells you which branch you are on, what is staged for the next commit and what has changed but is not staged. You see the history with git log.',
    example: 'git status → "Changes not staged for commit: main.c"',
  },
  'git-branch-what': {
    title: 'Branch',
    definition:
      'A name that points to a commit and moves forward with every commit you make on it. Creating one copies nothing.',
    example: 'git branch login → login points to the same commit as the current branch.',
  },
  'git-head': {
    title: 'HEAD',
    definition:
      'Where you are. It usually points to a branch; if it points straight to a commit, it is detached and what you do is not saved on any branch.',
    example: 'git checkout HEAD~2 → detached HEAD; git switch -c new to keep what you do.',
  },
  'git-switch-c': {
    title: 'Create and switch to a branch',
    definition:
      'git switch -c (or git checkout -b) creates a branch and switches to it in one step.',
    example: 'git switch -c login',
  },
  'git-fast-forward': {
    title: 'Fast-forward merge',
    definition:
      'If the target branch has not moved forward, merging just moves it to the tip of the other one: there is no new commit. With --no-ff a merge commit is forced.',
    example: 'main at c1, feature at c3 (branched from c1): git merge feature → main at c3.',
  },
  'git-merge-commit': {
    title: 'Merge commit',
    definition:
      'If both branches have moved forward, git combines their changes from the common ancestor into a commit with two parents.',
    example:
      'git switch main && git merge feature → "Merge feature", with parents main and feature.',
  },
  'git-branch-delete': {
    title: 'Deleting branches',
    definition:
      'git branch -d deletes the name of a branch that is already merged (its commits stay where they are). If it has unmerged work, it refuses; -D deletes it anyway.',
    example: 'git merge fix && git branch -d fix',
  },
  'git-fetch': {
    title: 'fetch and pull',
    definition:
      'fetch downloads what is new from the remote and moves origin/branch, without touching your branches. pull is fetch plus merge (or plus rebase with --rebase).',
    example: 'git fetch && git log --oneline --all; then git merge origin/main.',
  },
  'git-tracking': {
    title: 'Tracking branches',
    definition:
      'origin/main is your copy of where main was on the remote the last time you talked to it. It only changes with fetch, pull or push.',
    example: 'After git fetch, origin/main can be ahead of your main.',
  },
  'git-push-rejected': {
    title: 'Rejected push',
    definition:
      'The remote does not accept a push that would overwrite commits you do not have. You have to bring them in (pull or pull --rebase), merge and push again.',
    example: 'git push → rejected; git pull --rebase; git push.',
  },
  'git-clone': {
    title: 'git clone',
    definition:
      'Copies the whole repository, with its full history, and sets up the origin remote.',
    example: 'git clone git@github.com:yo/libft.git',
  },
  'git-rebase': {
    title: 'Rebase',
    definition:
      'Copies the commits of your branch on top of another one: the history ends up in a straight line, but the commits are new (different ids). Do not do it on branches that other people share.',
    example: 'git switch feature && git rebase main',
  },
  'git-cherry-pick': {
    title: 'Cherry-pick',
    definition: 'Copies the changes of one specific commit on top of where you are.',
    example: 'git cherry-pick a1b2c3 → brings only that fix from the other branch.',
  },
  'git-amend': {
    title: 'commit --amend',
    definition:
      'Replaces the last commit with a corrected one (message or files). If you had already pushed it, you will have to force the push.',
    example: 'git add olvidado.c && git commit --amend',
  },
  'git-relative': {
    title: 'Relative references',
    definition: 'HEAD~n is n commits before HEAD; branch^ is the parent of the branch commit.',
    example: 'git reset HEAD~2, git checkout main^',
  },
  'git-reset': {
    title: 'Reset',
    definition:
      'Moves the branch to another commit. --soft leaves the undone changes staged, the default (--mixed) leaves them unstaged and --hard deletes them. Only on commits nobody has seen.',
    example:
      'git reset --soft HEAD~3 && git commit -m "All together" squashes three commits into one.',
  },
  'git-revert': {
    title: 'Revert',
    definition:
      'Creates a new commit that does the opposite of another one. It does not rewrite history: it is the safe way to undo something that is already on the remote.',
    example: 'git revert HEAD && git push',
  },
  'git-stash': {
    title: 'Stash',
    definition:
      'Sets aside your uncommitted changes and leaves the folder clean. git stash pop brings them back wherever you are.',
    example: 'git stash; git switch fix; …; git switch main; git stash pop',
  },
  'git-github-flow': {
    title: 'GitHub flow',
    definition:
      'main always works. Each change goes on a short branch that is pushed, reviewed in a pull request and merged into main.',
    example: 'git switch -c api; commits; git push origin api; pull request; merge.',
  },
  'git-gitflow': {
    title: 'Gitflow',
    definition:
      'Two long-lived branches: main (what is released) and develop (what comes next). Versions come out on release branches; urgent fixes go on hotfix branches from main, which are merged into main and develop.',
    example: 'git switch -c hotfix main; fix; merge into main (tag v1.0.1) and into develop.',
  },
  'git-tag': {
    title: 'Tags',
    definition:
      'A fixed name for a commit, usually a version. Unlike a branch, it does not move. Push them with git push --tags.',
    example: 'git tag v1.0 && git push --tags',
  },
  'git-trunk': {
    title: 'Trunk-based',
    definition:
      'Everybody merges into main several times a day, with branches that live for hours. It needs automated tests that protect main.',
    example: 'git switch -c mini; one commit; rebase on main; quick merge; push; delete mini.',
  },
}
