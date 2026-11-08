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
      {
        ask: [
          'Tu modifies `a.txt` et `b.txt`, tu fais `git add a.txt` puis un commit. Que dit ensuite `git status` ?',
          'Avec `a.txt` et `b.txt` modifiés, après `git add a.txt` et un commit, `git status` dit…',
        ],
        right: [
          'Que `b.txt` a encore des modifications non indexées',
          'Que les modifications de `b.txt` sont restées dehors',
        ],
        wrong: [
          'Que `b.txt` est aussi entré dans le commit',
          'Que `a.txt` a encore des modifications non indexées',
          'Que `b.txt` est indexé pour le commit',
          "Qu'il ne reste rien à enregistrer sur `main`",
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
      {
        ask: [
          'Tu modifies `main.c` et tu fais `git add main.c`, sans commit. Comment `git status` montre-t-il `main.c` ?',
          'Après `git add main.c` et avant le commit, `git status` montre `main.c` comme…',
        ],
        right: ['Indexé pour le prochain commit', 'Prêt à entrer dans le prochain commit'],
        wrong: [
          'Modifié, mais pas indexé',
          'Déjà enregistré dans un nouveau commit',
          'Non suivi : git ne le connaît pas encore',
          'Déjà poussé sur la branche distante',
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
      {
        ask: [
          'Tu es sur `main` et tu crées la branche `login` sans faire de commit. Vers quel commit pointe `login` ?',
          'Tout juste créée depuis `main`, sans nouveau commit, la branche `login` pointe…',
        ],
        right: ['Vers le même commit que main', 'Vers le commit où se trouve main'],
        wrong: [
          'Vers le premier commit du dépôt',
          'Vers un nouveau commit, copie de celui de main',
          'Vers aucun tant que tu ne fais pas de commit',
          "Vers le commit d'avant celui de main",
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
      {
        ask: [
          'Avec HEAD détachée, tu fais un commit et tu reviens sur `main`. Que devient ce commit ?',
          'Tu fais un commit avec HEAD détachée puis `git switch main`. Ce commit…',
        ],
        right: ['Ne reste sur aucune branche', 'Reste en dehors de toutes les branches'],
        wrong: [
          "S'ajoute à main quand tu reviens",
          'Passe sur une nouvelle branche nommée HEAD',
          'Est supprimé dès que tu le fais',
          'Est poussé tout seul sur origin',
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
      {
        ask: [
          'Tu es sur `main`, tu tapes `git branch login` et tu fais un commit. Quelle branche avance ?',
          'Après `git branch login` et un commit, sur `main`, la branche qui avance est…',
        ],
        right: [
          'main, car git branch ne te fait pas changer de branche',
          "main : créer login ne t'y emmène pas",
        ],
        wrong: [
          "login, car c'est la branche qui vient d'être créée",
          'Les deux, car elles pointaient vers le même commit',
          'Aucune, car HEAD se retrouve détachée',
          'login, et main reste sur le précédent',
        ],
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
      {
        ask: [
          "`feature` a 2 commits et `main` n'a pas avancé. Combien de commits de merge crée `git merge feature` sur `main` ?",
          "Combien de commits de merge crée `git merge feature` si `main` n'a pas bougé depuis le départ de `feature` ?",
        ],
        right: ['0'],
        wrong: ['1', '2', '3'],
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
      {
        ask: [
          '`main` et `feature` ont chacune un nouveau commit. Après `git merge feature`, combien de parents a le nouveau commit ?',
          'Si les deux branches ont avancé, combien de parents a le commit créé par `git merge` ?',
        ],
        right: ['2'],
        wrong: ['1', '0', '3'],
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
      {
        ask: [
          "Ton `origin/main` est sur `c3`. Quelqu'un pousse `c4` et tu ne fais rien. Où est ton `origin/main` ?",
          'Une autre personne pousse `c4` sur origin ; tu ne tapes rien. Ton `origin/main`, qui était sur `c3`, est maintenant…',
        ],
        right: [
          "Sur `c3`, jusqu'à ton `git fetch`",
          "Toujours sur `c3` : personne d'autre ne le bouge",
        ],
        wrong: [
          'Sur `c4`, car il se met à jour tout seul',
          'Sur `c4`, mais sans ses fichiers',
          "Supprimé jusqu'au prochain `git pull`",
          'Sur `c3`, et ton `main` passe à `c4`',
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
      {
        ask: [
          "Ton `main` et celui d'origin ont avancé chacun de leur côté. Que se passe-t-il avec `git push` ?",
          "Si origin a un commit que tu n'as pas et toi un qu'origin n'a pas, `git push`…",
        ],
        right: [
          "Est refusé : il faut d'abord récupérer le leur",
          "Échoue tant que tu n'as pas fusionné origin",
        ],
        wrong: [
          "Pousse le tien et efface ce qu'il y avait sur origin",
          'Fusionne les deux historiques sur le distant',
          "Pousse le tien sur une nouvelle branche d'origin",
          'Pousse le tien et laisse le leur pour plus tard',
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
      {
        ask: [
          'Tu clones un dépôt qui a 20 commits. Que montre `git log --oneline` juste après le clone ?',
          "Juste après le `git clone` d'un dépôt de 20 commits, `git log --oneline` montre…",
        ],
        right: ["Les 20 commits, avec tout l'historique", "Tout l'historique : les 20 commits"],
        wrong: [
          'Seulement le dernier commit, sans historique',
          "Rien : l'historique reste sur le dépôt distant",
          'Seulement les commits que tu feras désormais',
          'Un seul nouveau commit nommé clone',
        ],
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
      {
        ask: [
          'Sur `feature` tu as 2 commits et `main` a avancé. Après `git rebase main`, que deviennent les identifiants de tes commits ?',
          'Après `git rebase main` sur `feature`, les identifiants de tes 2 commits…',
        ],
        right: [
          'Changent : ce sont de nouvelles copies sur main',
          'Sont autres : git crée des copies sur main',
        ],
        wrong: [
          'Restent les mêmes : seule la branche bouge',
          'Disparaissent, réunis en un seul commit',
          'Passent sur main avec les mêmes identifiants',
          'Restent les mêmes et main est fusionnée dans feature',
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
      {
        ask: [
          "Sur `main` tu fais `git cherry-pick` d'un commit de la branche `fix`. Que devient `fix` ?",
          'Après avoir copié sur `main` un commit de `fix` avec `git cherry-pick`, la branche `fix`…',
        ],
        right: ['Rien ne change : elle garde ce commit', 'Reste pareille, avec son commit dedans'],
        wrong: [
          'Perd le commit, qui passe sur main',
          'Est fusionnée en entier dans main',
          "Avance jusqu'au bout de main",
          'Est supprimée car il est déjà sur main',
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
      {
        ask: [
          'Tu viens de faire un commit, pas encore poussé, et tu as oublié `libft.h`. Que fais-tu ?',
          'Pour mettre `libft.h` dans le commit que tu viens de faire (pas poussé), tu tapes…',
        ],
        right: ['`git add libft.h` puis `git commit --amend`'],
        wrong: [
          '`git commit --amend` puis `git add libft.h`',
          '`git revert HEAD` puis `git add libft.h`',
          '`git add libft.h` puis `git push --force`',
          '`git reset --hard HEAD~1` et un autre `git commit`',
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
      {
        ask: [
          'Ta branche a 4 commits en ligne, de c0 à c3, et HEAD est sur c3. Quel commit est `HEAD~2` ?',
          'Avec 4 commits en ligne, de c0 à c3, et HEAD sur c3, `HEAD~2` est…',
        ],
        right: ['c1'],
        wrong: ['c2', 'c0', 'c5'],
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
      {
        ask: [
          'Tu as `main.c` modifié sans commit et tu fais `git stash`. Que dit ensuite `git status` ?',
          'Juste après `git stash`, avec `main.c` modifié, `git status` dit…',
        ],
        right: ["Qu'il n'y a rien à enregistrer", 'Que le dossier de travail est propre'],
        wrong: [
          'Que main.c est encore modifié, non indexé',
          'Que main.c est indexé pour le commit',
          "Qu'il y a un nouveau commit sur main",
          'Que main.c a été supprimé du dépôt',
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
      {
        ask: [
          'Avec GitHub flow, tu termines un correctif sur ta branche `fix-login`. Et maintenant ?',
          "Avec GitHub flow, quand le travail de la branche `fix-login` est fini, l'étape suivante est…",
        ],
        right: [
          'Ouvrir une pull request pour la fusionner dans main',
          'Demander une revue avec une pull request vers main',
        ],
        wrong: [
          'La fusionner dans develop et attendre la release',
          'Pousser ses commits directement sur main',
          "La laisser ouverte jusqu'à la prochaine version",
          "Créer une branche release à partir d'elle",
        ],
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
      {
        ask: [
          'Tu poses `git tag v1.0` sur `c3` et tu fais deux commits de plus. Où est `v1.0` ?',
          'Après `git tag v1.0` sur `c3` et deux commits de plus, `v1.0` désigne…',
        ],
        right: ["`c3`, là où tu l'as posé", 'Toujours `c3` : un tag ne bouge pas'],
        wrong: [
          '`c5`, le dernier commit',
          '`c4`, un commit plus loin',
          'Aucun : le commit le supprime',
          '`c3` et `c5`, les deux à la fois',
        ],
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
      {
        ask: [
          'Ton équipe fait du trunk-based et une fonctionnalité prendra deux semaines. Comment fais-tu ?',
          'En trunk-based, une fonctionnalité de deux semaines se fait…',
        ],
        right: [
          'Par petits morceaux sur main, désactivée par un flag',
          'Fusionnée chaque jour dans main, cachée derrière un flag',
        ],
        wrong: [
          'Sur sa propre branche, fusionnée à la fin',
          "Sur develop, jusqu'à la prochaine release",
          'Dans un fork à part que personne ne voit',
          "Sans aucun commit tant qu'elle n'est pas finie",
        ],
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
