/** Curso de git en inglés: mundos 2 a 5 (`../shared.ts`), por id del nivel. */

import type { LevelText } from './types.js'

export const SHARED_EN: Readonly<Record<string, LevelText>> = {
  'w2-clone': {
    title: 'Clone and push',
    goal: 'Clone origin, make a commit on main and push it.',
    theory: {
      what: "A remote (origin) is another copy of the repository, usually on GitHub or on 42's GitLab. clone copies the whole thing; push uploads your commits.",
      how: ['git clone', 'git commit -m "my part"', 'git push'],
      when: 'clone once, when you start; push when your work is ready for others to see.',
      whenNot: 'Pushing something that does not compile to a branch that more people use.',
      looks: 'origin/main appears: where main was on origin the last time you talked to it.',
      problems:
        'Forgetting to push: the work only exists on your computer (and at 42 the computers get wiped).',
    },
  },
  'w2-fetch': {
    title: 'Get changes without merging: fetch',
    goal: 'Your teammate has pushed two commits: get them with fetch and move main up to origin/main.',
    theory: {
      what: 'fetch downloads what is new from origin and moves origin/main, but it does not touch your branches. Then you decide how to combine it.',
      how: ['git fetch', 'git log --oneline --all', 'git merge origin/main'],
      when: 'To see what the others have done before merging it with your work.',
      looks: 'origin/main moves forward; main stays where it was until you merge.',
    },
  },
  'w2-pull': {
    title: 'pull: fetch and merge',
    goal: 'You and your teammate made a commit at the same time: bring in theirs with pull and push the result.',
    theory: {
      what: 'pull is fetch plus merge in one go. If you both moved forward, it creates a merge commit.',
      how: ['git pull', 'git push'],
      when: 'Before you start working and before you push.',
      whenNot:
        'If you do not want a merge commit on every pull, use git pull --rebase (you will see it soon).',
      looks: 'A merge commit that joins your main with origin/main.',
      problems:
        'Rejected push («origin has commits that you do not have»): it is the sign that it is time to pull.',
    },
  },
  'w2-branch': {
    title: 'Push your branch',
    goal: 'main is protected on origin: create the branch login, make two commits and push it to origin.',
    theory: {
      what: 'You can push any branch: git push origin branch. In teams main is usually protected and changes get in through a pull request.',
      how: ['git switch -c login', 'git commit -m "form"', 'git push origin login'],
      when: 'Whenever you work in a team: your branch on origin is the backup and what the others review.',
      looks: 'origin/login appears next to your login.',
      problems: 'Pushing straight to main when the team expects reviews: the remote rejects it.',
    },
  },
  'w2-world': {
    title: 'Remotes: rejected push',
    goal: 'Your push is rejected: put your commit on top of theirs with pull --rebase (no merge commit) and push it.',
    theory: {
      what: 'pull --rebase gets what is on origin and puts your commits back on top, as if you had made them later: the history stays in a line.',
      how: ['git push   # rejected', 'git pull --rebase', 'git push'],
      when: 'When nobody has seen your commits yet: the history ends up cleaner than with a merge.',
      whenNot: 'With commits that are already on origin: the rebase changes their ids.',
      looks:
        'Your commit disappears from where it was and a copy (with a prime mark) appears on top of theirs.',
    },
  },
  'w3-relative': {
    title: 'Moving around: ~ and ^',
    goal: 'Go two commits back from main without using their id (HEAD ends up detached).',
    theory: {
      what: 'HEAD~2 means «two commits before HEAD»; main^ is the parent of main. This way you do not need to copy ids.',
      how: ['git checkout HEAD~2', 'git checkout main^', 'git switch main   # go back'],
      when: 'To look at how the code was a few commits ago, or to give a starting point to reset or rebase.',
      looks: 'HEAD comes off the branch and points directly at a commit (detached HEAD).',
      problems:
        'Making commits with a detached HEAD: they are on no branch and get lost when you switch. Create a branch first.',
    },
  },
  'w3-amend': {
    title: 'Redo the last one: --amend',
    goal: 'The last commit has a wrong message: redo it with the message «Arregla el parser».',
    theory: {
      what: 'commit --amend changes the last commit (message or files). It actually makes a new one and leaves the old one without a branch.',
      how: ['git commit --amend -m "Fix the parser"', 'git add olvidado.c', 'git commit --amend'],
      when: 'Right after a commit with a silly mistake, before you push it.',
      whenNot:
        'If you already pushed it: the others have the old one and you will have to force the push.',
      looks: 'The last circle is replaced by a copy (with a prime mark).',
    },
  },
  'w3-cherry': {
    title: 'Pick one: cherry-pick',
    goal: 'From the branch exp you only want the commit that creates b.txt: copy it onto main.',
    theory: {
      what: 'cherry-pick copies one specific commit (its changes) on top of where you are.',
      how: ['git log --oneline exp', 'git cherry-pick exp~1'],
      when: 'To bring over a single fix from another branch without bringing everything else.',
      whenNot: 'To move whole branches: that is rebase or merge.',
      looks:
        'A copy (with a prime mark) of the commit appears on top of main; the original stays on its branch.',
      problems:
        'The same change ends up twice in the history, with different ids: if you merge the branch later, it can cause conflicts.',
    },
  },
  'w3-rebase': {
    title: 'Move a branch: rebase',
    goal: 'Put the commits of feature on top of main, with no merge commit.',
    theory: {
      what: 'rebase takes the commits of your branch that are not in the other one and copies them on top of it. The history stays in a line.',
      how: ['git switch feature', 'git rebase main'],
      when: 'To bring your branch up to date before merging it, if only you use it.',
      whenNot:
        "On branches that more people share: their commits stop existing and the others' history breaks.",
      looks: 'The circles of feature go away and copies (with a prime mark) appear on top of main.',
      problems: 'Conflicts on every copied commit, one by one.',
    },
  },
  'w3-world': {
    title: 'Rewriting: a linear history',
    goal: 'Put bugfix on top of main with rebase and then move main up to bugfix (fast-forward). End on main.',
    theory: {
      what: 'World review: rebase plus a fast-forward merge keeps the history in a line, with no merge commits.',
      how: ['git switch bugfix', 'git rebase main', 'git switch main', 'git merge bugfix'],
      when: 'Teams that prefer a linear history (many open source projects).',
      looks: 'A single line of circles, with the copies of bugfix at the end.',
    },
  },
  'w4-reset': {
    title: 'Go back: reset',
    goal: 'The last two commits are not needed (they have not been pushed): move main two commits back.',
    theory: {
      what: 'reset moves the branch to another commit. --soft leaves the changes staged, the normal one (--mixed) leaves them unstaged and --hard deletes them.',
      how: ['git reset HEAD~2', 'git reset --soft HEAD~1', 'git reset --hard HEAD~2'],
      when: 'To undo commits that only you have.',
      whenNot:
        'On commits that are already on origin: use revert. And --hard without thinking: what it deletes does not come back.',
      looks: 'The main label moves back; the circles ahead of it are left without a branch.',
    },
  },
  'w4-revert': {
    title: 'Undo in public: revert',
    goal: 'Someone pushed secreto.txt to origin: undo it with a new commit and push it (without forcing).',
    theory: {
      what: 'revert creates a new commit that does the opposite of another one. The history is not rewritten: it is only added to.',
      how: ['git revert HEAD', 'git push'],
      when: 'To undo something that is already on origin and that other people have.',
      looks: 'A new circle at the end; the bad commit stays in the history.',
      problems:
        'If what you pushed was a key, revert is not enough: it is still in the history. You have to change the key.',
    },
  },
  'w4-stash': {
    title: 'Park changes: stash',
    goal: 'You are halfway through something on main and someone asks you for a fix: park your changes, make a commit on fix, come back and commit what you had.',
    theory: {
      what: 'stash saves your uncommitted changes on a stack and leaves the directory clean. stash pop brings them back.',
      how: ['git stash', 'git switch fix', 'git switch main', 'git stash pop'],
      when: 'To switch branches for a moment without making a half-done commit.',
      whenNot: 'As long-term storage: after a week nobody remembers what was in each stash.',
      looks: 'Nothing in the tree: the stash is not a branch.',
    },
  },
  'w4-conflict': {
    title: 'Conflicts',
    goal: 'Merge rama into main; the conflict in f.c is resolved by leaving the line «los dos».',
    theory: {
      what: 'If both branches change the same line, git does not know which one is right: it marks the file with <<<<<<< ======= >>>>>>> and waits for you to fix it.',
      how: [
        'git merge rama',
        'cat f.c',
        'echo "los dos" > f.c',
        'git add f.c',
        'git commit -m "Merge rama"',
      ],
      when: 'You do not choose it: it just arrives. What you do choose is to resolve it calmly (or git merge --abort).',
      looks: 'A normal merge commit, once you finish.',
      problems:
        'Leaving the <<<<<<< marks in the file and committing: it will not compile (and you will notice).',
    },
  },
  'w4-world': {
    title: 'Undo: squash commits',
    goal: 'Squash the last three commits into a single one, without losing any file.',
    theory: {
      what: 'World review: reset --soft moves the branch back but leaves everything staged; one commit saves it all at once.',
      how: ['git reset --soft HEAD~3', 'git commit -m "All together"'],
      when: 'Before pushing a branch with commits like «test», «another test», «now it works».',
      looks: 'Three circles are replaced by one.',
    },
  },
  'w5-github-flow': {
    title: 'GitHub flow',
    goal: 'main is protected: get the latest changes, create the branch api from main, make two commits and push it for the pull request.',
    theory: {
      what: 'GitHub flow: main always works; every change goes on a short branch that is pushed, reviewed in a pull request and merged.',
      how: ['git pull', 'git switch -c api', 'git commit -m "..."', 'git push origin api'],
      when: 'Almost always: small teams and projects that are deployed often (like those at 42).',
      whenNot: 'If you maintain several versions at once (1.x and 2.x): Gitflow fits better there.',
      looks: 'Short branches that leave main and come back to it.',
    },
  },
  'w5-tag': {
    title: 'Versions: tag',
    goal: 'Mark main as v1.0 and the previous one as v0.9.',
    theory: {
      what: 'A tag is a fixed name for a commit: a version. Unlike a branch, it does not move.',
      how: ['git tag v1.0', 'git tag v0.9 HEAD~1', 'git push --tags'],
      when: 'Every time you hand in or release a version.',
      looks: 'A label stuck to a circle forever.',
      problems: 'Moving a tag that is already published: the others have the old one.',
    },
  },
  'w5-release': {
    title: 'Gitflow: release',
    goal: 'Create release/1.0 from develop, make a commit, merge it with --no-ff into main and into develop, and mark main as v1.0.',
    theory: {
      what: 'Gitflow: develop collects the work; to publish, you create a release branch, polish it, and merge it into main (with a tag) and back into develop. With --no-ff every merge leaves its own merge commit, even if it could be a fast-forward.',
      how: [
        'git switch -c release/1.0 develop',
        'git switch main',
        'git merge --no-ff release/1.0',
        'git tag v1.0',
        'git switch develop',
        'git merge --no-ff release/1.0',
      ],
      when: 'Software with numbered versions and delivery dates.',
      whenNot: 'Websites deployed every day: too many branches for what they give you.',
      looks:
        'Two long-lived branches (main and develop) and release branches that go from one to the other.',
    },
  },
  'w5-hotfix': {
    title: 'Gitflow: hotfix',
    goal: 'There is a bug in v1.0: create hotfix from main, fix it, merge it with --no-ff into main (v1.0.1) and into develop.',
    theory: {
      what: 'A hotfix starts from main (what is published), not from develop (which has half-done things). It is merged in both places so the fix is not lost.',
      how: [
        'git switch -c hotfix main',
        'git commit -m "fix"',
        'git switch main',
        'git merge --no-ff hotfix',
        'git tag v1.0.1',
        'git switch develop',
        'git merge hotfix',
      ],
      when: 'Serious bugs in what is published that cannot wait for the next version.',
      looks: 'A short branch that leaves main and goes back to main and to develop.',
      problems: 'Forgetting to merge it into develop: the next version has the bug again.',
    },
  },
  'w5-world': {
    title: 'Workflows: trunk-based',
    goal: 'Work on the trunk: create a short branch, mini, with one commit; bring it up to date with what is on origin, merge it into main in a line, push it and delete mini.',
    theory: {
      what: 'Trunk-based: everyone merges into main several times a day, with branches that live for hours. It needs automated tests to protect it.',
      how: [
        'git switch -c mini',
        'git commit',
        'git switch main',
        'git pull',
        'git switch mini',
        'git rebase main',
        'git switch main',
        'git merge mini',
        'git push',
        'git branch -d mini',
      ],
      when: 'Teams with strong CI that deploy continuously.',
      whenNot: 'Without automated tests: every merge can break main.',
      looks: 'A single line on main, with no merges.',
    },
  },
}
