/** Banco de Not-games en francés: Unix y procesos (`../unix.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const UNIX_FR: Readonly<Record<string, ConceptText>> = {
  'unix-sudo': {
    forms: [
      {
        ask: ['À quoi sert `sudo` ?', 'Que fait `sudo commande` ?'],
        right: [
          "Elle lance la commande avec les droits d'un autre utilisateur (en général root)",
          'Elle lance la commande en tant que root, si tu en as le droit',
        ],
        wrong: [
          'Elle change de shell',
          'Elle éteint la machine',
          'Elle liste les processus',
          "Elle installe des paquets, et rien d'autre",
        ],
      },
      {
        ask: [
          'Dans quel fichier configure-t-on qui peut utiliser sudo ?',
          'Où sont les règles de sudo que tu modifies avec visudo ?',
        ],
        right: ['/etc/sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: ['Elle change de shell', 'Elle éteint la machine', 'Elle liste les processus'],
    why: "sudo exécute en tant qu'autre utilisateur selon les règles de /etc/sudoers, qu'on modifie avec visudo pour ne pas le casser.",
  },
  'unix-ssh-port': {
    forms: [
      {
        ask: ['Sur quel port SSH écoute-t-il par défaut ?', 'Quel est le port standard de SSH ?'],
        right: ['22'],
        wrong: ['21', '80', '443', '4242', '23'],
      },
      {
        ask: [
          'Quel fichier configure le serveur SSH ?',
          'Pour changer le port du serveur SSH, tu modifies…',
        ],
        right: ['/etc/ssh/sshd_config'],
        wrong: ['/etc/ssh/ssh_config', '~/.ssh/known_hosts', '/etc/hosts'],
      },
    ],
    wrong: ['21', '80', '443', '4242'],
    why: "SSH utilise le 22 par défaut ; le serveur (sshd) se configure dans sshd_config, et ssh_config, c'est celui du client.",
  },
  'unix-firewall': {
    forms: [
      {
        ask: ['Que fait un pare-feu comme UFW ?', 'À quoi sert UFW ?'],
        right: [
          'Il décide quelles connexions réseau sont autorisées et lesquelles ne le sont pas',
          'Il filtre le trafic réseau selon des ports et des règles',
        ],
        wrong: [
          'Il chiffre le disque',
          'Il gère les utilisateurs',
          'Il compresse les fichiers',
          'Il accélère le réseau',
        ],
      },
      {
        ask: [
          'Quelle commande UFW laisse passer les connexions vers le port 4242 ?',
          'Pour ouvrir le port 4242 dans UFW, tu utilises…',
        ],
        right: ['ufw allow 4242'],
        wrong: ['ufw open 4242', 'ufw enable 4242', 'ufw deny 4242'],
      },
    ],
    wrong: ['Il chiffre le disque', 'Il gère les utilisateurs', 'Il compresse les fichiers'],
    why: 'Un pare-feu filtre le trafic selon des règles ; avec UFW, on ouvre des ports avec `allow`.',
  },
  'unix-lvm': {
    forms: [
      {
        ask: [
          'Quel avantage LVM a-t-il sur des partitions classiques ?',
          'Que permet de faire LVM ?',
        ],
        right: [
          'Créer des volumes logiques et changer leur taille facilement',
          'Regrouper des disques et redimensionner des volumes sans repartitionner',
        ],
      },
    ],
    wrong: [
      'Rendre le disque plus rapide',
      'Chiffrer les données',
      'Se passer de système de fichiers',
      'Faire des sauvegardes automatiques',
    ],
    why: 'LVM ajoute une couche entre les disques et les volumes : on peut les regrouper, les agrandir ou les réduire sans toucher aux partitions.',
  },
  'unix-password-policy': {
    forms: [
      {
        ask: [
          'Où sont stockés les hashs des mots de passe sous Linux ?',
          'Quel fichier contient les hashs des mots de passe des utilisateurs ?',
        ],
        right: ['/etc/shadow'],
        wrong: ['/etc/passwd', '/etc/group', '/etc/sudoers', '/var/log/auth.log'],
      },
      {
        ask: [
          'Quel fichier liste les utilisateurs, leur shell et leur dossier ?',
          'Dans quel fichier chaque utilisateur apparaît-il avec son uid et son shell ?',
        ],
        right: ['/etc/passwd'],
        wrong: ['/etc/shadow', '/etc/group', '/etc/sudoers', '/etc/hosts'],
      },
    ],
    wrong: ['/etc/group', '/etc/sudoers', '/var/log/auth.log'],
    why: 'Tout le monde peut lire /etc/passwd (les utilisateurs) ; les hashs sont à part, dans /etc/shadow, que seul root peut lire.',
  },
  'proc-fork': {
    forms: [
      {
        ask: ['Que renvoie `fork()` dans le processus enfant ?', "Dans l'enfant, fork renvoie…"],
        right: ['0'],
        wrong: ['-1', '1', '2'],
      },
      {
        ask: ['Que renvoie `fork()` dans le processus parent ?', 'Dans le parent, fork renvoie…'],
        right: ["Le PID de l'enfant"],
        wrong: ['Le PID du parent', 'Toujours -1', 'Rien : il ne revient pas'],
      },
    ],
    wrong: ['Le PID du parent', 'Toujours -1', 'Rien : il ne revient pas'],
    why: "fork revient deux fois : 0 dans l'enfant et le PID de l'enfant dans le parent (-1 en cas d'échec).",
  },
  'proc-fork-count': {
    code: 'int main(void)\n{\n    fork();\n    fork();\n    printf("bonjour\\n");\n    return 0;\n}',
    forms: [
      {
        ask: [
          'Combien de fois « bonjour » est-il affiché ?',
          'Combien de lignes « bonjour » sortent ?',
        ],
        right: ['4'],
      },
      {
        ask: [
          'Combien de processus y a-t-il en tout en arrivant au printf ?',
          "En comptant l'original, combien de processus exécutent le printf ?",
        ],
        right: ['4'],
      },
    ],
    wrong: ['2', '3', '1', '8'],
    why: 'Chaque fork duplique tous les processus qui existaient déjà : 1 → 2 → 4 processus, et chacun affiche.',
  },
  'proc-exec': {
    forms: [
      {
        ask: [
          'Que devient le code placé après un `execve` qui réussit ?',
          'Si execve réussit, que deviennent les lignes qui le suivent ?',
        ],
        right: [
          'Elles ne sont jamais exécutées : le processus devient le nouveau programme',
          'Rien : le processus est remplacé et execve ne revient pas',
        ],
        wrong: [
          'Elles sont exécutées quand le nouveau programme se termine',
          'Elles sont exécutées dans un thread à part',
          'Elles sont exécutées dans le parent',
        ],
      },
      {
        ask: [
          "Que renvoie `execve` en cas d'échec ?",
          "Quand execve n'arrive pas à lancer le programme, il renvoie…",
        ],
        right: ['-1'],
        wrong: ['0', '1', '127'],
      },
    ],
    wrong: [
      'Elles sont exécutées quand le nouveau programme se termine',
      'Elles sont exécutées dans un thread à part',
      'Elles sont exécutées dans le parent',
    ],
    why: "execve remplace l'image du processus ; il ne revient (avec -1) que s'il n'y est pas arrivé.",
  },
  'proc-pipe-ends': {
    forms: [
      {
        ask: [
          'Après `pipe(fd)`, par quelle extrémité écrit-on ?',
          "Dans un pipe, quelle est l'extrémité d'écriture ?",
        ],
        right: ['fd[1]'],
        wrong: ['fd[0]', 'fd[2]', 'fd[-1]'],
      },
      {
        ask: [
          'Après `pipe(fd)`, par quelle extrémité lit-on ?',
          "Dans un pipe, quelle est l'extrémité de lecture ?",
        ],
        right: ['fd[0]'],
        wrong: ['fd[1]', 'fd[2]', 'fd[-1]'],
      },
    ],
    wrong: ['fd[2]', 'fd[-1]', 'fd[3]'],
    why: 'pipe remplit deux descripteurs : fd[0] pour lire et fd[1] pour écrire (comme stdin vaut 0 et stdout vaut 1).',
  },
  'proc-dup2': {
    forms: [
      {
        ask: ['Que fait `dup2(fd, 1)` ?', 'À quoi sert `dup2(fd, STDOUT_FILENO)` ?'],
        right: [
          'Il fait pointer le descripteur 1 vers la même chose que fd',
          'Il redirige la sortie standard là où pointe fd',
        ],
      },
    ],
    wrong: [
      'Il copie le contenu du fichier vers la sortie',
      'Il ferme fd et en ouvre un nouveau',
      'Il duplique le processus',
      "Il écrit fd à l'écran",
    ],
    why: "dup2 fait du second descripteur une copie du premier : c'est comme ça qu'on redirige la sortie vers un fichier ou un pipe.",
  },
  'proc-pipe-hang': {
    forms: [
      {
        ask: [
          'Ce « ls | wc » reste bloqué. Pourquoi ?',
          "Qu'est-ce qui empêche wc de se terminer ?",
        ],
        right: [
          'Le parent ne ferme pas fd[1] : wc ne reçoit jamais la fin de fichier',
          "Le parent laisse une extrémité d'écriture ouverte, donc wc attend indéfiniment",
        ],
      },
    ],
    wrong: [
      'Il manque un troisième fork',
      'ls écrit sur stderr',
      "wait n'attend qu'un seul enfant",
      "dup2 est utilisé à l'envers",
      'execve a besoin du chemin relatif',
    ],
    why: "Un lecteur ne voit la fin de fichier que quand toutes les extrémités d'écriture sont fermées, y compris celle dont le parent a hérité.",
  },
  'proc-zombie': {
    forms: [
      {
        ask: ["Qu'est-ce qu'un processus zombie ?", "Quand dit-on qu'un processus est un zombie ?"],
        right: [
          "Il s'est terminé, mais son parent n'a pas encore récupéré son statut",
          'Il est mort et attend que son parent fasse wait',
        ],
        wrong: [
          'Il ne répond pas aux signaux',
          'Il a perdu son parent',
          'Il utilise trop de mémoire',
          'Il est stoppé par SIGSTOP',
        ],
      },
      {
        ask: [
          "Un enfant qui s'est terminé et que le parent n'a pas encore attendu avec wait, on l'appelle…",
        ],
        right: ['Zombie'],
        wrong: ['Orphelin', 'Daemon', 'Bloqué'],
      },
      {
        ask: [
          'Comment éviter de laisser des zombies ?',
          "Pour qu'un enfant terminé ne reste pas zombie, le parent doit…",
        ],
        right: ['Appeler wait ou waitpid pour lui'],
        wrong: ['Le tuer avec kill', 'Refaire un fork', "Attendre avec sleep qu'il disparaisse"],
      },
    ],
    wrong: ['Il ne répond pas aux signaux', 'Il a perdu son parent', 'Il utilise trop de mémoire'],
    why: "Quand il se termine, un enfant reste dans la table des processus jusqu'à ce que le parent récupère son statut avec wait.",
  },
  'sig-sigusr': {
    forms: [
      {
        ask: [
          'Quels deux signaux utilise-t-on en général dans minitalk pour envoyer des bits ?',
          'Quels signaux sont laissés libres pour ce que chaque programme veut en faire ?',
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
          'Avec quelle fonction envoie-t-on un signal à un autre processus ?',
          'Pour envoyer SIGUSR1 à un autre processus à partir de son PID, tu utilises…',
        ],
        right: ['kill'],
        wrong: ['signal', 'raise', 'send', 'sigaction'],
      },
    ],
    wrong: ['SIGINT et SIGQUIT', 'SIGKILL et SIGSTOP', 'SIGSEGV et SIGBUS'],
    why: "SIGUSR1 et SIGUSR2 n'ont pas de sens fixé ; kill ne sert pas qu'à tuer : il envoie n'importe quel signal.",
  },
  'sig-sigaction': {
    forms: [
      {
        ask: [
          "Qu'apporte `sigaction` que `signal` n'offre pas ?",
          'Pourquoi préfère-t-on sigaction à signal ?',
        ],
        right: [
          "Un comportement défini et plus de contrôle (masque, flags, qui l'a envoyé)",
          "Avec SA_SIGINFO, tu connais le PID de l'expéditeur, entre autres",
        ],
        wrong: [
          'Elle est plus rapide',
          'Elle marche sous Windows',
          'Elle envoie le signal deux fois',
        ],
      },
      {
        ask: [
          'Quels deux signaux ne peuvent être ni interceptés ni ignorés ?',
          "Pour quels signaux aucun gestionnaire n'est possible ?",
        ],
        right: ['SIGKILL et SIGSTOP'],
        wrong: ['SIGUSR1 et SIGUSR2', 'SIGINT et SIGQUIT', 'SIGTERM et SIGHUP'],
      },
    ],
    wrong: ['Elle est plus rapide', 'Elle marche sous Windows', 'Elle envoie le signal deux fois'],
    why: "signal varie d'un système à l'autre ; sigaction fixe le comportement et donne des informations ; SIGKILL et SIGSTOP ne sont jamais interceptés.",
  },
  'sig-bits': {
    forms: [
      {
        ask: [
          'En envoyant un bit par signal, combien de signaux faut-il pour envoyer « Hi » ?',
          "Si chaque signal porte un bit, combien de signaux coûte l'envoi de 2 caractères ASCII ?",
        ],
        right: ['16'],
        wrong: ['2', '8', '32', '14'],
      },
      {
        ask: [
          "Combien de signaux faut-il pour envoyer un caractère, à raison d'un bit par signal ?",
          'Bit par bit, combien de signaux représente un char ?',
        ],
        right: ['8'],
        wrong: ['16', '1', '4', '7'],
      },
    ],
    wrong: ['2', '4', '32', '7'],
    why: 'Un char fait 8 bits : avec un bit par signal, ça fait 8 signaux par caractère.',
  },
  'sh-quotes': {
    forms: [
      {
        ask: ["Qu'affiche `echo '$HOME'` ?", 'Que devient `$HOME` entre guillemets simples ?'],
        right: ['$HOME, tel quel, sans expansion'],
        wrong: ['Le chemin de ton dossier personnel', 'Une erreur de syntaxe', 'Rien', 'HOME'],
      },
      {
        ask: ['Qu\'affiche `echo "$HOME"` ?', 'Que devient `$HOME` entre guillemets doubles ?'],
        right: ['La variable est développée : on obtient le chemin de ton dossier personnel'],
        wrong: ['$HOME, tel quel, sans expansion', 'Une erreur de syntaxe', 'Rien', 'HOME'],
      },
    ],
    wrong: ['Une erreur de syntaxe', 'Rien', 'HOME'],
    why: 'Les guillemets simples gardent tout tel quel ; les guillemets doubles laissent les variables se développer.',
  },
  'sh-heredoc': {
    forms: [
      {
        ask: ['Que fait `cat << FIN` ?', 'À quoi sert un heredoc (`<< FIN`) ?'],
        right: [
          "Il lit des lignes jusqu'à une ligne FIN et les donne à cat en entrée",
          "Il passe à la commande, en entrée, le texte écrit jusqu'au délimiteur",
        ],
      },
    ],
    wrong: [
      "Il ajoute FIN à la fin d'un fichier",
      'Il redirige la sortie vers un fichier appelé FIN',
      'Il lit le fichier FIN',
      'Il compare la sortie de cat avec FIN',
    ],
    why: "Le heredoc récupère les lignes jusqu'au délimiteur et les donne comme entrée standard de la commande.",
  },
  'sh-exit-codes': {
    forms: [
      {
        ask: [
          "Quel code de sortie bash donne-t-il si la commande n'existe pas ?",
          "Qu'affiche `commande_inexistante; echo $?` ?",
        ],
        right: ['127'],
        wrong: ['1', '0', '126', '255'],
      },
      {
        ask: [
          'Quel code de sortie donne une commande interrompue avec Ctrl-C ?',
          'Après avoir arrêté une commande avec SIGINT, que vaut `$?` ?',
        ],
        right: ['130'],
        wrong: ['127', '2', '1', '255'],
      },
    ],
    wrong: ['1', '0', '-1', '255', '2'],
    why: "127, c'est « command not found » ; se terminer à cause du signal N donne 128 + N (SIGINT vaut 2 : 130).",
  },
  'sh-builtin-cd': {
    forms: [
      {
        ask: [
          'Pourquoi `cd` doit-il être un builtin du shell ?',
          'Pourquoi cd ne peut-il pas être un programme à part ?',
        ],
        right: [
          'Un processus enfant ne peut pas changer le répertoire de son parent',
          "Il changerait le répertoire d'un enfant qui meurt aussitôt, pas celui du shell",
        ],
      },
    ],
    wrong: [
      'Pour la vitesse',
      "Parce que /bin/cd n'existe pas",
      "Parce qu'il a besoin des droits root",
      'Pour la compatibilité avec Windows',
    ],
    why: 'Le répertoire courant est propre à chaque processus : seul le shell lui-même peut changer le sien.',
  },
  'sh-env-path': {
    forms: [
      {
        ask: [
          'À quoi sert la variable PATH pour le shell ?',
          'Quand tu tapes `ls`, comment le shell trouve-t-il le programme ?',
        ],
        right: [
          "Il le cherche dans les dossiers de cette liste, dans l'ordre",
          "Il essaie chaque dossier de la liste jusqu'à trouver un exécutable",
        ],
      },
    ],
    wrong: [
      'Il cherche sur tout le disque',
      'Il ne regarde que dans le dossier courant',
      'Il le télécharge depuis Internet',
      'Il regarde dans /etc/programs',
    ],
    why: "PATH est une liste de dossiers séparés par `:` ; on essaie chacun d'eux jusqu'à trouver un exécutable de ce nom.",
  },
}
