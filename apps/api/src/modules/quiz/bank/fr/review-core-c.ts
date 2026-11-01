/** Repaso de Not-games en francés: traducción de `../review-core-c.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_C_FR: Readonly<Record<string, ReviewEntry>> = {
  'libft-split': {
    title: 'ft_split et son tableau terminé par NULL',
    definition:
      "ft_split coupe une chaîne sur un caractère séparateur et renvoie un tableau de nouvelles chaînes. Les séparateurs qui se suivent ou qui sont au bord ne donnent pas de chaînes vides, et le tableau finit par un pointeur NULL pour que celui qui l'utilise sache où il s'arrête.",
    example: 'ft_split("  hola  42 ", \' \') donne {"hola", "42", NULL} : trois pointeurs alloués.',
  },
  'libft-itoa': {
    title: 'ft_itoa et INT_MIN',
    definition:
      'ft_itoa transforme un int en texte. Changer le signe avec n = -n échoue avec INT_MIN (-2147483648), car 2147483648 ne tient pas dans un int de 32 bits : on le traite à part ou on passe par un long. Il faut allouer le signe, les chiffres et le caractère nul.',
    example: "ft_itoa(-42) alloue 4 octets : '-', '4', '2' et '\\0'.",
  },
  'libft-ar': {
    title: 'libft.a, une bibliothèque statique',
    definition:
      "Une bibliothèque statique .a est une archive qui réunit des fichiers objets (.o). On la crée avec ar (le sujet l'exige) et, à l'édition de liens, les objets utilisés sont copiés dans le programme. Ce n'est ni un exécutable ni une bibliothèque dynamique.",
    example: 'ar rcs libft.a *.o, puis cc main.c -L. -lft pour la lier.',
  },
  'libft-lstclear': {
    title: 'ft_lstclear et la fonction del',
    definition:
      'ft_lstclear supprime un nœud et tous ceux qui le suivent : il libère le contenu de chacun avec la fonction del reçue, libère le nœud avec free et, à la fin, met le pointeur vers la liste à NULL. del existe parce que la liste ignore ce que contient content.',
    example: 'ft_lstclear(&lst, free) libère contenus et nœuds, et lst vaut ensuite NULL.',
  },
  'printf-return': {
    title: 'Ce que renvoie ft_printf',
    definition:
      "Comme le vrai printf, ft_printf renvoie le nombre de caractères qu'il a écrits, sauts de ligne et résultat de chaque conversion compris. Il ne renvoie pas le nombre de conversions ni d'arguments.",
    example: 'ft_printf("hola %d\\n", 42) écrit « hola 42\\n » et renvoie 8.',
  },
  'printf-pointer': {
    title: 'La conversion %p',
    definition:
      "%p reçoit un void * et écrit son adresse en hexadécimal, en minuscules et avec le préfixe 0x, exactement comme printf. Il ne complète pas avec des zéros et n'utilise pas de majuscules.",
    example: 'ft_printf("%p", (void *)42) affiche 0x2a.',
  },
  'printf-percent': {
    title: 'Le %% de ft_printf',
    definition:
      "%% est la conversion qui écrit un signe pourcentage. Elle ne prend aucun argument, et ce qui suit s'affiche tel quel : %%d donne le texte %d, pas un nombre.",
    example: 'ft_printf("%d%%", 50) affiche 50% et renvoie 3.',
  },
  'gnl-buffer-size': {
    title: 'BUFFER_SIZE dans get_next_line',
    definition:
      "BUFFER_SIZE est le nombre d'octets que demande chaque read ; on le fixe à la compilation avec -D. Il doit marcher avec 1 (un read par caractère) et avec des valeurs énormes, qui ne tiennent pas dans un tableau local sur la pile : le tampon s'alloue avec malloc.",
    example: 'cc -D BUFFER_SIZE=42 get_next_line.c ; avec BUFFER_SIZE=1, « hola\\n » coûte 5 read.',
  },
  'gnl-last-line': {
    title: 'La dernière ligne dans get_next_line',
    definition:
      "get_next_line renvoie chaque ligne avec son saut de ligne. La dernière peut ne pas en avoir, et elle est alors renvoyée telle quelle. Quand il n'y a plus rien à lire, la fonction renvoie NULL.",
    example: 'Avec « a\\nb », les appels donnent « a\\n », puis « b », puis NULL.',
  },
  'gnl-errors': {
    title: 'Les erreurs dans get_next_line',
    definition:
      "Si le descripteur n'est pas valide ou si read échoue, get_next_line renvoie NULL. Ce qui était gardé dans la variable static doit alors être libéré, pour ne pas laisser de fuite.",
    example:
      'get_next_line(-1) renvoie NULL ; si read donne -1, on libère le reste et on renvoie NULL.',
  },
  'gnl-bonus-fd': {
    title: 'Plusieurs fd dans le bonus de get_next_line',
    definition:
      'Le bonus demande de lire plusieurs descripteurs en même temps sans mélanger leurs lignes, avec une seule variable static. Pour cela, chaque fd garde son propre reste en attente, par exemple dans un tableau de restes indexé par le numéro du fd.',
    example: 'static char *rest[1024]; et on se sert de rest[fd] pour chaque descripteur.',
  },
  'b2br-groups-host': {
    title: 'Utilisateur, groupes et hostname dans Born2beroot',
    definition:
      "Born2beroot demande un utilisateur à ton login dans les groupes user42 et sudo, et une machine qui porte ton login suivi de 42. usermod -aG ajoute un groupe sans retirer ceux que l'utilisateur a déjà.",
    example: 'usermod -aG user42 ana et hostnamectl set-hostname ana42.',
  },
  'b2br-hardening': {
    title: 'SSH sans root, et AppArmor',
    definition:
      "Le sujet exige qu'on ne puisse pas se connecter en SSH en tant que root : on l'obtient avec PermitRootLogin no dans /etc/ssh/sshd_config. AppArmor, qui doit tourner dès le démarrage sous Debian, limite par un profil ce que chaque programme peut faire.",
    example: 'PermitRootLogin no, puis systemctl restart ssh ; aa-status montre les profils.',
  },
  'b2br-password': {
    title: 'La politique de mots de passe',
    definition:
      "L'expiration des mots de passe des nouveaux utilisateurs se règle dans /etc/login.defs (PASS_MAX_DAYS, PASS_MIN_DAYS, PASS_WARN_AGE) ; pour ceux qui existent, on passe par chage. La qualité (au moins 10 caractères, une majuscule, une minuscule et un chiffre) est vérifiée par pam_pwquality.",
    example: 'PASS_MAX_DAYS 30 dans login.defs et minlen=10 sur la ligne de pam_pwquality.',
  },
  'b2br-monitoring': {
    title: 'monitoring.sh, cron et wall',
    definition:
      "monitoring.sh affiche des infos sur la machine (CPU, mémoire, disque, connexions…) sur tous les terminaux toutes les 10 minutes dès le démarrage. cron s'occupe de le relancer toutes les 10 minutes et wall envoie le texte au terminal de chaque utilisateur.",
    example: '*/10 * * * * /root/monitoring.sh | wall, dans la crontab de root.',
  },
  'pipex-equivalent': {
    title: 'Ce que pipex imite',
    definition:
      "pipex reçoit un fichier d'entrée, deux commandes et un fichier de sortie, et fait la même chose que le shell avec < infile cmd1 | cmd2 > outfile. Dans le bonus, here_doc LIMITER lit jusqu'au délimiteur et écrit à la fin du fichier, comme << et >>.",
    example: './pipex here_doc FIN cat "wc -l" out équivaut à cat << FIN | wc -l >> out.',
  },
  'pipex-path': {
    title: 'Trouver la commande dans PATH',
    definition:
      'execve a besoin du chemin complet du programme et ne regarde pas PATH. pipex récupère la ligne PATH= de envp, la découpe sur les « : », colle le nom de la commande à chaque dossier et vérifie avec access(chemin, X_OK) lequel existe et peut être exécuté.',
    example: "Pour ls, il essaie /usr/local/bin/ls, /usr/bin/ls… jusqu'à ce qu'access renvoie 0.",
  },
  'pipex-wait': {
    title: 'waitpid et le code de sortie',
    definition:
      "Dans le shell, un pipeline se termine avec le code de sortie de sa dernière commande. waitpid range dans status la façon dont l'enfant a fini, sous forme codée : WIFEXITED dit s'il est sorti par exit et WEXITSTATUS donne le code de sortie.",
    example: 'waitpid(pid2, &status, 0); return (WEXITSTATUS(status));',
  },
  'talk-pid': {
    title: 'Le PID dans minitalk',
    definition:
      "Le serveur de minitalk affiche son PID au lancement (il l'obtient avec getpid) et le client le reçoit en argument pour savoir à qui envoyer les signaux avec kill. Dans le bonus, le serveur sait qui lui écrit grâce au si_pid que fournit sigaction avec SA_SIGINFO.",
    example: './server affiche 4242 ; ensuite ./client 4242 "hola".',
  },
  'talk-ack': {
    title: 'Pourquoi le client attend',
    definition:
      "Les signaux standard ne se mettent pas en file : si l'un arrive alors qu'un signal identique est encore en attente, les deux n'en font qu'un et un bit se perd. C'est pour ça que le client attend entre deux signaux ; dans le bonus, le serveur confirme chaque message en renvoyant un signal au client.",
    example: 'Le client envoie un bit et attend (avec pause ou usleep) avant le suivant.',
  },
  'talk-unicode': {
    title: 'Unicode dans minitalk',
    definition:
      "L'UTF-8 code chaque caractère sur 1 à 4 octets. Si minitalk envoie les octets 8 bits par 8 bits et que le serveur les recolle et les écrit, les caractères non ASCII arrivent bien sans rien de spécial ; ils coûtent seulement plus de signaux.",
    example: '« ñ » fait 2 octets (16 signaux) et « € », 3 octets (24 signaux).',
  },
  'msh-signals': {
    title: 'Les signaux dans minishell',
    definition:
      "minishell n'a droit qu'à une variable globale, et seulement pour garder le numéro du signal reçu. Avec Ctrl-C au prompt, on affiche un nouveau prompt sur une nouvelle ligne ; bash met alors $? à 130, soit 128 plus le numéro de SIGINT.",
    example: 'volatile sig_atomic_t g_signal; le gestionnaire fait g_signal = sig.',
  },
  'msh-readline': {
    title: "readline, Ctrl-D et l'historique",
    definition:
      "readline lit une ligne avec édition et renvoie NULL à la fin de l'entrée, ce que produit Ctrl-D sur une ligne vide : minishell doit alors quitter, comme exit. add_history enregistre chaque ligne pour la retrouver avec les flèches.",
    example: 'line = readline("minishell$ "); if (!line) quitter; else add_history(line);',
  },
  'msh-env-expand': {
    title: 'export, expansion et redirections',
    definition:
      "Dans bash, export VAR sans = ne fait que marquer la variable pour l'export (elle apparaît dans export, pas dans env). Les variables se développent avant les redirections : si l'une devient vide et n'a pas de guillemets, bash répond « ambiguous redirect ». Entre guillemets simples, rien ne se développe.",
    example:
      'echo hola > $NADA donne « ambiguous redirect » ; echo "$USER"\'$USER\' donne ana$USER.',
  },
}
