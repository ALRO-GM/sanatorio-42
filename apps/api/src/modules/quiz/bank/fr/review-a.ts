/** Repaso de Not-games en francés (1/2): traducción de `../review-a.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_A_FR: Readonly<Record<string, ReviewEntry>> = {
  'gen-binary-8': {
    title: 'Du binaire au décimal',
    definition:
      'En binaire, chaque chiffre vaut le double de celui à sa droite : 1, 2, 4, 8, 16… Pour passer en décimal, additionne les valeurs des positions qui contiennent un 1.',
    example: '1011 = 8 + 0 + 2 + 1 = 11. Et 1000 = 8.',
  },
  'gen-hex-ff': {
    title: 'Hexadécimal',
    definition:
      "Base 16 : les chiffres vont de 0 à 9, puis de A (10) à F (15). Chaque chiffre hexadécimal représente exactement 4 bits, c'est pour ça qu'on l'utilise autant pour écrire des octets.",
    example:
      '0xFF = 15 × 16 + 15 = 255 (un octet avec tous les bits à 1). 0x2A = 2 × 16 + 10 = 42.',
  },
  'gen-byte-bits': {
    title: 'Bits et octets',
    definition:
      'Un bit vaut 0 ou 1. Un octet fait 8 bits, soit 2⁸ = 256 combinaisons : de 0 à 255 en non signé, ou de -128 à 127 en signé.',
    example: 'Un char occupe 1 octet ; un int en occupe généralement 4 (32 bits).',
  },
  'gen-shift-left': {
    title: 'Décalage de bits',
    definition:
      "`x << n` décale les bits de n positions vers la gauche (ça multiplie par 2ⁿ tant qu'aucun bit ne sort) ; `x >> n` les décale vers la droite (ça divise par 2ⁿ, sans les décimales).",
    example: '5 << 1 = 10 (101 → 1010). 20 >> 2 = 5. Pour lire le bit i : (x >> i) & 1.',
  },
  'gen-and-mask': {
    title: 'AND, OR et masques',
    definition:
      "AND (&) garde à 1 les bits qui sont à 1 dans les deux nombres ; OR (|), ceux qui sont à 1 dans l'un ou l'autre ; XOR (^), ceux qui sont à 1 dans un seul. Un masque est un nombre qui sert à ne garder que certains bits.",
    example: '13 & 6 → 1101 & 0110 = 0100 = 4. 13 | 6 = 1111 = 15. x & 1 te dit si x est impair.',
  },
  'gen-complexity-binary-search': {
    title: 'O(log n)',
    definition:
      "Un algorithme est logarithmique si chaque étape élimine une part fixe des données (la moitié, par exemple). Doubler les données ne rajoute qu'une étape.",
    example: 'Chercher dans un tableau trié de 1 000 000 éléments : environ 20 étapes.',
  },
  'gen-complexity-nested': {
    title: 'Boucles imbriquées : O(n²)',
    definition:
      'Si, pour chaque élément, tu parcours tous les autres, le travail croît comme le carré : deux fois plus de données, quatre fois plus de temps.',
    example: "Comparer chaque paire d'un tableau de n éléments : n(n-1)/2 comparaisons.",
  },
  'gen-sort-complexity': {
    title: 'Trier coûte n·log n',
    definition:
      'Un tri par comparaisons ne peut pas faire mieux que O(n log n) dans le cas général. Le tri fusion (merge sort) et le tri par tas (heap sort) y arrivent toujours ; le tri à bulles est en O(n²).',
    example:
      '1 000 éléments : environ 10 000 comparaisons avec un bon tri, contre 500 000 avec le tri à bulles.',
  },
  'gen-stack-lifo': {
    title: 'Pile (LIFO)',
    definition:
      'Une pile ajoute et retire du même côté : le dernier entré est le premier sorti. Les opérations sont push (empiler) et pop (dépiler).',
    example:
      "L'historique « Annuler » d'un éditeur, ou les appels de fonctions (la pile d'appels).",
  },
  'gen-queue-fifo': {
    title: 'File (FIFO)',
    definition:
      "Une file ajoute d'un côté et retire de l'autre : le premier entré est le premier sorti.",
    example: "La file d'impression, ou les voisins en attente dans un parcours en largeur (BFS).",
  },
  'gen-list-vs-array': {
    title: 'Tableau ou liste chaînée',
    definition:
      "Un tableau occupe une zone de mémoire contiguë : l'adresse de l'élément i se calcule tout de suite (O(1)). Une liste chaînée est faite de nœuds séparés, chacun pointant vers le suivant : atteindre l'élément i prend i étapes, mais insérer au début est immédiat.",
    example: 'a[500] est direct ; dans une liste, il faut faire 500 fois node = node->next.',
  },
  'gen-recursion-base': {
    title: 'Cas de base de la récursivité',
    definition:
      "Une fonction récursive s'appelle elle-même sur un problème plus petit, et il lui faut un cas de base qui se résout sans s'appeler ; sinon, la pile déborde.",
    example: 'int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }',
  },
  'gen-recursion-trace': {
    title: 'Dérouler une récursion',
    definition:
      "Pour savoir ce qu'elle renvoie, déroule les appels jusqu'au cas de base, puis résous-les en remontant, de l'intérieur vers l'extérieur.",
    example: 'fact(4) = 4 × fact(3) = 4 × 3 × fact(2) = 4 × 3 × 2 × 1 = 24.',
  },
  'gen-git-push': {
    title: 'git commit et git push',
    definition:
      "`commit` enregistre un instantané des changements indexés dans ton dépôt local. `push` envoie tes commits vers le dépôt distant (GitHub, la vogsphere…). Sans push, personne d'autre ne les voit.",
    example: 'git add . && git commit -m "libft: ft_split" && git push',
  },
  'gen-git-add': {
    title: "L'index (git add)",
    definition:
      "Entre tes fichiers et le commit, il y a l'index (staging area) : `git add` choisit quels changements entrent dans le prochain commit. `git status` montre ce qui se trouve où.",
    example: 'git add src/ft_split.c → seul ce fichier entre dans le prochain commit.',
  },
  'gen-git-conflict': {
    title: 'Conflits de merge',
    definition:
      'Quand tu fusionnes des branches, git ne combine tout seul que les changements qui ne se chevauchent pas. Si les deux ont modifié les mêmes lignes, il marque le fichier avec les deux versions : à toi de choisir, de faire `git add` et de terminer le merge.',
    example:
      '<<<<<<< HEAD … ======= … >>>>>>> branche : tu gardes la bonne partie et tu supprimes les marqueurs.',
  },
  'gen-shell-pipe': {
    title: 'Pipes (|)',
    definition:
      "Un pipe relie la sortie standard d'une commande à l'entrée standard de la suivante : les données passent sans fichier intermédiaire.",
    example: 'cat notes.txt | grep 42 | wc -l compte les lignes qui contiennent 42.',
  },
  'gen-shell-redirect': {
    title: 'Redirections',
    definition:
      "`>` envoie la sortie dans un fichier (en le vidant d'abord), `>>` l'ajoute à la fin, `<` prend l'entrée depuis un fichier et `2>` redirige les erreurs.",
    example: 'make 2> erreurs.log; echo salut >> journal.txt',
  },
  'gen-shell-exit-status': {
    title: 'Code de retour ($?)',
    definition:
      "Toute commande se termine avec un nombre : 0 veut dire succès, toute autre valeur une erreur. `$?` contient celui de la dernière commande ; `&&` et `||` s'en servent pour décider quoi faire.",
    example:
      'ls fichier_inexistant; echo $? → 2. make && ./programme ne lance le programme que si la compilation a réussi.',
  },
  'gen-chmod': {
    title: 'Permissions (chmod)',
    definition:
      "Chaque fichier a des permissions pour son propriétaire, pour son groupe et pour tous les autres. En octal, la lecture vaut 4, l'écriture 2 et l'exécution 1, et elles s'additionnent.",
    example:
      'chmod 755 script.sh → rwx r-x r-x. chmod 600 cle → seul le propriétaire peut lire et écrire.',
  },
  'gen-ascii-a': {
    title: 'ASCII',
    definition:
      "ASCII associe un nombre à chaque caractère : les chiffres commencent à 48 ('0'), les majuscules à 65 ('A') et les minuscules à 97 ('a'). Entre une majuscule et sa minuscule, il y a 32.",
    example:
      "'a' - 32 = 'A'. '7' - '0' = 7 (c'est comme ça qu'on passe d'un caractère à un nombre).",
  },
  'gen-hash-collision': {
    title: 'Tables de hachage et collisions',
    definition:
      "Une table de hachage calcule, à partir de la clé, dans quelle case ranger la valeur : la recherche est quasi immédiate. Si deux clés tombent sur la même case, c'est une collision, qu'on résout en chaînant ou en cherchant une autre case.",
    example: 'Un dictionnaire Python ou un std::unordered_map en C++ sont des tables de hachage.',
  },
  'c-string-end': {
    title: 'Les chaînes de caractères en C',
    definition:
      "Une chaîne en C est un tableau de char terminé par le caractère nul '\\0'. Les fonctions comme strlen avancent jusqu'à le trouver ; sans lui, elles continuent à lire de la mémoire qui ne t'appartient pas.",
    example: 'char s[] = "salut"; occupe 6 octets : s, a, l, u, t et \\0. strlen(s) vaut 5.',
  },
  'c-sizeof-char': {
    title: 'sizeof',
    definition:
      "`sizeof` donne la taille en octets d'un type ou d'une variable, et elle est calculée à la compilation. sizeof(char) vaut 1 par définition ; un pointeur occupe 8 octets en 64 bits.",
    example: 'int a[10]; sizeof(a) = 40, mais dans une fonction qui reçoit int *a, sizeof(a) = 8.',
  },
  'c-malloc-free': {
    title: 'malloc et free',
    definition:
      "malloc alloue de la mémoire sur le tas (heap) et renvoie son adresse ; cette mémoire existe jusqu'à ce qu'on la libère avec free. Si on ne la libère pas, c'est une fuite de mémoire ; si on la libère deux fois, le programme plante.",
    example: 'char *s = malloc(n + 1); … free(s); s = NULL;',
  },
  'c-malloc-null': {
    title: 'Quand malloc échoue',
    definition:
      "malloc renvoie NULL quand l'allocation échoue. Vérifie-le toujours avant d'utiliser le pointeur, et libère ce que tu avais déjà alloué avant de renvoyer une erreur.",
    example: 'tab = malloc(sizeof(char *) * (n + 1)); if (!tab) return (NULL);',
  },
  'c-dangling': {
    title: 'Pointeurs pendants',
    definition:
      "Les variables locales vivent sur la pile et disparaissent à la sortie de la fonction. Renvoyer leur adresse laisse un pointeur vers de la mémoire qui sera réutilisée : utilise malloc ou reçois l'espace depuis l'extérieur.",
    example:
      'int *f(void) { int n = 42; return &n; } ← faux. Correct : int *p = malloc(sizeof(int)); *p = 42; return p;',
  },
  'c-memmove-overlap': {
    title: 'memcpy et memmove',
    definition:
      "Les deux copient n octets. memcpy suppose que la source et la destination ne se chevauchent pas ; memmove marche même si elles se chevauchent, en copiant vers l'avant ou vers l'arrière selon le cas.",
    example:
      "Décaler un tableau d'une case vers la droite : memmove(a + 1, a, (n - 1) * sizeof(int));",
  },
  'c-pointer-arith': {
    title: 'Arithmétique des pointeurs',
    definition:
      "Ajouter 1 à un pointeur avance d'un élément entier, pas d'un octet : p + 1 ajoute sizeof(*p) à l'adresse. C'est pour ça que a[i] revient à *(a + i).",
    example: 'int a[] = {10, 20, 30}; int *p = a; *(p + 2) vaut 30.',
  },
  'c-string-literal-write': {
    title: 'Littéraux de chaîne',
    definition:
      'Un littéral ("salut") est stocké en mémoire en lecture seule. char *s = "salut" pointe dessus et ne peut pas le modifier ; char s[] = "salut" en fait ta propre copie, qui, elle, se modifie.',
    example:
      'char *s = "salut"; s[0] = \'S\'; → segmentation fault. char s[] = "salut"; s[0] = \'S\'; → aucun souci.',
  },
  'c-off-by-one-malloc': {
    title: "L'octet du \\0",
    definition:
      "strlen ne compte pas le \\0, mais une copie de la chaîne en a besoin : alloue longueur + 1. Écrire un octet de trop, c'est un dépassement de tampon (et valgrind le détecte).",
    example: 'char *dup = malloc(strlen(s) + 1);',
  },
  'c-static-local': {
    title: 'Variables static',
    definition:
      "Une variable locale static n'est créée qu'une fois et garde sa valeur d'un appel à l'autre, même si elle n'est visible que dans la fonction. Une globale static n'est visible que dans son fichier.",
    example: 'get_next_line garde dans une static ce qui restait de la lecture précédente.',
  },
  'c-read-return': {
    title: 'read',
    definition:
      "read(fd, buf, n) essaie de lire n octets et renvoie combien il en a vraiment lu (ça peut être moins), 0 en fin de fichier et -1 en cas d'erreur. Il n'ajoute pas de \\0.",
    example: "while ((r = read(fd, buf, BUFFER_SIZE)) > 0) { buf[r] = '\\0'; … }",
  },
  'c-fd-standard': {
    title: 'Descripteurs de fichier',
    definition:
      "Un descripteur de fichier est un nombre qui désigne quelque chose d'ouvert (un fichier, un pipe, un socket). 0 est l'entrée standard, 1 la sortie standard et 2 la sortie d'erreur ; open renvoie le plus petit numéro libre.",
    example: 'write(2, "Error\\n", 6); écrit sur la sortie d\'erreur.',
  },
  'c-variadic': {
    title: 'Fonctions variadiques',
    definition:
      "Une fonction avec ... reçoit un nombre variable d'arguments. On les parcourt avec va_start, va_arg (en précisant le type de chacun) et va_end ; c'est un autre argument, comme le format de printf, qui dit combien il y en a et de quel type.",
    example: 'va_list ap; va_start(ap, format); int n = va_arg(ap, int); va_end(ap);',
  },
  'c-printf-formats': {
    title: 'Les formats de printf',
    definition:
      '%d entier signé, %u non signé, %x/%X hexadécimal, %c caractère, %s chaîne, %p adresse (0x…) et %% un signe pour cent.',
    example: 'printf("%x %X %u", 255, 255, -1) → ff FF 4294967295',
  },
  'c-char-promotion': {
    title: 'Promotion des arguments',
    definition:
      "Dans les arguments variables, char et short sont convertis en int, et float en double. C'est pour ça que dans ft_printf, un %c se lit avec va_arg(ap, int).",
    example: 'char c = va_arg(ap, int); (et pas va_arg(ap, char), qui est indéfini)',
  },
  'c-list-add-front': {
    title: 'Passage par valeur et pointeurs de pointeurs',
    definition:
      "En C, tout se passe par valeur : une fonction reçoit des copies. Pour modifier un pointeur qui est à l'extérieur (la tête d'une liste), il faut passer son adresse : un pointeur de pointeur.",
    example: 'void ft_lstadd_front(t_list **lst, t_list *new) { new->next = *lst; *lst = new; }',
  },
  'c-unsigned-loop': {
    title: 'Boucles avec unsigned',
    definition:
      "Un type non signé (size_t, unsigned) n'est jamais négatif : retirer 1 à 0 fait revenir à la plus grande valeur possible. Une boucle à rebours avec i >= 0 ne s'arrête jamais.",
    example: 'for (size_t i = n; i-- > 0;) va de n-1 à 0 sans problème.',
  },
  'c-signed-overflow': {
    title: "Dépassement d'entier",
    definition:
      "Si un int signé dépasse INT_MAX, le comportement est indéfini : le compilateur peut faire n'importe quoi. Les non signés, eux, reviennent à zéro (modulo 2ⁿ). Pour l'éviter, vérifie avant de calculer ou utilise un type plus grand.",
    example:
      'ft_atoi("2147483648") a besoin d\'un long pour détecter que la valeur ne tient pas dans un int.',
  },
  'c-makefile-relink': {
    title: 'Makefile et dépendances',
    definition:
      "make ne refait une cible que si l'une de ses dépendances est plus récente. Si la cible n'est pas un fichier (all, clean), on la déclare en .PHONY. Un Makefile bien fait ne refait pas l'édition de liens si rien n'a changé.",
    example: '$(NAME): $(OBJS)\\n\\t$(CC) $(OBJS) -o $(NAME)',
  },
  'unix-sudo': {
    title: 'sudo',
    definition:
      "sudo lance une commande en tant qu'un autre utilisateur (en général root), selon les règles de /etc/sudoers. On le modifie avec visudo, qui vérifie la syntaxe avant d'enregistrer.",
    example:
      'sudo apt update. Dans sudoers : Defaults passwd_tries=3, logfile="/var/log/sudo/sudo.log".',
  },
  'unix-ssh-port': {
    title: 'SSH',
    definition:
      'SSH ouvre un terminal chiffré sur une autre machine. Le serveur (sshd) écoute par défaut sur le port 22 et se configure dans /etc/ssh/sshd_config.',
    example: 'ssh user@localhost -p 4242. Dans sshd_config : Port 4242 et PermitRootLogin no.',
  },
  'unix-firewall': {
    title: 'Pare-feu (UFW)',
    definition:
      'Un pare-feu décide, selon des règles, quelles connexions entrent et sortent. UFW est une manière simple de configurer celui de Linux : tu ouvres ce dont tu as besoin et tu fermes le reste.',
    example: 'sudo ufw enable; sudo ufw allow 4242; sudo ufw status numbered',
  },
  'unix-lvm': {
    title: 'LVM',
    definition:
      "LVM ajoute une couche entre les disques et les volumes : les disques sont regroupés (groupes de volumes) et on y crée des volumes logiques qu'on peut agrandir ou réduire sans repartitionner.",
    example: 'lsblk affiche les volumes ; lvextend -L +5G /dev/vg/home en agrandit un.',
  },
  'unix-password-policy': {
    title: 'Utilisateurs et mots de passe',
    definition:
      "/etc/passwd liste les utilisateurs (nom, uid, dossier personnel, shell) et tout le monde peut le lire. Les hachages des mots de passe sont à part, dans /etc/shadow, que seul root peut lire. Les règles d'expiration sont dans /etc/login.defs.",
    example: 'chage -l user indique quand son mot de passe expire.',
  },
  'proc-fork': {
    title: 'fork',
    definition:
      "fork duplique le processus : à partir de là, il y en a deux identiques. Dans l'enfant, il renvoie 0 et dans le parent, le PID de l'enfant (-1 en cas d'échec) : chacun sait ainsi quoi faire.",
    example:
      'pid_t pid = fork(); if (pid == 0) { /* enfant */ } else { /* parent */ waitpid(pid, NULL, 0); }',
  },
  'proc-fork-count': {
    title: 'Compter les processus après plusieurs fork',
    definition:
      "Chaque fork double tous les processus qui l'exécutent. Après n fork à la suite (sans if), il y a 2ⁿ processus.",
    example: 'fork(); fork(); fork(); → 8 processus.',
  },
  'proc-exec': {
    title: 'execve',
    definition:
      "execve remplace le programme du processus par un autre : s'il réussit, il ne revient jamais. Il ne revient (avec -1) qu'en cas d'échec, donc ce qui suit, c'est la gestion de l'erreur.",
    example: 'execve("/bin/ls", args, envp); perror("execve"); exit(127);',
  },
  'proc-pipe-ends': {
    title: 'pipe',
    definition:
      "pipe(fd) crée un pipe : fd[1] est l'extrémité d'écriture et fd[0] celle de lecture. Ce qu'on écrit d'un côté se lit de l'autre, dans l'ordre.",
    example: 'pipe(fd); write(fd[1], "salut", 5); read(fd[0], buf, 5);',
  },
  'proc-dup2': {
    title: 'dup2',
    definition:
      "dup2(old, new) fait pointer le descripteur new vers la même chose que old (en fermant new d'abord). C'est comme ça qu'on redirige l'entrée ou la sortie d'un programme avant execve.",
    example:
      'dup2(fd[1], STDOUT_FILENO); close(fd[1]); → tout ce que le programme écrit part dans le pipe.',
  },
  'proc-pipe-hang': {
    title: 'Fermer les extrémités des pipes',
    definition:
      "Le processus qui lit un pipe ne reçoit la fin de fichier que quand toutes les extrémités d'écriture sont fermées, dans tous les processus. Une seule restée ouverte dans le parent suffit pour que le lecteur attende indéfiniment.",
    example: "Après les fork, le parent fait close(fd[0]); close(fd[1]); avant d'attendre.",
  },
  'proc-zombie': {
    title: 'Processus zombies',
    definition:
      "Un enfant qui se termine reste à l'état de zombie jusqu'à ce que le parent récupère son statut avec wait ou waitpid. Trop de zombies remplissent la table des processus.",
    example: 'waitpid(pid, &status, 0); WEXITSTATUS(status) donne son code de retour.',
  },
  'sig-sigusr': {
    title: 'Signaux et kill',
    definition:
      "Un signal est une notification qu'un processus envoie à un autre. SIGUSR1 et SIGUSR2 n'ont pas de sens fixé : ils servent à ce que tu veux. On les envoie avec kill(pid, signal).",
    example: 'Dans minitalk : SIGUSR1 vaut un bit 0 et SIGUSR2 un bit 1.',
  },
  'sig-sigaction': {
    title: 'sigaction',
    definition:
      "sigaction installe un gestionnaire de signal dont le comportement est le même sur tous les systèmes, et avec SA_SIGINFO, le gestionnaire reçoit des informations en plus, comme le PID de l'expéditeur. SIGKILL et SIGSTOP ne peuvent pas être interceptés.",
    example: 'sa.sa_sigaction = handler; sa.sa_flags = SA_SIGINFO; sigaction(SIGUSR1, &sa, NULL);',
  },
  'sig-bits': {
    title: 'Envoyer des données bit par bit',
    definition:
      "Avec deux signaux, tu peux envoyer un bit à la fois : un caractère, c'est 8 signaux. Le récepteur assemble les bits par décalage et, tous les 8, obtient un caractère.",
    example: 'c = (c << 1) | bit; if (++count == 8) { write(1, &c, 1); count = 0; c = 0; }',
  },
  'sh-quotes': {
    title: 'Les quotes dans le shell',
    definition:
      "Entre quotes simples, tout est littéral ; entre quotes doubles, les variables ($VAR) sont développées mais les mots ne sont pas découpés. Sans quotes, c'est développé puis découpé sur les espaces.",
    example: 'echo \'$USER\' → $USER. echo "$USER" → ton login.',
  },
  'sh-heredoc': {
    title: 'Heredoc (<<)',
    definition:
      "Un heredoc passe à la commande, comme entrée standard, les lignes que tu tapes jusqu'à une ligne qui est exactement le délimiteur.",
    example: 'cat << FIN\\nligne 1\\nligne 2\\nFIN → affiche les deux lignes.',
  },
  'sh-exit-codes': {
    title: 'Les codes de retour de bash',
    definition:
      "0, c'est le succès ; 1, une erreur générique ; 126, pas la permission d'exécuter ; 127, commande introuvable ; et 128 + N si un signal N a terminé le processus.",
    example: 'Ctrl-C (SIGINT, 2) → $? = 130. Ctrl-\\ (SIGQUIT, 3) → 131.',
  },
  'sh-builtin-cd': {
    title: 'Builtins',
    definition:
      "Un builtin est une commande que le shell exécute lui-même, sans lancer de programme. C'est indispensable pour tout ce qui change l'état du shell : cd, export, unset, exit.",
    example:
      "cd dans un processus enfant changerait le dossier de l'enfant, qui meurt aussitôt : le shell resterait là où il était.",
  },
  'sh-env-path': {
    title: 'PATH',
    definition:
      "PATH est une liste de dossiers séparés par « : ». Quand tu tapes une commande sans « / », le shell la cherche dans chaque dossier, dans l'ordre, et lance la première qu'il trouve.",
    example: 'PATH=/usr/local/bin:/usr/bin:/bin → ls est trouvé dans /usr/bin/ls.',
  },
}
