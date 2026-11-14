/**
 * Nivel principiante en francés. Mismas partes y mismas líneas de ejemplo que
 * en inglés; las IP, las máscaras y los nombres de las máquinas no se tocan.
 */

import type { UnitText } from '../types.js'

export const BEGINNER_FR: Record<string, UnitText> = {
  'net-octets': {
    title: 'Une adresse : quatre nombres, 32 bits',
    goal: 'Trouve l’adresse de réseau de trois adresses. Touche les bits pour tester ton idée avant d’écrire.',
    theory: {
      what: 'Une adresse IPv4, c’est 32 bits écrits sous la forme de 4 nombres de 0 à 255 (les octets). Le masque dit combien de bits, en partant de la gauche, désignent le réseau ; le reste désigne la machine.',
      how: [
        '192.168.1.42 /24      # 24 bits de réseau, 8 de machine',
        'réseau : 192.168.1.0  # bits de machine à 0',
        '172.20.7.9 /16        # réseau : 172.20.0.0',
      ],
      when: 'Pour savoir si deux machines sont dans le même réseau, tu compares leur partie réseau : c’est la première chose que tu regardes quand quelque chose ne se connecte pas.',
      whenNot: 'Un octet ne dépasse jamais 255 : 192.168.1.300 n’est pas une adresse.',
      problems:
        'Erreur classique : croire que le réseau, ce sont toujours « les trois premiers nombres ». Ça ne vaut que pour /24. Avec /16, 172.20.7.9 est dans le réseau 172.20.0.0.',
    },
    example: 'Avant de regarder : avec /24, quels nombres de 10.42.7.99 désignent le réseau ?',
  },
  'net-mask': {
    title: 'Le masque, écrit de deux façons',
    goal: 'Convertis chaque masque dans son autre notation : du décimal pointé au préfixe, et du préfixe au décimal pointé.',
    theory: {
      what: 'Un masque s’écrit en préfixe (/24 : 24 bits de réseau) ou en décimal pointé (255.255.255.0 : ces mêmes 24 uns). Les deux disent la même chose.',
      how: [
        '/8   = 255.0.0.0',
        '/16  = 255.255.0.0',
        '/24  = 255.255.255.0',
        '/25  = 255.255.255.128   # un bit de plus : 128',
        '/26  = 255.255.255.192   # 128 + 64',
      ],
      when: 'Certains outils veulent /24 et d’autres 255.255.255.0 : quand tu configures une interface, tu passes de l’un à l’autre tout le temps.',
      problems:
        'Erreur classique : inventer des masques comme 255.255.255.100. Les uns sont à la suite : dans un octet, seuls 0, 128, 192, 224, 240, 248, 252, 254 et 255 sont possibles.',
    },
    example: 'Avant de regarder : combien de uns à la suite compte 255.255.255.192 ?',
  },
  'net-broadcast': {
    title: 'Réseau et broadcast',
    goal: 'Pour chaque adresse, trouve son adresse de réseau et son adresse de broadcast.',
    theory: {
      what: 'Chaque réseau réserve deux adresses : l’adresse de réseau (bits de machine à 0) le désigne, et l’adresse de broadcast (bits de machine à 1) parle à tout le monde à la fois.',
      how: [
        '192.168.1.42 /24',
        'réseau :   192.168.1.0',
        'broadcast : 192.168.1.255',
        '10.42.7.99 /16',
        'réseau : 10.42.0.0    broadcast : 10.42.255.255',
      ],
      when: 'Quand tu distribues des adresses dans un bureau ou un cluster, tu sais lesquelles personne ne peut avoir.',
      problems:
        'Erreur classique : donner à une machine l’adresse de réseau ou de broadcast. Le paquet ne part jamais : « 192.168.1.255 est l’adresse de broadcast de son sous-réseau ».',
    },
    example:
      'Avant de regarder : dans 172.16.30.5/16, quels octets passent à 255 dans le broadcast ?',
  },
  'net-range': {
    title: 'La plage de machines',
    goal: 'Pour chaque réseau, trouve la première adresse utilisable, la dernière et le nombre de machines qui tiennent.',
    theory: {
      what: 'Entre l’adresse de réseau et celle de broadcast, il y a celles que tu peux distribuer : réseau + 1 jusqu’à broadcast − 1. Avec h bits de machine, il en tient 2^h − 2.',
      how: [
        '192.168.1.0 /24      # 8 bits de machine',
        'première : 192.168.1.1',
        'dernière : 192.168.1.254',
        'il en tient : 2^8 - 2 = 254',
      ],
      when: 'Avant de monter un réseau, tu comptes si toutes les machines tiennent, et tu gardes la première ou la dernière pour le routeur.',
      problems:
        'Erreur classique : compter 256 dans un /24. Deux sont réservées : il en tient 254.',
    },
    example:
      'Avant de regarder : dans 10.1.2.3/24, quelle est la dernière adresse que tu peux distribuer ?',
  },
  'net-cut': {
    title: 'Les masques qui coupent un octet',
    goal: 'Deux adresses dont les masques ne tombent pas sur un point : trouve leur réseau, leur broadcast et leur plage.',
    theory: {
      what: 'Un préfixe autre que 8, 16 ou 24 coupe un octet en plein milieu. Les réseaux avancent par pas : /26 laisse 6 bits de machine, donc ils avancent par pas de 64.',
      how: [
        '192.168.1.77 /26     # pas : 2^6 = 64',
        'réseaux : .0  .64  .128  .192',
        'réseau : 192.168.1.64   # 77 est entre 64 et 127',
        'broadcast : 192.168.1.127',
        'machines : de .65 à .126',
      ],
      when: 'Presque aucun réseau réel n’est un /24 pile : les liens entre routeurs et les réseaux de services sont plus petits.',
      problems:
        'Erreur classique : traiter un /26 comme un /24 et répondre .0 comme réseau. 192.168.1.77/26 et 192.168.1.130/26 ne sont pas dans le même réseau.',
    },
    example: 'Avant de regarder : 192.168.1.77 avec /26, dans quel pas de 64 tombe-t-elle ?',
  },
  'net-boss-inventory': {
    title: 'L’inventaire des adresses',
    goal: 'Documente les trois réseaux avant la fin du temps imparti.',
    story:
      'L’équipe plateforme déménage demain et personne n’a noté quel réseau est lequel. Tu as trois adresses relevées sur les serveurs et cinq minutes avant la réunion.',
    tasks: [
      'Trouve réseau, broadcast et plage pour chaque adresse',
      'Attention : chacune a un masque différent',
      'Les bits sont toujours là si tu en as besoin',
    ],
  },
  'net-pair': {
    title: 'Deux machines sur le même câble',
    goal: 'Donne à cache une adresse qui permette à api de l’atteindre.',
    theory: {
      what: 'Deux machines reliées par un câble se parlent directement si chacune voit l’autre dans son propre réseau : même partie réseau, partie machine différente.',
      how: [
        'ana : 192.168.1.10 /24',
        'leo : 192.168.1.20 /24    # même réseau : 192.168.1.0',
        'ana -> leo               # livré directement',
        'leo -> ana               # la réponse revient par le même chemin',
      ],
      when: 'C’est le cas le plus simple et la première chose à vérifier : les deux sont-elles dans le même réseau ?',
      whenNot: 'Jamais la même IP des deux côtés : une adresse en double n’atteint personne.',
      problems:
        'Erreur classique : donner à la seconde une IP d’un autre réseau. Le paquet meurt à la source : « ana n’a pas de route vers 192.168.2.20 ».',
    },
    example: 'Avant de regarder : si leo avait 192.168.2.20, où le paquet d’ana mourrait-il ?',
  },
  'net-switch': {
    title: 'Le switch',
    goal: 'Numérote worker et db pour que les trois machines du switch s’atteignent entre elles.',
    theory: {
      what: 'Un switch relie plusieurs machines en un seul réseau. Il n’a pas d’IP et ne décide de rien : il fait passer ce qu’il reçoit. Tout ce qui y est branché partage un réseau.',
      how: [
        'ana       10.0.0.11/24 -+',
        'leo       10.0.0.12/24 -+- sw1',
        'impresora 10.0.0.50/24 -+',
        '# trois machines, un seul réseau : 10.0.0.0/24',
      ],
      when: 'C’est ce qu’il y a dans chaque rangée du cluster et chaque baie : beaucoup de machines, un seul réseau.',
      problems:
        'Erreur classique : chercher l’IP du switch ou s’en servir comme passerelle. Il n’en a pas. Si une machine du switch ne répond pas, vérifie son IP et son masque.',
    },
    example:
      'Avant de regarder : d’ana à l’imprimante, combien d’appareils avec une IP le paquet traverse-t-il ?',
  },
  'net-range-pick': {
    title: 'Choisir une adresse dans la plage',
    goal: 'Ajoute logs et alertas au réseau de métriques. Calcule sa plage avant de choisir.',
    theory: {
      what: 'Avec un masque qui coupe l’octet, un nombre qui ressemble aux autres ne suffit pas : la nouvelle adresse doit tomber dans le même pas que les autres.',
      how: [
        'api : 172.16.8.70 /26',
        'réseau : 172.16.8.64     # machines : de .65 à .126',
        'bon :    172.16.8.100',
        'faux :   172.16.8.130    # c’est déjà le réseau .128',
      ],
      when: 'Quand tu ajoutes une machine à un réseau existant, tu calcules la plage avant de choisir.',
      problems:
        'Erreur classique : se fier aux trois premiers nombres. Avec 172.16.8.130/26, la nouvelle machine dit « pas de route vers 172.16.8.70 » : pour elle, c’est un autre réseau.',
    },
    example:
      'Avant de regarder : api est 172.16.8.70/26. Une machine en 172.16.8.130/26 peut-elle l’atteindre ?',
  },
  'net-edges': {
    title: 'Les deux que tu ne donnes jamais',
    goal: 'Il ne reste qu’une adresse libre dans le réseau primario. Donne-la à replica.',
    theory: {
      what: 'Dans chaque réseau, la première adresse (réseau) et la dernière (broadcast) n’appartiennent à personne. Un réseau /30 n’en laisse que 2 pour les machines.',
      how: [
        '10.0.0.4 /30',
        'réseau : 10.0.0.4   broadcast : 10.0.0.7',
        'machines : 10.0.0.5 et 10.0.0.6',
      ],
      when: 'Un câble entre deux appareils se numérote en général avec un /30 : il utilise 4 adresses et n’en gaspille aucune.',
      problems:
        'Erreur classique : utiliser .4 ou .7. Le paquet ne part jamais : « 10.0.0.7 est l’adresse de broadcast de son sous-réseau ».',
    },
    example: 'Avant de regarder : dans 10.0.0.4/30, une machine peut-elle être 10.0.0.7 ?',
  },
  'net-special': {
    title: 'Loopback et autres plages réservées',
    goal: 'Quelqu’un a numéroté ci et runner avec des adresses loopback. Déplace-les dans le réseau repo.',
    theory: {
      what: 'Des plages entières ne servent à rien pour un réseau : 127.x.x.x est le loopback (une machine qui se parle à elle-même), 0.x n’appartient à personne et à partir de 224, c’est du multicast ou du réservé.',
      how: [
        '127.0.0.1       # localhost : ne sort jamais sur le câble',
        '0.0.0.0         # « n’importe laquelle », pas une machine',
        '224.0.0.0 +     # multicast et réservé',
        '10.x  172.16-31.x  192.168.x   # privées : pour ton réseau',
      ],
      when: 'Pour ton réseau, tu choisis une plage privée ; les autres ont un propriétaire ou un usage spécial.',
      problems:
        'Erreur classique : numéroter un réseau en 127.0.0.x parce que « localhost marche ». Le paquet ne part jamais : « 127.0.0.5 est une adresse loopback ».',
    },
    example: 'Avant de regarder : ana a 127.0.0.5 et leo 127.0.0.6. Peuvent-ils s’atteindre ?',
  },
  'net-boss-printer': {
    title: 'L’imprimante de la salle de réunion',
    goal: 'Répare les trois portables avant la démo.',
    story:
      'Démo dans dix minutes et personne ne peut imprimer les badges. Quelqu’un a « réparé » le réseau de la salle à la main et chaque portable a maintenant une panne différente.',
    tasks: [
      'ana, leo et marta doivent atteindre l’imprimante',
      'L’imprimante va bien : n’y touche pas',
      'Chaque portable tombe en panne pour une raison différente',
    ],
  },
  'net-router': {
    title: 'Le routeur : un pied dans chaque réseau',
    goal: 'Numérote les deux interfaces de r1. Les machines disent déjà quelle passerelle elles utilisent.',
    theory: {
      what: 'Un routeur relie des réseaux différents. Il a une interface dans chacun, avec une adresse de ce réseau, et fait passer les paquets de l’un à l’autre.',
      how: [
        'réseau A : 10.0.1.0/24   routeur : 10.0.1.1',
        'réseau B : 10.0.2.0/24   routeur : 10.0.2.1',
        '# chaque interface reçoit une adresse de SON réseau',
      ],
      when: 'Dès qu’il y a deux réseaux (bureau et serveurs, staging et production), il y a un routeur entre eux.',
      whenNot: 'Dans un seul réseau, pas besoin de routeur : le switch suffit.',
      problems:
        'Erreur classique : donner aux deux interfaces des adresses du même réseau. Le routeur proteste : « ses interfaces a et b sont dans des sous-réseaux qui se chevauchent ».',
    },
    example: 'Avant de regarder : si l’interface b de r1 était 10.0.1.2, ana atteindrait-elle db ?',
  },
  'net-gateway': {
    title: 'La passerelle par défaut',
    goal: 'Donne à dev et runner leur passerelle pour qu’ils s’atteignent à travers r1.',
    theory: {
      what: 'La passerelle, c’est l’adresse du routeur dans ton propre réseau : l’endroit où tu envoies tout ce qui n’est pas dans ton réseau. Sans elle, une machine ne parle qu’à ses voisines.',
      how: [
        'ana : 10.0.1.10/24      passerelle : 10.0.1.1',
        'destination 10.0.1.20  ->  voisine : directement',
        'destination 10.0.2.10  ->  pas mon réseau : vers 10.0.1.1',
      ],
      when: 'C’est le troisième réglage de toute machine, après l’IP et le masque : sans elle, pas d’internet ni d’autre réseau.',
      problems:
        'Erreur classique : utiliser l’adresse du routeur de l’autre réseau. La machine dit « le saut suivant 10.0.2.1 n’est dans aucun de ses réseaux ».',
    },
    example:
      'Avant de regarder : ana utilise 10.0.2.1, l’autre côté de r1, comme passerelle. Le paquet part-il ?',
  },
  'net-roundtrip': {
    title: 'L’aller et le retour',
    goal: 'La requête de portatil atteint nas, mais la réponse ne revient jamais. Répare nas.',
    theory: {
      what: 'Un ping, ce sont deux trajets : la requête part et la réponse revient. Chaque machine décide toute seule, avec son IP, son masque et sa passerelle. Si le retour échoue, il n’y a pas de connexion non plus.',
      how: [
        'aller :  ana -> r1 -> db     # arrive',
        'retour : db -> ?             # db n’a pas de passerelle',
        '# la réponse meurt à db',
      ],
      when: 'Quand quelque chose « arrive mais ne répond jamais », la panne est souvent à la destination : vérifie son masque et sa passerelle.',
      problems:
        'Erreur classique : ne vérifier que la machine qui lance le ping. Lis où il meurt : « retour : db n’a pas de route vers 10.0.1.10 ».',
    },
    example:
      'Avant de regarder : db n’a pas de passerelle. La requête d’ana arrive-t-elle ? Et la réponse ?',
  },
  'net-lan': {
    title: 'Construire un réseau derrière le routeur',
    goal: 'Le labo est branché sur l’interface lab de r1. Numérote lab1 et lab2 en entier : IP, masque et passerelle.',
    theory: {
      what: 'Pour brancher un nouveau réseau sur un routeur, tu choisis sa plage, tu donnes au routeur une adresse de cette plage et à chaque machine une autre, avec le même masque et le routeur comme passerelle.',
      how: [
        'routeur :   10.0.3.1/24',
        'machine 1 : 10.0.3.11/24    passerelle 10.0.3.1',
        'machine 2 : 10.0.3.12/24    passerelle 10.0.3.1',
      ],
      when: 'C’est tout le travail pour mettre en service une salle, une baie ou un nouvel environnement.',
      problems:
        'Erreur classique : des masques différents dans le même réseau. L’une voit l’autre comme une voisine et l’autre non : la requête arrive et la réponse meurt.',
    },
    example: 'Avant de regarder : d’ana à m2, combien y a-t-il de sauts et lequel est direct ?',
  },
  'net-boss-staging': {
    title: 'Staging n’atteint pas la base de données',
    goal: 'Rétablis la connexion entre le réseau de l’app et le réseau des données.',
    story:
      'Depuis que la base de données a déménagé dans son propre réseau, staging affiche « connection timed out ». Le déploiement de cinq heures dépend de toi.',
    tasks: [
      'staging doit atteindre db, et db doit répondre',
      'Le runner de CI doit aussi atteindre db',
      'Le routeur est bien câblé, mais mal numéroté',
    ],
  },
  'net-final-beginner': {
    title: 'Ton premier bureau',
    goal: 'Numérote tout le bureau : tout doit atteindre le serveur git.',
    story:
      'Peer4U ouvre un bureau : une salle de dev, une armoire de serveurs et le wifi invités, le tout branché sur un seul routeur. Le câblage est fait ; il manque les numéros.',
    tasks: [
      'Numérote les trois interfaces de r1',
      'Donne à leo une IP et une passerelle',
      'Donne à movil sa passerelle',
      'ana, leo et movil doivent atteindre git',
    ],
  },
}
