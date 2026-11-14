/**
 * Nivel avanzado en francés. Mismas partes y mismas líneas de ejemplo que en
 * inglés; las IP, las máscaras y los nombres de las máquinas no se tocan.
 */

import type { UnitText } from '../types.js'

export const ADVANCED_FR: Record<string, UnitText> = {
  'net-diag-mask': {
    title: 'Diagnostic : le masque qui ment',
    goal: 'Le réseau est numéroté et un seul masque est faux. Lis où le paquet meurt et corrige-le.',
    theory: {
      what: 'Un masque trop large fait croire à une machine que la destination est sa voisine. Elle cherche sur son propre câble, personne ne répond et elle n’utilise jamais la passerelle.',
      how: [
        'ana : 10.0.1.10 /16       # devrait être /24',
        'destination 10.0.2.10  ->  « mon réseau » (10.0.0.0/16)',
        '# elle cherche sur son propre câble : pas là',
      ],
      when: 'En astreinte : une machine atteint ses voisines mais aucun autre réseau.',
      problems:
        'Symptôme littéral : « d’après son masque, 10.0.2.10 est voisine, mais elle est dans un autre réseau (db) ».',
    },
    example:
      'Avant de regarder : ana passe en /16. Passe-t-elle le paquet à r1 ou cherche-t-elle sur son câble ?',
  },
  'net-diag-dup': {
    title: 'Diagnostic : adresses en double',
    goal: 'La base de données a été clonée deux fois sans changer son adresse. Laisse chaque machine avec la sienne.',
    theory: {
      what: 'Deux interfaces avec la même adresse se volent les paquets. Ici, une adresse en double n’atteint personne.',
      how: [
        'db :     10.0.2.10/24',
        'backup : 10.0.2.10/24     # copiée de db',
        '# aucune des deux n’est joignable',
      ],
      when: 'Ça arrive quand tu clones une machine : le clone démarre avec l’adresse de l’original.',
      problems:
        'Symptôme littéral : « 10.0.2.10 est en double : backup l’a aussi ». Tu corriges en changeant l’une des deux, pas le masque.',
    },
    example:
      'Avant de regarder : db prend par erreur l’adresse de r1 dans son réseau. Qui arrête de marcher ?',
  },
  'net-diag-return': {
    title: 'Diagnostic : ça arrive, mais ça ne revient pas',
    goal: 'Six valeurs, une fausse. La requête de user atteint api : trouve pourquoi la réponse ne revient pas.',
    theory: {
      what: 'Si la requête arrive et que la réponse meurt, la panne est du côté de la destination : son masque, sa passerelle ou la route de retour d’un routeur.',
      how: [
        'aller :  ana -> r1 -> r2 -> db    # arrive',
        'retour : db -> r2 -> ?            # meurt à r2',
        '# regarde la table de r2, pas ana',
      ],
      when: '« Ça marche depuis le serveur, pas depuis mon portable » : lis où la réponse meurt.',
      problems: 'Erreur classique : modifier la source. La source a fait sa part.',
    },
    example:
      'Avant de regarder : la passerelle de db pointe vers 10.0.2.254, qui n’existe pas. Quel trajet meurt ?',
  },
  'net-boss-oncall': {
    title: 'Garde de nuit : trois tickets',
    goal: 'Ferme les trois tickets : il n’y a que trois valeurs fausses dans tout le réseau.',
    story:
      '03:12. Trois tickets d’un coup : « pagos ne voit pas la base de données », « le nouveau worker ne démarre pas » et « le dashboard ne répond pas ». Un seul réseau ; trois pannes.',
    tasks: [
      'pagos et worker doivent atteindre db',
      'panel doit atteindre pagos',
      'Lis où chaque paquet meurt avant de toucher à quoi que ce soit',
      'Seules trois valeurs sont fausses',
    ],
  },
  'net-vlsm': {
    title: 'Des sous-réseaux de tailles différentes',
    goal: '172.16.40.0/24 alimente la salle, le labo et le lien vers r2. Donne à chaque tranche son masque exact.',
    theory: {
      what: 'Les sous-réseaux d’une plage n’ont pas à être égaux. Tu alloues du plus grand au plus petit, chacun avec son masque exact.',
      how: [
        '10.0.0.0/24 pour 100, 50 et 2 machines',
        '100 -> /25 : 10.0.0.0      (.0 à .127)',
        '50  -> /26 : 10.0.0.128    (.128 à .191)',
        '2   -> /30 : 10.0.0.192    (.192 à .195)',
      ],
      when: 'Avec une plage serrée : la grande salle prend la moitié et chaque lien prend quatre adresses.',
      problems: 'Erreur classique : commencer par le petit. Le grand ne tient plus aligné.',
    },
    example:
      'Avant de regarder : h1 est dans un /25 et h3 dans un /30. Est-ce important pour qu’ils s’atteignent ?',
  },
  'net-chain': {
    title: 'Trois routeurs à la suite',
    goal: 'Écris les tables des trois routeurs : a, b et c doivent s’atteindre.',
    theory: {
      what: 'Dans une rangée de routeurs, ceux des extrémités se débrouillent avec une route par défaut vers le milieu. Celui du milieu a besoin d’une route précise vers chaque côté.',
      how: ['r1 : default via r2', 'r2 : net-A via r1      net-C via r3', 'r3 : default via r2'],
      when: 'Sites chaînés ou couches de réseau (bordure, distribution, accès) : tu penses à ce que connaît chaque routeur.',
      problems:
        'Erreur classique : donner au routeur du milieu une route par défaut d’un côté et oublier l’autre. Le trafic du côté oublié rebondit.',
    },
    example:
      'Avant de regarder : il y a trois routeurs d’ana à db. Combien de routes sont utilisées à l’aller ?',
  },
  'net-supernet': {
    title: 'Une route pour plusieurs réseaux',
    goal: 'Quatre réseaux consécutifs sont derrière r2 et r1 a de la place pour une route de plus. Résume-les en une seule.',
    theory: {
      what: 'Plusieurs réseaux consécutifs qui sortent par le même voisin tiennent dans une route avec un préfixe plus court : quatre /24 consécutifs font un /22.',
      how: [
        '10.8.0.0/24   10.8.1.0/24',
        '10.8.2.0/24   10.8.3.0/24',
        '-> 10.8.0.0/22 via le même voisin',
        '# /22 : le troisième octet avance par pas de 4 (0, 4, 8…)',
      ],
      when: 'Tables courtes : au lieu d’une route par salle, une par bâtiment.',
      problems:
        'Erreur classique : résumer depuis un endroit où aucun pas ne commence. 10.8.1.0/22 n’est pas un réseau : « une route mal écrite ».',
    },
    example:
      'Avant de regarder : la route de r1 est 10.8.0.0/24 au lieu de /22. ana atteint-elle h3 (10.8.3.10) ?',
  },
  'net-boss-campus': {
    title: 'Le plan d’adresses du campus',
    goal: 'Partage 10.80.0.0/22 entre le cluster, la salle du staff et le lien vers le bâtiment.',
    story:
      'Le nouveau campus n’a qu’une plage, 10.80.0.0/22, et trois zones : le cluster (300 postes), la salle du staff (60) et le lien vers le routeur du bâtiment. Ton plan part en production ce soir.',
    tasks: [
      'Cluster : 300 adresses ; staff : 60 ; lien : 2',
      'Les sous-réseaux ne doivent pas se chevaucher',
      'r2 revient vers tout le campus avec une seule route',
      'puesto et staff1 atteignent examen et s’atteignent entre eux',
    ],
  },
  'net-loop': {
    title: 'Les boucles',
    goal: 'Le paquet de x vers y rebondit entre deux routeurs. Trouve le saut suivant qui le renvoie en arrière.',
    theory: {
      what: 'Si deux routeurs se pointent l’un vers l’autre pour la même destination, le paquet fait des allers-retours jusqu’à épuiser ses sauts (le TTL) et être jeté.',
      how: [
        'r1 : default       via r2',
        'r2 : 10.0.3.0/24   via r1     # devrait être r3',
        '# r1 -> r2 -> r1 -> r2 …',
      ],
      when: 'Après avoir changé des routes à deux endroits en même temps.',
      problems:
        'Symptôme littéral : « le paquet tourne en rond et n’a plus de sauts ». Regarde qui le renvoie en arrière.',
    },
    example: 'Avant de regarder : r2 renvoie le réseau de db vers r1. Que fait r1 de ce paquet ?',
  },
  'net-two-exits': {
    title: 'Deux sorties',
    goal: 'r1 a deux voisins : r2 vers l’intérieur et internet vers l’extérieur. Écris ses deux routes.',
    theory: {
      what: 'Un routeur avec deux voisins répartit le trafic : les réseaux internes par une route précise vers le routeur intérieur ; tout le reste par la route par défaut vers internet.',
      how: [
        'r1 : 150.1.2.0/24  via r2          # le réseau derrière r2',
        'r1 : default       via fournisseur',
        '# 150.1.2.9 -> r2 ;   8.8.8.8 -> fournisseur',
      ],
      when: 'Le routeur de bordure de n’importe quelle entreprise.',
      problems:
        'Erreur classique : laisser le trafic interne à la route par défaut. Internet le renvoie et le paquet tourne en boucle.',
    },
    example:
      'Avant de regarder : r1 n’a que la route par défaut. Où envoie-t-il un paquet pour le réseau de b ?',
  },
  'net-dmz': {
    title: 'Un serveur visible de l’extérieur',
    goal: 'Publie web : internet doit l’atteindre, et pc depuis le bureau aussi.',
    theory: {
      what: 'Pour qu’internet atteigne un de tes serveurs, il te faut trois choses : une adresse publique, une route sur internet vers son réseau et un chemin de retour.',
      how: [
        'internet -> r1 -> web     # aller : la route d’internet vers ton réseau',
        'web -> r1 -> internet     # retour : passerelle de web + route par défaut de r1',
      ],
      when: 'Publier le site web, l’API ou le mail.',
      problems:
        'Erreur classique : ne tester que de l’intérieur. Depuis le bureau, ça marche ; depuis internet, il n’y a pas de route.',
    },
    example:
      'Avant de regarder : web n’a pas de passerelle. La requête d’internet arrive-t-elle ? Répond-il ?',
  },
  'net-boss-split': {
    title: 'La production coupée en deux',
    goal: 'Rassemble de nouveau la production : les clients doivent voir l’API et l’API doit voir sa file.',
    story:
      'Un changement de routage en milieu d’après-midi a coupé la production en deux : l’API ne voit plus la file et les clients ne voient plus l’API. Les paquets rebondissent entre deux routeurs.',
    tasks: [
      'Internet doit atteindre api',
      'api doit atteindre cola',
      'Il y a une boucle entre r1 et internet',
      'Et une machine qui ne retrouve pas son chemin de retour',
    ],
  },
  'net-final-advanced': {
    title: 'Tout le réseau de Peer4U',
    goal: 'Laisse le réseau du lancement fonctionnel de bout en bout.',
    story:
      'Dernier jour avant le lancement. Une zone publique, le bureau, le datacenter et une seule sortie ; une partie du réseau n’est pas numérotée et une autre a été « réparée » par quelqu’un pressé. Si ça marche, Peer4U sort demain.',
    tasks: [
      'Internet atteint web ; ana et leo atteignent internet',
      'ana atteint db, et db atteint web',
      'Numérote l’interface du bureau sur r2 et écris les routes manquantes',
      'Quatre valeurs sont fausses : une route d’internet, deux sauts suivants, et quelque chose sur leo et db',
    ],
  },
}
