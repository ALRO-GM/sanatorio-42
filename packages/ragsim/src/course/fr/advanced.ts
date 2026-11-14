/**
 * Nivel avanzado en francés. Mismas partes, mismas líneas de ejemplo y mismos
 * pasos que en inglés; el código, los números y las frases del corpus (en
 * castellano, como en el resto de idiomas) no se tocan.
 */

import type { UnitText } from '../types.js'

export const ADVANCED_FR: Record<string, UnitText> = {
  'rag-recall': {
    title: 'recall@k',
    goal: 'Avec les listes de cinq questions sous les yeux, calcule à la main recall@3 et recall@1 de la recherche lexicale.',
    theory: {
      what: 'recall@k, c’est la part des questions dont le bon morceau est dans les k premiers. Il mesure si la recherche ramène la réponse.',
      how: [
        'réussites = questions avec un bon morceau dans le top k',
        'recall@k = réussites / questions',
        '3 sur 5 -> recall@3 = 0.60',
      ],
      when: 'C’est le premier chiffre : ce qui n’est pas récupéré ne peut pas être répondu.',
      whenNot: 'Il ne dit pas quelle place prend le bon morceau.',
      problems:
        'Comparer des recalls avec des k différents : recall@10 bat toujours recall@3. Indique toujours le k.',
    },
    example:
      'Avant de regarder : sur 5 questions, 2 ont leur bon morceau en premier et une autre, en troisième. Quel est recall@1 ?',
    frames: [
      'Seules comptent celles qui touchent dans le top k : avec k = 1, la troisième place ne vaut rien.',
    ],
  },
  'rag-ranking': {
    title: 'Précision et MRR',
    goal: 'Calcule la précision@3 d’une question et le MRR de quatre : combien il y a de remplissage et à quelle place arrive la réponse.',
    theory: {
      what: 'La précision@k, c’est la part utile des k récupérés. Le MRR est la moyenne de 1/rang de la première réussite.',
      how: [
        'précision@3 = bons dans les 3 / 3',
        'rangs 1, 3, -, 2',
        'MRR = (1/1 + 1/3 + 0 + 1/2) / 4 = 0.46',
      ],
      when: 'Le MRR, pour comparer des reclasseurs ; la précision, pour surveiller le remplissage.',
      whenNot: 'Avec une seule bonne réponse par question, la précision@k ne dépasse jamais 1/k.',
      problems:
        'Le rappel seul : avec le même recall@5, le bon morceau peut être premier ou cinquième.',
    },
    example:
      'Avant de regarder : le bon morceau tombe premier, troisième, cinquième et deuxième. Le MRR sera-t-il plus proche de 1 ou de 0.5 ?',
    frames: [
      'Chaque question ajoute 1 sur son rang : la première place vaut 1 et la cinquième, seulement 0.2.',
    ],
  },
  'rag-goldset': {
    title: 'L’ensemble de référence',
    goal: 'Pour mesurer, il faut savoir quelle réponse est juste. Parmi les cinq premiers résultats de deux questions, coche les morceaux qui la contiennent vraiment.',
    theory: {
      what: 'Un ensemble de référence est une liste de questions avec l’endroit exact du corpus qui y répond. C’est ce à quoi chaque résultat est comparé.',
      how: [
        '{"question": "Quelle version de Python me faut-il ?",',
        ' "sources": [["docs/instalacion.md", 5, 5],',
        '             ["README.md", 7, 7]]}',
      ],
      when: 'Avant de régler quoi que ce soit : 20 vraies questions valent mieux que 200 inventées.',
      whenNot:
        'Ne l’écris pas à partir de tes résultats de recherche : tu mesurerais qu’elle est d’accord avec elle-même.',
      problems:
        'Annoter une source alors qu’il y en a deux : toucher l’autre compte comme un échec.',
    },
    example:
      'Avant de regarder : la version de Python est dans deux documents et tu n’en annotes qu’un. Et si la recherche ramène l’autre ?',
    frames: [
      'Les deux morceaux répondent : avec un seul annoté, ramener l’autre compterait comme un échec.',
    ],
  },
  'rag-eyeball': {
    title: 'Pas à l’œil',
    goal: 'Il y a trois configurations et deux questions d’exemple où l’une a l’air meilleure. Choisis celle qui récupère vraiment le mieux : mesure-les.',
    theory: {
      what: 'À l’œil, c’est essayer trois questions qui te passent par la tête et décider. Les tiennes ressemblent à ta documentation et marchent presque toujours.',
      how: [
        'pour config dans candidates :',
        '    mesurer(config, jeu)   # le même',
        'choisir selon le chiffre, pas selon la démo',
      ],
      when: 'À chaque changement : une amélioration qui ne bouge pas le chiffre n’en est pas une.',
      whenNot:
        'Le chiffre n’est pas tout : lis aussi les questions qui échouent, elles disent pourquoi.',
      problems:
        'Décider par la démo : A réussit les deux questions d’exemple et perd sur l’ensemble.',
    },
    example:
      'Avant de regarder : A réussit les deux questions de la démo et B, aucune. Laquelle touchera le plus des 13 de l’ensemble ?',
    frames: [
      'Lexical sur les 13 questions : il réussit celles de la démo, et en rate quand même trois sur treize.',
      'Sémantique : il rate exactement celles de la démo et touche plus sur l’ensemble.',
    ],
  },
  'rag-boss-better': {
    title: 'C’est mieux ou ça en a juste l’air ?',
    goal: 'Décide avec des chiffres laquelle des trois branches est déployée.',
    story:
      'Trois branches sont ouvertes et chaque auteur jure que la sienne « marche bien mieux » : l’un montre une capture, un autre une démo de deux questions. Le déploiement est à 17 h et personne n’a rien mesuré. Ça te retombe dessus.',
    tasks: [
      'Calcule recall@3 et le MRR de la branche sémantique sur les cinq questions de contrôle.',
      'Mesure les trois branches sur tout l’ensemble et choisis celle au MRR le plus élevé.',
    ],
  },
  'rag-leak': {
    title: 'Fuites de l’ensemble d’évaluation',
    goal: 'En développement, ce RAG répond tout juste. Vérifie-le avec les questions mises de côté, trouve pourquoi et répare-le pour de bon.',
    theory: {
      what: 'Une fuite, c’est quand les questions d’évaluation, ou leurs réponses, arrivent dans le système que tu évalues. Le chiffre monte sans que le système s’améliore.',
      how: [
        'eval/preguntas.jsonl   # hors de l’index',
        'dev  -> pour essayer et régler',
        'test -> une fois, à la fin',
      ],
      when: 'Méfie-toi d’un 1.00 : c’est rarement du talent.',
      whenNot: 'Chaque coup d’œil au test pour décider l’épuise.',
      problems:
        'Indexer le dépôt avec le dossier eval dedans : le bot copie la réponse. « Fuites dans l’index » le trahit.',
    },
    example:
      'Avant de regarder : le découpage coupe les phrases, et pourtant en développement tout correspond. Que se passera-t-il avec des questions qui ne sont pas dans le fichier d’évaluation ?',
    frames: [
      'En développement, tout correspond : les réponses sont copiées du fichier d’évaluation.',
      'Avec les questions mises de côté, le vrai chiffre : le découpage était toujours cassé.',
      'Sans fuite et avec un bon découpage, développement et test disent la même chose.',
    ],
  },
  'rag-crossval': {
    title: 'Validation croisée',
    goal: 'Calcule le recall@3 moyen sur trois partitions pour la recherche lexicale et pour la sémantique : ainsi une partition chanceuse ne décide pas.',
    theory: {
      what: 'La validation croisée répartit les questions en groupes et mesure sur chacun. Ce qui compte, c’est la moyenne et à quel point elle varie.',
      how: [
        'partitions = couper(questions, 3)',
        'scores = [mesurer(config, f) for f in partitions]',
        'moyenne = sum(scores) / 3',
      ],
      when: 'Avec peu de questions : une seule mesure dépend trop de celles que tu as eues.',
      whenNot: 'Elle ne remplace pas le test : à force de régler, on le sur-ajuste aussi.',
      problems:
        'Choisir selon la meilleure partition. Si les scores sont 1.00, 0.50 et 0.75, la configuration vaut 0.75, pas 1.00.',
    },
    example:
      'Avant de regarder : une configuration fait 1.00 sur une partition et 0.50 sur une autre. Fais-tu confiance à l’un ou l’autre chiffre ?',
    frames: ['Trois partitions, trois scores différents : c’est la moyenne qu’on compare.'],
  },
  'rag-cost': {
    title: 'Coût et bénéfice',
    goal: 'Cette configuration réussit tout… en reclassant 20 morceaux et en en mettant 10 dans le prompt. Garde les réponses avec beaucoup moins de latence.',
    theory: {
      what: 'Chaque amélioration coûte quelque chose : temps d’indexation, latence par requête, tokens. Régler, c’est acheter des réussites au prix le plus bas.',
      how: [
        'profondeur=20, k=10  # 1.00 en 251 ms',
        'profondeur=5,  k=5   # 1.00 en 128 ms',
        'points gagnés / ms en plus',
      ],
      when: 'Avant de dire qu’un changement est bon : note le chiffre et ce qu’il coûte, les deux.',
      whenNot: 'Ne coupe pas jusqu’à perdre des réponses : l’objectif d’abord, le prix ensuite.',
      problems:
        'Empiler des techniques parce qu’« elles doivent aider ». Si le chiffre ne bouge pas et que la latence monte, abandonne-la.',
    },
    example:
      'Avant de regarder : tu passes du reclassement de 20 morceaux à celui de 5. Les réussites vont-elles baisser ?',
    frames: [
      'Reclasser 20 et récupérer 10 : tout juste, et un quart de seconde par question.',
      'Reclasser 5 et récupérer 5 : les mêmes réussites en moitié moins de temps.',
    ],
  },
  'rag-boss-perfect': {
    title: 'Le 100 % qui n’en était pas un',
    goal: 'Trouve pourquoi le rapport disait 100 %, laisse un chiffre fiable et un système qui ne coûte pas deux fois plus.',
    story:
      'Le rapport trimestriel dit « 100 % de réponses correctes ». Le premier client de la bêta pose trois questions et le bot en rate deux. Quelqu’un a indexé tout le dépôt « pour aller vite » et a tout réglé en regardant les six mêmes questions.',
    tasks: [
      'Vérifie avec les questions mises de côté, retire la fuite (et tout ce qui ne devrait pas être là) et répare le découpage.',
      'Calcule le recall@3 moyen du pipeline sur les trois partitions.',
      'Réduis le coût : les mêmes réponses avec moins de latence.',
    ],
  },
  'rag-incremental': {
    title: 'Indexation incrémentale',
    goal: 'Quelqu’un change un guide et l’index est reconstruit de zéro. Fais qu’il ne recalcule que ce qui a changé.',
    theory: {
      what: 'L’indexation incrémentale garde une empreinte de chaque fichier et, à la réindexation, ne découpe et ne calcule les embeddings que de ceux qui ont changé.',
      how: [
        'empreinte = sha256(contenu)',
        'si empreinte != manifeste[chemin] :',
        '    réindexer(chemin)   # seulement ce fichier',
        'supprimer les morceaux des fichiers disparus',
      ],
      when: 'Dès que le calcul des embeddings prend un moment : un commit d’une ligne ne peut pas coûter des minutes.',
      whenNot: 'Si tu changes le découpage ou le modèle, reconstruis tout.',
      problems:
        'Comparer par date au lieu du contenu : un checkout change tout et tout est recalculé.',
    },
    example:
      'Avant de regarder : un guide sur 13 change. Sans incrémental, combien de morceaux sont recalculés à la réindexation ?',
    frames: [
      'Sans incrémental : les 39 morceaux, deux fois. Un changement d’une ligne coûte comme tout recommencer.',
      'Avec incrémental : la deuxième fois, seuls les 3 morceaux du guide modifié sont recalculés.',
    ],
  },
  'rag-cache': {
    title: 'Cache des requêtes',
    goal: 'La moitié des questions se répètent. Économise leur temps avec un cache… sans servir une seule réponse périmée après la réindexation.',
    theory: {
      what: 'Le cache garde la réponse de chaque question déjà traitée et la renvoie sans chercher ni générer de nouveau.',
      how: [
        'clé = (normaliser(question), k, version_index)',
        'si clé in cache : return cache[clé]',
        'à la réindexation : le vider (ou changer de version)',
      ],
      when: 'Avec des questions répétées et une génération lente : de 80 ms à 1 ms.',
      whenNot:
        'Si presque rien ne se répète, il n’ajoute qu’une autre façon de donner des réponses périmées.',
      problems:
        'Ne pas invalider : le guide passe de 5 à 7 essais et le cache dit toujours 5 : « Réponses périmées ».',
    },
    example:
      'Avant de regarder : la réponse est en cache puis le document change. Sans invalider, que reçoit la personne qui demande ?',
    frames: [
      'Cache sans invalidation : rapide, mais après le changement il sert la réponse d’avant.',
      'Clé normalisée et invalidation à la réindexation : plus de succès de cache et aucune réponse périmée.',
    ],
  },
  'rag-api': {
    title: 'L’API',
    goal: 'Demande à l’API la réponse à "How often does a worker send a heartbeat?" avec 3 sources. Elle doit répondre 200, avec la réponse et ses sources.',
    theory: {
      what: 'L’API met ton RAG derrière HTTP : une route pour chercher, une pour répondre et une pour dire si elle est en vie.',
      how: [
        'GET  /healthz           -> 200 {"status": "ok"}',
        'GET  /search?q=…&k=3    -> 200 {"sources": […]}',
        'POST /answer {query, k} -> 200 {"answer", "sources"}',
        'requête vide ou k = 0   -> 422',
      ],
      when: 'Quand un autre programme va l’utiliser.',
      whenNot: 'Pour l’essayer toi-même, la ligne de commande suffit.',
      problems:
        'Chercher avant de valider : un k = 1000 fait tomber le service. Ici : "422 k_out_of_range".',
    },
    example:
      'Avant de regarder : tu envoies GET à /answer, qui n’accepte que POST. Quel statut revient ?',
    frames: [
      'Mauvaise méthode : 405, sans rien chercher.',
      'k = 0 : 422, la requête est invalide et aucun travail n’est fait.',
      'Demandé correctement : 200, avec la réponse, la citation et les sources avec chemin et lignes.',
    ],
  },
  'rag-failures': {
    title: 'Diagnostic étape par étape',
    goal: 'Quatre questions échouent, chacune à un point différent du pipeline. Dis à quelle étape chaque réponse se perd.',
    theory: {
      what: 'Une mauvaise réponse se perd à une étape précise. Diagnostiquer, c’est suivre le bon morceau jusqu’à ce qu’il disparaisse.',
      how: [
        'entier dans un morceau ?  non -> découpage',
        'parmi les k ?             non -> recherche',
        'dans le prompt ?          non -> prompt',
        'dans la réponse ?         non -> génération',
      ],
      when: 'À chaque échec, avant de toucher à un réglage.',
      whenNot: 'Un échec n’est pas une tendance : compte combien tombent à chaque étape.',
      problems:
        'Accuser le modèle : si le morceau n’est jamais arrivé dans le prompt, aucun modèle n’y peut rien.',
    },
    example:
      'Avant de regarder : le bon morceau est cinquième et seuls 3 sont récupérés. À quelle étape la réponse se perd-elle ?',
    frames: [
      'Le bon morceau existe et il est entier, mais il est cinquième : il se perd à la recherche.',
      'Ici la phrase a été coupée entre deux morceaux : elle se perd plus tôt, au découpage.',
    ],
  },
  'rag-boss-launch': {
    title: 'Jour de lancement',
    goal: 'Prépare le service au vrai trafic : pas cher à tenir à jour, rapide sur les répétitions, avec son API et les pannes localisées.',
    story:
      'Demain le bot s’ouvre à tous les clients. Aujourd’hui la réindexation prend pareil qu’on change une virgule ou tout, chaque question répétée est calculée en entier, l’équipe web ne sait pas comment l’appeler et deux tickets « il répond faux » restent sans diagnostic.',
    tasks: [
      'Opérations : réindexe seulement ce qui a changé et mets les répétitions en cache, sans réponses périmées.',
      'API : demande les 2 meilleures sources pour "Which port is the health endpoint on?", sans générer de réponse.',
      'Diagnostic : dis à quelle étape se perd chacun des deux tickets.',
    ],
  },
  'rag-final-advanced': {
    title: 'Le RAG contre la machine',
    goal: 'Livre un RAG complet sur le dépôt de Colmena : mesuré sur des questions que tu n’as pas vues, sans fuites, avec des citations et dans les temps.',
    story:
      'C’est ton projet : indexer un dépôt et répondre à son sujet avec des sources. La personne qui l’évalue apporte son propre ensemble de questions, vérifiera la latence et te demandera d’expliquer un échec en direct. L’existant est le prototype de quelqu’un qui a tout indexé, coupé tous les 20 mots et n’a jamais rien mesuré.',
    tasks: [
      'Tout le pipeline : règle sur les questions de développement et vérifie sur celles mises de côté. Pas de fuites ni de secrets, en citant, sans rien inventer et dans la latence.',
      'Explique deux échecs : à quelle étape se perd chaque réponse.',
      'Mets-le en production : incrémental, avec cache et sans réponses périmées.',
    ],
  },
}
