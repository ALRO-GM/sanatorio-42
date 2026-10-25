/** Banco de Not-games en inglés: git (`../git.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GIT_EN: Readonly<Record<string, ConceptText>> = {
  'git-commit': {
    forms: [
      {
        ask: ['What is a commit?', 'A commit stores…'],
        right: [
          'A snapshot of the staged files, with a message and its previous commit',
          'A saved version of the project that points to the previous one',
        ],
      },
      {
        ask: ['What goes into a commit?', 'When you run git commit, git saves…'],
        right: ['What is in the index (what was staged with git add)'],
        wrong: [
          'Everything in the folder, always',
          'Only the new files',
          'What is not in the index',
        ],
      },
    ],
    wrong: [
      'A copy of the repository on the server',
      'A new branch',
      'A git configuration file',
      'The list of files git ignores',
    ],
    why: 'Each commit is a snapshot of what was staged with add, with its message and a link to its parent: that is how history is built.',
  },
  'git-status': {
    forms: [
      {
        ask: ['What does `git status` tell you?', '`git status` is for seeing…'],
        right: [
          'Which branch you are on, what is staged and what has changed without being staged',
          'The state of your files and of your branch',
        ],
      },
    ],
    wrong: [
      'The commit history',
      'Who changed each line',
      'Whether the server is up',
      'The line-by-line differences',
    ],
    why: 'status is the snapshot of now: branch, staged and not staged. History is git log.',
  },
  'git-branch-what': {
    forms: [
      {
        ask: ['What is a branch in git?', 'For git, a branch is…'],
        right: ['A name that points to a commit and moves forward with each new commit'],
      },
      {
        ask: ['What does git copy when you create a branch?', 'Creating a branch copies…'],
        right: ['Nothing: it only creates a pointer to the current commit'],
        wrong: ['All the files of the project', 'The whole history', 'The index'],
      },
    ],
    wrong: [
      'A copy of the project folder',
      'A separate repository',
      'A special commit with no parent',
      'A remote server',
    ],
    why: 'A branch is just a label that points to a commit: creating one is free.',
  },
  'git-head': {
    forms: [
      {
        ask: ['What is HEAD?', 'In git, HEAD marks…'],
        right: [
          'Where you are: usually the current branch',
          'The branch (or the commit) you are working on',
        ],
      },
      {
        ask: ['What does it mean to have a detached HEAD?', 'A detached HEAD means that…'],
        right: ['HEAD points to a commit directly, not to a branch'],
        wrong: [
          'The main branch has been deleted',
          'There is no connection to the remote',
          'The repository is empty',
        ],
      },
    ],
    wrong: [
      'The first commit of the repository',
      'The main branch of the remote',
      'The last commit of any branch',
      'The configuration file',
    ],
    why: 'HEAD is where you are; when you commit, the branch it points to moves forward. If it points to a commit, it is detached.',
  },
  'git-switch-c': {
    forms: [
      {
        ask: [
          'Which command creates a branch and switches to it at the same time?',
          'To create the branch login and move to it, you type…',
        ],
        right: ['git switch -c login', 'git checkout -b login'],
        wrong: ['git branch login', 'git switch login', 'git merge login', 'git commit -b login'],
      },
    ],
    wrong: ['git push login', 'git add login', 'git init login'],
    why: 'git branch only creates it; switch -c (or checkout -b) creates it and switches you to it.',
  },
  'git-fast-forward': {
    forms: [
      {
        ask: ['What is a fast-forward merge?', 'A fast-forward happens when…'],
        right: [
          'The target branch has not moved: it just moves forward, with no new commit',
          'Merging only moves the branch pointer, because there is nothing to combine',
        ],
      },
    ],
    wrong: [
      'A merge that creates a commit with two parents',
      'A merge that ignores conflicts',
      'A forced push',
      'A merge that deletes the other branch',
    ],
    why: 'If main has not moved since you branched off, merging just moves main up to the tip of your branch.',
  },
  'git-merge-commit': {
    forms: [
      {
        ask: [
          'What is special about a merge commit?',
          'If both branches have moved on, git merge creates…',
        ],
        right: ['A commit with two parents', 'A commit that joins the two histories (two parents)'],
      },
    ],
    wrong: [
      'A commit with no parent',
      'A copy of each commit of the other branch',
      'A new branch',
      'Nothing: branches cannot be merged if both have moved on',
    ],
    why: 'The three-way merge combines the changes since the common ancestor in a commit with two parents.',
  },
  'git-branch-delete': {
    forms: [
      {
        ask: [
          'What happens when you delete an already merged branch with git branch -d?',
          'After merging feature into main, git branch -d feature…',
        ],
        right: ['The name is deleted; the commits stay in main'],
      },
      {
        ask: [
          'What does git branch -d do with a branch that has unmerged commits?',
          'If a branch has unmerged work, git branch -d…',
        ],
        right: ['Refuses to delete it (with -D it does delete it)'],
        wrong: ['Deletes it and its commits go to main', 'Merges it before deleting it'],
      },
    ],
    wrong: [
      'All its commits are deleted',
      'It is deleted on the remote too',
      'The merge is undone',
      'Its files are deleted from the folder',
    ],
    why: 'A branch is a name: deleting it does not delete commits that are on another branch. -d protects what is not merged.',
  },
  'git-fetch': {
    forms: [
      {
        ask: ['What does `git fetch` do?', 'What is git fetch for?'],
        right: [
          'It downloads what is new on the remote and moves origin/main, without touching your branches',
          'It brings the commits from the remote but does not merge them with yours',
        ],
      },
      {
        ask: ['What is the difference between fetch and pull?', 'git pull is…'],
        right: ['fetch and then merge (or rebase with --rebase)'],
        wrong: ['The same as fetch', 'The opposite of push: it uploads changes', 'fetch plus push'],
      },
    ],
    wrong: [
      'It uploads your commits to the remote',
      'It merges origin/main into your branch',
      'It deletes the branches that are not on the remote',
      'It clones the repository again',
    ],
    why: 'fetch only downloads and updates the tracking branches; pull also merges into your branch.',
  },
  'git-tracking': {
    forms: [
      {
        ask: ['What is origin/main?', 'The origin/main branch of your repository is…'],
        right: [
          'Where main was on origin the last time you talked to it',
          'A tracking branch: your copy of how main is on the remote',
        ],
      },
    ],
    wrong: [
      'The main branch of the remote in real time',
      'A branch you can commit on like on main',
      'The first commit of main',
      'An automatic backup of your main',
    ],
    why: 'origin/main only changes with fetch, pull or push: it is the last thing you know about the remote.',
  },
  'git-push-rejected': {
    forms: [
      {
        ask: [
          'git push says «rejected» because the remote has commits you do not have. What do you do?',
          'Your push is rejected (non-fast-forward). The normal thing is…',
        ],
        right: ['git pull (or pull --rebase) and then git push again'],
        wrong: [
          'git push --force without looking',
          'Delete the repository and clone it again',
          'git commit --amend and git push again',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: 'The remote does not let you overwrite other people’s work: first you bring theirs, merge and then push.',
  },
  'git-clone': {
    forms: [
      {
        ask: ['What does `git clone url` do?', 'What is git clone for?'],
        right: [
          'It copies the whole repository, with its history, and leaves origin pointing to the url',
        ],
      },
    ],
    wrong: [
      'It downloads only the latest version of the files, without history',
      'It creates a new branch on the remote',
      'It uploads your folder to the server',
      'It merges two repositories',
    ],
    why: 'clone brings the whole history and leaves the remote origin set up.',
  },
  'git-rebase': {
    forms: [
      {
        ask: [
          'What does `git rebase main` do while on feature?',
          'git rebase main from your branch…',
        ],
        right: [
          'Copies the commits of feature on top of main: the history ends up in a line',
          'Replays your commits on the tip of main, with new ids',
        ],
      },
      {
        ask: ['When should you not rebase?', 'Rebasing is dangerous on…'],
        right: ['Branches that more people already share (their commits change id)'],
        wrong: [
          'Branches only you have locally',
          'Branches with a single commit',
          'Branches you have not pushed yet',
        ],
      },
    ],
    wrong: [
      'It merges main into feature with a merge commit',
      'It deletes the commits of main',
      'It pushes feature to the remote',
      'It renames the branch',
    ],
    why: 'rebase copies your commits on top of another branch: linear history, but new commits. On shared branches it breaks the history of the others.',
  },
  'git-cherry-pick': {
    forms: [
      {
        ask: ['What does `git cherry-pick a1b2c3` do?', 'What is cherry-pick for?'],
        right: [
          'It copies the changes of that commit on top of where you are',
          'It brings one specific commit from another branch',
        ],
      },
    ],
    wrong: [
      'It brings the whole branch of that commit',
      'It deletes that commit from history',
      'It moves you to that commit with a detached HEAD',
      'It undoes that commit',
    ],
    why: 'cherry-pick copies a single commit; the branch it comes from does not change.',
  },
  'git-amend': {
    forms: [
      {
        ask: ['What does `git commit --amend` do?', 'What is --amend for in git commit?'],
        right: [
          'It redoes the last commit (message or files) as a new commit',
          'It replaces the last commit with a corrected one',
        ],
      },
    ],
    wrong: [
      'It adds an empty commit',
      'It undoes the last commit and deletes its changes',
      'It changes the message of any old commit',
      'It pushes the last commit to the remote',
    ],
    why: 'amend replaces the last commit; if you already pushed it, the others have the old one.',
  },
  'git-relative': {
    forms: [
      {
        ask: ['What is `HEAD~2`?', 'HEAD~2 refers to…'],
        right: [
          'The commit two steps before HEAD',
          'The grandparent of HEAD (following the first parent)',
        ],
      },
      {
        ask: ['What is `main^`?', 'main^ refers to…'],
        right: ['The parent of the commit main points to'],
        wrong: [
          'The main branch of the remote',
          'The first commit of main',
          'The child of the main commit',
        ],
      },
    ],
    wrong: [
      'The second branch of the repository',
      'The last two commits together',
      'The commit two steps after HEAD',
      'HEAD on the remote',
    ],
    why: '~n goes back n commits along the first parent; ^ is the parent. They save you from copying ids.',
  },
  'git-reset': {
    forms: [
      {
        ask: ['What does `git reset --hard HEAD~1` do?', 'reset --hard HEAD~1…'],
        right: ['Takes the branch one commit back and deletes the changes in the folder'],
        wrong: ['Takes the branch back and leaves the changes staged'],
      },
      {
        ask: ['What does `git reset --soft HEAD~1` do?', 'reset --soft HEAD~1…'],
        right: ['Takes the branch one commit back and leaves its changes staged'],
        wrong: ['Takes the branch back and deletes the changes in the folder'],
      },
    ],
    wrong: [
      'Creates a commit that undoes the previous one',
      'Deletes the branch',
      'Downloads the version on the remote',
      'Undoes the last push',
    ],
    why: 'reset moves the branch: --soft leaves what was undone staged, the default (--mixed) leaves it unstaged and --hard deletes it.',
  },
  'git-revert': {
    forms: [
      {
        ask: [
          'A bad commit is already on origin and more people have it. How do you undo it?',
          'To undo a commit that is already public, the safe thing is…',
        ],
        right: ['git revert: a new commit that does the opposite'],
        wrong: [
          'git reset --hard and git push --force',
          'git commit --amend',
          'Delete the branch and create it again',
        ],
      },
      {
        ask: ['What does `git revert` do?', 'git revert of a commit…'],
        right: ['Creates a new commit that undoes its changes, without rewriting history'],
      },
    ],
    wrong: [
      'Deletes the commit from history',
      'Goes back to the version on the remote',
      'Changes the message of the commit',
      'Moves the branch to that commit',
    ],
    why: 'revert adds, it does not rewrite: nobody has to fix their history.',
  },
  'git-stash': {
    forms: [
      {
        ask: ['What is `git stash` for?', 'What does git stash do?'],
        right: [
          'It parks the uncommitted changes and leaves the folder clean (stash pop brings them back)',
          'It keeps your half-done changes so you can switch branch for a moment',
        ],
      },
    ],
    wrong: [
      'It makes a temporary commit on main',
      'It deletes the unsaved changes',
      'It uploads the changes to a hidden branch on the remote',
      'It ignores the new files',
    ],
    why: 'stash keeps what is not committed on a stack; with pop it comes back wherever you are.',
  },
  'git-github-flow': {
    forms: [
      {
        ask: ['What does GitHub flow consist of?', 'With GitHub flow…'],
        right: [
          'main always works; each change goes on a short branch that is reviewed in a pull request and merged',
        ],
      },
    ],
    wrong: [
      'Everyone commits directly on main',
      'There are two long branches, main and develop, and release branches',
      'Each person has their own repository with no remote',
      'Things are only merged into main once a year',
    ],
    why: 'Short branches off main, pull request and back to main: the most common flow in small teams.',
  },
  'git-gitflow': {
    forms: [
      {
        ask: ['In Gitflow, where does a hotfix branch come from?', 'A Gitflow hotfix comes from…'],
        right: ['From main, and it is merged into main and into develop'],
        wrong: ['From develop, and it is merged only into develop', 'From the last release'],
      },
      {
        ask: ['In Gitflow, what is develop for?', 'The develop branch of Gitflow…'],
        right: ['Collects the finished work until the next version'],
        wrong: [
          'Is what is released',
          'Is a test branch that gets deleted',
          'Only keeps the hotfixes',
        ],
      },
    ],
    wrong: [
      'From any feature branch',
      'It does not exist: Gitflow has no hotfixes',
      'From origin/develop, never merged',
    ],
    why: 'main is what is released and develop what comes next: the hotfix fixes what is released and goes back to both.',
  },
  'git-tag': {
    forms: [
      {
        ask: [
          'What is the difference between a tag and a branch?',
          'A tag (git tag v1.0), unlike a branch…',
        ],
        right: ['Does not move: it always marks the same commit'],
      },
      {
        ask: ['How do you push the tags to the remote?', 'Tags are pushed with…'],
        right: ['git push --tags', 'git push origin v1.0'],
        wrong: ['git push, which always pushes the tags', 'git tag --push', 'git commit --tags'],
      },
    ],
    wrong: [
      'Moves forward with each commit',
      'Only exists on the remote',
      'Keeps the files apart',
      'Is a protected branch',
    ],
    why: 'A tag is a fixed name for a commit: a version.',
  },
  'git-trunk': {
    forms: [
      {
        ask: ['What is trunk-based development?', 'In trunk-based development…'],
        right: [
          'Everyone merges into main several times a day, with branches that last hours and automatic tests',
        ],
      },
    ],
    wrong: [
      'Each version lives on its own branch forever',
      'Nobody uses branches and work is sent by email',
      'Only one person can commit on main',
      'Branches last months and are merged at the end',
    ],
    why: 'Very short branches and main always merged: it needs a CI that protects main.',
  },
}
