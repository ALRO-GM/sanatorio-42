/** Repaso de Not-games en francés: git, traducción de `../review-git.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_GIT_FR: Readonly<Record<string, ReviewEntry>> = {
  'git-commit': {
    title: 'Commit',
    definition:
      "Un instantané de ce que tu as indexé avec git add, avec un message et un lien vers le commit précédent. La chaîne des commits, c'est l'historique.",
    example: 'git add hola.c && git commit -m "Ajoute hola.c"',
  },
  'git-status': {
    title: 'git status',
    definition:
      "Te dit sur quelle branche tu es, ce qui est indexé pour le prochain commit et ce qui a changé sans être indexé. L'historique se consulte avec git log.",
    example: 'git status → « Modifications qui ne seront pas validées : main.c »',
  },
  'git-branch-what': {
    title: 'Branche',
    definition:
      'Un nom qui pointe vers un commit et avance à chaque commit que tu fais dessus. En créer une ne copie rien.',
    example: 'git branch login → login pointe vers le même commit que la branche actuelle.',
  },
  'git-head': {
    title: 'HEAD',
    definition:
      "Là où tu te trouves. En général, elle pointe vers une branche ; si elle pointe directement vers un commit, elle est détachée (detached) et ce que tu fais n'est enregistré sur aucune branche.",
    example:
      'git checkout HEAD~2 → HEAD détachée ; puis git switch -c nouvelle pour garder ce que tu fais.',
  },
  'git-switch-c': {
    title: 'Créer une branche et basculer dessus',
    definition:
      'git switch -c (ou git checkout -b) crée une branche et te place dessus en une seule commande.',
    example: 'git switch -c login',
  },
  'git-fast-forward': {
    title: 'Merge fast-forward',
    definition:
      "Si la branche cible n'a pas avancé, fusionner la déplace simplement jusqu'au bout de l'autre : il n'y a pas de nouveau commit. Avec --no-ff, on force un commit de merge.",
    example: 'main sur c1, feature sur c3 (partie de c1) : git merge feature → main sur c3.',
  },
  'git-merge-commit': {
    title: 'Commit de merge',
    definition:
      "Si les deux branches ont avancé, git combine leurs changements depuis l'ancêtre commun dans un commit à deux parents.",
    example:
      'git switch main && git merge feature → « Merge feature », avec pour parents main et feature.',
  },
  'git-branch-delete': {
    title: 'Supprimer des branches',
    definition:
      "git branch -d supprime le nom d'une branche déjà fusionnée (ses commits restent où ils sont). Si elle contient du travail non fusionné, il refuse ; -D la supprime quand même.",
    example: 'git merge fix && git branch -d fix',
  },
  'git-fetch': {
    title: 'fetch et pull',
    definition:
      "fetch télécharge les nouveautés du dépôt distant et déplace origin/branche, sans toucher à tes branches. pull, c'est fetch plus merge (ou plus rebase avec --rebase).",
    example: 'git fetch && git log --oneline --all; puis git merge origin/main.',
  },
  'git-tracking': {
    title: 'Branches de suivi',
    definition:
      "origin/main est ta copie de l'endroit où était main sur le dépôt distant la dernière fois que tu lui as parlé. Elle ne change qu'avec fetch, pull ou push.",
    example: 'Après git fetch, origin/main peut être en avance sur ta branche main.',
  },
  'git-push-rejected': {
    title: 'Push refusé',
    definition:
      "Le dépôt distant refuse un push qui écraserait des commits que tu n'as pas. Il faut les récupérer (pull ou pull --rebase), fusionner et pousser à nouveau.",
    example: 'git push → rejected; git pull --rebase; git push.',
  },
  'git-clone': {
    title: 'git clone',
    definition:
      "Copie tout le dépôt, avec l'historique complet, et configure le dépôt distant origin.",
    example: 'git clone git@github.com:yo/libft.git',
  },
  'git-rebase': {
    title: 'Rebase',
    definition:
      "Copie les commits de ta branche par-dessus une autre : l'historique devient linéaire, mais les commits sont nouveaux (autres identifiants). À éviter sur les branches que d'autres personnes partagent.",
    example: 'git switch feature && git rebase main',
  },
  'git-cherry-pick': {
    title: 'Cherry-pick',
    definition: "Copie les changements d'un commit précis là où tu te trouves.",
    example: "git cherry-pick a1b2c3 → récupère seulement ce correctif de l'autre branche.",
  },
  'git-amend': {
    title: 'commit --amend',
    definition:
      "Remplace le dernier commit par une version corrigée (message ou fichiers). Si tu l'avais déjà poussé, il faudra forcer le push.",
    example: 'git add olvidado.c && git commit --amend',
  },
  'git-relative': {
    title: 'Références relatives',
    definition:
      'HEAD~n, ce sont n commits avant HEAD ; branche^ est le parent du commit de la branche.',
    example: 'git reset HEAD~2, git checkout main^',
  },
  'git-reset': {
    title: 'Reset',
    definition:
      "Déplace la branche vers un autre commit. --soft laisse ce qui a été défait indexé, l'option par défaut (--mixed) le laisse non indexé et --hard l'efface. Seulement sur des commits que personne n'a vus.",
    example:
      'git reset --soft HEAD~3 && git commit -m "Tout ensemble" regroupe trois commits en un seul.',
  },
  'git-revert': {
    title: 'Revert',
    definition:
      "Crée un nouveau commit qui fait le contraire d'un autre. Il ne réécrit pas l'historique : c'est la façon sûre d'annuler quelque chose qui est déjà sur le dépôt distant.",
    example: 'git revert HEAD && git push',
  },
  'git-stash': {
    title: 'Stash',
    definition:
      'Met de côté tes changements non commités et laisse le dossier propre. git stash pop les ramène là où tu es.',
    example: 'git stash; git switch fix; …; git switch main; git stash pop',
  },
  'git-github-flow': {
    title: 'GitHub flow',
    definition:
      'main fonctionne toujours. Chaque changement passe par une branche courte, poussée, relue dans une pull request et fusionnée dans main.',
    example: 'git switch -c api; commits; git push origin api; pull request; merge.',
  },
  'git-gitflow': {
    title: 'Gitflow',
    definition:
      'Deux branches longues : main (ce qui est publié) et develop (ce qui arrive). Les versions sortent sur des branches release ; les corrections urgentes, sur des branches hotfix parties de main, fusionnées dans main et dans develop.',
    example: 'git switch -c hotfix main; correctif; merge dans main (tag v1.0.1) et dans develop.',
  },
  'git-tag': {
    title: 'Tags',
    definition:
      'Un nom fixe pour un commit, en général une version. Contrairement à une branche, il ne bouge pas. On les pousse avec git push --tags.',
    example: 'git tag v1.0 && git push --tags',
  },
  'git-trunk': {
    title: 'Trunk-based',
    definition:
      'Tout le monde fusionne dans main plusieurs fois par jour, avec des branches qui durent quelques heures. Il faut des tests automatiques qui protègent main.',
    example: 'git switch -c mini; un commit; rebase sur main; merge rapide; push; supprimer mini.',
  },
}
