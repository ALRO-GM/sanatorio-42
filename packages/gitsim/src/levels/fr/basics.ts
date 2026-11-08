/** Curso de git en francés: mundos 0 y 1 (`../basics.ts`), por id del nivel. */

import type { LevelText } from '../en/types.js'

export const BASICS_FR: Readonly<Record<string, LevelText>> = {
  'w0-commit': {
    title: 'Ton premier commit',
    goal: 'Fais deux commits sur main.',
    theory: {
      what: 'Un commit enregistre une photo de tes fichiers avec un message. Chaque commit pointe vers le précédent : c’est ainsi que se construit l’historique.',
      how: [
        'git commit -m "Añade el Makefile"   # un nouveau cercle sur main',
        'git log --oneline                   # l’historique, le dernier en haut',
      ],
      when: 'Chaque fois que tu termines un petit changement qui a du sens tout seul : une fonction, une correction, un test.',
      whenNot:
        'Un commit géant de « changements divers » est illisible ensuite : mieux vaut plusieurs petits, un par changement.',
      looks: 'Un nouveau cercle au-dessus du précédent, et main avance jusqu’à lui.',
      problems:
        'Laisser le message vide : git commit -m "" répond « el mensaje está vacío: git commit -m "qué has hecho" » (message vide). Dis ce que fait le changement.',
    },
  },
  'w0-add': {
    title: 'L’index : git add',
    goal: 'Crée hola.c avec le texte « int main(void) » et enregistre-le dans un commit.',
    theory: {
      what: 'Entre tes fichiers et le commit, il y a l’index. git add choisit quels changements entrent dans le prochain commit ; ce que tu n’ajoutes pas reste dehors.',
      how: [
        'echo "int main(void)" > hola.c',
        'git status                    # hola.c, non préparé',
        'git add hola.c                # dans l’index',
        'git commit -m "Añade hola.c"',
      ],
      when: 'Après avoir touché plusieurs choses, pour faire des commits propres : un par changement.',
      whenNot:
        'git add . ajoute tout d’un coup, même ce que tu ne voulais pas (binaires, .o, clés). Regarde git status avant.',
      looks: 'L’index ne se dessine pas : c’est ce qui ira dans le prochain cercle.',
      problems:
        'Oublier le add : le commit part sans hola.c et git status dit encore « Cambios sin preparar: hola.c » (non préparé). Fais git add hola.c et un autre commit.',
    },
  },
  'w0-status': {
    title: 'Regarder avant d’enregistrer',
    goal: 'Deux fichiers ont changé : enregistre seulement libft.h dans un commit (pas main.c).',
    theory: {
      what: 'git status te dit sur quelle branche tu es, ce qui est préparé pour le commit et ce qui ne l’est pas.',
      how: [
        'git status                  # libft.h et main.c, non préparés',
        'git add libft.h',
        'git status                  # seul libft.h est préparé',
        'git commit -m "Prototipos"',
      ],
      when: 'Avant chaque add et chaque commit : c’est gratuit et ça évite les frayeurs.',
      whenNot:
        'git status ne montre pas l’historique : les commits déjà faits se voient avec git log --oneline.',
      looks: 'Seul libft.h entre dans le commit ; main.c reste modifié dans ton dossier.',
      problems:
        'git add . sans regarder : git status dit « Preparado para el commit: libft.h, main.c » (préparés) et le commit prendrait les deux. Ajoute par nom : git add libft.h.',
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
        'Utiliser -a avec un nouveau fichier : il ne l’ajoute pas. Le commit part sans lui et git status dit « Cambios sin preparar: notas.txt ». Fais d’abord git add.',
    },
  },
  'w1-branch': {
    title: 'Créer une branche',
    goal: 'Crée la branche feature, passe dessus et fais-y un commit.',
    theory: {
      what: 'Une branche est un nom qui pointe vers un commit. La créer ne copie rien : elle sert à travailler sans toucher à main.',
      how: [
        'git branch feature          # la crée ; tu restes sur main',
        'git switch feature          # tu passes dessus',
        'git switch -c otra          # créer et y passer d’un coup',
      ],
      when: 'Pour chaque nouveauté : une fonctionnalité, une correction, une expérience.',
      whenNot:
        'Une branche qui vit des mois sans être fusionnée s’éloigne de main : la fusionner ensuite coûte beaucoup plus.',
      looks:
        'Une nouvelle étiquette sur le même cercle ; avec un commit dessus, elle se sépare de main.',
      problems:
        'Faire un commit après git branch sans changer de branche : il va sur main, et git status le dit : « En la rama main ». Utilise git switch avant.',
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
        'git log --oneline ne montre que l’historique de là où tu es ; avec --all, tu vois aussi les autres branches.',
      looks: 'Deux chemins qui partent du même commit : l’historique se divise.',
      problems:
        'Changer de branche avec des changements non commités : le cours répond « tienes cambios sin guardar: haz commit o stash antes de cambiar de rama » (changements non enregistrés). Fais d’abord un commit.',
    },
  },
  'w1-ff': {
    title: 'Fusionner : avance rapide',
    goal: 'Fusionne feature dans main sans créer de nouveau commit (fast-forward).',
    theory: {
      what: 'Si main n’a pas avancé depuis que tu as créé feature, la fusionner fait juste avancer main : c’est une avance rapide (fast-forward), sans nouveau commit.',
      how: ['git switch main', 'git merge feature           # « Avance rápido (fast-forward) »'],
      when: 'Quand personne n’a touché à main pendant que tu travaillais sur ta branche.',
      whenNot:
        'Pour garder la trace de la branche, git merge --no-ff crée un commit de merge même si l’avance rapide était possible.',
      looks: 'L’étiquette main saute jusqu’à feature. Aucun nouveau cercle n’apparaît.',
      problems:
        'Fusionner à l’envers, depuis feature : git merge main dit « Ya está todo unido » (déjà fusionné) et main ne bouge pas. Passe sur main et fusionne feature.',
    },
  },
  'w1-merge': {
    title: 'Fusionner : merge à trois voies',
    goal: 'main et feature ont toutes les deux avancé : fusionne-les dans main avec un commit de merge.',
    theory: {
      what: 'Si les deux branches ont de nouveaux commits, git réunit leurs changements depuis l’ancêtre commun dans un commit de merge à deux parents.',
      how: [
        'git switch main',
        'git merge feature           # « Merge hecho: c4 »',
        'git log --oneline           # « Merge feature », en haut',
      ],
      when: 'Pour ramener dans main le travail terminé d’une branche.',
      whenNot:
        'Si les deux branches changent la même ligne, il y a un conflit : tu le verras dans le monde 4.',
      looks: 'Un nouveau cercle avec deux flèches : une vers chaque branche.',
      problems:
        'Fusionner depuis la mauvaise branche : sur feature, git merge main laisse « (HEAD -> feature) Merge main » dans le log et main intacte. Passe d’abord sur main.',
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
        'git branch -d fix           # « Rama fix borrada »',
      ],
      when: 'À la fin de chaque branche : ainsi, la liste des branches montre ce qui est vivant.',
      whenNot: 'git branch -D supprime même sans fusion : ses commits restent sans branche.',
      looks: 'L’étiquette fix disparaît ; les cercles sont toujours là, dans main.',
      problems:
        'Supprimer avant de fusionner : git branch -d fix répond « fix tiene commits sin unir: usa -D para borrarla igualmente » (commits non fusionnés). Fusionne d’abord.',
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
        'L’ordre compte : la première branche fusionnée avance rapidement ; la seconde demande un merge.',
      looks: 'main avance rapidement avec a puis fait un merge avec b.',
      problems:
        'Créer b sans revenir sur main : git switch -c b dit « Rama b creada en c2 », le commit de a, et b emporte a1. Reviens d’abord sur main.',
    },
  },
}
