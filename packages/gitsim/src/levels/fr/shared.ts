/** Curso de git en francés: mundos 2 a 5 (`../shared.ts`), por id del nivel. */

import type { LevelText } from '../en/types.js'

export const SHARED_FR: Readonly<Record<string, LevelText>> = {
  'w2-clone': {
    title: 'Cloner et pousser',
    goal: 'Clone origin, fais un commit sur main et pousse-le.',
    theory: {
      what: 'Un dépôt distant (origin) est une autre copie du dépôt, en général sur GitHub ou sur le GitLab de 42. clone le copie en entier ; push envoie tes commits.',
      how: ['git clone', 'git commit -m "ma partie"', 'git push'],
      when: 'clone une seule fois, au début ; push quand ton travail est prêt à être vu par les autres.',
      whenNot: 'Pousser du code qui ne compile pas sur une branche que d’autres utilisent.',
      looks:
        'origin/main apparaît : c’est la position de main sur origin la dernière fois que tu as communiqué avec lui.',
      problems:
        'Oublier le push : ton travail n’existe que sur ton ordinateur (et à 42, les postes sont effacés).',
    },
  },
  'w2-fetch': {
    title: 'Récupérer sans fusionner : fetch',
    goal: 'Une personne de ton équipe a poussé deux commits : récupère-les avec fetch et amène main jusqu’à origin/main.',
    theory: {
      what: 'fetch télécharge les nouveautés d’origin et déplace origin/main, mais ne touche pas à tes branches. Ensuite, c’est toi qui décides comment les intégrer.',
      how: ['git fetch', 'git log --oneline --all', 'git merge origin/main'],
      when: 'Pour voir ce que les autres ont fait avant de le mélanger avec ton travail.',
      looks: 'origin/main avance ; main reste où elle était jusqu’à ce que tu fusionnes.',
    },
  },
  'w2-pull': {
    title: 'pull : fetch et merge',
    goal: 'Une personne de ton équipe et toi avez fait un commit en même temps : récupère le sien avec pull et pousse le résultat.',
    theory: {
      what: 'pull, c’est fetch plus merge d’un seul coup. Si chaque côté a de nouveaux commits, il crée un commit de merge.',
      how: ['git pull', 'git push'],
      when: 'Avant de commencer à travailler et avant de pousser.',
      whenNot:
        'Si tu ne veux pas de commit de merge à chaque pull, utilise git pull --rebase (tu le verras bientôt).',
      looks: 'Un commit de merge qui relie ta branche main à origin/main.',
      problems:
        'Push refusé (« origin a des commits que tu n’as pas ») : c’est le signal qu’il faut faire un pull.',
    },
  },
  'w2-branch': {
    title: 'Pousser ta branche',
    goal: 'main est protégée sur origin : crée la branche login, fais deux commits et pousse-la sur origin.',
    theory: {
      what: 'Tu peux pousser n’importe quelle branche : git push origin branche. En équipe, main est souvent protégée et on y entre par une pull request.',
      how: ['git switch -c login', 'git commit -m "formulaire"', 'git push origin login'],
      when: 'Dès que tu travailles en équipe : ta branche sur origin, c’est ta sauvegarde et ce que les autres relisent.',
      looks: 'origin/login apparaît à côté de ta branche login.',
      problems:
        'Pousser directement sur main alors que l’équipe attend des relectures : le dépôt distant refuse.',
    },
  },
  'w2-world': {
    title: 'Dépôts distants : push refusé',
    goal: 'Ton push est refusé : place ton commit au-dessus du sien avec pull --rebase (sans commit de merge) et pousse-le.',
    theory: {
      what: 'pull --rebase récupère ce qu’il y a sur origin et replace tes commits par-dessus, comme si tu les avais faits après : l’historique reste linéaire.',
      how: ['git push   # refusé', 'git pull --rebase', 'git push'],
      when: 'Quand personne n’a encore vu tes commits : l’historique est plus propre qu’avec un merge.',
      whenNot: 'Avec des commits déjà sur origin : le rebase change leurs identifiants.',
      looks:
        'Ton commit disparaît de là où il était et une copie (marquée d’une apostrophe) apparaît au-dessus du sien.',
    },
  },
  'w3-relative': {
    title: 'Se déplacer : ~ et ^',
    goal: 'Recule de deux commits depuis main sans utiliser leur identifiant (HEAD se retrouve détachée).',
    theory: {
      what: 'HEAD~2 veut dire « deux commits avant HEAD » ; main^ est le parent de main. Comme ça, pas besoin de copier des identifiants.',
      how: ['git checkout HEAD~2', 'git checkout main^', 'git switch main   # revenir'],
      when: 'Pour voir à quoi ressemblait le code il y a quelques commits, ou pour donner un point de départ à reset ou rebase.',
      looks:
        'HEAD se détache de la branche et pointe directement vers un commit (HEAD détachée, ou detached HEAD).',
      problems:
        'Faire des commits avec HEAD détachée : ils ne sont sur aucune branche et se perdent quand tu changes de branche. Crée d’abord une branche.',
    },
  },
  'w3-amend': {
    title: 'Refaire le dernier : --amend',
    goal: 'Le message du dernier commit est faux : refais-le avec le message « Arregla el parser », en espagnol et tel quel.',
    theory: {
      what: 'commit --amend modifie le dernier commit (message ou fichiers). En réalité, il en crée un nouveau et laisse l’ancien sans branche.',
      how: [
        'git commit --amend -m "Arregla el parser"',
        'git add olvidado.c',
        'git commit --amend',
      ],
      when: 'Juste après un commit avec une erreur bête, avant de le pousser.',
      whenNot: 'Si tu l’as déjà poussé : les autres ont l’ancien et tu devras forcer le push.',
      looks: 'Le dernier cercle est remplacé par une copie (marquée d’une apostrophe).',
    },
  },
  'w3-cherry': {
    title: 'En prendre un seul : cherry-pick',
    goal: 'De la branche exp, tu ne veux que le commit qui crée b.txt : copie-le sur main.',
    theory: {
      what: 'cherry-pick copie un commit précis (ses changements) au-dessus de là où tu es.',
      how: ['git log --oneline exp', 'git cherry-pick exp~1'],
      when: 'Pour récupérer une correction isolée d’une autre branche sans ramener tout le reste.',
      whenNot: 'Pour déplacer des branches entières : ça, c’est le rôle de rebase ou de merge.',
      looks:
        'Une copie du commit (marquée d’une apostrophe) apparaît au-dessus de main ; l’original reste sur sa branche.',
      problems:
        'Le même changement apparaît deux fois dans l’historique, avec des identifiants différents : si tu fusionnes la branche plus tard, ça peut provoquer des conflits.',
    },
  },
  'w3-rebase': {
    title: 'Déplacer une branche : rebase',
    goal: 'Place les commits de feature au-dessus de main, sans commit de merge.',
    theory: {
      what: 'rebase prend les commits de ta branche qui ne sont pas dans l’autre et les recopie par-dessus. L’historique reste linéaire.',
      how: ['git switch feature', 'git rebase main'],
      when: 'Pour mettre ta branche à jour avant de la fusionner, si personne d’autre ne l’utilise.',
      whenNot:
        'Sur des branches partagées avec d’autres : leurs commits cessent d’exister et l’historique des autres est cassé.',
      looks:
        'Les cercles de feature s’en vont et des copies (marquées d’une apostrophe) apparaissent au-dessus de main.',
      problems: 'Des conflits sur chaque commit recopié, un par un.',
    },
  },
  'w3-world': {
    title: 'Réécrire : un historique linéaire',
    goal: 'Place bugfix au-dessus de main avec rebase, puis amène main jusqu’à bugfix (avance rapide). Termine sur main.',
    theory: {
      what: 'Révision du monde : rebase suivi d’un merge en avance rapide garde l’historique linéaire, sans commit de merge.',
      how: ['git switch bugfix', 'git rebase main', 'git switch main', 'git merge bugfix'],
      when: 'Les équipes qui préfèrent un historique linéaire (beaucoup de projets open source).',
      looks: 'Une seule ligne de cercles, avec les copies de bugfix à la fin.',
    },
  },
  'w4-reset': {
    title: 'Revenir en arrière : reset',
    goal: 'Les deux derniers commits sont en trop (ils n’ont pas été poussés) : ramène main deux commits en arrière.',
    theory: {
      what: 'reset déplace la branche vers un autre commit. --soft garde les changements indexés, le mode normal (--mixed) les garde sans les indexer et --hard les supprime.',
      how: ['git reset HEAD~2', 'git reset --soft HEAD~1', 'git reset --hard HEAD~2'],
      when: 'Pour annuler des commits que personne d’autre n’a.',
      whenNot:
        'Pour des commits déjà présents sur origin : utilise revert. Et --hard sans réfléchir : ce qu’il supprime ne revient pas.',
      looks: 'L’étiquette main recule ; les cercles qui étaient devant se retrouvent sans branche.',
    },
  },
  'w4-revert': {
    title: 'Annuler en public : revert',
    goal: 'Quelqu’un a poussé secreto.txt sur origin : annule-le avec un nouveau commit et pousse-le (sans forcer).',
    theory: {
      what: 'revert crée un nouveau commit qui fait l’inverse d’un autre. L’historique n’est pas réécrit : on ne fait qu’y ajouter.',
      how: ['git revert HEAD', 'git push'],
      when: 'Pour annuler quelque chose qui est déjà sur origin et que d’autres personnes ont récupéré.',
      looks: 'Un nouveau cercle à la fin ; le mauvais commit reste dans l’historique.',
      problems:
        'Si tu avais poussé une clé, revert ne suffit pas : elle reste dans l’historique. Il faut changer la clé.',
    },
  },
  'w4-stash': {
    title: 'Mettre de côté : stash',
    goal: 'Tu as du travail en cours sur main et on te demande une correction : mets tes changements de côté, fais un commit sur fix, reviens et committe ce que tu avais.',
    theory: {
      what: 'stash range tes changements non committés sur une pile et laisse le répertoire propre. stash pop les ramène.',
      how: ['git stash', 'git switch fix', 'git switch main', 'git stash pop'],
      when: 'Pour changer de branche un instant sans faire un commit à moitié fini.',
      whenNot:
        'Comme rangement à long terme : au bout d’une semaine, plus personne ne se souvient de ce que contenait chaque stash.',
      looks: 'Rien dans l’arbre : le stash n’est pas une branche.',
    },
  },
  'w4-conflict': {
    title: 'Conflits',
    goal: 'Fusionne la branche rama dans main ; résous le conflit dans f.c en ne gardant que la ligne « los dos », telle quelle.',
    theory: {
      what: 'Si les deux branches modifient la même ligne, git ne sait pas laquelle garder : il marque le fichier avec <<<<<<< ======= >>>>>>> et attend que tu corriges.',
      how: [
        'git merge rama',
        'cat f.c',
        'echo "los dos" > f.c',
        'git add f.c',
        'git commit -m "Merge rama"',
      ],
      when: 'Tu ne le choisis pas : ça arrive tout seul. Ce que tu choisis, c’est de le résoudre à tête reposée (ou git merge --abort).',
      looks: 'Un commit de merge normal, une fois que tu as terminé.',
      problems:
        'Laisser les marqueurs <<<<<<< dans le fichier et committer : ça ne compilera pas (et ça se verra).',
    },
  },
  'w4-world': {
    title: 'Annuler : regrouper des commits',
    goal: 'Regroupe les trois derniers commits en un seul, sans perdre aucun fichier.',
    theory: {
      what: 'Révision du monde : reset --soft ramène la branche en arrière mais garde tout indexé ; un seul commit enregistre le tout d’un coup.',
      how: ['git reset --soft HEAD~3', 'git commit -m "Tout ensemble"'],
      when: 'Avant de pousser une branche avec des commits comme « test », « autre test », « là ça marche ».',
      looks: 'Trois cercles sont remplacés par un seul.',
    },
  },
  'w5-github-flow': {
    title: 'GitHub flow',
    goal: 'main est protégée : récupère les derniers changements, crée la branche api depuis main, fais deux commits et pousse-la pour la pull request.',
    theory: {
      what: 'GitHub flow : main fonctionne toujours ; chaque changement passe par une branche courte qu’on pousse, qu’on relit dans une pull request et qu’on fusionne.',
      how: ['git pull', 'git switch -c api', 'git commit -m "..."', 'git push origin api'],
      when: 'Presque toujours : petites équipes et projets déployés souvent (comme ceux de 42).',
      whenNot:
        'Si tu maintiens plusieurs versions en même temps (la 1.x et la 2.x) : Gitflow est plus adapté.',
      looks: 'Des branches courtes qui partent de main et y reviennent.',
    },
  },
  'w5-tag': {
    title: 'Versions : tag',
    goal: 'Marque main comme v1.0 et le commit précédent comme v0.9.',
    theory: {
      what: 'Un tag est un nom fixe pour un commit : une version. Contrairement à une branche, il ne bouge pas.',
      how: ['git tag v1.0', 'git tag v0.9 HEAD~1', 'git push --tags'],
      when: 'Chaque fois que tu rends ou publies une version.',
      looks: 'Une étiquette collée à un cercle pour toujours.',
      problems: 'Déplacer un tag déjà publié : les autres ont toujours l’ancien.',
    },
  },
  'w5-release': {
    title: 'Gitflow : release',
    goal: 'Crée release/1.0 depuis develop, fais un commit, fusionne-la avec --no-ff dans main et dans develop, et marque main comme v1.0.',
    theory: {
      what: 'Gitflow : develop rassemble le travail ; pour publier, on crée une branche release, on la peaufine, puis on la fusionne dans main (avec un tag) et de nouveau dans develop. Avec --no-ff, chaque fusion laisse son commit de merge, même si une avance rapide était possible.',
      how: [
        'git switch -c release/1.0 develop',
        'git switch main',
        'git merge --no-ff release/1.0',
        'git tag v1.0',
        'git switch develop',
        'git merge --no-ff release/1.0',
      ],
      when: 'Les logiciels avec des versions numérotées et des dates de livraison.',
      whenNot:
        'Les sites déployés tous les jours : beaucoup trop de branches pour ce que ça apporte.',
      looks:
        'Deux branches permanentes (main et develop) et des branches release qui vont de l’une à l’autre.',
    },
  },
  'w5-hotfix': {
    title: 'Gitflow : hotfix',
    goal: 'Il y a un bug dans la v1.0 : crée hotfix depuis main, corrige-le, fusionne-la avec --no-ff dans main (v1.0.1) et dans develop.',
    theory: {
      what: 'Un hotfix part de main (ce qui est publié), pas de develop (qui contient du travail en cours). On le fusionne aux deux endroits pour que la correction ne se perde pas.',
      how: [
        'git switch -c hotfix main',
        'git commit -m "correction"',
        'git switch main',
        'git merge --no-ff hotfix',
        'git tag v1.0.1',
        'git switch develop',
        'git merge hotfix',
      ],
      when: 'Les bugs graves dans ce qui est publié, qui ne peuvent pas attendre la prochaine version.',
      looks: 'Une branche courte qui part de main et revient dans main et dans develop.',
      problems: 'Oublier de la fusionner dans develop : la version suivante a de nouveau le bug.',
    },
  },
  'w5-world': {
    title: 'Workflows : trunk-based',
    goal: 'Travaille sur le tronc : crée une branche courte, mini, avec un commit ; mets-la à jour avec ce qu’il y a sur origin, fusionne-la dans main de façon linéaire, pousse-la et supprime mini.',
    theory: {
      what: 'Trunk-based : tout le monde fusionne dans main plusieurs fois par jour, avec des branches qui vivent quelques heures. Il faut des tests automatisés pour protéger main.',
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
      when: 'Les équipes avec une CI solide qui déploient en continu.',
      whenNot: 'Sans tests automatisés : chaque merge peut casser main.',
      looks: 'Une seule ligne sur main, sans merge.',
    },
  },
}
