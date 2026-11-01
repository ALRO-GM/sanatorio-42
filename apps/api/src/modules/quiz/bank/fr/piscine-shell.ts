/** Banco de Not-games en francés: la piscina, Shell 00 y Shell 01 (`../piscine-shell.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_SHELL_FR: Readonly<Record<string, ConceptText>> = {
  'pis-sh00-cat-e': {
    forms: [
      {
        ask: ["Un fichier z contient un Z et un retour à la ligne. Qu'affiche `cat -e z` ?"],
        right: ['`Z$`'],
        wrong: ['`Z`', '`$Z`', '`Z\\n`', '`Z^J`'],
      },
      {
        ask: ['Que met `cat -e` à la fin de chaque ligne ?'],
        right: ['`$`'],
        wrong: ['`^`', '`\\n`', '`#`', '`~`'],
      },
      {
        ask: [
          "Combien d'octets occupe un fichier qui ne contient qu'un Z et un retour à la ligne ?",
        ],
        right: ['2'],
        wrong: ['1', '3', '0', '4'],
      },
    ],
    wrong: ['`Z`', '`$Z`', '`Z\\n`'],
    why: '`cat -e` signale chaque fin de ligne par un $ ; le Z et le retour à la ligne font 2 octets.',
  },
  'pis-sh00-echo-n': {
    forms: [
      {
        ask: ['Quelle commande crée un fichier z qui contient « Z » et un retour à la ligne ?'],
        right: ['`echo Z > z`'],
        wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`', '`touch z Z`'],
      },
      {
        ask: ["Que fait l'option `-n` de echo ?"],
        right: ["Elle n'ajoute pas le retour à la ligne final"],
        wrong: [
          'Elle ajoute un retour à la ligne en plus',
          'Elle interprète les échappements comme \\t',
          "Elle numérote les lignes qu'elle écrit",
          'Elle écrit toujours dans un nouveau fichier',
        ],
      },
    ],
    wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`'],
    why: "echo écrit son texte suivi d'un retour à la ligne ; avec -n il s'en passe, et la redirection > l'enregistre dans z.",
  },
  'pis-sh00-tar': {
    forms: [
      {
        ask: ["Quelle commande met le fichier testShell00 dans l'archive testShell00.tar ?"],
        right: ['`tar -cf testShell00.tar testShell00`'],
        wrong: [
          '`tar -xf testShell00.tar testShell00`',
          '`tar -tf testShell00.tar testShell00`',
          '`tar -cf testShell00 testShell00.tar`',
          '`tar testShell00 > testShell00.tar`',
        ],
      },
      {
        ask: ["Quelle commande liste le contenu d'un .tar sans l'extraire ?"],
        right: ['`tar -tf exo.tar`'],
        wrong: ['`tar -xf exo.tar`', '`tar -cf exo.tar`', '`tar -vf exo.tar`', '`cat -t exo.tar`'],
      },
      {
        ask: ["Quelle commande extrait le contenu d'un .tar dans le dossier courant ?"],
        right: ['`tar -xf exo.tar`'],
        wrong: [
          '`tar -tf exo.tar`',
          '`tar -cf exo.tar`',
          '`tar -rf exo.tar`',
          '`untar -f exo.tar`',
        ],
      },
    ],
    wrong: [
      '`tar -xf testShell00.tar testShell00`',
      '`tar -tf testShell00.tar testShell00`',
      '`tar -cf testShell00 testShell00.tar`',
    ],
    why: "Avec tar, c crée, x extrait et t liste ; f indique que le mot suivant est le nom de l'archive.",
  },
  'pis-sh00-touch-t': {
    forms: [
      {
        ask: ['Quelle commande donne à testShell00 la date du 1er juin à 23:42 ?'],
        right: ['`touch -t 06012342 testShell00`'],
        wrong: [
          '`touch -d 06012342 testShell00`',
          '`touch -m 06012342 testShell00`',
          '`date -t 06012342 testShell00`',
          '`touch -t 23420601 testShell00`',
        ],
      },
      {
        ask: ['Quel format de date attend `touch -t` ?'],
        right: ['`[[CC]YY]MMDDhhmm[.ss]`'],
        wrong: [
          '`DDMMYYYY hh:mm`',
          '`YYYY-MM-DD hh:mm:ss`',
          '`hhmm[DDMM[YY]]`',
          '`[.ss]hhmmDDMM[YY]`',
        ],
      },
    ],
    wrong: [
      '`touch -d 06012342 testShell00`',
      '`touch -m 06012342 testShell00`',
      '`date -t 06012342 testShell00`',
    ],
    why: 'touch -t règle la date du fichier sur celle que tu donnes, écrite [[CC]YY]MMDDhhmm[.ss] : mois, jour, heure et minute.',
  },
  'pis-sh00-ls-l-line': {
    forms: [
      {
        ask: ['Que représente le 40 de cette ligne de `ls -l` ?'],
        right: ['La taille du fichier en octets'],
        wrong: [
          'Le nombre de liens physiques',
          "Les blocs qu'il occupe sur le disque",
          'Le numéro qui identifie le propriétaire',
          'Les minutes depuis la dernière modification',
        ],
      },
      {
        ask: ['Que représente le 1 juste après les droits ?'],
        right: ['Le nombre de liens physiques'],
        wrong: [
          'La taille du fichier en kilo-octets',
          'Le numéro de version du fichier',
          "Combien d'utilisateurs l'ont ouvert",
          'Le nombre de copies de sauvegarde',
        ],
      },
      {
        ask: ['Dans cette ligne, que peut faire le groupe avec le fichier ?'],
        right: ["Le lire et l'exécuter, mais pas écrire"],
        wrong: [
          'Seulement le lire, sans écrire ni exécuter',
          "Le lire, l'écrire et l'exécuter",
          'Rien : le groupe ne peut même pas le lire',
          "L'écrire et l'exécuter, sans le lire",
        ],
      },
      {
        ask: ['Quelle valeur octale correspond aux droits de cette ligne ?'],
        right: ['455'],
        wrong: ['445', '544', '355', '454'],
      },
    ],
    wrong: [
      "Les blocs qu'il occupe sur le disque",
      'Le numéro qui identifie le propriétaire',
      'Les minutes depuis la dernière modification',
    ],
    why: 'ls -l donne le type et les droits, les liens physiques, le propriétaire, le groupe, la taille en octets, la date et le nom ; r-x vaut 4 + 1 = 5, donc r--r-xr-x vaut 455.',
  },
  'pis-sh00-ls-type': {
    forms: [
      {
        ask: ["Dans `ls -l`, qu'est-ce qu'une entrée dont la ligne commence par `l` ?"],
        right: ['Un lien symbolique'],
        wrong: ['Un lien physique', 'Un dossier', 'Un long fichier texte', 'Un fichier verrouillé'],
      },
      {
        ask: ["Par quelle lettre commence la ligne d'un dossier dans `ls -l` ?"],
        right: ['`d`'],
        wrong: ['`-`', '`l`', '`c`', '`f`'],
      },
    ],
    wrong: ['Un lien physique', 'Un dossier', 'Un long fichier texte'],
    why: 'Le premier caractère de ls -l indique le type : - fichier ordinaire, d dossier, l lien symbolique.',
  },
  'pis-sh00-octal': {
    forms: [
      {
        ask: ['À quoi ressemble `chmod 640` dans `ls -l` ?'],
        right: ['rw-r-----'],
        wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----', 'rw--w----'],
      },
      {
        ask: ['Quels droits laisse `chmod 711` ?'],
        right: ['rwx--x--x'],
        wrong: ['rwxr--r--', 'rwx-w--w-', 'rwxrw-rw-', 'rw---x--x'],
      },
      {
        ask: ['Quel nombre de chmod donne `rwxr-x---` ?'],
        right: ['750'],
        wrong: ['760', '740', '751', '570'],
      },
    ],
    wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----'],
    why: 'Chaque chiffre correspond au propriétaire, au groupe et aux autres, en additionnant lecture (4), écriture (2) et exécution (1) : 6 donne rw-, 1 donne --x, 0 donne ---.',
  },
  'pis-sh00-chmod-sym': {
    forms: [
      {
        ask: ['Un fichier a `rw-r--r--`. Que devient-il après `chmod u+x` ?'],
        right: ['rwxr--r--'],
        wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--', 'rwxrwxrwx'],
      },
      {
        ask: ['Un fichier a `rw-rw-rw-`. Que devient-il après `chmod go-w` ?'],
        right: ['rw-r--r--'],
        wrong: ['r--rw-rw-', 'rw-rw-r--', 'r--r--r--', 'rw-r--rw-'],
      },
      {
        ask: ["Quelle commande retire le droit d'écriture au groupe et aux autres ?"],
        right: ['`chmod go-w f`'],
        wrong: ['`chmod ug-w f`', '`chmod go+w f`', '`chmod a-w f`', '`chmod o-x f`'],
      },
    ],
    wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--'],
    why: 'En chmod symbolique, u désigne le propriétaire, g le groupe, o les autres et a tout le monde ; + ajoute et - retire, sans toucher au reste.',
  },
  'pis-sh00-umask': {
    forms: [
      {
        ask: ['Avec `umask 022`, quels droits reçoit un nouveau fichier ?'],
        right: ['644'],
        wrong: ['755', '022', '666', '600'],
      },
      {
        ask: ['Avec `umask 022`, quels droits reçoit un nouveau dossier ?'],
        right: ['755'],
        wrong: ['644', '777', '022', '733'],
      },
      {
        ask: ["Qu'est-ce que l'umask ?"],
        right: ['Les droits retirés à ce que tu crées'],
        wrong: [
          'Les droits donnés à ce que tu crées',
          'Le masque réseau de la machine',
          'Le propriétaire des nouveaux fichiers',
          'La liste des utilisateurs autorisés',
        ],
      },
    ],
    wrong: ['022', '666', '600'],
    why: "L'umask retire des droits : un fichier part de 666 et un dossier de 777, et 022 enlève l'écriture au groupe et aux autres.",
  },
  'pis-sh00-dir-x': {
    forms: [
      {
        ask: ['Que permet le droit x sur un dossier ?'],
        right: ["Y entrer et accéder à ce qu'il contient"],
        wrong: [
          "Exécuter tous les programmes qu'il contient",
          "Lister les noms de ce qu'il contient",
          'Y créer et supprimer des fichiers',
          'Rien : sur un dossier, x ne sert à rien',
        ],
      },
      {
        ask: ["Quel droit d'un dossier permet de lister les noms qu'il contient ?"],
        right: ['`r`'],
        wrong: ['`x`', '`w`', '`s`', '`t`'],
      },
    ],
    wrong: [
      "Exécuter tous les programmes qu'il contient",
      "Lister les noms de ce qu'il contient",
      'Y créer et supprimer des fichiers',
    ],
    why: "Sur un dossier, r permet de lister les noms, w de créer et supprimer des entrées, et x d'y entrer (cd) et d'accéder au contenu.",
  },
  'pis-sh00-ln-hard': {
    forms: [
      {
        ask: ['Quelle commande crée un lien physique nommé b vers le fichier a ?'],
        right: ['`ln a b`'],
        wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`', '`mv a b`'],
      },
      {
        ask: ['Après `ln a b`, combien de liens affiche `ls -l a` ?'],
        right: ['2'],
        wrong: ['1', '0', '3', '4'],
      },
      {
        ask: ["Tu supprimes le fichier a. Qu'arrive-t-il au lien physique b ?"],
        right: ["Il garde le contenu : c'est le même inode"],
        wrong: [
          'Il est cassé et ne pointe plus sur rien',
          'Il est supprimé aussi, en même temps',
          'Il devient vide, avec 0 octet',
          'Il devient un lien symbolique',
        ],
      },
    ],
    wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`'],
    why: "Un lien physique est un autre nom pour le même inode : le compteur de liens augmente, et le contenu n'est effacé que lorsqu'il ne reste plus aucun nom.",
  },
  'pis-sh00-ln-sym': {
    forms: [
      {
        ask: ['Quelle commande crée un lien symbolique nommé test6 qui pointe vers test0 ?'],
        right: ['`ln -s test0 test6`'],
        wrong: [
          '`ln -s test6 test0`',
          '`ln test0 test6`',
          '`ln -l test0 test6`',
          '`cp -l test0 test6`',
        ],
      },
      {
        ask: ['À quoi ressemble ce lien à la fin de sa ligne de `ls -l` ?'],
        right: ['`test6 -> test0`'],
        wrong: ['`test0 -> test6`', '`test6 => test0`', '`test6@test0`', '`test6 <- test0`'],
      },
      {
        ask: ["D'après `ls -l`, combien d'octets occupe un lien symbolique vers test0 ?"],
        right: ['5'],
        wrong: ['0', '4', '1', '4096'],
      },
    ],
    wrong: ['`ln -s test6 test0`', '`ln test0 test6`', '`ln -l test0 test6`'],
    why: "ln -s cible nom enregistre le chemin de la cible dans le lien : ls -l l'affiche avec ->, et sa taille est la longueur de ce chemin.",
  },
  'pis-sh00-dir-links': {
    forms: [
      {
        ask: ["Combien de liens affiche `ls -l` pour un dossier vide qui vient d'être créé ?"],
        right: ['2'],
        wrong: ['1', '0', '3', '4096'],
      },
      {
        ask: [
          'Dans ce dossier, tu crées deux sous-dossiers. Combien de liens affiche-t-il maintenant ?',
        ],
        right: ['4'],
        wrong: ['2', '3', '1', '6'],
      },
    ],
    wrong: ['1', '0', '3'],
    why: 'Un dossier a son nom dans le dossier parent et son propre « . » : 2 ; chaque sous-dossier en ajoute un avec son « .. ».',
  },
  'pis-sh00-ssh-keygen': {
    forms: [
      {
        ask: ['Quelle commande génère une paire de clés SSH, publique et privée ?'],
        right: ['`ssh-keygen`'],
        wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`', '`sshd`'],
      },
      {
        ask: ['Quel fichier de ta paire de clés peux-tu donner sans risque ?'],
        right: ['`id_rsa.pub`'],
        wrong: ['`id_rsa`', '`known_hosts`', '`ssh_config`', '`id_rsa.key`'],
      },
      {
        ask: ['Dans quel dossier la commande qui génère tes clés les range-t-elle par défaut ?'],
        right: ['`~/.ssh/`'],
        wrong: ['`/etc/ssh/`', '`~/.config/ssh/`', '`/var/ssh/`', '`~/.keys/`'],
      },
    ],
    wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`'],
    why: "ssh-keygen crée dans ~/.ssh une clé privée (id_rsa), qui ne quitte jamais ta machine, et sa clé publique (id_rsa.pub), celle que l'on partage.",
  },
  'pis-sh00-ssh-auth': {
    forms: [
      {
        ask: ["Que peut faire quelqu'un qui récupère ton `id_rsa` ?"],
        right: ['Se connecter en ton nom partout où est ta clé publique'],
        wrong: [
          'Rien : sans le .pub, elle ne lui sert à rien',
          'Seulement lire ta clé publique, rien de plus',
          'Changer le mot de passe de ton compte',
          'Se connecter seulement pendant ta session',
        ],
      },
      {
        ask: ['Sur le serveur, quel fichier contient les clés publiques autorisées ?'],
        right: ['`~/.ssh/authorized_keys`'],
        wrong: ['`~/.ssh/known_hosts`', '`~/.ssh/id_rsa`', '`~/.ssh/config`', '`/etc/passwd`'],
      },
      {
        ask: [
          'Quelle commande dépose ta clé publique sur un serveur pour te connecter sans mot de passe ?',
        ],
        right: ['`ssh-copy-id ana@host`'],
        wrong: [
          '`ssh-keygen ana@host`',
          '`ssh-add ana@host`',
          '`scp id_rsa ana@host`',
          '`ssh -i ana@host`',
        ],
      },
    ],
    wrong: [
      'Rien : sans le .pub, elle ne lui sert à rien',
      'Seulement lire ta clé publique, rien de plus',
      'Changer le mot de passe de ton compte',
    ],
    why: "Le serveur laisse entrer quiconque prouve détenir la clé privée d'une clé publique présente dans authorized_keys : c'est la privée, la vraie clé.",
  },
  'pis-sh00-ls-opts': {
    forms: [
      {
        ask: ['Quelle option de ls sépare les noms par des virgules ?'],
        right: ['`-m`'],
        wrong: ['`-C`', '`-1`', '`-x`', '`-l`'],
      },
      {
        ask: ['Quelle option de ls met une barre après chaque dossier ?'],
        right: ['`-p`'],
        wrong: ['`-s`', '`-d`', '`-r`', '`-1`'],
      },
      {
        ask: ["Quelle option de ls trie par date de modification, le plus récent d'abord ?"],
        right: ['`-t`'],
        wrong: ['`-S`', '`-d`', '`-r`', '`-s`'],
      },
      {
        ask: ["Quelle option de ls trie par taille, le plus gros d'abord ?"],
        right: ['`-S`'],
        wrong: ['`-s`', '`-t`', '`-n`', '`-x`'],
      },
    ],
    wrong: ['`-C`', '`-1`', '`-x`'],
    why: "Dans ls, -m sépare par des virgules, -p marque les dossiers d'un /, -t trie par date et -S par taille (-s affiche seulement les blocs).",
  },
  'pis-sh00-midls': {
    forms: [
      {
        ask: [
          'Quelle commande liste le dossier courant séparé par des virgules, par date de modification et avec une barre après les dossiers ?',
        ],
        right: ['`ls -mtp`'],
        wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`', '`ls -mrR`'],
      },
      {
        ask: ['Quelle option de ls affiche les fichiers cachés, mais pas `.` ni `..` ?'],
        right: ['`-A`'],
        wrong: ['`-a`', '`-h`', '`-o`', '`-d`'],
      },
      {
        ask: ["Qu'est-ce qui rend un fichier caché sous Unix ?"],
        right: ['Que son nom commence par un point'],
        wrong: [
          "Qu'il n'ait pas le droit de lecture",
          'Que son propriétaire soit root',
          'Que son nom finisse par un ~',
          "Qu'il soit dans un dossier caché",
        ],
      },
    ],
    wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`'],
    why: "Les noms qui commencent par un point n'apparaissent pas dans ls ; -a les montre tous (avec . et ..) et -A, tous sauf . et ..",
  },
  'pis-sh00-ls-r': {
    forms: [
      {
        ask: ['Quelle option de ls entre aussi dans tous les sous-dossiers ?'],
        right: ['`-R`'],
        wrong: ['`-r`', '`-a`', '`-d`', '`-S`'],
      },
      {
        ask: ['Que fait `ls -r` ?'],
        right: ["Il inverse l'ordre de la liste"],
        wrong: [
          'Il entre aussi dans les sous-dossiers',
          "Il supprime ce qu'il liste",
          "Il n'affiche que ce qui est lisible",
          'Il affiche le vrai chemin de chaque fichier',
        ],
      },
    ],
    wrong: ['`-r`', '`-a`', '`-d`'],
    why: "Dans ls, -R (majuscule) est récursif et -r (minuscule) inverse l'ordre : ce n'est pas pareil.",
  },
  'pis-sh00-git-log': {
    forms: [
      {
        ask: [
          'Quelle commande affiche les identifiants complets des 5 derniers commits, un par ligne ?',
        ],
        right: ['`git log -5 --format=%H`', '`git log -n 5 --format=%H`'],
        wrong: [
          '`git log -5 --format=%h`',
          '`git log -5 --format=%an`',
          '`git show -5 --format=%s`',
          '`git status -5 --format=%H`',
        ],
      },
      {
        ask: ["Qu'affiche `%h` dans un format de `git log` ?"],
        right: ['Le hash du commit, abrégé'],
        wrong: [
          'Le hash complet, de 40 chiffres',
          "Le nom de l'auteur du commit",
          "L'heure à laquelle il a été fait",
          'Le nom de la branche courante',
        ],
      },
      {
        ask: ["Combien de caractères compte le hash complet d'un commit (`%H`) ?"],
        right: ['40'],
        wrong: ['7', '32', '64', '20'],
      },
    ],
    wrong: ['`git log -5 --format=%h`', '`git log -5 --format=%an`', '`git show -5 --format=%s`'],
    why: "git log -n limite le nombre de commits et --format choisit ce qu'on affiche : %H est le hash entier (40 chiffres hexadécimaux), %h le court.",
  },
  'pis-sh00-gitignore': {
    forms: [
      {
        ask: ['Quelle commande liste les fichiers que ton dépôt ignore ?'],
        right: ['`git ls-files --others --ignored --exclude-standard`'],
        wrong: [
          '`git ls-files --others --exclude-standard`',
          '`git ls-files --cached --ignored --exclude-standard`',
          '`git log --others --ignored --exclude-standard`',
          '`git diff --others --ignored --exclude-standard`',
        ],
      },
      {
        ask: ['Que fait une ligne `*.o` dans le .gitignore ?'],
        right: ["Git ne propose plus les .o qu'il ne suit pas encore"],
        wrong: [
          'Elle supprime du disque tous les .o du dépôt',
          'Elle fait que git ne suit que les .o',
          'Elle retire du dépôt les .o déjà ajoutés',
          'Elle compresse les .o avant chaque commit',
        ],
      },
    ],
    wrong: [
      '`git ls-files --others --exclude-standard`',
      '`git ls-files --cached --ignored --exclude-standard`',
      '`git log --others --ignored --exclude-standard`',
    ],
    why: 'Le .gitignore ne concerne que ce que git ne suit pas encore : avec --others --ignored --exclude-standard, ls-files liste exactement ça.',
  },
  'pis-sh00-diff-patch': {
    forms: [
      {
        ask: [
          "Quelle commande enregistre dans sw.diff ce qu'il faut changer pour passer de a à b ?",
        ],
        right: ['`diff a b > sw.diff`'],
        wrong: [
          '`diff b a > sw.diff`',
          '`patch a b > sw.diff`',
          '`diff a b < sw.diff`',
          '`cmp a b > sw.diff`',
        ],
      },
      {
        ask: ['Quelle commande applique à `a` les changements enregistrés dans `sw.diff` ?'],
        right: ['`patch a sw.diff`', '`patch a < sw.diff`'],
        wrong: [
          '`diff a sw.diff`',
          '`patch sw.diff a`',
          '`cat sw.diff >> a`',
          '`patch -R sw.diff`',
        ],
      },
      {
        ask: [
          "Dans la sortie normale de `diff a b`, qu'est-ce qui marque une ligne présente seulement dans b ?",
        ],
        right: ['`>`'],
        wrong: ['`<`', '`+`', '`!`', '`*`'],
      },
    ],
    wrong: ['`diff b a > sw.diff`', '`patch a b > sw.diff`', '`diff a b < sw.diff`'],
    why: 'diff a b décrit comment passer de a à b (< ce qui sort de a, > ce qui vient de b) et patch applique cette recette à a.',
  },
  'pis-sh00-find-clean': {
    forms: [
      {
        ask: [
          'Quelle commande supprime, ici et dans les sous-dossiers, les fichiers qui finissent par ~ ?',
        ],
        right: ["`find . -type f -name '*~' -delete`"],
        wrong: [
          "`find . -type d -name '*~' -delete`",
          "`find . -type f -name '~*' -delete`",
          "`find . -type f -name '*~' -print`",
          "`find . -type f -name '*~' | rm`",
        ],
      },
      {
        ask: ['Quel motif de `-name` trouve les noms qui commencent et finissent par # ?'],
        right: ["`'#*#'`"],
        wrong: ["`'*#*'`", "`'#*'`", "`'*#'`", "`'[#]'`"],
      },
      {
        ask: ['Que fait `-o` entre deux tests de find ?'],
        right: ["Il suffit que l'un des deux soit vrai"],
        wrong: [
          'Les deux doivent être vrais en même temps',
          'Il écrit le résultat dans un fichier',
          'Il inverse le test qui suit',
          'Il ne cherche que dans le dossier parent',
        ],
      },
    ],
    wrong: [
      "`find . -type d -name '*~' -delete`",
      "`find . -type f -name '~*' -delete`",
      "`find . -type f -name '*~' -print`",
    ],
    why: "find parcourt les sous-dossiers ; -type f garde les fichiers, -name un motif entre guillemets, -o est un « ou » et -delete supprime ce qu'il a trouvé.",
  },
  'pis-sh00-find-exec': {
    forms: [
      {
        ask: ['Que représente le `{}` de cette commande ?'],
        right: ['Chaque fichier que find trouve'],
        wrong: [
          'Le dossier où commence la recherche',
          'Un bloc de commandes vide',
          'Les options passées à rm',
          'La liste de tous les résultats ensemble',
        ],
      },
      {
        ask: ['À quoi sert le `\\;` final ?'],
        right: ['Il marque la fin de la commande de -exec'],
        wrong: [
          'Il sépare deux recherches de find',
          'Il empêche rm de demander confirmation',
          'Il met le reste de la ligne en commentaire',
          'Il lance rm une seule fois à la fin',
        ],
      },
    ],
    wrong: [
      'Le dossier où commence la recherche',
      'Un bloc de commandes vide',
      'Les options passées à rm',
    ],
    why: "find remplace {} par chaque chemin trouvé et lance la commande jusqu'au ;, échappé par \\ pour que le shell ne le garde pas pour lui.",
  },
  'pis-sh00-file-magic': {
    forms: [
      {
        ask: ['Sur quoi se base la commande `file` pour dire de quel type est un fichier ?'],
        right: ['Sur son contenu, surtout les premiers octets'],
        wrong: [
          "Seulement sur l'extension de son nom",
          'Sur les droits du fichier',
          'Sur le dossier où il est rangé',
          "Sur le programme qui l'a créé",
        ],
      },
      {
        ask: ['Quelle commande analyse a.txt avec ton fichier magique ft_magic ?'],
        right: ['`file -m ft_magic a.txt`'],
        wrong: [
          '`file -f ft_magic a.txt`',
          '`file -b ft_magic a.txt`',
          '`file -i ft_magic a.txt`',
          '`magic -m ft_magic a.txt`',
        ],
      },
      {
        ask: ["Qu'est-ce que le nombre magique (magic number) d'un fichier ?"],
        right: ['Des octets fixes qui révèlent son format'],
        wrong: [
          'Un nombre au hasard donné par le système',
          "La taille maximale qu'il peut avoir",
          'La somme de contrôle de son contenu',
          "Son numéro d'inode sur le disque",
        ],
      },
    ],
    wrong: [
      "Seulement sur l'extension de son nom",
      'Sur les droits du fichier',
      'Sur le dossier où il est rangé',
    ],
    why: 'file ne se fie pas au nom : il compare le contenu à des signatures connues (nombres magiques) et, avec -m, il peut utiliser celles que tu écris.',
  },
  'pis-sh00-paths': {
    forms: [
      {
        ask: ['Tu es dans /home/ana/piscine. Quel dossier est `../ex00` ?'],
        right: ['`/home/ana/ex00`'],
        wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`', '`/piscine/ex00`'],
      },
      {
        ask: ['Lequel de ces chemins est absolu ?'],
        right: ['`/tmp/ex00`'],
        wrong: ['`./tmp/ex00`', '`tmp/ex00`', '`../tmp/ex00`', '`.tmp/ex00`'],
      },
      {
        ask: ['Quel dossier est `~` dans le shell ?'],
        right: ['Ton dossier personnel, celui de HOME'],
        wrong: [
          'La racine du système de fichiers',
          'Le dossier où tu étais avant',
          'Le dossier où se trouve le shell',
          'Le dossier des fichiers temporaires',
        ],
      },
    ],
    wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`'],
    why: 'Un chemin absolu commence par / ; les relatifs partent de là où tu es (. ici, .. le parent), et ~ est ton dossier personnel.',
  },
  'pis-sh00-mkdir-rm': {
    forms: [
      {
        ask: ["Quelle commande crée a/b/c même si a et b n'existent pas encore ?"],
        right: ['`mkdir -p a/b/c`'],
        wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`', '`mkdir -a a/b/c`'],
      },
      {
        ask: ["Quelle commande supprime un dossier avec tout ce qu'il contient ?"],
        right: ['`rm -r dir`'],
        wrong: ['`rmdir dir`', '`rm dir`', '`rm -d dir`', '`del -r dir`'],
      },
    ],
    wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`'],
    why: "mkdir -p crée aussi les dossiers intermédiaires ; rm -r supprime un dossier et tout son contenu (rmdir ne marche que s'il est vide).",
  },
  'pis-sh00-cp-mv': {
    forms: [
      {
        ask: ['Que fait `mv a b` si b est un dossier qui existe déjà ?'],
        right: ['Il range a dans b, sous b/a'],
        wrong: [
          'Il remplace le dossier b par a',
          'Il échoue car b existe déjà',
          "Il copie a dans b et garde l'original",
          'Il fusionne le contenu de a et de b',
        ],
      },
      {
        ask: ['Quelle commande copie tout le dossier src, avec son contenu ?'],
        right: ['`cp -r src dst`'],
        wrong: ['`cp src dst`', '`mv -r src dst`', '`cp -i src dst`', '`cp -n src dst`'],
      },
    ],
    wrong: [
      'Il remplace le dossier b par a',
      'Il échoue car b existe déjà',
      "Il copie a dans b et garde l'original",
    ],
    why: 'Si la destination est un dossier, mv et cp y placent la source sous son propre nom ; pour copier un dossier, il faut -r.',
  },
  'pis-sh00-man': {
    forms: [
      {
        ask: ['Quelle commande affiche le manuel de ls ?'],
        right: ['`man ls`'],
        wrong: ['`help ls`', '`ls --manual`', '`ls -h`', '`doc ls`'],
      },
      {
        ask: ['Quelle commande te dit dans quel dossier tu es ?'],
        right: ['`pwd`'],
        wrong: ['`cwd`', '`whereis`', '`cd`', '`whoami`'],
      },
      {
        ask: ['Dans quelle section du manuel se trouvent les commandes utilisateur, comme ls ?'],
        right: ['1'],
        wrong: ['2', '3', '8', '5'],
      },
      {
        ask: ['Dans quelle section du manuel se trouvent les appels système, comme write ?'],
        right: ['2'],
        wrong: ['1', '3', '8', '7'],
      },
    ],
    wrong: ['`help ls`', '`ls --manual`', '`ls -h`'],
    why: "man affiche le manuel d'une commande, par section : 1 commandes, 2 appels système, 3 fonctions C ; pwd affiche le dossier courant.",
  },
  'pis-sh01-groups': {
    forms: [
      {
        ask: ["Quelle commande liste les noms des groupes de l'utilisateur contenu dans FT_USER ?"],
        right: ['`id -Gn $FT_USER`', '`groups $FT_USER`'],
        wrong: [
          '`id -u $FT_USER`',
          '`id -gn $FT_USER`',
          '`id -G $FT_USER`',
          '`whoami -G $FT_USER`',
        ],
      },
      {
        ask: ["Que fait `tr ' ' ','` de la sortie de `id -Gn` ?"],
        right: ['Il remplace chaque espace par une virgule'],
        wrong: [
          'Il supprime les espaces et les virgules',
          'Il remplace chaque virgule par une espace',
          'Il ajoute une virgule en fin de ligne',
          'Il trie les groupes séparés par des virgules',
        ],
      },
      {
        ask: ["Quelle commande supprime les retours à la ligne de ce qu'elle reçoit en entrée ?"],
        right: ["`tr -d '\\n'`"],
        wrong: ["`tr -s '\\n'`", "`sed 's/\\n//'`", "`cut -d '\\n'`", "`grep -v '\\n'`"],
      },
    ],
    wrong: ['`id -u $FT_USER`', '`id -gn $FT_USER`', '`id -G $FT_USER`'],
    why: 'id -Gn donne les noms de tous les groupes séparés par des espaces ; tr remplace caractère par caractère, et avec -d il les supprime.',
  },
  'pis-sh01-env': {
    forms: [
      {
        ask: ['Que fait `export FT_USER=nours` ?'],
        right: ['Elle crée la variable et la transmet aux programmes lancés'],
        wrong: [
          'Elle crée la variable pour le shell seul, sans la transmettre',
          'Elle crée un nouvel utilisateur système appelé nours',
          'Elle enregistre la variable dans le .bashrc pour toujours',
          "Elle change d'utilisateur et te connecte en tant que nours",
        ],
      },
      {
        ask: ["Après `export NAME=ana`, quelle commande affiche ana à l'écran ?"],
        right: ['`echo $NAME`', '`echo "$NAME"`'],
        wrong: ['`echo NAME`', '`echo %NAME%`', '`echo $name`', '`echo &NAME`'],
      },
      {
        ask: ["Quelle commande affiche toutes les variables d'environnement ?"],
        right: ['`env`', '`printenv`'],
        wrong: ['`echo $ENV`', '`set -e`', '`getenv`', '`ls /env`'],
      },
    ],
    wrong: [
      'Elle crée la variable pour le shell seul, sans la transmettre',
      'Elle crée un nouvel utilisateur système appelé nours',
      'Elle enregistre la variable dans le .bashrc pour toujours',
    ],
    why: "Une variable se lit avec $ et distingue les majuscules ; export la place dans l'environnement, dont héritent les programmes lancés par le shell (env l'affiche).",
  },
  'pis-sh01-shebang': {
    forms: [
      {
        ask: ["Que met-on sur la première ligne d'un script pour qu'il soit lancé par sh ?"],
        right: ['`#!/bin/sh`'],
        wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`', '`#include <sh>`'],
      },
      {
        ask: ['De quoi un script a-t-il besoin pour être lancé avec `./script.sh` ?'],
        right: ["Le droit d'exécution, avec chmod +x"],
        wrong: [
          'Que son nom finisse par .sh',
          'Être dans un dossier du PATH',
          "Le compiler d'abord avec cc",
          "Être lancé par l'utilisateur root",
        ],
      },
      {
        ask: [
          'Taper `script.sh` tout court donne « command not found », mais `./script.sh` marche. Pourquoi ?',
        ],
        right: ["Le dossier courant n'est pas dans le PATH"],
        wrong: [
          "Le script n'a pas le droit x",
          'Il manque le #!/bin/sh au script',
          'Seul root peut lancer des scripts',
          'Le shell ne lit pas les fichiers .sh',
        ],
      },
    ],
    wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`'],
    why: "Le shebang #! indique quel programme lit le script ; il faut le droit x, et ./ donne le chemin car le dossier courant n'est pas dans le PATH.",
  },
  'pis-sh01-args': {
    forms: [
      {
        ask: ['Avec `./s.sh a b c`, que vaut `$#` dans le script ?'],
        right: ['3'],
        wrong: ['4', '1', '0', '2'],
      },
      {
        ask: ['Avec `./s.sh a b c`, que vaut `$2` dans le script ?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`./s.sh`', '`a b c`'],
      },
      {
        ask: ['Que contient `$@` dans un script ?'],
        right: ['Tous les arguments, chacun séparément'],
        wrong: [
          'Seulement le dernier argument reçu',
          "Le nombre d'arguments reçus",
          'Le nom du script en cours',
          'Le code de sortie de la dernière commande',
        ],
      },
    ],
    wrong: ['4', '1', '0'],
    why: 'Dans un script, $1, $2… sont les arguments, $# leur nombre (sans compter le nom, qui est $0) et $@ tous à la fois.',
  },
  'pis-sh01-find-sh': {
    forms: [
      {
        ask: [
          'Quelle commande cherche, ici et dans les sous-dossiers, les fichiers qui finissent par .sh ?',
        ],
        right: ["`find . -name '*.sh'`", "`find . -type f -name '*.sh'`"],
        wrong: [
          "`find . -name '.sh'`",
          "`ls -R '*.sh'`",
          "`find . -type d -name '*.sh'`",
          "`grep -r '*.sh' .`",
        ],
      },
      {
        ask: ["Quelle commande retire le .sh final de chaque nom qu'elle reçoit ?"],
        right: ["`sed 's/\\.sh$//'`"],
        wrong: ["`tr -d '.sh'`", '`cut -d . -f 2`', "`sed 's/^\\.sh//'`", "`grep -v '\\.sh$'`"],
      },
    ],
    wrong: ["`find . -name '.sh'`", "`ls -R '*.sh'`", "`find . -type d -name '*.sh'`"],
    why: 'find parcourt les sous-dossiers selon le motif *.sh ; sed avec \\.sh$ ne retire que le .sh final, alors que tr supprimerait chaque s, h et point.',
  },
  'pis-sh01-basename': {
    forms: [
      {
        ask: ["Qu'affiche cette commande ?"],
        right: ['`find_sh`'],
        wrong: ['`find_sh.sh`', '`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
      },
      {
        ask: ["Qu'afficherait-elle sans le dernier argument, le `.sh` ?"],
        right: ['`find_sh.sh`'],
        wrong: [
          '`find_sh`',
          '`/home/ana/ex02`',
          '`ex02/find_sh.sh`',
          '`/home/ana/ex02/find_sh.sh`',
        ],
      },
      {
        ask: ["Qu'afficherait `dirname` avec le même chemin ?"],
        right: ['`/home/ana/ex02`'],
        wrong: ['`ex02`', '`/home/ana`', '`find_sh.sh`', '`/home/ana/ex02/find_sh`'],
      },
    ],
    wrong: ['`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
    why: 'basename garde la dernière partie du chemin et lui retire le suffixe donné ; dirname garde tout ce qui précède.',
  },
  'pis-sh01-count-files': {
    forms: [
      {
        ask: ['Pourquoi `find . | wc -l` compte-t-il un de plus que ce que contient le dossier ?'],
        right: ['Parce que find liste aussi le dossier lui-même, le .'],
        wrong: [
          'Parce que wc -l compte une ligne vide à la fin',
          'Parce que find compte deux fois les liens',
          'Parce que find ajoute une ligne avec le total',
          'Parce que wc -l compte aussi la commande find',
        ],
      },
      {
        ask: [
          'Un dossier contient 2 fichiers et un sous-dossier avec 1 fichier dedans. Combien de lignes donne `find . | wc -l` à cet endroit ?',
        ],
        right: ['5'],
        wrong: ['4', '3', '6', '2'],
      },
      {
        ask: [
          'Quelle commande compte seulement les fichiers ordinaires, ici et dans les sous-dossiers ?',
        ],
        right: ['`find . -type f | wc -l`'],
        wrong: [
          '`find . -type d | wc -l`',
          '`ls | wc -l`',
          '`find . -type f | wc -c`',
          '`ls -R | wc -l`',
        ],
      },
    ],
    wrong: [
      'Parce que wc -l compte une ligne vide à la fin',
      'Parce que find compte deux fois les liens',
      'Parce que find ajoute une ligne avec le total',
    ],
    why: 'find écrit un chemin par ligne, en commençant par le dossier lui-même (.) ; wc -l compte ces lignes, et -type f ne garde que les fichiers.',
  },
  'pis-sh01-wc': {
    forms: [
      {
        ask: ['Que compte `wc -c` ?'],
        right: ['Les octets'],
        wrong: ['Les lignes', 'Les mots', 'Les colonnes', 'Les fichiers'],
      },
      {
        ask: ['Quel nombre donne `echo hola mundo | wc -w` ?'],
        right: ['2'],
        wrong: ['1', '10', '11', '3'],
      },
      {
        ask: ['Quel nombre donne `echo hola | wc -c` ?'],
        right: ['5'],
        wrong: ['4', '1', '6', '2'],
      },
    ],
    wrong: ['Les lignes', 'Les mots', 'Les colonnes'],
    why: 'wc -l compte les lignes, -w les mots et -c les octets ; echo ajoute un retour à la ligne, qui est aussi un octet.',
  },
  'pis-sh01-mac': {
    forms: [
      {
        ask: ['Dans la sortie de `ifconfig`, quel mot précède chaque adresse MAC ?'],
        right: ['`ether`'],
        wrong: ['`inet`', '`inet6`', '`netmask`', '`broadcast`'],
      },
      {
        ask: ["Qu'est-ce qu'une adresse MAC ?"],
        right: ["L'identifiant physique d'une carte réseau"],
        wrong: [
          "L'adresse IP donnée par le routeur en DHCP",
          'Le nom de la machine sur le réseau local',
          "Le numéro de série d'un ordinateur Mac",
          "L'adresse du serveur DNS du réseau",
        ],
      },
      {
        ask: ["Laquelle de ces valeurs a la forme d'une adresse MAC ?"],
        right: ['`0a:1b:2c:3d:4e:5f`'],
        wrong: ['`10.12.4.42`', '`fe80::1`', '`255.255.255.0`', '`0a:1b:2c:3d`'],
      },
      {
        ask: ["Combien d'octets compte une adresse MAC ?"],
        right: ['6'],
        wrong: ['4', '8', '16', '12'],
      },
    ],
    wrong: ['`inet`', '`inet6`', '`netmask`'],
    why: "La MAC identifie la carte réseau : 6 octets en hexadécimal séparés par « : », qu'ifconfig affiche après le mot ether.",
  },
  'pis-sh01-quotes': {
    forms: [
      {
        ask: ['Que fait dans le shell une barre oblique inversée `\\` devant un caractère ?'],
        right: ['Elle lui retire son sens spécial'],
        wrong: [
          'Elle le supprime du nom du fichier',
          'Elle le met en majuscule',
          'Elle transforme la suite en commentaire',
          'Elle le remplace par son code ASCII',
        ],
      },
      {
        ask: ['Que développe le shell entre guillemets simples ?'],
        right: ['Rien : tout reste tel quel'],
        wrong: [
          'Les variables, mais pas le *',
          'Le *, mais pas les variables',
          'Tout, comme les guillemets doubles',
          'Seulement les barres inversées',
        ],
      },
      {
        ask: ['Entre guillemets doubles, lequel de ces caractères reste spécial ?'],
        right: ['`$`'],
        wrong: ['`*`', "`'`", '`#`', '`~`'],
      },
      {
        ask: ['Quelle commande crée un fichier dont le nom contient une espace, a b ?'],
        right: ["`touch 'a b'`", '`touch a\\ b`'],
        wrong: ['`touch a b`', '`touch {a b}`', '`touch a/ b`', '`touch [a b]`'],
      },
    ],
    wrong: [
      'Elle le supprime du nom du fichier',
      'Elle le met en majuscule',
      'Elle transforme la suite en commentaire',
    ],
    why: 'Les guillemets simples gardent tout littéral ; les doubles laissent actifs $, ` et \\ ; et \\ protège le caractère qui suit.',
  },
  'pis-sh01-skip': {
    forms: [
      {
        ask: ['Quelle commande garde une ligne sur deux, en commençant par la première ?'],
        right: ["`sed -n 'p;n'`", "`awk 'NR%2==1'`"],
        wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`', "`sed 'p;n'`"],
      },
      {
        ask: ["Que fait l'option `-n` de sed ?"],
        right: ["N'affiche rien sauf ce que tu demandes avec p"],
        wrong: [
          'Numérote chaque ligne affichée',
          'Ne traite que la première ligne',
          'Modifie le fichier lui-même, sans copie',
          'Retire les lignes vides de la sortie',
        ],
      },
      {
        ask: ['Quelle variable de awk contient le numéro de la ligne en cours ?'],
        right: ['`NR`'],
        wrong: ['`NF`', '`$0`', '`FS`', '`NL`'],
      },
    ],
    wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`'],
    why: "Avec -n, sed n'affiche que ce qu'on demande : p affiche la ligne et n passe à la suivante sans l'afficher, d'où les lignes 1, 3, 5…",
  },
  'pis-sh01-passwd': {
    forms: [
      {
        ask: ['Quelle commande retire les lignes de commentaire, celles qui commencent par # ?'],
        right: ["`grep -v '^#'`"],
        wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`", "`sed 's/#//'`"],
      },
      {
        ask: ['Quelle commande extrait le premier champ de lignes séparées par « : » ?'],
        right: ['`cut -d: -f1`', "`awk -F: '{print $1}'`"],
        wrong: ['`cut -f: -d1`', '`cut -d: -f2`', '`cut -c1`', "`awk '{print $1}'`"],
      },
      {
        ask: ['Que contient le premier champ de chaque ligne de /etc/passwd ?'],
        right: ["Le nom d'utilisateur"],
        wrong: [
          'Le mot de passe chiffré',
          'Le dossier personnel',
          'Le shell de connexion',
          'Le numéro du groupe',
        ],
      },
    ],
    wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`"],
    why: "/etc/passwd contient un utilisateur par ligne avec des champs séparés par « : », le premier étant le nom ; grep -v '^#' retire les lignes qui commencent par #.",
  },
  'pis-sh01-rev-sort': {
    forms: [
      {
        ask: ["Qu'affiche `echo hola | rev` ?"],
        right: ['`aloh`'],
        wrong: ['`hola`', '`HOLA`', '`ahol`', '`laoh`'],
      },
      {
        ask: ['Que fait `sort -r` ?'],
        right: ["Il trie à l'envers, du plus grand au plus petit"],
        wrong: [
          'Il inverse chaque ligne, lettre par lettre',
          'Il trie et retire les lignes répétées',
          'Il trie les lignes au hasard',
          'Il trie tout le contenu des sous-dossiers',
        ],
      },
      {
        ask: ['Quelle option de sort trie par valeur numérique, avec 9 avant 10 ?'],
        right: ['`-n`'],
        wrong: ['`-r`', '`-u`', '`-d`', '`-f`'],
      },
    ],
    wrong: ['`hola`', '`HOLA`', '`ahol`'],
    why: "rev inverse chaque ligne lettre par lettre ; sort -r inverse l'ordre des lignes et -n compare des nombres, pas du texte.",
  },
  'pis-sh01-sed-range': {
    forms: [
      {
        ask: ["Qu'affiche `sed -n '3,5p'` ?"],
        right: ['Les lignes 3 à 5, toutes deux incluses'],
        wrong: [
          'Les lignes 3 et 5, mais pas la 4',
          'Cinq lignes, à partir de la 3',
          'Toutes sauf les lignes 3 à 5',
          'La ligne 3 cinq fois de suite',
        ],
      },
      {
        ask: ['Pourquoi `"${FT_LINE1},${FT_LINE2}p"` est-il entre guillemets doubles ?'],
        right: ['Pour que le shell remplace les variables'],
        wrong: [
          'Pour que le shell ne touche pas aux variables',
          "Parce que sed n'accepte que les guillemets doubles",
          'Pour que les lignes sortent entre guillemets',
          'Pour que sed lise les variables lui-même',
        ],
      },
      {
        ask: ["Dans un fichier de 100 lignes, combien de lignes affiche `sed -n '7,15p'` ?"],
        right: ['9'],
        wrong: ['8', '15', '7', '22'],
      },
    ],
    wrong: [
      'Les lignes 3 et 5, mais pas la 4',
      'Cinq lignes, à partir de la 3',
      'Toutes sauf les lignes 3 à 5',
    ],
    why: "sed -n 'A,Bp' affiche de la ligne A à la ligne B, incluses ; avec des guillemets doubles, le shell remplace d'abord les variables par leur valeur.",
  },
  'pis-sh01-sed-s': {
    forms: [
      {
        ask: ["Qu'affiche `echo banana | sed 's/a/o/'` ?"],
        right: ['`bonana`'],
        wrong: ['`bonono`', '`banano`', '`obanana`', '`bnn`'],
      },
      {
        ask: ["Qu'affiche `echo banana | sed 's/a/o/g'` ?"],
        right: ['`bonono`'],
        wrong: ['`bonana`', '`banano`', '`bonona`', '`bnn`'],
      },
      {
        ask: ['Que fait le `g` à la fin de `s/a/b/g` ?'],
        right: ['Elle remplace toutes les occurrences de la ligne, pas seulement la première'],
        wrong: [
          'Elle applique le changement à toutes les lignes, pas seulement la première',
          'Elle cherche sans distinguer majuscules et minuscules',
          "Elle enregistre le résultat dans le même fichier d'entrée",
          'Elle affiche la ligne une nouvelle fois après le changement',
        ],
      },
    ],
    wrong: ['`banano`', '`obanana`', '`bnn`'],
    why: 'sed s/ancien/nouveau/ remplace la première occurrence de chaque ligne ; avec g, toutes celles de la ligne. Chaque ligne est traitée de toute façon.',
  },
  'pis-sh01-paste': {
    forms: [
      {
        ask: [
          'Quelle commande réunit toutes les lignes reçues en une seule, séparées par des virgules ?',
        ],
        right: ['`paste -sd, -`', '`paste -s -d, -`'],
        wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`', '`sort -t, -`'],
      },
      {
        ask: ["Que fait `sed 's/,/, /g'` d'une ligne ?"],
        right: ['Il met une espace après chaque virgule'],
        wrong: [
          'Il ne change que la première virgule',
          'Il supprime les virgules et les espaces',
          'Il met une virgule après chaque espace',
          'Il réunit toutes les lignes avec des virgules',
        ],
      },
    ],
    wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`'],
    why: "paste -s met toutes les lignes sur une seule et -d choisit le séparateur ; ensuite sed transforme chaque « , » en « , » suivi d'une espace.",
  },
  'pis-sh01-bc': {
    forms: [
      {
        ask: ["Qu'affiche `echo 'obase=2; 10' | bc` ?"],
        right: ['`1010`'],
        wrong: ['`2`', '`10`', '`0101`', '`1100`'],
      },
      {
        ask: ["Qu'affiche `echo 'ibase=2; 101' | bc` ?"],
        right: ['`5`'],
        wrong: ['`101`', '`3`', '`7`', '`1100101`'],
      },
      {
        ask: ['Que fait `ibase=16` dans bc ?'],
        right: ['Il lit en base 16 les nombres que tu écris'],
        wrong: [
          'Il écrit les résultats en base 16',
          'Il limite les nombres à 16 chiffres',
          'Il garde 16 décimales dans les divisions',
          'Il ajoute 16 à chaque nombre lu',
        ],
      },
      {
        ask: ['Pourquoi vaut-il mieux mettre `obase` avant `ibase` dans bc ?'],
        right: ["S'il vient après, sa valeur est lue dans la nouvelle base"],
        wrong: [
          'Parce que bc lit les instructions de droite à gauche',
          "Parce qu'ibase ne peut être changé qu'une fois",
          "Parce qu'obase efface ce qu'ibase a réglé",
          'Parce que sinon bc donne une erreur de syntaxe',
        ],
      },
    ],
    wrong: ['`2`', '`10`', '`0101`'],
    why: "Dans bc, ibase est la base de lecture et obase la base d'écriture ; une fois ibase changé, même le nombre d'obase est lu dans la nouvelle base.",
  },
  'pis-sh01-tr': {
    forms: [
      {
        ask: ["Que fait `tr 'abc' '012'` de son entrée ?"],
        right: ['Il change chaque a en 0, chaque b en 1 et chaque c en 2'],
        wrong: [
          'Il change chaque 0 en a, chaque 1 en b et chaque 2 en c',
          'Il remplace le mot abc entier par 012, rien de plus',
          'Il supprime les a, b et c, et ajoute 012 à la fin',
          'Il ne change que les premiers a, b et c de chaque ligne',
        ],
      },
      {
        ask: ["Qu'affiche `echo hola | tr 'ol' '01'` ?"],
        right: ['`h01a`'],
        wrong: ['`hola`', '`h10a`', '`01la`', '`h0la`'],
      },
      {
        ask: ["Que fait `tr -s ' '` ?"],
        right: ['Il réduit les espaces consécutives à une seule'],
        wrong: [
          'Il supprime toutes les espaces du texte',
          'Il change chaque espace en retour à la ligne',
          'Il trie les mots séparés par des espaces',
          'Il ajoute une espace entre chaque lettre',
        ],
      },
    ],
    wrong: [
      'Il change chaque 0 en a, chaque 1 en b et chaque 2 en c',
      'Il remplace le mot abc entier par 012, rien de plus',
      'Il supprime les a, b et c, et ajoute 012 à la fin',
    ],
    why: 'tr remplace caractère par caractère : le premier de la première liste par le premier de la seconde, et ainsi de suite ; -d supprime et -s réduit les répétitions.',
  },
  'pis-sh01-grep': {
    forms: [
      {
        ask: [
          'Quelle option de grep compte les lignes qui correspondent au lieu de les afficher ?',
        ],
        right: ['`-c`'],
        wrong: ['`-n`', '`-l`', '`-v`', '`-o`'],
      },
      {
        ask: ['Quelle option fait que grep ne distingue pas majuscules et minuscules ?'],
        right: ['`-i`'],
        wrong: ['`-I`', '`-w`', '`-x`', '`-c`'],
      },
      {
        ask: ["Qu'affiche `grep -v error log.txt` ?"],
        right: ['Les lignes de log.txt sans error'],
        wrong: [
          'Les lignes de log.txt avec error',
          'Combien de lignes de log.txt disent error',
          'La version de grep et son aide',
          'Tout log.txt, avec error en surbrillance',
        ],
      },
    ],
    wrong: ['`-n`', '`-l`', '`-v`'],
    why: 'grep affiche les lignes qui correspondent ; -v donne celles qui ne correspondent pas, -c leur nombre et -i ignore la casse.',
  },
  'pis-sh01-uniq': {
    forms: [
      {
        ask: ['Pourquoi met-on souvent `sort` avant `uniq` ?'],
        right: ['uniq ne fusionne que les doublons qui se suivent'],
        wrong: [
          "uniq ne marche que sur du texte trié à l'envers",
          'uniq a besoin de lignes numérotées pour marcher',
          'sort retire les doublons et uniq les compte',
          'Juste pour que uniq aille plus vite',
        ],
      },
      {
        ask: ['Que fait `sort -u` ?'],
        right: ['Il trie et retire les lignes répétées'],
        wrong: [
          'Il trie sans distinguer la casse',
          'Il trie et ne garde que les doublons',
          'Il trie seulement sur la première colonne',
          'Il trie par date de modification',
        ],
      },
      {
        ask: ['Que fait `uniq -c` ?'],
        right: ['Il indique devant combien de fois sort chaque ligne'],
        wrong: [
          'Il compte combien de lignes distinctes il y a',
          'Il ne garde que les lignes uniques',
          'Il compte les caractères de chaque ligne',
          'Il retire les doublons sans tenir compte de la casse',
        ],
      },
    ],
    wrong: [
      "uniq ne marche que sur du texte trié à l'envers",
      'uniq a besoin de lignes numérotées pour marcher',
      'sort retire les doublons et uniq les compte',
    ],
    why: "uniq compare chaque ligne à la précédente, il ne voit donc les doublons que s'ils sont côte à côte : d'où le sort avant (ou sort -u).",
  },
  'pis-sh01-head-tail': {
    forms: [
      {
        ask: ['Quelle commande affiche les 3 dernières lignes de f ?'],
        right: ['`tail -n 3 f`'],
        wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`', '`head -n -3 f`'],
      },
      {
        ask: ['Quelle commande affiche seulement la ligne 5 de f ?'],
        right: ['`head -n 5 f | tail -n 1`', "`sed -n '5p' f`"],
        wrong: [
          '`tail -n 5 f | head -n 1`',
          '`head -n 1 f | tail -n 5`',
          "`sed '5p' f`",
          '`head -n 5 f`',
        ],
      },
    ],
    wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`'],
    why: 'head -n N donne les N premières lignes et tail -n N les N dernières ; en les enchaînant, on isole une ligne précise.',
  },
  'pis-sh01-xargs': {
    forms: [
      {
        ask: ["Que fait `xargs` de ce qu'il reçoit en entrée ?"],
        right: ['Il le passe en arguments à la commande indiquée'],
        wrong: [
          'Il le passe en entrée standard de la commande',
          "Il l'enregistre dans une variable appelée ARGS",
          "Il compte combien d'arguments contient l'entrée",
          "Il l'écrit dans un fichier appelé xargs.out",
        ],
      },
      {
        ask: ["Pourquoi `find . -name '*.o' | rm` ne supprime-t-il rien ?"],
        right: ['rm ne lit pas les noms sur son entrée : il veut des arguments'],
        wrong: [
          'Parce que rm a besoin de -r pour des fichiers simples',
          'Parce que le tube ne transmet que la première ligne',
          "Parce que find écrit les noms sur la sortie d'erreur",
          'Parce que rm ne peut pas supprimer ce que find a trouvé',
        ],
      },
    ],
    wrong: [
      'Il le passe en entrée standard de la commande',
      "Il l'enregistre dans une variable appelée ARGS",
      "Il compte combien d'arguments contient l'entrée",
    ],
    why: "Un tube remplit l'entrée standard, mais rm, ls ou basename lisent leurs arguments ; xargs transforme ces lignes en arguments.",
  },
  'pis-sh01-pipeline': {
    forms: [
      {
        ask: ['Que produit ce pipeline ?'],
        right: ["Les 2 premiers noms d'utilisateur par ordre alphabétique"],
        wrong: [
          'Les 2 premières lignes de /etc/passwd, entières',
          "Les 2 derniers noms d'utilisateur, triés",
          'Les 2 premiers commentaires de /etc/passwd',
          'Les mots de passe des 2 premiers utilisateurs',
        ],
      },
      {
        ask: ["Qu'est-ce qui change si on enlève le `sort` ?"],
        right: ["Les 2 premiers sortent dans l'ordre du fichier"],
        wrong: [
          "Les 2 derniers du fichier sortent, à l'envers",
          "Rien : head trie déjà ce qu'il reçoit",
          'Erreur : head a besoin de sort avant lui',
          'Les lignes de commentaire sortent aussi',
        ],
      },
    ],
    wrong: [
      'Les 2 premières lignes de /etc/passwd, entières',
      "Les 2 derniers noms d'utilisateur, triés",
      'Les 2 premiers commentaires de /etc/passwd',
    ],
    why: 'Chaque commande travaille sur la sortie de la précédente : retirer les commentaires, garder le nom, trier, puis garder les 2 premiers.',
  },
  'pis-sh01-cut': {
    forms: [
      {
        ask: ["Qu'affiche `echo abcdef | cut -c2-4` ?"],
        right: ['`bcd`'],
        wrong: ['`abc`', '`bcde`', '`cd`', '`ef`'],
      },
      {
        ask: ["Qu'affiche `echo a:b:c | cut -d: -f2` ?"],
        right: ['`b`'],
        wrong: ['`a`', '`a:b`', '`:b:`', '`b:c`'],
      },
      {
        ask: ["Qu'affiche `echo a:b:c | cut -d: -f1,3` ?"],
        right: ['`a:c`'],
        wrong: ['`a:b`', '`a`', '`b:c`', '`a:b:c`'],
      },
    ],
    wrong: ['`abc`', '`bcde`', '`cd`'],
    why: 'cut -c découpe par positions de caractères et cut -d -f par champs ; N-M va de N à M inclus et 1,3 choisit des champs isolés.',
  },
}
