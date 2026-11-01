/** Banco de Not-games en inglés: git (`../git.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GIT_EN: Readonly<Record<string, ConceptText>> = {
  'git-commit': {
    forms: [
      {
        ask: ['What is a commit?', 'A commit stores…'],
        right: [
          'A snapshot of what you staged, plus message and parent',
          'A saved version that points to the previous one',
        ],
      },
      {
        ask: ['What goes into a commit?', 'When you run git commit, git saves…'],
        right: ['What is in the index, staged with git add'],
        wrong: [
          'Everything in the folder, always',
          'Only the new files, never the changed ones',
          'What is not in the index yet',
        ],
      },
    ],
    wrong: [
      'A copy of the repository kept on the server',
      'A new branch that comes off the main one',
      'A configuration file for git itself',
      'The list of files that git ignores',
    ],
    why: 'Each commit is a snapshot of what was staged with add, with its message and a link to its parent: that is how history is built.',
  },
  'git-status': {
    forms: [
      {
        ask: ['What does `git status` tell you?', '`git status` is for seeing…'],
        right: [
          'Your branch, what is staged and what is not',
          'The state of your files and of your branch',
        ],
      },
    ],
    wrong: [
      'The commit history of the branch',
      'Who changed each line of a file',
      'Whether the remote server is up and running',
      'The line-by-line differences of each file',
    ],
    why: 'status is the snapshot of now: branch, staged and not staged. History is git log.',
  },
  'git-branch-what': {
    forms: [
      {
        ask: ['What is a branch in git?', 'For git, a branch is…'],
        right: ['A pointer to a commit that moves with each commit'],
      },
      {
        ask: ['What does git copy when you create a branch?', 'Creating a branch copies…'],
        right: ['Nothing: just a pointer to the current commit'],
        wrong: [
          'All the files of the project',
          'The whole history of the current branch',
          'The index and the unstaged changes',
        ],
      },
    ],
    wrong: [
      'A copy of the project folder',
      'A separate repository, with its own history',
      'A special commit that has no parent',
      'A remote server where the code is pushed',
    ],
    why: 'A branch is just a label that points to a commit: creating one is free.',
  },
  'git-head': {
    forms: [
      {
        ask: ['What is HEAD?', 'In git, HEAD marks…'],
        right: [
          'Where you are: usually the current branch',
          'The branch or the commit you are working on',
        ],
      },
      {
        ask: ['What does it mean to have a detached HEAD?', 'A detached HEAD means…'],
        right: ['That HEAD points to a commit, not to a branch'],
        wrong: [
          'That the branch you were on has been deleted',
          'That there is no connection to the origin remote',
          'That the repository is empty, with no commits',
        ],
      },
    ],
    wrong: [
      'The first commit of the repository',
      'The main branch as it is on the remote',
      'The last commit of any branch',
      'The configuration file of the repository',
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
        ask: ['What does git do in a fast-forward merge?', 'In a fast-forward, git…'],
        right: [
          'Just moves the branch forward, with no new commit',
          'Just moves the pointer: there is nothing to combine',
        ],
      },
    ],
    wrong: [
      'Creates a merge commit with two parents',
      'Ignores the conflicts and keeps your side',
      'Force-pushes the branch to the remote',
      'Deletes the other branch after merging',
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
        right: ['A single commit with two parents', 'A commit that joins the two histories'],
      },
    ],
    wrong: [
      'A commit with no parent, like the first one',
      'A copy of each commit of the other branch',
      'A new branch with both sets of changes',
      'Nothing: if both moved on, they cannot be merged',
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
        right: ['Deletes the name; the commits stay in main'],
      },
      {
        ask: [
          'What does git branch -d do with a branch that has unmerged commits?',
          'If a branch has unmerged work, git branch -d…',
        ],
        right: ['Refuses to delete it; with -D it does'],
        wrong: [
          'Deletes it and its commits go to main',
          'Merges it into main before deleting it',
          'Deletes it together with all its commits',
        ],
      },
    ],
    wrong: [
      'Deletes all its commits from history',
      'Deletes it on the remote too, on origin',
      'Undoes the merge that joined it to main',
      'Deletes its files from the folder',
    ],
    why: 'A branch is a name: deleting it does not delete commits that are on another branch. -d protects what is not merged.',
  },
  'git-fetch': {
    forms: [
      {
        ask: ['What does `git fetch` do?', 'What is git fetch for?'],
        right: [
          'Downloads what is new and moves origin/main, leaving your branches',
          'Brings the commits from the remote but does not merge them',
        ],
      },
      {
        ask: ['What does git pull do, compared with fetch?', 'git pull is…'],
        right: ['A fetch followed by a merge into your branch'],
        wrong: [
          'The same as fetch, with another name',
          'A fetch followed by a push of your work',
          'A fresh clone, on top of what you have',
        ],
      },
    ],
    wrong: [
      'Uploads your new commits to the remote branch',
      'Downloads what is new and merges it into your branch',
      'Deletes the branches that are no longer on the remote',
      'Clones the repository again, from scratch',
    ],
    why: 'fetch only downloads and updates the tracking branches; pull also merges into your branch (with merge, or with rebase if you ask for it).',
  },
  'git-tracking': {
    forms: [
      {
        ask: ['What is origin/main?', 'The origin/main branch of your repository is…'],
        right: [
          'Where main was on origin the last time you looked',
          'Your copy of how main was on the remote',
        ],
      },
    ],
    wrong: [
      'The main branch of the remote, in real time',
      'A branch you commit on, just like on main',
      'The first commit that was pushed to main',
      'An automatic backup copy of your main',
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
        right: ['Bring theirs with git pull and push again'],
        wrong: [
          'git push --force, without looking',
          'Delete the repository and clone it again',
          'git commit --amend and git push again',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: 'The remote does not let you overwrite other people’s work: first you bring theirs (pull, or pull --rebase), merge and then push.',
  },
  'git-clone': {
    forms: [
      {
        ask: ['What does `git clone url` do?', 'What is git clone for?'],
        right: ['Copies the repository with its history and sets up origin'],
      },
    ],
    wrong: [
      'Downloads only the latest version of the files, without history',
      'Creates a new branch with your name on the remote',
      'Uploads your folder to the server as a repository',
      'Merges two repositories into one with their history',
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
          'Copies your commits on top of main, in a line',
          'Replays your commits on main, with new ids',
        ],
      },
      {
        ask: ['When should you not rebase?', 'Rebasing is dangerous on…'],
        right: ['Branches that more people already share'],
        wrong: [
          'Branches only you have locally',
          'Branches with a single commit',
          'Branches you have not pushed yet',
        ],
      },
    ],
    wrong: [
      'Merges main into feature with a merge commit',
      'Deletes from main the commits feature lacks',
      'Pushes feature to the remote and merges it',
      'Renames the branch to main',
    ],
    why: 'rebase copies your commits on top of another branch: linear history, but new commits. On shared branches it breaks the history of the others.',
  },
  'git-cherry-pick': {
    forms: [
      {
        ask: ['What does `git cherry-pick a1b2c3` do?', 'What is cherry-pick for?'],
        right: [
          'Copies that commit on top of where you are',
          'Brings one specific commit from another branch',
        ],
      },
    ],
    wrong: [
      'Brings the whole branch of that commit',
      'Deletes that commit from history',
      'Moves you to that commit with a detached HEAD',
      'Undoes that commit with a new one',
    ],
    why: 'cherry-pick copies a single commit; the branch it comes from does not change.',
  },
  'git-amend': {
    forms: [
      {
        ask: ['What does `git commit --amend` do?', 'What is --amend for in git commit?'],
        right: [
          'Redoes the last commit, with another message or files',
          'Replaces the last commit with a corrected one',
        ],
      },
    ],
    wrong: [
      'Adds an empty commit after the last one',
      'Undoes the last commit and deletes its changes',
      'Changes the message of any old commit',
      'Pushes the last commit to the remote, fixed',
    ],
    why: 'amend replaces the last commit with a new one; if you already pushed it, the others have the old one.',
  },
  'git-relative': {
    forms: [
      {
        ask: ['What is `HEAD~2`?', 'HEAD~2 refers to…'],
        right: ['The commit two steps before HEAD', 'The grandparent of HEAD, by the first parent'],
      },
      {
        ask: ['What is `main^`?', 'main^ refers to…'],
        right: ['The parent of the commit main points to'],
        wrong: [
          'The main branch as it is on the remote',
          'The first commit in the history of main',
          'The child of the commit main points to',
        ],
      },
    ],
    wrong: [
      'The second branch of the repository',
      'The last two commits together',
      'The commit two steps after HEAD',
      'HEAD as it is on the remote',
    ],
    why: '~n goes back n commits along the first parent; ^ is the parent. They save you from copying ids.',
  },
  'git-reset': {
    forms: [
      {
        ask: ['What does `git reset --hard HEAD~1` do?', 'reset --hard HEAD~1…'],
        right: ['Goes back one commit and deletes its changes from the folder'],
        wrong: [
          'Goes back one commit and leaves its changes staged',
          'Goes back one commit and leaves the changes unstaged',
          'Creates a new commit that undoes the previous one',
        ],
      },
      {
        ask: ['What does `git reset --soft HEAD~1` do?', 'reset --soft HEAD~1…'],
        right: ['Goes back one commit and leaves its changes staged'],
        wrong: [
          'Goes back one commit and deletes its changes from the folder',
          'Goes back one commit and leaves the changes unstaged',
          'Creates a new commit that undoes the previous one',
        ],
      },
    ],
    wrong: ['Deletes the branch', 'Downloads the version on the remote', 'Undoes the last push'],
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
          'git reset --hard HEAD~1 and git push --force',
          'git commit --amend and git push --force',
          'Delete the branch on origin and create it again',
        ],
      },
      {
        ask: ['What does `git revert` do?', 'git revert of a commit…'],
        right: ['Creates a commit that undoes its changes'],
      },
    ],
    wrong: [
      'Deletes the commit from the history of the branch',
      'Goes back to the version that is on the remote',
      'Changes the message of that commit',
      'Moves the branch to that commit',
    ],
    why: 'revert adds, it does not rewrite: nobody has to fix their history.',
  },
  'git-stash': {
    forms: [
      {
        ask: ['What is `git stash` for?', 'What does git stash do?'],
        right: [
          'Parks the uncommitted changes and cleans the folder',
          'Keeps your half-done changes so you can switch branch',
        ],
      },
    ],
    wrong: [
      'Makes a temporary commit on the main branch',
      'Deletes the changes that have no commit',
      'Pushes the changes to a hidden branch on the remote',
      'Adds the new files to .gitignore',
    ],
    why: 'stash keeps what is not committed on a stack; with stash pop it comes back wherever you are.',
  },
  'git-github-flow': {
    forms: [
      {
        ask: ['What does GitHub flow consist of?', 'With GitHub flow…'],
        right: ['Short branches off main, merged through a pull request'],
      },
    ],
    wrong: [
      'Everyone commits directly on main',
      'There are two long branches, main and develop, and release branches',
      'Each person has their own repository with no remote',
      'Things are merged into main once a year, all at once',
    ],
    why: 'main always works: each change goes on a short branch off main, is reviewed in a pull request and goes back to main. It is the most common flow in small teams.',
  },
  'git-gitflow': {
    forms: [
      {
        ask: ['In Gitflow, where does a hotfix branch come from?', 'A Gitflow hotfix comes from…'],
        right: ['From main, and it is merged into main and develop'],
        wrong: [
          'From develop, and it is merged only into develop',
          'From the last release, and it is merged into it',
          'From any feature branch',
        ],
      },
      {
        ask: ['In Gitflow, what is develop for?', 'The develop branch of Gitflow…'],
        right: ['Collects the finished work until the next version'],
        wrong: [
          'Is what is released right now in production',
          'Is a test branch that gets deleted at the end',
          'Only keeps the hotfixes that were made on main',
        ],
      },
    ],
    wrong: [
      'It does not exist: Gitflow has no hotfixes',
      'From origin/develop, never merged',
      'Is a backup copy of main',
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
      'Moves forward with each commit you make',
      'Only exists on the remote, not locally',
      'Keeps a separate copy of the files',
      'Is a protected branch that nobody touches',
    ],
    why: 'A tag is a fixed name for a commit: a version.',
  },
  'git-trunk': {
    forms: [
      {
        ask: ['What is trunk-based development?', 'In trunk-based development…'],
        right: ['Everyone merges into main several times a day, on hour-long branches'],
      },
    ],
    wrong: [
      'Each version lives forever on a branch of its own',
      'Nobody uses branches and work is sent around by email',
      'Only one person is allowed to commit on main',
      'Branches last for months and are merged at the very end',
    ],
    why: 'Very short branches and main always merged: it needs automatic tests and a CI that protects main.',
  },
}
