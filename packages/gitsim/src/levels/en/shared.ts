/** Curso de git en inglés: mundos 2 a 5 (`../shared.ts`), por id del nivel. */

import type { LevelText } from './types.js'

export const SHARED_EN: Readonly<Record<string, LevelText>> = {
  'w2-clone': {
    title: 'Clone and push',
    goal: 'Clone origin, make a commit on main and push it.',
    theory: {
      what: 'origin is another copy of the repository, on GitHub or 42’s GitLab. clone copies it whole; push uploads your commits.',
      how: [
        'git clone',
        'git commit -m "mi parte"',
        'git push                    # “Subido main a origin”',
      ],
      when: 'clone, once at the start; push, when your work is ready.',
      whenNot: 'Do not push code that does not compile to a shared branch.',
      looks: 'origin/main appears: where main was on origin the last time you talked to it.',
      problems:
        'Forgetting to push: git log --oneline --all still shows “(origin/main) init” and your commit only lives here.',
    },
  },
  'w2-fetch': {
    title: 'Get changes without merging: fetch',
    goal: 'Your teammate has pushed two commits: get them with fetch and move main up to origin/main.',
    theory: {
      what: 'git fetch downloads what is new on origin and moves origin/main, without touching your branches.',
      how: ['git fetch                   # “Bajados 2 commits de origin”', 'git merge origin/main'],
      when: 'To see what others pushed before mixing it with your work.',
      whenNot: 'clone is done once; fetch, whenever you want what is new.',
      looks: 'origin/main moves forward; main stays put until you merge.',
      problems:
        'Thinking fetch already merges: git log --oneline still has “init” on top. You still need git merge origin/main.',
    },
  },
  'w2-pull': {
    title: 'pull: fetch and merge',
    goal: 'You and your teammate made a commit at the same time: bring in theirs with pull and push the result.',
    theory: {
      what: 'git pull is fetch plus merge in one go. If you have both moved on, it creates a merge commit.',
      how: [
        'git push                    # rejected: origin is ahead',
        'git pull                    # fetches theirs and merges',
        'git push',
      ],
      when: 'Before you start working and before you push.',
      whenNot: 'If you want to look before merging, use git fetch: pull merges without asking.',
      looks: 'A merge commit joining your main with origin/main.',
      problems:
        'Pushing without pulling: git push answers “rechazado: origin/main tiene commits que tú no tienes. Haz git pull primero” (rejected).',
    },
  },
  'w2-branch': {
    title: 'Push your branch',
    goal: 'main is protected on origin: create the branch login, make two commits and push it to origin.',
    theory: {
      what: 'git push origin branch uploads any branch. In teams, main is usually protected: changes go in through a pull request.',
      how: [
        'git switch -c login',
        'git commit -m "formulario"',
        'git push origin login       # “Subido login a origin”',
      ],
      when: 'In a team: your branch on origin is your backup and what the others review.',
      whenNot: 'Without protections, git push uploads main directly, with no review.',
      looks: 'origin/login appears next to your login.',
      problems:
        'Pushing commits on main: “main está protegida en origin: sube tu rama y únela con un pull request” (protected).',
    },
  },
  'w2-world': {
    title: 'Remotes: rejected push',
    goal: 'Your push is rejected: put your commit on top of theirs with pull --rebase (no merge commit) and push it.',
    theory: {
      what: 'git pull --rebase fetches origin and puts your commits on top: history stays in a line.',
      how: [
        'git push                    # rejected',
        'git pull --rebase           # “Rebase hecho”',
        'git push',
      ],
      when: 'With commits you have not pushed yet.',
      whenNot: 'Not with commits already pushed: rebase changes their ids.',
      looks: 'Your commit leaves and a copy (with a quote mark) appears on top of theirs.',
      problems:
        'Plain git pull answers “Merge hecho” and leaves a merge commit the challenge does not want.',
    },
  },
  'w3-relative': {
    title: 'Moving around: ~ and ^',
    goal: 'Go two commits back from main without using their id (HEAD ends up detached).',
    theory: {
      what: 'HEAD~2 is “two commits before HEAD”; main^, main’s parent. You reach a commit without copying its id.',
      how: [
        'git checkout HEAD~2         # “HEAD separado en c1”',
        'git checkout main^',
        'git switch main             # back to the branch',
      ],
      when: 'To look at the code from a few commits ago.',
      whenNot: 'HEAD~1 and main~1 only match when you are on main.',
      looks: 'HEAD points at a commit, not a branch (detached HEAD).',
      problems:
        'Commits with a detached HEAD: the course warns “lo que hagas aquí no está en ninguna rama” (on no branch). Create a branch first.',
    },
  },
  'w3-amend': {
    title: 'Redo the last one: --amend',
    goal: 'The last commit has a wrong message: redo it with the message «Arregla el parser».',
    theory: {
      what: 'git commit --amend redoes the last commit: it makes a new one and leaves the old one with no branch.',
      how: [
        'git commit --amend -m "Arregla el parser"',
        'git log --oneline           # the old one is gone',
      ],
      when: 'Right after a commit with a silly mistake, before pushing it.',
      whenNot: 'If you already pushed it, no: the others have the old one.',
      looks: 'The last circle is replaced by a copy (with a quote mark).',
      problems:
        'Making another commit: git log --oneline shows both, “aregla el parsr” and “Arregla el parser”.',
    },
  },
  'w3-cherry': {
    title: 'Pick one: cherry-pick',
    goal: 'From the branch exp you only want the commit that creates b.txt: copy it onto main.',
    theory: {
      what: 'git cherry-pick copies the changes of one specific commit on top of where you are.',
      how: [
        'git log --oneline --all     # c3 (exp) c, c2 b, c1 a',
        'git cherry-pick exp~1       # b: the tip’s parent',
        'ls',
      ],
      when: 'To bring a single fix from another branch, without the rest.',
      whenNot: 'To bring a whole branch: merge or rebase.',
      looks: 'A copy (with a quote mark) appears on top of main; the original stays on its branch.',
      problems: 'Picking the tip: git cherry-pick exp copies “c” and ls shows c.txt, not b.txt.',
    },
  },
  'w3-rebase': {
    title: 'Move a branch: rebase',
    goal: 'Put the commits of feature on top of main, with no merge commit.',
    theory: {
      what: 'git rebase copies your branch’s commits on top of another: history stays in a line.',
      how: ['git switch feature', 'git rebase main             # “Rebase hecho”'],
      when: 'To bring your branch up to date before merging it, if only you use it.',
      whenNot:
        'Not on shared branches: their commits change id and everyone else’s history breaks.',
      looks: 'The feature circles go away and copies (with a quote mark) appear on top of main.',
      problems:
        'From main, git rebase main says “Avance rápido hasta c3” and feature does not move. Switch to feature.',
    },
  },
  'w3-world': {
    title: 'Rewriting: a linear history',
    goal: 'Put bugfix on top of main with rebase and then move main up to bugfix (fast-forward). End on main.',
    theory: {
      what: 'Review: rebase and then a fast-forward merge leave history in a line, with no merge commits.',
      how: [
        'git switch bugfix',
        'git rebase main',
        'git switch main',
        'git merge bugfix            # fast-forward',
      ],
      when: 'In teams that prefer a linear history, like many open-source projects.',
      whenNot: 'If the team wants to see where each branch was merged, a normal merge is better.',
      looks: 'A single line of circles, with the bugfix copy at the end.',
      problems:
        'Merging without rebasing first: git merge bugfix answers “Merge hecho: c4” and leaves a merge commit.',
    },
  },
  'w4-reset': {
    title: 'Go back: reset',
    goal: 'The last two commits are not needed (they have not been pushed): move main two commits back.',
    theory: {
      what: 'git reset moves the branch to another commit. --soft keeps changes staged; no option, unstaged; --hard deletes them.',
      how: [
        'git reset HEAD~2            # changes stay',
        'git reset --hard HEAD~2     # and deletes them',
      ],
      when: 'To undo commits only you have.',
      whenNot: 'Not with commits already pushed: the push gets rejected.',
      looks: 'main moves back; the circles ahead are left with no branch.',
      problems:
        '--hard says “cambios descartados” (discarded): they do not come back. If unsure, no option.',
    },
  },
  'w4-revert': {
    title: 'Undo in public: revert',
    goal: 'Someone pushed secreto.txt to origin: undo it with a new commit and push it (without forcing).',
    theory: {
      what: 'git revert makes a commit that does the opposite of another. It does not rewrite history.',
      how: ['git revert HEAD', 'git push                    # no forcing'],
      when: 'To undo something already on origin.',
      whenNot: 'If you pushed a key, revert is not enough: it stays in history. Change it.',
      looks: 'A new circle at the end; the bad one stays.',
      problems:
        'reset on what is pushed: git push answers “rechazado: origin/main tiene commits que tú no tienes” (rejected).',
    },
  },
  'w4-stash': {
    title: 'Park changes: stash',
    goal: 'You are halfway through something on main and someone asks you for a fix: park your changes, make a commit on fix, come back and commit what you had.',
    theory: {
      what: 'git stash parks your uncommitted changes and leaves the directory clean; git stash pop brings them back.',
      how: ['git stash', 'git switch fix', 'git switch main', 'git stash pop'],
      when: 'To switch branch for a moment without a half-done commit.',
      whenNot: 'It is not storage: what lasts goes in a commit.',
      looks: 'Nothing in the tree: the stash is not a branch.',
      problems:
        'Without parking, git switch answers “tienes cambios sin guardar: haz commit o stash antes de cambiar de rama”.',
    },
  },
  'w4-conflict': {
    title: 'Conflicts',
    goal: 'Merge rama into main; the conflict in f.c is resolved by leaving the line «los dos».',
    theory: {
      what: 'If two branches change the same line, git marks the file with <<<<<<< and >>>>>>> and waits.',
      how: [
        'git merge rama              # “CONFLICTO en f.c”',
        'echo "los dos" > f.c',
        'git add f.c',
        'git commit -m "Une rama"',
      ],
      when: 'It comes with a merge; you decide what stays.',
      whenNot: 'If it is not a good moment, git merge --abort puts it back.',
      looks: 'A normal merge commit once you finish.',
      problems: 'Commit without add: “quedan conflictos sin resolver: f.c”. Run git add f.c first.',
    },
  },
  'w4-world': {
    title: 'Undo: squash commits',
    goal: 'Squash the last three commits into a single one, without losing any file.',
    theory: {
      what: 'Review: git reset --soft moves the branch back with everything staged; one commit saves it together.',
      how: ['git reset --soft HEAD~3', 'git commit -m "Todo junto"'],
      when: 'Before pushing a branch with commits like “test”, “another test”, “now it works”.',
      whenNot: 'If they are already on origin, do not squash them: the push would be rejected.',
      looks: 'Three circles become one.',
      problems: 'With --hard you get “cambios descartados” and ls says “(vacío)” (empty).',
    },
  },
  'w5-github-flow': {
    title: 'GitHub flow',
    goal: 'main is protected: get the latest changes, create the branch api from main, make two commits and push it for the pull request.',
    theory: {
      what: 'GitHub flow: main always works; each change goes in a short branch reviewed in a pull request.',
      how: ['git pull', 'git switch -c api', 'git commit -m "rutas"', 'git push origin api'],
      when: 'Small teams that deploy often.',
      whenNot: 'With several live versions (1.x and 2.x), Gitflow fits better.',
      looks: 'Short branches leaving main and coming back.',
      problems:
        'Pushing commits on main: “main está protegida en origin: sube tu rama y únela con un pull request”.',
    },
  },
  'w5-tag': {
    title: 'Versions: tag',
    goal: 'Mark main as v1.0 and the commit before it as v0.9.',
    theory: {
      what: 'A tag is a fixed name for a commit, like v1.0. Unlike a branch, it does not move.',
      how: [
        'git tag v1.0',
        'git tag v0.9 HEAD~1         # on the one before',
        'git log --oneline           # “tag: v1.0”',
      ],
      when: 'When you deliver or publish a version.',
      whenNot: 'For something that moves with each commit, a branch.',
      looks: 'A label stuck to a circle for good.',
      problems:
        'Reusing a name: “ya existe el tag v1.0”. A published tag does not move: release another version.',
    },
  },
  'w5-release': {
    title: 'Gitflow: release',
    goal: 'Create release/1.0 from develop, make a commit, merge it with --no-ff into main and into develop, and mark main as v1.0.',
    theory: {
      what: 'Gitflow: develop collects the work; to publish, a release branch is merged into main (with a tag) and into develop.',
      how: [
        'git switch -c release/1.0',
        'git switch main',
        'git merge --no-ff release/1.0',
        'git tag v1.0',
      ],
      when: 'Software with numbered versions and delivery dates.',
      whenNot: 'For websites deployed every day, GitHub flow is better.',
      looks: 'Two long branches and a release between them.',
      problems:
        'Without --no-ff you get “Avance rápido (fast-forward) hasta c4” and no merge commit.',
    },
  },
  'w5-hotfix': {
    title: 'Gitflow: hotfix',
    goal: 'There is a bug in v1.0: create hotfix from main, fix it, merge it into main with --no-ff, tag it v1.0.1 and merge it into develop too.',
    theory: {
      what: 'A hotfix branches off main, what is published, not off half-done develop. It is merged into both.',
      how: [
        'git switch -c hotfix        # from main',
        'git switch main',
        'git merge --no-ff hotfix',
        'git switch develop',
        'git merge hotfix',
      ],
      when: 'For a serious published bug that cannot wait.',
      whenNot: 'If the bug is not published, fix it on develop.',
      looks: 'It leaves main and comes back to main and develop.',
      problems:
        'Forgetting develop: there git log --oneline has no “arreglo” and the bug comes back.',
    },
  },
  'w5-world': {
    title: 'Workflows: trunk-based',
    goal: 'Work on the trunk: create a short branch, mini, with one commit; bring it up to date with what is on origin, merge it into main in a line, push it and delete mini.',
    theory: {
      what: 'Trunk-based: the whole team merges into main several times a day, with hour-long branches.',
      how: [
        'git pull',
        'git switch mini',
        'git rebase main',
        'git switch main',
        'git merge mini              # fast-forward',
      ],
      when: 'Teams with automated tests that deploy all the time.',
      whenNot: 'Not without automated tests: each merge can break main.',
      looks: 'A single line on main, no merges.',
      problems:
        'Merging without pulling first: git push answers “rechazado: origin/main tiene commits que tú no tienes”.',
    },
  },
}
