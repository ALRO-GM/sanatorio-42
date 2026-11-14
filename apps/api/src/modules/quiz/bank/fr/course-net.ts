/** Banco de Not-games en francés: el curso de NetPractice (`../course-net.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSE_NET_FR: Readonly<Record<string, ConceptText>> = {
  'net-network-address': {
    forms: [
      {
        ask: [
          'Quelle est l’adresse réseau de `172.20.7.9/16` ?',
          'Avec un masque /16, le réseau de `172.20.7.9` est…',
        ],
        right: ['`172.20.0.0`'],
        wrong: ['`172.20.7.0`', '`172.0.0.0`', '`172.20.255.255`', '`172.20.7.255`'],
      },
      {
        ask: [
          'Quelle adresse réseau a `192.168.1.77/26` ?',
          'Avec /26, `192.168.1.77` appartient au réseau…',
        ],
        right: ['`192.168.1.64`'],
        wrong: [
          '`192.168.1.0`',
          '`192.168.1.76`',
          '`192.168.1.127`',
          '`192.168.1.128`',
          '`192.168.1.32`',
        ],
      },
      {
        ask: [
          'Avec un masque /26, laquelle de ces adresses est dans le même réseau que `192.168.1.77` ?',
          'Une nouvelle machine rejoint le réseau de `192.168.1.77/26`. Quelle adresse lui donnes-tu ?',
        ],
        right: ['`192.168.1.100`', '`192.168.1.90`'],
        wrong: ['`192.168.1.130`', '`192.168.1.20`', '`192.168.1.200`', '`192.168.1.60`'],
      },
    ],
    wrong: [],
    why: 'Le réseau, ce sont les bits que marque le masque, les autres à 0 : avec /16, deux octets ; avec /26, des sauts de 64. Ce ne sont pas toujours les trois premiers nombres.',
  },
  'net-mask-valid': {
    forms: [
      {
        ask: ['Lequel de ces masques n’est PAS valide ?', 'Tous ces masques sont valides SAUF…'],
        right: ['`255.255.255.100`'],
        wrong: [
          '`255.255.255.192`',
          '`255.255.255.252`',
          '`255.255.254.0`',
          '`255.255.255.128`',
          '`255.255.255.240`',
        ],
      },
      {
        ask: ['Comment s’écrit /27 en décimal ?', 'Le masque /27, écrit avec quatre nombres, est…'],
        right: ['`255.255.255.224`'],
        wrong: [
          '`255.255.255.27`',
          '`255.255.255.240`',
          '`255.255.255.192`',
          '`255.255.224.0`',
          '`255.255.255.32`',
        ],
      },
      {
        ask: [
          'Tu donnes à une machine le masque `255.255.255.100` et le paquet ne part même pas. Pourquoi ?',
          'Le simulateur refuse le masque `255.255.255.100`. Qu’est-ce qui ne va pas ?',
        ],
        right: ['Ses uns ne se suivent pas', 'En binaire, ses uns ne sont pas collés'],
        wrong: [
          'Son dernier octet dépasse 255',
          'Il laisse de la place pour moins de 2 machines',
          'Un masque ne s’écrit qu’en préfixe',
          'Son dernier octet devrait être 0',
        ],
      },
    ],
    wrong: [],
    why: 'Un masque, ce sont des uns à la suite puis des zéros : dans un octet, seuls 0, 128, 192, 224, 240, 248, 252, 254 et 255 sont possibles.',
  },
  'net-hosts-fit': {
    forms: [
      {
        ask: [
          'Quel est le plus petit réseau où tiennent 31 machines ?',
          'Pour 31 machines, le préfixe le plus long qui convient est…',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/24`', '`/31`'],
      },
      {
        ask: [
          'Combien de machines tiennent dans un réseau /27 ?',
          'Avec le masque `255.255.255.224`, combien de machines tiennent ?',
        ],
        right: ['30'],
        wrong: ['32', '31', '27', '62', '5'],
      },
      {
        ask: [
          'Un réseau aura 30 machines et l’interface de son routeur. Quel est le plus petit réseau qui suffit ?',
          'Il te faut de la place pour 30 machines plus le routeur. Quel réseau, le plus petit possible, choisis-tu ?',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/29`'],
      },
    ],
    wrong: [],
    why: 'Avec h bits de machine, il en tient 2^h − 2 : un /27 en laisse 30. Compte aussi le routeur, qui prend une adresse.',
  },
  'net-unusable-address': {
    forms: [
      {
        ask: [
          'Dans le schéma, une machine avec `10.0.0.7/30` n’envoie rien. Pourquoi ?',
          'Tu donnes `10.0.0.7/30` à une machine et le paquet ne part même pas. Que se passe-t-il ?',
        ],
        right: [
          'C’est l’adresse de broadcast de son réseau',
          'C’est le broadcast de ce réseau /30',
        ],
        wrong: [
          'C’est l’adresse réseau de son sous-réseau',
          'Un /30 ne laisse aucune place aux machines',
          'Il lui manque la passerelle',
          'C’est une adresse privée',
        ],
      },
      {
        ask: [
          'Quelle adresse peux-tu donner à une machine du réseau `10.0.0.4/30` ?',
          'Dans le réseau `10.0.0.4/30`, une machine peut avoir…',
        ],
        right: ['`10.0.0.5`', '`10.0.0.6`'],
        wrong: ['`10.0.0.4`', '`10.0.0.7`', '`10.0.0.8`', '`10.0.0.3`', '`10.0.0.9`'],
      },
      {
        ask: [
          'Tu numérotes un réseau avec `127.0.0.5/24` parce que « localhost marche ». Que se passe-t-il ?',
          'Une machine du schéma a `127.0.0.5/24`. Que fait le paquet ?',
        ],
        right: [
          'Il ne part pas : 127.x, c’est le loopback',
          'Il ne part pas : c’est une adresse de loopback',
        ],
        wrong: [
          'Il part : elle est privée, comme 10.x',
          'Il part si le masque est /8',
          'Il part si le routeur utilise aussi 127.x',
          'Il part, mais seulement vers internet',
        ],
      },
    ],
    wrong: [],
    why: 'L’adresse réseau (machine à 0), celle de broadcast (machine à 1) et la plage 127.x ne se donnent à personne : le paquet ne part même pas.',
  },
  'net-switch-role': {
    forms: [
      {
        ask: ['À quoi sert un switch ?', 'Dans un réseau, un switch sert à…'],
        right: [
          'Relier les machines d’un même réseau, sans IP',
          'Mettre sur un câble les machines d’un réseau',
        ],
        wrong: [
          'Relier deux réseaux différents, comme un routeur',
          'Donner une IP à chaque machine branchée',
          'Servir de passerelle à son réseau',
          'Transmettre selon sa table de routage',
        ],
      },
      {
        ask: [
          'Trois machines sont branchées sur un switch : deux se parlent et la troisième non. Que regardes-tu d’abord ?',
          'Sur un switch, ana et leo se parlent et cache non. Que vérifies-tu d’abord ?',
        ],
        right: [
          'L’IP et le masque de celle qui ne répond pas',
          'L’adresse et le masque de cette machine',
        ],
        wrong: [
          'L’adresse IP du switch',
          'La table de routage du switch',
          'La passerelle du switch',
          'Le masque du switch',
        ],
      },
    ],
    wrong: [],
    why: 'Un switch n’a pas d’IP et ne décide rien : il met dans un même réseau tout ce qui y est branché. Si une machine ne répond pas, regarde son IP et son masque.',
  },
  'net-gateway-side': {
    forms: [
      {
        ask: [
          'r1 relie `10.0.1.0/24` et `10.0.2.0/24`, avec le `.1` dans chacun. Quelle passerelle donnes-tu à une machine du premier ?',
          'Un routeur a le `.1` dans `10.0.1.0/24` et dans `10.0.2.0/24`. Une machine du premier réseau sort par…',
        ],
        right: ['`10.0.1.1`'],
        wrong: ['`10.0.2.1`', '`10.0.1.0`', '`10.0.1.255`', '`10.0.2.0`', '`10.0.1.254`'],
      },
      {
        ask: [
          'Le simulateur dit sur ana : « le saut suivant 10.0.2.1 n’est dans aucun de ses réseaux ». Qu’est-ce qui ne va pas ?',
          'ana, en `10.0.1.10/24`, a `10.0.2.1` comme passerelle et rien ne part. Pourquoi ?',
        ],
        right: [
          'Sa passerelle est la face du routeur dans l’autre réseau',
          'Tu lui as mis l’IP du routeur dans le réseau d’en face',
        ],
        wrong: [
          'Le routeur n’a pas de route vers le réseau d’ana',
          'Il manque la route de retour dans le routeur',
          'L’IP d’ana est en double sur une autre machine',
          'Il manque une route par défaut à ana',
        ],
      },
    ],
    wrong: [],
    why: 'La passerelle, c’est l’IP du routeur dans ton propre réseau : un voisin de ton câble, pas la face tournée vers l’autre réseau.',
  },
  'net-route-destination': {
    forms: [
      {
        ask: [
          'Quelle destination mets-tu dans une route pour qu’elle vaille pour n’importe quelle adresse ?',
          'Une route pour tout ce qui n’a pas de route plus précise a pour destination…',
        ],
        right: ['`0.0.0.0/0`', '`default`'],
        wrong: ['`0.0.0.0/24`', '`0.0.0.0/32`', '`255.255.255.255/32`', '`255.255.255.0/24`'],
      },
      {
        ask: [
          'r1 a la route `10.0.2.10/24 via 10.0.0.2` et le simulateur dit qu’elle est mal écrite. Pourquoi ?',
          'Tu écris `10.0.2.10/24` comme destination et la route est refusée. Qu’est-ce qui ne va pas ?',
        ],
        right: [
          'La destination a des bits de machine : ce n’est pas un réseau',
          'C’est une machine avec un masque, pas une adresse réseau',
        ],
        wrong: [
          'Le saut suivant n’est pas un voisin du routeur',
          'Une route n’accepte pas le préfixe /24',
          'Le masque s’écrit en décimal',
          'Il manque le mot default devant',
        ],
      },
    ],
    wrong: [],
    why: 'La destination d’une route est un réseau avec son préfixe (10.0.2.0/24) ou default (0.0.0.0/0) ; 0.0.0.0/24 ne couvre que de 0.0.0.0 à 0.0.0.255.',
  },
  'net-return-path': {
    forms: [
      {
        ask: [
          'La trace dit « retour : r2 n’a pas de route vers 10.0.1.10 ». Où est la panne ?',
          'Le ping arrive à db, mais la réponse meurt dans r2 faute de route. Que corriges-tu ?',
        ],
        right: [
          'La table de routage de r2, qui ne sait pas revenir',
          'Les routes de r2 vers le réseau d’origine',
        ],
        wrong: [
          'L’IP et le masque de l’origine',
          'La route aller de r1 vers db',
          'La passerelle de l’origine',
          'Le câble entre db et r2',
        ],
      },
      {
        ask: [
          'L’aller d’ana vers db arrive et le retour meurt. Que vérifies-tu ?',
          'Le paquet arrive à db, mais ana ne reçoit pas de réponse. Où regardes-tu ?',
        ],
        right: [
          'Passerelle, masque et routes de retour de db',
          'Comment db répond : passerelle et routes vers ana',
        ],
        wrong: [
          'L’IP et le masque d’ana',
          'La passerelle d’ana',
          'La route de r1 vers le réseau de db',
          'Le câble d’ana vers son routeur',
        ],
      },
    ],
    wrong: [],
    why: 'Un ping, c’est un aller et un retour, et chaque nœud décide avec sa configuration : si le retour meurt, la panne est à la destination ou dans les routes vers l’origine.',
  },
  'net-longest-prefix': {
    forms: [
      {
        ask: [
          'r1 a, dans cet ordre, `10.0.0.0/16 via 10.9.0.2` et `10.0.5.0/24 via 10.9.0.6`. Par où envoie-t-il un paquet vers `10.0.5.7` ?',
          'Avec `10.0.0.0/16 via 10.9.0.2` d’abord et `10.0.5.0/24 via 10.9.0.6` ensuite, un paquet vers `10.0.5.7` sort…',
        ],
        right: [
          'Par la route /24, qui est plus précise',
          'Par la /24 : le préfixe le plus long gagne',
        ],
        wrong: [
          'Par la route /16, qui vient en premier',
          'Par les deux, en partageant le trafic',
          'Par aucune : les deux routes se chevauchent',
          'Par la route par défaut, s’il y en a une',
        ],
      },
      {
        ask: [
          'Si plusieurs routes conviennent pour une destination, laquelle le routeur utilise-t-il ?',
          'Quand deux routes couvrent la même destination, le routeur choisit…',
        ],
        right: [
          'Celle qui a le préfixe le plus long',
          'La plus précise, celle qui a le plus de bits',
        ],
        wrong: [
          'Celle qui est la première de la table',
          'Celle qui a le préfixe le plus court',
          'La route par défaut',
          'La dernière qui a été ajoutée',
          'Celle dont le saut est le plus proche',
        ],
      },
    ],
    wrong: [],
    why: 'La route la plus précise (le préfixe le plus long) gagne, où qu’elle soit dans la table ; celle par défaut, /0, est le dernier recours.',
  },
  'net-internet-exit': {
    forms: [
      {
        ask: [
          'r1 sort vers internet par `163.5.20.2/30` ; le fournisseur est `163.5.20.1`. Quelle route mets-tu dans r1 ?',
          'r1 a `163.5.20.2/30` sur le câble du fournisseur (`163.5.20.1`). Pour atteindre `8.8.8.8`, r1 a besoin de…',
        ],
        right: ['`default via 163.5.20.1`'],
        wrong: [
          '`default via 8.8.8.8`',
          '`default via 163.5.20.2`',
          '`8.8.8.8/32 via 8.8.8.8`',
          '`0.0.0.0/24 via 163.5.20.1`',
        ],
      },
      {
        ask: [
          'Depuis `172.20.0.5`, tu fais un ping vers `8.8.8.8` et le paquet meurt en entrant dans internet. Pourquoi ?',
          'Le ping de `172.20.0.5` vers `8.8.8.8` arrive dans internet et y est jeté. Que se passe-t-il ?',
        ],
        right: [
          '172.20.x est privée et internet la jette',
          'C’est une adresse privée : elle ne voyage pas dehors',
        ],
        wrong: [
          'Il manque la route par défaut à la machine',
          'Le fournisseur n’a pas de route vers 8.8.8.8',
          '172.20.x est publique et en double',
          'Internet ne répond pas aux pings de dehors',
        ],
      },
    ],
    wrong: [],
    why: 'r1 sort par sa route par défaut vers le fournisseur, qui est un voisin ; et dehors, seules les adresses publiques voyagent (ici, pas de NAT).',
  },
  'net-mask-too-wide': {
    forms: [
      {
        ask: [
          'ana affiche « d’après son masque, 10.0.2.10 est voisine d’ana, mais elle est dans un autre réseau ». Que corriges-tu ?',
          'ana atteint ses voisines, mais pas `10.0.2.10`, derrière le routeur : elle la croit voisine. Que changes-tu ?',
        ],
        right: ['Le masque d’ana, qui est trop large', 'Le masque d’ana : il couvre trop'],
        wrong: [
          'Le masque d’ana, qui est trop étroit',
          'La passerelle d’ana',
          'L’IP 10.0.2.10, qui est en double',
          'La table de routage du routeur',
        ],
      },
      {
        ask: [
          'ana passe de `10.0.1.10/24` à `/16` et envoie un paquet vers `10.0.2.10`, derrière r1. Que fait ana ?',
          'Avec `10.0.1.10/16` et la passerelle `10.0.1.1`, ana envoie quelque chose vers `10.0.2.10`, dans un autre réseau. Que se passe-t-il ?',
        ],
        right: [
          'Elle le cherche sur son propre câble et ne le trouve pas',
          'Elle le cherche sur son câble sans passer par la passerelle',
        ],
        wrong: [
          'Elle le passe à sa passerelle',
          'Elle le livre : /16 couvre les deux réseaux',
          'Elle l’envoie à toutes avec un broadcast',
          'Elle le jette : pas de route vers ce réseau',
        ],
      },
    ],
    wrong: [],
    why: 'Un masque trop large fait croire voisin ce qui est dans un autre réseau : la machine le cherche sur son câble et n’utilise jamais la passerelle.',
  },
  'net-supernet': {
    forms: [
      {
        ask: [
          'Quelle route couvre `10.8.0.0/24`, `10.8.1.0/24`, `10.8.2.0/24` et `10.8.3.0/24`, et rien d’autre ?',
          'Une seule route pour ces quatre /24 qui se suivent, de `10.8.0.0` à `10.8.3.0`, sans en couvrir d’autres, a pour destination…',
        ],
        right: ['`10.8.0.0/22`'],
        wrong: [
          '`10.8.0.0/16`',
          '`10.8.0.0/23`',
          '`10.8.0.0/20`',
          '`10.8.3.0/22`',
          '`10.8.0.0/26`',
        ],
      },
      {
        ask: [
          'Pour résumer de `10.8.1.0/24` à `10.8.4.0/24`, tu mets `10.8.1.0/22` et elle sort mal écrite. Pourquoi ?',
          'La route `10.8.1.0/22 via 10.0.0.2` est refusée. Qu’est-ce qui ne va pas ?',
        ],
        right: [
          'Un /22 commence sur un multiple de 4 du troisième octet',
          'Cette adresse n’ouvre aucun bloc /22',
        ],
        wrong: [
          'Un résumé ne marche que pour deux réseaux',
          'Le préfixe s’écrit en décimal',
          'Un résumé n’accepte que /16 ou /8',
          'Ces réseaux ne sortent pas par le même voisin',
        ],
      },
    ],
    wrong: [],
    why: 'Quatre /24 qui se suivent tiennent dans un /22 seulement si le premier commence sur un multiple de 4 : 10.8.0.0/22 va de 10.8.0.0 à 10.8.3.255.',
  },
  'net-routing-loop': {
    forms: [
      {
        ask: [
          'r1 envoie tout à r2 par défaut, et r2 renvoie `10.0.3.0/24` à r1. Qu’arrive-t-il à un paquet pour `10.0.3.10` ?',
          'r1 : `default via r2`. r2 : `10.0.3.0/24 via r1`. Un paquet vers `10.0.3.10`…',
        ],
        right: [
          'Il fait l’aller-retour entre r1 et r2 jusqu’à épuiser ses sauts',
          'Il rebondit entre les deux jusqu’à la fin de son TTL',
        ],
        wrong: [
          'r2 le livre dans le réseau 10.0.3.0/24',
          'r1 le jette faute de route précise',
          'r2 le renvoie et r1 le sort vers internet',
          'Il se perd au premier saut, dans r1',
        ],
      },
      {
        ask: [
          'La trace dit « le paquet tourne en rond entre routeurs et n’a plus de sauts ». Que cherches-tu ?',
          'Un paquet rebondit entre deux routeurs jusqu’à être jeté. Qu’est-ce qui doit être faux ?',
        ],
        right: [
          'Une route qui le renvoie au routeur précédent',
          'Un saut qui le renvoie en arrière',
        ],
        wrong: [
          'Un masque trop large à l’origine',
          'Une IP en double à la destination',
          'Une route par défaut qui manque',
          'Une destination de route mal écrite',
        ],
      },
    ],
    wrong: [],
    why: 'Si deux routeurs se désignent l’un l’autre pour la même destination, le paquet fait l’aller-retour jusqu’à épuiser son TTL : cherche qui le renvoie en arrière.',
  },
  'net-vlsm-order': {
    forms: [
      {
        ask: [
          'Tu découpes un /24 depuis le début et sans trous pour 100, 50 et 20 machines. Dans quel ordre ?',
          'Pour découper un /24 sans trous en sous-réseaux de 100, 50 et 20 machines, tu vas…',
        ],
        right: ['Du plus grand au plus petit', 'D’abord celui de 100, puis 50, puis 20'],
        wrong: [
          'Du plus petit au plus grand',
          'D’abord celui de 50, puis 100, puis 20',
          'D’abord celui de 100, puis 20, puis 50',
          'Tous avec le même masque, /26',
        ],
      },
      {
        ask: [
          'Dans `192.168.10.0/24`, tu as déjà donné `192.168.10.0/27` à 20 machines. Où peut commencer le /25 pour 100 ?',
          'Avec `192.168.10.0/27` déjà pris, le /25 pour 100 machines dans `192.168.10.0/24` commence à…',
        ],
        right: ['`192.168.10.128`'],
        wrong: [
          '`192.168.10.32`',
          '`192.168.10.0`',
          '`192.168.10.33`',
          '`192.168.10.64`',
          '`192.168.10.100`',
        ],
      },
    ],
    wrong: [],
    why: 'Chaque sous-réseau commence sur un multiple de sa taille : en les donnant du plus grand au plus petit, tous tiennent alignés et sans trous.',
  },
}
