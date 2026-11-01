/** Banco de Not-games en francés: redes, servidores y web (`../network.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const NETWORK_FR: Readonly<Record<string, ConceptText>> = {
  'net-mask-hosts': {
    forms: [
      {
        ask: [
          "Combien d'adresses d'hôtes tiennent dans un réseau /24 ?",
          "Pour combien d'hôtes le masque 255.255.255.0 laisse-t-il de la place ?",
        ],
        right: ['254'],
        wrong: ['256', '255', '24', '128'],
      },
      {
        ask: [
          "Combien d'adresses d'hôtes tiennent dans un réseau /30 ?",
          "Pour combien d'hôtes le masque 255.255.255.252 laisse-t-il de la place ?",
        ],
        right: ['2'],
        wrong: ['4', '30', '1', '3'],
      },
    ],
    wrong: ['256', '255', '24', '128', '512'],
    why: 'Il reste 32 - n bits pour les hôtes : 2^(32-n) adresses, moins celle du réseau et celle de broadcast.',
  },
  'net-mask-dotted': {
    forms: [
      {
        ask: [
          'Quel masque correspond à /26 ?',
          "Comment s'écrit /26 en notation décimale pointée ?",
        ],
        right: ['255.255.255.192'],
        wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.26', '255.255.255.0'],
      },
      {
        ask: [
          'Quel masque correspond à /16 ?',
          "Comment s'écrit /16 en notation décimale pointée ?",
        ],
        right: ['255.255.0.0'],
        wrong: ['255.0.0.0', '255.255.255.0', '255.255.16.0'],
      },
    ],
    wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.0'],
    why: "Ce sont n bits à 1 d'affilée : /26 = 24 + 2 bits dans le dernier octet = 11000000 = 192.",
  },
  'net-same-network': {
    forms: [
      {
        ask: [
          'Est-ce que 192.168.1.10/25 et 192.168.1.200/25 sont sur le même réseau ?',
          'Avec un masque /25, est-ce que 192.168.1.10 et 192.168.1.200 peuvent se parler directement ?',
        ],
        right: [
          'Non : /25 coupe le dernier octet en 0–127 et 128–255',
          'Non : chacune tombe dans une moitié',
        ],
        wrong: [
          'Oui : les trois premiers octets sont égaux',
          'Oui, mais seulement via un routeur',
          'Ça dépend de leur passerelle',
          "Impossible à dire sans l'adresse MAC",
        ],
      },
      {
        ask: [
          'Est-ce que 10.0.0.5/24 et 10.0.0.250/24 sont sur le même réseau ?',
          'Avec un masque /24, est-ce que 10.0.0.5 et 10.0.0.250 peuvent se parler directement ?',
        ],
        right: [
          'Oui : elles partagent les trois premiers octets',
          'Oui : les deux sont en 10.0.0.x',
        ],
        wrong: [
          'Non : /24 coupe le dernier octet en deux moitiés',
          "Non : 250 sort de la plage d'hôtes",
          'Seulement via un routeur',
          "Impossible à dire sans l'adresse MAC",
        ],
      },
    ],
    wrong: [
      'Seulement via un routeur',
      'Ça dépend de leur passerelle',
      "Impossible à dire sans l'adresse MAC",
    ],
    why: 'Même réseau = mêmes bits dans la partie du masque. En /25, le bit de poids fort du dernier octet compte.',
  },
  'net-private': {
    forms: [
      {
        ask: [
          'Laquelle de ces adresses est privée (elle ne sort pas telle quelle sur Internet) ?',
          'Laquelle de ces adresses est une adresse privée de réseau local ?',
        ],
        right: ['192.168.0.10', '10.1.2.3', '172.16.5.4'],
        wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250', '142.250.1.1'],
      },
      {
        ask: [
          "Vers quoi pointe l'adresse 127.0.0.1 ?",
          'Qui reçoit ce que tu envoies à 127.0.0.1 ?',
        ],
        right: ['La machine elle-même', "L'hôte même qui l'envoie"],
        wrong: [
          'La passerelle',
          'Le DNS de Google',
          'Toutes les machines du réseau',
          'Le premier routeur du réseau',
        ],
      },
    ],
    wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250'],
    why: "10/8, 172.16/12 et 192.168/16 sont privées ; 127.0.0.1, c'est toi.",
  },
  'net-gateway': {
    forms: [
      {
        ask: [
          'À quoi sert la passerelle (gateway) ?',
          "Quel rôle joue la passerelle d'un réseau ?",
        ],
        right: [
          "Elle reçoit ce qui va vers d'autres réseaux et le relaie",
          "C'est la sortie du réseau local vers les autres",
        ],
        wrong: [
          'Elle traduit les noms de domaine en IP',
          'Elle donne une adresse IP à chaque machine',
          'Elle chiffre le trafic qui sort du réseau',
          'Elle donne un nom à chaque machine du réseau',
        ],
      },
      {
        ask: [
          "À quelles destinations s'applique la route 0.0.0.0/0 ?",
          'Vers quelles destinations mène une route 0.0.0.0/0 ?',
        ],
        right: ["Toutes celles qui n'ont pas d'autre route"],
        wrong: [
          'Aucune : la route est désactivée',
          'Seulement les machines du réseau local',
          'Seulement la machine elle-même, comme 127.0.0.1',
        ],
      },
    ],
    wrong: [
      'Elle traduit les noms de domaine en IP',
      'Elle donne une adresse IP à chaque machine',
      'Elle chiffre le trafic qui sort du réseau',
    ],
    why: "Ce qui n'est pas sur ton réseau part vers le routeur (la passerelle) ; 0.0.0.0/0 correspond à tout, c'est donc la route par défaut.",
  },
  'net-tcp-udp': {
    forms: [
      {
        ask: [
          'Que garantit TCP que UDP ne garantit pas ?',
          "Qu'apporte TCP, contrairement à UDP ?",
        ],
        right: [
          "Que tout arrive, dans l'ordre et sans doublons",
          "Un acheminement fiable et dans l'ordre",
        ],
        wrong: [
          "Qu'il est plus rapide car il n'attend pas",
          "Qu'il est chiffré de bout en bout",
          "Qu'il atteint toutes les machines du réseau",
          "Qu'il n'a besoin d'ouvrir aucun port",
        ],
      },
      {
        ask: ['Quel protocole de transport utilise HTTP/1.1 ?', 'Sur quoi circule HTTP/1.1 ?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: [
      "Qu'il est plus rapide car il n'attend pas",
      "Qu'il est chiffré de bout en bout",
      "Qu'il n'a besoin d'ouvrir aucun port",
    ],
    why: 'TCP numérote, accuse réception et renvoie ; UDP envoie et oublie.',
  },
  'net-dns': {
    forms: [
      {
        ask: ['Que fait le DNS ?', 'À quoi sert le DNS ?'],
        right: ['Il traduit les noms en adresses IP'],
        wrong: [
          'Il distribue les adresses IP',
          'Il chiffre la connexion au serveur',
          'Il route les paquets',
          'Il garde une copie des pages web',
        ],
      },
      {
        ask: ['Quand tu tapes un nom comme intra.42.fr, quel système le transforme en IP ?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: [
      'Il distribue les adresses IP',
      'Il chiffre la connexion au serveur',
      'Il route les paquets',
    ],
    why: "Le DNS, c'est l'annuaire d'Internet : d'un nom à une adresse.",
  },
  'srv-socket-steps': {
    forms: [
      {
        ask: [
          'Dans quel ordre un serveur TCP prépare-t-il sa socket ?',
          'Quelles étapes faut-il suivre pour commencer à accepter des connexions ?',
        ],
        right: ['socket, bind, listen, accept'],
        wrong: [
          'socket, listen, bind, accept',
          'bind, socket, accept, listen',
          'socket, connect, listen, accept',
          'listen, socket, bind, accept',
        ],
      },
      {
        ask: [
          'Que renvoie `accept` ?',
          'Chaque fois qu’il accepte une connexion, que renvoie accept ?',
        ],
        right: ['Un nouveau descripteur pour ce client', 'Une nouvelle socket, rien que pour elle'],
        wrong: [
          'La même socket qui écoute',
          "Le port d'où vient le client",
          'Le nombre de clients connectés',
        ],
      },
    ],
    wrong: [
      'socket, listen, bind, accept',
      'bind, socket, accept, listen',
      'listen, socket, bind, accept',
    ],
    why: "On la crée, on l'attache à un port, on la met en écoute, puis on accepte les connexions, chacune avec son propre descripteur.",
  },
  'srv-poll': {
    forms: [
      {
        ask: [
          'À quoi sert `poll` (ou select, epoll, kqueue) dans un serveur ?',
          'Que permet poll à un serveur ?',
        ],
        right: [
          'Savoir quels descripteurs sont prêts sans bloquer',
          'Servir plein de clients avec un seul thread',
        ],
        wrong: [
          'Créer un nouveau thread par client',
          'Chiffrer la connexion de chaque client',
          'Résoudre le nom de chaque client',
          'Mesurer le temps de chaque réponse',
        ],
      },
      {
        ask: [
          'Que se passe-t-il si tu fais `read` sur une socket bloquante vide ?',
          'Sans demander à poll, tu lis une socket bloquante vide. Que se passe-t-il ?',
        ],
        right: [
          'Ça bloque et les autres clients attendent',
          "Tout le serveur s'arrête jusqu'à ce que ça arrive",
        ],
        wrong: [
          'Ça renvoie 0 et passe au client suivant',
          'Ça ferme la connexion avec ce client',
          'Ça renvoie -1 et continue avec les autres',
          "Ça lit ce qui restait dans l'ancien buffer",
        ],
      },
    ],
    wrong: [
      'Créer un nouveau thread par client',
      'Chiffrer la connexion de chaque client',
      'Résoudre le nom de chaque client',
    ],
    why: "Avec une seule boucle et poll, le serveur ne lit ou n'écrit que là où il ne bloquera pas.",
  },
  'srv-partial': {
    forms: [
      {
        ask: [
          "Un client envoie « PRIVMSG #42 :salut\\r\\n », mais `recv` ne te donne que « PRIVMSG #4 ». Qu'est-ce que tu fais ?",
          'recv renvoie un demi-message. Que doit faire le serveur ?',
        ],
        right: [
          "Le garder dans le buffer du client jusqu'à la fin de ligne",
          'Accumuler jusqu’à avoir une ligne entière, puis la traiter',
        ],
      },
    ],
    wrong: [
      'Le rejeter : il est mal formé, il faut prévenir',
      'Le traiter tel quel et jeter ce qui arrive après',
      'Fermer la connexion : le client a planté',
      'Attendre la suite avec un sleep de quelques ms',
    ],
    why: "TCP est un flux d'octets, pas de messages : les coupures ne tombent pas sur tes fins de ligne.",
  },
  'http-status': {
    forms: [
      {
        ask: [
          'Quel code HTTP veut dire « introuvable » ?',
          "Avec quel code répond une page qui n'existe pas ?",
        ],
        right: ['404'],
        wrong: ['200', '301', '500', '403'],
      },
      {
        ask: [
          'Quel code HTTP veut dire « méthode non autorisée » ?',
          'Avec quel code répond un DELETE là où seul GET est admis ?',
        ],
        right: ['405'],
        wrong: ['404', '403', '500', '400'],
      },
      {
        ask: [
          'Quelle famille de codes HTTP indique une erreur du serveur ?',
          'Si la faute vient du serveur, de quelle famille est le code ?',
        ],
        right: ['5xx'],
        wrong: ['4xx', '3xx', '2xx'],
      },
    ],
    wrong: ['200', '301', '500', '403', '201'],
    why: '2xx, tout va bien ; 3xx redirige ; 4xx, erreur du client (404 introuvable, 405 méthode non autorisée) ; 5xx, erreur du serveur.',
  },
  'http-methods': {
    forms: [
      {
        ask: [
          'Quelle méthode HTTP ne devrait rien changer sur le serveur ?',
          'Quelle méthode HTTP sert seulement à demander, sans modifier ?',
        ],
        right: ['GET'],
        wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
      },
      {
        ask: [
          'Quel en-tête donne la taille en octets du corps de la requête ?',
          'Dans quel en-tête va la taille du corps ?',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Content-Encoding', 'Host', 'Accept'],
      },
    ],
    wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
    why: 'GET ne fait que demander ; POST, PUT, PATCH et DELETE modifient. Content-Length (ou chunked) indique où finit le corps.',
  },
  'http-chunked': {
    forms: [
      {
        ask: [
          'Une requête arrive avec `Transfer-Encoding: chunked`. Comment sais-tu où finit le corps ?',
          "En chunked, il n'y a pas de Content-Length. Quand le corps se termine-t-il ?",
        ],
        right: ['Quand arrive un chunk de taille 0', 'Avec le chunk « 0 » et une ligne vide'],
      },
    ],
    wrong: [
      'Quand le client ferme la connexion',
      'En arrivant à 1024 octets',
      'Au premier \\r\\n qui arrive',
      'Jamais : il faut attendre le timeout',
    ],
    why: 'Chaque chunk est précédé de sa taille en hexadécimal ; celui de taille 0 marque la fin.',
  },
  'http-cgi': {
    forms: [
      {
        ask: [
          'Que fait le serveur quand une requête va vers un CGI ?',
          'Avec un CGI, comment le serveur obtient-il la réponse ?',
        ],
        right: [
          "Il lance un programme et renvoie ce qu'il écrit",
          'Il lance un programme qui fabrique la réponse',
        ],
      },
    ],
    wrong: [
      'Il garde la page en cache et la sert',
      'Il ajoute un en-tête spécial à la page',
      "Il chiffre la réponse avant de l'envoyer",
      'Il répartit la charge entre plusieurs serveurs',
    ],
    why: "Le serveur lance le programme (fork + execve) avec la requête dans les variables d'environnement et sur son entrée, puis renvoie sa sortie.",
  },
  'irc-basics': {
    forms: [
      {
        ask: [
          'Quelle commande IRC sert à entrer dans un canal ?',
          'Quelle commande envoies-tu pour entrer dans #42 ?',
        ],
        right: ['JOIN'],
        wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
      },
      {
        ask: [
          'Comment se termine chaque message dans le protocole IRC ?',
          'Par quoi se terminent les lignes IRC ?',
        ],
        right: ['\\r\\n'],
        wrong: ['\\n seul', '\\0', ';'],
      },
    ],
    wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
    why: 'IRC, ce sont des lignes de texte terminées par CRLF ; JOIN fait rejoindre un canal, PRIVMSG envoie un message et NICK fixe le pseudo.',
  },
  'docker-image': {
    forms: [
      {
        ask: [
          'Quelle différence y a-t-il entre une image et un conteneur Docker ?',
          'Quel lien y a-t-il entre un conteneur et son image ?',
        ],
        right: [
          "L'image est le modèle ; le conteneur, sa copie vivante",
          "Le conteneur, c'est l'image en marche",
        ],
        wrong: [
          'Ce sont la même chose sous deux noms',
          'Le conteneur est une machine virtuelle complète',
          "L'image est un conteneur qui s'est arrêté",
          'Le conteneur est le Dockerfile compilé',
        ],
      },
      {
        ask: [
          'Que devient ce qui a été écrit dans un conteneur sans volume quand on le supprime ?',
          'Sans volume, que deviennent ses données quand on supprime le conteneur ?',
        ],
        right: ['Elles disparaissent avec lui'],
        wrong: [
          "Elles sont gardées dans l'image",
          'Elles passent au conteneur suivant',
          'Elles sont envoyées sur Docker Hub',
        ],
      },
    ],
    wrong: [
      'Ce sont la même chose sous deux noms',
      "L'image est un conteneur qui s'est arrêté",
      'Le conteneur est le Dockerfile compilé',
    ],
    why: "L'image ne change pas ; chaque conteneur ajoute sa propre couche en écriture, qui disparaît avec lui sauf s'il y a un volume.",
  },
  'docker-vm': {
    forms: [
      {
        ask: [
          "En quoi un conteneur diffère-t-il d'une machine virtuelle ?",
          "Qu'est-ce qui rend un conteneur plus léger qu'une machine virtuelle ?",
        ],
        right: ["Il utilise le noyau de l'hôte, pas le sien"],
        wrong: [
          "Il est toujours plus sûr qu'une VM",
          'Il émule tout le matériel',
          'Il ne marche que sous Linux avec un bureau',
          'Il a son propre noyau, plus petit',
        ],
      },
      {
        ask: [
          'Pourquoi `tail -f /dev/null` ne convient-il pas comme processus principal d’un conteneur ?',
          "Qu'est-ce qui cloche quand on garde un conteneur en vie avec une boucle infinie en PID 1 ?",
        ],
        right: [
          'Bricolage : le service doit tourner au premier plan',
          "Le vrai service n'est pas le processus principal",
        ],
        wrong: [
          'Ça consomme beaucoup de CPU pour rien',
          "/dev/null n'existe pas dans le conteneur",
          "Le conteneur s'arrête dès qu'il démarre",
        ],
      },
    ],
    wrong: [
      "Il est toujours plus sûr qu'une VM",
      'Il émule tout le matériel',
      'Il a son propre noyau, plus petit',
    ],
    why: 'Un conteneur est un processus isolé sur le même noyau ; il vit tant que vit son processus principal.',
  },
  'docker-compose-net': {
    forms: [
      {
        ask: [
          'Dans docker-compose, WordPress doit parler au service de la base de données (MariaDB). Que met-il comme hôte ?',
          "Deux services sur le même réseau compose. Quelle adresse l'un utilise-t-il pour joindre l'autre ?",
        ],
        right: [
          'Le nom du service, que compose résout',
          'Le nom du service dans le fichier compose',
        ],
      },
    ],
    wrong: [
      'localhost, comme sur ta machine',
      "L'adresse 127.0.0.1 de l'hôte",
      "L'IP publique de la machine",
      "L'adresse 0.0.0.0, qui touche tout le monde",
    ],
    why: 'Chaque conteneur a son propre localhost ; compose fournit un DNS interne où chaque service se joint par son nom.',
  },
  'web-https': {
    forms: [
      {
        ask: [
          "Qu'est-ce que HTTPS ajoute à HTTP ?",
          'Que gagne un site à passer de HTTP à HTTPS ?',
        ],
        right: [
          'Il chiffre avec TLS et prouve qui est le serveur',
          'Il met HTTP dans une connexion chiffrée par TLS',
        ],
        wrong: [
          "Il compresse les pages pour qu'elles pèsent moins",
          'Il fait charger le site plus vite',
          'Il garde les mots de passe sur le serveur',
          'Il bloque les pubs et les traqueurs',
        ],
      },
      {
        ask: ['Sur quel port HTTPS écoute-t-il par défaut ?', 'Quel est le port de HTTPS ?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      "Il compresse les pages pour qu'elles pèsent moins",
      'Il fait charger le site plus vite',
      'Il garde les mots de passe sur le serveur',
    ],
    why: "HTTPS, c'est HTTP dans TLS : du chiffrement plus le certificat du serveur. Le 80, c'est HTTP ; le 443, HTTPS.",
  },
  'web-sql-injection': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans cette requête ?",
          'Quel défaut a cette façon de construire la requête ?',
        ],
        right: [
          'Injection SQL : le nom peut réécrire la requête',
          'Celui qui tape le nom récupère toutes les lignes',
        ],
      },
    ],
    wrong: [
      "Elle est lente car elle n'utilise aucun index",
      'Il manque un point-virgule à la fin du SQL',
      'Elle ne renvoie rien si le nom a des accents',
      'Elle marche avec MySQL mais pas avec PostgreSQL',
    ],
    why: "Coller le texte de l'utilisateur dans le SQL lui permet de le réécrire ; les paramètres le traitent toujours comme une donnée.",
  },
  'web-hash-passwords': {
    forms: [
      {
        ask: [
          'Comment faut-il stocker les mots de passe ?',
          'Comment stocke-t-on un mot de passe dans la base de données ?',
        ],
        right: [
          'Avec un hash lent et salé, comme bcrypt ou argon2',
          'Avec bcrypt ou argon2, jamais tel quel',
        ],
        wrong: [
          'En clair, dans une table à part',
          'Chiffré avec une clé écrite dans le code',
          'Avec MD5, qui se calcule vite',
          "En base64, pour qu'on ne le lise pas d'un coup d'œil",
        ],
      },
      {
        ask: [
          'Pourquoi ajoute-t-on du sel à un mot de passe avant de le hacher ?',
          "Qu'est-ce qu'on gagne à saler le hash de chaque mot de passe ?",
        ],
        right: [
          'Deux mots de passe égaux donnent des hashs différents',
          'Les tables de hashs précalculés ne servent plus',
        ],
        wrong: [
          "On peut le déchiffrer si l'utilisateur l'oublie",
          'Le hash prend moins de place dans la base',
          'Il finit chiffré avec une clé du serveur',
        ],
      },
    ],
    wrong: [
      'En clair, dans une table à part',
      'Avec MD5, qui se calcule vite',
      "En base64, pour qu'on ne le lise pas d'un coup d'œil",
    ],
    why: 'Un hash lent et salé ne se défait pas et ne se teste pas en masse ; base64 ou MD5 ne protègent rien.',
  },
  'web-websocket': {
    forms: [
      {
        ask: [
          'Pourquoi utiliser des WebSockets pour un jeu dans le navigateur ?',
          'Que permet une WebSocket ?',
        ],
        right: [
          'Le serveur peut envoyer sans qu’on lui demande',
          'Une connexion ouverte dans les deux sens',
        ],
      },
    ],
    wrong: [
      'Chiffrer mieux que HTTPS, sans certificat',
      "Des données plus légères qu'en HTTP",
      'Se passer de TCP, donc ne rien perdre',
      'Garder les données du jeu dans le navigateur',
    ],
    why: "HTTP, c'est question-réponse ; la WebSocket garde la connexion ouverte pour envoyer à tout moment.",
  },
  'np-net-broadcast': {
    forms: [
      {
        ask: [
          'Quelle est l’adresse de broadcast de 192.168.10.77/26 ?',
          'Une machine a 192.168.10.77/26. Quel est le broadcast de son réseau ?',
        ],
        right: ['192.168.10.127'],
        wrong: ['192.168.10.255', '192.168.10.63', '192.168.10.128', '192.168.10.191'],
      },
      {
        ask: [
          "Quelle est l'adresse réseau de 192.168.10.77/26 ?",
          'Une machine a 192.168.10.77/26. Sur quel réseau est-elle ?',
        ],
        right: ['192.168.10.64'],
        wrong: ['192.168.10.0', '192.168.10.76', '192.168.10.65', '192.168.10.128'],
      },
    ],
    wrong: ['192.168.10.255', '192.168.10.0', '192.168.10.128'],
    why: 'Un /26 découpe le dernier octet en blocs de 64 (0, 64, 128, 192) : 77 tombe dans 64–127, donc le réseau est .64 et le broadcast .127.',
  },
  'np-host-range': {
    forms: [
      {
        ask: [
          'Sur le réseau 172.16.0.32/28, quelle est la dernière IP possible pour une machine ?',
          "Quelle est l'IP d'hôte la plus haute de 172.16.0.32/28 ?",
        ],
        right: ['172.16.0.46'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.62', '172.16.0.63'],
      },
      {
        ask: [
          'Laquelle de ces IP une machine du réseau 172.16.0.32/28 peut-elle avoir ?',
          'Quelle adresse est valable pour une machine de 172.16.0.32/28 ?',
        ],
        right: ['172.16.0.33', '172.16.0.40', '172.16.0.45'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31', '172.16.0.50'],
      },
    ],
    wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31'],
    why: 'Un /28, ce sont des blocs de 16 : de .32 à .47 ; la première adresse est le réseau, la dernière le broadcast, donc les hôtes vont de .33 à .46.',
  },
  'np-next-hop': {
    forms: [
      {
        ask: [
          "Dans une table de routage, qu'est-ce que le next hop (prochain saut) ?",
          "Qu'indique le next hop d'une route ?",
        ],
        right: [
          "L'IP du routeur à qui on remet le paquet",
          'Le routeur voisin qui reçoit le paquet',
        ],
        wrong: [
          "L'IP de la destination finale du paquet",
          'Le dernier réseau que traverse le paquet',
          'Les sauts qui lui restent avant la cible',
          'Le masque du réseau de destination',
        ],
      },
      {
        ask: [
          "Que doit respecter le next hop d'une route pour qu'elle marche ?",
          'Où doit se trouver le next hop que tu mets dans une route ?',
        ],
        right: [
          'Sur un réseau que la machine joint directement',
          "Sur le même réseau qu'une interface de la machine",
        ],
        wrong: [
          'Sur le même réseau que la destination finale',
          'Sur un réseau public, jamais privé',
          'Sur n’importe quel réseau, si le routeur le connaît',
          'Finir en .1, comme tous les routeurs',
        ],
      },
    ],
    wrong: [
      "L'IP de la destination finale du paquet",
      'Le dernier réseau que traverse le paquet',
      'Les sauts qui lui restent avant la cible',
    ],
    why: 'Le next hop, c’est à qui on donne le paquet : il doit être sur un de tes réseaux, car on ne peut le lui remettre que sans autre routeur entre les deux.',
  },
  'np-router-interfaces': {
    forms: [
      {
        ask: [
          "Deux interfaces d'un même routeur peuvent-elles être sur le même réseau ?",
          'Un routeur a deux interfaces. Peux-tu les mettre dans le même sous-réseau ?',
        ],
        right: [
          'Non : chaque interface va vers un réseau différent',
          'Non : le routeur ne saurait pas laquelle prendre',
        ],
        wrong: [
          'Oui, si les deux ont le même masque',
          'Oui : comme ça, le routeur répartit la charge',
          'Seulement si les deux IP se suivent',
          "Oui, si l'une d'elles est la passerelle",
        ],
      },
      {
        ask: [
          'Un routeur relie 10.0.1.0/24 et 10.0.2.0/24. Quelle IP peut avoir son interface du second réseau ?',
          "Une interface d'un routeur donne sur 10.0.2.0/24 et l'autre sur 10.0.1.0/24. Quelle IP mets-tu à la première ?",
        ],
        right: ['10.0.2.1', '10.0.2.254'],
        wrong: ['10.0.1.1', '10.0.2.0', '10.0.2.255', '10.0.3.1'],
      },
    ],
    wrong: [
      'Oui, si les deux ont le même masque',
      'Oui : comme ça, le routeur répartit la charge',
      'Seulement si les deux IP se suivent',
    ],
    why: "Un routeur relie des réseaux différents : chaque interface est la porte d'un réseau, et avec deux sur le même, il ne saurait pas par où faire sortir le paquet.",
  },
  'ws-config': {
    forms: [
      {
        ask: [
          'Le corps d’une requête dépasse client_max_body_size. Avec quel code réponds-tu ?',
          'Quel code HTTP renvoie NGINX si le corps dépasse la limite configurée ?',
        ],
        right: ['413'],
        wrong: ['400', '403', '411', '500'],
      },
      {
        ask: [
          "Dans NGINX, quelle directive affiche la liste des fichiers d'un dossier sans index ?",
          "Quelle directive NGINX active le listing d'un dossier ?",
        ],
        right: ['`autoindex on`'],
        wrong: ['`index on`', '`listing on`', '`root on`', '`dirlist on`'],
      },
      {
        ask: [
          'Dans NGINX, quelle directive choisit la page envoyée avec un 404 ?',
          'Avec quelle directive NGINX mets-tu ta propre page pour les 404 ?',
        ],
        right: ['`error_page`'],
        wrong: ['`error_log`', '`return`', '`default_page`', '`try_files`'],
      },
      {
        ask: [
          'Dans NGINX, quelle directive dit sur quel port écoute un bloc server ?',
          'Avec quelle directive mets-tu un bloc server NGINX sur le port 8080 ?',
        ],
        right: ['`listen`'],
        wrong: ['`server_name`', '`port`', '`bind`', '`root`'],
      },
    ],
    wrong: ['`server_name`', '`location`', '`index`'],
    why: '413, c’est « contenu trop volumineux » ; autoindex liste le dossier, error_page fixe tes pages d’erreur et listen, le port.',
  },
  'ws-poll-only': {
    forms: [
      {
        ask: [
          'Combien de poll (ou équivalent) webserv peut-il utiliser pour toutes ses E/S ?',
          "Dans webserv, combien de poll servent les clients et les sockets d'écoute ?",
        ],
        right: ["Un seul pour tout, l'écoute comprise"],
        wrong: [
          'Un par client connecté',
          'Un par port sur lequel il écoute',
          'Aucun : chaque client a son thread',
          "Deux : un pour lire et l'autre pour écrire",
        ],
      },
      {
        ask: [
          'Dans webserv, quand peux-tu faire read ou write sur une socket ?',
          "Que doit-il se passer avant de lire ou d'écrire sur une socket de webserv ?",
        ],
        right: ["Que poll l'ait signalée prête", 'Seulement quand poll dit qu’elle est prête'],
        wrong: [
          'Rien, si la socket est non bloquante',
          'Que errno vaille EAGAIN',
          'Rien : un timeout court suffit',
          'Que le client ait fermé de son côté',
        ],
      },
      {
        ask: [
          "Après un read ou un write sur une socket, qu'interdit le sujet de webserv ?",
          "Qu'est-ce que tu ne peux pas faire dans webserv après un read ou un write ?",
        ],
        right: ['Regarder errno pour décider quoi faire'],
        wrong: [
          'Rappeler poll dans la boucle',
          'Fermer la socket si read renvoie 0',
          'Garder ce qui est lu dans le buffer du client',
        ],
      },
    ],
    wrong: [
      'Un par client connecté',
      'Un par port sur lequel il écoute',
      'Aucun : chaque client a son thread',
    ],
    why: "Un seul poll surveille à la fois les sockets d'écoute et celles des clients, et on ne lit ou n'écrit que là où il dit que c'est possible.",
  },
  'ws-redirect': {
    forms: [
      {
        ask: [
          'Quel code HTTP est une redirection permanente ?',
          'Une page a déménagé pour de bon. Avec quel code réponds-tu ?',
        ],
        right: ['301'],
        wrong: ['302', '307', '304', '404'],
      },
      {
        ask: [
          'Dans une réponse 301, quel en-tête porte la nouvelle adresse ?',
          "Dans quel en-tête d'une redirection va la cible ?",
        ],
        right: ['Location'],
        wrong: ['Referer', 'Host', 'Redirect', 'Origin'],
      },
    ],
    wrong: ['302', '307', '304'],
    why: "301 veut dire « déplacé pour toujours » (302 et 307 sont temporaires), et le navigateur va à l'adresse de l'en-tête Location.",
  },
  'ws-upload': {
    forms: [
      {
        ask: [
          'Un formulaire HTML envoie un fichier en POST. Quel Content-Type a la requête ?',
          'Quel type de corps envoie le navigateur quand on téléverse un fichier depuis un formulaire ?',
        ],
        right: ['`multipart/form-data`'],
        wrong: [
          '`application/json`',
          '`text/plain`',
          '`application/x-www-form-urlencoded`',
          '`application/octet-stream`',
        ],
      },
      {
        ask: [
          'Dans un corps multipart, comment sait-on où finit chaque partie ?',
          'Comment multipart/form-data sépare-t-il les parties du corps ?',
        ],
        right: [
          "Avec le boundary qu'annonce le Content-Type",
          "Avec un délimiteur donné dans l'en-tête",
        ],
        wrong: [
          'Avec une ligne vide entre chaque partie',
          'Avec le Content-Length de chaque partie',
          'Avec un chunk de taille 0 entre les parties',
          'Chaque partie arrive dans une requête à part',
        ],
      },
    ],
    wrong: ['`application/json`', '`text/plain`', '`application/x-www-form-urlencoded`'],
    why: "Un formulaire avec fichiers part en multipart/form-data : les parties sont séparées par le boundary qu'annonce le Content-Type.",
  },
  'irc-register': {
    forms: [
      {
        ask: [
          "Quelles commandes un client envoie-t-il pour s'enregistrer auprès du serveur ?",
          'En se connectant à ton ft_irc, que doit envoyer le client avant tout ?',
        ],
        right: ['PASS, NICK et USER'],
        wrong: [
          'LOGIN, NICK et JOIN',
          'PASS, JOIN et USER',
          'AUTH, NICK et USER',
          'NICK, JOIN et PRIVMSG',
        ],
      },
      {
        ask: [
          "À l'enregistrement, quelle commande porte le mot de passe du serveur ?",
          'Avec quelle commande le client donne-t-il le mot de passe de ton ft_irc ?',
        ],
        right: ['PASS'],
        wrong: ['AUTH', 'LOGIN', 'USER', 'OPER'],
      },
    ],
    wrong: ['LOGIN, NICK et JOIN', 'PASS, JOIN et USER', 'AUTH, NICK et USER'],
    why: "PASS donne le mot de passe du serveur, NICK le pseudo et USER le nom d'utilisateur : avant ça, le client n'est pas enregistré.",
  },
  'irc-modes': {
    forms: [
      {
        ask: [
          "Quel mode de canal fait qu'on n'y entre que sur invitation ?",
          "Avec quel mode fermes-tu un canal à qui n'est pas invité ?",
        ],
        right: ['+i'],
        wrong: ['+t', '+k', '+o', '+l'],
      },
      {
        ask: [
          'Quel mode de canal met un mot de passe pour entrer ?',
          'Avec quel mode un canal demande-t-il une clé à qui entre ?',
        ],
        right: ['+k'],
        wrong: ['+i', '+p', '+l', '+o'],
      },
      {
        ask: [
          'Que fait le mode +l sur un canal ?',
          'Si tu mets +l sur un canal, que change-t-il ?',
        ],
        right: ["Il plafonne le nombre d'utilisateurs du canal"],
        wrong: [
          'Seuls les opérateurs du canal parlent',
          'Il verrouille le sujet pour les non-opérateurs',
          'Il garde un log de tout ce qui se dit',
        ],
      },
      {
        ask: [
          'Que fait le mode +t sur un canal ?',
          'Si tu mets +t sur un canal, que change-t-il ?',
        ],
        right: ['Seuls les opérateurs changent le sujet'],
        wrong: [
          'Seuls les opérateurs ont le droit de parler',
          'Le canal se ferme au bout d’un moment',
          "On n'y entre qu'avec une invitation",
        ],
      },
    ],
    wrong: ['+m', '+s', '+b'],
    why: "+i, c'est sur invitation ; +t réserve le sujet aux opérateurs ; +k demande une clé ; +o fait un opérateur et +l plafonne les utilisateurs.",
  },
  'irc-operator': {
    forms: [
      {
        ask: [
          "Quelle commande d'opérateur expulse quelqu'un d'un canal ?",
          'Avec quelle commande un opérateur sort-il un utilisateur du canal ?',
        ],
        right: ['KICK'],
        wrong: ['BAN', 'PART', 'REMOVE', 'QUIT'],
      },
      {
        ask: [
          "Quelle commande d'opérateur laisse entrer quelqu'un dans un canal +i ?",
          "Le canal est fermé aux autres. Quelle commande l'opérateur utilise-t-il pour faire entrer quelqu'un ?",
        ],
        right: ['INVITE'],
        wrong: ['JOIN', 'ALLOW', 'KNOCK', 'ADD'],
      },
      {
        ask: [
          'Quelle commande affiche ou change le sujet d’un canal ?',
          'Avec quelle commande fixe-t-on le sujet d’un canal ?',
        ],
        right: ['TOPIC'],
        wrong: ['TITLE', 'INFO', 'NAMES', 'MOTD'],
      },
      {
        ask: [
          'Avec quelle commande un opérateur donne-t-il +o à un autre utilisateur ?',
          "Quelle commande change les modes d'un canal ?",
        ],
        right: ['MODE'],
        wrong: ['OPER', 'OP', 'GRANT', 'SET'],
      },
    ],
    wrong: ['BAN', 'GRANT', 'ALLOW'],
    why: 'Les opérateurs de canal ont KICK pour expulser, INVITE pour inviter, TOPIC pour le sujet et MODE pour les modes.',
  },
  'irc-privmsg': {
    forms: [
      {
        ask: [
          'Comment envoies-tu « hi » en privé au pseudo pepe ?',
          'Quelle ligne envoie un message à pepe seulement ?',
        ],
        right: ['`PRIVMSG pepe :hi`'],
        wrong: ['`PRIVMSG #pepe :hi`', '`MSG pepe hi`', '`SEND pepe :hi`', '`PRIVMSG :pepe hi`'],
      },
      {
        ask: [
          'Comment envoies-tu « hi » à tout le canal #42 ?',
          'Quelle ligne envoie un message à tous les membres de #42 ?',
        ],
        right: ['`PRIVMSG #42 :hi`'],
        wrong: ['`PRIVMSG 42 :hi`', '`JOIN #42 :hi`', '`SAY #42 :hi`', '`PRIVMSG :#42 hi`'],
      },
    ],
    wrong: ['`MSG pepe hi`', '`SEND pepe :hi`', '`SAY #42 :hi`'],
    why: 'PRIVMSG vise un pseudo ou un canal (avec #), et le texte vient après les deux-points.',
  },
  'irc-server-rules': {
    forms: [
      {
        ask: [
          'Dans ft_irc, peux-tu utiliser fork pour servir chaque client ?',
          'Un processus fils par client, ça passe dans ft_irc ?',
        ],
        right: ['Non : tout tourne dans un processus, avec un poll'],
        wrong: [
          'Oui : un processus fils par client',
          'Oui, si les fils partagent la socket',
          'Seulement pour ceux qui ne sont pas opérateurs',
        ],
      },
      {
        ask: [
          'Avec nc, tu envoies « com », ^D, « man », ^D et « d » puis Entrée. Que doit faire le serveur ?',
          'Tu testes avec nc en coupant une commande avec ^D. Que doit faire ft_irc ?',
        ],
        right: ['Recoller les morceaux et traiter la commande entière'],
        wrong: [
          'Traiter chaque morceau comme une commande',
          'Fermer la connexion au premier ^D',
          'Jeter ce qui est arrivé avant le dernier ^D',
        ],
      },
    ],
    wrong: [
      'Oui : un processus fils par client',
      'Traiter chaque morceau comme une commande',
      'Fermer la connexion au premier ^D',
    ],
    why: 'Le sujet interdit fork et impose un seul poll ; et comme ^D envoie un bout de message, il faut accumuler jusqu’à la fin de ligne.',
  },
  'inc-one-service': {
    forms: [
      {
        ask: [
          'Combien de services chaque conteneur fait-il tourner dans Inception ?',
          'Dans Inception, combien de services vont dans un même conteneur ?',
        ],
        right: ['Un seul : chaque service dans son conteneur'],
        wrong: [
          'Tous dans un seul, avec supervisord',
          'Deux : WordPress avec MariaDB',
          'Autant que tu veux sur le même réseau',
        ],
      },
      {
        ask: [
          'Dans Inception, dans quel conteneur va php-fpm ?',
          'Où installe-t-on php-fpm dans Inception ?',
        ],
        right: ['Dans celui de WordPress, sans NGINX'],
        wrong: [
          "Dans celui de NGINX, qui l'exécute",
          'Dans celui de MariaDB, avec la base',
          'Dans un conteneur à lui, hors WordPress',
        ],
      },
      {
        ask: [
          "Que doivent faire les conteneurs d'Inception s'ils plantent ?",
          "Un conteneur d'Inception plante. Que doit-il se passer ?",
        ],
        right: ['Redémarrer tout seuls, avec restart'],
        wrong: [
          "Rester arrêtés jusqu'à ce que tu regardes",
          "Se supprimer et retélécharger l'image",
          'Arrêter aussi tous les autres',
        ],
      },
    ],
    wrong: [
      'Tous dans un seul, avec supervisord',
      'Deux : WordPress avec MariaDB',
      'Autant que tu veux sur le même réseau',
    ],
    why: "NGINX, WordPress avec php-fpm et MariaDB ont chacun leur conteneur, et ils redémarrent tout seuls s'ils plantent.",
  },
  'inc-nginx-tls': {
    forms: [
      {
        ask: [
          "Par quel port le trafic entre-t-il dans l'infrastructure d'Inception ?",
          "Dans Inception, quel port est ouvert vers l'extérieur ?",
        ],
        right: ['443'],
        wrong: ['80', '8080', '3306', '9000'],
      },
      {
        ask: [
          'Quelles versions de TLS NGINX peut-il accepter dans Inception ?',
          'Dans Inception, avec quels protocoles NGINX chiffre-t-il ?',
        ],
        right: ['TLSv1.2 ou TLSv1.3'],
        wrong: ['Toutes, SSLv3 compris', 'Seulement TLSv1.0 et TLSv1.1', 'TLSv1.1 ou TLSv1.2'],
      },
      {
        ask: [
          "Quel conteneur est la seule entrée d'Inception depuis l'extérieur ?",
          "Dans Inception, quel service reçoit toutes les connexions de l'extérieur ?",
        ],
        right: ['NGINX'],
        wrong: ['WordPress', 'MariaDB', 'php-fpm', 'Adminer'],
      },
    ],
    wrong: ['80', '8080', '3306'],
    why: "NGINX est l'unique porte d'entrée : seulement par le 443 et seulement avec TLSv1.2 ou TLSv1.3.",
  },
  'inc-volumes': {
    forms: [
      {
        ask: [
          "Dans quel dossier de l'hôte vont les volumes d'Inception ?",
          'Dans Inception, où sont gardées sur la machine les données des volumes ?',
        ],
        right: ['`/home/login/data`'],
        wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/home/login/volumes`', '`/tmp/data`'],
      },
      {
        ask: [
          'Quels volumes Inception demande-t-il ?',
          "Quelles données gardent les volumes d'Inception ?",
        ],
        right: ['La base de WordPress et les fichiers du site'],
        wrong: [
          'Les certificats de NGINX et ses logs',
          'Les logs de chaque service et son cache',
          'Les images déjà construites de chaque service',
        ],
      },
    ],
    wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/tmp/data`'],
    why: "Un volume garde la base de données de WordPress et l'autre les fichiers du site, tous deux dans /home/login/data sur l'hôte.",
  },
  'inc-rules': {
    forms: [
      {
        ask: [
          'De quelle image tes Dockerfile peuvent-ils partir dans Inception ?',
          'Dans Inception, que mets-tu dans le FROM de tes Dockerfile ?',
        ],
        right: ['Alpine ou Debian, rien d’autre'],
        wrong: [
          "L'image officielle de nginx",
          "N'importe laquelle de Docker Hub",
          'Celle de WordPress déjà prête',
        ],
      },
      {
        ask: [
          'Où vont les mots de passe dans Inception ?',
          'Dans Inception, où gardes-tu le mot de passe de MariaDB ?',
        ],
        right: ['Dans le .env ou des secrets, pas dans le Dockerfile'],
        wrong: [
          "Dans le Dockerfile, avec ENV, pour l'avoir sous la main",
          'Dans le docker-compose.yml, écrit tel quel',
          'Dans le dépôt git, dans un fichier à part',
        ],
      },
      {
        ask: [
          "Qu'interdit Inception pour relier les conteneurs ?",
          'Dans Inception, que ne peux-tu pas utiliser pour relier des conteneurs ?',
        ],
        right: ['`network: host` et `--link`'],
        wrong: ['`networks:` dans le compose', '`depends_on` et `restart`', '`expose` et `ports`'],
      },
      {
        ask: [
          'Comment gardes-tu NGINX au premier plan dans son conteneur ?',
          'Quel CMD garde NGINX en PID 1 sans bricolage ?',
        ],
        right: ['`nginx -g "daemon off;"`'],
        wrong: [
          '`nginx &`',
          '`service nginx start`',
          '`nginx; tail -f /dev/null`',
          '`nginx -s reload`',
        ],
      },
    ],
    wrong: [
      "N'importe laquelle de Docker Hub",
      'Dans le docker-compose.yml, écrit tel quel',
      'Celle de WordPress déjà prête',
    ],
    why: 'On construit tout à partir d’Alpine ou de Debian, sans mot de passe dans les Dockerfile, avec un réseau Docker à soi et le service au premier plan.',
  },
  'tr-pong': {
    forms: [
      {
        ask: [
          'Où se joue le Pong de ft_transcendence ?',
          "Dans ft_transcendence, d'où joues-tu au Pong ?",
        ],
        right: ['Sur le site lui-même, dans le navigateur'],
        wrong: [
          'Dans une appli de bureau à part',
          'Dans le terminal, avec ncurses',
          'Dans un client à installer',
        ],
      },
      {
        ask: [
          'Pendant le tournoi de ft_transcendence, que doit montrer clairement le site ?',
          "Qu'est-ce que le site doit afficher pendant un tournoi de ft_transcendence ?",
        ],
        right: ['Qui joue contre qui, et dans quel ordre'],
        wrong: [
          'Le classement mondial de chaque joueur',
          "L'IP de chaque joueur connecté",
          "Qui a gagné le tournoi l'an dernier",
        ],
      },
    ],
    wrong: [
      'Dans une appli de bureau à part',
      'Dans le terminal, avec ncurses',
      'Dans un client à installer',
    ],
    why: 'Le Pong se joue sur le site, dans le navigateur, et le tournoi doit montrer qui affronte qui et dans quel ordre.',
  },
  'tr-2fa': {
    forms: [
      {
        ask: [
          "De quoi dépend le code à 6 chiffres d'une appli de 2FA (TOTP) ?",
          'En TOTP, à partir de quoi chaque code est-il calculé ?',
        ],
        right: ["D'un secret partagé et de l'heure"],
        wrong: [
          "Du mot de passe de l'utilisateur et de son IP",
          "D'un numéro que le serveur envoie par SMS",
          "De l'adresse MAC du téléphone",
        ],
      },
      {
        ask: [
          'Tous les combien un code TOTP change-t-il en général ?',
          "Dans une appli d'authentification, combien de temps dure chaque code ?",
        ],
        right: ['30 s'],
        wrong: ['5 s', '10 min', '24 h', '1 h'],
      },
      {
        ask: [
          "Dans l'authentification à deux facteurs, quel est le second facteur ?",
          "Qu'ajoute la 2FA au mot de passe ?",
        ],
        right: ['Quelque chose que tu as, comme ton téléphone'],
        wrong: [
          'Un second mot de passe, différent',
          'Taper deux fois le mot de passe',
          "Une question secrète de l'inscription",
        ],
      },
    ],
    wrong: [
      "Du mot de passe de l'utilisateur et de son IP",
      "D'un numéro que le serveur envoie par SMS",
      "De l'adresse MAC du téléphone",
    ],
    why: "TOTP combine un secret que partagent le serveur et le téléphone avec l'heure (par tranches de 30 s) : sans le téléphone, pas de code.",
  },
  'tr-auth-tokens': {
    forms: [
      {
        ask: ["Que garantit la signature d'un JWT ?", "À quoi sert la signature d'un JWT ?"],
        right: ["Personne ne l'a modifié sans la clé"],
        wrong: [
          "Personne ne peut lire ce qu'il contient",
          'Il ne marche que dans un navigateur',
          'Le serveur le garde dans la base',
        ],
      },
      {
        ask: [
          "Peut-on lire le contenu d'un JWT sans la clé ?",
          "Quelqu'un sans la clé vole un JWT. Peut-il voir ce qu'il contient ?",
        ],
        right: ["Oui : c'est du base64url, pas chiffré"],
        wrong: [
          'Non : il est chiffré avec la clé du serveur',
          'Non : il ne se lit qu’avec la clé publique',
          'Seulement si le jeton a déjà expiré',
        ],
      },
      {
        ask: [
          'Quand on se connecte avec son compte 42 (OAuth), que reçoit ton site ?',
          "Avec OAuth, qu'est-ce qui arrive à ton backend après l'accord de l'utilisateur ?",
        ],
        right: [
          "Un code qu'il échange contre un jeton",
          "Un jeton d'accès, jamais le mot de passe",
        ],
        wrong: [
          "Le mot de passe 42 de l'utilisateur, chiffré",
          'Une copie du profil et de son mot de passe',
          "Le cookie de session de l'intra",
        ],
      },
    ],
    wrong: [
      "Personne ne peut lire ce qu'il contient",
      'Il ne marche que dans un navigateur',
      "Le cookie de session de l'intra",
    ],
    why: 'Un JWT est signé, pas chiffré : on peut le lire mais pas le modifier sans la clé ; avec OAuth, ton site reçoit un jeton, jamais le mot de passe.',
  },
  'tr-xss': {
    forms: [
      {
        ask: ["Qu'est-ce qu'une attaque XSS ?", 'En quoi consiste le cross-site scripting ?'],
        right: ['Glisser du JavaScript qui tourne chez les autres'],
        wrong: [
          'Saturer le serveur avec plein de requêtes',
          'Réécrire une requête SQL avec ce que tu tapes',
          'Voler la session en écoutant un wifi ouvert',
        ],
      },
      {
        ask: [
          "Comment évite-t-on le XSS en affichant le texte d'un utilisateur ?",
          "Un utilisateur met `<script>` dans son nom. Qu'est-ce qui l'empêche de s'exécuter ?",
        ],
        right: ["L'échapper avant de le mettre dans le HTML"],
        wrong: [
          'Le stocker haché dans la base',
          "L'envoyer toujours en HTTPS",
          'Utiliser des requêtes SQL paramétrées',
        ],
      },
      {
        ask: [
          'Le site passe par HTTPS. Quel schéma utilisent ses WebSockets ?',
          "Comment commence l'adresse d'une WebSocket chiffrée ?",
        ],
        right: ['`wss://`'],
        wrong: ['`ws://`', '`https://`', '`tcp://`', '`ssl://`'],
      },
    ],
    wrong: [
      'Saturer le serveur avec plein de requêtes',
      'Réécrire une requête SQL avec ce que tu tapes',
      "L'envoyer toujours en HTTPS",
    ],
    why: "Avec le XSS, le texte d'un utilisateur s'exécute comme du code chez un autre ; l'échapper le garde en texte, et tout passe chiffré (https et wss).",
  },
}
