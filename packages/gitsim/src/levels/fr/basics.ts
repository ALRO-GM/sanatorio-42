/** Curso de git en francés: mundos 0 y 1 (`../basics.ts`), por id del nivel. */

import type { LevelText } from '../en/types.js'

export const BASICS_FR: Readonly<Record<string, LevelText>> = {
  'w0-commit': {
    title: 'Ton premier commit',
    goal: 'Fais deux commits sur main.',
    theory: {
      what: 'Un commit est une photo de tes fichiers à un instant donné, avec un message. Chaque commit pointe vers le précédent : c’est comme ça que se construit l’historique.',
      how: ['git commit -m "Ajoute le Makefile"', 'git log --oneline'],
      when: 'Chaque fois que tu termines un petit changement qui a du sens tout seul : une fonction, une correction, un test.',
      whenNot:
        'Avec du code à moitié fini qui ne compile pas, si tu vas le partager : tu casses le travail des autres.',
      looks: 'Un nouveau cercle au-dessus du précédent, et la branche (main) avance jusqu’à lui.',
      problems:
        'Des commits géants intitulés « changements divers » : plus tard, personne (pas même toi) ne sait ce que chacun a fait.',
    },
  },
  'w0-add': {
    title: 'L’index : git add',
    goal: 'Crée hola.c avec le texte « int main(void) » et enregistre-le dans un commit.',
    theory: {
      what: 'Entre tes fichiers et le commit, il y a l’index (la staging area) : git add choisit quels changements entrent dans le prochain commit.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status',
        'git add hola.c',
        'git commit -m "Ajoute hola.c"',
      ],
      when: 'Toujours avant un commit. Avec add, tu peux faire plusieurs commits propres à partir des changements d’une même session de travail.',
      whenNot: 'git add . sans regarder : tu finis par committer des binaires, des .o ou des clés.',
      looks: 'L’index ne se voit pas dans l’arbre : c’est ce qui ira dans le prochain cercle.',
      problems: 'Oublier le add : le commit part sans tes changements (git status te le dit).',
    },
  },
  'w0-status': {
    title: 'Regarder avant d’enregistrer',
    goal: 'Deux fichiers ont changé : enregistre seulement libft.h dans un commit (pas main.c).',
    theory: {
      what: 'git status te dit sur quelle branche tu es, ce qui est indexé et ce qui ne l’est pas. git log affiche l’historique.',
      how: ['git status', 'git add libft.h', 'git commit -m "Prototypes"', 'git log --oneline'],
      when: 'Avant chaque add et chaque commit : ça ne coûte rien et ça évite les mauvaises surprises.',
      looks:
        'Seul libft.h entre dans le commit ; main.c reste modifié dans ton répertoire de travail.',
    },
  },
  'w0-world': {
    title: 'Racine : l’historique',
    goal: 'Trois commits : le premier crée notas.txt avec « a », le deuxième y ajoute une ligne « b » et le troisième ajoute todo.txt avec « c ».',
    theory: {
      what: 'Révision du monde : chaque commit enregistre une photo de ce que tu as indexé avec add, et la branche avance à chaque fois.',
      how: [
        'echo a > notas.txt',
        'git add notas.txt',
        'git commit -m "notes"',
        'echo b >> notas.txt',
        'git commit -am "encore des notes"',
      ],
      when: 'À partir d’ici, tout le reste se construit sur des commits.',
      looks: 'Trois cercles à la suite sur main.',
    },
  },
  'w1-branch': {
    title: 'Créer une branche',
    goal: 'Crée la branche feature, passe dessus et fais-y un commit.',
    theory: {
      what: 'Une branche, c’est juste un nom qui pointe vers un commit. En créer une ne coûte rien : ça sert à travailler sur quelque chose sans toucher à main.',
      how: [
        'git branch feature',
        'git switch feature',
        'git switch -c otra   # crée la branche et passe dessus',
      ],
      when: 'Pour chaque nouveauté : une fonctionnalité, une correction, une expérience.',
      whenNot:
        'Des branches qui vivent des mois sans être fusionnées : ensuite, le merge est un enfer.',
      looks:
        'Une nouvelle étiquette sur le même cercle ; quand tu fais un commit dessus, elle se sépare de main.',
      problems:
        'Faire un commit sans vérifier sur quelle branche tu es (git status te le dit, le prompt aussi).',
    },
  },
  'w1-head': {
    title: 'HEAD : là où tu es',
    goal: 'Reviens sur main et fais un commit : main et feature divergent.',
    theory: {
      what: 'HEAD, c’est là où tu es : en général, il pointe vers une branche, et la branche vers un commit. Quand tu fais un commit, c’est la branche pointée par HEAD qui avance.',
      how: ['git switch main', 'git log --oneline --all'],
      when: 'Tu changes de branche pour travailler sur autre chose sans tout mélanger.',
      looks: 'Deux chemins qui partent du même commit : l’historique bifurque.',
      problems:
        'Changer de branche avec des changements non enregistrés : git refuse (ou les emporte avec toi). Fais d’abord un commit ou un stash.',
    },
  },
  'w1-ff': {
    title: 'Fusionner : avance rapide',
    goal: 'Fusionne feature dans main sans créer de nouveau commit (fast-forward).',
    theory: {
      what: 'Si main n’a pas bougé depuis la création de ta branche, fusionner (merge) feature fait juste avancer main : c’est une avance rapide (fast-forward).',
      how: ['git switch main', 'git merge feature'],
      when: 'Quand personne n’a touché à main pendant que tu travaillais.',
      whenNot:
        'Si tu veux garder une trace de l’existence de la branche : git merge --no-ff crée quand même le commit de merge.',
      looks: 'L’étiquette main saute jusqu’à feature. Aucun nouveau cercle n’apparaît.',
    },
  },
  'w1-merge': {
    title: 'Fusionner : merge à trois voies',
    goal: 'main et feature ont toutes les deux avancé : fusionne-les dans main avec un commit de merge.',
    theory: {
      what: 'Si les deux branches ont de nouveaux commits, git combine leurs changements (depuis leur ancêtre commun) dans un commit de merge qui a deux parents.',
      how: ['git switch main', 'git merge feature'],
      when: 'Pour ramener dans main le travail terminé d’une branche.',
      whenNot:
        'Si les deux branches ont modifié la même chose de façon différente, il y aura un conflit : ce n’est pas grave, mais il faut le résoudre à tête reposée.',
      looks: 'Un nouveau cercle avec deux flèches : une vers chaque branche.',
      problems:
        'Faire un merge de main dans ta branche toutes les cinq minutes encombre l’historique.',
    },
  },
  'w1-delete': {
    title: 'Révision : branche, merge et ménage',
    goal: 'Crée fix depuis main, fais un commit, fusionne-la dans main et supprime fix.',
    theory: {
      what: 'Une branche déjà fusionnée ne sert plus à rien : supprime-la (le travail reste dans main). git branch -d refuse de supprimer une branche non fusionnée.',
      how: [
        'git switch -c fix',
        'git commit -m "correction"',
        'git switch main',
        'git merge fix',
        'git branch -d fix',
      ],
      when: 'À la fin de chaque branche : comme ça, la liste des branches montre ce qui est encore en cours.',
      whenNot:
        'git branch -D (majuscule) supprime même si la branche n’est pas fusionnée : le travail est perdu (ou presque).',
      looks: 'L’étiquette fix disparaît ; les cercles sont toujours là, dans main.',
    },
  },
  'w1-world': {
    title: 'Branches : deux à la fois',
    goal: 'Deux branches, a et b, partent de main avec un commit chacune ; fusionne-les toutes les deux dans main (d’abord a, puis b).',
    theory: {
      what: 'Révision du monde : plusieurs branches en parallèle, chacune avec son travail, et main qui les fusionne une par une.',
      how: [
        'git switch -c a',
        'git commit',
        'git switch main',
        'git switch -c b',
        'git commit',
        'git switch main',
        'git merge a',
        'git merge b',
      ],
      when: 'Le quotidien d’une équipe : chaque personne sur sa branche, et main qui rassemble le travail.',
      looks: 'main avance rapidement avec a, puis fait un merge avec b.',
    },
  },
}
