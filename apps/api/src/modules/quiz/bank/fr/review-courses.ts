/** Repaso de Not-games en francés: los cursos, traducción de `../review-courses.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_COURSES_FR: Readonly<Record<string, ReviewEntry>> = {
  'shell-cd-rutas': {
    title: 'Chemins absolus et relatifs',
    definition:
      'Un chemin qui commence par / est absolu : il part de la racine. Sans le /, il est relatif : il part du dossier où tu es. Et .. est le dossier du dessus.',
    example: 'cd /var/log && cd nginx → /var/log/nginx ; cd /nginx → « No such file or directory »',
  },
  'docker-ports': {
    title: 'Publier un port (-p)',
    definition:
      'docker run -p A:B relie le port A de ta machine au port B du conteneur. Depuis ta machine, on appelle localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'Le STATUS d’un Pod',
    definition:
      'CrashLoopBackOff : le conteneur démarre et meurt encore et encore (regarde kubectl logs --previous). ErrImagePull ou ImagePullBackOff : l’image ne se télécharge pas (nom ou tag faux, ou jamais publiée).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },

  // Curso de NetPractice.
  'net-network-address': {
    title: 'L’adresse réseau',
    definition:
      'L’adresse réseau, c’est l’IP avec les bits de machine à 0. Le masque dit combien de bits sont au réseau : ce ne sont pas toujours les trois premiers nombres.',
    example: '172.20.7.9/16 → 172.20.0.0 ; 192.168.1.77/26 → 192.168.1.64',
  },
  'net-mask-valid': {
    title: 'Un masque valide',
    definition:
      'Un masque, ce sont des uns à la suite puis des zéros. Il s’écrit en préfixe (/27) ou en décimal (255.255.255.224) ; dans un octet, seuls 0, 128, 192, 224, 240, 248, 252, 254 et 255 sont possibles.',
    example: '/27 = 255.255.255.224 ; 255.255.255.100 n’est pas un masque',
  },
  'net-hosts-fit': {
    title: 'Combien de machines tiennent',
    definition:
      'Avec h bits de machine, il en tient 2^h − 2 (l’adresse réseau et celle de broadcast ne se donnent pas). Pour choisir le masque, compte aussi le routeur, qui en prend une.',
    example: '/27 → 30 machines ; 31 adresses → /26 (62)',
  },
  'net-unusable-address': {
    title: 'Les adresses qu’on ne donne pas',
    definition:
      'L’adresse réseau (machine à 0), celle de broadcast (machine à 1) et les plages réservées comme le loopback 127.x ne peuvent pas aller à une machine.',
    example: '10.0.0.4/30 → seules 10.0.0.5 et 10.0.0.6 sont valides',
  },
  'net-switch-role': {
    title: 'Le switch',
    definition:
      'Un switch relie les machines d’un même réseau. Il n’a ni IP, ni routes, et ne sert pas de passerelle : si une machine ne répond pas, regarde son IP et son masque.',
    example: 'ana, leo et cache sur un switch, toutes dans 10.0.1.0/24',
  },
  'net-gateway-side': {
    title: 'La passerelle, dans ton réseau',
    definition:
      'La passerelle, c’est l’IP du routeur dans le réseau de la machine : un voisin de son câble. La face du routeur dans l’autre réseau ne lui sert à rien.',
    example: 'ana 10.0.1.10/24 → passerelle 10.0.1.1 (pas 10.0.2.1)',
  },
  'net-route-destination': {
    title: 'La destination d’une route',
    definition:
      'La destination d’une route est un réseau avec son préfixe, bits de machine à 0, ou default (0.0.0.0/0), qui couvre tout ce qui n’a pas d’autre route.',
    example: '10.0.2.0/24 via 10.0.0.2 ; default via 10.0.0.2',
  },
  'net-return-path': {
    title: 'L’aller et le retour',
    definition:
      'Un ping, c’est un aller et un retour, et chaque nœud décide avec sa configuration. Si l’aller arrive et le retour meurt, la panne est à la destination ou dans les routes vers l’origine.',
    example: 'retour : r2 n’a pas de route vers 10.0.1.10 → une route dans r2 vers 10.0.1.0/24',
  },
  'net-longest-prefix': {
    title: 'La route la plus précise gagne',
    definition:
      'Si plusieurs routes conviennent pour une destination, le routeur prend le préfixe le plus long, où qu’il soit dans la table. La route par défaut (/0) est le dernier recours.',
    example: '10.0.0.0/16 et 10.0.5.0/24 : vers 10.0.5.7, le /24 gagne',
  },
  'net-internet-exit': {
    title: 'Sortir vers internet',
    definition:
      'Le routeur sort avec une route par défaut vers le fournisseur, son voisin sur le câble de sortie. Dehors, seules les adresses publiques voyagent : le simulateur n’a pas de NAT.',
    example: 'r1 : default via 163.5.20.1 ; 172.20.0.5 → internet la jette',
  },
  'net-mask-too-wide': {
    title: 'Le masque trop large',
    definition:
      'Avec un masque trop large, une machine croit voisin ce qui est dans un autre réseau : elle le cherche sur son câble et ne le passe jamais à la passerelle.',
    example: 'ana 10.0.1.10/16 → cherche 10.0.2.10 sur son câble ; avec /24, passe par r1',
  },
  'net-supernet': {
    title: 'Résumer des routes',
    definition:
      'Plusieurs réseaux qui se suivent et sortent par le même voisin tiennent dans une route au préfixe plus court, si le premier commence sur un multiple du bloc : quatre /24 font un /22.',
    example: '10.8.0.0/24 … 10.8.3.0/24 → 10.8.0.0/22 ; 10.8.1.0/22 n’est pas un réseau',
  },
  'net-routing-loop': {
    title: 'Les boucles de routage',
    definition:
      'Si deux routeurs se désignent l’un l’autre pour la même destination, le paquet fait l’aller-retour jusqu’à épuiser ses sauts (le TTL) et il est jeté.',
    example: 'r1 : default via r2 ; r2 : 10.0.3.0/24 via r1 → boucle',
  },
  'net-vlsm-order': {
    title: 'Des sous-réseaux de tailles différentes',
    definition:
      'Chaque sous-réseau commence sur un multiple de sa taille. En les donnant du plus grand au plus petit, tous tiennent alignés et sans trous.',
    example: '192.168.10.0/24 → .0/25 (100), .128/26 (50), .192/27 (20)',
  },

  // Curso de RAG.
  'rag-context': {
    title: 'Chercher avant de répondre',
    definition:
      'Sans contexte, un modèle répond de mémoire, avec aplomb et des données parfois périmées. Le RAG cherche les bons morceaux dans tes documents et les lui donne pour qu’il réponde en lisant et qu’il cite.',
    example: 'morceaux = chercher(question, k=3) ; réponse = modèle(morceaux + question)',
  },
  'rag-corpus-filter': {
    title: 'Ce qu’on indexe',
    definition:
      'Ce que tu indexes peut finir dans une réponse. Dehors les secrets (.env), le bruit (.lock) et les questions d’évaluation, qui gonflent la note.',
    example: 'docs/*.md et src/**/*.py, oui ; .env, poetry.lock et eval/, non',
  },
  'rag-chunk-cut': {
    title: 'La coupe qui tranche la réponse',
    definition:
      'Si une coupe tranche la phrase de la réponse, aucun morceau ne l’a en entier et aucune recherche ne la sauve. Des morceaux plus grands ou un peu de chevauchement règlent ça.',
    example: 'morceaux de 10 mots → « Perdue au découpage » ; avec chevauchement, entière',
  },
  'rag-normalize': {
    title: 'Normaliser les tokens',
    definition:
      'Normaliser enlève ce qui ne compte pas pour comparer des mots : majuscules, accents et pluriels. Sans ça, « LIMITE » et « Límite » sont deux mots différents.',
    example: '« LIMITE DE TAMANO » → limite, tamano → trouve « Límite de tamaño »',
  },
  'rag-idf': {
    title: 'L’IDF : le mot rare décide',
    definition:
      'L’IDF mesure à quel point un mot distingue : presque zéro s’il est dans tous les morceaux, élevé s’il est dans peu. Dans BM25, il multiplie chaque terme.',
    example: 'idf = ln(1 + (N − df + 0,5) / (df + 0,5))',
  },
  'rag-bm25-k1': {
    title: 'BM25 : k1',
    definition:
      'k1 dit combien répéter un mot dans un morceau continue de compter. Avec un k1 élevé, gagne celui qui le répète le plus ; avec un k1 bas, la répétition sature vite.',
    example: 'k1 = 3 → le .lock qui répète « retry » gagne ; k1 = 0,4 → le guide gagne',
  },
  'rag-search-kind': {
    title: 'Lexicale, sémantique ou hybride',
    definition:
      'La lexicale (BM25) réussit avec les mots et identifiants exacts ; la sémantique (embeddings), avec d’autres mots ou une autre langue. L’hybride joint les deux listes.',
    example: '« backoff_seconds » → lexicale ; « volver a intentarlo » → sémantique',
  },
  'rag-rrf': {
    title: 'La fusion par rangs (RRF)',
    definition:
      'RRF joint deux listes en ne regardant que les rangs : chaque morceau ajoute 1/(k + rang) pour chaque liste où il est. Additionner BM25 et cosinus ne marche pas : ce sont des échelles différentes.',
    example: '1er et 3e avec k = 60 → 1/61 + 1/63',
  },
  'rag-prompt-budget': {
    title: 'Le budget du prompt',
    definition:
      'Le prompt se remplit dans l’ordre : la partie fixe (instructions et question) puis chaque morceau avec son étiquette, tant que ça tient. Le premier qui ne tient pas coupe : remplis du meilleur au pire.',
    example: '100 tokens, 40 fixes, morceaux de 25 → 2 entrent',
  },
  'rag-idk': {
    title: 'Savoir dire « je ne sais pas »',
    definition:
      'L’appui minimal, c’est à quel point le contexte doit soutenir une réponse pour la donner. En dessous, le bot dit « je ne sais pas » au lieu de répondre ce qui ressemble le plus.',
    example: '« Combien coûte la licence ? » → « Je ne sais pas »',
  },
  'rag-recall-mrr': {
    title: 'recall@k, MRR et précision',
    definition:
      'recall@k : pour quelle part des questions le bon morceau est dans les k premiers. MRR : la moyenne de 1/rang de la première réussite. Précision@k : la part utile des k.',
    example: 'rangs 1, 2 et 4 → MRR = (1 + 1/2 + 1/4) / 3 = 0,58',
  },
  'rag-eval-split': {
    title: 'Ajuster sans surapprendre',
    definition:
      'On ajuste avec les questions de développement et la moyenne de plusieurs groupes (validation croisée). Celles de test se regardent une fois, à la fin : si on ajuste dessus, elles ne mesurent plus rien.',
    example: 'groupes 1,00, 0,50 et 0,60 → vaut 0,70',
  },
  'rag-cache': {
    title: 'Le cache de requêtes',
    definition:
      'Le cache rend la réponse d’une question déjà posée sans chercher ni générer. On le vide à la réindexation, sinon il sert de vieilles réponses, et sa clé est la question normalisée.',
    example: 'clé = question normalisée ; réindexer → vider le cache',
  },
  'rag-api': {
    title: 'L’API d’un RAG',
    definition:
      'L’API valide avant de travailler : une requête vide ou un k hors limites, c’est un 422, pas une recherche qui fait tomber le service.',
    example: 'POST /answer avec k = 1000 → 422 k_out_of_range',
  },
  'rag-stages': {
    title: 'Le diagnostic par étapes',
    definition:
      'Une mauvaise réponse se perd à une étape : si la phrase n’est pas entière dans un morceau, le découpage ; si elle n’est pas dans les k, la recherche ; si elle n’entre pas, le prompt ; si elle entre et ne ressort pas, la génération.',
    example: 'entière ? → dans les k ? → dans le prompt ? → dans la réponse ?',
  },
}
