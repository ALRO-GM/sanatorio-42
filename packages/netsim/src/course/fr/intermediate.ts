/**
 * Nivel intermedio en francés. Mismas partes y mismas líneas de ejemplo que en
 * inglés; las IP, las máscaras y los nombres de las máquinas no se tocan.
 */

import type { UnitText } from '../types.js'

export const INTERMEDIATE_FR: Record<string, UnitText> = {
  'net-split': {
    title: 'Couper un réseau en deux',
    goal: 'La plage 10.8.4.0/24 a été coupée en deux moitiés, mais trois masques disent encore /24. Corrige-les.',
    theory: {
      what: 'Un bit de masque en plus coupe un réseau en deux moitiés. 192.168.10.0/24 donne 192.168.10.0/25 (.1 à .126) et 192.168.10.128/25 (.129 à .254).',
      how: [
        '192.168.10.0/24  ->  /25 + /25',
        'moitié basse : .0 à .127',
        'moitié haute : .128 à .255',
        '# le routeur met un pied dans chaque moitié',
      ],
      when: 'Tu reçois une seule plage et tu as deux salles : tu la coupes et tu mets un routeur entre les deux.',
      problems:
        'Erreur classique : laisser /24 sur le routeur. Il dit « ses interfaces a et b sont dans des sous-réseaux qui se chevauchent » et ne transmet rien.',
    },
    example:
      'Avant de regarder : r1 avec /24 sur les deux interfaces, laquelle utiliserait-il pour .200 ?',
  },
  'net-p2p': {
    title: 'Le lien entre deux routeurs',
    goal: 'Numérote le bout r2 du lien avec r1.',
    theory: {
      what: 'Deux routeurs sont reliés par un réseau rien qu’à eux. Un /30 contient exactement leurs deux adresses.',
      how: [
        'lien : 10.255.0.0/30',
        'r1 : 10.255.0.1      r2 : 10.255.0.2',
        '# .0 est le réseau et .3 le broadcast',
      ],
      when: 'Entre sites, entre ton routeur et le fournisseur, entre baies : chaque câble entre routeurs est un petit réseau.',
      problems:
        'Erreur classique : donner aux deux bouts des adresses de deux /30 différents (.1 et .5). r1 dit « pas de route vers 10.255.0.5 » : pour lui, c’est un autre réseau.',
    },
    example: 'Avant de regarder : r1 est 10.255.0.1/30 et r2 est 10.255.0.5/30. Se voient-ils ?',
  },
  'net-fit': {
    title: 'Quel masque pour combien de machines ?',
    goal: 'Pour chaque nombre de machines, écris le préfixe du plus petit réseau qui les contient.',
    theory: {
      what: 'Tu choisis le masque selon la taille : le plus petit réseau où tes machines tiennent. Avec h bits de machine, il en tient 2^h − 2.',
      how: [
        '/30 -> 2      /29 -> 6      /28 -> 14',
        '/27 -> 30     /26 -> 62     /25 -> 126',
        '/24 -> 254',
        '50 machines -> /26     # un /27 n’en contient que 30',
      ],
      when: 'Quand tu partages une plage entre équipes : chacune reçoit juste ce qu’il faut, il reste de la place pour la suivante.',
      problems:
        'Erreur classique : oublier les 2 réservées. Il tient 30 machines dans un /27 ; 31 demandent déjà un /26. Et le routeur en prend une.',
    },
    example: 'Avant de regarder : combien de machines tiennent dans un /26 ?',
  },
  'net-overlap': {
    title: 'Sous-réseaux qui se chevauchent',
    goal: 'Les trois interfaces de r1 sont en /24 et se chevauchent. Donne à chacune le masque de sa tranche.',
    theory: {
      what: 'Deux réseaux se chevauchent si une même adresse pourrait appartenir aux deux. Un routeur ne peut pas avoir deux interfaces dans des réseaux qui se chevauchent : il ne saurait pas quelle sortie utiliser.',
      how: [
        '10.0.0.0/24 et 10.0.0.128/25    # se chevauchent',
        '10.0.0.0/25 et 10.0.0.128/25    # ne se chevauchent pas',
        '10.0.0.0/25  10.0.0.128/26  10.0.0.192/26   # trois tranches propres',
      ],
      when: 'Quand tu ajoutes un sous-réseau à un plan existant : tu vérifies que sa plage ne touche aucune des autres.',
      problems:
        'Erreur classique : élargir un masque « pour que plus de machines tiennent » sans regarder sa voisine. Le routeur dit que ses interfaces se chevauchent et arrête de transmettre.',
    },
    example:
      'Avant de regarder : l’interface a de r1 passe de /25 à /24. h1 atteint-elle toujours h3 ?',
  },
  'net-boss-teams': {
    title: 'Trois équipes, un seul /24',
    goal: 'Partage 10.42.7.0/24 entre product, data et legal sans chevauchement.',
    story:
      'Le nouveau bureau a reçu 10.42.7.0/24 et rien d’autre. Les trois équipes tiennent si tu le découpes bien : 100 personnes en product, 50 en data et 20 en legal.',
    tasks: [
      'Product a besoin de 100 adresses, data de 50 et legal de 20',
      'Les machines ont déjà leur IP : il manque les masques',
      'Les trois sous-réseaux ne doivent pas se chevaucher',
      'p1, d1 et l1 doivent s’atteindre entre eux',
    ],
  },
  'net-route': {
    title: 'Une route : destination et saut suivant',
    goal: 'r1 ne connaît pas le réseau de cola. Écris sa route : quel réseau et par quel voisin.',
    theory: {
      what: 'Un routeur ne connaît que les réseaux qu’il touche. Pour les autres, il lui faut une route : « pour atteindre ce réseau, passe-le à ce voisin ».',
      how: [
        'r1 touche : 10.0.1.0/24 et 10.0.0.0/30',
        'route sur r1 :',
        '10.0.2.0/24  via 10.0.0.2    # le réseau derrière r2',
        '# destination = un RÉSEAU ; via = l’adresse d’un voisin',
      ],
      when: 'Avec deux routeurs ou plus, chacun doit savoir ce qu’il y a derrière les autres.',
      problems:
        'Erreur classique : utiliser une machine avec un masque de réseau comme destination (10.0.2.10/24). Ce n’est pas un réseau : « r1 a une route mal écrite ».',
    },
    example: 'Avant de regarder : r1 n’a aucune route. Jusqu’où va le paquet d’ana vers db ?',
  },
  'net-default': {
    title: 'La route par défaut',
    goal: 'r1 n’a de place que pour une seule route et deux réseaux sont derrière r2. Écris celle qui couvre les deux.',
    theory: {
      what: 'La route par défaut (default, ou 0.0.0.0/0) sert à tout ce qui n’a pas de route plus précise. La passerelle d’une machine, c’est exactement ça.',
      how: [
        'default      via 10.0.0.2',
        '0.0.0.0/0    via 10.0.0.2    # pareil',
        '# /0 : zéro bit à comparer ; toute destination correspond',
      ],
      when: 'Sur un routeur de bordure, tu ne peux pas lister tous les réseaux du monde : « tout le reste part vers l’amont ».',
      problems:
        'Erreur classique : écrire 0.0.0.0 sans le /0 (« une route mal écrite ») ou 0.0.0.0/24, qui ne couvre que 0.0.0.0 à 0.0.0.255.',
    },
    example:
      'Avant de regarder : la route de r1 est 0.0.0.0/24 au lieu de 0.0.0.0/0. 10.0.2.10 y correspond-elle ?',
  },
  'net-return': {
    title: 'La route du retour',
    goal: 'La requête de portatil atteint nas et la réponse se perd à r2. Donne à r2 la route qui lui manque.',
    theory: {
      what: 'Chaque routeur du chemin a besoin d’une route dans les deux sens. Que r1 connaisse le chemin vers le réseau de db ne sert à rien si r2 ne sait pas revenir à celui d’ana.',
      how: [
        'aller :  r1 : 10.0.2.0/24 via 10.0.0.2    # là-bas',
        'retour : r2 : 10.0.1.0/24 via 10.0.0.1    # manquante',
        '# la réponse meurt à r2',
      ],
      when: 'Chaque fois que tu ajoutes un réseau, tu l’annonces sur les routeurs de l’autre côté, pas seulement sur le sien.',
      problems:
        'Erreur classique : configurer seulement le routeur « de ton côté ». Symptôme : la requête arrive et « retour : r2 n’a pas de route vers 10.0.1.10 ».',
    },
    example:
      'Avant de regarder : r2 n’a pas de route vers le réseau d’ana. Sur quel trajet le paquet meurt-il, et où ?',
  },
  'net-nexthop': {
    title: 'Le saut suivant est un voisin',
    goal: 'Deux routes vers le réseau de b pointent vers quelqu’un qui n’est pas un voisin. Corrige leurs sauts suivants.',
    theory: {
      what: 'Le saut suivant d’une route est toujours l’adresse d’un voisin : quelqu’un sur l’un de tes propres câbles. Ni la destination finale, ni l’autre côté du routeur d’à côté.',
      how: [
        'r1 : lien 10.0.0.1/30       # son voisin : r2 = 10.0.0.2',
        'bon :   10.0.2.0/24 via 10.0.0.2',
        'faux :  10.0.2.0/24 via 10.0.2.1   # l’autre côté de r2',
      ],
      when: 'Chaque fois que tu écris une route, demande-toi : « à lequel de mes voisins je la passe ? ».',
      problems:
        'Erreur classique : utiliser l’adresse du routeur dans le réseau de destination. r1 dit « le saut suivant 10.0.2.1 n’est dans aucun de ses réseaux ».',
    },
    example:
      'Avant de regarder : la route de r1 dit « via 10.0.2.1 », le côté de r2 tourné vers db. r1 peut-il la lui passer ?',
  },
  'net-longest': {
    title: 'La route la plus précise gagne',
    goal: 'Tout part par r2 sur la route par défaut, mais backup est derrière r3. Ajoute la route qui le détourne.',
    theory: {
      what: 'Si plusieurs routes correspondent à une destination, la plus précise gagne : le préfixe le plus long. La route par défaut (/0) est le dernier recours.',
      how: [
        'default        via 10.0.0.2     # tout le reste',
        '10.5.0.0/16    via 10.0.0.6',
        '10.5.7.0/24    via 10.0.0.10',
        '# destination 10.5.7.9 -> le /24 gagne',
        '# destination 10.5.8.9 -> le /16 gagne',
      ],
      when: 'Pour envoyer presque tout dans une direction et un réseau précis dans une autre, sans toucher au reste.',
      problems:
        'Erreur classique : croire que l’ordre de la table décide. Non : une route /24 l’emporte sur un /16 où qu’elle soit.',
    },
    example:
      'Avant de regarder : sans la route vers 10.5.7.0/24, le paquet pour x prend la route par défaut. Qui le jette ?',
  },
  'net-boss-monitor': {
    title: 'Le monitoring est aveugle',
    goal: 'Corrige les tables de routage pour que monitor revoie la production.',
    story:
      'Depuis le changement d’hier soir, le tableau de bord de monitoring ne voit plus les serveurs de production. Il y a trois routeurs entre les deux et chacun a sa propre table.',
    tasks: [
      'monitor doit atteindre prod1 et prod2',
      'Une route pointe vers quelqu’un qui n’est pas un voisin',
      'Une destination n’est pas un réseau',
      'Et personne n’a noté l’une des routes du retour',
    ],
  },
  'net-public': {
    title: 'Privé et public',
    goal: 'tienda a une adresse privée et ne peut pas sortir. Déplace-la, elle et son routeur, dans la plage publique qu’internet connaît déjà.',
    theory: {
      what: 'Les plages privées (10.x, 172.16–31.x, 192.168.x) se répètent dans des milliers de réseaux : internet ne saurait pas lequel répondre, alors il les jette. Seules les adresses publiques voyagent à l’extérieur.',
      how: [
        'privées : 10.0.0.0/8',
        '          172.16.0.0/12     # 172.16 à 172.31',
        '          192.168.0.0/16',
        'publique : toute autre non réservée (163.5.20.9)',
      ],
      when: 'Quand tu décides quelles machines sont visibles de l’extérieur : un serveur web public a besoin d’une adresse publique.',
      whenNot:
        'Chez toi, tu sors avec des adresses privées parce que le routeur les traduit (NAT). Ce simulateur, comme NetPractice, ne le fait pas.',
      problems:
        'Erreur classique : croire que 172.20.x est publique. Symptôme : « internet jette les paquets avec des adresses privées (172.20.0.5) ».',
    },
    example: 'Avant de regarder : web passe en 192.168.20.9. Jusqu’où va son paquet vers 8.8.8.8 ?',
  },
  'net-exit': {
    title: 'La sortie vers internet',
    goal: 'Donne à leo sa passerelle et à r1 sa route de sortie pour que le bureau atteigne internet.',
    theory: {
      what: 'Pour atteindre internet, tout le réseau pointe vers l’extérieur : chaque machine vers son routeur et le routeur, avec sa route par défaut, vers l’adresse du fournisseur sur le câble de sortie.',
      how: [
        'machine : passerelle = son routeur',
        'routeur : default via 80.10.0.1    # le fournisseur, son voisin',
        '# 8.8.8.8 n’est dans aucun réseau connu -> default',
      ],
      when: 'C’est la configuration de tout routeur de bureau : une route par défaut et presque rien d’autre.',
      problems:
        'Erreur classique : utiliser 8.8.8.8 lui-même comme saut suivant. Ce n’est pas un voisin : « le saut suivant 8.8.8.8 n’est dans aucun de ses réseaux ».',
    },
    example:
      'Avant de regarder : la route par défaut de r1 dit « via 8.8.8.8 ». r1 sait-il quel câble utiliser ?',
  },
  'net-inbound': {
    title: 'Faire retrouver son chemin à internet',
    goal: 'Internet n’a de place que pour une route vers toi et tu as deux réseaux. Écris celle qui couvre les deux.',
    theory: {
      what: 'Internet est un routeur avec une table, lui aussi : il ne renvoie la réponse que s’il a une route vers ton réseau, avec ton routeur comme saut suivant.',
      how: [
        'ton réseau : 163.5.20.0/24   ton routeur, côté extérieur : 80.10.0.2',
        'sur internet :',
        '163.5.20.0/24  via 80.10.0.2',
        '# deux moitiés contiguës tiennent dans une route : .0/25 + .128/25 = .0/24',
      ],
      when: 'Quand tu loues une plage publique, le fournisseur pointe cette route vers toi ; sans elle, tu sors, mais rien ne revient.',
      problems:
        'Erreur classique : pointer la route vers la moitié du réseau. Certaines machines répondent et d’autres non : « retour : internet n’a pas de route vers 163.5.20.200 ».',
    },
    example:
      'Avant de regarder : la route d’internet pointe par erreur vers 163.5.21.0/24. Quel trajet échoue ?',
  },
  'net-boss-demo': {
    title: 'La démo passe en direct',
    goal: 'Mets le bureau sur internet avant le début du stream.',
    story:
      'Dans vingt minutes, tu montres Peer4U en direct depuis le bureau, et le portable de la démo n’atteint pas internet. Le fournisseur jure que son côté va bien… presque.',
    tasks: [
      'demo et camara doivent atteindre internet',
      'Le bureau possède la plage publique 141.95.6.0/24',
      'r1 a besoin de sa route par défaut',
      'Vérifie la route qu’internet a vers toi',
    ],
  },
  'net-final-intermediate': {
    title: 'Jour de déménagement',
    goal: 'Construis le réseau des deux étages avec une seule plage publique et une seule sortie.',
    story:
      'Peer4U grandit et déménage sur deux étages. Tu reçois la plage publique 138.40.12.0/24 pour tout : le développement en bas, les serveurs en haut, un routeur par étage et une seule sortie.',
    tasks: [
      'Coupe la plage : développement dans la moitié basse, serveurs dans la haute',
      'Numérote r2 : son lien avec r1 et son réseau de serveurs',
      'Routes aller et retour sur les deux routeurs',
      'Internet renvoie toute la plage par r1',
      'dev atteint api, et les deux atteignent internet',
    ],
  },
}
