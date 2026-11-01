/** Repaso de Not-games en francés: traducción de `../review-piscine-shell.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_SHELL_FR: Readonly<Record<string, ReviewEntry>> = {
  'pis-sh00-cat-e': {
    title: 'cat -e et la fin de ligne',
    definition:
      'cat -e montre ce qui ne se voit pas : il met un $ là où finit chaque ligne (là où se trouve le \\n) et écrit les caractères de contrôle avec ^. Ça permet de savoir si un fichier se termine par un retour à la ligne.',
    example: 'echo Z > z ; cat -e z affiche Z$ (et z occupe 2 octets).',
  },
  'pis-sh00-echo-n': {
    title: 'echo et echo -n',
    definition:
      "echo écrit ses arguments suivis d'un retour à la ligne. Avec -n, il ne met pas ce retour final. Avec >, la sortie va dans un fichier, qui est créé ou vidé.",
    example: 'echo Z > z laisse « Z\\n » (2 octets) ; echo -n Z > z ne laisse que « Z » (1 octet).',
  },
  'pis-sh00-tar': {
    title: 'Archives avec tar',
    definition:
      'tar regroupe des fichiers dans une seule archive et garde leurs droits et leurs dates. La première lettre dit quoi faire : c (créer), x (extraire) ou t (lister) ; f est suivi du nom du .tar.',
    example:
      "tar -cf exo.tar ex00 ex01 crée l'archive ; tar -tf exo.tar la liste ; tar -xf exo.tar l'extrait.",
  },
  'pis-sh00-touch-t': {
    title: 'Changer la date avec touch -t',
    definition:
      "touch crée le fichier s'il n'existe pas et, s'il existe, change sa date. Avec -t, c'est toi qui donnes la date, au format [[CC]YY]MMDDhhmm[.ss] : l'année est facultative et le mois et le jour viennent en premier.",
    example: 'touch -t 202106012342 f date f du 1er juin 2021 à 23:42.',
  },
  'pis-sh00-ls-l-line': {
    title: 'Lire une ligne de ls -l',
    definition:
      "Chaque ligne de ls -l contient, dans l'ordre : le type (- fichier, d dossier, l lien) et les droits du propriétaire, du groupe et des autres ; le nombre de liens physiques ; le propriétaire ; le groupe ; la taille en octets ; la date de modification et le nom.",
    example: '-r--r-xr-x 1 ana staff 40 Jun 1 23:42 testShell00 : droits 455, 1 lien, 40 octets.',
  },
  'pis-sh00-ls-type': {
    title: 'Le type dans ls -l',
    definition:
      "Le premier caractère de chaque ligne de ls -l dit ce qu'est l'entrée : - un fichier ordinaire, d un dossier, l un lien symbolique (et c ou b, des périphériques). Un lien physique ne se distingue pas : il apparaît comme un fichier.",
    example: 'drwxr-xr-x est un dossier ; lrwxr-xr-x test6 -> test0, un lien symbolique.',
  },
  'pis-sh00-octal': {
    title: 'Droits en octal',
    definition:
      'chmod en octal prend trois chiffres : propriétaire, groupe et autres. Chacun additionne 4 (lecture), 2 (écriture) et 1 (exécution), de 0 à 7.',
    example: 'chmod 640 f donne rw-r----- ; chmod 711 f donne rwx--x--x ; rwxr-x--- vaut 750.',
  },
  'pis-sh00-chmod-sym': {
    title: 'chmod symbolique',
    definition:
      "Au lieu de donner les neuf droits en octal, tu n'en changes que certains : à qui (u propriétaire, g groupe, o autres, a tous), + ou - et quoi (r, w, x). Ce qui n'est pas nommé reste comme avant.",
    example:
      'chmod u+x script.sh transforme rw-r--r-- en rwxr--r-- ; chmod go-w f retire le w au groupe et aux autres.',
  },
  'pis-sh00-umask': {
    title: "L'umask",
    definition:
      "L'umask dit quels droits ce que tu crées n'aura PAS. Un nouveau fichier part de 666 et un dossier de 777 ; on leur enlève les bits indiqués par l'umask.",
    example: 'Avec umask 022 : touch f donne 644 (rw-r--r--) et mkdir d donne 755 (rwxr-xr-x).',
  },
  'pis-sh00-dir-x': {
    title: "Droits d'un dossier",
    definition:
      "Sur un dossier, les droits ne veulent pas dire la même chose que sur un fichier : r permet de voir les noms qu'il contient, w de créer, renommer et supprimer dedans, et x d'y entrer avec cd et d'accéder à ses fichiers.",
    example:
      'Avec chmod 644 dir, ls dir montre les noms, mais cd dir répond « Permission denied ».',
  },
  'pis-sh00-ln-hard': {
    title: 'Liens physiques',
    definition:
      "ln a b donne au fichier a un deuxième nom, b, qui pointe vers le même inode (les mêmes données). ls -l montre combien de noms il a ; si tu en supprimes un, l'autre garde le contenu.",
    example: 'ln test3 test5 ; ls -l test3 indique 2 liens ; rm test3 et test5 reste lisible.',
  },
  'pis-sh00-ln-sym': {
    title: 'Liens symboliques',
    definition:
      "Un lien symbolique est un petit fichier qui contient un chemin vers un autre. On le crée avec ln -s cible nom (la cible d'abord). Si la cible est supprimée, le lien est cassé.",
    example: 'ln -s test0 test6 ; ls -l affiche lrwxr-xr-x ... 5 ... test6 -> test0.',
  },
  'pis-sh00-dir-links': {
    title: "Les liens d'un dossier",
    definition:
      "Le nombre de liens d'un dossier compte les noms qui y mènent : le sien dans le dossier parent, son propre « . » et le « .. » de chaque sous-dossier.",
    example: 'mkdir d donne 2 liens ; après mkdir d/a d/b, ls -ld d en indique 4.',
  },
  'pis-sh00-ssh-keygen': {
    title: 'Clés SSH',
    definition:
      "ssh-keygen génère deux clés qui vont ensemble : la privée (id_rsa), qui est ton secret, et la publique (id_rsa.pub), que l'on met sur les serveurs ou l'intra pour qu'ils te reconnaissent.",
    example:
      "ssh-keygen laisse ~/.ssh/id_rsa et ~/.ssh/id_rsa.pub ; c'est le .pub que tu colles dans l'intra.",
  },
  'pis-sh00-ssh-auth': {
    title: 'Se connecter avec une clé SSH',
    definition:
      "Pour te connecter sans mot de passe, ta clé publique est ajoutée au ~/.ssh/authorized_keys du serveur (ssh-copy-id le fait pour toi). À la connexion, tu prouves que tu as la clé privée sans l'envoyer : c'est pour ça qu'on ne la partage jamais.",
    example: 'ssh-copy-id ana@host, puis ssh ana@host se connecte sans demander de mot de passe.',
  },
  'pis-sh00-ls-opts': {
    title: 'Options de ls',
    definition:
      "ls change de format et d'ordre avec ses options : -m met des virgules entre les noms, -p ajoute / aux dossiers, -t trie par date de modification, -S par taille et -r inverse l'ordre.",
    example: 'ls -mp donne quelque chose comme « ex00/, ex01/, notes.txt ».',
  },
  'pis-sh00-midls': {
    title: 'midLS et fichiers cachés',
    definition:
      "Les options de ls se combinent : ls -mtp sépare par des virgules, trie par date et marque les dossiers. Un fichier dont le nom commence par un point est caché : ls ne le montre qu'avec -a ou -A.",
    example: "ls n'affiche pas .gitignore ; ls -A si, et ls -a affiche en plus . et ..",
  },
  'pis-sh00-ls-r': {
    title: 'ls -R et ls -r',
    definition:
      "Les options distinguent les majuscules : ls -R liste le dossier puis chaque sous-dossier en dessous, l'un après l'autre ; ls -r liste la même chose que ls, mais dans l'ordre inverse.",
    example:
      'ls -R affiche « ./ex00: », son contenu, et ainsi de suite ; ls -tr met le plus récent à la fin.',
  },
  'pis-sh00-git-log': {
    title: 'git log avec un format',
    definition:
      "git log affiche l'historique. Avec -n (ou -5), il ne garde que les derniers commits, et avec --format (ou --pretty=format:), tu choisis ce que chacun affiche : %H hash complet, %h abrégé, %an auteur, %s message.",
    example: 'git log -5 --format=%H affiche 5 lignes de 40 caractères, la plus récente en haut.',
  },
  'pis-sh00-gitignore': {
    title: 'Le .gitignore',
    definition:
      "Le .gitignore liste des motifs de fichiers que git ne doit pas proposer d'ajouter (objets, binaires, .DS_Store…). Il ne supprime rien et ne retire pas ce qui est déjà suivi.",
    example:
      "Avec *.o dans le .gitignore, git status n'affiche plus main.o ; git status --ignored, si.",
  },
  'pis-sh00-diff-patch': {
    title: 'diff et patch',
    definition:
      'diff compare deux fichiers ligne par ligne et écrit les différences : < pour le premier et > pour le second. Cette sortie est un patch : patch la lit et transforme le premier fichier en second.',
    example: "diff a b > sw.diff ; patch a sw.diff ; maintenant diff a b n'affiche plus rien.",
  },
  'pis-sh00-find-clean': {
    title: 'Nettoyer avec find',
    definition:
      "find cherche à partir d'un dossier vers le bas et applique des tests : -type f (fichiers), -name avec un motif entre guillemets pour que le shell ne le développe pas, -o pour « l'un ou l'autre ». À la fin, -delete ou -exec rm {} \\; agissent sur chaque résultat.",
    example: "find . -type f \\( -name '*~' -o -name '#*#' \\) -print -delete",
  },
  'pis-sh00-find-exec': {
    title: 'find -exec',
    definition:
      "Avec -exec, find lance une commande pour chaque résultat : {} est remplacé par le chemin trouvé et \\; marque la fin de la commande (la barre empêche le shell d'interpréter le point-virgule).",
    example: "find . -name '*~' -exec rm {} \\; lance rm ./a~, puis rm ./ex00/b~…",
  },
  'pis-sh00-file-magic': {
    title: 'file et les fichiers magiques',
    definition:
      'Beaucoup de formats commencent par des octets fixes, le nombre magique (un PNG, par exemple). file les cherche dans une base de signatures ; un fichier magique à toi décrit une nouvelle signature et se passe avec file -m.',
    example:
      "Un PNG commence par \\x89PNG : file photo.dat répond « PNG image » même s'il s'appelle .dat.",
  },
  'pis-sh00-paths': {
    title: 'Chemins absolus et relatifs',
    definition:
      'Un chemin absolu part de la racine, /, et fonctionne où que tu sois. Un chemin relatif part du dossier courant : . est le dossier lui-même, .. le parent. ~ est remplacé par ton dossier personnel ($HOME).',
    example:
      'Depuis /home/ana/piscine, ../ex00 est /home/ana/ex00, et ~/ex00 aussi si HOME vaut /home/ana.',
  },
  'pis-sh00-mkdir-rm': {
    title: 'mkdir -p et rm -r',
    definition:
      "mkdir crée un dossier ; avec -p, il crée aussi ceux qui manquent sur le chemin et ne se plaint pas s'il existe déjà. rm supprime des fichiers ; avec -r, il entre dans les dossiers et efface tout, sans corbeille.",
    example: 'mkdir -p ex00/test crée les deux ; rm -r ex00 les supprime avec leur contenu.',
  },
  'pis-sh00-cp-mv': {
    title: 'cp et mv',
    definition:
      'mv déplace ou renomme ; cp copie. Si le dernier argument est un dossier existant, les autres vont dedans. cp ne copie pas de dossier sans -r (récursif).',
    example: 'mv z ex00 donne ex00/z ; cp -r ex00 copie fait une copie complète de ex00.',
  },
  'pis-sh00-man': {
    title: 'man et pwd',
    definition:
      'man commande ouvre son manuel ; les pages sont rangées par section (1 commandes, 2 appels système, 3 bibliothèque C) et man 2 write en choisit une. pwd affiche le chemin absolu de là où tu es.',
    example: "man 2 write affiche l'appel système write, pas la commande write de la section 1.",
  },
  'pis-sh01-groups': {
    title: 'print_groups : id et tr',
    definition:
      "id -G donne les numéros des groupes d'un utilisateur, et avec -n leurs noms (-g ne donnerait que le principal). tr remplace des caractères : tr ' ' ',' met des virgules à la place des espaces et tr -d '\\n' supprime les retours à la ligne.",
    example: "id -Gn $FT_USER | tr ' ' ',' | tr -d '\\n' donne « staff,piscine,student ».",
  },
  'pis-sh01-env': {
    title: "Variables d'environnement",
    definition:
      "NOM=valeur crée une variable du shell ; export la place dans l'environnement, que reçoivent les programmes et scripts que tu lances. Elle se lit avec $NOM (la casse compte) et env les liste toutes.",
    example: 'export FT_USER=nours ; ./print_groups.sh peut alors lire $FT_USER.',
  },
  'pis-sh01-shebang': {
    title: 'Lancer un script',
    definition:
      "Un script commence par le shebang (#!/bin/sh), qui indique quel interpréteur le lit. Pour le lancer comme un programme, il lui faut le droit d'exécution (chmod +x) et un chemin (./script.sh), car le shell ne cherche les noms seuls que dans les dossiers du PATH.",
    example: 'chmod +x find_sh.sh ; ./find_sh.sh. Sans le ./, on obtient « command not found ».',
  },
  'pis-sh01-args': {
    title: "Arguments d'un script",
    definition:
      'Ce que tu écris après le nom du script arrive dans $1, $2, $3… ; $0 est le nom lui-même, $# compte les arguments (sans $0) et "$@" les donne tous, chacun comme un mot.',
    example: './s.sh a b c : $0 vaut ./s.sh, $1 vaut a, $# vaut 3.',
  },
  'pis-sh01-find-sh': {
    title: 'find_sh : chercher et découper',
    definition:
      "find . -name '*.sh' liste les .sh d'ici et de tous les sous-dossiers (les guillemets empêchent le shell de développer *). Pour retirer l'extension, sed 's/\\.sh$//' : le point échappé et $ pour ne viser que la fin.",
    example:
      "find . -name '*.sh' | sed 's/\\.sh$//' transforme ./ex02/find_sh.sh en ./ex02/find_sh.",
  },
  'pis-sh01-basename': {
    title: 'basename et dirname',
    definition:
      'basename chemin donne le nom du fichier sans les dossiers, et basename chemin suffixe retire en plus cette fin. dirname chemin donne le dossier qui le contient. Ils ne regardent pas le disque : ils travaillent seulement sur le texte.',
    example: 'basename a/b/c.sh .sh donne c ; dirname a/b/c.sh donne a/b.',
  },
  'pis-sh01-count-files': {
    title: 'count_files : compter avec find',
    definition:
      'find . écrit une ligne par fichier et dossier trouvé, y compris le dossier de départ « . ». Passé à wc -l, il donne leur nombre en comptant ce dossier ; avec -type f ou -type d, on ne compte que les fichiers ou que les dossiers.',
    example: 'Avec a, b et d/c : find . affiche ., ./a, ./b, ./d et ./d/c, et wc -l donne 5.',
  },
  'pis-sh01-wc': {
    title: 'Compter avec wc',
    definition:
      "wc compte ce qu'il reçoit : -l les lignes (retours à la ligne), -w les mots (morceaux séparés par des espaces) et -c les octets. Le retour à la ligne ajouté par echo compte comme un octet.",
    example: 'echo hola | wc -c donne 5 (4 lettres et le \\n) ; echo -n hola | wc -c donne 4.',
  },
  'pis-sh01-mac': {
    title: 'MAC.sh : adresses MAC',
    definition:
      "Une adresse MAC identifie une carte réseau : 6 octets écrits en hexadécimal et séparés par deux-points. ifconfig (ou ip link) l'affiche sur la ligne qui commence par ether ; grep et cut permettent de l'extraire seule.",
    example: "ifconfig | grep ether | cut -d ' ' -f 2 donne quelque chose comme a0:ce:c8:12:34:56.",
  },
  'pis-sh01-quotes': {
    title: 'Guillemets et échappements',
    definition:
      "Pour que le shell n'interprète pas un caractère (espace, $, *, guillemets…), on le protège : avec un \\ devant, avec des guillemets simples (tout littéral) ou doubles (littéral sauf $, ` et \\). C'est ainsi qu'on crée des noms de fichier avec des caractères bizarres.",
    example:
      'echo "$HOME *" affiche ton dossier et un * ; echo \'$HOME *\' affiche $HOME * tel quel.',
  },
  'pis-sh01-skip': {
    title: 'skip : une ligne sur deux',
    definition:
      "sed -n n'affiche rien de lui-même ; p affiche la ligne courante et n passe à la suivante. sed -n 'p;n' en affiche une et saute la suivante. Dans awk, NR est le numéro de ligne : awk 'NR%2==1' fait la même chose.",
    example: "ls -l | sed -n 'p;n' affiche les lignes 1, 3, 5… de ls -l.",
  },
  'pis-sh01-passwd': {
    title: '/etc/passwd, grep et cut',
    definition:
      '/etc/passwd contient un utilisateur par ligne : nom, x, UID, GID, description, dossier personnel et shell, séparés par « : ». grep -v retire les lignes qui correspondent (^# veut dire « commence par # ») et cut -d: -f1 garde le premier champ.',
    example: "cat /etc/passwd | grep -v '^#' | cut -d: -f1 donne root, daemon, nobody…",
  },
  'pis-sh01-rev-sort': {
    title: 'rev et sort',
    definition:
      "rev inverse les caractères de chaque ligne. sort trie les lignes comme du texte ; -r à l'envers, -n par valeur numérique (sinon 10 passe avant 9) et -u retire les doublons.",
    example: 'printf "10\\n9\\n" | sort donne 10 puis 9 ; avec sort -n, 9 puis 10.',
  },
  'pis-sh01-sed-range': {
    title: 'Une plage de lignes avec sed',
    definition:
      "sed -n 'A,Bp' n'affiche que les lignes A à B, toutes deux incluses. Si A et B sont dans des variables, il faut des guillemets doubles pour que le shell les remplace par leur valeur avant d'appeler sed.",
    example: 'Avec FT_LINE1=7 et FT_LINE2=15, sed -n "${FT_LINE1},${FT_LINE2}p" affiche 9 lignes.',
  },
  'pis-sh01-sed-s': {
    title: 'Remplacer avec sed',
    definition:
      "sed 's/motif/remplacement/' cherche le motif sur chaque ligne et remplace sa première occurrence. Avec le drapeau g, il les remplace toutes dans la ligne. sed travaille toujours sur toutes les lignes.",
    example: "echo banana | sed 's/a/o/' donne bonana ; avec /g, bonono.",
  },
  'pis-sh01-paste': {
    title: 'Réunir des lignes avec paste',
    definition:
      "paste -s réunit en une seule ligne toutes celles de son entrée (le - est l'entrée standard) et -d dit quoi mettre entre elles. sed corrige ensuite le séparateur ou la fin.",
    example: "printf 'a\\nb\\nc\\n' | paste -sd, - | sed 's/,/, /g' donne « a, b, c ».",
  },
  'pis-sh01-bc': {
    title: 'Les bases avec bc',
    definition:
      'bc est une calculatrice qui lit son entrée. ibase fixe la base dans laquelle il lit ce que tu écris et obase celle dans laquelle il affiche. Comme ibase change la lecture de ce qui suit, on met obase avant.',
    example: "echo 'obase=2; ibase=16; FF' | bc affiche 11111111.",
  },
  'pis-sh01-tr': {
    title: 'Changer des caractères avec tr',
    definition:
      "tr liste1 liste2 remplace chaque caractère de liste1 par celui à la même position dans liste2. Il ne travaille pas sur des mots, seulement sur des caractères isolés. -d supprime ceux d'une liste et -s réduit ceux qui se répètent à la suite.",
    example: "echo hola | tr 'a-z' 'A-Z' donne HOLA ; echo hola | tr -d 'o' donne hla.",
  },
  'pis-sh01-grep': {
    title: 'Options de grep',
    definition:
      "grep motif affiche les lignes qui contiennent le motif. -v inverse (celles qui ne l'ont pas), -c compte au lieu d'afficher, -i ignore la casse et -n ajoute le numéro de ligne devant.",
    example: 'grep -ci error log.txt compte les lignes avec error, Error ou ERROR.',
  },
  'pis-sh01-uniq': {
    title: 'sort et uniq',
    definition:
      "uniq retire une ligne si elle est identique à celle juste avant ; avec -c, il indique combien de fois elle se répétait. Comme il ne regarde que la précédente, on trie d'abord avec sort. sort -u fait les deux à la fois.",
    example: 'printf "b\\na\\nb\\n" | uniq laisse b, a, b ; avec sort | uniq, a et b.',
  },
  'pis-sh01-head-tail': {
    title: 'head et tail',
    definition:
      "head -n N affiche les N premières lignes et tail -n N les N dernières (tail -n +N, de la ligne N jusqu'à la fin). Enchaînés par un tube, ils extraient un morceau du milieu.",
    example: 'head -n 5 f | tail -n 1 affiche la cinquième ligne de f.',
  },
  'pis-sh01-xargs': {
    title: 'xargs',
    definition:
      'Beaucoup de commandes ne lisent pas leur entrée standard, mais leurs arguments (rm, mkdir, basename…). xargs commande lit des mots sur son entrée et appelle la commande avec eux en arguments.',
    example:
      "find . -name '*.o' | xargs rm supprime chaque .o ; avec | rm tout court, rm se plaint qu'il manque des arguments.",
  },
  'pis-sh01-pipeline': {
    title: 'Tubes enchaînés',
    definition:
      "Dans un long pipeline, chaque commande fait une seule étape sur ce que lui donne la précédente : filtrer (grep), découper (cut), trier (sort), réduire (head, sed -n). Il se lit de gauche à droite, et l'ordre des étapes change le résultat.",
    example:
      'Dans r_dwssap : retirer les commentaires, une ligne sur deux, cut, rev, sort -r, sed -n pour la plage et paste pour réunir.',
  },
  'pis-sh01-cut': {
    title: 'Découper avec cut',
    definition:
      "cut garde un morceau de chaque ligne : avec -c par positions de caractères (à partir de 1) et avec -d séparateur -f par champs. Les plages sont incluses : 2-4, et 2- veut dire jusqu'à la fin.",
    example: 'echo root:x:0:0 | cut -d: -f1 donne root ; cut -c1-2 donnerait ro.',
  },
}
