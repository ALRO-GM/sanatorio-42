/** Banco de Not-games en francés: Unix y procesos (`../unix.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const UNIX_FR: Readonly<Record<string, ConceptText>> = {
  'unix-sudo': {
    forms: [
      {
        ask: ['À quoi sert `sudo` ?', 'Que fait `sudo commande` ?'],
        right: [
          'Elle lance la commande en tant que root',
          'Elle lance la commande avec les droits de root',
        ],
        wrong: [
          'Elle change de shell pour cette commande',
          'Elle éteint la machine proprement',
          'Elle liste les processus de root',
          "Elle installe des paquets, et rien d'autre",
        ],
      },
      {
        ask: [
          'Dans quel fichier configure-t-on qui peut utiliser sudo ?',
          'Où sont les règles de sudo que tu modifies avec visudo ?',
        ],
        right: ['/etc/sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: [
      'Elle change de shell pour cette commande',
      'Elle éteint la machine proprement',
      'Elle liste les processus de root',
    ],
    why: "sudo exécute une commande en tant qu'un autre utilisateur (root, sauf indication contraire), selon les règles de /etc/sudoers, qu'on modifie avec visudo pour ne pas le casser.",
  },
  'unix-ssh-port': {
    forms: [
      {
        ask: ['Sur quel port SSH écoute-t-il par défaut ?', 'Quel est le port standard de SSH ?'],
        right: ['22'],
        wrong: ['21', '80', '443', '4242', '23'],
      },
      {
        ask: [
          'Quel fichier configure le serveur SSH ?',
          'Pour changer le port du serveur SSH, tu modifies…',
        ],
        right: ['/etc/ssh/sshd_config'],
        wrong: ['/etc/ssh/ssh_config', '~/.ssh/known_hosts', '/etc/hosts'],
      },
    ],
    wrong: ['21', '80', '443', '4242'],
    why: "SSH utilise le 22 par défaut ; le serveur (sshd) se configure dans sshd_config, et ssh_config, c'est celui du client.",
  },
  'unix-firewall': {
    forms: [
      {
        ask: ['Que fait un pare-feu comme UFW ?', 'À quoi sert UFW ?'],
        right: [
          'Il décide quelles connexions sont permises',
          'Il filtre le trafic réseau avec des règles',
        ],
        wrong: [
          'Il chiffre le disque et ses partitions',
          'Il gère les utilisateurs et leurs mots de passe',
          'Il chiffre le trafic qui sort du réseau',
          'Il accélère le réseau avec un cache',
        ],
      },
      {
        ask: [
          'Quelle commande UFW laisse passer les connexions vers le port 4242 ?',
          'Pour ouvrir le port 4242 dans UFW, on utilise…',
        ],
        right: ['ufw allow 4242'],
        wrong: ['ufw open 4242', 'ufw enable 4242', 'ufw deny 4242'],
      },
    ],
    wrong: [
      'Il chiffre le disque et ses partitions',
      'Il gère les utilisateurs et leurs mots de passe',
      'Il accélère le réseau avec un cache',
    ],
    why: 'Un pare-feu filtre le trafic selon des règles ; avec UFW, on ouvre des ports avec `allow`.',
  },
  'unix-lvm': {
    forms: [
      {
        ask: [
          'Quel avantage LVM a-t-il sur des partitions classiques ?',
          'Que permet de faire LVM ?',
        ],
        right: [
          'Redimensionner des volumes sans repartitionner',
          'Réunir plusieurs disques dans un même groupe',
        ],
      },
    ],
    wrong: [
      'Rendre la lecture du disque plus rapide',
      'Chiffrer les données de tout le disque',
      'Se passer de système de fichiers',
      'Faire des sauvegardes automatiques',
    ],
    why: 'LVM ajoute une couche entre disques et volumes : on peut les réunir, les agrandir ou les réduire sans toucher aux partitions.',
  },
  'unix-password-policy': {
    forms: [
      {
        ask: [
          'Où sont stockés les hashs des mots de passe sous Linux ?',
          'Quel fichier contient les hashs des mots de passe des utilisateurs ?',
        ],
        right: ['/etc/shadow'],
        wrong: ['/etc/passwd', '/etc/group', '/etc/sudoers', '/var/log/auth.log'],
      },
      {
        ask: [
          'Quel fichier liste les utilisateurs, leur shell et leur dossier ?',
          'Dans quel fichier chaque utilisateur apparaît-il avec son uid et son shell ?',
        ],
        right: ['/etc/passwd'],
        wrong: ['/etc/shadow', '/etc/group', '/etc/sudoers', '/etc/hosts'],
      },
    ],
    wrong: ['/etc/group', '/etc/sudoers', '/var/log/auth.log'],
    why: 'Tout le monde peut lire /etc/passwd (les utilisateurs) ; les hashs sont à part, dans /etc/shadow, que seul root peut lire.',
  },
  'proc-fork': {
    forms: [
      {
        ask: ['Que renvoie `fork()` dans le processus enfant ?', "Dans l'enfant, fork renvoie…"],
        right: ['0'],
        wrong: ['-1', '1', '2'],
      },
      {
        ask: ['Que renvoie `fork()` dans le processus parent ?', 'Dans le parent, fork renvoie…'],
        right: ["Le PID de l'enfant"],
        wrong: ['Le PID du parent', 'Toujours -1', 'Rien : il ne revient pas'],
      },
    ],
    wrong: ['Le PID du parent', 'Toujours -1', 'Rien : il ne revient pas'],
    why: "fork revient deux fois : 0 dans l'enfant et le PID de l'enfant dans le parent (-1 en cas d'échec).",
  },
  'proc-fork-count': {
    code: 'int main(void)\n{\n    fork();\n    fork();\n    printf("bonjour\\n");\n    return 0;\n}',
    forms: [
      {
        ask: [
          'Combien de fois « bonjour » est-il affiché ?',
          'Combien de lignes « bonjour » sortent ?',
        ],
        right: ['4'],
      },
      {
        ask: [
          'Combien de processus y a-t-il en tout en arrivant au printf ?',
          "En comptant l'original, combien de processus exécutent le printf ?",
        ],
        right: ['4'],
      },
    ],
    wrong: ['2', '3', '1', '8'],
    why: 'Chaque fork duplique tous les processus qui existaient déjà : 1 → 2 → 4 processus, et chacun affiche.',
  },
  'proc-exec': {
    forms: [
      {
        ask: [
          'Que devient le code qui suit un `execve` qui réussit ?',
          "Si execve réussit, qu'arrive-t-il aux lignes qui le suivent ?",
        ],
        right: ['Elles ne tournent pas : execve ne revient pas', 'Elles ne sont jamais exécutées'],
        wrong: [
          'Elles tournent quand le nouveau programme finit',
          'Elles tournent dans un thread à part, en même temps',
          "Elles tournent dans le parent, pas dans l'enfant",
        ],
      },
      {
        ask: [
          "Que renvoie `execve` en cas d'échec ?",
          'Quand execve ne peut pas lancer le programme, il renvoie…',
        ],
        right: ['-1'],
        wrong: ['0', '1', '127'],
      },
    ],
    wrong: [
      'Elles tournent quand le nouveau programme finit',
      'Elles tournent dans un thread à part, en même temps',
      "Elles tournent dans le parent, pas dans l'enfant",
    ],
    why: "execve remplace l'image du processus ; il ne revient (avec -1) que s'il n'y est pas arrivé.",
  },
  'proc-pipe-ends': {
    forms: [
      {
        ask: [
          'Après `pipe(fd)`, par quelle extrémité écrit-on ?',
          "Dans un pipe, quelle est l'extrémité d'écriture ?",
        ],
        right: ['fd[1]'],
        wrong: ['fd[0]', 'fd[2]', 'fd[-1]'],
      },
      {
        ask: [
          'Après `pipe(fd)`, par quelle extrémité lit-on ?',
          "Dans un pipe, quelle est l'extrémité de lecture ?",
        ],
        right: ['fd[0]'],
        wrong: ['fd[1]', 'fd[2]', 'fd[-1]'],
      },
    ],
    wrong: ['fd[2]', 'fd[-1]', 'fd[3]'],
    why: 'pipe remplit deux descripteurs : fd[0] pour lire et fd[1] pour écrire (comme stdin vaut 0 et stdout vaut 1).',
  },
  'proc-dup2': {
    forms: [
      {
        ask: ['Que fait `dup2(fd, 1)` ?', 'À quoi sert `dup2(fd, STDOUT_FILENO)` ?'],
        right: [
          'Il fait pointer le fd 1 au même endroit que fd',
          'Il redirige la sortie standard vers fd',
        ],
      },
    ],
    wrong: [
      'Il copie le contenu du fichier sur la sortie',
      'Il ferme fd et en ouvre un nouveau',
      'Il duplique le processus, comme fork',
      'Il écrit le numéro fd sur la sortie',
    ],
    why: "dup2 fait du second descripteur une copie du premier : c'est ainsi qu'on redirige la sortie vers un fichier ou un pipe.",
  },
  'proc-pipe-hang': {
    forms: [
      {
        ask: [
          'Ce « ls | wc » reste bloqué. Pourquoi ?',
          "Qu'est-ce qui empêche wc de se terminer ?",
        ],
        right: [
          'Le parent ne ferme pas fd[1] : wc ne voit pas EOF',
          'Le parent garde fd[1] ouvert, donc wc attend',
        ],
      },
    ],
    wrong: [
      'Il manque un troisième fork pour le parent',
      'ls écrit sur stderr, pas dans le pipe',
      "wait n'attend qu'un enfant, pas deux",
      'dup2 a ses arguments dans le mauvais ordre',
      'execve a besoin du chemin relatif',
    ],
    why: "Un lecteur ne voit la fin de fichier que quand toutes les extrémités d'écriture sont fermées, y compris celle dont le parent a hérité.",
  },
  'proc-zombie': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un processus zombie ?", "Quand dit-on qu'un processus est zombie ?"],
        right: [
          "Il a fini et son parent n'a pas fait wait",
          "Il est mort, mais personne n'a récupéré son statut",
        ],
        wrong: [
          "Il n'a plus de parent et init l'adopte",
          'Il utilise trop de mémoire et ralentit tout',
          "Il est arrêté par SIGSTOP jusqu'à un SIGCONT",
          'Il tourne encore après la fermeture du terminal',
        ],
      },
      {
        ask: [
          "Un enfant qui s'est terminé et pour lequel le parent n'a pas encore fait wait s'appelle…",
        ],
        right: ['Zombie'],
        wrong: ['Orphelin', 'Démon', 'Bloqué'],
      },
      {
        ask: [
          'Comment éviter de laisser des zombies ?',
          "Pour qu'un enfant terminé ne reste pas zombie, le parent doit…",
        ],
        right: ['Faire wait ou waitpid pour lui'],
        wrong: ['Le tuer avec kill', 'Refaire un fork', "Attendre avec sleep qu'il disparaisse"],
      },
    ],
    wrong: [
      "Il n'a plus de parent et init l'adopte",
      'Il utilise trop de mémoire et ralentit tout',
      "Il est arrêté par SIGSTOP jusqu'à un SIGCONT",
    ],
    why: "Une fois terminé, un enfant reste dans la table des processus jusqu'à ce que son parent récupère son statut avec wait.",
  },
  'sig-sigusr': {
    forms: [
      {
        ask: [
          'Quels deux signaux utilise-t-on en général dans minitalk pour envoyer des bits ?',
          'Quels signaux sont laissés libres pour ce que chaque programme veut en faire ?',
        ],
        right: ['SIGUSR1 et SIGUSR2'],
        wrong: [
          'SIGINT et SIGQUIT',
          'SIGKILL et SIGSTOP',
          'SIGSEGV et SIGBUS',
          'SIGALRM et SIGCHLD',
        ],
      },
      {
        ask: [
          'Avec quelle fonction envoie-t-on un signal à un autre processus ?',
          'Pour envoyer SIGUSR1 à un autre processus à partir de son PID, tu utilises…',
        ],
        right: ['kill'],
        wrong: ['signal', 'raise', 'send', 'sigaction'],
      },
    ],
    wrong: ['SIGINT et SIGQUIT', 'SIGKILL et SIGSTOP', 'SIGSEGV et SIGBUS'],
    why: "SIGUSR1 et SIGUSR2 n'ont pas de signification fixe ; kill ne sert pas qu'à tuer : il envoie n'importe quel signal.",
  },
  'sig-sigaction': {
    forms: [
      {
        ask: [
          "Qu'offre `sigaction` que `signal` n'a pas ?",
          'Pourquoi préfère-t-on sigaction à signal ?',
        ],
        right: [
          "Savoir quel PID l'a envoyé, avec SA_SIGINFO",
          'Le même comportement sur tous les systèmes',
        ],
        wrong: [
          'Traiter le signal plus vite que signal',
          'Marcher aussi sous Windows',
          'Pouvoir aussi intercepter SIGKILL',
          'Ne pas perdre les signaux qui arrivent ensemble',
        ],
      },
      {
        ask: [
          'Quels sont les deux signaux impossibles à intercepter ou à ignorer ?',
          "Pour quels signaux aucun gestionnaire n'est possible ?",
        ],
        right: ['SIGKILL et SIGSTOP'],
        wrong: ['SIGUSR1 et SIGUSR2', 'SIGINT et SIGQUIT', 'SIGTERM et SIGHUP'],
      },
    ],
    wrong: [
      'Traiter le signal plus vite que signal',
      'Marcher aussi sous Windows',
      'Pouvoir aussi intercepter SIGKILL',
    ],
    why: "signal change d'un système à l'autre ; sigaction fixe le comportement et donne des informations ; SIGKILL et SIGSTOP ne s'interceptent jamais.",
  },
  'sig-bits': {
    forms: [
      {
        ask: [
          'En envoyant un bit par signal, combien de signaux faut-il pour envoyer « Hi » ?',
          "Si chaque signal porte un bit, combien de signaux coûte l'envoi de 2 caractères ASCII ?",
        ],
        right: ['16'],
        wrong: ['2', '8', '32', '14'],
      },
      {
        ask: [
          "Combien de signaux faut-il pour envoyer un caractère, à raison d'un bit par signal ?",
          'Bit par bit, combien de signaux représente un char ?',
        ],
        right: ['8'],
        wrong: ['16', '1', '4', '7'],
      },
    ],
    wrong: ['2', '4', '32', '7'],
    why: 'Un char fait 8 bits : avec un bit par signal, ça fait 8 signaux par caractère.',
  },
  'sh-quotes': {
    forms: [
      {
        ask: ["Qu'affiche `echo '$HOME'` ?", 'Que donne `$HOME` entre guillemets simples ?'],
        right: ['$HOME, tel quel, sans expansion'],
        wrong: [
          'Le chemin de ton dossier personnel',
          'Le mot HOME, sans le dollar',
          'Une ligne vide, sans rien',
          'Une erreur de syntaxe à cause du $',
        ],
      },
      {
        ask: ['Qu\'affiche `echo "$HOME"` ?', 'Entre guillemets doubles, que devient `$HOME` ?'],
        right: ['Le chemin de ton dossier personnel'],
        wrong: [
          '$HOME, tel quel, sans expansion',
          'Le mot HOME, sans le dollar',
          '"$HOME", avec les guillemets',
          'Une erreur de syntaxe à cause du $',
        ],
      },
    ],
    wrong: [
      'Le mot HOME, sans le dollar',
      'Une erreur de syntaxe à cause du $',
      'Une ligne vide, sans rien',
    ],
    why: 'Les guillemets simples gardent tout au pied de la lettre ; les doubles laissent les variables se développer.',
  },
  'sh-heredoc': {
    forms: [
      {
        ask: ['Que fait `cat << FIN` ?', 'À quoi sert un heredoc (`<< FIN`) ?'],
        right: [
          "Il donne à cat les lignes tapées jusqu'à FIN",
          "Il passe en entrée le texte jusqu'au délimiteur",
        ],
      },
    ],
    wrong: [
      "Il ajoute FIN à la fin d'un fichier",
      'Il redirige la sortie de cat vers un fichier FIN',
      "Il lit le contenu d'un fichier appelé FIN",
      'Il compare la sortie de cat avec le mot FIN',
    ],
    why: "Le heredoc récupère des lignes jusqu'au délimiteur et les fournit comme entrée standard de la commande.",
  },
  'sh-exit-codes': {
    forms: [
      {
        ask: [
          "Quel code de sortie bash donne-t-il si la commande n'existe pas ?",
          "Qu'affiche `commande_inexistante; echo $?` ?",
        ],
        right: ['127'],
        wrong: ['1', '0', '126', '255'],
      },
      {
        ask: [
          'Quel code de sortie donne une commande interrompue avec Ctrl-C ?',
          'Après avoir arrêté une commande avec SIGINT, que vaut `$?` ?',
        ],
        right: ['130'],
        wrong: ['127', '2', '1', '255'],
      },
    ],
    wrong: ['1', '0', '-1', '255', '2'],
    why: "127, c'est « command not found » ; se terminer à cause du signal N donne 128 + N (SIGINT vaut 2 : 130).",
  },
  'sh-builtin-cd': {
    forms: [
      {
        ask: [
          'Pourquoi `cd` doit-il être un builtin du shell ?',
          'Pourquoi cd ne peut-il pas être un programme à part ?',
        ],
        right: [
          'Un enfant ne peut pas changer le dossier du parent',
          "Il changerait le dossier d'un enfant, pas celui du shell",
        ],
      },
    ],
    wrong: [
      "Parce qu'il faut les droits root pour y entrer",
      'Pour la compatibilité avec le shell de Windows',
      'Parce que le noyau interdit de lancer /bin/cd',
      "Parce que la norme de 42 l'exige",
    ],
    why: 'Le répertoire courant appartient à chaque processus : seul le shell lui-même peut changer le sien.',
  },
  'sh-env-path': {
    forms: [
      {
        ask: [
          'Comment le shell utilise-t-il PATH quand tu tapes une commande sans chemin ?',
          'Quand tu tapes `ls`, comment le shell trouve-t-il le programme ?',
        ],
        right: [
          "Il le cherche dans chaque dossier de PATH, dans l'ordre",
          "Il essaie les dossiers de PATH jusqu'à le trouver",
        ],
      },
    ],
    wrong: [
      'Il fouille tout le disque, dossier par dossier',
      'Il ne cherche que dans le dossier courant',
      'Il cherche dans /bin et nulle part ailleurs',
      'Il le cherche dans la liste de /etc/programs',
    ],
    why: "PATH est une liste de dossiers séparés par « : » ; on essaie chacun jusqu'à trouver un exécutable qui porte ce nom.",
  },
  'b2br-groups-host': {
    forms: [
      {
        ask: [
          'Dans Born2beroot, à quels groupes ton utilisateur doit-il appartenir ?',
          'Dans quels deux groupes le sujet de Born2beroot veut-il ton utilisateur ?',
        ],
        right: ['user42 et sudo'],
        wrong: ['root et sudo', 'user42 et root', 'users et adm', 'admin et user42'],
      },
      {
        ask: [
          'Quel nom de machine (hostname) demande Born2beroot ?',
          'Le hostname de ta machine Born2beroot doit être…',
        ],
        right: ['Ton login suivi de 42'],
        wrong: [
          'born2beroot, tout court',
          'Ton login en majuscules',
          'debian suivi de 42',
          'Ton login suivi de 4242',
        ],
      },
      {
        ask: [
          "Quelle commande met l'utilisatrice ana dans le groupe user42 sans lui retirer les autres ?",
          'Pour ajouter ana au groupe user42 en gardant ses autres groupes, on utilise…',
        ],
        right: ['usermod -aG user42 ana'],
        wrong: ['groupadd user42 ana', 'chgrp user42 ana', 'useradd -g user42 ana'],
      },
    ],
    wrong: ['root et sudo', 'user42 et root', 'users et adm'],
    why: "Le sujet veut un utilisateur à ton login dans les groupes user42 et sudo et une machine nommée d'après ton login suivi de 42 ; usermod -aG ajoute un groupe sans retirer ceux qui existent.",
  },
  'b2br-hardening': {
    forms: [
      {
        ask: [
          'Quelle ligne de sshd_config empêche de se connecter en SSH en tant que root ?',
          'Pour que personne ne puisse se connecter en SSH en tant que root, tu mets dans sshd_config…',
        ],
        right: ['`PermitRootLogin no`'],
        wrong: [
          '`AllowRoot no`',
          '`RootLogin disabled`',
          '`PasswordAuthentication no`',
          '`DenyGroups sudo`',
        ],
      },
      {
        ask: [
          'Que fait AppArmor, que Born2beroot veut actif dès le démarrage ?',
          'À quoi sert AppArmor sous Debian ?',
        ],
        right: ['Il limite ce que chaque programme peut faire'],
        wrong: [
          'Il chiffre les partitions du disque',
          'Il filtre le trafic réseau par port',
          'Il impose des mots de passe solides',
          'Il lance des tâches à heure fixe',
        ],
      },
    ],
    wrong: [
      'Il chiffre les partitions du disque',
      'Il filtre le trafic réseau par port',
      'Il impose des mots de passe solides',
    ],
    why: "PermitRootLogin no ferme SSH à root (ni mot de passe ni clé) ; AppArmor enferme chaque programme dans un profil qui dit ce qu'il peut toucher.",
  },
  'b2br-password': {
    forms: [
      {
        ask: [
          'Dans quel fichier fixe-t-on PASS_MAX_DAYS pour les utilisateurs créés ensuite ?',
          "L'expiration par défaut des mots de passe des nouveaux utilisateurs se règle dans…",
        ],
        right: ['/etc/login.defs'],
        wrong: ['/etc/passwd', '/etc/sudoers', '/etc/pam.d/sshd', '/etc/security/limits.conf'],
      },
      {
        ask: [
          'Quel module PAM impose longueur, majuscules et chiffres dans les mots de passe ?',
          'La politique de mots de passe solides de Born2beroot se règle avec…',
        ],
        right: ['pam_pwquality'],
        wrong: ['pam_limits', 'pam_env', 'pam_motd', 'pam_faildelay'],
      },
      {
        ask: [
          'Quelle longueur minimale de mot de passe demande Born2beroot ?',
          'Combien de caractères doit avoir, au minimum, un mot de passe dans Born2beroot ?',
        ],
        right: ['10'],
        wrong: ['8', '12', '6', '16'],
      },
    ],
    wrong: ['/etc/passwd', '/etc/sudoers', '/etc/hosts'],
    why: "login.defs fixe l'expiration des nouveaux utilisateurs (pour ceux qui existent déjà, on passe par chage) et pam_pwquality exige au moins 10 caractères avec une majuscule, une minuscule et un chiffre.",
  },
  'b2br-monitoring': {
    forms: [
      {
        ask: [
          'À quelle fréquence monitoring.sh doit-il afficher ses informations ?',
          'Dès le démarrage, monitoring.sh réaffiche ses données toutes les…',
        ],
        right: ['10 min'],
        wrong: ['5 min', '15 min', '30 min', '60 min'],
      },
      {
        ask: [
          'Quel service lance monitoring.sh toutes les quelques minutes ?',
          'Pour exécuter monitoring.sh à intervalles réguliers, on utilise…',
        ],
        right: ['cron'],
        wrong: ['at', 'sudo', 'ufw', 'apt'],
      },
      {
        ask: [
          'Avec quelle commande monitoring.sh écrit-il sur tous les terminaux ?',
          'Pour que le message apparaisse dans le terminal de chaque utilisateur, on utilise…',
        ],
        right: ['wall'],
        wrong: ['echo', 'write', 'printf', 'cat'],
      },
    ],
    wrong: ['sudo', 'ufw', 'echo'],
    why: "cron relance le script toutes les 10 minutes et wall envoie ce qu'il écrit sur tous les terminaux ouverts.",
  },
  'pipex-equivalent': {
    forms: [
      {
        ask: [
          'À quelle commande shell équivaut `./pipex infile "grep a" "wc -l" outfile` ?',
          'D\'après le sujet, `./pipex infile "grep a" "wc -l" outfile` fait la même chose que…',
        ],
        right: ['`grep a < infile | wc -l > outfile`'],
        wrong: [
          '`grep a > infile | wc -l < outfile`',
          '`grep a < infile > outfile | wc -l`',
          '`wc -l < infile | grep a > outfile`',
          '`grep a < outfile | wc -l > infile`',
        ],
      },
      {
        ask: [
          'Dans le bonus, à quoi équivaut `./pipex here_doc FIN cat "wc -l" outfile` ?',
          'Avec here_doc, `./pipex here_doc FIN cat "wc -l" outfile` fait la même chose que…',
        ],
        right: ['`cat << FIN | wc -l >> outfile`'],
        wrong: [
          '`cat << FIN | wc -l > outfile`',
          '`cat < FIN | wc -l >> outfile`',
          '`cat <<< FIN | wc -l >> outfile`',
        ],
      },
    ],
    wrong: [
      '`grep a > infile | wc -l < outfile`',
      '`grep a < infile > outfile | wc -l`',
      '`wc -l < infile | grep a > outfile`',
    ],
    why: "pipex se comporte comme `< infile cmd1 | cmd2 > outfile` ; avec here_doc, il lit jusqu'au délimiteur et ajoute à la fin avec >>, comme `cmd << LIMITER | cmd1 >> file`.",
  },
  'pipex-path': {
    forms: [
      {
        ask: [
          'Que vérifie `access(chemin, X_OK)` dans pipex ?',
          "Avant d'appeler execve, que regarde `access` avec X_OK ?",
        ],
        right: ['Si ce chemin existe et peut être exécuté'],
        wrong: [
          'Si un autre processus a ouvert le fichier',
          'Si la commande est dans la variable PATH',
          'Si tu as les droits root pour la lancer',
          "Si le programme s'est bien terminé",
        ],
      },
      {
        ask: [
          'Avec une simple commande `ls`, où pipex trouve-t-il les dossiers où la chercher ?',
          'Pour trouver `wc` sans chemin, où pipex prend-il la liste des dossiers ?',
        ],
        right: ['Dans la ligne PATH= de envp'],
        wrong: [
          'Dans le fichier /etc/programs',
          'Dans le dossier courant, et rien de plus',
          'Dans argv[0], le chemin de pipex',
          'Dans une liste fixe interne à execve',
        ],
      },
    ],
    wrong: [
      'Si un autre processus a ouvert le fichier',
      'Si tu as les droits root pour la lancer',
      "Si le programme s'est bien terminé",
    ],
    why: "execve ne cherche pas dans PATH : pipex découpe la ligne PATH= de envp sur les « : », colle le nom à chaque dossier et utilise access avec X_OK pour trouver celui qu'on peut exécuter.",
  },
  'pipex-wait': {
    forms: [
      {
        ask: [
          'Dans le shell, quel code de sortie donne `< in cmd1 | cmd2 > out` ?',
          "De quelle commande vient le code de sortie d'un pipeline `cmd1 | cmd2` ?",
        ],
        right: ['Celui de cmd2, la dernière commande'],
        wrong: [
          'Celui de cmd1, la première commande',
          'Le plus grand des deux codes',
          'La somme des deux codes',
          "Celui de cmd1 s'il a échoué",
        ],
      },
      {
        ask: [
          'Quelle macro extrait le code de sortie du status rempli par `waitpid` ?',
          "Après `waitpid(pid, &status, 0)`, le code de sortie de l'enfant se lit avec…",
        ],
        right: ['`WEXITSTATUS(status)`'],
        wrong: ['`WIFEXITED(status)`', '`WTERMSIG(status)`', '`WSTOPSIG(status)`', '`status >> 4`'],
      },
    ],
    wrong: [
      'Celui de cmd1, la première commande',
      'Le plus grand des deux codes',
      'La somme des deux codes',
    ],
    why: "Le shell renvoie le code de la dernière commande du pipeline ; waitpid le range codé dans status et WEXITSTATUS l'en sort (WIFEXITED dit seulement si la sortie a été normale).",
  },
  'talk-pid': {
    forms: [
      {
        ask: [
          'Comment le client de minitalk sait-il à quel processus envoyer les signaux ?',
          'Comment le client de minitalk trouve-t-il le serveur ?',
        ],
        right: ["On lui passe le PID qu'affiche le serveur"],
        wrong: [
          'Il le cherche par son nom avec la commande ps',
          'Il le lit dans un fichier créé par le serveur',
          'Il envoie les signaux à tous les processus',
          'Il appelle getpid(), qui donne celui du serveur',
        ],
      },
      {
        ask: [
          'Quelle fonction le serveur de minitalk utilise-t-il pour connaître son propre PID ?',
          'Pour afficher son PID au lancement, le serveur appelle…',
        ],
        right: ['getpid'],
        wrong: ['getppid', 'kill', 'pause', 'sigaction'],
      },
      {
        ask: [
          "Dans le bonus, d'où le serveur tire-t-il le PID du client à qui il confirme ?",
          "Pour lui envoyer la confirmation, d'où le serveur tire-t-il le PID du client ?",
        ],
        right: ['Du si_pid que donne sigaction avec SA_SIGINFO'],
        wrong: [
          'De getppid() : le client est son parent',
          'De getpid(), qui donne celui du client',
          "Du numéro du signal qu'il reçoit",
        ],
      },
    ],
    wrong: [
      'Il le cherche par son nom avec la commande ps',
      'Il le lit dans un fichier créé par le serveur',
      'Il envoie les signaux à tous les processus',
    ],
    why: 'Le serveur affiche son PID grâce à getpid et tu le donnes au client ; dans le bonus, sigaction avec SA_SIGINFO indique dans si_pid qui a envoyé le signal.',
  },
  'talk-ack': {
    forms: [
      {
        ask: [
          "Pourquoi le client de minitalk ne peut-il pas envoyer tous les signaux d'affilée, sans attendre ?",
          'Que se passe-t-il si le client envoie les signaux plus vite que le serveur ne les traite ?',
        ],
        right: ['Les signaux pareils en attente se fondent en un'],
        wrong: [
          "Le noyau n'en autorise qu'un par seconde",
          'kill échoue si le serveur est occupé',
          "SIGUSR1 et SIGUSR2 s'annulent entre eux",
          "Le serveur s'arrête s'il en reçoit trop",
        ],
      },
      {
        ask: [
          'Dans le bonus de minitalk, que fait le serveur quand il reçoit un message ?',
          "Comment le serveur du bonus confirme-t-il qu'il a reçu un message ?",
        ],
        right: ['Il renvoie un signal au client'],
        wrong: [
          'Il écrit le PID du client dans un fichier',
          "Il s'arrête jusqu'à ce qu'on le relance",
          'Il répond OK par un pipe',
          "Il affiche le message deux fois d'affilée",
        ],
      },
    ],
    wrong: [
      "Le noyau n'en autorise qu'un par seconde",
      'kill échoue si le serveur est occupé',
      "SIGUSR1 et SIGUSR2 s'annulent entre eux",
    ],
    why: 'Un signal standard ne se met pas en file : si un autre identique arrive avant que le premier soit traité, il est perdu ; le client attend donc, et dans le bonus le serveur confirme par un signal.',
  },
  'talk-unicode': {
    forms: [
      {
        ask: [
          'Pourquoi minitalk, qui envoie des octets bit par bit, marche-t-il déjà avec du texte en UTF-8 ?',
          'Avec un bit par signal, pourquoi des lettres comme « ñ » ou « € » arrivent-elles bien ?',
        ],
        right: ["Parce que l'UTF-8, ce sont des octets envoyés pareil"],
        wrong: [
          'Parce que chaque signal porte un caractère entier',
          'Parce que SIGUSR2 sert aux lettres spéciales',
          'Parce que write convertit les octets en ASCII',
          'Parce que le terminal devine la lettre qui manque',
        ],
      },
      {
        ask: ["À un bit par signal, combien de signaux coûte l'envoi de « ñ » en UTF-8 ?"],
        right: ['16'],
        wrong: ['8', '1', '32', '2'],
      },
      {
        ask: ['En envoyant un bit par signal, combien de signaux faut-il pour « € » en UTF-8 ?'],
        right: ['24'],
        wrong: ['8', '16', '32', '3'],
      },
    ],
    wrong: ['4', '12', '64'],
    why: "L'UTF-8 code chaque caractère sur 1 à 4 octets : le serveur recolle les octets et write les affiche ; « ñ » fait 2 octets (16 signaux) et « € », 3 (24).",
  },
  'msh-signals': {
    forms: [
      {
        ask: [
          "Que peut contenir l'unique variable globale qu'autorise minishell ?",
          'Que permet le sujet de minishell de garder dans sa variable globale ?',
        ],
        right: ['Le numéro du signal reçu, rien de plus'],
        wrong: [
          "Tout l'état du shell, dans une struct",
          "La liste des variables d'environnement",
          'Le dernier code de sortie, celui de $?',
          "L'historique des commandes tapées",
        ],
      },
      {
        ask: [
          'Que fait minishell avec Ctrl-C au prompt, quand rien ne tourne ?',
          'Tu appuies sur Ctrl-C au prompt vide de minishell. Que se passe-t-il ?',
        ],
        right: ['Il affiche un nouveau prompt sur une nouvelle ligne'],
        wrong: [
          'Il ferme minishell, comme exit',
          "Il efface l'écran et laisse le prompt en haut",
          "Il relance la dernière commande de l'historique",
          "Rien : il l'ignore comme Ctrl-\\",
        ],
      },
      {
        ask: [
          'Dans bash, combien vaut `$?` après un Ctrl-C au prompt ?',
          'Après un Ctrl-C au prompt de bash, `echo $?` affiche…',
        ],
        right: ['130'],
        wrong: ['0', '1', '2', '127'],
      },
    ],
    wrong: [
      'Il ferme minishell, comme exit',
      "Il efface l'écran et laisse le prompt en haut",
      "Il relance la dernière commande de l'historique",
    ],
    why: 'La globale ne garde que le numéro du signal (le reste va dans tes structures) ; Ctrl-C donne un nouveau prompt sur une nouvelle ligne et bash met $? à 130 (128 + SIGINT).',
  },
  'msh-readline': {
    forms: [
      {
        ask: [
          'Que fait Ctrl-D au prompt vide de minishell ?',
          'Tu appuies sur Ctrl-D dans minishell sans rien avoir tapé. Que se passe-t-il ?',
        ],
        right: ['Il quitte minishell, comme exit'],
        wrong: [
          'Il affiche un nouveau prompt sur une nouvelle ligne',
          'Il efface la dernière lettre tapée',
          'Il envoie SIGQUIT et laisse un core dump',
          'Rien : seuls Ctrl-C et Ctrl-\\ comptent',
        ],
      },
      {
        ask: [
          'Que renvoie `readline` si on appuie sur Ctrl-D sur une ligne vide ?',
          "Arrivé à la fin de l'entrée, readline renvoie…",
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`EOF`'],
      },
      {
        ask: [
          "Quelle fonction enregistre une ligne dans l'historique de readline ?",
          'Pour que la flèche du haut retrouve ce que tu as tapé, tu appelles…',
        ],
        right: ['add_history'],
        wrong: ['rl_on_new_line', 'rl_redisplay', 'rl_replace_line'],
      },
    ],
    wrong: [
      'Il affiche un nouveau prompt sur une nouvelle ligne',
      'Il efface la dernière lettre tapée',
      'Il envoie SIGQUIT et laisse un core dump',
    ],
    why: "Sur une ligne vide, Ctrl-D signale la fin de l'entrée : readline renvoie NULL et minishell quitte ; add_history garde chaque ligne pour les flèches.",
  },
  'msh-env-expand': {
    forms: [
      {
        ask: [
          "Dans bash, que fait `export VAR` sans `=` si VAR n'existait pas ?",
          'Avec VAR non définie, que produit `export VAR` dans bash ?',
        ],
        right: ["Elle la marque pour l'export, sans valeur"],
        wrong: [
          'Elle la crée vide, et env la montre comme VAR=',
          'Elle donne une erreur car il manque le =',
          "Elle la retire de l'environnement, comme unset",
          'Elle affiche la valeur de VAR',
        ],
      },
      {
        ask: [
          "Dans bash, que se passe-t-il avec `echo hola > $NADA` si NADA n'est pas définie ?",
          'Si `$NADA` est vide, que fait bash de `echo hola > $NADA` ?',
        ],
        right: ['Une erreur : redirection ambiguë'],
        wrong: [
          'Il écrit hola dans un fichier appelé $NADA',
          "Il écrit hola à l'écran, sans plus",
          'Il crée un fichier vide sans nom',
          'Il écrit hola dans un fichier appelé NADA',
        ],
      },
      {
        ask: [
          "Si USER vaut ana, qu'affiche `echo \"$USER\"'$USER'` ?",
          'Avec USER=ana, la commande `echo "$USER"\'$USER\'` affiche…',
        ],
        right: ['ana$USER'],
        wrong: ['anaana', '$USER$USER', "ana'$USER'", '$USERana'],
      },
    ],
    wrong: [
      'Elle donne une erreur car il manque le =',
      "Elle la retire de l'environnement, comme unset",
      'Elle affiche la valeur de VAR',
    ],
    why: 'export VAR sans valeur se contente de la marquer (elle apparaît dans export, pas dans env) ; rediriger vers une variable vide sans guillemets est ambigu ; et entre guillemets simples, $USER ne se développe pas.',
  },
}
