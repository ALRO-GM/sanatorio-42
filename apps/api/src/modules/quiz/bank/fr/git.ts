/** Banco de Not-games en francés: git (`../git.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GIT_FR: Readonly<Record<string, ConceptText>> = {
  'git-commit': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un commit ?", 'Un commit enregistre…'],
        right: [
          'Un instantané des fichiers indexés, avec un message et son commit précédent',
          'Une version enregistrée du projet qui pointe vers la précédente',
        ],
      },
      {
        ask: [
          "Qu'est-ce qui entre dans un commit ?",
          'Quand tu lances git commit, git enregistre…',
        ],
        right: ["Ce qui est dans l'index (ce que tu as ajouté avec git add)"],
        wrong: [
          'Tout ce qui est dans le dossier, toujours',
          'Seulement les nouveaux fichiers',
          "Ce qui n'est pas dans l'index",
        ],
      },
    ],
    wrong: [
      'Une copie du dépôt sur le serveur',
      'Une nouvelle branche',
      'Un fichier de configuration de git',
      'La liste des fichiers que git ignore',
    ],
    why: "Chaque commit est un instantané de ce qui a été indexé avec add, avec son message et un lien vers son parent : c'est comme ça que se construit l'historique.",
  },
  'git-status': {
    forms: [
      {
        ask: ['Que te dit `git status` ?', '`git status` sert à voir…'],
        right: [
          'Sur quelle branche tu es, ce qui est indexé et ce qui a changé sans être indexé',
          "L'état de tes fichiers et de ta branche",
        ],
      },
    ],
    wrong: [
      "L'historique des commits",
      'Qui a modifié chaque ligne',
      'Si le serveur est allumé',
      'Les différences ligne par ligne',
    ],
    why: "status, c'est la photo du moment : la branche, ce qui est indexé et ce qui ne l'est pas. L'historique, c'est git log.",
  },
  'git-branch-what': {
    forms: [
      {
        ask: ["Qu'est-ce qu'une branche dans git ?", 'Pour git, une branche est…'],
        right: ['Un nom qui pointe vers un commit et avance à chaque nouveau commit'],
      },
      {
        ask: ['Que copie git quand tu crées une branche ?', 'Créer une branche copie…'],
        right: ['Rien : ça crée juste un pointeur vers le commit actuel'],
        wrong: ['Tous les fichiers du projet', "L'historique entier", "L'index"],
      },
    ],
    wrong: [
      'Une copie du dossier du projet',
      'Un dépôt à part',
      'Un commit spécial sans parent',
      'Un serveur distant',
    ],
    why: "Une branche n'est qu'une étiquette qui pointe vers un commit : en créer une ne coûte rien.",
  },
  'git-head': {
    forms: [
      {
        ask: ["Qu'est-ce que HEAD ?", 'Dans git, HEAD indique…'],
        right: [
          'Où tu te trouves : en général, la branche actuelle',
          'La branche (ou le commit) sur laquelle tu travailles',
        ],
      },
      {
        ask: ["Qu'est-ce qu'une HEAD détachée (detached) ?", 'Une HEAD détachée veut dire que…'],
        right: ['HEAD pointe directement vers un commit, pas vers une branche'],
        wrong: [
          'La branche main a été supprimée',
          "Il n'y a plus de connexion avec le dépôt distant",
          'Le dépôt est vide',
        ],
      },
    ],
    wrong: [
      'Le premier commit du dépôt',
      'La branche main du dépôt distant',
      "Le dernier commit de n'importe quelle branche",
      'Le fichier de configuration',
    ],
    why: "HEAD, c'est là où tu es ; quand tu fais un commit, la branche vers laquelle elle pointe avance. Si elle pointe vers un commit, elle est détachée.",
  },
  'git-switch-c': {
    forms: [
      {
        ask: [
          'Quelle commande crée une branche et bascule dessus en même temps ?',
          'Pour créer la branche login et passer dessus, tu tapes…',
        ],
        right: ['git switch -c login', 'git checkout -b login'],
        wrong: ['git branch login', 'git switch login', 'git merge login', 'git commit -b login'],
      },
    ],
    wrong: ['git push login', 'git add login', 'git init login'],
    why: 'git branch se contente de la créer ; switch -c (ou checkout -b) la crée et te place dessus.',
  },
  'git-fast-forward': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un merge fast-forward ?", 'Un fast-forward se produit quand…'],
        right: [
          "La branche cible n'a pas bougé : elle avance simplement, sans nouveau commit",
          "Fusionner ne fait que déplacer le pointeur de la branche, car il n'y a rien à combiner",
        ],
      },
    ],
    wrong: [
      'Un merge qui crée un commit à deux parents',
      'Un merge qui ignore les conflits',
      'Un push forcé',
      "Un merge qui supprime l'autre branche",
    ],
    why: "Si main n'a pas bougé depuis que tu as créé ta branche, fusionner déplace simplement main jusqu'au bout de ta branche.",
  },
  'git-merge-commit': {
    forms: [
      {
        ask: [
          "Qu'a de particulier un commit de merge ?",
          'Si les deux branches ont avancé, git merge crée…',
        ],
        right: [
          'Un commit à deux parents',
          'Un commit qui réunit les deux historiques (deux parents)',
        ],
      },
    ],
    wrong: [
      'Un commit sans parent',
      "Une copie de chaque commit de l'autre branche",
      'Une nouvelle branche',
      'Rien : on ne peut pas fusionner deux branches qui ont toutes les deux avancé',
    ],
    why: "Le merge à trois voies combine les changements faits depuis l'ancêtre commun dans un commit à deux parents.",
  },
  'git-branch-delete': {
    forms: [
      {
        ask: [
          'Que se passe-t-il quand tu supprimes avec git branch -d une branche déjà fusionnée ?',
          'Après avoir fusionné feature dans main, git branch -d feature…',
        ],
        right: ['Le nom disparaît ; les commits restent dans main'],
      },
      {
        ask: [
          'Que fait git branch -d avec une branche qui a des commits non fusionnés ?',
          'Si une branche contient du travail non fusionné, git branch -d…',
        ],
        right: ['Refuse de la supprimer (avec -D, il la supprime)'],
        wrong: [
          'La supprime et ses commits passent dans main',
          'La fusionne avant de la supprimer',
        ],
      },
    ],
    wrong: [
      'Tous ses commits sont supprimés',
      'Elle est aussi supprimée sur le dépôt distant',
      'Le merge est annulé',
      'Ses fichiers sont supprimés du dossier',
    ],
    why: "Une branche est un nom : la supprimer n'efface pas les commits qui sont sur une autre branche. -d protège ce qui n'est pas fusionné.",
  },
  'git-fetch': {
    forms: [
      {
        ask: ['Que fait `git fetch` ?', 'À quoi sert git fetch ?'],
        right: [
          'Il télécharge les nouveautés du dépôt distant et déplace origin/main, sans toucher à tes branches',
          'Il récupère les commits du dépôt distant mais ne les fusionne pas avec les tiens',
        ],
      },
      {
        ask: ['Quelle est la différence entre fetch et pull ?', "git pull, c'est…"],
        right: ['fetch puis merge (ou rebase avec --rebase)'],
        wrong: [
          'La même chose que fetch',
          "L'inverse de push : il envoie des changements",
          'fetch plus push',
        ],
      },
    ],
    wrong: [
      'Il envoie tes commits sur le dépôt distant',
      'Il fusionne origin/main dans ta branche',
      'Il supprime les branches qui ne sont pas sur le dépôt distant',
      'Il clone à nouveau le dépôt',
    ],
    why: 'fetch ne fait que télécharger et mettre à jour les branches de suivi ; pull fusionne en plus dans ta branche.',
  },
  'git-tracking': {
    forms: [
      {
        ask: ["Qu'est-ce que origin/main ?", "La branche origin/main de ton dépôt, c'est…"],
        right: [
          'Là où était main sur origin la dernière fois que tu lui as parlé',
          "Une branche de suivi : ta copie de l'état de main sur le dépôt distant",
        ],
      },
    ],
    wrong: [
      'La branche main du dépôt distant en temps réel',
      'Une branche sur laquelle tu peux faire des commits comme sur main',
      'Le premier commit de main',
      'Une sauvegarde automatique de ta branche main',
    ],
    why: "origin/main ne change qu'avec fetch, pull ou push : c'est la dernière chose que tu sais du dépôt distant.",
  },
  'git-push-rejected': {
    forms: [
      {
        ask: [
          "git push te répond « rejected » parce que le dépôt distant a des commits que tu n'as pas. Que fais-tu ?",
          "Ton push est refusé (non-fast-forward). Le réflexe normal, c'est…",
        ],
        right: ['git pull (ou pull --rebase), puis git push à nouveau'],
        wrong: [
          'git push --force sans regarder',
          'Supprimer le dépôt et le cloner à nouveau',
          'git commit --amend puis git push à nouveau',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: "Le dépôt distant ne te laisse pas écraser le travail des autres : d'abord tu récupères le leur, tu fusionnes, puis tu pousses.",
  },
  'git-clone': {
    forms: [
      {
        ask: ['Que fait `git clone url` ?', 'À quoi sert git clone ?'],
        right: [
          "Il copie tout le dépôt, avec son historique, et configure origin pour qu'il pointe vers l'url",
        ],
      },
    ],
    wrong: [
      "Il télécharge seulement la dernière version des fichiers, sans l'historique",
      'Il crée une nouvelle branche sur le dépôt distant',
      'Il envoie ton dossier sur le serveur',
      'Il fusionne deux dépôts',
    ],
    why: "clone récupère tout l'historique et configure le dépôt distant origin.",
  },
  'git-rebase': {
    forms: [
      {
        ask: [
          'Que fait `git rebase main` quand tu es sur feature ?',
          'git rebase main depuis ta branche…',
        ],
        right: [
          "Copie les commits de feature par-dessus main : l'historique devient linéaire",
          'Rejoue tes commits sur le bout de main, avec de nouveaux identifiants',
        ],
      },
      {
        ask: ['Quand ne faut-il pas faire de rebase ?', 'Le rebase est dangereux sur…'],
        right: [
          "Les branches que d'autres personnes partagent déjà (leurs commits changent d'identifiant)",
        ],
        wrong: [
          "Les branches qui n'existent que dans ton dépôt local",
          "Les branches qui n'ont qu'un commit",
          "Les branches que tu n'as pas encore poussées",
        ],
      },
    ],
    wrong: [
      'Il fusionne main dans feature avec un commit de merge',
      'Il supprime les commits de main',
      'Il pousse feature sur le dépôt distant',
      'Il renomme la branche',
    ],
    why: "rebase copie tes commits par-dessus une autre branche : historique linéaire, mais nouveaux commits. Sur une branche partagée, il casse l'historique des autres.",
  },
  'git-cherry-pick': {
    forms: [
      {
        ask: ['Que fait `git cherry-pick a1b2c3` ?', 'À quoi sert cherry-pick ?'],
        right: [
          'Il copie les changements de ce commit là où tu te trouves',
          "Il récupère un commit précis d'une autre branche",
        ],
      },
    ],
    wrong: [
      'Il récupère toute la branche de ce commit',
      "Il supprime ce commit de l'historique",
      'Il te place sur ce commit avec une HEAD détachée',
      'Il annule ce commit',
    ],
    why: "cherry-pick copie un seul commit ; la branche d'où il vient ne change pas.",
  },
  'git-amend': {
    forms: [
      {
        ask: ['Que fait `git commit --amend` ?', 'À quoi sert --amend dans git commit ?'],
        right: [
          'Il refait le dernier commit (message ou fichiers) sous forme de nouveau commit',
          'Il remplace le dernier commit par une version corrigée',
        ],
      },
    ],
    wrong: [
      'Il ajoute un commit vide',
      'Il annule le dernier commit et efface ses changements',
      "Il change le message de n'importe quel ancien commit",
      'Il pousse le dernier commit sur le dépôt distant',
    ],
    why: "amend remplace le dernier commit ; si tu l'avais déjà poussé, les autres ont toujours l'ancien.",
  },
  'git-relative': {
    forms: [
      {
        ask: ["Qu'est-ce que `HEAD~2` ?", 'HEAD~2 désigne…'],
        right: [
          'Le commit situé 2 crans avant HEAD',
          'Le grand-parent de HEAD (en suivant le premier parent)',
        ],
      },
      {
        ask: ["Qu'est-ce que `main^` ?", 'main^ désigne…'],
        right: ['Le parent du commit vers lequel pointe main'],
        wrong: [
          'La branche main du dépôt distant',
          'Le premier commit de main',
          'Le commit enfant de main',
        ],
      },
    ],
    wrong: [
      'La deuxième branche du dépôt',
      'Les 2 derniers commits ensemble',
      'Le commit situé 2 crans après HEAD',
      'HEAD sur le dépôt distant',
    ],
    why: "~n remonte de n commits par le premier parent ; ^ désigne le parent. Ça t'évite de copier des identifiants.",
  },
  'git-reset': {
    forms: [
      {
        ask: ['Que fait `git reset --hard HEAD~1` ?', 'reset --hard HEAD~1…'],
        right: ['Ramène la branche 1 commit en arrière et efface les changements du dossier'],
        wrong: ['Ramène la branche en arrière et laisse les changements indexés'],
      },
      {
        ask: ['Que fait `git reset --soft HEAD~1` ?', 'reset --soft HEAD~1…'],
        right: ['Ramène la branche 1 commit en arrière et laisse ses changements indexés'],
        wrong: ['Ramène la branche en arrière et efface les changements du dossier'],
      },
    ],
    wrong: [
      'Crée un commit qui annule le précédent',
      'Supprime la branche',
      'Télécharge la version du dépôt distant',
      'Annule le dernier push',
    ],
    why: "reset déplace la branche : --soft laisse ce qui a été défait indexé ; sans option (--mixed), non indexé ; et --hard l'efface.",
  },
  'git-revert': {
    forms: [
      {
        ask: [
          "Un mauvais commit est déjà sur origin et d'autres personnes l'ont récupéré. Comment l'annules-tu ?",
          "Pour annuler un commit déjà public, la solution sûre, c'est…",
        ],
        right: ['git revert : un nouveau commit qui fait le contraire'],
        wrong: [
          'git reset --hard puis git push --force',
          'git commit --amend',
          'Supprimer la branche et la recréer',
        ],
      },
      {
        ask: ['Que fait `git revert` ?', "git revert d'un commit…"],
        right: ["Crée un nouveau commit qui annule ses changements, sans réécrire l'historique"],
      },
    ],
    wrong: [
      "Supprime le commit de l'historique",
      'Revient à la version du dépôt distant',
      'Change le message du commit',
      'Déplace la branche sur ce commit',
    ],
    why: "revert ajoute, il ne réécrit rien : personne n'a besoin de réparer son historique.",
  },
  'git-stash': {
    forms: [
      {
        ask: ['À quoi sert `git stash` ?', 'Que fait git stash ?'],
        right: [
          'Il met de côté les changements non commités et laisse le dossier propre (stash pop les ramène)',
          'Il garde tes changements en cours pour que tu puisses changer de branche un moment',
        ],
      },
    ],
    wrong: [
      'Il fait un commit temporaire sur main',
      'Il efface les changements non enregistrés',
      'Il envoie les changements sur une branche cachée du dépôt distant',
      'Il ignore les nouveaux fichiers',
    ],
    why: "stash range sur une pile ce qui n'a pas encore de commit ; avec pop, ça revient là où tu es.",
  },
  'git-github-flow': {
    forms: [
      {
        ask: ['En quoi consiste le GitHub flow ?', 'Avec le GitHub flow…'],
        right: [
          'main fonctionne toujours ; chaque changement passe par une branche courte, relue dans une pull request puis fusionnée',
        ],
      },
    ],
    wrong: [
      'Tout le monde fait ses commits directement sur main',
      'Il y a 2 branches longues, main et develop, plus des branches de release',
      'Chaque personne a son propre dépôt, sans dépôt distant',
      "On ne fusionne dans main qu'une fois par an",
    ],
    why: "Des branches courtes à partir de main, une pull request et retour dans main : c'est le flux le plus courant dans les petites équipes.",
  },
  'git-gitflow': {
    forms: [
      {
        ask: ["Dans Gitflow, d'où part une branche hotfix ?", 'Un hotfix Gitflow part de…'],
        right: ['De main, et il est fusionné dans main et dans develop'],
        wrong: ['De develop, et il est fusionné seulement dans develop', 'De la dernière release'],
      },
      {
        ask: ['Dans Gitflow, à quoi sert develop ?', 'La branche develop de Gitflow…'],
        right: ["Rassemble le travail terminé jusqu'à la prochaine version"],
        wrong: [
          'Est ce qui est publié',
          "Est une branche de test qu'on supprime",
          'Ne contient que les hotfix',
        ],
      },
    ],
    wrong: [
      "De n'importe quelle branche feature",
      "Ça n'existe pas : Gitflow n'a pas de hotfix",
      "D'origin/develop, sans jamais être fusionné",
    ],
    why: "main, c'est ce qui est publié, et develop, ce qui arrive : le hotfix corrige ce qui est publié et revient dans les deux.",
  },
  'git-tag': {
    forms: [
      {
        ask: [
          'Quelle est la différence entre un tag et une branche ?',
          'Un tag (git tag v1.0), contrairement à une branche…',
        ],
        right: ['Ne bouge pas : il marque toujours le même commit'],
      },
      {
        ask: ['Comment pousses-tu les tags sur le dépôt distant ?', 'Les tags se poussent avec…'],
        right: ['git push --tags', 'git push origin v1.0'],
        wrong: ['git push, qui pousse toujours les tags', 'git tag --push', 'git commit --tags'],
      },
    ],
    wrong: [
      'Avance à chaque commit',
      "N'existe que sur le dépôt distant",
      'Garde les fichiers à part',
      'Est une branche protégée',
    ],
    why: 'Un tag est un nom fixe pour un commit : une version.',
  },
  'git-trunk': {
    forms: [
      {
        ask: ["Qu'est-ce que le trunk-based development ?", 'En trunk-based development…'],
        right: [
          'Tout le monde fusionne dans main plusieurs fois par jour, avec des branches qui durent quelques heures et des tests automatiques',
        ],
      },
    ],
    wrong: [
      'Chaque version vit pour toujours sur sa propre branche',
      "Personne n'utilise de branches et le travail s'envoie par e-mail",
      'Une seule personne peut faire des commits sur main',
      'Les branches durent des mois et sont fusionnées à la fin',
    ],
    why: 'Des branches très courtes et main toujours à jour : il faut une CI qui protège main.',
  },
}
