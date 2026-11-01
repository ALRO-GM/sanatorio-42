/** Banco de Not-games en francés: git (`../git.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GIT_FR: Readonly<Record<string, ConceptText>> = {
  'git-commit': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un commit ?", 'Un commit enregistre…'],
        right: [
          'Un instantané de ce qui est indexé, avec message et parent',
          'Une version enregistrée qui pointe vers la précédente',
        ],
      },
      {
        ask: [
          "Qu'est-ce qui entre dans un commit ?",
          'Quand tu lances git commit, git enregistre…',
        ],
        right: ["Ce qui est dans l'index, ajouté avec git add"],
        wrong: [
          'Tout ce qui est dans le dossier, toujours',
          'Seulement les nouveaux fichiers, jamais les modifiés',
          "Ce qui n'est pas encore dans l'index",
        ],
      },
    ],
    wrong: [
      'Une copie du dépôt gardée sur le serveur',
      'Une nouvelle branche qui part de la branche main',
      'Un fichier de configuration propre à git',
      'La liste des fichiers que git doit ignorer',
    ],
    why: "Chaque commit est un instantané de ce qui a été indexé avec add, avec son message et un lien vers son parent : c'est comme ça que se construit l'historique.",
  },
  'git-status': {
    forms: [
      {
        ask: ['Que te dit `git status` ?', '`git status` sert à voir…'],
        right: [
          "Ta branche, ce qui est indexé et ce qui ne l'est pas",
          "L'état de tes fichiers et de ta branche",
        ],
      },
    ],
    wrong: [
      "L'historique des commits de la branche",
      "Qui a modifié chaque ligne d'un fichier",
      'Si le serveur distant est allumé et répond',
      'Les différences ligne par ligne de chaque fichier',
    ],
    why: "status, c'est la photo du moment : la branche, ce qui est indexé et ce qui ne l'est pas. L'historique, c'est git log.",
  },
  'git-branch-what': {
    forms: [
      {
        ask: ["Qu'est-ce qu'une branche dans git ?", 'Pour git, une branche est…'],
        right: ['Un pointeur vers un commit qui avance à chaque commit'],
      },
      {
        ask: ['Que copie git quand tu crées une branche ?', 'Créer une branche copie…'],
        right: ['Rien : juste un pointeur vers le commit actuel'],
        wrong: [
          'Tous les fichiers du projet',
          "L'historique entier de la branche actuelle",
          "L'index et les changements non indexés",
        ],
      },
    ],
    wrong: [
      'Une copie du dossier du projet',
      'Un dépôt à part, avec son propre historique',
      "Un commit spécial qui n'a pas de parent",
      'Un serveur distant où on envoie le code',
    ],
    why: "Une branche n'est qu'une étiquette qui pointe vers un commit : en créer une ne coûte rien.",
  },
  'git-head': {
    forms: [
      {
        ask: ["Qu'est-ce que HEAD ?", 'Dans git, HEAD indique…'],
        right: [
          'Où tu te trouves : en général, la branche actuelle',
          'La branche ou le commit sur lequel tu travailles',
        ],
      },
      {
        ask: ["Qu'est-ce qu'une HEAD détachée (detached) ?", 'Une HEAD détachée veut dire…'],
        right: ['Que HEAD pointe vers un commit, pas vers une branche'],
        wrong: [
          'Que la branche où tu étais a été supprimée',
          "Qu'il n'y a plus de connexion avec origin",
          'Que le dépôt est vide, sans aucun commit',
        ],
      },
    ],
    wrong: [
      'Le premier commit du dépôt',
      'La branche main telle qu’elle est sur le dépôt distant',
      "Le dernier commit de n'importe quelle branche",
      'Le fichier de configuration du dépôt',
    ],
    why: "HEAD, c'est là où tu es ; quand tu fais un commit, la branche vers laquelle elle pointe avance. Si elle pointe vers un commit, elle est détachée.",
  },
  'git-switch-c': {
    forms: [
      {
        ask: [
          'Quelle commande crée une branche et bascule dessus en même temps ?',
          'Pour créer la branche login et passer dessus, tu tapes…',
        ],
        right: ['git switch -c login', 'git checkout -b login'],
        wrong: ['git branch login', 'git switch login', 'git merge login', 'git commit -b login'],
      },
    ],
    wrong: ['git push login', 'git add login', 'git init login'],
    why: 'git branch se contente de la créer ; switch -c (ou checkout -b) la crée et te place dessus.',
  },
  'git-fast-forward': {
    forms: [
      {
        ask: ['Que fait git lors d’un merge fast-forward ?', 'Lors d’un fast-forward, git…'],
        right: [
          'Avance juste la branche, sans nouveau commit',
          "Déplace juste le pointeur, car il n'y a rien à combiner",
        ],
      },
    ],
    wrong: [
      'Crée un commit de merge à deux parents',
      'Ignore les conflits et garde ta version',
      'Fait un push forcé de la branche',
      "Supprime l'autre branche après la fusion",
    ],
    why: "Si main n'a pas bougé depuis que tu as créé ta branche, fusionner déplace simplement main jusqu'au bout de ta branche.",
  },
  'git-merge-commit': {
    forms: [
      {
        ask: [
          "Qu'a de particulier un commit de merge ?",
          'Si les deux branches ont avancé, git merge crée…',
        ],
        right: ['Un seul commit, à deux parents', 'Un commit qui réunit les deux historiques'],
      },
    ],
    wrong: [
      'Un commit sans parent, comme le premier',
      "Une copie de chaque commit de l'autre branche",
      'Une nouvelle branche avec les deux changements',
      'Rien : si les deux ont avancé, on ne peut pas fusionner',
    ],
    why: "Le merge à trois voies combine les changements faits depuis l'ancêtre commun dans un commit à deux parents.",
  },
  'git-branch-delete': {
    forms: [
      {
        ask: [
          'Que se passe-t-il quand tu supprimes avec git branch -d une branche déjà fusionnée ?',
          'Après avoir fusionné feature dans main, git branch -d feature…',
        ],
        right: ['Supprime le nom ; les commits restent dans main'],
      },
      {
        ask: [
          'Que fait git branch -d avec une branche qui a des commits non fusionnés ?',
          'Si une branche contient du travail non fusionné, git branch -d…',
        ],
        right: ['Refuse de la supprimer ; avec -D, il le fait'],
        wrong: [
          'La supprime et ses commits passent dans main',
          'La fusionne dans main avant de la supprimer',
          'La supprime avec tous ses commits',
        ],
      },
    ],
    wrong: [
      "Supprime tous ses commits de l'historique",
      'La supprime aussi sur le dépôt distant',
      "Annule le merge qui l'a réunie à main",
      'Supprime ses fichiers du dossier',
    ],
    why: "Une branche est un nom : la supprimer n'efface pas les commits qui sont sur une autre branche. -d protège ce qui n'est pas fusionné.",
  },
  'git-fetch': {
    forms: [
      {
        ask: ['Que fait `git fetch` ?', 'À quoi sert git fetch ?'],
        right: [
          'Il télécharge les nouveautés et déplace origin/main, sans toucher à tes branches',
          'Il récupère les commits du dépôt distant sans les fusionner',
        ],
      },
      {
        ask: ['Que fait git pull, par rapport à fetch ?', "git pull, c'est…"],
        right: ['Un fetch suivi d’un merge dans ta branche'],
        wrong: [
          'La même chose que fetch, sous un autre nom',
          'Un fetch suivi d’un push de ton travail',
          'Un nouveau clone, par-dessus ce que tu as',
        ],
      },
    ],
    wrong: [
      'Il envoie tes nouveaux commits sur la branche distante',
      'Il télécharge les nouveautés et les fusionne dans ta branche',
      'Il supprime les branches qui ne sont plus sur le dépôt distant',
      'Il clone à nouveau le dépôt, depuis zéro',
    ],
    why: 'fetch ne fait que télécharger et mettre à jour les branches de suivi ; pull fusionne en plus dans ta branche (avec merge, ou avec rebase si tu le demandes).',
  },
  'git-tracking': {
    forms: [
      {
        ask: ["Qu'est-ce que origin/main ?", "La branche origin/main de ton dépôt, c'est…"],
        right: [
          'Là où était main sur origin la dernière fois que tu as regardé',
          "Ta copie de l'état de main sur le dépôt distant",
        ],
      },
    ],
    wrong: [
      'La branche main du dépôt distant, en temps réel',
      'Une branche où tu fais des commits, comme sur main',
      'Le premier commit qui a été poussé sur main',
      'Une sauvegarde automatique de ta branche main',
    ],
    why: "origin/main ne change qu'avec fetch, pull ou push : c'est la dernière chose que tu sais du dépôt distant.",
  },
  'git-push-rejected': {
    forms: [
      {
        ask: [
          "git push te répond « rejected » parce que le dépôt distant a des commits que tu n'as pas. Que fais-tu ?",
          "Ton push est refusé (non-fast-forward). Le réflexe normal, c'est…",
        ],
        right: ['Récupérer leur travail avec git pull et repousser'],
        wrong: [
          'git push --force, sans regarder',
          'Supprimer le dépôt et le cloner à nouveau',
          'git commit --amend puis git push à nouveau',
        ],
      },
    ],
    wrong: ['git commit --amend', 'git reset --hard', 'git branch -D main', 'git init'],
    why: "Le dépôt distant ne te laisse pas écraser le travail des autres : d'abord tu récupères le leur (pull, ou pull --rebase), tu fusionnes, puis tu pousses.",
  },
  'git-clone': {
    forms: [
      {
        ask: ['Que fait `git clone url` ?', 'À quoi sert git clone ?'],
        right: ['Il copie le dépôt avec son historique et configure origin'],
      },
    ],
    wrong: [
      "Il télécharge seulement la dernière version des fichiers, sans l'historique",
      'Il crée sur le dépôt distant une branche à ton nom',
      'Il envoie ton dossier sur le serveur comme dépôt',
      'Il fusionne deux dépôts en un seul avec leur historique',
    ],
    why: "clone récupère tout l'historique et configure le dépôt distant origin.",
  },
  'git-rebase': {
    forms: [
      {
        ask: [
          'Que fait `git rebase main` quand tu es sur feature ?',
          'git rebase main depuis ta branche…',
        ],
        right: [
          'Copie tes commits par-dessus main, en ligne droite',
          'Rejoue tes commits sur main, avec de nouveaux identifiants',
        ],
      },
      {
        ask: ['Quand ne faut-il pas faire de rebase ?', 'Le rebase est dangereux sur…'],
        right: ["Les branches que d'autres partagent déjà"],
        wrong: [
          "Les branches qui n'existent qu'en local",
          "Les branches qui n'ont qu'un commit",
          "Les branches que tu n'as pas encore poussées",
        ],
      },
    ],
    wrong: [
      'Il fusionne main dans feature avec un commit de merge',
      "Il supprime de main les commits que feature n'a pas",
      'Il pousse feature sur le dépôt distant et la fusionne',
      'Il renomme la branche en main',
    ],
    why: "rebase copie tes commits par-dessus une autre branche : historique linéaire, mais nouveaux commits. Sur une branche partagée, il casse l'historique des autres.",
  },
  'git-cherry-pick': {
    forms: [
      {
        ask: ['Que fait `git cherry-pick a1b2c3` ?', 'À quoi sert cherry-pick ?'],
        right: [
          'Il copie ce commit là où tu te trouves',
          "Il récupère un commit précis d'une autre branche",
        ],
      },
    ],
    wrong: [
      'Il récupère toute la branche de ce commit',
      "Il supprime ce commit de l'historique",
      'Il te place sur ce commit avec une HEAD détachée',
      'Il annule ce commit avec un nouveau',
    ],
    why: "cherry-pick copie un seul commit ; la branche d'où il vient ne change pas.",
  },
  'git-amend': {
    forms: [
      {
        ask: ['Que fait `git commit --amend` ?', 'À quoi sert --amend dans git commit ?'],
        right: [
          'Il refait le dernier commit, avec un autre message ou d’autres fichiers',
          'Il remplace le dernier commit par une version corrigée',
        ],
      },
    ],
    wrong: [
      'Il ajoute un commit vide après le dernier',
      'Il annule le dernier commit et efface ses changements',
      "Il change le message de n'importe quel ancien commit",
      'Il pousse le dernier commit, corrigé, sur le dépôt distant',
    ],
    why: "amend remplace le dernier commit par un nouveau ; si tu l'avais déjà poussé, les autres ont toujours l'ancien.",
  },
  'git-relative': {
    forms: [
      {
        ask: ["Qu'est-ce que `HEAD~2` ?", 'HEAD~2 désigne…'],
        right: [
          'Le commit situé deux crans avant HEAD',
          'Le grand-parent de HEAD, par le premier parent',
        ],
      },
      {
        ask: ["Qu'est-ce que `main^` ?", 'main^ désigne…'],
        right: ['Le parent du commit vers lequel pointe main'],
        wrong: [
          'La branche main telle qu’elle est sur origin',
          "Le premier commit de l'historique de main",
          "L'enfant du commit vers lequel pointe main",
        ],
      },
    ],
    wrong: [
      'La deuxième branche du dépôt',
      'Les deux derniers commits ensemble',
      'Le commit situé deux crans après HEAD',
      'HEAD tel qu’il est sur le dépôt distant',
    ],
    why: "~n remonte de n commits par le premier parent ; ^ désigne le parent. Ça t'évite de copier des identifiants.",
  },
  'git-reset': {
    forms: [
      {
        ask: ['Que fait `git reset --hard HEAD~1` ?', 'reset --hard HEAD~1…'],
        right: ['Recule d’un commit et efface ses changements du dossier'],
        wrong: [
          'Recule d’un commit et laisse ses changements indexés',
          'Recule d’un commit et laisse les changements non indexés',
          'Crée un nouveau commit qui annule le précédent',
        ],
      },
      {
        ask: ['Que fait `git reset --soft HEAD~1` ?', 'reset --soft HEAD~1…'],
        right: ['Recule d’un commit et laisse ses changements indexés'],
        wrong: [
          'Recule d’un commit et efface ses changements du dossier',
          'Recule d’un commit et laisse les changements non indexés',
          'Crée un nouveau commit qui annule le précédent',
        ],
      },
    ],
    wrong: [
      'Supprime la branche',
      'Télécharge la version du dépôt distant',
      'Annule le dernier push',
    ],
    why: "reset déplace la branche : --soft laisse ce qui a été défait indexé ; sans option (--mixed), non indexé ; et --hard l'efface.",
  },
  'git-revert': {
    forms: [
      {
        ask: [
          "Un mauvais commit est déjà sur origin et d'autres personnes l'ont récupéré. Comment l'annules-tu ?",
          "Pour annuler un commit déjà public, la solution sûre, c'est…",
        ],
        right: ['git revert : un nouveau commit qui fait le contraire'],
        wrong: [
          'git reset --hard HEAD~1 puis git push --force',
          'git commit --amend puis git push --force',
          'Supprimer la branche sur origin et la recréer',
        ],
      },
      {
        ask: ['Que fait `git revert` ?', "git revert d'un commit…"],
        right: ['Crée un commit qui annule ses changements'],
      },
    ],
    wrong: [
      "Supprime le commit de l'historique de la branche",
      'Revient à la version qui est sur le dépôt distant',
      'Change le message de ce commit',
      'Déplace la branche jusqu’à ce commit',
    ],
    why: "revert ajoute, il ne réécrit rien : personne n'a besoin de réparer son historique.",
  },
  'git-stash': {
    forms: [
      {
        ask: ['À quoi sert `git stash` ?', 'Que fait git stash ?'],
        right: [
          'Il met de côté les changements non commités et nettoie le dossier',
          'Il garde tes changements en cours pour que tu changes de branche',
        ],
      },
    ],
    wrong: [
      'Il fait un commit temporaire sur la branche main',
      "Il efface les changements qui n'ont pas de commit",
      'Il envoie les changements sur une branche cachée du dépôt distant',
      'Il ajoute les nouveaux fichiers à .gitignore',
    ],
    why: "stash range sur une pile ce qui n'a pas encore de commit ; avec stash pop, ça revient là où tu es.",
  },
  'git-github-flow': {
    forms: [
      {
        ask: ['En quoi consiste le GitHub flow ?', 'Avec le GitHub flow…'],
        right: ['Des branches courtes depuis main, fusionnées par pull request'],
      },
    ],
    wrong: [
      'Tout le monde fait ses commits directement sur main',
      'Il y a deux branches longues, main et develop, plus des branches de release',
      'Chaque personne a son propre dépôt, sans dépôt distant',
      "On ne fusionne dans main qu'une fois par an, en bloc",
    ],
    why: "main fonctionne toujours : chaque changement passe par une branche courte depuis main, relue dans une pull request, puis revient dans main. C'est le flux le plus courant dans les petites équipes.",
  },
  'git-gitflow': {
    forms: [
      {
        ask: ["Dans Gitflow, d'où part une branche hotfix ?", 'Un hotfix Gitflow part de…'],
        right: ['De main, et il est fusionné dans main et dans develop'],
        wrong: [
          'De develop, et il est fusionné seulement dans develop',
          'De la dernière release, et il est fusionné dedans',
          "De n'importe quelle branche feature",
        ],
      },
      {
        ask: ['Dans Gitflow, à quoi sert develop ?', 'La branche develop de Gitflow…'],
        right: ["Rassemble le travail terminé jusqu'à la prochaine version"],
        wrong: [
          'Est ce qui est publié en ce moment en production',
          "Est une branche de test qu'on supprime à la fin",
          'Ne contient que les hotfix faits sur main',
        ],
      },
    ],
    wrong: [
      "Ça n'existe pas : Gitflow n'a pas de hotfix",
      "D'origin/develop, sans jamais être fusionné",
      'Est une copie de sauvegarde de main',
    ],
    why: "main, c'est ce qui est publié, et develop, ce qui arrive : le hotfix corrige ce qui est publié et revient dans les deux.",
  },
  'git-tag': {
    forms: [
      {
        ask: [
          'Quelle est la différence entre un tag et une branche ?',
          'Un tag (git tag v1.0), contrairement à une branche…',
        ],
        right: ['Ne bouge pas : il marque toujours le même commit'],
      },
      {
        ask: ['Comment pousses-tu les tags sur le dépôt distant ?', 'Les tags se poussent avec…'],
        right: ['git push --tags', 'git push origin v1.0'],
        wrong: ['git push, qui pousse toujours les tags', 'git tag --push', 'git commit --tags'],
      },
    ],
    wrong: [
      'Avance à chaque commit que tu fais',
      "N'existe que sur le dépôt distant, pas en local",
      'Garde une copie à part des fichiers',
      'Est une branche protégée que personne ne touche',
    ],
    why: 'Un tag est un nom fixe pour un commit : une version.',
  },
  'git-trunk': {
    forms: [
      {
        ask: ["Qu'est-ce que le trunk-based development ?", 'En trunk-based development…'],
        right: ['Tous fusionnent dans main plusieurs fois par jour, avec des branches courtes'],
      },
    ],
    wrong: [
      'Chaque version vit pour toujours sur sa propre branche',
      "Personne n'utilise de branches et le travail s'envoie par e-mail",
      'Une seule personne peut faire des commits sur main',
      'Les branches durent des mois et sont fusionnées à la fin',
    ],
    why: 'Des branches très courtes et main toujours à jour : il faut des tests automatiques et une CI qui protège main.',
  },
}
