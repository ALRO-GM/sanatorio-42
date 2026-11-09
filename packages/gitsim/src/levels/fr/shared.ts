/** Curso de git en francés: mundos 2 a 5 (`../shared.ts`), por id del nivel. */

import type { LevelText } from '../en/types.js'

export const SHARED_FR: Readonly<Record<string, LevelText>> = {
  'w2-clone': {
    title: 'Cloner et pousser',
    goal: 'Clone origin, fais un commit sur main et pousse-le.',
    theory: {
      what: 'origin est une autre copie du dépôt, sur GitHub ou le GitLab de 42. clone la copie en entier ; push envoie tes commits.',
      how: [
        'git clone',
        'git commit -m "mi parte"',
        'git push                    # « main -> main »',
      ],
      when: 'clone, une fois au début ; push, quand ton travail est prêt.',
      whenNot: 'Ne pousse pas sur une branche partagée du code qui ne compile pas.',
      looks: 'origin/main apparaît : là où était main sur origin la dernière fois.',
      problems:
        "Oublier le push : git status dit « Your branch is ahead of 'origin/main' by 1 commit. » et ton commit n’existe qu’ici.",
    },
  },
  'w2-fetch': {
    title: 'Récupérer sans fusionner : fetch',
    goal: 'Une personne de ton équipe a poussé deux commits : récupère-les avec fetch et amène main jusqu’à origin/main.',
    theory: {
      what: 'git fetch télécharge les nouveautés d’origin et déplace origin/main, sans toucher à tes branches.',
      how: ['git fetch                   # « main -> origin/main »', 'git merge origin/main'],
      when: 'Pour voir ce que les autres ont poussé avant de le mélanger avec ton travail.',
      whenNot: 'clone se fait une fois ; fetch, chaque fois que tu veux les nouveautés.',
      looks: 'origin/main avance ; main ne bouge pas tant que tu ne fusionnes pas.',
      problems:
        "Croire que fetch fusionne déjà : git status dit « Your branch is behind 'origin/main' by 2 commits ». Il manque git merge origin/main.",
    },
  },
  'w2-pull': {
    title: 'pull : fetch et merge',
    goal: 'Une personne de ton équipe et toi avez fait un commit en même temps : récupère le sien avec pull, en le joignant par un merge, et pousse le résultat.',
    theory: {
      what: 'git pull, c’est fetch plus joindre. Si vous avez avancé tous les deux, dis-lui comment : --no-rebase joint avec un commit de merge.',
      how: [
        'git push                    # refusé : « fetch first »',
        'git pull --no-rebase        # récupère le sien et fusionne',
        'git push',
      ],
      when: 'Avant de commencer à travailler et avant de pousser.',
      whenNot:
        'Pour regarder avant de fusionner, utilise git fetch. Pour ne plus répéter --no-rebase : git config pull.rebase false, une fois.',
      looks: 'Un commit de merge qui relie ta main à origin/main.',
      problems:
        'git pull tout court, avec les deux branches en avance, refuse : « fatal: Need to specify how to reconcile divergent branches. ». Choisis : --no-rebase (merge) ou --rebase.',
    },
  },
  'w2-branch': {
    title: 'Pousser ta branche',
    goal: 'main est protégée sur origin : crée la branche login, fais deux commits et pousse-la sur origin.',
    theory: {
      what: 'git push origin branche envoie n’importe quelle branche ; avec -u, elle est aussi suivie et ensuite git push suffit. En équipe, main est souvent protégée.',
      how: [
        'git switch -c login',
        'git commit -m "formulario"',
        'git push -u origin login    # « [new branch] login -> login »',
      ],
      when: 'En équipe : ta branche sur origin est ta sauvegarde et ce que les autres relisent.',
      whenNot: 'Sans protections, git push envoie main directement, sans relecture.',
      looks: 'origin/login apparaît à côté de ta branche login.',
      problems:
        'git push tout court sur une nouvelle branche refuse : « fatal: The current branch login has no upstream branch. ». Dis où : git push -u origin login.',
    },
  },
  'w2-world': {
    title: 'Dépôts distants : push refusé',
    goal: 'Ton push est refusé : place ton commit au-dessus du sien avec pull --rebase (sans commit de merge) et pousse-le.',
    theory: {
      what: 'git pull --rebase récupère origin et place tes commits au-dessus : l’historique reste en ligne.',
      how: [
        'git push                    # refusé',
        'git pull --rebase           # « Successfully rebased »',
        'git push',
      ],
      when: 'Avec des commits pas encore poussés.',
      whenNot: 'Pas avec des commits déjà poussés : le rebase change leurs identifiants.',
      looks: 'Ton commit s’en va et une copie (avec une apostrophe) apparaît au-dessus du sien.',
      problems:
        'git pull --no-rebase laisse un commit de merge dont le défi ne veut pas, et git pull tout court refuse (« Need to specify how to reconcile divergent branches »).',
    },
  },
  'w3-relative': {
    title: 'Se déplacer : ~ et ^',
    goal: 'Recule de deux commits depuis main sans utiliser leur identifiant (HEAD se retrouve détachée).',
    theory: {
      what: 'HEAD~2, c’est « deux commits avant HEAD » ; main^, le parent de main. Tu atteins un commit sans copier son identifiant.',
      how: [
        'git checkout HEAD~2         # « HEAD is now at c1 uno »',
        'git switch --detach main^   # pareil, avec switch',
        'git switch main             # tu reviens sur la branche',
      ],
      when: 'Pour regarder le code d’il y a quelques commits.',
      whenNot:
        'git switch sans --detach ne va que vers des branches : git switch HEAD~2 répond « fatal: a branch is expected ».',
      looks: 'HEAD pointe vers un commit, pas vers une branche (HEAD détachée).',
      problems:
        'Faire des commits avec HEAD détachée et revenir sur main : git prévient « you are leaving 1 commit behind ». Avant de les faire, crée une branche : git switch -c nueva.',
    },
  },
  'w3-amend': {
    title: 'Refaire le dernier : --amend',
    goal: 'Le message du dernier commit est faux : refais-le avec le message « Arregla el parser », en espagnol et tel quel.',
    theory: {
      what: 'git commit --amend refait le dernier commit : il en crée un nouveau et laisse l’ancien sans branche.',
      how: [
        'git commit --amend -m "Arregla el parser"',
        'git log --oneline           # l’ancien n’apparaît plus',
      ],
      when: 'Juste après un commit avec une erreur bête, avant de le pousser.',
      whenNot: 'Si tu l’as déjà poussé, non : les autres ont l’ancien.',
      looks: 'Le dernier cercle est remplacé par une copie (avec une apostrophe).',
      problems:
        'Faire un autre commit : sans changements git dit « nothing to commit » ; avec, git log --oneline montre les deux, « aregla el parsr » et « Arregla el parser ».',
    },
  },
  'w3-cherry': {
    title: 'En prendre un seul : cherry-pick',
    goal: 'De la branche exp, tu ne veux que le commit qui crée b.txt : copie-le sur main.',
    theory: {
      what: 'git cherry-pick copie les changements d’un commit précis au-dessus de là où tu es.',
      how: [
        'git log --oneline --all     # c3 (exp) c, c2 b, c1 a',
        'git cherry-pick exp~1       # b : le parent de la pointe',
        'ls',
      ],
      when: 'Pour récupérer une correction isolée d’une autre branche, sans le reste.',
      whenNot: 'Pour ramener une branche entière : merge ou rebase.',
      looks:
        'Une copie (avec une apostrophe) apparaît au-dessus de main ; l’original reste sur sa branche.',
      problems:
        'Prendre la pointe : git cherry-pick exp copie « c » et ls montre c.txt, pas b.txt.',
    },
  },
  'w3-rebase': {
    title: 'Déplacer une branche : rebase',
    goal: 'Place les commits de feature au-dessus de main, sans commit de merge.',
    theory: {
      what: 'git rebase copie les commits de ta branche au-dessus d’une autre : l’historique reste en ligne.',
      how: ['git switch feature', 'git rebase main             # « Successfully rebased »'],
      when: 'Pour mettre ta branche à jour avant de la fusionner, si tu es seul à l’utiliser.',
      whenNot:
        'Pas sur des branches partagées : leurs commits changent d’identifiant et l’historique des autres casse.',
      looks:
        'Les cercles de feature s’en vont et des copies (avec une apostrophe) apparaissent au-dessus de main.',
      problems:
        'Depuis main, git rebase main dit « Current branch main is up to date. » et feature ne bouge pas. Passe sur feature.',
    },
  },
  'w3-world': {
    title: 'Réécrire : un historique linéaire',
    goal: 'Place bugfix au-dessus de main avec rebase, puis amène main jusqu’à bugfix (avance rapide). Termine sur main.',
    theory: {
      what: 'Révision : un rebase puis un merge en avance rapide laissent l’historique en ligne, sans commit de merge.',
      how: [
        'git switch bugfix',
        'git rebase main',
        'git switch main',
        'git merge bugfix            # « Fast-forward »',
      ],
      when: 'Dans les équipes qui préfèrent un historique linéaire, comme beaucoup de projets open source.',
      whenNot:
        'Si l’équipe veut voir où chaque branche a été fusionnée, mieux vaut un merge normal.',
      looks: 'Une seule ligne de cercles, avec la copie de bugfix à la fin.',
      problems:
        "Fusionner sans rebase avant : git merge bugfix dit « Merge made by the 'ort' strategy. » et laisse un commit de merge.",
    },
  },
  'w4-reset': {
    title: 'Revenir en arrière : reset',
    goal: 'Les deux derniers commits sont en trop (ils n’ont pas été poussés) : ramène main deux commits en arrière.',
    theory: {
      what: 'git reset ramène la branche à un autre commit. --soft garde les changements préparés ; sans option (--mixed), non préparés ; --hard les efface.',
      how: [
        'git reset HEAD~2            # les changements restent dans ton dossier',
        'git reset --hard HEAD~2     # et les efface',
      ],
      when: 'Pour annuler des commits que toi seul as.',
      whenNot: 'Pas si c’est déjà poussé : le push est refusé.',
      looks: 'main recule ; les cercles de devant restent sans branche.',
      problems:
        '--hard dit « HEAD is now at c1 bien » et ce qu’avaient ajouté mal et peor disparaît de ton dossier : ça ne revient pas. Dans le doute, sans option.',
    },
  },
  'w4-revert': {
    title: 'Annuler en public : revert',
    goal: 'Quelqu’un a poussé secreto.txt sur origin : annule-le avec un nouveau commit et pousse-le (sans forcer).',
    theory: {
      what: 'git revert crée un commit qui fait l’inverse d’un autre. Il ne réécrit pas l’historique.',
      how: [
        'git revert HEAD             # « Revert "ups" »',
        'git push                    # sans forcer',
      ],
      when: 'Pour annuler ce qui est déjà sur origin.',
      whenNot:
        'Si tu as poussé une clé, revert ne suffit pas : elle reste dans l’historique. Change-la.',
      looks: 'Un nouveau cercle à la fin ; le mauvais reste là.',
      problems:
        'reset sur ce qui est déjà poussé : git push répond « ! [rejected] main -> main (non-fast-forward) ».',
    },
  },
  'w4-stash': {
    title: 'Mettre de côté : stash',
    goal: 'Tu as f.c en cours sur main et on te demande de le corriger sur fix, où f.c est différent : mets tes changements de côté, corrige f.c sur fix avec un commit, reviens et committe ce que tu avais.',
    theory: {
      what: 'git stash met de côté tes changements non commités et laisse le dossier propre ; git stash pop les rend.',
      how: ['git stash', 'git switch fix', 'git switch main', 'git stash pop'],
      when: 'Pour changer de branche un moment sans commit à moitié fini.',
      whenNot:
        'Si le fichier est le même sur les deux branches, git switch emporte tes changements avec toi. Et le stash n’est pas un entrepôt : ce qui dure va dans un commit.',
      looks: 'Rien dans l’arbre : le stash n’est pas une branche.',
      problems:
        'Sans mettre de côté, git switch fix refuse : « error: Your local changes to the following files would be overwritten by checkout: f.c ».',
    },
  },
  'w4-conflict': {
    title: 'Conflits',
    goal: 'Fusionne la branche rama dans main ; résous le conflit dans f.c en ne gardant que la ligne « los dos », telle quelle.',
    theory: {
      what: 'Si deux branches changent la même ligne, git marque le fichier avec <<<<<<< et >>>>>>> et attend. git add marque le fichier comme résolu.',
      how: [
        'git merge rama              # « CONFLICT (content): Merge conflict in f.c »',
        'echo "los dos" > f.c',
        'git add f.c',
        'git commit -m "Une rama"',
      ],
      when: 'Il arrive avec un merge ; c’est toi qui décides ce qui reste.',
      whenNot: 'Pas le moment ? git merge --abort remet tout comme avant.',
      looks: 'Un commit de merge normal une fois fini.',
      problems:
        'Commit sans add : « error: Committing is not possible because you have unmerged files. ». Et git add ne regarde pas les marques : enlève-les avant d’ajouter.',
    },
  },
  'w4-world': {
    title: 'Annuler : regrouper des commits',
    goal: 'Regroupe les trois derniers commits en un seul, sans perdre aucun fichier.',
    theory: {
      what: 'Révision : git reset --soft ramène la branche en arrière avec tout préparé ; un commit enregistre le tout.',
      how: ['git reset --soft HEAD~3', 'git commit -m "Todo junto"'],
      when: 'Avant de pousser une branche avec des commits « essai », « autre essai », « ça marche ».',
      whenNot: 'S’ils sont déjà sur origin, ne les regroupe pas : le push serait refusé.',
      looks: 'Trois cercles deviennent un seul.',
      problems:
        'Avec --hard, on obtient « HEAD is now at c1 base » et ls ne montre plus a.c, b.c ni c.c : ils sont perdus.',
    },
  },
  'w5-github-flow': {
    title: 'GitHub flow',
    goal: 'main est protégée : récupère les derniers changements, crée la branche api depuis main, fais deux commits et pousse-la pour la pull request.',
    theory: {
      what: 'GitHub flow : main fonctionne toujours ; chaque changement va dans une branche courte relue dans une pull request.',
      how: ['git pull', 'git switch -c api', 'git commit -m "rutas"', 'git push -u origin api'],
      when: 'Petites équipes qui déploient souvent.',
      whenNot: 'Avec plusieurs versions vivantes (1.x et 2.x), Gitflow convient mieux.',
      looks: 'Des branches courtes qui partent de main et y reviennent.',
      problems:
        'Pousser main : « remote: error: GH006: Protected branch update failed for refs/heads/main. ». Pousse ta branche et fusionne-la par une pull request.',
    },
  },
  'w5-tag': {
    title: 'Versions : tag',
    goal: 'Marque main comme v1.0 et le commit précédent comme v0.9.',
    theory: {
      what: 'Un tag est un nom fixe pour un commit, comme v1.0. Contrairement à une branche, il ne bouge pas.',
      how: [
        'git tag v1.0',
        'git tag v0.9 HEAD~1         # sur le précédent',
        'git log --oneline           # « tag: v1.0 »',
      ],
      when: 'Quand tu livres ou publies une version. Pour la publier, git push origin v1.0 (ou --tags).',
      whenNot: 'Pour ce qui avance, une branche.',
      looks: 'Une étiquette collée à un cercle pour toujours.',
      problems:
        "Répéter un nom : « fatal: tag 'v1.0' already exists ». Un tag publié ne bouge pas : sors une autre version.",
    },
  },
  'w5-release': {
    title: 'Gitflow : release',
    goal: 'Crée release/1.0 depuis develop, fais un commit, fusionne-la avec --no-ff dans main et dans develop, et marque main comme v1.0.',
    theory: {
      what: 'Gitflow : develop recueille le travail ; pour publier, une branche release est fusionnée dans main (avec un tag) et dans develop.',
      how: [
        'git switch -c release/1.0',
        'git switch main',
        'git merge --no-ff release/1.0',
        'git tag v1.0',
      ],
      when: 'Logiciels avec des versions numérotées et des dates de livraison.',
      whenNot: 'Pour des sites déployés chaque jour, GitHub flow convient mieux.',
      looks: 'Deux longues branches et une release entre elles.',
      problems: 'Sans --no-ff, on obtient « Fast-forward » et aucun commit de merge ne reste.',
    },
  },
  'w5-hotfix': {
    title: 'Gitflow : hotfix',
    goal: 'Il y a un bug dans la v1.0 : crée hotfix depuis main, corrige-le, fusionne-la dans main avec --no-ff, marque-la comme v1.0.1 et fusionne-la aussi dans develop.',
    theory: {
      what: 'Un hotfix part de main, la version publiée, pas de develop. On le fusionne dans les deux.',
      how: [
        'git switch -c hotfix        # depuis main',
        'git switch main',
        'git merge --no-ff hotfix',
        'git switch develop',
        'git merge --no-ff hotfix',
      ],
      when: 'Pour un bug grave publié et urgent.',
      whenNot: 'Si le bug n’est pas publié, corrige-le sur develop.',
      looks: 'Une branche courte de main vers main et develop.',
      problems: 'Oublier develop : là, git log --oneline n’a pas « arreglo » et le bug revient.',
    },
  },
  'w5-world': {
    title: 'Workflows : trunk-based',
    goal: 'Travaille sur le tronc : crée une branche courte, mini, avec un commit ; mets-la à jour avec ce qu’il y a sur origin, fusionne-la dans main de façon linéaire, pousse-la et supprime mini.',
    theory: {
      what: 'Trunk-based : toute l’équipe fusionne dans main plusieurs fois par jour, avec des branches de quelques heures.',
      how: [
        'git pull',
        'git switch mini',
        'git rebase main',
        'git switch main',
        'git merge mini              # avance rapide',
      ],
      when: 'Équipes avec des tests automatiques qui déploient sans arrêt.',
      whenNot: 'Pas sans tests automatiques : chaque fusion peut casser main.',
      looks: 'Une seule ligne sur main, sans merges.',
      problems:
        'Fusionner sans récupérer avant : git push répond « ! [rejected] main -> main (fetch first) ».',
    },
  },
}
