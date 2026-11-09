/** Curso de git en francés: mundos 0 y 1 (`../basics.ts`), por id del nivel. */

import type { LevelText } from '../en/types.js'

export const BASICS_FR: Readonly<Record<string, LevelText>> = {
  'w0-commit': {
    title: 'Ton premier commit',
    goal: 'Le Makefile est déjà préparé : enregistre-le dans un commit.',
    theory: {
      what: 'Un commit enregistre une photo de ce que tu as préparé, avec un message. Chaque commit pointe vers le précédent : c’est ainsi que se construit l’historique.',
      how: [
        'git status                          # Makefile, préparé',
        'git commit -m "Añade el Makefile"   # un nouveau cercle sur main',
        'git log --oneline                   # l’historique, le dernier en haut',
      ],
      when: 'Chaque fois que tu termines un petit changement qui a du sens tout seul : une fonction, une correction, un test.',
      whenNot:
        'Un commit géant de « changements divers » est illisible ensuite : mieux vaut plusieurs petits, un par changement.',
      looks: 'Un nouveau cercle au-dessus du précédent, et main avance jusqu’à lui.',
      problems:
        'Faire un commit sans rien de préparé : git répond « nothing to commit, working tree clean » et n’enregistre rien. Il faut d’abord un changement préparé.',
    },
  },
  'w0-add': {
    title: 'L’index : git add',
    goal: 'Crée hola.c avec le texte « int main(void) » et enregistre-le dans un commit.',
    theory: {
      what: 'Entre tes fichiers et le commit, il y a l’index. git add choisit quels changements entrent dans le prochain commit ; ce que tu n’ajoutes pas reste dehors.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status                    # hola.c, dans « Untracked files »',
        'git add hola.c                # dans l’index',
        'git commit -m "Añade hola.c"',
      ],
      when: 'Après avoir touché plusieurs choses, pour faire des commits propres : un par changement.',
      whenNot:
        'git add . ajoute tout d’un coup, même ce que tu ne voulais pas (binaires, .o, clés). Regarde git status avant.',
      looks: 'L’index ne se dessine pas : c’est ce qui ira dans le prochain cercle.',
      problems:
        'Oublier le add : git commit répond « nothing added to commit but untracked files present » et n’enregistre rien. Fais git add hola.c et recommence le commit.',
    },
  },
  'w0-status': {
    title: 'Regarder avant d’enregistrer',
    goal: 'Deux fichiers ont changé : enregistre seulement libft.h dans un commit (pas main.c).',
    theory: {
      what: 'git status te dit sur quelle branche tu es, ce qui est préparé pour le commit et ce qui ne l’est pas.',
      how: [
        'git status                  # libft.h et main.c, « not staged »',
        'git add libft.h',
        'git status                  # libft.h, « to be committed »',
        'git commit -m "Prototipos"',
      ],
      when: 'Avant chaque add et chaque commit : c’est gratuit et ça évite les frayeurs.',
      whenNot:
        'git status ne montre pas l’historique : les commits déjà faits se voient avec git log --oneline.',
      looks: 'Seul libft.h entre dans le commit ; main.c reste modifié dans ton dossier.',
      problems:
        'git add . sans regarder : git status met libft.h et main.c sous « Changes to be committed » et le commit prendrait les deux. Ajoute par nom : git add libft.h.',
    },
  },
  'w0-world': {
    title: 'Racine : l’historique',
    goal: 'Trois commits : le premier crée notas.txt avec « a », le deuxième y ajoute une ligne « b » et le troisième ajoute todo.txt avec « c ».',
    theory: {
      what: 'Révision : add prépare, commit enregistre et la branche avance. git commit -am prépare et enregistre d’un coup ce que git suit déjà.',
      how: [
        'echo a > notas.txt',
        'git add notas.txt            # nouveau : il faut add',
        'git commit -m "notas"',
        'echo b >> notas.txt',
        'git commit -am "más notas"   # déjà suivi : -a suffit',
      ],
      when: 'Pour des changements dans des fichiers déjà dans l’historique, sans taper add à chaque fois.',
      whenNot:
        'Pour n’enregistrer qu’un changement parmi plusieurs, -a ne convient pas : il prépare tout. Utilise git add avec son nom.',
      looks: 'Trois cercles à la suite sur main.',
      problems:
        'Utiliser -a avec un nouveau fichier : git commit -am répond « nothing added to commit but untracked files present ». -a n’ajoute pas les nouveaux fichiers : fais d’abord git add.',
    },
  },
  'w1-branch': {
    title: 'Créer une branche',
    goal: 'Crée la branche feature, passe dessus et fais-y un commit (avec un nouveau fichier).',
    theory: {
      what: 'Une branche est un nom qui pointe vers un commit. La créer ne copie rien : elle sert à travailler sans toucher à main.',
      how: [
        'git branch feature          # la crée ; tu restes sur main',
        'git switch feature          # tu passes dessus',
        'git switch -c otra          # créer et y passer d’un coup',
      ],
      when: 'Pour chaque nouveauté : une fonctionnalité, une correction, une expérience.',
      whenNot:
        'Une branche qui vit des mois sans être fusionnée s’éloigne de main : la fusionner ensuite coûte beaucoup plus.',
      looks:
        'Une nouvelle étiquette sur le même cercle ; avec un commit dessus, elle se sépare de main.',
      problems:
        'Faire un commit après git branch sans changer de branche : il va sur main, et git status le dit : « On branch main ». Utilise git switch avant.',
    },
  },
  'w1-head': {
    title: 'HEAD : là où tu es',
    goal: 'Reviens sur main et fais un commit : main et feature divergent.',
    theory: {
      what: 'HEAD indique où tu es : il pointe vers une branche, et la branche vers un commit. Quand tu fais un commit, la branche de HEAD avance.',
      how: [
        'git switch main             # HEAD passe sur main',
        'git commit -m "arreglo"     # main avance, pas feature',
        'git log --oneline --all     # les deux branches',
      ],
      when: 'Pour changer de branche et travailler sur autre chose sans mélanger.',
      whenNot:
        'git log --oneline ne montre que l’historique de là où tu es ; avec --all, tu vois aussi les autres branches.',
      looks: 'Deux chemins qui partent du même commit : l’historique se divise.',
      problems:
        'Changer de branche avec des changements non commités : git switch les emporte (il affiche un « M » devant le fichier) et ils finiraient dans le commit de l’autre branche. Fais un commit avant de changer.',
    },
  },
  'w1-ff': {
    title: 'Fusionner : avance rapide',
    goal: 'Fusionne feature dans main sans créer de nouveau commit (fast-forward).',
    theory: {
      what: 'Si main n’a pas avancé depuis que tu as créé feature, la fusionner fait juste avancer main : c’est une avance rapide (fast-forward), sans nouveau commit.',
      how: ['git switch main', 'git merge feature           # « Fast-forward »'],
      when: 'Quand personne n’a touché à main pendant que tu travaillais sur ta branche.',
      whenNot:
        'Pour garder la trace de la branche, git merge --no-ff crée un commit de merge même si l’avance rapide était possible.',
      looks: 'L’étiquette main saute jusqu’à feature. Aucun nouveau cercle n’apparaît.',
      problems:
        'Fusionner à l’envers, depuis feature : git merge main dit « Already up to date. » et main ne bouge pas. Passe sur main et fusionne feature.',
    },
  },
  'w1-merge': {
    title: 'Fusionner : merge à trois voies',
    goal: 'main et feature ont toutes les deux avancé : fusionne-les dans main avec un commit de merge.',
    theory: {
      what: 'Si les deux branches ont de nouveaux commits, git réunit leurs changements depuis l’ancêtre commun dans un commit de merge à deux parents.',
      how: [
        'git switch main',
        "git merge feature           # « Merge made by the 'ort' strategy. »",
        "git log --oneline           # « Merge branch 'feature' », en haut",
      ],
      when: 'Pour ramener dans main le travail terminé d’une branche.',
      whenNot:
        'Si les deux branches changent la même ligne, il y a un conflit : tu le verras dans le monde 4.',
      looks: 'Un nouveau cercle avec deux flèches : une vers chaque branche.',
      problems:
        "Fusionner depuis la mauvaise branche : sur feature, git merge main laisse « (HEAD -> feature) Merge branch 'main' into feature » dans le log et main intacte. Passe d’abord sur main.",
    },
  },
  'w1-delete': {
    title: 'Révision : branche, merge et ménage',
    goal: 'Crée fix depuis main, fais un commit, fusionne-la dans main et supprime fix.',
    theory: {
      what: 'Une branche déjà fusionnée ne sert plus : on la supprime et son travail reste dans main. git branch -d ne supprime pas une branche non fusionnée.',
      how: [
        'git switch -c fix',
        'git commit -m "arreglo"',
        'git switch main',
        'git merge fix',
        'git branch -d fix           # « Deleted branch fix »',
      ],
      when: 'À la fin de chaque branche : ainsi, la liste des branches montre ce qui est vivant.',
      whenNot: 'git branch -D supprime même sans fusion : ses commits restent sans branche.',
      looks: 'L’étiquette fix disparaît ; les cercles sont toujours là, dans main.',
      problems:
        "Supprimer avant de fusionner : git branch -d fix répond « error: The branch 'fix' is not fully merged. ». Fusionne d’abord.",
    },
  },
  'w1-world': {
    title: 'Branches : deux à la fois',
    goal: 'Deux branches, a et b, partent de main avec un commit chacune ; fusionne-les toutes les deux dans main (d’abord a, puis b).',
    theory: {
      what: 'Révision : plusieurs branches en parallèle, chacune avec son travail, et main qui les fusionne une à une.',
      how: [
        'git switch -c a',
        'git commit -m "a1"',
        'git switch main             # reviens avant de créer b',
        'git merge a                 # avance rapide',
        'git merge b                 # merge à deux parents',
      ],
      when: 'Le cas normal en équipe : chacun sur sa branche, et main qui récupère.',
      whenNot:
        'L’ordre compte : la première branche fusionnée avance rapidement ; la seconde demande un merge.',
      looks: 'main avance rapidement avec a puis fait un merge avec b.',
      problems:
        'Créer b sans revenir sur main : b part de a et emporte a1 ; git log --oneline b le montre. Reviens sur main avant git switch -c b.',
    },
  },
}
