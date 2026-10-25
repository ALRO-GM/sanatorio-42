/** Banco de Not-games en francés: redes, servidores y web (`../network.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const NETWORK_FR: Readonly<Record<string, ConceptText>> = {
  'net-mask-hosts': {
    forms: [
      {
        ask: [
          "Combien d'adresses d'hôtes tiennent dans un réseau /24 ?",
          "Pour combien d'hôtes le masque 255.255.255.0 laisse-t-il de la place ?",
        ],
        right: ['254'],
        wrong: ['256', '255', '24', '128'],
      },
      {
        ask: [
          "Combien d'adresses d'hôtes tiennent dans un réseau /30 ?",
          "Pour combien d'hôtes le masque 255.255.255.252 laisse-t-il de la place ?",
        ],
        right: ['2'],
        wrong: ['4', '30', '1', '3'],
      },
    ],
    wrong: ['256', '255', '24', '128', '512'],
    why: 'Il reste 32 - n bits pour les hôtes : 2^(32-n) adresses, moins celle du réseau et celle de broadcast.',
  },
  'net-mask-dotted': {
    forms: [
      {
        ask: [
          'Quel masque correspond à /26 ?',
          "Comment s'écrit /26 en notation décimale pointée ?",
        ],
        right: ['255.255.255.192'],
        wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.26', '255.255.255.0'],
      },
      {
        ask: [
          'Quel masque correspond à /16 ?',
          "Comment s'écrit /16 en notation décimale pointée ?",
        ],
        right: ['255.255.0.0'],
        wrong: ['255.0.0.0', '255.255.255.0', '255.255.16.0'],
      },
    ],
    wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.0'],
    why: "Ce sont n bits à 1 d'affilée : /26 = 24 + 2 bits dans le dernier octet = 11000000 = 192.",
  },
  'net-same-network': {
    forms: [
      {
        ask: [
          'Est-ce que 192.168.1.10/25 et 192.168.1.200/25 sont sur le même réseau ?',
          'Avec un masque /25, est-ce que 192.168.1.10 et 192.168.1.200 peuvent se parler directement ?',
        ],
        right: [
          'Non : /25 coupe le dernier octet en 0–127 et 128–255',
          "Non : l'une tombe dans la première moitié et l'autre dans la seconde",
        ],
        wrong: [
          'Oui : elles commencent pareil',
          'Oui, mais seulement via un routeur',
          'Ça dépend de la passerelle',
          "Impossible à dire sans l'adresse MAC",
        ],
      },
      {
        ask: [
          'Est-ce que 10.0.0.5/24 et 10.0.0.250/24 sont sur le même réseau ?',
          'Avec un masque /24, est-ce que 10.0.0.5 et 10.0.0.250 peuvent se parler directement ?',
        ],
        right: [
          'Oui : elles partagent les trois premiers octets',
          'Oui : les deux sont en 10.0.0.x',
        ],
        wrong: [
          'Non : /24 coupe le dernier octet en deux moitiés',
          'Non : 250 est hors de la plage',
          'Seulement via un routeur',
          "Impossible à dire sans l'adresse MAC",
        ],
      },
    ],
    wrong: [
      'Seulement via un routeur',
      'Ça dépend de la passerelle',
      "Impossible à dire sans l'adresse MAC",
    ],
    why: 'Même réseau = mêmes bits dans la partie du masque. En /25, le bit de poids fort du dernier octet compte.',
  },
  'net-private': {
    forms: [
      {
        ask: [
          'Laquelle de ces adresses est privée (elle ne sort pas telle quelle sur Internet) ?',
          'Laquelle de ces adresses est une adresse privée de réseau local ?',
        ],
        right: ['192.168.0.10', '10.1.2.3', '172.16.5.4'],
        wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250', '142.250.1.1'],
      },
      {
        ask: ["Qu'est-ce que 127.0.0.1 ?", "Vers qui pointe l'adresse 127.0.0.1 ?"],
        right: ['La machine elle-même (localhost)'],
        wrong: ['La passerelle', 'Le DNS de Google', "L'adresse de broadcast"],
      },
    ],
    wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250'],
    why: "10/8, 172.16/12 et 192.168/16 sont privées ; 127.0.0.1, c'est toi.",
  },
  'net-gateway': {
    forms: [
      {
        ask: [
          'À quoi sert la passerelle (gateway) ?',
          "Quel rôle joue la passerelle d'un réseau ?",
        ],
        right: [
          "Elle reçoit les paquets destinés à d'autres réseaux et les fait suivre",
          "C'est la sortie du réseau local vers les autres",
        ],
        wrong: [
          'Elle traduit les noms en adresses',
          'Elle distribue les adresses IP',
          'Elle chiffre le trafic',
          'Elle relie les câbles du réseau local',
        ],
      },
      {
        ask: [
          "À quelles destinations s'applique la route 0.0.0.0/0 ?",
          'Vers quelles destinations mène une route 0.0.0.0/0 ?',
        ],
        right: ["Toutes celles qui n'ont pas d'autre route (la route par défaut)"],
        wrong: ['Aucune', 'Seulement le réseau local', 'Seulement la machine elle-même'],
      },
    ],
    wrong: [
      'Elle traduit les noms en adresses',
      'Elle distribue les adresses IP',
      'Elle chiffre le trafic',
    ],
    why: "Ce qui n'est pas sur ton réseau part vers le routeur (la passerelle) ; 0.0.0.0/0 correspond à tout, c'est donc la route par défaut.",
  },
  'net-tcp-udp': {
    forms: [
      {
        ask: [
          'Que garantit TCP que UDP ne garantit pas ?',
          "Qu'apporte TCP, contrairement à UDP ?",
        ],
        right: [
          "Que tout arrive, dans l'ordre et sans doublons",
          'Une livraison fiable et ordonnée',
        ],
        wrong: [
          "Qu'il est plus rapide",
          "Qu'il est chiffré",
          "Qu'il atteint toutes les machines du réseau",
          "Qu'il n'a pas besoin de port",
        ],
      },
      {
        ask: ['Quel protocole de transport utilise HTTP/1.1 ?', 'Sur quoi circule HTTP/1.1 ?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: ["Qu'il est plus rapide", "Qu'il est chiffré", "Qu'il n'a pas besoin de port"],
    why: 'TCP numérote, accuse réception et renvoie ; UDP envoie et oublie.',
  },
  'net-dns': {
    forms: [
      {
        ask: ['Que fait le DNS ?', 'À quoi sert le DNS ?'],
        right: ['Il traduit les noms de domaine en adresses IP'],
        wrong: [
          'Il distribue les adresses IP',
          'Il chiffre la connexion',
          'Il route les paquets',
          'Il stocke les pages web',
        ],
      },
      {
        ask: ['Quand tu tapes un nom comme intra.42.fr, quel système le transforme en IP ?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: ['Il distribue les adresses IP', 'Il chiffre la connexion', 'Il route les paquets'],
    why: "Le DNS, c'est l'annuaire d'Internet : d'un nom à une adresse.",
  },
  'srv-socket-steps': {
    forms: [
      {
        ask: [
          'Dans quel ordre un serveur TCP prépare-t-il sa socket ?',
          'Quelles étapes faut-il suivre pour commencer à accepter des connexions ?',
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
        ask: ['Que renvoie `accept` ?', 'À chaque connexion acceptée, que renvoie accept ?'],
        right: [
          'Un nouveau descripteur de fichier pour parler à ce client',
          'Une nouvelle socket, rien que pour cette connexion',
        ],
        wrong: ["La même socket d'écoute", 'Le port du client', 'Le nombre de clients'],
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
          'À quoi sert `poll` (ou select, epoll, kqueue) dans un serveur ?',
          'Que permet poll à un serveur ?',
        ],
        right: [
          'Attendre sur plusieurs descripteurs à la fois et savoir lesquels sont prêts',
          'Servir de nombreux clients avec un seul thread',
        ],
        wrong: [
          'Créer des threads',
          'Chiffrer la connexion',
          'Résoudre des noms',
          'Mesurer le temps de réponse',
        ],
      },
      {
        ask: [
          "Pourquoi ne faut-il pas faire `read` sur une socket avant que poll dise qu'elle est prête ?",
          "Que se passe-t-il si tu lis, en mode bloquant, une socket qui n'a rien à lire ?",
        ],
        right: ['Il bloque et laisse les autres clients en plan', 'Il bloque tout le serveur'],
        wrong: ['Il renvoie toujours 0', 'Il ferme la connexion', 'Il ne se passe rien'],
      },
    ],
    wrong: ['Créer des threads', 'Chiffrer la connexion', 'Résoudre des noms'],
    why: "Avec une seule boucle et poll, le serveur ne lit ou n'écrit que là où il ne bloquera pas.",
  },
  'srv-partial': {
    forms: [
      {
        ask: [
          'Un client envoie `PRIVMSG #42 :salut\\r\\n`, mais `recv` ne te donne que `PRIVMSG #4`. Que fais-tu ?',
          'recv renvoie un demi-message. Que doit faire le serveur ?',
        ],
        right: [
          "Le garder dans un buffer propre à ce client jusqu'à ce que la fin de ligne arrive",
          "Accumuler ce qu'il reçoit jusqu'à avoir une ligne complète, puis la traiter",
        ],
      },
    ],
    wrong: [
      'Le rejeter : il est mal formé',
      'Le traiter tel quel',
      'Fermer la connexion',
      'Attendre avec sleep que le reste arrive',
    ],
    why: "TCP est un flux d'octets, pas de messages : les coupures ne tombent pas sur tes fins de ligne.",
  },
  'http-status': {
    forms: [
      {
        ask: [
          'Quel code HTTP veut dire « introuvable » ?',
          "Avec quel code répond une page qui n'existe pas ?",
        ],
        right: ['404'],
        wrong: ['200', '301', '500', '403'],
      },
      {
        ask: [
          'Quel code HTTP veut dire « méthode non autorisée » ?',
          'Quel code reçoit un DELETE là où seul GET est accepté ?',
        ],
        right: ['405'],
        wrong: ['404', '403', '500', '400'],
      },
      {
        ask: [
          'Quelle famille de codes HTTP signale une erreur du serveur ?',
          'Si la faute vient du serveur, de quelle famille est le code ?',
        ],
        right: ['5xx'],
        wrong: ['4xx', '3xx', '2xx'],
      },
    ],
    wrong: ['200', '301', '500', '403', '201'],
    why: '2xx, tout va bien ; 3xx redirige ; 4xx, erreur du client (404 introuvable, 405 méthode non autorisée) ; 5xx, erreur du serveur.',
  },
  'http-methods': {
    forms: [
      {
        ask: [
          'Quelle méthode HTTP ne devrait rien modifier sur le serveur ?',
          'Quelle méthode HTTP sert seulement à demander, sans rien changer ?',
        ],
        right: ['GET'],
        wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
      },
      {
        ask: [
          "Quel en-tête indique combien d'octets fait le corps de la requête ?",
          'Dans quel en-tête passe la taille du corps ?',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Host', 'Accept'],
      },
    ],
    wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
    why: 'GET ne fait que demander ; POST, PUT, PATCH et DELETE modifient. Content-Length (ou chunked) indique où finit le corps.',
  },
  'http-chunked': {
    forms: [
      {
        ask: [
          'Une requête arrive avec `Transfer-Encoding: chunked`. Comment sais-tu où finit le corps ?',
          "En chunked, il n'y a pas de Content-Length. Quand le corps se termine-t-il ?",
        ],
        right: [
          'Quand arrive un chunk de taille 0',
          "Quand arrive le chunk « 0 » suivi d'une ligne vide",
        ],
      },
    ],
    wrong: [
      'Quand la connexion est fermée',
      'Après 1024 octets',
      'Au premier \\r\\n',
      'Jamais : il faut attendre le timeout',
    ],
    why: 'Chaque chunk est précédé de sa taille en hexadécimal ; celui de taille 0 marque la fin.',
  },
  'http-cgi': {
    forms: [
      {
        ask: [
          "Qu'est-ce qu'un CGI dans un serveur web ?",
          'Que fait le serveur quand une requête va vers un CGI ?',
        ],
        right: [
          "Il exécute un programme à part et renvoie ce qu'il écrit",
          'Il lance un programme qui construit la réponse',
        ],
      },
    ],
    wrong: [
      'Il garde la page en cache',
      'Il ajoute un en-tête spécial',
      'Il chiffre la réponse',
      'Il répartit la charge entre plusieurs serveurs',
    ],
    why: "Le serveur lance le programme (fork + execve) avec la requête dans les variables d'environnement et sur son entrée, puis renvoie sa sortie.",
  },
  'irc-basics': {
    forms: [
      {
        ask: [
          "Quelle commande IRC te fait devenir membre d'un canal ?",
          'Quelle commande envoies-tu pour aller dans #42 ?',
        ],
        right: ['JOIN'],
        wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
      },
      {
        ask: [
          'Comment se termine chaque message dans le protocole IRC ?',
          'Par quoi finissent les lignes IRC ?',
        ],
        right: ['\\r\\n'],
        wrong: ['\\n seul', '\\0', ';'],
      },
    ],
    wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
    why: 'IRC, ce sont des lignes de texte terminées par CRLF ; JOIN fait rejoindre un canal, PRIVMSG envoie un message et NICK fixe le pseudo.',
  },
  'docker-image': {
    forms: [
      {
        ask: [
          'Quelle différence y a-t-il entre une image Docker et un conteneur ?',
          'Quel lien y a-t-il entre un conteneur et son image ?',
        ],
        right: [
          "L'image est le modèle ; le conteneur, une copie qui tourne",
          "Le conteneur, c'est l'image en train de tourner",
        ],
        wrong: [
          "C'est la même chose",
          'Le conteneur est une machine virtuelle complète',
          "L'image est un conteneur arrêté",
          "Le conteneur, c'est le Dockerfile",
        ],
      },
      {
        ask: [
          "Qu'advient-il de ce qui a été écrit dans un conteneur sans volume quand tu le supprimes ?",
          'Sans volume, que deviennent ses données quand tu supprimes le conteneur ?',
        ],
        right: ['Elles disparaissent avec lui'],
        wrong: [
          "Elles sont enregistrées dans l'image",
          'Elles passent au conteneur suivant',
          'Elles sont envoyées sur Docker Hub',
        ],
      },
    ],
    wrong: [
      "C'est la même chose",
      "L'image est un conteneur arrêté",
      "Le conteneur, c'est le Dockerfile",
    ],
    why: "L'image ne change pas ; chaque conteneur ajoute sa propre couche en écriture, qui disparaît avec lui sauf s'il y a un volume.",
  },
  'docker-vm': {
    forms: [
      {
        ask: [
          "En quoi un conteneur diffère-t-il d'une machine virtuelle ?",
          "Pourquoi un conteneur est-il plus léger qu'une machine virtuelle ?",
        ],
        right: ["Il partage le noyau du système hôte : il n'a pas de noyau à lui"],
        wrong: [
          'Il est toujours plus sûr',
          'Il émule le matériel',
          'Il ne marche que sous Linux avec une interface graphique',
          'Il a son propre noyau',
        ],
      },
      {
        ask: [
          "Pourquoi `tail -f /dev/null` ne convient-il pas comme processus principal d'un conteneur ?",
          "Qu'est-ce qui ne va pas quand on garde un conteneur en vie avec une boucle infinie en PID 1 ?",
        ],
        right: [
          "C'est du bricolage : le conteneur doit lancer le service au premier plan",
          "Le vrai service n'est pas le processus principal",
        ],
        wrong: ['Ça consomme beaucoup de CPU', "/dev/null n'existe pas", "Le conteneur s'arrête"],
      },
    ],
    wrong: ['Il est toujours plus sûr', 'Il émule le matériel', 'Il a son propre noyau'],
    why: 'Un conteneur est un processus isolé sur le même noyau ; il vit tant que vit son processus principal.',
  },
  'docker-compose-net': {
    forms: [
      {
        ask: [
          'Dans docker-compose, WordPress doit parler au service de la base de données (MariaDB). Que met-il comme hôte ?',
          "Deux services sur le même réseau compose. Comment l'un trouve-t-il l'autre ?",
        ],
        right: [
          'Le nom du service, que compose résout',
          'Par le nom du service : compose a un DNS interne',
        ],
      },
    ],
    wrong: ['localhost', "L'adresse 127.0.0.1", "L'IP publique de la machine", "L'adresse 0.0.0.0"],
    why: 'Chaque conteneur a son propre localhost ; compose fournit un DNS interne où chaque service se joint par son nom.',
  },
  'web-https': {
    forms: [
      {
        ask: ["Qu'est-ce que HTTPS ajoute à HTTP ?", 'Que veut dire le « S » de HTTPS ?'],
        right: [
          'Il chiffre la connexion avec TLS et prouve qui est le serveur',
          'Que la connexion est chiffrée avec TLS',
        ],
        wrong: [
          "Qu'il compresse les pages",
          'Que le site est plus rapide',
          "Qu'il stocke les mots de passe",
          "Qu'il bloque les pubs",
        ],
      },
      {
        ask: ['Sur quel port HTTPS écoute-t-il par défaut ?', 'Quel est le port de HTTPS ?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      "Qu'il compresse les pages",
      'Que le site est plus rapide',
      "Qu'il stocke les mots de passe",
    ],
    why: "HTTPS, c'est HTTP dans TLS : du chiffrement plus le certificat du serveur. Le 80, c'est HTTP ; le 443, HTTPS.",
  },
  'web-sql-injection': {
    forms: [
      {
        ask: [
          "Qu'est-ce qui ne va pas dans cette requête ?",
          "Que se passe-t-il si quelqu'un tape `' OR '1'='1` comme nom ?",
        ],
        right: [
          'Injection SQL : il faut utiliser des requêtes paramétrées',
          "L'utilisateur peut réécrire le SQL et récupérer tous les enregistrements",
        ],
      },
    ],
    wrong: [
      'Elle est lente',
      'Il manque un point-virgule',
      'Elle ne renvoie jamais rien',
      "Elle ne marche qu'avec MySQL",
    ],
    why: "Coller le texte de l'utilisateur dans le SQL lui permet de le réécrire ; les paramètres le traitent toujours comme une donnée.",
  },
  'web-hash-passwords': {
    forms: [
      {
        ask: [
          'Comment faut-il stocker les mots de passe ?',
          'Comment un mot de passe est-il stocké en base de données ?',
        ],
        right: [
          'Avec un hash lent et salé (bcrypt, argon2)',
          'Passés dans bcrypt ou argon2, jamais tels quels',
        ],
        wrong: [
          'En clair, dans une table à part',
          'Chiffrés avec une clé écrite dans le code',
          'Avec MD5',
          'En base64',
        ],
      },
      {
        ask: [
          "Qu'est-ce que le « sel » d'un hash de mot de passe ?",
          'Pourquoi ajoute-t-on du sel à un mot de passe avant de le hasher ?',
        ],
        right: [
          'Une valeur aléatoire par personne : deux mots de passe identiques donnent des hashs différents',
          'Pour que les tables précalculées ne servent à rien',
        ],
        wrong: [
          'Pour le chiffrer avec une clé',
          'Pour raccourcir le hash',
          'Pour pouvoir le retrouver',
        ],
      },
    ],
    wrong: ['En clair, dans une table à part', 'Avec MD5', 'En base64'],
    why: 'Un hash lent et salé ne se défait pas et ne se teste pas en masse ; base64 ou MD5 ne protègent rien.',
  },
  'web-websocket': {
    forms: [
      {
        ask: [
          'Pourquoi utiliser des WebSockets pour un jeu dans le navigateur ?',
          'Que permet une WebSocket ?',
        ],
        right: [
          'Que le serveur envoie des données sans que le client les demande',
          'Une connexion qui reste ouverte dans les deux sens',
        ],
      },
    ],
    wrong: [
      'Chiffrer mieux que HTTPS',
      "Prendre moins de place qu'une image",
      'Se passer de TCP',
      'Stocker les données dans le navigateur',
    ],
    why: "HTTP, c'est question-réponse ; la WebSocket garde la connexion ouverte pour envoyer à tout moment.",
  },
}
