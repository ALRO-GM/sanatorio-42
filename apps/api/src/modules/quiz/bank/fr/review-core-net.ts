/** Repaso de Not-games en francés: traducción de `../review-core-net.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_NET_FR: Readonly<Record<string, ReviewEntry>> = {
  'np-net-broadcast': {
    title: 'Adresse réseau et de broadcast',
    definition:
      "Le masque découpe le dernier octet en blocs (de 64 en /26, de 16 en /28). L'adresse réseau est le début du bloc où tombe l'IP, et l'adresse de broadcast, sa fin.",
    example: '192.168.10.77/26 → bloc 64–127 : réseau 192.168.10.64, broadcast 192.168.10.127.',
  },
  'np-host-range': {
    title: "Les IP valables d'un réseau",
    definition:
      "Une machine peut avoir n'importe quelle IP du bloc sauf la première (le réseau) et la dernière (le broadcast). Une IP hors du bloc appartient à un autre réseau.",
    example: '172.16.0.32/28 va de .32 à .47 : les machines, de .33 à .46.',
  },
  'np-next-hop': {
    title: 'Table de routage et next hop',
    definition:
      'Chaque route dit : pour telle destination, remets le paquet à tel routeur (next hop). Ce routeur doit être sur un réseau que tu joins directement, sinon impossible de le lui donner.',
    example:
      'Machine 192.168.1.2/24 → route « default → 192.168.1.1 » : le routeur .1 est sur son réseau.',
  },
  'np-router-interfaces': {
    title: "Les interfaces d'un routeur",
    definition:
      'Un routeur relie des réseaux différents : chaque interface a une IP de son réseau, et deux interfaces du même routeur ne peuvent pas être sur le même réseau, sinon il ne saurait pas par laquelle faire sortir le paquet.',
    example: "Un routeur avec 10.0.1.1/24 sur une interface et 10.0.2.1/24 sur l'autre.",
  },
  'ws-config': {
    title: 'Configuration façon NGINX',
    definition:
      "Le fichier de webserv ressemble à un bloc server de NGINX : listen fixe le port, server_name le nom, root le dossier, index le fichier par défaut, autoindex le listing et error_page les pages d'erreur. Si le corps dépasse client_max_body_size, on répond 413.",
    example:
      'server { listen 8080; root /var/www; index index.html; client_max_body_size 1M; error_page 404 /404.html; }',
  },
  'ws-poll-only': {
    title: 'Un seul poll pour tout',
    definition:
      "webserv utilise un seul poll (ou équivalent) pour les sockets d'écoute et celles des clients, et ne lit ou n'écrit sur une socket que quand poll dit qu'elle est prête. Après un read ou un write, on ne regarde pas errno.",
    example: 'poll(fds, n, -1) ; si fds[i].revents & POLLIN → recv ; si POLLOUT → send.',
  },
  'ws-redirect': {
    title: 'Redirections HTTP',
    definition:
      "Une redirection répond avec un code 3xx et la nouvelle adresse dans l'en-tête Location. 301 est permanente (le navigateur s'en souvient) ; 302 et 307 sont temporaires.",
    example: 'HTTP/1.1 301 Moved Permanently\\r\\nLocation: /nouveau/\\r\\n',
  },
  'ws-upload': {
    title: 'Envoyer des fichiers en POST',
    definition:
      "Un formulaire qui envoie des fichiers met le corps en multipart/form-data : chaque partie a ses en-têtes et son contenu, et elles sont séparées par le boundary qu'annonce le Content-Type.",
    example:
      'Content-Type: multipart/form-data; boundary=----abc → parties séparées par ------abc.',
  },
  'irc-register': {
    title: "S'enregistrer sur IRC",
    definition:
      "En se connectant, le client envoie PASS avec le mot de passe du serveur, NICK avec son pseudo et USER avec son nom. Tant qu'il n'a pas tout envoyé, le serveur ne le laisse rien faire d'autre.",
    example: 'PASS secret\\r\\nNICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\n',
  },
  'irc-modes': {
    title: 'Les modes de canal',
    definition:
      "MODE change le fonctionnement d'un canal : +i sur invitation, +t seuls les opérateurs changent le sujet, +k demande une clé, +o rend quelqu'un opérateur et +l plafonne le nombre d'utilisateurs.",
    example: 'MODE #42 +k cle → pour entrer : JOIN #42 cle.',
  },
  'irc-operator': {
    title: "Les commandes d'opérateur",
    definition:
      "Un opérateur de canal a KICK pour expulser quelqu'un, INVITE pour inviter dans un canal +i, TOPIC pour changer le sujet et MODE pour les modes du canal.",
    example: 'KICK #42 pepe :spam / INVITE pepe #42 / TOPIC #42 :Exam lundi',
  },
  'irc-privmsg': {
    title: 'PRIVMSG',
    definition:
      'PRIVMSG envoie un message à un pseudo (en privé) ou à un canal (qui commence par # et touche tous ses membres). Le texte vient après les deux-points.',
    example: 'PRIVMSG pepe :salut / PRIVMSG #42 :salut tout le monde',
  },
  'irc-server-rules': {
    title: 'Les règles du serveur ft_irc',
    definition:
      "ft_irc n'a pas droit à fork : un seul processus avec un seul poll sert tout le monde. Et comme les messages peuvent arriver en morceaux (nc avec ^D), on les accumule par client jusqu'au \\r\\n.",
    example:
      'nc -C 127.0.0.1 6667 → « com » ^D « man » ^D « d » Entrée : le serveur traite « command ».',
  },
  'inc-one-service': {
    title: 'Un conteneur par service',
    definition:
      "Dans Inception, NGINX, WordPress avec php-fpm et MariaDB ont chacun leur conteneur et leur Dockerfile, et ils redémarrent tout seuls s'ils plantent (restart dans le compose).",
    example: 'services : nginx, wordpress, mariadb ; chacun avec restart: always.',
  },
  'inc-nginx-tls': {
    title: 'NGINX, seule porte d’entrée',
    definition:
      "Seul NGINX est ouvert vers l'extérieur, seulement sur le port 443 et seulement avec TLSv1.2 ou TLSv1.3. WordPress et MariaDB ne se voient qu'à l'intérieur du réseau Docker.",
    example: 'listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'inc-volumes': {
    title: "Les volumes d'Inception",
    definition:
      "Il y a deux volumes : l'un avec la base de données de WordPress, l'autre avec les fichiers du site. Sur l'hôte, les deux vivent dans /home/login/data (avec ton login).",
    example: '/home/pepe/data/mariadb et /home/pepe/data/wordpress.',
  },
  'inc-rules': {
    title: "Ce qu'Inception interdit",
    definition:
      "Les images se construisent à partir d'Alpine ou de Debian, sans récupérer d'images toutes faites ; les mots de passe vont dans un .env ou des secrets, pas dans le Dockerfile ; ni network: host ni --link ; et le service tourne au premier plan en PID 1.",
    example: 'FROM debian:… et CMD ["nginx", "-g", "daemon off;"]',
  },
  'tr-pong': {
    title: 'Pong et tournoi',
    definition:
      "ft_transcendence est un site où l'on joue au Pong directement dans le navigateur. Le tournoi oppose plusieurs joueurs et le site doit montrer clairement qui joue contre qui et dans quel ordre.",
    example: 'Tournoi à 4 : A contre B, C contre D, puis la finale entre les gagnants.',
  },
  'tr-2fa': {
    title: 'La 2FA avec TOTP',
    definition:
      "L'authentification à deux facteurs demande, en plus du mot de passe, quelque chose que tu as. Avec TOTP, le téléphone et le serveur partagent un secret et calculent avec l'heure un code à 6 chiffres qui change toutes les 30 s.",
    example:
      "Tu scannes un QR code avec l'appli d'authentification, puis tu tapes le code qu'elle affiche.",
  },
  'tr-auth-tokens': {
    title: 'JWT et OAuth',
    definition:
      "Un JWT (en-tête, contenu et signature) est signé, pas chiffré : tout le monde peut le lire, mais personne ne peut le modifier sans la clé. Avec OAuth, ton site reçoit un code qu'il échange contre un jeton : il ne voit jamais le mot de passe 42.",
    example: 'Authorization: Bearer eyJhbGciOi… (ce qui est entre les points, c’est du base64url).',
  },
  'tr-xss': {
    title: 'Le XSS',
    definition:
      "Le XSS consiste à glisser du JavaScript dans le site pour qu'il s'exécute dans le navigateur des autres. On l'évite en échappant ce qu'écrit chaque utilisateur avant de le mettre dans le HTML. Et tout le site passe chiffré : https et wss.",
    example: 'Nom « <script>voler()</script> » → affiché comme &lt;script&gt;…, pas exécuté.',
  },
}
